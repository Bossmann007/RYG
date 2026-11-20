import { Public } from "@common/decorators/public.decorator";
import { Identidade, RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import { GatewayService } from "@modules/gateway/gateway.service";
import { HubSessionService } from "@modules/gateway/hub-session.service";
import { IdentityService } from "@modules/gateway/identity.service";
import { PolicyService } from "@modules/gateway/policy.service";
import { CasosService } from "@modules/casos/casos.service";
import { XirpService } from "@modules/xirp/xirp.service";
import { Controller, Get, Headers, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { argumentoExcluido, liberarEnvelope, metadadoDaRun } from "./mcp-safedto";
import { McpService } from "./mcp.service";

/** Erro JSON-RPC de parâmetro inválido. */
const CODIGO_NEGADO = -32602;

type CorpoMcp = {
  method?: string;
  id?: unknown;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

/**
 * Endpoint MCP (Streamable HTTP). Qualquer cliente MCP — Claude Desktop,
 * Cursor, o agente do próprio site — fala com o acervo por aqui e só por aqui.
 *
 * Modo stateless: um transporte por requisição. Sem sessão para vazar entre
 * advogados e sem estado compartilhado entre papéis diferentes.
 */
@Controller("mcp")
export class McpController {
  constructor(
    private mcpService: McpService,
    private gatewayService: GatewayService,
    private identityService: IdentityService,
    private policyService: PolicyService,
    private sessoes: HubSessionService,
    private audit: AuditService,
    private casos: CasosService,
    private xirp: XirpService,
  ) {}

  @Public()
  @Post()
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Headers("authorization") authorization?: string
  ) {
    if (Array.isArray(req.body)) {
      res.status(400).json({ erro: "JSON-RPC batch nao suportado" });
      return;
    }

    const identidade = this.identityService.resolver(authorization);
    if (await this.recusarSessao(req, identidade, authorization, res)) {
      return;
    }
    const bloqueio = await this.interceptarChamadaBloqueada(req, identidade);

    if (bloqueio) {
      res.status(200).json(bloqueio);
      return;
    }

    const corpo = req.body as CorpoMcp;
    if (corpo && corpo.method === "tools/call" && corpo.params?.name) {
      const liberado = await this.liberarChamada(corpo, identidade);
      res.status(200).json(liberado);
      return;
    }

    const { NodeStreamableHTTPServerTransport } = await import(
      "@modelcontextprotocol/node"
    );

    const servidor = await this.mcpService.criarServidor(identidade);
    const transporte = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transporte.close();
      void servidor.close();
    });

    await servidor.connect(transporte);
    await transporte.handleRequest(req, res, req.body);
  }

  /** Descoberta amigável: o que este gateway expõe para a credencial enviada. */
  @Public()
  @Get()
  descrever(@Headers("authorization") authorization?: string) {
    const identidade = this.identityService.resolver(authorization);

    return {
      transporte: "streamable-http",
      endpoint: "POST /api/mcp",
      autenticado: !!identidade,
      ferramentas: this.policyService.ferramentasPermitidas(identidade),
    };
  }

  private async liberarChamada(
    corpo: CorpoMcp,
    identidade: Identidade | null
  ): Promise<Record<string, unknown>> {
    const nome = corpo.params?.name || "";
    const { caseId: caseIdBruto, ...argumentos } = corpo.params?.arguments || {};

    if (!identidade) {
      return erroChamada(corpo.id, "safedto_recusado");
    }

    // A named case must be readable by the caller before anything runs.
    const caso = await this.resolverCaso(identidade, caseIdBruto);
    if (caso.ok === false) {
      return erroChamada(corpo.id, "caso_indisponivel");
    }

    const exclusao = await argumentoExcluido(argumentos);
    if (exclusao) {
      await this.auditarNegado(identidade, nome, `safedto_recusado:${exclusao}`);
      return this.recusarComRun(corpo.id, identidade, caso.casoId, nome);
    }

    const resultado = await this.gatewayService.executar(nome, argumentos, identidade, "mcp");
    if (resultado.decisao !== "permitido" || !resultado.conteudo) {
      return erroChamada(corpo.id, resultado.motivo || "negado");
    }

    const saida = await liberarEnvelope(resultado.conteudo);
    if (saida.ok === false) {
      await this.auditarNegado(identidade, nome, `safedto_recusado:${saida.reason}`);
      return this.recusarComRun(corpo.id, identidade, caso.casoId, nome);
    }

    // Fail closed: no Xirp row, no success.
    const meta = metadadoDaRun(resultado.conteudo, saida.dto);
    if (!meta || !(await this.gravarRun(identidade, caso.casoId, nome, meta))) {
      return erroChamada(corpo.id, "auditoria_indisponivel");
    }

    return {
      jsonrpc: "2.0",
      id: corpo.id ?? null,
      result: {
        isError: false,
        structuredContent: saida.dto,
        content: [{ type: "text", text: saida.wire }],
      },
    };
  }

  private async resolverCaso(
    identidade: Identidade,
    bruto: unknown
  ): Promise<{ ok: true; casoId: string | null } | { ok: false }> {
    if (bruto === undefined || bruto === null) {
      return { ok: true, casoId: null };
    }
    if (typeof bruto !== "string" || !bruto.trim() || bruto.length > 64) {
      return { ok: false };
    }
    try {
      const casoId = await this.casos.autorizarCapa(
        { ...identidade, officeId: identidade.escritorio },
        bruto.trim()
      );
      return { ok: true, casoId };
    } catch {
      return { ok: false };
    }
  }

  private async recusarComRun(
    id: unknown,
    identidade: Identidade,
    casoId: string | null,
    nome: string
  ): Promise<Record<string, unknown>> {
    const gravado = await this.gravarRun(identidade, casoId, nome, {
      releaseId: null,
      summary: "Chamada recusada pelo SafeDTO.",
      citeStatus: "refused",
    });
    return erroChamada(id, gravado ? "safedto_recusado" : "auditoria_indisponivel");
  }

  private async gravarRun(
    identidade: Identidade,
    casoId: string | null,
    nome: string,
    meta: { releaseId: string | null; summary: string; citeStatus: string }
  ): Promise<boolean> {
    try {
      await this.xirp.registrar({
        officeId: identidade.escritorio,
        userId: identidade.id,
        caseId: casoId,
        toolName: this.gatewayService.conhece(nome) ? nome : "unknown_tool",
        releaseId: meta.releaseId,
        citeStatus: meta.citeStatus,
        summary: meta.summary,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async auditarNegado(identidade: Identidade, nome: string, motivo: string): Promise<void> {
    const registro: RegistroAuditoria = {
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "mcp",
      ferramenta: nome,
      argumentos: {},
      decisao: "negado",
      motivo,
      omitido: [],
      duracaoMs: 0,
    };
    await this.audit.registrar(registro);
  }

  /**
   * O `tools/list` só anuncia o que o papel pode usar, então uma chamada a
   * ferramenta fora da lista morreria dentro do SDK como "tool not found" — sem
   * passar pelo gateway e, portanto, sem virar linha de auditoria. Tentativa
   * barrada é exatamente o que uma auditoria precisa registrar, então ela é
   * interceptada aqui: o gateway decide, audita, e o cliente recebe o motivo.
   */
  private async interceptarChamadaBloqueada(
    req: Request,
    identidade: Identidade | null
  ): Promise<Record<string, unknown> | null> {
    const corpo = req.body as {
      method?: string;
      id?: unknown;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };

    if (!corpo || corpo.method !== "tools/call" || !corpo.params?.name) {
      return null;
    }

    const nome = corpo.params.name;
    const permitidas = this.gatewayService
      .ferramentasPara(identidade)
      .map((ferramenta) => ferramenta.nome);

    if (permitidas.includes(nome)) {
      return null;
    }

    const resultado = await this.gatewayService.executar(
      nome,
      corpo.params.arguments || {},
      identidade,
      "mcp"
    );

    return {
      jsonrpc: "2.0",
      id: corpo.id ?? null,
      error: {
        code: CODIGO_NEGADO,
        message: `Gateway negou a chamada: ${resultado.motivo}`,
      },
    };
  }

  private async recusarSessao(
    req: Request,
    identidade: Identidade | null,
    authorization: string | undefined,
    res: Response,
  ): Promise<boolean> {
    const corpo = req.body as { method?: string };
    if (!identidade || !corpo || corpo.method !== "tools/call") {
      return false;
    }

    const estado = this.sessoes.avaliar(this.identityService.tokenDe(authorization), identidade.id);
    if (estado === "ok") {
      return false;
    }

    const motivo = estado === "disabled" ? "utilizador desabilitado" : "sessao idle";
    const registro: RegistroAuditoria = {
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "mcp",
      ferramenta: "sessao",
      argumentos: {},
      decisao: "negado",
      motivo,
      omitido: [],
      duracaoMs: 0,
    };
    try {
      await this.audit.registrar(registro);
    } catch {
      res.status(503).json({ erro: "Auditoria indisponível. Operação recusada." });
      return true;
    }
    res.status(401).json({ erro: motivo });
    return true;
  }
}

function erroChamada(id: unknown, motivo: string): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: CODIGO_NEGADO,
      message: `Gateway negou a chamada: ${motivo}`,
    },
  };
}

import { Public } from "@common/decorators/public.decorator";
import { Identidade } from "@models/gateway.model";
import { GatewayService } from "@modules/gateway/gateway.service";
import { IdentityService } from "@modules/gateway/identity.service";
import { PolicyService } from "@modules/gateway/policy.service";
import { Controller, Get, Headers, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { McpService } from "./mcp.service";

/** Erro JSON-RPC de parâmetro inválido. */
const CODIGO_NEGADO = -32602;

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
    private policyService: PolicyService
  ) {}

  @Public()
  @Post()
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Headers("authorization") authorization?: string
  ) {
    const identidade = this.identityService.resolver(authorization);
    const bloqueio = await this.interceptarChamadaBloqueada(req, identidade);

    if (bloqueio) {
      res.status(200).json(bloqueio);
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
}

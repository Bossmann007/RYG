import { PermiteCredencialPa } from "@common/decorators/permite-credencial-pa.decorator";
import { IdentidadeRequisicao, identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Decisao } from "@models/gateway.model";
import { CasosService } from "@modules/casos/casos.service";
import { ehItemChecklist } from "@modules/casos/checklist";
import { AuditService } from "@modules/gateway/audit.service";
import { PaCredentialService } from "@modules/gateway/pa-credential.service";
import { contemPii } from "@modules/whatsapp/whatsapp.controller";
import { WhatsappService } from "@modules/whatsapp/whatsapp.service";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { Request } from "express";
import { acharFerramentaPa, modoPa, NomeFerramentaPa } from "./pa";

type PaCallDto = {
  tool?: unknown;
  caseId?: unknown;
  args?: unknown;
};

type Sessao = { delegatedBy: string; caseId: string };

type Confirmacao = {
  abrir(): { desafio: string; expiraEm: string };
  consumir(desafio: string): boolean;
};

type Preparado = {
  caseId: string;
  confirmacao: Confirmacao | null;
  executar(): Promise<unknown>;
};

type Contexto = {
  identidade: IdentidadeRequisicao;
  delegatedBy: string;
  caseId: string;
  args: Record<string, unknown>;
};

type DesafioExport = { officeId: string; userId: string; caseId: string; expira: number };

type Pendencia = {
  officeId: string;
  userId: string;
  tool: NomeFerramentaPa;
  caseId: string;
  expira: number;
  preparado: Preparado;
  sessao: Sessao;
  identidade: IdentidadeRequisicao;
};

const DESAFIO_EXPORT_MS = 120_000;

/**
 * ADR 0005 PA mode. Office-hosted only, not on the MCP catalog or POST /api/mcp.
 * Every call is audited before it runs. Irreversible tools only propose here. The one-shot confirm lives on GET /pa/pendencias and POST /pa/confirm, the human screen.
 */
@Controller("pa")
export class PaController {
  private readonly desafiosExport = new Map<string, DesafioExport>();
  private readonly pendencias = new Map<string, Pendencia>();

  constructor(
    private casos: CasosService,
    private whatsapp: WhatsappService,
    private audit: AuditService,
    private credenciais: PaCredentialService,
  ) {}

  /** Human bearer only (the handler is not marked). The token goes to the response, never to audit. */
  @Post("sessao")
  @HttpCode(200)
  async abrirSessao(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    await this.exigirPa(identidade, "sessao_pa");
    await this.auditar(identidade, "sessao_pa", "permitido", "credencial pa emitida");
    const { token, expiraEm } = this.credenciais.emitir(identidade);
    return { zone: "internal" as const, token, expiraEm };
  }

  @PermiteCredencialPa()
  @Post("call")
  @HttpCode(200)
  async call(@Req() req: Request, @Body() body: PaCallDto) {
    const identidade = identidadeDaRequisicao(req);
    const ferramenta = acharFerramentaPa(body?.tool);
    if (!ferramenta) {
      await this.auditar(identidade, "fora_da_allowlist", "negado", "ferramenta fora da allowlist PA");
      throw new ForbiddenException("Ferramenta fora da allowlist PA.");
    }
    const modo = modoPa(identidade);
    if (modo.modo === "consult") {
      await this.auditar(identidade, ferramenta.nome, "negado", "consult sem opt-in PA");
      throw new ForbiddenException("PA desligado para este utilizador. Consulta não executa ferramentas.");
    }

    const args =
      body.args && typeof body.args === "object" && !Array.isArray(body.args)
        ? (body.args as Record<string, unknown>)
        : {};
    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const preparado = await this.preparar[ferramenta.nome]({
      identidade,
      delegatedBy: modo.delegatedBy,
      caseId,
      args,
    });
    const sessao: Sessao = { delegatedBy: modo.delegatedBy, caseId: preparado.caseId };

    if (ferramenta.irreversivel) {
      if (!preparado.confirmacao) {
        throw new ConflictException("Ferramenta irreversível sem confirmação humana.");
      }
      await this.auditar(identidade, ferramenta.nome, "negado", "confirmacao humana pendente", sessao);
      const aberto = preparado.confirmacao.abrir();
      this.podarPendencias();
      this.pendencias.set(aberto.desafio, {
        officeId: identidade.officeId,
        userId: identidade.id,
        tool: ferramenta.nome,
        caseId: preparado.caseId,
        expira: Date.parse(aberto.expiraEm),
        preparado,
        sessao,
        identidade,
      });
      throw new ConflictException({
        message: "Confirmacao humana necessaria antes de executar.",
        confirmacaoNecessaria: true,
        proposta: ferramenta.nome,
      });
    }

    await this.auditar(
      identidade,
      ferramenta.nome,
      "permitido",
      "pa",
      sessao,
    );
    return {
      zone: "internal" as const,
      modo: "pa" as const,
      tool: ferramenta.nome,
      resultado: await preparado.executar(),
    };
  }

  /** The human screen's read. The desafio leaves the server only here, never on /pa/call. */
  @Get("pendencias")
  async listarPendencias(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    await this.exigirPa(identidade, "pendencias");
    this.podarPendencias();
    const pendencias = [...this.pendencias.entries()]
      .filter(([, p]) => p.officeId === identidade.officeId && p.userId === identidade.id)
      .map(([desafio, p]) => ({
        desafio,
        tool: p.tool,
        caseId: p.caseId,
        expiraEm: new Date(p.expira).toISOString(),
      }));
    return { zone: "internal" as const, modo: "pa" as const, pendencias };
  }

  @Post("confirm")
  @HttpCode(200)
  async confirmar(@Req() req: Request, @Body() body: { desafio?: unknown }) {
    const identidade = identidadeDaRequisicao(req);
    await this.exigirPa(identidade, "confirmar");
    const desafio = typeof body?.desafio === "string" ? body.desafio.trim() : "";
    const pendencia = this.pendencias.get(desafio);
    if (!pendencia || pendencia.officeId !== identidade.officeId || pendencia.userId !== identidade.id) {
      await this.auditar(identidade, "confirmar", "negado", "confirmacao invalida");
      throw new ConflictException("Confirmacao invalida ou expirada.");
    }
    this.pendencias.delete(desafio);
    const { preparado, sessao, tool } = pendencia;
    if (pendencia.expira < Date.now() || !preparado.confirmacao?.consumir(desafio)) {
      await this.auditar(identidade, tool, "negado", "confirmacao invalida", sessao);
      throw new ConflictException("Confirmacao invalida ou expirada.");
    }
    await this.auditar(identidade, tool, "permitido", "confirmacao humana", sessao);
    return {
      zone: "internal" as const,
      modo: "pa" as const,
      tool,
      resultado: await preparado.executar(),
    };
  }

  private async exigirPa(identidade: IdentidadeRequisicao, ferramenta: string) {
    if (modoPa(identidade).modo !== "pa") {
      await this.auditar(identidade, ferramenta, "negado", "consult sem opt-in PA");
      throw new ForbiddenException("PA desligado para este utilizador.");
    }
  }

  private podarPendencias() {
    const agora = Date.now();
    for (const [desafio, p] of this.pendencias) {
      if (p.expira < agora) this.pendencias.delete(desafio);
    }
  }

  private readonly preparar: Record<NomeFerramentaPa, (ctx: Contexto) => Promise<Preparado>> = {
    ler_caso: async ({ identidade, caseId }) => {
      const id = await this.capa(identidade, caseId);
      return {
        caseId: id,
        confirmacao: null,
        executar: () => this.casos.obter(identidade, id),
      };
    },

    checklist: async ({ identidade, caseId, args }) => {
      const id = await this.capa(identidade, caseId);
      if (args.item === undefined) {
        return { caseId: id, confirmacao: null, executar: () => this.casos.checklist(identidade, id) };
      }
      const item = String(args.item);
      const done = args.done;
      if (!ehItemChecklist(item) || typeof done !== "boolean") {
        throw new BadRequestException("item do checklist bancário e done boolean são obrigatórios.");
      }
      return {
        caseId: id,
        confirmacao: null,
        executar: () => this.casos.marcarChecklist(identidade, id, item, done),
      };
    },

    enviar_whatsapp: async ({ identidade, delegatedBy, caseId, args }) => {
      const id = caseId ? await this.casos.autorizarCapa(identidade, caseId) : "";
      const sessao = { delegatedBy, caseId: id };
      const para = typeof args.para === "string" ? args.para.trim() : "";
      const texto = typeof args.texto === "string" ? args.texto.trim() : "";
      if (!para || !texto) {
        throw new BadRequestException("para e texto são obrigatórios.");
      }
      if (args.revisao !== true) {
        await this.auditar(identidade, "enviar_whatsapp", "negado", "revisao ausente", sessao);
        throw new BadRequestException("Confirme a revisão da classificação e do texto antes de enviar.");
      }
      if (contemPii(texto)) {
        await this.auditar(identidade, "enviar_whatsapp", "negado", "pii bloqueado", sessao);
        throw new BadRequestException(
          "O texto parece conter e-mail, CPF ou telefone. Remova o dado pessoal ou use o modelo aprovado.",
        );
      }
      const pedido = { para, texto, processoId: id || undefined };
      return {
        caseId: id,
        confirmacao: {
          abrir: () => this.whatsapp.abrirDesafio(identidade.officeId, pedido),
          consumir: (desafio) => this.whatsapp.consumirDesafio(desafio, identidade.officeId, pedido),
        },
        executar: async () => this.whatsapp.enviar(pedido),
      };
    },

    exportar_caso: async ({ identidade, caseId }) => {
      const id = await this.capa(identidade, caseId);
      const alvo = { officeId: identidade.officeId, userId: identidade.id, caseId: id };
      return {
        caseId: id,
        confirmacao: {
          abrir: () => this.abrirDesafioExport(alvo),
          consumir: (desafio) => this.consumirDesafioExport(desafio, alvo),
        },
        executar: async () => ({
          formato: "hub-caso-pack-v0",
          exportadoEm: new Date().toISOString(),
          caso: await this.casos.obter(identidade, id),
          checklist: await this.casos.checklist(identidade, id),
        }),
      };
    },
  };

  private async capa(identidade: IdentidadeRequisicao, caseId: string): Promise<string> {
    if (!caseId) {
      throw new BadRequestException("caseId é obrigatório.");
    }
    return this.casos.autorizarCapa(identidade, caseId);
  }

  private abrirDesafioExport(alvo: Omit<DesafioExport, "expira">) {
    const desafio = randomBytes(16).toString("hex");
    const expira = Date.now() + DESAFIO_EXPORT_MS;
    this.desafiosExport.set(desafio, { ...alvo, expira });
    return { desafio, expiraEm: new Date(expira).toISOString() };
  }

  private consumirDesafioExport(desafio: string, alvo: Omit<DesafioExport, "expira">): boolean {
    const salvo = this.desafiosExport.get(desafio);
    this.desafiosExport.delete(desafio);
    return (
      !!salvo &&
      salvo.expira >= Date.now() &&
      salvo.officeId === alvo.officeId &&
      salvo.userId === alvo.userId &&
      salvo.caseId === alvo.caseId
    );
  }

  /** argumentos stays {}: never the question, the message, or a phone number. */
  private auditar(
    identidade: IdentidadeRequisicao,
    ferramenta: string,
    decisao: Decisao,
    motivo: string,
    sessao?: Sessao,
  ) {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "pa",
      ferramenta,
      argumentos: {},
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
      ...(sessao ? { actor: "pa_session" as const, delegated_by: sessao.delegatedBy, caseId: sessao.caseId } : {}),
    });
  }
}

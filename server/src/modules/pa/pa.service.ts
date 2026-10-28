import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { CasosService } from "@modules/casos/casos.service";
import { AuditService } from "@modules/gateway/audit.service";
import { WikiService } from "@modules/wiki/wiki.service";
import { avaliarEnvioWhatsapp } from "@modules/whatsapp/whatsapp-classify";
import { WhatsappService } from "@modules/whatsapp/whatsapp.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { PA_ALLOWLIST, PaSession, PaToolName } from "./pa-types";

const PAPEIS_PA = new Set(["socio", "gestor"]);

@Injectable()
export class PaService {
  private readonly sessoes = new Map<string, PaSession>();

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly casos: CasosService,
    private readonly wiki: WikiService,
    private readonly whatsapp: WhatsappService,
  ) {}

  paModeEnabled(): boolean {
    return (
      String(this.config.get<string>("OFFICE_PA_MODE") || "")
        .trim()
        .toLowerCase() === "true"
    );
  }

  status(identidade: IdentidadeRequisicao) {
    const sessao = this.sessaoAtiva(identidade);
    return {
      enabled: this.paModeEnabled(),
      allowlist: [...PA_ALLOWLIST],
      podeAbrir: this.paModeEnabled() && PAPEIS_PA.has(identidade.papel),
      sessao,
    };
  }

  async abrirSessao(
    identidade: IdentidadeRequisicao,
    runtime: "office-hosted" | "linked-provider" = "linked-provider",
  ): Promise<PaSession> {
    if (!this.paModeEnabled()) {
      throw new ForbiddenException("PA mode desligado (OFFICE_PA_MODE≠true).");
    }
    if (!PAPEIS_PA.has(identidade.papel)) {
      throw new ForbiddenException(
        "PA mode é opt-in para socio ou gestor. Consult permanece o padrão.",
      );
    }
    const sessao: PaSession = {
      id: `pa_${randomBytes(8).toString("hex")}`,
      officeId: identidade.officeId,
      delegatedBy: identidade.id,
      papel: identidade.papel,
      openedAt: new Date().toISOString(),
      runtime,
    };
    this.sessoes.set(this.chave(identidade), sessao);
    await this.auditar(identidade, "pa_session_open", "permitido", "pa_open", {
      sessionId: sessao.id,
      runtime,
    });
    return sessao;
  }

  fecharSessao(identidade: IdentidadeRequisicao): void {
    this.sessoes.delete(this.chave(identidade));
  }

  exigirSessao(identidade: IdentidadeRequisicao): PaSession {
    if (!this.paModeEnabled()) {
      throw new ForbiddenException("PA mode desligado (OFFICE_PA_MODE≠true).");
    }
    const sessao = this.sessaoAtiva(identidade);
    if (!sessao) {
      throw new ForbiddenException(
        "Sem sessão PA. Consult users cannot call PA tools.",
      );
    }
    return sessao;
  }

  async caseRead(identidade: IdentidadeRequisicao, casoId: string) {
    const sessao = this.exigirSessao(identidade);
    this.assertTool("case_read");
    const caso = await this.casos.obter(identidade, casoId);
    await this.auditar(identidade, "pa_case_read", "permitido", "pa_tool", {
      sessionId: sessao.id,
      casoId: String(caso.id),
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      caso: {
        id: String(caso.id),
        processNumber: caso.processNumber,
        titulo: caso.titulo || caso.cliente || "",
        classification: caso.classification,
      },
    };
  }

  async checklist(identidade: IdentidadeRequisicao) {
    const sessao = this.exigirSessao(identidade);
    this.assertTool("checklist");
    await this.auditar(identidade, "pa_checklist", "permitido", "pa_tool", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      items: [
        "Tarifas e encargos previstos no contrato",
        "Seguro prestamista e IOF",
        "Cláusula de vencimento antecipado",
        "CDC aplicável se destinatário final",
      ],
      learnTogether:
        "Artifacts stay in the hub (notes/Xirp/audit). No fine-tune on client processos.",
    };
  }

  async whatsappPropose(
    identidade: IdentidadeRequisicao,
    body: {
      para: string;
      texto: string;
      classificationAck?: boolean;
      classification?: string;
      templateId?: string;
      safeDtoReleaseId?: string;
      processoId?: string;
    },
  ) {
    const sessao = this.exigirSessao(identidade);
    this.assertTool("whatsapp_propose");
    const para = String(body.para || "").trim();
    const texto = String(body.texto || "").trim();
    if (!para || !texto) {
      throw new BadRequestException("para e texto são obrigatórios.");
    }
    const gate = avaliarEnvioWhatsapp({
      texto,
      classificationAck: Boolean(body.classificationAck),
      classification: body.classification,
      templateId: body.templateId,
      safeDtoReleaseId: body.safeDtoReleaseId,
    });
    if (gate.ok === false) {
      await this.auditar(identidade, "pa_whatsapp_propose", "negado", gate.motivo, {
        sessionId: sessao.id,
      });
      throw new BadRequestException(gate.motivo);
    }
    const pedido = {
      para,
      texto,
      processoId: body.processoId ? String(body.processoId) : undefined,
    };
    const aberto = this.whatsapp.abrirDesafio(identidade.officeId, pedido);
    await this.auditar(identidade, "pa_whatsapp_propose", "permitido", "pa_hitl", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
      desafio: true,
    });
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      confirmacaoNecessaria: true as const,
      desafio: aberto.desafio,
      expiraEm: aberto.expiraEm,
      mutationPending: "whatsapp_send",
    };
  }

  async whatsappConfirm(
    identidade: IdentidadeRequisicao,
    body: {
      para: string;
      texto: string;
      confirmacao: string;
      processoId?: string;
      classificationAck?: boolean;
      classification?: string;
      templateId?: string;
      safeDtoReleaseId?: string;
    },
  ) {
    const sessao = this.exigirSessao(identidade);
    this.assertTool("whatsapp_confirm");
    const para = String(body.para || "").trim();
    const texto = String(body.texto || "").trim();
    const confirmacao = String(body.confirmacao || "").trim();
    if (!para || !texto || !confirmacao) {
      throw new BadRequestException("para, texto e confirmacao são obrigatórios.");
    }
    const gate = avaliarEnvioWhatsapp({
      texto,
      classificationAck: Boolean(body.classificationAck),
      classification: body.classification,
      templateId: body.templateId,
      safeDtoReleaseId: body.safeDtoReleaseId,
    });
    if (gate.ok === false) {
      throw new BadRequestException(gate.motivo);
    }
    const pedido = {
      para,
      texto,
      processoId: body.processoId ? String(body.processoId) : undefined,
    };
    const valido = this.whatsapp.consumirDesafio(
      confirmacao,
      identidade.officeId,
      pedido,
    );
    if (!valido) {
      await this.auditar(identidade, "pa_whatsapp_confirm", "negado", "desafio", {
        sessionId: sessao.id,
      });
      throw new ForbiddenException("Confirmacao invalida ou expirada.");
    }
    await this.auditar(identidade, "pa_whatsapp_confirm", "permitido", "pa_hitl", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
    const resultado = this.whatsapp.enviar(pedido);
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      ...resultado,
    };
  }

  async exportPack(identidade: IdentidadeRequisicao, casoId?: string) {
    const sessao = this.exigirSessao(identidade);
    this.assertTool("export_pack");
    const pack = await this.wiki.loadPack(identidade, casoId);
    await this.auditar(identidade, "pa_export_pack", "permitido", "pa_tool", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
      casoId: casoId || "",
    });
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      ...pack,
      requerSafeDto: true,
    };
  }

  private sessaoAtiva(identidade: IdentidadeRequisicao): PaSession | null {
    const sessao = this.sessoes.get(this.chave(identidade));
    if (!sessao) return null;
    if (sessao.officeId !== identidade.officeId) return null;
    if (sessao.delegatedBy !== identidade.id) return null;
    return sessao;
  }

  private chave(identidade: IdentidadeRequisicao): string {
    return `${identidade.officeId}::${identidade.id}`;
  }

  private assertTool(nome: PaToolName): void {
    if (!(PA_ALLOWLIST as readonly string[]).includes(nome)) {
      throw new ForbiddenException(`Ferramenta PA '${nome}' fora da allowlist.`);
    }
  }

  private auditar(
    identidade: IdentidadeRequisicao,
    ferramenta: string,
    decisao: "permitido" | "negado",
    motivo: string,
    argumentos: Record<string, unknown>,
  ) {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta,
      argumentos,
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}

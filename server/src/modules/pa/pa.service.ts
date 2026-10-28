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
      sessao: sessao ? this.sessaoPublica(sessao) : null,
      zapPendente: Boolean(sessao?.pendingZap),
    };
  }

  async abrirSessao(
    identidade: IdentidadeRequisicao,
    runtime: "office-hosted" | "linked-provider" = "linked-provider",
  ): Promise<ReturnType<PaService["sessaoPublica"]>> {
    if (!this.paModeEnabled()) {
      await this.auditar(identidade, "pa_session_open", "negado", "pa_off", {
        actor: "human",
        delegatedBy: identidade.id,
      });
      throw new ForbiddenException("PA mode desligado (OFFICE_PA_MODE≠true).");
    }
    if (!PAPEIS_PA.has(identidade.papel)) {
      await this.auditar(identidade, "pa_session_open", "negado", "papel", {
        actor: "human",
        delegatedBy: identidade.id,
      });
      throw new ForbiddenException(
        "PA mode é opt-in para socio ou gestor. Consult permanece o padrão.",
      );
    }
    const runtimeOk = this.normalizarRuntime(runtime);
    const sessao: PaSession = {
      id: `pa_${randomBytes(8).toString("hex")}`,
      officeId: identidade.officeId,
      delegatedBy: identidade.id,
      papel: identidade.papel,
      openedAt: new Date().toISOString(),
      runtime: runtimeOk,
    };
    await this.auditar(identidade, "pa_session_open", "permitido", "pa_open", {
      sessionId: sessao.id,
      runtime: runtimeOk,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
    this.sessoes.set(this.chave(identidade), sessao);
    return this.sessaoPublica(sessao);
  }

  async fecharSessao(identidade: IdentidadeRequisicao): Promise<void> {
    const sessao = this.sessaoAtiva(identidade);
    if (!sessao) return;
    await this.auditar(identidade, "pa_session_stop", "permitido", "pa_close", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
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
        actor: "pa_session",
        delegatedBy: sessao.delegatedBy,
      });
      throw new BadRequestException(gate.motivo);
    }
    const pedido = {
      para,
      texto,
      processoId: body.processoId ? String(body.processoId) : undefined,
    };
    const aberto = this.whatsapp.abrirDesafio(identidade.officeId, pedido);
    sessao.pendingZap = {
      desafio: aberto.desafio,
      para,
      texto,
      processoId: pedido.processoId,
      classificationAck: Boolean(body.classificationAck),
      classification: String(body.classification || "").trim(),
      templateId: body.templateId,
      safeDtoReleaseId: body.safeDtoReleaseId,
      expiraEm: aberto.expiraEm,
    };
    await this.auditar(identidade, "pa_whatsapp_propose", "permitido", "pa_hitl", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
      desafioHeldServerSide: true,
    });
    return {
      actor: "pa_session" as const,
      delegatedBy: sessao.delegatedBy,
      sessionId: sessao.id,
      confirmacaoNecessaria: true as const,
      expiraEm: aberto.expiraEm,
      mutationPending: "whatsapp_send",
      hitlPath: "/api/pa/hitl/whatsapp_confirm",
      aviso:
        "Desafio HITL fica no servidor. A UI humana busca o desafio em /api/pa/hitl/whatsapp_challenge; o modelo não tem essa tool.",
    };
  }

  async hitlWhatsappChallenge(identidade: IdentidadeRequisicao) {
    const sessao = this.exigirSessao(identidade);
    const pending = sessao.pendingZap;
    if (!pending) {
      throw new BadRequestException("Nenhum envio WhatsApp pendente nesta sessão PA.");
    }
    await this.auditar(identidade, "pa_whatsapp_challenge", "permitido", "pa_hitl", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
    });
    return {
      sessionId: sessao.id,
      desafio: pending.desafio,
      expiraEm: pending.expiraEm,
      mutationPending: "whatsapp_send" as const,
    };
  }

  async hitlWhatsappConfirm(
    identidade: IdentidadeRequisicao,
    body: { desafio?: string },
  ) {
    const sessao = this.exigirSessao(identidade);
    const pending = sessao.pendingZap;
    if (!pending) {
      throw new BadRequestException("Nenhum envio WhatsApp pendente nesta sessão PA.");
    }
    const desafio = String(body.desafio || "").trim();
    if (!desafio || desafio !== pending.desafio) {
      await this.auditar(identidade, "pa_whatsapp_confirm", "negado", "desafio", {
        sessionId: sessao.id,
        actor: "pa_session",
        delegatedBy: sessao.delegatedBy,
      });
      throw new ForbiddenException("Confirmacao invalida ou expirada.");
    }
    const pedido = {
      para: pending.para,
      texto: pending.texto,
      processoId: pending.processoId,
    };
    const valido = this.whatsapp.consumirDesafio(
      pending.desafio,
      identidade.officeId,
      pedido,
    );
    sessao.pendingZap = undefined;
    if (!valido) {
      await this.auditar(identidade, "pa_whatsapp_confirm", "negado", "desafio", {
        sessionId: sessao.id,
        actor: "pa_session",
        delegatedBy: sessao.delegatedBy,
      });
      throw new ForbiddenException("Confirmacao invalida ou expirada.");
    }
    await this.auditar(identidade, "pa_whatsapp_confirm", "permitido", "pa_hitl", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
      via: "hitl",
    });
    await this.auditar(identidade, "pa_whatsapp_transfer", "permitido", "transfer", {
      sessionId: sessao.id,
      actor: "pa_session",
      delegatedBy: sessao.delegatedBy,
      destino: "whatsapp",
      para: pedido.para,
      textoChars: pedido.texto.length,
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

  private sessaoPublica(sessao: PaSession) {
    return {
      id: sessao.id,
      officeId: sessao.officeId,
      delegatedBy: sessao.delegatedBy,
      papel: sessao.papel,
      openedAt: sessao.openedAt,
      runtime: sessao.runtime,
      zapPendente: Boolean(sessao.pendingZap),
    };
  }

  private officeHostedEnabled(): boolean {
    return (
      String(this.config.get<string>("OFFICE_HOSTED_AI") || "")
        .trim()
        .toLowerCase() === "true"
    );
  }

  private normalizarRuntime(
    runtime: string,
  ): "office-hosted" | "linked-provider" {
    if (runtime === "office-hosted") {
      if (!this.officeHostedEnabled()) {
        throw new ForbiddenException(
          "Office-hosted AI desligado (OFFICE_HOSTED_AI≠true).",
        );
      }
      return "office-hosted";
    }
    if (runtime === "linked-provider") {
      return "linked-provider";
    }
    throw new BadRequestException("runtime deve ser linked-provider ou office-hosted.");
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
      argumentos: {
        officeId: identidade.officeId,
        ...argumentos,
      },
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}

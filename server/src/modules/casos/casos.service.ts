import { acharConflito, normalizarNomeParte } from "@common/security/case-acl";
import {
  CLASSIFICACAO_PADRAO,
  lerClassificacaoOpcional,
  normalizarClassificacao,
  podeLerCaso,
} from "@common/security/case-classification";
import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { Caso } from "@models/caso.model";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ehItemChecklist, ItemChecklist, lerChecklist, marcarItemChecklist } from "./checklist";
import type { PoolConnection } from "mysql2/promise";
import { CasosRepository, HoldCaso } from "./casos.repository";

/** undefined keeps the stored date, null clears it, a string must be a real YYYY-MM-DD. */
function lerDataRetencao(bruto: unknown): string | null | undefined {
  if (bruto === undefined) {
    return undefined;
  }
  if (bruto === null) {
    return null;
  }
  if (typeof bruto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
    throw new BadRequestException("retainUntil deve ser uma data YYYY-MM-DD.");
  }
  const [ano, mes, dia] = bruto.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new BadRequestException("retainUntil deve ser uma data válida.");
  }
  return bruto;
}

const MOTIVO_CONFLITO_PUBLICO = "Conflito de partes com caso existente no escritório.";

@Injectable()
export class CasosService {
  constructor(
    private readonly repositorio: CasosRepository,
    private readonly audit: AuditService,
  ) {}

  async listar(identidade: IdentidadeRequisicao): Promise<Caso[]> {
    const ids = await this.repositorio.idsDoMembro(identidade.officeId, identidade.id);
    if (!ids.length) {
      return [];
    }
    const permitidos = new Set(ids);
    const casos = await this.repositorio.listar(identidade.officeId);
    return casos.filter(
      (caso) =>
        permitidos.has(String(caso.id)) &&
        podeLerCaso(identidade.papel, normalizarClassificacao(caso.classification)),
    );
  }

  /** Capa ACL gate: 404 other office, 403 no membership or clearance. Returns the caso id. */
  async autorizarCapa(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<string> {
    const capa = await this.repositorio.aclDaCapa(identidade.officeId, idOrCnj);
    if (!capa) {
      throw new NotFoundException("Caso não encontrado.");
    }

    const membro = await this.repositorio.temMembership(identidade.officeId, capa.id, identidade.id);
    if (!membro) {
      await this.auditar(identidade, "caso_obter", "negado", "membership ausente", { casoId: capa.id });
      throw new ForbiddenException("Sem membership neste caso.");
    }

    if (!podeLerCaso(identidade.papel, capa.classification)) {
      await this.auditar(identidade, "caso_obter", "negado", "classification clearance ausente", {
        casoId: capa.id,
        classification: capa.classification,
      });
      throw new ForbiddenException("Sem clearance para esta classificação.");
    }

    return capa.id;
  }

  async obter(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<Caso> {
    await this.autorizarCapa(identidade, idOrCnj);

    const achado = await this.repositorio.obter(identidade.officeId, idOrCnj);
    if (!achado) {
      throw new NotFoundException("Caso não encontrado.");
    }

    return achado;
  }

  async lerHold(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<HoldCaso> {
    const casoId = await this.autorizarCapa(identidade, idOrCnj);
    return this.repositorio.lerHold(identidade.officeId, casoId);
  }

  /** Socio with membership only. retainUntil is stored and never acted on. */
  async atualizarHold(
    identidade: IdentidadeRequisicao,
    idOrCnj: string,
    legalHold: unknown,
    retainUntil: unknown,
  ): Promise<HoldCaso> {
    const casoId = await this.autorizarCapa(identidade, idOrCnj);
    if (identidade.papel !== "socio") {
      await this.auditar(identidade, "caso_hold", "negado", "papel sem permissão de hold", { casoId });
      throw new ForbiddenException("Só sócio altera legal hold.");
    }
    if (typeof legalHold !== "boolean") {
      throw new BadRequestException("legalHold boolean é obrigatório.");
    }
    const data = lerDataRetencao(retainUntil);

    // Audit first: no trail, no write.
    await this.auditar(identidade, "caso_hold", "permitido", "hold atualizado", {
      casoId,
      legalHold,
      retainUntil: data === undefined ? "(inalterado)" : data,
    });
    return this.repositorio.gravarHold(identidade.officeId, casoId, legalHold, data);
  }

  /**
   * Guard for any delete of a row that belongs to a case in the TiDB. Hold on: 409, row stays.
   * The in-memory acervo deletes (contratos, decisoes, modelos, ...) ignore office_id and are
   * not routed through here.
   */
  apagarSemHold<T>(
    officeId: string,
    casoId: string,
    apagar: (connection: PoolConnection) => Promise<T>,
  ): Promise<T> {
    return this.repositorio.apagarSemHold(officeId, casoId, apagar);
  }

  async checklist(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<ItemChecklist[]> {
    const caso = await this.obter(identidade, idOrCnj);
    return lerChecklist(identidade.officeId, String(caso.id));
  }

  async marcarChecklist(
    identidade: IdentidadeRequisicao,
    idOrCnj: string,
    item: string,
    done: boolean,
  ): Promise<ItemChecklist[]> {
    if (!ehItemChecklist(item) || typeof done !== "boolean") {
      throw new BadRequestException("item do checklist bancário e done boolean são obrigatórios.");
    }
    const caso = await this.obter(identidade, idOrCnj);
    return marcarItemChecklist(identidade.officeId, String(caso.id), item, done);
  }

  async abrir(
    identidade: IdentidadeRequisicao,
    client: string,
    adverse: string,
    classification: unknown,
  ): Promise<string> {
    const clientKey = normalizarNomeParte(client);
    const adverseKey = normalizarNomeParte(adverse);
    if (!clientKey || !adverseKey || clientKey === adverseKey) {
      throw new BadRequestException("client and adverse party are required and must differ.");
    }

    const lida = lerClassificacaoOpcional(classification);
    if (lida === "invalid") {
      throw new BadRequestException(
        "classification must be publico, interno, sigiloso, or segredo_justica.",
      );
    }
    const classificationFinal = lida === "absent" ? CLASSIFICACAO_PADRAO : lida;

    const existentes = await this.repositorio.partesDoEscritorio(identidade.officeId);
    const conflito = acharConflito({ client, adverse }, existentes);
    if (conflito) {
      await this.auditar(identidade, "caso_abrir", "negado", conflito.motivo, {
        casoId: conflito.casoId,
        client: clientKey,
        adverse: adverseKey,
      });
      throw new ConflictException(MOTIVO_CONFLITO_PUBLICO);
    }

    try {
      return await this.repositorio.inserirIntake({
        officeId: identidade.officeId,
        userId: identidade.id,
        role: identidade.papel,
        clientName: client.trim(),
        clientKey,
        adverseKey,
        classification: classificationFinal,
      });
    } catch (erro) {
      if (erro instanceof ConflictException) {
        const casoId = (erro as ConflictException & { casoId?: string }).casoId;
        const motivo =
          (erro as ConflictException & { motivoAcl?: string }).motivoAcl ?? MOTIVO_CONFLITO_PUBLICO;
        const argumentos: Record<string, unknown> = {
          client: clientKey,
          adverse: adverseKey,
        };
        if (casoId) {
          argumentos.casoId = casoId;
        }
        await this.auditar(identidade, "caso_abrir", "negado", motivo, argumentos);
        throw new ConflictException(MOTIVO_CONFLITO_PUBLICO);
      }
      throw erro;
    }
  }

  private auditar(
    identidade: IdentidadeRequisicao,
    ferramenta: "caso_obter" | "caso_abrir" | "caso_hold",
    decisao: RegistroAuditoria["decisao"],
    motivo: string,
    argumentos: Record<string, unknown>,
  ): Promise<void> {
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

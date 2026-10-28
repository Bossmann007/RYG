import { acharConflito, normalizarNomeParte } from "@common/security/case-acl";
import {
  CLASSIFICATION_DEFAULT,
  CaseClassification,
  clearanceOk,
  isCaseClassification,
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
import { CasosRepository } from "./casos.repository";

const MOTIVO_CONFLITO_PUBLICO = "Conflito de partes com caso existente no escritório.";

@Injectable()
export class CasosService {
  constructor(
    private readonly repositorio: CasosRepository,
    private readonly audit: AuditService,
  ) {}

  async listar(officeId: string, userId: string, papel: string): Promise<Caso[]> {
    const ids = await this.repositorio.idsDoMembro(officeId, userId);
    if (!ids.length) {
      return [];
    }
    const permitidos = new Set(ids);
    const casos = await this.repositorio.listar(officeId);
    return casos.filter(
      (caso) =>
        permitidos.has(String(caso.id)) && clearanceOk(caso.classification, papel),
    );
  }

  async obter(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<Caso> {
    const casoId = await this.repositorio.idDaCapa(identidade.officeId, idOrCnj);
    if (!casoId) {
      throw new NotFoundException("Caso não encontrado.");
    }

    const membro = await this.repositorio.temMembership(identidade.officeId, casoId, identidade.id);
    if (!membro) {
      await this.auditar(identidade, "caso_obter", "negado", "membership ausente", { casoId });
      throw new ForbiddenException("Sem membership neste caso.");
    }

    const achado = await this.repositorio.obter(identidade.officeId, idOrCnj);
    if (!achado) {
      throw new NotFoundException("Caso não encontrado.");
    }

    if (!clearanceOk(achado.classification, identidade.papel)) {
      await this.auditar(identidade, "caso_obter", "negado", "classification clearance ausente", {
        casoId,
        classification: achado.classification,
      });
      throw new ForbiddenException("Sem clearance para a classificação deste caso.");
    }

    return achado;
  }

  async abrir(
    identidade: IdentidadeRequisicao,
    client: string,
    adverse: string,
    classificationRaw?: string,
  ): Promise<string> {
    const clientKey = normalizarNomeParte(client);
    const adverseKey = normalizarNomeParte(adverse);
    if (!clientKey || !adverseKey || clientKey === adverseKey) {
      throw new BadRequestException("client and adverse party are required and must differ.");
    }

    let classification: CaseClassification = CLASSIFICATION_DEFAULT;
    if (classificationRaw !== undefined && classificationRaw !== null && String(classificationRaw).trim() !== "") {
      if (!isCaseClassification(classificationRaw)) {
        throw new BadRequestException("classification inválida.");
      }
      classification = classificationRaw;
    }

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

    return this.repositorio.inserirIntake({
      officeId: identidade.officeId,
      userId: identidade.id,
      role: identidade.papel,
      clientName: client.trim(),
      clientKey,
      adverseKey,
      classification,
    });
  }

  async excluir(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<void> {
    if (identidade.papel !== "socio" && identidade.papel !== "gestor") {
      throw new ForbiddenException("Só socio ou gestor excluem casos.");
    }
    const caso = await this.obter(identidade, idOrCnj);
    await this.repositorio.excluirCapa(identidade.officeId, String(caso.id));
    await this.auditar(identidade, "caso_excluir", "permitido", "exclusao", {
      casoId: String(caso.id),
    });
  }

  private auditar(
    identidade: IdentidadeRequisicao,
    ferramenta: "caso_obter" | "caso_abrir" | "caso_excluir",
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

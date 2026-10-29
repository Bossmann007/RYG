import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { CasosService } from "@modules/casos/casos.service";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  HonorarioKind,
  HonorarioLancamento,
  isHonorarioKind,
} from "./financeiro-types";

type ShadowCaso = {
  members: Set<string>;
  linhas: HonorarioLancamento[];
};

@Injectable()
export class FinanceiroService {
  private readonly logger = new Logger(FinanceiroService.name);
  private readonly sombra = new Map<string, ShadowCaso>();
  private schemaAusente = false;

  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly casos: CasosService,
  ) {}

  async listar(
    identidade: IdentidadeRequisicao,
    casoId: string,
  ): Promise<HonorarioLancamento[]> {
    await this.exigirAcesso(identidade, casoId, false);
    if (this.db.configurado()) {
      return this.listarDb(identidade.officeId, casoId);
    }
    return [...(this.sombra.get(this.chave(identidade.officeId, casoId))?.linhas || [])];
  }

  async registrar(
    identidade: IdentidadeRequisicao,
    casoId: string,
    body: { amountCentavos?: unknown; kind?: unknown },
  ): Promise<HonorarioLancamento> {
    if (identidade.papel !== "socio" && identidade.papel !== "gestor") {
      throw new ForbiddenException("Só socio ou gestor registram honorários.");
    }
    await this.exigirAcesso(identidade, casoId, true);

    const amountCentavos = this.parseAmountCentavos(body.amountCentavos);
    const kindRaw = body.kind === undefined ? "contratado" : body.kind;
    if (!isHonorarioKind(kindRaw)) {
      throw new BadRequestException("kind inválido (v0: contratado).");
    }
    const kind: HonorarioKind = kindRaw;

    const linha: HonorarioLancamento = {
      id: `hon_${randomBytes(8).toString("hex")}`,
      officeId: identidade.officeId,
      casoId,
      kind,
      amountCentavos,
      createdBy: identidade.id,
      createdAt: new Date().toISOString(),
    };

    if (this.db.configurado()) {
      const persistido = await this.inserirDb(linha);
      try {
        await this.auditarAppend(identidade, persistido);
      } catch (erro) {
        await this.apagarDb(identidade.officeId, persistido.id).catch(() => undefined);
        throw erro;
      }
      return persistido;
    }

    const shadow = this.sombra.get(this.chave(identidade.officeId, casoId));
    if (!shadow) {
      throw new NotFoundException("Caso não encontrado.");
    }
    shadow.linhas.push(linha);
    try {
      await this.auditarAppend(identidade, linha);
    } catch (erro) {
      shadow.linhas.pop();
      throw erro;
    }
    return linha;
  }

  private async exigirAcesso(
    identidade: IdentidadeRequisicao,
    casoId: string,
    escrita: boolean,
  ): Promise<void> {
    if (this.db.configurado()) {
      await this.casos.obter(identidade, casoId);
      return;
    }

    const chave = this.chave(identidade.officeId, casoId);
    let shadow = this.sombra.get(chave);
    if (!shadow) {
      if (!escrita) {
        throw new NotFoundException("Caso não encontrado.");
      }
      shadow = { members: new Set([identidade.id]), linhas: [] };
      this.sombra.set(chave, shadow);
      return;
    }
    if (!shadow.members.has(identidade.id)) {
      throw new ForbiddenException("Sem membership neste caso.");
    }
  }

  private async listarDb(officeId: string, casoId: string): Promise<HonorarioLancamento[]> {
    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT CAST(id AS CHAR) AS id, office_id AS officeId, CAST(caso_id AS CHAR) AS casoId,
                kind, amount_centavos AS amountCentavos, created_by AS createdBy,
                created_at AS createdAt
         FROM caso_honorarios
         WHERE office_id = ? AND CAST(caso_id AS CHAR) = ?
         ORDER BY id ASC`,
        [officeId, casoId],
      );
      return linhas.map((row) => this.linhaDeRow(row));
    } catch (erro) {
      this.falhaSchema(erro);
      throw erro;
    }
  }

  private async inserirDb(linha: HonorarioLancamento): Promise<HonorarioLancamento> {
    try {
      const result = await this.db.executar(
        `INSERT INTO caso_honorarios (office_id, caso_id, kind, amount_centavos, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [linha.officeId, linha.casoId, linha.kind, linha.amountCentavos, linha.createdBy],
      );
      const id = String(result.insertId);
      return { ...linha, id };
    } catch (erro) {
      this.falhaSchema(erro);
      throw erro;
    }
  }

  private async apagarDb(officeId: string, lancamentoId: string): Promise<void> {
    await this.db.executar(
      `DELETE FROM caso_honorarios WHERE office_id = ? AND CAST(id AS CHAR) = ? LIMIT 1`,
      [officeId, lancamentoId],
    );
  }

  private parseAmountCentavos(raw: unknown): number {
    if (typeof raw === "number") {
      if (!Number.isInteger(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER) {
        throw new BadRequestException("amountCentavos deve ser inteiro >= 0 (centavos BRL).");
      }
      return raw;
    }
    if (typeof raw === "string" && /^(0|[1-9]\d*)$/.test(raw.trim())) {
      const n = Number(raw.trim());
      if (!Number.isSafeInteger(n)) {
        throw new BadRequestException("amountCentavos deve ser inteiro >= 0 (centavos BRL).");
      }
      return n;
    }
    throw new BadRequestException("amountCentavos deve ser inteiro >= 0 (centavos BRL).");
  }

  private falhaSchema(erro: unknown): void {
    if (tabelaAusente(erro) || /Unknown column/i.test(String((erro as Error)?.message || ""))) {
      this.schemaAusente = true;
      this.logger.warn("caso_honorarios ausente; fail-closed");
      throw new ServiceUnavailableException(
        "Financeiro schema unavailable; operação bloqueada.",
      );
    }
    if (this.schemaAusente) {
      throw new ServiceUnavailableException(
        "Financeiro schema unavailable; operação bloqueada.",
      );
    }
  }

  private linhaDeRow(row: RowDataPacket): HonorarioLancamento {
    const kind = String(row.kind);
    if (!isHonorarioKind(kind)) {
      throw new ServiceUnavailableException("Honorário kind inválido no banco.");
    }
    return {
      id: String(row.id),
      officeId: String(row.officeId),
      casoId: String(row.casoId),
      kind,
      amountCentavos: Number(row.amountCentavos),
      createdBy: String(row.createdBy),
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  private auditarAppend(identidade: IdentidadeRequisicao, linha: HonorarioLancamento) {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "honorario_append",
      argumentos: {
        officeId: identidade.officeId,
        casoId: linha.casoId,
        lancamentoId: linha.id,
        kind: linha.kind,
      },
      decisao: "permitido",
      motivo: "append",
      omitido: ["amountCentavos"],
      duracaoMs: 0,
    });
  }

  private chave(officeId: string, casoId: string): string {
    return `${officeId}::${casoId}`;
  }
}

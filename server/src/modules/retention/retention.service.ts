import { Identidade } from "@models/gateway.model";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { AuditService } from "@modules/gateway/audit.service";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";

export type RetentionState = {
  casoId: string;
  officeId: string;
  legalHold: boolean;
  retentionUntil: string | null;
};

/**
 * Single gate for case delete/purge. Legal hold blocks delete.
 * Memory map covers provas when DB_* is unset.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly holds = new Map<string, RetentionState>();
  /** When HubLegal is configured but hold columns are missing, delete must fail closed. */
  private schemaHoldIndisponivel = false;

  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  private chave(officeId: string, casoId: string): string {
    return `${officeId}::${casoId}`;
  }

  async obter(officeId: string, casoId: string): Promise<RetentionState> {
    if (this.db.configurado()) {
      try {
        const linhas = await this.db.consultar<RowDataPacket>(
          `SELECT CAST(id AS CHAR) AS id, office_id AS officeId,
                  legal_hold AS legalHold, retention_until AS retentionUntil
           FROM casos WHERE CAST(id AS CHAR) = ? AND office_id = ? LIMIT 1`,
          [casoId, officeId],
        );
        if (!linhas.length) {
          throw new NotFoundException("Caso não encontrado.");
        }
        const row = linhas[0];
        return {
          casoId: String(row.id),
          officeId: String(row.officeId),
          legalHold: Boolean(Number(row.legalHold)),
          retentionUntil: row.retentionUntil
            ? String(row.retentionUntil).slice(0, 10)
            : null,
        };
      } catch (erro) {
        if (erro instanceof NotFoundException) {
          throw erro;
        }
        if (!tabelaAusente(erro) && !/Unknown column/i.test(String((erro as Error).message || ""))) {
          throw erro;
        }
        this.schemaHoldIndisponivel = true;
        this.logger.warn("retention columns ausentes; fail-closed");
        throw new ServiceUnavailableException(
          "Retention schema unavailable; operação bloqueada.",
        );
      }
    }

    return (
      this.holds.get(this.chave(officeId, casoId)) || {
        casoId,
        officeId,
        legalHold: false,
        retentionUntil: null,
      }
    );
  }

  async definirHold(
    identidade: Identidade,
    casoId: string,
    legalHold: boolean,
    retentionUntil?: string | null,
  ): Promise<RetentionState> {
    if (identidade.papel !== "socio" && identidade.papel !== "gestor") {
      throw new ForbiddenException("Só socio ou gestor alteram legal hold.");
    }
    const officeId = identidade.escritorio;
    const estado: RetentionState = {
      casoId,
      officeId,
      legalHold,
      retentionUntil: retentionUntil ? String(retentionUntil).slice(0, 10) : null,
    };

    if (this.db.configurado()) {
      try {
        const resultado = await this.db.executar(
          `UPDATE casos SET legal_hold = ?, retention_until = ?
           WHERE CAST(id AS CHAR) = ? AND office_id = ?`,
          [legalHold ? 1 : 0, estado.retentionUntil, casoId, officeId],
        );
        if (!resultado.affectedRows) {
          throw new NotFoundException("Caso não encontrado.");
        }
      } catch (erro) {
        if (erro instanceof NotFoundException) {
          throw erro;
        }
        if (tabelaAusente(erro) || /Unknown column/i.test(String((erro as Error).message || ""))) {
          this.schemaHoldIndisponivel = true;
          throw new ServiceUnavailableException(
            "Retention schema unavailable; operação bloqueada.",
          );
        }
        throw erro;
      }
    }

    this.holds.set(this.chave(officeId, casoId), estado);
    await this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "retention_hold",
      argumentos: {
        casoId,
        legalHold,
        retentionUntil: estado.retentionUntil || "",
      },
      decisao: "permitido",
      motivo: legalHold ? "legal_hold_on" : "legal_hold_off",
      omitido: [],
      duracaoMs: 0,
    });
    return estado;
  }

  /** Throws ConflictException when legal hold is on. */
  async assertPodeApagar(officeId: string, casoId: string): Promise<void> {
    const estado = await this.obter(officeId, casoId);
    if (estado.legalHold) {
      throw new ConflictException("Legal hold ativo. Exclusão bloqueada.");
    }
    if (this.db.configurado() && this.schemaHoldIndisponivel) {
      throw new ServiceUnavailableException(
        "Retention schema unavailable; exclusão bloqueada.",
      );
    }
  }

  async politicaEscritorio(officeId: string): Promise<{ defaultRetentionDays: number }> {
    if (this.db.configurado()) {
      try {
        const linhas = await this.db.consultar<RowDataPacket>(
          "SELECT default_retention_days AS days FROM office_retention_policy WHERE office_id = ? LIMIT 1",
          [officeId],
        );
        if (linhas[0]) {
          return { defaultRetentionDays: Number(linhas[0].days) || 2555 };
        }
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          throw erro instanceof ServiceUnavailableException
            ? erro
            : erro;
        }
      }
    }
    return { defaultRetentionDays: 2555 };
  }
}

import { Identidade } from "@models/gateway.model";
import { clearanceOk, isCaseClassification, CLASSIFICATION_DEFAULT } from "@common/security/case-classification";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { MEMBROS_DEMO_ESCRITORIO, USUARIOS_POR_TOKEN } from "../../fixtures/usuarios";
import { NUMERO_PROCESSO_DEMO } from "../../fixtures/processos";
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import { deriveCiteStatus, XirpCiteStatus } from "./xirp-cite";

const SUMMARY_MAX = 600;
const CASO_DEMO_BANCARIO = "caso-demo-bancario";

export type AgentRun = {
  id: string;
  officeId: string;
  casoId: string | null;
  userId: string;
  toolName: string;
  releaseId: string;
  sessionId: string;
  citeStatus: XirpCiteStatus;
  summary: string;
  referenceCount: number;
  createdAt: string;
};

export type RecordFromReleaseInput = {
  identidade: Identidade;
  ferramenta: string;
  argumentos: Record<string, unknown>;
  dto: {
    releaseId: string;
    sessionId: string;
    summary: string;
    safeReferences: Array<{ id: string; label: string; kind: string }>;
  };
};

@Injectable()
export class XirpRunsService {
  private readonly logger = new Logger(XirpRunsService.name);
  private readonly memoria: AgentRun[] = [];

  constructor(private readonly db: DbService) {}

  async recordFromRelease(input: RecordFromReleaseInput): Promise<void> {
    const refs = Array.isArray(input.dto.safeReferences) ? input.dto.safeReferences : [];
    let casoId = await this.resolverCasoId(
      input.identidade.escritorio,
      input.argumentos,
    );
    if (casoId && !(await this.atorPodeGravarNoCaso(input.identidade, casoId))) {
      // Non-members still get the MCP SafeDTO; the case panel never sees their run.
      casoId = null;
    }

    const run: AgentRun = {
      id: `run_${randomBytes(8).toString("hex")}`,
      officeId: input.identidade.escritorio,
      casoId,
      userId: input.identidade.id,
      toolName: input.ferramenta,
      releaseId: input.dto.releaseId,
      sessionId: input.dto.sessionId,
      citeStatus: deriveCiteStatus(refs),
      summary: String(input.dto.summary ?? "").slice(0, SUMMARY_MAX),
      referenceCount: refs.length,
      createdAt: new Date().toISOString(),
    };

    if (this.memoria.some((item) => item.releaseId === run.releaseId)) {
      return;
    }
    this.memoria.unshift(run);
    if (this.memoria.length > 500) {
      this.memoria.length = 500;
    }

    if (!this.db.configurado()) {
      return;
    }

    try {
      await this.db.executar(
        `INSERT INTO agent_runs
          (id, office_id, caso_id, user_id, tool_name, release_id, session_id, cite_status, summary, reference_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE release_id = release_id`,
        [
          run.id,
          run.officeId,
          run.casoId,
          run.userId,
          run.toolName,
          run.releaseId,
          run.sessionId,
          run.citeStatus,
          run.summary,
          run.referenceCount,
          new Date(run.createdAt),
        ],
      );
    } catch (erro) {
      if (tabelaAusente(erro)) {
        this.logger.warn("agent_runs ausente; run ficou só na memória");
        return;
      }
      // Wire has not left the hub yet; callers must fail closed.
      throw erro instanceof Error
        ? erro
        : new Error(`Falha ao persistir agent_run ${run.releaseId}`);
    }
  }

  async listarPorCaso(
    identidade: Identidade,
    casoId: string,
  ): Promise<AgentRun[]> {
    await this.assertAcessoCaso(identidade, casoId);

    if (this.db.configurado()) {
      try {
        const linhas = await this.db.consultar<RowDataPacket>(
          `SELECT id, office_id AS officeId, caso_id AS casoId, user_id AS userId,
                  tool_name AS toolName, release_id AS releaseId, session_id AS sessionId,
                  cite_status AS citeStatus, summary, reference_count AS referenceCount,
                  created_at AS createdAt
           FROM agent_runs
           WHERE office_id = ? AND caso_id = ?
           ORDER BY created_at DESC
           LIMIT 100`,
          [identidade.escritorio, casoId],
        );
        if (linhas.length) {
          return linhas.map((linha) => this.linhaParaRun(linha));
        }
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          throw erro;
        }
      }
    }

    return this.memoria.filter(
      (run) => run.officeId === identidade.escritorio && run.casoId === casoId,
    );
  }

  private linhaParaRun(linha: RowDataPacket): AgentRun {
    const created =
      linha.createdAt instanceof Date
        ? linha.createdAt.toISOString()
        : String(linha.createdAt);
    return {
      id: String(linha.id),
      officeId: String(linha.officeId),
      casoId: linha.casoId == null ? null : String(linha.casoId),
      userId: String(linha.userId),
      toolName: String(linha.toolName),
      releaseId: String(linha.releaseId),
      sessionId: String(linha.sessionId),
      citeStatus: String(linha.citeStatus) as XirpCiteStatus,
      summary: String(linha.summary),
      referenceCount: Number(linha.referenceCount) || 0,
      createdAt: created,
    };
  }

  private async resolverCasoId(
    officeId: string,
    argumentos: Record<string, unknown>,
  ): Promise<string | null> {
    const bruto = argumentos.processNumber ?? argumentos.processoId ?? argumentos.casoId;
    if (typeof bruto !== "string" || !bruto.trim()) {
      return null;
    }
    const chave = bruto.trim();
    const digitos = chave.replace(/\D/g, "");

    if (this.db.configurado()) {
      try {
        if (/^\d+$/.test(chave)) {
          const porId = await this.db.consultar<RowDataPacket>(
            "SELECT CAST(id AS CHAR) AS id FROM casos WHERE (id = ? OR processo_id = ?) AND office_id = ? LIMIT 1",
            [chave, chave, officeId],
          );
          if (porId[0]?.id) {
            return String(porId[0].id);
          }
        }
        if (digitos.length === 20) {
          const porCnj = await this.db.consultar<RowDataPacket>(
            `SELECT CAST(id AS CHAR) AS id FROM casos
             WHERE REPLACE(REPLACE(REPLACE(numero_cnj, '-', ''), '.', ''), '/', '') = ?
               AND office_id = ?
             LIMIT 1`,
            [digitos, officeId],
          );
          if (porCnj[0]?.id) {
            return String(porCnj[0].id);
          }
        }
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          this.logger.warn(`resolverCasoId: ${erro instanceof Error ? erro.message : "erro"}`);
        }
      }
    }

    const demoDigitos = NUMERO_PROCESSO_DEMO.replace(/\D/g, "");
    if (digitos === demoDigitos || chave === NUMERO_PROCESSO_DEMO) {
      return CASO_DEMO_BANCARIO;
    }
    return null;
  }

  private async assertAcessoCaso(
    identidade: Identidade,
    casoId: string,
  ): Promise<void> {
    if (this.db.configurado()) {
      try {
        const capas = await this.db.consultar<RowDataPacket>(
          "SELECT CAST(id AS CHAR) AS id, classification FROM casos WHERE CAST(id AS CHAR) = ? AND office_id = ? LIMIT 1",
          [casoId, identidade.escritorio],
        );
        if (!capas.length) {
          if (casoId === CASO_DEMO_BANCARIO) {
            this.assertMembroDemo(identidade);
            return;
          }
          throw new NotFoundException("Caso não encontrado.");
        }

        const membros = await this.db.consultar<RowDataPacket>(
          "SELECT 1 AS ok FROM case_memberships WHERE office_id = ? AND caso_id = ? AND user_id = ? LIMIT 1",
          [identidade.escritorio, casoId, identidade.id],
        );
        if (!membros.length) {
          throw new ForbiddenException("Sem membership neste caso.");
        }

        const raw = capas[0].classification;
        const classification = isCaseClassification(raw) ? raw : CLASSIFICATION_DEFAULT;
        if (!clearanceOk(classification, identidade.papel)) {
          throw new ForbiddenException("Sem clearance para a classificação deste caso.");
        }
        return;
      } catch (erro) {
        if (
          erro instanceof NotFoundException ||
          erro instanceof ForbiddenException
        ) {
          throw erro;
        }
        if (!tabelaAusente(erro)) {
          throw erro;
        }
      }
    }

    if (casoId !== CASO_DEMO_BANCARIO) {
      throw new NotFoundException("Caso não encontrado.");
    }
    this.assertMembroDemo(identidade);
  }

  private async atorPodeGravarNoCaso(
    identidade: Identidade,
    casoId: string,
  ): Promise<boolean> {
    if (this.db.configurado()) {
      try {
        const membros = await this.db.consultar<RowDataPacket>(
          "SELECT 1 AS ok FROM case_memberships WHERE office_id = ? AND caso_id = ? AND user_id = ? LIMIT 1",
          [identidade.escritorio, casoId, identidade.id],
        );
        return membros.length > 0;
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          throw erro;
        }
      }
    }

    if (casoId !== CASO_DEMO_BANCARIO) {
      return false;
    }
    return MEMBROS_DEMO_ESCRITORIO.some((token) => {
      const usuario = USUARIOS_POR_TOKEN[token];
      return (
        usuario &&
        usuario.id === identidade.id &&
        usuario.escritorio === identidade.escritorio
      );
    });
  }

  private assertMembroDemo(identidade: Identidade): void {
    const membro = MEMBROS_DEMO_ESCRITORIO.some((token) => {
      const usuario = USUARIOS_POR_TOKEN[token];
      return usuario && usuario.id === identidade.id && usuario.escritorio === identidade.escritorio;
    });
    if (!membro) {
      throw new ForbiddenException("Sem membership neste caso.");
    }
  }
}

export const XIRP_CASO_DEMO_BANCARIO = CASO_DEMO_BANCARIO;

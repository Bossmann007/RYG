import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { CasosService } from "@modules/casos/casos.service";
import { DbService } from "@modules/db/db.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

export const CITE_STATUSES = ["cited", "silent", "refused"] as const;
export type CiteStatus = (typeof CITE_STATUSES)[number];

export type RunMcp = {
  id: string;
  toolName: string;
  releaseId: string | null;
  citeStatus: CiteStatus;
  summary: string;
  createdAt: string;
};

export type NovaRun = {
  officeId: string;
  userId: string;
  caseId: string | null;
  toolName: string;
  releaseId: string | null;
  citeStatus: string;
  summary: string;
};

const RESUMO_MAX = 240;
const LISTA_MAX = 50;
const NOME_FERRAMENTA = /^[a-z][a-z0-9_]{0,63}$/;
const RELEASE_ID = /^rel_[0-9a-f]{12}$/;

/**
 * Xirp: metadata of MCP runs only. Never tool arguments, never a case body.
 * The row is written by the MCP path after SafeDTO; the case panel reads it back.
 */
@Injectable()
export class XirpService {
  constructor(
    private readonly db: DbService,
    private readonly casos: CasosService,
  ) {}

  async registrar(run: NovaRun): Promise<void> {
    const officeId = (run.officeId ?? "").trim();
    if (!officeId) {
      throw new BadRequestException("office_id is required.");
    }
    if (!(CITE_STATUSES as readonly string[]).includes(run.citeStatus)) {
      throw new BadRequestException("cite status must be cited, silent, or refused.");
    }
    if (!NOME_FERRAMENTA.test(run.toolName)) {
      throw new BadRequestException("tool name is invalid.");
    }
    if (run.releaseId !== null && !RELEASE_ID.test(run.releaseId)) {
      throw new BadRequestException("release id is invalid.");
    }

    await this.db.executar(
      `INSERT INTO mcp_runs
         (id, office_id, case_id, user_id, tool_name, release_id, cite_status, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `run_${randomBytes(8).toString("hex")}`,
        officeId,
        run.caseId,
        run.userId,
        run.toolName,
        run.releaseId,
        run.citeStatus,
        (run.summary ?? "").slice(0, RESUMO_MAX),
      ],
    );
  }

  /** Same gate as the capa: other office 404, same office without membership 403. */
  async listarDoCaso(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<RunMcp[]> {
    const casoId = await this.casos.autorizarCapa(identidade, idOrCnj);
    const linhas = await this.db.consultar<RowDataPacket>(
      `SELECT id, tool_name, release_id, cite_status, summary, created_at
         FROM mcp_runs
        WHERE office_id = ? AND case_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ${LISTA_MAX}`,
      [identidade.officeId, casoId],
    );
    return linhas.map((linha) => ({
      id: String(linha.id),
      toolName: String(linha.tool_name),
      releaseId: linha.release_id == null ? null : String(linha.release_id),
      citeStatus: linha.cite_status as CiteStatus,
      summary: String(linha.summary),
      createdAt: new Date(linha.created_at).toISOString(),
    }));
  }
}

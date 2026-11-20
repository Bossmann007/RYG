import { DbService, tabelaAusente } from "@modules/db/db.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

const SNIPPET_MAX = 160;
const HARDVAULT_HIT_CAP = 20;
const LOAD_NOTE_CAP = 5;
const LOAD_HARDVAULT_CAP = 5;
const TITLE_MAX = 255;

export type WikiPointer = {
  id: string;
  title: string;
  snippet: string;
};

@Injectable()
export class WikiService {
  constructor(private readonly db: DbService) {}

  async searchHardvault(
    officeId: string,
    userId: string,
    qBruto: string | undefined,
  ): Promise<WikiPointer[]> {
    const office = exigirOffice(officeId);
    const q = (qBruto ?? "").trim();
    if (!q) {
      throw new BadRequestException("Query q is required.");
    }
    return this.queryHardvault(office, userId, q, HARDVAULT_HIT_CAP);
  }

  async getOwnNote(
    officeId: string,
    userId: string,
    noteId: string,
  ): Promise<{ id: string; title: string; body: string }> {
    const office = exigirOffice(officeId);
    const id = (noteId ?? "").trim();
    if (!id) {
      throw new NotFoundException("Note not found.");
    }

    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT id, title, body
           FROM vault_personal_notes
          WHERE office_id = ?
            AND id = ?
            AND owner_id = ?
          LIMIT 1`,
        [office, id, userId],
      );
      if (!linhas.length) {
        throw new NotFoundException("Note not found.");
      }
      const row = linhas[0];
      return {
        id: String(row.id),
        title: String(row.title),
        body: String(row.body),
      };
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async createNote(
    officeId: string,
    userId: string,
    titleBruto: unknown,
    bodyBruto: unknown,
  ): Promise<{ id: string; title: string }> {
    const office = exigirOffice(officeId);
    const title = typeof titleBruto === "string" ? titleBruto.trim() : "";
    const body = typeof bodyBruto === "string" ? bodyBruto.trim() : "";
    if (!title || !body || title.length > TITLE_MAX) {
      throw new BadRequestException("title and body are required; title max 255.");
    }

    const id = idCurto();
    try {
      await this.db.executar(
        `INSERT INTO vault_personal_notes (id, office_id, owner_id, title, body)
         VALUES (?, ?, ?, ?, ?)`,
        [id, office, userId, title, body],
      );
      return { id, title };
    } catch (erro) {
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async publishNote(
    officeId: string,
    userId: string,
    noteId: string,
    confirm: unknown,
  ): Promise<{ id: string; title: string }> {
    const office = exigirOffice(officeId);
    if (confirm !== true) {
      throw new BadRequestException("confirm must be true to publish.");
    }
    const id = (noteId ?? "").trim();
    if (!id) {
      throw new NotFoundException("Note not found.");
    }

    try {
      return await this.db.transacao(async (connection) => {
        const note = await this.carregarNotaPropriaTx(connection, office, userId, id);
        const jaPublicado = await this.docJaPublicadoTx(connection, office, id);
        if (jaPublicado) {
          throw new ConflictException("Note already published to hardvault.");
        }

        const requestId = idCurto();
        const docId = idCurto();
        await connection.query(
          `INSERT INTO hardvault_publish_requests
             (id, office_id, note_id, requested_by, status, decided_at, decided_by)
           VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP, ?)`,
          [requestId, office, id, userId, userId],
        );
        await connection.query(
          `INSERT INTO hardvault_docs
             (id, office_id, source_note_id, title, body, published_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [docId, office, id, note.title, note.body, userId],
        );
        await connection.query(
          `INSERT INTO hardvault_acl
             (office_id, doc_id, principal_type, principal_id, permission)
           VALUES (?, ?, 'office', ?, 'read')`,
          [office, docId, office],
        );
        return { id: docId, title: note.title };
      });
    } catch (erro) {
      if (
        erro instanceof NotFoundException ||
        erro instanceof BadRequestException ||
        erro instanceof ConflictException
      ) {
        throw erro;
      }
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async loadPack(
    officeId: string,
    userId: string,
    qBruto: string | undefined,
  ): Promise<{ notes: WikiPointer[]; hardvault: WikiPointer[] }> {
    const office = exigirOffice(officeId);
    const q = (qBruto ?? "").trim();
    const notes = await this.queryOwnNotePointers(office, userId, q || null, LOAD_NOTE_CAP);
    const hardvault = q
      ? await this.queryHardvault(office, userId, q, LOAD_HARDVAULT_CAP)
      : [];
    return { notes, hardvault };
  }

  private async queryHardvault(
    officeId: string,
    userId: string,
    needle: string,
    lim: number,
  ): Promise<WikiPointer[]> {
    const like = `%${needle}%`;
    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT d.id AS id, d.title AS title, d.body AS body
           FROM hardvault_docs d
           INNER JOIN hardvault_acl a
             ON a.doc_id = d.id AND a.office_id = d.office_id
          WHERE d.office_id = ?
            AND a.permission = 'read'
            AND (
              (a.principal_type = 'office' AND a.principal_id = ?)
              OR (a.principal_type = 'user' AND a.principal_id = ?)
            )
            AND (d.title LIKE ? OR d.body LIKE ?)
          ORDER BY d.published_at DESC, d.id DESC
          LIMIT ?`,
        [officeId, officeId, userId, like, like, lim],
      );
      return linhas.map((linha) => pointerDe(linha));
    } catch (erro) {
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  private async queryOwnNotePointers(
    officeId: string,
    userId: string,
    needle: string | null,
    lim: number,
  ): Promise<WikiPointer[]> {
    try {
      const params: unknown[] = [officeId, userId];
      let filtro = "";
      if (needle) {
        filtro = " AND (title LIKE ? OR body LIKE ?)";
        const like = `%${needle}%`;
        params.push(like, like);
      }
      params.push(lim);
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT id, title, body
           FROM vault_personal_notes
          WHERE office_id = ?
            AND owner_id = ?${filtro}
          ORDER BY updated_at DESC, id DESC
          LIMIT ?`,
        params,
      );
      return linhas.map((linha) => pointerDe(linha));
    } catch (erro) {
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  private async carregarNotaPropriaTx(
    connection: PoolConnection,
    officeId: string,
    userId: string,
    noteId: string,
  ): Promise<{ id: string; title: string; body: string }> {
    const [linhas] = await connection.query<RowDataPacket[]>(
      `SELECT id, title, body
         FROM vault_personal_notes
        WHERE office_id = ?
          AND id = ?
          AND owner_id = ?
        LIMIT 1`,
      [officeId, noteId, userId],
    );
    if (!linhas.length) {
      throw new NotFoundException("Note not found.");
    }
    const row = linhas[0];
    return {
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
    };
  }

  private async docJaPublicadoTx(
    connection: PoolConnection,
    officeId: string,
    noteId: string,
  ): Promise<boolean> {
    const [linhas] = await connection.query<RowDataPacket[]>(
      `SELECT id
         FROM hardvault_docs
        WHERE office_id = ?
          AND source_note_id = ?
        LIMIT 1`,
      [officeId, noteId],
    );
    return linhas.length > 0;
  }

  private recusarTabelaAusente(erro: unknown): void {
    if (tabelaAusente(erro)) {
      throw new ServiceUnavailableException("Wiki vault unavailable. Operation refused.");
    }
  }
}

function exigirOffice(officeId: string): string {
  const office = (officeId || "").trim();
  if (!office) {
    throw new UnauthorizedException("Escritório obrigatório.");
  }
  return office;
}

function idCurto(): string {
  return randomUUID().replace(/-/g, "").slice(0, 32);
}

function pointerDe(linha: RowDataPacket): WikiPointer {
  const body = String(linha.body ?? "");
  return {
    id: String(linha.id),
    title: String(linha.title ?? ""),
    snippet: body.slice(0, SNIPPET_MAX),
  };
}

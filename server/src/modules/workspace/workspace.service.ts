import { DbService, tabelaAusente } from "@modules/db/db.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { USUARIOS_POR_TOKEN } from "../../fixtures/usuarios";

const MENCAO_RE = /@u-\d+/g;

@Injectable()
export class WorkspaceService {
  constructor(private readonly db: DbService) {}

  async abrirDm(
    officeId: string,
    callerId: string,
    peerUserIdBruto: string,
  ): Promise<{ threadId: string; criado: boolean }> {
    const peerUserId = (peerUserIdBruto || "").trim();
    if (!peerUserId || peerUserId === callerId) {
      throw new NotFoundException("Utilizador não encontrado.");
    }

    const peer = identidadePorId(peerUserId);
    if (!peer || peer.escritorio !== officeId) {
      throw new NotFoundException("Utilizador não encontrado.");
    }

    try {
      return await this.db.transacao(async (connection) => {
        const existente = await this.encontrarPar(connection, officeId, callerId, peerUserId);
        if (existente) {
          return { threadId: existente, criado: false };
        }

        const threadId = idCurto();
        await connection.query(
          "INSERT INTO workspace_threads (id, office_id) VALUES (?, ?)",
          [threadId, officeId],
        );
        await connection.query(
          `INSERT INTO workspace_thread_members (office_id, thread_id, user_id)
           VALUES (?, ?, ?), (?, ?, ?)`,
          [officeId, threadId, callerId, officeId, threadId, peerUserId],
        );
        return { threadId, criado: true };
      });
    } catch (erro) {
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async listarDms(officeId: string, userId: string): Promise<{ id: string }[]> {
    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT t.id AS id
           FROM workspace_threads t
           INNER JOIN workspace_thread_members m
             ON m.thread_id = t.id AND m.office_id = t.office_id
          WHERE t.office_id = ? AND m.user_id = ?
          ORDER BY t.created_at DESC, t.id DESC`,
        [officeId, userId],
      );
      return linhas.map((linha) => ({ id: String(linha.id) }));
    } catch (erro) {
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async listarMensagens(
    officeId: string,
    userId: string,
    threadId: string,
  ): Promise<{ id: string; authorId: string; body: string; createdAt: string }[]> {
    try {
      await this.exigirMembro(officeId, userId, threadId);
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT id, author_id, body, created_at
           FROM workspace_messages
          WHERE office_id = ? AND thread_id = ?
          ORDER BY created_at ASC, id ASC`,
        [officeId, threadId],
      );
      return linhas.map((linha) => ({
        id: String(linha.id),
        authorId: String(linha.author_id),
        body: String(linha.body),
        createdAt: dataIso(linha.created_at),
      }));
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async enviarMensagem(
    officeId: string,
    authorId: string,
    threadId: string,
    bodyBruto: string,
  ): Promise<{ messageId: string; mentions: string[] }> {
    const body = typeof bodyBruto === "string" ? bodyBruto.trim() : "";
    if (!body) {
      throw new BadRequestException("body não pode ser vazio.");
    }

    try {
      return await this.db.transacao(async (connection) => {
        await this.exigirMembroTx(connection, officeId, authorId, threadId);

        const messageId = idCurto();
        await connection.query(
          `INSERT INTO workspace_messages
            (id, office_id, thread_id, author_id, body)
           VALUES (?, ?, ?, ?, ?)`,
          [messageId, officeId, threadId, authorId, body],
        );

        const mencoes = mencoesValidas(body, officeId);
        for (const mentionedUserId of mencoes) {
          await connection.query(
            `INSERT INTO workspace_mentions
              (id, office_id, thread_id, message_id, mentioned_user_id)
             VALUES (?, ?, ?, ?, ?)`,
            [idCurto(), officeId, threadId, messageId, mentionedUserId],
          );
        }

        return { messageId, mentions: mencoes };
      });
    } catch (erro) {
      if (erro instanceof NotFoundException || erro instanceof BadRequestException) {
        throw erro;
      }
      this.recusarTabelaAusente(erro);
      throw erro;
    }
  }

  private async encontrarPar(
    connection: PoolConnection,
    officeId: string,
    userA: string,
    userB: string,
  ): Promise<string | undefined> {
    const [linhas] = await connection.query<RowDataPacket[]>(
      `SELECT t.id AS id
         FROM workspace_threads t
         INNER JOIN workspace_thread_members a
           ON a.thread_id = t.id AND a.office_id = t.office_id AND a.user_id = ?
         INNER JOIN workspace_thread_members b
           ON b.thread_id = t.id AND b.office_id = t.office_id AND b.user_id = ?
        WHERE t.office_id = ?
          AND (
            SELECT COUNT(*) FROM workspace_thread_members m
             WHERE m.thread_id = t.id AND m.office_id = t.office_id
          ) = 2
        LIMIT 1`,
      [userA, userB, officeId],
    );
    return linhas[0] ? String(linhas[0].id) : undefined;
  }

  private async exigirMembro(officeId: string, userId: string, threadId: string): Promise<void> {
    const linhas = await this.db.consultar<RowDataPacket>(
      `SELECT 1 AS ok
         FROM workspace_thread_members
        WHERE office_id = ? AND thread_id = ? AND user_id = ?
        LIMIT 1`,
      [officeId, threadId, userId],
    );
    if (!linhas.length) {
      throw new NotFoundException("Thread não encontrada.");
    }
  }

  private async exigirMembroTx(
    connection: PoolConnection,
    officeId: string,
    userId: string,
    threadId: string,
  ): Promise<void> {
    const [linhas] = await connection.query<RowDataPacket[]>(
      `SELECT 1 AS ok
         FROM workspace_thread_members
        WHERE office_id = ? AND thread_id = ? AND user_id = ?
        LIMIT 1`,
      [officeId, threadId, userId],
    );
    if (!linhas.length) {
      throw new NotFoundException("Thread não encontrada.");
    }
  }

  private recusarTabelaAusente(erro: unknown): void {
    if (tabelaAusente(erro)) {
      throw new ServiceUnavailableException("Workspace DMs indisponível. Operação recusada.");
    }
  }
}

function identidadePorId(userId: string) {
  return Object.values(USUARIOS_POR_TOKEN).find((usuario) => usuario.id === userId);
}

function mencoesValidas(body: string, officeId: string): string[] {
  const tokens = body.match(MENCAO_RE) || [];
  const ids = new Set<string>();
  for (const token of tokens) {
    const userId = token.slice(1);
    const peer = identidadePorId(userId);
    if (peer && peer.escritorio === officeId) {
      ids.add(userId);
    }
  }
  return [...ids];
}

function idCurto(): string {
  return randomUUID().replace(/-/g, "");
}

function dataIso(valor: Date | string): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error("Data de mensagem inválida no banco.");
  }
  return data.toISOString();
}

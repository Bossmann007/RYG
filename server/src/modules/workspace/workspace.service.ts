import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { Identidade } from "@models/gateway.model";
import { DbService } from "@modules/db/db.service";
import { IdentityService } from "@modules/gateway/identity.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import { extrairMencoes } from "./workspace-mentions";
import { CriarMensagemWorkspaceDto } from "./workspace.dto";

type LinhaCanal = RowDataPacket & {
  id: string;
  office_id: string;
  kind: string;
  title: string | null;
  created_at: Date | string;
};

type LinhaMensagem = RowDataPacket & {
  id: string;
  channel_id: string;
  office_id: string;
  author_user_id: string;
  author_nome: string;
  author_papel: string;
  mensagem: string;
  created_at: Date | string;
};

type CursorChat = { createdAt: string; id: string };

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 100;

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly db: DbService,
    private readonly identity: IdentityService,
  ) {}

  async listarDms(identidade: IdentidadeRequisicao) {
    const linhas = await this.db.consultar<
      RowDataPacket & {
        channel_id: string;
        peer_user_id: string;
        created_at: Date | string;
      }
    >(
      `SELECT m.channel_id, peer.user_id AS peer_user_id, c.created_at
         FROM workspace_channel_members m
         INNER JOIN workspace_channels c
           ON c.id = m.channel_id AND c.office_id = m.office_id AND c.kind = 'dm'
         INNER JOIN workspace_channel_members peer
           ON peer.channel_id = m.channel_id
          AND peer.office_id = m.office_id
          AND peer.user_id <> m.user_id
        WHERE m.office_id = ? AND m.user_id = ?
        ORDER BY c.created_at DESC`,
      [identidade.officeId, identidade.id],
    );

    return {
      dms: linhas.map((linha) => {
        const peer = this.identity.porUserId(String(linha.peer_user_id));
        return {
          channelId: String(linha.channel_id),
          peerUserId: String(linha.peer_user_id),
          peerNome: peer?.nome || String(linha.peer_user_id),
          peerPapel: peer?.papel || "desconhecido",
          createdAt: dataIso(linha.created_at),
        };
      }),
    };
  }

  async abrirOuObterDm(identidade: IdentidadeRequisicao, peerUserIdBruto: string) {
    const peerUserId = peerUserIdBruto.trim();
    if (!peerUserId || peerUserId === identidade.id) {
      throw new BadRequestException("peerUserId deve ser outro usuário do escritório.");
    }

    const peer = this.identity.porUserId(peerUserId);
    if (!peer || peer.escritorio !== identidade.officeId) {
      throw new NotFoundException("Usuário não encontrado neste escritório.");
    }

    const [userA, userB] = parOrdenado(identidade.id, peer.id);
    const existentes = await this.db.consultar<RowDataPacket & { channel_id: string }>(
      `SELECT channel_id FROM workspace_dm_pairs
        WHERE office_id = ? AND user_a = ? AND user_b = ? LIMIT 1`,
      [identidade.officeId, userA, userB],
    );
    if (existentes[0]) {
      return {
        channelId: String(existentes[0].channel_id),
        criado: false,
        peer: resumoPeer(peer),
      };
    }

    const channelId = randomUUID();
    try {
      await this.db.executar(
        `INSERT INTO workspace_channels (id, office_id, kind, title)
         VALUES (?, ?, 'dm', NULL)`,
        [channelId, identidade.officeId],
      );
      await this.db.executar(
        `INSERT INTO workspace_channel_members (channel_id, office_id, user_id)
         VALUES (?, ?, ?), (?, ?, ?)`,
        [channelId, identidade.officeId, identidade.id, channelId, identidade.officeId, peer.id],
      );
      await this.db.executar(
        `INSERT INTO workspace_dm_pairs (office_id, user_a, user_b, channel_id)
         VALUES (?, ?, ?, ?)`,
        [identidade.officeId, userA, userB, channelId],
      );
    } catch (erro) {
      if (!chaveDuplicada(erro)) {
        throw erro;
      }
      const novamente = await this.db.consultar<RowDataPacket & { channel_id: string }>(
        `SELECT channel_id FROM workspace_dm_pairs
          WHERE office_id = ? AND user_a = ? AND user_b = ? LIMIT 1`,
        [identidade.officeId, userA, userB],
      );
      if (!novamente[0]) {
        throw erro;
      }
      return {
        channelId: String(novamente[0].channel_id),
        criado: false,
        peer: resumoPeer(peer),
      };
    }

    return { channelId, criado: true, peer: resumoPeer(peer) };
  }

  async listarMensagens(
    identidade: IdentidadeRequisicao,
    channelId: string,
    limiteBruto?: string,
    cursorBruto?: string,
  ) {
    await this.exigirMembro(identidade, channelId);
    const limite = limiteDe(limiteBruto);
    const cursor = cursorBruto ? decodificarCursor(cursorBruto) : undefined;
    const params: unknown[] = [channelId, identidade.officeId];
    let recorte = "";

    if (cursor) {
      recorte = " AND (created_at < ? OR (created_at = ? AND id < ?))";
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    params.push(limite + 1);
    const linhas = await this.db.consultar<LinhaMensagem>(
      `SELECT id, channel_id, office_id, author_user_id, author_nome, author_papel,
              mensagem, created_at
         FROM workspace_messages
        WHERE channel_id = ? AND office_id = ?${recorte}
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
      params,
    );
    const temMais = linhas.length > limite;
    const paginaDesc = linhas.slice(0, limite);
    const ultima = paginaDesc[paginaDesc.length - 1];

    return {
      mensagens: paginaDesc.reverse().map((linha) => mensagemDaLinha(linha, identidade.id)),
      proximoCursor:
        temMais && ultima
          ? codificarCursor({ createdAt: dataIso(ultima.created_at), id: ultima.id })
          : null,
    };
  }

  async criarMensagem(
    identidade: IdentidadeRequisicao,
    channelId: string,
    dto: CriarMensagemWorkspaceDto,
  ) {
    await this.exigirMembro(identidade, channelId);
    const mensagem = dto.mensagem.trim();
    if (!mensagem) {
      throw new BadRequestException("mensagem não pode conter apenas espaços.");
    }

    const mencoes = extrairMencoes(
      mensagem,
      this.identity.diretorioDoEscritorio(identidade.officeId),
    ).filter((pessoa) => pessoa.id !== identidade.id);

    try {
      await this.db.executar(
        `INSERT INTO workspace_messages
          (id, channel_id, office_id, author_user_id, author_nome, author_papel, mensagem)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.id,
          channelId,
          identidade.officeId,
          identidade.id,
          identidade.nome.slice(0, 128),
          identidade.papel.slice(0, 64),
          mensagem,
        ],
      );
    } catch (erro) {
      if (!chaveDuplicada(erro)) {
        throw erro;
      }
      const existente = await this.buscarMensagem(channelId, identidade.officeId, dto.id);
      if (!existente || existente.mensagem !== mensagem) {
        throw new ConflictException("UUID já utilizado por outra mensagem.");
      }
      return {
        mensagem: mensagemDaLinha(existente, identidade.id),
        criado: false,
        mencoes: [] as string[],
      };
    }

    for (const pessoa of mencoes) {
      await this.db.executar(
        `INSERT INTO workspace_mentions
          (id, office_id, channel_id, message_id, mentioned_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), identidade.officeId, channelId, dto.id, pessoa.id],
      );
    }

    const criada = await this.buscarMensagem(channelId, identidade.officeId, dto.id);
    if (!criada) {
      throw new ConflictException("A mensagem foi inserida, mas não pôde ser relida.");
    }

    return {
      mensagem: mensagemDaLinha(criada, identidade.id),
      criado: true,
      mencoes: mencoes.map((pessoa) => pessoa.id),
    };
  }

  private async exigirMembro(
    identidade: IdentidadeRequisicao,
    channelId: string,
  ): Promise<LinhaCanal> {
    const canais = await this.db.consultar<LinhaCanal>(
      `SELECT id, office_id, kind, title, created_at
         FROM workspace_channels
        WHERE id = ? AND office_id = ? LIMIT 1`,
      [channelId, identidade.officeId],
    );
    if (!canais[0]) {
      throw new NotFoundException("Canal não encontrado.");
    }

    const membros = await this.db.consultar<RowDataPacket>(
      `SELECT 1 AS ok FROM workspace_channel_members
        WHERE channel_id = ? AND office_id = ? AND user_id = ? LIMIT 1`,
      [channelId, identidade.officeId, identidade.id],
    );
    if (!membros.length) {
      throw new ForbiddenException("Sem membership neste canal.");
    }
    return canais[0];
  }

  private async buscarMensagem(
    channelId: string,
    officeId: string,
    id: string,
  ): Promise<LinhaMensagem | undefined> {
    const linhas = await this.db.consultar<LinhaMensagem>(
      `SELECT id, channel_id, office_id, author_user_id, author_nome, author_papel,
              mensagem, created_at
         FROM workspace_messages
        WHERE channel_id = ? AND office_id = ? AND id = ? LIMIT 1`,
      [channelId, officeId, id],
    );
    return linhas[0];
  }
}

function resumoPeer(peer: Identidade) {
  return { userId: peer.id, nome: peer.nome, papel: peer.papel };
}

function parOrdenado(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function mensagemDaLinha(linha: LinhaMensagem, eu: string) {
  return {
    id: linha.id,
    authorUserId: linha.author_user_id,
    autora: linha.author_nome,
    papel: linha.author_papel,
    texto: linha.mensagem,
    createdAt: dataIso(linha.created_at),
    propria: linha.author_user_id === eu,
  };
}

function limiteDe(valor?: string): number {
  if (!valor) return LIMITE_PADRAO;
  const limite = Number(valor);
  if (!Number.isSafeInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
    throw new BadRequestException(`limite deve estar entre 1 e ${LIMITE_MAXIMO}.`);
  }
  return limite;
}

function dataIso(valor: Date | string): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error("Data de workspace inválida no banco.");
  }
  return data.toISOString();
}

function codificarCursor(cursor: CursorChat): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodificarCursor(valor: string): CursorChat {
  try {
    const cursor = JSON.parse(Buffer.from(valor, "base64url").toString("utf8"));
    if (
      !cursor ||
      typeof cursor.createdAt !== "string" ||
      Number.isNaN(new Date(cursor.createdAt).getTime()) ||
      typeof cursor.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor.id)
    ) {
      throw new Error();
    }
    return cursor;
  } catch {
    throw new BadRequestException("cursor inválido.");
  }
}

function chaveDuplicada(erro: unknown): boolean {
  const dbErro = erro as { code?: string; errno?: number };
  return dbErro?.code === "ER_DUP_ENTRY" || dbErro?.errno === 1062;
}

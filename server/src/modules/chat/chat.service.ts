import { DbService } from "@modules/db/db.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import { CriarMensagemChatDto } from "./chat.dto";

type LinhaChat = RowDataPacket & {
  id: string;
  processo_id: number;
  remetente_nome: string;
  remetente_papel: string;
  remetente_simulado: number | boolean;
  mensagem: string;
  created_at: Date | string;
};

type CursorChat = { createdAt: string; id: string };

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 100;

@Injectable()
export class ChatService {
  constructor(private readonly db: DbService) {}

  async listar(processoIdBruto: string, limiteBruto?: string, cursorBruto?: string) {
    const processoId = processoIdDe(processoIdBruto);
    await this.exigirProcesso(processoId);
    const limite = limiteDe(limiteBruto);
    const cursor = cursorBruto ? decodificarCursor(cursorBruto) : undefined;
    const params: unknown[] = [processoId];
    let recorte = "";

    if (cursor) {
      recorte = " AND (created_at < ? OR (created_at = ? AND id < ?))";
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    params.push(limite + 1);
    const linhas = await this.db.consultar<LinhaChat>(
      `SELECT id, processo_id, remetente_nome, remetente_papel,
              remetente_simulado, mensagem, created_at
         FROM chat
        WHERE processo_id = ?${recorte}
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
      params
    );
    const temMais = linhas.length > limite;
    const paginaDesc = linhas.slice(0, limite);
    const ultima = paginaDesc[paginaDesc.length - 1];

    return {
      mensagens: paginaDesc.reverse().map(mensagemDaLinha),
      proximoCursor:
        temMais && ultima
          ? codificarCursor({ createdAt: dataIso(ultima.created_at), id: ultima.id })
          : null,
    };
  }

  async criar(processoIdBruto: string, dto: CriarMensagemChatDto) {
    const processoId = processoIdDe(processoIdBruto);
    await this.exigirProcesso(processoId);
    const mensagem = dto.mensagem.trim();
    if (!mensagem) {
      throw new BadRequestException("mensagem não pode conter apenas espaços.");
    }

    const remetenteNome = process.env.CHAT_DEMO_SENDER_NAME?.trim() || "Equipe Zhegga";
    const remetentePapel = process.env.CHAT_DEMO_SENDER_ROLE?.trim() || "Equipe jurídica";

    try {
      await this.db.executar(
        `INSERT INTO chat
          (id, processo_id, remetente_nome, remetente_papel,
           remetente_simulado, mensagem)
         VALUES (?, ?, ?, ?, TRUE, ?)`,
        [dto.id, processoId, remetenteNome.slice(0, 128), remetentePapel.slice(0, 64), mensagem]
      );
    } catch (erro) {
      if (!chaveDuplicada(erro)) {
        throw erro;
      }

      const existente = await this.buscar(processoId, dto.id);
      if (!existente || existente.mensagem !== mensagem) {
        throw new ConflictException("UUID já utilizado por outra mensagem.");
      }

      return { mensagem: mensagemDaLinha(existente), criado: false };
    }

    const criada = await this.buscar(processoId, dto.id);
    if (!criada) {
      throw new ConflictException("A mensagem foi inserida, mas não pôde ser relida.");
    }

    return { mensagem: mensagemDaLinha(criada), criado: true };
  }

  private async exigirProcesso(processoId: number): Promise<void> {
    const linhas = await this.db.consultar<RowDataPacket>(
      "SELECT id FROM processos WHERE id = ? LIMIT 1",
      [processoId]
    );
    if (!linhas.length) {
      throw new NotFoundException("Processo não encontrado.");
    }
  }

  private async buscar(processoId: number, id: string): Promise<LinhaChat | undefined> {
    const linhas = await this.db.consultar<LinhaChat>(
      `SELECT id, processo_id, remetente_nome, remetente_papel,
              remetente_simulado, mensagem, created_at
         FROM chat WHERE processo_id = ? AND id = ? LIMIT 1`,
      [processoId, id]
    );
    return linhas[0];
  }
}

function mensagemDaLinha(linha: LinhaChat) {
  return {
    id: linha.id,
    autora: linha.remetente_nome,
    papel: linha.remetente_papel,
    texto: linha.mensagem,
    createdAt: dataIso(linha.created_at),
    simulada: Boolean(linha.remetente_simulado),
    propria: true,
  };
}

function processoIdDe(valor: string): number {
  if (!/^\d+$/.test(valor || "")) {
    throw new BadRequestException("processoId deve ser um inteiro positivo.");
  }
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new BadRequestException("processoId deve ser um inteiro positivo.");
  }
  return id;
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
    throw new Error("Data de chat inválida no banco.");
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

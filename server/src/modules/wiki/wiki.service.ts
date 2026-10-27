import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { DbService } from "@modules/db/db.service";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";

const LIMITE_TITULO = 255;
const LIMITE_BODY = 100_000;
const LIMITE_SNIPPET = 512;
const PACK_MAX = 8;

type LinhaNota = RowDataPacket & {
  id: string;
  office_id: string;
  owner_user_id: string;
  title: string;
  body_md: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type LinhaDoc = RowDataPacket & {
  id: string;
  office_id: string;
  title: string;
  snippet: string;
  body_md: string;
  source_note_id: string | null;
  published_by: string;
  published_at: Date | string;
  classification: string;
};

@Injectable()
export class WikiService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async listarNotas(identidade: IdentidadeRequisicao) {
    const linhas = await this.consultar<LinhaNota>(
      `SELECT id, office_id, owner_user_id, title, body_md, created_at, updated_at
         FROM vault_personal_notes
        WHERE office_id = ? AND owner_user_id = ?
        ORDER BY updated_at DESC`,
      [identidade.officeId, identidade.id],
    );
    return { notes: linhas.map((l) => resumoNota(l)) };
  }

  async obterNota(identidade: IdentidadeRequisicao, id: string) {
    const nota = await this.notaDoDono(identidade, id);
    return { note: notaCompleta(nota) };
  }

  async criarNota(
    identidade: IdentidadeRequisicao,
    entrada: { title: string; bodyMd: string },
  ) {
    const id = randomUUID();
    const title = sanitizarTitulo(entrada.title);
    const bodyMd = sanitizarBody(entrada.bodyMd);
    await this.executar(
      `INSERT INTO vault_personal_notes
        (id, office_id, owner_user_id, title, body_md)
       VALUES (?, ?, ?, ?, ?)`,
      [id, identidade.officeId, identidade.id, title, bodyMd],
    );
    return this.obterNota(identidade, id);
  }

  async atualizarNota(
    identidade: IdentidadeRequisicao,
    id: string,
    entrada: { title?: string; bodyMd?: string },
  ) {
    const atual = await this.notaDoDono(identidade, id);
    const title =
      entrada.title !== undefined ? sanitizarTitulo(entrada.title) : atual.title;
    const bodyMd =
      entrada.bodyMd !== undefined ? sanitizarBody(entrada.bodyMd) : atual.body_md;
    await this.executar(
      `UPDATE vault_personal_notes
          SET title = ?, body_md = ?
        WHERE id = ? AND office_id = ? AND owner_user_id = ?`,
      [title, bodyMd, id, identidade.officeId, identidade.id],
    );
    return this.obterNota(identidade, id);
  }

  /**
   * Publish requires explicit confirm:true. Creates hardvault doc + office ACL.
   * Personal note remains owned; hardvault is the only searchable surface.
   */
  async publicarNota(
    identidade: IdentidadeRequisicao,
    noteId: string,
    confirm: boolean,
  ) {
    if (!confirm) {
      throw new BadRequestException(
        "Publicação exige confirm:true (HITL no hardvault).",
      );
    }
    const nota = await this.notaDoDono(identidade, noteId);
    const requestId = randomUUID();
    const docId = randomUUID();
    const snippet = montarSnippet(nota.title, nota.body_md);

    await this.executar(
      `INSERT INTO vault_publish_requests
        (id, office_id, note_id, requested_by, status, confirmed, hardvault_doc_id, decided_at)
       VALUES (?, ?, ?, ?, 'published', 1, ?, CURRENT_TIMESTAMP(6))`,
      [requestId, identidade.officeId, noteId, identidade.id, docId],
    );
    await this.executar(
      `INSERT INTO hardvault_docs
        (id, office_id, title, snippet, body_md, source_note_id, published_by, classification)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'interno')`,
      [docId, identidade.officeId, nota.title, snippet, nota.body_md, noteId, identidade.id],
    );
    await this.executar(
      `INSERT INTO hardvault_acl (doc_id, office_id, principal_type, principal_id)
       VALUES (?, ?, 'office', ?)`,
      [docId, identidade.officeId, identidade.officeId],
    );

    await this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "wiki_publish_hardvault",
      argumentos: {
        noteId,
        docId,
        officeId: identidade.officeId,
        confirm: true,
      },
      decisao: "permitido",
      motivo: "hardvault_publish",
      omitido: ["body_md"],
      duracaoMs: 0,
    } satisfies RegistroAuditoria);

    return {
      requestId,
      docId,
      title: nota.title,
      snippet,
    };
  }

  async buscarHardvault(identidade: IdentidadeRequisicao, q: string) {
    const termo = (q || "").trim().slice(0, 120);
    const params: unknown[] = [identidade.officeId, identidade.officeId, identidade.id, identidade.papel];
    let filtro = "";
    if (termo) {
      filtro = " AND (d.title LIKE ? OR d.snippet LIKE ?)";
      const like = `%${escapeLike(termo)}%`;
      params.push(like, like);
    }
    params.push(40);

    const linhas = await this.consultar<
      RowDataPacket & { id: string; title: string; snippet: string; published_at: Date | string }
    >(
      `SELECT d.id, d.title, d.snippet, d.published_at
         FROM hardvault_docs d
         INNER JOIN hardvault_acl a ON a.doc_id = d.id AND a.office_id = d.office_id
        WHERE d.office_id = ?
          AND (
            (a.principal_type = 'office' AND a.principal_id = ?)
            OR (a.principal_type = 'user' AND a.principal_id = ?)
            OR (a.principal_type = 'role' AND a.principal_id = ?)
          )
          ${filtro}
        ORDER BY d.published_at DESC
        LIMIT ?`,
      params,
    );

    return {
      hits: linhas.map((l) => ({
        id: String(l.id),
        title: String(l.title),
        snippet: String(l.snippet),
        publishedAt: dataIso(l.published_at),
      })),
    };
  }

  async obterHardvault(
    identidade: IdentidadeRequisicao,
    docId: string,
    full: boolean,
  ) {
    const permitido = await this.podeLerHardvault(identidade, docId);
    if (!permitido) {
      throw new NotFoundException("Documento não encontrado no hardvault.");
    }
    const docs = await this.consultar<LinhaDoc>(
      `SELECT id, office_id, title, snippet, body_md, source_note_id,
              published_by, published_at, classification
         FROM hardvault_docs
        WHERE id = ? AND office_id = ? LIMIT 1`,
      [docId, identidade.officeId],
    );
    const doc = docs[0];
    if (!doc) {
      throw new NotFoundException("Documento não encontrado no hardvault.");
    }
    // Full body only for the publisher (office peers get snippet/pointer).
    const podeCorpo = full && doc.published_by === identidade.id;
    return {
      doc: {
        id: doc.id,
        title: doc.title,
        snippet: doc.snippet,
        publishedAt: dataIso(doc.published_at),
        classification: doc.classification,
        bodyMd: podeCorpo ? doc.body_md : undefined,
        full: Boolean(podeCorpo),
      },
    };
  }

  /** Minimal load pack: pointers + snippets only (never personal notes). */
  async loadPack(identidade: IdentidadeRequisicao, casoId?: string) {
    const busca = await this.buscarHardvault(identidade, "");
    const hits = busca.hits.slice(0, PACK_MAX);
    return {
      casoId: casoId || null,
      mode: "minimal" as const,
      items: hits.map((h) => ({
        id: h.id,
        title: h.title,
        snippet: h.snippet,
        publishedAt: h.publishedAt,
      })),
      requerSafeDto: true,
      aviso:
        "Pack contém só ponteiros/snippets do hardvault. Export MCP exige SafeDTO; nunca dump do vault pessoal.",
    };
  }

  private async notaDoDono(
    identidade: IdentidadeRequisicao,
    id: string,
  ): Promise<LinhaNota> {
    const linhas = await this.consultar<LinhaNota>(
      `SELECT id, office_id, owner_user_id, title, body_md, created_at, updated_at
         FROM vault_personal_notes
        WHERE id = ? AND office_id = ? LIMIT 1`,
      [id, identidade.officeId],
    );
    const nota = linhas[0];
    if (!nota) {
      throw new NotFoundException("Nota não encontrada.");
    }
    if (nota.owner_user_id !== identidade.id) {
      throw new ForbiddenException("Vault pessoal é deny-by-default.");
    }
    return nota;
  }

  private async podeLerHardvault(
    identidade: IdentidadeRequisicao,
    docId: string,
  ): Promise<boolean> {
    const rows = await this.consultar<RowDataPacket>(
      `SELECT 1 AS ok
         FROM hardvault_docs d
         INNER JOIN hardvault_acl a ON a.doc_id = d.id AND a.office_id = d.office_id
        WHERE d.id = ? AND d.office_id = ?
          AND (
            (a.principal_type = 'office' AND a.principal_id = ?)
            OR (a.principal_type = 'user' AND a.principal_id = ?)
            OR (a.principal_type = 'role' AND a.principal_id = ?)
          )
        LIMIT 1`,
      [docId, identidade.officeId, identidade.officeId, identidade.id, identidade.papel],
    );
    return rows.length > 0;
  }

  private async consultar<T extends RowDataPacket>(
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    try {
      return await this.db.consultar<T>(sql, params);
    } catch (erro) {
      if (tabelaAusente(erro)) {
        throw new ServiceUnavailableException(
          "Wiki vault ausente. Rode pnpm --dir server run wiki:apply.",
        );
      }
      throw erro;
    }
  }

  private async executar(sql: string, params: unknown[]): Promise<void> {
    try {
      await this.db.executar(sql, params);
    } catch (erro) {
      if (tabelaAusente(erro)) {
        throw new ServiceUnavailableException(
          "Wiki vault ausente. Rode pnpm --dir server run wiki:apply.",
        );
      }
      throw erro;
    }
  }
}

function resumoNota(l: LinhaNota) {
  return {
    id: l.id,
    title: l.title,
    updatedAt: dataIso(l.updated_at),
    createdAt: dataIso(l.created_at),
  };
}

function notaCompleta(l: LinhaNota) {
  return {
    ...resumoNota(l),
    bodyMd: l.body_md,
  };
}

function sanitizarTitulo(valor: string): string {
  const title = (valor || "").trim().slice(0, LIMITE_TITULO);
  if (!title) throw new BadRequestException("title é obrigatório.");
  return title;
}

function sanitizarBody(valor: string): string {
  if (typeof valor !== "string") {
    throw new BadRequestException("bodyMd é obrigatório.");
  }
  if (valor.length > LIMITE_BODY) {
    throw new BadRequestException(`bodyMd máximo ${LIMITE_BODY} caracteres.`);
  }
  return valor;
}

function montarSnippet(title: string, body: string): string {
  const texto = `${title} — ${body.replace(/\s+/g, " ").trim()}`;
  return texto.slice(0, LIMITE_SNIPPET);
}

function escapeLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function dataIso(valor: Date | string): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error("Data wiki inválida.");
  }
  return data.toISOString();
}

function tabelaAusente(erro: unknown): boolean {
  const db = erro as { code?: string; errno?: number };
  return db?.code === "ER_NO_SUCH_TABLE" || db?.errno === 1146;
}

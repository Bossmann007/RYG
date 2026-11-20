import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { CasosService } from "@modules/casos/casos.service";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { spawn } from "child_process";
import { randomBytes, randomUUID } from "crypto";
import { join } from "path";
import type { RowDataPacket } from "mysql2/promise";
import {
  DIGEST_EMBED_RAG,
  ligarVetorRag,
  montarConsultaRag,
  respostaConsultaRag,
  TAG_EMBED_RAG,
  type RespostaConsultaRag,
} from "./rag-query";

const OLLAMA_URL = "http://127.0.0.1:11434";
const LARGURA = 768;
const SNIPPET_MAX = 160;
const AVISO_CONSULTA = "Rascunho. Uma pessoa revisa antes de protocolar.";
const CHUNK_TIMEOUT_MS = 60_000;
// dist/modules/rag -> server
const RAIZ_SERVER = join(__dirname, "..", "..", "..");
const CHUNK_SCRIPT = join(RAIZ_SERVER, "scripts", "chunk_hybrid.py");

type LinhaRag = RowDataPacket & {
  doc_id: string;
  snippet: string;
  distance: number | string;
};

@Injectable()
export class RagService {
  constructor(
    private readonly db: DbService,
    private readonly casos: CasosService,
  ) {}

  async consultar(
    identidade: IdentidadeRequisicao,
    q: string,
    caseId?: string,
  ): Promise<RespostaConsultaRag> {
    const casoFiltrado =
      caseId != null && caseId.length > 0
        ? await this.casos.autorizarCapa(identidade, caseId)
        : undefined;
    const consulta = montarConsultaRag({
      officeId: identidade.officeId,
      userId: identidade.id,
      papel: identidade.papel,
      caseId: casoFiltrado,
    });
    const vetor = await embedir(q);
    const linhas = await this.db.consultar<LinhaRag>(consulta.sql, ligarVetorRag(consulta, vetor));
    const resposta = respostaConsultaRag(linhas);
    await this.registrarCitacoes(identidade, casoFiltrado ?? null, resposta);
    return resposta;
  }

  async consultarLocal(identidade: IdentidadeRequisicao, q: string, caseId?: string) {
    if (!consultaLocalLigada(identidade.officeId)) {
      throw new ForbiddenException("Consulta local desligada.");
    }
    const resposta = await this.consultar(identidade, q, caseId);
    if (resposta.citeStatus !== "cited" || resposta.hits.length === 0) {
      return {
        runtime: "office-hosted" as const,
        citeStatus: "silent" as const,
        hits: [],
        answer: null,
        generative: false,
        notice: AVISO_CONSULTA,
      };
    }
    const modelo = process.env.OLLAMA_CONSULT_MODEL?.trim() ?? "";
    if (!modelo) {
      return {
        runtime: "office-hosted" as const,
        citeStatus: "cited" as const,
        hits: resposta.hits,
        answer: resposta.hits.map((hit) => hit.snippet).join("\n"),
        generative: false,
        notice: AVISO_CONSULTA,
      };
    }
    const answer = await gerarRespostaLocal(modelo, resposta.hits.map((hit) => hit.snippet));
    return {
      runtime: "office-hosted" as const,
      citeStatus: "cited" as const,
      hits: resposta.hits,
      answer,
      generative: true,
      notice: AVISO_CONSULTA,
    };
  }

  private async registrarCitacoes(
    identidade: IdentidadeRequisicao,
    caseId: string | null,
    resposta: RespostaConsultaRag,
  ): Promise<void> {
    const releaseId = `rel_${randomBytes(6).toString("hex")}`;
    const fontes = resposta.hits.length > 0 ? resposta.hits.map((hit) => hit.docId) : [null];
    try {
      await this.db.transacao(async (connection) => {
        for (const sourceId of fontes) {
          await connection.query(
            `INSERT INTO rag_cites
               (id, office_id, user_id, case_id, release_id, source_id, cite_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID().replace(/-/g, ""),
              identidade.officeId,
              identidade.id,
              caseId,
              releaseId,
              sourceId,
              resposta.citeStatus,
            ],
          );
        }
      });
    } catch (erro) {
      recusarTabelaAusente(erro);
      throw erro;
    }
  }

  async ingerir(
    identidade: IdentidadeRequisicao,
    docId: string,
  ): Promise<{ docId: string; chunks: number }> {
    const officeId = identidade.officeId;
    const corpo = await this.carregarDocLegivel(officeId, identidade.id, docId);
    if (corpo.trim().length === 0) {
      throw new BadRequestException("Documento vazio.");
    }
    const pedacos = await fatiarCorpo(corpo);
    const vetores: string[] = [];
    for (const pedaco of pedacos) {
      vetores.push(await vetorOllama("title: none | text: " + pedaco));
    }
    await exigirDigestLocal();

    try {
      await this.db.transacao(async (connection) => {
        await connection.query("DELETE FROM rag_chunks WHERE office_id = ? AND doc_id = ?", [
          officeId,
          docId,
        ]);
        for (let i = 0; i < pedacos.length; i++) {
          await connection.query(
            `INSERT INTO rag_chunks
               (id, office_id, case_id, doc_id, snippet, embed_tag, embed_digest, embedding)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
            [
              randomUUID().replace(/-/g, ""),
              officeId,
              docId,
              pedacos[i].slice(0, SNIPPET_MAX),
              TAG_EMBED_RAG,
              DIGEST_EMBED_RAG,
              vetores[i],
            ],
          );
        }
      });
    } catch (erro) {
      recusarTabelaAusente(erro);
      throw erro;
    }
    return { docId, chunks: pedacos.length };
  }

  private async carregarDocLegivel(officeId: string, userId: string, docId: string): Promise<string> {
    let linhas: RowDataPacket[];
    try {
      linhas = await this.db.consultar<RowDataPacket>(
        `SELECT d.body AS body
           FROM hardvault_docs d
           INNER JOIN hardvault_acl a
             ON a.doc_id = d.id AND a.office_id = d.office_id
          WHERE d.office_id = ?
            AND d.id = ?
            AND a.permission = 'read'
            AND (
              (a.principal_type = 'office' AND a.principal_id = ?)
              OR (a.principal_type = 'user' AND a.principal_id = ?)
            )
          LIMIT 1`,
        [officeId, docId, officeId, userId],
      );
    } catch (erro) {
      recusarTabelaAusente(erro);
      throw erro;
    }
    if (!linhas.length) {
      throw new NotFoundException("Documento não encontrado.");
    }
    return String(linhas[0].body ?? "");
  }
}

function fatiarCorpo(corpo: string): Promise<string[]> {
  const python = process.env.RYG_CHUNK_PYTHON || join(RAIZ_SERVER, ".venv-chunk", "bin", "python");
  const indisponivel = () => new ServiceUnavailableException("Chunking indisponível.");
  return new Promise((resolve, reject) => {
    const filho = spawn(python, [CHUNK_SCRIPT], {
      stdio: ["pipe", "pipe", "ignore"],
      timeout: CHUNK_TIMEOUT_MS,
    });
    const partes: Buffer[] = [];
    filho.stdout.on("data", (parte: Buffer) => partes.push(parte));
    filho.on("error", () => reject(indisponivel()));
    filho.on("close", (codigo) => {
      if (codigo !== 0) {
        reject(indisponivel());
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(Buffer.concat(partes).toString("utf8"));
      } catch {
        reject(indisponivel());
        return;
      }
      if (!Array.isArray(json) || json.length === 0 || json.some((p) => typeof p !== "string" || p.length === 0)) {
        reject(indisponivel());
        return;
      }
      resolve(json as string[]);
    });
    filho.stdin.on("error", () => undefined);
    filho.stdin.end(corpo);
  });
}

function consultaLocalLigada(officeId: string): boolean {
  return (process.env.OFFICE_HOSTED_AI ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .includes(officeId);
}

async function gerarRespostaLocal(modelo: string, trechos: string[]): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch(OLLAMA_URL + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        stream: false,
        prompt: "Reescreva somente estes trechos. Não invente citação.\n" + trechos.join("\n"),
      }),
    });
  } catch {
    throw new ServiceUnavailableException("Consulta local indisponível.");
  }
  if (resposta.status !== 200) {
    await resposta.body?.cancel();
    throw new ServiceUnavailableException("Consulta local indisponível.");
  }
  const corpo = (await resposta.json()) as { response?: unknown };
  if (typeof corpo.response !== "string" || corpo.response.trim().length === 0) {
    throw new ServiceUnavailableException("Consulta local indisponível.");
  }
  return corpo.response;
}

function embedir(q: string): Promise<string> {
  return vetorOllama("task: search result | query: " + q);
}

async function vetorOllama(input: string): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch(OLLAMA_URL + "/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: TAG_EMBED_RAG, input, truncate: false }),
    });
  } catch {
    throw new ServiceUnavailableException("Embedding indisponível.");
  }
  if (resposta.status !== 200) {
    await resposta.body?.cancel();
    throw new ServiceUnavailableException("Embedding indisponível.");
  }
  let corpo: { embeddings?: unknown };
  try {
    corpo = (await resposta.json()) as { embeddings?: unknown };
  } catch {
    throw new ServiceUnavailableException("Embedding indisponível.");
  }
  const vetor = Array.isArray(corpo.embeddings) ? corpo.embeddings[0] : undefined;
  if (!Array.isArray(vetor) || vetor.length !== LARGURA || vetor.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    throw new ServiceUnavailableException("Embedding indisponível.");
  }
  return "[" + vetor.join(",") + "]";
}

async function exigirDigestLocal(): Promise<void> {
  let modelos: unknown;
  try {
    const resposta = await fetch(OLLAMA_URL + "/api/tags");
    if (resposta.status !== 200) {
      await resposta.body?.cancel();
      throw new Error("tags");
    }
    modelos = ((await resposta.json()) as { models?: unknown }).models;
  } catch {
    throw new ServiceUnavailableException("Embedding indisponível.");
  }
  const modelo = Array.isArray(modelos)
    ? (modelos as Array<{ name?: unknown; digest?: unknown }>).find((m) => m?.name === TAG_EMBED_RAG)
    : undefined;
  if (typeof modelo?.digest !== "string" || !modelo.digest.startsWith(DIGEST_EMBED_RAG)) {
    throw new ServiceUnavailableException("Modelo de embedding diverge do digest fixado.");
  }
}

function recusarTabelaAusente(erro: unknown): void {
  if (tabelaAusente(erro)) {
    throw new ServiceUnavailableException("Índice RAG indisponível. Operação recusada.");
  }
}

import {
  CASE_CLASSIFICATIONS,
  CLASSIFICATION_DEFAULT,
  clearanceOk,
  isCaseClassification,
} from "@common/security/case-classification";
import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { CasosService } from "@modules/casos/casos.service";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { AuditService } from "@modules/gateway/audit.service";
import { WikiService } from "@modules/wiki/wiki.service";
import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  RagChunk,
  RagCiteLedgerRow,
  RagCiteStatus,
  RagHit,
  RagRuntime,
} from "./rag-types";

const DEMO_OFFICE = "prado-advogados";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly chunks = new Map<string, RagChunk[]>();
  private readonly ledger: RagCiteLedgerRow[] = [];

  constructor(
    private readonly db: DbService,
    private readonly wiki: WikiService,
    private readonly casos: CasosService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    this.seedDemoCorpus();
  }

  officeHostedEnabled(): boolean {
    return String(this.config.get<string>("OFFICE_HOSTED_AI") || "")
      .trim()
      .toLowerCase() === "true";
  }

  async ingestHardvault(identidade: IdentidadeRequisicao): Promise<{ indexed: number }> {
    if (!this.db.configurado()) {
      return { indexed: this.chunks.get(identidade.officeId)?.length || 0 };
    }
    try {
      const linhas = await this.db.consultar<
        RowDataPacket & {
          id: string;
          title: string;
          snippet: string;
          classification: string;
          principal_type: string;
          principal_id: string;
        }
      >(
        `SELECT d.id, d.title, d.snippet, d.classification,
                a.principal_type, a.principal_id
           FROM hardvault_docs d
           INNER JOIN hardvault_acl a ON a.doc_id = d.id AND a.office_id = d.office_id
          WHERE d.office_id = ?`,
        [identidade.officeId],
      );
      const porDoc = new Map<string, RagChunk>();
      for (const row of linhas) {
        const classification = isCaseClassification(row.classification)
          ? row.classification
          : CLASSIFICATION_DEFAULT;
        const atual =
          porDoc.get(String(row.id)) ||
          ({
            sourceId: String(row.id),
            officeId: identidade.officeId,
            title: String(row.title),
            snippet: String(row.snippet || ""),
            classification,
            acl: [],
          } satisfies RagChunk);
        atual.acl.push({
          principalType: row.principal_type as RagChunk["acl"][number]["principalType"],
          principalId: String(row.principal_id),
        });
        porDoc.set(String(row.id), atual);
      }
      const lista = [...porDoc.values()];
      this.chunks.set(identidade.officeId, lista);
      return { indexed: lista.length };
    } catch (erro) {
      if (tabelaAusente(erro)) {
        this.logger.warn("hardvault ausente; mantendo corpus em memória");
        return { indexed: this.chunks.get(identidade.officeId)?.length || 0 };
      }
      throw erro;
    }
  }

  async query(
    identidade: IdentidadeRequisicao,
    input: { q: string; casoId?: string; runtime?: RagRuntime },
  ): Promise<{
    hits: RagHit[];
    silent: boolean;
    runtime: RagRuntime;
    ledgerIds: string[];
  }> {
    const runtime = this.resolverRuntime(input.runtime);
    const q = String(input.q || "").trim().slice(0, 200);
    if (!q) {
      return { hits: [], silent: true, runtime, ledgerIds: [] };
    }

    if (input.casoId) {
      await this.casos.obter(identidade, input.casoId);
    }

    let candidatos = [...(this.chunks.get(identidade.officeId) || [])];
    let liveAclJaAplicada = false;
    if (this.db.configurado()) {
      try {
        const live = await this.wiki.buscarHardvault(identidade, q);
        if (live.hits.length) {
          liveAclJaAplicada = true;
          candidatos = live.hits.map((h) => {
            const classification = isCaseClassification(h.classification)
              ? h.classification
              : "interno";
            return {
              sourceId: h.id,
              officeId: identidade.officeId,
              title: h.title,
              snippet: h.snippet,
              classification,
              acl: [
                { principalType: "office" as const, principalId: identidade.officeId },
              ],
            };
          });
        }
      } catch (erro) {
        if (!(erro instanceof ServiceUnavailableException)) {
          throw erro;
        }
      }
    }

    const termo = q.toLowerCase();
    const filtrados = candidatos.filter((c) => {
      if (!liveAclJaAplicada && !this.aclOk(identidade, c)) {
        return false;
      }
      if (!clearanceOk(c.classification, identidade.papel)) {
        return false;
      }
      if (liveAclJaAplicada) {
        return true;
      }
      const blob = `${c.title} ${c.snippet}`.toLowerCase();
      return blob.includes(termo);
    });

    const hits: RagHit[] = [];
    const ledgerIds: string[] = [];
    for (const c of filtrados.slice(0, 8)) {
      const citeStatus = citeStatusDoSnippet(c.snippet);
      if (citeStatus !== "ok") {
        continue;
      }
      hits.push({
        sourceId: c.sourceId,
        title: c.title,
        snippet: c.snippet.slice(0, 400),
        classification: c.classification,
        citeStatus,
      });
      const row = await this.registarCite(identidade, {
        sourceId: c.sourceId,
        casoId: input.casoId || null,
        citeStatus,
        queryText: q,
        runtime,
      });
      ledgerIds.push(row.id);
    }

    await this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "rag_query",
      argumentos: {
        qChars: q.length,
        hits: hits.length,
        runtime,
        casoId: input.casoId || "",
      },
      decisao: "permitido",
      motivo: hits.length ? "rag_hits" : "rag_silent",
      omitido: [],
      duracaoMs: 0,
    });

    return {
      hits,
      silent: hits.length === 0,
      runtime,
      ledgerIds,
    };
  }

  async consult(
    identidade: IdentidadeRequisicao,
    input: { q: string; casoId?: string; runtime?: RagRuntime },
  ) {
    const runtime = this.resolverRuntime(input.runtime);
    if (runtime === "office-hosted" && !this.officeHostedEnabled()) {
      throw new ForbiddenException(
        "Office-hosted AI desligado (OFFICE_HOSTED_AI≠true).",
      );
    }
    if (runtime === "none") {
      throw new ForbiddenException("Nenhum runtime de consult selecionado.");
    }
    const pack = await this.query(identidade, { ...input, runtime });
    return {
      mode: "consult" as const,
      runtime,
      notice:
        "Rascunhos de IA. Revisão humana obrigatória antes de protocolar ou enviar ao cliente.",
      mutationTools: [] as string[],
      ...pack,
    };
  }

  recentLedger(officeId: string, limit = 20): RagCiteLedgerRow[] {
    return this.ledger.filter((r) => r.officeId === officeId).slice(-limit).reverse();
  }

  private resolverRuntime(pedido?: RagRuntime): RagRuntime {
    if (pedido === "office-hosted" || pedido === "linked-provider" || pedido === "none") {
      return pedido;
    }
    return this.officeHostedEnabled() ? "office-hosted" : "linked-provider";
  }

  private aclOk(identidade: IdentidadeRequisicao, chunk: RagChunk): boolean {
    return chunk.acl.some(
      (a) =>
        (a.principalType === "office" && a.principalId === identidade.officeId) ||
        (a.principalType === "user" && a.principalId === identidade.id) ||
        (a.principalType === "role" && a.principalId === identidade.papel),
    );
  }

  private async registarCite(
    identidade: IdentidadeRequisicao,
    input: {
      sourceId: string;
      casoId: string | null;
      citeStatus: RagCiteStatus;
      queryText: string;
      runtime: RagRuntime;
    },
  ): Promise<RagCiteLedgerRow> {
    const row: RagCiteLedgerRow = {
      id: `cite_${randomBytes(8).toString("hex")}`,
      officeId: identidade.officeId,
      userId: identidade.id,
      casoId: input.casoId,
      sourceId: input.sourceId,
      releaseId: null,
      citeStatus: input.citeStatus,
      queryText: input.queryText.slice(0, 512),
      runtime: input.runtime,
      at: new Date().toISOString(),
    };
    this.ledger.push(row);
    if (this.db.configurado()) {
      try {
        await this.db.executar(
          `INSERT INTO rag_cite_ledger
            (id, office_id, user_id, caso_id, source_id, release_id, cite_status, query_text, runtime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.officeId,
            row.userId,
            row.casoId,
            row.sourceId,
            row.releaseId,
            row.citeStatus,
            row.queryText,
            row.runtime,
          ],
        );
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          throw erro;
        }
      }
    }
    return row;
  }

  private seedDemoCorpus() {
    const chunks: RagChunk[] = [
      {
        sourceId: "hv_demo_cdc",
        officeId: DEMO_OFFICE,
        title: "Tese CDC consumo bancário",
        snippet:
          "Ementa demo: contratos bancários de consumo submetem-se ao CDC quando a parte é destinatária final.",
        classification: "interno",
        acl: [{ principalType: "office", principalId: DEMO_OFFICE }],
      },
      {
        sourceId: "hv_demo_vazio",
        officeId: DEMO_OFFICE,
        title: "Nota sem ementa",
        snippet: "",
        classification: "interno",
        acl: [{ principalType: "office", principalId: DEMO_OFFICE }],
      },
      {
        sourceId: "hv_demo_sigiloso",
        officeId: DEMO_OFFICE,
        title: "Memorando sigiloso",
        snippet: "Conteúdo sigiloso de estratégia — só sócio.",
        classification: "sigiloso",
        acl: [{ principalType: "office", principalId: DEMO_OFFICE }],
      },
      {
        sourceId: "hv_other_office",
        officeId: "outro-escritorio",
        title: "Doc de outro office",
        snippet: "Não deve aparecer para prado-advogados.",
        classification: "publico",
        acl: [{ principalType: "office", principalId: "outro-escritorio" }],
      },
    ];
    for (const c of chunks) {
      const lista = this.chunks.get(c.officeId) || [];
      lista.push(c);
      this.chunks.set(c.officeId, lista);
    }
    void CASE_CLASSIFICATIONS;
  }
}

function citeStatusDoSnippet(snippet: string): RagCiteStatus {
  return String(snippet || "").trim().length >= 24 ? "ok" : "nao_citavel";
}

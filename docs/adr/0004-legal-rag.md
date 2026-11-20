# ADR 0004 — Legal RAG index

- **Status:** Accepted
- **Date:** 2026-10-10. Revised 2026-10-11 after the preflight. The status stayed Accepted.
- **Deciders:** Bossmann (product and privacy) accepted the store and the status on 2026-10-10. Zupelli (database) owns the later schema.
- **Plan:** Phase 6 Task 6.1 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 §4 requires a legal RAG index whenever a model answers from the acervo. The hub database stays the source of truth. The index is derived. The context packed for one model call is ephemeral. ACL applies at query time. Cite-or-silent applies. The index is not jurimetria, and it does not produce win rates. No model reads TiDB or the filesystem.

SafeDTO is the egress contract in ADR 0002. It is not the index.

The wiki already separates personal notes (`vault_personal_notes`) from published hardvault documents (`hardvault_docs`). Personal notes stay out of hardvault search until an explicit publish.

[`../plan/rag-options.md`](../plan/rag-options.md) compares vector stores. Its MVP line prefers Postgres with pgvector and row-level security, written for a layout where Postgres is the application database. This product's application database is TiDB, database `HubLegal`. The TiDB vector search docs show a `VECTOR` column. A `WHERE` before `ORDER BY` on the distance runs the filter first, and that shape does not use the vector index. A nearest-neighbor `LIMIT` with the `WHERE` after it is a post-filter, and a missing `WHERE` returns hits from the whole table. Vector search is a public preview, documented for Self-Managed v8.4.0 or later and for TiDB Cloud Starter. A throwaway probe on 2026-10-11 created `VECTOR(3)` in `HubLegal` on TiDB v8.5.3-serverless, ran `WHERE` before `VEC_COSINE_DISTANCE`, and dropped the table. The 2026-10-11 check is [`../plan/rag-preflight-2026-10.md`](../plan/rag-preflight-2026-10.md).

No retrieval route exists. There is no `POST /api/rag/query`.

## Decision

1. **The index is derived.** `HubLegal` remains the source of truth for cases, wiki rows, and ACL. A vector row is a copy that can be rebuilt. It never becomes the case record.
2. **Call context is ephemeral.** Nest packs allowed hits for one call and does not write that pack back as case truth. The model's reply stays untrusted text. Xirp may store run metadata under the existing rules. This ADR sets no retention period for replies or for the packed text.
3. **No model reads TiDB or the filesystem.** Retrieval is a Nest path. The model sees only the hits Nest already allowed.
4. **ACL is applied inside the query, not after a broad retrieve.** The same gates as a case read apply when a hit is tied to a case. Those gates are `office_id`, case membership, classification clearance, and the Chinese wall on `case_parties`. A miss is silent. The API does not fill a gap with a guess.
5. **The corpus is published hardvault documents the caller may read, plus official corpora the office allows.** Rows in `vault_personal_notes` are not indexed. A note enters the corpus only after the existing publish path creates a `hardvault_docs` row.
6. **The store is a `VECTOR` column in `HubLegal`.** The query puts the ACL `WHERE` before `ORDER BY VEC_COSINE_DISTANCE`. The vector index is not used on that shape. That scan cost is accepted. The post-filter shape, nearest neighbors first and `WHERE` after, is rejected. TiDB does not enforce the ACL when the `WHERE` is missing, so the query is built in one place and refuses to run without it. Task 6.2 starts by creating one `VECTOR` column on the live `HubLegal` cluster. If that statement fails, the migration stops.
7. **A retrieval framework is not the permission boundary.** LlamaIndex, LangChain, and Haystack may be glue later. They do not decide who may see a chunk. LangChain SelfQuery is out, because the model can widen the filter.
8. **Private hits leave the trust zone only as SafeDTO.** That rule is ADR 0002. Office-hosted retrieval still applies classification and ACL. This ADR does not turn a provider on. Production use of an external model still waits on the signed DPA from ADR 0003.
9. **Accepted does not add a route, a table, an ingest job, or an embedding service.** Task 6.2 is the build that follows. It stays unbuilt until that slice starts.
10. **Embeddings run on Ollama at `127.0.0.1`, tag `embeddinggemma:300m`, digest `85462619ee72`.** That tag is the 300M model with a 2K context. The column is `VECTOR(768)`, the width on the Google EmbeddingGemma model card. The request does not pass `dimensions`. Each vector row stores that tag. A different model is a rebuild, not an insert into the same rows. Nest sends the Google retrieval prefixes, `task: search result | query:` for a question and `title: none | text:` for a chunk, and uses the same prefixes at ingest and at query. Ingest sets `truncate` to false, so an oversized chunk fails. The process stays on localhost, with `OLLAMA_NO_CLOUD=1`. Ollama has no authentication. A second embed server waits until a measured ingest batch is slow.
11. **Chunks follow Docling `HybridChunker` with the EmbeddingGemma tokenizer and `max_tokens` 512.** 512 is a product cap inside the 2K window. Docling's own default tokenizer is MiniLM at 256, so the default must not be left in place. There is no overlap. Docling `do_ocr` is off. A page with no text layer goes through OCRmyPDF `--mode skip` and Tesseract `por+eng`, then Docling. A signed PDF is copied first. The signed file stays the record. Cloud OCR and Marker stay out.
12. **`POST /api/rag/query` is retrieval only.** The body is `q` plus an optional `caseId`. `q` is required and holds 1 to 500 characters. A present `caseId` uses the same case gate as a capa read. The response is `citeStatus` of `cited` or `silent`, and at most 8 hits. Each hit carries `docId`, a snippet of at most 160 characters, and `distance` from `VEC_COSINE_DISTANCE`. `cited` requires a citable hit. No allowed hit returns `silent` and an empty list. This route does not call a generative model.

## Alternatives rejected

- **Retrieve a wide set and filter in the application.** A forgotten filter leaks the corpus.
- **Treat SafeDTO or the wiki search as the RAG index.** SafeDTO is egress. Wiki search returns pointers and a short snippet. Neither is a vector index.
- **Let the model query `HubLegal` or the filesystem.** That breaks ADR 0001 §4 and ADR 0002.
- **Index personal notes by default.** Publish is the only path into `hardvault_docs`.
- **Lock Postgres plus pgvector now.** That choice assumes Postgres is the application database. It is not.
- **Use Qdrant as the default.** A query that omits the payload filter returns the whole collection.
- **Use a framework's default retriever as the ACL.** The filter is optional in those libraries.

## Consequences

- No code change follows from this file.
- The accepted query filters with `WHERE` before the distance `ORDER BY`. Cite-or-silent tests stay in Task 6.2.
- Bossmann accepted this ADR on 2026-10-10, including the unused vector index. The same day closed the embed model, the chunk cap, and the query body for speed and for the recommended local path.
- Nothing here is a legal-compliance claim. The office and the DPO judge that.

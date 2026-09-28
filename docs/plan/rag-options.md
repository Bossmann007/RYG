# FASE 1 — RAG / vector / local inference (ACL before or during retrieval)

Constraint: never retrieve then filter in app. External LLM gets sanitized hits only. Sources are official docs / GitHub LICENSE unless noted.

**MVP pick:** Postgres + **pgvector** + **RLS** for ACL that still holds if the app forgets a filter. Add **Qdrant** later if filtered-ANN recall/perf hurts. **Ollama** for local LLM+embed. **Docling** + **OCRmyPDF**. Do **not** let LlamaIndex/LangChain/Haystack be the permission boundary.

---

## 1. Vector DBs (document-level ACL filters)

### Qdrant — **SIM** (best dedicated filter engine; extra service)
- **GitHub:** https://github.com/qdrant/qdrant — **Apache-2.0**
- **Docs:** https://qdrant.tech/documentation/search/filtering/ · https://qdrant.tech/documentation/manage-data/indexing/ · https://qdrant.tech/documentation/security/
- **Função:** Vector search with payload `must`/`should`/`must_not` **during** search. Keyword/int/bool/datetime/geo/text/uuid payload indexes. Nested + array/`match any` — good for `allowed_group_ids`.
- **Self-hosted / Local / Third-party:** Yes / Yes (Docker) / Cloud optional
- **Forte:** Filter-at-query + payload indexes; JWT RBAC per **collection**; `with_payload` include/exclude before leaving DB.
- **Risco:** JWT is collection-level, not row-level. `value_exists` = token revoke, **not** auto ACL filter. App must attach ACL filter on **every** query. Unindexed filters slow / rejected in strict mode.

### pgvector — **SIM** (best MVP if Postgres already exists)
- **GitHub:** https://github.com/pgvector/pgvector — **PostgreSQL License**
- **Docs:** https://github.com/pgvector/pgvector#filtering · https://www.postgresql.org/docs/current/ddl-rowsecurity.html · https://www.postgresql.org/about/news/pgvector-080-released-2952/
- **Função:** `ORDER BY embedding <=> $q` + SQL `WHERE` / JSONB / arrays. RLS (`CREATE POLICY`) hides unauthorized rows on `SELECT`.
- **Self-hosted / Local / Third-party:** Yes / Yes / any hosted Postgres
- **Forte:** Engine-enforced ACL via RLS even if app omits `WHERE`. Same DB as cases/users. Exact SQL ACL (`allowed_groups && $user_groups`).
- **Risco:** HNSW/IVFFlat apply `WHERE` **after** ANN scan (recall drop). Fix: `hnsw.iterative_scan` (0.8+), B-tree on ACL cols, partial indexes, or exact scan. Superuser/bypass-RLS roles leak.

### Weaviate — **TALVEZ** (strong isolation, heavier + dual license)
- **GitHub:** https://github.com/weaviate/weaviate — **BSD-3-Clause** core; `wl/` under Weaviate License (`WEAVIATE_LICENSE` flag) — https://github.com/weaviate/weaviate/blob/main/LICENSE
- **Docs:** https://docs.weaviate.io/weaviate/concepts/filtering · https://docs.weaviate.io/weaviate/manage-collections/multi-tenancy · https://docs.weaviate.io/weaviate/configuration/rbac
- **Função:** Official **pre-filtering** (ACORN default ≥1.34). Multi-tenancy = per-tenant shards. RBAC collection/tenant.
- **Self-hosted / Local / Third-party:** Yes / Yes / Weaviate Cloud
- **Forte:** Tenant shard isolation + pre-filter. Best if tenant = firm/practice area with hard isolation.
- **Risco:** Dual license. Document ACL ≠ tenant (many docs × overlapping groups). Filters ≠ RBAC. Overkill for Compose MVP.

### Milvus — **NÃO** (MVP) / **TALVEZ** (later scale)
- **GitHub:** https://github.com/milvus-io/milvus — **Apache-2.0**
- **Docs:** https://milvus.io/docs/filtered-search.md · https://milvus.io/docs/rbac.md
- **Função:** Official: metadata filter **before** ANN. RBAC instance/db/collection. Docker needs etcd/minio/etc.
- **Self-hosted / Local / Third-party:** Yes / Lite exists / Zilliz Cloud
- **Forte:** Pre-filter at scale.
- **Risco:** Ops weight. RBAC not document-level. RLS only in recent PRs — do not treat as shipped.

### Chroma — **NÃO** (dev only)
- **GitHub:** https://github.com/chroma-core/chroma — **Apache-2.0**
- **Docs:** https://docs.trychroma.com/docs/querying-collections/metadata-filtering · https://docs.trychroma.com/docs/overview/introduction
- **Função:** `where` / `$in` / `$contains` on metadata at query time.
- **Self-hosted / Local / Third-party:** Yes / Yes (embedded) / Chroma Cloud
- **Forte:** Fast prototype.
- **Risco:** No engine ACL/JWT/RLS. Easy to query without `where`. Weak for law-firm ACL.

**Best for document-level ACL filters:** Qdrant (filter DSL + array match + indexes). **Best “cannot forget ACL”:** pgvector + Postgres RLS.

---

## 2. RAG frameworks (over-permission risk)

### LlamaIndex — **TALVEZ** (orchestration only)
- **GitHub:** https://github.com/run-llama/llama_index — **MIT**
- **Docs:** https://developers.llamaindex.ai/python/framework-api-reference/storage/vector_store/
- **Função:** `MetadataFilters` on `as_retriever` / `as_query_engine`. Backend-dependent; default in-memory store historically **does not** support filters (community: https://github.com/run-llama/llama_index/discussions/11285).
- **Self-hosted / Local / Third-party:** Yes / Yes / LlamaCloud, LlamaParse = third-party
- **Forte:** Filter types exist if vector store supports them.
- **Risco:** Filter optional. Extra retrievers (hybrid, rerank, agents, chat memory) can skip filters. Weaviate native multi-tenancy not first-class (https://github.com/run-llama/llama_index/discussions/19607). Cloud parsers send documents out.

### LangChain — **TALVEZ** (thin wrapper) / **NÃO** (SelfQuery / default chains)
- **GitHub:** https://github.com/langchain-ai/langchain — **MIT**
- **Docs:** https://docs.langchain.com/oss/python/integrations/vectorstores · https://reference.langchain.com/python/langchain-core/vectorstores/base/VectorStore/as_retriever · https://reference.langchain.com/python/langchain-classic/retrievers/self_query/base/SelfQueryRetriever/from_llm
- **Função:** `search_kwargs={"filter": ...}` passed to store. Support varies by integration.
- **Self-hosted / Local / Third-party:** Yes / Yes / LangSmith + many default cloud LLMs
- **Forte:** Huge store coverage.
- **Risco:** Filter not required. `as_retriever()` without filter = full corpus. `SelfQueryRetriever` lets an **LLM invent filters** — user can talk their way into broader access. Dynamic per-user filter not built into `invoke` (https://github.com/langchain-ai/langchain/issues/15590).

### Haystack — **TALVEZ** (explicit pipelines)
- **GitHub:** https://github.com/deepset-ai/haystack — **Apache-2.0**
- **Docs:** https://docs.haystack.deepset.ai/docs/metadata-filtering · https://docs.haystack.deepset.ai/docs/filterretriever
- **Função:** Filters on Retriever or `Pipeline.run()`. Store `filter_documents` if integration supports it.
- **Self-hosted / Local / Third-party:** Yes / Yes / deepset Cloud
- **Forte:** Filters are a first-class pipeline input.
- **Risco:** Omit `filters` → unrestricted retrieve. `FilterRetriever` with no filters returns **all** matching docs and can flood the generator.

**Rule:** Own a retriever that **always** injects server-side ACL. Frameworks are optional glue, never the ACL layer.

---

## 3. Local embeddings + local LLM

### Ollama — **SIM** (MVP)
- **GitHub:** https://github.com/ollama/ollama — **MIT** — https://github.com/ollama/ollama/blob/main/LICENSE
- **Docs:** https://docs.ollama.com/api/embed · https://ollama.com · image `ollama/ollama`
- **Função:** Local chat + `POST /api/embed`. Official Docker. CPU and GPU.
- **Self-hosted / Local / Third-party:** Yes / Yes / model pull from public registry
- **Forte:** One process for LLM + embeddings. Compose-friendly.
- **Risco:** **No auth** by default. Bind `127.0.0.1`. `pull` can leave the network. Throughput below vLLM.

### vLLM — **TALVEZ** (after GPU throughput needed)
- **GitHub:** https://github.com/vllm-project/vllm — **Apache-2.0**
- **Docs:** https://docs.vllm.ai/ · https://docs.vllm.ai/en/stable/deployment/docker/ — image `vllm/vllm-openai`
- **Função:** High-throughput OpenAI-compatible serving (PagedAttention). GPU-first.
- **Self-hosted / Local / Third-party:** Yes / Yes (needs GPU) / HF Hub / gated models (`HF_TOKEN`)
- **Forte:** Concurrent RAG generation.
- **Risco:** Heavy image, CUDA, ops. Gated weights. Not the easiest Compose MVP. Still no ACL (stateless infer).

### llama.cpp — **TALVEZ** (CPU / air-gap / GGUF)
- **GitHub:** https://github.com/ggml-org/llama.cpp — **MIT**
- **Função:** `llama serve` OpenAI-compatible; embeddings with pooling ≠ `none`.
- **Self-hosted / Local / Third-party:** Yes / Yes / optional HF GGUF
- **Forte:** Smallest air-gap footprint. CPU-capable.
- **Risco:** You assemble serving, batching, auth. Ollama already wraps this path for MVP.

### Hugging Face TEI — **SIM** (dedicated embeddings; pair with Ollama or vLLM)
- **GitHub:** https://github.com/huggingface/text-embeddings-inference — **Apache-2.0**
- **Docs:** https://huggingface.co/docs/text-embeddings-inference/en/quick_tour · air-gap volume mount documented
- **Função:** Fast embed + rerank + classification. Official GHCR images, OpenAI `/v1/embeddings`.
- **Self-hosted / Local / Third-party:** Yes / Yes / Hub unless weights pre-copied
- **Forte:** Best local embed/rerank server. Air-gap recipe exists.
- **Risco:** Extra service. Image must match GPU arch. Gated models need token.

---

## 4. Self-hosted search (complement, not replacement)

### Typesense — **SIM** (keyword + scoped keys)
- **GitHub:** https://github.com/typesense/typesense — **GPL-3.0** server (clients Apache; not AGPL)
- **Docs:** https://typesense.org/docs/29.0/api/api-keys.html · https://typesense.org/docs/guide/data-access-control.md
- **Função:** `filter_by` **embedded in scoped search keys**; client cannot override. Array `accessible_to_user_ids:=1`.
- **Self-hosted / Local / Third-party:** Yes / Yes / Typesense Cloud
- **Forte:** ACL **during** search at the engine. Best keyword complement for doc ACL.
- **Risco:** GPL on the server. Parent search key must never hit the browser.

### Meilisearch — **TALVEZ**
- **GitHub:** https://github.com/meilisearch/meilisearch — **MIT** CE; EE **BUSL-1.1** (sharding)
- **Docs:** https://www.meilisearch.com/docs/capabilities/security/advanced/tenant_token_payload · https://www.meilisearch.com/docs/resources/self_hosting/enterprise_edition
- **Função:** Tenant-token JWT with `searchRules.filter` applied on every search.
- **Self-hosted / Local / Third-party:** Yes (CE) / Yes / Cloud / EE not free in prod
- **Forte:** Same “filter baked into token” model as Typesense.
- **Risco:** Invalid filters fail at search time. EE license trap. Semantic extras may need extra config.

### OpenSearch — **TALVEZ** (later; heaviest, strongest DLS)
- **GitHub:** https://github.com/opensearch-project/OpenSearch — **Apache-2.0** (https://opensearch.org/faq/)
- **Docs:** https://docs.opensearch.org/latest/security/access-control/document-level-security/ · https://github.com/opensearch-project/security
- **Função:** Security plugin DLS: role query applied on search/get. Keyword + k-NN hybrid in one engine.
- **Self-hosted / Local / Third-party:** Yes / Yes / AWS/Oracle managed
- **Forte:** True document-level security at the engine. Hybrid search.
- **Risco:** JVM cluster. DLS does **not** restrict writes. Easy to misconfigure roles. Overkill vs Typesense for MVP.

---

## 5. Legal PDF / OCR (local only)

### Docling — **SIM**
- **GitHub:** https://github.com/docling-project/docling — **MIT** (models: check each card; Granite-Docling often Apache-2.0)
- **Docs:** https://docling-project.github.io/docling
- **Função:** Local PDF/DOCX layout, tables, reading order → Markdown/JSON. Pluggable OCR (Tesseract, RapidOCR, EasyOCR).
- **Self-hosted / Local / Third-party:** Yes / Yes / no
- **Forte:** Best OSS legal-PDF structure for RAG chunks.
- **Risco:** GPU helps; scanned Portuguese/legal fonts need OCR packs. VLM extras = more weights.

### OCRmyPDF — **SIM** (scanned PDF/A)
- **GitHub:** https://github.com/ocrmypdf/OCRmyPDF — **MPL-2.0**
- **Função:** Invisible text layer via Tesseract; keeps original pages. Privacy-first local.
- **Self-hosted / Local / Third-party:** Yes / Yes / no
- **Forte:** Archive-grade searchable PDF before chunking.
- **Risco:** Weak copyleft on modified OCRmyPDF files. Needs Ghostscript + Tesseract.

### Tesseract — **SIM** (OCR engine)
- **GitHub:** https://github.com/tesseract-ocr/tesseract — **Apache-2.0**
- **Função:** Offline OCR, 100+ langs (`por` + `eng` for BR legal).
- **Self-hosted / Local / Third-party:** Yes / Yes / no
- **Forte:** No data leaves the box.
- **Risco:** Weak on complex tables/multi-column vs Docling+layout.

### Apache Tika — **TALVEZ**
- **GitHub:** https://github.com/apache/tika — **Apache-2.0**
- **Função:** Text/metadata from PDF/DOCX/MSG/EML. Optional Tesseract.
- **Forte:** Heterogeneous legal mail/attachments.
- **Risco:** Not layout-aware. Java service.

### Unstructured — **TALVEZ**
- **GitHub:** https://github.com/Unstructured-IO/unstructured — advertised Apache-2.0; **re-read LICENSE before prod** (file not at repo root in this pass)
- **Função:** Multi-format partition (`hi_res` layout).
- **Risco:** SaaS “Platform” is third-party. `hi_res` pulls heavy deps. Prefer local-only install.

### Marker — **NÃO** (firm commercial use until counsel reads weights)
- **GitHub:** https://github.com/VikParuchuri/marker — code often Apache-2.0; **Surya weights modified OpenRAIL-M** (revenue/funding caps in project docs)
- **Risco:** Weight license ≠ code license. Not safe default for a law firm.

**Avoid:** LlamaParse / cloud OCR / Unstructured SaaS — documents leave the network.

---

## Qdrant vs pgvector (MVP Docker Compose, Postgres likely)

| | **pgvector** | **Qdrant** |
|---|---|---|
| Compose | Extension on existing Postgres | Extra `qdrant/qdrant` volume |
| ACL during retrieve | `WHERE` + **RLS** (engine hides rows) | Payload `filter` on every search |
| Forget-filter failure | RLS still blocks (if role is not bypass) | **Full collection leak** |
| Group ACL | `int[]` / JSONB + GIN | Payload array + `match any` + keyword index |
| Filtered ANN | After HNSW scan; need iterative scan 0.8+ | Combined filterable index (design intent) |
| JWT/RBAC | Postgres roles + RLS | Collection JWT, not row ACL |
| Hybrid keyword | Need Typesense/OpenSearch/`tsvector` | Payload text index (not a full search engine) |
| **MVP** | **Prefer** | Add when filtered recall/latency hurts |

**Recommendation:** pgvector + RLS + ACL columns on chunks. Same transaction as matter/client tables. Index ACL columns. Enable `hnsw.iterative_scan`. Promote to Qdrant if selective group filters starve HNSW.

---

## Ollama vs vLLM (MVP local)

| | **Ollama** | **vLLM** |
|---|---|---|
| License | MIT | Apache-2.0 |
| Compose | One image, CPU or GPU | GPU + CUDA image |
| Embeddings | `/api/embed` in-process | Separate TEI/llama.cpp usually |
| Throughput | Fine for single-firm MVP | Needed for many concurrent chats |
| Auth | None; bind localhost | None; put behind proxy |
| Models | Easy `pull` (network) | HF cache / air-gap volume |
| **MVP** | **Prefer** | Later, dedicated GPU box |

**Recommendation:** Ollama for chat + first embeddings. Add **TEI** if embed latency/batch matters. Switch generation to vLLM when GPU and concurrency exist. Never send raw chunks to a hosted LLM; sanitize (strip names/ids as policy requires) only after ACL-filtered retrieve.

---

## Suggested FASE 2 stack (no code this phase)

```
Docs → OCRmyPDF/Tesseract → Docling
     → Postgres (matters, users, ACL) + pgvector (chunks, RLS)
     → Typesense (keyword; scoped keys)     [optional]
     → Ollama (LLM) + optional TEI (embed/rerank)
     → Thin API: ALWAYS inject ACL at query; sanitize context; then LLM
```

**Do not:** LangChain SelfQuery, retrieve-then-filter, LlamaParse, Chroma as ACL store, expose Ollama/Qdrant/Typesense parent keys.

---

### Primary URL index
- Qdrant filter/index/security: https://qdrant.tech/documentation/search/filtering/ · https://qdrant.tech/documentation/manage-data/indexing/ · https://qdrant.tech/documentation/security/
- pgvector: https://github.com/pgvector/pgvector · PG RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Weaviate: https://docs.weaviate.io/weaviate/concepts/filtering · https://docs.weaviate.io/weaviate/configuration/rbac
- Milvus: https://milvus.io/docs/filtered-search.md · https://milvus.io/docs/rbac.md
- Chroma: https://docs.trychroma.com/docs/querying-collections/metadata-filtering
- LlamaIndex filters: https://developers.llamaindex.ai/python/framework-api-reference/storage/vector_store/
- LangChain filter: https://docs.langchain.com/oss/python/integrations/vectorstores
- Haystack: https://docs.haystack.deepset.ai/docs/metadata-filtering
- Ollama embed: https://docs.ollama.com/api/embed
- vLLM Docker: https://docs.vllm.ai/en/stable/deployment/docker/
- TEI: https://huggingface.co/docs/text-embeddings-inference/en/quick_tour
- Typesense keys: https://typesense.org/docs/29.0/api/api-keys.html
- Meilisearch tokens: https://www.meilisearch.com/docs/capabilities/security/advanced/tenant_token_payload
- OpenSearch DLS: https://docs.opensearch.org/latest/security/access-control/document-level-security/
- Docling: https://github.com/docling-project/docling
- OCRmyPDF: https://github.com/ocrmypdf/OCRmyPDF
- Tesseract: https://github.com/tesseract-ocr/tesseract
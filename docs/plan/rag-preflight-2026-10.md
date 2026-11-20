# RAG preflight for Task 6.2

- **Date:** 2026-10-11
- **Follow-up:** ADR 0004 was revised the same day. The tag is pinned, the distance function is named, Docling overlap is not used, and the plan test says the query refuses to run when the ACL predicate is missing. The verdicts below are the record of the check, not the current ADR text.
- **Scope:** Checks the locked choices in [ADR 0004](../adr/0004-legal-rag.md) (decisions 6, 10, 11, 12) against the official sources that own each fact. [`rag-options.md`](rag-options.md) is the prior options note and is not cited as a source here.
- **Method:** Each factual sentence ends with the URL that was opened on 2026-10-11. Where a page could not be opened, this note says so and states no fact from it.
- **Not covered:** This note makes no legal-compliance claim. The office and the DPO judge that.

Pages that could not be opened: `https://docs.pingcap.com/tidb/stable/vector-search-index/`, `https://docs.pingcap.com/tidb/dev/vector-search-index/`, `https://docs.pingcap.com/tidbcloud/vector-search-index/`, and `https://docs.pingcap.com/tidbcloud/vector-search-overview/` all returned HTTP 500. The same PingCAP content was read under `https://docs.pingcap.com/ai/`. `https://docling-project.github.io/docling/examples/hybrid_chunking/` returned HTTP 404, so Docling defaults were read from the Docling concept page and the Docling source on GitHub.

## 1. TiDB store (ADR decision 6)

**Verdict: HOLD**, with one pre-build check on the cluster tier.

What the docs say about the filtered shape:

- PingCAP states that a query with a pre-filter `WHERE` cannot use the vector index, because under SQL semantics it is not a K-nearest-neighbor query over the table. https://docs.pingcap.com/ai/vector-search-index/
- PingCAP's suggested alternative runs the KNN subquery first and filters afterwards, and it notes that this query might return fewer than `LIMIT` rows when some are filtered out. https://docs.pingcap.com/ai/vector-search-index/
- The code comment on that post-filter example on the same page also says the vector index "cannot be used", which contradicts the sentence introducing it; the page is inconsistent on this point, and ADR 0004 rejects that shape regardless. https://docs.pingcap.com/ai/vector-search-index/
- The index page lists the index restrictions and the `ORDER BY ... LIMIT` usage rule and documents no hint, iterative scan, or filtered ANN mode. https://docs.pingcap.com/ai/vector-search-index/
- The performance page recommends adding the index, waiting for the index build, reducing dimensions, excluding vector columns from `SELECT`, and warming the index; it describes no filtered ANN option either. https://docs.pingcap.com/ai/vector-search-improve-performance/
- No PingCAP page opened for this note documents filtered ANN. That is an absence in the opened pages, not proof that no such feature exists anywhere.

What the pre-filter costs:

- Without the index, TiDB finds the top K by computing the distance between the query vector and every stored vector, which is accurate but involves a full table scan. https://docs.pingcap.com/ai/vector-search-index/
- With the index, TiDB runs approximate KNN with a slight loss of accuracy, generally keeping recall above 90%. https://docs.pingcap.com/ai/vector-search-index/
- The ADR's shape therefore gives exact results over the rows that pass the ACL `WHERE`, at the cost of computing distance for every such row. This note has no measured latency for `HubLegal` and states none.
- Because the accepted shape does not use the index, the index-only requirements (TiFlash nodes, a TiFlash replica, a fixed-dimension column for the index) apply only if a later slice adds an index. https://docs.pingcap.com/ai/vector-search-index/

Row-level security:

- TiDB documents privileges at global, database, table, and (from v8.5.6) column level, stored in `mysql.user`, `mysql.db`, `mysql.tables_priv`, and `mysql.columns_priv`. https://docs.pingcap.com/tidb/stable/privilege-management/
- That page describes no row-level policy mechanism, and the MySQL compatibility page lists no row-level security feature. https://docs.pingcap.com/tidb/stable/privilege-management/ https://docs.pingcap.com/tidb/stable/mysql-compatibility/
- So the ACL lives in the Nest-built `WHERE`, as ADR decision 4 already says. A missing `WHERE` is not caught by the engine, which is why the Task 6.2 cite-or-silent tests must include a "no ACL predicate, no query" case.

Distance functions:

- TiDB provides `VEC_L2_DISTANCE`, `VEC_COSINE_DISTANCE`, `VEC_NEGATIVE_INNER_PRODUCT`, and `VEC_L1_DISTANCE`; only L2 and cosine are supported by the vector index. https://docs.pingcap.com/ai/vector-search-functions-and-operators/
- ADR 0004 names no distance function. Cosine is the choice that keeps a later index possible; that is a recommendation, not a sourced requirement.

Availability:

- The vector search pages state that the feature is in public preview and might change without notice. https://docs.pingcap.com/ai/vector-search-overview/
- The same pages state that vector data types and vector search are available on TiDB Self-Managed (v8.4.0 or later, v8.5.0 recommended) and on TiDB Cloud Starter. https://docs.pingcap.com/ai/vector-search-data-types/
- A vector holds at most 16383 dimensions, cannot store `NaN` or infinities, stores single-precision floats, and cannot be a primary key, unique index, or partition key. https://docs.pingcap.com/ai/vector-search-limitations/
- A `VECTOR(D)` column rejects a vector with a different dimension with an error. https://docs.pingcap.com/ai/vector-search-data-types/
- The repo records only a `*.tidbcloud.com` host placeholder (`server/.env.example`) and does not record which TiDB Cloud tier runs `HubLegal`. This note did not verify the tier.

Pre-build check: confirm that the `HubLegal` cluster is TiDB Cloud Starter or Self-Managed v8.4.0 or later, and run one `CREATE TABLE ... VECTOR(n)` on it, before Task 6.2 migrations. ADR 0004 should also say that the feature is public preview.

## 2. Embeddings (ADR decision 10)

**Verdict: REVISE.** The width and the model under the `embeddinggemma` name hold. The ADR's reason for picking it no longer holds, and the tag is not pinned.

Which model `embeddinggemma` is:

- The Ollama library card describes `embeddinggemma` as a 300M parameter embedding model from Google, built from Gemma 3, and requires Ollama v0.11.10 or later. https://ollama.com/library/embeddinggemma
- The tags page lists `embeddinggemma:latest`, `:300m`, and `:300m-bf16` at 622MB with a 2K context window and the same digest `85462619ee72`, plus `:300m-qat-q4_0` and `:300m-qat-q8_0`, all published about a year ago. https://ollama.com/library/embeddinggemma/tags
- So `ollama pull embeddinggemma` still resolves to EmbeddingGemma 1 (300M, 2K). The tag has not moved.
- EmbeddingGemma 2 is published in Ollama under a separate name, `embeddinggemma-2`, with sizes 270m to 740m. https://ollama.com/library/embeddinggemma-2
- The Ollama embedding category now lists `embeddinggemma-2` first, and `embeddinggemma` appears seventh. https://ollama.com/search?c=embedding
- ADR decision 10 says `embeddinggemma` "is the first model on the Ollama embeddings list"; that sentence is no longer true. https://ollama.com/search?c=embedding

Vector width:

- The Ollama `embeddinggemma` card does not state an output width. https://ollama.com/library/embeddinggemma
- Google's EmbeddingGemma model card states an output embedding dimension of 768, with 512, 256, or 128 available by Matryoshka truncation followed by re-normalization, and a maximum input context of 2K. https://ai.google.dev/gemma/docs/embeddinggemma/model_card
- Google's EmbeddingGemma overview, now led by EmbeddingGemma 2, describes EmbeddingGemma 1 as a 308M multilingual text model with a 2K token context and output dimensions from 768 down to 128. https://ai.google.dev/gemma/docs/embeddinggemma
- `VECTOR(768)` is therefore correct for EmbeddingGemma 1 at its full width, on the authority of the Google model card, not the Ollama card.

Why pinning matters:

- EmbeddingGemma 2 also outputs a native 768-dimensional vector. https://ollama.com/library/embeddinggemma-2 https://ai.google.dev/gemma/docs/embeddinggemma
- TiDB checks only the dimension count of a `VECTOR(768)` insert. https://docs.pingcap.com/ai/vector-search-data-types/
- If the tag or the configured model name ever changes to a different 768-wide model, inserts still succeed and the column silently mixes two vector spaces. Distances between them have no meaning. Nothing in TiDB or Ollama raises an error in that case. This is an inference from the two facts above, not a documented warning.

The `dimensions` option:

- Ollama's `/api/embed` accepts an optional integer `dimensions`, and the documented example sends `"model": "embeddinggemma"` with `"dimensions": 128`. https://docs.ollama.com/api/embed
- So the option does apply to this model. ADR decision 10's rule of not passing it keeps the full 768 width, which matches the column.

Other request behavior that Task 6.2 must handle:

- `/api/embed` has `truncate` defaulting to `true`, which truncates inputs longer than the context window; with `false` it returns an error. https://docs.ollama.com/api/embed
- Google's model card recommends prompt prefixes, `task: search result | query: ` for queries and `title: {title | "none"} | text: ` for documents. https://ai.google.dev/gemma/docs/embeddinggemma/model_card
- The Ollama embed page does not say whether Ollama adds those prefixes. https://docs.ollama.com/api/embed This note treats that as unverified; Task 6.2 should add the prefixes in Nest and keep them identical between ingest and query.

Auth and network:

- The Ollama OpenAPI spec for `/api/embed` declares `security: []`, meaning no authentication. https://docs.ollama.com/api/embed
- Ollama binds `127.0.0.1` port 11434 by default, and `OLLAMA_HOST` changes the bind address. https://docs.ollama.com/faq
- Ollama pulls models from the internet, and its cloud features can be turned off with `OLLAMA_NO_CLOUD=1` or `disable_ollama_cloud`. https://docs.ollama.com/faq
- ADR decision 10's "localhost only" holds; the ADR does not mention turning cloud features off.

Revisions for decision 10:

1. Replace "the first model on the Ollama embeddings list" with the real reason, or drop it.
2. Pin the tag to `embeddinggemma:300m` and record the digest (`85462619ee72` today), instead of the bare name that resolves to `latest`.
3. Store the embed model tag on each vector row, or in one index-metadata row, so a rebuild can detect a model change.
4. Cite 768 to the Google model card.
5. Optional: name `truncate: false` on ingest so an oversized chunk fails instead of being cut silently, and name `OLLAMA_NO_CLOUD=1`.

## 3. Chunks and OCR (ADR decision 11)

**Verdict: REVISE.** 512 is workable as a product cap. The 64-token overlap is not a Docling feature, and two Docling defaults work against the ADR text.

Docling chunking:

- Docling's `HybridChunker` starts from the hierarchical chunker, splits chunks that are oversized against a user-provided tokenizer, and then merges undersized neighbors with the same headings and captions; `merge_peers` defaults to `True`. https://docling-project.github.io/docling/concepts/chunking/
- In the source, `max_tokens` is optional, and when it is not set the limit is "resolved from the tokenizer". https://raw.githubusercontent.com/docling-project/docling-core/main/docling_core/transforms/chunker/hybrid_chunker.py
- The default tokenizer is `sentence-transformers/all-MiniLM-L6-v2`, and the limit is read from that model's `sentence_bert_config.json` `max_seq_length`. https://raw.githubusercontent.com/docling-project/docling-core/main/docling_core/transforms/chunker/tokenizer/huggingface.py
- That file sets `max_seq_length` to 256. https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/raw/main/sentence_bert_config.json
- So with defaults, Docling caps chunks at 256 MiniLM tokens, not 512 EmbeddingGemma tokens. The ADR's 512 does not conflict with Docling, but it only takes effect if Task 6.2 passes the EmbeddingGemma tokenizer and `max_tokens=512` explicitly.
- The `HybridChunker` source has no overlap parameter. https://raw.githubusercontent.com/docling-project/docling-core/main/docling_core/transforms/chunker/hybrid_chunker.py The Docling chunking page describes no overlap option for any of its chunkers either. https://docling-project.github.io/docling/concepts/chunking/
- An overlap of 64 would be custom Nest or Python code on top of Docling output. No primary source mandates 512 or 64; both are product caps.
- 512 tokens fits inside the 2K input context stated on the Google model card. https://ai.google.dev/gemma/docs/embeddinggemma/model_card

Docling OCR default:

- Docling's PDF pipeline option `do_ocr` defaults to `True`. https://raw.githubusercontent.com/docling-project/docling/main/docling/datamodel/pipeline_options.py
- "A digital PDF skips OCR" therefore needs Docling's own OCR turned off (or limited) in the pipeline; it is not the default. Otherwise Docling runs its own OCR engine and the ADR's OCRmyPDF-then-Docling order is bypassed.
- Docling's code is MIT licensed. https://raw.githubusercontent.com/docling-project/docling/main/LICENSE

OCRmyPDF:

- OCRmyPDF is a Python application and library that adds text layers to images in PDFs, using Tesseract, and returns a minimally altered PDF. https://ocrmypdf.readthedocs.io/en/latest/introduction.html
- Its `--mode skip` (formerly `--skip-text`) skips pages that already have text, which matches "a page with no text layer goes through OCRmyPDF" on a per-page basis. https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- Languages are passed as Tesseract three-letter codes, joined with `+` (for example `-l eng+fra`), and each language pack must be installed. https://ocrmypdf.readthedocs.io/en/latest/languages.html Portuguese plus English would be `-l por+eng`; the `por` code follows that ISO 639-2 rule and was not seen spelled out on that page.
- Tesseract cannot detect an unknown language. https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- OCRmyPDF is licensed under the Mozilla Public License 2.0. https://raw.githubusercontent.com/ocrmypdf/OCRmyPDF/main/LICENSE
- The introduction says OCRmyPDF requires Ghostscript, which is AGPLv3, while the same page says that from v17.0.0 Ghostscript is no longer strictly required when pypdfium2 is used. https://ocrmypdf.readthedocs.io/en/latest/introduction.html Task 6.2 should pick the pypdfium2 path on purpose if it wants to avoid shipping Ghostscript.
- OCRmyPDF refuses to modify a digitally signed PDF by default, and adding OCR invalidates the signature if forced. https://ocrmypdf.readthedocs.io/en/latest/cookbook.html Ingest should OCR a working copy and keep the signed original as the record.
- OCRmyPDF is not designed to be secure against malware-bearing PDFs, and its Docker web front-end has no security measures and is not meant for the public internet. https://ocrmypdf.readthedocs.io/en/latest/introduction.html
- The ADR's "Marker and cloud OCR stay out" is product policy; no source checked here requires them.

Revisions for decision 11:

1. Label 512 and 64 as product caps.
2. State that `HybridChunker` gets the EmbeddingGemma tokenizer and `max_tokens=512`, because its default is MiniLM with 256.
3. Either drop the 64-token overlap or state that it is custom code outside Docling.
4. State that Docling's `do_ocr` is turned off for digital pages, so OCR runs only through OCRmyPDF `--mode skip`.

## 4. Query contract (ADR decision 12)

**Verdict: HOLD.** No primary source checked here contradicts the contract.

Product policy, not constrained by any database or model doc:

- `POST /api/rag/query`, retrieval only, no generative model call.
- `q` required, 1 to 500 characters.
- Optional `caseId` using the capa case gate.
- `citeStatus` of `cited` or `silent`, with `silent` returning an empty list.
- At most 8 hits.
- Each hit carries `docId` and a snippet of at most 160 characters.

Lines that a database or model doc does constrain:

- `distance` in the response comes from a TiDB distance function. Cosine distance is `1.0` minus cosine similarity, and its example returns 2 for opposite vectors, so values run from 0 to 2. https://docs.pingcap.com/ai/vector-search-functions-and-operators/ The ADR does not name the function; Task 6.2 should, so `distance` has a fixed meaning.
- Ranking the 8 hits with `ORDER BY <distance> LIMIT 8` after the ACL `WHERE` is the exact, unindexed path described in section 1. https://docs.pingcap.com/ai/vector-search-index/
- `q` is embedded with the same model as the corpus. 500 characters sits well inside the 2K token context. https://ai.google.dev/gemma/docs/embeddinggemma/model_card The query side should use the query prompt prefix from the same card. https://ai.google.dev/gemma/docs/embeddinggemma/model_card
- What counts as a "citable hit" for `cited` (for example a distance threshold) is not set by any source checked here; it is product policy and still open in the ADR.

## What must change in ADR 0004 before Task 6.2 code

1. **Decision 10:** remove the claim that `embeddinggemma` is first on the Ollama embeddings list, which is now false because `embeddinggemma-2` is listed first (https://ollama.com/search?c=embedding). Pin `embeddinggemma:300m` with its digest, and record the model tag with the vectors. EmbeddingGemma 2 has the same 768 width (https://ollama.com/library/embeddinggemma-2), so a swap would not fail on insert. Cite 768 to https://ai.google.dev/gemma/docs/embeddinggemma/model_card.
2. **Decision 11:** mark 512 and 64 as product caps. State the EmbeddingGemma tokenizer and `max_tokens=512` for `HybridChunker`, whose default limit is 256 from MiniLM. Either drop the 64-token overlap or say it is custom code, since Docling has none. Turn off Docling `do_ocr` for digital pages.
3. **Decision 6 / Context:** note that TiDB vector search is public preview and documented only for Self-Managed v8.4.0+ and TiDB Cloud Starter (https://docs.pingcap.com/ai/vector-search-overview/). Add a pre-build check that the `HubLegal` cluster supports `VECTOR`. Name the distance function, with cosine recommended.
4. **Decision 12:** no change required; naming the distance function in decision 6 fixes the meaning of `distance`.

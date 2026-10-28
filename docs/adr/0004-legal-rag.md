# ADR 0004 — Legal RAG store and ACL-at-query

- **Status:** Proposed (Phase 6)
- **Date:** 2026-10-28
- **Deciders:** Bossmann (policy), Zupelli (store), Gabriel (ingest)
- **Plan:** Phase 6 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)
- **Options surveyed:** [`../plan/rag-options.md`](../plan/rag-options.md)

## Context

ADR 0001 requires legal RAG whenever a model answers from the acervo: retrieve → pack → call model. Hub/BD is source of truth; the index is **derived**; call context is ephemeral. ACL at query time. Cite-or-silent. No model→DB/FS. SafeDTO is egress only, never the RAG index.

Phase 3 published hardvault is the office corpus. Phase 4 Xirp already records `cite_status` on agent runs. The hub store is **MySQL-wire** (`HubLegal`), not Postgres, so pgvector cannot sit inside the hub DB without a second engine.

## Decision

1. **v0 store = Nest-owned derived lexical index over published hardvault.** Chunks are pointers + snippets (and publisher-gated body when policy allows). Ingest never reads `vault_personal_notes`. Query always re-checks `hardvault_acl` (office / user / role) and case clearance when a `casoId` is supplied. Empty or non-citable packs return **silent** (zero hits to the model path).
2. **ACL lives in Nest at query time for v0.** Engine RLS is the north-star hardening path, not a prerequisite for the consult wedge. Do not retrieve-then-filter in the client or in an LLM agent loop.
3. **Cite ledger is append-only** (`rag_cite_ledger` or memory mirror when `DB_*` is unset): `source_id`, optional `release_id`, `user_id`, `office_id`, `caso_id`, `cite_status`, `q`, `at`. Fail-closed audit still applies on the HTTP path.
4. **Evolution path (documented, not built now):**
   - **Postgres + pgvector + RLS** as a sidecar when the office wants engine-enforced ACL (matches `rag-options.md` MVP when Postgres exists).
   - **Qdrant** when filtered-ANN recall/ops justify a dedicated vector service.
   - HubLegal remains truth; any vector store stays a derived replica with rebuild-from-hardvault.
5. **Consult capability only in Phase 6.** Retrieval pack tools only. No mutation tools (no WhatsApp send, no case write) on the model path. Linked-provider vs office-hosted are runtimes behind the same Nest `/api/rag` + MCP consult surface. `OFFICE_HOSTED_AI` is a per-process feature flag for the office-hosted SKU stub.
6. **Frameworks (LlamaIndex / LangChain / Haystack) are not the permission boundary.** If used later, they stay orchestration only; Nest owns ACL filters on every retrieve.

## Consequences

- v0 provas run without Postgres/Qdrant (memory + hardvault SQL LIKE path).
- Operators must not claim “vector ACL” until a sidecar with RLS or Qdrant filters ships.
- Personal vault stays deny-by-default and out of ingest.
- Xirp remains the answer surface; RAG query feeds consult packs that Xirp/MCP may cite.
- PA mode (Phase 6.5) must not reuse this index to bypass tool allowlists.

## Evidence (Phase 6)

- `pnpm --dir server run prova:rag` — ACL miss → zero hits; missing ementa/snippet → silent; cite ledger row on allowed hit.
- ADR indexed from `docs/README.md`.

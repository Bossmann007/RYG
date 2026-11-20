# docs/

| File / folder | Role |
|---------------|------|
| [`../PROJECT.md`](../PROJECT.md) | **Source of truth** (Decisions + map + glossary) |
| [`adr/0001-hub-north-star.md`](adr/0001-hub-north-star.md) | Architecture |
| [`adr/0002-mcp-egress-contract.md`](adr/0002-mcp-egress-contract.md) | MCP egress contract (Accepted): `privacy-gateway` SafeDTO is canonical; Nest `/api/mcp` delegates to it |
| [`adr/0003-mcp-client-providers.md`](adr/0003-mcp-client-providers.md) | Hub as MCP client of a user-linked provider (Proposed): per-user encrypted credentials, SafeDTO only, off until DPA signed |
| [`adr/0004-legal-rag.md`](adr/0004-legal-rag.md) | Legal RAG index (Accepted): `VECTOR` in `HubLegal`, ACL `WHERE` before distance, vector index unused on that query |
| [`adr/0005-pa-mode.md`](adr/0005-pa-mode.md) | PA mode (Accepted 2026-10-20): office-hosted opt-in `OFFICE_PA` + `PA_USERS` for sócio, allowlist, HITL, `pa_session` + `delegated_by` |
| [`adr/0006-pms-financeiro.md`](adr/0006-pms-financeiro.md) | Simple case money (Proposed): honorário, custa, and a frozen fatura in centavos. Not an ERP |
| [`adr/0007-area-packs.md`](adr/0007-area-packs.md) | Practice-area packs (Proposed): the existing catalog row plus a process-source default. No second area until one office runs bancário in production |
| [`plan/hub-office-platform.md`](plan/hub-office-platform.md) | Phased plan |
| [`plan/rag-options.md`](plan/rag-options.md) | RAG store options (Phase 6) |
| [`plan/rag-preflight-2026-10.md`](plan/rag-preflight-2026-10.md) | 2026-10-11 check of ADR 0004 against PingCAP, Ollama, Google, and Docling |
| [`ops.md`](ops.md) | TiDB smoke, manual test, cite-or-silent |
| [`../.cursor/state/checkpoint.json`](../.cursor/state/checkpoint.json) | Live task |

```
docs/
  README.md
  ops.md
  adr/
  plan/
```

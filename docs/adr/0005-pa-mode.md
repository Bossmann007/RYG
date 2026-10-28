# ADR 0005 — PA mode allowlist and HITL

- **Status:** Proposed (Phase 6.5)
- **Date:** 2026-10-28
- **Deciders:** Bossmann (policy), Gabriel (tools), Gustavo (UX)
- **Plan:** Phase 6.5 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)
- **Depends on:** ADR 0001 (consult vs PA), ADR 0002 (SafeDTO egress), ADR 0004 (consult RAG)

## Context

Default capability is **consult** (retrieval-only). PA mode is the post-v0 opt-in for chefe/sócio: RAG plus allowlisted tools, HITL on irreversible actions, full audit. Codename “Hermes” stays internal. Learning means hub artifacts only — never fine-tune on client processos.

MCP `/api/mcp` tools today are `somenteLeitura: true`. Putting Zap send on the MCP wire in the same release would expand the trusted tool surface for every linked-provider client.

## Decision

1. **Default remains consult.** PA is off until `OFFICE_PA_MODE=true` and a human with papel `socio` or `gestor` opens a session.
2. **Actor model.** Every PA action records `actor=pa_session`, `delegated_by=<human user id>`, office, role, and session id. Audit uses origem `hub` with ferramenta prefixed `pa_`.
3. **Allowlist (v0).** Only these tools exist under `/api/pa/tools/*`:
   - `case_read` — capa via existing case ACL/clearance
   - `checklist` — deterministic bancário checklist (no model, no DB dump)
   - `whatsapp_propose` — classification gate + open HITL; **does not** return the desafio token
   - `export_pack` — hardvault/RAG pointer pack; marks `requerSafeDto: true` for linked-provider egress
4. **No raw SQL, filesystem, or arbitrary MCP mutation tools.** Nest owns the allowlist. MCP catalog stays consult-only in this phase. Confirm is **not** a PA tool.
5. **HITL.** Irreversible = WhatsApp send (and any future write to case truth). Propose holds the one-shot desafio server-side. Human UI reads it from `GET /api/pa/hitl/whatsapp_challenge` and confirms via `POST /api/pa/hitl/whatsapp_confirm` with the desafio. A boolean `confirmacaoHumana` or a tool named `whatsapp_confirm` is not enough — the model must not self-confirm from tool I/O. Fail-closed audit before send.
6. **Role gate.** `estagiario` and `advogado` cannot open PA sessions. They stay on consult (`/api/rag/*`, MCP read tools).
7. **Runtime.** PA may run with office-hosted or linked-provider consult packs underneath; tool mutations always hit Nest, never the model directly.

## Consequences

- Evidence path is `pnpm --dir server run prova:pa` (session gate, consult user denied, propose omits desafio, `/tools/whatsapp_confirm` absent, HITL challenge+confirm sends).
- A later ADR may expose the same allowlist through MCP with per-tool `readOnlyHint: false` and PA session tokens. Not this phase.
- “Learn together” = store artifacts in hub (notes/Xirp/audit), never training jobs on client processos.

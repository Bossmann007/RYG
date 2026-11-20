## Learned User Preferences

- Prefer design, architecture, and ADR approval before product code on this repo. When asked to close an open choice for speed and efficiency, lock the recommended local option in the ADR instead of leaving it open.
- Treat privacy and professional secrecy as architecture requirements (deny-by-default, fail-closed), not optional features.
- Do not claim LGPD compliance in docs or pitch; describe technical controls and leave legal or DPO judgment explicit.
- Prefer a thin vertical slice with evidence first (Nest auth, tenant `office_id`, RBAC) over more architecture docs when implementing; do not redesign the locked Nest/React/TiDB stack just for absolute minimalism before the v0 wedge ships.
- Prefer Nest or TypeScript for policy and audit orchestration; Python for Presidio, sanitization, and the Docling chunk/OCR scripts under `server/.venv-chunk`.
- Verify that claimed prerequisites are actually implemented, and re-run the proof before trusting a delegated slice report, before building the next layer.
- Prefer Portuguese in chat; keep code identifiers and file contents in English unless the project is PT-first.
- Prefer `/poteto-mode` for non-trivial architecture and security design work. `roda poteto mode`, `run poteto mode`, and `/poteto-mode` while a checkpoint `next_action` exists mean execute that slice under the playbook, not a mode-only reply. When the user routes models: Grok for light work, Sonnet 5.5 for intermediate and serious slices, Opus 5.5 only for very heavy multi-file / trust-MCP / hard debugging / parallel subagents. When they say continua or roda, execute the next plan slice instead of handing a prompt; when they ask for the next prompt, return one pasteable slice with that model named and do not implement it.
- Treat PROJECT.md Decisions and locked thesis as source of truth; resume from checkpoint.json; on conflict stop and ask; outside closed v0 P0 is backlog, not code; do not rewrite the product mid-implementation; do not commit unless the user asks; push only when they explicitly ask to push.
- Product is office PMS (prazo, financeiro, processo) plus wiki and area connectors first, not a legal LLM; core must work without a model.
- LLM access is optional: none, linked-provider via MCP, or office-hosted local SKU; avoid the term BYOAI; default AI mode is consult/retrieval-only; PA mode (Phase 6.5) stays out until its ADR, role-gated and post-v0; legal RAG with ACL when models answer from acervo. ADR 0004 (Accepted) is the RAG index: a derived TiDB `VECTOR` in `HubLegal`, office `WHERE` before cosine distance, and the query refuses to run without that predicate. `POST /api/rag/query` and `POST /api/rag/consult` exist; do not swap the pinned embed tag `embeddinggemma:300m` (digest prefix `85462619ee72`) for another 768-wide model. Office-hosted consult is gated by `OFFICE_HOSTED_AI` and calls a generative model only after `cited`; a silent result does not call the model, and the model only rewrites snippets with no tools. A small local consult model is a reserve candidate (PrismML Bonsai 2B or 4B, name unlocked); it is not the embedder. ADR 0003 (Proposed) allows the hub as an MCP client of a user-linked provider with a separate per-user credential store; do not implement that client until Bossmann sets the ADR to Accepted, and production stays off until the DPA is signed.
- WhatsApp is OAuth plus send tools only; work chat stays on the hub web.

## Learned Workspace Facts

- Origin GitHub repo is `Bossmann007/RYG`; upstream sync source is `joaozupeli/zeg`.
- Stack is React plus Vite in `client/`, NestJS in `server/` with `/api` prefix, and `privacy-gateway/` for SafeDTO and MCP egress; package manager is pnpm-only (workspace: client, server, privacy-gateway — no `package-lock.json`).
- Team is Bossmann (product and privacy), Zupelli (database), Gustavo, and Gabriel Henrique.
- Product framing is a collaborative office hub (PMS + wiki + tools), not Jusbrasil search, not ChatGPT Legal, and not a standalone legal chatbot.
- SafeDTO is private-data egress only (not the RAG index); ADR 0002 (Accepted) makes `privacy-gateway` SafeDTO the canonical wire contract and Nest `POST /api/mcp` `tools/call` delegates to `validateSafeDto`, `serializeSafeDtoForMcp`, and the firewall — `EnvelopeSafe` is Nest-internal only; the three catalogs stay separate; hub/BD is source of truth; no model may access DB or filesystem directly.
- Process sources sit behind `ProcessSource` (`fixture`, `datajud`, `eproc`, `manual`, `upload`); do not lock the product to one adapter.
- Jurimetria UI path is stripped (no tab/anel/% reports); cite-or-silent on chance; `Caso.jurimetria` field and `DissidioService` via ResearchModule remain until a schema migration; Phase 0.5 in the tree adds IdentityGuard, `office_id` on casos/processos and on child tables the hub reads, fail-closed audit, WhatsApp HITL plus a transfer-register line before send (`revisao` must be true, and email, CPF, or a long digit run in `texto` is blocked before the challenge; `para` is never stored on the audit line; template `tpl-aviso-prazo` uses a fixed server body), case membership and Chinese wall at intake and at RAG query time, classification default `sigiloso` (socio clearance for `sigiloso` and `segredo_justica`), an MFA/idle/JML-disable stub, and an in-memory ciphertext vault (`HUB_VAULT_KEY`, restart wipes it); `casos.legal_hold` defaults off and `retain_until` is stored only (no delete job); a case-row delete goes through `apagarSemHold` and returns 409 while hold is on; acervo `@Delete` handlers stay in-memory and sit outside that guard; still open are real login/TOTP and a per-case role matrix; do not scrape Jusbrasil or PJe.
- Hub chat stays per-case; workspace DMs exist for same-office peers. A personal wiki note is readable only by its owner and stays out of hardvault search until that owner publishes it with an explicit confirm; hardvault search returns ACL-filtered pointers and short snippets. `POST /api/dsar` returns an opaque protocol and does not store the request text.
- In-hub Backstage is a small tool catalog; Astra and similar products are tools; Xirp is the case panel of MCP run metadata (tool name, release id, cite status, short SafeDTO summary). A run with no case id stays off that panel. Tool arguments and phone numbers are not stored, and a failed run write fails the call.
- `pnpm evidence` at the repo root runs privacy-gateway typecheck, tests, demo, and MCP stdio smoke.
- Two capa paths stay separate: `ProcessService` plus `ProcessSource` versus `CasosRepository` TiDB hub casos; app DB is `HubLegal` (never `sys`); `casos`/`processos` use `office_id` filtered by IdentityGuard `escritorio` (demo fixture `prado-advogados`); capa reads also need `case_memberships` (same-office non-member → 403, other office → 404); child reads require `office_id` or they do not query, and a missing column on an existing child table is 503; Chinese wall uses `case_parties` at intake and in `montarConsultaRag` (a member of two cases sees neither chunk when a party is client on one and adverse on the other); hub HTTP needs Bearer/`VITE_HUB_TOKEN` — no silent local acervo fallback. Live `HubLegal` is TiDB v8.5.3-serverless and accepts `VECTOR`. `rag_chunks` stores `VECTOR(768)` rows for embed tag `embeddinggemma:300m`. `montarConsultaRag` throws before SQL when `officeId` is empty. A `caseId` still needs `autorizarCapa`. Docling chunking for that index is `HybridChunker` at 512 tokens, no overlap, with Docling OCR off. Chunk and OCR scripts live in `server/.venv-chunk` (Python 3.12) with tokenizer `unsloth/embeddinggemma-300m`; textless-PDF OCR is that local script, not `POST /api/rag/ingest`, and Ghostscript is not invoked.
- Hackathon reference materials live under `/Users/bossmann/Hackaton`; thesis SoT is `PROJECT.md` + `docs/adr/0001-hub-north-star.md` + `docs/plan/`; index `docs/README.md`; old pitch lives in `_archive/` (local).

## Agent skills

### Issue tracker

GitHub Issues on `Bossmann007/RYG` via `gh`. Upstream sync source is `joaozupeli/zeg`. See `docs/agents/issue-tracker.md`.

### Domain docs

`PROJECT.md` (map + Decisions) → `docs/adr/` → `docs/plan/`. Index: `docs/README.md`.

### Kit verification triggers

- `verification-planning` — before non-trivial implement (evidence path + budget)
- `simplify` — after behavior proven (readability, no behavior change)
- `blindspot-pass` — second pass before ship (edges / silent failures)

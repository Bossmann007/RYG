## Learned User Preferences

- Prefer design, architecture, and ADR approval before product code on this repo.
- Treat privacy and professional secrecy as architecture requirements (deny-by-default, fail-closed), not optional features.
- Do not claim LGPD compliance in docs or pitch; describe technical controls and leave legal or DPO judgment explicit.
- Prefer a thin vertical slice with evidence first (Nest auth, tenant `office_id`, RBAC) over more architecture docs when implementing; do not redesign the locked Nest/React/TiDB stack just for absolute minimalism before the v0 wedge ships.
- Prefer Nest or TypeScript for policy and audit orchestration; Python only for Presidio or sanitization.
- Verify that claimed prerequisites are actually implemented before building the next layer.
- Prefer Portuguese in chat; keep code identifiers and file contents in English unless the project is PT-first.
- Prefer `/poteto-mode` for non-trivial architecture and security design work; when the user routes models, use Grok for light/medium work and Opus 5.5 for heavy multi-file, trust/MCP, hard debugging, or parallel subagents.
- Treat PROJECT.md Decisions and locked thesis as source of truth; resume from checkpoint.json; on conflict stop and ask; outside closed v0 P0 is backlog, not code; do not rewrite the product mid-implementation; do not commit unless the user asks.
- Product is office PMS (prazo, financeiro, processo) plus wiki and area connectors first, not a legal LLM; core must work without a model.
- LLM access is optional: none, linked-provider via MCP, or office-hosted local SKU; avoid the term BYOAI; default AI mode is consult/retrieval-only; PA mode with tools is role-gated and post-v0; legal RAG with ACL when models answer from acervo.
- WhatsApp is OAuth plus send tools only; work chat stays on the hub web.

## Learned Workspace Facts

- Origin GitHub repo is `Bossmann007/RYG`; upstream sync source is `joaozupeli/zeg`.
- Stack is React plus Vite in `client/`, NestJS in `server/` with `/api` prefix, and `privacy-gateway/` for SafeDTO and MCP egress; package manager is pnpm-only (workspace: client, server, privacy-gateway — no `package-lock.json`).
- Team is Bossmann (product and privacy), Zupelli (database), Gustavo, and Gabriel Henrique.
- Product framing is a collaborative office hub (PMS + wiki + tools), not Jusbrasil search, not ChatGPT Legal, and not a standalone legal chatbot.
- SafeDTO is private-data egress only (not the RAG index); ADR 0002 (Proposed) makes `privacy-gateway` SafeDTO the canonical wire contract and Nest `/api/mcp` a future delegate — `EnvelopeSafe` is Nest-internal only; the three catalogs stay separate; hub/BD is source of truth; no model may access DB or filesystem directly.
- Process sources sit behind `ProcessSource` (`fixture`, `datajud`, `eproc`, `manual`, `upload`); do not lock the product to one adapter.
- Jurimetria UI path is stripped (no tab/anel/% reports); cite-or-silent on chance; `Caso.jurimetria` field and `DissidioService` via ResearchModule remain until a schema migration; remaining trust gaps (MFA, Chinese wall, fail-closed audit, HITL WhatsApp, case RBAC) live in GitHub issue #1; do not scrape Jusbrasil or PJe.
- Hub chat is per-case today; north-star ADR adds workspace DMs and mentions plus a personal vault that queries an office hardvault with minimal load.
- In-hub Backstage is a small tool catalog; Astra and similar products are tools; Xirp is the in-hub agent-response desktop surface.
- `pnpm evidence` at the repo root runs privacy-gateway typecheck, tests, demo, and MCP stdio smoke.
- Two capa paths stay separate: `ProcessService` plus `ProcessSource` versus `CasosRepository` TiDB hub casos; app DB is `HubLegal` (never `sys`); `casos`/`processos` use `office_id` filtered by IdentityGuard `escritorio` (demo fixture `prado-advogados`); hub HTTP needs Bearer/`VITE_HUB_TOKEN` — no silent local acervo fallback.
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

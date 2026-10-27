# Hub Office Platform Implementation Plan

> **For agents:** Follow anti-drift below. Subagent-driven-development or executing-plans for task checkboxes. Do **not** rewrite thesis mid-build.

**Thesis (one line):** Office OS = PMS + wiki + area connectors + team chat; AI optional via AI Gateway — not a legal chatbot.

**v0 P0 (ship now):** Stabilize wedge — hub DB casos evidence (MySQL-wire: MariaDB/MySQL/TiDB), single MCP egress contract, strip jurimetria leftovers. Wedge product surface already = caso + chat + scripts + catalog + Zap skeleton.

**v1 hook (1§):** After Phase 0.5 trust + wiki corpus: AI Gateway + **consult** mode (retrieval-only) + RAG ACL + cite-or-silent; runtimes none | linked-provider | office-hosted read-only.

**v2 hook (1§):** **PA mode** — RAG + allowlisted tools, role-gated, HITL, audit; office-hosted PA for chefe; same gateway for multi-model MCP. No fine-tune on client processos.

**Architecture:** Hub-core `Bossmann007/RYG`. Hub/BD = source of truth; RAG index derived; SafeDTO = private egress only; no model→DB/FS. Runtime ≠ capability (consult vs PA).

**Tech Stack:** TypeScript, React 18, Vite, NestJS 10, TiDB/MySQL (`mysql2`), MCP, pnpm, Vitest; SafeDTO in `privacy-gateway/`; RAG store pick in Phase 6 ADR (`docs/plan/rag-options.md`).

## Anti-drift (process requirement)

| Rule | Action |
|------|--------|
| Source of truth | `PROJECT.md` Decisions + this plan's thesis/v0. Conflict → **stop and ask**. |
| Session start | Read `PROJECT.md` Decisions + `.cursor/state/checkpoint.json`; do only `next_action`. |
| Outside P0 | Open GitHub issue; **no product code**. |
| Thesis-changing idea | ≤5 lines in chat; **wait for human OK** before editing Decisions/ADR. |
| Evidence | Real command/test in checkpoint `tests` — never “should work”. |
| PRs | Small; reject diffs that revive chatbot / Zap inbox / jurimetria / old dissídio pitch. |
| Plan hygiene | Prefer amendments over rewriting this whole file weekly. |

## Global Constraints

- Core hub must work with **zero** model.
- Runtimes: none | **linked-provider** | **office-hosted** — never call it BYOAI.
- Capabilities: **consult** (default, RO) vs **PA** (tools, post-v0, role-gated).
- Phase 0.5 trust **before** any production RAG / office-hosted / PA.
- WhatsApp = OAuth + send only; work chat = hub web.
- Cite-or-silent; no jurimetria / win-% / Jusbrasil-PJe scrape / Electron early.
- No LGPD compliance claims; technical controls only.
- Portuguese chat OK; English identifiers/docs unless file is PT-first.
- Team: Bossmann (product/privacy/gateway), Zupelli (DB), Gustavo (UI/Xirp), Gabriel (connectors).

## Phases (separately shippable)

| Phase | Name | Exit criteria |
|-------|------|----------------|
| 0 | Stabilize wedge | Hub DB casos live (MySQL-wire), smoke green, jurimetria leftovers gone, one MCP egress path chosen |
| 0.5 | Office trust foundation (P0) | Tenant + MFA/JML + case RBAC + conflicts + classification + audit + HITL egress + secrets/crypto |
| 1 | Auth-complete workspace chat | DMs + mentions on top of 0.5 identity |
| 2 | Backstage + tools import | Catalog multi-tool; legalops **prazos** as core PMS tool; DataJud/DJEN connectors |
| 2.5 | PMS process depth | Tarefas, andamentos, partes, checklist bancário on case |
| 3 | Wiki (vault personal / hardvault) | Minimal-load query + publish gate (RAG corpus source) |
| 4 | Xirp surface | Agent answer panel; MCP server path (consult-ready) |
| 5 | Hardening P1 | Retention/hold, backup/DR, docs, WhatsApp classified send |
| 6 | Legal RAG + consult + runtimes | ACL retrieval; cite ledger; linked-provider and/or office-hosted **consult** |
| 6.5 | PA mode (v2) | Allowlisted tools + HITL + audit; role gate; no raw SQL/FS |
| 7 | PMS financeiro | Honorários/custas/faturamento simples (own ADR) |
| 8 | Area connector packs | Second practice area after bancário proven |

Do not start Phase 6 until Phase 0.5 is green. Do not start Phase 6.5 until Phase 6 consult works. Do not start Phase 7 until 2.5 + 0.5 solid.


### Agent skills for the team (optional install)

Prefer these over marketplace “lawyer-expert” skills (conflict with hub thesis):

```bash
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y
npx skills add yonatangross/orchestkit@rag-retrieval -g -y
npx skills add alinaqi/maggy@playwright-testing -g -y
npx skills add mindrally/skills@nestjs-clean-typescript -g -y
npx skills add alchemyplatform/skills@agentic-gateway -g -y
npx skills add patricio0312rev/skills@auth-security-reviewer -g -y
```

Already in stack: `verification-planning`, `blindspot-pass`, `review-security`, poteto, `privacy-gateway`, `legalops-br`, `claude-legal-br`.

---

## File map (current → owners)

| Path | Responsibility | Primary owner |
|------|----------------|---------------|
| `client/src/App.tsx`, `paginas/*`, `componentes/*` | Hub UI, catalog, case, future Xirp/workspace | Gustavo |
| `client/src/api.ts` | HTTP client to `/api` | Gustavo |
| `server/src/modules/casos/*` | List/open case (TiDB) | Zupelli + Bossmann |
| `server/src/modules/chat/*` | Per-case chat | Zupelli + Gustavo |
| `server/src/modules/catalog/*` | Backstage banking catalog | Bossmann + Gabriel |
| `server/src/modules/process/*` | `ProcessSource` | Gabriel + Bossmann |
| `server/src/modules/whatsapp/*` | Send skeleton | Gabriel |
| `server/src/modules/gateway/*`, `mcp/*` | Nest MCP tools (converge) | Bossmann |
| `privacy-gateway/*` | Canonical SafeDTO + stdio MCP | Bossmann |
| `docs/adr/*` | Decisions | Bossmann |
| `PROJECT.md`, `AGENTS.md` | Brain / agent memory | Bossmann |
| Sibling `claude-legal-br` | DataJud/DJEN connectors | Gabriel |
| Sibling `legalops-br` | Deterministic CPC/PII scripts | Gabriel |

---

## Phase 0 — Stabilize wedge

### Task 0.1 — Evidence path + hub DB (MySQL wire)

**Owner:** Zupelli (DB), Bossmann (verify)

- [x] Put real `DB_*` in `server/.env` (never commit secrets). Proven 2026-10-24 on local MariaDB `HubLegal`.
- [ ] Run `cd server && npm run build && npm run start:dev`.
- [ ] Run `cd client && npx vite --host 127.0.0.1 --port 8080`.
- [x] Prove `GET /api/casos` and `GET /api/casos/:idOrCnj` return `zone: internal` (see `docs/ops.md`) via `prova-casos` / `prova-office`.
- [ ] Prove UI opens a case without falling back to local `CASOS` (watch browser console for fallback warn).
- [x] Record commands + results in `.cursor/state/checkpoint.json` `tests` field.
- [x] Docs: MySQL-wire (MariaDB/MySQL/TiDB), not TiDB-only.

**Done when:** `/api/casos` works against a MySQL-wire hub DB; checkpoint `tests` updated with date.

### Task 0.2 — Single egress MCP contract

**Owner:** Bossmann

- [x] Document which surface is canonical: `privacy-gateway` SafeDTO (`ofs_` / `rel_`) vs Nest `EnvelopeSafe`.
- [x] Choose: (A) Nest `/api/mcp` delegates to privacy-gateway package, or (B) deprecate Nest tool list until wired.
- [x] Add ADR `0002-mcp-egress-contract.md` with the choice.
- [ ] Align `docs/agents` / archive MCP notes one-liner to the ADR (live contract = Phase 0.2).
- [x] Smoke: `npm run evidence` at repo root green.
- [ ] Commit: `docs(adr): single MCP egress contract`.

**Done when:** One written contract; `evidence` green; catalog MCP item points at that contract.

### Task 0.3 — Subtract jurimetria leftovers

**Owner:** Gustavo (UI), Bossmann (API language)

- [ ] Remove or quarantine `PainelJurimetria` usage and dead exports if unused.
- [ ] Stop mounting chance/jurimetria language in `relatorios.ts` happy path (cite-or-silent only).
- [ ] Soften or gate Nest `get_safe_update` copy that implies risk score / win framing.
- [ ] Keep `DissidioModule` only if research demo still needs it; otherwise drop from `app.module` hot path.
- [ ] Manual UI check: no Jurimetria menu; no chance ring on cards.
- [ ] Commit: `fix: remove jurimetria leftovers from hub UI path`.

**Done when:** Hub UI and primary MCP tools do not advertise jurimetria/% vitória.

### Task 0.4 — Commit/push local wedge

**Owner:** Bossmann (after team OK)

- [ ] `git status` review (no `.env` secrets).
- [ ] Small commits: setup files, ProcessSource, catalog, whatsapp, UI hides, docs/ADR.
- [ ] Push `Bossmann007/RYG` `main` (or `develop` per `CONTRIBUTING.md`).

**Done when:** Remote contains wedge + ADR 0001.

---

## Phase 0.5 — Office trust foundation (P0)

Blocks Phase 6 (RAG / office-hosted / PA). Can overlap late Phase 0. Deep-search source: Grok pass 2026-09-18.

### Task 0.5.1 — Tenant = escritório

**Owner:** Zupelli + Bossmann

- [ ] Every row keyed by `office_id`; queries fail closed without it.
- [ ] Tests: office A cannot read office B casos/chat/vault.
- [ ] Commit: `feat(db): multi-office tenant isolation`.

### Task 0.5.2 — AuthN, MFA, session, offboarding

**Owner:** Bossmann + Gustavo

- [ ] Login + MFA + idle timeout.
- [ ] Admin JML: disable user revokes hub session, MCP grants, and flags WhatsApp/MCP tokens.
- [ ] Tests: disabled user → 401 on API and MCP.
- [ ] Commit: `feat(auth): MFA session and offboarding`.

### Task 0.5.3 — RBAC per case + Chinese wall

**Owner:** Zupelli (schema), Bossmann (policy), Gustavo (UI intake)

- [ ] Case membership roles; default deny.
- [ ] Conflict check at intake (client/adverse party) before open.
- [ ] Tests: non-member 403; conflict blocks open.
- [ ] Commit: `feat(acl): case RBAC and conflict wall`.

### Task 0.5.4 — Classification + immutable audit + HITL egress

**Owner:** Bossmann

- [ ] Labels on caso/doc (e.g. publico / interno / sigiloso / segredo_justica).
- [ ] Append-only audit: open case, publish vault, MCP tool, WhatsApp send, export.
- [ ] HITL confirm UI for WhatsApp and any pack leaving trust zone.
- [ ] Commit: `feat(security): classification audit and HITL egress`.

### Task 0.5.5 — Secrets vault + crypto + transfer register

**Owner:** Bossmann + Gabriel

- [ ] Encrypted store for per-user provider tokens / WhatsApp secrets (not `.env` in git).
- [ ] TLS in transit; encryption at rest for vault blobs (document approach).
- [ ] Log when data may leave BR via external MCP (transfer register stub).
- [ ] Commit: `feat(security): secrets vault and transfer register`.

**Phase 0.5 exit:** Checklist P0 1–8 green with tests; `/blindspot-pass` on trust boundaries.

---

## Phase 1 — Workspace chat (on top of 0.5 identity)

### Task 1.1 — Lock routes to 0.5 identity

**Owner:** Bossmann

- [x] Reuse office identity from 0.5; remove remaining `@Public` on chat/casos except explicit demo flag.
- [x] Keep `CHAT_DEMO_ENABLED` for local-only demos.
- [x] Commit only if gaps remain: `fix(auth): lock down hub routes`.

### Task 1.2 — Schema: DM + mentions

**Owner:** Zupelli

- [x] Migration: tables for workspace channels/DMs, membership, messages, mention index (TiDB).
- [x] Keep existing `chat` per `processo_id` intact.
- [x] Seed script for two demo users + one DM.
- [x] Document schema in `docs/ops.md` (TiDB section) or extend ops when chat schema lands.
- [x] Commit: `feat(db): workspace DM schema`.

### Task 1.3 — API + UI workspace

**Owner:** Gustavo (UI), Zupelli (API assist)

- [x] Nest module `workspace` or extend `chat`: list DMs, send DM, resolve `@mentions`.
- [x] Client: workspace page (DMs list + thread); keep per-case `ChatCaso`.
- [x] Empty states: no DMs, offline API.
- [x] Evidence: two browsers/users send DM; mention creates notification row (minimal).
- [x] Commit: `feat(chat): workspace DMs and mentions`.

**Phase 1 exit:** Authenticated DM works; per-case chat still works; no WhatsApp inbox.

---

## Phase 2 — Backstage + tool imports

### Task 2.1 — Catalog model multi-area

**Owner:** Bossmann + Gabriel

- [x] Extend `banking-catalog.ts` (or DB-backed later) with kinds already used: `prompt` | `skill` | `mcp` | `tool`.
- [x] Add entries pointing at sibling capabilities (DataJud, DJEN, legalops CPC) as **tools**, not apps.
- [x] Export prompt path keeps `requerSafeDto` flag.
- [x] UI `CatalogoBancario` rename/generalize to Backstage page (still small).
- [x] Commit: `feat(catalog): backstage tool entries for legal connectors`.

### Task 2.2 — Wire ProcessSource + claude-legal connectors

**Owner:** Gabriel

- [x] Implement one real adapter beyond fixture (prefer `manual` upload or DataJud read-only from `claude-legal-br` patterns).
- [x] `PROCESS_SOURCE` env selects adapter; unconfigured kinds stay fail-closed.
- [x] Prove `GET /api/process/source` + one capa fetch.
- [x] No Jusbrasil/PJe scrape.
- [x] Commit: `feat(process): first non-fixture ProcessSource adapter`.

### Task 2.3 — legalops as scripts/tools

**Owner:** Gabriel

- [x] Expose one deterministic tool (e.g. prazo CPC) via Nest internal API or MCP tool with no external LLM.
- [x] Catalog entry + smoke test.
- [x] Commit: `feat(tools): legalops prazo script behind catalog`.

**Phase 2 exit:** Catalog lists ≥5 real tools; one non-fixture process source; **prazos CPC** as first-class PMS tool.

---

## Phase 2.5 — PMS process depth

**Owner:** Gustavo (UI), Zupelli (API), Gabriel (ProcessSource feeds)

- [x] Case workspace: partes, andamentos, tarefas/checklist (bancário template), status.
- [x] Tie prazos tool to case id; show upcoming deadlines on case home.
- [x] Evidence: open case → see process facts + prazo without leaving hub.
- [x] Commit: `feat(pms): case process depth and prazos on case`.

**Phase 2.5 exit:** Lawyer can run day-to-day process+prazo on one case screen (finance still out).

---

## Phase 3 — Wiki (vault personal / hardvault)

### Task 3.1 — Data model

**Owner:** Zupelli

- [ ] Tables/collections: `vault_personal_notes`, `hardvault_docs`, ACL, publish requests.
- [ ] Deny-by-default: personal never listed in hardvault search without publish.
- [ ] Commit: `feat(db): personal vault and hardvault schema`.

### Task 3.2 — Query + load pack

**Owner:** Bossmann + Zupelli

- [ ] API: search hardvault → pointers + minimal snippets only.
- [ ] Session “load pack” endpoint (cursor-kit style): only notes needed for current case/task.
- [ ] SafeDTO if pack is exported to MCP/model.
- [ ] Tests: cannot read other user’s personal vault; publish required for hardvault.
- [ ] Commit: `feat(vault): minimal-load hardvault query`.

### Task 3.3 — UI vault (thin)

**Owner:** Gustavo

- [ ] Personal notes list/editor (markdown OK).
- [ ] “Publish to hardvault” with confirmation.
- [ ] Commit: `feat(ui): personal vault panel`.

**Phase 3 exit:** Personal note → publish → searchable in hardvault with ACL; no full dump to model.

---

## Phase 4 — Xirp surface

### Task 4.1 — External agent path (MCP server only)

**Owner:** Bossmann + Gustavo

- [ ] Document: lawyer runs Claude/Cursor connected to hub MCP server; answers reviewed in hub “Xirp” panel fed by run history / SafeDTO releases.
- [ ] Persist agent run metadata (tool name, release id, cite status) — no raw PII in logs.
- [ ] UI panel: list runs + SafeDTO summary for a case.
- [ ] Commit: `feat(xirp): agent answer panel from MCP releases`.

### Task 4.2 — Optional in-hub MCP client (later)

**Owner:** Bossmann + Gabriel

- [ ] Only after 4.1: hub as MCP client to user-linked provider.
- [ ] Per-user credential vault (encrypted); never shared office key by default.
- [ ] ADR `0003-mcp-client-providers.md`.
- [ ] Commit only if product still wants chat-with-model inside hub.

**Phase 4 exit:** Lawyer can complete “ask agent → see answer in hub” without the hub being a legal LLM product.

---

## Phase 5 — Hardening (P1 + residuals)

### Task 5.0 — Retention + legal hold

**Owner:** Zupelli + Bossmann

- [ ] Retention policy fields; legal hold blocks delete.
- [ ] Commit: `feat(db): retention and legal hold`.

### Task 5.0b — Backup/DR tested

**Owner:** Zupelli

- [ ] Document backup for TiDB + object vault; run one restore drill; record in checkpoint.
- [ ] Commit: `docs: backup restore drill`.

### Task 5.0c — Process residuals (stubs OK)

**Owner:** Bossmann

- [ ] DSAR request inbox stub + DPO contact page (no “LGPD certified” claim).
- [ ] Incident runbook: detect → contain → ANPD notice path (3 business days when applicable).
- [ ] DPA template + no-training clause before enabling external MCP in prod.
- [ ] Commit: `docs: dsar ir dpa process stubs`.

### Task 5.1 — WhatsApp real send gate

**Owner:** Gabriel + Bossmann

- [ ] Classification checklist before send; block PII unless SafeDTO/approved template.
- [ ] Human confirm UI.
- [ ] Real Meta keys only in env; stub remains for demo.
- [ ] Commit: `feat(whatsapp): classified send gate`.

### Task 5.2 — Docs cleanup

**Owner:** Bossmann

- [x] Historical pitch/architecture moved to `_archive/`; SoT = `PROJECT.md` + ADR 0001 + `docs/README.md`.
- [ ] Commit: `docs: align product docs to hub thesis` (when user asks).

### Task 5.3 — Graphify (optional backlog)

**Owner:** TBD

- [ ] Batch job only; never on chat hot path.
- [ ] Skip until vault exists and team asks.

---

## Phase 6 — Legal RAG + consult + runtimes (v1)

Depends on Phase 3 (hardvault corpus) and Phase 4 (Xirp). Design in parallel after Phase 3 OK. **Consult only** — no PA tools yet.

### Task 6.1 — ADR RAG store pick

**Owner:** Bossmann + Zupelli

- [ ] Choose store from `docs/plan/rag-options.md` (pgvector / TiDB-compatible / Qdrant). Document ACL-at-query; index is derived from hub truth.
- [ ] Write `docs/adr/0004-legal-rag.md` (RAG ≠ BD; ephemeral context; no model→DB).
- [ ] Commit: `docs(adr): legal RAG store and ACL`.

### Task 6.2 — Ingest + retrieve API

**Owner:** Zupelli (store), Gabriel (ingest), Bossmann (policy)

- [ ] Index only published hardvault + allowed official corpora; never personal vault by default.
- [ ] Classification + case RBAC + Chinese wall at query time.
- [ ] `POST /api/rag/query` returns hits with cite status; empty → silent.
- [ ] Cite ledger rows (source id, release id, user, case).
- [ ] Tests: no ACL → zero hits; cite-or-silent on missing ementa.
- [ ] Commit: `feat(rag): ACL retrieval API and cite ledger`.

### Task 6.2b — AI use notice (UX)

**Owner:** Gustavo

- [ ] Notice: drafts only; human reviews before filing.
- [ ] Same PR window as first Xirp/RAG consult UI.
- [ ] Commit: `feat(ui): AI use notice`.

### Task 6.3 — AI Gateway runtimes (consult)

**Owner:** Bossmann + Gabriel

- [ ] Catalog entries: “Office-hosted AI” vs “Linked provider (MCP)” — never BYOAI.
- [ ] Both backends behind same Nest/MCP tools; consult = retrieval pack only.
- [ ] Linked-provider: SafeDTO on private egress. Office-hosted: ACL + classification; still no raw TiDB/FS.
- [ ] Evidence: case question → cites or silent; works with either runtime in consult mode.
- [ ] Commit: `feat(ai): gateway consult via linked-provider and office-hosted`.

### Task 6.4 — Packaging stub

**Owner:** Bossmann

- [ ] Feature flag `OFFICE_HOSTED_AI=true` per office (no billing required).
- [ ] Sales one-liner: Hub base vs Hub + office-hosted consult.
- [ ] Commit: `docs: office-hosted AI SKU flag`.

**Phase 6 exit:** Consult answers with RAG cites on at least one runtime; zero mutation tools exposed to the model.

---

## Phase 6.5 — PA mode (v2)

Depends on Phase 6 consult green + Phase 0.5 HITL/audit.

### Task 6.5.1 — PA capability gate

**Owner:** Bossmann

- [ ] ADR `0005-pa-mode.md` (or amend 0001): allowlist tools, roles, HITL, actor=`pa_session`+`delegated_by`.
- [ ] Default remains consult; PA opt-in per user/office.
- [ ] Commit: `docs(adr): PA mode allowlist and HITL`.

### Task 6.5.2 — Allowlisted tools + audit

**Owner:** Bossmann + Gabriel + Gustavo

- [ ] Tools: case read helpers, checklist, Zap send **with confirm**, export — no raw SQL/FS.
- [ ] Every mutation audited; irreversible → HITL UI.
- [ ] “Learn together” = hub memory/artifacts only — no fine-tune on client processos.
- [ ] Evidence: PA session can propose Zap; blocked without confirm; consult user cannot call tools.
- [ ] Commit: `feat(ai): PA mode tools behind role gate`.

**Phase 6.5 exit:** Chefe can run PA on office-hosted or (if policy allows) linked-provider with HITL; estagiário stays consult.

---

## Phase 7 — PMS financeiro (later)

**Own ADR before coding.** Do not start before Phase 2.5 + 0.5.

- [ ] ADR `0006-pms-financeiro.md`: honorários, custas, faturas simples, what is out (full ERP).
- [ ] Schema + UI minimal; audit every money field change.
- [ ] Commit when ADR accepted.


---

## Phase 8 — Area connector packs

- [ ] Pack format: area id, tools, prompts, MCP entries, ProcessSource defaults.
- [ ] Second area after bancário wedge proven in production with one office.
- [ ] Commit: `feat(catalog): area pack <name>`.

---

## Evidence path (every phase)

Claim template: “Phase N exit criteria hold on this machine.”

Minimum commands:

```bash
# server
cd server && npm run build && npm test
curl -sS http://127.0.0.1:3000/api/health
curl -sS http://127.0.0.1:3000/api/casos
curl -sS http://127.0.0.1:3000/api/catalogo
curl -sS http://127.0.0.1:3000/api/process/source

# gateway
cd .. && npm run evidence

# client
cd client && npx vite --host 127.0.0.1 --port 8080
# manual: casos → conversas → catálogo → (phase+) workspace/vault/xirp
```

Update `.cursor/state/checkpoint.json` `tests` after each phase. Run `/blindspot-pass` at phase boundaries.

---

## Team board (first two weeks)

| Day focus | Bossmann | Zupelli | Gustavo | Gabriel |
|-----------|----------|---------|---------|---------|
| 1–2 | ADR/MCP contract, push RYG | TiDB + `prova:casos` | Jurimetria UI cleanup | Catalog tool entries sketch |
| 3–5 | MFA/JML + audit design | Tenant + case ACL schema | Auth UI + HITL confirms | Secrets vault spike |
| 6–8 | Classification + conflict policy | Conflict/RBAC APIs | Intake conflict UX | Transfer register + MCP grants |
| 9–10 | Blindspot on 0.5 | DM schema start | Workspace UI shell | legalops prazo tool |

---

## Out of scope (explicit)

- Rebranding as Prism/Bonsai/Astra / legal chatbot identity
- BYOAI as a product name (use linked-provider / office-hosted)
- Shared office ChatGPT key as default
- WhatsApp as primary chat / inbox
- PA mode or RAG before Phase 0.5
- Fine-tune / train models on client processos
- Model→SQL or free filesystem access
- Vector “Astra DB” as product identity
- Full Backstage.io clone
- Jurimetria engine
- Marketplace “lawyer-expert” skills as product behavior
- Claiming LGPD/OAB certification in marketing
- Agent rewriting `PROJECT.md` thesis without human OK

---

## Next action after plan approval

Start **Phase 0.1** (TiDB evidence) in parallel with **0.2** (MCP contract ADR), then **0.5** trust before any RAG / office-hosted / PA work.

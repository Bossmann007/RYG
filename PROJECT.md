# PROJECT.md

Project brain — semi-static. Update when stack or architecture changes.

## Map (read in order)

1. **This file** — stack + **Decisions** (locked thesis)
2. **`docs/adr/0001-hub-north-star.md`** — architecture
3. **`docs/plan/hub-office-platform.md`** — phases (outside P0 → issue, not code)
4. **`.cursor/state/checkpoint.json`** — live `next_action`
5. **`docs/README.md`** — docs index · **`docs/ops.md`** — smoke / cite notes

## Glossary

| Prefer | Avoid |
|--------|--------|
| linked-provider | BYOAI |
| office-hosted | Hermes-as-product |
| consult mode | full agent for everyone |
| PA mode | Hermes (except internal codename) |
| AI Gateway | “the RAG” as the product |
| SafeDTO (egress only) | SafeDTO as RAG index |

## Stack

- Language: TypeScript (Python only for Presidio / sanitization if needed)
- Framework: React 18 + Vite (`client/`), NestJS 10 (`server/`, HTTP prefix `/api`), privacy-gateway MCP package (`privacy-gateway/`)
- Package manager: **pnpm 9 only** (`packageManager` field + `pnpm-workspace.yaml` includes `client`, `server`, `privacy-gateway`). Never commit `package-lock.json`.
- Data: MySQL/TiDB via `mysql2` on server (see `server/.env.example`); demo also uses fixtures under `server/src/fixtures/`

## Commands

```bash
corepack enable
pnpm install                 # workspace root (client + server + privacy-gateway)

pnpm dev:server              # Nest → http://127.0.0.1:3000
pnpm dev                     # Vite → http://localhost:8080

pnpm evidence                # privacy-gateway typecheck + test + demo + mcp smoke
./scripts/evidence.sh        # same
pnpm build:server
pnpm build:client
pnpm lint:measure            # ESLint max-lines warn; measure-only (exit 0)
pnpm prova:casos             # needs real DB_* in server/.env
pnpm prova:acervo
pnpm prova:anti
```

CI: `.github/workflows/ci.yml` (evidence + builds; lint measure never fails the job).

## Architecture

Office hub / PMS OS (not a legal LLM): processo + prazos + financeiro (phased) + wiki vaults + team chat + area connector packs. Optional models via **AI Gateway** (MCP + Nest policy): runtimes = none | **linked-provider** | **office-hosted** local SKU. Capability = **consult** (default, retrieval-only) vs **PA** (tools, role-gated, post-v0). RAG = derived index over hub truth, not the DB. SafeDTO = private egress only. WhatsApp send-only; ProcessSource adapters; cite-or-silent; no win rates; no Jusbrasil/PJe scrape.

Layout: `client/` UI, `server/` Nest, `privacy-gateway/`, `docs/`, `scripts/`, `tooling/` (eslint gates).

## Conventions

- Portuguese OK in chat; code identifiers and committed prose in English unless a doc is already PT-first
- Prefer `/poteto-mode` for non-trivial work; ponytail for minimal diffs
- Do not claim LGPD compliance; describe technical controls only
- SafeDTO for private client data egress only — not the RAG index; models never access DB/filesystem directly
- Outside closed v0 P0 → GitHub issue backlog, do not build now
- **Anti-drift:** Decisions in this file + locked thesis win. Conflict → stop and ask. Do not rewrite the product mid-implementation. Resume from `.cursor/state/checkpoint.json`. Thesis-changing idea → ≤5 lines and wait for OK. Prefer short plans (thesis + P0 + v1/v2 hooks), not weekly rewrites.

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-17 | Product = office hub, not legal LLM | User-locked thesis for Hackathon continuation |
| 2026-09-17 | Work chat = hub web; WhatsApp = OAuth + send tool only | Avoid Zap-as-inbox; keep case memory in-product |
| 2026-09-17 | Jurimetria / win-% out of v0 | No infra/data; no LLM analytics |
| 2026-09-17 | ProcessSource abstraction (DataJud \| eproc \| manual \| upload) | DataJud migrating toward eproc; avoid single-adapter lock-in |
| 2026-09-17 | Wedge v0 = banking + CNJ case + hub chat + scripts + small catalog + WhatsApp send skeleton | Closed scope for shippable demo |
| 2026-09-17 | Workspace = `/Users/bossmann/Projects/RYG`; `origin` = `Bossmann007/RYG`; `upstream` = `joaozupeli/zeg` | Own GitHub repo for continuation; zeg remains sync source |
| 2026-09-18 | Approach A hub-core + MCP-only model access; Xirp=answer surface; Backstage=catalog; vault personal/hardvault; workspace DMs | Grill + ADR 0001 |
| 2026-09-18 | Drop BYOAI brand; keep per-user MCP provider linking when models are used | MCP is the mechanism |
| 2026-09-18 | Managed local AI as paid SKU + legal RAG required for grounded answers | Lawyer may skip external providers; RAG ≠ jurimetria |
| 2026-09-18 | Phase 0.5 office trust P0 before RAG (tenant, MFA/JML, case ACL, conflicts, classification, audit, HITL, secrets) | Deep search Grok + blindspot |
| 2026-09-18 | Product = PMS (processo, prazos, financeiro) + wiki + area connectors; AI still optional | User scope expansion; financeiro/area packs phased |
| 2026-09-19 | Vocabulary: linked-provider + office-hosted + AI Gateway; never BYOAI | Runtime ≠ capability; clearer than BYOAI |
| 2026-09-19 | Default AI capability = consult (retrieval-only); PA mode = RAG+allowlisted tools, role-gated, HITL, post-v0 | Prevent free-hand agents; PA = chefe/sócio opt-in |
| 2026-09-19 | Hub/BD = source of truth; RAG index derived; SafeDTO egress-only; no model→DB/FS | Align privacy-gateway with RAG story |
| 2026-09-19 | Anti-drift ritual: Decisions + checkpoint win; outside P0 = issue; agent must not rewrite thesis | User fear of product drift mid-build |

## Known issues

- Two capa paths on purpose: `ProcessService` + `ProcessSource` vs `CasosRepository.buscarCapa` (TiDB). Do not merge until a real DataJud/eproc adapter exists.
- No `DATAJUD_*` yet; `PROCESS_SOURCE=fixture` in `server/.env.example`
- Two catalogs / two MCPs: UI `catalog` ≠ Nest `ToolCatalogService` ≠ `privacy-gateway` stdio — do not merge casually
- Jurimetria is off the hub UI and `get_safe_update` (no panel, ring, report, or risk band). Internal leftovers remain: `DissidioModule` (needed by `ResearchModule` → `get_safe_update` counts), `Caso.jurimetria` field (no schema migration yet)
- Historical docs live under `_archive/` (gitignored) — not thesis

## Current work

See `.cursor/state/checkpoint.json`. Plan: `docs/plan/hub-office-platform.md`. Next: Phase 0.5 gaps are tracked in GitHub issue 1. Real TiDB host still blocks Phase 0.1 HTTP. ADR 0002 stays Proposed.

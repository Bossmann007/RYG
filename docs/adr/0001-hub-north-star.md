# ADR 0001 — Hub office north star

- **Status:** Accepted (team grill 2026-09-18; amendments through 2026-09-19e)
- **Date:** 2026-09-18
- **Deciders:** Bossmann, Zupelli, Gustavo, Gabriel Henrique (product owner: Bossmann)

## Context

OpenLegalAI / RYG continues the Hackathon OAB workspace. The product is an **office OS for law firms**: PMS (processo, prazos, financeiro) + wiki + practice-area connectors + team chat — **not** a legal LLM. Optional AI via AI Gateway (MCP). WhatsApp send-only.

## Decision

1. **Identity:** Hub first = **PMS + wiki + connectors** under one office OS. Automation/scripts first-class. Models are optional add-ons, never the product name. We absorb the PMS job (prazo, financeiro, processo), not only “chat beside Astrea.”
2. **Runtimes (where the model runs — all optional for core hub):**
   - **None** — hub works with scripts/tools/catalog only.
   - **Linked-provider** — user links Claude/ChatGPT/etc. via MCP (per-user credentials). Do **not** call this BYOAI.
   - **Office-hosted** (paid SKU) — escritório runs/contracts local AI in the trust zone (on-prem or dedicated). Talks to hub via internal MCP / Xirp — not a “chatbot jurídico” brand.
3. **Capabilities (what the model may do — orthogonal to runtime):**
   - **Consult (default):** retrieval/RAG + summarize only. Read-only. No mutation tools (no Zap send, no write to case truth).
   - **PA (optional, post-v0):** RAG + allowlisted tools (case, checklist, Zap with confirm, export). Role-gated (chefe/sócio). HITL on irreversible actions. Audit required. Codename “Hermes” is internal only — product name is **PA mode**. Learning = hub artifacts/memory, **never** fine-tune on client processos.
4. **Legal RAG (required whenever a model answers from acervo):** Pipeline = retrieve → pack context → call model. Hub/BD is source of truth; the index is **derived**; call context is ephemeral. ACL **at query time**. Cite-or-silent. RAG ≠ jurimetria / win rates. No model accesses DB or filesystem directly — always Nest / AI Gateway.
5. **AI Gateway:** Single office MCP + Nest policy surface. Linked-provider and office-hosted are backends behind the same tools/ACL. SafeDTO applies when private data **leaves** the trust zone (typically linked-provider / export). Hub team traffic does **not** go through SafeDTO. Actor identity always recorded (`human` | `pa_session` + `delegated_by` + role).
6. **Shell roles:**
   - **Hub** = product shell: PMS, wiki, chat, catalog.
   - **Backstage** = connectors/tools by practice area (bancário first).
   - **Xirp** = surface for agent answers (cite-or-silent).
7. **Chat:** Per-case channels (exists) plus workspace DMs and mentions (north star).
8. **Memory / wiki:** Personal vault queries office **hardvault** deny-by-default, minimal load. Hardvault feeds legal RAG. Graphify optional, batch only.
9. **Privacy:** SafeDTO = private egress only (not the RAG index). Office-hosted still uses classification + ACL on RAG hits. Public/DataJud is not the privacy core. WhatsApp = send/OAuth tool only (not inbox).
10. **Process data:** `ProcessSource` adapters (`fixture` | `datajud` | `eproc` | `manual` | `upload`).
11. **Out of early phases:** Jurimetria, win rates, Jusbrasil/PJe scrape, Electron, PA mode, office-hosted GPU fleet before Phase 0.5 + RAG ACL.
12. **Delivery:** Approach A — hub-core + plugins. Wedge v0 first; horizon via ADRs. **Anti-drift:** `PROJECT.md` Decisions win; conflict → stop and ask; outside closed P0 = issue not code.

## Consequences

- Packaging: Hub PMS+wiki+connectors ± office-hosted SKU ± linked-provider; capability matrix consult vs PA.
- One egress contract (`privacy-gateway` SafeDTO) for data leaving trust zone.
- Compete with Astrea/Projuris on PMS; differentiate on chat+vault+SafeDTO+optional AI+area packs — not “bigger Jusbrasil.”
- Financeiro and multi-area packs are phased; banking wedge first.
- Zupelli owns store/ACL; Bossmann owns SafeDTO/AI Gateway policy; Gabriel owns ingest connectors.
- Auth before workspace DMs.
- Sibling GitHub tools enter as catalog/MCP connectors, not parallel products.

## Amendment

- **2026-09-18b:** Office-hosted AI SKU + mandatory legal RAG when models answer from acervo.
- **2026-09-18c:** Office trust foundation is **P0 before RAG/office-hosted**.
- **2026-09-18d:** Product = **PMS + wiki + area connectors**, hub-first.
- **2026-09-19e:** Vocabulary (linked-provider / office-hosted / AI Gateway; drop BYOAI). Capability matrix consult vs PA. RAG ≠ BD; SafeDTO egress-only; no model→DB/FS. Anti-drift ritual. PA/Hermes = post-v0 hook only.

### Product pillars (2026-09-18d)

| Pillar | Meaning | Already / next |
|--------|---------|----------------|
| **PMS** | Prazos, financeiro, processo | Processo+chat partial; prazos via `legalops-br`; financeiro later |
| **Wiki** | Personal vault + office hardvault | Phase 3 |
| **Connectors** | Backstage by practice area | Phase 2; multi-area after banking |
| **Optional AI** | none \| linked-provider \| office-hosted; consult default; PA post-v0 | Phase 6+ after P0 trust |

**Sequencing:** Do not build full financeiro before Phase 0.5 + solid processo/prazos. Do not build PA before Phase 6 consult path works.

### P0 — blocks RAG / office-hosted / PA

1. Multi-office tenant isolation  
2. AuthN + MFA + session timeout + immediate offboarding (JML)  
3. RBAC per case  
4. Chinese wall / conflict check at intake  
5. Secrecy / classification labels on cases and docs  
6. Immutable fail-closed audit trail  
7. Human-in-the-loop on every egress (model pack, export, WhatsApp)  
8. Secrets vault + encryption in transit/at rest + international transfer register when using linked-provider MCP  

### P1 — mandatory soon, does not block internal RAG index build

9. Retention + legal hold  
10. Backup/DR with tested restore  

### P1 residual (ship with related features)

- Cite ledger + AI use notice → same PR window as RAG/Xirp  
- Deterministic prazos (`legalops-br`) as core tool  
- Continuous evidence path / smoke  
- DSAR channel + visible DPO contact (process, not “LGPD certified”)  
- Incident response + ANPD notice path  
- Versioning + approval of filing-ready pieces  
- ICP-Brasil cert usage audited  
- DPA with operators + no-training + subprocessors before linked-provider MCP  

Still out: legal chatbot identity, jurimetria, scrape, fine-tune on client acervo.

## Drift signals (refuse)

- “Actually it’s a legal chatbot” / train on acervo / WhatsApp as inbox / win-% in v0 / revive dissídio-chance pitch as thesis  
- Model→SQL or free filesystem  
- Ship RAG/PA before Phase 0.5  
- Agent rewrites `PROJECT.md` thesis without human OK  

## References

- `PROJECT.md` thesis and decisions table
- `docs/plan/hub-office-platform.md`
- Sibling repos: `Bossmann007/privacy-gateway`, `claude-legal-br`, `legalops-br`, `agentic-os`
- Market snapshot: `_archive/docs/research/2026-09-18-market-office-hub.md` (local archive)

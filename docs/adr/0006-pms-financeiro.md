# ADR 0006 — PMS financeiro (honorários wedge)

- **Status:** Proposed (Phase 7)
- **Date:** 2026-10-29
- **Deciders:** Bossmann (policy), Zupelli (schema), Gustavo (UI later)
- **Plan:** Phase 7 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)
- **Depends on:** ADR 0001 (PMS pillar), Phase 2.5 processo/prazos, Phase 0.5 trust stubs

## Context

The hub is a PMS OS. Processo and prazos exist. Financeiro is still empty. Full ERP (NF-e, boleto, plano de contas, folha) is out of early phases. We need a thin, audited money surface tied to `caso_id` + `office_id` before any UI or PA tool.

## Decision

1. **One aggregate in this ADR:** case **honorários** (fee lines). Kind v0 = `contratado` only.
2. **Out of scope (explicit):** custas, faturas/NF-e, boleto/PIX, plano de contas, conciliação, impostos, repasse, multi-currency, PA/MCP money tools, full finance UI.
3. **Money shape.** Amounts are integer **centavos BRL** (`BIGINT` / number). No floats on the wire.
4. **Tenancy + ACL.** Every row has `office_id` + `caso_id`. Reads/writes go through existing case membership + classification clearance (`CasosService.obter`). Cross-office → 404. Non-member → 403.
5. **Who writes.** Only `socio` or `gestor` may append a fee line. Estagiário/advogado read if they have case membership.
6. **Append-only.** No PATCH/DELETE of fee lines in v0. Corrections are a later ADR (reversal lines).
7. **Audit fail-closed.** Every successful append is audited **before** the HTTP 201 returns. Audit arguments must **not** include the raw amount (only `lancamentoId`, `casoId`, `officeId`, `kind`). Audit write failure → 503 and no durable line (or rollback).
8. **Schema missing.** If HubLegal is configured but `caso_honorarios` is absent → 503 fail-closed (same spirit as retention).
9. **Demo without DB.** In-memory ledger for provas when `DB_*` is unset, still keyed by office + case membership shadow for socio writers.

## Consequences

- Evidence: `pnpm --dir server run prova:financeiro`.
- UI and custas/faturas need follow-up ADRs or plan tasks; do not expand this module into ERP in the same PR.
- Issue #1 residuals (durable MFA, CRM office predicates) still apply before claiming full trust exit; money paths here already require hub identity + case ACL.

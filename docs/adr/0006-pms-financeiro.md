# ADR 0006 — Simple case money

- **Status:** Proposed
- **Date:** 2026-10-20
- **Deciders:** Bossmann (product and privacy), Zupelli (store) — pending acceptance
- **Plan:** Phase 7 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 names financeiro as part of the PMS, phased after processo and prazos. The case screen already shows process facts, prazos, and the banking checklist. There is no place to record what the office charged or spent on a case. A full ERP (boletos, tax, payroll, client trust accounts, bank files) is a different product.

## Decision

1. **One case ledger, not an ERP.** The hub stores honorários, custas, and a simple fatura on a case. It does not issue boletos, talk to a bank, calculate tax, run payroll, or hold client funds.
2. **Table `caso_lancamentos` in `HubLegal`.** Columns: `id` (`lan_` + 16 hex), `office_id`, `caso_id`, `kind` (`honorario` | `custa` | `fatura`), `descricao` (1 to 160 characters), `centavos` (bigint, zero or positive, BRL only), `status` (`rascunho` | `lancado`), `fatura_id` (nullable, another row of kind `fatura`), `created_by`, `created_at`. No floating point. No second currency.
3. **The same case gate as the capa.** Reads call `autorizarCapa`. Another office is 404. A same-office user without membership or clearance is 403. Writes require `papel = socio` after that gate. There is no DELETE. A `rascunho` may be replaced by the same sócio. A `lancado` row is immutable. A row with `fatura_id` set is immutable.
4. **A fatura is a frozen sum.** `POST` of a fatura, sócio only, adds the `centavos` of `lancado` honorário and custa rows on that case whose `fatura_id` is null. It writes one `fatura` row with `status = lancado` and that sum, and sets `fatura_id` on those rows, in one database transaction. An empty set is 400 and writes nothing.
5. **Audit is fail-closed and comes before commit.** Every create, replace, and fatura records the tool name, the case id, the lançamento id, the kind, and the centavos. It does not record the client name, a CPF, or a phone. If the audit write fails, the transaction rolls back and the response is 503.
6. **The case screen shows it.** A Financeiro tab lists the rows and the open total. A sócio can add an honorário or a custa, replace a rascunho they created, and generate a fatura. Anyone who can read the case can see the list. The model is not given this table, and this phase adds no PA tool.
7. **Legal hold does not grow a delete path.** Money rows are not deleted. Case hold stays the existing case-row rule.

## Alternatives rejected

- **Full ERP, boletos, or a bank file.** Out of this phase.
- **Decimal reais in the column.** Floats drift. The column is centavos.
- **A fatura that stays editable.** The sum would stop being a record.
- **Any office member can write amounts.** Money writes stay with the sócio. Reading stays with the case gate.

## Consequences

- Phase 7 code follows this contract. Moving this ADR from Proposed to Accepted remains Bossmann's decision.
- Nothing here claims legal compliance. The legal assessment and the DPO's remain with the office.
- ADR 0003 stays Proposed. No linked-provider work comes from this ADR.

## Not decided here

- Taxes, retainers that are not a single honorário line, and installments.
- Whether an advogado on the case may later record a custa.
- Export of the fatura to PDF.

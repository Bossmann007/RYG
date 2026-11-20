# ADR 0007 — Practice-area packs

- **Status:** Proposed
- **Date:** 2026-10-20
- **Deciders:** Bossmann (product and privacy), Gabriel (connectors) — pending acceptance
- **Plan:** Phase 8 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 puts practice-area connectors in Backstage, with bancário first. The live catalog is `CATALOGO_BANCARIO` in `server/src/modules/catalog/banking-catalog.ts`. Each row is a `CatalogItem` with `kind` of `prompt`, `skill`, `mcp`, or `tool`, and `area` fixed to `"bancario"`. Process capas already sit behind `ProcessSource` (`fixture`, `datajud`, `eproc`, `manual`, `upload`). A second area is a different pack of those same rows, not a second product.

## Decision

1. **A pack is data in the existing catalog.** One TypeScript value next to `CATALOGO_BANCARIO`. No new table, no plugin loader, and no new app. The three catalogs stay separate. A pack does not merge the PA allowlist or the SafeDTO wire contract.
2. **The pack shape is the current row plus one default.** `id` is a short area id (`bancario` is the first). `titulo` is the label. `processSourceDefault` is one `ProcessSourceKind`. `itens` is `CatalogItem[]`. Each item keeps `id`, `kind`, `titulo`, `descricao`, and `requerSafeDto`. `corpo` and `endpoint` stay optional. An item's `area` equals the pack `id`.
3. **Bancário is that pack already.** Its id is `bancario`. Its default process source stays whatever `PROCESS_SOURCE` selects today. Unconfigured kinds stay fail-closed. This ADR does not add a second pack and does not change `PROCESS_SOURCE`.
4. **A second area waits for one office.** No new area id ships until one office has run the bancário wedge in production. Until then, `CatalogItem["area"]` stays the literal `"bancario"`.
5. **Sibling tools stay rows.** DataJud, DJEN, and the CPC prazo script stay catalog entries. They do not become their own hub. A pack adds no SQL, shell, or filesystem tool, and it adds no PA tool.
6. **Private egress does not move.** A row with `requerSafeDto` still leaves only through SafeDTO. The linked-provider row keeps no endpoint. ADR 0003 stays Proposed.

## Alternatives rejected

- **One pack per repository or per running service.** That splits the hub the thesis forbids.
- **A database of packs before the second area exists.** `CATALOGO_BANCARIO` is already the registry. A table earns its place when a second area is real.
- **A free-string area on every item now.** Widening `area` before a second pack only adds a field nothing reads.

## Consequences

- Phase 8 code, when it starts, follows this shape. Moving this ADR from Proposed to Accepted remains Bossmann's decision.
- The second-area checkbox in the plan stays open until the production gate in decision 4.
- Nothing here claims legal compliance. The legal assessment and the DPO's remain with the office.

## Not decided here

- The name of the second area.
- Whether a pack may override `PROCESS_SOURCE` per case.
- Install of a pack by an office admin in the UI.

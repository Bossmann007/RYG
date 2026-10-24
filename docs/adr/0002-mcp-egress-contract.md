# ADR 0002 — Single MCP egress contract

- **Status:** Accepted on 2026-10-24 (proposed 2026-09-26)
- **Date:** 2026-09-26
- **Deciders:** Bossmann (SafeDTO / AI Gateway policy owner)
- **Plan:** Phase 0.2 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)
- **Evidence:** `pnpm --dir server run build && pnpm --dir server run prova:mcp-safedto` proves the Nest path over HTTP. `pnpm evidence` covers the package and the stdio harness.

## Context

ADR 0001 §5 locks one office MCP behind Nest policy. ADR 0001 §9 locks SafeDTO as private egress only. When this ADR was proposed, the code had two egress shapes:

- `privacy-gateway/src/domain/safe-dto.ts` defines `SafeDTO` (`schemaVersion: '1'`, `sessionId` with the `ofs_` prefix, `releaseId` with the `rel_` prefix). `validateSafeDto` rejects unknown fields, caps list and field sizes, and blocks credentials, paths, and stack traces. `serializeSafeDtoForMcp` is the only wire serializer. `EgressFirewall` inspects the serialized bytes. The stdio server (`privacy-gateway/src/mcp/stdio-server.ts`) takes role and user from env, so it has no Nest identity, `office_id`, or RBAC.
- `server/src/models/safe-dto.model.ts` defines `EnvelopeSafe<T, C>` (`tipo`, `conteudo`, `declassificacao`). `ToolCatalogService` returns it from `enter_office`, `get_safe_summary`, `search_safe_knowledge`, and `get_safe_update`, which `McpController` serves at `POST /api/mcp` with identity, policy, and audit. Nothing checked `EnvelopeSafe` at runtime, and it had no `ofs_` or `rel_` ids and no firewall.

`privacy-gateway` is an ESM package. Nest compiles to CommonJS.

## Decision

**Principle.** SafeDTO is egress only. Hub truth stays in Nest/TiDB. SafeDTO is not the RAG index, and no model reads the DB or the filesystem directly.

1. **Canonical egress contract = `privacy-gateway` SafeDTO.** Anything that leaves the trust zone through MCP is validated by `validateSafeDto`, serialized by `serializeSafeDtoForMcp`, and inspected by `EgressFirewall`. `EnvelopeSafe` is not an egress contract. It survives only as a Nest-internal intermediate that is mapped to SafeDTO before it reaches the wire.
2. **Choice (A): Nest `/api/mcp` delegates to the `privacy-gateway` package.** Nest keeps transport, identity, `office_id`, RBAC, and audit. Every tool result goes through the package's validator, serializer, and firewall before it reaches the transport. Nest never writes its own egress bytes.
3. **Catalogs stay separate.** The UI catalog (`server/src/modules/catalog`), Nest `ToolCatalogService`, and the stdio allowlist (`privacy-gateway/src/mcp/tool-contract.ts`) remain three lists. This ADR unifies the output contract only, not the tool names. The stdio server stays as the test and evidence harness.

Option (B), deprecating the Nest tool list until it was wired, was rejected. `McpController` is the only MCP surface with Nest identity and policy, and ADR 0001 §5 requires that surface. B would have made the stdio server the de facto office MCP and would have been reversed as soon as A landed.

The interim rule that froze `/api/mcp` until A shipped is retired.

## How Choice (A) is wired

- **Packaging.** The `privacy-gateway` `build` script runs `tsc` and emits ESM plus declarations to `privacy-gateway/dist/`. Its `exports` and `types` fields point at `dist/src/index.js` and `dist/src/index.d.ts`. `server` depends on `@openlegalai/privacy-gateway` as `workspace:*`, and the `server` `build` script builds the package first.
- **ESM from CommonJS.** Nest takes types with `import type`, which is erased. `SafeDtoEgressService` loads the package at runtime with `await import()`. With `module: commonjs`, tsc lowers that call to `require()`, and Node 20.19 and later load an ESM package through `require(esm)`. If the load fails, the call is denied with `EGRESS_UNAVAILABLE` and audited, and the rest of the hub keeps running.
- **One release path.** `releaseForMcp` in `privacy-gateway/src/mcp/mcp-release.ts` runs `validateSafeDto`, `serializeSafeDtoForMcp`, and `EgressFirewall.inspect`, in that order. It returns the DTO and wire bytes, or a stable code with the stage that refused (`contract` or `firewall`). `McpOfficeServer` and `SafeDtoEgressService` both call it.
- **Mapping.** `server/src/modules/gateway/safe-dto-egress.service.ts` maps each `EnvelopeSafe` variant with an exhaustive switch over `QualquerSafeDTO`. A new variant fails to compile until it has a mapping.
- **Gateway order.** `GatewayService.executar` runs identity, policy, argument validation, execution with declassification, SafeDTO release, and then audit. A refused release is audited as `negado` with its code, such as `FIREWALL_BR_PATTERN` or `SAFE_DTO_INVALID:field_too_long`. The client gets `isError` and no SafeDTO body. An allowed call returns `structuredContent` set to the validated DTO and one text block that holds the released wire bytes.

The mapping per tool:

| Tool | `tipo` | `summary` | `decisions` | `tasks` | `safeReferences` |
|---|---|---|---|---|---|
| `enter_office` | `office_manifest` | Office, role, policy, and tool names | One per declassification ceiling | None | None |
| `get_safe_summary` | `case_summary` | `situacao` | Phase, court and chamber, chamber orientation, and subjects | None | None |
| `search_safe_knowledge` | `knowledge_result` | Count and query subjects | None | None | One `public_jurisprudence` per precedent, up to `LIST_MAX` |
| `get_safe_update` | `strategic_update` | `sintese` | None | One open task per `recomendacao` item | None |

Every variant maps `declassificacao.omitido` to `warnings` with the code `omitted`.

## Consequences

- `EnvelopeSafe` is Nest-internal. No client sees `tipo`, `conteudo`, or `declassificacao`.
- `/api/mcp` is stateless, so each call gets a fresh random `ofs_` session id and `rel_` release id. The ids are not derived from the user, so ids alone cannot link two releases to one person.
- The CNJ number in `referencia` of `case_summary` and `strategic_update` is not mapped. The firewall rejects CNJ-shaped strings, and the caller already sent the number as an argument.
- `search_safe_knowledge` lists at most `LIST_MAX` (5) references. A `references_truncated` warning counts the precedents left out.
- SafeDTO v1 has no field for ementa text. Ementas stay in the hub, and an `ementa_withheld` warning says so. Carrying citable public ementas needs a SafeDTO schema bump in `privacy-gateway`, never a Nest-side shape.
- The firewall cannot tell public data from client data. A precedent with no acórdão number uses its CNJ process number as `referencia`, so any search that returns it is denied with `FIREWALL_BR_PATTERN`. Allowing it needs a provenance-aware rule in `privacy-gateway`, and the SafeDTO policy owner makes that call.
- Phase 0.3 removed `faixaDeRisco` from `get_safe_update`. SafeDTO has no risk-band field, which matches the no-win-% decision.
- Hub team traffic (chat, casos, wiki) does not pass through SafeDTO. Only data leaving the trust zone does (ADR 0001 §5).
- Catalog copy says linked-provider, not BYOAI. The item `mcp-office-export` points at `/api/mcp`.

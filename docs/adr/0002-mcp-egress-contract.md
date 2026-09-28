# ADR 0002 — Single MCP egress contract

- **Status:** Proposed (the code does not implement this yet)
- **Date:** 2026-09-26
- **Deciders:** Bossmann (SafeDTO / AI Gateway policy owner)
- **Plan:** Phase 0.2 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 §5 locks one office MCP behind Nest policy. ADR 0001 §9 locks SafeDTO as private egress only. The code has two egress shapes today:

- `privacy-gateway/src/domain/safe-dto.ts` defines `SafeDTO` (`schemaVersion: '1'`, `sessionId` with the `ofs_` prefix, `releaseId` with the `rel_` prefix). `validateSafeDto` rejects unknown fields, caps list and field sizes, and blocks credentials, paths, and stack traces. `serializeSafeDtoForMcp` is the only wire serializer. `McpOfficeServer` (`privacy-gateway/src/mcp/mcp-office-server.ts`) revalidates and firewalls every release. Only this path is covered by `pnpm evidence`. It runs over stdio with role and user taken from env, so it has no Nest identity, `office_id`, or RBAC.
- `server/src/models/safe-dto.model.ts` defines `EnvelopeSafe<T, C>` (`tipo`, `conteudo`, `declassificacao`). `ToolCatalogService` (`server/src/modules/gateway/tool-catalog.service.ts`) returns it from `enter_office`, `get_safe_summary`, `search_safe_knowledge`, and `get_safe_update`. `McpController` (`server/src/modules/mcp/mcp.controller.ts`) serves those tools at `POST /api/mcp` with `IdentityService`, `PolicyService`, and audit on denied calls. Nothing runtime checks `EnvelopeSafe`. It has no `ofs_` / `rel_` ids and no firewall. `get_safe_update` no longer returns a risk band (`faixaDeRisco` removed in Phase 0.3).

`server/package.json` does not depend on `@openlegalai/privacy-gateway`. The package is ESM with no `exports`. Nest compiles to CommonJS. `McpController` already loads ESM through a dynamic `import()`.

## Decision

**Principle.** SafeDTO is egress only. Hub truth stays in Nest/TiDB. SafeDTO is not the RAG index, and no model reads the DB or the filesystem directly.

1. **Canonical egress contract = `privacy-gateway` SafeDTO.** Anything that leaves the trust zone through MCP is validated by `validateSafeDto` and serialized by `serializeSafeDtoForMcp`. Session ids carry `ofs_` and release ids carry `rel_`. `EnvelopeSafe` is not an egress contract. It may survive only as a Nest-internal intermediate that is mapped to SafeDTO before it reaches the wire.
2. **Choice (A): Nest `/api/mcp` delegates to the `privacy-gateway` package.** Nest keeps transport, identity, `office_id`, RBAC, and audit. Every tool result goes through the package's validator, serializer, and firewall before it reaches the transport. Nest never writes its own egress bytes.
3. **Catalogs stay separate.** The UI catalog (`server/src/modules/catalog`), Nest `ToolCatalogService`, and the stdio allowlist (`privacy-gateway/src/mcp/tool-contract.ts`) remain three lists. This ADR unifies the output contract only, not the tool names. The stdio server stays as the test and evidence harness.
4. **Interim rule until A ships.** `/api/mcp` is non-canonical. Add no new Nest MCP tools and no new `EnvelopeSafe` variants. Do not describe `/api/mcp` as SafeDTO-compliant.

Option (B), deprecating the Nest tool list until it is wired, was rejected. `McpController` is the only MCP surface with Nest identity and policy, and ADR 0001 §5 requires that surface. B would make the stdio server the de facto office MCP and would be reversed as soon as A landed.

## Consequences

- The wiring task is follow-up work, not part of this ADR. Add the workspace dependency, expose the package entry points, map each Nest tool to a SafeDTO, and put `McpOfficeServer.release`-style validation plus the firewall on the Nest path. Status becomes Accepted when `POST /api/mcp` returns SafeDTO bytes that `validateSafeDto` accepts and a test proves it.
- Phase 0.3 removed `faixaDeRisco` from `get_safe_update`. SafeDTO still has no field for a risk band, which matches the no-win-% decision.
- SafeDTO carries `summary`, `decisions`, `tasks`, `safeReferences`, and `warnings`. Precedent metadata from `search_safe_knowledge` must fit `safeReferences` (`public_jurisprudence`) or wait for a SafeDTO schema bump in `privacy-gateway`, never a Nest-side shape.
- Hub team traffic (chat, casos, wiki) does not pass through SafeDTO. Only data leaving the trust zone does (ADR 0001 §5).
- The UI catalog item `mcp-office-export` in `server/src/modules/catalog/banking-catalog.ts` still points at `/api/mcp` and says "BYOAI". Fixing that copy is product code and is left to the wiring task.

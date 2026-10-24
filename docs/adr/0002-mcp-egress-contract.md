# ADR 0002 — Single MCP egress contract

- **Status:** Accepted
- **Date:** 2026-09-26 (Accepted 2026-10-24)
- **Deciders:** Bossmann (SafeDTO / AI Gateway policy owner)
- **Plan:** Phase 0.2 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)
- **Evidence:** `node server/scripts/prova-mcp-safedto.js`; mapping in `server/src/modules/gateway/safe-dto-egress.service.ts`

## Context

ADR 0001 §5 locks one office MCP behind Nest policy. ADR 0001 §9 locks SafeDTO as private egress only. The code had two egress shapes:

- `privacy-gateway` SafeDTO (`ofs_` / `rel_`) with `validateSafeDto`, `serializeSafeDtoForMcp`, and `EgressFirewall`.
- Nest `EnvelopeSafe` returned from `ToolCatalogService` at `POST /api/mcp` with no SafeDTO validation on the wire.

## Decision

1. **Canonical egress contract = `privacy-gateway` SafeDTO.** Nest keeps transport, identity, `office_id`, RBAC, and audit. Every allowed `tools/call` maps `EnvelopeSafe` → SafeDTO via `SafeDtoEgressService`, then validate + serialize + firewall before the client sees bytes.
2. **Choice (A):** Nest `/api/mcp` delegates egress shaping to the privacy-gateway package (`@openlegalai/privacy-gateway` workspace dependency).
3. **Catalogs stay separate.** UI catalog, Nest `ToolCatalogService`, and stdio allowlist remain three lists.
4. **Stdio** remains the evidence harness without Nest `office_id`.

## Consequences

- `EnvelopeSafe` is Nest-internal only.
- Invalid SafeDTO or firewall hits are denied and audited; no SafeDTO body leaves.
- Catalog copy uses linked-provider (not BYOAI).

# ADR 0003 — Hub as MCP client of a user-linked provider

- **Status:** Proposed
- **Date:** 2026-09-29
- **Deciders:** Bossmann (product and privacy), Gabriel Henrique (implementation) — pending acceptance
- **Plan:** Phase 4 Task 4.2 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 §5 names three AI modes: none, linked-provider, and office-hosted. Linked-provider means the user links Claude or another provider through MCP with per-user credentials. The default stays consult-only.

Task 4.1 shipped the other direction. The lawyer runs Claude or Cursor connected to the hub MCP (`POST /api/mcp`), and the Xirp case panel shows run metadata (tool name, release id, cite status, SafeDTO summary). ADR 0002 makes `privacy-gateway` SafeDTO the only egress contract.

What does not exist: the hub calling a provider on the user's behalf, any place to keep a provider credential, and a signed DPA. `docs/dpa-modelo.md` is a template with blank fields. Today's vault (`server/src/modules/vault/`, key `HUB_VAULT_KEY`) is in memory and a restart wipes it. The wiki personal vault and hardvault hold notes, not credentials.

## Decision

1. **The hub may act as an MCP client of a provider linked by the user** (Claude or another), so the lawyer can get an answer inside the hub and review it in Xirp. This is optional. The hub core keeps working with no model.
2. **Credentials are per user and encrypted.** No default office-wide key. One user's link is never used for another user's request. Revoking or disabling a user (JML) removes the link.
3. **A separate credential store.** It is not the in-memory ciphertext vault (`HUB_VAULT_KEY`) and not the wiki (personal vault or hardvault). It has its own key, its own table or store, and its own access path. The vault and the wiki gain no new duties from this ADR. The shape of the store (KMS, envelope encryption, rotation) is a follow-up decision, not fixed here.
4. **Consult-only by default.** The provider may read and summarize. No tool that changes a case, no WhatsApp send, no write to the acervo. A mode with tools stays role-gated and post-v0 (ADR 0001).
5. **Private data reaches the provider only as SafeDTO.** Every payload sent out goes through `validateSafeDto`, `serializeSafeDtoForMcp`, and the firewall (ADR 0002). The model never reads TiDB or the filesystem. The provider's reply is untrusted text: it is sanitized, stored as run metadata under the Xirp rules, and never becomes hub truth.
6. **Off in production until the DPA is signed.** MCP of an external provider in production stays disabled until the DPA based on [`../dpa-modelo.md`](../dpa-modelo.md) is signed by both parties. This ADR being accepted does not turn anything on. It also does not use the term BYOAI.
7. **Every outbound call is auditable.** Audit records the user, the provider name, the tool, and the release id, never the credential and never the payload body. If the audit write fails, the call fails (fail-closed), as on the inbound path. Each outbound transfer gets a line in the international-transfer register (ADR 0001).

## Alternatives rejected

- **One office-wide provider key.** It hides who asked and makes offboarding a shared-secret rotation.
- **Reuse `HUB_VAULT_KEY` or the wiki vault for credentials.** The vault is memory-only and the wiki holds lawyer notes. Mixing them widens the blast radius of both.
- **Give the provider direct DB or file access.** Breaks ADR 0001 §9 and ADR 0002.
- **Let the hub call providers with write tools now.** Consult-only is the product default. Tools that change a case need their own role gate and ADR.

## Consequences

- No client code, route, table, or credential is added by this ADR. Task 4.2 code waits for status Accepted.
- Acceptance requires: the credential-store shape agreed; a plan for the user link flow (OAuth or token paste) with no secret in logs, audit, or checkpoint; the outbound path proven to send only SafeDTO bytes; and the DPA question answered for each provider that would be enabled.
- Moving from Proposed to Accepted is a decision for Bossmann. Turning a provider on in production is a separate decision that also needs the signed DPA.
- Nothing here claims legal compliance. The legal assessment and the DPO's remain with the office.

## Not decided here

- Which providers are supported first.
- The credential store's technology and key custody.
- Whether the answer is streamed or returned whole.
- The retention period of stored replies. No retention period is set by this ADR.

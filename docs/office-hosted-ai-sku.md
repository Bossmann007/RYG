# Office-hosted AI SKU (stub)

Phase 6.4 packaging note. Not a billing system.

## Flag

Set `OFFICE_HOSTED_AI=true` in the Nest process env to enable the **office-hosted** consult runtime on `POST /api/rag/consult` with `runtime: "office-hosted"`.

Without the flag, linked-provider consult still works. Office-hosted requests return 403.

## Sales one-liner

**Hub base** = PMS + wiki + connectors + optional linked-provider consult (SafeDTO on egress).  
**Hub + office-hosted consult** = same hub with an in-trust-zone model runtime for retrieval packs (`OFFICE_HOSTED_AI`).

Capability remains **consult** (retrieval-only). PA mode is Phase 6.5 and stays off.

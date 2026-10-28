# Process stubs — DSAR, incident, DPA

Phase 5.0c. **Technical process stubs.** These pages do not claim LGPD certification or legal adequacy. A DPO (or counsel) decides legal outcomes.

## DSAR request inbox (stub)

**Channel:** office email alias `privacidade@<escritorio>` (configure per tenant; not hard-coded here).  
**Owner:** socio or designated privacy contact.  
**SLA target (operational):** acknowledge in 2 business days; track in a private case note with `classification` at least `sigiloso`.

Minimum fields to log when a request arrives:

- Requester identity claim (name + contact)
- Office id
- Request type (access / correction / deletion / portability)
- Linked `caso_id` if known
- Legal hold check before any delete (`GET /api/casos/:id/retention`)

Hub v0 has no public DSAR form. Intake is manual. Do not auto-delete from chat or email.

## Incident runbook (stub)

1. **Detect** — audit JSONL deny spikes, SafeDTO firewall codes, or operator report.
2. **Contain** — revoke bearer tokens (`demo-off` pattern / JML disable), disconnect WhatsApp stub/OAuth, freeze MCP egress if needed.
3. **Assess** — whether personal data left the trust zone without SafeDTO.
4. **ANPD path** — if counsel decides notice applies, prepare within **3 business days** of awareness. This stub does not decide when notice is required.
5. **Remediate** — rotate secrets, patch the failing gate, append incident id to audit notes.
6. **Close** — write a short post-mortem under office control (not in the public repo).

## DPA + no-training clause (stub)

Before enabling **external** MCP / linked-provider in production:

- Sign a DPA between the office and the provider.
- Include a **no-training** clause (provider must not train models on office prompts or SafeDTO releases).
- Record the provider name, contract date, and runtime mode (`linked-provider` vs `office-hosted`) in office ops notes.
- Keep Meta WhatsApp keys and LLM API keys only in env / secret manager.

Office-hosted SKUs still need classification + ACL on retrieval; SafeDTO still applies when data leaves the trust zone.

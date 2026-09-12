# Privacy Gateway (thin-C / architecture v2)

Deny-by-default egress for OpenLegalAI. External LLMs receive only `SanitizedContext`.

## Quick proof (V1 evidence)

```bash
cd privacy-gateway
npm install
npm test
npm run demo
```

If any forbidden literal reaches `MockExternalProvider`, tests fail via `ForbiddenStringSpy`.

## Layout

- `src/gateway` — Nest-ready orchestrator (plain TS for V1 speed)
- `src/pii` — deterministic BR PII + optional Presidio HTTP client
- `presidio-sidecar` — local analyze stub (`python main.py`)
- `test/adversarial.test.ts` — fail-closed proofs

## MCP note

HTTP tool today: `get_sanitized_case_summary`. Same allowlist intent for future MCP. Never `execute_sql`.

## LGPD

Technical controls only. Not a compliance claim. DPO review required before production.

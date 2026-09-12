# Privacy Gateway / Virtual Office (SafeDTO v3)

Thesis: private office context never returns to the native AI UI as raw or redacted documents. MCP tool results are **SafeDTO only**.

Thin-C BR PII redaction remains an **internal DLP stage**, not the product proof.

## Evidence

```bash
cd /Users/bossmann/openlegalai && npm run evidence
```

## MCP tools (allowlist)

- `enter_office` / `leave_office`
- `get_safe_summary` / `ask_office`

Forbidden: `execute_sql`, `get_raw_document`, etc.

## Layout

- `src/mcp` — BYOAI MCP serialization gate + byte spy
- `src/declassify` — information-destroying SafeDTO builder (no Ollama)
- `src/policy/release-policy.ts` — role-based SafeDTO richness
- `src/pii` — DLP stage only

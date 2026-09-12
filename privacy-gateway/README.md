# Privacy Gateway / Virtual Office (SafeDTO v3)

Thesis: private office context never returns to the native AI UI as raw or redacted documents. MCP tool results are **SafeDTO only**.

Thin-C BR PII redaction remains an **internal DLP stage**, not the product proof.

These are technical controls. They are not a statement of legal compliance.

## Evidence

```bash
cd /Users/bossmann/openlegalai && npm run evidence
```

The demo prints intern vs partner SafeDTO bytes, a denied `execute_sql` call, and a planted firewall fail-closed.

## MCP stdio (Inspector)

Identity comes from the process environment, never from tool arguments.

```bash
cd privacy-gateway
npx @modelcontextprotocol/inspector --cli ./scripts/run-mcp.sh --method tools/list -e OFFICE_USER_ID=adv-ana -e OFFICE_ROLE=advogado
```

Observed on 2026-09-12 (Inspector CLI 2.6): `tools/list` returned `enter_office`, `leave_office`, `get_safe_summary`, `ask_office` with JSON Schema and `additionalProperties: false`.

```bash
npx @modelcontextprotocol/inspector --cli ./scripts/run-mcp.sh --method tools/call --tool-name enter_office --tool-arg caseId=case-banco-001 -e OFFICE_USER_ID=adv-ana -e OFFICE_ROLE=advogado
```

Observed: `isError: false` and SafeDTO bytes (`schemaVersion: "1"`, `ofs_*`, `rel_session`, no case body).

`get_safe_summary` after `enter_office` was recorded with the in-repo SDK client (`npm run mcp:smoke`) because Inspector CLI starts a new process per invocation. Same stdio server, same SafeDTO wire.

Web UI (do not commit tokens):

```bash
npx @modelcontextprotocol/inspector ./scripts/run-mcp.sh -e OFFICE_USER_ID=adv-ana -e OFFICE_ROLE=advogado
```

## MCP tools (allowlist)

- `enter_office` / `leave_office`
- `get_safe_summary` / `ask_office`

Forbidden: `execute_sql`, `get_raw_document`, and any `user` / `role` key in arguments.

## Layout

- `src/mcp` — in-process `McpOfficeServer` plus stdio adapter (`stdio-server.ts`)
- `src/declassify` — information-destroying SafeDTO builder (no Ollama)
- `src/policy` — role richness and authorized declassification templates
- `src/firewall` — independent byte check after serialize
- `src/pii` — deterministic BR DLP stage only. Presidio stays a future option in the research notes. There is no in-repo client.

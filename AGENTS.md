## Learned User Preferences

- Prefer design and architecture approval before product code on this repo.
- Treat privacy and professional secrecy as architecture requirements (deny-by-default, fail-closed), not optional features.
- Do not claim LGPD compliance in docs or pitch; describe technical controls and leave legal or DPO judgment explicit.
- Prefer a thin vertical slice with adversarial evidence first, then deepen only if time remains.
- Prefer hybrid ownership: Nest or TypeScript for policy and audit orchestration; Python only for Presidio or sanitization.
- External review findings arrive as numbered P0 and P1 lists; fix them with the smallest diff that holds the invariant.
- Verify that claimed prerequisites are actually implemented before building the next layer on top of them.
- Prefer reimplementing a security pattern in-repo over adding a dependency; credit reference projects conceptually in the docs.
- Use fictional case data only, and keep local model runtimes such as Ollama out of the current slice.
- Prefer Portuguese in chat; keep code identifiers and file contents in English unless the project is PT-first.
- Prefer `/poteto-mode` for non-trivial architecture and security design work.
- When locked context is provided, resume from it instead of reopening the problem from scratch.

## Learned Workspace Facts

- Active GitHub repo is `joaozupeli/openlegalai`; the user `Bossmann007` has collaborator access.
- User owns LGPD and AI-usage work; teammates own frontend and EPROC or DataJud connector research.
- Product framing is private institutional legal memory with a mandatory privacy gateway, not another standalone legal chatbot.
- External AI is untrusted and may receive only a validated SafeDTO across the MCP boundary, never raw context, database, filesystem, or vector access.
- Egress must destroy information through declassification; token redaction is only an internal DLP stage.
- `SafeDTO` is the frozen egress contract, carrying opaque `ofs_` session ids and `rel_` release ids.
- Egress enforces four layers: classification labels, taint provenance, a typed presenter allowlist, and an independent byte firewall.
- Gateway code lives in `privacy-gateway/` on branch `enzo`; `npm run evidence` at the repo root runs typecheck, tests, demo, and MCP stdio smoke.
- MCP identity is the connection principal (`OFFICE_USER_ID` / `OFFICE_ROLE` on stdio). Tool arguments must not carry `user` or `role`.
- Stdio server is `npm run mcp` in `privacy-gateway/`. Inspector CLI was used for `tools/list` and `enter_office`; `npm run mcp:smoke` covers `get_safe_summary` in one process.
- Current architecture doc is `docs/architecture/privacy-gateway-v3.md`; the v2 doc is kept as DLP-stage notes.
- Research notes live under `docs/research/fase1-*.md` and `docs/architecture/virtual-law-office-phase1.md`.
- Hackathon reference PDFs and materials live under `/Users/bossmann/Hackaton`.
- `main` already has a NestJS plus React demo for process and jurisprudence research; privacy-gateway work is greenfield relative to that app.

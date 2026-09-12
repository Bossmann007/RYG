## Learned User Preferences

- Prefer design and architecture approval before product code on this repo.
- Treat privacy and professional secrecy as architecture requirements (deny-by-default, fail-closed), not optional features.
- Do not claim LGPD compliance in docs or pitch; describe technical controls and leave legal or DPO judgment explicit.
- Prefer a thin vertical slice with adversarial evidence first, then deepen only if time remains.
- Prefer hybrid ownership: Nest or TypeScript for policy and audit orchestration; Python only for Presidio or sanitization.
- Prefer Portuguese in chat; keep code identifiers and file contents in English unless the project is PT-first.
- Prefer `/poteto-mode` for non-trivial architecture and security design work.
- When locked context is provided, resume from it instead of reopening the problem from scratch.

## Learned Workspace Facts

- Active GitHub repo is `joaozupeli/openlegalai`; the user `Bossmann007` has collaborator access.
- User owns LGPD and AI-usage work; teammates own frontend and EPROC or DataJud connector research.
- Product framing is private institutional legal memory with a mandatory privacy gateway, not another standalone legal chatbot.
- External LLMs are untrusted and must receive only `SanitizedContext`, never direct database, filesystem, or vector access.
- Fase 1 open-source research notes live under `docs/research/fase1-*.md`.
- Architecture draft for the privacy gateway lives at `docs/architecture/privacy-gateway-v2.md`.
- Hackathon reference PDFs and materials live under `/Users/bossmann/Hackaton`.
- `main` already has a NestJS plus React demo for process and jurisprudence research; privacy-gateway work is greenfield relative to that app.

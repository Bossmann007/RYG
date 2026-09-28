# RYG / OpenLegalAI

Office hub (**PMS + wiki + connectors + team chat**). Optional AI via AI Gateway. **Not** a legal chatbot.

**Thesis / Decisions:** [`PROJECT.md`](PROJECT.md) (source of truth). Architecture: [`docs/adr/0001-hub-north-star.md`](docs/adr/0001-hub-north-star.md). Plan: [`docs/plan/hub-office-platform.md`](docs/plan/hub-office-platform.md).

## Package manager

**pnpm only** (`packageManager`: pnpm@9.15.4). Do not commit `package-lock.json`. Use Corepack or install pnpm 9+.

```bash
corepack enable
pnpm install                 # workspace: client + server + privacy-gateway
```

## Run

```bash
# terminal 1
pnpm dev:server              # Nest → http://127.0.0.1:3000

# terminal 2
pnpm dev                     # Vite → http://localhost:8080
```

Env templates (no secrets): `server/.env.example`, `client/.env.example`. Copy to `.env` locally — never commit real `.env`.

## Evidence / CI locally

```bash
pnpm evidence                # privacy-gateway typecheck + test + demo + mcp smoke
pnpm build:server
pnpm build:client
pnpm lint:measure            # max-file-lines warn; exit 0 always
```

GitHub Actions: `.github/workflows/ci.yml` runs evidence + builds on push/PR to `main`/`develop`.

## Layout

| Path | What |
|------|------|
| `client/` | React + Vite |
| `server/` | NestJS `/api` |
| `privacy-gateway/` | SafeDTO / MCP egress |
| `docs/` | ADR + plan + ops |
| `scripts/` | automation |
| `tooling/` | eslint custom rules |

## Contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Outside closed v0 P0 → GitHub issue, not product code.

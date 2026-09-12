# Prompt Cursor — DEMO ONLY (OpenLegalAI)

Cole **tudo abaixo da linha** numa conversa nova do Cursor, com o repo `openlegalai` aberto.

Referência estrutural obrigatória: o Nest do [joaozupeli/buglan](https://github.com/joaozupeli/buglan) (`server/` + `client/`).

---

You are scaffolding a **DEMO ONLY** of OpenLegalAI inside this repo. Mirror the **NestJS backend layout of https://github.com/joaozupeli/buglan** (read that repo’s `server/` structure). Do NOT invent a random Nest layout. Do NOT clone buglan wholesale (no Buglan auth/S3/MariaDB product features). Copy the **folder conventions, path aliases, bootstrap style, and module pattern** — then implement OpenLegalAI research flow with fixtures.

## 0. Hard product rules

- DEMO ONLY with fixtures. No DataJud dump of ~1.2B rows. No Jusbrasil. No PJe/Projudi/e-SAJ scrapers.
- DataJud (later) = capa/andamento metadata via API — NOT ementa text.
- Process number is **always required**, even when the user imports a file.
- Each jurisprudence fixture should include chamber/organ + vote summary when possible.
- Compare the case chamber votes vs jurisprudence chambers → dissídio report + chance/blindagem.
- Cite-or-silent spirit: if ementa text is missing → mark cite unavailable (do not invent).
- One fictional banking happy-path. Zero real client PII.
- UI in Portuguese.

## 1. Repo shape (MUST match buglan layout)

Create:

```text
/
  package.json          # root scripts like buglan: dev (client), dev:server, build-*
  .env.example
  client/               # React + Vite + TypeScript (buglan uses Vue; HERE use React)
  server/               # NestJS — SAME structural DNA as buglan/server
    nest-cli.json
    package.json
    tsconfig.json       # SAME path aliases as buglan
    .env.example
    src/
      main.ts
      app.module.ts
      app.controller.ts
      app.service.ts
      common/           # filters, pipes, middlewares, decorators, guards (simplified)
      config/           # keep folder; DB optional/stub for demo
      models/           # optional stub; demo may skip Sequelize
      modules/          # feature modules
      fixtures/         # DEMO JSON for process + jurisprudences
  docs/                 # already exists — keep consistent
```

### Path aliases (copy from buglan `server/tsconfig.json`)

```json
"paths": {
  "@common/*": ["src/common/*"],
  "@config/*": ["src/config/*"],
  "@models/*": ["src/models/*"],
  "@plugins/*": ["src/plugins/*"],
  "@modules/*": ["src/modules/*"]
}
```

Wire the same aliases in Nest build (nest-cli / tsconfig) so imports like `@modules/research/...` and `@common/...` work.

### `server/src/main.ts` style (from buglan)

- `dotenv/config`
- Winston logger via `nest-winston` (or simple Nest Logger if you must slim deps — prefer winston to stay close)
- `helmet`
- **global prefix `api`**
- `enableCors()`
- global `HttpExceptionFilter` under `@common/filters`
- global `ValidationPipe` under `@common/pipes` (class-validator)
- `json` / `urlencoded` with generous limit (import may send metadata)
- listen on `APP_PORT` or 3000

### `server/src/app.module.ts` style (from buglan)

- `ConfigModule.forRoot()`
- import feature modules from `@modules/...`
- optional middlewares from `@common/middlewares` (LoggerMiddleware is enough for demo)
- **Do NOT** require full AuthenticationGuard + JWT + MariaDB for the demo. Prefer:
  - either skip APP_GUARD entirely for demo, OR
  - keep a minimal `@Public()` decorator pattern like buglan and mark research routes public
- Do NOT pull AWS S3 / Google OAuth / Socket.IO unless needed (not needed for demo)

### Module pattern (copy buglan authentication module shape)

Each feature lives in `server/src/modules/<name>/` with:

- `<name>.module.ts`
- `<name>.controller.ts`
- `<name>.service.ts`
- `<name>.dto.ts` (class-validator DTOs)

Use imports via aliases: `@modules/...`, `@common/...`.

## 2. OpenLegalAI modules to create (demo)

Create at least:

1. `modules/research` — orchestration endpoint (main demo API)
2. `modules/process` — resolve process capa (fixture adapter shaped like DataJud metadata)
3. `modules/jurisprudence` — search related juris fixtures (with votes/chambers)
4. `modules/dissidio` — compare chambers + build dissídio + chance/blindagem report

`ResearchService` should call process → jurisprudence → dissidio and return one payload.

### HTTP API (under global prefix `api`)

- `POST /api/research`
  - DTO: `{ processNumber: string; fileName?: string }`
  - `processNumber` required (CNJ-like string). `fileName` optional (import mode).
  - Response:
    - `process`: capa-like summary + `chamber` + `thesis`
    - `jurisprudences[]`: `id`, `court`, `chamber`, `ementaSnippet`, `voteSummary`, `alignment` (`for`|`against`|`diverge`|`unknown`), `citeStatus` (`ok`|`unavailable`)
    - `dissidioReport`: short narrative + conflicts table (case chamber vs other chambers)
    - `chanceReport`: heuristic score 0–100 + `blindagem[]` (points the opposing party could use from divergent votes)

Optional: `GET /api/health` on AppController.

### Fixtures

Put under `server/src/fixtures/`:

- one fictional banking process (mark DEMO/FICTÍCIO)
- 4–8 jurisprudences across at least 2 chambers with differing votes so dissídio is visible
- one item with missing ementa → `citeStatus: unavailable`

Happy path: submitting the fixture process number returns the full report.

## 3. Client (React — not Vue)

Buglan uses Vue in `client/`. OpenLegalAI uses **React + Vite + TypeScript** in `client/`, but keep the same top-level split (`client` + `server`) and root scripts.

UI:

1. Home with two modes: **Número do processo** | **Importar + número** (number still required)
2. Loading “Cruzando jurisprudências…”
3. Results page: process → juris list with votes → dissídio → chance/blindagem
4. Call `POST http://localhost:APP_PORT/api/research` (env `VITE_API_URL`)

Root `package.json` scripts (mirror buglan):

```json
{
  "scripts": {
    "dev": "cd client && pnpm install && pnpm run dev",
    "dev:server": "cd server && pnpm install && pnpm run start:dev",
    "build-client": "cd client && pnpm install && pnpm run build",
    "build-server": "cd server && pnpm install && pnpm run build"
  }
}
```

Prefer **pnpm** like buglan.

## 4. Explicitly out of scope for this demo

- Copying buglan business domain (usuarios, Google login, S3, WhatsApp)
- Sequelize/MariaDB mandatory setup (may stub `config/database` empty or skip)
- Real DataJud HTTP calls (fixture adapter only; leave a TODO comment for prod adapter)
- Embedding / vector DB / pandas / FastAPI

## 5. Docs to update after implementing

- README: how to run `pnpm dev:server` + `pnpm dev`, what is mocked
- Keep `docs/PRODUCT.md` / `docs/FLUXO.md` aligned
- Update `docs/ARCHITECTURE.md` to show `client/` + `server/src/{common,config,modules}` like buglan

## Done when

1. `server` starts with Nest structure recognizably like buglan (aliases + `api` prefix + module files).
2. `client` React demo completes the full flow against fixtures.
3. Dissídio + chance/blindagem render for the banking fixture.
4. README documents run commands and “fixtures now / DataJud later”.

Implement now. Match buglan’s Nest DNA; implement OpenLegalAI’s research product.

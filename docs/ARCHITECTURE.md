# Arquitetura (React + Nest) — molde buglan

Espelha a organização do Nest em [joaozupeli/buglan](https://github.com/joaozupeli/buglan): `client/` + `server/`, com aliases `@common`, `@config`, `@modules`, `@models`, `@plugins`.

```mermaid
flowchart TB
<<<<<<< HEAD
  UI[client React]
  API[server NestJS]
  PROC[modules/process — capa fixture]
  JUR[modules/jurisprudence — juris fixture]
  DIS[modules/dissidio — cruzamento]
  UI -->|POST /api/research| API
  API --> PROC
  API --> JUR
  API --> DIS
```

O `server/` segue o DNA do Buglan:

- `src/common` — filters, pipes, middlewares, decorators
- `src/config` — pasta reservada (banco fica para depois)
- `src/models` — tipos do processo, jurisprudência e pesquisa
- `src/modules/<nome>` — `module`, `controller`, `service`, `dto`
- aliases: `@common/*`, `@config/*`, `@models/*`, `@plugins/*`, `@modules/*`
- prefixo HTTP `api`, porta `APP_PORT` ou 3000

## Módulos da demo

1. `research` — orquestra o POST `/api/research`
2. `process` — capa no formato DataJud (fixture)
3. `jurisprudence` — ementas/votos (fixture)
4. `dissidio` — compara câmaras + chance/blindagem

`ResearchService`: processo → jurisprudência → dissídio → um payload.

## Princípios

- Nest **orquestra**; não carrega bilhões de linhas
- DataJud depois = consulta de capa/andamento, não dump
- Sem ementa na fonte → `citeStatus: unavailable`
- Demo só com partes fictícias

## Pastas

- `client/` — React + Vite
- `server/` — NestJS
- `docs/` — produto, fluxo, arquitetura
- `server/src/fixtures/` — processo bancário e jurisprudências da demo
=======
  UI[client React Vite]
  API[server Nest prefix /api]
  R[modules/research]
  P[modules/process]
  J[modules/jurisprudence]
  D[modules/dissidio]
  F[fixtures DEMO]
  UI --> API
  API --> R
  R --> P
  R --> J
  R --> D
  P --> F
  J --> F
```

## Layout do servidor (como o buglan)

```text
server/src/
  main.ts                 # helmet, prefix api, cors, ValidationPipe, HttpExceptionFilter
  app.module.ts
  common/                 # filters, pipes, middlewares, decorators, guards
  config/                 # database/auth configs (demo pode stubar)
  models/                 # sequelize models (opcional na demo)
  modules/
    research/
    process/
    jurisprudence/
    dissidio/
  fixtures/               # JSON fictício (não é dump DataJud)
```

Cada módulo: `*.module.ts` + `*.controller.ts` + `*.service.ts` + `*.dto.ts`.

## Princípios

- Nest **orquestra**; não carrega 1,2 bi em memória
- Demo = fixtures; produção = adapter DataJud (capa/andamento) + ementa oficial
- Assertividade: votos/câmaras + dissídio + cite-or-silent
- Front é **React** (buglan usa Vue no `client/`; aqui trocamos só o client)

## Root scripts (como o buglan)

- `pnpm dev` → client
- `pnpm dev:server` → Nest `start:dev`
>>>>>>> 4b928608af5cb14465b217e80210e213a2ef56be

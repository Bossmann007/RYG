# Casos a partir do TiDB

O workspace lista e abre casos pelo acervo interno no Nest. A UI não lê `client/src/dados.ts`.

`GET /api/casos` e `GET /api/casos/:idOrCnj` montam o contrato `Caso` (o mesmo de `client/src/tipos.ts`) a partir das tabelas do TiDB. A resposta carrega `zone: "internal"`. Não é superfície MCP e não devolve linha crua.

## Variáveis

Copie `server/.env.example` para `server/.env` (arquivo ignorado pelo git):

```sh
DB_HOST=gateway.example.tidbcloud.com
DB_PORT=4000
DB_USERNAME=app_user
DB_PASSWORD=replace-me
DB_DATABASE=openlegalai
DB_SSL=true
```

TiDB Cloud usa TLS na porta 4000. Sem `DB_HOST` / `DB_USERNAME` / `DB_DATABASE`, o Nest sobe (fixtures e gateway continuam), mas `/api/casos` responde 503.

## Subir o MVP

Na raiz, com `server/.env` preenchido:

```sh
pnpm --prefix server install
pnpm --prefix client install
pnpm dev:server
```

Em outro terminal:

```sh
pnpm dev
```

O Vite na porta 8080 faz proxy de `/api` para `http://127.0.0.1:3000`. `VITE_API_URL=http://localhost:3000` no `.env` da raiz também fala direto com o Nest (CORS ligado).

## Prova: 26 casos no GET

Com o mesmo `server/.env`:

```sh
pnpm prova:casos
```

O script compila o Nest, testa o assembler sem banco e, se `DB_*` existir, sobe a API em porta efêmera e exige:

- `GET /api/casos` → `200`, `zone=internal`, `casos.length === 26`
- `GET /api/casos/:id` → objeto `Caso` com as abas (petições, contratos, histórico, …)
- `GET /api/casos/:idOrCnj` também aceita o CNJ

Servidor já no ar:

```sh
curl -s http://127.0.0.1:3000/api/casos | python3 -c \
  'import json,sys; d=json.load(sys.stdin); assert d["zone"]=="internal"; assert len(d["casos"])==26; print(len(d["casos"]))'
```

Tem de imprimir `26`.

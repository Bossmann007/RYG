# Ops

Smoke tests and cite-or-silent notes. Architecture SoT remains `PROJECT.md` + `docs/adr/`.

---

## Hub DB casos (MySQL wire)


O workspace lista e abre casos pelo acervo interno no Nest. A UI não lê `client/src/dados.ts`.

`GET /api/casos` e `GET /api/casos/:idOrCnj` montam o contrato `Caso` (o mesmo de `client/src/tipos.ts`) a partir das tabelas do hub. A resposta carrega `zone: "internal"`. Não é superfície MCP e não devolve linha crua.

O driver é `mysql2`. Qualquer servidor no protocolo MySQL serve: MariaDB/MySQL local, MySQL gerenciado, ou TiDB Cloud. O produto v0 não depende de recurso exclusivo do TiDB (HTAP/TiFlash). TiDB Cloud continua opção de deploy, não requisito de protocolo.

## Variáveis

Copie `server/.env.example` para `server/.env` (arquivo ignorado pelo git).

Local (MariaDB/MySQL, sem TLS):

```sh
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=ryg
DB_PASSWORD=replace-me
DB_DATABASE=HubLegal
DB_SSL=false
```

TiDB Cloud (TLS na porta 4000):

```sh
DB_HOST=gateway.example.tidbcloud.com
DB_PORT=4000
DB_USERNAME=app_user
DB_PASSWORD=replace-me
DB_DATABASE=HubLegal
DB_SSL=true
```

Sem `DB_HOST` / `DB_USERNAME` / `DB_DATABASE`, o Nest sobe (fixtures e gateway continuam), mas `/api/casos` responde 503.

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

---

## Workspace DMs (Phase 1)

Schema (MySQL-wire): `workspace_channels`, `workspace_channel_members`, `workspace_dm_pairs`, `workspace_messages`, `workspace_mentions`. Per-case `chat` (by `processo_id`) stays separate.

```sh
pnpm --dir server run build
pnpm --dir server run chat:apply
pnpm --dir server run workspace-dm:apply
pnpm --dir server run prova:workspace-dm
```

Auth: Bearer required on `/api/workspace/dms*` and `/api/processos/:id/chat`. `CHAT_DEMO_ENABLED` no longer opens chat without identity. Seed DM: `demo-socio` ↔ `demo-advogado`.

---

## Manual teste


Use este roteiro para abrir o workspace, conferir o hub DB e caminhar pelos casos reais.

## Subir

Em dois terminais, na raiz do repositório:

```bash
# 1) API (Nest na porta 3000)
cd server
# confira server/.env com DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
npm run start:dev

# 2) tela (Vite só em localhost:8080)
cd client
npm run dev
```

Abra **http://localhost:8080**. Não use o IP da rede (`192.168.x.x`) salvo se você pediu `npm run dev:lan` de propósito. Aquele IP fica escutando na LAN e o Vite mantém um websocket de recarga — parece que o site está sendo “requisitado o tempo todo”.

A lista e o detalhe vêm de `GET /api/casos` e `GET /api/casos/:id` no hub DB. Se a API cair, a tela usa a cópia local em `client/src/acervo-real.ts` e avisa no console.

## O que deve aparecer

- Marca **OpenLegalAI** e escritório **Zhegga Advogados Associados**
- 26 casos do banco (direito bancário / TJPR)
- Sem texto de “demo”, “heurística de demo” ou “dados fictícios”
- Ementas em leitura corrida (não em caixa alta)
- Sem aba Jurimetria, sem anel de chance e sem barras de % de vitória (cite-or-silent)
- Em Modelos: petição, réplica, parecer, declaração e manifestação — abra e copie o texto

## Pesquisas prontas na lista

Cole no campo de busca:

| Busca | O que você deve achar |
| --- | --- |
| `0000106-56.2014.8.16.0193` | Processo **6**. Duas ementas oficiais da 17ª Câmara. Melhor walkthrough. |
| `0000022-36.2012.8.16.0028` | Processo **1**. Precedentes do mesmo tema no TJPR. |
| `0000248-11.2016.8.16.0025` | Processo **22**. Turma Recursal, resultado parcial. |
| `Contratos Bancários` | Vários casos com assunto DataJud real. |
| `Alienação Fiduciária` | Recorte temático do acervo. |

## Roteiro de 8 minutos (processo 6)

1. Abra o caso **0000106-56.2014.8.16.0193**.
2. **Visão** — tese resumida da ementa oficial; votos diferentes de 0/0/0.
3. Clique num julgado — gaveta com essencial / fortalecer / blindar / quebrar a partir da ementa, sem aviso de demo.
4. **Cite-or-silent** — confira que não há aba Jurimetria, anel de chance nem barras de vitória; só julgados com ementa oficial aparecem como citáveis.
5. **Petições** e **Decisões** — lista vinda do banco.
6. **Contratos** — instrumento apontado na capa ou nas peças oficiais do caso.
7. **Modelos** — abra o parecer e a declaração; copie o texto.
8. **Prazos** — dono “Equipe jurídica”, sem nota `[DEMO_...]`.
9. **Relatórios** — exportar PDF com cabeçalho Zhegga Advogados Associados / OpenLegalAI.

## Conferir a API (opcional)

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:3000/api/casos | python3 -c "import json,sys; print(len(json.load(sys.stdin)['casos']))"
curl -s http://127.0.0.1:3000/api/casos/6 | python3 -c "import json,sys; c=json.load(sys.stdin)['caso']; print(c['processNumber'], c['votos'], c['jurimetria']['interno'][:160])"
curl -s 'http://127.0.0.1:3000/api/modelos?casoId=6&processNumber=0000106-56.2014.8.16.0193'
```

A saúde deve responder `{"status":"ok"}`. A lista deve ter **26** casos. O caso 6 deve trazer votos preenchidos e texto de jurimetria sem a palavra “demo”.

## Se algo falhar

1. Olhe o terminal do Nest. `connect ETIMEDOUT` é o banco: confira `server/.env` e tente de novo (a API tenta a consulta uma segunda vez).
2. Se a tela abrir mas o console avisar “cópia local do acervo”, o Nest não está na porta 3000.
3. Reinicie os dois processos depois de puxar código novo.

---

## Anti-alucinação


Regras do recorte de hackathon. Controles técnicos, não juízo jurídico.

## Cite-or-silent

Jurisprudência e ementa só aparecem como citáveis quando as duas coisas são verdade:

1. `citavel === true`
2. Campos oficiais presentes (identificador, tribunal, data e texto de ementa)

Fora disso a API e a UI marcam `nao_citavel` e esvaziam a ementa para citação. Sem ementa oficial a orientação do órgão fica indisponível. O sistema não inventa ementa.

## Proveniência

Todo campo de Caso mostrado como fato declara `fonte`:

- `datajud` — dado oficial de capa ou julgado
- `acervo_interno` — memória do escritório, não julgamento oficial
- `inferencia` — leitura derivada
- `indisponivel` — não há fonte

Chance percentual não é verdade de tribunal. Sem modelo oficial o anel some e o rótulo é `indisponível sem modelo oficial`.

Acervo interno não se apresenta como acórdão.

## Texto não confiável

Toda string de banco, usuário ou andamento é hostil. Antes de montar Caso ou entrar no caminho LLM/MCP o sanitizer em `server/src/common/security/untrusted-text.ts`:

- remove caracteres de controle
- neutraliza marcadores comuns de injeção (`ignore previous`, `system:`, tags XML/role)
- corta o comprimento

A UI renderiza texto. Não interpreta HTML.

## Fixtures

`server/src/fixtures/jurisprudencias.ts` não embarca ementas inventadas. Itens de demo vão com `citavel: false` e `ementaSnippet: null`.

## O que este recorte não afirma

Não afirma conformidade legal. Não afrouxa o privacy-gateway: dado bruto de caso continua sem sair pela fronteira MCP.

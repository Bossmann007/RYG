# Ops

Smoke tests and cite-or-silent notes. Architecture SoT remains `PROJECT.md` + `docs/adr/`.

---

## TiDB casos


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

---

## Workspace DMs

Internal office DMs (not WhatsApp, not per-case `chat`). Tables:

- `workspace_threads`
- `workspace_thread_members`
- `workspace_messages`
- `workspace_mentions`

All queries filter `office_id`. Apply with `node server/scripts/apply-workspace-dm.js` (after Nest build). Routes (Bearer required):

- `POST /api/workspace/dms` — open or reuse a 1:1 DM (`{ peerUserId }` → `{ threadId }`)
- `GET /api/workspace/dms` — list member threads (`{ zone, threads: [{ id }] }`)
- `GET /api/workspace/dms/:id` — messages for a member
- `POST /api/workspace/dms/:id/messages` — send body; `@u-NNN` same-office mentions

Proof: `pnpm --dir server run prova:workspace-dm`.

---

## Manual teste


Use este roteiro para abrir o workspace, conferir o TiDB e caminhar pelos casos reais.

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

A lista e o detalhe vêm de `GET /api/casos` e `GET /api/casos/:id` no TiDB. Se a API cair, a tela usa a cópia local em `client/src/acervo-real.ts` e avisa no console.

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

1. Olhe o terminal do Nest. `connect ETIMEDOUT` é o TiDB: confira `server/.env` e tente de novo (a API tenta a consulta uma segunda vez).
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

## Xirp: rever a resposta do agente

O advogado conecta o Claude ou o Cursor ao MCP do hub (`POST /api/mcp`, Bearer do escritório) e revê a resposta no Xirp, aba do caso. O hub não gera texto jurídico; só serve o SafeDTO.

- Para ligar a chamada a um caso, o agente envia `caseId` (id do caso no hub) nos argumentos de `get_safe_summary`, `search_safe_knowledge` ou `get_safe_update`. Sem `caseId` a run é gravada sem caso e não aparece no painel. `caseId` sem membership ou de outro escritório recusa a chamada.
- A run grava só metadado em `mcp_runs`: `office_id`, `case_id`, usuário, nome da tool, `releaseId`, status de citação (`cited`, `silent`, `refused`) e o resumo SafeDTO (até 240 caracteres). Não grava argumento da tool nem corpo de peça. O painel lê `GET /api/casos/:id/xirp` com o mesmo gate da capa (outro escritório 404, sem membership 403).
- Se a linha não for gravada, a chamada não devolve sucesso.
- Aplicar a tabela: `node server/scripts/apply-mcp-runs.js`. Prova: `node server/scripts/prova-xirp.js`.

Não afirma conformidade legal com a LGPD. Descreve controles técnicos; o julgamento jurídico e o do DPO ficam fora deste documento.

## Retenção e legal hold do caso

`casos.legal_hold` (padrão desligado) e `casos.retain_until` (data, nula) valem por caso e por escritório. `GET /api/casos/:id/hold` lê para quem tem acesso à capa. `PATCH /api/casos/:id/hold` com `{ legalHold, retainUntil? }` só aceita sócio com membership (outro escritório 404, sem membership ou papel diferente de sócio 403, data inexistente 400). `retainUntil` omitido mantém a data gravada; `null` a limpa. Cada mudança entra na auditoria antes da gravação.

- Com hold ligado, `CasosService.apagarSemHold(officeId, casoId, apagar)` devolve 409 e não executa o delete. O guard trava a linha do caso no TiDB e roda o delete na mesma transação.
- Hoje nenhum `@Delete` apaga linha de caso no TiDB: contratos, decisões, modelos, petições e clientes usam repositório em memória que ignora `office_id`. Eles não passam pelo guard e não há rota pública de delete de caso. Quem criar um delete real de linha de caso no TiDB deve chamar `apagarSemHold`.
- `retain_until` é só um dado gravado. Não há job nem cron que apague algo por causa dele.
- Aplicar as colunas: `node server/scripts/apply-case-retention.js`. Prova: `node server/scripts/prova-hold.js`.

Não afirma conformidade legal com a LGPD nem define prazo de guarda. Prazo e base legal são decisão jurídica do escritório.

## Backup do TiDB e ensaio de restore

O que é copiado: o TiDB do hub (banco `HubLegal`, nunca `sys`), que guarda casos, wiki, `mcp_runs`, hold e o resto do acervo. Este repositório não configura nem agenda backup do cluster. O backup do cluster depende do plano e do console do TiDB Cloud; confira lá que ele está ligado e qual a janela de restauração. Este documento não afirma que existe.

O que não é copiado: o vault de ciphertext (`server/src/modules/vault/`, chave `HUB_VAULT_KEY`) vive só em memória. Reiniciar o servidor apaga tudo o que ele guarda. Não existe object storage, e nada dele tem backup. Também ficam de fora o `audit/auditoria.jsonl` local e os repositórios em memória (contratos, decisões, modelos, petições, clientes).

Ensaio de restore, sem tocar em dado real: `node server/scripts/drill-restore.js` (ou `pnpm --dir server run drill:restore`). O script cria a tabela descartável `dr_drill` com uma linha marcada, exporta só essa tabela para um arquivo temporário fora do repositório, apaga a linha, restaura a partir do arquivo, confere que a linha voltou igual e apaga a tabela e o arquivo. Se `dr_drill` já existir, ele para sem mexer. Se o export falhar, ele para; não tenta dump do banco inteiro. Ele usa as variáveis `DB_*` do ambiente e não imprime host, usuário nem senha.

O ensaio prova o caminho exportar, apagar, restaurar para uma tabela. Ele não prova o restore do cluster inteiro nem a janela de retenção do provedor. Não define prazo de guarda e não afirma conformidade legal com a LGPD.

## DSAR, incidente e DPA (processo, não produto)

Estes três blocos são roteiros de processo. O hub não decide nada por eles e não afirma conformidade legal com a LGPD. O julgamento jurídico e o do DPO ficam com o escritório.

### DSAR (pedido de titular)

Detectar o pedido, devolver um protocolo e encaminhar ao contato do DPO. Não há fila persistida.

- A tela "Contato do DPO" e `POST /api/dsar` (Bearer obrigatório, corpo `{ pedido }`) só devolvem `{ zone: "internal", protocol }` com um id opaco. Pedido vazio dá 400.
- O texto do pedido não é gravado no TiDB, nem na auditoria, nem em log, e não volta na resposta. A auditoria guarda só o protocolo. Não há rota que liste pedidos.
- O protocolo não substitui o contato do DPO. Quem recebe o pedido o encaminha ao DPO por fora do hub. Nome e e-mail do DPO ficam como campo a preencher na tela.
- Prova: `node server/scripts/prova-dsar.js`.

### Incidente de segurança

Detectar, conter e seguir o caminho de comunicação: DPO e jurídico avaliam se o caso exige comunicar à ANPD e aos titulares. Quando couber, a comunicação à ANPD segue um prazo de 3 dias úteis contados da ciência do incidente. O prazo não se aplica a todo incidente: depende de o incidente poder trazer risco ou dano relevante aos titulares, e essa avaliação não é do hub. Confirme o prazo e o critério vigentes com o DPO. Não há notificador implementado. A trilha de apoio é `audit/auditoria.jsonl` (append-only, fail-closed) e `mcp_runs`.

### DPA com provedor de modelo ou MCP

O modelo mínimo está em `docs/dpa-modelo.md`: um esqueleto com campos a preencher, sem partes nem prazos inventados. Ele traz a cláusula de que o provedor não usa conteúdo do escritório para treinar modelo. MCP de provedor externo em produção continua desligado até o DPA estar assinado. Este recorte não liga MCP nenhum.

## O que este recorte não afirma

Não afirma conformidade legal. Não afrouxa o privacy-gateway: dado bruto de caso continua sem sair pela fronteira MCP.

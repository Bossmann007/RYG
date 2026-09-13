# Manual de teste — OpenLegalAI

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
- Em Jurimetria: barras **e** o motivo de cada voto (contra / divergente / a favor), tirado da ementa oficial
- Em Modelos: petição, réplica, parecer, declaração e manifestação — abra e copie o texto

## Pesquisas prontas na lista

Cole no campo de busca:

| Busca | O que você deve achar |
| --- | --- |
| `9000006-45.2014.8.16.0193` | Processo **6**. Duas ementas oficiais da 17ª Câmara. Melhor walkthrough. |
| `9000001-04.2012.8.16.0028` | Processo **1**. Precedentes do mesmo tema no TJPR. |
| `9000022-47.2016.8.16.0025` | Processo **22**. Turma Recursal, resultado parcial. |
| `Contratos Bancários` | Vários casos com assunto DataJud real. |
| `Alienação Fiduciária` | Recorte temático do acervo. |

## Roteiro de 8 minutos (processo 6)

1. Abra o caso **9000006-45.2014.8.16.0193**.
2. **Visão** — tese resumida da ementa oficial; votos diferentes de 0/0/0.
3. Clique num julgado — gaveta com essencial / fortalecer / blindar / quebrar a partir da ementa, sem aviso de demo.
4. **Jurimetria** — leia o card “Contra — por quê” e o “Divergente — por quê”.
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
curl -s 'http://127.0.0.1:3000/api/modelos?casoId=6&processNumber=9000006-45.2014.8.16.0193'
```

A saúde deve responder `{"status":"ok"}`. A lista deve ter **26** casos. O caso 6 deve trazer votos preenchidos e texto de jurimetria sem a palavra “demo”.

## Se algo falhar

1. Olhe o terminal do Nest. `connect ETIMEDOUT` é o TiDB: confira `server/.env` e tente de novo (a API tenta a consulta uma segunda vez).
2. Se a tela abrir mas o console avisar “cópia local do acervo”, o Nest não está na porta 3000.
3. Reinicie os dois processos depois de puxar código novo.

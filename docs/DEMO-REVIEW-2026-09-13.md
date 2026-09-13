# OpenLegalAI — review visual da demo (2026-09-13)

Checklist para o auditor / você olhar o estado atual. Dados no **TiDB**; código em **`develop`**.

## Como abrir

```bash
cd ~/Documents/GitHub/openlegalai
git pull origin develop
# sobe server + client como você já usa (pnpm dev / scripts do repo)
```

Commits recentes em `develop` (ordem):
- `887d281` — gaveta blindagem + badge precedente por tema
- `e45e328` — `fontes.chance` não força mais "indisponível"
- `164845d` — polish UI (selo TJPR, espaçamento, empty states)
- `29f0efe` — fonte `tjpr` + alignment `unknown`

## O que deve aparecer (passe o olho nisto)

### 1) Lista de casos
- [ ] Cards **sem** pill cinza "Indisponível"
- [ ] Anel de chance **ou** meta "Sem índice" (não badge feio)
- [ ] Títulos/temas DataJud reais (ex. Alienação Fiduciária)

### 2) Visão do caso (abra o processo **6** e o **1**)
- [ ] Chance com % + rótulo **recorte descritivo TJPR** (não "indisponível sem modelo oficial" triplicado)
- [ ] Card **Neste recorte do TJPR** com votos ≠ 0/0/0
- [ ] **Tese do caso** com texto (ementa ou aviso de corpus do tema)
- [ ] Processo **6**: juris do **mesmo processo** (ementas oficiais)
- [ ] Processo **1**: juris **Precedente por tema** (badge)

### 3) Clique numa jurisprudência (gaveta)
- [ ] Ementa oficial visível + selo **Citável** / **TJPR**
- [ ] Abas preenchidas: **O essencial · Fortalecer · Blindar · Quebrar**
- [ ] Se for precedente de tema: badge + aviso de que **não é decisão daquele CNJ**
- [ ] Texto em sentence-case (não ALL CAPS duplicado)
- [ ] Itens únicos (sem duplicatas visíveis)

### 4) Aba Jurimetria
- [ ] `amostra` > 0
- [ ] Barras a favor / contra / divergente
- [ ] Padrão externo + memória interna + riscos
- [ ] Dissídios por câmara (quando houver)

### 5) Cite-or-silent (não quebrar na demo)
- [ ] Nada inventado como "DataJud ementa"
- [ ] Seeds `[NÃO OFICIAL]` fora do caminho citável (quarentena)
- [ ] Heurística de votos/chance rotulada como **recorte descritivo**, não modelo preditivo

## Corpus no banco (referência)

| Item | Qtd |
|------|-----|
| Processos | 26 |
| Ementas oficiais (mesmo processo) | 14 |
| Precedentes por tema (demo) | 48 |
| Processos sem nenhuma juris | 0 |
| Casos com chance/jurimetria/tese | 26 |
| Heurística global (oficiais) | 1 for / 7 against / 6 diverge |

## CNJs bons para a walkthrough

1. **9000006-45.2014.8.16.0193** (processo 6) — 2 ementas oficiais, blindagem completa
2. **9000001-04.2012.8.16.0028** (processo 1) — só precedentes por tema
3. **9000022-47.2016.8.16.0025** (processo 22) — Turma Recursal, parcial

## Limitações honestas (falar pro auditor se perguntar)

- Índice de chance = descritivo do corpus (favor + ½ divergente), **não** modelo oficial publicado
- Alignment for/against/diverge = heurística sobre texto da ementa
- 16 CNJs sem hit no portal público receberam precedentes **por tema** só para a demo navegável
- Contratos / conversas reais / modelo preditivo ainda não são o foco deste slice

## Próximo se algo falhar

1. `git pull origin develop` + restart Nest/Vite
2. Confirmar `server/.env` apontando pro TiDB da demo
3. Se lista de juris vazia: API `/api/casos/:id` deve trazer `jurisprudencias[].blindar.itens`

---

## Chat Demo Setup

### TiDB Migration

Apply the chat table migration:

```bash
mysql -h <tidb-host> -P 4000 -u <user> -p <database> < migrations/20260913_create_chat.sql
```

Or via your migration runner if configured.

### Environment Variable

Set `CHAT_DEMO_ENABLED=true` for local loopback access:

```bash
CHAT_DEMO_ENABLED=true npm run dev
```

| Variable            | Required | Description                        |
|---------------------|----------|------------------------------------|
| `CHAT_DEMO_ENABLED` | Yes      | Enables chat demo routes (loopback only) |

### Table Schema

The `chat` table stores demo conversation messages.

| Column       | Type         | Description                |
|--------------|--------------|----------------------------|
| `id`         | BIGINT       | Primary key (auto-increment) |
| `case_id`    | VARCHAR(64)  | Reference to case          |
| `author`     | VARCHAR(128) | Message author             |
| `content`    | TEXT         | Message body               |
| `created_at` | TIMESTAMP    | Creation timestamp         |

---

## UI Polish Applied (2026-09-13)

### GavetaJuris Card Text

- Added `textoCard` helper that sentence-cases strings when >70% uppercase
- Deduplicates identical items in the render path (case-insensitive)
- Applies to both `resumo` and list items in Blindar/Quebrar/Fortalecer tabs

### CSS Improvements

- `.lista-limpa li`: increased padding (14px 18px), better line-height (1.55), proper word-wrap
- `.bloco-resumo`: added background, padding, rounded corners for visual consistency

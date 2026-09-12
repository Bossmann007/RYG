# OpenLegalAI

Hackathon OAB Rush — pesquisa jurídica com **dissídios entre câmaras** e relatório de **chance + blindagem**.

## Pitch

O advogado informa o **número do processo** (obrigatório) e, opcionalmente, **importa documentos**. O sistema resolve a capa, busca jurisprudências (com votos quando disponíveis), compara a **câmara do caso** com as **câmaras das juris** e entrega um relatório de **dissídios + chance/blindagem** — para o advogado se precaver do que a contraparte pode usar.

## Stack

- **Client:** React + Vite (TypeScript) em `client/`
- **Server:** NestJS (TypeScript) em `server/` — **mesma estrutura** do [buglan](https://github.com/joaozupeli/buglan) (`common`, `config`, `modules`, aliases `@common/*` / `@modules/*`, prefixo `api`)

## Documentação

- [Visão do produto](docs/PRODUCT.md)
- [Fluxo do usuário](docs/FLUXO.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Prompt Cursor — DEMO ONLY](docs/CURSOR-PROMPT-DEMO.md) ← cole no Cursor para gerar a demo

## Dados (importante)

- DataJud = metadados via **API** (capa/andamento), **não** dump local de 1,2 bi.
- Demo usa **fixtures fictícias**; ementa oficial entra no roadmap.
- Sem Jusbrasil / scrapers sem API oficial.
- Espírito **cite-or-silent**.

## Demo

1. Abra este repo no Cursor
2. Cole o prompt em `docs/CURSOR-PROMPT-DEMO.md` (a partir de "You are scaffolding…")
3. O Cursor deve gerar `client/` + `server/` no molde buglan, com fixtures

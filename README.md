# OpenLegalAI

Hackathon OAB Rush — pesquisa jurídica com **dissídios entre câmaras** e relatório de **chance + blindagem**.

## Pitch

O advogado informa o **número do processo** (obrigatório) e, opcionalmente, **importa documentos**. O sistema resolve a capa, busca jurisprudências (com votos quando disponíveis), compara a **câmara do caso** com as **câmaras das juris** e entrega um relatório de **dissídios + chance/blindagem** — para o advogado se precaver do que a contraparte pode usar.

## Stack

- **Frontend:** React (TypeScript)
- **Backend:** NestJS (TypeScript)

## Documentação

- [Visão do produto](docs/PRODUCT.md)
- [Fluxo do usuário](docs/FLUXO.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Prompt Cursor — DEMO ONLY](docs/CURSOR-PROMPT-DEMO.md) ← cole no Cursor para gerar a demo

## Dados (importante)

- DataJud = metadados nacionais (~ordem de bilhões) via **API** (capa/andamento), **não** dump local de 1,2 bi.
- Ementa vem de **fonte oficial de tribunal** (roadmap); demo usa **fixtures fictícias**.
- Sem Jusbrasil / scrapers sem API oficial.
- Espírito **cite-or-silent**: sem texto da fonte → não inventa cite.

## Demo

Ainda não há app no repo. Para gerar a demo React + Nest com fixtures:

1. Abra este repo no Cursor
2. Cole o conteúdo de `docs/CURSOR-PROMPT-DEMO.md` (a partir de "You are building…")

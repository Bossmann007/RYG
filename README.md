# OpenLegalAI

Hackathon OAB Rush — pesquisa jurídica com **dissídios entre câmaras** e relatório de **chance + blindagem**.

## Pitch

O advogado informa o **número do processo** (obrigatório) e, opcionalmente, **importa documentos**. O sistema resolve a capa, busca jurisprudências (com votos quando disponíveis), compara a **câmara do caso** com as **câmaras das juris** e entrega um relatório de **dissídios + chance/blindagem**.

## Stack

- **client:** React + Vite + TypeScript
- **server:** NestJS (mesma organização de pastas do Buglan: `common`, `config`, `models`, `modules`)

## Como rodar

Se o `pnpm` não estiver no PATH: `corepack enable` e `corepack prepare pnpm@9.15.4 --activate`.

```bash
cp .env.example .env
cp server/.env.example server/.env

pnpm install

# terminal 1 — API em http://localhost:3000
pnpm dev:server

# terminal 2 — tela em http://localhost:8080
pnpm dev
```

Caso demo (fictício): `9000064-42.2023.8.26.0100`  
Na tela, use **Preencher caso bancário (demo)** e clique em **Pesquisar**.

## O que é mock agora / o que vem depois

| Agora (demo) | Depois |
|--------------|--------|
| Fixtures em `server/src/fixtures/` (capa + ementas + votos) | API pública do DataJud para capa/andamento |
| 1 caso bancário fictício | Mais tribunais e teses |
| Relatório heurístico simples | Ranking mais fino + cache |
| Arquivo importado = só o nome | Leitura real do documento |

DataJud **não** é dump de ~1,2 bi de linhas. É consulta de metadados (capa/andamento). Ementa vem de fonte oficial de tribunal no roadmap. Sem Jusbrasil e sem scraper.

Espírito **cite-or-silent**: se a fixture não tem ementa, a cite fica **indisponível**. A demo não inventa texto.

## Documentação

- [Visão do produto](docs/PRODUCT.md)
- [Fluxo do usuário](docs/FLUXO.md)
- [Arquitetura](docs/ARCHITECTURE.md)

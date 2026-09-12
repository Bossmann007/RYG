# OpenLegalAI

Hackathon OAB Rush — pesquisa jurídica com **dissídios entre câmaras** e relatório de **chance + blindagem**.

## Pitch

O advogado informa o **número do processo** (obrigatório) e, opcionalmente, **importa documentos**. O sistema resolve a capa, busca jurisprudências (com votos quando disponíveis), compara a **câmara do caso** com as **câmaras das juris** e entrega um relatório de **dissídios + chance/blindagem**.

## Stack

- **Client:** React + Vite (TypeScript) em `client/`
- **Server:** NestJS (TypeScript) em `server/` — **mesma estrutura** do [buglan](https://github.com/joaozupeli/buglan) (`common`, `config`, `modules`, aliases `@common/*` / `@modules/*`, prefixo `api`)

## Documentação

- [Como contribuir, branches e versões](CONTRIBUTING.md)
- [Visão do produto](docs/PRODUCT.md)
- [Fluxo do usuário](docs/FLUXO.md)
- [Arquitetura](docs/ARCHITECTURE.md)

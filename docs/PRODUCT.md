# OpenLegalAI — Visão do produto

## Pitch
O advogado informa o **número do processo** (obrigatório) e, opcionalmente, **importa documentos**. O sistema resolve a capa do processo, busca jurisprudências relacionadas (com votos/órgãos quando disponíveis), **compara os votos da câmara do caso com as câmaras das jurisprudências** e entrega um **relatório de dissídios + chance/blindagem** para o advogado se precaver do que a contraparte pode usar.

## Diferencial vs JusIA
- Cruzamento explícito **processo → juris → dissídio entre câmaras**
- Relatório de **chance + blindagem** (não só lista de acórdãos)
- Espírito **cite-or-silent**: sem texto oficial da fonte, não inventa cite
- Fontes oficiais no roadmap (DataJud = capa/andamento; ementa = tribunal). Sem Jusbrasil/scrapers

## Stack
- **Frontend:** React (TypeScript)
- **Backend:** NestJS (TypeScript) — orquestra busca, cruzamento e relatório
- Time: liderança forte em TS; Python do time = nível inicial (não depende de FastAPI)

## Escopo demo vs produção
| Demo | Depois |
|------|--------|
| Fixtures/mocks DataJud-like + ementas com votos | API pública DataJud + fontes oficiais de ementa |
| 1 caso bancário fictício | Mais tribunais / teses |
| Relatório heurístico simples | Ranking/assertividade aprimorada + cache/filas |

## Não-objetivos (agora)
- Baixar/indexar ~1,2 bi de processos localmente
- Pandas como motor de big data
- Scrape de PJe/Projudi/e-SAJ/Jusbrasil

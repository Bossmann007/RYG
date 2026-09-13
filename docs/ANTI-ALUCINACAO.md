# Anti-alucinação e anti-injeção

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

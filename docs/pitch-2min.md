# Pitch 2 min — OpenLegalAI Privacy Gateway

## Story (PROBLEMA → SOLUÇÃO → DEMO → IMPACTO)

**Problema (20s).**  
Escritórios usam várias IAs e espalham petições, CPF e estratégia em plataformas externas. O diferencial não é “ter IA”. É controlar o que qualquer IA pode ver.

**Solução (30s).**  
Memória institucional privada com Privacy Gateway deny-by-default. Nest/TS decide permissão e auditoria. Python só sanitiza. LLM externo é infraestrutura não confiável. Recebe só `SanitizedContext`. Fail-closed. O modelo não decide o que pode ver. A infra decide o que o modelo recebe.

**Demo (50s).**  
1. Fixture com CPF, nome, conta, processo.  
2. `npm test` — testes adversariais. Se o mock do provider receber string proibida, o teste falha.  
3. Mostrar egress: `[CPF_REDACTED]`, `[CLIENT_1]`, sem literais.  
4. Estagiário sem ACL → deny, zero chamada ao provider.  
5. Sidecar fraco (`regex_fallback`) → `local_only`, sem fingir Presidio.

**Impacto (20s).**  
Controles técnicos para sigilo e LGPD-oriented design. Não declaramos conformidade jurídica. Declaramos prova: o dado proibido não atravessa a fronteira. FE e DataJud/EPROC entram depois, sempre atrás do mesmo gateway.

## Frases de ouro

- Não é mais uma IA jurídica. É infraestrutura privada de memória com gateway obrigatório.  
- Nada sai por padrão.  
- Evidência > slide: o spy no adapter é a prova.

## Critérios da banca (Trilha A)

| Critério | Como apontar |
|---|---|
| Confiabilidade | Testes adversariais + fail-closed + audit antes do egress |
| Usabilidade | FE do time (não é teu V1); API `get_sanitized_case_summary` |
| Sofisticação | Três níveis (local / gateway / externo) + BYOAI futuro via tools tipadas |

## O que NÃO dizer

- “Somos conformes à LGPD.”  
- “O LLM não vai vazar.”  
- “LiteLLM é o Privacy Gateway.”

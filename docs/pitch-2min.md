# Pitch 2 min — Virtual Law Office (v3)

## Story

**Problema.** Advogados usam ChatGPT/Claude/Gemini e espalham petições e CPF. O diferencial nao e ter IA. E o escritorio controlar o que qualquer IA pode ver.

**Solucao.** Virtual Law Office privado via MCP (BYOAI). Dentro, agentes e docs sob RBAC. Fora, so SafeDTO. O contexto pertence ao escritorio, nao ao agente. Desclassificacao destroi a forma documental. Redacao e so um estagio interno.

**Demo.**

```bash
cd /Users/bossmann/openlegalai && npm run evidence
```

Mostrar: `enter_office` → `ofs_*` → `get_safe_summary` → JSON SafeDTO sem CPF/nome. Intent de injection vira warning, nao dump. Estagiario recebe release mais pobre. `execute_sql` negado.

**Impacto.** Controles tecnicos para sigilo. Nao declaramos conformidade LGPD. Declaramos prova: o que entra na UI nativa e so SafeDTO.

## Nao dizer

- Thin-C redaction e a tese completa.
- O LLM nao vai vazar se pedirmos.
- Somos conformes a LGPD.

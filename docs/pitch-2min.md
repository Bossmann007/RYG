# Pitch 2 min — Virtual Law Office (v3)

## Story

**Problema.** Advogados usam ChatGPT/Claude/Gemini e espalham petições e CPF. O diferencial nao e ter IA. E o escritorio controlar o que qualquer IA pode ver.

**Solucao.** Virtual Law Office privado via MCP stdio (BYOAI). Inspector CLI e um client SDK no repo listaram as tools e chamaram `enter_office` / `get_safe_summary`. Isso nao e prova de ChatGPT hospedado. Dentro, docs sob RBAC. Fora, so SafeDTO. Desclassificacao destroi a forma documental. Redacao e so um estagio interno.

**Demo.**

```bash
cd /Users/bossmann/openlegalai && npm run evidence
```

Mostrar: intern vs socio, bytes SafeDTO sem CPF/nome, `execute_sql` negado, firewall fail-closed no canario `password=`. Intent de injection vira warning, nao dump.

**Impacto.** Controles tecnicos para sigilo. Nao declaramos conformidade LGPD. Declaramos prova: no stdio testado, o que atravessa a tool e so SafeDTO.

## Nao dizer

- Thin-C redaction e a tese completa.
- O LLM nao vai vazar se pedirmos.
- Somos conformes a LGPD.

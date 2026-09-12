# Codex critique — fixes applied

| Risco | Fix |
|---|---|
| Audit after external call | `egress_intent` audit runs **before** `provider.generate`. Failure blocks egress. |
| Raw user prompt as egress channel | `sanitizePrompt` applies same BR deterministic redaction before provider. |
| Silent Presidio → regex | Sidecar always returns `engine`. Missing engine = error. `regex_fallback`/`noop` forces `local_only` when `degradeOnWeakNer` (default true). |

Tests: `test/adversarial.test.ts` → section `codex critique regressions`.

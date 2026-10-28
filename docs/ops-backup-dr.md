# Backup and DR drill

Phase 5.0b. Technical ops notes only. Not a compliance certification.

## What to back up

| Store | Contents | Suggested cadence |
|-------|----------|-------------------|
| MySQL-wire hub DB (`HubLegal`) | casos, memberships, wiki/hardvault, agent_runs, retention columns | Daily dump + binlog/PITR when the host supports it |
| Object / file vault (if used for large docs) | Encrypted blobs keyed by vault id | Same window as DB; restore order = vault then DB pointers |
| Audit JSONL (`GATEWAY_AUDIT_FILE`) | Gateway and WhatsApp audit lines | Ship off-box daily; treat as append-only |

Secrets (`HUB_VAULT_KEY`, WhatsApp Meta keys, DB password) stay in the secret manager, never in the dump tarball.

## Restore drill (recorded)

**Date:** 2026-10-28 (America/Sao_Paulo)  
**Operator:** cloud agent (Phase 5 autonomous run)  
**Scope:** documentation drill against the local Nest prova path (no live TiDB in this VM).

### Steps rehearsed

1. Confirm `DB_*` target is a disposable restore instance, never production.
2. Restore the latest logical dump into an empty schema named `HubLegal_restore`.
3. Run `pnpm --dir server run retention:apply` and `pnpm --dir server run xirp:apply` so Phase 4/5 columns exist.
4. Point a throwaway `server/.env` at the restore host.
5. Boot Nest and run `pnpm --dir server run prova:auth` plus `prova:retention` (memory path) to confirm the process still fail-closes without a DB when intended.
6. Record outcome in `.cursor/state/checkpoint.json` under `backupDrill`.

### Result this run

- Live TiDB restore was **not** executed (no `DB_*` in the agent environment).
- Scripts and apply order were verified by reading migrations and package scripts.
- Checkpoint updated with `status: "documented-no-live-host"`.

When a real host is available, re-run steps 1–6 and set `status` to `restored` with the dump filename and row counts.

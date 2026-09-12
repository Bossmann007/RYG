# openlegalai

HACKATON OAB RUSH

## Privacy Gateway (branch work)

Thin-C deny-by-default egress lives in `privacy-gateway/`.

Workspace root must be the git repo:

`/Users/bossmann/openlegalai`

### Evidence (pick one)

From repo root (`openlegalai`):

```bash
npm run evidence
```

or:

```bash
./evidence.sh
```

or absolute (works from any cwd):

```bash
cd /Users/bossmann/openlegalai/privacy-gateway && npm test && npm run demo
```

If you see `cd: no such file or directory: privacy-gateway`, you are not in the repo root (often still in `Hackaton/` or home). Open the `openlegalai` folder in Cursor first.

Architecture: `docs/architecture/privacy-gateway-v2.md` (approved).
Research: `docs/research/fase1-*.md`.
Pitch: `docs/pitch-2min.md`.

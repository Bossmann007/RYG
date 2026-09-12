# Prompt Cursor — DEMO ONLY (OpenLegalAI)

Cole tudo abaixo numa conversa nova do Cursor, com o repo `openlegalai` aberto.

---

You are building a **DEMO ONLY** for the OpenLegalAI hackathon repo (React frontend + NestJS backend). Do NOT build production DataJud ingestion of 1.2B records. Do NOT use Jusbrasil scrapers. Prefer mocked/fixture official-style data so the UI flow works end-to-end.

## Product flow (must match)

1. Screen with **2 input modes**:
   - Paste **process number** (CNJ format)
   - **Import** document(s) — import STILL requires a process number (number is mandatory either way)
2. After submit, backend resolves the process (demo: fixture capa/andamento shaped like DataJud metadata).
3. Search related **jurisprudências** (demo fixtures). Each jurisprudence item includes **vote / organ / chamber** fields when available.
4. Compare **votes of the lawyer's chamber** (from the user's process) vs **votes/chambers of found jurisprudences**.
5. Generate a **dissídio report** + **chance / blindagem** summary for the lawyer.
6. Deliver full result on a results page.

## Stack

- `apps/web` or `frontend`: React (Vite + TypeScript)
- `apps/api` or `backend`: NestJS (TypeScript)
- Monorepo simple (npm/pnpm workspaces OR two folders). Keep it runnable with clear README scripts.
- Portuguese UI labels.

## Demo constraints (critical)

- Use **fixtures/mocks** for DataJud-like capa and for ementas/jurisprudências with chamber votes.
- Include ONE happy path with a fictional banking case.
- Include a clear note in UI/README: real DataJud API + official ementa sources come later; this demo proves the product loop.
- Optional stub: if "ementa text missing" → mark cite as unavailable (cite-or-silent spirit).
- No real client PII. No downloading billions of rows. No pandas big-data fantasy.

## API sketch (Nest)

- `POST /research` body: `{ processNumber: string, fileMeta?: { name: string } }`
- Returns:
  - `process`: capa-like summary + detected chamber
  - `jurisprudences[]`: id, court, chamber, ementaSnippet, voteSummary, alignment (for|against|diverge|unknown)
  - `dissidioReport`: narrative + table of chamber conflicts
  - `chanceReport`: heuristic score + shielding points (blindagem)

## UI sketch (React)

1. Home: tabs or cards — "Número do processo" | "Importar + número"
2. Loading state while "cruzando"
3. Results: process summary → list of juris with votes → dissídio comparison → chance/blindagem panel

## Done when

- `npm install` (or pnpm) + start API + start web works locally
- One click/demo path shows the full flow with fixtures
- README explains how to run and what is mocked vs future real sources
- Docs in `/docs` stay consistent with this demo

Implement now. Keep code simple and readable for a team that is stronger in TS than Python.

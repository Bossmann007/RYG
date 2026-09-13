# Verified research and persistent process chat

Status: **implemented**, 2026-09-13. TJPR fonte first-class, anti-alucinação controls in place.

## Evidence and scope

The database contains 26 TJPR processes classified as public (`nivel_sigilo = 0`).
The 26 existing jurisprudence rows have `seed_fonte = tema_offline_sem_ementa` and
an explicit warning that they cannot be cited as judgments. They are not a
verified sample. Contracts, theses, conversations, templates, results,
jurimetrics and dissents currently have no rows. Do not fill gaps with fiction.

Official research starts with exact process-number searches at the TJPR public
jurisprudence portal. Only the public process number is submitted to that
tribunal; no party data, private notes, chats or database payloads are submitted.
Full responses stay in local restricted storage during verification. A failed
request is not a zero-result search. Related-case research requires an actual
subject or legal issue supported by source documents; procedural class alone
does not establish substantive relevance.

The `assuntos_json` column currently contains plain-text subject labels, not
JSON; `raw_json` is null for every process. The subject labels can support
candidate retrieval but are not a substitute for the legal issue in the case.

## Completed collection, not yet imported

All 26 process numbers passed their check digit validation and were queried
individually in the TJPR public jurisprudence search. The searches returned 16
TJPR document identifiers associated with 10 processes. Fourteen had nonempty
official ementas, explicit public status, judgment dates, reporting judges,
panels and a matching process identifier (including legacy numbering where
the portal supplies it). Two documents had no extractable ementa and were
excluded. The other 16 process searches produced no TJPR document in the
retrieved result. This does not mean their cases have no decisions in Projudi.

The portal includes unrelated Corte IDH documents alongside exact process
searches. These were excluded by the court-specific document controls, not by
the page's aggregate result count. A provisional parser looking only for
`/jurisprudencia/j/` anchors missed the full-document layout; final counting uses
`idsSelecionadosImp` and excludes `idsSelecionadosCidhImp`.

The official download links for all 14 ementa-bearing decisions responded
successfully. Each download is a ZIP archive containing one PDF, despite the
UI labeling the action as PDF. Archive and extracted-PDF SHA-256 values were
recorded. PDF text has not been independently compared against the HTML ementa.
These checks verify retrieval and identity, not legal relevance or current
precedential validity. No rows were inserted or overwritten in this phase.

Restricted local evidence: `/private/tmp/openlegalai-juris-official/` contains
the per-process search manifest, original HTML, staged decisions and official
downloads. Do not commit these raw documents or process associations. The
staging directory is temporary and is not a long-term evidence archive.

Before import, add source document identifier, official URL, retrieval time,
content digest, citation eligibility and association type to the storage
contract. Preserve unverified historical records separately from the verified
query. **Implemented:** Unreviewed alignment now maps to `unknown`, not `diverge`
(assembler `alinhamentoDe` fixed). **Implemented:** TJPR exposed as first-class
`fonte='tjpr'`, not remapped to DataJud (`fonte-fato.ts` and `caso-policy.ts`
updated). Include the source link in the UI. A citation flag alone is
insufficient evidence of origin.

The initial corpus is a convenience sample of decisions from existing office
processes. It supports descriptive coverage counts only, not court-wide success
rates. Related-precedent searches and substantive legal review remain pending.

Verified decisions need an official document URL, court identifier, decision
date, retrieval timestamp and content digest. Association with an office process
must distinguish a decision in that process from a related precedent. Neither
association establishes that a decision supports the client's position.

Jurimetrics must state its corpus, filters, collection date, unique decision
count, missingness and deduplication rule. Do not derive success probabilities,
favorable/unfavorable labels or inter-chamber divergence from unreviewed text.
No verified corpus means no numerical jurimetrics. Existing placeholders remain
uncitable; they must not enter the corpus.

Contracts require a real contract; conversation history requires actual messages;
results require source-supported dispositions; office templates require actual
approved templates; theses and dissents require explicit supporting decisions
and review. These tables remain empty without that evidence.

## Chat slice

Create `chat` with `id` (UUID), `processo_id` (INT FK to `processos.id`),
`remetente_nome`, `remetente_papel`, `remetente_simulado`, `mensagem` and
`created_at` (UTC). Add an index on `(processo_id, created_at, id)` and restrict
parent deletion. One row represents one submitted message. Do not seed a
fictional conversation or copy messages into both `chat` and `conversas`.

Expose internal GET and POST `/api/processos/:processoId/chat`. The POST accepts
only a client-generated UUID and nonempty message of at most 8,000 characters.
The server supplies the mock sender identity. Reusing the same UUID and exact
payload returns the same saved message; conflicting reuse returns 409. All
lookups and writes are scoped to the process. Unknown processes return 404.
History is paginated; new messages remain available after a reload.

The UI must resolve a process identifier separately from a case identifier,
load its persisted history, disable duplicate submissions, retain unsent text
on errors and show a message only after persistence succeeds. Switching
processes must discard stale async responses. Show the sender as simulated.

There is no real user access control yet. Enable this slice only in explicitly
configured local demo mode, reject production, non-loopback and forwarded
requests, and validate Host/Origin. This is not a production authorization
scheme. Remote use requires a later authenticated, process-scoped design.
Do not expose chat as an MCP tool or pass chat content to an external AI.

Verification: FK metadata, successful insert/read, reload/history behavior,
cross-process isolation, idempotent retry, conflicting UUID, invalid input,
unknown process, default-deny access, production denial and no raw-body logs.
Use a fake database for adversarial tests; do not insert test conversations
into real processes.

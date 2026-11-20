# ADR 0005 — PA mode

- **Status:** Accepted (Bossmann, 2026-10-20)
- **Date:** 2026-10-20
- **Deciders:** Bossmann (product and privacy), Gabriel Henrique (implementation), Gustavo (HITL surface)
- **Plan:** Phase 6.5 Tasks 6.5.1 and 6.5.2 in [`../plan/hub-office-platform.md`](../plan/hub-office-platform.md)

## Context

ADR 0001 splits runtime from capability. The default capability is consult: retrieval and a rewrite of cited snippets, with no mutation tool. PA mode is the optional post-v0 capability. Its product name is PA mode. The internal codename Hermes is not a product name.

Phase 6 shipped consult on the office-hosted runtime. `POST /api/rag/consult` returns cited snippets or stays silent. A generative call, when one is configured, rewrites those snippets and receives no tools. ADR 0003, still Proposed, would let the hub call a user-linked provider. That client is not built, and this ADR does not turn it on.

What does not exist yet: an opt-in for PA, an allowlist the model can call, an actor of `pa_session` with `delegated_by`, or a proof that a consult user cannot call those tools. This ADR fixes that contract. It adds no route, tool, or table.

## Decision

1. **Consult stays the default.** A user with no PA opt-in cannot call a mutation tool. Office-hosted consult keeps the Phase 6 contract: the model is called only after `cited`, a silent result does not call the model, and the model only rewrites snippets.
2. **PA is opt-in per person and per office.** Both must be on. The office list is `OFFICE_PA` and the person list is `PA_USERS`, each a comma-separated env value. Empty means nobody. An office flag alone does not enroll a person. A person flag alone does not enroll an office. `OFFICE_HOSTED_AI` gates consult. It does not grant PA.
3. **Roles.** The product role that may opt in is chefe or sócio. In the current fixture that papel is `socio`. `estagiario` stays on consult and cannot opt in. `advogado` and `gestor` stay on consult until a later decision names them. Another office's `socio` is not enrolled by this office's flag.
4. **Runtime is office-hosted only.** PA does not run on the linked provider. ADR 0003 stays Proposed. Accepting this ADR does not accept ADR 0003, and it does not send a PA session to an external provider.
5. **Allowlist.** The only tools a PA session may be offered are:
   - case read helpers (capa and child rows the same user can already read)
   - checklist read and the checklist writes the hub already allows that user
   - WhatsApp send, only through the existing confirm challenge
   - export of a case pack the same user can already read
   Nothing else is offered. Raw SQL, a shell, and any filesystem path are not tools. The model never receives a database handle or a file handle.
6. **Actor.** Every PA call is audited as `pa_session` with `delegated_by` set to the human user id and with that human's role. The session is not a second user. Disabling the human (JML) ends the session. A call with no `delegated_by` is denied.
7. **Human confirmation.** Irreversible actions require a human confirm before they run. WhatsApp send is irreversible and keeps the current challenge (`revisao`, single use, no send on a bare `confirm=true`). Export of a case pack is irreversible egress and needs its own confirm. A checklist write that the product already treats as reversible is still audited, and a later decision can move any of those writes onto the confirm path. The model cannot satisfy the confirm by itself. The `POST /api/pa/call` response never carries the confirm token (the 409 body is only `confirmacaoNecessaria` and the tool name); the human Confirmações screen reads it from `GET /api/pa/pendencias` and runs the action through `POST /api/pa/confirm`. The model credential comes from `POST /api/pa/sessao` (a `pas_` token, in memory, 10 minutes), and that credential is refused on pendencias, confirm, and every route except `POST /api/pa/call`.
8. **Audit is fail-closed.** Every mutation records the actor, `delegated_by`, the role, the tool name, and the case id. It does not record the tool arguments, the message body, or a phone number. If the audit write fails, the call fails and the mutation does not run.
9. **Learning is hub artifacts only.** "Learn together" means notes, checklist outcomes, and other artifacts the hub already stores for that office. It is not a fine-tune, and it is not training on client processos. No process text is exported as a training set by this ADR.
10. **No model access to the store.** Case reads go through the same Nest authorization as the human (`autorizarCapa`, membership, classification, Chinese wall). The model does not query TiDB and does not read the filesystem.

## Alternatives rejected

- **PA on the linked provider in the same ADR.** ADR 0003 is still Proposed, and a provider outside the office would receive tool calls. Office-hosted is the only runtime this ADR allows.
- **PA implied by `OFFICE_HOSTED_AI`.** Consult and PA are different capabilities. A consult office must not gain mutation tools because the consult flag is on.
- **Estagiário, advogado, or gestor on PA by default.** ADR 0001 gates PA to chefe or sócio. Widening the role is a separate decision.
- **A general tool runner, SQL, or filesystem access.** That breaks ADR 0001 §9 and ADR 0002. The allowlist is the whole surface.
- **Fine-tune on client processos.** Learning stays in hub artifacts. A training export is out of this ADR.

## Consequences

- This ADR adds no schema. Task 6.5.2 ships the allowlist after this acceptance.
- The opt-in flags are `OFFICE_PA` and `PA_USERS`. The allowlist is the four tools above. A consult user, including `estagiario`, receives a denial and no tool call. A PA session can propose a WhatsApp send and is blocked until the human confirm. A failed audit write fails the mutation.
- Bossmann accepted this ADR on 2026-10-20. Shipping the tools is the following change. ADR 0003 stays Proposed.
- Nothing here claims legal compliance. The legal assessment and the DPO's remain with the office.

## Not decided here

- Whether a checklist write is irreversible.
- The export file format.
- PA on a linked provider, which stays in ADR 0003.
- Any fine-tune, embedding change, or new RAG index.

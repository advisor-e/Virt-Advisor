# Saved-Client Intake Experience — Code Plan

Date: 2026-07-23
Status: DRAFT FOR IMPLEMENTATION (no code changes yet)
Owner: Mike + implementation branch owner

---

## 1) Problem statement

In a saved-client session, advisors are still being re-asked profile facts the system already has (notably industry and ownership). This weakens trust, adds friction, and creates an avoidable interruption in intake flow.

This plan defines how to:
- Use saved-client facts when present.
- Ask for confirmation/edit rather than re-asking from scratch.
- Keep all trust and security decisions backend-owned.
- Preserve current recommendation quality and traceability.

---

## 2) Constraints (non-negotiable)

1. Stack Constitution remains unchanged:
- Nuxt 2 + Vue 2 Options API.
- JavaScript only.
- Node 14.15 compatibility.
- Backend business logic in Restify, frontend as UI/proxy only.

2. Security and privacy:
- No cross-firm or cross-client leakage.
- No secrets in frontend.
- Frontend values are display/edit input only; backend remains source of truth.
- Existing safe error envelope and logging discipline retained.

3. Experience governance:
- Fail clearly when memory is unavailable (no silent fallback that looks like forgetfulness).
- No continuity claims unless prior-session evidence exists.
- Wording is i18n-ready.

---

## 3) Desired user experience

1. Saved-client context behavior
- If client facts exist and are trusted, the assistant confirms them.
- It does not ask open questions for those same facts first.

2. Confirm-or-edit behavior
- Prompt style becomes: "I have X as <value>. Keep this or update it?"
- Advisor can correct quickly and proceed.

3. Challenge recovery behavior
- If advisor says "you should know this", assistant acknowledges and presents known value for confirm/edit.

4. Honesty behavior
- If saved-client context is unavailable or partial, assistant says so plainly and asks concise fallback questions.

5. Continuity language behavior
- "Building on prior sessions" appears only with explicit prior-session evidence.

---

## 4) Implementation phases

## Phase A — Backend context resolution (source of truth)

Primary file:
- server/advisorEngine.js

Supporting reads:
- server/routes/clients.js
- server/utils/caseStore.js

Build tasks:
1. Add intake context resolver that determines:
- hasSavedClientContext (boolean)
- resolvedIndustry (string|null)
- resolvedOwnership (string|null)
- resolvedAdvisoryStage (string|null) — e.g. "Step 2: Assimilation"
- resolutionState (resolved|partial|unresolved)
- provenance flags per field

2. Extract from decisionTrace.situation using labeled-line parsing:
- Industry: <value>
- Business ownership: <value>
- Advisory Staircase position: Step X: <Name>

3. Resolve using backend-owned identity (firm-scoped), never trusting arbitrary client ids from the UI.

4. Return machine-readable context metadata for intake prompt selection.

Acceptance:
- Resolver returns deterministic structured output.
- Cross-firm lookup attempts fail closed.
- Advisory stage (all 5 steps) extracts correctly; partial results (1-2 of 3 fields) marked as such.


## Phase B — Intake prompt selection logic

Primary file:
- server/advisorEngine.js

Build tasks:
1. Replace first-question behavior for known fields:
- known -> confirm-or-edit prompt
- unknown -> normal concise question
- Applies to: industry, ownership, advisory staircase position

2. Add challenge branch:
- Detect challenge phrases (for example: "you should know this").
- Respond with acknowledgment + known value confirmation (if available).
- If unavailable, explain briefly and continue with fallback question.

3. Keep domain/cause-first logic unchanged except wording improvements needed for coherence.

Acceptance:
- Saved-client session no longer re-asks known industry/ownership/staircase as first resort.
- Challenge branch recovers without loop or dead-end.
- Advisor stage confirm prompt matches the 5-step table UI (preserves step name + description).


## Phase C — Continuity wording guard

Primary file:
- server/advisorEngine.js

Build tasks:
1. Add continuity gate:
- continuityClaimAllowed only when prior evidence is present.

2. If not allowed, force neutral wording (no implied historical certainty).

Acceptance:
- No ungrounded "building on prior discussions" claim when prior evidence absent.


## Phase D — Frontend rendering and i18n wiring

Primary file:
- components/VirtualAdvisor.vue

Build tasks:
1. Ensure confirm-or-edit prompts render clearly in current chat UI.
2. Keep UI passive: no business-rule ownership in component logic.
3. Add i18n keys for any new fixed strings.

Acceptance:
- Prompt rendering is clear and action-oriented.
- No frontend-only trust decisions.


## Phase E — Traceability and diagnostics

Primary file:
- server/advisorEngine.js

Build tasks:
1. Extend decision trace with:
- savedClientContextUsed (boolean)
- prefilledFields (array: industry|ownership|advisoryStage)
- confirmedFields (array: fields advisor confirmed without change)
- editedFields (array: fields advisor corrected)
- continuityClaimed (boolean)
- continuitySource (string: priorEngagementSummary|none)

2. Ensure no sensitive expansion beyond current trace discipline.

Acceptance:
- Reviewer can audit why each value (industry, ownership, stage) was used, asked, or re-confirmed.
- Trace clearly separates prefilled/confirmed/edited for support diagnostics.

---

## 5) Test plan

Existing test anchors:
- tests/unit/advisor.auth.test.js
- tests/unit/meetingCount.test.js (only if budget wording path touched)
- advisor-engine unit test area (new tests)

Required new tests:
1. Context resolution
- Saved client with all three fields (industry/ownership/stage) -> resolved.
- Missing fields -> partial/unresolved.
- Advisory stage extracts all 5 step levels correctly.

2. Isolation/security
- Same client id under foreign firm scope is rejected.
- Session cannot hydrate with another firm's values.

3. Intake behavior
- Resolved industry/ownership/stage trigger confirm-or-edit prompts.
- Unresolved fields trigger fallback question.
- Challenge phrase path returns acknowledge + confirm/edit (or transparent fallback).
- Confirm prompts preserve step names and descriptions for clarity.

4. Continuity claim gate
- No prior evidence -> continuity language absent.
- Prior evidence present -> continuity language allowed.

5. Regression safety
- Domain detection for conflict case remains correct.
- Recommendation count behavior for "2 maybe 3" remains intact.
- Staircase-based complexity ceiling still used in template filtering.

Definition of test completion:
- New tests green.
- Existing suite green.
- No lint regressions.

---

## 6) Live verification checklist (manual)

1. Saved-client conflict case (e.g. Jones Scaffolding)
- Industry confirmed as previously stated (not re-asked from zero).
- Ownership confirmed as previously stated.
- Advisory stage shown with step name + description; advisor confirms or updates.
- Challenge phrase ("you should know this") handled gracefully.
- Decision trace reflects which fields were prefilled/confirmed/edited.

2. Non-saved-client case
- Baseline intake still works normally.
- Fresh client gets all three questions asked normally.

3. Partial context case
- Client with only 1-2 prior fields gets remainder asked normally.

4. Security sanity
- Attempt with mismatched client/firm context does not expose foreign data.

---

## 7) Rollout and rollback

Rollout:
1. Add backend behavior flag for the new confirm-or-edit flow.
2. Enable in dev first.
3. Validate one real saved-client conversation.
4. Enable for UAT after manual signoff.

Rollback:
- Disable flag to return to legacy intake questioning without schema/data migration.

---

## 8) Risks and mitigations

1. Risk: stale or wrong remembered values reduce trust.
Mitigation: confirm-or-edit step always offered before dependent recommendations.

2. Risk: cross-firm leakage.
Mitigation: firm-scoped backend resolution only, test negative paths explicitly.

3. Risk: phrasing regressions (overconfident continuity claims).
Mitigation: explicit continuity gate + tests.

4. Risk: UX complexity increases.
Mitigation: only two fields (industry, ownership) in first pass; keep prompts concise.

---

## 9) Definition of done

Done means all of the following:
1. Saved-client industry/ownership/advisory-stage are confirmed rather than redundantly re-asked.
2. Advisory stage confirm prompt displays step name + description for clarity.
3. Advisor challenge path is acknowledged and resolved without friction.
4. Continuity language is evidence-gated.
5. Decision trace clearly records which fields were prefilled/confirmed/edited.
6. Unit tests cover all three fields + partial extraction + all 5 advisory steps.
7. Lint and full suite pass.
8. One manual saved-client run (e.g. Jones Scaffolding) verifies behavior end-to-end.

---

## 10) Out of scope (this plan)

1. Rewriting recommendation scoring.
2. New external integrations.
3. Changes to locked stack constitution.
4. Broad UX redesign outside saved-client intake behavior.

# Tasks: The Engine's Middle, and the Learning Loop Made True (4.97)

**Input**: Design documents from `specs/003-engine-middle-learning-true/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md).

**Tests**: included. The prompt Mike approved names them: *"the pre-filter, the classification field, the cap against every evidence kind, lift arithmetic, the boot refusal, the time split, the provider routing rule for personal data, at 100% on every validator."* Tests assert behaviour UAT cannot see; none asserts a label, a class or a file's existence.

**Organization**: by user story, so each is independently testable. **Every task is put to Mike as one recommendation and one yes/no before it is done** (the constitution; the live-app rule). Wording on any screen is his before it reaches code. The three plan-stage decisions and the three clarifications are settled and are not re-asked.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an unfinished task
- **[Story]**: US1 primary issue · US2 lift · US3 cap · US4 industry · US5 reach · US6 secret · US7 out-of-sample · US8 fallback · US9 profiles · US10 brief

## Path Conventions

Two-part app at the repository root: `server/` (Restify), `components/` / `utils/` / `locales/` (Nuxt 2), `tests/unit/`, `scripts/`, `design/mockups/`, `config/`.

---

## Phase 1: Setup — the drawings, before any code

**Purpose**: the Save-the-Artefact rule. Nothing in Phase 2 onward starts until all four drawings are approved by Mike as their own question.

- [x] T001 [P] Draw `design/mockups/primary-issue-proposal.html` — the conversation turn after the domain check-in: the proposal line (label, one reason, "have I got that right, or is it really something else?"), a confirm reply, a reframe reply and the re-proposal, the one open driver question, and the "no issue" continuation; the trace's new *Primary issue* line; real labels from `data/primary-issues.json`; style from an approved conversation drawing; wording table marked proposed; open questions each with one recommendation and the argument against
- [x] T002 [P] Draw `design/mockups/outcome-learning-lift-reach.html` — the Mentor Hub page with a *Direction* column (lift / hold-back) and signed sizes, the reach tiles (delivered, reviewed, read at), the bench card with in-sample and out-of-sample columns, the cut-off and count tested, the "not yet a later month" state, and the rewritten honesty line; the firm's Outcome Sharing tab with its reach pair and the secret-missing refusal message; real template titles; figures marked as examples
- [x] T003 [P] Draw `design/mockups/outcome-learning-trace-lift.html` — the Learned from outcomes panel: a lifted line (+n), a held-back line (−n), an outweighed line naming the evidence kind (distinction / primary issue / industry / signal), and the *Answered by* provider line; style from `components/VirtualAdvisor.vue`'s existing trace
- [x] T004 [P] Draw `design/mockups/template-profiles.html` — the Template Profiles tab: every template with its source (authored / generated / keyword-only / reviewed / none), the thin flag with its reason, the row editor with signal ticks and 1–10 weights (default 5 when first ticked), the summary's indicators read-only beside them, history and restore per row, the thin count in the header; real titles and real signal names from `server/utils/signals.js`
- [x] T005 Register the four drawings as rows in `design/ARTEFACTS.md`, each linking its file and `to-do-items.json` 4.97
- [x] T006 Put every question on the four drawings to Mike one at a time, one yes/no each; record each ruling on the drawing beside its recommendation; then ask him to approve each drawing itself as its own question and record that on the drawing and in `design/ARTEFACTS.md`. *(Done 2026-09-14: sixteen questions, sixteen rulings, four approvals. 🔴 **MIKE CAUGHT A WRONG SUBJECT IN DRAWING 4** — it listed 199 templates and he asked "199 seems light - i thought we had close to 290? check to be sure". It was drawn from the profile FILE, not the library: 291 templates, 220 client-facing. Redrawn the same hour; the thin count rose from 49 to 61 of 220, and two further questions came out of the recount. Two consequences were put to him outside the question list and approved with their drawings: a re-size may flip a LIVE row's direction without re-acceptance (drawing 2), and "Answered by" shows at every firm, sharing or not (drawing 3).)*

**Checkpoint**: ✅ reached 2026-09-14 — four approved drawings, every question ruled. Code may start.

> 🔴 **ONE BUILD TASK CAME OUT OF THE RULINGS AND BELONGS BEFORE US9's SCREEN**: run `node scripts/build-semantic-profiles.js` once, so any tool whose summary was written after the last build gets a compiled profile; the remainder are authored on the screen. Ruled by Mike 2026-09-14. It is T060a below.

---

## Phase 2: Foundational — the trace keys, the provider seam, the config

**Purpose**: the pieces several stories stand on. No screen yet.

- [ ] T007 In `server/advisorEngine.js` add three top-level keys to `_decisionTrace` (data-model §1): `primaryIssue: { label: null, how: 'none', reason: null }` (filled by US1), `industry: state.industry || null` (the `'skipped'`/`'pending'` sentinels mapped to null), and `ai: { provider: 'openai' }` (filled by US8); leave the `situation` string untouched with a comment naming `resolveSavedClientContext` as its reader
- [ ] T008 In `server/utils/outcomeLearning.js` `buildContribution`, read `trace.primaryIssue.label` and `trace.industry` instead of `trace.situation.*`; delete the object test on `situation`; JSDoc records the 2026-09-14 finding (the string situation made both fields null on every live row)
- [ ] T009 Update `tests/unit/outcomeLearning.test.js` and `tests/unit/casesContribute.test.js` fixtures to build `situation` as the **string** the engine writes and the two new keys, so the tests can no longer pass on a shape the engine never produces
- [ ] T010 [P] Add the `AI` block to `config/integration.js` (data-model §7): primary and fallback name/host/key/chat path, the role→model map for both, `fallbackPersonalCleared` (default false), every value from `process.env`; JSDoc names DeepSeek's China hosting and training terms as the reason the clearance defaults to false; add the variables with comments to `.env.example` and a section to `design/UAT-LOAD-PACK.md`
- [ ] T011 [P] Create `server/utils/aiProvider.js` (contracts §Provider seam) — `getClient(role)` returning `{ chat: { completions: { create(params, options) } } }`: `options.personal` required (throw `AI_PERSONAL_FLAG_MISSING` if absent); primary via `createOpenAIClient({ apiKey, host })`; on a thrown error, 401/402/429/5xx, or an empty reply, one fallback attempt only when configured and (`!personal || fallbackPersonalCleared`), with the role's fallback model substituted; reply gains `provider`; a helper `logSuffix(reply)` → `provider=<name> fallback=<none|used|refused-personal>`; streaming passes through the same rule (the fallback is only tried before the first delta)
- [ ] T012 Write `tests/unit/aiProvider.test.js` at **100%**: primary ok → no fallback call; primary throws / 401 / 402 / 429 / 500 / empty → fallback called once with the fallback model; personal + not cleared → fallback never called and the primary's error rethrown with `refused-personal` in the suffix; personal + cleared → fallback used; no fallback configured → behaviour identical to today; flag missing → throws
- [ ] T013 [P] In `server/utils/templateResolver.js`: accept `options.profileMap` (a `Map`) in place of the file-loaded map for that call; export `resolveIndustryWord(typed, vocabulary)` built from the same split, stop-word filter and `_matchesWord` as `_industryKeywords`; filter `_primaryIssueKeywords` through `STOP_WORDS` and match them against title + tags + purpose; export `ADVISOR_EVIDENCE = ['distinction:', 'primary_issue:', 'industry:title_match', 'industry:tag_match', 'semantic:', 'purpose_fallback:']`; bump `SCORING_VERSION` to `2.3.0` with the reason comment
- [ ] T014 [P] Write `tests/unit/resolveIndustryWord.test.js` — "cafes" → the vocabulary word the café model's title carries; a stop word → null; nothing matching → null; the same result as the resolver's own title match on a fixture

**Checkpoint**: the trace carries the two fields and the provider; the seam exists and is pinned; the resolver accepts a profile map. Nothing is wired to a screen.

---

## Phase 3: User Story 1 — The advisor confirms the primary issue (P1) 🎯 MVP

**Goal**: after the domain check-in the engine proposes one authored label with a reason; the advisor confirms or reframes; one open driver question when nothing matches; the label on the case, the trace, the pool and the lab.

**Independent Test**: quickstart Story 1.

### Tests for User Story 1

- [ ] T015 [P] [US1] Write `tests/unit/primaryIssueProposer.test.js` at **100%**: `rankLabels(domain, causeText, problemSignals)` — keyword overlap ranks the right label on fixtures for three domains; a signal-only case ranks; a tie returns `needsTiebreak`; no labels for the domain → null; context domains → null; `parseReply(text, proposed, domain)` — confirm patterns, a reframe that maps, a reframe that does not, the "none of these" phrases; the boxed AI tie-break accepts only a label in the list or `none` (valid, malformed, missing, wrong type)
- [ ] T016 [P] [US1] Write `tests/unit/issueProposedFlow.test.js` — the `QUESTIONS` sequence with a stubbed proposer: `issueProposed` follows `domainConfirmed`; skipped for `conflict`, `eoy`, `due-diligence` and any domain with no labels; confirm stores `state.primaryIssue` and `trace.primaryIssue.how === 'confirmed'`; reframe re-proposes once then stores `reframed`; miss asks `issueDriver` once, then `none` with a `[signal-miss]` log; a course correction clears the stored label; no selector marker is emitted; `retiredPrimaryIssueSelector.test.js` stays green

### Implementation for User Story 1

- [ ] T017 [US1] Create `server/utils/primaryIssueProposer.js` — `rankLabels`, `parseReply`, `proposalLine(label, reason)` (wording from the approved drawing), `CONTEXT_DOMAINS`, and `tiebreakWithModel(client, domain, candidates, causeText)` through `aiProvider.getClient('classify')` with `{ personal: false }`, temperature 0, a validator that accepts only a listed label or `none`
- [ ] T018 [US1] In `server/advisorEngine.js` add the `issueProposed` and `issueDriver` `QUESTIONS` entries after `domainConfirmed` (contracts §The advisor conversation); `onAnswer` per research R1; write `state.primaryIssue` and `trace.primaryIssue`; clear both on a course correction beside the existing reset; log `[signal-miss]` on a final miss; `logAI('issue-tiebreak', …)` on the model call
- [X] T019 [US1] In `server/utils/outcomeBench.js` `scenarioToCase`, set `primaryIssue` from `rankLabels` on the case's text (top label or `''`); in `scripts/scenario-lab.js` add the METRICS lines "Primary issue proposed: x/51" and "would confirm as proposed: y/51" and the *Issue* column on the at-a-glance table
- [ ] T020 [US1] In `components/VirtualAdvisor.vue` render the trace's *Primary issue* line from `lastTrace.primaryIssue` (label and how) via `$t('decisionTrace.issue*')`; add the keys to `locales/en.json`; no new identifiers from the retired-selector ban list

**Checkpoint**: quickstart Story 1 passes on the desktop against MySQL; a reviewed case at the consenting firm pools its label.

---

## Phase 4: User Story 2 — Learning lifts as well as holds back (P1)

**Goal**: one signed size per pairing; lifts and hold-backs share the floor, cap, gate and trace.

**Independent Test**: quickstart Story 2.

### Tests for User Story 2

- [X] T021 [P] [US2] Update `tests/unit/outcomeLearning.test.js` — net balance on hand-checked fixtures (31 delivered, 12 less, 19 well → size +2; 12 less, 0 well → −4; equal → 0 and `direction 'none'`), `holdBack === max(0, −size)`, `liveAdjustments` keeps `size !== 0` only, sort by absolute size
- [X] T022 [P] [US2] Update `tests/unit/pooledHoldback.test.js` — a lift raises the score by its size; a lift and a hold-back on one template net under the ±10 cap; the clamp at 1 holds; reasons `pooled:lifted-<n>` and `pooled:held_back-<n>`; a `size` of 0 or a malformed entry is dropped
- [X] T023 [P] [US2] Update `tests/unit/outcomeLearningTrace.test.js` — `applied[].direction` and `size` for both reasons; `outweighed[].size` signed

### Implementation for User Story 2

- [X] T024 [US2] In `server/utils/outcomeLearning.js` `computeAdjustments` emit `size` and `direction` (data-model §3), keep `holdBack` derived, sort by `Math.abs(size)`; `liveAdjustments` returns `size`
- [X] T025 [US2] In `server/utils/templateResolver.js` normalise `size` (signed, non-zero), net the matched sizes, cap at ±`POOLED_HOLDBACK_MAX`, apply `score = Math.max(1, score + net)`, write the two reason codes; update the block comment
- [X] T026 [US2] In `server/utils/outcomeLearningSession.js` parse both reason codes, add `direction` and `size` to `applied`, signed `size` to `outweighed`
- [X] T027 [US2] In `utils/traceReasonCodes.js`, `locales/en.json` and `design/WORDING-TRACE-REASONS.md` add `pooled:lifted-<n>`; in `components/VirtualAdvisor.vue` render `+n` / `−n` from `direction` per the approved trace drawing
- [X] T028 [US2] In `components/mentor/MentorOutcomeLearning.vue` add the *Direction* column and signed size per the approved drawing; `locales/en.json` keys; in `scripts/dev/seed-outcome-pool.js` add a landed-well template across all five firms so a lift crosses the floor locally, and update `tests/unit/seedOutcomePool.test.js`
- [X] T029 [US2] In `server/routes/outcomeLearning.js` `decision` route, `live` on a `size === 0` pairing is allowed and applies nothing (spec edge case); export returns signed sizes; update `tests/unit/outcomeLearning.routes.test.js`

**Checkpoint**: quickstart Story 2 passes; the Scenario Lab with the export shows a `pooled:lifted` reason on a matching case.

---

## Phase 5: User Story 3 — The advisor's own words always win (P1)

**Goal**: any of the six advisor-evidence reason families outweighs a pooled adjustment; the fixed bench proves zero cap breaches.

**Independent Test**: quickstart Story 3.

### Tests for User Story 3

- [ ] T030 [P] [US3] Extend `tests/unit/pooledHoldback.test.js` — for each of the six families, a template carrying it receives no pooled change and the reason `pooled:outweighed-<kind>` names the family; a template carrying none is adjusted
- [ ] T031 [P] [US3] Update `tests/unit/outcomeBench.test.js` — `fixedBench` returns `capBreaches`; a fixture where an adjusted template moves past an evidence-carrying one counts 1; the shipped 51 cases with the seed's live adjustments count 0

### Implementation for User Story 3

- [ ] T032 [US3] In `server/utils/templateResolver.js` replace the `distinction:` test with `ADVISOR_EVIDENCE.find(...)` and write `pooled:outweighed-<kind>` (kind map: `semantic:`/`purpose_fallback:` → `signal`, `industry:*` → `industry`)
- [ ] T033 [US3] In `server/utils/outcomeLearningSession.js` parse the kind into `outweighed[].by`; in `utils/traceReasonCodes.js`, `locales/en.json`, `design/WORDING-TRACE-REASONS.md` and `components/VirtualAdvisor.vue` render "outweighed by your {kind}" per the approved drawing
- [ ] T034 [US3] In `server/utils/outcomeBench.js` `fixedBench` compute `capBreaches` (a case where, comparing the plain and adjusted display sets, a template with an `ADVISOR_EVIDENCE` reason is ranked below a template that carries a `pooled:` reason and was below it before); surface it on the list route and the bench card; `scripts/scenario-lab.js` prints "Cap breaches on the fixed bench: 0/51"

**Checkpoint**: the fixed bench prints zero breaches with the seed's adjustments live.

---

## Phase 6: User Story 4 — The client's industry reaches the pool (P2)

**Independent Test**: quickstart Story 4.

- [ ] T035 [P] [US4] Extend `tests/unit/casesContribute.test.js` — a typed "cafes" pools the vocabulary word; "zzzz" pools null; the guard passes both
- [ ] T036 [US4] In `server/utils/outcomeLearning.js` `buildContribution` pool `resolveIndustryWord(trace.industry, industryVocabulary)`; `server/utils/outcomeContribute.js` passes the vocabulary as today

**Checkpoint**: quickstart Story 4 passes.

---

## Phase 7: User Story 5 — The mentor sees how far the loop reaches (P2)

**Independent Test**: quickstart Story 5.

- [ ] T037 [P] [US5] Write `tests/unit/caseStoreCounts.test.js` — `countReviewStatus(firmId)` issues one `COUNT` grouped on `reviewed_at IS NULL` scoped to `firm_id`, returns `{ delivered, reviewed }`, dev fallback counts the JSON file, a DB error surfaces
- [ ] T038 [US5] Add `countReviewStatus(firmId)` to `server/utils/caseStore.js` with the dev-fallback branch (research R5)
- [ ] T039 [US5] In `server/routes/outcomeLearning.js` `list` add `reach` summed over firms whose consent is on (via `listFirmIdsWithConfigKey(CONFIG_KEY)` + `contributionOpen`), cached 60 s beside the live list; in `server/routes/outcomeConsent.js` `read` add the firm's own pair; update both route tests
- [ ] T040 [US5] Render the reach tiles in `components/mentor/MentorOutcomeLearning.vue` and the pair in `components/firm/FirmOutcomeConsent.vue` per the approved drawing; `locales/en.json` keys

**Checkpoint**: both screens show the counts and they move on a new review.

---

## Phase 8: User Story 6 — The pool secret fails loud (P2)

**Independent Test**: quickstart Story 6.

- [ ] T041 [P] [US6] Write `tests/unit/outcomePoolBootCheck.test.js` at **100%**: consenting firm + no secret → rejects with the FATAL message; no consenting firm + no secret → resolves; secret set → resolves without reading consent; `NODE_ENV=test` → skipped; a store error → resolves with a logged warning (boot must not depend on the pool store being reachable)
- [ ] T042 [P] [US6] Extend `tests/unit/outcomeConsent.routes.test.js` — `set` with `on: true` and no secret → `503 POOL_UNAVAILABLE`, nothing written; `on: false` still allowed
- [ ] T043 [US6] Create `server/utils/outcomePoolBootCheck.js` `assertPoolSecretIfConsented()` (contracts §Boot check) and call it in `server/restify-server.js` before `server.listen`, exiting 1 on rejection with the message on stderr
- [ ] T044 [US6] In `server/routes/outcomeConsent.js` `set` refuse `on: true` when `firmToken` throws `OUTCOME_POOL_SECRET_MISSING`; in `components/firm/FirmOutcomeConsent.vue` show the approved refusal message on that code
- [ ] T045 [US6] Rewrite the secret's line in `design/UAT-LOAD-PACK.md` §3 and the comment block in `.env.example` per Mike's ruling (optional until any firm shares; required from then; never changed once set)

**Checkpoint**: quickstart Story 6 passes on the desktop.

---

## Phase 9: User Story 7 — The bench is honest about what it measured (P2)

**Independent Test**: quickstart Story 7.

- [ ] T046 [P] [US7] Extend `tests/unit/outcomeBench.test.js` — `timeSplitBench` trains on every earlier month and tests on the latest; only live ids meeting the floor **in the training set** apply; fewer than `MIN_CASES` test rows → `insufficient: true` and null figures; one month only → insufficient; the result shape per data-model §4
- [ ] T047 [US7] Add `timeSplitBench(poolRows, decisions, templates)` to `server/utils/outcomeBench.js` and include it in `runBenches`; store as `benches.timeSplit`
- [ ] T048 [US7] In `components/mentor/MentorOutcomeLearning.vue` add the out-of-sample column, cut-off, count tested, the insufficient state and the rewritten honesty line per the approved drawing; `locales/en.json`; `scripts/outcome-bench.js` prints the third result; `scripts/dev/seed-outcome-pool.js` gains `--months <n>` for the quickstart's one-month check

**Checkpoint**: the bench card shows three figures or an honest sentence.

---

## Phase 10: User Story 8 — The AI keeps working when the first provider fails (P2)

**Independent Test**: quickstart Story 8.

- [ ] T049 [P] [US8] Write `tests/unit/aiCallSitesPersonal.test.js` — reads every backend call site through the seam and asserts the `personal` flag per research R8's table (the three personal sites are `true`; the four advisor-conversation sites are `false` per Mike's ruling); asserts the Responses-API and audio sites do not go through the seam and log `fallback=none`
- [ ] T050 [US8] Move the eleven hardcoded model names into the role map: `server/advisorEngine.js` (classify, narrative), `server/courseEngine.js` (course), `server/utils/anonymiseCase.js`, `server/utils/hubReading.js` (reading), `server/routes/promptCheck.js` (review), `server/utils/meetingReports.js` (report), `server/utils/complianceCheck.js` (compliance), `server/routes/nextStepsDraft.js` (draft), `server/routes/economicAnalysis.js` (research), `server/utils/depreciationExtract.js` (extract); each reads `AI.models[role]`
- [ ] T051 [US8] Route the 21 chat-completions call sites through `aiProvider.getClient(role)` with `{ personal }` per the table: `server/advisorEngine.js` (10 sites), `server/courseEngine.js` (4), `server/routes/cases.js` → `anonymiseCase` (personal), `server/utils/hubReading.js`, `server/routes/promptCheck.js`, `server/utils/complianceCheck.js`, `server/utils/meetingReports.js` (2, personal); keep every existing validator and failure path; append `logSuffix` to every AI log line, and add a `logAI` line to `pickLearnTreeAI` which has none
- [ ] T052 [US8] Record the provider: `trace.ai.provider` from the recommendation call in `server/advisorEngine.js`; a `provider` sibling to `model` on the stored meeting reports, hub reading and transcript (`transcriptionClient` reports `openai`); `components/VirtualAdvisor.vue` renders the *Answered by* line per the approved trace drawing
- [ ] T053 [US8] For the four no-fallback sites (`server/routes/economicAnalysis.js`, `server/utils/depreciationExtract.js`, `server/utils/countryScheduleRead.js`, `server/routes/meetingReview.js` transcription) append `provider=openai fallback=none` to their log lines and a one-line comment naming why no fallback exists

**Checkpoint**: quickstart Story 8 passes with a configured second provider; with none configured the suite and behaviour are unchanged.

---

## Phase 11: User Story 9 — The mentor authors each template's profile (P3)

**Independent Test**: quickstart Story 9.

### Tests for User Story 9

- [ ] T054 [P] [US9] Write `tests/unit/semanticProfiles.test.js` — `loadEffectiveProfiles()` merges authored rows over the compiled file by page and covers every client-facing tool in the library, including the 7 with no compiled entry; TTL 60 s; `isThin(entry)` on the four rules (no entry, empty, weights below 4, keyword-only); `validateProfile(body, signalTypes, library)` at **100%** (unknown signal, weight 0 / 11 / non-integer, unknown page, empty profile valid, note cap); `scripts/build-semantic-profiles.js` output never contains an authored page's row (the store is the source, not the file)
- [ ] T055 [P] [US9] Write `tests/unit/semanticProfiles.routes.test.js` — list returns every library template with `effective`, `source`, `thin`, `thinReason`, `indicators`; PUT writes `semantic-profile:<page>` at `PLATFORM_SCOPE` with `req.userEmail`, refuses on validation; history and restore call the store with that key; safe error shape on store failure

### Implementation for User Story 9

- [ ] T056 [US9] Create `server/utils/semanticProfiles.js` — `PROFILE_PREFIX = 'semantic-profile:'`, `loadEffectiveProfiles()`, `isThin`, `validateProfile`, `clearProfileCache()`; indicators read from `content-summaries.json` via `templateRegistry`
- [ ] T057 [US9] Create `server/routes/semanticProfiles.js` (contracts §New routes) and register the four routes in `server/restify-server.js` under `mentorGuard`
- [ ] T058 [US9] In `server/advisorEngine.js` load `loadEffectiveProfiles()` beside the pooled read and pass `options.profileMap` into both resolver passes; `server/utils/outcomeBench.js` and `scripts/scenario-lab.js` do the same so the benches score what the engine scores
- [ ] T059 [US9] Create `components/mentor/MentorSemanticProfiles.vue` from the approved drawing (Options API, Pug, Buefy, `$t('semanticProfiles.*')`), modelled on `MentorTemplateLibrary.vue`; register it in `components/FirmManagerHub.vue` with `TAB_TIERS.semanticProfiles = ['mentor']`, a `NAV_GROUPS` item appended to *Your AI coach*, a panel, and the tier judgement as a comment; add `semanticProfiles` to `MENTOR_ADDED_SINCE` in `tests/unit/hubTabTiers.test.js` with the ruling; `locales/en.json` namespace
- [ ] T060a [US9] Run `node scripts/build-semantic-profiles.js` once and commit the result before the screen ships (Mike's ruling 2026-09-14): it compiles any tool whose summary was written after the last build. Report the before and after counts — today 199 entries cover 220 client tools, 7 have no entry at all and 61 are thin. Whatever remains uncompiled is authored on the screen, because the compiler cannot invent a profile for a tool with no summary
- [ ] T060 [US9] `scripts/scenario-lab.js` prints "Templates with a thin effective profile: n/220" and marks each case's top card with whether a `semantic:` reason carried it; `scripts/build-semantic-profiles.js` header comment says authored rows live in the store and this file is the seed

**Checkpoint**: quickstart Story 9 passes; a compiler re-run leaves the authored row untouched.

---

## Phase 12: User Story 10 — The engine brief tells the truth about routing groups (P3)

- [ ] T061 [US10] In `design/features/advisory-engine.md` rewrite §3's "designed, not built" paragraph, the §4 pipeline table rows 2–3, and the Known gaps line: primary-issue confirmation built by 4.97; routing groups removed by the registry's ruling of 2026-06-09, cited; in `design/virt-advisor-registry.md:551` correct the `__none_of_these__` sentinel line (handler deleted 2026-08-15)

---

## Phase 13: Polish and the record

- [ ] T062 Open each approved drawing beside the built screen and name every difference in `design/ARTEFACTS.md` (deliberate deviations recorded; none unrecorded)
- [ ] T063 Run `npm run lint`, `npm test` with coverage, `npm run build`, `node scripts/scenario-lab.js`, `node scripts/outcome-bench.js`; record the METRICS block in `design/SCENARIO-LAB-REPORT.md`
- [ ] T064 Walk `quickstart.md` on the production build against local MySQL; note anything not shown locally
- [ ] T065 Update `design/features/outcome-learning.md` §8 (lift, cap, reach, time split, the trace fault and its fix) and `design/features/advisory-engine.md` §4 (the proposer, `SCORING_VERSION` 2.3.0, `aiProvider`, the profile store); keep the prompt Mike approved verbatim in the brief; one fact, one home
- [ ] T066 Close 4.97 on `design/features/to-do-items.json` per the shutdown checklist: `activeOn` cleared, the note replaced, the closure written on `to-do-done-and-parked.md`

---

## Dependencies and execution order

- **Phase 1** blocks everything (the artefact rule).
- **Phase 2** blocks every story: T007–T009 (the trace keys) are needed by US1 and US4; T010–T012 by US1's tie-break and US8; T013–T014 by US2, US3, US4 and US9.
- **US1** first: it is the MVP and it populates the pool's primary issue.
- **US2 → US3**: the cap rule reads the signed sizes; do them in that order.
- **US4, US5, US6, US7** are independent of each other after Phase 2 and after US2 (US7 reads signed sizes).
- **US8** is independent after T010–T012; it touches many files, so it runs alone, not beside another story.
- **US9** is independent after T013.
- **US10** is documentation and can run any time after Phase 1.
- **Phase 13** last.

## Parallel opportunities

- T001–T004 (four drawings) together.
- T010/T011/T012 (provider seam) beside T013/T014 (resolver seam) beside T007–T009 (trace keys).
- T015/T016 beside T017 once the interface is agreed; T021/T022/T023 together; T054/T055 together.

## Implementation strategy

MVP = Phase 1 + Phase 2 + US1. That alone puts the confirmed primary issue on every new case and fixes the pool's blank fields. Then US2 and US3 together (one release of the resolver, one `SCORING_VERSION` bump). Then US4–US7 as small increments. Then US8 alone. Then US9. US10 whenever a session has ten minutes. Each story ends with its quickstart section walked on the built app before the next begins.

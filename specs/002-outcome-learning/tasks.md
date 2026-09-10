# Tasks: Learning from Outcomes Across Consenting Firms (4.87)

**Input**: Design documents from `specs/002-outcome-learning/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md).

**Tests**: included. Mike's task text asks for them by name: *"the consent gate, the anonymisation guard, the threshold, the cap on adjustments, and the trace, with the AI-output and anonymisation validators at 100% coverage."* Tests assert behaviour UAT cannot see; none asserts a label, a class or a file's existence.

**Organization**: by user story, so each is independently testable. **Every task is put to Mike as one recommendation and one yes/no before it is done** (the constitution; the live-app rule). Wording on any screen is his before it reaches code.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an unfinished task
- **[Story]**: US1 consent · US2 mentor decides · US3 advisor sees why · US4 measured

## Path Conventions

Two-part app at the repository root: `server/` (Restify), `components/` / `pages/` / `utils/` / `locales/` (Nuxt 2), `tests/unit/`, `scripts/`, `design/mockups/`.

---

## Phase 1: Setup — the drawings, before any code

**Purpose**: the Save-the-Artefact rule. Nothing in Phase 2 onward starts until all three drawings are approved by Mike as their own question.

- [x] T001 [P] Draw `design/mockups/outcome-learning-consent.html` — the firm manager's switch (state, who, when), the separate withdraw action with the count it would remove, and the advisor's one line on the case review; style copied from `design/mockups/compliance-pages.html`; wording table marked proposed; open questions each with one recommendation and the argument against
- [x] T002 [P] Draw `design/mockups/outcome-learning-mentor.html` — firms and cases in the pool, last recompute and "Recompute now", each adjustment with template, dimension, value, counts, floor, hold-back size and state, accept / hold / reject with reason, history, bench figures, empty state, orphaned list; real template titles from the data files, figures marked as examples; question 1: industry enters only when it matches the resolver's vocabulary (research §9)
- [x] T003 [P] Draw `design/mockups/outcome-learning-trace.html` — the Outcome Learning section on "Why this?": applied and outweighed lines with counts, and the "learning unavailable" line; style from `components/VirtualAdvisor.vue`'s existing trace; question 1: `POOLED_HOLDBACK_MAX = 10` (research §4)
- [x] T004 Register the three drawings as rows in `design/ARTEFACTS.md`, each linking its file and `to-do-items.json` 4.87
- [x] T005 Put every question on the three drawings to Mike one at a time, one yes/no each; record each ruling on the drawing beside its recommendation; then ask him to approve each drawing itself as its own question and record that on the drawing and in `design/ARTEFACTS.md`
- [x] T006 Put the two named additions in plan.md Complexity Tracking to Mike, one at a time: the prefix delete on the overlay store, and `OUTCOME_POOL_SECRET`; record his answers on plan.md

**Checkpoint**: ✅ reached 2026-09-10 — three approved drawings, every question ruled, both additions ruled. Code may start.

---

## Phase 2: Foundational — the store, the shape, the arithmetic

**Purpose**: the pieces every story stands on. No screen yet.

- [x] T007 Add `deleteFirmConfigsByPrefix(firmId, keyPrefix)` to `server/utils/firmOverlay.js` — hard-deletes every version of every row at that scope whose `config_key` starts with the prefix; refuses an empty prefix and any prefix not ending in `:`; export it; JSDoc says why it exists (withdrawal must remove, history is append-only)
- [x] T008 [P] Write `tests/unit/firmOverlayDeletePrefix.test.js` — deletes only the matching prefix at only the given scope; refuses empty and non-terminated prefixes; a DB error surfaces, never swallowed
- [x] T009 [P] Create `server/utils/outcomeConsent.js` — `CONFIG_KEY = 'outcome-consent'`, `readConsent(value) → cleaned | null` (data-model §1), `contributionOpen(stored)` (one condition), `firmToken(firmId)` and `caseHash(caseId)` using `crypto.createHmac('sha256', process.env.OUTCOME_POOL_SECRET)`, throwing `OUTCOME_POOL_SECRET_MISSING` when unset; the consent wording constant pinned from the approved consent drawing with a comment saying it is Mike's
- [x] T010 [P] Write `tests/unit/outcomeConsent.test.js` — `readConsent` accepts the exact shape and returns null on every malformed input; `contributionOpen` is true only for `on === true`; tokens are stable, 24/16 hex, differ per secret, and throw without a secret
- [x] T011 [P] Create `server/utils/outcomeLearning.js` — `MIN_FIRMS = 5`, `MIN_CASES = 25`, `POOLED_HOLDBACK_MAX = 10`, `POOL_PREFIX = 'outcome-pool:'`, `DECISIONS_KEY = 'outcome-adjustments'`; `buildContribution(caseRow, libraryTitles, signalTypes, industryVocabulary)` (data-model §2, month only, industry only on vocabulary match, no free text); `guardContribution(obj)` throwing `OUTCOME_GUARD_<REASON>` per data-model §2; `adjustmentId(template, dimension, value)`; `computeAdjustments(poolRows, decisions, libraryTitles)` → data-model §3 with state, firms as distinct tokens parsed from the row keys; `liveAdjustments(computed)` → the resolver option shape
- [x] T012 Write `tests/unit/outcomeLearning.test.js` — guard at **100%**: every allowed key, every refused key, each type, each length, `@`, `://`, six digits, UUID shape, unknown domain/signal/engagement/title, and that a refusal throws with nothing returned; arithmetic: hand-checked counts on a fixture (31 delivered, 12 less → hold-back 4), the floor on both edges (4 firms/25 cases and 5 firms/24 cases fail; 5/25 passes), one prolific firm cannot meet the firm floor, hold-back 0 lists and applies nothing, `below_floor` overrides a `live` decision, orphaned when the title is gone, `live` only from an explicit decision
- [x] T013 Add `OUTCOME_POOL_SECRET=` with a one-line comment to `.env.example`, and a line to the UAT pack document that lists backend environment variables (confirm its path at build; `design/DEPLOYED-VERSIONS.md` notes or the master-team email)

**Checkpoint**: the shape, the guard, the arithmetic and the store addition exist and are pinned. Nothing is wired.

---

## Phase 3: User Story 1 — A firm manager decides whether their firm contributes (P1) 🎯 MVP

**Goal**: consent on/off and withdrawal at the firm tier; reviews at a consenting firm enter the pool in the anonymised shape; nothing from any other firm does; the advisor sees the one line.

**Independent Test**: quickstart Story 1 — one firm on, one off; only the on firm's review appears as a pool row; switching off stops new rows; withdrawal removes them and reports the count.

### Tests for User Story 1

- [x] T014 [P] [US1] Write `tests/unit/outcomeConsent.routes.test.js` — GET returns the consent and `pooledCount` for `req.firmId`; POST writes `setBy`/`setAt` from `req.userEmail`, ignores any `firmId` in the body, stores the pinned wording; withdraw calls `deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:<token>:')` and nothing wider, appends to `withdrawals`, returns `removed`; every failure returns the safe error shape
- [x] T015 [P] [US1] Write `tests/unit/casesContribute.test.js` — `reviewCase` with consent on saves the review then `saveFirmConfig(PLATFORM_SCOPE, 'outcome-pool:<token>:<hash>', shape)`; with consent off saves nothing to the pool; a guard throw is logged and the review response is unchanged; a missing secret is logged and the review response is unchanged; the pooled object equals `guardContribution`'s return exactly

### Implementation for User Story 1

- [x] T016 [US1] Create `server/routes/outcomeConsent.js` — `read`, `set`, `withdraw` per contracts §Firm manager; withdraw recomputes nothing itself but calls the recompute helper from T024 once it exists (until then, a TODO naming T024 is not acceptable — order T024 before this if built in one sitting)
- [x] T017 [US1] Register the three routes in `server/restify-server.js` under `/api/firm-manager/outcome-consent` with `[firmAuth, requireManagerRole]`
- [x] T018 [US1] In `server/routes/cases.js` `reviewCase`, after `updateReview` resolves: load consent for `req.firmId`; if open, `buildContribution` from the row the route loaded, `guardContribution`, `saveFirmConfig` at `PLATFORM_SCOPE`; wrap in its own try/catch that logs `[outcome-learning]` with the case id and never alters the review response
- [x] T019 [US1] Add `outcomeContribution: boolean` to the case-load response the review screen already calls in `server/routes/cases.js`, computed from the caller's firm consent (contracts §Advisor)
- [x] T020 [US1] Create `components/firm/FirmOutcomeConsent.vue` from the approved consent drawing — Options API, Pug, Buefy; loads GET, switches via POST, withdraw behind a confirm that shows `pooledCount`; loading and error states; all strings via `$t('outcomeConsent.*')`. *(Built 2026-09-11 beside its siblings in `components/firm/`. The drawing's History card and its "adjustments applying" count needed two backend additions: `events` on the consent record, and `adjustmentsApplying` on the read route.)*
- [x] T021 [US1] Add `outcomeConsent: ['firm']` to `TAB_TIERS` and `{ key: 'outcomeConsent', i18n: 'outcomeConsent.tab' }` appended to the *Compliance* group in `NAV_GROUPS`, register the component and its panel in `components/FirmManagerHub.vue`, with the one-line tier judgement as a comment
- [x] T022 [US1] Show the approved one-line notice on the case-review screen when `outcomeContribution` is true — `components/VirtualAdvisor.vue`, fed by `mixins/caseMixin.js` from the case-list response — via `$t('outcomeConsent.advisorNotice')`
- [ ] T022a [US1] Industry field on the intake offers suggestions from the engine's industry vocabulary as the advisor types (Mike's ruling on drawing 2, 2026-09-10: *"start typing - it makes suggestions - if no match - doesnt save"*); the component is named at build from where the intake collects `industry`; the typed value still saves to the case, and `buildContribution` (T011) pools industry only on an exact vocabulary match
- [x] T023 [US1] Add the `outcomeConsent` namespace to `locales/en.json` with the approved wording; pin the firm's tab entry in `tests/unit/hubTabTiers.test.js`. *(English only, as every feature namespace since `advisor.*` is — the seven other locale files hold 8 of the 40 sections and vue-i18n falls back to English. The mentor's tab entry is pinned when T028 adds it.)*

**Checkpoint**: quickstart Story 1 passes end to end on the desktop against MySQL.

---

## Phase 4: User Story 2 — The mentor sees what has been learned and decides what goes live (P2)

**Goal**: the Mentor Hub page: counts, adjustments with evidence and state, accept / hold / reject, history and restore, recompute on open and on demand.

**Independent Test**: quickstart Story 2 — a seeded pool crossing the floor lists one proposed adjustment; accept makes it live with name and time; reject with reason stops it; restore brings it back; a withdrawal takes it below the floor and the page says so.

### Tests for User Story 2

- [x] T024 [P] [US2] Write `tests/unit/outcomeLearning.routes.test.js` — GET recomputes from `loadFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:')` and returns counts, floor, cap, adjustments and benches; decision refuses `live` below the floor (400 `OUTCOME_BELOW_FLOOR`) and an unknown id (404); decision writes `by`/`at` from `req.userEmail`; history and restore call the store with `PLATFORM_SCOPE` and `'outcome-adjustments'`; export returns only live adjustments in the resolver shape; store failure returns the safe error shape; a 10,000-row fixture recomputes under 2000 ms

### Implementation for User Story 2

- [x] T025 [US2] Create `server/routes/outcomeLearning.js` — `list` (GET, recomputes), `recompute` (POST), `decision`, `history`, `restore`, `export`, and a `recomputeAndPersist()` helper used by list, recompute and T016's withdraw; per contracts §Mentor
- [x] T026 [US2] Register the routes in `server/restify-server.js` under `/api/mentor/outcome-learning` with `mentorGuard`; wire T016's withdraw to `recomputeAndPersist()`
- [x] T027 [US2] Create `components/mentor/MentorOutcomeLearning.vue` from the approved mentor drawing — counts and floor, last recompute and "Recompute now", the adjustment table with state chips, accept / hold / reject with a reason field, history list with restore, the empty state, the orphaned list, the bench figures block (filled by US4); loading and error states; strings via `$t('outcomeLearning.*')`. *(Built 2026-09-11 beside its siblings in `components/mentor/`. The reject-needs-a-reason ruling is enforced on the decision route too, not only on the screen. Until US4 the bench card carries the sentence Mike ruled for it, and no "Run the benches" button.)*
- [x] T028 [US2] Add `outcomeLearning: ['mentor']` to `TAB_TIERS` and `{ key: 'outcomeLearning', i18n: 'outcomeLearning.tab' }` appended to *Rolled up from below* in `NAV_GROUPS`; register the component and panel in `components/FirmManagerHub.vue`; the FR-014 one-line judgement as the comment; extend the pin in `tests/unit/hubTabTiers.test.js`
- [x] T029 [US2] Add the `outcomeLearning` namespace to `locales/en.json` with the approved wording *(English only, for the reason on T023)*
- [ ] T030 [US2] Write `scripts/dev/seed-outcome-pool.js` — writes a seeded pool through `guardContribution` and `saveFirmConfig` (never around them) for quickstart Story 2; dev only, refuses to run when `NODE_ENV=production`

**Checkpoint**: quickstart Story 2 passes.

---

## Phase 5: User Story 3 — An advisor sees why a recommendation moved (P3)

**Goal**: live adjustments apply in the resolver, capped and clamped, skipped when the advisor's own words matched a distinction, only at consenting firms, degraded to nothing on any failure, and visible on the trace.

**Independent Test**: quickstart Story 3 — the trace shows the held-back line with counts at a consenting firm; shows outweighed when a distinction matched; shows nothing at a non-consenting firm; still answers with MySQL stopped and says learning was unavailable.

### Tests for User Story 3

- [x] T031 [P] [US3] Write `tests/unit/pooledHoldback.test.js` — on a fixed template set: one matching live adjustment subtracts its hold-back and pushes `pooled:held_back-<n>`; several matching sum and cap at 10; a template with a `distinction:` reason is untouched and pushes `pooled:outweighed`; clamp at 1 (a score-3 template with hold-back 10 ends at 1, never drops from the log); `pooledAdjustments: []` leaves every score identical to a run without the option; dimension matching for each of the four dimensions, and a non-matching value applies nothing; ordering: applied before the history clamp, so history and pooled together still clamp at 1
- [x] T032 [P] [US3] Extend `tests/unit/decisionTraceI18n.test.js` — `pooled:held_back-4` resolves to `decisionTrace.reasonPooledHeldBack` with `{ n: 4 }`, `pooled:outweighed` to `decisionTrace.reasonPooledOutweighed`, and both keys exist in all eight locales
- [x] T033 [P] [US3] Write `tests/unit/outcomeLearningTrace.test.js` — the engine's trace block (data-model §5) is computed from the scoring log: `applied` lists only templates carrying `pooled:held_back-*`, `outweighed` only those carrying `pooled:outweighed`, `consented: false` gives both empty, `available: false` when the pool read throws, and the recommendation still resolves (FR-019)

### Implementation for User Story 3

- [x] T034 [US3] In `server/utils/templateResolver.js`: read `options.pooledAdjustments`, apply per contracts §Resolver immediately before the client-history clamp, export `POOLED_HOLDBACK_MAX`, bump `SCORING_VERSION`, comment the why (advisor's words win; clamp at 1 for the same reason as history)
- [x] T035 [US3] In `server/advisorEngine.js`: before resolving, read consent for `req.firmId` and the live adjustments via `outcomeLearning.js` (pool rows + decisions), inside a try/catch that degrades to `[]` with `available: false`; pass `pooledAdjustments`; after resolving, emit `decisionTrace.outcomeLearning` from the scoring log
- [x] T036 [US3] Add the two `REASON_RULES` entries to `utils/traceReasonCodes.js` and the two keys to `decisionTrace` in all eight `locales/*.json` with the approved wording; add the same two codes to `explainReasons()` in `scripts/scenario-lab.js`; add the wording to `design/WORDING-TRACE-REASONS.md` beside the existing rulings
- [x] T037 [US3] Add the Outcome Learning section to the "Why this?" panel in `components/VirtualAdvisor.vue` from the approved trace drawing — applied lines, outweighed lines, the unavailable line, nothing when both lists are empty and `available` is true

**Checkpoint**: quickstart Story 3 passes; the Scenario Lab still runs clean with no adjustments file.

---

## Phase 6: User Story 4 — The improvement is measured before it ships (P4)

**Goal**: two benches report before-and-after figures, visible on the mentor page with the run date.

**Independent Test**: quickstart Story 4 — both scripts print before/after; the bench route stores the four figures; the page shows them.

### Tests for User Story 4

- [ ] T038 [P] [US4] Write `tests/unit/outcomeBench.test.js` — on a small pool fixture the replay reports the share of outcomes whose top template that review marked `well`, with and without adjustments, deterministic; a pool row lacking a `well` verdict on any template is counted in the denominator only as the spec's SC-005 defines (state the rule in the test)
- [ ] T039 [P] [US4] Extend `tests/unit/outcomeLearning.routes.test.js` — the bench route stores `benches.fixed` and `benches.outcome` with `ranAt` and `liveIds` on the decisions row; when a run exceeds the limit it returns `jobId` (only if T041 finds it necessary)

### Implementation for User Story 4

- [ ] T040 [US4] Add `--adjustments <file>` to `scripts/scenario-lab.js` — loads the export shape and passes it as `pooledAdjustments`; the METRICS block names the file and the count of live adjustments applied
- [ ] T041 [US4] Create `scripts/outcome-bench.js` and its library half `server/utils/outcomeBench.js` — reads the pool through the store, replays each outcome's situation through `resolveTemplates` with and without live adjustments, prints and returns the two shares; measure the run time on the seeded pool and decide whether the route needs a job id
- [ ] T042 [US4] Add the `bench` route to `server/routes/outcomeLearning.js` and register it; store the figures on the decisions row; add the "Run the benches" action and the figures block to `components/MentorOutcomeLearning.vue`

**Checkpoint**: quickstart Story 4 passes.

---

## Phase 7: Polish & cross-cutting

- [ ] T043 Lay each built screen beside its drawing and name every difference on the drawing itself and in `design/ARTEFACTS.md` (Save-the-Artefact rule)
- [ ] T044 [P] Update `design/features/outcome-learning.md` §8 "For the coder" to name the built files, and replace "Nothing is built" with the state as built; update `design/features/README.md` if the Handbook needs the page re-grouped
- [ ] T045 [P] Update `design/features/to-do-items.json` 4.87: note, `waitingOn`, and clear `activeOn` when the desktop's work is done
- [ ] T046 Run the whole of quickstart.md on the desktop against MySQL; `npm run lint`, `npm test` with thresholds, `npm run build`
- [ ] T047 Confirm `server/utils/` and `server/routes/` coverage did not fall below their floors, and `guardContribution` / `computeAdjustments` report 100%

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (drawings)**: no code dependency; blocks everything else by rule.
- **Phase 2 (foundational)**: after Phase 1; blocks all stories.
- **US1 (Phase 3)**: after Phase 2. T016's withdraw needs T025's recompute helper — build T025's helper first, or land US1 and US2 together.
- **US2 (Phase 4)**: after Phase 2; independent of US1 except the withdraw wiring above.
- **US3 (Phase 5)**: after Phase 2 and US2's `liveAdjustments` path; needs at least one live adjustment to eyeball, so after US2 in practice.
- **US4 (Phase 6)**: after US2 and US3.
- **Polish (Phase 7)**: after every story that ships.

### Within each story

Tests first and failing → store/util → route → registration → component → hub entry → locales.

### Parallel Opportunities

- Phase 1: T001, T002, T003 in parallel; T004–T006 after.
- Phase 2: T008, T009, T010, T011 in parallel after T007 is agreed; T012 after T011; T013 any time.
- US1: T014 and T015 in parallel; T020–T023 after T016–T019.
- US2: T024 alone; T027–T030 after T025–T026.
- US3: T031, T032, T033 in parallel; T036 and T037 after T034–T035.
- US4: T038, T039 in parallel; T040 independent of T041.

---

## Parallel Example: Phase 1

```text
Task: "Draw design/mockups/outcome-learning-consent.html"
Task: "Draw design/mockups/outcome-learning-mentor.html"
Task: "Draw design/mockups/outcome-learning-trace.html"
```

## Parallel Example: User Story 3

```text
Task: "Write tests/unit/pooledHoldback.test.js"
Task: "Extend tests/unit/decisionTraceI18n.test.js"
Task: "Write tests/unit/outcomeLearningTrace.test.js"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1: three drawings approved.
2. Phase 2: store addition, consent, shape, guard, arithmetic — all pinned by tests.
3. Phase 3: consent switch, withdrawal, contribution at review time, the advisor's line.
4. **Stop and validate** with quickstart Story 1 on the desktop. At this point firms can opt in and the pool fills; nobody's recommendation has changed.

### Incremental delivery

- US2 makes the pool visible and decidable; still nothing changes for an advisor until the mentor accepts something.
- US3 is the first change to a recommendation, behind consent, the floor, the mentor's acceptance and the cap, all visible on the trace.
- US4 puts the number on the page.

### Notes

- 47 tasks. Every one is a yes/no to Mike at implement time; a "no" on a drawing question reshapes the tasks under it, and this file is updated then.
- No task creates a branch, a schema change, a dependency, or a screen at a tier the spec does not name.

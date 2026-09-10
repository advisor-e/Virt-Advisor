# Research: Outcome Learning (4.87)

Read in the code on 2026-09-10. Line numbers are as of master `e46c36c`; re-check at build.

## 1. Where the verdicts are, and the contribution moment

**Found.** `server/utils/caseStore.js` L399–431: `OUTCOME_USED = ['full','partial','none']`, `OUTCOME_RESULT = ['well','less']`, `sanitiseTemplateOutcomes(raw, caseTemplates)` stores `[{title, used, outcome|null}]` (≤20, titles validated against the case's own list, bad entries dropped). `updateReview(id, advisorId, review)` L440–475 writes it owner-scoped. Route: `reviewCase`, `server/routes/cases.js` L158–179, `PUT /api/cases/:id/review`, registered with `firmAuth` at `restify-server.js` L340; `advisorId` and `firmId` come from the token.

The case row carries `firm_id`, `domain`, `staircase_step`, `templates`, `template_outcomes`, and `decision_trace` (JSON). The trace holds `domain.id`, `lenses.engagementType`, `lenses.signalTypes`, `situation` (the collected answers, including `industry` and `primaryIssue` as typed/confirmed). There is no `industry` column.

**Decision**: contribute inside `reviewCase`, after `updateReview` resolves, from the row the route already loaded. Consent is read for `req.firmId` at that moment (FR-002). A guard refusal is logged with the case id server-side only and the review response is unchanged; the review is never lost because learning failed.

**Alternatives rejected**: a nightly sweep of reviewed cases (a scheduler, and consent-at-review-time becomes hard to prove); contributing from the frontend (business logic in Nuxt).

## 2. The anonymiser and the guard

**Found.** `server/utils/anonymiseCase.js` de-identifies *free text* by a model call and throws on every bad shape (`ANONYMISE_*` codes). It is not a structured-field guard. With free text excluded from the pool (clarified), the model path is not needed at all, and FR-018 forbids sending anything to a model here anyway.

**Decision**: a structured allow-list guard, `guardContribution(obj)` in `server/utils/outcomeLearning.js`, at 100% coverage. It throws `OUTCOME_GUARD_<REASON>` on: any key outside the allow-list; any value not of the declared type; any string longer than its declared maximum; any string containing `@`, a URL scheme, a run of 6+ digits, or a UUID-like shape; `templates[].title` not in the platform template library; `signals[]` not in the known signal-type list; `engagementType` not one of the three; `domain` not one of the fourteen. It never deletes a field and returns the exact object it validated. The only date carried is `month` (`YYYY-MM`).

## 3. The per-client hold-back, the pattern to copy

**Found.** `server/utils/priorEngagement.js` L142 `HISTORY_HOLDBACK_PENALTY = 15`; `templateResolver.js` L207–211 reads `options.priorHoldback`, and L559–563 applies it **last**, clamped at 1, with a reason code (`history:went_less_well` / `history:already_delivered`). Its trace block at `advisorEngine.js` L3315–3328 reports `heldBack` and `usedInScoring` computed from what actually happened.

**Decision**: pooled hold-back is applied immediately **before** the history clamp, in the same style: `score = Math.max(1, score - pooledTotal)`, reason `pooled:held_back-<n>`; and where it is skipped, `pooled:outweighed`. The trace block copies the "never claim an influence the engine did not have" rule.

## 4. The distinction-boost seam and the cap

**Found.** `templateResolver.js` L196 reads `options.distinctionBoosts`; L367–372 adds the boost with reason `distinction:+N`. Per-row boosts are 1–20 (`mentor.js` L125/L173), default 5, summed per title with no cap on the sum. Reason codes are bare strings on `matchReasons`; `utils/traceReasonCodes.js` maps them for the screen, and `scripts/scenario-lab.js` `explainReasons()` holds a second copy.

**Decision**: `options.pooledAdjustments = [{ id, template, dimension, value, holdBack, firms, cases }]`, only the live ones, only when the requesting firm's consent is on. Per template: sum the `holdBack` of every adjustment whose `(dimension, value)` matches the session's `caseState` / `strategyDecision`; cap the sum at `POOLED_HOLDBACK_MAX = 10`. **If the template carries a `distinction:` reason this run, apply nothing and push `pooled:outweighed`** — the advisor's own words matched a distinction for that template, and that is what "the advisor said today" means in this engine. Otherwise subtract, clamp at 1, push `pooled:held_back-<n>`. Two new `REASON_RULES` entries, locale keys in all eight files, and the Scenario Lab's copy.

**Why 10**: below the client-history penalty (15), below a default distinction boost doubled (10), and enough to reorder two templates a few points apart. It is the one number clarify deferred; it is question 1 on the trace drawing.

## 5. The overlay store at platform scope

**Found.** `server/utils/firmOverlay.js`: `loadFirmConfig`, `loadFirmConfigsByPrefix` (L174–200, no cascade), `saveFirmConfig` (transaction: deactivate, `MAX(version)+1`, insert, prune), `listFirmIdsWithConfigKey` (excludes `__platform__` in SQL), `getVersionHistory`, `restoreVersion` (re-inserts as a new version, `saved_by='restore'`). `PLATFORM_SCOPE = '__platform__'` is a real seeded `firms` row. `config_key` is `VARCHAR(128)`. Per-person rows use `prefix:id` (`meetingObservationsAdvisor.js` L81–126, item 4.75's fix).

**Decision**:
- `outcome-pool:<token>:<caseHash>` at `PLATFORM_SCOPE`, one row per contributed case; read with `loadFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:')`. `token` = first 24 hex chars of `HMAC-SHA256(OUTCOME_POOL_SECRET, firmId)`; `caseHash` = first 16 hex of `HMAC-SHA256(OUTCOME_POOL_SECRET, caseId)`. Key length ≤ 13 + 24 + 1 + 16 = 54 < 128.
- `outcome-adjustments` at `PLATFORM_SCOPE`: decisions, last recompute, bench figures. One writer.
- `outcome-consent` on the firm's own row.
- Firm count for the floor = distinct tokens among pool rows. `listFirmIdsWithConfigKey` is not used: it returns firm ids, which the pool must never need.
- **Withdrawal needs a hard delete by prefix**, which the store lacks: `deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:<token>:')`. Named in the plan's Complexity Tracking for Mike.

## 6. Mentor tab, end to end (the pattern)

**Found.** Industry Benchmarks: `server/routes/benchmarker.js` + `restify-server.js` L826–832 with `mentorGuard = [firmAuth, requireMentorRole]`; `nuxt.config.js` L145–146 already proxies `/api/firm-manager` and `/api/mentor`; `components/FirmBenchmarker.vue` registered in `FirmManagerHub.vue` and shown by `showsTab('industryBenchmarks')`; `TAB_TIERS.industryBenchmarks: ['mentor']` (L1076–1081); `NAV_GROUPS` item `{ key, label | i18n }` appended at the end of its group (L1315–1317); pinned by `tests/unit/hubTabTiers.test.js`. Firm-manager routes use `requireManagerRole` (`firmAuth.js` L480).

**Decision**: `outcomeLearning: ['mentor']` appended to *Rolled up from below*; `outcomeConsent: ['firm']` appended to the *Compliance* group (consent is a firm's own undertaking, like its declaration). Both labels are Mike's to approve on the drawings and are entered as `label` until a locale key exists.

## 7. The consent record (the pattern)

**Found.** `server/utils/compliance.js`: `DECLARATION_KEY = 'compliance-declaration'`, `readDeclaration(value) → cleaned | null` (L346–371) stores `declaredAt`, `declaredBy`, and the exact `wording` the signer saw; `meetingReviewOpen(stored)` is a one-condition gate. Evidence-floor precedent: `meetingAggregate.js` L41–44, `MIN_ADVISORS = 5`, `MIN_MEETINGS = 20`, exported beside the counts so the screen shows the floor.

**Decision**: `server/utils/outcomeConsent.js` with `readConsent(value)`, `contributionOpen(stored)` (one condition: `on === true`), and the wording stored with the record. `MIN_FIRMS = 5`, `MIN_CASES = 25` exported beside the counts in every payload.

## 8. The benches

**Found.** `scripts/scenario-lab.js` (no npm script; `node scripts/scenario-lab.js`) drives the real resolver over `scripts/scenario-lab-cases.json` (50 cases) and prints a METRICS block; AI layers only with a key. `explainReasons()` is a second copy of the reason mapping.

**Decision**: `--adjustments <file>` on the Scenario Lab (a JSON array in the resolver option's shape, exported from the mentor page as "Download live adjustments"); an `outcome-bench.js` that reads the pool through the store (needs MySQL), replays each outcome's situation through `resolveTemplates` with and without live adjustments, and reports the share whose top recommendation that review marked `well`. Both figures are stored on `outcome-adjustments.benches` by the bench route with the run date and the live adjustment ids. In-sample in this release; the caveat is printed on the page.

## 9. Situation dimensions at run time

**Found.** `caseState.js` L128–132: `primaryIssue` and `industry` are present only when set; `industry` is free text ("cafe"). `strategyDecision.engagementType`; signal types from the session's signals; staircase step on the case state. No industry-group table exists; `@rf-industry` is a distinction group name, not a vocabulary.

**Decision**: pool dimensions are `domain`, `signal` (each fired signal type), `engagementType`, and `industry` only when the typed value matches the resolver's industry-scoring vocabulary (`templateResolver.js`, industry scoring built 2026-06-18; the exact table name is confirmed at build). Primary issue and staircase step ride along in the row for the bench but are not adjustment dimensions in this release, because the spec's clarified list names four. Question 1 on the mentor drawing.

## 10. Tests and coverage

**Found.** `jest.config.js` thresholds: `server/utils/` floor 81/64/82/83, `server/routes/` 71/65/75/73, `server/middleware/` 100 (untouched here). Route tests call handlers with a plain `req` and a fake `res`; scope-from-token is asserted by checking the first argument to `saveFirmConfig`.

**Decision**: the guard and the arithmetic ship at 100%. Every route test asserts the scope came from `req` and never from `body`/`params`. No test asserts a label, a class or a file's existence.

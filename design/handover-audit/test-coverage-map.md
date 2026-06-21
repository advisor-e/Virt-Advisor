# Test-Coverage Gap Map — Static Cross-Reference

**Audit date:** 2026-06-21
**Scope:** READ-ONLY static cross-reference of test files vs. source surfaces. No tests were run; no coverage percentages were computed. Findings are inferred from `require(...)` targets and `describe`/`it`/`test` blocks in the test files vs. the exported functions of each source file.
**Method limits:** "Covered" here means *a test file requires the module and exercises the named export*. It does NOT mean the governance line/branch thresholds are met — that is not statically determinable without running `jest --coverage` (which this audit must not do).

---

## Summary

- **Test files found:** 28, all under `tests/unit/` (no `tests/e2e/`, no `tests/integration/`). `tests/` itself contains only the `unit/` subfolder.
- **Test runner:** Jest. `jest.config.js:5` `testMatch: ['**/tests/**/*.test.js']`.
- **Coverage collection is scoped narrowly:** `jest.config.js:8-12` `collectCoverageFrom` = only `server/utils/**` and `server-middleware/**`. **`server/routes/**`, `server/advisorEngine.js`, `server/courseEngine.js`, `server/middleware/**`, `server/services/**`, `mixins/**`, and all `components/`/`pages/` are EXCLUDED from coverage measurement entirely** — even where tests touch them, the governance thresholds are not enforced against them.
- **Only two per-file thresholds are pinned:** `validateAIResponse.js` at 100% (lines/branches/functions/statements) and `sanitiseInput.js` at 90/85 (`jest.config.js:19-28`). Global is `lines: 80` only — no branch/function/statement global gate.
- **Source surfaces with NO test found: 28** (see Coverage matrix; counts mixins, middleware proxies, routes, services, and utils with no requiring test).
- **No component tests** (`@vue/test-utils`) and **no Playwright e2e tests** exist anywhere — coverage is backend-only. Confirmed: zero matches for `shallowMount|@vue/test-utils|mount\(|playwright` under `tests/`.
- **Most concerning:** the live AI-output parser `_classifyMatchingRows` in `server/advisorEngine.js:59` (regex-extract + `JSON.parse` of LLM output at line 89) has **no direct unit test of its parsing/malformed-input path**, and the whole `advisorEngine.js` / `courseEngine.js` file is outside coverage collection. This is the surface the 100% LLM-output rule most directly targets.

---

## Test inventory (test file → what it targets)

| Test file (`tests/unit/`) | Requires / targets |
|---|---|
| `validateAIResponse.test.js` | `server/utils/validateAIResponse` — `validateAIResponse`, `parseSSELine`, `validateQuizGenerate`, `validateQuizGrade` (ref `validateAIResponse.test.js:6`) |
| `promptSafety.test.js` | `server/utils/promptSafety` — `fenceUntrusted` + markers (`promptSafety.test.js:7`) |
| `openaiClient.test.js` | `server/utils/openaiClient` — `createOpenAIClient`, `parseSSEStream` (`openaiClient.test.js:6`) |
| `sanitiseInput.test.js` | `server/utils/sanitiseInput` (`sanitiseInput.test.js:10`) |
| `sendError.test.js` | `server/utils/sendError` — `sendError` (`sendError.test.js:3`) |
| `firmOverlay.test.js` | `server/utils/firmOverlay` (+ mocks `server/utils/db`) (`firmOverlay.test.js:14,20`) |
| `firmAuth.test.js` | `server/middleware/firmAuth` — `firmAuth`, `requireManagerRole` (`firmAuth.test.js:11`) |
| `caseState.staircase.test.js` | `server/utils/caseState` — `buildCaseState`, `staircaseToCeiling`; also `firmOverlay.deepMerge`, `signals.SIGNAL_TYPES` (`caseState.staircase.test.js:9-12`) |
| `causeSignalLever.test.js` | `server/utils/caseState` (`buildCaseState`, `causeText`) + `server/utils/problemSignals` (`extractProblemSignals`) (`causeSignalLever.test.js:9-10`) |
| `filterTemplates.test.js` | `server/utils/templates` — `filterTemplatesByQuery`, `formatTemplatesForPrompt` (`filterTemplates.test.js:5`) |
| `selectionHarness.test.js` | `server/utils/templateResolver` — `resolveTemplates` (regression harness; snapshot + `.skip` target outcomes) (`selectionHarness.test.js:26`, `:112`, `:123`, `:142`) |
| `firmDistinctions.test.js` | `server/utils/firmDistinctions` — `loadFirmDistinctionState`, `CONFIG_KEYS` (`firmDistinctions.test.js:3`) |
| `resolveDistinctions.test.js` | `server/utils/resolveDistinctions` — `resolveEffectiveDistinctions` (`resolveDistinctions.test.js:3`) |
| `classifyDistinctions.test.js` | `server/advisorEngine` — `classifyDistinctions`, `findNearMissDistinctions`; `resolveDistinctions` (`classifyDistinctions.test.js:20-21`) |
| `distinctions.data.test.js` | `data/advisory-distinctions.json` (data-shape test only) (`distinctions.data.test.js:9`) |
| `distinctionCascade.routes.test.js` | `server/routes/firmManager` (cascade endpoints) + `firmOverlay` (`distinctionCascade.routes.test.js:17,25`) |
| `firmManager.routes.test.js` | `server/routes/firmManager` — document + framework endpoints; mocks `db`, `driveService`, `firmOverlay` (`firmManager.routes.test.js:29-48`) |
| `activity.routes.test.js` | `server/routes/activity` — `logCourse`, `getProgression`, `getTeam`; mocks `db`, `activityLogger` (`activity.routes.test.js:16-19`) |
| `advisor.auth.test.js` | `server/advisorEngine` default middleware (auth/IDOR path) + `firmOverlay.loadFirmConfig` (`advisor.auth.test.js:29-30`) |
| `domainConfirmation.test.js` | `server/advisorEngine` — domain-confirmation message builder (`domainConfirmation.test.js:19`) |
| `phase2Confirmation.test.js` | `server/advisorEngine` — phase-2 confirmation (`phase2Confirmation.test.js:15`) |
| `prepMode.test.js` | `server/advisorEngine` — prep-mode skip fields (`prepMode.test.js:14`) |
| `meetingCount.test.js` | `server/advisorEngine` — `parseMeetingCount` (`meetingCount.test.js:15`) |
| `pickLearnTreeAI.test.js` | `server/advisorEngine` — `pickLearnTreeAI` (`pickLearnTreeAI.test.js:18`) |
| `winWorkIntent.test.js` | `server/advisorEngine` — `detectWinWorkIntent` (`winWorkIntent.test.js:10`) |
| `detectLogicTree.test.js` | `server/utils/logicTrees` (`detectLogicTree.test.js:34`) |

(Plus `tests/unit/__snapshots__/selectionHarness.test.js.snap` — snapshot artefact for the harness.)

---

## Coverage matrix (source surface → test → status)

Status key: **COVERED** = a test requires it and exercises its exports; **PARTIAL** = required/touched but key exports or paths not directly exercised; **NONE** = no requiring test found.

### Restify routes (target ≥ 90%)

| Source | Test | Status |
|---|---|---|
| `server/routes/firmManager.js` (`module.exports` :1095) | `firmManager.routes.test.js`, `distinctionCascade.routes.test.js` | COVERED (document + framework + cascade endpoints) |
| `server/routes/activity.js` — `logCourse,getProgression,getTeam` (:256) | `activity.routes.test.js` | COVERED |
| `server/routes/advisor.js` — `post` (:28) | — | NONE (note: this route is a 501 not-migrated stub; live advisor traffic is `server-middleware/advisor.js` → `advisorEngine.js`) |
| `server/routes/firm.js` — `getAdvisors,postInsights,buildInsightPrompt` (:109) | — | **NONE** — includes `buildInsightPrompt` (prompt builder) and `postInsights` (LLM-backed) |
| `server/routes/translate.js` — `post` (:82) | — | NONE |
| `server/routes/cases.js` — `promote` (:60) | — | NONE (case-study promote; cascade/IDOR-sensitive per memory) |
| `server/routes/health.js` — `get` (:8) | — | NONE (trivial) |

### Engines (route-equivalent; **excluded from `collectCoverageFrom`**)

| Source | Test | Status |
|---|---|---|
| `server/advisorEngine.js` — `parseMeetingCount`, `detectWinWorkIntent`, `pickLearnTreeAI`, `classifyDistinctions`, `findNearMissDistinctions`, `buildDomainConfirmationMessage`, `_isValidConfirmation`, `detectNotMetClient`, default middleware | `meetingCount`, `winWorkIntent`, `pickLearnTreeAI`, `classifyDistinctions`, `domainConfirmation`, `phase2Confirmation`, `prepMode`, `advisor.auth` tests | PARTIAL — many small detectors covered; but `detectContradiction`(:487), `detectUncertainty`(:548), `buildClientContext`(:279), `getMovingForwardQuestion`(:246), `handleQuery`(:752), `scrubAdvisorHallucinations`(:440), `normaliseHeadings`(:424), and the LLM-output parser `_classifyMatchingRows`(:59, JSON.parse :89) have no direct test |
| `server/courseEngine.js` — default export + `handleDesign`(:108),`handleSession`(:266),`handleQuizGenerate`(:349),`handleQuizGrade`(:405),`handleProgress`(:448),`_detectCourseMultiGoal`(:85) | — | **NONE** — no test requires `courseEngine.js`. The quiz handlers call `validateQuizGenerate`/`validateQuizGrade` (:391,:434) but the handler wrapping + `JSON.parse` of completion content (:390,:433) and outline parse (:213) are untested |

### Mixins (target ≥ 80%)

| Source | Test | Status |
|---|---|---|
| `mixins/caseMixin.js` | — | **NONE** |
| `mixins/localeMixin.js` | — | **NONE** |
| `mixins/speechMixin.js` | — | **NONE** |

### Middleware / proxies

| Source | Test | Status |
|---|---|---|
| `server/middleware/firmAuth.js` | `firmAuth.test.js` | COVERED |
| `server-middleware/advisor.js` (thin proxy → engine) | — | NONE |
| `server-middleware/course.js` | — | NONE |
| `server-middleware/translate.js` (`JSON.parse` :56) | — | NONE |

### Key utils (`server/utils/`, target ≥ 80% global)

| Source | Test | Status |
|---|---|---|
| `validateAIResponse.js` | `validateAIResponse.test.js` | COVERED (100% threshold pinned, `jest.config.js:19`) |
| `promptSafety.js` | `promptSafety.test.js` | COVERED |
| `openaiClient.js` | `openaiClient.test.js` | COVERED |
| `sanitiseInput.js` | `sanitiseInput.test.js` | COVERED (90/85 threshold pinned) |
| `sendError.js` | `sendError.test.js` | COVERED |
| `firmOverlay.js` | `firmOverlay.test.js` (+ used by others) | COVERED |
| `caseState.js` | `caseState.staircase.test.js`, `causeSignalLever.test.js` | COVERED |
| `problemSignals.js` — `extractProblemSignals` | `causeSignalLever.test.js` | COVERED (`SIGNAL_REGISTRY`/`SIGNAL_DESCRIPTIONS` not directly asserted) |
| `templates.js` | `filterTemplates.test.js` | COVERED |
| `templateResolver.js` — `resolveTemplates` | `selectionHarness.test.js` | COVERED (snapshot-net + targets) |
| `firmDistinctions.js` | `firmDistinctions.test.js` | COVERED |
| `resolveDistinctions.js` | `resolveDistinctions.test.js` | COVERED |
| `logicTrees.js` | `detectLogicTree.test.js` | COVERED |
| `signals.js` — `extractSignals`,`deriveInferredState`,`buildObservabilityPayload`,`SIGNAL_TYPES` | (only `SIGNAL_TYPES` imported by `caseState.staircase.test.js:11`) | **PARTIAL** — `extractSignals`/`deriveInferredState`/`buildObservabilityPayload` not directly exercised |
| `strategyResolver.js` — `resolveStrategy` | — | **NONE** |
| `summaries.js` — `filterSummariesByQuery`,`getSummariesForTemplateNames`,`matchSummaryByTemplateName`, etc. | — | **NONE** |
| `domainSupport.js` — `detectDomainForSession`,`detectDomainsForDesign`, etc. | — | **NONE** |
| `coaching.js` | — | **NONE** |
| `growth.js` | — | **NONE** |
| `tierLookup.js` — `getHighestTier`,`extractTemplatesFromText` | — | **NONE** |
| `templateRegistry.js` | — | **NONE** |
| `videoInjector.js` | — | **NONE** |
| `activityLogger.js` | (mocked in `activity.routes.test.js`, not unit-tested) | **NONE** (as a unit) |
| `rateLimit.js` — `createLimiter` | — | **NONE** |
| `promptLoader.js` | — | **NONE** |
| `db.js` | (mocked elsewhere) | **NONE** (as a unit) |
| `stop-words.js` | — | NONE (data) |
| `services/driveService.js` | (mocked in `firmManager.routes.test.js`) | **NONE** (as a unit) |
| `services/CourseReminderService.js` | — | **NONE** |

---

## AI-validation functions — the 100% rule (explicit per-function status)

Governance: *"AI-response validation functions = 100% (valid, malformed, missing fields, wrong types)"* and *"Any function that processes or validates LLM output gets tests written before or alongside it."*

| Function | Location | Test evidence | Static status vs 100% rule |
|---|---|---|---|
| `validateAIResponse` | `server/utils/validateAIResponse.js:26` | `validateAIResponse.test.js:8-113` — null/undefined, wrong type, missing field, wrong field type, valid | **MEETS the four-case rule**; 100% threshold also pinned in `jest.config.js:19-24`. (Exact % not computed here.) |
| `parseSSELine` | `validateAIResponse.js:58` | `validateAIResponse.test.js:115-198` — valid, malformed JSON, non-string, JSON-to-non-object | **MEETS the four-case rule** |
| `validateQuizGenerate` | `validateAIResponse.js:89` | `validateAIResponse.test.js:200-277` — type, key variations, empty/missing, malformed items, valid | **MEETS the four-case rule** |
| `validateQuizGrade` | `validateAIResponse.js:120` | `validateAIResponse.test.js:279-348` — type, each field invalid, boundaries, multi-failure, valid | **MEETS the four-case rule** |
| `parseSSEStream` | `server/utils/openaiClient.js:43` | `openaiClient.test.js:36-58` — split chunks, comments/blanks, `[DONE]`, unparseable line ignored | COVERED (parses raw LLM SSE bytes) |
| `fenceUntrusted` | `server/utils/promptSafety.js:30` | `promptSafety.test.js:9-42` — wrap, break-out attack, null/undefined, non-string, multiline | COVERED (prompt-safety, not output-validation, but in-scope per the hostile-input rule) |
| **`_classifyMatchingRows`** | `server/advisorEngine.js:59` (regex-extract + `JSON.parse` of LLM output at :89) | **none** — no test requires this; `classifyDistinctions.test.js` exercises `classifyDistinctions`/`findNearMissDistinctions` (the callers) but not the malformed-LLM-output parse path of `_classifyMatchingRows` | **DOES NOT MEET** the 100% / malformed-output rule. This is a real LLM-output parser. |
| courseEngine quiz handler parses | `server/courseEngine.js:390`, `:433` (`JSON.parse(completion.choices[0].message.content)`), `:213` (outline parse) | **none** — no test requires `courseEngine.js` | Validators *downstream* are tested in isolation, but the **handler-level parse + validate + error-path is untested**. The `:213` outline `JSON.parse` has **no validator at all**. |

**Conclusion on the 100% rule:** the four dedicated validators in `validateAIResponse.js` plus `parseSSEStream`/`fenceUntrusted` are well-tested for valid/malformed/missing/wrong-type inputs. **Two LLM-output-parsing sites are not covered to the rule:** `advisorEngine._classifyMatchingRows` (:89) and the `courseEngine.js` handler parses (:213/:390/:433). Whether the *covered* ones literally hit 100% branch coverage is **not statically determinable** — only `jest --coverage` proves it; `jest.config.js:19` enforces it for `validateAIResponse.js` but not for `openaiClient.js` or `promptSafety.js`.

---

## Most serious gaps (ranked for auditable handover)

1. **`courseEngine.js` has ZERO requiring test AND is excluded from coverage collection** (`jest.config.js:8-12` omits `server/`-root files). It contains LLM-output parsing (`:213` outline parse with *no validator*, `:390`/`:433` quiz parse). This is the single most concerning untested area: a route-equivalent engine handling AI output with no handler-level test and no coverage gate.
2. **`advisorEngine._classifyMatchingRows` (`:59`/`JSON.parse :89`) — LLM-output parser with no direct malformed-input test.** Violates the explicit "any function that processes/validates LLM output gets tests" rule. The engine file is also outside `collectCoverageFrom`.
3. **Untested Restify routes:** `firm.js` (`postInsights` + `buildInsightPrompt` — LLM-backed), `translate.js` (`post`), `cases.js` (`promote` — IDOR/cascade-sensitive per project memory). Route target is ≥ 90%; these sit at NONE.
4. **All three mixins untested** (`caseMixin.js`, `localeMixin.js`, `speechMixin.js`). Mixin target is ≥ 80%; current is NONE for all. (`caseMixin` carries case-study state logic flagged sensitive in project memory.)
5. **`strategyResolver.resolveStrategy` untested** — core decision-pipeline step (strategy layer) with no test.
6. **`signals.js` partial:** `extractSignals` / `deriveInferredState` / `buildObservabilityPayload` not directly exercised (only `SIGNAL_TYPES` imported). These feed CaseState — central to recommendations.
7. **Coverage-config blind spot (systemic):** `collectCoverageFrom` excludes `server/routes/**`, `server/advisorEngine.js`, `server/courseEngine.js`, `server/middleware/**`, `server/services/**`, and `mixins/**`. Even where tests exist (routes, firmAuth, engine detectors), **the ≥90%/≥80% governance thresholds are not enforced against them** — only `server/utils/**` and `server-middleware/**` are measured, with hard gates on just two files.

---

## Component / e2e coverage status (honest)

- **Component tests (`@vue/test-utils` v1): NONE.** No `shallowMount`/`mount`/`@vue/test-utils` reference anywhere under `tests/`. No `.vue` is under test. Every Pug/Vue component (`components/`, `pages/`, `layouts/`) is untested.
- **Playwright e2e: NONE.** No `playwright.config.*` at project root (only `jest.config.js`), no `tests/e2e/` directory (confirmed MISSING), no `@playwright`/`playwright` reference under `tests/`. No critical-journey e2e exists.
- **Net:** test coverage is **backend-only, Jest-only, unit-only.** The frontend half of the two-part system (the entire Nuxt 2 UI) has no automated test of any kind.

---

## Caveats (static-only)

- **No coverage % was computed.** This audit did not run `jest`, `jest --coverage`, or anything that executes tests (governance constraint). "COVERED" = *a test requires the module and asserts on its exports*, not *meets the numeric threshold*. The actual line/branch numbers — including whether the four `validateAIResponse.js` validators truly hit 100% — are **not statically determinable** and must be confirmed by running the suite.
- Functions marked PARTIAL are imported by a test but the specific export/branch may not be asserted; treat as "needs verification," not "confirmed gap."
- Files that are *mocked* in a route test (`db.js`, `driveService.js`, `activityLogger.js`) are listed as having no *unit* test of their own real implementation — the mock does not exercise their code.
- No `search_content*.json` was opened or analysed (governance constraint); template-data tests reference `data/templates.json`/`data/advisory-distinctions.json`, which were not modified or inspected for content.
- Test *file count* is exact (28). Any `it`/`test` *counts* of "272/319/392 tests" cited in project memory were **not** recomputed here and are not relied upon.

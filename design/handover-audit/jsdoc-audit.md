# JSDoc Coverage Audit — Virt Advisor

**Type:** Read-only audit (no code changed). **Date:** 2026-06-21.
**Scope:** JSDoc compliance against the project rule — "Document mixins, `server-middleware`
proxies, and Restify routes with their `@route`/`@param`/`@returns` shape; for
financial/regulatory logic, explain the business rule. JSDoc every Vuex action and mutation."
JavaScript-only stack → JSDoc is the team's type/contract mechanism.

All claims below cite `path:line`. Where a sub-audit gave an imprecise count, the figure used
here is the one I verified directly with grep.

---

## Summary

The codebase has **bimodal** JSDoc coverage: a band of newer/security-critical files is
documented to an exemplary standard (full `@param`/`@returns`, typedefs, business-rule notes),
while the **oldest and largest decision-engine files carry essentially none**. There is no
"partial everywhere" middle — a file tends to be either fully documented or fully bare.

Rough overall picture (backend utils/services + routes + middleware + mixins + frontend utils,
~97 exported functions sampled): **~35–40% of exported functions carry any JSDoc block; only
~25% carry a complete `@param`+`@returns` contract.** The two highest-traffic engine files
(`advisorEngine.js` 2268 lines, `templateResolver.js` 495 lines) and the core signal/state
files are the dominant gap.

The single most important finding for an auditable-grade handover: **the financial/AI
decision pipeline — `templateResolver`, `strategyResolver`, `caseState`, `signals`, and the
two live engines — is the least documented part of the system**, despite being where AI output
is scored, where the engagement-type/complexity-ceiling business rules live, and where AI
output is committed. These are exactly the functions the rule says matter most.

Positive: the validation layer that the governance framework calls out as 100%-test-required
(`validateAIResponse.js`) is the gold-standard reference for the rest of the codebase to follow
(`server/utils/validateAIResponse.js:3-144`).

**Vuex:** No `store/` directory exists and there is no `new Vuex.Store`, `mapActions`, or
`mapMutations` anywhere in app code (Glob `store/**` → none; Grep → no matches). The backlog
note is confirmed: **Vuex is not used**, so the "JSDoc every Vuex action/mutation" clause is
currently moot (no remediation needed, but worth stating in the handover so reviewers don't
look for a store).

---

## Coverage table

Counts are exported functions per file (constants excluded from the function tally).
"Documented" = has any JSDoc `/** */` block immediately above. "Missing required tags" =
has no complete `@param`+`@returns` (and `@route` where it is a route).

### server-middleware (thin proxies — rule requires documentation)

| File | Exported fns | Documented | Missing required tags |
|---|---|---|---|
| `server-middleware/advisor.js` | 1 (`advisorProxy`) | 1 (good file + proxy header) | No `@param/@returns`, but proxy is well-explained — `:1-13` |
| `server-middleware/course.js` | 1 (`courseProxy`) | 1 (good file header) | No `@param/@returns` — `:1-13` |
| `server-middleware/translate.js` | 1 (+`handleTranslate`) | 1 (route header `:1-11`) | No `@route/@param/@returns` tags |

### server-middleware ENGINES (the live business logic — NOT thin proxies)

| File | Lines | Exported / top-level fns | JSDoc blocks | `@param/@returns/@route` tags |
|---|---|---|---|---|
| `server/advisorEngine.js` | 2268 | ~28 top-level fns | 3 blocks (`:3`, `:356-368`, `:614-620`) | **6 tags total** (`:366-367`, `:616-619`) |
| `server/courseEngine.js` | 520 | ~14 fns (incl. 5 `handle*`) | 1 file-header block only (`:3-12`) | **0 tags** |

### server/routes + middleware

| File | Lines | Routes | Documented handlers | `@route` tags |
|---|---|---|---|---|
| `server/routes/activity.js` | 257 | 3 | 3 / 3 (exemplary) | 3 `@route` + 6/6 `@param/@returns` — `:26-36`, `:71-80`, `:167-175` |
| `server/routes/firmManager.js` | 1125 | ~28 (`:135-162` in restify-server) | ~6 of ~28 | **5 `@route`** of ~28 routes (verified) |
| `server/routes/firm.js` | 110 | 2 | 0 / 2 (stubbed TODO) | 0 tags |
| `server/routes/cases.js` | 61 | 1 (`/promote`) | 1 narrative block, no tags | 0 tags |
| `server/routes/translate.js` | (route shim) | 1 | header only | 0 tags |
| `server/routes/advisor.js` | 29 | 1 (**501 stub**) | 1 (`:3-15`, explains stub) | 0 `@param/@returns` — handler is a placeholder |
| `server/routes/health.js` | 9 | 1 | 0 | 0 |
| `server/restify-server.js` | 168 | (registrations) | file header `:3-13` | N/A (no exported fns) |
| `server/middleware/firmAuth.js` | 87 | 2 (`firmAuth`, `requireManagerRole`) | file header only `:3-22` | **0 per-function tags** |

### server/utils + services (selected — full set audited)

| File | Lines | Exported fns | Documented | Missing required tags |
|---|---|---|---|---|
| `server/utils/validateAIResponse.js` | 147 | 4 | 4 / 4 | **None — gold standard** (`:3-144`) |
| `server/utils/openaiClient.js` | 141 | 2 | 2 / 2 | None |
| `server/utils/activityLogger.js` | 91 | 2 | 2 / 2 | None |
| `server/utils/sanitiseInput.js` | 104 | 1 | 1 / 1 | None (typedef `SanitisedInput`) |
| `server/utils/promptSafety.js` | 32 | 1 | 1 / 1 | None |
| `server/utils/resolveDistinctions.js` | 87 | 1 | 1 / 1 | None (cascade rule documented) |
| `server/utils/firmDistinctions.js` | 80 | 2 | 2 / 2 | None |
| `server/utils/growth.js` | 66 | 2 | 2 / 2 | None |
| `server/utils/sendError.js` | 21 | 1 | 1 / 1 | None |
| `server/utils/summaries.js` | 296 | 5 | 5 / 5 (blocks, no tags) | Missing `@param/@returns` on all 5 |
| `server/utils/domainSupport.js` | 197 | 5 | 1 / 5 | 4 undocumented |
| `server/utils/firmOverlay.js` | 140 | 5 | 1 / 5 | 4 DB fns undocumented |
| `server/utils/templateResolver.js` | 495 | 3 | **0 / 3** | **All undocumented (AI scoring engine)** |
| `server/utils/signals.js` | 648 | 4 | **0 / 4** | **All undocumented (largest logic file)** |
| `server/utils/caseState.js` | 148 | 4 | **0 / 4** | **All undocumented** |
| `server/utils/strategyResolver.js` | 59 | 1 | **0 / 1** | **Undocumented (engagement-type rule)** |
| `server/utils/templateRegistry.js` | 87 | 5 | 1 / 5 | 4 undocumented |
| `server/utils/templates.js` | 71 | 3 | 1 / 3 | 2 undocumented |
| `server/utils/coaching.js` | 38 | 3 | 1 / 3 | 2 undocumented |
| `server/utils/problemSignals.js` | 48 | 3 | 1 / 3 | 2 undocumented |
| `server/utils/logicTrees.js` | 997 | 1 (exported) + many internal | 1 block, no tags | Missing tags; large file |
| `server/utils/rateLimit.js` | 35 | 1 | 0 / 1 | undocumented |
| `server/utils/promptLoader.js` | 11 | 1 | 0 / 1 | undocumented |
| `server/utils/tierLookup.js` | 99 | 2 | 2 / 2 (blocks, no tags) | Missing `@param/@returns` |
| `server/utils/videoInjector.js` | 68 | 1 | 1 / 1 (block, no tags) | Missing tags |
| `server/utils/db.js` | 27 | 1 | 1 / 1 (block, no tags) | Missing tags |
| `server/services/driveService.js` | 146 | 2 | 1 / 2 | 1 undocumented |
| `server/services/CourseReminderService.js` | 70 | 1 | 1 / 1 | block present |

### mixins + frontend utils

| File | Lines | Fns/methods | Documented | Missing required tags |
|---|---|---|---|---|
| `mixins/localeMixin.js` | 126 | 10 | **0 / 10** | All — rule "Document mixins" fully unmet |
| `mixins/speechMixin.js` | 127 | ~6 | **0 / 6** | All |
| `mixins/caseMixin.js` | 116 | 8 | **0 / 8** | All; `promoteCase()` calls `POST /api/cases/promote` (`:85`) undocumented |
| `utils/cases.js` | 80 | 7 | 1 / 7 | `getRelevantCases` has a narrative block, no tags (`:64-69`) |
| `utils/markdownPreprocessor.js` | 37 | 1 | 1 / 1 | block present, no `@param/@returns`. **NOTE: protected/locked file per CLAUDE.md — do not edit without explicit permission** |

---

## Worst gaps (verified against the backlog's claims)

The backlog flagged two files. Both verified, with corrected numbers:

1. **`courseEngine.js` — backlog said "none". CONFIRMED.**
   `server/courseEngine.js` has **0** `@param/@returns/@route` tags across 520 lines
   (Grep: 0 matches). It has one useful file-header block (`:3-12`) describing the
   `body.type` dispatch, but **not one of its ~14 functions** — including the AI-output
   handlers `handleQuizGenerate` (`:349`), `handleQuizGrade` (`:405`), `handleDesign`
   (`:108`), `handleSession` (`:266`) — carries a JSDoc contract.

2. **`advisorEngine.js` — backlog said "~4 tags across 2061 lines". CORRECTED.**
   The live file is **2268 lines** with **6** `@param/@returns` tags (Grep verified),
   on exactly **2** of its ~28 top-level functions: `pickLearnTreeAI` (`:356-368`) and
   `buildDomainConfirmationMessage` (`:614-620`). Every other function is undocumented,
   including: `classifyDistinctions` (`:102`), `findNearMissDistinctions` (`:120`),
   `buildClientContext` (`:279`), `scrubAdvisorHallucinations` (`:440`),
   `normaliseHeadings` (`:424`), `parseMeetingCount` (`:559`), and the 700-line
   `handleQuery` (`:752`). They have rich `//` inline comments but no formal JSDoc block —
   so there is no machine-readable or top-of-function contract for the engine's public shape.

   *Naming note:* the backlog's "`advisor.js` 2061-line" file is this
   `server/advisorEngine.js`. The actual `server/routes/advisor.js` is a **29-line 501 stub**
   (`:17-26`) — the real engine still lives in server-middleware pending the Phase-2
   Restify migration. Reviewers should not confuse the two.

3. **`firmManager.js` — largest route surface, mostly undocumented.**
   1125 lines, ~28 routes registered (`server/restify-server.js:135-162`), but only
   **5 `@route` tags** exist (Grep verified). The documented handful are the newer
   distinction routes (`getDistinctionState`, `setDistinctionOverride`,
   `resetDistinctionOverride`, `setDistinctionDecline`, `moveDistinction`, ~`:817-987`).
   The document/framework/video/profile/storage/template/staircase CRUD handlers —
   several of which perform firm-scoped DB writes — have no `@route/@param/@returns`.

---

## Financial / AI-output logic lacking business-rule docs

These are the audit's priority because the rule singles them out ("for financial/regulatory
logic, explain the business rule"; "any function that processes or validates LLM output").

| Function / file | Role | Doc state |
|---|---|---|
| `resolveTemplates` / `resolveTemplatesWithOutlier` — `server/utils/templateResolver.js` | The AI-facing **template-scoring engine** that produces the pool Phase-3 selects from (signal weighting, complexity-ceiling blocking, domain-signal scope) | **0 JSDoc** on all 3 exports |
| `resolveStrategy` — `server/utils/strategyResolver.js:21` | Resolves **engagement type + complexity ceiling** (education vs facilitation vs advice) from CaseState + firm overrides — a core business rule | **0 JSDoc** (inline comments only) |
| `buildCaseState` + `DOMAIN_NATURAL_ENGAGEMENT` — `server/utils/caseState.js` | Builds the transient state object every downstream decision reads | **0 JSDoc** on all 4 exports |
| `extractSignals` / `deriveInferredState` / `buildObservabilityPayload` — `server/utils/signals.js` | Extracts the structured signals that drive scoring (648 lines) | **0 JSDoc** on all 4 exports |
| `classifyDistinctions` / `findNearMissDistinctions` — `server/advisorEngine.js:102,120` | AI classification that **boosts template scores** and surfaces cross-domain near-misses | No JSDoc block |
| `handleQuizGenerate` / `handleQuizGrade` — `server/courseEngine.js:349,405` | **Commit AI output** as an advisor's course pass/fail (`validateQuizGrade` gates it, but the handlers themselves are bare) | No JSDoc |
| `scrubAdvisorHallucinations` / `normaliseHeadings` — `server/advisorEngine.js:440,424` | Post-process / sanitise AI output before it reaches the user | Inline comments, no JSDoc block |
| Firm-overlay writers (`loadFirmConfig`, `saveFirmConfig`, `getVersionHistory`, `restoreVersion`) — `server/utils/firmOverlay.js` | Persist firm config + version history to MySQL (regulatory-relevant audit trail) | 4 DB fns undocumented |

**Counter-examples (already correct — use as the pattern):**
`validateAIResponse.js:3-144` (full typedef + per-function `@param/@returns` + governance
references), `sanitiseInput.js`, `promptSafety.js`, `resolveDistinctions.js`,
`openaiClient.js`, `activityLogger.js`.

---

## Prioritised remediation order

Ranked by (a) how directly the function touches AI output / financial decisions, (b) traffic /
blast radius, (c) how badly it misses the rule. No JSDoc was written — this is the queue only.

**P1 — Decision engine + AI-output handlers (auditable-grade blockers):**
1. `server/utils/templateResolver.js` — document `resolveTemplates`/`resolveTemplatesWithOutlier`
   + the scoring-version intent. Highest blast radius; it shapes every recommendation.
2. `server/advisorEngine.js` — document `handleQuery`, `classifyDistinctions`,
   `findNearMissDistinctions`, `buildClientContext`, and the AI-output scrubbers. 2268 lines,
   6 tags today.
3. `server/courseEngine.js` — document all 5 `handle*` functions, especially the two quiz
   handlers that commit a pass/fail. 0 tags today.
4. `server/utils/strategyResolver.js` + `server/utils/caseState.js` — small files, outsized
   importance (engagement-type + complexity-ceiling business rule). Cheap, high value.
5. `server/utils/signals.js` — 648 lines, 0 tags; document the four exports' contracts.

**P2 — Route surfaces (handover navigability + security clarity):**
6. `server/routes/firmManager.js` — add `@route/@param/@returns` to the ~23 undocumented
   handlers; prioritise the DB-writing ones. (Follow the pattern of its own already-documented
   distinction routes and of `activity.js`.)
7. `server/middleware/firmAuth.js` — per-function JSDoc on `firmAuth` + `requireManagerRole`
   (auth/IDOR boundary; currently only a module header).
8. `server/utils/firmOverlay.js` — document the 4 persistence functions (audit-trail logic).
9. `server/routes/cases.js`, `translate.js`, `health.js` — add `@route` blocks.

**P3 — Mixins + frontend utils (rule says "Document mixins"; lower risk):**
10. `mixins/caseMixin.js` — document each method, and especially the
    `POST /api/cases/promote` call in `promoteCase()` (`:85`) with the route it hits.
11. `mixins/localeMixin.js`, `mixins/speechMixin.js` — method-level JSDoc.
12. `utils/cases.js` — finish `getRelevantCases` tags + document the other 6.

**Do NOT touch without explicit permission (governance):**
- `utils/markdownPreprocessor.js` (`preprocessAIResponse`) is a CLAUDE.md-protected/locked
  file. Its missing `@param/@returns` should be raised with the user, not silently added.
- Never edit `search_content*.json` (app-generated; out of scope for this audit anyway).

---

## Open questions

1. **`advisorEngine.js` / `courseEngine.js` location vs the Restify migration.** These live in
   `server-middleware`-loaded engine files, not yet under `server/routes/`. The route stub at
   `server/routes/advisor.js:17` says Phase-2 will move them. Should JSDoc remediation wait for
   that move (to avoid documenting code about to be relocated), or proceed now? This affects
   whether P1 items 2–3 are worth doing before the migration.
2. **Required-tag bar for thin proxies.** The three `server-middleware/*` proxies have strong
   prose headers but no `@param/@returns`. Does the team want the formal tags on Connect-style
   `(req, res, next)` proxies, or is a documented header sufficient for those?
3. **Vuex clause.** With no store in the repo, is the "JSDoc every Vuex action/mutation" rule
   simply N/A for handover, or is a store planned (in which case it should be flagged as future
   scope rather than a gap)?
4. **`logicTrees.js` (997 lines).** Only its single export is reachable externally, but it has
   many internal helpers. Does the team want internal helpers documented too, or only the
   public surface? Same question for `signals.js`.

---

*End of audit. No files were modified in producing this report.*

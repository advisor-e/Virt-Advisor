# Contracts: Outcome Learning (4.87)

Every route: `try/catch`, `{ success: false, error: { code, message }, timestamp }` on failure, no stack or SQL text. Scope is always `req.firmId` / `req.userEmail` set by `firmAuth`; a body or param never names a firm, advisor, client or case for a write. Registered in `server/restify-server.js`; reached through the existing `/api/mentor` and `/api/firm-manager` proxy entries.

## Firm manager — guard `[firmAuth, requireManagerRole]`

| Route | Body | Returns |
|---|---|---|
| `GET /api/firm-manager/outcome-consent` | — | `{ success, consent: readConsent(stored) \| null, wording, pooledCount }` — `pooledCount` is the number of this firm's rows in the pool (by its token), so the screen can show what a withdrawal would remove |
| `POST /api/firm-manager/outcome-consent` | `{ on: boolean }` | `{ success, consent }` — writes `setBy`/`setAt` from the token and the pinned `wording`; anything else in the body is ignored |
| `POST /api/firm-manager/outcome-consent/withdraw` | `{ confirm: true }` | `{ success, removed: n, consent }` — deletes the firm's pool rows, appends to `withdrawals`, then triggers the recompute path so any adjustment now below the floor is `below_floor` |

## Advisor — no new route

The case-review screen needs one boolean. It rides on the response the screen already calls to load the case (`GET /api/cases/:id`), as `outcomeContribution: true | false`, computed from the caller's firm consent. Named here so the build does not add a route for one flag.

## Mentor — guard `[firmAuth, requireMentorRole]`

| Route | Body | Returns |
|---|---|---|
| `GET /api/mentor/outcome-learning` | — | `{ success, firms, cases, lastRecomputeAt, floor: { minFirms: 5, minCases: 25 }, capMax: 10, adjustments: [computed adjustment §3 with state], benches, orphaned: [...] }` — **recomputes on every call** (clarified); must return inside 2000 ms at 10,000 rows (SC-008) |
| `POST /api/mentor/outcome-learning/recompute` | — | same payload as GET; exists so the page's "Recompute now" is an explicit action |
| `POST /api/mentor/outcome-learning/decision` | `{ id, state: 'live' \| 'held' \| 'rejected', reason?: string ≤ 500 }` | `{ success, decision }` — refuses (`400 OUTCOME_BELOW_FLOOR`) a `live` decision on an adjustment that does not meet the floor; refuses an unknown id (`404`) |
| `GET /api/mentor/outcome-learning/history` | — | `{ success, versions: [{ id, version, is_active, saved_by, created_at }] }` from `getVersionHistory(PLATFORM_SCOPE, 'outcome-adjustments')` |
| `POST /api/mentor/outcome-learning/restore` | `{ versionId }` | `{ success }` via `restoreVersion` |
| `GET /api/mentor/outcome-learning/export` | — | `{ success, adjustments: [live ones in the resolver option shape] }` — what the Scenario Lab's `--adjustments` flag reads |
| `POST /api/mentor/outcome-learning/bench` | — | `200 { success, benches }` when both benches finish inside 1500 ms; otherwise `202 { success, jobId }` while the run continues in-process and persists on its own (measured 2026-09-11: ~1 ms per resolver pass, so ~20 s at 10,000 reviews). `benches` is data-model §4's shape, each half stamped `ranAt` with `liveIds`; the fixed bench's `before` is 1.0 by construction (its expected answer is the engine's own unadjusted one) |
| `GET /api/mentor/outcome-learning/bench/:jobId` | — | `{ success, status: 'running' \| 'done' \| 'failed', benches }`; `404 OUTCOME_UNKNOWN_JOB` after ten minutes or a restart, which the page turns into "run it again" |

## Resolver — `server/utils/templateResolver.js`

```js
resolveTemplates(caseState, strategyDecision, templates, {
  ...,
  pooledAdjustments: [{ id, template, dimension, value, holdBack, firms, cases }]   // live only; [] when not consented or unavailable
})
```

Per template, after every boost and immediately before the client-history clamp:

1. `matched` = adjustments whose `template` equals the title (case-insensitive) and whose `(dimension, value)` matches the session: `domain` ↔ `caseState.domain`; `industry` ↔ `caseState.industry`; `signal` ↔ any fired signal type; `engagementType` ↔ `strategyDecision.engagementType`.
2. If `matched` is empty: nothing.
3. If `reasons` already contains a `distinction:` code: push `pooled:outweighed`, apply nothing.
4. Else `total = Math.min(POOLED_HOLDBACK_MAX, Σ holdBack)`; if `total > 0 && score > 0`: `score = Math.max(1, score - total)`, push `pooled:held_back-<total>`.

Exports gain `POOLED_HOLDBACK_MAX`. `SCORING_VERSION` is bumped, because a saved trace must say which formula produced it.

## Engine — `server/advisorEngine.js`

Before resolving: read consent for `req.firmId` and the live adjustments (decisions row + recompute from pool). On any failure or when consent is off: `pooledAdjustments = []`, `available`/`consented` set accordingly. After resolving: emit `decisionTrace.outcomeLearning` (data-model §5) computed from the scoring log, never from intent.

## Trace wording — `utils/traceReasonCodes.js`

| Code | Key | Params |
|---|---|---|
| `pooled:held_back-<n>` | `decisionTrace.reasonPooledHeldBack` | `{ n }` |
| `pooled:outweighed` | `decisionTrace.reasonPooledOutweighed` | — |

Wording is Mike's, from the trace drawing; the two keys go into all eight locale files and the Scenario Lab's `explainReasons()`.

## Hub tabs — `components/FirmManagerHub.vue`

```js
// TAB_TIERS (appended)
outcomeLearning: ['mentor'],   // the pool is one platform-wide set; no lower tier holds a different value (FR-014)
outcomeConsent: ['firm']       // consent is a firm's own undertaking; the mentor has nothing to switch
// NAV_GROUPS: outcomeLearning appended to "Rolled up from below"; outcomeConsent appended to "Compliance"
```

Labels are `label` strings pending Mike's wording from the drawings; pinned by `tests/unit/hubTabTiers.test.js`.

## Screens — the three drawings are the UI contract

| Drawing | Shows |
|---|---|
| `design/mockups/outcome-learning-consent.html` | the firm manager's switch with state, who and when; the separate withdraw action with the count it would remove; the advisor's one line on the case review |
| `design/mockups/outcome-learning-mentor.html` | firms and cases in the pool; last recompute and "Recompute now"; each adjustment with template, dimension, value, counts, floor, hold-back size and state; accept / hold / reject with reason; history; bench figures; empty state; orphaned list |
| `design/mockups/outcome-learning-trace.html` | the Outcome Learning section on "Why this?": applied and outweighed lines with counts; the "learning unavailable" line |

Each drawing carries a wording table marked proposed and its open questions, one recommendation each, put to Mike one at a time; the drawing itself is approved as its own question.

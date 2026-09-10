# Data Model: Outcome Learning (4.87)

All storage is the existing overlay store (`firm_framework_versions`). No schema change. Shapes are validated on the way in by `readX(value) → cleaned | null` functions in the pattern of `compliance.js`, and the pool shape by a throwing guard.

## 1. Contribution consent — `outcome-consent`, on the firm's own row

```js
{
  on: true | false,
  setBy: 'manager@firm',        // req.userEmail at the moment of the switch
  setAt: '2026-09-10T02:14:00Z',
  wording: '<the exact consent sentence the manager saw>',   // pinned once Mike approves it
  withdrawals: [ { requestedBy, requestedAt, removed: 12 } ] // append-only, newest last
}
```

- Written only by `POST /api/firm-manager/outcome-consent` and `.../withdraw`, scope = `req.firmId`.
- `contributionOpen(stored)` is `readConsent(stored) !== null && stored.on === true`. One condition.
- Version history and restore come from the store. A restore that turns consent back on is a switch-on, and shows as one.

**Transitions**: `absent → on` (switch on) · `on → off` (switch off; pool untouched) · `off → on` (re-opt; reviews between the two dates never enter) · `any → withdrawal` (pool rows under the firm's token deleted; consent state unchanged by the withdrawal itself).

## 2. Pooled outcome — `outcome-pool:<token>:<caseHash>`, at `PLATFORM_SCOPE`

```js
{
  v: 1,                                   // shape version
  month: '2026-09',                       // the only date; never a timestamp
  domain: 'profit',                       // one of the 14 domain ids
  primaryIssue: 'margin-erosion' | null,  // id, when present
  industry: 'cafe' | null,                // only when it matches the resolver's industry vocabulary
  signals: ['cashflow_pressure', ...],    // known signal types only
  engagementType: 'get' | 'client' | 'education',   // the three types as the engine names them (confirm ids at build)
  staircaseStep: 'step-3' | null,
  templates: [
    { title: 'Break-even Analysis', used: 'full' | 'partial' | 'none', outcome: 'well' | 'less' | null }
  ]
}
```

- `token` = HMAC(firm id) under `OUTCOME_POOL_SECRET`, 24 hex; `caseHash` = HMAC(case id), 16 hex. Neither is reversible without the secret; neither is stored anywhere else.
- Written only from `reviewCase` after a successful review at a firm whose consent is on. A re-review of the same case rewrites the same key (a new version), so a case counts once.
- **Guard (`guardContribution`)** throws `OUTCOME_GUARD_<REASON>` on any key outside this list, any wrong type, any string over its maximum (`title` ≤ 255, `industry` ≤ 40, others ≤ 64), any string containing `@`, `://`, six or more consecutive digits, or a UUID-like shape, and any enum value outside its list. Nothing is dropped; the whole contribution is refused and logged.
- Removed only by withdrawal (`deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:<token>:')`).

## 3. Computed adjustment — never stored; recomputed from §2

```js
{
  id: 'break-even-analysis|domain|profit',   // slug(title) | dimension | slug(value)
  template: 'Break-even Analysis',
  dimension: 'domain' | 'industry' | 'signal' | 'engagementType',
  value: 'profit',
  delivered: 31,        // outcomes where used ∈ {full, partial}
  less: 12,             // of those, outcome === 'less'
  well: 17,             // of those, outcome === 'well'   (balance; never lifts)
  firms: 6,             // distinct tokens among the delivered outcomes
  cases: 31,            // === delivered
  holdBack: 4,          // round(POOLED_HOLDBACK_MAX * less / delivered), 0..10
  meetsFloor: true,     // firms >= 5 && cases >= 25
  state: 'below_floor' | 'proposed' | 'live' | 'held' | 'rejected' | 'orphaned'
}
```

- `holdBack` of 0 (delivered but never "less") is listed, `proposed` if it meets the floor, and applies nothing.
- `orphaned`: a decision exists whose `template` is no longer a title in the platform library. Never applied.
- `state` is `below_floor` whenever `meetsFloor` is false, regardless of any earlier decision: a withdrawal that drops a live adjustment below the floor unpublishes it, and the page says why.
- Constants exported beside every payload: `MIN_FIRMS = 5`, `MIN_CASES = 25`, `POOLED_HOLDBACK_MAX = 10`.

## 4. Mentor decisions and bench figures — `outcome-adjustments`, at `PLATFORM_SCOPE`

```js
{
  decisions: {
    'break-even-analysis|domain|profit': { state: 'live' | 'held' | 'rejected', by: 'mentor@advisor-e', at: '2026-09-10T…', reason: '' }
  },
  lastRecomputeAt: '2026-09-10T…',
  benches: {
    fixed:   { ranAt, before: 0.62, after: 0.66, liveIds: [...] },   // Scenario Lab, share of cases whose top template is the expected one
    outcome: { ranAt, before: 0.58, after: 0.63, liveIds: [...] }    // pool replay, share whose top template the review marked well
  }
}
```

- One writer: the mentor routes. Every save is a new version; `getVersionHistory` / `restoreVersion` give FR-009 and SC-007 without new code.
- A decision on an id that no computed adjustment matches is kept and shown as `orphaned` (template gone) or `below_floor` (evidence gone), never silently dropped.

## 5. Resolver option and trace block (runtime, not stored)

Resolver input: `options.pooledAdjustments = [{ id, template, dimension, value, holdBack, firms, cases }]` — live ones only, only when the caller's firm consent is on; `[]` otherwise or on any read failure.

Trace block on `decisionTrace.outcomeLearning`:

```js
{
  consented: true | false,
  available: true | false,                 // false when the pool or decisions could not be read (FR-019)
  applied:    [ { template, id, holdBack, firms, cases } ],
  outweighed: [ { template, id, holdBack, firms, cases, by: 'distinction' } ]
}
```

Reason codes on `matchReasons`: `pooled:held_back-<n>` and `pooled:outweighed`. Both mapped in `utils/traceReasonCodes.js` and `scripts/scenario-lab.js`.

## 6. Identity and uniqueness

| Thing | Key | Uniqueness |
|---|---|---|
| Consent | firm id (from token) + `outcome-consent` | one per firm |
| Pooled outcome | `PLATFORM_SCOPE` + `outcome-pool:<token>:<caseHash>` | one per case; re-review overwrites |
| Adjustment | `slug(template)|dimension|slug(value)` | computed; stable across recomputes |
| Decision | adjustment id inside `outcome-adjustments` | one per adjustment; history keeps earlier states |

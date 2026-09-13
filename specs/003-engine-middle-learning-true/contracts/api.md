# Contracts — routes, options, shapes, config

All routes return `{ success: false, error: { code, message }, timestamp }` on failure.
Scope always comes from the verified token (`req.firmId`, `req.userEmail`), never the body.

## New routes (mentorGuard)

| Route | Body / params | Returns |
|---|---|---|
| `GET /api/mentor/semantic-profiles` | — | `{ success, templates: [{ page, title, subSection, effective: {signal: weight}, source: 'authored'\|'auto'\|'keyword'\|'reviewed'\|'none', thin: boolean, thinReason: string\|null, indicators: string\|null, authoredBy, authoredAt }], signals: [signalType], thinCount, total }` |
| `PUT /api/mentor/semantic-profiles/:page` | `{ profile: {signal: 1..10}, note? }` | `{ success, version }`; `400 INVALID_PROFILE` on an unknown signal, a weight outside 1..10, or a page not in the library |
| `GET /api/mentor/semantic-profiles/:page/history` | — | `{ success, history: [{ id, version, is_active, saved_by, created_at }] }` |
| `POST /api/mentor/semantic-profiles/:page/restore` | `{ versionId }` | `{ success, version }` |

## Changed responses

| Route | Change |
|---|---|
| `GET /api/mentor/outcome-learning` (list) | each adjustment gains `size`, `direction`; adds `reach: { delivered, reviewed, readAt }`; `benches.timeSplit` |
| `POST /api/mentor/outcome-learning/bench` | runs fixed, outcome and time-split; same 1500 ms budget then job id |
| `GET /api/firm-manager/outcome-consent` | adds `reach` for the firm |
| `POST /api/firm-manager/outcome-consent` | `on: true` with no secret → `503 POOL_UNAVAILABLE`, nothing written |

## The advisor conversation — two questions, no marker

| Field | When | Text (proposed wording; Mike's on the drawing) |
|---|---|---|
| `issueProposed` | after `domainConfirmed`; skipped for context domains and domains with no authored labels | "From what you've said, the main issue looks like **{label}** — {reason}. Have I got that right, or is it really something else?" |
| `issueDriver` | only when no label ranked, or the reframe matched nothing | "What's the single biggest thing driving it, in a sentence?" |

Both are plain `delta` + `done{field}` events. No selector marker is emitted, so the text box
stays open. The five identifiers pinned by `retiredPrimaryIssueSelector.test.js` are not used
and the locale key `advisor.primaryIssue` is not created.

## Resolver options (`resolveTemplates` / `resolveTemplatesWithOutlier`)

| Option | Shape | Rule |
|---|---|---|
| `pooledAdjustments` | `[{ id, template, dimension, value, size, firms, cases }]` | `size` signed, non-zero; malformed entries dropped |
| `pooledSignalTypes` | unchanged | |
| `profileMap` | `Map<page, profile>` | when supplied, replaces the file-loaded map for this call |

New export: `resolveIndustryWord(typed, vocabulary) → string|null`; `ADVISOR_EVIDENCE`
(the six reason prefixes).

## Reason codes

| Code | Meaning |
|---|---|
| `pooled:lifted-<n>` | net lift applied, `n` = capped total |
| `pooled:held_back-<n>` | net hold-back applied |
| `pooled:outweighed-<kind>` | a matched adjustment applied nothing; `kind` ∈ `distinction`, `primary_issue`, `industry`, `signal` (covers `semantic:` and `purpose_fallback:`) |
| `primary_issue:strong_match` / `partial_match` | unchanged, now live |

`utils/traceReasonCodes.js` and `design/WORDING-TRACE-REASONS.md` gain the two new families.

## Trace block `outcomeLearning`

`{ consented, available, applied: [{ template, direction, size, id, dimension, value, firms, cases }], outweighed: [{ template, size, id, dimension, value, firms, cases, by }] }`

## Provider seam (`server/utils/aiProvider.js`)

`getClient(role)` → `{ chat: { completions: { create(params, options) } } }` where
`options.personal: boolean` is required. Behaviour: primary first; on a thrown error, a
401/402/429/5xx, or an empty reply, one attempt on the fallback if configured and
(`!options.personal || AI.fallbackPersonalCleared`). Reply gains `provider`. Throws the
primary's error when no fallback is permitted. Responses-API and audio calls do not go
through it and log `provider=openai fallback=none`.

Log line suffix on every AI call: `provider=<name> fallback=<none|used|refused-personal>`.

## Boot check

`assertPoolSecretIfConsented()` before the listening line, skipped under `NODE_ENV=test`:
consenting firm exists and `OUTCOME_POOL_SECRET` unset → stderr
`[startup] FATAL: OUTCOME_POOL_SECRET is not set but <n> firm(s) share outcomes` and exit 1.

## Hub tab

`TAB_TIERS.semanticProfiles = ['mentor']`; `NAV_GROUPS` item appended to "Your AI coach";
`MENTOR_ADDED_SINCE` gains `semanticProfiles` with the ruling of 2026-09-14.

## Scenario Lab METRICS additions

- `Primary issue proposed: x/51; would confirm as proposed: y/51`
- `Templates with a thin effective profile: n/199`
- `Cap breaches on the fixed bench: 0/51` (must be zero)

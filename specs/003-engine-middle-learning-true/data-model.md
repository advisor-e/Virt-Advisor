# Data Model — what changes and what is added

No table changes. Every record below is either JSON inside an existing column, a row in the
overlay store (`firm_framework_versions`), or computed.

## 1. The decision trace — two keys added, one string left alone

`decision_trace` on `va_case_studies`, built in `server/advisorEngine.js`.

| Key | Type | Rule |
|---|---|---|
| `primaryIssue` | `{ label: string\|null, how: 'confirmed'\|'reframed'\|'none', reason: string\|null }` | `label` is one of `data/primary-issues.json[domain]` or null. `how` says whether the advisor confirmed the proposal, reframed to another label, or no label was found after the driver question. `reason` is the one-line reason shown with the proposal. Absent for context domains and for domains with no authored labels. |
| `industry` | `string\|null` | The advisor's typed industry, trimmed, or null. |
| `ai` | `{ provider: string }` | The provider that answered the recommendation call. |
| `situation` | string, **unchanged** | Newline-joined labelled lines; `resolveSavedClientContext` reads it as text. Nothing new reads it as an object. |

Validation: `label`, when present, MUST be in the authored list for `domain.id` (the pooled
guard already refuses otherwise). `how` MUST be one of the three words.

## 2. The pooled outcome row — unchanged shape, two fields now populated

`outcome-pool:<firmToken>:<caseHash>` at `PLATFORM_SCOPE`. `primaryIssue` now comes from
`trace.primaryIssue.label`; `industry` from `resolveIndustryWord(trace.industry, vocabulary)`.
The guard is unchanged: a label must be authored, an industry must be a vocabulary word.
`SHAPE_VERSION` stays 1 (no key added or removed).

## 3. The computed adjustment — signed

Computed by `computeAdjustments`; never stored except as the mentor's decision record.

| Field | Type | Rule |
|---|---|---|
| `id` | string | `slug(title)\|dimension\|slug(value)`, unchanged |
| `template`, `dimension`, `value` | as today | |
| `delivered`, `less`, `well`, `firms`, `cases` | int | as today |
| `size` | int, −10..10 | `round(10 × (well − less) ÷ delivered)` |
| `direction` | `'lift'\|'holdBack'\|'none'` | by the sign of `size` |
| `holdBack` | int ≥ 0 | `max(0, −size)`; kept one release for readers, then removed |
| `meetsFloor`, `state`, `decision` | as today | `live` requires `meetsFloor`; a live pairing with `size = 0` applies nothing and is listed |

`liveAdjustments` returns `{ id, template, dimension, value, size, firms, cases }` where
`state === 'live' && size !== 0`.

State transitions unchanged: `below_floor` → `proposed` → `live` / `held` / `rejected`;
`orphaned` when the template leaves the library; a withdrawal that drops a live pairing
below the floor re-states it `below_floor` and it stops applying.

## 4. The decisions row — benches gain a third result

`outcome-adjustments` at `PLATFORM_SCOPE`: `{ decisions, lastRecomputeAt, benches }`.
`benches` becomes `{ fixed, outcome, timeSplit }`.

| Bench | Fields |
|---|---|
| `fixed` | `{ ranAt, before, after, cases, unchanged, changed[], capBreaches: int, liveIds[] }` — `capBreaches` counts cases where a template carrying advisor evidence moved past or below an adjusted one; expected 0 |
| `outcome` | unchanged |
| `timeSplit` | `{ ranAt, cutoff: 'YYYY-MM', trained: int, tested: int, before, after, liveIds[], insufficient: boolean }` — when `tested < MIN_CASES`, `insufficient: true` and `before`/`after` are null |

## 5. Loop reach — computed, cached 60 s

`{ delivered: int, reviewed: int, readAt: ISO }`. Per firm from one `COUNT` on `firm_id`
grouped by `reviewed_at IS NULL`; the mentor's figure sums the pairs of every firm whose
consent record is `on`. No case identifiers leave the store.

## 6. The authored template profile — one overlay row per template

`semantic-profile:<pageId>` at `PLATFORM_SCOPE`, saved by the mentor's verified email.

| Field | Type | Rule |
|---|---|---|
| `v` | 1 | shape version |
| `page` | string | the template's page id; must exist in the platform library at save time |
| `profile` | `{ [signalType]: int 1..10 }` | keys must be in `SIGNAL_TYPES`; a signal absent is unticked; an empty object is a valid "authored as none" |
| `note` | string ≤ 300 | optional, the mentor's reason |

The effective profile for a page = the authored row if one exists, else the compiled entry
from `data/semantic-profiles.json`, else `{}`. History and restore come from the overlay
store per row. `data/semantic-profiles.json` and the compiler are unchanged: the compiler
regenerates the seed only, and a fresh library export changes titles, never page ids.

**Thin** (a computed flag, never stored): effective profile empty, or its weights sum to
fewer than 4, or the effective entry's `source` is `keyword`.

## 7. The provider record

On every AI log line: `provider=<name>` and `fallback=<none|used|refused-personal>`. On the
stored meeting reports, hub readings and transcripts: the existing `model` field gains a
sibling `provider`. On the advisor trace: `ai.provider`.

Config (backend env → `config/integration.js` `AI`):

| Key | Meaning |
|---|---|
| `AI_PRIMARY_NAME`, `AI_PRIMARY_HOST`, `AI_PRIMARY_KEY` | default `openai`, `api.openai.com`, `OPENAI_API_KEY` |
| `AI_FALLBACK_NAME`, `AI_FALLBACK_HOST`, `AI_FALLBACK_KEY`, `AI_FALLBACK_CHAT_PATH` | unset = no fallback |
| `AI_MODEL_<ROLE>` for roles `classify`, `narrative`, `course`, `report`, `reading`, `review`, `compliance`, `draft`, `research`, `extract` | the model per role on the primary; `AI_FALLBACK_MODEL_<ROLE>` on the fallback |
| `AI_FALLBACK_PERSONAL_DATA_CLEARED` | `true` only when Mike has cleared the fallback for personal data; default false |

## 8. The consent read — one pair added

`GET /api/firm-manager/outcome-consent` adds `reach: { delivered, reviewed, readAt }` for
the firm; `poolConfigured` semantics unchanged. `POST` with `on: true` and no secret returns
`503 POOL_UNAVAILABLE` and writes nothing.

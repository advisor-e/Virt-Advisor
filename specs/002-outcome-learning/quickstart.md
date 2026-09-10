# Quickstart: proving Outcome Learning works (4.87)

## Prerequisites

- Local MySQL with the `virt_advisor` schema and the seeded `__platform__` firm row (desktop has it; the laptop does not, so the pool cannot be eyeballed there).
- Backend on Node 14.15 by its exact path; frontend as a production build (`nuxt build` + `nuxt start`), never `nuxt dev`.
- `OUTCOME_POOL_SECRET` set in the backend `.env`. Without it, a review at a consenting firm logs `OUTCOME_POOL_SECRET missing` and pools nothing; the review itself still saves.
- Two dev firms with a firm manager each, and a mentor sign-in (`dev-local-mentor`), per the run-the-app skill.

## Unit proof (what UAT cannot see)

```
npm test -- tests/unit/outcomeLearning.test.js tests/unit/outcomeConsent.test.js tests/unit/pooledHoldback.test.js tests/unit/casesContribute.test.js tests/unit/outcomeLearning.routes.test.js tests/unit/outcomeConsent.routes.test.js
```

Expected: green, with `guardContribution` and `computeAdjustments` at 100% in the coverage summary. The route tests assert that every write's scope came from the request the guard set, never from the body.

## Story 1 — consent gates everything

1. Sign in as firm A's manager, open the hub's Compliance group, the consent tab. Switch on. The screen shows on, who, when.
2. As an advisor at firm A, open a case's review screen: the one-line notice is visible. At firm B (not opted in): it is not.
3. Record a review at firm A with two templates, one `full / less`, one `partial / well`. Record one at firm B.
4. Check the pool: `SELECT config_key FROM firm_framework_versions WHERE firm_id='__platform__' AND config_key LIKE 'outcome-pool:%' AND is_active=1` shows exactly one row, and its `config_json` carries no firm, advisor, client or case id and no free text.
5. Switch firm A off; record another review there; the row count is unchanged. Ask to withdraw; the row is gone and the screen reports `1 removed`.

## Story 2 — the mentor decides

1. Seed the floor: with firm A on, insert pool rows for 5 distinct tokens and 25 cases in one domain where one template is `less` in 12 of 31 deliveries (a seed script under `scripts/dev/` writes these through the store; it never bypasses the guard).
2. Sign in as the mentor; open the Outcome Learning tab. The adjustment lists `firms 5 · cases 31 · hold-back 4`, state proposed. A second template with 20 cases shows `below floor` with the floor beside it and cannot be accepted.
3. Accept the first. State is live with the mentor's name and time; history shows version 2.
4. Reject it with a reason; it stops applying; history shows version 3; restore version 2 and it is live again.
5. Withdraw firm A's rows (Story 1 step 5) and reopen the page: the adjustment is `below floor` and the page says a withdrawal took it there.

## Story 3 — the advisor sees why

1. With the adjustment live and firm A on, run a session at firm A that lands in that domain with that template in the ranking. Open "Why this?": the Outcome Learning section lists the template, `held back 4`, `5 firms · 31 cases`; the scoring table's reason column carries the phrase.
2. Run a session whose advisor text matches an Advisory Distinction for that template: the section lists it as outweighed, and the score is untouched.
3. Run the same session at firm B: no Outcome Learning lines; ranking identical to a run with the adjustment rejected.
4. Stop MySQL and run again at firm A: the recommendation still returns; the trace says learning was unavailable.

## Story 4 — the number

```
node scripts/scenario-lab.js                                  # fixed bench, no adjustments → METRICS block A
node scripts/scenario-lab.js --adjustments live.json          # live.json from GET /api/mentor/outcome-learning/export → block B
node -r dotenv/config scripts/outcome-bench.js                # pool replay, prints before/after share of "went well" tops
```

Then press "Run the benches" on the mentor page: the same four figures appear beside the adjustments with the run date and the live adjustment ids. Expected on the seeded pool: the outcome bench's "after" share is not lower than "before"; the fixed bench's top-template agreement changes on at most the cases that carry the held-back template.

## Before tagging

`npm run build` succeeds; `npm test` green with thresholds; `npm run lint` clean; the three drawings laid beside the built screens and every difference named on the drawing.

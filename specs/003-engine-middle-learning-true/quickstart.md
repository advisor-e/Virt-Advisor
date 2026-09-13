# Quickstart — proving the ten stories on the built app

Prerequisites: the production build (`nuxt build` + `start`, never `nuxt dev`), the backend
on Node 14.15 by exact path, local MySQL `virt_advisor`, `OUTCOME_POOL_SECRET` set once in
`.env` and kept, `OPENAI_API_KEY` with credit, and for story 8 a second provider's key. Sign
in as `dev-local-bypass` (firm `dev-firm-001`) for the advisor and firm views,
`dev-local-mentor` for the Mentor Hub.

Seed: `node scripts/dev/seed-outcome-pool.js --reset` (now seeds a landed-well template too).
Switch sharing on for `dev-firm-001` on the Outcome Sharing tab.

## Story 1 — the primary issue is proposed and confirmed

1. Start a session in the profit domain; describe rising cost of sales in the cause answer.
2. After the domain check-in, expect one line proposing **Cost of sales has increased** with a reason, no list, text box open.
3. Reply "yes". Save the case. Open the case's trace: `primaryIssue.label` is the label, `how` is `confirmed`; the recommendation's scoring log shows `primary_issue:*` on matching templates.
4. Repeat, reply "no, it's really that we're discounting too much": the engine proposes **Excessive discounting eroding margin** once more; confirm; `how` is `reframed`.
5. Repeat with a cause that matches nothing: one open driver question follows; answer with nothing matchable; the session continues, `how` is `none`, and the backend log shows `[signal-miss]`.
6. Start a Conflict Meetings session: no proposal.
7. Review the case at the consenting firm; the pooled row carries the label and the typed industry's vocabulary word.

## Story 2 — a lift goes live

1. Mentor Hub → Outcome Learning: the seeded landed-well pairing is listed with direction **lift**, size positive, counts above the floor.
2. Accept it. Start a matching advisor session at the consenting firm: the trace's Learned from outcomes panel shows the lifted line with `+n`.
3. Reject it with a reason; the next session shows no line. Restore from history; it returns.

## Story 3 — the advisor's words win

1. With a live hold-back on a template, run a session whose industry matches that template's title: the trace shows the adjustment as outweighed by industry, score unchanged.
2. Run the benches: the fixed bench prints `capBreaches: 0`.
3. Unit: `pooledHoldback.test.js` covers all six evidence kinds.

## Story 4 — industry reaches the pool

Type "cafes" as the industry; review; the pooled row's industry is the vocabulary word the
café model's title carries. Type "zzzz"; the row's industry is null and the guard passes.

## Story 5 — reach

Mentor page tiles show delivered and reviewed across consenting firms with the read time;
the firm's Outcome Sharing tab shows its own pair. Review one more case; both move.

## Story 6 — the secret fails loud

1. With sharing on for one firm, unset `OUTCOME_POOL_SECRET` and start the backend: it exits with the FATAL line.
2. With no consenting firm and no secret: it starts; on the Outcome Sharing tab, switching on is refused with the plain message.

## Story 7 — out-of-sample

Run the benches: the card shows in-sample and out-of-sample with the cut-off month and the
count tested. Re-seed with `--months 1` (added flag) and run again: the out-of-sample card says
in words that there is not yet a later month.

## Story 8 — fallback

1. Configure `AI_FALLBACK_*`; set `AI_PRIMARY_KEY` to an invalid value. Run an advisor session: it answers; the log line reads `fallback=used`; the trace's `ai.provider` names the fallback.
2. With `AI_FALLBACK_PERSONAL_DATA_CLEARED` unset, run a Meeting Review report on a test transcript with the invalid primary key: the report fails as today and the log reads `fallback=refused-personal`.
3. Run an economic analysis: `fallback=none` (Responses API).
4. Restore the primary key; everything reads `fallback=none`.

## Story 9 — profiles

1. Mentor Hub → Template Profiles: 199 rows; the thin count matches the lab's line.
2. Open a thin one; its indicators show read-only; tick a signal; weight defaults to 5; save.
3. Run `node scripts/build-semantic-profiles.js`: the file changes, the authored row does not; reload the screen: still authored.
4. Run a session whose signal matches; the scoring log shows `semantic:` for that template; the lab's thin count is one lower.
5. History and restore on that row.

## Story 10 — the brief

Read `design/features/advisory-engine.md` §3, §4 table and Known gaps: routing groups are
"removed by ruling 2026-06-09", not "designed, not built".

## Benches to print before and after

```
node scripts/scenario-lab.js
node scripts/scenario-lab.js --adjustments <export>
node scripts/outcome-bench.js
```

Expected: primary issue proposed on every non-context case; cap breaches 0; thin count
falling as profiles are authored; the time-split card populated or honest.

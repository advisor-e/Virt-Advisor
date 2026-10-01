# Answer bench runs (item 7.19)

One file per run of `scripts/answer-bench.js`, never overwritten. Each records the commit, both
models, a fingerprint of each prompt file, every answer, and its code checks and judge verdicts.
The judge marks answers against [`../ANSWER-BENCH-CHECKLIST.md`](../ANSWER-BENCH-CHECKLIST.md),
approved by Mike 2026-10-01.

**Read a run point by point, never by its overall score.** An average across the seven points
hid a collapse from 17 of 51 to 0 in the proving runs below.

**Compare only runs made by the same version of the bench.** A change to the AI is measured by a
"before" and an "after" run made back to back; an old run is history, not a baseline.

## The three proving runs, 2026-10-01

The bench itself was uncommitted when these ran, so their `commit` field names the app, not the
bench. All three judged the answer against the case alone; the bench now also shows the judge
everything the advisor told the chat, because without it the judge marked given facts (the
advisor's ten years) as invented — so these runs' client-mode point 7 is unreliable.

| Run | What it tested | Result |
|---|---|---|
| `…-baseline` | Today's code | Code checks 91.3% client, 100% Discover |
| `…-damaged` | The chat's instructions swapped for one generic line | **Code checks caught it** (client 73.6%, Discover 0%); the judge did not move — the damage left the qualities it measures intact |
| `…-damaged-wrong-client` | The chat told another case's story; the judge holding the true one | **The judge caught it on the right point**: "About this client" 17 → 0 (client) and 16 → 0 (Discover) |

What the baseline already shows, to be confirmed by the first like-for-like runs: in the four
crisis cases the client chat never led with a survival tool (Discover did all four times), and
client answers met "Plain English" 3 times in 51.

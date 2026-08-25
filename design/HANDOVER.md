# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (fourth session) · Laptop · branch `feat/advisor-progress`

**4.31 and 4.43 closed. 4.15 waits on Mike.** List 7 → 5. Suite **6,524 green**, lint 0
errors. Branch **52 ahead, 0 behind** `master`. Nothing uncommitted.

**4.31 — the prompt checker, both lanes.** An accountant pastes a prompt and gets six
refusals or an AI review; a level puts its own method in force and it reaches every
conversation its advisers have, fenced, and passes down. Recorded in
[`features/ai-prompts.md`](features/ai-prompts.md) §3a.

**4.15 — waiting on Mike, and everything he needs is written down** in
[`LOGIC-TABLE-TEMPLATES-NEEDED.md`](LOGIC-TABLE-TEMPLATES-NEEDED.md): 23 template names, the
19 branches asking for them, and the command to re-measure. **Do not re-derive it and do not
ask him again** — that is what kept 2.3 open for four sessions.

**4.43 — one failure stays one.** 29 test files mutate `NODE_ENV`; eight never restored it
if an assertion threw first, so a single failure knocked over unrelated tests. Reproduced,
then fixed once globally in [`../tests/setupEnv.js`](../tests/setupEnv.js).

**Three defects fixed that were never on the list:** three firm-facing logic tables were
leaking into CLIENT recommendations (`fa79a7d`); the name scanner cut titles at a lowercase
`pt`, silencing branches that named published pages (`48265ac`); every auto-growing textarea
was 2px short with the overflow hidden (`7854da9`). A standing rule can now be added on any
logic table (`48a0f80`) — it could only be reworded before.

🔴 **THE ONE THING TO CARRY FORWARD.** Mike, this session: *"I spend a lot of time fixing
fuck ups due to you not reading the code properly."* Every fix above came from reading the
code or driving the screen — the 2px clip was measured in a real browser, the client leak
proved by running `walkLogicTree`. The wasted time came from the opposite: producing
analysis before checking where the content was even used. **Check first, then build.**

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc).

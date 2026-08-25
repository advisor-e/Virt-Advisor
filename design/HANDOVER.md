# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (fourth session) · Laptop · branch `feat/advisor-progress`

**4.31 closed. 4.15 is waiting on Mike and everything he needs is written down.**
List 7 → 6. Suite **6,528 green**, lint 0 errors. Branch **50 ahead, 0 behind** `master`.
Nothing uncommitted.

**4.31 — an accountant can share a prompt, and a firm can put its own method in force.**
Both lanes, on the AI Prompts tab at all four tiers. Words approved before the build
([`PROMPT-CONTRIBUTION-WORDING.md`](PROMPT-CONTRIBUTION-WORDING.md)). Recorded in
[`features/ai-prompts.md`](features/ai-prompts.md) §3a.

**4.15 — waiting on Mike.** He says the 23 documents exist and will update the search
content, then pick it up. Everything is in
[`LOGIC-TABLE-TEMPLATES-NEEDED.md`](LOGIC-TABLE-TEMPLATES-NEEDED.md) — the names, the
branches, and the command to re-measure afterwards. **Do not re-derive this and do not ask
him again**; that is what kept 2.3 open for four sessions.

**Three fixes found along the way, none of them on the list:**
- Three firm-facing logic tables carried no `mode`, so they were invisible to Learn and
  live on the CLIENT recommendation path — the opposite of the 2026-06-23 ruling. Six
  lines of data (`fa79a7d`).
- The name scanner cut a title at a lowercase `pt`, so two branches naming published pages
  were silenced (`48265ac`). 53 of 55 recommendations byte-identical after; 34/8/13 → 36/6/13.
- Every auto-growing textarea was 2px short under `box-sizing: border-box`, with
  `overflow-y: hidden` hiding what was cut. Logic Tables and Domain Support both (`7854da9`).

**A standing rule can now be added on every logic table** (`48a0f80`) — it could only be
reworded before, and on 41 of 42 tables a new one was silently discarded. This overturned a
written rule; the old wording is gone rather than left beside the new one.

🔴 **THE ONE THING TO CARRY FORWARD.** Mike's words: *"I spend a lot of time fixing fuck ups
due to you not reading the code properly."* Every fix above came from reading the actual
code or driving the actual screen — the 2px clip was measured in a real browser, the client
leak was proved by running `walkLogicTree`. The wasted time in this session came from the
opposite: producing analysis pages before checking where the content was even used.

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc).

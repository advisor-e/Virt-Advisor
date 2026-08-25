# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (second session) · Laptop · branch `feat/advisor-progress`

**Two closed (4.18, 4.25), one deleted (4.45), one filed (4.46). List 10 → 9.** Nothing
half-finished, nothing uncommitted. Branch **35 ahead, 0 behind** `master`. Suite **6,285
green**, lint 0 errors. *(The count fell from 6,289: `toDoItems.test.js` is data-driven, so
closing items removes assertions.)*

**4.18 — the AI can no longer invent your coaching method.** When the loaded guide does not
cover the question it says so and names the guide that does. Recorded as **P10** in
[`features/advisory-engine.md`](features/advisory-engine.md); wording artefact
[`LEARN-SCOPE-HONESTY.md`](LEARN-SCOPE-HONESTY.md); the four guides that could not state their
subject are **P9** in [`features/logic-tables.md`](features/logic-tables.md).

🔴 **THREE THINGS THE OTHER MACHINE MUST KNOW.**

1. **`npm install` still needs npm 8.19.4 on Node 14.15.0**, and still moves 20 packages.
   Unchanged; [`../.npmrc`](../.npmrc) explains it, `npm run check:engines` confirms the tree.
2. **`npm run build` is now step 2 of Integration** — build it, see it succeed, *then* tag.
   Nothing else on our side ever builds the app, and CI is the master team's.
3. **🔴 A GREEN SUITE CANNOT CLOSE AN AI CHANGE, AND TODAY PROVED IT TWICE.** All tests passed
   while the AI's refusal named *the guide it was already holding*, and again while the
   "shall I switch?" offer led nowhere. Both were found by driving the real model — eight
   calls, a fraction of a penny. Method in `LEARN-SCOPE-HONESTY.md` §8–§9. **Do this before
   calling any prompt change done.**

**4.46 is the one to pick up, and it is ours.** The switch offer 4.18 introduced does not work:
"yes" loads no guide at all. Cause proven and written in the item — do not re-diagnose it, and
size the fix before building it.

**Nothing waits on Mike.**

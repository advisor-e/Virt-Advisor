# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (second session) · Laptop · branch `feat/advisor-progress`

**Two items closed — 4.18 built, 4.25 found already built. The list is 10 → 9.**
Nothing is half-finished and nothing is uncommitted. Branch **31 ahead, 0 behind** `master`.
Suite **6,289 green**, lint 0 errors.

**Closed: 4.18 — the AI invents advice when it is routed to the wrong method.** Three commits:
[`5776ab3`](.) the approved wording saved *before* approval, [`9ddc37b`](.) the honesty fix,
[`c102f91`](.) the four guides that could not say what they are. Artefact:
[`LEARN-SCOPE-HONESTY.md`](LEARN-SCOPE-HONESTY.md). Full closure in
[`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2.

🔴 **FOUR THINGS THE OTHER MACHINE MUST KNOW.**

1. **`npm install` still only works with npm 8.19.4 on Node 14.15.0**, and your next install
   still moves 20 packages (`@types/node` pinned in `overrides`). Unchanged from yesterday;
   [`../.npmrc`](../.npmrc) explains why, `npm run check:engines` confirms the tree.
2. **A prompt block now rides with every loaded coaching guide.** `formatCoachingScopeForPrompt`
   in `server/utils/logicTrees.js` tells the model which guides it holds and which it does not,
   and gives it the words to decline. **Do not add a second scope statement anywhere** — it is
   generated from `methodGuides.GUIDES`, so a guide added later appears with no edit. That
   property is the whole point; a hand-written list is what lost the 116 lines in 4.16.
3. **The refusal sentence is approved wording and is pinned by one deliberate test.**
   `tests/unit/coachingScope.test.js`. It is `LEARN-SCOPE-HONESTY.md` §4 verbatim. Rewording it
   is Mike's call, not a tidy-up — the comment above the test says why.
4. **🔴 TESTS CANNOT CLOSE AN ITEM LIKE THIS ONE, AND THIS SESSION PROVED IT TWICE.** The suite
   was fully green while the AI named *the guide it was already holding* in its refusal — a dead
   end delivered in a helpful tone. It was found by asking the live model, not by any assertion.
   Anything that changes what the AI is shown gets driven against the real model before it is
   called done. Eight `gpt-4o-mini` calls cost a fraction of a penny; the method is written up
   in `LEARN-SCOPE-HONESTY.md` §8–§9 and the scripts are disposable.

**Nothing waits on Mike** except the ranking position of the new item (below).

**New on the list: 4.45 — a vague word beats an exact phrase because of where it sits in the
file.** This is the *root cause* of 4.18's reported incident, found while closing it:
`detectLogicTree` counts matched triggers and breaks a tie by **array position**. On the reported
question `ratio_analysis` and `dashboard_discussions` both scored 1 — one on the generic word
*"ratio"*, one on the exact metric name *"wages to sales"* — and the vague match won because it is
listed first.

⚠ **The fix was built, measured, and then deliberately reverted — read 4.45's note before
starting.** It is correct (66 of 66 real trigger phrases moved from generic to specific) but its
blast radius is the whole app, and it exposes a second defect: the Learn-mode fallback searches
all 43 trees then bins any non-learn result, so a client table winning on specificity leaves learn
mode with **no coaching guide at all**. Mike stopped it on reading that measurement rather than
letting it ride in on 4.18's back. The measurement is in the item so nobody re-derives it.
**4.45 sits last only because it was appended — its ranking is Mike's to set.**

**🔴 CLOSED 4.25 — IT WAS ALREADY BUILT, FOUR DAYS EARLIER.** `7fa5e9a` (2026-08-21), already in
`origin/master`: `npm run visual`, 16 screens, four plain-English rules in
[`VISUAL-CHECKS.md`](VISUAL-CHECKS.md). Its first run on 2026-08-23 found two real defects. The
item still read *"Playwright is not in package.json and never has been"* — it is, at 1.34.3,
`engines: node >=14`, so the Node lock is untouched. **Third time an item has been found already
built while still flagged open** (§0 of to-do-done-and-parked.md warns about exactly this). Before
planning any item, check the code against it.

**⚠ ONE THING FOR MIKE, SURFACED NOT FILED: there is no CI in this repository at all.** No
`.github/workflows`, no equivalent. `CLAUDE.md`’s Enforcement section says CI requires `nuxt build`
to pass and warns above a 300 KB bundle; nothing here does that, and 4.25’s own `touches` named a
"CI step" that has never existed. Whether the master app’s pipeline runs anything is outside what
this repo can see. Repo-wide, so it is Mike’s call whether it becomes an item.

**Next up, all ours:** **4.15** (21 logic-tree branches naming pages nobody can open) ·
**4.36** (the Model Guide search only matches the exact words the page happens to use) ·
**4.42** (the to-do page's hand-written half describes six finished items).

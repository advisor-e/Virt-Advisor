# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (second session) · Laptop · branch `feat/advisor-progress`

**Two items closed — 4.18 built, 4.25 found already built. The list is 10 → 9.**
Nothing is half-finished and nothing is uncommitted. Branch **34 ahead, 0 behind** `master`.
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

**Nothing waits on Mike.**

**New on the list: 4.46 — the AI offers to switch guides, the advisor says yes, and nothing
happens.** 🔴 **A defect THIS SESSION shipped**, found by testing an assumption instead of
trusting it. 4.18 gave the model an honest exit that ends *"Would you like me to switch to it?"*.
Reproduced live: **"yes", "yes please" and "yes, switch to it" all load NO coaching guide at
all** — the AI picker returns nothing and so does the keyword fallback. Only the advisor typing
the guide’s full name works, which is what the offer exists to spare them.

⚠ **The cause is proven, so do not re-diagnose it.** `newestFirstUserText` builds the picker’s
input from `history.filter(m => m.role === 'user')`. The guide name is in the **assistant’s**
message, so the one fact needed to honour the offer is structurally excluded. The picker is not
failing; it was never told. **Size the fix before building it** — carrying the offered guide id
forward is cheap, including the assistant turn changes routing for every learn conversation.

**4.45 was deleted the day it was filed** (the routing tie-break). Mike asked why it was worth
keeping once 4.18 removed the harm, and he was right — it cost one extra turn, not an answer. Its
measurements live in 4.18’s closure. **Deleting it was right; deleting it without testing the
"just say yes" premise would have closed the list on a false one.**

**🔴 CLOSED 4.25 — IT WAS ALREADY BUILT, FOUR DAYS EARLIER.** `7fa5e9a` (2026-08-21), already in
`origin/master`: `npm run visual`, 16 screens, four plain-English rules in
[`VISUAL-CHECKS.md`](VISUAL-CHECKS.md). Its first run on 2026-08-23 found two real defects. The
item still read *"Playwright is not in package.json and never has been"* — it is, at 1.34.3,
`engines: node >=14`, so the Node lock is untouched. **Third time an item has been found already
built while still flagged open** (§0 of to-do-done-and-parked.md warns about exactly this). Before
planning any item, check the code against it.

**✅ ANSWERED, AND `CLAUDE.md` CORRECTED: there is no CI in this repository, and there was never
meant to be.** Mike, 2026-08-25: *the master team runs checks before loading into UAT, and more
tests before pushing to production.* The Enforcement section had said *"CI additionally requires
`nuxt build` to succeed…"*, which read as a gate on this repo; it now says where the two real
gates are. ⚠ **The residual is worth knowing before any release:** nothing on our side builds the
app, so a tag can be cut from a branch that does not build and the master team finds out first.
`npm run build` once before tagging closes it — raised, and left as Mike’s call rather than
adopted as a rule.

**Next up, all ours:** **4.15** (21 logic-tree branches naming pages nobody can open) ·
**4.36** (the Model Guide search only matches the exact words the page happens to use) ·
**4.42** (the to-do page's hand-written half describes six finished items).

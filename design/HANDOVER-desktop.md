# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Desktop · branch `feat/firm-quiz-builder-ui`

**Three commits, all pushed.** Suite **11,938 green** (558 suites), lint clean, coverage and
audit gates passed. Tree clean. **Twelve live items — 7.11 closed today.** 28 ahead of `master`,
0 behind; all of it is in **[PR #99](https://github.com/advisor-e/Virt-Advisor/pull/99)**.

🔴 **7.11 IS FIXED AND CLOSED** (`ddf2dcce`). The budget question offered the wrong calculator
5/6; now the right one **4/4** wherever one is offered, right *Best match* **6/6**. The fix was
one sentence — Mid-Level's `answers` opened *"the same question as the High-Level Budget, plus the
one that usually matters more"*, so the AI was told one model was strictly better and obeyed.
Full closure with both dead ends on `to-do-done-and-parked.md` §2.

🔴 **THE REAL LESSON IS NOT ABOUT BUDGETS — IT COST A DAY.** 7.11's note claimed that sentence was
Mike's and must not be edited. **It was AI-authored** (`0fdee54b`, `b8c2fa56`); his 2026-09-13
rulings are all *screen* wording and `ARTEFACTS.md` line 108 records none on the summaries. Two
earlier attempts failed because they worked *around* the sentence. Found only because Mike
challenged it — *"find me exactly where the budget is described in my words"*. Corrected in the
item, in `advisory-engine.md`, and searched for elsewhere: those were the only two copies.
**Check a provenance claim before treating it as a constraint.**

🔴 **THE 7.9 CLASH IS RESOLVED — THIS MACHINE'S BECAME `7.12`** (`0c00000f`), by
`ITEM-NUMBERING.md` 101-106: move whichever is quoted in fewer places. Ours 9 refs, yours 2.
**Your 7.9 is untouched and stays.** ⚠ One line in `advisory-engine.md:153` is YOURS — *lease or
buy a van*, *loan repayments* — I renumbered it, caught it, reverted it, and it now reads *"the
laptop's item 7.9"*. Yesterday's and today's commit messages still say 7.9 for what is now 7.12;
that is history and is recorded in `0c00000f`.

⚠ **I touched `data/report-model-summaries.json` again — Mid-Level's `answers` only, on Mike's
approval. It is under your 7.5.** No names, routes or instruction lines. Expect a possible
conflict there and keep both sides.

**7.12 (was our 7.9) is still open at 4 of 6.** Today's bench showed 2 runs naming the right model
with no page path at all — the offer dropped, not the wrong model. `activeOn` is clear; either
machine may take it.

**Handbook is the master-built page again** (built from `b1cdd494`), on Mike's ruling this
session. Item 14.3 unchanged.

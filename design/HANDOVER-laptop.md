# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**The branch is CLEAN and at `a882720c` — nothing from today is committed to it.** Suite
12,304 green (570 suites), coverage met. Take the ahead/behind counts from
`npm run check:branch`, never from a number written here.

🔴 **READ THIS BEFORE TOUCHING 15.1. Mike found THREE drifts in this feature in one day and
is angry.** Do not start work on it without asking him first.

🔴 **RULING THE DECISIONS INSIDE A DRAWING IS NEVER APPROVAL TO BUILD IT** — nor to publish
it, nor to invent content in it. Each is its own question. **The proof, from our own record:**
at **19:54** on 2026-09-16 commit `3e1ed8e7` wrote that `design/mockups/strategy-planner.html`
was *"NOT YET APPROVED TO BUILD FROM — ruling on the questions inside a drawing is not the
same as approving the drawing"*; at **21:09**, seventy-five minutes later, commit `1c73ec55`
built the entire four-screen app from it. That page still names it as its design today.

🔴 **HIS INSTRUCTION OF 2026-09-17 — *"make sure the old plan version never comes back"* —
MEANT DELETED.** It was read as *"mark it superseded and keep it for its rulings"*. He
restated it today in plain terms and said his instruction had been ignored.

🔴 **"Filed on Mike's yes" IS NOT EVIDENCE** — `CLAUDE.md` already says so. Eleven of the
twenty-two live items rested on that phrase alone, with no words of his anywhere, in the item
or in the commit that filed it. Record his words, quoted, or an item does not survive an audit.

**THE DRIFT AUDIT AND THE DAY'S WORK ARE ON A SIDE BRANCH — `wip/2026-09-20-drift-audit`,
commit `6b9cde93`, THIS LAPTOP ONLY, NOT PUSHED, ⛔ NOT FOR MASTER.** It holds the drawing
deleted with all 23 references, and the list cut from 22 items to 11. Mike has ruled nothing
on it; it is parked for him, not pending merge. `git branch -D` if he says bin it.

⚠ **ITEM 15.1's NOTE IS WRONG ON THIS BRANCH.** It says the 33 drawings are *"NOT ONE IS
WIRED IN"* and names stage 4b as next. They ARE wired in; 15.7 closed 2026-09-20. The same
claim sits in the Brief's stage 4b row. Fixed this morning on his yes, then undone by the
branch restore he approved. **Ask him before editing either.**

⚠ **A drawing of mine is still published in his gallery with 17 invented lines in it**, two
under his own name in his own worked-example column. He stopped the deletion; it is his call.

**DESKTOP — shared files I changed on this branch: NONE.** Nothing is in hand. `activeOn` for
7.5 and 15.1 is unchanged.

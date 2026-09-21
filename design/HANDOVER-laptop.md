# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Laptop · branch `feat/advisor-progress`

🔴 **DESKTOP — READ THIS FIRST: BOTH BRANCHES ARE ON `master` AND YOURS IS 12 BEHIND.** Mike
asked for the two machines to be synced. PR **#106** (your item 17, stages 1–3) and PR **#107**
(this machine's 15.1) are both merged; `master` is at `2a7c3d21`. **Merge `master` in at
`/startup` before you start anything**, or you will build on yesterday. Your branch was not
touched from here — that is yours to push, and this machine may not.

**This laptop: clean, 0 ahead / 0 behind.** Suite **12,830 green** (586 suites), lint 0 errors,
coverage and audit gates passed. That was the **first run of both machines' work together**, and
it passed. **NOTHING WAITS ON MIKE.**

**The merge collided in two files, neither of them code, and no code file was touched by both
machines.** `to-do-items.json` was resolved by comparing both sides against the merge base item
by item — you had changed only item 17, this machine 15.1 and 5.3 plus the new 16.1, nothing on
both — and the script was written to stop rather than guess if anything had been.
`design/CODE-SIZE.md` is generated, so it was regenerated.

🔴 **FORM 3 OF 9 WAS BUILT TWICE AND THE SECOND ONE SHIPPED — this is the finding, not the
feature.** The drawing was faithful to `Org Chart.xlsx`, the build was faithful to the drawing,
both were correct, **and the screen was still wrong.** Mike typed three people's names into the
only box there was, the one headed *Role*. **No gate here could have caught it, because every
gate compares the build to the drawing.** The redraw
(`design/mockups/strategy-capture-org-chart-redrawn.html`, five decisions ruled one at a time)
adds a Name column, makes the top-of-chart choice read *Nobody*, and colours the chart by depth.
Brief, stage 5.

🔴 **SIX FAULTS, NOT ONE CAUGHT BY 12,000 TESTS.** All fixed, all in the Brief's own box. Two
were **not** about this form: `postTimeline` had refused a timeline entry for **every box on all
16 workbook concepts since 2026-09-17**, proved on the running backend with a Porter's box; and
the stage rail marked *Build session* done on the opening screen, because `steps` was missing
from its order. **THE RAIL IS NOW CLICKABLE IN ANY ORDER** (Mike's request), and leaving Scope
fetches a newly ticked concept's table — without which the exact journey he asked for dropped it.

**NEW ITEM 16.1**, filed on his yes: primary buttons render Buefy's violet where
`BRAND-TOKENS.md` says brand blue. Pre-existing, app-wide, 84 files. The stage rail and the Org
Chart toolbar are deliberately brand blue — do not change them back.

**`activeOn`: 7.5 and 15.1 laptop, 17 desktop.** Your handover read **current** from your own
branch in `check:branch`.

**NEXT on 15.1:** stage 5 form 4 of 9 — six forms remain.

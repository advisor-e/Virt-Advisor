# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Laptop · branch `feat/advisor-progress`

**Clean and pushed, 8 ahead / 0 behind.** Suite **12,679 green** (581 suites), lint 0 errors,
coverage and audit gates passed. **NOTHING WAITS ON MIKE.**

🔴 **FORM 3 OF 9 WAS BUILT TWICE AND THE SECOND ONE SHIPPED — read that finding before the
feature.** The drawing was faithful to `Org Chart.xlsx`, the build was faithful to the
drawing, both were correct, **and the screen was still wrong.** Mike typed three people's
names into the only box there was, the one headed *Role*. **No gate we have could have caught
it, because every gate compares the build to the drawing.** The redraw
(`design/mockups/strategy-capture-org-chart-redrawn.html`, five decisions ruled one at a time)
adds a Name column, makes the top-of-chart choice read *Nobody*, and colours the chart by
depth. Strategy Planner Brief, stage 5.

🔴 **SIX FAULTS, NOT ONE CAUGHT BY 12,000 TESTS.** All fixed, all in the Brief's own box. Two
are worth the next session's attention because they were **not** about this form:
`postTimeline` had refused a timeline entry for **every box on all 16 workbook concepts since
2026-09-17** — proved on the running backend with a Porter's box — and the stage rail marked
*Build session* done on the opening screen because `steps` was missing from its order.

**THE STAGE RAIL IS NOW CLICKABLE IN ANY ORDER** (his request), and leaving Scope fetches a
newly ticked concept's table — without which the exact journey he asked for silently dropped
it. The primary button reads *Build the session* and no longer moves.

⚠ **ONE DRAWING ERROR WAS FOUND BY MACHINE, AND THE BUILD WAS RIGHT.** The redraw's first
version rescaled its chart and rounded parents to whole columns, putting five boxes 96px off.
`tests/unit/orgChart.test.js` compares the artefact to `layout()`'s output; the drawing is now
that function's own output, so nothing can drift.

**NEW ITEM 16.1**, filed on his yes: primary buttons render Buefy's violet where
`BRAND-TOKENS.md` says brand blue. Pre-existing and app-wide — 84 files — so not fixed inside
the commit. The stage rail and the Org Chart toolbar are deliberately brand blue; do not
change them back.

**DESKTOP — shared files I changed:** `pages/strategy-planner.vue`, `locales/en.json`
(a `strategyPlanner.orgChart` block and `startSession`), `server/routes/strategyPlanner.js`
(the timeline guard), `server/utils/strategyCaptureForms.js`, `design/ARTEFACTS.md` (two rows),
`design/features/to-do-items.json`, `to-do.md`, `strategy-planner.md`, `design/CODE-SIZE.md`.
**Your item 17 and every file it names are untouched.**

**`activeOn`: 7.5 and 15.1 both still laptop.** Your handover read **current** from your own
branch in `check:branch`.

**NEXT on 15.1:** stage 5 form 4 of 9 — six forms remain.

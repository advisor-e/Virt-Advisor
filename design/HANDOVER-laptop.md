# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Laptop · branch `feat/advisor-progress`

**Clean and pushed. Suite 13,461 green (608 suites), lint 0 errors, audit gate clean.**
**PR #116 is OPEN and NOT merged** — everything below is on the branch and on GitHub, and
none of it has reached `master`. Merging it is Mike's call and he has not given it.

### Item 16.2 is BUILT — the firm's brand on the plan and on the planner

`GET /api/report/firm/brand` serves `firmBrand()` (no screen — the values are Advisor-e's,
his 2026-08-15 ruling). `pages/strategy-planner.vue` binds the three firm props, which
closes the second fault filed on the item. `StrategyPlanDocument` carries the frame, the
mark and the page number; the five planner screens carry the frame and the mark too.

### 🔴 READ THIS BEFORE TOUCHING THE FRAME OR THE MARK

**THE VALUES COME FROM `design/mockups/strategy-plan-firm-mark.html`, CHARACTER FOR
CHARACTER. DO NOT RECOMPUTE THEM FROM `Advance.6.Organisational Review.pdf`.** Seven
versions were built and rejected in one session, and every one of them was re-derived
from the PDF instead of ported from the drawing Mike had already approved. Each rebuild
lost something different — the relief, then the break, then the logo's place on the bar,
then the proportions. The rule is written at the top of both components. Follow it.

**A CSS BORDER CANNOT DO THIS JOB and six versions used one.** It cannot be inset from
the sheet (no relief outside it), cannot break for the logo, and cannot be stood on. The
frame is `StrategyPlanFrame.vue` — five bars: top, left, right, and a foot that is either
whole or Mike's two pieces with the logo's box between them.

**Mike's ruling, 2026-09-22, for screens:** *"i dont care about the page size until it
comes to printing. so long as the border is same distance from outer edge, has the logo
in bottom left as agreed."* So on a screen the inset and thickness come from the WIDTH on
all four sides; every x position is the drawing's, untouched. The printed sheet keeps the
drawing's own height-based values, because a sheet has a fixed shape.

### ⚠ UNRESOLVED, AND IT IS WHY THE SESSION ENDED

Mike's last report: *"first 2 slides only in the produce plan - the rest was no change.
no change at all in the rest of the app."* **Measured in a fresh browser against the
running app, that is not what renders:** all 13 sheets carry the frame and the mark, and
only the teaching page hides its frame — which is Decision A, his own ruling, because the
concept drawing inside already carries one. **The likeliest explanation is a cached
build in his browser, and it was never confirmed.** Do not assume it is fixed. Ask him,
and get him to hard-refresh before anything is changed on the strength of it.

**"No change at all in the rest of the app" is accurate and expected** — the frame was
scoped to the Strategy Planner, because that is what he asked for. Nothing outside it was
touched. Whether it should spread further is his decision and he has not made it.

### Also in this branch

Item 13.4 and 13.1 came across from the desktop in the merge. Three stale records were
corrected: stage 7 of item 15.1 was recorded as unbuilt in `to-do-items.json`,
`ARTEFACTS.md` and the Brief when it had shipped the day before.

### SHARED FILES I TOUCHED — check before you edit

`pages/strategy-planner.vue` (substantial: the firm props, `--sp-firm`, the sheet wrapper
around all five stages, the print rules) · `components/strategy/StrategyPlanDocument.vue` ·
**new** `StrategyPlanFrame.vue`, `StrategyPlanMark.vue` · **new** `server/routes/firmBrand.js`
· `server/restify-server.js` · `design/ARTEFACTS.md` · `design/features/to-do-items.json` ·
`design/features/strategy-planner.md` · **new** `design/mockups/strategy-plan-firm-mark.html`
· two new test files.

### ⚠ LOCAL TO THIS LAPTOP, NOT IN GIT

`data/dev-firm-currency.json` holds a stale `firm-test-123` entry from 2026-08-22 that
broke two of the desktop's currency tests here and passed on the desktop. The test now
stubs the read; the entry is still on disk. Same family as item 5.3.

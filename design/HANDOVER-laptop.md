# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-31 · Laptop · branch `feat/advisor-progress`

Suite **6,574 green**, lint 0 errors, nothing uncommitted. **Two commits, pushed. PR #51 open.**

### The Volatility accounts upload is built — item 4.54 CLOSED

Two real Xero exports driven end to end through the running app. Two shapes are read: the
by-month P&L, and an **Account Transactions** listing (one row per invoice, the date an
Excel serial), which is the better source — one file fills the whole 24-month window.

> 🔴 **A `0` means the OPPOSITE thing in each shape, and both readings are correct.** In a
> by-month P&L it is a month the year has not reached — missing data, poison to the maths.
> In a transaction listing it is a month nothing was invoiced — real, and the lumpiness the
> report measures.

### 🔴 A RULE FOR ANY REPORT SCREEN, not just this one

**A workbook sample figure may only ever be on screen while the sample notice is showing.**
This screen could put £125,463 of demo data into a client's report with the notice switched
off — widening the window padded from `SAMPLE_SALES`, and the notice was a flag cleared by
the first keystroke. Now structural: a 24-month buffer records each month's source and the
window cannot widen over a `sample` month. **If you copy this screen, copy that.**

Real data found **seven** defects the repo's sample data could not — it starts on a clean
month, fills a window exactly, and scores in the red band. One was in shared code:
`HeroFigure` had no `warn` tone, so any model scoring mid-band rendered its headline plain
white. Fixed, with a guard test.

### 🖥 Desktop

**Your ring-fence trim is still not on `master`.** Until it is, any session rebuilding the
Handbook from `master` publishes it UNTRIMMED — I withheld mine today for that reason.
Nothing here touches Course Builder. Open: **4.15** (Mike) · **4.50** (needs a database).

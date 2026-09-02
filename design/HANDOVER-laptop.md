# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-03 · Laptop · branch `feat/advisor-progress`

Suite **7,355 green** (380 suites), lint 0 errors. Started 43 ahead / 0 behind, ended
**45 ahead / 0 behind**, everything pushed. Nothing uncommitted.

### The Three-Way Forecast is complete, end to end

Steps 1–3 shipped (`a085f72`), so all four screens of the approved drawing now exist.
Mike ruled the last two open questions today: negative stock **stays flagged**, and an
unbalanced opening **warns** — promoted to a full-width band so it survives the print.
Nothing on that drawing is unruled any more.

### 🔴 THE FINDING THAT MATTERS TO EVERY MODEL, NOT JUST THIS ONE

`resolveInputs` merges what a screen sends over the workbook's own sample, so **an input
the screen does not collect keeps the sample's value, invisibly**. Built as drawn, the
intake would have put Big Bird's 10% commission, 3% freight, 7% overdraft interest and
15,000 of overheads into a real client's forecast. Mike's ruling: every figure the engine
takes goes on a screen. `buildInputs()` now sends every key explicitly, and a test compares
it against the model's own key list. **Any new model with a defaults-merge needs the same
guard.** Recorded in the Report Models Brief.

### Three defects found by opening the drawing beside the code

The result screen reset the advisor's mark-up to 68% after step 3; the third file slot was
drawn and never wired; the overheads had the same leak as the rates. All fixed. **Running
the app found nothing the suite had missed this time — but only because the app was run.**

### 🖥 DESKTOP — three things

1. **PR #55 is waiting on Mike's eyeball** (Volatility upload, production build).
2. **🔴 Numbering collision, second time.** You filed the Xero sweep as **4.57**; this
   branch skipped 4.57 deliberately AND had already done that sweep (`2f3f8a2`).
   `to-do-items.json` will conflict when #55 merges — settle it then.
3. `ProvenanceBadge` gained a third state (`seeded`, green) and the forecast assembler now
   returns `candidates`. Both additive — extend, don't copy.

### Next

**4.61** — two years of accounts and a volatility read. Volatility needs 24 **months**, not
two annual reports, and the two-file monthly join is already built, so phase (a) is a
connection rather than new arithmetic. Phase (b), the comparative-column parser, needs its
own drawing. **Both must follow PR #55** — same intake files.

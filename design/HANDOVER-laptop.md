# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-03 · Laptop · branch `feat/advisor-progress`

Suite **7,396 green** (380 suites), lint 0 errors. Started 8 ahead / 0 behind.

### Built — buying and selling capital assets (4.61)

Mike approved the drawing, and step 3 of the Three-Way Forecast now has the block. The
engine has always taken `additions` and `disposals`; the screen sent hardcoded zeroes, so
his own R3 and R4 corrections were built and unreachable. They are reachable now.

### 🔴 He reversed one of the drawing's six rulings, and he was right

The drawing said a sale has ONE figure — the sale price — and that no gain would be shown.
He ruled: *"there are legitimate times that an asset sells for more than book value - such
as a used vehicle - this should be able to be included and calculated."*

So a Sell row carries **two** figures. `disposals` is now the book value leaving the
register, `proceeds` is the price; the bank and the GST return follow the price, the
register follows the book value, and the difference is a gain or loss in the month of the
sale. **Correction R10**, written up in `THREE-WAY-FORECAST-DEVIATIONS.md`.

**The drawing's costing of this was wrong and the record now says so.** It rejected the
two-field shape as needing a new monthly P&L row that would change the 10,155-cell golden
set. It doesn't — the gain joins the existing Other Income total and reaches profit, tax
and retained earnings with no new plumbing. The golden set is untouched, pinned by a guard
written and proved passing **before** the engine was changed.

### The thing that would have shipped quietly

Before R10, selling from a category for more than it carried drove book value negative and
charged **negative depreciation**, which *adds* to profit and compounds for the rest of the
year. Opening asset values default to zero — no export carries them — so it would have
fired for most advisors. Unreachable until this block existed. R10 dissolves it.

### Filed

**4.65** — read the Fixed Asset Schedule, so the book value is picked rather than typed.
Mike's challenge (*"cant see why you cant pull the book value from that?"*) was correct: the
figure exists, on a report step 1 has never asked for. He chose "typing it for now".
Placed **last** — he has not ranked it. Couple it to 4.60: same person, same request.

### Next

The volatility read (approved, undrawn) — draw it first. Then 4.64, which builds the place
4.63 lands.

### 🖥 DESKTOP

Your branch is 4 ahead of master, last commit **2026-09-03** — but your handover is dated
**2026-09-02**, so a session's work has no note. Also: `to-do-items.json` has changed again
here (4.61 reworded, 4.65 added, table regenerated) — expect the usual conflict.

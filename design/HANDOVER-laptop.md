# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Laptop · branch `feat/advisor-progress`

**Eight commits, all pushed** (`be111078` … `b0edacf1`). Suite **12,074 green**, lint 0, audit
gate pass. **0 behind `master`, 24 ahead.** No application code was written — `design/` only.
**15.1 and 7.5 stay active on this laptop.**

🔴 **`design/mockups/strategy-planner.html` IS SUPERSEDED AND NOW SAYS SO** — in its browser
title, its `h1`, a banner above everything, and its file header. Mike's instruction after a
republish of it surfaced where he expected the new drawing: *"make sure the old plan version
never comes back."* **Open it for a ruling, never as the design.** Not deleted — its eleven
rulings live there, and a drawing that is gone cannot be checked against.

**15.1 — THE OUTPUT IS DRAWN.** [`strategy-plan-output.html`](mockups/strategy-plan-output.html):
all 31 pages of `Pivot.pdf` reproduced, each block carrying the page it answers, so the
acceptance test runs against the drawing. ☑ **Decision 1 ruled** — one continuous document of
slide-shaped pages, **ONE artefact never two formats**. ☐ **Four open, Decision 2 asked and
unanswered**: does the advisor name the steps, or does the app group the ticked concepts?

**Read Pivot, not the notes about it.** Two findings changed the model, both in census §1:
teaching and capture interleave **per STEP, never per concept**, and **a concept can be captured
twice into the same table** (Porter's p11 observations, p21 responses) — so the capture record
keys on the **visit**. The Brief's *"the plan carries the capture, never the teaching"* was wrong
and is corrected; Pivot is 12 teaching slides to 9 capture.

**The impact test's 45 was wrong — it is 51.** ADV.0's index has drifted four concepts and a page
offset. Corrected in `ARTEFACTS.md`, the Brief and both drawings, with the reason on the page.

**DESKTOP — shared files I changed:** `design/ARTEFACTS.md`,
`design/features/strategy-planner.md`, `design/features/to-do-items.json` (15.1's note), and the
two mockups. **Nothing in `components/FirmManagerHub.vue`, `server/advisorEngine.js`, or anything
else 7.2 owns.**

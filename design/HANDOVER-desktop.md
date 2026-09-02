# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-02 (evening) · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **6,689 green** (357 suites), lint 0 errors, everything committed and pushed.

**4.56 CPD-follows-the-library: BUILT, MERGED to master (PR #54) and closed** —
recommendations and claimable CPD minutes now always price from the same library.

**4.54 Volatility by-month upload: BUILT, pushed, PR #55 OPEN (not merged)** —
new parser + firmAuth route + the mockup's upload card/chips back on the screen.
🔴 Mike has NOT yet eyeballed the screen — that look (production build, never
`nuxt dev`) is the one open step before merging #55.

**New ruling (Mike): intake wording names no accounting product** — "your
accounting software". New wording complies, pinned once; the sweep of the older
screens' Xero strings is item 4.57 on the live list (his option A).

**LAPTOP:** master moved once today (PR #54, `ae56333`) — merge from master
before working. PR #55 will move it again when merged. The two new intake
files (monthlySalesParser + its test) live beside your xeroReportParser —
shared helpers are now EXPORTED from it; extend, don't copy.

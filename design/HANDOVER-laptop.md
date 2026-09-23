# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 · Laptop · branch `feat/advisor-progress`

**Clean and pushed at `af9ce7ae`. 617 suites / 13,593 tests green, lint 0 errors, audit gate
PASS. 12 ahead, 0 behind `master`, and [PR #127](https://github.com/advisor-e/Virt-Advisor/pull/127)
IS OPEN** — Mike has not merged it; that is his.

**15.19 CLOSED, and it unblocks 15.17, still in hand here.** A drawing may sit unwired while
declared in `AWAITING_APPROVAL` **and** carrying its `AWAITING APPROVAL (<file>#<n>)` token on
its `ARTEFACTS.md` row. Remove the token — which is how approval is recorded — and the build
fails until it is wired. Neither existing rule is weakened.

🔴 **15.20 IS DRAWN AND FULLY RULED, AND NOT APPROVED TO BUILD FROM.**
`design/mockups/add-concept.html` — six questions, every one ruled beside itself. **Ruling the
questions inside a drawing is not approving the drawing;** the gate is still shut. **Read the
drawing, not a summary** — two rulings went against the recommendation and both changed the
build.

⚠ **`pdfjs-dist` is NOT installed.** The conversion was measured outside the repo; its SVG
back-end is unmaintained by its authors. Risk recorded in `strategy-planner.md` §9 and on the PR.

**SHARED FILES I TOUCHED** — `scripts/quick-gate.js` (new pure `jestRuns`; a documents-only
commit no longer runs all 617 suites) · `scripts/build-concept-graphics.js` ·
`tests/unit/conceptGraphics.test.js` · `tests/unit/quickGate.test.js` · `design/ARTEFACTS.md` ·
`features/strategy-planner.md` §9 · `to-do-items.json` · `to-do-done-and-parked.md` ·
`design/mockups/add-concept.html` (new). **Your quiz-builder, currency and register files
untouched.**

**In hand here:** 15.1, 15.17, 15.20 — all `activeOn` laptop. Nothing half-finished.

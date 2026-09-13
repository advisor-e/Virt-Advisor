# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-13 (twenty-sixth session) · Laptop · branch `feat/advisor-progress`

Suite **10,240 green** (491 suites), lint 0 errors, tree clean, 11 ahead / 0 behind `master`.
One commit, pushed: `b8c2fa56`. **FOUR live items** — 4.15, 4.58, 4.86, 4.87.
**Nothing is active on this machine.**

**4.93 Mid-Level Budget — BUILT AND CLOSED.** The second of the three unbuilt Model Library
cards, chosen over Sales Dashboard and Stock Purchasing because it is the High Level Budget's
near-twin — same line set, 813 formulas against 814 — so most of the screen was already
approved. Maths, route, the five-step screen, the live card, the Model Guide entry and the
guards. Closure on [`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2; the
model's own section is in [`features/report-models.md`](features/report-models.md). Drawn first
at [`mockups/mid-level-budget.html`](mockups/mid-level-budget.html) — **seven wording decisions
ruled by Mike**, each put to him alone, and **six differences between drawing and build** named
on the drawing itself.

**Three workbook corrections, all ruled before any maths was written**, each pinned in the
golden test beside the workbook's own cached figure and each **mutation-verified outside the
repo**. The new one: the *"4 months later"* collection slot used a relative cell reference where
its four siblings and all five creditor rows are absolute, so it collected once and was ignored
for the rest of the year — 18,750 of cash lost on the sample, with the sheet's own balance check
still reporting the profile complete.

🔴 **FOUR FAULTS WERE FOUND BY OPENING THE SCREEN, with 10,234 tests green**, and none was
visible to any assertion. One cause: it compared against an actuals side that was entirely empty.
The headline reported **in green** that the client had spent 375,950 less than budget and closed
64,040 above plan; the three subtotals gave three different answers to that same empty state; the
bank chart drew twelve zeroes as a flat line pinned to the top of its scale; and step 2's *Still
owed at year end* sat in the thirteenth column of a scrolling table and rendered as a blank row.

**Worth carrying:** Nuxt dev binds **IPv6 only** — Playwright needs `http://[::1]:3000` and
`domcontentloaded`, never `localhost` or `networkidle`, or it times out looking like a dead app.
Also: a privacy assertion on logged output must render with `util.inspect`, not `String()` —
`String({})` is `[object Object]`, so a handler logging a whole request body sails past it.

**Not actioned, not filed — both Mike's call:** the money-in chart heading reads *"budget against
actual"* when only the budget is drawn; and the `add-a-report` skill still tells sessions to
record their work in `ACTIONS.md`, frozen since 2026-08-24, which will misdirect whoever reads it
next.

**Not checked:** the Model Library shelf itself was never opened to see the new card render. The
guards prove it is openable and correctly framed; nobody has looked at it.

**Waiting on Mike, unchanged:** 4.58's OpenAI reply (letter sent 2026-09-12), 4.15's eighteen
template names, and whether the four unranked items get placed.

**DESKTOP:** none of your files were touched and 4.87 was left alone. Shared files this session
touched and has now FINISHED with: `utils/reportModelCatalogue.js`, `server/routes/report.js`,
`server/restify-server.js`, `locales/en.json`, `data/report-model-summaries.json` and the report
guards. Merge `master` in at startup once this lands. ⚠ **Your note is dated 2026-09-10 but your
branch has a commit from 2026-09-12** — that session ended without writing one.

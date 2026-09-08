# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 (fourth session) · Laptop · branch `feat/advisor-progress`

Suite **8,386 green**, lint 0, audit pass. Fourteen commits, all pushed — 42 ahead, 0 behind.
**PR #69 open.** Nothing uncommitted.

**Shipped:** **4.75 fixed** (a config key per advisor — two saving at once can no longer
overwrite each other; `saveFirmConfig` untouched). **4.65 built in two slices** — the Fixed
Asset Schedule reader and the Sell-row chooser, drawn, all six questions ruled, the drawing
approved as its own question, three deviations named at its §8. **QuickBooks and MYOB are now
`verified`.** **Six items closed** (4.75, 4.62, 4.50, 4.60, 4.65, 4.71); **four filed** (4.77,
4.78, 4.79). Eleven items → eight.

**Five things worth knowing:**

1. 🔴 **A note claiming Mike has not approved or supplied something is a CLAIM, not a fact.**
   Three were wrong today — the `clientReports.saved.*` wording (he had approved it), the
   QuickBooks/MYOB exports (he had sent them), and NZ having no first-year depreciation regime
   (Investment Boost postdates both IRD guides he supplied). Each was holding finished work
   open. **Ask him.**
2. **Storage that is per-PERSON gets a key per person**, not a map in one row — read back in
   bulk with the new `firmOverlay.loadFirmConfigsByPrefix`. Ids are capped at 64 so
   `VARCHAR(128)` cannot silently truncate two people into one row.
3. **`utils/assetBookValue.js` mirrors the engine's `excelRound`** because the engine is
   backend CommonJS and that runs in the browser; a test compares the two across 13,000 values.
   Do not "tidy" either without the other.
4. 🔴 **Laying the build beside the drawing caught a fault the code and the tests both hid** —
   the Sell row had become the only way in, which question 5 forbids. Open the artefact before
   calling a build finished.
5. **The Handbook page was republished by another session** (almost certainly the desktop) and
   Mike deferred sorting it. It does not currently show this branch.

**DESKTOP — merge `master` in first.** Shared files that moved: `server/utils/firmOverlay.js`
(one new export), `server/routes/report.js` (a schedule scan), `locales/en.json`,
`server/report/intake/supportedPackages.js`, `report-models.md`, `ARTEFACTS.md`,
`to-do-items.json`.

**Open:** **4.79** is the highest-value job available and the one I would take next — only the
first report in a workbook is read, so a real export needs splitting by hand, and it silently
disables 4.65's tie-back line. **4.72 and 4.76** both touch storage or cascade shared by all
four manager tiers, so each wants its own proposal. **4.15, 4.58, 4.66, 4.77 and 4.78 wait on
Mike**; 4.78 needs an IRD source for Investment Boost before anything is built on it.

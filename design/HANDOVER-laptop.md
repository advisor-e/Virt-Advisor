# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-13 (thirtieth session) · Laptop · branch `feat/advisor-progress`

Suite **10,507 green** (500 suites), lint 0 errors. 🔴 **MERGED TO `master` — PR #91, merge commit
`62975f65`** — on Mike's instruction at the end of the session. This branch is **level with
`master`, 0 ahead / 0 behind**; nothing is waiting here. **FIVE live items** — 4.15, 4.58, 4.86,
4.87 and the new **4.96**. **Nothing is active on this machine.**

🔴 **`v0.12.0` IS CUT AND PUSHED** — on `14546d8f`, the merge commit of
[PR #92](https://github.com/advisor-e/Virt-Advisor/pull/92), confirmed on `origin`. Ledger row
written and backfilled; notes at [`RELEASE-NOTES-v0.12.0.md`](RELEASE-NOTES-v0.12.0.md).
**92 commits since v0.11.1; 18 of 18 Model Library cards now open something.** No `npm install`,
no schema change. **Awaiting pull — telling the master team is Mike's lane.**

**Verified ON THE TAGGED COMMIT, not on a branch that resembled it:** 10,507 tests green, lint 0,
audit PASS, `nuxt build` exit 0, **the backend started and seen listening on 127.0.0.1:4000**, and
two live routes answered — `/api/report/sales-dashboard` returned the workbook's own $269,683
across 140 sales, and `/api/report/model-guide` returned 18 models. The start-and-call checks are
there because `v0.11.0` passed every other gate and would not boot.

**4.95 Sales Dashboard is BUILT AND CLOSED** on Mike's *"build sales dasboard"*. The last of the
three Model Library cards that opened nothing; all three are now live. Closure on
[`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2, the full account in
[`features/report-models.md`](features/report-models.md), and every build-vs-drawing difference
named in [`ARTEFACTS.md`](ARTEFACTS.md). Nothing about it is outstanding.

🔴 **A GUARD WAS CHECKING SIX OF THIRTEEN SCREENS.** Mike saw Stock Purchasing's header band
rendering **364px wide in a 1076px column**; it was missing the one-line margin reset that the
other twelve carry. `reportHeaderFullWidth.test.js` existed to stop exactly that and had a
hand-typed list that stopped growing after Cost of Capital. **It now reads `components/`** and
finds every screen. Fixed, mutation-verified, and the recipe and Brief both record why.
**The Sales Dashboard sat in the same blind spot** — correct by luck, not by checking.

⚠ **The shared sales reader changed and Stock Purchasing shares it.** `REQUIRED_BY_MODEL` in
`salesSheetReader.js` now holds one required-columns list per model, plus four optional cut
columns and header aliases. Stock Purchasing's list is untouched and a test pins that it still
refuses a file the Sales Dashboard accepts.

**DESKTOP:** 4.87 untouched — none of its files were opened. Shared files touched:
`server/routes/report.js`, `server/restify-server.js`, `utils/reportModelCatalogue.js`,
`locales/en.json`, `components/base/DoughnutChart.vue` (one additive prop, default unchanged),
`components/StockPurchasing.vue` (one CSS line) and four report guard tests. ⚠ **Your note is
still dated 2026-09-10 while your branch has a commit from 2026-09-12** — flagged four sessions
running.

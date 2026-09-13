# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-13 (thirtieth session) · Laptop · branch `feat/advisor-progress`

Suite **10,497 green** (500 suites), lint 0 errors, **32 ahead / 0 behind** `master`.
**FOUR live items** — 4.15, 4.58, 4.86 and 4.87. ⚠ **The work below is UNCOMMITTED as this note
is written**; nothing is safe until it is committed and pushed.

🔴 **A GUARD WITH A HAND-TYPED LIST WAS CHECKING SIX OF THIRTEEN SCREENS, AND SHIPPED THE
REGRESSION IT EXISTS TO STOP.** Mike found it by looking at the screen: **Stock Purchasing's
header band rendered 364px wide inside a 1076px column**, marooned in the middle while the step
chips and hero strip beneath it spanned the page, with a 38px gap under it where every other
report has 16px. Cause: `ReportHeader` carries `margin: 0 auto 22px`, and in a flex column an auto
side-margin beats `align-items: stretch`. **Twelve of thirteen screens carry the one-line reset;
Stock Purchasing did not.** `reportHeaderFullWidth.test.js` was written to make that line
unbreakable — but its file list stopped growing after Cost of Capital, its liveness floor asked
only for "at least five", and **`ADDING-A-REPORT.md` never told anyone to add a file to it**. It
now **reads `components/`** and finds every screen, as `reportShellFrame.test.js` reads the
catalogue. 13 screens checked, mutation-verified, and the recipe and Brief both say so. **The
Sales Dashboard sat in that same blind spot** — it happened to carry the line.

🔴 **4.95 Sales Dashboard is BUILT AND CLOSED**, on Mike's *"build sales dasboard"*. It was the
last of the three Model Library cards that said *"coming soon"* and opened nothing — all three
are now live. Closure on
[`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2; the Brief section is
[`features/report-models.md`](features/report-models.md) *"The Sales Dashboard (4.95)"*. **Opened
in a running app**, on the sample and on an imported dated file, and the build was put beside the
approved drawing with **every difference named** in [`ARTEFACTS.md`](ARTEFACTS.md).

🔴 **Three ruled deviations, none visible in the workbook's own sample** — a sale of exactly
$2,500, $2,501 or $5,000 counted in no band; a headline count reading a list 21 rows shorter than
the money does; the last salesperson's count reading the previous person's cell. Each is pinned in
the golden test **on data that shows it**, with the workbook's arithmetic reproduced beside ours.

⚠ **The shared sales reader changed, so Stock Purchasing shares it.** `REQUIRED_BY_MODEL` in
`salesSheetReader.js` now holds one required-columns list per model — Decision 9's named cost —
plus four optional cut columns and header aliases. Stock Purchasing's list is untouched and a test
pins that it still refuses a file the Sales Dashboard accepts.

⚠ **One fix outside the item's scope, and it is worth knowing:** `UNRECOGNISED_SALES` was missing
from the allowlist in `server/report/intakeError.js`, so the reader's refusal naming the missing
column was swallowed and replaced by a generic sentence — **for Stock Purchasing too**, since the
day that reader was written.

**Two things to put to Mike, neither blocking:** the *"Print for the client"* button renders
**Buefy purple**, not the drawing's blue — `is-primary` is purple on **every** shipped report
screen including Stock Purchasing's *Next*, so this screen was matched to them rather than to the
drawing, and changing it is a decision across all of them. And the mix card's lead sentence now
has three wordings, one per measure, because *"of the money"* was being said about a count of
sales.

**Waiting on Mike, unchanged:** 4.58's OpenAI reply, 4.15's eighteen template names, whether the
unranked items get placed, and the `add-a-report` skill still telling sessions to record work in
`ACTIONS.md`, frozen since 2026-08-24.

**DESKTOP:** 4.87 untouched — none of its files were opened. The shared files this session touched
are `server/routes/report.js`, `server/restify-server.js`, `utils/reportModelCatalogue.js`,
`locales/en.json`, `components/base/DoughnutChart.vue` (one additive prop, default unchanged),
`components/StockPurchasing.vue` (one CSS line) and four report guard tests. ⚠ **Your note is still dated 2026-09-10 while your branch has a commit
from 2026-09-12** — flagged four sessions running.

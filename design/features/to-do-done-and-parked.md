# To-Do — Done & Parked

> **Read [`to-do.md`](to-do.md) first.** That page is what is live. This page is what is finished
> and what is deliberately waiting, kept so that nothing is forgotten and nothing has to be
> re-derived.
>
> **Parked is not the same as forgotten.** Every item in §1 was paused by a decision, and the
> decision is recorded with it. If somebody proposes one of them as new work, the answer is here.
>
> 🔴 **And deleted is not the same as parked.** §0 below lists what was cut on 2026-08-15 for
> failing the product test. Those items are gone from the list and gone from the codebase. They are
> recorded here so nobody re-derives them, **not so they can be revived.**

---

## 0. Deleted 2026-08-15 — the audit that cut the list from 31 items to 15

Mike asked for a full review: every item checked against the code, and against whether he had ever
asked for it. His instruction: *"unless I specifically asked for it, unless it meets all my criteria
for building a better app, I want it deleted — off the list, not parked."*

**Four things the audit found, and they are the reason the rules on [`to-do.md`](to-do.md) §5
changed:**

1. **§2.7 had been built on 2026-07-29** and still read *"not to be built either way without your
   answer"*. Seventeen days. The per-question quiz record ships with no free text, enforced on the
   way in and on the way out, pinned by tests.
2. **Three items were one item.** §4.11 (reconcile the two data layers) and §5.3 (advisor profile
   off browser storage) were both §3.1 — there is no database. One blocker, written three times.
3. **Two items existed to maintain a file nobody reads.** §2.8 and §5.4 both served
   `design/STATUS.md`, a generated view of the 6,135-line `ACTIONS.md` that this very list replaced
   as the front door. Last generated 2026-08-03. **STATUS.md, `scripts/generate-status-table.js`,
   its test and the `npm run status` script are all deleted.**
4. **The whole of section 5 broke the list's own rule** — *"a warning is not an item"* — under a
   heading that admitted *"no user impact"*.

**Deleted, with the reason each failed:**

| Item | Why it went |
| --- | --- |
| 2.4 · Annual plan name | A working name already in use; nothing broken and nothing blocked |
| 2.5 · Five roll-up labels | Locale strings already on screen; nothing broken |
| 2.7 · Quiz free text | **Already built 2026-07-29** — the recommendation was implemented, not left open |
| 2.8 · STATUS.md staleness | Machinery for a stale copy of a superseded file |
| 4.3 · Point CLAUDE.md at ARTEFACTS.md | Paperwork about paperwork; serves no user |
| 4.10 · Extend the invisible mode swap | Written as *"Ruled:"* — **no record anywhere of who ruled it**, and not Mike as far as the repo shows |
| 4.11 · Reconcile the two data layers | Duplicate of 3.1 |
| 5.1 · Large components | A warning, not a task; no user impact by its own heading |
| 5.2 · Sparse doc comments | Same |
| 5.3 · Profile off browser storage | Duplicate of 3.1 |
| 5.4 · Status table "paused" marker | Went with STATUS.md |
| 5.5 · Six firm-editable blocks | A menu of possible features nobody requested. If one is wanted it is a new request |
| 2.2 · The four missing hub tabs | Deleted later the same day — see the box below, which exists so nobody re-raises it |
| 4.13 · Make a silent save failure loud | Deleted 2026-08-15 by Mike — scored 5, reaches no user; see the second box below |

### 🔴 2.2 — the four hub tabs, and why this is a DELIBERATE, RECORDED deviation

**Do not re-raise this.** The code shows fewer tabs than
[`../mockups/tier-hub-pages.html`](../mockups/tier-hub-pages.html) §2 draws — the approved table
gives the **Mentor** hub *Team Progress* and *Team Case Studies*, and the **Firm** hub *Case
Reviews* and *Logic-Lab Report*; `TAB_TIERS` in
[`../../components/FirmManagerHub.vue`](../../components/FirmManagerHub.vue) gives none of the
four — and that is a decision rather than an oversight.

**Mike's ruling, 2026-08-15, after asking what it was actually for:**

- **The mentor's two would display invented firms.** Nothing in our data records which firms belong
  to which group (§3.3), so a screen only Advisor-e staff see would show fabricated data.
- **The firm's two are new work nobody asked for.** Both routes reject the firm outright; widening
  them means re-scoping the roll-up and taking a privacy decision about a firm manager reading its
  advisers' client case reviews — for a feature that exists only because we drew it.
- **A mismatch with a drawing is not a defect.** Nothing is broken; the tabs are absent, not faulty.

**If the master team ever supplies the group membership data, the mentor's two are two lines on the
day it matters** — and they will show something real. That is the right moment, not now.

⚠ **The code comment in `TAB_TIERS` was left untouched.** Its stated reasoning is not Mike's and
runs against [`tier-cascade.md`](tier-cascade.md) **P4** (*"no per-report exceptions, ever"*). It
is recorded here rather than rewritten there. **The deviation is the record; this box is where it
lives.**

### 🔴 4.13 — a SCORE 5 that could not reach a single user

**Deleted 2026-08-15 on Mike's call**, after it had been presented to him as the highest-scoring
job on the list. What it claimed is true: with no database at all, every store falls back to a
gitignored `data/dev-*.json` file and the screen says *Saved*. But that path is reachable on a
developer machine and nothing else. **UAT has MySQL. Production has MySQL.** No adviser, no firm
and no client can reach it.

**In his words:** *"I know I'm in a development role… the UAT and production have MySQL connected —
I know this, you know this, why are we wasting time?"*

**🔴 What must NOT be revived, and what must NOT be touched.**

- The task is dead. The scored-5 framing was wrong; by the list's own table it was a **1**.
- **The v0.8.0 half is real and stays.** [`server/utils/dbFailure.js`](../../server/utils/dbFailure.js)
  stops a write that a **live MySQL refused** from reporting success. Deleting the task deletes no code.
- **The fallback itself is a feature, not a defect.** Three fixes were proposed in this conversation
  — a warning banner, blocking writes, and reworded save confirmations — and **all three were
  wrong**. Do not re-propose them.

**The lesson, and it is the same one as 2026-08-15's other two.** The item's own *Asked by* field
said ⚠ **found by us**. **The field worked; nobody read it.** A score assigned by whoever found the
thing is not a priority — it is the finder's own opinion wearing a number.

---

## 1. Parked by your own ruling — these are decisions, not tasks

*Nobody should re-raise these as open work. If circumstances change, the ruling changes first.*

**4.21 · Correct the three proven faults in the property source workbook.** 🗑 **Deleted 2026-08-17
by Mike, the same session it was filed.** In his own words: *"im not fussed about fixing the
workbook, so longs as the code is strong and backed up in github we don't need it again."*

- **What it was:** three faults proved from the cells of
  [`../report-source-models/Multiple Property Assessment.xlsx`](../report-source-models/Multiple%20Property%20Assessment.xlsx)
  and corrected in our code the same day — the interest-only balance zeroed with nothing repaying
  it, the residual repayment's flipped sign, and year 1's weekly figure returning 0 when positive.
  The item asked for the workbook itself to be corrected, under the standing rule that a proven
  source defect is fixed in the code **and** the `.xlsx` so the two cannot diverge.
- **Why it is deleted and not done:** the workbook was the *source*, and it has now been read. What
  it knew is in [`../../server/report/multiplePropertyModel.js`](../../server/report/multiplePropertyModel.js)'s
  header, in §6 of [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md), and
  in 55 golden tests that carry its cached values **with their cell references**, so any figure can
  still be checked by hand without opening it.
- 🔴 **The standing rule is not repealed.** *"Correct the code and the source"* still holds for the
  next workbook. This is one owner decision about one file whose job is finished — **not a new
  precedent that source defects may be left standing.**
- ⚠ **The workbook IS opened again, once: Phase 2 (item 4.19)** reads it for properties 2–5, the
  apportionment and the consolidated report. **Those four blocks are copies of the first, so all
  three faults are waiting there** — apply the corrections already worked out rather than
  re-deriving them. That warning now lives on 4.19 itself, where it will be read.

**2.1 · Send the master team the release number.** ⏸ Parked 2026-08-15 by Mike, from the Handbook
control. In his own words: *"we will need to issue a new release. we missed last weeks deadline and
have added new features since."*

- **What it was:** `v0.8.0` was tagged and pushed on 2026-08-14 and nobody outside was ever told.
  It had been the list's only blocker on other people for four sessions.
- **Why it is parked and not done:** announcing `v0.8.0` is now the wrong thing to announce. The
  deadline it was cut for has passed and work has landed since — three commits on the ranking
  control alone, on the day it was parked.
- 🔴 **This does not mean the release stopped mattering.** It means the *number* changed. Nothing on
  the live list covers cutting the newer release, and that gap is deliberate.
- ✅ **AND THE GAP IS NOW ANSWERED — Mike, 2026-08-15 (session 60):** *"lets sort the new release
  number when we've sorted all the tech issues, till then stay focused on the tech issues for uat
  testing."* **It is sequenced after the technical list, not waiting on him. Do not raise it again
  until the technical items on [`to-do.md`](to-do.md) are cleared.** See `to-do.md` §3.
- **Untouched and still correct:** the integration email at
  [`../MASTER-TEAM-INTEGRATION-EMAIL.md`](../MASTER-TEAM-INTEGRATION-EMAIL.md) and the load pack at
  [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md). Only the version number in them is stale. **Do not
  re-derive either.**

**Template Check queue, and the Logic Tables rewording.** Parked 2026-08-13 — sort them after
UAT testing.

**The state-management refactor.** Parked until the master app's UAT settles, then bundled with
the move off browser storage. A broad refactor under a live UAT changes the ground under the
testers for no feature gain. **The standard itself is unchanged** — this is timing only.

**The advisor-enablement distinction table.** Ruled 2026-06-22: keep the concerns separate.
Advisory Distinctions stay client-outcome only; "easier or safer for the advisor" is a separate
layer paired to Learn mode. ⚠ **Evidence is accruing that it is needed** — a live thread repeated
the exact miss it was meant to catch, recommending an advanced sales script to a low-experience,
compliance-focused advisor. Still parked, but the case is getting stronger.

**Broadening crisis detection to more advisory areas.** Build when a real session shows a missed
crisis, not preemptively.

**The primary-issue clarification.** Only a remnant remains — a clarification at recommendation
time, to be built if a real session produces a genuine fork.

**The case-study feedback loop** — real cases becoming suggested distinctions. The destination of
the whole distinctions design, deliberately out of scope for the cascade build itself.

**Splitting the course builder component**, and a percentage-display bug. Both kept in the general
tidying pile on purpose: pulling them into feature work balloons scope for little advisor-visible
gain.

**Two frameworks embedded in a prompt** could become firm-editable, or could consciously stay
locked in the prompt. Either is fine; deciding by accident is not.

---

## 2. Closed recently, with what proved it

**4.59 · A point the mentor adds tells a firm manager THEY wrote it.**
✅ Closed 2026-09-04. A firm manager who had customised nothing saw *"Added here"* against every
observation point the mentor wrote, because
[`loadResolvedObservations`](../../server/utils/meetingObservations.js) returned the layer above
untouched — and `source` is stamped by whichever level applied decisions, so the mentor's own badge
came down with the point. Fixed by restamping the inherited list from the viewer's point of view,
which is the fix [`meetingTypes.js`](../../server/utils/meetingTypes.js) already carried; found
there on 2026-09-02 and deliberately left here to keep that slice to its approved scope.

🔴 **It was worse than the mislabel, and that was not known when it was filed.**
[`FirmMeetingObservations.vue`](../../components/firm/FirmMeetingObservations.vue) reads the badge to decide
between *Switch off* and *Remove*, and to route an edit. So a firm manager was offered **Remove**
on a point they cannot remove, and both that and any edit were sent to the own-row endpoint, which
answers `404 No point of your own with that id` — a failure with nothing on screen to explain it.

⚠ **The badge also moved on unrelated edits.** The full-resolve path already stamped correctly, so
a scope deciding anything at all — switching off one shipped point — flipped the mentor's point
from *added here* to *inherited*. Proved by running the real resolver before the fix, and pinned
afterwards.

**What proves it:** two assertions in
[`tests/unit/meetingObservations.test.js`](../../tests/unit/meetingObservations.test.js) — the
mentor's added point is badged `inherited` at a firm that has decided nothing, and that badge does
not change when the firm decides something unrelated, which holds the two paths together. Suite
green at 7,768 (402 suites), lint 0 errors. Recorded in
[`meeting-review-history.md`](meeting-review-history.md) §8.

**4.63 · Overseas stock purchases — the Import & Retail model feeds the forecast.**
✅ Closed 2026-09-04. Mike's request of 2026-09-03: *"I also want you to read the 'import and
retail' excel model i loaded to see how future overseas stock purchases could be included in this
forecast"*. It has **no screen and no number of its own**, because on 2026-09-04 he merged it into
4.64 — *"you can merge the 4.63 into this task to make one clean data entry and reporting
section"* — and it was built there as **slice 2**: an upstream calculator
([`../../server/report/importShipmentModel.js`](../../server/report/importShipmentModel.js)) that
turns real orders into the months the forecast works in.

🔴 **The port reproduces his workbook, and that is the whole of what closes this.** Deposit 60%,
balance at order + 91 days, both charges pro-rated over a **360-day** year:
`43,057.20 + 653.03 interest + 1,088.39 currency = 44,798.62` — his own figure, to the cent. The
supplier terms are his (manufacture 120, balance due 91, prep 9), and they sum to the
**154 / 149 / 144 days** his sheet states for sea, air and express.

🔴 **Reading the sheet corrected the earlier summary twice, and both corrections were only
available by opening it.** The curves the supplier sheets actually consume are the **four-band**
table (each pattern totalling 100%), not the seven-band area on Index Tables. And the shipping-cost
row **cannot be reproduced from the sheet's own shipment terms in 4 of its 12 months** — April and
August missing their refrigerated surcharge, July and September charged one when marked not
refrigerated, identically on **both** supplier sheets, so a formula that did not copy rather than a
typo. Mike ruled the stated rule wins over the four figures. ⚠ **Nothing depends on that ruling
today**: the approved screen prices freight as a percentage of landed value, so container sizes and
the surcharge table never come across — only the shipping *days*, which are what turn an order date
into a landing date. It is written down so the finding is not lost.

⚠ **The 6% interest cover was REPORTED as a gap, not invented.** The first build said plainly that
his sheet charges it and the forecast did not; he then asked for it (*"can you fix the 6% interest
issue"*) and ruled where it goes. That is the reporting rule working as intended, and it is worth
recording that it did.

**What proves it:**
[`tests/unit/importShipmentModel.test.js`](../../tests/unit/importShipmentModel.test.js) — his
payment split and day counts against the workbook, the 360-day convention pinned against the 365
it could have been, and the two containers ordered eighteen days apart in one May landing in
**different months**, which is the failure band-mapping produces and his own R9 ruling forbids;
[`tests/unit/importShipmentsRoute.test.js`](../../tests/unit/importShipmentsRoute.test.js) — the
HTTP envelope, the safe failure shape, and that the route is actually registered. Suite green at
7,776 (402 suites), lint 0 errors, `npm run build` succeeds. Recorded in
[`report-models.md`](report-models.md) and on
[`../mockups/three-way-forecast-international.html`](../mockups/three-way-forecast-international.html).

**4.61 · The forecast reads one year and one file — the volatility read and the two-year trend.**
✅ Closed 2026-09-03, both phases built the same day. Mike's request: *"drop the last 2 years worth
of p&l and balance sheet so some basic trend analysis can be performed — including volatility
analysis"*. **Phase (a)** connected the files and built the volatility read: step 1 takes two
by-month exports, and step 3 lays the twelve forecast months against bands measured from the last
12–24 actual months. **Phase (b)** added the two-year trend read: six measures against last year —
sales growth, gross margin, overheads against sales, debtor days, creditor days, stock days — each
with both years, the movement and a green/amber/red band, plus the mentor's *Forecast Trend
Thresholds* tab that the bands are set on. Drawings approved before either build
([`../mockups/three-way-forecast-volatility.html`](../mockups/three-way-forecast-volatility.html),
[`../mockups/three-way-forecast-trend.html`](../mockups/three-way-forecast-trend.html)), with
seventeen rulings between them.

🔴 **The item's own premise was wrong, and finding that out was the most valuable part of the
job.** Phase (b) was filed as blocked on teaching `xeroReportParser` to read a comparative export's
second figure column as a prior period, and its `risk` named `MULTI_PERIOD_COLUMNS` — the guard
that stops a two-year export being read as one year — as the load-bearing thing not to weaken.
It needed neither. The parser already reads both reports correctly and already records each
report's own year (`yearOf`), so Mike chose **two more optional file slots** and the guard was
never approached. **The blocker had been written from the outside without reading the intake path;
one read of it removed the whole hazard.**

🔴 **One ruling was superseded within the hour, and the correction is the lesson.** Asked
"movement or level?" as an abstraction, Mike answered movement. His actual numbers — *"0-35 =
green - 36 - 45 - orange - 46 + = red"* — run continuously from zero and are a **level**; read as
a movement, 46 would have required debtor days to worsen by forty-six days in a year to turn red,
a band that could never have fired. **Ask for the numbers earlier: they carried the answer the
abstraction hid.** His figures then caught a second thing when laid against a worked example —
shared across all three day-counts they turned it red on every one, two of them for figures no
accountant would blink at, which produced the own-numbers-per-measure ruling. ⚠ **And the ten
threshold numbers were first put to him as a table of all ten at once**, which `CLAUDE.md` forbids
in terms. Asked one pair at a time they took four exchanges, he ruled every one, and twice added a
condition ("also editable") a batch would have buried.

⚠ **The Save-the-Artefact comparison earned its keep twice in two days.** On phase (a) it caught a
block telling the advisor to drop an export that was already loaded; on phase (b) it caught a rule
the build had missed — a measure that cannot be worked out must **say why**, not merely vanish.
Neither was catchable by any test in this suite.

**What proves it:** [`tests/unit/trendModel.test.js`](../../tests/unit/trendModel.test.js) — the
six measures against the drawing's own worked example (the divisor for each day-count, which is the
believable-but-wrong failure this guards), every band boundary, the refusals, **and both ends of
Mike's scale: the deteriorating example returns 1 green / 2 amber / 3 red and a healthy client
returns 6 green, which is the only thing that proves the scale is a scale rather than a screen
that is permanently red**;
[`tests/unit/forecastTrendThresholds.test.js`](../../tests/unit/forecastTrendThresholds.test.js) —
his twelve figures pinned beside the data that holds them, and the ordering rules that stop a red
less severe than its amber making amber unreachable;
[`tests/unit/threeWayForecastIntake.test.js`](../../tests/unit/threeWayForecastIntake.test.js) —
**that the forecast still opens from THIS year when last year's files are dropped first**, and
that a pair which cannot be dated apart is refused rather than ordered by upload sequence. Suite
green at 7,492 (383 suites), lint 0 errors. Recorded in
[`report-models.md`](report-models.md) and [`../ARTEFACTS.md`](../ARTEFACTS.md).

**What is NOT in this item, and is on the live list as its own:** 4.62 (economic analysis), 4.63
(the Import & Retail model), 4.64 (international vs local) and 4.65 (the Fixed Asset Schedule).

---

**4.56 · CPD follows the library in force — ruled; wire the catalogue through the cascade.** ✅
Closed 2026-09-02. Since Cascade Phase 2 the AI recommended from the library in force while
claimable CPD was still priced from the committed platform seed — advisors at a firm with its own
library were recommended one set of pages while their claimable minutes were defined by another.
🔴 **Ruled by Mike 2026-09-01: recommendations and claimable minutes must always agree.** The
catalogue now builds its index from whichever library the firm's tier chain has uploaded
(`cpdCatalogue.catalogueFor`, resolved through `templateLibrary`); both CPD routes price through
it, and `courseEffort` prices course lengths from the catalogue of the library it is given, so a
firm's course lengths and its CPD record state the same figures. **All three protections carried
over unchanged and are pinned by tests:** minutes freeze into the claim row at claim time — a
standing claim survives a library swap as history at its frozen figure — and the never-over-claim
lower-figure rule and the hidden-record rule apply to a firm's library exactly as the platform's,
because the same index build runs over it. When no tier has uploaded, behaviour is byte-for-byte
the platform seed. Recorded as P9 in [`advisor-progression.md`](advisor-progression.md). **What
proves it:** 25 new assertions across
[`tests/unit/cpdCatalogue.test.js`](../../tests/unit/cpdCatalogue.test.js) (the wholesale-replace,
hidden and collision rules over a firm library),
[`tests/unit/activity.cpd.routes.test.js`](../../tests/unit/activity.cpd.routes.test.js) (the
"library in force" block — firm minutes stored, seed-only templates refused, frozen claims) and
[`tests/unit/courseEffort.test.js`](../../tests/unit/courseEffort.test.js);
`cpdCatalogue.js` at 100% statements/functions/lines. Suite 6,635 green.

**4.55 · The firm's own template-upload screen (Cascade Phase 3).** ✅ Closed 2026-09-01,
eyeballed and approved by Mike in a production build the same day ("looks great"). The Firm
Manager Hub gained a firm-only Template Library tab (end of "Your AI coach"): the two "whose
library is in force" cards, upload with plain-English rejections, version history with Restore,
a confirm-gated **Remove upload** (Mike's yes — restore alone can never return a firm to the
platform's library; removal also clears history and the dialog says so), and a **read-only,
searchable contents table** — every template's full record, the master app's Edit Content field
set shown not editable. 🔴 **View-only by ruling** (Mike, 2026-09-01): *"view only for now with
potential to become the master doc source in future — depending on feedback from the master
coding team."* One page, not two, on his question and my recommendation. Backend gained the firm
restore route and the read-only library view route; the mentor tab's dangling "uploaded by" line
was fixed in the same change (its named residual). Artefact:
[`design/mockups/firm-template-library.html`](../mockups/firm-template-library.html), registered
in `ARTEFACTS.md`; rulings recorded in `SEARCH-CONTENT-CASCADE-PLAN.md` §7. **What proves it:**
[`tests/unit/firmTemplates.routes.test.js`](../../tests/unit/firmTemplates.routes.test.js) (firm
scoping, cache clearing, safe 500s),
[`tests/unit/firmTemplateLibrary.component.test.js`](../../tests/unit/firmTemplateLibrary.component.test.js)
(Remove never fires unconfirmed, restore sends the row id),
[`tests/unit/firmTemplateContents.component.test.js`](../../tests/unit/firmTemplateContents.component.test.js)
(search haystack, **zero buttons in the contents table** — the view-only ruling as an assertion).
Suite 6,615 green. ⚠ **Phase 4 (Advisor-e pushes the export directly) remains the master team's**,
recorded in the plan and the cascade handover doc — not this item's residual.

**4.54 · An adviser types two years of figures into the Volatility Report by hand.** ✅
Closed 2026-08-31. The accounts upload is built, and — the thing the item was actually waiting
on — it has been driven end to end through the running app with **real Xero exports**, twice.

- **Two export shapes are read, not one.** The by-month P&L (`Current financial year by month`)
  was the shape we planned for. Mike's own export turned out to be a Xero **Account Transactions**
  listing — one row per invoice, the date an Excel serial — and the reader refused it. He was
  right that the file was fine and the reader was not. It reads both now, and the transactions
  shape is the better source: it spans as many years as asked for, so **one file filled the full
  24-month window** (his did: Sep 2024 – Aug 2026) where the by-month P&L needs two.
- **The two shapes read a zero OPPOSITELY, and both readings are correct.** In a by-month P&L a
  `0` means the year has not reached that month yet — poison to the maths. In a transaction
  listing it means nothing was invoiced, which is real, and is the lumpiness this report exists to
  measure. Getting this backwards would either wreck the numbers or quietly delete the quiet
  months and flatter the business.
- 🔴 **SEVEN DEFECTS CAME OUT OF ONE REAL FILE**, and the sample data in this repo could not have
  exposed any of them — it starts on a clean month boundary, fills a window exactly, and scores in
  the red band:
  1. Widening the window **padded a client's report with workbook sample figures** while the
     sample notice switched itself off. Mike saw £125,463 of demo data as his client's best month.
  2. A file short of twelve complete months **half-filled the screen** the same way.
  3. A refused file's row said **"Reading…" for ever**, so the screen looked busy over a file it
     had already thrown out.
  4. The **Account Transactions shape** was not read at all.
  5. A **leading** part-month was never trimmed — only trailing ones were.
  6. `HeroFigure` had no **`warn`** tone, so a business in the middle band rendered its headline
     figure plain white and logged a Vue warning nobody reads. Live since the report shipped.
  7. The **Starting month picker** silently relabelled file-dated months. Mike set it to August —
     correctly, his period opens 20 August — and all 24 labels shifted back a month.
- **The rule that came out of (1) and (2), and it is now structural.** A workbook sample figure may
  only ever be on screen while the sample notice is showing. The window is backed by a 24-month
  buffer recording where each month came from, and it cannot widen over a month whose source is
  `sample`. The notice itself is now a statement about what is visible, not a flag cleared by the
  first keystroke.
- **What proves it:**
  [`tests/unit/monthlySalesIntake.test.js`](../../tests/unit/monthlySalesIntake.test.js) (60,
  both intake modules at **100%** statements/branches/functions/lines — it reads untrusted
  uploads), [`volatilityIntakeRoute.test.js`](../../tests/unit/volatilityIntakeRoute.test.js)
  (11 — auth, the count gate, parse-and-discard, and that no server path or client name survives
  into a response or a log),
  [`volatilityReport.component.test.js`](../../tests/unit/volatilityReport.component.test.js)
  (including *"THE INVARIANT: a workbook figure is never on screen without the sample notice"*),
  and [`heroFigureTone.test.js`](../../tests/unit/heroFigureTone.test.js), which drives the model
  across five volatility levels so a new band fails the test rather than silently losing its colour.
- **Approved artefact:** [`../mockups/volatility-report.html`](../mockups/volatility-report.html),
  which carries the wording Mike approved and every departure of the build from it.

**4.33 · A template's tutorial video was attached to a calculator that shares its name.** ✅
Closed 2026-08-26. The injector now recognises a calculator reference and stays quiet — the guard
needs **both** a known model name and a calculator route in the template's own block, so a genuine
template recommendation keeps its video. 🔴 **Built from the data, not from the one live pair:**
names and routes derive from `data/report-model-summaries.json` at load, so a future name clash
cannot widen the defect silently. The prompt could not have fixed it — the injector runs after
the answer is written. **What proves it:**
[`tests/unit/videoInjectorCalculator.test.js`](../../tests/unit/videoInjectorCalculator.test.js),
6 assertions, two of which pin the premise itself. ⚠ **Still open and not part of this:** the
injected sentence is hardcoded English on the backend; nobody has asked for it, so it is recorded
here rather than filed as work.

**4.47 · Learn mode asked the advisor questions their own profile already answered.** ✅ Closed
2026-08-26, commit `01e793d`. Mike caught this live on 2026-07-16; it was unchanged six weeks
later. **Two causes, both fixed** — the engine never sent the profile to Learn mode, and
`learn.txt` positively ordered the question the profile answers; fixing either alone would have
left the defect. The carve-out deliberately does **not** silence the "has this advisor read THIS
topic" question, pinned by a test that fails if a later change over-corrects. **What proves it:**
[`tests/unit/profileInstructions.test.js`](../../tests/unit/profileInstructions.test.js), 8
assertions — they pin prompt wording, the recorded exception to the house rule, because nobody in
UAT can see a system prompt, which is exactly how this shipped and survived six weeks.

**4.42 · The to-do page's hand-written half described six finished items and missed ten live
ones.** ✅ Closed 2026-08-26. Six stale detail blocks removed; four kept on purpose because they
say DONE or PARKED in their first line — the rule is **"labelled or live"**, not "live only".
🔴 **THE HALF THAT LASTS IS THE GUARD:** a block in
[`tests/unit/toDoItems.test.js`](../../tests/unit/toDoItems.test.js) fails the build when a detail
block names a ref that is neither live nor labelled — proven by planting a stale block and
watching it fail. It earned its place the same session, catching the stale block that closing
4.17 left behind.

**4.17 · A screen can show one row when 67 exist, and say nothing.** ✅ Closed 2026-08-26.
A gitignored dev file shadowed all 67 shipped distinction rows and the screen was
indistinguishable from one showing the real set — nothing was ever broken, which is what made it
expensive. **Which rows win is unchanged, deliberately.** The loader now reports WHERE the rows
came from, and the Mentor Hub tab warns only when `source === 'dev-file'` — silent in UAT and
production by construction. ⚠ **The same pattern exists in four other loaders and was not
touched** — named here rather than swept up silently; nobody has hit those. **What proves it:**
[`tests/unit/platformDistinctionsSource.test.js`](../../tests/unit/platformDistinctionsSource.test.js),
11 assertions.

**4.49 · One invented fact was found in the AI's reference material and nobody ever checked for
others.** ✅ Closed 2026-08-26. **Measured: seventeen high-risk claims, sixteen exactly right, one
drift of a single letter** — a pluralised C.P.D expansion, corrected. The A.I.D.C.R.A invention
was **isolated**, which is the answer the item existed to get; the sources were read, not assumed.
⚠ **What was NOT checked, stated plainly:** the other 177 rows carry no acronym or named framework
and were not read line-by-line — this is a sample, not a claim that every sentence is verified.
⚠ **One instrument was tried and rejected, recorded so nobody repeats it:** name-matching rows
against the source corpus flags 44 of 194 — row names are authored labels, so those flags mean
nothing. **What proves it, and what stops it recurring:**
[`tests/unit/sourcedExpansions.test.js`](../../tests/unit/sourcedExpansions.test.js) pins the
seven load-bearing expansions with the source quote beside each, nine assertions.

**4.51 · 51 of 241 logic-tree branches name no template at all.** ✅ Closed 2026-08-26, the day
it was raised — **measured, and it is not a defect.** 25 branches are legitimately empty coaching
behaviours that must not be "fixed"; the other 22 name their templates in the recommendation prose
— **item 4.15 seen through a different field, not a second problem**. 🔴 **What the measurement
did find is now recorded on 4.15:** [`walkLogicTree`](../../server/utils/logicTrees.js) reads only
`node.templates`, never the prose, so those 22 judgements reach the **adviser** and never the
**ranking engine** — resolving 4.15's sentences does not fix that unless `templates[]` is
populated as a second step. ⚠ And it cannot be done first: `validateLogicTreeReferences`
hard-fails on a name whose document does not exist.

**4.39 · Sweep the frozen `ACTIONS.md` for anything that is genuinely still open.** ✅ Closed
2026-08-26. Read end to end; **eight flags were stale — already built, still marked open — and
five were genuinely open**, each proved against the code before being filed as **4.47–4.51**. One
was folded into live item 4.33 rather than filed. ⚠ **The ratio is the finding:** eight stale
against five live, in a file whose own first page says *"Trust the CODE, not these flags."* Every
stale one was found by running a grep, not by reading the prose — the argument for the freeze, and
for checking any claim in it against the code before acting on it.

**4.43 · A test flips a global switch mid-run and fails about one run in four.** ✅ Closed
2026-08-25. Fixed by [`tests/setupEnv.js`](../../tests/setupEnv.js), registered in
`jest.config.js` — a global `afterEach` restores `NODE_ENV` after every test, captured per test
rather than per process so a file that sets it at module load is left alone. The deliberate break
that used to produce two unrelated-looking failures now reports **1 instead of 2**. **Not
claimed:** this does not make mutating a global mid-test safe.

**4.31 · An accountant can share a prompt and have it checked — and a firm can put its own
method in force.** ✅ Closed 2026-08-25; recorded in [`ai-prompts.md`](ai-prompts.md) §3a. Both
lanes shipped on the AI Prompts tab at all four tiers. **The words were approved before the
build**, saved as [`../PROMPT-CONTRIBUTION-WORDING.md`](../PROMPT-CONTRIBUTION-WORDING.md), with
two deviations from [`../mockups/prompt-contribution.html`](../mockups/prompt-contribution.html)
recorded there. What makes a firm's own prose survivable is **the fence, not detection** — every
contribution reaches the model inside `fenceUntrusted()`. 🔴 **Driving the real model found what
the suite could not:** the first live review produced suggestions an accountant could not paste;
the prompt now carries a worked contrast, pinned in one test. **What it still cannot do**,
recorded in the code and in a test: a bare personal name is not detectable — the fence is what
makes that survivable. **Not built, and ruled out rather than deferred:** file uploads.

**4.46 · The AI offers to switch guides, the advisor says yes, and nothing happens.** ✅ Closed
2026-08-25, the day after it was filed; recorded as **P10** in
[`advisory-engine.md`](advisory-engine.md). The offer lives in the **assistant's** message and the
picker read only user turns — it was never told. `offeredGuideFromLastAnswer` folds the named
guide into the picker's input, the narrow of the two options the item named. **🔴 Proved by
driving the model, not by a test:** live calls saying *"yes"* returned nothing before and
`dashboard_discussions` after — the defect had shipped with a fully green suite, exactly as
4.18's did. **The residual risk, stated:** it relies on the model reproducing the offer wording;
if a future model drifts off it, the offer silently stops working again — no worse than before.

**4.36 · The Model Guide search only matches the exact words the page happens to use.** ✅ Closed
2026-08-25; recorded in [`report-models.md`](report-models.md). **Reported by Mike, 2026-08-23:**
*"I typed 'Investing in houses' and it failed to find the property assessment model."* Words now
match separately, filler is dropped, and each model carries a `searchWords` list — the advisor's
vocabulary, not the page's. Seven ordinary queries that returned nothing now find the right model,
including Mike's own. ⚠ **It is not exhaustive, and that is deliberate:** fuzzy matching was ruled
out by the item — with ten models a confident wrong match is worse than a miss, because the
advisor takes the suggestion into a client meeting. The fix for any missed phrasing is one word on
that model's list. `searchWords` is screen-only and never reaches the AI.

**4.45 · A vague word beats an exact phrase because of where it sits in the file.** ✅ Deleted
2026-08-25, the day it was filed — **not built, and deliberately not kept.** **Mike's question,
and it was the right one:** *"if 4.18 no longer causes harm — why keep it at all?"* Once the AI
declines and names the correct guide, a misroute costs the advisor one extra turn, not an answer.
🔴 **But the question uncovered a real one, which is why it was tested rather than assumed:** the
advisor could not actually say *"yes"* to the switch offer — filed as **4.46**. Deleting 4.45 was
right; deleting it *without checking that premise* would have closed the list on a false one.
**Nothing was lost** — the measurement is in 4.18's closure and the git history of the reverted
work.

**4.25 · Nothing in this project ever checks that a screen LOOKS right.** ✅ Closed 2026-08-25 —
**found already built, and built four days earlier.** Artefact:
[`../VISUAL-CHECKS.md`](../VISUAL-CHECKS.md); built in `7fa5e9a`, 2026-08-21. 🔴 **THE ITEM WAS
STALE, NOT OPEN — the third time this has happened here:** its own text read *"Playwright … is not
in package.json and never has been"*, and it is — exact **1.34.3**, inside the Node 14.15 lock. §0
of this page warns about exactly this pattern. `npm run visual` drives **16 screens** against four
plain-English rules, and its first run found two real defects, both confirmed by eye and fixed.
**Mike, 2026-08-25: the master team runs checks before loading a version into UAT, and a fuller
set before pushing to production** — the gates exist; they are simply not ours. **The residual
worth knowing:** these run on demand, so *"the tests are green"* still does not include them. That
was a recorded decision, not an oversight.

**4.18 · The AI invents advice when it is routed to the wrong method.** ✅ Closed 2026-08-25.
Artefact: [`../LEARN-SCOPE-HONESTY.md`](../LEARN-SCOPE-HONESTY.md) (wording approved by Mike the
same day, committed *before* approval as `5776ab3`). The model was told to coach from the one
guide it holds, told to reach for nothing else, and **never given the words "I don't have that"**
— generating was the only move left open to it. `formatCoachingScopeForPrompt` now names what the
prompt holds, what it does not, and the approved refusal wording — generated from the data, so a
guide added later appears with no edit. 🔴 **Verified against the live model, because no test here
could be** — the item said so in terms: *"every automated test here passes on an answer the model
made up."* The defect reproduced with the block off; with it on, the refusal and nothing else.
🔴 **The live check caught a fault the whole suite passed over:** the first refusal named the
guide it was holding — a dead end delivered in a helpful tone, green in every assertion. **What
this deliberately does NOT fix:** the routing itself, which will always sometimes be wrong; the
honesty block covers every misroute, and the reported case's root cause was left alone on purpose
— see **4.45**.

**4.38 · How often Learning Psychology reaches the AI — now chosen, not inherited.** ✅ Closed
2026-08-25. No code change; the decision is the deliverable. It had been left off the default when
it shipped, **without anyone actually deciding** — and the advice the AI gives is shaped by
whether it can see the psychology. **Mike's ruling, 2026-08-25: leave it as it is** — the learn
path is where how people learn bears on how advice is delivered; ordinary calls carry no extra
cost. Recorded beside the guide definition in `server/utils/methodGuides.js`, so the next person
to look finds a decision rather than an arrangement.

**4.27 · The property drawing promised an override nothing builds.** ✅ Closed 2026-08-25.
Artefact: [`../mockups/multiple-property-portfolio.html`](../mockups/multiple-property-portfolio.html);
outcome recorded in §10 of [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md).
The Tax rules card promised a per-property override that no page drew and nothing built — and it
needed Mike, not a developer: building it unasked would have shipped something he never saw;
deleting it quietly would have hidden a promise he may have meant. **Mike's ruling, 2026-08-25:
strike the sentence.** The card now states outright that there is no per-property override, and
§10 carries the promise, the two cases and the ruling so a later session finds an answer instead
of re-deriving the question.

**4.37 · The five drivers were written down twice.** ✅ Closed 2026-08-25.
`server/utils/domainSupport.js` · tests in `tests/unit/domainSupportDefinitions.test.js`. Two
files defined the same five drivers in different words — even different names — and both reached
the AI on different occasions. **Mike's ruling, 2026-08-25: Learning Psychology is the source.**
Wired, not merely aligned: the row declares `definitions_from` and the block is rendered from the
guide at prompt-build time, so **there is now one copy, not two kept level by hand**. ⚠ Platform
base only, stated rather than hidden — a firm's override of the guide's wording does not thread
through yet; it waits for the day a firm actually needs it. One test pins every definition the AI
receives to the source character for character — it fails the moment either file is edited alone,
which is the drift that used to go unnoticed.

**4.44 · The check two documents promised, now written.** ✅ Closed 2026-08-25.
`scripts/check-engines.js` · `npm run check:engines` · tests in
`tests/unit/checkEngines.test.js`. `.npmrc` and 4.7's closure both pointed at an engine scan that
was not in the repository — an instruction naming a missing tool teaches readers that the
instructions are approximate. The check flags engine offenders, the packages req 2 bans by name,
and drift off the 4.41 pin. 🔴 **The target is read, never typed** — the locked runtime comes from
`package.json`'s own `engines.node`, so the check cannot drift from the lock it enforces. Not
wired into pre-commit, deliberately: `engine-strict` already hard-fails the install. Nine tests
prove it flags each fault class **and that a compliant tree reports nothing at all** — a checker
that reports green unconditionally is the fault **4.30** closed the same day. Run live:
**0 offenders across 1,982 packages**.

**4.40 · The `defu` advisory — reviewed, corrected, and accepted.** ✅ Closed 2026-08-25.
The review is in [`../SECURITY-AUDIT-NOTES.md`](../SECURITY-AUDIT-NOTES.md). The item's count was
wrong — five vulnerable copies, not four — and its *"build-time only"* was wrong: npm classifies
all five as production dependencies, so this advisory could not borrow the general Nuxt 2
acceptance. **It is still safe, for a reason nobody had written down:** all four call sites merge
our own configuration and none takes request data — the code runs; the vulnerable path does not.
The one-override fix was available and deliberately not taken, because the audit policy permits a
fix *"only for packages outside the Nuxt 2 build toolchain"*. **Mike's ruling, 2026-08-25: *"we
stick to the rules"*.** The full option is recorded in the security notes so it is not re-derived.

**4.41 · A package the Constitution bans by name, and why it cannot leave.** ✅ Closed
2026-08-25. Pinned in `package.json` overrides; the reasoning lives in `.npmrc` beside it.
`@types/node` is required by **21 transitive dependents** of Jest and webpack, each asking `*`;
npm `overrides` can change a version but cannot delete a transitive dependency, so there is no
action that takes req 2 to zero for this package. **What was done instead: a DOWNGRADE toward the
spec** — pinned from 25.9.3 to **14.18.63**, the Node 14 line, the same shape as the
`isomorphic-dompurify` 1.3.0 ruling and inside the one-directional rule. ⚠ **The residue, stated
rather than hidden:** the package is still in the tree and req 2 still names it. The item is
closed because the action space is empty, not because the package is gone. If Jest is ever
replaced, this becomes removable and should be removed.

**4.30 · The invisible-character strip ran on no path at all.** ✅ Closed 2026-08-25. Wired in
`server/utils/openaiClient.js`; tests in `tests/unit/openaiClient.test.js`. `promptSafety.stripInvisible`
shipped with its own tests, a comment vouching for it, and **zero call sites** — green,
documented, and doing nothing, because nothing anywhere asserted it was ever **called**. 🔴 **A
DELIBERATE, RECORDED DEVIATION from the item's own `touches`:** fixed at the single function every
OpenAI reply passes through rather than at six per-engine emit points — covering all seven output
paths and whatever is added next, which six edits would not. **Mike approved the deviation before
any code was written, 2026-08-25.** Five tests through the real client prove it, including a
hidden payload deliberately split across two stream chunks and a split emoji rejoined unbroken.

**4.7 · Flip engine-strict back on — the Node 14.15 lock is no longer advisory.** ✅ Closed
2026-08-24. Plan: [`../STACK-RECONCILIATION-PLAN.md`](../STACK-RECONCILIATION-PLAN.md); the
operational detail lives in [`../../.npmrc`](../../.npmrc), beside the settings it governs. His
ranking comment when it resurfaced: *"get this done, it doesn't rely on me and should never have
been parked."* `.npmrc` now carries `engine-strict=true`, so `npm install` **hard-fails** on any
package whose `engines.node` excludes the locked 14.15; overrides in `package.json` clear the
offenders, and the installed tree reports **zero engine offenders**. 🔴 **npm 8 on Node 14.15.0 is
the only combination that can install this repo** — npm 10 rejects the root's own `engines`, npm 6
ignores `overrides`; `legacy-peer-deps=true` keeps npm 8 from auto-installing the banned
`typescript` as a peer. ⚠ **Two things deliberately left open:** `@types/node` was already in the
committed lockfile — logged as its own item and closed as **4.41** — and the engine scan that
proved the zero existed only as a throwaway script, which became **4.44**, now
`npm run check:engines`.

**2.9 · Removed in full.** ✅ Built 2026-08-24, page removed 2026-08-26, and the feature
deleted outright 2026-08-27 on Mike's instruction — he never asked for it and asked four
times for it to go. Code, data, tests, wording and every note are gone. Git history holds it
if it is ever wanted. **Do not rebuild it.**

**4.53 · The AI declares what it recommended only sometimes.** ✅ Closed 2026-08-27.
The app now records, on every recommendation, whether the list came from the AI's own
declaration (`declared`) or from the prose fallback (`prose`) — a console line and a
`source` field on the decision trace. It does not try to make the AI obey; it makes the
fallback countable, so UAT can see how often it runs. `resolveRecommendedTemplatesWithSource`
in `server/utils/tierLookup.js`; 5 tests in `tests/unit/recommendedTemplates.test.js`.

**4.16 · 102 pieces of authored advice the AI never saw — the last part closed.** ✅ Closed
2026-08-23, session 82. The sweep began 2026-08-16; D was the last of its seven parts:
`data/engagement-types.json` reached no prompt and no screen, with a hardcoded paraphrase standing
in for it. **The 3 Engagement Types** is now its own page in Domain Support, editable at all four
tiers, and the client-mode prompt reads that same document through the same tier overrides —
fenced as untrusted data when any tier has reworded it. `341402f`. 🔴 **It waited seven days on a
decision that took one sentence** — *"Mike must rule where it lives"* was carried unasked through
four sessions of notes; when he was finally asked he answered immediately. **An item blocked on a
question nobody puts is not blocked; it is forgotten.** 🔴 **And this item's own record was false
while it sat there:** it said part F was not started when F had been built for six days. **The
record keeps its own account, and nothing compares it to the code.**

**4.35 · Domain support general content — the psychology under the delivery.** ✅ Raised and
closed 2026-08-23, session 82. **What he asked for:** *"the drivers of human performance, reaction
to learning and 5 steps in making a new habit — as a separate editable page — showing under the
facilitation 101 page and the engagement types pages."* Named by him the same day: **Learning
Psychology** — a third standing page in Domain Support, editable at all four tiers. 🔴 **The
content is TRANSCRIBED, not authored** — from `Productive Habits.pdf`, the master app's own
template, with tests pinning the exact source sentences so a later hand cannot quietly rewrite the
master template into something more fluent. ⚠ **The page is Learning Psychology; the record is
still `productive_habits`** — the id is the storage key a firm's saved wording is filed under, and
renaming it would orphan every override silently. The two questions it left open — where else it
reaches the AI, and the five-drivers duplication — became **4.38** and **4.37**, both since ruled.

**4.26 · The Model Library card promised one rental property, not five.** ✅ Closed
2026-08-23, session 82. Marked Done by Mike from the Handbook control;
[`../../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) now names five
properties and ten years of cash, tax and equity. 🔴 **He had marked it Done once before and it
was half right both times** — the *screen* did five properties, which is what he was looking at;
the *card* was a separate string. Show him the line, not the label. 🔴 **And the guard that
should have held it on the list failed:** `apply-to-do.js` treats `**4.26**` anywhere on this
page as a closure record, and a passing mention inside 4.19's closure matched. The check matches
a string, not a record. **Not fixed — recorded here, and it will do the same to 4.27.**

**4.34 · The Model Guide showed `[placeholders]` where the real figures belong.** ✅ Raised
AND closed 2026-08-22, session 81 — raised by Mike the evening the page shipped, fixed the
next morning. Commit `e25b80c`. **Mike's own words:** *"it makes this section worthless"*
(2026-08-22), and the next morning *"last session left the model summary without actual figures
in them which made the reading useless"*. The sentence stays the single source both readers
share; each fills the same `{named}` gaps from the same figures, computed **by calling the model
function the screen's own route calls**
([`../../server/utils/reportModelFigures.js`](../../server/utils/reportModelFigures.js); tests in
[`../../tests/unit/reportModelFigures.test.js`](../../tests/unit/reportModelFigures.test.js)).
🔴 **The item's own plan was wrong in one place, and checking it is what found it** — two readings
were computed inside `.vue` files, so they were moved into the models rather than duplicated,
approved by Mike before building. 🔴 **The fix introduced a risk that was surfaced rather than
shipped quietly:** the AI now reads real money where it read `[amount]`; Mike ruled the same day
that both headings name the figures as samples **in the same breath as the number**, and a test
fails if either loses it. ⚠ **Not verified by eye in a browser** — that gap became **4.25**.

**4.29 · The AI had never been told the report models exist.** ✅ Closed 2026-08-22,
session 80. **Mike's own words:** *"ensure that each of the performance models have a 'key
calculation output' page or section, so that the AI can read what the model serves"*, and
*"place it wherever you want, it's for AI - not the advisor or manager"* (2026-08-21).
[`../../data/report-model-summaries.json`](../../data/report-model-summaries.json) carries one
entry per live model, rendered into the client-mode prompt by
[`../../server/utils/reportModels.js`](../../server/utils/reportModels.js). 🔴 **The assertion
that matters runs the real builder and reads the real text** — a source scan proves a line
exists; only the assembled prompt proves the text reaches the model. **The guard runs BOTH ways,
deliberately:** a summary for a model with no page fails, and a live model with no summary fails.
Every model must state what it does **not** cover — a test fails an entry without it. 🔴 **NO
SCREEN is a stated exception to the 2026-08-16 hub-page rule, ruled by Mike himself:** a
description of what a calculation does is a fact about the maths, not authored advisory
judgement. 🔴 **What it did not do became item 4.32 rather than a silence** — and 4.32 closed the
same session.

**4.32 · The AI could read what the models do and was never invited to mention one.**
✅ Raised AND closed 2026-08-22, session 80 — an item rather than a quiet widening of 4.29,
because editing a mode prompt changes what a deployed screen says to real advisors. **Mike's own
words:** *"yes and both if its appropriate"* (2026-08-22). Both modes now carry the invitation
**with its brake**: only when one genuinely fits, always with its exact page path, only from the
list, never in place of a template — and the search mode's *"End there. Full stop."* rule is
untouched, asserted by test. **Verified against the running app four times**, including a
question where nothing fitted and no calculator was offered — the restraint half, which is the
one that matters. ⚠ **One attempt was reverted mid-flight:** telling the AI not to bold a model
name stripped the bold off the **template** name too, which is what `videoInjector` reads. The
underlying issue became item **4.33** — it cannot be fixed in the prompt, because the injector
runs after the AI has finished writing.

**4.28 · The AI Prompts page had an engine and no screen.** ✅ Closed 2026-08-22, session 80.
**Mike's own words:** *"I want to create a 'AI Prompts' page in the hub pages (Mentor, Global
Group Manager, Group Manager and Firm Manager) so that users have the ability to influence the
approach to formulas in the performance report models"* (2026-08-21), then *"finish 4.28 you
should have everything you need"* (2026-08-22). The tab is
[`../../components/firm/FirmAiPrompts.vue`](../../components/firm/FirmAiPrompts.vue), served by
[`../../server/routes/aiPrompts.js`](../../server/routes/aiPrompts.js), gated to all four manager
tiers — 93 tests, **and the running app was driven with Playwright at both loginable tiers**,
with the cascade exercised over real HTTP. 🔴 **The redraw is the part worth keeping.** The first
drawing was written for an engineer and Mike rejected it on sight: *"who is supposed to be
working with this page? A computer coder or an accountant …? If its the latter (and it is) then
your version risks being too complicated for them."* The security document is now **mentor-only**;
below the mentor it is four plain sentences, and no manager lost a control. 🔴 **One defect was
caught in the build:** the protection panel's fourth sentence promised something the system does
not enforce — the same fault Mike found in the two fetch-burst boxes, in prose instead of in a
control. Replaced before shipping; every line now declares the module that performs it and a test
opens that file to check.

**3.5 · Reply to Carl about `npm install`.** ✅ Closed 2026-08-21, session 78. **Mike sent it
himself.** **Mike's own words:** *"If this is important, draft the email you want me to send Carl
and I'll pass it on."* (2026-08-15) — then, on 2026-08-21: *"i already copied and sent it, i was
testing what you had at your end."* The email is
[`../RELEASE-v0.9.0-EMAIL.md`](../RELEASE-v0.9.0-EMAIL.md), every fact re-verified against the
repository before he sent it. 🔴 **Why it sat for twelve days, which is the part worth keeping:**
his instruction asked for a draft, and **the Handbook control deleted his comment on save** (see
`838f3a0`) — so no session after that one could see he had asked for anything. The item did not
wait on a decision; it waited on a sentence nobody could read. ⚠ **The reply he asked for is
still owed:** when Carl pulls, the date, environment and commit hash go in
[`../DEPLOYED-VERSIONS.md`](../DEPLOYED-VERSIONS.md).

**4.22 · Settle whether purchase costs are non-deductible in the property model's first year.**
✅ Closed 2026-08-21, session 78, **by Mike, and the item's premise was the thing that was
wrong.** **Mike's own words:** *"I thought this was settled since we created the property tax
rules inputs for a firm manager to enter based on their local tax rules. This is done."* He is
right, and it was checked rather than taken:
[`../../components/firm/FirmPropertyTaxRules.vue`](../../components/firm/FirmPropertyTaxRules.vue)
carries `yearOneAddBack` as a firm-manager field, and the model is golden-tested at all three
values. The item asked which answer is correct for New Zealand; once it is a setting, no single
answer is correct for everybody and the platform default is a starting point rather than a ruling
— nobody had noticed the item outlived its own premise. 🔴 **What it leaves behind:** the shipped
default is applied **silently**. The pattern that fixes that — a default which must announce
itself — arrived the same day in `data/ai-prompts.json` and is not yet applied to the property
model.

**4.12 · 🔒 One handover story for the master team.** ✅ Closed 2026-08-21, session 78, on Mike's
approval — **not by doing what it said.**
**Mike's own words:** *"if this is just a handover note - get it done"* (2026-08-15, and those
words were deleted by the control the same day — see `838f3a0`). The two files the item named have **never existed in this repository** — proved with
`git log --all` — and the documents the master team actually receives already describe a section
of this app. The false claim is written out of the brief it lived in
([`collaborate-data-layer.md`](collaborate-data-layer.md) §4) rather than deleted, so the next
session cannot re-derive it. 🔴 **What checking it DID find, and this is the item's real value:**
[`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) still said the newest release was `v0.8.0`, four
days after `v0.9.0` was tagged and on the same morning Mike emailed Carl to pull `v0.9.0`.
Corrected, with a standing warning that cutting a tag includes updating that page. ⚠ **The
lesson, which is not new:** an item's premise is a claim, not a status — this one was ranked
**first** for weeks and nobody had opened the two files it named.

**4.19 · Finish the property model — properties 2 to 5, the apportionment and the consolidated
report.** ✅ Closed 2026-08-21, sessions 75–76. **Mike's own words:** *"finish 4.24 then lets get
4.19 finished at last"* (2026-08-20), then *"looks great - move forward"* on the drawing and
*"i like it"* on the built screen (2026-08-21). All five build steps are done, **the drawing
before the screen** —
[`../mockups/multiple-property-portfolio.html`](../mockups/multiple-property-portfolio.html), its
six questions at §11 of [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md),
and **§10 names twelve differences between it and the build**. 🔴 **Closing it found two defects
that 5,885 passing tests could not see**, both by reading the screen's rendered words as an
adviser would; that reading step is now **P19 of [`report-models.md`](report-models.md) §5**, a
build step rather than a lucky habit. ⚠ **What did NOT come off with it:** layout verification
became item **4.25**, and two wording decisions stayed with Mike as **4.26** and **4.27**.

**4.24 · Fold the Coaching Reference into Logic Tables — Mike's Option D.** ✅ Closed 2026-08-20,
session 74. Filed on the evidence in
[`../COACHING-REFERENCE-EVIDENCE.md`](../COACHING-REFERENCE-EVIDENCE.md) and executed the next
morning. **The reading came first, which is the only reason this was safe:** all fifteen rows
were read against the tree covering the same ground before anything was touched — seven had
nothing the trees do not say better, and seven unique pieces were **moved, not deleted**, two of
them as trigger words so a client's own phrasing now *opens* the tree. Then the removal, on
Mike's instruction — *"remove the tab"*. **The promoted case observations are untouched and still
fenced.** 🔴 **The orphan row was not contentless, and finding that out took Mike producing the
source deck:** the template existed under a different name and the material was already in Domain
Support — the search that called it missing had run on the row's own stale title. **A name lookup
is not an existence check.** ⚠ **A near-miss worth keeping:** folding that row into the Heald
Matrix was proposed and would have been wrong — the Heald Matrix teaches the *Hornevian* triad
(how a person pursues what they want), Mike's deck the *Harmonic* triad (how a person copes when
they don't get it). Same source tradition, different axis; only reading the deck stopped one
framework silently replacing another. 🔴 **Its id still says `covid` and that is correct** — an
id is a storage key, assigned once and never retitled.

**4.23 · Build the Firm Manager Hub sidebar — grouped navigation, and drop the duplicate cases
tab.** ✅ Closed 2026-08-19, session 73 — designed one session, built the next. Raised by Mike
unprompted — **his own words:** *"the hub is getting overwhelming for a firm manager"* — and he
proposed the fix himself. The horizontal tab band became a grouped sidebar at all four tiers with
his four headings; **no tab body moved**, so the change was seventeen single-line swaps rather
than a rewrite, and the duplicate cases tab above the firm tier went with it. **Every difference
from the approved mockup is named** at
[`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §8. 🔴 **Closing it found two
faults nothing in 5,874 tests could have seen, and Mike found both by opening the screen** — a
*Hide list* control missing from Quizzes (his instruction: *"the one thing to make consistent
please"*), and the property tax phasing boxes showing no number because five inputs share a slot
sized for one. **Jest does not lay a page out.** 🔴 **Still open and now carried a third time:
Mike has still not sat down with the Property Tax Rules tab.** He saw enough of it to find the
phasing defect; that is not the same as reviewing it.

**4.20 · Finish Phase 1 of the property model — the screen, and the tax rules cascading from the
group.** ✅ Closed 2026-08-18, session 70. The screen shipped 2026-08-17 (`908f1b2`) with **seven
differences from the approved mockup, every one named** at
[`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md) §10; the tax rules
cascade shipped 2026-08-18 (`1feefa2`) on the existing firm-overlay mechanism, its rules recorded
in [`tier-cascade.md`](tier-cascade.md) §4 and [`firm-manager-hub.md`](firm-manager-hub.md) §4.
🔴 **What closing it found, and it is a defect rather than a flourish: the Hub tab was built with
NO approved artefact, and Mike has still not seen it.** Its wording is his rulings, so nothing on
it is invented — but the layout was never put to anyone; it was treated as plumbing attached to a
report screen. **A tab is a screen.** Recorded in full, with why a mockup drawn afterwards is not
the remedy, at §10 of the design document — **the remedy is Mike opening the tab on the running
app**, and until he does, "done" means built-and-tested, not seen. **This unblocked 4.19.**

**2.6 · `advisor_note` — one line from you.** ✅ Closed 2026-08-16, session 61. Filed as one
sentence to emit; it closed at four times that size because Mike asked a better question than the
one on the ticket: *"perhaps AI would benefit from greater context? what are the notes about WHY
I said not to spring it on somebody — what to look for etc..."* The answer was yes, **and the
notes already existed** — authored in the two reference files and loaded at no branch. 🔴 **The
filed plan would have shipped as a fix while deleting his instruction** — put through the
availability gate, all that survives of his note is one contentless sentence, and only rendering
the prompt showed it. **The artefact came first:**
[`../PF-AWARENESS-DECISION-BLOCK.md`](../PF-AWARENESS-DECISION-BLOCK.md), committed (`717706d`)
*before* Mike approved it, with four differences from it named on the artefact itself. One
judgement call was put to him — one of his own signs names a consequence rather than an
observable — and he ruled: **keep it.** A guard test asserts this branch is the **only** node in
the corpus carrying an `advisor_note`, because the note is the one field emitted past the
availability gate — a second one stops the build and gets a decision. ⚠ **Not yet watched in a
live conversation.** **This was the third instance of one defect, and 4.16 is the sweep for the
rest — the method that worked all three times: render the prompt and read it.**

**4.9 · Make the coaching reference inherit.** ✅ Closed 2026-08-15, session 60. Seven Restify
routes, a Firm Manager tab, a pure row-builder and 47 approved strings — the fifth and last block
named in the 2026-07-30 ruling to join the one firm-editable mechanism. **The artefact came
first:** [`../mockups/firm-coaching-reference.html`](../mockups/firm-coaching-reference.html),
committed (`f98b681`) *before* Mike approved it, with two deviations both named in `9cd39c9`.
🔴 **What closing it uncovered is the more valuable half:** `howItHelps` and `deliveryNotes` —
authored, stored, firm-editable — reached no prompt and no adviser screen. **Every test was
green, because every test asked whether the field was SAVED and none asked whether it was USED.**
Mike ruled both must reach the AI; they now do (`8d0ca29`), proven against the running
application. That finding is why **4.16** went on the list. ⚠ **The template picker is the one
thing left genuinely open, and it is NOT on the live list:** a firm's own entry names its
template by free text and nothing checks the name, so a typo coaches the AI toward something it
cannot find. Mike has seen the named absence on the approved mockup; **it is his to say whether
it becomes an item.**

**2.3 · Seminar's seven lines — reworded toward Public Speaking.** ✅ Closed 2026-08-15. Carried
since session 48, and it took Mike five words: **the page is called "Design & Deliver."** He gave
it the moment he was shown the seven actual sentences instead of being asked about them by label
for the fourth session running. Run through the production gate, all seven branches now pass
**intact** — seven instructions started reaching advisers. **Guarded** by
[`logicTreeRecommendationNames.test.js`](../../tests/unit/logicTreeRecommendationNames.test.js),
which runs the real gate rather than imitating it, and is mutation-verified.

🔴 **A bigger finding came out of it, and NOBODY HAS RULED ON IT.** These seven were seven of
**28 branches, out of 55, that lose text to the same gate.** The remaining **21** are advisers
not receiving instructions, for the same reason and with nobody having looked. It is deliberately
**not** filed as a to-do: nobody asked for it, and an item nobody asked for must justify itself
first. **Raise it with Mike; do not start it.**

**4.14 · The ranking control is in the Handbook.** ✅ Closed 2026-08-15 by Mike, from the control
itself — the second item ever settled that way, and the first that was settled *using the thing it
built*. All three phases shipped in one day, which is what he asked for when he said it had to be
split so it could not be lost again.

- **Phase 1** — the items became data, with a guard test on the five fields.
  [`to-do-items.json`](to-do-items.json) + [`toDoItems.test.js`](../../tests/unit/toDoItems.test.js).
- **Phase 2** — the To-Do page renders the control instead of a table, commit `7449313`. Eight
  deviations from the approved mockup, every one named before it shipped.
- **Phase 3** — `npm run to-do` generates the ranked table from the data, and
  `npm run to-do -- <file>` brings a saved list back, commit `a003c95`. It refuses to remove a
  settled item until its closure is written on this page. **This entry is that refusal working:**
  the command declined to close 4.14 until these words existed.
- **Then it was rebuilt on his instruction**, commit `41141d6`. The first version moved a row out
  from under him the moment he marked it Park and he could not find it again. His rule —
  *"nothing leaves my sight in terms of order etc until I click save"* — is now the control's
  governing constraint and is mutation-verified by test.

⚠ **What it cost, recorded honestly:** three rebuilds in one day, one defect he found in the first
minute of real use (a UTC date stamp, a day out), and one design he called *"very poor"* — the
two-button list choice, which was ours and not the mockup's. **Every one of those was found by a
person using it, not by 41 tests.**

**The three phases, and where we are:**

| Phase | What | State |
| --- | --- | --- |
| **1** | The items become data, with a guard test on the five fields | ✅ **Done 2026-08-15** — [`to-do-items.json`](to-do-items.json) + [`toDoItems.test.js`](../../tests/unit/toDoItems.test.js) |
| **2** | The Handbook's To-Do page renders the ranking control instead of prose | ✅ **Done 2026-08-15** — [`../../scripts/handbook-shell.html`](../../scripts/handbook-shell.html) |
| **3** | The Save file comes back into the data; this table is generated from it | ✅ **Done 2026-08-15** — [`../../scripts/apply-to-do.js`](../../scripts/apply-to-do.js) + [`applyToDo.test.js`](../../tests/unit/applyToDo.test.js) |

**The approved artefact is [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html)** —
Mike used it to set the current order, so it is approved by use.

### 🔴 The rule Mike gave after using it — 2026-08-15

> **"Nothing leaves my sight in terms of order etc until I click save."**

He marked the release item **Park**, and the row dropped to the bottom of the table before he could
type the reason. He could not find it again. In his words: *"the handbook is clunky and confusing —
I see the chances of a fuck-up occurring… this is very poor design."* He was right, and both faults
were ours, not the mockup's:

- **Settled rows sank to the bottom.** Taken from the mockup, where every call had already been made
  before anyone looked at the screen. In use it is exactly backwards — the moment you settle an item
  is the moment you need to write *why*, and the box has just left the screen.
- **The stale warning made him choose between two lists he could not compare.** That was our
  addition, not the mockup's. A decision with no information attached to it, where either answer
  could throw away work.

**What the control does now:** nothing moves on its own, ever — the only thing that reorders the
list is Mike pressing a sort heading, and **Back to my order** restores it in one click; choosing
Park, Done or Delete asks for the reason there and then; and the two-button choice is gone — his
copy of an item wins, nothing of his is discarded, and an item that has left the project is
reported **with his comment on it**. All pinned by mutation-verified tests. ⚠ **Dragging a row by
hand is not built, and it is not in the mockup either** — if it is wanted, it is a new decision,
not a deviation.

**4.4 · A Handbook edit survives a reload — and the ranking control works.** ✅ Closed 2026-08-15
by **Mike**, and only he could close it: this machine has no browser automation, so no session
could ever have proved it for him. He opened the To-Do page, marked the item Done, pressed **Save
the list**, and a real `to-do-items.json` arrived in Downloads — his ordering intact, his call and
his comment on the row. His comment, kept because it is the only first-hand record of the test:
*"We should be able to get this sorted straight away. Check if this works."*

⚠ **It also found a defect, in the first minute of real use.** The saved file was stamped with
yesterday's date — the control built its date from the browser's UTC clock, and Mike is twelve
hours ahead of UTC. On a project where the date on a record is what settles who decided what, that
is not cosmetic. Fixed the same day, and `tests/unit/buildHandbook.test.js` fails if `toISOString`
is ever used for it again. **Nine tests over the control could not catch this and no test could
have: it needed a person, in a timezone, pressing the button.**

---

**Completed work from before the numbering system** — the v0.8.0 load pack, the Handbook build
and rebuild, the authored-commentary-sweep deletion, the course builder, the distinctions cascade
and the rest — is moved verbatim to [`../TO-DO-ARCHIVE.md`](../TO-DO-ARCHIVE.md).

---

## 3. The pattern in all of it

Read the closed list above and one shape repeats: **almost every serious fault rendered
confidently, passed its tests, and was wrong.**

A save that reported success. A screen of zeros that meant "refused". A fake dashboard that was
more convincing than the real one. A banner that existed but in the wrong place. A locale that
silently reverted to English. A quiz override that never fired. A gate that would have switched
tabs on for a tier nobody had created yet.

None of them crashed. None of them failed a test. Every one was found by a person reading the
code.

**That is the argument for this whole set of documents** — and for the rule at the foot of the
live list: a warning written in prose is not a task, and only a task gets done.

🔴 **And the standing product test that governs it, ruled by Mike on 2026-08-15 when the
authored-commentary sweep was deleted (the full record is in
[`../TO-DO-ARCHIVE.md`](../TO-DO-ARCHIVE.md)):** *"if it doesn't serve the user, make the system
better quality or robust, improve marketability — then get it the fuck out of my app."* It is now
the standing test in [`product-principles.md`](product-principles.md).

---

## 4. Where the full record is

[`../ACTIONS.md`](../ACTIONS.md) — ⛔ **FROZEN 2026-08-24.** The historical backlog, 7,400+
lines, including the verified sweep of 2026-08-03 that first established the real number is
about ten. Nothing is added to it and nothing is triaged from it; it stays as searchable
history. ⚠ Read its own warning: *"Trust the CODE, not these flags"* — three separate items
were found already built while still flagged open. **The live list is
[`to-do-items.json`](to-do-items.json).**

[`../ACTIONS-ARCHIVE.md`](../ACTIONS-ARCHIVE.md) — completed work, verbatim, by date. Nothing is
deleted, only moved.

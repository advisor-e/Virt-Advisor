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

**4.92 — An intermittent test failure that rejected a push and blamed the wrong code.**
✅ Filed and closed 2026-09-13 on the laptop, on Mike's yes. Two dev-fallback suites
([`activityStore.devfallback`](../../tests/unit/activityStore.devfallback.test.js) and
[`activityStore.cpd.devfallback`](../../tests/unit/activityStore.cpd.devfallback.test.js)) failed
with `EPERM` during a pre-push run, blocking the 4.90 commit. They had nothing to do with it.
Score 2 — robustness; nobody sees it until it fires, and then it decides how bad the break is.

- 🔴 **WHY IT MATTERS MORE THAN ITS SIZE.** It fails *intermittently*, in the **pre-push gate**, on
  files unrelated to whatever is being pushed. The danger was never the lost minutes — it is that
  the next session reads a red gate as a real failure and either debugs the wrong code or reaches
  for `--no-verify`. A flaky gate teaches people to ignore the gate.

- **The mechanism, proved rather than guessed.** On Windows a file that has been unlinked while any
  handle is still open on it stays *delete pending*, and `readFileSync` on that path reports
  **`EPERM`, not `ENOENT`**. Both suites deleted their temp store in `beforeEach` and read it
  immediately after. [`activityStore._devReadAll`](../../server/utils/activityStore.js) treats
  anything but `ENOENT` as a real fault and **throws — correctly, and by explicit design**: its own
  comment records that a broken store must never look like a new advisor. **The store is right and
  was not touched.** Proved with a three-line probe: open a handle, unlink, read → `EPERM`.

- **Two things ruled out the obvious fixes.** `existsSync` reports **false** during that window, so
  "wait until it is really gone" cannot close the race — it exits immediately. And a delete-pending
  path refuses **writes** with `EPERM` too, so a single `unlinkSync` anywhere in a suite re-arms the
  race for whatever runs next. Both were probed, not assumed.

- **The fix.** Nothing in either suite body deletes the file any more; `beforeEach` **empties** it
  instead (`{}` is a valid empty store — `_devReadAll` defaults every array it does not find), and
  only `afterAll` deletes, when nothing reads afterwards. The two production-mode tests asserted
  `existsSync === false`; they now assert the file is still **byte-for-byte `{}`**, which is the
  same guarantee — production wrote nothing — and a stricter one, since it also proves the content
  did not change. 41 tests still pass, lint clean.

---

**4.91 — Two defects in the retirement workbook, both costing the client money.**
✅ Closed 2026-09-13 on the laptop, filed and settled the same day. Found while porting
`Exposure.Retirement.Review (1).xlsx` for 4.90, filed as its own item on the 4.89 precedent —
**an open question for Mike is an item on the list, never a line in a code comment** — and ruled
by him in three words: *"fix them both"*. Both corrections are in
[`server/report/retirementReviewModel.js`](../../server/report/retirementReviewModel.js) and
carried on every result as `workbookCorrections`, so a screen can say why its figures differ from a
spreadsheet the adviser may have open beside it.

- **The pension was counted twice over, differently.** The summary sheet took the government
  pension *after* tax (612.32 a week, `Use of Assets` N19); the twenty-year engine took it *before*
  tax (712, `Asset & Cash Transactions` G26 = `F19*52`). One workbook, two answers, **99.68 a week
  apart in year one**, and the engine's figure then compounded at CPI for twenty years — reaching
  64,921 where the taxed figure reaches 55,832. It is now taxed throughout, agreeing with the
  workbook's own summary sheet rather than contradicting it.

- 🔴 **The sixth property's whole block sat four columns out, and the client lost the house.** Its
  rows started at column K (year 5) where the other five start at column G. Three consequences from
  one slip: it earned no rent and paid no mortgage in years 1–4; its whole series ran four years
  late; and — worst — the `Value Realised` row carried the same shift, so **selling it in year 17
  read year 21, past the end of the sheet, and credited the client with nothing at all.** The
  property simply dropped out of the projection. It now pays **1,140,879**. That the author never
  intended this is provable on the same sheet: the house-asset line (G37) reaches across to `K97`
  specifically to pick the property up at year 1, and the year-1 tax rate already counted its rent.

- 🔴 **WHAT PROVED IT — the port was proved faithful BEFORE either correction was applied.** Every
  cached value on all six sheets, **all twenty years of all twelve series**, matched the workbook
  exactly; the two corrections were then applied on Mike's ruling. That ordering is the whole proof,
  because once the output differs from the spreadsheet no later comparison can establish it. It is
  preserved in two ways that still run: everything the corrections do not touch is still pinned to
  the workbook, and **the structural correction is pinned to the workbook's own numbers** — moving
  the sixth property back four columns must reproduce its cached rows 97–100 read four columns
  earlier, thirteen years of the workbook's own values, which a correction that changed anything
  else would fail. **Eight mutations were run against a copy outside the repo, including a reversion
  of each correction, and all eight were caught.**

- **What it moved.** Closing cash after twenty years **1,522,255 → 2,590,883**; years in deficit
  **13 → 14**. The two pull in opposite directions and the test says so: taxing the pension costs
  income in *every* year, recovering the property adds a little over a million at the end. Neither
  is netted off — an adviser asked why will be asked about one of them, not the average.

---

**4.88 — High Level Budget: budget against actual, the model nobody had built.**
✅ Closed 2026-09-12 on the laptop, built and walked in a running app the same day Mike asked for
it. His words: *"pick a model thats in the performance reports yet to be built"*, then
*"high level budget - lets go"*. Five of the Model Library's cards had never been built; this is
the one he chose, and it is the first model here that compares this year to **the plan** rather
than to last year.

- **What shipped.** [`server/report/highLevelBudgetModel.js`](../../server/report/highLevelBudgetModel.js)
  (all four workbook sheets), `POST /api/report/high-level-budget`,
  [`pages/high-level-budget.vue`](../../pages/high-level-budget.vue),
  [`components/HighLevelBudget.vue`](../../components/HighLevelBudget.vue), every label in
  `locales/en.json`, the catalogue card flipped to `STATUS_READY`, and entries in all four report
  guards. Suite 10,065 green, lint 0 errors. Commits `2da6144`, `e749e9f`, `81b235c`, `0fdee54`,
  `33c626c`.

- 🔴 **WHAT PROVED IT — the source workbook was wrong, and the proof is a reversal, not a claim.**
  `High Level Budget.xlsx` adds its two subtotal rows **three different ways across its three
  sheets**, and the Actuals sheet's `SUM(D20:D46)` drops **Wages (150,000 a year) and Interest Only
  Loan Payments (9,900)** from every total *including the bank balance* — so its own Reports sheet
  charts a **173,700** saving where the true variance is **13,800**, and its actual bank balance
  rises by 13,537 in a month the business paid 12,500 of wages it never counted. Mike ruled the
  correction the same day: all three sides now use the Budget sheet's full ranges. **Reverting that
  one change on a copy outside the repo reproduced the workbook's own cached values exactly —
  3025 · 36300 · 13536.95652 · 3419.565217 · 20036.95652 · 296965.2174** — which is what proves the
  port is faithful everywhere else and the only difference is the ruled one. The variance sheet was
  never affected: it already summed the wages and interest rows.

- **Four questions, each put to him on its own and each ruled as recommended**, recorded on
  [`../mockups/high-level-budget.html`](../mockups/high-level-budget.html) with the recommendation
  left in place beneath each: entry is one figure per line with a vary-by-month opener (eight of
  the nine populated lines in his own workbook are flat); a blank actual means *not yet*, never
  *nothing*, while a typed zero is a real zero; the arithmetic stays actual minus budget and the
  **colour** carries the meaning, so nothing disagrees with his own Variances sheet; and the wording
  is approved as drawn, including three spellings his workbook gets wrong (*Stationery*,
  *Accommodation*, *Principal loan repayments*).

- 🔴 **TWO FAULTS SURVIVED 10,062 PASSING TESTS AND WERE FOUND BY OPENING THE SCREEN** — the entry
  boxes rendered three times the approved width, and a zero was displayed as a signed change. **The
  second had to be found twice**, once in the headline band and again in the table underneath it on
  the next look. Neither was visible to any assertion in this suite. This is the clearest evidence
  yet for the walk in `ADDING-A-REPORT.md`; the six differences between drawing and build are named
  on the drawing and in [`report-models.md`](report-models.md) §4.

- **What is NOT outstanding, so nobody reopens it.** There is deliberately **no file intake**, and
  the accounts readers we already have must not be wired in: this is a cash budget and a Profit and
  Loss is accrual, three of its lines are balance-sheet movements absent from a P&L, and a P&L
  carries depreciation, which no cash budget should. Mike raised this himself, was shown the
  reasoning, and ruled **leave it for now**. Its two GST questions were filed as 4.89 and settled
  the same evening — see immediately below. **Nothing on 4.88 is outstanding.**

**4.89 — Two GST oddities in the High Level Budget workbook.**
✅ Closed 2026-09-12 on the laptop, filed and settled the same evening. Found while porting the
workbook for 4.88, recorded in the model's header, and filed at shutdown because **an open question
for Mike is an item on the list, never a line in a code comment** — closing 4.88 without it would
have lost both. Mike asked for them *"1 at a time"* and ruled each as recommended.

- **1 · Interest Received is OUT of the GST base.** The source's `GST Related Deposits` (row 58) is
  `D9+D11+D13` — it rightly excludes Tax Rebates and Capital Introduced, but interest is an
  **exempt financial supply** in New Zealand and bears no GST, so including it computed output tax
  on income that never carried any. **It moves no figure in the sample**, where the line is empty on
  both sides — which is the whole point: it was only ever wrong for a client who actually earns
  interest, and invisible until then.

- 🔴 **2 · The entered figures are GST-INCLUSIVE, and the GST block no longer touches the bank.**
  The source could not decide. Row 63 **extracts** GST from a figure that already contains it
  (`D58-(D58/(1+rate))`); row 69 then **adds** that same GST back on top, which is only right if the
  figure had been GST-exclusive, in which case the GST would have been `D58*rate`. Both cannot be
  true. **The withdrawals side settles it** — an owner budgeting *"Car: 500 a month"* means 500
  leaving the bank, GST and all, and nobody budgets vehicle costs excluding GST. So the extraction is
  the right formula and rows 66, 69 and 71 were counting the GST twice.

- **What it moved, and the proof.** The budgeted closing balance falls from the workbook's
  **192,426 to 151,300**, and the actual from **143,565 to 109,300** — the source overstating the
  year-end cash position by the whole net GST, **41,126, about 27%**. Every moved figure is listed
  against its cached value in the golden test, and the arithmetic is **proved rather than asserted**:
  the test checks that the gap between the workbook's closing balance and ours equals `gstHeld`
  exactly. The GST survives as a reading at the foot of the result table — *"you would be holding
  $41,126 of GST that belongs to Inland Revenue"* — and the return itself is entered as a withdrawal
  when it is paid, like any other payment. Walked in a running app the same evening.

**4.92 — A country's whole rate schedule, stored as a searchable table.**
✅ Closed 2026-09-11 on the laptop by Mike, **after the whole chain was run end to end against the
real IR265** — held open deliberately until then, because this is the feature that had been built,
tested and merged without anybody ever seeing it work.

- 🔴 **THE RUN, IN FULL.** Inland Revenue's IR265 (October 2023, 62 pages, 0.47 MB), loaded at the
  global group manager tier:

  ```
  document   "IR265 — General depreciation rates"   published 2023-10
  passes     7 planned, 7 attempted, 1 failed twice and was NAMED
  classes    2,303 kept · unresolved 2 · refusedRows 12 · outOfRange 0
  pagesUnread [{ from: 54, to: 58 }]
  ```

  **2,303 is the identical figure the discarded read produced that morning**, which is as good
  evidence as this will ever have that the page-range approach is stable rather than lucky.
- **P13 held, twice.** A pass failed on both runs, was retried once, and then recorded as unread
  while the other six survived. The rule it replaced would have thrown away all 62 pages.
- **And the gap follows the table to where it is USED**, which was Mike's condition rather than a
  detail: a firm searching the schedule is told *"page 54–58 of IR265 were not read, so a class
  printed there is missing from this list."*
- **The cascade, proved from the other end.** A firm that loaded nothing searched its group's table
  and got `originTier: global_group_manager` — his ruling of that morning, working: one person
  loads a country, everyone beneath inherits it.

  | search | matches | first result |
  |---|---|---|
  | `motor vehicle` | 4 | Motor vehicles (transporting people, up to 12 seats) — **DV 0.5** |
  | `tractor` | 15 | Lawnmowers (domestic type, lawn mowing contractors) — DV 1.0 |
  | `computer` | 29 | Grading machinery (computerised) — DV 0.25 |
  | `harvester` | 1 | Harvesters — DV 0.13 |

- 🔴 **THE FIRST ROW IS THE WHOLE POINT OF THE FEATURE.** The app ships **0.2** for vehicles; IR265
  publishes **0.5** diminishing value for a passenger vehicle. That figure was the worked example in
  this item's own text, and it is now a real row in a real table that any advisor in the group can
  find.
- **What had to be fixed first, the same day, before any of this could happen:** the country routes
  carried the dev-storage guard without the store behind it, so the first successful read was
  discarded in full after its allowance had been spent, and the schedules screen answered 500.
- ⚠ **What this closure does NOT claim:** no rate from this table has yet been pulled into a client's
  forecast, and the approval was driven through the API rather than clicked by a person. **UAT does
  that**, and by Mike's rule it does not hold the item open.

**4.78 — Depreciation rates per country: a manager uploads the source, the AI proposes, they approve.**
✅ Closed 2026-09-11 on the laptop by Mike, **on the day its central claim was demonstrated for the
first time**. Built 2026-09-08/09 in five slices; it had never once been seen doing the thing it
exists to do.

- **Why it stayed open until then:** its own note said *"no document has been read in earnest"*. Two
  real attempts that morning came back readable, correctly named and dated, and proposed **nothing**
  — the shape item 4.89's `NOTHING_READ` now refuses outright. IR265 could never prove it either:
  at 62 pages it is the one thing this reader cannot do, which is item 4.90's whole subject.
  **Proving it needed a SHORT published document, and nobody had ever tried one.**
- 🔴 **WHAT FINALLY PROVED IT, on the running app:** Inland Revenue's determination **DEP106**
  (e-scooters and e-bicycles, three pages). The reader named the document from its own title page,
  extracted `2021-03-26`, proposed **one of the six** categories with a rate, a page and a date,
  named the other five as gaps rather than guessing, and offered **six published classes** for the
  picker. `refusedRows` 0.
- 🔴 **AND THEN THE PART THAT MATTERS MOST — THE MANAGER OVERRULED THE MACHINE.** The AI matched
  `other` to *"Safety equipment (other)"*; the manager approved *"E-scooter"* instead, straight from
  the picker. The advisor-facing resolve then returned `other` at **0.5 from `firm_manager`, labelled
  E-scooter**, with the other five still `app default`. **A rate read by a model from a real
  document reached an advisor's forecast for the first time, and it was the human's choice that got
  there, not the machine's.** That is P10 working under real conditions rather than in a test.
- **It also did something right that looks like a miss:** it did NOT put e-scooters in `vehicles`.
  The prompt defines that category as *"cars, utes, vans and trucks a business owns and drives"*, so
  it declined to stretch it — FR-032 and §4's *"omit rather than stretch"* rule, holding.
- **What is deliberately not built:** the dated purchase list with the first-year deduction — that
  was item 4.77, closed separately.
- ⚠ **What this closure does NOT claim:** the approval was driven through the API as a firm manager,
  not clicked on the screen by a person, and no country has a full table approved. **UAT does that**,
  and by Mike's rule it does not hold the item open.

**4.81 — The forecast's tax rates were New Zealand's, hardcoded, for every country.**
✅ Closed 2026-09-11 on the laptop by Mike. Built in five slices on 2026-09-09, verified against
the running app the day it closed.

- **Why it mattered:** every forecast for an overseas client was wrong on tax whether or not it
  owned a single asset — **wider than the depreciation item** it was filed beside. An advisor could
  type over two of the figures but was never told they were New Zealand's, and the filing cycle
  they could not change at all, though it decides which months the money leaves the bank. The
  statements balanced perfectly, which is how it would have reached a lender.
- **Four figures, not two.** The drawing found the GST section also fixes the **filing cycle** and
  the **accounting basis**, both silently New Zealand's. **The engine's three hardcoded cycles
  became one formula**, so Australia's quarterly BAS can be expressed at all — and the 3,385 golden
  workbook cells pass unchanged.
- **What was done:** [`taxRates.js`](../../server/utils/taxRates.js) and its route, a Tax Rates tab
  at all four tiers in [`FirmTaxRates.vue`](../../components/firm/FirmTaxRates.vue), the cascade,
  and the advisor's side — a country field on the intake and a provenance badge on every figure.
  The engine's `0.28` and `0.15` are now **defaults in a defaults object**, overridden by input
  (`pick(i.gstRate, d.gstRate)`), not constants applied to everyone.
- **Mike's own words when the gap was first reported as something he had not asked for:** *"of
  course i want the tax rate made contry aware - i literally asked for that!"* He had.
- 🔴 **DELIBERATELY NOT BUILT, and this is the part not to lose: loading a tax PDF for the AI to
  read.** It was Mike's own question, and the Brief argues against it in its own words — a tax
  document publishes **four figures** where a depreciation schedule publishes about 2,800, so an
  extraction here *"saves the typing and none of the checking"*. A manager types four numbers and
  their source by hand, and checks four numbers either way. **It is genuinely open and it is Mike's
  to revive**; it is off the list so that it stops reading as owed work, not because it was
  refused. See [`tax-rates.md`](tax-rates.md) §5 and its history §5.
- **What proves it:** the golden workbook, unchanged at 3,385 cells, plus the suite. **And then the
  running app on 2026-09-11:** the manager route answers 200 at mentor, global-group and firm
  tiers, and the advisor-facing resolve returns all four figures with `originTier: null` — correctly
  labelled as app defaults on a machine where nobody has approved a table.
- ⚠ **Not yet exercised with a real APPROVED table**, so no manager-set rate has reached a forecast.
  That is UAT's, and by Mike's rule it does not hold the item open.

**4.83 — Compliance pages in the four manager hubs.**
✅ Closed 2026-09-11 on the laptop by Mike. **It was already built; the item's `waitingOn` field
said "Us" and was simply out of date** — the highest-scoring item on the list, mis-filed as open.

- **Verified part by part against the code, not against the note:** the Compliance tab at all four
  tiers in `TAB_TIERS` with Mike's own 2026-09-10 words quoted beside it and advisors excluded as
  a stated judgement ([`FirmManagerHub.vue`](../../components/FirmManagerHub.vue)); the cascade
  read-only downward, carrying his *"read and add beside — never edit, never hide"* ruling;
  [`compliance.js`](../../server/routes/compliance.js),
  [`compliance.js` (utils)](../../server/utils/compliance.js) and
  [`complianceCheck.js`](../../server/utils/complianceCheck.js);
  [`FirmCompliance.vue`](../../components/firm/FirmCompliance.vue); the declaration gate on
  [`meeting-record.vue`](../../pages/meeting-record.vue) calling `/api/compliance/gate` with
  Screen C behind it; and the Brief at [`compliance.md`](compliance.md).
- **The one thing genuinely broken was fixed the same day** — `/api/compliance` was missing from
  the Nuxt proxy list, so the gate could never answer "open" and a firm that had declared saw the
  same screen as one that had not. Commit `276738d`, and
  `tests/unit/apiProxyWiring.test.js` now fails the build if a feature ships without its entry.
- **Checked specifically, because it would have been the obvious fourth victim:** it does NOT have
  the swallowed-refusal fault closed under 4.89 the same day. `complianceCheck` uses the
  NON-streaming call, and that path throws with the API's own error body attached
  ([`openaiClient.js`](../../server/utils/openaiClient.js)), which it logs. A refusal there has
  always named its reason server-side.
- **What remains is not ours, and does not hold an item open:** no firm has ticked the declaration
  yet — each firm's manager does that once — and the feature cannot be seen on a developer machine
  because it needs MySQL, Drive and a model key.
- ⚠ **What this closure does NOT claim:** every part was verified to EXIST and the AI path to be
  sound. Each behaviour was not re-tested by hand; the suite covers them and is green.

**4.89 — A refused document could not tell a manager why.**
✅ Closed 2026-09-11 on the laptop by Mike, after the item's own stated risk happened to him in
person — *"a manager who cannot act on a refusal and re-loads the same file, paying for each
attempt"*.

- **What actually happened that day, and it is the whole closure:** the OpenAI account ran out of
  credit. The API said so plainly, on the `error` and `response.failed` events it sends when it
  refuses — `credit_balance_exhausted`, *"You have no credits remaining."* **Every consumer of a
  streamed response in this app watched for `response.completed` and ignored both**, so a refusal
  arrived as "no completed response came" and was reported as *"the reading did not finish — load
  the document again."* Mike followed that three times against an account with no money in it. An
  hour went into working out why, and nothing about the document or the code was wrong.
- **What was done:** `failureFromEvent` in
  [`openaiClient.js`](../../server/utils/openaiClient.js), used by all three readers —
  `depreciationExtract`, `countryScheduleRead` and `economicAnalysis`. A refusal is now its own
  answer with its own sentence, and the provider's reason is logged. Brief:
  [`depreciation-rates.md`](depreciation-rates.md) **P16**.
- 🔴 **Mike's decision on the half that was genuinely open — the model's own words STAY OFF THE
  SCREEN.** The item asked whether `whyUnreadable` should reach a manager. It does not, and the
  day proved why: the provider's sentence carried a billing URL. Unedited text from outside this
  app on an adviser's screen is the one thing this feature is otherwise careful never to do
  (FR-050). **What a manager needed was not the model's words but a different message per cause**,
  which is what now exists — and for a genuinely unreadable PDF his pinned sentence already says
  what to do: download it again, or load a different edition.
- **Also closed with it:** `READ_INCOMPLETE` returned above the diagnostic block in both readers,
  so the one failure that left no trace anywhere was the one nobody could diagnose. Both now log
  how far the stream got — zero events is a call that never started, many is one cut off — and the
  per-document message no longer advises a retry that cannot work.
- **What proves it:** eight tests, and then **the real thing on the running app against the
  exhausted account** — 502 `SERVICE_REFUSED` to the caller with no document row filed, and
  `code="credit_balance_exhausted"` in the log of both readers.

**4.90 — Only 250 of about 2,800 published classes are kept.**
✅ Closed 2026-09-11 on the laptop by Mike — the wrong figure corrected everywhere it was still
asserted, and **the cap deliberately left at 250**.

- **Why it mattered:** `MAX_CLASSES` is 250 and IR265 publishes about 2,800 classes across 52
  table pages, so one document's stored class list held roughly a tenth of it, with nothing on
  screen saying so — dropped classes are deliberately not counted into `refusedRows`. A manager
  whose category matched the wrong class would look for the right one in a picker that ended
  around page 5 of 52.
- **Found wider than filed:** the item's note said only the code comment still carried the wrong
  figure. **Four live copies did** — the `MAX_CLASSES` comment, a JSDoc block in
  [`DepreciationDocumentReview.vue`](../../components/firm/DepreciationDocumentReview.vue), a
  comment in `forecastCountryDepreciation.component.test.js`, and a sentence in a **different
  feature's Brief**, [`tax-rates.md`](tax-rates.md). All four now say about 2,800.
- **The one that mattered most:** the `MAX_CLASSES` comment did not merely repeat the number, it
  **used it to argue the cap was generous** — *"250 clears that with room"*. It now carries the
  true reason the number stands, so the next reader is not told the opposite of the truth.
- **Mike's ruling: the cap stays at 250.** Raising it would pretend one model answer can carry a
  whole schedule, and **4.91 proved the same week that it cannot** — the real IR265 came back
  offering nothing at all. The answer to a long schedule is the country schedule of 4.92, read a
  page range at a time, which the picker searches in full.
- **What this knowingly accepts, and it is written into the code beside the number:** a firm whose
  group has loaded **no** country schedule still gets that document's first 250 classes with
  nothing saying more exist. Loading the country schedule removes it. A second cure — a *"showing
  the first 250 of N"* notice — was **not** built, because nobody asked for one.
- **What proves it:** nothing new to prove. No behaviour changed; the suite stayed at 10,026 green.
  The claim this closes on is that the figure is now right in every live place it is asserted, and
  wrong in none — the mockup, the two history files and the ARTEFACTS row keep it deliberately,
  because they record what was drawn and said at the time.

**4.91 — A read could succeed and propose nothing at all.**
✅ Closed 2026-09-11 on the laptop — the narrow fix, chosen by Mike over porting the page-range
passes.

- **Why it mattered:** on 2026-09-11 the real IR265 came back readable, correctly named, correctly
  dated, flagging three genuine contradictions in Inland Revenue's own schedule — and offering no
  rates and no classes. `refusedRows` was 0, so nothing was rejected on our side; the model sent
  empty lists. That was stored as `pending`, which a manager reads as **"Needs your approval · 0 of
  6 categories read"** — an approval that can never be given, on a row that **could not be deleted
  either**, because only a failed row may be (4.88). None of it is visible in UAT: the screen looks
  exactly like a document waiting its turn.
- **What was done:** a fourth refusal, `NOTHING_READ`, in
  [`depreciationExtract.js`](../../server/utils/depreciationExtract.js) — refused only when the
  rates list **and** the class list are both empty — and `NOTHING_READ` added to the codes the
  route **records** rather than errors, so the document appears as a failed row a manager can
  clear. Brief: [`depreciation-rates.md`](depreciation-rates.md) **P15**. No screen change was
  needed; the banner already renders the message, and the manager's and advisor's loads share one
  handler.
- **Mike's two decisions:** the page-range passes of P13 were **not** ported to the per-document
  read — the country schedule already reads a national document at the tier P12 puts it at, with
  its own allowance, and per-document passes would spend seven or more of a firm's twenty daily
  readings on one file. And the sentence a manager sees is the country reader's own, with only the
  words that must differ changed, so one event does not get two wordings.
- **What proves it:** 11 tests, including the whole IR265 shape end to end — readable, named,
  dated, three contradictions and nothing else — now coming back refused. Both lists are tested in
  each direction: a class list with no category match still succeeds, a category match with no
  class list still succeeds, and contradictions alone do not. An unreadable document is still
  `UNREADABLE` and a foreign one still `COUNTRY_MISMATCH`, so the new check cannot swallow either.
  **Two existing tests asserted the old rule and were rewritten, not deleted** — the truth inside
  them (FR-032: no category match is a success with six gaps) survives and is still pinned.
  The diagnostic added the day before was **moved so it follows this case into the refusal**;
  logging it as a bare refusal would have discarded the one measurement that settles it.
- **What UAT still has to see:** a real document read through the fixed path. Nothing here has
  read one in earnest — that was true of the feature before this change and is unchanged by it.

**4.88 — A failed document load could never be cleared from the screen.**
✅ Closed 2026-09-11 on the laptop — proved, built, and then used on the running app the same
day. Commits `07b7ea5`, `be5c350`.

- **Why it mattered:** it was shut at both ends. The screen drew no control at all on an
  unreadable row, and the reject route refused any status but `pending`, so a hand-made request
  could not clear one either. The proposal store keeps 20 documents newest-first, so twenty
  failures push a firm's real documents off the end — and four identical failures had already
  piled up on the New Zealand screen while the IR265 read was being diagnosed. **Found wider
  than filed:** the cap is per *firm*, not per country, so New Zealand failures could drop an
  approved Australian document. The approved rates themselves were never at risk — they live in
  their own store — only the record of which document they came from.
- **What was done:** `removeDocument` in
  [`depreciationProposals.js`](../../server/utils/depreciationProposals.js), a manager-only
  `POST /api/firm-manager/depreciation-rates/documents/remove`, and a **Delete** button on an
  unreadable row alone, asking *"Delete this failed attempt? Nothing else on this screen
  changes."* Brief: [`depreciation-rates.md`](depreciation-rates.md) **P14**.
- **The guard, which is the whole point:** the route refuses every status but `unreadable`,
  checked against the **stored** record and never the request body, so which document a rate came
  from, who approved it and when cannot be erased by any request. It **deletes rather than
  marking**, because a row marked dismissed would still hold one of the twenty slots — which is
  the fault itself, not a side effect of it.
- **Mike's two decisions:** the button reads **Delete**, his own word when he raised it; and
  rejected rows were deliberately left alone, because he named failed attempts and widening it is
  his call.
- **What proves it:** 10 tests — deleting from a full list gives the oldest its place back; a
  pending, approved or rejected document cannot be deleted and nothing is written; and Delete is
  offered on a failed row and on no other, proved through the **rendered rows**, because calling
  the method would pass just as happily with the button drawn on every row. **Then the real
  thing:** the app was run and all four failed IR265 rows were cleared from the live screen, with
  both documents awaiting approval sitting beside them and untouched. That is the guard holding
  under real use, which is the check this kind of item usually leaves to UAT.

**4.82 — Nothing capped how many paid AI readings an advisor could trigger.**
✅ Closed 2026-09-11 by Mike, on the laptop — seven rulings asked one at a time, then *"yes"* to
build, *"yes"* to the commit message, *"yes"* to close. Commit `d85af67`.

- **Why it mattered:** loading a tax document sends it to the model and every reading is paid for.
  The proposal store's 20-document limit was never a cap — it trims **after** the model has been
  paid. On 2026-09-09 slice 5 of 4.78 widened loading from managers to every advisor, so an
  advisor inside a real firm could load the same PDF repeatedly and run up a bill nobody saw until
  it arrived. Filed at Mike's instruction rather than left as a warning inside 4.78's note, which
  is the shape the list refuses.
- **What was done:** 20 readings per firm in any rolling 24 hours, counted across the advisor's
  route and the manager's together, spent **one line before the model call** in `loadDocument` so
  a refusal costs nothing. The count rides the existing configuration store
  ([`aiLoadBudget.js`](../../server/utils/aiLoadBudget.js)), so a restart cannot hand a firm a
  fresh 20 and no schema change was needed. Brief:
  [`depreciation-rates.md`](depreciation-rates.md) **P11**, which holds Mike's two approved
  sentences verbatim.
- **Mike's seven rulings, asked one at a time:** per firm; twenty; one shared count for advisors
  and managers; a rolling 24 hours rather than a daily reset; the message wording; fail closed
  when the store cannot be read, with its own separate sentence; and the recommendation on where
  the count lives. **The rolling window was a recommendation against the obvious answer and he
  took it** — a fixed reset needs a clock, and midnight UTC lands at midday in New Zealand, which
  would have handed a firm 20 before lunch and 20 after.
- **Two judgements stated rather than asked, both written into the code:** a reading the model
  answers badly still spends one, because it was still paid for; and a *corrupt* counter is
  treated as no readings rather than a permanent lockout — a different case from the fail-closed
  ruling, where the store did not answer at all.
- **What proves it:** 17 tests across
  [`aiLoadBudget.test.js`](../../tests/unit/aiLoadBudget.test.js) and
  [`depreciationRates.routes.test.js`](../../tests/unit/depreciationRates.routes.test.js) — the
  20th allowed and the 21st refused **before the model is called**, a reading exactly 24 hours old
  freeing its slot while one an hour younger does not, a refusal writing nothing, aged rows
  dropped so the stored list cannot grow, and a live database *refusing* a write never mistaken
  for an absent one. Suite 9,755 green.
- **The honest limit, in the module header:** it reads then writes rather than locking a row, so
  two requests in the same instant can both see 19. The true ceiling is 20 plus whatever is in
  flight. This is a spending guard, not a security boundary, and row-locking every document load
  would buy a rounding error at the price of a new failure mode.
- ⚠ **UAT CHECK, RECORDED HERE RATHER THAN HOLDING THE ITEM OPEN:** this machine has no MySQL, so
  the counting is proved by tests and has never been watched against a real database. Someone in
  UAT loading 21 documents for one firm is what confirms it end to end.
- **Two stale comments corrected on the way past** — the route file's header claiming loading was
  manager-only and the advisor's half unbuilt, and the note in `restify-server.js` saying no rate
  limit existed. Both had been true until 2026-09-09 and said the opposite of the code by the time
  they were read.

**4.84 — Notification dots on every hub tab.**
✅ Closed 2026-09-10 by Mike, on the laptop — *"yes"* to the drawing, four rulings, *"yes"* to
build from it, then *"yes"* to close. Shipped in `v0.11.1`.

- **Why it mattered:** a manager had no way of knowing something new had arrived on a hub tab, so
  a firm never learned the mentor had published new compliance material and 4.83's notification
  did not exist. Mike asked for it in his own words — *"a red dot next to the topic"*, *"put the
  dots in the left hand menu"*, *"every tab"*.
- **What was done:** every menu entry can carry one dot — **red** for the tab's own news, **blue**
  for never opened, **orange** for not opened in 21 days — each carrying its meaning in words as
  well as colour, with a key and a count beneath the menu. Storage is one row per manager per tab
  ([`hubTabOpened.js`](../../server/utils/hubTabOpened.js),
  [`hubTabs.js`](../../server/routes/hubTabs.js)), keyed to the identity on the verified token,
  through the existing configuration table. No schema change, and nothing about a tab's contents
  is stored. Artefact: [`mockups/hub-menu-dots.html`](../mockups/hub-menu-dots.html). Brief:
  [`firm-manager-hub.md`](firm-manager-hub.md).
- **Mike's four rulings, asked one at a time and every one settled as drawn:** red beats blue beats
  orange; the blue dot says *"Never opened"*; the orange says *"Not opened in 3 weeks"*; the count
  says *"6 tabs needing a look"* — and dropping the count was offered and declined, so its presence
  is a decision.
- **One judgement stated rather than asked:** red stays a signal each tab raises for itself, and
  only Compliance raises one. *"Published since you last declared"* is a Compliance sentence;
  answering it for the other sixteen tabs would have been sixteen features nobody asked for.
- **What proves it:** 58 tests across
  [`hubTabOpened.test.js`](../../tests/unit/hubTabOpened.test.js),
  [`hubTabs.routes.test.js`](../../tests/unit/hubTabs.routes.test.js) and
  [`hubMenuDots.test.js`](../../tests/unit/hubMenuDots.test.js) — the precedence, the 21-day
  boundary either side, the identity coming from the token and not the body, and both failure
  directions. **And it was watched running** at the Mentor Hub: all three states, a dot clearing on
  open with the count dropping 18 → 17.
- **One named deviation from the drawing:** the legend and count hide entirely when nothing is
  asking for attention — a key to three colours none of which are on screen is noise, and the count
  would otherwise read *"0 tabs needing a look"*, which nobody ruled on.
- 🔴 **What looking at it found that no test did:** the menu's labels shifted sideways as dots
  appeared, because an entry without one rendered no placeholder. The drawing had already solved
  that and the build had dropped it. Fixed the same day — and it is the smaller of the two things
  running the app turned up (the other closed the backend, see `v0.11.1`).

**4.85 — One Handbook both machines update, built from master.**
✅ Closed 2026-09-10 by Mike, on the desktop — *"yes"* to the proposal, then *"yes"* to commit.

- **Why it mattered:** each machine built the Handbook from its own branch and published it to the
  one shared link, so the last to run startup silently erased the other's features. On 2026-09-10
  Mike opened a page with Depreciation Rates and Tax Rates missing entirely, and nothing said so.
- **What was done:** [`build-handbook.js`](../../scripts/build-handbook.js) reads the pages, the
  index and the live list from `origin/master`, never from the working folder, and refuses to build
  if master has not been fetched rather than falling back. One line under the title, in Mike's
  approved wording, names the master commit and how many commits each machine holds beyond it,
  from the same git counts `check:branch` prints. `--working-tree` gives a preview that says it is
  one. The Brief, the startup command and the Working Agreement each had their sentence replaced.
- **What proves it:** six checks in
  [`buildHandbook.test.js`](../../tests/unit/buildHandbook.test.js) — the hash is master's, the
  page list is master's, the per-machine counts match git, a bad ref throws. None pins wording.
  Suite 9,700 green.
- **The cost, accepted:** a feature appears on the Handbook once its pull request has landed. The
  banner shows that drift instead of hiding it.

**4.80 — "Global manager" is the old name and it is still in 45 places.**
✅ Closed 2026-09-10 by Mike, on the desktop, in one commit — `51a46a4`.

- **Why it mattered:** the role was renamed `global_group_manager` on 2026-08-11 and the short
  display name survived in 44 places, including the tier tables sessions learn the names from. It is
  the mechanism behind the coined job titles Mike has banned ten times: a shortened name in a document
  that reads as authority comes back looking correct. The guard banned only the quoted form.
- **What was done:** every site sorted by author. **27 are ours** and now read "global group
  manager" — comments and test titles in eight code files, the tier tables and diagrams in eight
  design documents, one word in the frozen `ACTIONS.md` (a name correction, not a new item), and
  four in the global-groups-membership mockup. No logic moved. **12 are Mike's own words in direct
  quotes** (2026-07-30, 2026-08-09, 2026-08-16), plus one place `CLAUDE.md` quotes an old code
  comment; all untouched. The rest name the old spelling on purpose: this item, and the guard.
- **What proves it:** [`tests/unit/tierVocabulary.test.js`](../../tests/unit/tierVocabulary.test.js)
  now bans the unquoted old name under every scanned root, with quoted spans — straight,
  curly, and the `\"…\"` a quote takes inside JSON — stripped before matching so his quotes pass
  and ours cannot. A span never crosses a blank line or 800 characters, so an unbalanced quote in
  code cannot hide an offender; a self-test proves both directions. Suite 8,802 green.
- **Flagged, not fixed:** the same mockup says no one can log in as a global group manager, which
  contradicts Mike's ruling of 2026-08-31 that they do. A separate sentence, outside this item.

**4.70 — Business Performance Report — the client's own report.**
✅ Closed 2026-09-09 by Mike — *"all good go ahead"* — after his own walk on a real client's
export, through all six steps, the AI draft on step 4, page 8 and the browser's print.

- **Why it mattered:** Mike's request of 2026-09-07, in his words in the
  [Brief](business-performance-report.md): a rich, colourful report a private business owner can
  read, 7 to 10 base pages and up to 15, built from the accounts. A client reads it on paper and
  acts on it, so every figure carries its provenance and the unruled parts show no number.
- **What was built, 2026-09-07 to 09:** six stages at `/dashboard-reports` — the ratio hub and
  its route; the eleven-page document with the eight-measure health score; the Stats NZ
  benchmarker with the finder, the size bands and the comparison on page 7; the stock export on
  step 3 and the *Stock against the accounts* page; the monthly view, the third year and the
  Sales Volatility page; the three accounts-only optional pages; and stage 6, the AI draft of the
  three next steps behind the tick that is its approval gate, page 8 printing on the server's
  record alone. Every stage was drawn first and approved under the Save-the-Artefact rule; the
  Brief §4 lists each stage's files, tests and every recorded deviation from the drawings.
- **What proves it:** the golden test on the workbook's own cells, the hand-worked page models,
  the route envelopes, the four validators on what leaves the app and what comes back from the
  model, and the component mounts — all in the Brief's per-stage rows. Then the walks: stages 1
  to 5 on reconstructed exports (2026-09-08), three live AI runs for stage 6, and **Mike's own
  walk on a real export (2026-09-09), which found five faults the suite could not see** — the
  size bands could not be ticked (`b-radio` unregistered), the advisor's strip printed on the
  client's report, the frame padding pushed every page onto two sheets, the phone breakpoint
  fired on paper and stacked every page, and a loaded report lost its size bands. All five fixed
  and proved the same day (`4a44b94`, `7c46f8a`, `8688151`); the print was then eyeballed page by
  page on A4 landscape.
- **Left open, and named:** the Brief §2's unruled parts still show no number — the two
  thresholds the score cannot band, the provisional score band cut-offs, and the tax page that
  waits on the tax tool. Each is a fresh decision for Mike, not a task here.

**4.81 — the Search-Content Cascade Plan's last phase: Advisor-e pushes the export itself.**
✅ Closed 2026-09-09, filed and built the same day on Mike's instruction — *"lets finish the
search content cascade plan"*.

- **Why it mattered:** Phases 1 to 3 of [`SEARCH-CONTENT-CASCADE-PLAN.md`](../SEARCH-CONTENT-CASCADE-PLAN.md)
  were built and live, but Phase 4 — Advisor-e posting the export straight to this app when
  Mike publishes — had no receiving end here and no line in the master-team email, so the
  download-and-upload step could never go away. Three records also still described the plan
  as unbuilt.
- **What was built:** `POST /api/integration/templates`
  (`server/routes/integrationTemplates.js`), the second doorway into the same validated
  store: same validator, same `__platform__` scope, same history, same cache clear. **It
  fails closed** — a shared secret in the backend's environment (`ADVISOR_E_PUSH_SECRET`)
  guards it, the route answers 404 while that is unset, the compare is constant-time, the
  body is read under the 10 MB upload cap and refused mid-stream, and nothing in the payload
  is logged. Platform tier only, by stated judgement (plan §9). Question 6 added to
  `MASTER-TEAM-INTEGRATION-EMAIL.md`; the cascade handover's §D and the features index
  corrected.
- **What proves it:** `tests/unit/integrationTemplates.routes.test.js` — the guard in all
  three states, the compare never throwing on a length mismatch, the cap mid-stream, every
  rejection leaving the store untouched, the platform-scope write attributed to Advisor-e,
  the dev-fallback rule on a live MySQL refusal, and a source tripwire on the mount and the
  parser skip. Route file at 100% lines and functions. **Walked live** the same day against
  the running backend and the desktop's real MySQL: 404, 401, 401, 400 and 201 in turn, and
  the mentor tab's history then showed version 1 saved by `advisor-e`.
- **Left to the master team, and named:** holding the same secret and making the call on
  publish. Nothing here waits on it; the mentor's upload tab remains the way in until then.
**4.66 — economic analysis: the forecast asks the AI for market research.**
✅ Closed 2026-09-09 on Mike's ruling. All three slices built, run live end to end, and every
question its design page ever carried is settled.

- **Why it mattered:** Mike's request of 2026-09-03 — a tick charging the AI to research global
  and local markets, *"since the majority of 3 way forecasts are used to support funding
  requests"*. It is the **first report model in this app to call the AI at all.**
- **The risk it was filed against, and what holds it:** AI text going into a document a bank
  reads, where a confident wrong claim about a market looks exactly like research. Three things
  hold it — **the citation guard**, which refuses an unsourced figure; **`isApproved`**, without
  which the pack does not print, so research nobody accepted cannot reach a lender; and the
  **privacy ruling of 2026-09-06** — the advisor writes the brief and sees the exact words sent,
  the app volunteers nothing about the client, so no PII exception was needed. A test also pins
  that `buildInputs()` sends amounts only, so a client's own account names cannot ride along.
- **What proves it:** five test files, and — more to the point — **a browser run end to end on
  2026-09-07**: brief, research, approval, printed pack.
- 🔴 **Nine live faults came out of running it, and the green suite had caught none of them.**
  The citation guard was refusing **half of all runs** by reading the digits in a web address as
  figures; the research date was missing from the client's pack entirely; and the date sent was
  UTC. All fixed. **The advisor now sets the assessment date on a field of its own** — Mike's
  ruling, both wordings his. Recorded in full in
  [`../ECONOMIC-ANALYSIS-PROMPT.md`](../ECONOMIC-ANALYSIS-PROMPT.md) §7b and
  [`../ECONOMIC-ANALYSIS-TEST-RUNS.md`](../ECONOMIC-ANALYSIS-TEST-RUNS.md).
- **What was left, and why it is not an item:** Mike said when he asked for it that he would
  *"give detailed instructions and prompt in future"*. **The prompt lives on the AI Prompts page**,
  where he or a firm manager reads and edits it, so refining it is a change made on a screen —
  never a build. It needs no open row to happen.

⚠ **The lesson that generalises: a suite of thousands green is not evidence that a feature
works.** Nine faults survived it and the first browser run found all nine. Every AI-calling
feature after this one gets watched in a browser before it is called done.

---

**4.77 — first-year depreciation cannot differ from later years, or between two vehicles.**
✅ Closed 2026-09-09 into **4.78**, on Mike's ruling. ⚠ **Closed, not built** — the work is real
and outstanding; it is now one item rather than two.

- **Why it mattered, in Mike's own costing:** the engine applies one rate to a whole category
  for every month, so a new asset cannot be written down faster in its first year than the old
  one beside it. Against New Zealand's **Investment Boost** (20% of a new asset's cost deducted
  up front, the rest depreciated as normal, from 22 May 2025), an **$800,000 tractor unit**
  deducts **146,118** in year one as the engine models it, against **276,895** with the boost —
  **36,617 of tax in year one and 130,776 of asset value carried into year two.** A forecast a
  lender reads would be wrong, and would balance perfectly.
- **Why it closed here:** its asset model *is* 4.78's. The dated purchase list and the
  first-year rule were drawn, ruled and specified as part of 4.78 on 2026-09-09, and both sit on
  that item's outstanding list. Two items pointing at one build is how 4.54 came to be built on
  both machines in one week.
- **Where the work now lives:** [`depreciation-rates.md`](depreciation-rates.md) §3 (the dated
  purchase list, and why the engine's input shape does not change) and
  [`depreciation-rates-history.md`](depreciation-rates-history.md) §1, which records that this
  item is where the whole feature started.
- **What was NOT settled by closing it:** the UK and Australia were never checked for an
  equivalent scheme. That is a question for whoever loads those countries' schedules, not a
  task here.

⚠ **A session got this wrong once, and the correction is the useful part.** On 2026-09-08 it was
reported that New Zealand had abolished first-year acceleration — reading the 2010 end of the
20% *loading* as the end of all such rules. Mike corrected it. **The two are different
mechanisms:** the loading inflated a rate; Investment Boost deducts a slice of cost.

---

**4.79 — only the first report in a workbook was read, so a real export was refused.**
✅ Closed 2026-09-08, the day it was found, built and proved on Mike's own exports.

- **Why it mattered:** the readers returned the first recognised report in a workbook and stopped.
  Real MYOB and QuickBooks exports are **one workbook holding a Profit and Loss, a Balance Sheet
  and an asset register**, P&L first — so the Balance Sheet, the one *required* report, was never
  seen. All three intake screens were wrong, each differently: the forecast refused the drop
  **asking for a Balance Sheet the file contained**; Quick Position ticked the P&L zone, left the
  Balance Sheet unread and disabled Continue **saying nothing**; EBITDA failed the whole upload
  when the Balance Sheet came first.
- **What fixed it:** one reader, `reportsFromBuffer`, walks every sheet; `parseAnnualReports` and
  `parseForecastReports` return **every** report, and each caller takes what its screen needs —
  the forecast and Quick Position both, EBITDA the P&L wherever it sits. Nothing takes "the first"
  any more. Quick Position's screen already routed by kind, so one drop now fills both zones and
  **no screen was redesigned**. EBITDA's loud `WRONG_REPORT_KIND` refusal is unchanged; only its
  trigger is right. Commit `5628a43`.
- **What proves it:** five test files, plus Mike's two real workbooks run through the shipped
  reader on the day it closed. Both are three-sheet workbooks; both now return **two reports
  each** — P&L (sales 481,800 · cost of sales 102,700 · operating expenses 266,350) and Balance
  Sheet (cash 89,500 · debtors 34,200 · stock 45,800 · creditors 22,400 · wages due 6,500), with
  the forecast's opening position reading 10 figures and three asset categories. Identical from
  MYOB and from QuickBooks.
- **What was left:** the on-screen look, and **it is UAT's** — Mike's ruling, 2026-09-08, the same
  call he made on 4.65 (`8425a1a`). The reader is the half that could be wrong and it has now been
  run against the real files; watching three screens fill in is what a human tester does better.

🔴 **IT WAS FOUND ONLY BECAUSE REAL FILES WERE USED.** It surfaced while building 4.65 slice 1,
when a test written for the asset schedule failed on the balance sheet. **Every existing test used
one report per file** — which is how Xero exports, and is not how MYOB or QuickBooks do. A suite of
thousands was green throughout.

⚠ **A guard was deleted rather than left unreachable.** A file-count check in the assembler counted
*reports* while the route counts *files*; once a workbook could contribute several, it could never
fire. Dead code that reads as protection is worse than no code.

⚠ **Slice 2 was almost parked as a decision for Mike.** Reading the two screens showed there was no
decision to take — and that Quick Position failed **silently** where the forecast at least failed
loudly. Read the screens before assuming a question exists.

---

**4.72 — a removed observation point's id was handed to the next one added.**
✅ Closed 2026-09-08, the day after it was filed, on Mike's instruction to fix it.

- **Why it mattered:** `nextOwnPointId` counted only the ids a scope currently held, so removing
  the **highest** handed it straight back. A reused id matches the removed point in any coaching
  report already stored against it — a report about a point the firm no longer checks, reading as
  one about the point just written — and arrives already set aside for every advisor who had
  declined the old one. **Nothing on any screen looks wrong.**
- **What fixed it:** a stored high-water mark read alongside the live rows, ported up from
  `meetingObservationsAdvisor.nextAdvisorPointId`, in a fourth config key. Existing storage is
  untouched and a missing mark degrades to the old behaviour. 🔴 **The mark is saved BEFORE the
  point:** two keys cannot be written atomically, so the order decides what a half-completed write
  leaves behind — mark-first can only skip an id, point-first would reissue the one just used.
- **What proves it:** 12 new tests at util and route level, **mutation-verified** — three fail
  with the mark ignored. Commit `bf391bc`; suite 8,405 green at the time.
- **What was left:** nothing. Watching it in a browser proves nothing here — the fault was never
  visible on any screen, which is the whole reason it survived.

🔴 **THE SAME FAULT WAS IN ITS TWIN, and it was not on the item.** `meetingTypes.nextOwnTypeId`
was the same function with a different noun, carrying the same false claim in its own JSDoc.
Worse there: a reused **type** id pulls every meeting already recorded against a removed type
under the new one. Found while proving this one, fixed in the same commit.

⚠ **Why the old test was green.** It deleted a **middle** id, which counting the live rows
handled correctly. Only deleting the highest exposes it — the same lesson the advisor level
learned a day earlier, where a route test caught what the util test could not.

⚠ **The item's second consequence needed nothing of its own.** An advisor's stale decline
delivering a brand-new point already set aside was a symptom of the reuse, closed by closing it.

---

**4.76 — a middle tier's rewording was badged as Advisor-e's.**
✅ Closed 2026-09-08, the day after it was filed, on Mike's instruction to fix it.

- **Why it mattered:** when a global group manager or a group manager reworded a platform point,
  the advisor was told **Advisor-e** wrote it. Two facts conspire: the point keeps its `mo-` id
  because identity is never editable, and every level restamps `source` relative to the viewer
  (item 4.59), so it arrives at the firm marked `inherited`. The badge exists to send an advisor
  to whoever can answer for the wording; it sent them to the one group who cannot.
- **What fixed it:** the tier that last changed a point is now carried down the cascade, and
  `sourceTierOf` reads it first — then the firm's badge, then the id prefix, each covering what
  the next cannot. Any tier below the mentor reads as *"From your firm"*, per Mike's ruling of
  2026-09-08.
- **What proves it:** 9 new tests, including a real four-tier chain, **mutation-verified on both
  halves** — three fail with the mark unread, five with the stamping removed. Commit `230b217`;
  suite 8,415 green at the time.
- **What was left:** nothing built. The badge is visible on screen but reproducing it needs the
  dev middle-tier scopes, so it has not been watched in a browser.

🔴 **IT COST LESS THAN THE ITEM PREDICTED, and that is worth recording.** The item's `touches`
named `resolveInheritedRows.js` — the mechanism domain support, quizzes, the staircase and the
distinctions all resolve through — and warned this was "NOT THE SMALL FIX IT LOOKS". Reading the
code showed the information is not lost in the shared helper at all: it is lost in the
**recursion**, which lives in `loadResolvedObservations`. Carrying it there left every other
block untouched. **A cost estimate written when an item is filed is a guess; read the code before
believing it.**

---

**4.65 — the book value of one asset was typed, because no screen asked for the asset schedule.**
✅ Closed 2026-09-08, the day it was drawn, ruled, approved and built.

- **Why it mattered:** selling an asset needs its price and its book value, and the difference
  between them is profit that month. The app holds six category totals and never an individual
  asset, so the advisor typed a figure nothing could check. **A wrong book value is not a
  visible mistake:** it moves the gain, which moves the tax, retained earnings and closing cash
  — and every one of those still balances.
- **What unblocked it:** the files it had waited on since 2026-09-03 had already arrived. Both
  exports that closed item 4.60 on 2026-09-07 carry an asset schedule.
- **What proves it:** the reader takes **eleven assets from each of Mike's two real exports**,
  and was watched doing it **through the running route**, not only in tests — company, date,
  groups, book values and the tie-back all came back correctly. Drawing:
  [`../mockups/three-way-forecast-asset-schedule.html`](../mockups/three-way-forecast-asset-schedule.html),
  approved as its own question after all six of its questions were ruled. Commits `bf22877`
  (the reader) and `1377d76` (the screen); suite 8,406 green.
- **What was left:** watching the finished screen in a browser. Mike had no spare Balance Sheet
  to hand and ruled it **UAT's**, under his own rule of the same morning.

🔴 **THE SCHEDULE SEEDS NOTHING, and that is the whole shape of the feature.** Measured on
both real exports, neither ties to its own balance sheet — 145,300 against 128,775.83 and
125,300. An asset register is a sub-ledger. Had it been allowed to seed the six categories it
would have understated fixed assets by 16,524 and charged too little depreciation all year, and
the forecast would still have balanced. The Balance Sheet remains the opening position.

⚠ **Two things running the real files found that no drawing could.** Mike's QuickBooks export
**does not tie to itself** — its totals line understates accumulated depreciation by 525 —
which the reader's own cross-check caught on its first real run. And **item 4.79** was filed: only
the first report in a workbook is read, so a real export still needs splitting by hand. The two
compound — without a Balance Sheet the tie-back line cannot appear at all.

⚠ **Three named deviations from the drawing**, recorded at its §8: the book value is
**30,459 not 30,458.75** (the engine rounds to whole units, and a test now compares the two
rounding functions across 13,000 values); the tie-back sits on **step 2**; and it is a **plain
note, not a warning colour**, because both real exports fail to tie.

🔴 **And laying the build beside the drawing caught a real fault** — the first Sell row
made the schedule the ONLY way in, which question 5 forbids. Invisible in the code and in the
tests; visible the moment the two were compared. That is the artefact rule earning its keep.

---

**4.71 — quick-fire forecast: three years from percentages, not twelve months typed.**
✅ Closed 2026-09-08. Built and approved 2026-09-07; nothing was outstanding.

- **Why it mattered:** Mike asked where growth, cost-increase and margin percentages for years
  1, 2 and 3 were entered. Nowhere — step 4's sliders did three of those for one year only.
- **What proves it:** both slices built, all seven questions ruled, `utils/quickFireForecast.js`
  with the year control and grid on the intake, `yearCount` reaching the engine, and
  `tests/unit/threeWayForecastYearCount.test.js` — 39 tests. **Checked against the code on
  closing rather than taken from the note**, after two notes proved wrong earlier the same day.
- **Mike's first ruling REPLACED the recommendation:** the advisor chooses 1, 2 or 3 years, on
  step 3, and **the count reaches the engine**. Computing three years and showing fewer would
  have reported a three-year revenue and a low point in a year nobody asked for — both
  perfectly plausible on screen. A new forecast opens at **one** year, which preserves the
  existing screen exactly.

---

**4.60 — QuickBooks and MYOB were supported on paper, not against a real file.**
✅ Closed 2026-09-08, on Mike's correction that the exports had been supplied the day before.

- **Why it mattered:** the app named both packages as readable while neither had been read from
  a file the software actually produced — and a wrong figure off a real chart of accounts looks
  exactly like a right one.
- **What proves it:** **real exports supplied by Mike 2026-09-07** —
  `QuickBooks_Online_Financial_Exports.xlsx` and `MYOB_Financial_Exports.xlsx`, three reports
  each (P&L, Balance Sheet, and an asset schedule) for Apex Auto & Engineering Ltd. Both are now
  `confidence: 'verified'` in
  [`supportedPackages.js`](../../server/report/intake/supportedPackages.js), each evidence line
  naming the file. **Every package the app claims to read has now been read.**
- **What the MYOB file cost, and why that is the proof:** it broke the reader **four separate
  ways** — its `Account No.` column made every label arrive as an account code so the balance
  sheet parsed to *no figures at all* with no error; cash read 64,500 of a real 89,500; the
  `"January 2025 through December 2025"` period line gave the P&L no date and no year; and
  `"Property, Plant & Equipment"` passed no fixed-asset test, so 145,300 was swept into current
  assets — the balance sheet still tied, so nothing complained, and the forecast opened every
  asset at zero and charged no depreciation. All four fixed and pinned.

🔴 **The record called these reconstructions for a day, and the reasoning was wrong.** Both
workbooks describe the same fictional company with the same figures — which is what testing two
packages honestly looks like, the same business entered in both, and says nothing about which
software produced the file. **A parser reads layout; figures cannot tell you anything about it.**
The proof was already in hand and was being reported as a doubt: *a reconstruction reflects what
its author expected and cannot surprise you four times.* Corrected in four places on Mike's word.

---

**4.62 — saved reports per client, so a client can edit what the advisor opened.**
✅ Closed 2026-09-08 on Mike's ruling, under the same rule that closed 4.75 and 4.50.

- **Why it mattered:** his request of 2026-09-03 — once an advisor opens a model to a client,
  the client edits it and *"any changes are made clear they are edited by the client"*.
- **What proves it:** **all twelve routed screens save per client**, the forecast last on
  2026-09-05 under his ruling *"anything an advisor can edit, the client can edit"* — its saved
  row is the whole intake plus the four levers, with only the file upload staying the advisor's.
  Badge, banner and Restore are what stop a client's figure passing as the advisor's. How each
  screen behaves is in [`business-entity-reports.md`](business-entity-reports.md) §5.
- **What was left:** a save reaching the real store, which needs the client picker, which needs
  MySQL. **UAT's to exercise, not ours** — the rule below.

🔴 **The record was WRONG about this item and nearly cost it another cycle.** Both the live list
and the Brief said the wording (`clientReports.saved.*` — nineteen strings a client reads) was
*"proposed, not ruled"*. **Mike had checked and approved it.** A session on 2026-09-08 was about
to hold the item open on that sentence alone. Corrected in both places on his word. **A stale
sentence in a Brief is not inert — it manufactures work that was already settled**, which is the
same family as the `ACTIONS.md` line that produced a fortnight of unwanted building.

---

**4.50 — nobody has seen a real conversation's recommendations reach the Team tab.**
✅ Closed 2026-09-08 on Mike's ruling: *"we're not responsible for running tests we can't run."*

- **Why it mattered:** the AI's recommendations are held back from the stream and written to the
  Team tab, and that last write had never been watched after a real conversation.
- **What proves it:** **the item never had any code of ours in it** — its own `touches` field
  said *"Nothing — a live observation, not a code change."* The write path is built and reads
  back: `activityLogger.logVASession` stores `templates` and derives `tier` from them at write
  time, and `/api/activity/team` reads both. Checks (a) and (b) ran live on 2026-08-26 and
  passed.
- **What was left:** check (c) — open the Team tab as a firm manager after a real session and
  compare its templates and tier against the conversation. **A two-minute look in UAT.** On a
  developer machine the activity store falls back to a dev file and the write does not happen at
  all, so it was never performable here.

⚠ **This is the item that produced the rule.** It sat open on a check nobody on this side could
ever run. The list is what is *outstanding for us*; a verification belonging to UAT is recorded
in its closure and the item is closed.

---

**4.75 — two advisors saving at once, and one loses their work.**
✅ Closed 2026-09-08, the day it was filed, on Mike's ruling: *"if we've done all our part then
mark it completed — we're not responsible for running tests we can't run"*.

- **Why it mattered:** every advisor in a firm read the same config row, changed their own
  entry and wrote the whole row back, with no compare-and-set beneath it. Two saving inside
  the same read-modify-write meant the second wrote a copy that never held the first's change.
  **Both were answered 200**, and nothing on any screen would ever have shown the loss — the
  advisor's list is what the coaching report is written from.
- **What we would have lost:** silent data loss of a named person's work, scored 5. It is the
  shape of fault UAT cannot find: nothing looks wrong to either advisor, and the damage is only
  visible by comparing what two people believe they saved.
- **What proves it:** the race itself, run in the order that destroyed work — Ruth reads, Tom
  saves, Ruth saves — with both changes surviving, plus an assertion that a decline write
  touches only the writer's key. Each advisor's state now lives at a key of its own
  (`meeting-observation-advisor-own:<advisorId>`), so **each row has one writer and there is no
  losing write to detect.** Suite 8,356 green; commit `10ae099`.

**`saveFirmConfig` was NOT changed, and that was the point.** The item first named a
compare-and-set on it; that function is shared by more than forty callers with nothing to do
with this feature, so the fix went the other way — removing the contention rather than
detecting it. No other firm-overlay feature moved. Nothing was migrated because nothing existed
to migrate: these keys were introduced the same day and had never reached `master`.

⚠ **Two things this does not cover, recorded rather than left to be rediscovered.** One advisor
with two browser tabs can still overwrite themselves — a person racing themselves, with both
screens in front of them. And no save has yet reached a real MySQL, because there is none on
this machine; **that is UAT's to exercise, not ours, which is the ruling that closed this.**
Shape and reasoning: [`../MEETING-TYPES-CASCADE.md`](../MEETING-TYPES-CASCADE.md) §5.

---

**4.74 — the advisor's hint words reached no code.**
✅ Closed 2026-09-08, the day it was filed, on Mike's ruling.

- **Why it mattered:** an advisor could enter hint phrases against a point they wrote, and
  nothing in the app could ever read them.
- **What we would have lost:** a control on screen that shapes nothing, which is the same
  defect whether the field is useful or not.
- **What proves it:** the advisor's screen now carries the manager's own checkbox, *"This
  cannot be heard on a recording"*, gating the hint field exactly as `FirmMeetingObservations.vue`
  does. `validateAdvisorPoint` accepts `cannotHear`, the stored row keeps it, and unticking
  clears the phrases rather than storing them where nothing reads them. Six tests.

**The decision turned on a fact the original ruling did not have.** Hint phrases never reach
the model: `cannotHearFindings` searches the transcript in our own code, and only for points
the model has been forbidden to judge, then asks the advisor to confirm. So the alternative —
feeding hints to the model to help it recognise an advisor's own point — would have let the
person being assessed tune the thing assessing them. Marking the point un-hearable protects
their own points better: it is not judged rather than judged badly, and the finding stays their
confirmation.

---

**4.73 — economic analysis failed on its default path.**
✅ Closed 2026-09-08 on Mike's instruction *("tick them off")*.

- **Why it mattered:** every run through the built route on the default no-date path was
  refused, so an advisor ticking *economic analysis* got a generic failure, every time.
- **What we would have lost:** a feature that had never succeeded through the route since the
  date change of 2026-09-07.
- **What proves it:** run 21 — the built route, same brief, no assessment date — 12 searches,
  1,938 words, 32 citations, accepted. The cause was §2 stating a `{{today}}` later than the
  model's own date, which it treated as unverifiable and stopped to ask about rather than
  research. Fixed by one paragraph in §2. Evidence:
  [`ECONOMIC-ANALYSIS-TEST-RUNS.md`](../ECONOMIC-ANALYSIS-TEST-RUNS.md) runs 20–21; wording in
  [`ECONOMIC-ANALYSIS-PROMPT.md`](../ECONOMIC-ANALYSIS-PROMPT.md) §7c.

**Also closed under this item:** `reddit.com` banned as a source after run 21 cited it — named
in §3 and enforced in `validateResearch`. §7d.

---

**4.69 — a future assessment date may leave the research unsourced.**
✅ Closed 2026-09-08 on Mike's instruction, alongside 4.73.

- **Why it mattered:** §2 asked one date to be both the start of the assessment period and the
  yardstick for how current a figure is, so a date months ahead sent the model looking for data
  that does not exist yet.
- **What we would have lost:** the fix was built on 2026-09-07; what was missing was proof
  through the path a user actually takes.
- **What proves it:** run 21 **is** the regression check this item owed — the default no-date
  path, through the built route, accepted.

⚠ **Prove a change to this prompt through the built route, never a probe.** A probe does not
carry `{{today}}` and will pass where the route fails.

---

**Four things seen on the saved-report screens that need a ruling.** ✅ Ruled one at a time by
Mike and built 2026-09-07. Loan Estimator: a save with nothing confirmed is not sent; the screen
says "There is nothing to save yet. Confirm a step first." Volatility: source flags are never
counted as changed figures, so one retyped month reads as one figure. The header: the Client
access box is capped at 470 px, so badge, switch and Save sit beside the title on every report;
the banner was never the cause. Quick Position: the client badge on a factor sits beside the
percentage, not on the label beside the value's tag. Rebuilt and walked live on Debtor Drag,
Quick Position, Volatility and the Loan Estimator, no errors. **What proves it:** the empty-row
test in [`savedReport.mixin.test.js`](../../tests/unit/savedReport.mixin.test.js) and the
source-flag test in [`savedReports.test.js`](../../tests/unit/savedReports.test.js); the two
layout changes are visual and carry no test, by the 2026-08-24 rule. *Built on the desktop under
the provisional number 4.69 (commit `176390a`); that number now belongs to the laptop's later
item, so this entry carries none.*

**A client's page is refused the firm's currency and tax rules.** ✅ Built and closed
2026-09-07. Found on the desktop's live walk of 2026-09-04. Three firm-level reads the client's
page fetches with the client's token sat behind the advisor-only guard, and the callers swallow
the refusal, so the client silently got the shipped defaults: the currency on every report, the
property tax rules, and the imported-stock sell-down ladder on the forecast. One guard now admits
either an advisor or a client of the firm on those three reads only; every write is still the
manager's. Proven live against MySQL as client, advisor and a bad token. The item's note briefly
named a fourth read, trend thresholds; nothing in the browser calls it, so there was no fault.
**What proves it:** the `firmOrEntityAuth` block in
[`entityAuth.test.js`](../../tests/unit/entityAuth.test.js) and the read-only pin in
[`clientReportsProxyWiring.test.js`](../../tests/unit/clientReportsProxyWiring.test.js), which
fails if any write route ever takes the guard. *Built on the desktop under the provisional number
4.68 (commits `71b60bf`, `3e0e39a`); that number now belongs to the laptop's later item, so this
entry carries none.*

**4.68 — the forecast opened on zeros where its own note promised a worked sample.**
✅ Closed 2026-09-07, and the note was the stale half. The item was filed as a disagreement
between two things without knowing which was wrong: the JSDoc on
[`pages/three-way-forecast.vue`](../../pages/three-way-forecast.vue) promised that step 4 reached
without an intake computes the source workbook's sample, and a browser showed $0 in every cell.
**The code is right.** The intake's `form` watcher is `immediate`, so it reports a payload the
moment step 1 mounts; `liveInputs` is never null, `seed` is never null, and the report's own
no-seed sample path — which still exists and is still tested at component level — cannot be
reached from this page.

**That is deliberate on both sides, which is what settled it.** `buildInputs()` sends every field
explicitly, under its own comment *"they are sent as nothing rather than left to the sample's own
values"*; [`threeWayForecastModel.js`](../../server/report/threeWayForecastModel.js) says an
omitted year inherits the year before it, *"never the sample workbook… rather than dropping 'Big
Bird Grass Seed' into a real client's accounts"*. The whole codebase walls the sample off from real
client work, so showing it to an advisor would have been the defect, not the cure. And the
`immediate` flag that closed the sample path is load-bearing for **4.62**: a client, and a loaded
saved row, reach step 4 without ever pressing Build. The note had been stale since 2026-09-05, the
day that flag was added.

**What proves it:** nothing new. No test asserted the page-level sample claim, and none should — the
change is one comment block, and the suite stayed at 8,059 green across it. A screen of $0 is the
forecast waiting for data; the file now says so, and says why.

⚠ **This is OUR 4.68, and the desktop closed a different one the same day** — *"a client's page is
refused the firm's currency and tax rules"*, its closure block below carrying no ref number. Both
machines filed a 4.68 on 2026-09-07 without seeing the other's, the second such collision in a week
(4.62 was the first, 4.56 before it). The number is not reused.

**4.67 — step 2 of the forecast opened in the running app, and it was not wasted.**
✅ Closed 2026-09-05. The item existed because three things built that morning — the funding
**Type** column, the stock-in-transit block and the glossary **?** marks — had never been seen in
a browser. Chromium was driven to step 2 and the repo's own visual rules
([`tests/visual/support/rules.js`](../../tests/visual/support/rules.js)) run against it four ways:
blank, with a facility, at the eight-row funding cap, and with the transit block showing.

**The three things it was filed to check were sound.** The Type column offers *Term loan* /
*Facility*; a facility's repayment box greys out and reads **"No set repayment"** — Mike's wording,
disabled, exactly as ruled; funding rows appear as needed and stop at eight with their capped note;
the transit block appears only when the opening carries a deposit. No layout breaches at all, which
is the opposite of what the report screen's own look had found that morning.

🔴 **What it caught was a feature that was completely dead, and looked finished.** `b-tooltip` was
never registered in [`plugins/buefy.js`](../../plugins/buefy.js) — that file registers Buefy 22
components at a time rather than the whole library, to hold the 300 KB bundle budget, and the
glossary's root element was not on the list. An unregistered Buefy component throws nothing: the
browser held a literal `<b-tooltip>` element with each definition sitting in a `label` attribute it
ignores. Every **?** rendered, correctly styled, and explained nothing to anybody. A second fault
under it: the marks sit inside headings that are uppercase and letter-spaced, so once the tooltips
worked the definitions arrived **shouted**. Both fixed in `e1b34d7`.

**Why no test could have caught the first one, and it is the reason this closure is worth reading.**
[`tests/helpers/mountComponent.js`](../../tests/helpers/mountComponent.js) registers the **whole**
Buefy library, so every component test gets a working `b-tooltip` and the app does not — the tests
and the app register Buefy two different ways, and
[`glossary.test.js`](../../tests/unit/glossary.test.js) passed throughout on a component that could
not work on a screen. The plugin's own comment predicted exactly this: the warning is *"loud on the
machine that makes it and invisible everywhere afterwards"*, because Vue compiles it out of a
production build. **Nothing covers `plugins/buefy.js`.** That is recorded here as a fact, not filed
as work.

**What proves it:** the fix is two lines and a scoped reset; the proof is the browser. Hover opens
the definition, leaving closes it, all three marks on step 2 show their own text, and the console is
clean where it carried five `Unknown custom element` warnings before.

**Five changes for junior advisors — the report shows every line, and the jargon explains itself.**
✅ Built and closed 2026-09-05. Mike: *"most of the accountants using this will be junior in terms
of experience"*, then *"do them all"* to five proposals. Filed straight to this page for the same
reason as the two fixes below it — the work finished in the session that started it.

**Four were small.** A **glossary** ([`data/glossary.json`](../../data/glossary.json), sixteen
definitions, one home) with a **?** beside the headings that use jargon — it adds to a heading and
never rewrites one, because his labels are ruled screen by screen. A collection profile that does
not total 100% now **says what the gap means and what to do**, with different sentences for the two
profiles because a shortfall means opposite things on each. Step 2 **counts** how many opening
figures came from the file and how many are the advisor's. The purchases grid **shows its year
total**, as sales always has.

**The fifth changed a screen he had already approved, so it was drawn first** —
[`three-way-forecast-report-detail.html`](../mockups/three-way-forecast-report-detail.html), four
questions, ruled one at a time. The report showed **four rows** per tab, so a junior asked *"why is
profit down in August?"* had nothing to answer with and could not see their own typing error. It
now carries a **Summary / Every line** setting: Summary is still the default and still the four rows
approved on 2026-09-02, so nobody content with today's screen is handed a longer one.

🔴 **He added something the drawing never asked for, and it was the right addition.** Against the
recommendation to hide empty overhead lines, the risk named was that a junior never learns an
"Insurance" line exists. His answer: *"yes - as recommended but perhaps a note explaining it could
help?"*. The note is built, counts what is hidden, says how many the app holds, and names where they
are set.

**No new input, no recomputation, the golden set untouched** — every series on the screen is one the
engine has returned since it was written. **Facility interest finally has a row of its own**, having
been ruled engine-only that morning purely for want of anywhere on this screen to put it. That is
the 4.16 fault closing itself the same day it was named.

**What proves it:** the Summary / Every line block in
[`threeWayForecastReport.component.test.js`](../../tests/unit/threeWayForecastReport.component.test.js)
— its first test pins that the screen still OPENS on the four approved rows, which is the whole basis
on which the change was approved — and [`glossary.test.js`](../../tests/unit/glossary.test.js), whose
first test catches a mistyped key that would render nothing and that no person in UAT could notice.

**Facilities and stock in transit — the two proper fixes to the forecast's opening position.**
✅ Built and closed 2026-09-05. **Neither was ever on the live list, and that is correct rather
than an omission:** the drawing was made on Mike's request (*"you mention 'fixing them properly' -
design the proper fix and let me know what is needed"*), its ten questions were ruled the same day,
and he then asked for the build in his own words — *"build the forecast fixes"*. Filed straight to
this page because the work was finished in the session that started it; an item that is open for no
minutes belongs in the record, not on a live list.

They are **two independent fixes**, drawn together only because both concern what the opening
position carries into the forecast. Artefact:
[`three-way-forecast-facilities-and-transit.html`](../mockups/three-way-forecast-facilities-and-transit.html).

**Fix 1 — a facility carries its balance instead of paying it off.** Revolving finance had no home
and sat in Other current liability, carried forward unchanged and charged nothing: on the client it
was found with, 2,450,000, or 42% of total liabilities, costing the forecast nothing at all. The
funding table now has a **Type** column (Mike's word), a facility is `loanSchedule` with the
amortisation line removed, and rows **appear as they are needed** with an Add button capped at eight
— it was fixed at three, so a client with six loans had three folded together before the engine saw
them. A facility's interest is **its own figure and engine-only**, exactly as he amended the ruling:
the report's profit tab shows no interest at all, so a third line has nowhere to appear.

🔴 **The drawing's claim that the obvious workaround is worse is now a test.** A term loan with a
zero repayment computes capital repaid as *repayment − interest*, so the debt GROWS by its own
interest while the interest is also paid in cash. The figures on the drawing —
capital repaid **−16,333** in month 1, closing **2,653,348** after twelve months — reproduced
exactly on the first run of the new test, which is the strongest evidence the drawing was built
from the engine and not from reasoning.

🔴 **One thing was found in the code that the drawing did not know about, and it was a live trap.**
`resolveInputs` mapped over the three DEFAULT loans, so a caller sending FEWER than three silently
inherited the sample company's own *XYZ Bank* at 1,000,000 and *DEF Finance* at 50,000 in the slots
it did not fill. It never bit because the screen always sent exactly three; the moment rows became
variable it would have. Fixed and pinned.

**Fix 2 — deposits already paid on stock that has not arrived.** 825,628.98 on the same client sat
in Other current asset and never became stock: the containers landed during the year and the balance
sheet still showed the money as a deposit at the end of it. It now has **its own opening line**
(parsed from the file, so the money moves out of the catch-all and the opening still ties to the
cent), a **balance still owing** the advisor types, and twelve landing months. A landing releases the
prepayment, settles the balance pro rata, and the full landed cost joins purchases. **Both seams,
not one** — the drawing's own sizing was corrected before the build for exactly this reason.

🔴 **GST: the drawing was wrong by omission, and Mike's instruction was to research rather than
guess.** It described a landing as three movements and said nothing about tax. The rules are
unambiguous: **GST is triggered by the goods arriving, not by paying for them**, so a container
whose deposit was paid in a previous financial year still attracts the full border GST in the month
it lands — roughly 124,000 on that client, in the direction that flatters a funding application.
Built as he then ruled: charged on the goods alone (deposit plus balance), claimed back on the next
return, with the screen saying in terms that duty and freight are excluded. The rules and their
sources are written down once, in [`TAX-RULES-IMPORT-GST.md`](../TAX-RULES-IMPORT-GST.md), so the
next session does not re-derive them.

⚠ **Two deviations from the approved artefact, named rather than absorbed.** (1) The cash tab gained
**two sub-rows** for the balance and its border GST, which the drawing did not draw — the same
argument that gave the five overseas rows their own lines, since money leaving the bank in one month
should not be a lump inside a total. (2) The landing grid is headed **"When it lands"**, the drawing's
own rendered wording, where its question list paraphrased the label as *"Arriving in"*; the artefact
disagrees with itself and the rendered version is the one he looked at. Either is his to strike.

**What proves it:** [`tests/unit/forecastFacilitiesAndTransit.test.js`](../../tests/unit/forecastFacilitiesAndTransit.test.js)
— 23 tests, and **the guard was written and seen passing first**, as the drawing demanded: with the
new fields empty the three statements are byte-identical and all 3,385 golden cells still match.
Screen behaviour in `threeWayForecastIntake.component.test.js` and
`threeWayForecastReport.component.test.js`. **Suite 7,864 green** (408 suites, 38 new tests),
lint 0 errors.

**4.64 · International versus local — the forecast treats every sale and purchase as domestic.**
✅ Closed 2026-09-05. Mike's request of 2026-09-03: *"shouldn't the assumptions page have a
'international' vs 'Local' purchases and sales box? … to allow for shipping and fx"*. Drawn,
approved and built on 2026-09-04, both slices — it **absorbed 4.63 as slice 2** on his instruction
— and eyeballed in the running app the same day. It stayed open afterwards for **one** reason:
five differences between the built screens and the approved drawing had no ruling from him.

🔴 **The guard is what the build order was for, and it held.** With the tick off and both overseas
series empty, all **3,385 golden cells** still match the workbook and the three statements are
byte-identical — written and passing before a line of the feature existed, because this change
reaches into the GST computation the golden set covers cell by cell.

🔴 **What closes it: the five differences were ruled on 2026-09-05, one at a time on his
instruction, and in every one the build was kept and the DRAWING corrected.** (k) the balance to
the supplier is a five-bucket percentage profile, not one dropdown; (l) the overseas mark-up sits
at the foot of the overseas sales card, not beside the local one; (m) the three shipping speeds are
a sentence, not a picker; (n) the sales-side allowance reads *Exchange-rate allowance on receipts*;
(o) the IMPORTED / OVERSEAS pills stay unrendered. **None of the five changes a figure.** Each is
now marked in red where it sits on
[`three-way-forecast-international.html`](../mockups/three-way-forecast-international.html) with his
reason, and the drawing's opening sentence — which still read *"nothing here is built"* — was
corrected with them.

⚠ **One thing was noticed and is deliberately NOT carried here:** `shipmentTimer` in
[`ThreeWayForecastIntake.vue`](../../components/ThreeWayForecastIntake.vue) is never cleared on
destroy. It was seen on 2026-09-04, is not filed, and is not part of this item.

**What proves it:** [`tests/unit/threeWayForecastModel.test.js`](../../tests/unit/threeWayForecastModel.test.js)
(the golden set, unmoved), [`tests/unit/forecastSellDown.test.js`](../../tests/unit/forecastSellDown.test.js),
and the intake-component guard that fails the build if the engine defaults an input the screen does
not send. Recorded in [`report-models.md`](report-models.md) and
[`ARTEFACTS.md`](../ARTEFACTS.md).

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

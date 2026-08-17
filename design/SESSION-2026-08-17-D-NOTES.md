# Session Notes — 2026-08-17 · Laptop, Session 69

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,815 green / 323
> suites**, lint 0 errors, audit gate PASS.
>
> ✅ **The property model's MATHS and ROUTE are built and proven. There is still NO SCREEN.**

---

## 🔴 FIRST TASK NEXT SESSION

**Build the screen — item 4.20.** Read
[`MULTIPLE-PROPERTY-ASSESSMENT.md`](MULTIPLE-PROPERTY-ASSESSMENT.md) §8 and §9, and open
[`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html)
beside the build.

⚠ **DO NOT RE-ASK ANY DESIGN QUESTION. All eight were ruled on 2026-08-17**, each recorded
with the options Mike turned down. Read the ruling, not §8's summary table — the table
names the answer, the section holds the reason, and the reason is what stops a settled
question being re-derived.

🔴 **Two traps that will cost time if you meet them the hard way:**

1. **The catalogue row must be flipped in the SAME change as the page.**
   [`../tests/unit/reportShellFrame.test.js`](../tests/unit/reportShellFrame.test.js)
   derives its list from the catalogue's ready routes and fails when a ready model has no
   shell-wrapped page. **`ADDING-A-REPORT.md` numbers the catalogue (step 5) before the
   page (step 6)** — that is a reading order, not a commit order.
2. **The screen must show the effective management fee** — *"charged at 8.625% with GST"* —
   under the fee itself. The model returns `taxRules.effectiveManagementFeePct` for exactly
   that. A screen without it puts the model back where it started.

---

## What shipped

Eight commits. `e208825` the fault and the two endings · `5e61cc4` the maths and its golden
test · `6e858b3` the four tax rules designed · `16b99b0` the four tax rules built ·
`8ead5f6` the route · `b71c484`, `fba604f`, `d0a4240` the remaining rulings.

### 1. 🔴 The workbook is wrong in the two years that decide the headline

Found by reading the cells **before** writing any code. `MODEL` row 60 zeroes the
interest-only balance at the end of its term with **nothing repaying it**:

| | Yr 8 | Yr 9 |
|---|---|---|
| Total Debt Position | 350,000 | **0** |
| Net Equity | 448,188 | **822,134** |

**Two of the four headline figures ride on that step.** The year-10 return reads **+36.4%**
where the property is losing the client money. `modelClass` is `CLASS_DECISION` — somebody
may buy a property on it.

**Mike ruled the advisor chooses**, and asked for both endings himself: convert to
principal and interest, or **repay from capital introduced**. The same property then
returns **−16.7%** and **−12.8%**.

⚠ **The repay ending is what the workbook already does, done honestly.** The fault was
never the zeroing — it was zeroing without recording where the money came from. That is
what the new **Capital Introduced** line is for.

**Two smaller faults, both corrected:** `MODEL` row 68's residual branch returns the final
112.89 repayment *positive* where the normal branch returns it negative, so the workbook
ADDS it to the client's cash (year 8 weekly 173.12 → **168.78**); and `MODEL` C33 alone
returns 0 for a *positive* year-1 weekly figure where every other year divides by 52.

🔴 **The workbook itself is NOT corrected. That is item 4.21** — the half of Mike's standing
"fix the code *and* the .xlsx" rule this session did not do. It is on the list rather than
in a commit message on purpose.

### 2. The four New Zealand rules became settings

Asked whether one add-back could be made configurable — *"can this be made a variable input
to allow for different tax treatements around the world?"* — Mike extended it to all four:
the year-1 non-deductible costs, the **GST inside the management fee**, what may be
depreciated and how, and whether losses ring-fence.

✅ **Every default reproduces the workbook, and the proof is that all 38 original golden
tests pass with not one expected number changed.**

🔴 **The GST one is why this could not stay an assumption.** `fee% × 1.15` was hardcoded
*inside* the formula — an advisor read **7.5%** on screen while the model charged
**8.625%**, and nothing said so. The other three are at least wrong *visibly* in the wrong
country; that one was wrong **silently**. Rule earned: **P10** in
[`features/report-models.md`](features/report-models.md), and it carries the second half —
**the screen must SHOW what the rule does**, not merely make it editable.

⚠ **`lossTreatment: 'offset'` is the setting with teeth.** The loss goes against the
client's other income the same year, so tax goes negative and the refund reaches the cash
flow at once — year 1 net cash −41,428 against −48,309.

### 3. Three more rules, all written into the Brief this session

**P11** — a catalogue row goes ready in the same change as its page. **P12** — a golden test
may have two provenances and every number says which it is. **P13** — 🔴 **a mutation that
PASSES may mean dead code, not a weak test.**

P13 is the one worth reading. A rate guard in the depreciation looked untested; it was in
fact **unreachable**, because the clamp on the next line already did the work. It was
**deleted** and the clamp tested instead. Writing a test for the dead branch would have
pinned code that does nothing and read as coverage.

### 4. A design question asked wrongly, caught by a Brief

**Q6 was written as "advisor, firm, or both"** — two tiers out of six. Reading
[`features/tier-cascade.md`](features/tier-cascade.md) changed the question: **P2, a group
is normally a country**, and tax rules are per-country, so a firm is the wrong place for
them to *originate*. Mike then ruled: group sets it, **firm and advisor may both override**.

⚠ **This is the third time a Brief has caught a wrong premise before it reached Mike.**
That is what they are for. **Read the Brief before offering a view on tiers, permissions or
editability** — not after.

### 5. One fault of ours, found because the workbook would not reconcile

Interest-only years were being counted as loan repayments, flattering the client's cash by
**14,000 a year**: year 1 came to 23,856.274 where `MODEL` C28 says 37,856.274. **The golden
test caught it on the first run** — which is the argument for writing it alongside the
model rather than after it. The guard is its own named function so the next loan cannot
repeat it.

---

## 🖥 FOR THE DESKTOP

✅ **Nothing here can conflict with a Course Builder build.** `logic-lab` untouched.

**New files:** `server/report/multiplePropertyModel.js`,
`tests/unit/multiplePropertyModel.test.js`, `tests/unit/multiplePropertyRoute.test.js`,
and this note.
**Touched:** `server/routes/report.js` (one new handler + one require),
`server/restify-server.js` (one route line), `design/MULTIPLE-PROPERTY-ASSESSMENT.md`,
`design/mockups/multiple-property-assessment.html`,
`design/features/report-models.md` (P10–P13), `design/features/to-do.md` +
`to-do-items.json` (three new items), `design/ACTIONS.md`.

⚠ **`server/routes/report.js` and `server/restify-server.js` each gained ONE line plus a
handler at the end.** If your branch touches either, the merge is additive.

---

## ☐ Open for Mike

1. **Nothing on the property model.** All eight design questions were ruled this session.
   **4.22** wants one sentence from him but blocks nothing.
2. **Send the release email** — [`RELEASE-v0.9.0-EMAIL.md`](RELEASE-v0.9.0-EMAIL.md), still
   not sent. Sending it as written also closes **item 3.5**. 🔺 **carried from session 67.**
3. **Where the engagement types live** — the only part of 4.16 still open. 🔺 **carried six
   sessions.**
4. **Whether a firm may REMOVE an inherited diagnostic situation.** Carried from session 65.
5. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
6. **4.12 · where the corrected handover lives** — carried **twelve** sessions.
7. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **twelve**
   sessions.
8. **The template picker on a firm's own coaching entry** — carried from session 60.

⚠ **Items 6 and 7 have now been carried for twelve sessions each.** Neither needs a working
session.

---

## Housekeeping

- **The live list grew by three and lost none** — 4.20 (finish Phase 1), 4.21 (correct the
  workbook), 4.22 (the purchase-costs question). **Twelve items; two need Mike.**
- ⚠ **4.19 sits ABOVE 4.20 on the list and depends on it.** Appending is the only way to add
  a row without moving one of Mike's, so the position is not a judgement — both rows say so.
- **The dev servers were not started.** No screen was built, so there was nothing to look at
  on the running app; that changes the moment 4.20 starts, and the screen must be opened for
  real before it is called done.
- **Nothing was moved to
  [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md)** — no live-list
  item was finished. The property work is new build, not a listed item, until 4.20.

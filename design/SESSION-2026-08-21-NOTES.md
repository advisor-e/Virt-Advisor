# Session Notes — 2026-08-21 · Laptop, Session 76

> **Branch `feat/advisor-progress`.** Suite **322 suites / 5,887 tests green**, lint 0 errors,
> tree clean, **41 ahead / 0 behind** `origin/master`.
>
> ✅ **ITEM 4.19 IS CLOSED.** The property model is finished — the drawing, the screen and the
> catalogue line. The live list is down to **twelve items, four needing Mike**.

---

## 🔴 FIRST TASK NEXT SESSION

**Ask Mike what he wants.** Nothing is half-finished and nothing is blocked, so there is no
obvious next thing and inventing one would be the mistake `startup-must-not-rank-the-list`
describes.

If he has no preference, **item 4.25 is the one with the strongest argument** — nothing in this
project can see a rendered page, and the last two visual defects were both found by Mike after
they shipped. It needs his yes before anything is installed: it is a dependency change and the
Stack Constitution is one-directional.

---

## What shipped

Two commits, both item 4.19.

| | Commit | What |
|---|---|---|
| 1 | `30c2b7a` | The Phase 2 drawing, before the screen. Plus two corrections to a document that had gone stale. |
| 2 | `4f34588` | The screen becomes the portfolio, the scope line goes, 8 component tests become 26. |

### 1. The drawing came first, and that was the whole point

Step P2-3 existed as its own numbered build step **because §10 records the Property Tax Rules tab
being built with no artefact at all**. It was written that way so it could not be absorbed into
"the screen" a second time, and it was not.

[`mockups/multiple-property-portfolio.html`](mockups/multiple-property-portfolio.html) — every
figure on it is `computeMultiplePropertyPortfolio()`'s own output, taken from the model, not the
workbook's uncorrected arithmetic and not invented. Its design and its six open questions are
[`MULTIPLE-PROPERTY-ASSESSMENT.md`](MULTIPLE-PROPERTY-ASSESSMENT.md) §11.

**Mike ruled all six in one line: *"looks great - move forward"*.** Then *"i like it"* on the
built screen, after opening it on the running app.

### 2. What the drawing found, which was never a design question

On the model's own defaults **property 1 absorbs the whole $315,000 deposit and properties 2–5
borrow 100% of their purchase price**; the rentals stand at **90.9%** loan to value. Spread the
deposit evenly by hand instead and **every** property breaches an 80% ceiling.

🔴 **$315,000 does not buy five properties, and no version of the workbook could ever have said
so** — it has no lending test anywhere in it. That finding exists only because Mike asked for an
editable ceiling on 2026-08-20.

⚠ **The same property reads −$929 a week on the old Phase 1 screen and +$41 here.** Neither is a
fault: Phase 1 lets funding and deposit be typed independently, and its sample borrows the whole
purchase price *while also* putting $315,000 down. The apportionment table will not allow that.
Mike was told figures would move before he ruled *"yes fix both"*.

### 3. 🔴 Two defects found by READING the screen, with 5,885 tests green

Both were found by mounting the finished component with the real `locales/en.json` — not the
key-returning stub the component tests use — and reading the rendered text as an adviser would.
Its own suite had *just* been rewritten to 26 tests and every one passed.

- **`investmentSummary.cashDeposit` is a SCALAR, not a ten-year series.** Indexing it rendered the
  client's cash deposit as **ten dashes** — their money missing from the one table that exists to
  show what they put in. *Every other row in that table genuinely is a series*, which is what made
  it easy to write and hard to see.
- **The deposit box was empty where the table had put money in.** It binds to what the family
  *typed*, so on the state the screen opens in it sat blank beside a funding figure of 334,000
  that had visibly had 315,000 deducted from it. **The screen was disagreeing with its own
  table.** The applied figure is now the box's placeholder.

Both fixed. Both carry a test that was **mutation-verified** — the fixes were reverted on a copy
and both tests failed, so neither is a test written to agree with the code.

🔴 **The reading step is now P19 of [`features/report-models.md`](features/report-models.md) §5.**
It is a build step, not a lucky habit. Neither defect is a maths error or a layout error, so
neither the golden tests nor a mockup could have seen them — they are the screen quietly saying
something untrue, and only reading it finds that.

### 4. The rules earned, and where they live

**Not in this note.** They are in [`features/report-models.md`](features/report-models.md):

- **P17** — a model holding many of one thing shows the whole first and opens one inside it, and
  **nothing outside the open item's own cards may move** when the reader opens a different one.
  A summary comparing all of them must exist, so opening one is never the only way to compare it.
- **P18** — a figure the model chose is a **placeholder**, never a blank and never written into
  the box. Writing it in turns a derived value into a chosen one; leaving it blank makes the
  screen disagree with its own table.
- **P19** (§5) — read the screen's rendered words with the real locale file before shipping, and
  say plainly that layout is still unverified.

---

## ⚠ Layout is NOT verified, and it is written down as unverified

No browser driver is installed in this repository and jsdom has no layout engine. **Reading
rendered text is not seeing a laid-out page.** This is the gap the Property Tax Rules phasing
boxes fell through on 2026-08-18.

🔴 **It is now item 4.25 — a job somebody does, not a warning in a document.** `CLAUDE.md` names
Playwright as the standard for critical journeys and it has never been in `package.json`. Every
visual defect this project has had was found by Mike, after it shipped.

---

## ☐ Open for Mike — four decisions, none blocking

1. **4.25 · a browser driver.** Needs his yes before anything is installed — a dependency change
   under a one-directional Stack Constitution. If a driver will not run on Node 14.15, the answer
   is a different driver, never a raised floor.
2. **4.26 · the Model Library card** still says *"a rental property"*, singular. **His own ruled
   wording** from Q7, when the screen really was one property. One line from him.
3. **4.27 · the per-property tax override** the drawing's prose promises and the drawing never
   shows. Build it, or strike the sentence — the options are opposite and only he can choose.
4. **4.22 · whether purchase costs are non-deductible in year 1.** Needs an accountant's answer,
   not a developer's. 🔺 **carried.**

Still carried from earlier sessions and not raised again this session: the release email
(**3.5**), where the engagement types live (**4.16**), and **4.12**'s handover story.

---

## A mistake worth recording

`design/ACTIONS.md` (7,126 lines) was **truncated to zero bytes** by a Python script whose write
failed *after* `open(path, 'w')` had already truncated the file. It was restored from git inside a
minute and nothing was lost, **only because it was committed**.

The rule now recorded: never rewrite a repo file with `open(path, 'w')` — use the Edit tool for a
block insertion into a large document, which is what should have been used here, or write to a
temp path and move it into place.

---

## For the other machine

Nothing here touches Course Builder or the Business Performance Report. The changes are confined
to the Multiple Property Assessment screen, its locale strings, the report catalogue row and the
report-model Brief, plus their tests and the design documents.

**If you are about to touch `components/MultiplePropertyAssessment.vue`, `locales/en.json` or
`utils/reportModelCatalogue.js`, merge `master` first.** And note that
`tests/unit/reportHeadlineConsistency.component.test.js` now feeds that screen a **portfolio**
rather than a single property.

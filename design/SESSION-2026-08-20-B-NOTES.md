# Session Notes — 2026-08-20 (second session) · Laptop, Session 75

> **Branch `feat/advisor-progress`.** Suite **322 suites / 5,869 tests green**, lint 0 errors,
> tree clean, **37 ahead / 0 behind** `origin/master`.
>
> **Item 4.19 — the portfolio.** Steps P2-1 (maths) and P2-2 (route) are built. **The row is
> still open**: the artefact, the screen and the catalogue line are not done.

---

## 🔴 FIRST TASK NEXT SESSION

**Item 4.19, step P2-3 — the artefact for the Phase 2 screen**, then P2-4 the screen itself.
Nothing in `MULTIPLE-PROPERTY-ASSESSMENT.md` §4, §5 or the mockup draws the household inputs,
the apportionment table, the hold-back control, the LVR figures or the consolidated report.
🔴 **The drawing is its own numbered build step precisely so it cannot be absorbed into "the
screen" the way it was for the Property Tax Rules tab.**

---

## What shipped

Five commits, all item 4.19.

| | Commit | What |
|---|---|---|
| 1 | `c7fc42b` | The Phase 2 maths — household, apportionment table, five properties, consolidation. Two source corrections. 40 tests. |
| 2 | `a0a779f` | The deposit hold-back, both LVRs, the servicing block, the three identities. 80 tests. |
| 3 | `e36f8da` | The lending ceiling as an editable cascade setting, and the Property Tax Rules tab's first ever component test. |
| 4 | `4f4210c` | The design document brought back in line with the code. |
| 5 | `838cf46` | One route, two shapes, with the live Phase 1 request shape pinned by a test. |

### 1. Two proven defects in the source workbook, corrected

**Mike ruled *"yes fix both"***, told first that figures on a **live** Phase 1 screen would move.

- **`INPUTS` L15 apportioned the purchase PRICE, not the required funding.** The residence's own
  cell is `=K11*K13` (funding × %); Invest 1's is `=L9*L13` (value × %). Property 1 borrowed the
  full 649,000 and the 90,000 of savings available to it was ignored.
  🔴 **The proof is the workbook's own check cell R17.** Read correctly it lands on exactly the
  non-deductible share of the home loan every time — 90,000 = 225,000 × 40%, and 120,000 =
  300,000 × 40% when the mortgage is raised. Read as written it gives 0, then 105,000. **The 0
  that makes the sheet look reconciled is a coincidence of the sample figures.**
- **The deposit was counted twice.** `OUTPUTS` C18 hands property 1 the whole 315,000 pool;
  C100 hands property 2 a second helping of the same money. `Consolidated Report` C29 therefore
  reported **405,000 of investor cash from a 315,000 deposit**, and it fed the return-on-investor-
  funds headline.

### 2. Mike refused both options and gave a better one

Asked whether the home mortgage should reduce the deposit — the workbook's behaviour — or not:

> *"either way, the math has to add up. If there is an option for a family to 'hold-back' some of
> their cash deposit then that's fine but the remaining math still has to work - I think the sheet
> was trying to provide the option as to how much got used on this property but still met equity
> lending and servicing requirements - check if the math can enable these"*

✅ **He was right that the sheet was reaching for it.** `M15:P15` — the apportioned loans for
properties 2 to 5 — are **not formulas at all but hand-typed constants**. Somebody was overriding
that row by hand. The ruling is that override, made visible and made to reconcile.

**Three identities now hold, tested under seven allocations including a negative and an
over-spend.** `requiredFunding + depositApplied === purchasePrice`; `Σ depositApplied +
depositHeldBack === totalSavings`; `interestOnly + principalAndInterest === requiredFunding`.

🔴 **The third identity caught a fault in the workbook's own sample.** `INPUTS` E68 types a
350,000 interest-only loan against a property that, with its deposit genuinely applied, needs to
borrow 334,000 — so E69 (`=E65−E68`) goes to **minus 16,000**. Capped, and warned about.

### 3. What was checked before anything was built

All seven sheets, because "can the math enable these" deserved an answer, not a guess:

- **No hold-back control.** The hand-typed row 15 is its only trace.
- **No lending test.** `R5` computes an LVR and **no formula anywhere reads it** — no threshold,
  no conditional formatting. It is a number on display.
- **No servicing test, and none is possible.** The workbook collects no household income and no
  living costs on any sheet. Servicing is therefore **shown and deliberately not judged**, with a
  test that fails the build if an affordability verdict is ever added.

⚠ **`design/MULTIPLE-PROPERTY-ASSESSMENT.md` §1 claimed the table spread lending "until the LVR
ceiling is reached".** It was written from the shape of the table before the formulas were read.
Corrected, with the evidence written underneath so nobody re-derives it.

### 4. The lending ceiling — *"it needs to be an editable input"*

Offered 80 / 70 / 65 percent, Mike declined to pick one. It now joins the **existing**
property-tax-rules cascade — mentor → global group → group → firm, version history and restore
for free, advisor still typing over it on the report. **No new mechanism and no new Hub tab.**

🔴 **It ships blank.** A shipped figure would be a lending policy nobody chose, arriving with the
authority of a calculated result. Both LVRs are computed and shown; neither is judged until a real
figure exists. Two of them, because they answer different questions: all-in (69.4% on the sample)
and the rentals alone (90.9%), which is what an investor's lender tests.

**The tab had NO component test at all** since being built on 2026-08-18. It has 12 now. The one
that matters: **a blank ceiling must never be sent as 0**, because a maximum LVR of zero refuses
every loan ever written — silently, on a tab where every other blank number legitimately means
zero.

⚠ **The label is ours.** Mike was offered a committed drawing of the tab with the field on it and
declined: *"no, just add it as a field - I'm sure you can do it."* Every part that is ours — label,
help text, placement, the widened intro sentence — is listed row by row in the artefact §10, so
changing any of it is one line from him.

### 5. The route — one URL, two shapes

A body carrying `household` or `properties` computes the portfolio; **every other body computes
exactly as it did before Phase 2 existed.** The Phase 1 screen is live in UAT, so the test this
change is really about sends the old shape and asserts nothing moved. A second test covers the
likeliest accident: an **empty** body must still mean one property.

The address guard widened from one real client address to **five**. 16 route tests, up from 7.

---

## 🔴 The mistake this session made, written down because it was the SECOND time

It repeated the claim that **Mike had not opened the Property Tax Rules tab** — into `to-do.md`,
into a commit message, and as a proposed new item on the live list — when he had corrected exactly
that claim **the same morning**:

> *"I DID look at the property tax rules — your notes should show that the phasing depreciation
> inputs were too small and thus failed to show the % figures."*

He was right, and the defect he found is real: five phasing percentage boxes sharing a slot sized
for one, about 31px each, so each read as empty while holding the correct value. **No test in this
repository could have seen it — jsdom has no layout engine. Finding it WAS the review.**

**Why it happened:** startup listed the recent session notes and read the newest two, but not
`SESSION-2026-08-19-B-NOTES.md`, which held the correction. The rule *"read every session note back
to the last merge"* exists for exactly this, and following it partially is what failed. He caught
it: *"remember, i started this session by telling you i already opened the property tax rules"*.

**Both files are corrected in place, with the wrong sentences left visible above their
corrections**, so the pattern stays legible rather than being tidied away.

🔴 **A finding is not evidence that the finder wasn't looking.** Turning his own discovery into
"still not reviewed" made his work into evidence against him, twice.

---

## The rules earned, and where they live

**Not in this note.** They are in [`features/report-models.md`](features/report-models.md):

- **P14** — a model may adjust an input to keep the sums right, and must say so out loud. The
  warning is not the polite half of the feature, it is the feature.
- **P15** — a "must add up" relationship is an identity, tested across ordinary input, edge cases
  and abuse, not asserted in a comment.
- **P16** — a calc route stays anonymous; cascaded settings are resolved by an authenticated
  endpoint and passed in.
- **P10 extended** — a setting the workbook has *no value for* ships **unset**, never with an
  invented default.

---

## ☐ Open for Mike — three decisions, none blocking

1. **The LVR ceiling figure.** Nothing is judged until it is set.
2. **Whether the Property Tax Rules tab should be renamed**, now it holds a lending setting. Its
   intro sentence says "tax and lending"; its name was not changed behind him.
3. **Whether the sample's own 350,000 / 299,000 loan split should be reset** now its deposit is
   genuinely applied. The model caps it and warns.

---

## For the other machine

Nothing here touches Course Builder or the Business Performance Report. The changes are confined to
the property model (`server/report/multiplePropertyModel.js`), the report route, the property tax
rules cascade and its Hub tab, plus their tests and the design documents. **If you are about to
touch `server/routes/report.js` or the Firm Manager Hub, merge `master` first.**

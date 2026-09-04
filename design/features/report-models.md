# Report Models — the Brief

> **Read this before touching any model screen. It is the current rules, nothing else.**
> No dates, no history, no arguments. If you want to know *why* a rule exists, or what
> was tried and rejected, that is in [`report-models-history.md`](report-models-history.md)
> — **after** this page, not instead of it.
>
> **Covers:** every screen in the Model Library — the maths, the layout, the failure
> behaviour. **Does not cover:** the AI advisor, the course builder, the Firm Manager Hub.

---

## 1. Design philosophy

A report model is **a teaching instrument an advisor drives in front of a client.**
That single sentence decides most of what follows.


It is not a page a client browses alone, and it is not a spreadsheet with a web front end.
The advisor moves a slider and the client watches the number move — the *movement* is the
product. Everything else exists to keep that moment credible: the figures have to be
right, the screen has to look composed, and nothing on it may ever be ambiguous about
whose numbers are on display.

Three consequences run through every rule below.

**Every model layout/format looks identical.** Not similar — identical. An advisor opens four models in
one meeting; a screen that looks different from its siblings reads as unfinished, and the
advisor's credibility is what pays for it. A model never chooses its own look.

**A wrong number is worse than a missing one.** Someone may sign a loan on the output. So
the maths is ported from the source workbook and pinned to the workbook's own cached
values, and a calculation that fails says so loudly rather than leaving a stale figure
looking live.

**A model must never be "quietly both."** Illustrative teaching figures and a client's real
accounts must never be mistaken for one another on screen. That is what `modelClass` is
for, and it is the only rule here that can embarrass an advisor in front of their client.

---

## 2. Key principles — the non-negotiables

**P1 · One look, and it is not yours to choose.** Every model copies the finished live
screens exactly — structure, sizes, colours, failure behaviour — on *every* step,
entry and intake screens included. Do not ask the owner how a model should look. Do not
propose a bolder or model-specific look. Open Quick Position or Eight Levers and copy.
A screen that would look out of place beside them is wrong by definition.

**P2 · One gap value: 16px, everywhere.** Header→banner, banner→body, card→card,
column→column. One number, no judgement calls, no "close enough". Micro-spacing *inside*
a component (tile grids, chart labels) is deliberately tighter and is not forced to 16.

**P3 · The header and the headline banner are full page width.** Both are direct children
of the screen root, above the two-column body. The banner is never nested inside the
results column.

**P4 · The screen declares no frame, palette, card, button or font of its own.** It reads
the `--rs-*` tokens from the shared shell. A genuinely model-specific accent — a chart
gradient, a verdict panel — may stay literal. Nothing else may.

**P5 · There is no dark mode.** One light look on every model regardless of the operating
system theme.

**P6 · `modelClass` is a safety rule, not a label.** It decides whether the "Illustrative"
badge appears and whether the privacy boundary applies:

| Class | Whose figures | Badge | Privacy scrubbing |
|---|---|---|---|
| `CLASS_EDUCATION` | Illustrative, chosen to teach | **Required** | No — nothing real enters it |
| `CLASS_DECISION` | The client's real numbers, typed in | **Never** | **Yes** |
| `CLASS_REPORT` | The client's real numbers, from their accounts | **Never** | **Yes** |

Privacy is triggered by **real client numbers, not by a file upload.** A decision tool
imports nothing and still handles sensitive personal data.

**P7 · The maths is backend-only and pinned to the workbook.** Pure functions in
`server/report/`, never in a Vue component. Every expected figure in the golden test is
the source workbook's *own* cached value with the cell reference in a comment, so any
number can be re-checked by hand.

**P8 · A failed calculation is visible.** Stale figures grey out and a banner offers a
retry. A model must never leave a dead number looking live.

**P9 · A model shipped in phases says on screen how much of it is in place.** Multiple
Property Assessment ships Phase 1 as one property of five, **under the finished model's
name**, with *"Property 1 of 5 · the remaining four arrive in the next release"* in the
header — muted ink, standard border, no new component. Ruled by Mike, 2026-08-17.

The alternative considered and turned down was an interim name for Phase 1, which means
renaming a live screen and breaking its route when the rest arrives. **A phased model that
says nothing reads as finished, and its gaps then read as the model's opinion** — an
advisor seeing one property assumes the model holds one property's worth of thinking.

⚠ **The naming question could not be answered until the schedule was.** It only settled
once Phase 2 was a row on the live list ([`to-do.md`](to-do.md) item **4.19**) rather than
a paragraph in a design document. **If a phase has no item, this principle has nothing to
promise** — the header would be claiming a release nobody has committed to.

**P10 · A workbook rule that differs by country is a SETTING, not an assumption.** Tax
rates, what may be depreciated and by which method, how losses are treated, which costs
are non-deductible, the GST inside a fee — each becomes an input whose **default
reproduces the workbook exactly**, so a firm that changes nothing sees no change. Ruled by
Mike, 2026-08-17: *"can this be made a variable input to allow for different tax
treatements around the world?"*

🔴 **The one that proves the rule is the invisible one.** The property model's management
fee was `rental × (fee% × 1.15)` with the 1.15 **hardcoded inside the formula**. An advisor
read *"7.5%"* on screen while the model charged **8.625%**, and nothing anywhere said so.
The other three rules are at least wrong *visibly* when applied in the wrong country; that
one was wrong silently.

**So the setting is only half of it: the screen must SHOW what the rule does.** The
effective rate is computed on the backend and rendered under the fee. A model that makes a
buried constant editable and still does not display its effect has moved the problem, not
fixed it — the same shape as `CLAUDE.md`'s hub-page rule, where wiring content to the AI
without a screen is half a fix.

⚠ **Where the settings are SET is a tier question, and it is answered from
[`tier-cascade.md`](tier-cascade.md), not invented.** For tax that is the **group** — P2
of that Brief: *a group is normally a country*. A firm is a branch inside one, so a firm
is the wrong place for a country's rules to originate, however likely it is to be where
they get corrected.

🔴 **A SETTING THE WORKBOOK HAS NO VALUE FOR SHIPS UNSET.** P10 above is about a value the
workbook *does* hold, buried in a formula; the default reproduces it exactly. Where the
workbook holds **nothing**, there is nothing to reproduce, and a figure invented as a
default is a policy nobody chose arriving with the authority of a calculated result.
**Unset means the model computes and displays the measure and passes no judgement on it**
until a real figure is entered. Added 2026-08-20: the property model's maximum LVR. Its
source workbook computes a loan-to-value ratio at `INPUTS` R5 that **no formula on any of
its seven sheets ever reads** — no ceiling, no threshold, not even conditional formatting.
Asked which percentage to use, Mike ruled *"it needs to be an editable input"*; it ships
blank, and both ratios are still shown.

**P14 · A model may ADJUST an input to keep the sums right — and must say so out loud.**
Where an input would otherwise produce arithmetic nonsense, the model corrects it, returns
a `warnings[]` entry naming what was asked for and what was applied, and the screen renders
it. 🔴 **The warning is not the polite half of the feature, it is the feature.** A model
that silently clamps has gone back to producing a plausible wrong number, which is exactly
the fault these corrections exist to remove. Established 2026-08-20: a deposit larger than
the family's savings or larger than the house, and an interest-only loan larger than the
whole loan it is a slice of — the last of which was found in the source workbook's **own
sample**, where it drove the P&I loan to minus 16,000.

**P15 · A "must add up" relationship is an IDENTITY — tested across many inputs, not
asserted in a comment.** Name it, write it as an equation, and run it over ordinary input,
deliberate edge cases *and* abuse in the same test. Established 2026-08-20 from Mike's
condition — *"either way, the math has to add up"* — as three identities checked under
seven different allocations including a negative and an over-spend:

```text
requiredFunding + depositApplied === purchasePrice        (every property)
Σ depositApplied + depositHeldBack === totalSavings       (the portfolio)
interestOnly + principalAndInterest === requiredFunding   (every property)
```

**P16 · A calc route stays ANONYMOUS, and cascaded settings are passed IN.** Numbers in,
numbers out: the calculation reads no database and resolves no firm's configuration. The
screen fetches the resolved settings from the **authenticated** endpoint
(`GET /api/report/property-tax-rules`) and posts them back with the figures. That is what
lets a model carry firm-editable rules without the calculation itself becoming a route that
must be authorised, rate-limited and audited.

**P17 · A model holding MANY of one thing shows the whole first, and opens one inside it.**
Where a model takes a list — five properties, N of anything — the list-wide view *is* the
screen and a single item is opened within it. Two things follow and neither is optional:

- 🔴 **Nothing outside the open item's own cards may move when the reader opens a different
  one.** Choosing what to inspect is navigation, not a setting; the totals, the tables and
  the commentary above must be exactly where they were. Pin it with a test that snapshots
  every list-wide computed before and after the switch.
- **A summary comparing every item must exist**, so opening one is never the only way to
  see how it sits against the others — otherwise the reader is asked to compare two states
  they cannot see at once.

⚠ **This is a shape decision, so it belongs in the artefact and needs the owner's word.**
The alternative — one screen per item, linked from a summary — is right when the items are
independent, and wrong when a figure typed on one changes another.

**P18 · A figure the MODEL chose is a placeholder, never a blank and never written into the
box.** Where a value may be either typed by the reader or derived by the model, the input
shows the derived figure as its **placeholder**.

- **Writing it into the field is wrong**: it converts a value the model worked out into one
  the user appears to have chosen, and where those two mean different things to the maths
  it silently changes the answer.
- **Leaving the box empty is also wrong**: the reader sees a blank beside a total that
  plainly had that figure deducted from it, and the screen is disagreeing with its own
  table.

**P20 · A model describes itself for BOTH readers, or it does not go live.** Every entry in
`data/report-model-summaries.json` carries, besides its purpose and its limits, three things
the screen puts in front of a person: `heroFigures` (the headline figures with the sub-label
the HeroStrip shows under each), `alsoOnScreen` (what sits below them — empty string where
there is genuinely nothing), and `coach` (the reading the screen gives in plain English).

- **There is one source and two readers.** `GET /api/report/model-guide` serves the Model
  Guide screen at `/model-guide`; `formatReportModelsForPrompt()` serves the AI. Both read
  that file. A firm manager choosing a model and the AI recommending one must never be told
  different things about the same screen — `tests/unit/modelGuideRoute.test.js` compares the
  served records against the prompt block, **after each reader has filled the gaps**, so it
  proves they get the same sentence *and* the same figures.
- **The build stops a half-described model.** `tests/unit/reportModelSummaries.test.js` ties
  the file to the catalogue in both directions and requires all three fields. A new model
  going live without them fails there, which is what makes the Model Guide keep itself
  current: nothing on that page names a model, so an entry is the only way on.
- **`coachIsNotAPanel: true` where the screen has no Coach panel.** **Four** models —
  8 Levers, Cost of Capital, **Lease vs Buy** and the Loan Estimator — carry explanatory
  notes and verdict rules instead, and the screen heads them differently. Claiming a Coach
  panel that is not there describes a screen the reader will not find.
  ⚠ *[`reportModelSummaries.test.js`](../../tests/unit/reportModelSummaries.test.js) reads
  this very sentence and fails if it stops matching the data.*

**P21 · A Coach reading carries its FIGURES, and a figure has ONE home.** `coach` lines are
written with `{named}` gaps — `{cycleDays}`, `{fasterExtra}` — and both readers fill them
from the same figures.
[`server/utils/reportModelFigures.js`](../../server/utils/reportModelFigures.js) computes
each model **by calling the same model function the screen's own route calls**, on that
model's own defaults, and returns **raw values with a format tag — never formatted text**:
money is currency-dependent, so the screen formats through `currencyMixin` in the firm's
currency and the AI's block in the platform default.

- 🔴 **A DERIVATION THAT LIVES IN A `.vue` FILE CANNOT BE QUOTED — MOVE IT, NEVER COPY IT.**
  Working Capital's *"cut it to 20 days"* what-if and EBITDA's dip year and terminal share
  were computed inside their screens. Copying them into the guide would have been the same
  sum written twice, which is the drift fault this Brief exists to prevent. They are now
  model output (`fasterCycle`, `valuation.dipYear` / `terminalShare`) and both screens read
  them from there. A test asserts the components no longer derive their own.
- 🔴 **WHERE A LINE DESCRIBES A PATTERN RATHER THAN ONE READING, IT IS PROSE WITH NO GAP.**
  Cost of Capital returns one of three verdicts; the property model gives a sentence per
  property. A single figure there **would read as the answer** when the screen gives a
  different one every run. Say what the screen does, in words.
- 🔴 **BOTH HEADINGS NAME THE FIGURES AS SAMPLES**, on the screen and in the prompt —
  *"on the screen's own sample figures"*. These are teaching figures; once they became real
  numbers the AI could quote, the caveat had to sit beside the number rather than only in
  the model's limits further down. Ruled by Mike, 2026-08-22. Tests fail if either heading
  loses it.
- ⚠ **A GAP WITH NO FIGURE FAILS THE BUILD**, and a figure that will not compute degrades to
  `—` — the reports' own no-figure convention. **A brace must never reach a screen**: that
  was item 4.34, and it is what this principle exists to stop recurring.
- ⚠ **A MODEL WHOSE DEFAULTS LIVE ONLY IN ITS COMPONENT CANNOT DESCRIBE ITSELF.**
  Margin · Mark-up · Break-even computed a page of zeros from the backend for exactly that
  reason. Its defaults are mirrored into the model with a test pinning them to the screen's.
  **Its live route was deliberately not changed to fall back on them** — its overheads and
  drawings sliders both start at zero, so *"missing"* and *"dragged to nothing"* are the same
  value on the wire, and defaulting there would silently overwrite a real choice.

**P11 · A catalogue row goes ready in the SAME change as its page.** Flipping
`STATUS_READY` earlier fails the build:
[`reportShellFrame.test.js`](../../tests/unit/reportShellFrame.test.js) derives its list
from the catalogue's ready routes and fails when a ready model has no shell-wrapped page.
⚠ **[`ADDING-A-REPORT.md`](../ADDING-A-REPORT.md) numbers the catalogue (step 5) before
the page (step 6), and the guard does not care about the numbering.** The recipe's order
is a reading order, not a commit order.

**P12 · A golden test may have two provenances, and every number says which it is.** The
normal case is one: the workbook's own cached value with its cell reference. But where the
workbook is **wrong** and the owner has ruled a correction, those figures cannot come from
the spreadsheet — they are worked out here, and each one carries its arithmetic in the
comment beside it so it can still be checked by hand.

**Label them individually, never a blanket note at the top.** A reader looking at one
expectation must be able to tell, from that line, whether it is evidence or reasoning.
✅ **Then find the case that proves the port did not disturb anything else:** for the
property model, the *repay* ending reproduces the workbook's own years 9 and 10 to the
last decimal, which confines the correction to exactly what was ruled.

**P13 · A mutation that PASSES may mean dead code, not a weak test.** When a fix is
reverted on an out-of-repo copy and the suite stays green, the two possibilities are a
gap in the tests **or** an equivalent mutant — code that cannot change behaviour.
🔴 **Establish which before writing a test to cover it.** On 2026-08-17 a rate guard in the
property model's depreciation looked untested; it was in fact unreachable, because the
clamp on the next line already did the work. The honest fix was to delete the guard and
test the clamp — writing a test for the dead branch would have pinned code that does
nothing and read as coverage.

---

## 3. Design considerations — check these before changing anything

**No test can see your layout.** jsdom has no layout engine, so nothing in the suite can
measure a rendered width or a gap. A shrunk header or a wrong gap passes every test in the
repo. **If a change could affect rendered geometry, build a visual artefact first** — a
faithful HTML render of the real CSS, sections labelled — and get the owner's eyes on it
*before* editing the repo. A shareable link, not terminal output.

**The layout skeleton is a saved artefact, not a description.**
[`../REPORT-LAYOUT-REFERENCE.html`](../REPORT-LAYOUT-REFERENCE.html) renders a real screen
with every section tagged **[A]–[D2d]**. Open it beside what you are building and match it.
Keep it on file.

**A consistency ruling applies to the whole section, not the screen you happen to have
open.** If a look changes, inventory every model and change them in one pass.

**Uniform, not identical.** These differ legitimately because the content differs: the
number of headline figures (3 or 4), the chart or diagram, sliders vs typed inputs, the
figures and verdict wording, and one model-specific accent where it earns its place.
Anything outside that list is an owner decision, not a screen's decision.

**Do not force sharing that isn't there.** `SliderField` covers four screens; Quick
Position's sliders carry provenance badges and a dynamic ceiling, and EBITDA/DCF has no
sliders at all. Gradients on data marks are a readability decision. Neither is duplication
to be tidied away.

---

## 3a. What the AI is told about these models

**Ruled by Mike, 2026-08-21 (to-do item 4.29):** *"ensure that each of the performance
models have a 'key calculation output' page or section, so that the AI can read what the
model serves"*, and *"place it wherever you want, it's for AI - not the advisor or
manager"*.

**Where it lives.** [`../../data/report-model-summaries.json`](../../data/report-model-summaries.json)
holds one entry per live model — what it answers, its **key calculation output** (the
screen's real hero figures), what the advisor must be able to supply, when to reach for it,
and **what it does not cover**. [`../../server/utils/reportModels.js`](../../server/utils/reportModels.js)
renders it into the client-mode prompt.

🔴 **It has a screen — the Model Guide at `/model-guide`.** See **P20** above for what it
is and what holds it current.

**Mike's ruling above — *"it's for AI - not the advisor or manager"* — is still the live
ruling on WHO MAY EDIT THIS CONTENT.** A
description of what a calculation does is **a fact about the maths, not authored advisory
judgement** — nobody at any tier gets to decide that Lease vs Buy answers a different
question than it answers. So the screen that was built is a **reader, not an editor**:
verified 2026-08-22, `components/ModelGuide.vue` carries no control but a search box and a
retry, and the route is a `GET` with no writing counterpart. It is reached from the Model
Library rather than from a hub tab, and it is not tier-gated — it is platform content
describing the app's own screens, and holds no client or firm data.
⚠ If a firm ever wants to say when *its* advisors should reach for a model, that **is**
authored judgement and needs an editable screen at the mentor tier first. Do not widen the
JSON to hold it.

**THE SEARCH MEETS THE ADVISOR'S WORDS, NOT THE PAGE'S.** The search takes each word
separately, drops filler (`SEARCH_NOISE` in `ModelGuide.vue` — *should*, *my*, *more*), and
trims common endings so *paying* reaches *pay*. Every word must still appear, so more words
always narrow. Each model also carries a `searchWords` list in
`data/report-model-summaries.json` — the everyday words an advisor types (*houses*, where
the page only ever says *property*). **That field is read by this screen alone and never
reaches the AI** (`formatReportModelsForPrompt` reads named fields), so it is not content
shaping advice and needs no manager screen; if a firm ever wants its own vocabulary, that
judgement changes.
⚠ Deliberately NOT fuzzy matching or an embedding search: with ten models a confident wrong
match is worse than a miss, because the advisor takes the suggestion into a client meeting.
The cost is that an unanticipated word still misses — the fix is a word on the model's list.

🔴 **A MODEL WITH NO PAGE IS NEVER NAMED.** Eight catalogued models are `STATUS_SOON` with
no route. `tests/unit/reportModelSummaries.test.js` holds the file to the catalogue **both
ways** — a summary for a model that is not ready fails, and a ready model with no summary
fails. So the day a `SOON` model goes live the build says it needs an entry, rather than
the model quietly staying invisible.

⚠ **ADDING A MODEL TO THE CATALOGUE NOW MEANS ADDING A SUMMARY.** If you make a model
`STATUS_READY` and give it a route, the suite fails until
`data/report-model-summaries.json` has its entry — including its **limits**, which is not
optional. That is deliberate: a model recommended without its limits is how an advisor
promises a client something the screen does not do.

**And the AI is invited to use it** (item 4.32, Mike 2026-08-22: *"yes and both if its
appropriate"*). `discover.txt` carries an **"A calculator that fits"** block inside its
format; `client.txt` carries hard rule **R18**. Both are written as an invitation **with a
brake**: only when a model directly answers the situation, always with its exact page path,
only from the list, and never in place of a template.

🔴 **THE SEARCH MODE'S CLOSING RULE WAS NOT LOOSENED.** *"MUST be the final line… End there.
Full stop."* still stands; the calculator block sits **above** it. A test asserts both. That
rule exists so the AI stops talking — if a future change needs room after the closing line,
that is a decision to take on its own merits, not a side effect.

🔴 **R18 IS NOT AN EXCEPTION TO R17.** R17 fixes the recommended template set. A model is not
a template and never joins, replaces or reorders it. R18 says so in terms, because two hard
rules that appear to contradict each other are two hard rules the model gets to choose
between.

**A model that shares a name with a template does not get that template's tutorial video
attached to it.** `videoInjector` matches bold text after the AI has finished writing, so it
cannot tell a calculator reference from a template recommendation. It stays quiet when the
bolded name is a known model **and** the text sends the advisor to a calculator route —
both conditions, so a genuine recommendation keeps its video. The guard is built from
`report-model-summaries.json` rather than the names that collide today, so cataloguing
another colliding model cannot reopen it silently.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| Maths models (pure, CommonJS) | [`server/report/`](../../server/report/) |
| Routes | [`server/routes/report.js`](../../server/routes/report.js), registered in [`server/restify-server.js`](../../server/restify-server.js) |
| Catalogue (single source for what exists) | [`utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) |
| What the AI is told each model serves | [`data/report-model-summaries.json`](../../data/report-model-summaries.json), rendered by [`server/utils/reportModels.js`](../../server/utils/reportModels.js) — §3a |
| The shared frame + `--rs-*` tokens | [`components/base/ReportShell.vue`](../../components/base/ReportShell.vue) |
| Shared blocks | `components/base/` — `ReportHeader` · `HeroStrip` · `HeroFigure` · `StaleBanner` · `SliderField` · `ProvenanceBadge` |
| Mixins | `currencyMixin` (money formatting) · `reportRecompute` (debounce, race guard, stale flag) |

### The build recipe

Eight steps, with copy-paste templates:
[`../ADDING-A-REPORT.md`](../ADDING-A-REPORT.md). The ruled visual numbers:
[`../REPORT-VISUAL-STANDARD.md`](../REPORT-VISUAL-STANDARD.md). Class rules:
[`../MODEL-CLASSIFICATION.md`](../MODEL-CLASSIFICATION.md).

### The five guards

| Test | Fails the build if… |
|---|---|
| `reportShellFrame.test.js` | a live report's page does not wrap its screen in `<report-shell>` |
| `reportHeadlineConsistency.component.test.js` | a screen hand-rolls its headline, nests the banner in a column, or leaves stale figures bright |
| `reportHeaderFullWidth.test.js` | a screen renders the header itself without resetting its margin |
| `reportBadgeClass.component.test.js` | the badge does not match `modelClass` — **a shipped report absent from the map is a failure, not a skip** |
| `reportModelSummaries.test.js` | a live model has no summary for the AI, a summary names a model with no page, a summary omits its limits, or the block stops reaching the assembled prompt |

All five are mutation-verified.

### Traps that have actually bitten

1. 🔴 **The consistency guard's `SCREENS` list is manual.** It is the one step in the whole
   recipe that nothing checks. Skip it and your screen ships unprotected and green.
   *(The frame guard is automatic — it reads the catalogue's ready routes.)*
2. **The header margin reset is mandatory** when the header is rendered inside the screen:
   `.<root> ::v-deep .rs-top { margin: 0 }`. The shared header carries `margin: 0 auto 22px`;
   inside a flex column that auto margin shrinks it below full width *and* stacks 22px onto
   the gap.
3. **`error` is a boolean, not a message.** Never render it. Rendering it put the literal
   word "true" in front of advisors for a day.
4. **Delete the local `money()` you were about to write** — and the local debounce, and the
   local race guard. The mixins own all three.
5. **Assemble the payload in the model, not the route.** One model does it in the route and
   its test has to mirror the route by hand.

## 4b. The two intakes — annual, and by-month

> **Which accounting packages they read (2026-09-02).** Xero, QuickBooks Online and MYOB.
> The list is one fact stated once, in
> [`server/report/intake/supportedPackages.js`](../../server/report/intake/supportedPackages.js);
> every screen line and refusal message is built from it, and a test fails the build if the
> locale string and the module ever name different packages.
>
> **Only Xero is `verified`** — read from real exports the firm supplied on 2026-07-13 and
> 2026-07-15, which refuted three assumptions in the process. QuickBooks Online and MYOB are
> `expected`: the readers handle their published layouts, checked against reconstructions in
> [`tests/unit/accountingPackages.test.js`](../../tests/unit/accountingPackages.test.js), and
> **no real export from either has been read**. Every intake screen says so, and item 4.60
> holds the four files that would close it. **Do not promote a package on more
> reconstructions** — the guard refuses `verified` unless the evidence names a real export.
>
> Pointing the reader at those two layouts on 2026-09-02 found five real defects, all fixed:
> the `"As of"` date line was never read; header rows were walked as body rows; the company
> name sits *above* the title in both packages and *below* it in Xero, so the scan took the
> first section heading as the company and lost that whole section; QuickBooks' single
> `LIABILITIES AND EQUITY` heading made every liability beneath it read as equity; and MYOB
> lists bank accounts with no `Bank` heading above them. Assume the next package will break
> something too, and probe it the same way.

There are **two** file readers, and which one a model uses follows from the shape of its
inputs. Both read `.xlsx` and `.csv`, both refuse a PDF by name, both share one hardened
buffer reader (`gridsFromBuffer` in `xeroReportParser.js`), and both are parse-and-discard:
the upload is deleted the moment it has been read, nothing is stored, and no filename,
account label or company name is ever logged.

**Annual — one figure per period.** `xeroReportParser.js` (`parseUpload`), used by Quick
Position and EBITDA & DCF. It **deliberately refuses** a by-month or by-quarter export
(`MULTI_PERIOD_COLUMNS`, at 5+ figure columns): reading only the first column silently lost
the rest of the year, which is the fault that refusal exists to prevent. That refusal stays.

**By-month — a monthly series.** `monthlySalesParser.js` (`parseMonthlyUpload`) plus
`monthlySeriesAssembler.js`, used by the Volatility Report via
`POST /api/report/volatility/intake` (firmAuth — uploads are never anonymous). Up to **two**
files join into one run. It reads **two shapes**:

1. **The by-month P&L** — Xero's *"Current financial year by month"* layout, read **across**
   its columns. One export = one financial year, so the 18 and 24-month windows need two.
2. **The Account Transactions export** — one row per invoice, the date an Excel serial, summed
   into months. Added 2026-08-31 when Mike's own export was refused; he was right that the file
   was fine and the reader was not. **This is the better source**: it spans as many years as the
   advisor asks for, so one file can fill the whole 24-month window.

> 🔴 **The two shapes read a `0` OPPOSITELY, and both readings are correct.** In a by-month P&L
> a zero means the year has not reached that month — it is missing data, and it is poison to
> this model. In a transaction listing it means nothing was invoiced, which is real, and is the
> lumpiness the report exists to measure. Get this backwards and you either wreck the numbers or
> quietly delete the quiet months and flatter the business. A transactions export also takes its
> **partial** months from its own period line (`For the period 20 August 2024 to …`), at BOTH
> ends — a leading part-month is trimmed exactly as a trailing one is.

> 🔴 **Three findings that a by-month export will hand you, each producing a number that is
> wrong and completely believable.** Verified against a real client export
> (`../REPORT-DATA-MODEL.md` §3.9) — do not "simplify" any of them away.
> **(a)** Months after the data cut-off read as a genuine **0**. Averaged in they drag the
> mean down and widen the standard deviation. **(b)** The month at the cut-off is usually
> **partial**, because the export was taken mid-month; it reads as a collapse and lands
> outside the third deviation. It cannot be detected from the cells, so it is *inferred* —
> a month is partial only when empty months follow it, which is what proves the export is
> mid-year. A fully populated file is a closed year and has no partial month. **(c)** The
> **year-to-date column is not a month**.
>
> All three are handled by *showing the advisor*, never by deciding silently: the months
> come off the end of the window, the window slides back over the earlier complete months,
> and each one appears in its own box to be overtyped. A month restored this way rejoins as
> the newest month and the window shifts by one — a month cannot be spliced out of the
> middle of a series, on the screen or in the assembler.

**"Which rows are sales?" has exactly one definition** — `INCOME_RULES`, exported from
`xeroReportParser.js` and used by both readers: trading-income line items only, with Other
Income, interest, dividends and bad debts recovered excluded, and never a `Total` row. Two
copies of that rule would mean the same client file yielding two different revenue figures
depending on which export was dropped.

### Known open gaps

**Hardcoded English on the older screens.** User-facing strings on the report screens built
before 2026-08-31 are hardcoded rather than going through `$t()`. This breaches the Stack
Constitution, is a logged P1, and **must not be copied** into a new screen. The **Volatility
Report** is the worked example of the compliant pattern — every string on it is a key in
`locales/en.json`, month names included — so copy that screen, not its neighbours. A string
hardcoded in a template stays English for ever; one in `en.json` can become any language.

**The Three-Way Forecast is complete, end to end.** A full twelve-month linked profit &
loss, balance sheet and cash flow ported from `3 way Filter.xlsx` — **10,155 of its 10,227
calculated cells reproduced exactly across all three years**, the largest golden set in this
repo — behind all four screens of the approved drawing
([`../mockups/three-way-forecast.html`](../mockups/three-way-forecast.html)): drop the
exports, confirm the opening position, set the assumptions, the forecast. **Ten corrections
to the source workbook were each ruled by Mike** — nine on 2026-09-02, and R10 on
2026-09-03, which is the only one that is not an aggregation repair: the workbook holds one
figure per asset sale, so an asset could only ever sell for exactly its written-down value.
The evidence for every one is in
[`../THREE-WAY-FORECAST-DEVIATIONS.md`](../THREE-WAY-FORECAST-DEVIATIONS.md), and the
largest overstated year-one profit by 55,654. Month stepping was one of them: the workbook
advanced by 31 days, so its third year ran three weeks adrift — **ruled and fixed 2026-09-02
("obviously, it needs to be per calendar month")**.

> 🔴 **The lesson this build is worth remembering for, and it applies to every model here.**
> `resolveInputs` merges what a screen sends over the workbook's own sample, so **an input the
> screen does not collect keeps the sample's value and nothing on the page says so**. Built
> exactly as drawn, the intake would have put a 10% sales commission, 3% freight, 7% overdraft
> interest and 15,000 a year of Big Bird Grass Seed's overheads into a real client's forecast,
> invisibly. Mike ruled 2026-09-03 that every figure the engine takes goes on a screen, which
> is why the opening table carries 17 lines rather than 10 and the overheads 23 rather than 14.
> **`buildInputs()` therefore sends every key the model takes, explicitly**, and
> `tests/unit/threeWayForecastIntake.component.test.js` compares what it sends against the
> model's own key list — so an input added to the engine later fails a test instead of leaking.
> **Any new model with a defaults-merge takes the same guard.**

**Step 1 takes SIX files, four of them optional** (2026-09-03, items 4.61a and 4.61b): this
year's Balance Sheet and Profit and Loss, **two by-month exports** — this year's and last
year's — and **last year's Balance Sheet and Profit and Loss**, which are what the two-year
trend read below is built from. An advisor who drops only the first two gets the screen they
had before either was added; nothing is withheld and no figure changes.

**The two by-month exports, this year's and last year's** (item 4.61a).
The most recent twelve complete months arrive tagged `seeded` — a starting point, never a
forecast, and its own third badge state on `ProvenanceBadge`. The second file is not a
convenience: a current-year export almost always stops part-way through a month, and
`assembleMonthlySeries` strips incomplete trailing months, so **one file can yield eleven
usable months and no seed at all**, leaving the advisor to type twelve by hand. With 24
months in hand the twelve are always there. Where the two files overlap, the **older**
file's figures win — a closed financial year has been reconciled and a still-open one is
restating itself — and the advisor is told on screen when it happens.

**Step 3 takes planned capital purchases and sales** (2026-09-03, its own approved drawing
[`../mockups/three-way-forecast-capital.html`](../mockups/three-way-forecast-capital.html)).
A row list — what, category, month, a Buy/Sell tick and the price — folded into the engine's
six-category grid, because 72 boxes of which 70 are zero is a screen an advisor scrolls past
and the two that matter are lost in it. Every amount is positive; the tick carries the
direction, so a minus sign is refused rather than guessed at. **A sale carries TWO figures**:
the price, which the bank and the GST return follow, and the book value, which is what leaves
the asset register — the difference being a gain or loss in the month of the sale (R10). The
app cannot derive that book value and this is structural rather than an omission: it holds
**six category totals**, seeded from Balance Sheet line names, so it knows "Motor Vehicles
80,000" and can never know which van is which. Reading the Fixed Asset Schedule instead is
item 4.65.

**Step 3 takes buying and selling overseas** (2026-09-04, item 4.64, its own approved drawing
[`../mockups/three-way-forecast-international.html`](../mockups/three-way-forecast-international.html)).
Behind one tick — *This business buys or sells overseas* — so a business trading only at home
sees the screen it has always seen. It exists because Mike's own framing of the section was
about **visibility**, not timing: *"the whole point of this section is to show when deposits
are due, freight is paid, border gst etc — BEFORE the business can even start selling them"*.
Rolled into one creditors figure, all of that appears in the month the supplier was settled
and the months that matter are invisible, so the cash flow grows **five rows of its own**:
deposits paid overseas, freight and shipping, duty and clearance, GST paid at the border, and
the balance paid to the supplier. They show only when a forecast actually trades overseas.

**Stock is recorded in the month it LANDS**, not when it is ordered and not when it is paid
for — that is when it becomes stock and when GST falls due at the border, and every other date
is worked out from it. The deposit is therefore paid *ahead* of the purchase month, which the
five-bucket lag schedule could not express at all: it reaches **nine months**, because the
Import & Retail workbook pays roughly 220 days before the first sale, and that gap **is** the
working-capital hole a funding request exists to cover. Border GST is charged on the landed
value — exchange-adjusted stock cost plus freight and duty — and claimed back on the same
return, so it is a timing cost rather than a lost one.

**GST was wrong in both directions before this, and that is the half nobody would have seen.**
Every sale was charged and every purchase credited when the supplier was paid. Exports are
normally **zero-rated** (a tick, defaulted on, since a firm whose overseas sales are genuinely
taxable must be able to say so), and imports pay **at the border**. On the *Cash* basis the
return is worked backwards from money received, so once some receipts are zero-rated the two
streams' collections have to be counted apart or the model invents an output tax nobody
charged.

**Revenue from imported stock is worked out, not typed** — Mike's correction of the first
drawing: *"new stock command a higher initial price if its new to the market but over time,
importers need to offload at a discount - this should be forecasted so all revenue isnt
calculated on an inflated sale price"*. The ladder is his own, read out of `Import &
Retail.xlsx` (`Supplier 1 Inputs` row 19) into
[`../../data/forecast-sell-down.json`](../../data/forecast-sell-down.json): **New +185% /
Standard +152% / Runout +122%** on cost, switching at 60/90/120 stock-turn days, with a demand
pattern saying how much sells in each 30-day band. Pricing it all at the launch figure reads
**6% high for a fast seller and 10% for a slow one** — the wrong percentages to be wrong by in
a document a bank reads. The figures are seeded onto the screen and the advisor can overtype
any month. Because revenue is then *cost × the ladder*, **real unit costs govern imported
stock** and the mark-up governs local: recovering a known cost from revenue would be
arithmetic run backwards to a worse number. Imported stock sold at home counts as a **local**
sale, so it carries GST and collects on the local profile.

> 🔴 **Two balance-sheet positions the drawing never mentioned, and without them the three
> statements stop articulating.** Caught by the balance-check test, not by eye. A deposit paid
> before the goods land is a **prepayment** — the supplier owes you goods — until the container
> arrives; a landed-but-unpaid container is a **liability**. Cash leaves in one month and stock
> arrives in another, and something has to hold the difference. They are `importPrepayments`
> and `importSupplierBalance`. For the same reason the exchange movement on sales comes off the
> **debtor** as well as through the P&L, and freight, duty and both exchange movements are
> expensed in the month they arise. **Any addition that moves cash and stock in different
> months takes the same care.**

**The guard was written before the feature and it is the reason this was safe.** With the tick
off and both series empty, all 3,385 year-one golden cells still match the workbook and the
three statements are byte-identical. It passed trivially the day it was written, which is the
point: it is what refuses a silent change to the port now, and it pins the input shape as a
test rather than a note. **The tick is load-bearing in the engine, not only on the screen** —
figures sent with it off are dropped, so no later caller can bypass the intake and be
surprised.

**What is not built:** the mentor Model Inputs tab that would let the price ladder be edited
(the figures live in the data file and are shown with a *From your platform settings* badge),
and slice 2 — the Import & Retail shipment calculator, absorbed from item 4.63, which will
fill the twelve landing figures from real containers. Its two rulings are already taken: every
event is dated from its order date and filed in the calendar month it really falls in, and
real unit costs govern imported stock.

**Step 3 shows the volatility read** (2026-09-03, its own approved drawing
[`../mockups/three-way-forecast-volatility.html`](../mockups/three-way-forecast-volatility.html)).
Under the sales boxes: the average month, the normal range, the biggest month on record, how
many forecast months fall outside it, the workbook's rev-counter dial, and a chart carrying
the actual months and the twelve forecast months against the same bands. **The bands are
measured from the actual months alone** — measure both together and an optimistic forecast
widens its own normal range and then sits inside it, which is a block that agrees with
whatever it is shown. All of it is `compareForecast` in `volatilityModel.js`; the screen
places dots and decides nothing, because two implementations of a standard deviation is how
a screen and a report start disagreeing. Two bands name a month and ask for the reason —
**amber beyond the second deviation, red beyond the third** — while a month merely outside
the first is drawn hollow, and one that the forecast has not changed is named as the
client's own seasonality rather than warned about. The engine measures 12, 18 or 24 months,
so the block takes the **largest of those the months in hand support** and says which it
used. The dial is shared with the Volatility Report
([`VolatilityDial.vue`](../../components/base/VolatilityDial.vue)): its geometry and its
50/75 boundaries are measured from the workbook's own gauge images, and two copies would
drift into a needle pointing at different places on two screens showing the same client.

**Step 3 also shows the two-year trend read** (2026-09-03, its own approved drawing
[`../mockups/three-way-forecast-trend.html`](../mockups/three-way-forecast-trend.html), item
4.61b). Under the volatility block, six measures against last year: sales growth, gross
margin, overheads against sales, debtor days, creditor days and stock days — each showing
both years, the movement, and a green / amber / red band. **It changes no forecast figure**,
and that is enforced rather than intended: the assembler returns `trendInputs`, the route
consumes it and deletes it, and a test asserts the engine payload is byte-identical with and
without it. The day-counts in particular never seed a collection profile — an export records
no money-received dates, so a debtor-day average describes a year rather than saying when
money moved.

**Two bases, and the split is a ruling rather than a convenience.** The three day-counts band
on **this year's level**, each with its own numbers; the three percentage measures band on the
**movement between the two years**. A level is what an accountant reads on a day-count and it
travels across trades, whereas a gross-margin level does not — alarming for a retailer,
routine for a builder — while a margin that fell three points is worth a look in any trade.
Mike's own figures are debtor days 35/45, creditor days 35/45, stock days 30/60, sales growth
amber below 0% and red below −5%, and gross margin and overheads 1 and 3 percentage points.
The last pair share their numbers because a point of margin lost and a point of overheads
gained cost exactly the same money — both are a point of sales. **A measure with no threshold
is shown in full and never banded**, which is a supported setting rather than a gap.

**The thresholds live on a screen, not in a constant** — the mentor's *Forecast Trend
Thresholds* tab under Model Inputs, beside Property Tax Rules, with version history and
restore. That is what makes banding safe: the numbers are the firm's advisory judgement, so
they have to be visible and changeable. Mentor tier alone for now; the resolver and routes
carry every tier already, so a firm that needs its own numbers costs one line in `TAB_TIERS`.

**The parser was never touched, and the item's own premise was wrong.** 4.61(b) was filed as
needing `xeroReportParser` taught to read a comparative export's second figure column as a
prior period, naming `MULTI_PERIOD_COLUMNS` as the guard not to weaken. It needed neither: the
parser already reads both reports and already records each report's own year, so last year
arrives as two more file slots and the guard is never approached. 🔴 **Which of two files is
this year is decided by the reports' own date lines, never by upload order, and a pair that
cannot be dated apart is REFUSED.** Getting it backwards would open the forecast from last
year's position — every figure plausible, every figure a year stale, nothing on screen to
notice it by — and a file picker returns whatever order the operating system gives it. Two
periods that are not a like-for-like year apart are refused for the same reason: a nine-month
period against a twelve-month one gives a growth figure that looks right and is not. A measure
that cannot be worked out is **left out and the reason given once** — never a zero, never a
dash to interpret.

**Both of the screen's judgement calls are ruled (Mike, 2026-09-03).** Stock below zero is
**named in a red band**, not left as a figure among figures: it is impossible rather than
merely bad, and an advisor scanning twelve columns reads past a minus sign. An opening
balance sheet that does not balance **warns rather than blocking** — it is the advisor's
own figures that are out, and refusing to compute would hide the forecast that tells them
so — **and the warning is a full-width band, not only the sidebar tile, so it survives into
the print.** A gap in a sidebar is easy to hand a client without noticing; the band cannot
be. Both bands rest on `balanceCheck !== 0`, which is safe because the check cancels to an
**exact** zero even on fractional figures — pinned by a test, because a speck of floating
point would put a red band announcing a gap "of 0" in front of every client.

**This model is the only one that reads a FORECAST rather than history.** Every other
Report-class model reads what has happened; this one is about what will. No accounting
export contains a future, so the intake seeds the starting position and the cost base only,
and its `provenance` map carries a third value beside `file` and `entered` — `seeded`, for
figures taken from last year's actuals as a starting point. A screen that showed `file` and
`seeded` identically would tell an advisor that a judgement about next year is a fact about
this one.

**Two models read a monthly series — Volatility and the Three-Way Forecast** — and both go
through the same pair, `parseMonthlyUpload` + `assembleMonthlySeries`. A new model taking
monthly inputs reuses them rather than growing a third reader, and should expect the same
three findings above, because they are properties of the export, not of any one report.
The forecast shows how a model borrows the series without owning it: it does the join in
its own route, seeds the sales boxes from the last twelve values, and keeps the **whole
run** — up to 24 months — for the volatility read on step 3.

---

## 5. Before you ship

Work the checklist at the end of [`../ADDING-A-REPORT.md`](../ADDING-A-REPORT.md), then:
open the approved artefact, put it beside the build, and **name every difference.** A
deliberate deviation is fine. An unrecorded one is not. If the artefact cannot be found,
say so *before* building.

🔴 **Then READ THE SCREEN'S OWN WORDS. Mount the finished component with the real
`locales/en.json` — not the key-returning stub the component tests use — and read the
rendered text end to end, as an advisor would.** It costs one throwaway file and it is not
optional.

*Why it is a step and not a nicety:* reading once found two defects with the whole suite
green — a cash deposit rendered as a row of dashes because a scalar was indexed as a
ten-year series, and an input sitting blank beside a total that had plainly had that very
figure deducted from it. Neither is a maths error and neither is a layout error, so
**neither the golden tests nor a mockup can see a screen quietly saying something untrue** —
only reading it finds that.

⚠ **Reading rendered text is still NOT seeing a laid-out page.** §3's rule stands: jsdom has
no layout engine, so no test in the suite can see a shrunk header or a box too small to read
its own digits.

🔴 **A browser driver IS installed — what is missing is a TEST that uses it.** `playwright`
is a declared devDependency at exact `1.34.3`, with an `npm run visual:setup` script that
installs Chromium for it. Layout is still unverified by anything in `tests/`, so keep
saying so — but "we have no way to look" is no longer the reason.

---

## 6. Rules of this page

- **The Brief holds current rules. The History holds everything else.** Nothing in this
  file is dated, argued, or attributed to a session.
- **It links artefacts, it never paraphrases them.** Where a mockup or reference render
  exists, this page points at the file.
- **If a number here disagrees with the code, that is a defect to report, not a choice to
  make.** These numbers were ruled by the owner. Do not silently adopt whichever you find
  first, and do not update this page to match a drift.
- **When a session establishes a new rule, it is written here in that same session** — not
  left in a session note to be rediscovered.

**History and the arguments behind these rules:**
[`report-models-history.md`](report-models-history.md)

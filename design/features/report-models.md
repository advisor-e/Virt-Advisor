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
- **`coachIsNotAPanel: true` where the screen has no Coach panel.** **Eleven** models —
  8 Levers, Cost of Capital, **Lease vs Buy**, the Loan Estimator, Dashboard Reports, the
  High-Level Budget, the Mid-Level Budget, the Retirement Review, Stock Purchasing, the
  Sales Dashboard and the Wages/Salary Review —
  carry explanatory notes and verdict rules instead, and the screen heads them differently
  (Dashboard Reports is the client's own document; its reading is the health score and the
  advisor's words on its pages. The High-Level Budget's reading is the variance table itself —
  every line says *Better* or *Worse* beside its own figure, which is where a coach panel's
  sentence would have gone. The Mid-Level Budget carries that same table, and its own finding
  is already on the screen twice over — the cash-collected row against the sales invoiced, and
  the still-owed figure under it. The Retirement Review's reading is its verdict panel and the
  card naming where its figures differ from the spreadsheet; a third block of prose beneath
  them would repeat both. The Sales Dashboard's reading is written under each card on the
  approved drawing — the footnote that puts transactions beside value and margin, and the one
  that says what the trend answers that the ranking cannot). Claiming a Coach panel that is
  not there describes a screen the reader will not find.
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

🔴 **A MODEL WITH NO PAGE IS NEVER NAMED.** Three catalogued models are `STATUS_SOON` with
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
| ⚠ The one AI call in this area — **not in `report.js`** | [`server/routes/economicAnalysis.js`](../../server/routes/economicAnalysis.js) (the Three-Way Forecast's optional market research, item 4.66), with [`server/report/economicAnalysis/researchResult.js`](../../server/report/economicAnalysis/researchResult.js) checking what comes back and [`server/utils/economicAnalysisRuns.js`](../../server/utils/economicAnalysisRuns.js) holding the runs and approvals. Its own file because it is the only route here that returns a job and polls. What it sends: [`../ECONOMIC-ANALYSIS-PROMPT.md`](../ECONOMIC-ANALYSIS-PROMPT.md). 🔴 **BANNED SOURCES ARE ENFORCED, NOT ASKED FOR** — `reddit.com` (Mike, 2026-09-08) is named in the prompt's §3 **and** refused by `validateResearch` as `SOURCE_NOT_PERMITTED`, because §3 already said *"prefer primary and official sources"* and the model cited it anyway. The list is `bannedSourceHosts` in `data/ai-prompts.json`, written once and read by both, so it shows on the **AI Prompts** tab and a site can be added without a developer. Subdomains are caught; look-alike domains are not |
| The screen that calls it | [`components/EconomicAnalysisStep.vue`](../../components/EconomicAnalysisStep.vue) — **step 5** of [`pages/three-way-forecast.vue`](../../pages/three-way-forecast.vue), optional and reachable from anywhere, because it needs nothing from the forecast. **The advisor writes the brief and reads back the exact words before they are sent** (Mike's privacy ruling, 2026-09-06): the request carries `brief` and `clientRef` and nothing else, asserted key by key in `tests/unit/economicAnalysisStep.component.test.js`. ⚠ **No `v-html`** — model text is parsed into text/bold/link tokens (the shared parser [`utils/researchText.js`](../../utils/researchText.js), so the screen and the pack cannot drift), and a `javascript:` link cannot render |
| The section a lender reads | [`components/EconomicAnalysisPack.vue`](../../components/EconomicAnalysisPack.vue) — **print-only**, rendered by the page after the report so it prints from step 4, where step 5's own component is hidden. 🔴 **It prints only on `approval.isApproved`**, never on the screen's tick alone: research nobody accepted, research from a run that was re-run, and research withdrawn by unticking the step all print nothing. It carries no anchor at all — paper has no clicks, so a citation is the source's name and every address is written out in full at the end |
| Catalogue (single source for what exists) | [`utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) |
| What the AI is told each model serves | [`data/report-model-summaries.json`](../../data/report-model-summaries.json), rendered by [`server/utils/reportModels.js`](../../server/utils/reportModels.js) — §3a |
| The shared frame + `--rs-*` tokens | [`components/base/ReportShell.vue`](../../components/base/ReportShell.vue) |
| Shared blocks | `components/base/` — `ReportHeader` · `HeroStrip` · `HeroFigure` · `StaleBanner` · `SliderField` · `ProvenanceBadge` (**five** states: `file` · `entered` · `seeded` · `client` · `ai`) |
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
| `reportHeaderFullWidth.test.js` | a screen renders the header itself without resetting its margin — **it DISCOVERS its screens by reading `components/`** (since 2026-09-13; see trap 1) |
| `reportBadgeClass.component.test.js` | the badge does not match `modelClass` — **a shipped report absent from the map is a failure, not a skip** |
| `reportModelSummaries.test.js` | a live model has no summary for the AI, a summary names a model with no page, a summary omits its limits, or the block stops reaching the assembled prompt |

All five are mutation-verified.

### Traps that have actually bitten

1. 🔴 **The consistency guard's `SCREENS` list is manual.** It is now the ONLY list in the
   recipe that nothing checks. Skip it and your screen ships unprotected and green.
   *(The frame guard reads the catalogue's ready routes; the header-width guard reads
   `components/`. Both discover their subjects and cannot go stale.)*

   ⚠ **A hand-typed guard list HAS failed, and it is why the other one was changed.** The
   header-width guard carried nine filenames that stopped growing after Cost of Capital,
   while the app reached **thirteen** screens rendering the header inside themselves. It was
   checking **six of thirteen** and calling itself live, because its floor asked only for
   "at least five". **Mike found the consequence by looking at the screen on 2026-09-13**:
   Stock Purchasing's header band rendered **364px wide inside a 1076px column**, marooned in
   the middle while everything beneath it spanned the page, with a 38px gap under it where
   every other report has 16px. Nothing had ever told this recipe to add a file to that list,
   so seven screens were written and none of them added. It now reads the directory.
2. **The header margin reset is mandatory** when the header is rendered inside the screen:
   `.<root> ::v-deep .rs-top { margin: 0 }`. The shared header carries `margin: 0 auto 22px`;
   inside a flex column that auto margin shrinks it below full width *and* stacks 22px onto
   the gap. **Twelve screens had it and one did not** — see trap 1.
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
> ✅ **ALL THREE ARE `verified`.** Xero from real exports the firm supplied on 2026-07-13 and
> 2026-07-15, which refuted three assumptions in the process; **QuickBooks Online and MYOB from
> real exports Mike supplied on 2026-09-07** — `QuickBooks_Online_Financial_Exports.xlsx` and
> `MYOB_Financial_Exports.xlsx`, three reports each. **Do not promote a package on
> reconstructions** — the guard refuses `verified` unless the evidence names a real export.
>
> 🔴 **THE MYOB FILE BROKE THE READER FOUR TIMES, AND THAT IS WHY IT IS KNOWN TO BE GENUINE.**
> Its `Account No.` column made every label arrive as an account code, so the balance sheet
> parsed to no figures at all with no error saying so; cash read 64,500 of a real 89,500;
> the `"January 2025 through December 2025"` period line gave the P&L no date and no year; and
> `"Property, Plant & Equipment"` — the accounting standard's own wording — passed no
> fixed-asset test, so 145,300 was swept into current assets, the balance sheet still tied, and
> the forecast opened every asset at zero. **A reconstruction reflects what its author expected
> and cannot surprise you four times.** All four are fixed and pinned.
>
> ⚠ **These two were recorded as reconstructions for a day**, on the reasoning that both
> workbooks describe the same fictional company with the same figures. That is what testing two
> packages honestly looks like — the same business entered in both — and it says nothing about
> which software produced the file. **A parser reads layout; figures cannot tell you anything
> about it.** Corrected by Mike on 2026-09-08.
>
> Pointing the reader at those two layouts on 2026-09-02 found five real defects, all fixed:
> the `"As of"` date line was never read; header rows were walked as body rows; the company
> name sits *above* the title in both packages and *below* it in Xero, so the scan took the
> first section heading as the company and lost that whole section; QuickBooks' single
> `LIABILITIES AND EQUITY` heading made every liability beneath it read as equity; and MYOB
> lists bank accounts with no `Bank` heading above them.
>
> 🔴 **A FULLER MYOB REFERENCE WORKBOOK ON 2026-09-07 FOUND THREE MORE, AND THE FIRST OF
> THEM MEANT MYOB READ NOTHING AT ALL.** MYOB puts the account code in a column of its own
> before the name, so `rowShape` took the code as the label: every section came through as
> `4-0000`, nothing matched, and a whole balance sheet parsed to no figures — accepted on
> screen with no error saying so. Then cash read **64,500 of a real 89,500**, because
> `BANK_ACCOUNT_RE` matched "savings account" but not MYOB's own "Online **Saver** Account" —
> a short figure, not a missing one, and the harder of the two to notice. Then the period
> line `January 2025 through December 2025` matched no pattern, so the P&L had no year at
> all. All three are fixed and tested; QuickBooks needed no change.
>
> ⚠ **One MYOB gap is open:** the fixed-asset categories come back empty where QuickBooks
> fills them, so an MYOB user places those by hand.
>
> **The lesson is about the fixtures, not the packages.** The MYOB grids in the test file
> carried no account-code column, which is why they passed while the reader extracted
> nothing — the fixtures agreed with the code and neither agreed with the format. Assume the
> next package will break something too, and probe it with a file, not a fixture.

There are **two** file readers, and which one a model uses follows from the shape of its
inputs. Both read `.xlsx` and `.csv`, both refuse a PDF by name, both share one hardened
buffer reader (`gridsFromBuffer` in `xeroReportParser.js`), and both are parse-and-discard:
the upload is deleted the moment it has been read, nothing is stored, and no filename,
account label or company name is ever logged.

**Annual — one figure per period.** `xeroReportParser.js` (`parseAnnualReports`), used by Quick
Position and EBITDA & DCF. It **deliberately refuses** a by-month or by-quarter export
(`MULTI_PERIOD_COLUMNS`, at 5+ figure columns): reading only the first column silently lost
the rest of the year, which is the fault that refusal exists to prevent. That refusal stays.

🔴 **A workbook contributes every report it holds, and the caller takes what it needs**
(item 4.79, 2026-09-08). Both readers walk every sheet — `parseAnnualReports` and
`parseForecastReports`, over one shared `reportsFromBuffer`. It matters because a real MYOB or
QuickBooks export is **one workbook** holding a Profit and Loss, a Balance Sheet and an asset
register, and both put the P&L first; Xero exports one report per file, which is the shape
every fixture used before this and the reason none of them caught it.

Each caller then takes what its own screen needs, and none of them takes "the first":

- **The forecast** takes every report — one drop seeds the opening position and the cost base.
- **Quick Position** takes every report. Its screen already keeps a Balance Sheet result and a
  P&L result side by side and routes each by kind, so one drop fills both zones.
- **EBITDA & DCF** takes the P&L, whichever sheet holds it. A file with no P&L in it still
  fails loudly with `WRONG_REPORT_KIND`, naming the file position.

Reading only the first report failed each of them differently: the forecast refused the drop
with *"A Balance Sheet is needed"* while the advisor was looking at the file containing one;
Quick Position ticked the P&L zone, left the Balance Sheet unread and disabled Continue with
nothing on screen saying why; and EBITDA failed the whole upload whenever the Balance Sheet
happened to come first.

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

🔴 **NOTHING ON A BALANCE SHEET IS DROPPED, and step 2 says so the moment it does not tie**
(2026-09-05). Only non-current assets had a catch-all; current assets, current liabilities
and equity discarded any row the parser could not name, and equity had no catch-all slot to
sweep into at all. Found by putting a real Xero export through the running app: the file tied
to the cent in Xero — net assets and total equity both −635,494.05 — and the forecast opened
from it **1,559,449.79 out of balance**, having silently lost 18 rows worth 1,039,910.17 of
current assets, 3,090,713.29 of current liabilities, 8,546.67 of long-term liabilities and
499,900.00 of equity. **Every section now sweeps its unrecognised rows into its own `Other`
slot** — including a new eighteenth opening line, **Other equity** — and the screen names
what landed there so the advisor can move it. **The opening balance check is now shown on
step 2**, where the figures are, rather than on step 4 after three screens of assumptions; it
warns and never blocks, and lists the four things that actually cause it.

> ⚠ **The test that was already there did not catch it, and that is the part worth keeping.**
> It asserted the monthly balance check equals the OPENING one — that the gap does not *grow*.
> A gap of 1.5 million that stays exactly 1.5 million passed it every time. What nobody had
> asserted is that **a balance sheet which balances in the accounting package balances here**.
> That assertion now exists.

**Where the swept rows belong — three rulings, 2026-09-05, and two of them changed no code.**
*Funds introduced* and *capital introduced* are now read as **shareholder current accounts**:
they are what Xero and MYOB call owner money in credit, the balance sheet ties either way,
but a catch-all is a frozen lump where a shareholder row carries advances and drawings — and
is positional, so it holds no name. The other two rulings accepted a placement that each left
something wrong, and **both have since been fixed properly** — see the next section.

### Built for junior advisors (2026-09-05)

Mike's request: *"most of the accountants using this will be junior in terms of experience"*.
Five improvements were proposed and he answered **"do them all"**. All five are built. The
fifth changed a screen he had already approved, so it was **drawn first, ruled, then built**
— [`three-way-forecast-report-detail.html`](../mockups/three-way-forecast-report-detail.html).

**Summary / Every line.** The report opened on four rows per tab, so a junior asked *"why is
profit down in August?"* had nothing on screen to answer with, and could not see their own
typing error — wages entered as 450,000 rather than 45,000 looked identical. The screen still
**opens on Summary**, unchanged; *Every line* is one click away and governs all three tabs
together, because an advisor who finds the setting on one will look for it on the others.
Mike's words on the shape: *"i like how you can choose summary and every line"*.

**Empty overhead lines are hidden, and a note says so** — his addition, not the drawing's:
*"perhaps a note explaining it could help?"*. It closes the exact risk named against that
recommendation, that a junior never learns an "Insurance" line exists. The count moves with
the forecast and the note appears only when something is hidden.

**No new input, no recomputation, the golden set untouched.** Every series on the screen is
one the engine has returned since it was written. **Facility interest finally has a row of its
own** — it was ruled engine-only earlier the same day purely for want of anywhere to put it.

**Two layout faults found by opening the app, both older than the work above.**
The report's results column is a grid item and had no `min-width: 0`, so it refused to shrink
below the 900px table inside it: the table's `overflow-x: auto` never engaged and it dragged
the whole page sideways instead of scrolling in its own card. Measured at 1366px — a 934px
column in a 700px track, the document 1455px wide. Five of the eight report screens already
carried the guard; this one did not. **And the page and the component each rendered a
ReportHeader**, so step 4 drew the title banner twice. The component's was removed: Quick
Position, EBITDA-DCF and the Loan Estimator all put the header in the page, and Quick
Position's page header is where its save and restore handlers hang — which is the seam the
forecast needs when 4.62 reaches it. **Neither is testable by mounting**: both headers
rendered perfectly, there were simply two, and jsdom has no layout engine. They were found by
screenshotting the running app.

**A glossary, in one place.** [`data/glossary.json`](../../data/glossary.json) holds sixteen
plain-English definitions and [`GlossaryTerm.vue`](../../components/base/GlossaryTerm.vue)
renders a small **?** beside a heading. It **adds to a heading and never rewrites one** —
Mike's labels are ruled screen by screen and explaining a term must not quietly reword it. An
unknown key renders **nothing**: a missing definition is invisible to an advisor and caught by
a test, which is the point of the test. *Tier judgement, stated not assumed: this is mentor
content in `data/` with no hub screen, because the rule requiring a screen covers content that
reaches an AI prompt and none of this does.*

**A collection profile that does not total 100% now says what it MEANS.** It still blocks —
a profile summing to 87 quietly means a seventh of the sales are never collected — but it now
says which way it is wrong and what to do: *"The missing 13% is money you invoice and never
collect — put it in one of the months above."* The two profiles get **different sentences**,
because a shortfall means opposite things on each. The refusal at the button also names which
block is at fault; it sits at the foot of a long screen and the profiles are far up it.

**Step 2 says how many figures are the file's and how many are yours.** One line above the
opening table, counted off the same `source` the badges read so the two cannot disagree.
Forty-odd badges is a page to audit, and an advisor who has not built one of these has no way
to know they have left six figures at zero because no file carried them.

**The purchases grid shows its year total**, as the sales grid always has. Twelve boxes with no
total is twelve chances to mistype one and nothing to notice it by.

### Facilities and stock in transit — the two proper fixes (built 2026-09-05)

Mike asked for the two residuals above to be designed properly (*"you mention 'fixing them
properly' - design the proper fix and let me know what is needed"*), ruled the drawing's ten
questions one at a time, and then asked for the build. Artefact:
[`three-way-forecast-facilities-and-transit.html`](../mockups/three-way-forecast-facilities-and-transit.html).
Closure and the two named deviations are in
[`to-do-done-and-parked.md`](to-do-done-and-parked.md) §2. **They are independent of each
other.**

**A funding line now has a Type — term loan or facility.** A **facility** (revolving trade
finance, a stock facility, invoice finance) carries its balance and is charged interest on it;
it does not amortise, so its repayment box is disabled and reads *No set repayment* — a
facility very much is repaid, continuously as stock sells, it simply has no fixed monthly
figure. Drawdowns and repayments are typed, never worked out from the stock: a facility that
redrew itself would be deciding how much a client borrows, invisibly, inside a document a
lender reads. In the engine it is `loanSchedule` with the amortisation line removed.

> 🔴 **Why a schedule and not "a loan row with a zero repayment".** That workaround is worse
> than the problem. Capital repaid is computed as *repayment − interest*, so a zero repayment
> makes it negative and **the debt grows by its own interest** — while the interest is also
> paid in cash. The charge lands twice and the balance sheet still ties, so nothing complains.
> On the real client: 2,450,000 becomes **2,653,348** in twelve months. Pinned by test.

**A facility is a CURRENT liability**, with the overdraft, not with the term loans — it is
repayable on demand, and filing it as long-term debt would overstate that client's working
capital by 2,450,000. **Its interest is its own figure and ENGINE-ONLY**: the report's profit
tab carries four rows and shows no interest at all, so there is nowhere for a third line to
appear, and expanding that tab is a design change with its own drawing.

**Funding rows appear as they are needed, capped at eight** — the file's own count plus an
*Add a funding line* button. It was fixed at three, so a client with six had three folded
together with a warning the advisor then had to unpick by hand. The cap is ours: a safety
limit against a malformed file, not a judgement about how much debt a business may carry.
⚠ Every row read from a file is a **term loan** — a balance sheet never says whether finance
revolves, and guessing it from an account name would set an amortisation schedule on a
client's debt from a word.

**Deposits on stock not yet arrived have their own opening line.** The money moves out of the
Other-current-asset catch-all — the opening still ties to the cent, because both are current
assets — and it opens the import prepayment position rather than `prepayments`, which is
driven by a live accrual schedule that would release it to the P&L as an *expense*. It is
stock, not a cost. The advisor adds **what is still owed on landing** and the months the
containers arrive. ⚠ The balance owing is deliberately **not** an opening liability: goods not
yet received are a commitment, not a debt. It is cash leaving in the landing month.

**A landing does four things**: releases the deposit from prepayments, settles the balance pro
rata, joins the full landed cost to purchases — **two seams, not one**, because releasing the
prepayment alone would lose the goods between two balance-sheet lines — and pays GST at the
border. **A shortfall warns and explains its remainder; it never blocks**, deliberately unlike
the collection profiles one level up: those are percentages where anything but 100 is an
error, these are amounts, and a container landing after the year ends is a true fact about an
importer on a nine-month lead.

> 🔴 **GST: the drawing omitted it, and the omission mattered.** Mike's instruction was to
> *"research the tax rules rather than guessing"*. **GST is triggered by the goods arriving,
> not by paying for them**, so a container whose deposit was paid in a previous financial year
> still attracts the full border GST when it lands — roughly 124,000 on that client, in the
> direction that flatters a funding application. It is charged on the goods alone (deposit plus
> balance) on his ruling, because the drawing has no field for duty or freight, and the screen
> says so in terms. Claimed back on the next return, so it shows as the timing cost it is. The
> rules and their sources are written down once, in
> [`TAX-RULES-IMPORT-GST.md`](../TAX-RULES-IMPORT-GST.md).

🔒 **A client's own account names are redacted before they leave the backend** (Mike,
2026-09-05: *"the names tied to bank, stock, assets and liabilities snuk through"*). A real
chart of accounts carries people's names and card numbers — that export put `BNZ Mr y business
card -4702`, `Equity Mr x` and `Trade Finance Loans - NMK Investments` on screen. `redactLabel`
in [`xeroReportParser.js`](../../server/report/intake/xeroReportParser.js) strips three things
and no more: runs of three or more digits with the dash that introduces them; a personal title
with the name or initials beside it; and a counterparty after a dash where it is an acronym, a
company, or an initial-and-surname. Matching still reads the file's own text, so no row changes
box. **Two shapes survive on Mike's ruling**: a bare initialism at the start (`XYZ Funds
Introduced`, indistinguishable from `GST Payable`) and a place name (`Hamilton P&A Stock`,
which is how four stock locations are told apart). Labels reach the browser and nowhere else —
`buildInputs()` sends amounts only, and a test now enforces that boundary so **item 4.66's
first AI call cannot carry a client's account names with it**.

**Step 1 takes SIX files, four of them optional** (2026-09-03, items 4.61a and 4.61b): this
year's Balance Sheet and Profit and Loss, **two by-month exports** — this year's and last
year's — and **last year's Balance Sheet and Profit and Loss**, which are what the two-year
trend read below is built from. An advisor who drops only the first two gets the screen they
had before either was added; nothing is withheld and no figure changes.

**The two by-month exports, this year's and last year's** (item 4.61a).
The most recent twelve complete months arrive tagged `seeded` — a starting point, never a
forecast, and its own third badge state on `ProvenanceBadge`. The second file is not a
convenience: a current-year export almost always stops part-way through a month, and
`assembleMonthlySeries` strips incomplete trailing months, so one file often yields eleven
whole months rather than twelve. **Those eleven are seeded and the twelfth is left empty**
— Mike's ruling of 2026-09-07, reversing a rule that refused the lot. The grid tags only
the months that came from the file; the rest are amber, and the missing ones are **named**
beneath it rather than counted. ⚠ **The part month is still never seeded**, and that half
of the old rule is deliberate: a month eight days long wearing the same badge as the real
ones is a *wrong* figure, where an empty month is a *missing* one. With 24
months in hand the twelve are always there. Where the two files overlap, the **older**
file's figures win — a closed financial year has been reconciled and a still-open one is
restating itself — and the advisor is told on screen when it happens.

**Step 3 takes a quick-fire forecast** (2026-09-07, item 4.71, its own approved drawing
[`../mockups/three-way-forecast-quick-fire.html`](../mockups/three-way-forecast-quick-fire.html)).
A tick at the top of the step — the tick-to-open shape approved for the economic analysis
five days earlier, so it is one pattern and not a second — opens three rows across three
years: sales growth, gross margin, overheads increase. Each compounds on the year before,
year 1 growing on the figures already on the form, which is what makes *"adds or subtracts
from previous known data"* true after an advisor has corrected a seeded figure. It sets
**three fields only** — the sales months, the mark-up and the overheads — because a growth
percentage says nothing about when a debtor pays or what tax rate applies. **It never writes
to the advisor's own figures**: it produces its own year and `buildInputs()` substitutes it,
so unticking restores everything with nothing to undo. Growth **keeps last year's monthly
shape**, month against the same month, because a seasonal business flattened into twelve
equal months produces a cash line that will not happen; where the months are level the
screen says so. The row reads *Gross margin* with the mark-up it converts to beneath it —
the engine works in mark-up on cost and the advisor thinks in margin. With no file dropped
the tick appears **greyed, saying what it needs**, because hiding it makes an advisor think
the app cannot do this. The grid shows **one column per year of the forecast**, and it never
truncates: dropping to one year and back to three finds the typing where it was left.

**The advisor chooses how long a forecast runs — 1, 2 or 3 years** (2026-09-07, item 4.71
slice 2, its own approved drawing
[`../mockups/three-way-forecast-three-years.html`](../mockups/three-way-forecast-three-years.html),
all six questions ruled the same day). Mike's ruling, and it **replaced** the recommendation
put to him (*"three years, always"*): *"good point - you should be able to choose 1, 2 or 3
year forecast please"*. The control sits on **step 3, above the quick-fire tick**, because how
long a forecast runs is an assumption about the forecast rather than a way of looking at one —
among step 4's tabs it would read as a view toggle while silently deciding the printed pack,
the totals and the row saved for a client.

🔴 **THE COUNT REACHES THE ENGINE, and that is the whole of the design.** `yearCount` is a
model input, clamped there rather than trusted from the body; anything but 1 or 2 means the
three years every caller got before the choice existed. Computing three years and displaying
fewer was rejected outright: `summary` totals the years it is given, so a one-year forecast
would have reported a three-year revenue and a low point in a year nobody asked about — both
entirely plausible on screen, which is the class of error UAT cannot catch.

**Step 4 shows every year asked for.** The four headline figures answer over **the whole
forecast**, keeping their labels — the one that earns the change is *Lowest point*, now the
worst month of all thirty-six rather than of year 1, which `summary.lowestCash` has always
computed and no screen had ever shown. Above the statements sit a **year-by-year summary**
(revenue down to net assets, with a total column that totals *flows* and repeats the final
year for *positions* — adding three closing bank balances is a number no accountant would
recognise) and a **cash line across every month**. The three statement tabs, their twelve
month columns and the Summary / Every line switch are untouched; a **year row** above them
re-points the screen with no second request. A year the advisor described nothing for is sent
**empty**, which the engine reads as *the same again*, and the column says so — those years
are not copies: depreciation falls away and loans pay down, so profit, cash and net assets all
still move. **The whole screen calls the three-years route, even for one year** — one path, so
a one-year and a three-year forecast cannot be answered by two pieces of arithmetic.

**The levers reach every year, each according to what it is.** Sales and overheads are shifts,
so they scale all of them; mark-up and the debtor profile are absolute figures and are written
to **year 1 alone** — with quick-fire off the later years inherit year 1 anyway, and with it on
each keeps the margin set for it. Writing year 1's mark-up into every year would flatten years
2 and 3 to year 1's margin, silently undoing the per-year percentages step 3 exists to collect.

**The printed pack carries every year chosen** — four pages for one, seven for two, eleven for
three — extending Mike's own 2026-09-06 reasoning: a lender given one statement of three cannot
check the claim that they tie, and a lender given one year of three cannot check the year being
lent against. **A new forecast opens at ONE year** — Mike, 2026-09-07: *"one year default is
fine"*. It is exactly what step 4 has always shown, so nobody who never touches the control gets
a screen or a pack that changed under them. Three is one click away.

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
any month.

> **The mentor owns the ladder, on the Imported Stock Prices tab** (Model Inputs, built
> 2026-09-04; the tab's name is Mike's). Until then his six figures lived only in the data
> file and were **restated as literals inside the intake screen** — two homes for one fact,
> agreeing by luck: a change to the file would have priced a forecast one way while the
> advisor's boxes still showed the other. The screen now takes the ladder from the file and
> then asks the backend for the mentor's current one, so there is a single source at every
> step. Mentor tier alone, per the default of 2026-08-24 — `server/utils/forecastSellDown.js`
> walks the whole tier chain already, so a firm that one day prices differently costs one
> line in `TAB_TIERS`. A restored forecast is never re-seeded: it keeps the figures it was
> saved with. **What a tier may change is twelve figures and the demand shape** — the five on
> the ladder and the seven supplier terms below — not the whole
> file. `runoutUpToDays` is deliberately not editable because the engine never reads it
> (runout is the *else* branch, so everything past the standard boundary is runout whatever
> that field says), and the shapes' own curves belong to slice 2's calculator. The validator
> refuses a new-stock boundary set past the standard one, because that leaves the middle
> rung of the ladder priced at nothing with nothing on screen to notice it by.
>
> **Slice 2 — the shipment calculator (`server/report/importShipmentModel.js`), engine half
> built 2026-09-04.** An advisor enters shipments — description, cost, order date, deposit %,
> shipping speed — and the calculator dates every event from the order date using Mike's own
> supplier terms (manufacture 120, balance due 91, prep 9; sea 25 / air 20 / express 15,
> summing to his workbook's stated 154 / 149 / 144 days). **It writes all three series —
> deposits, balances and landings — each from its own real date**, his ruling of 2026-09-04:
> writing only the landings would compute the real dates and then let one averaged lead
> replace them, which is the averaging the *dates, not bands* ruling exists to stop.
>
> **The engine change is one function, `landingsOf`.** Everything downstream was already
> worked out one landing at a time; the loop simply derived every landing's dates from one
> shared deposit lead and one shared balance profile. It now iterates a list of landings,
> and a forecast with no calculator builds that list from exactly those uniform terms — so
> the arithmetic is unchanged to the cent, which the 3,385-cell golden guard proves.
>
> **What that buys, on the drawing's own example:** two containers ordered in the same May,
> eighteen days apart, land in **September and October** — band-mapping knows only "ordered
> in May" and files both together. Their balances are really due in **August**, where the
> uniform profile said October and November: two and three months earlier, on a document
> whose whole purpose is showing when money is needed.
>
> **Interest cover is modelled, and it is charged with the other interest.** His sheet adds
> two things to the deferred balance, both pro-rated over a **360-day** year: 6% interest
> cover and a 10% currency movement. 43,057.20 becomes **44,798.62** — his own figure, and
> the test reproduces it. The currency half is the forecast's exchange allowance; the 6% was
> modelled nowhere until Mike's instruction of 2026-09-04 (*"can you fix the 6% interest
> issue"*), given after the build **reported** it as a gap rather than inventing a charge.
> **The 360-day year is not a rounding choice** — on 365 the currency charge is 1,073.48 and
> the workbook stops agreeing.
>
> 🔴 **It goes in OVERHEADS with the overdraft and loan interest, never in direct costs.**
> Freight, duty and the exchange movement sit above the gross margin because they are the
> cost of getting goods here; interest cover is what the supplier charges for waiting to be
> paid. In direct costs it would understate the margin on every container — one of the first
> figures an advisor reads. A test asserts the direct costs are exactly the other three.
>
> ⚠ **The first attempt broke the balance sheet and a test caught it, not an eyeball.** It
> accrued the interest into the supplier liability at the landing while expensing it at the
> payment, leaving every month out by exactly the interest — and on these terms the balance
> is settled *before* the goods land (91 days against 145), so it was not even a short
> window. It is now expensed and paid in the same month and never accrued: cash down by
> balance + interest, liability down by the balance, equity down by the interest.
> **This is the second time on this feature that a balance-check caught what nothing else
> would have.**
>
> **Interest cover applies only where the calculator is in use.** Twelve typed landing
> figures carry no order date and no credit period, so there is no span to charge it over;
> inventing one is the guesswork the *dates, not bands* ruling exists to stop.
>
> **The screen is built too.** *Fill these from actual shipments* sits at the foot of the
> overseas section: the seven supplier terms entered once, then a row per shipment
> (description, cost, order date, deposit %, speed) with a **worked-out** blue cell beside
> it — *Lands 24 Sep · deposit 2026-05-02 · balance 2026-08-01 + 546 interest · sellable
> 3 Oct*. Nothing about a date is typed.
>
> 🔴 **The arithmetic is a Restify route, `POST /api/report/import-shipments`, not a computed
> property.** Dating an event from an order date is business logic, and a browser copy of it
> would be a second implementation of *when does this container land* — one the advisor
> reads, one the forecast uses. The screen shows the answer and decides nothing. It posts
> debounced as the advisor types, exactly as the volatility block beside it does.
>
> **Once one shipment resolves, the calculator owns the twelve landing boxes** and the panel
> says so on screen. A shipment landing past the twelfth month is named in a warning band
> rather than dropped in silence, and a backend failure leaves the advisor finishing by hand
> — which is what they did before this existed.

Because revenue is then *cost × the ladder*, **real unit costs govern imported
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

**The supplier's terms are the mentor's too** (2026-09-04, Mike: *"make it editable"*). All
seven — manufacture days, sea/air/express shipping, balance due, prep days and interest cover
— sit in `forecast-sell-down.json` beside the ladder and are set on the same Imported Stock
Prices tab, with the same cascade, history and restore. They were hardcoded in the intake
screen until then, under a *From your platform settings* badge that pointed at settings which
did not exist. A day count must be whole and at least 1; interest cover may be nil but never
negative.

**What is not built:** nothing on the drawing. Both slices are complete and every screen has
been opened in a running app (2026-09-04). Five differences between the drawing and the build
are named in [`../ARTEFACTS.md`](../ARTEFACTS.md).

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
the print.** A third band was added **2026-09-07 and it is AMBER, not red**: a forecast with
no sales in it at all now says so, names what the sliders cannot do, and says where to fix
it. The other two name figures that are *wrong*; this one names figures that are *correct*
and answer a question nobody meant to ask. Mike met it as a **$202,781 loss "on $0 of
sales"** that balanced perfectly, with four live sliders that could not move a figure —
his by-month export had stopped part-way through a month and the whole seed was refused.
A gap in a sidebar is easy to hand a client without noticing; the band cannot
be. Both bands rest on `balanceCheck !== 0`, which is safe because the check cancels to an
**exact** zero even on fractional figures — pinned by a test, because a speck of floating
point would put a red band announcing a gap "of 0" in front of every client.

**What the PDF actually contains — measured with a real file, 2026-09-06.** There is no PDF
library in this app and deliberately so: none of the usual ones run on the locked Node 14.15,
and the browser's own dialog means the client's figures are never sent anywhere to be
rendered. The button says *"Print or save as PDF"*, and it works. 🔴 **What it produced the
first time it was checked was a funding pack missing half the year.** Six of the twelve
months were absent with nothing on the page saying so, from two causes that are invisible on
screen: the levers panel still printed, leaving the statement 592px of a page where the table
needs 900; and `.tw-tblwrap` scrolls sideways on screen, which on paper is not a scroll but a
**silent clip**. The print now drops the four sliders — nobody moves a slider on paper — keeps
the balance check below the statements, stops the tables clipping, and sets
`@page { size: landscape }`. **Orientation only, never a paper size:** the app never chose A4
or Letter and must not start, so a firm on Letter still gets Letter, and both give the 900px
the twelve columns need.

🔴 **AND THE PDF CARRIES ALL THREE STATEMENTS, one per page — Mike's ruling, 2026-09-06.**
It used to carry whichever tab was open, normally the Cash Flow, **beneath a balance check
asserting that "the three statements tie in every month"** — making the claim and withholding
the evidence for it. Sending the full set otherwise meant printing three times and changing
tab in between, which nothing on the screen asked an advisor to do, so in practice every
lender received one. The screen still shows one at a time; `printStatements` renders all
three for the print from the row sets the tabs already switch between, headed by the tab
labels, so **nothing new is computed and no new wording was invented.** The tabs, the
*Summary / Every line* toggle and the *"scroll sideways"* note are all absent from the
print — they are controls for a screen. **`printStatements` is pinned by a test** rather than
left to a stylesheet: a later simplification back onto `visibleRows` would silently return
the PDF to one statement, and nobody sees that without generating a file and counting.

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

### The High Level Budget (4.88, built 2026-09-12)

The first model here that compares this year to **the plan** rather than to last year. Four
steps because the source workbook has four sheets — set up the year, the budget, what actually
happened, how it went — on the stepped pattern Quick Position and EBITDA-DCF already use.
Drawn first at [`../mockups/high-level-budget.html`](../mockups/high-level-budget.html),
approved by Mike 2026-09-12 with all four of its questions ruled beforehand.

**Built:** [`server/report/highLevelBudgetModel.js`](../../server/report/highLevelBudgetModel.js)
(all four sheets, pinned cell by cell in `tests/unit/highLevelBudgetModel.test.js`),
`POST /api/report/high-level-budget`, [`pages/high-level-budget.vue`](../../pages/high-level-budget.vue)
and [`components/HighLevelBudget.vue`](../../components/HighLevelBudget.vue).

🔴 **ONE RULED DEVIATION FROM THE SOURCE WORKBOOK** (Mike, 2026-09-12). It adds its two
subtotal rows three different ways across its three sheets, and the Actuals sheet's
`SUM(D20:D46)` drops Wages and Interest Only Loan Payments — 159,900 a year in the sample —
from every total *including the bank balance*, so its Reports sheet charts a 173,700 saving
where the true variance is 13,800. All three sides now use the Budget sheet's full ranges.
Every figure this moves is listed against the workbook's own cached value in the golden test,
and reverting it outside the repo reproduced all six of those cached figures exactly — which
is what proves the port is faithful everywhere else.

**Three things the screen does that follow from Mike's rulings, not from the code's convenience:**
entry is **one figure per line applied to every month** with a vary-by-month opener (eight of
the nine populated lines in his own workbook are flat, so the common case is one number); a
**blank actual means "not yet", never "nothing"**, while a typed zero is a real zero; and the
arithmetic stays **actual minus budget** on both halves of the table with the **colour**
carrying the meaning, so nothing ever disagrees with the client's own Variances sheet.

🔴 **NOTHING ON THE RESULT STEP CLAIMS AN ACTUAL THAT WAS NEVER ENTERED** (Mike, 2026-09-13).
`hasActuals` reads the model's own nulls — a variance line is `null` until an actual is entered
against it — and until one is, the headline stays the **budget's own** figures, neither chart
draws its actual series or lists one in the legend, the subtotal row reads *not entered* and an
em dash like the rows above it, and the money-in chart is headed **"Money in — budget"**. It all
returns the moment an actual exists. Before this the screen compared against an empty actuals
side from step 3 on, and drew twelve nulls as zeroes: a flat line pinned across the bank chart,
reading as *"the actual beat the budget all year"*. **The Mid-Level Budget carries the same flag
for the same reason** — it was fixed there first, on 2026-09-13, and ported back here the same day.

**A new budget opens on the financial year it is being written in** — April of the current NZ tax
year, derived by [`utils/financialYearStart.js`](../../utils/financialYearStart.js) and shared
with the Mid-Level Budget. Both screens were hardcoded to the sample workbook's `'2021-04'`, so a
2026 client budget opened five years stale with every month label wrong. Deriving it rather than
typing a fresh year is what stops it going stale again each April; the 1 April turnover is the
helper's own test, because it is the one day a year the answer changes and nobody is watching.

🔴 **TWO FURTHER RULED DEVIATIONS, both in the GST block** (Mike, 2026-09-12, item 4.89 —
raised as questions during the 4.88 port and settled the same day, one at a time).

**Interest Received is out of the GST base.** The source's `GST Related Deposits` (row 58) is
`D9+D11+D13`; interest is an **exempt financial supply** in New Zealand and bears no GST, so
including it computed output tax on income that never carried any. The base is Sales and Other.
**It moves no figure in the sample** — Interest Received is empty on both sides — which is the
point: it was only ever wrong for a client who actually earns interest.

**The entered figures are GST-INCLUSIVE, and the GST block no longer touches the bank.** The
source could not decide: row 63 extracts GST from a figure that already contains it, and row 69
then adds that same GST back on top, which is only right if the figure had been exclusive. The
withdrawals side settles it — an owner budgeting *"Car: 500 a month"* means 500 leaving the bank,
GST and all — so the extraction is right and rows 66, 69 and 71 were counting GST twice. Those
rows are now the subtotals alone, and the GST survives as a **reading**: `gstHeld`, the money in
the account that belongs to Inland Revenue, printed at the foot of the result table. The return
itself is entered as a withdrawal when it is paid. **This one moves real figures, listed against
the workbook's own cached values in the golden test:** the sample year's budgeted closing balance
falls from **192,426 to 151,300** and the actual from **143,565 to 109,300** — the source
overstated the year-end cash position by the whole net GST, about **27%**. The test proves the
arithmetic rather than asserting it: the gap between the workbook's closing balance and ours is
checked to equal `gstHeld` exactly.

🔴 **NO FILE INTAKE, AND THE READERS WE ALREADY HAVE MUST NOT BE WIRED IN.** Every other
Report-class model here loads the client's accounts, so this one looks like an oversight. It is
not. A budget is a forecast, so there is nothing to import on the budget side at all — and the
actuals, which are the tempting half, are **cash** where a Profit and Loss is **accrual**. A P&L
counts a sale the day it is invoiced; this model counts it the day the money reaches the bank,
different by the whole debtor movement. **Drawings**, **Principal loan repayments** and **Plant
& equipment** are not on a P&L at all, being balance-sheet movements, and a P&L carries
**depreciation**, which must never appear in a cash budget because no cash moves. Wiring
`xeroReportParser` or `monthlySalesParser` into the actuals would put a cash budget column beside
an accrual actual column, looking identical and reconciling to nothing — **the same
not-like-for-like fault this model exists to correct.** The right file is a cash-basis export
(Xero's Cash Summary); none has ever been seen here, so a reader for it would be a guess, and
4.60's rule is that a reader is `verified` only against a real export. **Mike raised this himself
on 2026-09-12** — *"should we have built the ability to load a balance sheet and p&L to help with
the 'fast data load'"* — was shown the above, and ruled **leave it for now.** It is not filed, it
is not a gap, and it is not to be re-raised as one.

**Six differences between the drawing and the build, named as this page's §5 requires.**
(a) The 22 unused expense lines render as individual rows; the drawing folded them into one
summary row, but its own words say they *"stay on screen so nothing has to be remembered"*, so
the build follows the words and the fold was drawing shorthand. (b) **Back and Next buttons
were added** — the drawing navigates by step chip alone, which is not obvious enough on a
four-step screen. (c) The GST field shows `15`, not `15%`: a number input cannot carry a
symbol, and the label above it says *GST rate*. (d) 🔴 **The entry boxes were three times the
drawn width** on the first run, because Buefy's control fills its cell — corrected to 118px,
and across 38 rows that is the difference between a table that scans and one that does not.
(e) 🔴 **A zero was displayed as a signed change** in two places — a green `+$0` in the
headline before anything was typed, and `+$0` against every line that came in exactly on
budget — both now plain. (f) There is **no Coach panel**: the variance table reads itself, each
line saying *Better* or *Worse* beside its own figure, which is where a coach sentence would
have gone. §2's `coachIsNotAPanel` list carries it.

**(d) and (e) were found by opening the screen in a running app, with 10,062 tests green.**
Neither was visible to any assertion in this suite, and (e) is the fault twice over — fixed in
the headline, then found again in the table underneath it on the next look. This is the whole
argument for §5's last line.

### The Retirement Review (4.90, built 2026-09-13)

The largest workbook in the library — four visible sheets plus two hidden mortgage sheets, six
properties, three mortgage types, twenty years — and the only model here that holds a whole
household at once: two incomes, a pension, a superannuation balance and six properties. **It is
`CLASS_DECISION`, never badged Illustrative, and its route stores nothing.** Four steps, on the
same stepped pattern as Quick Position and the High Level Budget: the conversation, what they
have, the properties, the next twenty years. Drawn first at
[`../mockups/retirement-review.html`](../mockups/retirement-review.html).

**Built:** [`server/report/retirementReviewModel.js`](../../server/report/retirementReviewModel.js),
`POST /api/report/retirement-review`,
[`pages/retirement-review.vue`](../../pages/retirement-review.vue) and
[`components/RetirementReview.vue`](../../components/RetirementReview.vue).

🔴 **THE PORT WAS PROVED EXACT BEFORE ANY CORRECTION WAS APPLIED** — every cached value on all six
sheets, all twenty years of all twelve series. **That ordering IS the proof and cannot be redone
later:** once the output differs from the spreadsheet, no comparison can establish fidelity.

🔴 **THREE RULED DEVIATIONS** (Mike, 2026-09-13), and they are **on the screen**, not only in the
code — `workbookCorrections` carries each one's cells and its ruling out to the result, because an
adviser may have the spreadsheet open beside the page. Current tax bands from `data/tax-bands.json`
(the average rate falls 12.926% → 12.582%); the government pension taxed across all twenty years,
where the workbook taxed it on its summary sheet and not in its projection; and the sixth property
running from year one, where the workbook's rows sat four years out so it earned nothing for four
years and, when sold, credited the client with nothing at all. **The first two make the plan look
worse and the third makes it look better; they are listed separately and never netted.**

**Step 1 stands alone** (Mike, 2026-09-13). The Quick Calculator shares no figure with the
projection — the workbook keeps it on its own sheet for the same reason — so the step carries a
*Finish here* button and an adviser can run it in a first meeting before a single balance is known.

🔴 **The verdict names what the plan leans on, never just that it holds.** The model draws no
conclusion; only two readings come from the code (does the cash ever run out, how many years fall
short) and the rest is arithmetic. Where the cash survives only because properties are sold, the
sentence says so — *"the plan holds"* alone would be true and misleading in the same breath. On the
sample that is not rhetoric: **take the three sales away and the cash runs out in year 4**, which is
pinned in `tests/unit/retirementReviewScreen.component.test.js`.

**Two faults were found by opening the screen, with 10,149 tests green**, and neither was visible to
any assertion here: the verdict panel's warning figures rendered **navy instead of red** (the tone
class correctly applied, beaten on CSS specificity — so the two figures the panel exists to flag
were the two it did not), and step 3's six expanding property cards had **no expander symbol and no
close control at all**. Mike found the second himself. It is now the list-and-one-open shape he
approved on Multiple Property on 2026-08-21, so the two property reports behave identically.

### The Mid Level Budget (4.93, built 2026-09-13)

`POST /api/report/mid-level-budget` · [`pages/mid-level-budget.vue`](../../pages/mid-level-budget.vue) ·
[`components/MidLevelBudget.vue`](../../components/MidLevelBudget.vue) ·
[`server/report/midLevelBudgetModel.js`](../../server/report/midLevelBudgetModel.js) ·
drawn at [`mockups/mid-level-budget.html`](../mockups/mid-level-budget.html).

**The High Level Budget's line set, plus the timing.** The two workbooks are near-twins — same six
deposit lines, same twenty-seven GST-bearing expenses, same five non-GST lines, 813 formulas against
814. What Mid Level adds is the `Assumptions` sheet: what share of a month's sales is collected that
month and over the next four, and what share of a month's stock purchases is paid over the same
span. The budget is then built on **cash collected** rather than sales invoiced, and a Material /
Product Purchases line with its own timed *Paid to suppliers* lets gross profit be struck above the
expense block. **Five steps for five sheets**; four of them are the High Level Budget's screen
unchanged, and step 2 is the whole difference between the models.

**Why it earns its place beside its sibling.** On the workbook's own sample the client invoices
348,300 and is profitable on paper, and the budget still runs the bank to **−54,040** by March —
purely because the money arrives later than the wages go out. That is visible on the first screen.

🔴 **THE TWO SIDES MEAN DIFFERENT THINGS BY THE SAME LINE NAME, and it is the source's own design.**
On the budget, `Sales` is what was **invoiced** and the model works out when the cash lands. The
actuals sheet applies no timing at all (`sum(D9:D14)`, `=D20`), so what is entered there **is the
cash**. **Step 4's two entry cards each say so in their own words** (Mike, 2026-09-13) — Money In
*"Enter the money that actually reached the bank, not what you invoiced"*, Stock and Materials
*"Enter what you actually paid suppliers, not what they invoiced you"*. One sentence cannot point
the money both ways: stock **leaves** the bank, and the supplier does the invoicing. Money Out
carries none. Without them an advisor types invoiced sales into step 4, gets a comparison that
means nothing, and nothing else on screen would tell them.

**Three ruled deviations from the workbook (Mike, 2026-09-13), each named in the model's header and
pinned in the golden test against the workbook's own cached figure:**

1. 🔴 **The fourth-month collection bucket applies in every month it reaches, not only the first.**
   `Assumptions` row 12 is the one timing row using a relative reference (`M6*L12`) where its four
   siblings and all five creditor rows are absolute; expanded across Q12:X12 it points at empty
   cells. A client collecting 10% four months late should see **21,250** across the sample year and
   the sheet finds **2,500** — 18,750 lost, 5.4% of revenue, while the sheet's own balance check
   still reports the profile complete.
2. **GST is a reading and never moves the bank** — the 2026-09-12 High Level ruling, same rows, same
   formulas. Budgeted closing falls from −39,697 to **−54,040** and actual from −15,009 to
   **−32,200**, each gap exactly the year's net GST held for Inland Revenue.
3. **Tax Rebates, Interest Received and Capital Introduced are out of the GST base.** None bears
   GST; capital introduced is not a supply at all.

Deviations 1 and 3 move no figure in the sample, so both are proved on constructed cases as well.
All three were **mutation-verified outside the repo** — each reverted to the workbook's behaviour
and confirmed to fail the golden test.

🔴 **FOUR FAULTS WERE FOUND BY OPENING THE SCREEN, with the whole suite green, and none was visible
to any assertion.** All four had one cause: the screen compared against an actuals side that was
entirely empty. The headline reported, **in green**, that the client had spent 375,950 less than
budget and closed 64,040 above plan — while every line in the table beneath it correctly read *not
entered*. The three subtotal rows gave three different answers to the same empty state (−311,910
red, −165,950 **green**, and 0). The bank chart drew twelve zeroes as a flat line pinned to the top
of its scale. And on step 2, *Still owed at year end* — the card's whole point — sat in the
thirteenth column of a table that scrolls, so it rendered as a blank row.

`hasActuals` now reads the model's own nulls and governs the whole of step 5: the budget's own
headline stands until an actual exists, subtotals read `—` exactly as their lines do, neither chart
draws a series with nothing behind it, **the money-in chart is headed "Money in — budget"** until
there is one to compare against, and the year's owed figure sits below the scroll rather than
inside it. **No calculation changed.** The fix is mutation-verified three ways.

**Both of those last two went further than this screen.** The heading was left as the one open nit
on the approved drawing rather than silently rewritten; Mike ruled it on 2026-09-13, and fixing the
identical heading on the **High Level Budget** found that the older screen had never received any
of this — it still compared against an empty actuals side and drew a flat line across its bank
chart. The flag was ported there the same day (§4). The screen also opens on **the financial year
it is being written in** rather than the workbook's `'2021-04'`, from the shared helper described
in that section.

### Stock Purchasing (4.94, built 2026-09-13)

**What it does.** Scores every product line 1–5 on five criteria — margin achieved, how many
sold, unit cost risk, days on hand, share of stock held — and adds them for a mark out of **25**.
Ranks best first, then asks whether the client can carry the order. Drawn first at
[`../mockups/stock-purchasing.html`](../mockups/stock-purchasing.html); **all eight of its
decisions were ruled by Mike on 2026-09-13** and the drawing approved to build from the same day.
Step 3's name, *"Assess your stock exposure"*, is his own wording replacing the recommended
*"What you can afford"*.

**Days on hand is the mechanic worth knowing** — the sale date less the entry date, so how long
stock sat on a shelf falls out of two dates the client's system already holds.

🔴 **The workbook has FIVE sheets and TWO parallel datasets, and we port the first.** `Sales
Report` is the real intake — seven columns from the client's system, everything else derived.
`Product Ratings` is a hand-entered second copy with no cost column and days-on-hand typed in,
and `Weighted Data Sort` ranks *that* one. We rank `Sales Report` ourselves. Two consequences a
reader will otherwise mistake for faults: the sample's entry and sale dates run one day apart down
the whole sheet, so **every line comes out at 36 days on hand**; and 1,335 of its rows carry
figures with **no product code at all**, which the sheet's own grand totals include — they are
excluded here, because a line with no name cannot go on a buy list, so the sample totals
**274,953.59** against the cached **776,359.60**.

**919 of the sample's 969 lines are reproduced exactly**, pinned against the workbook's own cached
values for every row in `tests/fixtures/stock-purchasing-workbook-cached.json`. All 50 that move
are a workbook zero becoming a real score.

🔴 **THE LADDERS ARE THE OWNER'S TO SET, AND THAT IS THE POINT OF THE MODEL.** Mike, 2026-09-13:
*"the whole point of the model is to allow a business owner to quantify their expectations —
therefore, all the rankings need to be variables … if you check original model you will see the
ranges were separate columns of editable cells"*. He is right, and the workbook proves it in its
own formulas: every criterion has a min AND a max column, and one is computed from the other
(`F6 = G5+1%`, `F15 = G14+1`, `G24 = F23-1`), so typing a boundary moves the neighbouring rung.
Expressed once rather than twice that is **four boundaries per criterion**, which is what the
screen now offers and what `ladders` carries into the model.

**THE STEP IS PER MEASURE** (his ruling, same day): percentages advance by **0.1 of a point** —
type 25% and the next rung starts at 25.1% — days and units by **1**, money by **1 cent**. The
workbook uses a whole point and a whole dollar, so this is finer in two places and identical in
three.

🔴 **A BOUNDARY TYPED ACROSS ITS NEIGHBOUR PUSHES THE OTHERS OUT OF THE WAY** (Mike,
2026-09-13), rather than being refused. Refusing it was the first build and produced the worst
outcome available — found by driving the screen: the box went on showing the 60% the owner typed
while the model quietly scored against the defaults, and nothing on screen said so. Setting
Minor's top to 60% now moves Moderate to 60.1%, and the push runs OUTWARD from the edited box, so
lowering a high boundary pulls the ones beneath it down instead. The screen does it as they type;
`cutsFor` normalises left to right as a safety net because the route is a boundary, and a test
pins that whatever the screen sends the model has nothing left to correct.

⚠ **Squeezing four boundaries into a narrow span leaves a rung one step wide, and that is correct
rather than a fault.** Setting Minor's top to 60% when Fruitful still tops out at 100% shows
*Moderate 60.1% – 60.1%* — a rung spanning a single value. The alternative is to spread the
remaining rungs evenly, which would invent numbers the owner did not choose. The ladder is telling
them they have squeezed it; widening Moderate is theirs to do.

🔴 **TWO RULED DEVIATIONS, both mutation-verified outside the repo.** (5) The boundary between two
rungs is ONE shared number, so **a gap cannot exist** rather than being patched: the rung below
ends at the owner's figure, the rung above starts one step past it, and the scoring cut is that
same figure. (6) A criterion matching no band scores 0, the same way on both sheets — `Sales
Report` yielded Excel `FALSE` and `Product Ratings` returned **the measurement itself**, so
*Widget 9* cached **9.13 out of 25**. A third fault needed no ruling and is fixed: the
"how many sold" chain tests the ENTRY DATE in its middle branch where its four siblings test the
quantity.

⚠ **TWO THINGS IN THIS SECTION WERE WRITTEN WRONG EARLIER AND ARE CORRECTED HERE.** First, those
band "gaps" were reported as sloppiness in the workbook; they are the deliberate ±1 step between a
max and the next min, and only bite where the measure is continuous. Second, *Widget 3* was
recorded as scoring **5 (Minor)** — rounding down to the rung below a printed ceiling. It scores
**4 (Low)**: $25.22 is above the owner's stated $25 ceiling for Minor. Rounding down was
defensible while the ladder was ours; once the ceiling is the owner's own number it is not, and on
the two INVERTED ladders it handed a line the BEST score for exceeding a limit.

**The stock-sheet import** (Mike, same day: *"we need to be able to import a stock sheet"*) reads
a Cin7 Core or Unleashed stock-on-hand export through the reader built for 4.70 stage 4.
🔴 **A stock sheet carries TWO of the five criteria** — unit cost risk and share of stock held —
and none of margin, how many sold or days on hand, because there is no sale price and no date in
that kind of file. The response says which, and the screen prints both lists rather than deciding
for itself; a criterion it could not fill shows **"—", never 0**, so a low total reads as a missing
file and not as a bad product. **`quantity` comes back null on every imported line**: the model
reads it as units SOLD and a stock export's `onHand` is units HELD, and 300 plates on a shelf
scored as "Often" would recommend buying more of what nobody is buying.

**TWO DIFFERENCES BETWEEN THE DRAWING AND THE BUILD**, both corrections found by opening the
screen with the suite green (10,354 tests):

- 🔴 **Every one of the 25 ladder rungs printed its ceiling one unit too high, and adjacent rungs
  overlapped** — *Hot Cakes! 1–14* sat directly above *Quick Shifter 14–28*. The caption was
  rendering `upTo`, the **exclusive scoring edge** that closes the gaps under ruling 5, where it
  should render what the workbook prints. Bands now carry **both**: `upTo` scores, `printedTo`
  is captioned. Nothing was ever scored wrongly; the caption disagreed with the score beside it.
- **Margin is captioned as a percentage** (*41% – 80%*), not the raw ratio the drawing showed. The
  headline directly above that card already reads *80.0%*, and a ladder saying *0.81* beside it
  made the advisor do the conversion.

**Step 3's result row reads "Cash committed to stock"**, the drawing's own shorter wording, rather
than repeating the input's longer *"Cash you are willing to commit to stock"* (Mike, 2026-09-13).

**The sales import** (Mike, same day) is the other half, and reads a period's sales one row per
product: `server/report/intake/salesSheetReader.js`, `POST /api/report/stock-purchasing/sales-intake`.
It carries **four** of the five — margin, how many sold, unit cost risk and days on hand — and
claims the fifth only when the optional `% of Stock Units` column is really present, because share
of stock is a stock question.

🔴 **ITS TARGET LAYOUT IS THE WORKBOOK'S OWN `Sales Report` SHEET, NOT A NAMED PACKAGE.** Mike
supplied published stock-on-hand layouts for Cin7 Core and Unleashed on 2026-09-07; **no
equivalent has ever been supplied for a sales export, and none is invented**. Guessing a vendor's
column names produces a reader that looks finished and fails on the first real file — the same
honesty rule that keeps both stock packages marked `expected` rather than `verified`. A named
package's sales layout is added beside this one the day it arrives.

🔴 **THE DATE COLUMN IS THE PART THAT NEEDED CARE.** Days on hand is the sale date less the entry
date, and it is the criterion an advisor can least sanity-check by eye. The reader takes an Excel
serial, a Date the spreadsheet already parsed, and an ISO string — and **refuses everything else
rather than guessing**: `03/04/2021` is 3 April or 4 March depending where you live, and the guess
decides a score. A number below 20000 is refused too, so a stray `5` never becomes 1900-01-04 and
invents an arrival date. An unreadable date leaves days on hand **unscored**, not scored 5.

**A sales import never touches the shelf.** It says what LEFT the business; the shelf is what is
still on it, and comes from the stock sheet or the two boxes at step 2. Zeroing it would make an
already-stocked line look like one the client has none of. Pinned by a screen test.

---

### The Sales Dashboard (4.95, built 2026-09-13)

**What it does.** Answers one question in five cuts: where the sales and the margin actually come
from. Every sale is sorted into a value band **the owner sets**, and the same rows are then
totalled by brand, product, product category, region and salesperson — with transactions, sales
value and sales margin side by side, which is what separates the name doing the most work from the
name earning the most money. Drawn first at
[`../mockups/sales-dashboard.html`](../mockups/sales-dashboard.html); **all nine of its decisions
were ruled by Mike on 2026-09-13** and he approved the build the same day. It was the last of the
three Model Library cards that said *"coming soon"* and opened nothing.

**One page, four cards** — the sales report, sales over time, the sales ranges breakdown, and
where the sales come from. No steps: unlike Stock Purchasing there is no sequence to walk, because
every card answers the same rows a different way.

🔴 **THE WORKBOOK HAS SIX SHEETS AND ONLY TWO HOLD ANYTHING.** `Sales Data Input` is the intake —
140 transactions, and **no date column anywhere**. `Report` holds the one table. `Sheet1` is the
hidden calculation sheet everything reads. **`Pie Graph Options` and `Other Chart Options` hold no
data at all**: they are canvases carrying **25 charts, which are 20 unique views drawn twice over**
— five dimensions × three measures — laid out as a wall because a spreadsheet has no other way to
offer a choice. Decision 5 turns that wall into one card with five tabs and three measures.

🔴 **THREE RULED DEVIATIONS, AND NOT ONE IS VISIBLE IN THE WORKBOOK'S OWN SAMPLE.** That is why
they were settled on the drawing rather than found at build time. Each is pinned in
`tests/unit/salesDashboardModel.test.js` **on data that shows it**, with the workbook's own
arithmetic reproduced beside ours:

- **A sale counted in no band at all** (Decision 3). `Sheet1` row 16 sums every band inclusively,
  but row 17 counts two of them with strict inequalities — `L17` counts `<2500` where the money is
  `<=2500`, and `N17` counts `>2501` and `<5000` where the money is `>=2501` and `<=5000`. So a
  sale of exactly **$2,500, $2,501 or $5,000** banks its money in a band and is counted in none;
  the transactions column then disagrees with the money beside it and the Total with the sum of
  the rows. Here **one boundary decides both**, so a sale falls in exactly one band and the columns
  always reconcile. Round numbers are exactly what real invoices land on.
- **One list, read once** (Decision 4). The workbook reads its single list to **five different end
  points** — `E14` counts to row 508, `E13` sums to 518, the dimension totals reach 529, the band
  money 535, the band counts 537. Nothing shows at 140 rows; at roughly 491 the count stops rising
  while the money does not, so the average sale value climbs for no reason. A plausible-looking
  wrong number is the kind UAT cannot catch.
- **Each name counted from its own column** (Decision 7). `Sheet1` **S35** — Shaun's transaction
  count — reads `=Z9`, which is **Sue's**; its two neighbours are right. Invisible because the
  lockstep sample gives all ten salespeople exactly 14 sales each.

🔴 **THE TREND CARD IS MIKE'S OWN AND IT IS THE ONE THING BEYOND THE WORKBOOK** (Decision 9). Told
the workbook holds no date and therefore no trends, he asked for them: *"yes but good idea, can we
add dates"*. **It appears only when the data really carries a sale date** — the sample carries
none, so on the sample there is no card, not an empty chart and never a fabricated month. Clicking
any row in a cut narrows **the trend alone**, which is the question the spreadsheet cannot answer:
not who is biggest, but who is sliding.

⚠ **Its one real cost was named on the drawing rather than discovered mid-build: the shared
reader's required-columns list had to become per model.** `salesSheetReader.js` was written for
Stock Purchasing, which needs `Entry Date` AND `Sale Date` because the gap between them IS days on
hand. This model uses neither to decide anything and needs revenue and cost alone. Shared
unchanged the reader would have **refused a perfectly good file for a missing column nothing here
reads**, so `REQUIRED_BY_MODEL` now carries one list per model and a refusal names what *that*
model lacks. The reader also gained the four cut columns and **header aliases**, because the two
workbooks spell the same column differently — `Sales`/`Cost` against `Sales Revenue`/`Product
Cost` — and without them it would have refused the very workbook this model ports.

**The nine band ceilings are the owner's** (Decision 2), exactly as they are typed cells in the
workbook (`Report!H6:H14`) rather than constants in a formula — a $250 top band is meaningless to a
jeweller and the whole business to a dairy. A ceiling typed across its neighbour **pushes it
aside** rather than being refused, the same behaviour built for Stock Purchasing's ladders the same
day, so the two models behave alike and nobody learns two habits.

🔴 **THE SALESPERSON CUT CARRIES THREE STATED LIMITS** (Decision 6), and it is **scoped to this one
cut on this one screen — it is not precedent.** It is **never sent to the model**: this model is
arithmetic end to end and its route calls no LLM and stores nothing, so the limit holds by
construction rather than by promise. It **never leaves the firm** — nothing here is pooled or
shared upward. And its **column is optional**: a firm that does not supply it has no tab, which
falls out of the model's `available` list rather than being special-cased. The tab carries an amber
marker and a line of its own, so nobody opens it by accident in front of a room.

**Report class, and it opens on the workbook's sample with a `SampleNotice` saying so** — the
drawing shows it that way and Quick Position and the Volatility Report are the same precedent. The
header's client line reads *"Sample data · 140 sales"* until a file replaces it. **No "Illustrative"
badge**: the badge is a claim about the model, and this one runs on real figures the moment a file
lands on it.

**Two additions are recorded as additions, not slipped in:** the per-band and per-row **margin %**
columns are ours. The workbook gives a margin percentage for the page as a whole (`Report!K21`) and
never divides the two columns beneath it.

⚠ **One thing that looks like a fault and is not:** *Products* and *Salesperson* return identical
figures all the way down the sample, because it walks the ten products and the ten salespeople in
lockstep across all 140 rows. The groupings are independent and correct; real data separates them.

⚠ **Two faults were found by opening the screen, and neither was visible to any assertion** — the
argument for §5's last line, again. The ring's centre rendered **"$140"** above the word
TRANSACTIONS, because all three measures went through `money()`; and the line beneath it said
*"of the money"* about a count of sales. Both are fixed and pinned.

⚠ **`UNRECOGNISED_SALES` was missing from the intake allowlist** in `server/report/intakeError.js`,
so the reader's authored refusal — *"It has no Entry Date column"* — was replaced by the route's
generic sentence and reached nobody, for **Stock Purchasing too**, from the day that reader was
written. Same fault recorded for `TOO_MANY_MONTHLY_FILES` in that file's own comments. It matters
more now that the required columns are per model: the whole point is that a file is refused by
what *this* model needs, and a generic sentence cannot say that. Added 2026-09-13.

---

### Wages/Salary Review (4.104 — five steps, the report and the catalogue row 2026-09-14; the staff register's gate 2026-09-15)

**What it does.** Answers whether the team bills more than it costs, month by month, against
twelve actuals the advisor types in. Not a payroll total — the word "wages" undersells it. Drawn
first at [`../mockups/wages-model.html`](../mockups/wages-model.html); **all nine decisions were
ruled by Mike on 2026-09-14**, four of them against the recommendation, and he approved the build
the same day. Source: `../report-source-models/Wages Model.xlsx`, **six sheets and 10,456 filled
cells — the largest port in the library**, against the Sales Dashboard's 140 rows.

**Built:** `server/report/wagesModel.js` and its golden test, `POST /api/report/wages-review`
(anonymous, like every calculation route), and **all five steps with the report** on
[`pages/wages-review.vue`](../../pages/wages-review.vue) — `WagesTeam`, `WagesWork`, `WagesYear`,
`WagesActual` and `WagesReport`, each with its own component test, plus the shared headline guard.

🔐 **The staff register's GATE is built (2026-09-15) — the register table itself is not.**
[`server/utils/wagesRegisterGate.js`](../../server/utils/wagesRegisterGate.js) holds the decision as
a **pure function** so every branch of a call governing personal data is testable, behind
`GET /api/wages-register/gate/:clientId` and its `/open` and `/close` posts, all `firmAuth`.
[`components/WagesRegisterGate.vue`](../../components/WagesRegisterGate.vue) renders **three**
states, because Decision 6 states two conditions and each one failing looks different: `closed`
(no due-diligence case — **and no control is rendered**, since nothing on this screen may put a
client into due diligence), `available` (a case stands, not switched on — the only state carrying
a button), and `open` (both met, with the provenance line). The advisor's own case boundary is
`caseStore.listForClient`, reused rather than reinvented, so a colleague's *private*
due-diligence case does not open it. Artefact:
[`../mockups/wages-register-gate.html`](../mockups/wages-register-gate.html), approved 2026-09-15.

**The switch turns BOTH ways** (Mike, 2026-09-15): Decision 6 named only the switch-on, leaving an
advisor who opened the register on the wrong client with no way back — and that client is
necessarily another client in due diligence, so the automatic close would never fire for them. A
close records who and when and **keeps the opening it closed**; a closed register returns to
`available` rather than to a fourth state; re-opening is a fresh decision. Closing needs no
due-diligence case, being the safe direction.

✅ **IN THE MODEL LIBRARY since 2026-09-14, as a DECISION tool** —
[`utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js), `STATUS_READY`,
`CLASS_DECISION`, route `/wages-review`. Nothing arrives from an accounts export: every figure is
typed or derived, which is what makes it a Decision tool rather than a report.

🔐 **THE STAFF REGISTER ITSELF IS BUILT (2026-09-15)** — drawn at
[`../mockups/wages-register.html`](../mockups/wages-register.html), approved by Mike and all four
of its questions ruled the same day, one at a time. The sheet is
[`components/WagesRegister.vue`](../../components/WagesRegister.vue), rendered by
`pages/wages-review.vue` **only while the gate says open** — `v-if`, never `v-show`, so no
employee data is put in the DOM behind CSS. The people come from step 1 and are not typed twice;
the register adds three typed fields per person and derives the liability.

💰 **LEAVE IS VALUED AT THE RATE INCLUDING PAY RISES** (Mike, 2026-09-15), not step 1's base
rate — leave is paid at the rate in force when it is taken, so the base rate understates a real
liability, and understating what is owed on a document an acquirer prices a business from is the
wrong direction to err. The workbook's own definition is reproduced exactly: `Annual Hiring Plan`
S49 is `(E49*R49)+E49` with `R49 = max(F49:Q49)` — **the base rate lifted by the largest rise in
the twelve months**, not the last one and not a compounding of them. 19 × 1.05 = 19.95. The rises
live on step 3, so `registerTeam` prefers step 3's people over step 1's; until step 3 is
confirmed leave is valued at the base rate, which is correct because no rise has been recorded
yet. The screen carries a line saying so, because the figure will not match step 1's for anyone
with a rise and an unexplained difference between two screens reads as a fault.

**The pieces.** [`server/utils/wagesRegisterMaths.js`](../../server/utils/wagesRegisterMaths.js) is
pure and holds the arithmetic (38 tests, the golden one below).
[`wagesRegisterStore.js`](../../server/utils/wagesRegisterStore.js) stores it as **one
`firmOverlay` key per client** — the gate's own seam, so version history is free and **no new
table**. `POST /api/wages-register/:clientId/view` and `PUT /api/wages-register/:clientId`, both
`firmAuth`, **both re-resolve the gate from the live case before answering**: a case that leaves
the due-diligence domain stops serving named employees at once, which is Decision 6's *"not a
permanent property of the client"* enforced at the route rather than only on the screen.

**The four rulings, each as recommended (2026-09-15).** (1) The register carries **its own typed
"Hours in a day's leave", starting empty** — not step 2's average working day, which moves with
the work, and not a hard-coded 8; until it is set nothing is priced. (2) An unpriced person reads
**"not yet priced"** and the totals carry a **Priced** count beside People, so a partial total
never presents itself as a whole one. (3) 🔴 **Sick leave is not carried at all** — his words,
*"take it off"*; `sanitise` is an allow-list, and both the store's tests and the component's pin
that it cannot arrive by being added to a body. (4) The register has **its own firm-level
retention dial**, [`registerRetention.js`](../../server/utils/registerRetention.js), key
`register-retention`, default 84 months — deliberately **not** `meeting-retention`, whose period
is *spoken aloud to a client* in the consent wording; sharing one number would let a promise to a
client silently change how long registers of named staff are kept.

⚠ **ONE PIECE IS NOT BUILT, AND IT IS NOT A SCOPE CALL.** The Firm Manager **control** to change
the retention period needs a tab in
[`components/FirmManagerHub.vue`](../../components/FirmManagerHub.vue), which is named in item
4.87's `touches` and **active on the desktop** since 2026-09-10. Off limits from this machine. The
backend, the cascade and the platform default are built and tested, and the register shows the
resulting date; only the screen to change it waits. It is one component and one `TAB_TIERS` entry
on the day 4.87 lands.

🔴 **THE GOLDEN TEST PINS A DELIBERATE DISAGREEMENT WITH THE WORKBOOK**, which no other model in
this library does. Reading sheet 6's stored XML found three faults in column `H` — what the
63,154.16 headline is summed from: its one surviving formula `(E8*$D$5)*G8` points at a **blank**
`D5` (the 8 is in `E4`) and evaluates to 0 behind a stale cached value; `H9:H39` are hand-typed
constants that never move when pay or leave does; and **24 of the 29 people are priced from *sick
leave consumed* (`F`) rather than accrued annual leave (`G`)**. Where a row carries both, `G` wins,
so the intent is not in doubt. We price from accrued leave only: **10,115.84 across five people**,
not 63,154.16 across twenty-nine. `tests/unit/wagesRegisterMaths.test.js` reconstructs the
workbook's own figures from sick leave to prove the fault, and says in terms that a later session
"fixing" the port to match will have restored a liability built on the wrong quantity.

**The report's three charts (2026-09-15).** Mike: *"can you make the salary/wages report - last page -
more engaging with graphs/ pictures etc"*, then the pie was his own — *"maybe a pie graph showing the
3 seasons as a % of total profit?"*. Drawn at
[`../mockups/wages-report-visuals.html`](../mockups/wages-report-visuals.html), approved, built.
**No chart library and no new dependency:** `LineChart` (the planned margin by month, with July
below the zero line), `BarPairChart` (what the team bills against what it costs, per season) and
`DoughnutChart` (each season's share of the year) already existed.

**The drawing carried a fourth and Mike cut it** — *"cut the waterfall graph"*, the same day. A
`WaterfallChart` of planned → variance → actual, which restated the three headline figures at the
top of the report in a different shape rather than adding a fact. It was **built first**, because
the drawing showed four and a silent deviation from an approved artefact is exactly what these
rules exist to stop; it came out on his word. The cut chart stays on the drawing, greyed and
marked, with the recommendation left beneath the ruling, and
`tests/unit/wagesReportCharts.component.test.js` pins that no waterfall mounts — so the absence
reads as a decision rather than a gap.

🔴 **THE CHART CHOICES WERE DECIDED BY WHICH COMPONENTS COULD DRAW A LOSS, not by taste.** When
this was drawn, four of the seven base charts clamped a negative away. A paired planned-vs-actual
bar chart was ruled out before it was drawn — it would have flattened July's **−132** and Wet n
Dark's **−13,972** to the axis and looked perfectly correct — so the monthly chart is a line.

**That finding then turned out to be a live defect elsewhere, and `BarPairChart` was fixed the same
day (Mike's ruling, 2026-09-15).** Two client-facing screens were feeding it figures that go
negative: `DashboardReportProfitLoss` (`netProfit` — a loss-making year drew as **break-even**,
height zero on the axis, with the true "−$40,000" printed beside it) and `DashboardReportCashFlow`
(the closing bank balance — an overdraft put **both bars at zero** and, with no positive value
anywhere, the scale fell back to `max = 1`, so the gridlines meant nothing either: **a blank chart
on the page about cash**, while the same component drew that same figure correctly as a `LineChart`
immediately above). `BarPairChart` now brackets zero and draws each bar from the zero line, exactly
as `LineChart` and `WaterfallChart` always have. **With every value positive the arithmetic reduces
to the previous expressions exactly**, pinned by `tests/unit/barPairChart.component.test.js`, so the
six screens already using it are unmoved.

**`HBarChart` was fixed the same day too, and the investigation decided its scope.** Four of its
five call sites are stock values and cannot go negative. The fifth is `DashboardReportSensitivity`,
whose levers proved **better guarded than feared**: `computeProfitSensitivity` blocks on
`NO_REVENUE` and `NO_CONTRIBUTION`, so no-revenue and selling-below-cost never reach a chart at all,
and **a merely loss-making business renders with all four levers positive** — they measure the size
of an effect, not a profit. What stays reachable is a **negative expense line in a client's accounts
export** (a credit posted to cost of sales or overheads), proved to yield a negative lever: an
accounting anomaly rather than a bad year. Fixed anyway, because this app reads exports it does not
control — the component now draws left of a zero line, and a negative's figure sits right of that
line where the row is empty, since beyond the bar's left end it would print over the row's own name.

**Still clamping, and left deliberately:** `BandBarChart`. Its only feed is monthly sales, and a
month with negative total sales is not a thing. `DoughnutChart` is a different case and not a defect
at all: a pie genuinely cannot show a negative, so excluding it and **saying so in words** is the
right behaviour, which is what the wages ring does.

🔴 **`seasonShare` IS NOT `seasonComparison`, AND A PIE OF THE WRONG ONE WOULD HAVE LOOKED RIGHT.**
`seasonComparison` costs **one representative month** of each kind, so its three figures sum to
**44,435** against a year of **288,935** — three parallel scenarios, not three parts of a whole.
`seasonShare` rolls the twelve real months up by their own season and reconciles to `totals.margin`
exactly. It lives on the **engine**, not the screen, because this model's rule is that the report
recalculates nothing. **A losing season carries `share: null`, never `0`** — the screen then prints
*"contributes nothing"*, because *0%* claims the season earned none when the truth is that it lost
money. What the ring says: **four months of twelve carry 68.6% of the year's labour margin**, seven
carry less than a third, one carries none.

⚠ **A duplicate heading shipped past the drawing and was caught by opening a browser.** The drawing
had the months table headed *"Month by month"* — typed rather than read from `monthsTitle`, which is
*"The year, month by month"*, the same title the drawing gave chart 1. Mike ruled chart 1 to
**"Planned margin, month by month"**; the drawing carries both corrections. **A heading that already
exists on screen is read out of the locale file, never retyped.**

**Still to come:** the **payroll reader** (its own item, **5.2**) and the Firm Manager control above.
**A real payroll export is owed by Mike** — per `intake/supportedPackages.js` no reader is called
supported until one has been read. The five steps' figures are still not saved per client (4.62's
mechanism), which is why the register matches its entries to people on `personKey` —
**`division|name|occurrence`** — rather than on anything permanent. It is stable, not permanent:
it survives a reload and step 1's division regrouping, but renaming someone, or moving them
between divisions, separates them from their entry. Stated in `wagesRegisterStore.js`.

🔴 **OPENING IT IN A BROWSER FOUND THREE FAULTS THAT 10,975 GREEN TESTS DID NOT** (2026-09-15) —
all three invisible to a test because they need the workbook's own sample team to appear.
**(1)** That team carries **Butch, Bono, Boris and Brad twice each and four people with no name at
all**, and the first build keyed rows by name: Vue reported duplicate keys, the wrong person's row
updated as the advisor typed, and the two Butches collapsed into one stored entry on save. Hence
`personKey`. **(2)** Nameless rows were **silently discarded on save** — the allow-list dropped an
entry with no name — so whatever was typed against four real rows vanished without a word. The key
identifies an entry now; the name may be empty. **(3)** The footer read **"1 person"** above
twenty-nine, because the total counted only people somebody had already rated; the total is the
register's headcount, and a **Not rated** line now lets the three bands and the total reconcile on
screen. *That third one had a test asserting the wrong behaviour, which was replaced.* Proved
afterwards in the browser: typing 9 days against the **second** Butch, saving and reloading leaves
the first blank and the second at 1,872.00.

> *Corrected 2026-09-14.* This block read **"step 1 of the five"** built, **"still to come: steps
> 2–5, the report screen"**, and **"⚠ NOT IN THE MODEL LIBRARY, deliberately… a card opening onto
> one fifth of a model is a promise the screen cannot keep."** All three were true when written and
> none survived the same day's work. It matters more here than in a code comment: this Brief is what
> the Handbook publishes, so it was telling every reader — the master team at a UAT gate included —
> that a finished, catalogued model was a fifth built. **Nothing compares a Brief to the code; only
> a person does.**

🔴 **STEP 1 HAS THIRTEEN CONTROLS WHERE THE DRAWING LISTED TWELVE — every difference named, per §5.**
The drawing's inventory was a hand reading of which cells are typed; building it was checked against
the workbook's stored XML (does the cell carry an `<f>`, and does any formula read it). Five fields
resolved differently, **one control Mike ruled**, and **two were reinstated by 4.102** once the
shutdown sheet was read:

| Drawn field | What the workbook holds | What step 1 does |
|---|---|---|
| Weekly base hours | `Seasonal Inputs`: **typed but read by NOTHING** (`Std Hrs`, col N). `Shutdown Inputs` col K: **typed and live — the whole wage chain runs off it** | **a control, since 4.102** |
| Weekly overtime hours | `Seasonal Inputs`: **calculated** (`Extra Hrs Wkd`, BV/BX/BZ). `Shutdown Inputs` col O: **typed and read** | **a control, since 4.102** |
| Annual salary | **Typed but read by NOTHING** — col G, 0 readers | no control |
| On salary? (Yes/No) | **Typed but read by NOTHING** — col F, 0 readers | **Division**, Mike's ruling 2026-09-14 |
| Overtime pay rate | the typed cell is the *uplift*; the workbook's header calls it `Overtime Pay Rate (%)`, holding 0.5 | the uplift is the control |
| *(absent from the drawing)* | `toolsWeekly` — `CH7 = (Z7*52)/12` | a control was added |
| *(absent from the drawing)* | `productivity` — `Shutdown Inputs` col S | **a control, since 4.102** |

🔴 **THE LESSON THE FIRST TWO ROWS CARRY.** They read *"typed but read by nothing"* and *"calculated"*
for months, and both statements were TRUE — **of the seasonal sheet, which was the only one anyone
had read.** On the shutdown sheet they are live typed inputs. A finding about one sheet was written
down as a finding about the workbook, and the missing controls are exactly why a real team billed
zero on the shutdown basis. **Say which sheet a cell fact came from, every time.**

**Neither a calculated cell nor a typed one that nothing reads earns a control.** *Every typed cell
reachable, nothing quietly fixed as a constant* guards against removing a control the model gives; a
box the engine overwrites — or one wired to nothing at all — is the opposite fault.

⚠ **THE COLUMN MAP IS NOT WHAT IT LOOKS LIKE, and a first reading of it was wrong.** `Seasonal
Inputs` uses 1.25-wide **spacer columns** (I, K, Q, S), so any reading that skips empty cells shifts
every field one to the left. The table above is the corrected reading, taken from the sheet's own
header row: **D** name · **E** full/part time · **F** On Salary · **G** Annual Salary · **H** charge
rate · **J** pay rate · **M** efficiency · **N** Std Hrs · **P** retirement · **R** overtime uplift ·
**T** leave days. The build was unaffected — the same ten controls are right either way — but the
first record of *why* said "Std Hrs is calculated", and it is typed-and-unread instead.

**Division drives the basis** (Mike, 2026-09-14). The workbook is laid out in blocks and the mapping
is exact across all 29 sample rows: Admin and Sales are costed as salary, Production as production,
Management as management. One question to the advisor, not two.

**Two further deviations, both deliberate.** The screen **opens on the workbook's sample team behind a
SampleNotice** — the house pattern (Loan Estimator does the same) rather than the drawing's stricter
"never pre-filled"; the sample is the workbook's own, badged as sample, and the copy is pinned
against the engine's `DEFAULT_INPUTS` so it cannot drift. And the **three unnamed rows are kept**, so
a confirmed payload reproduces the golden figures exactly.

**The grid groups itself by division** — Mike, testing step 1, added an Admin person and found them
at the foot of the page below Management. A **stable partition**, not a sort: people keep their order
within their block, so a row moves only when its own division changes. Chosen over an Add button per
role because a per-role button fixes only insertion, and Division is the control that gets *changed*
on existing rows. Rows carry a per-row id rather than an index key, and remove takes the person by
identity — both forced by rows that move. Safe because the engine's figures do not depend on row
order: reversing the whole team moves the year margin by 1.7e-10, IEEE-754 addition order, pinned by
a test.

#### Step 2 — How the work happens

[`components/WagesWork.vue`](../../components/WagesWork.vue), with
`tests/unit/wagesWork.component.test.js`. The seasonal/shutdown basis (a two-button switch, Mike's
decision 3 — never a blend), the three seasons as a matrix, and the figures set once for the whole
model. **Every control is a typed cell**, verified in the stored XML, which is what the drawing's own
warning about this block — *"six of these ten would have been shipped as constants"* — was for.

🔴 **LABELS ARE THE WORKBOOK'S OWN WORDS** (Mike's ruling, 2026-09-14), because the drawing names only
ten of these and the model already has a vocabulary: *"Average Working Hrs per Day (incl Travel)"*,
*"Wet Days or Heat Days Lost per Month"*, *"Field Team Paid for 'Lost' Days"*, *"Mang't, Admin & Sales
Hrs per Day"*, *"Days Worked"*.

#### Step 3 — The year ahead

[`components/WagesYear.vue`](../../components/WagesYear.vue), with
`tests/unit/wagesYear.component.test.js`. **The largest step**, because the Annual Hiring Plan carries
453 typed cells. **Three grids, not one** — the twelve months, who is on the payroll in each, and each
person's pay rises — because they answer three different questions and ~750 controls in one table
would be unreadable.

**Where each grid's cells live**, all verified typed in the stored XML: the months are the **Cash
Report's** rows 9 / 7 / 5 / 11 (name, season, production days, allowances apply), which the Hiring
Plan only *mirrors* in calculated cells; on-payroll is `Annual Hiring Plan` F..Q on each person's row;
pay rises are F..Q on the *"Team Wage/ Salary %"* block from row 46. The **opening and adjusted pay
rates are calculated**, so neither gets a control — the opening rate is shown read-only because a rise
means nothing without it.

**Seasons are stored by key and sent by name.** The engine matches a month to a season on the firm's
own wording, so the picker's options come from **step 2**, not a list here — a hardcoded list would
send every month to the standard-season fallback the moment a firm renamed a season, silently,
because that is a real season. Restoring maps the name back to its key.

⚠ **`actualMargin` is deliberately not set here** — it is step 4's. A month arriving with an invented
actual would be judged against it on the report, and the variance is what the model exists to show.

⚠ Column S of the rises block carries **stray text from an overlapping table** (*"Pdctn' Hrs"*,
*"Federal Taxes"*, *"Band 1"*) on rows with no adjusted rate. Not read here. *(This used to add
"and it is the same interleaving that made the shutdown allowance unreadable" — withdrawn
2026-09-14: that column was never unreadable. See step 1's note 2.)*

#### Step 4 — What actually happened

[`components/WagesActual.vue`](../../components/WagesActual.vue), with
`tests/unit/wagesActual.component.test.js`. **The smallest step, and the one the model is judged by:**
twelve typed cells, `Cash Report` row 24, labelled by the workbook itself *"Actual Labour Margin"* and
sitting directly under row 22's calculated *"Projected Labour Margin"*. **Nothing imports them** — the
drawing's first cut left this row out altogether, which is how the model nearly shipped with no way to
judge the plan against reality.

**Month names come from step 3.** A firm whose year starts in July would otherwise type its actuals
against somebody else's calendar.

⚠ **No plan is shown beside the actuals, deliberately.** The projected margin is the *engine's* figure
(row 22 is calculated), so showing it here would mean either a second backend call from an input step
or — far worse — re-implementing the maths in the browser. Plan against actual, and the variance, is
the **report's** job; `computeWages` already returns `totals.variance` for it.

**A blank month is not a zero month.** Both reach the engine as 0, because that is what the workbook's
own blank cell does, but the headline counts what has actually been filled in — an advisor four months
into the year can see which is which.

#### Step 5 — The report

[`components/WagesReport.vue`](../../components/WagesReport.vue), with
`tests/unit/wagesReport.component.test.js`. **The first screen of this model that calls the backend,
and it calculates nothing itself** — every figure is `computeWages`'s own output. That is exactly why
the four input steps deliberately showed no planned figures: two implementations of one number is how
they start to disagree.

**The seasons come first, the months second.** The same team on the same pay makes **52,270** in a
*Dry n Light* month and **loses 13,972** in a *Wet n Dark* one — a swing of more than 66,000 on the
weather alone, because a field team is paid its contracted hours whatever the sky does. The year total
hides that completely.

**The tightest month is a headline figure** because of what the port found: correcting the workbook's
two defects moved July's planned margin from **+181 to −132**. The tightest month of the plan no
longer breaks even, and a year total of 288,935 says nothing about that. Pinned by a test, so a
reverted correction shows up here.

**In the consistency guard.** `reportHeadlineConsistency.component.test.js` carries *Wages/Salary
Review* — the step the skill warns nothing reminds you about, and the one whose omission fails
silently. Recompute is `reportRecompute` (debounce plus a monotonic request stamp), so a slow older
response can never overwrite a newer one, and `error` is that mixin's **stale flag — a boolean, never
a message**.

⚠ **An empty body is sent deliberately when no step has been confirmed.** The route falls back to the
workbook's sample, so the report shows the sample behind its notice rather than a blank screen —
skipping the request would also leave the stale banner unreachable, and a report that cannot show it
has failed is worse than one showing the sample.

**Three findings against the drawing's list of ten:**

1. **"Days Worked" (`Seasonal Inputs` W45) is missing from the drawing** — the office week, which the
   engine reads for every non-production person. A control was added.
2. ✅ **The overnight allowance is NOT a setting — CLOSED on Mike's ruling, in step 1.** It is **two
   typed cells per person**: V *"Overnight/ Meals + Accom' Allowance"* (175) × X *"Avg Number of
   Nights/ Meals per Month"* (2) = that person's 350, summed by `CF40` to 1,400.

   🔴 **The defect this fixed.** The engine takes `allowances.seasonal` as one **fixed total**, so
   the figure did not follow the team: adding ten people or deleting twenty left it at 1,400 a
   month. A wrong number produced by using step 1 exactly as intended, with nothing on screen
   saying so. Step 1 now carries both cells per person, derives the total (`allowanceTotal`) and
   emits it — **the engine's input shape and golden test are untouched**, and the sample still
   gives exactly 1,400.

   ⚠ **WITHDRAWN 2026-09-14.** This paragraph claimed three of the four allowance cells had their
   formula *overtyped with a literal 350*. They do not. `CF17:CF20` is one **shared formula**
   `X17*V17`; Excel stores it once on the master cell and leaves rows 18–20 as followers
   (`<f t="shared" si="145"/>`) with no formula text of their own, so a reader taking each cell's
   own `<f>` sees blanks and calls them constants. Deriving the total is still right — for the
   reason above, that it must follow the team.

   🔴 **THERE IS NO SHUTDOWN ALLOWANCE TO SUPPLY — SETTLED 2026-09-14.** This too used to say the
   shutdown column "interleaves label text with its formulas" and could not be read. It reads
   perfectly: `CE7:CE38` is a clean `Y*AA` throughout. The real answer is that on the shutdown basis
   the allowance sits **inside** each person's monthly wage (`Shutdown Inputs` CL7), so there is no
   separate line — and the workbook adding one anyway on `Cash Report` row 20 is a **double count**,
   corrected in the engine (CORRECTION 3, `server/report/wagesModel.js`). `confirm` emits
   `allowances.seasonal` only, and that is now the right shape rather than a deferral. Pinned by a
   test.
3. ✅ **The global overtime flag is now THE OVERTIME DECLARATION, on step 2 — Mike, 2026-09-14.**
   It had no control while nobody could say what it meant. He said what it means, and it is not a
   calculation toggle: *"I want an advisor to have the option to click yes — 'my staff get paid
   overtime in Dry n Light season' — even though that season already has long hours, BECAUSE we do
   NOT assume that just because they agree to work more, they should do so without overtime (which
   is against the law). There MAY be times however that overtime is NOT paid if they receive time
   off in lieu during the Wet n Dark season. That's an owner's decision, that's what that cell is
   asking them to declare."*

   🔴 **THE OLD CELL FAILED SILENTLY, AND EXPENSIVELY.** `Seasonal Inputs` J4 was one unlabelled
   cell with an **asymmetric** gate: the wet and standard columns paid unless it read "Yes", while
   the dry column paid ONLY when it read literally "No". It was **blank**. On these settings the dry
   season is the only one with extra hours to pay for — wet is 10.8 hours *shorter* than standard,
   and standard is the baseline — so the single live gate was the inverted one. Every production
   worker had **97.425 hours a month** of overtime calculated and none of it paid, nothing on any
   screen said so, and switching it on meant typing the word **"No"**.

   **What replaced it.** One required Yes/No on step 2: *"Are staff paid overtime for the extra
   hours a longer season demands?"* — **Yes**, they are paid; **No**, they take the time back in
   lieu during the shorter season. All three seasons now read it the same way, and a season with no
   extra hours pays nothing without needing a special case. **It has no default and Continue is
   refused until it is answered** — a question that costs somebody their overtime when nobody
   answers it cannot have one.

   ⚠ **It is a large number.** On the workbook's own team, declaring overtime paid costs
   **172,194 a year** and takes the planned margin from **288,935 to 116,742**. The sample declares
   *not paid*, which is what the blank cell amounted to, so every pinned seasonal figure is unmoved.
   The two sheets declare **differently** and that is the workbook's own answer: `Shutdown Inputs`
   G5 reads "No", which on that sheet means overtime wages *do* count, so `SHUTDOWN_SAMPLE` carries
   `overtimePaid: true`.

**Two operating bases, one switch** (Decision 3). A firm runs *either* a seasonal basis, where
weather decides how many productive days a month holds, *or* a shutdown basis planned around
production days and overtime. **Both revenue and cost swap sides together**, verified from the
formulas, which is why it is an either/or and never a blend.

🔴 **THE SHUTDOWN BASIS IS DERIVED, NOT CARRIED — item 4.102, closed 2026-09-14.** Until that
day the engine took each person's shutdown wage and revenue as **two ready-made twelve-month
arrays**, used as given. Only the workbook's own sample ever carried them, so **a team built
on our step 1 totalled zero revenue on that basis** — reachable in the app, with no warning.
It now computes both from the ten typed cells of `Shutdown Inputs`, per person per month:

| | |
|---|---|
| Wage (CL7) | `(base + overtime? + allowance) × 4.33 + tools + retirement ÷ 12` |
| Revenue (DB7) | `days × (annual charge ÷ 231 production days)` |
| The month's switch | gates the **overtime only** — the allowance is in both branches |

The reading was checked against **768 cached cells before any code was written**: all 384
revenue cells exact, 379 of 384 wage cells, the five exceptions being the row-28 defect below.
`SHUTDOWN_SAMPLE` reproduces `Cash Report` R17 at **973,328.4208**, to the cent.

**Step 1 gained the three fields the chain needs** — weekly base hours, weekly overtime hours,
productivity — **shown to everyone and starting empty** (Mike's yes, 2026-09-14). The basis is
chosen on step 2 and this is step 1, his own decision 9, so the screen cannot know which basis
applies; a column appearing only after a trip to step 2 and back is one somebody fills in by
accident or never finds. They are empty in the sample too, because the other sheet's figures
belong to a different model of the same firm.

🔴 **STEP 1 CARRIES TWO RATE CONVERTERS — Mike, 2026-09-14, and there is NO separate tab.**
His question settled it: *"does it need a seperate Tab?? couldnt it just import the tax data into a
hidden section and apply across the model as needed?"* He was right about the data — the income tax
bands live in Firm Manager → Tax Rates and resolve by country — **but nothing in this model needs
them, because the model computes no tax at all.** Labour margin is what the team bills minus what it
costs; income tax is the *employee's*, taken out of gross pay, and gross pay is already the wage
cost. Deducting it again would count it twice.

That left the four calculators drawn on the old Rates tab splitting two ways. **Salary ⇄ hourly** and
the **blended charge-out rate** fill in the two boxes on step 1 that the whole labour margin turns
on, so they sit above the team table; behind a tab a helper is somewhere to go and find, which is
how a helper goes unused. **The income tax and bonus calculators are not built** — they serve no step
of this model. Artefact: [`wages-rates-converter.html`](../mockups/wages-rates-converter.html).

⚠ **The helper saves nothing and writes into no row.** It works a figure out and the advisor decides
which person it belongs to — a converter that quietly wrote into a row would be a figure nobody
typed. `hoursPerWeek` starts EMPTY and the hourly rate reads as a dash until it is answered, because
a salary cannot be turned into an hourly rate without knowing the hours; `weeksPerYear` starts at 52,
which is the calendar rather than a default. The blended rate carries the workbook's own **"Balance
Time Remaining"** check: a mix adding to 80% returns a rate a fifth too low, silently, and nothing
else on screen would look wrong. It reproduces `Hrly Rate & Tax Calculator` E25 at **323.75**.

⚠ **The two input sheets are not the same team, which is why there are TWO samples.** Of the
29 rows the pay rate differs on 24, the leave split on 27 and the overnight allowance on 25;
the seasonal sheet carries four production staff the other does not, and one manager is
Natalie there and Shirley here. One team cannot reproduce both sheets, so each basis has its
own sample and the route serves whichever the request asks for. *(Leave is not a real
disagreement: seasonal writes 30 days; shutdown writes 20 with 10 as the sheet-level sick-day
setting. 20 + 10 = 30.)*

⚠ **Overtime adds no revenue on this basis, and that is the workbook's state, not an omission.**
`BR7 = if($B$5=0,0,…)` and `B5` is **blank**, which Excel reads as 0, so the overtime charge is
nil on all 29 rows. The hours chain is computed anyway and the gate is named
(`settings.overtimeChargeMonths`), so a firm that needs it supplies one value rather than a
rewrite.

**The real headline is the per-season card, not the year.** The same team on the same pay: a
*Wet n Dark* month **loses 13,972** while a *Dry n Light* month makes **52,270** — a swing of more
than 66,000 on the weather alone, because a field team is paid its contracted hours whatever the
sky does. That is the finding an advisor opens the conversation with.

🔴 **FOUR RULED DEVIATIONS, THE FIRST TWO FOUND AT BUILD TIME AND BOTH RULED THE SAME DAY** —
*"fix it - always. we want it right in the end"*, then, when the second was put as a definitional
choice rather than a defect, *"if it needs to be fixed - fix it - NEVER allow a mistake to remain."*
Each is pinned in `tests/unit/wagesModel.test.js` with the workbook's own cached figure beside ours,
and each is **mutation-verified**:

- **A wage costed against another employee's row.** `Seasonal Inputs` BN7 tests `E17`, BN12 tests
  `E22`, BN35 tests `E45` — a row **ten below** the person being costed, and `E45` is blank
  entirely. It is a **shared** formula (ref BN7:BN10, BN12:BN15, BN35:BN38) so whole blocks inherit
  it, and it runs **both ways**: Mary G is costed 1,440.83/month too dear, Max 1,744.17 too cheap,
  Stevie 5,611.67 and Natalie 2,654.17 too cheap. Ours tests each person's own employment type.
- **Two answers to one question.** The per-season card's cost line dropped the employer retirement
  contribution that the same model's monthly cost includes, so the card flattered every season. It
  now uses the monthly measure, and the card and the months agree.
- **One wage reading another month's cell** *(added 2026-09-14, found while porting the
  shutdown basis)*. `Shutdown Inputs` CL28 is a shared formula across the twelve month
  columns. Every other row anchors the retirement contribution as `$CI$<row>` in **both**
  branches; row 28 writes it as **`CI28`, unanchored, in the "Yes" branch alone**, so each
  month shifts it one column right — May reads CJ28 (blank), July reads CL28 (April's own
  wage), January reads CR28 (October's). Bevis is charged a twelfth of another month's total
  instead of a twelfth of his retirement contribution: **237.42 a month dearer, 712.25 across
  the three ticked months he is actually employed for.** April is correct only because it
  holds the master cell. ⚠ **This is the first deviation's cousin** — both are shared formulas
  whose unanchored reference drifts as the block fills, down a column there and across a row
  here. When checking this workbook, read what a formula *anchors*, not only what it says.
- **The overnight allowance, charged twice on the SHUTDOWN basis** *(added 2026-09-14, while
  settling the question that had to be answered before the shutdown port could start)*.
  `Seasonal Inputs` CM7 leaves the allowance out of each person's monthly wage; `Shutdown Inputs`
  CL7 puts it **inside** — and `Cash Report` row 20 adds one to both regardless. The two shutdown
  additions are not even the same quantity: inside the wage it is each employed person's
  `Y*AA*4.33`; on the Cash Report it is the raw **weekly** `sum(CE7:CE38) = 2,600` across the whole
  28-row roster, employed or not, added as though monthly. Ours adds the allowance on the
  **seasonal basis only**, so `allowances` carries one key rather than two. Over the year that
  removes **15,600** (six ticked months × 2,600) and the shutdown margin goes **−97,157 → −81,557**.
  The **seasonal** figures are untouched, which is the point — the correction is one-sided because
  the defect is. **On the report screen the allowance line is not shown at all on the shutdown
  basis**, since *"Overnight allowances for the year: $0"* would tell an advisor the team receives
  none, which is false.

**What moved, and it is named on the drawing's own header too:** year labour margin
**350,121 → 288,935**, year wage cost **1,012,620 → 1,073,805**, and **July's planned margin
181 → −132 — the tightest month of the plan no longer breaks even**, which is the single most
consequential figure on the screen when there is one. The three per-season months went
−10,356 → −13,972, 18,090 → 6,137, 55,921 → 52,270, those moving for both corrections together.

✅ **The port is proven faithful, which is what makes the corrections attributable.** Year billings
are **unchanged at 1,362,740** and match the workbook on **all 87 person-seasons**. With both
defects deliberately restored on a copy outside the repo, the engine reproduces the workbook **to
the cent** — 1,012,619.59 (R20), 350,120.64 (R22), July 180.61 (H22).

⚠ **A third fault was in OUR code and the golden test caught it before it shipped:** the engine was
inventing overtime for two managers. The workbook measures overtime against paid-hours cells that
are **empty on every salaried row**, so its own test can never fire there — salaried people are not
paid by the hour. The lesson generalises past this model: when a workbook appears to do nothing in
a case, check whether the cells it reads exist at all before deciding it forgot to.

⚠ **Two things reproduced deliberately rather than tidied.** The management block's *wet* and *dry*
wages read their own row and are correct — only its standard-season figure carries the defect, and
an earlier cut of this port reclassified the whole block and silently moved four more figures; a
test now pins that shut. And the workbook's overtime gate is asymmetric (two columns suppressed
when the global flag reads "Yes", the third paid only when it reads "No"); with the flag blank, as
the sample leaves it, every season returns nothing.

🔴 **The staff register is NOT part of this engine and never travels through its route.** Decision 6
is Mike's own ruling: the register opens only when the client's case is in the `due-diligence`
domain *and* the advisor switches it on, and it is kept on the firm's retention dial rather than
deleted at deal-end (Decision 8, reversed from the recommendation) because it is the firm's evidence
of *why* a role was cut. A route test pins that no named-employee field can reach the calculation.
**The model calls no language model anywhere**, so "personal data never reaches the AI" holds by
construction rather than by promise.

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

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

Until then, [`../../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js)
was read by **one file** — `components/ModelLibrary.vue`. Nothing on the backend read it,
and the only mention of a model's name in `server/` was a JSDoc comment inside the model
itself. **Ten built models that answer real client questions were invisible to the one part
of the app an advisor actually asks for help.**

**Where it lives.** [`../../data/report-model-summaries.json`](../../data/report-model-summaries.json)
holds one entry per live model — what it answers, its **key calculation output** (the
screen's real hero figures), what the advisor must be able to supply, when to reach for it,
and **what it does not cover**. [`../../server/utils/reportModels.js`](../../server/utils/reportModels.js)
renders it into the client-mode prompt.

🔴 **THIS ONE HAS NO SCREEN, AND THAT IS A STATED EXCEPTION.** CLAUDE.md's ruling of
2026-08-16 is that every AI fix surfaces on a hub page. Mike ruled this one out of that
himself. The reason holds: **a description of what a calculation does is a fact about the
maths, not authored advisory judgement** — nobody at any tier gets to decide that Lease vs
Buy answers a different question than it answers.
⚠ If a firm ever wants to say when *its* advisors should reach for a model, that **is**
authored judgement and needs a screen at the mentor tier first. Do not widen the JSON to
hold it.

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

⚠ **A model that shares a name with a template gets that template's tutorial video attached
to it** — `videoInjector` matches bold text after the AI has finished writing. Two names
collide today: *Working Capital Cycle* and *Quick Position*. Item **4.33**. It cannot be
fixed in the prompt, and an attempt to do so stripped the bold off template names and was
reverted.

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

### Known open gap

User-facing strings on the existing report screens are hardcoded English rather than going
through `$t()`. This breaches the Stack Constitution, is a logged P1, and **must not be
copied** into a new screen.

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

*Why it is a step and not a nicety:* on 2026-08-21 this found **two defects with 5,885
tests green**, in a screen whose own suite had just been rewritten to 26 tests. A scalar
was indexed as if it were a ten-year series, so the client's cash deposit rendered as a row
of dashes — the money missing from the one table that exists to show it, on a screen where
*every other row genuinely is a series*. And an input bound to what the user typed sat
blank beside a total that had plainly had that very figure deducted from it. **Neither is a
maths error and neither is a layout error, so neither the golden tests nor a mockup could
see them.** They are the screen quietly saying something untrue, and only reading it finds
that.

⚠ **Reading rendered text is still NOT seeing a laid-out page.** §3's rule stands: jsdom has
no layout engine, so no test in the suite can see a shrunk header or a box too small to read
its own digits.

🔴 **CORRECTED 2026-08-22: THIS PARAGRAPH USED TO SAY "no browser driver is installed in
this repository". That stopped being true the day after it was written.** `playwright` is a
declared devDependency at exact `1.34.3` (landed 2026-08-21, `7fa5e9a`), with an
`npm run visual:setup` script that installs Chromium for it. It was used on 2026-08-22 to
drive the AI Prompts tab at two tiers and read back what the page actually rendered.
**What is missing is a TEST that uses it — not the dependency.**
⚠ To-do item **4.25** already says exactly that; this page did not, and a Brief that
understates what works costs as much as one that overstates it. Layout is still unverified
by anything in `tests/`, so keep saying so — but "we have no way to look" is no longer the
reason.

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

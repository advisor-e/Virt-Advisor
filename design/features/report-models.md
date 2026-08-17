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

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| Maths models (pure, CommonJS) | [`server/report/`](../../server/report/) |
| Routes | [`server/routes/report.js`](../../server/routes/report.js), registered in [`server/restify-server.js`](../../server/restify-server.js) |
| Catalogue (single source for what exists) | [`utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) |
| The shared frame + `--rs-*` tokens | [`components/base/ReportShell.vue`](../../components/base/ReportShell.vue) |
| Shared blocks | `components/base/` — `ReportHeader` · `HeroStrip` · `HeroFigure` · `StaleBanner` · `SliderField` · `ProvenanceBadge` |
| Mixins | `currencyMixin` (money formatting) · `reportRecompute` (debounce, race guard, stale flag) |

### The build recipe

Eight steps, with copy-paste templates:
[`../ADDING-A-REPORT.md`](../ADDING-A-REPORT.md). The ruled visual numbers:
[`../REPORT-VISUAL-STANDARD.md`](../REPORT-VISUAL-STANDARD.md). Class rules:
[`../MODEL-CLASSIFICATION.md`](../MODEL-CLASSIFICATION.md).

### The four guards

| Test | Fails the build if… |
|---|---|
| `reportShellFrame.test.js` | a live report's page does not wrap its screen in `<report-shell>` |
| `reportHeadlineConsistency.component.test.js` | a screen hand-rolls its headline, nests the banner in a column, or leaves stale figures bright |
| `reportHeaderFullWidth.test.js` | a screen renders the header itself without resetting its margin |
| `reportBadgeClass.component.test.js` | the badge does not match `modelClass` — **a shipped report absent from the map is a failure, not a skip** |

All four are mutation-verified.

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

# Report Models — the History

> **Read [`report-models.md`](report-models.md) first.** That page is the rules. This page
> is why they exist, what was tried and rejected, and what went wrong often enough to be
> worth remembering. Nothing here is a current instruction. If this page and the Brief ever
> disagree, **the Brief wins** — and the disagreement is a defect to report.
>
> Nothing is deleted from the record; it is moved here. The raw session notes remain on
> disk and are indexed at the bottom.

---

## 1. The five incidents that produced the rules

Every principle in the Brief was bought with a mistake. They are recorded because the
mistake is the part that transfers.

### "More colour" meant "make it look like the others" · 2026-07-23

The Loan Estimator's entry steps shipped as bare forms — no dark banner, no card language —
and had to be redone the same day. The owner asked for "more colour"; that was read as a
styling preference and it was not. It meant *this does not look like its siblings.* He had
to explain it twice in one session.

**The ruling that followed, and it is final:** all models in the report section follow one
visual plan, on **every step**, entry and intake screens included. Do not ask how a model
should look. Do not propose a bolder look. Open the finished screens and copy them.
→ Brief **P1**.

### Lease vs Buy shipped with no frame, and the build stayed green · 2026-07-27

Its `HeroStrip` was tucked inside the `1fr` results column, so the banner rendered about
740px wide while EBITDA-DCF and the Loan Estimator spanned the full 1120px. Every guard
passed it, because the guards checked the banner **existed**, not **where it was**.

The underlying cause was that a previous consolidation had stopped halfway. The banner and
header had been extracted into shared components — which is exactly why *those two* were
identical everywhere — but the frame, palette, cards, buttons and fonts were still
copy-pasted into each screen under a different naming prefix each time (`--mbk-*`,
`--lev-*`, `--ddg-*`, `--bpr-*`). There was a rule ("look the same") and no sheet of
numbers, so each new screen guessed and the guesses diverged. The dark `panel-2` had
already drifted: `#07182f` in three models, `#0e2440` in Eight Levers.

→ Brief **P3**, **P4**, and the `ReportShell` + `--rs-*` tokens.

### A shrunk header and an oversized gap on Working Capital · 2026-07-27

Shipped, and the owner was furious. The shared header carries `margin: 0 auto 22px`; inside
a flex-column root the auto margin shrinks it below full width and the 22px stacks on top of
the flex gap. Both faults are invisible to the test suite.

**The lesson that generalises: jsdom has no layout engine.** No test in this repo can
measure a rendered width or a gap. A wrong geometry passes everything. Hence the rule that
a layout change gets a *visual artefact* — a real HTML render, sections labelled, on a
shareable link — reviewed before the repo is edited.

"Gaps everywhere 16px" was a literal instruction. Substituting judgement on a single gap is
what caused this. → Brief **P2**, **P3**, and §3.

### One attribute is not the diagnosis · 2026-07-27

When the owner said Lease vs Buy did not match its siblings, the first response fixated on a
single attribute. The actual gap spanned the two-column grid, the page frame, the palette
and the fonts. **When a screen "doesn't match", compare every structural dial against its
siblings with exact numbers before proposing anything.**

### The word "true" in front of advisors

`error` on the recompute mixin is a boolean flag. It was rendered as a message on Eight
Levers, so advisors saw the literal word `true` for a day. → Brief §4, trap 3.

---

## 2. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Dark mode: all-on or all-off? | **All light.** No screen responds to the OS theme. | 2026-07-27 |
| Left input column: 340 or 360? | **360px** (was 340 on four models, 320 on two) | 2026-07-27 |
| Gap between columns | **16px**, revised down from 20px so every gap is one number | 2026-07-27 |
| Total content width | **1120px** centred (was 1120 / 1180) | 2026-07-27 |
| Card corner radius | **14px** (Loan Estimator had 10px) | 2026-07-27 |
| Card padding | **16px** uniform, revised from `16px 18px` | 2026-07-27 |
| Card title | navy `#002b64`, uppercase, 12px, `.1em`, weight 600 — one size everywhere | 2026-07-27 |
| Collapse breakpoint | **860px** (Eight Levers had 900px) | 2026-07-27 |
| Shell-and-guard, or hand-edit each screen? | **Shell + guard.** Values in a document still rely on remembering. | 2026-07-27 |
| Are the teaching models "reports"? | **No — they are teaching tools.** See below. | 2026-07-13 |

### Why the classification exists

The build was heading toward treating every model as a report that a client's accounts get
fed into. The owner stopped it: Working Capital Cycle, Debtor Drag and Margin/Mark-up/
Break-even are **teaching tools**, not reports. The evidence agreed — an inventory of their
inputs found roughly two thirds of the figures they need do not exist in any accounting
export, because they are pricing and operational assumptions, not accounting outputs. That
is not an intake problem to solve; it is the signature of a model never meant to be fed by
a ledger.

The same review corrected a second assumption: the first draft took "no file dropped" to
mean "no client data, so no exposure". **Wrong.** A client's loan balances and retirement
position are sensitive whether they arrive by upload or by keyboard. Privacy is triggered by
real client numbers, not by file intake — which is why decision tools carry the boundary
despite importing nothing. → Brief **P6**.

---

## 3. Considered and deliberately rejected

- **Forcing `SliderGroup` onto all screens.** Quick Position's sliders carry provenance
  badges and a dynamic ceiling so a touch can never snap a real figure down to a cap;
  EBITDA/DCF has no sliders. The exclusion is structural, not laziness.
- **Flattening gradients on data marks.** The cash-runway bar, the EBITDA bars and the
  slider tracks keep theirs. Readability decision, not tidying.
- **A per-model look, ever.** Raised more than once. Settled permanently 2026-07-23.

---

## 4. The migration that made the rules structural · 2026-07-27

Six steps, each its own approved change, tests green throughout:

1. `ReportShell.vue` + tokens added, no screen changed — `20be0e2`
2. All screens moved onto the shell, one per commit, each deleting its copy-pasted frame —
   through `9d41582`, `ebd6ab8`, `b927395`
3. Numbers standardised through the tokens — `ff549b6`
4. Dark mode: all-light (no code change needed; the blocks came out during step 2)
5. The frame guard added, mutation-verified — `264bdb9`
6. `ADDING-A-REPORT.md` rewritten to teach shell-first — `29fac32`

The approach was proven before it was trusted: the banner and header had already been shared
for a week, and they were the only two things that had never drifted.

---

## 5. Stale claims in the older documents

Found 2026-08-13 while writing the Brief. **Left in place** — those documents are historical
records of their own date, and correcting them in-place would destroy the record. They are
listed here so nobody quotes them as current:

- `MODEL-CLASSIFICATION.md` says *"all three built models are Education."* True on
  2026-07-13. **Nine models are live now, across all three classes.**
- `REPORT-VISUAL-STANDARD.md` refers variously to *"six screens"* and *"eight screens"*.
  **There are nine live routes.**
- `ADDING-A-REPORT.md` says a new report *"looks and behaves like the other six."*

**This is the drift the Brief is designed to stop.** Every one of those numbers was correct
when written and became wrong without anyone touching it. The Brief therefore states no
count that the catalogue already knows — [`utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js)
is the single source for what exists, and it cannot go stale because the guards read it.

---

## 6. Where the raw material is

The full record lives in the dated session notes. Nothing was deleted to write these two
pages. Ordered by how much report content each holds:

**Heaviest:** `SESSION-2026-07-18-NOTES.md` (81 mentions) · `SESSION-2026-08-02-NOTES.md`
(30) · `SESSION-2026-07-28-NOTES.md` (27) · `SESSION-2026-07-28-B-NOTES.md` (21) ·
`SESSION-2026-07-21-NOTES.md` (20) · `SESSION-2026-07-10-NOTES.md` (20)

**Also relevant:** `SESSION-2026-07-22` · `07-27` (the visual-standard rulings) · `07-29` ·
`07-23`, `07-23-C`, `07-23-D` · `07-24` · `06-18` · `07-28-C` · `08-02-D`

**Permanent companions, still current:** [`../ADDING-A-REPORT.md`](../ADDING-A-REPORT.md)
(the recipe) · [`../REPORT-VISUAL-STANDARD.md`](../REPORT-VISUAL-STANDARD.md) (the numbers)
· [`../MODEL-CLASSIFICATION.md`](../MODEL-CLASSIFICATION.md) (the classes) ·
[`../REPORT-DATA-MODEL.md`](../REPORT-DATA-MODEL.md) (figure inventory, Report class only) ·
[`../REPORT-LAYOUT-REFERENCE.html`](../REPORT-LAYOUT-REFERENCE.html) (**the artefact — keep
on file**) · [`../REPORT-SCAFFOLDING-PLAN.md`](../REPORT-SCAFFOLDING-PLAN.md) (how the
sharing was built)

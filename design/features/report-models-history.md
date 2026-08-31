# Report Models — the History

> **Read [`report-models.md`](report-models.md) first.** That page is the rules. This page
> is why they exist, what was tried and rejected, and what went wrong often enough to be
> worth remembering. Nothing here is a current instruction. If this page and the Brief ever
> disagree, **the Brief wins** — and the disagreement is a defect to report.
>
> Nothing is deleted from the record; it is moved here. The raw session notes remain on
> disk and are indexed at the bottom.

---

## 0. What the AI was told, and what it still is not · 2026-08-22

**Item 4.29.** Mike, 2026-08-21: *"ensure that each of the performance models have a 'key
calculation output' page or section, so that the AI can read what the model serves"*, and
*"place it wherever you want, it's for AI - not the advisor or manager"*.

### The fault was a single reader

`utils/reportModelCatalogue.js` was imported by **one file**, `components/ModelLibrary.vue`.
Nothing on the backend touched it, and `server/routes/report.js` never calls OpenAI at all.
So the only place a model's name appeared in `server/` was inside a JSDoc comment. An
advisor could describe a builder who is profitable on paper and permanently overdrawn, and
the AI had **never heard of Debtor Drag**.

### Two decisions worth keeping

**The summaries are keyed by ROUTE, and only live models are in them.** Eight of the
eighteen catalogued models are `STATUS_SOON` with no page. Summarising one of those would
send an advisor to a screen that does not exist — item 4.15, in a new place. Keying by route
makes a model without a page literally unrepresentable.

**The guard runs both ways, and the second direction is the one that earns its place.** A
summary for a model with no page fails. A live model with **no summary** also fails. Only
the second protects against the failure that actually happened: a model shipping and staying
invisible because nobody remembered a file existed. A one-way guard would have been safe and
useless.

### The paragraph this history exists for

**The block reaches the prompt. Nothing invites the AI to use it.**

None of the six mode prompts in `data/prompts/` mentions a calculation model. `discover.txt`
is stricter than silence — its output format is three template fields and it ends *"Do not
add any other sentence after it. Do not offer emails, scripts, approach tips, or anything
else. End there. Full stop."* Asked live on 2026-08-22 about a builder short of cash, it
returned three templates and no model, exactly as its own rules require.

🔴 **That is the half-a-fix shape in its quietest form**, and it is worth naming precisely
because everything looks finished: the content is authored, the wiring is proven against the
assembled prompt string, the tests are green, and **the advisor is no better off than
before.** It was raised as its own item rather than quietly widened into this change,
because editing a mode prompt alters what a deployed screen says to real advisors.

Mike answered the same afternoon, and the invitation — with its brake, and the unloosened
closing rule — is a current rule in the Brief's §3a.

### The reverted attempt, kept because it is the transferable part

Testing against the running app showed a template's tutorial-video sentence attaching to a
calculator line, because two model names are also template names. The instinct was to fix it
in the prompt: *write the model's name as plain text, not bold*. It worked, and it also
**stripped the bold off the template name** — which is precisely what `videoInjector` reads
to decide where videos go. The output got worse in a new place.

🔴 **The lesson is about where a rule can live.** `videoInjector` runs *after* the AI has
finished writing and matches on bold text alone. Nothing said to the AI can reach it. Three
rounds of prompt wording were spent before that was checked; reading `videoInjector.js`
first would have cost two minutes and saved all of it. It is now item **4.33**, and the item
says in terms that the prompt cannot fix it.

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

- **Forcing `SliderField` onto all screens.** Quick Position's sliders carry provenance
  badges and a dynamic ceiling so a touch can never snap a real figure down to a cap;
  EBITDA/DCF has no sliders. The exclusion is structural, not laziness.

  ⚠ **It was once called `SliderGroup`, and no such component has ever existed.** The name
  came from `REPORT-SCAFFOLDING-PLAN.md`, which proposed it; what was built is
  `components/base/SliderField.vue`. The plan and the July session notes keep the old name
  as accurate records of their own date. **A proposed name is not a built component — check
  `components/` before quoting one.**
- **Flattening gradients on data marks.** The cash-runway bar, the EBITDA bars and the
  slider tracks keep theirs. Readability decision, not tidying.
- **A per-model look, ever.** Raised more than once. Settled permanently 2026-07-23.

---

## 4. The migration that made the rules structural

The shell, the tokens and the frame guard landed as a sequence of small approved changes,
tests green throughout. The approach was proven before it was trusted: the banner and header
had already been shared for a week, and they were the only two things that had never
drifted.

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

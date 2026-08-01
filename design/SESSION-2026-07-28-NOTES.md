# Session Notes — 2026-07-28 · Laptop (Business Performance Report)

> **Model Library dark-mode fix shipped; Cost of Capital (WACC) backend built end to end
> — engine, three corrected source defects, route, and the approved screen wording.**
> Four commits, **all pushed**. Suite **1,799 → 1,848 green / 131 suites**, lint 0 errors,
> tree clean, branch **63 ahead / 0 behind `origin/master`**.
> **Desktop: `git fetch origin && git merge origin/master` first, as usual** — but note
> this work is on `feat/business-performance-report`, **not** on `master`, so it only
> reaches the desktop once this branch is merged via PR. **Nothing here touches any Course
> Builder file.**

---

## What shipped (4 commits, all Mike-approved per change, all pushed)

1. `568f1b1` — **Model Library stays light + its guard.** The last dark-mode override in
   shipped app code.
2. `7374386` — **Cost of Capital maths engine + 41 golden tests** (recipe steps 1–2).
3. `4e4403c` — **`POST /api/report/cost-of-capital` + registration + 6 route tests**
   (steps 3–4).
4. `3c9265f` — **The record**: phase 2 marked done, and the owner-approved screen wording.

---

## 1 · Model Library dark mode (closed)

`ModelLibrary.vue` obeyed the viewer's OS dark-mode setting via
`@media (prefers-color-scheme: dark)`. Every report screen had been ruled all-light on
2026-07-27, so a dark-mode visitor got a **dark catalogue handing over to a light report,
one click apart** — invisible to Mike, whose machine runs light. Mike ruled remove it.

- **Whole-app inventory done first** (a design ruling covers the section, not the file being
  edited): `prefers-color-scheme` now appears in **zero** shipped `.vue`/`.js` files.
  Remaining hits are `design/mockups/*.html` (static reference artwork, not shipped), docs,
  and `package-lock.json`.
- **New guard `tests/unit/modelLibraryLight.test.js`** — the file had no styling guard at
  all, so a later tidy-up re-adding a dark block would have shipped green. Two assertions
  deliberately: the media query **and** the five dark palette hex values, because guarding
  the *values* survives a change of mechanism (body class, data attribute) that a
  media-query-only check would miss.
- Mutation-verified outside the repo: mutant fails both assertions, control passes.
- ⚠ **Owner-visible check still outstanding:** set Windows to dark mode, open the Model
  Library, confirm it stays light.

---

## 2 · Cost of Capital (WACC) — the backend, complete

Port of `design/report-source-models/Cost of Capital.xlsx` (2 sheets). Chosen as the
smallest of the 11 unbuilt models; **scope then ruled FULL** — both sheets, the beta helper
wired to the calculator, plus an interactive advisory layer. It is **no longer the quick
win it was picked as** — it is Loan-Estimator-shaped and phased.

### The three source defects — found, proven from the formulas, owner-ruled "correct"

Values read with the repo's own `xlsxReader`; **formulas came from the raw sheet XML**,
which the reader deliberately drops. A first reading wrongly suspected a circular reference
at `X40` — the raw XML disproved it (`X40` is simply empty; `AE40` holds the formula).
Worth remembering: *check the raw source before naming a defect.*

1. **The equity half of the WACC is annihilated.** `AE40 = X40 - M40` reaches for the last
   **slot** of the equity row, not the last **filled** period. `X40` is blank, so growth =
   `AE42` = **-1** (-100%), and `M19 = L20*(1+E10)` multiplies the cost of equity by zero.
   `I23` (the equity contribution) = 0, so **the published "Weighted Average Cost of
   Capital" of 1.62% is the DEBT cost alone**, with 62.5% of the capital contributing
   nothing. **Decisive proof it is a defect, not merely absent data:** the sheet's own note
   says *"If you don't have data for one period leave it blank"*, and its sibling average
   honours that (`Y50 = Y43/M37`, `M37` counting FILLED periods). Only this formula doesn't.
   Corrected → **+4.2457%**.
2. **The same blank corrupts the volatility beta** (found while building; same root cause).
   `M62 = STDEV.P(M43:X43)` spans all twelve share-value cells and the twelfth is 0, so a
   share price of *nothing* enters the spread — "volatility" reads 27.67% on values ranging
   only 335.92–350.18, inflating the beta to **7.61**. Filled periods only → **0.36**.
3. **Cost of equity omits the market premium.** `H21 = E6 + E7*E8` uses the market RETURN
   where CAPM uses the PREMIUM (`Rm - Rf`), counting the risk-free rate twice and
   overstating by exactly `beta x riskFree` = 2.03 points (**8.57% vs 6.55%**).

Also corrected: `M52 = $Y$17 - M43` measured company share values against the **market**
average (4,660 vs ~343). Traced to a display-only branch — the volatility beta reaches
`F15` via the clean `O62 = M62/Y50` — so it never touched the WACC. Corrected anyway.

### The headline

**1.62% → 6.16%.** (An in-session estimate of 6.30% was superseded by the exact
computation.) **The corrections vindicate each other:** fixed, the helper's two betas become
**0.47** and **0.36** — against the **0.52** a human had already hand-typed into `E8` by
judgement. Three independent routes agreeing is the strongest evidence they are right.

### What is built

- `server/report/costOfCapitalModel.js` — `computeWacc`, `computeBetaHelper`,
  `computeCostOfCapital` (assembler). Blank-vs-zero is a first-class distinction
  (`isFilled`) — conflating them **is** defect 1. Guard-rails return warning **codes**, not
  English (the screen owns the wording); the workbook offered betas of −11.12 and 7.61 with
  no hint either was absurd. R8 honoured throughout. Beta stays **advisory**, as the
  workbook has it (`E8` is hand-entered); the assembler reports `growthSource` and
  `betaSuggestions.inUse` so a screen can never credit the answer to a beta it wasn't built
  on.
- `tests/unit/costOfCapitalModel.test.js` — **41 tests.** Every untouched figure pinned to
  the workbook's own cached value with its cell ref, and **all matched on the first run**
  (`Y10` 55,924 · `Y17` 4,660.333333 · `M29` 169.3946739 · `Y43` · `Y50` · all four debt
  cells). Each corrected figure carries a **sentinel** against the defective value.
- `server/routes/report.js` + `restify-server.js` — `POST /api/report/cost-of-capital`,
  **anonymous** (numbers in, numbers out; no `firmAuth` — only file-intake routes carry it).
  Reads no DB, writes nothing, calls no third party, sends nothing to an LLM.
- `tests/unit/costOfCapitalRoute.test.js` — 6 tests including a **sentinel at the HTTP
  boundary** (the route must never serve 1.62%) and a source tripwire pinning the
  registration line and the absence of `firmAuth`.

**Mutation-verified outside the repo** (5 mutants): growth-reads-last-slot **14 fails**,
blank-as-zero **9**, premium-dropped **7**, `STDEV.P`→`STDEV.S` **6**,
variance-from-market-mean **1**; control green.

> ⚠ **A lesson worth keeping.** The first mutation harness was itself broken — a bad
> `--config` made every run fail identically, so its "all killed" verdict was meaningless.
> **A "mutation survived" *or* "all killed" result is worth double-checking before it is
> believed.** The same happened again with a CRLF-broken strip regex in the route tripwire
> check.

---

## 3 · Screen wording — APPROVED, build straight from it

Recorded in full in `ACTIONS.md`. Principle: keep the workbook's term wherever an advisor
would recognise it; replace only internal abbreviations meaningless to a client.
`"ev ratio"` → **Funded by equity** · `"dv ratio"` → **Funded by debt** ·
`"Return On Investment (Performance) Co Variance Beta"` → **Beta from growth** ·
`"Share (Volatility) Beta"` → **Beta from volatility** · `"cost of debt"` → **Cost of debt
(after tax)**. **Do not re-ask Mike and do not invent** — it is settled.

---

## Where the work stopped

**A clean boundary. The backend is complete; the screen is not started.** Nothing is
half-built, and every decision the screen needs has already been made (wording approved,
class = **Decision** → no Illustrative badge, catalogue-row timing understood).

**The catalogue row is deliberately NOT flipped to `ready`.** Three build guards derive
their work list from the catalogue's ready routes, so flipping before the page exists fails
the build looking for a page that isn't there. **Catalogue + page + screen + guards must
land in ONE commit** — the Lease vs Buy lesson.

### Next phases (each its own approval)

1. **The screens** + catalogue row + both guard entries, in one commit.
2. **The source `.xlsx` correction** — deliberately deferred so the binary file is opened
   **once**, after all rulings, rather than edited three times.
3. **The interactive layer Mike ruled in:** hurdle-rate test (does a proposed investment
   clear the WACC?), gearing curve (which debt/equity mix minimises it — advice the
   workbook cannot give), sensitivity view, helper-to-calculator adopt button with
   provenance, and static reference links to where the bond rate and index return are
   published.

🔒 **Deferred, needs its own ruling — a LIVE market-data feed.** Static reference links are
in scope above and carry no risk. A live feed needs a backend-only API key, costs money,
and market data is typically **licensed with redistribution to clients restricted**; it can
also fail mid-client-meeting. No client-privacy exposure (only a ticker leaves the
building). Not started.

---

## Waiting on Mike (none urgent, none blocking)

1. **Eyeball the three stepped screens** — Quick Position, EBITDA-DCF, Loan Estimator:
   header full width, and the header→chips and chips→content gaps equal (both 16px). A
   static read on 2026-07-28 says all three are correct (identical `::v-deep` reset on all
   three pages, more specific than `ReportHeader`'s own rule so it wins; the header cannot
   shrink here because `.report-shell__wrap` is a block, not the flex column that caused the
   original defect). **Reading CSS proves intent, not rendered pixels** — no test can measure
   a gap, so this needs a human.
2. **Model Library in dark mode** — switch Windows to dark, confirm the page stays light.
3. **`v0.6.0`: which record is true?** `DEPLOYED-VERSIONS.md` says it was *offered* to the
   master team and is awaiting pull; `SESSION-2026-07-27-NOTES.md` says it was *"still not
   sent"*. Both cannot be true, and the ledger is the binding document.
4. **A contradiction flagged but NOT edited** — `ACTIONS.md` records the Lease vs Buy source
   `.xlsx` correction as **done** (`402c595`) in one line and **outstanding** two lines
   below. One is stale; Mike to say which.

---

## Release position (ruled 2026-07-28)

**`v0.6.0` is NOT being chased; a fresh tag will supersede it.** Mike ruled: build more
models first so the master team pulls **once**, then release. At the time of the ruling
`v0.6.0` (commit `9a29aee`, cut 2026-07-21) was still awaiting pull, `master` had moved
**35 commits** past it, and this branch **95** — so the offered tag contains none of the
Loan Estimator, Lease vs Buy or the report visual standard.

> ⚠ **Watch item.** The gap to UAT grows while models are batched. This is the same shape as
> the 97-commit drift that prompted the Working Agreement — slowed down and deliberate, but
> not eliminated.

---

## Environment notes (unchanged)

- Node via the NVM symlink; `npm`/`node` are **not** on the default session PATH — export it
  first. npm 6 there is READ-ONLY use; installs need the npm 10 + `--legacy-peer-deps` route.
- **Dev servers are Mike's to start/restart — the AI never touches them.** A backend restart
  is needed before `/api/report/cost-of-capital` will serve.
- This laptop has no `OPENAI_API_KEY` — advisor-chat routes can't be live-verified here.

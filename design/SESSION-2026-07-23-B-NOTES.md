# Session Notes — 2026-07-23 (session B) · Laptop (Business Performance Report)

> **Loan Estimator Phases 1–3 BUILT, proven and pushed** (commits `cb86bad` · `1187924` ·
> `4c11eb3`). Suite **1,626 → 1,667 green / 117 suites**, lint 0 errors, working tree
> clean, branch level with its remote (6 ahead of `master`, 0 behind). Nothing is
> half-finished; nothing would be lost if this machine stayed closed for a month.
> **Desktop: `git fetch origin && git merge origin/master` before anything else, as usual.
> Nothing here touches Course Builder files.**

---

## What shipped (all backend — no route, catalogue row or screen yet)

1. **Phase 1 — rule table + security position** (`cb86bad`). `data/loan-criteria.json`
   (15 security classes — the plan's "16" was wrong — plus overdraft criteria, verbatim
   with source cells) and `computeLoanEstimator` in
   `server/report/loanEstimatorModel.js`. 22 golden tests.
2. **Phase 2 — repayment schedules + Quick Calculator** (`1187924`).
   `computeRepaymentSchedule`: Table / Reducing monthly engines rolled up to the 10-year
   table; anchor `5747.094633` lands. Golden tests → 31.
3. **Phase 3 — serviceability + the central tax feeder** (`4c11eb3`).
   `computeServiceability`: tax → net through the new feeder, rentals at the marginal
   band of the stacked total, bank-minimum loan repricing, the allowances floor, surplus
   and `verdictPass`. Golden tests → 41. All mutation-verified outside the repo.

## ⚠ Three defects found in the source workbook — all ruled by Mike, all corrected in BOTH code and the `.xlsx`

- **Reducing balance row** (`Interest` AA8:AF8) read cumulative-interest/principal
  columns → impossible collapsing-then-climbing balance. Now reads column N
  (930,000 → … → 780,000).
- **Interest-Only payment** (`Interest` G24) was computed on the *purchase price*; ruled
  to the *loan amount* (4,950, was 6,187.50).
- **Rental-income tax** (`Serviceability` AL13/AL16) had missing parentheses in three
  branches (`rental − threshold×rate`). Correcting it **flips the sample surplus from the
  old hand-verified anchor `105.7495571` to `−154.8337762`** — the sample household
  genuinely fails the affordability test. The old anchor had encoded the defect.

**If any machine has an old local copy of `design/report-source-models/The Loan
Estimator.xlsx` open or cached, discard it and re-pull** — the repo copy is the corrected
one (edited surgically, verified by re-reading with the repo's own `xlsxReader`).

## 🆕 The central tax-band feeder — binding on future model work

`data/tax-bands.json` is now the **single tax source for ALL models and reports**
(Mike's ruling, this session): country-keyed, dated, source-stamped (NZ verified against
IRD 2026-07-23 — the bands are current). A country is **absent until a verified table
exists** (`getTaxBands('AU')` throws — deliberate). Never hardcode tax rates in a model
again. The AI-proposed-update + firm-editing flow is logged in `ACTIONS.md` as a
follow-on workstream (human approval mandatory, gated on Firm Manager Auth).

## Where the workstream stands

- **Next: Phase 4 — route, catalogue row, screen(s).** Opens with Mike's two remaining
  decisions: **verdict wording** (§3.3 — "Looking Good!"/"Doesn't Look Good" are the
  workbook's words, not approved) and **one screen vs stepped flow** (§3.4 —
  recommendation: stepped, like Quick Position). Then Phase 5 (consistency guards — the
  `SCREENS` list step that fails silently if skipped) and Phase 6 (business block).
- The `Serviceability Input` and remaining `Loan Criteria` cells are fully mapped —
  formulas proven from the sheet XML, notes in this session's chat and the ACTIONS
  entries; the business block (H96/H98, EBIT ratio) is mapped enough to start Phase 6.

## Carried items (unchanged today)

- **`v0.6.0` still not sent to the master team** (Mike's end-of-week item, carried since
  2026-07-22). `master` keeps moving away from that tag.
- **Advisor-chat `[[TEMPLATES: …]]` change (`d791a9a`) still unverified live** — needs one
  real conversation on a machine with an `OPENAI_API_KEY`; this laptop has none.
- Dev-toolchain reconcile P1 remains overnight/reinstall-gated (desktop).

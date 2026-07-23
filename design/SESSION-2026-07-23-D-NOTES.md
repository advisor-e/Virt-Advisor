# Session Notes — 2026-07-23 (sessions D + E) · Laptop (Business Performance Report)

> **Loan Estimator Phase 4b COMPLETE — the report is LIVE in the Model Library**, viewed
> and approved by Mike in his running app (all three steps + report). Suite
> **1,674 → 1,700 green / 121 suites**, lint 0 errors, working tree clean, branch level
> with its remote (0 behind `master`). **Desktop: `git fetch origin && git merge
> origin/master` first, as usual. Nothing here touches Course Builder files.**

---

## ⚠ Session D died without a note — recorded here after the fact

Session D hit Mike's Claude usage limit mid-work and ended with **no handover and an
uncommitted tree** (the step 1 security screen + test, built but unrecorded). Session E's
startup checklist caught it; Mike confirmed ("keep the work and move forward"), the work
was test-proven (suite + lint before anything else), then committed. Nothing was lost —
but this is exactly why `/shutdown` exists.

## What shipped (7 commits, all pushed)

1. `9451e6f` — **Step 1 security screen** (`LoanEstimatorSecurity.vue` + tests): the
   `Capital Input` grid, rows single-source from `data/loan-criteria.json`, the two
   sheet-wired derived rows (G21=D26, G39=D31) read-only from side calculations.
2. `1f269a7` — **Step 2 serviceability screen** (`LoanEstimatorServiceability.vue` +
   tests): the workbook's own field wording (Mike-approved as ONE list). Ruled same day:
   legal name/date NOT captured (PII), Hire Purchase omitted (sheet never costs it),
   country fixed `'NZ'` silently.
3. `d2ca480` — **Step 3 result screen** (`LoanEstimatorReport.vue` + tests): ruled
   verdict + qualifier, HeroStrip, security/serviceability summaries, interactive Quick
   Calculator (`currencyMixin` + `reportRecompute`); Interest-Only faithfully
   schedule-less.
4. `60607b9` — **Catalogue flip + guard entries** (ruled order: flip LAST): row →
   `STATUS_READY` + ruled summary + `/loan-estimator`; `RENDERED_BY` map + headline-guard
   `SCREENS` entry; **plus a third guard the recipe doesn't mention** — the catalogue
   census tests (ready-routes list, built-model classes, `readyCount`) pin the exact set
   of live models and needed the 7th entry. First Decision-class build; no badge.
5. `6efd12c` — first colour pass (superseded same day by the consistency ruling below).
6. `style(report)` — **entry-step consistency restyle.** Mike's ruling, hard-earned:
   *the entry steps must look like the finished models* — NOT bolder, NOT their own
   look. The fix was the section's signature `HeroStrip` on steps 1–2 with live
   **display-only** running totals, plus the house colour layer. Lesson recorded: the
   finished models' visual identity IS the dark strip; a form page without it reads as
   unstyled no matter how much trim it gets.
7. `feat(report)` — **`maxAffordableNewLoan`** (Mike-requested, wording approved:
   *"Estimated maximum borrowing" / "With everything else as entered — an indication
   only"*). **APP-ORIGINAL formula — no workbook cell, so no golden anchor**: largest
   New-Property-Loans balance keeping surplus at the 250 threshold, solved directly
   (minimum payment is linear in balance). **Round-trip proven**: the max fed back in
   lands surplus exactly on 250 (sample: **$451,561.88** vs the failing $500k). Hero #4
   on the report banner.

## The load-bearing tests

- **SAMPLE PARITY** (steps 1 + 2): the untouched screen emits deep-equal to the
  backend's `DEFAULT_INPUTS` / `DEFAULT_SERVICEABILITY_INPUTS` — neither copy can drift
  alone.
- **Corrected-verdict anchor**: the screens' own sample renders −154.83 / FAIL through
  the real assembler (the third source-defect correction, end to end).
- **Round-trip proof** for the app-original borrowing formula (above).

## Where work stopped / next session

- **Next: Phase 6 — the business block** (`Serviceability Input` rows 62–103), scoped
  read-only this session: business entity EBIT (342,000 sample), the nine commercial
  classes re-derived at bank-adjusted values with Year-1 interest, EBIT-to-interest
  ratio (1.701976765), bank-adjusted maximum security (1,854,001.5), maximum
  bank-adjusted loan (G102, 9.5%/15yr, pmt 10,204.07051), staff counts + tax due.
  Formulas NOT yet extracted — model + golden test first, per the recipe. Entity name is
  PII — do not capture it.
- Nothing half-finished. Tree clean, everything pushed.

## Environment notes (this laptop)

- Mike's PowerShell has no `npm` on PATH — Node lives at `C:\nvm4w\nodejs`. Working
  one-paste start line (both services, one terminal):
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"; Start-Process "C:\nvm4w\nodejs\npm.cmd" -ArgumentList "run","backend" -WorkingDirectory "C:\Users\mb\Projects\Virt Advisor"; npm run dev`
- The backend was restarted by the AI **at Mike's explicit instruction** this session
  (twice: once dead, once to load the new formula — old code stays in memory until
  restart). It runs under the AI session and dies with it; restart via the line above.

## Carried items (unchanged today)

- **`v0.6.0` still not sent to the master team** (Mike's end-of-week item, carried since
  2026-07-22).
- **Advisor-chat `[[TEMPLATES: …]]` change (`d791a9a`) still unverified live** — needs a
  machine with an `OPENAI_API_KEY`; this laptop has none.
- Dev-toolchain reconcile P1 remains overnight/reinstall-gated (desktop).

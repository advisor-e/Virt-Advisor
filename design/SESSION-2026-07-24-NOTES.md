# Session Notes — 2026-07-24 · Laptop (Business Performance Report)

> **Loan Estimator Phase 6c/6d COMPLETE — the Business loan step is LIVE in the wizard**,
> built, viewed by Mike in his running app, and shipped. Suite **1,721 green / 122 suites**,
> lint 0 errors, tree clean, branch **23 ahead / 0 behind `origin/master`**.
> **Desktop: `git fetch origin && git merge origin/master` first, as usual. Nothing here
> touches Course Builder files.**

---

## What shipped (2 commits, both pushed)

1. `a661a7e` — **Business loan step (Part E), front and centre — Phase 6c/6d.** New wizard
   order: **Security → Business loan → Serviceability → Report** (business is step 2, per
   Mike's ruling: for business owners the business loan is the main event, not an optional
   extra). New `components/LoanEstimatorBusiness.vue` (EBIT, Business Type Commercial/Farm,
   full/part-time staff, current tax due; entity name NOT captured — PII; securities carried
   through from step 1, never re-typed). Report leads its 4-cell headline band with the
   **Maximum business loan** (shown positive; sheet stores it negative by PV convention),
   with a Business loan detail card; the personal max-borrowing figure moves into the
   household card when business is present. Hero + card gated on the business PROP, so a
   purely personal enquiry is unchanged.
2. `fd2e25d` — **rate + term on the business card (follow-up).** `computeBusinessBlock` now
   returns `loanRate` (0.095) and `loanTermYears` (15) from the config it already held, so
   the card shows "Interest Rate" and "Term (Yrs)" from the single source of truth.

Wording for the whole step is the workbook's own, Mike-approved 2026-07-24 (EBIT shown
plainly, not "E.B.I.T").

## ⭐ NEXT TASK — Serviceability stress-margin (advisor-set), a deliberate model change

**Confirmed design (Mike, 2026-07-24):** the **client enters their own advertised rate**
(e.g. 5.5% — and that is all the client ever sees). The **advisor sets a stress margin**
on top (e.g. +2%). The two are **ADDED** (5.5% + 2% = 7.5%), and that combined figure
drives the serviceability / affordability assessment.

**This is a DELIBERATE departure from the source workbook — not a restoration.** Proven
from `design/report-source-models/The Loan Estimator.xlsx`, sheet `Serviceability Input`:
- The "Assessment Rate" column (`G12/G14/G16`) is a **formula** `='Loan Criteria'!H4`
  (fixed 8.95%), **not** a typed input.
- The "Greater Rate" helper `AI20 = IF(AG20>AH20, AG20, AH20)` = **MAX**, never additive.
  Min payment = `PMT(AI20/12, …)`.
- So the workbook uses **max(fixed 8.95%, client rate)**; the current port is faithful to
  that (`minPayment` in `server/report/loanEstimatorModel.js` uses
  `Math.max(residentialAssessmentRate 0.0895, actualRate)`).
- Mike is right that **real banks stress by adding a buffer on top** — the workbook just
  took a shortcut. We are improving on it, with the owner's explicit approval. (Twice this
  session I conceded "you're right, it's a defect / it was locked" before opening the actual
  cell — DON'T. Prove against the source first; see the debugging protocol.)

**Three answers needed from Mike BEFORE building:**
1. **Default stress margin** — what value (e.g. 2%)?
2. **Scope** — all four serviceability loan rows (revolving credit, current property, new
   property, personal term) or just the property loans? (Note: personal term loans currently
   use their own actual rate 13.95% directly, with no assessment floor.)
3. **Field label** — exact wording for the advisor's stress-margin field (don't invent).

**Also clarify:** does the margin touch only the serviceability loans, or also the
**security-position stress test** (the security screen's per-asset `assessmentRate` values —
residential 8.95%, plant 9.75%, vehicles 11%, etc. — drive a separate "stress-tested
payment"; likely OUT of scope, but confirm).

**Impact / where it lands:**
- `server/report/loanEstimatorModel.js` — `minPayment` becomes `actualRate + stressMargin`
  instead of `max(fixed, actualRate)`; add a `stressMargin` input to the serviceability block.
- `components/LoanEstimatorServiceability.vue` — add the advisor stress-margin field; the
  client-facing rate stays their actual rate.
- `locales/en.json`, serviceability + report tests.
- **The sample verdict (−154.83 / FAIL) WILL change** — bring Mike the NEW sample numbers to
  approve before it goes live (the corrected-verdict golden anchor is rebuilt).

## Environment notes (this laptop)

- **Both dev servers were started by the AI at Mike's explicit instruction this session**
  (backend 4000 + frontend 3000) to let Mike view the Business loan step live. They run
  **under this AI session and die when it ends.** Restart line (both services, one terminal):
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"; Start-Process "C:\nvm4w\nodejs\npm.cmd" -ArgumentList "run","backend" -WorkingDirectory "C:\Users\mb\Projects\Virt Advisor"; npm run dev`
- Live path verified end-to-end this session: `POST /api/report/loan-estimator {business:{}}`
  returns `loanRate 0.095`, `loanTermYears 15`, `bankAdjustedMaxSecurity 1947001.5`.

## Carried items (unchanged today)

- **`v0.6.0` still not sent to the master team** (Mike's end-of-week item, carried since
  2026-07-22).
- **Advisor-chat `[[TEMPLATES: …]]` change (`d791a9a`) still unverified live** — needs a
  machine with an `OPENAI_API_KEY`; this laptop has none.
- Dev-toolchain reconcile P1 remains overnight/reinstall-gated (desktop).

# Session Notes — 2026-07-24 (B) · Laptop (Business Performance Report)

> **Serviceability STRESS-MARGIN SHIPPED + a backend networking bug found and fixed.**
> Two commits, both pushed. Suite **1,721 → 1,724 green / 122 suites**, lint 0 errors,
> tree clean, branch **27 ahead / 0 behind `origin/master`**.
> **Desktop: `git fetch origin && git merge origin/master` first, as usual. Nothing here
> touches Course Builder files** — the backend bind fix touches shared infra
> (`restify-server.js` + the 5 proxies) but is behaviour-preserving.

---

## What shipped (2 commits, both pushed)

1. `bfd6223` — **Serviceability stress-margin (advisor-set buffer).** The three
   property/revolving loans are now assessed at the client's own entered rate **PLUS an
   advisor "Stress test margin (%)"** (firm default 1.5%), REPLACING the workbook's flat
   `max(8.95% floor, rate)`. Personal Term Loans keep the workbook rule (entered rate
   alone, no margin). A **deliberate, owner-approved departure** from the source workbook —
   not a defect fix; real banks add a buffer on top of the client rate. 8 files:
   `server/report/loanEstimatorModel.js`, `data/loan-criteria.json`,
   `components/LoanEstimatorServiceability.vue`, `locales/en.json`, and four test files.
2. `6e11daa` — **Backend IPv4 bind fix (DX).** `server/restify-server.js` now binds
   `127.0.0.1` explicitly (was IPv6-only), and the five Nuxt proxies target
   `127.0.0.1:4000`. See "The networking bug" below.

## The design (all Mike-approved this session)

- **Sample rate decision (Mike, 2026-07-24):** the demo New Property Loan now carries a
  realistic **5.95%** (was 0, which only made sense under the old flat floor). Under
  5.95% + 1.5% the sample household now **PASSES** — surplus **+345.33/mo** — where it
  previously showed the −154.83 FAIL. Mike chose 5.95% ("demo passes") from three options.
- **Three ruled answers (carried from the 2026-07-24 A spec, all confirmed):** default
  margin **1.5%**; scope **the 3 property/revolving rows only** (Personal Term Loans left
  alone); a **single advisor field** labelled **"Stress test margin (%)"** with the grey
  helper *"Added to each loan's rate for the bank's serviceability assessment — the client
  only ever sees their own rate."*
- **Rate column relabelled** (Mike chose "Interest Rate (%)"): the loan grid's rate column
  read "Actual Rate if higher than 6.65%" — that "if higher than…" framing described the
  retired floor and was now misleading, so it became **"Interest Rate (%)"**.

## Why this is sound (proof, not just green tests)

- **Mechanic:** `minPayment` for the three loans is now `annuityPayment((actualRate +
  stressMargin)/12, …)` instead of `annuityPayment(max(0.0895, actualRate)/12, …)`.
  Personal Term Loans call it with margin 0. `maxAffordableNewLoan` reprices on the same
  basis. `stressMargin` is an R8-declared input (defaulted-and-named when omitted).
- **Regression anchor kept:** a **3% margin reproduces the old −154.83 to the penny**
  (5.95% + 3% = the old 8.95% floor) — a test pins this, proving the new model is a clean
  generalisation of the old behaviour rather than an unrelated formula.
- **Config single-source:** the 1.5% default lives in `data/loan-criteria.json` →
  `serviceability.stressTestMargin` (a future Firm-Manager edit target), with a `_note`
  spelling out the departure.
- **Mutation-verified outside the repo:** breaking the code two ways — using `max()`
  instead of adding the margin, and applying the margin to Personal Term Loans — both make
  the new tests fail. So the tests genuinely pin the behaviour.
- The **debugging protocol paid off:** Mike reported "I changed rates down but
  serviceability didn't connect." Rather than assume, I probed his LIVE backend — it
  returned the old 8.95%-floor figure, proving it was running stale code (not restarted),
  which is the exact symptom of the old floor swallowing any rate below 8.95%. Secondary
  point surfaced: three of the four sample loans have a £0 balance, so their rates are
  mathematically inert until a balance is entered.

## The networking bug (found while restarting the backend)

When Mike restarted the backend to pick up the new maths, two things went wrong and were
diagnosed + fixed:

1. **Orphaned process holding the port.** An old backend (PID from 9:41am) never shut down
   on Ctrl+C; it kept serving stale code and blocked the restart with `EADDRINUSE`.
   Diagnose with `Get-NetTCPConnection -LocalPort 4000`, kill the PID, then `npm run
   backend`. **The human runs this — the AI never starts/restarts the dev server.**
2. **IPv6-only bind.** `server.listen(PORT)` (no host) binds `::` IPv6-only on Windows;
   the proxies target `localhost:4000`, and when `localhost` resolves to IPv4 the proxy
   gets `ECONNREFUSED 127.0.0.1:4000`. This is the **backend twin** of the 2026-07-21
   `nuxt.config.js` frontend fix. Fixed IPv4 end-to-end (`6e11daa`): backend binds
   `127.0.0.1` (BACKEND_HOST env override for deploys); the five proxies default to
   `127.0.0.1:4000` (API_BASE_URL override untouched). Proven reachable on a throwaway
   instance. **Takes effect on the next `npm run backend`** — the fix is committed, so it
   applies whenever the backend is next started.

## Environment notes (this laptop)

- Both dev servers (backend 4000 + frontend 3000) were **started by Mike**, not the AI.
  The AI never starts/restarts them. To restart the backend after a code change:
  Ctrl+C in the port-4000 window, then `npm run backend`.
- This laptop has **no `OPENAI_API_KEY`** — advisor-chat routes can't be live-verified here.

## Carried items (unchanged today)

- **`v0.6.0` still not sent to the master team** (Mike's end-of-week item).
- **Advisor-chat `[[TEMPLATES: …]]` change (`d791a9a`) still unverified live** — needs a
  machine with an `OPENAI_API_KEY`; this laptop has none.
- Dev-toolchain reconcile P1 remains overnight/reinstall-gated (desktop).

## Next candidates (Mike to pick)

- The Loan Estimator is now feature-complete through Phase 6 + the stress-margin. No open
  Loan Estimator task remains.
- Strongest standing candidates (from ACTIONS.md ★): **Firm-Manager config persistence →
  MySQL**, the **jest coverage-gate**, or the **dormant-trees needs-signal bucket**.

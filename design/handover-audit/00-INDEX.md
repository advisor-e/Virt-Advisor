# Handover Readiness Audit — Index

> **Purpose.** Read-only audit run Sunday 2026-06-21 in preparation for the Friday hand-over to
> the senior coding team. Five parallel audits, each read-only (no code changed, no `search_content*.json`
> touched, no tests run). Every finding in the underlying reports is cited to a real `path:line`.
> Nothing here had been actioned **as of the audit date (2026-06-21)** — it was a findings + decisions
> package. See the **Resolution log** immediately below for what has since been closed (2026-06-22).

---

## Resolution log (2026-06-22) — actioned since the audit
> Added after the audit; the five dated reports below are preserved as the original 2026-06-21 snapshot.
- ✅ **`translate.js` (audit #5 boundary deviation + the Node-14 `fetch` finding) — FIXED** (`master` `9c9fda1`). Backend route moved to the built-in `https` module (Node-14 safe); the Nuxt middleware is now a thin proxy (third-party logic off the Nuxt layer); the duplicate copy is gone; 11 tests; proven live on Node 14.15 (real translation returned). The latent `fetch`-on-Node-14 failure and the architecture-boundary breach are both closed.
- ✅ **`courseEngine.js:213` unvalidated LLM `JSON.parse` (cross-cutting finding B) — FIXED** (`master` `303c8f9`). New `validateCourseOutline` (100% coverage) + 18 tests; a wrong-shape outline degrades to the safe "no outline" state. The quiz paths (`:390`/`:433`) were already validated.
- ✅ **`ACTIONS.md:130` contradiction (decision #2) — RECONCILED** (`master` `bfed6a8`). The stale "OpenAI engine still in Nuxt / advisor.js 2061 lines" line is corrected; the boundary work is recorded as done (proxies thin, engines on the backend).
- ✅ **HANDOFF.md Node guidance (decision #1) — already current.** The on-disk HANDOFF.md carries a Node-14.15 "Local Setup / Run" section; the "Node 18/20" wording the audit flagged predates that fix.
- ☐ **Still open, now logged in `ACTIONS.md`:** the `jest.config.js` coverage-exclusion enforcement gap (audit #3). ✅ The 3 confirmed-dead exports (audit #4) and Decision #3 (orphaned `validateAIResponse({content})` / `parseSSELine` retire) were **both DONE 2026-06-23**. Decisions #5 (i18n scope) and #6 (28 dormant trees) remain Mike's calls.

## The five reports
1. [i18n hardcoded-English sweep](i18n-audit.md)
2. [JSDoc coverage audit](jsdoc-audit.md)
3. [Static test-coverage map](test-coverage-map.md)
4. [Dead code & orphans](dead-code-and-orphans.md)
5. [Docs vs as-built + architecture-boundary check](docs-vs-asbuilt.md)

---

## Headline for the incoming team (the one-paragraph version)

The **backend decision engine works and its security/architecture posture is sound** — the OpenAI
SDK→REST migration genuinely landed, the architecture boundary holds (no secrets/SDK/DB in the Nuxt
layer), and the AI-output *validators* are well tested. The debt is concentrated in three places a new
team will hit fast: (1) the **entire Nuxt frontend is both untested and un-internationalised**; (2) the
**crown-jewel decision engine is the least-documented, least-coverage-enforced part of the codebase**;
and (3) **the handover docs themselves have stale spots** that would actively mislead a new dev on day one.

---

## Cross-cutting findings (where two+ audits agree — these matter most)

**A. The frontend is a test *and* i18n desert — same root, two symptoms.**
The test-coverage map and the i18n sweep independently hit the same wall: `VirtualAdvisor.vue` is the
only partially-compliant component, and everything else (`FirmManagerHub.vue`, `CourseBuilder.vue`) is
bare. There are **0 `@vue/test-utils` component tests and 0 Playwright e2e tests** (no `tests/e2e/`, no
`playwright.config`), and **~310 hardcoded user-facing strings** with only `VirtualAdvisor` using `$t()`
at all. The whole Vue layer is untested and unlocalised.

**B. The most valuable IP is the least-protected by docs and coverage gates.**
`templateResolver.js`, `strategyResolver.js`, `caseState.js`, `signals.js` — the scoring/decision engine —
carry **0 JSDoc**, and `jest.config.js` `collectCoverageFrom` **excludes** `advisorEngine.js`,
`courseEngine.js`, `server/routes/**`, and `mixins/**`, so the stated ≥90% route / ≥80% mixin targets are
**unenforced** even where tests exist. `courseEngine.js` parses LLM output with an **unvalidated
`JSON.parse` at `:213`**, which the 100%-AI-validation rule is supposed to forbid.

**C. The good news, confirmed: architecture boundary PASSES.**
No Nuxt-reachable file imports `openai`, reads `OPENAI_API_KEY`, calls `api.openai.com`, or touches
`mysql2`. `server-middleware/advisor.js` (56 lines) and `course.js` (51 lines) are now true thin proxies;
engines live in `server/`. Nuxt `env:` exposes only `apiBaseUrl`. This is the single biggest "is it safe
to hand over?" question and the answer is yes.

---

## Decisions needed from Mike (ideally before Friday)

1. **HANDOFF.md is stale in two ways that will mislead the new team — fix before Friday.**
   It still says "use Node 18/20 LTS" (`HANDOFF.md:276-280`), which contradicts the locked **Node 14.15**,
   and it has **no Local Setup/Run section** — the real setup gotchas (exact-path Node 14.15,
   `NODE_EXTRA_CA_CERTS`/Avast cert, npm 8 for `overrides`, `nuxt start -H 0.0.0.0`, backend not
   auto-loading `.env`) live scattered in `CLAUDE.md`/session notes/memory but **not in the one doc the
   incoming team will read**. → *Want me to draft the corrections for your approval?*

2. **`design/ACTIONS.md:130` contradicts `:72`** — it lists the OpenAI-engine-in-Nuxt migration as an open
   architecture item ("advisor.js 2061 lines…") when audit #5 confirms it's **done** (proxies are 56/51
   lines). → *A one-line reconcile; approve and I'll fix it.*

3. **Orphaned-utils retire-or-retarget** (the long-open P1 leftover): ✅ **DONE 2026-06-23 — RETIRED.**
   `validateAIResponse({content})` and `parseSSELine` had zero production call sites and no genuine retarget
   home; both removed (fns + exports + test blocks). The file, its `ValidationResult` typedef, the live
   `validateQuizGenerate`/`validateQuizGrade`/`validateCourseOutline` validators, and the 100% coverage pin
   are kept (file still 100%-covered; 482 tests pass). See `design/ACTIONS.md` (P1 #1).

4. **`server-middleware/translate.js` has a real latent Node-14 bug** (new — not previously logged): it calls
   `api.mymemory.translated.net` directly with **global `fetch` (Node 18+)** at `:68,:98`. No secret/DB/LLM so
   low security severity, but it will **throw on the locked Node 14.15 runtime**. → *Log as a backlog item?*

5. **i18n scope call.** ~310 strings is a multi-day effort, not a sweep. Two parts can't be mechanised:
   the 14 domain labels are **triplicated** across 3 files (single-source first), and `PRIMARY_ISSUES` +
   the 3 locked frameworks are **platform-locked IP** — translating them is a product decision. → *Is i18n
   in scope for the new team, and do the locked-IP strings get translated at all?*

6. **The 28 dormant logic trees** (already an open decision, `ACTIONS.md:140`) — audit #4 reconfirms they are
   **dormant-by-design, not dead** (wired as a Stage-4 fallback, carry proprietary IP). Still needs your
   switch-on / retire / partial call. No new info, just re-surfaced for the handover.

---

## What I'd recommend the new team tackle first (my read, for your steer)

- **Enforce the coverage gates that already exist on paper.** Removing the `collectCoverageFrom`
  exclusions for the engines/routes is a one-file change that makes the ≥90%/≥80% targets real — highest
  leverage, lowest risk.
- **Document the decision engine** (`templateResolver` → `advisorEngine.handleQuery` → `courseEngine` quiz
  handlers) — it's the IP and it's the least readable. `validateAIResponse.js` is the in-repo gold standard
  to copy.
- **Add a `validateCourseOutline`/quiz-parse validator** for `courseEngine.js:213` to close the last
  unvalidated LLM `JSON.parse`.
- **Treat frontend tests + i18n as a planned programme**, not a cleanup — they're genuinely large.

---

## Audit scope & honesty notes
- All five audits were **static and read-only**. No tests were run, so claims like "421/421 pass" and actual
  coverage percentages are **not verified here** — flagged in each report's caveats.
- New issues surfaced that were **not** in the backlog before today: the `translate.js` Node-14 `fetch`
  incompatibility, the `jest.config.js` coverage-collection exclusions hiding the unenforced targets, and 3
  confirmed-dead exports (`getSummaryByPage`, `getTemplateByPage`, `SCORING_VERSION`). These should get
  backlog lines per the no-silent-parking rule — I've held off editing `ACTIONS.md` pending your go-ahead.

# Session Notes — 2026-07-21 · Laptop (Business Performance Report)

> Handover for the next session and the desktop. Everything below is **merged to
> `master`** (PRs #3–#9); the laptop's `feat/business-performance-report` branch equals
> `master` (0/0). Full suite **1,363 green**, lint clean, on Node 14.15.
> **Desktop: `git fetch origin && git merge origin/master` to catch up.**

## What shipped today (all on master)

1. **Process fix (PR #3)** — got `/startup`, `/shutdown`, the Working Agreement, the
   pre-push drift block and `check:branch` onto `master` (they were laptop-only, so the
   desktop couldn't find `/startup`). Plus the governance correction (UAT = 709bac5).

2. **Firm preferred-currency feature (PR #4)** — reports now show money in a firm-chosen
   currency, grouped by the reader's language.
   - Backend: `server/routes/currency.js` — `GET /api/report/currency` (any firm user,
     degrades to default) + `POST` (manager-only, allowlist-validated), persisted via
     `firmOverlay` (`config_key 'currency'`), dev-JSON fallback. `server-middleware/report.js`
     now forwards GET.
   - Frontend: `utils/currencyFormat.js` (pure Intl, unit-tested) + `mixins/currencyMixin.js`;
     a managers-only picker on the Model Library; all 6 report screens converted off
     hardcoded `$`/en-US. Single source: `data/currencies.json` (NZD default).
   - **Security-reviewed clean.** Also bundled the earlier R1–R24 report-review fixes.
   - Deferred (logged): plain-number localisation (day counts / chart ticks still en-US).

3. **firmOverlay version-history prune fix (PR #5)** — prune count was derived from the
   version number, not the row count, so an actively-edited config eventually lost ALL
   rollback history. Now counts rows; keeps the newest `maxVersionHistory`. +2 tests.

4. **Translate silent-English-fallback fix (PR #7)** — the chunker split on each single
   value's size, not the running total, so a normal locale payload became one oversized
   MyMemory URL → 414 → the whole locale reverted to English. Extracted `buildChunks()`
   (pure, exported), fixed to accumulate. +6 tests.

5. **Report-scaffolding plan (PR #8)** — `design/REPORT-SCAFFOLDING-PLAN.md`: turn the six
   reports' repeated building blocks into reusable base/shared components + mixins.

6. **Scaffolding Phase 1 (PR #9)** — `mixins/reportRecompute.js` (debounce + monotonic
   request-stamp race guard + stale flag); all 6 reports converted. **Closed the
   slider-race bug** in the 4 older reports. +6 mixin tests. Net −43 lines.
   - Behaviour note: failure feedback standardised — a backend-*rejected* calc (previously
     silent in the older reports) now surfaces the same toast. Minor improvement.

## Parked (not forgotten)

- **advisorEngine session-state race** — investigated + confirmed, **parked by Mike** as a
  higher-risk core-path change. Full write-up (mechanism, the four save points, recommended
  per-session-lock fix, need for overlapping-request tests) is in `ACTIONS.md`. Low-frequency
  trigger (concurrent same-session requests).

## Next session — strongest candidates

- **Scaffolding Phase 2** — `HeroFigure` + `SliderGroup` base components (bulk of the visual
  duplication; makes future reports mostly assembly). Then Phase 3 (badges/banner/shell) and
  Phase 4 (the "add a report" recipe). See the plan doc.
- Or a laptop-doable bug from `ACTIONS.md` (e.g. `tierLookup` empty recommended-templates;
  CourseBuilder spinner-stuck; the parked session race when there's time for a careful pass).

---

## Session 2 — same day, afternoon · Laptop · Scaffolding Phase 2

> **Phase 2 is COMPLETE and every converted screen was browser-verified by Mike.**
> 5 commits on `feat/business-performance-report`. Suite **1,363 green**, lint clean.
> **Desktop: `git fetch origin && git merge origin/master` once these land on master.**

### What shipped

- **`components/base/HeroStrip.vue` + `HeroFigure.vue`** — the dark headline banner,
  extracted from five hand-rolled copies. Converted: Debtor Drag, Working Capital,
  Margin & Break-even, Quick Position, EBITDA/DCF.
- **`components/base/SliderField.vue`** — one labelled slider. Converted: Margin &
  Break-even, Working Capital, Debtor Drag.
- Both are **presentation only**. Screens keep their own formatting (via `currencyMixin`)
  and pass finished text in, so no new user-facing wording and no locale changes.
  SliderField takes colours from `--sl-*` custom properties, so each screen keeps its own
  palette **and** its dark-mode overrides.
- **Terminology:** "cash cycle" → "working capital cycle" in all user-facing copy
  (Working Capital's wheel heading, slider-group title and aria-label; one use in the
  Debtor Drag coach text). Left untouched where it is a **search keyword**
  (`data/logic_trees.json`, `scripts/*`) — removing it there would make the engine worse
  at recognising the topic.
- **Margin & Break-even usability fix** — the amber price-change slider read as dead
  because its only visible effect was a 5px chart dot and four figures in an unlabelled
  grey box, while the hero figures deliberately never move. The box now has an
  owner-approved heading ("If you change your price") and turns amber when the change is
  off zero. The hero band was deliberately NOT touched: mixing a hypothetical into it
  could be read as a real figure in a client meeting.

### Scope correction — the six screens are NOT uniform

The plan's inventory overstated the reach; both plan docs are now corrected.

- **Eight Levers is excluded from BOTH halves** — different headline (light stat cards)
  *and* different slider (5px pill track, hard-stop gradient, filled thumb). A different
  visual language, not a drifted copy.
- **Quick Position keeps its own sliders** — different track, provenance badge inside the
  label, R22 dynamic `moneyMax` ceiling. **EBITDA/DCF has no sliders.**
- Extraction stopped wherever continuing would have been a redesign rather than a
  de-duplication. Unifying those screens should be a deliberate design decision.

### Open, logged, NOT approved (Mike to rule)

- **Working Capital's orbiting coin conveys nothing across half its range** (P3, UX).
  Measured live: 0d and 10d receivables both floor at 1.4s/lap despite 30× vs 6× turns;
  90d gives a 17s lap that reads as stationary. Pre-existing. Proposed fix: clamp both
  ends (~0.8s to ~8s).
- **Dev server binds IPv6-only** (P3, DX) — `nuxt.config.js` `server.host: 'localhost'`
  resolves to `::1` here, so `127.0.0.1:3000` is refused. Optional one-line fix; it is
  shared config, so it affects the desktop and the master team too.

### Process lessons from this session (cost most of an afternoon)

1. **Never run `nuxt build` while the dev server is running** — they share `.nuxt`.
2. **Never start or restart Mike's dev server.** He runs it in the VS Code terminal
   (`$env:PATH = 'C:\Users\mb\AppData\Local\nvm\v20.20.2;' + $env:PATH` then `npm run dev`).
3. **When verifying a server is reachable, test the address the user's browser uses.**
   Checking `localhost` returned 200 from `::1` while Mike's browser got nothing from
   `127.0.0.1`, and that mismatch was mistaken for "the server is fine" four times over.
4. **Phase 2 had zero automated visual coverage.** The suite stayed green through every
   conversion and could not have caught a visual regression — only Mike's eyes could.
   This is the strongest argument yet for the TEST-GAP component-test tooling (desktop).

### Then, same session — the day did NOT end at Phase 2

Everything below happened after the Phase 2 handover was first written.

**Component-test tooling installed and proven — the TEST-GAP blocker is closed.**
`@vue/test-utils@1.3.6`, `@vue/vue2-jest@27.0.0`, `vue-template-compiler@2.7.16`, plus the
`jest.config.js` transform + `~/` mapper. `testEnvironment` stays `'node'`; component tests
opt into jsdom per-file. Proven by `tests/unit/heroFigure.component.test.js` — **Pug
compiles through the transformer on Node 14.15**, which was the main unknown.
- **It did NOT need the desktop.** Node 20 ships npm 10, which works here with
  `--lockfile-version 2 --legacy-peer-deps` + the exported Windows root CA bundle (the
  network runs Avast TLS interception). `--legacy-peer-deps` is **mandatory**: without it
  npm 10 resolves a *pre-existing* unmet peer of `tsutils` and installs `typescript@7`, a
  Stack Constitution violation. Hit it, reverted, reinstalled clean. Verified additive:
  51 packages added, 0 removed, 0 version changes, lockfile still v2.
- Never `strict-ssl false` — that disables verification for every package download.

**Stack Constitution compliance audit — all 9 requirements PASS.** 31/31 `.vue` files Pug,
no TypeScript in package.json *or* the lockfile, no Nuxt 3/Vue 3 patterns, no forbidden
Node 16+ APIs, every locked version intact, OpenAI absent from all Nuxt-side files. One
deviation found and fixed: `SliderField`'s `$emit` was undocumented (Engineering Standards
require a payload comment on every emit).

**Desktop merged — both divisions are in `master` for the first time.** PR #14 brought
Course Builder in. Audited from the laptop before merge: `package.json`/`package-lock.json`
byte-identical to `master`, no TypeScript, all laptop work intact, their 4 changed `.vue`
files Constitution-compliant. Combined suite **1,456 / 99 suites green**.

**🏷 `v0.6.0` TAGGED AND PUSHED — the first release tag this repo has ever carried.**
Commit `9a29aee`. 174 commits ahead of `709bac5`, the build UAT has run since 2026-07-14,
and **the first release containing Course Builder**. Verified at tag time: 1,456 tests,
lint clean, `nuxt build` green on Node 14.15. `package.json` gained `"version": "0.6.0"`
so the manifest and tag cannot disagree.
- Notes for the master team: [`RELEASE-NOTES-v0.6.0.md`](RELEASE-NOTES-v0.6.0.md).
- [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) has a new **"Releases offered"** section —
  `v0.6.0` is **awaiting pull**, NOT recorded as deployed. A tag existing is not a
  deployment. Move it to the deployment table when the team confirms the pull.
- ⚠ **Still to do (Mike, outside the repo): tell the master team to pull tag `v0.6.0`**
  and reply with what they installed.

**Also fixed:** the dev server bound IPv6-only (`nuxt.config.js` `server.host: 'localhost'`
→ `'127.0.0.1'`), and the Working Agreement gained *The running application — who owns it*.
PR #1 (`chore/i18n-jsdoc-cleanup`, 161 commits behind) closed unmerged, branch kept for
salvage.

### Next

Phase 3 (`ProvenanceBadge` + `StaleBanner` + `ReportShell`) and Phase 4 (the "add a
report" recipe). Or either of the two logged rulings above. **Or — now possible for the
first time — write the actual component tests** (QP intake badge cases, stale banner,
out-of-order response, restore round-trip, plus a shared Buefy stubbing helper).

**Desktop on next open:** it is **5 commits behind `master`** — merge `master` in before
anything else, or the pre-push hook will block and it will look like a fault.

---

## Housekeeping

- Dev servers (backend + Nuxt) may still be running from live-verification; dev currency was
  set to a non-default via the picker (dev-only `data/dev-firm-currency.json`, gitignored).
- No deployment happened — `master` is ahead of UAT as normal; a release tag + a
  `DEPLOYED-VERSIONS.md` row is a separate future step when the master team pulls.

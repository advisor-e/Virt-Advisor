# Session 2026-07-18 — Report-feature review sweep (findings only, no code changed)

> **What this is.** A full review of the business-performance-report feature as merged to
> `master` (Quick Position + EBITDA & DCF, stages A–D, plus the intake pipeline) — checked
> for drift from the tech plan ([`BUSINESS-PERFORMANCE-REPORT-PLAN.md`](BUSINESS-PERFORMANCE-REPORT-PLAN.md),
> [`REPORT-DATA-MODEL.md`](REPORT-DATA-MODEL.md) §4) and for plain bugs. Three parallel
> reviewers (backend engines/routes · intake pipeline security · frontend screens) plus
> direct verification. **No code was changed** — every item is gated on Mike's per-item
> approval, per the LIVE-APP rule. Fix session planned for 2026-07-19.
>
> **Baseline at review time:** full suite **1,266 tests / 88 suites green on Node 14.15.0**
> (run live this session ✔); lint clean per the branch record; both intake routes carry
> `firmAuth` (✔ [`server/restify-server.js`](../server/restify-server.js) L141–142).
> ✔ = mechanism confirmed directly by Claude reading the code; others are
> reviewer-evidenced with file:line. Backlog lines: `ACTIONS.md` → **CODE-REVIEW SWEEP —
> 2026-07-18**.

---

## 🔴 CRITICAL

### R1 ✔ — Quick Position: an edited figure keeps its "from file" badge (provenance rule broken)
[`components/QuickPositionIntake.vue`](../components/QuickPositionIntake.vue) L48. The
confirm-table `b-input` has no edit handler, so a file-seeded figure that the advisor
overtypes keeps `source: 'file'` — the confirm table, report sidebar and printed PDF all
still badge it FROM FILE. Directly breaks intake contract §4.4 ("an assumption must never
pass as a fact"). The EBITDA intake does this correctly
([`EbitdaDcfIntake.vue`](../components/EbitdaDcfIntake.vue) L62 `@input="markEntered(...)"`)
— fix is the same pattern.

### R2 ✔ — Quick Position: a cleared figure silently becomes the demo sample number, still tagged "from file"
[`components/QuickPositionIntake.vue`](../components/QuickPositionIntake.vue) L48 +
[`components/QuickPositionReport.vue`](../components/QuickPositionReport.vue) L191–192.
`v-model.number` on a cleared/invalid number input yields `''`; nothing in
`confirmFigures()` blocks it; the report seeder's `val(key, def)` then falls back to the
hard-coded sample default (cash **296,155** etc.) while `src(key)` keeps the original
source tag. Scenario: advisor clears the file-proposed cash cell to retype it, clicks
build → the report computes on the demo figure, tagged *from file*, for a real client.
A fabricated client-facing figure — the exact failure mode the honesty rules exist for.

### R3 — Intake DoS: unbounded row index in the XLSX reader → OOM from a ~1 KB crafted file
[`server/report/intake/xlsxReader.js`](../server/report/intake/xlsxReader.js) L223,
L254–256. `MAX_CELLS_PER_SHEET` counts value-bearing cells only; the row *index* regex
allows 7 digits, and `while (rows.length <= row) rows.push([])` pads every row up to it.
One cell at `A9999999` ≈ 10 M empty-array pushes, ×16 sheets, then doubled by
`xeroReportParser.js` L39's per-row object map → hundreds of MB to OOM on Node 14's heap.
Authenticated (firmAuth) — but "advisor uploads hostile file" is this pipeline's exact
threat model, and the backend is live production. **Fix:** one-line row-index cap (e.g.
reject `row >= 10000`) beside the existing `col > 255` guard at L227.

### R4 — Multi-column exports silently read the FIRST numeric column, no warning
[`server/report/intake/xeroReportParser.js`](../server/report/intake/xeroReportParser.js)
L24–35 (`rowShape`). First numeric cell after the label wins; every other column is
discarded silently. The data model itself verified multi-column files exist (§3.2: 4
comparative years; §3.9.4: the by-month P&L, 12 columns + YTD). Drop the by-month P&L
into the EBITDA intake → every figure becomes the *first month's* value tagged
*from file* — and the cached-total cross-check reads the same column, so the §3.1 warning
never fires. This is the silent-wrong-figure mode the intake contract exists to prevent,
and a drift from §4.7 (wrong-shape files must fail loudly). **Fix:** count numeric cells
per data row; >1 → warn ("multiple figure columns — only the first was read; use the
single-period export") or refuse as unrecognised shape.

---

## 🟠 MAJOR

### R5 — EBITDA calc: mismatched growth/discount array lengths → NaN → `null` valuation indistinguishable from an honesty-null
[`server/report/ebitdaDcfModel.js`](../server/report/ebitdaDcfModel.js) L144–148 (root:
L257–258, L272–273). `pickSeries` validates each array's length (2–5) independently;
`project()` iterates `growth.length` and indexes `rates[i]` unguarded. 5 growths + 2
rates → `prev * undefined` = NaN → EV/terminal/sumDiscounted all NaN → JSON `null`,
mixed with valid `projectedEbitda`, no error. Same defect in the listed block. Current
screens always post matched arrays; no test covers the mismatch. **Fix:** align both
series to one length or guard `rates[i]`.

### R6 — Intake error path can leak a server file path to the client (found independently by two reviewers)
[`server/routes/report.js`](../server/routes/report.js) L229–236 and L288–295. The catch
echoes `err.message` verbatim; it is designed for the parser's authored-safe messages but
also catches unexpected errors — `fs.readFileSync` failing (AV sweep, EMFILE, EACCES)
returns `ENOENT: ... open 'C:\Users\...\Temp\...'` to the browser. Violates the error
standard ("never a stack trace, file path"). Also passes an uncontrolled `err.code` into
the response, and `INTAKE_STATUS[code]` is an inherited-property lookup (theoretical —
`code: 'constructor'` returns a function as a status). **Fix:** allowlist — pass
`err.message`/`err.code` through only for known intake codes, else the generic message;
`Object.create(null)` or `hasOwnProperty` for the status map.

### R7 — SEC — the six calc routes are unauthenticated AND the global JSON body parser has no size cap
[`server/restify-server.js`](../server/restify-server.js) L101 vs L134–139. No-auth on
calc routes is a **deliberate, commented decision** (L140) — recorded as fact, not a
defect. But `jsonBodyParser({ mapParams: false })` passes no `maxBodySize`, and restify's
bodyReader treats absent as unlimited (verified in vendored source) — so an anonymous
client can stream an arbitrarily large body that is fully buffered before parsing. The
models themselves are DoS-hardened (arrays capped at 5). Server-wide middleware predating
this feature; the feature added six more anonymous POST routes behind it. **Fix:**
`maxBodySize` on the parser — sized to clear the largest legitimate payload (firm-manager
bodies), since it affects every JSON route.

### R8 — DECISION (Mike) — partial calc input silently blends real client numbers with the sample workbook's figures
[`server/report/ebitdaDcfModel.js`](../server/report/ebitdaDcfModel.js) L47–55 (per-index
`def[i % def.length]` fallback), L118–127 (padding);
[`server/report/quickPositionModel.js`](../server/report/quickPositionModel.js) L26–31.
Junk/missing input falls back to the source-sheet defaults per-index — post 5-year sales
with 2-year costOfSales and the 3 oldest years get Bob's sample COS repeated; junk `cash`
returns the sample 296,155 as the client's quick cash. Nothing in the response marks
which figures were defaulted. Tests pin this as intended (fine for Education models);
on Report-class models it is a fabrication channel in tension with the honesty defaults —
and it is what makes R2 client-visible. **Minimum:** echo which inputs were defaulted;
the ruling is Mike's.

### R9 — Both new reports: a failed recompute silently leaves stale figures on screen
[`components/QuickPositionReport.vue`](../components/QuickPositionReport.vue) L63, L153,
L350–359; [`components/EbitdaDcfReport.vue`](../components/EbitdaDcfReport.vue) L3, L164,
L381–390. The error branch is `v-else-if="error"` behind `v-if="result"`; once `result`
exists a later failure keeps rendering the old numbers with no indication — slider label
and hero figures disagree. The solved pattern exists in the app:
`report.staleTitle` (`locales/en.json` L106) + `EightLeversReport.vue` L89 — the new
reports didn't copy it. **Fix:** same stale-banner pattern.

### R10 — Both new reports: overlapping debounced recomputes have no ordering guard
Same files, recompute methods (QP L286–296/L345–359; EBITDA L294–309/L376–390).
`debounce` spaces call starts only; a slow older response can land after — and overwrite —
a newer one (stale figures under the new slider position). Same defect family as the
already-logged older-report slider race (ACTIONS 2026-07-10 sweep). **Fix:** request
sequence counter (discard superseded responses); fixes both new reports and pairs with
the logged item for the three older ones.

### R11 — EBITDA valuation report (step 3 — the screen that prints) shows NO from-file/entered badges
[`components/EbitdaDcfReport.vue`](../components/EbitdaDcfReport.vue) template L1–172 —
no `.src` element anywhere (compare `QuickPositionReport.vue` L11–12). The intake table
tags every row; the report and PDF don't. Sub-finding, QP: `useExpensesMonthly()`
([`QuickPositionReport.vue`](../components/QuickPositionReport.vue) L362–368) writes the
file-derived P&L average into the untagged `monthlyFixedCosts` control; `creditors` /
`wagesDue` provenance is invisible on step 3.

### R12 — Stepper desync + silent data loss navigating back from the report
[`pages/quick-position.vue`](../pages/quick-position.vue) L81–90;
[`pages/ebitda-dcf.vue`](../pages/ebitda-dcf.vue) L81–90. From step 3, clicking chip 2
sets `step = 2` but recreates the intake at `phase: 'drop'` — chip says "Confirm the
figures", screen shows the step-1 drop zone; all confirmed figures are discarded
(`seed = null`) with no warning, while the on-screen copy promises "You can still adjust
everything on the report screen". Also reaches into the child (`$refs.intake.phase`)
instead of prop/event.

---

## 🟡 MEDIUM / MINOR (logged so nothing is silently parked)

- **R13 — No client-side file validation:** drag-and-drop bypasses `accept=".xlsx,.csv"`;
  no >5 MB pre-check (an oversize non-JSON reject surfaces as the generic `uploadFailed`);
  QP drop zone silently uses only `files[0]` of a multi-drop
  ([`QuickPositionIntake.vue`](../components/QuickPositionIntake.vue) L145–154). EBITDA's
  multi-file cap is handled properly. Dead i18n keys `drop.reading` / `drop.wrongKind`
  (`locales/en.json` L195/L202) are used nowhere — missing states or dead keys.
- **R14 — 5 MB intake cap is per-request TOTAL, not "each" as documented:**
  formidable's `maxFileSize` accumulates across parts (verified in vendored source) —
  five legit ~1.1 MB P&Ls reject 413 with a wrong message. JSDoc + client message wrong
  ([`server/routes/report.js`](../server/routes/report.js) L25, L254, L271). Also
  **R15 —** `TOO_MANY_FILES` fires only *after* all files are parsed (L284–285) —
  cheap pre-check `uploaded.length > 5` before the parse loop.
- **R16 — CSV: accounting-format negatives `(1,234.56)` / `$` prefixes don't parse**
  ([`csvReader.js`](../server/report/intake/csvReader.js) L30) — the row degrades into a
  phantom "section" and the figure vanishes without warning (missing→advisor-entered
  direction, so honest, but silent). Also `"1,2,3"` would read as 123.
- **R17 — Any real account label starting "Total" is silently dropped as a line item**
  ([`xeroReportParser.js`](../server/report/intake/xeroReportParser.js) L42, L66) — e.g.
  a "Total Oil purchases" fuel account. Only treat "Total X" as a closer when X matches
  an open section.
- **R18 — `trading income` matcher is unanchored** (L243) — a "Non-Trading Income"
  section would classify as sales. Anchor it. **R19 —** multiple expense sections
  ("Operating Expenses" + "Administrative Expenses") yield a partial opex proposal
  tagged from-file with no warning (L242) — mitigated by the confirm screen; warn when
  valued sections matched no bucket.
- **R20 — Fiscal-year alignment checks year number only**
  ([`annualAssembler.js`](../server/report/intake/annualAssembler.js) L65–86) — a
  31-March-2024 and a 30-June-2025 P&L pass as consecutive years (15 months apart);
  compare period-end month/day too. Related drift: the QP date-agreement check lives in
  the Vue screen, not the backend intake (contract §4.6 says intake) — an API consumer
  bypassing the screen gets no date check.
- **R21 — Calc-route catches log `err.message` only, not the full error/stack**
  (`report.js` L48, L66, L105, L124, L148, L172) — standard says log the full error
  server-side. (Intake routes' code-only logging is deliberate privacy behaviour —
  correct as is.)
- **R22 — Slider hard caps can silently clamp real figures:** `useExpensesMonthly` writes
  an unclamped value into a slider maxed at 60,000 — next touch snaps it (a silent ~15k
  change in the example); fixed-costs >60k/month, drawings >30k etc. simply can't be
  expressed ([`QuickPositionReport.vue`](../components/QuickPositionReport.vue) L365,
  L21).
- **R23 — EBITDA: cleared cells send `''` inside numeric arrays to the calc route**
  ([`EbitdaDcfReport.vue`](../components/EbitdaDcfReport.vue) L356–374;
  intake `confirmFigures` L302–309 does no completeness check) — backend defaults then
  substitute sample figures (see R8). Block/flag non-numeric values at confirm time in
  both intakes (same fix family as R2). Also `listed.ebitdaHistory` is a fixed 5-slot
  array — with 2–4 uploaded years the invisible sample entries still go to the backend
  (L215, L363).
- **R24 — Misc small:** XLSX out-of-range char ref `&#x110000;` throws a raw
  `RangeError` instead of a typed error (`xlsxReader.js` L131–132, caught upstream —
  contained); company-name heuristic can pick a pre-title banner row
  (`xeroReportParser.js` L137 — feeds the cross-company warning); proxy drops query
  strings (`server-middleware/report.js` L38 — latent, no caller uses one); `kShort`
  renders small values "0k", `price()` renders "$-0.93" (cosmetic); hand-rolled `money()`
  duplicated ×3 with hardcoded `$`/`en-US`/`∞` (vue-i18n `$n` unused — matters when a
  non-USD locale arrives); native `input(type="range")`/`input.cell` where Buefy has
  `b-slider`/`b-numberinput` (not a second UI library — borderline, wants an on-record
  ruling); index `:key` on two spliced lists (pattern risk only); `requiredUnits: 0`
  fabricated on zero price in the older margin route (`report.js` L99 — pre-existing
  pattern, inconsistent with the null convention); EBITDA listed-block growth sign-flips
  on a negative prior year (+724.7% from −37.3→−307.6 — faithful port, golden-pinned;
  screen-side caveat someday).

---

## ✅ Verified clean (explicitly checked, not assumed)

- **Stack Constitution:** Node 14.15 clean across the feature (no `.at()`,
  `Object.hasOwn`, `replaceAll`, logical assignment, `Promise.any`, ESM in backend);
  CommonJS throughout; `zlib.maxOutputLength` OK on 14.15. Vue 2 Options API + Pug +
  scoped styles everywhere; hook order correct; no forbidden Nuxt 3/Vue 3 patterns;
  SSR-safe (localStorage/window only in mounted/user handlers); props typed; emits
  commented; `lodash/debounce` imported per-function and cancelled in `beforeDestroy`.
- **Restify 9 handler shapes** all correct; the mount-boot test
  (`reportRoutes.mount.test.js`) covers the Stage-D failure class. Error envelope shape
  correct everywhere (bar R6's leak path).
- **Intake contract:** Total rows never sourced + line-item sums + cached-total
  cross-check with warning (tested incl. poisoned-total); PDF rejected by magic bytes
  with guidance; missing ≠ 0 end-to-end (formula-no-value cells read as missing — the
  §3.1 rule — tested); wrong files fail loudly, no partial parse; multi-row stock
  candidates + liability-scoped wages; EBITDA 8-bucket exclusivity via identity-Set (no
  double counting), Balance-Sheet-in-mix rejection, duplicate/unreadable-year blocks,
  cross-company + year-gap warnings, 1–5 file bounds — all implemented AND tested.
- **Security hardening real, not declared:** every ZIP offset bounds-checked
  (`assertRange`), EOCD scan bounded, zip-bomb guard enforced per-entry AND aggregate
  (tested with an actual 25 MB bomb fixture), no ReDoS-prone regexes, entity expansion
  bounded (no billion-laughs), prototype-less maps + `__proto__` tests, shared-string
  indexing correct (incl. `AA+` columns, inlineStr, multi-run `<t>`), RFC-4180 CSV state
  machine correct (quoted commas/newlines/doubled quotes/CRLF/BOM), UTF-16 fails loudly.
- **Privacy:** parse-and-discard verified including formidable's cleanup of
  partially-written temp files (vendored source read); zero console calls in the parser
  modules; error-code-only logging; docProps/author never read; sheet names discarded;
  no AI calls, no secrets, no `process.env` in the feature.
- **Numbers:** ~20 golden values independently re-derived by hand across both engines
  (quick cash 355,079.8; break-even 86,956.52; EBITDA chain 149,921→571,795;
  EV 4,420,962.963; assessed price 0.92579; terminal 150,974,080…) — all match code and
  tests. Oldest-first array convention applied consistently. Honesty guards traced:
  zero-outgoings runway → null; zero margin → null; insolvent stays negative;
  zero-prior-year growth → null and excluded from average; zero shares → null price.
- **Catalogue:** `readyCount` = 6 matches the six `STATUS_READY` entries; unknown-class
  models surface on a visible "other" shelf (tested); `isOpenable` degrades safely.
- **i18n:** all feature strings via `$t()`; the 7 non-English locales carry no `report.*`
  keys and fall back to English — **per the recorded plan decision** (Stage C rulings),
  not drift; noting it here so the eventual translation pass has a line to find.

## Suggested fix order (tomorrow)

1. R1 + R2 (+R23's confirm-time validation) — the provenance/honesty pair, small frontend changes.
2. R3 — the one-line row-index cap. 3. R4 — multi-column warning/refusal.
4. R6 — error-message allowlist. 5. R5 — series-length guard. 6. R9 + R10 — stale banner + request counter (one code area, both reports; pairs with the logged older-report race).
7. R7 (body cap — needs a sizing decision), R8 (owner ruling), R11, R12, then the minors top-down.

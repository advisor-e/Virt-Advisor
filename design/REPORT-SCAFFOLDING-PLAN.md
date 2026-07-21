# Report Scaffolding Plan — reusable building blocks for faster reports

> **Status:** Plan approved by Mike 2026-07-21. **Phase 1 done; Phase 2's hero half done
> and browser-verified (2026-07-21) — `SliderGroup` is the open half.** Live progress is
> tracked in [`ACTIONS.md`](ACTIONS.md); this document is the design, not the status board.
> A multi-session workstream, done incrementally and behaviour-preserving — never a
> big-bang rewrite of the live report screens.
>
> **Scope correction from the Phase 2 build:** the six screens are *not* uniform, so the
> table below overstates the reach. `HeroFigure` covers **5** screens — Eight Levers'
> headline is a different design (light stat cards) and is deliberately excluded.
> `SliderGroup` covers **4** — Quick Position's sliders are a different design again
> (native track, provenance badge in the label, R22 dynamic ceiling) and EBITDA/DCF has
> no sliders at all. Extraction stops where it would become a redesign.
>
> **Why:** each of the six report screens re-implements the same building blocks by
> hand. That is slow to build the next report, and it lets fixes land in some reports
> but not others (the R9/R10/R11 fixes reached only the two newest reports). Extracting
> the shared parts makes future reports *assembly*, and makes every report — current and
> future — correct by construction. It also satisfies the codebase's own logged rule for
> a `components/base/` + `components/shared/` split (currently an open P3 in `ACTIONS.md`).

## Already reusable (the head start)
- **Money / number formatting** — `mixins/currencyMixin.js` + `utils/currencyFormat.js`
  (built 2026-07-21). A new report adds one mixin and gets currency + language-correct
  formatting for free.
- **File intake** — `server/report/intake/*` (Xero / CSV / XLSX parsers + assembler).
- **Model Library catalogue** — `utils/reportModelCatalogue.js`; reports register as data.
- **Backend pattern** — "model file → Restify route → golden test" is a settled template.

## Extraction inventory (still copy-pasted across the 6 screens)

| Repeated piece | Where now | Extract to | Notes |
|---|---|---|---|
| Slider input groups (label, min/max, step, `fmtField`, `fillPct`, dynamic max R22) | all 6, hand-rolled | `components/base/SliderGroup.vue` | biggest UI duplication |
| Headline "hero" figures (big number, crit/good colour, sub-label) | 6 bespoke (`.hv`, `.mbk-hv`, `.lev-sval`, `.ddg-hv`, `.bpr-hv`) | `components/base/HeroFigure.vue` | |
| "From file / entered" provenance badge (R11) | 2 reports only | `components/base/ProvenanceBadge.vue` | |
| Stale-recompute banner (R9) | 2 reports only | `components/base/StaleBanner.vue` | |
| Debounced recompute + request-sequence race guard (R10 `_reqSeq`) | 2 have it, **3 do not** | `mixins/reportRecompute.js` | **the 3 missing = the open "older-reports slider race" bug** |
| Page chrome (back-to-library, title, print) | repeated | `components/shared/ReportShell.vue` | |

## Target structure
- `mixins/currencyMixin.js` ✅ (done)
- `mixins/reportRecompute.js` — debounced backend call, monotonic request stamp
  (discard superseded responses), stale-banner state, loading/error state.
- `components/base/` — `HeroFigure.vue`, `SliderGroup.vue`, `ProvenanceBadge.vue`,
  `StaleBanner.vue` (generic, prop-driven, Pug + Options API + scoped styles).
- `components/shared/ReportShell.vue` — the report page frame.

## Phasing (each phase converts the existing 6 as it lands, proving green at each step)
1. **`reportRecompute` mixin** — highest value: removes the most error-prone copy-paste
   **and closes the open slider-race bug in the 3 older reports** in the same move.
2. **`HeroFigure` + `SliderGroup`** — the bulk of the visual duplication.
3. **`ProvenanceBadge` + `StaleBanner` + `ReportShell`** — the remaining shared chrome;
   brings the badge/banner patterns to all reports, not just two.
4. **The recipe** — a short "how to add a report" doc and/or an `/add-report` skill.

## Migration approach (risk control)
- One component / mixin at a time; convert each report to it, run the full suite, commit.
- Behaviour-preserving: the extracted piece reproduces current output exactly (golden
  backend tests already pin the numbers; the UI extraction must not change rendered text).
- Component tests are still blocked on this laptop (no `@vue/test-utils` — see TEST-GAP);
  the mixin/util logic is extracted specifically so it is unit-testable without them.

## "Add a report" after this lands
1. Write the maths model + golden test (backend — unchanged).
2. Add the Restify route (unchanged).
3. Register one row in the catalogue.
4. Compose the screen from `<HeroFigure>`, `<SliderGroup>`, `<StaleBanner>`, `<ReportShell>`
   + the `currencyMixin` and `reportRecompute` mixins — no formatting, race handling, or
   badge logic to write.

## Payoff
- New reports: hours, not days; consistent by construction.
- Bug fixes apply once, everywhere — no more "fixed in 2 of 6 reports".
- Directly relevant to the ~87-model catalogue roadmap (`reportModelCatalogue.js`): the
  scaffolding is what makes that volume feasible.

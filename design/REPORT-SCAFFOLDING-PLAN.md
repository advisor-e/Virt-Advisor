# Report Scaffolding Plan — reusable building blocks for faster reports

> **Status:** Plan approved by Mike 2026-07-21. **Phases 1, 2 and 3 done and
> browser-verified (Phase 3: 2026-07-22); Phase 4 is the open work.** Live progress is
> tracked in [`ACTIONS.md`](ACTIONS.md); this document is the design, not the status board.
> A multi-session workstream, done incrementally and behaviour-preserving — never a
> big-bang rewrite of the live report screens.
>
> **⚠ SUPERSEDED — owner ruling, 2026-07-22.** Phase 2 excluded Eight Levers from
> `HeroFigure`/`SliderGroup` as "a different visual language", and Phase 3 was about to
> exclude it again from the header. Mike ruled the opposite: **every model in this
> section looks the same** — one solid `#002b64` banner (no gradient) and one shared
> headline strip. Eight Levers' light stat cards and gradient banner are gone. The
> lesson is recorded here because the exclusion was reasonable in isolation and wrong in
> aggregate: consistency across the section outranks each screen's local design, and an
> "extraction stops where it would become a redesign" rule silently preserves drift the
> owner never chose. `HeroFigure` and the header now cover **all 6**; `SliderGroup` still
> covers 4 (Quick Position's sliders carry provenance badges and the R22 dynamic ceiling;
> EBITDA/DCF has none) — that exclusion is structural, not stylistic, and stands until
> ruled otherwise.
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
3. ✅ **DONE 2026-07-22 — `ProvenanceBadge` + `StaleBanner` + `ReportHeader`.** Named
   `ReportHeader`, not `ReportShell`: it owns the header band only, since page layout and
   print framing stayed with each screen — a smaller, safer change to six live reports.
   Reach was larger than this plan estimated: the badge was hand-copied across **8 sites
   in 4 files** (not 2 reports) and the banner across **3** screens (not 2). Also closed
   R9 on the three older reports, which never greyed stale figures and warned only with a
   vanishing toast — a real defect, not chrome. `tests/unit/reportHeadlineConsistency.component.test.js`
   now fails the build if any screen hand-rolls its headline or warns transiently.
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

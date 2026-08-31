# Adding a Report — the recipe

> **Phase 4 of [`REPORT-SCAFFOLDING-PLAN.md`](REPORT-SCAFFOLDING-PLAN.md), written
> 2026-07-22 once Phases 1–3 landed.** Follow this and a new report is *assembly*: no
> formatting, race handling, badge logic, header or failure behaviour to write. It also
> means the new report looks and behaves like the other six by construction rather than
> by remembering.
>
> **The rule that outranks everything here (owner ruling, 2026-07-22): every model in
> this section looks the same.** If a screen "needs" its own headline, banner or failure
> style, that is a design decision for the owner — not something a new report decides for
> itself. That exact drift is what Phase 3 had to undo across six screens.
>
> **Extended by owner ruling 2026-07-23 (final — this is never discussed again):**
> the rule covers **every step of a model, entry and intake screens included**, not just
> the result screen. A new model's look is *read off the existing live screens* — the
> dark `HeroStrip` band on every step (entry steps carry it with live **display-only**
> running totals), the same card language (white card, `#d5e1ee` border, **no
> top edge** — corrected 2026-08-31, see step 7 — navy uppercase titles), the same sizes,
> the same colours, the same failure
> and stale behaviour. **Do not ask the owner how a model should look, and do not
> propose a new or bolder look — open the finished models, copy their structure and
> format exactly.** A screen that would look out of place beside Quick Position or
> Eight Levers is wrong by definition. (Origin: the Loan Estimator's entry steps
> shipped as bare forms without the strip and had to be redone the same day.)

---

## The 8 steps

### 1. The maths model — `server/report/<name>Model.js`

Pure functions, CommonJS, no I/O. Export the compute function(s), and a `DEFAULT_INPUTS`
(or `DEFAULTS`) object holding the source workbook's own sample figures.

Calculation is **backend-only** (Stack Constitution): never in a Vue component.

### 2. The golden test — `tests/unit/<name>Model.test.js`

**Write this before or alongside the model, never after.** Every expected number is the
source workbook's *own cached value*, with the cell reference in a comment so any figure
can be re-checked by hand. If the port and the spreadsheet ever disagree, this fails.

See `tests/unit/eightLeversModel.test.js` for the established shape.

### 3. The Restify route — `server/routes/report.js`

```js
function myReport (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeMyReport(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] my-report compute failed:', err)
    res.send(400, {
      success: false,
      error: { code: 'MY_REPORT_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' },
      timestamp: new Date().toISOString()
    })
  }
  return next()
}
```

Never return a stack trace, file path or raw SQL error. Log the detail server-side.

**Assemble the payload in the model, not the route,** unless there is a reason not to.
`marginBreakeven` assembles in the route and that is why its test has to mirror the route
by hand — avoid repeating that.

### 4. Register it — `server/restify-server.js`

```js
server.post('/api/report/my-report', reportRoute.myReport)
```

Calc-only routes are deliberately **anonymous** (no `firmAuth`) — they take numbers and
return numbers. Only **file intake** routes carry `firmAuth`, because they accept uploads.

### 5. Catalogue row — `utils/reportModelCatalogue.js`

```js
{ name: 'My Report', category: 'Cash Flow', summary: '…', status: STATUS_READY, modelClass: CLASS_EDUCATION, route: '/my-report' }
```

**`modelClass` is not cosmetic.** It decides whether the privacy/scrubbing boundary
applies and whether the report may carry the "Illustrative" badge:

| Class | Figures | Badge |
|---|---|---|
| `CLASS_EDUCATION` | illustrative, chosen to teach | **yes** |
| `CLASS_DECISION` | client's real numbers, typed in | **no** |
| `CLASS_REPORT` | client's real numbers, from their accounts | **no** |

Getting this wrong is not a style slip: stamping "Illustrative" on a report built from a
client's real Xero export tells an advisor, in front of their client, that real accounts
are dummy data. See `design/MODEL-CLASSIFICATION.md`.

### 6. The page — `pages/my-report.vue`

Thin, and it **must wrap the screen in `<report-shell>`** — the shared frame (light canvas,
centred 1120px column, padding) plus the `--rs-*` design tokens, both defined once in
`components/base/ReportShell.vue`. See
[`REPORT-VISUAL-STANDARD.md`](REPORT-VISUAL-STANDARD.md) for the tokens and the ruled
numbers. A page that skips the shell **fails the build** (step 8's frame guard).

```pug
<template lang="pug">
report-shell
  my-report
</template>
```

```js
import ReportShell from '~/components/base/ReportShell.vue'
import MyReport from '~/components/MyReport.vue'
export default { name: 'MyReportPage', components: { ReportShell, MyReport } }
```

Only reports with a **file intake** need more (token resolution + step chips, with
`report-header` and the chips living in the page *inside* the shell — copy
`pages/quick-position.vue`).

### 7. The screen — `components/MyReport.vue`

Compose it. Do not hand-roll any of these:

```pug
<template lang="pug">
//- Root is a flex column (gap:16px) so the header, the full-width banner and the
//- two-column layout space uniformly — see the `.my-root` style note below.
.my-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    title="My Report"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"   //- Education class only — see step 5
  )

  //- The headline is a FULL-WIDTH band: a direct child of the root, ABOVE the two-column
  //- layout — never inside a results column. (RULED 2026-07-27; guarded — see step 8.)
  template(v-if="data")
    //- Required: a failed recompute must never sit silently behind live-looking figures
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute")
    hero-strip(:columns="4" :stale="!!error")
      hero-figure(:label="$t('…')" :value="money(data.x)" :tone="data.x < 0 ? 'crit' : 'default'")

  .my-layout
    aside.my-card
      slider-field(
        v-for="fld in fields" :key="fld.k"
        :label="$t('report.myReport.lever.' + fld.k)"
        :display="fmtField(fld)" :value="f[fld.k]"
        :min="fld.min" :max="fld.max" :step="fld.step"
        @input="v => setField(fld, v)")

    main(v-if="data")
      //- charts, tables, coaching — the rest of the results column
</template>
```

```css
/* Root: flex column with ONE gap value (16px) so every vertical gap — header→band,
   band→layout, card→card — is identical. See the [A]–[D2d] section anatomy in
   REPORT-VISUAL-STANDARD.md and the labelled REPORT-LAYOUT-REFERENCE.html. */
.my-root { display: flex; flex-direction: column; gap: 16px; }
/* MANDATORY when report-header is inside the screen: reset its `margin: 0 auto 22px`.
   In a flex column that auto margin shrinks the header below full width and doubles the
   header→band gap. Guarded by reportHeaderFullWidth.test.js. */
.my-root ::v-deep .rs-top { margin: 0; }
/* The results column keeps the same 16px rhythm. */
.my-results { display: flex; flex-direction: column; gap: 16px; }
```

```js
mixins: [currencyMixin, reportRecompute],

methods: {
  recomputeRequest () { return { url: '/api/report/my-report', body: this.payload() } },
  applyResult (data) { this.data = data }
}
```

- `currencyMixin` gives `money`/`money2`/`signedMoney`/`kMoney`/`num` in the firm's
  currency and the reader's language. **Delete any local `money()` you were about to
  write.**
- `reportRecompute` gives the debounce, the monotonic request stamp (a slow *older*
  response can never overwrite a newer one) and the `error` stale flag. Call
  `this.queueRecompute()` from your input watcher and `this.recompute()` in `mounted()`.
- `error` is a **boolean flag, not a message.** Never render it. Rendering it is what put
  the literal word "true" in front of advisors on Eight Levers for a day.
- Use `provenance-badge` wherever a figure can come from a file, so the advisor can tell
  an accounting fact from a typed one.
- **Declare no frame, palette, colour, card, button or font of your own — read the shell's
  `--rs-*` tokens.** A card is `background: var(--rs-card-bg); border: 1px solid
  var(--rs-card-border); border-radius: var(--rs-card-radius); padding: var(--rs-card-pad)`
  — **and no top edge.** (This line used to add `border-top: 3px solid var(--rs-card-top)`.
  No shipped screen has ever drawn one, so a new report that followed it would have looked
  unlike the other eight. Corrected 2026-08-31 on Mike's ruling that consistency wins; see
  the note under *Cards* in [`REPORT-VISUAL-STANDARD.md`](REPORT-VISUAL-STANDARD.md).)
  A two-column layout is
  `grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap)` (collapsing at
  `@media (max-width: 860px)`); text is `var(--rs-ink)` / `var(--rs-muted)`, accents
  `var(--rs-accent)` / `var(--rs-accent-bright)`. The full token list and the ruled numbers
  live in [`REPORT-VISUAL-STANDARD.md`](REPORT-VISUAL-STANDARD.md). A genuinely
  model-specific accent (a chart gradient, a verdict panel) may stay literal — nothing else.
  There is **no dark mode**: the look is one light standard regardless of the OS theme.

### 8. Wire it into the consistency guard — **do not skip this**

`tests/unit/reportHeadlineConsistency.component.test.js` holds a `SCREENS` list. **Add
the new report to it.** The guard mounts every listed screen against real backend model
output and fails the build if it hand-rolls its headline, leaves stale figures bright, or
warns with something transient.

The list is explicit rather than discovered, so a new report is only protected once it is
added. That is the one manual step in this recipe — if you skip it, the guard will not
protect the new screen and nothing will tell you.

You do **not** need to add anything for the *frame* guard
([`tests/unit/reportShellFrame.test.js`](../tests/unit/reportShellFrame.test.js)): it reads
the catalogue's ready routes, so your report is covered the moment its row flips to `ready`
— and it fails if step 6's page does not wrap the screen in `<report-shell>`.

---

## Checklist

- [ ] Model is pure, backend-only, exports its defaults
- [ ] Golden test written from the workbook's own cached values, with cell references
- [ ] Route returns `{ success, error: { code, message }, timestamp }` and leaks nothing
- [ ] Route registered; `firmAuth` only if it accepts uploads
- [ ] Catalogue row added, `modelClass` correct, badge matches the class
- [ ] Page wraps the screen in `<report-shell>`; the screen declares no frame/palette/
      card/font of its own — it reads the `--rs-*` tokens (see `REPORT-VISUAL-STANDARD.md`)
- [ ] Matches the [A]–[D2d] section anatomy (`REPORT-LAYOUT-REFERENCE.html`): full-width
      header + banner, two-column body, root a flex column with a single 16px gap, and
      `::v-deep .rs-top { margin: 0 }` if the header is rendered inside the screen
- [ ] Screen composes `ReportHeader` + `HeroStrip`/`HeroFigure` + `StaleBanner`
      (+ `SliderField`, `ProvenanceBadge` where they apply)
- [ ] `currencyMixin` + `reportRecompute` mixed in; no local `money()`, no local debounce
      or race guard
- [ ] All user-facing strings through `$t()` and in `locales/en.json` — no hardcoded
      English (Stack Constitution; the existing report screens violate this and it is a
      logged P1, so do not copy them)
- [ ] Added to the consistency guard's `SCREENS` list
- [ ] `npm test` green, `npm run lint` clean, screen viewed in the running app

---

## What is deliberately NOT shared

Not everything is duplication, and forcing these together would be a redesign:

- **`SliderField`** covers 4 screens. Quick Position's sliders carry provenance badges
  and the R22 dynamic ceiling (so a touch can never snap a real figure down to a cap);
  EBITDA/DCF has no sliders. That exclusion is structural.
- **Gradients on data marks** — the cash-runway bar, the EBITDA chart bars, slider
  tracks — are kept. Flattening a chart is a readability decision, not tidying.

If a new report wants something outside this list, raise it as a design decision rather
than building a second version of an existing block.

## The four guards that enforce this

Four tests make the rules above unbreakable rather than merely written down. All derive
their expectations from real sources, so they cannot drift from the thing they check:

- [`tests/unit/reportBadgeClass.component.test.js`](../tests/unit/reportBadgeClass.component.test.js)
  — the badge/class rule of step 5, taken from the catalogue's own `modelClass` via its
  own `usesRealClientData()` helper. **A shipped report with no entry in its route map is
  a failure, not a skip**, so a new report cannot slip through unchecked.
- [`tests/unit/reportHeadlineConsistency.component.test.js`](../tests/unit/reportHeadlineConsistency.component.test.js)
  — mounts every listed screen against real backend model output and fails if any
  hand-rolls its headline, **nests the banner inside a column instead of a full-width band**
  (its DOM parent must be the screen root), leaves stale figures bright, or warns with
  something transient.
- [`tests/unit/reportShellFrame.test.js`](../tests/unit/reportShellFrame.test.js)
  — reads every ready route from the catalogue and fails if its page does not wrap the
  screen in `<report-shell>`. This is what stops a screen shipping with its own frame, or
  none. The list is the catalogue's ready routes, so a new report is covered **automatically**.

- [`tests/unit/reportHeaderFullWidth.test.js`](../tests/unit/reportHeaderFullWidth.test.js)
  — a screen that renders `report-header` inside itself must reset the header margin
  (`::v-deep .rs-top { margin: 0 }`), so the header can never shrink below full width in the
  flex-column root. Closes the 2026-07-27 regression that shipped a narrow header.

All four are mutation-verified: badging Quick Position "Illustrative" fails the first,
tucking a banner into a column (or hand-rolling a headline) fails the second, swapping a
page's `report-shell` root for a plain div fails the third, and dropping the `.rs-top`
margin reset fails the fourth.

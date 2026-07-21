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

Thin. It renders the report component. Only reports with a **file intake** need more
(token resolution + step chips — copy `pages/quick-position.vue`).

### 7. The screen — `components/MyReport.vue`

Compose it. Do not hand-roll any of these:

```pug
<template lang="pug">
.my-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    title="My Report"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"   //- Education class only — see step 5
  )

  .my-layout
    aside.my-card
      slider-field(
        v-for="fld in fields" :key="fld.k"
        :label="$t('report.myReport.lever.' + fld.k)"
        :display="fmtField(fld)" :value="f[fld.k]"
        :min="fld.min" :max="fld.max" :step="fld.step"
        @input="v => setField(fld, v)")

    main(v-if="data")
      //- Required: a failed recompute must never sit silently behind live-looking figures
      stale-banner(
        v-if="error"
        :title="$t('report.staleTitle')"
        :message="$t('report.calcUnreachable')"
        :retry-label="$t('report.retry')"
        @retry="recompute")

      hero-strip(:columns="4" :stale="!!error")
        hero-figure(:label="$t('…')" :value="money(data.x)" :tone="data.x < 0 ? 'crit' : 'default'")
</template>
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

### 8. Wire it into the consistency guard — **do not skip this**

`tests/unit/reportHeadlineConsistency.component.test.js` holds a `SCREENS` list. **Add
the new report to it.** The guard mounts every listed screen against real backend model
output and fails the build if it hand-rolls its headline, leaves stale figures bright, or
warns with something transient.

The list is explicit rather than discovered, so a new report is only protected once it is
added. That is the one manual step in this recipe — if you skip it, the guard will not
protect the new screen and nothing will tell you.

---

## Checklist

- [ ] Model is pure, backend-only, exports its defaults
- [ ] Golden test written from the workbook's own cached values, with cell references
- [ ] Route returns `{ success, error: { code, message }, timestamp }` and leaks nothing
- [ ] Route registered; `firmAuth` only if it accepts uploads
- [ ] Catalogue row added, `modelClass` correct, badge matches the class
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

- **`SliderGroup`** covers 4 screens. Quick Position's sliders carry provenance badges
  and the R22 dynamic ceiling (so a touch can never snap a real figure down to a cap);
  EBITDA/DCF has no sliders. That exclusion is structural.
- **Gradients on data marks** — the cash-runway bar, the EBITDA chart bars, slider
  tracks — are kept. Flattening a chart is a readability decision, not tidying.

If a new report wants something outside this list, raise it as a design decision rather
than building a second version of an existing block.

## The two guards that enforce this

Two tests make the rules above unbreakable rather than merely written down. Both derive
their expectations from real sources, so they cannot drift from the thing they check:

- [`tests/unit/reportBadgeClass.component.test.js`](../tests/unit/reportBadgeClass.component.test.js)
  — the badge/class rule of step 5, taken from the catalogue's own `modelClass` via its
  own `usesRealClientData()` helper. **A shipped report with no entry in its route map is
  a failure, not a skip**, so a new report cannot slip through unchecked.
- [`tests/unit/reportHeadlineConsistency.component.test.js`](../tests/unit/reportHeadlineConsistency.component.test.js)
  — mounts all six screens against real backend model output and fails if any hand-rolls
  its headline, leaves stale figures bright, or warns with something transient.

Both are mutation-verified: badging Quick Position "Illustrative" fails the first, and
hand-rolling a headline fails the second.

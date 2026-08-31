<template lang="pug">
.hs
  .hk {{ label }}
  .hv(:class="tone === 'default' ? null : tone")
    | {{ value }}
    span.u(v-if="unit")  {{ unit }}
  .hs2
    slot(name="sub") {{ sub }}
</template>

<script>
/**
 * HeroFigure — one headline figure inside a <HeroStrip>: a small caps label, a large
 * value, and a sub-line beneath it.
 *
 * Presentation only. It does no formatting: the report screen passes `value` in
 * already formatted (via currencyMixin), so firm currency and reader language stay
 * owned in one place. Where the sub-line needs a control rather than text — an
 * editable multiple, a status pill — pass it through the `sub` slot instead.
 *
 * Extracted 2026-07-21 (report-scaffolding Phase 2).
 */
export default {
  name: 'HeroFigure',

  props: {
    /** Small caps label above the figure, e.g. "Annual revenue". */
    label: { type: String, required: true },
    /** The figure itself, already formatted for display. */
    value: { type: [String, Number], required: true },
    /** Plain-text sub-line. Ignored when the `sub` slot is used. */
    sub: { type: String, default: '' },
    /** Small trailing unit rendered after the value, e.g. "days", "months". */
    unit: { type: String, default: '' },
    /**
     * Colour of the figure: 'default' white, 'crit' red (a bad number), 'warn' amber
     * (a middling one), 'good' green, 'muted' for a figure that is not yet meaningful.
     *
     * 🔴 'warn' WAS MISSING UNTIL 2026-08-31, and nothing on any screen showed it. The
     * Volatility model has always returned good / warn / crit — the workbook's own three
     * gauge bands — but this validator knew only two of them, so a business scoring
     * between 50 and 75 logged a Vue warning nobody reads and rendered its headline
     * figure PLAIN WHITE. It survived because every sample figure in the repo scores in
     * the red band; it took a real client export (67.96) to land in the middle one.
     */
    tone: {
      type: String,
      default: 'default',
      validator: t => ['default', 'crit', 'warn', 'good', 'muted'].includes(t)
    }
  }
}
</script>

<style scoped>
.hs { padding: 2px 16px; border-left: 1px solid #ffffff30; }
.hk { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: #7fe4ff; font-weight: 700; }
.hv {
  font-size: 26px; font-weight: 700; color: #fff; margin-top: 7px; line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.hv .u { font-size: .5em; font-weight: 400; opacity: .85; }
.hv.crit { color: #ff8f8f; }
/* The workbook's own amber (#ff9900), lightened for legibility on the navy band —
   the same relationship the red and green tones already have to their source colours. */
.hv.warn { color: #ffc266; }
.hv.good { color: #7dffa6; }
.hv.muted { color: #c7e6fb; }
.hs2 { font-size: 12px; color: #c7e6fb; margin-top: 6px; }
</style>

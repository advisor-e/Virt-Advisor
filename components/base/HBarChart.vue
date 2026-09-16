<template lang="pug">
svg.hbc(:viewBox="'0 0 520 ' + height" role="img" :aria-label="ariaLabel")
  //- Drawn only where something is negative, so a positive chart is untouched.
  line.hbc-zero(v-if="hasNegative" :x1="zeroX" :x2="zeroX" y1="14" :y2="height - 6")
  g(v-for="(b, i) in rows" :key="i")
    text.hbc-lab(x="96" :y="b.y + 13" text-anchor="end") {{ b.label }}
    rect(:x="b.x" :y="b.y" :width="b.w" height="18" :fill="b.colour")
    text.hbc-lab.is-b(:x="b.labelX" :y="b.y + 13") {{ b.text }}
</template>

<script>
/**
 * HBarChart — horizontal bars, one per row, as the deck draws stock ageing. Pure SVG.
 * Values are formatted by the caller; colours come from the caller so a red bar means
 * what the page says it means, never what the chart guessed.
 *
 * 🔴 IT DRAWS TO THE LEFT OF ZERO — added 2026-09-15 on Mike's ruling, with `BarPairChart`'s
 * larger fault the same day. It used to clamp with `Math.max(value, 0)` while the LABEL
 * printed the true figure, so a negative drew as **no bar at all with "-$500" beside it**.
 *
 * ⚠ THE INVESTIGATION MATTERS AS MUCH AS THE FIX, because it decided the scope. Of the five
 * call sites, four are stock values and cannot be negative. The fifth is
 * `DashboardReportSensitivity`, whose levers turned out to be **better guarded than feared**:
 * `computeProfitSensitivity` blocks on `NO_REVENUE` and `NO_CONTRIBUTION`, so selling below
 * cost and having no revenue never reach a chart, and **a merely loss-making business renders
 * with all four levers positive** — they measure the SIZE of an effect, not a profit. What
 * remains reachable is a **negative expense line in a client's accounts export** (a credit
 * posted to cost of sales or overheads), which yields a negative lever. That is an accounting
 * anomaly rather than a bad year — but this app reads exports it does not control, so the
 * component is made unable to tell the lie rather than every caller made responsible for
 * checking.
 *
 * ⚠ WHEN EVERY VALUE IS POSITIVE THIS IS ARITHMETICALLY THE OLD CHART. `min` is then 0,
 * `zeroX` is the old fixed 106, and the widths and label positions reduce to the previous
 * expressions exactly. `tests/unit/hBarChart.component.test.js` pins that.
 *
 * A negative bar's figure sits just RIGHT of the zero line rather than beyond the bar's left
 * end: at full negative extent the bar reaches the plot's left edge, and a label outside it
 * would print over the row's own name.
 */
/** Where the plot starts, left of which sit the row names. The old fixed bar origin. */
const PLOT_LEFT = 106

export default {
  name: 'HBarChart',

  props: {
    /** `{ label, value, colour }` per row, drawn top to bottom. */
    bars: { type: Array, required: true },
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    ariaLabel: { type: String, default: '' },
    /** The longest bar's length; smaller leaves room for a long value label. */
    maxWidth: { type: Number, default: 340 }
  },

  computed: {
    height () { return 22 + this.bars.length * 32 },
    /** Every drawable value. */
    values () {
      return this.bars.filter(b => Number.isFinite(b.value)).map(b => b.value)
    },
    /** The floor, bracketed with 0 so zero is always on the chart. */
    min () { return Math.min(0, ...this.values) },
    hasNegative () { return this.min < 0 },
    /** The span the plot covers. Never zero — an all-zero chart would divide by it. */
    range () {
      const r = Math.max(0, ...this.values) - this.min
      return r > 0 ? r : 1
    },
    /** Pixels per unit of value, across the caller's allotted width. */
    scale () { return this.maxWidth / this.range },
    /** Where zero sits. The old fixed left edge when nothing is negative. */
    zeroX () { return PLOT_LEFT + (0 - this.min) * this.scale },
    rows () {
      return this.bars.map((b, i) => {
        const v = Number.isFinite(b.value) ? b.value : 0
        const w = Math.abs(v) * this.scale
        // A bar grows from the zero line, rightwards or leftwards.
        const x = v < 0 ? this.zeroX - w : this.zeroX
        return {
          label: b.label,
          colour: b.colour,
          y: 22 + i * 32,
          x,
          w,
          // Right of the bar for a positive; right of the ZERO LINE for a negative, where
          // the row is empty — beyond the bar's left end it would sit over the row's name.
          labelX: v < 0 ? this.zeroX + 8 : x + w + 8,
          text: Number.isFinite(b.value) ? this.formatValue(b.value) : ''
        }
      })
    }
  }
}
</script>

<style scoped>
.hbc { display: block; width: 100%; height: auto; }
.hbc-zero { stroke: #d5e1ee; stroke-width: 1; }
.hbc-lab { font-size: 11.5px; fill: #5b6f8a; font-family: inherit; }
.hbc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

<template lang="pug">
svg.bpc(:viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="ariaLabel")
  g(v-for="(t, i) in ticks" :key="'t' + i")
    line.bpc-grid(:x1="left" :x2="width - 10" :y1="t.y" :y2="t.y")
    text.bpc-lab(:x="left - 6" :y="t.y + 4" text-anchor="end") {{ t.label }}
  line.bpc-axis(:x1="left" :x2="width - 10" :y1="zeroY" :y2="zeroY")
  g(v-for="(g, i) in bars" :key="'g' + i")
    rect(:x="g.ax" :y="g.ay" :width="barWidth" :height="g.ah" :fill="colourA")
    rect(:x="g.bx" :y="g.by" :width="barWidth" :height="g.bh" :fill="colourB")
    text.bpc-lab.is-b(:x="g.ax + barWidth / 2" :y="g.aLabelY" text-anchor="middle") {{ g.aLabel }}
    text.bpc-lab(:x="g.bx + barWidth / 2" :y="g.bLabelY" text-anchor="middle") {{ g.bLabel }}
    text.bpc-lab(:x="g.cx" :y="height - 20" text-anchor="middle") {{ g.label }}
</template>

<script>
/**
 * BarPairChart — two series side by side per group, as the deck draws revenue against
 * expenses and gross profit against net profit. Pure SVG: no library, no DOM access, so
 * it renders on the server and on paper alike.
 *
 * Values are formatted by the caller through `formatValue`, so the chart never decides
 * a currency or a locale (the same rule as `SliderField`'s `display`).
 *
 * 🔴 IT DRAWS BELOW ZERO, AND IT HAS TO — corrected 2026-09-15 on Mike's ruling, after the
 * fault below was proved in the two screens that were live with it.
 *
 * It used to clamp with `Math.max(value, 0)`. The LABEL still printed the true figure, so a
 * loss arrived as a bar of **height zero sitting on the axis — visually identical to breaking
 * even** — with "-$40,000" written beside it. Two client-facing screens fed it figures that
 * routinely go negative:
 *
 *   · `DashboardReportProfitLoss` — `netProfit`. A loss-making year drew as break-even.
 *   · `DashboardReportCashFlow` — the closing bank balance. A client in overdraft got BOTH
 *     bars at zero and, with no positive value anywhere, the scale fell back to `max = 1`,
 *     so the gridlines meant nothing either: **a blank chart, on the page about cash.** The
 *     same component drew that same figure correctly as a `LineChart` immediately above it,
 *     because that one has always had a zero line.
 *
 * The geometry now matches `LineChart` and `WaterfallChart`: `min()` and `max()` bracket
 * zero, every bar is drawn FROM the zero line in whichever direction it goes, and the axis
 * sits at `zeroY` rather than on the floor. A negative bar's label goes BELOW it so it never
 * crosses the axis — `WaterfallChart`'s rule, for the same reason.
 *
 * ⚠ WHEN EVERY VALUE IS POSITIVE THIS IS ARITHMETICALLY THE OLD CHART. `min` is then 0, the
 * scale, the four ticks, the bar heights and the label positions all reduce to the previous
 * expressions exactly — which is what lets six working screens keep this component untouched.
 * `tests/unit/barPairChart.component.test.js` pins that equivalence rather than trusting it.
 */
export default {
  name: 'BarPairChart',

  props: {
    /** One entry per group: `{ label, a, b }`, `a`/`b` numbers or null. */
    groups: { type: Array, required: true },
    /** First series' fill. Brand blue by default. */
    colourA: { type: String, default: '#0070c0' },
    /** Second series' fill. Brand cyan by default. */
    colourB: { type: String, default: '#00b1e0' },
    /** Formats a value for the label above its bar and the axis ticks. */
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    /** Accessible description of what the bars show. */
    ariaLabel: { type: String, default: '' }
  },

  data () {
    return { width: 520, left: 48, top: 24, baseline: 170 }
  },

  computed: {
    /** Every drawable value, in one list. */
    values () {
      const out = []
      this.groups.forEach((g) => {
        if (Number.isFinite(g.a)) { out.push(g.a) }
        if (Number.isFinite(g.b)) { out.push(g.b) }
      })
      return out
    },
    /** The floor. Bracketed with 0, so zero is always ON the chart, never off an edge. */
    min () { return Math.min(0, ...this.values) },
    /**
     * Taller ONLY when something is negative, to clear the extra row of labels a negative
     * bar puts below itself. Found by rendering it: at the old 210 a loss bar reaching the
     * plot floor put its "-$40k" at y=183 and the group label sat at 190, so the two
     * overlapped. The positive chart is untouched at 210 and its group label stays at 190.
     */
    height () { return this.min < 0 ? 232 : 210 },
    /** The span of value the plot covers. Never zero — an all-zero chart would divide by it. */
    range () {
      const r = Math.max(0, ...this.values) - Math.min(0, ...this.values)
      return r > 0 ? r : 1
    },
    /** Pixels per unit of value. */
    scale () { return (this.baseline - this.top) / this.range },
    /** Where zero sits. The floor when nothing is negative, which is the old baseline. */
    zeroY () { return this.baseline - (0 - this.min) * this.scale },
    /**
     * Four gridlines up the plot. With nothing negative `min` is 0 and these reduce to the
     * old `max * i / 4` at the old heights, exactly.
     */
    ticks () {
      const out = []
      for (let i = 1; i <= 4; i++) {
        const v = this.min + (this.range * i) / 4
        out.push({ y: this.baseline - (v - this.min) * this.scale, label: this.formatValue(v) })
      }
      return out
    },
    barWidth () {
      const n = Math.max(this.groups.length, 1)
      return Math.min(44, ((this.width - this.left - 20) / n - 22) / 2)
    },
    bars () {
      const n = Math.max(this.groups.length, 1)
      const slot = (this.width - this.left - 20) / n
      const yOf = v => this.baseline - (v - this.min) * this.scale

      /** One bar, drawn FROM the zero line in whichever direction its value goes. */
      const barOf = (v) => {
        const value = Number.isFinite(v) ? v : 0
        const y = yOf(Math.max(value, 0))
        const h = yOf(Math.min(value, 0)) - y
        return {
          y,
          h,
          // Above a rise, below a fall — so a label never crosses the axis it sits on.
          labelY: value < 0 ? y + h + 13 : y - 5
        }
      }

      return this.groups.map((g, i) => {
        const a = barOf(g.a)
        const b = barOf(g.b)
        const cx = this.left + slot * i + slot / 2
        return {
          label: g.label,
          cx,
          ax: cx - this.barWidth - 1,
          ay: a.y,
          ah: a.h,
          aLabelY: a.labelY,
          aLabel: Number.isFinite(g.a) ? this.formatValue(g.a) : '',
          bx: cx + 1,
          by: b.y,
          bh: b.h,
          bLabelY: b.labelY,
          bLabel: Number.isFinite(g.b) ? this.formatValue(g.b) : ''
        }
      })
    }
  }
}
</script>

<style scoped>
.bpc { display: block; width: 100%; height: auto; }
.bpc-grid { stroke: #d5e1ee; stroke-width: 1; stroke-dasharray: 2 3; }
.bpc-axis { stroke: #d5e1ee; stroke-width: 1; }
.bpc-lab { font-size: 11.5px; fill: #5b6f8a; font-family: inherit; }
.bpc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

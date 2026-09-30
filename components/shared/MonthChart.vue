<template lang="pug">
svg.mc(:viewBox="'0 0 ' + W + ' ' + H" role="img" :aria-label="ariaLabel")
  template(v-for="t in ticks")
    line.mc-grid(:key="'g' + t.v" :x1="L" :x2="W - R" :y1="y(t.v)" :y2="y(t.v)")
    text.mc-lab(:key="'t' + t.v" :x="L - 8" :y="y(t.v) + 4" text-anchor="end") {{ t.label }}
  template(v-if="kind === 'line'")
    polygon(:points="areaPoints" :fill="allBelow ? '#ff000014' : '#0070c014'")
    polyline(:points="linePoints" fill="none" stroke="#002b64" stroke-width="2.5")
    circle(
      v-for="(v, i) in values" :key="'p' + i"
      :cx="x(i)" :cy="y(v)" r="3"
      :fill="i === lowestIndex ? '#ff0000' : '#002b64'")
    text.mc-lab.mc-low(
      v-if="lowestLabel"
      :x="x(lowestIndex) - 4" :y="y(values[lowestIndex]) + 16" text-anchor="end") {{ lowestLabel }}
  template(v-else)
    line.mc-axis(:x1="L" :x2="W - R" :y1="y(0)" :y2="y(0)")
    rect(
      v-for="(v, i) in values" :key="'b' + i"
      :x="L + i * barW + barW * 0.18" :y="Math.min(y(v), y(0))"
      :width="barW * 0.64" :height="Math.abs(y(v) - y(0))" rx="2"
      :fill="v < 0 ? '#ff0000' : '#4ca52d'" opacity=".78")
  text.mc-lab(
    v-for="m in shownLabels" :key="'m' + m.i"
    :x="kind === 'line' ? x(m.i) : L + m.i * barW + barW / 2" :y="H - 12" text-anchor="middle") {{ m.text }}
</template>

<script>
const { num } = require('~/utils/currencyFormat')

/**
 * MonthChart — one series by month, as a line (a balance) or as bars (a result), for the
 * printed Three-Way Forecast's "forecast at a glance" (item 44.4; drawing approved by Mike
 * 2026-09-30, design/mockups/three-way-forecast-board-pack.html). Plain SVG, so it prints
 * exactly as drawn and needs no chart library. Red marks a negative bar and the lowest
 * point of a line — colour means a state here, never decoration.
 *
 * @example
 *   month-chart(kind="line" :values="bank" :labels="months" lowest-label="Lowest (400,760)")
 */
export default {
  name: 'MonthChart',

  props: {
    /** 'line' for a balance, 'bars' for a result. */
    kind: { type: String, default: 'line', validator: v => ['line', 'bars'].includes(v) },
    /** One figure per point. */
    values: { type: Array, required: true },
    /** One label per point; every other one is drawn when there are many. */
    labels: { type: Array, required: true },
    /** The words beside a line's lowest point, already filled in; empty draws none. */
    lowestLabel: { type: String, default: '' },
    ariaLabel: { type: String, default: '' }
  },

  data () {
    return { W: 560, H: 230, L: 62, R: 14, T: 14, B: 34 }
  },

  computed: {
    /** The scale always includes zero, so a bar starts from it and a line shows the gap to it. */
    range () {
      const lo = Math.min(0, ...this.values)
      const hi = Math.max(0, ...this.values)
      const step = this.niceStep((hi - lo) / 3 || 1)
      return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, step }
    },
    ticks () {
      const out = []
      for (let v = this.range.max; v >= this.range.min - 1e-9; v -= this.range.step) {
        out.push({ v, label: v === 0 ? '0' : this.kLabel(v) })
      }
      return out
    },
    barW () { return (this.W - this.L - this.R) / Math.max(1, this.values.length) },
    /** Every other month on a year; about seven across a longer forecast. */
    shownLabels () {
      const every = this.labels.length > 14 ? Math.ceil(this.labels.length / 7) : 2
      return this.labels.map((text, i) => ({ text, i })).filter(m => m.i % every === 0)
    },
    lowestIndex () { return this.values.indexOf(Math.min(...this.values)) },
    allBelow () { return this.values.every(v => v <= 0) },
    linePoints () { return this.values.map((v, i) => this.x(i) + ',' + this.y(v)).join(' ') },
    areaPoints () {
      const last = this.values.length - 1
      return `${this.x(0)},${this.y(0)} ${this.linePoints} ${this.x(last)},${this.y(0)}`
    }
  },

  methods: {
    x (i) { return this.L + i * (this.W - this.L - this.R) / Math.max(1, this.values.length - 1) },
    y (v) {
      const { min, max } = this.range
      return this.T + (max - v) * (this.H - this.T - this.B) / ((max - min) || 1)
    },
    /** 1, 2 or 5 times a power of ten — a scale a reader can count in. */
    niceStep (raw) {
      const p = Math.pow(10, Math.floor(Math.log10(raw)))
      const f = raw / p
      return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
    },
    /** "(150k)", "20k" — thousands, a negative in brackets, as the statements. */
    kLabel (v) {
      const k = Math.abs(v) >= 1000
      const body = num(Math.abs(k ? v / 1000 : v), this.$i18n.locale) + (k ? 'k' : '')
      return v < 0 ? '(' + body + ')' : body
    }
  }
}
</script>

<style scoped>
.mc { display: block; width: 100%; height: auto; }
.mc-grid { stroke: #d5e1ee; stroke-width: 1; stroke-dasharray: 2 3; }
.mc-axis { stroke: #9fb3c8; stroke-width: 1; }
.mc-lab { font-size: 11px; fill: #5b6f8a; }
.mc-low { fill: #9c2323; font-weight: 700; }
</style>

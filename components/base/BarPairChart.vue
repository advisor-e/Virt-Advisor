<template lang="pug">
svg.bpc(:viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="ariaLabel")
  g(v-for="(t, i) in ticks" :key="'t' + i")
    line.bpc-grid(:x1="left" :x2="width - 10" :y1="t.y" :y2="t.y")
    text.bpc-lab(:x="left - 6" :y="t.y + 4" text-anchor="end") {{ t.label }}
  line.bpc-axis(:x1="left" :x2="width - 10" :y1="baseline" :y2="baseline")
  g(v-for="(g, i) in bars" :key="'g' + i")
    rect(:x="g.ax" :y="g.ay" :width="barWidth" :height="g.ah" :fill="colourA")
    rect(:x="g.bx" :y="g.by" :width="barWidth" :height="g.bh" :fill="colourB")
    text.bpc-lab.is-b(:x="g.ax + barWidth / 2" :y="g.ay - 5" text-anchor="middle") {{ g.aLabel }}
    text.bpc-lab(:x="g.bx + barWidth / 2" :y="g.by - 5" text-anchor="middle") {{ g.bLabel }}
    text.bpc-lab(:x="g.cx" :y="baseline + 20" text-anchor="middle") {{ g.label }}
</template>

<script>
/**
 * BarPairChart — two series side by side per group, as the deck draws revenue against
 * expenses and gross profit against net profit. Pure SVG: no library, no DOM access, so
 * it renders on the server and on paper alike.
 *
 * Values are formatted by the caller through `formatValue`, so the chart never decides
 * a currency or a locale (the same rule as `SliderField`'s `display`).
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
    return { width: 520, height: 210, left: 48, top: 24, baseline: 170 }
  },

  computed: {
    /** The largest value drawn, or 1 so an all-zero chart still has a scale. */
    max () {
      let m = 0
      this.groups.forEach((g) => {
        m = Math.max(m, Number.isFinite(g.a) ? g.a : 0, Number.isFinite(g.b) ? g.b : 0)
      })
      return m > 0 ? m : 1
    },
    /** Four gridlines from the baseline to the top. */
    ticks () {
      const out = []
      for (let i = 1; i <= 4; i++) {
        const v = (this.max * i) / 4
        out.push({ y: this.baseline - ((this.baseline - this.top) * i) / 4, label: this.formatValue(v) })
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
      const span = this.baseline - this.top
      return this.groups.map((g, i) => {
        const a = Number.isFinite(g.a) ? Math.max(g.a, 0) : 0
        const b = Number.isFinite(g.b) ? Math.max(g.b, 0) : 0
        const ah = (a / this.max) * span
        const bh = (b / this.max) * span
        const cx = this.left + slot * i + slot / 2
        return {
          label: g.label,
          cx,
          ax: cx - this.barWidth - 1,
          ay: this.baseline - ah,
          ah,
          aLabel: Number.isFinite(g.a) ? this.formatValue(g.a) : '',
          bx: cx + 1,
          by: this.baseline - bh,
          bh,
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

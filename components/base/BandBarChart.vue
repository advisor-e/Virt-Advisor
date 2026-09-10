<template lang="pug">
svg.bbc(:viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="ariaLabel")
  rect(:x="left" :y="bandTop" :width="width - left - 16" :height="bandHeight" :fill="bandFill")
  g(v-for="(t, i) in ticks" :key="'t' + i")
    line.bbc-grid(:x1="left" :x2="width - 16" :y1="t.y" :y2="t.y")
    text.bbc-lab(:x="left - 6" :y="t.y + 4" text-anchor="end") {{ t.label }}
  line.bbc-axis(:x1="left" :x2="width - 16" :y1="baseline" :y2="baseline")
  line(:x1="left" :x2="width - 16" :y1="averageY" :y2="averageY" stroke="#002b64" stroke-width="1.5" stroke-dasharray="6 4")
  text.bbc-lab.is-b(:x="left + 4" :y="averageY - 4" text-anchor="start") {{ averageLabel }}
  g(v-for="(b, i) in rects" :key="'b' + i")
    rect(:x="b.x" :y="b.y" :width="barWidth" :height="b.h" :fill="b.fill")
    text.bbc-lab.is-b(v-if="b.marked" :x="b.x + barWidth / 2" :y="b.y - 5" text-anchor="middle") {{ b.valueLabel }}
    text.bbc-lab(:x="b.x + barWidth / 2" :y="baseline + 18" text-anchor="middle") {{ b.label }}
</template>

<script>
/**
 * BandBarChart — a bar per month against a shaded band and a dashed average line, as the
 * Sales Volatility page draws twelve months against the usual range (drawing page 15 of
 * `design/mockups/business-performance-report-optional-pages.html`). A bar outside the
 * band takes the caution colour; the highest and lowest carry their figures. Pure SVG.
 */
export default {
  name: 'BandBarChart',

  props: {
    /** One per month, in order: `{ label, value, outside }`. */
    bars: { type: Array, required: true },
    average: { type: Number, required: true },
    lower: { type: Number, required: true },
    upper: { type: Number, required: true },
    averageLabel: { type: String, default: '' },
    colour: { type: String, default: '#0070c0' },
    outsideColour: { type: String, default: '#ff9900' },
    bandFill: { type: String, default: '#ebf4fa' },
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    ariaLabel: { type: String, default: '' }
  },

  data () {
    return { width: 620, height: 186, left: 48, top: 18, baseline: 150 }
  },

  computed: {
    max () {
      const m = this.bars.reduce((t, b) => Math.max(t, Number.isFinite(b.value) ? b.value : 0), this.upper)
      return m > 0 ? m : 1
    },
    scale () { return (this.baseline - this.top) / this.max },
    ticks () {
      return [1, 2].map(i => ({ y: this.baseline - (this.max * i / 2) * this.scale, label: this.formatValue(this.max * i / 2) }))
    },
    averageY () { return this.baseline - Math.max(this.average, 0) * this.scale },
    bandTop () { return this.baseline - Math.min(this.upper, this.max) * this.scale },
    bandHeight () { return Math.max(0, (Math.min(this.upper, this.max) - Math.max(this.lower, 0)) * this.scale) },
    barWidth () {
      const n = Math.max(this.bars.length, 1)
      return Math.min(34, ((this.width - this.left - 24) / n) * 0.72)
    },
    rects () {
      const n = Math.max(this.bars.length, 1)
      const slot = (this.width - this.left - 24) / n
      let hi = -1
      let lo = -1
      this.bars.forEach((b, i) => {
        if (!Number.isFinite(b.value)) { return }
        if (hi === -1 || b.value > this.bars[hi].value) { hi = i }
        if (lo === -1 || b.value < this.bars[lo].value) { lo = i }
      })
      return this.bars.map((b, i) => {
        const v = Number.isFinite(b.value) ? Math.max(b.value, 0) : 0
        const h = v * this.scale
        return {
          label: b.label,
          x: this.left + slot * i + (slot - this.barWidth) / 2,
          y: this.baseline - h,
          h,
          fill: b.outside ? this.outsideColour : this.colour,
          marked: i === hi || i === lo,
          valueLabel: Number.isFinite(b.value) ? this.formatValue(b.value) : ''
        }
      })
    }
  }
}
</script>

<style scoped>
.bbc { display: block; width: 100%; height: auto; }
.bbc-grid { stroke: #d5e1ee; stroke-width: 1; stroke-dasharray: 2 3; }
.bbc-axis { stroke: #d5e1ee; stroke-width: 1; }
.bbc-lab { font-size: 11.5px; fill: #5b6f8a; font-family: inherit; }
.bbc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

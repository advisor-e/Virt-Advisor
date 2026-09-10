<template lang="pug">
svg.wfc(:viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="ariaLabel")
  g(v-for="(t, i) in ticks" :key="'t' + i")
    line.wfc-grid(:x1="left" :x2="width - 8" :y1="t.y" :y2="t.y")
    text.wfc-lab(:x="left - 6" :y="t.y + 4" text-anchor="end") {{ t.label }}
  line.wfc-axis(:x1="left" :x2="width - 8" :y1="zeroY" :y2="zeroY")
  g(v-for="(b, i) in bars" :key="'b' + i")
    line.wfc-grid(v-if="i > 0" :x1="b.x - gap" :x2="b.x" :y1="b.joinY" :y2="b.joinY")
    rect(:x="b.x" :y="b.y" :width="barWidth" :height="b.h" :fill="b.colour")
    text.wfc-lab.is-b(:x="b.x + barWidth / 2" :y="b.labelY" text-anchor="middle") {{ b.text }}
    text.wfc-lab(:x="b.x + barWidth / 2" :y="height - 6" text-anchor="middle") {{ b.label }}
</template>

<script>
/**
 * WaterfallChart — a running total drawn step by step, as the Business Performance
 * Report's two bridge pages draw profit to profit and profit to bank (drawing pages 11
 * and 12). Pure SVG, like the other base charts: no library, no DOM access, so it renders
 * on the server and on paper alike.
 *
 * A step is `{ label, value, kind }`. `start` and `end` draw from zero; `delta` draws from
 * the running total; `subtotal` draws the running total from zero and adds nothing. The
 * caller formats every value and may colour any step; by default a rise is brand green,
 * a fall brand caution, and the anchors navy and blue — never a colour the chart guessed.
 */
export default {
  name: 'WaterfallChart',

  props: {
    /** `{ label, value, kind: 'start'|'delta'|'subtotal'|'end', colour? }` in order. */
    steps: { type: Array, required: true },
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    ariaLabel: { type: String, default: '' }
  },

  data () {
    return { width: 620, height: 290, left: 44, top: 22, bottom: 34, gap: 14 }
  },

  computed: {
    /** Each bar's low and high on the value axis, and the running total after it. */
    spans () {
      let running = 0
      return this.steps.map((s) => {
        const v = Number.isFinite(s.value) ? s.value : 0
        let lo, hi, shown
        if (s.kind === 'delta') {
          lo = Math.min(running, running + v)
          hi = Math.max(running, running + v)
          shown = v
          running += v
        } else if (s.kind === 'subtotal') {
          lo = Math.min(0, running)
          hi = Math.max(0, running)
          shown = running
        } else {
          // start and end: from zero; a start also sets the running total
          lo = Math.min(0, v)
          hi = Math.max(0, v)
          shown = v
          if (s.kind === 'start') { running = v }
        }
        return { s, lo, hi, shown, after: running }
      })
    },
    max () { return Math.max(1, ...this.spans.map(x => x.hi)) },
    min () { return Math.min(0, ...this.spans.map(x => x.lo)) },
    plotTop () { return this.top },
    plotBottom () { return this.height - this.bottom },
    scale () { return (this.plotBottom - this.plotTop) / (this.max - this.min) },
    zeroY () { return this.plotBottom - (0 - this.min) * this.scale },
    ticks () {
      return [this.max, (this.max + this.min) / 2].map(v => ({ y: this.plotBottom - (v - this.min) * this.scale, label: this.formatValue(v) }))
    },
    barWidth () {
      const n = Math.max(this.steps.length, 1)
      return Math.min(70, (this.width - this.left - 12) / n - this.gap)
    },
    bars () {
      const n = Math.max(this.steps.length, 1)
      const slot = (this.width - this.left - 12) / n
      return this.spans.map((x, i) => {
        const y = this.plotBottom - (x.hi - this.min) * this.scale
        const h = Math.max(1, (x.hi - x.lo) * this.scale)
        const rising = x.s.kind === 'delta' ? x.shown >= 0 : true
        const colour = x.s.colour || (x.s.kind === 'start' ? '#002b64' : x.s.kind === 'delta' ? (rising ? '#4ca52d' : '#ff9900') : '#0070c0')
        // The value sits above a rise and below a fall, so it never crosses the bar.
        const labelY = (x.s.kind === 'delta' && x.shown < 0) ? y + h + 13 : y - 5
        return {
          x: this.left + slot * i + (slot - this.barWidth) / 2,
          y,
          h,
          colour,
          text: this.formatValue(x.shown),
          label: x.s.label,
          labelY,
          // where the previous bar ended, for the joining line
          joinY: this.plotBottom - ((i > 0 ? this.spans[i - 1].after : 0) - this.min) * this.scale
        }
      })
    }
  }
}
</script>

<style scoped>
.wfc { display: block; width: 100%; height: auto; }
.wfc-grid { stroke: #d5e1ee; stroke-width: 1; stroke-dasharray: 2 3; }
.wfc-axis { stroke: #d5e1ee; stroke-width: 1; }
.wfc-lab { font-size: 10.5px; fill: #5b6f8a; font-family: inherit; }
.wfc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

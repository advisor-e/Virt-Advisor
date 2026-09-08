<template lang="pug">
svg.lc(:viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="ariaLabel")
  g(v-for="(t, i) in ticks" :key="'t' + i")
    line.lc-grid(:x1="left" :x2="width - 16" :y1="t.y" :y2="t.y")
    text.lc-lab(:x="left - 6" :y="t.y + 4" text-anchor="end") {{ t.label }}
  line.lc-axis(:x1="left" :x2="width - 16" :y1="zeroY" :y2="zeroY")
  polyline(v-if="path" fill="none" :stroke="colour" stroke-width="2.5" :points="path")
  g(v-for="(p, i) in dots" :key="'d' + i")
    circle(:cx="p.x" :cy="p.y" :r="p.marked ? 5.5 : 4" :fill="p.fill")
    text.lc-lab.is-b(v-if="p.marked" :x="p.x" :y="p.labelY" :text-anchor="p.anchor") {{ p.valueLabel }}
  g(v-for="(p, i) in slots" :key="'x' + i")
    text.lc-lab(:x="p.x" :y="height - 6" text-anchor="middle") {{ p.label }}
</template>

<script>
/**
 * LineChart — one series across the months, as the deck draws the closing bank balance:
 * a line with a dot per month, the lowest month marked in red with its figure, the last
 * month marked in navy. Pure SVG: no library, no DOM access, renders on paper.
 *
 * A month with no value (`value: null`) keeps its slot on the axis and breaks the line
 * there, so a gap reads as a gap and never as a fall to zero. Values may go below zero
 * (an overdraft): the axis then sits above the floor rather than at it.
 */
export default {
  name: 'LineChart',

  props: {
    /** One entry per slot, in order: `{ label, value }`, value a number or null. */
    points: { type: Array, required: true },
    colour: { type: String, default: '#0070c0' },
    /** The lowest point's dot. Danger red: the deck marks the dip. */
    lowColour: { type: String, default: '#ff0000' },
    /** The last point's dot. */
    lastColour: { type: String, default: '#002b64' },
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    ariaLabel: { type: String, default: '' }
  },

  data () {
    return { width: 620, height: 176, left: 48, top: 20, bottom: 140 }
  },

  computed: {
    known () { return this.points.filter(p => Number.isFinite(p.value)) },
    max () {
      const m = this.known.reduce((t, p) => Math.max(t, p.value), 0)
      return m > 0 ? m : 1
    },
    min () { return Math.min(0, this.known.reduce((t, p) => Math.min(t, p.value), 0)) },
    /** Pixels per unit, over the span from the floor to the ceiling. */
    scale () { return (this.bottom - this.top) / (this.max - this.min || 1) },
    zeroY () { return this.bottom - (0 - this.min) * this.scale },
    ticks () {
      const out = []
      for (let i = 1; i <= 2; i++) {
        const v = (this.max * i) / 2
        out.push({ y: this.bottom - (v - this.min) * this.scale, label: this.formatValue(v) })
      }
      out.push({ y: this.zeroY, label: this.formatValue(0) })
      return out
    },
    slots () {
      const n = Math.max(this.points.length, 1)
      const step = (this.width - this.left - 24) / Math.max(n - 1, 1)
      return this.points.map((p, i) => ({ label: p.label, x: this.left + (n === 1 ? 0 : step * i) }))
    },
    dots () {
      let lowest = -1
      let last = -1
      this.points.forEach((p, i) => {
        if (!Number.isFinite(p.value)) { return }
        if (lowest === -1 || p.value < this.points[lowest].value) { lowest = i }
        last = i
      })
      return this.points.map((p, i) => {
        if (!Number.isFinite(p.value)) { return null }
        const y = this.bottom - (p.value - this.min) * this.scale
        const marked = i === lowest || i === last
        const isLow = i === lowest
        return {
          x: this.slots[i].x,
          y,
          marked,
          fill: isLow ? this.lowColour : (i === last ? this.lastColour : this.colour),
          valueLabel: this.formatValue(p.value),
          labelY: isLow ? y + 19 : y - 10,
          anchor: i === this.points.length - 1 ? 'end' : 'middle'
        }
      }).filter(Boolean)
    },
    /** The polyline through the known points; a null breaks it into segments. */
    path () {
      return this.points.map((p, i) => (Number.isFinite(p.value) ? this.slots[i].x + ',' + (this.bottom - (p.value - this.min) * this.scale) : null))
        .filter(Boolean).join(' ')
    }
  }
}
</script>

<style scoped>
.lc { display: block; width: 100%; height: auto; }
.lc-grid { stroke: #d5e1ee; stroke-width: 1; stroke-dasharray: 2 3; }
.lc-axis { stroke: #d5e1ee; stroke-width: 1; }
.lc-lab { font-size: 11.5px; fill: #5b6f8a; font-family: inherit; }
.lc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

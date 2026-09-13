<template lang="pug">
svg.dnc(:viewBox="showLegend ? '0 0 520 210' : '0 0 210 210'" role="img" :aria-label="ariaLabel")
  g(:transform="'translate(' + centreX + ' 105) rotate(-90)'")
    circle(r="66" fill="none" stroke="#ebf4fa" stroke-width="30")
    circle(
      v-for="(s, i) in arcs"
      :key="'a' + i"
      r="66"
      fill="none"
      :stroke="s.colour"
      stroke-width="30"
      :stroke-dasharray="s.dash"
      :stroke-dashoffset="s.offset")
  text.dnc-centre(:x="centreX" y="104" text-anchor="middle") {{ centre }}
  text.dnc-sub(v-if="centreLabel" :x="centreX" y="122" text-anchor="middle") {{ centreLabel }}
  g(v-if="showLegend")
    template(v-for="(s, i) in legend")
      rect(:key="'r' + i" x="250" :y="40 + i * 28" width="12" height="12" :fill="s.colour")
      text.dnc-lab(:key="'l' + i" x="270" :y="51 + i * 28") {{ s.label }} · {{ s.pct }}
</template>

<script>
/**
 * DoughnutChart — shares of a whole, as the deck draws "where the money went" and stock
 * by category. Pure SVG, no library. The caller supplies colours from the brand palette
 * and the centre text, so the chart decides nothing about meaning.
 *
 * 🔴 `legend` CAN BE TURNED OFF, and the Sales Dashboard (item 4.95) is why. Its built-in
 * legend steps 28px per entry inside a 210-tall viewBox, so it holds seven slices at most —
 * the Sales Dashboard cuts by ten brands, ten products and ten regions, and draws its own
 * ranked table beside the ring with the swatch on each row, which is a better legend than a
 * list anyway. With the legend off the ring is centred in a square viewBox instead of sitting
 * left of empty space. Added rather than hand-rolling a second ring: Decision 5 ruled this
 * component be reused so no charting library and no bundle weight arrive with the screen.
 */
const CIRCUMFERENCE = 2 * Math.PI * 66

export default {
  name: 'DoughnutChart',

  props: {
    /** `{ label, value, colour }` per slice; a zero or null value is drawn as nothing. */
    slices: { type: Array, required: true },
    /** Text in the middle — usually the total, formatted by the caller. */
    centre: { type: String, default: '' },
    /** A small caps line under the centre figure, saying what it is. */
    centreLabel: { type: String, default: '' },
    /** Draw the built-in legend. Off where the caller has a table of its own. */
    showLegend: { type: Boolean, default: true },
    ariaLabel: { type: String, default: '' }
  },

  computed: {
    /** The ring sits left of the legend, or centred in a square when there is none. */
    centreX () { return this.showLegend ? 120 : 105 },

    total () {
      return this.slices.reduce((t, s) => t + (Number.isFinite(s.value) && s.value > 0 ? s.value : 0), 0)
    },
    arcs () {
      let used = 0
      return this.slices.map((s) => {
        const v = Number.isFinite(s.value) && s.value > 0 && this.total > 0 ? s.value : 0
        const len = (v / (this.total || 1)) * CIRCUMFERENCE
        const arc = { colour: s.colour, dash: len + ' ' + (CIRCUMFERENCE - len), offset: -used }
        used += len
        return arc
      })
    },
    legend () {
      return this.slices.map(s => ({
        label: s.label,
        colour: s.colour,
        pct: this.total > 0 && Number.isFinite(s.value) ? Math.round((Math.max(s.value, 0) / this.total) * 100) + '%' : '—'
      }))
    }
  }
}
</script>

<style scoped>
.dnc { display: block; width: 100%; height: auto; }
.dnc-centre { font-size: 16px; font-weight: 600; fill: #002b64; font-family: inherit; }
.dnc-sub {
  font-size: 9px; letter-spacing: .09em; text-transform: uppercase; font-weight: 600;
  fill: #5b6f8a; font-family: inherit;
}
.dnc-lab { font-size: 13px; fill: #363636; font-family: inherit; }
</style>

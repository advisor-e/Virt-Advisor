<template lang="pug">
svg.hbc(:viewBox="'0 0 520 ' + height" role="img" :aria-label="ariaLabel")
  g(v-for="(b, i) in rows" :key="i")
    text.hbc-lab(x="96" :y="b.y + 13" text-anchor="end") {{ b.label }}
    rect(x="106" :y="b.y" :width="b.w" height="18" :fill="b.colour")
    text.hbc-lab.is-b(:x="106 + b.w + 8" :y="b.y + 13") {{ b.text }}
</template>

<script>
/**
 * HBarChart — horizontal bars, one per row, as the deck draws stock ageing. Pure SVG.
 * Values are formatted by the caller; colours come from the caller so a red bar means
 * what the page says it means, never what the chart guessed.
 */
export default {
  name: 'HBarChart',

  props: {
    /** `{ label, value, colour }` per row, drawn top to bottom. */
    bars: { type: Array, required: true },
    formatValue: { type: Function, default: v => String(Math.round(v)) },
    ariaLabel: { type: String, default: '' }
  },

  computed: {
    height () { return 22 + this.bars.length * 32 },
    max () {
      const m = this.bars.reduce((t, b) => Math.max(t, Number.isFinite(b.value) ? b.value : 0), 0)
      return m > 0 ? m : 1
    },
    rows () {
      return this.bars.map((b, i) => {
        const v = Number.isFinite(b.value) ? Math.max(b.value, 0) : 0
        return {
          label: b.label,
          colour: b.colour,
          y: 22 + i * 32,
          w: (v / this.max) * 340,
          text: Number.isFinite(b.value) ? this.formatValue(b.value) : ''
        }
      })
    }
  }
}
</script>

<style scoped>
.hbc { display: block; width: 100%; height: auto; }
.hbc-lab { font-size: 11.5px; fill: #5b6f8a; font-family: inherit; }
.hbc-lab.is-b { fill: #002b64; font-weight: 600; }
</style>

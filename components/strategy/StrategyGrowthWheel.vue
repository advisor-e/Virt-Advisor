<template lang="pug">
.sgw
  .sgw-wrap
    svg.sgw-svg(viewBox="0 0 570 520" role="img" :aria-label="ariaLabel")
      defs
        //- "Not yet reached" — a white hatch over the FULL colour, so the wheel stays as
        //- bright as Mike's original and the untouched aspects are still obvious. Texture
        //- rather than fading: it survives a black-and-white print and colour-blindness,
        //- and fading was tried on the drawing and rejected on sight.
        pattern#sgw-notyet(width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)")
          line(x1="0" y1="0" x2="0" y2="7" stroke="#ffffff" stroke-width="3" opacity=".8")

      path(v-for="seg in segments" :key="seg.name" :d="seg.d" :fill="seg.colour")
      path(
        v-for="seg in uncovered"
        :key="'hatch-' + seg.name"
        :d="seg.d"
        fill="url(#sgw-notyet)"
      )

      text(
        v-for="seg in segments"
        :key="'label-' + seg.name"
        :x="seg.lx"
        :y="seg.ly"
        :text-anchor="seg.anchor"
        :class="{ 'sgw-bare': !seg.covered }"
      ) {{ seg.name }}

      text.sgw-count(x="260" y="256" text-anchor="middle") {{ coveredCount }}
      text.sgw-of(x="260" y="278" text-anchor="middle") {{ $t('strategyPlanner.wheel.ofNine') }}

  ul.sgw-list
    li.sgw-item(
      v-for="seg in segments"
      :key="'item-' + seg.name"
      :class="{ 'is-covered': seg.covered }"
    )
      span.sgw-sw(:style="{ background: seg.colour }")
      span.sgw-name {{ seg.name }}
      span.sgw-desc {{ seg.description }}
      span.sgw-state {{ seg.covered ? $tc('strategyPlanner.wheel.objectives', seg.count, { count: seg.count }) : $t('strategyPlanner.wheel.nothingYet') }}
</template>

<script>
/**
 * StrategyGrowthWheel — the nine Growth Aspects, and which ones the plan has reached.
 *
 * Item 15.1, screen 3. Design: `design/mockups/strategy-planner.html`.
 *
 * 🔴 THE NINE COLOURS ARE MIKE'S OWN, extracted from the vector fills of his
 * `9 Growth Aspects Graphic.pdf` — they were not chosen. Two honest limits, both recorded
 * on the drawing and both still true here:
 *
 *   · WHICH colour belongs to WHICH aspect is RECONSTRUCTED from the draw order of the
 *     colour-coded table beside the wheel in that PDF. The wheel itself is not stored as
 *     vectors. If a segment is the wrong colour, that is why.
 *   · 🔴 THE PALETTE FAILS THE COLOUR-BLIND SEPARATION CHECKS — `#00b1e0` against
 *     `#5b9bd5` measures ΔE 6.5 even at normal vision, and `#002b64` against `#1f3864`
 *     are two near-identical navies. Mike ruled 2026-09-16 to keep his colours exactly as
 *     they are, and that ruling is SAFE ONLY BECAUSE EVERY SEGMENT IS DIRECTLY LABELLED
 *     and the list beside it repeats them. **Neither the labels nor the list may be
 *     removed to save space.** That is the condition his ruling rests on.
 *
 * Deviation from the original, deliberate and recorded: the labels sit OUTSIDE the ring,
 * horizontal. The deck curves them inside it. Curved text is unreadable at screen sizes
 * and cannot be selected, read aloud or translated.
 *
 * Orientation 1 is what makes this a check rather than a score: *"Objectives should be
 * tested against the 9 Growth Aspects to ensure strong organisational health."* Nobody is
 * required to reach nine.
 */

/**
 * The nine segments, clockwise from twelve o'clock in the order the deck lists them.
 * Geometry is precomputed rather than calculated in a computed property: it never changes,
 * and a rounding difference between two renders would move a label.
 */
const SEGMENTS = [
  { name: 'Process Improvement', colour: '#00b1e0', d: 'M263.26 90.03 A170 170 0 0 1 366.75 127.70 L310.24 197.74 A80 80 0 0 0 261.54 180.01 Z', lx: 325.67, ly: 79.58, anchor: 'start' },
  { name: 'Customer Focus', colour: '#5b9bd5', d: 'M371.75 131.89 A170 170 0 0 1 426.82 227.27 L338.50 244.60 A80 80 0 0 0 312.59 199.71 Z', lx: 426.28, ly: 164, anchor: 'start' },
  { name: 'Sales (Process)', colour: '#ff0000', d: 'M427.95 233.70 A170 170 0 0 1 408.83 342.16 L330.04 298.66 A80 80 0 0 0 339.04 247.62 Z', lx: 449.08, ly: 293.34, anchor: 'start' },
  { name: 'Authenticity', colour: '#548135', d: 'M405.57 347.81 A170 170 0 0 1 321.20 418.60 L288.80 334.64 A80 80 0 0 0 328.50 301.32 Z', lx: 383.42, ly: 407.08, anchor: 'start' },
  { name: 'Inventory & Equipment', colour: '#7030a0', d: 'M315.07 420.83 A170 170 0 0 1 204.93 420.83 L234.09 335.69 A80 80 0 0 0 285.91 335.69 Z', lx: 260, ly: 452, anchor: 'middle' },
  { name: 'Team Focus', colour: '#1f3864', d: 'M198.80 418.60 A170 170 0 0 1 114.43 347.81 L191.50 301.32 A80 80 0 0 0 231.20 334.64 Z', lx: 136.58, ly: 407.08, anchor: 'end' },
  { name: 'Innovation', colour: '#ec5012', d: 'M111.17 342.16 A170 170 0 0 1 92.05 233.70 L180.96 247.62 A80 80 0 0 0 189.96 298.66 Z', lx: 70.92, ly: 293.34, anchor: 'end' },
  { name: 'Governance', colour: '#002b64', d: 'M93.18 227.27 A170 170 0 0 1 148.25 131.89 L207.41 199.71 A80 80 0 0 0 181.50 244.60 Z', lx: 93.72, ly: 164, anchor: 'end' },
  { name: 'Harmony / Balance', colour: '#00b050', d: 'M153.25 127.70 A170 170 0 0 1 256.74 90.03 L258.46 180.01 A80 80 0 0 0 209.76 197.74 Z', lx: 194.33, ly: 79.58, anchor: 'end' }
]

export default {
  name: 'StrategyGrowthWheel',

  props: {
    /** `{ name, description }` from the backend — data/growth-fundamentals.json. */
    aspects: { type: Array, default: () => [] },
    /** How many objectives name each aspect, keyed by aspect name. */
    counts: { type: Object, default: () => ({}) }
  },

  computed: {
    /** @returns {object[]} the nine, each with its count and description */
    segments () {
      return SEGMENTS.map((s) => {
        const count = Number(this.counts[s.name]) || 0
        const described = this.aspects.find(a => a.name === s.name)
        return Object.assign({}, s, {
          count,
          covered: count > 0,
          description: described ? described.description : ''
        })
      })
    },

    /** @returns {object[]} */
    uncovered () {
      return this.segments.filter(s => !s.covered)
    },

    /** @returns {number} */
    coveredCount () {
      return this.segments.filter(s => s.covered).length
    },

    /** @returns {string} */
    ariaLabel () {
      const covered = this.segments.filter(s => s.covered).map(s => s.name)
      return this.$t('strategyPlanner.wheel.aria', {
        count: this.coveredCount,
        names: covered.length ? covered.join(', ') : '—'
      })
    }
  }
}
</script>

<style scoped>
.sgw-wrap { display: grid; grid-template-columns: minmax(0, 470px) 1fr; gap: 1.2rem; align-items: start; }
.sgw-svg { width: 100%; height: auto; max-width: 470px; display: block; margin: 0 auto; }
.sgw-svg >>> text { font-size: 12.5px; font-weight: 600; fill: #002b64; }
.sgw-svg >>> text.sgw-bare { fill: #5b6f8a; font-weight: 400; }
.sgw-svg >>> text.sgw-count { font-size: 36px; font-weight: 700; fill: #002b64; }
.sgw-svg >>> text.sgw-of { font-size: 11px; font-weight: 700; fill: #5b6f8a; letter-spacing: 0.09em; }

.sgw-list { margin: 0; padding: 0; list-style: none; }
.sgw-item {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  gap: 0.4rem 0.55rem;
  border: 1px solid #d5e1ee;
  border-radius: 9px;
  padding: 0.5rem 0.65rem;
  margin-bottom: 0.4rem;
  background: #fffaf0;
  font-size: 0.78rem;
  align-items: baseline;
}
.sgw-item.is-covered { background: #eefaf0; border-color: #a8dcb4; }
.sgw-sw { width: 11px; height: 11px; border-radius: 3px; border: 1px solid rgba(0, 0, 0, 0.13); }
.sgw-name { font-weight: 600; color: #002b64; }
.sgw-state { font-weight: 600; color: #5b6f8a; white-space: nowrap; }
.sgw-item.is-covered .sgw-state { color: #2f7d32; }
.sgw-desc { grid-column: 2 / 4; color: #5b6f8a; font-size: 0.74rem; }

@media (max-width: 860px) {
  .sgw-wrap { grid-template-columns: 1fr; }
}
</style>

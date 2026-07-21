<template lang="pug">
.herostrip(:class="['cols-' + columns, { 'is-stale': stale }]")
  slot
</template>

<script>
/**
 * HeroStrip — the dark headline banner that sits at the top of a report screen,
 * holding three or four <HeroFigure> cells.
 *
 * Presentation only: it owns the gradient, the column layout and the greyed-out
 * "these figures are stale" state (the R9 pattern). It performs no calculation and
 * no formatting — the report screen passes finished text into each HeroFigure.
 *
 * Extracted 2026-07-21 (report-scaffolding Phase 2) from the five hand-rolled copies
 * in the report screens, which had drifted apart by a pixel or two; the sizes here are
 * the standardised set (owner decision, 2026-07-21).
 *
 * @example
 *   hero-strip(:columns="3" :stale="!!error")
 *     hero-figure(label="Revenue" :value="money(out.revenue)" sub="last 12 months")
 */
export default {
  name: 'HeroStrip',

  props: {
    /** How many cells sit side by side on a wide screen. */
    columns: {
      type: Number,
      default: 4,
      validator: n => n === 3 || n === 4
    },
    /**
     * True while the figures on screen are left over from a previous, superseded
     * calculation — they are greyed out so they cannot be mistaken for live ones.
     */
    stale: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.herostrip {
  /* Solid, not a gradient — owner ruling 2026-07-22: one flat #002b64 right across
     every model in this section, header banner and headline strip alike. */
  background: #002b64;
  border-radius: 14px;
  padding: 20px;
  display: grid;
  gap: 0;
  box-shadow: 0 12px 32px -12px #002b6466;
}
.herostrip.cols-3 { grid-template-columns: repeat(3, 1fr); }
.herostrip.cols-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 700px) {
  .herostrip.cols-3,
  .herostrip.cols-4 { grid-template-columns: 1fr 1fr; gap: 14px 0; }
}
/* The divider belongs to each cell; the leading cell has none. */
.herostrip > *:first-child { border-left: 0; padding-left: 2px; }
.is-stale { opacity: .45; filter: grayscale(0.6); }
</style>

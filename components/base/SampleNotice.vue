<template lang="pug">
.sample-notice
  span.sn-dot
  | {{ text }}
</template>

<script>
/**
 * SampleNotice — says plainly that the figures beside it are the source model's sample
 * numbers, not the client's.
 *
 * Raised by Mike on a live smoke pass (2026-07-20): on the EBITDA screen's demo path he
 * changed sales to $145,000 and got a −$5,409,687 gross profit. The maths was right —
 * the OTHER cells still silently held the sample company's figures ($5,554,687 cost of
 * sales and so on). Nothing on screen said so.
 *
 * The same trap sits on the projection dials even for a real, file-seeded run: the
 * growth %, discount % and exit multiple default to the sample's settings, and unlike
 * the P&L rows (which carry R11 provenance badges) they had no marker at all.
 *
 * Deliberately a group-level notice rather than a per-cell tag: the EBITDA grid is 24
 * rows × 5 years, and tagging every cell would be noise the eye stops seeing — which is
 * how the original problem went unnoticed.
 *
 * Wording approved by Mike, 2026-07-22.
 *
 * @example
 *   sample-notice(v-if="isDemo" :text="$t('report.sampleFigures')")
 */
export default {
  name: 'SampleNotice',

  props: {
    /** The warning text, resolved by the caller so wording stays owned in locales/. */
    text: { type: String, required: true }
  }
}
</script>

<style scoped>
.sample-notice {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 600;
  color: var(--sn-ink, #b36b00);
  background: var(--sn-bg, #ff99001a);
  border: 1px solid var(--sn-border, #ff990059);
  border-radius: 9px;
  padding: 9px 13px;
  margin-bottom: 12px;
}
.sn-dot {
  flex: none; width: 7px; height: 7px; border-radius: 50%;
  background: var(--sn-ink, #b36b00);
}
/* On paper this matters more, not less — a printed page has no tooltip to explain it. */
@media print {
  .sample-notice { break-inside: avoid; }
}
</style>

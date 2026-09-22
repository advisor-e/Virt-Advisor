<template lang="pug">
//- 🔴 THE APPROVED DRAWING'S OWN FRAME, PORTED — NOT RE-DERIVED.
//- `design/mockups/strategy-plan-firm-mark.html`, rules `.deck .bd.*`, which Mike
//- approved on 2026-09-22. Five bars, because his foot is two pieces with the logo's
//- box between them. Six earlier attempts rebuilt this as a CSS border and adjusted
//- that; a border cannot be inset from the sheet, cannot break, and cannot be stood on.
.spf(aria-hidden="true")
  span.spf-bar.is-t
  span.spf-bar.is-l
  span.spf-bar.is-r
  span.spf-bar.is-b(v-if="!split")
  template(v-else)
    span.spf-bar.is-bl
    span.spf-bar.is-brun
</template>

<script>
/**
 * StrategyPlanFrame — the firm-coloured frame around one sheet of a client's plan
 * (item 16.2).
 *
 * ⚠ EVERY NUMBER IN THE STYLE BLOCK IS COPIED FROM THE APPROVED DRAWING, character for
 * character. Do not recompute them from the PDF: that is what produced six wrong
 * versions. The drawing already did that work and Mike signed it off.
 */
export default {
  name: 'StrategyPlanFrame',

  props: {
    /**
     * His foot in two pieces with the gap between them — the drawing's `.deck.content`
     * state. The title page carries its mark at the top, so its foot is whole.
     */
    split: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.spf {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── copied from design/mockups/strategy-plan-firm-mark.html, `.deck .bd.*` ── */
.spf-bar { position: absolute; background: var(--spd-firm, #0070c0); }

/* .deck .bd.t  — 3.9,3.9 -> 715.6,11.0 */
.spf-bar.is-t { left: 0.542%; right: 0.542%; top: 0.963%; height: 1.753%; }

/* .deck .bd.l  — 3.9,11 -> 10.7,394 */
.spf-bar.is-l { left: 0.542%; top: 2.716%; bottom: 2.716%; width: 0.944%; }

/* .deck .bd.r  — 708.8 -> 715.6 */
.spf-bar.is-r { right: 0.542%; top: 2.716%; bottom: 2.716%; width: 0.944%; }

/* .deck .bd.b  — 3.9,394 -> 715.6,401.1 */
.spf-bar.is-b { left: 0.542%; right: 0.542%; bottom: 0.963%; height: 1.753%; }

/* .deck.content .bd.bl — the corner stub, 3.89 -> 49.51 */
.spf-bar.is-bl { left: 0.542%; width: 6.334%; bottom: 0.963%; height: 1.753%; }

/* .deck.content .bd.b — the run, from 119.19 */
.spf-bar.is-brun { left: 16.554%; right: 0.542%; bottom: 0.963%; height: 1.753%; }
</style>

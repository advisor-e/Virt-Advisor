<template lang="pug">
span.src(:class="[sourceClass, sizeClass, { 'is-spaced': spaced }]") {{ text }}
</template>

<script>
/**
 * ProvenanceBadge — the "from file / entered" tag that tells an advisor, at a glance,
 * whether a figure came out of the accounting export or was typed by a human.
 *
 * This is not decoration. It is the intake contract's promise (§4.4, R11) that an
 * assumption can never pass as a fact in a client meeting, so it is worth having in
 * exactly one place: before this extraction the same markup and the same three CSS
 * rules were hand-copied across 8 sites in 4 files, which is how a badge ends up
 * correct on one screen and wrong on another.
 *
 * **Labels are passed in, not resolved here.** The Quick Position and EBITDA screens
 * use different i18n keys for the same two words
 * (`report.quickPosition.confirm.fromFile` vs `report.ebitdaDcf.confirm.fromFile`).
 * Standardising those keys would be a wording change, which is the owner's call and not
 * something a refactor should smuggle in — so the caller supplies the text, exactly as
 * `SliderField` takes its already-formatted `display`.
 *
 * Colours come from CSS custom properties with the current light-theme values as
 * fallbacks, so a screen can retint the badge without forking it.
 *
 * Extracted 2026-07-22 (report-scaffolding Phase 3).
 *
 * @example
 *   provenance-badge(
 *     :source="figures[key].source"
 *     :file-label="$t('report.quickPosition.confirm.fromFile')"
 *     :entered-label="$t('report.quickPosition.confirm.entered')")
 */
export default {
  name: 'ProvenanceBadge',

  props: {
    /** Where the figure came from. 'file' = the accounting export; 'entered' = a person. */
    source: {
      type: String,
      required: true,
      validator: s => ['file', 'entered'].includes(s)
    },
    /** Text for the 'file' state — supplied by the caller so wording stays the screen's. */
    fileLabel: { type: String, required: true },
    /** Text for the 'entered' state. */
    enteredLabel: { type: String, required: true },
    /**
     * 'md' — the intake confirm tables (the original 9.5px badge).
     * 'sm' — the report screens, where the badge sits inside a dense control label.
     */
    size: {
      type: String,
      default: 'md',
      validator: s => ['sm', 'md'].includes(s)
    },
    /** Adds the left gap used where the badge follows label text on the same line. */
    spaced: { type: Boolean, default: false }
  },

  computed: {
    /** The visible text for the current source. */
    text () {
      return this.source === 'file' ? this.fileLabel : this.enteredLabel
    },
    /** Colour class — kept as the original `src-file` / `src-hand` names. */
    sourceClass () {
      return this.source === 'file' ? 'src-file' : 'src-hand'
    },
    sizeClass () {
      return 'is-' + this.size
    }
  }
}
</script>

<style scoped>
.src {
  letter-spacing: .08em; text-transform: uppercase; font-weight: 700;
  border-radius: 999px; white-space: nowrap;
}
.src.is-md { font-size: 9.5px; padding: 2.5px 7px; }
.src.is-sm { font-size: 9px; padding: 2px 6px; }
.src.is-spaced { margin-left: 7px; }
.src-file {
  color: var(--pb-file, #0070c0);
  background: var(--pb-file-bg, #0070c018);
  border: 1px solid var(--pb-file-border, #0070c04d);
}
.src-hand {
  color: var(--pb-hand, #b36b00);
  background: var(--pb-hand-bg, #ff99001a);
  border: 1px solid var(--pb-hand-border, #ff990059);
}
</style>

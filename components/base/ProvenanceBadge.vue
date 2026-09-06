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
    /**
     * Where the figure came from. 'file' = the accounting export; 'entered' = a person;
     * 'seeded' = last year's actual, offered as a starting point for a judgement about
     * next year. The third state is deliberately NOT the same as 'file': a seeded figure
     * is a fact about the past standing in for a forecast nobody has made yet, and a
     * screen that showed the two alike would let one pass as the other.
     * 'client' = the business entity changed it since the advisor's saved version
     * (business-entity-reports D4) — the fourth state, and the one that must never be
     * mistaken for the advisor's own entry.
     * 'ai' = researched by the model from public sources (item 4.66, Mike's ruling of
     * 2026-09-06) — the fifth, and the only one whose content came from outside the firm
     * and the client alike. It exists so that nobody reading a funding pack in six months
     * mistakes a claim found on the internet for a figure out of the client's own accounts.
     */
    source: {
      type: String,
      required: true,
      validator: s => ['file', 'entered', 'seeded', 'client', 'ai'].includes(s)
    },
    /** Text for the 'file' state — supplied by the caller so wording stays the screen's. */
    fileLabel: { type: String, required: true },
    /** Text for the 'entered' state. */
    enteredLabel: { type: String, required: true },
    /** Text for the 'seeded' state. Only needed by a screen that uses it. */
    seededLabel: { type: String, default: '' },
    /** Text for the 'client' state. Only needed by a screen that saves per client. */
    clientLabel: { type: String, default: '' },
    /** Text for the 'ai' state. Only needed by a screen that shows researched content. */
    aiLabel: { type: String, default: '' },
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
    /**
     * The visible text for the current source. A 'seeded' badge with no label of its own
     * falls back to the entered wording rather than rendering an empty tag — a blank
     * badge would read as no provenance at all, which is the one thing it must never say.
     */
    text () {
      if (this.source === 'file') { return this.fileLabel }
      if (this.source === 'seeded') { return this.seededLabel || this.enteredLabel }
      // A client badge never falls back to the entered wording: that would present a
      // client's edit as the advisor's. The screen supplies the label.
      if (this.source === 'client') { return this.clientLabel }
      // Nor does an AI badge, and for a stronger version of the same reason: falling back
      // would label researched market conditions as something a person entered.
      if (this.source === 'ai') { return this.aiLabel }
      return this.enteredLabel
    },
    /** Colour class — kept as the original `src-file` / `src-hand` names. */
    sourceClass () {
      if (this.source === 'file') { return 'src-file' }
      if (this.source === 'seeded') { return 'src-seed' }
      if (this.source === 'client') { return 'src-client' }
      if (this.source === 'ai') { return 'src-ai' }
      return 'src-hand'
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
/* Green, as drawn in design/mockups/three-way-forecast.html — a third colour so a
   starting point is never mistaken for a figure read out of the file. */
.src-seed {
  color: var(--pb-seed, #4a7c1f);
  background: var(--pb-seed-bg, #4ca52d1a);
  border: 1px solid var(--pb-seed-border, #4ca52d59);
}
/* Amber on a warm ground, as drawn in design/mockups/business-entity-reports.html
   (screen 3): a client's edit stands apart from both the file and the advisor. */
.src-client {
  color: var(--pb-client, #b45f00);
  background: var(--pb-client-bg, #ff99002e);
  border: 1px solid var(--pb-client-border, #ff9900);
}
/* Purple, as drawn in design/mockups/three-way-forecast-economic-analysis.html: the one
   colour on these screens that says the content came from outside the firm AND outside the
   client — deliberately unlike the four that describe a figure's handling within them. */
.src-ai {
  color: var(--pb-ai, #6b3fa0);
  background: var(--pb-ai-bg, #6b3fa014);
  border: 1px solid var(--pb-ai-border, #6b3fa04d);
}
</style>

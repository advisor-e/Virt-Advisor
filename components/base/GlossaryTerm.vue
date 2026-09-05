<template lang="pug">
b-tooltip.glossary-term(
  v-if="entry"
  :label="entry.term + ' — ' + entry.plain"
  multilined
  position="is-bottom"
  type="is-dark"
  animated)
  button.gt-mark(
    type="button"
    :aria-label="ariaLabel"
    @click.prevent) ?
</template>

<script>
import GLOSSARY from '~/data/glossary.json'

/**
 * GlossaryTerm — a small "?" beside a heading that explains the term behind it.
 *
 * Mike's request of 2026-09-05: "most of the accountants using this will be junior in
 * terms of experience". The report screens use *collection profile*, *book value*, *gross
 * surplus*, *facility*, *mark-up*. Somebody who has built a cash flow before reads past
 * all of them; somebody who has not, guesses — and a guessed collection profile produces a
 * forecast that is wrong and entirely plausible, which is the failure this whole section
 * is built to prevent.
 *
 * WHY A MARK BESIDE THE HEADING RATHER THAN A REWRITTEN LABEL. The labels are Mike's own
 * wording, ruled screen by screen. Explaining a term must not quietly reword it, so this
 * adds to a heading and never changes one.
 *
 * DEFINITIONS LIVE IN data/glossary.json AND NOWHERE ELSE, so a term explained on two
 * screens cannot come to mean two things. An unknown key renders NOTHING rather than an
 * empty tooltip or the key itself — a missing definition should be invisible to the
 * advisor and obvious to the developer, which is what the test asserts.
 *
 * @example
 *   h2.tw-h2
 *     | {{ $t('report.threeWayForecast.assume.debtorsHeading') }}
 *     glossary-term(term="collectionProfile")
 */
export default {
  name: 'GlossaryTerm',

  props: {
    /** The key in data/glossary.json. An unknown key renders nothing. */
    term: { type: String, required: true }
  },

  computed: {
    /** @returns {{term: string, plain: string}|null} */
    entry () {
      const found = GLOSSARY.terms[this.term]
      return found && found.plain ? found : null
    },

    /**
     * What a screen reader announces. The tooltip's own text is not reachable by keyboard
     * on its own, so the button carries the term in its label.
     * @returns {string}
     */
    ariaLabel () {
      return this.entry ? this.entry.term : ''
    }
  }
}
</script>

<style scoped>
.glossary-term {
  margin-left: 6px;
  vertical-align: middle;
}
/* The mark sits INSIDE a heading, and section headings here are uppercase and
   letter-spaced (`.tw-h2`). The tooltip's text is a descendant of that heading, so it
   inherits both and a sentence of plain-English help arrives shouted and stretched —
   harder to read than the term it explains. Reset it to what data/glossary.json holds.
   `::v-deep` because Buefy renders `.tooltip-content` inside its own template, so it
   carries no scope attribute and a plain scoped selector would not reach it. */
.glossary-term ::v-deep .tooltip-content {
  text-transform: none;
  letter-spacing: normal;
}
.gt-mark {
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  width: 15px;
  height: 15px;
  padding: 0;
  border-radius: 50%;
  cursor: help;
  color: var(--rs-accent, #0070c0);
  background: var(--rs-accent-soft, #0070c018);
  border: 1px solid var(--rs-accent-soft, #0070c04d);
}
.gt-mark:hover,
.gt-mark:focus {
  color: var(--rs-accent-contrast, #ffffff);
  background: var(--rs-accent, #0070c0);
}
</style>

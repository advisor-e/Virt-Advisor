<template lang="pug">
component.scgw(
  v-if="drawing"
  :is="drawing"
  :firm-name="markName"
  :firm-initial="markInitial"
  :firm-colour="firmColour"
)
</template>

<script>
import { CONCEPT_GRAPHICS } from '~/components/strategy/concepts'

/**
 * StrategyConceptGraphic — the concept's approved drawing, wherever it is taught.
 *
 * 🔴 ONE RESOLVER, TWO PLACES. The advisor sees it mid-session and the client
 * sees the same drawing in the plan they keep; both render this, so the two can
 * never disagree. Mike's instruction, 2026-09-17: *"i want the graphic up so the
 * advisor can speak to it - then the responses are captured after the click of a
 * button."*
 *
 * ⚠ A CONCEPT WITHOUT A DRAWING RENDERS NOTHING, and that is correct rather than
 * a gap to paper over — the screens then show Mike's own words, which is what all
 * 52 did before item 15.7. `hasConceptGraphic` is how a caller asks.
 *
 * 🔴 THE DRAWING LOADS ONLY WHEN ITS CONCEPT IS OPENED. The 33 weigh 361 KB
 * gzipped between them against a 300 KB first-load budget for the whole app, so
 * the registry holds lazy imports and never a static list of components.
 *
 * ⚠ THE FIRM'S OWN BRANDING HAS NO SOURCE IN THIS APP. Advisor-e holds firm
 * identity, not us, so until it reaches a token the mark prints the same
 * placeholder the Dashboard Report cover already uses. The props are the seam;
 * nothing here invents a name or a colour.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyConceptGraphic',

  props: {
    /** Which concept, as `data/strategy-frameworks.json` ids it. */
    conceptId: {
      type: String,
      default: ''
    },

    /** The advisor firm's name. Empty until Advisor-e supplies one. */
    firmName: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. */
    firmColour: {
      type: String,
      default: '#0070c0'
    }
  },

  computed: {
    /**
     * The drawing to render, as a lazy component factory.
     * @returns {(function(): Promise<object>)|null}
     */
    drawing () {
      return CONCEPT_GRAPHICS[this.conceptId] || null
    },

    /**
     * The name beside the mark — the firm's, or the placeholder the rest of the
     * app already shows where branding has not arrived.
     * @returns {string}
     */
    markName () {
      return this.firmName || this.$t('report.dashboardReports.doc.firmLogo')
    },

    /**
     * The single letter on the disc. Blank where there is no firm, because a
     * made-up initial is a made-up firm.
     * @returns {string}
     */
    markInitial () {
      return this.firmName.trim().charAt(0).toUpperCase()
    }
  }
}
</script>

<style scoped>
.scgw {
  width: 100%;
}
</style>

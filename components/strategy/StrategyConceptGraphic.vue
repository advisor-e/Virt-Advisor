<template lang="pug">
component.scgw(
  v-if="drawing"
  :is="drawing"
  :firm-name="markName"
  :firm-initial="markInitial"
  :firm-colour="firmColour"
  :firm-logo="firmLogo"
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
 * 🔴 THE DRAWING LOADS ONLY WHEN ITS CONCEPT IS OPENED. The 32 weigh 375 KB
 * gzipped between them — five of them carry a photograph, the largest 120 KB —
 * so the registry holds lazy imports and never a static list of components.
 * Measured 2026-09-20: first load is 129.6 KB gzipped against a 300 KB budget,
 * and no drawing is in it.
 *
 * ⚠ THE FIRM'S OWN BRANDING IS ADVISOR-E'S, AND IT NOW HAS A SOURCE.
 * `firmBrand()` in server/utils/firmsDirectory.js reads the name, logo and
 * colour off Advisor-e's firm profile record (seam Q-FIRM-BRAND). Until the
 * master team names the two columns it returns nulls, and the mark prints the
 * same placeholder the Dashboard Report cover already uses. The props are the
 * seam; nothing here invents a name, a logo or a colour.
 *
 * 🔴 THE LOGO IS THE MARK; THE DISC IS THE FALLBACK — Mike, 2026-09-22. A firm
 * with a logo shows it, in a fixed-height box that holds any proportion; a firm
 * without shows the initials disc and its name, as every drawing did before.
 * The firm's colour brands the page border either way.
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

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL. Empty means the firm
     * holds none, and the drawing falls back to the initials disc.
     */
    firmLogo: {
      type: String,
      default: ''
    },

    /**
     * Which teaching sheet of this concept to draw, from 0.
     *
     * 🔴 ALMOST EVERY CONCEPT HAS EXACTLY ONE, so the default is 0 — but
     * Collaborative Thinking has two (Mike, 2026-09-23), because his Christchurch
     * story and his De Bono explanation are both nearly full pages at his own
     * type sizes and neither may be shrunk to join them. A caller that never
     * passes this teaches the FIRST SHEET ONLY, which is why every surface loops
     * `conceptSheetCount` rather than rendering this component once.
     */
    sheet: {
      type: Number,
      default: 0,
      validator: n => Number.isInteger(n) && n >= 0
    }
  },

  computed: {
    /**
     * The drawing to render, as a lazy component factory.
     *
     * ⚠ The registry holds a LIST per concept since 2026-09-23. An out-of-range
     * sheet renders nothing rather than throwing — the same safe state as a
     * concept with no drawing at all.
     *
     * @returns {(function(): Promise<object>)|null}
     */
    drawing () {
      const sheets = CONCEPT_GRAPHICS[this.conceptId]
      return (sheets && sheets[this.sheet]) || null
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

<template lang="pug">
.scgw(v-if="drawing" :class="{ 'is-editable': editable }" @click="onPageClick")
  component(
    ref="drawing"
    :is="drawing"
    v-bind="drawingProps"
    @hook:mounted="onDrawingMounted"
  )
  strategy-text-edit-panel(
    v-if="openBlock"
    :value="draft"
    :state="fitState"
    :saving="saving"
    :edited="Boolean(edits[openBlock.key])"
    @input="onDraftInput"
    @save="onSave"
    @cancel="onCancel"
    @restore="onRestore"
  )
</template>

<script>
import { CONCEPT_GRAPHICS } from '~/components/strategy/concepts'
import StrategyTextEditPanel from '~/components/strategy/StrategyTextEditPanel.vue'
import { normaliseWords } from '~/utils/conceptTextBlocks'
import { readBlocks, drawBlock, checkFit, markHit, blockAt } from '~/utils/conceptTextDom'

/** How long the advisor pauses typing before the page is redrawn and measured again. */
const MEASURE_DELAY_MS = 250

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
 * 🔴 AND IT CARRIES THE ADVISOR'S OWN WORDING — item 15.25, approved to build by Mike
 * 2026-09-25 from design/mockups/strategy-edit-text-test.html. Because every surface
 * draws a concept through this one component, an edit saved on the Run screen shows in
 * the client's printed plan with no second copy anywhere. `edits` applies them wherever
 * the page is drawn; `editable` — Run session only — lets the advisor click a block of
 * text and change it. An edit that does not fit the page is never saved (his ruling the
 * same day); the edit belongs to this session alone (Decision C, 2026-09-21).
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyConceptGraphic',

  components: { StrategyTextEditPanel },

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
    },

    /**
     * This sheet's saved edits, block name → the advisor's words. Item 15.25.
     * Empty means the page is drawn exactly as approved.
     */
    edits: {
      type: Object,
      default: () => ({})
    },

    /** True on the Run screen only: the advisor may click the page's text to edit it. */
    editable: {
      type: Boolean,
      default: false
    },

    /**
     * The session's step names, in order — for a page whose agenda IS the step list.
     *
     * 🔴 Mike's ruling, 2026-09-23, on Our Session Objective: *"make sure the AGENDA
     * section is editable"* — and the same day, the agenda is the session's own step
     * list, never a second list. The page was built with the slot and nothing passed it
     * the steps for two days, so the client always read Mike's four default lines.
     * Only a page that declares `agendaItems` receives them (see `takesAgenda`).
     */
    agendaItems: {
      type: Array,
      default: () => []
    }
  },

  data () {
    // The page's blocks and its svg live on `this._blocks` / `this._svg`, deliberately NOT
    // in data: they hold DOM elements, which Vue must not walk and make reactive.
    return {
      /** The block whose edit box is open, or null. */
      openBlock: null,
      draft: '',
      /** 'idle' until measured, then 'fits' or 'noFit'. */
      fitState: 'idle',
      saving: false,
      /**
       * Whether the loaded drawing has an agenda slot. Asked of the drawing itself once it
       * loads, so no second, hand-kept list of such pages exists to drift from the
       * generated registry.
       */
      takesAgenda: false
    }
  },

  computed: {
    /**
     * What the drawing is given: the firm's mark always, the step names only where the
     * drawing declares a slot for them — any other drawing would carry them as a stray
     * HTML attribute.
     * @returns {object}
     */
    drawingProps () {
      const props = {
        firmName: this.markName,
        firmInitial: this.markInitial,
        firmColour: this.firmColour,
        firmLogo: this.firmLogo
      }
      if (this.takesAgenda) { props.agendaItems = this.agendaItems }
      return props
    },

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
  },

  watch: {
    /** A save elsewhere, or a reopened session: redraw with whatever is now stored. */
    edits: {
      deep: true,
      handler () { this.drawSaved() }
    }
  },

  beforeDestroy () {
    clearTimeout(this._measureTimer)
  },

  methods: {
    /**
     * The drawing is on screen: read its blocks and draw the session's saved edits.
     * Browser-only — this runs after mount, never during server rendering.
     */
    async onDrawingMounted () {
      const drawn = this.$refs.drawing
      this.takesAgenda = Boolean(drawn && drawn.$options.props && drawn.$options.props.agendaItems)
      if (typeof document === 'undefined') { return }
      // Widths measured in a stand-in font are wrong; wait for the page's own.
      if (document.fonts && document.fonts.ready) { await document.fonts.ready }
      const svg = this.$el && this.$el.querySelector ? this.$el.querySelector('svg') : null
      // ⚠ A PAGE WITH NO LAYOUT STAYS AS DRAWN, QUIETLY. Reading blocks needs the page's
      // geometry; where there is none (a test's simulated browser has no text layout) the
      // page is left un-editable rather than throwing on every drawing.
      if (!svg || !svg.viewBox || !svg.viewBox.baseVal || typeof svg.getScreenCTM !== 'function' || !svg.getScreenCTM()) { return }
      this._svg = svg
      this._blocks = readBlocks(svg)
      this.drawSaved()
    },

    /** Draw every block as the session has it: the advisor's words, or the original. */
    drawSaved () {
      if (!this._blocks) { return }
      this._blocks.forEach((b) => {
        if (this.openBlock !== b) { drawBlock(b, this.edits[b.key] || null) }
      })
    },

    /** @param {MouseEvent} e */
    onPageClick (e) {
      if (!this.editable || !this._blocks || this.openBlock) { return }
      const block = blockAt(this._blocks, e.target)
      if (!block) { return }
      this.openBlock = block
      this.draft = this.edits[block.key] || block.original
      this.fitState = 'idle'
      this.measure()
    },

    /** @param {string} words */
    onDraftInput (words) {
      this.draft = words
      clearTimeout(this._measureTimer)
      this._measureTimer = setTimeout(() => this.measure(), MEASURE_DELAY_MS)
    },

    /** Redraw the open block with the draft, and say whether it fits. */
    measure () {
      if (!this.openBlock) { return }
      drawBlock(this.openBlock, this.draft)
      const result = checkFit(this._svg, this.openBlock)
      this.fitState = result.fits ? 'fits' : 'noFit'
      markHit(this._svg, result.hit)
    },

    onSave () {
      clearTimeout(this._measureTimer)
      this.measure()
      if (this.fitState !== 'fits') { return }
      const words = normaliseWords(this.draft) === this.openBlock.original ? null : this.draft
      this.send(words)
    },

    onRestore () {
      clearTimeout(this._measureTimer)
      this.send(null)
    },

    onCancel () {
      clearTimeout(this._measureTimer)
      this.close()
    },

    /**
     * Hand the edit to the page to save. The box stays open until the page says it saved,
     * so a failed save never looks like a finished one.
     * @param {string|null} words null puts back the original
     */
    send (words) {
      this.saving = true
      const block = this.openBlock
      // Payload: { conceptId, sheet, block, text } — text null puts back the original;
      // `done(ok)` is called by the page once the save has succeeded or failed.
      this.$emit('text-edited', { conceptId: this.conceptId, sheet: this.sheet, block: block.key, text: words }, (ok) => {
        this.saving = false
        // The stored copy reaches `edits` a moment after the save; draw what was just saved
        // now rather than flicker back to the old words until it does.
        if (ok) { this.close(words) }
      })
    },

    /**
     * Close the box and draw the block.
     * @param {string|null} [saved] the words just saved; omitted means draw what is stored
     */
    close (saved) {
      const block = this.openBlock
      this.openBlock = null
      this.fitState = 'idle'
      if (this._svg) { markHit(this._svg, null) }
      if (block) { drawBlock(block, saved !== undefined ? saved : (this.edits[block.key] || null)) }
    }
  }
}
</script>

<style scoped>
.scgw {
  width: 100%;
}

.scgw.is-editable ::v-deep text {
  cursor: text;
}
</style>

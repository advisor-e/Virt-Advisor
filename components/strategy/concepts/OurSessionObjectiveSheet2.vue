<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Agenda. The session's steps in order, each with the concepts it holds beneath it.">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!-- Sheet 2's title, in his title style (sheet 1's: x 44.34, y 90.59, 50pt,
                 #002B64). His heading read "Agenda:"; as a page title the colon goes. -->
            <g font-family="Open Sans, sans-serif">
              <text x="44.34" y="90.59" font-size="50" fill="#002B64">Agenda</text>
            </g>

            <!-- ============================================================
                 THE AGENDA SLOT — Mike's ruling, 2026-09-23; on its own sheet since
                 2026-09-26 (item 15.26), his four lines moved up as one block. In the app these
                 rows are the SESSION'S OWN STEPS, the list the advisor named in
                 Build session. His four lines are the shipped default and are
                 what this drawing is approved against.

                 🔴 The rows are his page span for span: the sentence in #434343
                 and the "(section n)" tag bold #002B64, set INLINE at its own
                 measured x, because on his page the tag interrupts the line
                 rather than following it. Row 2 runs sentence, tag, sentence.
                 ============================================================ -->
            <g class="agenda-slot" font-family="Open Sans, sans-serif" v-if="!agendaRows.length">
              <text x="98.09" y="184.09" font-size="25" fill="#434343">&#9679;</text>
              <!-- 🔴 xml:space="preserve" ON EVERY SPAN OF HIS THAT CARRIES A LEADING OR
                   TRAILING SPACE. His "(section n)" tags interrupt the line, so the space
                   before one lives at the END of the span before it and is part of that
                   span's MEASURED width. SVG collapses edge whitespace by default, so the
                   glyphs stretched to fill the pinned width instead and closed the gap:
                   the drawing read "same page'.(section 1)" and "data(section 2)&". Caught
                   by putting this beside his page, which is step 1 of the method and the
                   only thing that could have caught it. -->
              <text x="150.69" y="184.09" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="928.6" lengthAdjust="spacing">Review the Planning Process &amp; Language to ensure we&#8217;re all on the &#8216;same page&#8217;. </text>
              <text x="1080.44" y="184.09" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 1)</text>

              <text x="98.09" y="218.98" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="218.98" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="651.48" lengthAdjust="spacing">Assess current position by reviewing (pre-meeting) data </text>
              <text x="803.01" y="218.98" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 2)</text>
              <text x="931.18" y="218.98" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="388.22" lengthAdjust="spacing"> &amp; Financial Performance Reports</text>

              <text x="98.09" y="253.36" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="253.36" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="803.73" lengthAdjust="spacing">Determine the business Strategic Objective &amp; document the Strategy </text>
              <text x="955.33" y="253.36" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 3)</text>

              <text x="98.09" y="287.73" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="287.73" font-size="25" fill="#434343"
                    textLength="1218" lengthAdjust="spacing">Brainstorm &amp; record Operational Objectives and Tactics (actions) in the Automated Action Plan Reminder</text>
            </g>
            <g class="agenda-slot is-live" v-else font-family="Open Sans, sans-serif">
              <template v-for="(r, i) in agendaRows">
                <text v-if="r.lead" :key="'m' + i" :x="r.markX" :y="r.y"
                      :font-size="r.size" :font-weight="r.weight" :fill="r.ink">{{ r.mark }}</text>
                <text :key="'t' + i" class="ag-t" :data-max="r.max" :x="r.x" :y="r.y"
                      :font-size="r.size" :font-weight="r.weight" :fill="r.ink">{{ r.text }}</text>
              </template>
            </g>

            <!-- The firm's mark, standing exactly where advisor-e.com was burned in. -->
            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>

            <!-- His deck frame, returned in the firm's colour rather than #00B1E0.
                 Five bars inset from the edge with the foot broken in the lower left,
                 and the firm's mark standing in that break. -->
            <rect class="firm-bar is-t" x="8.13" y="8.13" width="1483.74" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-l" x="8.13" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-r" x="1477.71" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-bl" x="8.13" y="821.07" width="95.01" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-brun" x="248.31" y="821.07" width="1243.56" height="14.8" :fill="firmColour"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-our-session-objective.html (drawing 2) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
import { layoutAgenda } from '~/utils/agendaLayout'

export default {
  name: 'ConceptOurSessionObjectiveSheet2',

  props: {
    /** The advisor firm's name, printed beside the mark. */
    firmName: {
      type: String,
      default: ''
    },

    /** One letter for the disc. */
    firmInitial: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL.
     *
     * Mike's ruling, 2026-09-22: this IS the mark. The initials disc and the
     * printed name are the fallback shown only when a firm holds no logo. The
     * box is a fixed height with preserveAspectRatio="xMinYMid meet", so a logo
     * of any proportion is scaled to fit and never stretched or cropped.
     *
     * Supplied by `firmBrand()` in server/utils/firmsDirectory.js, which reads
     * it from Advisor-e's own firm profile record and returns null for anything
     * that is not an http(s) URL — so an empty string here is the safe state,
     * not a missing value.
     */
    firmLogo: {
      type: String,
      default: ''
    },

    /**
     * The session's own running order: each step with the concepts placed in it,
     * `{ name, children }`, from `agendaGroups` in utils/agendaLayout.js.
     *
     * Mike's ruling, 2026-09-23: the framing page's AGENDA **is** the step list
     * the advisor names in Build session, not a second list of its own — so the
     * page a client reads and the order the app follows can never disagree. And
     * 2026-09-26: each step is a parent with its concepts as children (item 15.26).
     *
     * EMPTY IS NOT A MISSING VALUE. It means no session has supplied steps, and
     * the page then shows Mike's own four lines exactly as drawn, which is the
     * state the artefact was approved in.
     */
    agendaItems: {
      type: Array,
      default: () => []
    },

    /** Which agenda sheet this is, from 0 — more than one only past three columns. */
    agendaPage: {
      type: Number,
      default: 0
    }
  },

  computed: {
    /** @returns {Array<object>} this sheet's rows, each carrying its own place and look */
    agendaRows () {
      const pages = layoutAgenda(this.agendaItems)
      return (pages[this.agendaPage] || { rows: [] }).rows
    }
  },

  mounted () {
    this.squeeze()
  },

  updated () {
    this.squeeze()
  },

  methods: {
    /**
     * A line the layout's estimate let through slightly too wide is squeezed to its
     * space; every other line is left exactly as drawn. Browser-only.
     */
    squeeze () {
      if (!this.$el || !this.$el.querySelectorAll) { return }
      Array.prototype.forEach.call(this.$el.querySelectorAll('text.ag-t'), (t) => {
        const max = Number(t.getAttribute('data-max'))
        t.removeAttribute('textLength')
        t.removeAttribute('lengthAdjust')
        if (typeof t.getComputedTextLength !== 'function' || !(t.getComputedTextLength() > max)) { return }
        t.setAttribute('textLength', String(max))
        t.setAttribute('lengthAdjust', 'spacingAndGlyphs')
      })
    }
  }
}
</script>

<style scoped>
.scg {
  width: 100%;
}

.scg >>> svg {
  display: block;
  width: 100%;
  height: auto;
}
</style>

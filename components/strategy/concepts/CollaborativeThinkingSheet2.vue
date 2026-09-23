<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Collaborative Thinking. Why well-meaning contributors talk at cross purposes, De Bono's six-hats technique, the definition no side but everyone from all sides, the Christchurch action story, and the three G's against Argumentative Theory.">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <g font-family="Open Sans, sans-serif">
              <text x="52.88" y="105.23" font-size="50" fill="#002B64"
                    textLength="517.55" lengthAdjust="spacing">Collaborative Thinking</text>

              <text x="53.89" y="166.57" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="1396.22" lengthAdjust="spacing">In many cases, a number of &#8216;well-meaning&#8217; individuals may be contributing to the business discussion. However, due to the often </text>
              <text x="53.89" y="197.82" font-size="22.92" fill="#434343"
                    textLength="1160.22" lengthAdjust="spacing">misuse of planning terminology, people can become confused and begin thinking in terms of cross purposes.</text>

              <text x="53.89" y="294.17" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="1396.11" lengthAdjust="spacing">Edward De Bono highlights the power of &#8216;collaborative thinking&#8217; in his &#8216;6-hats thinking&#8217; technique as being the crucial element in </text>
              <text x="53.89" y="325.95" font-size="22.92" fill="#434343"
                    textLength="367.58" lengthAdjust="spacing">modern business problem solving.</text>

              <!-- ⚠ HIS DEFINITION IS SET LARGER THAN THE LINE IT SITS IN — 25pt against
                   22.92pt, its own span at its own x. That emphasis is his. -->
              <text x="53.89" y="424.3" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="507.26" lengthAdjust="spacing">Collaborative thinking can best be described as </text>
              <text x="561.42" y="424.3" font-size="25" fill="#434343"
                    textLength="442.8" lengthAdjust="spacing">&#8220;no side &#8211; but everyone from all sides&#8221;</text>

              <!-- His own instruction to the advisor, and the reason these two pages are
                   one concept: it names the story sheet 1 draws. Bold is his. -->
              <text x="53.89" y="522.3" font-size="22.92" font-weight="700" fill="#434343"
                    textLength="1047.04" lengthAdjust="spacing">Action Story. Christchurch Building Engineers. (Draw the building with 4 people, 1 each side)</text>

              <text x="53.89" y="619.17" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="1396.29" lengthAdjust="spacing">De-Bono explained how the &#8216;3 G&#8217;s&#8217; (Greek philosophers, Socrates, Aristotle &amp; Plato) sought truth via questions and combined many </text>
              <text x="53.89" y="650.95" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="1396.31" lengthAdjust="spacing">&#8216;lines of thought&#8217; for extending their understanding. The Catholic Church introduced &#8216;Argumentative Theory&#8217; and sought truth via a </text>
              <text x="53.89" y="682.2" font-size="22.92" fill="#434343" xml:space="preserve"
                    textLength="1396.33" lengthAdjust="spacing">logical argument of two sides (positive and negative) which made it easier to label people as Heretics and &#8216;remove them&#8217;. This style </text>
              <text x="53.89" y="713.45" font-size="22.92" fill="#434343"
                    textLength="523.76" lengthAdjust="spacing">of thinking was not developed for &#8216;creative value&#8217;.</text>
            </g>

            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>
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
 * Lifted from design/mockups/strategy-concept-collaborative-thinking.html (drawing 2) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptCollaborativeThinkingSheet2',

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

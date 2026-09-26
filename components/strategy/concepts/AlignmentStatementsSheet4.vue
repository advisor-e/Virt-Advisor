<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="5 Domains Introduction. Being, Knowing, Relating, Having and Doing, and the driving and enabling content domains.">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <g font-family="Open Sans, sans-serif">
              <text x="41.34" y="102.24" font-size="50.0" fill="#002B64" textLength="550.9" lengthAdjust="spacing">5 Domains Introduction</text>
              <text x="41.34" y="155.66" font-size="20.83" fill="#434343" xml:space="preserve" textLength="830.0" lengthAdjust="spacing">The ‘things’ that steal our mental attention can be referred to as ‘Content Domains’. </text>
              <text x="873.68" y="155.66" font-size="20.83" fill="#002B64" font-weight="700" xml:space="preserve" textLength="583.13" lengthAdjust="spacing">The 5 areas of content are ‘Being’, ‘Knowing’, ‘Relating’, </text>
              <text x="41.34" y="180.66" font-size="20.83" fill="#002B64" font-weight="700" textLength="428.67" lengthAdjust="spacing">‘Having’ (‘Getting or Keeping’) and ‘Doing’.</text>
              <text x="41.34" y="230.66" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1415.37" lengthAdjust="spacing">These content areas are known as ‘Meta-Programme Content Distinctions’ within certain NLP (Neuro-linguistic Programming) circles and they can </text>
              <text x="41.34" y="255.66" font-size="20.83" fill="#434343" textLength="768.25" lengthAdjust="spacing">be used to explain the cognitive patterns (formula) we use to get what we want.</text>
              <text x="41.34" y="305.66" font-size="20.83" fill="#434343" textLength="1073.02" lengthAdjust="spacing">Our DRIVING content domain is the OUTCOME we want; the ENABLING content domains is how we try to get it.</text>
              <text x="41.34" y="354.01" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1408.29" lengthAdjust="spacing">Think of it like a maths formula; the formula is made up of 1 or 2 of the enabling content areas that we instinctively use to achieve our dominant </text>
              <text x="41.34" y="379.01" font-size="20.83" fill="#434343" textLength="209.73" lengthAdjust="spacing">‘Driving’ content area.</text>
              <text x="41.34" y="429.01" font-size="20.83" fill="#434343" textLength="311.52" lengthAdjust="spacing">It could look something like this;</text>
              <text x="43.93" y="466.51" font-size="20.83" fill="#434343" textLength="7.81" lengthAdjust="spacing">•</text>
              <text x="76.76" y="466.51" font-size="20.83" fill="#434343" textLength="589.65" lengthAdjust="spacing">I want to HAVE something physical – static position/outcome.</text>
              <text x="43.93" y="504.01" font-size="20.83" fill="#434343" textLength="7.81" lengthAdjust="spacing">•</text>
              <text x="76.76" y="504.01" font-size="20.83" fill="#434343" xml:space="preserve" textLength="968.83" lengthAdjust="spacing">My consistent formula may be  (Know + Do = Have) for example. (as my DOMINANT domain is HAVE)</text>
              <text x="43.93" y="541.51" font-size="20.83" fill="#434343" textLength="7.81" lengthAdjust="spacing">•</text>
              <text x="76.76" y="541.51" font-size="20.83" fill="#434343" textLength="687.38" lengthAdjust="spacing">My main want is still to HAVE (therefore this is my Driving content area)</text>
              <text x="43.93" y="579.01" font-size="20.83" fill="#434343" textLength="7.81" lengthAdjust="spacing">•</text>
              <text x="76.76" y="579.01" font-size="20.83" fill="#434343" textLength="609.92" lengthAdjust="spacing">My preferred Enabling Formula Components are Know and Do.</text>
              <text x="41.34" y="641.51" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1408.02" lengthAdjust="spacing">Our dominant ‘Driving Content area’ can change, and often does throughout our lives but it’s normally in response to a need being met (or </text>
              <text x="41.34" y="666.51" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1408.27" lengthAdjust="spacing">un-met) and as mentioned in the Alderfer model – the Frustration/ Regression Principle can sometimes shift our focus from what we truly want, </text>
              <text x="41.34" y="691.51" font-size="20.83" fill="#434343" textLength="501.71" lengthAdjust="spacing">onto something we feel we can achieve more easily.</text>
              <text x="41.34" y="741.51" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1408.42" lengthAdjust="spacing">(I really WANT to HAVE something like flashy sports car – too expensive; can’t achieve it – instead I focus on BEING so that I can maintain my </text>
              <text x="41.34" y="766.51" font-size="20.83" fill="#434343" textLength="163.23" lengthAdjust="spacing">emotional state.)</text>
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
 * Lifted from design/mockups/strategy-concept-alignment-statements.html (drawing 4) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptAlignmentStatementsSheet4',

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

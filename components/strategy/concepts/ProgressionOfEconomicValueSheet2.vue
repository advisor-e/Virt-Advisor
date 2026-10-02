<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Progression of Economic Value: &#8220;Customers will gladly spend both time and money for an experience of authenticity&#8221;">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!-- The firm's mark, standing exactly where advisor-e.com was burned in. -->
            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>

            <path d="M 49.69 174.31 L 49.69 756.17" fill="none" stroke="#000000" stroke-width="4.69"></path>
            <path d="M 517.87 174.31 L 517.87 756.17" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 986.04 174.31 L 986.04 756.17" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1454.21 174.31 L 1454.21 756.17" fill="none" stroke="#000000" stroke-width="4.69"></path>
            <path d="M 47.35 176.65 L 1456.55 176.65" fill="none" stroke="#000000" stroke-width="4.69"></path>
            <path d="M 47.35 300.2 L 1456.55 300.2" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 47.35 413.55 L 1456.55 413.55" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 47.35 527.12 L 1456.55 527.12" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 47.35 640.47 L 1456.55 640.47" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 47.35 753.83 L 1456.55 753.83" fill="none" stroke="#000000" stroke-width="4.69"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="53.77" y="87.41" font-size="45.83" fill="#002B64" xml:space="preserve" textLength="1342.64" lengthAdjust="spacing">&#8220;Customers will gladly spend both time and money for an </text>
              <text x="53.77" y="137.41" font-size="45.83" fill="#002B64" xml:space="preserve" textLength="593.86" lengthAdjust="spacing">experience of authenticity&#8221;  </text>
              <text x="648.20" y="137.41" font-size="22.92" fill="#002B64" textLength="137.59" lengthAdjust="spacing">(Joseph Pine)</text>
              <text x="94.73" y="253.86" font-size="43.75" font-weight="700" fill="#002B64" textLength="377.87" lengthAdjust="spacing">Economic Output</text>
              <text x="530.43" y="253.86" font-size="43.75" font-weight="700" fill="#002B64" textLength="442.71" lengthAdjust="spacing">Business Imperative</text>
              <text x="1108.68" y="227.30" font-size="43.75" font-weight="700" fill="#002B64" xml:space="preserve" textLength="234.11" lengthAdjust="spacing">Consumer </text>
              <text x="1106.00" y="280.43" font-size="43.75" font-weight="700" fill="#002B64" textLength="228.07" lengthAdjust="spacing">Sensitivity</text>
              <text x="164.03" y="372.31" font-size="43.75" font-weight="700" fill="#434343" textLength="239.31" lengthAdjust="spacing">Experience</text>
              <text x="678.15" y="372.31" font-size="43.75" fill="#ED7D31" textLength="147.48" lengthAdjust="spacing">Render</text>
              <text x="1097.89" y="372.31" font-size="43.75" fill="#00B1E0" textLength="244.26" lengthAdjust="spacing">Authenticity</text>
              <text x="194.71" y="485.77" font-size="43.75" font-weight="700" fill="#434343" textLength="177.97" lengthAdjust="spacing">Services</text>
              <text x="666.90" y="485.77" font-size="43.75" fill="#ED7D31" textLength="169.93" lengthAdjust="spacing">Improve</text>
              <text x="1147.74" y="485.77" font-size="43.75" fill="#00B1E0" textLength="144.59" lengthAdjust="spacing">Quality</text>
              <text x="216.14" y="599.23" font-size="43.75" font-weight="700" fill="#434343" textLength="135.23" lengthAdjust="spacing">Goods</text>
              <text x="598.11" y="599.23" font-size="43.75" fill="#ED7D31" textLength="307.3" lengthAdjust="spacing">Quality Control</text>
              <text x="1164.54" y="599.23" font-size="43.75" fill="#00B1E0" textLength="111.04" lengthAdjust="spacing">Costs</text>
              <text x="139.31" y="712.59" font-size="43.75" font-weight="700" fill="#434343" textLength="288.75" lengthAdjust="spacing">Commodities</text>
              <text x="683.29" y="712.59" font-size="43.75" fill="#ED7D31" textLength="137.16" lengthAdjust="spacing">Supply</text>
              <text x="1111.30" y="712.59" font-size="43.75" fill="#00B1E0" textLength="217.35" lengthAdjust="spacing">Availability</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 1) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptProgressionOfEconomicValueSheet2',

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

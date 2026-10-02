<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Sales Process Review: Logical (Consultancy) Decision Points">

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

            <g font-family="Open Sans, sans-serif">
              <text x="55.88" y="93.62" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="868.55" lengthAdjust="spacing">Logical (Consultancy) Decision Points </text>
              <text x="55.89" y="160.51" font-size="22.92" fill="#434343" textLength="103.86" lengthAdjust="spacing">Research:</text>
              <text x="222.56" y="160.51" font-size="22.92" fill="#434343" textLength="487.92" lengthAdjust="spacing">Do they fit my profile, Are they approachable?</text>
              <text x="55.89" y="256.86" font-size="22.92" fill="#434343" textLength="119.12" lengthAdjust="spacing">Phone Call:</text>
              <text x="222.56" y="256.86" font-size="22.92" fill="#434343" textLength="505.24" lengthAdjust="spacing">Will they agree to meet, Are they open minded?</text>
              <text x="55.89" y="353.74" font-size="22.92" fill="#434343" textLength="138.51" lengthAdjust="spacing">Introduction:</text>
              <text x="222.56" y="353.74" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1163.62" lengthAdjust="spacing">Is there a need for further discussion, What are the chances of doing business now or in the future, Who else </text>
              <text x="222.56" y="385.51" font-size="22.92" fill="#434343" textLength="302.2" lengthAdjust="spacing">needs to make the decision?</text>
              <text x="55.89" y="481.86" font-size="22.92" fill="#434343" textLength="70.17" lengthAdjust="spacing">Scope:</text>
              <text x="222.56" y="481.86" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1179.64" lengthAdjust="spacing">Does the prospect have a legitimate need/want for my product or service, what are the complexities/drivers of </text>
              <text x="222.56" y="513.63" font-size="22.92" fill="#434343" textLength="801.6" lengthAdjust="spacing">the engagement and will it be a profitable &amp; enjoyable engagement for me?</text>
              <text x="55.89" y="609.99" font-size="22.92" fill="#434343" textLength="142.43" lengthAdjust="spacing">Presentation:</text>
              <text x="222.56" y="609.99" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1183.42" lengthAdjust="spacing">Does my product or service offer satisfy their expectations, needs &amp; wants, Is it a win-win, Is there anything I&#8217;ve </text>
              <text x="222.56" y="641.76" font-size="22.92" fill="#434343" textLength="483.93" lengthAdjust="spacing">missed that could prevent us doing business?</text>
              <text x="55.89" y="738.11" font-size="22.92" fill="#434343" textLength="176.96" lengthAdjust="spacing">Implementation:</text>
              <text x="280.89" y="738.11" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1130.07" lengthAdjust="spacing">Is the answer yes/no or a reduction or layered delivery over time, If so why/why not and How long, Is their </text>
              <text x="222.56" y="769.88" font-size="22.92" fill="#434343" textLength="280.89" lengthAdjust="spacing">request acceptable to me?</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 14) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptSalesProcessReviewSheet4',

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

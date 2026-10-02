<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Sales Process Review: Logical (Point of Sale) Decision Points">

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
              <text x="55.88" y="86.12" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="873.9" lengthAdjust="spacing">Logical (Point of Sale) Decision Points </text>
              <text x="61.86" y="151.54" font-size="22.92" fill="#434343" textLength="124.23" lengthAdjust="spacing">Positioning:</text>
              <text x="228.52" y="151.54" font-size="22.92" fill="#434343" textLength="777.17" lengthAdjust="spacing">Is the customer willing to engage with me, is the decision maker present?</text>
              <text x="61.86" y="247.90" font-size="22.92" fill="#434343" textLength="149.23" lengthAdjust="spacing">Needs/Wants:</text>
              <text x="228.52" y="247.90" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1147.32" lengthAdjust="spacing">Does the prospect have a legitimate need/want for my product or service, Will it be a profitable &amp; enjoyable </text>
              <text x="228.52" y="279.67" font-size="22.92" fill="#434343" textLength="220.21" lengthAdjust="spacing">engagement for me?</text>
              <text x="61.86" y="376.02" font-size="22.92" fill="#434343" textLength="141.05" lengthAdjust="spacing">Qualification:</text>
              <text x="228.52" y="376.02" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1213.44" lengthAdjust="spacing">Does the prospect have the Financial &amp; Non-Financial Means to be able to complete a transaction with me? (Time, </text>
              <text x="228.52" y="407.79" font-size="22.92" fill="#434343" textLength="263.22" lengthAdjust="spacing">Money, Health, Age, etc.)</text>
              <text x="61.86" y="504.15" font-size="22.92" fill="#434343" textLength="142.43" lengthAdjust="spacing">Presentation:</text>
              <text x="228.52" y="504.15" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1183.42" lengthAdjust="spacing">Does my product or service offer satisfy their expectations, needs &amp; wants, Is it a win-win, Is there anything I&#8217;ve </text>
              <text x="228.52" y="535.92" font-size="22.92" fill="#434343" textLength="483.93" lengthAdjust="spacing">missed that could prevent us doing business?</text>
              <text x="61.86" y="632.27" font-size="22.92" fill="#434343" textLength="125.77" lengthAdjust="spacing">Elimination:</text>
              <text x="228.52" y="632.27" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1132.17" lengthAdjust="spacing">What can I &#8216;take off the table&#8217; to narrow the focus of decision, will the prospect allow me to engage in their </text>
              <text x="228.52" y="664.04" font-size="22.92" fill="#434343" textLength="173.14" lengthAdjust="spacing">&#8216;decision space&#8217;?</text>
              <text x="61.86" y="760.40" font-size="22.92" fill="#434343" textLength="108.21" lengthAdjust="spacing">Win / Win:</text>
              <text x="228.52" y="760.40" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1130.07" lengthAdjust="spacing">Is the answer yes/no or a reduction or layered delivery over time, If so why/why not and How long, Is their </text>
              <text x="228.52" y="792.17" font-size="22.92" fill="#434343" textLength="382.73" lengthAdjust="spacing">request acceptable to me/business?</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 13) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptSalesProcessReviewSheet3',

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

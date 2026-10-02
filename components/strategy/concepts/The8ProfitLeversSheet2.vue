<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="The 8 Profit Levers: The 8 &#8216;Lever&#8217; Efforts In Brief">

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

            <path d="M 53.42 126.95 L 1430.52 126.95 L 1430.52 748.42 L 53.42 748.42 L 53.42 126.95" fill="#E8EBF5"></path>
            <path d="M 53.42 126.95 L 822.28 126.95 L 822.28 244.85 L 53.42 244.85 L 53.42 126.95" fill="#595959"></path>
            <path d="M 822.28 126.95 L 1430.52 126.95 L 1430.52 244.85 L 822.28 244.85 L 822.28 126.95" fill="#595959"></path>
            <path d="M 53.42 244.85 L 822.28 244.85 L 822.28 307.79 L 53.42 307.79 L 53.42 244.85" fill="#595959"></path>
            <path d="M 822.28 244.85 L 1430.52 244.85 L 1430.52 307.79 L 822.28 307.79 L 822.28 244.85" fill="#595959"></path>
            <path d="M 53.42 307.79 L 822.28 307.79 L 822.28 370.74 L 53.42 370.74 L 53.42 307.79" fill="#595959"></path>
            <path d="M 822.28 307.79 L 1430.52 307.79 L 1430.52 370.74 L 822.28 370.74 L 822.28 307.79" fill="#595959"></path>
            <path d="M 53.42 370.74 L 822.28 370.74 L 822.28 433.69 L 53.42 433.69 L 53.42 370.74" fill="#595959"></path>
            <path d="M 822.28 370.74 L 1430.52 370.74 L 1430.52 433.69 L 822.28 433.69 L 822.28 370.74" fill="#595959"></path>
            <path d="M 53.42 433.69 L 822.28 433.69 L 822.28 559.58 L 53.42 559.58 L 53.42 433.69" fill="#595959"></path>
            <path d="M 822.28 433.69 L 1430.52 433.69 L 1430.52 496.63 L 822.28 496.63 L 822.28 433.69" fill="#595959"></path>
            <path d="M 822.28 496.63 L 1430.52 496.63 L 1430.52 559.58 L 822.28 559.58 L 822.28 496.63" fill="#595959"></path>
            <path d="M 53.42 559.58 L 822.28 559.58 L 822.28 622.53 L 53.42 622.53 L 53.42 559.58" fill="#595959"></path>
            <path d="M 822.28 559.58 L 1430.52 559.58 L 1430.52 622.53 L 822.28 622.53 L 822.28 559.58" fill="#595959"></path>
            <path d="M 53.42 622.53 L 822.28 622.53 L 822.28 685.48 L 53.42 685.48 L 53.42 622.53" fill="#595959"></path>
            <path d="M 822.28 622.53 L 1430.52 622.53 L 1430.52 685.48 L 822.28 685.48 L 822.28 622.53" fill="#595959"></path>
            <path d="M 53.42 685.48 L 822.28 685.48 L 822.28 748.42 L 53.42 748.42 L 53.42 685.48" fill="#595959"></path>
            <path d="M 822.28 685.48 L 1430.52 685.48 L 1430.52 748.42 L 822.28 748.42 L 822.28 685.48" fill="#595959"></path>
            <path d="M 53.42 126.17 L 53.42 749.2" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 822.28 126.17 L 822.28 749.2" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 1430.52 126.17 L 1430.52 749.2" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 126.95 L 1431.3 126.95" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 244.85 L 1431.3 244.85" fill="none" stroke="#FFFFFF" stroke-width="6.25"></path>
            <path d="M 52.64 307.79 L 1431.3 307.79" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 370.74 L 1431.3 370.74" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 433.69 L 1431.3 433.69" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 821.5 496.63 L 1431.3 496.63" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 559.58 L 1431.3 559.58" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 622.53 L 1431.3 622.53" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 685.48 L 1431.3 685.48" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 52.64 748.42 L 1431.3 748.42" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="55.88" y="91.25" font-size="50.0" fill="#002B64" textLength="632.0" lengthAdjust="spacing">The 8 &#8216;Lever&#8217; Efforts In Brief</text>
              <text x="64.36" y="196.71" font-size="29.17" font-weight="700" fill="#FFFFFF" textLength="135.25" lengthAdjust="spacing">Our Aims</text>
              <text x="833.22" y="196.71" font-size="29.17" font-weight="700" fill="#FFFFFF" textLength="231.44" lengthAdjust="spacing">The Profit Lever</text>
              <text x="64.36" y="287.13" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="141.6" lengthAdjust="spacing">Gain their </text>
              <text x="206.04" y="287.13" font-size="29.17" fill="#8DA9DB" textLength="157.41" lengthAdjust="spacing">ATTENTION</text>
              <text x="833.22" y="287.13" font-size="29.17" fill="#A8D08C" textLength="304.56" lengthAdjust="spacing">Number of Foot-traffic</text>
              <text x="64.36" y="350.08" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="187.86" lengthAdjust="spacing">Capture their </text>
              <text x="252.35" y="350.08" font-size="29.17" fill="#8DA9DB" xml:space="preserve" textLength="136.06" lengthAdjust="spacing">INTEREST </text>
              <text x="388.50" y="350.08" font-size="16.67" fill="#FFFFFF" textLength="176.18" lengthAdjust="spacing">(Create Self Relevance)</text>
              <text x="833.22" y="350.08" font-size="29.17" fill="#A8D08C" textLength="288.57" lengthAdjust="spacing">Number of Prospects</text>
              <text x="64.36" y="413.03" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="171.44" lengthAdjust="spacing">Secure their </text>
              <text x="235.88" y="413.03" font-size="29.17" fill="#8DA9DB" textLength="120.52" lengthAdjust="spacing">CUSTOM</text>
              <text x="833.22" y="413.03" font-size="29.17" fill="#FFD966" textLength="302.46" lengthAdjust="spacing">Number of Customers</text>
              <text x="64.36" y="507.45" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="155.11" lengthAdjust="spacing">Keep them </text>
              <text x="219.54" y="507.45" font-size="29.17" fill="#8DA9DB" textLength="225.23" lengthAdjust="spacing">WANTING MORE</text>
              <text x="833.22" y="475.97" font-size="29.17" fill="#FFD966" xml:space="preserve" textLength="351.4" lengthAdjust="spacing">Average Customer Spend </text>
              <text x="833.22" y="538.92" font-size="29.17" fill="#FFD966" textLength="399.79" lengthAdjust="spacing">Average Customer Frequency</text>
              <text x="64.36" y="601.87" font-size="29.17" fill="#8DA9DB" textLength="51.28" lengthAdjust="spacing">Buy</text>
              <text x="115.67" y="601.87" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="224.79" lengthAdjust="spacing"> Materials/Stock </text>
              <text x="340.59" y="601.87" font-size="29.17" fill="#8DA9DB" textLength="126.61" lengthAdjust="spacing">FOR LESS</text>
              <text x="833.22" y="601.87" font-size="29.17" fill="#F4B081" xml:space="preserve" textLength="180.22" lengthAdjust="spacing">Sales Margin </text>
              <text x="64.36" y="664.81" font-size="29.17" fill="#FFFFFF" xml:space="preserve" textLength="112.47" lengthAdjust="spacing">Achieve </text>
              <text x="176.86" y="664.81" font-size="29.17" fill="#8DA9DB" xml:space="preserve" textLength="308.67" lengthAdjust="spacing">BRAND RECOGNITION </text>
              <text x="485.68" y="664.81" font-size="16.67" fill="#FFFFFF" textLength="169.05" lengthAdjust="spacing">(So They Seek Us Out)</text>
              <text x="833.22" y="664.81" font-size="29.17" fill="#F4B081" textLength="275.33" lengthAdjust="spacing">Activity Driven Costs</text>
              <text x="64.36" y="727.76" font-size="29.17" fill="#8DA9DB" textLength="252.0" lengthAdjust="spacing">Reduce SPENDING</text>
              <text x="316.43" y="727.76" font-size="29.17" fill="#FFFFFF" textLength="178.15" lengthAdjust="spacing">/OVERHEADS</text>
              <text x="833.22" y="727.76" font-size="29.17" fill="#F4B081" textLength="325.73" lengthAdjust="spacing">Fixed Costs (Overheads)</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 2) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptThe8ProfitLeversSheet2',

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

<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="(Outbound) Messaging Plan: Outbound Communication Plan">

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

            <path d="M 33.45 108.11 L 1463.5 108.11 L 1463.5 814.67 L 33.45 814.67 L 33.45 108.11" fill="#FFFFFF"></path>
            <path d="M 33.45 108.11 L 319.46 108.11 L 319.46 176.72 L 33.45 176.72 L 33.45 108.11" fill="#3A3838"></path>
            <path d="M 319.46 108.11 L 605.47 108.11 L 605.47 176.72 L 319.46 176.72 L 319.46 108.11" fill="#3A3838"></path>
            <path d="M 605.47 108.11 L 891.48 108.11 L 891.48 176.72 L 605.47 176.72 L 605.47 108.11" fill="#3A3838"></path>
            <path d="M 891.48 108.11 L 1177.49 108.11 L 1177.49 176.72 L 891.48 176.72 L 891.48 108.11" fill="#3A3838"></path>
            <path d="M 1177.49 108.11 L 1463.5 108.11 L 1463.5 176.72 L 1177.49 176.72 L 1177.49 108.11" fill="#3A3838"></path>
            <path d="M 33.45 176.72 L 319.46 176.72 L 319.46 283.05 L 33.45 283.05 L 33.45 176.72" fill="#002B64"></path>
            <path d="M 319.46 176.72 L 605.47 176.72 L 605.47 283.05 L 319.46 283.05 L 319.46 176.72" fill="#CFE2F3"></path>
            <path d="M 605.47 176.72 L 891.48 176.72 L 891.48 283.05 L 605.47 283.05 L 605.47 176.72" fill="#CFE2F3"></path>
            <path d="M 891.48 176.72 L 1177.49 176.72 L 1177.49 283.05 L 891.48 283.05 L 891.48 176.72" fill="#CFE2F3"></path>
            <path d="M 1177.49 176.72 L 1463.5 176.72 L 1463.5 283.05 L 1177.49 283.05 L 1177.49 176.72" fill="#CFE2F3"></path>
            <path d="M 33.45 283.05 L 319.46 283.05 L 319.46 389.37 L 33.45 389.37 L 33.45 283.05" fill="#002B64"></path>
            <path d="M 33.45 389.37 L 319.46 389.37 L 319.46 495.69 L 33.45 495.69 L 33.45 389.37" fill="#002B64"></path>
            <path d="M 319.46 389.37 L 605.47 389.37 L 605.47 495.69 L 319.46 495.69 L 319.46 389.37" fill="#CFE2F3"></path>
            <path d="M 605.47 389.37 L 891.48 389.37 L 891.48 495.69 L 605.47 495.69 L 605.47 389.37" fill="#CFE2F3"></path>
            <path d="M 891.48 389.37 L 1177.49 389.37 L 1177.49 495.69 L 891.48 495.69 L 891.48 389.37" fill="#CFE2F3"></path>
            <path d="M 1177.49 389.37 L 1463.5 389.37 L 1463.5 495.69 L 1177.49 495.69 L 1177.49 389.37" fill="#CFE2F3"></path>
            <path d="M 33.45 495.69 L 319.46 495.69 L 319.46 602.02 L 33.45 602.02 L 33.45 495.69" fill="#002B64"></path>
            <path d="M 33.45 602.02 L 319.46 602.02 L 319.46 708.34 L 33.45 708.34 L 33.45 602.02" fill="#002B64"></path>
            <path d="M 319.46 602.02 L 605.47 602.02 L 605.47 708.34 L 319.46 708.34 L 319.46 602.02" fill="#CFE2F3"></path>
            <path d="M 605.47 602.02 L 891.48 602.02 L 891.48 708.34 L 605.47 708.34 L 605.47 602.02" fill="#CFE2F3"></path>
            <path d="M 891.48 602.02 L 1177.49 602.02 L 1177.49 708.34 L 891.48 708.34 L 891.48 602.02" fill="#CFE2F3"></path>
            <path d="M 1177.49 602.02 L 1463.5 602.02 L 1463.5 708.34 L 1177.49 708.34 L 1177.49 602.02" fill="#CFE2F3"></path>
            <path d="M 33.45 708.34 L 319.46 708.34 L 319.46 814.67 L 33.45 814.67 L 33.45 708.34" fill="#002B64"></path>
            <path d="M 33.45 175.68 L 33.45 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 319.46 175.68 L 319.46 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 605.47 175.68 L 605.47 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 891.48 175.68 L 891.48 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1177.49 175.68 L 1177.49 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1463.5 175.68 L 1463.5 815.71" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.67 108.11 L 1464.28 108.11" fill="none" stroke="#000000" stroke-width="4.17"></path>
            <path d="M 32.4 176.72 L 1464.54 176.72" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 283.05 L 1464.54 283.05" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 389.37 L 1464.54 389.37" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 495.69 L 1464.54 495.69" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 602.02 L 1464.54 602.02" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 708.34 L 1464.54 708.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 814.67 L 1464.54 814.67" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="44.38" y="81.33" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="750.35" lengthAdjust="spacing">Outbound Communication Plan </text>
              <text x="795.48" y="81.33" font-size="29.17" fill="#002B64" textLength="518.06" lengthAdjust="spacing">(as it relates to your concept domains)</text>
              <text x="44.38" y="134.80" font-size="22.92" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="194.95" lengthAdjust="spacing">Concept Domain </text>
              <text x="44.38" y="158.92" font-size="18.75" font-weight="700" fill="#FFFFFF" textLength="102.24" lengthAdjust="spacing">(examples)</text>
              <text x="330.39" y="134.80" font-size="22.92" font-weight="700" fill="#FFFFFF" textLength="64.05" lengthAdjust="spacing">Video</text>
              <text x="616.41" y="134.80" font-size="22.92" font-weight="700" fill="#FFFFFF" textLength="233.02" lengthAdjust="spacing">Article/Content Post</text>
              <text x="902.42" y="134.80" font-size="22.92" font-weight="700" fill="#FFFFFF" textLength="80.96" lengthAdjust="spacing">Speech</text>
              <text x="1188.43" y="134.80" font-size="22.92" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="177.47" lengthAdjust="spacing">Blog (Opinion – </text>
              <text x="1188.43" y="162.92" font-size="22.92" font-weight="700" fill="#FFFFFF" textLength="120.01" lengthAdjust="spacing">Comment)</text>
              <text x="44.38" y="237.38" font-size="20.83" fill="#FFFFFF" textLength="88.25" lengthAdjust="spacing">Cashflow</text>
              <text x="330.39" y="237.38" font-size="20.83" fill="#000000" textLength="208.6" lengthAdjust="spacing">Working Capital Cycle</text>
              <text x="616.41" y="224.88" font-size="20.83" fill="#000000" xml:space="preserve" textLength="242.88" lengthAdjust="spacing">5 Tips To Managing Your </text>
              <text x="616.41" y="249.88" font-size="20.83" fill="#000000" textLength="97.4" lengthAdjust="spacing">Cash Flow</text>
              <text x="902.42" y="224.88" font-size="20.83" fill="#000000" xml:space="preserve" textLength="241.73" lengthAdjust="spacing">Why Most New Business </text>
              <text x="902.42" y="249.88" font-size="20.83" fill="#000000" textLength="125.37" lengthAdjust="spacing">Ventures Fail</text>
              <text x="1188.43" y="224.88" font-size="20.83" fill="#000000" xml:space="preserve" textLength="268.15" lengthAdjust="spacing">Why Our Education System </text>
              <text x="1188.43" y="249.88" font-size="20.83" fill="#000000" textLength="228.58" lengthAdjust="spacing">is Failing Entrepreneurs</text>
              <text x="44.38" y="343.71" font-size="20.83" fill="#FFFFFF" textLength="151.63" lengthAdjust="spacing">Getting Noticed</text>
              <text x="330.39" y="331.21" font-size="20.83" fill="#000000" xml:space="preserve" textLength="231.46" lengthAdjust="spacing">The Customers Journey </text>
              <text x="330.39" y="356.21" font-size="20.83" fill="#000000" textLength="249.88" lengthAdjust="spacing">from Footpath to Counter</text>
              <text x="616.41" y="343.71" font-size="20.83" fill="#000000" textLength="259.48" lengthAdjust="spacing">Be Yourself To Get Noticed</text>
              <text x="902.42" y="331.21" font-size="20.83" fill="#000000" xml:space="preserve" textLength="247.48" lengthAdjust="spacing">Speaking To Your Market </text>
              <text x="902.42" y="356.21" font-size="20.83" fill="#000000" textLength="248.29" lengthAdjust="spacing">vs. Shouting At The World</text>
              <text x="1188.43" y="331.21" font-size="20.83" fill="#000000" xml:space="preserve" textLength="260.94" lengthAdjust="spacing">When Everybody&#8217;s Talking, </text>
              <text x="1188.43" y="356.21" font-size="20.83" fill="#000000" textLength="159.54" lengthAdjust="spacing">Who&#8217;s Listening?</text>
              <text x="44.38" y="437.53" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="226.92" lengthAdjust="spacing">Getting More From the </text>
              <text x="44.38" y="462.53" font-size="20.83" fill="#FFFFFF" textLength="162.4" lengthAdjust="spacing">Team You&#8217;ve Got</text>
              <text x="330.39" y="437.53" font-size="20.83" fill="#000000" xml:space="preserve" textLength="234.62" lengthAdjust="spacing">The 3 Keys to Employee </text>
              <text x="330.39" y="462.53" font-size="20.83" fill="#000000" textLength="101.92" lengthAdjust="spacing">Happiness</text>
              <text x="616.41" y="437.53" font-size="20.83" fill="#000000" xml:space="preserve" textLength="197.65" lengthAdjust="spacing">Leadership is About </text>
              <text x="616.41" y="462.53" font-size="20.83" fill="#000000" textLength="189.21" lengthAdjust="spacing">Gaining Follow-ship</text>
              <text x="902.42" y="437.53" font-size="20.83" fill="#000000" xml:space="preserve" textLength="170.71" lengthAdjust="spacing">What Does Great </text>
              <text x="902.42" y="462.53" font-size="20.83" fill="#000000" textLength="207.4" lengthAdjust="spacing">Teamwork Look Like?</text>
              <text x="1188.43" y="437.53" font-size="20.83" fill="#000000" xml:space="preserve" textLength="232.21" lengthAdjust="spacing">If We Value Each Other, </text>
              <text x="1188.43" y="462.53" font-size="20.83" fill="#000000" textLength="221.29" lengthAdjust="spacing">Why Don&#8217;t We Show It?</text>
              <text x="44.38" y="543.86" font-size="20.83" fill="#FFFFFF" textLength="164.19" lengthAdjust="spacing">Building Systems</text>
              <text x="44.38" y="568.86" font-size="20.83" fill="#FFFFFF" textLength="129.0" lengthAdjust="spacing">(not a prison)</text>
              <text x="330.39" y="531.36" font-size="20.83" fill="#000000" xml:space="preserve" textLength="218.52" lengthAdjust="spacing">Remove the Blockage, </text>
              <text x="330.39" y="556.36" font-size="20.83" fill="#000000" xml:space="preserve" textLength="180.75" lengthAdjust="spacing">Don&#8217;t increase the </text>
              <text x="330.39" y="581.36" font-size="20.83" fill="#000000" textLength="85.5" lengthAdjust="spacing">Pressure</text>
              <text x="616.41" y="543.86" font-size="20.83" fill="#000000" xml:space="preserve" textLength="252.73" lengthAdjust="spacing">What We Can Learn From </text>
              <text x="616.41" y="568.86" font-size="20.83" fill="#000000" textLength="108.56" lengthAdjust="spacing">McDonalds</text>
              <text x="902.42" y="543.86" font-size="20.83" fill="#000000" xml:space="preserve" textLength="248.0" lengthAdjust="spacing">Why The 80/20 Rule Is 80 </text>
              <text x="902.42" y="568.86" font-size="20.83" fill="#000000" textLength="259.02" lengthAdjust="spacing">Percent Of What You Need</text>
              <text x="1188.43" y="543.86" font-size="20.83" fill="#000000" xml:space="preserve" textLength="251.75" lengthAdjust="spacing">The E-Myth Has Got A Lot </text>
              <text x="1188.43" y="568.86" font-size="20.83" fill="#000000" textLength="155.08" lengthAdjust="spacing">To Answer For...</text>
              <text x="44.38" y="662.68" font-size="20.83" fill="#FFFFFF" textLength="218.48" lengthAdjust="spacing">Aiming for the Summit</text>
              <text x="330.39" y="662.68" font-size="20.83" fill="#000000" textLength="238.56" lengthAdjust="spacing">Knowing What You Want</text>
              <text x="616.41" y="650.18" font-size="20.83" fill="#000000" xml:space="preserve" textLength="202.71" lengthAdjust="spacing">What Stops Us From </text>
              <text x="616.41" y="675.18" font-size="20.83" fill="#000000" textLength="126.04" lengthAdjust="spacing">Aiming High?</text>
              <text x="902.42" y="650.18" font-size="20.83" fill="#000000" xml:space="preserve" textLength="252.44" lengthAdjust="spacing">Critical Lessons From The </text>
              <text x="902.42" y="675.18" font-size="20.83" fill="#000000" textLength="177.33" lengthAdjust="spacing">Marshmallow Test</text>
              <text x="1188.43" y="650.18" font-size="20.83" fill="#000000" xml:space="preserve" textLength="241.79" lengthAdjust="spacing">Got A Dream? Keep It To </text>
              <text x="1188.43" y="675.18" font-size="20.83" fill="#000000" textLength="84.75" lengthAdjust="spacing">Yourself.</text>
              <text x="44.38" y="756.50" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="131.04" lengthAdjust="spacing">Clocking In &amp; </text>
              <text x="44.38" y="781.50" font-size="20.83" fill="#FFFFFF" textLength="122.87" lengthAdjust="spacing">Clocking Out</text>
              <text x="330.39" y="769.00" font-size="20.83" fill="#000000" textLength="171.73" lengthAdjust="spacing">Powerful Self Talk</text>
              <text x="616.41" y="769.00" font-size="20.83" fill="#000000" textLength="199.9" lengthAdjust="spacing">How Habits Are Built</text>
              <text x="902.42" y="744.00" font-size="20.83" fill="#000000" xml:space="preserve" textLength="209.69" lengthAdjust="spacing">What You Do Is More </text>
              <text x="902.42" y="769.00" font-size="20.83" fill="#000000" xml:space="preserve" textLength="261.25" lengthAdjust="spacing">Important Than Your Time </text>
              <text x="902.42" y="794.00" font-size="20.83" fill="#000000" textLength="75.62" lengthAdjust="spacing">To Do It</text>
              <text x="1188.43" y="756.50" font-size="20.83" fill="#000000" xml:space="preserve" textLength="229.46" lengthAdjust="spacing">Is It Only Sports People </text>
              <text x="1188.43" y="781.50" font-size="20.83" fill="#000000" textLength="118.6" lengthAdjust="spacing">That Choke?</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 6) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptOutboundMessagingPlanSheet2',

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

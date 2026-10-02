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

            <path d="M 33.45 110.59 L 1463.5 110.59 L 1463.5 809.3 L 33.45 809.3 L 33.45 110.59" fill="#FFFFFF"></path>
            <path d="M 33.45 110.59 L 319.46 110.59 L 319.46 173.55 L 33.45 173.55 L 33.45 110.59" fill="#3A3838"></path>
            <path d="M 319.46 110.59 L 605.47 110.59 L 605.47 173.55 L 319.46 173.55 L 319.46 110.59" fill="#3A3838"></path>
            <path d="M 605.47 110.59 L 891.48 110.59 L 891.48 173.55 L 605.47 173.55 L 605.47 110.59" fill="#3A3838"></path>
            <path d="M 891.48 110.59 L 1177.49 110.59 L 1177.49 173.55 L 891.48 173.55 L 891.48 110.59" fill="#3A3838"></path>
            <path d="M 1177.49 110.59 L 1463.5 110.59 L 1463.5 173.55 L 1177.49 173.55 L 1177.49 110.59" fill="#3A3838"></path>
            <path d="M 33.45 173.55 L 319.46 173.55 L 319.46 279.51 L 33.45 279.51 L 33.45 173.55" fill="#002B64"></path>
            <path d="M 319.46 173.55 L 605.47 173.55 L 605.47 279.51 L 319.46 279.51 L 319.46 173.55" fill="#CFE2F3"></path>
            <path d="M 605.47 173.55 L 891.48 173.55 L 891.48 279.51 L 605.47 279.51 L 605.47 173.55" fill="#CFE2F3"></path>
            <path d="M 891.48 173.55 L 1177.49 173.55 L 1177.49 279.51 L 891.48 279.51 L 891.48 173.55" fill="#CFE2F3"></path>
            <path d="M 1177.49 173.55 L 1463.5 173.55 L 1463.5 279.51 L 1177.49 279.51 L 1177.49 173.55" fill="#CFE2F3"></path>
            <path d="M 33.45 279.51 L 319.46 279.51 L 319.46 385.47 L 33.45 385.47 L 33.45 279.51" fill="#002B64"></path>
            <path d="M 33.45 385.47 L 319.46 385.47 L 319.46 491.43 L 33.45 491.43 L 33.45 385.47" fill="#002B64"></path>
            <path d="M 319.46 385.47 L 605.47 385.47 L 605.47 491.43 L 319.46 491.43 L 319.46 385.47" fill="#CFE2F3"></path>
            <path d="M 605.47 385.47 L 891.48 385.47 L 891.48 491.43 L 605.47 491.43 L 605.47 385.47" fill="#CFE2F3"></path>
            <path d="M 891.48 385.47 L 1177.49 385.47 L 1177.49 491.43 L 891.48 491.43 L 891.48 385.47" fill="#CFE2F3"></path>
            <path d="M 1177.49 385.47 L 1463.5 385.47 L 1463.5 491.43 L 1177.49 491.43 L 1177.49 385.47" fill="#CFE2F3"></path>
            <path d="M 33.45 491.43 L 319.46 491.43 L 319.46 597.38 L 33.45 597.38 L 33.45 491.43" fill="#002B64"></path>
            <path d="M 33.45 597.38 L 319.46 597.38 L 319.46 703.34 L 33.45 703.34 L 33.45 597.38" fill="#002B64"></path>
            <path d="M 319.46 597.38 L 605.47 597.38 L 605.47 703.34 L 319.46 703.34 L 319.46 597.38" fill="#CFE2F3"></path>
            <path d="M 605.47 597.38 L 891.48 597.38 L 891.48 703.34 L 605.47 703.34 L 605.47 597.38" fill="#CFE2F3"></path>
            <path d="M 891.48 597.38 L 1177.49 597.38 L 1177.49 703.34 L 891.48 703.34 L 891.48 597.38" fill="#CFE2F3"></path>
            <path d="M 1177.49 597.38 L 1463.5 597.38 L 1463.5 703.34 L 1177.49 703.34 L 1177.49 597.38" fill="#CFE2F3"></path>
            <path d="M 33.45 703.34 L 319.46 703.34 L 319.46 809.3 L 33.45 809.3 L 33.45 703.34" fill="#002B64"></path>
            <path d="M 33.45 172.51 L 33.45 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 319.46 172.51 L 319.46 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 605.47 172.51 L 605.47 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 891.48 172.51 L 891.48 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1177.49 172.51 L 1177.49 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1463.5 172.51 L 1463.5 810.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.67 110.59 L 1464.28 110.59" fill="none" stroke="#000000" stroke-width="4.17"></path>
            <path d="M 32.4 173.55 L 1464.54 173.55" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 279.51 L 1464.54 279.51" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 385.47 L 1464.54 385.47" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 491.43 L 1464.54 491.43" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 597.38 L 1464.54 597.38" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 703.34 L 1464.54 703.34" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 32.4 809.3 L 1464.54 809.3" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="44.38" y="82.58" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="750.35" lengthAdjust="spacing">Outbound Communication Plan </text>
              <text x="795.48" y="82.58" font-size="29.17" fill="#002B64" textLength="518.06" lengthAdjust="spacing">(as it relates to your concept domains)</text>
              <text x="44.38" y="135.28" font-size="20.83" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="177.23" lengthAdjust="spacing">Concept Domain </text>
              <text x="44.38" y="156.28" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="90.88" lengthAdjust="spacing">(examples)</text>
              <text x="330.39" y="135.28" font-size="20.83" font-weight="700" fill="#FFFFFF" textLength="58.23" lengthAdjust="spacing">Video</text>
              <text x="616.41" y="135.28" font-size="20.83" font-weight="700" fill="#FFFFFF" textLength="211.83" lengthAdjust="spacing">Article/Content Post</text>
              <text x="902.42" y="135.28" font-size="20.83" font-weight="700" fill="#FFFFFF" textLength="73.6" lengthAdjust="spacing">Speech</text>
              <text x="1188.43" y="135.28" font-size="20.83" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="161.33" lengthAdjust="spacing">Blog (Opinion – </text>
              <text x="1188.43" y="160.28" font-size="20.83" font-weight="700" fill="#FFFFFF" textLength="109.1" lengthAdjust="spacing">Comment)</text>
              <text x="44.38" y="234.03" font-size="20.83" fill="#FFFFFF" textLength="88.25" lengthAdjust="spacing">Cashflow</text>
              <text x="330.39" y="233.59" font-size="18.75" fill="#000000" textLength="38.53" lengthAdjust="spacing">June</text>
              <text x="616.41" y="233.59" font-size="18.75" fill="#000000" textLength="30.62" lengthAdjust="spacing">July</text>
              <text x="902.42" y="233.59" font-size="18.75" fill="#000000" textLength="60.6" lengthAdjust="spacing">August</text>
              <text x="1188.43" y="233.59" font-size="18.75" fill="#000000" textLength="71.12" lengthAdjust="spacing">October</text>
              <text x="44.38" y="339.99" font-size="20.83" fill="#FFFFFF" textLength="151.63" lengthAdjust="spacing">Getting Noticed</text>
              <text x="616.41" y="339.55" font-size="18.75" fill="#000000" textLength="96.41" lengthAdjust="spacing">September</text>
              <text x="1188.43" y="339.55" font-size="18.75" fill="#000000" textLength="71.12" lengthAdjust="spacing">October</text>
              <text x="44.38" y="433.45" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="226.92" lengthAdjust="spacing">Getting More From the </text>
              <text x="44.38" y="458.45" font-size="20.83" fill="#FFFFFF" textLength="162.4" lengthAdjust="spacing">Team You&#8217;ve Got</text>
              <text x="330.39" y="445.51" font-size="18.75" fill="#000000" textLength="60.6" lengthAdjust="spacing">August</text>
              <text x="616.41" y="445.51" font-size="18.75" fill="#000000" textLength="96.41" lengthAdjust="spacing">September</text>
              <text x="902.42" y="445.51" font-size="18.75" fill="#000000" textLength="92.21" lengthAdjust="spacing">November</text>
              <text x="1188.43" y="445.51" font-size="18.75" fill="#000000" textLength="65.85" lengthAdjust="spacing">January</text>
              <text x="44.38" y="539.40" font-size="20.83" fill="#FFFFFF" textLength="164.19" lengthAdjust="spacing">Building Systems</text>
              <text x="44.38" y="564.40" font-size="20.83" fill="#FFFFFF" textLength="129.0" lengthAdjust="spacing">(not a prison)</text>
              <text x="616.41" y="551.47" font-size="18.75" fill="#000000" textLength="90.58" lengthAdjust="spacing">December</text>
              <text x="902.42" y="551.47" font-size="18.75" fill="#000000" textLength="78.23" lengthAdjust="spacing">February</text>
              <text x="44.38" y="657.86" font-size="20.83" fill="#FFFFFF" textLength="218.48" lengthAdjust="spacing">Aiming for the Summit</text>
              <text x="330.39" y="657.43" font-size="18.75" fill="#000000" textLength="78.23" lengthAdjust="spacing">February</text>
              <text x="616.41" y="657.43" font-size="18.75" fill="#000000" textLength="55.39" lengthAdjust="spacing">March</text>
              <text x="902.42" y="657.43" font-size="18.75" fill="#000000" textLength="40.41" lengthAdjust="spacing">April</text>
              <text x="1188.43" y="657.43" font-size="18.75" fill="#000000" textLength="36.64" lengthAdjust="spacing">May</text>
              <text x="44.38" y="751.32" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="131.04" lengthAdjust="spacing">Clocking In &amp; </text>
              <text x="44.38" y="776.32" font-size="20.83" fill="#FFFFFF" textLength="122.87" lengthAdjust="spacing">Clocking Out</text>
              <text x="1188.43" y="763.38" font-size="18.75" fill="#000000" textLength="55.39" lengthAdjust="spacing">March</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 7) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptOutboundMessagingPlanSheet3',

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

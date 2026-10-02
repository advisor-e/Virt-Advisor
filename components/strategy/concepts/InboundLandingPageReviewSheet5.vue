<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="(Inbound) Landing Page Review: Designing Your Landing Page -4">

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

            <path d="M 56.88 49.9 L 790.35 49.9 L 790.35 103.9 L 56.88 103.9 L 56.88 49.9" fill="#00FF00"></path>
            <path d="M 46.25 187.28 L 178.05 187.28 L 178.05 254.97 L 46.25 254.97 L 46.25 187.28" fill="#00FFCC"></path>
            <path d="M 178.05 187.28 L 458.58 187.28 L 458.58 254.97 L 178.05 254.97 L 178.05 187.28" fill="#002B64"></path>
            <path d="M 458.58 187.28 L 955.65 187.28 L 955.65 254.97 L 458.58 254.97 L 458.58 187.28" fill="#002B64"></path>
            <path d="M 955.65 187.28 L 1452.72 187.28 L 1452.72 254.97 L 955.65 254.97 L 955.65 187.28" fill="#002B64"></path>
            <path d="M 46.25 254.97 L 178.05 254.97 L 178.05 356.5 L 46.25 356.5 L 46.25 254.97" fill="#434343"></path>
            <path d="M 178.05 254.97 L 458.58 254.97 L 458.58 356.5 L 178.05 356.5 L 178.05 254.97" fill="#434343"></path>
            <path d="M 458.58 254.97 L 955.65 254.97 L 955.65 356.5 L 458.58 356.5 L 458.58 254.97" fill="#434343"></path>
            <path d="M 955.65 254.97 L 1452.72 254.97 L 1452.72 356.5 L 955.65 356.5 L 955.65 254.97" fill="#434343"></path>
            <path d="M 46.25 186.5 L 46.25 357.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 178.05 186.5 L 178.05 357.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 458.58 186.5 L 458.58 357.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 955.65 186.5 L 955.65 357.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1452.72 186.5 L 1452.72 357.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 187.28 L 1453.5 187.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 254.97 L 1453.5 254.97" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 356.5 L 1453.5 356.5" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 46.25 432.34 L 178.05 432.34 L 178.05 500.02 L 46.25 500.02 L 46.25 432.34" fill="#31538F"></path>
            <path d="M 178.05 432.34 L 458.58 432.34 L 458.58 500.02 L 178.05 500.02 L 178.05 432.34" fill="#002B64"></path>
            <path d="M 458.58 432.34 L 955.65 432.34 L 955.65 500.02 L 458.58 500.02 L 458.58 432.34" fill="#002B64"></path>
            <path d="M 955.65 432.34 L 1452.72 432.34 L 1452.72 500.02 L 955.65 500.02 L 955.65 432.34" fill="#002B64"></path>
            <path d="M 46.25 500.02 L 178.05 500.02 L 178.05 601.56 L 46.25 601.56 L 46.25 500.02" fill="#434343"></path>
            <path d="M 178.05 500.02 L 458.58 500.02 L 458.58 601.56 L 178.05 601.56 L 178.05 500.02" fill="#434343"></path>
            <path d="M 458.58 500.02 L 955.65 500.02 L 955.65 601.56 L 458.58 601.56 L 458.58 500.02" fill="#434343"></path>
            <path d="M 955.65 500.02 L 1452.72 500.02 L 1452.72 601.56 L 955.65 601.56 L 955.65 500.02" fill="#434343"></path>
            <path d="M 46.25 431.56 L 46.25 602.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 178.05 431.56 L 178.05 602.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 458.58 431.56 L 458.58 602.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 955.65 431.56 L 955.65 602.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1452.72 431.56 L 1452.72 602.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 432.34 L 1453.5 432.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 500.02 L 1453.5 500.02" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 601.56 L 1453.5 601.56" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="56.88" y="93.10" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="746.42" lengthAdjust="spacing">Designing Your Landing Page -4 </text>
              <text x="60.31" y="213.53" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 7</text>
              <text x="192.12" y="213.53" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="472.64" y="213.53" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="969.71" y="213.53" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="60.31" y="281.22" font-size="20.83" fill="#FFFFFF" textLength="67.6" lengthAdjust="spacing">Widget</text>
              <text x="192.12" y="279.22" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="241.18" lengthAdjust="spacing">I&#8217;ve seen enough, what do I </text>
              <text x="192.12" y="301.72" font-size="18.75" fill="#FFFFFF" textLength="72.94" lengthAdjust="spacing">do now?</text>
              <text x="472.64" y="279.22" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="463.56" lengthAdjust="spacing">Call to Action (CTA) button - take them to 1st stage in </text>
              <text x="472.64" y="301.72" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="156.21" lengthAdjust="spacing">our sales process </text>
              <text x="969.71" y="279.22" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="471.38" lengthAdjust="spacing">Call to Action (CTA) button - linking to &#8216;free taste test&#8217; - </text>
              <text x="969.71" y="301.72" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="379.03" lengthAdjust="spacing">give their name, cell ph number &amp; address. </text>
              <text x="60.31" y="458.59" font-size="20.83" fill="#FFFFFF" textLength="88.33" lengthAdjust="spacing">Section 8</text>
              <text x="192.11" y="458.59" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="472.64" y="458.59" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="969.71" y="458.59" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="60.31" y="526.27" font-size="20.83" fill="#FFFFFF" textLength="63.4" lengthAdjust="spacing">Footer</text>
              <text x="192.11" y="524.27" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="236.98" lengthAdjust="spacing">How do I get hold if you if I </text>
              <text x="192.11" y="546.77" font-size="18.75" fill="#FFFFFF" textLength="74.87" lengthAdjust="spacing">need to?</text>
              <text x="472.64" y="524.27" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="429.0" lengthAdjust="spacing">How you can get hold of us if you have any other </text>
              <text x="472.64" y="546.77" font-size="18.75" fill="#FFFFFF" textLength="366.94" lengthAdjust="spacing">questions / provide social media backlinks</text>
              <text x="969.71" y="524.27" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="426.45" lengthAdjust="spacing">Company Entity Name, Phone Number, address, </text>
              <text x="969.71" y="546.77" font-size="18.75" fill="#FFFFFF" textLength="216.0" lengthAdjust="spacing">email, social media icons</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 11) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptInboundLandingPageReviewSheet5',

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

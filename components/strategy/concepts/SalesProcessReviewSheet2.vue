<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Sales Process Review: The (Honey &amp; Mumford) 4 Processing Styles">

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
              <text x="55.88" y="95.45" font-size="50.0" fill="#002B64" textLength="1013.6" lengthAdjust="spacing">The (Honey &amp; Mumford) 4 Processing Styles</text>
              <text x="55.89" y="160.51" font-size="22.92" fill="#002B64" textLength="100.7" lengthAdjust="spacing">1. Activist</text>
              <text x="130.89" y="208.43" font-size="22.92" fill="#434343" textLength="1298.82" lengthAdjust="spacing">Impulsive, Quick to decide: &#8220;I like it, I want it now&#8221;. They interested in sequence of ACTION - explain the &#8216;steps to purchase&#8217;.</text>
              <text x="55.89" y="256.86" font-size="22.92" fill="#002B64" textLength="140.2" lengthAdjust="spacing">2. Pragmatist</text>
              <text x="130.89" y="305.30" font-size="22.92" fill="#434343" textLength="1193.8" lengthAdjust="spacing">Emotive but want reassurance; they seek PROOF - provide data, testimonials, statistics, case study examples etc.</text>
              <text x="55.89" y="353.74" font-size="22.92" fill="#002B64" textLength="120.61" lengthAdjust="spacing">3. Reflector</text>
              <text x="130.89" y="402.18" font-size="22.92" fill="#434343" textLength="1248.75" lengthAdjust="spacing">They need TIME; making decisions disturb them emotionally so they need to withdraw and work through the process.</text>
              <text x="55.89" y="450.61" font-size="22.92" fill="#002B64" textLength="112.5" lengthAdjust="spacing">4. Theorist</text>
              <text x="130.89" y="499.05" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1316.88" lengthAdjust="spacing">They need to CONTRIBUTE; allow them to voice their thoughts and ideas on the solution and the purchase/ delivery/ </text>
              <text x="55.89" y="530.82" font-size="22.92" fill="#434343" textLength="1361.46" lengthAdjust="spacing">installation process. Explain the areas that are &#8216;not open to variance&#8217; but invite them to &#8216;help get the best outcome for everyone&#8217;.</text>
              <text x="55.89" y="620.93" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1391.8" lengthAdjust="spacing">The &#8216;trick&#8217; is not to attempt to guess the person&#8217;s dominant processing style but rather, to DESIGN a sales process that considers </text>
              <text x="55.89" y="652.70" font-size="22.92" fill="#434343" textLength="1120.51" lengthAdjust="spacing">the processing / decision needs of the customer and make the process ALLOW for each style - every time.</text>
              <text x="55.89" y="700.61" font-size="22.92" fill="#434343" xml:space="preserve" textLength="1392.05" lengthAdjust="spacing">This makes life far easier for both the salesperson AND the customer as predictable tensions can be avoided, and &#8216;buyers </text>
              <text x="55.89" y="732.38" font-size="22.92" fill="#434343" textLength="968.27" lengthAdjust="spacing">remorse&#8217; significantly reduced, simply by letting people decide in a manner that suits them.</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 12) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptSalesProcessReviewSheet2',

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

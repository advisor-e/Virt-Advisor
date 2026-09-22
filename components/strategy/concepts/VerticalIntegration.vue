<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Vertical Integration: seven steps from owning the land up to retail experience, with arrows showing the direction of integration.">
            <rect width="1500" height="844" fill="#fff"></rect>
            <text x="33.2" y="83.8" font-family="Open Sans, sans-serif" font-size="50" fill="#002B64">Vertical Integration <tspan font-size="29.2" fill="#23405f">(Considerations)</tspan></text>

            <!-- His two arrows, #33CCFF, 88.6 wide -->
            <g fill="#33CCFF" stroke="#31538F" stroke-width="1.5">
              <path d="M292.6 147.3 l44.3 53.2 h-22.1 v79.7 h-44.3 v-79.7 h-22.1 z"></path>
              <path d="M292.6 586.8 l44.3 -53.2 h-22.1 v-79.7 h-44.3 v79.7 h-22.1 z"></path>
            </g>

            <!-- Seven steps. x456.8, w407.5, h70.9, rounded, stroke #31538F, fill #CCD5FF -->
            <g fill="#CCD5FF" stroke="#31538F" stroke-width="2">
              <rect x="456.2" y="111.8" width="407.5" height="70.9" rx="10"></rect>
              <rect x="456.8" y="203.6" width="407.5" height="70.9" rx="10"></rect>
              <rect x="456.8" y="297.8" width="407.5" height="70.9" rx="10"></rect>
              <rect x="456.9" y="401.1" width="407.5" height="70.9" rx="10"></rect>
              <rect x="458.0" y="501.6" width="407.5" height="70.9" rx="10"></rect>
              <rect x="458.0" y="607.9" width="407.5" height="70.9" rx="10"></rect>
              <rect x="460.6" y="719.2" width="407.5" height="70.9" rx="10"></rect>
            </g>

            <text x="480.1" y="156.8" font-family="Open Sans, sans-serif" font-size="27.1"
                  font-weight="700" fill="#000">Retail (Experience) the Tea</text>
            <g font-family="Carlito, Calibri, sans-serif" font-size="29.2" font-weight="700" fill="#000">
              <text x="494.2" y="249.9">Retail (Distribution) the Tea</text>
              <text x="493.2" y="344.1">Market (Wholesale) the Tea</text>
              <text x="578.6" y="447.4">Blend the Tea</text>
              <text x="568.8" y="547.9">Process the Tea</text>
              <text x="581.5" y="654.2">Grow the Tea</text>
              <text x="582.6" y="765.4">Own the land</text>
            </g>

            <g font-family="Open Sans, sans-serif" font-size="29.2" fill="#434343">
              <text x="920.4" y="157.2">Cafe (Franchise or Direct)</text>
              <text x="921.9" y="247.3">Supermarkets, Dairies</text>
            </g>

            <g font-family="Open Sans, sans-serif" font-size="25" font-weight="700" fill="#002B64">
              <text x="176.9" y="338.3">Are you looking to</text>
              <text x="184.7" y="368.0">Secure Margin or</text>
              <text x="238.8" y="397.7">Quality?</text>
            </g>

            <!-- The box is sized to the text it holds: his lines run 540.9 wide from
                 x904.8, so it must clear x1445.7. Drawn at 520 wide first, it cut the
                 longest line in half - caught by putting it beside his page. -->
            <rect x="886" y="288" width="578" height="404" fill="none" stroke="#31538F" stroke-width="2" rx="4"></rect>
            <g font-family="Open Sans, sans-serif" font-size="22.9" fill="#434343" lengthAdjust="spacing">
              <text x="904.8" y="322.6" textLength="540.9">Consider the options of Vertical or Horizontal</text>
              <text x="904.8" y="350.7" textLength="518.4">Integration from the perspective of an &#8216;Investor&#8217;.</text>
              <text x="904.8" y="407.0" textLength="540.7">That is to say, the extra business process should</text>
              <text x="904.8" y="435.1" textLength="540.9">represent an opportunity to generate profits, by</text>
              <text x="904.8" y="463.2" textLength="257.8">that activity, in isolation.</text>
              <text x="904.8" y="519.5" textLength="540.8">(Be careful; in your attempts to secure extra</text>
              <text x="904.8" y="547.6" textLength="540.9">margin or control by absorbing an additional</text>
              <text x="904.8" y="575.7" textLength="540.8">piece of your supply to distribution chain, you</text>
              <text x="904.8" y="603.9" textLength="540.9">may well inherit a &#8216;profit centre&#8217; that simply isn&#8217;t</text>
              <text x="904.8" y="632.0" textLength="540.8">feasible based on the volume you require to run</text>
              <text x="904.8" y="660.1" textLength="215.4">your &#8216;core business&#8217;)</text>
            </g>

            <g class="firm-mark">

              <image class="fm-logo" x="68" y="768" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="90" cy="790" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="90" y="798" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="124" y="797" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>
            <rect class="firm-border" x="5" y="5" width="1490" height="834" rx="8" fill="none" :stroke="firmColour" stroke-width="10"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-batch-1.html (drawing 4) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptVerticalIntegration',

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

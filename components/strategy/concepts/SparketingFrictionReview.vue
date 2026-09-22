<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Sparketing (Friction) Review">
            <g font-family="Open Sans, sans-serif">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <path d="M 402.48 440.03 L 498.74 440.03 L 498.74 441.91 L 402.48 441.91 L 402.48 440.03 Z" fill="#434343" fill-rule="evenodd"></path>
            <text x="56.9" y="100.3" font-size="50.0" fill="#002b64" textLength="248.5" lengthAdjust="spacing">Sparketing</text>
            <text x="56.9" y="171.3" font-size="22.9" fill="#002b64" textLength="143.3" lengthAdjust="spacing">Sales Process</text>
            <text x="56.9" y="213.0" font-size="22.9" fill="#002b64" textLength="162.6" lengthAdjust="spacing">Product Design</text>
            <text x="56.9" y="255.1" font-size="22.9" fill="#002b64" textLength="292.3" lengthAdjust="spacing">Market Message / Branding</text>
            <text x="56.9" y="336.6" font-size="20.8" fill="#434343" textLength="1379.8" lengthAdjust="spacing">By considering the SALES PROCESS you acknowledge the decision points that a salesperson is required to facilitate on behalf of the customer;</text>
            <text x="56.9" y="365.2" font-size="20.8" fill="#434343" textLength="717.9" lengthAdjust="spacing">you can then review how best to deliver this (Face to Face or via Skype etc)</text>
            <text x="56.9" y="410.0" font-size="20.8" fill="#434343" textLength="1380.0" lengthAdjust="spacing">This provides INSIGHT into the greatest DECISION FRICTIONS facing your customer (since if there was no friction, they would simply purchase</text>
            <text x="56.9" y="438.7" font-size="20.8" fill="#434343" textLength="1078.3" lengthAdjust="spacing">online with ease) Try to identify the TRIGGERS that lead customers to overcome their purchasing fears / friction.</text>
            <text x="56.9" y="528.8" font-size="20.8" fill="#434343" textLength="1379.8" lengthAdjust="spacing">Review the MAIN FRICTIONS to determine if your product or service can be modified (in any way) to REDUCE or ELIMINATE these issues.</text>
            <text x="56.9" y="557.4" font-size="20.8" fill="#434343" textLength="1379.7" lengthAdjust="spacing">Explore the ‘general market understanding’ of your product or service; is it LACK OF *EDUCATION that’s causing the key frictions? (*education</text>
            <text x="56.9" y="585.6" font-size="20.8" fill="#434343" textLength="487.4" lengthAdjust="spacing">as it relates to the need / benefits of your product)</text>
            <text x="56.9" y="675.7" font-size="20.8" fill="#434343" textLength="1380.1" lengthAdjust="spacing">Finally, assess your current marketing statements to see if they INCREASE or REDUCE the purchasing frustrations of your target customer. Do</text>
            <text x="56.9" y="704.3" font-size="20.8" fill="#434343" textLength="605.0" lengthAdjust="spacing">they explain what your product / service ACHIEVES FOR THEM?</text>
            <text x="56.9" y="749.1" font-size="20.8" fill="#434343" textLength="496.3" lengthAdjust="spacing">Are your statements CONCISE and void of JARGON?</text>
            <text x="974.9" y="79.5" font-size="16.7" fill="#002b64" font-weight="700" textLength="153.3" lengthAdjust="spacing">5 Drivers of Habits</text>
            <text x="647.5" y="114.9" font-size="16.7" fill="#002b64" font-weight="700" textLength="65.2" lengthAdjust="spacing">Reason:</text>
            <text x="872.5" y="114.9" font-size="16.7" fill="#002b64" textLength="153.7" lengthAdjust="spacing">(Global perspective)</text>
            <text x="647.5" y="149.3" font-size="16.7" fill="#002b64" font-weight="700" textLength="63.2" lengthAdjust="spacing">Trigger:</text>
            <text x="872.5" y="149.3" font-size="16.7" fill="#002b64" textLength="295.4" lengthAdjust="spacing">(Localised / ‘Self Relevant’ perspective)</text>
            <text x="647.5" y="183.7" font-size="16.7" fill="#002b64" font-weight="700" textLength="102.0" lengthAdjust="spacing">Micro Habit:</text>
            <text x="872.5" y="183.7" font-size="16.7" fill="#002b64" textLength="571.4" lengthAdjust="spacing">(Small change consistent with success but not seen as too risky or painful)</text>
            <text x="647.5" y="218.0" font-size="16.7" fill="#002b64" font-weight="700" textLength="148.7" lengthAdjust="spacing">Effective Practice:</text>
            <text x="872.5" y="218.0" font-size="16.7" fill="#002b64" textLength="244.8" lengthAdjust="spacing">(Repetition of micro-habit when</text>
            <text x="1122.2" y="218.0" font-size="16.7" fill="#002b64" font-weight="700" textLength="88.3" lengthAdjust="spacing">associated</text>
            <text x="1215.4" y="218.0" font-size="16.7" fill="#002b64" textLength="180.0" lengthAdjust="spacing">to trigger environment)</text>
            <text x="647.5" y="252.4" font-size="16.7" fill="#002b64" font-weight="700" textLength="41.3" lengthAdjust="spacing">Plan:</text>
            <text x="872.5" y="252.4" font-size="16.7" fill="#002b64" textLength="490.3" lengthAdjust="spacing">(Global perspective of on-going management ‘in the real world’)</text>
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
 * Lifted from design/mockups/strategy-concept-batch-5.html (drawing 7) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptSparketingFrictionReview',

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

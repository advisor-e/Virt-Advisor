<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="(Inbound) Landing Page Review: Designing Your Landing Page -1">

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

            <path d="M 56.88 44.88 L 790.35 44.88 L 790.35 98.88 L 56.88 98.88 L 56.88 44.88" fill="#00FF00"></path>
            <path d="M 44.0 209.0 L 175.81 209.0 L 175.81 248.98 L 44.0 248.98 L 44.0 209.0" fill="#CCCC00"></path>
            <path d="M 175.81 209.0 L 456.33 209.0 L 456.33 248.98 L 175.81 248.98 L 175.81 209.0" fill="#002B64"></path>
            <path d="M 456.33 209.0 L 953.4 209.0 L 953.4 248.98 L 456.33 248.98 L 456.33 209.0" fill="#002B64"></path>
            <path d="M 953.4 209.0 L 1450.47 209.0 L 1450.47 248.98 L 953.4 248.98 L 953.4 209.0" fill="#002B64"></path>
            <path d="M 44.0 248.98 L 175.81 248.98 L 175.81 308.98 L 44.0 308.98 L 44.0 248.98" fill="#434343"></path>
            <path d="M 175.81 248.98 L 456.33 248.98 L 456.33 308.98 L 175.81 308.98 L 175.81 248.98" fill="#BBD6EE"></path>
            <path d="M 44.0 308.98 L 175.81 308.98 L 175.81 372.34 L 44.0 372.34 L 44.0 308.98" fill="#434343"></path>
            <path d="M 175.81 308.98 L 456.33 308.98 L 456.33 372.34 L 175.81 372.34 L 175.81 308.98" fill="#BBD6EE"></path>
            <path d="M 44.0 372.34 L 175.81 372.34 L 175.81 432.33 L 44.0 432.33 L 44.0 372.34" fill="#434343"></path>
            <path d="M 175.81 372.34 L 456.33 372.34 L 456.33 432.33 L 175.81 432.33 L 175.81 372.34" fill="#BBD6EE"></path>
            <path d="M 44.0 432.33 L 175.81 432.33 L 175.81 492.32 L 44.0 492.32 L 44.0 432.33" fill="#3F3F3F"></path>
            <path d="M 175.81 432.33 L 456.33 432.33 L 456.33 492.32 L 175.81 492.32 L 175.81 432.33" fill="#3F3F3F"></path>
            <path d="M 456.33 432.33 L 953.4 432.33 L 953.4 492.32 L 456.33 492.32 L 456.33 432.33" fill="#3F3F3F"></path>
            <path d="M 953.4 432.33 L 1450.47 432.33 L 1450.47 492.32 L 953.4 492.32 L 953.4 432.33" fill="#3F3F3F"></path>
            <path d="M 44.0 208.22 L 44.0 493.1" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 175.81 208.22 L 175.81 493.1" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 456.33 208.22 L 456.33 493.1" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 953.4 208.22 L 953.4 493.1" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1450.47 208.22 L 1450.47 493.1" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 209.0 L 1451.25 209.0" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 248.98 L 1451.25 248.98" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 308.98 L 1451.25 308.98" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 372.34 L 1451.25 372.34" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 432.33 L 1451.25 432.33" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 43.22 492.32 L 1451.25 492.32" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.94 123.53 L 1447.44 123.53 L 1447.44 198.52 L 45.94 198.52 L 45.94 123.53" fill="#00B1E0"></path>
            <path d="M 45.94 122.75 L 45.94 199.3" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1447.44 122.75 L 1447.44 199.3" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.16 123.53 L 1448.22 123.53" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.16 198.52 L 1448.22 198.52" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 46.25 506.98 L 178.05 506.98 L 178.05 551.94 L 46.25 551.94 L 46.25 506.98" fill="#00FF00"></path>
            <path d="M 178.05 506.98 L 458.58 506.98 L 458.58 551.94 L 178.05 551.94 L 178.05 506.98" fill="#002B64"></path>
            <path d="M 458.58 506.98 L 955.65 506.98 L 955.65 551.94 L 458.58 551.94 L 458.58 506.98" fill="#002B64"></path>
            <path d="M 955.65 506.98 L 1452.72 506.98 L 1452.72 551.94 L 955.65 551.94 L 955.65 506.98" fill="#002B64"></path>
            <path d="M 46.25 551.94 L 178.05 551.94 L 178.05 707.55 L 46.25 707.55 L 46.25 551.94" fill="#434343"></path>
            <path d="M 178.05 551.94 L 458.58 551.94 L 458.58 707.55 L 178.05 707.55 L 178.05 551.94" fill="#BBD6EE"></path>
            <path d="M 46.25 707.55 L 178.05 707.55 L 178.05 815.5 L 46.25 815.5 L 46.25 707.55" fill="#434343"></path>
            <path d="M 178.05 707.55 L 458.58 707.55 L 458.58 815.5 L 178.05 815.5 L 178.05 707.55" fill="#BBD6EE"></path>
            <path d="M 46.25 506.2 L 46.25 816.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 178.05 506.2 L 178.05 816.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 458.58 506.2 L 458.58 816.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 955.65 506.2 L 955.65 816.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1452.72 506.2 L 1452.72 816.28" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 506.98 L 1453.5 506.98" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 551.94 L 1453.5 551.94" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 707.55 L 1453.5 707.55" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 815.5 L 1453.5 815.5" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="56.88" y="88.08" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="746.42" lengthAdjust="spacing">Designing Your Landing Page -1 </text>
              <text x="58.06" y="235.25" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 1</text>
              <text x="189.87" y="235.25" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="470.39" y="235.25" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="967.46" y="235.25" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="58.06" y="275.23" font-size="20.83" fill="#FFFFFF" textLength="41.06" lengthAdjust="spacing">Title</text>
              <text x="189.87" y="273.23" font-size="18.75" fill="#000000" textLength="217.07" lengthAdjust="spacing">What can you do for me?</text>
              <text x="470.39" y="273.23" font-size="18.75" fill="#000000" xml:space="preserve" textLength="423.69" lengthAdjust="spacing">Grab attention with 1 big promise and attractive </text>
              <text x="470.39" y="295.73" font-size="18.75" fill="#000000" textLength="336.81" lengthAdjust="spacing">graphics that depict customer success.</text>
              <text x="967.46" y="273.23" font-size="18.75" fill="#000000" textLength="308.7" lengthAdjust="spacing">Lose Weight As You Eat Doughnuts!</text>
              <text x="58.06" y="335.23" font-size="20.83" fill="#FFFFFF" textLength="73.94" lengthAdjust="spacing">Subtitle</text>
              <text x="189.87" y="333.23" font-size="18.75" fill="#000000" xml:space="preserve" textLength="241.73" lengthAdjust="spacing">What did you just promise? </text>
              <text x="189.87" y="359.10" font-size="18.75" fill="#000000" textLength="186.58" lengthAdjust="spacing">Did I read that right??</text>
              <text x="470.39" y="333.23" font-size="18.75" fill="#000000" textLength="426.64" lengthAdjust="spacing">Support the promise with a &#8216;tiny&#8217; bit of expansion</text>
              <text x="967.46" y="333.23" font-size="18.75" fill="#000000" textLength="458.66" lengthAdjust="spacing">You&#8217;ve never had so much fun losing weight before...</text>
              <text x="58.06" y="398.59" font-size="20.83" fill="#FFFFFF" textLength="95.96" lengthAdjust="spacing">Text Body</text>
              <text x="189.87" y="396.59" font-size="18.75" fill="#000000" xml:space="preserve" textLength="201.21" lengthAdjust="spacing">Sounds good but what </text>
              <text x="189.87" y="419.09" font-size="18.75" fill="#000000" textLength="229.16" lengthAdjust="spacing">exactly will this do for me?</text>
              <text x="470.39" y="396.59" font-size="18.75" fill="#000000" xml:space="preserve" textLength="449.57" lengthAdjust="spacing">&#8216;Spell Out&#8217; the promise so it creates &#8216;theatre in their </text>
              <text x="470.39" y="419.09" font-size="18.75" fill="#000000" textLength="48.19" lengthAdjust="spacing">mind&#8217;</text>
              <text x="967.46" y="396.59" font-size="18.75" fill="#000000" xml:space="preserve" textLength="423.64" lengthAdjust="spacing">Build muscle, burn fat and sleep longer with our </text>
              <text x="967.46" y="419.09" font-size="18.75" fill="#000000" textLength="289.48" lengthAdjust="spacing">revolutionary protein doughnuts.</text>
              <text x="58.06" y="458.58" font-size="20.83" fill="#FFFFFF" textLength="67.6" lengthAdjust="spacing">Widget</text>
              <text x="189.87" y="456.58" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="241.18" lengthAdjust="spacing">I&#8217;ve seen enough, what do I </text>
              <text x="189.87" y="479.08" font-size="18.75" fill="#FFFFFF" textLength="72.94" lengthAdjust="spacing">do now?</text>
              <text x="470.39" y="456.58" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="463.56" lengthAdjust="spacing">Call to Action (CTA) button - take them to 1st stage in </text>
              <text x="470.39" y="479.08" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="156.21" lengthAdjust="spacing">our sales process </text>
              <text x="967.46" y="456.58" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="471.38" lengthAdjust="spacing">Call to Action (CTA) button - linking to &#8216;free taste test&#8217; - </text>
              <text x="967.46" y="479.08" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="379.03" lengthAdjust="spacing">give their name, cell ph number &amp; address. </text>
              <text x="60.00" y="155.59" font-size="18.75" fill="#FFFFFF" textLength="1113.13" lengthAdjust="spacing">Arrival Assumption: Reader arrived as a result or clicking a link from an outbound article/ advert placed in Facebook or LinkedIn.</text>
              <text x="60.00" y="178.09" font-size="18.75" fill="#FFFFFF" textLength="1227.36" lengthAdjust="spacing">First 7 secs - Have I arrived on the right page? (Is Logo and Colour consistent with advert etc) and does the page look professional/ appealing?</text>
              <text x="60.31" y="533.23" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 2</text>
              <text x="192.12" y="533.23" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="472.64" y="533.23" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="969.71" y="533.23" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="60.31" y="578.19" font-size="20.83" fill="#FFFFFF" textLength="95.96" lengthAdjust="spacing">Text Body</text>
              <text x="192.12" y="576.19" font-size="18.75" fill="#000000" xml:space="preserve" textLength="241.99" lengthAdjust="spacing">I&#8217;m Not Convinced Yet - Tell </text>
              <text x="192.12" y="598.69" font-size="18.75" fill="#000000" xml:space="preserve" textLength="215.01" lengthAdjust="spacing">me how you accomplish </text>
              <text x="192.12" y="621.19" font-size="18.75" fill="#000000" textLength="116.53" lengthAdjust="spacing">your promise</text>
              <text x="472.64" y="576.19" font-size="18.75" fill="#000000" textLength="385.88" lengthAdjust="spacing">Summarise how we accomplish our promise</text>
              <text x="969.71" y="576.19" font-size="18.75" fill="#000000" xml:space="preserve" textLength="453.58" lengthAdjust="spacing">We combine the finest whey isolate protein powder </text>
              <text x="969.71" y="598.69" font-size="18.75" fill="#000000" xml:space="preserve" textLength="464.87" lengthAdjust="spacing">with organic buttermilk and Mongolian coconut husk </text>
              <text x="969.71" y="621.19" font-size="18.75" fill="#000000" xml:space="preserve" textLength="462.06" lengthAdjust="spacing">to deliver a mouth watering doughnut that looks like </text>
              <text x="969.71" y="643.69" font-size="18.75" fill="#000000" xml:space="preserve" textLength="464.91" lengthAdjust="spacing">a doughnut; feels like a doughnut in your mouth, but </text>
              <text x="969.71" y="666.19" font-size="18.75" fill="#000000" xml:space="preserve" textLength="446.76" lengthAdjust="spacing">works to stimulate your Hippocampus and adrenal </text>
              <text x="969.71" y="688.69" font-size="18.75" fill="#000000" textLength="345.84" lengthAdjust="spacing">gonads to build muscle while you sleep!</text>
              <text x="60.31" y="733.80" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="67.42" lengthAdjust="spacing">Text &amp; </text>
              <text x="60.31" y="758.80" font-size="20.83" fill="#FFFFFF" textLength="85.85" lengthAdjust="spacing">Graphics</text>
              <text x="192.12" y="731.80" font-size="18.75" fill="#000000" textLength="189.09" lengthAdjust="spacing">How can I believe you</text>
              <text x="472.64" y="731.80" font-size="18.75" fill="#000000" textLength="428.7" lengthAdjust="spacing">Show them 3 things to support what we just said.</text>
              <text x="969.71" y="731.80" font-size="18.75" fill="#000000" textLength="404.49" lengthAdjust="spacing">Picture 1 - Organic Ingredients - text to explain</text>
              <text x="969.71" y="754.30" font-size="18.75" fill="#000000" textLength="391.37" lengthAdjust="spacing">Picture 2 - Yummy Doughnut - text to explain</text>
              <text x="969.71" y="776.80" font-size="18.75" fill="#000000" xml:space="preserve" textLength="459.32" lengthAdjust="spacing">Picture 3 - Muscle bound guy, Attractive girl. - text to </text>
              <text x="969.71" y="799.30" font-size="18.75" fill="#000000" textLength="257.57" lengthAdjust="spacing">explain how results may vary.</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 8) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptInboundLandingPageReviewSheet2',

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

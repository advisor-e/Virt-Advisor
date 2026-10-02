<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="(Inbound) Landing Page Review: Designing Your Landing Page -3">

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

            <path d="M 56.88 34.9 L 790.35 34.9 L 790.35 88.9 L 56.88 88.9 L 56.88 34.9" fill="#00FF00"></path>
            <path d="M 39.02 101.61 L 170.82 101.61 L 170.82 141.6 L 39.02 141.6 L 39.02 101.61" fill="#FF3300"></path>
            <path d="M 170.82 101.61 L 451.35 101.61 L 451.35 141.6 L 170.82 141.6 L 170.82 101.61" fill="#002B64"></path>
            <path d="M 451.35 101.61 L 948.42 101.61 L 948.42 141.6 L 451.35 141.6 L 451.35 101.61" fill="#002B64"></path>
            <path d="M 948.42 101.61 L 1445.49 101.61 L 1445.49 141.6 L 948.42 141.6 L 948.42 101.61" fill="#002B64"></path>
            <path d="M 39.02 141.6 L 170.82 141.6 L 170.82 224.09 L 39.02 224.09 L 39.02 141.6" fill="#434343"></path>
            <path d="M 170.82 141.6 L 451.35 141.6 L 451.35 224.09 L 170.82 224.09 L 170.82 141.6" fill="#BBD6EE"></path>
            <path d="M 39.02 224.09 L 170.82 224.09 L 170.82 287.46 L 39.02 287.46 L 39.02 224.09" fill="#434343"></path>
            <path d="M 170.82 224.09 L 451.35 224.09 L 451.35 287.46 L 170.82 287.46 L 170.82 224.09" fill="#BBD6EE"></path>
            <path d="M 39.02 287.46 L 170.82 287.46 L 170.82 392.45 L 39.02 392.45 L 39.02 287.46" fill="#434343"></path>
            <path d="M 170.82 287.46 L 451.35 287.46 L 451.35 392.45 L 170.82 392.45 L 170.82 287.46" fill="#BBD6EE"></path>
            <path d="M 39.02 392.45 L 170.82 392.45 L 170.82 457.44 L 39.02 457.44 L 39.02 392.45" fill="#434343"></path>
            <path d="M 170.82 392.45 L 1445.49 392.45 L 1445.49 457.44 L 170.82 457.44 L 170.82 392.45" fill="#BBD6EE"></path>
            <path d="M 39.02 100.83 L 39.02 458.22" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 170.82 100.83 L 170.82 458.22" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 451.35 100.83 L 451.35 393.23" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 948.42 100.83 L 948.42 393.23" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1445.49 100.83 L 1445.49 458.22" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 101.61 L 1446.27 101.61" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 141.6 L 1446.27 141.6" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 224.09 L 1446.27 224.09" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 287.46 L 1446.27 287.46" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 392.45 L 1446.27 392.45" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 457.44 L 1446.27 457.44" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 39.02 467.16 L 170.82 467.16 L 170.82 512.59 L 39.02 512.59 L 39.02 467.16" fill="#FF00FF"></path>
            <path d="M 170.82 467.16 L 451.35 467.16 L 451.35 512.59 L 170.82 512.59 L 170.82 467.16" fill="#002B64"></path>
            <path d="M 451.35 467.16 L 948.42 467.16 L 948.42 512.59 L 451.35 512.59 L 451.35 467.16" fill="#002B64"></path>
            <path d="M 948.42 467.16 L 1445.49 467.16 L 1445.49 512.59 L 948.42 512.59 L 948.42 467.16" fill="#002B64"></path>
            <path d="M 39.02 512.59 L 170.82 512.59 L 170.82 574.17 L 39.02 574.17 L 39.02 512.59" fill="#434343"></path>
            <path d="M 170.82 512.59 L 451.35 512.59 L 451.35 574.17 L 170.82 574.17 L 170.82 512.59" fill="#BBD6EE"></path>
            <path d="M 39.02 574.17 L 170.82 574.17 L 170.82 705.02 L 39.02 705.02 L 39.02 574.17" fill="#434343"></path>
            <path d="M 170.82 574.17 L 451.35 574.17 L 451.35 705.02 L 170.82 705.02 L 170.82 574.17" fill="#BBD6EE"></path>
            <path d="M 451.35 574.17 L 948.42 574.17 L 948.42 705.02 L 451.35 705.02 L 451.35 574.17" fill="#BBD6EE"></path>
            <path d="M 948.42 574.17 L 1445.49 574.17 L 1445.49 705.02 L 948.42 705.02 L 948.42 574.17" fill="#BBD6EE"></path>
            <path d="M 39.02 705.02 L 170.82 705.02 L 170.82 810.01 L 39.02 810.01 L 39.02 705.02" fill="#434343"></path>
            <path d="M 170.82 705.02 L 451.35 705.02 L 451.35 810.01 L 170.82 810.01 L 170.82 705.02" fill="#BBD6EE"></path>
            <path d="M 39.02 466.39 L 39.02 810.79" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 170.82 466.39 L 170.82 810.79" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 451.35 466.39 L 451.35 810.79" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 948.42 466.39 L 948.42 810.79" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1445.49 466.39 L 1445.49 810.79" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 467.16 L 1446.27 467.16" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 512.59 L 1446.27 512.59" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 574.17 L 1446.27 574.17" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 705.02 L 1446.27 705.02" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 38.24 810.01 L 1446.27 810.01" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="56.88" y="78.10" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="746.42" lengthAdjust="spacing">Designing Your Landing Page -3 </text>
              <text x="53.08" y="127.86" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 5</text>
              <text x="184.89" y="127.86" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="465.41" y="127.86" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="962.48" y="127.86" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="53.08" y="167.85" font-size="20.83" fill="#FFFFFF" textLength="41.06" lengthAdjust="spacing">Title</text>
              <text x="184.89" y="165.85" font-size="18.75" fill="#000000" xml:space="preserve" textLength="242.42" lengthAdjust="spacing">I&#8217;m still not convinced, Who </text>
              <text x="184.89" y="188.35" font-size="18.75" fill="#000000" xml:space="preserve" textLength="211.95" lengthAdjust="spacing">are these guys? Do they </text>
              <text x="184.89" y="210.85" font-size="18.75" fill="#000000" textLength="175.86" lengthAdjust="spacing">have any credibility?</text>
              <text x="465.41" y="165.85" font-size="18.75" fill="#000000" xml:space="preserve" textLength="411.26" lengthAdjust="spacing">Give background info on the team and provide </text>
              <text x="465.41" y="188.35" font-size="18.75" fill="#000000" textLength="433.89" lengthAdjust="spacing">assurance that we know what we&#8217;re talking about.</text>
              <text x="962.48" y="165.85" font-size="18.75" fill="#000000" textLength="205.89" lengthAdjust="spacing">Meet The &#8216;Dream Team&#8217;</text>
              <text x="53.08" y="250.34" font-size="20.83" fill="#FFFFFF" textLength="73.94" lengthAdjust="spacing">Subtitle</text>
              <text x="184.89" y="248.34" font-size="18.75" fill="#000000" xml:space="preserve" textLength="250.67" lengthAdjust="spacing">Will these guys be around in </text>
              <text x="184.89" y="274.22" font-size="18.75" fill="#000000" textLength="62.21" lengthAdjust="spacing">future?</text>
              <text x="465.41" y="248.34" font-size="18.75" fill="#000000" xml:space="preserve" textLength="427.03" lengthAdjust="spacing">Tell them what makes us so committed - why we </text>
              <text x="465.41" y="270.84" font-size="18.75" fill="#000000" textLength="375.83" lengthAdjust="spacing">won&#8217;t give up on our promise to help them.</text>
              <text x="962.48" y="248.34" font-size="18.75" fill="#000000" xml:space="preserve" textLength="437.51" lengthAdjust="spacing">Our mission is to change the way people see food </text>
              <text x="962.48" y="270.84" font-size="18.75" fill="#000000" textLength="162.26" lengthAdjust="spacing">and sleep, forever!</text>
              <text x="53.08" y="313.71" font-size="20.83" fill="#FFFFFF" textLength="95.96" lengthAdjust="spacing">Text Body</text>
              <text x="184.89" y="311.71" font-size="18.75" fill="#000000" xml:space="preserve" textLength="191.74" lengthAdjust="spacing">What makes them &#8216;so </text>
              <text x="184.89" y="337.58" font-size="18.75" fill="#000000" textLength="70.99" lengthAdjust="spacing">special&#8217;?</text>
              <text x="465.41" y="311.71" font-size="18.75" fill="#000000" textLength="280.88" lengthAdjust="spacing">Tell them what makes us special</text>
              <text x="962.48" y="311.71" font-size="18.75" fill="#000000" xml:space="preserve" textLength="425.19" lengthAdjust="spacing">Bill discovered the secret formula when trekking </text>
              <text x="962.48" y="334.21" font-size="18.75" fill="#000000" xml:space="preserve" textLength="471.94" lengthAdjust="spacing">through the Mongolian mountains, it was shared with </text>
              <text x="962.48" y="356.71" font-size="18.75" fill="#000000" xml:space="preserve" textLength="450.3" lengthAdjust="spacing">him by the village chief after he fell, trying to save a </text>
              <text x="962.48" y="379.21" font-size="18.75" fill="#000000" textLength="141.22" lengthAdjust="spacing">kitten in a tree...</text>
              <text x="53.08" y="418.70" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="91.25" lengthAdjust="spacing">Graphics </text>
              <text x="53.08" y="443.70" font-size="20.83" fill="#FFFFFF" textLength="52.69" lengthAdjust="spacing">Table</text>
              <text x="409.15" y="431.69" font-size="18.75" fill="#000000" textLength="797.01" lengthAdjust="spacing">Show the team member photo, state their role, blurb and contact details - in a table format.</text>
              <text x="53.08" y="493.41" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 6</text>
              <text x="184.89" y="493.41" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="465.41" y="493.41" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="962.48" y="493.41" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="53.08" y="538.84" font-size="20.83" fill="#FFFFFF" textLength="41.06" lengthAdjust="spacing">Title</text>
              <text x="184.89" y="536.84" font-size="18.75" fill="#000000" xml:space="preserve" textLength="231.66" lengthAdjust="spacing">How good is it? - Who else </text>
              <text x="184.89" y="559.34" font-size="18.75" fill="#000000" textLength="155.34" lengthAdjust="spacing">has it worked for?</text>
              <text x="465.41" y="536.84" font-size="18.75" fill="#000000" textLength="174.09" lengthAdjust="spacing">Provide Social Proof</text>
              <text x="962.48" y="536.84" font-size="18.75" fill="#000000" xml:space="preserve" textLength="432.67" lengthAdjust="spacing">Don&#8217;t just take our word for it, here&#8217;s what others </text>
              <text x="962.48" y="559.34" font-size="18.75" fill="#000000" textLength="112.87" lengthAdjust="spacing">have to say...</text>
              <text x="53.08" y="600.42" font-size="18.75" fill="#FFFFFF" textLength="101.12" lengthAdjust="spacing">Testimonial</text>
              <text x="53.08" y="625.42" font-size="20.83" fill="#FFFFFF" textLength="85.85" lengthAdjust="spacing">Graphics</text>
              <text x="184.89" y="635.09" font-size="18.75" fill="#000000" xml:space="preserve" textLength="250.65" lengthAdjust="spacing">Let me see them, learn their </text>
              <text x="184.89" y="657.59" font-size="18.75" fill="#000000" textLength="48.81" lengthAdjust="spacing">story.</text>
              <text x="465.41" y="635.09" font-size="18.75" fill="#000000" xml:space="preserve" textLength="443.29" lengthAdjust="spacing">Show them our success stories are people just like </text>
              <text x="465.41" y="657.59" font-size="18.75" fill="#000000" textLength="50.94" lengthAdjust="spacing">them.</text>
              <text x="962.48" y="601.34" font-size="18.75" fill="#000000" textLength="120.08" lengthAdjust="spacing">Name - Photo</text>
              <text x="962.48" y="623.84" font-size="18.75" fill="#000000" textLength="220.09" lengthAdjust="spacing">Their Problem/ backstory</text>
              <text x="962.48" y="646.34" font-size="18.75" fill="#000000" textLength="116.38" lengthAdjust="spacing">Their Journey</text>
              <text x="962.48" y="668.84" font-size="18.75" fill="#000000" textLength="99.54" lengthAdjust="spacing">Their result</text>
              <text x="962.48" y="691.34" font-size="18.75" fill="#000000" textLength="183.17" lengthAdjust="spacing">What they now enjoy</text>
              <text x="53.08" y="731.27" font-size="20.83" fill="#FFFFFF" textLength="73.94" lengthAdjust="spacing">Subtitle</text>
              <text x="184.89" y="729.27" font-size="18.75" fill="#000000" textLength="200.81" lengthAdjust="spacing">Will it work for me too?</text>
              <text x="465.41" y="729.27" font-size="18.75" fill="#000000" textLength="424.13" lengthAdjust="spacing">Explain the results are regular and WHY it works.</text>
              <text x="962.48" y="729.27" font-size="18.75" font-weight="700" fill="#000000" textLength="165.23" lengthAdjust="spacing">Anyone can enjoy</text>
              <text x="1127.84" y="729.27" font-size="18.75" fill="#000000" xml:space="preserve" textLength="157.05" lengthAdjust="spacing"> rapid weight loss </text>
              <text x="1285.12" y="729.27" font-size="18.75" font-weight="700" fill="#000000" textLength="87.54" lengthAdjust="spacing">using our</text>
              <text x="962.48" y="751.77" font-size="18.75" fill="#000000" xml:space="preserve" textLength="99.32" lengthAdjust="spacing">doughnuts </text>
              <text x="1061.90" y="751.77" font-size="18.75" font-weight="700" fill="#000000" textLength="76.58" lengthAdjust="spacing">because</text>
              <text x="1138.53" y="751.77" font-size="18.75" fill="#000000" xml:space="preserve" textLength="267.6" lengthAdjust="spacing"> we help you match your body </text>
              <text x="962.48" y="774.27" font-size="18.75" fill="#000000" xml:space="preserve" textLength="245.46" lengthAdjust="spacing">type to our product options </text>
              <text x="1208.25" y="774.27" font-size="18.75" font-weight="700" fill="#000000" textLength="170.68" lengthAdjust="spacing">with our exclusive</text>
              <text x="1379.06" y="774.27" font-size="18.75" fill="#000000" xml:space="preserve" textLength="31.13" lengthAdjust="spacing"> 21 </text>
              <text x="962.48" y="796.77" font-size="18.75" fill="#000000" textLength="300.86" lengthAdjust="spacing">point optical assessment checklist.</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 10) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptInboundLandingPageReviewSheet4',

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

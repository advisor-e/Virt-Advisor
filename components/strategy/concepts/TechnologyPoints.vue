<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Technology Points. Your four key stages and four paragraphs on the left; on the right a flat chart of retail value against market acceptance, with six numbered points, a level critical price point line, and a name brands capitulate band.">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!-- ============================================================
                 LEFT COLUMN - every span read from the PDF text layer.
                 x, y, size, weight and colour are his; each line is pinned to
                 its own measured width with textLength.
                 ============================================================ -->
            <g font-family="Open Sans, sans-serif">
              <text x="46.2" y="78.8" font-size="50" fill="#002b64"
                    textLength="423.5" lengthAdjust="spacing">Technology Points</text>
              <text x="46.2" y="110.0" font-size="22.9" fill="#002b64"
                    textLength="367.5" lengthAdjust="spacing">(Chris Anderson - Wired Magazine)</text>

              <text x="46.2" y="165.2" font-size="20.8" font-weight="700" fill="#002b64"
                    textLength="213.1" lengthAdjust="spacing">The Four Key Stages:</text>

              <circle cx="69.1" cy="183.7" r="4.5" fill="#002b64"></circle>
              <text x="102.5" y="190.2" font-size="20.8" font-weight="700" fill="#002b64"
                    textLength="203.2" lengthAdjust="spacing">Critical Price Point*</text>

              <circle cx="69.1" cy="208.7" r="4.5" fill="#002b64"></circle>
              <text x="102.5" y="215.2" font-size="20.8" font-weight="700" fill="#002b64"
                    textLength="200.8" lengthAdjust="spacing">Market Acceptance</text>

              <circle cx="69.1" cy="233.7" r="4.5" fill="#002b64"></circle>
              <text x="102.5" y="240.2" font-size="20.8" font-weight="700" fill="#002b64"
                    textLength="354.7" lengthAdjust="spacing">Displacing Established Technology</text>

              <circle cx="69.1" cy="258.6" r="4.5" fill="#002b64"></circle>
              <text x="102.5" y="265.1" font-size="20.8" font-weight="700" fill="#002b64"
                    textLength="374.3" lengthAdjust="spacing">Becoming Ubiquitous (ever-present)</text>

              <g font-size="20.8" fill="#434343">
                <text x="46.2" y="315.1" textLength="583.6" lengthAdjust="spacing">New technologies often enter at a &#8216;Premium&#8217; price point</text>
                <text x="46.2" y="340.1" textLength="583.7" lengthAdjust="spacing">due to the cost of developing the technology, higher</text>
                <text x="46.2" y="365.1" textLength="583.6" lengthAdjust="spacing">manufacturing costs (due to smaller sales volumes) and the</text>
                <text x="46.2" y="390.1" textLength="187.2" lengthAdjust="spacing">&#8216;uniqueness factor&#8217;.</text>

                <text x="46.2" y="440.1" textLength="583.5" lengthAdjust="spacing">Once competitors release their (same or similar) versions</text>
                <text x="46.2" y="465.1" textLength="583.5" lengthAdjust="spacing">then the race is on for the &#8216;critical price point&#8217; that will</text>
                <text x="46.2" y="490.1" textLength="583.6" lengthAdjust="spacing">entice the &#8216;Early Majority&#8217; to demand the product/ service</text>
                <text x="46.2" y="515.1" textLength="148.9" lengthAdjust="spacing">for themselves.</text>

                <text x="46.2" y="565.1" textLength="583.6" lengthAdjust="spacing">The next focus is on manufacturing / delivery efficiencies</text>
                <text x="46.2" y="590.1" textLength="583.6" lengthAdjust="spacing">that can permit a lower price point whilst maintaining (or</text>
                <text x="46.2" y="615.1" textLength="252.3" lengthAdjust="spacing">improving) profit margins.</text>

                <text x="46.2" y="665.1" textLength="583.5" lengthAdjust="spacing">The final &#8216;price point&#8217; issue is when &#8216;brand name&#8217; producers</text>
                <text x="46.2" y="690.1" textLength="583.5" lengthAdjust="spacing">capitulate and withdraw from the market in search of the</text>
                <text x="46.2" y="715.1" textLength="583.4" lengthAdjust="spacing">next &#8216;best thing&#8217;. (Opportunity still exists in the tail - argues</text>
                <text x="46.2" y="740.1" textLength="155.1" lengthAdjust="spacing">Chris Anderson)</text>
              </g>
            </g>

            <!-- ============================================================
                 THE CHART. Panel sits exactly where his picture placeholder
                 sits on the page: 318.3-702.2 x 22.1-375.4pt, scaled 2.0833.
                 Backdrop #525355 is his own scene grey, sampled off the render.
                 ============================================================ -->
            <rect x="663" y="46" width="800" height="736" fill="#525355"></rect>

            <!-- The three axes. Blue #335998 and gold #FFC211 are both sampled off his page.
                 ⚠ STATED DEVIATION: on his page the gold also wraps each ARROWHEAD, because each
                 axis is a 3-D prism and the gold is its lit edge. Flat there is no prism, and a
                 gold wedge on a flat arrowhead reads as a stray mark - so the gold is the shaft
                 edge only, on all three, consistently. -->
            <!-- left: retail value, pointing up -->
            <rect x="672" y="100" width="9" height="622" fill="#FFC211"></rect>
            <polygon points="681,722 681,100 667,100 701,52 735,100 721,100 721,722" fill="#335998"></polygon>
            <!-- bottom: market acceptance, pointing right -->
            <rect x="681" y="713" width="724" height="9" fill="#FFC211"></rect>
            <polygon points="681,722 1405,722 1405,708 1449,742 1405,776 1405,762 681,762" fill="#335998"></polygon>
            <!-- right: cost of producing, pointing DOWN - his point is that it falls as acceptance rises.
                 ⚠ STATED DEVIATION: on his page this arrow crosses the bottom axis, because a 3-D scene
                 gives the two arrowheads different depths. Flat, they have none, and crossing read as a
                 collision - so it stops ON the baseline instead. -->
            <rect x="1372" y="100" width="9" height="538" fill="#FFC211"></rect>
            <polygon points="1381,100 1421,100 1421,638 1435,638 1401,690 1367,638 1381,638" fill="#335998"></polygon>

            <!-- 'Name brands capitulate' band. Flattened x-range 62.7%-75.8% of the
                 acceptance axis; colour #999288 sampled off his band. -->
            <rect x="1134.6" y="64" width="86.9" height="658" fill="#999288" opacity="0.9"></rect>
            <text transform="translate(1178,300) rotate(-90)" text-anchor="middle"
                  font-family="Open Sans, sans-serif" font-size="23" font-weight="700"
                  letter-spacing="2.5" fill="#d8d2c6">
              <tspan x="0" dy="-14">NAME BRANDS</tspan>
              <tspan x="0" dy="30">CAPITULATE</tspan>
            </text>

            <!-- The critical price point. LEVEL - which is the whole proof that the
                 flattening is right. In his 3-D view it slopes; it should not. -->
            <line x1="721" y1="415.6" x2="1345" y2="415.6" stroke="#F10132" stroke-width="7"></line>
            <text x="836" y="405" font-family="Open Sans, sans-serif" font-size="22"
                  font-weight="700" letter-spacing="1.5" fill="#F10132">CRITICAL PRICE POINT</text>

            <!-- The ribbon, through the six measured points. The elbow at 2 is his:
                 a vertical fall, then a near-level run. -->
            <path d="M 784.5 224.2
                     C 787 340, 792 445, 810.4 495
                     C 860.4 491.2, 912.9 484.8, 960.3 483.5
                     C 1007.7 482.2, 1058.0 482.3, 1094.6 487.2
                     C 1131.2 492.1, 1152.9 498.6, 1179.8 512.7
                     C 1206.7 526.9, 1230.6 552.3, 1256.0 572.1"
                  fill="none" stroke="#A90000" stroke-width="22"
                  stroke-linecap="round" stroke-linejoin="round"></path>

            <!-- The six markers, found by machine, not placed. -->
            <g fill="#A90000" stroke="#C4C5C7" stroke-width="9">
              <circle cx="784.5" cy="224.2" r="22"></circle>
              <circle cx="810.4" cy="495.0" r="22"></circle>
              <circle cx="960.3" cy="483.5" r="22"></circle>
              <circle cx="1094.6" cy="487.2" r="22"></circle>
              <circle cx="1179.8" cy="512.7" r="22"></circle>
              <circle cx="1256.0" cy="572.1" r="22"></circle>
            </g>
            <g font-family="Open Sans, sans-serif" font-size="30" font-weight="700"
               fill="#ffffff" text-anchor="middle">
              <text x="822" y="202">1</text>
              <text x="778" y="543">2</text>
              <text x="952" y="543">3</text>
              <text x="1094" y="548">4</text>
              <text x="1172" y="576">5</text>
              <text x="1288" y="620">6</text>
            </g>

            <!-- Axis labels. These words are the one thing that could not be machine
                 read: they are pixels inside the photograph, not text. -->
            <g font-family="Open Sans, sans-serif" font-size="26" font-weight="700"
               fill="#ffffff" letter-spacing="2" text-anchor="middle">
              <text transform="translate(710,411) rotate(-90)">RETAIL VALUE OF ITEM</text>
              <text x="1043" y="751">MARKET ACCEPTANCE OF ITEM</text>
              <text transform="translate(1410,400) rotate(90)">COST OF PRODUCING ITEM</text>
            </g>

            <!-- The firm's mark, standing exactly where advisor-e.com was burned in. -->
            <g class="firm-mark">

              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>
            <rect class="firm-border" x="5" y="5" width="1490" height="834" rx="8" fill="none" :stroke="firmColour" stroke-width="10"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-technology-points.html (drawing 1) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptTechnologyPoints',

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

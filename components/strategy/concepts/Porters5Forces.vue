<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Porter's 5 Forces: Existing Rivalry at the centre, ringed by Customers at the top, Suppliers to the right, Substitutes below and New Entrants to the left, with a question against each.">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!--
              🔴 EVERY x AND y BELOW IS HIS, NOT MINE. The PDF page is 720×405pt; at
              1500px wide that is a scale of 2.0833, and each line's left edge, baseline
              and point size comes straight out of the page's text layer multiplied by
              it. Nothing here was positioned by eye — the first attempt was, using a
              guessed page width, and every block overran the edge and collided with
              the ring.
            -->
            <text x="57.8" y="98.7" font-family="Open Sans, Segoe UI, sans-serif" font-size="50"
                  fill="#002B64">Porter&#8217;s (Michael) 5 Forces</text>
            <text x="57.8" y="130" font-family="Open Sans, Segoe UI, sans-serif" font-size="22.9"
                  fill="#002B64">(Where&#8217;s the pressure coming from?)</text>

            <!-- The ring. Each quarter takes the colour of the node it runs up to. -->
            <g fill="none" stroke-width="14">
              <path d="M 516 465 A 232 232 0 0 1 748 233" stroke="#519AD9"></path>
              <path d="M 748 233 A 232 232 0 0 1 980 465" stroke="#F47D2F"></path>
              <path d="M 980 465 A 232 232 0 0 1 748 697" stroke="#474747"></path>
              <path d="M 748 697 A 232 232 0 0 1 516 465" stroke="#75A157"></path>
            </g>

            <!-- The five forces -->
            <circle cx="748" cy="233" r="76" fill="#F47D2F"></circle>
            <circle cx="980" cy="465" r="76" fill="#474747"></circle>
            <circle cx="748" cy="697" r="76" fill="#75A157"></circle>
            <circle cx="516" cy="465" r="76" fill="#519AD9"></circle>
            <circle cx="748" cy="465" r="90" fill="#3A6FC8"></circle>

            <!-- The labels inside the circles: Calibri in his deck, Carlito here. -->
            <g font-family="Carlito, Calibri, Segoe UI, sans-serif" font-size="22.9" fill="#ffffff">
              <text x="698.4" y="238.7">Customers</text>
              <text x="939.7" y="473.3">Suppliers</text>
              <text x="695.9" y="707.8">Substitutes</text>
              <text x="492" y="460.8">New</text>
              <text x="474.4" y="485.8">Entrants</text>
            </g>
            <g font-family="Carlito, Calibri, Segoe UI, sans-serif" font-size="37.5" fill="#ffffff">
              <text x="689.7" y="457.7">Existing</text>
              <text x="696.6" y="498.4">Rivalry</text>
            </g>

            <!-- New Entrants, top left. His line breaks, his baselines. -->
            <g font-family="Open Sans, Segoe UI, sans-serif" font-size="18.8" fill="#4A86E8">
              <text x="80.5" y="234">How easy is it for new entrants to enter your</text>
              <text x="80.5" y="255.9">marketplace? Is it conceivable that your current</text>
              <text x="80.5" y="277.7">supplier could become your future competition for</text>
              <text x="80.5" y="299.6">example?</text>
            </g>

            <!-- Customers, top right -->
            <g font-family="Open Sans, Segoe UI, sans-serif" font-size="18.8" fill="#ED7D31">
              <text x="850.8" y="141.9">Are customers likely to be motivated to pay premium prices in</text>
              <text x="850.8" y="163.8">return for &#8216;latest style/fashion&#8217;, technology or prestige/status? Are</text>
              <text x="850.8" y="185.7">customers concerned about your business safety/ environment /</text>
              <text x="850.8" y="207.6">ethical impact?</text>
            </g>

            <!-- His two bold statements. Both were missing from the old hand-drawing. -->
            <g font-family="Open Sans, Segoe UI, sans-serif" font-size="22.9" font-weight="700"
               fill="#002B64">
              <text x="937.3" y="284.8">Expectations, Demands, Drivers</text>
              <text x="1014.4" y="313">of Needs &amp; Wants.</text>
              <text x="127.2" y="618">Technology, Innovative approach</text>
              <text x="218.1" y="646.1">Barriers to entry.</text>
            </g>

            <!-- Substitutes, bottom left -->
            <g font-family="Open Sans, Segoe UI, sans-serif" font-size="18.8" fill="#548135">
              <text x="80.5" y="706.9">What are the alternatives to your product or service?</text>
              <text x="80.5" y="728.7">Could your customers solve their problem a different</text>
              <text x="80.5" y="750.6">way?</text>
            </g>

            <!-- Suppliers, bottom right -->
            <g font-family="Open Sans, Segoe UI, sans-serif" font-size="18.8" fill="#434343">
              <text x="985.2" y="647.4">Is there competition amongst your suppliers?, do</text>
              <text x="985.2" y="669.2">they actively compete for your business and if you</text>
              <text x="985.2" y="691.1">had to shift to a new supplier, how easy would it</text>
              <text x="985.2" y="713">be?</text>
            </g>

            <!--
              🔴 THE FIRM'S MARK, WHERE ADVISOR-E'S USED TO BE. This is the slot the
              whole rebuild exists for. THE LOGO IS THE MARK — Mike, 2026-09-22 — and
              the disc below it is the fallback for a firm holding none. The box is a
              fixed height with xMinYMid meet, so any proportion fits without being
              stretched or cropped. The switcher above proves both states move.
            -->
            <g id="firmMark">

              <image class="fm-logo" x="86" y="766" width="240" height="48" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle id="firmDisc" cx="110" cy="790" r="24" v-if="!firmLogo" :fill="firmColour"></circle>
              <text id="firmInitials" v-if="!firmLogo" x="110" y="799" text-anchor="middle" fill="#ffffff"
                    font-family="Open Sans, Segoe UI, sans-serif" font-size="22"
                    font-weight="700">{{ firmInitial }}</text>
              <text id="firmName" v-if="!firmLogo" x="146" y="798" fill="#002B64"
                    font-family="Open Sans, Segoe UI, sans-serif" font-size="22.9"
                    font-weight="600">{{ firmName }}</text>
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
 * Lifted from design/mockups/strategy-concept-porters.html (drawing 1) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptPorters5Forces',

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

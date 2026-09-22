<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Boston Model: Rising Star, Star, Problem Child and Cash Cow across market share and market growth, with commentary alongside.">
            <rect width="1500" height="844" fill="#fff"></rect>
            <text x="49.5" y="104.5" font-family="Open Sans, sans-serif" font-size="50" fill="#002B64">Boston Model</text>

            <!-- Quadrants: x155.3/473.1, y175.9/389.7, each 317.8 x 213.8 -->
            <rect x="155.3" y="175.9" width="317.8" height="213.8" fill="#33CCFF"></rect>
            <rect x="473.1" y="175.9" width="317.8" height="213.8" fill="#499E10"></rect>
            <rect x="155.3" y="389.7" width="317.8" height="213.8" fill="#FF0000"></rect>
            <rect x="473.1" y="389.7" width="317.8" height="213.8" fill="#0070C0"></rect>

            <!-- His grid rules sit ON the quadrants -->
            <g stroke="#9E9E9E" stroke-width="1.5" fill="none">
              <path d="M155.3 175.2 V604.3 M473.1 175.2 V604.3 M790.9 175.2 V604.3"></path>
              <path d="M154.5 175.9 H791.7 M154.5 389.7 H791.7 M154.5 603.5 H791.7"></path>
            </g>
            <!-- The two axes he draws, arrowed -->
            <g stroke="#44546A" stroke-width="3" fill="#44546A">
              <path d="M145.5 168.8 V618.6" fill="none"></path>
              <path d="M145.5 155 l7 14 h-14 z"></path>
              <path d="M145.5 618.6 H800" fill="none" stroke-width="3"></path>
              <path d="M812 618.6 l-14 7 v-14 z"></path>
            </g>

            <g font-family="Open Sans, sans-serif" font-size="29.2" font-weight="700" fill="#FFFFFF">
              <text x="237.0" y="293.3">Rising Star</text>
              <text x="602.2" y="293.3">Star</text>
              <text x="212.0" y="507.1">Problem Child</text>
              <text x="562.5" y="507.1">Cash Cow</text>
            </g>

            <g font-family="Open Sans, sans-serif" font-size="20.8">
              <text x="103.6" y="647.7" fill="#EC5012">Low</text>
              <text x="770.3" y="647.7" fill="#EC5012">High</text>
              <text x="97.1" y="154.4" fill="#EC5012">High</text>
              <text x="188.4" y="655.1" fill="#000000">Original - Market Share</text>
              <text x="188.4" y="680.1" fill="#000000">Alternative - Avg Industry Transaction Frequency</text>
              <text x="60.2" y="608.6" fill="#000000" transform="rotate(-90 60.2 608.6)">Original - Growing Market</text>
              <text x="85.2" y="608.6" fill="#000000" transform="rotate(-90 85.2 608.6)">Alternative - Avg Industry Transaction Value</text>
            </g>

            <!--
              His commentary, right column, x899.3, 20.8pt, 28.1 leading.
              🔴 EVERY LINE CARRIES ITS OWN textLength, WHICH IS ITS MEASURED WIDTH IN
              HIS DECK. His prose is justified; more usefully, pinning each line to the
              width the PDF reports makes the block immune to font-metric differences —
              the line breaks where his breaks, at the width his occupies. Two lines are
              italic in his deck and are italic here; that emphasis is his.
            -->
            <g font-family="Open Sans, sans-serif" font-size="20.8" fill="#434343" lengthAdjust="spacing">
              <text x="899.3" y="157.1" textLength="504.4">The first step in the Boston Model is to identify</text>
              <text x="899.3" y="185.2" textLength="504.3">your business in relation to your key competitors.</text>
              <text x="899.3" y="213.3" textLength="504.4">The second step is to collect data that proves</text>
              <text x="899.3" y="241.5" textLength="126.2">you&#8217;re right&#8230;</text>
              <text x="899.3" y="297.7" textLength="504.3">In the Original Boston Model, the Problem Child</text>
              <text x="899.3" y="325.8" textLength="504.3">describes a business with low or declining market</text>
              <text x="899.3" y="354.0" textLength="504.4">share in an industry which is experiencing</text>
              <text x="899.3" y="382.1" textLength="498.3">widespread growth. (In effect, the industry is</text>
              <text x="899.3" y="410.2" textLength="225.8" font-style="italic">booming but you&#8217;re not.)</text>
              <text x="899.3" y="466.5" textLength="504.4">In the Alternative Boston Model, the Problem Child</text>
              <text x="899.3" y="494.6" textLength="504.3">describes a business where customers spend less</text>
              <text x="899.3" y="522.7" textLength="502.6"><tspan font-style="italic">(per transaction)</tspan> than with your competitors <tspan text-decoration="underline">AND</tspan></text>
              <text x="899.3" y="550.8" textLength="256.2">they come back less often.</text>
              <text x="899.3" y="607.1" textLength="504.3">A useful question to discuss is&#8230; &#8220;which is easier to</text>
              <text x="899.3" y="635.2" textLength="504.3">achieve; getting a client to spend more each time</text>
              <text x="899.3" y="663.3" textLength="504.3">they come in OR, getting them to come back more</text>
              <text x="899.3" y="691.5" textLength="67.6">often?&#8221;</text>
            </g>

            <g class="firm-mark">

              <image class="fm-logo" x="86" y="766" width="240" height="48" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="110" cy="790" r="24" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="110" y="799" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="22" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="146" y="798" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="22.9" font-weight="600">{{ firmName }}</text>
            </g>
            <rect class="firm-border" x="5" y="5" width="1490" height="834" rx="8" fill="none" :stroke="firmColour" stroke-width="10"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-batch-1.html (drawing 2) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptBostonModel',

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

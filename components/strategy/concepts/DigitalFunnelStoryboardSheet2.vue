<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Digital Funnel Storyboard: Digital (New Client) On-Boarding as an &#8216;Engagement Story-Board&#8217; -1">

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

            <path d="M 37.32 84.04 L 1461.67 84.04 L 1461.67 807.08 L 37.32 807.08 L 37.32 84.04" fill="#E8EBF5"></path>
            <path d="M 37.32 84.04 L 512.1 84.04 L 512.1 131.32 L 37.32 131.32 L 37.32 84.04" fill="#434343"></path>
            <path d="M 512.1 84.04 L 986.88 84.04 L 986.88 131.32 L 512.1 131.32 L 512.1 84.04" fill="#434343"></path>
            <path d="M 986.88 84.04 L 1461.67 84.04 L 1461.67 131.32 L 986.88 131.32 L 986.88 84.04" fill="#434343"></path>
            <path d="M 37.32 131.32 L 512.1 131.32 L 512.1 258.52 L 37.32 258.52 L 37.32 131.32" fill="#666666"></path>
            <path d="M 512.1 131.32 L 986.88 131.32 L 986.88 258.52 L 512.1 258.52 L 512.1 131.32" fill="#666666"></path>
            <path d="M 986.88 131.32 L 1461.67 131.32 L 1461.67 258.52 L 986.88 258.52 L 986.88 131.32" fill="#666666"></path>
            <path d="M 37.32 258.52 L 512.1 258.52 L 512.1 385.72 L 37.32 385.72 L 37.32 258.52" fill="#3F3F3F"></path>
            <path d="M 512.1 258.52 L 986.88 258.52 L 986.88 385.72 L 512.1 385.72 L 512.1 258.52" fill="#3F3F3F"></path>
            <path d="M 986.88 258.52 L 1461.67 258.52 L 1461.67 385.72 L 986.88 385.72 L 986.88 258.52" fill="#3F3F3F"></path>
            <path d="M 37.32 385.72 L 512.1 385.72 L 512.1 509.96 L 37.32 509.96 L 37.32 385.72" fill="#666666"></path>
            <path d="M 512.1 385.72 L 986.88 385.72 L 986.88 509.96 L 512.1 509.96 L 512.1 385.72" fill="#666666"></path>
            <path d="M 986.88 385.72 L 1461.67 385.72 L 1461.67 509.96 L 986.88 509.96 L 986.88 385.72" fill="#666666"></path>
            <path d="M 37.32 509.96 L 512.1 509.96 L 512.1 658.52 L 37.32 658.52 L 37.32 509.96" fill="#3F3F3F"></path>
            <path d="M 512.1 509.96 L 986.88 509.96 L 986.88 658.52 L 512.1 658.52 L 512.1 509.96" fill="#3F3F3F"></path>
            <path d="M 986.88 509.96 L 1461.67 509.96 L 1461.67 658.52 L 986.88 658.52 L 986.88 509.96" fill="#3F3F3F"></path>
            <path d="M 37.32 658.52 L 512.1 658.52 L 512.1 807.08 L 37.32 807.08 L 37.32 658.52" fill="#666666"></path>
            <path d="M 512.1 658.52 L 986.88 658.52 L 986.88 807.08 L 512.1 807.08 L 512.1 658.52" fill="#666666"></path>
            <path d="M 986.88 658.52 L 1461.67 658.52 L 1461.67 807.08 L 986.88 807.08 L 986.88 658.52" fill="#666666"></path>
            <path d="M 37.32 82.99 L 37.32 808.12" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 512.1 82.99 L 512.1 808.12" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 986.88 82.99 L 986.88 808.12" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 1461.67 82.99 L 1461.67 808.12" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 84.04 L 1462.71 84.04" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 131.32 L 1462.71 131.32" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 258.52 L 1462.71 258.52" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 385.72 L 1462.71 385.72" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 509.96 L 1462.71 509.96" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 658.52 L 1462.71 658.52" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <path d="M 36.28 807.08 L 1462.71 807.08" fill="none" stroke="#000000" stroke-width="2.08"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="48.26" y="110.72" font-size="22.92" font-weight="700" fill="#FFD966" textLength="169.08" lengthAdjust="spacing">Message Focus</text>
              <text x="523.04" y="110.72" font-size="22.92" font-weight="700" fill="#FFD966" textLength="150.08" lengthAdjust="spacing">When to Talk</text>
              <text x="997.82" y="110.72" font-size="22.92" font-weight="700" fill="#FFD966" textLength="158.95" lengthAdjust="spacing">Where to Talk</text>
              <text x="48.26" y="202.42" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="35.38" lengthAdjust="spacing">Big </text>
              <text x="83.81" y="202.42" font-size="20.83" font-weight="700" fill="#9CC2E5" textLength="55.44" lengthAdjust="spacing">What</text>
              <text x="139.25" y="202.42" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="61.58" lengthAdjust="spacing"> &amp; Big </text>
              <text x="201.05" y="202.42" font-size="20.83" font-weight="700" fill="#9CC2E5" textLength="45.65" lengthAdjust="spacing">Why</text>
              <text x="252.26" y="202.42" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="254.04" lengthAdjust="spacing">(The common problem or </text>
              <text x="48.26" y="227.42" font-size="20.83" fill="#FFFFFF" textLength="446.83" lengthAdjust="spacing">opportunity and why it has relevance to them)</text>
              <text x="523.04" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="55.67" lengthAdjust="spacing">When </text>
              <text x="595.85" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="58.33" lengthAdjust="spacing">you&#8217;re </text>
              <text x="671.31" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="85.54" lengthAdjust="spacing">&#8216;grabbing </text>
              <text x="773.99" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="45.92" lengthAdjust="spacing">their </text>
              <text x="837.05" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="87.96" lengthAdjust="spacing">attention&#8217; </text>
              <text x="942.14" y="191.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="38.21" lengthAdjust="spacing">and </text>
              <text x="523.04" y="212.92" font-size="18.75" fill="#FFFFFF" textLength="377.46" lengthAdjust="spacing">attempting to have them visit your website.</text>
              <text x="1001.19" y="158.23" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="158.23" font-size="18.75" fill="#FFFFFF" textLength="199.29" lengthAdjust="spacing">Social media platforms</text>
              <text x="1001.19" y="180.11" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="180.11" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="217.33" lengthAdjust="spacing">Outbound emails, blogs, </text>
              <text x="1001.19" y="201.98" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="201.98" font-size="18.75" fill="#FFFFFF" textLength="262.76" lengthAdjust="spacing">Seminars / guest appearances</text>
              <text x="1001.19" y="223.86" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="223.86" font-size="18.75" fill="#FFFFFF" textLength="190.22" lengthAdjust="spacing">Hard copy advertising</text>
              <text x="1001.19" y="245.73" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="245.73" font-size="18.75" fill="#FFFFFF" textLength="153.51" lengthAdjust="spacing">E-book giveaways</text>
              <text x="48.26" y="329.62" font-size="20.83" font-weight="700" fill="#F4B081" xml:space="preserve" textLength="190.37" lengthAdjust="spacing">Your Big Promise </text>
              <text x="242.86" y="329.62" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="261.44" lengthAdjust="spacing">(What they can expect to </text>
              <text x="48.26" y="354.62" font-size="20.83" fill="#FFFFFF" textLength="263.1" lengthAdjust="spacing">enjoy IF they deal with you)</text>
              <text x="523.04" y="285.43" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.18" lengthAdjust="spacing">Either, as they engage with your outbound material </text>
              <text x="523.04" y="307.31" font-size="18.75" fill="#FFFFFF" textLength="166.29" lengthAdjust="spacing">via social media or,</text>
              <text x="523.04" y="351.06" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.24" lengthAdjust="spacing">How they get greeted when they land on your </text>
              <text x="523.04" y="372.93" font-size="18.75" fill="#FFFFFF" textLength="242.53" lengthAdjust="spacing">homepage on your website.</text>
              <text x="1001.19" y="296.37" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="296.37" font-size="18.75" fill="#FFFFFF" textLength="173.01" lengthAdjust="spacing">Website home page</text>
              <text x="1001.19" y="318.24" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="318.24" font-size="18.75" fill="#FFFFFF" textLength="188.42" lengthAdjust="spacing">Back of business card</text>
              <text x="1001.19" y="340.12" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="340.12" font-size="18.75" fill="#FFFFFF" textLength="190.22" lengthAdjust="spacing">Hard copy advertising</text>
              <text x="1001.19" y="361.99" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="361.99" font-size="18.75" fill="#FFFFFF" textLength="194.79" lengthAdjust="spacing">Traditional advertising</text>
              <text x="48.26" y="467.84" font-size="20.83" font-weight="700" fill="#A8D08C" textLength="309.33" lengthAdjust="spacing">How you solve their problems</text>
              <text x="523.04" y="433.03" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.18" lengthAdjust="spacing">Once they&#8217;ve decided to take the first step to learn </text>
              <text x="523.04" y="454.90" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.22" lengthAdjust="spacing">more. (click on link, request brochure, arrange </text>
              <text x="523.04" y="476.78" font-size="18.75" fill="#FFFFFF" textLength="119.03" lengthAdjust="spacing">appointment)</text>
              <text x="997.82" y="433.03" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.05" lengthAdjust="spacing">On your &#8216;second page&#8217; of your website; they need to </text>
              <text x="997.82" y="454.90" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.24" lengthAdjust="spacing">have chosen to learn more about HOW you work </text>
              <text x="997.82" y="476.78" font-size="18.75" fill="#FFFFFF" textLength="369.99" lengthAdjust="spacing">with people, so keep your front page brief.</text>
              <text x="48.26" y="604.24" font-size="20.83" font-weight="700" fill="#DD7E6B" textLength="319.33" lengthAdjust="spacing">Why they should deal with you</text>
              <text x="523.04" y="569.43" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.26" lengthAdjust="spacing">Once they&#8217;ve shown they&#8217;re interested in your </text>
              <text x="523.04" y="591.30" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.16" lengthAdjust="spacing">promise, you will seek to illustrate Credibility &amp; </text>
              <text x="523.04" y="613.18" font-size="18.75" fill="#FFFFFF" textLength="410.68" lengthAdjust="spacing">Empathy by explaining their problems in detail.</text>
              <text x="997.82" y="558.49" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.09" lengthAdjust="spacing">On your &#8216;second page&#8217; of your website; they will be </text>
              <text x="997.82" y="580.37" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.2" lengthAdjust="spacing">&#8216;disturbed&#8217; by the problem before you offer a </text>
              <text x="997.82" y="602.24" font-size="18.75" fill="#FFFFFF" textLength="142.89" lengthAdjust="spacing">&#8216;Global&#8217; solution.</text>
              <text x="997.82" y="624.12" font-size="18.75" fill="#FFFFFF" textLength="329.06" lengthAdjust="spacing">(Different ways you work with people)</text>
              <text x="48.26" y="752.80" font-size="20.83" fill="#FFFFFF" textLength="290.33" lengthAdjust="spacing">What/How/Who/When/Where</text>
              <text x="523.04" y="728.92" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="457.24" lengthAdjust="spacing">When the client has sought to learn the &#8216;detail&#8217; </text>
              <text x="523.04" y="750.80" font-size="18.75" fill="#FFFFFF" textLength="341.91" lengthAdjust="spacing">around your solution / &#8216;promised offer&#8217;.</text>
              <text x="1001.19" y="707.05" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="707.05" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="397.56" lengthAdjust="spacing">Selected pages on your website that relate to </text>
              <text x="1033.24" y="728.92" font-size="18.75" fill="#FFFFFF" textLength="200.77" lengthAdjust="spacing">specific solution offers.</text>
              <text x="1001.19" y="750.80" font-size="18.75" fill="#FFFFFF" textLength="7.03" lengthAdjust="spacing">•</text>
              <text x="1033.24" y="750.80" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="406.13" lengthAdjust="spacing">Downloadable brochures, upon completion of </text>
              <text x="1033.24" y="772.67" font-size="18.75" fill="#FFFFFF" textLength="131.68" lengthAdjust="spacing">contact details.</text>
              <text x="38.83" y="63.38" font-size="37.5" fill="#002B64" xml:space="preserve" textLength="673.61" lengthAdjust="spacing">Digital (New Client) On-Boarding as an </text>
              <text x="713.39" y="63.38" font-size="37.5" font-weight="700" fill="#002B64" textLength="523.84" lengthAdjust="spacing">&#8216;Engagement Story-Board&#8217; -1</text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 4) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptDigitalFunnelStoryboardSheet2',

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

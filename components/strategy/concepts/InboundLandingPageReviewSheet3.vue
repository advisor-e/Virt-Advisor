<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="(Inbound) Landing Page Review: Designing Your Landing Page -2">

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
            <path d="M 46.25 131.61 L 178.05 131.61 L 178.05 171.6 L 46.25 171.6 L 46.25 131.61" fill="#11D0C7"></path>
            <path d="M 178.05 131.61 L 458.58 131.61 L 458.58 171.6 L 178.05 171.6 L 178.05 131.61" fill="#002B64"></path>
            <path d="M 458.58 131.61 L 955.65 131.61 L 955.65 171.6 L 458.58 171.6 L 458.58 131.61" fill="#002B64"></path>
            <path d="M 955.65 131.61 L 1452.72 131.61 L 1452.72 171.6 L 955.65 171.6 L 955.65 131.61" fill="#002B64"></path>
            <path d="M 46.25 171.6 L 178.05 171.6 L 178.05 214.2 L 46.25 214.2 L 46.25 171.6" fill="#434343"></path>
            <path d="M 178.05 171.6 L 458.58 171.6 L 458.58 214.2 L 178.05 214.2 L 178.05 171.6" fill="#BBD6EE"></path>
            <path d="M 46.25 214.2 L 178.05 214.2 L 178.05 476.69 L 46.25 476.69 L 46.25 214.2" fill="#434343"></path>
            <path d="M 178.05 214.2 L 458.58 214.2 L 458.58 476.69 L 178.05 476.69 L 178.05 214.2" fill="#BBD6EE"></path>
            <path d="M 46.25 130.83 L 46.25 477.47" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 178.05 130.83 L 178.05 477.47" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 458.58 130.83 L 458.58 477.47" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 955.65 130.83 L 955.65 477.47" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1452.72 130.83 L 1452.72 477.47" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 131.61 L 1453.5 131.61" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 171.6 L 1453.5 171.6" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 214.2 L 1453.5 214.2" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.47 476.69 L 1453.5 476.69" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 46.24 507.12 L 178.05 507.12 L 178.05 547.11 L 46.24 547.11 L 46.24 507.12" fill="#FFFF00"></path>
            <path d="M 178.05 507.12 L 458.57 507.12 L 458.57 547.11 L 178.05 547.11 L 178.05 507.12" fill="#002B64"></path>
            <path d="M 458.57 507.12 L 955.64 507.12 L 955.64 547.11 L 458.57 547.11 L 458.57 507.12" fill="#002B64"></path>
            <path d="M 955.64 507.12 L 1452.71 507.12 L 1452.71 547.11 L 955.64 547.11 L 955.64 507.12" fill="#002B64"></path>
            <path d="M 46.24 547.11 L 178.05 547.11 L 178.05 629.61 L 46.24 629.61 L 46.24 547.11" fill="#434343"></path>
            <path d="M 178.05 547.11 L 458.57 547.11 L 458.57 629.61 L 178.05 629.61 L 178.05 547.11" fill="#BBD6EE"></path>
            <path d="M 46.24 629.61 L 178.05 629.61 L 178.05 734.6 L 46.24 734.6 L 46.24 629.61" fill="#434343"></path>
            <path d="M 178.05 629.61 L 458.57 629.61 L 458.57 734.6 L 178.05 734.6 L 178.05 629.61" fill="#BBD6EE"></path>
            <path d="M 46.24 734.6 L 178.05 734.6 L 178.05 794.59 L 46.24 794.59 L 46.24 734.6" fill="#434343"></path>
            <path d="M 178.05 734.6 L 458.57 734.6 L 458.57 794.59 L 178.05 794.59 L 178.05 734.6" fill="#434343"></path>
            <path d="M 458.57 734.6 L 955.64 734.6 L 955.64 794.59 L 458.57 794.59 L 458.57 734.6" fill="#434343"></path>
            <path d="M 955.64 734.6 L 1452.71 734.6 L 1452.71 794.59 L 955.64 794.59 L 955.64 734.6" fill="#434343"></path>
            <path d="M 46.24 506.34 L 46.24 795.37" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 178.05 506.34 L 178.05 795.37" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 458.57 506.34 L 458.57 795.37" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 955.64 506.34 L 955.64 795.37" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 1452.71 506.34 L 1452.71 795.37" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.46 507.12 L 1453.49 507.12" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.46 547.11 L 1453.49 547.11" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.46 629.61 L 1453.49 629.61" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.46 734.6 L 1453.49 734.6" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <path d="M 45.46 794.59 L 1453.49 794.59" fill="none" stroke="#9E9E9E" stroke-width="1.56"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="56.88" y="93.10" font-size="50.0" fill="#002B64" xml:space="preserve" textLength="746.42" lengthAdjust="spacing">Designing Your Landing Page -2 </text>
              <text x="60.31" y="157.86" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 3</text>
              <text x="192.11" y="157.86" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="472.64" y="157.86" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="969.71" y="157.86" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="60.31" y="197.85" font-size="20.83" fill="#FFFFFF" textLength="41.06" lengthAdjust="spacing">Title</text>
              <text x="192.11" y="195.85" font-size="18.75" fill="#000000" textLength="71.27" lengthAdjust="spacing">Prove it!</text>
              <text x="472.64" y="195.85" font-size="18.75" fill="#000000" textLength="184.26" lengthAdjust="spacing">Let us show it to you.</text>
              <text x="969.71" y="195.85" font-size="18.75" fill="#000000" textLength="145.93" lengthAdjust="spacing">See For Yourself!</text>
              <text x="60.31" y="240.45" font-size="20.83" fill="#FFFFFF" textLength="54.6" lengthAdjust="spacing">Video</text>
              <text x="192.11" y="238.45" font-size="18.75" fill="#000000" xml:space="preserve" textLength="242.48" lengthAdjust="spacing">Okay this sounds good, but </text>
              <text x="192.11" y="260.95" font-size="18.75" fill="#000000" xml:space="preserve" textLength="232.03" lengthAdjust="spacing">what would all of this look </text>
              <text x="192.11" y="283.45" font-size="18.75" fill="#000000" textLength="117.37" lengthAdjust="spacing">like in action?</text>
              <text x="472.64" y="238.45" font-size="18.75" fill="#000000" xml:space="preserve" textLength="467.61" lengthAdjust="spacing">Allow the reader to have a visual example of what we </text>
              <text x="472.64" y="260.95" font-size="18.75" fill="#000000" textLength="253.88" lengthAdjust="spacing">do to deliver on our promise.</text>
              <text x="969.71" y="238.45" font-size="18.75" fill="#000000" textLength="158.38" lengthAdjust="spacing">Show our facilities</text>
              <text x="969.71" y="260.95" font-size="18.75" fill="#000000" textLength="315.84" lengthAdjust="spacing">Show the lab technicians doing yoga</text>
              <text x="969.71" y="283.45" font-size="18.75" fill="#000000" xml:space="preserve" textLength="398.36" lengthAdjust="spacing">Show us carrying the ingredients through the </text>
              <text x="969.71" y="305.95" font-size="18.75" fill="#000000" textLength="191.08" lengthAdjust="spacing">Mongolian mountains</text>
              <text x="969.71" y="328.45" font-size="18.75" fill="#000000" textLength="419.47" lengthAdjust="spacing">Show us blending the mixture late into the night</text>
              <text x="969.71" y="350.95" font-size="18.75" fill="#000000" xml:space="preserve" textLength="449.19" lengthAdjust="spacing">Show customers eating our doughnut and bursting </text>
              <text x="969.71" y="373.45" font-size="18.75" fill="#000000" textLength="101.98" lengthAdjust="spacing">with energy</text>
              <text x="969.71" y="395.95" font-size="18.75" fill="#000000" xml:space="preserve" textLength="447.32" lengthAdjust="spacing">Show our customers getting promoted after eating </text>
              <text x="969.71" y="418.45" font-size="18.75" fill="#000000" textLength="129.73" lengthAdjust="spacing">our doughnuts</text>
              <text x="969.71" y="440.95" font-size="18.75" fill="#000000" xml:space="preserve" textLength="432.49" lengthAdjust="spacing">(What we want them to Know, Feel, Do about our </text>
              <text x="969.71" y="463.45" font-size="18.75" fill="#000000" textLength="74.49" lengthAdjust="spacing">product)</text>
              <text x="60.30" y="533.37" font-size="20.83" fill="#000000" textLength="88.33" lengthAdjust="spacing">Section 4</text>
              <text x="192.11" y="533.37" font-size="20.83" fill="#FFFFFF" textLength="134.23" lengthAdjust="spacing">Readers Logic</text>
              <text x="472.63" y="533.37" font-size="20.83" fill="#FFFFFF" textLength="184.98" lengthAdjust="spacing">Landing Page Logic</text>
              <text x="969.70" y="533.37" font-size="20.83" fill="#FFFFFF" textLength="204.19" lengthAdjust="spacing">Marketing Statement</text>
              <text x="60.30" y="573.36" font-size="20.83" fill="#FFFFFF" textLength="41.06" lengthAdjust="spacing">Title</text>
              <text x="192.11" y="571.36" font-size="18.75" fill="#000000" xml:space="preserve" textLength="162.84" lengthAdjust="spacing">Alright, I&#8217;m getting </text>
              <text x="192.11" y="593.86" font-size="18.75" fill="#000000" xml:space="preserve" textLength="242.98" lengthAdjust="spacing">convinced, but how would I </text>
              <text x="192.11" y="616.36" font-size="18.75" fill="#000000" textLength="102.6" lengthAdjust="spacing">get started?</text>
              <text x="472.63" y="571.36" font-size="18.75" fill="#000000" textLength="282.49" lengthAdjust="spacing">Here&#8217;s what we want you to do...</text>
              <text x="969.70" y="571.36" font-size="18.75" fill="#000000" textLength="319.35" lengthAdjust="spacing">3 Steps to Your Weight Loss Success!</text>
              <text x="60.30" y="655.86" font-size="20.83" fill="#FFFFFF" textLength="73.94" lengthAdjust="spacing">Subtitle</text>
              <text x="192.11" y="653.86" font-size="18.75" fill="#000000" xml:space="preserve" textLength="213.54" lengthAdjust="spacing">What do I need to do, in </text>
              <text x="192.11" y="679.73" font-size="18.75" fill="#000000" textLength="83.91" lengthAdjust="spacing">sequence</text>
              <text x="472.63" y="653.86" font-size="18.75" fill="#000000" xml:space="preserve" textLength="443.51" lengthAdjust="spacing">Sequence suggests movement, we want you to act </text>
              <text x="472.63" y="676.36" font-size="18.75" fill="#000000" textLength="37.27" lengthAdjust="spacing">now</text>
              <text x="969.70" y="653.86" font-size="18.75" fill="#000000" textLength="286.37" lengthAdjust="spacing">Step 1. Weigh yourself - picture 1</text>
              <text x="969.70" y="676.36" font-size="18.75" fill="#000000" xml:space="preserve" textLength="447.06" lengthAdjust="spacing">Step 2. Decide how much weight you want to lose - </text>
              <text x="969.70" y="698.86" font-size="18.75" fill="#000000" textLength="77.06" lengthAdjust="spacing">picture 2</text>
              <text x="969.70" y="721.36" font-size="18.75" fill="#000000" textLength="319.61" lengthAdjust="spacing">Step 3. Sign up for our free taste test</text>
              <text x="60.30" y="760.85" font-size="20.83" fill="#FFFFFF" textLength="67.6" lengthAdjust="spacing">Widget</text>
              <text x="192.11" y="758.85" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="241.18" lengthAdjust="spacing">I&#8217;ve seen enough, what do I </text>
              <text x="192.11" y="781.35" font-size="18.75" fill="#FFFFFF" textLength="72.94" lengthAdjust="spacing">do now?</text>
              <text x="472.63" y="758.85" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="463.56" lengthAdjust="spacing">Call to Action (CTA) button - take them to 1st stage in </text>
              <text x="472.63" y="781.35" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="156.21" lengthAdjust="spacing">our sales process </text>
              <text x="969.70" y="758.85" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="471.38" lengthAdjust="spacing">Call to Action (CTA) button - linking to &#8216;free taste test&#8217; - </text>
              <text x="969.70" y="781.35" font-size="18.75" fill="#FFFFFF" xml:space="preserve" textLength="379.03" lengthAdjust="spacing">give their name, cell ph number &amp; address. </text>
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
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 9) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptInboundLandingPageReviewSheet3',

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

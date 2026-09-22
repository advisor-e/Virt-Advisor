<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Customer Loyalty Programme">
            <g font-family="Open Sans, sans-serif">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <text x="56.9" y="100.3" font-size="50.0" fill="#002b64" textLength="693.3" lengthAdjust="spacing">Customer Loyalty Programme</text>
            <text x="765.6" y="100.3" font-size="20.8" fill="#002b64" textLength="178.0" lengthAdjust="spacing">(Quick Takeaways)</text>
            <circle cx="63.8" cy="163.9" r="2.60" fill="#434343"></circle>
            <text x="86.0" y="169.5" font-size="18.8" fill="#434343" textLength="1339.9" lengthAdjust="spacing">The emphasis of a loyalty programme is to REDUCE the COST of GAINING a CUSTOMER and/or to EXTEND the FREQUENCY and AVERAGE SPEND of your</text>
            <text x="86.0" y="191.4" font-size="18.8" fill="#434343" textLength="1338.9" lengthAdjust="spacing">EXISTING customers. If you don’t have any points of measure to see who is purchasing more often you’ll never know for sure if its working.   (as an</text>
            <text x="86.0" y="213.2" font-size="18.8" fill="#434343" textLength="1338.9" lengthAdjust="spacing">example – a customer loyalty card at a cafe but no customer name on it or date when issued – you can track how many free cups of coffee you give away</text>
            <text x="86.0" y="235.1" font-size="18.8" fill="#434343" textLength="1205.7" lengthAdjust="spacing">but have no idea if its contributing to ‘LOYALTY’ expressed as more purchases in a certain time. It’s not a loyalty card; it&#x27;s a free coffee card)</text>
            <circle cx="63.8" cy="286.8" r="2.60" fill="#434343"></circle>
            <text x="86.0" y="292.4" font-size="18.8" fill="#434343" textLength="1339.0" lengthAdjust="spacing">LOYALTY may also be expressed in terms of referrals provided (especially in big-ticket items where the need is not required on a frequent basis) This is</text>
            <text x="86.0" y="314.8" font-size="18.8" fill="#434343" textLength="457.4" lengthAdjust="spacing">where your ‘Friend Get Friend deal comes into play...</text>
            <circle cx="63.8" cy="366.5" r="2.60" fill="#434343"></circle>
            <text x="86.0" y="372.1" font-size="18.8" fill="#434343" textLength="1339.2" lengthAdjust="spacing">Try to GAIN SPENDING LEVERAGE in your programme (such as arranging a deal with a local restaurant where they want more customers; you pay $100</text>
            <text x="86.0" y="394.5" font-size="18.8" fill="#434343" textLength="882.9" lengthAdjust="spacing">for a dinner voucher but they provide a ‘Face Value’ voucher for $140 making it much more attractive)</text>
            <circle cx="63.8" cy="446.2" r="2.60" fill="#002b64"></circle>
            <text x="86.0" y="451.8" font-size="18.8" fill="#002b64" font-weight="700" textLength="1339.3" lengthAdjust="spacing">Remember to include UCD’s (Unexpected Customer Delights) as part of your programme to increase referrals; as an example – you mail out a</text>
            <text x="86.0" y="474.2" font-size="18.8" fill="#002b64" font-weight="700" textLength="1339.1" lengthAdjust="spacing">voucher for something 6 weeks after they’ve bought ‘out of the blue’ to increase their ‘Excitement Period’. As they say, being REMARKABLE is</text>
            <text x="86.0" y="496.1" font-size="18.8" fill="#002b64" font-weight="700" textLength="339.0" lengthAdjust="spacing">being ABLE to be REMARKED about...</text>
            <circle cx="63.8" cy="547.7" r="2.60" fill="#434343"></circle>
            <text x="86.0" y="553.3" font-size="18.8" fill="#434343" textLength="1339.0" lengthAdjust="spacing">Make sure your loyalty programme is in support of your product fit; rather than INSTEAD of it. (as an example – SKY TV in NZ offered a ‘partner discount</text>
            <text x="86.0" y="575.7" font-size="18.8" fill="#434343" textLength="1339.2" lengthAdjust="spacing">programme’ to offset the massive customer defections but it’s worthless to a customer if the CORE PRODUCT is at fault. – Netflix &amp; Live Stream offers</text>
            <text x="86.0" y="597.6" font-size="18.8" fill="#434343" textLength="397.5" lengthAdjust="spacing">MUCH MORE choice as well as being cheaper)</text>
            <circle cx="63.8" cy="649.3" r="2.60" fill="#434343"></circle>
            <text x="86.0" y="654.9" font-size="18.8" fill="#434343" textLength="1339.1" lengthAdjust="spacing">If you’re developing a Loyalty Programme but have yet to establish a regular feedback loop to learn of customer issues (and positive feedback) then</text>
            <text x="86.0" y="677.3" font-size="18.8" fill="#434343" textLength="1339.1" lengthAdjust="spacing">you’ve skipped a step. ONLY after you’ve researched what it is about your current service/product offer that your customers enjoy, can you hope to</text>
            <text x="86.0" y="699.2" font-size="18.8" fill="#434343" textLength="416.6" lengthAdjust="spacing">deliver something to ENHANCE that experience.</text>
            </g>
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
 * Lifted from design/mockups/strategy-concept-batch-5.html (drawing 9) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptCustomerLoyaltyProgramme',

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

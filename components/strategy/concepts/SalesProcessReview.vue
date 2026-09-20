<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Sales Process Review">
            <g font-family="Open Sans, sans-serif">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <text x="55.9" y="92.8" font-size="50.0" fill="#002b64" textLength="619.1" lengthAdjust="spacing">Identifying the Sales Arena</text>
            <text x="55.9" y="158.2" font-size="20.8" fill="#434343" textLength="825.0" lengthAdjust="spacing">What&#x27;s the difference between &#x27;point of sale‘, &#x27;consultancy style&#x27; and ‘territory’ selling?</text>
            <text x="130.9" y="203.0" font-size="20.8" fill="#002b64" font-weight="700" textLength="604.5" lengthAdjust="spacing">Point of sale is more product, features/benefits oriented</text>
            <text x="742.1" y="203.0" font-size="20.8" fill="#434343" textLength="686.2" lengthAdjust="spacing">with a greater emphasis being placed on the close as the motive for</text>
            <text x="55.9" y="231.6" font-size="20.8" fill="#434343" textLength="1373.2" lengthAdjust="spacing">purchase is assumed to be clear to the customer prior to them approaching you.  It is considered more traditional [retail] type selling. In many</text>
            <text x="55.9" y="259.7" font-size="20.8" fill="#434343" textLength="1373.0" lengthAdjust="spacing">cases, business between the two parties may never be repeated. Tendering tends to fit into this category as the need/want is defined so the</text>
            <text x="55.9" y="287.9" font-size="20.8" fill="#434343" textLength="1373.1" lengthAdjust="spacing">focus shifts to clarifying the expectations, highlighting (and solving) complexity that the client may have been unaware of and ultimately,</text>
            <text x="55.9" y="316.0" font-size="20.8" fill="#434343" textLength="550.0" lengthAdjust="spacing">flushing out HOW THEY VALUE certain aspects of the job.</text>
            <text x="130.9" y="406.1" font-size="20.8" fill="#002b64" font-weight="700" textLength="201.4" lengthAdjust="spacing">Consultancy selling</text>
            <text x="338.5" y="406.1" font-size="20.8" fill="#434343" textLength="470.8" lengthAdjust="spacing">usually occurs over a greater length of time with</text>
            <text x="816.7" y="406.1" font-size="20.8" fill="#002b64" font-weight="700" textLength="613.6" lengthAdjust="spacing">more emphasis being placed  on the &#x27;investigative&#x27; aspects</text>
            <text x="55.9" y="434.7" font-size="20.8" fill="#434343" textLength="1373.2" lengthAdjust="spacing">of the clients needs, as well as the business relationship itself.  Doing business is often the beginning of the new relationship, rather than the</text>
            <text x="55.9" y="462.9" font-size="20.8" fill="#434343" textLength="42.6" lengthAdjust="spacing">end.</text>
            <text x="130.9" y="553.0" font-size="20.8" fill="#002b64" font-weight="700" textLength="310.5" lengthAdjust="spacing">Territory Management selling</text>
            <text x="448.4" y="553.0" font-size="20.8" fill="#434343" textLength="296.8" lengthAdjust="spacing">{‘Repping’ to existing clients} is</text>
            <text x="753.3" y="553.0" font-size="20.8" fill="#002b64" font-weight="700" textLength="265.2" lengthAdjust="spacing">a combination of the two</text>
            <text x="1024.6" y="553.0" font-size="20.8" fill="#434343" textLength="58.6" lengthAdjust="spacing">above</text>
            <text x="1090.2" y="553.0" font-size="20.8" fill="#002b64" font-weight="700" textLength="339.2" lengthAdjust="spacing">but emphasis must be placed on</text>
            <text x="55.9" y="581.6" font-size="20.8" fill="#002b64" font-weight="700" textLength="337.1" lengthAdjust="spacing">establishing ‘strategic relations’.</text>
            <text x="399.1" y="581.6" font-size="20.8" fill="#434343" textLength="1030.3" lengthAdjust="spacing">That is to say, the client should welcome the salesperson as someone who can add value to their business</text>
            <text x="55.9" y="609.7" font-size="20.8" fill="#434343" textLength="714.1" lengthAdjust="spacing">on a wider scope than that which relates purely to the product being sold.</text>
            <text x="55.9" y="699.8" font-size="20.8" fill="#434343" textLength="1372.6" lengthAdjust="spacing">(An example of this would be a rep that deals with ‘top end’ stereo equipment, retailed by boutique stores. If the sales rep could offer</text>
            <text x="55.9" y="728.5" font-size="20.8" fill="#434343" textLength="1372.5" lengthAdjust="spacing">intelligent suggestions to the store owner regarding the marketing and branding of the store, he/she would differentiate from the</text>
            <text x="55.9" y="756.6" font-size="20.8" fill="#434343" textLength="512.1" lengthAdjust="spacing">competition and enjoy more open business dealings)</text>
            </g>
            <g class="firm-mark">
              <circle class="fm-disc" cx="125" cy="800" r="22" :fill="firmColour"></circle>
              <text class="fm-init" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-batch-5.html (drawing 11) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'SalesProcessReview',

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

    /** The firm's colour, as a CSS colour. */
    firmColour: {
      type: String,
      default: '#0070c0'
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

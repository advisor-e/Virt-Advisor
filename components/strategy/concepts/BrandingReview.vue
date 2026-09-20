<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Branding Review">
            <g font-family="Open Sans, sans-serif">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <path d="M 611.36 372.59 L 881.87 372.59 L 881.87 374.47 L 611.36 374.47 L 611.36 372.59 Z" fill="#434343" fill-rule="evenodd"></path>
            <path d="M 373.42 547.59 L 589.01 547.59 L 589.01 549.47 L 373.42 549.47 L 373.42 547.59 Z" fill="#434343" fill-rule="evenodd"></path>
            <path d="M 870.45 547.59 L 1006.40 547.59 L 1006.40 549.47 L 870.45 549.47 L 870.45 547.59 Z" fill="#434343" fill-rule="evenodd"></path>
            <text x="56.9" y="93.1" font-size="50.0" fill="#002b64" textLength="210.3" lengthAdjust="spacing">Branding</text>
            <text x="282.1" y="93.1" font-size="20.8" fill="#002b64" textLength="170.5" lengthAdjust="spacing">(quick takeaways)</text>
            <text x="56.9" y="153.9" font-size="18.8" fill="#002b64" textLength="937.7" lengthAdjust="spacing">“Your brand is what people say about you (your company/product) when you’re not in the room.” Jeff Bezos.</text>
            <circle cx="63.4" cy="207.2" r="2.60" fill="#434343"></circle>
            <text x="86.1" y="213.4" font-size="20.8" fill="#434343" textLength="1353.8" lengthAdjust="spacing">Imagery &amp; Messaging MUST BE CONGRUENT; that is to say, they must align your product or service to the POSITION you want to hold in</text>
            <text x="86.1" y="242.1" font-size="20.8" fill="#434343" textLength="303.5" lengthAdjust="spacing">your TARGET customer’s MIND.</text>
            <text x="402.7" y="242.1" font-size="20.8" fill="#434343" font-style="italic" textLength="825.1" lengthAdjust="spacing">(If you wish to project quality and exclusivity your packaging and price must reflect this...)</text>
            <text x="1234.6" y="242.1" font-size="20.8" fill="#434343" textLength="206.0" lengthAdjust="spacing">Remember, branding</text>
            <text x="86.1" y="270.2" font-size="20.8" fill="#434343" textLength="1353.4" lengthAdjust="spacing">is about creating positive associations for your customer therefore, you must know what they want and be realistic about the association</text>
            <text x="86.1" y="298.3" font-size="20.8" fill="#434343" textLength="1199.3" lengthAdjust="spacing">you can create. Approach the task from the customers view and ask “If I had these ingredients, what would I make of them?”</text>
            <circle cx="63.4" cy="365.0" r="2.60" fill="#434343"></circle>
            <text x="86.1" y="371.2" font-size="20.8" fill="#434343" textLength="1353.3" lengthAdjust="spacing">Your MESSAGING must be consistent (in theme) but NOT NECESSARILY Identical. (What you put in writing may be bolder than what you</text>
            <text x="86.1" y="399.9" font-size="20.8" fill="#434343" textLength="318.3" lengthAdjust="spacing">might say in person for example)</text>
            <circle cx="63.4" cy="466.6" r="2.60" fill="#434343"></circle>
            <text x="86.1" y="472.8" font-size="20.8" fill="#434343" textLength="839.7" lengthAdjust="spacing">IMAGERY must always be consistent (since its purpose is to create mental associations)</text>
            <circle cx="63.4" cy="540.0" r="2.60" fill="#434343"></circle>
            <text x="86.1" y="546.2" font-size="20.8" fill="#434343" textLength="1354.8" lengthAdjust="spacing">Remember, your PROSPECTS care more about what your CURRENT CUSTOMERS say about you (and your product) than YOU DO. Therefore,</text>
            <text x="86.1" y="574.9" font-size="20.8" fill="#434343" textLength="1353.5" lengthAdjust="spacing">your marketing statements must be supported by customer opinion; if you’re messaging about how you add value but your customers see</text>
            <text x="86.1" y="603.0" font-size="20.8" fill="#434343" textLength="660.9" lengthAdjust="spacing">you adding value another way, you’re wasting your marketing dollar.</text>
            <circle cx="63.4" cy="669.7" r="2.60" fill="#434343"></circle>
            <text x="86.1" y="675.9" font-size="20.8" fill="#434343" textLength="1354.1" lengthAdjust="spacing">The HOLY GRAIL of branding (in my opinion) is when you have an IMAGE, A STORY and A PROMISE that EASILY EXPLAINS what makes you</text>
            <text x="86.1" y="704.6" font-size="20.8" fill="#434343" textLength="649.6" lengthAdjust="spacing">different and (importantly) HOW THAT BENEFITS YOUR CUSTOMER.</text>
            <text x="741.9" y="704.6" font-size="20.8" fill="#002b64" font-weight="700" textLength="109.1" lengthAdjust="spacing">(all in one)</text>
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
 * Lifted from design/mockups/strategy-concept-batch-5.html (drawing 8) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'BrandingReview',

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

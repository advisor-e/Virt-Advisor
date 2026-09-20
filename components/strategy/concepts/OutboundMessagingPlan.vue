<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="(Outbound) Messaging Plan">
            <g font-family="Open Sans, sans-serif">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <text x="56.9" y="93.1" font-size="50.0" fill="#002b64" textLength="1059.7" lengthAdjust="spacing">Building Your Outbound Communication Plan</text>
            <text x="70.9" y="174.4" font-size="20.8" fill="#434343" textLength="1359.1" lengthAdjust="spacing">Your communication plan is simply a scheduling task to see when you plan to create and deliver your marketing message. This is an</text>
            <text x="70.9" y="203.0" font-size="20.8" fill="#434343" textLength="1225.7" lengthAdjust="spacing">extremely simple yet most vital task; most messaging campaigns fall over because they were never scheduled in the first place!</text>
            <text x="70.9" y="293.1" font-size="20.8" fill="#434343" textLength="633.2" lengthAdjust="spacing">Building your communication plan requires you to consider the</text>
            <text x="714.0" y="293.1" font-size="20.8" fill="#002b64" font-weight="700" textLength="100.4" lengthAdjust="spacing">MEDIUMS</text>
            <text x="820.8" y="293.1" font-size="20.8" fill="#434343" textLength="608.5" lengthAdjust="spacing">you use; what should you say via video to get better results,</text>
            <text x="70.9" y="321.8" font-size="20.8" fill="#434343" textLength="1359.2" lengthAdjust="spacing">what’s best to put in writing in the form of a blog, what should be delivered via an e-book or public speech? Remember also that some of</text>
            <text x="70.9" y="349.9" font-size="20.8" fill="#434343" textLength="305.1" lengthAdjust="spacing">your points should be repeated</text>
            <text x="382.7" y="349.9" font-size="20.8" fill="#002b64" textLength="349.7" lengthAdjust="spacing">(Theme/Concept and Key Principles)</text>
            <text x="739.0" y="349.9" font-size="20.8" fill="#434343" textLength="69.0" lengthAdjust="spacing">but the</text>
            <text x="814.6" y="349.9" font-size="20.8" fill="#002b64" textLength="68.5" lengthAdjust="spacing">(Detail)</text>
            <text x="889.4" y="349.9" font-size="20.8" fill="#434343" textLength="541.6" lengthAdjust="spacing">should vary from time to time across mediums, in order</text>
            <text x="70.9" y="378.0" font-size="20.8" fill="#434343" textLength="605.6" lengthAdjust="spacing">to maintain interest and ‘build desire’ for your customer to act.</text>
            <text x="70.9" y="468.1" font-size="20.8" fill="#434343" textLength="670.8" lengthAdjust="spacing">Building your communication also plan requires you to consider the</text>
            <text x="750.4" y="468.1" font-size="20.8" fill="#002b64" font-weight="700" textLength="124.0" lengthAdjust="spacing">PLATFORMS</text>
            <text x="880.7" y="468.1" font-size="20.8" fill="#434343" textLength="549.7" lengthAdjust="spacing">you use; what should you say via Facebook vs LinkedIn.</text>
            <text x="70.9" y="496.8" font-size="20.8" fill="#434343" textLength="1359.2" lengthAdjust="spacing">Should you be using Instagram or Tik-Tok? Choosing your platform will often come down to knowing the age and user preferences of your</text>
            <text x="70.9" y="524.9" font-size="20.8" fill="#434343" textLength="1211.2" lengthAdjust="spacing">target customer but it will also be limited by what you’re experienced with, so be prepared to learn new platforms if required.</text>
            <text x="70.9" y="615.0" font-size="20.8" fill="#434343" textLength="483.4" lengthAdjust="spacing">The final components of your plan come down to</text>
            <text x="562.1" y="615.0" font-size="20.8" fill="#002b64" font-weight="700" textLength="180.3" lengthAdjust="spacing">TIME and MONEY</text>
            <text x="742.4" y="615.0" font-size="20.8" fill="#434343" textLength="687.9" lengthAdjust="spacing">. Think about the timing of your marketing efforts against all the other</text>
            <text x="70.9" y="643.6" font-size="20.8" fill="#434343" textLength="1359.1" lengthAdjust="spacing">activities that need to be completed within your business. Consider also, the timing and ‘building up’ of your story to drive engagement</text>
            <text x="70.9" y="671.8" font-size="20.8" fill="#434343" textLength="1358.9" lengthAdjust="spacing">during a time that your customers are more likely to transact. It’s great to try and advertise to ‘fill a seasonal hole’ but be careful to notice</text>
            <text x="70.9" y="699.9" font-size="20.8" fill="#434343" textLength="926.2" lengthAdjust="spacing">the drivers behind the seasonal hole, else you can end up ‘laying bait when the fish have gone’...</text>
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
 * Lifted from design/mockups/strategy-concept-batch-5.html (drawing 5) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptOutboundMessagingPlan',

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

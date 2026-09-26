<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Maslow's Hierarchy. Five levels of need drawn as a pyramid, from Physiological at the base to Self-Actualisation at the top.">
            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>
            <path d="M 248.31 806.23 L 486.2 527.52 L 719.85 806.23 L 248.31 806.23" fill="#1E4E79" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 475.33 757.64 H 1456.42 V 793.61 H 475.33 Z" fill="#FFFFFF"></path>
            <path d="M 475.33 707.0 H 1464.53 V 742.97 H 475.33 Z" fill="#FFFFFF"></path>
            <path d="M 475.33 656.1 H 1456.42 V 692.07 H 475.33 Z" fill="#FFFFFF"></path>
            <path d="M 475.33 605.46 H 1456.42 V 641.43 H 475.33 Z" fill="#FFFFFF"></path>
            <path d="M 475.33 554.82 H 1456.42 V 590.8 H 475.33 Z" fill="#FFFFFF"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="68.86" y="102.24" font-size="50.0" fill="#002B64" textLength="448.7" lengthAdjust="spacing">Maslow’s Hierarchy</text>
              <text x="78.85" y="188.53" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1358.56" lengthAdjust="spacing">Abraham Maslow was a psychologist who studied the likes of Albert Einstein and Eleanor Roosevelt in developing his “Theory of Human </text>
              <text x="78.85" y="210.41" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1358.33" lengthAdjust="spacing">Motivation” which was published in 1943. His theory was that by studying the greatest minds, he could identify the success order of </text>
              <text x="78.85" y="232.28" font-size="20.83" fill="#434343" textLength="268.0" lengthAdjust="spacing">psychology and philosophy.</text>
              <text x="78.85" y="309.89" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1358.58" lengthAdjust="spacing">In essence, Maslow’ believed that an individual could only successfully focus on the next level of psychological development, once they had </text>
              <text x="78.85" y="332.28" font-size="20.83" fill="#434343" textLength="351.67" lengthAdjust="spacing">attained satisfaction in the previous.</text>
              <text x="78.85" y="409.89" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1358.15" lengthAdjust="spacing">The highest order, Self Actualisation, was about an individual ‘knowing who they are’, (“What a man can be, he must be”) and striving to </text>
              <text x="78.85" y="432.28" font-size="20.83" fill="#434343" textLength="678.23" lengthAdjust="spacing">reach their potential, whilst knowing perfection can never be attained.</text>
              <text x="78.85" y="509.89" font-size="20.83" fill="#434343" xml:space="preserve" textLength="1358.46" lengthAdjust="spacing">Lower-order needs (Deficiency based) include the bottom 4. Lower-order needs relate to concerns for social and physical well-being. </text>
              <text x="78.85" y="532.28" font-size="20.83" fill="#434343" textLength="753.42" lengthAdjust="spacing">Higher-order needs relate to desires for psychological development &amp; growth.</text>
              <text x="486.27" y="782.33" font-size="20.83" fill="#002B64" xml:space="preserve" textLength="700.27" lengthAdjust="spacing">Physiological         – Survival, Food, Water, Sleep, Excretion, Reproduction</text>
              <text x="486.27" y="731.69" font-size="20.83" fill="#002B64" xml:space="preserve" textLength="709.67" lengthAdjust="spacing">Safety               – Comfort, Security, Freedom from Fear, Stability, Certainty</text>
              <text x="486.27" y="680.78" font-size="20.83" fill="#002B64" xml:space="preserve" textLength="574.21" lengthAdjust="spacing">Social                – Belongingness, Acceptance, Love, Affection</text>
              <text x="486.27" y="630.15" font-size="20.83" fill="#002B64" xml:space="preserve" textLength="609.9" lengthAdjust="spacing">Self-Esteem         – Recognition, Contribution, Respect of Others</text>
              <text x="486.27" y="579.51" font-size="20.83" fill="#002B64" xml:space="preserve" textLength="681.13" lengthAdjust="spacing">Self-Actualisation   – Morality, Lack of Prejudice, Realising Full Potential</text>
            </g>
            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
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
 * Lifted from design/mockups/strategy-concept-alignment-statements.html (drawing 1) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptAlignmentStatements',

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

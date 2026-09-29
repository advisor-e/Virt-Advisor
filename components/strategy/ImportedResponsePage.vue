<template lang="pug">
.irp
  imported-concept-page(
    :svg="page.svg"
    :width="page.width"
    :height="page.height"
    :firm-name="firmName"
    :firm-colour="firmColour"
    :firm-logo="firmLogo"
  )
    .irp-box(
      v-for="b in boxes"
      :key="b.key"
      :style="placeOf(b)"
    )
      //- Measured, never seen: the fitting tries each size in here, so the answer shown beside
      //- it is only ever set once it is known to fit.
      .irp-text.irp-measure(ref="measure" :data-key="b.key" aria-hidden="true")
      .irp-text(:style="{ fontSize: fitOf(b).size + 'cqw' }") {{ fitOf(b).inBox }}
  //- 🔴 AN ANSWER TOO LONG FOR ITS BOX CONTINUES HERE, UNDER THE BOX'S OWN LABEL — question 7.
  //- Never cut off: the box ends in an ellipsis and the rest of the words follow.
  dl.irp-more(v-if="overflowing.length")
    template(v-for="b in overflowing")
      dt(:key="b.key + 't'") {{ b.label }}
      dd(:key="b.key + 'd'") {{ fitOf(b).rest }}
</template>

<script>
import ImportedConceptPage from '~/components/strategy/ImportedConceptPage.vue'
import { ANSWER_SIZES, fitAnswer } from '~/utils/conceptBoxes'

/**
 * ImportedResponsePage — an imported concept's Response Form in the client's plan (item 15.20,
 * piece 4), with each answer written inside the box the manager marked for it.
 *
 * 🔴 QUESTION 7, RULED BY MIKE 2026-09-24: "Each answer is written inside its own box on the
 * Response Form page, shrinking to fit, and continues below the page under the box's label only
 * when it is too long — never cut off. The separate answers table is not built."
 *
 * ⚠ THE FIT IS MEASURED, SO IT ONLY HAPPENS IN A BROWSER. Until then — on the server, and
 * wherever the page is not laid out — every answer sits in its box whole at the largest size,
 * which is the safe way to be wrong: the words are all there, merely unshrunk. Sizes are in
 * `cqw`, a share of the plan page's width, and the boxes are shares of the page too, so a fit
 * measured on screen holds on the printed sheet.
 */
export default {
  name: 'ImportedResponsePage',

  components: { ImportedConceptPage },

  props: {
    /** The Response Form's converted page. */
    page: {
      type: Object,
      required: true,
      validator: p => p && typeof p.svg === 'string' && p.width > 0 && p.height > 0
    },
    /**
     * The marked boxes in drawn order, each with the client's answer.
     * @type {Array<{key: string, label: string, value: string, x: number, y: number, w: number, h: number}>}
     */
    boxes: {
      type: Array,
      required: true,
      validator: bs => bs.every(b => b && typeof b.key === 'string' && typeof b.label === 'string')
    },
    /** The advisor firm's name, beside the disc when there is no logo. */
    firmName: { type: String, default: '' },
    /** The firm's colour — the frame and the disc. */
    firmColour: { type: String, default: '#0070c0' },
    /** The firm's real logo, an absolute http(s) URL; empty shows the disc. */
    firmLogo: { type: String, default: '' }
  },

  data () {
    return {
      /** key → `fitAnswer` result, once measured. */
      fitted: {}
    }
  },

  computed: {
    /** The boxes whose answer did not all fit, in drawn order. */
    overflowing () {
      return this.boxes.filter(b => this.fitOf(b).rest)
    }
  },

  watch: {
    boxes () {
      this.$nextTick(this.fit)
    }
  },

  mounted () {
    this.$nextTick(this.fit)
    // The fonts a printed page settles on can differ from the screen's by a hair; measure again.
    window.addEventListener('beforeprint', this.fit)
  },

  beforeDestroy () {
    window.removeEventListener('beforeprint', this.fit)
  },

  methods: {
    /**
     * @param {{x: number, y: number, w: number, h: number}} b
     * @returns {object} the box's place on the page, as shares of it
     */
    placeOf (b) {
      return { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%' }
    },

    /**
     * @param {{key: string, value: string}} b
     * @returns {{size: number, inBox: string, rest: string}}
     */
    fitOf (b) {
      return this.fitted[b.key] || { size: ANSWER_SIZES[0], inBox: b.value || '', rest: '' }
    },

    /** Measure every answer against its box. A box not laid out is left whole, never emptied. */
    fit () {
      const byKey = {}
      ;(this.$refs.measure || []).forEach((el) => { byKey[el.dataset.key] = el })
      const fitted = {}
      this.boxes.forEach((b) => {
        const el = byKey[b.key]
        if (!el || !el.clientHeight) { return }
        fitted[b.key] = fitAnswer(b.value, (text, size) => {
          el.style.fontSize = size + 'cqw'
          el.textContent = text
          return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1
        })
        // 🔴 EMPTIED, NOT MERELY HIDDEN. The plan's print mode forces every element in the
        // document visible (`body.sp-printing .spd *` in pages/strategy-planner.vue), so a hidden
        // layer still holding its last attempt printed over the real answer. Found printing.
        el.textContent = ''
      })
      this.fitted = fitted
    }
  }
}
</script>

<style scoped>
.irp-box { position: absolute; }
.irp-text {
  position: absolute;
  inset: 0;
  padding: 0.3cqw 0.45cqw;
  overflow: hidden;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  line-height: 1.25;
  color: #23405f;
}
.irp-measure { visibility: hidden; }

/* The same shape as the plan's own answer list, so a continued answer reads as part of it. */
.irp-more dt {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin-top: 12px;
}
.irp-more dd {
  color: #23405f;
  margin: 2px 0 0;
  white-space: pre-wrap;
}
</style>

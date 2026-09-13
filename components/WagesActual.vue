<template lang="pug">
.wa-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  hero-strip(:columns="3")
    hero-figure(
      :label="$t('report.wagesReview.actual.heroYear')"
      :value="money(yearActual)"
      :tone="yearActual < 0 ? 'crit' : 'default'"
    )
    hero-figure(:label="$t('report.wagesReview.actual.heroEntered')" :value="monthsEntered + ' / ' + rows.length")
    hero-figure(
      :label="$t('report.wagesReview.actual.heroWorst')"
      :value="worstMonth"
      :tone="worstIsLoss ? 'crit' : 'default'"
    )

  .wa-card
    h3.wa-title {{ $t('report.wagesReview.actual.title') }}
    p.wa-note {{ $t('report.wagesReview.actual.note') }}
    .wa-fields
      .wa-field(v-for="(row, i) in rows" :key="i")
        label {{ row.name }}
        b-input(v-model.number="row.actualMargin" type="number" step="any" size="is-small")
    p.wa-foot
      | {{ $t('report.wagesReview.actual.total') }}
      b  {{ money(yearActual) }}

  .wa-actions
    b-button(@click="$emit('back')") {{ $t('report.wagesReview.actual.back') }}
    b-button(type="is-primary" @click="confirm") {{ $t('report.wagesReview.actual.continue') }}
</template>

<script>
/**
 * WagesActual — step 4 of the Wages/Salary Review: what actually happened.
 *
 * The smallest step, and the one the whole model is judged by. Twelve typed cells:
 * `Cash Report` row 24, labelled by the workbook itself **"Actual Labour Margin"**, sitting
 * directly under row 22's calculated "Projected Labour Margin". The advisor enters what
 * really happened, month by month. NOTHING IMPORTS IT — the drawing's first cut left this
 * row out entirely, which is how the model nearly shipped with no way to judge the plan.
 *
 * MONTH NAMES COME FROM STEP 3, not from a list here. A firm whose year starts in July
 * would otherwise be typing its actuals against somebody else's calendar.
 *
 * ⚠ NO PLAN IS SHOWN BESIDE THE ACTUALS, deliberately. The projected margin is the
 * ENGINE'S figure (`Cash Report` row 22 is calculated), so putting it here would mean
 * either a second backend call from an input step or — far worse — re-implementing the
 * maths in the browser. Plan against actual, and the variance, is the report's job:
 * that is step 5, and `computeWages` already returns `totals.variance` for it.
 *
 * A blank month is NOT the same as a zero month, and the count in the headline says which
 * is which. It still reaches the engine as 0, because that is what the workbook's own
 * blank cell does — but an advisor who has entered four of twelve can see that.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import currencyMixin from '~/mixins/currencyMixin'

/** `Cash Report` E24..P24 — the workbook's own twelve actuals. */
const SAMPLE_ACTUALS = [5000, 27500, 2500, -5000, 11450, 16750, 1500, 1250, 12568, 11450, 2500, 10478]

/** @param {*} v @returns {number} v as a number, 0 when it is not one. */
function num (v) {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

/** @param {*} v @returns {boolean} whether the advisor has actually put something here. */
function entered (v) {
  return v !== null && v !== undefined && v !== '' && isFinite(Number(v))
}

export default {
  name: 'WagesActual',

  components: { SampleNotice, HeroStrip, HeroFigure },

  mixins: [currencyMixin],

  props: {
    /** Step 3's confirmed months — their names and order. */
    months: { type: Array, default: () => [] },
    /** A previously confirmed payload (stepping back); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      rows: [],
      showSample: true
    }
  },

  computed: {
    /** @returns {number} the year's actual labour margin — the sum of the twelve. */
    yearActual () {
      return this.rows.reduce((sum, r) => sum + num(r.actualMargin), 0)
    },
    /** @returns {number} months the advisor has actually filled in. */
    monthsEntered () {
      return this.rows.filter(r => entered(r.actualMargin)).length
    },
    /**
     * The worst month by actual margin. The conversation an advisor opens with, and the
     * reason the per-month figures exist rather than a single year total.
     * @returns {string}
     */
    worstMonth () {
      const filled = this.rows.filter(r => entered(r.actualMargin))
      if (filled.length === 0) { return '—' }
      const worst = filled.reduce((a, b) => (num(a.actualMargin) <= num(b.actualMargin) ? a : b))
      return worst.name + ' · ' + this.money(num(worst.actualMargin))
    },
    /** @returns {boolean} whether that worst month is a loss, for the headline's tone. */
    worstIsLoss () {
      const filled = this.rows.filter(r => entered(r.actualMargin))
      if (filled.length === 0) { return false }
      return filled.reduce((a, b) => (num(a.actualMargin) <= num(b.actualMargin) ? a : b)).actualMargin < 0
    }
  },

  created () {
    this.buildRows()
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /** One row per month from step 3, seeded with the workbook's own actuals. */
    buildRows () {
      this.rows = this.months.map((m, i) => ({
        name: m.name || this.$t('report.wagesReview.actual.unnamedMonth'),
        actualMargin: i < SAMPLE_ACTUALS.length ? SAMPLE_ACTUALS[i] : null
      }))
    },

    /**
     * Rebuild from a confirmed payload.
     * @param {Object} payload a previous `confirm` emission
     */
    applyRestore (payload) {
      const saved = (payload && payload.months) || []
      this.rows.forEach((row, i) => {
        if (saved[i] && saved[i].actualMargin !== undefined) {
          row.actualMargin = saved[i].actualMargin
        }
      })
    },

    /**
     * Hand the months back with their actuals attached, everything else step 3 settled
     * left untouched.
     *
     * Emits `confirmed` with { months } — the same twelve, now carrying `actualMargin`.
     */
    confirm () {
      this.$emit('confirmed', {
        months: this.months.map((m, i) => Object.assign({}, m, {
          actualMargin: num(this.rows[i] && this.rows[i].actualMargin)
        }))
      })
    }
  }
}
</script>

<style scoped>
.wa-card {
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.wa-title { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 4px; }
.wa-note { font-size: 12px; color: var(--rs-muted); margin: 0 0 12px; }
/* Twelve months as a wrapping row of labelled boxes rather than a table: there is one
   figure per month, so a grid with a single data row would be mostly empty space and
   would scroll sideways for no reason. */
.wa-fields { display: flex; flex-wrap: wrap; gap: 12px; }
.wa-field { display: flex; flex-direction: column; gap: 3px; flex: 1 1 120px; min-width: 110px; max-width: 170px; }
.wa-field label { font-size: 11px; font-weight: 600; color: var(--rs-muted); }
.wa-foot { font-size: 12px; color: var(--rs-muted); margin: 14px 0 0; }
.wa-foot b { color: var(--rs-ink); }
.wa-actions { display: flex; justify-content: space-between; gap: 8px; }
@media print { .wa-actions { display: none !important; } }
</style>

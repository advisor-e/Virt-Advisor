<template lang="pug">
.leb-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  //- The section's signature dark headline strip — display-only echoes of what
  //- was entered, so step 2 opens looking like every other model in the library.
  //- The derived business figures (ratio, maximum loan) are the report's job.
  hero-strip(:columns="3")
    hero-figure(:label="$t('report.loanEstimator.business.heroEbit')" :value="money(ebitNumber)")
    hero-figure(:label="$t('report.loanEstimator.business.heroStaff')" :value="String(totalStaff)")
    hero-figure(:label="$t('report.loanEstimator.business.heroTax')" :value="money(taxNumber)")

  .leb-card
    h3.leb-title {{ $t('report.loanEstimator.business.cardTitle') }}
    .leb-field
      .leb-labels
        label {{ $t('report.loanEstimator.business.ebit') }}
        p.leb-help {{ $t('report.loanEstimator.business.ebitHelp') }}
      b-input(v-model.number="ebit" type="number" step="any" size="is-small")
    .leb-field
      label {{ $t('report.loanEstimator.business.businessType') }}
      b-select(v-model="businessType" size="is-small")
        option(value="Commercial Business") {{ $t('report.loanEstimator.business.commercialBusiness') }}
        option(value="Farm") {{ $t('report.loanEstimator.business.farm') }}
    .leb-field
      label {{ $t('report.loanEstimator.business.fullTimeStaff') }}
      b-input(v-model.number="fullTimeStaff" type="number" step="any" size="is-small")
    .leb-field
      label {{ $t('report.loanEstimator.business.partTimeStaff') }}
      b-input(v-model.number="partTimeStaff" type="number" step="any" size="is-small")
    .leb-field
      label {{ $t('report.loanEstimator.business.currentTaxDue') }}
      b-input(v-model.number="currentTaxDue" type="number" step="any" size="is-small")

  .leb-actions
    b-button(type="is-primary" @click="confirm") {{ $t('report.loanEstimator.business.continue') }}
</template>

<script>
/**
 * LoanEstimatorBusiness — step 2 of the Loan Estimator: the `Serviceability
 * Input` business block (Part E, rows 71–103). The trading entity's EBIT, staff
 * and tax due; the maximum loan its EBIT services is worked out on the backend
 * and shown on the report. Field wording is the workbook's own, approved by
 * Mike 2026-07-24.
 *
 * Deliberate differences from the sheet, ruled 2026-07-24:
 *   - the business entity NAME (E72) is NOT captured — it is personal data and
 *     the calculation never needs it, so there is no name box.
 *   - Business Type offers the two branches the sheet's Loan Criteria Z45
 *     actually distinguishes: "Farm" (EBIT ÷ 1.5) and everything else
 *     ("Commercial Business", EBIT ÷ 3). Only that split changes the maths.
 *
 * The nine commercial securities the block assesses are the SAME `Capital
 * Input` grid entered in step 1 (the sheet references that one list), so they
 * are carried through from the confirmed security payload, never re-typed. When
 * the screen is mounted without one, the securities are omitted and the backend
 * falls back to the workbook sample (and says so via `defaultedInputs`).
 *
 * Figures are seeded with the workbook's Ripper-business sample — the same
 * scalars as the backend's DEFAULT_BUSINESS_INPUTS — flagged by SampleNotice
 * until the advisor returns with confirmed figures.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import currencyMixin from '~/mixins/currencyMixin'

/**
 * The Ripper business (`Serviceability Input` rows 72–103), the five scalar
 * fields cell-for-cell the backend's DEFAULT_BUSINESS_INPUTS. The securities
 * are not held here — they come from step 1.
 */
function sampleFigures () {
  return {
    ebit: 342000, //                     N72
    businessType: 'Commercial Business', // E74 (Loan Criteria Z45: "Farm" → ÷1.5, else ÷3)
    fullTimeStaff: 14, //                E100
    partTimeStaff: 3, //                 E101
    currentTaxDue: 25000 //              E103
  }
}

export default {
  name: 'LoanEstimatorBusiness',

  components: { SampleNotice, HeroStrip, HeroFigure },

  mixins: [currencyMixin],

  props: {
    /**
     * Step 1's confirmed security-position payload; its `securities` array is
     * carried through to the business block. Null on a direct/first entry.
     */
    security: { type: Object, default: null },
    /** A previously confirmed payload (stepping back from chip 3/4); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      ...sampleFigures(),
      // Frozen at created(): whether this entry started from the sample scenario.
      showSample: true
    }
  },

  computed: {
    /** @returns {number} EBIT as a number, for the display-only headline. */
    ebitNumber () {
      return Number(this.ebit) || 0
    },
    /** @returns {number} current tax due as a number, for the display-only headline. */
    taxNumber () {
      return Number(this.currentTaxDue) || 0
    },
    /** @returns {number} full- and part-time staff combined (display only). */
    totalStaff () {
      return (Number(this.fullTimeStaff) || 0) + (Number(this.partTimeStaff) || 0)
    }
  },

  created () {
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /**
     * Rebuild the five business fields from a confirmed payload (securities are
     * not restored here — they always come from the step 1 prop).
     * @param {Object} p a payload previously emitted by confirm()
     */
    applyRestore (p) {
      this.ebit = p.ebit
      this.businessType = p.businessType
      this.fullTimeStaff = p.fullTimeStaff
      this.partTimeStaff = p.partTimeStaff
      this.currentTaxDue = p.currentTaxDue
    },

    /**
     * @returns {Object} the model-shaped inputs block `computeBusinessBlock`
     *   expects. `securities` is included only when step 1's payload is present;
     *   omitted, the backend falls back to the workbook sample.
     */
    payload () {
      const out = {
        ebit: Number(this.ebit) || 0,
        businessType: this.businessType,
        fullTimeStaff: Number(this.fullTimeStaff) || 0,
        partTimeStaff: Number(this.partTimeStaff) || 0,
        currentTaxDue: Number(this.currentTaxDue) || 0
      }
      if (this.security && Array.isArray(this.security.securities)) {
        out.securities = this.security.securities
      }
      return out
    },

    confirm () {
      // payload: model-shaped business-block inputs; securities carried from step 1
      this.$emit('confirmed', this.payload())
    }
  }
}
</script>

<style scoped>
.leb-root .herostrip { margin-bottom: 14px; }
.leb-card {
  background: #fff; border: 1px solid #d5e1ee; border-top: 3px solid #00b1e0;
  border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;
}
.leb-title {
  font-size: 13px; font-weight: 700; color: #002b64;
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px;
}
.leb-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 3px 0;
}
.leb-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.leb-labels { flex: 1 1 auto; }
.leb-help { font-size: 11px; color: #5b6f8a; margin: 1px 0 0; }
.leb-field .control { width: 150px; flex: 0 0 auto; }
.leb-actions { margin-top: 6px; text-align: right; }
</style>

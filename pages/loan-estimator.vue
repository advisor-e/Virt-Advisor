<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.loanEstimator.eyebrowClass')"
    :title="$t('report.loanEstimator.title')"
    :client="$t('report.preparedFor')"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient"
  )
  .steps
    .step(:class="{ active: step === 1, done: step > 1 }" @click="goTo(1)")
      span.n 1
      | {{ $t('report.loanEstimator.step1') }}
    .step(:class="{ active: step === 2, done: step > 2 }" @click="goTo(2)")
      span.n 2
      | {{ $t('report.loanEstimator.step2') }}
    .step(:class="{ active: step === 3, done: step > 3 }" @click="goTo(3)")
      span.n 3
      | {{ $t('report.loanEstimator.step3') }}
    .step(:class="{ active: step === 4 }")
      span.n 4
      | {{ $t('report.loanEstimator.step4') }}
  loan-estimator-security(v-if="step === 1" :restore="security" :client-changes="savedReport.clientChanges" @confirmed="onSecurityConfirmed")
  loan-estimator-business(v-else-if="step === 2" :security="security" :restore="business" :client-changes="savedReport.clientChanges" @confirmed="onBusinessConfirmed")
  loan-estimator-serviceability(v-else-if="step === 3" :restore="serviceability" :client-changes="savedReport.clientChanges" @confirmed="onServiceabilityConfirmed")
  loan-estimator-report(
    v-else
    :security="security"
    :business="business"
    :serviceability="serviceability"
    :restore="repayment"
    :client-changes="savedReport.clientChanges"
    @calc-change="onCalcChange"
  )
</template>

<script>
/**
 * /loan-estimator page — a Decision-class model (The Loan Estimator).
 *
 * Stepped flow per Mike's ruling of 2026-07-23 (session C, §3.4): security
 * position → serviceability → the report, one stage at a time with the same
 * chip stepper as Quick Position. Unlike Quick Position there is no file
 * intake and the compute route is anonymous (numbers in, numbers out), so no
 * Bearer-token plumbing is needed.
 *
 * Saved per client (item 4.62, Brief §5) through the savedReport mixin. This page,
 * not a step, is what saves: it is the only place the four steps' figures meet. A
 * save carries the steps the advisor has CONFIRMED with Continue plus the
 * calculator; a step still being typed is not in it. Loading rebuilds each step
 * whole or not at all and lands on the first step that needs re-entering
 * (utils/loanEstimatorSavedShape.js holds both rules).
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import ReportShell from '~/components/base/ReportShell.vue'
import LoanEstimatorSecurity from '~/components/LoanEstimatorSecurity.vue'
import LoanEstimatorBusiness from '~/components/LoanEstimatorBusiness.vue'
import LoanEstimatorServiceability from '~/components/LoanEstimatorServiceability.vue'
import LoanEstimatorReport from '~/components/LoanEstimatorReport.vue'
import savedReport from '~/mixins/savedReport'
const { flattenLoanEstimator, rebuildLoanEstimator } = require('~/utils/loanEstimatorSavedShape')

export default {
  name: 'LoanEstimatorPage',

  components: { ReportShell, ReportHeader, LoanEstimatorSecurity, LoanEstimatorBusiness, LoanEstimatorServiceability, LoanEstimatorReport },

  mixins: [savedReport],

  data () {
    return {
      step: 1,
      // Each step's confirmed figures; forward-navigation is gated on the
      // previous step existing, same rule as Quick Position (a chip is only
      // clickable when there is content to return to). The business loan is
      // step 2 (front and centre, per Mike's ruling 2026-07-24) — it needs only
      // the securities from step 1, not the household serviceability step.
      security: null,
      business: null,
      serviceability: null,
      // The report's calculator as it last reported itself; null until the report
      // has been shown once (the report then starts from its own sample).
      repayment: null
    }
  },

  methods: {
    /**
     * The figures saved per client — consumed by the savedReport mixin.
     * @returns {object} the flat row (utils/loanEstimatorSavedShape)
     */
    reportInputs () {
      return flattenLoanEstimator({
        security: this.security,
        business: this.business,
        serviceability: this.serviceability,
        repayment: this.repayment
      })
    },
    /**
     * Load a saved row back — consumed by the savedReport mixin. Each step is taken
     * whole or left unconfirmed; the page lands where the row says.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      const back = rebuildLoanEstimator(inputs)
      this.security = back.security
      this.business = back.business
      this.serviceability = back.serviceability
      if (back.repayment) { this.repayment = back.repayment }
      this.step = back.step
    },
    /**
     * The report's calculator changed (or first showed); remembered so a save
     * carries it and a return to step 4 restores it.
     * @param {object} calc the six controls in display form
     */
    onCalcChange (calc) {
      this.repayment = calc
    },
    /**
     * Stepper navigation. Backwards always; forward only when the target step
     * has the content it depends on (chip 2 needs security; chip 3 needs
     * security + business). The report chip (4) is never clickable directly —
     * it is reached only when the serviceability screen hands over its payload.
     */
    goTo (n) {
      if (n === 4 || n === this.step) { return }
      if (n > this.step) {
        if (n === 2 && !this.security) { return }
        if (n === 3 && !(this.security && this.business)) { return }
      }
      this.step = n
    },
    /** The security screen hands over its confirmed figures; the business loan is next. */
    onSecurityConfirmed (payload) {
      this.security = payload
      this.step = 2
    },
    /** The business screen hands over its confirmed figures; serviceability is next. */
    onBusinessConfirmed (payload) {
      this.business = payload
      this.step = 3
    },
    /** The serviceability screen hands over its confirmed figures; the report is next. */
    onServiceabilityConfirmed (payload) {
      this.serviceability = payload
      this.step = 4
    }
  }
}
</script>

<style scoped>
/* The page frame (canvas / centred 1120px column / padding) now lives in the shared
   ReportShell; the wrapper divs and their CSS are gone. The step chips read the
   shared visual-standard tokens — every value below equals the token it points at
   (a no-change consolidation). Left literal: the translucent white `#ffffff30`
   active-chip number badge (no standard token). */
/* Header → chips → content all sit 16px apart (owner ruling 2026-07-27): reset the shared
   header's 22px bottom margin, and the chips carry a 16px bottom margin. */
.report-shell ::v-deep .rs-top { margin-bottom: 16px; }
.steps { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 16px; }
.step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--rs-muted);
  background: var(--rs-panel); border: 1px solid var(--rs-line); border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line); color: var(--rs-ink); font-size: 11px;
}
.step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.step.done { color: var(--rs-good); }
.step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }
@media print { .steps { display: none !important; } }
</style>

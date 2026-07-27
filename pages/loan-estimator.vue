<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.loanEstimator.eyebrowClass')"
    :title="$t('report.loanEstimator.title')"
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
  loan-estimator-security(v-if="step === 1" :restore="security" @confirmed="onSecurityConfirmed")
  loan-estimator-business(v-else-if="step === 2" :security="security" :restore="business" @confirmed="onBusinessConfirmed")
  loan-estimator-serviceability(v-else-if="step === 3" :restore="serviceability" @confirmed="onServiceabilityConfirmed")
  loan-estimator-report(v-else :security="security" :business="business" :serviceability="serviceability")
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
 * The Model Library row stays "Coming soon" until the final commit of
 * Phase 4b (catalogue flip lands last, with the guard entries — see
 * SESSION-2026-07-23-C-NOTES.md).
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import ReportShell from '~/components/base/ReportShell.vue'
import LoanEstimatorSecurity from '~/components/LoanEstimatorSecurity.vue'
import LoanEstimatorBusiness from '~/components/LoanEstimatorBusiness.vue'
import LoanEstimatorServiceability from '~/components/LoanEstimatorServiceability.vue'
import LoanEstimatorReport from '~/components/LoanEstimatorReport.vue'

export default {
  name: 'LoanEstimatorPage',

  components: { ReportShell, ReportHeader, LoanEstimatorSecurity, LoanEstimatorBusiness, LoanEstimatorServiceability, LoanEstimatorReport },

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
      serviceability: null
    }
  },

  methods: {
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
.steps { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 20px; }
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

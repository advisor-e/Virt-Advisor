<template lang="pug">
.loan-estimator-page
  .wrap
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
      .step(:class="{ active: step === 3 }")
        span.n 3
        | {{ $t('report.loanEstimator.step3') }}
    loan-estimator-security(v-if="step === 1" :restore="security" @confirmed="onSecurityConfirmed")
    loan-estimator-serviceability(v-else-if="step === 2" :restore="serviceability" @confirmed="onServiceabilityConfirmed")
    .placeholder(v-else) {{ $t('report.loanEstimator.placeholder') }}
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
 * The three step screens arrive as separate approved changes; until then each
 * step shows a placeholder. The Model Library row stays "Coming soon" until
 * the final commit of Phase 4b (catalogue flip lands last, with the guard
 * entries — see SESSION-2026-07-23-C-NOTES.md).
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import LoanEstimatorSecurity from '~/components/LoanEstimatorSecurity.vue'
import LoanEstimatorServiceability from '~/components/LoanEstimatorServiceability.vue'

export default {
  name: 'LoanEstimatorPage',

  components: { ReportHeader, LoanEstimatorSecurity, LoanEstimatorServiceability },

  data () {
    return {
      step: 1,
      // Each step's confirmed figures; forward-navigation is gated on the
      // previous step existing, same rule as Quick Position (a chip is only
      // clickable when there is content to return to).
      security: null,
      serviceability: null
    }
  },

  methods: {
    /**
     * Stepper navigation. Backwards always; forward only when the target step
     * has content to show (chip 2 needs the security position confirmed). The
     * report chip is never clickable directly — step 3 is reached only when
     * the serviceability screen hands over its payload.
     */
    goTo (n) {
      if (n === 3 || n === this.step) { return }
      if (n > this.step && !(n === 2 && this.security)) { return }
      this.step = n
    },
    /** The security screen hands over its confirmed figures; serviceability is next. */
    onSecurityConfirmed (payload) {
      this.security = payload
      this.step = 2
    },
    /** The serviceability screen hands over its confirmed figures; the report is next. */
    onServiceabilityConfirmed (payload) {
      this.serviceability = payload
      this.step = 3
    }
  }
}
</script>

<style scoped>
.loan-estimator-page { min-height: 100vh; background: #eef3f8; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 28px 22px 64px; }
.steps { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 20px; }
.step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: #5b6f8a;
  background: #fff; border: 1px solid #d5e1ee; border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: #d5e1ee; color: #002b64; font-size: 11px;
}
.step.active { color: #fff; background: #0070c0; border-color: #0070c0; }
.step.active .n { background: #ffffff30; color: #fff; }
.step.done { color: #4ca52d; }
.step.done .n { background: #4ca52d1a; color: #4ca52d; }
.placeholder {
  background: #fff; border: 1px dashed #d5e1ee; border-radius: 10px;
  padding: 40px 22px; text-align: center; color: #5b6f8a; font-size: 14px;
}
@media print { .steps { display: none !important; } }
</style>

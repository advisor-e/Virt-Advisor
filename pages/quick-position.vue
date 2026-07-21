<template lang="pug">
.quick-position-page
  .wrap
    report-header(
      :back-label="$t('modelLibrary.backToLibrary')"
      :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.quickPosition.eyebrowClass')"
      :title="$t('report.quickPosition.title')"
      :client="companyName || ''"
    )
    .steps
      .step(:class="{ active: step === 1, done: step > 1 }" @click="goTo(1)")
        span.n 1
        | {{ $t('report.quickPosition.step1') }}
      .step(:class="{ active: step === 2, done: step > 2 }" @click="goTo(2)")
        span.n 2
        | {{ $t('report.quickPosition.step2') }}
      .step(:class="{ active: step === 3 }")
        span.n 3
        | {{ $t('report.quickPosition.step3') }}
    quick-position-intake(v-if="step < 3" :api-token="apiToken" :restore="seed" :step="step" @step="step = $event" @confirmed="onConfirmed")
    quick-position-report(v-else :seed="seed")
</template>

<script>
/**
 * /quick-position page — the first Report-class model (CM. Quick Position.).
 *
 * Three-step flow per the owner-approved mockup (2026-07-16): drop the Xero
 * exports → confirm every figure with its provenance → the live survival report.
 * Launched from the Model Library; per the design (Option 1) the master app's
 * "client report button" ultimately lands here too.
 *
 * The intake upload is firmAuth-guarded, so the page resolves the Bearer token
 * exactly like pages/advisor.vue: dev bypass on localhost, else the stored pass.
 */
import QuickPositionIntake from '~/components/QuickPositionIntake.vue'
import ReportHeader from '~/components/base/ReportHeader.vue'
import QuickPositionReport from '~/components/QuickPositionReport.vue'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'QuickPositionPage',

  components: { ReportHeader, QuickPositionIntake, QuickPositionReport },

  data () {
    return {
      step: 1,
      seed: null,
      // Resolved client-side in mounted(): window/localStorage are unavailable
      // during SSR and must never be read in data()/computed/created().
      apiToken: 'dev-local-bypass'
    }
  },

  computed: {
    /** Client name from the dropped file — displayed locally only, never sent anywhere. */
    companyName () {
      return this.seed && this.seed.companyName
    }
  },

  mounted () {
    this.apiToken = this.resolveApiToken()
  },

  methods: {
    /**
     * Same resolution as pages/advisor.vue: localhost always uses the dev bypass
     * (a stale stored token must not 401 local work); otherwise the stored pass,
     * and with no token the backend correctly returns 401 (fail closed).
     * @returns {string} the token to send as `Bearer <token>`
     */
    resolveApiToken () {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'dev-local-bypass'
      }
      return window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
    },
    /**
     * Stepper navigation. Backwards always; forward only when the target content
     * exists (chip 2 needs confirmed figures to return to). The confirmed payload is
     * KEPT on every move — stepping back from the report restores the confirm table
     * intact instead of wiping it (R12); the intake follows via its `step` prop.
     */
    goTo (n) {
      if (n === 3 || n === this.step) { return }
      if (n > this.step && !(n === 2 && this.seed)) { return }
      this.step = n
    },
    /** The intake hands over its confirmed payload; the report takes it from here. */
    onConfirmed (payload) {
      this.seed = payload
      this.step = 3
    }
  }
}
</script>

<style scoped>
.quick-position-page { min-height: 100vh; background: #eef3f8; }
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
@media print { .steps { display: none !important; } }
</style>

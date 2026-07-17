<template lang="pug">
.ebitda-dcf-page
  .wrap
    header.top
      .brand
        nuxt-link.backlink(to="/model-library") {{ $t('modelLibrary.backToLibrary') }}
        .eyebrow {{ $t('report.eyebrow') }} · {{ $t('report.ebitdaDcf.eyebrowClass') }}
        h1 {{ $t('report.ebitdaDcf.title') }}
        .client(v-if="companyName") {{ companyName }}
    .steps
      .step(:class="{ active: step === 1, done: step > 1 }" @click="goTo(1)")
        span.n 1
        | {{ $t('report.ebitdaDcf.step1') }}
      .step(:class="{ active: step === 2, done: step > 2 }" @click="goTo(2)")
        span.n 2
        | {{ $t('report.ebitdaDcf.step2') }}
      .step(:class="{ active: step === 3 }")
        span.n 3
        | {{ $t('report.ebitdaDcf.step3') }}
    ebitda-dcf-intake(v-if="step < 3" :api-token="apiToken" @step="step = $event" @confirmed="onConfirmed" ref="intake")
    ebitda-dcf-report(v-else :seed="seed")
</template>

<script>
/**
 * /ebitda-dcf page — the second Report-class model (EBITDA Model).
 *
 * Three-step flow per the owner-approved mockup (2026-07-17): drop up to five
 * years of P&L exports → confirm & normalise every figure with its provenance →
 * the live valuation report. Launched from the Model Library.
 *
 * The intake upload is firmAuth-guarded, so the page resolves the Bearer token
 * exactly like pages/quick-position.vue: dev bypass on localhost, else the
 * stored pass.
 */
import EbitdaDcfIntake from '~/components/EbitdaDcfIntake.vue'
import EbitdaDcfReport from '~/components/EbitdaDcfReport.vue'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'EbitdaDcfPage',

  components: { EbitdaDcfIntake, EbitdaDcfReport },

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
    /** Client name from the dropped files — displayed locally only, never sent anywhere. */
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
    /** Stepper navigation — backwards only; forward movement is earned by the flow. */
    goTo (n) {
      if (n < this.step && this.step < 3) {
        this.step = n
        if (n === 1 && this.$refs.intake) { this.$refs.intake.phase = 'drop' }
      } else if (n < 3 && this.step === 3) {
        // Re-entering intake from the report starts the flow again (fresh confirm)
        this.seed = null
        this.step = n
      }
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
.ebitda-dcf-page { min-height: 100vh; background: #eef3f8; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 28px 22px 64px; }
header.top { margin-bottom: 16px; }
.backlink { display: inline-block; margin-bottom: 10px; font-size: 12px; font-weight: 600; letter-spacing: .04em; color: #00b1e0; text-decoration: none; }
.backlink:hover { text-decoration: underline; }
.eyebrow { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #00b1e0; font-weight: 600; }
h1 { margin: 2px 0 0; font-size: 25px; font-weight: 300; color: #002b64; }
.client { font-size: 13px; color: #5b6f8a; }
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
@media print { .steps, .backlink { display: none !important; } }
</style>

<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.ebitdaDcf.eyebrowClass')"
    :title="$t('report.ebitdaDcf.title')"
    :client="companyName || ''"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient"
  )
  //- A client never sees the upload steps: the upload needs the advisor's sign-in, so
  //- the client's page is the report alone (§5).
  .steps(v-if="savedReport.mode !== 'client'")
    .step(:class="{ active: step === 1, done: step > 1 }" @click="goTo(1)")
      span.n 1
      | {{ $t('report.ebitdaDcf.step1') }}
    .step(:class="{ active: step === 2, done: step > 2 }" @click="goTo(2)")
      span.n 2
      | {{ $t('report.ebitdaDcf.step2') }}
    .step(:class="{ active: step === 3 }")
      span.n 3
      | {{ $t('report.ebitdaDcf.step3') }}
  ebitda-dcf-intake(v-if="step < 3" :api-token="apiToken" :restore="seed" :step="step" @step="step = $event" @confirmed="onConfirmed")
  ebitda-dcf-report(
    v-else
    :seed="seed"
    :restore="loaded"
    :client-changes="savedReport.clientChanges"
    @state-change="onStateChange"
  )
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
 *
 * Saved per client (item 4.62, Brief §5) through the savedReport mixin. The page saves
 * because the header is here: the confirmed figures are the page's, the report tells it
 * every change of its dials, and a loaded row is handed back whole. A client lands on the
 * report and never sees the upload steps. The shape lives in utils/ebitdaDcfSavedShape.js.
 */
import EbitdaDcfIntake from '~/components/EbitdaDcfIntake.vue'
import ReportHeader from '~/components/base/ReportHeader.vue'
import ReportShell from '~/components/base/ReportShell.vue'
import EbitdaDcfReport from '~/components/EbitdaDcfReport.vue'
import savedReport from '~/mixins/savedReport'
import { isDevHost } from '~/utils/devHost'
const { initialDials, flattenEbitdaDcf, rebuildEbitdaDcf } = require('~/utils/ebitdaDcfSavedShape')

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'EbitdaDcfPage',

  components: { ReportShell, ReportHeader, EbitdaDcfIntake, EbitdaDcfReport },

  mixins: [savedReport],

  data () {
    return {
      step: 1,
      seed: null,
      // The report's dials as it last reported them (what a save carries), and the dials
      // a saved row loaded (what the report is handed back). Two fields, not one: the
      // report's own changes must not come back to it as a restore.
      live: null,
      loaded: null,
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
    // The mixin's mounted() has already read the sign-in; a client goes straight to the report.
    if (this.savedReport.mode === 'client') { this.step = 3 }
  },

  methods: {
    /** The dials the report holds, or the sample's sized to the confirmed years. */
    currentDials () {
      return this.live || initialDials(this.seed && this.seed.years ? this.seed.years.length : 5)
    },
    /**
     * The figures saved per client — consumed by the savedReport mixin.
     * @returns {object} the flat row (utils/ebitdaDcfSavedShape)
     */
    reportInputs () {
      return flattenEbitdaDcf(this.seed, this.currentDials())
    },
    /**
     * Load a saved row back — consumed by the savedReport mixin. The figures come as one
     * block or not at all; the dials each in their own shape; the page lands on the report.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      const back = rebuildEbitdaDcf(inputs, this.seed, this.currentDials())
      this.seed = back.seed
      this.loaded = back.dials
      this.live = back.dials
      this.step = 3
    },
    /**
     * The report reported its dials (on show, and on every change).
     * @param {object} state { dcf, listed }
     */
    onStateChange (state) {
      this.live = state
    },
    /**
     * Same resolution as pages/advisor.vue: localhost always uses the dev bypass
     * (a stale stored token must not 401 local work); otherwise the stored pass,
     * and with no token the backend correctly returns 401 (fail closed).
     * @returns {string} the token to send as `Bearer <token>`
     */
    resolveApiToken () {
      if (isDevHost()) {
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
    /**
     * The intake hands over its confirmed payload; the report takes it from here, opening
     * on the sample dials — dials loaded earlier no longer stand in for them.
     */
    onConfirmed (payload) {
      this.seed = payload
      this.loaded = null
      this.live = null
      this.step = 3
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

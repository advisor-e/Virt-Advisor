<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.threeWayForecast.eyebrowClass')"
    :title="$t('report.threeWayForecast.title')"
    :client="companyName")
  .steps
    .step(
      v-for="s in stepChips"
      :key="s.n"
      :class="{ active: step === s.n, done: step > s.n }"
      @click="goTo(s.n)")
      span.n {{ s.n }}
      | {{ $t(s.label) }}
  three-way-forecast-intake(
    v-if="step < 4"
    :api-token="apiToken"
    :restore="confirmed && confirmed.state"
    :step="step"
    @step="step = $event"
    @confirmed="onConfirmed")
  three-way-forecast-report(
    v-else
    :seed="confirmed && confirmed.inputs"
    :client="companyName"
    @change-assumptions="goTo(3)"
    @start-again="startAgain")
</template>

<script>
/**
 * /three-way-forecast — the Three-Way Forecast, end to end.
 *
 * Four steps, per the approved drawing `design/mockups/three-way-forecast.html`: drop the
 * accounting exports → confirm the position the forecast opens from → set the assumptions
 * → the live forecast. Steps 1 to 3 are `ThreeWayForecastIntake`; step 4 is
 * `ThreeWayForecastReport`.
 *
 * The engine behind it is a port of `3 way Filter.xlsx`, proven against 10,155 of that
 * workbook's own calculated cells across all three years, with nine corrections each
 * ruled by Mike on 2026-09-02 (`design/THREE-WAY-FORECAST-DEVIATIONS.md`).
 *
 * With nothing confirmed the report computes the source workbook's own sample, which is
 * how it shipped on 2026-09-02 and is still what step 4 shows if it is reached without an
 * intake. A confirmed intake replaces every input explicitly — see the intake component's
 * note on why that matters.
 *
 * THE CLIENT'S NAME IS HELD HERE, OUTSIDE THE SEED. It is displayed on the advisor's own
 * screen and is deliberately not part of the payload posted to the compute route: the
 * forecast arithmetic has no use for it, so it does not travel.
 *
 * The intake upload is firmAuth-guarded, so the page resolves the Bearer token exactly
 * like pages/quick-position.vue: dev bypass on localhost, else the stored pass.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import ReportHeader from '~/components/base/ReportHeader.vue'
import ThreeWayForecastIntake from '~/components/ThreeWayForecastIntake.vue'
import ThreeWayForecastReport from '~/components/ThreeWayForecastReport.vue'
import { isDevHost } from '~/utils/devHost'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'ThreeWayForecastPage',

  components: { ReportShell, ReportHeader, ThreeWayForecastIntake, ThreeWayForecastReport },

  data () {
    return {
      step: 1,
      /** { inputs, state, companyName } from the intake, or null before it is confirmed. */
      confirmed: null,
      // Resolved client-side in mounted(): window/localStorage are unavailable during
      // SSR and must never be read in data()/computed/created().
      apiToken: 'dev-local-bypass'
    }
  },

  computed: {
    stepChips () {
      return [
        { n: 1, label: 'report.threeWayForecast.step1' },
        { n: 2, label: 'report.threeWayForecast.step2' },
        { n: 3, label: 'report.threeWayForecast.step3' },
        { n: 4, label: 'report.threeWayForecast.step4' }
      ]
    },

    /** The client's name from a dropped file — displayed locally, never sent anywhere. */
    companyName () {
      return (this.confirmed && this.confirmed.companyName) || ''
    }
  },

  mounted () {
    this.apiToken = this.resolveApiToken()
  },

  methods: {
    /**
     * Same resolution as pages/quick-position.vue: localhost always uses the dev bypass
     * (a stale stored token must not 401 local work); otherwise the stored pass, and with
     * no token the backend correctly returns 401 (fail closed).
     * @returns {string} the token to send as `Bearer <token>`
     */
    resolveApiToken () {
      if (isDevHost()) { return 'dev-local-bypass' }
      return window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
    },

    /**
     * Stepper navigation. Backwards always; forward only where the content exists — steps
     * 2 and 3 need an intake in progress, step 4 needs a confirmed one. The confirmed
     * payload is KEPT on every move, so stepping back restores the tables intact rather
     * than wiping them; the intake follows via its `step` prop.
     * @param {number} n
     */
    goTo (n) {
      if (n === this.step) { return }
      if (n > this.step && n === 4 && !this.confirmed) { return }
      this.step = n
    },

    /** The intake hands over its confirmed inputs; the report takes them from here. */
    onConfirmed (payload) {
      this.confirmed = payload
      this.step = 4
    },

    /** Back to an empty intake — nothing of the previous client is kept. */
    startAgain () {
      this.confirmed = null
      this.step = 1
    }
  }
}
</script>

<style scoped>
/* The page frame (canvas / centred 1120px column / padding) lives in the shared
   ReportShell. The step chips read the shared visual-standard tokens — every value below
   equals the token it points at. Left literal: the translucent white `#ffffff30` active
   chip badge, which has no standard token. Copied from pages/quick-position.vue so the
   two intake flows are the same object on screen. */
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

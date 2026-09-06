<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.threeWayForecast.eyebrowClass')"
    :title="$t('report.threeWayForecast.title')"
    :client="companyName"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient")
  .steps
    .step(
      v-for="s in stepChips"
      :key="s.n"
      :class="{ active: step === s.n, done: step > s.n }"
      @click="goTo(s.n)")
      span.n {{ s.n }}
      | {{ $t(s.label) }}
  //- v-show, NOT v-if, and that is what makes the waiting screen's "you can leave this page
  //- and come back" true: a research run is 83–141 seconds, and destroying this component
  //- on a chip click would drop the poll and the advisor's brief with it.
  economic-analysis-step(
    v-show="step === 5"
    :api-token="apiToken"
    :client-ref="savedReport.clientRef || ''"
    @research="onResearch"
    @included="onIncluded")
  three-way-forecast-intake(
    v-if="step < 4"
    :key="intakeKey"
    :api-token="apiToken"
    :restore="liveState"
    :step="step"
    :client-changes="clientChanges"
    @step="step = $event"
    @state="onIntakeState"
    @confirmed="onConfirmed")
  //- No `client` here: the header above is the only place the name is shown, and it is
  //- this page's. The report component stopped rendering a second header on 2026-09-05.
  three-way-forecast-report(
    v-else-if="step === 4"
    :seed="liveInputs"
    :restore="loadedReport"
    :client-changes="clientChanges"
    @state-change="onReportState"
    @change-assumptions="goTo(3)"
    @start-again="startAgain")
  //- The economic analysis as a lender reads it. Print-only, and it prints LAST — its own
  //- section after the statements, which is what "after the cash flow" means once the three
  //- statements share one tabbed table. It is outside the step chain on purpose: the print
  //- is fired from step 4, where step 5's own component is hidden.
  economic-analysis-pack(
    :research="economic.research"
    :approval="economic.approval"
    :included="economic.included"
    :researched-at="economic.researchedAt")
</template>

<script>
/**
 * /three-way-forecast — the Three-Way Forecast, end to end.
 *
 * Five steps: drop the accounting exports → confirm the position the forecast opens from →
 * set the assumptions → the live forecast → optional economic analysis. Steps 1 to 3 are
 * `ThreeWayForecastIntake`; step 4 is `ThreeWayForecastReport`; step 5 is
 * `EconomicAnalysisStep`. Steps 1–4 are the approved drawing
 * `design/mockups/three-way-forecast.html`.
 *
 * 🔴 STEP 5 IS OPTIONAL AND IS REACHABLE FROM ANYWHERE, both deliberately. Mike ruled it a
 * step of its own on 2026-09-06 (*"make it step 5"*), against the recommendation of a folded
 * panel under the forecast — a folded line beneath a long forecast being the easiest thing
 * on the page to never notice. The objection that a fifth chip makes an optional thing look
 * required is answered on the screen instead: the chip carries the word *optional*, and
 * **the forecast is complete, printable and saveable at step 4**.
 *
 * It needs nothing from the forecast, so `goTo` does not gate it the way it gates step 4 —
 * and that is the privacy ruling showing through the navigation: the research is driven by
 * a brief the advisor writes, never by the client's figures.
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
import EconomicAnalysisStep from '~/components/EconomicAnalysisStep.vue'
import EconomicAnalysisPack from '~/components/EconomicAnalysisPack.vue'
import savedReport from '~/mixins/savedReport'
import { isDevHost } from '~/utils/devHost'
const {
  flattenForecast, applySavedForecast, changedFigures
} = require('~/utils/threeWayForecastSavedShape')

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'ThreeWayForecastPage',

  components: {
    ReportShell,
    ReportHeader,
    ThreeWayForecastIntake,
    ThreeWayForecastReport,
    EconomicAnalysisStep,
    EconomicAnalysisPack
  },

  mixins: [savedReport],

  data () {
    return {
      step: 1,
      /** { inputs, state, companyName } from the intake, or null before it is confirmed. */
      confirmed: null,
      /**
       * The intake's form as it last reported itself, and the payload that form builds.
       * A Save carries the form — what is on screen NOW rather than the last build — and
       * the report is seeded from the payload, so a saved row that is loaded drives the
       * forecast without the advisor pressing anything.
       */
      liveState: null,
      liveInputs: null,
      levers: null,
      detail: 'summary',
      /** `{ levers, detail }` handed to the report after a saved row loads. */
      loadedReport: null,
      /**
       * Bumped when a saved row loads, so the intake is rebuilt and re-reads `restore`.
       * It reads that prop in `data()` alone — deliberately, because a restored form is
       * normalised on the way in — so a new key is how a load reaches it.
       */
      intakeKey: 0,
      /**
       * Step 5's research, held HERE because the printed pack is not step 5's to render.
       * The print is fired from step 4, where the economic-analysis component is hidden,
       * so the page is the only place both halves can see the same run.
       *
       * 🔴 EVERY FIELD IS SET FROM THE STEP'S OWN EVENTS AND NEVER INFERRED. A re-run
       * clears all four; withdrawing the second tick clears the approval; and the pack
       * prints on `approval.isApproved` rather than on `included` alone, so research
       * nobody accepted cannot reach a lender through this object.
       */
      economic: { research: null, approval: null, included: false, researchedAt: null },
      // Resolved client-side in mounted(): window/localStorage are unavailable during
      // SSR and must never be read in data()/computed/created().
      apiToken: 'dev-local-bypass'
    }
  },

  computed: {
    /**
     * The four steps — less the upload for a client.
     *
     * 🔴 STEP 1 IS THE ONE THING A CLIENT CANNOT REACH, and it is not a policy choice
     * against Mike's ruling of 2026-09-05 (*"anything an advisor can edit, the client can
     * edit"*). Dropping an export is not editing a figure, and the intake route is
     * firmAuth-guarded — it refuses a client token by name. Every figure the upload
     * produces is on steps 2 and 3, where the client edits it like any other.
     */
    stepChips () {
      const chips = [
        { n: 1, label: 'report.threeWayForecast.step1' },
        { n: 2, label: 'report.threeWayForecast.step2' },
        { n: 3, label: 'report.threeWayForecast.step3' },
        { n: 4, label: 'report.threeWayForecast.step4' },
        { n: 5, label: 'report.threeWayForecast.step5' }
      ]
      return this.savedReport.mode === 'client' ? chips.slice(1) : chips
    },

    /** The client's name from a dropped file — displayed locally, never sent anywhere. */
    companyName () {
      return (this.confirmed && this.confirmed.companyName) || ''
    },

    /**
     * Which figures the client changed since the advisor's version, named one at a time.
     * The store compares the row's named values and every block here is a list, so the
     * comparison is made against the advisor's version that travels with the row.
     * @returns {Array<string>}
     */
    clientChanges () {
      const r = this.savedReport.report
      if (!r || !r.advisorVersion) { return [] }
      return changedFigures(r.inputs, r.advisorVersion)
    }
  },

  mounted () {
    this.apiToken = this.resolveApiToken()
    // The mixin's mounted() has already read the sign-in.
    //
    // 🔴 A CLIENT OPENS ON STEP 2, NOT ON THE FORECAST, and the reason is mechanical
    // rather than a view about what they should see first. The forecast is computed from a
    // payload only the intake knows how to build, and the intake is not on screen at step
    // 4 — so landing there would show the source workbook's sample until the client
    // pressed something. Step 2 is the first step that is theirs, their advisor's figures
    // are on it, and the forecast is one click away on the chips.
    if (this.savedReport.mode === 'client') { this.step = 2 }
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
      // Step 4 needs a payload to compute from. The intake reports one as soon as it is on
      // screen, so this opens the moment there is something to show — including for a
      // client, who never presses the Build button the advisor does.
      if (n > this.step && n === 4 && !this.liveInputs) { return }
      this.step = n
    },

    /**
     * The intake reports its working state on every change, and once on mount.
     * @param {{state: object, inputs: object}} payload the whole form, and what it builds
     */
    onIntakeState (payload) {
      this.liveState = payload.state
      this.liveInputs = payload.inputs
    },

    /** The intake hands over its confirmed inputs; the report takes them from here. */
    onConfirmed (payload) {
      this.confirmed = payload
      this.liveState = payload.state
      this.liveInputs = payload.inputs
      this.step = 4
    },

    /**
     * Step 5 finished a research run, or cleared one.
     *
     * A NEW RUN IS NEVER AN APPROVED ONE, so both approval fields are reset here rather
     * than left standing. That is the same promise the step makes on its own screen — an
     * advisor must approve the run they actually read — held in the one place the printed
     * pack reads from.
     *
     * @param {{runId: string, runNumber: number, research: (object|null), researchedAt: (Date|null)}} payload
     */
    onResearch (payload) {
      this.economic = {
        research: (payload && payload.research) || null,
        researchedAt: (payload && payload.researchedAt) || null,
        approval: null,
        included: false
      }
    },

    /**
     * Step 5's second tick — the approval gate. What decides whether the research prints
     * in the pack the client receives.
     * @param {{included: boolean, approval: (object|null)}} payload
     */
    onIncluded (payload) {
      this.economic = Object.assign({}, this.economic, {
        included: Boolean(payload && payload.included),
        approval: (payload && payload.approval) || null
      })
    },

    /**
     * The report reported its two settings (on show, and on every change).
     * @param {{levers: object, detail: string}} state
     */
    onReportState (state) {
      this.levers = state.levers
      this.detail = state.detail
    },

    /**
     * The figures saved per client — consumed by the savedReport mixin. What is on screen
     * now: the intake's live form, or the last confirmed one before it has reported.
     * @returns {object} the flat row (utils/threeWayForecastSavedShape)
     */
    reportInputs () {
      const state = this.liveState || (this.confirmed && this.confirmed.state)
      return flattenForecast(state || {}, this.levers, this.detail)
    },

    /**
     * Load a saved row back — consumed by the savedReport mixin. Each block is taken whole
     * or not at all, so a row that is half readable loads the half that is whole.
     *
     * The intake is REBUILT rather than written into: it reads `restore` in `data()` alone,
     * where a restored form is normalised, and reaching past that would leave the two
     * disagreeing about what a missing block means.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      const next = applySavedForecast(this.liveState || {}, this.levers, inputs)
      this.liveState = next.form
      this.levers = next.levers
      this.detail = next.detail
      this.loadedReport = { levers: next.levers, detail: next.detail }
      // Rebuilding the intake is what makes the loaded form reach the screen, and its
      // first report back is what re-seeds the forecast — so nothing here computes a
      // payload the intake is the only thing that knows how to build.
      this.intakeKey += 1
    },

    /** Back to an empty intake — nothing of the previous client is kept. */
    startAgain () {
      this.confirmed = null
      this.liveState = null
      this.loadedReport = null
      this.intakeKey += 1
      // A client has no upload step to go back to.
      this.step = this.savedReport.mode === 'client' ? 2 : 1
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

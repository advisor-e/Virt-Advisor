<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.dashboardReports.eyebrowClass')"
    :title="$t('report.dashboardReports.title')"
    :client="clientName"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient")
  //- A client never sees the six steps: they read the report and cannot edit it.
  .steps(v-if="savedReport.mode !== 'client'")
    .step(
      v-for="n in 6"
      :key="n"
      :class="{ active: step === n, done: step > n }"
      @click="goTo(n)")
      span.n {{ n }}
      | {{ $t('report.dashboardReports.step' + n) }}
  dashboard-reports-workbench(
    :api-token="apiToken"
    :token="pagesToken"
    :restore="loaded"
    :step="step"
    :client-mode="savedReport.mode === 'client'"
    :client-name="clientName"
    :saved-text="savedText"
    @step="step = $event"
    @state="onState"
    @company-name="companyName = $event")
</template>

<script>
/**
 * /dashboard-reports — the Business Performance Report (item 4.70), end to end.
 *
 * Six steps: the client and the period → the four exports and the confirm table → the
 * typed inventory figures → the advisor's words → which pages → the review, where the
 * whole document is shown and printed. The steps are the approved drawing
 * `design/mockups/business-performance-report-intake.html`; the document is
 * `design/mockups/business-performance-report.html`.
 *
 * The route is /dashboard-reports, the catalogue's own name for it, because
 * /business-performance-report was taken by the Working Capital Cycle long before this
 * report existed.
 *
 * Saved per client (Brief P8) through the savedReport mixin: the workbench reports its
 * state on every change and a loaded row is handed back to it whole; the shape lives in
 * `utils/dashboardReportsSavedShape.js`. A client lands on the document.
 *
 * The intake upload is firmAuth-guarded, so the page resolves the Bearer token exactly like
 * pages/quick-position.vue: dev bypass on localhost, else the stored pass. The pages route
 * takes the sign-in's own token, so a client's request is answered as that client.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import ReportHeader from '~/components/base/ReportHeader.vue'
import DashboardReportsWorkbench from '~/components/DashboardReportsWorkbench.vue'
import savedReport from '~/mixins/savedReport'
import { isDevHost } from '~/utils/devHost'
import { intlLocaleFor } from '~/utils/dateLocale'
const { emptyState, flattenDashboardReport, applySavedDashboardReport } = require('~/utils/dashboardReportsSavedShape')

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'DashboardReportsPage',

  components: { ReportShell, ReportHeader, DashboardReportsWorkbench },

  mixins: [savedReport],

  data () {
    return {
      step: 1,
      /** The workbench's state as it last reported itself — what a Save carries. */
      live: null,
      /** A loaded row, handed to the workbench whole. Not the live state: its own changes must not come back to it. */
      loaded: null,
      /** The client's name from a dropped file — shown locally, never sent anywhere. */
      companyName: '',
      // Resolved client-side in mounted(): window/localStorage are unavailable during SSR.
      apiToken: 'dev-local-bypass'
    }
  },

  computed: {
    clientName () {
      return this.savedReport.clientName || this.companyName || ''
    },
    /** The sign-in's own token for the pages route; the dev bypass on localhost. */
    pagesToken () {
      return this.savedReport.token || this.apiToken
    },
    savedText () {
      const r = this.savedReport.report
      if (!r || !r.savedAt) { return '' }
      const d = new Date(r.savedAt)
      return this.$t('clientReports.saved.savedBy', {
        name: (r.savedBy && r.savedBy.name) || '',
        date: Number.isNaN(d.getTime()) ? '' : this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
      })
    }
  },

  mounted () {
    this.apiToken = this.resolveApiToken()
    // The mixin's mounted() has already read the sign-in; a client goes straight to the document.
    if (this.savedReport.mode === 'client') { this.step = 6 }
  },

  methods: {
    /**
     * Same resolution as pages/quick-position.vue: localhost always uses the dev bypass;
     * otherwise the stored pass, and with no token the backend returns 401 (fail closed).
     * @returns {string}
     */
    resolveApiToken () {
      if (isDevHost()) { return 'dev-local-bypass' }
      return window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
    },
    /**
     * Stepper navigation: backwards always; forward to the review only once figures the
     * report can be built from are confirmed (the accounts step's own check).
     * @param {number} n
     */
    goTo (n) {
      if (n === this.step) { return }
      this.step = n
    },
    /** @param {object} state - the workbench's whole state */
    onState (state) {
      this.live = state
    },
    /**
     * The figures saved per client — consumed by the savedReport mixin.
     * @returns {object} the flat row (utils/dashboardReportsSavedShape)
     */
    reportInputs () {
      return flattenDashboardReport(this.live || emptyState())
    },
    /**
     * Load a saved row back — consumed by the savedReport mixin. Handed to the workbench
     * whole, which recomputes; the page lands on the document.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      const next = applySavedDashboardReport(emptyState(), inputs)
      this.loaded = next
      this.live = next
      this.step = 6
    }
  }
}
</script>

<style scoped>
/* The page frame lives in the shared ReportShell. The step chips read the shared
   visual-standard tokens; copied from pages/quick-position.vue so the intake flows are the
   same object on screen. Header → chips → content sit 16px apart. */
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
@media print {
  .steps { display: none !important; }
  .report-shell ::v-deep .rs-top { display: none !important; }
}
</style>

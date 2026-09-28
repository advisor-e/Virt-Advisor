import reportRecompute from '~/mixins/reportRecompute'
import firmBrand from '~/mixins/firmBrand'
import { getSavedReport } from '~/utils/clientReports'
const { pagesRequestFrom } = require('~/utils/dashboardReportsSavedShape')
const { IMPORT_ROUTE, importFromSaved } = require('~/utils/reportImport')

/**
 * businessReportImport — a client's saved Business Performance Report, worked out again on
 * the report's own route (item 15.13). Shared by the Strategy Planner card that brings the
 * report in and the plan page that prints its Executive Summary, so both ask exactly what
 * the report's own page asks.
 *
 * The consuming component declares `clientId`, `apiToken` and `clientName` props, and reads:
 *   - `importStatus` — 'idle' | 'loading' | 'none' | 'ready' | 'failed'
 *   - `reportState`, `reportFigures`, `reportApproval` — what `DashboardReport` takes
 *   - `savedInfo` — `{ period, savedAt, savedBy }` of the saved row, once read
 *   - `error` (reportRecompute) — the last recompute failed; the figures are stale
 *
 * @route GET /api/client-reports/saved/:clientId?route=/dashboard-reports — the saved row
 * @route POST /api/report/dashboard-reports/pages — the figures, on the firm's thresholds
 */
export default {
  mixins: [reportRecompute, firmBrand],

  data () {
    return {
      importStatus: 'idle',
      reportState: null,
      reportFigures: null,
      reportApproval: null,
      savedInfo: null
    }
  },

  methods: {
    /**
     * Read the client's saved row. Sets `savedInfo` and returns the loaded state, or null
     * when there is no completed report.
     * @returns {Promise<object|null>}
     * @throws when the read itself fails — the caller shows the stale banner, never a blank
     */
    async readSavedReport () {
      const found = importFromSaved(await getSavedReport(this.clientId, IMPORT_ROUTE, this.apiToken))
      if (!found.completed) {
        this.savedInfo = null
        return null
      }
      this.savedInfo = { period: found.period, savedAt: found.savedAt, savedBy: found.savedBy }
      return found.state
    },

    /**
     * Bring the report in: read the saved row, then work its pages out on the report's route.
     * A client with no completed report ends at 'none'; a failed read ends at 'failed'.
     * @returns {Promise<void>}
     */
    async bringInReport () {
      this.importStatus = 'loading'
      this.reportFigures = null
      try {
        const state = await this.readSavedReport()
        if (!state) {
          this.reportState = null
          this.importStatus = 'none'
          return
        }
        this.reportState = state
        await this.recompute()
        this.importStatus = this.error ? 'failed' : 'ready'
      } catch (err) {
        this.importStatus = 'failed'
      }
    },

    /** reportRecompute's request — the report page's own body, for this client. */
    recomputeRequest () {
      if (!this.reportState) { return null }
      return { url: '/api/report/dashboard-reports/pages', body: pagesRequestFrom(this.reportState, this.clientId) }
    },

    /** The pages route resolves the firm's thresholds from this token. */
    recomputeHeaders () {
      return { Authorization: 'Bearer ' + this.apiToken }
    },

    /** @param {object} data - per `computeReportPages` */
    applyResult (data) {
      this.reportFigures = data
      this.reportApproval = data && data.nextSteps ? data.nextSteps : null
    }
  }
}

import {
  getSavedReport, saveReportForClient, restoreReportForClient, getMySavedReport, saveMyReport
} from '~/utils/clientReports'

const TOKEN_KEY = 'advisor_e_token'
const ROLE_KEY = 'advisor_e_role'
const ENTITY_ROLE = 'business_entity'

/**
 * savedReport — a report screen's figures kept per client, per model, and the record of
 * who typed them (design/features/business-entity-reports.md §5, item 4.62, approved by
 * Mike 2026-09-03).
 *
 * Twelve screens hold their figures twelve ways, so the saving lives here once and a
 * screen tells it two things:
 *   - `reportInputs()` → a flat object of its current figures (numbers, booleans, short
 *     strings, or arrays of numbers — what the backend admits);
 *   - `applyReportInputs(inputs)` → load a saved set back into its own state and
 *     recompute. A screen takes only the keys it knows; it never trusts the shape.
 *
 * The screen passes `savedReport` to ReportHeader and listens for its `save`, `restore`
 * and `client-change` events. Everything the header shows comes from this one object.
 *
 * Two modes, decided from the sign-in on the client side and enforced on the backend:
 *   - ADVISOR: a client is chosen on the header (the same picker as the access switch);
 *     a save becomes the advisor's version; Restore puts it back after a client edit.
 *   - CLIENT: the business entity's own copy loads on mount; a save is refused by the
 *     backend unless the advisor opened this model (NOT_OPEN).
 * With no sign-in the mixin is inert and the header shows nothing of it.
 */
export default {
  data () {
    return {
      savedReport: {
        mode: '', // 'advisor' | 'client' | '' (inert)
        token: '',
        clientId: '',
        clientName: '',
        report: null, // { inputs, savedBy: { tier, name }, savedAt, advisorVersion }
        clientChanges: [], // keys the client changed against the advisor's version
        busy: false,
        error: '',
        notice: ''
      }
    }
  },

  computed: {
    /** The catalogue route this screen is saved under. Empty outside a router. */
    savedReportRoute () {
      return this.$route && typeof this.$route.path === 'string' ? this.$route.path : ''
    }
  },

  mounted () {
    if (typeof window === 'undefined' || typeof fetch !== 'function') { return }
    if (typeof this.reportInputs !== 'function' || typeof this.applyReportInputs !== 'function') { return }
    let token = ''
    let role = ''
    try {
      token = window.localStorage.getItem(TOKEN_KEY) || ''
      role = window.localStorage.getItem(ROLE_KEY) || ''
    } catch (e) { return }
    if (!token || !this.savedReportRoute) { return }
    this.savedReport.token = token
    this.savedReport.mode = role === ENTITY_ROLE ? 'client' : 'advisor'
    if (this.savedReport.mode === 'client') { this.loadSavedReport() }
  },

  methods: {
    /**
     * The header's picker chose the client this report is for (advisor mode).
     * @param {{clientId: string, clientName: string}} payload
     */
    onReportClient (payload) {
      if (this.savedReport.mode !== 'advisor') { return }
      this.savedReport.clientId = (payload && payload.clientId) || ''
      this.savedReport.clientName = (payload && payload.clientName) || ''
      this.savedReport.report = null
      this.savedReport.clientChanges = []
      this.savedReport.error = ''
      this.savedReport.notice = ''
      if (this.savedReport.clientId) { this.loadSavedReport() }
    },

    /** Read the current saved row for this route and load its figures into the screen. */
    async loadSavedReport () {
      const s = this.savedReport
      s.busy = true
      s.error = ''
      try {
        const data = s.mode === 'client'
          ? await getMySavedReport(this.savedReportRoute, s.token)
          : await getSavedReport(s.clientId, this.savedReportRoute, s.token)
        this._takeSavedReport(data)
        if (data.report) { this.applyReportInputs(data.report.inputs) }
      } catch (e) {
        s.error = this.$t('clientReports.saved.loadFailed')
      } finally {
        s.busy = false
      }
    },

    /** Save the screen's current figures as this sign-in. */
    async saveReport () {
      const s = this.savedReport
      if (!s.mode || (s.mode === 'advisor' && !s.clientId)) { return }
      s.busy = true
      s.error = ''
      s.notice = ''
      try {
        const inputs = this.reportInputs()
        const data = s.mode === 'client'
          ? await saveMyReport(this.savedReportRoute, inputs, s.token)
          : await saveReportForClient(s.clientId, this.savedReportRoute, inputs, s.token)
        this._takeSavedReport(data)
        s.notice = this.$t('clientReports.saved.saved')
      } catch (e) {
        s.error = this.$t(e && e.code === 'NOT_OPEN' ? 'clientReports.saved.notOpen' : 'clientReports.saved.saveFailed')
      } finally {
        s.busy = false
      }
    },

    /** Advisor only: put the advisor's last version back and load it (D4). */
    async restoreReport () {
      const s = this.savedReport
      if (s.mode !== 'advisor' || !s.clientId) { return }
      s.busy = true
      s.error = ''
      s.notice = ''
      try {
        const data = await restoreReportForClient(s.clientId, this.savedReportRoute, s.token)
        this._takeSavedReport(data)
        if (data.report) { this.applyReportInputs(data.report.inputs) }
        s.notice = this.$t('clientReports.saved.restored')
      } catch (e) {
        s.error = this.$t('clientReports.saved.saveFailed')
      } finally {
        s.busy = false
      }
    },

    /**
     * Whether one figure was changed by the client since the advisor's version — drives
     * the `client` provenance badge beside that control.
     * @param {string} key
     * @returns {boolean}
     */
    isClientChanged (key) {
      return this.savedReport.clientChanges.includes(key)
    },

    _takeSavedReport (data) {
      const s = this.savedReport
      s.report = (data && data.report) || null
      s.clientChanges = Array.isArray(data && data.clientChanges) ? data.clientChanges : []
      if (data && data.clientName) { s.clientName = data.clientName }
    }
  }
}

/**
 * caseMixin
 *
 * Manages the advisor's saved case studies: loads the cases the signed-in
 * advisor may see (their own + firm-shared), runs the cases panel UI, edits the
 * post-session review, toggles a case's private/shared visibility, deletes a
 * case, and promotes a case into the firm's shared team-development library.
 * All persistence goes through the Restify backend via ~/utils/cases (raw SQL
 * lives there) — the mixin holds no business logic of its own.
 */

import { listCases, updateCaseReview, deleteCase, setCaseVisibility, migrateLegacyCases } from '~/utils/cases'

// Restify backend base URL — only used here for the /api/cases/promote call,
// which has no helper in ~/utils/cases yet. Identity is carried on the Bearer
// token; the backend, not this URL, is what scopes/authorises the request.
const BACKEND = 'http://localhost:4000'

export default {
  data () {
    return {
      myCases: [],
      // The full set the advisor may see (own + firm-shared), loaded from the
      // backend. `relevantCases` is derived from this; `myCases` is the own subset.
      visibleCases: [],
      casesError: false,
      visibilityBusyId: null,
      showCasesPanel: false,
      expandedCaseId: null,
      transcriptOpenId: null,
      reviewDraft: { wentWell: '', wentLess: '', changesRecommended: '' },
      reviewSavedId: null,
      confirmDeleteId: null,
      promoteSuccessId: null,
      promoteErrorId: null
    }
  },

  computed: {
    /**
     * Cases shown to the AI as session reference, filtered to the current mode.
     * Capped at 4 (the backend already returns own + firm-shared, newest-first).
     * @returns {Array<object>} up to 4 cases matching this.mode, newest-first
     */
    relevantCases () {
      if (!this.mode) { return [] }
      // Own + firm-shared cases for this mode (the backend already scoped them);
      // most-recent-first is preserved from the server ordering. Cap at 4.
      return this.visibleCases.filter(c => c.mode === this.mode).slice(0, 4)
    }
  },

  async mounted () {
    // One-time lift of any pre-database cases from this browser's localStorage,
    // then load from the backend. Migration failure must never block the load.
    try { await migrateLegacyCases(this.apiToken) } catch (e) { /* keep going */ }
    this.refreshMyCases()
  },

  watch: {
    // The Bearer token is resolved in the parent page's mounted() — which runs
    // AFTER this child mounts — so the first load can race a not-yet-ready token
    // and silently 401 (cases looked "wiped" on refresh). Re-load once it settles.
    apiToken (next, prev) {
      if (next && next !== prev) { this.refreshMyCases() }
    }
  },

  methods: {
    /**
     * Reload visible cases from the backend and recompute the "mine" subset.
     * Identity comes from the server-returned advisorId (not the possibly-
     * placeholder prop), so firm-shared cases from others stay visible to the
     * AI but are not listed as the advisor's own. Never throws — a load failure
     * sets casesError and leaves any already-shown cases in place.
     * @returns {Promise<void>}
     */
    async refreshMyCases () {
      try {
        const { cases, advisorId } = await listCases(this.apiToken)
        this.visibleCases = cases
        // "My" cases are the ones the SIGNED-IN advisor owns — keyed on the
        // server-returned identity, not the (possibly placeholder) advisorId
        // prop. Firm-shared cases from others stay in visibleCases (for the AI
        // reference) but are not listed as "mine".
        this.myCases = advisorId ? cases.filter(c => c.advisorId === advisorId) : cases
        this.casesError = false
      } catch (e) {
        // Never crash the session on a load failure; keep any cases already shown.
        this.casesError = true
      }
    },

    /**
     * Close the cases panel and reset all transient panel state (expanded row,
     * review draft, delete/promote confirmations). Also stops any in-progress
     * review dictation so the mic isn't left running after the panel closes.
     * @returns {void}
     */
    closeCasesPanel () {
      this.showCasesPanel = false
      this.expandedCaseId = null
      if (this.reviewRecordingField) {
        this.recognition && this.recognition.stop()
        this.reviewRecordingField = null
      }
      this.reviewDraft = { wentWell: '', wentLess: '', changesRecommended: '' }
      this.reviewSavedId = null
      this.confirmDeleteId = null
      this.promoteSuccessId = null
      this.promoteErrorId = null
    },

    /**
     * Expand or collapse a case row. On expand, seeds the review draft from the
     * case's existing review (or blanks) so the edit form opens pre-filled.
     * @param {string} id - the case id to toggle
     * @returns {void}
     */
    toggleCase (id) {
      if (this.expandedCaseId === id) {
        this.expandedCaseId = null
        return
      }
      this.expandedCaseId = id
      this.confirmDeleteId = null
      this.reviewSavedId = null
      const c = this.myCases.find(c => c.id === id)
      this.reviewDraft = c && c.review
        ? { wentWell: c.review.wentWell || '', wentLess: c.review.wentLess || '', changesRecommended: c.review.changesRecommended || '' }
        : { wentWell: '', wentLess: '', changesRecommended: '' }
    },

    /**
     * Persist the current review draft for a case, then refresh and close the
     * panel. On failure, keeps the panel open with the draft intact for retry.
     * @param {string} caseId - the case being reviewed
     * @returns {Promise<void>}
     */
    async saveReview (caseId) {
      try {
        await updateCaseReview(caseId, { ...this.reviewDraft, reviewedAt: new Date().toISOString() }, this.apiToken)
        await this.refreshMyCases()
        this.closeCasesPanel()
      } catch (e) {
        // Keep the panel open with the draft intact so the advisor can retry.
        this.casesError = true
      }
    },

    /**
     * Promote a case into the firm's shared team-development library.
     * POSTs to the backend with the case's title, domain, templates and review
     * notes; surfaces a transient success/error flag (auto-cleared after 3s).
     * @route POST {API_BASE_URL}/api/cases/promote
     *   request body: { caseTitle, domain, templates, wentWell, wentLess,
     *                    changesRecommended, promotedBy, promotedAt }
     *   sent with Authorization: Bearer <token> (falls back to dev bypass token)
     * @param {object} c - the case to promote
     * @param {string} c.id - case id (used for the success/error flag)
     * @param {string} c.title - case title
     * @param {string} [c.domain] - advisory domain
     * @param {Array} [c.templates] - associated template ids
     * @param {object} [c.review] - review notes (wentWell/wentLess/changesRecommended)
     * @returns {Promise<void>}
     */
    async promoteCase (c) {
      this.promoteSuccessId = null
      this.promoteErrorId = null
      const token = this.apiToken || 'dev-local-bypass'
      const body = {
        caseTitle: c.title,
        domain: c.domain || null,
        templates: c.templates || [],
        wentWell: c.review && c.review.wentWell ? c.review.wentWell : '',
        wentLess: c.review && c.review.wentLess ? c.review.wentLess : '',
        changesRecommended: c.review && c.review.changesRecommended ? c.review.changesRecommended : '',
        promotedBy: this.advisorId || 'unknown',
        promotedAt: new Date().toISOString()
      }
      try {
        const res = await fetch(`${BACKEND}/api/cases/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        })
        if (!res.ok) { throw new Error('Request failed') }
        this.promoteSuccessId = c.id
        setTimeout(() => { this.promoteSuccessId = null }, 3000)
      } catch (e) {
        this.promoteErrorId = c.id
        setTimeout(() => { this.promoteErrorId = null }, 3000)
      }
    },

    /**
     * Flip a case between private and shared (both directions). Owner-only is
     * enforced server-side; identity rides the token. Keeps the case expanded so
     * the advisor sees the new state immediately, and uses visibilityBusyId to
     * disable the toggle while the round-trip is in flight.
     * @param {string} caseId - the case to re-scope (must be one of myCases)
     * @returns {Promise<void>}
     */
    async toggleVisibility (caseId) {
      const c = this.myCases.find(x => x.id === caseId)
      if (!c) { return }
      const next = c.visibility === 'shared' ? 'private' : 'shared'
      this.visibilityBusyId = caseId
      try {
        await setCaseVisibility(caseId, next, this.apiToken)
        await this.refreshMyCases()
      } catch (e) {
        this.casesError = true
      } finally {
        this.visibilityBusyId = null
      }
    },

    /**
     * Delete a case via the backend, then refresh and collapse the panel.
     * @param {string} id - the case id to delete
     * @returns {Promise<void>}
     */
    async deleteCaseAndRefresh (id) {
      try {
        await deleteCase(id, this.apiToken)
        await this.refreshMyCases()
        this.expandedCaseId = null
        this.confirmDeleteId = null
      } catch (e) {
        this.casesError = true
      }
    },

    /**
     * Map an internal mode key to its human-readable label for display.
     * @param {string} mode - one of 'client' | 'discover' | 'plan' | 'learn'
     * @returns {string} the display label, or the raw mode if unrecognised
     */
    modeName (mode) {
      return { client: 'Client situation', discover: 'Discovery', plan: 'Planning', learn: 'Learning' }[mode] || mode
    },

    /**
     * Format an ISO date string as a short en-GB date (e.g. "5 Jul 2026").
     * @param {string} iso - ISO 8601 date string (empty/falsy returns '')
     * @returns {string} the formatted date, or '' if no date given
     */
    formatDate (iso) {
      if (!iso) { return '' }
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
}

import { listCases, updateCaseReview, deleteCase, setCaseVisibility, migrateLegacyCases } from '~/utils/cases'

export default {
  data () {
    return {
      myCases: [],
      // The full set the advisor may see (own + firm-shared), loaded from the
      // backend. `relevantCases` is derived from this; `myCases` is the own subset.
      visibleCases: [],
      // The authenticated advisor id as the SERVER returned it (never a
      // client-held id) — used to scope owner-only features like the
      // session-start catch-up card.
      serverAdvisorId: null,
      casesError: false,
      visibilityBusyId: null,
      showCasesPanel: false,
      expandedCaseId: null,
      transcriptOpenId: null,
      // templateOutcomes: per-template chips keyed by title —
      // { [title]: { used: 'full'|'partial'|'none'|null, outcome: 'well'|'less'|null } }
      reviewDraft: { wentWell: '', wentLess: '', changesRecommended: '', templateOutcomes: {} },
      reviewSavedId: null,
      confirmDeleteId: null,
      promoteSuccessId: null,
      promoteErrorId: null
    }
  },

  computed: {
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
    // AFTER this child mounts — so the first load (and the first migration attempt)
    // can race a not-yet-ready token and silently 401 (cases looked "wiped" on
    // refresh). Re-run migration AND re-load once the real token settles; migration
    // is idempotent + re-entrancy-safe, so this can't duplicate cases.
    async apiToken (next, prev) {
      if (next && next !== prev) {
        try { await migrateLegacyCases(next) } catch (e) { /* keep going */ }
        this.refreshMyCases()
      }
    }
  },

  methods: {
    async refreshMyCases () {
      try {
        const { cases, advisorId } = await listCases(this.apiToken)
        this.visibleCases = cases
        this.serverAdvisorId = advisorId || null
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

    closeCasesPanel () {
      this.showCasesPanel = false
      this.expandedCaseId = null
      if (this.reviewRecordingField) {
        this.recognition && this.recognition.stop()
        this.reviewRecordingField = null
      }
      this.reviewDraft = { wentWell: '', wentLess: '', changesRecommended: '', templateOutcomes: {} }
      this.reviewSavedId = null
      this.confirmDeleteId = null
      this.promoteSuccessId = null
      this.promoteErrorId = null
    },

    toggleCase (id) {
      if (this.expandedCaseId === id) {
        this.expandedCaseId = null
        return
      }
      this.expandedCaseId = id
      this.confirmDeleteId = null
      this.reviewSavedId = null
      const c = this.myCases.find(c => c.id === id)
      // Pre-initialise EVERY template's outcome entry so the chip state is
      // reactive from the start (Vue 2 cannot observe keys added later),
      // seeding from any outcomes already saved on the case.
      const outcomes = {}
      if (c && Array.isArray(c.templates)) {
        for (const t of c.templates) {
          const saved = (c.templateOutcomes || []).find(o => o.title === t)
          outcomes[t] = saved ? { used: saved.used, outcome: saved.outcome } : { used: null, outcome: null }
        }
      }
      this.reviewDraft = c && c.review
        ? { wentWell: c.review.wentWell || '', wentLess: c.review.wentLess || '', changesRecommended: c.review.changesRecommended || '', templateOutcomes: outcomes }
        : { wentWell: '', wentLess: '', changesRecommended: '', templateOutcomes: outcomes }
    },

    // Chip handlers — setting `used` to "didn't use it" clears the landed
    // verdict (a template that wasn't used cannot have landed).
    setOutcomeUsed (title, used) {
      const entry = this.reviewDraft.templateOutcomes[title]
      if (!entry) { return }
      entry.used = entry.used === used ? null : used
      if (entry.used === 'none' || entry.used === null) { entry.outcome = null }
    },

    setOutcomeResult (title, outcome) {
      const entry = this.reviewDraft.templateOutcomes[title]
      if (!entry || entry.used === 'none' || entry.used === null) { return }
      entry.outcome = entry.outcome === outcome ? null : outcome
    },

    async saveReview (caseId) {
      try {
        // The chips map → the API's array shape; only templates the advisor
        // actually marked are sent (untouched ones stay unrecorded, honestly).
        const templateOutcomes = Object.entries(this.reviewDraft.templateOutcomes || {})
          .filter(([, v]) => v && v.used)
          .map(([title, v]) => ({ title, used: v.used, outcome: v.outcome || null }))
        await updateCaseReview(caseId, {
          wentWell: this.reviewDraft.wentWell,
          wentLess: this.reviewDraft.wentLess,
          changesRecommended: this.reviewDraft.changesRecommended,
          templateOutcomes: templateOutcomes.length ? templateOutcomes : null,
          reviewedAt: new Date().toISOString()
        }, this.apiToken)
        await this.refreshMyCases()
        this.closeCasesPanel()
      } catch (e) {
        // Keep the panel open with the draft intact so the advisor can retry.
        this.casesError = true
      }
    },

    /**
     * Promote a reviewed case into the FIRM's coaching reference.
     * Sends ONLY the case id — the backend builds the coaching entry from the
     * stored case and stamps who/when from the verified token, so the promoted
     * text and audit trail can never be forged from the browser.
     * @route POST /api/cases/promote (firmAuth + requireManagerRole)
     */
    async promoteCase (c) {
      this.promoteSuccessId = null
      this.promoteErrorId = null
      const token = this.apiToken || 'dev-local-bypass'
      try {
        const res = await fetch('/api/cases/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ caseId: c.id })
        })
        if (!res.ok) { throw new Error('Request failed') }
        this.promoteSuccessId = c.id
        setTimeout(() => { this.promoteSuccessId = null }, 3000)
      } catch (e) {
        this.promoteErrorId = c.id
        setTimeout(() => { this.promoteErrorId = null }, 3000)
      }
    },

    // Flip a case between private and shared (both directions). Owner-only is
    // enforced server-side; identity rides the token. Keeps the case expanded so
    // the advisor sees the new state immediately.
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

    modeName (mode) {
      return { client: 'Client situation', discover: 'Discovery', plan: 'Planning', learn: 'Learning' }[mode] || mode
    },

    formatDate (iso) {
      if (!iso) { return '' }
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
}

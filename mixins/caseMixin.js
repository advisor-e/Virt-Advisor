import { getRelevantCases, updateCaseReview, deleteCase, getCases } from '~/utils/cases'

export default {
  data () {
    return {
      myCases: [],
      showCasesPanel: false,
      expandedCaseId: null,
      transcriptOpenId: null,
      reviewDraft: { wentWell: '', wentLess: '', changesRecommended: '' },
      reviewSavedId: null,
      confirmDeleteId: null
    }
  },

  computed: {
    relevantCases () {
      if (!this.mode) { return [] }
      return getRelevantCases(this.advisorId, this.firmId, this.mode)
    }
  },

  mounted () {
    this.refreshMyCases()
  },

  methods: {
    refreshMyCases () {
      this.myCases = getCases().filter(c => c.advisorId === this.advisorId)
    },

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
      this.reviewDraft = c && c.review
        ? { wentWell: c.review.wentWell || '', wentLess: c.review.wentLess || '', changesRecommended: c.review.changesRecommended || '' }
        : { wentWell: '', wentLess: '', changesRecommended: '' }
    },

    saveReview (caseId) {
      updateCaseReview(caseId, { ...this.reviewDraft, reviewedAt: new Date().toISOString() })
      this.refreshMyCases()
      this.closeCasesPanel()
    },

    deleteCaseAndRefresh (id) {
      deleteCase(id)
      this.refreshMyCases()
      this.expandedCaseId = null
      this.confirmDeleteId = null
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

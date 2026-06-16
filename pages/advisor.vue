<template lang="pug">
VirtualAdvisor(
  :org-template-ids="null"
  :advisor-id="advisorId"
  :firm-id="firmId"
)
</template>

<script>
// localStorage key Advisor-e stores the firmId under after login — same key the
// Firm Manager page uses, so an advisor and their firm manager share one firm
// identity (and the advisor session loads that firm's distinctions/overrides).
const FIRM_ID_KEY = 'advisor_e_firm_id'

export default {
  name: 'AdvisorPage',
  data () {
    return {
      // Resolved client-side in mounted(): window/localStorage are unavailable
      // during SSR and must never be read in data()/computed/created().
      firmId: null
    }
  },
  computed: {
    // URL-only and SSR-safe — Advisor-e may pass advisorId as a query param.
    advisorId () {
      return (this.$route && this.$route.query.advisorId) || 'local-advisor'
    }
  },
  mounted () {
    this.firmId = this.resolveFirmId()
  },
  methods: {
    /**
     * Firm identity for this advisor session, in priority order:
     *   1. an explicit ?firmId= URL override (platform deep-link / testing)
     *   2. the logged-in firm from Advisor-e (localStorage, same key as Firm Manager)
     *   3. a localhost dev fallback so firm distinctions load without a login in dev
     * @returns {string|null} the firmId, or null when none can be determined
     *
     * SECURITY: this firmId is currently client-supplied. The advisor backend
     * route must verify it (JWT) before trusting it for firm scoping — otherwise
     * one firm's data is reachable by changing the value. See
     * design/DISTINCTIONS-CASCADE-PLAN.md Stage 0 (open decision).
     */
    resolveFirmId () {
      const fromUrl = this.$route && this.$route.query.firmId
      if (fromUrl) { return fromUrl }
      const fromStorage = window.localStorage.getItem(FIRM_ID_KEY)
      if (fromStorage) { return fromStorage }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'dev-firm-001'
      }
      return null
    }
  }
}
</script>

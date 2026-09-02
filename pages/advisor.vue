<template lang="pug">
VirtualAdvisor(
  :org-template-ids="null"
  :advisor-id="advisorId"
  :firm-id="firmId"
  :api-token="apiToken"
)
</template>

<script>

import { isDevHost } from '~/utils/devHost'
// localStorage key Advisor-e stores the firmId under after login — same key the
// Firm Manager page uses, so an advisor and their firm manager share one firm
// identity (and the advisor session loads that firm's distinctions/overrides).
const FIRM_ID_KEY = 'advisor_e_firm_id'
// localStorage key Advisor-e stores the JWT under after login (same key the Firm
// Manager page reads). The advisor backend derives firmId/advisorId from this
// verified token, so it is what actually scopes the session — firmId below is
// passed only to child UI components, not trusted by the backend.
const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'AdvisorPage',
  data () {
    return {
      // Resolved client-side in mounted(): window/localStorage are unavailable
      // during SSR and must never be read in data()/computed/created().
      firmId: null,
      apiToken: 'dev-local-bypass'
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
    this.apiToken = this.resolveApiToken()
  },
  methods: {
    /**
     * Firm identity for this advisor session, in priority order:
     *   1. an explicit ?firmId= URL override (platform deep-link / testing)
     *   2. the logged-in firm from Advisor-e (localStorage, same key as Firm Manager)
     *   3. a localhost dev fallback so firm distinctions load without a login in dev
     * @returns {string|null} the firmId, or null when none can be determined
     *
     * NOTE: this value is now used only to seed child UI components. The backend
     * no longer trusts a client-supplied firmId — it derives the real firmId from
     * the verified Bearer token (firmAuth), closing the earlier IDOR.
     */
    resolveFirmId () {
      const fromUrl = this.$route && this.$route.query.firmId
      if (fromUrl) { return fromUrl }
      const fromStorage = window.localStorage.getItem(FIRM_ID_KEY)
      if (fromStorage) { return fromStorage }
      if (isDevHost()) {
        return 'dev-firm-001'
      }
      return null
    },
    /**
     * Bearer token sent on every advisor backend call. The real JWT (set by
     * Advisor-e at login) when present; otherwise the dev-bypass token, which
     * firmAuth honours only on a non-production backend. In production with no
     * token the backend correctly returns 401 (fail closed).
     * @returns {string} the token to send as `Bearer <token>`
     */
    resolveApiToken () {
      // On localhost use the dev bypass directly (same as the Firm Manager page) so a
      // stale advisor_e_token left in the browser can't override it and 401 the
      // case-study reads — which looked like saved cases being "wiped" on refresh.
      if (isDevHost()) {
        return 'dev-local-bypass'
      }
      return window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
    }
  }
}
</script>

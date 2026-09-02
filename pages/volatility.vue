<template lang="pug">
report-shell
  volatility-report(:api-token="apiToken")
</template>

<script>
/**
 * /volatility page — the Volatility Report (Risk · Report class).
 * Thin: wraps the screen in the shared ReportShell (which owns the page frame —
 * canvas, centred 1120px column, padding — and the visual-standard tokens) and
 * renders the screen component. The calc runs backend-only, and so does the
 * by-month accounts upload (item 4.54) — the token below is for its firmAuth route.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import VolatilityReport from '~/components/VolatilityReport.vue'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'VolatilityPage',
  components: { ReportShell, VolatilityReport },

  data () {
    return {
      // Resolved client-side in mounted(): window/localStorage are unavailable
      // during SSR and must never be read in data()/computed/created().
      apiToken: 'dev-local-bypass'
    }
  },

  mounted () {
    this.apiToken = this.resolveApiToken()
  },

  methods: {
    /**
     * Same resolution as pages/quick-position.vue: localhost always uses the dev
     * bypass (a stale stored token must not 401 local work); otherwise the stored
     * pass, and with no token the backend correctly returns 401 (fail closed).
     * @returns {string} the token to send as `Bearer <token>`
     */
    resolveApiToken () {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'dev-local-bypass'
      }
      return window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
    }
  }
}
</script>

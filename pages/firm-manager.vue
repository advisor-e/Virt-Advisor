<template lang="pug">
.firm-manager-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4 Access Restricted
        p.subtitle.is-6
          | The Firm Manager hub requires a Firm Manager or Platform Admin role.
          br
          | Please contact your account administrator.

  firm-manager-hub(
    v-else
    :firm-id="firmId"
    :user-email="userEmail"
    :api-token="apiToken"
  )
</template>

<script>
/**
 * /firm-manager page
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   This page reads auth state from localStorage using the keys defined in
 *   AUTH_STORAGE below. Update these to match wherever Advisor-e stores the
 *   JWT and user role after login.
 *
 *   The server validates the token independently on every API call — this
 *   client-side check is UI-only (prevents rendering the hub for wrong roles).
 */

import FirmManagerHub from '~/components/FirmManagerHub.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token', // localStorage key for the JWT
  roleKey: 'advisor_e_role', // localStorage key for the user's role
  firmKey: 'advisor_e_firm_id', // localStorage key for the firmId
  emailKey: 'advisor_e_email' // localStorage key for the user's email
}

const MANAGER_ROLES = ['firm_manager', 'platform_admin']

export default {
  name: 'FirmManagerPage',
  components: { FirmManagerHub },

  data () {
    return {
      checking: true,
      authorised: false,
      firmId: null,
      userEmail: null,
      apiToken: null
    }
  },

  mounted () {
    this.checkAuth()
  },

  methods: {
    checkAuth () {
      // Dev auto-login — localhost only, never runs in production
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-bypass'
        this.firmId = 'dev-firm-001'
        this.userEmail = 'dev@local'
        this.authorised = true
        this.checking = false
        return
      }

      // Read auth from wherever Advisor-e stores it after login
      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const role = localStorage.getItem(AUTH_STORAGE.roleKey)
      const firmId = localStorage.getItem(AUTH_STORAGE.firmKey)
      const email = localStorage.getItem(AUTH_STORAGE.emailKey)

      if (token && firmId && MANAGER_ROLES.includes(role)) {
        this.apiToken = token
        this.firmId = firmId
        this.userEmail = email || ''
        this.authorised = true
      }

      this.checking = false
    }
  }
}
</script>

<style scoped>
.firm-manager-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

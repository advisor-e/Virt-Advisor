<template lang="pug">
.tier-manager-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4(v-if="notConnected") This level is not connected yet.
        p.subtitle.is-6(v-if="notConnected") Your Advisor-e administrator will enable it.
        template(v-else)
          p.title.is-4 Access Restricted
          p.subtitle.is-6
            | This hub is for global group managers.
            br
            | Please contact your account administrator.

  firm-manager-hub(
    v-else
    scope="global"
    :firm-id="''"
    :user-email="userEmail"
    :api-token="apiToken"
    :user-role="userRole"
  )
</template>

<script>
/**
 * /global-group-manager page — the GLOBAL GROUP MANAGER HUB.
 *
 * Built from design/mockups/tier-hub-pages.html (approved by Mike 2026-08-10).
 * The title and the address are his own words: "as a global group manager, once I
 * log in via the Advisor-e mechanism, I need to see a page that says Global Group
 * Manager Hub and performs accordingly".
 *
 * It renders FirmManagerHub at scope="global" rather than a screen of its own —
 * Mike's ruling of 2026-07-30, "all of the functionality that you see at firm
 * manager is simply repeated at group manager or global manager… there's no new
 * functionality". Which tabs that scope shows is stated by tier name in TAB_TIERS
 * inside that component, and pinned by tests/unit/hubTabTiers.test.js.
 *
 * 🔴 FAIL CLOSED — ruled by Mike 2026-08-10 (artefact §4.3). Nobody reaches this
 * page in a real deployment, because Advisor-e issues no role for this tier yet:
 * GLOBAL_ROLES below is empty, so no role value can match. Anyone who arrives sees
 * a plain message saying the level is not connected — not a blank screen, not a
 * hidden 404. Letting an existing role stand in is exactly what ran the mentor's
 * own saves into a firm's storage for weeks.
 *
 * ⚠ DO NOT "TEMPORARILY" ADD platform_admin TO GLOBAL_ROLES. A platform admin is
 * the mentor; admitting them here would resolve their saves to a global group's
 * scope and quietly move the mentor's content out of the platform scope every
 * firm inherits from.
 *
 * INTEGRATION NOTE (for the Advisor-e team):
 *   Add the real global-group-manager role value to GLOBAL_ROLES here, and to
 *   AUTH.globalManagerRole in config/integration.js. The token must also carry
 *   AUTH.globalGroupClaim (which brand this person manages) or the backend
 *   refuses the request rather than guessing — see server/middleware/firmAuth.js
 *   tierStorageScope.
 */

import FirmManagerHub from '~/components/FirmManagerHub.vue'

// Matches pages/mentor.vue and pages/firm-manager.vue — the keys Advisor-e stores
// auth under after login.
// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  roleKey: 'advisor_e_role',
  emailKey: 'advisor_e_email'
}

// 🔴 EMPTY ON PURPOSE. See the fail-closed note above. Empty means no signed-in
// user can reach this hub, which is the honest state until the role exists.
const GLOBAL_ROLES = []

export default {
  name: 'GlobalGroupManagerPage',
  components: { FirmManagerHub },

  data () {
    return {
      checking: true,
      authorised: false,
      // Distinguishes "this tier does not exist yet" from "you are the wrong
      // person". Both refuse; only one of them is the user's fault, and telling a
      // manager they are unauthorised when the feature is simply not wired yet
      // sends them to an administrator who can do nothing about it.
      notConnected: GLOBAL_ROLES.length === 0,
      apiToken: null,
      userEmail: '',
      userRole: ''
    }
  },

  mounted () {
    this.checkAuth()
  },

  methods: {
    checkAuth () {
      // Dev auto-login — localhost only, never in production. This is the ONLY
      // way the hub can be opened today (artefact §6: "openable locally in
      // development — but not by the person they are for"). The token matches
      // DEV_GLOBAL_TOKEN in server/middleware/firmAuth.js, which resolves the
      // storage scope through the same tierChain helpers a real token will use.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-global'
        this.userRole = 'platform_admin'
        this.authorised = true
        this.checking = false
        return
      }

      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const role = localStorage.getItem(AUTH_STORAGE.roleKey)

      if (token && GLOBAL_ROLES.includes(role)) {
        this.apiToken = token
        this.userRole = role
        this.userEmail = localStorage.getItem(AUTH_STORAGE.emailKey) || ''
        this.authorised = true
      }

      this.checking = false
    }
  }
}
</script>

<style scoped>
.tier-manager-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

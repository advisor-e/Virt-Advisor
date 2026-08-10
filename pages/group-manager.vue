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
            | This hub is for group managers.
            br
            | Please contact your account administrator.

  firm-manager-hub(
    v-else
    scope="group"
    :firm-id="''"
    :user-email="userEmail"
    :api-token="apiToken"
    :user-role="userRole"
  )
</template>

<script>
/**
 * /group-manager page — the GROUP MANAGER HUB.
 *
 * The country tier: a group manager runs the firms of one brand in one country.
 * Built from design/mockups/tier-hub-pages.html (approved by Mike 2026-08-10);
 * the title and address are his own words.
 *
 * Identical in every respect to pages/global-group-manager.vue except the scope it
 * renders at and the roles it admits. That is not duplication to be factored away
 * — Mike's ruling of 2026-07-30 is that the two tiers "do the same job at a
 * different width", and the ONE thing that differs between them (which tabs each
 * shows) already lives in a single place, TAB_TIERS in FirmManagerHub.vue. What is
 * repeated here is the fail-closed auth gate, and a shared gate parameterised by
 * tier would make it easier to admit the wrong tier by editing one argument.
 *
 * 🔴 FAIL CLOSED — ruled by Mike 2026-08-10 (artefact §4.3). GROUP_ROLES is empty
 * because Advisor-e issues no role for this tier yet, so nobody reaches this page
 * in a real deployment and anyone who arrives is told the level is not connected.
 *
 * ⚠ DO NOT "TEMPORARILY" ADD platform_admin OR firm_manager TO GROUP_ROLES. A firm
 * manager admitted here would have their saves resolved to a whole country's
 * scope, and every firm in that country would inherit one firm's edits.
 *
 * INTEGRATION NOTE (for the Advisor-e team):
 *   Add the real group-manager role value to GROUP_ROLES here, and to
 *   AUTH.groupManagerRole in config/integration.js. The token must carry BOTH
 *   AUTH.globalGroupClaim (the brand) and AUTH.countryClaim (the country), or the
 *   backend refuses the request rather than guessing which country's content this
 *   manager owns — see server/middleware/firmAuth.js tierStorageScope.
 */

import FirmManagerHub from '~/components/FirmManagerHub.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  roleKey: 'advisor_e_role',
  emailKey: 'advisor_e_email'
}

// 🔴 EMPTY ON PURPOSE. See the fail-closed note above.
const GROUP_ROLES = []

export default {
  name: 'GroupManagerPage',
  components: { FirmManagerHub },

  data () {
    return {
      checking: true,
      authorised: false,
      // "Not connected yet" vs "wrong person" — both refuse, but only one of them
      // is something an administrator can act on.
      notConnected: GROUP_ROLES.length === 0,
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
      // Dev auto-login — localhost only, never in production. Matches
      // DEV_GROUP_TOKEN in server/middleware/firmAuth.js, which resolves the
      // storage scope through the same tierChain helpers a real token will use.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-group'
        this.userRole = 'platform_admin'
        this.authorised = true
        this.checking = false
        return
      }

      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const role = localStorage.getItem(AUTH_STORAGE.roleKey)

      if (token && GROUP_ROLES.includes(role)) {
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

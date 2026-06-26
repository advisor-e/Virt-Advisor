<template lang="pug">
.mentor-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4 Access Restricted
        p.subtitle.is-6
          | The Mentor view is available to the mentor only.
          br
          | Please contact your account administrator.

  mentor-review(v-else :api-token="apiToken")
</template>

<script>
/**
 * /mentor page — the cross-firm Mentor review surface (a separate page only the
 * mentor sees). UI-only access gate; the server independently role-gates every
 * /api/mentor call (requireMentorRole), so this check only prevents rendering
 * for the wrong role.
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   Reads auth from localStorage (AUTH_STORAGE keys) — update to match where
 *   Advisor-e stores the JWT + role. The mentor role is interim platform_admin
 *   (see AUTH.mentorRole / design/USER-LEVEL-CASCADE-HANDOVER.md); add the real
 *   'mentor' role to MENTOR_ROLES when it lands upstream.
 */

import MentorReview from '~/components/MentorReview.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  roleKey: 'advisor_e_role',
  emailKey: 'advisor_e_email'
}

// Interim: the mentor maps to platform_admin until a distinct 'mentor' role
// exists upstream. Keep in step with AUTH.mentorRole on the backend.
const MENTOR_ROLES = ['platform_admin']

export default {
  name: 'MentorPage',
  components: { MentorReview },

  data () {
    return {
      checking: true,
      authorised: false,
      apiToken: null
    }
  },

  mounted () {
    this.checkAuth()
  },

  methods: {
    checkAuth () {
      // Dev auto-login as the mentor — localhost only, never in production.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-mentor'
        this.authorised = true
        this.checking = false
        return
      }

      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const role = localStorage.getItem(AUTH_STORAGE.roleKey)

      if (token && MENTOR_ROLES.includes(role)) {
        this.apiToken = token
        this.authorised = true
      }

      this.checking = false
    }
  }
}
</script>

<style scoped>
.mentor-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

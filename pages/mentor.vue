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

  firm-manager-hub(
    v-else
    scope="mentor"
    :firm-id="''"
    :user-email="userEmail"
    :api-token="apiToken"
    :user-role="userRole"
  )
</template>

<script>
/**
 * /mentor page — the MENTOR HUB. UI-only access gate; the server independently
 * role-gates every /api/mentor call (requireMentorRole), so this check only
 * prevents rendering for the wrong role.
 *
 * It renders FirmManagerHub with scope="mentor" rather than a screen of its own.
 * That is Mike's ruling of 2026-07-30 — "every tier is the same screen,
 * re-scoped… there's no new functionality" — and it is why the Mentor Hub gains
 * Domain Support, Logic Tables, the Logic-Lab, the Staircase, Quizzes, Adviser
 * Network, Team Progress and Team Case Studies without any of them being built
 * twice. The mentor-only Case Reviews tab and the plain-CRUD Advisory
 * Distinctions tab live inside that component, behind the same scope prop.
 *
 * ⚠ SHELL ONLY — the tabs READ correctly (with no override stored, every tier
 * resolves to the platform default, which is the mentor's own content). What a
 * tab SAVES still lands in firm-shaped storage, because firm_framework_versions
 * is keyed (firm_id, config_key) and has no column for a tier above the firm.
 * Advisory Distinctions is the exception — it already writes to a reserved
 * global scope. See design/MENTOR-HUB-CONSOLIDATED-NOTES.md §5.
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   Reads auth from localStorage (AUTH_STORAGE keys) — update to match where
 *   Advisor-e stores the JWT + role. The mentor role is interim platform_admin
 *   (see AUTH.mentorRole / design/USER-LEVEL-CASCADE-HANDOVER.md); add the real
 *   'mentor' role to MENTOR_ROLES when it lands upstream.
 */

import FirmManagerHub from '~/components/FirmManagerHub.vue'

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
  components: { FirmManagerHub },

  data () {
    return {
      checking: true,
      authorised: false,
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
      // Dev auto-login as the mentor — localhost only, never in production.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-mentor'
        // Matches the dev bypass token's identity on the backend, so the hub's
        // admin-only tab gating behaves the same locally as it will signed in.
        this.userRole = MENTOR_ROLES[0]
        this.authorised = true
        this.checking = false
        return
      }

      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const role = localStorage.getItem(AUTH_STORAGE.roleKey)

      if (token && MENTOR_ROLES.includes(role)) {
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
.mentor-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

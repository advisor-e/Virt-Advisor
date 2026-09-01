<template lang="pug">
.meeting-preset-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4 Access Restricted
        p.subtitle.is-6
          | Please sign in to see what your firm checks on in a meeting.
          br
          | Contact your account administrator if you think you should have access.

  .container.py-5(v-else)
    h1.title.is-4 Before your meeting
    meeting-preset(:api-token="apiToken")
</template>

<script>
/**
 * /meeting-preset page — the advisor's pre-set for Meeting Review (slice 1).
 *
 * Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` Stage B1, approved by Mike 2026-09-01.
 *
 * UI-only access gate, matching every other page here: the server independently checks the
 * bearer token on `/api/meeting/observations`, so this only prevents rendering.
 *
 * ⚠ NO ROLE LIST. Every signed-in advisor sees their own firm's checklist — that is the
 * point of it. The manager-only half is the Meeting Review tab in the hub.
 *
 * INTEGRATION NOTE (for the Advisor-e team): reads auth from localStorage using the
 * AUTH_STORAGE keys below, the same TODO every other page here carries.
 */

import MeetingPreset from '~/components/MeetingPreset.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  firmKey: 'advisor_e_firm_id'
}

export default {
  name: 'MeetingPresetPage',
  components: { MeetingPreset },

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
      // Dev auto-login — localhost only, never runs in production.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiToken = 'dev-local-bypass'
        this.authorised = true
        this.checking = false
        return
      }

      const token = localStorage.getItem(AUTH_STORAGE.tokenKey)
      const firmId = localStorage.getItem(AUTH_STORAGE.firmKey)
      if (token && firmId) {
        this.apiToken = token
        this.authorised = true
      }

      this.checking = false
    }
  }
}
</script>

<style scoped>
.meeting-preset-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

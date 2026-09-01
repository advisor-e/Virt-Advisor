<template lang="pug">
.meeting-review-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4 Access Restricted
        p.subtitle.is-6
          | Please sign in to read your meeting reports.
          br
          | Contact your account administrator if you think you should have access.

  .container.py-5(v-else-if="!meetingId")
    b-message(type="is-warning" size="is-small")
      | #[b No meeting was named.] Open your reports from the recording screen, which knows
      |  which meeting you have just finished.

  .container.py-5(v-else)
    h1.title.is-4 After your meeting
    meeting-review(:api-token="apiToken" :meeting-id="meetingId")
</template>

<script>
/**
 * /meeting-review page — the two reports (slice 3).
 *
 * Design `design/features/meeting-review.md` P2; artefact
 * `design/mockups/meeting-review.html` C1 and C2, approved by Mike 2026-09-01. The four
 * deliberate differences from that drawing are named in `components/MeetingReview.vue`.
 *
 * 🔴 THE MEETING IS NAMED IN THE URL AND THAT IS NOT A SECURITY HOLE, BUT ONLY BECAUSE THE
 * SERVER SAYS SO. Every reports route resolves the meeting through `ownedMeeting`, which
 * checks the firm AND the advisor and answers 404 to everyone else — a guessed id reaches
 * nothing. The id is 32 random hex characters, so it is not guessable in the first place;
 * neither fact is relied on alone.
 *
 * UI-only access gate, matching every other page here: the server independently checks the
 * bearer token, so this only prevents rendering.
 *
 * ⚠ NO §4 BANNER HERE, DELIBERATELY. `/meeting-record` carries the warning that a real
 * client must not be recorded until the four non-coding items in Brief §4 are done, because
 * that is the screen where somebody could press record. This screen reads a recording that
 * already exists; repeating the warning here would not stop anything and would train people
 * to scroll past it where it matters.
 *
 * INTEGRATION NOTE (for the Advisor-e team): reads auth from localStorage using the
 * AUTH_STORAGE keys below, the same TODO every other page here carries.
 */

import MeetingReview from '~/components/MeetingReview.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  firmKey: 'advisor_e_firm_id'
}

export default {
  name: 'MeetingReviewPage',
  components: { MeetingReview },

  data () {
    return {
      checking: true,
      authorised: false,
      apiToken: null
    }
  },

  computed: {
    /** Which meeting to read, from `?meeting=<id>`. */
    meetingId () {
      return this.$route.query.meeting || ''
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
.meeting-review-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>

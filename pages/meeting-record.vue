<template lang="pug">
.meeting-record-page
  .has-text-centered(v-if="checking" style="padding: 4rem;")
    b-loading(:is-full-page="false" :active="true")

  .hero.is-fullheight-with-navbar(v-else-if="!authorised")
    .hero-body
      .container.has-text-centered
        p.title.is-4 Access Restricted
        p.subtitle.is-6
          | Please sign in to record a meeting.
          br
          | Contact your account administrator if you think you should have access.

  .container.py-5(v-else)
    h1.title.is-4 Record a meeting

    b-message(type="is-warning" size="is-small")
      | #[b Not for a real client meeting yet.] The consent wording still needs a lawyer's
      |  reading in each market, and the firm's data-protection groundwork is not finished.
      |  Record yourself to try this out.

    .has-text-centered.py-5(v-if="loadingPoints")
      b-loading(:is-full-page="false" :active="true")

    b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

    template(v-else-if="!started")
      .box
        b-field(label="What kind of meeting?" label-position="on-border")
          b-select(v-model="scenarioId" expanded)
            option(v-for="s in scenarios" :key="s.id" :value="s.id") {{ s.name }}

        h4.title.is-6.mt-4.mb-2 What you will be checked on
        p.is-size-7.has-text-grey(v-if="!points.length")
          | Your firm has not set anything for this kind of meeting yet. You can still record.
        .mrp-pt(v-for="p in points" :key="p.id")
          span.mrp-box
          span {{ p.text }}

        .buttons.mt-4
          b-button(type="is-primary" :disabled="!scenarioId" @click="started = true") Continue

    meeting-recorder(
      v-else
      :api-token="apiToken"
      :scenario-id="scenarioId"
      :points="points"
      @exit="started = false")
</template>

<script>
/**
 * /meeting-record page — Meeting Review slice 2: consent, capture, transcription, deletion.
 *
 * Design `design/features/meeting-review.md`; artefact
 * `design/mockups/meeting-review.html` Stage B2–B4, approved by Mike 2026-09-01.
 *
 * UI-only access gate, matching every other page here: the server independently checks the
 * bearer token on every route, so this only prevents rendering.
 *
 * 🔴 THE BANNER IS NOT BOILERPLATE. Brief §4 lists four things that are nobody's coding task
 * — a data protection impact assessment, staff consultation, the provider's written terms for
 * submitted AUDIO, and a lawyer's reading of the consent wording in each market — and they
 * gate a first real recording rather than a first commit. The code is finished; the
 * groundwork is not, and a screen that did not say so would be read as permission.
 *
 * ⚠ THE PRE-SET IS SHOWN HERE TOO, and that is deliberate rather than duplication. Wording
 * page §4: when a client declines, "the meeting then proceeds unrecorded, and the pre-set
 * observation list is still shown, because it is useful on its own".
 *
 * INTEGRATION NOTE (for the Advisor-e team): reads auth from localStorage using the
 * AUTH_STORAGE keys below, the same TODO every other page here carries.
 */

import MeetingRecorder from '~/components/MeetingRecorder.vue'

// TODO: update these keys to match how Advisor-e stores auth in localStorage
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  firmKey: 'advisor_e_firm_id'
}

export default {
  name: 'MeetingRecordPage',
  components: { MeetingRecorder },

  data () {
    return {
      checking: true,
      authorised: false,
      apiToken: null,
      loadingPoints: true,
      loadError: '',
      scenarios: [],
      scenarioId: '',
      started: false
    }
  },

  computed: {
    /** The chosen scenario's points, in the advisor's own voice. */
    points () {
      const found = this.scenarios.filter(s => s.id === this.scenarioId)[0]
      return (found && found.points) || []
    }
  },

  mounted () {
    this.checkAuth()
    if (this.authorised) { this.loadPoints() }
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
    },

    /** A failure is shown, never swallowed into an empty page (Brief P11). */
    async loadPoints () {
      this.loadingPoints = true
      this.loadError = ''
      try {
        const res = await fetch('/api/meeting/observations', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err.error && err.error.message) || res.statusText)
        }
        const data = await res.json()
        this.scenarios = data.scenarios || []
        if (this.scenarios.length) { this.scenarioId = this.scenarios[0].id }
      } catch (err) {
        this.loadError = 'Your meeting checklist could not be loaded: ' + err.message
      } finally {
        this.loadingPoints = false
      }
    }
  }
}
</script>

<style scoped>
.meeting-record-page {
  min-height: 100vh;
  background: #f5f5f5;
}
.mrp-pt {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.mrp-pt:last-child { border-bottom: 0; }
.mrp-box {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-top: 0.2rem;
  border: 1.5px solid #c8d2df;
  border-radius: 3px;
}
</style>

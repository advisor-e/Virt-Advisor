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

        //- WHICH CLIENT. The approved drawing's recording bar already names one
        //- ("End of year meeting · Whitfield & Co"); slice 2 left it out on a note saying
        //- there was no client record to draw a name from, and that note was wrong — the
        //- register has existed since 2026-07-14. Without it, follow-through would have to
        //- match on the advisor and the meeting type, checking one client's agreed actions
        //- against another client's transcript. The wording is the register's own, already
        //- approved and in use on the Virtual Advisor's client step.
        b-field.mt-3(:label="$t('clientStep.title')" label-position="on-border")
          b-select(v-model="clientId" expanded)
            option(value="") Not for a particular client
            option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
        p.is-size-7.has-text-grey(v-if="!clients.length")
          | Your firm has no clients on its register yet. You can still record — the meeting
          |  simply will not be compared with a previous one.

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
      :client-id="clientId"
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
import { isDevHost } from '~/utils/devHost'

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
      /** The firm's client register — names only, as `/api/clients` returns them. */
      clients: [],
      /** Empty means "not for a particular client", which is allowed and has a consequence. */
      clientId: '',
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
    if (this.authorised) {
      this.loadPoints()
      this.loadClients()
    }
  },

  methods: {
    checkAuth () {
      // Dev auto-login — this machine only (see utils/devHost.js), never in production.
      if (isDevHost()) {
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
    },

    /**
     * The firm's client register, so this meeting can be tied to the business it is with.
     *
     * A failure here is deliberately NOT fatal: an advisor who cannot load the register can
     * still record, and the only thing lost is the comparison with their last meeting. Blocking
     * a client meeting on a list that would not load would be the worse outcome by a distance.
     *
     * @returns {Promise<void>}
     */
    async loadClients () {
      try {
        const res = await fetch('/api/clients', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { return }
        const data = await res.json()
        this.clients = data.clients || []
      } catch (_err) {
        // Left empty on purpose — see the note above.
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

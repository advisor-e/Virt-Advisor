<template lang="pug">
.munf(v-if="recordings.length || loadError")
  b-message(v-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  .box.munf-row(v-for="r in recordings" :key="r.meetingId")
    p.has-text-weight-semibold
      span(v-if="r.meetingType") {{ r.meetingType }} ·&nbsp;
      span {{ started(r) }}

    //- 🔴 SOLID RED TEXT, IN MIKE'S OWN WORDS (item 8.5, 2026-09-28): "a warning needs to show
    //- in solid red text that they only have 7 working days to get it completed before it is
    //- deleted." Not a tinted box and not a softer colour — the words themselves are red.
    p.munf-warning {{ $t('meetingUnfinished.warning') }}

    template(v-if="state[r.meetingId] === 'finishing'")
      p.mt-2 {{ $t('meetingUnfinished.finishing') }}
      b-progress.mt-2(type="is-primary")

    .buttons.mt-3(v-else-if="state[r.meetingId] === 'done'")
      b-button(type="is-primary" tag="a" :href="`/meeting-review?meeting=${r.meetingId}`")
        | {{ $t('meetingUnfinished.reports') }}

    .buttons.are-small.mt-3(v-else)
      b-button(type="is-primary" :loading="busy === r.meetingId" @click="finish(r)")
        | {{ $t('meetingUnfinished.finish') }}
      b-button(type="is-danger" outlined :loading="busy === r.meetingId" @click="remove(r)")
        | {{ $t('meetingUnfinished.delete') }}

    b-message.mt-2(v-if="errors[r.meetingId]" type="is-danger" size="is-small") {{ errors[r.meetingId] }}
</template>

<script>
/**
 * MeetingUnfinished — the advisor's recordings that were started and never finished.
 *
 * Item 8.5. Mike's ruling, 2026-09-28: an unfinished recording is held 7 working days and then
 * its audio is deleted, and *"a warning needs to show in solid red text that they only have 7
 * working days to get it completed before it is deleted."* He declined a drawing for it —
 * *"no need to make a big deal out of it"*.
 *
 * 🔴 BEFORE THIS, A CLOSED TAB LOST THE RECORDING TO ITS ADVISOR. The recorder holds a
 * recording's id only while its tab is open, so nothing could find it again while its audio sat
 * on the server. This lists them from `GET /api/meeting/recordings/unfinished`, owner only.
 *
 * ⚠ NO NEW BUTTON WORDING. "Use what was captured" and "Stop and delete" are the recorder's own
 * approved labels for exactly these two acts; "Read my reports" is Mike's (2026-09-07).
 *
 * ⚠ SSR: every call is made from `mounted()` or a click, never at render.
 *
 * Vue 2 Options API, Pug, Buefy.
 */

/** How often a finishing recording is asked whether its transcript is ready. */
const POLL_MS = 4000

export default {
  name: 'MeetingUnfinished',

  props: {
    /** The caller's bearer token; the backend re-checks ownership on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      recordings: [],
      loadError: '',
      busy: '',
      /** meetingId → 'finishing' | 'done', once the advisor has acted. */
      state: {},
      /** meetingId → the server's own message, when an act was refused. */
      errors: {}
    }
  },

  mounted () {
    this.load()
  },

  beforeDestroy () {
    if (this._poll) { clearTimeout(this._poll) }
  },

  methods: {
    /** The list. A failure says so rather than looking like "nothing unfinished" (Brief P11). */
    async load () {
      try {
        const data = await this.call('GET', '/api/meeting/recordings/unfinished')
        this.recordings = data.recordings || []
      } catch (err) {
        this.loadError = err.message
      }
    },

    /** When the recording was started, in the reader's own date format. */
    started (r) {
      const at = new Date(r.createdAt)
      return isNaN(at.getTime()) ? '' : at.toLocaleString()
    },

    /**
     * "Use what was captured" — transcribe what the recording holds, as the recorder's own
     * interrupted-capture alarm does. A recording with no confirmed consent is refused by the
     * server, and its message is shown here unchanged.
     */
    async finish (r) {
      this.busy = r.meetingId
      this.$set(this.errors, r.meetingId, '')
      try {
        await this.call('POST', '/api/meeting/recordings/' + r.meetingId + '/finish')
        this.$set(this.state, r.meetingId, 'finishing')
        this.poll(r.meetingId)
      } catch (err) {
        this.$set(this.errors, r.meetingId, err.message)
      } finally {
        this.busy = ''
      }
    },

    /** Ask until the transcript exists. A failed poll is not a failed transcription. */
    async poll (meetingId) {
      try {
        const status = await this.call('GET', '/api/meeting/recordings/' + meetingId)
        if (status.state === 'done') { this.$set(this.state, meetingId, 'done'); return }
        if (status.state === 'failed') {
          this.$set(this.state, meetingId, '')
          this.recordings = this.recordings.filter(r => r.meetingId !== meetingId)
          return
        }
      } catch (_err) { /* keep asking */ }
      this._poll = setTimeout(() => this.poll(meetingId), POLL_MS)
    },

    /** "Stop and delete" — the audio and anything made from it, as the recorder's own button. */
    async remove (r) {
      this.busy = r.meetingId
      this.$set(this.errors, r.meetingId, '')
      try {
        await this.call('DELETE', '/api/meeting/recordings/' + r.meetingId)
        this.recordings = this.recordings.filter(x => x.meetingId !== r.meetingId)
      } catch (err) {
        this.$set(this.errors, r.meetingId, err.message)
      } finally {
        this.busy = ''
      }
    },

    /**
     * One JSON call, with both HTTP errors and network failure surfaced — the recorder's pattern.
     * @param {string} method
     * @param {string} url
     * @returns {Promise<object>}
     */
    async call (method, url) {
      const res = await fetch(url, { method, headers: { Authorization: 'Bearer ' + this.apiToken } })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.munf-row { margin-bottom: 1rem; }
/* Solid red text, as ruled — the same red the recorder uses for "recording". */
.munf-warning {
  color: #ff0000;
  font-weight: 700;
  margin-top: 0.35rem;
}
</style>

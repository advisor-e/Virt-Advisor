<template lang="pug">
.scs(v-if="sections.length || loadError || failed")
  b-message(v-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  //- A summary the AI could not write says so, and can be asked for again (Mike's wording,
  //- 2026-09-28) — a failure must never look like a concept with nothing in it.
  b-message(v-else-if="failed" type="is-warning" size="is-small")
    | {{ $t('strategyPlanner.conceptSummary.failed') }}
    b-button.ml-2(size="is-small" :loading="busy" @click="retry") {{ $t('strategyPlanner.conceptSummary.retry') }}

  template(v-else)
    .scs-head
      p.scs-label(v-if="!approvedAt") {{ $t('strategyPlanner.conceptSummary.draft') }}
      span.scs-approved(v-else) {{ $t('strategyPlanner.conceptSummary.approvedAt', { time: approvedTime }) }}

    .scs-field(v-for="(s, i) in sections" :key="s.heading")
      h5 {{ s.heading }}
      b-input(v-if="editing" v-model="draft[i]" type="textarea" rows="2")
      p.scs-text(v-else-if="s.text") {{ s.text }}
      //- A heading nobody spoke about says so rather than being filled in (Mike, 2026-09-28).
      p.scs-text.is-empty(v-else) {{ $t('strategyPlanner.conceptSummary.nothingSaid') }}

    template(v-if="editing")
      .buttons.are-small.mt-2
        b-button(type="is-primary" :loading="busy" @click="save") {{ $t('strategyPlanner.conceptSummary.save') }}
        b-button(@click="editing = false") {{ $t('strategyPlanner.conceptSummary.cancel') }}

    template(v-else-if="!approvedAt")
      b-checkbox.mt-2(v-model="clientAgrees") {{ $t('strategyPlanner.conceptSummary.clientAgrees') }}
      .buttons.are-small.mt-2
        b-button(type="is-primary" :disabled="!clientAgrees" :loading="busy" @click="approve")
          | {{ $t('strategyPlanner.conceptSummary.approve') }}
        b-button(@click="startEdit") {{ $t('strategyPlanner.conceptSummary.edit') }}

    template(v-else)
      .buttons.are-small.mt-2
        b-button(@click="startEdit") {{ $t('strategyPlanner.conceptSummary.edit') }}

    b-message.mt-2(v-if="actError" type="is-danger" size="is-small") {{ actError }}
</template>

<script>
/**
 * StrategyConceptSummary — one concept's summary, for the advisor and client to edit and approve.
 *
 * Item 8.4, slice 4 — screen 10 of `design/mockups/strategy-session-recording.html`, approved
 * for build 2026-09-28, its wording approved one label at a time. The server half is slice 2.
 *
 * 🔴 APPROVAL NEEDS THE CLIENT'S TICK. "Approve summary" is disabled until "The client has read
 * this summary and agrees with it" is ticked, and the server refuses without it too. This app
 * has no client login, so the tick is the advisor's confirmation that the client agreed.
 *
 * ⚠ AN EDIT CLEARS THE APPROVAL (the server's rule): approved words that are then changed must
 * never still read as approved. The headings are the concept's own and cannot be edited.
 *
 * Vue 2 Options API, Pug, Buefy.
 */

/** How often, and how many times, a rewritten summary is asked for. Two minutes in all. */
const RETRY_POLL_MS = 4000
const RETRY_POLLS = 30

export default {
  name: 'StrategyConceptSummary',

  props: {
    apiToken: { type: String, required: true },
    meetingId: { type: String, required: true },
    /** The segment this summary belongs to, as the server lists it. */
    segment: {
      type: Object,
      required: true,
      validator: s => s && Number.isInteger(s.n)
    }
  },

  data () {
    return {
      sections: [],
      approvedAt: null,
      loadError: '',
      actError: '',
      busy: false,
      editing: false,
      draft: [],
      clientAgrees: false,
      /** Set when "Write it again" was pressed, until the new summary arrives. */
      retrying: false
    }
  },

  computed: {
    /** The base route for this segment's summary. */
    url () {
      return '/api/meeting/recordings/' + this.meetingId + '/segments/' + this.segment.n + '/summary'
    },

    /** The server could not write this summary, and nothing newer is on its way. */
    failed () {
      return this.segment.summaryState === 'failed' && !this.retrying && !this.sections.length
    },

    /** "9:48 am", in the reader's own format. */
    approvedTime () {
      const at = new Date(this.approvedAt)
      return isNaN(at.getTime()) ? '' : at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
  },

  watch: {
    /** Read the summary once it has been written — the recorder polls the segment's state. */
    'segment.summaryState' (state) {
      if (state === 'ready') { this.load() }
    }
  },

  mounted () {
    if (this.segment.summaryState === 'ready') { this.load() }
  },

  beforeDestroy () {
    if (this._retryPoll) { clearTimeout(this._retryPoll) }
  },

  methods: {
    async load () {
      try {
        const data = await this.call('GET', this.url)
        this.sections = data.sections || []
        this.approvedAt = (data.summary && data.summary.approvedAt) || null
        this.loadError = ''
      } catch (err) {
        this.loadError = err.message
      }
    },

    /** "Write it again" — ask the server to write the summary once more, then wait for it. */
    async retry () {
      this.busy = true
      this.actError = ''
      try {
        await this.call('POST', this.url)
        this.retrying = true
        this.waitForRewrite(0)
      } catch (err) {
        this.actError = err.message
      } finally {
        this.busy = false
      }
    },

    /**
     * Ask until the rewritten summary arrives, or the server says it failed again. This card
     * asks for itself: the recorder may already have finished.
     * @param {number} tries
     */
    async waitForRewrite (tries) {
      try {
        const data = await this.call('GET', this.url)
        if (data.summary) {
          this.sections = data.sections || []
          this.approvedAt = data.summary.approvedAt || null
          this.retrying = false
          return
        }
        if (data.state === 'failed' || tries >= RETRY_POLLS) {
          this.retrying = false
          return
        }
      } catch (_err) { /* keep asking */ }
      this._retryPoll = setTimeout(() => this.waitForRewrite(tries + 1), RETRY_POLL_MS)
    },

    startEdit () {
      this.draft = this.sections.map(s => s.text || '')
      this.editing = true
    },

    async save () {
      this.busy = true
      this.actError = ''
      try {
        const data = await this.call('PUT', this.url, {
          sections: this.sections.map((s, i) => ({ heading: s.heading, text: this.draft[i] || '' }))
        })
        this.sections = data.sections
        this.approvedAt = null
        this.clientAgrees = false
        this.editing = false
        // Payload: the segment number — the edit cleared its approval.
        this.$emit('changed', this.segment.n)
      } catch (err) {
        this.actError = err.message
      } finally {
        this.busy = false
      }
    },

    async approve () {
      if (!this.clientAgrees) { return }
      this.busy = true
      this.actError = ''
      try {
        const data = await this.call('POST', this.url + '/approve', { clientAgreed: true })
        this.approvedAt = data.at
        // Payload: the segment number — now approved.
        this.$emit('changed', this.segment.n)
      } catch (err) {
        this.actError = err.message
      } finally {
        this.busy = false
      }
    },

    /**
     * One JSON call, with HTTP errors and network failure both surfaced.
     * @param {string} method
     * @param {string} url
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async call (method, url, body) {
      const options = { method, headers: { Authorization: 'Bearer ' + this.apiToken } }
      if (body) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(body)
      }
      const res = await fetch(url, options)
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
.scs { border: 1px solid #d5e1ee; border-radius: 8px; padding: 0.75rem 0.9rem; margin: 0.5rem 0 1rem; background: #fff; }
.scs-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7f99; }
.scs-approved { font-size: 0.75rem; border: 1px solid #2e7d32; color: #2e7d32; background: #edf7ee; border-radius: 99px; padding: 0.1rem 0.6rem; }
.scs-field { border: 1px solid #d5e1ee; border-radius: 6px; padding: 0.5rem 0.7rem; margin-top: 0.5rem; }
.scs-field h5 { color: #002b64; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.25rem; }
.scs-text { font-size: 0.88rem; }
.scs-text.is-empty { color: #6b7f99; font-style: italic; }
</style>

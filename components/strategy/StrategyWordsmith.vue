<template lang="pug">
.sws
  //- Screen 1 and Decision A: pressable only once this section is text; greyed, with why, before.
  .sws-bar(v-if="!open")
    b-button(size="is-small" type="is-primary" :disabled="Boolean(notReady)" @click="open = true") {{ $t('strategyPlanner.wordsmith.button') }}
    span.sws-reason(v-if="notReady") {{ notReady }}

  .sws-panel(v-else)
    .sws-head
      b {{ $t('strategyPlanner.wordsmith.button') }}
      span(v-if="result")  · {{ $t('strategyPlanner.wordsmith.forSound', { purpose: result.purpose, style: result.style }) }}
      span(v-else)  · {{ $t('strategyPlanner.wordsmith.headingNote') }}

    .sws-body
      //- Screen 2: the room's own words — what the statements are for, and how they should sound.
      template(v-if="!result && !writing")
        .sws-ask
          b-field(:label="$t('strategyPlanner.wordsmith.forQuestion')" :message="$t('strategyPlanner.wordsmith.forExample')")
            b-input(v-model="purpose" maxlength="500")
          b-field(:label="$t('strategyPlanner.wordsmith.soundQuestion')" :message="$t('strategyPlanner.wordsmith.soundExample')")
            b-input(v-model="style" maxlength="500")
        .buttons.are-small
          b-button(type="is-primary" :disabled="!purpose.trim() || !style.trim()" @click="start") {{ $t('strategyPlanner.wordsmith.buttons.write') }}
          b-button(@click="close") {{ $t('strategyPlanner.wordsmith.buttons.close') }}

      //- Screen 5: working, and failing plainly.
      p.sws-working(v-if="writing")
        b-icon(icon="loading" custom-class="mdi-spin" size="is-small")
        |  {{ $t('strategyPlanner.wordsmith.working') }}
      b-message(v-if="failed" type="is-danger" size="is-small")
        b {{ $t('strategyPlanner.wordsmith.failed') }}
        |  {{ $t('strategyPlanner.wordsmith.failedNote') }}
        b-button.ml-2(size="is-small" @click="retry") {{ $t('strategyPlanner.wordsmith.buttons.tryAgain') }}
      b-message(v-if="error" type="is-warning" size="is-small") {{ error }}

      //- Screen 3 and Decision B: the settings Wordsmith read, which the advisor may change.
      template(v-if="result")
        .sws-settings
          b {{ $t('strategyPlanner.wordsmith.settings.writtenAs') }}
          b-select(v-for="key in SETTING_KEYS" :key="key" v-model="settings[key]" size="is-small")
            option(v-for="v in CHOICES[key]" :key="v" :value="v") {{ $t('strategyPlanner.wordsmith.settings.' + key + '.' + v) }}
          span.sws-muted(v-if="result.settings.tone.length")  · {{ $t('strategyPlanner.wordsmith.settings.feels', { tone: result.settings.tone.join(', ') }) }}
          span.sws-muted(v-if="result.settings.audience")  · {{ $t('strategyPlanner.wordsmith.settings.for', { audience: result.settings.audience }) }}
          b-button(size="is-small" outlined type="is-primary" :disabled="writing || !settingsChanged" @click="againWithSettings") {{ $t('strategyPlanner.wordsmith.buttons.againWithThese') }}

        strategy-wordsmith-draft(
          v-for="s in orderedStatements"
          :key="s.name"
          :statement="s"
          :box-value="boxValueOf(s.name)"
          :busy="writing || using === s.name"
          @write-again="writeAgain"
          @use="use"
        )
        .buttons.are-small
          b-button(@click="close") {{ $t('strategyPlanner.wordsmith.buttons.close') }}
</template>

<script>
import StrategyWordsmithDraft from '~/components/strategy/StrategyWordsmithDraft.vue'

/** The four settings the advisor may change, and their fixed choices (the engine's SETTINGS). */
const SETTING_KEYS = ['sentenceLength', 'formality', 'jargon', 'voice']
const CHOICES = {
  sentenceLength: ['short', 'medium', 'long'],
  formality: ['plain', 'professional', 'formal'],
  jargon: ['avoid', 'allow'],
  voice: ['we', 'the-business']
}
const ORDER = ['Vision', 'Purpose', 'Values', 'Mission', 'Strategy']

/** How often, and how many times, a run is asked after. Four minutes in all. */
const POLL_MS = 3000
const MAX_POLLS = 80

/**
 * StrategyWordsmith — Wordsmith on the Alignment Statements card in Run session. Item 15.14,
 * screens 1–5 of `design/mockups/wordsmith-screens.html`, approved by Mike 2026-09-29 with its
 * wording, decisions A–E and 16 build details. The server is `server/routes/wordsmith.js`.
 *
 * 🔴 WHAT A REWRITE KEEPS IS THE SERVER'S. "Write again with these" sends four fixed choices and
 * the run to build on; the client's words, the tone, the reader and the typed purpose and style
 * stay on the server, so this screen can never supply "what the client said".
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, recorded: the button sits in a bar directly above the card, not
 * in its header (build detail 14 — the header belongs to every concept card); each draft's header
 * names its statement without the domain line drawn beside it, which the approved wording table
 * does not carry.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
export default {
  name: 'StrategyWordsmith',

  components: { StrategyWordsmithDraft },

  props: {
    apiToken: { type: String, required: true },
    /** The session's recording; empty until one exists. */
    meetingId: { type: String, default: '' },
    sessionId: { type: [Number, String], required: true },
    /** This card's recorded sections, as the recorder lists them: `[{n, state, ...}]`. */
    segments: { type: Array, default: () => [], validator: a => a.every(s => s && Number.isInteger(s.n)) },
    /** The Alignment Statements capture form, to find each statement's box. */
    capture: { type: Object, required: true },
    /** This card's saved box values, by field key. */
    entries: { type: Object, default: () => ({}) }
  },

  data () {
    return {
      SETTING_KEYS,
      CHOICES,
      open: false,
      purpose: '',
      style: '',
      /** The whole-set run the drafts were written in, and each statement's own run after a rewrite. */
      runId: '',
      statementRuns: {},
      /** `{purpose, style, settings, statements: {name: statement}}` */
      result: null,
      settings: { sentenceLength: 'medium', formality: 'plain', jargon: 'avoid', voice: 'we' },
      writing: false,
      failed: false,
      error: '',
      using: '',
      /** What to do on "Try again": the last request that failed. */
      lastRequest: null
    }
  },

  computed: {
    /** Why the button cannot be pressed yet, in the approved words — or '' when it can. */
    notReady () {
      if (!this.meetingId || !this.segments.length) { return this.$t('strategyPlanner.wordsmith.notReady') }
      if (this.segments.some(s => ['recording', 'closed', 'transcribing'].includes(s.state))) {
        return this.$t('strategyPlanner.wordsmith.stillTranscribing')
      }
      if (!this.segments.some(s => s.state === 'done')) { return this.$t('strategyPlanner.wordsmith.notReady') }
      return ''
    },

    orderedStatements () {
      if (!this.result) { return [] }
      return ORDER.map(n => this.result.statements[n]).filter(Boolean)
    },

    settingsChanged () {
      return Boolean(this.result) && SETTING_KEYS.some(k => this.settings[k] !== this.result.settings[k])
    },

    base () {
      return '/api/meeting/recordings/' + this.meetingId + '/wordsmith'
    }
  },

  beforeDestroy () {
    this.stopPolling()
  },

  methods: {
    /** @param {string} name @returns {string} what that statement's box holds now */
    boxValueOf (name) {
      const field = (this.capture.fields || []).find(f => f.columnLabel === name && /^t0r\d+c\d+$/.test(f.key))
      return field ? String(this.entries[field.key] || '') : ''
    },

    async start () {
      await this.request({ kind: 'all', path: this.base, body: { purpose: this.purpose, style: this.style } })
    },

    /** Decision B: the four choices, and the run they build on — nothing else. */
    async againWithSettings () {
      const settings = {}
      SETTING_KEYS.forEach((k) => { settings[k] = this.settings[k] })
      await this.request({ kind: 'all', path: this.base, body: { baseRunId: this.runId, settings } })
    },

    /** @param {{statement: string, answers: Array}} p */
    async writeAgain (p) {
      await this.request({ kind: p.statement, path: this.base + '/' + this.runId + '/statements', body: p })
    },

    retry () {
      if (this.lastRequest) { this.request(this.lastRequest) }
    },

    /**
     * Start a run and follow it to the end.
     * @param {{kind: string, path: string, body: object}} req - `kind` is 'all' or one statement's name
     */
    async request (req) {
      this.lastRequest = req
      this.writing = true
      this.failed = false
      this.error = ''
      try {
        const started = await this.call('POST', req.path, req.body)
        this.poll(req.kind, started.runId, 0)
      } catch (err) {
        this.writing = false
        this.showError(err)
      }
    },

    async poll (kind, runId, tries) {
      try {
        const run = await this.call('GET', this.base + '/' + runId)
        if (run.state === 'done') { this.take(kind, runId, run.result); return }
        if (run.state === 'failed' || tries >= MAX_POLLS) { this.writing = false; this.failed = true; return }
      } catch (_err) { /* keep asking */ }
      this._poll = setTimeout(() => this.poll(kind, runId, tries + 1), POLL_MS)
    },

    stopPolling () {
      if (this._poll) { clearTimeout(this._poll) }
    },

    /** A finished run's drafts: the whole set, or one statement's rewrite. */
    take (kind, runId, result) {
      this.writing = false
      const byName = {}
      result.statements.forEach((s) => { byName[s.name] = s })
      if (kind === 'all') {
        this.runId = runId
        this.statementRuns = {}
        result.statements.forEach((s) => { this.statementRuns[s.name] = runId })
        this.result = { purpose: result.purpose, style: result.style, settings: result.settings, statements: byName }
        SETTING_KEYS.forEach((k) => { this.settings[k] = result.settings[k] })
        return
      }
      if (byName[kind] && this.result) {
        this.$set(this.result.statements, kind, byName[kind])
        this.$set(this.statementRuns, kind, runId)
      }
    },

    /** Decision D: the agreed words go in their box, with the record written first on the server. */
    async use (p) {
      this.using = p.statement
      this.error = ''
      try {
        const saved = await this.call('POST', this.base + '/' + this.statementRuns[p.statement] + '/use', {
          sessionId: this.sessionId, statement: p.statement, text: p.text, clientAgreed: true
        })
        // Payload: { fieldKey, value, markerKey, marker } — the box and its stamp, as the server saved them.
        this.$emit('wording-used', saved)
      } catch (err) {
        this.showError(err)
      } finally {
        this.using = ''
      }
    },

    close () {
      this.stopPolling()
      this.open = false
    },

    /** A refusal in the approved words where there are some; the server's message otherwise. */
    showError (err) {
      const words = {
        NOT_TEXT_YET: 'notReady',
        STILL_TRANSCRIBING: 'stillTranscribing',
        NOTHING_SAID: 'nothingSaidSection'
      }[err.code]
      if (words) { this.error = this.$t('strategyPlanner.wordsmith.' + words); return }
      if (['CONTENT_UNAVAILABLE', 'WORDSMITH_FAILED', 'WORDSMITH_SAVE_FAILED'].includes(err.code) || !err.code) { this.failed = true; return }
      this.error = err.message
    },

    /**
     * One JSON call, with HTTP errors and network failure both surfaced, and the server's code kept.
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
        const data = await res.json().catch(() => ({}))
        const err = new Error((data.error && data.error.message) || res.statusText)
        err.code = data.error && data.error.code
        throw err
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.sws { margin: 0 0 0.5rem; }
.sws-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.sws-reason { font-size: 0.8rem; color: #6b7f99; }
.sws-panel { border: 2px solid #0070c0; border-radius: 10px; overflow: hidden; margin-bottom: 0.75rem; }
.sws-head { background: #0070c0; color: #fff; padding: 0.45rem 0.8rem; font-size: 0.9rem; }
.sws-head span { color: #e1efff; }
.sws-body { padding: 0.8rem; display: grid; gap: 0.75rem; }
.sws-ask { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr)); }
.sws-settings { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; font-size: 0.82rem; color: #002b64; }
.sws-muted { color: #6b7f99; }
.sws-working { color: #002b64; font-size: 0.88rem; }
</style>

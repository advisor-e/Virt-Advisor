<template lang="pug">
.ssr
  b-message(v-if="fatal" type="is-danger" size="is-small") {{ fatal }}

  //- ── Consent, once for the whole session (Decision C) ─────────────────────
  //- Meeting Review's own two-step panel and its approved words, not a copy.
  .box(v-if="stage === 'consent1' || stage === 'consent2'")
    meeting-consent-panel(
      :step="stage === 'consent1' ? 1 : 2"
      :retention-phrase="retentionPhrase"
      :elapsed-seconds="segmentSeconds"
      :busy="busy"
      @start="startFirst"
      @cancel="cancel"
      @agree="agree"
      @refuse="deleteAll"
    )

  //- ── The strip, while recording (screen 3) ───────────────────────────────
  //- During a break nothing records, so the red "Recording" line goes; the two ways out stay.
  .ssr-strip(v-if="stage === 'recording' || stage === 'break'" :class="{ 'is-break': stage === 'break', 'is-paused': paused }")
    template(v-if="stage === 'recording'")
      span.ssr-dot
      //- Screen 11: amber while paused, so nobody believes the room is being recorded.
      b.ssr-rec(v-if="paused") {{ $t('strategyPlanner.recording.paused') }}
      b.ssr-rec(v-else) {{ $t('strategyPlanner.recording.strip') }}
      span {{ $t('strategyPlanner.recording.section', { n: liveN, label: liveLabel }) }}
      span.ssr-clock {{ clock(segmentSeconds) }}
    span.ssr-grow
    //- Mike's wording, 2026-09-28: close the live section so nothing records over a break.
    b-button(v-if="stage === 'recording'" size="is-small" outlined :loading="busy" @click="takeBreak") {{ $t('strategyPlanner.recording.takeBreak') }}
    b-button(size="is-small" outlined type="is-primary" :loading="busy" @click="endRecording") {{ $t('strategyPlanner.recording.end') }}
    b-button(size="is-small" outlined type="is-danger" :loading="busy" @click="deleteAll") {{ $t('strategyPlanner.recording.deleteAll') }}
  p.ssr-note(v-if="stage === 'recording' && paused") {{ $t('strategyPlanner.recording.pausedNote') }}

  //- ── The alarm: Meeting Review's own, word for word (Mike, 2026-09-28) ──────────
  //- An operating system can suspend a backgrounded tab, and there is no second take with a
  //- client. A capture that stops without being asked says so in red rather than failing quietly.
  b-message(v-if="interrupted" type="is-danger")
    p.has-text-weight-semibold {{ $t('strategyPlanner.recording.interruptedLead', { time: clock(sessionSeconds) }) }}
    p.is-size-7.mt-1
      | {{ $t('strategyPlanner.recording.interruptedRest', { minutes: $tc('strategyPlanner.recording.minutesSaved', savedMinutes, { count: savedMinutes }) }) }}
      |  #[b {{ $t('strategyPlanner.recording.interruptedNothing', { time: clock(sessionSeconds) }) }}]
    .buttons.are-small.mt-3
      b-button(type="is-primary" :loading="busy" @click="resumeRecording") {{ $t('strategyPlanner.recording.resume') }}

  //- ── Every segment at a glance ───────────────────────────────────────────
  .ssr-secs(v-if="segments.length && stage !== 'idle'")
    span.ssr-sec(v-for="s in segments" :key="s.n" :class="chipClass(s)") {{ chipText(s) }}

  //- ── A segment failed: said within minutes, while the client is in the room (screen 5)
  b-message(v-for="s in failedSegments" :key="'f' + s.n" type="is-danger" size="is-small")
    b {{ $t('strategyPlanner.recording.failedLead', { n: s.n, label: s.label }) }}
    |  {{ $t('strategyPlanner.recording.failedRest') }}

  //- ── After "End recording" ───────────────────────────────────────────────
  .box(v-if="stage === 'finishing'")
    b-progress(type="is-primary")

  b-message(v-if="stage === 'done'" :type="failedSegments.length ? 'is-warning' : 'is-success'")
    //- The approved banner claims every section was turned into text, so it is only shown
    //- when that is true; a failed section has already said so in its own banner above.
    template(v-if="!failedSegments.length")
      //- "1 section", "1 minute" in the singular (Mike, 2026-09-28).
      b {{ $t('strategyPlanner.recording.finishedLead', { sections: $tc('strategyPlanner.recording.sectionsCount', segments.length, { count: segments.length }), minutes: $tc('strategyPlanner.recording.minutesCount', totalMinutes, { count: totalMinutes }) }) }}
      |  {{ $t('strategyPlanner.recording.finishedWaiting', { count: waitingForApproval }) }}
      //- Screen 4: what the advisor can still sort after the client has left.
      template(v-if="wordsWaiting")
        |  {{ $t('strategyPlanner.recording.finishedWords', { count: wordsWaiting }) }}
    b-button.ml-2(size="is-small" type="is-primary" tag="a" :href="'/meeting-review?meeting=' + meetingId")
      | {{ $t('strategyPlanner.recording.reports') }}
</template>

<script>
/**
 * StrategySessionRecorder — records a strategy session one concept at a time.
 *
 * Item 8.4, slice 4. Screens 1–3, 5 and 6 of `design/mockups/strategy-session-recording.html`,
 * APPROVED FOR BUILD by Mike 2026-09-28 (976533c2), every label on it approved one at a time.
 * The server half is slices 1–2: `server/routes/meetingSegments.js`.
 *
 * 🔴 MEETING REVIEW'S RULES, UNCHANGED, AND IN THE SAME ORDER:
 *   - RECORD → SPEAK → CONFIRM. The first press opens the microphone, starts the recording and
 *     only then asks for the tick, so the consent is captured inside the audio (P1). One consent
 *     covers the session (Decision C).
 *   - Nothing records until the advisor presses a card's button (Decision B); pressing the next
 *     card's button closes the live segment and opens the next.
 *   - "Stop and delete everything" is there the whole time and takes every segment.
 *
 * 🔴 THE VOICE CLIP IS THE FIRST 8 SECONDS OF THE CONSENT LINE, cut here in the browser by a
 * second recorder on the same microphone — the locked Node 14.15 runs no audio tools, so the
 * server cannot cut it. It is the ADVISOR's voice: the consent line is read by the advisor.
 *
 * ⚠ A SEGMENT ROLLS OVER TO "part 2" by itself at 25 minutes or when the server says it has
 * passed 20 MB (Decision E), so no file reaches OpenAI's 25 MB limit.
 *
 * ⚠ SSR: every browser API — `navigator.mediaDevices`, `MediaRecorder`, `navigator.wakeLock` —
 * is touched only from a click or `mounted()`.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
import MeetingConsentPanel from '~/components/MeetingConsentPanel.vue'

/** How often captured audio leaves the browser — Meeting Review's own figure. */
const CHUNK_MS = 15000

/** Decision E: a segment closes itself here, and carries on as "part 2". */
const ROLL_SECONDS = 25 * 60

/** The advisor's voice clip: 2–10 seconds is OpenAI's documented range. */
const CLIP_MS = 8000

/** How often segment states are asked after they close. */
const POLL_MS = 4000

// ── Screen 11: pause after 3 minutes of silence (Mike, 2026-09-28) ─────────────────
// No AI: the browser measures loudness itself and sends nothing to do it.

/** Mike's figure: nothing heard for this long, and the recording pauses. */
const SILENCE_SECONDS = 180

/** How often the microphone's loudness is read. */
const LEVEL_MS = 250

/** Decision K: silence is quieter than a quarter of the advisor's own speaking level. */
const SILENCE_SHARE = 0.25

/** A floor for a consent line that measured nothing — a muted microphone, say. */
const FALLBACK_SILENCE = 0.01

export default {
  name: 'StrategySessionRecorder',

  components: { MeetingConsentPanel },

  props: {
    /** The caller's bearer token; the backend re-checks ownership on every call. */
    apiToken: { type: String, required: true },
    /** The client this session is with, from the firm's register; empty is allowed. */
    clientId: { type: String, default: '' },
    /** The planning session whose box timeline places the words (screen 4); checked by the server. */
    strategySessionId: { type: Number, default: null },
    /** Screen 4: passages still waiting under boxes across this recording, from the page. */
    wordsWaiting: { type: Number, default: 0 }
  },

  data () {
    return {
      /** idle | consent1 | consent2 | recording | break | finishing | done */
      stage: 'idle',
      busy: false,
      fatal: '',
      retentionPhrase: '',
      meetingId: '',
      /** The server's own view of every segment (`publicSegments`). */
      segments: [],
      /** The live segment's number, and the concept it records. */
      liveN: 0,
      live: null,
      /** The card pressed before consent, recorded as segment 1. */
      pendingCard: null,
      segmentSeconds: 0,
      sessionSeconds: 0,
      /** The recording stopped without being asked — a locked screen, a suspended tab. */
      interrupted: false,
      /** Screen 11: paused because nothing has been heard for 3 minutes. */
      paused: false
    }
  },

  computed: {
    /** @returns {string} the live segment's label, "(part 2)" included */
    liveLabel () {
      const s = this.segments.find(x => x.n === this.liveN)
      return s ? s.label : ''
    },

    failedSegments () {
      return this.segments.filter(s => s.state === 'failed')
    },

    /** Summaries not yet approved by the client — Decision J's "waiting". */
    waitingForApproval () {
      return this.segments.filter(s => s.state === 'done' && !s.summaryApproved).length
    },

    totalMinutes () {
      return Math.round(this.sessionSeconds / 60)
    },

    /** Whole minutes captured before an interruption, for the alarm. */
    savedMinutes () {
      return Math.floor(this.sessionSeconds / 60)
    }
  },

  watch: {
    /** The page's live card follows the pause (screen 11). */
    paused () { this.emitState() }
  },

  mounted () {
    this.loadConsentContext()
  },

  beforeDestroy () {
    // Leaving the page must not leave a microphone open or a wake-lock held. It does not
    // delete the session: an advisor who navigates away by accident has not asked for that.
    this.teardown()
  },

  methods: {
    /** The firm's retention period, which the consent line speaks aloud. A failure blocks. */
    async loadConsentContext () {
      try {
        const data = await this.call('GET', '/api/meeting/consent')
        this.retentionPhrase = data.retentionPhrase || ''
      } catch (err) {
        this.fatal = err.message
      }
    },

    /**
     * "Record this section" on a concept card. The first press asks for consent; later presses
     * close the live segment and open this card's.
     * @param {{key: string, conceptId: string, label: string}} card
     */
    recordCard (card) {
      if (this.busy) { return }
      if (this.stage === 'idle') {
        this.pendingCard = card
        this.stage = 'consent1'
        return
      }
      if (this.stage === 'recording' && (!this.live || this.live.key !== card.key)) {
        this.switchTo(card)
      }
      if (this.stage === 'break') { this.resumeWith(card) }
    },

    /**
     * "Take a break": close the live section, which is transcribed and its audio destroyed as
     * usual, and record nothing until the next card's button (Mike, 2026-09-28).
     */
    async takeBreak () {
      this.busy = true
      try {
        await this.stopCapture()
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/segments/close')
        this.stopClock()
        this.live = null
        this.stage = 'break'
        this.emitState()
        this.poll()
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** The first card pressed after a break starts a fresh section, under the same consent. */
    async resumeWith (card) {
      this.busy = true
      try {
        await this.openSegment(card, 1)
        this.beginCapture()
        this.startClock()
        this.stage = 'recording'
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** Consent step one's "Start recording": microphone, session, segment 1, then step two. */
    async startFirst () {
      this.busy = true
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        this.busy = false
        this.fatal = err.message
        return
      }
      try {
        const started = await this.call('POST', '/api/meeting/recordings', {
          scenarioId: 'strategy_session',
          clientId: this.clientId || null,
          segmented: true,
          strategySessionId: this.strategySessionId
        })
        this.meetingId = started.meetingId
        await this.openSegment(this.pendingCard, 1)
        this.beginCapture()
        this.captureVoiceClip()
        // Screen 11: the meter starts now, so the consent line sets the silence level (K).
        this._calibration = []
        this.startLevelMeter()
        await this.holdWakeLock()
        this.startClock()
        this.stage = 'consent2'
      } catch (err) {
        this.fatal = err.message
        this.teardown()
      } finally {
        this.busy = false
      }
    },

    /** Consent step two's "Yes — continue". */
    async agree () {
      this.busy = true
      try {
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/consent')
        this.setSilenceLevel()
        this._lastSoundAt = Date.now()
        this.stage = 'recording'
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    cancel () {
      this.pendingCard = null
      this.stage = 'idle'
    },

    /**
     * Open a segment on the server and make it the live one.
     * @param {{key: string, conceptId: string, label: string}} card
     * @param {number} part - 1, or 2+ when a long segment rolled over
     */
    async openSegment (card, part) {
      const label = part > 1
        ? this.$t('strategyPlanner.recording.part', { label: card.label, n: part })
        : card.label
      const opened = await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/segments', {
        conceptId: card.conceptId || null,
        label
      })
      this.liveN = opened.segment
      this.segments = opened.segments || []
      // A concept's clock runs across its parts, so the countdown is not reset by a roll-over.
      const startedAt = (part > 1 && this.live) ? this.live.startedAt : Date.now()
      this.live = { key: card.key, conceptId: card.conceptId, label: card.label, part, startedAt }
      this._segmentStartedAt = Date.now()
      this._segmentPausedMs = 0
      this.paused = false
      this._lastSoundAt = Date.now()
      this.segmentSeconds = 0
      this.emitState()
    },

    // ── Screen 11: pause after 3 minutes of silence ────────────────────────────

    /** Read the microphone's loudness every quarter second, on this machine only. */
    startLevelMeter () {
      const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
      if (!Ctx || !this._stream) { return }
      try {
        this._audio = new Ctx()
        const analyser = this._audio.createAnalyser()
        analyser.fftSize = 1024
        this._audio.createMediaStreamSource(this._stream).connect(analyser)
        const samples = new Float32Array(analyser.fftSize)
        this._meter = setInterval(() => {
          analyser.getFloatTimeDomainData(samples)
          let sum = 0
          for (let i = 0; i < samples.length; i += 1) { sum += samples[i] * samples[i] }
          this.onLevel(Math.sqrt(sum / samples.length), Date.now())
        }, LEVEL_MS)
      } catch (e) {
        // No meter means no auto-pause; recording itself is unaffected.
      }
    },

    /**
     * One loudness reading. During the consent line it calibrates; while recording it pauses
     * after 3 minutes of silence and resumes on the first sound.
     * @param {number} level - root-mean-square of the samples, 0 to 1
     * @param {number} now - ms
     */
    onLevel (level, now) {
      if (this.stage === 'consent2') {
        this._calibration = (this._calibration || []).concat([level])
        return
      }
      if (this.stage !== 'recording') { return }
      const heard = level >= (this._silenceLevel || FALLBACK_SILENCE)
      if (heard) {
        this._lastSoundAt = now
        if (this.paused) { this.resumeFromPause(now) }
      } else if (!this.paused && now - (this._lastSoundAt || now) >= SILENCE_SECONDS * 1000) {
        this.pauseForSilence(now)
      }
    },

    /**
     * Decision K: a quarter of the advisor's own speaking level, taken from the consent line —
     * the level they reach nine readings in ten while speaking, so their pauses do not drag it down.
     */
    setSilenceLevel () {
      const sorted = (this._calibration || []).slice().sort((a, b) => a - b)
      const speaking = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0
      this._silenceLevel = Math.max(FALLBACK_SILENCE, speaking * SILENCE_SHARE)
    },

    /** Pause the live recorder, noting where the pause falls in the recorded audio (L). */
    pauseForSilence (now) {
      if (!this._recorder || this._recorder.state !== 'recording') { return }
      try { this._recorder.pause() } catch (e) { return }
      this.paused = true
      this._pauseStartedAt = now
      this._pauseAtRecorded = this.recordedSeconds(now)
    },

    /** Someone spoke: carry on in the same section, and report the pause so its minutes return (L). */
    resumeFromPause (now) {
      if (!this.paused) { return }
      try { if (this._recorder && this._recorder.state === 'paused') { this._recorder.resume() } } catch (e) { /* stopped */ }
      const duration = (now - this._pauseStartedAt) / 1000
      this._segmentPausedMs = (this._segmentPausedMs || 0) + (now - this._pauseStartedAt)
      this.paused = false
      const n = this.liveN
      ;(this._uploads = this._uploads || []).push(
        this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/segments/' + n + '/pauses', {
          at: this._pauseAtRecorded,
          duration
        }).catch(() => { /* a lost pause shifts later times; the words themselves are safe */ })
      )
    },

    /** Seconds of audio this segment holds: wall time since it opened, less its pauses. */
    recordedSeconds (now) {
      const pausedNow = this.paused ? now - this._pauseStartedAt : 0
      return Math.max(0, (now - (this._segmentStartedAt || now) - (this._segmentPausedMs || 0) - pausedNow) / 1000)
    },

    stopLevelMeter () {
      if (this._meter) { clearInterval(this._meter); this._meter = null }
      if (this._audio) {
        try { this._audio.close() } catch (e) { /* closed */ }
        this._audio = null
      }
    },

    /** Start a MediaRecorder for the live segment. A fresh one per segment: its own file. */
    beginCapture () {
      const n = this.liveN
      let seq = 0
      this._uploads = []
      const recorder = new MediaRecorder(this._stream)
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) {
          seq += 1
          this._uploads.push(this.uploadChunk(n, seq, event.data))
        }
      }
      // A stop nobody asked for — `stopCapture` replaces this handler before any stop it makes.
      recorder.onstop = () => {
        if (this.stage === 'recording') {
          this.interrupted = true
          this.stopClock()
        }
      }
      recorder.start(CHUNK_MS)
      this._recorder = recorder
    },

    /**
     * "Resume recording" after an interruption: the same concept carries on as its next part,
     * under the same consent. The server closes the stopped part, which is transcribed as usual.
     */
    async resumeRecording () {
      this.busy = true
      try {
        if (!this._stream || this._stream.active === false) {
          this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        }
        await this.openSegment(this.live, this.live.part + 1)
        this.beginCapture()
        await this.holdWakeLock()
        this.startClock()
        this.interrupted = false
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** Stop the live recorder and wait for its last chunk to reach the server. */
    stopCapture () {
      const recorder = this._recorder
      this._recorder = null
      // Every asked-for stop — a card, a roll-over, a break, the end — answers the alarm too.
      this.interrupted = false
      // A pause that ends with the section has no later words to move, so it is not reported.
      this.paused = false
      if (!recorder || recorder.state === 'inactive') { return Promise.all(this._uploads || []) }
      return new Promise((resolve) => {
        recorder.onstop = () => { Promise.all(this._uploads || []).then(resolve, resolve) }
        try { recorder.stop() } catch (e) { resolve() }
      })
    },

    /**
     * One captured piece of segment `n`. The server says when the segment has passed 20 MB, or
     * refuses a chunk that would take it past its cap; either way the segment rolls over.
     */
    async uploadChunk (n, seq, blob) {
      const form = new FormData()
      form.append('seq', String(seq))
      form.append('chunk', blob, 'chunk')
      try {
        const res = await fetch('/api/meeting/recordings/' + this.meetingId + '/segments/' + n + '/chunk', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this.apiToken },
          body: form
        })
        const body = await res.json().catch(() => ({}))
        if (res.status === 409 || body.rollOver) { this.rollOver() }
      } catch (err) {
        // A lost chunk costs seconds, not the segment; the segment's own state reports the rest.
      }
    },

    /** Close the live segment and open this card's, with no gap and no second consent. */
    async switchTo (card) {
      this.busy = true
      try {
        await this.stopCapture()
        await this.openSegment(card, 1)
        this.beginCapture()
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** Decision E: carry the same concept on as its next part. */
    async rollOver () {
      if (this._rolling || this.stage !== 'recording' || !this.live) { return }
      this._rolling = true
      try {
        await this.stopCapture()
        await this.openSegment(this.live, this.live.part + 1)
        this.beginCapture()
      } catch (err) {
        this.fatal = err.message
      } finally {
        this._rolling = false
      }
    },

    /** The advisor's first 8 seconds — the opening of the consent line — as the voice clip. */
    captureVoiceClip () {
      const parts = []
      const clip = new MediaRecorder(this._stream)
      clip.ondataavailable = (event) => { if (event.data && event.data.size) { parts.push(event.data) } }
      clip.onstop = async () => {
        if (!parts.length || !this.meetingId) { return }
        const blob = new Blob(parts, { type: parts[0].type || 'audio/webm' })
        const form = new FormData()
        form.append('clip', blob, 'clip')
        try {
          await fetch('/api/meeting/recordings/' + this.meetingId + '/voice-reference', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + this.apiToken },
            body: form
          })
        } catch (err) {
          // Without the clip, later segments are recorded as not confident — the server's rule.
        }
      }
      clip.start()
      this._clipTimer = setTimeout(() => { if (clip.state !== 'inactive') { clip.stop() } }, CLIP_MS)
    },

    /** "End recording": close the live segment and finish the session. */
    async endRecording () {
      this.busy = true
      try {
        await this.stopCapture()
        this.stopClock()
        this.releaseWakeLock()
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/finish')
        this.stage = 'finishing'
        this.live = null
        this.emitState()
        this.poll()
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** "Stop and delete everything" — every segment, its text and its summary. */
    async deleteAll () {
      this.busy = true
      this.teardown()
      try {
        if (this.meetingId) { await this.call('DELETE', '/api/meeting/recordings/' + this.meetingId) }
        this.meetingId = ''
        this.segments = []
        this.live = null
        this.stage = 'idle'
        this.emitState()
      } catch (err) {
        this.fatal = err.message
      } finally {
        this.busy = false
      }
    },

    /** Keep the segments' states current while anything is still being written. */
    async poll () {
      if (!this.meetingId) { return }
      try {
        const status = await this.call('GET', '/api/meeting/recordings/' + this.meetingId)
        this.segments = status.segments || this.segments
        this.emitState()
        if (this.stage === 'finishing' && (status.state === 'done' || status.state === 'failed')) {
          this.stage = 'done'
        }
      } catch (err) { /* a failed poll is not a failed recording; keep asking */ }
      const busy = this.stage === 'finishing' ||
        this.segments.some(s => ['closed', 'transcribing'].includes(s.state) || s.summaryState === 'writing' ||
          s.wordsState === 'placing')
      // While recording, the clock asks every few seconds; afterwards this keeps asking until
      // every segment and summary has settled.
      if (this.meetingId && busy && this.stage !== 'recording') {
        if (this._poll) { clearTimeout(this._poll) }
        this._poll = setTimeout(this.poll, POLL_MS)
      }
    },

    /** Tell the page what is live and what each segment is doing. */
    emitState () {
      // Payload: { meetingId, segments (server view), live: {key, conceptId, label, startedAt}|null,
      //            paused: boolean — screen 11, so the live card stops saying "recording" }
      this.$emit('state-changed', { meetingId: this.meetingId, segments: this.segments, live: this.live, paused: this.paused })
    },

    chipClass (s) {
      // A paused section is amber, as screen 11 draws it — never the red that means recording.
      const pausedNow = this.paused && s.n === this.liveN
      return {
        'is-now': s.state === 'recording' && !pausedNow,
        'is-work': pausedNow || s.state === 'closed' || s.state === 'transcribing',
        'is-done': s.state === 'done',
        'is-fail': s.state === 'failed'
      }
    },

    /** "3 · Porter's 5 Forces · text ready · audio deleted", as the drawing prints it. */
    chipText (s) {
      const t = key => this.$t('strategyPlanner.recording.' + key)
      const parts = [s.n, s.label]
      if (s.state === 'recording') {
        parts.push(t(this.paused && s.n === this.liveN ? 'statePaused' : 'stateRecording') + ' ' + this.clock(this.segmentSeconds))
      }
      if (s.state === 'closed' || s.state === 'transcribing') { parts.push(t('stateTranscribing')) }
      if (s.state === 'done') { parts.push(t('stateReady')) }
      if (s.state === 'failed') { parts.push(t('stateFailed')) }
      if (s.audioDeleted) { parts.push(t('stateAudioDeleted')) }
      return parts.join(' · ')
    },

    /** mm:ss */
    clock (seconds) {
      const total = Math.max(0, Math.floor(seconds))
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
    },

    startClock () {
      this.stopClock()
      this._clock = setInterval(() => {
        // While paused the clock stops: those minutes are not being recorded (screen 11).
        if (!this.paused) { this.sessionSeconds += 1 }
        this.segmentSeconds = Math.floor(this.recordedSeconds(Date.now()))
        if (this.segmentSeconds >= ROLL_SECONDS) { this.rollOver() }
        if (this.sessionSeconds % (POLL_MS / 1000) === 0) { this.poll() }
      }, 1000)
    },

    stopClock () {
      if (this._clock) { clearInterval(this._clock); this._clock = null }
    },

    async holdWakeLock () {
      try {
        if (navigator.wakeLock && !this._wakeLock) { this._wakeLock = await navigator.wakeLock.request('screen') }
      } catch (e) { /* a refused wake-lock does not stop a meeting */ }
    },

    releaseWakeLock () {
      if (this._wakeLock) {
        try { this._wakeLock.release() } catch (e) { /* already released */ }
        this._wakeLock = null
      }
    },

    /** Stop capture and release every device this component opened. */
    teardown () {
      this.stopClock()
      this.stopLevelMeter()
      this.paused = false
      if (this._poll) { clearTimeout(this._poll); this._poll = null }
      if (this._clipTimer) { clearTimeout(this._clipTimer); this._clipTimer = null }
      if (this._recorder && this._recorder.state !== 'inactive') {
        // An asked-for stop: the interruption alarm must not fire for it.
        this._recorder.onstop = null
        try { this._recorder.stop() } catch (e) { /* already stopped */ }
      }
      this._recorder = null
      this.interrupted = false
      if (this._stream) {
        this._stream.getTracks().forEach((t) => { try { t.stop() } catch (e) { /* gone */ } })
        this._stream = null
      }
      this.releaseWakeLock()
    },

    /**
     * One JSON call, with HTTP errors and network failure both surfaced — the recorder's pattern.
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
.ssr-strip {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.85rem;
  border-radius: 6px;
  background: #fff2f2;
  margin-bottom: 0.5rem;
}
/* Danger red, as the Meeting Review recorder uses it, so "recording" reads at a glance. */
.ssr-strip.is-break { background: #f1f6fb; }
/* Screen 11: amber while paused — not the red that says the room is being recorded. */
.ssr-strip.is-paused { background: #f1f6fb; }
.ssr-strip.is-paused .ssr-dot { background: #b36b00; }
.ssr-strip.is-paused .ssr-rec { color: #b36b00; }
.ssr-note { font-size: 0.8rem; color: #6b7f99; margin: -0.25rem 0 0.5rem 0.85rem; }
.ssr-dot { width: 10px; height: 10px; border-radius: 50%; background: #ff0000; }
.ssr-rec { color: #d32f2f; }
.ssr-clock { font-variant-numeric: tabular-nums; font-weight: 700; }
.ssr-grow { flex: 1 1 auto; }
.ssr-secs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.ssr-sec { font-size: 0.75rem; border: 1px solid #d5e1ee; border-radius: 99px; padding: 0.15rem 0.6rem; }
.ssr-sec.is-now { border-color: #d32f2f; color: #d32f2f; background: #fff1f1; font-weight: 700; }
.ssr-sec.is-work { border-color: #b36b00; color: #b36b00; }
.ssr-sec.is-done { border-color: #2e7d32; color: #2e7d32; background: #edf7ee; }
.ssr-sec.is-fail { border-color: #c0392b; color: #c0392b; background: #fdeeee; }
</style>

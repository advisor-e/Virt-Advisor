<template lang="pug">
.mrec
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="fatal" type="is-danger")
    p.has-text-weight-semibold {{ fatal }}
    p.is-size-7.mt-2 {{ $t('meetingRecorder.fatalNote') }}

  template(v-else)
    //- ── Consent, both steps ────────────────────────────────────────────
    .box(v-if="stage === 'consent1' || stage === 'consent2'")
      meeting-consent-panel(
        :step="stage === 'consent1' ? 1 : 2"
        :retention-months="retentionMonths"
        :elapsed-seconds="elapsedSeconds"
        :busy="busy"
        @start="startRecording"
        @cancel="$emit('exit')"
        @agree="confirmConsent"
        @refuse="stopAndDelete")

    //- ── During the meeting ─────────────────────────────────────────────
    .box(v-else-if="stage === 'recording'")
      .mrec-bar
        span.mrec-blip
        span.mrec-clock {{ clock }}
        span.mrec-say {{ savedSay }}
        b-button(type="is-danger" size="is-small" :loading="busy" @click="stopAndDelete") {{ $t('meetingRecorder.stopAndDelete') }}

      //- The parts row appears once there is a second part (Decision D); a meeting under 20
      //- minutes looks exactly as it did before parts existed.
      .mrec-parts(v-if="parts.length")
        span.tag.is-rounded(v-for="p in parts" :key="p.n" :class="p.cls") {{ p.text }}
        p.is-size-7.has-text-grey.mrec-why {{ $t('meetingRecorder.partsWhy') }}

      //- Screen 2: a part that could not be turned into text shows now, while the client is
      //- still in the room. Its audio is already gone (P8), so there is nothing to retry.
      b-message.mt-3(v-for="f in failedParts" :key="'f' + f.n" type="is-warning" size="is-small")
        p.has-text-weight-semibold {{ $t('meetingRecorder.partFailedHeading', f) }}
        p.mt-1 {{ $t('meetingRecorder.partFailedBody') }}

      //- The alarm. P11: a failed recording fails loudly — a tidy page of nothing must
      //- never be what total failure looks like.
      b-message(v-if="interrupted" type="is-danger")
        p.has-text-weight-semibold {{ $t('meetingRecorder.alarmHeading', { clock }) }}
        p.is-size-7.mt-1
          | {{ $tc('meetingRecorder.alarmBody', minutesSaved, { n: minutesSaved }) }}
          | #[b {{ $t('meetingRecorder.alarmNothingAfter', { clock }) }}]
        .buttons.are-small.mt-3
          b-button(type="is-primary" :loading="busy" @click="resumeRecording") {{ $t('meetingRecorder.resume') }}
          b-button(type="is-light" :loading="busy" @click="finishRecording") {{ $t('meetingRecorder.useCaptured') }}

      h4.title.is-6.mt-4.mb-2 {{ $t('meetingRecorder.pointsHeading') }}
      p.is-size-7.has-text-grey(v-if="!points.length") {{ $t('meetingRecorder.noPoints') }}
      .mrec-pt(v-for="p in points" :key="p.id")
        span.mrec-box
        span {{ p.text }}

      b-message.mt-4(v-if="chunkError" type="is-warning" size="is-small") {{ chunkError }}

      .buttons.mt-4(v-if="!interrupted")
        b-button(type="is-primary" :loading="busy" @click="finishRecording") {{ $t('meetingRecorder.finish') }}

    //- ── Afterwards ─────────────────────────────────────────────────────
    .box(v-else-if="stage === 'finishing'")
      p.has-text-weight-semibold {{ $t('meetingRecorder.finishingHeading') }}
      p.is-size-7.has-text-grey.mt-1 {{ $t('meetingRecorder.finishingBody') }}
      b-progress.mt-3(type="is-primary")
      .mrec-parts(v-if="parts.length")
        span.tag.is-rounded(v-for="p in parts" :key="p.n" :class="p.cls") {{ p.text }}

    .box(v-else-if="stage === 'done'")
      p.has-text-weight-semibold {{ $t('meetingRecorder.doneHeading') }}
      p.is-size-7.has-text-grey.mt-1(v-if="audioDeleted") {{ $t('meetingRecorder.doneAudioGone') }}
      b-message.mt-3(v-if="audioDeletionFailed" type="is-danger" size="is-small") {{ $t('meetingRecorder.deletionFailed') }}
      //- Screen 4, Decision E: the parts that worked are the transcript; the gap is named.
      b-message.mt-3(v-for="f in failedParts" :key="'m' + f.n" type="is-warning" size="is-small")
        p.has-text-weight-semibold {{ $t('meetingRecorder.missingHeading', f) }}
        p.mt-1 {{ $t('meetingRecorder.missingBody') }}
      b-message.mt-3(v-if="attributionConfident === false" type="is-warning" size="is-small") {{ $t('meetingRecorder.notConfident') }}
      //- Slice 3 replaced the "not built yet" note that stood here. This is the only route
      //- to the reports, so without it the screen they live on is unreachable.
      //-
      //- 🔴 "Read my reports" IS MIKE'S WORDING — ruled 2026-09-07, and it is load-bearing.
      //- "My" carries P2 in a label: the reports belong to the advisor, and the screen says so
      //- before they open it, exactly as "My Coaching Notes" does. It was written for the build
      //- on 2026-09-02 and flagged as ours until he ruled. Pinned, as meetingRecorder.readReports
      //- in locales/en.json, by tests/unit/meetingReview.component.test.js — do not reword it.
      .buttons.mt-3
        b-button(type="is-primary" tag="a" :href="`/meeting-review?meeting=${meetingId}`")
          | {{ $t('meetingRecorder.readReports') }}

    .box(v-else-if="stage === 'deleted'")
      p.has-text-weight-semibold {{ $t('meetingRecorder.deletedHeading') }}
      p.is-size-7.has-text-grey.mt-1 {{ $t('meetingRecorder.deletedBody') }}

    .box(v-else-if="stage === 'failed'")
      b-message(type="is-danger")
        p.has-text-weight-semibold {{ $t('meetingRecorder.failedHeading') }}
        p.is-size-7.mt-1 {{ $t('meetingRecorder.failedBody') }}
</template>

<script>
/**
 * MeetingRecorder — consent, live capture, transcription and deletion.
 *
 * Design `design/features/meeting-review.md` P1, P8, P10, P11; artefact
 * `design/mockups/meeting-review.html` Stage **B2–B4**, approved by Mike 2026-09-01.
 * Wording `design/MEETING-CONSENT-WORDING.md`.
 *
 * 🔴 RECORD → SPEAK → CONFIRM. Capture starts BEFORE consent is confirmed, because the
 * consent has to be captured inside the audio (P1). `startRecording` therefore begins the
 * MediaRecorder and only then shows step two. Reordering these to "tick first" would put the
 * client's agreement outside the recording — the fault Mike caught in the drawing — and every
 * screen would still look right.
 *
 * 🔴 "STOP AND DELETE" IS AVAILABLE THE WHOLE TIME, not only at consent step two. It answers
 * a client who says "actually, can you turn that off?" (wording page §4), and it destroys the
 * audio AND any transcript already derived from it.
 *
 * 🔴 THE ALARM IS THE HONEST HALF OF LIVE CAPTURE. Upload-a-file was the safer recommendation
 * and Mike chose live capture, which is right for consent and speed — but an operating system
 * can suspend a backgrounded tab and there is no second take with a real client. So a
 * wake-lock is held, and a capture that stops without being asked raises an alarm rather than
 * failing quietly (P11).
 *
 * ⚠ SSR: every browser API here — `navigator.mediaDevices`, `MediaRecorder`, `navigator.
 * wakeLock` — is touched only inside `mounted()` or a method a person triggers. Nothing is
 * read at the top level, in `data()`, in a computed or in `created()`.
 *
 * 🔴 A MEETING IS RECORDED IN 20-MINUTE PARTS (item 8.4, `design/mockups/meeting-review-long-
 * recording.html`, approved 2026-10-01). OpenAI's speaker-labelling model refuses more than 1400
 * seconds of audio, so a meeting sent whole past 23 min 20 s lost its transcript and its audio.
 * Each part is its own segment on the server (`meetingSegments.js`, the strategy session's
 * machinery), turned into text as it closes and joined at the end (Decisions A, B).
 *
 * 🔴 THE ADVISOR'S VOICE CLIP STAYS IN THIS BROWSER UNTIL PART 2 OPENS (Decision C, its privacy
 * risk stated to Mike before he ruled). Part 1 opens with the consent line, so its first speaker
 * is the advisor; only later parts need the clip to tell the advisor apart. A meeting that ends
 * inside 20 minutes therefore never sends it anywhere, and it is dropped with the page.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
import MeetingConsentPanel from '~/components/MeetingConsentPanel.vue'
import { describeParts, failedParts } from '~/utils/meetingParts'

/** How often captured audio leaves the browser. Short enough that a crash costs seconds. */
const CHUNK_MS = 15000

/** How often the recorder asks the backend how transcription is going. */
const POLL_MS = 4000

/**
 * Decision A: a part closes itself here and the next starts with no gap — under the model's
 * 1400-second limit, as the strategy session's sections are (ROLL_SECONDS there).
 */
const ROLL_SECONDS = 20 * 60

/** The advisor's voice clip: 2–10 seconds is OpenAI's documented range. */
const CLIP_MS = 8000

/** The tag colour for each part's state — Bulma's own, so nothing here is hand-rolled. */
const PART_TAG = { recording: 'is-danger', working: 'is-warning is-light', ready: 'is-success is-light', failed: 'is-danger is-light' }

export default {
  name: 'MeetingRecorder',

  components: { MeetingConsentPanel },

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true },
    /** The meeting type chosen in the pre-set, from `data/logic_trees.json`. */
    scenarioId: { type: String, default: '' },
    /**
     * Which client this meeting is with, from the firm's register. Empty is allowed and means
     * "not for a particular client" — the meeting is then never compared with a previous one,
     * because follow-through matches on the client and will not guess.
     */
    clientId: { type: String, default: '' },
    /** The advisor's observation points, shown while the meeting runs. */
    points: { type: Array, default: () => [] }
  },

  data () {
    return {
      loading: true,
      busy: false,
      fatal: '',
      chunkError: '',
      stage: 'consent1',
      /** The firm's retention period in months; the consent panel words it (item 13.12). */
      retentionMonths: null,
      meetingId: '',
      elapsedSeconds: 0,
      interrupted: false,
      audioDeleted: false,
      audioDeletionFailed: false,
      attributionConfident: null,
      /** The server's view of every part (`publicSegments`). */
      segments: [],
      /** The live part's number, and how long it has been recording. */
      liveN: 0,
      partSeconds: 0
    }
  },

  computed: {
    /** mm:ss, as the drawing shows it. */
    clock () {
      const total = Math.max(0, Math.floor(this.elapsedSeconds))
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
        String(total % 60).padStart(2, '0')
    },

    /** Whole minutes captured — the alarm's sentence agrees with it ("1 minute was"). */
    minutesSaved () {
      return Math.floor(this.elapsedSeconds / 60)
    },

    savedSay () {
      return this.$t('meetingRecorder.savedSay')
    },

    /** The parts row: empty until there is a second part (Decision D). */
    parts () {
      const key = { recording: 'partRecording', working: 'partWorking', ready: 'partReady', failed: 'partFailed' }
      return describeParts(this.segments).map(p => ({
        n: p.n,
        cls: PART_TAG[p.status],
        text: this.$t('meetingRecorder.' + key[p.status], p)
      }))
    },

    /** Parts that could not be turned into text — warned of now, named as missing at the end. */
    failedParts () {
      return failedParts(this.segments)
    }
  },

  mounted () {
    this.loadConsentContext()
  },

  beforeDestroy () {
    // Leaving the page must not leave a microphone open or a wake-lock held. It deliberately
    // does NOT delete the meeting: an advisor who navigates away by accident has not asked
    // for their client's meeting to be destroyed.
    this.teardownCapture()
  },

  methods: {
    /**
     * Read the one value the fixed consent wording needs — this firm's retention period.
     *
     * A failure here BLOCKS recording rather than falling back to the platform default. The
     * figure is spoken aloud to a client, and a guessed number is worse than no recording.
     */
    async loadConsentContext () {
      try {
        const data = await this.call('GET', '/api/meeting/consent')
        this.retentionMonths = data.retentionMonths || null
      } catch (err) {
        this.fatal = this.$t('meetingRecorder.errRetention', { error: err.message })
      } finally {
        this.loading = false
      }
    },

    /**
     * Begin capture, then show consent step two.
     *
     * The microphone is opened FIRST: a refused permission must not leave a meeting record
     * behind on the server with nothing in it.
     */
    async startRecording () {
      this.busy = true
      this.chunkError = ''
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        this.busy = false
        this.fatal = this.$t('meetingRecorder.errMicrophone', { error: err.message })
        return
      }

      try {
        const started = await this.call('POST', '/api/meeting/recordings', {
          scenarioId: this.scenarioId || null,
          // The backend checks this against the firm's own register and refuses an id that is
          // not on it, so a wrong value fails loudly rather than attaching the wrong business.
          clientId: this.clientId || null,
          segmented: true,
          parts: true
        })
        this.meetingId = started.meetingId
        this.retentionMonths = started.retentionMonths || this.retentionMonths
        await this.openPart()
      } catch (err) {
        this.busy = false
        this.teardownCapture()
        this.fatal = this.$t('meetingRecorder.errStart', { error: err.message })
        return
      }

      this.beginCapture()
      this.captureVoiceClip()
      await this.holdWakeLock()
      this.startClock()
      this.stage = 'consent2'
      this.busy = false
    },

    /**
     * Open the next part on the server, which closes — and starts transcribing — the one before.
     * From part 2 on, the advisor's clip is sent first, so the part just closed is labelled by it.
     */
    async openPart () {
      if (this.liveN) { await this.uploadVoiceClip() }
      const opened = await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/segments', { label: 'part' })
      this.liveN = opened.segment
      this.segments = opened.segments || []
      this._partStartedAt = Date.now()
      this.partSeconds = 0
    },

    /** Start a MediaRecorder for the live part. A fresh one per part: its own file. */
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
      // A stop we did not ask for is the suspended-tab case. It raises the alarm rather than
      // ending quietly, because the advisor has to know the last minutes are missing.
      // `stopCapture` replaces this handler before every stop it makes.
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
     * Send one captured piece of part `n`. A failed chunk is reported, never swallowed. The server
     * says when a part has passed 20 MB, or refuses a chunk that would overfill it; either way the
     * meeting moves on to the next part.
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
        if (!res.ok && res.status !== 409) { throw new Error(res.statusText) }
        this.chunkError = ''
      } catch (err) {
        this.chunkError = this.$t('meetingRecorder.errChunk')
      }
    },

    /** Decision A: close the live part and start the next, with no gap. */
    async rollOver () {
      if (this._rolling || this.stage !== 'recording' || this.interrupted) { return }
      this._rolling = true
      try {
        await this.stopCapture()
        await this.openPart()
        this.beginCapture()
      } catch (err) {
        this.fatal = this.$t('meetingRecorder.errStart', { error: err.message })
        this.teardownCapture()
      } finally {
        this._rolling = false
      }
    },

    /** The advisor's first 8 seconds — the opening of the consent line — kept in this browser. */
    captureVoiceClip () {
      const pieces = []
      const clip = new MediaRecorder(this._stream)
      clip.ondataavailable = (event) => { if (event.data && event.data.size) { pieces.push(event.data) } }
      clip.onstop = () => {
        if (pieces.length) { this._clip = new Blob(pieces, { type: pieces[0].type || 'audio/webm' }) }
      }
      clip.start()
      this._clipTimer = setTimeout(() => { if (clip.state !== 'inactive') { clip.stop() } }, CLIP_MS)
    },

    /** Send the clip once, when part 2 opens. Without it later parts are recorded as not confident. */
    async uploadVoiceClip () {
      const clip = this._clip
      this._clip = null
      if (!clip) { return }
      const form = new FormData()
      form.append('clip', clip, 'clip')
      try {
        await fetch('/api/meeting/recordings/' + this.meetingId + '/voice-reference', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this.apiToken },
          body: form
        })
      } catch (err) {
        // The server's rule then holds: a later part without the clip is never called confident.
      }
    },

    /** Keep the parts row current while recording, once there is more than one part. */
    async refreshParts () {
      try {
        const status = await this.call('GET', '/api/meeting/recordings/' + this.meetingId)
        this.segments = status.segments || this.segments
      } catch (err) { /* a failed poll is not a failed part; the next tick asks again */ }
    },

    /** Consent step two's "Yes — continue". */
    async confirmConsent () {
      this.busy = true
      try {
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/consent')
        this.stage = 'recording'
      } catch (err) {
        this.fatal = this.$t('meetingRecorder.errConfirm', { error: err.message })
      } finally {
        this.busy = false
      }
    },

    /**
     * Pick capture back up after an interruption, on the same meeting, as its next part. The
     * server closes the part that stopped, which is transcribed as usual.
     */
    async resumeRecording () {
      this.busy = true
      this.chunkError = ''
      try {
        if (!this._stream || !this._stream.active) {
          this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        }
        await this.openPart()
        this.beginCapture()
        await this.holdWakeLock()
        this.startClock()
        this.interrupted = false
      } catch (err) {
        this.chunkError = this.$t('meetingRecorder.errResume', { error: err.message })
      } finally {
        this.busy = false
      }
    },

    /**
     * End capture and start transcription.
     *
     * The recorder is stopped and its last chunk waited for before the backend is told to
     * finish — otherwise the final seconds are lost between the two calls. A clip never sent
     * (a meeting inside 20 minutes) is dropped here, never uploaded.
     */
    async finishRecording () {
      this.busy = true
      this.stopClock()
      await this.stopCapture()
      this._clip = null

      try {
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/finish')
        this.stage = 'finishing'
        this.pollStatus()
      } catch (err) {
        this.fatal = this.$t('meetingRecorder.errFinish', { error: err.message })
      } finally {
        this.busy = false
        this.releaseWakeLock()
      }
    },

    /** Ask the backend how transcription is going, until it is finished one way or the other. */
    async pollStatus () {
      try {
        const status = await this.call('GET', '/api/meeting/recordings/' + this.meetingId)
        this.audioDeleted = Boolean(status.audioDeleted)
        this.audioDeletionFailed = Boolean(status.audioDeletionFailed)
        this.attributionConfident = status.attributionConfident
        this.segments = status.segments || this.segments

        if (status.state === 'done') { this.stage = 'done'; return }
        if (status.state === 'failed') { this.stage = 'failed'; return }
      } catch (err) {
        // A poll that fails is not a transcription that failed. Keep asking.
      }
      this._poll = setTimeout(this.pollStatus, POLL_MS)
    },

    /**
     * Stop and destroy everything — the audio AND any transcript already made from it.
     * Wording page §4: a meeting the client withdrew consent to must not survive as text.
     */
    async stopAndDelete () {
      this.busy = true
      this.teardownCapture()
      this.stopClock()
      try {
        if (this.meetingId) {
          await this.call('DELETE', '/api/meeting/recordings/' + this.meetingId)
        }
        this.stage = 'deleted'
      } catch (err) {
        this.fatal = this.$t('meetingRecorder.errDelete', { error: err.message })
      } finally {
        this.busy = false
      }
    },

    /**
     * Stop the live recorder without treating it as an interruption, and resolve once its last
     * chunk has reached the server.
     * @returns {Promise<void>}
     */
    stopCapture () {
      const recorder = this._recorder
      this._recorder = null
      const sent = () => Promise.all(this._uploads || []).then(() => {}, () => {})
      if (!recorder || recorder.state === 'inactive') { return sent() }
      return new Promise((resolve) => {
        recorder.onstop = () => { sent().then(resolve) }
        try { recorder.stop() } catch (e) { resolve() }
      })
    },

    /** Stop capture and release every device this component opened. The clip goes with them. */
    teardownCapture () {
      this.stopCapture()
      this.stopClock()
      if (this._clipTimer) { clearTimeout(this._clipTimer); this._clipTimer = null }
      this._clip = null
      if (this._poll) { clearTimeout(this._poll); this._poll = null }
      if (this._stream) {
        this._stream.getTracks().forEach((t) => { try { t.stop() } catch (e) { /* gone */ } })
        this._stream = null
      }
      this.releaseWakeLock()
    },

    /** Keep the screen awake while recording. Absent in some browsers — never fatal. */
    async holdWakeLock () {
      try {
        if (navigator.wakeLock && !this._wakeLock) {
          this._wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch (e) {
        // A refused wake-lock does not stop a meeting. The alarm above is the safety net.
      }
    },

    releaseWakeLock () {
      if (this._wakeLock) {
        try { this._wakeLock.release() } catch (e) { /* already released */ }
        this._wakeLock = null
      }
    },

    startClock () {
      this.stopClock()
      this._clock = setInterval(() => {
        this.elapsedSeconds += 1
        this.partSeconds = Math.floor((Date.now() - (this._partStartedAt || Date.now())) / 1000)
        if (this.partSeconds >= ROLL_SECONDS) { this.rollOver() }
        if (this.segments.length > 1 && this.elapsedSeconds % (POLL_MS / 1000) === 0) { this.refreshParts() }
      }, 1000)
    },

    stopClock () {
      if (this._clock) { clearInterval(this._clock); this._clock = null }
    },

    /**
     * One JSON call, with both HTTP errors and network failure surfaced.
     * @param {string} method
     * @param {string} url
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async call (method, url, body) {
      const options = {
        method,
        headers: { Authorization: 'Bearer ' + this.apiToken }
      }
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
.mrec-bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.85rem;
  border-radius: 4px;
  background: #fff2f2;
}
/* Danger red, used by nothing else on this page, so "recording" reads at a glance. */
.mrec-blip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff0000;
}
.mrec-clock {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #ff0000;
}
.mrec-say {
  font-size: 0.78rem;
  color: #6b7785;
  flex: 1 1 auto;
}
/* The parts row (item 8.4): a little air below the bar and between the parts, as drawn. */
.mrec-parts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
}
.mrec-why {
  flex-basis: 100%;
}
.mrec-pt {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.mrec-pt:last-child { border-bottom: 0; }
.mrec-box {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-top: 0.2rem;
  border: 1.5px solid #c8d2df;
  border-radius: 3px;
}
</style>

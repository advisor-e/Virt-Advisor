<template lang="pug">
.mrec
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="fatal" type="is-danger")
    p.has-text-weight-semibold {{ fatal }}
    p.is-size-7.mt-2
      | Nothing was recorded. This says so rather than showing an empty page, because a
      |  meeting that failed and a meeting with nothing in it must never look the same.

  template(v-else)
    //- ── Consent, both steps ────────────────────────────────────────────
    .box(v-if="stage === 'consent1' || stage === 'consent2'")
      meeting-consent-panel(
        :step="stage === 'consent1' ? 1 : 2"
        :retention-phrase="retentionPhrase"
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
        b-button(type="is-danger" size="is-small" :loading="busy" @click="stopAndDelete") Stop and delete

      //- The alarm. P11: a failed recording fails loudly — a tidy page of nothing must
      //- never be what total failure looks like.
      b-message(v-if="interrupted" type="is-danger")
        p.has-text-weight-semibold Recording stopped unexpectedly at {{ clock }}
        p.is-size-7.mt-1
          | Your screen locked or the browser tab was suspended. {{ minutesSaved }} were saved
          |  and can still be transcribed. #[b Nothing after {{ clock }} was captured.]
        .buttons.are-small.mt-3
          b-button(type="is-primary" :loading="busy" @click="resumeRecording") Resume recording
          b-button(type="is-light" :loading="busy" @click="finishRecording") Use what was captured

      h4.title.is-6.mt-4.mb-2 Your observation points
      p.is-size-7.has-text-grey(v-if="!points.length")
        | Your firm has not set anything for this kind of meeting yet.
      .mrec-pt(v-for="p in points" :key="p.id")
        span.mrec-box
        span {{ p.text }}

      b-message.mt-4(v-if="chunkError" type="is-warning" size="is-small") {{ chunkError }}

      .buttons.mt-4(v-if="!interrupted")
        b-button(type="is-primary" :loading="busy" @click="finishRecording") Finish meeting

    //- ── Afterwards ─────────────────────────────────────────────────────
    .box(v-else-if="stage === 'finishing'")
      p.has-text-weight-semibold Turning the recording into a transcript
      p.is-size-7.has-text-grey.mt-1
        | This takes a few minutes for a long meeting. The recording is deleted as soon as the
        |  transcript exists — you can leave this page open.
      b-progress.mt-3(type="is-primary")

    .box(v-else-if="stage === 'done'")
      p.has-text-weight-semibold The transcript is made and the recording has been deleted.
      p.is-size-7.has-text-grey.mt-1(v-if="audioDeleted")
        | Nothing of the audio remains on the server.
      b-message.mt-3(v-if="audioDeletionFailed" type="is-danger" size="is-small")
        | Some of the audio could not be deleted. This has been reported — do not treat it as
        |  gone.
      b-message.mt-3(v-if="attributionConfident === false" type="is-warning" size="is-small")
        | Only one voice could be told apart in this recording, so who said what is not
        |  reliable. Your coaching notes will say so rather than guess.
      //- Slice 3 replaced the "not built yet" note that stood here. This is the only route
      //- to the reports, so without it the screen they live on is unreachable.
      .buttons.mt-3
        b-button(type="is-primary" tag="a" :href="`/meeting-review?meeting=${meetingId}`")
          | Read my reports

    .box(v-else-if="stage === 'deleted'")
      p.has-text-weight-semibold The recording has been deleted.
      p.is-size-7.has-text-grey.mt-1
        | Nothing was kept — neither the audio nor any transcript made from it. Your
        |  observation points are still worth reading; the meeting can go ahead unrecorded.

    .box(v-else-if="stage === 'failed'")
      b-message(type="is-danger")
        p.has-text-weight-semibold The transcript could not be made.
        p.is-size-7.mt-1
          | The recording has been deleted anyway, because the promise made to your client was
          |  that the audio would not be kept. Nothing of this meeting survives.
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
 * ⚠ THIS SLICE STOPS AT THE TRANSCRIPT. No report of either kind exists yet, which the "done"
 * panel says in an advisor's own words rather than leaving them to wonder.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
import MeetingConsentPanel from '~/components/MeetingConsentPanel.vue'

/** How often captured audio leaves the browser. Short enough that a crash costs seconds. */
const CHUNK_MS = 15000

/** How often the recorder asks the backend how transcription is going. */
const POLL_MS = 4000

export default {
  name: 'MeetingRecorder',

  components: { MeetingConsentPanel },

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true },
    /** The meeting type chosen in the pre-set, from `data/logic_trees.json`. */
    scenarioId: { type: String, default: '' },
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
      retentionPhrase: '',
      meetingId: '',
      elapsedSeconds: 0,
      interrupted: false,
      audioDeleted: false,
      audioDeletionFailed: false,
      attributionConfident: null
    }
  },

  computed: {
    /** mm:ss, as the drawing shows it. */
    clock () {
      const total = Math.max(0, Math.floor(this.elapsedSeconds))
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
        String(total % 60).padStart(2, '0')
    },

    minutesSaved () {
      const mins = Math.floor(this.elapsedSeconds / 60)
      return mins === 1 ? '1 minute' : mins + ' minutes'
    },

    savedSay () {
      return 'Saved to this point. Your screen will not sleep while recording.'
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
        this.retentionPhrase = data.retentionPhrase || ''
      } catch (err) {
        this.fatal = 'How long your firm keeps transcripts could not be read, so recording is unavailable: ' + err.message
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
        this.fatal = 'The microphone could not be opened, so nothing can be recorded: ' + err.message
        return
      }

      try {
        const started = await this.call('POST', '/api/meeting/recordings', {
          scenarioId: this.scenarioId || null
        })
        this.meetingId = started.meetingId
        this.retentionPhrase = started.retentionPhrase || this.retentionPhrase
      } catch (err) {
        this.busy = false
        this.teardownCapture()
        this.fatal = 'The recording could not be started: ' + err.message
        return
      }

      this._seq = 0
      this.beginCapture()
      await this.holdWakeLock()
      this.startClock()
      this.stage = 'consent2'
      this.busy = false
    },

    /** Start (or restart) the MediaRecorder over the open stream. */
    beginCapture () {
      this._expectingStop = false
      const recorder = new MediaRecorder(this._stream)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) { this.uploadChunk(event.data) }
      }
      // A stop we did not ask for is the suspended-tab case. It raises the alarm rather than
      // ending quietly, because the advisor has to know the last minutes are missing.
      recorder.onstop = () => {
        if (!this._expectingStop && this.stage === 'recording') {
          this.interrupted = true
          this.stopClock()
        }
      }
      recorder.start(CHUNK_MS)
      this._recorder = recorder
    },

    /** Send one captured piece. A failed chunk is reported, never swallowed. */
    async uploadChunk (blob) {
      if (!this.meetingId) { return }
      this._seq += 1
      const form = new FormData()
      form.append('seq', String(this._seq))
      form.append('chunk', blob, 'chunk')

      try {
        const res = await fetch('/api/meeting/recordings/' + this.meetingId + '/chunk', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this.apiToken },
          body: form
        })
        if (!res.ok) { throw new Error(res.statusText) }
        this.chunkError = ''
      } catch (err) {
        this.chunkError = 'Part of the recording did not reach the server. Recording continues, but check the meeting is still saving.'
      }
    },

    /** Consent step two's "Yes — continue". */
    async confirmConsent () {
      this.busy = true
      try {
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/consent')
        this.stage = 'recording'
      } catch (err) {
        this.fatal = 'That confirmation could not be recorded: ' + err.message
      } finally {
        this.busy = false
      }
    },

    /** Pick capture back up after an interruption, on the same meeting. */
    async resumeRecording () {
      this.busy = true
      this.chunkError = ''
      try {
        if (!this._stream || !this._stream.active) {
          this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        }
        this.beginCapture()
        await this.holdWakeLock()
        this.startClock()
        this.interrupted = false
      } catch (err) {
        this.chunkError = 'Recording could not be resumed: ' + err.message
      } finally {
        this.busy = false
      }
    },

    /**
     * End capture and start transcription.
     *
     * The recorder is stopped and given a moment to flush its last chunk before the backend
     * is told to assemble — otherwise the final seconds are lost between the two calls.
     */
    async finishRecording () {
      this.busy = true
      this.stopCapture()
      this.stopClock()
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        await this.call('POST', '/api/meeting/recordings/' + this.meetingId + '/finish')
        this.stage = 'finishing'
        this.pollStatus()
      } catch (err) {
        this.fatal = 'The transcript could not be started: ' + err.message
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
        this.fatal = 'The recording could not be deleted: ' + err.message + ' — do not treat it as gone.'
      } finally {
        this.busy = false
      }
    },

    /** Stop the MediaRecorder without treating it as an interruption. */
    stopCapture () {
      this._expectingStop = true
      if (this._recorder && this._recorder.state !== 'inactive') {
        try { this._recorder.stop() } catch (e) { /* already stopped */ }
      }
    },

    /** Stop capture and release every device this component opened. */
    teardownCapture () {
      this.stopCapture()
      this.stopClock()
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
      this._clock = setInterval(() => { this.elapsedSeconds += 1 }, 1000)
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

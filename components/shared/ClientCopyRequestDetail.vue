<template lang="pug">
.ccrd
  .box
    b-button.mb-4(size="is-small" outlined @click="$emit('back')") ← All requests

    .has-text-centered.py-5(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

    template(v-else)
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 {{ request.clientName || 'Client no longer on the register' }}
        span.is-size-7(:class="clockClass") {{ clock ? clock.phrase : '' }}

      p.is-size-7.has-text-grey.mb-4
        | {{ kindWords[request.kind] }} · asked on {{ shortDate(request.receivedAt) }}
        span(v-if="clock") &nbsp;· due {{ shortDate(clock.due) }}

      //- 🔴 P8 DESTROYS THE AUDIO THE MOMENT A TRANSCRIPT EXISTS, so by the time anybody can
      //- ask there is nothing to play. Said out loud rather than leaving somebody hunting for
      //- a play button that was never going to be there.
      b-message(type="is-warning" size="is-small")
        p.mb-1
          b There is no audio of any meeting, and there never will be.
        p
          | Every recording is destroyed the moment its transcript exists — that is what your
          |  client was told when consent was taken. What can be provided is text.

      //- 🔴 RULING 2 ON A SCREEN. A client's request reaches across every advisor who ever met
      //- them, so no one person can answer it.
      b-message(v-if="waitingOn.length" type="is-info" size="is-small")
        p.mb-1
          b You can release the meetings you recorded. The others are for the advisor who took them.
        p
          | Still waiting on {{ waitingOn.join(', ') }}. The request is answered once every
          |  advisor has released their part.

      h5.is-size-7.has-text-weight-semibold.has-text-grey.mt-5.mb-2 MEETINGS HELD WITH THIS CLIENT

      p.is-size-7.has-text-grey.py-4(v-if="!meetings.length")
        | No meetings with this client have been recorded. Nothing here has been deleted — none
        |  was ever made.

      .ccrd-row(v-for="m in meetings" :key="m.meetingId" :class="{ 'is-gone': m.expired }")
        .ccrd-main
          .ccrd-when {{ longDate(m.createdAt) }}
          .ccrd-who
            span(v-if="m.yours") You recorded this
            span(v-else) Recorded by {{ advisorLabel(m) }}
            span(v-if="!m.expired && m.retentionMonths")
              | &nbsp;· kept until {{ retentionEnds(m) }}

          .ccrd-tags
            //- 🔴 AN EXPIRED TRANSCRIPT NAMES ITS DESTRUCTION DATE AND THE PROMISE IT WAS KEPT
            //- UNDER — ruling 7. "No records" reads as though the meeting never happened and
            //- sends somebody hunting for a backup that does not exist.
            template(v-if="m.expired")
              b-tag(type="is-danger" size="is-small")
                | {{ m.expiredReason === 'client-asked' ? 'Deleted at your client’s request' : 'Deleted' }}
                |  on {{ shortDate(m.expiredAt) }}
            template(v-else)
              b-tag(v-if="m.holds.includes('transcript')" type="is-success" size="is-small") Transcript
              b-tag(v-if="m.holds.includes('summary')" type="is-success" size="is-small") Meeting Summary
              b-tag(v-else type="is-danger" size="is-small") Meeting Summary was never approved
              //- 🔴 RULING 1, ON THE SCREEN AS WELL AS IN THE CODE. Mike's words: "clients never
              //- get these notes." Shown as an explicit never rather than simply absent, so
              //- nobody wonders whether it was an oversight.
              b-tag(size="is-small") My Coaching Notes — never provided

          p.ccrd-note(v-if="m.expired")
            | This meeting was held when your firm kept transcripts for
            |  {{ m.retentionMonths }} months. The transcript and both reports were destroyed on
            |  that date and cannot be recovered.

          p.ccrd-note(v-else-if="m.released")
            | Released {{ shortDate(releaseFor(m).at) }} by {{ releaseFor(m).releasedBy }}.
            span(v-if="releaseFor(m).breakGlass")
              |  Released on the firm’s behalf — {{ releaseFor(m).breakGlass.declaredBy }} recorded
              |  that {{ releaseFor(m).breakGlass.absentAdvisor }} could no longer act.

        .ccrd-actions(v-if="!m.expired && !m.released && request.state === 'open'")
          template(v-if="m.yours")
            b-button(size="is-small" type="is-primary" :loading="busy === m.meetingId"
              :disabled="!readyToRelease" @click="release(m)") Prepare the copy
            b-button(size="is-small" outlined @click="startCorrection(m)"
              v-if="m.holds.includes('transcript')") Record a correction
            b-button(size="is-small" type="is-danger" outlined @click="startDelete(m)") Delete
          template(v-else)
            b-tag(type="is-warning" size="is-small") Waiting on {{ advisorLabel(m) }}
            b-button.mt-1(size="is-small" outlined @click="startBreakGlass(m)")
              | They cannot act

      //- ── Before this is handed over ───────────────────────────────────────
      //- 🔴 RULING 8. A client naming an employee, a family member or a customer is naming
      //- somebody who consented to nothing and was not in the room. Nothing here removes
      //- anything: whether a name should come out depends on facts only the firm knows.
      b-message.mt-5(v-if="anyReleasable" type="is-danger" size="is-small")
        p.mb-1
          b A transcript is a record of a conversation, and other people are in it.
        p
          | Your client may have named employees, family members or customers. Whether any of
          |  that should be removed before you hand it over is a judgement about your client’s
          |  situation and your obligations — we cannot make it for you, and nothing here
          |  removes anything automatically. Read what you are about to provide.

      //- 🔴 THE TWO TICKS OF THE DRAWING'S SCREEN B, and they are the control ruling 8 rests
      //- on rather than decoration beside it. The backend refuses a release without both, so
      //- this is a screen for a control that exists rather than the control itself.
      .ccrd-ack(v-if="anyReleasable")
        b-checkbox(v-model="identityConfirmed")
          | I have confirmed I am dealing with
          |  {{ request.clientName || 'this client' }}, or someone they have authorised to ask
          |  on their behalf.
        p.is-size-7.has-text-grey.ml-5.mb-3
          | This application cannot check that. Your firm confirms it, the same way consent is
          |  confirmed before a recording starts.
        b-checkbox(v-model="contentRead")
          | I have read what is being provided and I am satisfied it is right to release it.

      p.is-size-7.has-text-grey.mt-4(v-if="anyReleasable")
        | Preparing the copy produces a file you download and send yourself, from your own
        |  email — exactly as a Meeting Summary is sent today. Nothing is emailed by this
        |  application.

      .mt-5(v-if="request.state === 'open'")
        b-button(size="is-small" @click="close" :loading="closing") Mark this request answered
      b-message.mt-4(v-else type="is-success" size="is-small")
        | Answered {{ shortDate(request.closedAt) }} by {{ request.closedBy }}.
        span(v-if="request.outcome") &nbsp;{{ request.outcome }}

  //- ── A correction ───────────────────────────────────────────────────────────
  b-modal(v-model="correcting" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 Record a correction
      section.modal-card-body
        //- 🔴 RULING 4. A transcript records what was said in a room, not a claim about the
        //- world. Every coaching finding quotes it and is verified against it before storage,
        //- so an edit would strand findings that still read as evidenced.
        b-message(type="is-info" size="is-small")
          p.mb-1
            b The transcript is not changed, and this is the reason.
          p
            | It records what was said in a room, not a claim about the world. Your client’s
            |  statement is attached to the meeting and travels with it from now on — which is
            |  what the law asks for where a record cannot simply be rewritten.

        b-field(label="The passage your client disputes" label-position="on-border")
          b-input(v-model="correction.quote" type="textarea" rows="2" maxlength="1000")
        b-field(label="Where in the meeting (optional)" label-position="on-border")
          b-input(v-model="correction.quoteAt" placeholder="00:31:08" maxlength="32")
        b-field(label="Your client’s statement, in their words" label-position="on-border")
          b-input(v-model="correction.statement" type="textarea" rows="3" maxlength="2000")

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-primary" :loading="busy === 'correction'" @click="submitCorrection")
          | Attach this statement
        b-button(@click="correcting = false") Cancel

  //- ── Deleting early ─────────────────────────────────────────────────────────
  b-modal(v-model="deleting" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 Delete this meeting
      section.modal-card-body
        //- 🔴 RULING 5. Deleting the transcript alone would leave the client's words in both
        //- reports — the letter of the promise kept and its substance broken.
        b-message(type="is-danger" size="is-small")
          p.mb-1
            b This destroys the transcript and both reports for this meeting.
          p
            | It is the same removal the retention clock performs, brought forward — so the
            |  Meeting Summary and your own coaching notes go too. They quote the transcript
            |  throughout, and removing only the transcript would leave your client’s words in
            |  two other files. #[b It cannot be undone.]

        b-message(type="is-info" size="is-small")
          p.mb-1
            b A record that the meeting happened will remain.
          p
            | The date, the client, the advisor and the fact that it was deleted at your
            |  client’s request — nothing of what was said. Keeping that lets you prove the
            |  deletion happened rather than showing an empty folder and asking to be believed.

        //- 🔴 TWO TICKS, AND THEY SAY DIFFERENT THINGS. Without the first, a firm could
        //- destroy a record for its own reasons and have the surviving stub read afterwards
        //- as a client's request. That stub is what a later reader relies on.
        b-checkbox(v-model="deleteClientAsked")
          | {{ request.clientName || 'My client' }} asked for this, and I have confirmed who I
          |  am dealing with.
        b-checkbox.mt-2(v-model="deleteConfirmed")
          | I understand this cannot be undone and that no copy is kept anywhere.

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-danger" :disabled="!deleteConfirmed || !deleteClientAsked"
          :loading="busy === 'delete'" @click="submitDelete") Delete permanently
        b-button(@click="deleting = false") Cancel

  //- ── The break-glass ────────────────────────────────────────────────────────
  b-modal(v-model="breakingGlass" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 Release on the firm’s behalf
      section.modal-card-body
        //- 🔴 RULING 2b. A fire alarm, not a key — day to day the advisor alone sends.
        b-message(type="is-danger" size="is-small")
          p.mb-1
            b Only {{ target ? advisorLabel(target) : 'the recording advisor' }} can release this
              |  meeting, and a request cannot wait forever.
          p
            | Your client’s right does not lapse because an advisor left the firm. If they can
            |  no longer act, you may release it on the firm’s behalf — and this application
            |  cannot check that for itself, so #[b you are declaring it].

        b-checkbox(v-model="glassConfirmed")
          | {{ target ? advisorLabel(target) : 'This advisor' }} can no longer act on this request.
        //- Screen B2's second tick. The break-glass does not excuse the reading — if anything
        //- it matters more here, because the person releasing was not in the room.
        b-checkbox.mt-2(v-model="glassContentRead")
          | I have read what is being released and I am satisfied it is right to provide it.

        p.is-size-7.has-text-grey.mt-3
          | Sign-in is handled by Advisor-e, not by this application, so nothing here can
          |  confirm whether an advisor has left. This declaration stays on the record
          |  permanently, with your name and today’s date.

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-danger" :disabled="!glassConfirmed || !glassContentRead"
          :loading="busy === 'glass'" @click="submitBreakGlass") Release on the firm’s behalf
        b-button(@click="breakingGlass = false") Cancel
</template>

<script>
/**
 * One client copy request — the meetings held for that client, and what may be done with each.
 *
 * Design: `design/mockups/client-record-request.html` screens B, B2, C and D, drawn 2026-09-10
 * and ruled the same day.
 *
 * 🔴 RULING 2 IS THE SHAPE OF THIS SCREEN, not a detail on it. The advisor alone releases a
 * meeting, so a client's request — which reaches across every advisor who ever met them —
 * cannot be answered by one person. Each advisor sees the same screen and acts only on their
 * own rows; the request is closed when the last part is released. **A build that offered one
 * caller a "release everything" button would not be this feature.**
 *
 * 🔴 RULING 1 IS SHOWN AS AN EXPLICIT NEVER. "My Coaching Notes — never provided" is rendered
 * on every meeting rather than the notes simply being absent, so nobody reads their absence as
 * an oversight and "fixes" it. In Mike's words: *"clients never get these notes."*
 *
 * ⚠ THE ADVISOR'S NAME MAY BE MISSING, and that is a named deviation from the drawing, which
 * shows *"Recorded by Owen Fraser"*. This application holds no advisors table, so a name is
 * captured on the meeting record at write time — and meetings recorded before 2026-09-10 have
 * none. `advisorLabel` falls back to the identifier rather than inventing a name, which is the
 * same wall the "4 of 12" denominator met.
 */
export default {
  name: 'ClientCopyRequestDetail',

  props: {
    /** The signed-in caller's token, passed down by the hub. */
    apiToken: { type: String, required: true },
    /** Which request to show. */
    requestId: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      modalError: '',
      closing: false,
      busy: '',
      request: {},
      meetings: [],
      releases: [],
      clock: null,
      correcting: false,
      deleting: false,
      breakingGlass: false,
      /** Screen B's two ticks — the control ruling 8 rests on. The route refuses without both. */
      identityConfirmed: false,
      contentRead: false,
      deleteClientAsked: false,
      deleteConfirmed: false,
      glassConfirmed: false,
      glassContentRead: false,
      target: null,
      correction: { quote: '', quoteAt: '', statement: '' },
      kindWords: {
        copy: 'A copy of what was recorded',
        correction: 'A correction',
        deletion: 'Deletion before the retention date'
      }
    }
  },

  computed: {
    /**
     * The advisors whose meetings are still outstanding — the sentence ruling 2 makes
     * necessary.
     * @returns {Array<string>}
     */
    waitingOn () {
      const names = []
      this.meetings.forEach((m) => {
        if (m.yours || m.expired || m.released) { return }
        const label = this.advisorLabel(m)
        if (!names.includes(label)) { names.push(label) }
      })
      return names
    },

    /** @returns {boolean} is anything here actually releasable by this caller? */
    anyReleasable () {
      return this.meetings.some(m => m.yours && !m.expired && !m.released && m.holds.length)
    },

    /**
     * Both of Screen B's ticks given. The backend refuses without them either way — this only
     * stops somebody meeting a 400 they could have been shown was coming.
     * @returns {boolean}
     */
    readyToRelease () {
      return this.identityConfirmed && this.contentRead
    },

    /** @returns {string} the clock's colour class */
    clockClass () {
      if (!this.clock) { return 'has-text-grey' }
      if (this.clock.overdue) { return 'has-text-danger has-text-weight-semibold' }
      return 'has-text-grey'
    }
  },

  async mounted () {
    await this.load()
  },

  methods: {
    /**
     * Load the request, its meetings and its releases.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', `/api/client-copy-requests/${this.requestId}`)
        this.request = data.request || {}
        this.meetings = data.meetings || []
        this.releases = data.releases || []
        this.clock = data.clock || null
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * What to call the advisor on a meeting.
     *
     * 🔴 FALLS BACK TO THE IDENTIFIER RATHER THAN INVENTING A NAME. This app holds no advisors
     * table; a plausible wrong name is worse than an honest id.
     *
     * @param {object} meeting
     * @returns {string}
     */
    advisorLabel (meeting) {
      return (meeting && (meeting.advisorName || meeting.advisor)) || 'another advisor'
    },

    /**
     * The release recorded against one meeting, if any.
     * @param {object} meeting
     * @returns {object}
     */
    releaseFor (meeting) {
      return this.releases.find(r => r.meetingId === meeting.meetingId) || {}
    },

    /**
     * When this meeting's text is due to expire — its OWN promised period, never the firm's
     * current dial (ruling 7, and `meetingPurge`'s rule).
     * @param {object} meeting
     * @returns {string}
     */
    retentionEnds (meeting) {
      if (!meeting.createdAt || !meeting.retentionMonths) { return 'an unrecorded date' }
      const at = new Date(meeting.createdAt)
      at.setUTCMonth(at.getUTCMonth() + meeting.retentionMonths)
      return this.shortDate(at.toISOString())
    },

    /** @param {string} iso @returns {string} e.g. "2 Sep 2026" */
    shortDate (iso) {
      if (!iso) { return '' }
      const at = new Date(iso)
      if (isNaN(at.getTime())) { return '' }
      return at.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /** @param {string} iso @returns {string} e.g. "27 August 2026" */
    longDate (iso) {
      if (!iso) { return 'An undated meeting' }
      const at = new Date(iso)
      if (isNaN(at.getTime())) { return 'An undated meeting' }
      return at.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
    },

    /**
     * Release one of the caller's own meetings.
     * @param {object} meeting
     * @returns {Promise<void>}
     */
    async release (meeting) {
      this.busy = meeting.meetingId
      this.loadError = ''
      try {
        await this.api('POST',
          `/api/client-copy-requests/${this.requestId}/meetings/${meeting.meetingId}/release`,
          { identityConfirmed: this.identityConfirmed, contentRead: this.contentRead })
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.loadError = e.message
      }
      this.busy = ''
    },

    /** @param {object} meeting */
    startCorrection (meeting) {
      this.target = meeting
      this.modalError = ''
      this.correction = { quote: '', quoteAt: '', statement: '' }
      this.correcting = true
    },

    /** @returns {Promise<void>} */
    async submitCorrection () {
      this.modalError = ''
      if (!this.correction.statement.trim()) {
        this.modalError = 'A correction needs your client’s own words.'
        return
      }
      this.busy = 'correction'
      try {
        await this.api('POST',
          `/api/client-copy-requests/${this.requestId}/meetings/${this.target.meetingId}/correction`,
          this.correction)
        this.correcting = false
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.modalError = e.message
      }
      this.busy = ''
    },

    /** @param {object} meeting */
    startDelete (meeting) {
      this.target = meeting
      this.modalError = ''
      this.deleteClientAsked = false
      this.deleteConfirmed = false
      this.deleting = true
    },

    /** @returns {Promise<void>} */
    async submitDelete () {
      this.busy = 'delete'
      this.modalError = ''
      try {
        await this.api('POST',
          `/api/client-copy-requests/${this.requestId}/meetings/${this.target.meetingId}/delete`,
          { clientAsked: true, confirmed: true })
        this.deleting = false
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.modalError = e.message
      }
      this.busy = ''
    },

    /** @param {object} meeting */
    startBreakGlass (meeting) {
      this.target = meeting
      this.modalError = ''
      this.glassConfirmed = false
      this.glassContentRead = false
      this.breakingGlass = true
    },

    /** @returns {Promise<void>} */
    async submitBreakGlass () {
      this.busy = 'glass'
      this.modalError = ''
      try {
        await this.api('POST',
          `/api/client-copy-requests/${this.requestId}/meetings/${this.target.meetingId}/release-absent`,
          { declared: true, contentRead: true })
        this.breakingGlass = false
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.modalError = e.message
      }
      this.busy = ''
    },

    /** @returns {Promise<void>} */
    async close () {
      this.closing = true
      this.loadError = ''
      try {
        await this.api('POST', `/api/client-copy-requests/${this.requestId}/close`, {})
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.loadError = e.message
      }
      this.closing = false
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a person can act on, per the house error rule.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async api (method, path, body) {
      let res
      try {
        res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error('The server could not be reached. Check your connection and try again.')
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || 'That could not be done.')
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.ccrd-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
  padding: 14px 0;
  border-top: 1px solid #ededed;
}
.ccrd-row:first-child {
  border-top: 0;
}
.ccrd-row.is-gone .ccrd-when {
  color: #7a7a7a;
}
.ccrd-when {
  font-size: 0.875rem;
  font-weight: 600;
}
.ccrd-who {
  font-size: 0.75rem;
  color: #7a7a7a;
  margin-top: 2px;
}
.ccrd-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.ccrd-note {
  font-size: 0.75rem;
  color: #7a7a7a;
  margin-top: 8px;
}
.ccrd-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}
@media screen and (max-width: 768px) {
  .ccrd-row {
    grid-template-columns: 1fr;
  }
  .ccrd-actions {
    align-items: flex-start;
  }
}
</style>

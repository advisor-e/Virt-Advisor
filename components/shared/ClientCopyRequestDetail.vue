<template lang="pug">
.ccrd
  .box
    b-button.mb-4(size="is-small" outlined @click="$emit('back')") {{ $t('clientCopyRequestDetail.back') }}

    .has-text-centered.py-5(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

    template(v-else)
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 {{ request.clientName || $t('clientCopyRequestDetail.clientGone') }}
        span.is-size-7(:class="clockClass") {{ clockWords(clock) }}

      p.is-size-7.has-text-grey.mb-4
        | {{ $t('clientCopyRequestDetail.askedLine', { kind: kindWords[request.kind], date: shortDate(request.receivedAt) }) }}
        span(v-if="clock") &nbsp;{{ $t('clientCopyRequestDetail.due', { date: shortDate(clock.due) }) }}

      //- 🔴 P8 DESTROYS THE AUDIO THE MOMENT A TRANSCRIPT EXISTS, so by the time anybody can
      //- ask there is nothing to play. Said out loud rather than leaving somebody hunting for
      //- a play button that was never going to be there.
      b-message(type="is-warning" size="is-small")
        p.mb-1
          b {{ $t('clientCopyRequestDetail.noAudio.title') }}
        p {{ $t('clientCopyRequestDetail.noAudio.body') }}

      //- 🔴 RULING 2 ON A SCREEN. A client's request reaches across every advisor who ever met
      //- them, so no one person can answer it.
      b-message(v-if="waitingOn.length" type="is-info" size="is-small")
        p.mb-1
          b {{ $t('clientCopyRequestDetail.waiting.title') }}
        p {{ $t('clientCopyRequestDetail.waiting.body', { names: waitingOn.join(', ') }) }}

      h5.is-size-7.has-text-weight-semibold.has-text-grey.mt-5.mb-2 {{ $t('clientCopyRequestDetail.meetingsHeading') }}

      p.is-size-7.has-text-grey.py-4(v-if="!meetings.length") {{ $t('clientCopyRequestDetail.noMeetings') }}

      .ccrd-row(v-for="m in meetings" :key="m.meetingId" :class="{ 'is-gone': m.expired }")
        .ccrd-main
          .ccrd-when {{ longDate(m.createdAt) }}
          .ccrd-who
            span(v-if="m.yours") {{ $t('clientCopyRequestDetail.youRecorded') }}
            span(v-else) {{ $t('clientCopyRequestDetail.recordedBy', { advisor: advisorLabel(m) }) }}
            span(v-if="!m.expired && m.retentionMonths")
              | &nbsp;{{ $t('clientCopyRequestDetail.keptUntil', { date: retentionEnds(m) }) }}

          .ccrd-tags
            //- 🔴 AN EXPIRED TRANSCRIPT NAMES ITS DESTRUCTION DATE AND THE PROMISE IT WAS KEPT
            //- UNDER — ruling 7. "No records" reads as though the meeting never happened and
            //- sends somebody hunting for a backup that does not exist.
            template(v-if="m.expired")
              b-tag(type="is-danger" size="is-small")
                | {{ $t(m.expiredReason === 'client-asked' ? 'clientCopyRequestDetail.deletedClientAsked' : 'clientCopyRequestDetail.deletedOn', { date: shortDate(m.expiredAt) }) }}
            template(v-else)
              b-tag(v-if="m.holds.includes('transcript')" type="is-success" size="is-small") {{ $t('clientCopyRequestDetail.tags.transcript') }}
              b-tag(v-if="m.holds.includes('summary')" type="is-success" size="is-small") {{ $t('clientCopyRequestDetail.tags.summary') }}
              b-tag(v-else type="is-danger" size="is-small") {{ $t('clientCopyRequestDetail.tags.summaryNever') }}
              //- 🔴 RULING 1, ON THE SCREEN AS WELL AS IN THE CODE. Mike's words: "clients never
              //- get these notes." Shown as an explicit never rather than simply absent, so
              //- nobody wonders whether it was an oversight.
              b-tag(size="is-small") {{ $t('clientCopyRequestDetail.tags.coachingNever') }}

          p.ccrd-note(v-if="m.expired") {{ $t('clientCopyRequestDetail.expiredNote', { months: m.retentionMonths }) }}

          p.ccrd-note(v-else-if="m.released")
            | {{ $t('clientCopyRequestDetail.releasedLine', { date: shortDate(releaseFor(m).at), who: releaseFor(m).releasedBy }) }}
            span(v-if="releaseFor(m).breakGlass")
              |  {{ $t('clientCopyRequestDetail.breakGlassLine', { declaredBy: releaseFor(m).breakGlass.declaredBy, absent: releaseFor(m).breakGlass.absentAdvisor }) }}

        .ccrd-actions(v-if="!m.expired && !m.released && request.state === 'open'")
          template(v-if="m.yours")
            b-button(size="is-small" type="is-primary" :loading="busy === m.meetingId"
              :disabled="!readyToRelease" @click="release(m)") {{ $t('clientCopyRequestDetail.actions.prepare') }}
            b-button(size="is-small" outlined @click="startCorrection(m)"
              v-if="m.holds.includes('transcript')") {{ $t('clientCopyRequestDetail.actions.recordCorrection') }}
            b-button(size="is-small" type="is-danger" outlined @click="startDelete(m)") {{ $t('clientCopyRequestDetail.actions.delete') }}
          template(v-else)
            b-tag(type="is-warning" size="is-small") {{ $t('clientCopyRequestDetail.actions.waitingOn', { advisor: advisorLabel(m) }) }}
            b-button.mt-1(size="is-small" outlined @click="startBreakGlass(m)")
              | {{ $t('clientCopyRequestDetail.actions.cannotAct') }}

      //- ── Before this is handed over ───────────────────────────────────────
      //- 🔴 RULING 8. A client naming an employee, a family member or a customer is naming
      //- somebody who consented to nothing and was not in the room. Nothing here removes
      //- anything: whether a name should come out depends on facts only the firm knows.
      b-message.mt-5(v-if="anyReleasable" type="is-danger" size="is-small")
        p.mb-1
          b {{ $t('clientCopyRequestDetail.others.title') }}
        p {{ $t('clientCopyRequestDetail.others.body') }}

      //- 🔴 THE TWO TICKS OF THE DRAWING'S SCREEN B, and they are the control ruling 8 rests
      //- on rather than decoration beside it. The backend refuses a release without both, so
      //- this is a screen for a control that exists rather than the control itself.
      .ccrd-ack(v-if="anyReleasable")
        b-checkbox(v-model="identityConfirmed")
          | {{ $t('clientCopyRequestDetail.ack.identity', { client: request.clientName || $t('clientCopyRequestDetail.ack.thisClient') }) }}
        p.is-size-7.has-text-grey.ml-5.mb-3 {{ $t('clientCopyRequestDetail.ack.identityNote') }}
        b-checkbox(v-model="contentRead")
          | {{ $t('clientCopyRequestDetail.ack.contentRead') }}

      p.is-size-7.has-text-grey.mt-4(v-if="anyReleasable") {{ $t('clientCopyRequestDetail.fileNote') }}

      .mt-5(v-if="request.state === 'open'")
        b-button(size="is-small" @click="close" :loading="closing") {{ $t('clientCopyRequestDetail.markAnswered') }}
      b-message.mt-4(v-else type="is-success" size="is-small")
        | {{ $t('clientCopyRequestDetail.answered', { date: shortDate(request.closedAt), who: request.closedBy }) }}
        span(v-if="request.outcome") &nbsp;{{ request.outcome }}

  //- ── A correction ───────────────────────────────────────────────────────────
  b-modal(v-model="correcting" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 {{ $t('clientCopyRequestDetail.correction.title') }}
      section.modal-card-body
        //- 🔴 RULING 4. A transcript records what was said in a room, not a claim about the
        //- world. Every coaching finding quotes it and is verified against it before storage,
        //- so an edit would strand findings that still read as evidenced.
        b-message(type="is-info" size="is-small")
          p.mb-1
            b {{ $t('clientCopyRequestDetail.correction.whyTitle') }}
          p {{ $t('clientCopyRequestDetail.correction.whyBody') }}

        b-field(:label="$t('clientCopyRequestDetail.correction.quote')" label-position="on-border")
          b-input(v-model="correction.quote" type="textarea" rows="2" maxlength="1000")
        b-field(:label="$t('clientCopyRequestDetail.correction.quoteAt')" label-position="on-border")
          b-input(v-model="correction.quoteAt" placeholder="00:31:08" maxlength="32")
        b-field(:label="$t('clientCopyRequestDetail.correction.statement')" label-position="on-border")
          b-input(v-model="correction.statement" type="textarea" rows="3" maxlength="2000")

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-primary" :loading="busy === 'correction'" @click="submitCorrection")
          | {{ $t('clientCopyRequestDetail.correction.attach') }}
        b-button(@click="correcting = false") {{ $t('clientCopyRequestDetail.cancel') }}

  //- ── Deleting early ─────────────────────────────────────────────────────────
  b-modal(v-model="deleting" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 {{ $t('clientCopyRequestDetail.delete.title') }}
      section.modal-card-body
        //- 🔴 RULING 5. Deleting the transcript alone would leave the client's words in both
        //- reports — the letter of the promise kept and its substance broken.
        b-message(type="is-danger" size="is-small")
          p.mb-1
            b {{ $t('clientCopyRequestDetail.delete.warnTitle') }}
          i18n(path="clientCopyRequestDetail.delete.warnBody" tag="p")
            template(#cannotUndo)
              b {{ $t('clientCopyRequestDetail.delete.cannotUndo') }}

        b-message(type="is-info" size="is-small")
          p.mb-1
            b {{ $t('clientCopyRequestDetail.delete.stubTitle') }}
          p {{ $t('clientCopyRequestDetail.delete.stubBody') }}

        //- 🔴 TWO TICKS, AND THEY SAY DIFFERENT THINGS. Without the first, a firm could
        //- destroy a record for its own reasons and have the surviving stub read afterwards
        //- as a client's request. That stub is what a later reader relies on.
        b-checkbox(v-model="deleteClientAsked")
          | {{ $t('clientCopyRequestDetail.delete.clientAsked', { client: request.clientName || $t('clientCopyRequestDetail.delete.myClient') }) }}
        b-checkbox.mt-2(v-model="deleteConfirmed")
          | {{ $t('clientCopyRequestDetail.delete.understand') }}

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-danger" :disabled="!deleteConfirmed || !deleteClientAsked"
          :loading="busy === 'delete'" @click="submitDelete") {{ $t('clientCopyRequestDetail.delete.confirm') }}
        b-button(@click="deleting = false") {{ $t('clientCopyRequestDetail.cancel') }}

  //- ── The break-glass ────────────────────────────────────────────────────────
  b-modal(v-model="breakingGlass" has-modal-card :can-cancel="['escape', 'outside']")
    .modal-card
      header.modal-card-head
        p.modal-card-title.is-size-6 {{ $t('clientCopyRequestDetail.glass.title') }}
      section.modal-card-body
        //- 🔴 RULING 2b. A fire alarm, not a key — day to day the advisor alone sends.
        b-message(type="is-danger" size="is-small")
          p.mb-1
            b {{ $t('clientCopyRequestDetail.glass.warnTitle', { advisor: target ? advisorLabel(target) : $t('clientCopyRequestDetail.glass.recordingAdvisor') }) }}
          i18n(path="clientCopyRequestDetail.glass.warnBody" tag="p")
            template(#declaring)
              b {{ $t('clientCopyRequestDetail.glass.declaring') }}

        b-checkbox(v-model="glassConfirmed")
          | {{ $t('clientCopyRequestDetail.glass.cannotAct', { advisor: target ? advisorLabel(target) : $t('clientCopyRequestDetail.glass.thisAdvisor') }) }}
        //- Screen B2's second tick. The break-glass does not excuse the reading — if anything
        //- it matters more here, because the person releasing was not in the room.
        b-checkbox.mt-2(v-model="glassContentRead")
          | {{ $t('clientCopyRequestDetail.glass.contentRead') }}

        p.is-size-7.has-text-grey.mt-3 {{ $t('clientCopyRequestDetail.glass.signInNote') }}

        b-message(v-if="modalError" type="is-danger" size="is-small") {{ modalError }}
      footer.modal-card-foot
        b-button(type="is-danger" :disabled="!glassConfirmed || !glassContentRead"
          :loading="busy === 'glass'" @click="submitBreakGlass") {{ $t('clientCopyRequestDetail.glass.confirm') }}
        b-button(@click="breakingGlass = false") {{ $t('clientCopyRequestDetail.cancel') }}
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
import copyDeadlineWords from '../../mixins/copyDeadlineWords'
import { intlLocaleFor } from '../../utils/dateLocale'

export default {
  name: 'ClientCopyRequestDetail',

  mixins: [copyDeadlineWords],

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
      correction: { quote: '', quoteAt: '', statement: '' }
    }
  },

  computed: {
    /** @returns {object} how each request kind reads — the list screen's own words, one home */
    kindWords () {
      return {
        copy: this.$t('firmClientCopyRequests.kinds.copy'),
        correction: this.$t('firmClientCopyRequests.kinds.correction'),
        deletion: this.$t('firmClientCopyRequests.kinds.deletion')
      }
    },

    /**
     * The locale dates are written in. English keeps the New Zealand form it has always used —
     * "2 Sep 2026" — and every other language gets its own (item 10.2's sibling).
     * @returns {string}
     */
    dateLocale () {
      return this.$i18n.locale === 'en' ? 'en-NZ' : intlLocaleFor(this.$i18n.locale)
    },

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
      return (meeting && (meeting.advisorName || meeting.advisor)) || this.$t('clientCopyRequestDetail.anotherAdvisor')
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
      if (!meeting.createdAt || !meeting.retentionMonths) { return this.$t('clientCopyRequestDetail.unrecordedDate') }
      const at = new Date(meeting.createdAt)
      at.setUTCMonth(at.getUTCMonth() + meeting.retentionMonths)
      return this.shortDate(at.toISOString())
    },

    /** @param {string} iso @returns {string} e.g. "2 Sep 2026" */
    shortDate (iso) {
      if (!iso) { return '' }
      const at = new Date(iso)
      if (isNaN(at.getTime())) { return '' }
      return at.toLocaleDateString(this.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /** @param {string} iso @returns {string} e.g. "27 August 2026" */
    longDate (iso) {
      if (!iso) { return this.$t('clientCopyRequestDetail.undated') }
      const at = new Date(iso)
      if (isNaN(at.getTime())) { return this.$t('clientCopyRequestDetail.undated') }
      return at.toLocaleDateString(this.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
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
        this.modalError = this.$t('clientCopyRequestDetail.correction.needWords')
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
        throw new Error(this.$t('clientCopyRequestDetail.errors.unreachable'))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || this.$t('clientCopyRequestDetail.errors.failed'))
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

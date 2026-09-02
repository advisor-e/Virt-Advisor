<template lang="pug">
.mrev
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small")
    | {{ loadError }}
    br
    | Nothing was loaded, so this page is empty for a reason rather than because there is
    |  nothing to show.

  template(v-else)
    //- P11. A failure says so in those words. A tidy page of "no observations" must never be
    //- what a total failure looks like.
    b-message(v-if="state === 'failed'" type="is-danger" size="is-small")
      | #[b Your reports could not be written.] The meeting was recorded and transcribed, but
      |  both reports failed to generate. Nothing here is missing because the meeting was
      |  quiet — try again, and tell someone if it keeps failing.
    b-message(v-else-if="state === 'partial'" type="is-warning" size="is-small")
      | #[b One of your two reports could not be written] ({{ error }}). What is below is
      |  complete; what is absent is absent because it failed, not because there was nothing
      |  to say.
    b-message(v-else-if="state === 'generating'" type="is-info" size="is-small")
      | Writing your reports. This takes a minute or two.

    .has-text-centered.py-5(v-if="state === 'none'")
      p.is-size-6.has-text-grey.mb-4 Your reports have not been written yet.
      b-button(type="is-primary" :loading="starting" @click="generate") Write my reports

    //- ── Meeting Summary — the client's copy ──────────────────────────────────────
    .box.mb-5(v-if="summary")
      .mrev-hd
        h3.title.is-5.mb-1 Meeting Summary
        b-tag(v-if="summary.approvedAt" type="is-success" size="is-small") Approved
        b-tag(v-else type="is-light" size="is-small") Draft — not sent
      p.is-size-7.has-text-grey.mb-4
        | Yours to edit. Nothing goes to your client until you send it.

      template(v-if="!editing")
        h5.mrev-h5 What we covered
        p.is-size-6 {{ displayedCovered }}

        template(v-if="summary.actions && summary.actions.length")
          h5.mrev-h5 What we agreed
          ul.mrev-list
            li(v-for="(a, i) in summary.actions" :key="i")
              b(v-if="a.who") {{ a.who }} —&nbsp;
              span {{ a.what }}
              span(v-if="a.when")  by #[b {{ a.when }}]

        template(v-if="summary.next")
          h5.mrev-h5 What happens next
          p.is-size-6 {{ summary.next }}

        //- "Actions agreed" sits HERE and not among the measured figures. It cannot be
        //- counted, only understood, so it must not appear under a caption promising no AI.
        p.is-size-7.has-text-grey.mt-4(v-if="summary.agreement")
          | Actions were agreed at #[b {{ summary.agreement.at }}].

      b-input(v-else v-model="draft" type="textarea" rows="12")

      .buttons.mt-4
        template(v-if="editing")
          b-button(type="is-primary" :loading="saving" @click="saveEdit") Save my changes
          b-button(@click="cancelEdit") Cancel
        template(v-else)
          b-button(type="is-primary" :loading="saving" @click="approve"
            :disabled="Boolean(summary.approvedAt)") Approve this summary
          b-button(@click="copyForClient") Copy for the client
          b-button(@click="startEdit") Edit

    //- ── My Coaching Notes — the advisor's own ────────────────────────────────────
    .box(v-if="coaching")
      .mrev-hd
        h3.title.is-5.mb-1 My Coaching Notes
        b-tag(type="is-light" size="is-small") Private to you
      p.is-size-7.has-text-grey.mb-4
        | Only you can see this. Nobody else can open it.

      //- §5 trap 1. Degraded speaker separation must fail visibly: every figure below that
      //- depends on who spoke becomes a coin toss while still rendering as a confident number.
      b-message(v-if="attributionConfident === false" type="is-warning" size="is-small")
        | #[b We could not reliably tell the two voices apart on this recording.] Everything
        |  below that depends on who was speaking — the split, the longest stretch, the
        |  questions — may be wrong. Treat it with caution rather than as a measurement.

      template(v-if="metrics && metrics.usable")
        h4.mrev-h4 Who spoke, across {{ metrics.length.clock }}
        .mrev-split(v-if="metrics.talkTime.advisorPercent !== null")
          .mrev-adv(:style="{ width: metrics.talkTime.advisorPercent + '%' }")
            | You · {{ metrics.talkTime.advisorPercent }}%
          .mrev-cli(:style="{ width: metrics.talkTime.clientPercent + '%' }")
            | Client · {{ metrics.talkTime.clientPercent }}%

        h4.mrev-h4 Measured, not judged
        .mrev-figs
          .mrev-fig
            .k Longest stretch
            .v {{ metrics.longestMonologue.clock }}
            .s without a pause for the client
          .mrev-fig
            .k Open questions
            .v {{ metrics.questions.open }}
            .s against {{ metrics.questions.closed }} closed
          .mrev-fig
            .k Pause after asking
            .v {{ pauseValue }}
            .s before you spoke again
          .mrev-fig
            .k Meeting length
            .v {{ metrics.length.clock }}
            .s from the first word to the last
        p.is-size-7.has-text-grey.mt-2
          | Counted from the transcript by arithmetic. No AI is involved, and none of these
          |  can be wrong.

      h4.mrev-h4 Your observation points
      p.is-size-6.has-text-grey.py-4(v-if="!coaching.findings.length")
        | Your firm has not set any observation points for this kind of meeting, so there was
        |  nothing to check against.

      .mrev-ob(v-for="f in coaching.findings" :key="f.pointId" :class="obClass(f)")
        .mrev-obhd
          span.mrev-nm {{ f.text }}
          b-tag(:type="tagType(f)" size="is-small") {{ stateLabel(f) }}

        //- P4. A finding either quotes the transcript or declares the thing absent. An
        //- uncited one never reaches here — the backend drops it and reports not found.
        .mrev-quote(v-if="f.state === 'found'")
          span.mrev-ts {{ f.at }} · you
          q {{ f.quote }}

        .mrev-note(v-else-if="f.state === 'not_found'")
          | The model was asked to quote where this happened and answered #[code NOT FOUND].

        .mrev-note(v-else)
          template(v-if="f.hint")
            | A recording cannot hear this. You said #[i "{{ f.hint.phrase }}"] at
            |  {{ f.hint.at }}, which often means it happened — but the software is guessing,
            |  and says so.
          template(v-else)
            | A recording cannot hear this one, so only you can say whether it happened.

        .mrev-answered(v-if="f.state === 'cannot_hear' && f.advisorAnswer !== null")
          | You answered: #[b {{ f.advisorAnswer ? 'Yes, I did' : "No, I didn't" }}]

        .mrev-links
          a.mrev-link(v-if="f.state === 'found'" @click="toggleContext(f.pointId)")
            | {{ openContext === f.pointId ? 'Hide the transcript' : 'Show this in the transcript' }}
          template(v-if="f.state === 'cannot_hear' && f.advisorAnswer === null")
            a.mrev-link(@click="answerHeard(f, true)") Yes, I did
            a.mrev-link(@click="answerHeard(f, false)") No, I didn't
          a.mrev-link(v-if="f.state !== 'cannot_hear' && !disputed(f)" @click="dispute(f)")
            | I disagree with this
          span.mrev-disputed(v-if="disputed(f)") You disagreed with this

        .mrev-ctx(v-if="openContext === f.pointId")
          .mrev-ctxline(v-for="(s, i) in contextFor(f)" :key="i" :class="{ 'is-hit': s.hit }")
            span.mrev-ts {{ s.at }} · {{ s.who }}
            span {{ s.text }}
</template>

<script>
/**
 * MeetingReview — the two reports an advisor reads after a meeting.
 *
 * Design `design/features/meeting-review.md` P2, P4, P5, P6, P7, P11; artefact
 * `design/mockups/meeting-review.html` **C1 and C2**, approved by Mike 2026-09-01.
 *
 * 🔴 FOUR DELIBERATE DIFFERENCES FROM THE APPROVED DRAWING, EACH RULED BY MIKE 2026-09-02
 * after being put to him one at a time (`CLAUDE.md`, Save the Artefact):
 *
 *   1. **"Play this moment" is gone, replaced by "Show this in the transcript".** P8 destroys
 *      the audio the instant a transcript exists — slice 2 built exactly that, in a `finally` —
 *      so by the time any report is generated there is nothing left to play. The drawing and
 *      the feature's own non-negotiable contradicted each other. Showing the surrounding lines
 *      serves what that control was for: checking the evidence in context.
 *   2. **"Send to client" is gone, replaced by "Approve this summary" and "Copy for the
 *      client".** This application has no mail channel of any kind, and adding one would put a
 *      named client's financial affairs through a company nobody has assessed — the same
 *      argument that kept the audio off Google Drive. The advisor sends it from their own
 *      email, which is P7 exactly: the app writes, the advisor publishes.
 *   3. **The jargon tile is absent, not empty.** It counts terms from a firm glossary that
 *      does not exist anywhere in this application. A default word-list would have been
 *      inventing Mike's advisory content — what slice 1 refused to do for ten empty scenarios.
 *      A permanently blank figure reads as a bug, so the tile is not rendered at all.
 *   4. **"Yes, I drew it" reads "Yes, I did".** The drawing's wording only works for the
 *      drawing's example; these buttons appear on any point a recording cannot hear.
 *
 * ⚠ THREE FURTHER DIFFERENCES THAT ARE ABSENCES RATHER THAN RULINGS, named here so they are
 * not mistaken for oversights:
 *
 *   - **"Actions agreed" is not among the measured figures.** It cannot be counted, only
 *      understood, so it comes from the summary generator with a citation and is rendered with
 *      the summary. Leaving it in that block would have printed "no AI is involved" above a
 *      figure an AI produced.
 *   - **No "Discard".** There is no route that discards one report; "stop and delete" removes
 *      the whole meeting and lives on the recording screen, where a client asking to stop can
 *      actually be answered.
 *   - **No "Share with my manager".** P2 says the report is shared upward only by the
 *      advisor's own act, and that act has nowhere to arrive: no manager screen for it exists,
 *      and the manager aggregate is a later slice. A button that shared nothing would be worse
 *      than none — the same reasoning slice 1 used for "Start the meeting".
 *
 * ⚠ HARDCODED ENGLISH, MATCHING ITS SIBLINGS. `MeetingRecorder.vue` and `MeetingPreset.vue`
 * do the same; only `MeetingConsentPanel.vue` goes through `$t()`, because those are the words
 * a client is told and they must be translated per market by someone competent in the local
 * law. Nothing on this screen is spoken to a client.
 *
 * Vue 2 Options API, Pug, Buefy.
 */

/** How much transcript to show either side of a citation. */
const CONTEXT_SECONDS = 45

export default {
  name: 'MeetingReview',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true },
    /** Which meeting to read. Ownership is proven on the server, never here. */
    meetingId: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      starting: false,
      saving: false,
      editing: false,
      draft: '',
      openContext: '',
      state: 'none',
      error: null,
      attributionConfident: null,
      summary: null,
      coaching: null,
      segments: [],
      poller: null
    }
  },

  computed: {
    /** The mechanical figures, when there are any. */
    metrics () {
      return this.coaching ? this.coaching.metrics : null
    },

    /** The advisor's own words win over the generated ones once they have edited. */
    displayedCovered () {
      if (!this.summary) { return '' }
      return this.summary.editedText || this.summary.covered
    },

    /**
     * The pause figure, or a dash.
     *
     * A dash rather than 0 s: no occasions means the advisor never filled their own silence,
     * which is the good outcome and must not render as the worst possible score.
     */
    pauseValue () {
      const p = this.metrics && this.metrics.pauseAfterAsking
      return (p && p.medianSeconds !== null) ? p.medianSeconds + 's' : '—'
    }
  },

  mounted () {
    this.load()
  },

  beforeDestroy () {
    this.stopPolling()
  },

  methods: {
    /** Read both reports. A failure is shown, never swallowed into an empty page (P11). */
    async load () {
      this.loadError = ''
      try {
        const data = await this.call('GET', '')
        this.state = data.state
        this.error = data.error
        this.attributionConfident = data.attributionConfident
        this.summary = data.summary
        this.coaching = data.coaching
        this.segments = (data.transcript && data.transcript.segments) || []
        if (this.state === 'generating') { this.startPolling() } else { this.stopPolling() }
      } catch (err) {
        this.loadError = 'Your reports could not be loaded: ' + err.message
      } finally {
        this.loading = false
      }
    },

    /** Every call to the reports API, with both failure modes handled in one place. */
    async call (method, suffix, body) {
      const opts = {
        method,
        headers: { Authorization: `Bearer ${this.apiToken}` }
      }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      let res
      try {
        res = await fetch(`/api/meeting/recordings/${this.meetingId}/reports${suffix}`, opts)
      } catch (netErr) {
        throw new Error('the connection failed')
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || res.statusText)
      }
      return res.json()
    },

    startPolling () {
      if (this.poller) { return }
      this.poller = setInterval(() => { this.load() }, 5000)
    },

    stopPolling () {
      if (this.poller) { clearInterval(this.poller); this.poller = null }
    },

    async generate () {
      this.starting = true
      try {
        await this.call('POST', '')
        this.state = 'generating'
        this.startPolling()
      } catch (err) {
        this.loadError = 'Your reports could not be started: ' + err.message
      } finally {
        this.starting = false
      }
    },

    startEdit () {
      this.draft = this.displayedCovered
      this.editing = true
    },

    cancelEdit () {
      this.editing = false
      this.draft = ''
    },

    /** Save the advisor's own words. The backend clears any approval on the way through. */
    async saveEdit () {
      this.saving = true
      try {
        await this.call('PUT', '/summary', { text: this.draft })
        this.editing = false
        await this.load()
      } catch (err) {
        this.loadError = 'Your changes could not be saved: ' + err.message
      } finally {
        this.saving = false
      }
    },

    async approve () {
      this.saving = true
      try {
        await this.call('POST', '/summary/approve')
        await this.load()
      } catch (err) {
        this.loadError = 'That could not be approved: ' + err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Put the summary on the clipboard so the advisor can send it themselves.
     *
     * SSR-safe: `navigator` is only ever touched inside a method, never at the top level or
     * in `data()` — CLAUDE.md, hydration safety.
     */
    async copyForClient () {
      const text = this.summaryAsText()
      try {
        await navigator.clipboard.writeText(text)
        this.$buefy.toast.open({ message: 'Copied — paste it into your email', type: 'is-success' })
      } catch (err) {
        // Clipboard access is refused in some browsers and over plain HTTP. Saying so beats a
        // button that silently does nothing.
        this.$buefy.toast.open({
          message: 'Your browser would not let the app copy that. Select the text and copy it yourself.',
          type: 'is-warning',
          duration: 6000
        })
      }
    },

    /** The summary as plain text, in the order it is read on screen. */
    summaryAsText () {
      const parts = ['Meeting Summary', '', this.displayedCovered]
      if (this.summary.actions && this.summary.actions.length) {
        parts.push('', 'What we agreed')
        this.summary.actions.forEach((a) => {
          const who = a.who ? a.who + ' — ' : ''
          const when = a.when ? ' by ' + a.when : ''
          parts.push('- ' + who + a.what + when)
        })
      }
      if (this.summary.next) { parts.push('', 'What happens next', this.summary.next) }
      return parts.join('\n')
    },

    disputed (finding) {
      return Boolean(this.coaching.disputes && this.coaching.disputes[finding.pointId])
    },

    /**
     * Record that the advisor disagrees. P5 — the disagreement is kept BESIDE the finding,
     * never instead of it. That is the line between coaching and surveillance.
     */
    async dispute (finding) {
      try {
        await this.call('POST', '/coaching/dispute', { pointId: finding.pointId })
        await this.load()
      } catch (err) {
        this.loadError = 'That could not be recorded: ' + err.message
      }
    },

    /** Settle a point the recording could not hear. What is stored is this answer, not a guess. */
    async answerHeard (finding, answer) {
      try {
        await this.call('POST', '/coaching/heard', { pointId: finding.pointId, answer })
        await this.load()
      } catch (err) {
        this.loadError = 'That could not be recorded: ' + err.message
      }
    },

    toggleContext (pointId) {
      this.openContext = this.openContext === pointId ? '' : pointId
    },

    /** The transcript either side of a citation — what replaced "Play this moment". */
    contextFor (finding) {
      const at = finding.atSeconds
      if (at === null || at === undefined) { return [] }
      return this.segments
        .filter(s => s.start >= at - CONTEXT_SECONDS && s.start <= at + CONTEXT_SECONDS)
        .map(s => ({
          at: this.asClock(s.start),
          who: s.role === 'advisor' ? 'you' : (s.role === 'client' ? 'your client' : 'unclear'),
          text: s.text,
          hit: s.start === at
        }))
    },

    asClock (seconds) {
      const whole = Math.max(0, Math.round(Number(seconds) || 0))
      return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0')
    },

    obClass (f) {
      return 'is-' + f.state.replace('_', '-')
    },

    tagType (f) {
      if (f.state === 'found') { return 'is-success' }
      return f.state === 'not_found' ? 'is-light' : 'is-warning'
    },

    stateLabel (f) {
      if (f.state === 'found') { return 'Found' }
      return f.state === 'not_found' ? 'Not found' : 'Cannot be heard'
    }
  }
}
</script>

<style scoped>
.mrev-hd { display: flex; align-items: baseline; gap: 0.6rem; }
.mrev-h4 { font-weight: 700; margin: 1.4rem 0 0.6rem; }
.mrev-h5 { font-weight: 700; margin: 1rem 0 0.3rem; }
.mrev-list { list-style: disc; padding-left: 1.2rem; }
.mrev-list li { padding: 0.15rem 0; }

.mrev-split { display: flex; height: 30px; border-radius: 4px; overflow: hidden; }
.mrev-adv, .mrev-cli {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
}
.mrev-adv { background: #4a6fa5; }
.mrev-cli { background: #8aa4c2; }

.mrev-figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.7rem;
}
.mrev-fig { border: 1px solid #e6ebf2; border-radius: 5px; padding: 0.6rem 0.7rem; }
.mrev-fig .k { font-size: 11.5px; color: #6b7785; text-transform: uppercase; }
.mrev-fig .v { font-size: 22px; font-weight: 700; line-height: 1.2; }
.mrev-fig .s { font-size: 12px; color: #6b7785; }

.mrev-ob { border: 1px solid #e6ebf2; border-radius: 5px; padding: 0.7rem 0.8rem; margin-bottom: 0.6rem; }
.mrev-ob.is-found { border-left: 3px solid #37a169; }
.mrev-ob.is-not-found { border-left: 3px solid #c8d2df; }
.mrev-ob.is-cannot-hear { border-left: 3px solid #d9a441; }
.mrev-obhd { display: flex; align-items: baseline; gap: 0.6rem; justify-content: space-between; }
.mrev-nm { font-weight: 600; }
.mrev-quote { margin-top: 0.5rem; padding-left: 0.7rem; border-left: 2px solid #e6ebf2; }
.mrev-ts { display: block; font-size: 11.5px; color: #6b7785; }
.mrev-note { margin-top: 0.5rem; font-size: 13px; color: #4b5563; }
.mrev-answered { margin-top: 0.5rem; font-size: 13px; }
.mrev-links { margin-top: 0.6rem; display: flex; gap: 0.9rem; flex-wrap: wrap; }
.mrev-link { font-size: 12.5px; cursor: pointer; }
.mrev-disputed { font-size: 12.5px; color: #6b7785; }
.mrev-ctx { margin-top: 0.7rem; border-top: 1px solid #eef2f7; padding-top: 0.5rem; }
.mrev-ctxline { padding: 0.3rem 0; font-size: 13px; }
.mrev-ctxline.is-hit { background: #fbf7e6; }
</style>

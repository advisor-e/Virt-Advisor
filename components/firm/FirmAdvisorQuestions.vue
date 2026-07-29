<template lang="pug">
section.advisor-questions
  .has-text-centered.py-4(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('firmTeamProgress.detail.loading') }}

  //- The record could not be READ. Said out loud rather than shown as an advisor who
  //- has answered nothing — the two must never render the same, which is the fault
  //- this whole feature carried until 2026-07-29.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('firmTeamProgress.detail.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('firmTeamProgress.detail.retry') }}

  template(v-else)
    p.has-text-grey.py-4(v-if="!hasQuestions")
      | {{ $t('firmTeamProgress.detail.empty') }}

    div(v-else)
      h4.detail-heading {{ $t('firmTeamProgress.detail.byTopic') }}

      b-table.topic-table(:data="topics" :narrowed="true")
        b-table-column(
          v-slot="{ row }"
          field="bankKey"
          :label="$t('firmTeamProgress.detail.colTopic')"
        )
          span(v-if="row.bankKey") {{ row.bankKey }}
          //- A question whose bank was never recorded is not a topic; it is said so
          //- rather than filed under a plausible-looking heading.
          span.has-text-grey.is-italic(v-else) {{ $t('firmTeamProgress.detail.noTopic') }}

        b-table-column(
          v-slot="{ row }"
          field="asked"
          :label="$t('firmTeamProgress.detail.colAsked')"
          width="120"
        )
          .asked-cell
            span {{ row.asked }}
            //- Only shown when there is something to say. Without it, questions the
            //- marker never scored would silently read as answers they got wrong.
            span.not-marked.has-text-grey.is-size-7(v-if="row.notMarked")
              | {{ $t('firmTeamProgress.detail.notMarkedCount', { n: row.notMarked }) }}

        b-table-column(
          v-slot="{ row }"
          field="correct"
          :label="$t('firmTeamProgress.detail.colCorrect')"
          width="90"
        )
          | {{ row.correct }}

        b-table-column(
          v-slot="{ row }"
          field="avgScore"
          :label="$t('firmTeamProgress.detail.colAverage')"
          width="100"
        )
          span(v-if="row.avgScore !== null") {{ row.avgScore }}%
          span.has-text-grey(v-else) —

      h4.detail-heading.mt-5 {{ $t('firmTeamProgress.detail.sessions') }}

      .session(v-for="(session, i) in sessions" :key="i")
        p.session-head
          span.has-text-weight-semibold {{ sessionName(session) }}
          span.has-text-grey.is-size-7  · {{ formatDate(session.completedAt) }}
          span.has-text-grey.is-size-7(v-if="session.quizScore !== null")
            |  · {{ session.quizScore }}%
        .questions
          span.q-chip(
            v-for="(question, qi) in session.questions"
            :key="qi"
            :class="outcomeClass(question)"
          )
            | {{ $t('firmTeamProgress.detail.question', { n: questionNumber(question, qi) }) }}
            |  — {{ $t(outcomeKey(question)) }}
</template>

<script>

export default {
  name: 'FirmAdvisorQuestions',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true },
    /** The advisor to look at. The server confines it to the manager's own firm. */
    advisorId: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the record could not be READ — never merely "nothing recorded". */
      error: false,
      /** Per-bank rollup, weakest first, as the backend orders it. */
      topics: [],
      /** Course sessions newest-first, each with its own questions (may be empty). */
      sessions: []
    }
  },

  computed: {
    /**
     * Whether there is any per-question detail at all.
     *
     * Sessions completed before the per-question record existed carry no questions,
     * so an advisor can have plenty of sessions and nothing to show here. That is a
     * real state with its own sentence, not an error and not an empty team.
     *
     * @returns {boolean}
     */
    hasQuestions () {
      return this.sessions.some(s => s.questions && s.questions.length > 0)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * GET one advisor's quiz detail.
     *
     * The firm is derived server-side from the bearer token and the advisor id is
     * confined to that firm by the query, so this cannot reach another firm's people.
     * Any failure — HTTP error, malformed body, or no network — sets `error` rather
     * than leaving an empty list, because an unreachable record and an advisor with
     * no questions recorded must not render the same.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      try {
        const res = await fetch(
          `/api/activity/team/advisor/${encodeURIComponent(this.advisorId)}`,
          { headers: { Authorization: `Bearer ${this.apiToken}` } }
        )
        if (!res.ok) { throw new Error(res.statusText) }
        const data = await res.json()
        if (!data || !data.success) { throw new Error('UNSUCCESSFUL') }
        this.topics = data.topics || []
        this.sessions = data.sessions || []
      } catch (err) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * What to call a session. The session's own title where it has one, otherwise the
     * course it belongs to — never a blank line where a name should be.
     *
     * @param {Object} session - one session from the payload.
     * @returns {string}
     */
    sessionName (session) {
      return session.sessionTitle || session.courseTitle || ''
    },

    /**
     * The number to show against a question: its position in the bank it came from,
     * falling back to its position in this session when no bank reference was stored.
     *
     * @param {Object} question - one normalised question.
     * @param {number} index - its position in the session.
     * @returns {number}
     */
    questionNumber (question, index) {
      return question.bankRef === null || question.bankRef === undefined
        ? index + 1
        : question.bankRef
    },

    /**
     * The i18n key for a question's outcome. An unmarked question is its own outcome,
     * never folded into "not passed" — the marker simply never scored it.
     *
     * @param {Object} question - one normalised question.
     * @returns {string} i18n key.
     */
    outcomeKey (question) {
      if (question.ungraded) { return 'firmTeamProgress.detail.notMarked' }
      return question.passed
        ? 'firmTeamProgress.detail.passed'
        : 'firmTeamProgress.detail.notPassed'
    },

    /**
     * Colour class matching the outcome, so a row can be read at a glance.
     *
     * @param {Object} question - one normalised question.
     * @returns {string}
     */
    outcomeClass (question) {
      if (question.ungraded) { return 'is-not-marked' }
      return question.passed ? 'is-passed' : 'is-not-passed'
    },

    /**
     * Day-month-year, matching the team table and the advisor's own progress screen.
     *
     * @param {string|Date} dt - a completion timestamp.
     * @returns {string} e.g. "29 Jul 2026".
     */
    formatDate (dt) {
      return new Date(dt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
}
</script>

<style scoped>
.advisor-questions { padding: 0.25rem 0 0.5rem; }
.detail-heading { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; }
.asked-cell { display: flex; flex-direction: column; line-height: 1.2; }
.not-marked { margin-top: 1px; white-space: nowrap; }
.session { margin-bottom: 0.75rem; }
.session-head { margin-bottom: 0.25rem; }
.questions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.q-chip {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  white-space: nowrap;
}
/* Green/red/grey rather than a tier palette: this is right, wrong and unknown, which
   is a different axis from capability level and must not be mistaken for it. */
.q-chip.is-passed { background: #dcfce7; color: #166534; }
.q-chip.is-not-passed { background: #fee2e2; color: #991b1b; }
.q-chip.is-not-marked { background: #f1f5f9; color: #475569; }
</style>

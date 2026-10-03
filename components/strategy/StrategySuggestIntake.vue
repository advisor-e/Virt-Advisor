<template lang="pug">
.ssi
  p.ssi-head {{ $t('strategyPlanner.menu.intakeHeading') }}
  p.ssi-intro {{ $t('strategyPlanner.menu.intakeIntro') }}

  //- 🔴 ONE QUESTION AT A TIME, AND WHAT WAS ASKED STAYS. Mike, 2026-09-30: "guided
  //- assistance - not a survey or a check list … 1 question to reveal at a time, as it is
  //- added, the previous remains visible for context." Answered questions stay above the
  //- current one; pressing one opens it again with its answer in place.
  ol.ssi-list
    li.ssi-done(
      v-for="(q, i) in answeredBefore"
      :key="q.field"
    )
      button.ssi-done-btn(type="button" @click="edit(i)")
        span.ssi-q {{ q.text }}
        span.ssi-a {{ answerText(q) }}

    li.ssi-now(v-if="currentQuestion" :key="'now-' + currentQuestion.field")
      //- The planning domains are described BEFORE they are asked about (Mike, 2026-10-03).
      template(v-if="currentQuestion.kind === 'planningDomains'")
        p.ssi-q.is-current {{ currentQuestion.lead }}
        .ssi-options
          label.ssi-opt(
            v-for="d in currentQuestion.options"
            :key="d.id"
            :class="{ 'is-on': picks.includes(d.id) }"
          )
            input(type="checkbox" :value="d.id" v-model="picks")
            span.ssi-opt-body
              b {{ d.name }}
              span {{ d.description }}
      p.ssi-q.is-current {{ currentQuestion.text }}

      //- The three pickers are the Virtual Advisor's own, reading the same lists.
      .ssi-options(v-if="currentQuestion.kind === 'growthStage'")
        label.ssi-opt(
          v-for="stage in growthStages"
          :key="stage.name"
          :class="{ 'is-on': choice === stage.name }"
        )
          input(type="radio" :value="stage.name" v-model="choice")
          span.ssi-opt-body
            b {{ stage.name }}
            span {{ stage.description }}

      .ssi-options(v-else-if="currentQuestion.kind === 'staircase'")
        label.ssi-opt(
          v-for="step in staircaseSteps"
          :key="step.step"
          :class="{ 'is-on': choice === step.name }"
        )
          input(type="radio" :value="step.name" v-model="choice")
          span.ssi-opt-body
            b {{ step.name }}
            span {{ step.description }}

      .ssi-lengths(v-else-if="currentQuestion.kind === 'sessionLength'")
        b-button(
          v-for="opt in lengthOptions"
          :key="opt"
          size="is-small"
          :type="choice === opt ? 'is-primary' : 'is-light'"
          @click="choice = opt"
        ) {{ opt }}
        span.ssi-other(v-if="choice === otherOption")
          b-input(
            v-model="otherMinutes"
            type="number"
            size="is-small"
            :min="minutes.min"
            :max="minutes.max"
            @keyup.native.enter="confirm"
          )
          span {{ $t('strategyPlanner.timing.min') }}

      b-input.ssi-text(
        v-else-if="currentQuestion.kind === 'text'"
        v-model="draft"
        maxlength="500"
        :has-counter="false"
        @keyup.native.enter="confirm"
      )

      b-button.ssi-confirm(
        type="is-primary"
        size="is-small"
        :disabled="!pendingAnswer"
        @click="confirm"
      ) {{ currentQuestion.kind === 'text' ? $t('input.send') : $t('advisor.confirmSelection') }}

  .ssi-go
    b-button(
      v-if="complete"
      type="is-primary"
      size="is-small"
      @click="submit"
    ) {{ $t('strategyPlanner.menu.intakeSuggest') }}
    b-button(
      size="is-small"
      type="is-light"
      @click="dismiss"
    ) {{ $t('strategyPlanner.menu.intakeSkip') }}
</template>

<script>
import growthFundamentals from '~/data/growth-fundamentals.json'
import staircaseMixin from '~/mixins/staircaseMixin'
import { SESSION_LENGTH_OPTIONS, OTHER } from '~/utils/sessionLengths'

/**
 * StrategySuggestIntake — the guided questions the Strategy Planner asks when "Suggest for
 * this client" finds no saved conversation to read. Item 15.31; approved artefact
 * `design/mockups/strategy-suggest-intake.html` (Mike, 2026-09-30).
 *
 * It collects answers and hands them up; it never calls the backend itself. The questions,
 * their order and their wording come from `GET /api/strategy/suggest/questions`, which reads
 * the Virtual Advisor's own — this component invents none of them.
 *
 * The drawing's revision of 2026-10-03 (approved to build from) puts the client's challenge
 * and the planning domains first; the domains question is the one multi-pick here.
 *
 * ⚠ A DEVIATION FROM THE DRAWING, AND WHY: the drawing's Screen 1 shows all six questions at
 * once. Mike ruled that out the same day ("guided assistance - not a survey"), and said a
 * redraw was not required. This is the build of his ruling, not of that panel.
 */
export default {
  name: 'StrategySuggestIntake',

  mixins: [staircaseMixin],

  props: {
    /**
     * `[{ field, kind, text }]` in the order they are asked. `kind` is one of the five below;
     * a `planningDomains` question also carries `lead` and `options: [{ id, name, description }]`.
     */
    questions: {
      type: Array,
      required: true,
      validator: qs => qs.every(q => q && q.field && ['text', 'planningDomains', 'growthStage', 'staircase', 'sessionLength'].includes(q.kind))
    },

    /** `{ min, max }` — the typed "Other" length the backend will accept. */
    minutes: { type: Object, default: () => ({ min: 29, max: 480 }) },

    /** Answers already given — the advisor reopening them after a suggestion. */
    initialAnswers: { type: Object, default: () => ({}) }
  },

  data () {
    const answers = {}
    this.questions.forEach((q) => {
      const a = this.initialAnswers && this.initialAnswers[q.field]
      if (typeof a === 'string' && a.trim()) { answers[q.field] = a }
    })
    return {
      answers,
      current: 0,
      draft: '',
      choice: '',
      picks: [],
      otherMinutes: '',
      growthStages: growthFundamentals.stages,
      lengthOptions: SESSION_LENGTH_OPTIONS,
      otherOption: OTHER
    }
  },

  computed: {
    /** @returns {Object|null} the question being asked now, or null once all are answered */
    currentQuestion () {
      return this.current < this.questions.length ? this.questions[this.current] : null
    },

    /** @returns {Array<Object>} every answered question above the current one */
    answeredBefore () {
      return this.questions.slice(0, this.current).filter(q => this.answers[q.field])
    },

    /** @returns {boolean} every question has an answer */
    complete () {
      return this.questions.length > 0 && this.questions.every(q => this.answers[q.field])
    },

    /**
     * What confirming would record now, or '' when nothing usable is entered.
     * @returns {string}
     */
    pendingAnswer () {
      const q = this.currentQuestion
      if (!q) { return '' }
      if (q.kind === 'text') { return this.draft.trim() }
      // More than one may be picked (decision F); carried as ids in one string, in the
      // domains' own order, which is the shape the backend and the session store keep.
      if (q.kind === 'planningDomains') {
        return (q.options || []).filter(o => this.picks.includes(o.id)).map(o => o.id).join(',')
      }
      if (q.kind !== 'sessionLength' || this.choice !== OTHER) { return this.choice }
      const n = Number(this.otherMinutes)
      return Number.isInteger(n) && n >= this.minutes.min && n <= this.minutes.max ? n + ' mins' : ''
    }
  },

  created () {
    // Reopened with every answer already in place: nothing is being asked, so start past the
    // end and let the advisor press any answer to change it.
    this.current = this.firstUnanswered()
    this.prefill()
  },

  methods: {
    /** @returns {number} index of the first unanswered question, or the length when none */
    firstUnanswered () {
      const i = this.questions.findIndex(q => !this.answers[q.field])
      return i === -1 ? this.questions.length : i
    },

    /** Put the current question's saved answer back into its control. */
    prefill () {
      const q = this.currentQuestion
      const saved = q ? (this.answers[q.field] || '') : ''
      this.draft = q && q.kind === 'text' ? saved : ''
      this.choice = ''
      this.picks = q && q.kind === 'planningDomains' && saved ? saved.split(',') : []
      this.otherMinutes = ''
      if (!q || q.kind === 'text' || q.kind === 'planningDomains' || !saved) { return }
      if (q.kind === 'sessionLength' && !SESSION_LENGTH_OPTIONS.includes(saved)) {
        this.choice = OTHER
        this.otherMinutes = String(parseInt(saved, 10) || '')
        return
      }
      this.choice = saved
    },

    /**
     * An answer as the advisor reads it — the planning domains by name, never by id.
     * @param {Object} q - one of `questions`
     * @returns {string}
     */
    answerText (q) {
      const a = this.answers[q.field] || ''
      if (q.kind !== 'planningDomains') { return a }
      const ids = a.split(',')
      return (q.options || []).filter(o => ids.includes(o.id)).map(o => o.name).join(', ')
    },

    /** Record the current answer and reveal the next unanswered question. */
    confirm () {
      const q = this.currentQuestion
      const value = this.pendingAnswer
      if (!q || !value) { return }
      this.$set(this.answers, q.field, value)
      this.current = this.firstUnanswered()
      this.prefill()
    },

    /**
     * Open an answered question again. The questions after it stay answered; confirming
     * returns to the first one still unanswered, which is the end when all are.
     * @param {number} i - index into `answeredBefore`, which runs in question order
     */
    edit (i) {
      const q = this.answeredBefore[i]
      this.current = this.questions.indexOf(q)
      this.prefill()
    },

    submit () {
      if (!this.complete) { return }
      // Payload: `{ [field]: string }` — one answer for every question, in the backend's fields.
      this.$emit('submit', Object.assign({}, this.answers))
    },

    dismiss () {
      // No payload: the advisor chose to tick the concepts themselves.
      this.$emit('dismiss')
    }
  }
}
</script>

<style scoped>
.ssi { border-bottom: 1px solid #d5e1ee; background: #fbfdff; padding: 1rem 1.1rem 1.1rem; }
.ssi-head { font-weight: 700; margin: 0 0 0.2rem; }
.ssi-intro { font-size: 0.8rem; color: #5b6f8a; margin: 0 0 0.8rem; max-width: 90ch; }
.ssi-list { list-style: none; margin: 0; padding: 0; }
.ssi-done { border-top: 1px solid #e3ebf4; }
.ssi-done:first-child { border-top: 0; }
.ssi-done-btn {
  display: block; width: 100%; text-align: left; background: none; border: 0;
  padding: 0.45rem 0; cursor: pointer; font: inherit; color: inherit;
}
.ssi-done-btn:hover .ssi-a { text-decoration: underline; }
.ssi-q { display: block; font-size: 0.78rem; color: #5b6f8a; }
.ssi-q.is-current { font-size: 0.85rem; font-weight: 600; color: #002b64; margin: 0 0 0.45rem; }
.ssi-a { display: block; font-size: 0.85rem; font-weight: 600; }
.ssi-now { border-top: 1px solid #e3ebf4; padding: 0.7rem 0 0.2rem; }
.ssi-now:first-child { border-top: 0; }
.ssi-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.4rem; margin-bottom: 0.5rem; }
.ssi-opt {
  display: flex; gap: 0.45rem; align-items: flex-start; border: 1px solid #d5e1ee; border-radius: 8px;
  padding: 0.45rem 0.55rem; background: #fff; font-size: 0.78rem; cursor: pointer;
}
.ssi-opt.is-on { border-color: #0070c0; background: #eef7ff; }
.ssi-opt-body b { display: block; font-size: 0.8rem; }
.ssi-lengths { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.5rem; }
.ssi-other { display: inline-flex; gap: 0.35rem; align-items: center; }
.ssi-other .control { width: 6rem; }
.ssi-text { margin-bottom: 0.5rem; }
.ssi-go { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; }
</style>

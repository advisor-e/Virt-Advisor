<template lang="pug">
.swd
  .swd-head
    b {{ statement.name }}

  .swd-body
    //- Build detail 16: a statement nobody spoke about shows no questions, only this.
    p.swd-nothing(v-if="statement.empty") {{ $t('strategyPlanner.wordsmith.draft.nothingSaid', { name: statement.name }) }}

    template(v-else-if="!statement.draft")
      b-message(type="is-danger" size="is-small") {{ $t('strategyPlanner.wordsmith.failed') }}
      b-button(size="is-small" outlined type="is-primary" :loading="busy" @click="writeAgain") {{ $t('strategyPlanner.wordsmith.buttons.again') }}

    template(v-else)
      b-input(v-if="editing" v-model="words" type="textarea" rows="3" maxlength="2000")
      p.swd-words(v-else) {{ words }}
      p.swd-why(v-if="statement.draft.why")
        b {{ $t('strategyPlanner.wordsmith.draft.why') }}
        |  {{ statement.draft.why }}

      details.swd-said(v-if="clientQuotes.length")
        summary {{ $tc('strategyPlanner.wordsmith.draft.said', clientQuotes.length, { n: clientQuotes.length }) }}
        blockquote(v-for="(q, i) in clientQuotes" :key="i") {{ q.text }}

      //- The code's own checks, shown, never hidden (step 5).
      .swd-flag(v-for="(f, i) in flags" :key="'f' + i")
        b {{ f }}
        template(v-if="statement.draft && checksStillFail")
          |  {{ $t('strategyPlanner.wordsmith.draft.checkStill') }}

      //- Decision C: the room's typed answer is written in as the client's own words.
      .swd-room(v-for="q in statement.questions" :key="q.elementId")
        b {{ $t('strategyPlanner.wordsmith.draft.roomQuestion') }}
        |  {{ q.question }}
        b-input.mt-1(v-model="answers[q.elementId]" size="is-small" maxlength="300" :placeholder="$t('strategyPlanner.wordsmith.draft.roomPlaceholder')")
        b-button.mt-1(size="is-small" outlined type="is-primary" :disabled="!hasAnswer" :loading="busy" @click="writeAgainWithAnswers") {{ $t('strategyPlanner.wordsmith.buttons.againWithAnswer') }}

      //- Decision D: nothing goes in the box until the client agrees.
      b-checkbox.mt-2(v-model="clientAgrees") {{ $t('strategyPlanner.wordsmith.clientAgrees') }}

      //- Build detail 15: replacing different words already in the box is asked first.
      .swd-replace(v-if="confirming")
        span {{ $t('strategyPlanner.wordsmith.replace', { name: statement.name }) }}
        b-button(size="is-small" type="is-primary" :loading="busy" @click="use") {{ $t('strategyPlanner.wordsmith.buttons.replace') }}
        b-button(size="is-small" @click="confirming = false") {{ $t('strategyPlanner.wordsmith.buttons.cancel') }}
      .buttons.are-small.mt-2(v-else)
        b-button(type="is-primary" :disabled="!clientAgrees || !words.trim()" :loading="busy" @click="askToUse") {{ $t('strategyPlanner.wordsmith.buttons.use') }}
        b-button(@click="editing = !editing") {{ $t('strategyPlanner.wordsmith.buttons.edit') }}
        b-button(:loading="busy" @click="writeAgain") {{ $t('strategyPlanner.wordsmith.buttons.again') }}
</template>

<script>
/**
 * StrategyWordsmithDraft — one statement Wordsmith wrote, for the advisor and client to read,
 * correct and agree to. Item 15.14, screen 3 of `design/mockups/wordsmith-screens.html`, approved
 * 2026-09-29 with its wording, decisions C and D and build details 8, 10, 15 and 16.
 *
 * The server decides every rule; this card only mirrors them — "Use this wording" is disabled
 * until the client's tick, as the server refuses without it.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
export default {
  name: 'StrategyWordsmithDraft',

  props: {
    /** One statement from the run's result: `{name, empty, quotes, questions, draft, checks, error}`. */
    statement: {
      type: Object,
      required: true,
      validator: s => s && typeof s.name === 'string' && Array.isArray(s.quotes)
    },
    /** What the statement's box holds now, to ask before replacing different words. */
    boxValue: { type: String, default: '' },
    busy: { type: Boolean, default: false }
  },

  data () {
    return {
      words: (this.statement.draft && this.statement.draft.text) || '',
      editing: false,
      clientAgrees: false,
      answers: {},
      confirming: false
    }
  },

  computed: {
    /** What the client said — the room's typed answers are shown under their questions instead. */
    clientQuotes () {
      return this.statement.quotes.filter(q => !q.room)
    },

    hasAnswer () {
      return Object.keys(this.answers).some(k => String(this.answers[k] || '').trim())
    },

    /** The draft failed the checks after its one retry. */
    checksStillFail () {
      return Boolean(this.statement.checks && !this.statement.checks.passed)
    },

    /** The code's findings in the approved words (build detail 8). */
    flags () {
      const issues = (this.statement.checks && this.statement.checks.issues) || []
      return issues.map(i => this.flagOf(i)).filter(Boolean)
    }
  },

  watch: {
    /** A rewrite replaces the card's words and clears the tick: agreement was to other words. */
    statement () {
      this.words = (this.statement.draft && this.statement.draft.text) || ''
      this.clientAgrees = false
      this.editing = false
      this.confirming = false
    },

    /** Editing the words clears the tick, as an edit clears a summary's approval. */
    words (now, before) {
      if (before !== undefined && this.statement.draft && now !== this.statement.draft.text) { this.clientAgrees = false }
    }
  },

  methods: {
    /**
     * @param {{code: string, detail: string}} issue
     * @returns {string|null}
     */
    flagOf (issue) {
      const t = (key, params) => this.$t('strategyPlanner.wordsmith.draft.' + key, params)
      if (issue.code === 'invented-name') { return t('check', { words: issue.detail }) }
      if (issue.code === 'invented-number') { return t('checkNumber', { number: issue.detail }) }
      if (issue.code === 'american-spelling') {
        const [word, nz] = String(issue.detail).split('→').map(s => s.trim())
        return t('checkSpelling', { word, nz })
      }
      if (issue.code === 'too-long') {
        const m = /(\d+) words, limit (\d+)/.exec(String(issue.detail)) || []
        return t('checkLength', { n: m[1], max: m[2] })
      }
      return null
    },

    writeAgain () {
      // Payload: { statement, answers: [] } — write this statement once more.
      this.$emit('write-again', { statement: this.statement.name, answers: [] })
    },

    writeAgainWithAnswers () {
      const answers = Object.keys(this.answers)
        .filter(k => String(this.answers[k] || '').trim())
        .map(k => ({ elementId: k, text: this.answers[k] }))
      // Payload: { statement, answers: [{elementId, text}] } — the room's answers, as the client's words.
      this.$emit('write-again', { statement: this.statement.name, answers })
    },

    askToUse () {
      const inBox = this.boxValue.trim()
      if (inBox && inBox !== this.words.trim()) { this.confirming = true; return }
      this.use()
    },

    use () {
      this.confirming = false
      // Payload: { statement, text } — put these agreed words in the statement's box.
      this.$emit('use', { statement: this.statement.name, text: this.words })
    }
  }
}
</script>

<style scoped>
.swd { border: 1px solid #d5e1ee; border-radius: 9px; overflow: hidden; }
.swd-head { background: #f1f6fb; padding: 0.4rem 0.75rem; color: #002b64; }
.swd-body { padding: 0.6rem 0.75rem; display: grid; gap: 0.5rem; font-size: 0.88rem; }
.swd-words { border: 1px solid #d5e1ee; border-radius: 6px; padding: 0.5rem 0.65rem; color: #002b64; }
.swd-why { font-size: 0.8rem; color: #6b7f99; }
.swd-said summary { color: #0070c0; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
.swd-said blockquote { margin: 0.35rem 0 0; padding: 0.35rem 0.6rem; border-left: 3px solid #d5e1ee; font-size: 0.8rem; }
.swd-flag { border-left: 3px solid #b36b00; background: #fffbeb; padding: 0.35rem 0.6rem; border-radius: 0 6px 6px 0; font-size: 0.8rem; }
.swd-flag b { color: #b36b00; font-weight: 600; }
.swd-room { border: 1px dashed #b36b00; background: #fffbeb; border-radius: 7px; padding: 0.5rem 0.65rem; font-size: 0.85rem; }
.swd-room > b { color: #b36b00; }
.swd-nothing { color: #6b7f99; font-style: italic; }
.swd-replace { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
</style>

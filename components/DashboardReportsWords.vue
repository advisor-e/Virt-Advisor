<template lang="pug">
.drw-layout
  aside.drw-card
    .drw-group
      .drw-glabel
        span.drw-dot
        h2.drw-h2 {{ $t('report.dashboardReports.words.execTitle') }}
      b-field(:label="$t('report.dashboardReports.words.summary')")
        b-input(:value="words.summary" :maxlength="maxText" :has-counter="false" @input="v => change('summary', v)")
      b-field(:label="$t('report.dashboardReports.words.wentWell')")
        b-input(:value="words.wentWell[0]" :maxlength="maxText" :has-counter="false" @input="v => changeList('wentWell', 0, v)")
      b-field
        b-input(:value="words.wentWell[1]" :maxlength="maxText" :has-counter="false" @input="v => changeList('wentWell', 1, v)")
      b-field(:label="$t('report.dashboardReports.words.watch')")
        b-input(:value="words.watch[0]" :maxlength="maxText" :has-counter="false" @input="v => changeList('watch', 0, v)")
      b-field
        b-input(:value="words.watch[1]" :maxlength="maxText" :has-counter="false" @input="v => changeList('watch', 1, v)")
    .drw-group
      .drw-glabel
        span.drw-dot
        h2.drw-h2 {{ $t('report.dashboardReports.words.insightTitle') }}
      b-field(:label="$t('report.dashboardReports.words.profitInsight')")
        b-input(type="textarea" rows="2" :value="words.profitInsight" :maxlength="maxText" @input="v => change('profitInsight', v)")
      b-field(:label="$t('report.dashboardReports.words.cashWatch')")
        b-input(type="textarea" rows="2" :value="words.cashWatch" :maxlength="maxText" @input="v => change('cashWatch', v)")
  .drw-results
    .drw-card
      .drw-group
        .drw-glabel
          span.drw-dot
          h2.drw-h2 {{ $t('report.dashboardReports.words.stepsTitle') }}
        template(v-for="(s, i) in words.steps")
          b-field(:key="'t' + i" :label="$t('report.dashboardReports.words.stepTitle', { n: i + 1 })")
            b-input(:value="s.title" :maxlength="maxText" :has-counter="false" @input="v => changeStep(i, 'title', v)")
          b-field(:key="'b' + i" :label="$t('report.dashboardReports.words.stepBody')")
            b-input(type="textarea" rows="2" :value="s.body" :maxlength="maxText" @input="v => changeStep(i, 'body', v)")
        b-field(:label="$t('report.dashboardReports.words.nextReview')")
          b-input(:value="words.nextReview" :maxlength="maxText" :has-counter="false" @input="v => change('nextReview', v)")
    .drw-edu
      .drw-edu-h {{ $t('report.dashboardReports.words.figuresTitle') }}
      p
        | {{ $t('report.dashboardReports.words.figuresNote') }}
        |
        provenance-badge(source="entered" size="sm" file-label="" :entered-label="$t('report.dashboardReports.doc.writtenBy')")
    .drw-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.words.continue') }}
</template>

<script>
/**
 * DashboardReportsWords — step 4 of the Business Performance Report: the advisor's own
 * words (item 4.70; the drawing's step 4). The one-line summary, what went well, what to
 * watch, the profit insight, the cash watch-point, three next steps and the next review.
 *
 * Every line is capped at the saved-report store's 200 characters, so a report that reads
 * well on screen can always be saved. Next steps are advisor-written in this build; an AI
 * draft is a later stage with its own privacy ruling (Brief §3, ruling 4).
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
const { MAX_TEXT } = require('~/utils/dashboardReportsSavedShape')

export default {
  name: 'DashboardReportsWords',

  components: { ProvenanceBadge },

  props: {
    /** `{ summary, wentWell[2], watch[2], profitInsight, cashWatch, steps[3]{title, body}, nextReview }` */
    words: { type: Object, required: true }
  },

  data () {
    return { maxText: MAX_TEXT }
  },

  methods: {
    /** @param {string} key @param {string} value */
    change (key, value) {
      // change: the whole words object with one field replaced
      this.$emit('change', Object.assign({}, this.words, { [key]: value }))
    },
    /** @param {string} key @param {number} i @param {string} value */
    changeList (key, i, value) {
      const list = this.words[key].slice()
      list[i] = value
      // change: the whole words object with one list entry replaced
      this.$emit('change', Object.assign({}, this.words, { [key]: list }))
    },
    /** @param {number} i @param {string} field @param {string} value */
    changeStep (i, field, value) {
      const steps = this.words.steps.map((s, n) => (n === i ? Object.assign({}, s, { [field]: value }) : s))
      // change: the whole words object with one next step replaced
      this.$emit('change', Object.assign({}, this.words, { steps }))
    }
  }
}
</script>

<style scoped>
.drw-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .drw-layout { grid-template-columns: 1fr; } }
.drw-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.drw-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.drw-group:last-child { border-bottom: 0; }
.drw-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.drw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.drw-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.drw-results { display: flex; flex-direction: column; gap: 16px; }
.drw-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.drw-edu-h { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.drw-edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.drw-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
</style>

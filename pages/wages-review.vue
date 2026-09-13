<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.wagesReview.eyebrowClass')"
    :title="$t('report.wagesReview.title')"
    :client="$t('report.preparedFor')"
  )
  .steps
    .step(:class="{ active: step === 1, done: step > 1 }" @click="goTo(1)")
      span.n 1
      | {{ $t('report.wagesReview.step1') }}
    .step.pending
      span.n 2
      | {{ $t('report.wagesReview.step2') }}
    .step.pending
      span.n 3
      | {{ $t('report.wagesReview.step3') }}
    .step.pending
      span.n 4
      | {{ $t('report.wagesReview.step4') }}
    .step.pending
      span.n 5
      | {{ $t('report.wagesReview.step5') }}

  wages-team(:restore="team" @confirmed="onTeamConfirmed")

  //- Steps 2-5 are not built. Saying so on the screen is the honest alternative to a
  //- Continue button that appears to do nothing.
  .wr-pending(v-if="team")
    | {{ $t('report.wagesReview.stepsPending') }}
</template>

<script>
/**
 * /wages-review page — the Wages/Salary Review (item 4.100).
 *
 * Stepped flow per Mike's decision 9 of 2026-09-14, ruled as recommended: the team →
 * how the work happens → the year ahead → what actually happened → the report. The
 * order follows the workbook's own dependency chain rather than a guess — the Annual
 * Hiring Plan reads the two input sheets 4,306 times, so each step asks only for what
 * the one before it established.
 *
 * 🔴 ONLY STEP 1 IS BUILT. Steps 2-5 have chips and no screens; their chips are inert
 * rather than hidden, so the shape of the work is visible and nobody builds the report
 * first. That order is the drawing's own warning: the numbers on the report are
 * worthless until the inputs behind them are the client's, and a screen showing the
 * sample company's figures is how a demo becomes a wrong answer in front of a client.
 *
 * NOT IN THE MODEL LIBRARY YET, deliberately. The catalogue row waits until the five
 * steps and the report exist — the frame guard reads ready routes, and a card that
 * opens onto one fifth of a model is a promise the screen cannot keep.
 *
 * No saving per client yet (item 4.62's mechanism): with four steps missing there is
 * no complete set of figures to save.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import ReportShell from '~/components/base/ReportShell.vue'
import WagesTeam from '~/components/WagesTeam.vue'

export default {
  name: 'WagesReviewPage',

  components: { ReportShell, ReportHeader, WagesTeam },

  data () {
    return {
      step: 1,
      /** Step 1's confirmed payload; null until the advisor presses Continue. */
      team: null
    }
  },

  methods: {
    /**
     * Stepper navigation. Only step 1 exists, so this is the seam the later steps
     * plug into rather than working navigation today.
     * @param {number} n the step to move to
     */
    goTo (n) {
      if (n === this.step || n > 1) { return }
      this.step = n
    },

    /**
     * The team screen hands over its confirmed figures.
     * @param {object} payload { people: [...] } in the shape `computeWages` reads
     */
    onTeamConfirmed (payload) {
      this.team = payload
    }
  }
}
</script>

<style scoped>
/* The chips are the Loan Estimator's, token for token — the house stepper (owner
   ruling 2026-07-22: every model in this section looks the same). `.pending` is the
   one addition: a step that has no screen yet, dimmed and not clickable. */
.report-shell ::v-deep .rs-top { margin-bottom: 16px; }
.steps { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 16px; }
.step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--rs-muted);
  background: var(--rs-panel); border: 1px solid var(--rs-line); border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line); color: var(--rs-ink); font-size: 11px;
}
.step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.step.done { color: var(--rs-good); }
.step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }
.step.pending { opacity: 0.5; cursor: default; }
.wr-pending { font-size: 12px; color: var(--rs-muted); margin-top: 12px; }
@media print { .steps, .wr-pending { display: none !important; } }
</style>

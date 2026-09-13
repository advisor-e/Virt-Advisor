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
    .step(:class="{ active: step === 2, done: step > 2, pending: !team }" @click="goTo(2)")
      span.n 2
      | {{ $t('report.wagesReview.step2') }}
    .step(:class="{ active: step === 3, done: step > 3, pending: !work }" @click="goTo(3)")
      span.n 3
      | {{ $t('report.wagesReview.step3') }}
    .step(:class="{ active: step === 4, done: step > 4, pending: !year }" @click="goTo(4)")
      span.n 4
      | {{ $t('report.wagesReview.step4') }}
    .step.pending
      span.n 5
      | {{ $t('report.wagesReview.step5') }}

  wages-team(v-if="step === 1" :restore="team" @confirmed="onTeamConfirmed")
  wages-work(v-else-if="step === 2" :restore="work" @confirmed="onWorkConfirmed" @back="step = 1")
  wages-year(
    v-else-if="step === 3"
    :people="team ? team.people : []"
    :season-names="work ? work.seasonNames : null"
    :restore="year"
    @confirmed="onYearConfirmed"
    @back="step = 2"
  )
  wages-actual(
    v-else
    :months="year ? year.months : []"
    :restore="actual"
    @confirmed="onActualConfirmed"
    @back="step = 3"
  )

  //- Step 5, the report itself, is not built. Saying so on the screen is the honest
  //- alternative to a Continue button that appears to do nothing.
  .wr-pending(v-if="actual")
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
 * 🔴 STEPS 1-4 ARE BUILT. Step 5, the report, has a chip and no screen; its chip is inert
 * rather than hidden, so the shape of the work is visible and nobody builds the report
 * first. That order is the drawing's own warning: the numbers on the report are
 * worthless until the inputs behind them are the client's, and a screen showing the
 * sample company's figures is how a demo becomes a wrong answer in front of a client.
 *
 * Each step is handed what the ones before it settled — step 3 takes the team from step 1
 * and the season names from step 2 — which is the dependency chain decision 9 counted
 * rather than assumed.
 *
 * NOT IN THE MODEL LIBRARY YET, deliberately. The catalogue row waits until the five
 * steps and the report exist — the frame guard reads ready routes, and a card that
 * opens onto one fifth of a model is a promise the screen cannot keep.
 *
 * No saving per client yet (item 4.62's mechanism): the four input steps now hold a
 * complete set of figures, so this becomes worth doing once the report exists to save
 * them alongside.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import ReportShell from '~/components/base/ReportShell.vue'
import WagesTeam from '~/components/WagesTeam.vue'
import WagesWork from '~/components/WagesWork.vue'
import WagesYear from '~/components/WagesYear.vue'
import WagesActual from '~/components/WagesActual.vue'

export default {
  name: 'WagesReviewPage',

  components: { ReportShell, ReportHeader, WagesTeam, WagesWork, WagesYear, WagesActual },

  data () {
    return {
      step: 1,
      /** Step 1's confirmed payload; null until the advisor presses Continue. */
      team: null,
      /** Step 2's confirmed payload; null until the advisor presses Continue. */
      work: null,
      /** Step 3's confirmed payload; null until the advisor presses Continue. */
      year: null,
      /** Step 4's confirmed payload; null until the advisor presses Continue. */
      actual: null
    }
  },

  methods: {
    /**
     * Stepper navigation. Backwards always; forward only when the step being left has
     * been confirmed, the same rule as the Loan Estimator. Step 5, the report, does not
     * exist yet, so nothing above 4 is reachable.
     * @param {number} n the step to move to
     */
    goTo (n) {
      if (n === this.step || n > 4) { return }
      if (n > this.step) {
        if (n === 2 && !this.team) { return }
        if (n === 3 && !(this.team && this.work)) { return }
        if (n === 4 && !(this.team && this.work && this.year)) { return }
      }
      this.step = n
    },

    /**
     * The team screen hands over its confirmed figures; how the work happens is next.
     * @param {object} payload { people: [...] } in the shape `computeWages` reads
     */
    onTeamConfirmed (payload) {
      this.team = payload
      this.step = 2
    },

    /**
     * The work screen hands over the basis, the season names and the settings.
     * @param {object} payload { basis, seasonNames, settings }
     */
    onWorkConfirmed (payload) {
      this.work = payload
      this.step = 3
    },

    /**
     * The year screen hands over the months and the people carrying their hiring plan.
     * @param {object} payload { months, people }
     */
    onYearConfirmed (payload) {
      this.year = payload
      this.step = 4
    },

    /**
     * The actuals screen hands the twelve months back carrying `actualMargin`.
     * @param {object} payload { months }
     */
    onActualConfirmed (payload) {
      this.actual = payload
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

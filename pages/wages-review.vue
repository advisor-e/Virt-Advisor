<template lang="pug">
report-shell
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.wagesReview.eyebrowClass')"
    :title="$t('report.wagesReview.title')"
    :client="$t('report.preparedFor')"
    @client-change="onClientChange"
  )
  //- The staff register's gate (Decision 6). Above the steps and not one of them: the
  //- register is a due-diligence document about people, not a step in the labour-margin
  //- model, and Decision 9 ruled the model at five steps. It renders nothing at all until
  //- a client is chosen and the backend has answered.
  wages-register-gate(:client-id="clientId")
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
    .step(:class="{ active: step === 5, pending: !actual }" @click="goTo(5)")
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
    v-else-if="step === 4"
    :months="year ? year.months : []"
    :restore="actual"
    @confirmed="onActualConfirmed"
    @back="step = 3"
  )
  wages-report(v-else :inputs="engineInputs" :using-sample="true" @back="step = 4")
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
 * ALL FIVE STEPS ARE BUILT. The report was built LAST, which is the drawing's own
 * warning: the numbers on it are worthless until the inputs behind them are the client's,
 * and a screen showing the sample company's figures is how a demo becomes a wrong answer
 * in front of a real client.
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
import WagesReport from '~/components/WagesReport.vue'
import WagesRegisterGate from '~/components/WagesRegisterGate.vue'

export default {
  name: 'WagesReviewPage',

  components: { ReportShell, ReportHeader, WagesTeam, WagesWork, WagesYear, WagesActual, WagesReport, WagesRegisterGate },

  data () {
    return {
      step: 1,
      /**
       * The client the header's picker chose. '' until an advisor picks one — and while it
       * is '' the staff register's gate renders nothing, because a register belongs to a
       * client rather than to this screen.
       */
      clientId: '',
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

  computed: {
    /**
     * The four steps assembled into the payload `computeWages` reads. This page is the
     * only place the steps meet, so it is the only place that can build it.
     *
     * The PEOPLE come from step 3, not step 1: step 3 takes step 1's people and adds each
     * one's hiring plan, so its copy is the complete one. The MONTHS come from step 4 for
     * the same reason — step 3 settled what each month is, step 4 added what happened.
     *
     * Null until every step has been confirmed; the report shows nothing rather than
     * recomputing against half a model.
     * @returns {Object|null}
     */
    engineInputs () {
      if (!(this.team && this.work && this.year && this.actual)) { return null }
      return {
        basis: this.work.basis,
        seasonNames: this.work.seasonNames,
        settings: this.work.settings,
        allowances: this.team.allowances,
        people: this.year.people,
        months: this.actual.months
      }
    }
  },

  methods: {
    /**
     * The header's picker chose the client this report is for. The five steps do not read
     * it — they are the workbook's own figures and belong to no client until item 4.62's
     * saving reaches this model — but the staff register's gate is a property of the
     * client's case, so it is the one thing on this page that needs to know.
     * @param {{clientId: string, clientName: string}} payload
     */
    onClientChange (payload) {
      this.clientId = (payload && payload.clientId) || ''
    },

    /**
     * Stepper navigation. Backwards always; forward only when the step being left has
     * been confirmed, the same rule as the Loan Estimator. The report is reachable only
     * once every input step has been confirmed.
     * @param {number} n the step to move to
     */
    goTo (n) {
      if (n === this.step || n > 5) { return }
      if (n > this.step) {
        if (n === 2 && !this.team) { return }
        if (n === 3 && !(this.team && this.work)) { return }
        if (n === 4 && !(this.team && this.work && this.year)) { return }
        if (n === 5 && !this.engineInputs) { return }
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
      this.step = 5
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
@media print { .steps { display: none !important; } }
</style>

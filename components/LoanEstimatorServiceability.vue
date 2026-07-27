<template lang="pug">
.lesv-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  //- The section's signature dark headline strip — live display-only running
  //- totals so step 2 opens looking like every other model in the library.
  hero-strip(:columns="3")
    hero-figure(:label="$t('report.loanEstimator.serviceability.totalGross')" :value="money(grossIncomeTotal)")
    hero-figure(:label="$t('report.loanEstimator.serviceability.totalBalances')" :value="money(loanBalanceTotal)")
    hero-figure(:label="$t('report.loanEstimator.serviceability.totalWeeklyLiving')" :value="money(weeklyLivingTotal)")

  .lesv-card
    h3.lesv-title {{ $t('report.loanEstimator.serviceability.householdTitle') }}
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.jointApplication') }}
      b-select(v-model="joint" size="is-small")
        option(value="Yes") {{ $t('report.loanEstimator.serviceability.yes') }}
        option(value="No") {{ $t('report.loanEstimator.serviceability.no') }}
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.dependantsUnder18') }}
      b-input(v-model.number="household.dependantsUnder18" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.dependantsOver18') }}
      b-input(v-model.number="household.dependantsOver18" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.numberOfVehicles') }}
      b-input(v-model.number="household.numberOfVehicles" type="number" step="any" size="is-small")

  .lesv-card
    h3.lesv-title {{ $t('report.loanEstimator.serviceability.loansTitle') }}
    .lesv-grid
      .lesv-row.lesv-head
        span.lesv-label
        span {{ $t('report.loanEstimator.serviceability.loanCol.balance') }}
        span {{ $t('report.loanEstimator.serviceability.loanCol.actualRate') }}
        span {{ $t('report.loanEstimator.serviceability.loanCol.assessmentTerm') }}
        span {{ $t('report.loanEstimator.serviceability.loanCol.actualTerm') }}
      .lesv-row(v-for="key in loanKeys" :key="key")
        span.lesv-label {{ $t('report.loanEstimator.serviceability.loanRow.' + key) }}
        b-input(v-model.number="loans[key].balance" type="number" step="any" size="is-small")
        b-input(v-model.number="loans[key].ratePct" type="number" step="any" size="is-small")
        b-input(v-model.number="loans[key].assessmentTermYears" type="number" step="any" size="is-small")
        b-input(v-model.number="loans[key].actualTermYears" type="number" step="any" size="is-small")
    //- Advisor-only lever: added to the property/revolving loan rates for the
    //- serviceability assessment. The client only ever sees their own rate.
    .lesv-field.lesv-stress
      .lesv-labels
        label {{ $t('report.loanEstimator.serviceability.stressMargin') }}
        p.lesv-help {{ $t('report.loanEstimator.serviceability.stressMarginHelp') }}
      b-input(v-model.number="stressMarginPct" type="number" step="any" size="is-small")

  .lesv-card
    h3.lesv-title {{ $t('report.loanEstimator.serviceability.incomeTitle') }}
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.customer1Gross') }}
      b-input(v-model.number="income.customer1Gross" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.customer2Gross') }}
      b-input(v-model.number="income.customer2Gross" type="number" step="any" size="is-small")
    .lesv-field
      .lesv-labels
        label {{ $t('report.loanEstimator.serviceability.otherMonthly') }}
        p.lesv-help {{ $t('report.loanEstimator.serviceability.otherMonthlyHelp') }}
      b-input(v-model.number="income.otherMonthly" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.currentRental') }}
      b-input(v-model.number="income.currentRentalWeekly" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.newRental') }}
      b-input(v-model.number="income.newRentalWeekly" type="number" step="any" size="is-small")
    h4.lesv-subtitle {{ $t('report.loanEstimator.serviceability.boardersTitle') }}
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.boardersNumber') }}
      b-input(v-model.number="boarders.number" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.boardersCharge') }}
      b-input(v-model.number="boarders.weeklyCharge" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.boardersTerm') }}
      b-input(v-model.number="boarders.termWeeks" type="number" step="any" size="is-small")

  .lesv-card
    h3.lesv-title {{ $t('report.loanEstimator.serviceability.expensesTitle') }}
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.studentLoan1') }}
      .lesv-pair
        b-select(v-model="studentLoan1" size="is-small")
          option(value="Yes") {{ $t('report.loanEstimator.serviceability.yes') }}
          option(value="No") {{ $t('report.loanEstimator.serviceability.no') }}
        b-input(
          v-if="studentLoan1 === 'Yes'"
          v-model.number="studentLoan1Monthly"
          type="number" step="any" size="is-small"
          :placeholder="$t('report.loanEstimator.serviceability.monthly')"
        )
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.studentLoan2') }}
      .lesv-pair
        b-select(v-model="studentLoan2" size="is-small")
          option(value="Yes") {{ $t('report.loanEstimator.serviceability.yes') }}
          option(value="No") {{ $t('report.loanEstimator.serviceability.no') }}
        b-input(
          v-if="studentLoan2 === 'Yes'"
          v-model.number="studentLoan2Monthly"
          type="number" step="any" size="is-small"
          :placeholder="$t('report.loanEstimator.serviceability.monthly')"
        )
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.overdraftLimits') }}
      b-input(v-model.number="expenses.overdraftLimits" type="number" step="any" size="is-small")
    .lesv-field
      label {{ $t('report.loanEstimator.serviceability.creditCardLimits') }}
      b-input(v-model.number="expenses.creditCardLimits" type="number" step="any" size="is-small")
    .lesv-field
      .lesv-labels
        label {{ $t('report.loanEstimator.serviceability.rentPaid') }}
        p.lesv-help {{ $t('report.loanEstimator.serviceability.rentPaidHelp') }}
      b-input(v-model.number="expenses.rentWeekly" type="number" step="any" size="is-small")
    .lesv-field
      .lesv-labels
        label {{ $t('report.loanEstimator.serviceability.generalLiving') }}
        p.lesv-help {{ $t('report.loanEstimator.serviceability.generalLivingHelp') }}
      b-input(v-model.number="expenses.generalWeekly" type="number" step="any" size="is-small")
    .lesv-field
      .lesv-labels
        label {{ $t('report.loanEstimator.serviceability.additionalLiving') }}
        p.lesv-help {{ $t('report.loanEstimator.serviceability.additionalLivingHelp') }}
      b-input(v-model.number="expenses.additionalWeekly" type="number" step="any" size="is-small")

  .lesv-actions
    b-button(type="is-primary" @click="confirm") {{ $t('report.loanEstimator.serviceability.continue') }}
</template>

<script>
/**
 * LoanEstimatorServiceability — step 2 of the Loan Estimator: the
 * `Serviceability Input` sheet (can the household afford the repayments?).
 * Field wording is the workbook's own, approved by Mike 2026-07-23.
 *
 * Deliberate differences from the sheet:
 *   - the customer's legal name and date are NOT captured (PII rule — the
 *     calculation never needs them);
 *   - Hire Purchase is omitted (the sheet captures it but never costs it);
 *   - `country` is fixed to 'NZ' silently — the tax-band feeder supports
 *     other tables, but the workbook has no selector so neither does this;
 *   - the advisor's "Stress test margin" (ruled 2026-07-24) is a single field
 *     ADDED to the three property/revolving loan rates for the serviceability
 *     assessment. The client only ever sees their own rate; Personal Term Loans
 *     are assessed at their own rate with no margin. See the backend model note.
 *
 * Student loans mirror the sheet's E40/E41 Yes/No cells: "Yes" reveals the
 * customer's own monthly figure; "No" submits 0.
 *
 * Figures are seeded with the workbook's Ripper-household sample — the same
 * DEFAULT_SERVICEABILITY_INPUTS the backend falls back to — flagged by
 * SampleNotice until the advisor returns with confirmed figures.
 *
 * Rate fields are held as display percentages (13.95, not 0.1395) and
 * converted to decimals in the payload — the shape computeServiceability
 * expects.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import currencyMixin from '~/mixins/currencyMixin'

/** Loan rows in the sheet's own order (rows 12/14/16/20). */
const LOAN_KEYS = ['revolvingCredit', 'currentPropertyLoans', 'newPropertyLoans', 'personalTermLoans']

/**
 * The Ripper household (`Serviceability Input`), cell-for-cell the backend's
 * DEFAULT_SERVICEABILITY_INPUTS with rates in display form.
 */
function sampleFigures () {
  return {
    joint: 'Yes', //                                                                        E5
    stressMarginPct: 1.5, //  advisor stress-test margin, display percent (firm default 1.5%)
    household: { dependantsUnder18: 3, dependantsOver18: 1, numberOfVehicles: 2 }, //       E7 / L7 / L5
    loans: {
      revolvingCredit: { balance: 0, ratePct: 0, assessmentTermYears: 30, actualTermYears: 10 }, //      r12
      currentPropertyLoans: { balance: 0, ratePct: 0, assessmentTermYears: 30, actualTermYears: 25 }, // r14
      newPropertyLoans: { balance: 500000, ratePct: 5.95, assessmentTermYears: 30, actualTermYears: 25 }, // r16 (realistic client rate; see backend note)
      personalTermLoans: { balance: 0, ratePct: 13.95, assessmentTermYears: 7, actualTermYears: 5 } //   r20
    },
    income: {
      customer1Gross: 86500, //     E25
      customer2Gross: 40000, //     E27
      otherMonthly: 0, //           J29
      currentRentalWeekly: 650, //  H31
      newRentalWeekly: 550 //       H33
    },
    boarders: { number: 0, weeklyCharge: 260, termWeeks: 40 }, // E35 / G35 / H35
    studentLoan1: 'Yes', //         E40
    studentLoan1Monthly: 1002,
    studentLoan2: 'Yes', //         E41
    studentLoan2Monthly: 652,
    expenses: {
      overdraftLimits: 500, //      E43
      creditCardLimits: 7000, //    E44
      rentWeekly: 500, //           E52
      generalWeekly: 750, //        E54
      additionalWeekly: 125 //      E57
    }
  }
}

export default {
  name: 'LoanEstimatorServiceability',

  components: { SampleNotice, HeroStrip, HeroFigure },

  mixins: [currencyMixin],

  props: {
    /** A previously confirmed payload (stepping back from chip 3); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      ...sampleFigures(),
      loanKeys: LOAN_KEYS,
      // Frozen at created(): whether this entry started from the sample scenario.
      showSample: true
    }
  },

  computed: {
    // The three card footers are display-only sums of like units — no business
    // rule; the real serviceability maths runs on the backend.
    /** @returns {number} all four loan balances. */
    loanBalanceTotal () {
      return LOAN_KEYS.reduce((sum, key) => sum + (Number(this.loans[key].balance) || 0), 0)
    },
    /** @returns {number} both customers' annual gross incomes combined. */
    grossIncomeTotal () {
      return (Number(this.income.customer1Gross) || 0) + (Number(this.income.customer2Gross) || 0)
    },
    /** @returns {number} the three weekly living-cost figures combined. */
    weeklyLivingTotal () {
      return (Number(this.expenses.rentWeekly) || 0) +
        (Number(this.expenses.generalWeekly) || 0) +
        (Number(this.expenses.additionalWeekly) || 0)
    }
  },

  created () {
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /**
     * Rebuild every field from a confirmed payload, decimals back to display
     * percents (rounded to 2 dp so 0.1395 restores as 13.95, not 13.950000...01).
     * A zero student-loan figure restores as "No" — the two states submit
     * identically, so nothing is lost.
     * @param {Object} p a payload previously emitted by confirm()
     */
    applyRestore (p) {
      this.joint = p.jointApplication ? 'Yes' : 'No'
      this.stressMarginPct = Math.round((p.stressMargin || 0) * 10000) / 100 // decimal back to display percent
      this.household.dependantsUnder18 = p.dependantsUnder18
      this.household.dependantsOver18 = p.dependantsOver18
      this.household.numberOfVehicles = p.numberOfVehicles
      LOAN_KEYS.forEach((key) => {
        const src = (p.loans || {})[key]
        if (!src) { return }
        const row = this.loans[key]
        row.balance = src.balance
        row.ratePct = Math.round(src.actualRate * 10000) / 100
        row.assessmentTermYears = src.assessmentTermYears
        row.actualTermYears = src.actualTermYears
      })
      this.income.customer1Gross = p.customer1GrossIncome
      this.income.customer2Gross = p.customer2GrossIncome
      this.income.otherMonthly = p.otherMonthlyTaxPaidIncome
      this.income.currentRentalWeekly = p.currentRentalWeekly
      this.income.newRentalWeekly = p.newRentalWeekly
      if (p.boarders) {
        this.boarders.number = p.boarders.number
        this.boarders.weeklyCharge = p.boarders.weeklyCharge
        this.boarders.termWeeks = p.boarders.termWeeks
      }
      this.studentLoan1 = p.studentLoan1Monthly > 0 ? 'Yes' : 'No'
      this.studentLoan1Monthly = p.studentLoan1Monthly
      this.studentLoan2 = p.studentLoan2Monthly > 0 ? 'Yes' : 'No'
      this.studentLoan2Monthly = p.studentLoan2Monthly
      this.expenses.overdraftLimits = p.overdraftLimits
      this.expenses.creditCardLimits = p.creditCardLimits
      this.expenses.rentWeekly = p.rentPaidWeekly
      this.expenses.generalWeekly = p.generalLivingWeekly
      this.expenses.additionalWeekly = p.additionalLivingWeekly
    },

    /** @returns {Object} the model-shaped inputs block `computeServiceability` expects. */
    payload () {
      const loans = {}
      LOAN_KEYS.forEach((key) => {
        const row = this.loans[key]
        loans[key] = {
          balance: Number(row.balance) || 0,
          actualRate: (Number(row.ratePct) || 0) / 100,
          assessmentTermYears: Number(row.assessmentTermYears) || 0,
          actualTermYears: Number(row.actualTermYears) || 0
        }
      })
      return {
        country: 'NZ',
        stressMargin: (Number(this.stressMarginPct) || 0) / 100, // advisor margin, display percent → decimal
        jointApplication: this.joint === 'Yes',
        dependantsUnder18: Number(this.household.dependantsUnder18) || 0,
        dependantsOver18: Number(this.household.dependantsOver18) || 0,
        numberOfVehicles: Number(this.household.numberOfVehicles) || 0,
        customer1GrossIncome: Number(this.income.customer1Gross) || 0,
        customer2GrossIncome: Number(this.income.customer2Gross) || 0,
        otherMonthlyTaxPaidIncome: Number(this.income.otherMonthly) || 0,
        currentRentalWeekly: Number(this.income.currentRentalWeekly) || 0,
        newRentalWeekly: Number(this.income.newRentalWeekly) || 0,
        boarders: {
          number: Number(this.boarders.number) || 0,
          weeklyCharge: Number(this.boarders.weeklyCharge) || 0,
          termWeeks: Number(this.boarders.termWeeks) || 0
        },
        loans,
        studentLoan1Monthly: this.studentLoan1 === 'Yes' ? (Number(this.studentLoan1Monthly) || 0) : 0,
        studentLoan2Monthly: this.studentLoan2 === 'Yes' ? (Number(this.studentLoan2Monthly) || 0) : 0,
        overdraftLimits: Number(this.expenses.overdraftLimits) || 0,
        creditCardLimits: Number(this.expenses.creditCardLimits) || 0,
        rentPaidWeekly: Number(this.expenses.rentWeekly) || 0,
        generalLivingWeekly: Number(this.expenses.generalWeekly) || 0,
        additionalLivingWeekly: Number(this.expenses.additionalWeekly) || 0
      }
    },

    confirm () {
      // payload: model-shaped serviceability inputs, rates as decimals, country fixed 'NZ'
      this.$emit('confirmed', this.payload())
    }
  }
}
</script>

<style scoped>
/* Palette, card and dividers read the shared visual-standard tokens (ReportShell):
   every swapped value equals the token it points at — a no-change consolidation. Left
   literal on purpose: the 10px card radius and the 13px/700/.04em card title (both
   off-standard — standardised to 14px / 12px in Step 3), the field-label ink (#223a57,
   no standard token) and the zebra row stripe (#f8fbfd). */
.lesv-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-top: 3px solid var(--rs-card-top);
  border-radius: 10px; padding: var(--rs-card-pad); margin-bottom: 14px;
}
.lesv-title {
  font-size: 13px; font-weight: 700; color: var(--rs-ink);
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px;
}
.lesv-subtitle {
  font-size: 12px; font-weight: 700; color: var(--rs-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px;
}
.lesv-grid { overflow-x: auto; }
.lesv-row {
  display: grid; grid-template-columns: 220px repeat(4, minmax(110px, 1fr));
  gap: 8px; align-items: center; padding: 3px 0; min-width: 700px;
}
.lesv-row.lesv-head { background: var(--rs-panel-2); border-radius: 8px; padding: 6px 0; }
.lesv-grid .lesv-row:not(.lesv-head):nth-child(odd) { background: #f8fbfd; }
.lesv-head span { font-size: 11px; font-weight: 600; color: var(--rs-muted); }
.lesv-label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.lesv-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 3px 0;
}
.lesv-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.lesv-labels { flex: 1 1 auto; }
.lesv-help { font-size: 11px; color: var(--rs-muted); margin: 1px 0 0; }
.lesv-field .control { width: 150px; flex: 0 0 auto; }
.lesv-stress { border-top: 1px dashed var(--rs-line); margin-top: 8px; padding-top: 10px; }
.lesv-pair { display: flex; gap: 8px; }
.lesv-row .control { width: auto; }
.lesv-root .herostrip { margin-bottom: 14px; }
.lesv-actions { margin-top: 6px; text-align: right; }
</style>

<template lang="pug">
.ler-root
  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )

    .ler-verdict(:class="verdictPass ? 'is-pass' : 'is-fail'")
      h2 {{ verdictPass ? $t('report.loanEstimator.result.verdictPass') : $t('report.loanEstimator.result.verdictFail') }}
      p {{ $t('report.loanEstimator.result.verdictQualifier') }}

    hero-strip(:columns="4" :stale="!!error")
      //- Business loan front and centre (Mike's ruling 2026-07-24): when the
      //- business step is filled, its maximum loan leads the headline band and
      //- the personal maximum-borrowing figure drops into the household card.
      hero-figure(
        v-if="business"
        :label="$t('report.loanEstimator.result.hero.businessLoan')"
        :value="businessMaxLoan === null ? '—' : money(businessMaxLoan)"
        :sub="$t('report.loanEstimator.result.hero.businessLoanSub')"
      )
      hero-figure(
        :label="$t('report.loanEstimator.result.hero.surplus')"
        :value="money(data.serviceability.surplus)"
        :sub="$t('report.loanEstimator.result.hero.surplusSub')"
        :tone="verdictPass ? 'default' : 'crit'"
      )
      hero-figure(
        :label="$t('report.loanEstimator.result.hero.availableSecurity')"
        :value="money(data.securityPosition.totals.combined.availableSecurity)"
        :sub="$t('report.loanEstimator.result.hero.availableSecuritySub')"
      )
      hero-figure(
        :label="$t('report.loanEstimator.result.hero.repayment')"
        :value="money(data.repayment.monthlyRepayment)"
        :sub="$t('report.loanEstimator.result.hero.repaymentSub')"
      )
      //- App-original formula (ruled 2026-07-23): the largest new property loan
      //- these figures support — indication only, like the verdict itself. Held
      //- back from the strip when the business loan takes the fourth cell.
      hero-figure(
        v-if="!business"
        :label="$t('report.loanEstimator.result.hero.maxBorrowing')"
        :value="data.serviceability.maxAffordableNewLoan === null ? '—' : money(data.serviceability.maxAffordableNewLoan)"
        :sub="$t('report.loanEstimator.result.hero.maxBorrowingSub')"
      )

    .ler-card
      h2 {{ $t('report.loanEstimator.result.security.title') }}
      .ler-scroll
        table.ler-table
          thead
            tr
              th
              th {{ $t('report.loanEstimator.result.security.cols.value') }}
              th {{ $t('report.loanEstimator.result.security.cols.adjustedValue') }}
              th {{ $t('report.loanEstimator.result.security.cols.currentDebt') }}
              th {{ $t('report.loanEstimator.result.security.cols.equity') }}
              th {{ $t('report.loanEstimator.result.security.cols.loanLimit') }}
              th {{ $t('report.loanEstimator.result.security.cols.availableSecurity') }}
          tbody
            tr(v-for="grp in ['personal', 'commercial', 'combined']" :key="grp" :class="{ 'is-combined': grp === 'combined' }")
              td {{ $t('report.loanEstimator.result.security.rows.' + grp) }}
              td {{ money(data.securityPosition.totals[grp].value) }}
              td {{ money(data.securityPosition.totals[grp].adjustedValue) }}
              td {{ money(data.securityPosition.totals[grp].currentDebt) }}
              td {{ money(data.securityPosition.totals[grp].currentEquity) }}
              td {{ money(data.securityPosition.totals[grp].loanLimit) }}
              td {{ money(data.securityPosition.totals[grp].availableSecurity) }}

    .ler-card
      h2 {{ $t('report.loanEstimator.result.svc.title') }}
      table.ler-mini
        tr
          td {{ $t('report.loanEstimator.result.svc.income') }}
          td {{ money(data.serviceability.income.totalNetMonthly) }}
        tr
          td {{ $t('report.loanEstimator.result.svc.loanMinimums') }}
          td {{ money(data.serviceability.loanMinimums.total) }}
        tr
          td
            | {{ $t('report.loanEstimator.result.svc.expensesUsed') }}
            p.ler-note {{ $t('report.loanEstimator.result.svc.expensesUsedNote') }}
          td {{ money(expensesUsed) }}
        tr.is-total
          td {{ $t('report.loanEstimator.result.svc.surplus') }}
          td(:class="{ 'is-crit': !verdictPass }") {{ money(data.serviceability.surplus) }}
        //- Personal maximum borrowing lives here when the business loan has taken
        //- the fourth headline cell, so the figure is never lost.
        tr(v-if="business")
          td
            | {{ $t('report.loanEstimator.result.hero.maxBorrowing') }}
            p.ler-note {{ $t('report.loanEstimator.result.hero.maxBorrowingSub') }}
          td {{ data.serviceability.maxAffordableNewLoan === null ? '—' : money(data.serviceability.maxAffordableNewLoan) }}
      p.ler-note {{ $t('report.loanEstimator.result.svc.taxNote', { label: data.serviceability.taxTable.taxYearLabel }) }}

    //- Business loan block (Part E) — shown only when the advisor completed the
    //- business step; the report stays useful for a purely personal enquiry.
    .ler-card(v-if="business && data.business")
      h2 {{ $t('report.loanEstimator.result.business.title') }}
      table.ler-mini
        tr
          td {{ $t('report.loanEstimator.result.business.ratio') }}
          td {{ num(data.business.ebitToInterestRatio, 2) }}
        tr
          td {{ $t('report.loanEstimator.result.business.security') }}
          td {{ money(data.business.bankAdjustedMaxSecurity) }}
        tr.is-total
          td {{ $t('report.loanEstimator.result.business.maxLoan') }}
          td {{ businessMaxLoan === null ? '—' : money(businessMaxLoan) }}
        tr
          td {{ $t('report.loanEstimator.result.business.rate') }}
          td {{ num(data.business.loanRate * 100, 2) }}%
        tr
          td {{ $t('report.loanEstimator.result.business.term') }}
          td {{ data.business.loanTermYears }}
        tr
          td {{ $t('report.loanEstimator.result.business.monthly') }}
          td {{ money(data.business.monthlyPaymentRequired) }}
      p.ler-note {{ $t('report.loanEstimator.result.business.note') }}

    .ler-card
      h2 {{ $t('report.loanEstimator.result.calc.title') }}
      .ler-calc
        .ler-controls
          slider-field(
            :label="$t('report.loanEstimator.result.calc.purchasePrice')"
            :display="money(calc.purchasePrice)"
            :value="calc.purchasePrice"
            :min="0" :max="priceMax" :step="10000"
            @input="v => { calc.purchasePrice = v }"
          )
          slider-field(
            :label="$t('report.loanEstimator.result.calc.deposit')"
            :display="money(calc.deposit)"
            :value="calc.deposit"
            :min="0" :max="calc.purchasePrice" :step="5000"
            @input="v => { calc.deposit = v }"
          )
          slider-field(
            :label="$t('report.loanEstimator.result.calc.rate')"
            :display="num(calc.ratePct, 2) + '%'"
            :value="calc.ratePct"
            :min="0.5" :max="15" :step="0.05"
            @input="v => { calc.ratePct = v }"
          )
          slider-field(
            :label="$t('report.loanEstimator.result.calc.term')"
            :display="calc.term + ' ' + (calc.termUnit === 'Years' ? $t('report.loanEstimator.result.calc.years') : $t('report.loanEstimator.result.calc.months'))"
            :value="calc.term"
            :min="1" :max="calc.termUnit === 'Years' ? 40 : 480" :step="1"
            @input="v => { calc.term = v }"
          )
          .ler-selects
            .ler-select
              label {{ $t('report.loanEstimator.result.calc.termUnitLabel') }}
              b-select(v-model="calc.termUnit" size="is-small")
                option(value="Years") {{ $t('report.loanEstimator.result.calc.years') }}
                option(value="Months") {{ $t('report.loanEstimator.result.calc.months') }}
            .ler-select
              label {{ $t('report.loanEstimator.result.calc.basisLabel') }}
              b-select(v-model="calc.basis" size="is-small")
                option(value="Table") {{ $t('report.loanEstimator.result.calc.basisTable') }}
                option(value="Reducing") {{ $t('report.loanEstimator.result.calc.basisReducing') }}
                option(value="Interest Only") {{ $t('report.loanEstimator.result.calc.basisInterestOnly') }}
        .ler-result
          .ler-repay(:class="{ 'is-stale': !!error }")
            span.ler-repay-label {{ $t('report.loanEstimator.result.calc.monthlyRepayment') }}
            span.ler-repay-value {{ money(data.repayment.monthlyRepayment) }}
          .ler-scroll(v-if="data.repayment.years")
            table.ler-table
              thead
                tr
                  th {{ $t('report.loanEstimator.result.calc.schedule.year') }}
                  th {{ $t('report.loanEstimator.result.calc.schedule.interest') }}
                  th {{ $t('report.loanEstimator.result.calc.schedule.principal') }}
                  th {{ $t('report.loanEstimator.result.calc.schedule.closingBalance') }}
              tbody
                tr(v-for="y in data.repayment.years" :key="y.year")
                  td {{ y.year }}
                  td {{ money(y.interest) }}
                  td {{ money(y.principal) }}
                  td {{ money(y.closingBalance) }}
                tr.is-combined
                  td {{ $t('report.loanEstimator.result.calc.schedule.total') }}
                  td {{ money(data.repayment.totals.interest) }}
                  td {{ money(data.repayment.totals.principal) }}
                  td

  .ler-card(v-else-if="error")
    h2 {{ $t('report.calcFailedTitle') }}
    p.ler-note {{ $t('report.calcUnreachable') }}
    b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
  .ler-card(v-else)
    p.ler-note {{ $t('report.loading') }}
</template>

<script>
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import SliderField from '~/components/base/SliderField'
import StaleBanner from '~/components/base/StaleBanner'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * LoanEstimatorReport — step 4 of the Loan Estimator: the ruled verdict, the
 * headline figures (led by the business loan when the business step is filled),
 * the security-position, business and serviceability summaries,
 * and the workbook's own Quick Calculator as the interactive repayment card
 * (layout + wording approved by Mike 2026-07-23, session D).
 *
 * Verdict wording is the §3.3 ruling (session C): neutral + qualifier, never
 * the workbook's "Looking Good!"/"Doesn't Look Good".
 *
 * All calculation is backend-only (POST /api/report/loan-estimator): the two
 * confirmed step payloads pass through untouched, the repayment inputs are
 * this screen's own controls, and every figure rendered comes back from the
 * model. The schedule table is absent for Interest Only exactly as the sheet
 * has no schedule for it (`years` is null).
 */
export default {
  name: 'LoanEstimatorReport',

  components: { HeroStrip, HeroFigure, SliderField, StaleBanner },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /** Step 1's confirmed security-position payload (model-shaped). */
    security: { type: Object, default: null },
    /** Step 2's confirmed business-loan payload (model-shaped); null for a personal-only enquiry. */
    business: { type: Object, default: null },
    /** Step 3's confirmed serviceability payload (model-shaped). */
    serviceability: { type: Object, default: null }
  },

  data () {
    return {
      // The Quick Calculator's sample loan (`Capital Input` D6–D16), rate in
      // display form — the backend's DEFAULT_LOAN_INPUTS cell-for-cell.
      calc: {
        purchasePrice: 1350000, // D16
        deposit: 270000, //        D8
        ratePct: 5.5, //           D10
        term: 36, //               D12
        termUnit: 'Years', //      D13
        basis: 'Table' //          D6
      },
      data: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  computed: {
    /** @returns {boolean} the model's affordability test (surplus > threshold). */
    verdictPass () {
      return !!(this.data && this.data.serviceability.verdictPass)
    },
    /**
     * N64's expense side: actual expenses count only when they exceed the
     * bank's minimum-allowances floor.
     * @returns {number}
     */
    expensesUsed () {
      if (!this.data) { return 0 }
      const s = this.data.serviceability
      return Math.max(s.expenses.total, s.allowances.floor)
    },
    /**
     * The maximum bank-adjusted business loan as a positive size. The model
     * stores it negative (the workbook's present-value sign convention, D40 /
     * G102); the report shows loan sizes positive, like every other figure here.
     * @returns {number|null} the loan size, or null before the first result.
     */
    businessMaxLoan () {
      if (!this.data || !this.data.business) { return null }
      return Math.abs(this.data.business.maxBankAdjustedLoan)
    },
    /** R22-style stretch: the ceiling grows to fit a larger typed figure. */
    priceMax () {
      return this.calc.purchasePrice > 5000000
        ? Math.ceil(this.calc.purchasePrice / 10000) * 10000
        : 5000000
    }
  },

  watch: {
    calc: {
      deep: true,
      handler () { this.queueRecompute() }
    },
    /** Years ↔ Months keeps the same duration, so the repayment doesn't jump. */
    'calc.termUnit' (unit, prev) {
      if (unit === prev) { return }
      this.calc.term = unit === 'Months'
        ? this.calc.term * 12
        : Math.max(1, Math.round(this.calc.term / 12))
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * The backend request — consumed by the reportRecompute mixin (debounce,
     * race guard, stale flag). The step payloads pass through untouched.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      return {
        url: '/api/report/loan-estimator',
        body: {
          securityPosition: this.security || undefined,
          business: this.business || undefined,
          serviceability: this.serviceability || undefined,
          repayment: {
            purchasePrice: this.calc.purchasePrice,
            deposit: this.calc.deposit,
            annualRate: this.calc.ratePct / 100,
            term: this.calc.term,
            termUnit: this.calc.termUnit,
            basis: this.calc.basis
          }
        }
      }
    },
    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
/* Palette, card and table dividers read the shared visual-standard tokens (ReportShell):
   every swapped value equals the token it points at — a no-change consolidation, not a
   restyle. This screen's card is already on-standard (14px radius, 16px 18px padding,
   12px/600 title), so it repoints fully. The two-column calc layout reads the shared
   --rs-col-input / --rs-col-gap tokens (Step 3, standardised to 360px / 20px). Left literal
   on purpose: the pass/fail verdict panel (a permitted per-model accent, its own green/red
   palette), the field-label ink (#223a57, no token) and the repayment sub-panel's 10px
   radius. */
.ler-root { display: flex; flex-direction: column; gap: 16px; }
.ler-verdict {
  border-radius: 12px; padding: 18px 20px; border: 1px solid;
}
.ler-verdict h2 { font-size: 19px; font-weight: 700; margin: 0 0 4px; }
.ler-verdict p { margin: 0; font-size: 12.5px; }
.ler-verdict.is-pass { background: #4ca52d12; border-color: #4ca52d55; }
.ler-verdict.is-pass h2 { color: #35761f; }
.ler-verdict.is-pass p { color: #4d6b41; }
.ler-verdict.is-fail { background: #ff00000a; border-color: #ff000040; }
.ler-verdict.is-fail h2 { color: #b30000; }
.ler-verdict.is-fail p { color: #7a4a4a; }
.ler-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-top: 3px solid var(--rs-card-top);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad);
}
.ler-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin-bottom: 10px;
}
.ler-scroll { overflow-x: auto; }
.ler-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px; }
.ler-table th {
  text-align: right; font-size: 11px; font-weight: 600; color: var(--rs-muted);
  padding: 6px 10px; border-bottom: 1px solid var(--rs-line);
}
.ler-table th:first-child, .ler-table td:first-child { text-align: left; }
.ler-table td { padding: 6px 10px; border-bottom: 1px solid var(--rs-bg); text-align: right; }
.ler-table td:first-child { font-weight: 600; color: #223a57; }
.ler-table tr.is-combined td { border-top: 2px solid var(--rs-line); border-bottom: 0; font-weight: 700; }
.ler-mini { width: 100%; border-collapse: collapse; font-size: 13px; }
.ler-mini td { padding: 6px 10px; border-bottom: 1px solid var(--rs-bg); }
.ler-mini td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
.ler-mini tr.is-total td { border-bottom: 0; border-top: 2px solid var(--rs-line); font-weight: 700; }
.ler-mini .is-crit { color: var(--rs-crit); }
.ler-note { font-size: 11.5px; color: var(--rs-muted); margin: 4px 0 0; font-weight: 300; }
.ler-calc { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .ler-calc { grid-template-columns: 1fr; } }
.ler-selects { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
.ler-select label { display: block; font-size: 12.5px; color: var(--rs-ink); font-weight: 300; margin-bottom: 3px; }
.ler-result { display: flex; flex-direction: column; gap: 12px; }
.ler-repay {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 10px; padding: 12px 16px;
}
.ler-repay.is-stale { opacity: .45; }
.ler-repay-label { font-size: 12.5px; font-weight: 600; color: var(--rs-muted); }
.ler-repay-value { font-size: 22px; font-weight: 700; color: var(--rs-accent); }
@media print {
  .ler-controls { display: none !important; }
  .ler-card, .ler-verdict { break-inside: avoid; }
}
</style>

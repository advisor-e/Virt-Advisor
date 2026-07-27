<template lang="pug">
.lvb-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.leaseVsBuy.title')"
    :client="$t('report.preparedFor')"
  )
  //- Decision class: seeded with the workbook sample until the advisor types the
  //- client's own figures. No "Illustrative" badge — these become real numbers.
  sample-notice(:text="$t('report.sampleFigures')")

  //- Full-width headline band (owner ruling 2026-07-27): the verdict + HeroStrip span
  //- the page above the two-column layout on every model, never inside the results column.
  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )

    .lvb-verdict(:class="{ 'is-stale': !!error }")
      h2 {{ data.verdict.recommended === 'lease' ? $t('report.leaseVsBuy.verdict.lease') : $t('report.leaseVsBuy.verdict.buy') }}
      p {{ $t('report.leaseVsBuy.verdict.savingSub', { amount: money(data.verdict.saving) }) }}

    hero-strip(:columns="3" :stale="!!error")
      hero-figure(
        :label="$t('report.leaseVsBuy.hero.costToBuy')"
        :value="money(data.buy.totalNet)"
        :sub="$t('report.leaseVsBuy.hero.costToBuySub')"
        :tone="data.verdict.recommended === 'buy' ? 'good' : 'default'"
      )
      hero-figure(
        :label="$t('report.leaseVsBuy.hero.costToLease')"
        :value="money(data.lease.totalNet)"
        :sub="$t('report.leaseVsBuy.hero.costToLeaseSub')"
        :tone="data.verdict.recommended === 'lease' ? 'good' : 'default'"
      )
      hero-figure(
        :label="$t('report.leaseVsBuy.hero.youSave')"
        :value="money(data.verdict.saving)"
        :sub="$t('report.leaseVsBuy.hero.youSaveSub')"
      )

  //- House two-column layout (matches every other same-screen model): the inputs
  //- live in the left column, the results on the right. Collapses to one column
  //- on narrow screens. See MarginBreakevenReport / QuickPositionReport etc.
  .lvb-layout
    aside.lvb-inputs
      .lvb-card
        h2 {{ $t('report.leaseVsBuy.loan.title') }}
        .lvb-field
          label {{ $t('report.leaseVsBuy.loan.loanType') }}
          b-select(v-model="form.loanType" size="is-small")
            option(value="T") {{ $t('report.leaseVsBuy.loan.typeTable') }}
            option(value="R") {{ $t('report.leaseVsBuy.loan.typeReducing') }}
        .lvb-field
          label {{ $t('report.leaseVsBuy.loan.purchasePrice') }}
          b-input(v-model.number="form.purchasePrice" type="number" step="any" size="is-small")
        .lvb-field
          label {{ $t('report.leaseVsBuy.loan.deposit') }}
          b-input(v-model.number="form.deposit" type="number" step="any" size="is-small")
        .lvb-field
          label {{ $t('report.leaseVsBuy.loan.interestRate') }}
          b-input(v-model.number="form.interestRatePct" type="number" step="any" size="is-small")
        .lvb-field
          label {{ $t('report.leaseVsBuy.loan.term') }}
          b-input(v-model.number="form.termMonths" type="number" step="any" size="is-small")

      .lvb-card
        h2 {{ $t('report.leaseVsBuy.dep.title') }}
        .lvb-field
          label {{ $t('report.leaseVsBuy.dep.method') }}
          b-select(v-model="form.depreciationMethod" size="is-small")
            option(value="sl") {{ $t('report.leaseVsBuy.dep.straightLine') }}
            option(value="dv") {{ $t('report.leaseVsBuy.dep.diminishing') }}
        .lvb-field
          label {{ $t('report.leaseVsBuy.dep.rate') }}
          b-input(v-model.number="form.depreciationRatePct" type="number" step="any" size="is-small")

      .lvb-card
        h2 {{ $t('report.leaseVsBuy.costs.title') }}
        .lvb-grid2
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.companyTax') }}
            b-input(v-model.number="form.companyTaxRatePct" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.gst') }}
            b-input(v-model.number="form.gstRatePct" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.kmPerMonth') }}
            b-input(v-model.number="form.kmPerMonth" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.inflation') }}
            b-input(v-model.number="form.inflationRatePct" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.servicePeriodKm') }}
            b-input(v-model.number="form.servicePeriodKm" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.serviceCost') }}
            b-input(v-model.number="form.warrantyServiceCost" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.insurance') }}
            b-input(v-model.number="form.insurancePerYear" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.tyres') }}
            b-input(v-model.number="form.tyresCost" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.costs.tyreLifeKm') }}
            b-input(v-model.number="form.tyreLifeKm" type="number" step="any" size="is-small")

      .lvb-card
        h2 {{ $t('report.leaseVsBuy.lease.title') }}
        .lvb-grid2
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.term') }}
            b-input(v-model.number="form.leaseTermMonths" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.monthly') }}
            b-input(v-model.number="form.monthlyLeasePayment" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.annualKm') }}
            b-input(v-model.number="form.annualLeaseKm" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.costPerKmOver') }}
            b-input(v-model.number="form.costPerKmOver" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.costPerPanel') }}
            b-input(v-model.number="form.costPerPanel" type="number" step="any" size="is-small")
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.numPanels') }}
            b-input(v-model.number="form.numPanels" type="number" step="any" size="is-small")
        .lvb-includes
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.includesServicing') }}
            b-select(v-model="form.includesServicing" size="is-small")
              option(value="yes") {{ $t('report.leaseVsBuy.yes') }}
              option(value="no") {{ $t('report.leaseVsBuy.no') }}
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.includesInsurance') }}
            b-select(v-model="form.includesInsurance" size="is-small")
              option(value="yes") {{ $t('report.leaseVsBuy.yes') }}
              option(value="no") {{ $t('report.leaseVsBuy.no') }}
          .lvb-field
            label {{ $t('report.leaseVsBuy.lease.includesTyres') }}
            b-select(v-model="form.includesTyres" size="is-small")
              option(value="yes") {{ $t('report.leaseVsBuy.yes') }}
              option(value="no") {{ $t('report.leaseVsBuy.no') }}

      .lvb-card
        h2 {{ $t('report.leaseVsBuy.end.title') }}
        .lvb-field
          .lvb-labels
            label {{ $t('report.leaseVsBuy.end.resale') }}
            p.lvb-help {{ $t('report.leaseVsBuy.end.resaleHelp') }}
          b-input(v-model.number="form.assetResaleValue" type="number" step="any" size="is-small")
        .lvb-field
          label {{ $t('report.leaseVsBuy.end.residual') }}
          b-input(v-model.number="form.leaseResidual" type="number" step="any" size="is-small")

    section.lvb-results
      template(v-if="data")
        //- How the two totals are reached (the workbook's Input-sheet summary rows).
        .lvb-card
          h2 {{ $t('report.leaseVsBuy.compare.title') }}
          table.lvb-mini
            tr
              td {{ $t('report.leaseVsBuy.compare.buyGross') }}
              td {{ money(data.buy.grossTotal) }}
            tr
              td {{ $t('report.leaseVsBuy.compare.resale') }}
              td −{{ money(data.buy.resaleValue) }}
            tr.is-total
              td {{ $t('report.leaseVsBuy.compare.buyTotal') }}
              td {{ money(data.buy.totalNet) }}
            tr.is-gap
              td {{ $t('report.leaseVsBuy.compare.leaseGross') }}
              td {{ money(data.lease.grossTotal) }}
            tr
              td {{ $t('report.leaseVsBuy.compare.residual') }}
              td −{{ money(data.lease.residual) }}
            tr.is-total
              td {{ $t('report.leaseVsBuy.compare.leaseTotal') }}
              td {{ money(data.lease.totalNet) }}
          p.lvb-note {{ $t('report.leaseVsBuy.compare.leaseEndNote', { amount: money(data.lease.endCosts.total) }) }}

      .lvb-card(v-if="!data && error")
        h2 {{ $t('report.calcFailedTitle') }}
        p.lvb-note {{ $t('report.calcUnreachable') }}
        b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
      .lvb-card(v-else-if="!data")
        p.lvb-note {{ $t('report.loading') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * LeaseVsBuy — the Lease vs Buy model screen (Valuation · Decision class).
 *
 * A single live-recomputing screen laid out in the house two-column grid: the
 * advisor types the loan, depreciation, running-cost and lease figures in the
 * LEFT column, and the RIGHT column shows which option is cheaper and by how
 * much. Field wording is the workbook's own; the verdict keeps the workbook's
 * "Lease!" / "Buy!" (owner ruling 2026-07-27).
 *
 * Decision class — NO "Illustrative" badge (real client numbers). Seeded with the
 * workbook sample and flagged by SampleNotice until the advisor types their own.
 *
 * All calculation is backend-only (POST /api/report/lease-vs-buy); every figure
 * rendered comes back from the model. Rates are held in display form (9.5, not
 * 0.095) and converted to decimals in the payload. The per-year Buy repairs are the
 * workbook's fixed assumptions, carried in `form.buyRepairs` and sent unchanged so
 * nothing is silently defaulted on the backend.
 */
export default {
  name: 'LeaseVsBuy',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      // The workbook's own sample (Input sheet), rates in display form. Cell refs
      // are documented in server/report/leaseVsBuyModel.js DEFAULT_INPUTS.
      form: {
        loanType: 'T',
        purchasePrice: 55000,
        deposit: 8500,
        interestRatePct: 9.5,
        termMonths: 48,
        depreciationMethod: 'dv',
        depreciationRatePct: 23,
        companyTaxRatePct: 28,
        gstRatePct: 15,
        kmPerMonth: 2500,
        inflationRatePct: 1.5,
        servicePeriodKm: 15000,
        warrantyServiceCost: 450,
        insurancePerYear: 850,
        tyresCost: 1300,
        tyreLifeKm: 55000,
        leaseTermMonths: 36,
        annualLeaseKm: 13333,
        costPerKmOver: 0.17,
        costPerPanel: 300,
        numPanels: 4,
        monthlyLeasePayment: 734,
        includesServicing: 'yes',
        includesInsurance: 'yes',
        includesTyres: 'yes',
        assetResaleValue: 19500,
        leaseResidual: 0,
        // Fixed per-year repair assumptions (Buy!D21:M21) — carried, not shown.
        buyRepairs: [250, 250, 1500, 250, 250, 500, 3500, 2000, 1500, 1000]
      },
      data: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  watch: {
    form: {
      deep: true,
      handler () { this.queueRecompute() }
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * The backend request — consumed by the reportRecompute mixin (debounce, race
     * guard, stale flag). Display percentages are converted to decimals here.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      const f = this.form
      return {
        url: '/api/report/lease-vs-buy',
        body: {
          loanType: f.loanType,
          purchasePrice: f.purchasePrice,
          deposit: f.deposit,
          interestRate: (Number(f.interestRatePct) || 0) / 100,
          termMonths: f.termMonths,
          depreciationMethod: f.depreciationMethod,
          depreciationRate: (Number(f.depreciationRatePct) || 0) / 100,
          companyTaxRate: (Number(f.companyTaxRatePct) || 0) / 100,
          gstRate: (Number(f.gstRatePct) || 0) / 100,
          kmPerMonth: f.kmPerMonth,
          inflationRate: (Number(f.inflationRatePct) || 0) / 100,
          servicePeriodKm: f.servicePeriodKm,
          warrantyServiceCost: f.warrantyServiceCost,
          insurancePerYear: f.insurancePerYear,
          tyresCost: f.tyresCost,
          tyreLifeKm: f.tyreLifeKm,
          leaseTermMonths: f.leaseTermMonths,
          annualLeaseKm: f.annualLeaseKm,
          costPerKmOver: f.costPerKmOver,
          costPerPanel: f.costPerPanel,
          numPanels: f.numPanels,
          monthlyLeasePayment: f.monthlyLeasePayment,
          includesServicing: f.includesServicing,
          includesInsurance: f.includesInsurance,
          includesTyres: f.includesTyres,
          assetResaleValue: f.assetResaleValue,
          leaseResidual: f.leaseResidual,
          buyRepairs: f.buyRepairs
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
.lvb-root { display: flex; flex-direction: column; gap: 16px; }
/* House two-column grid: inputs left (~340px), results right — identical to
   MarginBreakeven / QuickPosition / Debtor Drag / Eight Levers / Loan Estimator. */
.lvb-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .lvb-layout { grid-template-columns: 1fr; } }
.lvb-inputs { display: flex; flex-direction: column; gap: 16px; }
.lvb-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.lvb-verdict {
  border-radius: 12px; padding: 18px 20px; border: 1px solid;
  background: #4ca52d12; border-color: #4ca52d55;
}
.lvb-verdict.is-stale { opacity: .45; }
.lvb-verdict h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #35761f; }
.lvb-verdict p { margin: 0; font-size: 12.5px; color: #4d6b41; }
/* Card, palette and dividers read the shared visual-standard tokens (ReportShell).
   Every value here equals the token it now points at — a no-change consolidation, not
   a restyle. Values NOT covered by the standard stay literal: the input-column width
   (340px, standardised to 360px in Step 3), the green verdict panel (a permitted
   per-model accent) and the field-label ink (#223a57, no standard token). */
.lvb-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-top: 3px solid var(--rs-card-top);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad);
}
.lvb-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin-bottom: 12px;
}
.lvb-mini { width: 100%; border-collapse: collapse; font-size: 13px; }
.lvb-mini td { padding: 6px 10px; border-bottom: 1px solid var(--rs-bg); }
.lvb-mini td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
.lvb-mini tr.is-total td { border-bottom: 0; border-top: 2px solid var(--rs-line); font-weight: 700; color: var(--rs-ink); }
.lvb-mini tr.is-gap td { padding-top: 14px; }
.lvb-note { font-size: 11.5px; color: var(--rs-muted); margin: 8px 0 0; font-weight: 300; }
.lvb-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 3px 0;
}
.lvb-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.lvb-labels { flex: 1 1 auto; }
.lvb-help { font-size: 11px; color: var(--rs-muted); margin: 1px 0 0; font-weight: 300; }
.lvb-field .control { width: 150px; flex: 0 0 auto; }
/* One field per row — the input column is narrow (~340px), so the running-cost
   and lease grids stack rather than sit two-up. */
.lvb-grid2 { display: grid; grid-template-columns: 1fr; gap: 0 24px; }
.lvb-includes {
  display: flex; flex-direction: column; gap: 6px;
  border-top: 1px dashed var(--rs-line); margin-top: 10px; padding-top: 10px;
}
.lvb-root .herostrip { margin-bottom: 0; }
@media print {
  /* On paper the inputs are dropped and the results run full width. */
  .lvb-inputs { display: none !important; }
  .lvb-layout { display: block; }
  .lvb-verdict, .lvb-card { break-inside: avoid; }
}
</style>

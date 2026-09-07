<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.profitLossTitle')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.profitLossSub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cols.drd-top
    .drd-panel.drd-pl-panel
      table.drd-table
        thead
          tr
            th
            th.drd-n {{ currentLabel }}
            th.drd-n
            th.drd-n(v-if="p.prior") {{ priorLabel }}
        tbody
          tr
            td {{ $t('report.dashboardReports.doc.revenue') }}
            td.drd-n {{ money(c.revenue) }}
            td.drd-n.drd-pct 100%
            td.drd-n(v-if="p.prior") {{ money(p.prior.revenue) }}
          tr
            td {{ $t('report.dashboardReports.doc.costOfGoods') }}
            td.drd-n – {{ money(c.costOfSales) }}
            td.drd-n.drd-pct {{ pct(share(c.costOfSales), 0) }}
            td.drd-n(v-if="p.prior") – {{ money(p.prior.costOfSales) }}
          tr.is-total
            td {{ $t('report.dashboardReports.doc.grossProfit') }}
            td.drd-n {{ money(c.grossProfit) }}
            td.drd-n.drd-pct {{ pct(c.grossMarginPct, 0) }}
            td.drd-n(v-if="p.prior") {{ money(p.prior.grossProfit) }}
          tr(v-if="c.otherIncome")
            td {{ $t('report.dashboardReports.doc.otherIncome') }}
            td.drd-n {{ money(c.otherIncome) }}
            td.drd-n.drd-pct {{ pct(share(c.otherIncome), 1) }}
            td.drd-n(v-if="p.prior") {{ money(p.prior.otherIncome) }}
          tr
            td {{ $t('report.dashboardReports.doc.operatingExpenses') }}
            td.drd-n – {{ money(c.operatingExpenses) }}
            td.drd-n.drd-pct {{ pct(c.operatingExpensesPct, 0) }}
            td.drd-n(v-if="p.prior") – {{ money(p.prior.operatingExpenses) }}
          tr.is-total
            td {{ $t('report.dashboardReports.doc.ebitda') }}
            td.drd-n {{ money(c.ebitda) }}
            td.drd-n.drd-pct {{ pct(c.ebitdaPct, 1) }}
            td.drd-n(v-if="p.prior") {{ money(p.prior.ebitda) }}
          tr
            td {{ $t('report.dashboardReports.doc.interestDepreciation') }}
            td.drd-n – {{ money(c.interestAndDepreciation) }}
            td.drd-n.drd-pct {{ pct(c.interestAndDepreciationPct, 1) }}
            td.drd-n(v-if="p.prior") – {{ money(p.prior.interestAndDepreciation) }}
          tr.is-total
            td {{ $t('report.dashboardReports.doc.netProfit') }}
            td.drd-n {{ money(c.netProfit) }}
            td.drd-n.drd-pct {{ pct(c.netMarginPct, 1) }}
            td.drd-n(v-if="p.prior") {{ money(p.prior.netProfit) }}
    div
      .drd-panel
        h3.drd-h3 {{ $t('report.dashboardReports.doc.grossNetByYear') }}
        bar-pair-chart(:groups="profitGroups" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.grossNetByYear')")
        .drd-legend
          span
            i(style="background:#0070c0")
            | {{ $t('report.dashboardReports.doc.grossProfit') }}
          span
            i(style="background:#00b1e0")
            | {{ $t('report.dashboardReports.doc.netProfit') }}
      .drd-panel.is-caution.drd-insight
        p
          b {{ $t('report.dashboardReports.doc.insight') }}:
          |
          | {{ insight || $t('report.dashboardReports.doc.noInsightYet') }}
          span.drd-prov.is-typed {{ $t('report.dashboardReports.doc.advisor') }}
</template>

<script>
/**
 * DashboardReportProfitLoss — page 3, the Profit & Loss Summary (drawing page 5): the
 * plain-English table with each line's share of revenue and last year beside it, gross and
 * net profit by year, and the advisor's insight.
 *
 * "Operating profit (EBITDA)" is gross profit plus other income less wages and operating
 * expenses; interest and depreciation come off below it. Tax is not a line: the annual
 * readers read a pre-tax Profit and Loss.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import BarPairChart from '~/components/base/BarPairChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct } = require('~/utils/reportFormat')

export default {
  name: 'DashboardReportProfitLoss',

  components: { DashboardReportPage, BarPairChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.profitLoss` — `{ current, prior }` */
    p: { type: Object, required: true },
    insight: { type: String, default: '' },
    priorLabel: { type: String, default: '' },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    c () { return this.p.current },
    profitGroups () {
      const out = []
      if (this.p.prior) { out.push({ label: this.priorLabel, a: this.p.prior.grossProfit, b: this.p.prior.netProfit }) }
      out.push({ label: this.currentLabel, a: this.c.grossProfit, b: this.c.netProfit })
      return out
    }
  },

  methods: {
    pct,
    /** @param {number} v @returns {number|null} v as a share of revenue */
    share (v) { return this.c.revenue ? v / this.c.revenue : null }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-pl-panel { background: #f4f8fb; }
.drd-insight { margin-top: 14px; font-size: 14px; }
.drd-insight p { margin: 0; }
</style>

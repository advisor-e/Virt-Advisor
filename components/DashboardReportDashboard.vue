<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.dashboard')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.dashboardSub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cols.drd-top
    .drd-panel
      h3.drd-h3 {{ chartTitle }}
      bar-pair-chart(:groups="revenueGroups" :format-value="kMoney" :aria-label="chartTitle")
      .drd-legend
        span
          i(style="background:#0070c0")
          | {{ $t('report.dashboardReports.doc.revenue') }}
        span
          i(style="background:#00b1e0")
          | {{ $t('report.dashboardReports.doc.expenses') }}
      p.drd-small(v-if="quartersNote") {{ quartersNote }}
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.whereMoneyWent') }}
      doughnut-chart(:slices="costSlices" :centre="kMoney(costs.total)" :aria-label="$t('report.dashboardReports.doc.whereMoneyWent')")
  .drd-ratios
    .drd-ratio
      .drd-tag {{ $t('report.dashboardReports.doc.tagPl') }}
      .drd-rv {{ pct(d.grossMarginPct) }}
      .drd-rk
        span.drd-light(v-if="d.grossMarginBand" :class="'is-' + d.grossMarginBand")
        | {{ $t('report.dashboardReports.doc.grossMargin') }}
    .drd-ratio
      .drd-tag {{ $t('report.dashboardReports.doc.tagPl') }}
      .drd-rv {{ pct(d.netMarginPct) }}
      .drd-rk {{ $t('report.dashboardReports.doc.netMargin') }}
    .drd-ratio.is-caution
      .drd-tag {{ $t('report.dashboardReports.doc.tagBs') }}
      .drd-rv {{ times(d.currentRatio) }}
      .drd-rk {{ $t('report.dashboardReports.doc.currentRatio') }}
    .drd-ratio.is-caution
      .drd-tag {{ $t('report.dashboardReports.doc.tagBs') }}
      .drd-rv {{ ratio2(d.debtToEquity) }}
      .drd-rk {{ $t('report.dashboardReports.doc.debtToEquity') }}
    .drd-ratio.is-danger
      .drd-tag {{ $t('report.dashboardReports.doc.tagInventory') }}
      .drd-rv {{ times(d.stockTurn) }}
      .drd-rk {{ $t('report.dashboardReports.doc.stockTurn') }}
    .drd-ratio.is-danger
      .drd-tag {{ $t('report.dashboardReports.doc.tagInventory') }}
      .drd-rv {{ days(d.stockDays) }} {{ d.stockDays === null ? '' : $t('report.dashboardReports.doc.days') }}
      .drd-rk
        span.drd-light(v-if="d.stockDaysBand" :class="'is-' + d.stockDaysBand")
        | {{ $t('report.dashboardReports.doc.daysOnHand') }}
  p.drd-small.drd-defs {{ $t('report.dashboardReports.doc.ratioDefinitions') }}
</template>

<script>
/**
 * DashboardReportDashboard — page 2, the Financial Dashboard (drawing page 4): revenue
 * against expenses, where the money went, and six ratios.
 *
 * The quarterly bars are drawn from the by-month Profit and Loss when one was dropped on
 * step 2 (stage 5), each quarter only when all three of its months were read; without one
 * the chart is this year against last year and its title says so. A ratio carries a
 * traffic light only where the firm has a threshold for it (Brief P5 — a colour with no
 * rule is a verdict). The tiles' background tints are the deck's composition, not a judgement.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import BarPairChart from '~/components/base/BarPairChart.vue'
import DoughnutChart from '~/components/base/DoughnutChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, times, ratio2, days } = require('~/utils/reportFormat')

const COST_COLOURS = { costOfSales: '#002b64', wages: '#0070c0', operatingExpenses: '#00b1e0', depreciation: '#7fd3f1', interestPaid: '#3a3a3a' }

export default {
  name: 'DashboardReportDashboard',

  components: { DashboardReportPage, BarPairChart, DoughnutChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.dashboard` */
    d: { type: Object, required: true },
    /** `figures.costs` */
    costs: { type: Object, required: true },
    /** `figures.monthly` (stage 5), or null. */
    monthly: { type: Object, default: null },
    priorLabel: { type: String, default: '' },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    quarters () {
      const q = this.monthly && this.monthly.quarters
      return q && q.available ? q : null
    },
    chartTitle () {
      return this.$t('report.dashboardReports.doc.' + (this.quarters ? 'revenueVsExpensesQuarterly' : 'revenueVsExpenses'))
    },
    quartersNote () {
      return this.quarters && this.quarters.completeCount < 4 ? this.$t('report.dashboardReports.doc.quartersPartial', { n: this.quarters.completeCount }) : ''
    },
    revenueGroups () {
      if (this.quarters) {
        return this.quarters.rows.filter(q => q.complete).map(q => ({ label: this.$t('report.dashboardReports.doc.quarter', { n: q.index }), a: q.sales, b: q.expenses }))
      }
      const out = []
      const r = this.d.revenueVsExpenses
      if (r.prior) { out.push({ label: this.priorLabel, a: r.prior.revenue, b: r.prior.expenses }) }
      out.push({ label: this.currentLabel, a: r.current.revenue, b: r.current.expenses })
      return out
    },
    costSlices () {
      return this.costs.shares.map(s => ({
        label: this.$t('report.dashboardReports.doc.cost.' + s.key),
        value: s.value,
        colour: COST_COLOURS[s.key]
      }))
    }
  },

  methods: { pct, times, ratio2, days }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-ratios { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-top: 16px; }
.drd-ratio { border-radius: 12px; padding: 12px 14px 10px; background: var(--drd-tint-blue); }
.drd-ratio.is-caution { background: var(--drd-tint-cyan); }
.drd-ratio.is-danger { background: var(--drd-tint-sky); }
.drd-tag { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--drd-blue); }
.drd-rv { font: 700 26px/1.1 var(--drd-serif); color: var(--drd-navy); margin: 6px 0 8px; }
.drd-rk { font-size: 12.5px; color: var(--drd-muted); }
.drd-defs { margin-top: 10px; }
@media screen and (max-width: 900px) { .drd-ratios { grid-template-columns: 1fr 1fr; } }
</style>

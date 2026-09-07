<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.trends')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.trendsSub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cols.is-wide.drd-top
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.youVsIndustry') }}
      .drd-gap {{ $t('report.dashboardReports.doc.benchmarksLater') }}
    div
      h3.drd-h3.drd-h3-lg {{ $t('report.dashboardReports.doc.twoYearTrend') }}
      table.drd-table
        thead
          tr
            th
            th.drd-n {{ priorLabel || '—' }}
            th.drd-n.drd-cur {{ currentLabel }}
        tbody
          tr(v-for="row in rows" :key="row.key")
            td
              b {{ $t('report.dashboardReports.doc.trendRow.' + row.key) }}
            td.drd-n {{ row.priorText }}
            td.drd-n
              b {{ row.currentText }}
              |
              span(v-if="row.arrow" :class="row.better ? 'drd-up' : 'drd-down'") {{ row.arrow }}
      p.drd-small.drd-note {{ $t('report.dashboardReports.doc.trendNote') }}
</template>

<script>
/**
 * DashboardReportTrends — page 7, Benchmarks & Trends (drawing page 9). The two-year
 * trend table is drawn from the accounts; the Stats NZ comparison is stage 3 and its
 * panel says so rather than showing invented medians (Brief P3, P9).
 *
 * An arrow's colour follows the row's own sense: more revenue is up-good; more debtor days
 * is up-bad. That is a direction, not a threshold, so it needs no ruling.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, times, days } = require('~/utils/reportFormat')

/** Whether a rise in each row is good news. */
const RISE_IS_GOOD = { revenue: true, netProfit: true, netMargin: true, stockTurn: true, debtorDays: false }

export default {
  name: 'DashboardReportTrends',

  components: { DashboardReportPage },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.trends` — `{ rows }` */
    trends: { type: Object, required: true },
    priorLabel: { type: String, default: '' },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    rows () {
      return this.trends.rows.map((r) => {
        const fmt = this.formatter(r.unit)
        const both = r.prior !== null && r.current !== null
        const rose = both && r.current > r.prior
        const fell = both && r.current < r.prior
        return {
          key: r.key,
          priorText: fmt(r.prior),
          currentText: fmt(r.current),
          arrow: rose ? '↑' : (fell ? '↓' : ''),
          better: rose ? RISE_IS_GOOD[r.key] : !RISE_IS_GOOD[r.key]
        }
      })
    }
  },

  methods: {
    /** @param {string} unit @returns {Function} */
    formatter (unit) {
      if (unit === 'money') { return v => (v === null ? '—' : this.kMoney(v)) }
      if (unit === 'percent') { return v => pct(v) }
      if (unit === 'times') { return v => times(v) }
      return v => days(v)
    }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-h3-lg { font-size: 18px; }
.drd-cur { color: var(--drd-blue); }
.drd-note { margin-top: 10px; }
</style>

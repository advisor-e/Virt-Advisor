<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.trends')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.trendsSub') }}
    span.drd-prov.is-stats(v-if="benchmarks && benchmarks.available") {{ $t('report.dashboardReports.doc.statsNz') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cols.is-wide.drd-top
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.youVsIndustry') }}
      template(v-if="benchmarks && benchmarks.available")
        p.drd-small.drd-bm-line {{ benchmarkLine }}
        table.drd-table.drd-bm
          thead
            tr
              th {{ $t('report.dashboardReports.doc.bm.ratio') }}
              th.drd-n {{ $t('report.dashboardReports.doc.bm.you') }}
              th.drd-n {{ $t('report.dashboardReports.doc.bm.median') }}
              th.drd-n {{ $t('report.dashboardReports.doc.bm.middleHalf') }}
              th
          tbody
            tr(v-for="r in benchmarkRows" :key="r.key")
              td {{ $t('report.dashboardReports.doc.bm.name.' + r.key) }}
              td.drd-n {{ r.youText }}
              td.drd-n {{ r.medianText }}
              td.drd-n.drd-pct {{ r.rangeText }}
              td
                template(v-if="r.position")
                  span.drd-light(:class="r.lightClass")
                  | {{ $t('report.dashboardReports.doc.bm.position.' + r.position) }}
                span.drd-small(v-else) {{ $t('report.dashboardReports.doc.bm.' + (r.published ? 'noFigure' : 'unpublished')) }}
        p.drd-small.drd-note {{ $t('report.dashboardReports.doc.bm.accuracy.' + (benchmarks.industry.accuracy || 'none')) }}
      .drd-gap(v-else-if="benchmarks && benchmarks.blocked") {{ $t('report.dashboardReports.doc.bm.blocked.' + benchmarks.blocked, { industry: benchmarks.industry ? benchmarks.industry.name : '' }) }}
      .drd-gap(v-else) {{ $t('report.dashboardReports.doc.bm.chooseIndustry') }}
    div
      h3.drd-h3.drd-h3-lg {{ $t('report.dashboardReports.doc.' + (trends.hasEarlier ? 'threeYearTrend' : 'twoYearTrend')) }}
      table.drd-table
        thead
          tr
            th
            th.drd-n(v-if="trends.hasEarlier") {{ $t('report.dashboardReports.doc.twoYearsAgo') }}
            th.drd-n {{ priorLabel || '—' }}
            th.drd-n.drd-cur {{ currentLabel }}
        tbody
          tr(v-for="row in rows" :key="row.key")
            td
              b {{ $t('report.dashboardReports.doc.trendRow.' + row.key) }}
            td.drd-n(v-if="trends.hasEarlier") {{ row.earlierText }}
            td.drd-n {{ row.priorText }}
            td.drd-n
              b {{ row.currentText }}
              |
              span(v-if="row.arrow" :class="row.better ? 'drd-up' : 'drd-down'") {{ row.arrow }}
      p.drd-small.drd-note {{ $t('report.dashboardReports.doc.trendNote') }}
</template>

<script>
/**
 * DashboardReportTrends — page 7, Benchmarks & Trends (drawing page 9). The trend table is
 * drawn from the accounts — three years as drawn when the year before last was dropped on
 * step 2 (stage 5), two without it; the Stats NZ comparison (stage 3, Brief P9)
 * fills the left panel when the advisor chose an industry with published benchmarks —
 * you, the industry median, the middle half, and where you sit. Where Stats NZ publishes
 * no figure the row says so, and an industry without benchmarks leaves the panel saying
 * why rather than drawing invented medians (P3, P9).
 *
 * An arrow's colour follows the row's own sense: more revenue is up-good; more debtor days
 * is up-bad. That is a direction, not a threshold, so it needs no ruling. A benchmark
 * position is Stats NZ's own middle half, not a judgement: "within" is green, and "above"
 * and "below" carry the same amber light — above the median on liabilities is not good news.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, times, days, ratio2 } = require('~/utils/reportFormat')

/** Whether a rise in each row is good news. */
const RISE_IS_GOOD = { revenue: true, netProfit: true, netMargin: true, stockTurn: true, debtorDays: false }
/** How each Stats NZ ratio is printed: a share, a multiple, or a plain ratio. */
const BM_FORMAT = { returnOnEquity: 'pct', grossProfitRatio: 'pct', returnOnTotalAssets: 'pct', liabilityStructure: 'pct', wagesToTurnover: 'pct', quickRatio: 'ratio', currentRatio: 'ratio', stockTurnover: 'times' }

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
    /** `data.benchmarks` per `compareToIndustry`, or null when no industry was chosen. */
    benchmarks: { type: Object, default: null },
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
          earlierText: fmt(r.earlier === undefined ? null : r.earlier),
          priorText: fmt(r.prior),
          currentText: fmt(r.current),
          arrow: rose ? '↑' : (fell ? '↓' : ''),
          better: rose ? RISE_IS_GOOD[r.key] : !RISE_IS_GOOD[r.key]
        }
      })
    },
    benchmarkRows () {
      return this.benchmarks.rows.map((r) => {
        const f = this.bmFormatter(r.key)
        return {
          key: r.key,
          published: r.published,
          youText: r.you === null ? '—' : f(r.you),
          medianText: r.median === null ? '—' : f(r.median),
          rangeText: r.published ? f(r.p25) + ' – ' + f(r.p75) : '—',
          position: r.position,
          lightClass: r.position === 'within' ? 'is-good' : 'is-warn'
        }
      })
    },
    /** "Cafes and restaurants · small businesses by turnover, $249k – $506k · 2025 (provisional)". */
    benchmarkLine () {
      const b = this.benchmarks
      const band = this.$t('report.dashboardReports.doc.bm.bandLine', {
        band: this.$t('report.dashboardReports.setup.band.' + b.band.key).toLowerCase(),
        from: this.kMoney(b.band.min),
        to: this.kMoney(b.band.max)
      })
      const year = b.provisional ? this.$t('report.dashboardReports.doc.bm.yearProvisional', { year: b.year }) : String(b.year)
      return b.industry.name + ' · ' + band + ' · ' + year
    }
  },

  methods: {
    /** @param {string} unit @returns {Function} */
    formatter (unit) {
      if (unit === 'money') { return v => (v === null ? '—' : this.kMoney(v)) }
      if (unit === 'percent') { return v => pct(v) }
      if (unit === 'times') { return v => times(v) }
      return v => days(v)
    },
    /** @param {string} key @returns {Function} */
    bmFormatter (key) {
      const kind = BM_FORMAT[key]
      if (kind === 'pct') { return v => pct(v, 0) }
      if (kind === 'times') { return v => times(v) }
      return v => ratio2(v)
    }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-h3-lg { font-size: 18px; }
.drd-cur { color: var(--drd-blue); }
.drd-note { margin-top: 10px; }
.drd-bm { font-size: 12.5px; }
.drd-bm-line { margin: 0 0 8px; }
.drd-prov.is-stats { color: var(--drd-navy); border-color: var(--drd-navy); }
</style>

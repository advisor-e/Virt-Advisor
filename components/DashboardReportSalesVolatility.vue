<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.optional.salesVolatility.title')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.optional.addedByAdvisor')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.optional.salesVolatility.sub', { from: v.from, to: v.to }) }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-tiles
    .drd-tile(:class="scoreTone")
      .drd-tag-line {{ $t('report.dashboardReports.doc.optional.salesVolatility.score') }}
      .drd-v {{ Math.round(v.score) }}
      .drd-k
        span.drd-light(:class="'is-' + v.scoreBand")
        | {{ $t('report.volatility.band.' + v.scoreBand) }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.salesVolatility.scoreRead', { pct: pct100(v.score) }) }}
    .drd-tile.is-cyan
      .drd-tag-line {{ $t('report.dashboardReports.doc.optional.salesVolatility.average') }}
      .drd-v {{ kMoney(v.average) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.salesVolatility.averageK', { total: kMoney(v.total) }) }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.salesVolatility.averageRead') }}
    .drd-tile.is-cyan
      .drd-tag-line {{ $t('report.dashboardReports.doc.optional.salesVolatility.range') }}
      .drd-v.drd-v-range {{ kMoney(v.lower) }} – {{ kMoney(v.upper) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.salesVolatility.rangeK') }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.salesVolatility.' + (v.floored ? 'rangeFloored' : 'rangeRead')) }}
    .drd-tile(:class="outsideCount ? 'is-caution' : ''")
      .drd-tag-line {{ $t('report.dashboardReports.doc.optional.salesVolatility.outside') }}
      .drd-v {{ $t('report.dashboardReports.doc.optional.salesVolatility.outsideOf', { n: outsideCount, total: v.monthsUsed }) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.salesVolatility.outsideK') }}
      .drd-d {{ outsideRead }}
  .drd-cols.is-wide.dsvl-mid
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.salesVolatility.chart') }}
      band-bar-chart(
        :bars="bars"
        :average="v.average"
        :lower="v.lower"
        :upper="v.upper"
        :average-label="$t('report.dashboardReports.doc.optional.salesVolatility.averageLine', { amount: kMoney(v.average) })"
        :format-value="kMoney"
        :aria-label="$t('report.dashboardReports.doc.optional.salesVolatility.chart')")
      .drd-legend
        span
          i(style="background:#0070c0")
          | {{ $t('report.dashboardReports.doc.optional.salesVolatility.inside') }}
        span
          i(style="background:#ff9900")
          | {{ $t('report.dashboardReports.doc.optional.salesVolatility.outsideLegend') }}
        span
          i(style="background:#ebf4fa;border:1px solid #d5e1ee")
          | {{ kMoney(v.lower) }} – {{ kMoney(v.upper) }}
    .dsvl-reads
      .dsvl-read(v-if="v.highest")
        div
          .dsvl-rv {{ kMoney(v.highest.value) }}
          .dsvl-rk {{ $t('report.dashboardReports.doc.optional.salesVolatility.highest', { label: v.highest.label }) }}
        .dsvl-rr {{ highestRead }}
      .dsvl-read.is-caution(v-if="v.lowest")
        div
          .dsvl-rv {{ kMoney(v.lowest.value) }}
          .dsvl-rk {{ $t('report.dashboardReports.doc.optional.salesVolatility.lowest', { label: v.lowest.label }) }}
        .dsvl-rr {{ lowestRead }}
      .dsvl-read
        div
          .dsvl-rv {{ $t('report.dashboardReports.doc.optional.salesVolatility.outsideOf', { n: v.insideFirstBand, total: v.monthsUsed }) }}
          .dsvl-rk {{ $t('report.dashboardReports.doc.optional.salesVolatility.ordinary') }}
        .dsvl-rr {{ $t('report.dashboardReports.doc.optional.salesVolatility.ordinaryRead', { pct: pct(v.insideFirstBand / v.monthsUsed, 0) }) }}
  p.drd-small.dsvl-foot {{ $t('report.dashboardReports.doc.optional.salesVolatility.foot') }}
</template>

<script>
/**
 * DashboardReportSalesVolatility — the optional page "Sales Volatility" (drawing page 15 of
 * `design/mockups/business-performance-report-optional-pages.html`, approved 2026-09-08):
 * the score, the average month, the usual range one deviation either side, the months
 * outside it, and the twelve months as bars against the band. Every figure is
 * `figures.optional.salesVolatility`'s, which is the Volatility Report's own arithmetic on
 * the by-month Profit and Loss dropped at step 2, so the two screens cannot disagree. The
 * band words are the Volatility Report's, already ruled — read from its own locale block.
 *
 * Nothing on this page is typed; the three readings are built from the figures.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import BandBarChart from '~/components/base/BandBarChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, pct100 } = require('~/utils/reportFormat')

const TONE_BY_BAND = { good: '', warn: 'is-caution', crit: 'is-danger' }

export default {
  name: 'DashboardReportSalesVolatility',

  components: { DashboardReportPage, BandBarChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.optional.salesVolatility`, available. */
    v: { type: Object, required: true }
  },

  computed: {
    scoreTone () { return TONE_BY_BAND[this.v.scoreBand] || '' },
    bars () { return this.v.months.map(m => ({ label: m.label.slice(0, 3), value: m.value, outside: m.outside })) },
    outsideCount () { return this.v.months.filter(m => m.outside).length },
    outsideRead () {
      const k = 'report.dashboardReports.doc.optional.salesVolatility.'
      if (!this.outsideCount) { return this.$t(k + 'outsideNone') }
      const names = list => (list.length ? list.map(m => m.label).join(', ') : '—')
      return this.$t(k + 'outsideRead', {
        above: names(this.v.months.filter(m => m.outside && m.above)),
        below: names(this.v.months.filter(m => m.outside && !m.above))
      })
    },
    highestRead () {
      const h = this.v.highest
      const l = this.v.lowest
      const times = l && l.value > 0 ? (h.value / l.value).toFixed(1) : '—'
      return this.$t('report.dashboardReports.doc.optional.salesVolatility.highestRead', { times, more: this.kMoney(h.value - this.v.average) })
    },
    lowestRead () {
      const l = this.v.lowest
      const short = this.v.average - l.value
      const sd = this.v.standardDeviation > 0 ? (short / this.v.standardDeviation).toFixed(1) + '×' : '—'
      return this.$t('report.dashboardReports.doc.optional.salesVolatility.lowestRead', { less: this.kMoney(short), sd })
    }
  },

  methods: { pct, pct100 }
}
</script>

<style scoped>
/* The page is a fixed 16:9 sheet and carries four tiles, a chart, three readings and a
   definition line; the tiles and chart are held tighter than the drawing's so the foot line
   keeps its place above the footer (found in the production build 2026-09-08). */
.drd-tag-line { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--drd-blue); }
.drd-tiles .drd-tile { padding: 12px 14px 10px; }
.drd-tiles .drd-tile .drd-v { font-size: 26px; margin: 2px 0 4px; }
.drd-tiles .drd-tile .drd-d { font-size: 11px; margin-top: 4px; }
.drd-v-range { font-size: 21px; }
.dsvl-mid { margin-top: 12px; }
.dsvl-mid .drd-panel { padding: 12px 16px; }
.dsvl-reads { display: grid; gap: 8px; align-content: start; }
.dsvl-read { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center; border-radius: 12px; padding: 8px 12px; background: var(--drd-tint-blue); }
.dsvl-read.is-caution { background: var(--drd-tint-caution); }
.dsvl-rv { font: 700 19px/1.05 var(--drd-serif); color: var(--drd-navy); }
.dsvl-rk { font-weight: 700; font-size: 11px; color: var(--drd-ink); margin-top: 2px; }
.dsvl-rr { font-size: 11px; line-height: 1.3; }
.dsvl-foot { margin-top: 6px; }
</style>

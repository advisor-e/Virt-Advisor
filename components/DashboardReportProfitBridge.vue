<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.optional.profitBridge.title')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.optional.addedByAdvisor')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.optional.profitBridge.sub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.fromBothYears') }}
  .drd-cols.is-wide.drd-top
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.profitBridge.chartTitle', { prior: priorLabel, current: currentLabel }) }}
      waterfall-chart(:steps="chartSteps" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.optional.profitBridge.chartTitle', { prior: priorLabel, current: currentLabel })")
      .drd-legend
        span
          i(style="background:#4ca52d")
          | {{ $t('report.dashboardReports.doc.optional.profitBridge.added') }}
        span
          i(style="background:#ff9900")
          | {{ $t('report.dashboardReports.doc.optional.profitBridge.took') }}
    div
      table.drd-table
        thead
          tr
            th {{ $t('report.dashboardReports.doc.optional.profitBridge.movement') }}
            th.drd-n
            th {{ $t('report.dashboardReports.doc.optional.profitBridge.readAs') }}
        tbody
          tr(v-for="s in rows" :key="s.key")
            td {{ $t('report.dashboardReports.doc.optional.profitBridge.step.' + s.key) }}
            td.drd-n(:class="s.value >= 0 ? 'drd-up' : 'drd-down'") {{ signedMoney(s.value) }}
            td.drd-read {{ s.read }}
          tr.is-total
            td {{ $t('report.dashboardReports.doc.netProfit') }}
            td.drd-n {{ kMoney(b.prior.netProfit) }} → {{ kMoney(b.current.netProfit) }}
            td.drd-read {{ changeText }}
      .drd-panel.is-soft.drd-sentence
        p
          b {{ $t('report.dashboardReports.doc.optional.profitBridge.sentence') }}
          |
          | {{ sentence }}
  .drd-strip
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.revenue') }}
      .drd-sv {{ kMoney(b.prior.revenue) }} → {{ kMoney(b.current.revenue) }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.grossMargin') }}
      .drd-sv {{ pct(b.prior.grossMarginPct, 1) }} → {{ pct(b.current.grossMarginPct, 1) }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.profitBridge.strip.overheadsPct') }}
      .drd-sv {{ pct(share(b.prior.overheads, b.prior.revenue), 1) }} → {{ pct(share(b.current.overheads, b.current.revenue), 1) }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.profitBridge.step.belowLine') }}
      .drd-sv {{ kMoney(b.prior.belowLine) }} → {{ kMoney(b.current.belowLine) }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.netMargin') }}
      .drd-sv {{ pct(share(b.prior.netProfit, b.prior.revenue), 1) }} → {{ pct(share(b.current.netProfit, b.current.revenue), 1) }}
</template>

<script>
/**
 * DashboardReportProfitBridge — the optional page "Why profit changed" (drawing page 11 of
 * `design/mockups/business-performance-report-optional-pages.html`): a waterfall from last
 * year's net profit to this year's, the same steps as a table with a sentence each, one
 * sentence that names what added most and what took most, and a strip of the five figures
 * behind it. Every number is `figures.optional.profitBridge`'s; nothing here computes.
 *
 * One deviation from the drawing, recorded in the Brief §4: the "read as" sentences and
 * the one-sentence summary are built from the figures, never typed — the drawing's
 * "wages the largest part" was sample prose the accounts cannot support.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import WaterfallChart from '~/components/base/WaterfallChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct } = require('~/utils/reportFormat')

export default {
  name: 'DashboardReportProfitBridge',

  components: { DashboardReportPage, WaterfallChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.optional.profitBridge`, available. */
    b: { type: Object, required: true },
    priorLabel: { type: String, default: '' },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    /** Steps worth a row: other income is left off when it moved nothing. */
    rows () {
      return this.b.steps
        .filter(s => s.key !== 'otherIncome' || s.value !== 0)
        .map(s => ({ key: s.key, value: s.value, read: this.readOf(s) }))
    },
    chartSteps () {
      const t = k => this.$t('report.dashboardReports.doc.optional.profitBridge.chartStep.' + k)
      return [{ label: this.$t('report.dashboardReports.doc.optional.profitBridge.yearProfit', { label: this.priorLabel }), value: this.b.prior.netProfit, kind: 'start' }]
        .concat(this.rows.map(s => ({ label: t(s.key), value: s.value, kind: 'delta' })))
        .concat([{ label: this.$t('report.dashboardReports.doc.optional.profitBridge.yearProfit', { label: this.currentLabel }), value: this.b.current.netProfit, kind: 'end' }])
    },
    changeText () {
      const k = this.b.change >= 0 ? 'upBy' : 'downBy'
      return this.$t('report.dashboardReports.doc.optional.profitBridge.' + k, { amount: this.money(Math.abs(this.b.change)), pct: this.b.changePct === null ? '' : pct(Math.abs(this.b.changePct), 1) })
    },
    sentence () {
      const t = k => this.$t('report.dashboardReports.doc.optional.profitBridge.step.' + k).toLowerCase()
      const sorted = this.rows.slice().sort((a, b) => b.value - a.value)
      const added = sorted[0]
      const took = sorted[sorted.length - 1]
      if (!added || added.value <= 0) { return this.$t('report.dashboardReports.doc.optional.profitBridge.nothingAdded') }
      if (took.value >= 0) { return this.$t('report.dashboardReports.doc.optional.profitBridge.sentenceAllUp', { added: t(added.key), addedAmount: this.money(added.value) }) }
      return this.$t('report.dashboardReports.doc.optional.profitBridge.sentenceText', { added: t(added.key), addedAmount: this.money(added.value), took: t(took.key), tookAmount: this.money(-took.value) })
    }
  },

  methods: {
    pct,
    /** @param {number|null} v @param {number|null} of @returns {number|null} */
    share (v, of) { return of ? v / of : null },
    /** The sentence beside a step, from the two years' figures. @param {object} s */
    readOf (s) {
      const p = this.b.prior
      const c = this.b.current
      const k = 'report.dashboardReports.doc.optional.profitBridge.read.'
      if (s.key === 'salesGrowth') {
        return this.$t(k + (c.revenue >= p.revenue ? 'salesUp' : 'salesDown'), { amount: this.money(Math.abs(c.revenue - p.revenue)), margin: pct(p.grossMarginPct, 1), effect: this.money(Math.abs(s.value)) })
      }
      if (s.key === 'margin') { return this.$t(k + 'margin', { from: pct(p.grossMarginPct, 1), to: pct(c.grossMarginPct, 1), effect: this.money(Math.abs(s.value)) }) }
      if (s.key === 'otherIncome') { return this.$t(k + 'otherIncome', { from: this.money(p.otherIncome), to: this.money(c.otherIncome) }) }
      if (s.key === 'overheads') { return this.$t(k + 'overheads', { from: this.money(p.overheads), to: this.money(c.overheads) }) }
      return this.$t(k + 'belowLine', { from: this.money(p.belowLine), to: this.money(c.belowLine) })
    }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-read { font-size: 12px; color: var(--drd-body); }
.drd-sentence { margin-top: 12px; font-size: 13px; }
.drd-sentence p { margin: 0; }
</style>

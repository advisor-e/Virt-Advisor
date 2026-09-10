<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.optional.sensitivity.title')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.optional.addedByAdvisor')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.optional.sensitivity.sub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.fromThisYear') }}
  .drd-cols.is-wide.drd-top
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.sensitivity.chartTitle', { profit: money(sv.profit) }) }}
      h-bar-chart(:bars="bars" :format-value="leverText" :max-width="280" :aria-label="$t('report.dashboardReports.doc.optional.sensitivity.chartTitle', { profit: money(sv.profit) })")
      p.drd-small.drd-assume {{ $t('report.dashboardReports.doc.optional.sensitivity.assumption') }}
    div
      .drd-two
        .drd-tile.is-navy
          .drd-v {{ kMoney(sv.breakEvenSales) }}
          .drd-k {{ $t('report.dashboardReports.doc.optional.sensitivity.breakEven') }}
          .drd-d {{ $t('report.dashboardReports.doc.optional.sensitivity.breakEvenSub', { fixed: money(sv.fixedCosts), margin: pct(sv.contributionMarginPct, 0) }) }}
        .drd-tile(:class="sv.marginOfSafety >= 0 ? '' : 'is-danger'")
          .drd-v {{ pct(Math.abs(sv.marginOfSafetyPct), 0) }}
          .drd-k {{ $t('report.dashboardReports.doc.optional.sensitivity.' + (sv.marginOfSafety >= 0 ? 'safety' : 'shortfall')) }}
          .drd-d {{ $t('report.dashboardReports.doc.optional.sensitivity.' + (sv.marginOfSafety >= 0 ? 'safetySub' : 'shortfallSub'), { amount: kMoney(Math.abs(sv.marginOfSafety)) }) }}
      .drd-panel.is-caution.drd-reading
        p
          b {{ $t('report.dashboardReports.doc.optional.sensitivity.reading') }}
          |
          | {{ readingText }}
          span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-strip
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.sales') }}
      .drd-sv {{ kMoney(sv.revenue) }}
      span.drd-tag.is-rel {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.salesSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.costOfGoods') }}
      .drd-sv {{ kMoney(sv.costOfSales) }}
      span.drd-tag.is-uses {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.costOfSalesSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.contribution') }}
      .drd-sv {{ kMoney(sv.contribution) }} · {{ pct(sv.contributionMarginPct, 0) }}
      span.drd-tag.is-rel {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.contributionSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.fixed') }}
      .drd-sv {{ kMoney(sv.fixedCosts) }}
      span.drd-tag.is-uses {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.fixedSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.profit') }}
      .drd-sv {{ kMoney(sv.profit) }}
      span.drd-tag.is-rel {{ $t('report.dashboardReports.doc.optional.sensitivity.strip.profitSub', { contribution: kMoney(sv.contribution), fixed: kMoney(sv.fixedCosts) }) }}
</template>

<script>
/**
 * DashboardReportSensitivity — the optional page "What moves profit" (drawing page 13 of
 * `design/mockups/business-performance-report-optional-pages.html`): the four levers
 * ranked, break-even and margin of safety, a reading, and the working in a strip. Every
 * number is `figures.optional.profitSensitivity`'s.
 *
 * Deviation from the drawing, recorded in the Brief §4: the reading is built from the
 * figures (price against volume) and marked "from your accounts", where the drawing had it
 * as the advisor's typed prose.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import HBarChart from '~/components/base/HBarChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct } = require('~/utils/reportFormat')

/** The lever bars, brand navy down to sky in rank order. */
const COLOURS = ['#002b64', '#0070c0', '#00b1e0', '#7fd3f1']

export default {
  name: 'DashboardReportSensitivity',

  components: { DashboardReportPage, HBarChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.optional.profitSensitivity`, available. */
    sv: { type: Object, required: true }
  },

  computed: {
    bars () {
      return this.sv.levers.map((l, i) => ({
        label: this.$t('report.dashboardReports.doc.optional.sensitivity.chartLever.' + l.key),
        value: l.delta,
        colour: COLOURS[i] || COLOURS[COLOURS.length - 1]
      }))
    },
    readingText () {
      const price = this.sv.levers.find(l => l.key === 'price')
      const volume = this.sv.levers.find(l => l.key === 'volume')
      const times = volume.delta > 0 ? price.delta / volume.delta : null
      const top = this.sv.levers[0]
      return this.$t('report.dashboardReports.doc.optional.sensitivity.readingText', {
        top: this.$t('report.dashboardReports.doc.optional.sensitivity.name.' + top.key),
        times: times === null ? '' : this.num(times, 1)
      })
    }
  },

  methods: {
    pct,
    /** "+$36.5K · +7.2%" beside each bar. @param {number} v */
    leverText (v) {
      const lever = this.sv.levers.find(l => l.delta === v)
      const share = lever && lever.pctOfProfit !== null ? ' · +' + pct(lever.pctOfProfit, 1) : ''
      return '+' + this.kMoney(v) + share
    }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-assume { margin: 8px 0 0; }
.drd-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.drd-reading { margin-top: 14px; font-size: 13.5px; }
.drd-reading p { margin: 0; }
</style>

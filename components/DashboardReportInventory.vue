<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.inventory')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.inventorySub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
    span.drd-prov.is-typed {{ $t('report.dashboardReports.doc.enteredUntilReader') }}
  .drd-tiles
    .drd-tile.is-caution
      .drd-v {{ kMoney(inv.stockAtCost) }}
      .drd-k {{ $t('report.dashboardReports.doc.stockOnHand') }}
      .drd-d(:class="inv.stockChange === null ? '' : (inv.stockChange > 0 ? 'drd-down' : 'drd-up')") {{ change(inv.stockChange) }}
    .drd-tile.is-caution
      .drd-v {{ times(inv.stockTurn) }}
      .drd-k
        | {{ $t('report.dashboardReports.doc.turnoverPerYear') }}
        span.drd-prov.is-file {{ $t('report.dashboardReports.doc.accounts') }}
      .drd-d {{ from(inv.stockTurnPrior, times) }}
    .drd-tile.is-caution
      .drd-v {{ days(inv.stockDays) }} {{ inv.stockDays === null ? '' : $t('report.dashboardReports.doc.days') }}
      .drd-k
        | {{ $t('report.dashboardReports.doc.averageDaysOnShelf') }}
        span.drd-prov.is-file {{ $t('report.dashboardReports.doc.accounts') }}
      .drd-d {{ from(inv.stockDaysPrior, days) }}
    .drd-tile.is-caution
      .drd-v {{ inv.slowObsolete === null ? '—' : kMoney(inv.slowObsolete) }}
      .drd-k {{ $t('report.dashboardReports.doc.slowObsoleteStock') }}
      .drd-d.drd-red(v-if="inv.slowObsoletePct !== null") {{ $t('report.dashboardReports.doc.ofTotalHolding', { pct: pct(inv.slowObsoletePct, 0) }) }}
  .drd-cols.drd-mid
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.stockByCategory') }}
      .drd-gap {{ $t('report.dashboardReports.doc.categoryLater') }}
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.stockAgeing') }}
      h-bar-chart(v-if="inv.ageing" :bars="ageingBars" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.stockAgeing')")
      .drd-gap(v-else) {{ $t('report.dashboardReports.doc.ageingBlank') }}
  p.drd-small.drd-def {{ $t('report.dashboardReports.doc.stockTurnDefinition') }}
</template>

<script>
/**
 * DashboardReportInventory — page 6, Inventory Performance (drawing page 8). Stock at
 * cost, turnover and days on the shelf are the accounts'; slow-or-obsolete stock and the
 * ageing bands are the advisor's until the inventory reader exists (stage 4), and the
 * category chart is left off with that said (Brief P3, ruling 3).
 *
 * "Turnover per year" keeps the workbook's own definition — trading income over current
 * assets (Brief §3, the four quirks) — and the page says so in its foot line.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import HBarChart from '~/components/base/HBarChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { times, days, pct } = require('~/utils/reportFormat')
const { AGEING_BANDS } = require('~/utils/dashboardReportsSavedShape')

const AGEING_COLOURS = ['#0070c0', '#0070c0', '#0070c0', '#ff9900', '#ff0000']

export default {
  name: 'DashboardReportInventory',

  components: { DashboardReportPage, HBarChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.inventory` */
    inv: { type: Object, required: true }
  },

  computed: {
    /** Oldest band first, as the deck draws it. */
    ageingBars () {
      return AGEING_BANDS.map((b, i) => ({
        label: this.$t('report.dashboardReports.inventory.band.' + b),
        value: this.inv.ageing[i],
        colour: AGEING_COLOURS[i]
      })).reverse()
    }
  },

  methods: {
    times,
    days,
    pct,
    change (v) {
      if (v === null || v === undefined) { return '' }
      return (v > 0 ? '▲ ' : '▼ ') + this.kMoney(Math.abs(v)) + ' ' + this.$t('report.dashboardReports.doc.vsLastYear')
    },
    from (prior, fmt) {
      if (prior === null || prior === undefined) { return '' }
      return this.$t('report.dashboardReports.doc.fromLastYear', { value: fmt(prior) })
    }
  }
}
</script>

<style scoped>
.drd-mid { margin-top: 14px; }
.drd-red { color: #9c2323; }
.drd-def { margin-top: 10px; }
</style>

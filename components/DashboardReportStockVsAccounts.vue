<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.optional.stockVsAccounts.title')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.optional.addedByAdvisor')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.sub', { package: sv.package }) }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.fromExport') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.fromAccounts') }}
  .drd-tiles
    .drd-tile(:class="sv.agrees ? '' : 'is-caution'")
      .drd-v {{ kMoney(sv.fileTotal) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.fileAtCost') }}
      .drd-d {{ gapText }}
    .drd-tile
      .drd-v {{ kMoney(sv.notYetSold) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.notYetSold') }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.notYetSoldRead', { pct: pct(sv.notYetSoldShare, 0) }) }}
    .drd-tile
      .drd-v {{ kMoney(sv.alreadySold) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.alreadySold') }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.alreadySoldRead', { pct: pct(sv.alreadySoldShare, 0) }) }}
    .drd-tile
      .drd-v {{ sv.onOrderValue === null ? '—' : kMoney(sv.onOrderValue) }}
      .drd-k {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.onOrder') }}
      .drd-d {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.' + (sv.onOrderValue === null ? 'onOrderAbsent' : 'onOrderRead')) }}
  .drd-cols.drd-mid
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.byCategory', { total: kMoney(sv.fileTotal) }) }}
      h-bar-chart(v-if="categoryBars.length" :bars="categoryBars" :format-value="kMoney" :max-width="260" :aria-label="$t('report.dashboardReports.doc.optional.stockVsAccounts.byCategory', { total: kMoney(sv.fileTotal) })")
      .drd-gap(v-else) {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.noGroups') }}
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.byLocation') }}
      h-bar-chart(v-if="locationBars.length" :bars="locationBars" :format-value="kMoney" :max-width="260" :aria-label="$t('report.dashboardReports.doc.optional.stockVsAccounts.byLocation')")
      .drd-gap(v-else) {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.noGroups') }}
  .drd-reads
    .drd-read-tile
      div
        .drd-rv {{ fundedText }}
        .drd-rk {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.daysFunded') }}
      .drd-rr {{ fundedRead }}
    .drd-read-tile.is-caution
      div
        .drd-rv —
        .drd-rk {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.ageing') }}
      .drd-rr {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.ageingRead') }}
  p.drd-small.drd-def
    | {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.costBasis', { package: sv.package, basis: $t('report.dashboardReports.doc.optional.stockVsAccounts.basis.' + sv.costBasis) }) }}
    |
    | {{ $t('report.dashboardReports.doc.optional.stockVsAccounts.' + (sv.currencyAssumed ? 'currencyAssumed' : 'currencyRead'), { currency: sv.currency }) }}
</template>

<script>
/**
 * DashboardReportStockVsAccounts — the optional page "Stock against the accounts"
 * (drawing page 14 of `design/mockups/business-performance-report-optional-pages.html`):
 * the stock export's total against the balance sheet's stock line, the file split into
 * already sold, not yet sold and on order, where the value sits by category and by
 * location, and who funds the shelf. Every number is `figures.optional.stockVsAccounts`'s.
 *
 * A gap against the balance sheet is printed with its size; the file does not win and
 * neither do the accounts. Ageing is stated as absent, because neither export carries a
 * date. The cost basis and the currency the file was read in are printed in the foot line.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import HBarChart from '~/components/base/HBarChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, days } = require('~/utils/reportFormat')

/** How many groups a bar chart shows before the rest is one bar. */
const MAX_BARS = 6

export default {
  name: 'DashboardReportStockVsAccounts',

  components: { DashboardReportPage, HBarChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.optional.stockVsAccounts`, available. */
    sv: { type: Object, required: true }
  },

  computed: {
    gapText () {
      const k = 'report.dashboardReports.doc.optional.stockVsAccounts.'
      if (this.sv.agrees) { return this.$t(k + 'agrees', { accounts: this.money(this.sv.accountsStock) }) }
      return this.$t(k + 'gap', { accounts: this.money(this.sv.accountsStock), gap: this.money(Math.abs(this.sv.gap)), pct: pct(this.sv.gapPct === null ? null : Math.abs(this.sv.gapPct), 0) })
    },
    categoryBars () { return this.bars(this.sv.categories) },
    locationBars () { return this.bars(this.sv.locations) },
    fundedText () {
      if (this.sv.daysFundedBySuppliers === null) { return '—' }
      return this.$t('report.dashboardReports.doc.optional.stockVsAccounts.daysOf', { funded: days(this.sv.daysFundedBySuppliers), days: days(this.sv.stockDays) })
    },
    fundedRead () {
      const k = 'report.dashboardReports.doc.optional.stockVsAccounts.'
      if (this.sv.daysFundedBySuppliers === null) { return this.$t(k + 'daysFundedUnknown') }
      const p = { stockDays: days(this.sv.stockDays), creditorDays: days(this.sv.creditorDays), carried: days(this.sv.daysCarried) }
      return this.$t(k + (this.sv.daysCarried > 0 ? 'daysFundedReadCarried' : 'daysFundedReadCovered'), p)
    }
  },

  methods: {
    /**
     * Largest first, as the reader sorts them; beyond the chart's room the tail is one bar.
     * @param {Array<{name:string, value:number}>} groups
     * @returns {Array<{label:string, value:number, colour:string}>}
     */
    bars (groups) {
      const list = groups.filter(g => Number.isFinite(g.value) && g.value > 0)
      const head = list.slice(0, MAX_BARS)
      const tail = list.slice(MAX_BARS)
      const out = head.map(g => ({ label: g.name, value: g.value, colour: '#0070c0' }))
      if (tail.length) {
        out.push({ label: this.$t('report.dashboardReports.doc.optional.stockVsAccounts.otherGroups', { n: tail.length }), value: tail.reduce((t, g) => t + g.value, 0), colour: '#9dc2e8' })
      }
      return out
    },
    pct
  }
}
</script>

<style scoped>
.drd-reads { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.drd-read-tile { display: grid; grid-template-columns: 112px 1fr; gap: 12px; align-items: center; border-radius: 12px; padding: 12px 14px; background: var(--drd-tint-blue); }
.drd-read-tile.is-caution { background: var(--drd-tint-caution); }
.drd-rv { font: 700 24px/1.05 var(--drd-serif); color: var(--drd-navy); }
.drd-rk { font-weight: 700; font-size: 12px; color: var(--drd-ink); margin-top: 3px; }
.drd-rr { font-size: 12.5px; }
</style>

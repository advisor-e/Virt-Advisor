<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.cashFlow')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.driversFoot')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.cashFlowSub') }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cycle
    .drd-tile(:class="tileTone(driver('stockDays'))")
      .drd-v {{ days(cf.stockDays) }} {{ unitDays(cf.stockDays) }}
      .drd-k {{ $t('report.dashboardReports.doc.stockOnShelf') }}
      .drd-d.drd-small {{ $t('report.dashboardReports.doc.dio') }}
    .drd-op +
    .drd-tile(:class="tileTone(driver('debtorDays'))")
      .drd-v {{ days(cf.debtorDays) }} {{ unitDays(cf.debtorDays) }}
      .drd-k {{ $t('report.dashboardReports.doc.waitingToBePaid') }}
      .drd-d.drd-small {{ $t('report.dashboardReports.doc.dso') }}
    .drd-op −
    .drd-tile.is-cyan
      .drd-v {{ days(cf.creditorDays) }} {{ unitDays(cf.creditorDays) }}
      .drd-k {{ $t('report.dashboardReports.doc.timeToPaySuppliers') }}
      .drd-d.drd-small {{ $t('report.dashboardReports.doc.dpo') }}
    .drd-op =
    .drd-tile.is-navy
      .drd-v {{ days(cf.cashCycleDays) }} {{ unitDays(cf.cashCycleDays) }}
      .drd-k {{ $t('report.dashboardReports.doc.cashLocked') }}
      .drd-d.drd-small {{ cycleChange }}
  .drd-cols.is-wide.drd-mid
    .drd-panel
      template(v-if="bankLine")
        h3.drd-h3 {{ $t('report.dashboardReports.doc.closingBankByMonth') }}
        line-chart(:points="bankPoints" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.closingBankByMonth')")
        p.drd-small {{ bankNote }}
      template(v-else)
        h3.drd-h3 {{ $t('report.dashboardReports.doc.closingBank') }}
        .drd-bank-chart
          bar-pair-chart(:groups="bankGroups" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.closingBank')")
        .drd-legend
          span
            i(style="background:#0070c0")
            | {{ priorLabel || '—' }}
          span
            i(style="background:#00b1e0")
            | {{ currentLabel }}
        p.drd-small {{ $t('report.dashboardReports.doc.bankByMonthAbsent') }}
    .drd-panel.is-danger
      .drd-bang !
      h3.drd-h3
        | {{ $t('report.dashboardReports.doc.watchPoint') }}
        span.drd-prov.is-typed {{ $t('report.dashboardReports.doc.advisor') }}
      p.drd-watch {{ cashWatch || $t('report.dashboardReports.doc.noWatchYet') }}
  .drd-drivers
    .drd-drv(v-for="dr in cf.drivers" :key="dr.key")
      .drd-dk {{ $t('report.dashboardReports.doc.driver.' + dr.key) }}
      .drd-dv {{ driverValue(dr) }}
      span.drd-c(v-if="dr.direction" :class="'is-' + dr.direction") {{ $t('report.dashboardReports.doc.' + dr.direction + 'Cash') }}
      span.drd-c.is-none(v-else) {{ $t('report.dashboardReports.doc.noMovement') }}
</template>

<script>
/**
 * DashboardReportCashFlow — page 5, Cash Flow & Working Capital (drawing page 7): the cash
 * conversion cycle as three tiles and their sum, the closing bank position, the advisor's
 * watch-point, and the seven cash drivers each saying whether it used or released cash —
 * the reading the Cash Drivers material supplies and the deck does not.
 *
 * The stock and debtor tiles take their tint from the firm's band where one exists (P5).
 * The closing bank line is month by month from the by-month Balance Sheet dropped on step
 * 2 (stage 5), the lowest month marked as the deck marks the dip; without one it is this
 * year's closing balance against last year's, and the page says how to get the line.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import BarPairChart from '~/components/base/BarPairChart.vue'
import LineChart from '~/components/base/LineChart.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { days, pct100, pts } = require('~/utils/reportFormat')

const TONE_BY_BAND = { good: '', warn: 'is-caution', crit: 'is-danger' }

export default {
  name: 'DashboardReportCashFlow',

  components: { DashboardReportPage, BarPairChart, LineChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.cashFlow` */
    cf: { type: Object, required: true },
    cashWatch: { type: String, default: '' },
    /** `figures.monthly` (stage 5), or null. */
    monthly: { type: Object, default: null },
    priorLabel: { type: String, default: '' },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    bankLine () {
      const b = this.monthly && this.monthly.bank
      return b && b.available ? b : null
    },
    /** Twelve slots take the month's three letters; the year is in the page's period line (found in the production build 2026-09-08: the full labels overlapped). */
    bankPoints () {
      return this.bankLine.points.map(p => ({ label: String(p.label || '').slice(0, 3), value: p.value }))
    },
    bankNote () {
      const b = this.bankLine
      const parts = []
      if (b.lowest) { parts.push(this.$t('report.dashboardReports.doc.bankLowest', { label: b.lowest.label, amount: this.kMoney(b.lowest.value) })) }
      const missing = b.points.filter(p => !p.complete).length
      if (missing) { parts.push(this.$t('report.dashboardReports.doc.bankMonthsMissing', { n: missing })) }
      return parts.join(' ')
    },
    bankGroups () {
      return [{ label: this.$t('report.dashboardReports.doc.closingBankShort'), a: this.cf.bankPrior, b: this.cf.bankNow }]
    },
    cycleChange () {
      const d = this.cf.cashCycleChangeDays
      if (d === null || d === undefined) { return this.$t('report.dashboardReports.doc.noLastYear') }
      if (d === 0) { return this.$t('report.dashboardReports.doc.sameAsLastYear') }
      return this.$t(d > 0 ? 'report.dashboardReports.doc.slowerThanLastYear' : 'report.dashboardReports.doc.fasterThanLastYear', { n: Math.round(Math.abs(d)) })
    }
  },

  methods: {
    days,
    /** @param {string} key @returns {object|null} */
    driver (key) { return this.cf.drivers.find(d => d.key === key) || null },
    /** @param {object|null} d @returns {string} the tile tint for a band, or the plain tint */
    tileTone (d) { return d && d.band ? TONE_BY_BAND[d.band] : '' },
    unitDays (v) { return v === null || v === undefined ? '' : this.$t('report.dashboardReports.doc.days') },
    /** A driver's figure in its own unit. @param {object} d @returns {string} */
    driverValue (d) {
      if (d.value === null || d.value === undefined) {
        return d.key === 'salesGrowth' && d.movement !== null ? pts(d.movement).replace(' pts', '%') : '—'
      }
      if (d.unit === 'money') { return this.kMoney(d.value) }
      if (d.unit === 'days') { return days(d.value) }
      if (d.key === 'salesGrowth') { return (d.movement > 0 ? '+' : '') + pct100(d.movement) }
      return pct100(d.value)
    }
  }
}
</script>

<style scoped>
.drd-cycle { display: grid; grid-template-columns: 1fr 30px 1fr 30px 1fr 30px 1.05fr; align-items: stretch; gap: 8px; }
.drd-op { align-self: center; text-align: center; font: 700 26px var(--drd-serif); color: var(--drd-muted); }
.drd-mid { margin-top: 12px; }
/* The page is a fixed 16:9 sheet: the chart is held to a height that leaves the drivers
   row its place above the footer. */
.drd-bank-chart { max-width: 300px; margin: 0 auto; }
.drd-mid .drd-panel { padding: 12px 16px; }
.drd-bang { width: 30px; height: 30px; border-radius: 8px; background: var(--drd-caution); color: #fff; display: grid; place-items: center; font-weight: 700; margin-bottom: 8px; }
.drd-watch { margin: 0; font-size: 13.5px; }
.drd-drivers { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-top: 14px; }
.drd-drv { border: 1px solid var(--drd-line); border-radius: 8px; padding: 7px 9px; font-size: 11px; background: #fff; }
.drd-dk { font-weight: 700; color: var(--drd-ink); line-height: 1.2; }
.drd-dv { font: 700 16px/1.1 var(--drd-serif); color: var(--drd-navy); margin: 3px 0 1px; }
.drd-c { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-radius: 999px; padding: 1px 6px; margin-top: 3px; }
.drd-c.is-uses { background: var(--drd-tint-caution); color: #8a5a00; }
.drd-c.is-releases { background: var(--drd-tint-good); color: #2f6b19; }
.drd-c.is-none { background: var(--drd-tint-sky); color: var(--drd-muted); }
@media screen and (max-width: 900px) {
  .drd-cycle { grid-template-columns: 1fr 1fr; }
  .drd-op { display: none; }
  .drd-drivers { grid-template-columns: 1fr 1fr; }
}
</style>

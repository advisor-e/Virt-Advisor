<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.balanceSheetTitle')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.balanceSheetSub', { date: balanceDate }) }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-cols.drd-top
    div
      .drd-panel
        h3.drd-h3 {{ $t('report.dashboardReports.doc.ownVsOwe') }}
        svg.drd-stack(viewBox="0 0 520 210" role="img" :aria-label="$t('report.dashboardReports.doc.ownVsOwe')")
          line.drd-axis(x1="44" x2="510" y1="170" y2="170")
          g(v-for="(bar, i) in stacks" :key="i")
            rect(v-for="(seg, j) in bar.segments" :key="j" :x="bar.x" :y="seg.y" width="120" :height="seg.h" :fill="seg.colour")
            text.drd-lab(v-for="(seg, j) in bar.segments" :key="'t' + j" :x="bar.x + 60" :y="seg.y + seg.h / 2 + 4" text-anchor="middle" :fill="seg.text") {{ seg.h > 14 ? kMoney(seg.value) : '' }}
            text.drd-lab(:x="bar.x + 60" y="192" text-anchor="middle") {{ bar.label }}
        .drd-legend
          span
            i(style="background:#0070c0")
            | {{ $t('report.dashboardReports.doc.current') }}
          span
            i(style="background:#00b1e0")
            | {{ $t('report.dashboardReports.doc.nonCurrent') }}
          span
            i(style="background:#002b64")
            | {{ $t('report.dashboardReports.doc.equity') }}
      .drd-panel.is-soft.drd-net
        p
          b {{ $t('report.dashboardReports.doc.netPosition') }}:
          |
          | {{ netPosition }}
    .drd-reads
      .drd-read
        div
          .drd-rv {{ times(c.currentRatio) }}
          .drd-rk {{ $t('report.dashboardReports.doc.currentRatio') }}
        .drd-r {{ $t('report.dashboardReports.doc.currentRatioRead', { amount: money2(c.currentRatio) }) }}
      .drd-read
        div
          .drd-rv {{ ratio2(c.debtToEquity) }}
          .drd-rk {{ $t('report.dashboardReports.doc.debtToEquity') }}
        .drd-r {{ $t('report.dashboardReports.doc.debtToEquityRead', { amount: money2(c.debtToEquity) }) }}
      .drd-read.is-caution
        div
          .drd-rv {{ kMoney(c.workingCapital) }}
          .drd-rk {{ $t('report.dashboardReports.doc.workingCapital') }}
        .drd-r
          | {{ $t('report.dashboardReports.doc.workingCapitalRead') }}
          template(v-if="b.workingCapitalChange !== null")
            |
            | {{ $t(b.workingCapitalChange >= 0 ? 'report.dashboardReports.doc.upOnLastYear' : 'report.dashboardReports.doc.downOnLastYear', { amount: kMoney(Math.abs(b.workingCapitalChange)) }) }}
</template>

<script>
/**
 * DashboardReportBalanceSheet — page 4, the Balance Sheet Summary (drawing page 6): what
 * the business owns against what it owes and its equity, the net position, and three
 * readings.
 *
 * The readings are arithmetic, not verdicts: "$2.10 in short-term assets for every $1
 * owed soon" is the ratio said in words. The drawing's "Healthy (target > 1.5)" is a
 * judgement with no ruled threshold behind it, so it is not printed (Brief P3).
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { times, ratio2, signedPct } = require('~/utils/reportFormat')

export default {
  name: 'DashboardReportBalanceSheet',

  components: { DashboardReportPage },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.balanceSheet` — `{ current, prior, equityChangePct, workingCapitalChange }` */
    b: { type: Object, required: true },
    balanceDate: { type: String, default: '' }
  },

  computed: {
    c () { return this.b.current },
    /** Two stacked bars on one scale: assets, and liabilities plus equity. */
    stacks () {
      const c = this.c
      const total = Math.max(c.totalAssets, c.totalLiabilities + Math.max(c.equity, 0), 1)
      const span = 150
      const build = (x, label, parts) => {
        let y = 170
        const segments = parts.filter(p => p.value > 0).map((p) => {
          const h = (p.value / total) * span
          y -= h
          return { value: p.value, h, y, colour: p.colour, text: p.text }
        })
        return { x, label, segments }
      }
      return [
        build(120, this.$t('report.dashboardReports.doc.assets'), [
          { value: c.currentAssets, colour: '#0070c0', text: '#fff' },
          { value: c.nonCurrentAssets, colour: '#00b1e0', text: '#002b64' }
        ]),
        build(320, this.$t('report.dashboardReports.doc.liabilitiesPlusEquity'), [
          { value: c.currentLiabilities, colour: '#0070c0', text: '#fff' },
          { value: c.nonCurrentLiabilities, colour: '#00b1e0', text: '#002b64' },
          { value: c.equity, colour: '#002b64', text: '#fff' }
        ])
      ]
    },
    netPosition () {
      const base = this.$t('report.dashboardReports.doc.equityOf', { amount: kMoneyOf(this) })
      if (this.b.equityChangePct === null || this.b.equityChangePct === undefined) { return base }
      return base + ' ' + this.$t('report.dashboardReports.doc.equityChange', { change: signedPct(this.b.equityChangePct) })
    }
  },

  methods: { times, ratio2 }
}

/** @param {object} vm @returns {string} the equity, in the firm's currency */
function kMoneyOf (vm) { return vm.kMoney(vm.c.equity) }
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-stack { display: block; width: 100%; height: auto; }
.drd-axis { stroke: #d5e1ee; stroke-width: 1; }
.drd-lab { font-size: 11.5px; fill: #5b6f8a; font-weight: 600; font-family: inherit; }
.drd-net { margin-top: 14px; font-size: 14px; }
.drd-net p { margin: 0; }
.drd-reads { display: grid; gap: 12px; align-content: start; }
.drd-read { display: grid; grid-template-columns: 110px 1fr; gap: 14px; align-items: center; border-radius: 12px; padding: 14px 16px; background: var(--drd-tint-blue); }
.drd-read.is-caution { background: var(--drd-tint-caution); }
.drd-rv { font: 700 30px/1.05 var(--drd-serif); color: var(--drd-navy); }
.drd-rk { font-weight: 700; font-size: 12.5px; color: var(--drd-ink); margin-top: 4px; }
.drd-r { font-size: 13px; }
</style>

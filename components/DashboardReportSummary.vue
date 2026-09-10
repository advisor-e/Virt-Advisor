<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.summary')" :number="number" :client-name="clientName" :period="period")
  template(#sub)
    | {{ words.summary || $t('report.dashboardReports.doc.summarySubDefault', { period }) }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
  .drd-tiles
    .drd-tile
      .drd-v {{ kMoney(s.revenue) }}
      .drd-k {{ $t('report.dashboardReports.doc.revenue') }}
      .drd-d(:class="tone(s.revenueChangePct)") {{ arrow(s.revenueChangePct) }} {{ signedPct(s.revenueChangePct) }} {{ vsLastYear(s.revenueChangePct) }}
    .drd-tile.is-cyan
      .drd-v {{ kMoney(s.netProfit) }}
      .drd-k {{ $t('report.dashboardReports.doc.netProfit') }}
      .drd-d(:class="tone(s.netProfitChangePct)") {{ arrow(s.netProfitChangePct) }} {{ signedPct(s.netProfitChangePct) }} {{ vsLastYear(s.netProfitChangePct) }}
    .drd-tile.is-caution
      .drd-v {{ pct(s.netMarginPct) }}
      .drd-k {{ $t('report.dashboardReports.doc.netMargin') }}
      .drd-d(:class="tone(s.netMarginChangePts)") {{ arrow(s.netMarginChangePts) }} {{ pts(s.netMarginChangePts === null ? null : s.netMarginChangePts * 100) }} {{ vsLastYear(s.netMarginChangePts) }}
    .drd-tile.is-danger
      .drd-v {{ days(s.cashCycleDays) }} {{ s.cashCycleDays === null ? '' : $t('report.dashboardReports.doc.days') }}
      .drd-k {{ $t('report.dashboardReports.doc.cashCycle') }}
      .drd-d(:class="tone(s.cashCycleChangeDays === null ? null : -s.cashCycleChangeDays)") {{ cycleChange }}
  .drd-cols.is-wide
    div
      h3.drd-h3.drd-h3-lg
        | {{ $t('report.dashboardReports.doc.wentWellWatch') }}
        span.drd-prov.is-typed {{ $t('report.dashboardReports.doc.advisor') }}
      ul.drd-list
        li(v-for="(w, i) in wentWell" :key="'g' + i")
          span.drd-ok ✔
          span {{ w }}
        li(v-for="(w, i) in watch" :key="'w' + i")
          span.drd-w !
          span {{ w }}
        li.drd-none(v-if="!wentWell.length && !watch.length")
          span
          span {{ $t('report.dashboardReports.doc.noWordsYet') }}
    .drd-panel.is-soft
      h3.drd-h3.drd-score-title {{ $t('report.dashboardReports.doc.healthScore') }}
      .drd-score(v-if="score.score !== null")
        svg.drd-ring(viewBox="0 0 120 120" role="img" :aria-label="$t('report.dashboardReports.doc.healthScore')")
          circle(cx="60" cy="60" r="52" fill="none" stroke="#d5e1ee" stroke-width="14")
          circle(cx="60" cy="60" r="52" fill="none" stroke="#0070c0" stroke-width="14" :stroke-dasharray="ringDash" transform="rotate(-90 60 60)")
          text.drd-ring-v(x="60" y="70" text-anchor="middle") {{ score.score }}
        div
          b.drd-band(:class="'is-' + score.band") {{ $t('report.dashboardReports.doc.band.' + score.band) }}
          p.drd-score-read {{ reading }}
      .drd-gap(v-else) {{ $t('report.dashboardReports.doc.noScore') }}
      p.drd-small.drd-score-note {{ $t('report.dashboardReports.doc.scoreMethod', { n: score.total }) }}
</template>

<script>
/**
 * DashboardReportSummary — page 1, the Executive Summary (drawing page 3): the four
 * headline tiles with their movements, the advisor's went-well and watch lines, and the
 * Business Health Score with how it is made and the Piotroski F-score cited (Brief P10,
 * Mike's ruling of 2026-09-07).
 *
 * The score's reading names the measures that pulled it down, so it is a summary of the
 * pages after it and nothing more. Where no measure is banded there is no score, and the
 * panel says so instead of drawing a ring at zero.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import currencyMixin from '~/mixins/currencyMixin'
const { pct, pts, signedPct, days } = require('~/utils/reportFormat')

const RING = 2 * Math.PI * 52

export default {
  name: 'DashboardReportSummary',

  components: { DashboardReportPage },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.summary` from the pages route. */
    s: { type: Object, required: true },
    /** `figures.score` */
    score: { type: Object, required: true },
    /** The advisor's words. */
    words: { type: Object, required: true }
  },

  computed: {
    wentWell () { return this.words.wentWell.filter(Boolean) },
    watch () { return this.words.watch.filter(Boolean) },
    ringDash () {
      const share = Math.max(0, Math.min(100, this.score.score || 0)) / 100
      return (share * RING) + ' ' + RING
    },
    /** "Profitability strong; cash and stock pull the score down" — from the measures, in words. */
    reading () {
      const down = this.score.pulledDown.map(k => this.$t('report.dashboardReports.doc.measure.' + k))
      if (!down.length) { return this.$t('report.dashboardReports.doc.scoreAllGreen', { n: this.score.total }) }
      return this.$t('report.dashboardReports.doc.scorePulledDown', { green: this.score.green, n: this.score.total, list: down.join(', ') })
    },
    cycleChange () {
      const d = this.s.cashCycleChangeDays
      if (d === null || d === undefined) { return '—' }
      if (d === 0) { return this.$t('report.dashboardReports.doc.sameAsLastYear') }
      return this.$t(d > 0 ? 'report.dashboardReports.doc.slowerBy' : 'report.dashboardReports.doc.fasterBy', { n: Math.round(Math.abs(d)) })
    }
  },

  methods: {
    pct,
    pts,
    signedPct,
    days,
    arrow (v) { return v === null || v === undefined || v === 0 ? '' : (v > 0 ? '▲' : '▼') },
    tone (v) { return v === null || v === undefined || v === 0 ? '' : (v > 0 ? 'drd-up' : 'drd-down') },
    vsLastYear (v) { return v === null || v === undefined ? '' : this.$t('report.dashboardReports.doc.vsLastYear') }
  }
}
</script>

<style scoped>
.drd-h3-lg { font-size: 17px; }
.drd-list { list-style: none; padding: 0; margin: 0; }
.drd-list li { display: grid; grid-template-columns: 28px 1fr; gap: 10px; align-items: start; margin: 12px 0; font-size: 14px; }
.drd-ok { width: 24px; height: 24px; border-radius: 50%; background: var(--drd-good); color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 700; }
.drd-w { width: 24px; height: 24px; border-radius: 6px; background: var(--drd-caution); color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 700; }
.drd-none { color: var(--drd-muted); }
.drd-score-title { text-align: center; font-size: 16px; }
.drd-score { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; }
.drd-ring { width: 120px; height: 120px; }
.drd-ring-v { font: 700 34px var(--drd-serif); fill: var(--drd-navy); }
.drd-band { font-size: 17px; letter-spacing: .04em; text-transform: uppercase; }
.drd-band.is-good { color: #2f6b19; }
.drd-band.is-steady { color: #8a5a00; }
.drd-band.is-atRisk { color: #9c2323; }
.drd-score-read { margin: 4px 0 0; font-size: 13px; }
.drd-score-note { margin-top: 10px; }
</style>

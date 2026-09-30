<template lang="pug">
section.twg(v-if="g")
  h2.twg-h {{ $t(P + 'heading') }}
  p.twg-sub {{ sub }}
  .twg-tiles
    .twg-tile
      .k {{ yearCount > 1 ? $t(P + 'salesMany', { n: yearCount }) : $t(P + 'salesOne') }}
      .v {{ cash(g.revenue) }}
      .d {{ $t(P + 'exGst') }}
    .twg-tile
      .k {{ $t(P + 'gross') }}
      .v {{ cash(g.gross) }}
      .d {{ $t(P + 'ofSales', { pct: pct(g.revenue ? g.gross / g.revenue : 0) }) }}
    .twg-tile(:class="pbtTile.tone")
      .k {{ $t(P + 'pbt') }}
      .v {{ cash(g.pbt) }}
      .d {{ pbtTile.text }}
    .twg-tile(:class="bankTile.tone")
      .k {{ $t(P + 'bankAt', { date: longDate(g.end) }) }}
      .v {{ cash(g.closing) }}
      .d {{ bankTile.text }}
  .twg-cols
    .twg-panel
      h3 {{ $t(P + 'bankChart') }}
      month-chart(
        kind="line"
        :values="[g.opening].concat(g.bank)"
        :labels="[$t(P + 'open')].concat(g.months)"
        :lowest-label="$t(P + 'lowest', { amount: plain(Math.min(g.opening, ...g.bank)) })"
        :aria-label="$t(P + 'bankChart')")
    .twg-panel
      h3 {{ $t(P + 'pbtChart') }}
      month-chart(kind="bars" :values="g.pbtMonths" :labels="g.months" :aria-label="$t(P + 'pbtChart')")
    .twg-panel.soft
      h3 {{ $t(P + 'cashWent') }}
      table.twg-flow
        tr(v-for="a in activities" :key="a.key")
          td {{ $t(a.label) }}
          td.n {{ plain(a.value) }}
        tr.total
          td {{ $t(P + 'netMovement') }}
          td.n {{ plain(g.movement) }}
      h3.twg-wc {{ yearCount > 1 ? $t(P + 'wcAt', { date: longDate(g.end) }) : $t(P + 'wcYearEnd') }}
      .twg-wcv(:class="{ neg: g.workingCapital < 0 }") {{ plain(g.workingCapital) }}
</template>

<script>
import MonthChart from '~/components/shared/MonthChart.vue'
import { accountingMoney, accountingNum } from '~/utils/currencyFormat'
import { intlLocaleFor } from '~/utils/dateLocale'

const P = 'report.threeWayForecast.pack.glance.'
const L = 'report.threeWayForecast.report.line.'
const sum = list => (list || []).reduce((a, v) => a + (Number(v) || 0), 0)
const flat = lists => [].concat(...lists)

/**
 * ThreeWayForecastGlance — "The forecast at a glance", the printed pack's first page of
 * figures (item 44.4; drawing and wording approved by Mike 2026-09-30,
 * design/mockups/three-way-forecast-board-pack.html). Print only: the screen has its own
 * headline tiles.
 *
 * Nothing here is worked out afresh — every figure is a total or a single month of what
 * the model already returned, across every year asked for, so the page can never disagree
 * with the statements behind it. Which words a tile carries follows the figures: a loss in
 * every month, some or none; a bank overdrawn at the end, on the way, or never.
 */
export default {
  name: 'ThreeWayForecastGlance',

  components: { MonthChart },

  props: {
    /** The model's result: `{ years: [ one year's forecast, … ] }`. */
    result: { type: Object, required: true },
    yearCount: { type: Number, default: 1 },
    /** The client's name; empty reads "the business". */
    clientName: { type: String, default: '' },
    /** The forecast's currency code. */
    currency: { type: String, default: 'NZD' }
  },

  data () {
    return { P }
  },

  computed: {
    intlLocale () { return intlLocaleFor(this.$i18n.locale) },

    /** Every figure the page shows, across all the years. Null until there is a result. */
    g () {
      const years = (this.result && this.result.years) || []
      if (!years.length) { return null }
      const last = years[years.length - 1]
      const isos = flat(years.map(y => y.months.isoDates))
      const bank = flat(years.map(y => y.cashFlow.closingBalance))
      const act = k => sum(years.map(y => sum(y.cashFlow.byActivity[k])))
      const lowIdx = bank.indexOf(Math.min(...bank))
      return {
        months: isos.map(iso => this.shortMonth(iso)),
        end: this.monthEnd(isos[isos.length - 1]),
        revenue: sum(years.map(y => sum(y.profitAndLoss.revenue))),
        gross: sum(years.map(y => sum(y.profitAndLoss.grossSurplus))),
        pbtMonths: flat(years.map(y => y.profitAndLoss.netSurplusBeforeTax)),
        pbt: sum(years.map(y => sum(y.profitAndLoss.netSurplusBeforeTax))),
        opening: years[0].cashFlow.openingBalance[0],
        bank,
        closing: bank[bank.length - 1],
        lowest: bank[lowIdx],
        lowestMonth: this.monthYear(isos[lowIdx]),
        operating: act('operating'),
        investing: act('investing'),
        financing: act('financing'),
        movement: act('operating') + act('investing') + act('financing'),
        workingCapital: last.balanceSheet.months.workingCapital[11]
      }
    },

    client () { return this.clientName.trim() || this.$t('report.threeWayForecast.notes.general.theBusiness') },

    sub () {
      const p = { client: this.client, end: this.longDate(this.g.end), currency: this.currency, n: this.yearCount }
      return this.$t(P + (this.yearCount > 1 ? 'subMany' : 'subOne'), p)
    },

    /** "a loss in every month", "a surplus in every month" or "a loss in {n} of {total} months". */
    pbtTile () {
      const m = this.g.pbtMonths
      const losses = m.filter(v => v < 0).length
      if (losses === m.length) { return { tone: 'danger', text: this.$t(P + 'lossEvery') } }
      if (losses === 0) { return { tone: '', text: this.$t(P + 'surplusEvery') } }
      return { tone: this.g.pbt < 0 ? 'danger' : '', text: this.$t(P + 'lossSome', { n: losses, total: m.length }) }
    },

    /** Overdrawn at the end (red), overdrawn on the way (amber), or never. */
    bankTile () {
      const g = this.g
      if (g.closing < 0) { return { tone: 'danger', text: this.$t(P + 'overdrawnEnd', { month: g.lowestMonth }) } }
      const p = { amount: this.cash(g.lowest), month: g.lowestMonth }
      return g.lowest < 0
        ? { tone: 'caution', text: this.$t(P + 'dipped', p) }
        : { tone: '', text: this.$t(P + 'inFunds', p) }
    },

    activities () {
      return [
        { key: 'op', label: L + 'operatingActivities', value: this.g.operating },
        { key: 'inv', label: L + 'investingActivities', value: this.g.investing },
        { key: 'fin', label: L + 'financingActivities', value: this.g.financing }
      ]
    }
  },

  methods: {
    /** @param {number} v @returns {string} "$890,000", "($245,133)". */
    cash (v) { return accountingMoney(v, this.currency, this.$i18n.locale) },
    /** @param {number} v @returns {string} "(28,665)" — a figure in a table, no symbol. */
    plain (v) { return accountingNum(v, this.$i18n.locale) },
    pct (v) { return new Intl.NumberFormat(this.intlLocale, { style: 'percent', maximumFractionDigits: 1 }).format(v) },
    /** The last day of the month an ISO month-start names. @param {string} iso @returns {Date} */
    monthEnd (iso) {
      const [y, m] = iso.split('-').map(Number)
      return new Date(Date.UTC(y, m, 0))
    },
    longDate (d) { return d.toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) },
    shortMonth (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(this.intlLocale, { month: 'short', year: '2-digit', timeZone: 'UTC' }) },
    monthYear (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(this.intlLocale, { month: 'short', year: 'numeric', timeZone: 'UTC' }) }
  }
}
</script>

<style scoped>
.twg { color: #363636; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.twg-h { font: 700 30px/1.1 Georgia, serif; color: #002b64; margin: 0; }
.twg-sub { color: #5b6f8a; font-size: 14px; margin: 6px 0 16px; }
.twg-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.twg-tile { border-radius: 10px; padding: 14px 16px; background: #ebf4fa; }
.twg-tile.danger { background: #fdeaea; }
.twg-tile.caution { background: #fff4e5; }
.twg-tile .k { font-weight: 700; font-size: 13px; color: #002b64; }
.twg-tile .v { font: 700 28px/1.1 Georgia, serif; color: #002b64; margin: 6px 0 4px; }
.twg-tile.danger .v { color: #9c2323; }
.twg-tile .d { font-size: 12px; color: #5b6f8a; }
.twg-cols { display: grid; grid-template-columns: 1fr 1fr 0.62fr; gap: 16px; margin-top: 16px; }
.twg-panel { border: 1px solid #d5e1ee; border-radius: 10px; padding: 12px 14px; break-inside: avoid; }
.twg-panel.soft { background: #ebf4fa; border-color: transparent; }
.twg-panel h3 { font-size: 13px; font-weight: 700; color: #002b64; margin: 0 0 8px; }
.twg-flow { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.twg-flow td { padding: 6px 4px; border-bottom: 1px solid #d5e1ee; }
.twg-flow td.n { text-align: right; }
.twg-flow tr.total td { font-weight: 700; color: #002b64; border-bottom: 0; }
.twg-wc { margin-top: 14px !important; }
.twg-wcv { font: 700 24px Georgia, serif; color: #002b64; }
.twg-wcv.neg { color: #9c2323; }
</style>

<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.optional.cashBridge.title')" :number="number" :client-name="clientName" :period="period" :foot-note="$t('report.dashboardReports.doc.optional.addedByAdvisor')")
  template(#sub)
    | {{ $t('report.dashboardReports.doc.optional.cashBridge.sub', { profit: money(profit), movement: signedMoney(cb.bankMovement) }) }}
    span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.fromBothYears') }}
  .drd-cols.is-wide.drd-top
    .drd-panel
      h3.drd-h3 {{ $t('report.dashboardReports.doc.optional.cashBridge.chartTitle', { label: currentLabel }) }}
      waterfall-chart(:steps="chartSteps" :format-value="kMoney" :aria-label="$t('report.dashboardReports.doc.optional.cashBridge.chartTitle', { label: currentLabel })")
    div
      .drd-reads
        .drd-read-tile
          div
            .drd-rv {{ kMoney(cb.cashFromTrading) }}
            .drd-rk {{ $t('report.dashboardReports.doc.optional.cashBridge.cashFromTrading') }}
          .drd-rr {{ $t('report.dashboardReports.doc.optional.cashBridge.cashFromTradingRead', { amount: money(Math.abs(cb.workingCapitalAbsorbed)), verb: absorbedVerb }) }}
        .drd-read-tile.is-caution(v-if="largestUse")
          div
            .drd-rv {{ kMoney(-largestUse.value) }}
            .drd-rk {{ $t('report.dashboardReports.doc.optional.cashBridge.absorbedBy', { what: stepName(largestUse.key) }) }}
          .drd-rr {{ $t('report.dashboardReports.doc.optional.cashBridge.absorbedRead') }}
        .drd-read-tile(:class="cb.owners < 0 ? 'is-caution' : ''")
          div
            .drd-rv {{ kMoney(Math.abs(cb.owners)) }}
            .drd-rk {{ ownersLabel }}
          .drd-rr
            | {{ ownersRead }}
            span.drd-prov.is-file {{ $t('report.dashboardReports.doc.optional.cashBridge.fromEquity') }}
      p.drd-small.drd-note {{ $t('report.dashboardReports.doc.optional.cashBridge.note', { from: money(cb.bankPrior), to: money(cb.bankCurrent) }) }}
      p.drd-small.drd-note(v-if="cb.enteredCapitalSpend !== null") {{ $t('report.dashboardReports.doc.optional.cashBridge.capexNote', { entered: money(cb.enteredCapitalSpend), derived: money(cb.capitalSpend) }) }}
  .drd-strip
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.trading') }}
      .drd-sv {{ signedMoney(cb.cashFromTrading) }}
      span.drd-tag(:class="cb.cashFromTrading >= 0 ? 'is-rel' : 'is-uses'") {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.tradingSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.capitalSpend') }}
      .drd-sv {{ signedMoney(-cb.capitalSpend) }}
      span.drd-tag.is-uses {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.capitalSpendSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.' + (cb.borrowing >= 0 ? 'borrowing' : 'repaid')) }}
      .drd-sv {{ signedMoney(cb.borrowing) }}
      span.drd-tag(:class="cb.borrowing >= 0 ? 'is-rel' : 'is-uses'") {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.borrowingSub') }}
    .drd-sc
      .drd-sk {{ ownersLabel }}
      .drd-sv {{ signedMoney(cb.owners) }}
      span.drd-tag(:class="cb.owners >= 0 ? 'is-rel' : 'is-uses'") {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.ownersSub') }}
    .drd-sc
      .drd-sk {{ $t('report.dashboardReports.doc.optional.cashBridge.strip.bank') }}
      .drd-sv {{ signedMoney(cb.bankMovement) }}
      span.drd-tag(:class="cb.bankMovement >= 0 ? 'is-rel' : 'is-uses'") {{ kMoney(cb.bankPrior) }} → {{ kMoney(cb.bankCurrent) }}
</template>

<script>
/**
 * DashboardReportCashBridge — the optional page "Where the cash went" (drawing page 12 of
 * `design/mockups/business-performance-report-optional-pages.html`): a waterfall from this
 * year's profit to the movement in the bank, three readings beside it, and a strip of the
 * five sections of the bridge. Every number is `figures.optional.cashBridge`'s.
 *
 * The owners' figure is a residual and is labelled by its sign: money taken out reads as
 * drawings, dividends and tax; money put in reads as capital introduced. Capital spend is
 * the balance sheets' own figure; where the advisor typed a different one on the cash
 * page, a note names both rather than printing two numbers that disagree.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'
import WaterfallChart from '~/components/base/WaterfallChart.vue'
import currencyMixin from '~/mixins/currencyMixin'

/** The working-capital steps, the ones a reading can name as the largest use of cash. */
const WORKING_CAPITAL = ['debtors', 'stock', 'otherCurrentAssets', 'creditors', 'otherCurrentLiabilities']

export default {
  name: 'DashboardReportCashBridge',

  components: { DashboardReportPage, WaterfallChart },

  mixins: [currencyMixin],

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `figures.optional.cashBridge`, available. */
    cb: { type: Object, required: true },
    currentLabel: { type: String, default: '' }
  },

  computed: {
    profit () { return this.cb.steps.find(s => s.key === 'profit').value },
    /** The largest working-capital use of cash, or null when nothing used any. */
    largestUse () {
      const uses = this.cb.steps.filter(s => WORKING_CAPITAL.includes(s.key) && s.value < 0)
      if (!uses.length) { return null }
      return uses.reduce((m, s) => (s.value < m.value ? s : m), uses[0])
    },
    absorbedVerb () {
      return this.$t('report.dashboardReports.doc.optional.cashBridge.' + (this.cb.workingCapitalAbsorbed >= 0 ? 'wentInto' : 'cameOutOf'))
    },
    ownersLabel () {
      return this.$t('report.dashboardReports.doc.optional.cashBridge.' + (this.cb.owners < 0 ? 'owners' : 'capitalIntroduced'))
    },
    ownersRead () {
      const k = 'report.dashboardReports.doc.optional.cashBridge.'
      if (this.cb.owners >= 0) { return this.$t(k + 'capitalIntroducedRead') }
      const afterAssets = this.cb.cashFromTrading - this.cb.capitalSpend
      if (-this.cb.owners > afterAssets && this.cb.borrowing > 0) { return this.$t(k + 'ownersReadBorrowed', { borrowed: this.money(this.cb.borrowing) }) }
      if (-this.cb.owners > afterAssets) { return this.$t(k + 'ownersReadMore') }
      return this.$t(k + 'ownersReadWithin')
    },
    chartSteps () {
      const t = k => this.$t('report.dashboardReports.doc.optional.cashBridge.step.' + k)
      const s = key => this.cb.steps.find(x => x.key === key)
      const delta = (key, colour) => ({ label: t(key), value: s(key).value, kind: 'delta', colour })
      // Other current assets and other current liabilities are folded into one bar when
      // both are small against the page, so the chart keeps the drawing's eleven bars.
      const other = s('otherCurrentAssets').value + s('otherCurrentLiabilities').value
      return [
        { label: t('profit'), value: this.profit, kind: 'start' },
        delta('depreciation'),
        delta('debtors'),
        delta('stock', s('stock').value < 0 ? '#ff0000' : undefined),
        delta('creditors'),
        { label: t('other'), value: other, kind: 'delta' },
        { label: t('trading'), value: 0, kind: 'subtotal' },
        delta('capitalSpend'),
        delta('borrowing'),
        { label: t(this.cb.owners < 0 ? 'owners' : 'capitalIntroduced'), value: this.cb.owners, kind: 'delta', colour: this.cb.owners < 0 ? '#ff0000' : undefined },
        { label: t('bank'), value: this.cb.bankMovement, kind: 'end', colour: '#00b1e0' }
      ]
    }
  },

  methods: {
    /** @param {string} key */
    stepName (key) { return this.$t('report.dashboardReports.doc.optional.cashBridge.name.' + key) }
  }
}
</script>

<style scoped>
.drd-top { margin-top: 0; }
.drd-reads { display: grid; gap: 10px; }
.drd-read-tile { display: grid; grid-template-columns: 112px 1fr; gap: 12px; align-items: center; border-radius: 12px; padding: 12px 14px; background: var(--drd-tint-blue); }
.drd-read-tile.is-caution { background: var(--drd-tint-caution); }
.drd-rv { font: 700 26px/1.05 var(--drd-serif); color: var(--drd-navy); }
.drd-rk { font-weight: 700; font-size: 12px; color: var(--drd-ink); margin-top: 3px; }
.drd-rr { font-size: 12.5px; }
.drd-note { margin: 10px 0 0; }
</style>

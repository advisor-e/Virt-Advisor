<template lang="pug">
.drd-doc
  .drd-toolbar(v-if="editable")
    b-dropdown(aria-role="list" :close-on-click="false")
      template(#trigger)
        b-button(icon-right="menu-down") {{ $t('report.dashboardReports.review.addPage') }}
      b-dropdown-item(custom aria-role="listitem")
        .drd-dd-head {{ $t('report.dashboardReports.pages.addTitle') }}
      b-dropdown-item(v-for="o in optional" :key="o.key" custom aria-role="listitem")
        b-checkbox(:value="o.on" :disabled="!o.available" @input="v => toggle(o.key, v)") {{ $t('report.dashboardReports.pages.optional.' + o.key) }}
        span.drd-dd-why(:class="{ 'is-ok': o.available }") {{ o.reason }}
    span.drd-toolbar-pages {{ $t('report.dashboardReports.review.pagesOf', { n: pageCount }) }}
    b-button(type="is-primary" @click="print") {{ $t('report.dashboardReports.review.print') }}
    span.drd-toolbar-note {{ $t('report.dashboardReports.review.accessNote') }}
  .drd-waiting(v-if="!figures") {{ $t('report.loading') }}
  template(v-else)
    dashboard-report-cover(
      :client-name="clientName"
      :period="period"
      :prepared-by="state.setup.preparedBy"
      :date-issued="dateIssuedText"
      :sections="sections"
      :added-titles="addedTitles")
    dashboard-report-summary(:number="3" :client-name="clientName" :period="period" :s="figures.summary" :score="figures.score" :words="state.words")
    dashboard-report-dashboard(:number="4" :client-name="clientName" :period="period" :d="figures.dashboard" :costs="figures.costs" :monthly="figures.monthly || null" :prior-label="priorLabel" :current-label="currentLabel")
    dashboard-report-profit-loss(:number="5" :client-name="clientName" :period="period" :p="figures.profitLoss" :insight="state.words.profitInsight" :monthly="figures.monthly || null" :prior-label="priorLabel" :current-label="currentLabel")
    dashboard-report-balance-sheet(:number="6" :client-name="clientName" :period="period" :b="figures.balanceSheet" :balance-date="state.current.balanceSheetDate || ''")
    dashboard-report-cash-flow(:number="7" :client-name="clientName" :period="period" :cf="figures.cashFlow" :cash-watch="state.words.cashWatch" :monthly="figures.monthly || null" :prior-label="priorLabel" :current-label="currentLabel")
    dashboard-report-inventory(:number="8" :client-name="clientName" :period="period" :inv="figures.inventory")
    dashboard-report-trends(:number="9" :client-name="clientName" :period="period" :trends="figures.trends" :benchmarks="figures.benchmarks || null" :prior-label="priorLabel" :current-label="currentLabel")
    dashboard-report-next-steps(:number="10" :client-name="clientName" :period="period" :steps="state.words.steps" :next-review="state.words.nextReview" :prepared-by="state.setup.preparedBy")
    template(v-for="(p, i) in addedPages")
      dashboard-report-profit-bridge(v-if="p === 'profitBridge'" :key="p" :number="11 + i" :client-name="clientName" :period="period" :b="figures.optional.profitBridge" :prior-label="priorLabel" :current-label="currentLabel")
      dashboard-report-cash-bridge(v-else-if="p === 'cashBridge'" :key="p" :number="11 + i" :client-name="clientName" :period="period" :cb="figures.optional.cashBridge" :current-label="currentLabel")
      dashboard-report-sensitivity(v-else-if="p === 'profitSensitivity'" :key="p" :number="11 + i" :client-name="clientName" :period="period" :sv="figures.optional.profitSensitivity")
      dashboard-report-stock-vs-accounts(v-else-if="p === 'stockVsAccounts'" :key="p" :number="11 + i" :client-name="clientName" :period="period" :sv="figures.optional.stockVsAccounts")
      dashboard-report-sales-volatility(v-else-if="p === 'salesVolatility'" :key="p" :number="11 + i" :client-name="clientName" :period="period" :v="figures.optional.salesVolatility")
    dashboard-report-information(:number="11 + addedPages.length" :client-name="clientName" :period="period" :prepared-by="state.setup.preparedBy")
</template>

<script>
/**
 * DashboardReport — the Business Performance Report as the client reads it: the cover,
 * the contents and the eight sections, one landscape page each, then the important-
 * information page (item 4.70; the approved drawing is
 * `design/mockups/business-performance-report.html`, followed page for page in the brand
 * palette — Brief P6).
 *
 * The optional pages the advisor added print between Next Steps and the closing page, in
 * the dropdown's order, numbered from 11; the closing page takes the number after them,
 * as the drawing lays them out. A page is printed only when the pages route produced its
 * figures — a saved choice with nothing behind it prints nothing rather than an empty page.
 *
 * The toolbar is the advisor's: the add-a-page dropdown (Brief P1 — a page is offered only
 * where the figures behind it exist, and each says why it cannot be added yet) and the
 * browser's own print (Brief P7: no PDF library runs on Node 14, and no client figure is
 * sent anywhere to be rendered). A client sees the document alone.
 *
 * Print is landscape, one page per sheet — `@page` below. Nothing here computes: every
 * figure is the pages route's, and the document only lays it out.
 */
import DashboardReportCover from '~/components/DashboardReportCover.vue'
import DashboardReportSummary from '~/components/DashboardReportSummary.vue'
import DashboardReportDashboard from '~/components/DashboardReportDashboard.vue'
import DashboardReportProfitLoss from '~/components/DashboardReportProfitLoss.vue'
import DashboardReportBalanceSheet from '~/components/DashboardReportBalanceSheet.vue'
import DashboardReportCashFlow from '~/components/DashboardReportCashFlow.vue'
import DashboardReportInventory from '~/components/DashboardReportInventory.vue'
import DashboardReportTrends from '~/components/DashboardReportTrends.vue'
import DashboardReportNextSteps from '~/components/DashboardReportNextSteps.vue'
import DashboardReportInformation from '~/components/DashboardReportInformation.vue'
import DashboardReportProfitBridge from '~/components/DashboardReportProfitBridge.vue'
import DashboardReportCashBridge from '~/components/DashboardReportCashBridge.vue'
import DashboardReportSensitivity from '~/components/DashboardReportSensitivity.vue'
import DashboardReportStockVsAccounts from '~/components/DashboardReportStockVsAccounts.vue'
import DashboardReportSalesVolatility from '~/components/DashboardReportSalesVolatility.vue'
import { intlLocaleFor } from '~/utils/dateLocale'
const { OPTIONAL_PAGES } = require('~/utils/dashboardReportsSavedShape')

/** The eight numbered sections, with the contents page's colour key for each. */
const SECTIONS = [
  { key: 'summary', n: 1, tone: 'caution' },
  { key: 'dashboard', n: 2, tone: 'cyan' },
  { key: 'profitLoss', n: 3, tone: 'cyan' },
  { key: 'balanceSheet', n: 4, tone: 'cyan' },
  { key: 'cashFlow', n: 5, tone: 'cyan' },
  { key: 'inventory', n: 6, tone: 'caution' },
  { key: 'trends', n: 7, tone: 'danger' },
  { key: 'nextSteps', n: 8, tone: 'cyan' }
]

/** Cover, contents, eight sections and the closing page. */
const BASE_PAGE_COUNT = 11

export default {
  name: 'DashboardReport',

  components: {
    DashboardReportCover,
    DashboardReportSummary,
    DashboardReportDashboard,
    DashboardReportProfitLoss,
    DashboardReportBalanceSheet,
    DashboardReportCashFlow,
    DashboardReportInventory,
    DashboardReportTrends,
    DashboardReportNextSteps,
    DashboardReportInformation,
    DashboardReportProfitBridge,
    DashboardReportCashBridge,
    DashboardReportSensitivity,
    DashboardReportStockVsAccounts,
    DashboardReportSalesVolatility
  },

  props: {
    /** The pages route's answer, or null while it is on its way. */
    figures: { type: Object, default: null },
    /** The page's state — words, setup, pages, the confirmed years. */
    state: { type: Object, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `{ [key]: { available, reason } }` for the optional pages. */
    availability: { type: Object, default: () => ({}) },
    /** The advisor's toolbar. A client reads the document alone. */
    editable: { type: Boolean, default: false }
  },

  computed: {
    sections () { return SECTIONS },
    /** The added pages that have figures behind them, in the dropdown's order. */
    addedPages () {
      const blocks = (this.figures && this.figures.optional) || {}
      return OPTIONAL_PAGES.filter(k => this.state.pages.added.includes(k) && blocks[k] && blocks[k].available)
    },
    addedTitles () { return this.addedPages.map(k => this.$t('report.dashboardReports.pages.optional.' + k)) },
    pageCount () { return BASE_PAGE_COUNT + this.addedPages.length },
    optional () {
      return OPTIONAL_PAGES.map((key) => {
        const a = this.availability[key] || { available: false, reason: '' }
        return { key, available: a.available, reason: a.reason, on: this.state.pages.added.includes(key) }
      })
    },
    priorLabel () { return this.$t('report.dashboardReports.doc.lastYear') },
    currentLabel () { return this.$t('report.dashboardReports.doc.thisYear') },
    /** The issue date in the reader's own order (English reads day-first — Mike, 2026-09-07). */
    dateIssuedText () {
      const iso = this.state.setup.dateIssued
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) { return iso || '' }
      const d = new Date(iso + 'T00:00:00')
      return this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
    }
  },

  methods: {
    /** @param {string} key @param {boolean} on */
    toggle (key, on) {
      const added = this.state.pages.added.filter(k => k !== key)
      if (on) { added.push(key) }
      // change-pages: the whole pages object with the added list replaced
      this.$emit('change-pages', Object.assign({}, this.state.pages, { added }))
    },
    print () {
      if (process.client) { window.print() }
    }
  }
}
</script>

<style scoped>
.drd-doc { display: flex; flex-direction: column; gap: 16px; }
.drd-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); padding: 12px 16px; font-size: 13px; }
.drd-toolbar-pages { color: var(--rs-muted); }
.drd-toolbar-note { color: var(--rs-muted); font-size: 12.5px; }
.drd-dd-head { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--rs-muted); }
.drd-dd-why { display: block; font-size: 11.5px; color: var(--rs-muted); margin-left: 28px; }
.drd-dd-why.is-ok { color: var(--rs-good); }
.drd-waiting { color: var(--rs-muted); font-size: 13px; padding: 24px; text-align: center; }
@page { size: landscape; margin: 0; }
@media print {
  .drd-toolbar, .drd-waiting { display: none !important; }
  .drd-doc { display: block; }
}
</style>

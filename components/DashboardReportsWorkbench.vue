<template lang="pug">
.drb-root
  //- A failed recompute must never sit silently behind live-looking figures (R9).
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute")
  hero-strip(:stale="!!error")
    hero-figure(v-for="(h, i) in heroFigures" :key="i" :label="h.label" :value="h.value" :sub="h.sub" :unit="h.unit || ''")
  dashboard-reports-setup(
    v-if="step === 1 && !clientMode"
    :setup="state.setup"
    :client-name="clientName"
    :matches="industryMatches"
    :industry="industryRecord"
    :industry-count="industryCount"
    :revenue="revenue"
    @change="onSetup"
    @search="onIndustrySearch"
    @industry="loadIndustry"
    @continue="go(2)")
  dashboard-reports-accounts(
    v-else-if="step === 2 && !clientMode"
    :api-token="apiToken"
    :current="state.current"
    :prior="state.prior"
    :has-prior="state.hasPrior"
    :earlier="state.earlier"
    :has-earlier="state.hasEarlier"
    :monthly="state.monthly"
    @change="onAccounts"
    @confirmed="go(3)")
  dashboard-reports-inventory(
    v-else-if="step === 3 && !clientMode"
    :api-token="apiToken"
    :inventory="state.inventory"
    :check="figures && figures.optional ? figures.optional.stockVsAccounts : null"
    @change="onInventory"
    @continue="go(4)")
  dashboard-reports-words(
    v-else-if="step === 4 && !clientMode"
    :words="state.words"
    :api-token="apiToken"
    :client-ref="clientRef"
    :send-list="sendList"
    :approval="approval"
    @change="onWords"
    @ready="onReady"
    @continue="go(5)")
  dashboard-reports-pages(
    v-else-if="step === 5 && !clientMode"
    :pages="state.pages"
    :availability="availability"
    @change="onPages"
    @continue="go(6)")
  dashboard-report(
    v-else
    :figures="figures"
    :state="state"
    :client-name="clientName"
    :period="period"
    :availability="availability"
    :editable="!clientMode"
    :approval="approval"
    @change-pages="onPages")
</template>

<script>
/**
 * DashboardReportsWorkbench — the Business Performance Report's advisor screen: the dark
 * band with the step's own figures, then the step (item 4.70; the approved drawing is
 * `design/mockups/business-performance-report-intake.html`). Owns the report's state and
 * the recompute; the page above it owns the header, the chips and the saving.
 *
 * Every figure on the band and on the document comes from ONE backend call,
 * `POST /api/report/dashboard-reports/pages`, re-made through the shared `reportRecompute`
 * mixin whenever a confirmed line or a typed inventory figure changes. The advisor's words
 * change no figure, so they trigger no call.
 *
 * A client (business entity) sees step 6 alone: the document, without the toolbar. Their
 * saved row arrives through `restore` exactly as the advisor's does.
 */
import HeroStrip from '~/components/base/HeroStrip.vue'
import HeroFigure from '~/components/base/HeroFigure.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import DashboardReportsSetup from '~/components/DashboardReportsSetup.vue'
import DashboardReportsAccounts from '~/components/DashboardReportsAccounts.vue'
import DashboardReportsInventory from '~/components/DashboardReportsInventory.vue'
import DashboardReportsWords from '~/components/DashboardReportsWords.vue'
import DashboardReportsPages from '~/components/DashboardReportsPages.vue'
import DashboardReport from '~/components/DashboardReport.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'
import { intlLocaleFor } from '~/utils/dateLocale'
const { emptyState, pagesRequestFrom, OPTIONAL_PAGES, SOURCES } = require('~/utils/dashboardReportsSavedShape')
const { sendListFrom } = require('~/utils/nextStepsSendList')
const { LINES } = require('~/server/report/intake/dashboardReportsAssembler')
const { pct, days, times } = require('~/utils/reportFormat')

/** Why an optional page with no model behind it yet cannot be added — the stage it waits on. */
const REASON_KEY = {
  outlook: 'outlook',
  loanServicing: 'loanServicing',
  taxProvision: 'taxProvision'
}
/** The pages the pages route computes, and what a ready one says it is drawn from. */
const READY_KEY = { profitBridge: 'bothYears', cashBridge: 'bothYears', profitSensitivity: 'thisYear', stockVsAccounts: 'stockFile', salesVolatility: 'byMonth' }
/** A model's refusal, as the reason the page shows. */
const BLOCKED_KEY = { NO_PRIOR_YEAR: 'needsBothYears', NO_PRIOR_REVENUE: 'needsBothYears', NO_CURRENT_YEAR: 'needsThisYear', NO_REVENUE: 'needsThisYear', NO_STOCK_FILE: 'stockFile', NO_STOCK_LINE: 'needsStockLine', NO_MONTHLY_FILE: 'salesVolatility', NEEDS_TWELVE_MONTHS: 'needsTwelveMonths' }

export default {
  name: 'DashboardReportsWorkbench',

  components: {
    HeroStrip,
    HeroFigure,
    StaleBanner,
    DashboardReportsSetup,
    DashboardReportsAccounts,
    DashboardReportsInventory,
    DashboardReportsWords,
    DashboardReportsPages,
    DashboardReport
  },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /** For the intake upload (firmAuth). */
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** For the pages route (firmOrEntityAuth) — the sign-in's own token. */
    token: { type: String, default: 'dev-local-bypass' },
    /** A saved state to load, or null. Replaced whole when it changes. */
    restore: { type: Object, default: null },
    step: { type: Number, default: 1 },
    clientMode: { type: Boolean, default: false },
    clientName: { type: String, default: '' },
    /** What the header knows about the saved row, for the review band. */
    savedText: { type: String, default: '' },
    /** The saved-report client id — whose next-steps record to read and write (stage 6). */
    clientRef: { type: String, default: '' }
  },

  data () {
    return {
      state: this.restore ? JSON.parse(JSON.stringify(this.restore)) : emptyState(),
      figures: null,
      /**
       * Stage 6: the server's record for the three next steps as they stand — per
       * `nextStepsDraftRuns.summarise`. Taken from the pages route's answer and from the
       * tick; cleared locally the moment a word changes, which the server will confirm.
       */
      approval: null,
      /** The finder's last answer, the chosen industry's record, and how many the finder covers. */
      industryMatches: [],
      industryRecord: null,
      industryCount: 0
    }
  },

  computed: {
    /** What the next-steps draft would send: the score's colours and the industry positions. */
    sendList () { return sendListFrom(this.figures) },
    period () {
      const s = this.state
      return s.setup.financialYear || s.current.profitLossDate || s.current.balanceSheetDate || ''
    },
    /** This year's revenue from the confirmed table, or null before any file is dropped. */
    revenue () {
      const l = this.state.current && this.state.current.figures && this.state.current.figures.tradingIncome
      const v = l && l.value !== null && l.value !== undefined ? Number(l.value) : NaN
      return Number.isFinite(v) ? v : null
    },
    /**
     * Whether each optional page can be added, and why or why not (Brief P1). The three
     * computed pages answer from the pages route's own result — a page is offered only
     * when its model produced figures; the rest name the stage they wait on.
     */
    availability () {
      const t = k => this.$t('report.dashboardReports.pages.' + k)
      const blocks = (this.figures && this.figures.optional) || {}
      const out = {}
      OPTIONAL_PAGES.forEach((key) => {
        if (READY_KEY[key]) {
          const block = blocks[key]
          out[key] = block && block.available
            ? { available: true, reason: t('ready.' + READY_KEY[key]) }
            : { available: false, reason: t('reason.' + (BLOCKED_KEY[block && block.blocked] || (block ? 'notComputable' : (READY_KEY[key] === 'thisYear' ? 'needsThisYear' : 'needsBothYears')))) }
        } else {
          out[key] = { available: false, reason: t('reason.' + REASON_KEY[key]) }
        }
      })
      return out
    },
    /** How many confirmed lines came from a file, and how many were typed. */
    sourceCounts () {
      const counts = { file: 0, entered: 0 }
      ;[this.state.current, this.state.hasPrior ? this.state.prior : null].forEach((year) => {
        if (!year) { return }
        LINES.forEach((k) => {
          const l = year.figures[k]
          if (l && l.value !== null && l.value !== undefined && SOURCES.includes(l.source)) { counts[l.source] += 1 }
        })
      })
      return counts
    },
    /** The band's four figures, per step — the drawing's, read off the state and the figures. */
    heroFigures () {
      const t = (k, params) => this.$t('report.dashboardReports.hero.' + k, params)
      const f = this.figures
      const s = this.state
      const dash = '—'
      if (this.step === 1 && !this.clientMode) {
        return [
          { label: t('client'), value: this.clientName || dash, sub: this.clientName ? t('fromRecord') : t('chooseOnHeader') },
          { label: t('period'), value: this.period || dash, sub: this.period ? '' : t('setOnThisStep') },
          { label: t('dateIssued'), value: this.dateIssuedText || dash, sub: '' },
          { label: t('preparedBy'), value: s.setup.preparedBy || dash, sub: '' }
        ]
      }
      if (this.step === 2 && !this.clientMode) {
        const p = f ? f.profitLoss.current : null
        const b = f ? f.balanceSheet : null
        return [
          { label: t('revenue'), value: p ? this.kMoney(p.revenue) : dash, sub: t('fromPl') },
          { label: t('netProfit'), value: p ? this.kMoney(p.netProfit) : dash, sub: p ? t('ofRevenue', { pct: pct(p.netMarginPct) }) : '' },
          { label: t('totalAssets'), value: b ? this.kMoney(b.current.totalAssets) : dash, sub: s.current.balanceSheetDate || '' },
          { label: t('equity'), value: b ? this.kMoney(b.current.equity) : dash, sub: b && b.equityChangePct !== null ? t('changeOnLastYear', { pct: pct(b.equityChangePct) }) : t('noLastYear') }
        ]
      }
      if (this.step === 3 && !this.clientMode) {
        const i = f ? f.inventory : null
        const sf = s.inventory.stockFile
        return [
          // Stage 4: a read stock export is the figure on the band; the accounts' line is the check
          sf
            ? { label: t('stockAtCost'), value: this.kMoney(sf.totalValue), sub: t('fromStockExport') }
            : { label: t('stockAtCost'), value: i && i.stockAtCost !== null ? this.kMoney(i.stockAtCost) : dash, sub: t('fromAccounts') },
          { label: t('stockTurn'), value: i ? times(i.stockTurn) : dash, sub: t('fromAccounts') },
          { label: t('daysOnShelf'), value: i ? days(i.stockDays) : dash, sub: t('fromAccounts') },
          { label: t('slowObsolete'), value: i && i.slowObsolete !== null ? this.kMoney(i.slowObsolete) : dash, sub: t('enteredByYou') }
        ]
      }
      if (this.step === 4 && !this.clientMode) {
        const sc = f ? f.score : null
        const cf = f ? f.cashFlow : null
        return [
          { label: t('healthScore'), value: sc && sc.score !== null ? sc.score : dash, sub: sc && sc.score !== null ? t('measuresGreen', { green: sc.green, n: sc.total, band: this.$t('report.dashboardReports.doc.band.' + sc.band) }) : t('noScore') },
          { label: t('cashCycle'), value: cf ? days(cf.cashCycleDays) : dash, unit: cf && cf.cashCycleDays !== null ? this.$t('report.dashboardReports.doc.days') : '', sub: this.cycleChangeText },
          { label: t('drivers'), value: cf ? cf.drivers.filter(d => d.direction === 'uses').length : dash, sub: t('usingCash') },
          { label: t('drivers'), value: cf ? cf.drivers.filter(d => d.direction === 'releases').length : dash, sub: t('releasingCash') }
        ]
      }
      if (this.step === 5 && !this.clientMode) {
        return [
          { label: t('basePages'), value: 10, sub: t('basePagesSub') },
          { label: t('added'), value: s.pages.added.length, sub: t('addedSub') },
          { label: t('closingPage'), value: 1, sub: this.$t('report.dashboardReports.doc.section.information') },
          // No cap on optional pages — Mike, 2026-09-08: the fifteen applies to the base report only.
          { label: t('total'), value: 11 + s.pages.added.length, sub: t('totalSub') }
        ]
      }
      return [
        { label: t('pages'), value: 11 + s.pages.added.length, sub: t('landscape') },
        { label: t('fromYourAccounts'), value: this.sourceCounts.file, unit: t('figures'), sub: t('readFromExports') },
        { label: t('enteredByYouLabel'), value: this.sourceCounts.entered, unit: t('figures'), sub: t('andEveryWord') },
        { label: t('saved'), value: this.savedText || t('notYet'), sub: this.savedText ? '' : t('saveHint') }
      ]
    },
    dateIssuedText () {
      const iso = this.state.setup.dateIssued
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) { return iso || '' }
      return this.$d(new Date(iso + 'T00:00:00'), 'long', intlLocaleFor(this.$i18n.locale))
    },
    cycleChangeText () {
      const cf = this.figures ? this.figures.cashFlow : null
      if (!cf || cf.cashCycleChangeDays === null) { return '' }
      const d = cf.cashCycleChangeDays
      if (d === 0) { return this.$t('report.dashboardReports.doc.sameAsLastYear') }
      return this.$t(d > 0 ? 'report.dashboardReports.doc.slowerThanLastYear' : 'report.dashboardReports.doc.fasterThanLastYear', { n: Math.round(Math.abs(d)) })
    }
  },

  watch: {
    /** A saved row loaded on the page: take it whole and recompute. */
    restore (next) {
      if (!next) { return }
      this.state = JSON.parse(JSON.stringify(next))
      this.recompute()
    }
  },

  mounted () {
    this.recompute()
    if (this.state.setup.industryCode) { this.loadIndustry(this.state.setup.industryCode) }
  },

  methods: {
    /** The shared mixin's request: the confirmed table and the typed inventory figures. */
    recomputeRequest () {
      return { url: '/api/report/dashboard-reports/pages', body: pagesRequestFrom(this.state, this.clientRef) }
    },
    /** The pages route is guarded: the firm's thresholds are resolved from this token. */
    recomputeHeaders () {
      return { Authorization: 'Bearer ' + this.token }
    },
    /** @param {object} data - per `computeReportPages` */
    applyResult (data) {
      this.figures = data
      this.approval = data && data.nextSteps ? data.nextSteps : null
    },
    /** Tell the page, so a Save carries what is on screen now. */
    report () {
      // state: the whole report state, for saving
      this.$emit('state', this.state)
    },
    /** @param {number} n */
    go (n) {
      // step: the step the advisor moved to
      this.$emit('step', n)
    },
    onSetup (setup) {
      const industryChanged = setup.industryCode !== this.state.setup.industryCode || setup.sizeBand !== this.state.setup.sizeBand
      this.state = Object.assign({}, this.state, { setup })
      this.report()
      // The industry and the band change the benchmark page's figures, nothing else on the form does.
      if (industryChanged) { this.queueRecompute() }
    },
    /**
     * The finder: two characters or more go to the backend, which answers from the release in
     * force. A shorter query clears the list rather than asking.
     * @param {string} q
     */
    async onIndustrySearch (q) {
      if (!q || q.trim().length < 2) { this.industryMatches = []; return }
      try {
        const res = await fetch('/api/report/benchmarker/industries?q=' + encodeURIComponent(q.trim()), { headers: { Authorization: 'Bearer ' + this.token } })
        const body = await res.json()
        this.industryMatches = Array.isArray(body.matches) ? body.matches : []
      } catch (err) {
        this.industryMatches = []
      }
    },
    /**
     * The chosen industry's bands and counts, for the size-band list.
     * @param {string} code
     */
    async loadIndustry (code) {
      this.industryRecord = null
      if (!code) { return }
      try {
        const res = await fetch('/api/report/benchmarker/industries/' + encodeURIComponent(code), { headers: { Authorization: 'Bearer ' + this.token } })
        const body = await res.json()
        this.industryRecord = body && body.industry ? body.industry : null
      } catch (err) {
        this.industryRecord = null
      }
    },
    /**
     * The annual drop carries the years; the by-month drop carries `monthly` alone (stage 5).
     * Each replaces only what it carries, so one never wipes the other.
     * @param {{current?: object, prior?: object, hasPrior?: boolean, earlier?: object, hasEarlier?: boolean, monthly?: object, companyName?: string}} payload
     */
    onAccounts (payload) {
      const next = {}
      if (payload.current) { next.current = payload.current }
      if (payload.prior) { next.prior = payload.prior }
      if (typeof payload.hasPrior === 'boolean') { next.hasPrior = payload.hasPrior }
      if (payload.earlier) { next.earlier = payload.earlier }
      if (typeof payload.hasEarlier === 'boolean') { next.hasEarlier = payload.hasEarlier }
      if (payload.monthly) { next.monthly = payload.monthly }
      this.state = Object.assign({}, this.state, next)
      if (payload.companyName) {
        // company-name: the client's name as the dropped file states it — shown locally, never sent
        this.$emit('company-name', payload.companyName)
      }
      this.report()
      this.queueRecompute()
    },
    onInventory (inventory) {
      this.state = Object.assign({}, this.state, { inventory })
      this.report()
      this.queueRecompute()
    },
    onWords (words) {
      const before = JSON.stringify(this.state.words.steps)
      this.state = Object.assign({}, this.state, { words })
      // A changed word clears the tick here at once; the server's record is compared on
      // the next pages call and will say the same.
      if (this.approval && this.approval.approved && JSON.stringify(words.steps) !== before) {
        this.approval = Object.assign({}, this.approval, { approved: false })
      }
      this.report()
    },
    /**
     * The tick was recorded (or removed) on the server. The record is taken as given, and
     * the pages are re-made so the printed gate reads the same record.
     * @param {{approval: object, recorded: boolean}} payload
     */
    onReady (payload) {
      this.approval = payload && payload.approval ? payload.approval : null
      this.queueRecompute()
    },
    onPages (pages) {
      this.state = Object.assign({}, this.state, { pages })
      this.report()
    }
  }
}
</script>

<style scoped>
/* Root: a flex column with ONE gap (16px) so header→band→step space uniformly. */
.drb-root { display: flex; flex-direction: column; gap: 16px; }
@media print { .drb-root > .hero-strip, .drb-root > .stale-banner { display: none !important; } }
</style>

<template lang="pug">
section.sri
  h4.sri-title {{ $t('strategyPlanner.reportImport.heading') }}
  template(v-if="importStatus !== 'ready'")
    p.sri-muted(v-if="savedInfo && importStatus !== 'none'") {{ $t('strategyPlanner.reportImport.savedLine', { client: clientName, period: savedInfo.period }) }}
    .sri-row
      b-button(type="is-primary" :loading="importStatus === 'loading'" @click="bringIn") {{ $t('strategyPlanner.reportImport.bringIn') }}
      span.sri-muted {{ $t('strategyPlanner.reportImport.fresh') }}
    p.sri-none(v-if="importStatus === 'none'") {{ $t('strategyPlanner.reportImport.none') }}
    stale-banner(
      v-if="importStatus === 'failed'"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="bringIn")
  template(v-else)
    p.sri-muted {{ metaLine }}
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute")
    nav.sri-strip(v-if="strip.length")
      button.sri-chip(
        v-for="(p, i) in strip"
        :key="i"
        type="button"
        :class="{ 'is-on': i === onPage }"
        @click="jump(i)") {{ p.label }}
    .sri-viewer(ref="viewer")
      dashboard-report(
        :figures="reportFigures"
        :state="reportState"
        :client-name="clientName"
        :period="savedInfo ? savedInfo.period : ''"
        :brand="firmBrand"
        :approval="reportApproval")
    .sri-row
      b-button(type="is-primary" outlined @click="bringIn") {{ $t('strategyPlanner.reportImport.again') }}
      span.sri-muted {{ $t('strategyPlanner.reportImport.againNote') }}
</template>

<script>
/**
 * StrategyReportImport — the "Assess current position" card's panel that brings in the
 * client's Business Performance Report (item 15.13). Built from
 * design/mockups/strategy-current-position-import.html, approved by Mike 2026-09-28.
 *
 * - Decision A: the report comes in only when the advisor presses the button.
 * - Decision B: the WHOLE report, every page and chart, drawn by the report's own
 *   component — `DashboardReport`, read-only — with a strip of its page names to jump by.
 * - Decision C: pressed with no completed report, it shows Mike's own message.
 *
 * Nothing is copied into the session. The only thing the card may save is the marker that
 * the report was brought in (`REPORT_IMPORT_KEY`), which is what lets the plan print the
 * report's Executive Summary (Decision D) — see `StrategyReportPlanPage`.
 */
import StaleBanner from '~/components/base/StaleBanner.vue'
import DashboardReport from '~/components/DashboardReport.vue'
import businessReportImport from '~/mixins/businessReportImport'
import { intlLocaleFor } from '~/utils/dateLocale'
const { REPORT_IMPORT_KEY } = require('~/utils/reportImport')

/** The report's closing and contents pages are not on the strip — the drawing's own choice. */
const OFF_STRIP = ['report.dashboardReports.doc.contents', 'report.dashboardReports.doc.section.information']

/** The eight numbered sections, as the report's contents page numbers them. */
const NUMBERED = ['summary', 'dashboard', 'profitLoss', 'balanceSheet', 'cashFlow', 'inventory', 'trends', 'nextSteps']

export default {
  name: 'StrategyReportImport',

  components: { StaleBanner, DashboardReport },

  mixins: [businessReportImport],

  props: {
    /** The session's client — whose saved report is read. */
    clientId: { type: String, required: true },
    clientName: { type: String, default: '' },
    /** The planner's Bearer token. */
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** The session already records that the report was brought in: show it again on open. */
    broughtIn: { type: Boolean, default: false }
  },

  data () {
    return {
      /** `{ label, title }` for each page the report drew, read off the report once it renders. */
      strip: [],
      onPage: 0
    }
  },

  computed: {
    /** "{period} · saved {date} by {name} · {n} pages" — approved wording, Mike 2026-09-28. */
    metaLine () {
      const info = this.savedInfo || {}
      const d = new Date(info.savedAt || '')
      const date = Number.isNaN(d.getTime()) ? '' : this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
      return this.$t('strategyPlanner.reportImport.meta', { period: info.period || '', date, name: info.savedBy || '—', n: this.strip.length })
    }
  },

  watch: {
    /**
     * The report is drawn only once the status is 'ready' — its figures arrive a moment
     * before — so the strip is read off its pages then, and cleared while it is away.
     */
    importStatus (now) {
      if (now === 'ready') {
        this.$nextTick(this.readStrip)
      } else {
        this.strip = []
      }
    }
  },

  mounted () {
    this.loadFirmBrand({ Authorization: 'Bearer ' + this.apiToken })
    if (this.broughtIn) {
      this.bringIn()
      return
    }
    // The line above the button names the saved report before it is brought in. A failed
    // read here changes nothing: the button still works, and says what went wrong itself.
    this.readSavedReport().catch(() => {})
  },

  methods: {
    async bringIn () {
      const first = this.importStatus !== 'ready'
      await this.bringInReport()
      if (this.importStatus === 'ready' && first && !this.broughtIn) {
        // brought-in: `{ key, value }` — the one session entry this card saves (Decision D)
        this.$emit('brought-in', { key: REPORT_IMPORT_KEY, value: 'yes' })
      }
    },

    /** Read the report's page titles, numbering the eight sections as its contents page does. */
    readStrip () {
      const viewer = this.$refs.viewer
      if (!viewer) { this.strip = []; return }
      const skip = OFF_STRIP.map(k => this.$t(k))
      const numbered = {}
      NUMBERED.forEach((k, i) => { numbered[this.$t('report.dashboardReports.doc.section.' + k)] = i + 1 })
      this.strip = Array.from(viewer.querySelectorAll('.drd-page .drd-title'))
        .map(el => el.textContent.trim())
        .filter(title => title && !skip.includes(title))
        .map(title => ({ title, label: numbered[title] ? numbered[title] + ' ' + title : title }))
      this.onPage = 0
    },

    /** @param {number} i - an index into `strip` */
    jump (i) {
      const viewer = this.$refs.viewer
      const entry = this.strip[i]
      if (!viewer || !entry) { return }
      const page = Array.from(viewer.querySelectorAll('.drd-page'))
        .find((p) => { const t = p.querySelector('.drd-title'); return t && t.textContent.trim() === entry.title })
      if (!page) { return }
      // The viewer is positioned, so a page's offsetTop is already measured from its top.
      viewer.scrollTop = page.offsetTop
      this.onPage = i
    }
  }
}
</script>

<style scoped>
.sri { border: 2px dashed var(--rs-accent, #0070c0); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.sri-title { margin: 0; color: var(--rs-ink, #002b64); font-size: 14px; font-weight: 700; }
.sri-muted { color: var(--rs-muted, #6b7f99); font-size: 12.5px; margin: 0; }
.sri-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.sri-none { color: var(--rs-muted, #6b7f99); font-style: italic; margin: 0; }
.sri-strip { display: flex; gap: 6px; flex-wrap: wrap; }
.sri-chip { border: 1px solid var(--rs-card-border, #d5e1ee); background: transparent; border-radius: 99px; padding: 3px 10px; font-size: 12px; color: var(--rs-muted, #6b7f99); cursor: pointer; }
.sri-chip.is-on { background: var(--rs-accent, #0070c0); border-color: var(--rs-accent, #0070c0); color: #fff; font-weight: 700; }
.sri-chip:focus-visible { outline: 2px solid var(--rs-accent, #0070c0); outline-offset: 2px; }
.sri-viewer { position: relative; max-height: 620px; overflow-y: auto; border: 1px solid var(--rs-card-border, #d5e1ee); border-radius: 8px; padding: 12px; }
</style>

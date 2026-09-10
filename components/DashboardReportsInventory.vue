<template lang="pug">
.dri-layout
  aside.dri-card
    .dri-group
      .dri-glabel
        span.dri-dot
        h2.dri-h2 {{ $t('report.dashboardReports.inventory.dropTitle') }}
      .dri-drop-zone(:class="{ loaded: !!inventory.stockFile }" @dragover.prevent @drop.prevent="onDrop($event)")
        .dri-drop-title {{ $t('report.dashboardReports.inventory.zoneTitle') }}
        .dri-drop-how {{ $t('report.dashboardReports.inventory.zoneHow') }}
        b-button(size="is-small" :loading="uploading" @click="pickFile") {{ $t('report.dashboardReports.inventory.choose') }}
        input(ref="stockFile" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen($event)")
        p.dri-file-note(v-if="inventory.stockFile") ✓ {{ readNote }}
      p.dri-hint {{ $t('report.dashboardReports.inventory.supported') }}
      p.dri-file-error(v-if="error") {{ error }}
    .dri-group
      .dri-glabel
        span.dri-dot
        h2.dri-h2 {{ $t('report.dashboardReports.inventory.cannotTell') }}
      b-field
        template(#label)
          | {{ $t('report.dashboardReports.inventory.slowObsolete') }}
          provenance-badge(source="entered" size="sm" spaced file-label="" :entered-label="$t('report.dashboardReports.accounts.entered')")
        b-input(type="number" step="any" :value="inventory.slowObsolete" @input="v => change('slowObsolete', v)")
      .dri-lbl
        | {{ $t('report.dashboardReports.inventory.ageingTitle') }}
        provenance-badge(source="entered" size="sm" spaced file-label="" :entered-label="$t('report.dashboardReports.accounts.entered')")
      table.dri-table
        tbody
          tr(v-for="(band, i) in bands" :key="band")
            td {{ $t('report.dashboardReports.inventory.band.' + band) }}
            td.dri-n
              b-input(type="number" step="any" size="is-small" :value="inventory.ageing[i]" @input="v => changeAgeing(i, v)")
      p.dri-hint {{ $t('report.dashboardReports.inventory.ageingHint') }}
  .dri-results
    .dri-read(v-if="inventory.stockFile")
      .dri-glabel
        span.dri-dot
        h2.dri-h2 {{ $t('report.dashboardReports.inventory.readTitle') }}
      table.dri-table.dri-read-table
        thead
          tr
            th {{ $t('report.dashboardReports.inventory.col.category') }}
            th.dri-num {{ $t('report.dashboardReports.inventory.col.products') }}
            th.dri-num {{ $t('report.dashboardReports.inventory.col.onHand') }}
            th.dri-num {{ $t('report.dashboardReports.inventory.col.allocated') }}
            th.dri-num {{ $t('report.dashboardReports.inventory.col.available') }}
            th.dri-num {{ $t('report.dashboardReports.inventory.col.value') }}
        tbody
          tr(v-for="c in inventory.stockFile.categories" :key="c.name")
            td {{ c.name }}
            td.dri-num {{ count(c.lines) }}
            td.dri-num {{ count(c.onHand) }}
            td.dri-num {{ count(c.allocated) }}
            td.dri-num {{ count(c.available) }}
            td.dri-num {{ money(c.value) }}
        tfoot
          tr
            td {{ $t('report.dashboardReports.inventory.total') }}
            td.dri-num {{ count(inventory.stockFile.lineCount) }}
            td.dri-num {{ count(inventory.stockFile.units.onHand) }}
            td.dri-num {{ count(inventory.stockFile.units.allocated) }}
            td.dri-num {{ count(inventory.stockFile.units.available) }}
            td.dri-num {{ money(inventory.stockFile.totalValue) }}
      p.dri-check(v-if="checkText" :class="checkClass") {{ checkText }}
    .dri-edu
      .dri-edu-h {{ $t('report.dashboardReports.inventory.whyTitle') }}
      p {{ $t('report.dashboardReports.inventory.why') }}
    .dri-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.inventory.continue') }}
</template>

<script>
/**
 * DashboardReportsInventory — step 3 of the Business Performance Report: the stock export,
 * and what the accounts cannot tell us about stock (item 4.70; the drawing's step 3,
 * `design/mockups/business-performance-report-intake.html`).
 *
 * Reading is backend-only (`POST /api/report/dashboard-reports/inventory`, firmAuth): the
 * file goes up, the totals come back, and NO product line reaches this screen — the table
 * on the right is value by category, which is all the route sends. A drop replaces the
 * previous read whole. The file total is checked against the balance sheet's stock line by
 * the pages route (`figures.optional.stockVsAccounts`), and the answer is printed here
 * whether it agrees or not: a disagreement is shown, never hidden.
 *
 * Stock at cost, turnover and days on the shelf come from the accounts on step 2 and are
 * not asked for again. Neither Cin7 Core nor Unleashed exports a date, so the slow-or-
 * obsolete figure and the ageing bands stay the advisor's, badged as such wherever they
 * print; a blank ageing table leaves the ageing chart off the page.
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import currencyMixin from '~/mixins/currencyMixin'
import { intlLocaleFor } from '~/utils/dateLocale'
const { pct } = require('~/utils/reportFormat')
const { AGEING_BANDS } = require('~/utils/dashboardReportsSavedShape')

export default {
  name: 'DashboardReportsInventory',

  components: { ProvenanceBadge },

  mixins: [currencyMixin],

  props: {
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** `{ slowObsolete, ageing: [5], stockFile: object|null }` */
    inventory: { type: Object, required: true },
    /** `figures.optional.stockVsAccounts` from the pages route, or null while it is on its way. */
    check: { type: Object, default: null }
  },

  data () {
    return { bands: AGEING_BANDS, uploading: false, error: '' }
  },

  computed: {
    readNote () {
      const f = this.inventory.stockFile
      return this.$t('report.dashboardReports.inventory.readNote', {
        package: f.package, products: this.count(f.lineCount), categories: f.categories.length, locations: f.locations.length
      })
    },
    /** The comparison with the balance sheet, once the pages route has answered. */
    checkText () {
      const c = this.check
      if (!c) { return '' }
      const k = 'report.dashboardReports.inventory.'
      if (c.blocked === 'NO_STOCK_LINE') { return this.$t(k + 'noStockLine') }
      if (!c.available) { return '' }
      if (c.agrees) { return this.$t(k + 'agrees', { file: this.money(c.fileTotal) }) }
      return this.$t(k + 'differs', { file: this.money(c.fileTotal), accounts: this.money(c.accountsStock), gap: this.money(Math.abs(c.gap)), pct: pct(c.gapPct === null ? null : Math.abs(c.gapPct)) })
    },
    checkClass () {
      const c = this.check
      return c && c.available && c.agrees ? 'is-ok' : 'is-caution'
    }
  },

  methods: {
    /** @param {number|null} v @returns {string} */
    count (v) {
      return Number.isFinite(v) ? new Intl.NumberFormat(intlLocaleFor(this.$i18n.locale)).format(Math.round(v)) : '—'
    },
    /** @param {*} v @returns {number|null} */
    toNumber (v) {
      if (v === '' || v === null || v === undefined) { return null }
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : null
    },
    /** @param {string} key @param {*} value */
    change (key, value) {
      // change: the whole inventory object with one field replaced
      this.$emit('change', Object.assign({}, this.inventory, { [key]: this.toNumber(value) }))
    },
    /** @param {number} i @param {*} value */
    changeAgeing (i, value) {
      const ageing = this.inventory.ageing.slice()
      ageing[i] = this.toNumber(value)
      // change: the whole inventory object with one ageing band replaced
      this.$emit('change', Object.assign({}, this.inventory, { ageing }))
    },
    pickFile () {
      this.$refs.stockFile.click()
    },
    /** @param {Event} e */
    onFileChosen (e) {
      const file = e.target.files && e.target.files[0]
      if (file) { this.receive(file) }
      e.target.value = ''
    },
    /** @param {DragEvent} e */
    onDrop (e) {
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || [])
      if (files.length > 1) { this.error = this.$t('report.dashboardReports.inventory.multiDrop'); return }
      if (files[0]) { this.receive(files[0]) }
    },
    /**
     * Pre-upload sanity check — UX only; the backend's own checks are the boundary.
     * @param {File} file @returns {string|null}
     */
    fileCheckError (file) {
      if (!/\.(xlsx|csv)$/i.test(file.name)) { return this.$t('report.fileCheck.wrongType') }
      if (file.size > 5 * 1024 * 1024) { return this.$t('report.fileCheck.tooBig') }
      return null
    },
    /** @param {File} file */
    receive (file) {
      const err = this.fileCheckError(file)
      if (err) { this.error = err; return Promise.resolve() }
      return this.upload(file)
    },
    /** Send the one file; the totals that come back replace any earlier read. @param {File} file */
    async upload (file) {
      this.error = ''
      this.uploading = true
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/report/dashboard-reports/inventory', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.error = (json.error && json.error.message) || this.$t('report.dashboardReports.inventory.uploadFailed')
          return
        }
        // change: the whole inventory object with the read stock export replaced
        this.$emit('change', Object.assign({}, this.inventory, { stockFile: json.data }))
      } catch (e) {
        this.error = this.$t('report.dashboardReports.inventory.uploadFailed')
      } finally {
        this.uploading = false
      }
    }
  }
}
</script>

<style scoped>
.dri-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .dri-layout { grid-template-columns: 1fr; } }
.dri-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.dri-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.dri-group:last-child { border-bottom: 0; }
.dri-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.dri-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.dri-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.dri-hint { font-size: 12px; color: var(--rs-muted); margin: 6px 0 0; }
.dri-lbl { font-size: 12.5px; font-weight: 600; margin: 12px 0 6px; }
.dri-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.dri-table td { padding: 5px 8px; border-bottom: 1px solid var(--rs-line); }
.dri-n { width: 130px; }
.dri-drop-zone { border: 2px dashed #7fd3f1; border-radius: 12px; padding: 16px; background: var(--rs-panel); text-align: center; transition: border-color .15s; }
.dri-drop-zone:hover { border-color: var(--rs-accent); }
.dri-drop-zone.loaded { border-style: solid; border-color: var(--rs-good); background: var(--rs-good-soft); }
.dri-drop-title { font-weight: 600; font-size: 14px; color: var(--rs-ink); }
.dri-drop-how { font-size: 12.5px; color: var(--rs-muted); margin: 4px 0 10px; }
.dri-file-note { font-size: 12.5px; color: var(--rs-good); margin: 10px 0 0; font-weight: 600; }
.dri-file-error { font-size: 12.5px; color: var(--rs-crit); margin: 10px 0 0; }
.dri-results { display: flex; flex-direction: column; gap: 16px; }
.dri-read { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); padding: 15px 16px; }
.dri-read-table th { padding: 5px 8px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); text-align: left; border-bottom: 1px solid var(--rs-line); }
.dri-read-table tfoot td { font-weight: 700; border-bottom: 0; }
.dri-num { text-align: right; white-space: nowrap; }
.dri-check { font-size: 12.5px; font-weight: 600; margin: 12px 0 0; }
.dri-check.is-ok { color: var(--rs-good); }
.dri-check.is-caution { color: var(--rs-crit); }
.dri-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.dri-edu-h { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.dri-edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.dri-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
</style>

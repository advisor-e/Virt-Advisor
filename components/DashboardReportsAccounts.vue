<template lang="pug">
.dra-card
  .dra-group
    .dra-glabel
      span.dra-dot
      h2.dra-h2 {{ $t('report.dashboardReports.accounts.dropTitle') }}
    .dra-drop-grid
      .dra-drop-zone(
        v-for="z in zones"
        :key="z.key"
        :class="{ loaded: loaded[z.key] }"
        @dragover.prevent
        @drop.prevent="onDrop(z.key, $event)")
        .dra-drop-title {{ $t('report.dashboardReports.accounts.zone.' + z.key) }}
        .dra-drop-how {{ $t('report.dashboardReports.accounts.zoneHow.' + z.key) }}
        b-button(size="is-small" :loading="uploading" @click="pickFile(z.key)") {{ $t('report.dashboardReports.accounts.choose') }}
        input(:ref="z.key + 'File'" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen(z.key, $event)")
        p.dra-file-note(v-if="loaded[z.key]") ✓ {{ loaded[z.key] }}
    p.dra-rules
      | {{ $t('report.supportedSoftware') }}
      |
      | {{ $t('report.dashboardReports.accounts.rules') }}
    p.dra-file-error(v-if="error") {{ error }}
    .dra-warn-note(v-for="(w, i) in warnings" :key="'w' + i") ⚠ {{ w }}
  .dra-group
    .dra-glabel
      span.dra-dot
      h2.dra-h2 {{ $t('report.dashboardReports.accounts.confirmTitle') }}
    table.dra-table
      thead
        tr
          th {{ $t('report.dashboardReports.accounts.figure') }}
          th.dra-n {{ $t('report.dashboardReports.accounts.thisYear') }}
          th.dra-n {{ $t('report.dashboardReports.accounts.lastYear') }}
          th {{ $t('report.dashboardReports.accounts.source') }}
      tbody
        template(v-for="section in sections")
          tr.dra-sec(:key="section.key")
            td(colspan="4") {{ $t('report.dashboardReports.accounts.section.' + section.key) }}
          tr(v-for="k in section.lines" :key="k")
            td
              | {{ $t('report.dashboardReports.accounts.line.' + k) }}
              span.dra-memo(v-if="k === 'accountsPayable'")  {{ $t('report.dashboardReports.accounts.memo') }}
            td.dra-n
              b-input(type="number" step="any" size="is-small" :value="current.figures[k].value" @input="v => edit('current', k, v)")
            td.dra-n
              b-input(type="number" step="any" size="is-small" :value="prior.figures[k].value" @input="v => edit('prior', k, v)")
            td
              provenance-badge(
                :source="current.figures[k].source"
                :file-label="$t('report.dashboardReports.accounts.fromFile')"
                :entered-label="$t('report.dashboardReports.accounts.entered')")
              provenance-badge(
                v-if="hasPrior"
                :source="prior.figures[k].source"
                spaced
                :file-label="$t('report.dashboardReports.accounts.fromFile')"
                :entered-label="$t('report.dashboardReports.accounts.entered')")
    .dra-date-note(v-if="dateNote") ✓ {{ dateNote }}
    .dra-confirm-error(v-if="missing.length") {{ $t('report.dashboardReports.accounts.incomplete') }}
  .dra-group.dra-actions
    b-button(type="is-primary" @click="confirm") {{ $t('report.dashboardReports.accounts.confirm') }}
    span.dra-note {{ $t('report.dashboardReports.accounts.typedNote') }}
</template>

<script>
/**
 * DashboardReportsAccounts — step 2 of the Business Performance Report: drop the four
 * exports, confirm the figures the report is built from (item 4.70; the drawing's step 2).
 *
 * Parsing is backend-only (`POST /api/report/dashboard-reports/intake`, firmAuth). The
 * four zones are the advisor's intent; WHICH file is this year is decided on the backend by
 * the reports' own date lines, and the whole set is re-sent on every drop so the two years
 * are always ordered together rather than by the order the zones were filled in.
 *
 * A typed figure loses its "from file" mark, as on every intake screen. The two memo lines
 * (accounts payable inside current liabilities; interest paid) are here because creditor
 * days and the profit and loss page need them — they were not on the approved drawing's
 * table and are recorded as its two additions.
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
const { BALANCE_SHEET_LINES, PROFIT_LOSS_LINES, ENTERED_LINES, LINES } = require('~/server/report/intake/dashboardReportsAssembler')

const ZONES = [{ key: 'bsThis' }, { key: 'plThis' }, { key: 'bsLast' }, { key: 'plLast' }]

/** The lines a report cannot be built without. */
const REQUIRED = ['tradingIncome', 'costOfSales', 'bank', 'currentLiabilities']

export default {
  name: 'DashboardReportsAccounts',

  components: { ProvenanceBadge },

  props: {
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** This year: `{ balanceSheetDate, profitLossDate, figures }` */
    current: { type: Object, required: true },
    /** Last year, same shape. */
    prior: { type: Object, required: true },
    hasPrior: { type: Boolean, default: false }
  },

  data () {
    return {
      zones: ZONES,
      sections: [
        { key: 'balanceSheet', lines: BALANCE_SHEET_LINES },
        { key: 'profitLoss', lines: PROFIT_LOSS_LINES },
        { key: 'entered', lines: ENTERED_LINES }
      ],
      // The File objects held for re-sending; never part of the saved state.
      files: { bsThis: null, plThis: null, bsLast: null, plLast: null },
      loaded: { bsThis: '', plThis: '', bsLast: '', plLast: '' },
      uploading: false,
      error: '',
      warnings: [],
      dateNote: '',
      missing: []
    }
  },

  methods: {
    /** @param {string} zone */
    pickFile (zone) {
      const ref = this.$refs[zone + 'File']
      const el = Array.isArray(ref) ? ref[0] : ref
      if (el) { el.click() }
    },
    /** @param {string} zone @param {Event} event */
    onFileChosen (zone, event) {
      const file = event.target.files && event.target.files[0]
      if (file) { this.receive(zone, file) }
      event.target.value = ''
    },
    /** @param {string} zone @param {DragEvent} event */
    onDrop (zone, event) {
      const files = (event.dataTransfer && event.dataTransfer.files) || []
      if (files.length > 1) { this.error = this.$t('report.dashboardReports.accounts.multiDrop'); return }
      if (files[0]) { this.receive(zone, files[0]) }
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
    /** @param {string} zone @param {File} file */
    receive (zone, file) {
      const err = this.fileCheckError(file)
      if (err) { this.error = err; return }
      this.files[zone] = file
      this.upload()
    },
    /** Send every held file together and lay the answer out as the two years. */
    async upload () {
      this.error = ''
      this.uploading = true
      try {
        const body = new FormData()
        ZONES.forEach((z) => { if (this.files[z.key]) { body.append('file', this.files[z.key]) } })
        const res = await fetch('/api/report/dashboard-reports/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.error = (json.error && json.error.message) || this.$t('report.dashboardReports.accounts.uploadFailed')
          return
        }
        this.apply(json.data)
      } catch (e) {
        this.error = this.$t('report.dashboardReports.accounts.uploadFailed')
      } finally {
        this.uploading = false
      }
    },
    /**
     * The assembled answer onto the table. Every line the files carried replaces the
     * table's, source and all; a line the files did not carry keeps whatever is typed.
     * @param {object} data - per `assembleDashboardIntake`
     */
    apply (data) {
      this.warnings = data.warnings || []
      if (data.blocked) { this.error = data.blocked; return }
      const year = (base, got) => {
        const next = { balanceSheetDate: got.balanceSheetDate, profitLossDate: got.profitLossDate, figures: {} }
        LINES.forEach((k) => {
          next.figures[k] = got.figures[k]
            ? { value: got.figures[k].value, source: got.figures[k].source }
            : Object.assign({}, base.figures[k])
        })
        return next
      }
      const current = data.current ? year(this.current, data.current) : this.current
      const prior = data.prior ? year(this.prior, data.prior) : this.prior
      this.loaded = {
        bsThis: data.current && data.current.balanceSheetDate ? this.$t('report.dashboardReports.accounts.read', { date: data.current.balanceSheetDate }) : '',
        plThis: data.current && data.current.profitLossDate ? this.$t('report.dashboardReports.accounts.read', { date: data.current.profitLossDate }) : '',
        bsLast: data.prior && data.prior.balanceSheetDate ? this.$t('report.dashboardReports.accounts.read', { date: data.prior.balanceSheetDate }) : '',
        plLast: data.prior && data.prior.profitLossDate ? this.$t('report.dashboardReports.accounts.read', { date: data.prior.profitLossDate }) : ''
      }
      this.dateNote = data.current && data.prior && data.current.balanceSheetDate && data.prior.balanceSheetDate
        ? this.$t('report.dashboardReports.accounts.datesOk')
        : ''
      // change: { current, prior, hasPrior, companyName }
      this.$emit('change', { current, prior, hasPrior: Boolean(data.prior), companyName: data.companyName || null })
    },
    /**
     * A typed cell becomes the advisor's figure.
     * @param {'current'|'prior'} which @param {string} key @param {*} value
     */
    edit (which, key, value) {
      const n = value === '' || value === null ? null : parseFloat(value)
      const year = JSON.parse(JSON.stringify(this[which]))
      year.figures[key] = { value: Number.isFinite(n) ? n : null, source: 'entered' }
      this.missing = this.missing.filter(k => k !== key)
      // change: { current, prior, hasPrior } — last year counts as present once a figure is typed into it
      this.$emit('change', {
        current: which === 'current' ? year : this.current,
        prior: which === 'prior' ? year : this.prior,
        hasPrior: which === 'prior' ? true : this.hasPrior
      })
    },
    /** The report needs revenue, cost of sales, bank and current liabilities before it can say anything. */
    confirm () {
      this.missing = REQUIRED.filter(k => !Number.isFinite(this.current.figures[k].value))
      if (this.missing.length) { return }
      // confirmed: no payload — the page already holds the state
      this.$emit('confirmed')
    }
  }
}
</script>

<style scoped>
.dra-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.dra-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.dra-group:last-child { border-bottom: 0; }
.dra-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.dra-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.dra-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.dra-drop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 700px) { .dra-drop-grid { grid-template-columns: 1fr; } }
.dra-drop-zone { border: 2px dashed #7fd3f1; border-radius: 12px; padding: 16px; background: var(--rs-panel); text-align: center; transition: border-color .15s; }
.dra-drop-zone:hover { border-color: var(--rs-accent); }
.dra-drop-zone.loaded { border-style: solid; border-color: var(--rs-good); background: var(--rs-good-soft); }
.dra-drop-title { font-weight: 600; font-size: 14px; color: var(--rs-ink); }
.dra-drop-how { font-size: 12.5px; color: var(--rs-muted); margin: 4px 0 10px; }
.dra-file-note { font-size: 12.5px; color: var(--rs-good); margin: 10px 0 0; font-weight: 600; }
.dra-file-error { font-size: 12.5px; color: var(--rs-crit); margin: 10px 0 0; }
.dra-rules { font-size: 12.5px; color: var(--rs-muted); margin: 12px 0 0; }
.dra-warn-note { font-size: 12.5px; color: #b36b00; background: var(--rs-warn-soft); border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
.dra-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.dra-table th { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--rs-muted); text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--rs-line); font-weight: 600; }
.dra-table td { padding: 6px 10px; border-bottom: 1px solid var(--rs-line); vertical-align: middle; }
.dra-n { text-align: right; width: 150px; }
.dra-sec td { background: var(--rs-panel-2); font-weight: 600; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--rs-muted); }
.dra-memo { font-size: 11.5px; color: var(--rs-muted); }
.dra-date-note { font-size: 12.5px; font-weight: 600; color: var(--rs-good); background: var(--rs-good-soft); border-radius: 9px; padding: 10px 14px; margin-top: 14px; }
.dra-confirm-error { font-size: 12.5px; font-weight: 600; color: var(--rs-crit); background: var(--rs-crit-soft); border-radius: 9px; padding: 10px 14px; margin-top: 14px; }
.dra-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dra-note { font-size: 12.5px; color: var(--rs-muted); }
</style>

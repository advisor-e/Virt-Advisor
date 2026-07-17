<template lang="pug">
.ed-intake
  //- ── Step 1: drop up to five years of P&L exports ──
  section(v-if="phase === 'drop'")
    .drop-zone(:class="{ loaded: staged.length > 0 }" @dragover.prevent @drop.prevent="onDrop($event)")
      .drop-title {{ $t('report.ebitdaDcf.drop.title') }}
      .drop-how {{ $t('report.ebitdaDcf.drop.how') }}
      .drop-seeds {{ $t('report.ebitdaDcf.drop.seeds') }}
      b-button(type="is-primary" :loading="uploading" @click="pickFiles") {{ $t('report.ebitdaDcf.drop.choose') }}
      input(ref="fileInput" type="file" accept=".xlsx,.csv" multiple hidden @change="onFilesChosen($event)")
      ul.staged(v-if="staged.length")
        li(v-for="(f, i) in staged" :key="i")
          | {{ f.name }}
          a.remove(href="#" @click.prevent="removeStaged(i)") ✕
      p.file-error(v-if="dropError") {{ dropError }}
    .drop-rules
      p {{ $t('report.ebitdaDcf.drop.rules') }}
      a(href="#" @click.prevent="skipManual") {{ $t('report.ebitdaDcf.drop.skip') }}
    .drop-actions
      b-button(type="is-primary" :disabled="staged.length === 0" :loading="uploading" @click="uploadAll") {{ $t('report.ebitdaDcf.drop.read', { n: staged.length }) }}

  //- ── Step 1b: assign years the files could not state ──
  section(v-else-if="phase === 'years'")
    .confirm-card
      h2 {{ $t('report.ebitdaDcf.years.title') }}
      p.note {{ $t('report.ebitdaDcf.years.note') }}
      table.confirm-table
        thead
          tr
            th {{ $t('report.ebitdaDcf.years.file') }}
            th {{ $t('report.ebitdaDcf.years.reportDate') }}
            th {{ $t('report.ebitdaDcf.years.year') }}
        tbody
          tr(v-for="(f, i) in parsedFiles" :key="i")
            td {{ $t('report.ebitdaDcf.years.fileN', { n: i + 1 }) }} — {{ f.companyName || '—' }}
            td {{ f.reportDate || '—' }}
            td
              b-input(v-model.number="f.year" type="number" step="1")
      .warn-note(v-for="(w, i) in warnings" :key="'yw' + i") ⚠ {{ w }}
    .drop-actions
      b-button(type="is-primary" :disabled="!yearsResolved" @click="applyYears") {{ $t('report.ebitdaDcf.years.apply') }}
      b-button(@click="phase = 'drop'") {{ $t('report.ebitdaDcf.back') }}

  //- ── Step 2: confirm & normalise ──
  section(v-else)
    .confirm-card
      h2 {{ $t('report.ebitdaDcf.confirm.title') }}
      .tscroll
        table.confirm-table
          thead
            tr
              th {{ $t('report.ebitdaDcf.confirm.line') }}
              th(v-for="y in displayYears" :key="'h' + y") {{ y }}
              th {{ $t('report.ebitdaDcf.confirm.source') }}
          tbody
            template(v-for="group in rowGroups")
              tr.grp(:key="group.key")
                td(:colspan="displayYears.length + 2") {{ $t('report.ebitdaDcf.confirm.group.' + group.key) }}
              tr(v-for="row in group.rows" :key="row")
                td {{ $t('report.ebitdaDcf.confirm.row.' + row) }}
                td(v-for="(y, c) in displayYears" :key="row + y")
                  b-input(v-model.number="figures[row][displayIndex(c)].value" type="number" step="any" size="is-small" @input="markEntered(row, displayIndex(c))")
                td
                  span.src(:class="rowSource(row) === 'file' ? 'src-file' : 'src-hand'")
                    | {{ rowSource(row) === 'file' ? $t('report.ebitdaDcf.confirm.fromFile') : $t('report.ebitdaDcf.confirm.entered') }}
      .warn-note(v-for="(w, i) in warnings" :key="'w' + i") ⚠ {{ w }}
      p.note {{ $t('report.ebitdaDcf.confirm.notesHint') }}
    .drop-actions
      b-button(type="is-primary" @click="confirmFigures") {{ $t('report.ebitdaDcf.confirm.build') }}
      span.adjust-note {{ $t('report.ebitdaDcf.confirm.adjustLater') }}
</template>

<script>
/**
 * EbitdaDcfIntake — steps 1 + 2 of the EBITDA & DCF valuation report
 * (owner-approved mockup, 2026-07-17): drop up to five years of Xero P&L exports,
 * then confirm every figure — per year, with its provenance tag — before the
 * valuation is built.
 *
 * Parsing and multi-file assembly are backend-only (POST
 * /api/report/ebitda-dcf/intake, firmAuth — server/report/intake/annualAssembler.js);
 * this component uploads the files and renders the proposals. When a file's own
 * date line carried no readable year the backend hands assembly to this screen:
 * the advisor assigns the years, and the ordering (no business maths) happens here.
 */

// Engine defaults (source-sheet sample, oldest-first) — the values every cell the
// files cannot seed is pre-filled with, tagged *entered* (contract rule 3).
const YEAR_DEFAULTS = {
  sales: [1014578, 1457890, 3545789, 4656897, 6809564],
  costOfSales: [765324, 856327, 2597414, 3856457, 5554687],
  operatingExpenses: [185633, 365214, 349652, 345786, 895366],
  otherIncome: [3500, 15247, 12564, 7800, 64600],
  interestReceived: [0, 365, 789, 489, 563],
  dividendsReceived: [0, 0, 0, 0, 0],
  badDebtsRecovered: [0, 0, 0, 0, 0],
  managementFees: [0, 0, 0, 0, 0],
  loanInterestPaid: [9800, 10500, 13000, 11000, 74121],
  consentCosts: [0, 0, 0, 0, 0],
  extraordinaryItems: [0, 0, 0, 0, 0],
  establishmentCosts: [0, 0, 0, 0, 0],
  shareholderSalaries: [187500, 187500, 187500, 187500, 187500],
  insuranceRetirement: [7500, 7500, 7500, 7500, 7500],
  ownersVehicles: [16000, 16000, 16000, 16000, 16000],
  leaseholdImprovements: [15000, 15000, 15000, 15000, 15000],
  assetUpgrades: [0, 0, 0, 0, 0],
  other3: [0, 0, 0, 0, 0],
  other4: [0, 0, 0, 0, 0],
  other5: [0, 0, 0, 0, 0],
  fmSalaries: [140000, 140000, 140000, 140000, 140000],
  fmInsuranceRetirement: [2500, 2500, 2500, 2500, 2500],
  fmVehicles: [9000, 9000, 9000, 9000, 9000],
  fmFringeBenefits: [1500, 1500, 1500, 1500, 1500]
}

// Which assembler/plFigures key seeds each row (rows without one are always *entered*)
const FILE_KEYS = {
  sales: 'sales',
  costOfSales: 'costOfSales',
  operatingExpenses: 'operatingExpenses',
  otherIncome: 'otherIncome',
  interestReceived: 'interestReceived',
  dividendsReceived: 'dividendsReceived',
  badDebtsRecovered: 'badDebtsRecovered',
  loanInterestPaid: 'loanInterestPaid'
}

const ROW_GROUPS = [
  { key: 'pnl', rows: ['sales', 'costOfSales', 'operatingExpenses'] },
  { key: 'sundry', rows: ['otherIncome', 'interestReceived', 'dividendsReceived', 'badDebtsRecovered'] },
  { key: 'addBacks', rows: ['managementFees', 'loanInterestPaid', 'consentCosts', 'extraordinaryItems', 'establishmentCosts', 'shareholderSalaries', 'insuranceRetirement', 'ownersVehicles', 'leaseholdImprovements', 'assetUpgrades', 'other3', 'other4', 'other5'] },
  { key: 'fairMarket', rows: ['fmSalaries', 'fmInsuranceRetirement', 'fmVehicles', 'fmFringeBenefits'] }
]

export default {
  name: 'EbitdaDcfIntake',

  props: {
    // Verified login pass (JWT); the intake route is firmAuth-guarded.
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      phase: 'drop', // 'drop' | 'years' | 'confirm'
      staged: [], // File objects awaiting upload
      uploading: false,
      dropError: null,
      parsedFiles: [], // backend per-file results (year editable in the 'years' phase)
      warnings: [],
      years: [2021, 2022, 2023, 2024, 2025], // oldest-first, set by the files
      figures: this.defaultFigures(5),
      companyName: null,
      rowGroups: ROW_GROUPS
    }
  },

  computed: {
    /** Confirm-table columns, latest year first (the approved mockup's orientation). */
    displayYears () {
      return this.years.slice().reverse()
    },
    /** Every file has a usable, distinct year. */
    yearsResolved () {
      const ys = this.parsedFiles.map(f => f.year)
      return ys.every(y => Number.isInteger(y) && y > 1900) && new Set(ys).size === ys.length
    }
  },

  methods: {
    /**
     * Fresh figures state: every row × n years pre-filled with the engine default,
     * tagged *entered*. Oldest-first, matching `years`.
     * @param {number} n @returns {object}
     */
    defaultFigures (n) {
      const out = {}
      Object.keys(YEAR_DEFAULTS).forEach((row) => {
        const def = YEAR_DEFAULTS[row]
        out[row] = def.slice(def.length - n).map(v => ({ value: v, source: 'entered' }))
      })
      return out
    },
    /** Display column c → oldest-first index into the figures arrays. */
    displayIndex (c) {
      return this.years.length - 1 - c
    },
    /** A row is tagged *from file* while any of its cells still carries a file figure. */
    rowSource (row) {
      return this.figures[row].some(cell => cell.source === 'file') ? 'file' : 'entered'
    },
    /** An edited cell becomes the advisor's figure. @param {string} row @param {number} idx */
    markEntered (row, idx) {
      this.figures[row][idx].source = 'entered'
    },
    pickFiles () {
      this.$refs.fileInput.click()
    },
    /** @param {Event} event */
    onFilesChosen (event) {
      this.stage(event.target.files)
      event.target.value = ''
    },
    /** @param {DragEvent} event */
    onDrop (event) {
      this.stage(event.dataTransfer && event.dataTransfer.files)
    },
    /** @param {FileList|null} list */
    stage (list) {
      this.dropError = null
      const incoming = Array.from(list || [])
      const room = 5 - this.staged.length
      if (incoming.length > room) {
        this.dropError = this.$t('report.ebitdaDcf.drop.tooMany')
      }
      this.staged = this.staged.concat(incoming.slice(0, Math.max(0, room)))
    },
    /** @param {number} i */
    removeStaged (i) {
      this.staged.splice(i, 1)
    },
    /** One request carries every staged file; the backend parses + assembles. */
    async uploadAll () {
      this.dropError = null
      this.uploading = true
      try {
        const body = new FormData()
        this.staged.forEach((f) => { body.append('file', f) })
        const res = await fetch('/api/report/ebitda-dcf/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.dropError = (json.error && json.error.message) || this.$t('report.ebitdaDcf.drop.uploadFailed')
          return
        }
        this.warnings = json.data.warnings || []
        this.parsedFiles = json.data.files || []
        this.companyName = (this.parsedFiles.find(f => f.companyName) || {}).companyName || null
        if (json.data.assembled) {
          this.applyAssembled(json.data.assembled)
          this.phase = 'confirm'
          // step: which intake step is showing (1 = drop, 2 = confirm)
          this.$emit('step', 2)
        } else {
          // The backend could not order the years — the advisor assigns them here
          this.phase = 'years'
        }
      } catch (e) {
        this.dropError = this.$t('report.ebitdaDcf.drop.uploadFailed')
      } finally {
        this.uploading = false
      }
    },
    /** Seed the confirm table from the backend's oldest-first arrays. @param {object} a */
    applyAssembled (a) {
      this.years = a.years
      this.figures = this.defaultFigures(a.years.length)
      Object.keys(FILE_KEYS).forEach((row) => {
        const series = FILE_KEYS[row] in a ? a[FILE_KEYS[row]] : (a.sundry ? a.sundry[FILE_KEYS[row]] : null)
        if (!series) { return }
        series.forEach((v, idx) => {
          if (typeof v === 'number') {
            this.figures[row][idx].value = v
            this.figures[row][idx].source = 'file'
          }
        })
      })
    },
    /** Advisor-assigned years: order the per-file proposals oldest-first locally (no maths). */
    applyYears () {
      const ordered = this.parsedFiles.slice().sort((a, b) => a.year - b.year)
      this.years = ordered.map(f => f.year)
      this.figures = this.defaultFigures(ordered.length)
      Object.keys(FILE_KEYS).forEach((row) => {
        ordered.forEach((f, idx) => {
          const p = f.figures && f.figures[FILE_KEYS[row]]
          if (p && typeof p.value === 'number') {
            this.figures[row][idx].value = p.value
            this.figures[row][idx].source = 'file'
          }
        })
      })
      this.phase = 'confirm'
      // step: which intake step is showing (1 = drop, 2 = confirm)
      this.$emit('step', 2)
    },
    /** Manual path: five default years, every figure the advisor's. */
    skipManual () {
      this.years = [2021, 2022, 2023, 2024, 2025]
      this.figures = this.defaultFigures(5)
      this.parsedFiles = []
      this.warnings = []
      this.companyName = null
      this.phase = 'confirm'
      // step: which intake step is showing (1 = drop, 2 = confirm)
      this.$emit('step', 2)
    },
    /** Hand the confirmed figures (oldest-first) to the report screen. */
    confirmFigures () {
      // confirmed: { years, figures: {row: [{value, source}] oldest-first}, companyName }
      this.$emit('confirmed', {
        years: this.years.slice(),
        figures: JSON.parse(JSON.stringify(this.figures)),
        companyName: this.companyName
      })
    }
  }
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #7fd3f1; border-radius: 14px; background: #fff;
  padding: 26px 20px; text-align: center; transition: border-color .15s; margin-bottom: 16px;
}
.drop-zone:hover { border-color: #0070c0; }
.drop-zone.loaded { border-style: solid; border-color: #4ca52d; background: #4ca52d12; }
.drop-title { font-weight: 600; font-size: 15px; color: #002b64; }
.drop-how, .drop-seeds { font-size: 12.5px; color: #5b6f8a; margin: 4px 0 10px; }
.staged { list-style: none; margin: 12px auto 0; padding: 0; max-width: 460px; text-align: left; }
.staged li { font-size: 12.5px; color: #002b64; background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 7px; padding: 6px 10px; margin-top: 6px; display: flex; justify-content: space-between; gap: 10px; }
.staged .remove { color: #ff0000; text-decoration: none; font-weight: 600; }
.file-error { font-size: 12.5px; color: #ff0000; margin-top: 8px; }
.drop-rules { font-size: 12.5px; color: #5b6f8a; background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 9px; padding: 12px 15px; margin-bottom: 16px; }
.drop-rules a { color: #0070c0; font-weight: 600; }
.drop-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.adjust-note, .note { font-size: 12px; color: #5b6f8a; }
.confirm-card { background: #fff; border: 1px solid #d5e1ee; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.confirm-card h2 { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #002b64; font-weight: 600; margin-bottom: 10px; }
.tscroll { overflow-x: auto; }
.confirm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.confirm-table th { font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: #5b6f8a; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d5e1ee; white-space: nowrap; }
.confirm-table td { padding: 6px 8px; border-bottom: 1px solid #eef3f8; vertical-align: middle; min-width: 96px; }
.confirm-table td:first-child { min-width: 220px; }
.confirm-table tr.grp td { padding-top: 14px; font-weight: 600; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #0070c0; border-bottom: 1px solid #d5e1ee; }
.src { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; padding: 2.5px 7px; border-radius: 999px; white-space: nowrap; }
.src-file { color: #0070c0; background: #0070c018; border: 1px solid #0070c04d; }
.src-hand { color: #b36b00; background: #ff99001a; border: 1px solid #ff990059; }
.warn-note { font-size: 12.5px; color: #b36b00; background: #ff99001a; border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
</style>

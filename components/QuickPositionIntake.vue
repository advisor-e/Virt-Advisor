<template lang="pug">
.qp-intake
  //- ── Step 1: drop the exports ──
  section(v-if="phase === 'drop'")
    .drop-grid
      .drop-zone(:class="{ loaded: !!bsResult }" @dragover.prevent @drop.prevent="onDrop('bs', $event)")
        .drop-title {{ $t('report.quickPosition.drop.bsTitle') }}
        .drop-how {{ $t('report.quickPosition.drop.bsHow') }}
        .drop-seeds {{ $t('report.quickPosition.drop.bsSeeds') }}
        b-button(type="is-primary" :loading="uploading.bs" @click="pickFile('bs')") {{ $t('report.quickPosition.drop.choose') }}
        input(ref="bsFile" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen('bs', $event)")
        p.file-note(v-if="bsResult") ✓ {{ $t('report.quickPosition.drop.bsRead', { n: bsProposalCount }) }}
        p.file-error(v-if="errors.bs") {{ errors.bs }}
      .drop-zone(:class="{ loaded: !!plResult }" @dragover.prevent @drop.prevent="onDrop('pl', $event)")
        .drop-title {{ $t('report.quickPosition.drop.plTitle') }}
          span.optional  ({{ $t('report.quickPosition.drop.optional') }})
        .drop-how {{ $t('report.quickPosition.drop.plHow') }}
        .drop-seeds {{ $t('report.quickPosition.drop.plSeeds') }}
        b-button(:loading="uploading.pl" @click="pickFile('pl')") {{ $t('report.quickPosition.drop.choose') }}
        input(ref="plFile" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen('pl', $event)")
        p.file-note(v-if="plResult") ✓ {{ $t('report.quickPosition.drop.plRead', { n: plResult.expenseLines.length }) }}
        p.file-error(v-if="errors.pl") {{ errors.pl }}
    .drop-rules
      p {{ $t('report.quickPosition.drop.rules') }}
      a(href="#" @click.prevent="skipManual") {{ $t('report.quickPosition.drop.skip') }}
    .drop-actions
      b-button(type="is-primary" :disabled="!bsResult" @click="toConfirm") {{ $t('report.quickPosition.drop.continue') }}

  //- ── Step 2: confirm the figures ──
  section(v-else)
    .confirm-card
      h2 {{ $t('report.quickPosition.confirm.title') }}
      table.confirm-table
        thead
          tr
            th {{ $t('report.quickPosition.confirm.figure') }}
            th {{ $t('report.quickPosition.confirm.value') }}
            th {{ $t('report.quickPosition.confirm.source') }}
        tbody
          tr(v-for="key in visibleFigureKeys" :key="key" :class="{ 'row-invalid': invalidKeys.includes(key) }")
            td
              | {{ $t('report.quickPosition.confirm.' + key) }}
              .stock-candidates(v-if="key === 'stock' && stockCandidates.length")
                .cand-head {{ $t('report.quickPosition.confirm.stockCandidates', { n: stockCandidates.length }) }}
                b-checkbox(v-for="(c, i) in stockCandidates" :key="i" v-model="c.selected" @input="applyStockCandidates")
                  | {{ c.label }} — {{ money(c.value) }}
            td
              b-input(v-model.number="figures[key].value" type="number" step="any" :disabled="key === 'stock' && stockCandidates.length > 0" @input="markEntered(key)")
            td
              provenance-badge(
                :source="figures[key].source"
                :file-label="$t('report.quickPosition.confirm.fromFile')"
                :entered-label="$t('report.quickPosition.confirm.entered')"
              )
      .date-note(v-if="dateNote" :class="dateNote.ok ? 'date-ok' : 'date-warn'") {{ dateNote.text }}
      .warn-note(v-for="(w, i) in warnings" :key="'w' + i") ⚠ {{ w }}
      b-checkbox.svc-toggle(v-model="serviceBusiness")
        | {{ $t('report.quickPosition.confirm.serviceToggle') }}
      .confirm-error(v-if="invalidKeys.length") {{ $t('report.quickPosition.confirm.incomplete') }}
    .drop-actions
      b-button(type="is-primary" @click="confirmFigures") {{ $t('report.quickPosition.confirm.build') }}
      span.adjust-note {{ $t('report.quickPosition.confirm.adjustLater') }}
</template>

<script>
/**
 * QuickPositionIntake — steps 1 + 2 of the Quick Position report (owner-approved
 * mockup, 2026-07-16): drop the Xero exports, then confirm every figure with its
 * provenance tag before the report is built.
 *
 * Parsing is backend-only (POST /api/report/quick-position/intake, firmAuth) — this
 * component uploads the file and renders the proposals; it never reads the file
 * itself. Hybrid intake per REPORT-DATA-MODEL §4: file-seeded figures are tagged
 * *from file*, everything else is pre-filled with the model default and tagged
 * *entered*; a figure the file can't supply is never guessed.
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'

export default {
  name: 'QuickPositionIntake',

  components: { ProvenanceBadge },

  props: {
    // Verified login pass (JWT); the intake route is firmAuth-guarded.
    apiToken: { type: String, default: 'dev-local-bypass' },
    // Previously confirmed payload — when present the intake opens with every figure
    // and badge exactly as confirmed (R12: stepping back must never wipe them).
    restore: { type: Object, default: null },
    // The page's current step (1 = drop, 2 = confirm) — replaces the old $refs reach-in.
    step: { type: Number, default: 1 }
  },

  data () {
    const r = this.restore
    return {
      phase: r && this.step !== 1 ? 'confirm' : 'drop', // 'drop' | 'confirm'
      uploading: { bs: false, pl: false },
      bsResult: null,
      plResult: null,
      errors: { bs: null, pl: null },
      // Model defaults = the source sheet's sample figures (contract rule 3);
      // a restore payload takes their place wholesale, badges included.
      figures: r && r.figures
        ? JSON.parse(JSON.stringify(r.figures))
        : {
            cash: { value: 296155, source: 'entered' },
            debtors: { value: 154906, source: 'entered' },
            stock: { value: 25847, source: 'entered' },
            creditors: { value: 63000, source: 'entered' },
            wagesDue: { value: 32000, source: 'entered' },
            fixedAssets: { value: 30000, source: 'entered' }
          },
      figureKeys: ['cash', 'debtors', 'stock', 'creditors', 'wagesDue', 'fixedAssets'],
      stockCandidates: [],
      serviceBusiness: r ? !!r.serviceBusiness : false,
      warnings: [],
      // Figure keys that blocked the last build attempt (empty / non-numeric value)
      invalidKeys: []
    }
  },

  computed: {
    /** The confirm-table rows — the stock line drops out entirely for a service business (owner ruling). */
    visibleFigureKeys () {
      return this.serviceBusiness ? this.figureKeys.filter(k => k !== 'stock') : this.figureKeys
    },
    /** How many figures the Balance Sheet proposed (for the step-1 note). */
    bsProposalCount () {
      return this.bsResult ? Object.keys(this.bsResult.proposals || {}).length : 0
    },
    /** Reporting-date agreement between the two files (§3.7). */
    dateNote () {
      if (!this.bsResult || !this.plResult) {
        if (this.bsResult && this.bsResult.reportDate) {
          return { ok: true, text: this.$t('report.quickPosition.confirm.datesAgree', { date: this.bsResult.reportDate }) }
        }
        return null
      }
      const a = this.datePart(this.bsResult.reportDate)
      const b = this.datePart(this.plResult.reportDate)
      if (a && b && a === b) {
        return { ok: true, text: this.$t('report.quickPosition.confirm.datesAgree', { date: a }) }
      }
      return { ok: false, text: this.$t('report.quickPosition.confirm.datesDiffer', { a: this.bsResult.reportDate, b: this.plResult.reportDate }) }
    }
  },

  watch: {
    /** Chip navigation from the page — proper one-way flow, no $refs reach-in (R12). */
    step (n) {
      if (n === 1) { this.phase = 'drop' } else if (n === 2) { this.phase = 'confirm' }
    }
  },

  methods: {
    /** @param {number} n */
    money (n) {
      return '$' + Math.round(n).toLocaleString('en-US')
    },
    /** Pull the "12 March 2026"-style token out of a report date line. @param {string} s */
    datePart (s) {
      const m = /(\d{1,2}\s+\w+\s+\d{4})\s*$/.exec(String(s || ''))
      return m ? m[1] : null
    },
    /** @param {'bs'|'pl'} kind */
    pickFile (kind) {
      this.$refs[kind + 'File'].click()
    },
    /** @param {'bs'|'pl'} kind @param {Event} event */
    onFileChosen (kind, event) {
      const file = event.target.files && event.target.files[0]
      if (file) { this.receive(kind, file) }
      event.target.value = ''
    },
    /** @param {'bs'|'pl'} kind @param {DragEvent} event */
    onDrop (kind, event) {
      const files = (event.dataTransfer && event.dataTransfer.files) || []
      if (files.length > 1) {
        this.$set(this.errors, kind, this.$t('report.quickPosition.drop.multiDrop'))
        return
      }
      if (files[0]) { this.receive(kind, files[0]) }
    },
    /**
     * Pre-upload sanity check — UX only; the backend's magic-byte and size checks
     * remain the real boundary. @param {File} file @returns {string|null}
     */
    fileCheckError (file) {
      if (!/\.(xlsx|csv)$/i.test(file.name)) { return this.$t('report.fileCheck.wrongType') }
      if (file.size > 5 * 1024 * 1024) { return this.$t('report.fileCheck.tooBig') }
      return null
    },
    /** Route a chosen/dropped file through the pre-upload check. @param {'bs'|'pl'} kind @param {File} file */
    receive (kind, file) {
      const err = this.fileCheckError(file)
      if (err) { this.$set(this.errors, kind, err) } else { this.upload(kind, file) }
    },
    /**
     * Upload one export to the backend parser and apply what it proposes.
     * @param {'bs'|'pl'} kind - which drop zone was used.
     * @param {File} file
     */
    async upload (kind, file) {
      this.$set(this.errors, kind, null)
      this.$set(this.uploading, kind, true)
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/report/quick-position/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.$set(this.errors, kind, (json.error && json.error.message) || this.$t('report.quickPosition.drop.uploadFailed'))
          return
        }
        // Auto-detection means either zone accepts either report — route by kind found
        if (json.data.kind === 'balanceSheet') {
          this.applyBalanceSheet(json.data)
          if (kind === 'pl') { this.$set(this.errors, 'pl', null) }
        } else if (json.data.kind === 'profitLoss') {
          this.plResult = json.data
        } else {
          this.$set(this.errors, kind, this.$t('report.quickPosition.drop.uploadFailed'))
        }
      } catch (e) {
        this.$set(this.errors, kind, this.$t('report.quickPosition.drop.uploadFailed'))
      } finally {
        this.$set(this.uploading, kind, false)
      }
    },
    /** Apply the Balance Sheet proposals to the confirm table. @param {object} data */
    applyBalanceSheet (data) {
      this.bsResult = data
      this.warnings = data.warnings || []
      const p = data.proposals || {}
      const simple = ['cash', 'debtors', 'creditors', 'wagesDue']
      simple.forEach((key) => {
        if (p[key]) {
          this.figures[key].value = p[key].value
          this.figures[key].source = 'file'
        }
      })
      if (p.stock) {
        this.stockCandidates = p.stock.candidates.map(c => ({ label: c.label, value: c.value, selected: true }))
        this.applyStockCandidates()
      }
    },
    /** Recompute the stock figure from the ticked candidate rows. */
    applyStockCandidates () {
      const total = this.stockCandidates.filter(c => c.selected).reduce((t, c) => t + c.value, 0)
      this.figures.stock.value = total
      this.figures.stock.source = 'file'
    },
    /** Manual path: every figure is the advisor's, tagged accordingly. */
    skipManual () {
      this.figureKeys.forEach((key) => { this.figures[key].source = 'entered' })
      this.stockCandidates = []
      this.phase = 'confirm'
      // step: which intake step is showing (1 = drop, 2 = confirm)
      this.$emit('step', 2)
    },
    toConfirm () {
      this.phase = 'confirm'
      // step: which intake step is showing (1 = drop, 2 = confirm)
      this.$emit('step', 2)
    },
    /** An edited cell becomes the advisor's figure (mirrors EbitdaDcfIntake). @param {string} key */
    markEntered (key) {
      this.figures[key].source = 'entered'
      this.invalidKeys = this.invalidKeys.filter(k => k !== key)
    },
    /**
     * Hand the confirmed figures to the report screen. Every visible figure must be a
     * real number first — an empty box must never fall through to a sample default
     * (intake contract §4.4: an assumption must never pass as a fact).
     */
    confirmFigures () {
      this.invalidKeys = this.visibleFigureKeys.filter(key => !Number.isFinite(this.figures[key].value))
      if (this.invalidKeys.length) { return }
      // confirmed: { figures, serviceBusiness, expenseLines, incomeTotal, companyName }
      // Restored mode has no upload state — the prior payload's P&L data carries forward (R12)
      this.$emit('confirmed', {
        figures: JSON.parse(JSON.stringify(this.figures)),
        serviceBusiness: this.serviceBusiness,
        expenseLines: this.plResult ? this.plResult.expenseLines : (this.restore ? this.restore.expenseLines : null),
        incomeTotal: this.plResult ? this.plResult.incomeTotal : (this.restore ? this.restore.incomeTotal : null),
        companyName: (this.bsResult && this.bsResult.companyName) || (this.restore ? this.restore.companyName : null)
      })
    }
  }
}
</script>

<style scoped>
.drop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 700px) { .drop-grid { grid-template-columns: 1fr; } }
.drop-zone {
  border: 2px dashed #7fd3f1; border-radius: 14px; background: #fff;
  padding: 26px 20px; text-align: center; transition: border-color .15s;
}
.drop-zone:hover { border-color: #0070c0; }
.drop-zone.loaded { border-style: solid; border-color: #4ca52d; background: #4ca52d12; }
.drop-title { font-weight: 600; font-size: 15px; color: #002b64; }
.drop-title .optional { font-weight: 300; color: #5b6f8a; }
.drop-how, .drop-seeds { font-size: 12.5px; color: #5b6f8a; margin: 4px 0 10px; }
.file-note { font-size: 12.5px; color: #4ca52d; margin-top: 8px; font-weight: 600; }
.file-error { font-size: 12.5px; color: #ff0000; margin-top: 8px; }
.drop-rules { font-size: 12.5px; color: #5b6f8a; background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 9px; padding: 12px 15px; margin-bottom: 16px; }
.drop-rules a { color: #0070c0; font-weight: 600; }
.drop-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.adjust-note { font-size: 12px; color: #5b6f8a; }
.confirm-card { background: #fff; border: 1px solid #d5e1ee; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.confirm-card h2 { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #002b64; font-weight: 600; margin-bottom: 10px; }
.confirm-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.confirm-table th { font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: #5b6f8a; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d5e1ee; }
.confirm-table td { padding: 8px 10px; border-bottom: 1px solid #d5e1ee; vertical-align: middle; }
/* Badge styling lives in components/base/ProvenanceBadge.vue (Phase 3). */
.stock-candidates { background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 9px; padding: 10px 12px; margin-top: 8px; }
.cand-head { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; color: #0070c0; margin-bottom: 6px; }
.date-note { font-size: 12.5px; font-weight: 600; padding: 10px 14px; border-radius: 9px; margin-top: 14px; }
.date-ok { color: #4ca52d; background: #4ca52d1a; }
.date-warn { color: #b36b00; background: #ff99001a; }
.warn-note { font-size: 12.5px; color: #b36b00; background: #ff99001a; border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
.row-invalid td { background: #ff00000a; }
.confirm-error { font-size: 12.5px; font-weight: 600; color: #ff0000; background: #ff00001a; border-radius: 9px; padding: 10px 14px; margin-top: 14px; }
.svc-toggle { margin-top: 14px; }
</style>

<template lang="pug">
.qp-report
  .layout
    aside.controls
      .group
        h2 {{ $t('report.quickPosition.aside.assets') }}
        .field(v-for="f in visibleFactorFields" :key="f.key")
          .row
            label
              | {{ $t('report.quickPosition.aside.' + f.key + 'Factor') }}
              span.src(:class="sources[f.key] === 'file' ? 'src-file' : 'src-hand'")
                | {{ sources[f.key] === 'file' ? $t('report.quickPosition.confirm.fromFile') : $t('report.quickPosition.confirm.entered') }}
            output {{ money(inputs[f.key]) }} × {{ inputs[f.key + 'Factor'] }}%
          input(type="range" min="0" max="100" step="5" v-model.number="inputs[f.key + 'Factor']")
      //- R11: creditors/wagesDue shape the result but had no on-screen presence — shown
      //- read-only with their provenance (making them editable is a separate design call)
      .group
        h2 {{ $t('report.quickPosition.aside.liabilities') }}
        .field(v-for="k in ['creditors', 'wagesDue']" :key="k")
          .row
            label
              | {{ $t('report.quickPosition.confirm.' + k) }}
              span.src(:class="sources[k] === 'file' ? 'src-file' : 'src-hand'")
                | {{ sources[k] === 'file' ? $t('report.quickPosition.confirm.fromFile') : $t('report.quickPosition.confirm.entered') }}
            output {{ money(inputs[k]) }}
      .group
        h2 {{ $t('report.quickPosition.aside.outgoings') }}
        .field
          .row
            label
              | {{ $t('report.quickPosition.aside.fixedCosts') }}
              span.src(:class="sources.monthlyFixedCosts === 'file' ? 'src-file' : 'src-hand'")
                | {{ sources.monthlyFixedCosts === 'file' ? $t('report.quickPosition.confirm.fromFile') : $t('report.quickPosition.confirm.entered') }}
            output {{ money(inputs.monthlyFixedCosts) }}
          input(type="range" min="0" :max="moneyMax('monthlyFixedCosts', 60000, 500)" step="500" v-model.number="inputs.monthlyFixedCosts" @input="fixedCostsEntered")
        .field
          .row
            label {{ $t('report.quickPosition.aside.drawings') }}
            output {{ money(inputs.monthlyDrawings) }}
          input(type="range" min="0" :max="moneyMax('monthlyDrawings', 30000, 500)" step="500" v-model.number="inputs.monthlyDrawings")
        .field
          .row
            label {{ $t('report.quickPosition.aside.loanRepayments') }}
            output {{ money(inputs.monthlyLoanRepayments) }}
          input(type="range" min="0" :max="moneyMax('monthlyLoanRepayments', 30000, 500)" step="500" v-model.number="inputs.monthlyLoanRepayments")
      .group
        h2 {{ $t('report.quickPosition.aside.lifeline') }}
          span.note  {{ $t('report.quickPosition.aside.lifelineNote') }}
        .field
          .row
            label {{ $t('report.quickPosition.aside.savings') }}
            output {{ money(inputs.personalSavings) }}
          input(type="range" min="0" :max="moneyMax('personalSavings', 150000, 1000)" step="1000" v-model.number="inputs.personalSavings")
        .field
          .row
            label {{ $t('report.quickPosition.aside.investments') }}
            output {{ money(inputs.quickInvestments) }}
          input(type="range" min="0" :max="moneyMax('quickInvestments', 150000, 1000)" step="1000" v-model.number="inputs.quickInvestments")
        .field
          .row
            label {{ $t('report.quickPosition.aside.raised') }}
            output {{ money(inputs.raisedCapital) }}
          input(type="range" min="0" :max="moneyMax('raisedCapital', 300000, 5000)" step="5000" v-model.number="inputs.raisedCapital")
      .group
        h2 {{ $t('report.quickPosition.aside.margin') }}
        .field
          .row
            label {{ $t('report.quickPosition.aside.grossMargin') }}
            output {{ inputs.grossMarginPct }}%
          input(type="range" min="5" max="80" step="1" v-model.number="inputs.grossMarginPct")
        .field
          .row
            label {{ $t('report.quickPosition.aside.discount') }}
            output {{ inputs.discountPct }}%
          input(type="range" min="0" max="30" step="1" v-model.number="inputs.discountPct")

    section.results(v-if="result")
      //- A failure AFTER the first load must never sit silently behind stale figures (R9)
      .stale(v-if="error")
        .stalehead {{ $t('report.staleTitle') }}
        p.stalebody {{ $t('report.calcUnreachable') }}
        b-button(type="is-danger" size="is-small" @click="recompute") {{ $t('report.retry') }}
      .herostrip(:class="{ 'is-stale': error }")
        .hs
          .hk {{ $t('report.quickPosition.hero.quickCash') }}
          .hv(:class="{ crit: result.quickCashAvailable < 0 }") {{ money(result.quickCashAvailable) }}
          .hs2 {{ $t('report.quickPosition.hero.quickCashSub') }}
        .hs
          .hk {{ $t('report.quickPosition.hero.coverZero') }}
          .hv
            | {{ monthsText(result.expenseCyclesZeroSales) }}
            span.u(v-if="result.expenseCyclesZeroSales !== null")  {{ $t('report.quickPosition.hero.months') }}
          .hs2 {{ $t('report.quickPosition.hero.coverZeroSub') }}
        .hs
          .hk {{ $t('report.quickPosition.hero.withLifeline') }}
          .hv
            | {{ monthsText(result.tradingCyclesWithLifeline) }}
            span.u(v-if="result.tradingCyclesWithLifeline !== null")  {{ $t('report.quickPosition.hero.months') }}
          .hs2 {{ $t('report.quickPosition.hero.withLifelineSub', { amount: money(result.lifelineCapital) }) }}
        .hs
          .hk {{ $t('report.quickPosition.hero.breakEven') }}
          .hv {{ result.breakEvenSalesRequired === null ? '—' : money(result.breakEvenSalesRequired) }}
          .hs2 {{ $t('report.quickPosition.hero.breakEvenSub') }}

      .card
        .card-head
          h2 {{ $t('report.quickPosition.runway.title') }}
          span.run-sum {{ $t('report.quickPosition.runway.summary', { outgo: money(result.totalMonthlyOutgoings), lifeline: money(result.lifelineCapital) }) }}
        .runway
          .ext(:style="{ width: runwayExtPct + '%' }")
          .fill(:style="{ width: runwayFillPct + '%' }")
        .runticks
          span 0
          span 6
          span 12
          span 18
          span 24
        .runlegend
          span
            span.sw.sw-own
            | {{ $t('report.quickPosition.runway.ownCash') }}
          span
            span.sw.sw-ext
            | {{ $t('report.quickPosition.runway.extension') }}
          span.pill(:class="runwayPill.cls") {{ runwayPill.text }}

      .card
        h2 {{ $t('report.quickPosition.discount.title') }}
        table.mini
          tr
            td {{ $t('report.quickPosition.discount.today') }}
            td {{ inputs.grossMarginPct }}%
          tr
            td {{ $t('report.quickPosition.discount.after', { d: inputs.discountPct + '%' }) }}
            td {{ result.newGrossMarginPct === null ? '—' : pct(result.newGrossMarginPct) }}
          tr.total
            td {{ $t('report.quickPosition.discount.extra') }}
            td(:class="{ crit: result.salesIncreaseToMaintainGM === null }")
              | {{ result.salesIncreaseToMaintainGM === null ? $t('report.quickPosition.discount.destroyed') : '+' + pct(result.salesIncreaseToMaintainGM) }}

      .card
        h2
          | {{ $t('report.quickPosition.expenses.title') }}
          span.note  {{ $t('report.quickPosition.expenses.seeded') }}
        template(v-if="result.expensesReview")
          table.mini
            tr(v-for="(line, i) in expensePreview" :key="i")
              td {{ line.name }}
              td {{ money(line.amount) }}
            tr(v-if="hiddenExpenseCount > 0")
              td.note-cell {{ $t('report.quickPosition.expenses.moreLines', { n: hiddenExpenseCount }) }}
              td
            tr.total
              td {{ $t('report.quickPosition.expenses.revised') }}
              td {{ money(result.expensesReview.totalRevised) }} → {{ money(result.expensesReview.averageMonthly || 0) }}
          b-button(size="is-small" @click="useExpensesMonthly") {{ $t('report.quickPosition.expenses.use', { amount: money(result.expensesReview.averageMonthly || 0) }) }}
        p.note(v-else) {{ $t('report.quickPosition.expenses.none') }}

      .edu
        .edu-head
          span.lead {{ $t('report.quickPosition.coach.lead') }}
          | {{ $t('report.quickPosition.coach.heading') }}
        p {{ coachText }}

      .privacy 🔒 {{ $t('report.quickPosition.privacy') }}

      .actions
        b-button(type="is-primary" @click="printReport") {{ $t('report.quickPosition.actions.pdf') }}
        b-button(@click="resetAll") ↺ {{ $t('report.quickPosition.actions.reset') }}
        span.note {{ $t('report.quickPosition.actions.provenance') }}

    section.results(v-else-if="error")
      .card
        h2 {{ $t('report.calcFailedTitle') }}
        p.note {{ $t('report.calcUnreachable') }}
        b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
    section.results(v-else)
      .card
        p.note {{ $t('report.loading') }}
</template>

<script>
import debounce from 'lodash/debounce'

/**
 * QuickPositionReport — step 3 of the Quick Position report: the live survival
 * snapshot (owner-approved mockup, 2026-07-16). All calculation is backend-only
 * (POST /api/report/quick-position — server/report/quickPositionModel.js, 32 golden
 * cells); this screen edits inputs and renders the returned figures, with every
 * figure's provenance (*from file* / *entered*) shown beside its control.
 *
 * The red-under-3-months / amber-under-6 runway thresholds were accepted by the
 * owner with the mockup (plan decision log 2026-07-16).
 */
export default {
  name: 'QuickPositionReport',

  props: {
    /**
     * The confirmed intake payload from QuickPositionIntake:
     * { figures: {cash:{value,source},…}, serviceBusiness, expenseLines, companyName }.
     * Null = straight to the report on the model defaults, everything tagged *entered*.
     */
    seed: { type: Object, default: null }
  },

  data () {
    const seed = this.seed || {}
    const fig = seed.figures || {}
    const val = (key, def) => (fig[key] && typeof fig[key].value === 'number' ? fig[key].value : def)
    const src = key => (fig[key] ? fig[key].source : 'entered')
    return {
      inputs: {
        cash: val('cash', 296155),
        cashFactor: 100,
        debtors: val('debtors', 154906),
        debtorsFactor: 80,
        stock: val('stock', 25847),
        stockFactor: 0,
        fixedAssets: val('fixedAssets', 30000),
        fixedAssetsFactor: 100,
        creditors: val('creditors', 63000),
        wagesDue: val('wagesDue', 32000),
        monthlyFixedCosts: 20000,
        monthlyDrawings: 0,
        monthlyLoanRepayments: 0,
        personalSavings: 38000,
        quickInvestments: 12000,
        raisedCapital: 0,
        grossMarginPct: 23,
        discountPct: 5
      },
      sources: {
        cash: src('cash'),
        debtors: src('debtors'),
        stock: src('stock'),
        fixedAssets: src('fixedAssets'),
        creditors: src('creditors'),
        wagesDue: src('wagesDue'),
        // R11: tracks the "use this figure" button — a file-derived average must keep its tag
        monthlyFixedCosts: 'entered'
      },
      serviceBusiness: !!seed.serviceBusiness,
      expenseLines: seed.expenseLines || null,
      result: null,
      error: false
    }
  },

  computed: {
    /** Factor sliders to show — stock drops out entirely for a service business. */
    visibleFactorFields () {
      const fields = [{ key: 'cash' }, { key: 'debtors' }, { key: 'stock' }, { key: 'fixedAssets' }]
      return this.serviceBusiness ? fields.filter(f => f.key !== 'stock') : fields
    },
    runwayFillPct () {
      const m = this.result && this.result.expenseCyclesZeroSales
      return m === null || m === undefined ? 100 : Math.min(100, Math.max(0, m / 24 * 100))
    },
    runwayExtPct () {
      const m = this.result && this.result.tradingCyclesWithLifeline
      return m === null || m === undefined ? 100 : Math.min(100, Math.max(0, m / 24 * 100))
    },
    /** Red < 3 months, amber < 6 — accepted with the mockup. */
    runwayPill () {
      const m = this.result ? this.result.expenseCyclesZeroSales : null
      if (m === null || m === undefined) { return { cls: 'pill-good', text: this.$t('report.quickPosition.hero.unlimited') } }
      if (m < 3) { return { cls: 'pill-crit', text: this.$t('report.quickPosition.runway.under3') } }
      if (m < 6) { return { cls: 'pill-warn', text: this.$t('report.quickPosition.runway.under6') } }
      return { cls: 'pill-good', text: this.$t('report.quickPosition.runway.cover', { n: this.oneDp(m) }) }
    },
    expensePreview () {
      const review = this.result && this.result.expensesReview
      if (!review || !this.expenseLines) { return [] }
      return this.expenseLines.slice(0, 3)
    },
    hiddenExpenseCount () {
      return this.expenseLines ? Math.max(0, this.expenseLines.length - 3) : 0
    },
    /** Templated coach narrative (no AI in v1 — the WCC precedent). */
    coachText () {
      const r = this.result
      if (!r) { return '' }
      if (r.quickCashAvailable <= 0) { return this.$t('report.quickPosition.coach.negative') }
      let text = this.$t('report.quickPosition.coach.runway', {
        m0: this.monthsText(r.expenseCyclesZeroSales),
        ml: this.monthsText(r.tradingCyclesWithLifeline),
        be: r.breakEvenSalesRequired === null ? '—' : this.money(r.breakEvenSalesRequired)
      })
      if (this.inputs.discountPct > 0 && r.salesIncreaseToMaintainGM !== null) {
        text += ' ' + this.$t('report.quickPosition.coach.discountTrap', {
          d: this.inputs.discountPct + '%',
          up: this.pct(r.salesIncreaseToMaintainGM)
        })
      }
      return text
    }
  },

  watch: {
    inputs: {
      deep: true,
      handler () { this._debouncedRecompute() }
    }
  },

  created () {
    // Debounced so slider drags don't flood the backend (calc is backend-only)
    this._debouncedRecompute = debounce(this.recompute, 250)
    // Monotonic request stamp (R10): debounce spaces call STARTS only — a slow older
    // response must never overwrite a newer one. Non-reactive by design.
    this._reqSeq = 0
  },

  mounted () {
    this.recompute()
  },

  beforeDestroy () {
    this._debouncedRecompute.cancel()
  },

  methods: {
    /** @param {number} n */
    money (n) {
      const v = Math.round(n)
      return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US')
    },
    /** @param {number} f - fraction @returns {string} e.g. "27.8%" */
    pct (f) {
      return (Math.round(f * 1000) / 10).toFixed(1) + '%'
    },
    /** @param {number} n */
    oneDp (n) {
      return (Math.round(n * 10) / 10).toFixed(1)
    },
    /** @param {number|null} m */
    monthsText (m) {
      return m === null || m === undefined ? '∞' : this.oneDp(m)
    },
    /** Calc runs backend-only; the screen never computes the model itself. */
    recompute () {
      const i = this.inputs
      const body = {
        cash: i.cash,
        cashFactor: i.cashFactor / 100,
        debtors: i.debtors,
        debtorsFactor: i.debtorsFactor / 100,
        stock: i.stock,
        stockFactor: i.stockFactor / 100,
        fixedAssets: i.fixedAssets,
        fixedAssetsFactor: i.fixedAssetsFactor / 100,
        creditors: i.creditors,
        wagesDue: i.wagesDue,
        monthlyFixedCosts: i.monthlyFixedCosts,
        monthlyDrawings: i.monthlyDrawings,
        monthlyLoanRepayments: i.monthlyLoanRepayments,
        personalSavings: i.personalSavings,
        quickInvestments: i.quickInvestments,
        raisedCapital: i.raisedCapital,
        securedLoans: 0,
        grossMarginPct: i.grossMarginPct / 100,
        discountPct: i.discountPct / 100,
        serviceBusiness: this.serviceBusiness
      }
      if (this.expenseLines) {
        body.expenseLines = this.expenseLines.map(l => ({ amount: l.amount, maintainedPct: 1 }))
      }
      const seq = ++this._reqSeq
      fetch('/api/report/quick-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then((json) => {
          if (seq !== this._reqSeq) { return } // superseded — discard (R10)
          if (json.success) {
            this.result = json.data
            this.error = false
          } else {
            this.error = true
          }
        })
        .catch(() => { if (seq === this._reqSeq) { this.error = true } })
    },
    /** One click: the P&L-seeded review becomes the monthly fixed costs — tagged from file (R11). */
    useExpensesMonthly () {
      const avg = this.result && this.result.expensesReview && this.result.expensesReview.averageMonthly
      if (typeof avg === 'number') {
        this.inputs.monthlyFixedCosts = Math.round(avg)
        this.sources.monthlyFixedCosts = 'file'
        this.$buefy.toast.open({ message: this.$t('report.quickPosition.expenses.used'), type: 'is-success' })
      }
    },
    /** Slider touch: the fixed-costs figure becomes the advisor's (provenance rule). */
    fixedCostsEntered () {
      this.sources.monthlyFixedCosts = 'entered'
    },
    /**
     * R22: a money slider's ceiling stretches to fit a real (file-seeded or restored)
     * figure — a touch must never silently snap the report's number down to the cap.
     * @param {string} key @param {number} base - the normal ceiling @param {number} step
     */
    moneyMax (key, base, step) {
      const v = this.inputs[key]
      return (typeof v === 'number' && v > base) ? Math.ceil(v / step) * step : base
    },
    resetAll () {
      const fresh = this.$options.data.call(this)
      this.inputs = fresh.inputs
      this.$buefy.toast.open({ message: this.$t('report.quickPosition.actions.resetDone'), type: 'is-info' })
    },
    printReport () {
      window.print()
    }
  }
}
</script>

<style scoped>
.layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
@media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
.controls { background: #fff; border: 1px solid #d5e1ee; border-radius: 14px; }
.group { padding: 15px 16px; border-bottom: 1px solid #d5e1ee; }
.group:last-child { border-bottom: 0; }
.group h2 { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #002b64; font-weight: 600; margin-bottom: 10px; }
.group h2 .note { font-weight: 300; text-transform: none; letter-spacing: 0; color: #5b6f8a; font-size: 11px; }
.field { margin: 11px 0; }
.field .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 5px; }
.field label { font-size: 12.5px; color: #002b64; font-weight: 300; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.field output { font-size: 13px; font-weight: 600; color: #0070c0; white-space: nowrap; }
.field input[type=range] { width: 100%; accent-color: #0070c0; }
.src { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: 999px; white-space: nowrap; }
.src-file { color: #0070c0; background: #0070c018; border: 1px solid #0070c04d; }
.src-hand { color: #b36b00; background: #ff99001a; border: 1px solid #ff990059; }
.results { display: flex; flex-direction: column; gap: 18px; }
/* Stale-figures banner (R9): a failed recompute must be visibly untrustworthy —
   stale figures presented as live are worse than no figures at all. */
.stale { background: #ff000010; border: 1px solid #ff0000; border-radius: 14px; padding: 12px 14px; }
.stalehead { font-size: 13px; font-weight: 600; color: #ff0000; margin-bottom: 3px; }
.stalebody { font-size: 12.5px; color: #5b6f8a; margin: 0 0 9px; line-height: 1.5; }
.is-stale { opacity: .45; filter: grayscale(0.6); }
.herostrip {
  background: linear-gradient(120deg, #002b64 0%, #0a56b0 55%, #00b1e0 135%);
  border-radius: 14px; padding: 20px; display: grid; grid-template-columns: repeat(4, 1fr);
  box-shadow: 0 12px 32px -12px #002b6466;
}
@media (max-width: 700px) { .herostrip { grid-template-columns: 1fr 1fr; gap: 14px 0; } }
.herostrip .hs { padding: 2px 16px; border-left: 1px solid #ffffff30; }
.herostrip .hs:first-child { border-left: 0; padding-left: 2px; }
.herostrip .hk { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: #7fe4ff; font-weight: 700; }
.herostrip .hv { font-size: 25px; font-weight: 700; color: #fff; margin-top: 7px; line-height: 1.05; }
.herostrip .hv .u { font-size: .5em; font-weight: 400; opacity: .85; }
.herostrip .hv.crit { color: #ff8f8f; }
.herostrip .hs2 { font-size: 12px; color: #c7e6fb; margin-top: 6px; }
.card { background: #fff; border: 1px solid #d5e1ee; border-top: 3px solid #00b1e0; border-radius: 14px; padding: 16px; }
.card h2 { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #002b64; font-weight: 600; margin-bottom: 10px; }
.card h2 .note, .card .note { font-weight: 300; text-transform: none; letter-spacing: 0; color: #5b6f8a; font-size: 12px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.run-sum { font-size: 12.5px; color: #5b6f8a; }
.runway { position: relative; height: 34px; background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 9px; overflow: hidden; margin-top: 8px; }
.runway .fill { position: absolute; top: 0; bottom: 0; left: 0; background: linear-gradient(90deg, #0070c0, #00b1e0); transition: width .25s; }
.runway .ext { position: absolute; top: 0; bottom: 0; left: 0; background: #7fd3f166; border-left: 2px solid #00b1e0; transition: width .25s; }
.runticks { display: flex; justify-content: space-between; font-size: 10.5px; color: #5b6f8a; margin-top: 5px; }
.runlegend { display: flex; gap: 18px; font-size: 12px; color: #5b6f8a; margin-top: 9px; flex-wrap: wrap; align-items: center; }
.sw { display: inline-block; width: 11px; height: 11px; border-radius: 3px; vertical-align: -1px; margin-right: 6px; }
.sw-own { background: linear-gradient(90deg, #0070c0, #00b1e0); }
.sw-ext { background: #7fd3f166; border: 1px solid #00b1e0; }
.pill { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
.pill-good { color: #4ca52d; background: #4ca52d1a; }
.pill-warn { color: #b36b00; background: #ff99001a; }
.pill-crit { color: #ff0000; background: #ff00000f; }
table.mini { width: 100%; border-collapse: collapse; font-size: 13px; }
table.mini td { padding: 6px 10px; border-bottom: 1px solid #d5e1ee; }
table.mini td:last-child { text-align: right; font-weight: 600; }
table.mini tr.total td { border-bottom: 0; border-top: 2px solid #d5e1ee; font-weight: 600; }
table.mini td.crit, table.mini .crit { color: #ff0000; }
.note-cell { color: #5b6f8a; font-weight: 300; }
.edu { border-left: 3px solid #00b1e0; background: #0070c012; border-radius: 0 9px 9px 0; padding: 14px 16px; }
.edu-head { display: flex; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: #0070c0; margin-bottom: 8px; }
.edu .lead { background: #0070c0; color: #fff; font-size: 10px; font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 5px; }
.edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.privacy { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: #5b6f8a; background: #f1f6fb; border: 1px solid #d5e1ee; border-radius: 9px; padding: 10px 14px; }
.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.actions .note { font-size: 12px; color: #5b6f8a; }
@media print {
  .controls, .actions, .privacy { display: none !important; }
  .layout { display: block; }
  .card, .edu, .herostrip { break-inside: avoid; box-shadow: none; }
}
</style>

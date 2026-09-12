<template lang="pug">
.hlb-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.highLevelBudget.eyebrowClass')"
    :title="$t('report.highLevelBudget.title')"
    :client="$t('report.preparedFor')"
  )

  .hlb-steps
    .hlb-step(
      v-for="s in stepChips" :key="s.n"
      :class="{ active: step === s.n, done: step > s.n }"
      @click="goTo(s.n)")
      span.n {{ step > s.n ? '✓' : s.n }}
      | {{ s.label }}

  //- A failed recompute must never sit silently behind live-looking figures.
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute")

  //- The headline is a FULL-WIDTH band: a direct child of the root, above the two-column
  //- layout, never inside a column (RULED 2026-07-27; guarded).
  hero-strip(:columns="4" :stale="!!error")
    template(v-if="showResultHero")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.moneyInAgainst')"
        :value="signedMoney(depositsVariance)"
        :sub="$t('report.highLevelBudget.hero.againstSub', { actual: money(actualDeposits), budget: money(budgetDeposits) })"
        :tone="toneForDeposits")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.moneyOutAgainst')"
        :value="signedMoney(withdrawalsVariance)"
        :sub="$t('report.highLevelBudget.hero.againstSub', { actual: money(actualWithdrawals), budget: money(budgetWithdrawals) })"
        :tone="toneForWithdrawals")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.closingBudgeted')"
        :value="money(budgetClosing)"
        :sub="$t('report.highLevelBudget.hero.atMonth', { month: lastMonthLabel })")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.closingActual')"
        :value="money(actualClosing)"
        :sub="closingGapSub"
        :tone="toneForClosing")
    template(v-else)
      hero-figure(
        :label="$t('report.highLevelBudget.hero.moneyIn')"
        :value="money(budgetDeposits)"
        :sub="$t('report.highLevelBudget.hero.forTheYear')")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.moneyOut')"
        :value="money(budgetWithdrawals)"
        :sub="$t('report.highLevelBudget.hero.forTheYear')")
      //- Zero is NEITHER good nor bad. Before anything is typed this figure is 0, and a green
      //- "+$0" announces good news on an empty screen — found by opening it, 2026-09-12.
      hero-figure(
        :label="$t('report.highLevelBudget.hero.changeInBank')"
        :value="budgetNetChange ? signedMoney(budgetNetChange) : money(0)"
        :sub="$t('report.highLevelBudget.hero.acrossTheYear')"
        :tone="toneForNetChange")
      hero-figure(
        :label="$t('report.highLevelBudget.hero.closingBank')"
        :value="money(budgetClosing)"
        :sub="$t('report.highLevelBudget.hero.closingBankSub', { month: lastMonthLabel })")

  //- ─── Step 1 · set up the year ────────────────────────────────────────────
  .hlb-layout(v-if="step === 1")
    aside.hlb-inputs
      .hlb-card
        h2 {{ $t('report.highLevelBudget.setup.yearTitle') }}
        .hlb-field
          label {{ $t('report.highLevelBudget.setup.firstMonth') }}
          b-input(v-model="form.monthsStart" type="month" size="is-small")
          p.hlb-note {{ $t('report.highLevelBudget.setup.firstMonthHelp') }}
        .hlb-field
          label {{ $t('report.highLevelBudget.setup.gstRate') }}
          b-input(v-model.number="form.gstRatePct" type="number" step="any" size="is-small")
          p.hlb-note {{ $t('report.highLevelBudget.setup.gstRateHelp') }}
      .hlb-card
        h2 {{ $t('report.highLevelBudget.setup.openingTitle') }}
        .hlb-field
          label {{ $t('report.highLevelBudget.setup.openingBudget') }}
          b-input(v-model.number="form.budget.openingBalance" type="number" step="any" size="is-small")
        .hlb-field
          label {{ $t('report.highLevelBudget.setup.openingActual') }}
          b-input(v-model.number="form.actual.openingBalance" type="number" step="any" size="is-small")
        p.hlb-note {{ $t('report.highLevelBudget.setup.openingHelp') }}
    section.hlb-results
      .hlb-card
        h2 {{ $t('report.highLevelBudget.setup.aboutTitle') }}
        p.hlb-lead {{ $t('report.highLevelBudget.setup.aboutLead') }}
        table.hlb-mini
          tbody
            tr
              td {{ $t('report.highLevelBudget.steps.budget') }}
              td.is-prose {{ $t('report.highLevelBudget.setup.aboutBudget') }}
            tr
              td {{ $t('report.highLevelBudget.steps.actual') }}
              td.is-prose {{ $t('report.highLevelBudget.setup.aboutActual') }}
            tr
              td {{ $t('report.highLevelBudget.steps.result') }}
              td.is-prose {{ $t('report.highLevelBudget.setup.aboutResult') }}

  //- ─── Steps 2 and 3 · the budget, then the actuals ────────────────────────
  .hlb-entry(v-else-if="step === 2 || step === 3")
    .hlb-card(v-if="!data")
      p.hlb-note {{ $t('report.loading') }}
    template(v-else)
      .hlb-card(v-for="block in entryBlocks" :key="block.key")
        .hlb-card-h
          h2 {{ block.title }}
          span.hlb-badge {{ $t('report.highLevelBudget.entry.enteredByAdvisor') }}
        table.hlb-grid
          thead
            tr
              th {{ $t('report.highLevelBudget.entry.line') }}
              th.r(v-if="step === 3") {{ $t('report.highLevelBudget.entry.budgetPerMonth') }}
              th.r {{ step === 3 ? $t('report.highLevelBudget.entry.actualPerMonth') : $t('report.highLevelBudget.entry.perMonth') }}
              th.r {{ step === 3 ? $t('report.highLevelBudget.entry.actualForTheYear') : $t('report.highLevelBudget.entry.forTheYear') }}
              th
          tbody
            template(v-for="row in block.rows")
              tr.hlb-grouprow(v-if="row.heading" :key="row.key + '-h'")
                td(colspan="5") {{ row.heading }}
              tr(v-else :key="row.key")
                td.hlb-name
                  | {{ lineLabel(row.key) }}
                  span.hlb-sub(v-if="isOpen(row.key)") {{ $t('report.highLevelBudget.entry.variesHelp') }}
                td.r(v-if="step === 3")
                  span.hlb-ro {{ cellOrDash(budgetFlat(row.key)) }}
                td.r
                  span.hlb-ro(v-if="isOpen(row.key)") {{ $t('report.highLevelBudget.entry.varies') }}
                  b-input(
                    v-else
                    :value="flatValue(row.key)"
                    type="number" step="any" size="is-small"
                    @input="v => setFlat(row.key, v)")
                td.r
                  span.hlb-ro {{ cellOrDash(yearTotal(row.key)) }}
                td.hlb-vary(@click="toggleOpen(row.key)")
                  | {{ isOpen(row.key) ? '▾ ' + $t('report.highLevelBudget.entry.closeMonths') : '▸ ' + $t('report.highLevelBudget.entry.openMonths') }}
              tr(v-if="!row.heading && isOpen(row.key)" :key="row.key + '-m'")
                td(colspan="5")
                  .hlb-months
                    .hlb-m(v-for="(label, i) in monthLabels" :key="i")
                      .hlb-mh {{ label }}
                      b-input(
                        :value="monthValue(row.key, i)"
                        type="number" step="any" size="is-small"
                        @input="v => setMonth(row.key, i, v)")
        .hlb-card-f(v-if="block.foot") {{ block.foot }}

  //- ─── Step 4 · how it went ────────────────────────────────────────────────
  .hlb-results-wide(v-else)
    .hlb-card(v-if="!data")
      p.hlb-note {{ $t('report.loading') }}
    template(v-else)
      .hlb-card
        h2 {{ $t('report.highLevelBudget.result.moneyInChart') }}
        .hlb-chart
          .hlb-slot(v-for="(label, i) in monthLabels" :key="i")
            .hlb-pair
              .hlb-bar.is-budget(:style="{ height: barHeight(data.budget.subtotalDeposits[i], depositsPeak) }")
              .hlb-bar.is-actual(:style="{ height: barHeight(data.actual.subtotalDeposits[i], depositsPeak) }")
            .hlb-xlab {{ label }}
        .hlb-legend
          span
            i.is-budget
            | {{ $t('report.highLevelBudget.result.legendBudget') }}
          span
            i.is-actual
            | {{ $t('report.highLevelBudget.result.legendActual') }}

      .hlb-card
        h2 {{ $t('report.highLevelBudget.result.bankChart') }}
        .hlb-linewrap
          svg(viewBox="0 0 660 160" preserveAspectRatio="none")
            polyline.is-budget(:points="bankLine(data.budget.closingBankBalance)")
            polyline.is-actual(:points="bankLine(data.actual.closingBankBalance)")
        .hlb-legend
          span
            i.is-budget
            | {{ $t('report.highLevelBudget.result.legendBudgetedBalance') }}
          span
            i.is-actual-line
            | {{ $t('report.highLevelBudget.result.legendActualBalance') }}

      .hlb-card
        .hlb-card-h
          h2 {{ $t('report.highLevelBudget.result.tableTitle') }}
          span.hlb-sub {{ $t('report.highLevelBudget.result.tableSub') }}
        table.hlb-grid
          thead
            tr
              th {{ $t('report.highLevelBudget.entry.line') }}
              th.r {{ $t('report.highLevelBudget.result.budget') }}
              th.r {{ $t('report.highLevelBudget.result.actual') }}
              th.r {{ $t('report.highLevelBudget.result.difference') }}
              th {{ $t('report.highLevelBudget.result.meaning') }}
          tbody
            template(v-for="block in resultBlocks")
              tr.hlb-grouprow(:key="block.key + '-h'")
                td(colspan="5") {{ block.title }}
              tr(v-for="row in block.rows" :key="block.key + row.key")
                td.hlb-name {{ lineLabel(row.key) }}
                td.r.num {{ cellOrDash(row.budget) }}
                td.r.num(:class="{ 'is-blank': row.variance === null }") {{ row.variance === null ? $t('report.highLevelBudget.result.notEntered') : money(row.actual) }}
                td.r.num(:class="row.tone") {{ varianceFigure(row.variance) }}
                td
                  span(:class="{ 'is-blank': row.variance === null }") {{ row.meaning }}
                  span.hlb-pill(v-if="row.pill" :class="row.tone") {{ row.pill }}
              tr.hlb-subtotal(:key="block.key + '-t'")
                td {{ block.title }}
                td.r.num {{ money(block.budget) }}
                td.r.num {{ money(block.actual) }}
                td.r.num(:class="block.tone") {{ varianceFigure(block.variance) }}
                td
        .hlb-card-f {{ $t('report.highLevelBudget.result.emptyLinesOmitted') }}

  .hlb-nav
    b-button(v-if="step > 1" size="is-small" @click="goTo(step - 1)") {{ $t('report.highLevelBudget.nav.back') }}
    b-button(v-if="step < 4" type="is-primary" size="is-small" @click="goTo(step + 1)") {{ $t('report.highLevelBudget.nav.next') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** The model's own month count. One financial year, as the workbook has it. */
const MONTHS = 12

/**
 * HighLevelBudget — the High Level Budget screen (Budgeting · Report class).
 *
 * Four steps, because the source workbook has four sheets: set up the year, the budget, what
 * actually happened, how it went. The stepped shape is the one Quick Position, EBITDA-DCF and
 * the Loan Estimator already use.
 *
 * Report class — real client figures, so NO "Illustrative" badge, and the screen opens EMPTY.
 * It never seeds itself from the workbook sample: the backend returns nothing for an empty
 * body by design (see the model header), because sample figures on a real client's budget
 * look exactly like the client's own.
 *
 * All calculation is backend-only (POST /api/report/high-level-budget); every figure rendered
 * comes back from the model. The 32 line names ride on the response as `lineOrder`, so this
 * screen holds no second copy of that list to drift from the model's.
 *
 * THREE RULINGS BY MIKE, 2026-09-12, from design/mockups/high-level-budget.html:
 *
 *   1. ENTRY IS ONE FIGURE PER LINE applied to every month, with a "vary by month" opener.
 *      Read off his own workbook, where eight of the nine populated budget lines are identical
 *      in all twelve months. A line is held as twelve figures either way — the single box just
 *      writes all twelve at once — so nothing is lost by closing it again.
 *   2. A BLANK ACTUAL MEANS "NOT YET", NEVER "NOTHING". `null` travels to the backend, which
 *      yields a blank variance rather than the whole budget as a shortfall. A typed zero is a
 *      real zero and does produce a variance. This is the source's own
 *      `IF(actual<>"", actual-budget, "")`.
 *   3. THE ARITHMETIC STAYS ACTUAL MINUS BUDGET, exactly as the workbook has it, and the
 *      COLOUR carries the meaning — with a plain Better/Worse beside it. Hence `toneFor`:
 *      on money-in a positive variance is good, on money-out it is bad, and the number itself
 *      is never flipped, so it always matches the client's own Cashflow Variances sheet.
 */
export default {
  name: 'HighLevelBudget',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      step: 1,
      // Report class: the screen opens empty and stays empty until the advisor types. There
      // is deliberately no seeding from the workbook sample.
      form: {
        monthsStart: '2021-04',
        gstRatePct: 15,
        budget: { openingBalance: null, lines: {} },
        actual: { openingBalance: null, lines: {} }
      },
      // Which lines are opened out into twelve month boxes. Keyed 'budget:sales' etc, so the
      // two sides open independently.
      opened: {},
      data: null
      // `error` (the stale flag) comes from the reportRecompute mixin.
    }
  },

  computed: {
    /** The four step chips, in order. */
    stepChips () {
      return [
        { n: 1, label: this.$t('report.highLevelBudget.steps.setup') },
        { n: 2, label: this.$t('report.highLevelBudget.steps.budget') },
        { n: 3, label: this.$t('report.highLevelBudget.steps.actual') },
        { n: 4, label: this.$t('report.highLevelBudget.steps.result') }
      ]
    },

    /** Which side of the model the entry steps are editing. */
    side () { return this.step === 3 ? 'actual' : 'budget' },

    /** The variance figures headline steps 3 and 4; the budget's own headline steps 1 and 2. */
    showResultHero () { return this.step >= 3 },

    /** The twelve ISO month starts the model is asked for, derived from the chosen start. */
    months () {
      const start = String(this.form.monthsStart || '')
      const m = start.match(/^(\d{4})-(\d{2})/)
      if (!m) { return [] }
      const out = []
      let year = Number(m[1])
      let month = Number(m[2])
      for (let i = 0; i < MONTHS; i++) {
        out.push(year + '-' + String(month).padStart(2, '0') + '-01')
        month += 1
        if (month > 12) { month = 1; year += 1 }
      }
      return out
    },

    /**
     * Short month names for the column headings, in the reader's own language.
     *
     * `toLocaleDateString` rather than a hardcoded list, so nothing here is English by
     * construction. Node's small-icu build falls back to English for a locale it does not
     * carry, which degrades the label and never the figure.
     */
    monthLabels () {
      const locale = (this.$i18n && this.$i18n.locale) || 'en'
      return this.months.map((iso) => {
        const d = new Date(iso + 'T00:00:00Z')
        try {
          return d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
        } catch (e) {
          return iso.slice(5, 7)
        }
      })
    },

    lastMonthLabel () {
      return this.monthLabels.length ? this.monthLabels[MONTHS - 1] : ''
    },

    /** The two entry blocks — money in, then money out with its two sub-headings. */
    entryBlocks () {
      if (!this.data) { return [] }
      const order = this.data.lineOrder || []
      const deposits = order.filter(l => l.group === 'deposit').map(l => ({ key: l.key }))
      const out = []
      order.filter(l => l.group === 'gstExpense').forEach((l, i) => {
        if (i === 0) { out.push({ key: 'gst', heading: this.$t('report.highLevelBudget.entry.withGst') }) }
        out.push({ key: l.key })
      })
      order.filter(l => l.group === 'nonGstExpense').forEach((l, i) => {
        if (i === 0) { out.push({ key: 'nongst', heading: this.$t('report.highLevelBudget.entry.withoutGst') }) }
        out.push({ key: l.key })
      })
      return [
        { key: 'in', title: this.$t('report.highLevelBudget.entry.moneyIn'), rows: deposits },
        {
          key: 'out',
          title: this.$t('report.highLevelBudget.entry.moneyOut'),
          rows: out,
          foot: this.$t('report.highLevelBudget.entry.countsEveryLine')
        }
      ]
    },

    /**
     * The result table — only lines with a budget or an actual, so 24 empty rows of dashes
     * never reach the screen.
     */
    resultBlocks () {
      if (!this.data) { return [] }
      const order = this.data.lineOrder || []
      const build = (groups, title, key, isMoneyIn) => {
        const rows = order
          .filter(l => groups.includes(l.group))
          .map(l => this.resultRow(l.key, isMoneyIn))
          .filter(r => r !== null)
        const budget = rows.reduce((s, r) => s + r.budget, 0)
        const actual = rows.reduce((s, r) => s + (r.variance === null ? 0 : r.actual), 0)
        const variance = rows.reduce((s, r) => s + (r.variance === null ? 0 : r.variance), 0)
        return { key, title, rows, budget, actual, variance, tone: this.toneFor(variance, isMoneyIn) }
      }
      const blocks = [
        build(['deposit'], this.$t('report.highLevelBudget.entry.moneyIn'), 'in', true),
        build(['gstExpense', 'nonGstExpense'], this.$t('report.highLevelBudget.entry.moneyOut'), 'out', false)
      ]
      return blocks.filter(b => b.rows.length > 0)
    },

    budgetDeposits () { return this.yearOf('budget', 'subtotalDeposits') },
    budgetWithdrawals () { return this.yearOf('budget', 'subtotalWithdrawals') },
    budgetNetChange () { return this.yearOf('budget', 'netChangeInBank') },
    actualDeposits () { return this.yearOf('actual', 'subtotalDeposits') },
    actualWithdrawals () { return this.yearOf('actual', 'subtotalWithdrawals') },
    budgetClosing () { return this.data ? this.data.budget.closingBalance : 0 },
    actualClosing () { return this.data ? this.data.actual.closingBalance : 0 },

    /** Variances taken from the model's own variance side, not by subtracting the subtotals. */
    depositsVariance () { return this.varianceYear('subtotalDeposits') },
    withdrawalsVariance () { return this.varianceYear('subtotalWithdrawals') },

    /** A budget with nothing in it has not gone well — it has not gone anywhere. */
    toneForNetChange () {
      if (!this.budgetNetChange) { return 'default' }
      return this.budgetNetChange < 0 ? 'crit' : 'good'
    },

    toneForDeposits () { return this.toneFor(this.depositsVariance, true) },
    toneForWithdrawals () { return this.toneFor(this.withdrawalsVariance, false) },
    toneForClosing () {
      const gap = this.actualClosing - this.budgetClosing
      if (!gap) { return 'default' }
      return gap > 0 ? 'good' : 'crit'
    },

    closingGapSub () {
      const gap = this.actualClosing - this.budgetClosing
      if (!gap) { return this.$t('report.highLevelBudget.hero.onPlan') }
      const key = gap > 0 ? 'abovePlan' : 'belowPlan'
      return this.$t('report.highLevelBudget.hero.' + key, { amount: this.money(Math.abs(gap)) })
    },

    /** The tallest bar on the money-in chart, so both series share one scale. */
    depositsPeak () {
      if (!this.data) { return 0 }
      return Math.max(
        0,
        ...this.data.budget.subtotalDeposits,
        ...this.data.actual.subtotalDeposits
      )
    }
  },

  watch: {
    form: { deep: true, handler () { this.queueRecompute() } }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /** The user-facing name of a line — never the workbook's own spelling (Mike, 2026-09-12). */
    lineLabel (key) {
      return this.$t('report.highLevelBudget.lines.' + key)
    },

    /** Step navigation. Every step is reachable: nothing here depends on an upload. */
    goTo (n) {
      if (n < 1 || n > 4) { return }
      this.step = n
    },

    /** The opened/closed key for a line on the side currently being edited. */
    openKey (key) { return this.side + ':' + key },

    isOpen (key) { return Boolean(this.opened[this.openKey(key)]) },

    /**
     * Open a line out into twelve boxes, or close it again. Closing keeps the twelve figures
     * exactly as they are — it only stops showing them — so nothing is lost by collapsing a
     * line that genuinely varies.
     */
    toggleOpen (key) {
      this.$set(this.opened, this.openKey(key), !this.isOpen(key))
    },

    /** The twelve figures held for a line, creating the row on first touch. */
    row (side, key) {
      const lines = this.form[side].lines
      if (!Object.prototype.hasOwnProperty.call(lines, key)) {
        this.$set(lines, key, new Array(MONTHS).fill(null))
      }
      return lines[key]
    },

    /**
     * The single "per month" figure for a closed line: the twelve are all the same, so the
     * first one speaks for them. A line whose figures differ is opened rather than shown here.
     */
    flatValue (key) {
      const r = this.form[this.side].lines[key]
      return r && r[0] !== null && r[0] !== undefined ? r[0] : ''
    },

    /** Ruling 1: one figure per line writes all twelve months at once. */
    setFlat (key, v) {
      const n = v === '' || v === null ? null : Number(v)
      const value = n === null || Number.isNaN(n) ? null : n
      const r = this.row(this.side, key)
      for (let i = 0; i < MONTHS; i++) { this.$set(r, i, value) }
    },

    monthValue (key, i) {
      const r = this.form[this.side].lines[key]
      return r && r[i] !== null && r[i] !== undefined ? r[i] : ''
    },

    setMonth (key, i, v) {
      const n = v === '' || v === null ? null : Number(v)
      this.$set(this.row(this.side, key), i, n === null || Number.isNaN(n) ? null : n)
    },

    /** The budget's own per-month figure, shown read-only beside the actuals on step 3. */
    budgetFlat (key) {
      if (!this.data) { return null }
      const r = this.data.budget.lines[key]
      return r && r[0] ? r[0] : null
    },

    /** A line's year total, straight off the model rather than added up here. */
    yearTotal (key) {
      if (!this.data) { return null }
      const ytd = this.data[this.side].yearToDate.lines[key]
      return ytd || null
    },

    /**
     * A variance as it is displayed: an em dash where no actual was entered, a plain zero
     * where the line landed on budget, and a signed figure otherwise.
     *
     * The sign is what carries the reading, so putting one on a zero says a change happened
     * when none did — "+$0" against a line that came in exactly on budget. Found by opening
     * the screen on 2026-09-12, after the same fault was fixed in the headline band above.
     */
    varianceFigure (v) {
      if (v === null || v === undefined) { return '—' }
      return v ? this.signedMoney(v) : this.money(0)
    },

    /** A figure, or an em dash where there is nothing — never a bare zero standing in. */
    cellOrDash (v) {
      return v === null || v === undefined || v === 0 ? '—' : this.money(v)
    },

    yearOf (side, key) {
      return this.data ? this.data[side].yearToDate[key] : 0
    },

    varianceYear (key) {
      return this.data ? this.data.variance.yearToDate[key] : 0
    },

    /**
     * RULING 3 — the colour carries the meaning, the number never changes.
     *
     * On money-in, actual above budget is good. On money-out, actual above budget is bad. The
     * arithmetic stays actual minus budget on both, so every figure still matches the client's
     * own Cashflow Variances sheet.
     */
    toneFor (variance, isMoneyIn) {
      if (!variance) { return 'default' }
      const better = isMoneyIn ? variance > 0 : variance < 0
      return better ? 'good' : 'crit'
    },

    /**
     * One line of the result table, or null when nothing was budgeted and nothing entered —
     * the 24 lines this budget never uses stay off the screen entirely.
     */
    resultRow (key, isMoneyIn) {
      const budget = this.data.budget.yearToDate.lines[key] || 0
      const variance = this.data.variance.yearToDate.lines[key]
      const actual = this.data.actual.yearToDate.lines[key] || 0
      if (!budget && variance === null) { return null }
      const t = 'report.highLevelBudget.result.'
      let meaning = this.$t(t + 'onBudget')
      let pill = null
      const tone = this.toneFor(variance === null ? 0 : variance, isMoneyIn)
      if (variance === null) {
        meaning = this.$t(t + 'nothingToCompare')
      } else if (!variance) {
        meaning = this.$t(t + 'onBudget')
      } else if (isMoneyIn) {
        meaning = this.$t(t + (variance > 0 ? 'earnedMore' : 'earnedLess'))
        pill = this.$t(t + (variance > 0 ? 'better' : 'worse'))
      } else if (!budget) {
        meaning = this.$t(t + 'notBudgeted')
        pill = this.$t(t + 'worse')
      } else {
        meaning = this.$t(t + (variance > 0 ? 'spentMore' : 'spentLess'))
        pill = this.$t(t + (variance > 0 ? 'worse' : 'better'))
      }
      return { key, budget, actual, variance, meaning, pill, tone }
    },

    /** A bar's height as a percentage of the tallest on the chart. */
    barHeight (v, peak) {
      if (!peak || !v || v < 0) { return '2px' }
      return Math.max(2, Math.round((v / peak) * 100)) + '%'
    },

    /**
     * The bank-balance polyline. The viewBox is 660 × 160 with y inverted, and both series
     * share one scale so the gap between them is the real gap.
     */
    bankLine (series) {
      if (!Array.isArray(series) || !series.length) { return '' }
      const all = this.data.budget.closingBankBalance.concat(this.data.actual.closingBankBalance)
      const top = Math.max(...all, 0)
      const bottom = Math.min(...all, 0)
      const span = top - bottom || 1
      return series
        .map((v, i) => {
          const x = Math.round((i / (MONTHS - 1)) * 660)
          const y = Math.round(160 - ((v - bottom) / span) * 160)
          return x + ',' + y
        })
        .join(' ')
    },

    /** The POST this screen recomputes with — consumed by the reportRecompute mixin. */
    recomputeRequest () {
      return {
        url: '/api/report/high-level-budget',
        body: {
          gstRate: Number(this.form.gstRatePct || 0) / 100,
          months: this.months,
          budget: {
            openingBalance: this.form.budget.openingBalance,
            lines: this.form.budget.lines
          },
          actual: {
            openingBalance: this.form.actual.openingBalance,
            lines: this.form.actual.lines
          }
        }
      }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
/* [A] Root: one gap value, so every vertical gap is identical (RULED 2026-07-27). */
.hlb-root { display: flex; flex-direction: column; gap: 16px; }
/* [B] Reset the shared ReportHeader's `margin: 0 auto 22px`: inside a flex column that auto
   margin shrinks the header below full width and its 22px stacks on the flex gap. Guarded by
   reportHeaderFullWidth.test.js. */
.hlb-root ::v-deep .rs-top { margin: 0; }

.hlb-steps { display: flex; gap: 10px; flex-wrap: wrap; }
.hlb-step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.hlb-step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line);
  color: var(--rs-ink); font-size: 11px;
}
.hlb-step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.hlb-step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.hlb-step.done { color: var(--rs-good); }
.hlb-step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }

/* [D] House two-column grid, collapsing at the standard breakpoint. */
.hlb-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .hlb-layout { grid-template-columns: 1fr; } }
.hlb-inputs, .hlb-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* The entry and result steps are full width: a 32-line × 12-month grid has no business in a
   360px column, and there are no sliders to put there. */
.hlb-entry, .hlb-results-wide { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* Cards read the shared tokens and declare no palette of their own. NO top edge — RULED
   2026-08-31, consistency wins (see REPORT-VISUAL-STANDARD.md). */
.hlb-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad); min-width: 0;
}
.hlb-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin: 0 0 12px;
}
.hlb-card-h { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.hlb-card-h h2 { margin: 0 0 12px; }
.hlb-card-f {
  margin: 12px -16px -16px; padding: 13px 16px; border-top: 1px solid var(--rs-line);
  background: var(--rs-panel-2); border-radius: 0 0 var(--rs-card-radius) var(--rs-card-radius);
  font-size: 12.5px; color: var(--rs-muted);
}
.hlb-note { font-size: 11.5px; color: var(--rs-muted); margin: 8px 0 0; font-weight: 300; }
.hlb-lead { font-size: 13.5px; margin: 0 0 12px; }
.hlb-sub { font-size: 11.5px; color: var(--rs-muted); font-weight: 400; display: block; margin-top: 2px; }
.hlb-badge {
  font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 7px; background: var(--rs-warn-soft); color: #a06000;
}

.hlb-field { margin-bottom: 14px; }
.hlb-field:last-child { margin-bottom: 0; }
.hlb-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; }

.hlb-mini { width: 100%; border-collapse: collapse; font-size: 13px; }
.hlb-mini td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--rs-bg); vertical-align: top; }
.hlb-mini td:first-child { font-weight: 600; white-space: nowrap; width: 34%; }
.hlb-mini td.is-prose { color: var(--rs-muted); }

.hlb-grid { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.hlb-grid th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line);
}
.hlb-grid th.r, .hlb-grid td.r { text-align: right; }
.hlb-grid td { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rs-bg); vertical-align: middle; }
.hlb-grid td.num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.hlb-grid td.good { color: var(--rs-good); }
.hlb-grid td.crit { color: var(--rs-crit); }
.hlb-name { font-weight: 600; color: var(--rs-ink); min-width: 180px; }
.hlb-grouprow td {
  background: var(--rs-panel-2); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; padding: 8px 10px;
}
.hlb-subtotal td {
  border-top: 2px solid var(--rs-ink); border-bottom: 0; font-weight: 700;
  color: var(--rs-ink); padding-top: 10px;
}
.hlb-ro {
  background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 7px;
  padding: 5px 9px; display: inline-block; font-variant-numeric: tabular-nums;
  font-weight: 600; color: var(--rs-muted); min-width: 82px; text-align: right; font-size: 13px;
}
/* The entry boxes are COMPACT and sit at the right of their column, as drawn. Buefy's control
   is a block element that fills its cell, which made each number box roughly three times the
   drawn width and left a gulf between the line name and its figure — across 38 rows that is
   the difference between a table you can scan and one you cannot. Found by opening the screen
   on 2026-09-12; no test could have seen it. `min-width: 82px` matches the read-only boxes
   beside them so the two columns line up. */
.hlb-grid td.r ::v-deep .control { width: 118px; margin-left: auto; }
.hlb-grid td.r ::v-deep .input { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.hlb-months ::v-deep .control { width: auto; }
.hlb-vary { color: var(--rs-accent); font-weight: 600; font-size: 11.5px; white-space: nowrap; cursor: pointer; }
.is-blank { color: var(--rs-muted); font-weight: 400; }
.hlb-pill {
  display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 5px;
  padding: 2px 6px; margin-left: 7px;
}
.hlb-pill.good { background: var(--rs-good-soft); color: var(--rs-good); }
.hlb-pill.crit { background: var(--rs-crit-soft); color: var(--rs-crit); }

.hlb-months {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin: 4px 0 10px;
  padding: 11px; background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 9px;
}
.hlb-m { text-align: center; min-width: 0; }
.hlb-mh {
  font-size: 9.5px; letter-spacing: .05em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; margin-bottom: 4px;
}
@media (max-width: 860px) { .hlb-months { grid-template-columns: repeat(4, 1fr); } }

.hlb-chart { display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px; align-items: end; height: 186px; }
.hlb-slot { display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.hlb-pair { display: flex; gap: 3px; align-items: flex-end; height: 100%; }
.hlb-bar { flex: 1; border-radius: 4px 4px 0 0; min-height: 2px; }
/* A gradient on a data mark is deliberately kept (REPORT-VISUAL-STANDARD Part 2). */
.hlb-bar.is-budget { background: linear-gradient(180deg, #4a9fd8, var(--rs-accent)); }
.hlb-bar.is-actual { background: linear-gradient(180deg, #00c5f5, var(--rs-accent-bright)); }
.hlb-xlab { font-size: 9.5px; color: var(--rs-muted); text-align: center; margin-top: 6px; font-weight: 600; }

.hlb-linewrap { height: 170px; }
.hlb-linewrap svg { width: 100%; height: 100%; overflow: visible; }
.hlb-linewrap polyline { fill: none; stroke-width: 2.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.hlb-linewrap polyline.is-budget { stroke: var(--rs-accent); }
.hlb-linewrap polyline.is-actual { stroke: var(--rs-crit); }

.hlb-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--rs-muted); margin-top: 12px; }
.hlb-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.hlb-legend i.is-budget { background: var(--rs-accent); }
.hlb-legend i.is-actual { background: var(--rs-accent-bright); }
.hlb-legend i.is-actual-line { background: var(--rs-crit); }

.hlb-nav { display: flex; gap: 10px; justify-content: flex-end; }
</style>

<template lang="pug">
.mlb-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.midLevelBudget.eyebrowClass')"
    :title="$t('report.midLevelBudget.title')"
    :client="$t('report.preparedFor')"
  )

  .mlb-steps
    .mlb-step(
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
        :label="$t('report.midLevelBudget.hero.moneyInAgainst')"
        :value="signedMoney(depositsVariance)"
        :sub="$t('report.midLevelBudget.hero.againstSub', { actual: money(actualDeposits), budget: money(budgetDeposits) })"
        :tone="toneForDeposits")
      hero-figure(
        :label="$t('report.midLevelBudget.hero.moneyOutAgainst')"
        :value="signedMoney(moneyOutVariance)"
        :sub="$t('report.midLevelBudget.hero.againstSub', { actual: money(actualMoneyOut), budget: money(budgetMoneyOut) })"
        :tone="toneForMoneyOut")
      hero-figure(
        :label="$t('report.midLevelBudget.hero.closingBudgeted')"
        :value="money(budgetClosing)"
        :sub="$t('report.midLevelBudget.hero.atMonth', { month: lastMonthLabel })")
      hero-figure(
        :label="$t('report.midLevelBudget.hero.closingActual')"
        :value="money(actualClosing)"
        :sub="closingGapSub"
        :tone="toneForClosing")
    template(v-else)
      hero-figure(
        :label="$t('report.midLevelBudget.hero.moneyIn')"
        :value="money(budgetDeposits)"
        :sub="$t('report.midLevelBudget.hero.forTheYear')")
      hero-figure(
        :label="$t('report.midLevelBudget.hero.moneyOut')"
        :value="money(budgetMoneyOut)"
        :sub="$t('report.midLevelBudget.hero.paidAcrossTheYear')")
      //- Zero is NEITHER good nor bad. Before anything is typed this figure is 0, and a green
      //- "+$0" announces good news on an empty screen (the fault found on the sibling screen
      //- by opening it, 2026-09-12).
      hero-figure(
        :label="$t('report.midLevelBudget.hero.changeInBank')"
        :value="budgetNetChange ? signedMoney(budgetNetChange) : money(0)"
        :sub="$t('report.midLevelBudget.hero.acrossTheYear')"
        :tone="toneForNetChange")
      hero-figure(
        :label="$t('report.midLevelBudget.hero.closingBank')"
        :value="money(budgetClosing)"
        :sub="$t('report.midLevelBudget.hero.closingBankSub', { month: lastMonthLabel })")

  //- ─── Step 1 · set up the year ────────────────────────────────────────────
  .mlb-layout(v-if="step === 1")
    aside.mlb-inputs
      .mlb-card
        h2 {{ $t('report.midLevelBudget.setup.yearTitle') }}
        .mlb-field
          label {{ $t('report.midLevelBudget.setup.firstMonth') }}
          b-input(v-model="form.monthsStart" type="month" size="is-small")
          p.mlb-note {{ $t('report.midLevelBudget.setup.firstMonthHelp') }}
        .mlb-field
          label {{ $t('report.midLevelBudget.setup.gstRate') }}
          b-input(v-model.number="form.gstRatePct" type="number" step="any" size="is-small")
          p.mlb-note {{ $t('report.midLevelBudget.setup.gstRateHelp') }}
      .mlb-card
        h2 {{ $t('report.midLevelBudget.setup.openingTitle') }}
        .mlb-field
          label {{ $t('report.midLevelBudget.setup.openingBudget') }}
          b-input(v-model.number="form.budget.openingBalance" type="number" step="any" size="is-small")
        .mlb-field
          label {{ $t('report.midLevelBudget.setup.openingActual') }}
          b-input(v-model.number="form.actual.openingBalance" type="number" step="any" size="is-small")
        p.mlb-note {{ $t('report.midLevelBudget.setup.openingHelp') }}
    section.mlb-results
      .mlb-card
        h2 {{ $t('report.midLevelBudget.setup.aboutTitle') }}
        p.mlb-lead {{ $t('report.midLevelBudget.setup.aboutLead') }}
        table.mlb-mini
          tbody
            tr
              td {{ $t('report.midLevelBudget.steps.timing') }}
              td.is-prose {{ $t('report.midLevelBudget.setup.aboutTiming') }}
            tr
              td {{ $t('report.midLevelBudget.steps.budget') }}
              td.is-prose {{ $t('report.midLevelBudget.setup.aboutBudget') }}
            tr
              td {{ $t('report.midLevelBudget.steps.actual') }}
              td.is-prose {{ $t('report.midLevelBudget.setup.aboutActual') }}
            tr
              td {{ $t('report.midLevelBudget.steps.result') }}
              td.is-prose {{ $t('report.midLevelBudget.setup.aboutResult') }}

  //- ─── Step 2 · when the money moves ───────────────────────────────────────
  .mlb-layout(v-else-if="step === 2")
    aside.mlb-inputs
      .mlb-card(v-for="p in profiles" :key="p.key")
        .mlb-card-h
          h2 {{ p.title }}
          span.mlb-badge {{ $t('report.midLevelBudget.timing.askTheClient') }}
        p.mlb-lead {{ p.lead }}
        .mlb-prof
          template(v-for="(label, k) in p.labels")
            .mlb-lab(:key="p.key + '-l' + k") {{ label }}
            .mlb-pc(:key="p.key + '-i' + k")
              b-input(
                :value="form.assumptions[p.key][k]"
                type="number" step="any" size="is-small"
                @input="v => setShare(p.key, k, v)")
              span.mlb-pct %
        //- The warning names the CONSEQUENCE, not the arithmetic (Mike, 2026-09-13). A balance
        //- cell that reports "the percentages sum to 100" is exactly what let the workbook's
        //- fourth-month fault sit unnoticed: it was always true, and the cash was still missing.
        .mlb-balance(:class="p.balanced ? 'ok' : 'off'")
          span {{ p.balanceMessage }}
          span(v-if="p.balanced") ✓
        p.mlb-note(v-if="p.help") {{ p.help }}

    section.mlb-results
      .mlb-card
        h2 {{ $t('report.midLevelBudget.timing.spreadTitle') }}
        template(v-if="spread && spread.invoiced")
          p.mlb-lead {{ $t('report.midLevelBudget.timing.spreadLead', { month: firstMonthLabel, amount: money(spread.invoiced) }) }}
          .mlb-spread
            .mlb-sp(v-for="(amount, k) in spread.amounts" :key="k")
              .mlb-bwrap
                .mlb-bar(:style="{ height: spreadHeight(amount) }")
              .mlb-t {{ spreadMonthLabel(k) }}
              .mlb-a {{ cellOrDash(amount) }}
          .mlb-card-f
            span {{ $t('report.midLevelBudget.timing.spreadFoot', { collected: money(spread.amounts[0]), month: firstMonthLabel, invoiced: money(spread.invoiced) }) }}
        p.mlb-note(v-else) {{ $t('report.midLevelBudget.timing.spreadEmpty') }}

      .mlb-card(v-if="data")
        h2 {{ $t('report.midLevelBudget.timing.collectedTitle') }}
        .mlb-scroll
          table.mlb-grid
            thead
              tr
                th {{ $t('report.midLevelBudget.entry.line') }}
                th.r(v-for="(label, i) in monthLabels" :key="i") {{ label }}
                th.r {{ $t('report.midLevelBudget.entry.forTheYear') }}
            tbody
              tr
                td.mlb-name {{ $t('report.midLevelBudget.timing.salesInvoiced') }}
                td.r.num(v-for="(v, i) in data.budget.lines.sales" :key="i") {{ cellOrDash(v) }}
                td.r.num {{ cellOrDash(data.budget.yearToDate.lines.sales) }}
              tr
                td.mlb-name
                  | {{ $t('report.midLevelBudget.timing.cashCollected') }}
                  span.mlb-sub {{ $t('report.midLevelBudget.timing.cashCollectedSub') }}
                td.r.num(v-for="(v, i) in data.budget.salesCashCollected" :key="i") {{ cellOrDash(v) }}
                td.r.num {{ cellOrDash(data.budget.yearToDate.salesCashCollected) }}
        //- OUTSIDE the scrolling table on purpose. As a thirteenth column this figure sat off
        //- the right edge at every practical width, so the card's whole point rendered as a
        //- blank row. The drawing could not show that: it drew four months, not twelve.
        .mlb-owed
          span {{ $t('report.midLevelBudget.timing.stillOwed') }}
          b(:class="{ crit: stillOwed > 0 }") {{ cellOrDash(stillOwed) }}
        .mlb-card-f(v-if="stillOwed > 0")
          span {{ $t('report.midLevelBudget.timing.stillOwedFoot', { amount: money(stillOwed) }) }}

  //- ─── Steps 3 and 4 · the budget, then the actuals ────────────────────────
  .mlb-entry(v-else-if="step === 3 || step === 4")
    .mlb-card(v-if="!data")
      p.mlb-note {{ $t('report.loading') }}
    template(v-else)
      .mlb-card(v-for="block in entryBlocks" :key="block.key")
        .mlb-card-h
          h2 {{ block.title }}
          span.mlb-badge {{ $t('report.midLevelBudget.entry.enteredByAdvisor') }}
        //- RULED 2026-09-13. The two sides mean different things by the same line name: the
        //- budget's Sales is invoiced and the model times the cash, while the actuals side has
        //- no timing at all, so what is entered there IS the cash. Without this line an advisor
        //- types invoiced sales into step 4 and the comparison means nothing.
        p.mlb-warn(v-if="step === 4 && block.cashNote") {{ $t('report.midLevelBudget.entry.cashNotInvoiced') }}
        table.mlb-grid
          thead
            tr
              th {{ $t('report.midLevelBudget.entry.line') }}
              th.r(v-if="step === 4") {{ $t('report.midLevelBudget.entry.budgetPerMonth') }}
              th.r {{ step === 4 ? $t('report.midLevelBudget.entry.actualPerMonth') : $t('report.midLevelBudget.entry.perMonth') }}
              th.r {{ step === 4 ? $t('report.midLevelBudget.entry.actualForTheYear') : $t('report.midLevelBudget.entry.forTheYear') }}
              th
          tbody
            template(v-for="row in block.rows")
              tr.mlb-grouprow(v-if="row.heading" :key="row.key + '-h'")
                td(colspan="5") {{ row.heading }}
              //- A computed row: paid to suppliers and gross profit are worked out, never typed.
              tr.mlb-computed(v-else-if="row.computed" :key="row.key" :class="{ 'is-total': row.total }")
                td.mlb-name
                  | {{ lineLabel(row.key) }}
                  span.mlb-sub(v-if="row.sub") {{ row.sub }}
                td.r(v-if="step === 4")
                  span.mlb-ro —
                td.r
                  span.mlb-ro —
                td.r.num {{ cellOrDash(row.year) }}
                td
              tr(v-else :key="row.key")
                td.mlb-name
                  | {{ lineLabel(row.key) }}
                  span.mlb-sub(v-if="isOpen(row.key)") {{ $t('report.midLevelBudget.entry.variesHelp') }}
                td.r(v-if="step === 4")
                  span.mlb-ro {{ cellOrDash(budgetFlat(row.key)) }}
                td.r
                  span.mlb-ro(v-if="isOpen(row.key)") {{ $t('report.midLevelBudget.entry.varies') }}
                  b-input(
                    v-else
                    :value="flatValue(row.key)"
                    type="number" step="any" size="is-small"
                    @input="v => setFlat(row.key, v)")
                td.r
                  span.mlb-ro {{ cellOrDash(yearTotal(row.key)) }}
                td.mlb-vary(@click="toggleOpen(row.key)")
                  | {{ isOpen(row.key) ? '▾ ' + $t('report.midLevelBudget.entry.closeMonths') : '▸ ' + $t('report.midLevelBudget.entry.openMonths') }}
              tr(v-if="!row.heading && !row.computed && isOpen(row.key)" :key="row.key + '-m'")
                td(colspan="5")
                  .mlb-months
                    .mlb-m(v-for="(label, i) in monthLabels" :key="i")
                      .mlb-mh {{ label }}
                      b-input(
                        :value="monthValue(row.key, i)"
                        type="number" step="any" size="is-small"
                        @input="v => setMonth(row.key, i, v)")
        .mlb-card-f(v-if="block.foot") {{ block.foot }}

  //- ─── Step 5 · how it went ────────────────────────────────────────────────
  .mlb-results-wide(v-else)
    .mlb-card(v-if="!data")
      p.mlb-note {{ $t('report.loading') }}
    template(v-else)
      .mlb-card
        h2 {{ $t('report.midLevelBudget.result.moneyInChart') }}
        .mlb-chart
          .mlb-slot(v-for="(label, i) in monthLabels" :key="i")
            .mlb-pair
              .mlb-bar2.is-budget(:style="{ height: barHeight(data.budget.subtotalDeposits[i], depositsPeak) }")
              //- A series nobody has entered is not drawn, and is not in the legend either.
              .mlb-bar2.is-actual(v-if="hasActuals" :style="{ height: barHeight(data.actual.subtotalDeposits[i], depositsPeak) }")
            .mlb-xlab {{ label }}
        .mlb-legend
          span
            i.is-budget
            | {{ $t('report.midLevelBudget.result.legendBudget') }}
          span(v-if="hasActuals")
            i.is-actual
            | {{ $t('report.midLevelBudget.result.legendActual') }}

      .mlb-card
        h2 {{ $t('report.midLevelBudget.result.bankChart') }}
        .mlb-linewrap
          svg(viewBox="0 0 660 160" preserveAspectRatio="none")
            polyline.is-budget(:points="bankLine(data.budget.closingBankBalance)")
            //- Twelve zeroes drew a flat red line pinned to the top of the scale, reading as
            //- "the actual beat the budget all year". There was no actual.
            polyline.is-actual(v-if="hasActuals" :points="bankLine(data.actual.closingBankBalance)")
        .mlb-legend
          span
            i.is-budget
            | {{ $t('report.midLevelBudget.result.legendBudgetedBalance') }}
          span(v-if="hasActuals")
            i.is-actual-line
            | {{ $t('report.midLevelBudget.result.legendActualBalance') }}

      .mlb-card
        .mlb-card-h
          h2 {{ $t('report.midLevelBudget.result.tableTitle') }}
          span.mlb-sub {{ $t('report.midLevelBudget.result.tableSub') }}
        p.mlb-note(v-if="!resultBlocks.length") {{ $t('report.midLevelBudget.result.nothingYet') }}
        table.mlb-grid(v-else)
          thead
            tr
              th {{ $t('report.midLevelBudget.entry.line') }}
              th.r {{ $t('report.midLevelBudget.result.budget') }}
              th.r {{ $t('report.midLevelBudget.result.actual') }}
              th.r {{ $t('report.midLevelBudget.result.difference') }}
              th {{ $t('report.midLevelBudget.result.meaning') }}
          tbody
            template(v-for="block in resultBlocks")
              tr.mlb-grouprow(:key="block.key + '-h'")
                td(colspan="5") {{ block.title }}
              tr(v-for="row in block.rows" :key="block.key + row.key")
                td.mlb-name {{ lineLabel(row.key) }}
                td.r.num {{ cellOrDash(row.budget) }}
                td.r.num(:class="{ 'is-blank': row.variance === null }") {{ row.variance === null ? $t('report.midLevelBudget.result.notEntered') : money(row.actual) }}
                td.r.num(:class="row.tone") {{ varianceFigure(row.variance) }}
                td
                  span(:class="{ 'is-blank': row.variance === null }") {{ row.meaning }}
                  span.mlb-pill(v-if="row.pill" :class="row.tone") {{ row.pill }}
              //- With nothing entered the subtotal reads "—" exactly as its own lines do. It
              //- used to read −$165,950 in green here, which says the client saved that much.
              tr.mlb-subtotal(:key="block.key + '-t'")
                td {{ block.totalLabel }}
                td.r.num {{ money(block.budget) }}
                td.r.num(:class="{ 'is-blank': !hasActuals }") {{ hasActuals ? money(block.actual) : $t('report.midLevelBudget.result.notEntered') }}
                td.r.num(:class="hasActuals ? block.tone : ''") {{ hasActuals ? varianceFigure(block.variance) : '—' }}
                td
        .mlb-card-f
          //- Says plainly that the right-hand columns are empty because nobody has filled
          //- step 4 in yet — not because the client spent nothing.
          span(v-if="resultBlocks.length && !hasActuals") {{ $t('report.midLevelBudget.result.nothingToCompare') }}
          span {{ $t('report.midLevelBudget.result.emptyLinesOmitted') }}
          //- The GST block is a reading, not a bank movement (Mike, 2026-09-13, deviation 2).
          //- Shown only once there is GST to report, so an empty budget says nothing about it.
          span.mlb-gst(v-if="gstHeld") {{ $t('report.midLevelBudget.result.gstHeld', { amount: money(gstHeld) }) }}

  .mlb-nav
    b-button(v-if="step > 1" size="is-small" @click="goTo(step - 1)") {{ $t('report.midLevelBudget.nav.back') }}
    b-button(v-if="step < 5" type="is-primary" size="is-small" @click="goTo(step + 1)") {{ $t('report.midLevelBudget.nav.next') }}
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

/** How many instalments a sale can be collected in — the month itself plus the next four. */
const BUCKETS = 5

/**
 * MidLevelBudget — the Mid Level Budget screen (Budgeting · Report class).
 *
 * FIVE steps, because the source workbook has five sheets: set up the year, when the money
 * moves, the budget, what actually happened, how it went. Four of the five are the High Level
 * Budget's screen, approved 2026-09-12 and unchanged here; step 2 is the new one, and it is the
 * whole difference between the two models.
 *
 * Report class — real client figures, so NO "Illustrative" badge, and the screen opens EMPTY.
 * It never seeds itself from the workbook sample: the backend returns nothing for an empty body
 * by design (see the model header), because sample figures on a real client's budget look
 * exactly like the client's own.
 *
 * All calculation is backend-only (POST /api/report/mid-level-budget); every figure rendered
 * comes back from the model, including the five-instalment spread on step 2. The 39 line names
 * ride on the response as `lineOrder`, so this screen holds no second copy of that list.
 *
 * SEVEN WORDING DECISIONS BY MIKE, 2026-09-13, each put to him on its own and each ruled as
 * recommended — from design/mockups/mid-level-budget.html, where the recommendation is left in
 * place beneath every ruling. The one that shapes behaviour rather than text:
 *
 *   🔴 STEP 4 CARRIES A WARNING, because the two sides mean different things by the same line
 *      name. On the budget, "Sales" is what was INVOICED and the model works out when the cash
 *      lands. The actuals sheet applies no timing at all (`sum(D9:D14)`, `=D20`), so what is
 *      entered there IS the cash. An advisor who types invoiced sales into step 4 gets a
 *      comparison that means nothing, and without this line nothing on screen would say so.
 */
export default {
  name: 'MidLevelBudget',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      step: 1,
      // Report class: the screen opens empty and stays empty until the advisor types. There
      // is deliberately no seeding from the workbook sample — including the timing profiles,
      // which are the client's own answer and never a default.
      form: {
        monthsStart: '2021-04',
        gstRatePct: 15,
        assumptions: {
          debtors: new Array(BUCKETS).fill(null),
          creditors: new Array(BUCKETS).fill(null)
        },
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
    /** The five step chips, in order. */
    stepChips () {
      const t = 'report.midLevelBudget.steps.'
      return [
        { n: 1, label: this.$t(t + 'setup') },
        { n: 2, label: this.$t(t + 'timing') },
        { n: 3, label: this.$t(t + 'budget') },
        { n: 4, label: this.$t(t + 'actual') },
        { n: 5, label: this.$t(t + 'result') }
      ]
    },

    /** Which side of the model the entry steps are editing. */
    side () { return this.step === 4 ? 'actual' : 'budget' },

    /**
     * 🔴 Whether a single actual figure has been entered anywhere.
     *
     * Read off the model's own nulls — no arithmetic here. A variance line is `null` until an
     * actual is entered against it, so "has anything been entered" is already answered.
     *
     * This governs the whole of step 5, and it exists because the screen was opened with an
     * empty actuals side: the headline announced, in GREEN, that the client had spent 375,950
     * less than budget and closed 64,040 above plan, while every line in the table beneath it
     * correctly read "not entered". Nothing had been entered at all. The table was honest and
     * the headline above it was not.
     *
     * The comparison is only ever a comparison once there is something to compare.
     */
    hasActuals () {
      if (!this.data) { return false }
      const lines = this.data.variance.yearToDate.lines
      return Object.keys(lines).some(k => lines[k] !== null)
    },

    /** The variance headline once there is something to compare; the budget's own until then. */
    showResultHero () { return this.step >= 4 && this.hasActuals },

    /** The two timing cards on step 2, each with its labels and its balance reading. */
    profiles () {
      const t = 'report.midLevelBudget.timing.'
      const build = (key, titleKey, leadKey, firstLabelKey, unbalancedKey, helpKey) => {
        const balance = this.data ? this.data.assumptions[key + 'Balance'] : 1
        // A balance within half a percentage point reads as complete: the advisor types whole
        // percentages, and floating-point addition of 0.2 + 0.45 + 0.3 + 0.05 is not exactly 1.
        const balanced = Math.abs(balance) < 0.005
        return {
          key,
          title: this.$t(t + titleKey),
          lead: this.$t(t + leadKey, { hundred: this.money(100) }),
          labels: [
            this.$t(t + firstLabelKey),
            this.$t(t + 'oneMonth'),
            this.$t(t + 'twoMonths'),
            this.$t(t + 'threeMonths'),
            this.$t(t + 'fourMonths')
          ],
          balanced,
          balanceMessage: balanced
            ? this.$t(t + 'balanced')
            : this.$t(t + unbalancedKey, { percent: this.percentShort(balance) }),
          help: helpKey ? this.$t(t + helpKey) : null
        }
      }
      return [
        build('debtors', 'debtorsTitle', 'debtorsLead', 'sameMonthSale', 'unbalancedDebtors', 'debtorsHelp'),
        build('creditors', 'creditorsTitle', 'creditorsLead', 'sameMonthInvoice', 'unbalancedCreditors', null)
      ]
    },

    /** The first month's sale broken into its five instalments — computed by the model. */
    spread () { return this.data ? this.data.assumptions.firstMonthSpread : null },

    /** Sales invoiced in the year less the cash collected inside it. */
    stillOwed () {
      if (!this.data) { return 0 }
      const y = this.data.budget.yearToDate
      return y.lines.sales - y.salesCashCollected
    },

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

    firstMonthLabel () { return this.monthLabels.length ? this.monthLabels[0] : '' },
    lastMonthLabel () { return this.monthLabels.length ? this.monthLabels[MONTHS - 1] : '' },

    /** The three entry blocks — money in, stock and materials, then money out. */
    entryBlocks () {
      if (!this.data) { return [] }
      const t = 'report.midLevelBudget.entry.'
      const order = this.data.lineOrder || []
      const deposits = order.filter(l => l.group === 'deposit').map(l => ({ key: l.key }))

      // Stock: the one entered line, then the two the model works out from it.
      const stock = order.filter(l => l.group === 'variableCost').map(l => ({ key: l.key }))
      stock.push({
        key: 'paymentsMade',
        computed: true,
        sub: this.$t(t + (this.step === 4 ? 'paidToSuppliersActualSub' : 'paidToSuppliersSub')),
        year: this.data[this.side].yearToDate.paymentsMade
      })
      stock.push({
        key: 'grossProfit',
        computed: true,
        total: true,
        year: this.data[this.side].yearToDate.grossProfit
      })

      const out = []
      order.filter(l => l.group === 'gstExpense').forEach((l, i) => {
        if (i === 0) { out.push({ key: 'gst', heading: this.$t(t + 'withGst') }) }
        out.push({ key: l.key })
      })
      order.filter(l => l.group === 'nonGstExpense').forEach((l, i) => {
        if (i === 0) { out.push({ key: 'nongst', heading: this.$t(t + 'withoutGst') }) }
        out.push({ key: l.key })
      })

      return [
        { key: 'in', title: this.$t(t + 'moneyIn'), rows: deposits, cashNote: true },
        {
          key: 'stock',
          title: this.$t(t + 'stock'),
          rows: stock,
          cashNote: true,
          foot: this.$t(t + 'grossProfitFoot')
        },
        {
          key: 'out',
          title: this.$t(t + 'moneyOut'),
          rows: out,
          foot: this.$t(t + 'countsEveryLine')
        }
      ]
    },

    /**
     * The result table — only lines with a budget or an actual, so 30 empty rows of dashes
     * never reach the screen.
     */
    resultBlocks () {
      if (!this.data) { return [] }
      const t = 'report.midLevelBudget.'
      const order = this.data.lineOrder || []
      const build = (groups, title, key, isMoneyIn, totalLabel) => {
        const rows = order
          .filter(l => groups.includes(l.group))
          .map(l => this.resultRow(l.key, isMoneyIn))
          .filter(r => r !== null)
        return { key, title, totalLabel: totalLabel || title, rows }
      }

      /**
       * Every subtotal reads the MODEL's own variance, never a sum of the rows above it.
       *
       * Two reasons, and the screen showed both. Money in and Paid to suppliers total the CASH
       * — collected and paid — while the lines above them are what was invoiced and bought, and
       * on this model those are different figures. And summing the rows treated a null as a
       * zero, so the three subtotals gave three different answers to "nothing was entered yet":
       * −311,910 in red, −165,950 in green, and 0.
       */
      const totals = (block, budget, actual, variance, isMoneyIn) => {
        block.budget = budget
        block.actual = actual
        block.variance = variance
        block.tone = this.toneFor(variance, isMoneyIn)
        return block
      }
      const y = this.data.variance.yearToDate

      const moneyIn = totals(
        build(['deposit'], this.$t(t + 'entry.moneyIn'), 'in', true),
        this.budgetDeposits, this.actualDeposits, this.depositsVariance, true)

      const stock = totals(
        build(['variableCost'], this.$t(t + 'entry.stock'), 'stock', false, this.$t(t + 'result.paidSuppliers')),
        this.data.budget.yearToDate.paymentsMade,
        this.data.actual.yearToDate.paymentsMade,
        y.paymentsMade, false)

      const moneyOut = totals(
        build(['gstExpense', 'nonGstExpense'], this.$t(t + 'entry.moneyOut'), 'out', false),
        this.data.budget.yearToDate.subtotalWithdrawals,
        this.data.actual.yearToDate.subtotalWithdrawals,
        y.subtotalWithdrawals, false)

      return [moneyIn, stock, moneyOut].filter(b => b.rows.length > 0)
    },

    budgetDeposits () { return this.yearOf('budget', 'subtotalDeposits') },
    actualDeposits () { return this.yearOf('actual', 'subtotalDeposits') },
    budgetNetChange () { return this.yearOf('budget', 'netChangeInBank') },

    /** Money out is everything that leaves the bank: suppliers paid, plus every expense line. */
    budgetMoneyOut () {
      return this.yearOf('budget', 'paymentsMade') + this.yearOf('budget', 'subtotalWithdrawals')
    },
    actualMoneyOut () {
      return this.yearOf('actual', 'paymentsMade') + this.yearOf('actual', 'subtotalWithdrawals')
    },

    budgetClosing () { return this.data ? this.data.budget.closingBalance : 0 },
    actualClosing () { return this.data ? this.data.actual.closingBalance : 0 },

    /**
     * The GST sitting in the bank that belongs to Inland Revenue — collected less paid, on the
     * budget. A reading only: it moves no balance on this screen (Mike, 2026-09-13).
     */
    gstHeld () { return this.data ? this.data.budget.yearToDate.gstHeld : 0 },

    /** Variances taken from the model's own variance side, not by subtracting the subtotals. */
    depositsVariance () { return this.varianceYear('subtotalDeposits') },
    moneyOutVariance () {
      return this.varianceYear('paymentsMade') + this.varianceYear('subtotalWithdrawals')
    },

    /** A budget with nothing in it has not gone well — it has not gone anywhere. */
    toneForNetChange () {
      if (!this.budgetNetChange) { return 'default' }
      return this.budgetNetChange < 0 ? 'crit' : 'good'
    },

    toneForDeposits () { return this.toneFor(this.depositsVariance, true) },
    toneForMoneyOut () { return this.toneFor(this.moneyOutVariance, false) },
    toneForClosing () {
      const gap = this.actualClosing - this.budgetClosing
      if (!gap) { return 'default' }
      return gap > 0 ? 'good' : 'crit'
    },

    closingGapSub () {
      const gap = this.actualClosing - this.budgetClosing
      if (!gap) { return this.$t('report.midLevelBudget.hero.onPlan') }
      const key = gap > 0 ? 'abovePlan' : 'belowPlan'
      return this.$t('report.midLevelBudget.hero.' + key, { amount: this.money(Math.abs(gap)) })
    },

    /** The tallest bar on the money-in chart, so both series share one scale. */
    depositsPeak () {
      if (!this.data) { return 0 }
      return Math.max(
        0,
        ...this.data.budget.subtotalDeposits,
        ...this.data.actual.subtotalDeposits
      )
    },

    /** The tallest instalment on the step-2 spread, so the five bars share one scale. */
    spreadPeak () {
      return this.spread ? Math.max(0, ...this.spread.amounts) : 0
    }
  },

  watch: {
    form: { deep: true, handler () { this.queueRecompute() } }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /** The user-facing name of a line — never the workbook's own spelling. */
    lineLabel (key) {
      return this.$t('report.midLevelBudget.lines.' + key)
    },

    /** Step navigation. Every step is reachable: nothing here depends on an upload. */
    goTo (n) {
      if (n < 1 || n > 5) { return }
      this.step = n
    },

    /**
     * A share of the balance as a short percentage — "5%" rather than "5.0000001%".
     *
     * Rounded to one decimal and trimmed, because the advisor typed whole numbers and a
     * warning that reads 4.9999% invites them to hunt a rounding error that is not there.
     */
    percentShort (fraction) {
      const pct = Math.round(Math.abs(fraction) * 1000) / 10
      return (Number.isInteger(pct) ? pct : pct.toFixed(1)) + '%'
    },

    /** One timing share, held as the whole percentage the advisor typed. */
    setShare (key, index, v) {
      const n = v === '' || v === null ? null : Number(v)
      this.$set(this.form.assumptions[key], index, n === null || Number.isNaN(n) ? null : n)
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

    /** One figure per line writes all twelve months at once (Mike, 2026-09-12). */
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

    /** The budget's own per-month figure, shown read-only beside the actuals on step 4. */
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
     * when none did — "+$0" against a line that came in exactly on budget. That fault reached
     * the sibling screen and was found by opening it, 2026-09-12.
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
     * The colour carries the meaning, the number never changes (Mike, 2026-09-12).
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
     * the lines this budget never uses stay off the screen entirely.
     */
    resultRow (key, isMoneyIn) {
      const budget = this.data.budget.yearToDate.lines[key] || 0
      const variance = this.data.variance.yearToDate.lines[key]
      const actual = this.data.actual.yearToDate.lines[key] || 0
      if (!budget && variance === null) { return null }
      const t = 'report.midLevelBudget.result.'
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

    /** One instalment's height on the step-2 spread. */
    spreadHeight (v) { return this.barHeight(v, this.spreadPeak) },

    /**
     * The column heading for one instalment on the step-2 spread: the month that instalment
     * lands in, wrapping past December into the next year's labels.
     */
    spreadMonthLabel (k) {
      return this.monthLabels.length > k ? this.monthLabels[k] : ''
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

    /**
     * The POST this screen recomputes with — consumed by the reportRecompute mixin.
     *
     * The timing shares are held as whole percentages on the form, because that is what the
     * advisor types; the model takes fractions.
     */
    recomputeRequest () {
      const share = v => (v === null || v === undefined || v === '' ? 0 : Number(v) / 100)
      return {
        url: '/api/report/mid-level-budget',
        body: {
          gstRate: Number(this.form.gstRatePct || 0) / 100,
          months: this.months,
          assumptions: {
            debtors: this.form.assumptions.debtors.map(share),
            creditors: this.form.assumptions.creditors.map(share)
          },
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
.mlb-root { display: flex; flex-direction: column; gap: 16px; }
/* [B] Reset the shared ReportHeader's `margin: 0 auto 22px`: inside a flex column that auto
   margin shrinks the header below full width and its 22px stacks on the flex gap. Guarded by
   reportHeaderFullWidth.test.js. */
.mlb-root ::v-deep .rs-top { margin: 0; }

.mlb-steps { display: flex; gap: 10px; flex-wrap: wrap; }
.mlb-step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.mlb-step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line);
  color: var(--rs-ink); font-size: 11px;
}
.mlb-step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.mlb-step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.mlb-step.done { color: var(--rs-good); }
.mlb-step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }

/* [D] House two-column grid, collapsing at the standard breakpoint. */
.mlb-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .mlb-layout { grid-template-columns: 1fr; } }
.mlb-inputs, .mlb-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* The entry and result steps are full width: a 39-line × 12-month grid has no business in a
   360px column, and there are no sliders to put there. */
.mlb-entry, .mlb-results-wide { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* Cards read the shared tokens and declare no palette of their own. NO top edge — RULED
   2026-08-31, consistency wins (see REPORT-VISUAL-STANDARD.md). */
.mlb-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad); min-width: 0;
}
.mlb-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin: 0 0 12px;
}
.mlb-card-h { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.mlb-card-h h2 { margin: 0 0 12px; }
.mlb-card-f {
  margin: 12px -16px -16px; padding: 13px 16px; border-top: 1px solid var(--rs-line);
  background: var(--rs-panel-2); border-radius: 0 0 var(--rs-card-radius) var(--rs-card-radius);
  font-size: 12.5px; color: var(--rs-muted);
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
}
.mlb-note { font-size: 11.5px; color: var(--rs-muted); margin: 8px 0 0; font-weight: 300; }
.mlb-lead { font-size: 13.5px; margin: 0 0 12px; }
.mlb-sub { font-size: 11.5px; color: var(--rs-muted); font-weight: 400; display: block; margin-top: 2px; }
.mlb-badge {
  font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 7px; background: var(--rs-warn-soft); color: #a06000;
}
/* The step-4 warning. Amber rather than red: it is a caution about what to type, not a failure. */
.mlb-warn {
  font-size: 12.5px; font-weight: 600; color: #a06000; background: var(--rs-warn-soft);
  border-radius: 8px; padding: 9px 12px; margin: 0 0 12px;
}

.mlb-field { margin-bottom: 14px; }
.mlb-field:last-child { margin-bottom: 0; }
.mlb-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; }

/* ── step 2, the timing profiles ────────────────────────────────────────── */
.mlb-prof { display: grid; grid-template-columns: 1fr 108px; gap: 10px 14px; align-items: center; }
.mlb-lab { font-size: 13px; }
.mlb-pc { display: flex; align-items: center; gap: 6px; }
.mlb-pc ::v-deep .control { flex: 1; }
.mlb-pc ::v-deep .input { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.mlb-pct { font-size: 12px; color: var(--rs-muted); }
.mlb-balance {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  margin-top: 12px; padding: 9px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600;
}
.mlb-balance.ok { background: var(--rs-good-soft); color: var(--rs-good); }
.mlb-balance.off { background: var(--rs-warn-soft); color: #a06000; }

.mlb-spread { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 6px; }
.mlb-sp { text-align: center; min-width: 0; }
.mlb-bwrap { height: 92px; display: flex; align-items: flex-end; }
/* A gradient on a data mark is deliberately kept (REPORT-VISUAL-STANDARD Part 2). */
.mlb-bar { width: 100%; background: linear-gradient(180deg, #4a9fd8, var(--rs-accent)); border-radius: 5px 5px 0 0; }
.mlb-t {
  font-size: 9.5px; letter-spacing: .04em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; margin-top: 6px;
}
.mlb-a { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; }
/* The twelve-month collection table is wider than its column and scrolls on its own. */
.mlb-scroll { overflow-x: auto; }
/* The year's figure sits below that scroll, not inside it — see the template note. */
.mlb-owed {
  display: flex; justify-content: space-between; align-items: baseline; gap: 14px;
  margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--rs-ink);
  font-weight: 700; color: var(--rs-ink); font-size: 13.5px;
}
.mlb-owed b { font-variant-numeric: tabular-nums; }
.mlb-owed b.crit { color: var(--rs-crit); }

.mlb-mini { width: 100%; border-collapse: collapse; font-size: 13px; }
.mlb-mini td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--rs-bg); vertical-align: top; }
.mlb-mini td:first-child { font-weight: 600; white-space: nowrap; width: 34%; }
.mlb-mini td.is-prose { color: var(--rs-muted); }

.mlb-grid { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.mlb-grid th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line);
}
.mlb-grid th.r, .mlb-grid td.r { text-align: right; }
.mlb-grid td { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rs-bg); vertical-align: middle; }
.mlb-grid td.num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.mlb-grid td.good { color: var(--rs-good); }
.mlb-grid td.crit { color: var(--rs-crit); }
.mlb-name { font-weight: 600; color: var(--rs-ink); min-width: 180px; }
.mlb-grouprow td {
  background: var(--rs-panel-2); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; padding: 8px 10px;
}
.mlb-subtotal td {
  border-top: 2px solid var(--rs-ink); border-bottom: 0; font-weight: 700;
  color: var(--rs-ink); padding-top: 10px;
}
.mlb-subtotal td.crit { color: var(--rs-crit); }
/* A row the model works out rather than one the advisor types. */
.mlb-computed td { color: var(--rs-muted); }
.mlb-computed td.num { color: var(--rs-ink); }
.mlb-computed.is-total td { border-top: 2px solid var(--rs-ink); font-weight: 700; color: var(--rs-ink); }
.mlb-ro {
  background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 7px;
  padding: 5px 9px; display: inline-block; font-variant-numeric: tabular-nums;
  font-weight: 600; color: var(--rs-muted); min-width: 82px; text-align: right; font-size: 13px;
}
/* The entry boxes are COMPACT and sit at the right of their column. Buefy's control is a block
   element that fills its cell, which made each number box roughly three times the drawn width
   on the sibling screen — across 39 rows that is the difference between a table you can scan
   and one you cannot. Found by opening that screen, 2026-09-12; no test could have seen it. */
.mlb-grid td.r ::v-deep .control { width: 118px; margin-left: auto; }
.mlb-grid td.r ::v-deep .input { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.mlb-months ::v-deep .control { width: auto; }
.mlb-vary { color: var(--rs-accent); font-weight: 600; font-size: 11.5px; white-space: nowrap; cursor: pointer; }
.is-blank { color: var(--rs-muted); font-weight: 400; }
.mlb-pill {
  display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 5px;
  padding: 2px 6px; margin-left: 7px;
}
.mlb-pill.good { background: var(--rs-good-soft); color: var(--rs-good); }
.mlb-pill.crit { background: var(--rs-crit-soft); color: var(--rs-crit); }

.mlb-months {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin: 4px 0 10px;
  padding: 11px; background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 9px;
}
.mlb-m { text-align: center; min-width: 0; }
.mlb-mh {
  font-size: 9.5px; letter-spacing: .05em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; margin-bottom: 4px;
}
@media (max-width: 860px) { .mlb-months { grid-template-columns: repeat(4, 1fr); } }

.mlb-chart { display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px; align-items: end; height: 186px; }
.mlb-slot { display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.mlb-pair { display: flex; gap: 3px; align-items: flex-end; height: 100%; }
.mlb-bar2 { flex: 1; border-radius: 4px 4px 0 0; min-height: 2px; }
.mlb-bar2.is-budget { background: linear-gradient(180deg, #4a9fd8, var(--rs-accent)); }
.mlb-bar2.is-actual { background: linear-gradient(180deg, #00c5f5, var(--rs-accent-bright)); }
.mlb-xlab { font-size: 9.5px; color: var(--rs-muted); text-align: center; margin-top: 6px; font-weight: 600; }

.mlb-linewrap { height: 170px; }
.mlb-linewrap svg { width: 100%; height: 100%; overflow: visible; }
.mlb-linewrap polyline { fill: none; stroke-width: 2.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.mlb-linewrap polyline.is-budget { stroke: var(--rs-accent); }
.mlb-linewrap polyline.is-actual { stroke: var(--rs-crit); }

.mlb-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--rs-muted); margin-top: 12px; }
.mlb-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.mlb-legend i.is-budget { background: var(--rs-accent); }
.mlb-legend i.is-actual { background: var(--rs-accent-bright); }
.mlb-legend i.is-actual-line { background: var(--rs-crit); }

.mlb-gst { color: var(--rs-ink); }
.mlb-nav { display: flex; gap: 10px; justify-content: flex-end; }
</style>

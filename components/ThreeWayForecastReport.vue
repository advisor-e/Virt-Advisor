<template lang="pug">
//- [A] Screen root — a flex column with ONE gap value, so header→banner→body all
//- space identically. See design/REPORT-VISUAL-STANDARD.md.
.tw-root
  //- [B] No badge: CLASS_REPORT, built from the client's own accounts.
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.threeWayForecast.eyebrowClass')"
    :title="$t('report.threeWayForecast.title')"
    :client="client || $t('report.preparedFor')")

  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures.
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute")

    //- [C] The headline band — full width, a direct child of the root.
    hero-strip(:columns="4" :stale="!!error")
      hero-figure(
        :label="$t('report.threeWayForecast.report.closingCash')"
        :value="money(headline.closingCash)"
        :sub="headline.closingCash < 0 ? $t('report.threeWayForecast.report.closingCashSub') : $t('report.threeWayForecast.report.closingCashSubGood')"
        :tone="headline.closingCash < 0 ? 'crit' : 'default'")
      hero-figure(
        :label="$t('report.threeWayForecast.report.lowestPoint')"
        :value="money(headline.lowest.value)"
        :sub="$t('report.threeWayForecast.report.lowestPointSub', { month: headline.lowest.label })"
        :tone="headline.lowest.value < 0 ? 'crit' : 'default'")
      hero-figure(
        :label="$t('report.threeWayForecast.report.resultForYear')"
        :value="money(headline.afterTax)"
        :sub="$t('report.threeWayForecast.report.resultForYearSub', { revenue: money(headline.revenue) })"
        :tone="headline.afterTax < 0 ? 'crit' : 'default'")
      hero-figure(
        :label="$t('report.threeWayForecast.report.grossMargin')"
        :value="pct(headline.grossMarginPct)"
        :sub="$t('report.threeWayForecast.report.grossMarginSub', { amount: money(headline.grossSurplus) })")

    //- Stock below zero cannot happen in reality, so it is named rather than shown as a
    //- figure among figures. Drawn this way in the approved mockup.
    .tw-impossible(v-if="stockOutMonths.length")
      div
        b {{ $t('report.threeWayForecast.report.stockOutTitle', { months: stockOutMonths.join(', ') }) }}
        span {{ $t('report.threeWayForecast.report.stockOutBody') }}

    //- An out-of-balance opening WARNS rather than blocking (Mike's ruling 2026-09-03), so
    //- the advisor still sees the forecast that tells them their opening figures are out.
    //- It is a full-width band rather than only the sidebar tile so that it survives into
    //- the print, where a sidebar figure is easy to hand a client without noticing.
    //- Its OWN class, not the stock band's: the two say different things, and a shared
    //- class left the stock tests unable to tell which band they had found.
    .tw-unbalanced(v-if="balanceCheck !== 0")
      div
        b {{ $t('report.threeWayForecast.report.balanceOffTitle', { amount: money(balanceCheck) }) }}
        span {{ $t('report.threeWayForecast.report.balanceOffBody') }}

  .tw-layout
    //- [D1] The levers.
    aside.tw-card
      .tw-group
        .tw-glabel
          span.tw-dot
          h2.tw-h2 {{ $t('report.threeWayForecast.report.tryHeading') }}
        slider-field(
          :label="$t('report.threeWayForecast.report.salesAll')"
          :display="signedPct(f.salesShift)"
          :value="f.salesShift"
          :min="-50" :max="50" :step="1"
          @input="v => setField('salesShift', v)")
        slider-field(
          :label="$t('report.threeWayForecast.assume.markup')"
          :display="pct(f.markup)"
          :value="f.markup"
          :min="0" :max="200" :step="1"
          @input="v => setField('markup', v)")
        slider-field(
          :label="$t('report.threeWayForecast.assume.monthAfter')"
          :display="pct(f.debtorMonthAfter)"
          :value="f.debtorMonthAfter"
          :min="0" :max="100" :step="1"
          @input="v => setField('debtorMonthAfter', v)")
        slider-field(
          :label="$t('report.threeWayForecast.report.overheadsAll')"
          :display="signedPct(f.overheadShift)"
          :value="f.overheadShift"
          :min="-50" :max="50" :step="1"
          @input="v => setField('overheadShift', v)")
        p.tw-note {{ $t('report.threeWayForecast.report.rebuildNote') }}

      .tw-group(v-if="data")
        .tw-glabel
          span.tw-dot
          h2.tw-h2 {{ $t('report.threeWayForecast.report.balanceHeading') }}
        .tw-tile
          .tw-k {{ $t('report.threeWayForecast.report.balanceCheck') }}
          .tw-v(:class="{ 'is-crit': balanceCheck !== 0, 'is-good': balanceCheck === 0 }") {{ money(balanceCheck) }}
          .tw-sub {{ balanceCheck === 0 ? $t('report.threeWayForecast.report.balanceTies') : $t('report.threeWayForecast.report.balanceOff') }}

    //- [D2] The statements.
    section.tw-results(v-if="data")
      .tw-card
        //- The tabs, and the Summary / Every line setting that governs all three of them.
        //- Approved by Mike 2026-09-05 from mockups/three-way-forecast-report-detail.html.
        .tw-tabrow
          .tw-tabs
            button(
              v-for="t in tabs" :key="t.key"
              :class="{ on: tab === t.key }"
              type="button"
              @click="tab = t.key") {{ $t(t.label) }}
          .seg-small
            button(
              v-for="d in detailOptions" :key="d"
              :class="{ on: detail === d }"
              type="button"
              @click="detail = d") {{ $t('report.threeWayForecast.report.detail.' + d) }}
        .tw-group.tw-tabbody
          .tw-tblwrap
            table
              thead
                tr
                  th
                  th(v-for="(m, i) in monthLabels" :key="i") {{ m }}
              tbody
                tr(v-for="row in visibleRows" :key="row.key" :class="{ rule: row.rule, 'is-sub': row.sub, 'is-strong': row.strong }")
                  td {{ row.rawLabel || $t(row.label) }}
                  td(
                    v-for="(v, i) in row.values" :key="i"
                    :class="cellClass(row, v)") {{ money(v) }}
          //- Only when something is actually hidden, and it counts what — Mike's ruling of
          //- 2026-09-05. A junior who cannot see an "Insurance" row has no way to know the
          //- app holds one, so hiding empties would otherwise hide an omission as well as
          //- noise. Names where they are set, because the answer is on another screen.
          p.tw-note(v-if="hiddenOverheadCount")
            | {{ $t('report.threeWayForecast.report.detail.hiddenOverheads', { hidden: hiddenOverheadCount, total: overheadCount }) }}
          p.tw-note {{ $t('report.threeWayForecast.report.scrollNote') }}

      .tw-card
        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.report.workingCapitalHeading') }}
          .tw-tblwrap
            table
              thead
                tr
                  th
                  th(v-for="(m, i) in monthLabels" :key="i") {{ m }}
              tbody
                tr(v-for="row in workingCapitalRows" :key="row.key")
                  td {{ $t(row.label) }}
                  td(
                    v-for="(v, i) in row.values" :key="i"
                    :class="cellClass(row, v)") {{ money(v) }}
          p.tw-note(v-if="stockOutMonths.length") {{ $t('report.threeWayForecast.report.impossibleNote') }}

      //- [D2c] Templated, as on every other model in this section.
      .tw-edu
        .tw-edu-h
          span.tw-lead COACH
          | {{ $t('report.threeWayForecast.report.coach') }}
        p.tw-edu-p(v-for="(line, i) in coachLines" :key="i") {{ line }}

      //- [D2d]
      .tw-actions
        button.tw-cta(type="button" @click="print") {{ $t('report.threeWayForecast.report.print') }}
        button.tw-cta.tw-ghost(type="button" @click="$emit('change-assumptions')") {{ $t('report.threeWayForecast.report.changeAssumptions') }}
        button.tw-cta.tw-ghost(type="button" @click="$emit('start-again')") {{ $t('report.threeWayForecast.report.startAgain') }}
        span.tw-foot {{ $t('report.threeWayForecast.report.privacy') }}
</template>

<script>
/**
 * Three-Way Forecast — the result screen.
 *
 * Assembly only. The arithmetic is backend-only (`server/report/threeWayForecastModel.js`
 * via `POST /api/report/three-way-forecast`), and every shared block — header, banner,
 * stale behaviour, money formatting, the debounce and the race guard — comes from the
 * base components and the two mixins. See `design/ADDING-A-REPORT.md`.
 *
 * Built from the approved drawing `design/mockups/three-way-forecast.html` (wording
 * approved by Mike 2026-09-02). Two behaviours were drawn one way and are built that
 * way, and he has not ruled on them separately — both are recorded in
 * `design/ARTEFACTS.md` as still open:
 *
 *   - NEGATIVE STOCK IS NAMED, not left as a figure among figures. The model reports it
 *     truthfully rather than flooring it at zero, because a forecast that sells stock it
 *     never bought cannot happen; showing it as a plain number invites an advisor to
 *     read past it.
 *   - AN OUT-OF-BALANCE OPENING WARNS rather than blocking. It is the advisor's own
 *     opening figures that are out, and refusing to compute would hide the forecast that
 *     tells them so.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import HeroStrip from '~/components/base/HeroStrip.vue'
import HeroFigure from '~/components/base/HeroFigure.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import SliderField from '~/components/base/SliderField.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** The month a serial date falls in, as a short label the header row can carry. */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default {
  name: 'ThreeWayForecastReport',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SliderField },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /** The confirmed inputs from the intake, or null to compute on the sample. */
    seed: { type: Object, default: null },
    /** The client's own name, held locally and never sent anywhere. */
    client: { type: String, default: '' }
  },

  data () {
    return {
      data: null,
      tab: 'cash',
      /**
       * How much of each statement to show — Mike's ruling, 2026-09-05.
       *
       * 🔴 IT OPENS ON 'summary', AND THAT IS THE POINT. Summary is the four-row screen he
       * approved on 2026-09-02, unchanged: nobody content with it is handed a longer one.
       * 'every' is a setting the advisor chooses, which is what makes this an addition
       * rather than a redesign. It governs all three tabs together, because an advisor who
       * finds the setting on one will look for it on the others.
       */
      detail: 'summary',
      // The four live levers. Percentages are whole numbers for the sliders.
      f: this.leversFor(this.seed)
    }
  },

  computed: {
    tabs () {
      return [
        { key: 'cash', label: 'report.threeWayForecast.report.tabCash' },
        { key: 'profit', label: 'report.threeWayForecast.report.tabProfit' },
        { key: 'balance', label: 'report.threeWayForecast.report.tabBalance' }
      ]
    },

    /** The two settings, in the order they are drawn. */
    detailOptions () { return ['summary', 'every'] },

    /** True while the advisor has asked for the full statement. */
    isEvery () { return this.detail === 'every' },

    /** How many overhead lines the engine holds, whether or not they carry a figure. */
    overheadCount () {
      return this.data ? Object.keys(this.data.profitAndLoss.overheads).length : 0
    },

    /**
     * How many overhead lines are hidden because they are zero in every month.
     *
     * Zero unless the full profit statement is on screen — there is nothing to explain when
     * the advisor is looking at four rows, and a note about hidden overheads beside a table
     * that shows none would be a puzzle rather than a help.
     *
     * @returns {number}
     */
    hiddenOverheadCount () {
      if (!this.data || !this.isEvery || this.tab !== 'profit') { return 0 }
      const oh = this.data.profitAndLoss.overheads
      return Object.keys(oh).filter(k => !this.hasAFigure(oh[k])).length
    },

    /** Short month names for the table head, read from the model's own dates. */
    monthLabels () {
      if (!this.data) { return [] }
      return this.data.months.isoDates.map((iso) => {
        const m = Number(String(iso).slice(5, 7))
        return MONTH_SHORT[m - 1] || ''
      })
    },

    headline () {
      const d = this.data
      if (!d) {
        return { closingCash: 0, lowest: { value: 0, label: '' }, afterTax: 0, revenue: 0, grossSurplus: 0, grossMarginPct: 0 }
      }
      const cash = d.cashFlow.closingBalance
      let lowIndex = 0
      cash.forEach((v, i) => { if (v < cash[lowIndex]) { lowIndex = i } })
      const total = series => series.reduce((a, v) => a + v, 0)
      const revenue = total(d.profitAndLoss.revenue)
      const grossSurplus = total(d.profitAndLoss.grossSurplus)
      return {
        closingCash: cash[cash.length - 1],
        lowest: { value: cash[lowIndex], label: this.monthLabels[lowIndex] },
        afterTax: total(d.profitAndLoss.netSurplusAfterTax),
        revenue,
        grossSurplus,
        grossMarginPct: revenue === 0 ? 0 : (grossSurplus / revenue) * 100
      }
    },

    balanceCheck () {
      if (!this.data) { return 0 }
      const checks = this.data.balanceSheet.months.balanceCheck
      return checks[checks.length - 1]
    },

    /** The months where stock falls below zero — impossible, and named rather than shown. */
    stockOutMonths () {
      if (!this.data) { return [] }
      const out = []
      this.data.balanceSheet.months.inventory.forEach((v, i) => {
        if (v < 0) { out.push(this.monthLabels[i]) }
      })
      return out
    },

    /**
     * Does this forecast trade overseas at all? Asked of the FIGURES rather than of the
     * tick, so a section filled in and then unticked reports nothing — which is what the
     * engine computes in that case too.
     * @returns {boolean}
     */
    hasOverseasTrade () {
      if (!this.data || !this.data.schedules || !this.data.schedules.overseas) { return false }
      const os = this.data.schedules.overseas
      const any = s => Array.isArray(s) && s.some(v => v !== 0)
      return any(os.deposits) || any(os.freight) || any(os.duty) || any(os.borderGst) ||
        any(os.supplierBalance) || any(os.importedRevenue) || any(os.overseasRevenue)
    },

    /**
     * 🔴 THE FIVE OVERSEAS ROWS, and the reason the section exists at all. Mike, 2026-09-04:
     * "the whole point of this section is to show when deposits are due, freight is paid,
     * border gst etc - BEFORE the business can even start selling them". Inside Money out
     * they are one figure in the month the supplier was settled, and the months that
     * matter are invisible.
     *
     * They appear ONLY when the forecast actually trades overseas, so a domestic forecast
     * keeps the compact four-row screen it has always had.
     * @returns {Array<object>}
     */
    overseasCashRows () {
      if (!this.hasOverseasTrade) { return [] }
      const p = this.data.cashFlow.payments
      return [
        { key: 'os-dep', label: 'report.threeWayForecast.report.overseasDeposits', values: p.overseasDeposits, sub: true },
        { key: 'os-frt', label: 'report.threeWayForecast.report.overseasFreight', values: p.overseasFreight, sub: true },
        { key: 'os-duty', label: 'report.threeWayForecast.report.overseasDuty', values: p.overseasDuty, sub: true },
        { key: 'os-gst', label: 'report.threeWayForecast.report.overseasBorderGst', values: p.overseasBorderGst, sub: true },
        { key: 'os-bal', label: 'report.threeWayForecast.report.overseasSupplierBalance', values: p.overseasSupplierBalance, sub: true }
      ]
    },

    /**
     * Stock already paid for at the opening date, landing during the year (Fix 2).
     *
     * ⚠ NOT ON THE APPROVED DRAWING, and named as an addition rather than slipped in. The
     * drawing described what the landing does to the three statements and drew no cash
     * rows. But it moves real money — the balance settled with the supplier, and the GST
     * Customs charges on arrival — and rolled into "Money out" it would appear as one lump
     * in a month with no explanation. That is the same argument that gave the five overseas
     * rows above their own lines, in Mike's own words: the point is to show WHEN the money
     * goes, before the business can sell any of it.
     *
     * Absent unless the block is in use, so no existing forecast gains a row.
     *
     * @returns {Array<object>} zero or two sub-rows under Money out.
     */
    stockInTransitCashRows () {
      const t = this.data.schedules && this.data.schedules.stockInTransit
      if (!t || !t.landedValue.some(v => v > 0)) { return [] }
      const p = this.data.cashFlow.payments
      return [
        { key: 'tr-bal', label: 'report.threeWayForecast.report.transitBalance', values: p.stockInTransitBalance, sub: true },
        { key: 'tr-gst', label: 'report.threeWayForecast.report.transitGst', values: p.stockInTransitGst, sub: true }
      ]
    },

    cashRows () {
      const c = this.data.cashFlow
      const tail = [
        { key: 'move', label: 'report.threeWayForecast.report.movement', values: c.netMovement, rule: true, signed: true },
        { key: 'close', label: 'report.threeWayForecast.report.cashAtMonthEnd', values: c.closingBalance, rule: true, signed: true }
      ]
      if (!this.isEvery) {
        return [
          { key: 'in', label: 'report.threeWayForecast.report.moneyIn', values: c.totalReceipts },
          { key: 'out', label: 'report.threeWayForecast.report.moneyOut', values: c.totalPayments }
        ].concat(this.overseasCashRows).concat(this.stockInTransitCashRows).concat(tail)
      }
      const L = 'report.threeWayForecast.report.line.'
      const r = c.receipts
      const p = c.payments
      const sub = (key, label, values) => ({ key, label: L + label, values, sub: true })
      // Every row the engine fills, receipts then payments, in its own order. The five
      // overseas rows and the two for stock in transit are already itemised on the summary
      // (Mike, 2026-09-04), so they are not repeated by the two helpers here — this list
      // holds them once, in their place among the rest.
      return [
        sub('r-deb', 'fromDebtors', r.fromDebtors),
        sub('r-int', 'interestReceived', r.interestReceived),
        sub('r-draw', 'loanDrawdowns', r.loanDrawdowns),
        sub('r-gst', 'gstRefunds', r.gstRefunds),
        sub('r-tax', 'taxRefunds', r.taxRefunds),
        sub('r-oi', 'otherIncome', r.otherIncomeGstInclusive),
        sub('r-oix', 'otherIncomeExempt', r.otherIncomeGstExempt),
        sub('r-sh', 'shareholderAdvances', r.shareholderAdvances),
        sub('r-asset', 'assetSales', r.assetSales),
        { key: 'in', label: 'report.threeWayForecast.report.moneyIn', values: c.totalReceipts, rule: true, strong: true },
        sub('p-ap', 'accountsPayable', p.accountsPayable),
        sub('p-cm', 'currentMonthGstInclusive', p.currentMonthGstInclusive),
        sub('p-cmf', 'currentMonthGstFree', p.currentMonthGstFree),
        sub('p-int', 'interestPaid', p.interestPaid),
        sub('p-prin', 'loanPrincipal', p.loanPrincipal),
        sub('p-gst', 'gstPaid', p.gstPaid),
        sub('p-tax', 'taxPaid', p.taxPaid),
        sub('p-sh', 'shareholderDrawings', p.shareholderDrawings),
        sub('p-capex', 'capitalExpenditure', p.capitalExpenditure)
      ]
        .concat(this.overseasCashRows)
        .concat(this.stockInTransitCashRows)
        .concat([{ key: 'out', label: 'report.threeWayForecast.report.moneyOut', values: c.totalPayments, rule: true, strong: true }])
        .concat(tail)
    },

    profitRows () {
      const p = this.data.profitAndLoss
      const summary = [
        { key: 'rev', label: 'report.threeWayForecast.report.revenue', values: p.revenue },
        { key: 'gross', label: 'report.threeWayForecast.report.grossSurplus', values: p.grossSurplus, signed: true },
        { key: 'oh', label: 'report.threeWayForecast.report.overheadsRow', values: p.totalOverheads },
        { key: 'net', label: 'report.threeWayForecast.report.afterTax', values: p.netSurplusAfterTax, rule: true, signed: true }
      ]
      if (!this.isEvery) { return summary }
      const L = 'report.threeWayForecast.report.line.'
      const sub = (key, label, values) => ({ key, label: L + label, values, sub: true, signed: true })
      return [
        { key: 'rev', label: 'report.threeWayForecast.report.revenue', values: p.revenue, strong: true },
        sub('open-stock', 'openingStock', p.openingInventory),
        sub('purch', 'stockPurchased', p.purchases),
        sub('frt', 'freight', p.freight),
        sub('comm', 'commissions', p.commissions),
        sub('dir2', 'otherDirect', p.otherDirectTwo),
        sub('dirx', 'otherDirectExempt', p.otherDirectExpensesExempt),
        sub('close-stock', 'closingStock', p.closingInventory),
        { key: 'cos', label: L + 'costOfSales', values: p.costOfSales, rule: true, signed: true },
        { key: 'gross', label: 'report.threeWayForecast.report.grossSurplus', values: p.grossSurplus, strong: true, signed: true }
      ]
        // Only the overhead lines that carry a figure — Mike's ruling of 2026-09-05. The
        // engine holds 23 and a typical forecast uses about eight; fifteen rows of zeroes
        // would bury the eight that matter. What is hidden is counted under the table.
        .concat(this.overheadRows)
        .concat([
          { key: 'dep', label: L + 'depreciation', values: p.depreciation, sub: true, signed: true },
          { key: 'int-od', label: L + 'interestOverdraft', values: p.interestBankOverdraft, sub: true, signed: true },
          { key: 'int-loan', label: L + 'interestTermLoans', values: p.interestTermLoans, sub: true, signed: true },
          // Its own row at last. It was engine-only when the facility was built earlier the
          // same day, for want of anywhere on this screen to put it.
          { key: 'int-fac', label: L + 'interestFacilities', values: p.interestFacilities, sub: true, signed: true },
          { key: 'oh', label: 'report.threeWayForecast.report.overheadsRow', values: p.totalOverheads, rule: true },
          { key: 'op', label: L + 'operatingSurplus', values: p.operatingSurplus, strong: true, signed: true },
          sub('int-in', 'interestReceived', p.interestIncomeBank),
          sub('int-sh', 'shareholderInterest', p.interestIncomeShareholders),
          sub('gain', 'gainOnSale', p.gainOnAssetSales),
          sub('oi-1', 'otherIncome', p.otherIncomeGstInclusive),
          sub('oi-2', 'otherIncomeExempt', p.otherIncomeGstExempt),
          { key: 'toi', label: L + 'totalOtherIncome', values: p.totalOtherIncome, rule: true, signed: true },
          { key: 'pbt', label: L + 'beforeTax', values: p.netSurplusBeforeTax, strong: true, signed: true },
          sub('tax', 'tax', p.taxProvision),
          { key: 'net', label: 'report.threeWayForecast.report.afterTax', values: p.netSurplusAfterTax, rule: true, strong: true, signed: true }
        ])
    },

    /**
     * One row per overhead line that carries a figure, in the engine's own order.
     *
     * The label is the overhead's own i18n key, which the intake screen already uses for
     * the same 23 lines — one set of names, so a line cannot be called one thing where it
     * is entered and another where it is reported.
     *
     * @returns {Array<object>}
     */
    overheadRows () {
      const oh = this.data.profitAndLoss.overheads
      return Object.keys(oh)
        .filter(k => this.hasAFigure(oh[k]))
        .map(k => ({
          key: 'oh-' + k,
          label: 'report.threeWayForecast.assume.overheads.' + k,
          values: oh[k],
          sub: true,
          signed: true
        }))
    },

    balanceRows () {
      const b = this.data.balanceSheet.months
      const summary = [
        { key: 'ar', label: 'report.threeWayForecast.report.owedToYou', values: b.accountsReceivable },
        { key: 'stock', label: 'report.threeWayForecast.report.stockOnHand', values: b.inventory, impossibleBelowZero: true },
        { key: 'ap', label: 'report.threeWayForecast.report.youOwe', values: b.accountsPayable },
        { key: 'na', label: 'report.threeWayForecast.report.balanceCheck', values: b.balanceCheck, rule: true, signed: true }
      ]
      if (!this.isEvery) { return summary }
      const L = 'report.threeWayForecast.report.line.'
      const sub = (key, label, values, extra) => Object.assign(
        { key, label: L + label, values, sub: true, signed: true }, extra || {})
      // Each per-lender and per-facility row carries the NAME the advisor gave it, which is
      // not a translatable string — `rawLabel` is rendered as-is where it is present.
      const named = (prefix, list) => list.map((l, i) => ({
        key: prefix + i, rawLabel: l.name, values: l.balance, sub: true, signed: true
      }))
      return [
        sub('bank', 'bank', b.cashAtBank),
        { key: 'ar', label: 'report.threeWayForecast.report.owedToYou', values: b.accountsReceivable, sub: true },
        { key: 'stock', label: 'report.threeWayForecast.report.stockOnHand', values: b.inventory, sub: true, impossibleBelowZero: true },
        sub('gst-r', 'gstRefund', b.gstRefund),
        sub('tax-r', 'taxRefund', b.incomeTaxAsset),
        sub('prepay', 'prepayments', b.prepayments),
        sub('imp-pre', 'importPrepayments', b.importPrepayments),
        sub('sh-a', 'shareholderAssets', b.shareholderCurrentAssets),
        sub('oca', 'otherCurrentAsset', b.otherCurrentAsset),
        { key: 'tca', label: L + 'totalCurrentAssets', values: b.totalCurrentAssets, rule: true },
        sub('od', 'overdraft', b.bankOverdraft),
        { key: 'ap', label: 'report.threeWayForecast.report.youOwe', values: b.accountsPayable, sub: true },
        sub('gst-p', 'gstPayable', b.gstPayable),
        sub('tax-p', 'taxPayable', b.incomeTaxLiability),
        sub('accr', 'accruedExpenses', b.accruedExpenses),
        sub('imp-bal', 'importSupplierBalance', b.importSupplierBalance),
        sub('fac', 'facilities', b.totalFacilities),
        sub('sh-l', 'shareholderLiabilities', b.shareholderCurrentLiabilities),
        sub('ocl', 'otherCurrentLiability', b.otherCurrentLiability),
        { key: 'tcl', label: L + 'totalCurrentLiabilities', values: b.totalCurrentLiabilities, rule: true },
        { key: 'wc', label: L + 'workingCapital', values: b.workingCapital, strong: true, signed: true },
        sub('fa', 'fixedAssets', b.totalNonCurrentAssets)
      ]
        .concat(named('ncl-', b.nonCurrentLiabilities))
        .concat([
          sub('oncl', 'otherNonCurrentLiability', b.otherNonCurrentLiability),
          { key: 'net-a', label: L + 'netAssets', values: b.netAssets, rule: true, strong: true, signed: true },
          sub('cap', 'shareCapital', b.authorisedCapital),
          sub('cgain', 'capitalGain', b.capitalGain),
          sub('oeq', 'otherEquity', b.otherEquity),
          sub('re', 'retainedEarnings', b.retainedEarnings),
          { key: 'teq', label: L + 'totalEquity', values: b.totalEquity, rule: true, strong: true, signed: true },
          { key: 'na', label: 'report.threeWayForecast.report.balanceCheck', values: b.balanceCheck, rule: true, signed: true }
        ])
    },

    visibleRows () {
      if (!this.data) { return [] }
      if (this.tab === 'profit') { return this.profitRows }
      if (this.tab === 'balance') { return this.balanceRows }
      return this.cashRows
    },

    workingCapitalRows () {
      if (!this.data) { return [] }
      const b = this.data.balanceSheet.months
      return [
        { key: 'wc-ar', label: 'report.threeWayForecast.report.owedToYou', values: b.accountsReceivable },
        { key: 'wc-stock', label: 'report.threeWayForecast.report.stockOnHand', values: b.inventory, impossibleBelowZero: true },
        { key: 'wc-ap', label: 'report.threeWayForecast.report.youOwe', values: b.accountsPayable }
      ]
    },

    /**
     * The Coach panel — templated, as on every other model in this section. Each line is
     * a reading of a figure already on the screen, never a claim beyond it.
     */
    coachLines () {
      const d = this.data
      if (!d) { return [] }
      const lines = []
      const h = this.headline
      const overheadsPerMonth = d.profitAndLoss.totalOverheads.reduce((a, v) => a + v, 0) / 12
      if (h.closingCash < 0) {
        lines.push(this.$t('report.threeWayForecast.report.closingCashSub'))
      }
      lines.push(this.$t('report.threeWayForecast.report.grossMarginSub', { amount: this.money(h.grossSurplus) }) +
        ' — ' + this.pct(h.grossMarginPct) + ', ' + this.money(overheadsPerMonth) + ' of overheads a month.')
      if (this.stockOutMonths.length) {
        lines.push(this.$t('report.threeWayForecast.report.stockOutBody'))
      }
      return lines
    }
  },

  watch: {
    f: { deep: true, handler () { this.queueRecompute() } },
    /**
     * A new intake replaces the levers as well as the figures. Without this the two
     * absolute levers — mark-up and the month-after collection — would keep their opening
     * values and silently overwrite what the advisor confirmed on step 3, because
     * `payload()` writes both into every request.
     */
    seed: {
      handler (next) {
        this.f = this.leversFor(next)
        this.recompute()
      }
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * The four levers' opening positions. The two RELATIVE ones (sales and overheads)
     * always start at no change; the two ABSOLUTE ones read the confirmed intake, falling
     * back to the source workbook's own sample when the screen is computing that sample.
     * @param {object|null} seed - the confirmed intake inputs.
     * @returns {{salesShift:number, markup:number, debtorMonthAfter:number, overheadShift:number}}
     */
    leversFor (seed) {
      const markup = seed && typeof seed.markup === 'number' ? seed.markup * 100 : 68
      const profile = seed && Array.isArray(seed.debtorCollection) ? seed.debtorCollection : null
      const monthAfter = profile && typeof profile[1] === 'number' ? profile[1] * 100 : 55
      return {
        salesShift: 0,
        markup: Math.round(markup),
        debtorMonthAfter: Math.round(monthAfter),
        overheadShift: 0
      }
    },

    /** A whole-number percentage, in the reader's language. */
    pct (v) { return this.num(v, 1) + '%' },
    /** The same, with an explicit sign — a lever reads as a change, not a level. */
    signedPct (v) { return (v > 0 ? '+' : '') + this.num(v, 0) + '%' },

    /** One lever moved. `reportRecompute` owns the debounce and the race guard. */
    setField (key, value) {
      this.f = Object.assign({}, this.f, { [key]: Number(value) })
    },

    /**
     * Does this series carry a figure in any month?
     *
     * Rounded to the cent before the comparison: a line the advisor never touched can carry
     * floating-point dust rather than a clean zero, and a row reading "0" in all twelve
     * months is exactly the noise the hide-empties ruling exists to keep off the screen.
     *
     * @param {Array<number>} series @returns {boolean}
     */
    hasAFigure (series) {
      return Array.isArray(series) && series.some(v => Math.abs(v) >= 0.005)
    },

    /**
     * Red for a negative where a negative is merely bad, and the impossible class for a
     * stock balance below zero, which cannot happen at all.
     */
    cellClass (row, value) {
      if (row.impossibleBelowZero && value < 0) { return 'impossible' }
      if (row.signed && value < 0) { return 'neg' }
      return ''
    },

    print () {
      if (process.client) { window.print() }
    },

    /** The body the backend takes. Levers are applied to the seeded figures here. */
    payload () {
      const base = this.seed ? JSON.parse(JSON.stringify(this.seed)) : {}
      const salesFactor = 1 + (this.f.salesShift / 100)
      const overheadFactor = 1 + (this.f.overheadShift / 100)
      if (Array.isArray(base.sales)) {
        base.sales = base.sales.map(v => v * salesFactor)
      }
      if (base.overheads && typeof base.overheads === 'object') {
        const scaled = {}
        Object.keys(base.overheads).forEach((k) => { scaled[k] = base.overheads[k] * overheadFactor })
        base.overheads = scaled
      }
      base.markup = this.f.markup / 100
      // The remaining buckets keep their share, so the profile still totals 100%.
      const after = this.f.debtorMonthAfter / 100
      const current = Array.isArray(base.debtorCollection) ? base.debtorCollection.slice() : [0.1, 0.55, 0.3, 0.05, 0]
      const others = [current[0], current[2], current[3], current[4]]
      const othersTotal = others.reduce((a, v) => a + v, 0)
      const room = Math.max(0, 1 - after)
      base.debtorCollection = othersTotal === 0
        ? [room, after, 0, 0, 0]
        : [current[0], after, current[2], current[3], current[4]].map((v, i) => (i === 1 ? after : v * (room / othersTotal)))
      return base
    },

    recomputeRequest () {
      return { url: '/api/report/three-way-forecast', body: this.payload() }
    },

    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
/* Every value reads a --rs-* token from the shared ReportShell; nothing here declares a
   frame, palette, card or font of its own. See design/REPORT-VISUAL-STANDARD.md. */

/* [A] Root: ONE gap value, and the mandatory header-margin reset. */
.tw-root { display: flex; flex-direction: column; gap: 16px; }
.tw-root ::v-deep .rs-top { margin: 0; }

/* [D] Two-column body. */
.tw-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .tw-layout { grid-template-columns: 1fr; } }

/* Cards — no top edge; the shipped screens define none. */
.tw-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); box-shadow: var(--rs-shadow); }
.tw-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.tw-group:last-child { border-bottom: 0; }
.tw-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.tw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.tw-h2 { margin: 0; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }

/* [D2] Results column keeps the same 16px rhythm. */
.tw-results { display: flex; flex-direction: column; gap: 16px; min-height: 200px; }

.tw-tile { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); padding: 13px 14px; }
.tw-k { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.tw-v { font-size: 24px; font-weight: 600; letter-spacing: -.01em; margin-top: 6px; line-height: 1; font-variant-numeric: tabular-nums; }
.tw-v.is-crit { color: var(--rs-crit); }
.tw-v.is-good { color: var(--rs-good); }
.tw-sub { font-size: 12.5px; color: var(--rs-muted); margin-top: 6px; }
.tw-note { font-size: 11.5px; color: var(--rs-muted); margin: 10px 0 0; }

/* Stock below zero: named, not left as a figure among figures. The opening that does not
   balance gets the same band — one look, two different things it can be telling you. */
.tw-impossible, .tw-unbalanced {
  background: var(--rs-crit-soft); border: 1px solid #ff000045; border-left: 3px solid var(--rs-crit);
  border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 14px;
}
.tw-impossible b, .tw-unbalanced b { display: block; font-size: 13px; }
.tw-impossible span, .tw-unbalanced span { font-size: 12.5px; color: var(--rs-muted); }

/* Tabs over the three statements, with the Summary / Every line setting beside them. The
   row wraps rather than squashing: on a narrow screen the setting drops under the tabs. */
.tw-tabrow {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.tw-tabrow .tw-tabs { padding-right: 0; }
.seg-small {
  display: inline-flex; border: 1px solid var(--rs-line); border-radius: 9px;
  overflow: hidden; margin: 0 16px 6px 0;
}
.seg-small button {
  font: inherit; font-size: 12px; font-weight: 600; border: 0; background: var(--rs-panel);
  color: var(--rs-muted); padding: 6px 14px; cursor: pointer;
}
.seg-small button.on { background: var(--rs-accent); color: var(--rs-accent-contrast); }

/* A subtotal or a headline inside the full statement. Indent carries the hierarchy; the
   existing .rule already draws the line above a total. */
.is-strong td { font-weight: 600; }

.tw-tabs { display: flex; gap: 6px; padding: 14px 16px 0; }
.tw-tabs button {
  font: inherit; font-size: 12.5px; font-weight: 600; border: 1px solid var(--rs-line); border-bottom: 0;
  background: var(--rs-panel-2); color: var(--rs-muted); padding: 8px 14px; border-radius: 9px 9px 0 0; cursor: pointer;
}
.tw-tabs button.on { background: var(--rs-card-bg); color: var(--rs-ink); }
.tw-tabbody { border-top: 1px solid var(--rs-line); }

/* Twelve months never fit a narrow screen: the table scrolls inside its own box so the
   page body never scrolls sideways. */
.tw-tblwrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 900px; }
th, td { text-align: right; padding: 6px 7px; border-bottom: 1px solid var(--rs-line); font-variant-numeric: tabular-nums; white-space: nowrap; }
th:first-child, td:first-child { text-align: left; position: sticky; left: 0; background: var(--rs-card-bg); min-width: 190px; white-space: normal; }
th { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--rs-muted); font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
tr.rule td { border-top: 2px solid var(--rs-line); font-weight: 600; }
/* The five overseas rows sit UNDER Money out, indented, because they are part of it
   rather than beside it. Item 4.64. */
tr.is-sub td { color: var(--rs-muted); }
tr.is-sub td:first-child { padding-left: 22px; }
td.neg { color: var(--rs-crit); }
td.impossible { color: var(--rs-crit); background: var(--rs-crit-soft); font-weight: 600; }

/* [D2c] Coach panel. */
.tw-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.tw-edu-h { display: flex; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.tw-edu-p { margin: 0 0 8px; font-size: 14px; line-height: 1.6; }
.tw-edu-p:last-child { margin-bottom: 0; }
.tw-lead { background: var(--rs-accent); color: var(--rs-accent-contrast); font-size: 10px; font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 5px; }

/* [D2d] Actions. */
.tw-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tw-cta { font: inherit; font-weight: 600; font-size: 13.5px; color: var(--rs-accent-contrast); background: var(--rs-accent); border: 0; padding: 11px 18px; border-radius: 10px; cursor: pointer; }
.tw-ghost { background: transparent; color: var(--rs-ink); border: 1px solid var(--rs-line); }
.tw-foot { font-size: 12px; color: var(--rs-muted); }
@media print { .tw-actions, .tw-tabs { display: none !important; } }
</style>

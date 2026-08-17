<template lang="pug">
.mpa-root
  //- Decision class — NO "Illustrative" badge. Someone may buy a property on this output.
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.multipleProperty.title')"
    :client="$t('report.preparedFor')"
  )
  //- Ruled by Mike 2026-08-17 (design/MULTIPLE-PROPERTY-ASSESSMENT.md §8 Q1): the
  //- catalogue name is kept, and the screen says plainly how much of the model is in
  //- place, so an advisor is never shown a one-property screen that reads as a finished
  //- portfolio. Muted ink + the standard card border — no new colour, no new component.
  p.mpa-scope {{ $t('report.multipleProperty.scope') }}
  //- Decision class: seeded with the workbook sample until the advisor types the
  //- client's own figures — the same pattern as Lease vs Buy.
  sample-notice(:text="$t('report.sampleFigures')")

  //- Full-width headline band (owner ruling 2026-07-27): the HeroStrip spans the page
  //- above the two-column layout, never inside the results column.
  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )

    hero-strip(:columns="4" :stale="!!error")
      hero-figure(
        :label="$t('report.multipleProperty.hero.weekly')"
        :value="num(data.headline.weeklyCashPosition, 0)"
        :sub="$t('report.multipleProperty.hero.weeklySub')"
        :tone="toneOf(data.headline.weeklyCashPosition)"
      )
      hero-figure(
        :label="$t('report.multipleProperty.hero.debt')"
        :value="money(data.headline.totalDebt)"
        :sub="$t('report.multipleProperty.hero.debtSub')"
      )
      hero-figure(
        :label="$t('report.multipleProperty.hero.equity')"
        :value="money(data.headline.netEquityFinalYear)"
        :sub="$t('report.multipleProperty.hero.equitySub')"
        :tone="toneOf(data.headline.netEquityFinalYear)"
      )
      hero-figure(
        :label="$t('report.multipleProperty.hero.return')"
        :value="pct(data.headline.returnOnInvestorFundsFinalYear, 1)"
        :sub="$t('report.multipleProperty.hero.returnSub')"
        :tone="toneOf(data.headline.returnOnInvestorFundsFinalYear)"
      )

  //- House two-column layout: inputs left, results right; one column under 860px.
  .mpa-layout
    aside.mpa-inputs

      .mpa-card
        h2 {{ $t('report.multipleProperty.property.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.property.address') }}
          b-input(v-model="form.address" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.purchasePrice') }}
          b-input(v-model.number="form.purchasePrice" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.land') }}
          b-input(v-model.number="form.land" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.building') }}
          b-input(v-model.number="form.building" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.chattels') }}
          b-input(v-model.number="form.chattels" type="number" step="any" size="is-small")
        //- The workbook checks this itself (INPUTS G32, expected 0). A split that does
        //- not reconcile is stated, never silently absorbed into the maths.
        .mpa-reconcile(v-if="data" :class="{ 'is-bad': !data.purchasePriceSplit.reconciles }")
          | {{ data.purchasePriceSplit.reconciles
          | ? $t('report.multipleProperty.property.reconciles')
          | : $t('report.multipleProperty.property.doesNotReconcile', { amount: money(data.purchasePriceSplit.difference) }) }}
        .mpa-field
          label {{ $t('report.multipleProperty.property.rentPerWeek') }}
          b-input(v-model.number="form.rentPerWeek" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.vacancy') }}
          b-input(v-model.number="form.vacancyWeeks" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.taxRate') }}
          b-input(v-model.number="form.taxRatePct" type="number" step="any" size="is-small")

      .mpa-card
        h2 {{ $t('report.multipleProperty.costs.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.costs.accounting') }}
          b-input(v-model.number="form.accountingFees" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.managementFee') }}
          b-input(v-model.number="form.managementFeePct" type="number" step="any" size="is-small")
        //- The visible half of §6 rule 10: the fee no longer says "(plus GST)" and leaves
        //- the reader to guess. 7.5% with 15% GST is charged at 8.625%, and the model
        //- returns that figure precisely so the screen can show it.
        p.mpa-help(v-if="data") {{ $t('report.multipleProperty.costs.effectiveFee', { rate: pct(data.taxRules.effectiveManagementFeePct, 3) }) }}
        .mpa-field
          label {{ $t('report.multipleProperty.costs.insurance') }}
          b-input(v-model.number="form.insurance" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.rates') }}
          b-input(v-model.number="form.rates" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.bodyCorp') }}
          b-input(v-model.number="form.bodyCorp" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.repairs') }}
          b-input(v-model.number="form.repairs" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.other') }}
          b-input(v-model.number="form.other" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.purchaseCosts') }}
          b-input(v-model.number="form.purchaseCosts" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.setupCosts') }}
          b-input(v-model.number="form.setupCosts" type="number" step="any" size="is-small")

      .mpa-card
        h2 {{ $t('report.multipleProperty.assumptions.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.rentalGrowth') }}
          b-input(v-model.number="form.rentalGrowthPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.capitalGrowth') }}
          b-input(v-model.number="form.capitalGrowthPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.expenseInflation') }}
          b-input(v-model.number="form.expenseInflationPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.interestRateInflation') }}
          b-input(v-model.number="form.interestRateInflationPct" type="number" step="any" size="is-small")
        p.mpa-note {{ $t('report.multipleProperty.assumptions.note') }}

      //- The Tax rules card — ruled by Mike 2026-08-17 (§8 Q3 and Q5). These four rules
      //- were assumptions inside the workbook's formulas, never fields; every default
      //- below reproduces it exactly, so a firm that changes nothing sees what it saw.
      .mpa-card
        h2 {{ $t('report.multipleProperty.tax.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.addBack') }}
          b-select(v-model="form.yearOneAddBack" size="is-small")
            option(value="setup") {{ $t('report.multipleProperty.tax.addBackSetup') }}
            option(value="setupAndPurchase") {{ $t('report.multipleProperty.tax.addBackSetupAndPurchase') }}
            option(value="none") {{ $t('report.multipleProperty.tax.addBackNone') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.gst') }}
          b-input(v-model.number="form.managementFeeGstPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.tax.depreciable') }}
          b-select(v-model="form.depreciableAssets" size="is-small")
            option(value="chattels") {{ $t('report.multipleProperty.tax.depreciableChattels') }}
            option(value="chattelsAndBuilding") {{ $t('report.multipleProperty.tax.depreciableChattelsAndBuilding') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.method') }}
          b-select(v-model="form.depreciationMethod" size="is-small")
            option(value="dv") {{ $t('report.multipleProperty.tax.methodDv') }}
            option(value="sl") {{ $t('report.multipleProperty.tax.methodSl') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.rateChattels') }}
          b-input(v-model.number="form.depreciationRateChattelsPct" type="number" step="any" size="is-small")
        //- Ruled: a building rate appears only where the building may be depreciated
        //- (§8 Q5d). There is no honest default for it — it differs by country.
        .mpa-field(v-if="form.depreciableAssets === 'chattelsAndBuilding'")
          label {{ $t('report.multipleProperty.tax.rateBuilding') }}
          b-input(v-model.number="form.buildingDepreciationRatePct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.tax.losses') }}
          b-select(v-model="form.lossTreatment" size="is-small")
            option(value="ringFenced") {{ $t('report.multipleProperty.tax.lossesRingFenced') }}
            option(value="offset") {{ $t('report.multipleProperty.tax.lossesOffset') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.deductibility') }}
          b-select(v-model="form.interestDeductibility" size="is-small")
            option(value="Yes") {{ $t('report.multipleProperty.tax.deductibilityYes') }}
            option(value="No") {{ $t('report.multipleProperty.tax.deductibilityNo') }}
            option(value="Phasing") {{ $t('report.multipleProperty.tax.deductibilityPhasing') }}
        //- The phasing table behind a disclosure — the same information, not shown as
        //- five more boxes by default. Opening it is the reader's own action.
        a.mpa-disclosure(
          v-if="form.interestDeductibility === 'Phasing'"
          href="#"
          @click.prevent="showPhasing = !showPhasing")
          | {{ showPhasing ? '▾' : '▸' }} {{ $t('report.multipleProperty.tax.phasingToggle', { summary: phasingSummary }) }}
        template(v-if="showPhasing && form.interestDeductibility === 'Phasing'")
          .mpa-field(v-for="(v, i) in form.phasingPct" :key="'ph' + i")
            label {{ $t('report.multipleProperty.tax.phasingYear', { year: i + 1 }) }}
            b-input(v-model.number="form.phasingPct[i]" type="number" step="any" size="is-small")
        p.mpa-note {{ $t('report.multipleProperty.tax.note') }}

      .mpa-card
        h2 {{ $t('report.multipleProperty.funding.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.required') }}
          b-input(v-model.number="form.fundingRequired" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.interestOnly') }}
          b-input(v-model.number="form.interestOnlyLoan" type="number" step="any" size="is-small")
        //- Derived, never typed: INPUTS E69 = E65 − E68.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.principalAndInterest') }}
          span.mpa-derived {{ num(principalAndInterestLoan, 0) }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioTerm') }}
          b-input(v-model.number="form.interestOnlyTermYears" type="number" step="any" size="is-small")
        //- §6 rule 9, ruled by Mike: the advisor chooses what happens when the
        //- interest-only period ends, because the client decides it, not the model.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ending') }}
          b-select(v-model="form.endOfInterestOnly" size="is-small")
            option(value="convert") {{ $t('report.multipleProperty.funding.endingConvert') }}
            option(value="repay") {{ $t('report.multipleProperty.funding.endingRepay') }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioTotalTerm') }}
          b-input(v-model.number="form.interestOnlyTotalTermYears" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.piTerm') }}
          b-input(v-model.number="form.piTermYears" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioRate') }}
          b-input(v-model.number="form.interestOnlyRatePct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.piRate') }}
          b-input(v-model.number="form.piRatePct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.cashDeposit') }}
          b-input(v-model.number="form.cashDeposit" type="number" step="any" size="is-small")

    section.mpa-results
      template(v-if="data")
        .mpa-card(v-for="tbl in tables" :key="tbl.key")
          h2 {{ tbl.title }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th(v-for="y in data.years" :key="tbl.key + 'h' + y") {{ $t('report.multipleProperty.yearShort', { year: y }) }}
              tbody
                tr(v-for="row in tbl.rows" :key="tbl.key + row.label" :class="row.cls")
                  td {{ row.label }}
                  td(
                    v-for="(v, i) in row.values"
                    :key="tbl.key + row.label + i"
                    :class="cellClass(row, v)"
                  ) {{ cellText(row, v) }}

        //- [D2c] What the figures say, in the advisor's own words. Every sentence is
        //- built from the model's own output — nothing here is a fixed conclusion.
        .mpa-card
          h2 {{ $t('report.multipleProperty.coach.title') }}
          .mpa-coach
            p(v-for="(line, i) in coachLines" :key="'coach' + i") {{ line }}

      .mpa-card(v-if="!data && error")
        h2 {{ $t('report.calcFailedTitle') }}
        p.mpa-note {{ $t('report.calcUnreachable') }}
        b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
      .mpa-card(v-else-if="!data")
        p.mpa-note {{ $t('report.loading') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * MultiplePropertyAssessment — Phase 1 of the Multiple Property Assessment
 * (Valuation · Decision class): ONE investment property over ten years.
 *
 * The approved design artefact is `design/MULTIPLE-PROPERTY-ASSESSMENT.md` and
 * `design/mockups/multiple-property-assessment.html`; every difference between this
 * build and that mockup is named in §10 of the document, as `CLAUDE.md` requires.
 *
 * The advisor types the property, its costs, the assumptions, the tax rules and the
 * funding structure in the LEFT column; the RIGHT column shows the ten-year investment
 * summary, profit & loss, tax position and both loan schedules. All calculation is
 * backend-only (POST /api/report/multiple-property) — every figure rendered here comes
 * back from `server/report/multiplePropertyModel.js`.
 *
 * DECISION CLASS — no "Illustrative" badge. Someone may buy a property on this output.
 * Seeded with the workbook's own sample and flagged by SampleNotice until the advisor
 * types the client's figures.
 *
 * TWO THINGS THIS SCREEN MUST NOT DROP, both of them the visible half of a fix:
 *   1. The EFFECTIVE management fee ("charged at 8.625% with GST"). The 1.15 used to
 *      live inside the workbook's formula, so an advisor read 7.5% while the model
 *      charged 8.625% and nothing said so. Making the rate editable without showing
 *      what it costs would put the model back where it started (§6 rule 10).
 *   2. The tax rules in force. The model returns `taxRules` for exactly this, so a
 *      reader is never left to assume New Zealand (§8 Q6).
 *
 * Rates are held in display form (7.5, not 0.075) and converted to decimals in the
 * payload — the same convention as Lease vs Buy.
 */
export default {
  name: 'MultiplePropertyAssessment',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      // The workbook's own sample for the first property, rates in display form. Cell
      // references are documented in server/report/multiplePropertyModel.js.
      form: {
        address: '56 Big Deal Avenue, Goldentown',
        purchasePrice: 649000,
        land: 260000,
        building: 359168,
        chattels: 29832,
        rentPerWeek: 610,
        vacancyWeeks: 2,
        taxRatePct: 28,

        accountingFees: 1500,
        managementFeePct: 7.5,
        insurance: 3600,
        rates: 1850,
        bodyCorp: 1387.5,
        repairs: 500,
        other: 25,
        purchaseCosts: 2000,
        setupCosts: 1500,

        rentalGrowthPct: 3.5,
        capitalGrowthPct: 3,
        expenseInflationPct: 5,
        interestRateInflationPct: 0.1,

        yearOneAddBack: 'setup',
        managementFeeGstPct: 15,
        depreciableAssets: 'chattels',
        depreciationMethod: 'dv',
        depreciationRateChattelsPct: 28,
        buildingDepreciationRatePct: 0,
        lossTreatment: 'ringFenced',
        interestDeductibility: 'Phasing',
        phasingPct: [100, 75, 50, 25, 0],

        fundingRequired: 649000,
        interestOnlyLoan: 350000,
        interestOnlyTermYears: 8,
        endOfInterestOnly: 'convert',
        interestOnlyTotalTermYears: 30,
        piTermYears: 7,
        interestOnlyRatePct: 4,
        piRatePct: 4,
        cashDeposit: 315000
      },
      showPhasing: false,
      data: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  computed: {
    /** The P&I loan is what is left of the funding — derived, never typed (INPUTS E69). */
    principalAndInterestLoan () {
      return (Number(this.form.fundingRequired) || 0) - (Number(this.form.interestOnlyLoan) || 0)
    },

    /** The phasing series as one readable line for the closed disclosure. */
    phasingSummary () {
      return this.form.phasingPct.map(v => (Number(v) || 0) + '%').join(' / ')
    },

    /**
     * The four ten-year tables, as row descriptors rather than 60-odd lines of pug.
     * Each row carries its own label, values, format and emphasis, so the template has
     * one loop and the formatting rules have one definition.
     * @returns {Array<{key: string, title: string, rows: Array<object>}>}
     */
    tables () {
      if (!this.data) { return [] }
      return [
        { key: 'summary', title: this.$t('report.multipleProperty.summary.title'), rows: this.summaryRows },
        { key: 'pl', title: this.$t('report.multipleProperty.pl.title'), rows: this.plRows },
        { key: 'tax', title: this.$t('report.multipleProperty.taxTable.title'), rows: this.taxRows },
        { key: 'loans', title: this.$t('report.multipleProperty.loans.title'), rows: this.loanRows }
      ]
    },

    /** OUTPUTS rows 11–23, plus the Capital Introduced line added by §6 rule 9. */
    summaryRows () {
      const s = this.data.investmentSummary
      const t = k => this.$t('report.multipleProperty.summary.' + k)
      const rows = [
        { label: t('propertyValue'), values: s.propertyValue },
        { label: t('totalDebt'), values: s.totalDebt },
        { label: t('netEquity'), values: s.netEquity, cls: 'is-rule', tone: true },
        // OUTPUTS C18 — the deposit lands in year 1 and never again.
        { label: t('cashDeposit'), values: this.yearOneOnly(s.cashDeposit), blankZeros: true },
        { label: t('annualCashTopUp'), values: s.annualCashTopUp }
      ]
      // Ruled §5b: the line shows ONLY under the repay ending — under convert no capital
      // is introduced, so an empty row would invite the reader to look for one.
      if (this.data.endOfInterestOnly === 'repay') {
        rows.push({ label: t('capitalIntroduced'), values: s.capitalIntroduced, blankZeros: true })
      }
      rows.push(
        { label: t('cumulativeInvestorFunds'), values: s.cumulativeInvestorFunds, cls: 'is-rule' },
        { label: t('returnOnInvestorFunds'), values: s.returnOnInvestorFunds, fmt: 'pct', dp: 1, tone: true },
        { label: t('weeklyCashPosition'), values: s.weeklyCashPosition, cls: 'is-total', tone: true }
      )
      return rows
    },

    /** MODEL rows 10–31. */
    plRows () {
      const p = this.data.profitAndLoss
      const t = k => this.$t('report.multipleProperty.pl.' + k)
      return [
        { label: t('rental'), values: p.rental, cls: 'is-rule' },
        { label: t('accountingFees'), values: p.accountingFees },
        { label: t('managementFee'), values: p.managementFee },
        { label: t('insurance'), values: p.insurance },
        { label: t('rates'), values: p.rates },
        { label: t('bodyCorp'), values: p.bodyCorp },
        { label: t('purchaseCosts'), values: p.purchaseCosts, blankZeros: true },
        { label: t('setupCosts'), values: p.setupCosts, blankZeros: true },
        { label: t('repairs'), values: p.repairs },
        { label: t('other'), values: p.other },
        { label: t('interestInterestOnly'), values: p.interestInterestOnly },
        { label: t('interestPrincipalAndInterest'), values: p.interestPrincipalAndInterest },
        { label: t('totalExpenses'), values: p.totalExpenses, cls: 'is-total' },
        { label: t('netOperatingProfit'), values: p.netOperatingProfit, cls: 'is-rule', tone: true },
        { label: t('loanRepayments'), values: p.loanRepayments },
        { label: t('taxPayable'), values: p.taxPayable },
        { label: t('netCashPosition'), values: p.netCashPosition, cls: 'is-total', tone: true }
      ]
    },

    /**
     * MODEL rows 40–54. The carry-forward row names the Rental Losses setting in force
     * (§8 Q5f): "(Ring-Fenced)" is a claim about the rule, not a fixed part of the row.
     */
    taxRows () {
      const x = this.data.taxPosition
      const t = k => this.$t('report.multipleProperty.taxTable.' + k)
      const carryKey = this.data.taxRules.lossTreatment === 'offset'
        ? 'lossToCarryForwardOffset'
        : 'lossToCarryForwardRingFenced'
      return [
        { label: t('netOperatingProfit'), values: x.netOperatingProfit, tone: true },
        { label: t('depreciation'), values: x.depreciation },
        { label: t('addBackDeductibleInterest'), values: x.addBackDeductibleInterest },
        { label: t('taxableOperatingIncome'), values: x.taxableOperatingIncome, cls: 'is-rule', tone: true },
        { label: t('priorYearTaxLoss'), values: x.priorYearTaxLoss, tone: true, blankZeros: true },
        { label: t('netTaxableIncome'), values: x.netTaxableIncome, cls: 'is-rule', tone: true },
        { label: t('taxPayable'), values: x.taxPayable, cls: 'is-total', tone: true },
        { label: t(carryKey), values: x.lossToCarryForward, tone: true }
      ]
    },

    /** MODEL rows 60–72, plus the repayment row the converted loan needs (§6 rule 9). */
    loanRows () {
      const io = this.data.loans.interestOnly
      const pi = this.data.loans.principalAndInterest
      const t = k => this.$t('report.multipleProperty.loans.' + k)
      return [
        { label: t('ioBalance'), values: io.balance },
        { label: t('ioRepayment'), values: io.repayment, blankZeros: true },
        { label: t('ioInterest'), values: io.annualInterest },
        { label: t('ioRate'), values: io.rate, fmt: 'pct', dp: 3, cls: 'is-rule' },
        { label: t('piOpening'), values: pi.openingBalance },
        { label: t('piRepayment'), values: pi.repayment },
        { label: t('piInterest'), values: pi.annualInterest },
        { label: t('piRate'), values: pi.rate, fmt: 'pct', dp: 3 },
        { label: t('piClosing'), values: pi.closingBalance, cls: 'is-total' }
      ]
    },

    /**
     * What the figures say, in sentences.
     *
     * Every clause is chosen from the model's own output — the weekly cost, the year it
     * turns, the equity against the money put in, and when tax first bites. Nothing is
     * a fixed conclusion, so a different property gets a different reading.
     * @returns {string[]}
     */
    coachLines () {
      const t = (k, p) => this.$t('report.multipleProperty.coach.' + k, p)
      const weekly = this.data.investmentSummary.weeklyCashPosition
      const firstPositive = weekly.findIndex(v => v >= 0) // -1 when it never turns
      const lines = []

      if (weekly[0] >= 0) {
        lines.push(t('positiveFromStart', { amount: this.num(weekly[0], 0) }))
      } else if (firstPositive === -1) {
        lines.push(t('costsEveryYear', { amount: this.num(Math.abs(weekly[0]), 0) }))
      } else {
        lines.push(
          t('costsWeekly', { amount: this.num(Math.abs(weekly[0]), 0), years: firstPositive }) +
          ' ' + t('turnsPositive', { year: firstPositive + 1 })
        )
      }

      const last = this.data.years.length - 1
      const equity = this.data.investmentSummary.netEquity[last]
      const funds = this.data.investmentSummary.cumulativeInvestorFunds[last]
      const rate = this.data.headline.returnOnInvestorFundsFinalYear
      let second = t('equity', {
        equity: this.money(equity),
        funds: this.money(funds),
        rate: this.pct(rate, 1)
      })
      if (rate < 0) { second += ' ' + t('notPaidBack') }
      lines.push(second)

      const taxYear = this.data.profitAndLoss.taxPayable.findIndex(v => v > 0)
      const treatment = this.data.taxRules.lossTreatment === 'offset' ? t('offset') : t('ringFenced')
      lines.push((taxYear === -1 ? t('noTax') : t('taxFrom', { year: taxYear + 1 })) + ' ' + treatment)

      return lines
    }
  },

  watch: {
    form: {
      deep: true,
      handler () { this.queueRecompute() }
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * The backend request — consumed by the reportRecompute mixin (debounce, race
     * guard, stale flag). Display percentages become decimals here.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      const f = this.form
      const dec = v => (Number(v) || 0) / 100
      return {
        url: '/api/report/multiple-property',
        body: {
          address: f.address,
          taxRate: dec(f.taxRatePct),
          purchasePrice: f.purchasePrice,
          land: f.land,
          building: f.building,
          chattels: f.chattels,
          rentPerWeek: f.rentPerWeek,
          vacancyWeeks: f.vacancyWeeks,

          accountingFees: f.accountingFees,
          managementFeePct: dec(f.managementFeePct),
          insurance: f.insurance,
          rates: f.rates,
          bodyCorp: f.bodyCorp,
          purchaseCosts: f.purchaseCosts,
          setupCosts: f.setupCosts,
          repairs: f.repairs,
          other: f.other,

          rentalGrowth: dec(f.rentalGrowthPct),
          capitalGrowth: dec(f.capitalGrowthPct),
          expenseInflation: dec(f.expenseInflationPct),
          interestRateInflation: dec(f.interestRateInflationPct),

          yearOneAddBack: f.yearOneAddBack,
          managementFeeGstRate: dec(f.managementFeeGstPct),
          depreciableAssets: f.depreciableAssets,
          depreciationMethod: f.depreciationMethod,
          depreciationRateChattels: dec(f.depreciationRateChattelsPct),
          buildingDepreciationRate: dec(f.buildingDepreciationRatePct),
          lossTreatment: f.lossTreatment,
          interestDeductibility: f.interestDeductibility,
          phasingTable: f.phasingPct.map(dec),

          cashDeposit: f.cashDeposit,
          fundingRequired: f.fundingRequired,
          interestOnlyLoan: f.interestOnlyLoan,
          interestOnlyTermYears: f.interestOnlyTermYears,
          piTermYears: f.piTermYears,
          interestOnlyRate: dec(f.interestOnlyRatePct),
          piRate: dec(f.piRatePct),
          endOfInterestOnly: f.endOfInterestOnly,
          interestOnlyTotalTermYears: f.interestOnlyTotalTermYears
        }
      }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    },

    /**
     * A decimal rate as a percentage string, e.g. 0.08625 → "8.625%". The same helper
     * Cost of Capital carries; `num` (currencyMixin) does the locale formatting.
     * @param {number} v
     * @param {number} [dp=1]
     * @returns {string}
     */
    pct (v, dp) {
      const n = Number(v)
      const places = (dp === undefined || dp === null) ? 1 : dp
      return this.num((Number.isFinite(n) ? n : 0) * 100, places) + '%'
    },

    /**
     * The HeroFigure tone for a signed figure. A property costing the client $929 a
     * week must never look neutral (§5a).
     * @param {number} v
     * @returns {string}
     */
    toneOf (v) {
      if (!Number.isFinite(Number(v))) { return 'muted' }
      if (Number(v) < 0) { return 'crit' }
      return Number(v) > 0 ? 'good' : 'default'
    },

    /**
     * A figure that lands in year 1 and never again (the cash deposit), as a ten-year
     * row. Later years are null, not 0 — nothing happened, rather than nothing was paid.
     * @param {number} value
     * @returns {Array<number|null>}
     */
    yearOneOnly (value) {
      return this.data.years.map((_, i) => (i === 0 ? value : null))
    },

    /**
     * One cell's text. A row marked `blankZeros` renders 0 as a dash: the workbook
     * leaves those cells empty, and a column of zeros reads as a charge that was made.
     * @param {object} row
     * @param {number|null} v
     * @returns {string}
     */
    cellText (row, v) {
      if (v === null || v === undefined) { return '—' }
      if (row.blankZeros && Math.abs(Number(v)) < 0.005) { return '—' }
      if (row.fmt === 'pct') { return this.pct(v, row.dp) }
      return this.num(v, row.dp || 0)
    },

    /**
     * Red for a negative figure, green for a positive one — but only on the rows where
     * the sign is the point. Colouring every row would make none of them stand out.
     * @param {object} row
     * @param {number|null} v
     * @returns {string|null}
     */
    cellClass (row, v) {
      if (!row.tone || v === null || v === undefined) { return null }
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 0.005) { return null }
      return n < 0 ? 'is-neg' : 'is-pos'
    }
  }
}
</script>

<style scoped>
/* Root: flex column with ONE gap value (16px), so header→scope→band→layout and every
   card gap is the same number — the [A]–[D2d] anatomy in REPORT-LAYOUT-REFERENCE.html. */
.mpa-root { display: flex; flex-direction: column; gap: 16px; }
/* MANDATORY: reset the shared ReportHeader's `margin: 0 auto 22px`. In a flex column
   that auto margin shrinks the header below full width and doubles the header→band gap.
   Guarded by reportHeaderFullWidth.test.js. */
.mpa-root ::v-deep .rs-top { margin: 0; }

/* The scope line — muted ink and the standard card border, no new colour. */
.mpa-scope {
  align-self: flex-start; margin: 0;
  font-size: 12px; color: var(--rs-muted);
  border: 1px solid var(--rs-card-border); border-radius: 999px;
  padding: 3px 10px; background: var(--rs-panel-2);
}

/* House two-column grid — identical to every other model in this section. */
.mpa-layout {
  display: grid; grid-template-columns: var(--rs-col-input) 1fr;
  gap: var(--rs-col-gap); align-items: start;
}
@media (max-width: 860px) { .mpa-layout { grid-template-columns: 1fr; } }
.mpa-inputs { display: flex; flex-direction: column; gap: 16px; }
.mpa-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.mpa-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-top: 3px solid var(--rs-card-top);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad);
}
.mpa-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin-bottom: 12px;
}

.mpa-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 3px 0;
}
.mpa-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.mpa-field .control { width: 150px; flex: 0 0 auto; }
.mpa-derived {
  width: 150px; flex: 0 0 auto; text-align: right;
  font-size: 12.5px; font-weight: 600; color: var(--rs-ink);
}
.mpa-note { font-size: 11.5px; color: var(--rs-muted); margin: 10px 0 0; font-weight: 300; }
.mpa-help { font-size: 11.5px; color: var(--rs-muted); margin: 0 0 4px; font-weight: 300; font-style: italic; }
.mpa-disclosure { display: inline-block; margin-top: 8px; font-size: 12.5px; color: var(--rs-accent); }

.mpa-reconcile {
  margin: 10px 0; font-size: 12px; padding: 7px 10px; border-radius: 8px;
  background: var(--rs-good-soft); color: var(--rs-good);
}
.mpa-reconcile.is-bad { background: var(--rs-crit-soft); color: var(--rs-crit); }

/* Ten years do not fit a 740px column on a laptop: the table scrolls inside its card
   rather than the page scrolling sideways. */
.mpa-tablewrap { overflow-x: auto; }
.mpa-table { border-collapse: collapse; width: 100%; font-size: 12.5px; min-width: 640px; }
.mpa-table th, .mpa-table td {
  padding: 6px 8px; text-align: right; white-space: nowrap;
  border-bottom: 1px solid var(--rs-bg);
}
.mpa-table th {
  font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: var(--rs-muted);
}
.mpa-table th:first-child, .mpa-table td:first-child {
  text-align: left; color: var(--rs-ink); font-weight: 400;
}
.mpa-table tr.is-rule td { border-bottom: 1px solid var(--rs-card-border); }
.mpa-table tr.is-total td {
  font-weight: 600; border-top: 1px solid var(--rs-card-border); border-bottom: none;
}
.mpa-table td.is-neg { color: #c81e1e; }
.mpa-table td.is-pos { color: #2f7d32; }

.mpa-coach {
  background: var(--rs-panel-2); border-left: 3px solid var(--rs-accent);
  border-radius: 0 9px 9px 0; padding: 12px 14px; font-size: 13px; color: #23405f;
}
.mpa-coach p { margin: 0 0 10px; }
.mpa-coach p:last-child { margin-bottom: 0; }

.mpa-root .herostrip { margin-bottom: 0; }

@media print {
  /* On paper the inputs are dropped and the results run full width. */
  .mpa-inputs { display: none !important; }
  .mpa-layout { display: block; }
  .mpa-card { break-inside: avoid; }
}
</style>

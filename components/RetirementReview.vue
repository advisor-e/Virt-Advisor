<template lang="pug">
.rr-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.retirementReview.eyebrowClass')"
    :title="$t('report.retirementReview.title')"
    :client="$t('report.preparedFor')"
  )

  .rr-steps
    .rr-step(
      v-for="s in stepChips" :key="s.n"
      :class="{ active: step === s.n, done: step > s.n }"
      @click="goTo(s.n)")
      span.n {{ step > s.n ? '✓' : s.n }}
      | {{ s.label }}

  //- Decision class: the screen opens on the workbook's own sample so an adviser can see the
  //- model work before typing a client's affairs into it. It says so, because these figures
  //- carry no "Illustrative" badge — real client numbers and sample numbers look identical.
  sample-notice(:text="$t('report.sampleFigures')")

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
    template(v-if="data && step === 1")
      hero-figure(
        :label="$t('report.retirementReview.hero.incomeWanted')"
        :value="money(quick.monthlyIncomeRequired)"
        :sub="$t('report.retirementReview.hero.incomeWantedSub')")
      hero-figure(
        :label="$t('report.retirementReview.hero.lumpSum', { age: num(quick.answers.retirementAge) })"
        :value="money(quick.lumpSumRequired)"
        :sub="$t('report.retirementReview.hero.lumpSumSub', { years: form.quickCalculator.yearsOfIncomeRequired })")
      hero-figure(
        :label="$t('report.retirementReview.hero.mustSave')"
        :value="money(quick.monthlySavingsRequired)"
        :sub="$t('report.retirementReview.hero.mustSaveSub', { years: form.quickCalculator.yearsBeforeRetirement })")
      hero-figure(
        :label="$t('report.retirementReview.hero.savingNow')"
        :value="money(quick.answers.monthlySavings)"
        :sub="$t('report.retirementReview.hero.savingNowSub', { amount: money(Math.abs(quick.monthlySavingsShortfall)) })"
        :tone="quick.monthlySavingsShortfall > 0 ? 'crit' : 'good'")
    template(v-else-if="data && step === 2")
      hero-figure(
        :label="$t('report.retirementReview.hero.neededWeekly')"
        :value="money(data.position.weeklyIncomeRequired)"
        :sub="$t('report.retirementReview.hero.neededWeeklySub')")
      hero-figure(
        :label="$t('report.retirementReview.hero.totalAssets')"
        :value="money(data.position.totalAssets)"
        :sub="$t('report.retirementReview.hero.totalAssetsSub')")
      hero-figure(
        :label="$t('report.retirementReview.hero.totalDebt')"
        :value="money(data.position.totalDebts)"
        :sub="$t('report.retirementReview.hero.totalDebtSub', { count: propertyCount })")
      hero-figure(
        :label="$t('report.retirementReview.hero.netWorth')"
        :value="money(data.position.netWorth)"
        :sub="$t('report.retirementReview.hero.netWorthSub')"
        :tone="data.position.netWorth < 0 ? 'crit' : 'good'")
    template(v-else-if="data && step === 3")
      hero-figure(
        :label="$t('report.retirementReview.hero.propertiesWorth', { count: propertyCount })"
        :value="money(data.position.totalPropertyValue)"
        :sub="$t('report.retirementReview.hero.propertiesWorthSub')")
      hero-figure(
        :label="$t('report.retirementReview.hero.owing')"
        :value="money(data.position.totalPropertyDebt)"
        :sub="$t('report.retirementReview.hero.totalDebtSub', { count: propertyCount })")
      hero-figure(
        :label="$t('report.retirementReview.hero.rentMonthly')"
        :value="money(totalMonthlyRent)"
        :sub="$t('report.retirementReview.hero.rentMonthlySub')")
      hero-figure(
        :label="$t('report.retirementReview.hero.leftAfterMortgages')"
        :value="money(data.position.monthlyRentalSurplus)"
        :sub="$t('report.retirementReview.hero.leftAfterMortgagesSub')"
        :tone="data.position.monthlyRentalSurplus < 0 ? 'crit' : 'good'")
    template(v-else-if="data")
      hero-figure(
        :label="$t('report.retirementReview.hero.cashAtEnd', { year: yearCount })"
        :value="money(data.verdict.closingCash)"
        :sub="cashOutcomeSub"
        :tone="data.verdict.cashEverExhausted ? 'crit' : 'good'")
      hero-figure(
        :label="$t('report.retirementReview.hero.yearsShort')"
        :value="String(data.verdict.yearsInDeficit)"
        :sub="$t('report.retirementReview.hero.yearsShortSub')"
        :tone="data.verdict.yearsInDeficit ? 'crit' : 'default'")
      hero-figure(
        :label="$t('report.retirementReview.hero.lowestCash')"
        :value="money(lowestCash.amount)"
        :sub="$t('report.retirementReview.hero.lowestCashSub', { year: lowestCash.year })")
      hero-figure(
        :label="$t('report.retirementReview.hero.propertySold')"
        :value="money(totalSaleProceeds)"
        :sub="saleYearsSub")

  .rr-card(v-if="!data")
    p.rr-note {{ $t('report.loading') }}

  //- ─── Step 1 · the conversation ───────────────────────────────────────────
  template(v-else-if="step === 1")
    .rr-layout
      aside.rr-inputs
        .rr-card
          h2 {{ $t('report.retirementReview.conversation.meaningTitle') }}
          .rr-field
            label {{ $t('report.retirementReview.conversation.meaning') }}
            b-input(v-model="form.quickCalculator.retirementMeaning" type="textarea" rows="2" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.conversation.hateToGiveUp') }}
            b-input(v-model="form.quickCalculator.wouldHateToMiss" type="textarea" rows="2" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.conversation.lookingForwardTo') }}
            b-input(v-model="form.quickCalculator.lookingForwardTo" type="textarea" rows="2" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.conversation.provisions') }}
            b-input(v-model="form.quickCalculator.provisionsRemoveNeed" type="textarea" rows="2" size="is-small")
          p.rr-note {{ $t('report.retirementReview.conversation.freeTextHelp') }}

      section.rr-results
        .rr-card
          h2 {{ $t('report.retirementReview.conversation.numbersTitle') }}
          table.rr-mini
            tbody
              tr(v-for="f in quickFields" :key="f.key")
                td {{ f.label }}
                td.r
                  b-input(
                    v-model.number="form.quickCalculator[f.key]"
                    type="number" step="any" size="is-small")
              tr.rr-grouprow
                td(colspan="2") {{ $t('report.retirementReview.conversation.assumptions') }}
              tr(v-for="f in quickAssumptions" :key="f.key")
                td {{ f.label }}
                td.r
                  b-input(
                    v-model.number="form.quickCalculator[f.key]"
                    type="number" step="any" size="is-small")

        .rr-verdict(:class="{ short: quick.monthlySavingsShortfall > 0 }")
          h3 {{ gapTitle }}
          p {{ gapBody }}
          .rr-verdict-line
            div
              | {{ $t('report.retirementReview.conversation.gapNeeded') }}
              b {{ money(quick.lumpSumRequired) }}
            div
              | {{ $t('report.retirementReview.conversation.gapToSave') }}
              b {{ money(quick.monthlySavingsRequired) }}
            div
              | {{ $t('report.retirementReview.conversation.gapSavingToday') }}
              b {{ money(quick.answers.monthlySavings) }}
            div
              | {{ gapDirectionLabel }}
              b(:class="quick.monthlySavingsShortfall > 0 ? 'is-crit' : 'is-good'") {{ money(Math.abs(quick.monthlySavingsShortfall)) }}

        .rr-nav
          b-button(type="is-primary" size="is-small" @click="goTo(2)") {{ $t('report.retirementReview.nav.toPosition') }}
          b-button(size="is-small" @click="print") {{ $t('report.retirementReview.nav.finishHere') }}

  //- ─── Step 2 · what they have ─────────────────────────────────────────────
  template(v-else-if="step === 2")
    .rr-layout
      aside.rr-inputs
        .rr-card
          h2 {{ $t('report.retirementReview.position.needTitle') }}
          .rr-field
            label {{ $t('report.retirementReview.position.weeklyRequired') }}
            b-input(v-model.number="form.position.currentWeeklyIncomeRequired" type="number" step="any" size="is-small")
            p.rr-note {{ $t('report.retirementReview.position.weeklyRequiredHelp') }}
          .rr-field
            label {{ $t('report.retirementReview.position.inflation') }}
            .rr-quad
              b-input(
                v-for="(unused, i) in form.position.inflationPct" :key="'inf' + i"
                v-model.number="form.position.inflationPct[i]"
                type="number" step="any" size="is-small")
            p.rr-note {{ $t('report.retirementReview.position.inflationHelp') }}

        .rr-card
          h2 {{ $t('report.retirementReview.position.businessTitle') }}
          .rr-field
            label {{ $t('report.retirementReview.position.businessMonthly') }}
            b-input(v-model.number="form.position.business.monthlyIncome" type="number" step="any" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.position.businessYears') }}
            b-input(v-model.number="form.position.business.yearsExpected" type="number" step="any" size="is-small")
            p.rr-note {{ $t('report.retirementReview.position.businessYearsHelp') }}

        .rr-card
          h2 {{ $t('report.retirementReview.position.pensionTitle') }}
          .rr-field
            label {{ $t('report.retirementReview.position.pensionQualifies') }}
            b-select(v-model="form.position.pension.qualifies" size="is-small" expanded)
              option(:value="true") {{ $t('report.retirementReview.position.yes') }}
              option(:value="false") {{ $t('report.retirementReview.position.no') }}
          .rr-field
            label {{ $t('report.retirementReview.position.pensionWeekly') }}
            b-input(v-model.number="form.position.pension.weekly" type="number" step="any" size="is-small")
          .rr-pair
            .rr-field
              label {{ $t('report.retirementReview.position.pensionIncrease') }}
              b-input(v-model.number="form.position.pension.cpiAdjustmentPct" type="number" step="any" size="is-small")
            .rr-field
              label {{ $t('report.retirementReview.position.pensionTaxRate') }}
              b-input(v-model.number="form.position.pension.taxRatePct" type="number" step="any" size="is-small")
          p.rr-note {{ $t('report.retirementReview.position.pensionHelp', { amount: money2(data.position.pensionWeeklyNet) }) }}

      section.rr-results
        .rr-card
          .rr-card-h
            h2 {{ $t('report.retirementReview.position.accountsTitle') }}
            span.rr-sub {{ $t('report.retirementReview.position.accountsSub') }}
          .rr-scroll
            table.rr-grid
              thead
                tr
                  th {{ $t('report.retirementReview.position.account') }}
                  th.r {{ $t('report.retirementReview.position.balanceNow') }}
                  th.r {{ $t('report.retirementReview.position.returnRate') }}
                  th.r {{ $t('report.retirementReview.position.over') }}
                  th.r {{ $t('report.retirementReview.position.leftAtEnd') }}
                  th.r {{ $t('report.retirementReview.position.drawnMonthly') }}
              tbody
                tr(v-for="a in accountRows" :key="a.key")
                  td {{ a.label }}
                  td.r
                    b-input(v-model.number="form.position[a.key].balance" type="number" step="any" size="is-small")
                  td.r
                    b-input(v-model.number="form.position[a.key].ratePct" type="number" step="any" size="is-small")
                  td.r
                    b-input(v-model.number="form.position[a.key].termYears" type="number" step="any" size="is-small")
                  td.r
                    b-input(v-model.number="form.position[a.key].endBalance" type="number" step="any" size="is-small")
                  td.r.rr-num(:class="{ 'is-muted': a.displayOnly }") {{ money(a.drawn) }}
          p.rr-note {{ $t('report.retirementReview.position.cashFootnote') }}

        .rr-card
          h2 {{ $t('report.retirementReview.position.yearOneTitle') }}
          table.rr-mini
            tbody
              tr(v-for="row in yearOneIncome" :key="row.key")
                td {{ row.label }}
                td.r.rr-num(:class="{ 'is-crit': row.value < 0 }") {{ signedIfNegative(row.value) }}
              tr.rr-total
                td {{ $t('report.retirementReview.position.generated') }}
                td.r.rr-num {{ money(yearOneGenerated) }}
              tr
                td {{ $t('report.retirementReview.position.needed') }}
                td.r.rr-num {{ money(yearOneNeeded) }}
              tr.rr-total
                td {{ yearOneShort ? $t('report.retirementReview.position.shortBy') : $t('report.retirementReview.position.aheadBy') }}
                td.r.rr-num(:class="yearOneShort ? 'is-crit' : 'is-good'") {{ money(Math.abs(yearOneSurplus)) }}
          p.rr-note {{ perWeekLine }}

        .rr-card
          h2 {{ $t('report.retirementReview.position.taxTitle') }}
          table.rr-mini
            tbody
              tr
                td {{ $t('report.retirementReview.position.client1') }}
                td.r.rr-num {{ money(data.tax.client1Income) }}
              tr
                td {{ $t('report.retirementReview.position.spouse') }}
                td.r.rr-num {{ money(data.tax.spouseIncome) }}
              tr.rr-total
                td {{ $t('report.retirementReview.position.combinedIncome') }}
                td.r.rr-num {{ money(data.tax.combinedIncome) }}
              tr
                td {{ $t('report.retirementReview.position.taxOnIt') }}
                td.r.rr-num {{ money(data.tax.combinedTax) }}
              tr.rr-total
                td {{ $t('report.retirementReview.position.averageRate') }}
                td.r.rr-num {{ pct(data.tax.averageRate) }}
          p.rr-note {{ $t('report.retirementReview.position.taxHelp', { country: data.country, taxYear: data.taxYearLabel }) }}

        .rr-nav
          b-button(size="is-small" @click="goTo(1)") {{ $t('report.retirementReview.nav.back') }}
          b-button(type="is-primary" size="is-small" @click="goTo(3)") {{ $t('report.retirementReview.nav.toProperties') }}

  //- ─── Step 3 · the properties ─────────────────────────────────────────────
  template(v-else-if="step === 3")
    .rr-layout
      aside.rr-inputs
        //- THE PROPERTY LIST — the reader chooses which one to open. The same shape Mike
        //- approved on Multiple Property (2026-08-21) for the same problem: six properties
        //- drawn flat is a wall of boxes, and six cards that expand and collapse gave no
        //- sign they opened and no way to close them (his own finding, 2026-09-13).
        .rr-card
          h2
            | {{ $t('report.retirementReview.properties.listTitle') }}
            span.rr-h2sub {{ $t('report.retirementReview.properties.listSub') }}
          .rr-prow(
            v-for="(p, i) in form.position.properties"
            :key="'prow' + i"
            :class="{ 'is-sel': i === openProperty }"
            @click="openProperty = i")
            span.rr-pn {{ i + 1 }}
            span.rr-pa {{ p.name }}
            span.rr-pv {{ money(p.value) }}
            span.rr-tag(:class="typeClass(p.mortgageType)") {{ typeLabel(p.mortgageType) }}
          p.rr-note {{ $t('report.retirementReview.properties.listNote') }}

        //- The open property's own figures. Always present, so there is nothing to expand
        //- and nothing to collapse.
        .rr-card(v-if="openProp")
          .rr-card-h
            h2 {{ openProp.name }}
            span.rr-tag(:class="typeClass(openProp.mortgageType)") {{ typeLabel(openProp.mortgageType) }}
          .rr-field
            label {{ $t('report.retirementReview.properties.worth') }}
            b-input(v-model.number="openProp.value" type="number" step="any" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.properties.owing') }}
            b-input(v-model.number="openProp.debt" type="number" step="any" size="is-small")
          .rr-pair
            .rr-field
              label {{ $t('report.retirementReview.properties.rate') }}
              b-input(v-model.number="openProp.ratePct" type="number" step="any" size="is-small")
            .rr-field
              label {{ $t('report.retirementReview.properties.termYears') }}
              b-input(v-model.number="openProp.termYears" type="number" step="any" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.properties.mortgageType') }}
            b-select(v-model="openProp.mortgageType" size="is-small" expanded)
              option(v-for="t in mortgageTypes" :key="t" :value="t") {{ typeLabel(t) }}
          .rr-field
            label {{ $t('report.retirementReview.properties.monthlyRent') }}
            b-input(v-model.number="openProp.monthlyRent" type="number" step="any" size="is-small")
          .rr-pair
            .rr-field
              label {{ $t('report.retirementReview.properties.growth') }}
              b-input(v-model.number="openProp.growthRatePct" type="number" step="any" size="is-small")
            .rr-field
              label {{ $t('report.retirementReview.properties.rentGrowth') }}
              b-input(v-model.number="openProp.rentGrowthRatePct" type="number" step="any" size="is-small")
          .rr-field
            label {{ $t('report.retirementReview.properties.soldInYear') }}
            b-select(v-model="openProp.sellInYear" size="is-small" expanded)
              option(:value="null") {{ $t('report.retirementReview.properties.notSold') }}
              option(v-for="y in yearCount" :key="'y' + y" :value="y") {{ $t('report.retirementReview.properties.yearN', { n: y }) }}
            p.rr-note {{ $t('report.retirementReview.properties.soldHelp') }}

      section.rr-results
        .rr-card
          h2 {{ $t('report.retirementReview.properties.tableTitleN', { count: propertyCount }) }}
          .rr-scroll
            table.rr-grid
              thead
                tr
                  th {{ $t('report.retirementReview.properties.colProperty') }}
                  th.r {{ $t('report.retirementReview.properties.colWorth') }}
                  th.r {{ $t('report.retirementReview.properties.colOwing') }}
                  th {{ $t('report.retirementReview.properties.colMortgage') }}
                  th.r {{ $t('report.retirementReview.properties.colRent') }}
                  th.r {{ $t('report.retirementReview.properties.colMortgageCost') }}
                  th.r {{ $t('report.retirementReview.properties.colLeftOver') }}
                  th {{ $t('report.retirementReview.properties.colSold') }}
              tbody
                tr(v-for="(p, i) in data.position.properties" :key="'row' + i")
                  td {{ p.name }}
                  td.r.rr-num {{ money(p.value) }}
                  td.r.rr-num {{ money(p.debt) }}
                  td
                    span.rr-tag(:class="typeClass(p.mortgageType)") {{ typeLabel(p.mortgageType) }}
                  td.r.rr-num {{ money(p.monthlyRent) }}
                  td.r.rr-num {{ money(p.monthlyMortgagePayment) }}
                  td.r.rr-num(:class="p.monthlyRentalSurplus < 0 ? 'is-crit' : 'is-good'") {{ signedIfNegative(p.monthlyRentalSurplus) }}
                  td
                    span.rr-tag.is-sell(v-if="soldYearOf(i)") {{ $t('report.retirementReview.properties.yearN', { n: soldYearOf(i) }) }}
                    span.is-muted(v-else) —
                tr.rr-total
                  td {{ $t('report.retirementReview.properties.totalRow', { count: propertyCount }) }}
                  td.r.rr-num {{ money(data.position.totalPropertyValue) }}
                  td.r.rr-num {{ money(data.position.totalPropertyDebt) }}
                  td
                  td.r.rr-num {{ money(totalMonthlyRent) }}
                  td.r.rr-num {{ money(totalMonthlyMortgage) }}
                  td.r.rr-num(:class="data.position.monthlyRentalSurplus < 0 ? 'is-crit' : 'is-good'") {{ signedIfNegative(data.position.monthlyRentalSurplus) }}
                  td
          p.rr-note {{ propertyFootnote }}

        .rr-card
          h2 {{ $t('report.retirementReview.properties.typesTitle') }}
          table.rr-mini
            tbody
              tr
                td
                  span.rr-tag.is-io {{ $t('report.retirementReview.properties.typeInterestOnly') }}
                td.is-prose {{ $t('report.retirementReview.properties.typesInterestOnly') }}
              tr
                td
                  span.rr-tag.is-tb {{ $t('report.retirementReview.properties.typeTable') }}
                td.is-prose {{ $t('report.retirementReview.properties.typesTable') }}
              tr
                td
                  span.rr-tag.is-rd {{ $t('report.retirementReview.properties.typeReducing') }}
                td.is-prose {{ $t('report.retirementReview.properties.typesReducing') }}

        .rr-nav
          b-button(size="is-small" @click="goTo(2)") {{ $t('report.retirementReview.nav.back') }}
          b-button(type="is-primary" size="is-small" @click="goTo(4)") {{ $t('report.retirementReview.nav.toProjection') }}

  //- ─── Step 4 · the next twenty years ──────────────────────────────────────
  template(v-else)
    .rr-layout
      aside.rr-inputs
        .rr-card
          h2 {{ $t('report.retirementReview.projection.glanceTitle') }}
          table.rr-mini
            tbody
              tr
                td {{ $t('report.retirementReview.projection.neededWeekly') }}
                td.r.rr-num {{ money(data.projection.weeklyIncomeRequired[0]) }}
              tr
                td {{ $t('report.retirementReview.projection.generatedWeekly') }}
                td.r.rr-num {{ money(data.projection.weeklyIncomeGenerated[0]) }}
              tr.rr-total
                td {{ yearOneShort ? $t('report.retirementReview.projection.shortWeekly') : $t('report.retirementReview.projection.aheadWeekly') }}
                td.r.rr-num(:class="yearOneShort ? 'is-crit' : 'is-good'") {{ money(Math.abs(data.projection.weeklySurplus[0])) }}
              tr
                td {{ $t('report.retirementReview.projection.cashStart') }}
                td.r.rr-num {{ money(data.projection.cashOpening[0]) }}
              tr.rr-total
                td {{ $t('report.retirementReview.projection.cashEnd') }}
                td.r.rr-num {{ money(data.projection.cashClosing[0]) }}

      section.rr-results
        .rr-verdict(:class="{ short: data.verdict.cashEverExhausted }")
          h3 {{ verdictTitle }}
          p {{ verdictBody }}
          .rr-verdict-line
            div
              | {{ $t('report.retirementReview.projection.cashAtEnd', { year: yearCount }) }}
              b {{ money(data.verdict.closingCash) }}
            div
              | {{ $t('report.retirementReview.projection.yearsShort') }}
              b(:class="data.verdict.yearsInDeficit ? 'is-crit' : ''") {{ $t('report.retirementReview.projection.yearsShortValue', { deficit: data.verdict.yearsInDeficit, total: yearCount }) }}
            div
              | {{ $t('report.retirementReview.projection.lowestPoint') }}
              b {{ $t('report.retirementReview.projection.lowestPointValue', { amount: money(lowestCash.amount), year: lowestCash.year }) }}
            div
              | {{ $t('report.retirementReview.projection.runsOut') }}
              b(:class="data.verdict.cashEverExhausted ? 'is-crit' : 'is-good'") {{ runsOutValue }}

        .rr-card
          h2 {{ $t('report.retirementReview.projection.chartTitle') }}
          .rr-chart
            .rr-bar(v-for="b in chartBars" :key="'bar' + b.year")
              .rr-fill(:class="b.up ? 'up' : 'dn'" :style="{ height: b.height + '%' }")
              span.rr-yr {{ b.year }}
          .rr-legend
            span
              i.is-dn
              | {{ $t('report.retirementReview.projection.legendDown', { count: data.verdict.yearsInDeficit }) }}
            span
              i.is-up
              | {{ $t('report.retirementReview.projection.legendUp', { count: yearCount - data.verdict.yearsInDeficit }) }}
          p.rr-note {{ chartFootnote }}

        .rr-card
          .rr-card-h
            h2 {{ $t('report.retirementReview.projection.tableTitle') }}
            span.rr-sub {{ $t('report.retirementReview.projection.tableSub') }}
          .rr-scroll
            table.rr-grid
              thead
                tr
                  th {{ $t('report.retirementReview.projection.colYear') }}
                  th.r {{ $t('report.retirementReview.projection.colNeeded') }}
                  th.r {{ $t('report.retirementReview.projection.colGenerated') }}
                  th.r {{ $t('report.retirementReview.projection.colDifference') }}
                  th.r {{ $t('report.retirementReview.projection.colOverYear') }}
                  th.r {{ $t('report.retirementReview.projection.colCashEnd') }}
              tbody
                tr(v-for="row in projectionRows" :key="'yr' + row.year")
                  td
                    | {{ row.year }}
                    span.rr-tag.is-sell(v-for="n in row.sold" :key="n") {{ $t('report.retirementReview.projection.sold', { name: n }) }}
                  td.r.rr-num {{ money(row.needed) }}
                  td.r.rr-num {{ money(row.generated) }}
                  td.r.rr-num(:class="row.difference < 0 ? 'is-crit' : 'is-good'") {{ signedIfNegative(row.difference) }}
                  td.r.rr-num(:class="row.overYear < 0 ? 'is-crit' : 'is-good'") {{ signedIfNegative(row.overYear) }}
                  td.r.rr-num(:class="row.cashEnd < 0 ? 'is-crit' : ''") {{ signedIfNegative(row.cashEnd) }}

        .rr-card(v-if="data.workbookCorrections && data.workbookCorrections.length")
          h2 {{ $t('report.retirementReview.projection.correctionsTitle') }}
          p.rr-lead {{ $t('report.retirementReview.projection.correctionsLead') }}
          ul.rr-corrections
            li(v-for="c in data.workbookCorrections" :key="c.key")
              | {{ c.summary }}
              span.rr-cells {{ $t('report.retirementReview.projection.correctionRuled', { cells: c.cells, who: c.ruledBy, when: c.ruledOn }) }}
          p.rr-note {{ $t('report.retirementReview.projection.correctionsFootnote') }}

        .rr-nav
          b-button(size="is-small" @click="goTo(3)") {{ $t('report.retirementReview.nav.back') }}
          b-button(type="is-primary" size="is-small" @click="print") {{ $t('report.retirementReview.nav.print') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** The three mortgage types the model accepts — `MORTGAGE_TYPES` in the maths module. */
const MORTGAGE_TABLE = 'Table'
const MORTGAGE_REDUCING = 'Reducing'
const MORTGAGE_INTEREST_ONLY = 'Interest Only'

/**
 * RetirementReview — the Retirement Review screen (Valuation · Decision class).
 *
 * Four steps, because the source workbook has four visible sheets and they fall into four
 * conversations: the conversation, what they have, the properties, the next twenty years.
 * The stepped shape is the one Quick Position, EBITDA-DCF, the Loan Estimator and the High
 * Level Budget already use.
 *
 * DECISION class — the client's real household typed in, so NO "Illustrative" badge. It opens
 * on the workbook's own sample (as Multiple Property does) with a `SampleNotice` saying so,
 * because sample figures and a real client's figures look identical without one.
 *
 * All calculation is backend-only (POST /api/report/retirement-review); every figure rendered
 * comes back from the model. The screen holds no arithmetic of its own beyond totalling
 * columns the model already returns per property.
 *
 * Rates are held in DISPLAY form (per cent) and divided by 100 in the payload — the same
 * convention as Lease vs Buy and Multiple Property.
 *
 * SIX WORDING DECISIONS BY MIKE, 2026-09-13, from design/mockups/retirement-review.html, each
 * put to him separately with its alternatives:
 *
 *   1. The verdict reads "The plan holds — but it leans on selling N properties" — never a
 *      bare "The plan holds", which would be true and misleading in the same breath.
 *   2. Step 1 leads with the GAP ("The gap is $14,687 a month"), not the lump-sum target.
 *   3. The step names are plain English, not the workbook's sheet names.
 *   4. The property columns are Worth / Owing / Mortgage cost / Left over, not the
 *      workbook's Value / Debt / Servicing / Surplus.
 *   5. Step 1 stays INSIDE this model with a "Finish here" button, rather than becoming a
 *      second card in the Model Library — it shares no figure with the other three and an
 *      adviser can run it alone in a first meeting.
 *   6. The banner tile reads "Years spending more than they earn", not the code's own
 *      "years in deficit".
 */
export default {
  name: 'RetirementReview',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      step: 1,
      // Which property card is expanded on step 3. One at a time: six open cards in a 360px
      // column is a wall of boxes.
      openProperty: 0,
      // The workbook's own sample. Rates in display form — see the class comment.
      form: {
        quickCalculator: {
          retirementMeaning: 'Freedom',
          retirementAge: 65,
          householdMonthlyIncomeAfterTax: 12000,
          monthlySavings: 1000,
          bareMinimumMonthlyIncome: 6000,
          wouldHateToMiss: 'Sleep',
          desiredMonthlyIncome: 7500,
          lookingForwardTo: 'Golf',
          provisionsRemoveNeed: 'No',
          assetsToSellNetValue: 10000,
          returnRateInRetirementPct: 1.7,
          yearsOfIncomeRequired: 20,
          lumpSumToRetain: 8000,
          yearsBeforeRetirement: 7,
          returnRateWhileSavingPct: 4,
          kickStartLumpSum: 50
        },
        position: {
          currentWeeklyIncomeRequired: 1700,
          inflationPct: [12, 9, 11, 3],
          business: { monthlyIncome: 1500, yearsExpected: 6 },
          cash: { balance: 35000, ratePct: 4.5, termYears: 3, endBalance: 5000 },
          superannuation: { balance: 265000, ratePct: 4.5, termYears: 10, endBalance: 15000 },
          otherInvestments: { balance: 27500, ratePct: 4.5, termYears: 3, endBalance: 7500 },
          pension: { qualifies: true, weekly: 712, cpiAdjustmentPct: 3, taxRatePct: 14 },
          rentalIncomeTaxSplit: 0.5,
          properties: [
            { name: 'Home 1', value: 375000, debt: 300000, ratePct: 5, termYears: 15, monthlyRent: 1650, mortgageType: MORTGAGE_INTEREST_ONLY, endTermDebt: 0, growthRatePct: 4.95, rentGrowthRatePct: 5.5, sellInYear: null },
            { name: 'Home 2', value: 650000, debt: 312000, ratePct: 5.35, termYears: 15, monthlyRent: 2200, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRatePct: 4, rentGrowthRatePct: 4, sellInYear: 4 },
            { name: 'Home 3', value: 725000, debt: 285000, ratePct: 6.05, termYears: 14, monthlyRent: 2400, mortgageType: MORTGAGE_REDUCING, endTermDebt: 0, growthRatePct: 6, rentGrowthRatePct: 6, sellInYear: null },
            { name: 'Home 4', value: 489000, debt: 65000, ratePct: 5.65, termYears: 16, monthlyRent: 1650, mortgageType: MORTGAGE_INTEREST_ONLY, endTermDebt: 0, growthRatePct: 3.5, rentGrowthRatePct: 3.5, sellInYear: null },
            { name: 'Home 5', value: 562000, debt: 250000, ratePct: 5, termYears: 18, monthlyRent: 1900, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRatePct: 4.5, rentGrowthRatePct: 4.5, sellInYear: 15 },
            { name: 'Home 6', value: 635000, debt: 213456, ratePct: 5.45, termYears: 20, monthlyRent: 1850, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRatePct: 4, rentGrowthRatePct: 4, sellInYear: 17 }
          ]
        }
      },
      data: null
      // `error` (the stale flag) comes from the reportRecompute mixin.
    }
  },

  computed: {
    /** The four step chips, in order. */
    stepChips () {
      return [
        { n: 1, label: this.$t('report.retirementReview.steps.conversation') },
        { n: 2, label: this.$t('report.retirementReview.steps.position') },
        { n: 3, label: this.$t('report.retirementReview.steps.properties') },
        { n: 4, label: this.$t('report.retirementReview.steps.projection') }
      ]
    },

    /** The three mortgage types, for the picker. */
    mortgageTypes () {
      return [MORTGAGE_TABLE, MORTGAGE_REDUCING, MORTGAGE_INTEREST_ONLY]
    },

    /**
     * The open property's FORM object, bound directly so its fields are editable.
     * Never null once the form exists: `openProperty` is clamped to the list.
     */
    openProp () {
      const list = this.form.position.properties
      return list[this.openProperty] || list[0] || null
    },

    /** The Quick Calculator half of the response, or null before the first result lands. */
    quick () {
      return this.data ? this.data.quickCalculator : null
    },

    /** How many years the projection covers — read off the response, never assumed. */
    yearCount () {
      return this.data && this.data.years ? this.data.years.length : 0
    },

    /** How many properties the model actually took (it caps at six). */
    propertyCount () {
      return this.data ? this.data.position.properties.length : 0
    },

    /** The six typed figures on step 1, above the assumptions rule. */
    quickFields () {
      const t = k => this.$t('report.retirementReview.conversation.' + k)
      return [
        { key: 'retirementAge', label: t('retirementAge') },
        { key: 'householdMonthlyIncomeAfterTax', label: t('householdIncome') },
        { key: 'monthlySavings', label: t('savingNow') },
        { key: 'bareMinimumMonthlyIncome', label: t('bareMinimum') },
        { key: 'desiredMonthlyIncome', label: t('desiredIncome') },
        { key: 'assetsToSellNetValue', label: t('assetsToSell') }
      ]
    },

    /** The six assumptions below the rule on step 1. */
    quickAssumptions () {
      const t = k => this.$t('report.retirementReview.conversation.' + k)
      return [
        { key: 'yearsOfIncomeRequired', label: t('yearsOfIncome') },
        { key: 'returnRateInRetirementPct', label: t('returnInRetirement') },
        { key: 'lumpSumToRetain', label: t('lumpSumToRetain') },
        { key: 'yearsBeforeRetirement', label: t('yearsBefore') },
        { key: 'returnRateWhileSavingPct', label: t('returnWhileSaving') },
        { key: 'kickStartLumpSum', label: t('kickStart') }
      ]
    },

    /** Step 1's headline. Mike's ruling: lead with the gap, not the target. */
    gapTitle () {
      if (!this.quick) { return '' }
      if (this.quick.monthlySavingsShortfall <= 0) {
        return this.$t('report.retirementReview.conversation.gapOnTrackTitle')
      }
      return this.$t('report.retirementReview.conversation.gapTitle', {
        amount: this.money(this.quick.monthlySavingsShortfall)
      })
    },

    gapBody () {
      if (!this.quick) { return '' }
      const q = this.quick
      return this.$t('report.retirementReview.conversation.gapBody', {
        income: this.money(q.monthlyIncomeRequired),
        years: this.form.quickCalculator.yearsOfIncomeRequired,
        retain: this.money(this.form.quickCalculator.lumpSumToRetain),
        lumpSum: this.money(q.lumpSumRequired),
        age: this.num(q.answers.retirementAge),
        sell: this.money(q.answers.assetsToSellNetValue),
        target: this.money(q.savingsTarget),
        saveYears: this.form.quickCalculator.yearsBeforeRetirement,
        required: this.money(q.monthlySavingsRequired),
        actual: this.money(q.answers.monthlySavings)
      })
    },

    gapDirectionLabel () {
      const k = this.quick && this.quick.monthlySavingsShortfall <= 0 ? 'gapAheadBy' : 'gapShortBy'
      return this.$t('report.retirementReview.conversation.' + k)
    },

    /** The three drawdown accounts on step 2, with the monthly figure the model computed. */
    accountRows () {
      if (!this.data) { return [] }
      const t = k => this.$t('report.retirementReview.position.' + k)
      return [
        // Cash's monthly figure is display-only: the model computes it and the projection
        // never reads it, because the cash account is what absorbs every surplus.
        { key: 'cash', label: t('cash'), drawn: this.data.position.cashMonthlyWithdrawal, displayOnly: true },
        { key: 'superannuation', label: t('superannuation'), drawn: this.data.position.superMonthlyWithdrawal, displayOnly: false },
        { key: 'otherInvestments', label: t('otherInvestments'), drawn: this.data.position.otherMonthlyWithdrawal, displayOnly: false }
      ]
    },

    /** Year one's income, stream by stream, as the projection has it. */
    yearOneIncome () {
      if (!this.data) { return [] }
      const p = this.data.projection
      const t = k => this.$t('report.retirementReview.position.' + k)
      return [
        { key: 'business', label: t('businessAfterTax'), value: p.businessIncome[0] },
        { key: 'super', label: t('superDrawdown'), value: p.superIncome[0] },
        { key: 'pension', label: t('pensionAfterTax'), value: p.pensionIncome[0] },
        { key: 'other', label: t('otherIncome'), value: p.otherInvestmentIncome[0] },
        { key: 'rent', label: t('rentAfterEverything'), value: p.netRentalIncome[0] }
      ]
    },

    yearOneGenerated () {
      return this.data ? this.data.projection.annualIncomeGenerated[0] : 0
    },

    yearOneNeeded () {
      return this.data ? this.data.projection.annualIncomeRequired[0] : 0
    },

    yearOneSurplus () {
      return this.data ? this.data.projection.annualSurplus[0] : 0
    },

    yearOneShort () {
      return this.yearOneSurplus < 0
    },

    perWeekLine () {
      if (!this.data) { return '' }
      const p = this.data.projection
      return this.$t('report.retirementReview.position.perWeek', {
        generated: this.money(p.weeklyIncomeGenerated[0]),
        needed: this.money(p.weeklyIncomeRequired[0]),
        verb: this.$t('report.retirementReview.position.' + (this.yearOneShort ? 'perWeekShort' : 'perWeekAhead')),
        amount: this.money(Math.abs(p.weeklySurplus[0]))
      })
    },

    totalMonthlyRent () {
      if (!this.data) { return 0 }
      return this.data.position.properties.reduce((s, p) => s + p.monthlyRent, 0)
    },

    totalMonthlyMortgage () {
      if (!this.data) { return 0 }
      return this.data.position.properties.reduce((s, p) => s + p.monthlyMortgagePayment, 0)
    },

    /** How many properties cost more than they bring in — the footnote under the table. */
    propertyFootnote () {
      if (!this.data) { return '' }
      const losing = this.data.position.properties.filter(p => p.monthlyRentalSurplus < 0).length
      if (!losing) { return this.$t('report.retirementReview.properties.tableFootnoteNone') }
      return this.$t('report.retirementReview.properties.tableFootnote', {
        count: losing, total: this.propertyCount
      })
    },

    /** The lowest the cash account gets, and the year it happens. */
    lowestCash () {
      if (!this.data) { return { amount: 0, year: 0 } }
      const series = this.data.projection.cashClosing
      let at = 0
      series.forEach((v, i) => { if (v < series[at]) { at = i } })
      return { amount: series[at], year: at + 1 }
    },

    totalSaleProceeds () {
      if (!this.data) { return 0 }
      return this.data.projection.saleProceeds.reduce((s, v) => s + v, 0)
    },

    /** Which years a property is sold in, one-based. */
    saleYears () {
      if (!this.data) { return [] }
      return this.data.projection.saleProceeds
        .map((v, i) => (v ? i + 1 : null))
        .filter(y => y !== null)
    },

    saleYearsSub () {
      if (!this.saleYears.length) {
        return this.$t('report.retirementReview.hero.propertySoldNone')
      }
      return this.$t('report.retirementReview.hero.propertySoldSub', { years: this.saleYears.join(', ') })
    },

    cashOutcomeSub () {
      if (!this.data) { return '' }
      return this.data.verdict.cashEverExhausted
        ? this.$t('report.retirementReview.hero.cashAtEndRunsOut', { year: this.data.verdict.firstYearCashExhausted })
        : this.$t('report.retirementReview.hero.cashAtEndNever')
    },

    runsOutValue () {
      if (!this.data) { return '' }
      return this.data.verdict.cashEverExhausted
        ? this.$t('report.retirementReview.projection.runsOutYear', { year: this.data.verdict.firstYearCashExhausted })
        : this.$t('report.retirementReview.projection.runsOutNever')
    },

    /**
     * The verdict headline. Mike's ruling 2026-09-13: never a bare "The plan holds" when the
     * plan only holds because properties are sold.
     */
    verdictTitle () {
      if (!this.data) { return '' }
      const t = 'report.retirementReview.projection.'
      if (this.data.verdict.cashEverExhausted) {
        return this.$t(t + 'verdictRunsOutTitle', { year: this.data.verdict.firstYearCashExhausted })
      }
      if (!this.saleYears.length) { return this.$t(t + 'verdictHoldsNoSaleTitle') }
      if (this.saleYears.length === 1) { return this.$t(t + 'verdictHoldsOneTitle') }
      return this.$t(t + 'verdictHoldsTitle', { count: this.saleYears.length })
    },

    verdictBody () {
      if (!this.data) { return '' }
      const t = 'report.retirementReview.projection.'
      const v = this.data.verdict
      const shared = {
        year: this.yearCount,
        closing: this.money(v.closingCash),
        deficit: v.yearsInDeficit,
        total: this.yearCount,
        lowest: this.money(this.lowestCash.amount),
        lowestYear: this.lowestCash.year
      }
      if (v.cashEverExhausted) {
        return this.$t(t + 'verdictRunsOutBody', Object.assign({}, shared, { year: v.firstYearCashExhausted }))
      }
      return this.$t(t + (this.saleYears.length ? 'verdictHoldsBody' : 'verdictHoldsNoSaleBody'), shared)
    },

    /** The bars, to scale against the largest year in either direction. */
    chartBars () {
      if (!this.data) { return [] }
      const series = this.data.projection.annualSurplus
      const max = series.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
      return series.map((v, i) => ({
        year: i + 1,
        up: v >= 0,
        height: Math.round((Math.abs(v) / max) * 100)
      }))
    },

    chartFootnote () {
      if (!this.data) { return '' }
      const series = this.data.projection.annualSurplus
      let worst = 0
      series.forEach((v, i) => { if (v < series[worst]) { worst = i } })
      const turn = series.findIndex(v => v >= 0)
      const scale = series.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
      const t = 'report.retirementReview.projection.'
      const shared = {
        worstYear: worst + 1,
        worst: this.signedIfNegative(series[worst]),
        scale: this.money(scale)
      }
      if (turn === -1) { return this.$t(t + 'chartFootnoteNoTurn', shared) }
      return this.$t(t + 'chartFootnote', Object.assign({}, shared, { turnYear: turn + 1 }))
    },

    /** One row per projected year, with the names of any property sold in it. */
    projectionRows () {
      if (!this.data) { return [] }
      const p = this.data.projection
      return this.data.years.map((year, i) => ({
        year,
        sold: this.soldNamesIn(year),
        needed: p.weeklyIncomeRequired[i],
        generated: p.weeklyIncomeGenerated[i],
        difference: p.weeklySurplus[i],
        overYear: p.annualSurplus[i],
        cashEnd: p.cashClosing[i]
      }))
    }
  },

  watch: {
    form: { handler () { this.queueRecompute() }, deep: true }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /** The POST this screen recomputes with — consumed by the reportRecompute mixin. */
    recomputeRequest () {
      const q = this.form.quickCalculator
      const pos = this.form.position
      const acct = a => ({
        balance: a.balance,
        rate: this.rate(a.ratePct),
        termYears: a.termYears,
        endBalance: a.endBalance
      })
      return {
        url: '/api/report/retirement-review',
        body: {
          quickCalculator: {
            retirementMeaning: q.retirementMeaning,
            retirementAge: q.retirementAge,
            householdMonthlyIncomeAfterTax: q.householdMonthlyIncomeAfterTax,
            monthlySavings: q.monthlySavings,
            bareMinimumMonthlyIncome: q.bareMinimumMonthlyIncome,
            wouldHateToMiss: q.wouldHateToMiss,
            desiredMonthlyIncome: q.desiredMonthlyIncome,
            lookingForwardTo: q.lookingForwardTo,
            provisionsRemoveNeed: q.provisionsRemoveNeed,
            assetsToSellNetValue: q.assetsToSellNetValue,
            returnRateInRetirement: this.rate(q.returnRateInRetirementPct),
            yearsOfIncomeRequired: q.yearsOfIncomeRequired,
            lumpSumToRetain: q.lumpSumToRetain,
            yearsBeforeRetirement: q.yearsBeforeRetirement,
            returnRateWhileSaving: this.rate(q.returnRateWhileSavingPct),
            kickStartLumpSum: q.kickStartLumpSum
          },
          position: {
            currentWeeklyIncomeRequired: pos.currentWeeklyIncomeRequired,
            inflation: pos.inflationPct.map(v => this.rate(v)),
            business: { monthlyIncome: pos.business.monthlyIncome, yearsExpected: pos.business.yearsExpected },
            cash: acct(pos.cash),
            superannuation: acct(pos.superannuation),
            otherInvestments: acct(pos.otherInvestments),
            pension: {
              qualifies: pos.pension.qualifies,
              weekly: pos.pension.weekly,
              cpiAdjustment: this.rate(pos.pension.cpiAdjustmentPct),
              taxRate: this.rate(pos.pension.taxRatePct)
            },
            rentalIncomeTaxSplit: pos.rentalIncomeTaxSplit,
            properties: pos.properties.map(p => ({
              name: p.name,
              value: p.value,
              debt: p.debt,
              rate: this.rate(p.ratePct),
              termYears: p.termYears,
              monthlyRent: p.monthlyRent,
              mortgageType: p.mortgageType,
              endTermDebt: p.endTermDebt,
              growthRate: this.rate(p.growthRatePct),
              rentGrowthRate: this.rate(p.rentGrowthRatePct),
              sellInYear: p.sellInYear
            }))
          }
        }
      }
    },

    /** Move to a step. */
    goTo (n) {
      this.step = n
    },

    /** A display percentage to the decimal the model expects. */
    rate (pct) {
      return Number(pct || 0) / 100
    },

    /** A decimal rate as a percentage, for display. */
    pct (value) {
      return (Number(value || 0) * 100).toFixed(2) + '%'
    },

    /**
     * Money, with a minus sign where the figure is negative and none where it is not.
     * A "+" on a positive figure reads as a change rather than a level, which is how a
     * green "+$0" once announced good news on an empty High Level Budget.
     */
    signedIfNegative (value) {
      const n = Number(value || 0)
      return n < 0 ? '−' + this.money(Math.abs(n)) : this.money(n)
    },

    typeLabel (type) {
      if (type === MORTGAGE_TABLE) { return this.$t('report.retirementReview.properties.typeTable') }
      if (type === MORTGAGE_REDUCING) { return this.$t('report.retirementReview.properties.typeReducing') }
      return this.$t('report.retirementReview.properties.typeInterestOnly')
    },

    typeClass (type) {
      if (type === MORTGAGE_TABLE) { return 'is-tb' }
      if (type === MORTGAGE_REDUCING) { return 'is-rd' }
      return 'is-io'
    },

    /** The year property `i` is sold in, or null. Read off the form, which owns it. */
    soldYearOf (i) {
      const p = this.form.position.properties[i]
      return p ? p.sellInYear : null
    },

    /** The names of any properties sold in `year`. */
    soldNamesIn (year) {
      return this.form.position.properties
        .filter(p => p.sellInYear === year)
        .map(p => p.name)
    },

    /**
     * Hand the review to the browser's own print dialogue. Client-only: `window` does not
     * exist during server-side render, and this runs from a click, never at setup.
     */
    print () {
      if (process.client && typeof window !== 'undefined' && window.print) { window.print() }
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
.rr-root { display: flex; flex-direction: column; gap: 16px; }
/* [B] Reset the shared ReportHeader's `margin: 0 auto 22px`: inside a flex column that auto
   margin shrinks the header below full width and its 22px stacks on the flex gap. Guarded by
   reportHeaderFullWidth.test.js. */
.rr-root ::v-deep .rs-top { margin: 0; }

.rr-steps { display: flex; gap: 10px; flex-wrap: wrap; }
.rr-step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.rr-step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line);
  color: var(--rs-ink); font-size: 11px;
}
.rr-step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.rr-step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.rr-step.done { color: var(--rs-good); }
.rr-step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }

/* [D] House two-column grid, collapsing at the standard breakpoint. */
.rr-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .rr-layout { grid-template-columns: 1fr; } }
.rr-inputs, .rr-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* Cards read the shared tokens and declare no palette of their own. NO top edge — RULED
   2026-08-31, consistency wins (see REPORT-VISUAL-STANDARD.md). */
.rr-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad); min-width: 0;
}
.rr-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin: 0 0 12px;
}
.rr-card-h { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.rr-card-h h2 { margin: 0 0 12px; }
.rr-sub { font-size: 12px; color: var(--rs-muted); }
.rr-lead { font-size: 13px; margin: 0 0 10px; }
.rr-note { font-size: 12px; color: var(--rs-muted); line-height: 1.45; margin: 8px 0 0; }

.rr-field { margin-bottom: 14px; }
.rr-field:last-child { margin-bottom: 0; }
.rr-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; }
.rr-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rr-quad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* The property list. Read off Multiple Property's `.mpa-prow`, which solves the same
   problem on the report next door — one row per property, the open one marked, and no
   expand/collapse concept at all. */
.rr-h2sub {
  display: block; margin-top: 4px; font-size: 11.5px; font-weight: 400;
  letter-spacing: 0; text-transform: none; color: var(--rs-muted);
}
.rr-prow {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px; border-radius: 9px; cursor: pointer;
  border: 1px solid transparent;
}
.rr-prow + .rr-prow { margin-top: 2px; }
.rr-prow .rr-pn { font-size: 11px; font-weight: 600; color: var(--rs-muted); min-width: 14px; }
.rr-prow .rr-pa {
  flex: 1; font-size: 12.5px; color: var(--rs-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rr-prow .rr-pv { font-size: 12.5px; color: var(--rs-muted); font-variant-numeric: tabular-nums; }
.rr-prow.is-sel { background: var(--rs-panel-2); border-color: var(--rs-card-border); }
.rr-prow.is-sel .rr-pn, .rr-prow.is-sel .rr-pa { color: var(--rs-ink); font-weight: 600; }

/* Entry boxes are sized to their content. Left to fill their cell they came out three times
   this width on the High Level Budget, and across many rows that is the difference between a
   table that scans and one that does not. */
.rr-grid ::v-deep .control, .rr-mini ::v-deep .control { max-width: 118px; margin-left: auto; }
.rr-grid ::v-deep input, .rr-mini ::v-deep input { text-align: right; }

table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
.rr-scroll { overflow-x: auto; }
.rr-scroll table { min-width: 620px; }
th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line);
}
th.r, td.r { text-align: right; }
td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--rs-line); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
.rr-num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.rr-grouprow td {
  background: var(--rs-panel-2); font-size: 10.5px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--rs-muted); font-weight: 700;
}
.rr-total td { border-top: 2px solid var(--rs-ink); font-weight: 700; }
.is-prose { font-weight: 400; }
.is-muted { color: var(--rs-muted); }
.is-crit { color: var(--rs-crit); }
.is-good { color: var(--rs-good); }

.rr-tag {
  display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .06em;
  border-radius: 4px; padding: 2px 7px; text-transform: uppercase; white-space: nowrap;
}
.rr-tag + .rr-tag, td .rr-tag { margin-left: 6px; }
.is-io { background: var(--rs-accent-soft); color: var(--rs-accent); }
.is-tb { background: var(--rs-good-soft); color: var(--rs-good); }
.is-rd { background: var(--rs-warn-soft); color: var(--rs-warn); }
.is-sell { background: var(--rs-panel-2); color: var(--rs-ink); }

/* The verdict panel — the one model-specific accent on this screen, per Part 2 of the
   visual standard ("a single model-specific accent where it earns its place"). */
.rr-verdict {
  border-radius: var(--rs-card-radius); padding: 18px 20px;
  border: 1px solid var(--rs-good); background: var(--rs-good-soft);
}
.rr-verdict.short { border-color: var(--rs-warn); background: var(--rs-warn-soft); }
.rr-verdict h3 { margin: 0 0 6px; font-size: 19px; font-weight: 600; color: var(--rs-ink); }
.rr-verdict p { margin: 0; font-size: 13.5px; color: var(--rs-muted); max-width: 70ch; }
.rr-verdict-line {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--rs-line);
  display: flex; gap: 26px; flex-wrap: wrap;
}
.rr-verdict-line div { font-size: 12.5px; color: var(--rs-muted); }
.rr-verdict-line b {
  display: block; font-size: 19px; font-weight: 400; font-variant-numeric: tabular-nums;
  color: var(--rs-ink); margin-top: 2px;
}
/* The tone must OUTRANK the line's own colour. `.is-crit` alone loses to `.rr-verdict-line b`
   on specificity, so the shortfall and the deficit count rendered in ink — the two figures the
   panel exists to flag were the two it did not flag. Found by opening the screen; no assertion
   in this suite could have seen it. */
.rr-verdict-line b.is-crit { color: var(--rs-crit); }
.rr-verdict-line b.is-good { color: var(--rs-good); }

.rr-chart { display: flex; align-items: flex-end; gap: 3px; height: 210px; padding-top: 8px; }
.rr-bar { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; position: relative; }
.rr-fill { border-radius: 2px 2px 0 0; min-height: 1px; }
.rr-fill.up { background: var(--rs-good); }
.rr-fill.dn { background: var(--rs-warn); }
.rr-yr { position: absolute; bottom: -17px; left: 0; right: 0; text-align: center; font-size: 9px; color: var(--rs-muted); }
.rr-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11.5px; color: var(--rs-muted); margin-top: 26px; }
.rr-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.rr-legend i.is-up { background: var(--rs-good); }
.rr-legend i.is-dn { background: var(--rs-warn); }

.rr-corrections { margin: 0; padding-left: 18px; font-size: 13px; }
.rr-corrections li { margin: 9px 0; }
.rr-cells { display: block; font-size: 11.5px; color: var(--rs-muted); margin-top: 2px; }

.rr-nav { display: flex; gap: 10px; flex-wrap: wrap; }
</style>

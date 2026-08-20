<template lang="pug">
.mpa-root
  //- Decision class — NO "Illustrative" badge. Someone may buy five properties on this.
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.multipleProperty.title')"
    :client="$t('report.preparedFor')"
  )
  //- The Phase 1 scope line ("Property 1 of 5 · the remaining four arrive in the next
  //- release") is GONE — build step P2-5. It was written to be deleted the day the other
  //- four arrived, and this is that day. It went from the catalogue row in the same change.
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
        :sub="$tc('report.multipleProperty.hero.weeklySub', propertyCount, { count: propertyCount })"
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

      //- ---- THE HOUSEHOLD — INPUTS rows 11–15 and the residence's own column ----
      .mpa-card
        h2 {{ $t('report.multipleProperty.household.title') }}
        .mpa-field
          label {{ $t('report.multipleProperty.household.residenceValue') }}
          b-input(v-model.number="household.residenceValue" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.household.homeMortgage') }}
          b-input(v-model.number="household.homeMortgage" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.household.totalSavings') }}
          b-input(v-model.number="household.totalSavings" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.household.residenceShare') }}
          b-input(v-model.number="household.residenceSharePct" type="number" step="any" size="is-small")
        //- Resolved by the tier cascade, never typed here (§8 Q10, §8 Q6's mechanism).
        //- Shown so the reader knows what the ratios are judged against — or that
        //- nothing is judging them, which is what a blank ceiling means.
        .mpa-field
          label {{ $t('report.multipleProperty.household.maxLvr') }}
          span.mpa-derived {{ maxLvrLabel }}
        p.mpa-note {{ $t('report.multipleProperty.household.note') }}

      //- ---- THE PROPERTY LIST — the reader chooses which one to open ----
      .mpa-card
        h2
          | {{ $t('report.multipleProperty.properties.title') }}
          span.mpa-h2sub {{ $t('report.multipleProperty.properties.sub') }}
        .mpa-prow(
          v-for="(p, i) in properties"
          :key="'prow' + i"
          :class="{ 'is-sel': i === selected }"
          @click="selected = i"
        )
          span.mpa-pn {{ i + 1 }}
          span.mpa-pa {{ p.address || $t('report.multipleProperty.properties.untitled', { n: i + 1 }) }}
          span.mpa-pv {{ num(p.purchasePrice, 0) }}
          a.mpa-px(
            v-if="properties.length > 1"
            href="#"
            :title="$t('report.multipleProperty.properties.remove')"
            @click.stop.prevent="removeProperty(i)"
          ) &times;
        a.mpa-padd(
          v-if="properties.length < maxProperties"
          href="#"
          @click.prevent="addProperty"
        ) {{ $t('report.multipleProperty.properties.add') }}
        p.mpa-note {{ $t('report.multipleProperty.properties.note') }}

      //- ---- TAX RULES — portfolio level. These are a country's rules and a family has
      //- one country (§11 Q11). Ruled by Mike 2026-08-17 (§8 Q3 and Q5); every default
      //- below reproduces the workbook exactly. ----
      .mpa-card
        h2
          | {{ $t('report.multipleProperty.tax.title') }}
          span.mpa-h2sub {{ $t('report.multipleProperty.tax.sub') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.addBack') }}
          b-select(v-model="taxRules.yearOneAddBack" size="is-small")
            option(value="setup") {{ $t('report.multipleProperty.tax.addBackSetup') }}
            option(value="setupAndPurchase") {{ $t('report.multipleProperty.tax.addBackSetupAndPurchase') }}
            option(value="none") {{ $t('report.multipleProperty.tax.addBackNone') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.gst') }}
          b-input(v-model.number="taxRules.managementFeeGstPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.tax.depreciable') }}
          b-select(v-model="taxRules.depreciableAssets" size="is-small")
            option(value="chattels") {{ $t('report.multipleProperty.tax.depreciableChattels') }}
            option(value="chattelsAndBuilding") {{ $t('report.multipleProperty.tax.depreciableChattelsAndBuilding') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.method') }}
          b-select(v-model="taxRules.depreciationMethod" size="is-small")
            option(value="dv") {{ $t('report.multipleProperty.tax.methodDv') }}
            option(value="sl") {{ $t('report.multipleProperty.tax.methodSl') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.rateChattels') }}
          b-input(v-model.number="taxRules.depreciationRateChattelsPct" type="number" step="any" size="is-small")
        //- Ruled: a building rate appears only where the building may be depreciated
        //- (§8 Q5d). There is no honest default for it — it differs by country.
        .mpa-field(v-if="taxRules.depreciableAssets === 'chattelsAndBuilding'")
          label {{ $t('report.multipleProperty.tax.rateBuilding') }}
          b-input(v-model.number="taxRules.buildingDepreciationRatePct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.tax.losses') }}
          b-select(v-model="taxRules.lossTreatment" size="is-small")
            option(value="ringFenced") {{ $t('report.multipleProperty.tax.lossesRingFenced') }}
            option(value="offset") {{ $t('report.multipleProperty.tax.lossesOffset') }}
        .mpa-field
          label {{ $t('report.multipleProperty.tax.deductibility') }}
          b-select(v-model="taxRules.interestDeductibility" size="is-small")
            option(value="Yes") {{ $t('report.multipleProperty.tax.deductibilityYes') }}
            option(value="No") {{ $t('report.multipleProperty.tax.deductibilityNo') }}
            option(value="Phasing") {{ $t('report.multipleProperty.tax.deductibilityPhasing') }}
        //- The phasing table behind a disclosure — the same information, not shown as
        //- five more boxes by default. Opening it is the reader's own action.
        a.mpa-disclosure(
          v-if="taxRules.interestDeductibility === 'Phasing'"
          href="#"
          @click.prevent="showPhasing = !showPhasing")
          | {{ showPhasing ? '▾' : '▸' }} {{ $t('report.multipleProperty.tax.phasingToggle', { summary: phasingSummary }) }}
        template(v-if="showPhasing && taxRules.interestDeductibility === 'Phasing'")
          .mpa-field(v-for="(v, i) in taxRules.phasingPct" :key="'ph' + i")
            label {{ $t('report.multipleProperty.tax.phasingYear', { year: i + 1 }) }}
            b-input(v-model.number="taxRules.phasingPct[i]" type="number" step="any" size="is-small")
        p.mpa-note {{ $t('report.multipleProperty.tax.note') }}

      //- ---- THE OPEN PROPERTY ----
      .mpa-card
        h2 {{ cardTitle('property') }}
        .mpa-field
          label {{ $t('report.multipleProperty.property.address') }}
          b-input(v-model="sel.address" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.purchasePrice') }}
          b-input(v-model.number="sel.purchasePrice" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.land') }}
          b-input(v-model.number="sel.land" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.building') }}
          b-input(v-model.number="sel.building" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.chattels') }}
          b-input(v-model.number="sel.chattels" type="number" step="any" size="is-small")
        //- The workbook checks this itself (INPUTS G32, expected 0). A split that does
        //- not reconcile is stated, never silently absorbed into the maths.
        .mpa-reconcile(v-if="selResult" :class="{ 'is-bad': !selResult.purchasePriceSplit.reconciles }")
          | {{ selResult.purchasePriceSplit.reconciles
          | ? $t('report.multipleProperty.property.reconciles')
          | : $t('report.multipleProperty.property.doesNotReconcile', { amount: money(selResult.purchasePriceSplit.difference) }) }}
        .mpa-field
          label {{ $t('report.multipleProperty.property.rentPerWeek') }}
          b-input(v-model.number="sel.rentPerWeek" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.vacancy') }}
          b-input(v-model.number="sel.vacancyWeeks" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.property.taxRate') }}
          b-input(v-model.number="sel.taxRatePct" type="number" step="any" size="is-small")

      .mpa-card
        h2 {{ cardTitle('costs') }}
        .mpa-field
          label {{ $t('report.multipleProperty.costs.accounting') }}
          b-input(v-model.number="sel.accountingFees" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.managementFee') }}
          b-input(v-model.number="sel.managementFeePct" type="number" step="any" size="is-small")
        //- The visible half of §6 rule 10: the fee no longer says "(plus GST)" and leaves
        //- the reader to guess. 7.5% with 15% GST is charged at 8.625%, and the model
        //- returns that figure precisely so the screen can show it.
        p.mpa-help(v-if="selResult") {{ $t('report.multipleProperty.costs.effectiveFee', { rate: pct(selResult.taxRules.effectiveManagementFeePct, 3) }) }}
        .mpa-field
          label {{ $t('report.multipleProperty.costs.insurance') }}
          b-input(v-model.number="sel.insurance" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.rates') }}
          b-input(v-model.number="sel.rates" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.bodyCorp') }}
          b-input(v-model.number="sel.bodyCorp" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.repairs') }}
          b-input(v-model.number="sel.repairs" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.other') }}
          b-input(v-model.number="sel.other" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.purchaseCosts') }}
          b-input(v-model.number="sel.purchaseCosts" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.costs.setupCosts') }}
          b-input(v-model.number="sel.setupCosts" type="number" step="any" size="is-small")

      .mpa-card
        h2 {{ cardTitle('assumptions') }}
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.rentalGrowth') }}
          b-input(v-model.number="sel.rentalGrowthPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.capitalGrowth') }}
          b-input(v-model.number="sel.capitalGrowthPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.expenseInflation') }}
          b-input(v-model.number="sel.expenseInflationPct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.assumptions.interestRateInflation') }}
          b-input(v-model.number="sel.interestRateInflationPct" type="number" step="any" size="is-small")
        p.mpa-note {{ $t('report.multipleProperty.assumptions.note') }}

      .mpa-card
        h2
          | {{ cardTitle('funding') }}
          span.mpa-h2sub {{ $t('report.multipleProperty.funding.sub') }}
        //- The hold-back, ruled by Mike 2026-08-20 (§8 Q9): the family chooses how much
        //- of their cash goes into each property. Blank means "take what is left of the
        //- pool, in order" — which is what the table did before there was a choice.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.depositApplied') }}
          b-input(
            v-model="sel.depositApplied"
            :placeholder="selSlot ? num(selSlot.depositApplied, 0) : ''"
            type="number"
            step="any"
            size="is-small"
          )
        //- Decided by the apportionment table, never typed on this shape: the route
        //- ignores `fundingRequired` and `cashDeposit` when a portfolio is sent.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.required') }}
          span.mpa-derived {{ selSlot ? num(selSlot.loanApportioned, 0) : '—' }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.interestOnly') }}
          b-input(v-model.number="sel.interestOnlyLoan" type="number" step="any" size="is-small")
        //- Derived, never typed: INPUTS E69 = E65 − E68.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.principalAndInterest') }}
          span.mpa-derived {{ selResult ? num(selResult.loans.principalAndInterest.openingBalance[0], 0) : '—' }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioTerm') }}
          b-input(v-model.number="sel.interestOnlyTermYears" type="number" step="any" size="is-small")
        //- §6 rule 9, ruled by Mike: the advisor chooses what happens when the
        //- interest-only period ends, because the client decides it, not the model.
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ending') }}
          b-select(v-model="sel.endOfInterestOnly" size="is-small")
            option(value="convert") {{ $t('report.multipleProperty.funding.endingConvert') }}
            option(value="repay") {{ $t('report.multipleProperty.funding.endingRepay') }}
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioTotalTerm') }}
          b-input(v-model.number="sel.interestOnlyTotalTermYears" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.piTerm') }}
          b-input(v-model.number="sel.piTermYears" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.ioRate') }}
          b-input(v-model.number="sel.interestOnlyRatePct" type="number" step="any" size="is-small")
        .mpa-field
          label {{ $t('report.multipleProperty.funding.piRate') }}
          b-input(v-model.number="sel.piRatePct" type="number" step="any" size="is-small")
        p.mpa-note {{ $t('report.multipleProperty.funding.readOnlyNote') }}

    section.mpa-results
      template(v-if="data")

        //- ---- [D2a] THE FINDINGS — first, because they say a figure below is not what
        //- the advisor asked for. A screen that drops them puts the model back to
        //- producing a plausible wrong number in silence. ----
        .mpa-card(v-if="findings.length")
          h2
            | {{ $t('report.multipleProperty.findings.title') }}
            span.mpa-h2sub {{ $t('report.multipleProperty.findings.sub') }}
          .mpa-warnlist
            .mpa-warn(
              v-for="f in findings"
              :key="f.key"
              :class="{ 'is-crit': f.crit }"
            ) {{ f.text }}

        //- ---- [D2b] THE APPORTIONMENT — the centre of Phase 2 ----
        .mpa-card
          h2
            | {{ $t('report.multipleProperty.deposit.title') }}
            span.mpa-h2sub {{ $tc('report.multipleProperty.deposit.sub', propertyCount, { savings: money(data.apportionment.totalSavings), count: propertyCount }) }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th {{ $t('report.multipleProperty.deposit.colValue') }}
                  th {{ $t('report.multipleProperty.deposit.colDepositApplied') }}
                  th {{ $t('report.multipleProperty.deposit.colFundingRequired') }}
                  th {{ $t('report.multipleProperty.deposit.colShare') }}
                  th {{ $t('report.multipleProperty.deposit.colLoanApportioned') }}
                  th {{ $t('report.multipleProperty.deposit.colLvr') }}
              tbody
                tr(v-for="row in depositRows" :key="row.key" :class="row.cls")
                  td {{ row.label }}
                  td {{ num(row.value, 0) }}
                  td
                    b-input(
                      v-if="row.index >= 0 && properties[row.index]"
                      v-model="properties[row.index].depositApplied"
                      :placeholder="num(row.deposit, 0)"
                      type="number"
                      step="any"
                      size="is-small"
                    )
                    span(v-else) —
                  td {{ num(row.funding, 0) }}
                  td {{ pct(row.share, 0) }}
                  td {{ num(row.apportioned, 0) }}
                  td(:class="row.breach ? 'is-neg' : null") {{ pct(row.lvr, 1) }}
                tr.is-total
                  td {{ $t('report.multipleProperty.deposit.total') }}
                  td {{ num(data.apportionment.totals.value, 0) }}
                  td {{ num(data.apportionment.totals.depositApplied, 0) }}
                  td {{ num(data.apportionment.totals.requiredFunding, 0) }}
                  td —
                  td {{ num(data.apportionment.totals.loanApportioned, 0) }}
                  td(:class="data.apportionment.lvrBreach ? 'is-neg' : null") {{ pct(data.apportionment.lvr, 1) }}
          .mpa-reconcile(:class="{ 'is-bad': data.apportionment.depositHeldBack > 0 }")
            | {{ heldBackText }}
          p.mpa-note {{ $t('report.multipleProperty.deposit.balance', { amount: money(data.apportionment.totals.balanceToApportion) }) }}
          p.mpa-note(v-if="noDepositChosen") {{ $t('report.multipleProperty.deposit.autoNote', { savings: money(data.apportionment.totalSavings) }) }}

        //- ---- [D2c] LENDING — two ratios, judged only when a ceiling exists ----
        .mpa-card
          h2
            | {{ $t('report.multipleProperty.lending.title') }}
            span.mpa-h2sub {{ $t('report.multipleProperty.lending.sub') }}
          .mpa-lvr
            .mpa-lvrbox(v-for="box in lendingBoxes" :key="box.key")
              span.mpa-lvrvalue(:class="{ 'is-bad': box.breach }") {{ box.value }}
              span.mpa-lvrlabel {{ box.label }}
              span.mpa-lvrsub {{ box.sub }}
              span.mpa-lvrverdict {{ box.verdict }}
          p.mpa-note(v-if="!hasCeiling") {{ $t('report.multipleProperty.lending.note') }}

        //- ---- [D2d] THE PROPERTIES COMPARED — so opening one is never the only way to
        //- see how it sits against the others. Nothing here is scored or ranked; §1 says
        //- in terms that this model is not a side-by-side comparison, and it still is not. ----
        .mpa-card
          h2
            | {{ $tc('report.multipleProperty.compare.title', propertyCount, { count: propertyCount }) }}
            span.mpa-h2sub {{ $t('report.multipleProperty.compare.sub') }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th {{ $t('report.multipleProperty.compare.colWeekly') }}
                  th {{ $t('report.multipleProperty.compare.colDebt') }}
                  th {{ $t('report.multipleProperty.compare.colEquity') }}
                  th {{ $t('report.multipleProperty.compare.colReturn') }}
              tbody
                tr(v-for="row in compareRows" :key="row.key")
                  td {{ row.label }}
                  td(:class="signClass(row.weekly)") {{ num(row.weekly, 0) }}
                  td {{ num(row.debt, 0) }}
                  td {{ num(row.equity, 0) }}
                  td(:class="signClass(row.rate)") {{ pct(row.rate, 1) }}
                tr.is-total
                  td {{ $t('report.multipleProperty.compare.portfolio') }}
                  td(:class="signClass(data.headline.weeklyCashPosition)") {{ num(data.headline.weeklyCashPosition, 0) }}
                  td {{ num(data.headline.totalDebt, 0) }}
                  td {{ num(data.headline.netEquityFinalYear, 0) }}
                  td(:class="signClass(data.headline.returnOnInvestorFundsFinalYear)") {{ pct(data.headline.returnOnInvestorFundsFinalYear, 1) }}

        //- ---- THE CONSOLIDATED REPORT — every label the workbook's own ----
        .mpa-card
          h2
            | {{ $t('report.multipleProperty.consolidated.title') }}
            span.mpa-h2sub {{ $tc('report.multipleProperty.consolidated.sub', propertyCount, { count: propertyCount }) }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th(v-for="y in data.consolidated.years" :key="'ch' + y") {{ $t('report.multipleProperty.yearShort', { year: y }) }}
              tbody
                tr(v-for="row in consolidatedRows" :key="'cr' + row.label" :class="row.cls")
                  td {{ row.label }}
                  td(
                    v-for="(v, i) in row.values"
                    :key="'cc' + row.label + i"
                    :class="cellClass(row, v)"
                  ) {{ cellText(row, v) }}

        //- ---- SERVICING — a demand stated, and deliberately not judged. The workbook
        //- collects no household income on any sheet, so there is nothing to test it
        //- against; a test fails the build if a verdict is ever added to the model. ----
        .mpa-card
          h2
            | {{ $t('report.multipleProperty.servicing.title') }}
            span.mpa-h2sub {{ $t('report.multipleProperty.servicing.sub') }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th(v-for="y in data.consolidated.years" :key="'sh' + y") {{ $t('report.multipleProperty.yearShort', { year: y }) }}
              tbody
                tr(v-for="row in servicingRows" :key="'sr' + row.label" :class="row.cls")
                  td {{ row.label }}
                  td(
                    v-for="(v, i) in row.values"
                    :key="'sc' + row.label + i"
                    :class="cellClass(row, v)"
                  ) {{ cellText(row, v) }}
          .mpa-reconcile.is-bad {{ servicingSummary }}
          p.mpa-note {{ $t('report.multipleProperty.servicing.note') }}

        //- ---- What the figures say, in the advisor's own words. Every sentence is
        //- built from the model's own output — nothing here is a fixed conclusion. ----
        .mpa-card
          h2 {{ $t('report.multipleProperty.portfolioCoach.title') }}
          .mpa-coach
            p(v-for="(line, i) in portfolioCoachLines" :key="'pcoach' + i") {{ line }}

        //- ---- THE OPEN PROPERTY'S OWN FOUR TEN-YEAR TABLES ----
        .mpa-card(v-for="tbl in tables" :key="tbl.key")
          h2
            | {{ tbl.title }}
            span.mpa-h2sub(v-if="tbl.sub") {{ tbl.sub }}
          .mpa-tablewrap
            table.mpa-table
              thead
                tr
                  th &nbsp;
                  th(v-for="y in tbl.years" :key="tbl.key + 'h' + y") {{ $t('report.multipleProperty.yearShort', { year: y }) }}
              tbody
                tr(v-for="row in tbl.rows" :key="tbl.key + row.label" :class="row.cls")
                  td {{ row.label }}
                  td(
                    v-for="(v, i) in row.values"
                    :key="tbl.key + row.label + i"
                    :class="cellClass(row, v)"
                  ) {{ cellText(row, v) }}

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

/** The most properties the model takes — `MAX_PROPERTIES` in the maths module. */
const MAX_PROPERTIES = 5

/**
 * The workbook's own sample for ONE property, rates in display form (7.5, not 0.075).
 * Cell references are documented in `server/report/multiplePropertyModel.js`; this
 * mirrors its `DEFAULT_INPUTS`, and `multiplePropertyScreen.component.test.js` fails
 * the build if the two ever drift apart.
 *
 * 🔴 `fundingRequired` and `cashDeposit` are ABSENT by design. In a portfolio the
 * apportionment table decides both, and the route ignores them on this shape.
 * @returns {object}
 */
function samplePropertyBase () {
  return {
    address: '',
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

    // The family's choice, and the only funding figure they type. Empty means "take
    // whatever is left of the pool, in order" — the table's behaviour before there was
    // a choice. `usable('')` is false on the backend, so an empty box is not a zero.
    depositApplied: '',

    interestOnlyLoan: 350000,
    interestOnlyTermYears: 8,
    endOfInterestOnly: 'convert',
    interestOnlyTotalTermYears: 30,
    piTermYears: 7,
    interestOnlyRatePct: 4,
    piRatePct: 4
  }
}

/**
 * The workbook's five properties, as overrides on the sample above — the same list, in
 * the same order, as `PROPERTY_OVERRIDES` in the maths module. Only what genuinely
 * differs is listed, because five near-identical copies hide a wrong figure.
 * @returns {object[]}
 */
function sampleProperties () {
  const overrides = [
    { address: '56 Big Deal Avenue, Goldentown' },
    {
      address: '51 Someday Street, Sometown',
      purchasePrice: 515000,
      land: 189312,
      building: 301568,
      chattels: 24120,
      rentPerWeek: 485,
      insurance: 2500,
      rates: 1250,
      interestOnlyTermYears: 9
    },
    { address: '35 Average Deal Avenue, Goldentown', piTermYears: 6 },
    {
      address: '55 Small Deal Avenue, Goldentown',
      purchasePrice: 864000,
      land: 390557,
      building: 423568,
      chattels: 49875,
      rentPerWeek: 645,
      managementFeePct: 7.25,
      insurance: 4800,
      bodyCorp: 1425,
      interestOnlyTermYears: 9,
      piTermYears: 9
    },
    {
      address: '45 Rock n Roll Ave, Swingtown',
      purchasePrice: 785000,
      land: 395000,
      building: 360158,
      chattels: 29842,
      rentPerWeek: 645,
      managementFeePct: 6,
      interestOnlyTermYears: 4,
      piTermYears: 5,
      interestOnlyRatePct: 3
    }
  ]
  return overrides.map(o => Object.assign(samplePropertyBase(), o))
}

/**
 * MultiplePropertyAssessment — the Multiple Property Assessment
 * (Valuation · Decision class): a HOUSEHOLD and up to five rental properties over ten
 * years, with the loan apportionment, the lending position and the consolidated report.
 *
 * The approved design artefact is `design/MULTIPLE-PROPERTY-ASSESSMENT.md` §11 and
 * `design/mockups/multiple-property-portfolio.html`; every difference between this build
 * and that drawing is named in §10 of the document, as `CLAUDE.md` requires.
 *
 * THE SHAPE (§11 Q11, approved by Mike 2026-08-21). Five properties carry ~25 inputs and
 * four ten-year tables EACH — drawn flat that is 125 boxes and 20 tables. So the
 * portfolio is the screen and ONE property is open inside it. The LEFT column holds the
 * household, the list of properties, the tax rules and the open property's own figures;
 * the RIGHT column holds the portfolio, then the open property's tables at the foot.
 * 🔴 Opening a different property changes ONLY the property cards and the property
 * section. Nothing in the portfolio moves.
 *
 * All calculation is backend-only (POST /api/report/multiple-property) — every figure
 * rendered here comes back from `server/report/multiplePropertyModel.js`. Sending a
 * `household` and a `properties` list is what asks for the portfolio; the route's other
 * shape (one property, funding typed) is the pre-Phase-2 contract and is untouched.
 *
 * DECISION CLASS — no "Illustrative" badge. Someone may buy five properties on this.
 *
 * FOUR THINGS THIS SCREEN MUST NOT DROP, each the visible half of a fix:
 *   1. `warnings` — a capped loan, a deposit reduced to fit or a breached ratio each
 *      changes a figure on this page. Dropping them puts the model back to producing a
 *      plausible wrong number in silence, which is the fault §8 Q8 was raised to fix.
 *   2. The EFFECTIVE management fee ("charged at 8.625% with GST") — the 1.15 used to
 *      live inside the workbook's formula and nothing said so (§6 rule 10).
 *   3. The tax rules in force, so a reader is never left to assume New Zealand (§8 Q6).
 *   4. That a loan-to-value ratio is SHOWN AND NOT JUDGED until a ceiling is set. A
 *      shipped default would be a lending policy nobody chose (§8 Q10).
 *
 * Rates are held in display form and converted to decimals in the payload — the same
 * convention as Lease vs Buy.
 */
export default {
  name: 'MultiplePropertyAssessment',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      // INPUTS rows 11–15 and K13. `maxLvrPct` is resolved by the tier cascade, never
      // typed here, and ships EMPTY — see the class comment, point 4.
      household: {
        residenceValue: 1400000,
        homeMortgage: 225000,
        totalSavings: 315000,
        residenceSharePct: 60,
        maxLvrPct: ''
      },
      // Portfolio level: these are a country's rules and a family has one country.
      taxRules: {
        yearOneAddBack: 'setup',
        managementFeeGstPct: 15,
        depreciableAssets: 'chattels',
        depreciationMethod: 'dv',
        depreciationRateChattelsPct: 28,
        buildingDepreciationRatePct: 0,
        lossTreatment: 'ringFenced',
        interestDeductibility: 'Phasing',
        phasingPct: [100, 75, 50, 25, 0]
      },
      properties: sampleProperties(),
      selected: 0,
      showPhasing: false,
      data: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  computed: {
    /** The most properties the model takes, for the template's Add control. */
    maxProperties () { return MAX_PROPERTIES },

    /** How many properties are staged — drives every "one / {n}" plural on the page. */
    propertyCount () { return this.properties.length },

    /** The open property's FORM. Never null: `selected` is clamped on every removal. */
    sel () { return this.properties[this.selected] || this.properties[0] },

    /**
     * The open property's computed RESULT, or null while a recompute is in flight after
     * an add or a remove — the response is one property shorter than the form for a few
     * hundred milliseconds, and a template that assumed otherwise would throw.
     * @returns {object|null}
     */
    selResult () {
      if (!this.data || !Array.isArray(this.data.properties)) { return null }
      return this.data.properties[this.selected] || null
    },

    /** The open property's row in the apportionment table, on the same guard. */
    selSlot () {
      if (!this.data || !this.data.apportionment) { return null }
      return this.data.apportionment.properties[this.selected] || null
    },

    /** True once a ceiling exists to judge the ratios against. */
    hasCeiling () {
      return !!(this.data && this.data.apportionment && this.data.apportionment.maxLvr !== null)
    },

    /** The ceiling as it reads on the household card — or that there isn't one. */
    maxLvrLabel () {
      if (!this.hasCeiling) { return this.$t('report.multipleProperty.household.maxLvrUnset') }
      return this.pct(this.data.apportionment.maxLvr, 1)
    },

    /** True while no property has a deposit typed — the state the screen opens in. */
    noDepositChosen () {
      if (!this.data || !this.data.apportionment) { return false }
      return this.data.apportionment.properties.every(p => !p.depositChosen)
    },

    /** The phasing series as one readable line for the closed disclosure. */
    phasingSummary () {
      return this.taxRules.phasingPct.map(v => (Number(v) || 0) + '%').join(' / ')
    },

    /**
     * The model's own findings, as sentences.
     *
     * 🔴 An unrecognised code renders NOTHING rather than a raw code at an advisor —
     * and `multiplePropertyScreen.component.test.js` fails the build if the model can
     * emit a code this method does not answer, so "nothing" is unreachable rather than
     * a silent hole.
     * @returns {Array<{key: string, text: string, crit: boolean}>}
     */
    findings () {
      if (!this.data || !Array.isArray(this.data.warnings)) { return [] }
      return this.data.warnings
        .map((w, i) => ({
          key: w.code + '-' + (w.property || 0) + '-' + i,
          text: this.findingText(w),
          // A breached lending ratio stops a purchase; a capped figure only needs
          // checking. The tone says which without the advisor reading first.
          crit: w.code === 'LVR_EXCEEDED' ||
            w.code === 'PORTFOLIO_LVR_EXCEEDED' ||
            w.code === 'INVESTMENT_LVR_EXCEEDED'
        }))
        .filter(f => !!f.text)
    },

    /**
     * The apportionment table, residence first, then the properties in order.
     * The totals row is rendered from `apportionment.totals` in the template.
     * @returns {Array<object>}
     */
    depositRows () {
      const a = this.data.apportionment
      const rows = [{
        key: 'residence',
        label: this.$t('report.multipleProperty.deposit.residence'),
        index: -1,
        cls: 'is-self',
        value: a.residence.value,
        funding: a.residence.requiredFunding,
        share: a.residence.taxApportionmentPct,
        apportioned: a.residence.loanApportioned,
        lvr: a.residence.lvr,
        breach: false
      }]
      a.properties.forEach((p, i) => {
        const form = this.properties[i]
        const address = (form && form.address) ||
          this.$t('report.multipleProperty.properties.untitled', { n: i + 1 })
        rows.push({
          key: 'dep' + i,
          label: (i + 1) + ' · ' + address,
          index: i,
          cls: i === a.properties.length - 1 ? 'is-rule' : null,
          value: p.value,
          // What the table actually put in, whether the family chose it or it fell out
          // of the cascade. The box below shows it as a PLACEHOLDER when nobody typed
          // one — an empty box beside a funding figure that plainly had a deposit
          // deducted from it is the screen disagreeing with its own table.
          deposit: p.depositApplied,
          funding: p.requiredFunding,
          share: p.taxApportionmentPct,
          apportioned: p.loanApportioned,
          lvr: p.lvr,
          breach: p.lvrBreach
        })
      })
      return rows
    },

    /** How much of the deposit the family kept — and whether they kept any. */
    heldBackText () {
      const a = this.data.apportionment
      const savings = this.money(a.totalSavings)
      if (a.depositHeldBack > 0) {
        return this.$t('report.multipleProperty.deposit.heldBackSome', {
          held: this.money(a.depositHeldBack), savings
        })
      }
      return this.$t('report.multipleProperty.deposit.heldBackNone', { savings })
    },

    /**
     * The two lending ratios. They answer different questions: everything the family
     * owns, and the rentals on their own — which is what an investment lender tests.
     * @returns {Array<object>}
     */
    lendingBoxes () {
      const a = this.data.apportionment
      const t = k => this.$t('report.multipleProperty.lending.' + k)
      const verdict = (breach) => {
        if (!this.hasCeiling) { return t('notJudged') }
        const max = this.pct(a.maxLvr, 1)
        return breach
          ? this.$t('report.multipleProperty.lending.over', { max })
          : this.$t('report.multipleProperty.lending.within', { max })
      }
      return [
        {
          key: 'all',
          value: this.pct(a.lvr, 1),
          label: t('all'),
          sub: t('allSub'),
          breach: a.lvrBreach,
          verdict: verdict(a.lvrBreach)
        },
        {
          key: 'investment',
          value: this.pct(a.investmentLvr, 1),
          label: t('investment'),
          sub: t('investmentSub'),
          breach: a.investmentLvrBreach,
          verdict: verdict(a.investmentLvrBreach)
        }
      ]
    },

    /** One line per property, so opening one is never the only way to compare it. */
    compareRows () {
      return this.data.properties.map((p, i) => {
        const form = this.properties[i]
        const address = (form && form.address) || p.address ||
          this.$t('report.multipleProperty.properties.untitled', { n: i + 1 })
        return {
          key: 'cmp' + i,
          label: (i + 1) + ' · ' + address,
          weekly: p.headline.weeklyCashPosition,
          debt: p.headline.totalDebt,
          equity: p.headline.netEquityFinalYear,
          rate: p.headline.returnOnInvestorFundsFinalYear
        }
      })
    },

    /** `Consolidated Report` rows 11–39. Every label is the workbook's own. */
    consolidatedRows () {
      const c = this.data.consolidated
      const t = k => this.$t('report.multipleProperty.consolidated.' + k)
      const rows = [
        { label: t('totalRevenue'), values: c.totalRevenue },
        { label: t('totalExpenses'), values: c.totalExpenses },
        { label: t('netOperatingProfit'), values: c.netOperatingProfit, cls: 'is-rule', tone: true },
        { label: t('totalPropertyValue'), values: c.totalPropertyValue },
        { label: t('totalDebt'), values: c.totalDebt },
        { label: t('netEquity'), values: c.netEquity, cls: 'is-rule', tone: true },
        // Row 29 — the deposit lands in year 1 and never again.
        { label: t('cashDeposit'), values: this.yearOneOnly(c.cashDeposit, c.years), blankZeros: true },
        { label: t('annualCashTopUp'), values: c.annualCashTopUp }
      ]
      // The same rule as one property (§5b): the line shows only where capital is
      // actually introduced, so an empty row never invites the reader to look for one.
      if (c.capitalIntroduced.some(v => Math.abs(v) > 0.005)) {
        rows.push({ label: t('capitalIntroduced'), values: c.capitalIntroduced, blankZeros: true })
      }
      rows.push(
        { label: t('cumulativeInvestorFunds'), values: c.cumulativeInvestorFunds, cls: 'is-rule' },
        { label: t('returnOnInvestorFunds'), values: c.returnOnInvestorFunds, fmt: 'pct', dp: 1, tone: true },
        { label: t('weeklyCashPosition'), values: c.weeklyCashPosition, cls: 'is-total', tone: true }
      )
      return rows
    },

    /** What the portfolio demands each year — stated, never judged. */
    servicingRows () {
      const s = this.data.consolidated.servicing
      const t = k => this.$t('report.multipleProperty.servicing.' + k)
      return [
        { label: t('annual'), values: s.totalDemand },
        { label: t('weekly'), values: s.weeklyDemand, cls: 'is-total', negate: true }
      ]
    },

    /** The hardest year, the weekly equivalent, and the ten-year total. */
    servicingSummary () {
      const s = this.data.consolidated.servicing
      return this.$t('report.multipleProperty.servicing.summary', {
        year: s.peakYear,
        amount: this.money(s.peakAnnualDemand),
        weekly: this.money(s.weeklyDemand[s.peakYear - 1]),
        total: this.money(s.tenYearDemand)
      })
    },

    /**
     * What the figures say, in sentences.
     *
     * Every clause is chosen from the model's own output — whether the deposit reached
     * every property, where the rentals stand, what the portfolio costs each week, and
     * what it builds against what goes in. Nothing is a fixed conclusion, so a different
     * portfolio gets a different reading.
     * @returns {string[]}
     */
    portfolioCoachLines () {
      const t = (k, p) => this.$t('report.multipleProperty.portfolioCoach.' + k, p)
      const a = this.data.apportionment
      const c = this.data.consolidated
      const lines = []

      // 1 — did the money reach every property, and where does that leave the lending?
      const unfunded = a.properties.filter(p => p.depositApplied <= 0).length
      let first = (unfunded > 0 && a.properties.length > 1)
        ? t('depositShort', { count: a.properties.length, n: unfunded })
        : t('depositCovers')
      first += ' ' + (a.investmentLvrBreach
        ? t('rentalsLvrOver', { lvr: this.pct(a.investmentLvr, 1), max: this.pct(a.maxLvr, 1) })
        : t('rentalsLvr', { lvr: this.pct(a.investmentLvr, 1) }))
      lines.push(first)

      // 2 — what it costs the family, and what it asks of them over ten years.
      const weekly = c.weeklyCashPosition
      const last = weekly.length - 1
      let second
      if (weekly[0] >= 0) {
        second = t('positiveFromStart', { amount: this.money(weekly[0]) })
      } else {
        const turns = weekly.findIndex(v => v >= 0)
        second = t('costsWeekly', { amount: this.money(Math.abs(weekly[0])) })
        if (turns > 0) {
          second += t('turnsPositive', { year: turns + 1 })
        } else if (Math.abs(weekly[last]) < Math.abs(weekly[0])) {
          second += t('easingTo', { amount: this.money(Math.abs(weekly[last])) })
        } else {
          second += t('worseningTo', { amount: this.money(Math.abs(weekly[last])) })
        }
      }
      second += ' ' + t('tenYearDemand', { total: this.money(c.servicing.tenYearDemand) })
      lines.push(second)

      // 3 — what it builds against what goes in, and the question that leaves.
      const s = c.servicing
      lines.push(
        t('equity', {
          equity: this.money(c.netEquity[last]),
          funds: this.money(c.cumulativeInvestorFunds[last]),
          rate: this.pct(this.data.headline.returnOnInvestorFundsFinalYear, 1)
        }) + ' ' + t('theQuestion', {
          weekly: this.money(s.weeklyDemand[s.peakYear - 1])
        })
      )

      return lines
    },

    /**
     * The open property's four ten-year tables, as row descriptors rather than 60-odd
     * lines of pug. Each row carries its own label, values, format and emphasis, so the
     * template has one loop and the formatting rules have one definition.
     * @returns {Array<{key: string, title: string, sub: string, years: number[], rows: Array<object>}>}
     */
    tables () {
      const r = this.selResult
      if (!r) { return [] }
      const sub = this.$t('report.multipleProperty.propertySub', {
        address: r.address || this.$t('report.multipleProperty.properties.untitled', { n: this.selected + 1 })
      })
      return [
        { key: 'summary', title: this.cardTitle('summary'), sub, years: r.years, rows: this.summaryRows },
        { key: 'pl', title: this.cardTitle('pl'), years: r.years, rows: this.plRows },
        { key: 'tax', title: this.cardTitle('taxTable'), years: r.years, rows: this.taxRows },
        { key: 'loans', title: this.cardTitle('loans'), years: r.years, rows: this.loanRows }
      ]
    },

    /** OUTPUTS rows 11–23, plus the Capital Introduced line added by §6 rule 9. */
    summaryRows () {
      const r = this.selResult
      const s = r.investmentSummary
      const t = k => this.$t('report.multipleProperty.summary.' + k)
      const rows = [
        { label: t('propertyValue'), values: s.propertyValue },
        { label: t('totalDebt'), values: s.totalDebt },
        { label: t('netEquity'), values: s.netEquity, cls: 'is-rule', tone: true },
        // OUTPUTS C18 — the deposit lands in year 1 and never again. It is a SCALAR, not
        // a series: indexing it renders a row of dashes where the deposit should be.
        { label: t('cashDeposit'), values: this.yearOneOnly(s.cashDeposit, r.years), blankZeros: true },
        { label: t('annualCashTopUp'), values: s.annualCashTopUp }
      ]
      // Ruled §5b: the line shows ONLY under the repay ending — under convert no capital
      // is introduced, so an empty row would invite the reader to look for one.
      if (r.endOfInterestOnly === 'repay') {
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
      const p = this.selResult.profitAndLoss
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
      const r = this.selResult
      const x = r.taxPosition
      const t = k => this.$t('report.multipleProperty.taxTable.' + k)
      const carryKey = r.taxRules.lossTreatment === 'offset'
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
      const io = this.selResult.loans.interestOnly
      const pi = this.selResult.loans.principalAndInterest
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
    }
  },

  watch: {
    household: { deep: true, handler () { this.queueRecompute() } },
    taxRules: { deep: true, handler () { this.queueRecompute() } },
    properties: { deep: true, handler () { this.queueRecompute() } }
  },

  mounted () {
    // Paint immediately on the shipped New Zealand defaults, then re-seed from whatever
    // this advisor's group or firm has set — the same "cached first, then refresh"
    // order currencyMixin uses. The seed writes to `taxRules`, so the deep watcher
    // queues the second recompute itself.
    this.recompute()
    this.loadTaxRuleDefaults()
  },

  methods: {
    /**
     * A card's heading, prefixed with which property it belongs to.
     * Rendered uppercase by the shared card style, so the composed case does not show.
     * @param {string} block  the locale block holding the card's own title
     * @returns {string}
     */
    cardTitle (block) {
      return this.$t('report.multipleProperty.propertyPrefix', {
        n: this.selected + 1,
        card: this.$t('report.multipleProperty.' + block + '.title')
      })
    },

    /**
     * Stage another property, seeded from the workbook sample with no address.
     *
     * It is seeded rather than blanked because the BACKEND already defaults every absent
     * figure to that same sample — a blank card would show zeros while the model computed
     * on 649,000, and the screen would disagree with its own figures.
     */
    addProperty () {
      if (this.properties.length >= MAX_PROPERTIES) { return }
      this.properties.push(samplePropertyBase())
      this.selected = this.properties.length - 1
    },

    /**
     * Remove a property, keeping the reader's place. The last one cannot be removed —
     * a portfolio of nothing has no meaning and the model would compute on its sample.
     * @param {number} i
     */
    removeProperty (i) {
      if (this.properties.length <= 1) { return }
      this.properties.splice(i, 1)
      // Clamp rather than reset: removing property 4 should leave the reader near where
      // they were, not throw them back to property 1.
      if (this.selected >= this.properties.length) {
        this.selected = this.properties.length - 1
      }
    },

    /**
     * One of the model's findings, as a sentence.
     *
     * 🔴 Returns null for a code it does not know, so a raw code can never be printed at
     * an advisor — and the component test fails the build if the model can emit one,
     * which is what makes the null unreachable rather than a silent hole.
     * @param {object} w  one entry of the model's `warnings`
     * @returns {string|null}
     */
    findingText (w) {
      const t = (k, p) => this.$t('report.multipleProperty.findings.' + k, p)
      switch (w.code) {
        case 'INTEREST_ONLY_CAPPED':
          return t('interestOnlyCapped', {
            n: w.property, typed: this.money(w.typed), applied: this.money(w.applied)
          })
        case 'DEPOSIT_EXCEEDS_SAVINGS':
          return t('depositExceedsSavings', {
            n: w.property, wanted: this.money(w.wanted), applied: this.money(w.applied)
          })
        case 'DEPOSIT_EXCEEDS_PRICE':
          return t('depositExceedsPrice', {
            n: w.property, wanted: this.money(w.wanted), applied: this.money(w.applied)
          })
        case 'DEPOSIT_NEGATIVE':
          return t('depositNegative', { n: w.property })
        case 'LVR_EXCEEDED':
          return t('lvrExceeded', {
            n: w.property, lvr: this.pct(w.lvr, 1), maxLvr: this.pct(w.maxLvr, 1)
          })
        case 'INVESTMENT_LVR_EXCEEDED':
          return t('investmentLvrExceeded', {
            lvr: this.pct(w.lvr, 1), maxLvr: this.pct(w.maxLvr, 1)
          })
        case 'PORTFOLIO_LVR_EXCEEDED':
          return t('portfolioLvrExceeded', { maxLvr: this.pct(w.maxLvr, 1) })
        default:
          return null
      }
    },

    /**
     * Seed the Tax rules card, and the lending ceiling, from the settings this advisor's
     * tier inherits.
     *
     * RULED BY MIKE, 2026-08-17: a group (normally a country) sets these and a firm may
     * correct them — and the advisor may still type over any of them for the client in
     * front of them. *"It should populate with group set rate but still be editable per
     * client if needed."* That is why this seeds the form rather than locking it, and
     * why nothing here is saved back.
     *
     * ⚠ The CEILING is the exception: it is read here and shown, but there is no box to
     * type it into. It is a lending policy, not a per-client judgement (§8 Q10).
     *
     * Silent on every failure, exactly like the currency read: a settings service that
     * cannot be reached must never stop an advisor assessing a property. The worst case
     * is the shipped New Zealand set with no ceiling, which is what every firm gets today.
     * @returns {Promise<void>}
     */
    async loadTaxRuleDefaults () {
      if (!process.client) { return }
      try {
        const token = window.localStorage.getItem('advisor_e_token') || 'dev-local-bypass'
        const res = await fetch('/api/report/property-tax-rules', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!res.ok) { return }
        const body = await res.json()
        if (body && body.rules) { this.applyTaxRuleDefaults(body.rules) }
      } catch (e) { /* keep the shipped defaults — never surface to the report */ }
    },

    /**
     * Put resolved rules (decimal rates) onto the form (display percentages).
     *
     * Only the fields actually present are written, so a partial answer can never blank
     * a setting the advisor can see. 🔴 A ceiling that is absent or null stays EMPTY —
     * it must never arrive as 0, because a maximum loan-to-value of zero refuses every
     * loan ever written.
     * @param {object} rules
     */
    applyTaxRuleDefaults (rules) {
      const pct = v => Math.round(Number(v || 0) * 1000000) / 10000 //  0.08625 → 8.625
      const r = this.taxRules
      if (rules.yearOneAddBack) { r.yearOneAddBack = rules.yearOneAddBack }
      if (rules.depreciableAssets) { r.depreciableAssets = rules.depreciableAssets }
      if (rules.depreciationMethod) { r.depreciationMethod = rules.depreciationMethod }
      if (rules.lossTreatment) { r.lossTreatment = rules.lossTreatment }
      if (rules.interestDeductibility) { r.interestDeductibility = rules.interestDeductibility }
      if (rules.managementFeeGstRate !== undefined) { r.managementFeeGstPct = pct(rules.managementFeeGstRate) }
      if (rules.depreciationRateChattels !== undefined) { r.depreciationRateChattelsPct = pct(rules.depreciationRateChattels) }
      if (rules.buildingDepreciationRate !== undefined) { r.buildingDepreciationRatePct = pct(rules.buildingDepreciationRate) }
      if (Array.isArray(rules.phasingTable)) { r.phasingPct = rules.phasingTable.map(pct) }
      if (rules.maxLvr !== undefined && rules.maxLvr !== null) {
        this.household.maxLvrPct = pct(rules.maxLvr)
      }
    },

    /**
     * The backend request — consumed by the reportRecompute mixin (debounce, race
     * guard, stale flag). Display percentages become decimals here.
     *
     * Sending a `household` and a `properties` list is what asks the route for the
     * portfolio. `fundingRequired` and `cashDeposit` are deliberately NOT sent: the
     * apportionment table decides both, and a caller who sent them would be describing a
     * funding structure the table is about to overrule.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      const dec = v => (Number(v) || 0) / 100
      const t = this.taxRules
      const h = this.household
      // An empty ceiling stays absent, never 0 — see applyTaxRuleDefaults.
      const household = {
        residenceValue: h.residenceValue,
        homeMortgage: h.homeMortgage,
        totalSavings: h.totalSavings,
        residenceTaxApportionmentPct: dec(h.residenceSharePct)
      }
      if (h.maxLvrPct !== '' && h.maxLvrPct !== null && Number.isFinite(Number(h.maxLvrPct))) {
        household.maxLvr = dec(h.maxLvrPct)
      }

      return {
        url: '/api/report/multiple-property',
        body: {
          household,
          properties: this.properties.map((f) => {
            const p = {
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

              // Portfolio level — one country, one set of rules.
              yearOneAddBack: t.yearOneAddBack,
              managementFeeGstRate: dec(t.managementFeeGstPct),
              depreciableAssets: t.depreciableAssets,
              depreciationMethod: t.depreciationMethod,
              depreciationRateChattels: dec(t.depreciationRateChattelsPct),
              buildingDepreciationRate: dec(t.buildingDepreciationRatePct),
              lossTreatment: t.lossTreatment,
              interestDeductibility: t.interestDeductibility,
              phasingTable: t.phasingPct.map(dec),

              interestOnlyLoan: f.interestOnlyLoan,
              interestOnlyTermYears: f.interestOnlyTermYears,
              piTermYears: f.piTermYears,
              interestOnlyRate: dec(f.interestOnlyRatePct),
              piRate: dec(f.piRatePct),
              endOfInterestOnly: f.endOfInterestOnly,
              interestOnlyTotalTermYears: f.interestOnlyTotalTermYears
            }
            // The hold-back, only when the family actually chose one. An empty box means
            // "take what is left of the pool", which is an ABSENT field, not a zero — a
            // zero is itself a choice and the model honours it as one.
            if (f.depositApplied !== '' && f.depositApplied !== null &&
                Number.isFinite(Number(f.depositApplied))) {
              p.depositApplied = Number(f.depositApplied)
            }
            return p
          })
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
     * The HeroFigure tone for a signed figure. A portfolio costing the client $4,636 a
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
     * Red for a negative figure, green for a positive one — for a single value outside
     * the row-descriptor tables.
     * @param {number} v
     * @returns {string|null}
     */
    signClass (v) {
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 0.005) { return null }
      return n < 0 ? 'is-neg' : 'is-pos'
    },

    /**
     * A figure that lands in year 1 and never again (the cash deposit), as a ten-year
     * row. Later years are null, not 0 — nothing happened, rather than nothing was paid.
     * @param {number} value
     * @param {number[]} years
     * @returns {Array<number|null>}
     */
    yearOneOnly (value, years) {
      return years.map((_, i) => (i === 0 ? value : null))
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
     *
     * `negate` covers the servicing rows, where the figure is a positive DEMAND on the
     * family and reads as a cost, not a gain.
     * @param {object} row
     * @param {number|null} v
     * @returns {string|null}
     */
    cellClass (row, v) {
      if (v === null || v === undefined) { return null }
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 0.005) { return null }
      if (row.negate) { return n > 0 ? 'is-neg' : null }
      if (!row.tone) { return null }
      return n < 0 ? 'is-neg' : 'is-pos'
    }
  }
}
</script>

<style scoped>
/* Root: flex column with ONE gap value (16px), so header→band→layout and every card gap
   is the same number — the [A]–[D2d] anatomy in REPORT-LAYOUT-REFERENCE.html. */
.mpa-root { display: flex; flex-direction: column; gap: 16px; }
/* MANDATORY: reset the shared ReportHeader's `margin: 0 auto 22px`. In a flex column
   that auto margin shrinks the header below full width and doubles the header→band gap.
   Guarded by reportHeaderFullWidth.test.js. */
.mpa-root ::v-deep .rs-top { margin: 0; }

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
/* A card heading that needs a line of explanation under it — the portfolio cards each
   answer a different question and the title alone does not say which. */
.mpa-card h2 .mpa-h2sub {
  display: block; margin-top: 3px; font-size: 11px; font-weight: 400; letter-spacing: 0;
  text-transform: none; color: var(--rs-muted); font-style: italic;
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

/* The property list. The open row takes the panel fill the input boxes already use —
   no new colour, and the reader can always see which property they are looking at. */
.mpa-prow {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px; border-radius: 9px; cursor: pointer;
  border: 1px solid transparent;
}
.mpa-prow + .mpa-prow { margin-top: 2px; }
.mpa-prow .mpa-pn { font-size: 11px; font-weight: 600; color: var(--rs-muted); min-width: 14px; }
.mpa-prow .mpa-pa {
  flex: 1; font-size: 12.5px; color: var(--rs-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mpa-prow .mpa-pv { font-size: 12.5px; color: var(--rs-muted); }
.mpa-prow .mpa-px { font-size: 15px; color: var(--rs-muted); text-decoration: none; }
.mpa-prow.is-sel { background: var(--rs-panel-2); border-color: var(--rs-card-border); }
.mpa-prow.is-sel .mpa-pn, .mpa-prow.is-sel .mpa-pa { color: var(--rs-ink); font-weight: 600; }
.mpa-padd { display: inline-block; margin-top: 10px; font-size: 12.5px; color: var(--rs-accent); }

/* The findings. A finding is a sentence, never a code. */
.mpa-warnlist { display: flex; flex-direction: column; gap: 8px; }
.mpa-warn {
  font-size: 12.5px; padding: 9px 11px; border-radius: 9px;
  background: #fff6e8; color: #7a4400; border-left: 3px solid var(--rs-warn);
}
.mpa-warn.is-crit { background: var(--rs-crit-soft); color: var(--rs-crit); border-left-color: var(--rs-crit); }

/* The two lending ratios: a big number, its question underneath, and a verdict only
   when a ceiling exists to judge it against. */
.mpa-lvr { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 640px) { .mpa-lvr { grid-template-columns: 1fr; } }
.mpa-lvrbox {
  background: var(--rs-panel-2); border: 1px solid var(--rs-card-border);
  border-radius: 11px; padding: 12px 14px;
}
.mpa-lvrvalue { display: block; font-size: 24px; font-weight: 600; color: var(--rs-ink); }
.mpa-lvrvalue.is-bad { color: var(--rs-crit); }
.mpa-lvrlabel { display: block; margin-top: 2px; font-size: 12.5px; color: var(--rs-ink); }
.mpa-lvrsub { display: block; margin-top: 4px; font-size: 11.5px; color: var(--rs-muted); }
.mpa-lvrverdict {
  display: block; margin-top: 6px; font-size: 11.5px;
  font-style: italic; color: var(--rs-muted);
}

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
/* The deposit box sits inside the table and must not stretch the column. */
.mpa-table td .control { width: 110px; margin-left: auto; }
.mpa-table tr.is-self td:first-child { font-style: italic; color: var(--rs-muted); }
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

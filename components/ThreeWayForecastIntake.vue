<template lang="pug">
.tw-intake
  //- ══════════════════════════════════════════════ Step 1 — drop the exports ══
  section(v-if="phase === 'drop'")
    .tw-card.drop-card
      .drop(
        :class="{ loaded: chosen.length > 0 }"
        @dragover.prevent
        @drop.prevent="onDrop")
        .drop-big {{ $t('report.threeWayForecast.drop.title') }}
        .drop-sm {{ $t('report.threeWayForecast.drop.formats') }}
        .drop-sm.drop-supported {{ $t('report.supportedSoftware') }}
        .slots
          .slot(v-for="slot in slotSpecs" :key="slot.key" :class="{ empty: !slot.required }")
            span.req(:class="{ opt: !slot.required }")
              | {{ slot.required ? $t('report.threeWayForecast.drop.required') : $t('report.threeWayForecast.drop.optional') }}
            div
              .nm {{ $t(slot.titleKey) }}
              .mt {{ $t(slot.whyKey) }}
        .chosen(v-if="chosen.length")
          .chosen-row(v-for="(file, i) in chosen" :key="i")
            span.chosen-name {{ file.name }}
            b-button(size="is-small" @click="removeChosen(i)") {{ $t('report.threeWayForecast.drop.remove') }}
        b-button.choose-btn(@click="pickFiles") {{ $t('report.threeWayForecast.drop.choose') }}
        input(
          ref="fileInput"
          type="file"
          accept=".xlsx,.csv"
          multiple
          hidden
          @change="onFilesChosen")
      p.err(v-if="dropError") {{ dropError }}
      p.err(v-if="blocked") {{ blocked }}
      .tw-actions
        b-button(
          type="is-primary"
          :loading="uploading"
          :disabled="chosen.length === 0"
          @click="readFiles") {{ $t('report.threeWayForecast.drop.read') }}
        b-button(@click="skipManual") {{ $t('report.threeWayForecast.drop.skip') }}

    .tw-edu
      .tw-edu-h
        span.tw-lead NOTE
        | {{ $t('report.threeWayForecast.drop.note') }}
      p.tw-edu-p {{ $t('report.threeWayForecast.drop.noteBody') }}

  //- ═══════════════════════════════════ Step 2 — confirm the opening position ══
  section(v-else-if="phase === 'confirm'")
    .tw-card
      //- The opening balance sheet: every figure the forecast opens from, whether or
      //- not the file supplied it. See the component note on why all seventeen show.
      .tw-group
        .tw-glabel
          span.tw-dot
          h2.tw-h2
            | {{ $t('report.threeWayForecast.confirm.heading') }}
            span(v-if="form.reportDate")  — {{ $t('report.threeWayForecast.confirm.asAt', { date: form.reportDate }) }}
        .tw-tblwrap
          table.confirm-table
            thead
              tr
                th {{ $t('report.threeWayForecast.confirm.figure') }}
                th.num {{ $t('report.threeWayForecast.confirm.amount') }}
                th {{ $t('report.threeWayForecast.confirm.whereFrom') }}
            tbody
              tr(v-for="key in openingKeys" :key="key" :class="{ 'row-invalid': invalid.includes('opening.' + key) }")
                td {{ $t('report.threeWayForecast.confirm.figures.' + key) }}
                td.num
                  b-input(
                    v-model.number="form.opening[key].value"
                    type="number"
                    step="any"
                    size="is-small"
                    :disabled="hasCandidates(key)"
                    @input="markEntered('opening.' + key)")
                td
                  .cands(v-if="hasCandidates(key)")
                    b-checkbox(
                      v-for="(c, ci) in form.opening[key].candidates"
                      :key="ci"
                      v-model="c.selected"
                      size="is-small"
                      @input="applyCandidates(key)")
                      | {{ c.label }} — {{ money(c.value) }}
                    .cand-note {{ $t('report.threeWayForecast.confirm.splitAcross', { n: form.opening[key].candidates.length }) }}
                  span(v-else-if="form.opening[key].source !== 'file'") {{ $t('report.threeWayForecast.confirm.notInExport') }}
                  provenance-badge(
                    :source="form.opening[key].source"
                    :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                    :entered-label="$t('report.threeWayForecast.confirm.entered')"
                    spaced)
        p.tw-note {{ $t('report.threeWayForecast.confirm.sumNote') }}

      //- Fixed assets: an opening value a file can carry, and a rate it never can.
      .tw-group
        .tw-glabel
          span.tw-dot
          h2.tw-h2 {{ $t('report.threeWayForecast.confirm.assetsHeading') }}
        .tw-tblwrap
          table.confirm-table
            thead
              tr
                th {{ $t('report.threeWayForecast.confirm.category') }}
                th.num {{ $t('report.threeWayForecast.confirm.openingValue') }}
                th.num {{ $t('report.threeWayForecast.confirm.ratePerYear') }}
            tbody
              tr(v-for="(asset, i) in form.assets" :key="asset.key")
                td {{ $t('report.threeWayForecast.confirm.assets.' + asset.key) }}
                td.num
                  .cell
                    b-input(
                      v-model.number="asset.opening.value"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="markEntered('assets.' + i + '.opening')")
                    provenance-badge(
                      :source="asset.opening.source"
                      :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                      :entered-label="$t('report.threeWayForecast.confirm.entered')"
                      size="sm"
                      spaced)
                td.num
                  .cell
                    b-input(
                      v-model.number="asset.rate"
                      type="number"
                      step="any"
                      size="is-small")
                    span.pctmark %
        p.tw-note {{ $t('report.threeWayForecast.confirm.assetsNote') }}

      //- Loans and shareholder accounts — positional and unnamed, by design.
      .tw-group
        .tw-glabel
          span.tw-dot
          h2.tw-h2 {{ $t('report.threeWayForecast.confirm.fundingHeading') }}
        .tw-tblwrap
          table.confirm-table
            thead
              tr
                th {{ $t('report.threeWayForecast.confirm.nameIt') }}
                th.num {{ $t('report.threeWayForecast.confirm.openingBalance') }}
                th.num {{ $t('report.threeWayForecast.confirm.monthlyRepayment') }}
                th.num {{ $t('report.threeWayForecast.confirm.interestRate') }}
            tbody
              tr(v-for="(loan, i) in form.loans" :key="'loan' + i")
                td
                  b-input(v-model="loan.name" size="is-small")
                td.num
                  .cell
                    b-input(
                      v-model.number="loan.opening.value"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="markEntered('loans.' + i + '.opening')")
                    provenance-badge(
                      :source="loan.opening.source"
                      :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                      :entered-label="$t('report.threeWayForecast.confirm.entered')"
                      size="sm"
                      spaced)
                td.num
                  b-input(v-model.number="loan.repayment" type="number" step="any" size="is-small")
                td.num
                  .cell
                    b-input(v-model.number="loan.rate" type="number" step="any" size="is-small")
                    span.pctmark %
              tr(v-for="(sh, i) in form.shareholders" :key="'sh' + i" :class="{ rule: i === 0 }")
                td {{ $t('report.threeWayForecast.confirm.shareholder', { n: i + 1 }) }}
                td.num
                  .cell
                    b-input(
                      v-model.number="sh.opening.value"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="markEntered('shareholders.' + i + '.opening')")
                    provenance-badge(
                      :source="sh.opening.source"
                      :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                      :entered-label="$t('report.threeWayForecast.confirm.entered')"
                      size="sm"
                      spaced)
                td.muted(colspan="2")
                  | {{ sh.opening.value < 0 ? $t('report.threeWayForecast.confirm.overdrawn', { rate: pct(form.shareholderRate) }) : $t('report.threeWayForecast.confirm.inCredit') }}
        p.tw-note {{ $t('report.threeWayForecast.confirm.namesNote') }}

    .warn-note(v-for="(w, i) in warnings" :key="'cw' + i") ⚠ {{ w }}
    .tw-actions
      b-button(type="is-primary" @click="toAssume") {{ $t('report.threeWayForecast.confirm.next') }}
      span.tw-foot {{ $t('report.threeWayForecast.confirm.nothingSaved') }}

  //- ══════════════════════════════════════ Step 3 — set the assumptions ══
  section(v-else)
    .tw-layout
      aside.tw-card
        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.tradeHeading') }}
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.markup') }}
              provenance-badge(
                source="entered"
                :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                :entered-label="$t('report.threeWayForecast.confirm.entered')"
                size="sm")
            b-input(v-model.number="form.markup" type="number" step="any" size="is-small")
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.startsOn') }}
            b-input(v-model="form.startDate" type="date" size="is-small")

        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.debtorsHeading') }}
          .field(v-for="(bucketLabel, i) in bucketLabels" :key="'d' + i")
            .fieldlab
              span {{ $t(bucketLabel) }}
            b-input(v-model.number="form.debtor[i]" type="number" step="any" size="is-small")
          .tw-foot(:class="debtorTotal === 100 ? 'is-good' : 'is-crit'")
            | {{ debtorTotal === 100 ? $t('report.threeWayForecast.assume.addsUp') : $t('report.threeWayForecast.assume.doesNotAddUp', { total: pct(debtorTotal) }) }}

        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.creditorsHeading') }}
          .field(v-for="(bucketLabel, i) in bucketLabels" :key="'c' + i")
            .fieldlab
              span {{ $t(bucketLabel) }}
            b-input(v-model.number="form.creditor[i]" type="number" step="any" size="is-small")
          .tw-foot(:class="creditorTotal === 100 ? 'is-good' : 'is-crit'")
            | {{ creditorTotal === 100 ? $t('report.threeWayForecast.assume.addsUp') : $t('report.threeWayForecast.assume.doesNotAddUp', { total: pct(creditorTotal) }) }}

        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.taxHeading') }}
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.gstRate') }}
            b-input(v-model.number="form.gstRate" type="number" step="any" size="is-small")
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.gstPeriod') }}
            .seg
              button(
                v-for="opt in gstPeriodOptions"
                :key="opt.value"
                type="button"
                :class="{ on: form.gstPeriod === opt.value }"
                @click="form.gstPeriod = opt.value") {{ $t(opt.label) }}
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.gstBasis') }}
            .seg
              button(
                v-for="opt in gstBasisOptions"
                :key="opt.value"
                type="button"
                :class="{ on: form.gstBasis === opt.value }"
                @click="form.gstBasis = opt.value") {{ $t(opt.label) }}
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.taxRate') }}
            b-input(v-model.number="form.taxRate" type="number" step="any" size="is-small")

        //- Not in the approved drawing. Mike's ruling 2026-09-03: every figure the engine
        //- takes goes on a screen, because anything left off keeps the source workbook's
        //- own value and no advisor can see it. These four are a share of revenue.
        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.directCostsHeading') }}
          .field(v-for="rate in directCostFields" :key="rate.key")
            .fieldlab
              span {{ $t(rate.label) }}
            b-input(v-model.number="form.direct[rate.key]" type="number" step="any" size="is-small")
          p.tw-note {{ $t('report.threeWayForecast.assume.directCostsNote') }}

        .tw-group
          .tw-glabel
            span.tw-dot
            h2.tw-h2 {{ $t('report.threeWayForecast.assume.interestHeading') }}
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.overdraftRate') }}
            b-input(v-model.number="form.overdraftRate" type="number" step="any" size="is-small")
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.inFundsRate') }}
            b-input(v-model.number="form.inFundsRate" type="number" step="any" size="is-small")
          .field
            .fieldlab
              span {{ $t('report.threeWayForecast.assume.shareholderRate') }}
            b-input(v-model.number="form.shareholderRate" type="number" step="any" size="is-small")

      section.tw-results
        .tw-card
          .tw-group
            .tw-glabel
              span.tw-dot
              h2.tw-h2 {{ $t('report.threeWayForecast.assume.salesHeading') }}
            .mgrid
              .m(v-for="(label, i) in monthLabels" :key="'s' + i" :class="{ seeded: form.salesSource === 'seeded' }")
                span.lbl {{ label }}
                b-input(v-model.number="form.sales[i]" type="number" step="any" size="is-small")
            p.tw-note
              provenance-badge(
                v-if="form.salesSource === 'seeded'"
                source="seeded"
                :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                :entered-label="$t('report.threeWayForecast.confirm.entered')"
                :seeded-label="$t('report.threeWayForecast.confirm.startingPoint')")
              span(v-if="form.salesSource === 'seeded'")  {{ $t('report.threeWayForecast.assume.seededNote', { total: money(salesTotal) }) }}
              span(v-else) {{ money(salesTotal) }}

          //- The volatility read. Built from the approved drawing
          //- design/mockups/three-way-forecast-volatility.html (approved 2026-09-03),
          //- and placed directly under the sales boxes because that is the only moment
          //- its answer can change anything.
          .tw-group
            .volblock
              .tw-glabel
                span.tw-dot
                h2.tw-h2 {{ $t('report.threeWayForecast.assume.volatility.heading') }}

              //- Nothing to measure: no by-month export, or too few complete months.
              p.volsub(v-if="!historyMonths.length") {{ $t('report.threeWayForecast.assume.volatility.noHistory') }}
              .warn-note(v-else-if="!volatilityWindow")
                strong {{ $t('report.threeWayForecast.assume.volatility.notEnough') }}
                br
                | {{ $t('report.threeWayForecast.assume.volatility.notEnoughBody', { n: historyMonths.length }) }}

              template(v-else-if="volatility && volatility.forecast")
                p.volsub
                  | {{ $t('report.threeWayForecast.assume.volatility.measuredOver', { n: volatility.monthsUsed }) }}
                  //- Only where there is something to gain. Found by opening the built
                  //- screen on 2026-09-03: with both exports already dropped it was
                  //- telling the advisor to do the thing they had just done.
                  span(v-if="canReadMoreMonths")  {{ $t('report.threeWayForecast.assume.volatility.measuredMore') }}

                .volfigs
                  .volfig
                    .k {{ $t('report.threeWayForecast.assume.volatility.averageMonth') }}
                    .v {{ money(volatility.average) }}
                    .s {{ $t('report.threeWayForecast.assume.volatility.averageMonthSub', { total: money(volatility.total), n: volatility.monthsUsed }) }}
                  .volfig
                    .k {{ $t('report.threeWayForecast.assume.volatility.normalRange') }}
                    .v.is-small {{ money(volatility.bands[0].lower) }} – {{ money(volatility.bands[0].upper) }}
                    .s {{ $t('report.threeWayForecast.assume.volatility.normalRangeSub') }}
                  .volfig(v-if="volatility.highest")
                    .k {{ $t('report.threeWayForecast.assume.volatility.biggestMonth') }}
                    .v {{ money(volatility.highest.value) }}
                    .s {{ $t('report.threeWayForecast.assume.volatility.biggestMonthSub', { month: historyMonthName(volatility.highest.index) }) }}
                  .volfig
                    .k {{ $t('report.threeWayForecast.assume.volatility.outsideCount') }}
                    .v
                      | {{ volatility.forecast.outsideCount }}
                      span.volof  {{ $t('report.threeWayForecast.assume.volatility.outsideOf') }}
                    .s {{ $t('report.threeWayForecast.assume.volatility.outsideSubHistory', { n: historyOutsideCount }) }}

                //- The dial — Mike's ruling of 2026-09-03. It measures the HISTORY, and
                //- says so, because its own green/amber/red is a different judgement from
                //- the two bands below.
                .volpanel
                  .volpanel-h {{ $t('report.volatility.dial.title') }}
                  p.volpanel-s {{ $t('report.threeWayForecast.assume.volatility.dialAbout', { n: volatility.monthsUsed }) }}
                  volatility-dial(:score="volatility.score")

                .volchart(v-if="volatilityChart")
                  svg(
                    viewBox="0 0 760 420"
                    width="100%"
                    height="420"
                    role="img"
                    :aria-label="$t('report.threeWayForecast.assume.volatility.chartAlt', { n: volatility.monthsUsed })")
                    rect(
                      v-for="(r, i) in volatilityChart.bandRects"
                      :key="'br' + i"
                      x="60"
                      :y="r.y"
                      width="600"
                      :height="r.height"
                      :fill="r.fill")
                    line(
                      v-for="(l, i) in volatilityChart.bandLines"
                      :key="'bl' + i"
                      x1="60"
                      :y1="l.y"
                      x2="660"
                      :y2="l.y"
                      :stroke="l.stroke"
                      :stroke-width="l.width"
                      :stroke-dasharray="l.dash")
                    text.volaxis(
                      v-for="(l, i) in volatilityChart.bandLines"
                      :key="'bt' + i"
                      x="756"
                      :y="l.y + 3"
                      text-anchor="end"
                      :fill="l.stroke") {{ l.label }}
                    line(x1="60" y1="380" x2="660" y2="380" stroke="#d5e1ee" stroke-width="1")
                    line(
                      :x1="volatilityChart.dividerX"
                      y1="40"
                      :x2="volatilityChart.dividerX"
                      y2="380"
                      stroke="#5b6f8a"
                      stroke-width="1"
                      stroke-dasharray="3 4")
                    text.volhead(:x="volatilityChart.actualLabelX" y="32" text-anchor="middle" fill="#5b6f8a") {{ $t('report.threeWayForecast.assume.volatility.chartActual', { n: volatility.monthsUsed }) }}
                    text.volhead(:x="volatilityChart.forecastLabelX" y="32" text-anchor="middle" fill="#002b64") {{ $t('report.threeWayForecast.assume.volatility.chartForecast') }}
                    polyline(fill="none" stroke="#002b64" stroke-width="2" stroke-linejoin="round" :points="volatilityChart.actualLine")
                    polyline(fill="none" stroke="#0070c0" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6 4" :points="volatilityChart.forecastLine")
                    circle(
                      v-for="(p, i) in volatilityChart.points"
                      :key="'pt' + i"
                      :cx="p.x"
                      :cy="p.y"
                      :r="p.r"
                      :fill="p.fill"
                      :stroke="p.stroke"
                      :stroke-width="p.strokeWidth")
                    text.volaxis(
                      v-for="(t, i) in volatilityChart.monthLabels"
                      :key="'ml' + i"
                      :x="t.x"
                      y="398"
                      text-anchor="middle"
                      fill="#5b6f8a") {{ t.label }}
                .vollegend
                  span
                    i.volline(style="border-color:#002b64")
                    | {{ $t('report.threeWayForecast.assume.volatility.legendActual') }}
                  span
                    i.volline.is-dashed(style="border-color:#0070c0")
                    | {{ $t('report.threeWayForecast.assume.volatility.legendForecast') }}
                  span
                    span.voldot.is-ring
                    | {{ $t('report.threeWayForecast.assume.volatility.legendOutside') }}
                  span
                    span.voldot(style="background:#ff9900")
                    | {{ $t('report.threeWayForecast.assume.volatility.legendSecond') }}
                  span
                    span.voldot(style="background:#ff0000")
                    | {{ $t('report.threeWayForecast.assume.volatility.legendThird') }}

                //- The two bands, Mike's ruling of 2026-09-03: amber beyond the second
                //- deviation, red beyond the third, and the red one sits ABOVE the amber
                //- so the stronger statement is never buried under the milder one.
                .crit-note(v-if="redBand")
                  strong {{ redBand.title }}
                  br
                  | {{ redBand.body }}
                .warn-note(v-if="amberBand")
                  strong {{ amberBand.title }}
                  br
                  | {{ amberBand.body }}

                p.volplain(v-if="seasonalSentence") {{ seasonalSentence }}

                a.vollink(href="/volatility" target="_blank" rel="noopener") {{ $t('report.threeWayForecast.assume.volatility.openReport') }} ›

                p.volwhy {{ $t('report.threeWayForecast.assume.volatility.bandsAreHistory') }}

              //- A failed recompute must never leave figures on screen looking live.
              .crit-note(v-else-if="volatilityStale")
                strong {{ $t('report.threeWayForecast.assume.volatility.staleTitle') }}
                br
                | {{ $t('report.threeWayForecast.assume.volatility.staleBody') }}
                br
                b-button(size="is-small" @click="refreshVolatility") {{ $t('report.threeWayForecast.assume.volatility.retry') }}

          //- The two-year trend read. Built from the approved drawing
          //- design/mockups/three-way-forecast-trend.html (approved 2026-09-03, item
          //- 4.61b), and placed directly under the volatility read: both lay the client's
          //- own history against what is being forecast, and they read as one pair.
          //-
          //- 🔴 IT IS NOT DRAWN AT ALL WITHOUT LAST YEAR. No empty frame, no greyed table,
          //- no "no data" where a reading should be — one line saying what to drop.
          .tw-group(v-if="trend")
            .trendblock(v-if="trend.available")
              .tw-glabel
                span.tw-dot
                h2.tw-h2 {{ $t('report.threeWayForecast.assume.trend.heading') }}
              p.trendsub {{ $t('report.threeWayForecast.assume.trend.sub') }}

              .trendtbl
                .tblwrap
                  table
                    thead
                      tr
                        th {{ $t('report.threeWayForecast.assume.trend.measure') }}
                        th {{ $t('report.threeWayForecast.assume.trend.lastYear') }}
                        th {{ $t('report.threeWayForecast.assume.trend.thisYear') }}
                        th {{ $t('report.threeWayForecast.assume.trend.movement') }}
                        th &nbsp;
                    tbody
                      tr(
                        v-for="m in trend.measures"
                        :key="m.key"
                        :class="trendRowClass(m)")
                        td.meas
                          | {{ $t('report.threeWayForecast.assume.trend.name.' + m.key) }}
                          small {{ $t('report.threeWayForecast.assume.trend.about.' + m.key) }}
                        td {{ trendValue(m, m.prior) }}
                        td {{ trendValue(m, m.current) }}
                        td.mv(:class="trendMoveClass(m)") {{ trendMovement(m) }}
                        td
                          span.band(:class="'band-' + (m.band || 'none')")
                            | {{ $t('report.threeWayForecast.assume.trend.band.' + (m.band || 'none')) }}

              //- One red note naming the worst measure, then one amber note gathering the
              //- rest — the register Mike ruled for the volatility block, for the same
              //- reason: a lender reads this document.
              .crit-note(v-if="trendWorst")
                strong {{ trendWorstTitle }}
                br
                | {{ $t('report.threeWayForecast.assume.trend.critBody') }}
              .warn-note(v-if="trendWarned.length")
                strong
                  | {{ $tc('report.threeWayForecast.assume.trend.warnTitle', trendWarned.length, { n: trendWarned.length }) }}
                br
                | {{ $t('report.threeWayForecast.assume.trend.warnBody') }}

              p.volwhy(v-if="!trend.periodsCertain") {{ $t('report.threeWayForecast.assume.trend.periodsUnchecked') }}
              //- A row that is absent says why, once, beneath the table. Without this a
              //- client with no stock simply gets a shorter table than the next one and
              //- nothing accounts for the difference.
              p.volwhy(v-if="trend.needsBalanceSheet") {{ $t('report.threeWayForecast.assume.trend.needBalanceSheet') }}
              p.volwhy(v-else-if="trendOmittedSentence") {{ trendOmittedSentence }}
              p.volwhy {{ $t('report.threeWayForecast.assume.trend.whereFrom') }}

            //- Two years that are not a like-for-like year apart are refused outright: a
            //- nine-month period against a twelve-month one gives a growth figure that is
            //- completely believable and completely wrong.
            .warn-note(v-else-if="trend.blocked === 'PERIODS_NOT_COMPARABLE'")
              strong {{ $t('report.threeWayForecast.assume.trend.notComparableTitle') }}
              br
              | {{ $t('report.threeWayForecast.assume.trend.notComparableBody') }}

            p.volwhy(v-else) {{ $t('report.threeWayForecast.assume.trend.dropToSee') }}

          .tw-group
            .tw-glabel
              span.tw-dot
              h2.tw-h2 {{ $t('report.threeWayForecast.assume.purchasesHeading') }}
            .mgrid
              .m(v-for="(label, i) in monthLabels" :key="'p' + i")
                span.lbl {{ label }}
                b-input(v-model.number="form.purchases[i]" type="number" step="any" size="is-small")

          //- Buying and selling overseas. Built from the approved drawing
          //- design/mockups/three-way-forecast-international.html (approved 2026-09-04).
          //- Everything below the tick is hidden until it is ticked, so a business that
          //- trades only at home sees exactly the screen it saw before.
          .tw-group
            .tickrow
              b-checkbox(v-model="form.overseas.enabled") {{ $t('report.threeWayForecast.assume.overseas.tick') }}
            .tw-foot(v-if="!form.overseas.enabled") {{ $t('report.threeWayForecast.assume.overseas.tickHint') }}

            .sectionbox(v-if="form.overseas.enabled")
              //- ── Stock arriving from overseas ──
              .subgroup
                h3.subh {{ $t('report.threeWayForecast.assume.overseas.importHeading') }}
                .termhead {{ $t('report.threeWayForecast.assume.overseas.landingLabel') }}
                .mgrid
                  .m(v-for="(label, i) in monthLabels" :key="'ip' + i")
                    span.lbl {{ label }}
                    b-input(
                      v-model.number="form.overseas.importedPurchases[i]"
                      type="number" step="any" size="is-small")

                p.tblnote {{ $t('report.threeWayForecast.assume.overseas.landingNote') }}

                //- The deposit that fell before the forecast began. Mike's ruling of
                //- 2026-09-04: warn, and leave the cash out. It moves no figure.
                .warn-note(v-if="depositsBeforeStart.length")
                  strong {{ $t('report.threeWayForecast.assume.overseas.earlyDepositHeading') }}
                  |  {{ earlyDepositSentence }}

                .termgrid
                  div
                    .termhead {{ $t('report.threeWayForecast.assume.overseas.payingHeading') }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.deposit') }}
                      b-input(v-model.number="form.overseas.depositPct" type="number" step="any" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.depositLead') }}
                      b-select(v-model.number="form.overseas.depositLeadMonths" size="is-small" expanded)
                        option(v-for="n in leadMonthOptions" :key="'dl' + n" :value="n") {{ $tc('report.threeWayForecast.assume.overseas.monthsBefore', n, { count: n }) }}
                    .termhead {{ $t('report.threeWayForecast.assume.overseas.balanceHeading') }}
                    .field(v-for="(bucketLabel, i) in landingBucketLabels" :key="'bp' + i")
                      .fieldlab
                        span {{ $t(bucketLabel) }}
                      b-input(v-model.number="form.overseas.balancePayment[i]" type="number" step="any" size="is-small")
                    .tw-foot(:class="balanceTotal === 100 ? 'is-good' : 'is-crit'")
                      | {{ balanceTotal === 100 ? $t('report.threeWayForecast.assume.addsUp') : $t('report.threeWayForecast.assume.doesNotAddUp', { total: pct(balanceTotal) }) }}
                  div
                    .termhead {{ $t('report.threeWayForecast.assume.overseas.gettingHereHeading') }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.freight') }}
                      b-input(v-model.number="form.overseas.freightPct" type="number" step="any" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.duty') }}
                      b-input(v-model.number="form.overseas.dutyPct" type="number" step="any" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.fxAllowance') }}
                      b-input(v-model.number="form.overseas.fxAllowancePct" type="number" step="any" size="is-small")
                    .tw-foot {{ $t('report.threeWayForecast.assume.overseas.gettingHereNote') }}

                //- How it sells down. The ladder is the mentor's content, shown so the
                //- advisor can see what is being applied to their client's stock.
                .termhead {{ $t('report.threeWayForecast.assume.overseas.sellDownHeading') }}
                .termgrid
                  div
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.newPrice') }}
                        provenance-badge(
                          source="seeded"
                          :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                          :entered-label="$t('report.threeWayForecast.confirm.entered')"
                          :seeded-label="$t('report.threeWayForecast.assume.overseas.fromMentor')"
                          size="sm")
                      b-input(v-model.number="form.overseas.sellDown.newMarkup" type="number" step="any" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.standardPrice') }}
                        //- All three rungs come from the same tab, so all three say so. The
                        //- drawing tags each of them; only the first was built.
                        provenance-badge(
                          source="seeded"
                          :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                          :entered-label="$t('report.threeWayForecast.confirm.entered')"
                          :seeded-label="$t('report.threeWayForecast.assume.overseas.fromMentor')"
                          size="sm")
                      b-input(v-model.number="form.overseas.sellDown.standardMarkup" type="number" step="any" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.runoutPrice') }}
                        provenance-badge(
                          source="seeded"
                          :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                          :entered-label="$t('report.threeWayForecast.confirm.entered')"
                          :seeded-label="$t('report.threeWayForecast.assume.overseas.fromMentor')"
                          size="sm")
                      b-input(v-model.number="form.overseas.sellDown.runoutMarkup" type="number" step="any" size="is-small")
                  div
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.howFast') }}
                      b-select(v-model="form.overseas.sellDown.pattern" size="is-small" expanded)
                        option(v-for="p in sellDownPatterns" :key="p.name" :value="p.name") {{ p.name }}
                    .tw-foot {{ patternSentence }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.readyAfter') }}
                      b-select(v-model.number="form.overseas.readyAfterMonths" size="is-small" expanded)
                        option(:value="0") {{ $t('report.threeWayForecast.assume.overseas.readySameMonth') }}
                        option(:value="1") {{ $t('report.threeWayForecast.assume.overseas.readyMonthAfter') }}

                //- ── What that stock will sell for ──
                //- Mike's ruling of 2026-09-04: the revenue is WORKED OUT, never typed —
                //- and seeded where the advisor can override it, which was chosen over a
                //- locked figure so a signed order at a known price has somewhere to go.
                //- Clearing a box puts the worked-out figure back, so there is no undo to find.
                .fieldlab.orev-head
                  span {{ $t('report.threeWayForecast.assume.overseas.revenueHeading') }}
                  provenance-badge(
                    :source="importedRevenueSource"
                    :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                    :entered-label="$t('report.threeWayForecast.confirm.entered')"
                    :seeded-label="$t('report.threeWayForecast.assume.overseas.revenueWorkedOut')"
                    size="sm")
                .mgrid
                  .m(v-for="(label, i) in monthLabels" :key="'orev' + i")
                    span.lbl {{ label }}
                    b-input(
                      :value="importedRevenueShown[i]"
                      @input="setImportedRevenue(i, $event)"
                      type="number" step="any" size="is-small")
                .tw-foot {{ $t('report.threeWayForecast.assume.overseas.revenueNote') }}
                .tw-foot.is-crit(v-if="revenueBeyondYear > 0")
                  | {{ $t('report.threeWayForecast.assume.overseas.revenueBeyondYear', { amount: money(revenueBeyondYear) }) }}

              //- ── Sales to overseas customers ──
              .subgroup
                h3.subh {{ $t('report.threeWayForecast.assume.overseas.exportHeading') }}
                .termhead {{ $t('report.threeWayForecast.assume.overseas.exportLabel') }}
                .mgrid
                  .m(v-for="(label, i) in monthLabels" :key="'os' + i")
                    span.lbl {{ label }}
                    b-input(
                      v-model.number="form.overseas.overseasSales[i]"
                      type="number" step="any" size="is-small")

                .termgrid
                  div
                    .termhead {{ $t('report.threeWayForecast.assume.overseas.gettingThereHeading') }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.deliveryLag') }}
                      b-select(v-model.number="form.overseas.deliveryLagMonths" size="is-small" expanded)
                        option(v-for="n in deliveryLagOptions" :key="'dg' + n" :value="n") {{ $tc('report.threeWayForecast.assume.overseas.monthsAfter', n, { count: n }) }}
                    .tickrow
                      b-checkbox(v-model="form.overseas.zeroRated") {{ $t('report.threeWayForecast.assume.overseas.zeroRated') }}
                    .tw-foot {{ $t('report.threeWayForecast.assume.overseas.zeroRatedHint') }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.salesFxAllowance') }}
                      b-input(v-model.number="form.overseas.salesFxAllowancePct" type="number" step="any" size="is-small")
                    .tw-foot {{ $t('report.threeWayForecast.assume.overseas.salesFxHint') }}
                  div
                    .termhead {{ $t('report.threeWayForecast.assume.overseas.thenTheyPayHeading') }}
                    .field(v-for="(bucketLabel, i) in deliveryBucketLabels" :key="'oc' + i")
                      .fieldlab
                        span {{ $t(bucketLabel) }}
                      b-input(v-model.number="form.overseas.overseasCollection[i]" type="number" step="any" size="is-small")
                    .tw-foot(:class="overseasCollectionTotal === 100 ? 'is-good' : 'is-crit'")
                      | {{ overseasCollectionTotal === 100 ? $t('report.threeWayForecast.assume.addsUp') : $t('report.threeWayForecast.assume.doesNotAddUp', { total: pct(overseasCollectionTotal) }) }}
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.overseas.overseasMarkup') }}
                      b-input(
                        v-model.number="form.overseas.overseasMarkup"
                        type="number" step="any" size="is-small"
                        :placeholder="String(form.markup)")
                    .tw-foot {{ $t('report.threeWayForecast.assume.overseas.overseasMarkupHint') }}

                //- ── Fill these from actual shipments (item 4.64 slice 2) ───────
                //- The Import & Retail workbook as a CALCULATOR, not a second screen.
                //- Every date is worked out from the order date on the supplier's own
                //- terms and shown, never picked — Mike's ruling of 2026-09-04, and the
                //- correction that ruling made to the drawing is recorded on the drawing.
                //- The arithmetic is the backend's (`/api/report/import-shipments`);
                //- this panel renders the answer and decides nothing.
                .subgroup.ship-panel
                  .subh
                    span {{ $t('report.threeWayForecast.assume.shipments.heading') }}
                  .tw-foot(style="margin-bottom:10px") {{ $t('report.threeWayForecast.assume.shipments.intro') }}

                  //- The badge belongs to the WHOLE terms block, not to its first field. It
                  //- was on `manufactureDays` alone, where it both implied the other three
                  //- were the advisor's and — in a four-column grid — overflowed its cell
                  //- onto the next label. All seven come from the mentor's tab together.
                  .fieldlab.shipterms-head
                    span.termhead {{ $t('report.threeWayForecast.assume.shipments.termsHeading') }}
                    provenance-badge(
                      source="seeded"
                      :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                      :entered-label="$t('report.threeWayForecast.confirm.entered')"
                      :seeded-label="$t('report.threeWayForecast.assume.overseas.fromMentor')"
                      size="sm")
                  .shipterms
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.shipments.manufactureDays') }}
                      b-input(v-model.number="form.overseas.shipmentTerms.manufactureDays" type="number" step="1" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.shipments.balanceDueDays') }}
                      b-input(v-model.number="form.overseas.shipmentTerms.balanceDueDays" type="number" step="1" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.shipments.prepDays') }}
                      b-input(v-model.number="form.overseas.shipmentTerms.prepDays" type="number" step="1" size="is-small")
                    .field
                      .fieldlab
                        span {{ $t('report.threeWayForecast.assume.shipments.interestCover') }}
                      b-input(v-model.number="form.overseas.shipmentTerms.interestCoverPct" type="number" step="any" size="is-small")
                  .tw-foot(style="margin-bottom:12px") {{ $t('report.threeWayForecast.assume.shipments.termsNote', { sea: form.overseas.shipmentTerms.seaDays, air: form.overseas.shipmentTerms.airDays, express: form.overseas.shipmentTerms.expressDays }) }}

                  .shiprow.head(v-if="form.overseas.shipments.length")
                    span {{ $t('report.threeWayForecast.assume.shipments.description') }}
                    span {{ $t('report.threeWayForecast.assume.shipments.cost') }}
                    span {{ $t('report.threeWayForecast.assume.shipments.ordered') }}
                    span {{ $t('report.threeWayForecast.assume.shipments.deposit') }}
                    span {{ $t('report.threeWayForecast.assume.shipments.speed') }}
                    span {{ $t('report.threeWayForecast.assume.shipments.workedOut') }}
                    span

                  .shiprow(v-for="(s, i) in form.overseas.shipments" :key="'ship' + i")
                    b-input(v-model="s.description" size="is-small" :placeholder="$t('report.threeWayForecast.assume.shipments.descriptionPlaceholder')")
                    b-input(v-model.number="s.cost" type="number" step="any" size="is-small")
                    b-input(v-model="s.orderDate" type="date" size="is-small")
                    b-input(v-model.number="s.depositPct" type="number" step="any" size="is-small")
                    b-select(v-model="s.speed" size="is-small" expanded)
                      option(v-for="sp in shipmentSpeeds" :key="sp" :value="sp") {{ $t('report.threeWayForecast.assume.shipments.speed' + sp) }}
                    .ship-derived(v-if="shipmentRow(i)")
                      | {{ $t('report.threeWayForecast.assume.shipments.lands', { date: shipmentRow(i).landsOn }) }}
                      small {{ shipmentWorking(i) }}
                    .ship-derived.is-empty(v-else) {{ $t('report.threeWayForecast.assume.shipments.needsADate') }}
                    b-button(
                      size="is-small" type="is-text"
                      @click="removeShipment(i)") {{ $t('report.threeWayForecast.assume.shipments.remove') }}

                  .tw-foot(v-if="!form.overseas.shipments.length" style="margin-bottom:10px") {{ $t('report.threeWayForecast.assume.shipments.none') }}

                  b-button(size="is-small" type="is-light" @click="addShipment") {{ $t('report.threeWayForecast.assume.shipments.add') }}

                  //- A container landing after the twelfth month is not this forecast's
                  //- stock and neither is its cash. Said in words rather than dropped —
                  //- otherwise an advisor enters a shipment and nothing at all happens.
                  b-message.mt-3(v-if="shipmentsBeyondYear.length" type="is-warning" size="is-small")
                    | {{ $t('report.threeWayForecast.assume.shipments.beyondYear', { count: shipmentsBeyondYear.length }) }}

                  .tw-foot(v-if="shipmentsDrive" style="margin-top:10px") {{ $t('report.threeWayForecast.assume.shipments.driving') }}

          //- Buying and selling capital assets. Built from the approved drawing
          //- design/mockups/three-way-forecast-capital.html (approved 2026-09-03).
          .tw-group
            .tw-glabel
              span.tw-dot
              h2.tw-h2 {{ $t('report.threeWayForecast.assume.capital.heading') }}

            .caprow.head(v-if="form.capital.length")
              span {{ $t('report.threeWayForecast.assume.capital.what') }}
              span {{ $t('report.threeWayForecast.assume.capital.category') }}
              span {{ $t('report.threeWayForecast.assume.capital.month') }}
              span {{ $t('report.threeWayForecast.assume.capital.direction') }}
              span {{ $t('report.threeWayForecast.assume.capital.price') }}
              span {{ $t('report.threeWayForecast.assume.capital.bookValue') }}
              span

            .caprow(
              v-for="(row, i) in form.capital"
              :key="'cap' + i"
              :class="{ 'row-invalid': capitalNegativeRows.indexOf(i + 1) !== -1 }")
              b-input(
                v-model="row.what"
                size="is-small"
                :placeholder="$t('report.threeWayForecast.assume.capital.whatPlaceholder')")
              b-select(v-model.number="row.category" size="is-small" expanded)
                option(v-for="c in capitalCategories" :key="c.index" :value="c.index") {{ c.label }}
              b-select(v-model.number="row.month" size="is-small" expanded)
                option(v-for="(label, m) in monthLabels" :key="'cm' + m" :value="m") {{ label }}
              .seg.seg-sm
                button(
                  type="button"
                  :class="{ on: row.direction === 'buy' }"
                  @click="row.direction = 'buy'") {{ $t('report.threeWayForecast.assume.capital.buy') }}
                button(
                  type="button"
                  :class="{ on: row.direction === 'sell' }"
                  @click="row.direction = 'sell'") {{ $t('report.threeWayForecast.assume.capital.sell') }}
              b-input(v-model.number="row.price" type="number" step="any" size="is-small")
              .capbook
                b-input(
                  v-if="row.direction === 'sell'"
                  v-model.number="row.bookValue"
                  type="number"
                  step="any"
                  size="is-small")
                span.capcarried(v-if="row.direction === 'sell'")
                  | {{ $t('report.threeWayForecast.assume.capital.carriedAt', { category: $t('report.threeWayForecast.confirm.assets.' + form.assets[row.category].key), amount: money(categoryOpening(row.category)) }) }}
              b-button(
                size="is-small"
                type="is-text"
                :aria-label="$t('report.threeWayForecast.assume.capital.remove')"
                :title="$t('report.threeWayForecast.assume.capital.remove')"
                @click="removeCapitalRow(i)") ✕

            p.capempty(v-if="!form.capital.length") {{ $t('report.threeWayForecast.assume.capital.nothingPlanned') }}

            b-button.capadd(size="is-small" @click="addCapitalRow") {{ $t('report.threeWayForecast.assume.capital.add') }}

            template(v-if="form.capital.length")
              .captot
                span {{ $t('report.threeWayForecast.assume.capital.buyingThisYear') }}
                span {{ money(capitalBuyTotal) }}
              .captot.captot-second
                span {{ $t('report.threeWayForecast.assume.capital.sellingThisYear') }}
                span {{ money(capitalSellTotal) }}
              p.tw-note {{ $t('report.threeWayForecast.assume.capital.everyAmountPositive') }}
              p.tw-note {{ $t('report.threeWayForecast.assume.capital.gainOrLoss') }}

          .tw-group
            .tw-glabel
              span.tw-dot
              h2.tw-h2 {{ $t('report.threeWayForecast.assume.overheadsHeading') }}
            .tw-tblwrap
              table.confirm-table
                thead
                  tr
                    th {{ $t('report.threeWayForecast.assume.overhead') }}
                    th.num {{ $t('report.threeWayForecast.assume.aYear') }}
                tbody
                  tr(v-for="key in overheadKeys" :key="key")
                    td {{ $t('report.threeWayForecast.assume.overheads.' + key) }}
                    td.num
                      .cell
                        b-input(
                          v-model.number="form.overheads[key].value"
                          type="number"
                          step="any"
                          size="is-small"
                          @input="markEntered('overheads.' + key)")
                        provenance-badge(
                          :source="form.overheads[key].source"
                          :file-label="$t('report.threeWayForecast.confirm.fromFile')"
                          :entered-label="$t('report.threeWayForecast.confirm.entered')"
                          size="sm"
                          spaced)
            .warn-note(v-for="(w, i) in warnings" :key="'aw' + i") ⚠ {{ w }}

        p.err(v-if="buildError") {{ buildError }}
        .tw-actions
          b-button(type="is-primary" @click="buildForecast") {{ $t('report.threeWayForecast.assume.build') }}
          b-button(@click="backToConfirm") {{ $t('report.threeWayForecast.assume.back') }}
</template>

<script>
/**
 * ThreeWayForecastIntake — steps 1, 2 and 3 of the Three-Way Forecast: drop the
 * accounting exports, confirm the position the forecast opens from, then set the
 * assumptions. Step 4, the forecast itself, is `ThreeWayForecastReport.vue`.
 *
 * Parsing is backend-only (`POST /api/report/three-way-forecast/intake`, firmAuth). This
 * component uploads the files and renders what the backend proposes; it never reads a
 * file itself. Built from the approved drawing `design/mockups/three-way-forecast.html`
 * (wording approved by Mike 2026-09-02).
 *
 * 🔴 WHY THIS SCREEN SHOWS MORE FIGURES THAN THE DRAWING — Mike's ruling, 2026-09-03.
 * `resolveInputs` in server/report/threeWayForecastModel.js merges whatever arrives over
 * the source workbook's own sample, so ANY figure a screen does not collect silently
 * keeps Big Bird Grass Seed's value. Built exactly as drawn, a client's forecast would
 * have carried a 10% sales commission, 3% freight, 7% overdraft interest, two opening
 * balance-sheet lines and nine overhead lines that nobody could see or change. His
 * ruling: put them all on the screen. So:
 *
 *   - the opening table shows ALL 17 balance-sheet lines, not the 10 the sample file
 *     happened to fill, because a line the file missed has to be typeable;
 *   - the overheads table shows ALL 23, not 14;
 *   - the four direct-cost rates and three interest rates get their own two cards;
 *   - `buildInputs()` sends EVERY key the model takes, explicitly. The test
 *     `sends every figure the engine takes` pins that, and it is the guard that stops
 *     this coming back — a leaked default looks exactly like a working forecast.
 *
 * MONEY DEFAULTS TO ZERO, RATES DEFAULT TO THE PLATFORM'S. A balance-sheet line or an
 * overhead the file did not supply is genuinely absent, so it starts at 0 and nothing is
 * invented. A rate — depreciation, tax, GST, collection, interest — is never in an export
 * at all and has to start somewhere, so it starts on the platform value, visible and
 * tagged for the advisor to change. That is the drawing's own rule for depreciation
 * ("all six start on the platform defaults for you to change"), applied consistently.
 */
import SELL_DOWN from '~/data/forecast-sell-down.json'
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import VolatilityDial from '~/components/base/VolatilityDial.vue'
import currencyMixin from '~/mixins/currencyMixin'

/**
 * The mentor's price ladder as THIS SCREEN holds it — percentages, because every other rate
 * on this form is a whole number and is divided on the way out.
 *
 * 🔴 IT TAKES THE FIGURES FROM THE DATA FILE RATHER THAN RESTATING THEM. Until 2026-09-04
 * the six numbers were typed here as literals as well as living in
 * `data/forecast-sell-down.json`, which the engine reads — two homes for one fact, agreeing
 * only by luck. Change one and a forecast would price stock at the mentor's figure while
 * this screen still showed the stale one.
 *
 * The rounding is not decoration: 1.85 x 100 is 185.00000000000003 in floating point, and
 * that is what would have appeared in the advisor's box.
 *
 * @param {object} src - a `{ladder, defaultPattern}` shape: the shipped file, or the
 *   resolved ladder the backend returned for this scope.
 * @returns {object} the form's `overseas.sellDown` block.
 */
function sellDownForm (src) {
  const base = SELL_DOWN.ladder
  const l = (src && src.ladder) || base
  const pct = (v, d) => Math.round((typeof v === 'number' ? v : d) * 10000) / 100
  const day = (v, d) => (typeof v === 'number' ? v : d)
  return {
    newMarkup: pct(l.newMarkup, base.newMarkup),
    standardMarkup: pct(l.standardMarkup, base.standardMarkup),
    runoutMarkup: pct(l.runoutMarkup, base.runoutMarkup),
    newUpToDays: day(l.newUpToDays, base.newUpToDays),
    standardUpToDays: day(l.standardUpToDays, base.standardUpToDays),
    runoutUpToDays: day(l.runoutUpToDays, base.runoutUpToDays),
    pattern: (src && src.defaultPattern) || SELL_DOWN.defaultPattern
  }
}

/**
 * The supplier's terms as the form holds them — the mentor's figures, or the shipped ones.
 *
 * 🔴 THESE USED TO BE HARDCODED HERE, under a badge on screen saying they came from platform
 * settings. Nothing could edit them and no screen held them, so the badge was untrue. Made
 * editable on Mike's instruction of 2026-09-04; they now live in `data/forecast-sell-down.json`
 * beside the ladder and reach this form the same way it does.
 *
 * Days pass through; interest cover is stored as a decimal and shown as a percentage, the
 * same convention as the markups and as every other rate on this form.
 *
 * @param {object} src - the resolved sell-down block the backend returned, or the shipped file.
 * @returns {object} the form's `overseas.shipmentTerms` block.
 */
function shipmentTermsForm (src) {
  const base = SELL_DOWN.terms
  const t = (src && src.terms) || base
  const day = (v, d) => (typeof v === 'number' ? v : d)
  const pct = (v, d) => Math.round((typeof v === 'number' ? v : d) * 10000) / 100
  return {
    manufactureDays: day(t.manufactureDays, base.manufactureDays),
    balanceDueDays: day(t.balanceDueDays, base.balanceDueDays),
    prepDays: day(t.prepDays, base.prepDays),
    interestCoverPct: pct(t.interestCoverPct, base.interestCoverPct),
    seaDays: day(t.seaDays, base.seaDays),
    airDays: day(t.airDays, base.airDays),
    expressDays: day(t.expressDays, base.expressDays)
  }
}

/** Every opening balance-sheet line the model takes, in the order the screen shows them. */
const OPENING_KEYS = [
  'cashAtBank', 'bankOverdraft', 'accountsReceivable', 'inventory', 'prepayments',
  'gstRefund', 'incomeTaxRefundDue', 'otherCurrentAsset', 'accountsPayable',
  'accruedExpenses', 'gstPayable', 'incomeTaxPayable', 'otherCurrentLiability',
  'otherNonCurrentLiability', 'authorisedCapital', 'retainedEarnings', 'capitalGain'
]

/** The six fixed-asset categories, and the platform depreciation rate for each (%). */
const ASSET_SPECS = [
  { key: 'vehicles', rate: 20 },
  { key: 'leaseholdImprovements', rate: 15 },
  { key: 'plantEquipment', rate: 22 },
  { key: 'officeEquipment', rate: 25 },
  { key: 'computerHardware', rate: 30 },
  { key: 'other', rate: 35 }
]

/** The 23 overhead lines the model takes. */
const OVERHEAD_KEYS = [
  'accLevies', 'accountancy', 'advertising', 'bankCharges', 'computerExpenses',
  'generalExpenses', 'insurance', 'interestIrd', 'occupancy', 'power', 'printing',
  'rent', 'repairs', 'shareholderSalaries', 'subscriptions', 'telephone', 'vehicle',
  'wages', 'otherOne', 'otherTwo', 'otherThree', 'otherFour', 'otherFive'
]

const MONTHS = 12
/**
 * The windows `volatilityModel.js` measures. The block takes the LARGEST that the months
 * in hand support — see `volatilityWindow`.
 */
const VOLATILITY_WINDOWS = [24, 18, 12]
/** How long the block waits after a keystroke before asking the backend again. */
const VOLATILITY_DEBOUNCE_MS = 400
/** The chart's drawing box, matching the approved drawing's own SVG. */
const CHART = { left: 70, right: 640, top: 40, bottom: 380 }
const LOAN_COUNT = 3
const SHAREHOLDER_COUNT = 4
/** A Balance Sheet, a Profit and Loss, and up to two by-month P&Ls — the route's own limit. */
const MAX_UPLOAD_FILES = 4
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Short month names for the twelve-month grids — the result screen uses the same list. */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A twelve-long run of zeroes — the model's own `zeroes()`, on this side of the wire. */
function zeroes () {
  const out = []
  for (let i = 0; i < MONTHS; i++) { out.push(0) }
  return out
}

/** A figure with its provenance. @param {number} value @param {string} source */
function tagged (value, source) {
  return { value, source: source || 'entered', candidates: [] }
}

export default {
  name: 'ThreeWayForecastIntake',

  components: { ProvenanceBadge, VolatilityDial },

  mixins: [currencyMixin],

  props: {
    /** Verified login pass (JWT); the intake route is firmAuth-guarded. */
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** The page's current step (1 drop, 2 confirm, 3 assumptions). */
    step: { type: Number, default: 1 },
    /**
     * The working state from a previous pass. Stepping back must never wipe what the
     * advisor confirmed, so the page hands the whole form back rather than the payload.
     */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      phase: this.restore && this.step !== 1 ? this.phaseFor(this.step) : 'drop',
      chosen: [],
      uploading: false,
      dropError: null,
      blocked: null,
      buildError: null,
      warnings: [],
      invalid: [],
      // The volatility read. `null` until the backend answers; `volatilityStale` is the
      // failure state, because figures describing the previous inputs while looking live
      // are worse than no figures at all.
      volatility: null,
      volatilityStale: false,
      volatilityTimer: null,
      /**
       * What the shipment calculator last returned (item 4.64 slice 2). It is NOT on the
       * form: every figure in it is derived from the shipments and the terms, and a derived
       * value stored beside its inputs is a value that can disagree with them. A restored
       * session recomputes from the shipments it was saved with.
       */
      shipmentResult: { rows: [], importedPurchases: [], deposits: [], balances: [], interest: [], landings: [], beyondYear: [] },
      shipmentTimer: null,
      /**
       * What the price ladder makes of the stock landing each month, from the backend. NOT
       * on the form, for the same reason `shipmentResult` is not: it is derived from the
       * landings and the ladder, and a derived value stored beside its inputs is one that
       * can disagree with them. What the advisor TYPES over it lives on the form, because
       * that is a decision rather than a derivation.
       */
      importedRevenueWorked: new Array(12).fill(0),
      /** Revenue from stock that only finishes selling after the twelfth month. */
      revenueBeyondYear: 0,
      revenueTimer: null,
      // A restored form is this component's own state coming back from the page, but it
      // is normalised anyway: a form saved before the capital block existed has no rows,
      // and an undefined list would break the group rather than show it empty.
      form: this.restoredForm()
    }
  },

  computed: {
    openingKeys () { return OPENING_KEYS },
    overheadKeys () { return OVERHEAD_KEYS },

    /**
     * The file slots. The approved drawing names three; the fourth — last year's by-month
     * export — is the ninth recorded difference from it (Mike's word, 2026-09-03), and it
     * is a slot of its own rather than a sentence on the third because an advisor has to
     * see that two may be dropped.
     *
     * The fifth and sixth — last year's ANNUAL Balance Sheet and Profit and Loss — are the
     * two-year trend read (item 4.61b, drawing approved 2026-09-03). Mike chose slots over
     * a comparative-column export: a comparative file would need the parser taught to read
     * a second figure column as a prior period, which means going near the guard that stops
     * a two-year export being read as one year. Both are OPTIONAL, and that is the point of
     * the design — an advisor who drops the first four gets exactly the screen they had.
     */
    slotSpecs () {
      return [
        { key: 'bs', required: true, titleKey: 'report.threeWayForecast.drop.bsTitle', whyKey: 'report.threeWayForecast.drop.bsWhy' },
        { key: 'pl', required: false, titleKey: 'report.threeWayForecast.drop.plTitle', whyKey: 'report.threeWayForecast.drop.plWhy' },
        { key: 'monthly', required: false, titleKey: 'report.threeWayForecast.drop.monthlyTitle', whyKey: 'report.threeWayForecast.drop.monthlyWhy' },
        { key: 'monthlyPrior', required: false, titleKey: 'report.threeWayForecast.drop.monthlyPriorTitle', whyKey: 'report.threeWayForecast.drop.monthlyPriorWhy' },
        { key: 'bsPrior', required: false, titleKey: 'report.threeWayForecast.drop.bsPriorTitle', whyKey: 'report.threeWayForecast.drop.bsPriorWhy' },
        { key: 'plPrior', required: false, titleKey: 'report.threeWayForecast.drop.plPriorTitle', whyKey: 'report.threeWayForecast.drop.plPriorWhy' }
      ]
    },

    /**
     * The two-year trend read as the backend banded it, or null when there is nothing to
     * show. Read-only throughout — see the note on `form.trend`.
     * @returns {object|null}
     */
    trend () {
      return this.form.trend || null
    },

    /**
     * The single worst measure, for the red note. ONE only, deliberately: three red
     * paragraphs is a screen nobody finishes, and the table above already names them all.
     * The worst is the first red in screen order, which is Mike's own ordering.
     * @returns {object|null}
     */
    trendWorst () {
      if (!this.trend || !this.trend.available) { return null }
      return this.trend.measures.filter(m => m.band === 'crit')[0] || null
    },

    /** The red note's opening sentence, naming the measure and both its years. */
    trendWorstTitle () {
      const m = this.trendWorst
      if (!m) { return '' }
      return this.$t('report.threeWayForecast.assume.trend.critTitle', {
        name: this.$t('report.threeWayForecast.assume.trend.name.' + m.key),
        current: this.trendValue(m, m.current),
        prior: this.trendValue(m, m.prior)
      })
    },

    /**
     * One sentence naming the rows that are not on the table and the figure each wanted.
     *
     * '' when nothing was left out, and '' as well when the whole day-count set is missing
     * for want of last year's Balance Sheet — that case has its own line, which tells the
     * advisor what to do about it rather than merely what is absent.
     * @returns {string}
     */
    trendOmittedSentence () {
      if (!this.trend || !this.trend.available) { return '' }
      const rows = this.trend.omitted || []
      if (!rows.length) { return '' }
      const named = rows.map(r => this.$t('report.threeWayForecast.assume.trend.omittedOne', {
        name: this.$t('report.threeWayForecast.assume.trend.name.' + r.key),
        figure: this.$t('report.threeWayForecast.assume.trend.figure.' + (r.missing || 'unknown'))
      }))
      return this.$t('report.threeWayForecast.assume.trend.omitted', { rows: named.join('; ') })
    },

    /** Every amber measure, gathered into one note rather than one note each. */
    trendWarned () {
      if (!this.trend || !this.trend.available) { return [] }
      return this.trend.measures.filter(m => m.band === 'warn')
    },

    /** The five collection buckets, both profiles reading the same labels. */
    bucketLabels () {
      return [
        'report.threeWayForecast.assume.sameMonth',
        'report.threeWayForecast.assume.monthAfter',
        'report.threeWayForecast.assume.twoMonths',
        'report.threeWayForecast.assume.threeMonths',
        'report.threeWayForecast.assume.fourMonths'
      ]
    },

    directCostFields () {
      return [
        { key: 'freight', label: 'report.threeWayForecast.assume.freight' },
        { key: 'commissions', label: 'report.threeWayForecast.assume.commissions' },
        { key: 'otherTwo', label: 'report.threeWayForecast.assume.otherDirect' },
        { key: 'otherDirectExempt', label: 'report.threeWayForecast.assume.otherDirectExempt' }
      ]
    },

    gstPeriodOptions () {
      return [
        { value: 'One Monthly', label: 'report.threeWayForecast.assume.gstMonthly' },
        { value: 'Two Monthly', label: 'report.threeWayForecast.assume.gstTwoMonthly' },
        { value: 'Six Monthly', label: 'report.threeWayForecast.assume.gstSixMonthly' }
      ]
    },

    gstBasisOptions () {
      return [
        { value: 'Invoice', label: 'report.threeWayForecast.assume.gstInvoice' },
        { value: 'Cash', label: 'report.threeWayForecast.assume.gstPayments' }
      ]
    },

    /** Month names from the forecast's own start date, so the grids read Apr…Mar. */
    monthLabels () {
      const start = this.startMonthIndex
      const out = []
      for (let i = 0; i < MONTHS; i++) { out.push(MONTH_SHORT[(start + i) % 12]) }
      return out
    },

    /** The month the forecast opens in, 0-based. Falls back to January. */
    startMonthIndex () {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(this.form.startDate || ''))
      return m ? (parseInt(m[2], 10) - 1) : 0
    },

    debtorTotal () { return this.sumOf(this.form.debtor) },
    creditorTotal () { return this.sumOf(this.form.creditor) },

    /* -- buying and selling overseas (4.64) ---------------------------------------- */

    /** The two profiles the overseas section adds, each validated to 100% like the rest. */
    balanceTotal () { return this.sumOf(this.form.overseas.balancePayment) },
    overseasCollectionTotal () { return this.sumOf(this.form.overseas.overseasCollection) },

    /** The demand patterns the mentor holds, for the chooser. */
    sellDownPatterns () { return SELL_DOWN.patterns },

    /** The three shipping speeds, in the workbook's own order — slowest first. */
    shipmentSpeeds () { return ['Sea', 'Air', 'Express'] },

    /**
     * Is the calculator actually driving this forecast? True the moment one shipment
     * resolves, which is also when the twelve landing boxes stop being the advisor's to
     * type — said on screen rather than left to be discovered.
     */
    shipmentsDrive () { return this.shipmentResult.landings.length > 0 },

    /** Shipments that land after the twelfth month, for the warning band. */
    shipmentsBeyondYear () { return this.shipmentResult.beyondYear },

    /** How far ahead a deposit may be paid. It reaches NINE months, because Mike's own
     *  Import & Retail workbook pays roughly 220 days before the first sale — capping it
     *  at something tidier would hide the very gap this section exists to show. */
    leadMonthOptions () { return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    deliveryLagOptions () { return [0, 1, 2, 3, 4] },

    /** The payment buckets, counted from the month the goods LAND. */
    landingBucketLabels () { return this.bucketLabels },

    /** The collection buckets, counted from DELIVERY rather than from the invoice. */
    deliveryBucketLabels () {
      return [
        'report.threeWayForecast.assume.overseas.onDelivery',
        'report.threeWayForecast.assume.overseas.afterDeliveryOne',
        'report.threeWayForecast.assume.overseas.afterDeliveryTwo',
        'report.threeWayForecast.assume.overseas.afterDeliveryThree',
        'report.threeWayForecast.assume.overseas.afterDeliveryFour'
      ]
    },

    /** The chosen pattern's four bands, said in words rather than left as a code. */
    patternSentence () {
      const p = SELL_DOWN.patterns.find(x => x.name === this.form.overseas.sellDown.pattern)
      if (!p) { return '' }
      return this.$t('report.threeWayForecast.assume.overseas.patternSentence', {
        name: p.name,
        bands: p.curve.map(v => Math.round(v * 100) + '%').join(' / ')
      })
    },

    /**
     * What each of the twelve revenue boxes shows: the advisor's figure where they have
     * typed one, otherwise the ladder's.
     *
     * ⚠ THE WORKED-OUT FIGURE IS DISPLAYED ROUNDED AND SENT UNROUNDED. Only an override
     * ever travels, and an override is what the advisor typed — so the sub-cent difference
     * between the number on screen and the number in the forecast can never be an input.
     * @returns {Array<number>}
     */
    importedRevenueShown () {
      return this.form.overseas.importedRevenueOverride.map((typed, i) => {
        if (typed !== null && typed !== '' && typed !== undefined) { return Number(typed) }
        return Math.round((this.importedRevenueWorked[i] || 0) * 100) / 100
      })
    },

    /**
     * How the block is badged: the ladder's own figures until the advisor changes one.
     *
     * It is deliberately one badge for the block rather than twelve, because the drawing
     * carries one tag on the heading. It says "somebody has typed here", not which month —
     * and the note beneath says how to put a month back.
     * @returns {string} 'seeded' | 'entered'
     */
    importedRevenueSource () {
      const typed = this.form.overseas.importedRevenueOverride
        .some(v => v !== null && v !== '' && v !== undefined)
      return typed ? 'entered' : 'seeded'
    },

    /**
     * Deposits whose lead time reaches back past the start of the forecast. Worked out on
     * the screen so the advisor is told BEFORE they build, not after — the cash is already
     * in their opening bank balance and is not counted again.
     */
    depositsBeforeStart () {
      const o = this.form.overseas
      if (!o.enabled) { return [] }
      const lead = Number(o.depositLeadMonths) || 0
      const out = []
      for (let m = 0; m < 12; m++) {
        const landed = Number(o.importedPurchases[m]) || 0
        if (landed && m - lead < 0) {
          out.push({
            month: this.monthLabels[m],
            amount: landed * (Number(o.depositPct) / 100) * (1 + Number(o.fxAllowancePct) / 100)
          })
        }
      }
      return out
    },

    /** The warning in one sentence, naming every month it applies to. */
    earlyDepositSentence () {
      const rows = this.depositsBeforeStart
      if (!rows.length) { return '' }
      const total = rows.reduce((a, r) => a + r.amount, 0)
      return this.$t('report.threeWayForecast.assume.overseas.earlyDepositBody', {
        amount: Math.round(total).toLocaleString(),
        months: rows.map(r => r.month).join(', ')
      })
    },
    salesTotal () { return this.sumOf(this.form.sales) },

    /**
     * The category dropdown, each showing the depreciation rate IN FORCE for this
     * forecast — Mike's ruling of 2026-09-03. Step 2 lets an advisor change all six, so
     * a list hardcoded to the platform's 20% would contradict the rate they had just set.
     */
    capitalCategories () {
      return this.form.assets.map((asset, i) => ({
        index: i,
        label: this.$t('report.threeWayForecast.confirm.assets.' + asset.key) +
          ' — ' + this.pct(Number(asset.rate) || 0)
      }))
    },

    capitalBuyTotal () {
      return this.sumOf(this.form.capital.filter(r => r.direction === 'buy').map(r => r.price))
    },

    capitalSellTotal () {
      return this.sumOf(this.form.capital.filter(r => r.direction === 'sell').map(r => r.price))
    },

    /**
     * Rows carrying a negative figure. The drawing's own rule: the Buy/Sell tick carries
     * the direction, so a minus sign is refused rather than guessed at — a negative price
     * ticked as a sale has two readings and the screen would have to pick one.
     * @returns {Array<number>} row positions, for the message and the row highlight
     */
    capitalNegativeRows () {
      const bad = []
      this.form.capital.forEach((row, i) => {
        const price = Number(row.price)
        const book = Number(row.bookValue)
        if (price < 0 || (row.direction === 'sell' && book < 0)) { bad.push(i + 1) }
      })
      return bad
    },

    /** The complete run of usable months the exports gave, oldest first. */
    historyMonths () {
      return Array.isArray(this.form.history) ? this.form.history : []
    },

    /**
     * How many months to measure: the LARGEST window the engine offers that the months in
     * hand support, and 0 when twelve complete months are not there.
     *
     * ⚠ A DIFFERENCE FROM THE DRAWING, which says the block "uses every complete month
     * available". The engine measures 12, 18 or 24 — the three the workbook has sheets for
     * — so twenty months in hand are measured over eighteen, not twenty. The screen says
     * which number it used, so nothing is hidden; widening the engine to arbitrary windows
     * would be a change to Mike's workbook port and is not this block's to make.
     */
    volatilityWindow () {
      const have = this.historyMonths.length
      for (let i = 0; i < VOLATILITY_WINDOWS.length; i++) {
        if (have >= VOLATILITY_WINDOWS[i]) { return VOLATILITY_WINDOWS[i] }
      }
      return 0
    },

    /**
     * Whether dropping another by-month export could still lengthen the read.
     *
     * 24 is the engine's longest window, so at 24 months in hand there is nothing left to
     * gain and the invitation must not be shown — it would be telling the advisor to do
     * something they have already done. Found by opening the built screen, which is the
     * only place it was visible: every test passed with the sentence always showing.
     */
    canReadMoreMonths () {
      return this.historyMonths.length < 24
    },

    /** How many of the measured ACTUAL months sat outside the normal range. */
    historyOutsideCount () {
      if (!this.volatility) { return 0 }
      return this.volatility.months.filter(m => m.outside).length
    },

    /**
     * The red band — beyond the THIRD deviation. Shown above the amber one so the stronger
     * statement is never buried under the milder one.
     * @returns {{ title: string, body: string }|null}
     */
    redBand () {
      const f = this.volatility && this.volatility.forecast
      if (!f || !f.beyondThird.length) { return null }
      return this.bandMessage(f.beyondThird, f, 'red')
    },

    /** The amber band — beyond the SECOND deviation but within the third. */
    amberBand () {
      const f = this.volatility && this.volatility.forecast
      if (!f || !f.beyondSecond.length) { return null }
      return this.bandMessage(f.beyondSecond, f, 'amber')
    },

    /**
     * The plain sentence about months that are outside the range and were outside it last
     * year too. Not a warning, so not a band: it is the reading that stops an advisor
     * worrying about the client's own seasonality.
     * @returns {string|null}
     */
    seasonalSentence () {
      const f = this.volatility && this.volatility.forecast
      if (!f || !f.seasonal.length) { return null }
      const names = f.seasonal.map(i => this.monthLabels[i])
      const key = names.length === 1 ? 'seasonalOne' : 'seasonalMany'
      return this.$t('report.threeWayForecast.assume.volatility.' + key, { months: this.listText(names) })
    },

    /**
     * The chart: the measured actual months, the twelve forecast months, and the bands
     * measured from the actual months alone carried across both halves.
     *
     * Placement only — every band, every figure and every month's severity arrives already
     * decided by `volatilityModel.js`. Nothing here recomputes an average or a deviation.
     */
    volatilityChart () {
      const v = this.volatility
      if (!v || !v.forecast) { return null }
      const actual = v.sales
      const forecast = v.forecast.months
      const count = actual.length + forecast.length
      if (count < 2) { return null }

      let top = v.bands[2].upper
      for (let i = 0; i < actual.length; i++) { if (actual[i] > top) { top = actual[i] } }
      for (let i = 0; i < forecast.length; i++) { if (forecast[i].value > top) { top = forecast[i].value } }
      const ceiling = Math.max(1, top * 1.06)

      const x = i => CHART.left + (i * (CHART.right - CHART.left)) / (count - 1)
      const y = value => CHART.bottom - (value / ceiling) * (CHART.bottom - CHART.top)

      const b = v.bands
      const bandRects = [
        { y: y(b[2].upper), height: y(b[1].upper) - y(b[2].upper), fill: '#ff990010' },
        { y: y(b[1].upper), height: y(b[0].upper) - y(b[1].upper), fill: '#0070c00f' },
        { y: y(b[0].upper), height: y(b[0].lower) - y(b[0].upper), fill: '#0070c01c' },
        { y: y(b[0].lower), height: y(b[1].lower) - y(b[0].lower), fill: '#0070c00f' },
        { y: y(b[1].lower), height: y(b[2].lower) - y(b[1].lower), fill: '#ff990010' }
      ].filter(r => r.height > 0)

      // The same band label the Volatility Report prints, from the same key.
      const label = (k, value) => this.$t('report.volatility.chart.band', { k, value: this.money(value) })
      const bandLines = [
        { y: y(b[2].upper), stroke: '#ff9900', width: 1, dash: '2 4', label: label(3, b[2].upper) },
        { y: y(b[1].upper), stroke: '#5b6f8a', width: 1, dash: '4 4', label: label(2, b[1].upper) },
        { y: y(b[0].upper), stroke: '#0070c0', width: 1.5, dash: '6 4', label: label(1, b[0].upper) },
        { y: y(v.average), stroke: '#002b64', width: 2, dash: '0', label: this.$t('report.volatility.chart.average', { value: this.money(v.average) }) },
        { y: y(b[0].lower), stroke: '#0070c0', width: 1.5, dash: '6 4', label: label(1, b[0].lower) },
        { y: y(b[1].lower), stroke: '#5b6f8a', width: 1, dash: '4 4', label: label(2, b[1].lower) },
        { y: y(b[2].lower), stroke: '#ff9900', width: 1, dash: '2 4', label: label(3, b[2].lower) }
      ]

      const points = []
      const actualParts = []
      const forecastParts = []
      for (let i = 0; i < actual.length; i++) {
        const px = x(i)
        const py = y(actual[i])
        actualParts.push(px.toFixed(1) + ',' + py.toFixed(1))
        points.push(this.chartPoint(px, py, v.months[i].band, '#002b64'))
      }
      for (let j = 0; j < forecast.length; j++) {
        const px = x(actual.length + j)
        const py = y(forecast[j].value)
        forecastParts.push(px.toFixed(1) + ',' + py.toFixed(1))
        points.push(this.chartPoint(px, py, forecast[j].band, '#0070c0'))
      }

      // Every month is labelled while they still fit; beyond that every other one, so the
      // names never collide into an unreadable smear.
      const stride = count > 26 ? 2 : 1
      const monthLabels = []
      for (let i = 0; i < count; i++) {
        if (i % stride !== 0) { continue }
        monthLabels.push({
          x: x(i),
          label: i < actual.length ? this.historyMonthName(i) : this.monthLabels[i - actual.length]
        })
      }

      return {
        bandRects,
        bandLines,
        points,
        monthLabels,
        actualLine: actualParts.join(' '),
        forecastLine: forecastParts.join(' '),
        dividerX: (x(actual.length - 1) + x(actual.length)) / 2,
        actualLabelX: (x(0) + x(actual.length - 1)) / 2,
        forecastLabelX: (x(actual.length) + x(count - 1)) / 2
      }
    }
  },

  watch: {
    /** Chip navigation from the page — one-way flow, no $refs reach-in. */
    step (n) {
      this.phase = this.phaseFor(n)
      if (this.phase === 'assume') { this.refreshVolatility() }
    },

    /**
     * The bands are fixed once the files are read, but the forecast months change as the
     * advisor types, so the comparison is re-asked. Debounced, because it is a keystroke.
     */
    'form.sales': {
      deep: true,
      handler () {
        if (this.phase === 'assume') { this.scheduleVolatility() }
      }
    },

    /**
     * The shipments and the terms that date them. Deep, because a row's own fields are
     * what change — and debounced, because an order date is typed a digit at a time and
     * each keystroke would otherwise be a round trip.
     */
    'form.overseas.shipments': {
      deep: true,
      handler () { this.scheduleShipments() }
    },
    'form.overseas.shipmentTerms': {
      deep: true,
      handler () { this.scheduleShipments() }
    },
    // A forecast that starts in a different month files every event in a different column.
    'form.startDate' () { this.scheduleShipments() },

    /**
     * Everything the price ladder reads. The landing figures are what the stock IS; the
     * ladder, the pattern and the ready-after month are what happens to it. Deep on the
     * landings because the calculator rewrites that array in place, and debounced because
     * a landing figure is typed a digit at a time.
     *
     * ⚠ THE OVERRIDES ARE DELIBERATELY NOT WATCHED. They are the answer, not a question:
     * asking the backend again because the advisor typed over March would return the same
     * worked-out figures and achieve nothing but a round trip per keystroke.
     */
    'form.overseas.importedPurchases': {
      deep: true,
      handler () { this.scheduleImportedRevenue() }
    },
    'form.overseas.sellDown': {
      deep: true,
      handler () { this.scheduleImportedRevenue() }
    },
    'form.overseas.readyAfterMonths' () { this.scheduleImportedRevenue() },
    'form.overseas.enabled' () { this.scheduleImportedRevenue() }
  },

  mounted () {
    // Resolved after mount: a date derived from "today" during SSR and again in the
    // browser can differ across a midnight boundary, which is a hydration mismatch.
    if (!this.form.startDate) { this.form.startDate = this.defaultStartDate() }
    // A restored session can open straight on step 3, so the read is asked for here too.
    if (this.phase === 'assume') { this.refreshVolatility() }
    // The mentor's own price ladder, which they may have changed on the Imported Stock
    // Prices tab since this build shipped (item 4.64). A RESTORED form is left alone: it
    // already carries whatever the advisor set for this client, and re-seeding would
    // overwrite a decision with a default.
    if (!this.restore) { this.refreshSellDown() }
    // A restored session carries its shipments but not their dates — those are derived, and
    // a derived value stored beside its inputs is one that can disagree with them. Recompute.
    if (this.form.overseas.shipments.length) { this.refreshShipments() }
    // A restored session can open straight on step 3 with landings already entered, and the
    // twelve revenue boxes are derived — so they are asked for rather than restored.
    if (this.form.overseas.enabled) { this.refreshImportedRevenue() }
  },

  beforeDestroy () {
    if (this.volatilityTimer) { clearTimeout(this.volatilityTimer) }
    if (this.revenueTimer) { clearTimeout(this.revenueTimer) }
  },

  methods: {
    /** @param {number} n @returns {string} */
    phaseFor (n) {
      if (n === 1) { return 'drop' }
      if (n === 2) { return 'confirm' }
      return 'assume'
    },

    /** A whole-number percentage for display. @param {number} v */
    pct (v) { return this.num(v, 1) + '%' },

    /** @param {Array<number>} list @returns {number} */
    sumOf (list) {
      let total = 0
      for (let i = 0; i < list.length; i++) {
        const v = Number(list[i])
        if (isFinite(v)) { total += v }
      }
      return Math.round(total * 1000) / 1000
    },

    /**
     * The working state to open with: what the page handed back, or a blank form.
     * @returns {object}
     */
    restoredForm () {
      if (!this.restore) { return this.blankForm() }
      const form = JSON.parse(JSON.stringify(this.restore))
      if (!Array.isArray(form.capital)) { form.capital = [] }
      // A form saved before the volatility block existed carries no history, and an
      // undefined list would break the group rather than show its "nothing to measure"
      // state — the same normalisation the capital rows get, for the same reason.
      if (!Array.isArray(form.history)) { form.history = [] }
      // Same normalisation for the trend read, and for the same reason: a form saved before
      // it existed carries no `trend`, and `undefined` would make the block's own v-if
      // ambiguous — null means "nothing to show", which is a state it draws properly.
      if (!form.trend || typeof form.trend !== 'object') { form.trend = null }
      // Same normalisation for the shipment calculator, and for the same reason: a form
      // saved before it existed carries neither, and an undefined list would break the
      // panel's v-for rather than draw its "nothing entered yet" state.
      const blankOverseas = this.blankForm().overseas
      if (!form.overseas || typeof form.overseas !== 'object') { form.overseas = blankOverseas }
      if (!Array.isArray(form.overseas.shipments)) { form.overseas.shipments = [] }
      if (!form.overseas.shipmentTerms || typeof form.overseas.shipmentTerms !== 'object') {
        form.overseas.shipmentTerms = blankOverseas.shipmentTerms
      }
      return form
    },

    /**
     * The starting state: money at zero, rates on the platform's own values. See the
     * component note — a figure no file supplies is absent, not invented, but a rate has
     * to start somewhere and is always the advisor's to set.
     * @returns {object}
     */
    blankForm () {
      const opening = {}
      for (let i = 0; i < OPENING_KEYS.length; i++) { opening[OPENING_KEYS[i]] = tagged(0, 'entered') }
      const overheads = {}
      for (let i = 0; i < OVERHEAD_KEYS.length; i++) { overheads[OVERHEAD_KEYS[i]] = tagged(0, 'entered') }
      const assets = ASSET_SPECS.map(spec => ({ key: spec.key, opening: tagged(0, 'entered'), rate: spec.rate }))
      const loans = []
      for (let i = 0; i < LOAN_COUNT; i++) {
        loans.push({ name: '', opening: tagged(0, 'entered'), repayment: 0, rate: 0 })
      }
      const shareholders = []
      for (let i = 0; i < SHAREHOLDER_COUNT; i++) { shareholders.push({ opening: tagged(0, 'entered') }) }
      return {
        companyName: '',
        reportDate: null,
        startDate: '',
        opening,
        assets,
        loans,
        shareholders,
        overheads,
        markup: 68,
        taxRate: 28,
        gstRate: 15,
        gstPeriod: 'Two Monthly',
        gstBasis: 'Invoice',
        debtor: [10, 55, 30, 5, 0],
        creditor: [0, 90, 10, 0, 0],
        direct: { freight: 0, otherDirectExempt: 0, otherTwo: 0, commissions: 0 },
        overdraftRate: 7,
        inFundsRate: 2,
        shareholderRate: 5,
        sales: zeroes(),
        salesSource: 'entered',
        purchases: zeroes(),
        // Buying and selling overseas (item 4.64, drawing approved by Mike 2026-09-04).
        // Everything here is inert until `enabled` is ticked AND a figure is entered:
        // the engine's own guard proves that an untouched forecast is unchanged to the
        // cent. Percentages are held as whole numbers on the screen, as every other rate
        // on this form is, and divided on the way out.
        overseas: {
          enabled: false,
          importedPurchases: zeroes(),
          depositPct: 60,
          depositLeadMonths: 4,
          balancePayment: [0, 100, 0, 0, 0],
          freightPct: 12,
          dutyPct: 5,
          fxAllowancePct: 10,
          readyAfterMonths: 1,
          // What the advisor has typed over the worked-out revenue. All blank means the
          // ladder governs every month, which is where every forecast starts.
          importedRevenueOverride: new Array(12).fill(null),
          // The ladder and the pattern are the mentor's content, taken from
          // data/forecast-sell-down.json — never restated here — and shown so the advisor
          // can see what is being applied to their client's stock. `mounted()` then asks
          // the backend for the mentor's CURRENT ladder, which may have moved since this
          // build. See `sellDownForm`.
          sellDown: sellDownForm(SELL_DOWN),
          overseasSales: zeroes(),
          deliveryLagMonths: 2,
          overseasCollection: [0, 50, 50, 0, 0],
          zeroRated: true,
          salesFxAllowancePct: 10,
          overseasMarkup: null,
          // The shipment calculator (item 4.64 slice 2). Empty by default, so a forecast
          // that never opens this panel is byte-identical to one built before it existed.
          // The terms are the shipped file's, replaced by the mentor's own the moment
          // `refreshSellDown` answers — never restated here, exactly as the ladder is not.
          shipmentTerms: shipmentTermsForm(SELL_DOWN),
          shipments: []
        },
        // Buying and selling capital assets. A ROW LIST, not the engine's 6 x 12 grid:
        // 72 boxes of which 70 are zero is a screen an advisor scrolls past, and the two
        // that matter are lost in it. `capitalSeries()` writes the rows into that grid,
        // so nothing is given up. Empty by default — most businesses plan neither.
        capital: [],
        // The complete run of usable months the by-month exports gave — up to 24, not the
        // twelve that seed the sales boxes. It lives on the form so stepping back and
        // forward keeps it, exactly as every other confirmed figure does.
        history: [],
        // The two-year trend read, as the backend banded it (item 4.61b). On the form for
        // the same reason as `history` — stepping back and forward must not lose it — and
        // READ-ONLY: nothing on this screen writes to it and nothing computed from it
        // reaches a forecast figure.
        trend: null
      }
    },

    /**
     * A new row. `month` is the FORECAST month (0-11), not the calendar month, so a row
     * moves with the start date exactly as the sales and purchases boxes above it do.
     * @returns {object}
     */
    blankCapitalRow () {
      return { what: '', category: 0, month: 0, direction: 'buy', price: 0, bookValue: 0 }
    },

    /** The first of next month, as `YYYY-MM-DD`. @returns {string} */
    defaultStartDate () {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const mm = String(next.getMonth() + 1).padStart(2, '0')
      return next.getFullYear() + '-' + mm + '-01'
    },

    /**
     * `YYYY-MM-DD` to the Excel serial the model dates from. Excel counts days from
     * 1899-12-30, and UTC is used on both sides so a timezone can never shift the month.
     * @param {string} iso @returns {number}
     */
    serialOf (iso) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
      if (!m) { return 0 }
      const days = Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) - Date.UTC(1899, 11, 30)
      return Math.round(days / 86400000)
    },

    /** @param {string} key @returns {boolean} */
    hasCandidates (key) {
      const f = this.form.opening[key]
      return !!(f && f.candidates && f.candidates.length > 1)
    },

    /** Re-total a figure from its ticked account rows. @param {string} key */
    applyCandidates (key) {
      const f = this.form.opening[key]
      let total = 0
      for (let i = 0; i < f.candidates.length; i++) {
        if (f.candidates[i].selected) { total += f.candidates[i].value }
      }
      f.value = total
      f.source = 'file'
    },

    /** An edited figure becomes the advisor's own. @param {string} path */
    markEntered (path) {
      const parts = path.split('.')
      if (parts[0] === 'opening') { this.form.opening[parts[1]].source = 'entered' }
      if (parts[0] === 'overheads') { this.form.overheads[parts[1]].source = 'entered' }
      if (parts[0] === 'assets') { this.form.assets[Number(parts[1])].opening.source = 'entered' }
      if (parts[0] === 'loans') { this.form.loans[Number(parts[1])].opening.source = 'entered' }
      if (parts[0] === 'shareholders') { this.form.shareholders[Number(parts[1])].opening.source = 'entered' }
      this.invalid = this.invalid.filter(k => k !== path)
    },

    pickFiles () {
      this.$refs.fileInput.click()
    },

    /** @param {Event} event */
    onFilesChosen (event) {
      this.receive(Array.prototype.slice.call(event.target.files || []))
      event.target.value = ''
    },

    /** @param {DragEvent} event */
    onDrop (event) {
      this.receive(Array.prototype.slice.call((event.dataTransfer && event.dataTransfer.files) || []))
    },

    /**
     * Pre-upload sanity checks — UX only. The backend's magic-byte, size and count checks
     * remain the real boundary.
     * @param {Array<File>} files
     */
    receive (files) {
      this.dropError = null
      const merged = this.chosen.concat(files)
      if (merged.length > MAX_UPLOAD_FILES) {
        this.dropError = this.$t('report.threeWayForecast.drop.tooMany')
        return
      }
      for (let i = 0; i < files.length; i++) {
        if (!/\.(xlsx|csv)$/i.test(files[i].name)) {
          this.dropError = this.$t('report.fileCheck.wrongType')
          return
        }
      }
      let bytes = 0
      for (let i = 0; i < merged.length; i++) { bytes += merged[i].size }
      if (bytes > MAX_UPLOAD_BYTES) {
        this.dropError = this.$t('report.fileCheck.tooBigTotal')
        return
      }
      this.chosen = merged
    },

    /** @param {number} i */
    removeChosen (i) {
      this.chosen = this.chosen.filter((f, n) => n !== i)
      this.dropError = null
    },

    /** Upload every chosen file in one request and apply what the backend proposes. */
    async readFiles () {
      this.uploading = true
      this.dropError = null
      this.blocked = null
      try {
        const body = new FormData()
        for (let i = 0; i < this.chosen.length; i++) { body.append('file', this.chosen[i]) }
        const res = await fetch('/api/report/three-way-forecast/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.dropError = (json.error && json.error.message) || this.$t('report.threeWayForecast.drop.uploadFailed')
          return
        }
        if (json.data.blocked) {
          this.blocked = json.data.blocked
          this.warnings = json.data.warnings || []
          return
        }
        this.applyIntake(json.data)
        this.phase = 'confirm'
        // step: which intake step is showing (1 drop, 2 confirm, 3 assumptions)
        this.$emit('step', 2)
      } catch (e) {
        this.dropError = this.$t('report.threeWayForecast.drop.uploadFailed')
      } finally {
        this.uploading = false
      }
    },

    /**
     * Apply the backend's proposal. Values come from `proposal`, provenance from
     * `provenance` — never inferred from whether a value happens to be non-zero, because
     * a real file can carry a zero and that zero is still a fact from the file.
     * @param {object} data - the intake route's `data` block.
     */
    applyIntake (data) {
      const p = data.proposal || {}
      const prov = data.provenance || {}
      const cands = data.candidates || {}
      this.warnings = data.warnings || []

      const firstFile = (data.files || [])[0] || {}
      this.form.companyName = firstFile.companyName || ''
      this.form.reportDate = firstFile.reportDate || null
      if (this.form.reportDate) {
        const derived = this.startAfter(this.form.reportDate)
        if (derived) { this.form.startDate = derived }
      }

      const ob = p.openingBalanceSheet || {}
      for (let i = 0; i < OPENING_KEYS.length; i++) {
        const key = OPENING_KEYS[i]
        if (typeof ob[key] === 'number') {
          this.form.opening[key].value = ob[key]
          this.form.opening[key].source = prov['openingBalanceSheet.' + key] || 'file'
        }
        const rows = cands[key]
        this.form.opening[key].candidates = Array.isArray(rows)
          ? rows.map(r => ({ label: r.label, value: r.value, selected: true }))
          : []
      }

      if (Array.isArray(p.assets)) {
        for (let i = 0; i < this.form.assets.length && i < p.assets.length; i++) {
          if (p.assets[i] && typeof p.assets[i].opening === 'number') {
            this.form.assets[i].opening.value = p.assets[i].opening
            this.form.assets[i].opening.source = prov['assets.' + i + '.opening'] || 'entered'
          }
        }
      }
      if (Array.isArray(p.loans)) {
        for (let i = 0; i < this.form.loans.length && i < p.loans.length; i++) {
          if (p.loans[i] && typeof p.loans[i].opening === 'number') {
            this.form.loans[i].opening.value = p.loans[i].opening
            this.form.loans[i].opening.source = prov['loans.' + i + '.opening'] || 'entered'
          }
        }
      }
      if (Array.isArray(p.shareholders)) {
        for (let i = 0; i < this.form.shareholders.length && i < p.shareholders.length; i++) {
          if (p.shareholders[i] && typeof p.shareholders[i].opening === 'number') {
            this.form.shareholders[i].opening.value = p.shareholders[i].opening
            this.form.shareholders[i].opening.source = prov['shareholders.' + i + '.opening'] || 'entered'
          }
        }
      }

      const ov = p.overheads || {}
      for (let i = 0; i < OVERHEAD_KEYS.length; i++) {
        const key = OVERHEAD_KEYS[i]
        if (typeof ov[key] === 'number') {
          this.form.overheads[key].value = ov[key]
          this.form.overheads[key].source = prov['overheads.' + key] || 'file'
        }
      }

      // Last year's months are a STARTING POINT, never a forecast — its own badge.
      if (Array.isArray(p.sales) && p.sales.length === MONTHS) {
        this.form.sales = p.sales.slice()
        this.form.salesSource = prov.sales === 'seeded' ? 'seeded' : 'entered'
      }

      // The whole run, which is what the volatility read measures. Up to 24 months; the
      // twelve above are only the most recent of them.
      this.form.history = Array.isArray(data.history) ? data.history.slice() : []

      // The two-year trend read, already banded by the backend against this firm's own
      // thresholds. Taken as given: the banding is advisory judgement and business logic,
      // and neither belongs in the browser.
      this.form.trend = (data.trend && typeof data.trend === 'object') ? data.trend : null
    },

    /**
     * The day after a report's own "as at" date, as `YYYY-MM-DD` — a forecast opens where
     * the balance sheet stops. Returns null when the date line cannot be read, in which
     * case the advisor's own default stands.
     * @param {string} reportDate @returns {string|null}
     */
    startAfter (reportDate) {
      const m = /(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2})/.exec(String(reportDate || ''))
      if (!m) { return null }
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
        'august', 'september', 'october', 'november', 'december']
      const monthIndex = months.indexOf(m[2].toLowerCase())
      if (monthIndex === -1) { return null }
      const next = new Date(Date.UTC(parseInt(m[3], 10), monthIndex, parseInt(m[1], 10) + 1))
      const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(next.getUTCDate()).padStart(2, '0')
      return next.getUTCFullYear() + '-' + mm + '-' + dd
    },

    /** The manual path: nothing came from a file, so every figure is the advisor's. */
    skipManual () {
      this.form = this.blankForm()
      this.form.startDate = this.defaultStartDate()
      this.warnings = []
      this.blocked = null
      this.phase = 'confirm'
      // step: which intake step is showing (1 drop, 2 confirm, 3 assumptions)
      this.$emit('step', 2)
    },

    toAssume () {
      this.phase = 'assume'
      // step: which intake step is showing (1 drop, 2 confirm, 3 assumptions)
      this.$emit('step', 3)
      this.refreshVolatility()
    },

    /**
     * The short month name of an ACTUAL month, by its position in the measured window.
     * Derived from the month's own ordinal rather than the parser's label, so it reads in
     * the same three letters as the forecast grid beside it.
     * @param {number} index @returns {string}
     */
    /**
     * One year's figure, in the units that measure is actually read in.
     *
     * Sales is the odd one out and it is not an inconsistency: its two YEARS are money and
     * its MOVEMENT is a growth percentage, which is how anyone reads a sales trend. The
     * other five read in the same unit both ways.
     *
     * @param {object} m - a measure from the backend.
     * @param {number|null} v - the year's value.
     * @returns {string}
     */
    trendValue (m, v) {
      if (typeof v !== 'number' || !isFinite(v)) { return '—' }
      if (m.unit === 'days') {
        return this.$t('report.threeWayForecast.assume.trend.daysValue', { n: Math.round(v) })
      }
      if (m.unit === 'points') { return v.toFixed(1) + '%' }
      return this.money(v)
    },

    /**
     * The movement between the two years, signed, in its own unit.
     * @param {object} m - a measure from the backend.
     * @returns {string}
     */
    trendMovement (m) {
      const v = m.movement
      if (typeof v !== 'number' || !isFinite(v)) { return '—' }
      // A true minus sign, not a hyphen: these sit in a column of figures.
      const sign = v > 0 ? '+' : (v < 0 ? '−' : '')
      const size = Math.abs(v)
      if (m.unit === 'days') {
        return sign + this.$t('report.threeWayForecast.assume.trend.daysValue', { n: Math.round(size) })
      }
      if (m.unit === 'points') {
        return sign + this.$t('report.threeWayForecast.assume.trend.pointsValue', { n: size.toFixed(1) })
      }
      return sign + size.toFixed(1) + '%'
    },

    /**
     * The row's band tint. Green is a state of its own here — Mike's word, 2026-09-03 —
     * but only the two warning levels tint the whole row: tinting every good row green as
     * well makes a six-row table shout, and the chip already carries the verdict.
     * @param {object} m @returns {object}
     */
    trendRowClass (m) {
      return { 'is-warn': m.band === 'warn', 'is-crit': m.band === 'crit' }
    },

    /**
     * Colour the movement by whether it went the way that is worse for this measure —
     * which the backend decides and sends, so the colour can never disagree with the
     * arithmetic that produced the band.
     * @param {object} m @returns {object}
     */
    trendMoveClass (m) {
      const v = m.movement
      if (typeof v !== 'number' || !isFinite(v) || v === 0) { return { flat: true } }
      const worse = m.worseWhen === 'up' ? v > 0 : v < 0
      return { bad: worse, ok: !worse }
    },

    historyMonthName (index) {
      const measured = this.historyMonths.slice(-this.volatilityWindow)
      const month = measured[index]
      if (!month || typeof month.ordinal !== 'number') { return '' }
      return MONTH_SHORT[month.ordinal % 12]
    },

    /**
     * One chart dot. The colours are Mike's ruling of 2026-09-03: amber beyond the second
     * deviation, red beyond the third, matching the two bands exactly.
     *
     * ⚠ A month merely OUTSIDE the first deviation is drawn hollow. That follows from the
     * same ruling rather than being a separate choice: with amber and red reserved for the
     * two band thresholds, an ordinary month outside the range would otherwise have no
     * marker at all, and the seasonality sentence under the chart depends on being able to
     * see those months. Named on the approved drawing.
     * @param {number} x @param {number} y @param {number} band @param {string} seriesColour
     */
    chartPoint (x, y, band, seriesColour) {
      if (band === 3) { return { x, y, r: 6, fill: '#ff0000', stroke: '#ffffff', strokeWidth: 1.5 } }
      if (band === 2) { return { x, y, r: 5, fill: '#ff9900', stroke: '#ffffff', strokeWidth: 1.5 } }
      if (band === 1) { return { x, y, r: 4.5, fill: '#ffffff', stroke: seriesColour, strokeWidth: 2 } }
      return { x, y, r: 3.5, fill: seriesColour, stroke: 'none', strokeWidth: 0 }
    },

    /**
     * A band's two lines. Both levels take a plural form, and the red one quotes the
     * furthest month because a list of three tells an advisor nothing about which to look
     * at first.
     * @param {Array<number>} indices - forecast months at this level
     * @param {object} forecast - the model's forecast block
     * @param {'red'|'amber'} level
     * @returns {{ title: string, body: string }}
     */
    bandMessage (indices, forecast, level) {
      const base = 'report.threeWayForecast.assume.volatility.'
      const names = indices.map(i => this.monthLabels[i])
      const many = names.length > 1
      const months = this.listText(names)
      const n = this.volatility.monthsUsed
      if (level === 'red') {
        const worst = forecast.months[indices[0]]
        let furthest = worst
        for (let i = 1; i < indices.length; i++) {
          if (forecast.months[indices[i]].deviations > furthest.deviations) { furthest = forecast.months[indices[i]] }
        }
        const values = {
          months,
          month: this.monthLabels[furthest.index],
          value: this.money(furthest.value),
          deviations: this.num(furthest.deviations, 1),
          n,
          highest: this.money(this.volatility.highest ? this.volatility.highest.value : 0)
        }
        return {
          title: this.$t(base + (many ? 'redMany' : 'redOne'), values),
          body: this.$t(base + (many ? 'redBodyMany' : 'redBody'), values)
        }
      }
      return {
        title: this.$t(base + (many ? 'amberMany' : 'amberOne'), { months, month: months, n }),
        body: this.$t(base + (many ? 'amberBodyMany' : 'amberBody'))
      }
    },

    /**
     * "Jan", "Jan and Jul", "Jan, Jul and Sep" — a readable list rather than a comma run.
     * @param {Array<string>} names @returns {string}
     */
    listText (names) {
      if (names.length <= 1) { return names[0] || '' }
      return names.slice(0, -1).join(', ') + ' ' + this.$t('report.threeWayForecast.assume.volatility.and') + ' ' + names[names.length - 1]
    },

    /** Re-ask after a keystroke settles, rather than on every digit. */
    scheduleVolatility () {
      if (this.volatilityTimer) { clearTimeout(this.volatilityTimer) }
      this.volatilityTimer = setTimeout(() => {
        this.volatilityTimer = null
        this.refreshVolatility()
      }, VOLATILITY_DEBOUNCE_MS)
    },

    /** A new shipment row, on the terms the panel already shows. */
    addShipment () {
      this.form.overseas.shipments.push({
        description: '', cost: 0, orderDate: '', depositPct: 60, speed: 'Sea'
      })
    },

    /** @param {number} i - the row to drop. */
    removeShipment (i) {
      this.form.overseas.shipments.splice(i, 1)
      this.scheduleShipments()
    },

    /**
     * The backend's resolved row for one shipment, or null while it has no usable order
     * date. Matched BY INDEX because the backend keeps the order it was sent and drops
     * only rows it cannot read — so a dropped row must not silently shift the dates shown
     * beside the rows after it.
     *
     * @param {number} i @returns {object|null}
     */
    shipmentRow (i) {
      const s = this.form.overseas.shipments[i]
      if (!s || !s.orderDate || !(Number(s.cost) > 0)) { return null }
      const rows = this.shipmentResult.rows
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].orderDate === s.orderDate && rows[r].cost === Number(s.cost)) { return rows[r] }
      }
      return null
    },

    /**
     * The working printed under a resolved row — the deposit month, the balance date with
     * its interest cover, and the month the stock is actually sellable.
     *
     * It is spelled out because the three dates are the whole point of the panel: a
     * container landing on the 24th of a month is not on a shelf that month, and a balance
     * due on the supplier's 91-day terms can fall BEFORE the goods arrive.
     *
     * @param {number} i @returns {string}
     */
    shipmentWorking (i) {
      const r = this.shipmentRow(i)
      if (!r) { return '' }
      return this.$t('report.threeWayForecast.assume.shipments.working', {
        deposit: r.orderDate,
        balance: r.balanceDueOn,
        interest: this.money(r.interest),
        sellable: r.sellableOn
      })
    },

    /** Debounced, for the same reason the two reads above are — a figure typed a digit at a time. */
    scheduleImportedRevenue () {
      if (this.revenueTimer) { clearTimeout(this.revenueTimer) }
      this.revenueTimer = setTimeout(() => {
        this.revenueTimer = null
        this.refreshImportedRevenue()
      }, VOLATILITY_DEBOUNCE_MS)
    },

    /**
     * Ask the backend what the imported stock will sell for as it ages down the price
     * ladder (item 4.64, Mike's ruling of 2026-09-04 that this revenue is worked out).
     *
     * 🔴 IT IS ASKED FOR RATHER THAN WORKED OUT HERE. The ladder is business logic, which
     * does not live in Nuxt, and one implementation cannot drift from another — the same
     * reasoning as the shipment calculator and the volatility read above it.
     *
     * ⚠ IT SENDS `overseasInputs()`, WHICH CARRIES THE OVERRIDES, AND THAT IS SAFE: the
     * route computes the ladder with them cleared, precisely so the screen can seed from
     * the ladder's own figure and restore to it when a box is emptied.
     */
    async refreshImportedRevenue () {
      if (!this.form.overseas.enabled) {
        this.importedRevenueWorked = new Array(12).fill(0)
        this.revenueBeyondYear = 0
        return
      }
      try {
        const res = await fetch('/api/report/imported-revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gstRate: Number(this.form.gstRate) / 100,
            overseas: this.overseasInputs()
          })
        })
        const json = await res.json()
        if (!json || !json.success || !json.data) { return }
        this.importedRevenueWorked = json.data.importedRevenue.slice()
        this.revenueBeyondYear = json.data.revenueBeyondYear || 0
      } catch (e) {
        // The boxes simply keep their last figures. A failed read must never stop an advisor
        // finishing a forecast, exactly as the shipment panel below decides it.
      }
    },

    /**
     * Record what the advisor typed over one month's worked-out revenue.
     *
     * AN EMPTY BOX MEANS "USE THE WORKED-OUT FIGURE" — which is why clearing one restores it
     * and there is no separate undo control. `$set` because Vue 2 does not see an index
     * assignment on an array.
     *
     * @param {number} i the month, 0-11
     * @param {string|number} v what is now in the box
     */
    setImportedRevenue (i, v) {
      const blank = v === '' || v === null || v === undefined
      this.$set(this.form.overseas.importedRevenueOverride, i, blank ? null : Number(v))
    },

    /** Debounced, exactly as the volatility read is — a date typed a digit at a time. */
    scheduleShipments () {
      if (this.shipmentTimer) { clearTimeout(this.shipmentTimer) }
      this.shipmentTimer = setTimeout(() => {
        this.shipmentTimer = null
        this.refreshShipments()
      }, VOLATILITY_DEBOUNCE_MS)
    },

    /**
     * Ask the backend to date the shipments (item 4.64 slice 2).
     *
     * 🔴 THE ARITHMETIC IS THE BACKEND'S AND THIS SCREEN DECIDES NOTHING. Dating an event
     * from an order date is business logic, so it lives on Restify — and one implementation
     * cannot drift from another, which two would.
     *
     * ⚠ IT WRITES THE TWELVE LANDING BOXES. The moment one shipment resolves, the
     * `importedPurchases` row above stops being typed and starts being filled — which is
     * what the panel says on screen, because a box that silently overwrites what an advisor
     * typed is worse than one that cannot be typed in at all.
     */
    async refreshShipments () {
      const o = this.form.overseas
      // Percentages are whole numbers on this form and divided on the way out, exactly as
      // `overseasInputs` does it — the same convention as every other rate on the screen.
      const pct = v => Number(v) / 100
      const list = o.shipments.filter(s => s.orderDate && Number(s.cost) > 0)
      if (!list.length || !this.form.startDate) {
        this.shipmentResult = { rows: [], importedPurchases: [], deposits: [], balances: [], interest: [], landings: [], beyondYear: [] }
        return
      }
      try {
        const res = await fetch('/api/report/import-shipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: this.form.startDate,
            terms: {
              manufactureDays: Number(o.shipmentTerms.manufactureDays) || 0,
              balanceDueDays: Number(o.shipmentTerms.balanceDueDays) || 0,
              prepDays: Number(o.shipmentTerms.prepDays) || 0,
              interestCoverPct: pct(o.shipmentTerms.interestCoverPct),
              shippingDays: {
                Sea: Number(o.shipmentTerms.seaDays) || 0,
                Air: Number(o.shipmentTerms.airDays) || 0,
                Express: Number(o.shipmentTerms.expressDays) || 0
              }
            },
            shipments: list.map(s => ({
              description: s.description,
              cost: Number(s.cost) || 0,
              orderDate: s.orderDate,
              depositPct: pct(s.depositPct),
              speed: s.speed
            }))
          })
        })
        const json = await res.json()
        if (!json || !json.success || !json.data) { return }
        this.shipmentResult = json.data
        // The calculator owns the landing row once it has anything to say.
        if (json.data.landings.length) {
          this.form.overseas.importedPurchases = json.data.importedPurchases.slice()
        }
      } catch (e) {
        // The panel simply shows no dates. A failed read must never stop an advisor
        // finishing a forecast by hand, which is exactly what they did before this existed.
      }
    },

    /**
     * Ask the backend for the price ladder this scope works to — the mentor's figures, with
     * any tier below them applied (item 4.64).
     *
     * WHY IT IS READ RATHER THAN IMPORTED. The bundled `data/forecast-sell-down.json` is
     * the ladder as it shipped. A mentor who changes it on their Imported Stock Prices tab
     * changes what every new forecast should open on, and a screen that only ever read the
     * bundled copy would go on offering the old prices until the next deploy.
     *
     * ⚠ IT IS SILENT ON FAILURE, AND THAT IS DELIBERATE. The shipped ladder is already on
     * the form and is what every firm gets today, so a failed read costs the advisor
     * nothing — where an error message would tell them about a screen they have never seen
     * and cannot act on. Nothing here can leave the form in a half-applied state: the whole
     * block is replaced or none of it is.
     */
    async refreshSellDown () {
      try {
        const res = await fetch('/api/report/sell-down', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { return }
        const json = await res.json()
        if (!json || !json.sellDown || !json.sellDown.ladder) { return }
        this.form.overseas.sellDown = sellDownForm(json.sellDown)
        // The supplier terms travel with the ladder — one tab sets both, one read seeds both.
        this.form.overseas.shipmentTerms = shipmentTermsForm(json.sellDown)
      } catch (e) {
        // See the note above: the shipped ladder stands, and the advisor is not told about
        // a manager's screen they cannot reach.
      }
    },

    /**
     * Ask the backend where the forecast sits against the history.
     *
     * 🔴 EVERY FIGURE IN THE BLOCK COMES FROM HERE. The average, the deviation, the bands,
     * the dial and each month's severity are all `volatilityModel.js`'s, exactly as the
     * approved drawing requires — two implementations of a standard deviation is how a
     * screen and a report start disagreeing. This component places dots; it decides
     * nothing.
     *
     * The route is anonymous by design (numbers in, numbers out): only the file-intake
     * routes carry firmAuth, because those accept uploads.
     */
    async refreshVolatility () {
      if (!this.volatilityWindow) {
        this.volatility = null
        this.volatilityStale = false
        return
      }
      try {
        const res = await fetch('/api/report/volatility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sales: this.historyMonths.map(m => Number(m.value) || 0),
            window: this.volatilityWindow,
            forecast: this.form.sales.map(v => Number(v) || 0)
          })
        })
        const json = await res.json()
        if (!json.success || !json.data) {
          this.volatilityStale = true
          return
        }
        this.volatility = json.data
        this.volatilityStale = false
      } catch (e) {
        this.volatilityStale = true
      }
    },

    backToConfirm () {
      this.phase = 'confirm'
      // step: which intake step is showing (1 drop, 2 confirm, 3 assumptions)
      this.$emit('step', 2)
    },

    /** Add a row to the capital block. */
    addCapitalRow () { this.form.capital.push(this.blankCapitalRow()) },

    /** Remove one. @param {number} i the row's position */
    removeCapitalRow (i) { this.form.capital.splice(i, 1) },

    /** The category's book value today, shown beside a Sell row's own figure so an
     *  advisor can see what the whole category is carried at while they enter one
     *  asset's share of it. Context only — the app holds six category totals and never
     *  knows which van is which.
     *  @param {number} categoryIndex @returns {number} */
    categoryOpening (categoryIndex) {
      const asset = this.form.assets[categoryIndex]
      return asset ? (Number(asset.opening.value) || 0) : 0
    },

    /**
     * Fold the row list into the engine's 6 x 12 grid. Two rows in the same category and
     * month simply add together.
     *
     * A BUY writes its price to `additions`. A SELL writes the BOOK VALUE to `disposals`
     * — what leaves the asset register — and the PRICE to `proceeds`, which the bank and
     * the GST return follow. That split is correction R10 (Mike, 2026-09-03): until it
     * existed a sale had one figure and an asset could only ever sell for exactly its
     * written-down value.
     *
     * @returns {Array<object>} one `{ additions, disposals, proceeds }` per category
     */
    capitalSeries () {
      const out = ASSET_SPECS.map(() => ({ additions: zeroes(), disposals: zeroes(), proceeds: zeroes() }))
      for (let i = 0; i < this.form.capital.length; i++) {
        const row = this.form.capital[i]
        const cat = out[Number(row.category)]
        const month = Number(row.month)
        if (!cat || !(month >= 0 && month < MONTHS)) { continue }
        const price = Number(row.price) || 0
        if (row.direction === 'sell') {
          cat.disposals[month] += Number(row.bookValue) || 0
          cat.proceeds[month] += price
        } else {
          cat.additions[month] += price
        }
      }
      return out
    },

    /**
     * Every figure the model takes, explicitly — nothing omitted, so no sample value can
     * fall through `resolveInputs`. Percentages are held whole on screen and divided here.
     * @returns {object} the model's input shape.
     */
    buildInputs () {
      const opening = {}
      for (let i = 0; i < OPENING_KEYS.length; i++) {
        opening[OPENING_KEYS[i]] = Number(this.form.opening[OPENING_KEYS[i]].value) || 0
      }
      const overheads = {}
      for (let i = 0; i < OVERHEAD_KEYS.length; i++) {
        overheads[OVERHEAD_KEYS[i]] = Number(this.form.overheads[OVERHEAD_KEYS[i]].value) || 0
      }
      const capital = this.capitalSeries()
      return {
        startDateSerial: this.serialOf(this.form.startDate),
        sales: this.form.sales.map(v => Number(v) || 0),
        purchases: this.form.purchases.map(v => Number(v) || 0),
        markup: Number(this.form.markup) / 100,
        overseas: this.overseasInputs(),
        directCostRates: {
          freight: Number(this.form.direct.freight) / 100,
          otherDirectExempt: Number(this.form.direct.otherDirectExempt) / 100,
          otherTwo: Number(this.form.direct.otherTwo) / 100,
          commissions: Number(this.form.direct.commissions) / 100
        },
        overheads,
        // No accounting export carries a plan for these, and the drawing asks for none:
        // they are sent as nothing rather than left to the sample's own values.
        otherIncomeGstInclusive: 0,
        otherIncomeGstExempt: 0,
        taxRate: Number(this.form.taxRate) / 100,
        lossesAvailable: 0,
        taxPayments: zeroes(),
        taxRefunds: zeroes(),
        accLeviesPaid: zeroes(),
        insurancePaid: zeroes(),
        openingBalanceSheet: opening,
        assets: this.form.assets.map((a, i) => ({
          opening: Number(a.opening.value) || 0,
          depreciationRate: Number(a.rate) / 100,
          additions: capital[i].additions,
          disposals: capital[i].disposals,
          proceeds: capital[i].proceeds
        })),
        // Names are the advisor's own or a neutral position label — never the sample's
        // "ABC Bank", and never read from the client's file.
        loans: this.form.loans.map((l, i) => ({
          name: l.name || this.$t('report.threeWayForecast.confirm.loanName', { n: i + 1 }),
          opening: Number(l.opening.value) || 0,
          monthlyRepayment: Number(l.repayment) || 0,
          interestRate: Number(l.rate) / 100,
          drawdowns: zeroes(),
          lumpSumRepayments: zeroes()
        })),
        overdraftInterestRate: Number(this.form.overdraftRate) / 100,
        inFundsInterestRate: Number(this.form.inFundsRate) / 100,
        debtorCollection: this.form.debtor.map(v => Number(v) / 100),
        creditorPayment: this.form.creditor.map(v => Number(v) / 100),
        gstRate: Number(this.form.gstRate) / 100,
        gstPeriod: this.form.gstPeriod,
        gstBasis: this.form.gstBasis,
        shareholderInterestRate: Number(this.form.shareholderRate) / 100,
        shareholders: this.form.shareholders.map((s, i) => ({
          name: this.$t('report.threeWayForecast.confirm.shareholder', { n: i + 1 }),
          opening: Number(s.opening.value) || 0,
          advances: zeroes(),
          drawings: zeroes()
        }))
      }
    },

    /**
     * Buying and selling overseas, in the shape the engine takes (item 4.64).
     *
     * The screen holds percentages as whole numbers, as every other rate on this form
     * does; they are divided here. A forecast with the tick off sends empty series, and
     * the engine's own guard proves that produces figures identical to a forecast that
     * never mentioned overseas trade at all.
     *
     * @returns {object} the `overseas` block: series, terms, the sell-down ladder
     */
    overseasInputs () {
      const o = this.form.overseas
      const on = o.enabled === true
      const pct = v => Number(v) / 100
      return {
        enabled: on,
        // With the tick off nothing is sent, so an advisor who fills the section in and
        // then unticks it gets today's forecast back rather than a half-applied one.
        importedPurchases: on ? o.importedPurchases.map(v => Number(v) || 0) : zeroes(),
        depositPct: pct(o.depositPct),
        depositLeadMonths: Number(o.depositLeadMonths) || 0,
        balancePayment: o.balancePayment.map(pct),
        freightPct: pct(o.freightPct),
        dutyPct: pct(o.dutyPct),
        fxAllowancePct: pct(o.fxAllowancePct),
        readyAfterMonths: Number(o.readyAfterMonths) || 0,
        // A month the advisor typed over, or null to let the ladder work it out. Dropped
        // with the tick off like the two series above, so unticking cannot leave a single
        // typed revenue figure standing in an otherwise domestic forecast.
        importedRevenueOverride: on
          ? o.importedRevenueOverride.map(v => (v === null || v === '' || v === undefined ? null : Number(v)))
          : new Array(12).fill(null),
        sellDown: {
          newMarkup: pct(o.sellDown.newMarkup),
          standardMarkup: pct(o.sellDown.standardMarkup),
          runoutMarkup: pct(o.sellDown.runoutMarkup),
          newUpToDays: Number(o.sellDown.newUpToDays) || 0,
          standardUpToDays: Number(o.sellDown.standardUpToDays) || 0,
          runoutUpToDays: Number(o.sellDown.runoutUpToDays) || 0,
          pattern: o.sellDown.pattern
        },
        overseasSales: on ? o.overseasSales.map(v => Number(v) || 0) : zeroes(),
        deliveryLagMonths: Number(o.deliveryLagMonths) || 0,
        overseasCollection: o.overseasCollection.map(pct),
        zeroRated: o.zeroRated !== false,
        salesFxAllowancePct: pct(o.salesFxAllowancePct),
        // Null follows the local mark-up, which is the ruled default.
        overseasMarkup: o.overseasMarkup === null || o.overseasMarkup === ''
          ? null
          : pct(o.overseasMarkup),
        // The calculator's resolved landings, each with its OWN deposit and balance month
        // and its own interest cover (item 4.64 slice 2). Empty means the twelve landing
        // figures above were typed by hand, which is every forecast that never opens the
        // shipments panel — and the engine then works exactly as it did before.
        landings: on ? this.shipmentResult.landings : []
      }
    },

    /**
     * Hand the confirmed inputs to the report screen. Both collection profiles must total
     * 100% first: the model does not normalise them, so a profile summing to 80 quietly
     * means a fifth of the sales are never collected and the cash flow is wrong in a way
     * that looks entirely plausible.
     */
    buildForecast () {
      this.buildError = null
      if (this.debtorTotal !== 100) {
        this.buildError = this.$t('report.threeWayForecast.assume.doesNotAddUp', { total: this.pct(this.debtorTotal) })
        return
      }
      if (this.creditorTotal !== 100) {
        this.buildError = this.$t('report.threeWayForecast.assume.doesNotAddUp', { total: this.pct(this.creditorTotal) })
        return
      }
      // Refused, not corrected: the Buy/Sell tick already carries the direction, so a
      // minus sign here means the advisor meant something the screen cannot know.
      if (this.capitalNegativeRows.length) {
        this.buildError = this.$t('report.threeWayForecast.assume.capital.noNegatives', {
          rows: this.capitalNegativeRows.join(', ')
        })
        return
      }
      // confirmed: { inputs, state, companyName } — `state` comes back as `restore` so a
      // step back leaves every figure and badge exactly as the advisor confirmed them.
      this.$emit('confirmed', {
        inputs: this.buildInputs(),
        state: JSON.parse(JSON.stringify(this.form)),
        companyName: this.form.companyName || ''
      })
    }
  }
}
</script>

<style scoped>
/* Every value reads a --rs-* token from the shared ReportShell; nothing declares a frame,
   palette or font of its own. See design/REPORT-VISUAL-STANDARD.md. Left literal on
   purpose: the cyan drop-zone dash (#7fd3f1) and the softer green fill (#4ca52d12), both
   matching QuickPositionIntake, and the amber warning text (#b36b00) — no token exists
   for any of the three. */
.tw-intake { display: flex; flex-direction: column; gap: 16px; }

/* Cards — no top edge; the shipped screens define none. */
.tw-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); box-shadow: var(--rs-shadow); }
.drop-card { padding: 16px; margin-bottom: 16px; }
.tw-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.tw-group:last-child { border-bottom: 0; }
.tw-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.tw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.tw-h2 { margin: 0; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.tw-note { font-size: 11.5px; color: var(--rs-muted); margin: 10px 0 0; }
.tw-foot { font-size: 12px; color: var(--rs-muted); }
.tw-foot.is-good { color: var(--rs-good); font-weight: 600; }
.tw-foot.is-crit { color: var(--rs-crit); font-weight: 600; }

/* Step 1 — the drop zone. */
.drop { border: 2px dashed #7fd3f1; border-radius: var(--rs-card-radius); background: var(--rs-panel-2); padding: 26px 20px; text-align: center; }
.drop.loaded { border-style: solid; border-color: var(--rs-good); background: #4ca52d12; }
.drop-big { font-size: 15px; font-weight: 600; }
.drop-sm { font-size: 12.5px; color: var(--rs-muted); margin-top: 6px; }
.drop-supported { margin-top: 8px; }
.slots { display: grid; gap: 8px; margin-top: 14px; }
.slot { display: flex; gap: 10px; align-items: flex-start; background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 10px; padding: 10px 11px; text-align: left; }
.slot.empty { border-style: dashed; color: var(--rs-muted); }
.slot .nm { font-size: 12.5px; font-weight: 600; }
.slot .mt { font-size: 11.5px; color: var(--rs-muted); margin-top: 2px; }
.req { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 2.5px 7px; white-space: nowrap; color: #b36b00; background: var(--rs-warn-soft); border: 1px solid #ff990059; }
.req.opt { color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line); }
.chosen { display: grid; gap: 6px; margin-top: 14px; text-align: left; }
.chosen-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--rs-panel); border: 1px solid var(--rs-line); border-radius: 9px; padding: 7px 10px; }
.chosen-name { font-size: 12.5px; font-weight: 600; word-break: break-all; }
.choose-btn { margin-top: 14px; }
.err { font-size: 12.5px; color: var(--rs-crit); margin-top: 10px; }

/* [D2c] The note panel, as on every other screen in this section. */
.tw-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.tw-edu-h { display: flex; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.tw-edu-p { margin: 0; font-size: 14px; line-height: 1.6; }
.tw-lead { background: var(--rs-accent); color: var(--rs-accent-contrast); font-size: 10px; font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 5px; }

/* Steps 2 and 3 — tables. Wide content scrolls inside its own box so the page body
   never scrolls sideways. */
.tw-tblwrap { overflow-x: auto; }
.confirm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.confirm-table th { font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--rs-muted); text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--rs-line); font-weight: 600; }
.confirm-table td { padding: 6px 10px; border-bottom: 1px solid var(--rs-line); vertical-align: middle; }
.confirm-table th.num, .confirm-table td.num { text-align: right; }
.confirm-table tr.rule td { border-top: 2px solid var(--rs-line); }
.confirm-table td.muted { color: var(--rs-muted); font-size: 12px; }
.confirm-table tbody tr:last-child td { border-bottom: 0; }
.row-invalid td { background: #ff00000a; }
.cell { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.pctmark { font-size: 12px; color: var(--rs-muted); }
.cands { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
.cand-note { font-size: 11px; color: var(--rs-muted); }

/* Step 3 — the two-column body, matching the report screen's own grid. */
.tw-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .tw-layout { grid-template-columns: 1fr; } }
.tw-results { display: flex; flex-direction: column; gap: 16px; }
.field { margin-bottom: 11px; }
.fieldlab { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--rs-ink); margin-bottom: 6px; }
.seg { display: flex; border: 1px solid var(--rs-line); border-radius: 10px; overflow: hidden; }
.seg button { flex: 1; border: 0; background: var(--rs-panel); padding: 9px 0; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--rs-muted); cursor: pointer; }
.seg button.on { background: var(--rs-accent); color: var(--rs-accent-contrast); }

/* The twelve-month grids. */
/* The revenue block's heading row. `.fieldlab` already lays the label and its badge out;
   this only gives the block the breathing space the sections around it have. */
.orev-head { margin-top: 16px; }
/* The supplier-terms heading and its badge on one row. `.fieldlab` already spaces them
   apart; this only stops the heading's own bottom margin doubling up inside the flex row. */
.shipterms-head { align-items: baseline; }
.shipterms-head .termhead { margin-bottom: 0; }
.mgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 560px) { .mgrid { grid-template-columns: repeat(2, 1fr); } }
.m { display: flex; align-items: center; gap: 6px; }
.m .lbl { width: 26px; font-size: 11px; color: var(--rs-muted); text-align: right; }
.m ::v-deep .control { flex: 1; min-width: 0; }
.m.seeded ::v-deep .input { border-color: #4ca52d59; background: #4ca52d0d; }

/* Buying and selling capital assets — the row list. Every value is a --rs-* token or a
   measurement copied from design/mockups/three-way-forecast-capital.html; the block adds
   no colour, radius, weight or font of its own. */
.caprow { display: grid; grid-template-columns: 1fr 168px 88px 118px 108px 132px 40px; gap: 8px; align-items: start; padding: 8px 0; border-bottom: 1px solid var(--rs-line); }
.caprow:last-of-type { border-bottom: 0; }
.caprow.head { padding-bottom: 6px; }
.caprow.head span { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; color: var(--rs-muted); }
.caprow.row-invalid { background: #ff00000a; }
@media (max-width: 860px) { .caprow { grid-template-columns: 1fr; } .caprow.head { display: none; } }
/* The shipment calculator (item 4.64 slice 2). Laid out like `.caprow` above rather than
   afresh — same grid, same uppercase header, same collapse at 860px, so the two row lists
   on this screen read as one pattern. */
.ship-panel { margin-top: 14px; border-style: dashed; }
.shipterms { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 4px; }
@media (max-width: 860px) { .shipterms { grid-template-columns: 1fr 1fr; } }
.shiprow { display: grid; grid-template-columns: 1fr 96px 148px 82px 104px 190px 76px; gap: 8px; align-items: start; padding: 8px 0; border-bottom: 1px solid var(--rs-line); }
.shiprow:last-of-type { border-bottom: 0; }
.shiprow.head { padding-bottom: 6px; }
.shiprow.head span { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; color: var(--rs-muted); }
@media (max-width: 860px) { .shiprow { grid-template-columns: 1fr; } .shiprow.head { display: none; } }
/* A worked-out value is deliberately NOT a control — it is not the advisor's to type, and
   it must not look as though it is. */
.ship-derived { font-size: 12px; background: #eaf3fb; border: 1px solid #cfe3f7; border-radius: 6px; padding: 6px 8px; line-height: 1.35; }
.ship-derived small { display: block; color: var(--rs-muted); font-size: 10.5px; margin-top: 2px; }
.ship-derived.is-empty { background: transparent; border-style: dashed; color: var(--rs-muted); }
.capbook { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.capcarried { font-size: 11px; color: var(--rs-muted); line-height: 1.35; }
.capempty { font-size: 12.5px; color: var(--rs-muted); padding: 14px 0 2px; }
.capadd { margin-top: 12px; }
.captot { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 11px 0 0; margin-top: 9px; border-top: 1px solid var(--rs-line); }
.captot.captot-second { border-top: 0; padding-top: 4px; margin-top: 0; }
.seg-sm button { flex: none; padding: 7px 10px; font-size: 12px; }

.warn-note { font-size: 12.5px; color: #b36b00; background: var(--rs-warn-soft); border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
/* The red band. Same shape as .warn-note above — this screen's own warning language —
   rather than a second component, so the two levels read as one pair. */
.crit-note { font-size: 12.5px; color: var(--rs-crit); background: var(--rs-crit-soft); border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
.crit-note strong, .warn-note strong { font-size: 13px; }

/* The volatility read — built from design/mockups/three-way-forecast-volatility.html */
.volblock { border: 1px solid #0070c055; border-radius: 12px; padding: 14px; background: var(--rs-accent-soft); }
.volsub { font-size: 12.5px; color: var(--rs-muted); margin: -4px 0 13px; }
.volfigs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.volfig { background: var(--rs-card-bg); border: 1px solid var(--rs-line); border-radius: 10px; padding: 11px 12px; }
.volfig .k { font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--rs-muted); font-weight: 700; line-height: 1.35; }
.volfig .v { font-size: 20px; font-weight: 600; margin-top: 5px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.volfig .v.is-small { font-size: 15px; }
.volfig .s { font-size: 11.5px; color: var(--rs-muted); margin-top: 4px; line-height: 1.4; }
.volof { font-size: .6em; font-weight: 400; color: var(--rs-muted); }
.volpanel { background: var(--rs-card-bg); border: 1px solid var(--rs-line); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.volpanel-h { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.volpanel-s { font-size: 12px; color: var(--rs-muted); margin: 4px 0 10px; }
.volchart { overflow-x: auto; background: var(--rs-card-bg); border: 1px solid var(--rs-line); border-radius: 10px; padding: 10px 6px; }
.volchart svg { display: block; min-width: 700px; }
.volaxis { font-size: 9px; }
.volhead { font-size: 10.5px; font-weight: 600; }
.vollegend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 11.5px; color: var(--rs-muted); }
.volline { display: inline-block; width: 22px; height: 0; border-top: 2px solid; vertical-align: middle; margin-right: 6px; }
.volline.is-dashed { border-top-style: dashed; }
.voldot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.voldot.is-ring { background: var(--rs-card-bg); border: 2px solid var(--rs-ink); }
.volplain { font-size: 13px; line-height: 1.6; margin: 12px 0 0; }
.vollink { display: inline-block; margin-top: 12px; font-size: 12.5px; font-weight: 600; color: var(--rs-accent); }
.volwhy { background: var(--rs-panel-2, #f1f6fb); border: 1px solid var(--rs-line); border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: var(--rs-muted); margin-top: 12px; }
@media (max-width: 720px) { .volfigs { grid-template-columns: repeat(2, 1fr); } }
.tw-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

/* The two-year trend read (item 4.61b). Its frame is the volatility block's, unchanged,
   so the two read as one pair rather than two visitors — and it introduces no colour,
   radius or weight that is not already on this screen. */
.trendblock { border: 1px solid #0070c055; border-radius: 12px; padding: 14px; background: var(--rs-accent-soft); }
.trendsub { font-size: 12.5px; color: var(--rs-muted); margin: -4px 0 13px; }
.trendtbl { background: var(--rs-card-bg); border: 1px solid var(--rs-line); border-radius: 10px; padding: 4px 12px 6px; }
.trendtbl table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.trendtbl th, .trendtbl td { text-align: right; padding: 9px 8px; border-bottom: 1px solid var(--rs-line); font-variant-numeric: tabular-nums; white-space: nowrap; }
.trendtbl th:first-child, .trendtbl td:first-child, .trendtbl th:last-child, .trendtbl td:last-child { text-align: left; }
.trendtbl th { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--rs-muted); font-weight: 600; }
.trendtbl tr:last-child td { border-bottom: 0; }
.trendtbl td.meas { font-weight: 600; white-space: normal; }
.trendtbl td.meas small { display: block; font-weight: 400; font-size: 11px; color: var(--rs-muted); letter-spacing: 0; text-transform: none; margin-top: 2px; }
.trendtbl tr.is-warn { background: var(--rs-warn-soft, #ff99001a); }
.trendtbl tr.is-crit { background: var(--rs-crit-soft, #ff00000f); }
.trendtbl td.mv { font-weight: 600; }
.trendtbl td.mv.bad { color: var(--rs-crit, #ff0000); }
.trendtbl td.mv.ok { color: var(--rs-good, #4ca52d); }
.trendtbl td.mv.flat { color: var(--rs-muted); }
.band { display: inline-block; font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 2.5px 8px; }
.band-none { color: var(--rs-muted); background: var(--rs-panel-2, #f1f6fb); border: 1px solid var(--rs-line); }
.band-good { color: #3d7d22; background: #4ca52d1a; border: 1px solid #4ca52d59; }
.band-warn { color: #b36b00; background: #ff99001a; border: 1px solid #ff990059; }
.band-crit { color: #c00000; background: #ff00000f; border: 1px solid #ff000045; }
/* The table is the widest thing on this screen at six columns, so it scrolls in its own
   container rather than pushing the page sideways. */
.trendtbl .tblwrap { overflow-x: auto; }
</style>

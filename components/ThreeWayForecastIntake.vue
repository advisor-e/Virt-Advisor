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

          .tw-group
            .tw-glabel
              span.tw-dot
              h2.tw-h2 {{ $t('report.threeWayForecast.assume.purchasesHeading') }}
            .mgrid
              .m(v-for="(label, i) in monthLabels" :key="'p' + i")
                span.lbl {{ label }}
                b-input(v-model.number="form.purchases[i]" type="number" step="any" size="is-small")

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
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import currencyMixin from '~/mixins/currencyMixin'

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

  components: { ProvenanceBadge },

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
      form: this.restore ? JSON.parse(JSON.stringify(this.restore)) : this.blankForm()
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
     */
    slotSpecs () {
      return [
        { key: 'bs', required: true, titleKey: 'report.threeWayForecast.drop.bsTitle', whyKey: 'report.threeWayForecast.drop.bsWhy' },
        { key: 'pl', required: false, titleKey: 'report.threeWayForecast.drop.plTitle', whyKey: 'report.threeWayForecast.drop.plWhy' },
        { key: 'monthly', required: false, titleKey: 'report.threeWayForecast.drop.monthlyTitle', whyKey: 'report.threeWayForecast.drop.monthlyWhy' },
        { key: 'monthlyPrior', required: false, titleKey: 'report.threeWayForecast.drop.monthlyPriorTitle', whyKey: 'report.threeWayForecast.drop.monthlyPriorWhy' }
      ]
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
    salesTotal () { return this.sumOf(this.form.sales) }
  },

  watch: {
    /** Chip navigation from the page — one-way flow, no $refs reach-in. */
    step (n) {
      this.phase = this.phaseFor(n)
    }
  },

  mounted () {
    // Resolved after mount: a date derived from "today" during SSR and again in the
    // browser can differ across a midnight boundary, which is a hydration mismatch.
    if (!this.form.startDate) { this.form.startDate = this.defaultStartDate() }
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
        purchases: zeroes()
      }
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
    },

    backToConfirm () {
      this.phase = 'confirm'
      // step: which intake step is showing (1 drop, 2 confirm, 3 assumptions)
      this.$emit('step', 2)
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
      return {
        startDateSerial: this.serialOf(this.form.startDate),
        sales: this.form.sales.map(v => Number(v) || 0),
        purchases: this.form.purchases.map(v => Number(v) || 0),
        markup: Number(this.form.markup) / 100,
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
        assets: this.form.assets.map(a => ({
          opening: Number(a.opening.value) || 0,
          depreciationRate: Number(a.rate) / 100,
          additions: zeroes(),
          disposals: zeroes()
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
.mgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 560px) { .mgrid { grid-template-columns: repeat(2, 1fr); } }
.m { display: flex; align-items: center; gap: 6px; }
.m .lbl { width: 26px; font-size: 11px; color: var(--rs-muted); text-align: right; }
.m ::v-deep .control { flex: 1; min-width: 0; }
.m.seeded ::v-deep .input { border-color: #4ca52d59; background: #4ca52d0d; }

.warn-note { font-size: 12.5px; color: #b36b00; background: var(--rs-warn-soft); border-radius: 9px; padding: 10px 14px; margin-top: 8px; }
.tw-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>

<template lang="pug">
.sp-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.stockPurchasing.eyebrowClass')"
    :title="$t('report.stockPurchasing.title')"
    :client="$t('report.preparedFor')"
  )

  .sp-steps
    .sp-step(
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
    hero-figure(
      :label="$t('report.stockPurchasing.hero.salesReviewed')"
      :value="hasSales ? money(totals.salesReviewed) : '—'"
      :sub="$t('report.stockPurchasing.hero.acrossThePeriod')")
    hero-figure(
      :label="$t('report.stockPurchasing.hero.grossProfit')"
      :value="hasSales ? money(totals.grossProfit) : '—'"
      :sub="$t('report.stockPurchasing.hero.onThoseSales')")
    hero-figure(
      :label="$t('report.stockPurchasing.hero.averageMargin')"
      :value="hasSales ? percent(totals.averageMargin) : '—'"
      :sub="$t('report.stockPurchasing.hero.acrossEveryLine')")
    hero-figure(
      :label="$t('report.stockPurchasing.hero.linesReviewed')"
      :value="totals.linesReviewed ? num(totals.linesReviewed) : '—'"
      :sub="$t('report.stockPurchasing.hero.productsScored')")

  //- ══════════════════════════════════════════════════════════════════════════
  //- STEP 1 — what sold
  .sp-layout(v-if="step === 1")
    aside.sp-card
      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step1.importTitle') }}
        .sp-drop(:class="{ loaded: !!salesFile }" @dragover.prevent @drop.prevent="onDrop($event, 'sales')")
          .sp-drop-title {{ $t('report.stockPurchasing.step1.zoneTitle') }}
          .sp-drop-how {{ $t('report.stockPurchasing.step1.zoneHow') }}
          b-button(size="is-small" :loading="uploadingSales" @click="pickFile('salesSheet')") {{ $t('report.stockPurchasing.step1.choose') }}
          input(ref="salesSheet" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen($event, 'sales')")
          p.sp-file-note(v-if="salesFile") ✓ {{ salesReadNote }}
        p.sp-hint {{ $t('report.stockPurchasing.step1.columns') }}
        p.sp-file-error(v-if="salesError") {{ salesError }}

      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step1.entryTitle') }}
        p.sp-hint {{ $t('report.stockPurchasing.step1.entryHint') }}
        b-button.sp-add(size="is-small" icon-left="plus" @click="addLine") {{ $t('report.stockPurchasing.step1.addLine') }}
        p.sp-hint(v-if="!form.lines.length") {{ $t('report.stockPurchasing.step1.empty') }}

    .sp-main
      .sp-card(v-if="form.lines.length")
        .sp-group
          .sp-glabel
            span.sp-dot
            h2.sp-h2 {{ $t('report.stockPurchasing.step1.linesTitle') }}
          .sp-scroll
            table.sp-table
              thead
                tr
                  th {{ $t('report.stockPurchasing.col.code') }}
                  th.r {{ $t('report.stockPurchasing.col.quantity') }}
                  th.r {{ $t('report.stockPurchasing.col.sales') }}
                  th.r {{ $t('report.stockPurchasing.col.cost') }}
                  th {{ $t('report.stockPurchasing.col.entryDate') }}
                  th {{ $t('report.stockPurchasing.col.saleDate') }}
                  th.r {{ $t('report.stockPurchasing.col.shareOfStock') }}
                  th
              tbody
                tr(v-for="(line, i) in form.lines" :key="i")
                  td
                    b-input(size="is-small" :value="line.code" @input="v => setLine(i, 'code', v)")
                  td.r
                    b-input(size="is-small" type="number" step="any" :value="line.quantity" @input="v => setLine(i, 'quantity', v)")
                  td.r
                    b-input(size="is-small" type="number" step="any" :value="line.sales" @input="v => setLine(i, 'sales', v)")
                  td.r
                    b-input(size="is-small" type="number" step="any" :value="line.cost" @input="v => setLine(i, 'cost', v)")
                  td
                    b-input(size="is-small" type="date" :value="line.entryDate" @input="v => setLine(i, 'entryDate', v)")
                  td
                    b-input(size="is-small" type="date" :value="line.saleDate" @input="v => setLine(i, 'saleDate', v)")
                  td.r
                    b-input(size="is-small" type="number" step="any" :value="line.shareOfStock" @input="v => setLine(i, 'shareOfStock', v)")
                  td.sp-rm
                    b-button(size="is-small" type="is-text" @click="removeLine(i)") ✕

      .sp-card
        .sp-group
          .sp-glabel
            span.sp-dot
            h2.sp-h2 {{ $t('report.stockPurchasing.step1.criteriaTitle') }}
          p.sp-lead {{ $t('report.stockPurchasing.step1.criteriaLead', { max: maxScore }) }}
          //- 🔴 The one thing an advisor reading a column of 5s will otherwise get backwards.
          p.sp-warn {{ $t('report.stockPurchasing.step1.inverted') }}
          .sp-ladders
            .sp-ladder(v-for="c in criteria" :key="c")
              h3.sp-ladder-h {{ $t('report.stockPurchasing.criterion.' + c) }}
              .sp-bands
                .sp-band(v-for="band in laddersDescending[c]" :key="band.id")
                  span.p {{ band.points }}
                  span.w {{ band.id }}
                  span.rg {{ rangeLabel(c, band) }}

  //- ══════════════════════════════════════════════════════════════════════════
  //- STEP 2 — what's on the shelf
  .sp-layout(v-if="step === 2")
    aside.sp-card
      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step2.dropTitle') }}
        .sp-drop(:class="{ loaded: !!stockFile }" @dragover.prevent @drop.prevent="onDrop($event)")
          .sp-drop-title {{ $t('report.stockPurchasing.step2.zoneTitle') }}
          .sp-drop-how {{ $t('report.stockPurchasing.step2.zoneHow') }}
          b-button(size="is-small" :loading="uploading" @click="pickFile") {{ $t('report.stockPurchasing.step2.choose') }}
          input(ref="stockSheet" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen($event)")
          p.sp-file-note(v-if="stockFile") ✓ {{ readNote }}
        p.sp-hint {{ $t('report.stockPurchasing.step2.supported') }}
        p.sp-file-error(v-if="uploadError") {{ uploadError }}

      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step2.orTypeIt') }}
        b-field(:label="$t('report.stockPurchasing.step2.onHand')")
          b-input(type="number" step="any" :value="form.shelf.onHand" @input="v => setShelf('onHand', v)")
        b-field(:label="$t('report.stockPurchasing.step2.inTransit')")
          b-input(type="number" step="any" :value="form.shelf.inTransit" @input="v => setShelf('inTransit', v)")
        p.sp-hint {{ $t('report.stockPurchasing.step2.inTransitHint') }}

    .sp-main
      .sp-card(v-if="stockFile")
        .sp-group
          .sp-glabel
            span.sp-dot
            h2.sp-h2 {{ $t('report.stockPurchasing.step2.readTitle') }}
          table.sp-table
            tbody
              tr
                td {{ $t('report.stockPurchasing.step2.readPackage') }}
                td.r.num {{ stockFile.package }}
              tr
                td {{ $t('report.stockPurchasing.step2.readLines') }}
                td.r.num {{ num(stockFile.lines.length) }}
              tr
                td {{ $t('report.stockPurchasing.step2.readUnits') }}
                td.r.num {{ num(stockFile.unitsTotal) }}
              tr
                td {{ $t('report.stockPurchasing.step2.readValue') }}
                td.r.num {{ money(stockFile.valueTotal) }}
          //- 🔴 A stock sheet carries two of the five. Saying so on the screen is the whole
          //- difference between an honest 8-out-of-25 and a product that looks bad.
          .sp-carries
            p.sp-carries-h {{ $t('report.stockPurchasing.step2.carriesTitle') }}
            ul
              li(v-for="c in stockFile.carries" :key="c") ✓ {{ $t('report.stockPurchasing.criterion.' + c) }}
              li.missing(v-for="c in stockFile.missing" :key="c") — {{ $t('report.stockPurchasing.criterion.' + c) }}
            p.sp-hint {{ $t('report.stockPurchasing.step2.missingWhy') }}
          p.sp-hint(v-if="!stockFile.hasOnOrder") {{ $t('report.stockPurchasing.step2.noOnOrder') }}

      .sp-card
        .sp-group
          .sp-glabel
            span.sp-dot
            h2.sp-h2 {{ $t('report.stockPurchasing.step2.shelfTitle') }}
          table.sp-table
            tbody
              tr
                td {{ $t('report.stockPurchasing.step2.onHand') }}
                td.r.num {{ shelf.onHand ? num(shelf.onHand) : notEntered }}
              tr
                td {{ $t('report.stockPurchasing.step2.inTransit') }}
                td.r.num {{ shelf.inTransit ? num(shelf.inTransit) : notEntered }}
              tr.subtotal
                td {{ $t('report.stockPurchasing.step2.alreadyCommitted') }}
                td.r.num {{ shelf.alreadyCommitted ? num(shelf.alreadyCommitted) : notEntered }}

  //- ══════════════════════════════════════════════════════════════════════════
  //- STEP 3 — assess your stock exposure
  .sp-layout(v-if="step === 3")
    aside.sp-card
      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step3.entryTitle') }}
        b-field(:label="$t('report.stockPurchasing.step3.currentAssets')")
          b-input(type="number" step="any" :value="form.exposure.currentAssetsExStock" @input="v => setExposure('currentAssetsExStock', v)")
        b-field(:label="$t('report.stockPurchasing.step3.currentLiabilities')")
          b-input(type="number" step="any" :value="form.exposure.currentLiabilities" @input="v => setExposure('currentLiabilities', v)")
        b-field(:label="$t('report.stockPurchasing.step3.cashCommitted')")
          b-input(type="number" step="any" :value="form.exposure.cashCommitted" @input="v => setExposure('cashCommitted', v)")
        p.sp-hint {{ $t('report.stockPurchasing.step3.exStockHint') }}

    .sp-main
      .sp-card
        .sp-group
          .sp-glabel
            span.sp-dot
            h2.sp-h2 {{ $t('report.stockPurchasing.step3.resultTitle') }}
          table.sp-table
            tbody
              tr
                td
                  | {{ $t('report.stockPurchasing.step3.quickRatio') }}
                  span.sub {{ $t('report.stockPurchasing.step3.quickRatioSub') }}
                td.r.num {{ ratio(affordability.quickRatio) }}
              tr
                td {{ $t('report.stockPurchasing.step3.cashCommittedRow') }}
                td.r.num {{ affordability.cashCommitted ? money(affordability.cashCommitted) : notEntered }}
              tr.subtotal
                td {{ $t('report.stockPurchasing.step3.afterTheOrder') }}
                td.r.num(:class="afterTone") {{ ratio(affordability.quickRatioAfter) }}
          //- The workbook's own instruction, and the only verdict this model gives.
          .sp-verdict(v-if="affordability.carries !== null" :class="affordability.carries ? 'ok' : 'no'")
            | {{ affordability.carries ? $t('report.stockPurchasing.step3.carries') : $t('report.stockPurchasing.step3.doesNotCarry') }}
          p.sp-hint {{ $t('report.stockPurchasing.step3.liquidityRule') }}

  //- ══════════════════════════════════════════════════════════════════════════
  //- STEP 4 — what to buy
  .sp-main(v-if="step === 4")
    .sp-card
      .sp-group
        .sp-glabel
          span.sp-dot
          h2.sp-h2 {{ $t('report.stockPurchasing.step4.title') }}
        p.sp-lead(v-if="ranked.length") {{ $t('report.stockPurchasing.step4.lead', { shown: shownRanked.length, total: ranked.length, max: maxScore }) }}
        p.sp-hint(v-else) {{ $t('report.stockPurchasing.step4.empty') }}
        .sp-scroll(v-if="ranked.length")
          table.sp-table
            thead
              tr
                th {{ $t('report.stockPurchasing.col.code') }}
                th.r {{ $t('report.stockPurchasing.col.quantity') }}
                th.r {{ $t('report.stockPurchasing.col.sales') }}
                th.r {{ $t('report.stockPurchasing.col.grossProfit') }}
                th.r {{ $t('report.stockPurchasing.col.margin') }}
                th.r {{ $t('report.stockPurchasing.col.daysOnHand') }}
                th.c(v-for="c in criteria" :key="c") {{ $t('report.stockPurchasing.short.' + c) }}
                th.r {{ $t('report.stockPurchasing.col.total') }}
            tbody
              tr(v-for="line in shownRanked" :key="line.code")
                td.name {{ line.code }}
                td.r.num {{ line.quantity === null ? notScored : num(line.quantity) }}
                td.r.num {{ line.sales === null ? notScored : money(line.sales) }}
                td.r.num {{ line.grossProfit === null ? notScored : money(line.grossProfit) }}
                td.r.num {{ line.margin === null ? notScored : percent(line.margin) }}
                td.r.num {{ line.daysOnHand === null ? notScored : num(line.daysOnHand) }}
                td.c.num(v-for="c in criteria" :key="c" :class="{ unscored: !line.scores[c].scored }")
                  | {{ line.scores[c].scored ? line.scores[c].points : notScored }}
                td.r.num.total {{ line.total }} / {{ maxScore }}
        b-button.sp-more(v-if="ranked.length > shownRanked.length" size="is-small" @click="showAll = true")
          | {{ $t('report.stockPurchasing.step4.showAll', { total: ranked.length }) }}

  .sp-nav
    b-button(v-if="step > 1" @click="goTo(step - 1)") {{ $t('report.stockPurchasing.nav.back') }}
    b-button(v-if="step < 4" type="is-primary" @click="goTo(step + 1)") {{ $t('report.stockPurchasing.nav.next') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** How many ranked lines the screen shows before "show all" — the drawing's own fourteen. */
const RANKED_PREVIEW = 14

/**
 * StockPurchasing — the Stock Purchasing screen (Growth · Report class), item 4.94.
 *
 * FOUR steps, from the source workbook's own `Process` sheet: what sold, what's on the shelf,
 * assess your stock exposure, what to buy. Built from `design/mockups/stock-purchasing.html`,
 * approved by Mike 2026-09-13 after all eight of its decisions were ruled — step 3's name is his
 * own wording, replacing the recommended "What you can afford".
 *
 * Report class — a real client's product list, so NO "Illustrative" badge, and the screen opens
 * EMPTY. It never seeds itself from the workbook sample: the backend returns nothing for an empty
 * body by design (see the model header), because sample figures on a real client's page look
 * exactly like the client's own.
 *
 * All calculation is backend-only (POST /api/report/stock-purchasing); every figure rendered
 * comes back from the model, INCLUDING the five scoring ladders, which ride on the response as
 * `bands` so this screen holds no second copy of the rating words or their ranges.
 *
 * 🔴 STEP 2 IMPORTS A STOCK SHEET and says what it could not fill. Mike, 2026-09-13: "we need to
 * be able to import a stock sheet". A Cin7 or Unleashed stock-on-hand export carries two of the
 * five criteria — unit cost risk and share of stock held — and none of margin, how many sold or
 * days on hand, because there is no sale price and no date in that kind of file. The screen
 * prints both lists from the response's own `carries`/`missing` rather than deciding for itself,
 * and a criterion that could not be scored shows as "—" in the ranked table rather than as a
 * zero, so a 8-out-of-25 reads as a missing file and not as a bad product.
 */
export default {
  name: 'StockPurchasing',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /** Bearer token for the upload route, which carries firmAuth. The calc route is anonymous. */
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      step: 1,
      // Report class: the screen opens empty and stays empty until the advisor types or imports.
      form: {
        lines: [],
        shelf: { onHand: null, inTransit: null },
        exposure: { currentAssetsExStock: null, currentLiabilities: null, cashCommitted: null }
      },
      /** What the last stock-sheet upload read, or null. Never merged into `form.shelf` silently. */
      stockFile: null,
      uploading: false,
      uploadError: '',
      /** What the last sales-report upload read, or null. */
      salesFile: null,
      uploadingSales: false,
      salesError: '',
      showAll: false,
      data: null
      // `error` (the stale flag) comes from the reportRecompute mixin.
    }
  },

  computed: {
    /** The four step chips, in order. Step 3 is Mike's own wording. */
    stepChips () {
      const t = 'report.stockPurchasing.steps.'
      return [
        { n: 1, label: this.$t(t + 'sold') },
        { n: 2, label: this.$t(t + 'shelf') },
        { n: 3, label: this.$t(t + 'exposure') },
        { n: 4, label: this.$t(t + 'buy') }
      ]
    },

    /** The model's answer, or an empty one before the first recompute lands. */
    totals () {
      return (this.data && this.data.totals) ||
        { salesReviewed: 0, grossProfit: 0, averageMargin: null, linesReviewed: 0, quantity: 0 }
    },

    ranked () { return (this.data && this.data.ranked) || [] },

    shelf () {
      return (this.data && this.data.shelf) || { onHand: 0, inTransit: 0, alreadyCommitted: 0 }
    },

    affordability () {
      return (this.data && this.data.affordability) ||
        { quickRatio: null, quickRatioAfter: null, cashCommitted: 0, carries: null }
    },

    /** The five criteria and their ladders, from the model — never a second copy here. */
    criteria () { return (this.data && this.data.criteria) || [] },

    maxScore () { return (this.data && this.data.maxScore) || 25 },

    /**
     * Each ladder best-rung-first, which is how a ladder is read.
     *
     * The model lists them lowest-value-first so every criterion reads in one direction in the
     * data; on screen 5 belongs at the top. Reversing a copy, never the model's own array.
     */
    laddersDescending () {
      const bands = (this.data && this.data.bands) || {}
      const out = {}
      Object.keys(bands).forEach((key) => {
        out[key] = bands[key].slice().sort((a, b) => b.points - a.points)
      })
      return out
    },

    /**
     * 🔴 Whether any sales figure has been entered anywhere.
     *
     * The three headline money figures are meaningless without one, and a stock-sheet import
     * supplies none — so on an imported-only screen they would otherwise read $0, $0 and 0%,
     * which looks like a business that sold nothing rather than a file that never mentioned it.
     */
    hasSales () {
      return this.ranked.some(line => line.sales !== null)
    },

    shownRanked () {
      return this.showAll ? this.ranked : this.ranked.slice(0, RANKED_PREVIEW)
    },

    /** What a figure nobody has supplied reads as. Never 0, which is a real answer. */
    notEntered () { return this.$t('report.stockPurchasing.notEntered') },

    /** What a criterion the data could not fill reads as. Never 0, for the same reason. */
    notScored () { return '—' },

    afterTone () {
      if (this.affordability.carries === null) { return '' }
      return this.affordability.carries ? 'good' : 'crit'
    },

    /** One line naming the file that was read. */
    /** One line naming the sales report that was read. */
    salesReadNote () {
      if (!this.salesFile) { return '' }
      return this.$t('report.stockPurchasing.step1.readNote', { lines: this.salesFile.linesRead })
    },

    readNote () {
      if (!this.stockFile) { return '' }
      return this.$t('report.stockPurchasing.step2.readNote', {
        package: this.stockFile.package,
        lines: this.stockFile.lines.length
      })
    }
  },

  watch: {
    // Every entry box, the shelf and the exposure figures live under `form`, so one deep watcher
    // covers the screen. The mixin debounces, so a typed figure does not flood the backend.
    form: { deep: true, handler () { this.queueRecompute() } }
  },

  mounted () {
    // The mixin deliberately defines no `mounted` — each report fires its own first recompute.
    this.recompute()
  },

  methods: {
    /** @param {number} n */
    goTo (n) {
      if (n >= 1 && n <= 4) { this.step = n }
    },

    addLine () {
      this.form.lines.push({
        code: '',
        quantity: null,
        sales: null,
        cost: null,
        entryDate: null,
        saleDate: null,
        shareOfStock: null
      })
    },

    /** @param {number} i */
    removeLine (i) {
      this.form.lines.splice(i, 1)
    },

    /** @param {number} i @param {string} field @param {*} value */
    setLine (i, field, value) {
      this.$set(this.form.lines, i, Object.assign({}, this.form.lines[i], { [field]: value }))
    },

    /** @param {string} field @param {*} value */
    setShelf (field, value) {
      this.$set(this.form.shelf, field, value)
    },

    /** @param {string} field @param {*} value */
    setExposure (field, value) {
      this.$set(this.form.exposure, field, value)
    },

    /**
     * A band's printed range, in the workbook's own units.
     *
     * `from` is what the workbook prints; the band actually runs up to the next one's `from`,
     * which is ruled deviation 1. The label shows the printed edges because those are what an
     * advisor recognises from the spreadsheet — the closing of the gaps is a scoring rule, not a
     * relabelling of the ladder.
     *
     * @param {string} criterion @param {{from: number, upTo: (number|undefined)}} band
     * @returns {string}
     */
    rangeEdges (criterion, band) {
      // Margin is a ratio the workbook PRINTS as a percentage, and the headline above this card
      // speaks in percent too — a ladder reading "0.81" beside a hero reading "80.0%" makes the
      // advisor do the conversion. Share of stock stays a ratio, which is how the workbook prints
      // it; the rest are whole units of days, money or stock.
      let show = v => this.num(v)
      if (criterion === 'margin') { show = v => Math.round(v * 100) + '%' }
      if (criterion === 'shareOfStock') { show = v => String(v) }
      return {
        from: show(band.from),
        to: band.printedTo === undefined ? null : show(band.printedTo)
      }
    },

    /**
     * A band's printed range as one string.
     *
     * @param {string} criterion @param {{from: number, printedTo: (number|undefined)}} band
     * @returns {string}
     */
    rangeLabel (criterion, band) {
      const edges = this.rangeEdges(criterion, band)
      if (edges.to === null) {
        return this.$t('report.stockPurchasing.range.andUp', { from: edges.from })
      }
      return this.$t('report.stockPurchasing.range.fromTo', edges)
    },

    /** @param {number|null} v @returns {string} a ratio to 2dp, or the not-entered dash. */
    ratio (v) {
      return v === null || v === undefined ? this.notEntered : v.toFixed(2)
    },

    /** @param {number|null} v @returns {string} a percentage to 1dp, or the not-entered dash. */
    percent (v) {
      return v === null || v === undefined ? this.notEntered : (v * 100).toFixed(1) + '%'
    },

    /** @param {string} ref  'salesSheet' or 'stockSheet' */
    pickFile (ref) {
      const input = this.$refs[ref || 'stockSheet']
      if (input) { input.click() }
    },

    /** @param {Event} e @param {string} [kind] 'sales', default 'stock' */
    onFileChosen (e, kind) {
      const file = e.target.files && e.target.files[0]
      if (file) { this.receive(file, kind) }
      e.target.value = ''
    },

    /** @param {DragEvent} e @param {string} [kind] 'sales', default 'stock' */
    onDrop (e, kind) {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (file) { this.receive(file, kind) }
    },

    /**
     * Pre-upload sanity check — UX only; the backend's own checks are the boundary.
     * @param {File} file @returns {string|null}
     */
    fileCheckError (file) {
      if (!/\.(xlsx|csv)$/i.test(file.name)) { return this.$t('report.fileCheck.wrongType') }
      if (file.size > 5 * 1024 * 1024) { return this.$t('report.fileCheck.tooBig') }
      return null
    },

    /** @param {File} file @param {string} [kind] 'sales', default 'stock' */
    receive (file, kind) {
      const sales = kind === 'sales'
      const err = this.fileCheckError(file)
      if (err) {
        if (sales) { this.salesError = err } else { this.uploadError = err }
        return Promise.resolve()
      }
      return sales ? this.uploadSales(file) : this.upload(file)
    },

    /**
     * Send the one stock sheet. What comes back REPLACES the lines and the shelf, because an
     * import is the advisor saying "use this file" — but it is never merged silently into
     * half-typed figures, and the read is shown beside the result so they can see what landed.
     *
     * @param {File} file
     */
    async upload (file) {
      this.uploadError = ''
      this.uploading = true
      try {
        const json = await this.postFile('/api/report/stock-purchasing/intake', file)
        if (!json.success) {
          this.uploadError = (json.error && json.error.message) ||
            this.$t('report.stockPurchasing.step2.uploadFailed')
          return
        }
        this.stockFile = json.data
        this.form.lines = json.data.lines
        this.form.shelf = {
          onHand: json.data.shelf.onHand,
          inTransit: json.data.shelf.inTransit
        }
        this.recompute()
      } catch (e) {
        this.uploadError = this.$t('report.stockPurchasing.step2.uploadFailed')
      } finally {
        this.uploading = false
      }
    },

    /**
     * Send the one sales report — the other half of the import.
     *
     * 🔴 IT DOES NOT TOUCH THE SHELF. A sales report says what LEFT the business; the shelf is
     * what is still on it, and comes from the stock sheet or from the two boxes at step 2. A
     * sales import that quietly zeroed the shelf would make an already-stocked line look like one
     * the client has none of.
     *
     * @param {File} file
     */
    async uploadSales (file) {
      this.salesError = ''
      this.uploadingSales = true
      try {
        const json = await this.postFile('/api/report/stock-purchasing/sales-intake', file)
        if (!json.success) {
          this.salesError = (json.error && json.error.message) ||
            this.$t('report.stockPurchasing.step1.uploadFailed')
          return
        }
        this.salesFile = json.data
        this.form.lines = json.data.lines
        this.recompute()
      } catch (e) {
        this.salesError = this.$t('report.stockPurchasing.step1.uploadFailed')
      } finally {
        this.uploadingSales = false
      }
    },

    /**
     * POST one file to an intake route. Both intakes carry firmAuth, unlike the calc route.
     * @param {string} url @param {File} file @returns {Promise<Object>} the parsed envelope
     */
    postFile (url, file) {
      const body = new FormData()
      body.append('file', file)
      return fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiToken}` },
        body
      }).then(res => res.json())
    },

    /** The POST this screen recomputes with — consumed by the reportRecompute mixin. */
    recomputeRequest () {
      const numOrNull = v => (v === null || v === undefined || v === '' ? null : Number(v))
      return {
        url: '/api/report/stock-purchasing',
        body: {
          lines: this.form.lines.map(line => ({
            code: line.code || null,
            quantity: numOrNull(line.quantity),
            sales: numOrNull(line.sales),
            cost: numOrNull(line.cost),
            avgUnitCost: numOrNull(line.avgUnitCost),
            entryDate: line.entryDate || null,
            saleDate: line.saleDate || null,
            shareOfStock: numOrNull(line.shareOfStock)
          })),
          shelf: {
            onHand: numOrNull(this.form.shelf.onHand),
            inTransit: numOrNull(this.form.shelf.inTransit)
          },
          exposure: {
            currentAssetsExStock: numOrNull(this.form.exposure.currentAssetsExStock),
            currentLiabilities: numOrNull(this.form.exposure.currentLiabilities),
            cashCommitted: numOrNull(this.form.exposure.cashCommitted)
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
.sp-root { display: flex; flex-direction: column; gap: 16px; }

.sp-steps { display: flex; gap: 10px; flex-wrap: wrap; }
.sp-step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.sp-step .n {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 50%; background: var(--rs-line); color: var(--rs-ink); font-size: 11px;
}
.sp-step.active { color: #fff; background: var(--rs-accent); border-color: var(--rs-accent); }
.sp-step.active .n { background: #ffffff30; color: #fff; }
.sp-step.done { color: var(--rs-good); }

.sp-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .sp-layout { grid-template-columns: 1fr; } }
.sp-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.sp-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.sp-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.sp-group:last-child { border-bottom: 0; }
.sp-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.sp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.sp-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.sp-hint { font-size: 12px; color: var(--rs-muted); margin: 6px 0 0; }
.sp-lead { font-size: 13.5px; margin: 0 0 12px; }
.sp-warn { font-size: 12.5px; color: #a06000; background: var(--rs-warn-soft); border-radius: 8px; padding: 8px 11px; margin: 0 0 12px; }
.sp-add { margin-top: 8px; }
.sp-more { margin-top: 12px; }

.sp-scroll { overflow-x: auto; }
.sp-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sp-table th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line); white-space: nowrap;
}
.sp-table th.r, .sp-table td.r { text-align: right; }
.sp-table th.c, .sp-table td.c { text-align: center; }
.sp-table td { padding: 6px 10px 6px 0; border-bottom: 1px solid var(--rs-line); vertical-align: middle; }
.sp-table td.num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.sp-table td.name { font-weight: 600; color: var(--rs-ink); min-width: 120px; }
.sp-table td.good { color: var(--rs-good); }
.sp-table td.crit { color: var(--rs-crit); }
/* A criterion the data could not fill. Grey, never red — it is not a bad score. */
.sp-table td.unscored { color: var(--rs-muted); font-weight: 400; }
.sp-table td.total { color: var(--rs-ink); }
.sp-table tr.subtotal td { border-top: 2px solid var(--rs-ink); border-bottom: 0; font-weight: 700; color: var(--rs-ink); padding-top: 10px; }
.sp-table .sub { display: block; font-size: 11.5px; color: var(--rs-muted); font-weight: 400; margin-top: 2px; }
.sp-rm { width: 40px; text-align: right; }

.sp-ladders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 860px) { .sp-ladders { grid-template-columns: 1fr; } }
.sp-ladder-h { margin: 0 0 7px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.sp-bands { display: flex; flex-direction: column; gap: 1px; background: var(--rs-line); border: 1px solid var(--rs-line); border-radius: 9px; overflow: hidden; }
.sp-band { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; align-items: center; background: var(--rs-panel); padding: 7px 11px; font-size: 12.5px; }
.sp-band .p {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 5px; background: var(--rs-accent-soft); color: var(--rs-accent);
  font-weight: 700; font-size: 11px;
}
.sp-band .w { font-weight: 600; }
.sp-band .rg { font-size: 11.5px; color: var(--rs-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

.sp-drop { border: 2px dashed #7fd3f1; border-radius: 12px; padding: 16px; background: var(--rs-panel); text-align: center; }
.sp-drop.loaded { border-color: var(--rs-good); }
.sp-drop-title { font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
.sp-drop-how { font-size: 12px; color: var(--rs-muted); margin-bottom: 10px; }
.sp-file-note { font-size: 12px; color: var(--rs-good); margin-top: 8px; }
.sp-file-error { font-size: 12.5px; color: var(--rs-crit); margin-top: 8px; }

.sp-carries { margin-top: 12px; padding: 11px 13px; background: var(--rs-panel-2); border-radius: 9px; }
.sp-carries-h { font-size: 12.5px; font-weight: 600; margin: 0 0 6px; }
.sp-carries ul { margin: 0; padding: 0; list-style: none; font-size: 12.5px; }
.sp-carries li { padding: 2px 0; color: var(--rs-good); }
.sp-carries li.missing { color: var(--rs-muted); }

.sp-verdict { margin-top: 12px; padding: 9px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; }
.sp-verdict.ok { background: var(--rs-good-soft); color: var(--rs-good); }
.sp-verdict.no { background: var(--rs-warn-soft); color: #a06000; }

.sp-nav { display: flex; gap: 10px; justify-content: flex-end; }
</style>

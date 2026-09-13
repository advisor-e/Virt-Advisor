<template lang="pug">
.sd-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.salesDashboard.eyebrowClass')"
    :title="$t('report.salesDashboard.title')"
    :client="clientLine"
  )

  //- A failed recompute must never sit silently behind live-looking figures.
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute")

  //- Report class, opening on the source workbook's sample: the notice is what keeps that
  //- honest, exactly as Quick Position and the Volatility Report do.
  sample-notice(v-if="usingSample" :text="$t('report.salesDashboard.sampleFigures')")

  //- The headline is a FULL-WIDTH band: a direct child of the root, above everything else,
  //- never inside a column (RULED 2026-07-27; guarded).
  hero-strip(:columns="4" :stale="!!error")
    hero-figure(
      :label="$t('report.salesDashboard.hero.salesValue')"
      :value="money(totals.salesValue)"
      :sub="$t('report.salesDashboard.hero.salesValueSub', { count: num(totals.transactions) })")
    hero-figure(
      :label="$t('report.salesDashboard.hero.salesMargin')"
      :value="money(totals.salesMargin)"
      :sub="$t('report.salesDashboard.hero.salesMarginSub', { pct: percent(totals.marginPct) })")
    hero-figure(
      :label="$t('report.salesDashboard.hero.averageSale')"
      :value="totals.averageSaleValue === null ? dash : money(totals.averageSaleValue)"
      :sub="$t('report.salesDashboard.hero.averageSaleSub')")
    hero-figure(
      :label="$t('report.salesDashboard.hero.averageMargin')"
      :value="totals.averageSaleMargin === null ? dash : money(totals.averageSaleMargin)"
      :sub="$t('report.salesDashboard.hero.averageMarginSub')")

  .sd-stack

    //- ══════════════════════════════════════════════════════════════════════════
    //- The sales report. Not on the approved drawing, which shows only the result —
    //- Decision 8 rules the import in, so it sits first and reads the same file the
    //- Stock Purchasing screen reads, through the same reader.
    .sd-card
      .sd-group
        .sd-glabel
          span.sd-dot
          h2.sd-h2 {{ $t('report.salesDashboard.import.title') }}
        .sd-drop(:class="{ loaded: !!file }" @dragover.prevent @drop.prevent="onDrop")
          .sd-drop-title {{ $t('report.salesDashboard.import.zoneTitle') }}
          .sd-drop-how {{ $t('report.salesDashboard.import.zoneHow') }}
          b-button(size="is-small" :loading="uploading" @click="pickFile") {{ $t('report.salesDashboard.import.choose') }}
          input(ref="salesSheet" type="file" accept=".xlsx,.csv" hidden @change="onFileChosen")
          p.sd-file-note(v-if="file") ✓ {{ readNote }}
        p.sd-hint {{ $t('report.salesDashboard.import.columns') }}
        p.sd-file-error(v-if="uploadError") {{ uploadError }}
        //- What the file could and could not be cut by, from the response's own list rather
        //- than from a guess here — Decision 8.
        .sd-cuts(v-if="file")
          p.sd-cuts-h {{ $t('report.salesDashboard.import.cutsTitle') }}
          ul
            li(v-for="d in available" :key="d") ✓ {{ $t('report.salesDashboard.dimension.' + d) }}
            li.missing(v-for="d in unavailable" :key="d") — {{ $t('report.salesDashboard.dimension.' + d) }}
          p.sd-hint(v-if="!available.length") {{ $t('report.salesDashboard.import.cutsNone') }}
          p.sd-hint(v-if="!hasDates") {{ $t('report.salesDashboard.import.noDates') }}

    //- ══════════════════════════════════════════════════════════════════════════
    //- SALES OVER TIME — Mike's own Decision 9, and the only card here that goes beyond the
    //- workbook. It appears ONLY when the data really carries dates; the workbook's sample
    //- carries none, so on the sample this card is absent rather than empty or invented.
    .sd-card(v-if="trend")
      .sd-group
        .sd-card-h
          h2.sd-h2 {{ $t('report.salesDashboard.trend.title') }}
          .sd-measures
            span.sd-meas.on(v-if="!focus") {{ $t('report.salesDashboard.trend.allBrands') }}
            span.sd-meas.on(v-else) {{ $t('report.salesDashboard.trend.focused', { value: focus.value }) }}
            b-button(v-if="focus" size="is-small" type="is-text" @click="clearFocus")
              | {{ $t('report.salesDashboard.trend.clearFocus') }}
        bar-pair-chart(
          :groups="trendGroups"
          :format-value="kMoney"
          :aria-label="$t('report.salesDashboard.trend.title')")
        .sd-legend
          span
            span.sd-sw(style="background:#0070c0")
            | {{ $t('report.salesDashboard.trend.legendValue') }}
          span
            span.sd-sw(style="background:#00b1e0")
            | {{ $t('report.salesDashboard.trend.legendMargin') }}
          span.sd-legend-r
            b {{ $t('report.salesDashboard.trend.span', { from: monthLabel(trend.from), to: monthLabel(trend.to) }) }}
            |  · {{ $t('report.salesDashboard.trend.summary', { count: num(trend.transactions), value: money(trend.salesValue) }) }}
        p.sd-hint(v-if="trend.undated") {{ $t('report.salesDashboard.trend.undated', { count: num(trend.undated) }) }}
      .sd-foot
        div {{ $t('report.salesDashboard.trend.periodNote') }}
        div {{ $t('report.salesDashboard.trend.clickNote') }}

    //- ══════════════════════════════════════════════════════════════════════════
    //- THE SALES RANGES BREAKDOWN — the workbook's one table, with its nine ceilings typed.
    .sd-card
      .sd-group
        .sd-card-h
          h2.sd-h2 {{ $t('report.salesDashboard.bands.title') }}
          .sd-measures
            span.sd-meas.on {{ $t('report.salesDashboard.bands.yoursToSet') }}
        p.sd-lead {{ $t('report.salesDashboard.bands.lead') }}
        .sd-scroll
          table.sd-table
            thead
              tr
                th {{ $t('report.salesDashboard.bands.range') }}
                th.r {{ $t('report.salesDashboard.bands.upTo') }}
                th.r {{ $t('report.salesDashboard.col.transactions') }}
                th.r {{ $t('report.salesDashboard.col.salesValue') }}
                th.r {{ $t('report.salesDashboard.col.salesMargin') }}
                th.r {{ $t('report.salesDashboard.col.marginPct') }}
            tbody
              tr(v-for="(band, i) in bands" :key="i" :class="{ empty: band.transactions === 0 }")
                td.band-lo
                  template(v-if="band.to === null") {{ $t('report.salesDashboard.bands.greaterThan', { from: num(band.from - 1) }) }}
                  template(v-else) {{ $t('report.salesDashboard.bands.from', { from: num(band.from) }) }}
                td.r
                  //- The tenth band has no ceiling to set: it is whatever is left above the
                  //- ninth, which is the owner's last number rather than a tenth.
                  span.sd-ro(v-if="band.to === null") —
                  //- A TEXT box, not a number one, so a ceiling reads "15,000" the way the
                  //- floor beside it reads "10,001 —". It shows the plain digits while it has
                  //- the cursor, so grouping commas can never jump the caret mid-type.
                  input.sd-cut(
                    v-else
                    type="text"
                    inputmode="numeric"
                    :value="ceilingValue(i)"
                    :aria-label="$t('report.salesDashboard.bands.ceilingFor', { from: num(band.from) })"
                    @focus="editing = i"
                    @blur="editing = null"
                    @input="e => setCeiling(i, e.target.value)")
                td.r.num {{ num(band.transactions) }}
                td.r.num {{ money(band.salesValue) }}
                td.r.num {{ money(band.salesMargin) }}
                td.r.num.muted {{ band.marginPct === null ? dash : percent(band.marginPct) }}
              //- Only ever shown when a refund or credit note sits outside every band, so the
              //- Total below always equals the sum of what is above it.
              tr.empty(v-if="unbanded.transactions")
                td.band-lo {{ $t('report.salesDashboard.bands.unbanded') }}
                td.r
                  span.sd-ro —
                td.r.num {{ num(unbanded.transactions) }}
                td.r.num {{ money(unbanded.salesValue) }}
                td.r.num {{ money(unbanded.salesMargin) }}
                td.r.num.muted {{ dash }}
              tr.subtotal
                td {{ $t('report.salesDashboard.bands.total') }}
                td
                td.r.num {{ num(totals.transactions) }}
                td.r.num {{ money(totals.salesValue) }}
                td.r.num {{ money(totals.salesMargin) }}
                td.r.num {{ totals.marginPct === null ? dash : percent(totals.marginPct) }}
        b-button.sd-add(size="is-small" @click="resetCeilings") {{ $t('report.salesDashboard.bands.reset') }}
      .sd-foot
        div {{ $t('report.salesDashboard.bands.ceilingsNote') }}
        div {{ $t('report.salesDashboard.bands.marginNote') }}

    //- ══════════════════════════════════════════════════════════════════════════
    //- WHERE THE SALES COME FROM — the workbook's twenty chart views as one card
    //- (Decision 5): five dimension tabs, three measures, one ring and one ranked table.
    .sd-card
      .sd-group
        .sd-card-h
          h2.sd-h2 {{ $t('report.salesDashboard.mix.title') }}
          .sd-measures
            span.sd-meas(
              v-for="m in MEASURES" :key="m"
              :class="{ on: measure === m }"
              role="button"
              tabindex="0"
              @click="measure = m"
              @keyup.enter="measure = m")
              | {{ $t('report.salesDashboard.measure.' + m) }}
        p.sd-hint(v-if="!available.length") {{ $t('report.salesDashboard.mix.empty') }}
        template(v-else)
          .sd-tabs
            span.sd-tab(
              v-for="d in available" :key="d"
              :class="{ on: dimension === d, priv: d === 'salesperson' }"
              role="button"
              tabindex="0"
              @click="dimension = d"
              @keyup.enter="dimension = d")
              | {{ $t('report.salesDashboard.dimension.' + d) }}
          //- Decision 6's marker: the one cut that names real staff says so, so nobody opens
          //- it by accident in front of a room.
          p.sd-warn(v-if="dimension === 'salesperson'") {{ $t('report.salesDashboard.mix.privacyNote') }}

          .sd-mix
            .sd-ring-wrap
              doughnut-chart(
                :slices="ringSlices"
                :centre="measureTotalLabel"
                :centre-label="$t('report.salesDashboard.measure.' + measure)"
                :show-legend="false"
                :aria-label="$t('report.salesDashboard.mix.ringLabel', { dimension: $t('report.salesDashboard.dimension.' + dimension) })")
              //- The share is OF THE MEASURE, so the sentence names the measure. "43% of the
              //- money" under a transaction count is the same fault as "$140" above it.
              p.sd-note(v-if="rows.length > 1") {{ $t('report.salesDashboard.mix.lead.' + measure, { count: num(rows.length), dimension: $t('report.salesDashboard.dimensionPlural.' + dimension), pct: topTwoShare }) }}

            .sd-scroll
              table.sd-table
                thead
                  tr
                    th {{ $t('report.salesDashboard.dimension.' + dimension) }}
                    th.r {{ $t('report.salesDashboard.col.transactions') }}
                    th.r {{ $t('report.salesDashboard.col.salesValue') }}
                    th.r {{ $t('report.salesDashboard.col.share') }}
                    th &nbsp;
                    th.r {{ $t('report.salesDashboard.col.salesMargin') }}
                    th.r {{ $t('report.salesDashboard.col.marginPct') }}
                tbody
                  tr(
                    v-for="(row, i) in rows" :key="row.name"
                    :class="{ focused: focus && focus.value === row.name }"
                    role="button"
                    tabindex="0"
                    @click="focusOn(row)"
                    @keyup.enter="focusOn(row)")
                    td.name
                      span.sd-sw(:style="{ background: colourAt(i) }")
                      | {{ row.name }}
                    td.r.num {{ num(row.transactions) }}
                    td.r.num {{ money(row.salesValue) }}
                    td.r.num.muted {{ row.share === null ? dash : percent(row.share) }}
                    td
                      .sd-bar
                        i(:style="{ width: barWidth(row) }")
                    td.r.num {{ money(row.salesMargin) }}
                    td.r.num.muted {{ row.marginPct === null ? dash : percent(row.marginPct) }}
                  tr.subtotal
                    td {{ $t('report.salesDashboard.bands.total') }}
                    td.r.num {{ num(totals.transactions) }}
                    td.r.num {{ money(totals.salesValue) }}
                    td.r.num 100%
                    td
                    td.r.num {{ money(totals.salesMargin) }}
                    td.r.num {{ totals.marginPct === null ? dash : percent(totals.marginPct) }}
      //- The drawing's own footnotes, and the first of them is the single most useful sentence
      //- on the screen: transactions beside value and margin is what the card is FOR.
      .sd-foot(v-if="available.length")
        div {{ $t('report.salesDashboard.mix.conversationNote') }}
        div {{ $t('report.salesDashboard.mix.marginNote') }}

  .sd-nav
    b-button(@click="backToLibrary") {{ $t('modelLibrary.backToLibrary') }}
    b-button(type="is-primary" @click="printForClient") {{ $t('report.salesDashboard.print') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice'
import DoughnutChart from '~/components/base/DoughnutChart'
import BarPairChart from '~/components/base/BarPairChart'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * The three measures of Decision 5's grid, in the order the card offers them.
 *
 * The workbook draws five dimensions × these three as separate doughnuts, twice over. The row
 * of chips here is that grid, one click apart.
 */
const MEASURES = ['salesValue', 'salesMargin', 'transactions']

/**
 * Ten slice colours, the drawing's own. The first five are the brand palette; the other five
 * exist because a cut can have ten members and five colours cannot tell them apart.
 *
 * Position is meaning here: a colour is the row's position in the ranked table, so the ring and
 * the row beside it always agree. A palette shorter than the list wraps rather than running out.
 */
const SLICE_COLOURS = [
  '#002b64', '#0070c0', '#00b1e0', '#4ca52d', '#ff9900',
  '#7a5ea8', '#0f8a8a', '#c85a54', '#5b6f8a', '#8fbf3f'
]

/** Month labels for the trend axis. Short forms, as the drawing draws them. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * SalesDashboard — the Sales Dashboard screen (Growth · Report class), item 4.95.
 *
 * Built from `design/mockups/sales-dashboard.html`, approved by Mike 2026-09-13 after all nine of
 * its decisions were ruled — each put to him alone and each as recommended. It is the last of the
 * three Model Library cards that said "coming soon" and opened nothing.
 *
 * ONE PAGE, four cards: the sales report, sales over time, the sales ranges breakdown, and where
 * the sales come from. No steps — the drawing has none, because unlike Stock Purchasing there is
 * no sequence to walk: every card answers the same 140 rows a different way.
 *
 * Report class — a client's real sales list, so NO "Illustrative" badge. It opens on the source
 * workbook's own sample WITH a `SampleNotice` saying so, as Quick Position and the Volatility
 * Report do, and the header's client line reads "Sample data" until a file replaces it.
 *
 * All calculation is backend-only (POST /api/report/sales-dashboard); every figure on the screen
 * comes back from the model, including which cuts the data supports, so this screen holds no
 * second copy of the arithmetic and cannot drift from it.
 *
 * 🔴 THE SALESPERSON CUT CARRIES DECISION 6'S THREE LIMITS. It is never sent to the model —
 * nothing on this screen or its route touches an LLM. It never leaves the firm — nothing here is
 * pooled or shared upward. And its column is optional, so a firm that does not supply it simply
 * has no tab, which falls out of `available` rather than being special-cased. The tab carries an
 * amber marker and a line of its own, so nobody opens it by accident in front of a room. Scoped
 * to this one cut on this one screen — it is not precedent.
 *
 * 🔴 THE TREND CARD APPEARS ONLY IF THE DATA CARRIES DATES (Decision 9, Mike's own). The
 * workbook holds no date anywhere, so on the sample there is no card — not an empty chart, and
 * never a fabricated month.
 */
export default {
  name: 'SalesDashboard',

  components: {
    ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice, DoughnutChart, BarPairChart
  },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /** Bearer token for the upload route, which carries firmAuth. The calc route is anonymous. */
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      MEASURES,
      /** The client's own sales, once a file is read. Null means "use the workbook's sample". */
      sales: null,
      /** 🔴 The OWNER'S nine band ceilings. Seeded once from the first answer, never re-seeded. */
      ceilings: [],
      ceilingsSeeded: false,
      /** Which cut and which measure the mix card is showing. */
      dimension: 'brand',
      measure: 'salesValue',
      /** Which ceiling box has the cursor, so only that one drops its grouping commas. */
      editing: null,
      /** The row the trend is following, or null for all sales. */
      focus: null,
      /** What the last upload read, or null. */
      file: null,
      uploading: false,
      uploadError: '',
      data: null
      // `error` (the stale flag) comes from the reportRecompute mixin.
    }
  },

  computed: {
    /** Until a file is read, every figure on the page is the workbook's rather than a client's. */
    usingSample () { return this.sales === null },

    clientLine () {
      if (!this.usingSample) { return this.$t('report.preparedFor') }
      return this.$t('report.salesDashboard.sampleClient') + ' · ' +
        this.$t('report.salesDashboard.sampleCount', { count: this.num(this.totals.transactions) })
    },

    totals () {
      return (this.data && this.data.totals) || {
        salesValue: 0,
        salesMargin: 0,
        transactions: 0,
        averageSaleValue: null,
        averageSaleMargin: null,
        marginPct: null
      }
    },

    bands () { return (this.data && this.data.bands) || [] },

    unbanded () {
      return (this.data && this.data.unbanded) || { transactions: 0, salesValue: 0, salesMargin: 0 }
    },

    /** Which cuts the data genuinely supports — the model's own list, never a guess here. */
    available () { return (this.data && this.data.available) || [] },

    /** The cuts this file cannot offer, so the import card can say so rather than stay silent. */
    unavailable () {
      const all = ['brand', 'product', 'category', 'region', 'salesperson']
      return all.filter(d => !this.available.includes(d))
    },

    hasDates () { return Boolean(this.data && this.data.hasDates) },

    trend () { return (this.data && this.data.trend) || null },

    /** One group per month: sales value against sales margin, as the drawing draws them. */
    trendGroups () {
      if (!this.trend) { return [] }
      return this.trend.months.map(m => ({
        label: this.monthLabel(m.key),
        a: m.salesValue,
        b: m.salesMargin
      }))
    },

    /** The chosen cut's rows, ordered by the chosen measure so the ring matches the table. */
    rows () {
      const src = (this.data && this.data.dimensions && this.data.dimensions[this.dimension]) || []
      const key = this.measure
      return src.slice().sort((a, b) => (b[key] - a[key]) || a.name.localeCompare(b.name))
    },

    /** The measure's page total, shown in the middle of the ring. */
    measureTotal () {
      return this.rows.reduce((t, r) => t + r[this.measure], 0)
    },

    /**
     * 🔴 That total, formatted AS THE MEASURE IT IS. Two of the three are money and one is a
     * count of sales — rendering all three through `money()` put "$140" in the middle of the
     * ring above the word TRANSACTIONS, which is a wrong number in front of a client. Found by
     * opening the screen; no assertion in the suite had an opinion about it.
     */
    measureTotalLabel () {
      return this.measure === 'transactions' ? this.num(this.measureTotal) : this.money(this.measureTotal)
    },

    ringSlices () {
      return this.rows.map((row, i) => ({
        label: row.name,
        value: row[this.measure],
        colour: this.colourAt(i)
      }))
    },

    /** The drawing's own observation: two of them carry 43% of the money. */
    topTwoShare () {
      if (this.measureTotal === 0) { return this.dash }
      const top = this.rows.slice(0, 2).reduce((t, r) => t + r[this.measure], 0)
      return this.percent(top / this.measureTotal)
    },

    /** One line naming the file that was read. */
    readNote () {
      if (!this.file) { return '' }
      return this.$t('report.salesDashboard.import.readNote', { lines: this.num(this.file.linesRead) })
    },

    /** What a figure nobody can supply reads as. Never 0, which is a real answer. */
    dash () { return '—' }
  },

  watch: {
    ceilings: { deep: true, handler () { this.queueRecompute() } },
    focus () { this.recompute() },
    /**
     * A cut that vanishes when a new file is read must not leave the card showing an empty tab —
     * and `dimension` is the one piece of screen state the response can invalidate.
     */
    available (list) {
      if (list.length && !list.includes(this.dimension)) { this.dimension = list[0] }
      if (this.focus && !list.includes(this.focus.dimension)) { this.focus = null }
    }
  },

  mounted () {
    // The mixin deliberately defines no `mounted` — each report fires its own first recompute.
    this.recompute()
  },

  methods: {
    /** The same destination the header's back link carries, for the foot of a long page. */
    backToLibrary () {
      this.$router.push('/model-library')
    },

    /** The browser makes the PDF, as it does on every other report screen. */
    printForClient () {
      if (process.client && typeof window !== 'undefined' && window.print) { window.print() }
    },

    /** @param {number} i @returns {string} the slice colour for a row's position. */
    colourAt (i) {
      return SLICE_COLOURS[i % SLICE_COLOURS.length]
    },

    /** @param {number|null} v @returns {string} a percentage to 1dp, or the dash. */
    percent (v) {
      return v === null || v === undefined ? this.dash : (v * 100).toFixed(1) + '%'
    },

    /**
     * A month key as a label — "2026-03" becomes "Mar 26".
     *
     * The year is shown because a trend can span more than twelve months, and "Mar" twice on one
     * axis is the kind of chart that gets read as a fall when it is a new year.
     *
     * @param {string} key ISO yyyy-mm @returns {string}
     */
    monthLabel (key) {
      const parts = String(key || '').split('-')
      const month = MONTHS[Number(parts[1]) - 1]
      return month ? month + ' ' + parts[0].slice(2) : String(key)
    },

    /** @param {Object} row @returns {string} the row's bar width, against the largest. */
    barWidth (row) {
      const top = this.rows.length ? this.rows[0][this.measure] : 0
      if (!top || top <= 0) { return '0%' }
      return Math.max(0, Math.min(100, (row[this.measure] / top) * 100)) + '%'
    },

    /**
     * Follow one row in the trend — the question the spreadsheet cannot answer at all: not who is
     * biggest, but who is sliding. Clicking the row already followed clears it.
     *
     * @param {Object} row
     */
    focusOn (row) {
      if (this.focus && this.focus.value === row.name && this.focus.dimension === this.dimension) {
        this.focus = null
        return
      }
      this.focus = { dimension: this.dimension, value: row.name }
    },

    clearFocus () { this.focus = null },

    /**
     * One ceiling, as the owner sees it: grouped while they are not typing in it, plain digits
     * while they are. A money column where the floor reads "10,001 —" and the ceiling beside it
     * reads "15000" makes the reader do the grouping themselves.
     *
     * @param {number} i 0-8 @returns {number|string}
     */
    ceilingValue (i) {
      const v = this.ceilings[i]
      if (v === null || v === undefined) { return '' }
      return this.editing === i ? v : this.num(v)
    },

    /**
     * Set one ceiling. Everything else — the band below's floor, the banding, the totals —
     * follows from the backend on the next recompute.
     *
     * @param {number} i 0-8 @param {*} value
     */
    setCeiling (i, value) {
      const next = this.ceilings.slice()
      // Grouping commas and a stray currency symbol are how a person writes a number, not a
      // reason to refuse one. Anything left that is not a number clears the box.
      const digits = String(value === null || value === undefined ? '' : value).replace(/[^0-9.]/g, '')
      if (digits === '' || !isFinite(Number(digits))) {
        next[i] = null
        this.ceilings = next
        return
      }
      next[i] = Number(digits)
      this.ceilings = this.pushApart(next, i)
    },

    /**
     * 🔴 Make room for the ceiling the owner just set, by moving the others OUT OF ITS WAY.
     *
     * Mike's Decision 2, and the same behaviour built for Stock Purchasing's ladders the same
     * day, so the two models behave alike and nobody learns two habits. Refusing a crossing
     * boundary produces the worst outcome available: the box goes on showing the number they
     * typed while the model quietly bands against the defaults.
     *
     * It pushes OUTWARD FROM THE EDITED BOX, because only the screen knows which one was touched.
     * The model normalises left to right as a safety net, and on anything this returns it has
     * nothing left to do.
     *
     * @param {Array<number|null>} cuts @param {number} edited @returns {Array<number|null>}
     */
    pushApart (cuts, edited) {
      const out = cuts.slice()
      for (let i = edited + 1; i < out.length; i++) {
        const floor = out[i - 1] + 1
        if (out[i] === null || out[i] < floor) { out[i] = floor }
      }
      for (let i = edited - 1; i >= 0; i--) {
        const ceiling = out[i + 1] - 1
        if (out[i] === null || out[i] > ceiling) { out[i] = Math.max(1, ceiling) }
      }
      // Squeezing the bottom against the floor can leave two level; one pass upward restores the
      // gap without undoing what was typed above.
      for (let i = 1; i < out.length; i++) {
        if (out[i] <= out[i - 1]) { out[i] = out[i - 1] + 1 }
      }
      return out
    },

    /** Put the bands back to the workbook's own nine. */
    resetCeilings () {
      this.ceilings = []
      this.ceilingsSeeded = false
      this.recompute()
    },

    pickFile () {
      const input = this.$refs.salesSheet
      if (input) { input.click() }
    },

    /** @param {Event} e */
    onFileChosen (e) {
      const f = e.target.files && e.target.files[0]
      if (f) { this.receive(f) }
      e.target.value = ''
    },

    /** @param {DragEvent} e */
    onDrop (e) {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (f) { this.receive(f) }
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

    /** @param {File} file */
    receive (file) {
      const err = this.fileCheckError(file)
      if (err) {
        this.uploadError = err
        return Promise.resolve()
      }
      return this.upload(file)
    },

    /**
     * Send the one sales report. What comes back REPLACES the sample outright — an import is the
     * advisor saying "use this file" — and the sample notice goes with it.
     *
     * @param {File} file
     */
    async upload (file) {
      this.uploadError = ''
      this.uploading = true
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/report/sales-dashboard/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.uploadError = (json.error && json.error.message) ||
            this.$t('report.salesDashboard.import.uploadFailed')
          return
        }
        this.file = json.data
        this.sales = json.data.sales
        // A new file describes a different business; a focus held over from the last one would
        // silently narrow the trend to a name that is no longer on the page.
        this.focus = null
        this.recompute()
      } catch (e) {
        this.uploadError = this.$t('report.salesDashboard.import.uploadFailed')
      } finally {
        this.uploading = false
      }
    },

    /** The POST this screen recomputes with — consumed by the reportRecompute mixin. */
    recomputeRequest () {
      return {
        url: '/api/report/sales-dashboard',
        body: {
          // Null means "the workbook's own sample", which the model supplies rather than this
          // screen keeping a second copy of 140 rows.
          sales: this.sales === null ? undefined : this.sales,
          // The owner's own ceilings. Empty until they touch one, and the model then falls back
          // to the workbook's.
          ceilings: this.ceilings.length ? this.ceilings : undefined,
          focus: this.focus || undefined
        }
      }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
      // Seed the ceiling boxes from the ones the model ACTUALLY BANDED AGAINST, once. Any later
      // write is the owner's, so this never overwrites what they typed — and a ladder the model
      // rejected shows them the figures in force rather than the ones they half-typed.
      if (!this.ceilingsSeeded && data && data.ceilings) {
        this.ceilings = data.ceilings.slice()
        this.ceilingsSeeded = true
      }
    }
  }
}
</script>

<style scoped>
/* [A] Root: one gap value, so every vertical gap is identical (RULED 2026-07-27). */
.sd-root { display: flex; flex-direction: column; gap: 16px; }
/* MANDATORY when report-header is inside the screen: reset its `margin: 0 auto 22px`, which in a
   flex column shrinks the header below full width and doubles the header→band gap. */
.sd-root ::v-deep .rs-top { margin: 0; }

/* The drawing stacks its cards full width rather than using the two-column layout: every card
   here answers the same rows a different way, so none of them is an input column. */
.sd-stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.sd-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.sd-group { padding: 15px 16px; }
.sd-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.sd-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.sd-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.sd-card-h { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.sd-hint { font-size: 12px; color: var(--rs-muted); margin: 6px 0 0; }
.sd-lead { font-size: 13.5px; margin: 0 0 12px; }
.sd-warn { font-size: 12.5px; color: #a06000; background: var(--rs-warn-soft); border-radius: 8px; padding: 8px 11px; margin: 0 0 12px; }
.sd-add { margin-top: 12px; }
.sd-note { font-size: 11.5px; color: var(--rs-muted); margin: 8px 0 0; text-align: center; }

/* The card's own footnotes, as the drawing draws them: a quieter band beneath the content. */
.sd-foot {
  padding: 13px 16px; border-top: 1px solid var(--rs-line); background: var(--rs-panel-2);
  border-radius: 0 0 var(--rs-card-radius) var(--rs-card-radius);
  font-size: 12.5px; color: var(--rs-muted); display: flex; flex-direction: column; gap: 8px;
}

.sd-scroll { overflow-x: auto; }
.sd-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sd-table th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line); white-space: nowrap;
}
.sd-table th.r, .sd-table td.r { text-align: right; }
.sd-table td { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rs-bg); vertical-align: middle; }
.sd-table td.num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.sd-table td.muted { color: var(--rs-muted); font-weight: 400; }
.sd-table td.name { font-weight: 600; color: var(--rs-ink); min-width: 120px; }
.sd-table tr.empty td { color: var(--rs-muted); font-weight: 400; }
.sd-table tr.subtotal td { border-top: 2px solid var(--rs-ink); border-bottom: 0; font-weight: 700; color: var(--rs-ink); padding-top: 10px; }
/* A clickable row: the trend follows it. */
.sd-table tbody tr[role="button"] { cursor: pointer; }
.sd-table tbody tr[role="button"]:hover td { background: var(--rs-panel-2); }
.sd-table tbody tr.focused td { background: var(--rs-accent-soft); }
.sd-table tbody tr[role="button"]:focus-visible { outline: 2px solid var(--rs-accent-bright); outline-offset: -2px; }
.band-lo { font-variant-numeric: tabular-nums; color: var(--rs-muted); font-size: 12.5px; white-space: nowrap; }

/* The owner's own ceiling, sized to the digits a band edge ever needs. */
.sd-cut {
  width: 92px; font: inherit; font-size: 13px; font-variant-numeric: tabular-nums;
  text-align: right; font-weight: 600; color: var(--rs-ink);
  border: 1px solid var(--rs-line); border-radius: 7px; padding: 4px 8px; background: #fff;
}
.sd-cut:focus { outline: 2px solid var(--rs-accent-bright); outline-offset: 1px; }
.sd-ro {
  background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 7px;
  padding: 4px 9px; display: inline-block; font-variant-numeric: tabular-nums; font-weight: 600;
  color: var(--rs-muted); min-width: 82px; text-align: right; font-size: 13px;
}

/* One cut at a time, and one measure at a time — Decision 5's grid as two rows of chips. */
.sd-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.sd-tab {
  font-size: 12.5px; font-weight: 600; color: var(--rs-muted); background: var(--rs-panel-2);
  border: 1px solid var(--rs-line); border-radius: 999px; padding: 6px 13px; cursor: pointer;
}
.sd-tab.on { color: #fff; background: var(--rs-accent); border-color: var(--rs-accent); }
.sd-tab:focus-visible, .sd-meas:focus-visible { outline: 2px solid var(--rs-accent-bright); outline-offset: 1px; }
/* Decision 6's marker on the one cut that names real staff. */
.sd-tab.priv::after { content: "·"; margin-left: 6px; color: var(--rs-warn); font-weight: 700; }
.sd-measures { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.sd-meas {
  font-size: 11.5px; font-weight: 600; color: var(--rs-muted); background: var(--rs-panel);
  border: 1px solid var(--rs-line); border-radius: 7px; padding: 5px 11px; cursor: pointer;
}
.sd-meas.on { color: var(--rs-ink); background: var(--rs-accent-soft); border-color: var(--rs-accent); }

.sd-mix { display: grid; grid-template-columns: 260px 1fr; gap: 20px; align-items: start; }
@media (max-width: 860px) { .sd-mix { grid-template-columns: 1fr; } }
.sd-ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }

.sd-sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; }
.sd-bar { height: 7px; border-radius: 4px; background: var(--rs-line); min-width: 110px; overflow: hidden; }
.sd-bar i { display: block; height: 100%; border-radius: 4px; background: var(--rs-accent); }

.sd-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--rs-muted); margin-top: 10px; }
.sd-legend span { display: inline-flex; align-items: center; }
.sd-legend .sd-legend-r { margin-left: auto; }
.sd-legend b { color: var(--rs-ink); }

.sd-drop { border: 2px dashed #7fd3f1; border-radius: 12px; padding: 16px; background: var(--rs-panel); text-align: center; }
.sd-drop.loaded { border-color: var(--rs-good); }
.sd-drop-title { font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
.sd-drop-how { font-size: 12px; color: var(--rs-muted); margin-bottom: 10px; }
.sd-file-note { font-size: 12px; color: var(--rs-good); margin-top: 8px; }
.sd-file-error { font-size: 12.5px; color: var(--rs-crit); margin-top: 8px; }

.sd-cuts { margin-top: 12px; padding: 11px 13px; background: var(--rs-panel-2); border-radius: 9px; }
.sd-cuts-h { font-size: 12.5px; font-weight: 600; margin: 0 0 6px; }
.sd-cuts ul { margin: 0; padding: 0; list-style: none; font-size: 12.5px; }
.sd-cuts li { padding: 2px 0; color: var(--rs-good); }
.sd-cuts li.missing { color: var(--rs-muted); }

.sd-nav { display: flex; gap: 10px; justify-content: flex-end; }

/* The client's copy. The controls go, the figures stay — same rule as every other report. */
@media print {
  .sd-nav, .sd-card .sd-drop, .sd-add { display: none; }
  .sd-card { break-inside: avoid; }
}
</style>

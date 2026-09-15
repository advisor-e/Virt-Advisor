<template lang="pug">
.wr-root
  //- A failed recompute must never sit silently behind live-looking figures.
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute")

  sample-notice(v-if="usingSample" :text="$t('report.sampleFigures')")

  //- The headline is a FULL-WIDTH band, a direct child of the root, above everything
  //- else and never inside a column (ruled 2026-07-27; guarded).
  hero-strip(:columns="4" :stale="!!error")
    hero-figure(
      :label="$t('report.wagesReview.report.hero.planned')"
      :value="money(totals.margin)"
      :tone="totals.margin < 0 ? 'crit' : 'default'"
      :sub="$t('report.wagesReview.report.hero.plannedSub', { pct: percent(headline.marginPctOfRevenue) })")
    hero-figure(
      :label="$t('report.wagesReview.report.hero.actual')"
      :value="money(totals.actual)"
      :tone="totals.actual < 0 ? 'crit' : 'default'"
      :sub="$t('report.wagesReview.report.hero.actualSub')")
    hero-figure(
      :label="$t('report.wagesReview.report.hero.variance')"
      :value="money(totals.variance)"
      :tone="totals.variance < 0 ? 'crit' : 'default'"
      :sub="$t('report.wagesReview.report.hero.varianceSub')")
    hero-figure(
      :label="$t('report.wagesReview.report.hero.tightest')"
      :value="tightestName"
      :tone="tightestIsLoss ? 'crit' : 'default'"
      :sub="tightestSub")

  //- ── The charts ────────────────────────────────────────────────────────────
  //- Above the tables, per the approved drawing: the picture first, the exact figures
  //- underneath for the conversation. Every one is `computeWages`'s own output mapped to a
  //- shape — no arithmetic happens here, for the reason in this file's header.
  //-
  //- THREE, NOT FOUR. The drawing carried a fourth — a WaterfallChart of planned → variance
  //- → actual — and Mike cut it on 2026-09-15: it restated the three headline figures above
  //- in a different shape rather than adding a fact. The three that remain each say
  //- something no table row makes visible.
  .wr-card.wr-chart
    h3.wr-title {{ $t('report.wagesReview.report.charts.marginByMonthTitle') }}
    p.wr-note {{ $t('report.wagesReview.report.charts.marginByMonthNote') }}
    .wr-chartwrap
      line-chart(
        :points="marginPoints"
        :format-value="money"
        :aria-label="$t('report.wagesReview.report.charts.marginByMonthAria')")

  .wr-card.wr-chart
    h3.wr-title {{ $t('report.wagesReview.report.charts.seasonMixTitle') }}
    p.wr-note {{ $t('report.wagesReview.report.charts.seasonMixNote') }}
    .wr-chartwrap
      bar-pair-chart(
        :groups="seasonMixGroups"
        colour-a="#0070c0"
        colour-b="#ff9900"
        :format-value="kMoney"
        :aria-label="$t('report.wagesReview.report.charts.seasonMixAria')")
    .wr-legend
      span
        i.wr-sw(style="background:#0070c0")
        | {{ $t('report.wagesReview.report.charts.seasonMixBills') }}
      span
        i.wr-sw(style="background:#ff9900")
        | {{ $t('report.wagesReview.report.charts.seasonMixCosts') }}

  .wr-card.wr-chart
    h3.wr-title {{ $t('report.wagesReview.report.charts.shareTitle') }}
    p.wr-note {{ $t('report.wagesReview.report.charts.shareNote') }}
    .wr-ringrow
      .wr-ring
        //- The component's own legend is OFF and this one is drawn beside it. Its legend
        //- prints `Math.max(value, 0)`, so a losing season arrives as "0%" — which claims
        //- the season earned nothing when it lost money. The rows below say so in words.
        doughnut-chart(
          :slices="shareSlices"
          :centre="money(totals.margin)"
          :centre-label="$t('report.wagesReview.report.charts.shareCentreLabel')"
          :show-legend="false"
          :aria-label="$t('report.wagesReview.report.charts.shareAria')")
      .wr-ringlegend
        table.wr-table.wr-narrow
          thead
            tr
              th {{ $t('report.wagesReview.report.col.season') }}
              th.wr-num {{ $t('report.wagesReview.report.col.months') }}
              th.wr-num {{ $t('report.wagesReview.report.col.labourMargin') }}
              th.wr-num {{ $t('report.wagesReview.report.col.share') }}
          tbody
            tr(v-for="s in shareRows" :key="s.season")
              td
                i.wr-sw(:style="{ background: s.colour }")
                | {{ s.name }}
              td.wr-num {{ s.months }}
              td.wr-num(:class="{ 'wr-loss': s.margin < 0 }") {{ money(s.margin) }}
              td.wr-num(:class="{ 'wr-loss': s.share === null }") {{ s.shareLabel }}
          tfoot
            tr
              td {{ $t('report.wagesReview.report.charts.shareTheYear') }}
              td.wr-num {{ months.length }}
              td.wr-num {{ money(totals.margin) }}
              td.wr-num {{ percent(1) }}

  .wr-card
    h3.wr-title {{ $t('report.wagesReview.report.seasonsTitle') }}
    p.wr-note {{ $t('report.wagesReview.report.seasonsNote') }}
    .wr-scroll
      table.wr-table
        thead
          tr
            th {{ $t('report.wagesReview.report.col.season') }}
            th.wr-num {{ $t('report.wagesReview.report.col.revenue') }}
            th.wr-num {{ $t('report.wagesReview.report.col.cost') }}
            th.wr-num {{ $t('report.wagesReview.report.col.margin') }}
            th.wr-num {{ $t('report.wagesReview.report.col.hours') }}
        tbody
          tr(v-for="s in seasons" :key="s.season")
            td {{ s.name }}
            td.wr-num {{ money(s.revenue) }}
            td.wr-num {{ money(s.cost) }}
            td.wr-num(:class="{ 'wr-loss': s.margin < 0 }") {{ money(s.margin) }}
            td.wr-num {{ hours(s.hours) }}

  .wr-card
    h3.wr-title {{ $t('report.wagesReview.report.monthsTitle') }}
    p.wr-note {{ $t('report.wagesReview.report.monthsNote') }}
    .wr-scroll
      table.wr-table
        thead
          tr
            th {{ $t('report.wagesReview.report.col.month') }}
            th {{ $t('report.wagesReview.report.col.season') }}
            th.wr-num {{ $t('report.wagesReview.report.col.revenue') }}
            th.wr-num {{ $t('report.wagesReview.report.col.wageCost') }}
            th.wr-num {{ $t('report.wagesReview.report.col.planned') }}
            th.wr-num {{ $t('report.wagesReview.report.col.actual') }}
            th.wr-num {{ $t('report.wagesReview.report.col.variance') }}
        tbody
          tr(v-for="m in months" :key="m.name")
            td {{ m.name }}
            td.wr-season {{ m.season }}
            td.wr-num {{ money(m.revenue) }}
            td.wr-num {{ money(m.wageCost) }}
            td.wr-num(:class="{ 'wr-loss': m.margin < 0 }") {{ money(m.margin) }}
            td.wr-num {{ money(m.actual) }}
            td.wr-num(:class="{ 'wr-loss': m.variance < 0 }") {{ money(m.variance) }}
        tfoot
          tr
            td {{ $t('report.wagesReview.report.year') }}
            td.wr-season {{ basisLabel }}
            td.wr-num {{ money(totals.revenue) }}
            td.wr-num {{ money(totals.wageCost) }}
            td.wr-num(:class="{ 'wr-loss': totals.margin < 0 }") {{ money(totals.margin) }}
            td.wr-num {{ money(totals.actual) }}
            td.wr-num(:class="{ 'wr-loss': totals.variance < 0 }") {{ money(totals.variance) }}

  //- The allowance line is SEASONAL ONLY. On the shutdown basis each person's allowance is
  //- inside their own monthly wage rather than on a line of its own, so the engine's total
  //- is 0 there — and "Overnight allowances for the year: $0" would tell an advisor the team
  //- receives none, which is false. Absent says nothing untrue; $0 does.
  p.wr-basis
    | {{ $t('report.wagesReview.report.basisLine', { basis: basisLabel, people: headcount }) }}
    template(v-if="showsAllowanceLine")
      |  {{ $t('report.wagesReview.report.allowanceLine', { allowance: money(totals.allowance) }) }}

  .wr-actions
    b-button(@click="$emit('back')") {{ $t('report.wagesReview.report.back') }}
</template>

<script>
/**
 * WagesReport — step 5 of the Wages/Salary Review: the report itself.
 *
 * The first screen of this model that calls the backend. Everything on it is
 * `computeWages`'s own output — nothing is recalculated here, which is the whole reason
 * the four input steps deliberately showed no planned figures: two implementations of one
 * number is how they start to disagree.
 *
 * WHAT AN ADVISOR OPENS WITH IS THE SEASON TABLE, not the year. The same team on the same
 * pay makes 52,270 in a Dry n Light month and LOSES 13,972 in a Wet n Dark one — a swing
 * of more than 66,000 on the weather alone, because a field team is paid its contracted
 * hours whatever the sky does. The year total hides that completely, so the seasons come
 * first and the months second.
 *
 * ⚠ THE TIGHTEST MONTH IS A HEADLINE FIGURE because of what the port found: correcting the
 * workbook's two defects moved July's planned margin from +181 to −132. The tightest month
 * of the plan no longer breaks even, and a year total of 288,935 says nothing about that.
 *
 * Recompute goes through `reportRecompute` (debounce + monotonic request stamp), so a slow
 * older response can never overwrite a newer one, and `error` is the mixin's STALE FLAG —
 * a boolean, never a message. The stale banner and the greyed figures are what a failed
 * recompute looks like; it must never sit silently behind live-looking numbers.
 */
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice'
import LineChart from '~/components/base/LineChart'
import BarPairChart from '~/components/base/BarPairChart'
import DoughnutChart from '~/components/base/DoughnutChart'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** Everything the template reads, before the first response lands. */
function emptyResult () {
  return {
    basis: 'seasonal',
    months: [],
    seasons: [],
    headcount: 0,
    seasonShare: [],
    totals: { revenue: 0, wageCost: 0, margin: 0, actual: 0, variance: 0, allowance: 0 },
    headline: { margin: 0, actual: 0, variance: 0, marginPctOfRevenue: 0, tightestMonth: null }
  }
}

export default {
  name: 'WagesReport',

  components: {
    HeroStrip,
    HeroFigure,
    StaleBanner,
    SampleNotice,
    LineChart,
    BarPairChart,
    DoughnutChart
  },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /**
     * The assembled engine payload from steps 1-4: { basis, seasonNames, settings,
     * allowances, months, people }. Null until the steps have been confirmed.
     */
    inputs: { type: Object, default: null },
    /** Whether the figures behind this are still the workbook's sample. */
    usingSample: { type: Boolean, default: true }
  },

  data () {
    return {
      // `error` (the stale flag) comes from the reportRecompute mixin.
      data: emptyResult()
    }
  },

  computed: {
    /** @returns {Array} the twelve months as the engine returned them. */
    months () { return this.data.months || [] },
    /** @returns {Array} the three seasons, in wet/std/dry order. */
    seasons () { return this.data.seasons || [] },
    /** @returns {Object} the year's totals. */
    totals () { return this.data.totals || emptyResult().totals },
    /** @returns {Object} the engine's own headline block. */
    headline () { return this.data.headline || emptyResult().headline },
    /** @returns {number} people with a name on the payroll. */
    headcount () { return this.data.headcount || 0 },
    /** @returns {string} which basis produced these figures. */
    basisLabel () {
      return this.data.basis === 'shutdown'
        ? this.$t('report.wagesReview.work.basisShutdown')
        : this.$t('report.wagesReview.work.basisSeasonal')
    },
    /**
     * @returns {boolean} whether the year's overnight-allowance line is shown at all.
     *
     * Seasonal only. `Seasonal Inputs` CM7 leaves the allowance out of each person's monthly
     * wage, so it is a real separate line there. `Shutdown Inputs` CL7 puts it inside the
     * wage, so the engine reports no separate total on that basis (CORRECTION 3 in
     * `server/report/wagesModel.js`) — and a "$0" line would read as "the team gets none".
     */
    showsAllowanceLine () { return this.data.basis !== 'shutdown' },
    /** @returns {string} the tightest month's name, or a dash before the first result. */
    tightestName () {
      const t = this.headline.tightestMonth
      return t && t.name ? t.name : this.dash
    },
    /** @returns {string} that month's margin and season, under the name. */
    tightestSub () {
      const t = this.headline.tightestMonth
      if (!t) { return '' }
      return this.money(t.margin) + ' · ' + (t.season || '')
    },
    /** @returns {boolean} whether the tightest month is a loss, for the headline's tone. */
    tightestIsLoss () {
      const t = this.headline.tightestMonth
      return !!(t && t.margin < 0)
    },
    /** The em dash every report shows where a figure does not exist yet. */
    dash () { return '—' },

    // ── the charts ──────────────────────────────────────────────────────────
    // Each of these is a SHAPE, not a sum. The engine has already done the arithmetic and
    // this file's header says why that matters: two implementations of one number is how
    // they start to disagree.

    /**
     * @returns {Array} `{ label, value }` per month for the margin line — the planned
     * margin, negatives INTACT so a loss draws below the zero line.
     */
    marginPoints () {
      return this.months.map(m => ({ label: m.name, value: m.margin }))
    },

    /**
     * @returns {Array} `{ label, a, b }` per season — what the team bills against what it
     * costs, from the season-comparison card (one representative month of each kind).
     *
     * ⚠ THIS IS `seasons`, NOT `seasonShare`. Right here because the question is "what does
     * a month of this kind bill and cost", which is exactly what that block answers. Both
     * values are a billing and a cost and so are always positive — the MARGIN between them
     * is what can go negative, and that is chart 1's subject, not this one's.
     */
    seasonMixGroups () {
      return this.seasons.map(s => ({ label: s.name, a: s.revenue, b: s.cost }))
    },

    /**
     * @returns {Array} the year's seasons, largest margin first, with the colour each
     * carries on the ring and the words its share is printed as.
     *
     * ⚠ THIS IS `seasonShare`, NOT `seasons`. The ring shows shares of the YEAR, and only
     * this block's figures are parts of that whole — `seasons` costs one representative
     * month of each kind and sums to something that is not the year at all.
     */
    shareRows () {
      const palette = ['#0070c0', '#00b1e0', '#4a6b8a']
      return (this.data.seasonShare || []).map((s, i) => ({
        season: s.season,
        name: s.name,
        months: s.months,
        margin: s.margin,
        share: s.share,
        // A losing season is red on the ring's legend and says so in words. The engine
        // sends null rather than 0 precisely so this decision lands here and is visible.
        colour: s.margin < 0 ? '#ff0000' : palette[i % palette.length],
        shareLabel: s.share === null
          ? this.$t('report.wagesReview.report.charts.shareNothing')
          : this.percent(s.share)
      }))
    },

    /** @returns {Array} `{ label, value, colour }` per slice, for the ring itself. */
    shareSlices () {
      return this.shareRows.map(s => ({ label: s.name, value: s.margin, colour: s.colour }))
    }
  },

  watch: {
    // A change on any earlier step re-runs the model rather than leaving the report
    // showing figures from inputs the advisor has already moved on from.
    inputs: {
      deep: true,
      handler () { this.queueRecompute() }
    }
  },

  mounted () {
    // The mixin deliberately defines no `mounted` — each report fires its own first
    // recompute, because some seed extra state first.
    this.recompute()
  },

  methods: {
    /**
     * Hours, to the nearest whole one. Not money, so `currencyMixin` is the wrong tool
     * and a local formatter is right — this is the one figure on the screen that is a
     * quantity rather than a currency.
     * @param {number} n
     * @returns {string}
     */
    hours (n) {
      // `Number(null)` is 0 and `Number('')` is 0, so testing the CONVERTED value alone
      // would render a missing figure as "0" — which reads as "no hours worked" rather
      // than "no figure", and on an hours column those are different claims.
      if (n === null || n === undefined || n === '') { return this.dash }
      const v = Number(n)
      return isFinite(v) ? String(Math.round(v)) : this.dash
    },

    /**
     * A decimal share as a percentage — the same one-decimal convention the other
     * reports use.
     * @param {number} v e.g. 0.212
     * @returns {string} e.g. "21.2%"
     */
    percent (v) {
      return v === null || v === undefined || !isFinite(Number(v))
        ? this.dash
        : (Number(v) * 100).toFixed(1) + '%'
    },

    /**
     * The POST this screen recomputes with — consumed by the reportRecompute mixin.
     *
     * An EMPTY body is deliberate when the steps have not been confirmed: the route falls
     * back to the workbook's own sample, so the report shows the sample behind its notice
     * rather than a blank screen. Skipping the request instead would leave the stale
     * banner unreachable, and a report that cannot show it has failed is worse than one
     * showing the sample.
     */
    recomputeRequest () {
      return { url: '/api/report/wages-review', body: this.inputs || {} }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
.wr-card {
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
/* The charts are the same card as the tables — nothing about them is a different object on
   the page, so nothing here changes the frame. */
.wr-chartwrap { overflow-x: auto; }
.wr-legend {
  display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px;
  font-size: 11.5px; color: var(--rs-muted);
}
.wr-legend span { display: inline-flex; align-items: center; }
.wr-sw {
  width: 11px; height: 11px; border-radius: 3px; display: inline-block;
  margin-right: 7px; flex: none;
}
.wr-ringrow { display: flex; gap: 26px; align-items: center; flex-wrap: wrap; }
.wr-ring { flex: 0 0 210px; max-width: 210px; }
.wr-ringlegend { flex: 1 1 340px; min-width: 0; overflow-x: auto; }
/* The ring's legend is a narrow table beside a fixed-width ring, so the 640px floor the
   two big tables need would force a scrollbar at every width. */
.wr-table.wr-narrow { min-width: 340px; }
.wr-title { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 4px; }
.wr-note { font-size: 12px; color: var(--rs-muted); margin: 0 0 12px; }
.wr-scroll { overflow-x: auto; }
.wr-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.wr-table th {
  font-size: 11px; font-weight: 600; color: var(--rs-muted); text-align: left;
  padding: 0 8px 6px; white-space: nowrap;
}
.wr-table td { font-size: 12.5px; color: var(--rs-body); padding: 5px 8px; border-top: 1px solid var(--rs-line); }
.wr-num { text-align: right; white-space: nowrap; }
.wr-season { color: var(--rs-muted); }
/* A loss is the thing this model exists to surface, so it is coloured wherever it lands —
   a season, a month, or the year. */
.wr-loss { color: var(--rs-crit); font-weight: 600; }
.wr-table tfoot td { border-top: 2px solid var(--rs-line); font-weight: 700; color: var(--rs-ink); }
.wr-basis { font-size: 12px; color: var(--rs-muted); margin: 0 0 16px; }
.wr-actions { display: flex; justify-content: flex-start; }
@media print { .wr-actions { display: none !important; } }
</style>

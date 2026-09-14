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

  p.wr-basis
    | {{ $t('report.wagesReview.report.basisLine', { basis: basisLabel, people: headcount }) }}
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
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** Everything the template reads, before the first response lands. */
function emptyResult () {
  return {
    basis: 'seasonal',
    months: [],
    seasons: [],
    headcount: 0,
    totals: { revenue: 0, wageCost: 0, margin: 0, actual: 0, variance: 0, allowance: 0 },
    headline: { margin: 0, actual: 0, variance: 0, marginPctOfRevenue: 0, tightestMonth: null }
  }
}

export default {
  name: 'WagesReport',

  components: { HeroStrip, HeroFigure, StaleBanner, SampleNotice },

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
    dash () { return '—' }
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

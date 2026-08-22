<template lang="pug">
.ed-report
  template(v-if="result")
    //- Demo/manual path: NOTHING here came from the client until they seed it (Mike's
    //- 2026-07-20 smoke pass — a changed sales figure against untouched sample costs
    //- produced a plausible-looking but meaningless result).
    sample-notice(v-if="onSampleFigures" :text="$t('report.sampleFigures')")
    //- A failure AFTER the first load must never sit silently behind stale figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )
    hero-strip(:stale="!!error")
      hero-figure(
        :label="$t('report.ebitdaDcf.hero.ev')"
        :value="money(result.valuation.enterpriseValue)"
        :sub="$t('report.ebitdaDcf.hero.evSub')"
        :tone="result.valuation.enterpriseValue < 0 ? 'crit' : 'default'"
      )
      hero-figure(
        :label="$t('report.ebitdaDcf.hero.ebitda', { year: latestYear })"
        :value="money(latestEbitda)"
        :sub="$t('report.ebitdaDcf.hero.ebitdaSub')"
        :tone="latestEbitda < 0 ? 'crit' : 'default'"
      )
      hero-figure(
        :label="$t('report.ebitdaDcf.hero.npv')"
        :value="money(result.valuation.sumDiscounted)"
        :sub="$t('report.ebitdaDcf.hero.npvSub', { from: futureYears[0], to: futureYears[futureYears.length - 1] })"
      )
      hero-figure(
        :label="$t('report.ebitdaDcf.hero.terminal')"
        :value="money(result.valuation.terminalValue)"
      )
        template(#sub)
          | {{ $t('report.ebitdaDcf.hero.terminalSub') }}
          input.mult(type="number" step="0.1" min="0" v-model.number="dcf.exitMultiple" @input="dialsTouched = true")

    .card
      h2 {{ $t('report.ebitdaDcf.bars.title') }}
      .bars
        .b(v-for="(bar, i) in bars" :key="i")
          .vl {{ kShort(bar.value) }}
          .col(:class="{ proj: bar.proj, neg: bar.value < 0 }" :style="{ height: bar.h + 'px' }")
          .yl {{ bar.year }}

    .card
      h2
        | {{ $t('report.ebitdaDcf.pnl.title') }}
        a.expand(href="#" @click.prevent="expanded = !expanded")
          | {{ expanded ? $t('report.ebitdaDcf.pnl.collapse') : $t('report.ebitdaDcf.pnl.expand') }}
      .tscroll
        table.mini
          thead
            tr
              th {{ $t('report.ebitdaDcf.confirm.line') }}
              th(v-for="(y, c) in displayYears" :key="'py' + y") {{ y }}
          tbody
            tr
              td
                | {{ $t('report.ebitdaDcf.confirm.row.sales') }}
                provenance-badge(
                  size="sm"
                  spaced
                  :source="rowSrc('sales')"
                  :file-label="$t('report.ebitdaDcf.confirm.fromFile')"
                  :entered-label="$t('report.ebitdaDcf.confirm.entered')"
                )
              td(v-for="(y, c) in displayYears" :key="'s' + y") {{ money(seedValue('sales', c)) }}
            tr.calc
              td {{ $t('report.ebitdaDcf.pnl.grossProfit') }}
              td(v-for="(y, c) in displayYears" :key="'g' + y")
                | {{ money(result.pnl.grossProfit[di(c)]) }}
                span.pctnote  {{ pct(result.pnl.grossProfitPct[di(c)]) }}
            template(v-if="expanded")
              tr
                td
                  | {{ $t('report.ebitdaDcf.confirm.row.costOfSales') }}
                  provenance-badge(
                    size="sm"
                    spaced
                    :source="rowSrc('costOfSales')"
                    :file-label="$t('report.ebitdaDcf.confirm.fromFile')"
                    :entered-label="$t('report.ebitdaDcf.confirm.entered')"
                  )
                td(v-for="(y, c) in displayYears" :key="'c' + y") {{ money(seedValue('costOfSales', c)) }}
              tr
                td
                  | {{ $t('report.ebitdaDcf.confirm.row.operatingExpenses') }}
                  provenance-badge(
                    size="sm"
                    spaced
                    :source="rowSrc('operatingExpenses')"
                    :file-label="$t('report.ebitdaDcf.confirm.fromFile')"
                    :entered-label="$t('report.ebitdaDcf.confirm.entered')"
                  )
                td(v-for="(y, c) in displayYears" :key="'o' + y") {{ money(seedValue('operatingExpenses', c)) }}
              tr.calc
                td {{ $t('report.ebitdaDcf.pnl.netOperatingProfit') }}
                td(v-for="(y, c) in displayYears" :key="'n' + y") {{ money(result.pnl.netOperatingProfit[di(c)]) }}
              tr.calc
                td {{ $t('report.ebitdaDcf.pnl.sundrySubtotal') }}
                td(v-for="(y, c) in displayYears" :key="'su' + y") {{ money(result.pnl.sundrySubtotal[di(c)]) }}
            tr.calc
              td {{ $t('report.ebitdaDcf.pnl.netProfitBeforeTax') }}
              td(v-for="(y, c) in displayYears" :key="'np' + y") {{ money(result.pnl.netProfitBeforeTax[di(c)]) }}
            tr
              td {{ $t('report.ebitdaDcf.pnl.addBackSubtotal') }}
              td(v-for="(y, c) in displayYears" :key="'ab' + y") {{ money(result.pnl.addBackSubtotal[di(c)]) }}
            tr.calc
              td {{ $t('report.ebitdaDcf.pnl.ebpitda') }}
              td(v-for="(y, c) in displayYears" :key="'eb' + y") {{ money(result.pnl.ebpitda[di(c)]) }}
            tr
              td {{ $t('report.ebitdaDcf.pnl.ownerBenefitsSubtotal') }}
              td(v-for="(y, c) in displayYears" :key="'ob' + y") {{ money(result.pnl.ownerBenefitsSubtotal[di(c)]) }}
            tr.total
              td {{ $t('report.ebitdaDcf.pnl.ebitda') }}
              td(v-for="(y, c) in displayYears" :key="'e' + y" :class="{ crit: result.pnl.ebitda[di(c)] < 0 }") {{ money(result.pnl.ebitda[di(c)]) }}

    .card
      h2
        | {{ $t('report.ebitdaDcf.workings.title') }}
        span.note  {{ $t('report.ebitdaDcf.workings.note') }}
      //- The growth/discount dials start on the sample's settings even when the P&L
      //- above came from the client's own files — so they need saying, until touched.
      sample-notice(v-if="!dialsTouched" :text="$t('report.sampleFigures')")
      .tscroll
        table.mini
          thead
            tr
              th {{ $t('report.ebitdaDcf.workings.projection') }}
              th(v-for="y in futureYears" :key="'fy' + y") {{ y }}
          tbody
            tr
              td
                | {{ $t('report.ebitdaDcf.workings.growth') }}
                span.pctnote  {{ $t('report.ebitdaDcf.workings.actualAvg', { avg: avgGrowthText }) }}
              td(v-for="(y, i) in futureYears" :key="'gr' + y")
                input.cell(type="number" step="0.5" v-model.number="dcf.growthPct[i]" @input="dialsTouched = true")
            tr.calc
              td {{ $t('report.ebitdaDcf.workings.projected') }}
              td(v-for="(y, i) in futureYears" :key="'pj' + y") {{ money(result.valuation.projectedEbitda[i]) }}
            tr
              td {{ $t('report.ebitdaDcf.workings.discount') }}
              td(v-for="(y, i) in futureYears" :key="'dr' + y")
                input.cell(type="number" step="0.5" v-model.number="dcf.discountPct[i]" @input="dialsTouched = true")
            tr.total
              td {{ $t('report.ebitdaDcf.workings.discounted') }}
              td(v-for="(y, i) in futureYears" :key="'dc' + y") {{ money(result.valuation.discountedCashFlow[i]) }}

    .card
      h2
        | {{ $t('report.ebitdaDcf.listed.title') }}
        a.expand(href="#" @click.prevent="listedOpen = !listedOpen")
          | {{ listedOpen ? $t('report.ebitdaDcf.pnl.collapse') : $t('report.ebitdaDcf.listed.open') }}
      template(v-if="listedOpen")
        .listed-inputs
          .li-field
            label {{ $t('report.ebitdaDcf.listed.shares') }}
            b-input(v-model.number="listed.sharesIssued" type="number" step="any" size="is-small")
          .li-field
            label {{ $t('report.ebitdaDcf.listed.price') }}
            b-input(v-model.number="listed.sharePrice" type="number" step="0.01" size="is-small")
          .li-field
            label {{ $t('report.ebitdaDcf.listed.multiple') }}
            b-input(v-model.number="listed.exitMultiple" type="number" step="0.05" size="is-small")
        .tscroll
          table.mini
            thead
              tr
                th {{ $t('report.ebitdaDcf.listed.history') }}
                th(v-for="(y, i) in years" :key="'ly' + y") {{ y }}
            tbody
              tr
                td {{ $t('report.ebitdaDcf.listed.ebitdaM') }}
                td(v-for="(y, i) in years" :key="'lh' + y")
                  input.cell(type="number" step="any" v-model.number="listed.ebitdaHistory[i]")
        .cmp
          .t
            .k {{ $t('report.ebitdaDcf.listed.marketCap') }}
            .v {{ money(result.listed.marketCap) }}
          .t
            .k {{ $t('report.ebitdaDcf.listed.current') }}
            .v {{ price(result.listed.currentSharePrice) }}
          .t
            .k {{ $t('report.ebitdaDcf.listed.assessed') }}
            .v(:class="verdict.cls") {{ result.listed.assessedSharePrice === null ? '—' : price(result.listed.assessedSharePrice) }}
          .t
            .k {{ $t('report.ebitdaDcf.listed.reading') }}
            .v(:class="verdict.cls") {{ verdict.text }}
      p.note(v-else) {{ $t('report.ebitdaDcf.listed.closed') }}

    .edu
      .edu-head
        span.lead {{ $t('report.ebitdaDcf.coach.lead') }}
        | {{ $t('report.ebitdaDcf.coach.heading') }}
      p {{ coachText }}

    .privacy 🔒 {{ $t('report.ebitdaDcf.privacy') }}

    .actions
      b-button(type="is-primary" @click="printReport") {{ $t('report.ebitdaDcf.actions.pdf') }}
      b-button(@click="resetAll") ↺ {{ $t('report.ebitdaDcf.actions.reset') }}
      span.note {{ $t('report.ebitdaDcf.actions.provenance') }}

  template(v-else-if="error")
    .card
      h2 {{ $t('report.calcFailedTitle') }}
      p.note {{ $t('report.calcUnreachable') }}
      b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
  template(v-else)
    .card
      p.note {{ $t('report.loading') }}
</template>

<script>
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import SampleNotice from '~/components/base/SampleNotice.vue'
import ProvenanceBadge from '~/components/base/ProvenanceBadge'
import StaleBanner from '~/components/base/StaleBanner'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * EbitdaDcfReport — step 3 of the EBITDA & DCF valuation (owner-approved mockup,
 * 2026-07-17): hero band with the editable exit multiple, actual-vs-projected
 * earnings bars, the expandable P&L review, live valuation workings, and the
 * listed-company lens behind its own toggle.
 *
 * All calculation is backend-only (POST /api/report/ebitda-dcf —
 * server/report/ebitdaDcfModel.js, 96 golden cells); this screen edits inputs and
 * renders the returned figures. Every edit recomputes via a debounced backend call.
 */

// The intake rows that build each engine group (oldest-first arrays throughout)
const SUNDRY_ROWS = { otherIncome: 'otherIncome', interestReceived: 'interestReceived', dividendsReceived: 'dividendsReceived', badDebtsRecovered: 'badDebtsRecovered' }
const ADDBACK_ROWS = { managementFees: 'managementFees', loanInterestPaid: 'loanInterestPaid', consentCosts: 'consentCosts', extraordinaryItems: 'extraordinaryItems', establishmentCosts: 'establishmentCosts', shareholderSalaries: 'shareholderSalaries', insuranceRetirement: 'insuranceRetirement', ownersVehicles: 'ownersVehicles', leaseholdImprovements: 'leaseholdImprovements', assetUpgrades: 'assetUpgrades', other3: 'other3', other4: 'other4', other5: 'other5' }
const FAIRMARKET_ROWS = { fmSalaries: 'salaries', fmInsuranceRetirement: 'insuranceRetirement', fmVehicles: 'vehicles', fmFringeBenefits: 'fringeBenefits' }

export default {
  name: 'EbitdaDcfReport',

  components: { HeroStrip, HeroFigure, ProvenanceBadge, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  props: {
    /**
     * The confirmed intake payload from EbitdaDcfIntake:
     * { years: number[], figures: {row: [{value, source}] oldest-first}, companyName }.
     * Null = straight to the report on the model defaults, everything tagged *entered*.
     */
    seed: { type: Object, default: null }
  },

  data () {
    // R23 residual: the listed history table renders one cell per year — the array must
    // be exactly that long, or invisible sample slots reach the calc as if typed.
    const yearCount = (this.seed && this.seed.years && this.seed.years.length) || 5
    return {
      // Cleared the moment the advisor touches a projection dial — the notice is about
      // the DEFAULTS being the sample's, not about the dials being editable.
      dialsTouched: false,
      dcf: {
        growthPct: [4, 6, 5, 3, 4],
        discountPct: [6, 7, 5, 5, 6],
        exitMultiple: 2
      },
      listed: {
        sharesIssued: 3234978616,
        sharePrice: 0.59,
        ebitdaHistory: [-37.3, -307.6, 861.7, 548.9, 0].slice(0, yearCount),
        exitMultiple: 0.25
      },
      listedOpen: false,
      expanded: false,
      result: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  computed: {
    /**
     * Whether the valuation is still running on the source model's sample company.
     *
     * True when NO input row came from a file — the demo and manual paths, where every
     * P&L figure is the sample company's. False as soon as the advisor's own exports
     * seed it.
     *
     * NB an earlier version keyed this off `!seed`, a state the page cannot produce:
     * the report is only reachable by confirming figures, which always sets a seed. It
     * therefore never showed.
     * @returns {boolean}
     */
    onSampleFigures () {
      const fig = (this.seed && this.seed.figures) || null
      if (!fig) { return true }
      return !Object.keys(fig).some(row =>
        Array.isArray(fig[row]) && fig[row].some(cell => cell && cell.source === 'file'))
    },

    /** Oldest-first, from the confirmed intake (or the model's five sample years). */
    years () {
      return (this.seed && this.seed.years) || [2021, 2022, 2023, 2024, 2025]
    },
    latestYear () {
      return this.years[this.years.length - 1]
    },
    /** Table columns, latest year first (the approved mockup's orientation). */
    displayYears () {
      return this.years.slice().reverse()
    },
    futureYears () {
      return (this.result && this.result.valuation.futureYears) || []
    },
    latestEbitda () {
      return this.result ? this.result.pnl.ebitda[this.result.pnl.ebitda.length - 1] : 0
    },
    avgGrowthText () {
      const avg = this.result && this.result.valuation.averageActualGrowth
      return avg === null || avg === undefined ? '—' : this.pct(avg)
    },
    /** Actual + projected bars, scaled to the largest absolute value. */
    bars () {
      if (!this.result) { return [] }
      const actual = this.result.pnl.ebitda.map((v, i) => ({ year: this.years[i], value: v, proj: false }))
      const proj = this.result.valuation.projectedEbitda.map((v, i) => ({ year: this.futureYears[i], value: v, proj: true }))
      const all = actual.concat(proj)
      const max = Math.max.apply(null, all.map(b => Math.abs(b.value)).concat([1]))
      return all.map(b => ({ ...b, h: Math.max(4, Math.round(Math.abs(b.value) / max * 90)) }))
    },
    /** Assessed vs market price — wording accepted with the mockup. */
    verdict () {
      const l = this.result && this.result.listed
      if (!l || l.assessedSharePrice === null) { return { cls: '', text: '—' } }
      if (l.assessedSharePrice > l.currentSharePrice) { return { cls: 'good', text: this.$t('report.ebitdaDcf.listed.undervalued') } }
      if (l.assessedSharePrice < l.currentSharePrice) { return { cls: 'crit', text: this.$t('report.ebitdaDcf.listed.overvalued') } }
      return { cls: '', text: this.$t('report.ebitdaDcf.listed.fair') }
    },
    /** Templated coach narrative (no AI in v1 — the WCC/QP precedent). */
    coachText () {
      const r = this.result
      if (!r) { return '' }
      if (r.valuation.enterpriseValue <= 0) { return this.$t('report.ebitdaDcf.coach.negative') }
      const first = r.pnl.ebitda[0]
      const last = r.pnl.ebitda[r.pnl.ebitda.length - 1]
      let text = this.$t('report.ebitdaDcf.coach.body', {
        n: this.years.length,
        from: this.money(first),
        to: this.money(last),
        avg: this.avgGrowthText,
        ev: this.money(r.valuation.enterpriseValue)
      })
      // 🔴 The dip year and the terminal share are read from the model, not derived here
      // (moved 2026-08-22, to-do item 4.34). The Model Guide quotes this same reading, and
      // the year-on-year growth rates carry an off-by-one — rate[i] is the step INTO
      // years[i + 1] — that must not be spelled out in two places.
      if (r.valuation.dipYear !== null && r.valuation.dipYear !== undefined) {
        text += ' ' + this.$t('report.ebitdaDcf.coach.dip', {
          year: r.valuation.dipYear,
          g: this.pct(r.valuation.dipGrowth)
        })
      }
      text += ' ' + this.$t('report.ebitdaDcf.coach.terminalNote', {
        mult: this.dcf.exitMultiple,
        share: this.pct(r.valuation.terminalShare || 0)
      })
      return text
    }
  },

  watch: {
    dcf: { deep: true, handler () { this.queueRecompute() } },
    listed: { deep: true, handler () { this.queueRecompute() } }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /** Display column c → oldest-first index. @param {number} c */
    di (c) {
      return this.years.length - 1 - c
    },
    /**
     * Row-level provenance for a seeded input row — 'file' while ANY year in the row
     * still carries a file figure (the intake table's rule, R11); 'entered' otherwise,
     * including demo mode (no seed = the advisor owns every figure).
     * @param {string} row @returns {'file'|'entered'}
     */
    rowSrc (row) {
      const fig = this.seed && this.seed.figures && this.seed.figures[row]
      return fig && fig.some(cell => cell.source === 'file') ? 'file' : 'entered'
    },
    /** A confirmed input figure for a display column. @param {string} row @param {number} c */
    seedValue (row, c) {
      const fig = this.seed && this.seed.figures && this.seed.figures[row]
      const idx = this.di(c)
      if (fig && fig[idx] && typeof fig[idx].value === 'number') { return fig[idx].value }
      return this.result ? null : 0
    },
    // money() comes from currencyMixin (firm currency + locale).
    /** @param {number} n - e.g. 0.9258 @returns {string} share price, e.g. "$0.93" */
    price (n) { return this.money2(n) },
    /** @param {number} f - fraction @returns {string} e.g. "53.7%" */
    pct (f) {
      return (Math.round(f * 1000) / 10).toFixed(1) + '%'
    },
    /** @param {number} n @returns {string} e.g. "572k" */
    kShort (n) {
      return Math.round(n / 1000) + 'k'
    },
    /** One engine group from the confirmed rows. @param {object} rowMap */
    groupBody (rowMap) {
      const out = {}
      Object.keys(rowMap).forEach((row) => {
        const fig = this.seed && this.seed.figures && this.seed.figures[row]
        if (fig) { out[rowMap[row]] = fig.map(cell => cell.value) }
      })
      return out
    },
    /**
     * The backend request for this report — consumed by the reportRecompute mixin
     * (debounce, race guard, stale flag). Calc is backend-only.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      const body = {
        latestYear: this.latestYear,
        dcf: {
          projectedGrowth: this.dcf.growthPct.map(g => (g || 0) / 100),
          discountRates: this.dcf.discountPct.map(d => (d || 0) / 100),
          exitMultiple: this.dcf.exitMultiple
        },
        listed: {
          sharesIssued: this.listed.sharesIssued,
          sharePrice: this.listed.sharePrice,
          ebitdaHistory: this.listed.ebitdaHistory,
          exitMultiple: this.listed.exitMultiple
        }
      }
      const fig = this.seed && this.seed.figures
      if (fig) {
        body.sales = fig.sales.map(c => c.value)
        body.costOfSales = fig.costOfSales.map(c => c.value)
        body.operatingExpenses = fig.operatingExpenses.map(c => c.value)
        body.sundry = this.groupBody(SUNDRY_ROWS)
        body.addBacks = this.groupBody(ADDBACK_ROWS)
        body.fairMarket = this.groupBody(FAIRMARKET_ROWS)
      }
      return { url: '/api/report/ebitda-dcf', body }
    },
    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.result = data
    },
    resetAll () {
      const fresh = this.$options.data.call(this)
      this.dcf = fresh.dcf
      this.listed = fresh.listed
      this.$buefy.toast.open({ message: this.$t('report.ebitdaDcf.actions.resetDone'), type: 'is-info' })
    },
    printReport () {
      window.print()
    }
  }
}
</script>

<style scoped>
.ed-report { display: flex; flex-direction: column; gap: 16px; }
/* Stale-figures banner (R9): a failed recompute must be visibly untrustworthy —
   stale figures presented as live are worse than no figures at all. */
/* The stale banner is components/base/StaleBanner.vue (Phase 3). */
/* Provenance badges on the printable P&L rows (R11) — same tokens as the intake table */
/* Badge styling lives in components/base/ProvenanceBadge.vue (Phase 3). */
/* The headline banner now lives in components/base/HeroStrip + HeroFigure (which
   also owns the greyed-out stale state). The editable exit multiple is passed in
   through HeroFigure's `sub` slot, so it is still styled here — `.herostrip` is
   HeroStrip's root, which the slot renders inside. */
/* Palette, cards and table dividers read the shared visual-standard tokens (ReportShell):
   every swapped value equals the token it points at — a no-change consolidation, not a
   restyle. Left literal on purpose: the card's 16px padding (standard is 16px 18px, not
   one of the ruled five), the inline `font:` shorthands on the editable inputs, and the model-specific
   accents with bespoke tints/no token — the earnings bar chart, the accent-tinted P&L
   total row (#0070c012), the input focus ring (#7fd3f1) and the blue coach panel. */
.herostrip .mult { width: 52px; margin-left: 6px; border: 0; border-radius: 5px; padding: 2px 6px; font: 600 12px "Open Sans", sans-serif; color: var(--rs-ink); }
.card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-top: 3px solid var(--rs-card-top); border-radius: var(--rs-card-radius); padding: var(--rs-card-pad); }
.card h2 { font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-card-title-color); font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.card h2 .note, .card .note { font-weight: 300; text-transform: none; letter-spacing: 0; color: var(--rs-muted); font-size: 12px; }
.expand { font-size: 11px; font-weight: 600; color: var(--rs-accent); text-decoration: none; text-transform: none; letter-spacing: 0; }
.bars { display: flex; align-items: flex-end; gap: 8px; height: 128px; padding-top: 4px; }
.bars .b { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; min-width: 0; }
.bars .col { width: 100%; max-width: 52px; background: linear-gradient(180deg, #00b1e0, #0070c0); border-radius: 5px 5px 0 0; }
.bars .col.proj { opacity: .5; border: 1px dashed #0070c0; background: #0070c018; }
.bars .col.neg { background: #ff00004d; border: 1px dashed #ff0000; }
.bars .yl, .bars .vl { font-size: 10.5px; color: var(--rs-muted); }
.bars .vl { font-weight: 600; }
.tscroll { overflow-x: auto; }
table.mini { width: 100%; border-collapse: collapse; font-size: 13px; }
table.mini th { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--rs-muted); text-align: right; padding: 6px 10px; border-bottom: 1px solid var(--rs-line); }
table.mini th:first-child { text-align: left; }
table.mini td { padding: 6px 10px; border-bottom: 1px solid var(--rs-bg); text-align: right; white-space: nowrap; }
table.mini td:first-child { text-align: left; white-space: normal; min-width: 200px; }
table.mini tr.calc td { background: var(--rs-panel-2); font-weight: 600; }
table.mini tr.total td { border-top: 2px solid #0070c0; border-bottom: 0; font-weight: 700; background: #0070c012; }
table.mini .crit { color: var(--rs-crit); }
.pctnote { font-size: 11px; color: var(--rs-muted); font-weight: 300; }
input.cell { width: 62px; text-align: right; font: 300 13px "Open Sans", sans-serif; color: var(--rs-ink); background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 6px; padding: 3px 6px; }
input.cell:focus { outline: 2px solid #7fd3f1; border-color: transparent; }
.listed-inputs { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.li-field { min-width: 150px; }
.li-field label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; display: block; margin-bottom: 4px; }
.cmp { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.cmp .t { flex: 1; min-width: 140px; background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 9px; padding: 11px 14px; }
.cmp .k { font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.cmp .v { font-size: 19px; font-weight: 700; color: var(--rs-ink); margin-top: 3px; }
.cmp .v.good { color: var(--rs-good); }
.cmp .v.crit { color: var(--rs-crit); }
.edu { border-left: 3px solid #00b1e0; background: #0070c012; border-radius: 0 9px 9px 0; padding: 14px 16px; }
.edu-head { display: flex; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: #0070c0; margin-bottom: 8px; }
.edu .lead { background: #0070c0; color: #fff; font-size: 10px; font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 5px; }
.edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.privacy { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--rs-muted); background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 9px; padding: 10px 14px; }
.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.actions .note { font-size: 12px; color: var(--rs-muted); }
@media print {
  .actions, .privacy { display: none !important; }
  .card, .edu, .herostrip { break-inside: avoid; box-shadow: none; }
}
</style>

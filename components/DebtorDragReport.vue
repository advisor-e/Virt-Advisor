<template lang="pug">
.ddg-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.debtorDrag.title')"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient"
  )

  //- Full-width headline band (owner ruling 2026-07-27): the HeroStrip spans the page
  //- above the two-column layout on every model, never tucked inside the results column.
  //- A failure AFTER the first load must never sit silently behind stale figures (R9).
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute"
  )
  hero-strip(:columns="3" :stale="!!error")
    hero-figure(
      :label="$t('report.debtorDrag.hero.planLow')"
      :value="plan ? money(plan.deepestLow.value) : '—'"
      :sub="planLowSub"
      :tone="plan && plan.deepestLow.value < 0 ? 'crit' : 'good'"
    )
    hero-figure(
      :label="$t('report.debtorDrag.hero.beforeLow')"
      :value="before ? money(before.deepestLow.value) : '—'"
      :sub="beforeLowSub"
    )
    hero-figure(
      :label="$t('report.debtorDrag.hero.effect')"
      :value="deltaText"
      :sub="deltaSub"
      :tone="deltaClass"
    )

  .ddg-layout
    aside.ddg-card
      .ddg-instruct
        | {{ $t('report.debtorDrag.instruct') }} #[b {{ $t('report.debtorDrag.instructBtn') }}]{{ $t('report.debtorDrag.instructAfter') }} #[b.ddg-blue {{ $t('report.debtorDrag.blueLine') }}] {{ $t('report.debtorDrag.instructEnd') }} #[b {{ $t('report.debtorDrag.before') }}].
      .ddg-group(v-for="g in groups" :key="g.title")
        .ddg-glabel
          span.ddg-lft
            span.ddg-dot
            h2.ddg-h2 {{ $t('report.debtorDrag.group.' + g.k) }}
          span.ddg-total(v-if="g.total" :class="totalOk(g.total) ? 'ok' : 'bad'") {{ totalOf(g.total) }}%
        slider-field(
          v-for="fld in g.fields"
          :key="fld.k"
          :label="$t('report.debtorDrag.field.' + fld.k)"
          :display="fmtField(fld)"
          :value="f[fld.k]"
          :min="fld.min"
          :max="fld.max"
          :step="fld.step"
          @input="v => setField(fld.k, v)"
        )
          //- A figure the client changed since the advisor's saved version (D4).
          template(v-slot:badge)
            provenance-badge(
              v-if="isClientChanged(fld.k)"
              source="client"
              size="sm"
              spaced
              file-label=""
              entered-label=""
              :client-label="$t('clientReports.saved.badge')"
            )
      .ddg-group
        button.ddg-setbtn(@click="freeze") {{ $t('report.debtorDrag.freezeBtn') }}

    section.ddg-results
      .ddg-card.ddg-chartcard
        .ddg-chead
          h2.ddg-h2 {{ $t('report.debtorDrag.chart.title') }}
          .ddg-csub {{ $t('report.debtorDrag.chart.sub') }}
        svg.ddg-chart(v-if="chart" viewBox="0 0 780 320" role="img" :aria-label="$t('report.debtorDrag.chart.aria')")
          rect(:x="chart.pl" :y="chart.z" :width="chart.pw" :height="chart.odH" fill="#ff000010")
          template(v-for="(gl, gi) in chart.grid")
            line(:key="'gl'+gi" :x1="chart.pl" :y1="gl.y" :x2="chart.xEnd" :y2="gl.y" stroke="var(--ddg-line)" stroke-width="1")
            text(:key="'gt'+gi" :x="chart.pl - 8" :y="gl.y + 3" text-anchor="end" fill="var(--ddg-muted)" font-size="10") {{ gl.label }}
          line(:x1="chart.pl" :y1="chart.z" :x2="chart.xEnd" :y2="chart.z" stroke="var(--ddg-muted)" stroke-width="1.5" stroke-dasharray="2 3")
          text(v-for="(mo, mi) in chart.months" :key="'mo'+mi" :x="mo.x" y="307" text-anchor="middle" fill="var(--ddg-muted)" font-size="10") {{ mo.label }}
          path(v-if="chart.beforePath" :d="chart.beforePath" fill="none" stroke="#8a97a8" stroke-width="2" stroke-dasharray="5 4")
          path(:d="chart.planPath" fill="none" stroke="#0070c0" stroke-width="2.6")
          circle(:cx="chart.lowX" :cy="chart.lowY" r="4.5" fill="#0070c0")
        .ddg-legend
          span
            i(style="border-color:#8a97a8;border-top-style:dashed")
            | {{ $t('report.debtorDrag.chart.legendBefore') }}
          span
            i(style="border-color:#0070c0")
            | {{ $t('report.debtorDrag.chart.legendPlan') }}
          span
            i(style="border-top:none;height:10px;width:10px;border-radius:2px;background:#ff000022")
            | {{ $t('report.debtorDrag.chart.legendOverdraft') }}

      .ddg-edu
        .ddg-edu-h
          span.ddg-lead {{ $t('report.debtorDrag.coach.lead') }}
          | {{ $t('report.debtorDrag.coach.title') }}
        p.ddg-edu-p(v-if="plan")
          | {{ $t('report.debtorDrag.coach.body1') }} #[strong {{ money(plan.deepestLow.value) }}] {{ $t('report.debtorDrag.coach.body2') }} #[strong {{ monthName(plan.deepestLow.month) }}]{{ plan.deepestLow.value < 0 ? $t('report.debtorDrag.coach.overdraft') : '' }} {{ $t('report.debtorDrag.coach.body3') }} #[strong {{ plan.monthsInOverdraft }} {{ $t('report.debtorDrag.coach.months') }}]. {{ $t('report.debtorDrag.coach.body4') }}

      .ddg-actions
        button.ddg-cta(@click="downloadPdf") {{ $t('report.debtorDrag.actions.pdf') }}
        button.ddg-cta.ddg-ghost(@click="reset") {{ $t('report.debtorDrag.actions.reset') }}
        button.ddg-cta.ddg-ghost(@click="askCoach") {{ $t('report.debtorDrag.actions.coach') }}
        span.ddg-foot {{ $t('report.debtorDrag.actions.foot') }}
</template>

<script>
/**
 * DebtorDragReport — Debtor Business Drag (second model).
 *
 * Interactive, educational screen. Full 5-stage debtor collection + 5-stage supplier payment
 * profiles, markup, net profit and (editable) GST — reproduces the source model's monthly
 * closing bank balance. Calc runs backend-only (POST /api/report/debtor-drag); see
 * server/report/debtorDragModel.js + its golden test.
 *
 * "Freeze as Before" snapshots the current curve as a grey baseline so the advisor can show
 * the before/after effect of a decision. Coach text is templated (not AI) for this build.
 * i18n: English placeholders for this first build; move to a report.* namespace later.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import SliderField from '~/components/base/SliderField'
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'
import savedReport from '~/mixins/savedReport'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SHAPE = [100000, 137850, 207563, 215000, 232000, 347000, 356000, 432000, 318000, 323000, 365000, 324000]
const BASE = SHAPE.reduce(function (a, b) { return a + b }, 0)

export default {
  name: 'DebtorDragReport',

  components: { ReportHeader, StaleBanner, HeroStrip, HeroFigure, SliderField, ProvenanceBadge },

  mixins: [currencyMixin, reportRecompute, savedReport],

  data () {
    return {
      f: { sales: 3357413, d0: 85, d1: 7, d2: 5, d3: 0, d4: 0, dwo: 3, c0: 90, c1: 10, c2: 0, c3: 0, c4: 0, markup: 47, np: 13, gst: 15 },
      plan: null, // { monthlyClosing, deepestLow, monthsInOverdraft, ... }
      before: null, // frozen snapshot of plan
      groups: [
        {
 k: 'sales',
total: null,
fields: [
          { k: 'sales', min: 500000, max: 6000000, step: 50000, fmt: 'money' }
        ]
},
        {
 k: 'debtors',
total: 'd',
fields: [
          { k: 'd0', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd1', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd2', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd3', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd4', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'dwo', min: 0, max: 100, step: 1, fmt: 'pct' }
        ]
},
        {
 k: 'suppliers',
total: 'c',
fields: [
          { k: 'c0', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c1', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c2', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c3', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c4', min: 0, max: 100, step: 1, fmt: 'pct' }
        ]
},
        {
 k: 'business',
total: null,
fields: [
          { k: 'markup', min: 10, max: 150, step: 1, fmt: 'pct' },
          { k: 'np', min: 0, max: 40, step: 1, fmt: 'pct' },
          { k: 'gst', min: 0, max: 30, step: 0.5, fmt: 'pct' }
        ]
}
      ]
    }
  },

  computed: {
    /** Sub-line under the plan's deepest low: which month, and whether it goes overdrawn. */
    planLowSub () {
      if (!this.plan) { return '' }
      return this.monthName(this.plan.deepestLow.month) + (this.plan.deepestLow.value < 0 ? ' ' + this.$t('report.debtorDrag.hero.overdraft') : '')
    },
    /** Same for the frozen "Before" baseline, or the prompt to freeze one. */
    beforeLowSub () {
      if (!this.before) { return this.$t('report.debtorDrag.hero.freezeBefore') }
      return this.monthName(this.before.deepestLow.month) + (this.before.deepestLow.value < 0 ? ' ' + this.$t('report.debtorDrag.hero.overdraft') : '')
    },
    deltaClass () {
      if (!this.before || !this.plan) { return 'muted' }
      return (this.plan.deepestLow.value - this.before.deepestLow.value) >= 0 ? 'good' : 'crit'
    },
    deltaText () {
      if (!this.before || !this.plan) { return '$0' }
      const d = this.plan.deepestLow.value - this.before.deepestLow.value
      return this.signedMoney(d)
    },
    deltaSub () {
      if (!this.before || !this.plan) { return this.$t('report.debtorDrag.hero.freezeThenDecide') }
      return (this.plan.deepestLow.value - this.before.deepestLow.value) >= 0 ? this.$t('report.debtorDrag.hero.better') : this.$t('report.debtorDrag.hero.worse')
    },
    chart () {
      if (!this.plan) { return null }
      const W = 780; const pl = 60; const pr = 18; const pt = 16; const pb = 34
      const pw = W - pl - pr; const ph = 320 - pt - pb
      const plan = this.plan.monthlyClosing
      const before = this.before ? this.before.monthlyClosing : null
      const all = before ? plan.concat(before) : plan.slice()
      let lo = Math.min(0, Math.min.apply(null, all))
      let hi = Math.max(0, Math.max.apply(null, all))
      const pad = (hi - lo) * 0.08 || 1000
      hi += pad; lo -= pad
      const x = function (m) { return pl + pw * (m / 11) }
      const y = function (v) { return pt + ph * (1 - (v - lo) / (hi - lo)) }
      const linePath = function (a) {
        let d = 'M' + x(0) + ' ' + y(a[0])
        for (let m = 1; m < 12; m++) { d += ' L' + x(m) + ' ' + y(a[m]) }
        return d
      }
      const grid = []
      for (let g = 0; g <= 4; g++) { grid.push({ y: pt + ph * g / 4, label: this.kf(hi - (hi - lo) * g / 4) }) }
      const months = []
      for (let m = 0; m < 12; m++) { months.push({ x: x(m) }) }
      months.forEach(function (mo, idx) { mo.label = MON[idx] })
      const lowIdx = plan.indexOf(Math.min.apply(null, plan))
      const z = y(0)
      return {
        pl,
pw,
xEnd: W - pr,
z,
odH: (pt + ph) - z,
        grid,
months,
        planPath: linePath(plan),
        beforePath: before ? linePath(before) : null,
        lowX: x(lowIdx),
lowY: y(plan[lowIdx])
      }
    }
  },

  mounted () {
    // Seed the "Before" baseline from the first successful recompute (see applyResult).
    this._seedBefore = true
    this.recompute()
  },

  methods: {
    // money() comes from currencyMixin (firm currency + locale).
    kf (n) { return this.kMoney(n) },
    monthName (m) { return MON[m] || '' },
    fmtField (fld) {
      const v = this.f[fld.k]
      if (fld.fmt === 'money') { return this.money(v) }
      return v + '%'
    },
    /**
     * A slider moved: store the new value and queue a recompute. SliderField reports
     * its value as an event, so the write and the recompute happen in one place.
     * @param {string} key - the field key in `f` @param {number} v
     */
    setField (key, v) {
      this.f[key] = v
      this.queueRecompute()
    },
    totalOf (which) {
      if (which === 'd') { return this.f.d0 + this.f.d1 + this.f.d2 + this.f.d3 + this.f.d4 + this.f.dwo }
      return this.f.c0 + this.f.c1 + this.f.c2 + this.f.c3 + this.f.c4
    },
    totalOk (which) { return this.totalOf(which) === 100 },
    payload () {
      const scale = this.f.sales / BASE
      const sales = SHAPE.map(function (v) { return v * scale })
      return {
        monthlySales: sales,
        debtor: [this.f.d0, this.f.d1, this.f.d2, this.f.d3, this.f.d4].map(function (p) { return p / 100 }),
        creditor: [this.f.c0, this.f.c1, this.f.c2, this.f.c3, this.f.c4].map(function (p) { return p / 100 }),
        markup: this.f.markup / 100,
        netProfitPct: this.f.np / 100,
        gstRate: this.f.gst / 100
      }
    },
    /**
     * The figures saved per client — consumed by the savedReport mixin. The sliders
     * are the whole of this screen's inputs, so `f` is the saved shape.
     * @returns {object}
     */
    reportInputs () {
      return Object.assign({}, this.f)
    },
    /**
     * Load a saved set back — consumed by the savedReport mixin. Only the keys this
     * screen knows, and only numbers: a saved row is never trusted for its shape.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      const next = Object.assign({}, this.f)
      Object.keys(next).forEach((k) => {
        if (inputs && typeof inputs[k] === 'number' && Number.isFinite(inputs[k])) { next[k] = inputs[k] }
      })
      this.f = next
      this.recompute()
    },
    /** Backend request — consumed by the reportRecompute mixin (debounce + race guard). */
    recomputeRequest () {
      return { url: '/api/report/debtor-drag', body: this.payload() }
    },
    /**
     * Apply a successful recompute — consumed by the reportRecompute mixin. On the
     * first load (`_seedBefore`), also seed the "Before" baseline from the result.
     */
    applyResult (data) {
      this.plan = data
      if (this._seedBefore && !this.before) { this.before = data }
      this._seedBefore = false
    },
    reset () {
      this.f = { sales: 3357413, d0: 85, d1: 7, d2: 5, d3: 0, d4: 0, dwo: 3, c0: 90, c1: 10, c2: 0, c3: 0, c4: 0, markup: 47, np: 13, gst: 15 }
      this.recompute()
      this.$buefy.toast.open({ message: this.$t('report.debtorDrag.toast.reset'), type: 'is-info' })
    },
    freeze () {
      if (this.plan) {
        this.before = this.plan
        this.$buefy.toast.open({ message: this.$t('report.debtorDrag.toast.frozen'), type: 'is-success' })
      }
    },
    downloadPdf () {
      if (typeof window !== 'undefined') { window.print() }
    },
    askCoach () {
      this.$buefy.toast.open({ message: this.$t('report.debtorDrag.toast.coachSoon'), type: 'is-info' })
    }
  }
}
</script>

<style scoped>
.ddg-root {
  /* Colours flow from the shared ReportShell tokens (single source): --ddg-* is a thin
     alias layer, no colour declared here. Frame + dark-mode block removed (ReportShell
     owns the frame; all-light ruling 2026-07-27). Width now matches Lease vs Buy. */
  --ddg-bg:var(--rs-bg); --ddg-panel:var(--rs-panel); --ddg-panel-2:var(--rs-panel-2); --ddg-ink:var(--rs-ink); --ddg-muted:var(--rs-muted); --ddg-line:var(--rs-line);
  --ddg-accent:var(--rs-accent); --ddg-accent-bright:var(--rs-accent-bright); --ddg-accent-soft:var(--rs-accent-soft); --ddg-accent-contrast:var(--rs-accent-contrast);
  --ddg-good:var(--rs-good); --ddg-good-soft:var(--rs-good-soft); --ddg-crit:var(--rs-crit); --ddg-crit-soft:var(--rs-crit-soft); --ddg-warn:var(--rs-warn); --ddg-warn-soft:var(--rs-warn-soft);
  --ddg-shadow:var(--rs-shadow); --ddg-r:var(--rs-radius);
  color:var(--ddg-ink);
  /* Flex column with ONE gap value (16px) so every vertical gap — header→band,
     band→layout and inside the results column — is identical (owner ruling 2026-07-27). */
  display:flex; flex-direction:column; gap:16px;
}
/* Reset the shared ReportHeader's `margin: 0 auto 22px`: inside a flex column that auto
   margin shrinks the header below full width and its 22px stacks on the flex gap. Zeroing
   it here (not touching the shared component) leaves the single 16px flex gap as the only
   spacing between the header and the band. */
.ddg-root ::v-deep .rs-top { margin: 0; }
.ddg-root strong, .ddg-root b { font-weight:600; }
.ddg-blue { color:var(--rs-accent); }
.num { font-variant-numeric: tabular-nums; }
/* Width + centring now come from the ReportShell wrap; column width (340px) left for the
   Step 3 standardisation to 360px. */
.ddg-layout { display:grid; grid-template-columns:var(--rs-col-input) 1fr; gap:var(--rs-col-gap); align-items:start; }
@media (max-width:860px) { .ddg-layout { grid-template-columns:1fr; } }
.ddg-card { background:var(--ddg-panel); border:1px solid var(--ddg-line); border-radius:var(--ddg-r); box-shadow:var(--ddg-shadow); }
.ddg-h2 { margin:0; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--ddg-muted); font-weight:600; }
.ddg-instruct { padding:13px 16px; border-bottom:1px solid var(--ddg-line); font-size:12px; color:var(--ddg-muted); line-height:1.5; }
.ddg-instruct b { color:var(--ddg-ink); }
.ddg-group { padding:14px 16px; border-bottom:1px solid var(--ddg-line); }
.ddg-group:last-child { border-bottom:0; }
.ddg-glabel { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:9px; }
.ddg-lft { display:flex; align-items:center; gap:8px; }
.ddg-dot { width:7px; height:7px; border-radius:50%; background:var(--ddg-accent-bright); }
.ddg-total { font-size:10.5px; font-weight:600; padding:2px 7px; border-radius:999px; }
.ddg-total.ok { color:var(--ddg-good); background:var(--ddg-good-soft); }
.ddg-total.bad { color:var(--ddg-crit); background:var(--ddg-crit-soft); }
/* Sliders live in components/base/SliderField, reading these generic --sl-* tokens.
   They point at the --ddg-* aliases, which now resolve to the shared ReportShell tokens. */
.ddg-root {
  --sl-accent:var(--ddg-accent); --sl-line:var(--ddg-line); --sl-panel:var(--ddg-panel);
  --sl-ink:var(--ddg-ink); --sl-accent-soft:var(--ddg-accent-soft);
}
.ddg-setbtn { width:100%; font:inherit; font-weight:600; font-size:12.5px; color:var(--ddg-ink); background:var(--ddg-panel-2); border:1px solid var(--ddg-line); border-radius:9px; padding:10px; cursor:pointer; }
.ddg-setbtn:hover { border-color:var(--ddg-accent); }
.ddg-results { display:flex; flex-direction:column; gap:16px; min-height:200px; }
.ddg-chartcard { padding:18px; }
.ddg-chead { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:2px; }
.ddg-csub { font-size:12.5px; color:var(--ddg-muted); }
.ddg-chart { display:block; width:100%; height:auto; max-width:780px; margin:6px auto 0; }
.ddg-legend { display:flex; gap:16px; flex-wrap:wrap; margin-top:6px; font-size:12px; color:var(--ddg-muted); justify-content:center; }
.ddg-legend span { display:inline-flex; align-items:center; gap:6px; }
.ddg-legend i { width:16px; height:0; border-top:3px solid; border-radius:2px; }
.ddg-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
@media (max-width:640px) { .ddg-tiles { grid-template-columns:1fr; } }
.ddg-tile { background:var(--ddg-panel); border:1px solid var(--ddg-line); border-radius:var(--ddg-r); padding:15px 16px; box-shadow:var(--ddg-shadow); }
.ddg-k { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--ddg-muted); font-weight:600; }
.ddg-v { font-size:26px; font-weight:600; letter-spacing:-.01em; margin-top:6px; line-height:1; }
.ddg-v.crit { color:var(--ddg-crit); } .ddg-v.good { color:var(--ddg-good); } .ddg-v.muted { color:var(--ddg-muted); }
.ddg-sub { font-size:12px; color:var(--ddg-muted); margin-top:6px; }
.ddg-edu { border-left:3px solid var(--ddg-accent-bright); background:var(--ddg-accent-soft); border-radius:0 9px 9px 0; padding:15px 17px; }
.ddg-edu-h { display:flex; align-items:center; gap:9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:var(--ddg-accent); margin-bottom:8px; }
.ddg-edu-p { margin:0; font-size:14px; line-height:1.6; }
.ddg-lead { background:var(--ddg-accent); color:var(--ddg-accent-contrast); font-size:10px; font-weight:600; letter-spacing:.08em; padding:3px 7px; border-radius:5px; }
.ddg-actions { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.ddg-cta { font:inherit; font-weight:600; font-size:13.5px; color:var(--ddg-accent-contrast); background:var(--ddg-accent); border:0; padding:11px 18px; border-radius:10px; cursor:pointer; }
.ddg-cta:hover { filter:brightness(1.06); }
.ddg-ghost { background:transparent; color:var(--ddg-ink); border:1px solid var(--ddg-line); }
.ddg-foot { font-size:12px; color:var(--ddg-muted); }
@media print {
  .ddg-root { padding:0; background:#fff; min-height:auto; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  aside.ddg-card, .ddg-actions { display:none !important; }
  .ddg-layout { display:block; max-width:none; }
  .ddg-results { max-width:none; }
  .ddg-tile, .ddg-card, .ddg-edu { break-inside:avoid; box-shadow:none; }
}
/* pop */
.ddg-v{color:var(--ddg-accent)}
.ddg-v.crit{color:var(--ddg-crit)} .ddg-v.good{color:var(--ddg-good)} .ddg-v.muted{color:var(--ddg-muted)}
.ddg-h2{color:var(--ddg-ink)}
/* pop2 */
.ddg-v{color:var(--rs-accent)}
.ddg-v.crit{color:var(--rs-crit)} .ddg-v.good{color:var(--rs-good)} .ddg-v.muted{color:var(--rs-muted)}
.ddg-tile{border-top:3px solid var(--rs-accent-bright)}
/* The headline banner now lives in components/base/HeroStrip + HeroFigure. */
</style>

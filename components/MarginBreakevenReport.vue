<template lang="pug">
.mbk-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.marginBreakeven.title')"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"
  )

  .mbk-layout
    aside.mbk-card
      .mbk-group(v-for="g in groups" :key="g.k")
        .mbk-glabel
          span.mbk-dot
          h2.mbk-h2 {{ $t('report.marginBreakeven.group.' + g.k + '') }}
        slider-field(
          v-for="fld in g.fields"
          :key="fld.k"
          :label="$t('report.marginBreakeven.field.' + fld.k + '')"
          :display="fmtField(fld)"
          :value="f[fld.k]"
          :min="fld.min"
          :max="fld.max"
          :step="fld.step"
          :tone="fld.k === 'wif' ? 'warn' : 'default'"
          @input="v => setField(fld.k, v)"
        )

    section.mbk-results(v-if="data")
      //- A failure AFTER the first load must never sit silently behind stale figures:
      //- the numbers describe the PREVIOUS inputs while looking live (R9).
      stale-banner(
        v-if="error"
        :title="$t('report.staleTitle')"
        :message="$t('report.calcUnreachable')"
        :retry-label="$t('report.retry')"
        @retry="recompute"
      )
      hero-strip(:stale="!!error")
        hero-figure(:label="$t('report.marginBreakeven.hero.margin')" :value="pct(data.marginPct)" :sub="$t('report.marginBreakeven.hero.marginSub')")
        hero-figure(
          :label="$t('report.marginBreakeven.hero.markup')"
          :value="round1(data.markup) + '× · ' + pct(data.markup)"
          :sub="$t('report.marginBreakeven.hero.markupSub')"
        )
        hero-figure(:label="$t('report.marginBreakeven.hero.cos')" :value="pct(data.costOfSalesPct)" :sub="$t('report.marginBreakeven.hero.cosSub')")
        hero-figure(
          :label="$t('report.marginBreakeven.hero.breakEven')"
          :value="money(data.requiredSales)"
          :sub="round0(data.requiredUnits) + ' ' + $t('report.marginBreakeven.hero.breakEvenSub')"
        )

      .mbk-card.mbk-chartcard
        .mbk-chead
          h2.mbk-h2 {{ $t('report.marginBreakeven.chart.title') }}
          .mbk-csub {{ $t('report.marginBreakeven.chart.sub') }}
        svg.mbk-chart(v-if="chart" viewBox="0 0 780 300" role="img" :aria-label="$t('report.marginBreakeven.chart.aria')")
          template(v-for="(gl, gi) in chart.grid")
            line(:key="'gl'+gi" :x1="chart.pl" :y1="gl.y" :x2="chart.xEnd" :y2="gl.y" stroke="var(--mbk-line)" stroke-width="1")
            text(:key="'gt'+gi" :x="chart.pl - 8" :y="gl.y + 3" text-anchor="end" fill="var(--mbk-muted)" font-size="10") {{ gl.label }}
          text(v-for="(mo, mi) in chart.xlabels" :key="'x'+mi" :x="mo.x" y="287" text-anchor="middle" fill="var(--mbk-muted)" font-size="10") {{ mo.label }}
          line(:x1="chart.zeroX" :y1="chart.pt" :x2="chart.zeroX" :y2="chart.bottom" stroke="var(--mbk-muted)" stroke-width="1" stroke-dasharray="2 3")
          path(:d="chart.path" fill="none" stroke="#0070c0" stroke-width="2.6")
          circle(v-if="chart.now" :cx="chart.now.x" :cy="chart.now.y" r="4" fill="#8a97a8")
          circle(v-if="chart.chosen" :cx="chart.chosen.x" :cy="chart.chosen.y" r="5.5" fill="#ff9900")
        //- The what-if answer. It lights up amber — matching the slider that drives it —
        //- whenever the price change is off zero, because the blue hero figures
        //- deliberately never move (they are today's position, not a hypothetical).
        .mbk-call(:class="{ 'is-active': f.wif !== 0 }")
          .mbk-callhead {{ $t('report.marginBreakeven.whatIf.head') }}
          .mbk-callrow
            div {{ $t('report.marginBreakeven.whatIf.atPrice') }}
              b.num {{ money(data.chosen.newPrice) }}
            div {{ $t('report.marginBreakeven.whatIf.marginBecomes') }}
              b.num {{ pct(data.chosen.newMarginPct) }}
            div {{ $t('report.marginBreakeven.whatIf.mustSell') }}
              b.num {{ round0(data.chosen.unitsRequired) }} {{ $t('report.marginBreakeven.whatIf.units') }}
            div {{ $t('report.marginBreakeven.whatIf.vsNow') }}
              b.num {{ diffText }}

      .mbk-edu
        .mbk-edu-h
          span.mbk-lead {{ $t('report.marginBreakeven.coach.lead') }}
          | {{ $t('report.marginBreakeven.coach.title') }}
        p.mbk-edu-p(v-if="data")
          | {{ $t('report.marginBreakeven.coach.body1') }} #[strong {{ $t('report.marginBreakeven.coach.marginIs') }} {{ pct(data.marginPct) }}] {{ $t('report.marginBreakeven.coach.ofSale') }} #[strong {{ $t('report.marginBreakeven.coach.markupIs') }} {{ round1(data.markup) }}×] {{ $t('report.marginBreakeven.coach.ofCost') }} #[strong {{ money(f.oh) }}] {{ $t('report.marginBreakeven.coach.overheads') }} #[strong {{ money(f.draw) }}] {{ $t('report.marginBreakeven.coach.drawings') }} #[strong {{ money(data.requiredSales) }}] ({{ round0(data.requiredUnits) }} {{ $t('report.marginBreakeven.whatIf.units') }}) {{ $t('report.marginBreakeven.coach.body4') }}

      .mbk-actions
        button.mbk-cta(@click="downloadPdf") {{ $t('report.marginBreakeven.actions.pdf') }}
        button.mbk-cta.mbk-ghost(@click="reset") {{ $t('report.marginBreakeven.actions.reset') }}
        button.mbk-cta.mbk-ghost(@click="askCoach") {{ $t('report.marginBreakeven.actions.coach') }}
        span.mbk-foot {{ $t('report.marginBreakeven.actions.foot') }}

    section.mbk-results(v-else)
      b-loading(:is-full-page="false" :active="true")
</template>

<script>
/**
 * MarginBreakevenReport — Margin, Mark-up & Break-even (third model).
 *
 * Combines the source models GE.Margin-Markup-Breakeven Calculator + Break-Even_ (Input +
 * What If Price): margin vs mark-up, break-even = (overheads + owner's drawings) ÷ margin, and
 * a what-if-price curve of the sales/units needed to hold the target. Calc runs backend-only
 * (POST /api/report/margin-breakeven); see server/report/marginBreakevenModel.js + golden test.
 * Coach text is templated (not AI) for this build; English placeholders pending report.* i18n.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import SliderField from '~/components/base/SliderField'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

const DEFAULTS = { price: 250, cost: 82.5, oh: 11500, draw: 8600, wif: 0 }

export default {
  name: 'MarginBreakevenReport',

  components: { ReportHeader, StaleBanner, HeroStrip, HeroFigure, SliderField },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      f: Object.assign({}, DEFAULTS),
      data: null,
      groups: [
        {
 k: 'product',
fields: [
          { k: 'price', min: 20, max: 1000, step: 5, fmt: 'money' },
          { k: 'cost', min: 5, max: 800, step: 2.5, fmt: 'money2' }
        ]
},
        {
 k: 'doors',
fields: [
          { k: 'oh', min: 0, max: 60000, step: 500, fmt: 'money' },
          { k: 'draw', min: 0, max: 60000, step: 500, fmt: 'money' }
        ]
},
        {
 k: 'whatIf',
fields: [
          { k: 'wif', min: -40, max: 80, step: 1, fmt: 'signpct' }
        ]
}
      ]
    }
  },

  computed: {
    diffText () {
      if (!this.data) { return '—' }
      const d = this.data.chosen.unitsRequired - this.data.requiredUnits
      return (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + ' ' + this.$t('report.marginBreakeven.whatIf.units')
    },
    chart () {
      if (!this.data) { return null }
      const W = 780; const pl = 58; const pr = 18; const pt = 16; const pb = 34
      const pw = W - pl - pr; const ph = 300 - pt - pb
      const pts = this.data.curve.filter(function (p) { return p.units !== null })
      if (!pts.length) { return null }
      let maxU = 0
      pts.forEach(function (p) { if (p.units > maxU) { maxU = p.units } })
      maxU *= 1.08
      const x = function (chg) { return pl + pw * ((chg - (-40)) / (80 - (-40))) }
      const y = function (u) { return pt + ph * (1 - u / maxU) }
      let path = 'M' + x(pts[0].chg) + ' ' + y(pts[0].units)
      for (let i = 1; i < pts.length; i++) { path += ' L' + x(pts[i].chg) + ' ' + y(pts[i].units) }
      const grid = []
      for (let g = 0; g <= 4; g++) { grid.push({ y: pt + ph * g / 4, label: Math.round(maxU * (1 - g / 4)) }) }
      const xlabels = [-40, -20, 0, 20, 40, 60, 80].map(function (p) { return { x: x(p), label: (p > 0 ? '+' : '') + p + '%' } })
      return {
        pl,
pt,
xEnd: W - pr,
bottom: pt + ph,
zeroX: x(0),
grid,
xlabels,
path,
        now: { x: x(0), y: y(this.data.requiredUnits) },
        chosen: { x: x(this.f.wif), y: y(this.data.chosen.unitsRequired) }
      }
    }
  },

  mounted () { this.recompute() },

  methods: {
    // money() / money2() now come from currencyMixin (firm currency + locale).
    pct (n) { return Math.round((n || 0) * 100) + '%' },
    round0 (n) { return Math.round(n || 0) },
    round1 (n) { return (Math.round((n || 0) * 10) / 10).toFixed(1) },
    fmtField (fld) {
      const v = this.f[fld.k]
      if (fld.fmt === 'money') { return this.money(v) }
      if (fld.fmt === 'money2') { return this.money2(v) }
      if (fld.fmt === 'signpct') { return (v > 0 ? '+' : '') + v + '%' }
      return v
    },
    /**
     * A slider moved: store the new value and queue a recompute. Replaces the old
     * `v-model.number` + `@input` pair — SliderField reports its value as an event,
     * so the write and the recompute happen in one explicit place.
     * @param {string} key - the field key in `f` @param {number} v
     */
    setField (key, v) {
      this.f[key] = v
      this.queueRecompute()
    },
    payload () {
      return { price: this.f.price, cost: this.f.cost, overheads: this.f.oh, ownerDrawings: this.f.draw, priceChangePct: this.f.wif }
    },
    /** Backend request — consumed by the reportRecompute mixin (debounce + race guard). */
    recomputeRequest () {
      return { url: '/api/report/margin-breakeven', body: this.payload() }
    },
    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    },
    reset () {
      this.f = Object.assign({}, DEFAULTS)
      this.recompute()
      this.$buefy.toast.open({ message: this.$t('report.marginBreakeven.toast.reset'), type: 'is-info' })
    },
    downloadPdf () { if (typeof window !== 'undefined') { window.print() } },
    askCoach () { this.$buefy.toast.open({ message: this.$t('report.marginBreakeven.toast.coachSoon'), type: 'is-info' }) }
  }
}
</script>

<style scoped>
.mbk-root {
  --mbk-bg:#eef3f8; --mbk-panel:#ffffff; --mbk-panel-2:#f1f6fb; --mbk-ink:#002b64; --mbk-muted:#5b6f8a; --mbk-line:#d5e1ee;
  --mbk-accent:#0070c0; --mbk-accent-bright:#00b1e0; --mbk-accent-soft:#0070c018; --mbk-accent-contrast:#ffffff;
  --mbk-good:#4ca52d; --mbk-warn:#ff9900; --mbk-crit:#ff0000;
  --mbk-shadow:0 1px 2px #002b6412, 0 8px 24px -12px #002b6426; --mbk-r:14px;
  background:var(--mbk-bg); color:var(--mbk-ink);
  font-family:'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight:300; -webkit-font-smoothing:antialiased; padding:28px 22px 64px; min-height:100vh;
}
@media (prefers-color-scheme: dark) {
  .mbk-root {
    --mbk-bg:#05132a; --mbk-panel:#0a1f3d; --mbk-panel-2:#07182f; --mbk-ink:#e6f0fa; --mbk-muted:#9fb4d0; --mbk-line:#1a3559;
    --mbk-accent:#00b1e0; --mbk-accent-bright:#7fd3f1; --mbk-accent-soft:#00b1e022; --mbk-accent-contrast:#002b64;
    --mbk-shadow:0 1px 2px #0007, 0 10px 30px -14px #000a;
  }
}
.mbk-root strong, .mbk-root b { font-weight:600; }
.num { font-variant-numeric: tabular-nums; }
.mbk-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; max-width:1120px; margin:0 auto; }
@media (max-width:860px) { .mbk-layout { grid-template-columns:1fr; } }
.mbk-card { background:var(--mbk-panel); border:1px solid var(--mbk-line); border-radius:var(--mbk-r); box-shadow:var(--mbk-shadow); }
.mbk-h2 { margin:0; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--mbk-ink); font-weight:600; }
.mbk-group { padding:15px 16px; border-bottom:1px solid var(--mbk-line); }
.mbk-group:last-child { border-bottom:0; }
.mbk-glabel { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.mbk-dot { width:7px; height:7px; border-radius:50%; background:var(--mbk-accent-bright); }
/* Sliders now live in components/base/SliderField. It reads these generic tokens, so
   this screen keeps its own palette — including the dark-mode overrides above. */
.mbk-root {
  --sl-accent:var(--mbk-accent); --sl-line:var(--mbk-line); --sl-panel:var(--mbk-panel);
  --sl-ink:var(--mbk-ink); --sl-warn:var(--mbk-warn); --sl-accent-soft:var(--mbk-accent-soft);
}
.mbk-results { display:flex; flex-direction:column; gap:20px; min-height:200px; }
.mbk-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
@media (max-width:640px) { .mbk-tiles { grid-template-columns:1fr; } }
.mbk-tile { background:var(--mbk-panel); border:1px solid var(--mbk-line); border-radius:var(--mbk-r); padding:15px 16px; box-shadow:var(--mbk-shadow); }
.mbk-tile.two { display:flex; gap:18px; }
.mbk-tile.two > div { flex:1; }
.mbk-k { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mbk-muted); font-weight:600; }
.mbk-v { font-size:25px; font-weight:600; letter-spacing:-.01em; margin-top:5px; line-height:1; color:var(--mbk-accent); }
.mbk-sub { font-size:12px; color:var(--mbk-muted); margin-top:6px; }
.mbk-chartcard { padding:18px; }
.mbk-chead { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; }
.mbk-csub { font-size:12.5px; color:var(--mbk-muted); }
.mbk-chart { display:block; width:100%; height:auto; max-width:780px; margin:8px auto 0; }
.mbk-call { margin-top:12px; background:var(--mbk-panel-2); border:1px solid var(--mbk-line); border-radius:10px; padding:12px 14px; transition:background .2s, border-color .2s; }
.mbk-callhead { font-size:11px; letter-spacing:.09em; text-transform:uppercase; font-weight:600; color:var(--mbk-muted); margin-bottom:9px; }
.mbk-callrow { display:flex; gap:14px; flex-wrap:wrap; }
.mbk-call.is-active { border-color:var(--mbk-warn); background:#ff99001a; }
.mbk-call.is-active .mbk-callhead { color:var(--mbk-warn); }
.mbk-call div { font-size:12px; color:var(--mbk-muted); }
.mbk-call b { display:block; font-size:16px; color:var(--mbk-ink); font-weight:600; margin-top:2px; }
.mbk-edu { border-left:3px solid var(--mbk-accent-bright); background:var(--mbk-accent-soft); border-radius:0 9px 9px 0; padding:15px 17px; }
.mbk-edu-h { display:flex; align-items:center; gap:9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:var(--mbk-accent); margin-bottom:8px; }
.mbk-edu-p { margin:0; font-size:14px; line-height:1.6; }
.mbk-lead { background:var(--mbk-accent); color:var(--mbk-accent-contrast); font-size:10px; font-weight:600; letter-spacing:.08em; padding:3px 7px; border-radius:5px; }
.mbk-actions { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.mbk-cta { font:inherit; font-weight:600; font-size:13.5px; color:var(--mbk-accent-contrast); background:var(--mbk-accent); border:0; padding:11px 18px; border-radius:10px; cursor:pointer; }
.mbk-cta:hover { filter:brightness(1.06); }
.mbk-ghost { background:transparent; color:var(--mbk-ink); border:1px solid var(--mbk-line); }
.mbk-foot { font-size:12px; color:var(--mbk-muted); }
@media print {
  .mbk-root { padding:0; background:#fff; min-height:auto; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  aside.mbk-card, .mbk-actions { display:none !important; }
  .mbk-layout { display:block; max-width:none; }
  .mbk-results { max-width:none; }
  .mbk-tile, .mbk-card, .mbk-edu { break-inside:avoid; box-shadow:none; }
}
/* pop2 */
.mbk-v{color:#0070c0}
.mbk-tile{border-top:3px solid #00b1e0}
/* The headline banner now lives in components/base/HeroStrip + HeroFigure. */
</style>

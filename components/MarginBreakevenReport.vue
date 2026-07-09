<template lang="pug">
.mbk-root
  header.mbk-top
    .mbk-brand
      .mbk-eyebrow Business Performance Report
      h1.mbk-h1 Margin, Mark-up &amp; Break-even
      .mbk-client Prepared for #[strong [Client Company]] · by #[strong [Advisor / Firm]]
    .mbk-badge Illustrative

  .mbk-layout
    aside.mbk-card
      .mbk-group(v-for="g in groups" :key="g.title")
        .mbk-glabel
          span.mbk-dot
          h2.mbk-h2 {{ g.title }}
        .mbk-field(v-for="fld in g.fields" :key="fld.k")
          .mbk-frow
            label {{ fld.label }}
            output {{ fmtField(fld) }}
          input(
            type="range"
            v-model.number="f[fld.k]"
            :min="fld.min" :max="fld.max" :step="fld.step"
            :class="{ wif: fld.k === 'wif' }"
            :style="{ '--fill': fillPct(fld) }"
            @input="scheduleRecompute"
          )

    section.mbk-results(v-if="data")
      .mbk-herostrip
        .mbk-hs
          .mbk-hk Margin
          .mbk-hv.num {{ pct(data.marginPct) }}
          .mbk-hs2 of the sale price
        .mbk-hs
          .mbk-hk Mark-up
          .mbk-hv.num {{ round1(data.markup) }}× · {{ pct(data.markup) }}
          .mbk-hs2 of the cost price
        .mbk-hs
          .mbk-hk Cost of sales
          .mbk-hv.num {{ pct(data.costOfSalesPct) }}
          .mbk-hs2 of each sale dollar
        .mbk-hs
          .mbk-hk Break-even · monthly
          .mbk-hv.num {{ money(data.requiredSales) }}
          .mbk-hs2 {{ round0(data.requiredUnits) }} units to cover it

      .mbk-card.mbk-chartcard
        .mbk-chead
          h2.mbk-h2 Sales you must make vs your price
          .mbk-csub cut the price and the work explodes; raise it and it shrinks
        svg.mbk-chart(v-if="chart" viewBox="0 0 780 300" role="img" aria-label="Units required to break even across a range of price changes")
          template(v-for="(gl, gi) in chart.grid")
            line(:key="'gl'+gi" :x1="chart.pl" :y1="gl.y" :x2="chart.xEnd" :y2="gl.y" stroke="var(--mbk-line)" stroke-width="1")
            text(:key="'gt'+gi" :x="chart.pl - 8" :y="gl.y + 3" text-anchor="end" fill="var(--mbk-muted)" font-size="10") {{ gl.label }}
          text(v-for="(mo, mi) in chart.xlabels" :key="'x'+mi" :x="mo.x" y="287" text-anchor="middle" fill="var(--mbk-muted)" font-size="10") {{ mo.label }}
          line(:x1="chart.zeroX" :y1="chart.pt" :x2="chart.zeroX" :y2="chart.bottom" stroke="var(--mbk-muted)" stroke-width="1" stroke-dasharray="2 3")
          path(:d="chart.path" fill="none" stroke="#0070c0" stroke-width="2.6")
          circle(v-if="chart.now" :cx="chart.now.x" :cy="chart.now.y" r="4" fill="#8a97a8")
          circle(v-if="chart.chosen" :cx="chart.chosen.x" :cy="chart.chosen.y" r="5.5" fill="#ff9900")
        .mbk-call
          div At this price
            b.num {{ money(data.chosen.newPrice) }}
          div Margin becomes
            b.num {{ pct(data.chosen.newMarginPct) }}
          div You must sell
            b.num {{ round0(data.chosen.unitsRequired) }} units
          div vs now
            b.num {{ diffText }}

      .mbk-edu
        .mbk-edu-h
          span.mbk-lead Coach
          | What this means
        p.mbk-edu-p(v-if="data")
          | Same deal, two numbers: your #[strong margin is {{ pct(data.marginPct) }}] (of the sale) but your #[strong mark-up is {{ round1(data.markup) }}×] (of the cost) — don't confuse them when you quote. To cover #[strong {{ money(f.oh) }}] overheads and take #[strong {{ money(f.draw) }}] in drawings, you must sell #[strong {{ money(data.requiredSales) }}] ({{ round0(data.requiredUnits) }} units) a month. Cut the price and that work climbs fast; raise it and it drops away. Price and drawings decide how hard the business has to run.

      .mbk-actions
        button.mbk-cta(@click="downloadPdf") Download PDF
        button.mbk-cta.mbk-ghost(@click="reset") ↺ Reset
        button.mbk-cta.mbk-ghost(@click="askCoach") Ask the coach ↗
        span.mbk-foot Figures reproduce your Excel model exactly.

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
const DEFAULTS = { price: 250, cost: 82.5, oh: 11500, draw: 8600, wif: 0 }

export default {
  name: 'MarginBreakevenReport',

  data () {
    return {
      f: Object.assign({}, DEFAULTS),
      data: null,
      recomputeTimer: null,
      groups: [
        {
 title: 'The product',
fields: [
          { k: 'price', label: 'Sale price', min: 20, max: 1000, step: 5, fmt: 'money' },
          { k: 'cost', label: 'Unit cost', min: 5, max: 800, step: 2.5, fmt: 'money2' }
        ]
},
        {
 title: 'To keep the doors open (monthly)',
fields: [
          { k: 'oh', label: 'Overheads', min: 0, max: 60000, step: 500, fmt: 'money' },
          { k: 'draw', label: "Owner's drawings (target)", min: 0, max: 60000, step: 500, fmt: 'money' }
        ]
},
        {
 title: 'What if you change the price?',
fields: [
          { k: 'wif', label: 'Price change', min: -40, max: 80, step: 1, fmt: 'signpct' }
        ]
}
      ]
    }
  },

  computed: {
    diffText () {
      if (!this.data) { return '—' }
      const d = this.data.chosen.unitsRequired - this.data.requiredUnits
      return (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + ' units'
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
  beforeDestroy () { if (this.recomputeTimer) { clearTimeout(this.recomputeTimer) } },

  methods: {
    money (n) { return '$' + Math.round(n || 0).toLocaleString('en-US') },
    pct (n) { return Math.round((n || 0) * 100) + '%' },
    round0 (n) { return Math.round(n || 0) },
    round1 (n) { return (Math.round((n || 0) * 10) / 10).toFixed(1) },
    fmtField (fld) {
      const v = this.f[fld.k]
      if (fld.fmt === 'money') { return this.money(v) }
      if (fld.fmt === 'money2') { return '$' + Number(v).toFixed(2) }
      if (fld.fmt === 'signpct') { return (v > 0 ? '+' : '') + v + '%' }
      return v
    },
    fillPct (fld) { return ((this.f[fld.k] - fld.min) / (fld.max - fld.min) * 100) + '%' },
    payload () {
      return { price: this.f.price, cost: this.f.cost, overheads: this.f.oh, ownerDrawings: this.f.draw, priceChangePct: this.f.wif }
    },
    scheduleRecompute () {
      if (this.recomputeTimer) { clearTimeout(this.recomputeTimer) }
      this.recomputeTimer = setTimeout(this.recompute, 140)
    },
    recompute () {
      fetch('/api/report/margin-breakeven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.payload())
      })
        .then(function (r) { return r.json() })
        .then((json) => { if (json && json.success) { this.data = json.data } })
        .catch(() => { this.$buefy.toast.open({ message: 'Could not reach the calculation service.', type: 'is-danger' }) })
    },
    reset () {
      this.f = Object.assign({}, DEFAULTS)
      this.recompute()
      this.$buefy.toast.open({ message: 'Reset to defaults.', type: 'is-info' })
    },
    downloadPdf () { if (typeof window !== 'undefined') { window.print() } },
    askCoach () { this.$buefy.toast.open({ message: 'AI coach panel — coming later.', type: 'is-info' }) }
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
.mbk-top { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; max-width:1120px; margin:0 auto 22px; }
.mbk-eyebrow { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--mbk-accent-bright); font-weight:600; }
.mbk-h1 { margin:2px 0 0; font-size:25px; font-weight:300; letter-spacing:-.01em; }
.mbk-client { font-size:13px; color:var(--mbk-muted); }
.mbk-badge { font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; font-weight:600; color:var(--mbk-warn); border:1px solid #ff990070; background:#ff99001a; padding:5px 9px; border-radius:999px; height:fit-content; }
.mbk-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; max-width:1120px; margin:0 auto; }
@media (max-width:860px) { .mbk-layout { grid-template-columns:1fr; } }
.mbk-card { background:var(--mbk-panel); border:1px solid var(--mbk-line); border-radius:var(--mbk-r); box-shadow:var(--mbk-shadow); }
.mbk-h2 { margin:0; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--mbk-ink); font-weight:600; }
.mbk-group { padding:15px 16px; border-bottom:1px solid var(--mbk-line); }
.mbk-group:last-child { border-bottom:0; }
.mbk-glabel { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.mbk-dot { width:7px; height:7px; border-radius:50%; background:var(--mbk-accent-bright); }
.mbk-field { margin:11px 0; } .mbk-field:first-of-type { margin-top:0; }
.mbk-frow { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:5px; }
.mbk-frow label { font-size:12.5px; color:var(--mbk-ink); font-weight:300; }
.mbk-frow output { font-size:13px; font-weight:600; color:var(--mbk-accent); }
.mbk-field input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:4px; background:linear-gradient(var(--mbk-accent), var(--mbk-accent)) 0/var(--fill,50%) 100% no-repeat, var(--mbk-line); outline:none; }
.mbk-field input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--mbk-panel); border:2px solid var(--mbk-accent); box-shadow:0 1px 3px #0003; cursor:pointer; }
.mbk-field input.wif { background:linear-gradient(var(--mbk-warn), var(--mbk-warn)) 0/var(--fill,50%) 100% no-repeat, var(--mbk-line); }
.mbk-field input.wif::-webkit-slider-thumb { border-color:var(--mbk-warn); }
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
.mbk-call { margin-top:12px; display:flex; gap:14px; flex-wrap:wrap; background:var(--mbk-panel-2); border:1px solid var(--mbk-line); border-radius:10px; padding:12px 14px; }
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
  aside.mbk-card, .mbk-actions, .mbk-badge { display:none !important; }
  .mbk-layout { display:block; max-width:none; }
  .mbk-top, .mbk-results { max-width:none; }
  .mbk-tile, .mbk-card, .mbk-edu { break-inside:avoid; box-shadow:none; }
}
/* pop2 */
.mbk-v{color:#0070c0}
.mbk-tile{border-top:3px solid #00b1e0}
.mbk-eyebrow{color:#00b1e0}

.mbk-herostrip{background:linear-gradient(120deg,#002b64 0%,#0a56b0 55%,#00b1e0 135%);border-radius:14px;padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;box-shadow:0 12px 32px -12px #002b6466}
@media (max-width:700px){.mbk-herostrip{grid-template-columns:1fr 1fr;gap:14px 0}}
.mbk-hs{padding:2px 16px;border-left:1px solid #ffffff30}
.mbk-hs:first-child{border-left:0;padding-left:2px}
.mbk-hk{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#7fe4ff;font-weight:700}
.mbk-hv{font-size:24px;font-weight:700;color:#fff;margin-top:7px;line-height:1.05;font-variant-numeric:tabular-nums}
.mbk-hs2{font-size:12px;color:#c7e6fb;margin-top:6px}
</style>

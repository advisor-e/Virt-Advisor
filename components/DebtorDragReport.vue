<template lang="pug">
.ddg-root
  header.ddg-top
    .ddg-brand
      .ddg-eyebrow Business Performance Report
      h1.ddg-h1 Debtor Business Drag
      .ddg-client Prepared for #[strong [Client Company]] · by #[strong [Advisor / Firm]]
    .ddg-badge Illustrative

  .ddg-layout
    aside.ddg-card
      .ddg-instruct Set these to the client's situation and click #[b “Freeze as Before”]. Then change a decision — the #[b.ddg-blue blue line] moves against your grey #[b Before].
      .ddg-group(v-for="g in groups" :key="g.title")
        .ddg-glabel
          span.ddg-lft
            span.ddg-dot
            h2.ddg-h2 {{ g.title }}
          span.ddg-total(v-if="g.total" :class="totalOk(g.total) ? 'ok' : 'bad'") {{ totalOf(g.total) }}%
        .ddg-field(v-for="fld in g.fields" :key="fld.k")
          .ddg-frow
            label {{ fld.label }}
            output {{ fmtField(fld) }}
          input(
            type="range"
            v-model.number="f[fld.k]"
            :min="fld.min" :max="fld.max" :step="fld.step"
            :style="{ '--fill': fillPct(fld) }"
            @input="scheduleRecompute"
          )
      .ddg-group
        button.ddg-setbtn(@click="freeze") 📌 Freeze current as “Before”

    section.ddg-results
      .ddg-herostrip.three
        .ddg-hs
          .ddg-hk Deepest cash low — your plan
          .ddg-hv.num(:class="plan && plan.deepestLow.value < 0 ? 'crit' : 'good'") {{ plan ? money(plan.deepestLow.value) : '—' }}
          .ddg-hs2 {{ plan ? monthName(plan.deepestLow.month) + (plan.deepestLow.value < 0 ? ' — overdraft' : '') : '' }}
        .ddg-hs
          .ddg-hk Deepest cash low — Before
          .ddg-hv.num {{ before ? money(before.deepestLow.value) : '—' }}
          .ddg-hs2 {{ before ? monthName(before.deepestLow.month) + (before.deepestLow.value < 0 ? ' — overdraft' : '') : 'freeze a Before' }}
        .ddg-hs
          .ddg-hk Effect of your decisions
          .ddg-hv.num(:class="deltaClass") {{ deltaText }}
          .ddg-hs2 {{ deltaSub }}
      .ddg-card.ddg-chartcard
        .ddg-chead
          h2.ddg-h2 Your bank balance, month by month
          .ddg-csub slow debtors → you fall behind suppliers → overdraft
        svg.ddg-chart(v-if="chart" viewBox="0 0 780 320" role="img" aria-label="Monthly closing bank balance: Before vs your plan")
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
            | Before
          span
            i(style="border-color:#0070c0")
            | Your plan
          span
            i(style="border-top:none;height:10px;width:10px;border-radius:2px;background:#ff000022")
            | Overdraft

      .ddg-edu
        .ddg-edu-h
          span.ddg-lead Coach
          | What this means
        p.ddg-edu-p(v-if="plan")
          | Cash arrives late — customers pay across the months after the sale — but suppliers, wages and GST don't wait. Your bank dips to #[strong {{ money(plan.deepestLow.value) }}] in #[strong {{ monthName(plan.deepestLow.month) }}]{{ plan.deepestLow.value < 0 ? ', into overdraft,' : '' }} and you're in the red #[strong {{ plan.monthsInOverdraft }} months]. Collect earlier or pay suppliers slower and the blue line lifts; let collection drift later and you're forced to stretch suppliers, choking stock — the cash cycle running backwards.

      .ddg-actions
        button.ddg-cta(@click="downloadPdf") Download PDF
        button.ddg-cta.ddg-ghost(@click="reset") ↺ Reset
        button.ddg-cta.ddg-ghost(@click="askCoach") Ask the coach ↗
        span.ddg-foot Figures reproduce your Excel model exactly.
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
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SHAPE = [100000, 137850, 207563, 215000, 232000, 347000, 356000, 432000, 318000, 323000, 365000, 324000]
const BASE = SHAPE.reduce(function (a, b) { return a + b }, 0)

export default {
  name: 'DebtorDragReport',

  data () {
    return {
      f: { sales: 3357413, d0: 85, d1: 7, d2: 5, d3: 0, d4: 0, dwo: 3, c0: 90, c1: 10, c2: 0, c3: 0, c4: 0, markup: 47, np: 13, gst: 15 },
      plan: null, // { monthlyClosing, deepestLow, monthsInOverdraft, ... }
      before: null, // frozen snapshot of plan
      recomputeTimer: null,
      groups: [
        {
 title: 'Sales',
total: null,
fields: [
          { k: 'sales', label: 'Annual sales', min: 500000, max: 6000000, step: 50000, fmt: 'money' }
        ]
},
        {
 title: 'Debtors — when they pay',
total: 'd',
fields: [
          { k: 'd0', label: 'Same month', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd1', label: '1 month later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd2', label: '2 months later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd3', label: '3 months later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'd4', label: '4 months later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'dwo', label: 'Written off (never paid)', min: 0, max: 100, step: 1, fmt: 'pct' }
        ]
},
        {
 title: 'Suppliers — when you pay',
total: 'c',
fields: [
          { k: 'c0', label: 'Same month', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c1', label: '1 month later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c2', label: '2 months later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c3', label: '3 months later', min: 0, max: 100, step: 1, fmt: 'pct' },
          { k: 'c4', label: '4 months later', min: 0, max: 100, step: 1, fmt: 'pct' }
        ]
},
        {
 title: 'The business',
total: null,
fields: [
          { k: 'markup', label: 'Mark-up', min: 10, max: 150, step: 1, fmt: 'pct' },
          { k: 'np', label: 'Net profit', min: 0, max: 40, step: 1, fmt: 'pct' },
          { k: 'gst', label: 'GST / VAT', min: 0, max: 30, step: 0.5, fmt: 'pct' }
        ]
}
      ]
    }
  },

  computed: {
    deltaClass () {
      if (!this.before || !this.plan) { return 'muted' }
      return (this.plan.deepestLow.value - this.before.deepestLow.value) >= 0 ? 'good' : 'crit'
    },
    deltaText () {
      if (!this.before || !this.plan) { return '$0' }
      const d = this.plan.deepestLow.value - this.before.deepestLow.value
      return (d >= 0 ? '+$' : '−$') + Math.abs(Math.round(d)).toLocaleString('en-US')
    },
    deltaSub () {
      if (!this.before || !this.plan) { return 'freeze a “Before”, then decide' }
      return (this.plan.deepestLow.value - this.before.deepestLow.value) >= 0 ? 'better at the worst month' : 'worse at the worst month'
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
    this.recompute(true)
  },

  beforeDestroy () {
    if (this.recomputeTimer) { clearTimeout(this.recomputeTimer) }
  },

  methods: {
    money (n) { return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n || 0)).toLocaleString('en-US') },
    kf (n) { return (n < 0 ? '−$' : '$') + Math.abs(Math.round((n || 0) / 1000)) + 'k' },
    monthName (m) { return MON[m] || '' },
    fmtField (fld) {
      const v = this.f[fld.k]
      if (fld.fmt === 'money') { return this.money(v) }
      return v + '%'
    },
    fillPct (fld) {
      const v = this.f[fld.k]
      return ((v - fld.min) / (fld.max - fld.min) * 100) + '%'
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
    scheduleRecompute () {
      if (this.recomputeTimer) { clearTimeout(this.recomputeTimer) }
      this.recomputeTimer = setTimeout(this.recompute, 140)
    },
    recompute (seedBefore) {
      // Calc runs backend-only; the screen never computes the model itself.
      fetch('/api/report/debtor-drag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.payload())
      })
        .then(function (r) { return r.json() })
        .then((json) => {
          if (json && json.success) {
            this.plan = json.data
            if (seedBefore === true && !this.before) { this.before = json.data }
          }
        })
        .catch(() => {
          this.$buefy.toast.open({ message: 'Could not reach the calculation service.', type: 'is-danger' })
        })
    },
    reset () {
      this.f = { sales: 3357413, d0: 85, d1: 7, d2: 5, d3: 0, d4: 0, dwo: 3, c0: 90, c1: 10, c2: 0, c3: 0, c4: 0, markup: 47, np: 13, gst: 15 }
      this.recompute()
      this.$buefy.toast.open({ message: 'Reset to defaults.', type: 'is-info' })
    },
    freeze () {
      if (this.plan) {
        this.before = this.plan
        this.$buefy.toast.open({ message: 'Frozen as “Before” — now model a decision.', type: 'is-success' })
      }
    },
    downloadPdf () {
      if (typeof window !== 'undefined') { window.print() }
    },
    askCoach () {
      this.$buefy.toast.open({ message: 'AI coach panel — coming later.', type: 'is-info' })
    }
  }
}
</script>

<style scoped>
.ddg-root {
  --ddg-bg:#eef3f8; --ddg-panel:#ffffff; --ddg-panel-2:#f1f6fb; --ddg-ink:#002b64; --ddg-muted:#5b6f8a; --ddg-line:#d5e1ee;
  --ddg-accent:#0070c0; --ddg-accent-bright:#00b1e0; --ddg-accent-soft:#0070c018; --ddg-accent-contrast:#ffffff;
  --ddg-good:#4ca52d; --ddg-good-soft:#4ca52d1a; --ddg-crit:#ff0000; --ddg-crit-soft:#ff00000f; --ddg-warn:#ff9900; --ddg-warn-soft:#ff99001a;
  --ddg-shadow:0 1px 2px #002b6412, 0 8px 24px -12px #002b6426; --ddg-r:14px;
  background:var(--ddg-bg); color:var(--ddg-ink);
  font-family:'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight:300; -webkit-font-smoothing:antialiased; padding:28px 22px 64px; min-height:100vh;
}
@media (prefers-color-scheme: dark) {
  .ddg-root {
    --ddg-bg:#05132a; --ddg-panel:#0a1f3d; --ddg-panel-2:#07182f; --ddg-ink:#e6f0fa; --ddg-muted:#9fb4d0; --ddg-line:#1a3559;
    --ddg-accent:#00b1e0; --ddg-accent-bright:#7fd3f1; --ddg-accent-soft:#00b1e022; --ddg-accent-contrast:#002b64;
    --ddg-good-soft:#4ca52d26; --ddg-crit-soft:#ff00001f; --ddg-warn-soft:#ff990022;
    --ddg-shadow:0 1px 2px #0007, 0 10px 30px -14px #000a;
  }
}
.ddg-root strong, .ddg-root b { font-weight:600; }
.ddg-blue { color:#0070c0; }
.num { font-variant-numeric: tabular-nums; }
.ddg-top { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; max-width:1120px; margin:0 auto 22px; }
.ddg-eyebrow { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--ddg-accent-bright); font-weight:600; }
.ddg-h1 { margin:2px 0 0; font-size:25px; font-weight:300; letter-spacing:-.01em; }
.ddg-client { font-size:13px; color:var(--ddg-muted); }
.ddg-badge { font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; font-weight:600; color:var(--ddg-warn); border:1px solid #ff990070; background:var(--ddg-warn-soft); padding:5px 9px; border-radius:999px; height:fit-content; }
.ddg-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; max-width:1120px; margin:0 auto; }
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
.ddg-field { margin:9px 0; }
.ddg-field:first-of-type { margin-top:0; }
.ddg-frow { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:4px; }
.ddg-frow label { font-size:12px; color:var(--ddg-ink); font-weight:300; }
.ddg-frow output { font-size:12.5px; font-weight:600; color:var(--ddg-accent); }
.ddg-field input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:4px; background:linear-gradient(var(--ddg-accent), var(--ddg-accent)) 0/var(--fill,50%) 100% no-repeat, var(--ddg-line); outline:none; }
.ddg-field input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:15px; height:15px; border-radius:50%; background:var(--ddg-panel); border:2px solid var(--ddg-accent); box-shadow:0 1px 3px #0003; cursor:pointer; }
.ddg-field input[type=range]::-moz-range-thumb { width:15px; height:15px; border-radius:50%; background:var(--ddg-panel); border:2px solid var(--ddg-accent); cursor:pointer; }
.ddg-setbtn { width:100%; font:inherit; font-weight:600; font-size:12.5px; color:var(--ddg-ink); background:var(--ddg-panel-2); border:1px solid var(--ddg-line); border-radius:9px; padding:10px; cursor:pointer; }
.ddg-setbtn:hover { border-color:var(--ddg-accent); }
.ddg-results { display:flex; flex-direction:column; gap:20px; min-height:200px; }
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
  aside.ddg-card, .ddg-actions, .ddg-badge { display:none !important; }
  .ddg-layout { display:block; max-width:none; }
  .ddg-top, .ddg-results { max-width:none; }
  .ddg-tile, .ddg-card, .ddg-edu { break-inside:avoid; box-shadow:none; }
}
/* pop */
.ddg-v{color:var(--ddg-accent)}
.ddg-v.crit{color:var(--ddg-crit)} .ddg-v.good{color:var(--ddg-good)} .ddg-v.muted{color:var(--ddg-muted)}
.ddg-h2{color:var(--ddg-ink)}
/* pop2 */
.ddg-v{color:#0070c0}
.ddg-v.crit{color:#ff0000} .ddg-v.good{color:#4ca52d} .ddg-v.muted{color:#5b6f8a}
.ddg-tile{border-top:3px solid #00b1e0}
.ddg-eyebrow{color:#00b1e0}

.ddg-herostrip{background:linear-gradient(120deg,#002b64 0%,#0a56b0 55%,#00b1e0 135%);border-radius:14px;padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;box-shadow:0 12px 32px -12px #002b6466}
.ddg-herostrip.three{grid-template-columns:repeat(3,1fr)}
@media (max-width:700px){.ddg-herostrip,.ddg-herostrip.three{grid-template-columns:1fr 1fr;gap:14px 0}}
.ddg-hs{padding:2px 16px;border-left:1px solid #ffffff30}
.ddg-hs:first-child{border-left:0;padding-left:2px}
.ddg-hk{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#7fe4ff;font-weight:700}
.ddg-hv{font-size:26px;font-weight:700;color:#fff;margin-top:7px;line-height:1.05;font-variant-numeric:tabular-nums}
.ddg-hv.crit{color:#ff8f8f} .ddg-hv.good{color:#7dffa6} .ddg-hv.muted{color:#c7e6fb}
.ddg-hs2{font-size:12px;color:#c7e6fb;margin-top:6px}
</style>

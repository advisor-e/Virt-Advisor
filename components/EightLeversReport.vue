<template lang="pug">
.lev-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.eightLevers.title')"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"
  )

  .lev-layout
    aside.lev-card
      .lev-instruct {{ $t('report.eightLevers.instruction') }}

      .lev-group
        .lev-glabel
          span.lev-lft
            span.lev-dot
            h2.lev-h2 {{ $t('report.eightLevers.market') }}
        .lev-entry
          label.lev-elabel {{ $t('report.eightLevers.lever.marketSize') }}
          b-input(
            v-model.number="f.marketSize"
            type="number"
            min="0"
            step="500"
            @input="queueRecompute"
          )
          .lev-ehint {{ $t('report.eightLevers.marketHint') }}

      .lev-group
        .lev-glabel
          span.lev-lft
            span.lev-dot
            h2.lev-h2 {{ $t('report.eightLevers.funnel') }}
        .lev-field(v-for="fld in funnelFields" :key="fld.k")
          .lev-frow
            label {{ $t('report.eightLevers.lever.' + fld.k) }}
            output {{ fmtField(fld) }}
          input(
            type="range"
            v-model.number="f[fld.k]"
            :min="fld.min" :max="fld.max" :step="fld.step"
            :style="{ '--fill': fillPct(fld) }"
            @input="queueRecompute"
          )

      .lev-group
        .lev-glabel
          span.lev-lft
            span.lev-dot
            h2.lev-h2 {{ $t('report.eightLevers.value') }}
        .lev-field(v-for="fld in valueFields" :key="fld.k")
          .lev-frow
            label {{ $t('report.eightLevers.lever.' + fld.k) }}
            output {{ fmtField(fld) }}
          input(
            type="range"
            v-model.number="f[fld.k]"
            :min="fld.min" :max="fld.max" :step="fld.step"
            :style="{ '--fill': fillPct(fld) }"
            @input="queueRecompute"
          )

      .lev-group.lev-labourblock
        .lev-glabel
          span.lev-lft
            span.lev-dot
            h2.lev-h2 {{ $t('report.eightLevers.labourInputs') }}
        .lev-field(v-for="fld in labourFields" :key="fld.k")
          .lev-frow
            label {{ $t('report.eightLevers.labourInput.' + fld.k) }}
            output {{ fmtField(fld) }}
          input(
            type="range"
            v-model.number="f[fld.k]"
            :min="fld.min" :max="fld.max" :step="fld.step"
            :style="{ '--fill': fillPct(fld) }"
            @input="queueRecompute"
          )

      .lev-actions
        b-button.lev-btn(type="is-primary" @click="reset") {{ $t('report.reset') }}

    main.lev-main(v-if="data")
      //- A failure AFTER the first load must never sit silently behind stale figures — the
      //- numbers on screen would look live while describing the previous inputs.
      stale-banner(
        v-if="error"
        :title="$t('report.staleTitle')"
        :message="$t('report.calcUnreachable')"
        :retry-label="$t('report.retry')"
        @retry="recompute"
      )

      hero-strip(:columns="4" :stale="!!error")
        hero-figure(
          :label="$t('report.eightLevers.revenue')"
          :value="money(current.revenue)"
        )
        hero-figure(
          :label="$t('report.eightLevers.profit')"
          :value="money(current.profit)"
          :tone="current.profit >= 0 ? 'good' : 'crit'"
        )
        hero-figure(
          :label="$t('report.eightLevers.profitPct')"
          :value="pct(current.profitPct)"
        )
        hero-figure(
          :label="$t('report.eightLevers.customers')"
          :value="round0(current.customers)"
        )

      section.lev-panel
        h2.lev-ph {{ $t('report.eightLevers.chainTitle') }}
        p.lev-pnote {{ $t('report.eightLevers.chainNote') }}
        .lev-chain
          .lev-step(v-for="s in chain" :key="s.k")
            .lev-sk {{ $t('report.eightLevers.chain.' + s.k) }}
            .lev-sv {{ s.v }}

      section.lev-panel
        h2.lev-ph {{ $t('report.eightLevers.compareTitle') }}
        p.lev-pnote {{ $t('report.eightLevers.compareNote') }}
        .lev-tablewrap
          table.lev-table
            thead
              tr
                th {{ $t('report.eightLevers.measure') }}
                th.num {{ $t('report.eightLevers.current') }}
                th.num {{ $t('report.eightLevers.optionB') }}
                th.num {{ $t('report.eightLevers.optionC') }}
            tbody
              tr(v-for="row in compareRows" :key="row.k")
                td {{ $t('report.eightLevers.row.' + row.k) }}
                td.num {{ row.cur }}
                td.num {{ row.b }}
                td.num {{ row.c }}
              tr.lev-trprofit
                td {{ $t('report.eightLevers.row.profit') }}
                td.num {{ money(broad.current.profit) }}
                td.num(:class="broad.optionB.profit >= broad.current.profit ? 'ok' : 'bad'") {{ money(broad.optionB.profit) }}
                td.num(:class="broad.optionC.profit >= broad.current.profit ? 'ok' : 'bad'") {{ money(broad.optionC.profit) }}
              tr
                td {{ $t('report.eightLevers.row.profitIncrease') }}
                td.num —
                td.num(:class="broad.optionB.profitIncrease >= 0 ? 'ok' : 'bad'") {{ signedMoney(broad.optionB.profitIncrease) }}
                td.num(:class="broad.optionC.profitIncrease >= 0 ? 'ok' : 'bad'") {{ signedMoney(broad.optionC.profitIncrease) }}

      section.lev-panel
        h2.lev-ph {{ $t('report.eightLevers.labourTitle') }}
        p.lev-pnote {{ $t('report.eightLevers.labourNote') }}
        .lev-labour
          .lev-lstat.lev-gap
            .lev-slabel {{ $t('report.eightLevers.labourGap') }}
            .lev-sval(:class="labourGapPct > 0.05 ? 'bad' : 'ok'") {{ pct(labourGapPct) }}
          .lev-lstat(v-for="s in labourStats" :key="s.k")
            .lev-slabel {{ $t('report.eightLevers.labour.' + s.k) }}
            .lev-sval {{ s.v }}

    main.lev-main(v-else-if="error")
      .lev-panel.lev-error
        h2.lev-ph {{ $t('report.calcFailedTitle') }}
        //- Same regression as the stale banner above — `error` is a boolean flag.
        p.lev-pnote {{ $t('report.calcUnreachable') }}
        b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}

    main.lev-main(v-else)
      .lev-panel {{ $t('report.loading') }}
</template>

<script>
/**
 * EightLeversReport — the 8 Levers growth model (Education class).
 *
 * Renders `server/report/eightLeversModel.js` — a faithful port of all three sheets of
 * `GE.2b.8 Levers Model.xlsx`. The advisor moves each lever and watches the profit swing,
 * so the client SEES which lever pays best: the model's teaching point is that Option C
 * beats Option B on profit *despite lower revenue*, because margin outweighs volume.
 *
 * The calc runs backend-only (`POST /api/report/eight-levers`) per the Stack Constitution.
 * Illustrative figures throughout — no client data (see `design/MODEL-CLASSIFICATION.md`).
 *
 * The sliders drive the `Broad Scenarios` current column (the self-consistent forward funnel).
 * The Options B and C columns are the source's own scenario sets, shown for comparison.
 */

/**
 * Starting position: the `Broad Scenarios` current column, plus the labour sub-model's own
 * input cells (`Calculations` Q26:U38) — which the source has as variables, so they are
 * editable here too. Percentages are held as whole numbers for the sliders and converted to
 * fractions in payload().
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'
import StaleBanner from '~/components/base/StaleBanner.vue'
import HeroStrip from '~/components/base/HeroStrip.vue'
import HeroFigure from '~/components/base/HeroFigure.vue'

const DEFAULTS = {
  // The lever chain (Broad Scenarios, current column)
  marketSize: 32500,
  footTrafficPct: 9,
  prospectsPct: 7,
  customersPct: 25,
  averageSpend: 215,
  averageFrequency: 3,
  marginPct: 36,
  activityCostPct: 7,
  fixedCostPct: 25,

  // The labour-productivity sub-model's variable inputs (Calculations sheet)
  totalWages: 197456, // W26
  workers: 3, // W28
  weeksAnnualLeave: 4, // U30
  sickAndPublicHolidayDays: 22, // U32
  weeklyHours: 40, // U34
  hourlyChargeOutRate: 67.5, // U36
  productivityPct: 85 // U38 (whole number; sent as a fraction)
}

export default {
  name: 'EightLeversReport',

  components: { ReportHeader, StaleBanner, HeroStrip, HeroFigure },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      f: Object.assign({}, DEFAULTS),
      data: null,
      // `error` (stale flag) is provided by the reportRecompute mixin.

      // The lever chain. Market size is NOT here — it is a typed field (owner's call,
      // 2026-07-13): it is a researched fact about the client's market, not something to
      // explore by feel, and sizing it correctly is what makes the scenarios comparable.
      funnelFields: [
        { k: 'footTrafficPct', min: 1, max: 90, step: 1, fmt: 'pct' },
        { k: 'prospectsPct', min: 1, max: 90, step: 1, fmt: 'pct' },
        { k: 'customersPct', min: 1, max: 90, step: 1, fmt: 'pct' }
      ],
      valueFields: [
        { k: 'averageSpend', min: 20, max: 800, step: 5, fmt: 'money' },
        { k: 'averageFrequency', min: 1, max: 12, step: 0.25, fmt: 'x' },
        { k: 'marginPct', min: 5, max: 90, step: 1, fmt: 'pct' },
        { k: 'activityCostPct', min: 0, max: 30, step: 1, fmt: 'pct' },
        { k: 'fixedCostPct', min: 0, max: 60, step: 1, fmt: 'pct' }
      ],

      // The labour sub-model's variable inputs — the source has these as entry cells, so the
      // advisor can move them and watch the achieved margin diverge from the target.
      labourFields: [
        { k: 'totalWages', min: 0, max: 600000, step: 1000, fmt: 'money' },
        { k: 'workers', min: 1, max: 50, step: 1, fmt: 'num' },
        { k: 'hourlyChargeOutRate', min: 10, max: 300, step: 2.5, fmt: 'money2' },
        { k: 'weeklyHours', min: 10, max: 60, step: 1, fmt: 'hours' },
        { k: 'productivityPct', min: 10, max: 100, step: 1, fmt: 'pct' },
        { k: 'weeksAnnualLeave', min: 0, max: 12, step: 0.5, fmt: 'weeks' },
        { k: 'sickAndPublicHolidayDays', min: 0, max: 60, step: 1, fmt: 'days' }
      ]
    }
  },

  computed: {
    /** The `Broad Scenarios` block — the sliders drive its current column. */
    broad () {
      return this.data ? this.data.broadScenarios : null
    },

    /** The live column the advisor is steering. */
    current () {
      return this.broad ? this.broad.current : null
    },

    /** The lever chain, in the order the model walks it. */
    chain () {
      const c = this.current
      if (!c) { return [] }
      return [
        { k: 'market', v: this.round0(c.marketSize) },
        { k: 'footTraffic', v: this.round0(c.footTraffic) },
        { k: 'prospects', v: this.round0(c.prospects) },
        { k: 'customers', v: this.round0(c.customers) },
        { k: 'spend', v: this.money(c.averageSpend) },
        { k: 'frequency', v: this.round1(c.averageFrequency) + '×' },
        { k: 'revenue', v: this.money(c.revenue) }
      ]
    },

    /** Current vs Option B vs Option C — the source's own scenario comparison. */
    compareRows () {
      const b = this.broad
      if (!b) { return [] }
      const m = this.money
      const p = this.pct
      const r0 = this.round0
      return [
        { k: 'customers', cur: r0(b.current.customers), b: r0(b.optionB.customers), c: r0(b.optionC.customers) },
        { k: 'spend', cur: m(b.current.averageSpend), b: m(b.optionB.averageSpend), c: m(b.optionC.averageSpend) },
        { k: 'frequency', cur: this.round1(b.current.averageFrequency) + '×', b: this.round1(b.optionB.averageFrequency) + '×', c: this.round1(b.optionC.averageFrequency) + '×' },
        { k: 'revenue', cur: m(b.current.revenue), b: m(b.optionB.revenue), c: m(b.optionC.revenue) },
        { k: 'margin', cur: p(b.current.marginPct), b: p(b.optionB.marginPct), c: p(b.optionC.marginPct) },
        { k: 'expenses', cur: m(b.current.totalExpenses), b: m(b.optionB.totalExpenses), c: m(b.optionC.totalExpenses) }
      ]
    },

    /** The labour-productivity sub-model from the `Calculations` sheet. */
    labourStats () {
      if (!this.data) { return [] }
      const l = this.data.calculations.labour
      return [
        { k: 'chargeOut', v: this.money(l.hourlyChargeOutRate) },
        { k: 'payRate', v: '$' + Number(l.hourlyPayRate || 0).toFixed(2) },
        { k: 'targetMargin', v: this.pct(l.targetLabourMarginPct) },
        { k: 'actualMargin', v: this.pct(l.adjustedLabourMarginPct) },
        { k: 'weeksLost', v: this.round1(l.effectiveWeeksLost) },
        { k: 'labourRevenue', v: this.money(l.estimatedLabourRevenue) }
      ]
    },

    /**
     * The gap between the target labour margin and the one actually achieved — the whole
     * point of the labour block. Shown as its own figure so it can't be missed.
     */
    labourGapPct () {
      if (!this.data) { return 0 }
      const l = this.data.calculations.labour
      return l.targetLabourMarginPct - l.adjustedLabourMarginPct
    }
  },

  mounted () { this.recompute() },

  methods: {
    // money() + signedMoney() come from currencyMixin (firm currency + locale).
    pct (n) { return Math.round((n || 0) * 100) + '%' },
    round0 (n) { return Math.round(n || 0).toLocaleString('en-US') },
    round1 (n) { return (Math.round((n || 0) * 10) / 10).toFixed(1) },

    fmtField (fld) {
      const v = this.f[fld.k]
      if (fld.fmt === 'money') { return this.money(v) }
      if (fld.fmt === 'money2') { return this.money2(v) }
      if (fld.fmt === 'pct') { return v + '%' }
      if (fld.fmt === 'x') { return this.round1(v) + '×' }
      if (fld.fmt === 'hours') { return v + ' hrs' }
      if (fld.fmt === 'weeks') { return this.round1(v) + ' wks' }
      if (fld.fmt === 'days') { return v + ' days' }
      return this.round0(v)
    },

    fillPct (fld) { return ((this.f[fld.k] - fld.min) / (fld.max - fld.min) * 100) + '%' },

    /**
     * The inputs drive the Broad Scenarios current column AND the labour sub-model.
     * Percentages are held as whole numbers on screen and sent as fractions, matching the
     * source workbook's cells.
     */
    payload () {
      return {
        broad: {
          current: {
            marketSize: this.f.marketSize,
            footTrafficPct: this.f.footTrafficPct / 100,
            prospectsPct: this.f.prospectsPct / 100,
            customersPct: this.f.customersPct / 100,
            averageSpend: this.f.averageSpend,
            averageFrequency: this.f.averageFrequency,
            marginPct: this.f.marginPct / 100,
            activityCostPct: this.f.activityCostPct / 100,
            fixedCostPct: this.f.fixedCostPct / 100
          }
        },
        labour: {
          totalWages: this.f.totalWages,
          workers: this.f.workers,
          weeksAnnualLeave: this.f.weeksAnnualLeave,
          sickAndPublicHolidayDays: this.f.sickAndPublicHolidayDays,
          weeklyHours: this.f.weeklyHours,
          hourlyChargeOutRate: this.f.hourlyChargeOutRate,
          productivityPct: this.f.productivityPct / 100
        }
      }
    },

    /** Backend request — consumed by the reportRecompute mixin (debounce + race guard). */
    recomputeRequest () {
      return { url: '/api/report/eight-levers', body: this.payload() }
    },
    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    },
    /**
     * Failure feedback — the mixin calls this on a failed recompute; it also sets the
     * `error` flag so the stale banner shows. Failure must be VISIBLE and RETRYABLE.
     */
    onRecomputeError () {
      this.$buefy.toast.open({ message: this.$t('report.calcUnreachable'), type: 'is-danger' })
    },

    reset () {
      this.f = Object.assign({}, DEFAULTS)
      this.recompute()
      this.$buefy.toast.open({ message: this.$t('report.resetDone'), type: 'is-info' })
    }
  }
}
</script>

<style scoped>
.lev-root {
  /* Colours flow from the shared ReportShell tokens (single source): --lev-* is a thin
     alias layer, no colour declared here. Frame removed (ReportShell owns it); dark-mode
     block removed per the all-light ruling (2026-07-27). Width now matches Lease vs Buy —
     Eight Levers narrows most, its own cap having been 1180px. */
  --lev-bg:var(--rs-bg); --lev-panel:var(--rs-panel); --lev-panel-2:var(--rs-panel-2); --lev-ink:var(--rs-ink); --lev-muted:var(--rs-muted); --lev-line:var(--rs-line);
  --lev-accent:var(--rs-accent); --lev-accent-bright:var(--rs-accent-bright); --lev-good:var(--rs-good); --lev-warn:var(--rs-warn); --lev-crit:var(--rs-crit);
  --lev-shadow:var(--rs-shadow); --lev-r:var(--rs-radius);
  color:var(--lev-ink);
}

/* Width + centring now come from the ReportShell wrap; column width (320px), gap (18px)
   and the 900px collapse are left for the Step 3 standardisation (360px / 20px / 860px). */
.lev-layout { display:grid; grid-template-columns:var(--rs-col-input) 1fr; gap:var(--rs-col-gap); align-items:start; }
@media (max-width: 860px) { .lev-layout { grid-template-columns:1fr; } }

.lev-card {
  background:var(--lev-panel); border:1px solid var(--lev-line); border-radius:var(--lev-r);
  box-shadow:var(--lev-shadow); padding:18px 16px;
}
.lev-instruct { font-size:12.5px; color:var(--lev-muted); line-height:1.55; margin-bottom:16px; }
.lev-group { margin-bottom:18px; }

/* The labour inputs feed the labour sub-model, NOT the eight profit levers above — so they
   are set apart: a clear gap, a tinted panel and a rule, so nobody reads them as a ninth lever. */
.lev-labourblock {
  margin-top:26px; padding:14px 13px 4px;
  background:var(--lev-panel-2); border:1px solid var(--lev-line);
  border-top:2px solid var(--lev-accent-bright); border-radius:12px;
}
.lev-labourblock .lev-dot { background:var(--lev-muted); }
.lev-glabel { display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; }
.lev-lft { display:flex; align-items:center; gap:7px; }
.lev-dot { width:7px; height:7px; border-radius:50%; background:var(--lev-accent-bright); }
.lev-h2 { margin:0; font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--lev-muted); }

.lev-field { margin-bottom:12px; }
.lev-frow { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; }
.lev-frow label { font-size:12.5px; color:var(--lev-ink); }
.lev-frow output { font-size:12.5px; font-weight:600; color:var(--lev-accent); }
.lev-field input[type="range"] {
  width:100%; height:5px; border-radius:999px; appearance:none; outline:none; cursor:pointer;
  background:linear-gradient(90deg, var(--lev-accent) var(--fill, 50%), var(--lev-line) var(--fill, 50%));
}
.lev-field input[type="range"]::-webkit-slider-thumb {
  appearance:none; width:15px; height:15px; border-radius:50%;
  background:var(--lev-accent); border:2px solid #fff; box-shadow:0 1px 4px #002b6440;
}
/* Market size is typed, not dragged — it's a researched fact about the client's market. */
.lev-entry { margin-bottom:4px; }
.lev-elabel { display:block; font-size:12.5px; color:var(--lev-ink); margin-bottom:5px; }
.lev-entry >>> input {
  width:100%; font:inherit; font-size:14px; font-weight:600; color:var(--lev-ink);
  background:var(--lev-panel-2); border:1px solid var(--lev-line);
  border-radius:9px; padding:9px 12px; box-shadow:none; height:auto;
}
.lev-entry >>> input:focus { border-color:var(--lev-accent); box-shadow:0 0 0 3px var(--rs-accent-soft); }
.lev-ehint { font-size:11.5px; color:var(--lev-muted); line-height:1.5; margin-top:6px; }

.lev-actions { margin-top:6px; }
.lev-btn { width:100%; }

.lev-stat, .lev-lstat {
  background:var(--lev-panel); border:1px solid var(--lev-line); border-radius:var(--lev-r);
  box-shadow:var(--lev-shadow); padding:14px 16px;
}
.lev-slabel { font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; font-weight:600; color:var(--lev-muted); margin-bottom:4px; }
.lev-sval { font-size:20px; font-weight:600; letter-spacing:-.01em; }
.lev-sval.ok { color:var(--lev-good); }
.lev-sval.bad { color:var(--lev-crit); }

.lev-panel {
  background:var(--lev-panel); border:1px solid var(--lev-line); border-radius:var(--lev-r);
  box-shadow:var(--lev-shadow); padding:18px 20px; margin-bottom:16px;
}
.lev-ph { margin:0 0 3px; font-size:16px; font-weight:600; letter-spacing:-.01em; }
.lev-pnote { margin:0 0 14px; font-size:12.5px; color:var(--lev-muted); line-height:1.55; }

.lev-chain { display:flex; flex-wrap:wrap; gap:8px; }
.lev-step {
  flex:1 1 120px; background:var(--lev-panel-2); border:1px solid var(--lev-line);
  border-radius:10px; padding:10px 12px;
}
.lev-sk { font-size:10px; letter-spacing:.06em; text-transform:uppercase; font-weight:600; color:var(--lev-muted); margin-bottom:3px; }
.lev-sv { font-size:15px; font-weight:600; }

.lev-tablewrap { overflow-x:auto; }
.lev-table { width:100%; border-collapse:collapse; font-size:13px; }
.lev-table th, .lev-table td { padding:8px 10px; border-bottom:1px solid var(--lev-line); text-align:left; }
.lev-table th { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--lev-muted); font-weight:600; }
.lev-table .num { text-align:right; font-variant-numeric:tabular-nums; }
.lev-table td.ok { color:var(--lev-good); font-weight:600; }
.lev-table td.bad { color:var(--lev-crit); font-weight:600; }
.lev-trprofit td { background:var(--lev-panel-2); font-weight:600; }

.lev-labour { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; }
/* The target-vs-achieved gap is the insight the block exists for — give it prominence. */
.lev-gap { border-color:var(--lev-accent); background:var(--lev-panel-2); }
.lev-error { border-color:var(--lev-crit); }
.lev-error .lev-ph { color:var(--lev-crit); }

/* Stale-figures banner: the calc failed but earlier numbers are still on screen. They must be
   visibly untrustworthy — stale figures presented as live are worse than no figures at all. */
/* The banner itself is components/base/StaleBanner.vue (Phase 3); this screen maps the
   shared StaleBanner properties onto its --lev-* aliases, which resolve to ReportShell. */
.lev-root { --sb-crit:var(--lev-crit); --sb-muted:var(--lev-muted); --sb-radius:var(--lev-r); --sb-gap:14px; }
.is-stale { opacity:.45; filter:grayscale(0.6); }
/* (dark-mode block removed 2026-07-27 — all-light ruling; colours come from ReportShell.) */
</style>

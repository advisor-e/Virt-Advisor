<template lang="pug">
.bpr-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.workingCapital.title')"
    :client="$t('report.preparedFor')"
    :badge="$t('report.illustrative')"
  )

  .bpr-layout
    //- INPUTS
    aside.bpr-card
      .bpr-group(v-for="g in groups" :key="g.k")
        .bpr-glabel
          span.bpr-dot
          h2.bpr-h2 {{ $t('report.workingCapital.group.' + g.k + '') }}
        slider-field(
          v-for="fld in g.fields"
          :key="fld.key"
          :label="$t('report.workingCapital.field.' + fld.key + '')"
          :display="fmtField(fld, inputs[fld.key])"
          :value="inputs[fld.key]"
          :min="fld.min"
          :max="fld.max"
          :step="fld.step"
          @input="v => setField(fld.key, v)"
        )

    //- RESULTS
    section.bpr-results(v-if="out")
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
        hero-figure(
          :label="$t('report.workingCapital.hero.cycle')"
          :value="round0(out.cycleDays)"
          :unit="$t('report.workingCapital.hero.cycleUnit')"
          :sub="$t('report.workingCapital.hero.cycleSub')"
        )
        hero-figure(
          :label="$t('report.workingCapital.hero.factor')"
          :value="round1(out.cycleFactorMonthly) + '×'"
          :sub="round0(out.cycleFactorAnnual) + '× ' + $t('report.workingCapital.hero.factorSub')"
        )
        hero-figure(
          :label="$t('report.workingCapital.hero.revenue')"
          :value="money(out.annualRevenue)"
          :sub="$t('report.workingCapital.hero.revenueSubFrom') + ' ' + money(out.workingCapital) + ' ' + $t('report.workingCapital.hero.revenueSubCapital')"
        )
        hero-figure(:label="$t('report.workingCapital.hero.netProfit')" :value="money(out.netProfitMonthly)")
          template(#sub)
            span.bpr-pill(:class="cashflowClass")
              span.bpr-pill-dot
              | {{ cashflowText }}
      .bpr-tiles
        .bpr-tile
          .bpr-k {{ $t('report.workingCapital.tile.vsStart') }}
          .bpr-v.num {{ diffText }}
          .bpr-sub.num {{ diffPctText }} · {{ $t('report.workingCapital.tile.annualRevenue') }}

      //- CASH WHEEL
      .bpr-card.bpr-wheelcard
        .bpr-wheelhead
          h2.bpr-h2 {{ $t('report.workingCapital.wheel.title') }}
          .bpr-cycsum {{ $t('report.workingCapital.wheel.sumTurns') }} #[b {{ round1(out.cycleFactorMonthly) }}×] {{ $t('report.workingCapital.wheel.sumAMonth') }} #[b {{ round0(out.cycleDays) }} {{ $t('report.workingCapital.coach.days') }}] {{ $t('report.workingCapital.wheel.sumPerTurn') }} #[b {{ inputs.daysPayable }}d] {{ $t('report.workingCapital.wheel.sumToPay') }}
        svg.bpr-wheel(viewBox="0 0 500 360" role="img" :aria-label="$t('report.workingCapital.wheel.aria')")
          defs
            marker#bprAh(viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse")
              path(d="M0 0 L10 5 L0 10 z" fill="#0070c0")
          line(x1="150" y1="40" x2="150" y2="320" stroke="var(--bpr-line)" stroke-width="1.5" stroke-dasharray="4 5")
          rect(x="16" y="150" width="116" height="70" rx="11" fill="var(--bpr-panel-2)" stroke="var(--bpr-line)")
          text(x="74" y="178" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--bpr-ink)") {{ $t('report.workingCapital.wheel.fixedCosts') }}
          text.num(x="74" y="200" text-anchor="middle" font-size="15" font-weight="600" fill="var(--bpr-ink)") {{ money(inputs.fixedCostsMonthly) }}/mo
          text(x="74" y="246" text-anchor="middle" font-size="10.5" fill="var(--bpr-muted)") {{ $t('report.workingCapital.wheel.outside1') }}
          text(x="74" y="260" text-anchor="middle" font-size="10.5" fill="var(--bpr-muted)") {{ $t('report.workingCapital.wheel.outside2') }}
          g(fill="none" stroke="#0070c0" stroke-width="6" stroke-linecap="round" marker-end="url(#bprAh)")
            path(d="M388.3 86.7 A110 110 0 0 1 423.3 121.7")
            path(d="M423.3 238.3 A110 110 0 0 1 388.3 273.3")
            path(d="M271.7 273.3 A110 110 0 0 1 236.7 238.3")
            path(d="M236.7 121.7 A110 110 0 0 1 271.7 86.7")
          circle(cx="330" cy="180" r="60" fill="#3a3a3a")
          text(x="330" y="171" text-anchor="middle" font-size="9" font-weight="600" letter-spacing="0.5" fill="#ffffff" opacity="0.92") {{ $t('report.workingCapital.wheel.moneyInMovement') }}
          text.num(x="330" y="192" text-anchor="middle" font-size="20" font-weight="600" fill="#ffffff") {{ money(out.workingCapital) }}
          text(x="330" y="207" text-anchor="middle" font-size="9.5" fill="#ffffff" opacity="0.85") {{ $t('report.workingCapital.wheel.workingCapital') }}
          g
            circle(cx="330" cy="70" r="38" fill="#002b64")
            text(x="330" y="68" text-anchor="middle" font-size="13" font-weight="600" fill="#fff") {{ $t('report.workingCapital.wheel.cash') }}
            text.num(x="330" y="84" text-anchor="middle" font-size="10.5" fill="#fff" opacity="0.9") {{ money(out.workingCapital) }}
          g
            circle(cx="440" cy="180" r="38" fill="#0070c0")
            text(x="440" y="178" text-anchor="middle" font-size="13" font-weight="600" fill="#fff") {{ $t('report.workingCapital.wheel.stock') }}
            text.num(x="440" y="194" text-anchor="middle" font-size="10.5" fill="#fff" opacity="0.92") {{ inputs.daysDeliverable + inputs.daysOnHand }}d
          g
            circle(cx="330" cy="290" r="38" fill="#4ca52d")
            text(x="330" y="288" text-anchor="middle" font-size="13" font-weight="600" fill="#fff") {{ $t('report.workingCapital.wheel.sale') }}
            text.num(x="330" y="304" text-anchor="middle" font-size="10.5" fill="#fff" opacity="0.85") {{ round0(out.totalUnits) }} u
          g
            circle(cx="220" cy="180" r="38" fill="#ff9900")
            text(x="220" y="178" text-anchor="middle" font-size="13" font-weight="600" fill="#002b64") {{ $t('report.workingCapital.wheel.debtors') }}
            text.num(x="220" y="194" text-anchor="middle" font-size="10.5" fill="#002b64" opacity="0.85") {{ inputs.daysReceivable }}d
          circle.bpr-coin(r="7" :style="{ '--spin': spinDur }")

      //- COACH
      .bpr-edu
        .bpr-edu-h
          span.bpr-lead {{ $t('report.workingCapital.coach.lead') }}
          | {{ $t('report.workingCapital.coach.title') }}
        p.bpr-edu-p
          | {{ $t('report.workingCapital.coach.body1') }} #[strong {{ money(out.workingCapital) }}] {{ $t('report.workingCapital.coach.body2') }} #[strong {{ round0(out.cycleDays) }} {{ $t('report.workingCapital.coach.days') }}], {{ $t('report.workingCapital.coach.body3') }} #[strong {{ round1(out.cycleFactorMonthly) }}×] {{ $t('report.workingCapital.coach.body4') }} #[em {{ $t('report.workingCapital.coach.outside') }}] {{ $t('report.workingCapital.coach.body5') }}
        p.bpr-edu-p(v-if="fasterHint")
          | {{ $t('report.workingCapital.coach.faster1') }} #[strong {{ fasterHint.days }} {{ $t('report.workingCapital.coach.days') }}], {{ $t('report.workingCapital.coach.faster2') }} #[strong {{ fasterHint.factor }}×] {{ $t('report.workingCapital.coach.faster3') }} #[strong {{ fasterHint.extra }}] {{ $t('report.workingCapital.coach.faster4') }}

      .bpr-actions
        button.bpr-cta(@click="downloadPdf") {{ $t('report.workingCapital.actions.pdf') }}
        button.bpr-cta.bpr-ghost(@click="reset") {{ $t('report.workingCapital.actions.reset') }}
        button.bpr-cta.bpr-ghost(@click="setStartingPoint") {{ $t('report.workingCapital.actions.setStart') }}
        button.bpr-cta.bpr-ghost(@click="askCoach") {{ $t('report.workingCapital.actions.coach') }}
        span.bpr-foot {{ $t('report.workingCapital.actions.foot') }}

    section.bpr-results(v-else)
      b-loading(:is-full-page="false" :active="true")
</template>

<script>
/**
 * BusinessPerformanceReport — Working Capital Cycle (first model).
 *
 * Interactive, educational modelling screen. Inputs are edited live; the model is
 * recomputed on the Restify backend (POST /api/report/working-capital-cycle) — calc is
 * backend-only per the Stack Constitution. Reproduces the source Excel model exactly
 * (see server/report/workingCapitalCycleModel.js + its golden test).
 *
 * i18n: user-facing strings are English placeholders for this first slice; they move into
 * a `report.*` locale namespace in a follow-up (see design/ACTIONS.md). Coach text is
 * templated (not AI) for the first build, per owner decision.
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import SliderField from '~/components/base/SliderField'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

const DEFAULTS = {
  initialInvestment: 200,
  plantEquipmentPct: 0.4,
  unitCost: 1,
  markupPct: 1.5,
  discountPct: 0.15,
  fullPricePct: 1,
  daysDeliverable: 4,
  daysOnHand: 6,
  daysReceivable: 35,
  daysPayable: 15,
  fixedCostsMonthly: 180,
  priorScenarioAnnualRevenue: 2543
}

export default {
  name: 'BusinessPerformanceReport',

  components: { ReportHeader, StaleBanner, HeroStrip, HeroFigure, SliderField },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      inputs: Object.assign({}, DEFAULTS),
      out: null,
      groups: [
        {
 k: 'setup',
fields: [
          { key: 'initialInvestment', min: 50, max: 1000, step: 10, fmt: 'money' },
          { key: 'plantEquipmentPct', min: 0, max: 0.8, step: 0.05, fmt: 'pct' }
        ]
},
        {
 k: 'pricing',
fields: [
          { key: 'unitCost', min: 0.5, max: 5, step: 0.25, fmt: 'money2' },
          { key: 'markupPct', min: 0.2, max: 3, step: 0.1, fmt: 'pct' },
          { key: 'discountPct', min: 0, max: 0.5, step: 0.05, fmt: 'pct' },
          { key: 'fullPricePct', min: 0, max: 1, step: 0.05, fmt: 'pct' }
        ]
},
        {
 k: 'cycle',
fields: [
          { key: 'daysDeliverable', min: 0, max: 30, step: 1, fmt: 'int' },
          { key: 'daysOnHand', min: 0, max: 60, step: 1, fmt: 'int' },
          { key: 'daysReceivable', min: 0, max: 90, step: 1, fmt: 'int' },
          { key: 'daysPayable', min: 0, max: 90, step: 1, fmt: 'int' }
        ]
},
        {
 k: 'fixed',
fields: [
          { key: 'fixedCostsMonthly', min: 0, max: 500, step: 10, fmt: 'money' },
          { key: 'priorScenarioAnnualRevenue', min: 500, max: 6000, step: 1, fmt: 'money' }
        ]
}
      ]
    }
  },

  computed: {
    /**
     * The cash-flow pill's text.
     *
     * The backend returns this as English display text ('Cashflow Positive' /
     * 'Cashflow Negative' — `workingCapitalCycleModel.js`, cell J3), so it is the one
     * user-facing string on this screen that cannot be fixed by moving it into
     * `locales/`. Mapped here so the pill translates like everything else; an
     * unrecognised value falls through unchanged rather than blanking the pill.
     *
     * Proper fix is for the model to return a CODE and the screen to name it — logged
     * in design/ACTIONS.md rather than changed here, because it is a backend contract.
     * @returns {string}
     */
    cashflowText () {
      const raw = this.out && this.out.cashflowStatus
      if (raw === 'Cashflow Positive') { return this.$t('report.workingCapital.status.positive') }
      if (raw === 'Cashflow Negative') { return this.$t('report.workingCapital.status.negative') }
      return raw || ''
    },
    cashflowClass () {
      return (this.out && this.out.netProfitMonthly < 0) ? 'is-crit' : 'is-good'
    },
    spinDur () {
      const f = this.out ? this.out.cycleFactorMonthly : 1
      return Math.max(1.4, 6 / Math.max(f, 0.1)).toFixed(2) + 's'
    },
    fasterHint () {
      if (!this.out || this.out.cycleDays <= 0) { return null }
      const trimmed = Math.max(1, this.out.cycleDays - 10)
      const factor = 30 / trimmed
      const perTurn = this.out.cycleFactorMonthly ? (this.out.monthlyCashSales / this.out.cycleFactorMonthly) : 0
      const extra = (perTurn * factor * 12) - this.out.annualRevenue
      return { days: Math.round(trimmed), factor: (Math.round(factor * 10) / 10).toFixed(1), extra: this.money(extra) }
    },
    diffText () {
      const v = this.out ? this.out.differenceVsScenario : 0
      return (v >= 0 ? '+' : '−') + this.money(Math.abs(v))
    },
    diffPctText () {
      const p = this.out ? this.out.differencePct : 0
      return (p >= 0 ? '+' : '−') + Math.abs(p * 100).toFixed(1) + '%'
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    // money() comes from currencyMixin (firm currency + locale).
    round0 (n) { return Math.round(n || 0) },
    round1 (n) { return (Math.round((n || 0) * 10) / 10).toFixed(1) },
    fmtField (f, v) {
      if (f.fmt === 'money') { return this.money(v) }
      if (f.fmt === 'money2') { return this.money2(v) }
      if (f.fmt === 'pct') { return Math.round(v * 100) + '%' }
      return v
    },
    /**
     * A slider moved: store the new value and queue a recompute. SliderField reports
     * its value as an event, so the write and the recompute happen in one place.
     * @param {string} key - the field key in `inputs` @param {number} v
     */
    setField (key, v) {
      this.inputs[key] = v
      this.queueRecompute()
    },
    reset () {
      this.inputs = Object.assign({}, DEFAULTS)
      this.recompute()
      this.$buefy.toast.open({ message: this.$t('report.workingCapital.toast.reset'), type: 'is-info' })
    },
    setStartingPoint () {
      if (!this.out) { return }
      this.inputs.priorScenarioAnnualRevenue = Math.round(this.out.annualRevenue)
      this.recompute()
      this.$buefy.toast.open({ message: this.$t('report.workingCapital.toast.startSet', { amount: this.money(this.inputs.priorScenarioAnnualRevenue) }), type: 'is-success' })
    },
    /** Backend request — consumed by the reportRecompute mixin (debounce + race guard). */
    recomputeRequest () {
      return { url: '/api/report/working-capital-cycle', body: this.inputs }
    },
    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.out = data
    },
    downloadPdf () {
      // Browser print-to-PDF — nothing leaves the app; the print stylesheet drops the
      // controls and lays out a clean, branded report.
      if (typeof window !== 'undefined') { window.print() }
    },
    askCoach () {
      this.$buefy.toast.open({ message: this.$t('report.workingCapital.toast.coachSoon'), type: 'is-info' })
    }
  }
}
</script>

<style scoped>
.bpr-root {
  --bpr-bg:#eef3f8; --bpr-panel:#ffffff; --bpr-panel-2:#f1f6fb; --bpr-ink:#002b64; --bpr-muted:#5b6f8a; --bpr-line:#d5e1ee;
  --bpr-accent:#0070c0; --bpr-accent-bright:#00b1e0; --bpr-accent-soft:#0070c018; --bpr-accent-ink:#002b64; --bpr-accent-contrast:#ffffff;
  --bpr-good:#4ca52d; --bpr-good-soft:#4ca52d1a; --bpr-crit:#ff0000; --bpr-crit-soft:#ff00000f; --bpr-warn:#ff9900; --bpr-warn-soft:#ff99001a;
  --bpr-shadow:0 1px 2px #002b6412, 0 8px 24px -12px #002b6426; --bpr-r:14px;
  background:var(--bpr-bg); color:var(--bpr-ink);
  font-family:'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight:300; -webkit-font-smoothing:antialiased;
  padding:28px 22px 64px; min-height:100vh;
}
@media (prefers-color-scheme: dark) {
  .bpr-root {
    --bpr-bg:#05132a; --bpr-panel:#0a1f3d; --bpr-panel-2:#07182f; --bpr-ink:#e6f0fa; --bpr-muted:#9fb4d0; --bpr-line:#1a3559;
    --bpr-accent:#00b1e0; --bpr-accent-bright:#7fd3f1; --bpr-accent-soft:#00b1e022; --bpr-accent-ink:#7fd3f1; --bpr-accent-contrast:#002b64;
    --bpr-good-soft:#4ca52d26; --bpr-crit-soft:#ff00001f; --bpr-warn-soft:#ff990022;
    --bpr-shadow:0 1px 2px #0007, 0 10px 30px -14px #000a;
  }
}
.bpr-root strong, .bpr-root b { font-weight:600; }
.num { font-variant-numeric: tabular-nums; }

.bpr-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; max-width:1120px; margin:0 auto; }
@media (max-width:860px) { .bpr-layout { grid-template-columns:1fr; } }

.bpr-card { background:var(--bpr-panel); border:1px solid var(--bpr-line); border-radius:var(--bpr-r); box-shadow:var(--bpr-shadow); }
.bpr-h2 { margin:0; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--bpr-muted); font-weight:600; }
.bpr-group { padding:15px 16px; border-bottom:1px solid var(--bpr-line); }
.bpr-group:last-child { border-bottom:0; }
.bpr-glabel { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.bpr-dot { width:7px; height:7px; border-radius:50%; background:var(--bpr-accent-bright); }
/* Sliders now live in components/base/SliderField. It reads these generic tokens, so
   this screen keeps its own palette — including the dark-mode overrides above. */
.bpr-root {
  --sl-accent:var(--bpr-accent); --sl-line:var(--bpr-line); --sl-panel:var(--bpr-panel);
  --sl-ink:var(--bpr-ink); --sl-accent-soft:var(--bpr-accent-soft);
}

.bpr-results { display:flex; flex-direction:column; gap:20px; min-height:200px; }
.bpr-tiles { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
@media (max-width:560px) { .bpr-tiles { grid-template-columns:1fr; } }
.bpr-tile { background:var(--bpr-panel); border:1px solid var(--bpr-line); border-radius:var(--bpr-r); padding:16px 17px; box-shadow:var(--bpr-shadow); overflow:hidden; }
.bpr-hero { grid-column:1 / -1; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.bpr-hero-right { text-align:right; }
.bpr-k { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--bpr-muted); font-weight:600; }
.bpr-v { font-size:30px; font-weight:600; letter-spacing:-.01em; margin-top:6px; line-height:1; }
.bpr-hero .bpr-v { font-size:46px; }
.bpr-unit { font-size:.5em; font-weight:300; color:var(--bpr-muted); }
.bpr-accent { color:var(--bpr-accent-ink); }
.bpr-sub { font-size:12.5px; color:var(--bpr-muted); margin-top:6px; }
.bpr-pill { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; padding:5px 11px; border-radius:999px; }
.bpr-pill.is-good { color:var(--bpr-good); background:var(--bpr-good-soft); }
.bpr-pill.is-crit { color:var(--bpr-crit); background:var(--bpr-crit-soft); }
.bpr-pill-dot { width:7px; height:7px; border-radius:50%; background:currentColor; }

.bpr-wheelcard { padding:18px; }
.bpr-wheelhead { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.bpr-cycsum { font-size:13px; color:var(--bpr-muted); }
.bpr-cycsum b { color:var(--bpr-ink); }
.bpr-wheel { display:block; width:100%; height:auto; max-width:560px; margin:6px auto 0; }
.bpr-coin { fill:var(--bpr-crit); stroke:#fff; stroke-width:1.5;
  offset-path:path("M330 70 A110 110 0 1 1 329.99 70"); animation:bprOrbit var(--spin,4s) linear infinite; }
@keyframes bprOrbit { to { offset-distance:100%; } }
@media (prefers-reduced-motion: reduce) { .bpr-coin { animation:none; } }

.bpr-edu { border-left:3px solid var(--bpr-accent-bright); background:var(--bpr-accent-soft); border-radius:0 9px 9px 0; padding:15px 17px; }
.bpr-edu-h { display:flex; align-items:center; gap:9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:var(--bpr-accent); margin-bottom:8px; }
.bpr-edu-p { margin:0 0 8px; font-size:14px; line-height:1.6; }
.bpr-edu-p:last-child { margin-bottom:0; }
.bpr-lead { background:var(--bpr-accent); color:var(--bpr-accent-contrast); font-size:10px; font-weight:600; letter-spacing:.08em; padding:3px 7px; border-radius:5px; }

.bpr-actions { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.bpr-cta { font:inherit; font-weight:600; font-size:13.5px; color:var(--bpr-accent-contrast); background:var(--bpr-accent); border:0; padding:11px 18px; border-radius:10px; cursor:pointer; }
.bpr-cta:hover { filter:brightness(1.06); }
.bpr-ghost { background:transparent; color:var(--bpr-ink); border:1px solid var(--bpr-line); }
.bpr-foot { font-size:12px; color:var(--bpr-muted); }

@media print {
  .bpr-root { padding:0; background:#fff; min-height:auto; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  aside.bpr-card, .bpr-actions { display:none !important; }
  .bpr-layout { display:block; max-width:none; }
  .bpr-results { max-width:none; }
  .bpr-tile, .bpr-card, .bpr-edu { break-inside:avoid; box-shadow:none; }
  .bpr-coin { animation:none; }
}
/* pop */
.bpr-v{color:var(--bpr-accent)}
.bpr-h2{color:var(--bpr-ink)}
/* pop2 */
.bpr-v{color:#0070c0}
.bpr-tile{border-top:3px solid #00b1e0}
.bpr-hero{background:#002b64;border-color:#0070c0}
.bpr-hero .bpr-v,.bpr-hero .bpr-k,.bpr-hero .bpr-sub,.bpr-hero .bpr-unit{color:#ffffff}
/* The headline banner now lives in components/base/HeroStrip + HeroFigure.
   The status pill is passed in through HeroFigure's `sub` slot, so it is still
   styled here — `.herostrip` is HeroStrip's root, which the slot renders inside. */
.herostrip .bpr-pill{background:#ffffff26}
</style>

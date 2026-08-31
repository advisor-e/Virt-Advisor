<template lang="pug">
.vol-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.volatility.title')"
    :client="$t('report.preparedFor')"
  )
  //- Report class: no "Illustrative" badge — these become the client's real figures.
  //- Seeded with the workbook sample until the advisor types their own.
  sample-notice(v-if="isSample" :text="$t('report.sampleFigures')")

  //- Full-width headline band (owner ruling 2026-07-27): a direct child of the root,
  //- above the two-column layout — never inside the results column.
  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )

    hero-strip(:columns="4" :stale="!!error")
      //- The dial's score is the one toned figure: its colour is the workbook's own
      //- green/orange/red, measured from its gauge images, not a judgement made here.
      hero-figure(
        :label="$t('report.volatility.hero.swing')"
        :value="num(data.score, 2)"
        :tone="data.scoreBand"
        :sub="$t('report.volatility.band.' + data.scoreBand)"
      )
      hero-figure(
        :label="$t('report.volatility.hero.average')"
        :value="money(data.average)"
        :sub="$t('report.volatility.hero.averageSub', { total: money(data.total), months: data.monthsUsed })"
      )
      hero-figure(
        :label="$t('report.volatility.hero.range')"
        :value="rangeText"
        :sub="$t('report.volatility.hero.rangeSub')"
      )
      hero-figure(
        :label="$t('report.volatility.hero.inRange')"
        :value="$t('report.volatility.hero.inRangeValue', { n: data.insideFirstBand, of: data.monthsUsed })"
        :sub="$t('report.volatility.hero.inRangeSub', { pct: num(data.insideFirstBandPct, 0) })"
      )

  .vol-layout
    //- [D1] inputs — typed entry. The by-month accounts upload is a later change
    //- (Mike, 2026-08-31: "typed now, upload next"); the existing intake reads annual
    //- figures only and deliberately refuses a by-month export.
    aside.vol-card
      .vol-group
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.window.title') }}
        label.vol-fieldlab(:for="'vol-window'") {{ $t('report.volatility.window.label') }}
        .vol-seg(role="group" :aria-label="$t('report.volatility.window.label')")
          button.vol-segbtn(
            v-for="w in windows" :key="w"
            type="button"
            :class="{ 'is-on': form.window === w }"
            :aria-pressed="String(form.window === w)"
            @click="setWindow(w)"
          ) {{ w }}
        p.vol-note {{ $t('report.volatility.window.help') }}

      .vol-group
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.entry.title') }}
        p.vol-note {{ $t('report.volatility.entry.help') }}
        .vol-months
          .vol-month(v-for="(v, i) in form.sales" :key="i")
            label(:for="'vol-m' + i") {{ i + 1 }}
            input(
              :id="'vol-m' + i"
              type="number"
              inputmode="decimal"
              :value="v"
              :aria-label="$t('report.volatility.entry.monthLabel', { n: i + 1 })"
              @input="setMonth(i, $event.target.value)"
            )
        button.vol-cta.vol-ghost(type="button" @click="resetToSample") {{ $t('report.reset') }}

      .vol-group(v-if="data")
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.bands.title') }}
        table.vol-table
          thead
            tr
              th {{ $t('report.volatility.bands.band') }}
              th {{ $t('report.volatility.bands.lower') }}
              th {{ $t('report.volatility.bands.upper') }}
          tbody
            tr(v-for="b in reversedBands" :key="b.k")
              td {{ $t('report.volatility.bands.nth' + b.k) }}
              td {{ money(b.lower) }}
              td {{ money(b.upper) }}
        p.vol-note(v-if="flooredBand") {{ $t('report.volatility.bands.floored', { value: money(flooredBand.lowerUnfloored) }) }}

    //- [D2] results
    main.vol-results(v-if="data")
      //- [D2a] tiles
      .vol-tiles
        .vol-tile
          .vol-k {{ $t('report.volatility.tile.total') }}
          .vol-v {{ money(data.total) }}
          .vol-sub {{ $t('report.volatility.tile.totalSub', { months: data.monthsUsed }) }}
        .vol-tile
          .vol-k {{ $t('report.volatility.tile.outside') }}
          .vol-v {{ $t('report.volatility.hero.inRangeValue', { n: outsideCount, of: data.monthsUsed }) }}
          .vol-sub {{ $t('report.volatility.tile.outsideSub') }}
        .vol-tile(v-if="data.highest")
          .vol-k {{ $t('report.volatility.tile.highest') }}
          .vol-v {{ money(data.highest.value) }}
          .vol-sub {{ $t('report.volatility.tile.month', { n: data.highest.index + 1 }) }} · {{ signedMoney(data.months[data.highest.index].deviation) }}
        .vol-tile(v-if="data.lowest")
          .vol-k {{ $t('report.volatility.tile.lowest') }}
          .vol-v {{ money(data.lowest.value) }}
          .vol-sub {{ $t('report.volatility.tile.month', { n: data.lowest.index + 1 }) }} · {{ signedMoney(data.months[data.lowest.index].deviation) }}

      //- [D2b] the signature diagram — the workbook's rev counter
      .vol-card
        .vol-group
          .vol-glabel
            span.vol-dot
            h2.vol-h2 {{ $t('report.volatility.dial.title') }}
          .vol-gauge
            svg(viewBox="0 0 220 210" width="220" height="210" role="img" :aria-label="$t('report.volatility.dial.alt', { score: num(data.score, 2) })")
              path(d="M 59.09 160.91 A 72 72 0 0 1 110 38" fill="none" stroke="#4ca52d" stroke-width="18")
              path(d="M 110 38 A 72 72 0 0 1 176.52 82.45" fill="none" stroke="#ff9900" stroke-width="18")
              path(d="M 176.52 82.45 A 72 72 0 0 1 160.91 160.91" fill="none" stroke="#ff0000" stroke-width="18")
              line(x1="110" y1="29" x2="110" y2="47" stroke="#002b64" stroke-width="2")
              line(x1="184.8" y1="78.1" x2="168.3" y2="86.8" stroke="#002b64" stroke-width="2")
              line(x1="52.7" y1="167.3" x2="65.5" y2="154.5" stroke="#002b64" stroke-width="2")
              line(x1="167.3" y1="167.3" x2="154.5" y2="154.5" stroke="#002b64" stroke-width="2")
              text(x="47" y="181" font-size="10" fill="#5b6f8a" text-anchor="middle") 0
              text(x="110" y="24" font-size="10" fill="#5b6f8a" text-anchor="middle") 50
              text(x="196" y="74" font-size="10" fill="#5b6f8a" text-anchor="middle") 75
              text(x="173" y="181" font-size="10" fill="#5b6f8a" text-anchor="middle") 100
              line(:x1="needle.tailX" :y1="needle.tailY" :x2="needle.tipX" :y2="needle.tipY" stroke="#002b64" stroke-width="3.5" stroke-linecap="round")
              circle(cx="110" cy="110" r="8" fill="#002b64")
              circle(cx="110" cy="110" r="3.5" fill="#ffffff")
              text.vol-gauge-v(x="110" y="200" text-anchor="middle") {{ num(data.score, 2) }}
            .vol-gaugekey
              p.vol-edu-p {{ $t('report.volatility.dial.explain') }}
              .vol-keyrow
                span.vol-sw(style="background:#4ca52d")
                | {{ $t('report.volatility.dial.keyGood') }}
              .vol-keyrow
                span.vol-sw(style="background:#ff9900")
                | {{ $t('report.volatility.dial.keyWarn') }}
              .vol-keyrow
                span.vol-sw(style="background:#ff0000")
                | {{ $t('report.volatility.dial.keyCrit') }}

      //- [D2b] the band chart
      .vol-card
        .vol-group
          .vol-glabel
            span.vol-dot
            h2.vol-h2 {{ $t('report.volatility.chart.title') }}
          .vol-chartwrap
            svg(:viewBox="'0 0 720 330'" width="100%" height="330" role="img" :aria-label="$t('report.volatility.chart.alt')")
              g(v-for="line in chart.bandLines" :key="'bl' + line.k + line.side")
                line(x1="60" :y1="line.y" x2="705" :y2="line.y" :stroke="line.colour" :stroke-width="line.width" :stroke-dasharray="line.dash")
                text(x="705" :y="line.y - 3" text-anchor="end" font-size="9.5" :fill="line.colour") {{ line.label }}
              line(x1="60" :y1="chart.zeroY" x2="705" :y2="chart.zeroY" stroke="#d5e1ee" stroke-width="1")
              polyline(fill="none" stroke="#002b64" stroke-width="2" stroke-linejoin="round" :points="chart.points")
              circle(
                v-for="p in chart.dots" :key="'d' + p.i"
                :cx="p.x" :cy="p.y" :r="p.outside ? 5 : 3.5"
                :fill="p.outside ? '#ff9900' : '#002b64'"
                :stroke="p.outside ? '#ffffff' : 'none'"
                :stroke-width="p.outside ? 1.5 : 0"
              )
              g(font-size="9.5" fill="#5b6f8a" text-anchor="middle")
                text(v-for="p in chart.dots" :key="'l' + p.i" :x="p.x" y="315") {{ p.i + 1 }}

      //- [D2b] the months outside the range
      .vol-card(v-if="outsideMonths.length")
        .vol-group
          .vol-glabel
            span.vol-dot
            h2.vol-h2 {{ $t('report.volatility.outside.title', { n: outsideMonths.length }) }}
          table.vol-table
            thead
              tr
                th {{ $t('report.volatility.outside.month') }}
                th {{ $t('report.volatility.outside.sales') }}
                th {{ $t('report.volatility.outside.distance') }}
                th {{ $t('report.volatility.outside.band') }}
            tbody
              tr(v-for="m in outsideMonths" :key="'o' + m.index")
                td {{ $t('report.volatility.tile.month', { n: m.index + 1 }) }}
                td.is-out {{ money(m.value) }}
                td.is-out {{ signedMoney(m.deviation) }}
                td {{ $t('report.volatility.outside.band' + m.band, { above: m.deviation > 0 ? 1 : 0 }) }}

      //- [D2b] this year against last — only exists once two full years are entered,
      //- which is the 24-month window. The model returns null below that rather than
      //- half a comparison.
      .vol-card(v-if="data.yearOnYear")
        .vol-group
          .vol-glabel
            span.vol-dot
            h2.vol-h2 {{ $t('report.volatility.yoy.title') }}
          .vol-chartwrap
            table.vol-table
              thead
                tr
                  th {{ $t('report.volatility.yoy.month') }}
                  th(v-for="(v, i) in data.yearOnYear.lastYear" :key="'yh' + i") {{ i + 1 }}
              tbody
                tr
                  td {{ $t('report.volatility.yoy.lastYear') }}
                  td(v-for="(v, i) in data.yearOnYear.lastYear" :key="'yl' + i") {{ money(v) }}
                tr
                  td {{ $t('report.volatility.yoy.yearBefore') }}
                  td(v-for="(v, i) in data.yearOnYear.yearBefore" :key="'yb' + i") {{ money(v) }}

      //- [D2c] the coach panel
      .vol-edu
        .vol-edu-h
          span.vol-lead {{ $t('report.volatility.coach.tag') }}
          | {{ $t('report.volatility.coach.title') }}
        p.vol-edu-p {{ $t('report.volatility.coach.normal', { n: data.insideFirstBand, of: data.monthsUsed, pct: num(data.insideFirstBandPct, 0) }) }}
        p.vol-edu-p {{ $t('report.volatility.coach.cause') }}

      //- [D2d] actions
      .vol-actions
        span.vol-foot {{ $t('report.volatility.footnote') }}
</template>

<script>
/**
 * Volatility Report — the screen.
 *
 * Assembly only: the arithmetic is backend-only (`server/report/volatilityModel.js`, reached
 * through `POST /api/report/volatility`), and every shared block — header, banner, stale
 * behaviour, money formatting, the debounce and race guard — comes from the base components
 * and the two mixins. See `design/ADDING-A-REPORT.md`.
 *
 * The screen reports only where a month sits, never why. No statistic can separate a seasonal
 * dip from a special cause from tampering, and asserting one in front of a client would be a
 * claim the maths cannot support (Mike's scope ruling, 2026-08-31).
 *
 * Entry is typed for now. The by-month accounts upload is a later change of its own: the
 * existing intake reads ANNUAL figures and deliberately refuses a by-month export
 * (`MULTI_PERIOD_COLUMNS` in `server/report/intake/xeroReportParser.js`).
 */
import ReportHeader from '~/components/base/ReportHeader.vue'
import HeroStrip from '~/components/base/HeroStrip.vue'
import HeroFigure from '~/components/base/HeroFigure.vue'
import StaleBanner from '~/components/base/StaleBanner.vue'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/** The workbook's own 24 months — `Data Input!E7:AB7`. Mirrors the model's DEFAULT_INPUTS. */
const SAMPLE_SALES = [
  145632, 56891, 87541, 29483, 75961, 34678,
  28965, 65987, 47986, 52364, 74632, 125463,
  16892, 78123, 56894, 20659, 58693, 85743,
  69472, 85631, 62478, 36251, 45326, 65324
]

/** Chart geometry, in the SVG's own units. */
const CHART = { left: 70, right: 690, top: 20, bottom: 300, headroom: 1.08 }

export default {
  name: 'VolatilityReport',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      windows: [12, 18, 24],
      /** Typed inputs. `sales` is oldest-first and exactly `window` long. */
      form: { window: 12, sales: SAMPLE_SALES.slice(SAMPLE_SALES.length - 12) },
      /** True until the advisor edits a figure — drives the sample notice. */
      isSample: true,
      data: null
    }
  },

  computed: {
    /** Bands widest-first, the way the table reads down the page. */
    reversedBands () {
      return this.data ? this.data.bands.slice().reverse() : []
    },

    /** The band whose lower edge the zero floor moved, if any. */
    flooredBand () {
      if (!this.data) { return null }
      const hit = this.data.bands.filter(b => b.floored)
      return hit.length ? hit[hit.length - 1] : null
    },

    /** "£34,720 – £78,861" — the first band, which is the range people actually quote. */
    rangeText () {
      if (!this.data) { return '' }
      const b = this.data.bands[0]
      return this.money(b.lower) + ' – ' + this.money(b.upper)
    },

    outsideMonths () {
      return this.data ? this.data.months.filter(m => m.outside) : []
    },

    outsideCount () {
      return this.outsideMonths.length
    },

    /**
     * The needle, as two points. 0 sits at 225° and 100 at −45°, sweeping 270° clockwise —
     * the geometry of the workbook's own gauge. Scores above 100 peg at the end stop rather
     * than swinging back round, which would read as a low score.
     */
    needle () {
      const score = this.data ? Math.max(0, Math.min(100, this.data.score)) : 0
      const rad = (225 - (score / 100) * 270) * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      return {
        tipX: 110 + 64 * cos,
        tipY: 110 - 64 * sin,
        tailX: 110 - 14 * cos,
        tailY: 110 + 14 * sin
      }
    },

    /**
     * The band chart: the sales line, its dots, and the horizontal band lines with their
     * labels. Scaled from zero so the bars read against a real baseline — the lower bands
     * are already floored at zero by the model.
     */
    chart () {
      const empty = { points: '', dots: [], bandLines: [], zeroY: CHART.bottom }
      if (!this.data || this.data.months.length === 0) { return empty }

      const d = this.data
      let top = d.average
      for (let i = 0; i < d.months.length; i++) {
        if (d.months[i].value > top) { top = d.months[i].value }
      }
      if (d.bands.length && d.bands[2].upper > top) { top = d.bands[2].upper }
      top = top * CHART.headroom
      if (top <= 0) { return empty }

      const y = v => CHART.bottom - (v / top) * (CHART.bottom - CHART.top)
      const n = d.months.length
      const step = n > 1 ? (CHART.right - CHART.left) / (n - 1) : 0

      const dots = d.months.map((m, i) => ({
        i,
        x: CHART.left + i * step,
        y: y(m.value),
        outside: m.outside
      }))

      const bandLines = [{
        k: 0,
        side: 'mid',
        y: y(d.average),
        colour: '#002b64',
        width: 2,
        dash: '',
        label: this.$t('report.volatility.chart.average', { value: this.money(d.average) })
      }]
      const style = [
        { colour: '#0070c0', width: 1.5, dash: '6 4' },
        { colour: '#5b6f8a', width: 1, dash: '4 4' },
        { colour: '#ff9900', width: 1, dash: '2 4' }
      ]
      d.bands.forEach((b, idx) => {
        const s = style[idx]
        bandLines.push({
          k: b.k,
          side: 'up',
          y: y(b.upper),
          colour: s.colour,
          width: s.width,
          dash: s.dash,
          label: this.$t('report.volatility.chart.band', { k: b.k, value: this.money(b.upper) })
        })
        // A band floored at zero would draw on top of the baseline and say nothing.
        if (!b.floored) {
          bandLines.push({
            k: b.k,
            side: 'down',
            y: y(b.lower),
            colour: s.colour,
            width: s.width,
            dash: s.dash,
            label: this.$t('report.volatility.chart.band', { k: b.k, value: this.money(b.lower) })
          })
        }
      })

      return {
        points: dots.map(p => p.x + ',' + p.y).join(' '),
        dots,
        bandLines,
        zeroY: y(0)
      }
    }
  },

  watch: {
    form: {
      deep: true,
      handler () { this.queueRecompute() }
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * Switch the measured window, resizing the typed months to match. Growing pulls the
     * extra months from the workbook sample rather than leaving blanks, so the screen never
     * shows a half-empty form.
     */
    setWindow (w) {
      const sales = this.form.sales.slice()
      if (w < sales.length) {
        this.form.sales = sales.slice(sales.length - w)
      } else if (w > sales.length) {
        const need = w - sales.length
        const pad = SAMPLE_SALES.slice(SAMPLE_SALES.length - w, SAMPLE_SALES.length - w + need)
        this.form.sales = pad.concat(sales)
      }
      this.form.window = w
    },

    /**
     * Set one month. An emptied box is zero rather than NaN — one NaN would blank the
     * average, every band and the dial at once.
     */
    setMonth (i, raw) {
      const n = parseFloat(raw)
      this.$set(this.form.sales, i, Number.isFinite(n) ? n : 0)
      this.isSample = false
    },

    resetToSample () {
      this.form.sales = SAMPLE_SALES.slice(SAMPLE_SALES.length - this.form.window)
      this.isSample = true
    },

    /** @returns {{url: string, body: object}} the backend call this screen makes. */
    recomputeRequest () {
      return {
        url: '/api/report/volatility',
        body: { sales: this.form.sales, window: this.form.window }
      }
    },

    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
/* Root: flex column with ONE gap value (16px) so every vertical gap — header→band,
   band→layout, card→card — is identical. See the [A]–[D2d] anatomy in
   REPORT-VISUAL-STANDARD.md and the labelled REPORT-LAYOUT-REFERENCE.html. */
.vol-root { display: flex; flex-direction: column; gap: 16px; }
/* MANDATORY when report-header is inside the screen: reset its `margin: 0 auto 22px`.
   Guarded by reportHeaderFullWidth.test.js. */
.vol-root ::v-deep .rs-top { margin: 0; }

.vol-layout {
  display: grid;
  grid-template-columns: var(--rs-col-input) 1fr;
  gap: var(--rs-col-gap);
  align-items: start;
}
@media (max-width: 860px) { .vol-layout { grid-template-columns: 1fr; } }

/* Cards carry no top edge — the eight shipped screens define none
   (corrected in REPORT-VISUAL-STANDARD.md, 2026-08-31). */
.vol-card {
  background: var(--rs-card-bg);
  border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius);
  box-shadow: var(--rs-shadow);
}
.vol-h2 {
  margin: 0; font-size: 12px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600;
}
.vol-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.vol-group:last-child { border-bottom: 0; }
.vol-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.vol-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.vol-note { font-size: 12px; color: var(--rs-muted); line-height: 1.5; margin: 10px 0 0; }
.vol-fieldlab { display: block; font-size: 12.5px; color: var(--rs-ink); margin-bottom: 6px; }

.vol-results { display: flex; flex-direction: column; gap: 16px; min-height: 200px; }
.vol-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 560px) { .vol-tiles { grid-template-columns: 1fr; } }
.vol-tile {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius); padding: 16px 17px;
  box-shadow: var(--rs-shadow); overflow: hidden;
}
.vol-k {
  font-size: 11px; letter-spacing: .09em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600;
}
.vol-v {
  font-size: 30px; font-weight: 600; letter-spacing: -.01em; margin-top: 6px;
  line-height: 1; font-variant-numeric: tabular-nums;
}
.vol-sub { font-size: 12.5px; color: var(--rs-muted); margin-top: 6px; }

/* Window selector */
.vol-seg { display: flex; border: 1px solid var(--rs-line); border-radius: 10px; overflow: hidden; }
.vol-segbtn {
  flex: 1; border: 0; background: var(--rs-panel); padding: 9px 0; font: inherit;
  font-size: 13px; font-weight: 600; color: var(--rs-muted); cursor: pointer;
}
.vol-segbtn.is-on { background: var(--rs-accent); color: var(--rs-accent-contrast); }

/* Typed months */
.vol-months { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vol-month { display: flex; align-items: center; gap: 6px; }
.vol-month label {
  flex: none; width: 18px; font-size: 11px; color: var(--rs-muted);
  font-variant-numeric: tabular-nums; text-align: right;
}
.vol-month input {
  width: 100%; min-width: 0; font: inherit; font-size: 12.5px;
  padding: 6px 7px; border: 1px solid var(--rs-line); border-radius: 7px;
  background: var(--rs-panel); color: var(--rs-ink);
  font-variant-numeric: tabular-nums;
}
.vol-month input:focus { outline: 2px solid var(--rs-accent); outline-offset: 1px; }

.vol-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.vol-table th, .vol-table td {
  text-align: right; padding: 7px 8px; border-bottom: 1px solid var(--rs-line);
  font-variant-numeric: tabular-nums;
}
.vol-table th:first-child, .vol-table td:first-child { text-align: left; }
.vol-table th {
  font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
  color: var(--rs-muted); font-weight: 600;
}
.vol-table tbody tr:last-child td { border-bottom: 0; }
.vol-table td.is-out { color: var(--rs-warn); font-weight: 600; }

/* The dial */
.vol-gauge { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.vol-gauge svg { flex: none; }
.vol-gauge-v {
  font-size: 26px; font-weight: 600; fill: var(--rs-ink);
  font-variant-numeric: tabular-nums;
}
.vol-gaugekey { flex: 1; min-width: 240px; }
.vol-keyrow { display: flex; align-items: center; gap: 9px; font-size: 12.5px; margin-top: 6px; }
.vol-sw { width: 14px; height: 8px; border-radius: 3px; flex: none; }

.vol-chartwrap { overflow-x: auto; }
.vol-chartwrap svg { display: block; min-width: 660px; }

/* Coach panel */
.vol-edu {
  border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft);
  border-radius: 0 9px 9px 0; padding: 15px 17px;
}
.vol-edu-h {
  display: flex; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .1em;
  text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px;
}
.vol-edu-p { margin: 0 0 8px; font-size: 14px; line-height: 1.6; }
.vol-edu-p:last-child { margin-bottom: 0; }
.vol-lead {
  background: var(--rs-accent); color: var(--rs-accent-contrast); font-size: 10px;
  font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 5px;
}

.vol-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vol-cta {
  font: inherit; font-weight: 600; font-size: 13.5px; color: var(--rs-accent-contrast);
  background: var(--rs-accent); border: 0; padding: 11px 18px; border-radius: 10px;
  cursor: pointer; margin-top: 12px;
}
.vol-ghost { background: transparent; color: var(--rs-ink); border: 1px solid var(--rs-line); }
.vol-foot { font-size: 12px; color: var(--rs-muted); }
</style>

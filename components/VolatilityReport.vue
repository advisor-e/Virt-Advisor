<template lang="pug">
.vol-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.volatility.title')"
    :client="$t('report.preparedFor')"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient"
  )
  //- Report class: no "Illustrative" badge — these become the client's real figures.
  //- Seeded with the workbook sample until the advisor types their own.
  sample-notice(v-if="isSample" :text="$t('report.sampleFigures')")

  //- The approved five steps. Shown only once an accounts file is chosen: on the typed
  //- path steps 1 and 2 can never complete, and a permanently unfinished checklist would
  //- tell an advisor who typed their figures that they had not finished. Deviation from
  //- the artefact, which draws them unconditionally — recorded in the Brief.
  .vol-chips(v-if="hasAccountsFile")
    span.vol-chip(v-for="s in steps" :key="s.key" :class="'is-' + s.state")
      span.vol-chip-n {{ s.state === 'done' ? '✓' : s.n }}
      | {{ $t('report.volatility.steps.' + s.key) }}

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
    //- [D1] inputs — the accounts upload seeds the months, and every figure stays
    //- editable. Approved artefact: design/mockups/volatility-report.html.
    aside.vol-card
      //- A client never sees the accounts upload: it needs the advisor's sign-in (§5).
      .vol-group(v-if="savedReport.mode !== 'client'")
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.accounts.title') }}
          //- Reset sits HERE, not at the foot of the column. It now clears the uploaded
          //- files as well as the figures, so it means "start this client again" — and a
          //- control that undoes everything has to be findable without scrolling. Moved
          //- 2026-08-31 on Mike's instruction: the Accounts card had pushed it ~1,400px
          //- down an 1,874px page, below the fold on a laptop.
          button.vol-cta.vol-ghost.vol-reset(type="button" @click="resetToSample") {{ $t('report.reset') }}
        p.vol-note {{ $t('report.volatility.accounts.help') }}
        //- The shared supported-software line — one string across every intake screen.
        p.vol-note {{ $t('report.supportedSoftware') }}
        //- ONE load box, however many years are dropped on it. Which export is which
        //- year is not a question to put to the advisor: every month is already dated
        //- by the parser, and the assembler orders the files by their own first month.
        //- Asking would be asking a person to re-state what the file already says.
        .vol-slot.is-empty
          span.vol-slot-icon 📄
          .vol-slot-body
            .vol-slot-name {{ $t('report.volatility.accounts.dropTitle') }}
            .vol-slot-meta {{ $t('report.volatility.accounts.dropHint', { max: maxFiles }) }}
          button.vol-slot-btn(
            type="button"
            :disabled="uploading || files.length >= maxFiles"
            @click="pickFile"
          ) {{ $t('report.volatility.accounts.choose') }}
          input(
            ref="accountsFile"
            type="file"
            accept=".xlsx,.csv"
            multiple
            hidden
            @change="onFileChosen($event)"
          )
        ul.vol-filelist(v-if="files.length")
          li.vol-fileitem(v-for="(f, i) in files" :key="i")
            .vol-slot-body
              .vol-slot-name {{ f.name }}
              .vol-slot-meta {{ fileMeta(i) }}
            button.vol-slot-btn(
              type="button"
              :disabled="uploading"
              @click="removeFile(i)"
            ) {{ $t('report.volatility.accounts.remove') }}
        p.vol-note.is-error(v-if="uploadError") {{ uploadError }}
        .vol-warn(v-for="(w, i) in intakeWarnings" :key="'w' + i")
          span ⚠
          div {{ w }}
        .vol-warn(v-if="setAside.length")
          span ⚠
          div {{ setAsideMessage }}
        p.vol-note {{ $t('report.volatility.accounts.privacy') }}

      .vol-group
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.window.title') }}
        label.vol-fieldlab(for="vol-start") {{ $t('report.volatility.start.label') }}
        //- Locked once the months come from a file. The picker only RENAMES the boxes —
        //- it does not move the figures — so while the file supplies the dates a change
        //- here can only ever make the labels disagree with the data beside them, with
        //- nothing on screen showing the disagreement. Mike hit exactly that on
        //- 2026-08-31: his export's period opens on 20 August, so setting the picker to
        //- August looked right, and it shifted all 24 labels back a month.
        b-select#vol-start(v-model="startMonth" expanded :disabled="datesFromFile")
          option(v-for="k in monthKeys" :key="k" :value="k") {{ $t('report.volatility.monthLong.' + k) }}
        p.vol-note {{ datesFromFile ? $t('report.volatility.start.fromFile') : $t('report.volatility.start.help') }}

        label.vol-fieldlab.is-spaced(for="vol-window") {{ $t('report.volatility.window.label') }}
        .vol-seg(role="group" :aria-label="$t('report.volatility.window.label')")
          button.vol-segbtn(
            v-for="w in windows" :key="w"
            type="button"
            :class="{ 'is-on': form.window === w }"
            :aria-pressed="String(form.window === w)"
            :disabled="!windowAllowed(w)"
            @click="setWindow(w)"
          ) {{ w }}
        p.vol-note {{ $t('report.volatility.window.help') }}
        //- Why a window is unavailable, rather than a dead button with no explanation.
        p.vol-note(v-if="!windowAllowed(windows[windows.length - 1])") {{ $t('report.volatility.window.needMore') }}

      .vol-group
        .vol-glabel
          span.vol-dot
          h2.vol-h2 {{ $t('report.volatility.entry.title') }}
        p.vol-note {{ $t('report.volatility.entry.help') }}
        .vol-months
          //- A month the client changed since the advisor's version is badged on its label
          //- (§5, D4); the saved row names months by their place in the 24-month buffer.
          .vol-month(v-for="(v, i) in form.sales" :key="i" :class="{ 'is-file': sources[i] === 'file' }")
            label(:for="'vol-m' + i")
              | {{ monthLabel(i) }}
              client-changed-badge(v-if="isClientChanged('month.' + bufferIndex(i))" :label="$t('clientReports.saved.badge')")
            input(
              :id="'vol-m' + i"
              type="number"
              inputmode="decimal"
              :value="v"
              :aria-label="$t('report.volatility.entry.monthLabel', { n: i + 1 })"
              @input="setMonth(i, $event.target.value)"
            )
        p.vol-note(v-if="fromFileCount") {{ $t('report.volatility.entry.fromFile', { n: fromFileCount }) }}

        //- Months the accounts file could not vouch for. They sit OUTSIDE the measured
        //- window — typing a figure over one brings it back in, which is the only way a
        //- part-finished or empty month can enter the maths.
        template(v-if="setAside.length")
          label.vol-fieldlab.is-spaced {{ $t('report.volatility.setAside.title') }}
          .vol-months
            .vol-month.is-needs(v-for="(m, i) in setAside" :key="'sa' + i")
              label(:for="'vol-sa' + i") {{ shortMonth(m.label) }}
              input(
                :id="'vol-sa' + i"
                type="number"
                inputmode="decimal"
                :value="m.value"
                :aria-label="$t('report.volatility.setAside.monthLabel', { month: m.label })"
                @input="restoreSetAside(i, $event.target.value)"
              )

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
          .vol-v
            | {{ money(data.total) }}
            //- Tagged only when EVERY measured month came from the accounts. One
            //- overtyped month and this is a mixed figure, and calling it "from file"
            //- would credit the accounts for a number the advisor changed.
            provenance-badge(
              v-if="allFromFile"
              source="file"
              :file-label="$t('report.volatility.provenance.fromFile')"
              :entered-label="$t('report.volatility.provenance.entered')"
              spaced
            )
          .vol-sub {{ $t('report.volatility.tile.totalSub', { months: data.monthsUsed }) }}
        .vol-tile
          .vol-k {{ $t('report.volatility.tile.outside') }}
          .vol-v {{ $t('report.volatility.hero.inRangeValue', { n: outsideCount, of: data.monthsUsed }) }}
          .vol-sub {{ $t('report.volatility.tile.outsideSub') }}
        .vol-tile(v-if="data.highest")
          .vol-k {{ $t('report.volatility.tile.highest') }}
          .vol-v
            | {{ money(data.highest.value) }}
            //- Per-month, so it follows THAT month's provenance rather than the whole set.
            provenance-badge(
              v-if="sources[data.highest.index] === 'file'"
              source="file"
              :file-label="$t('report.volatility.provenance.fromFile')"
              :entered-label="$t('report.volatility.provenance.entered')"
              spaced
            )
          .vol-sub {{ monthLabel(data.highest.index) }} · {{ signedMoney(data.months[data.highest.index].deviation) }}
        .vol-tile(v-if="data.lowest")
          .vol-k {{ $t('report.volatility.tile.lowest') }}
          .vol-v
            | {{ money(data.lowest.value) }}
            provenance-badge(
              v-if="sources[data.lowest.index] === 'file'"
              source="file"
              :file-label="$t('report.volatility.provenance.fromFile')"
              :entered-label="$t('report.volatility.provenance.entered')"
              spaced
            )
          .vol-sub {{ monthLabel(data.lowest.index) }} · {{ signedMoney(data.months[data.lowest.index].deviation) }}

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
                text(v-for="p in chart.dots" :key="'l' + p.i" :x="p.x" y="315") {{ monthLabel(p.i) }}

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
                td {{ monthLabel(m.index) }}
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
                  th(v-for="(v, i) in data.yearOnYear.lastYear" :key="'yh' + i") {{ monthLabel(i + 12) }}
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
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import ClientChangedBadge from '~/components/base/ClientChangedBadge.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'
import savedReport from '~/mixins/savedReport'

/** The workbook's own 24 months — `Data Input!E7:AB7`. Mirrors the model's DEFAULT_INPUTS. */
/** The widest window, and so the length of the month buffer behind it. */
const WINDOW_MAX = 24

const SAMPLE_SALES = [
  145632, 56891, 87541, 29483, 75961, 34678,
  28965, 65987, 47986, 52364, 74632, 125463,
  16892, 78123, 56894, 20659, 58693, 85743,
  69472, 85631, 62478, 36251, 45326, 65324
]

/**
 * The twelve month slugs, in calendar order. These are KEYS, not user-facing text — the
 * names themselves live in `locales/report.volatility.monthLong/monthShort` so they can
 * be translated. Pinned against the backend's own MONTHS order by
 * tests/unit/volatilityReport.component.test.js.
 */
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** The three things a buffer month can be. A saved row may carry no other word. */
const BUFFER_SOURCES = ['sample', 'file', 'entered']

/** Chart geometry, in the SVG's own units. */
const CHART = { left: 70, right: 690, top: 20, bottom: 300, headroom: 1.08 }

export default {
  name: 'VolatilityReport',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice, ProvenanceBadge, ClientChangedBadge },

  mixins: [currencyMixin, reportRecompute, savedReport],

  props: {
    /**
     * Bearer token for the accounts-upload route, which is firmAuth (uploads are never
     * anonymous). The calculation route stays anonymous, as on every other report.
     */
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      windows: [12, 18, 24],
      monthKeys: MONTH_KEYS,
      /**
       * How many accounts files this report reads. Mirrors MAX_FILES in
       * monthlySeriesAssembler.js, which refuses more — the backend stays the boundary;
       * this only saves a round trip and lets the button disable itself.
       */
      maxFiles: 2,
      /** The chosen File objects, in the order they were added. All re-sent on any change. */
      files: [],
      uploading: false,
      uploadError: null,
      /** Warnings the backend raised about the files (gap, overlap, different companies). */
      intakeWarnings: [],
      /** Months the intake could not vouch for: empty, or the part-finished cut-off month. */
      setAside: [],
      /** What the last upload read, index-aligned with `files` (the route preserves order). */
      fileSummaries: [],
      /**
       * The month the first typed figure belongs to; every later month follows on from
       * it, wrapping into the next year. Defaults to September because that is where the
       * workbook's own 24-month series begins (`Data Input!E5` = Excel serial 44440,
       * 1 September 2021) — so the sample data is labelled as the workbook labels it.
       *
       * 🔴 DELIBERATELY OUTSIDE `form`. The deep watcher on `form` queues a backend
       * recompute on every change, and a month NAME changes no figure — it is a label.
       * Inside `form` this control would fire a pointless request on every selection.
       */
      startMonth: 'sep',
      /** The calendar year of the FIRST month on screen, when it is known (a file gives it). */
      startYear: null,
      /**
       * The 24-month BUFFER behind the window, and where each of its months came from.
       *
       * 🔴 THIS EXISTS TO MAKE ONE RULE STRUCTURAL: a workbook sample figure may only ever
       * be on screen while the sample notice is showing. Before it, growing the window
       * padded from SAMPLE_SALES — so an advisor who uploaded twelve real months and then
       * clicked 24 got twelve INVENTED months in a client's report with the notice
       * switched off, and £125,463 of workbook data reading as their client's best month.
       * Found by Mike, 2026-08-31. The window can now only widen over months whose source
       * is not 'sample', so the failure is unreachable rather than merely fixed.
       */
      buffer: SAMPLE_SALES.slice(),
      /** 'sample' | 'file' | 'entered', index-aligned with `buffer`. */
      bufSources: new Array(WINDOW_MAX).fill('sample'),
      /** The visible window. `sales` is oldest-first and exactly `window` long. */
      form: { window: 12, sales: SAMPLE_SALES.slice(SAMPLE_SALES.length - 12) },
      data: null
    }
  },

  computed: {
    /** Where each VISIBLE month came from: 'sample' | 'file' | 'entered'. */
    sources () {
      return this.bufSources.slice(WINDOW_MAX - this.form.window)
    },

    /**
     * The sample notice is now the exact statement of what is on screen: it shows while,
     * and only while, a workbook figure is among the visible months. Before this it was a
     * flag cleared by the first edit, which left eleven workbook months on screen with
     * nothing saying so.
     */
    isSample () {
      return this.sources.includes('sample')
    },

    /** How many of the measured months came from an accounts file. */
    fromFileCount () {
      return this.sources.filter(s => s === 'file').length
    },

    /** True once any accounts file is loaded — the chips describe the file path only. */
    hasAccountsFile () {
      return this.files.length > 0
    },

    /**
     * The months on screen are dated by the file, not by the advisor. While this is true
     * the Starting month picker is locked: the file knows every date, and the picker can
     * only rename boxes, never move figures.
     */
    datesFromFile () {
      return this.startYear !== null && this.fromFileCount > 0
    },

    /**
     * Every measured month came from the accounts, so a figure derived from them can
     * honestly carry the "from file" tag. One overtyped month makes the total a mixed
     * figure and the tag comes off.
     */
    allFromFile () {
      return this.sources.length === this.form.sales.length && this.fromFileCount === this.form.sales.length
    },

    /**
     * The five approved steps, each `done` / `now` / `todo`. "Check the months" is `now`
     * for as long as anything is set aside, because that is the step where a believable
     * wrong number gets caught — it must not read as finished while a month is still
     * waiting to be looked at.
     */
    steps () {
      const uploaded = this.hasAccountsFile
      const matched = uploaded && this.fromFileCount > 0
      const checked = matched && !this.setAside.length
      const state = (done, now) => (done ? 'done' : (now ? 'now' : 'todo'))
      return [
        { key: 'uploaded', n: 1, state: state(uploaded, !uploaded) },
        { key: 'matched', n: 2, state: state(matched, uploaded && !matched) },
        { key: 'checked', n: 3, state: state(checked, matched && !checked) },
        { key: 'review', n: 4, state: state(false, checked) },
        { key: 'discuss', n: 5, state: 'todo' }
      ]
    },

    /**
     * One sentence naming every month left out and why. Deliberately one block rather
     * than a marker per box: the advisor has to read WHY before deciding, and a small
     * icon beside a figure invites a glance, not a decision.
     */
    setAsideMessage () {
      const empty = this.setAside.filter(m => m.reason === 'empty').map(m => m.label)
      const partial = this.setAside.filter(m => m.reason === 'partial').map(m => m.label)
      const parts = []
      if (empty.length) {
        parts.push(this.$tc('report.volatility.setAside.empty', empty.length, { months: empty.join(', ') }))
      }
      if (partial.length) {
        parts.push(this.$tc('report.volatility.setAside.partial', partial.length, { months: partial.join(', ') }))
      }
      parts.push(this.$t('report.volatility.setAside.moved', { n: this.form.window }))
      return parts.join(' ')
    },

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

    /** The month names for the window on screen, in order, wrapping past December. */
    monthLabels () {
      const from = MONTH_KEYS.indexOf(this.startMonth)
      const start = from === -1 ? 0 : from
      const n = this.form.sales.length
      const out = []
      for (let i = 0; i < n; i++) {
        out.push(this.$t('report.volatility.monthShort.' + MONTH_KEYS[(start + i) % 12]))
      }
      return out
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
     * The line under a loaded file: the period it actually covers, and how much of it is
     * usable. The advisor never says which year a file is — this is the screen telling
     * THEM what the file turned out to be, which is the only honest direction for that
     * information to travel.
     * @param {number} i - index within `files`.
     */
    fileMeta (i) {
      const s = this.fileSummaries[i]
      // A file that was refused must SAY so on its own row. It used to keep saying
      // "Reading…" for ever, so the screen looked busy over a file it had already thrown
      // out, and the real reason sat further down where it was easy to miss.
      if (!s) { return this.$t(this.uploading ? 'report.volatility.accounts.reading' : 'report.volatility.accounts.notRead') }
      return this.$t('report.volatility.accounts.read', {
        read: s.monthsRead,
        complete: s.monthsComplete,
        range: s.range || ''
      })
    },

    /** "Aug 2024" → "Aug". @param {string} label */
    shortMonth (label) {
      return String(label || '').split(' ')[0]
    },

    pickFile () {
      const el = this.$refs.accountsFile
      if (el) { el.click() }
    },

    /**
     * Take whatever was chosen, added to whatever is already there. One box accepts one
     * or both years in a single go, or a second year on a later click.
     * @param {Event} event
     */
    onFileChosen (event) {
      const chosen = Array.from((event.target && event.target.files) || [])
      event.target.value = ''
      if (!chosen.length) { return }

      const bad = chosen.map(f => this.fileCheckError(f)).filter(Boolean)
      if (bad.length) { this.uploadError = bad[0]; return }

      const next = this.files.concat(chosen)
      if (next.length > this.maxFiles) {
        this.uploadError = this.$t('report.volatility.accounts.tooMany', { max: this.maxFiles, n: next.length })
        return
      }
      this.files = next
      this.uploadAccounts()
    },

    /**
     * Drop one file and re-read what is left. Removing the last one puts the screen back
     * to typed entry rather than leaving the previous result on screen credited to a file
     * that is no longer there.
     * @param {number} i
     */
    removeFile (i) {
      this.files = this.files.slice(0, i).concat(this.files.slice(i + 1))
      this.fileSummaries = []
      this.uploadError = null
      if (this.files.length) {
        this.uploadAccounts()
      } else {
        // The last file is gone, so the figures it supplied have no source. Back to the
        // workbook sample — with its notice — rather than leaving orphaned numbers that
        // nothing on screen can account for.
        this.resetToSample()
      }
    },

    /**
     * Pre-upload sanity check — UX only. The backend's magic-byte and size checks remain
     * the real boundary; this just saves a round trip on an obvious mistake.
     * @param {File} file @returns {string|null}
     */
    fileCheckError (file) {
      if (!/\.(xlsx|csv)$/i.test(file.name)) { return this.$t('report.fileCheck.wrongType') }
      if (file.size > 5 * 1024 * 1024) { return this.$t('report.fileCheck.tooBig') }
      return null
    },

    /**
     * Send every chosen file together and apply what comes back.
     *
     * Both files go in ONE request on purpose: the gap and overlap checks compare the two
     * exports against each other, so sending them separately would mean neither request
     * could see the join. Nothing is parsed here — the file never leaves the browser
     * except as a POST body, and the backend deletes it as soon as it is read.
     */
    async uploadAccounts () {
      const chosen = this.files.slice()
      if (!chosen.length) { return }
      this.uploading = true
      this.uploadError = null
      try {
        const body = new FormData()
        for (const f of chosen) { body.append('file', f) }
        const res = await fetch('/api/report/volatility/intake', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const json = await res.json()
        if (!json.success) {
          this.uploadError = (json.error && json.error.message) || this.$t('report.volatility.accounts.failed')
          return
        }
        this.applyIntake(json.data)
      } catch (e) {
        this.uploadError = this.$t('report.volatility.accounts.failed')
      } finally {
        this.uploading = false
      }
    },

    /**
     * Apply an intake result to the form.
     *
     * The window becomes the largest of 12/18/24 the COMPLETE months can fill — never
     * larger, because padding a short series with sample figures would put invented
     * numbers in front of a client under a "from file" heading. When fewer than twelve
     * complete months came back, the months that did arrive fill the most recent slots
     * and the rest keep their typed values, each tagged accordingly.
     *
     * @param {object} data - { files, series, usable, setAside, warnings } from the route.
     */
    applyIntake (data) {
      const usable = data.usable || []
      this.intakeWarnings = data.warnings || []
      this.setAside = (data.setAside || []).slice()

      // The route returns one summary per file in UPLOAD order, so these line up with
      // `files` by index. No sorting, and no guessing which year is which — the file's
      // own dates already answered that, on the backend.
      this.fileSummaries = data.files || []

      if (!usable.length) {
        this.uploadError = this.$t('report.volatility.accounts.noMonths')
        return
      }
      // A file that cannot fill the shortest window changes NOTHING. Applying what it had
      // used to leave the rest of the screen holding workbook figures with the sample
      // notice switched off — the client's report, part demo data, silently.
      if (usable.length < this.windows[0]) {
        this.uploadError = this.$t('report.volatility.accounts.short', { n: usable.length, min: this.windows[0] })
        return
      }

      // Write the file's months into the TAIL of the buffer, newest last, then choose the
      // widest window they can fill on their own.
      const taken = usable.slice(Math.max(0, usable.length - WINDOW_MAX))
      const buffer = this.buffer.slice()
      const bufSources = this.bufSources.slice()
      for (let k = 0; k < taken.length; k++) {
        const idx = WINDOW_MAX - taken.length + k
        buffer[idx] = taken[k].value
        bufSources[idx] = 'file'
      }
      const window = this.windows.filter(w => w <= taken.length).pop()

      this.buffer = buffer
      this.bufSources = bufSources
      this.form.window = window
      this.form.sales = buffer.slice(WINDOW_MAX - window)
      const first = taken[taken.length - window]
      this.startMonth = MONTH_KEYS[this.monthIndexOf(first.label)] || this.startMonth
      this.startYear = this.yearOfLabel(first.label)
    },

    /** "Aug 2024" → 2024, or null when the label carries no year. @param {string} label */
    yearOfLabel (label) {
      const m = /\b((?:19|20)\d{2})\b/.exec(String(label || ''))
      return m ? parseInt(m[1], 10) : null
    },

    /** "Aug 2024" → 7. @param {string} label @returns {number} */
    monthIndexOf (label) {
      const key = String(label || '').slice(0, 3).toLowerCase()
      return MONTH_KEYS.indexOf(key)
    },

    /**
     * Type a figure over a set-aside month and it rejoins the series as the newest month.
     * Only the OLDEST set-aside month can rejoin at a time — taking a later one first
     * would splice a hole into the middle of the run, which is the same fault the
     * assembler refuses to commit on the backend.
     *
     * @param {number} i - index within setAside.
     * @param {string} raw - the typed value.
     */
    restoreSetAside (i, raw) {
      const n = parseFloat(raw)
      this.$set(this.setAside[i], 'value', Number.isFinite(n) ? n : 0)
      if (i !== 0 || !Number.isFinite(n) || n === 0) { return }
      const month = this.setAside.shift()
      const buffer = this.buffer.slice(1)
      buffer.push(month.value)
      const bufSources = this.bufSources.slice(1)
      bufSources.push('entered')
      this.buffer = buffer
      this.bufSources = bufSources
      this.form.sales = buffer.slice(WINDOW_MAX - this.form.window)
      this.startMonth = MONTH_KEYS[(MONTH_KEYS.indexOf(this.startMonth) + 1) % 12]
    },

    /**
     * Switch the measured window, resizing the typed months to match. Growing pulls the
     * extra months from the workbook sample rather than leaving blanks, so the screen never
     * shows a half-empty form.
     */
    /**
     * May the window widen to `w` without putting a workbook figure on screen? Narrowing
     * is always allowed. Widening is allowed while the notice is already showing (the
     * demo is the demo), or when every month it would expose is the advisor's own.
     * @param {number} w
     */
    windowAllowed (w) {
      if (w <= this.form.window || this.isSample) { return true }
      return this.bufSources.slice(WINDOW_MAX - w).every(s => s !== 'sample')
    },

    /**
     * Switch the measured window. The months come from the 24-month buffer, never from
     * SAMPLE_SALES directly — which is what makes "no workbook figure without the notice"
     * true by construction rather than by care.
     */
    setWindow (w) {
      if (!this.windowAllowed(w)) { return }
      this.form.window = w
      this.form.sales = this.buffer.slice(WINDOW_MAX - w)
    },

    /**
     * Set one month. An emptied box is zero rather than NaN — one NaN would blank the
     * average, every band and the dial at once.
     */
    setMonth (i, raw) {
      const n = parseFloat(raw)
      const value = Number.isFinite(n) ? n : 0
      const idx = WINDOW_MAX - this.form.window + i
      this.$set(this.form.sales, i, value)
      this.$set(this.buffer, idx, value)
      // An overtyped month is the advisor's figure now, not the file's — the badge has
      // to follow the edit or the screen credits the accounts for a hand-keyed number.
      this.$set(this.bufSources, idx, 'entered')
    },

    /**
     * The name of the nth month of the window. Indexes past the window's end wrap the same
     * way, which is what the Year on Year header needs — its twelve columns are the second
     * year of a 24-month series.
     *
     * @param {number} i - 0-based month index.
     * @returns {string}
     */
    monthLabel (i) {
      const from = MONTH_KEYS.indexOf(this.startMonth)
      const start = from === -1 ? 0 : from
      const name = this.$t('report.volatility.monthShort.' + MONTH_KEYS[(((start + i) % 12) + 12) % 12])
      // With an 18 or 24-month window every month name appears TWICE, and until
      // 2026-08-31 nothing told them apart — two boxes said "Sep", three to a row, and a
      // figure could be read against the wrong year without any way to notice. The year
      // is shown whenever it is KNOWN, which is whenever the months came from a file.
      // Typed entry has no year to show, so it keeps the bare month rather than inventing one.
      if (this.startYear === null) { return name }
      const year = this.startYear + Math.floor((start + i) / 12)
      return name + ' ' + String(year).slice(-2)
    },

    resetToSample () {
      this.buffer = SAMPLE_SALES.slice()
      this.bufSources = new Array(WINDOW_MAX).fill('sample')
      this.form.sales = SAMPLE_SALES.slice(SAMPLE_SALES.length - this.form.window)
      // Reset clears the accounts too. Leaving a filename on screen above sample figures
      // would say the numbers came from that client's accounts when they did not.
      this.startYear = null
      this.files = []
      this.fileSummaries = []
      this.setAside = []
      this.intakeWarnings = []
      this.uploadError = null
    },

    /** The buffer slot behind the nth visible month. @param {number} i @returns {number} */
    bufferIndex (i) {
      return WINDOW_MAX - this.form.window + i
    },

    /**
     * The figures saved per client — consumed by the savedReport mixin (item 4.62, Brief
     * §5). The whole 24-month buffer, month by month WITH its source — a saved row must
     * keep the invariant above: a workbook figure is on screen only with the notice, and
     * that is only true if the sources travel with the figures. `startYear` is a blank
     * when no file ever dated the months.
     * @returns {object}
     */
    reportInputs () {
      const out = {}
      for (let i = 0; i < WINDOW_MAX; i++) {
        out['month.' + i] = this.buffer[i]
        out['source.' + i] = this.bufSources[i]
      }
      out.window = this.form.window
      out.startMonth = this.startMonth
      out.startYear = this.startYear
      return out
    },

    /**
     * Load a saved row back — consumed by the savedReport mixin. The 24 months are taken
     * as ONE BLOCK, each figure with a source, or not at all: a partial series would put
     * saved months beside whatever was on screen with the wrong badge on both. The window,
     * start month and year each in their own shape, and a window is taken only where the
     * loaded sources allow it. The accounts files on screen are cleared: the figures are
     * the row's now, and nothing may credit a file that did not supply them.
     * @param {object} inputs - hostile
     */
    applyReportInputs (inputs) {
      const src = inputs && typeof inputs === 'object' && !Array.isArray(inputs) ? inputs : {}
      const buffer = []
      const bufSources = []
      for (let i = 0; i < WINDOW_MAX; i++) {
        const v = src['month.' + i]
        const s = src['source.' + i]
        if (typeof v !== 'number' || !Number.isFinite(v) || !BUFFER_SOURCES.includes(s)) { return }
        buffer.push(v)
        bufSources.push(s)
      }
      this.buffer = buffer
      this.bufSources = bufSources
      this.files = []
      this.fileSummaries = []
      this.setAside = []
      this.intakeWarnings = []
      this.uploadError = null
      if (MONTH_KEYS.includes(src.startMonth)) { this.startMonth = src.startMonth }
      this.startYear = Number.isInteger(src.startYear) ? src.startYear : null
      const w = this.windows.includes(src.window) && this.windowAllowed(src.window) ? src.window : this.form.window
      this.form.window = w
      this.form.sales = buffer.slice(WINDOW_MAX - w)
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
/* The second label in the group sits under the first control's help text, which would
   otherwise run straight into it. */
.vol-fieldlab.is-spaced { margin-top: 16px; }

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
/* A month read from the accounts, and one the file could not vouch for. The set-aside
   colour is the standard's warn tone — the same one the stale banner uses — because it
   means the same thing in both places: do not trust this until you have looked. */
.vol-month.is-file input { border-color: var(--rs-accent); background: var(--rs-accent-soft); }
.vol-month.is-needs input { border-color: var(--rs-warn); background: var(--rs-warn-soft); }
.vol-month.is-needs label { color: var(--rs-warn); font-weight: 600; }

/* Reset, pushed to the right of the Accounts heading. Smaller than a primary action:
   it is an escape hatch, not the thing the card is for. */
.vol-reset { margin-left: auto; padding: 6px 11px; font-size: 12.5px; margin-top: 0; }

/* the five step chips — file path only */
.vol-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.vol-chip {
  display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 13px;
}
.vol-chip-n {
  width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center;
  font-size: 10.5px; background: var(--rs-line); color: var(--rs-ink);
}
.vol-chip.is-done { border-color: #4ca52d55; background: var(--rs-good-soft); }
.vol-chip.is-done .vol-chip-n { background: var(--rs-good); color: #fff; }
.vol-chip.is-now { border-color: #0070c055; background: var(--rs-accent-soft); }
.vol-chip.is-now .vol-chip-n { background: var(--rs-accent); color: #fff; }
.vol-chip.is-todo { color: var(--rs-muted); }

/* the single accounts load box, and the list of what has been read */
.vol-filelist { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.vol-fileitem {
  display: flex; gap: 10px; align-items: center;
  border: 1px solid var(--rs-line); border-radius: 9px; padding: 8px 10px;
}
.vol-slot {
  display: flex; gap: 10px; align-items: center;
  background: var(--rs-panel-2); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 10px 11px;
}
.vol-slot.is-empty { border-style: dashed; }
.vol-slot-icon { flex: none; }
.vol-slot-body { flex: 1; min-width: 0; }
.vol-slot-name { font-size: 12.5px; font-weight: 600; word-break: break-all; }
.vol-slot.is-empty .vol-slot-name { font-weight: 400; color: var(--rs-muted); }
.vol-slot-meta { font-size: 11.5px; color: var(--rs-muted); margin-top: 2px; }
.vol-slot-btn {
  flex: none; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--rs-ink); background: transparent;
  border: 1px solid var(--rs-line); border-radius: 8px; padding: 6px 11px; cursor: pointer;
}
.vol-slot-btn[disabled] { opacity: .5; cursor: default; }

.vol-warn {
  display: flex; gap: 9px; align-items: flex-start;
  font-size: 12px; line-height: 1.45; margin-top: 10px;
  border: 1px solid #ff990059; background: var(--rs-warn-soft);
  border-radius: 9px; padding: 9px 11px;
}
.vol-note.is-error { color: var(--rs-crit); }

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

<template lang="pug">
.oe-root
  //- Inside a Strategy Planner card the session owns the client and the page furniture
  //- (item 15.23), so the header and its client picker give way to the save bar below.
  report-header(
    v-if="!embedded"
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow') + ' · ' + $t('report.ownerExpectations.eyebrowClass')"
    :title="$t('report.ownerExpectations.title')"
    :client="$t('report.preparedFor')"
    :saved="savedReport"
    @save="saveReport"
    @restore="restoreReport"
    @client-change="onReportClient"
  )

  .oe-steps
    .oe-step(
      v-for="s in stepChips" :key="s.n"
      :class="{ active: step === s.n, done: step > s.n }"
      @click="goTo(s.n)")
      span.n {{ step > s.n ? '✓' : s.n }}
      | {{ s.label }}

  //- Decision class: it opens on the workbook's own sample, and says so, because sample
  //- figures and a real client's look identical and carry no "Illustrative" badge.
  sample-notice(:text="$t('report.sampleFigures')")

  //- A failed recompute must never sit silently behind live-looking figures.
  stale-banner(
    v-if="error"
    :title="$t('report.staleTitle')"
    :message="$t('report.calcUnreachable')"
    :retry-label="$t('report.retry')"
    @retry="recompute")

  //- The headline is a FULL-WIDTH band: a direct child of the root, never inside a column
  //- (RULED 2026-07-27; guarded). The four figures are the workbook's four columns.
  hero-strip(:columns="4" :stale="!!error")
    template(v-if="data && step === 1")
      hero-figure(
        v-for="(label, i) in stageHeadings" :key="'hi' + i"
        :label="label"
        :value="money(data.owners.totals.incomes[i])"
        :sub="$t('report.ownerExpectations.hero.incomeSub')")
    template(v-else-if="data")
      hero-figure(
        v-for="(label, i) in shortHeadings" :key="'hr' + i"
        :label="$t('report.ownerExpectations.hero.revenue', { stage: label })"
        :value="money(data.development.stages[i].revenue)"
        :sub="$t('report.ownerExpectations.hero.revenueSub', { profit: money(data.development.stages[i].netProfit) })")

  .oe-card(v-if="!data")
    p.oe-note {{ $t('report.loading') }}

  //- ─── Step 1 · the owners ─────────────────────────────────────────────────
  template(v-else-if="step === 1")
    .oe-layout
      aside.oe-inputs
        .oe-card
          h2 {{ $t('report.ownerExpectations.owners.yearsTitle') }}
          .oe-quad
            .oe-field(v-for="(unused, i) in form.years" :key="'yr' + i")
              label {{ stageNames[i] }}
              b-input(v-model.number="form.years[i]" type="number" step="1" size="is-small")

        //- THE OWNER LIST — one opens at a time, the shape Mike approved on Multiple
        //- Property (2026-08-21) and the Retirement Review: six owners drawn flat is a wall
        //- of boxes.
        .oe-card
          h2 {{ $t('report.ownerExpectations.owners.listTitle') }}
          .oe-prow(
            v-for="(o, i) in form.owners"
            :key="'orow' + i"
            :class="{ 'is-sel': i === openOwner }"
            @click="openOwner = i")
            span.oe-pn {{ i + 1 }}
            span.oe-pa {{ o.name || $t('report.ownerExpectations.owners.unnamed', { n: i + 1 }) }}
            span.oe-pv {{ money(data.owners.owners[i] ? data.owners.owners[i].incomes[0] : 0) }}

        .oe-card(v-if="openForm")
          h2 {{ openForm.name || $t('report.ownerExpectations.owners.unnamed', { n: openOwner + 1 }) }}
          .oe-field
            label {{ $t('report.ownerExpectations.owners.name') }}
            b-input(v-model="openForm.name" size="is-small")
          .oe-field(v-for="(label, i) in stageHeadings" :key="'inc' + i")
            label {{ label }}
            b-input(v-model.number="openForm.incomes[i]" type="number" step="any" size="is-small")
          template(v-for="(unused, s) in openForm.stages")
            .oe-pair(:key="'st' + s")
              .oe-field
                label {{ $t('report.ownerExpectations.owners.weeklyHours', { stage: stageNames[s + 1] }) }}
                b-input(v-model.number="openForm.stages[s].weeklyHours" type="number" step="any" size="is-small")
              .oe-field
                label {{ $t('report.ownerExpectations.owners.leaveWeeks', { stage: stageNames[s + 1] }) }}
                b-input(v-model.number="openForm.stages[s].leaveWeeks" type="number" step="any" size="is-small")

      section.oe-results
        .oe-card
          h2 {{ $t('report.ownerExpectations.owners.incomeTitle') }}
          .oe-scroll
            table.oe-grid
              thead
                tr
                  th {{ $t('report.ownerExpectations.owners.colOwner') }}
                  th.r(v-for="(label, i) in stageHeadings" :key="'ih' + i") {{ label }}
              tbody
                tr(v-for="(o, i) in data.owners.owners" :key="'ir' + i")
                  td {{ o.name || $t('report.ownerExpectations.owners.unnamed', { n: i + 1 }) }}
                  td.r.oe-num(v-for="(v, j) in o.incomes" :key="'iv' + j") {{ money(v) }}
                tr.oe-total
                  td {{ $t('report.ownerExpectations.owners.totals') }}
                  td.r.oe-num(v-for="(v, j) in data.owners.totals.incomes" :key="'it' + j") {{ money(v) }}

        .oe-card
          h2 {{ $t('report.ownerExpectations.owners.timeTitle') }}
          .oe-scroll
            table.oe-grid
              thead
                tr
                  th {{ $t('report.ownerExpectations.owners.colOwner') }}
                  template(v-for="s in 3")
                    th.r(:key="'th' + s") {{ $t('report.ownerExpectations.owners.colHours', { stage: stageNames[s] }) }}
                    th.r(:key="'tl' + s") {{ $t('report.ownerExpectations.owners.colLeave', { stage: stageNames[s] }) }}
              tbody
                tr(v-for="(o, i) in data.owners.owners" :key="'tr' + i")
                  td {{ o.name || $t('report.ownerExpectations.owners.unnamed', { n: i + 1 }) }}
                  template(v-for="(st, s) in o.stages")
                    td.r.oe-num(:key="'h' + s") {{ num(st.weeklyHours, 1) }}
                    td.r.oe-num(:key="'l' + s") {{ num(st.leaveWeeks, 1) }}
                tr.oe-total
                  td {{ $t('report.ownerExpectations.owners.totals') }}
                  template(v-for="s in 3")
                    td.r.oe-num(:key="'th' + s") {{ num(data.owners.totals.weeklyHours[s - 1], 1) }}
                    td.r.oe-num(:key="'tl' + s") {{ num(data.owners.totals.leaveWeeks[s - 1], 1) }}

        .oe-card(v-if="openForm && openResult")
          .oe-card-h
            h2 {{ $t('report.ownerExpectations.duties.title', { name: openForm.name || $t('report.ownerExpectations.owners.unnamed', { n: openOwner + 1 }) }) }}
            span.oe-sub {{ $t('report.ownerExpectations.duties.sub', { hours: num(openResult.stages[0].weeklyHours, 1) }) }}
          .oe-scroll
            table.oe-grid
              thead
                tr
                  th {{ $t('report.ownerExpectations.duties.colDuty') }}
                  th.r {{ $t('report.ownerExpectations.duties.colNow') }}
                  th.r {{ $t('report.ownerExpectations.duties.colHrs') }}
                  th.r {{ $t('report.ownerExpectations.duties.colFocus') }}
                  th.r {{ $t('report.ownerExpectations.duties.colHrs') }}
                  th
              tbody
                //- 🔴 ONE LIST OF UP TO TEN TASKS, SHARED BY EVERY OWNER — Mike, 2026-09-26
                //- (item 15.24): "1 list of 10 is what i asked for BUT those 10 can be edited".
                //- A rename, an added task or a removed one changes the list for every owner,
                //- as his workbook's one task column does; each owner keeps their own shares.
                //- Rows are the FORM's, so a new row shows before the model answers; its hours
                //- come from the model by position.
                tr(v-for="(d, i) in openForm.duties" :key="d.key")
                  td.oe-task
                    b-input(:value="d.task" size="is-small" :placeholder="$t('report.ownerExpectations.duties.taskPlaceholder')" @input="renameTask(i, $event)")
                  td.r
                    b-input(v-model.number="d.nowPct" type="number" step="any" size="is-small")
                  td.r.oe-num {{ num(dutyResult(i, 'nowHours'), 2) }}
                  td.r
                    b-input(v-model.number="d.focusPct" type="number" step="any" size="is-small")
                  td.r.oe-num {{ num(dutyResult(i, 'focusHours'), 2) }}
                  td.r
                    b-button(
                      size="is-small"
                      type="is-text"
                      :aria-label="$t('report.ownerExpectations.duties.removeTask')"
                      :title="$t('report.ownerExpectations.duties.removeTask')"
                      :disabled="openForm.duties.length <= 1"
                      @click="removeTask(i)") ×
                tr.oe-total
                  td {{ $t('report.ownerExpectations.owners.totals') }}
                  td.r.oe-num(:class="{ 'is-crit': !isWhole(openResult.dutyTotals.now) }") {{ pct(openResult.dutyTotals.now) }}
                  td.r.oe-num {{ num(openResult.dutyTotals.nowHours, 2) }}
                  td.r.oe-num(:class="{ 'is-crit': !isWhole(openResult.dutyTotals.focus) }") {{ pct(openResult.dutyTotals.focus) }}
                  td.r.oe-num {{ num(openResult.dutyTotals.focusHours, 2) }}
                  td
          b-button.oe-add(
            size="is-small"
            :disabled="!canAddTask"
            @click="addTask") {{ $t('report.ownerExpectations.duties.addTask') }}
          p.oe-note {{ $t('report.ownerExpectations.duties.footnote') }}
          p.oe-note(v-if="startingFailed") {{ $t('report.ownerExpectations.duties.startingFailed') }}

        .oe-nav
          b-button(type="is-primary" size="is-small" @click="goTo(2)") {{ $t('report.ownerExpectations.nav.toStages') }}

  //- ─── Step 2 · the business development stages ───────────────────────────
  //- 🔴 ONE FULL-WIDTH COLUMN, INPUTS ON TOP — Mike, 2026-09-25: "put the inputs at the top -
  //- full width and then let the stages sit under them, full width - so they're easier to
  //- see. having the input on the left side just makes the table look too crammed". The
  //- four-stage table needs the whole width; beside a 360px input column it could not have it.
  template(v-else)
    .oe-stack
      .oe-card
        h2 {{ $t('report.ownerExpectations.loan.title') }}
        .oe-loanrow
          .oe-field
            label {{ $t('report.ownerExpectations.loan.amount') }}
            b-input(v-model.number="form.loan.amount" type="number" step="any" size="is-small")
          .oe-field
            label {{ $t('report.ownerExpectations.loan.rate') }}
            b-input(v-model.number="form.loan.ratePct" type="number" step="any" size="is-small")
          .oe-field
            label {{ $t('report.ownerExpectations.loan.term') }}
            b-input(v-model.number="form.loan.termMonths" type="number" step="1" size="is-small")
          .oe-field
            label {{ $t('report.ownerExpectations.loan.type') }}
            b-select(v-model="form.loan.type" size="is-small" expanded)
              option(value="Table") {{ $t('report.ownerExpectations.loan.table') }}
              option(value="Reducing") {{ $t('report.ownerExpectations.loan.reducing') }}
          table.oe-mini
            tbody
              tr
                td {{ $t('report.ownerExpectations.loan.yearOneInterest') }}
                td.r.oe-num {{ money(data.loan.yearOneInterest) }}
              tr
                td {{ $t('report.ownerExpectations.loan.monthly') }}
                td.r.oe-num {{ money(data.loan.monthlyRepayment) }}
              tr.oe-total
                td {{ $t('report.ownerExpectations.loan.annual') }}
                td.r.oe-num {{ money(data.loan.annualRepayment) }}

      section.oe-results
        //- 🔴 THE TITLE, ITS NOTE AND THE STAGE HEADINGS ARE ONE DARK BAND — Mike, 2026-09-25:
        //- "needs colour background - perhaps our dark blue and white font".
        .oe-card.oe-banded
          .oe-scroll
            table.oe-grid
              thead
                tr.oe-band-title
                  th(:colspan="1 + stageHeadings.length")
                    span.oe-band-h {{ $t('report.ownerExpectations.stages.title') }}
                    span.oe-band-sub {{ $t('report.ownerExpectations.stages.sub') }}
                tr
                  th
                  th.r(v-for="(label, i) in stageHeadings" :key="'sh' + i") {{ label }}
              tbody
                tr(v-for="row in stageRows" :key="row.key" :class="{ 'oe-total': row.total }")
                  td {{ $t('report.ownerExpectations.stages.' + row.key) }}
                  td.r(v-for="(s, i) in data.development.stages" :key="row.key + i")
                    b-input(
                      v-if="row.input"
                      v-model.number="form.development[row.key][i]"
                      type="number" step="any" size="is-small")
                    span.oe-num(v-else-if="row.pct") {{ pct(s[row.key]) }}
                    span.oe-num(v-else) {{ money(s[row.key]) }}
          p.oe-note {{ $t('report.ownerExpectations.stages.footnote') }}

        .oe-card.oe-banded
          .oe-scroll
            table.oe-grid.oe-words
              thead
                tr.oe-band-title
                  th(:colspan="1 + stageHeadings.length")
                    span.oe-band-h {{ $t('report.ownerExpectations.stages.wordsTitle') }}
                tr
                  th
                  th(v-for="(label, i) in stageHeadings" :key="'wh' + i") {{ label }}
              tbody
                tr(v-for="key in wordRows" :key="key")
                  td {{ $t('report.ownerExpectations.stages.' + key) }}
                  td(v-for="(unused, i) in form.development[key]" :key="key + i")
                    b-input(v-model="form.development[key][i]" type="textarea" rows="2" size="is-small" maxlength="500")

        .oe-nav
          b-button(size="is-small" @click="goTo(1)") {{ $t('report.ownerExpectations.nav.back') }}
          //- In a session the client's plan is what prints, never this screen on its own.
          b-button(v-if="!embedded" type="is-primary" size="is-small" @click="print") {{ $t('report.ownerExpectations.nav.print') }}

  //- 🔴 DECISION B OF THE APPROVED DRAWING — the card saves to the client's ONE Owner
  //- Expectations record, the same one the model's own page opens, never into the session.
  .oe-embedbar(v-if="embedded")
    b-button(
      type="is-primary"
      size="is-small"
      :loading="savedReport.busy"
      :disabled="!clientId"
      @click="saveReport") {{ $t('report.ownerExpectations.embedded.save', { client: clientName }) }}
    span.oe-note(v-if="savedReport.error") {{ savedReport.error }}
    span.oe-note(v-else-if="savedReport.notice") {{ savedReport.notice }}
    span.oe-note(v-else) {{ $t('report.ownerExpectations.embedded.oneRecord') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'
import savedReport from '~/mixins/savedReport'
import SHIPPED from '~/data/owner-focus-tasks.json'

/** This model's catalogue route — the key its saved figures live under, on any screen. */
const MODEL_ROUTE = '/owner-expectations'

/** The workbook's ten tasks, in its order — the shipped starting list, one home. */
const SHIPPED_TASKS = SHIPPED.tasks

/**
 * The backend's ceilings — `MAX_TASKS` / `MAX_TASK_NAME` in the maths module. Ten, and across
 * all owners together: Mike, 2026-09-26 (item 15.24), "no more in number than original doc".
 */
const MAX_TASKS = 10
const MAX_TASK_NAME = 80

/** The saved-report store's ceiling for a piece of text (`savedReports.js` MAX_STRING). */
const MAX_SAVED_TEXT = 200

/** The sample's split, in display per cent, shared by all six owners in the workbook. */
const SAMPLE_NOW = [10, 15, 12, 13, 14, 12, 14, 10, 0, 0]
const SAMPLE_FOCUS = [40, 0, 25, 0, 20, 0, 0, 5, 10, 0]

/** A render handle for a task row, so a name input keeps focus while it is typed. Never saved. */
let taskSeq = 0
function taskRow (task, nowPct, focusPct) {
  taskSeq += 1
  return { key: 'd' + taskSeq, task, nowPct, focusPct }
}

function sampleOwner (name, incomes, stages) {
  return {
    name,
    incomes,
    stages,
    duties: SHIPPED_TASKS.map((task, i) => taskRow(task, SAMPLE_NOW[i], SAMPLE_FOCUS[i]))
  }
}

/** Same names, same order? */
function sameList (a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/** A saved figure, or blank. */
function figureOrBlank (v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function blankStages (firstHours) {
  return [
    { weeklyHours: firstHours, leaveWeeks: null },
    { weeklyHours: null, leaveWeeks: null },
    { weeklyHours: null, leaveWeeks: null }
  ]
}

/**
 * OwnerExpectations — Business Owner Expectations and Business Development Stages
 * (Growth · Decision class). Item 5.4.
 *
 * EACH OWNER'S OWN TASKS, SAVED AGAINST THE CLIENT — Mike's ruling, 2026-09-24. Every owner
 * starts from the starting list cascaded down the tiers (the hub's Owner Focus Tasks tab) and
 * may rename, remove and add their own. The figures are saved per client through the shared
 * `savedReport` mixin, as ten other models already are.
 *
 * ONE MODEL, TWO STEPS — Mike's ruling, 2026-09-24. The source workbook links its two
 * sheets: the development stages read their net profit straight from the owners' income
 * totals. Two separate models would have the advisor type every income twice, and let the
 * two disagree. Step 1 is the owners; step 2 is the business each stage needs.
 *
 * DECISION class — the client's real owners and figures typed in, so NO "Illustrative"
 * badge. It opens on the workbook's own sample with a `SampleNotice` saying so.
 *
 * All calculation is backend-only (POST /api/report/owner-expectations); every figure shown
 * comes back from the model. Rates and duty splits are held in DISPLAY form (per cent) and
 * divided by 100 in the payload — the convention Lease vs Buy and the Retirement Review use.
 */
export default {
  name: 'OwnerExpectations',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute, savedReport],

  props: {
    /** Hosted inside a Strategy Planner card rather than on its own page (item 15.23). */
    embedded: { type: Boolean, default: false },
    /** The session's client — embedded only; the page chooses its own on the header. */
    clientId: { type: String, default: '' },
    /** That client's name, for the save button. */
    clientName: { type: String, default: '' },
    /** The planner's Bearer token — embedded only, since the page reads its own. */
    token: { type: String, default: '' }
  },

  data () {
    return {
      step: 1,
      // Set once a client's saved figures are on the screen, so a starting list arriving
      // late can never overwrite them — Multiple Property's `savedRulesApplied`.
      savedApplied: false,
      // The firm's starting list could not be read; new owners fall back to the workbook's.
      startingFailed: false,
      // Which owner is open on step 1. One at a time — see the owner list in the template.
      openOwner: 0,
      // The workbook's own sample (`design/report-source-models/BO Expectations.xlsx`).
      form: {
        years: [2025, 2026, 2029, 2031],
        owners: [
          sampleOwner('Andy', [120000, 125000, 175000, 225000], [
            { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 40, leaveWeeks: 8 }, { weeklyHours: 30, leaveWeeks: 12 }
          ]),
          sampleOwner('Bill', [120001, 125001, 195000, 250000], [
            { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 45, leaveWeeks: 6 }
          ]),
          sampleOwner('Shirley', [null, null, null, null], blankStages(40)),
          sampleOwner('Bob', [null, null, null, null], blankStages(38)),
          sampleOwner('John', [null, null, null, null], blankStages(35)),
          sampleOwner('Dick', [null, null, null, null], blankStages(30))
        ],
        development: {
          owners: [2, 3, 4, 5],
          cogs: [612382, 612382, 612382, 612382],
          salesPromo: [85000, 85000, 85000, 85000],
          fixedCosts: [220000, 240000, 300000, 350000],
          loanPayments: [87000, 87000, 87000, 87000],
          depreciation: [67000, 67000, 67000, 67000],
          totalAssets: [218250, 250000, 350000, 500000],
          debt: [87960, 100000, 125000, 90000],
          staffFullTime: [7, 8, 9, 13],
          staffPartTime: [2, 2, 2, 2],
          premises: ['', '', '', ''],
          markets: ['', '', '', ''],
          coreServices: ['', '', '', ''],
          skills: ['', '', '', '']
        },
        loan: { amount: 375000, ratePct: 7, termMonths: 60, type: 'Table' }
      },
      data: null
      // `error` (the stale flag) comes from the reportRecompute mixin.
    }
  },

  computed: {
    /**
     * 🔴 THE SAVED RECORD IS KEYED BY THIS MODEL'S ROUTE, WHEREVER THE SCREEN IS SHOWN.
     * Overrides the mixin's `$route.path`: hosted in the planner that reads
     * `/strategy-planner`, which would open a second, separate record for the same client —
     * the two-copies drift Decision B of item 15.23 rules out.
     * @returns {string}
     */
    savedReportRoute () {
      return MODEL_ROUTE
    },

    stepChips () {
      return [
        { n: 1, label: this.$t('report.ownerExpectations.steps.owners') },
        { n: 2, label: this.$t('report.ownerExpectations.steps.stages') }
      ]
    },

    /** "Current", "Stage 1", "Stage 2", "Stage 3" — for the years, hours and leave. */
    stageNames () {
      const t = k => this.$t('report.ownerExpectations.stageShort.' + k)
      return [t('current'), t('stage1'), t('stage2'), t('stage3')]
    },

    /** The four column headings with their years, as the workbook writes them (D5, D6, D9, D12). */
    stageHeadings () {
      const t = k => this.$t('report.ownerExpectations.stageFull.' + k)
      return [t('current'), t('stage1'), t('stage2'), t('stage3')].map((name, i) => this.withYear(name, i))
    },

    /** "Stage 1 (2026)" — the short name with its year, for the step 2 headline. */
    shortHeadings () {
      return this.stageNames.map((name, i) => this.withYear(name, i))
    },

    /** The open owner's FORM object, bound directly so its fields are editable. */
    openForm () {
      return this.form.owners[this.openOwner] || this.form.owners[0] || null
    },

    /**
     * Can the shared list take another task? Not past the original workbook's ten (15.24).
     * @returns {boolean}
     */
    canAddTask () {
      return Boolean(this.openForm) && this.openForm.duties.length < MAX_TASKS
    },

    /** The open owner as the model returned them. */
    openResult () {
      return this.data ? this.data.owners.owners[this.openOwner] || null : null
    },

    /**
     * The Business Development Stages rows, in the workbook's order. `input` rows are typed;
     * the rest are the model's back-calculation from the owners' income.
     */
    stageRows () {
      return [
        { key: 'owners', input: true },
        { key: 'revenue', total: true },
        { key: 'cogsPct', pct: true },
        { key: 'cogs', input: true },
        { key: 'grossProfit' },
        { key: 'salesPromoPct', pct: true },
        { key: 'salesPromo', input: true },
        { key: 'totalGrossProfit' },
        { key: 'fixedCosts', input: true },
        { key: 'loanPayments', input: true },
        { key: 'depreciation', input: true },
        { key: 'fixedCostsPct', pct: true },
        { key: 'netProfit', total: true },
        { key: 'netProfitPct', pct: true },
        { key: 'totalAssets', input: true },
        { key: 'debt', input: true },
        { key: 'debtRatio', pct: true },
        { key: 'staffFullTime', input: true },
        { key: 'staffPartTime', input: true }
      ]
    },

    wordRows () {
      return ['premises', 'markets', 'coreServices', 'skills']
    }
  },

  watch: {
    form: { handler () { this.queueRecompute() }, deep: true },
    clientId () { this.openEmbeddedClient() }
  },

  mounted () {
    this.recompute()
    this.loadStartingTasks()
    this.openEmbeddedClient()
  },

  methods: {
    /**
     * Embedded only: sign the saved-report mixin in with the planner's token and open the
     * session's client, as the header's picker does on the model's own page.
     */
    openEmbeddedClient () {
      if (!this.embedded || !this.token) { return }
      this.savedReport.token = this.token
      this.savedReport.mode = 'advisor'
      this.onReportClient({ clientId: this.clientId, clientName: this.clientName })
    },

    /**
     * The starting task list this firm has inherited down the tiers (item 5.4), read from the
     * authenticated endpoint — the Multiple Property tax-rules pattern. Never blocks the screen:
     * a failed read keeps the workbook's list and says so.
     */
    async loadStartingTasks () {
      // Called from mounted(), which never runs on the server; the check keeps it honest.
      if (typeof window === 'undefined' || typeof fetch !== 'function') { return }
      try {
        const token = this.token || window.localStorage.getItem('advisor_e_token') || 'dev-local-bypass'
        const res = await fetch('/api/owner-focus-tasks', { headers: { Authorization: 'Bearer ' + token } })
        if (!res.ok) { this.startingFailed = true; return }
        const body = await res.json()
        if (body && Array.isArray(body.tasks)) { this.applyStartingTasks(body.tasks) }
      } catch (e) {
        this.startingFailed = true
      }
    },

    /**
     * Put the firm's starting list on every owner.
     *
     * 🔴 THE SAMPLE SPLIT BELONGS TO THE WORKBOOK'S TASKS AND GOES NOWHERE ELSE. Where the list
     * in force is the shipped one, the screen keeps the workbook's sample exactly. Where a tier
     * has written its own, every owner starts on those tasks with a blank split — carrying the
     * sample's 10% / 15% across by position would put the workbook's figures against tasks it
     * never named. And saved figures always win: a client's own tasks are never overwritten.
     *
     * @param {string[]} tasks
     */
    applyStartingTasks (tasks) {
      if (this.savedApplied) { return }
      const clean = tasks.filter(t => typeof t === 'string' && t.trim()).slice(0, MAX_TASKS)
      if (!clean.length || sameList(clean, SHIPPED_TASKS)) { return }
      this.form.owners.forEach((o) => {
        o.duties = clean.map(t => taskRow(t, null, null))
      })
    },

    /** Add a blank task to the shared list — on every owner, with no share yet. */
    addTask () {
      if (!this.canAddTask) { return }
      this.form.owners.forEach((o) => { o.duties.push(taskRow('', null, null)) })
    },

    /**
     * Rename the task at position `i` for every owner — the list is one list (item 15.24).
     * @param {number} i
     * @param {string} name
     */
    renameTask (i, name) {
      this.form.owners.forEach((o) => { if (o.duties[i]) { o.duties[i].task = name } })
    },

    /**
     * Remove the task at position `i` from every owner — never the last, or the split has
     * nowhere to go.
     * @param {number} i
     */
    removeTask (i) {
      if (!this.openForm || this.openForm.duties.length <= 1) { return }
      this.form.owners.forEach((o) => { o.duties.splice(i, 1) })
    },

    /**
     * Make the owners' task lists one list — a record saved while each owner kept their own is
     * joined by task name, in the order first met, up to ten, and each owner keeps their shares
     * against the names they held. Lists that already agree are left exactly as they are.
     */
    shareTaskList () {
      const owners = this.form.owners
      const names = owners.map(o => o.duties.map(d => String(d.task || '').trim()).join('\u0000'))
      if (names.every(n => n === names[0])) { return }
      const shared = []
      owners.forEach(o => o.duties.forEach((d) => {
        const name = String(d.task || '').trim()
        if (name && !shared.includes(name) && shared.length < MAX_TASKS) { shared.push(name) }
      }))
      if (!shared.length) { return }
      owners.forEach((o) => {
        o.duties = shared.map((name) => {
          const d = o.duties.find(x => String(x.task || '').trim() === name)
          return taskRow(name, d ? d.nowPct : null, d ? d.focusPct : null)
        })
      })
    },

    /** The model's figure for the open owner's task at position `i`, or 0 before it answers. */
    dutyResult (i, field) {
      const d = this.openResult && this.openResult.duties[i]
      return d ? d[field] : 0
    },

    /**
     * The figures saved per client — consumed by the savedReport mixin. The store takes a FLAT
     * object of figures, lists of figures and lists of short names, so each owner is spread
     * over `o1.*` … `o6.*` keys, the way Multiple Property spreads its properties. Text is cut
     * to the store's own ceiling here, so a save can never be refused for a long note.
     * @returns {object}
     */
    reportInputs () {
      const f = this.form
      const text = (v, max) => String(v || '').slice(0, max)
      const out = {
        years: f.years.map(figureOrBlank),
        'loan.amount': figureOrBlank(f.loan.amount),
        'loan.ratePct': figureOrBlank(f.loan.ratePct),
        'loan.termMonths': figureOrBlank(f.loan.termMonths),
        'loan.type': f.loan.type
      }
      f.owners.forEach((o, i) => {
        const p = 'o' + (i + 1) + '.'
        out[p + 'name'] = text(o.name, 80)
        out[p + 'incomes'] = o.incomes.map(figureOrBlank)
        out[p + 'hours'] = o.stages.map(s => figureOrBlank(s.weeklyHours))
        out[p + 'leave'] = o.stages.map(s => figureOrBlank(s.leaveWeeks))
        out[p + 'tasks'] = o.duties.map(d => text(d.task, MAX_TASK_NAME))
        out[p + 'now'] = o.duties.map(d => figureOrBlank(d.nowPct))
        out[p + 'focus'] = o.duties.map(d => figureOrBlank(d.focusPct))
      })
      Object.keys(f.development).forEach((k) => {
        const v = f.development[k]
        out['dev.' + k] = this.wordRows.includes(k)
          ? v.map(x => text(x, MAX_SAVED_TEXT))
          : v.map(figureOrBlank)
      })
      return out
    },

    /**
     * Load a saved set back — consumed by the savedReport mixin. Takes only the keys this
     * screen knows, each in its own shape; anything else in the row is ignored. Recompute
     * follows from the deep watcher.
     * @param {object} inputs
     */
    applyReportInputs (inputs) {
      if (!inputs || typeof inputs !== 'object') { return }
      const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : null)
      const figures = (v, n) => {
        const a = list(v, n)
        return a ? Array.from({ length: n }, (_, i) => figureOrBlank(a[i])) : null
      }
      const f = this.form
      const years = figures(inputs.years, 4)
      if (years) { f.years = years }
      if (figureOrBlank(inputs['loan.amount']) !== null) { f.loan.amount = inputs['loan.amount'] }
      if (figureOrBlank(inputs['loan.ratePct']) !== null) { f.loan.ratePct = inputs['loan.ratePct'] }
      if (figureOrBlank(inputs['loan.termMonths']) !== null) { f.loan.termMonths = inputs['loan.termMonths'] }
      if (inputs['loan.type'] === 'Table' || inputs['loan.type'] === 'Reducing') { f.loan.type = inputs['loan.type'] }

      f.owners.forEach((o, i) => {
        const p = 'o' + (i + 1) + '.'
        if (typeof inputs[p + 'name'] === 'string') { o.name = inputs[p + 'name'] }
        const incomes = figures(inputs[p + 'incomes'], 4)
        if (incomes) { o.incomes = incomes }
        const hours = figures(inputs[p + 'hours'], 3)
        const leave = figures(inputs[p + 'leave'], 3)
        if (hours && leave) {
          o.stages = [0, 1, 2].map(s => ({ weeklyHours: hours[s], leaveWeeks: leave[s] }))
        }
        const tasks = list(inputs[p + 'tasks'], MAX_TASKS)
        if (tasks && tasks.length) {
          const now = list(inputs[p + 'now'], MAX_TASKS) || []
          const focus = list(inputs[p + 'focus'], MAX_TASKS) || []
          o.duties = tasks.map((t, j) => taskRow(
            typeof t === 'string' ? t : '', figureOrBlank(now[j]), figureOrBlank(focus[j])
          ))
        }
      })
      this.shareTaskList()

      Object.keys(f.development).forEach((k) => {
        const v = list(inputs['dev.' + k], 4)
        if (!v) { return }
        f.development[k] = this.wordRows.includes(k)
          ? Array.from({ length: 4 }, (_, i) => (typeof v[i] === 'string' ? v[i] : ''))
          : Array.from({ length: 4 }, (_, i) => figureOrBlank(v[i]))
      })
      this.savedApplied = true
    },

    /** The POST this screen recomputes with — consumed by the reportRecompute mixin. */
    recomputeRequest () {
      const f = this.form
      return {
        url: '/api/report/owner-expectations',
        body: {
          years: f.years,
          owners: f.owners.map(o => ({
            name: o.name,
            incomes: o.incomes,
            stages: o.stages.map(s => ({ weeklyHours: s.weeklyHours, leaveWeeks: s.leaveWeeks })),
            duties: o.duties.map(d => ({ task: d.task, now: this.rate(d.nowPct), focus: this.rate(d.focusPct) }))
          })),
          development: f.development,
          loan: {
            amount: f.loan.amount,
            rate: this.rate(f.loan.ratePct),
            termMonths: f.loan.termMonths,
            type: f.loan.type
          }
        }
      }
    },

    goTo (n) {
      this.step = n
    },

    /** A stage name with its year, or the name alone while the year is blank. */
    withYear (name, i) {
      const year = this.form.years[i]
      return year ? this.$t('report.ownerExpectations.stageWithYear', { stage: name, year }) : name
    },

    /** A display percentage to the decimal the model expects. */
    rate (pct) {
      return Number(pct || 0) / 100
    },

    /** A decimal as a percentage, for display. Null is a figure that has no meaning — a dash. */
    pct (value) {
      if (value === null) { return '—' }
      return (Number(value || 0) * 100).toFixed(1) + '%'
    },

    /** Does a duty split add up to the whole week? Tolerates floating-point noise. */
    isWhole (share) {
      return Math.abs(Number(share || 0) - 1) < 0.0005
    },

    /**
     * Hand the page to the browser's own print dialogue. Client-only: `window` does not exist
     * during server-side render, and this runs from a click, never at setup.
     */
    print () {
      if (process.client && typeof window !== 'undefined' && window.print) { window.print() }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
/* [A] Root: one gap value, so every vertical gap is identical (RULED 2026-07-27). */
.oe-root { display: flex; flex-direction: column; gap: 16px; }
/* [B] Reset the shared ReportHeader's `margin: 0 auto 22px` — guarded by
   reportHeaderFullWidth.test.js. */
.oe-root ::v-deep .rs-top { margin: 0; }

/* Step chips, read off the Retirement Review. */
.oe-steps { display: flex; gap: 10px; flex-wrap: wrap; }
.oe-step {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
}
.oe-step .n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--rs-line);
  color: var(--rs-ink); font-size: 11px;
}
.oe-step.active { color: var(--rs-accent-contrast); background: var(--rs-accent); border-color: var(--rs-accent); }
.oe-step.active .n { background: #ffffff30; color: var(--rs-accent-contrast); }
.oe-step.done { color: var(--rs-good); }
.oe-step.done .n { background: var(--rs-good-soft); color: var(--rs-good); }

/* [D] House two-column grid, collapsing at the standard breakpoint. */
.oe-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .oe-layout { grid-template-columns: 1fr; } }
.oe-inputs, .oe-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* Step 2: every card full width, the Quick Calculator's inputs in one row across the top. */
.oe-stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.oe-loanrow { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)) minmax(240px, 1.6fr); gap: 12px; align-items: start; }
.oe-loanrow .oe-field { margin-bottom: 0; }
@media (max-width: 860px) { .oe-loanrow { grid-template-columns: 1fr 1fr; } }

/* Cards read the shared tokens. NO top edge — RULED 2026-08-31. */
.oe-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad); min-width: 0;
}
.oe-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin: 0 0 12px;
}
.oe-card-h { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.oe-card-h h2 { margin: 0 0 12px; }
.oe-sub { font-size: 12px; color: var(--rs-muted); }

/* Step 2's two tables: title, note and stage headings in one dark band (Mike, 2026-09-25). */
.oe-banded { padding: 0; overflow: hidden; }
.oe-banded thead th { background: var(--rs-ink); color: #fff; padding-top: 10px; padding-bottom: 10px; border: 0; }
.oe-banded thead tr { border: 0; }
.oe-banded .oe-band-title th { padding-top: 14px; padding-bottom: 4px; text-align: left; }
.oe-banded .oe-band-h { font-size: var(--rs-card-title-size); letter-spacing: .1em; font-weight: 600; margin-right: 14px; }
.oe-banded .oe-band-sub { font-size: 12px; letter-spacing: 0; text-transform: none; font-weight: 400; color: #cfe0f2; }
.oe-banded th:first-child, .oe-banded td:first-child { padding-left: var(--rs-card-pad); }
.oe-banded th:last-child, .oe-banded td:last-child { padding-right: var(--rs-card-pad); }
.oe-banded .oe-note { padding: 0 var(--rs-card-pad) var(--rs-card-pad); }
.oe-banded .oe-scroll { padding-bottom: 8px; }
.oe-note { font-size: 12px; color: var(--rs-muted); line-height: 1.45; margin: 8px 0 0; }

.oe-field { margin-bottom: 14px; }
.oe-field:last-child { margin-bottom: 0; }
.oe-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; }
.oe-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.oe-quad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.oe-quad .oe-field { margin-bottom: 0; }

/* The owner list — the Retirement Review's property list. */
.oe-prow {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px; border-radius: 9px; cursor: pointer;
  border: 1px solid transparent;
}
.oe-prow + .oe-prow { margin-top: 2px; }
.oe-prow .oe-pn { font-size: 11px; font-weight: 600; color: var(--rs-muted); min-width: 14px; }
.oe-prow .oe-pa {
  flex: 1; font-size: 12.5px; color: var(--rs-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.oe-prow .oe-pv { font-size: 12.5px; color: var(--rs-muted); font-variant-numeric: tabular-nums; }
.oe-prow.is-sel { background: var(--rs-panel-2); border-color: var(--rs-card-border); }
.oe-prow.is-sel .oe-pn, .oe-prow.is-sel .oe-pa { color: var(--rs-ink); font-weight: 600; }

/* Entry boxes sized to their content, as on the High Level Budget. */
.oe-grid ::v-deep .control, .oe-mini ::v-deep .control { max-width: 118px; margin-left: auto; }
.oe-grid ::v-deep input, .oe-mini ::v-deep input { text-align: right; }
.oe-words ::v-deep .control { max-width: none; }
/* A task name is words, not a figure: full width and left-aligned. */
.oe-grid .oe-task ::v-deep .control { max-width: none; margin-left: 0; }
.oe-grid .oe-task ::v-deep input { text-align: left; }
.oe-add { margin-top: 10px; }

table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
.oe-mini { margin-top: 12px; }
.oe-scroll { overflow-x: auto; }
.oe-scroll table { min-width: 620px; }
th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 600; padding: 0 10px 9px 0;
  border-bottom: 1px solid var(--rs-line);
}
th.r, td.r { text-align: right; }
td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--rs-line); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
.oe-num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.oe-total td { border-top: 2px solid var(--rs-ink); font-weight: 700; }
.is-crit { color: var(--rs-crit); }

.oe-nav { display: flex; gap: 10px; flex-wrap: wrap; }
.oe-embedbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--rs-line); padding-top: 12px; }
</style>

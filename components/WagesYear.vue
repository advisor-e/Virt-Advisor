<template lang="pug">
.wy-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  hero-strip(:columns="3")
    hero-figure(:label="$t('report.wagesReview.year.heroMonths')" :value="String(months.length)")
    hero-figure(:label="$t('report.wagesReview.year.heroHeadcount')" :value="averageHeadcount")
    hero-figure(:label="$t('report.wagesReview.year.heroRises')" :value="String(peopleWithRise)")

  .wy-card
    h3.wy-title {{ $t('report.wagesReview.year.monthsTitle') }}
    p.wy-note {{ $t('report.wagesReview.year.monthsNote') }}
    .wy-scroll
      table.wy-grid.wy-grid--months
        tbody
          tr
            td.wy-rowlabel {{ $t('report.wagesReview.year.monthName') }}
            td(v-for="(m, i) in months" :key="'n' + i")
              b-input(v-model="m.name" size="is-small")
          tr
            td.wy-rowlabel {{ $t('report.wagesReview.year.whichSeason') }}
            td(v-for="(m, i) in months" :key="'s' + i")
              //- Bound by KEY, labelled by the firm's own name: renaming a season in
              //- step 2 must not orphan the months already assigned to it.
              b-select(v-model="m.season" size="is-small")
                option(v-for="opt in seasonOptions" :key="opt.key" :value="opt.key") {{ opt.name }}
          tr
            td.wy-rowlabel {{ $t('report.wagesReview.year.productionDays') }}
            td(v-for="(m, i) in months" :key="'d' + i")
              b-input(v-model.number="m.productionDays" type="number" step="any" size="is-small")
          tr
            td.wy-rowlabel {{ $t('report.wagesReview.year.allowancesApply') }}
            td(v-for="(m, i) in months" :key="'a' + i")
              b-select(v-model="m.allowanceApplies" size="is-small")
                option(:value="true") {{ $t('report.wagesReview.year.yes') }}
                option(:value="false") {{ $t('report.wagesReview.year.no') }}

  .wy-card
    h3.wy-title {{ $t('report.wagesReview.year.payrollTitle') }}
    p.wy-note {{ $t('report.wagesReview.year.payrollNote') }}
    .wy-scroll
      table.wy-grid
        thead
          tr
            th.wy-rowlabel {{ $t('report.wagesReview.year.person') }}
            th(v-for="(m, i) in months" :key="i") {{ m.name }}
        tbody
          tr(v-for="row in rows" :key="'p' + row.key")
            td.wy-rowlabel {{ row.label }}
            td.wy-tick(v-for="(m, i) in months" :key="i")
              b-checkbox(v-model="row.onPayroll[i]" size="is-small")

  .wy-card
    h3.wy-title {{ $t('report.wagesReview.year.risesTitle') }}
    p.wy-note {{ $t('report.wagesReview.year.risesNote') }}
    .wy-scroll
      table.wy-grid
        thead
          tr
            th.wy-rowlabel {{ $t('report.wagesReview.year.person') }}
            th.wy-open {{ $t('report.wagesReview.year.openingRate') }}
            th(v-for="(m, i) in months" :key="i") {{ m.name }}
        tbody
          tr(v-for="row in rows" :key="'r' + row.key")
            td.wy-rowlabel {{ row.label }}
            td.wy-open.wy-derived {{ row.openingRate }}
            td(v-for="(m, i) in months" :key="i")
              b-input(v-model.number="row.payRise[i]" type="number" step="any" size="is-small")

  .wy-actions
    b-button(@click="$emit('back')") {{ $t('report.wagesReview.year.back') }}
    b-button(type="is-primary" @click="confirm") {{ $t('report.wagesReview.year.continue') }}
</template>

<script>
/**
 * WagesYear — step 3 of the Wages/Salary Review: the year ahead. The twelve months and
 * what each one is, who is on the payroll in each of them, and each person's pay rises.
 *
 * THE LARGEST STEP OF THE FIVE, and it is large because the workbook is: the Annual
 * Hiring Plan carries 453 typed cells. Three grids rather than one, each twelve months
 * wide, because they answer three different questions and a single table of ~750 controls
 * would be unreadable.
 *
 * WHERE EACH GRID'S CELLS LIVE, all verified as typed in the stored XML:
 *   - The months — `Cash Report` rows 9 (name), 7 (season), 5 (production days) and 11
 *     (allowances apply). The Annual Hiring Plan MIRRORS these in calculated cells, so
 *     the Cash Report is the source and this grid edits it.
 *   - On the payroll — `Annual Hiring Plan` F..Q on each person's row (7 onward), blank
 *     meaning off. The sample's 29 people carry 11 distinct patterns.
 *   - Pay rises — `Annual Hiring Plan` F..Q on the "Team Wage/ Salary %" block (row 46
 *     onward), one row per person under the same four division headings. E is the opening
 *     pay rate and S the adjusted one, both CALCULATED, so neither gets a control: the
 *     opening rate is shown read-only because a rise means nothing without it.
 *
 * ⚠ Column S of that block carries stray text from an overlapping table ("Pdctn' Hrs",
 * "Federal Taxes", "Band 1") on rows that have no adjusted rate. Read as data it is
 * nonsense; it is not read here, and it is the same interleaving that made the shutdown
 * allowance unreadable.
 *
 * Rises are held in DISPLAY form (5, not 0.05) and converted in the payload, the same
 * convention as steps 1 and 2.
 *
 * The season choices come from STEP 2, not from a list here: a firm renames its seasons,
 * and the engine matches a month to a season by NAME. A hardcoded list would silently
 * send every month to the standard-season fallback the moment a firm renamed one.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'

/** The workbook's own financial year, `Cash Report` E9..P9. */
const SAMPLE_MONTHS = [
  { name: 'Apr', season: 'std', productionDays: 22, allowanceApplies: true },
  { name: 'May', season: 'dry', productionDays: 21, allowanceApplies: true },
  { name: 'Jun', season: 'std', productionDays: 23, allowanceApplies: false },
  { name: 'Jul', season: 'wet', productionDays: 23, allowanceApplies: true },
  { name: 'Aug', season: 'std', productionDays: 21, allowanceApplies: false },
  { name: 'Sep', season: 'dry', productionDays: 19, allowanceApplies: false },
  { name: 'Oct', season: 'std', productionDays: 20, allowanceApplies: false },
  { name: 'Nov', season: 'dry', productionDays: 21, allowanceApplies: false },
  { name: 'Dec', season: 'std', productionDays: 11, allowanceApplies: false },
  { name: 'Jan', season: 'dry', productionDays: 10, allowanceApplies: true },
  { name: 'Feb', season: 'std', productionDays: 18, allowanceApplies: true },
  { name: 'Mar', season: 'std', productionDays: 22, allowanceApplies: true }
]

/**
 * Who is on the payroll, one twelve-character string per person in team order — the
 * `Annual Hiring Plan` F..Q cells. A string rather than twelve booleans because the
 * SHAPE of a year is the thing a reader needs to check against the sheet.
 */
const SAMPLE_ON = [
  '111111111111', '001111111100', '000011111111', '000000000000', // Admin
  '001111111111', '001111111111', '000001111111', '000000000000', // Sales
  '111111000000', '111111111111', '111111111111', '111111111111',
  '111111111111', '111111111111', '000111111111', '000111111111',
  '000011111111', '000011111111', '000001111111', '000001111111',
  '011111111111', '110111111111', '000000000111', '000000000111',
  '000000000000', //                                                Production
  '111111111111', '111111111111', '000000000000', '000000000000' //  Management
]

/**
 * Pay rises, sparse: person index → [display percent, first month, last month] inclusive.
 * Nineteen of the 29 get none, so spelling out 348 zeroes would hide the ten that matter.
 * `Annual Hiring Plan` rows 49 onward.
 */
const SAMPLE_RISES = {
  0: [5, 4, 11], //   Mary G, from Aug
  4: [3, 6, 11], //   Max, from Oct
  9: [5, 3, 11], //   Bob
  11: [6, 3, 11], //  Bruce
  13: [7, 3, 11], //  Butch
  20: [3, 5, 10], //  Butch (the second) — and it STOPS in Feb, which is why a range is
  //                  carried rather than a start month
  25: [4, 3, 11], //  Stevie
  26: [4, 3, 11], //  Natalie
  27: [4, 3, 11],
  28: [4, 3, 11]
}

/** @param {*} v @returns {number} v as a number, 0 when it is not one. */
function num (v) {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

/**
 * One person's twelve rises, in display percent.
 * @param {number} i the person's index in team order
 * @returns {number[]}
 */
function sampleRise (i) {
  const spec = SAMPLE_RISES[i]
  const out = []
  for (let m = 0; m < 12; m++) {
    out.push(spec && m >= spec[1] && m <= spec[2] ? spec[0] : 0)
  }
  return out
}

export default {
  name: 'WagesYear',

  components: { SampleNotice, HeroStrip, HeroFigure },

  props: {
    /** Step 1's confirmed people, in its display order. */
    people: { type: Array, default: () => [] },
    /** Step 2's confirmed season names, { wet, std, dry }. */
    seasonNames: { type: Object, default: null },
    /** A previously confirmed payload (stepping back); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      months: JSON.parse(JSON.stringify(SAMPLE_MONTHS)),
      rows: [],
      showSample: true
    }
  },

  computed: {
    /**
     * The seasons to choose from, in the workbook's own column order. The names come
     * from step 2 so a renamed season reaches this picker; the KEY is what a month
     * stores, so a later rename does not orphan the months already assigned.
     * @returns {Array<{key: string, name: string}>}
     */
    seasonOptions () {
      const names = this.seasonNames || {}
      return ['dry', 'std', 'wet'].map(k => ({
        key: k,
        name: names[k] || this.$t('report.wagesReview.year.season.' + k)
      }))
    },
    /**
     * Average number of people on the payroll across the twelve months. The figure an
     * advisor sanity-checks the plan against — a year that quietly empties out shows here
     * before it shows on the report.
     * @returns {string}
     */
    averageHeadcount () {
      if (this.rows.length === 0) { return '0' }
      let total = 0
      for (let m = 0; m < this.months.length; m++) {
        total += this.rows.filter(r => r.onPayroll[m]).length
      }
      return String(Math.round(total / Math.max(this.months.length, 1)))
    },
    /** @returns {number} people receiving a rise at some point in the year. */
    peopleWithRise () {
      return this.rows.filter(r => r.payRise.some(v => num(v) > 0)).length
    }
  },

  created () {
    this.buildRows()
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /**
     * One row per person from step 1, seeded with the workbook's own hiring plan where
     * the team is still the sample's. A person step 1 added beyond the sample starts on
     * the payroll all year with no rise — the least surprising default, and the only one
     * that is not an invented figure.
     */
    buildRows () {
      this.rows = this.people.map((p, i) => ({
        key: i,
        label: p.name || this.$t('report.wagesReview.year.unnamed'),
        openingRate: num(p.payRate),
        onPayroll: (SAMPLE_ON[i] || '111111111111').split('').map(c => c === '1'),
        payRise: sampleRise(i)
      }))
    },

    /**
     * Rebuild from a confirmed payload, turning decimals back into display percentages.
     * @param {Object} payload a previous `confirm` emission
     */
    applyRestore (payload) {
      if (Array.isArray(payload.months) && payload.months.length > 0) {
        // A payload carries the season by NAME (that is what the engine reads); the
        // controls hold the key, so map it back or every month lands on a blank picker.
        const names = this.seasonNames || {}
        const keyOf = (name) => {
          const hit = ['dry', 'std', 'wet'].find(k => names[k] === name)
          return hit || (['dry', 'std', 'wet'].includes(name) ? name : 'std')
        }
        this.months = payload.months.map(m => ({
          name: m.name,
          season: keyOf(m.season),
          productionDays: m.productionDays,
          allowanceApplies: m.allowanceApplies === true
        }))
      }
      const saved = payload.people || []
      this.rows.forEach((row, i) => {
        const p = saved[i]
        if (!p) { return }
        if (Array.isArray(p.onPayroll)) { row.onPayroll = p.onPayroll.slice() }
        if (Array.isArray(p.payRise)) { row.payRise = p.payRise.map(v => num(v) * 100) }
      })
    },

    /**
     * Hand the year to the page in the shape `computeWages` reads: the months with their
     * season NAMES resolved, and each person carrying their own onPayroll and payRise.
     *
     * `actualMargin` is NOT set here — it is step 4's, and a month arriving with a made-up
     * actual would be judged against it on the report.
     *
     * Emits `confirmed` with { months, people }.
     */
    confirm () {
      const names = this.seasonNames || {}
      this.$emit('confirmed', {
        months: this.months.map(m => ({
          name: String(m.name || ''),
          // Stored by key, sent by NAME: the engine matches a month to a season on the
          // firm's own wording.
          season: names[m.season] || m.season,
          productionDays: num(m.productionDays),
          allowanceApplies: m.allowanceApplies === true
        })),
        people: this.people.map((p, i) => {
          const row = this.rows[i]
          return Object.assign({}, p, {
            onPayroll: row ? row.onPayroll.map(Boolean) : [],
            payRise: row ? row.payRise.map(v => num(v) / 100) : []
          })
        })
      })
    }
  }
}
</script>

<style scoped>
.wy-card {
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.wy-title { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 4px; }
.wy-note { font-size: 12px; color: var(--rs-muted); margin: 0 0 12px; }
/* Twelve months plus a label column will not fit a phone, and these grids are wider than
   step 1's. Each card scrolls inside itself rather than the page scrolling sideways. */
.wy-scroll { overflow-x: auto; }
.wy-grid { width: 100%; border-collapse: collapse; min-width: 900px; table-layout: fixed; }
/* The months table alone is forced wider, so its season pickers can show a whole name.
   At twelve columns in the page width they clipped to "Std S" and "Dry n", and a season
   an advisor cannot read is the control that decides how the whole month is costed. It
   is four rows, so scrolling it sideways costs far less than scrolling the 29-row grids
   below — which is why only this one is widened. */
.wy-grid--months { min-width: 1420px; }
.wy-grid th {
  font-size: 11px; font-weight: 600; color: var(--rs-muted); text-align: left;
  padding: 0 4px 6px; line-height: 1.25;
}
.wy-grid td { padding: 3px 4px; vertical-align: middle; font-size: 12px; color: var(--rs-body); }
.wy-rowlabel { width: 150px; color: var(--rs-body); }
.wy-open { width: 74px; }
/* Read-only because the workbook calculates it — shown because a rise means nothing
   without the rate it is a rise on. */
.wy-derived { color: var(--rs-muted); }
.wy-tick { text-align: center; }
.wy-grid td ::v-deep input[type="number"],
.wy-grid td ::v-deep input[type="text"],
.wy-grid td ::v-deep select { width: 100%; min-width: 0; }
.wy-actions { display: flex; justify-content: space-between; gap: 8px; }
@media print { .wy-actions { display: none !important; } }
</style>

<template lang="pug">
.ww-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  hero-strip(:columns="3")
    hero-figure(:label="$t('report.wagesReview.work.heroBasis')" :value="basisLabel")
    hero-figure(:label="$t('report.wagesReview.work.heroFieldHours')" :value="fieldHoursPerMonth")
    hero-figure(:label="$t('report.wagesReview.work.heroSwing')" :value="seasonSwing")

  .ww-card
    h3.ww-title {{ $t('report.wagesReview.work.basisTitle') }}
    p.ww-note {{ $t('report.wagesReview.work.basisNote') }}
    .ww-switch
      b-button(
        :type="basis === 'seasonal' ? 'is-primary' : ''"
        @click="basis = 'seasonal'"
      ) {{ $t('report.wagesReview.work.basisSeasonal') }}
      b-button(
        :type="basis === 'shutdown' ? 'is-primary' : ''"
        @click="basis = 'shutdown'"
      ) {{ $t('report.wagesReview.work.basisShutdown') }}

  .ww-card
    h3.ww-title {{ $t('report.wagesReview.work.seasonsTitle') }}
    p.ww-note {{ $t('report.wagesReview.work.seasonsNote') }}
    .ww-scroll
      table.ww-grid
        thead
          tr
            th.ww-rowlabel
            //- The season's own name, live, so the columns stay identifiable while the
            //- advisor renames them in the row below.
            th(v-for="k in seasonKeys" :key="k") {{ seasonNames[k] }}
        tbody
          tr
            td.ww-rowlabel {{ $t('report.wagesReview.work.seasonName') }}
            td(v-for="k in seasonKeys" :key="k")
              b-input(v-model="seasonNames[k]" size="is-small")
          tr
            td.ww-rowlabel {{ $t('report.wagesReview.work.hoursPerDay') }}
            td(v-for="k in seasonKeys" :key="k")
              b-input(v-model.number="production[k].hoursPerDay" type="number" step="any" size="is-small")
          tr
            td.ww-rowlabel {{ $t('report.wagesReview.work.daysPerWeek') }}
            td(v-for="k in seasonKeys" :key="k")
              b-input(v-model.number="production[k].daysPerWeek" type="number" step="any" size="is-small")
          tr
            td.ww-rowlabel {{ $t('report.wagesReview.work.daysLost') }}
            td(v-for="k in seasonKeys" :key="k")
              b-input(v-model.number="production[k].daysLost" type="number" step="any" size="is-small")

  //- THE OVERTIME DECLARATION — Mike, 2026-09-14. Its own card, not a field among the
  //- settings, because it is the owner declaring employment terms rather than tuning a
  //- number, and because leaving it unanswered used to cost every production worker their
  //- overtime in silence. `null` until answered and Continue is refused until it is.
  .ww-card
    h3.ww-title {{ $t('report.wagesReview.work.overtimeTitle') }}
    p.ww-note {{ $t('report.wagesReview.work.overtimeNote') }}
    .ww-fields
      .ww-field.ww-wide
        label {{ $t('report.wagesReview.work.overtimePaid') }}
        b-select(v-model="overtimePaid" size="is-small")
          option(:value="null") {{ $t('report.wagesReview.work.overtimeUnanswered') }}
          option(:value="true") {{ $t('report.wagesReview.work.overtimePaidYes') }}
          option(:value="false") {{ $t('report.wagesReview.work.overtimePaidNo') }}
    p.ww-warn(v-if="overtimePaid === null") {{ $t('report.wagesReview.work.overtimeRequired') }}

  .ww-card
    h3.ww-title {{ $t('report.wagesReview.work.onceTitle') }}
    p.ww-note {{ $t('report.wagesReview.work.onceNote') }}
    .ww-fields
      .ww-field
        label {{ $t('report.wagesReview.work.paidLostDays') }}
        b-select(v-model="daysLostApply" size="is-small")
          option(:value="true") {{ $t('report.wagesReview.work.yes') }}
          option(:value="false") {{ $t('report.wagesReview.work.no') }}
      .ww-field
        label {{ $t('report.wagesReview.work.partTimeHours') }}
        b-input(v-model.number="hoursPerDayPartTime" type="number" step="any" size="is-small")
      .ww-field
        label {{ $t('report.wagesReview.work.statDays') }}
        b-input(v-model.number="statDays" type="number" step="any" size="is-small")
      .ww-field
        label {{ $t('report.wagesReview.work.officeHours') }}
        b-input(v-model.number="hoursPerDayFullTime" type="number" step="any" size="is-small")
      .ww-field
        label {{ $t('report.wagesReview.work.officeDays') }}
        b-input(v-model.number="daysPerWeek" type="number" step="any" size="is-small")

  .ww-actions
    b-button(@click="$emit('back')") {{ $t('report.wagesReview.work.back') }}
    b-button(type="is-primary" @click="confirm") {{ $t('report.wagesReview.work.continue') }}
</template>

<script>
/**
 * WagesWork — step 2 of the Wages/Salary Review: how the work happens. The
 * seasonal/shutdown basis, the three seasons and their settings, and the handful of
 * figures set once for the whole model.
 *
 * EVERY CONTROL HERE IS A TYPED CELL, verified in the workbook's stored XML rather than
 * taken from the drawing. The drawing's own warning about this block — "six of these ten
 * would have been shipped as constants" — is why: a season's hours per day looks like a
 * house constant and is the advisor's to set. The season NAMES are typed too, so a
 * horticultural client's three seasons need not be a builder's three.
 *
 * 🔴 LABELS ARE THE WORKBOOK'S OWN WORDS, Mike's ruling 2026-09-14, because the drawing
 * names only ten of these and the model already has a vocabulary for them:
 * "Average Working Hrs per Day (incl Travel)", "Wet Days or Heat Days Lost per Month",
 * "Field Team Paid for 'Lost' Days", "Mang't, Admin & Sales Hrs per Day", "Days Worked".
 *
 * TWO THINGS THE DRAWING'S LIST OF TEN MISSES, both confirmed against the engine:
 *   - "Days Worked" (`Seasonal Inputs` W45) — the office week, which `daysWorked` reads
 *     for every non-production person. Absent from the drawing entirely.
 *   - The OVERNIGHT ALLOWANCE is NOT a setting. Its 1,400 is `CF40 = CF16+CF34+CF39+CF11`,
 *     a sum of PER-PERSON typed cells (350 each on the production block). It belongs with
 *     the team, not here, and the engine currently flattens it to one total — recorded as
 *     its own finding rather than guessed at.
 *
 * 🔴 THE OVERTIME DECLARATION — added 2026-09-14, and it is not a settings field. In Mike's
 * words: *"I want an advisor to have the option to click yes — 'my staff get paid overtime
 * in Dry n Light season' — even though that season already has long hours, BECAUSE we do NOT
 * assume that just because they agree to work more, they should do so without overtime
 * (which is against the law). There MAY be times however that overtime is NOT paid if they
 * receive time off in lieu during the Wet n Dark season. That's an owner's decision, that's
 * what that cell is asking them to declare."*
 *
 * **It is REQUIRED — `null` until answered, and Continue is refused.** That is the whole
 * point. The workbook's version was one unlabelled cell (`Seasonal Inputs` J4), blank, whose
 * emptiness silently refused every production worker 97.425 hours a month of overtime the
 * model had already calculated; switching it on meant typing the word "No". A question that
 * costs somebody their overtime when nobody answers it cannot have a default.
 *
 * ⚠ **It is a large number, not a detail.** On the workbook's own team, declaring overtime
 * paid costs 172,194 a year and takes the planned margin from 288,935 to 116,742. The card
 * sits on its own for that reason.
 *
 * The basis is a two-button switch, never two models — Mike's decision 3 of 2026-09-14.
 * Both revenue and cost swap sides together, which is why it is an either/or.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'

/** Weeks in an average month — the workbook's own constant, as the engine uses it. */
const WEEKS_PER_MONTH = 4.33

/** The seasons in the workbook's own column order: Dry n Light, Std Season, Wet n Dark. */
const SEASON_KEYS = ['dry', 'std', 'wet']

/**
 * The workbook's sample settings, cell-for-cell the engine's DEFAULT_INPUTS.
 * `Seasonal Inputs` rows 41 (hours/day), 43 (days/week), 45 (days lost) and 47.
 * @returns {Object} { basis, seasonNames, production, once }
 */
function sampleSettings () {
  return {
    basis: 'seasonal',
    seasonNames: { dry: 'Dry n Light', std: 'Std Season', wet: 'Wet n Dark' },
    production: {
      dry: { hoursPerDay: 10, daysPerWeek: 6, daysLost: 1 }, //   F41 / F43 / F45
      std: { hoursPerDay: 7.5, daysPerWeek: 5, daysLost: 0 }, //  I41 / I43 / I45
      wet: { hoursPerDay: 7, daysPerWeek: 5, daysLost: 4 } //     K41 / K43 / K45
    },
    daysLostApply: true, //         F47
    hoursPerDayPartTime: 4.5, //    T41
    statDays: 12, //                T43
    hoursPerDayFullTime: 8, //      S45
    daysPerWeek: 5 //               W45
  }
}

export default {
  name: 'WagesWork',

  components: { SampleNotice, HeroStrip, HeroFigure },

  props: {
    /** A previously confirmed payload (stepping back from a later chip); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    const s = sampleSettings()
    return {
      basis: s.basis,
      seasonNames: s.seasonNames,
      production: s.production,
      daysLostApply: s.daysLostApply,
      hoursPerDayPartTime: s.hoursPerDayPartTime,
      statDays: s.statDays,
      hoursPerDayFullTime: s.hoursPerDayFullTime,
      daysPerWeek: s.daysPerWeek,
      seasonKeys: SEASON_KEYS,
      /**
       * The owner's overtime declaration — see the header. `null` means UNANSWERED, which is
       * not an answer and not a default: `confirm` refuses until it is true or false.
       */
      overtimePaid: null,
      showSample: true
    }
  },

  computed: {
    /** @returns {string} the chosen basis, for the headline strip. */
    basisLabel () {
      return this.basis === 'shutdown'
        ? this.$t('report.wagesReview.work.basisShutdown')
        : this.$t('report.wagesReview.work.basisSeasonal')
    },
    /**
     * Productive hours a full-time field worker is available for in a standard-season
     * month, at the settings as they stand. Display only — the real figures are the
     * engine's — but it moves the moment any season setting is touched, which is the
     * point: these look like constants and are not.
     * @returns {string}
     */
    fieldHoursPerMonth () {
      const std = this.production.std || {}
      const days = (Number(std.daysPerWeek) || 0) * WEEKS_PER_MONTH - (Number(std.daysLost) || 0)
      return String(Math.round(days * (Number(std.hoursPerDay) || 0)))
    },
    /**
     * The spread between the best and worst season's monthly field hours. The model
     * exists to show what the weather costs, so the size of that gap is the headline
     * figure of this step.
     * @returns {string}
     */
    seasonSwing () {
      const hours = SEASON_KEYS.map((k) => {
        const s = this.production[k] || {}
        const days = (Number(s.daysPerWeek) || 0) * WEEKS_PER_MONTH - (Number(s.daysLost) || 0)
        return days * (Number(s.hoursPerDay) || 0)
      })
      return String(Math.round(Math.max.apply(null, hours) - Math.min.apply(null, hours)))
    }
  },

  created () {
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /**
     * Rebuild the controls from a confirmed payload.
     * @param {Object} payload a previous `confirm` emission
     */
    applyRestore (payload) {
      const s = (payload && payload.settings) || {}
      const prod = s.production || {}
      this.basis = payload.basis === 'shutdown' ? 'shutdown' : 'seasonal'
      if (payload.seasonNames) { this.seasonNames = Object.assign({}, payload.seasonNames) }
      SEASON_KEYS.forEach((k) => {
        if (prod[k]) { this.production[k] = Object.assign({}, prod[k]) }
      })
      if (typeof prod.daysLostApply === 'boolean') { this.daysLostApply = prod.daysLostApply }
      if (s.hoursPerDayPartTime !== undefined) { this.hoursPerDayPartTime = s.hoursPerDayPartTime }
      if (s.statDays !== undefined) { this.statDays = s.statDays }
      if (s.hoursPerDayFullTime !== undefined) { this.hoursPerDayFullTime = s.hoursPerDayFullTime }
      if (s.daysPerWeek !== undefined) { this.daysPerWeek = s.daysPerWeek }
      if (typeof s.overtimePaid === 'boolean') { this.overtimePaid = s.overtimePaid }
    },

    /**
     * Hand the settings to the page in the shape `computeWages` reads.
     *
     * Emits `confirmed` with { basis, seasonNames, settings } — `settings.production`
     * carries the three seasons plus `daysLostApply`, exactly as the engine nests them.
     *
     * 🔴 REFUSES while the overtime declaration is unanswered, and emits nothing. It is the
     * one control here that decides whether somebody is paid, so an unanswered question must
     * not become a silent "no" the way the workbook's blank cell did.
     */
    confirm () {
      if (this.overtimePaid !== true && this.overtimePaid !== false) { return }
      this.$emit('confirmed', {
        // Normalised here, not just trusted to the engine's own guard: the payload is
        // also what a saved report would carry, and an unknown basis stored is a wrong
        // basis restored.
        basis: this.basis === 'shutdown' ? 'shutdown' : 'seasonal',
        seasonNames: {
          wet: String(this.seasonNames.wet || ''),
          std: String(this.seasonNames.std || ''),
          dry: String(this.seasonNames.dry || '')
        },
        settings: {
          hoursPerDayFullTime: num(this.hoursPerDayFullTime),
          hoursPerDayPartTime: num(this.hoursPerDayPartTime),
          daysPerWeek: num(this.daysPerWeek),
          statDays: num(this.statDays),
          overtimePaid: this.overtimePaid === true,
          production: {
            wet: season(this.production.wet),
            std: season(this.production.std),
            dry: season(this.production.dry),
            daysLostApply: this.daysLostApply === true
          }
        }
      })
    }
  }
}

/** @param {*} v @returns {number} v as a number, 0 when it is not one. */
function num (v) {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

/** @param {Object} s one season's controls @returns {Object} the engine's shape */
function season (s) {
  const src = s || {}
  return {
    hoursPerDay: num(src.hoursPerDay),
    daysPerWeek: num(src.daysPerWeek),
    daysLost: num(src.daysLost)
  }
}
</script>

<style scoped>
/* Shared visual-standard tokens only; the cards match step 1's. */
.ww-card {
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.ww-title { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 4px; }
.ww-note { font-size: 12px; color: var(--rs-muted); margin: 0 0 12px; }
.ww-switch { display: flex; gap: 8px; flex-wrap: wrap; }
.ww-scroll { overflow-x: auto; }
/* The season settings read as a matrix — three seasons across, four settings down —
   because that is how the workbook lays them out and how an advisor compares them. */
.ww-grid { width: 100%; border-collapse: collapse; min-width: 520px; table-layout: fixed; }
.ww-grid th {
  font-size: 11px; font-weight: 600; color: var(--rs-muted); text-align: left;
  padding: 0 4px 6px; line-height: 1.25;
}
.ww-grid td { padding: 3px 4px; vertical-align: middle; font-size: 12px; color: var(--rs-body); }
.ww-rowlabel { width: 42%; color: var(--rs-body); }
.ww-grid td ::v-deep input { width: 100%; min-width: 0; }
/* The once-only settings are a simple wrapping column of label + control. */
.ww-fields { display: flex; flex-wrap: wrap; gap: 12px 20px; }
/* max-width so the last field on a wrapped row does not stretch to the full width and
   read as a different kind of control from the four above it. */
.ww-field { display: flex; flex-direction: column; gap: 3px; min-width: 200px; max-width: 270px; flex: 1 1 200px; }
.ww-field label { font-size: 11px; font-weight: 600; color: var(--rs-muted); }
/* The declaration is a sentence, not a two-word label, so its row gets the full width. */
.ww-field.ww-wide { max-width: none; flex: 1 1 100%; }
.ww-warn {
  font-size: 12px; color: var(--rs-warn); background: var(--rs-warn-soft);
  border-radius: 6px; padding: 8px 10px; margin: 10px 0 0;
}
.ww-actions { display: flex; justify-content: space-between; gap: 8px; }
@media print { .ww-actions, .ww-switch { display: none !important; } }
</style>

<template lang="pug">
.wt-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  //- Display-only counts, so step 1 opens looking like every other model in the
  //- library. OVERHEAD is not decoration: the engine gives a person with no
  //- charge-out rate zero working days, so a role landing there by accident
  //- silently contributes nothing. Better seen here than found on the report.
  hero-strip(:columns="3")
    hero-figure(:label="$t('report.wagesReview.team.heroPeople')" :value="String(namedPeople)")
    hero-figure(:label="$t('report.wagesReview.team.heroCharging')" :value="String(chargingPeople)")
    hero-figure(
      :label="$t('report.wagesReview.team.heroOverhead')"
      :value="String(overheadPeople)"
      :tone="overheadPeople > 0 ? 'warn' : 'default'"
    )

  .wt-card
    h3.wt-title {{ $t('report.wagesReview.team.title') }}
    p.wt-note {{ $t('report.wagesReview.team.intro') }}
    .wt-scroll
      table.wt-grid
        thead
          tr
            th.wt-name {{ $t('report.wagesReview.team.col.name') }}
            th {{ $t('report.wagesReview.team.col.division') }}
            th {{ $t('report.wagesReview.team.col.employment') }}
            th {{ $t('report.wagesReview.team.col.chargeRate') }}
            th {{ $t('report.wagesReview.team.col.payRate') }}
            th {{ $t('report.wagesReview.team.col.efficiency') }}
            th {{ $t('report.wagesReview.team.col.retirement') }}
            th {{ $t('report.wagesReview.team.col.overtime') }}
            th {{ $t('report.wagesReview.team.col.leaveDays') }}
            th {{ $t('report.wagesReview.team.col.tools') }}
            th {{ $t('report.wagesReview.team.col.allowanceRate') }}
            th {{ $t('report.wagesReview.team.col.allowanceNights') }}
            th.wt-act
        tbody
          //- Keyed on the person's own id, never the index: the rows re-order when a
          //- division changes, and index keys would leave the inputs behind.
          tr(v-for="person in orderedPeople" :key="person.id")
            td.wt-name
              b-input(v-model="person.name" size="is-small" :placeholder="$t('report.wagesReview.team.namePlaceholder')")
            td
              b-select(v-model="person.division" size="is-small")
                option(v-for="d in divisions" :key="d" :value="d") {{ $t('report.wagesReview.team.division.' + d.toLowerCase()) }}
            td
              b-select(v-model="person.employment" size="is-small")
                option(value="Full Time") {{ $t('report.wagesReview.team.fullTime') }}
                option(value="Part Time") {{ $t('report.wagesReview.team.partTime') }}
            td
              b-input(v-model.number="person.chargeRate" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.payRate" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.efficiencyPct" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.retirementPct" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.overtimePct" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.leaveDays" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.toolsWeekly" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.allowanceRate" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.allowanceNights" type="number" step="any" size="is-small")
            td.wt-act
              b-button(
                size="is-small"
                type="is-text"
                :title="$t('report.wagesReview.team.remove')"
                @click="removePerson(person)"
              ) ×
    .wt-foot
      b-button(size="is-small" @click="addPerson") {{ $t('report.wagesReview.team.addPerson') }}
      //- The team's monthly overnight allowance, shown because it FOLLOWS the team:
      //- before this control existed the engine held it as a fixed total, so adding or
      //- removing people left it untouched.
      span.wt-total
        | {{ $t('report.wagesReview.team.allowanceTotal') }}
        b  {{ money(allowanceTotal) }}

  .wt-actions
    b-button(type="is-primary" @click="confirm") {{ $t('report.wagesReview.team.continue') }}
</template>

<script>
/**
 * WagesTeam — step 1 of the Wages/Salary Review: every person, their pay and their
 * charge-out rate. Drawn at `design/mockups/wages-model.html` (decision 9, ruled by
 * Mike 2026-09-14: five steps, the report last).
 *
 * 🔴 TEN CONTROLS, NOT THE DRAWING'S TWELVE, AND THAT IS DELIBERATE. Reading the
 * workbook's stored XML — which cells carry an `<f>` element, and which cells any
 * formula actually reads — settled five of the drawn fields differently. Mike ruled
 * the division control on 2026-09-14; the other four follow from the workbook itself:
 *
 *   - Weekly base hours    — TYPED BUT READ BY NOTHING ('Std Hrs', col N). 0 readers.
 *   - Annual salary        — TYPED BUT READ BY NOTHING (col G). 0 readers.
 *   - On salary? (Yes/No)  — TYPED BUT READ BY NOTHING (col F), AND replaced by DIVISION
 *                            per Mike's ruling: the engine needs a three-way basis and
 *                            Yes/No cannot carry it.
 *   - Weekly overtime hrs  — CALCULATED ('Extra Hrs Wkd', BV/BX/BZ).
 *   - Overtime pay rate    — the typed cell is the UPLIFT, and the workbook's own header
 *                            calls it "Overtime Pay Rate (%)" holding 0.5. That is the
 *                            control kept here; the drawing's "34.50" was the computed
 *                            figure, not the input.
 *
 * ⚠ THE COLUMN MAP IS NOT WHAT IT LOOKS LIKE. `Seasonal Inputs` uses 1.25-wide SPACER
 * columns (I, K, Q, S), so a reading that skips empty cells shifts every field one to the
 * left and answers the wrong question. Corrected 2026-09-14 against the sheet's own header
 * row: D name · E full/part time · F On Salary · G Annual Salary · H charge rate ·
 * J pay rate · M efficiency · N Std Hrs · P retirement · R overtime uplift · T leave days.
 *
 * Neither a calculated cell nor a typed one nothing reads earns a control. Mike's rule of
 * the same day — every typed cell reachable, nothing quietly fixed as a constant — guards
 * against removing a control the model gives; a box the engine overwrites, or one wired to
 * nothing at all, is the opposite fault.
 *
 * THREE CONTROLS THE DRAWING NEVER SHOWED WERE ADDED, all typed cells the model reads:
 *   - `toolsWeekly` — `CH7 = (Z7*52)/12`, the weekly tools allowance;
 *   - the OVERNIGHT ALLOWANCE, which is TWO cells per person rather than one setting:
 *     V "Overnight/ Meals + Accom' Allowance" (175) x X "Avg Number of Nights/ Meals per
 *     month" (2) = that person's 350. `CF40` sums them to the 1,400 the engine holds.
 *
 * 🔴 WHY THE ALLOWANCE BELONGS HERE. The engine takes `allowances.seasonal` as one FIXED
 * total, so before this control the figure did not follow the team: adding ten people or
 * deleting twenty left it at 1,400 a month. That is a wrong number produced by using step
 * 1 exactly as intended, with nothing on screen to say so. `allowanceTotal` now derives it
 * from the rows and `confirm` emits it, which leaves the engine's input shape and its
 * golden test untouched.
 *
 * ⚠ THIS PARAGRAPH USED TO CLAIM three of the four allowance cells had their formula
 * overtyped with a literal 350. That is FALSE and was withdrawn on 2026-09-14. `CF17:CF20`
 * is one shared formula `X17*V17`: rows 18-20 are shared-formula FOLLOWERS, stored as
 * `<f t="shared" si="145"/>` with no formula text of their own, so anything reading each
 * cell's own `<f>` sees a blank and calls it a typed constant. Deriving the total here is
 * still right, for the reason in the paragraph above — it must follow the team — and not
 * for the trap that was never there. The same misreading put a phantom defect into
 * `design/WAGES-SHUTDOWN-PORT.md` §3.2; see CORRECTION 3 in `server/report/wagesModel.js`.
 *
 * DIVISION DRIVES THE BASIS (Mike, 2026-09-14). The workbook is laid out in blocks and
 * the mapping is exact across all 29 sample rows: Admin and Sales are costed as salary,
 * the Production block as production, the Management block as management. The advisor
 * picks a division and `wageBasis` follows, so there is no second control and no new
 * vocabulary. `DIVISION_BASIS` below is that mapping.
 *
 * Percentages are held in DISPLAY form (3, not 0.03) and converted to decimals in the
 * payload — the shape `computeWages` expects. Same convention as LoanEstimatorSecurity.
 *
 * The sample team is the workbook's own, cell-for-cell the engine's DEFAULT_INPUTS,
 * flagged by SampleNotice until the advisor confirms figures of their own.
 * `tests/unit/wagesTeam.component.test.js` pins it against the engine so this copy
 * cannot drift from the source it was taken from.
 */
import SampleNotice from '~/components/base/SampleNotice.vue'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import currencyMixin from '~/mixins/currencyMixin'

/**
 * Division -> wage basis. The workbook's blocks, and the whole reason step 1 asks one
 * question instead of two. Changing a value here changes which maths a person gets.
 */
const DIVISION_BASIS = {
  Admin: 'salary',
  Sales: 'salary',
  Production: 'production',
  Management: 'management'
}

/**
 * The order the four blocks appear in, which is the workbook's own: Admin rows 7-10,
 * Sales 12-15, Production 18-34, Management 35-38.
 */
const DIVISION_ORDER = Object.keys(DIVISION_BASIS)

/**
 * Row identity. The grid re-orders itself, so a row cannot be keyed on its index —
 * Vue would reuse the wrong input and the advisor would watch a figure they typed land
 * on somebody else. Module-level so ids stay unique across a rebuild of the grid.
 */
let nextId = 1

/** @returns {number} an id no row in this session has had. */
function newId () {
  return nextId++
}

/** @param {*} v @returns {number} v as a number, 0 when it is not one. */
function num (v) {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

/** @param {*} v a display percentage @returns {number} the decimal the engine reads. */
function pctIn (v) {
  return num(v) / 100
}

/** @param {*} v a decimal from a payload @returns {number} the display percentage. */
function pctOut (v) {
  return num(v) * 100
}

/**
 * The workbook's sample team (`Seasonal Inputs` rows 7-45), cell-for-cell the backend's
 * DEFAULT_INPUTS.people with percents in display form. The three unnamed rows are the
 * workbook's own empty slots and are kept so a confirmed payload reproduces the golden
 * figures exactly; the advisor can name or remove them.
 * @returns {Array<Object>} one row per person, in the workbook's order
 */
function samplePeople () {
  const mk = (name, division, employment, chargeRate, payRate, efficiencyPct, toolsWeekly, rate, nights) => ({
    id: newId(),
    name,
    division,
    employment,
    chargeRate,
    payRate,
    efficiencyPct,
    retirementPct: 3,
    overtimePct: 50,
    leaveDays: 30,
    toolsWeekly,
    // `Seasonal Inputs` V (the rate) and X (the count). Only the first four production
    // rows carry them in the sample: 175 x 2 = 350 each, 1,400 for the team.
    allowanceRate: rate || 0,
    allowanceNights: nights || 0
  })
  return [
    mk('Mary G', 'Admin', 'Part Time', 0, 19, 0, 0),
    mk('Agatha', 'Admin', 'Full Time', 0, 19, 0, 0),
    mk('Judy', 'Admin', 'Full Time', 0, 19, 0, 0),
    mk('Stephen', 'Admin', 'Full Time', 0, 19, 0, 0),
    mk('Max', 'Sales', 'Full Time', 0, 23, 0, 0),
    mk('Alex', 'Sales', 'Full Time', 0, 23, 0, 0),
    mk('Joe', 'Sales', 'Full Time', 0, 23, 0, 0),
    mk('Sean', 'Sales', 'Full Time', 0, 23, 0, 0),
    mk('Billy Ray', 'Production', 'Full Time', 55, 35, 92, 15, 175, 2),
    mk('Bob', 'Production', 'Full Time', 52, 32, 85, 15, 175, 2),
    mk('Barry', 'Production', 'Full Time', 65, 35, 92, 15, 175, 2),
    mk('Bruce', 'Production', 'Full Time', 60, 38, 85, 15, 175, 2),
    mk('Brian', 'Production', 'Full Time', 60, 37, 85, 15),
    mk('Butch', 'Production', 'Part Time', 50, 26, 85, 15),
    mk('Bono', 'Production', 'Full Time', 50, 26, 85, 15),
    mk('Boris', 'Production', 'Full Time', 40, 22, 85, 15),
    mk('Brad', 'Production', 'Full Time', 38, 21, 85, 15),
    mk('Bart', 'Production', 'Full Time', 35, 20, 85, 15),
    mk('Ben', 'Production', 'Part Time', 50, 26, 85, 15),
    mk('Bevis', 'Production', 'Full Time', 50, 26, 85, 15),
    mk('Butch', 'Production', 'Full Time', 50, 26, 85, 15),
    mk('Bono', 'Production', 'Part Time', 50, 26, 85, 15),
    mk('Boris', 'Production', 'Full Time', 40, 22, 85, 15),
    mk('Brad', 'Production', 'Full Time', 38, 21, 85, 15),
    mk('', 'Production', 'Full Time', 0, 0, 0, 0),
    mk('Stevie', 'Management', 'Full Time', 323, 74, 50, 0),
    mk('Natalie', 'Management', 'Full Time', 260, 35, 40, 0),
    mk('', 'Management', 'Full Time', 0, 0, 0, 0),
    mk('', 'Management', 'Full Time', 0, 0, 0, 0)
  ]
}

/** A blank row for Add person. Empty rather than pre-filled: no invented defaults. */
function blankPerson () {
  return {
    id: newId(),
    name: '',
    division: 'Production',
    employment: 'Full Time',
    chargeRate: null,
    payRate: null,
    efficiencyPct: null,
    retirementPct: null,
    overtimePct: null,
    leaveDays: null,
    toolsWeekly: null,
    allowanceRate: null,
    allowanceNights: null
  }
}

export default {
  name: 'WagesTeam',

  components: { SampleNotice, HeroStrip, HeroFigure },

  mixins: [currencyMixin],

  props: {
    /** A previously confirmed payload (stepping back from a later chip); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      people: samplePeople(),
      divisions: Object.keys(DIVISION_BASIS),
      // Frozen at created(): whether this entry started from the workbook's sample.
      showSample: true
    }
  },

  computed: {
    /**
     * The team grouped into the workbook's four blocks — Admin, Sales, Production,
     * Management — and nothing else. Mike, 2026-09-14, after adding an Admin person and
     * finding them at the foot of the page below Management.
     *
     * A STABLE partition, not a sort: people keep their order within their own block, so
     * a row moves only when its own division changes. Nothing re-orders itself while the
     * advisor types, and a person added lands at the foot of their block rather than the
     * foot of the page.
     *
     * Safe to re-order at all because the engine's figures do not depend on row order —
     * reversing the whole team moves the year margin by 1.7e-10, which is floating-point
     * addition order and not a dependency. `wagesTeam.component.test.js` pins that.
     *
     * An unrecognised division sorts last rather than vanishing: a row the advisor cannot
     * see is worse than one in the wrong place.
     * @returns {Array<Object>} the same row objects, in display order
     */
    orderedPeople () {
      const rank = (p) => {
        const i = DIVISION_ORDER.indexOf(p.division)
        return i === -1 ? DIVISION_ORDER.length : i
      }
      return this.people
        .map((person, i) => ({ person, i }))
        .sort((a, b) => (rank(a.person) - rank(b.person)) || (a.i - b.i))
        .map(entry => entry.person)
    },
    /** @returns {number} people with a name — the workbook's blank slots do not count. */
    namedPeople () {
      return this.people.filter(p => String(p.name || '').trim().length > 0).length
    },
    /** @returns {number} named people who bill — a charge-out rate above zero. */
    chargingPeople () {
      return this.people.filter(
        p => String(p.name || '').trim().length > 0 && Number(p.chargeRate) > 0
      ).length
    },
    /**
     * Named people with no charge-out rate. The engine gives them zero working days,
     * so they cost and never bill — which is right for a genuine overhead role and
     * wrong for anyone entered in a hurry.
     * @returns {number}
     */
    overheadPeople () {
      return this.namedPeople - this.chargingPeople
    },
    /**
     * The team's monthly overnight allowance — each person's rate times their nights,
     * added up. `Seasonal Inputs` CF40 = CF16+CF34+CF39+CF11, which sums the same
     * per-person cells; the sample's four production staff give 1,400.
     *
     * Computed here rather than typed because the engine takes ONE total, and a total
     * that does not follow the team is wrong the moment the team is edited — which is
     * what step 1 is for.
     * @returns {number}
     */
    allowanceTotal () {
      return this.people.reduce(
        (sum, p) => sum + (num(p.allowanceRate) * num(p.allowanceNights)), 0
      )
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
     * Rebuild the grid from a confirmed payload, turning decimals back into the
     * display percentages the controls hold.
     * @param {Object} payload a previous `confirm` emission
     */
    applyRestore (payload) {
      const rows = (payload && payload.people) || []
      this.people = rows.map(p => ({
        id: newId(),
        name: p.name || '',
        division: p.division || 'Production',
        employment: p.employment || 'Full Time',
        chargeRate: p.chargeRate,
        payRate: p.payRate,
        efficiencyPct: pctOut(p.dailyEfficiency),
        retirementPct: pctOut(p.retirementPct),
        overtimePct: pctOut(p.overtimePct),
        leaveDays: p.leaveDays,
        toolsWeekly: p.toolsWeekly,
        allowanceRate: p.allowanceRate,
        allowanceNights: p.allowanceNights
      }))
    },

    /** Add an empty row at the end of the team. */
    addPerson () {
      this.people.push(blankPerson())
    },

    /**
     * Remove one row. Taken by IDENTITY, not by the index on screen: the grid's display
     * order is not the array's, so an index would delete somebody else.
     *
     * The last row is never removed — an empty grid gives the advisor nothing to type
     * into and no way back.
     * @param {Object} person the row object to remove
     */
    removePerson (person) {
      if (this.people.length <= 1) { return }
      const at = this.people.indexOf(person)
      if (at !== -1) { this.people.splice(at, 1) }
    },

    /**
     * Hand the team to the page in the shape `computeWages` reads: percentages as
     * decimals, and `wageBasis` derived from the division.
     *
     * Emits `confirmed` with { people, allowances } — one entry per row, in the order
     * shown on screen (grouped by division), so returning to the step shows what was
     * left. The row id is display machinery and deliberately does not travel.
     *
     * `allowances.seasonal` is the team's total, derived here because the engine takes
     * one figure. SHUTDOWN IS NOT SUPPLIED: its column in the workbook interleaves label
     * text with its formulas and this file stores some strings without the usual type
     * marker, so it could not be read with confidence. The report step must settle it
     * deliberately rather than inherit a silent zero — see report-models.md.
     */
    confirm () {
      this.$emit('confirmed', {
        allowances: { seasonal: this.allowanceTotal },
        people: this.orderedPeople.map(p => ({
          name: String(p.name || ''),
          division: p.division,
          wageBasis: DIVISION_BASIS[p.division] || 'salary',
          employment: p.employment,
          chargeRate: num(p.chargeRate),
          payRate: num(p.payRate),
          dailyEfficiency: pctIn(p.efficiencyPct),
          retirementPct: pctIn(p.retirementPct),
          overtimePct: pctIn(p.overtimePct),
          leaveDays: num(p.leaveDays),
          toolsWeekly: num(p.toolsWeekly),
          allowanceRate: num(p.allowanceRate),
          allowanceNights: num(p.allowanceNights)
        }))
      })
    }
  }
}
</script>

<style scoped>
/* Reads the shared visual-standard tokens; no value here is a new colour. The grid is
   a plain table rather than b-table because every cell is an input — b-table's row
   rendering fights v-model on 29 rows and buys nothing when there is no sorting. */
.wt-card {
  background: var(--rs-panel); border: 1px solid var(--rs-line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.wt-title { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 4px; }
.wt-note { font-size: 12px; color: var(--rs-muted); margin: 0 0 12px; }
/* The ten columns do not fit a phone. The table scrolls inside its own card rather
   than the page scrolling sideways. */
.wt-scroll { overflow-x: auto; }
/* Fixed layout with the three text columns sized explicitly. Left to size themselves
   the selects were clipped to "Admi" and "Produ" — a division an advisor cannot read
   is the one control on this screen that silently changes which maths a person gets. */
.wt-grid { width: 100%; border-collapse: collapse; min-width: 860px; table-layout: fixed; }
.wt-grid th:nth-child(1), .wt-grid td:nth-child(1) { width: 98px; }
/* 128px, not 116: "Management" plus the select's chevron clipped to "Managemen" at
   116, and the longest option is what sizes this column. */
.wt-grid th:nth-child(2), .wt-grid td:nth-child(2) { width: 128px; }
.wt-grid th:nth-child(3), .wt-grid td:nth-child(3) { width: 100px; }
.wt-grid th:nth-child(13), .wt-grid td:nth-child(13) { width: 28px; }
/* Headers WRAP rather than nowrap. With ten controls plus a remove button, holding
   "Daily production efficiency %" on one line pushed the last two columns off the
   right edge of the card — on a screen where every field is one the advisor must
   fill in, and nothing said they were there. Two-line headers cost 14px of height
   and keep all eleven columns on the page. */
.wt-grid th {
  font-size: 11px; font-weight: 600; color: var(--rs-muted); text-align: left;
  padding: 0 4px 6px; vertical-align: bottom; line-height: 1.25;
}
.wt-grid td { padding: 2px 4px; vertical-align: middle; }
.wt-name { min-width: 110px; }
/* Buefy renders its own wrapper around the control, so the width is set on the cell
   and the input told to fill it. */
.wt-grid td ::v-deep input,
.wt-grid td ::v-deep select { width: 100%; min-width: 0; }
.wt-act { width: 32px; text-align: right; }
.wt-foot { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.wt-total { font-size: 12px; color: var(--rs-muted); }
.wt-total b { color: var(--rs-ink); }
.wt-actions { display: flex; justify-content: flex-end; }
@media print { .wt-actions, .wt-foot { display: none !important; } }
</style>

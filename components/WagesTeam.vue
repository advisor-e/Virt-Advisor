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

  //- 🔴 THE TWO CONVERTERS — Mike, 2026-09-14. They sit HERE, above the team, because the two
  //- boxes they fill in are on this screen: the pay rate and the charge-out rate. On the
  //- drawing they were a separate tab; he dropped it ("does it need a seperate Tab??"), and
  //- behind a tab a helper is somewhere to go and find, which is how a helper goes unused.
  //- Nothing here is saved and nothing is written into a row — it works the figure out and
  //- the advisor decides which person it belongs to.
  .wt-card.wt-helper
    h3.wt-title
      | {{ $t('report.wagesReview.team.helperTitle') }}
      span.wt-optional {{ $t('report.wagesReview.team.helperOptional') }}
    p.wt-note {{ $t('report.wagesReview.team.helperNote') }}

    .wt-conv
      .wt-field
        label {{ $t('report.wagesReview.team.helperSalary') }}
        b-input(v-model.number="helper.salary" type="number" step="any" size="is-small")
      span.wt-swap ⇄
      .wt-field
        label {{ $t('report.wagesReview.team.helperHourly') }}
        .wt-out {{ helperHourly === null ? dash : money2(helperHourly) }}
      .wt-field
        label {{ $t('report.wagesReview.team.helperHours') }}
        b-input(v-model.number="helper.hoursPerWeek" type="number" step="any" size="is-small" placeholder="40")
      .wt-field
        label {{ $t('report.wagesReview.team.helperWeeks') }}
        b-input(v-model.number="helper.weeksPerYear" type="number" step="any" size="is-small")
    p.wt-also(v-if="helperHourly !== null")
      | {{ $t('report.wagesReview.team.helperAlso', {
      |   month: money(helper.salary / 12),
      |   week: money2(helperWeekly),
      |   day: money2(helperDaily)
      | }) }}

    h4.wt-subtitle {{ $t('report.wagesReview.team.blendTitle') }}
    p.wt-note {{ $t('report.wagesReview.team.blendNote') }}
    table.wt-mix
      thead
        tr
          th {{ $t('report.wagesReview.team.blendWork') }}
          th {{ $t('report.wagesReview.team.blendRate') }}
          th {{ $t('report.wagesReview.team.blendShare') }}
          th.wt-num {{ $t('report.wagesReview.team.blendContributes') }}
          th
      tbody
        tr(v-for="(m, i) in helper.mix" :key="i")
          td
            b-input(v-model="m.label" size="is-small" :placeholder="$t('report.wagesReview.team.blendWorkPlaceholder')")
          td
            b-input(v-model.number="m.rate" type="number" step="any" size="is-small")
          td
            b-input(v-model.number="m.share" type="number" step="any" size="is-small" placeholder="%")
          td.wt-num {{ money2(mixContribution(m)) }}
          td.wt-act
            b-button(
              size="is-small"
              type="is-text"
              :disabled="helper.mix.length <= 1"
              :title="$t('report.wagesReview.team.blendRemove')"
              @click="removeMix(i)"
            ) ×
    .wt-mixfoot
      b-button(size="is-small" @click="addMix") {{ $t('report.wagesReview.team.blendAdd') }}
      span.wt-blend
        | {{ $t('report.wagesReview.team.blendResult') }}
        b  {{ blendedRate === null ? dash : money2(blendedRate) }}
      //- 🔴 THE CHECK THAT MAKES IT TRUSTWORTHY. A mix adding to 80% quietly returns a rate a
      //- fifth too low, and nothing else on the screen would look wrong. The workbook carries
      //- this as its own "Balance Time Remaining" row.
      span.wt-mixwarn(v-if="mixShare !== 100") {{ $t('report.wagesReview.team.blendShareWarn', { share: mixShare }) }}

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
            //- The three the SHUTDOWN basis reads and the seasonal one does not. Shown to
            //- everyone and starting empty, because step 2 is where the basis is chosen and
            //- this is step 1 (Mike's decision 9) — a column that appeared only after a trip
            //- to step 2 and back is a column somebody fills in by accident or not at all.
            th {{ $t('report.wagesReview.team.col.weeklyBaseHours') }}
            th {{ $t('report.wagesReview.team.col.weeklyOvertimeHours') }}
            th {{ $t('report.wagesReview.team.col.productivity') }}
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
              b-input(v-model.number="person.weeklyBaseHours" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.weeklyOvertimeHours" type="number" step="any" size="is-small")
            td
              b-input(v-model.number="person.productivity" type="number" step="any" size="is-small")
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
 * 🔴 THIRTEEN CONTROLS. Ten serve the SEASONAL basis; the last three —
 * `weeklyBaseHours`, `weeklyOvertimeHours` and `productivity` — serve the SHUTDOWN one and
 * were added 2026-09-14 on Mike's yes (item 4.102).
 *
 * **They are shown to everyone and start empty.** The basis is chosen on step 2 and this is
 * step 1 — his own decision 9, which is not being reordered — so this screen cannot know
 * which basis applies. A column that appeared only after a trip to step 2 and back is a
 * column somebody fills in by accident, or never finds. A seasonal firm leaves them blank
 * and the engine never reads them.
 *
 * ⚠ AND THEY ARE EMPTY IN THE SAMPLE TOO. `Shutdown Inputs` holds different figures for the
 * same people — the pay rate differs on 24 of the 29 rows — so pre-filling these from that
 * sheet would show an advisor a number belonging to a different model of the same firm.
 *
 * 🔴 THE TEN SEASONAL CONTROLS ARE NOT THE DRAWING'S TWELVE, AND THAT IS DELIBERATE.
 * Reading the workbook's stored XML — which cells carry an `<f>` element, and which cells
 * any formula actually reads — settled five of the drawn fields differently. Mike ruled the
 * division control on 2026-09-14; the other four follow from the workbook itself:
 *
 *   - Weekly base hours    — on `Seasonal Inputs`, TYPED BUT READ BY NOTHING ('Std Hrs',
 *                            col N). 0 readers. ⚠ On `Shutdown Inputs` (col K) it is a LIVE
 *                            input and the whole wage chain runs off it, which is why it is
 *                            now a control. The two sheets differ; this line was right about
 *                            the seasonal one and was read as a statement about both.
 *   - Annual salary        — TYPED BUT READ BY NOTHING (col G). 0 readers.
 *   - On salary? (Yes/No)  — TYPED BUT READ BY NOTHING (col F), AND replaced by DIVISION
 *                            per Mike's ruling: the engine needs a three-way basis and
 *                            Yes/No cannot carry it.
 *   - Weekly overtime hrs  — on `Seasonal Inputs`, CALCULATED ('Extra Hrs Wkd', BV/BX/BZ).
 *                            ⚠ On `Shutdown Inputs` (col O) it is typed and read. Same
 *                            correction as weekly base hours above.
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
 * for the trap that was never there. The same misreading had reached seven places across five
 * files; see CORRECTION 3 in `server/report/wagesModel.js`.
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
    allowanceNights: nights || 0,
    // 🔴 THE THREE THE SHUTDOWN BASIS READS, AND THEY START EMPTY EVEN HERE. This is the
    // SEASONAL sample, and `Shutdown Inputs` holds different figures for the same people —
    // different pay rates on 24 of 29 rows. Filling these with the other sheet's numbers
    // would put a figure in front of an advisor that belongs to a different model of the
    // same firm. Mike's rule of 2026-09-14: no invented defaults.
    weeklyBaseHours: null,
    weeklyOvertimeHours: null,
    productivity: null
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
    allowanceNights: null,
    weeklyBaseHours: null,
    weeklyOvertimeHours: null,
    productivity: null
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
      /**
       * The two converters' own working. NOT part of the payload and never saved — `confirm`
       * does not look at it.
       *
       * ⚠ `weeksPerYear` starts at 52 and `hoursPerWeek` starts EMPTY, and the difference is
       * deliberate under Mike's "no invented defaults" rule. There are 52 weeks in a year —
       * that is the calendar, editable for a firm that works to 48. How many hours somebody
       * works in a week is the client's own fact, so it is asked for rather than assumed; the
       * placeholder shows the shape without putting a number in the box. Until it is answered
       * the hourly rate reads as a dash, which is the honest answer: a salary cannot be turned
       * into an hourly rate without knowing the hours.
       */
      helper: {
        salary: null,
        hoursPerWeek: null,
        weeksPerYear: 52,
        mix: [{ label: '', rate: null, share: null }]
      },
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
    /** The em dash every screen shows where a figure does not exist yet. */
    dash () { return '—' },

    /**
     * An annual salary as an hourly rate. `salary / (hours per week x weeks per year)`.
     *
     * @returns {number|null} null while any of the three is missing — a salary cannot be
     *   turned into an hourly rate without knowing the hours, and a dash says so.
     */
    helperHourly () {
      const hours = num(this.helper.hoursPerWeek) * num(this.helper.weeksPerYear)
      const salary = num(this.helper.salary)
      if (!hours || !salary) { return null }
      return salary / hours
    },

    /** @returns {number} the same salary as a week's pay. */
    helperWeekly () {
      return num(this.helper.salary) / (num(this.helper.weeksPerYear) || 1)
    },

    /** @returns {number} the same salary as a day's pay, at five days. */
    helperDaily () {
      return this.helperWeekly / 5
    },

    /**
     * What share of the week the blended-rate mix accounts for, as a percentage.
     *
     * 🔴 THE CHECK THAT MAKES THE BLENDED RATE TRUSTWORTHY. A mix adding to 80% returns a
     * rate a fifth too low, silently, and nothing else on the screen would look wrong. The
     * workbook carries it as its own "Balance Time Remaining" row.
     *
     * @returns {number}
     */
    mixShare () {
      return this.helper.mix.reduce((sum, m) => sum + num(m.share), 0)
    },

    /**
     * One person's blended charge-out rate: each rate weighted by the share of the week
     * spent on that work. `Hrly Rate & Tax Calculator` row 25, for one person rather than
     * a firm — Mike's ruling of 2026-09-14.
     *
     * @returns {number|null} null until something has been typed
     */
    blendedRate () {
      const rows = this.helper.mix.filter(m => num(m.rate) > 0 && num(m.share) > 0)
      if (!rows.length) { return null }
      return rows.reduce((sum, m) => sum + (num(m.rate) * num(m.share) / 100), 0)
    },

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
        allowanceNights: p.allowanceNights,
        weeklyBaseHours: p.weeklyBaseHours,
        weeklyOvertimeHours: p.weeklyOvertimeHours,
        // The engine holds productivity as a decimal (`Shutdown Inputs` S7 = 0.5); the
        // control shows it as a percentage, like every other rate on this screen.
        productivity: pctOut(p.productivity)
      }))
    },

    /** Add an empty row at the end of the team. */
    addPerson () {
      this.people.push(blankPerson())
    },

    /**
     * What one line of the mix contributes to the blended rate.
     *
     * ⚠ A METHOD RATHER THAN `num()` IN THE TEMPLATE. `currencyMixin` already supplies a
     * `num` — and it returns a FORMATTED STRING, not a number. Shadowing it here to do
     * arithmetic would have left any later use of it silently returning the wrong type.
     *
     * @param {Object} m one row of `helper.mix` @returns {number}
     */
    mixContribution (m) {
      return num(m.rate) * num(m.share) / 100
    },

    /** Add a kind of work to the blended-rate mix. */
    addMix () {
      this.helper.mix.push({ label: '', rate: null, share: null })
    },

    /** Remove one. The last row stays — an empty mix gives nothing to type into. */
    removeMix (index) {
      if (this.helper.mix.length <= 1) { return }
      this.helper.mix.splice(index, 1)
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
     * `allowances.seasonal` is the team's total, derived here because the engine takes one
     * figure. NO SHUTDOWN ALLOWANCE IS EMITTED, and that is now a settled answer rather than
     * a deferral: on that basis the allowance sits INSIDE each person's monthly wage
     * (`Shutdown Inputs` CL7), so a separate total would charge it twice. CORRECTION 3 in
     * `server/report/wagesModel.js`.
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
          allowanceNights: num(p.allowanceNights),
          // The three the SHUTDOWN basis reads (`Shutdown Inputs` K, O and S). They travel
          // whatever the basis, because step 2 — where the basis is chosen — comes after
          // this one. On the seasonal basis the engine never looks at them.
          weeklyBaseHours: num(p.weeklyBaseHours),
          weeklyOvertimeHours: num(p.weeklyOvertimeHours),
          productivity: pctIn(p.productivity)
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

/* The two converters. Deliberately quieter than the team table below it — a helper that
   competes with the thing it helps with has been put in the wrong place. */
.wt-helper { background: var(--rs-panel-2); }
.wt-optional {
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--rs-muted); background: var(--rs-panel); border-radius: 4px;
  padding: 1px 6px; margin-left: 8px; vertical-align: middle;
}
.wt-subtitle { font-size: 13px; font-weight: 700; color: var(--rs-ink); margin: 18px 0 4px; }
.wt-conv { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: flex-end; }
.wt-field { display: flex; flex-direction: column; gap: 3px; min-width: 130px; flex: 0 1 150px; }
.wt-field label { font-size: 11px; font-weight: 600; color: var(--rs-muted); }
.wt-out {
  border: 1px solid var(--rs-line); border-radius: 4px; padding: 4px 9px;
  font-size: 13px; font-weight: 700; color: var(--rs-ink); background: var(--rs-panel);
}
.wt-swap { align-self: center; font-size: 18px; color: var(--rs-accent); margin-top: 14px; }
.wt-also { font-size: 12px; color: var(--rs-muted); margin: 8px 0 0; }
.wt-mix { width: 100%; max-width: 620px; border-collapse: collapse; }
.wt-mix th {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--rs-muted);
  text-align: left; padding: 0 8px 4px 0; font-weight: 700;
}
.wt-mix td { padding: 2px 8px 2px 0; vertical-align: middle; }
.wt-mix td.wt-num, .wt-mix th.wt-num { text-align: right; font-variant-numeric: tabular-nums; }
.wt-mix td.wt-act { width: 2.2rem; padding-right: 0; }
.wt-mixfoot { margin-top: 8px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.wt-blend { font-size: 12px; color: var(--rs-muted); }
.wt-blend b { color: var(--rs-ink); font-size: 14px; }
.wt-mixwarn { font-size: 12px; color: var(--rs-warn); }
.wt-actions { display: flex; justify-content: flex-end; }
@media print { .wt-actions, .wt-foot { display: none !important; } }
</style>

/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesTeam = require('../../components/WagesTeam.vue').default
const { DEFAULT_INPUTS, SHUTDOWN_SAMPLE, computeWages } = require('../../server/report/wagesModel')

/**
 * WagesTeam — step 1 of the Wages/Salary Review (item 4.100).
 *
 * What these tests are for, and what they deliberately leave alone. UAT sees labels,
 * spacing and colour in five seconds and judges them better than an assertion can
 * (Mike's ruling, 2026-08-24), so nothing here pins a word or a class. What UAT cannot
 * see is whether the payload this screen hands the engine is the shape the engine
 * reads — a percentage out by a factor of 100, or a wage basis silently defaulting,
 * looks perfectly fine on screen and produces a wrong number on the report.
 *
 * The drift guard is the first block: the sample team is copied from the backend's
 * DEFAULT_INPUTS, and a copy with nothing watching it is a copy that goes stale.
 */
describe('WagesTeam — the sample team matches the engine it was copied from', () => {
  const wrapper = mountWithBuefy(WagesTeam)
  const rows = wrapper.vm.people
  const source = DEFAULT_INPUTS.people

  it('carries one row per person in the engine\'s sample, in the same order', () => {
    expect(rows.length).toBe(source.length)
    expect(rows.map(r => r.name)).toEqual(source.map(p => p.name))
  })

  it('matches the engine person for person, once percentages are converted back', () => {
    // The whole point of the copy existing at all: it must reproduce the golden
    // figures when confirmed. Anything that drifts here drifts silently.
    rows.forEach((row, i) => {
      const p = source[i]
      expect([row.division, row.employment, row.chargeRate, row.payRate]).toEqual(
        [p.division, p.employment, p.chargeRate, p.payRate]
      )
      expect(row.efficiencyPct / 100).toBeCloseTo(p.dailyEfficiency, 10)
      expect(row.retirementPct / 100).toBeCloseTo(p.retirementPct, 10)
      expect(row.overtimePct / 100).toBeCloseTo(p.overtimePct, 10)
      expect([row.leaveDays, row.toolsWeekly]).toEqual([p.leaveDays, p.toolsWeekly])
    })
  })

  it('keeps the workbook\'s three unnamed slots rather than tidying them away', () => {
    // Dropping them would change the payload the engine receives, and the golden
    // figures with it. They are the workbook's own empty rows.
    expect(rows.filter(r => r.name === '').length).toBe(3)
  })
})

describe('WagesTeam — the payload the engine actually reads', () => {
  /** @returns {object} the payload emitted by pressing Continue on a fresh mount. */
  function confirmed (wrapper) {
    wrapper.vm.confirm()
    return wrapper.emitted('confirmed')[0][0]
  }

  it('derives the wage basis from the division, never asking for it twice', () => {
    // Mike's ruling, 2026-09-14. The engine needs a three-way basis; the advisor is
    // asked one question. If this mapping breaks, people are costed by the wrong maths
    // and every figure on the report is wrong while the screen still looks right.
    const wrapper = mountWithBuefy(WagesTeam)
    const out = confirmed(wrapper)
    const seen = {}
    out.people.forEach((p) => { seen[p.division] = p.wageBasis })
    expect(seen).toEqual({
      Admin: 'salary',
      Sales: 'salary',
      Production: 'production',
      Management: 'management'
    })
  })

  it('reproduces the engine\'s own sample people exactly', () => {
    // End to end for the copy: what step 1 hands over equals what the golden test
    // was written against, field for field.
    const wrapper = mountWithBuefy(WagesTeam)
    const out = confirmed(wrapper)
    out.people.forEach((p, i) => {
      const src = DEFAULT_INPUTS.people[i]
      expect(p.name).toBe(src.name)
      expect(p.wageBasis).toBe(src.wageBasis)
      expect(p.employment).toBe(src.employment)
      expect(p.chargeRate).toBe(src.chargeRate)
      expect(p.payRate).toBe(src.payRate)
      expect(p.dailyEfficiency).toBeCloseTo(src.dailyEfficiency, 10)
      expect(p.retirementPct).toBeCloseTo(src.retirementPct, 10)
      expect(p.overtimePct).toBeCloseTo(src.overtimePct, 10)
      expect(p.leaveDays).toBe(src.leaveDays)
      expect(p.toolsWeekly).toBe(src.toolsWeekly)
    })
  })

  it('sends percentages as decimals, not as the numbers on screen', () => {
    // 3 on screen is 0.03 to the engine. Getting this backwards gives an employer
    // retirement contribution of 300% and a report nobody questions until the total
    // is absurd.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.people[0].retirementPct = 4.5
    wrapper.vm.people[0].efficiencyPct = 92
    const out = confirmed(wrapper)
    expect(out.people[0].retirementPct).toBeCloseTo(0.045, 10)
    expect(out.people[0].dailyEfficiency).toBeCloseTo(0.92, 10)
  })

  it('turns a blank or non-numeric figure into zero rather than NaN', () => {
    // A row added and left half-typed must not poison the engine: NaN propagates
    // through every total and renders as a blank, which reads as "nothing here"
    // rather than "this is broken".
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    // Named, and found by name: the payload is in display order, so an added person is
    // wherever their division puts them — not necessarily last.
    wrapper.vm.people[wrapper.vm.people.length - 1].name = 'Half typed'
    const out = confirmed(wrapper)
    const added = out.people.find(p => p.name === 'Half typed')
    expect(added.chargeRate).toBe(0)
    expect(added.payRate).toBe(0)
    expect(added.dailyEfficiency).toBe(0)
    expect(added.leaveDays).toBe(0)
    expect(Object.values(added).some(v => typeof v === 'number' && isNaN(v))).toBe(false)
  })

  it('gives an added person a division, so the basis can never come out undefined', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    wrapper.vm.people[wrapper.vm.people.length - 1].name = 'Fresh row'
    const out = confirmed(wrapper)
    expect(out.people.find(p => p.name === 'Fresh row').wageBasis).toBe('production')
  })
})

describe('WagesTeam — the grid', () => {
  it('adds and removes rows', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    const before = wrapper.vm.people.length
    wrapper.vm.addPerson()
    expect(wrapper.vm.people.length).toBe(before + 1)
    wrapper.vm.removePerson(wrapper.vm.people[0])
    expect(wrapper.vm.people.length).toBe(before)
  })

  it('removes the person clicked, not the one at that position in the array', () => {
    // The grid's display order is not the array's, so removing by index would delete
    // somebody else — silently, and only for the divisions that sort out of position.
    const wrapper = mountWithBuefy(WagesTeam)
    const victim = wrapper.vm.orderedPeople[0]
    const bystander = wrapper.vm.orderedPeople[1]
    wrapper.vm.removePerson(victim)
    expect(wrapper.vm.people.indexOf(victim)).toBe(-1)
    expect(wrapper.vm.people.indexOf(bystander)).not.toBe(-1)
  })

  it('refuses to remove the last row', () => {
    // An empty grid leaves the advisor nothing to type into and no way back.
    const wrapper = mountWithBuefy(WagesTeam)
    const solo = { id: 1, name: 'Solo', division: 'Admin', employment: 'Full Time' }
    wrapper.setData({ people: [solo] })
    wrapper.vm.removePerson(solo)
    expect(wrapper.vm.people.length).toBe(1)
  })

  it('counts people who bill separately from people who do not', () => {
    // The overhead count is the one figure on this screen that catches a real mistake:
    // the engine gives a person with no charge-out rate zero working days, so they
    // cost and never bill. Right for a genuine overhead role, wrong for a typo.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.setData({
      people: [
        { name: 'Bills', division: 'Production', employment: 'Full Time', chargeRate: 55 },
        { name: 'Does not', division: 'Admin', employment: 'Full Time', chargeRate: 0 },
        { name: '', division: 'Admin', employment: 'Full Time', chargeRate: 0 }
      ]
    })
    expect(wrapper.vm.namedPeople).toBe(2)
    expect(wrapper.vm.chargingPeople).toBe(1)
    expect(wrapper.vm.overheadPeople).toBe(1)
  })
})

describe('WagesTeam — the grid groups itself by division', () => {
  // Mike, 2026-09-14: he added an Admin person and found them at the foot of the page,
  // below Management. The grid now groups into the workbook's own four blocks.
  const ORDER = ['Admin', 'Sales', 'Production', 'Management']

  /** @param {object} wrapper @returns {string[]} the divisions as displayed, in order */
  function shown (wrapper) {
    return wrapper.vm.orderedPeople.map(p => p.division)
  }

  it('shows the four blocks in the workbook\'s order', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    const ranks = shown(wrapper).map(d => ORDER.indexOf(d))
    expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b))
  })

  it('puts an added Admin person under Admin, not at the foot of the page', () => {
    // The exact fault reported. Without grouping the new row lands last, below
    // Management, and the advisor has to hunt for what they just added.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    const added = wrapper.vm.people[wrapper.vm.people.length - 1]
    added.division = 'Admin'
    added.name = 'Newcomer'
    const order = shown(wrapper)
    const at = wrapper.vm.orderedPeople.indexOf(added)
    expect(order[at]).toBe('Admin')
    // Last of the Admin block, and everything after it is a later division.
    expect(order.slice(at + 1).every(d => ORDER.indexOf(d) > 0)).toBe(true)
  })

  it('moves a person into their new block when their division changes', () => {
    // The case per-role Add buttons would not have fixed, and the reason grouping was
    // chosen over them: Division is the control that decides a person's maths, so it
    // gets changed on rows that already exist.
    const wrapper = mountWithBuefy(WagesTeam)
    const person = wrapper.vm.people[0]
    expect(person.division).toBe('Admin')
    person.division = 'Management'
    const at = wrapper.vm.orderedPeople.indexOf(person)
    expect(shown(wrapper)[at]).toBe('Management')
    expect(shown(wrapper).slice(at + 1).every(d => d === 'Management')).toBe(true)
  })

  it('keeps people in their existing order within a block', () => {
    // Stable, not sorted: nothing re-arranges itself while the advisor is typing.
    const wrapper = mountWithBuefy(WagesTeam)
    const adminNames = wrapper.vm.orderedPeople
      .filter(p => p.division === 'Admin').map(p => p.name)
    expect(adminNames).toEqual(['Mary G', 'Agatha', 'Judy', 'Stephen'])
  })

  it('still shows a person whose division is not one of the four', () => {
    // A row the advisor cannot see is worse than one in the wrong place.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.people[0].division = 'Workshop'
    const order = shown(wrapper)
    expect(order.length).toBe(wrapper.vm.people.length)
    expect(order[order.length - 1]).toBe('Workshop')
  })

  it('gives every row an id of its own, so a re-order cannot swap two people\'s inputs', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    const ids = wrapper.vm.people.map(p => p.id)
    expect(ids.every(id => typeof id === 'number')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does not let the row id reach the engine', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]
    expect(Object.prototype.hasOwnProperty.call(out.people[0], 'id')).toBe(false)
  })
})

describe('WagesTeam — the overnight allowance follows the team', () => {
  // The defect this control exists for: the engine takes `allowances.seasonal` as ONE
  // fixed total, so before step 1 owned it, adding ten people or deleting twenty left
  // the allowance at 1,400 a month. A wrong figure produced by using the screen exactly
  // as intended, with nothing on screen to say so.
  //
  // In the workbook it is two typed cells per person — V "Overnight/ Meals + Accom'
  // Allowance" (175) times X "Avg Number of Nights/ Meals" (2) — summed by CF40.

  it('reproduces the workbook\'s 1,400 from the sample team', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    expect(wrapper.vm.allowanceTotal).toBe(1400)
  })

  it('takes it from four people at 175 x 2, not from a constant', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    const paid = wrapper.vm.people.filter(p => Number(p.allowanceRate) > 0)
    expect(paid.length).toBe(4)
    paid.forEach((p) => {
      expect(p.allowanceRate).toBe(175)
      expect(p.allowanceNights).toBe(2)
    })
  })

  it('RISES when a person who gets the allowance is added', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    const added = wrapper.vm.people[wrapper.vm.people.length - 1]
    added.allowanceRate = 175
    added.allowanceNights = 2
    expect(wrapper.vm.allowanceTotal).toBe(1750)
  })

  it('FALLS when one of them is removed', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    const paid = wrapper.vm.people.find(p => Number(p.allowanceRate) > 0)
    wrapper.vm.removePerson(paid)
    expect(wrapper.vm.allowanceTotal).toBe(1050)
  })

  it('moves when a rate or a night count is edited', () => {
    // The total must follow the team: an edited rate or night count moves it. (An earlier
    // comment here justified this by a workbook "trap" — three allowance cells with the
    // formula overtyped — which was a misreading of shared formulas and is withdrawn.
    // The behaviour is right regardless of why; see WagesTeam.vue.)
    const wrapper = mountWithBuefy(WagesTeam)
    const paid = wrapper.vm.people.find(p => Number(p.allowanceRate) > 0)
    paid.allowanceNights = 4
    expect(wrapper.vm.allowanceTotal).toBe(1750)
  })

  it('emits the total beside the people, as the engine\'s single figure', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]
    expect(out.allowances.seasonal).toBe(1400)
  })

  it('carries the three SHUTDOWN fields through, and starts them empty', () => {
    // Item 4.102, build step 5. The engine derives the shutdown basis from ten typed cells;
    // three of them had no control, so a team built here billed ZERO on that basis. They are
    // shown to everyone because step 2 — where the basis is chosen — comes after this step.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.people.forEach((p) => {
      expect(p.weeklyBaseHours).toBeNull()
      expect(p.weeklyOvertimeHours).toBeNull()
      expect(p.productivity).toBeNull()
    })
    // Empty in the SAMPLE too: `Shutdown Inputs` holds different figures for these same
    // people, so pre-filling would show a number from a different model of the same firm.
    const paid = wrapper.vm.people.find(p => p.name === 'Billy Ray')
    paid.weeklyBaseHours = 40
    paid.weeklyOvertimeHours = 5
    paid.productivity = 92 // the control is a percentage; the engine wants 0.92
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]
    const billy = out.people.find(p => p.name === 'Billy Ray')
    expect(billy.weeklyBaseHours).toBe(40)
    expect(billy.weeklyOvertimeHours).toBe(5)
    expect(billy.productivity).toBeCloseTo(0.92, 6)
  })

  it('🔴 BILLS REAL MONEY on the shutdown basis — the fault item 4.102 was', () => {
    // The end-to-end proof. Before this, a team built on THIS screen and run on the
    // Shutdown basis totalled zero revenue, because the engine read two ready-made arrays
    // that only the sample carried. One person with the three fields filled is enough to
    // show the chain is connected; the exact figures are pinned in the golden test.
    const wrapper = mountWithBuefy(WagesTeam)
    const p = wrapper.vm.people.find(x => x.name === 'Billy Ray')
    p.chargeRate = 55
    p.weeklyBaseHours = 40
    p.weeklyOvertimeHours = 0
    p.productivity = 92
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]

    const model = computeWages({
      basis: 'shutdown',
      settings: { statDays: 11, sickDays: 10, overtimeSuppressed: 'No' },
      allowances: { seasonal: 0 },
      months: SHUTDOWN_SAMPLE.months,
      people: out.people.map(x => Object.assign({}, x, {
        onPayroll: new Array(12).fill(true),
        payRise: new Array(12).fill(0)
      }))
    })
    expect(model.totals.revenue).toBeGreaterThan(0)
  })

  it('emits no shutdown allowance, because there is no such line', () => {
    // SETTLED 2026-09-14, and the reason has changed. This used to say the shutdown column
    // "interleaves label text with its formulas" so it could not be read — a misreading of
    // shared formulas; `CE7:CE38` is a clean `Y*AA` throughout. The real answer is better:
    // on the shutdown basis the allowance sits INSIDE each person's monthly wage
    // (`Shutdown Inputs` CL7), so there is no separate total to emit. Emitting one would
    // charge it twice. CORRECTION 3 in `server/report/wagesModel.js`.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]
    expect(out.allowances.shutdown).toBeUndefined()
  })

  it('carries both allowance cells per person, and survives a round trip', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.confirm()
    const payload = wrapper.emitted('confirmed')[0][0]
    const paid = payload.people.find(p => p.allowanceRate > 0)
    expect([paid.allowanceRate, paid.allowanceNights]).toEqual([175, 2])

    const back = mountWithBuefy(WagesTeam, { propsData: { restore: payload } })
    expect(back.vm.allowanceTotal).toBe(1400)
  })

  it('treats a blank allowance as nothing rather than NaN', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addPerson()
    expect(wrapper.vm.allowanceTotal).toBe(1400)
    expect(isNaN(wrapper.vm.allowanceTotal)).toBe(false)
  })
})

describe('WagesTeam — re-ordering rows is safe to do at all', () => {
  it('leaves the engine\'s figures unchanged when the team is re-ordered', () => {
    // The check that made grouping a safe change rather than a risky one. If row order
    // moved a figure, the screen would quietly report different numbers depending on
    // the sequence people were typed in.
    const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')
    const base = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    const shuffled = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    shuffled.people.reverse()

    const a = computeWages(base)
    const b = computeWages(shuffled)

    // Not toBe: IEEE-754 addition is not associative, so summing 29 people in a
    // different sequence differs in the last bits. 1e-6 of a dollar is a millionth of a
    // cent — the measured gap is 1.7e-10.
    expect(b.totals.wageCost).toBeCloseTo(a.totals.wageCost, 6)
    expect(b.totals.margin).toBeCloseTo(a.totals.margin, 6)
    expect(b.totals.revenue).toBeCloseTo(a.totals.revenue, 6)
    a.months.forEach((month, i) => {
      expect(b.months[i].margin).toBeCloseTo(month.margin, 6)
    })
  })
})

describe('WagesTeam — returning to the step', () => {
  it('rebuilds the grid from a confirmed payload, percentages and all', () => {
    // Stepping back must show what was typed, not the sample again. The percentage
    // round trip is where this goes wrong: 0.03 coming back as 0.03 on screen would
    // read as "nearly nothing" and be re-typed as 3, giving 0.0003 on the next save.
    const payload = {
      people: [{
        name: 'Returned',
        division: 'Sales',
        wageBasis: 'salary',
        employment: 'Part Time',
        chargeRate: 40,
        payRate: 21,
        dailyEfficiency: 0.85,
        retirementPct: 0.03,
        overtimePct: 0.5,
        leaveDays: 25,
        toolsWeekly: 12
      }]
    }
    const wrapper = mountWithBuefy(WagesTeam, { propsData: { restore: payload } })
    const row = wrapper.vm.people[0]
    expect(row.name).toBe('Returned')
    expect(row.efficiencyPct).toBeCloseTo(85, 10)
    expect(row.retirementPct).toBeCloseTo(3, 10)
    expect(row.overtimePct).toBeCloseTo(50, 10)

    // And back out again unchanged — the round trip is the property that matters.
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0].people[0]
    expect(out.dailyEfficiency).toBeCloseTo(0.85, 10)
    expect(out.retirementPct).toBeCloseTo(0.03, 10)
    expect(out.overtimePct).toBeCloseTo(0.5, 10)
    expect(out.wageBasis).toBe('salary')
  })

  it('does not show the sample notice when the advisor returns with their own figures', () => {
    const wrapper = mountWithBuefy(WagesTeam, { propsData: { restore: { people: [] } } })
    expect(wrapper.vm.showSample).toBe(false)
  })
})

describe('🔴 the two rate converters on step 1', () => {
  /**
   * Mike, 2026-09-14: "does it need a seperate Tab?? couldnt it just import the tax data into a
   * hidden section and apply across the model as needed?" The tab was dropped and these two
   * moved here, beside the two boxes they exist to fill in — the pay rate and the charge-out
   * rate. The other two calculators on the drawing (income tax, bonus gross-up) serve no step
   * of this model and are not built.
   *
   * What UAT cannot see, and these assert: the arithmetic, and that the helper never touches
   * the payload. A converter that quietly wrote into a person's row would be a figure nobody
   * typed.
   */
  it('turns a salary into an hourly rate, and back out as a month, a week and a day', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    Object.assign(wrapper.vm.helper, { salary: 145000, hoursPerWeek: 40, weeksPerYear: 52 })
    expect(wrapper.vm.helperHourly).toBeCloseTo(69.7115, 3)
    expect(wrapper.vm.helperWeekly).toBeCloseTo(2788.4615, 3)
    expect(wrapper.vm.helperDaily).toBeCloseTo(557.6923, 3)
  })

  it('gives a DASH rather than a number until the hours are known', () => {
    // A salary cannot be turned into an hourly rate without the hours, and inventing 40 would
    // be a figure the advisor never gave. `hoursPerWeek` starts empty for that reason.
    const wrapper = mountWithBuefy(WagesTeam)
    expect(wrapper.vm.helper.hoursPerWeek).toBeNull()
    wrapper.vm.helper.salary = 145000
    expect(wrapper.vm.helperHourly).toBeNull()
    wrapper.vm.helper.hoursPerWeek = 40
    expect(wrapper.vm.helperHourly).not.toBeNull()
  })

  it('starts weeks per year at 52, which is the calendar rather than a default', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    expect(wrapper.vm.helper.weeksPerYear).toBe(52)
  })

  it('blends one person’s rates across the work they do — the workbook’s own 323.75', () => {
    // `Hrly Rate & Tax Calculator` E25, the Director's column, for ONE PERSON rather than a
    // firm: 375x35% + 350x10% + 300x5% + 325x10% + 275x40%.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.helper.mix = [
      { label: 'Advisory', rate: 375, share: 35 },
      { label: 'Compliance', rate: 350, share: 10 },
      { label: 'Review', rate: 300, share: 5 },
      { label: 'Planning', rate: 325, share: 10 },
      { label: 'Supervision', rate: 275, share: 40 }
    ]
    expect(wrapper.vm.blendedRate).toBeCloseTo(323.75, 6)
    expect(wrapper.vm.mixShare).toBe(100)
  })

  it('🔴 SAYS SO when the mix does not add to a whole week', () => {
    // The guard the blended rate is worthless without. A mix adding to 80% returns a rate a
    // fifth too low and nothing else on the screen looks wrong.
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.helper.mix = [
      { label: 'Advisory', rate: 400, share: 50 },
      { label: 'Review', rate: 200, share: 30 }
    ]
    expect(wrapper.vm.mixShare).toBe(80)
    expect(wrapper.vm.blendedRate).toBeCloseTo(260, 6)
    // 260 is a real answer to a different question: 80% of a week. The warning is what stops
    // it being read as this person's rate.
    expect(wrapper.vm.blendedRate).toBeLessThan(400 * 0.5 + 200 * 0.5)
  })

  it('gives a dash rather than zero before anything is typed', () => {
    expect(mountWithBuefy(WagesTeam).vm.blendedRate).toBeNull()
  })

  it('adds and removes lines, and never removes the last one', () => {
    const wrapper = mountWithBuefy(WagesTeam)
    wrapper.vm.addMix()
    expect(wrapper.vm.helper.mix).toHaveLength(2)
    wrapper.vm.removeMix(1)
    expect(wrapper.vm.helper.mix).toHaveLength(1)
    wrapper.vm.removeMix(0)
    expect(wrapper.vm.helper.mix).toHaveLength(1)
  })

  it('🔴 NEVER reaches the payload — it is a helper, not an input', () => {
    // The whole safety property. The advisor reads the answer and types it into the row it
    // belongs to; nothing here is saved, and no person's figure changes because of it.
    const wrapper = mountWithBuefy(WagesTeam)
    const before = JSON.stringify(wrapper.vm.orderedPeople)
    Object.assign(wrapper.vm.helper, { salary: 145000, hoursPerWeek: 40 })
    wrapper.vm.helper.mix = [{ label: 'Advisory', rate: 375, share: 100 }]
    wrapper.vm.confirm()
    const out = wrapper.emitted('confirmed')[0][0]
    expect(JSON.stringify(wrapper.vm.orderedPeople)).toBe(before)
    expect(JSON.stringify(out)).not.toContain('145000')
    expect(Object.keys(out).sort()).toEqual(['allowances', 'people'])
  })

  it('does not shadow the currency mixin’s own `num`, which formats rather than computes', () => {
    // An earlier cut added a `num` method here to do arithmetic in the template. The mixin
    // already supplies one and it returns a STRING; shadowing it would have left any later
    // use silently returning the wrong type. `mixContribution` exists for that reason.
    const wrapper = mountWithBuefy(WagesTeam)
    expect(typeof wrapper.vm.num(1234)).toBe('string')
    expect(wrapper.vm.mixContribution({ rate: 375, share: 35 })).toBeCloseTo(131.25, 6)
  })
})

/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesWork = require('../../components/WagesWork.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesWork — step 2 of the Wages/Salary Review (item 5.1): how the work happens.
 *
 * Nothing here pins a label or a colour; UAT reads those in five seconds. What UAT cannot
 * see is whether the nested shape this step hands over is the one `computeWages` reads.
 * `settings.production.wet.daysLost` landing one level out, or the basis arriving as
 * anything but 'seasonal'/'shutdown', gives a full report of plausible wrong numbers.
 *
 * The first block is the one that matters most: the settings this screen emits must
 * reproduce the golden figures when fed back to the engine untouched.
 */
/**
 * The overtime declaration is REQUIRED and Continue is refused while it is unanswered, so
 * every payload test answers it first. `false` matches the workbook — its own blank cell
 * amounted to no overtime being paid — which is what keeps the golden figures still.
 * @param {object} wrapper @returns {object} the payload from pressing Continue
 */
function confirmed (wrapper, overtimePaid) {
  wrapper.vm.overtimePaid = overtimePaid === undefined ? false : overtimePaid
  wrapper.vm.confirm()
  return wrapper.emitted('confirmed')[0][0]
}

describe('WagesWork — the settings reach the engine unchanged', () => {
  it('emits the engine\'s own sample settings, field for field', () => {
    const out = confirmed(mountWithBuefy(WagesWork))
    expect(out.basis).toBe(DEFAULT_INPUTS.basis)
    expect(out.seasonNames).toEqual(DEFAULT_INPUTS.seasonNames)
    expect(out.settings).toEqual(DEFAULT_INPUTS.settings)
  })

  it('reproduces the golden year when its settings are fed back to the engine', () => {
    // The end-to-end property: step 2's output, dropped into the engine in place of its
    // own defaults, must not move a figure. A nesting mistake shows up here and nowhere
    // on screen.
    const out = confirmed(mountWithBuefy(WagesWork))
    const swapped = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_INPUTS)), {
      basis: out.basis,
      seasonNames: out.seasonNames,
      settings: out.settings
    })
    const golden = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))
    const mine = computeWages(swapped)
    expect(mine.totals.wageCost).toBeCloseTo(golden.totals.wageCost, 6)
    expect(mine.totals.margin).toBeCloseTo(golden.totals.margin, 6)
    golden.months.forEach((m, i) => {
      expect(mine.months[i].margin).toBeCloseTo(m.margin, 6)
    })
  })

  it('nests the three seasons and daysLostApply where the engine looks for them', () => {
    const out = confirmed(mountWithBuefy(WagesWork))
    expect(Object.keys(out.settings.production).sort()).toEqual(['daysLostApply', 'dry', 'std', 'wet'])
    expect(out.settings.production.wet.daysLost).toBe(4)
    expect(out.settings.production.dry.hoursPerDay).toBe(10)
    expect(out.settings.production.daysLostApply).toBe(true)
  })

  it('sends a real number where a control was left blank', () => {
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.setData({ statDays: null, hoursPerDayPartTime: '' })
    const out = confirmed(wrapper)
    expect(out.settings.statDays).toBe(0)
    expect(out.settings.hoursPerDayPartTime).toBe(0)
  })
})

describe('WagesWork — the basis', () => {
  it('offers exactly the two the engine understands, and never a blend', () => {
    // Mike's decision 3, 2026-09-14: one model, a two-button switch. Revenue and cost
    // swap sides together, so a third state would be a report of mixed maths.
    const wrapper = mountWithBuefy(WagesWork)
    expect(wrapper.vm.basis).toBe('seasonal')
    wrapper.setData({ basis: 'shutdown' })
    wrapper.vm.overtimePaid = false // the declaration is required; see its own block
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].basis).toBe('shutdown')
  })

  it('falls back to seasonal rather than passing an unknown basis through', () => {
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.setData({ basis: 'something else' })
    wrapper.vm.overtimePaid = false // the declaration is required; see its own block
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].basis).toBe('seasonal')
  })
})

describe('🔴 WagesWork — the overtime declaration, which cannot be skipped', () => {
  /**
   * Mike, 2026-09-14: a longer season demands extra hours, and agreeing to work them is not
   * agreeing to work them unpaid. The owner declares whether overtime is paid for them, or
   * whether the time is taken back in lieu during the short season.
   *
   * The workbook asked this with ONE UNLABELLED CELL (`Seasonal Inputs` J4) that was blank,
   * and blank refused every production worker 97.425 hours a month of overtime the model had
   * already calculated — switching it on meant typing the word "No". These tests exist
   * because that failure was silent and expensive, and UAT cannot see a question nobody asked.
   */
  it('REFUSES to continue while it is unanswered, and emits nothing at all', () => {
    const wrapper = mountWithBuefy(WagesWork)
    expect(wrapper.vm.overtimePaid).toBeNull() // no default — null is not an answer
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')).toBeUndefined()
  })

  it('continues once answered, either way', () => {
    expect(confirmed(mountWithBuefy(WagesWork), false).settings.overtimePaid).toBe(false)
    expect(confirmed(mountWithBuefy(WagesWork), true).settings.overtimePaid).toBe(true)
  })

  it('🔴 actually PAYS the overtime when the owner says it is paid', () => {
    // The point of the whole control. On the workbook's own team this is 172,194 a year —
    // not a rounding difference, and exactly what was being lost in silence.
    const off = computeWages(Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_INPUTS))))
    const on = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    on.settings = confirmed(mountWithBuefy(WagesWork), true).settings
    const paid = computeWages(on)
    expect(paid.totals.wageCost - off.totals.wageCost).toBeCloseTo(172193.73, 1)
    expect(paid.totals.margin).toBeLessThan(off.totals.margin)
  })

  it('pays it in the season that demands the extra hours, and not in the others', () => {
    // Wet is SHORTER than standard and standard is the baseline, so neither has extra hours
    // to pay for. That falls out of the arithmetic now — it is not a per-season exception.
    const on = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    on.settings.overtimePaid = true
    const off = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))
    const paid = computeWages(on)
    const by = (m, k) => m.seasons.find(s => s.season === k).cost
    expect(by(paid, 'dry')).toBeGreaterThan(by(off, 'dry'))
    expect(by(paid, 'wet')).toBeCloseTo(by(off, 'wet'), 6)
    expect(by(paid, 'std')).toBeCloseTo(by(off, 'std'), 6)
  })

  it('restores the owner\'s answer when the advisor steps back to this screen', () => {
    const wrapper = mountWithBuefy(WagesWork, {
      propsData: { restore: { basis: 'seasonal', settings: { overtimePaid: true } } }
    })
    expect(wrapper.vm.overtimePaid).toBe(true)
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].settings.overtimePaid).toBe(true)
  })
})

describe('WagesWork — the season names are data, not labels', () => {
  it('sends the advisor\'s own season names through', () => {
    // Typed in the workbook, and the sharpest case of the "nothing fixed as a constant"
    // rule: a horticultural client's three seasons are not a builder's three.
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.vm.seasonNames.wet = 'Monsoon'
    wrapper.vm.overtimePaid = false // the declaration is required; see its own block
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].seasonNames.wet).toBe('Monsoon')
  })

  it('keeps all three keys even when one is cleared', () => {
    // The engine maps a month's season NAME onto its key; a missing key would send
    // every month of that season to the standard fallback without saying so.
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.vm.seasonNames.dry = ''
    wrapper.vm.overtimePaid = false // the declaration is required; see its own block
    wrapper.vm.confirm()
    expect(Object.keys(wrapper.emitted('confirmed')[0][0].seasonNames).sort())
      .toEqual(['dry', 'std', 'wet'])
  })
})

describe('WagesWork — returning to the step', () => {
  it('rebuilds every control from a confirmed payload', () => {
    const first = mountWithBuefy(WagesWork)
    first.setData({ basis: 'shutdown', statDays: 9, daysPerWeek: 4 })
    first.vm.production.wet.daysLost = 6
    const payload = confirmed(first, true)

    const back = mountWithBuefy(WagesWork, { propsData: { restore: payload } })
    expect(back.vm.basis).toBe('shutdown')
    expect(back.vm.statDays).toBe(9)
    expect(back.vm.daysPerWeek).toBe(4)
    expect(back.vm.production.wet.daysLost).toBe(6)
    expect(back.vm.showSample).toBe(false)

    // And back out unchanged — the round trip is the property that matters.
    back.vm.confirm()
    expect(back.emitted('confirmed')[0][0].settings).toEqual(payload.settings)
  })
})

describe('WagesWork — the headline figures', () => {
  it('moves the moment a season setting changes, because these are not constants', () => {
    // The drawing's own warning about this block: six of its ten settings would have
    // been shipped as constants. A headline that reacts is the cheapest way to show an
    // advisor that they are not.
    const wrapper = mountWithBuefy(WagesWork)
    const before = wrapper.vm.fieldHoursPerMonth
    wrapper.vm.production.std.hoursPerDay = 9
    expect(wrapper.vm.fieldHoursPerMonth).not.toBe(before)
  })

  it('reports the swing between the best and worst season', () => {
    const wrapper = mountWithBuefy(WagesWork)
    expect(Number(wrapper.vm.seasonSwing)).toBeGreaterThan(0)
    // Flat settings across all three seasons mean no weather effect at all.
    wrapper.vm.production.dry = { hoursPerDay: 8, daysPerWeek: 5, daysLost: 0 }
    wrapper.vm.production.std = { hoursPerDay: 8, daysPerWeek: 5, daysLost: 0 }
    wrapper.vm.production.wet = { hoursPerDay: 8, daysPerWeek: 5, daysLost: 0 }
    expect(Number(wrapper.vm.seasonSwing)).toBe(0)
  })
})

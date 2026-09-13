/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesWork = require('../../components/WagesWork.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesWork — step 2 of the Wages/Salary Review (item 4.100): how the work happens.
 *
 * Nothing here pins a label or a colour; UAT reads those in five seconds. What UAT cannot
 * see is whether the nested shape this step hands over is the one `computeWages` reads.
 * `settings.production.wet.daysLost` landing one level out, or the basis arriving as
 * anything but 'seasonal'/'shutdown', gives a full report of plausible wrong numbers.
 *
 * The first block is the one that matters most: the settings this screen emits must
 * reproduce the golden figures when fed back to the engine untouched.
 */
describe('WagesWork — the settings reach the engine unchanged', () => {
  /** @returns {object} the payload from pressing Continue on a fresh mount. */
  function confirmed (wrapper) {
    wrapper.vm.confirm()
    return wrapper.emitted('confirmed')[0][0]
  }

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
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].basis).toBe('shutdown')
  })

  it('falls back to seasonal rather than passing an unknown basis through', () => {
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.setData({ basis: 'something else' })
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].basis).toBe('seasonal')
  })
})

describe('WagesWork — the overtime flag it deliberately does not show', () => {
  it('carries the flag through untouched instead of inventing a value for it', () => {
    // `Seasonal Inputs` J4 is read by 12 formulas and is BLANK in the sample, and blank
    // is a third state — not the same as No. Nothing in the workbook or the drawing
    // names it, so no control was invented. Passing it through is what keeps that
    // honest: the step neither sets it nor loses it.
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].settings.overtimeSuppressed).toBeNull()
  })

  it('preserves a flag that arrives on a restored payload', () => {
    const wrapper = mountWithBuefy(WagesWork, {
      propsData: { restore: { basis: 'seasonal', settings: { overtimeSuppressed: 'Yes' } } }
    })
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].settings.overtimeSuppressed).toBe('Yes')
  })
})

describe('WagesWork — the season names are data, not labels', () => {
  it('sends the advisor\'s own season names through', () => {
    // Typed in the workbook, and the sharpest case of the "nothing fixed as a constant"
    // rule: a horticultural client's three seasons are not a builder's three.
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.vm.seasonNames.wet = 'Monsoon'
    wrapper.vm.confirm()
    expect(wrapper.emitted('confirmed')[0][0].seasonNames.wet).toBe('Monsoon')
  })

  it('keeps all three keys even when one is cleared', () => {
    // The engine maps a month's season NAME onto its key; a missing key would send
    // every month of that season to the standard fallback without saying so.
    const wrapper = mountWithBuefy(WagesWork)
    wrapper.vm.seasonNames.dry = ''
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
    first.vm.confirm()
    const payload = first.emitted('confirmed')[0][0]

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

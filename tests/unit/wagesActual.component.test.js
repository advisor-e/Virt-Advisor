/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesActual = require('../../components/WagesActual.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesActual — step 4 of the Wages/Salary Review (item 5.1): what actually happened.
 *
 * The smallest step and the one the whole model is judged by. `Cash Report` row 24 is
 * twelve typed cells the advisor fills in; nothing imports them. The drawing's first cut
 * left this row out entirely, which is how the model nearly shipped with no way to judge
 * the plan against reality.
 *
 * What UAT cannot see: whether the twelve figures reach the engine attached to the right
 * months, and whether a blank month is distinguishable from a zero one.
 */
const MONTHS = DEFAULT_INPUTS.months.map(m => ({
  name: m.name,
  season: m.season,
  productionDays: m.productionDays,
  allowanceApplies: m.allowanceApplies
}))

/** @returns {object} a mounted step 4 carrying the engine's own twelve months. */
function mountActual (extra) {
  return mountWithBuefy(WagesActual, { propsData: Object.assign({ months: MONTHS }, extra) })
}

/** @param {object} wrapper @returns {object} the payload from pressing Continue. */
function confirmed (wrapper) {
  wrapper.vm.confirm()
  return wrapper.emitted('confirmed')[0][0]
}

describe('WagesActual — the actuals reach the engine on the right months', () => {
  it('emits the workbook\'s own twelve actuals', () => {
    const out = confirmed(mountActual())
    expect(out.months.map(m => m.actualMargin))
      .toEqual(DEFAULT_INPUTS.months.map(m => m.actualMargin))
  })

  it('keeps everything step 3 settled about each month', () => {
    // The actual is ATTACHED to the month, not a parallel list — a twelve-figure array
    // landing one month out would give every variance to the wrong month, and each one
    // would still look plausible.
    const out = confirmed(mountActual())
    out.months.forEach((m, i) => {
      expect(m.name).toBe(MONTHS[i].name)
      expect(m.season).toBe(MONTHS[i].season)
      expect(m.productionDays).toBe(MONTHS[i].productionDays)
      expect(m.allowanceApplies).toBe(MONTHS[i].allowanceApplies)
    })
  })

  it('reproduces the golden variance when fed back to the engine', () => {
    // The figure the model exists to show. July's actual is a LOSS in the sample, so this
    // also proves a negative survives the round trip.
    const out = confirmed(mountActual())
    const swapped = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_INPUTS)), { months: out.months })
    const golden = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))
    const mine = computeWages(swapped)
    expect(mine.totals.actual).toBeCloseTo(golden.totals.actual, 6)
    expect(mine.totals.variance).toBeCloseTo(golden.totals.variance, 6)
  })

  it('carries a negative month through as a loss, not as nothing', () => {
    const out = confirmed(mountActual())
    expect(out.months.find(m => m.name === 'Jul').actualMargin).toBe(-5000)
  })

  it('sends a blank month as zero rather than NaN', () => {
    const wrapper = mountActual()
    wrapper.vm.rows[0].actualMargin = null
    wrapper.vm.rows[1].actualMargin = ''
    const out = confirmed(wrapper)
    expect(out.months[0].actualMargin).toBe(0)
    expect(out.months[1].actualMargin).toBe(0)
    expect(out.months.some(m => isNaN(m.actualMargin))).toBe(false)
  })
})

describe('WagesActual — telling a blank month from a zero one', () => {
  it('counts only the months the advisor has actually filled in', () => {
    // Both reach the engine as 0, because that is what the workbook's blank cell does.
    // But an advisor four months into the year needs to see which is which.
    const wrapper = mountActual()
    expect(wrapper.vm.monthsEntered).toBe(12)
    wrapper.vm.rows[0].actualMargin = null
    wrapper.vm.rows[1].actualMargin = ''
    expect(wrapper.vm.monthsEntered).toBe(10)
  })

  it('counts a genuine zero as entered', () => {
    const wrapper = mountActual()
    wrapper.vm.rows[0].actualMargin = 0
    expect(wrapper.vm.monthsEntered).toBe(12)
  })
})

describe('WagesActual — the headline figures', () => {
  it('totals the year from the twelve months', () => {
    const wrapper = mountActual()
    const expected = DEFAULT_INPUTS.months.reduce((s, m) => s + m.actualMargin, 0)
    expect(wrapper.vm.yearActual).toBe(expected)
  })

  it('names the worst month, which is the conversation an advisor opens with', () => {
    const wrapper = mountActual()
    expect(wrapper.vm.worstMonth).toContain('Jul')
    expect(wrapper.vm.worstIsLoss).toBe(true)
  })

  it('says nothing about a worst month when none has been entered', () => {
    const wrapper = mountActual()
    wrapper.vm.rows.forEach((r) => { r.actualMargin = null })
    expect(wrapper.vm.worstMonth).toBe('—')
    expect(wrapper.vm.worstIsLoss).toBe(false)
  })
})

describe('WagesActual — the months come from step 3', () => {
  it('labels the boxes with the firm\'s own month names', () => {
    // A firm whose year starts in July would otherwise be typing its actuals against
    // somebody else's calendar.
    const wrapper = mountActual({
      months: [{ name: 'Jul' }, { name: 'Aug' }, { name: 'Sep' }]
    })
    expect(wrapper.vm.rows.map(r => r.name)).toEqual(['Jul', 'Aug', 'Sep'])
  })

  it('gives a month beyond the sample no invented actual', () => {
    const wrapper = mountActual({ months: MONTHS.concat([{ name: 'Extra' }]) })
    expect(wrapper.vm.rows[12].actualMargin).toBeNull()
    expect(wrapper.vm.monthsEntered).toBe(12)
  })

  it('renders without any months rather than throwing', () => {
    const wrapper = mountActual({ months: [] })
    expect(wrapper.vm.rows).toEqual([])
    expect(wrapper.vm.yearActual).toBe(0)
    expect(confirmed(wrapper).months).toEqual([])
  })

  it('survives a round trip through a confirmed payload', () => {
    const first = mountActual()
    first.vm.rows[3].actualMargin = -9999
    const payload = confirmed(first)
    const back = mountActual({ restore: payload })
    expect(back.vm.rows[3].actualMargin).toBe(-9999)
    expect(back.vm.showSample).toBe(false)
  })
})

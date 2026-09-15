/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesYear = require('../../components/WagesYear.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesYear — step 3 of the Wages/Salary Review (item 5.1): the year ahead.
 *
 * The largest step, and the one where a quiet mistake is least visible: a hiring plan and
 * twelve months of pay rises look plausible on screen whatever they contain. What UAT
 * cannot check is whether the year this screen hands over is the year the engine reads —
 * a season sent as a key instead of a name, or a rise sent as 5 instead of 0.05, gives a
 * full report of confident wrong numbers.
 *
 * The load-bearing test is the first: step 3's output, fed back to the engine, must
 * reproduce the golden year.
 */
const PEOPLE = DEFAULT_INPUTS.people.map(p => Object.assign({}, p))
const SEASON_NAMES = DEFAULT_INPUTS.seasonNames

/** @returns {object} a mounted step 3 carrying the engine's own team and season names. */
function mountYear (extra) {
  return mountWithBuefy(WagesYear, {
    propsData: Object.assign({ people: PEOPLE, seasonNames: SEASON_NAMES }, extra)
  })
}

/** @param {object} wrapper @returns {object} the payload from pressing Continue. */
function confirmed (wrapper) {
  wrapper.vm.confirm()
  return wrapper.emitted('confirmed')[0][0]
}

describe('WagesYear — the year reaches the engine unchanged', () => {
  it('emits the engine\'s own twelve months, field for field', () => {
    const out = confirmed(mountYear())
    expect(out.months).toEqual(DEFAULT_INPUTS.months.map(m => ({
      name: m.name,
      season: m.season,
      productionDays: m.productionDays,
      allowanceApplies: m.allowanceApplies
    })))
  })

  it('emits each person\'s hiring plan exactly as the workbook has it', () => {
    const out = confirmed(mountYear())
    out.people.forEach((p, i) => {
      expect(p.onPayroll).toEqual(DEFAULT_INPUTS.people[i].onPayroll)
      p.payRise.forEach((v, m) => {
        expect(v).toBeCloseTo(DEFAULT_INPUTS.people[i].payRise[m], 10)
      })
    })
  })

  it('reproduces the golden year when fed back to the engine', () => {
    // The end-to-end property. A month's season arriving as 'std' rather than
    // 'Std Season', or a rise as 5 rather than 0.05, shows up here and nowhere on screen.
    const out = confirmed(mountYear())
    const swapped = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_INPUTS)), {
      months: out.months,
      people: out.people
    })
    const golden = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))
    const mine = computeWages(swapped)
    expect(mine.totals.wageCost).toBeCloseTo(golden.totals.wageCost, 6)
    expect(mine.totals.margin).toBeCloseTo(golden.totals.margin, 6)
    expect(mine.totals.revenue).toBeCloseTo(golden.totals.revenue, 6)
    golden.months.forEach((m, i) => {
      expect(mine.months[i].margin).toBeCloseTo(m.margin, 6)
    })
  })

  it('does not set an actual margin — that is step 4\'s', () => {
    // A month arriving with an invented actual would be judged against it on the report,
    // and the variance is the figure the whole model exists to show.
    const out = confirmed(mountYear())
    out.months.forEach((m) => {
      expect(Object.prototype.hasOwnProperty.call(m, 'actualMargin')).toBe(false)
    })
  })

  it('keeps everything step 1 settled about a person', () => {
    const out = confirmed(mountYear())
    expect(out.people[0].wageBasis).toBe(PEOPLE[0].wageBasis)
    expect(out.people[0].chargeRate).toBe(PEOPLE[0].chargeRate)
    expect(out.people[0].allowanceRate).toBe(PEOPLE[0].allowanceRate)
  })
})

describe('WagesYear — seasons are stored by key and sent by name', () => {
  it('sends the firm\'s own season name, not the internal key', () => {
    // The engine matches a month to a season on the NAME. Sending 'std' would send every
    // month to the standard-season fallback — silently, because that IS a real season.
    const out = confirmed(mountYear())
    expect(out.months[0].season).toBe('Std Season')
    expect(out.months.map(m => m.season)).not.toContain('std')
  })

  it('follows a season renamed in step 2', () => {
    const out = confirmed(mountYear({
      seasonNames: { wet: 'Monsoon', std: 'Std Season', dry: 'Dry n Light' }
    }))
    expect(out.months.find(m => m.name === 'Jul').season).toBe('Monsoon')
  })

  it('offers the three seasons under the firm\'s own names', () => {
    const wrapper = mountYear({
      seasonNames: { wet: 'Monsoon', std: 'Normal', dry: 'Baking' }
    })
    expect(wrapper.vm.seasonOptions.map(o => o.key)).toEqual(['dry', 'std', 'wet'])
    expect(wrapper.vm.seasonOptions.map(o => o.name)).toEqual(['Baking', 'Normal', 'Monsoon'])
  })

  it('maps a restored payload\'s season NAME back onto its key', () => {
    // A payload stores names; the pickers hold keys. Without the reverse map every month
    // comes back on a blank picker and the advisor re-picks twelve of them.
    const first = mountYear()
    const payload = confirmed(first)
    const back = mountYear({ restore: payload })
    expect(back.vm.months[0].season).toBe('std')
    expect(back.vm.months[3].season).toBe('wet')
    expect(confirmed(back).months[3].season).toBe('Wet n Dark')
  })
})

describe('WagesYear — pay rises', () => {
  it('converts display percentages to the decimals the engine reads', () => {
    const wrapper = mountYear()
    wrapper.vm.rows[0].payRise = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7.5]
    expect(confirmed(wrapper).people[0].payRise[11]).toBeCloseTo(0.075, 10)
  })

  it('carries a rise that STOPS as well as one that starts', () => {
    // One person in the sample has 3% from Sep to Feb and nothing in March, which is why
    // a range is seeded rather than a start month. A rise that never ends is a different
    // year's wage bill.
    const out = confirmed(mountYear())
    const stopping = out.people[20].payRise
    expect(stopping[5]).toBeCloseTo(0.03, 10)
    expect(stopping[10]).toBeCloseTo(0.03, 10)
    expect(stopping[11]).toBe(0)
  })

  it('treats a blank rise as nothing rather than NaN', () => {
    const wrapper = mountYear()
    wrapper.vm.rows[0].payRise = [null, '', undefined, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const out = confirmed(wrapper)
    expect(out.people[0].payRise.slice(0, 3)).toEqual([0, 0, 0])
    expect(out.people[0].payRise.some(v => isNaN(v))).toBe(false)
  })

  it('shows the opening pay rate read-only, because a rise means nothing without it', () => {
    // Calculated in the workbook (`Annual Hiring Plan` E), so it gets no control.
    const wrapper = mountYear()
    expect(wrapper.vm.rows[0].openingRate).toBe(PEOPLE[0].payRate)
  })
})

describe('WagesYear — the hiring plan', () => {
  it('gives a person step 1 added beyond the sample a full year and no rise', () => {
    // The least surprising default, and the only one that is not an invented figure.
    const wrapper = mountWithBuefy(WagesYear, {
      propsData: {
        people: PEOPLE.concat([{ name: 'Newcomer', payRate: 30, wageBasis: 'production' }]),
        seasonNames: SEASON_NAMES
      }
    })
    const out = confirmed(wrapper)
    const added = out.people[out.people.length - 1]
    expect(added.onPayroll).toEqual(new Array(12).fill(true))
    expect(added.payRise).toEqual(new Array(12).fill(0))
  })

  it('reports the average headcount across the year, not the headcount today', () => {
    // A plan that quietly empties out shows here before it shows on the report.
    const wrapper = mountYear()
    expect(Number(wrapper.vm.averageHeadcount)).toBeGreaterThan(0)
    expect(Number(wrapper.vm.averageHeadcount)).toBeLessThan(PEOPLE.length)
  })

  it('counts the people receiving a rise', () => {
    const wrapper = mountYear()
    const expected = DEFAULT_INPUTS.people.filter(p => p.payRise.some(v => v > 0)).length
    expect(wrapper.vm.peopleWithRise).toBe(expected)
  })

  it('survives a round trip through a confirmed payload', () => {
    const first = mountYear()
    first.vm.rows[0].onPayroll = new Array(12).fill(false)
    first.vm.rows[0].payRise[0] = 9
    const payload = confirmed(first)

    const back = mountYear({ restore: payload })
    expect(back.vm.rows[0].onPayroll).toEqual(new Array(12).fill(false))
    expect(back.vm.rows[0].payRise[0]).toBeCloseTo(9, 10)
    expect(back.vm.showSample).toBe(false)
  })

  it('renders without a team rather than throwing', () => {
    // Reaching step 3 without step 1 should be impossible through the page, but a screen
    // that throws on empty input fails as a blank page with no explanation.
    const wrapper = mountWithBuefy(WagesYear, { propsData: { people: [], seasonNames: SEASON_NAMES } })
    expect(wrapper.vm.rows).toEqual([])
    expect(wrapper.vm.averageHeadcount).toBe('0')
    expect(confirmed(wrapper).people).toEqual([])
  })
})

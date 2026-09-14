/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesReport = require('../../components/WagesReport.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesReport — step 5 of the Wages/Salary Review (item 4.100): the report.
 *
 * The first screen of this model that calls the backend, so what it must not do is as
 * important as what it does: nothing here recalculates. That is why the four input steps
 * deliberately showed no planned figures — two implementations of one number is how they
 * start to disagree.
 *
 * `reportHeadlineConsistency.component.test.js` already guards the shared shape (the
 * HeroStrip, its placement, the stale greying, the persistent banner). What is left for
 * here is this model's own behaviour: the right request, the engine's figures rendered
 * unchanged, and the corrected figures the port fought for actually reaching the screen.
 */
const RESULT = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))

/** Mount with the backend answering successfully, and let the first result land. */
async function mountReport (propsData, data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: data || RESULT })
  }))
  const wrapper = mountWithBuefy(WagesReport, { propsData: propsData || {} })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('WagesReport — what it asks the backend for', () => {
  it('posts the assembled inputs to the wages route', async () => {
    const inputs = { basis: 'seasonal', people: [], months: [] }
    await mountReport({ inputs })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/report/wages-review')
    expect(JSON.parse(opts.body)).toEqual(inputs)
  })

  it('still asks, with an empty body, when no steps have been confirmed', async () => {
    // The route falls back to the workbook's sample, so the report shows the sample
    // behind its notice rather than a blank screen. Skipping the request would also
    // leave the stale banner unreachable — a report that cannot show it has failed is
    // worse than one showing the sample.
    await mountReport({})
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({})
  })

  it('recomputes when an earlier step changes', async () => {
    const wrapper = await mountReport({ inputs: { basis: 'seasonal' } })
    const before = global.fetch.mock.calls.length
    wrapper.setProps({ inputs: { basis: 'shutdown' } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.recompute()
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
  })
})

describe('WagesReport — it renders the engine\'s figures and computes nothing', () => {
  it('shows the year exactly as the engine returned it', async () => {
    const wrapper = await mountReport({})
    expect(wrapper.vm.totals).toEqual(RESULT.totals)
    expect(wrapper.vm.months).toEqual(RESULT.months)
    expect(wrapper.vm.seasons).toEqual(RESULT.seasons)
    expect(wrapper.vm.headcount).toBe(RESULT.headcount)
  })

  it('carries the two corrected workbook figures onto the screen', async () => {
    // The port's whole argument. With the workbook's defects reproduced the year margin
    // read 350,121 and July broke even at +181; corrected, the plan is 61,185 worse and
    // the tightest month of the year does NOT break even. If either ever reverts, this
    // is where it shows.
    const wrapper = await mountReport({})
    expect(wrapper.vm.totals.margin).toBeCloseTo(288935.26, 1)
    expect(wrapper.vm.totals.wageCost).toBeCloseTo(1073804.97, 1)
    const july = wrapper.vm.months.find(m => m.name === 'Jul')
    expect(july.margin).toBeLessThan(0)
    expect(july.margin).toBeCloseTo(-131.83, 1)
  })

  it('keeps billings unchanged, which is what makes the corrections attributable', async () => {
    const wrapper = await mountReport({})
    expect(wrapper.vm.totals.revenue).toBeCloseTo(1362740.23, 1)
  })

  it('drops the allowance line on the shutdown basis rather than reporting zero', async () => {
    // CORRECTION 3. The shutdown basis carries each person's allowance INSIDE their monthly
    // wage, so the engine's separate total is 0 there — correctly. Printing that as
    // "Overnight allowances for the year: $0" would tell an advisor the team receives none.
    // A figure that is right in the engine and false on the screen is exactly what UAT
    // cannot catch: $0 looks plausible.
    const shutdown = computeWages(Object.assign(
      {}, JSON.parse(JSON.stringify(DEFAULT_INPUTS)), { basis: 'shutdown' }
    ))
    expect(shutdown.totals.allowance).toBe(0)
    const off = await mountReport({}, shutdown)
    expect(off.vm.showsAllowanceLine).toBe(false)
    // Rendered, not just computed — so deleting the v-if fails this and not only the flag.
    // The assertion is on the FIGURE, never on the sentence around it.
    expect(off.find('.wr-basis').text()).not.toContain(off.vm.money(0))

    // Seasonal keeps it: there the allowance is a real line of its own, and 8,400 is the
    // workbook's own Cash Report R13.
    const on = await mountReport({})
    expect(on.vm.showsAllowanceLine).toBe(true)
    expect(on.vm.totals.allowance).toBe(8400)
    expect(on.find('.wr-basis').text()).toContain(on.vm.money(8400))
  })

  it('names the tightest month as a headline figure, and marks it a loss', async () => {
    const wrapper = await mountReport({})
    expect(wrapper.vm.tightestName).toBe('Jul')
    expect(wrapper.vm.tightestIsLoss).toBe(true)
    expect(wrapper.vm.tightestSub).toContain('Wet n Dark')
  })

  it('shows the season swing the model exists for', async () => {
    // The same team on the same pay: a wet month LOSES money and a dry one makes 52,270.
    // The year total hides that completely, which is why the seasons come first.
    const wrapper = await mountReport({})
    const wet = wrapper.vm.seasons.find(s => s.season === 'wet')
    const dry = wrapper.vm.seasons.find(s => s.season === 'dry')
    expect(wet.margin).toBeLessThan(0)
    expect(dry.margin).toBeGreaterThan(0)
    expect(dry.margin - wet.margin).toBeGreaterThan(60000)
  })
})

describe('WagesReport — before a result, and after a failure', () => {
  it('renders without throwing before the first response lands', async () => {
    // A report that explodes on empty state fails as a blank page with no explanation.
    global.fetch = jest.fn(() => new Promise(() => {}))
    const wrapper = mountWithBuefy(WagesReport, { propsData: {} })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.months).toEqual([])
    expect(wrapper.vm.totals.margin).toBe(0)
    expect(wrapper.vm.tightestName).toBe('—')
    expect(wrapper.vm.tightestIsLoss).toBe(false)
  })

  it('keeps the last good figures on screen when a recompute fails, greyed and flagged', async () => {
    // Never a blank screen, and never live-looking figures behind a silent failure.
    const wrapper = await mountReport({})
    expect(wrapper.vm.error).toBe(false)

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.error).toBe(true)
    expect(wrapper.vm.totals.margin).toBeCloseTo(288935.26, 1)
  })

  it('treats `error` as a flag, never as a message', async () => {
    // Rendering it printed the literal word "true" at advisors on Eight Levers for a day.
    const wrapper = await mountReport({})
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    expect(typeof wrapper.vm.error).toBe('boolean')
  })
})

describe('WagesReport — the two local formatters', () => {
  it('rounds hours to whole numbers and dashes what is not a number', async () => {
    const wrapper = await mountReport({})
    expect(wrapper.vm.hours(1401.42)).toBe('1401')
    expect(wrapper.vm.hours(null)).toBe('—')
  })

  it('shows a share as a one-decimal percentage', async () => {
    const wrapper = await mountReport({})
    expect(wrapper.vm.percent(0.21202519)).toBe('21.2%')
    expect(wrapper.vm.percent(undefined)).toBe('—')
  })
})

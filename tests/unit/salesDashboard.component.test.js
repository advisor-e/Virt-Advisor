/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const SalesDashboard = require('~/components/SalesDashboard.vue').default
const {
  computeSalesDashboard,
  DEFAULT_CEILINGS,
  DEFAULT_INPUTS
} = require('~/server/report/salesDashboardModel')

/**
 * The Sales Dashboard screen (item 4.95).
 *
 * What is worth a test here is what a person in UAT cannot see, per Mike's ruling of 2026-08-24:
 *
 *   - that the salesperson cut disappears when its column is absent, and that nothing about it
 *     reaches a model or leaves the screen (Decision 6's three limits);
 *   - that the trend card is absent rather than empty or invented when the data has no date
 *     (Decision 9) — the workbook's own sample is exactly that case;
 *   - that what the screen SENDS is already normal, so the model's safety net has nothing to do
 *     (Decision 2's pushing-apart);
 *   - that a row click narrows the trend and nothing else.
 *
 * What is NOT tested here is wording, colours or the presence of a class — a person sees all of
 * that instantly and judges it better than an assertion can.
 */

const SAMPLE = computeSalesDashboard(DEFAULT_INPUTS)

/** Mount with the backend answering successfully, and let the first result land. */
async function mountWith (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(SalesDashboard, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

/** The body of the nth POST the screen made. */
function sentBody (call) {
  return JSON.parse(global.fetch.mock.calls[call][1].body)
}

afterEach(() => { delete global.fetch })

describe('what the screen asks the backend for', () => {
  it('sends no rows at all on open, so the sample is the model\'s and never a second copy here', async () => {
    await mountWith(SAMPLE)
    expect(global.fetch).toHaveBeenCalledWith('/api/report/sales-dashboard', expect.any(Object))
    const body = sentBody(0)
    expect(body.sales).toBeUndefined()
    expect(body.ceilings).toBeUndefined()
    expect(body.focus).toBeUndefined()
  })

  it('does the calculation on the backend and holds none of its own', async () => {
    // Stack Constitution: a Vue component never computes. Every figure on screen is the
    // response's, so a screen mounted against an empty answer shows nothing rather than
    // inventing a total.
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.totals.salesValue).toBe(269683)
    expect(wrapper.vm.totals.transactions).toBe(140)
    expect(wrapper.vm.bands).toHaveLength(10)
  })

  it('seeds the ceiling boxes from what the model actually banded against, once', async () => {
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.ceilings).toEqual(DEFAULT_CEILINGS)

    // A later answer must not overwrite what the owner has typed since.
    wrapper.vm.setCeiling(0, 400)
    wrapper.vm.applyResult(SAMPLE)
    expect(wrapper.vm.ceilings[0]).toBe(400)
  })
})

describe('the band ceilings are the owner\'s — Decision 2', () => {
  it('sends ceilings that are already in order, so the model\'s safety net has nothing to do', async () => {
    // The screen pushes as the owner types, outward from the box they touched, so they SEE it
    // happen. Refusing instead would leave the box showing their number while the model banded
    // against the defaults — the fault Mike's ruling removed.
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.setCeiling(3, 9000) // past the 2,500 above it

    const sent = wrapper.vm.ceilings
    for (let i = 1; i < sent.length; i++) {
      expect(sent[i]).toBeGreaterThan(sent[i - 1])
    }
    expect(sent[3]).toBe(9000) // what they typed survives
    expect(sent[4]).toBe(9001) // and the one above moved aside
  })

  it('pushes downward too, and never below the floor', async () => {
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.setCeiling(2, 5) // below the two beneath it

    expect(wrapper.vm.ceilings[2]).toBe(5)
    expect(wrapper.vm.ceilings[1]).toBe(4)
    expect(wrapper.vm.ceilings[0]).toBe(3)
    expect(wrapper.vm.ceilings.every(c => c >= 1)).toBe(true)
  })

  it('reads a ceiling typed the way a person writes one', async () => {
    // The box shows "15,000" when it does not have the cursor, so the very next thing an owner
    // types into it arrives with a comma in it. Refusing that would clear the band; reading it
    // as 15 would reband the client's whole sales history against a nonsense ladder.
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.setCeiling(8, '25,000')
    expect(wrapper.vm.ceilings[8]).toBe(25000)

    wrapper.vm.setCeiling(8, '$30,000')
    expect(wrapper.vm.ceilings[8]).toBe(30000)

    wrapper.vm.setCeiling(8, 'abc')
    expect(wrapper.vm.ceilings[8]).toBeNull()
  })

  it('groups a ceiling for reading and shows plain digits to the box being typed in', async () => {
    // A money column whose floor reads "10,001 —" and whose ceiling reads "15000" makes the
    // reader do the grouping. Commas arriving mid-keystroke would jump the caret, so the box
    // with the cursor keeps the plain number.
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.ceilingValue(8)).toBe('15,000')
    wrapper.setData({ editing: 8 })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.ceilingValue(8)).toBe(15000)
  })

  it('sends the owner\'s ceilings once they have touched one', async () => {
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.setCeiling(0, 400)
    await wrapper.vm.recompute()
    const body = sentBody(global.fetch.mock.calls.length - 1)
    expect(body.ceilings[0]).toBe(400)
  })
})

describe('the trend card — Decision 9', () => {
  it('is absent on the workbook sample, which carries no date', async () => {
    // 🔴 Not an empty chart, and never a fabricated month. The card simply is not there.
    const wrapper = await mountWith(SAMPLE)
    expect(SAMPLE.trend).toBeNull()
    expect(wrapper.findComponent({ name: 'BarPairChart' }).exists()).toBe(false)
  })

  it('appears the moment the data really carries dates', async () => {
    const dated = computeSalesDashboard({
      sales: [
        { revenue: 100, cost: 40, brand: 'Smith', date: '2026-01-14' },
        { revenue: 300, cost: 90, brand: 'Jones', date: '2026-02-11' }
      ]
    })
    const wrapper = await mountWith(dated)
    expect(wrapper.findComponent({ name: 'BarPairChart' }).exists()).toBe(true)
    expect(wrapper.vm.trendGroups).toEqual([
      { label: 'Jan 26', a: 100, b: 60 },
      { label: 'Feb 26', a: 300, b: 210 }
    ])
  })

  it('labels a month with its year, so two Marches never read as a fall', async () => {
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.monthLabel('2026-03')).toBe('Mar 26')
    expect(wrapper.vm.monthLabel('2027-03')).toBe('Mar 27')
  })

  it('follows a clicked row, and asks the backend to narrow the trend alone', async () => {
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.focusOn({ name: 'Smith' })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.focus).toEqual({ dimension: 'brand', value: 'Smith' })
    const body = sentBody(global.fetch.mock.calls.length - 1)
    expect(body.focus).toEqual({ dimension: 'brand', value: 'Smith' })
  })

  it('clears the focus when the same row is clicked again', async () => {
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.focusOn({ name: 'Smith' })
    wrapper.vm.focusOn({ name: 'Smith' })
    expect(wrapper.vm.focus).toBeNull()
  })
})

describe('the five cuts — Decisions 5, 6 and 8', () => {
  it('offers every cut the data supports, and only those', async () => {
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.available).toEqual(['brand', 'product', 'category', 'region', 'salesperson'])
    expect(wrapper.vm.unavailable).toEqual([])
  })

  it('drops the salesperson cut when a firm does not supply the column', async () => {
    // Decision 6's third limit. The tab is simply not there — it falls out of `available`
    // rather than being special-cased, so nothing about it can be shown by accident.
    const noNames = computeSalesDashboard({
      sales: [{ revenue: 100, cost: 40, brand: 'Smith', region: 'Auckland' }]
    })
    const wrapper = await mountWith(noNames)
    expect(wrapper.vm.available).not.toContain('salesperson')
    expect(wrapper.vm.unavailable).toContain('salesperson')
  })

  it('moves off a cut that a newly imported file no longer has', async () => {
    // Otherwise the card would go on showing a tab whose table is empty, which reads as a
    // business that sold nothing rather than a file that never mentioned it.
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.dimension = 'salesperson'
    wrapper.vm.focus = { dimension: 'salesperson', value: 'Billy' }

    wrapper.vm.applyResult(computeSalesDashboard({
      sales: [{ revenue: 100, cost: 40, brand: 'Smith' }]
    }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.dimension).toBe('brand')
    expect(wrapper.vm.focus).toBeNull()
  })

  it('re-orders the table by the chosen measure, so the ring and the rows always agree', async () => {
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.rows[0].name).toBe('Smith') // largest by sales value

    wrapper.vm.measure = 'transactions'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.rows[0].name).toBe('Toyota') // 72 of the 140 sales

    // The ring is built from the same ordered rows, so slice N is row N's colour.
    expect(wrapper.vm.ringSlices[0].label).toBe('Toyota')
    expect(wrapper.vm.ringSlices[0].colour).toBe(wrapper.vm.colourAt(0))
  })

  it('gives a ring slice per row even when a cut has more members than the palette', async () => {
    const many = computeSalesDashboard({
      sales: Array.from({ length: 14 }, (_, i) => ({ revenue: 100 + i, cost: 10, brand: 'B' + i }))
    })
    const wrapper = await mountWith(many)
    expect(wrapper.vm.ringSlices).toHaveLength(14)
    expect(wrapper.vm.ringSlices.every(s => Boolean(s.colour))).toBe(true)
  })

  it('🔴 formats the ring\'s centre AS THE MEASURE IT IS — a count is not money', async () => {
    // Found by opening the screen: every measure went through `money()`, so choosing
    // Transactions put "$140" in the middle of the ring above the word TRANSACTIONS. A wrong
    // number in front of a client, and no assertion in the suite had an opinion about it.
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.measureTotalLabel).toBe('$269,683')

    wrapper.vm.measure = 'transactions'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.measureTotalLabel).toBe('140')

    wrapper.vm.measure = 'salesMargin'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.measureTotalLabel).toBe('$130,289')
  })

  it('draws no bar at all rather than dividing by zero on an all-zero cut', async () => {
    const zeroes = computeSalesDashboard({
      sales: [{ revenue: 0, cost: 0, brand: 'Smith' }]
    })
    const wrapper = await mountWith(zeroes)
    expect(wrapper.vm.barWidth(wrapper.vm.rows[0])).toBe('0%')
    expect(wrapper.vm.topTwoShare).toBe('—')
  })
})

describe('the sample is labelled as the sample', () => {
  it('says so until a file replaces it', async () => {
    // Report class opening on the workbook's figures: the notice is what keeps that honest, and
    // it is the same guard Quick Position and the Volatility Report carry.
    const wrapper = await mountWith(SAMPLE)
    expect(wrapper.vm.usingSample).toBe(true)
    expect(wrapper.findComponent({ name: 'SampleNotice' }).exists()).toBe(true)
  })

  it('stops saying so once the advisor\'s own sales are loaded', async () => {
    const wrapper = await mountWith(SAMPLE)
    wrapper.setData({ sales: [{ revenue: 100, cost: 40 }] })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.usingSample).toBe(false)
    expect(wrapper.findComponent({ name: 'SampleNotice' }).exists()).toBe(false)
  })
})

describe('the import', () => {
  it('refuses the wrong kind of file before it is ever sent', async () => {
    const wrapper = await mountWith(SAMPLE)
    const before = global.fetch.mock.calls.length
    await wrapper.vm.receive({ name: 'notes.pdf', size: 10 })
    expect(wrapper.vm.uploadError).toBe('report.fileCheck.wrongType')
    expect(global.fetch.mock.calls.length).toBe(before)
  })

  it('refuses a file over the cap before it is ever sent', async () => {
    const wrapper = await mountWith(SAMPLE)
    await wrapper.vm.receive({ name: 'sales.xlsx', size: 6 * 1024 * 1024 })
    expect(wrapper.vm.uploadError).toBe('report.fileCheck.tooBig')
  })

  it('replaces the sample outright, and drops a focus held over from it', async () => {
    // A new file describes a different business: a focus carried across would silently narrow
    // the trend to a name no longer on the page.
    const wrapper = await mountWith(SAMPLE)
    wrapper.vm.focusOn({ name: 'Smith' })

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: { sales: [{ revenue: 900, cost: 300 }], linesRead: 1, dimensions: [], hasDates: false }
        })
      })
      .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: SAMPLE }) })

    await wrapper.vm.upload({ name: 'sales.xlsx', size: 100 })
    expect(wrapper.vm.usingSample).toBe(false)
    expect(wrapper.vm.focus).toBeNull()
    expect(wrapper.vm.file.linesRead).toBe(1)
  })

  it('shows the backend\'s own refusal rather than a generic one', async () => {
    const wrapper = await mountWith(SAMPLE)
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        success: false,
        error: { code: 'UNRECOGNISED_SALES', message: 'It has no Sales Revenue column.' }
      })
    }))
    await wrapper.vm.upload({ name: 'sales.xlsx', size: 100 })
    expect(wrapper.vm.uploadError).toBe('It has no Sales Revenue column.')
    expect(wrapper.vm.usingSample).toBe(true) // and the sample is untouched
  })

  it('sends the read rows back to the calc route unchanged', async () => {
    const wrapper = await mountWith(SAMPLE)
    const rows = [{ brand: 'Smith', product: 'Coco', revenue: 900, cost: 300, date: '2026-02-01' }]
    wrapper.setData({ sales: rows })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.recomputeRequest().body.sales).toEqual(rows)
  })
})

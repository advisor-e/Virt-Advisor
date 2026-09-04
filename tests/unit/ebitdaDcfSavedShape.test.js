/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EbitdaDcfIntake = require('~/components/EbitdaDcfIntake.vue').default
const EbitdaDcfReport = require('~/components/EbitdaDcfReport.vue').default
const {
  ROW_KEYS, initialDials, flattenEbitdaDcf, rebuildEbitdaDcf
} = require('~/utils/ebitdaDcfSavedShape')
const saved = require('~/server/utils/savedReports')

/**
 * The EBITDA & DCF valuation's saved row (item 4.62, Brief §5). What UAT cannot see: the
 * confirmed figures are twenty-four rows by up to five years, each cell with its
 * provenance, and a partial set coming back from a hostile row would put saved years
 * beside sample ones with nothing on screen to say so. So the block is whole or nothing,
 * the dials are each their own shape, and the row list is pinned to the intake's own rows.
 */
function seed (n) {
  const years = Array.from({ length: n }, (_, i) => 2021 + i)
  const figures = {}
  ROW_KEYS.forEach((row, r) => {
    figures[row] = years.map((y, i) => ({ value: (r + 1) * 1000 + i, source: r < 8 ? 'file' : 'entered' }))
  })
  return { years, figures, companyName: 'Acme Ltd' }
}

describe('ebitdaDcfSavedShape', () => {
  it('ROW_KEYS is exactly the intake\'s rows, in its order — the two cannot drift apart', () => {
    const wrapper = mountWithBuefy(EbitdaDcfIntake)
    expect(ROW_KEYS).toEqual(Object.keys(wrapper.vm.defaultFigures(5)))
  })

  it('a row is flat, carries the years, every value and source, and the dials; the store admits it', () => {
    const row = flattenEbitdaDcf(seed(3), initialDials(3))
    expect(row.years).toEqual([2021, 2022, 2023])
    expect(row['fig.sales']).toEqual([1000, 1001, 1002])
    expect(row['src.sales']).toEqual(['file', 'file', 'file'])
    expect(row['src.fmSalaries']).toEqual(['entered', 'entered', 'entered'])
    expect(row['listed.ebitdaHistory']).toHaveLength(3)
    expect(row.companyName).toBeUndefined()
    expect(Object.keys(row)).toHaveLength(1 + ROW_KEYS.length * 2 + 7)
    expect(saved.validateInputs(row)).toEqual(row)
  })

  it('without confirmed figures the row is the dials alone', () => {
    const row = flattenEbitdaDcf(null, initialDials(5))
    expect(row.years).toBeUndefined()
    expect(Object.keys(row)).toHaveLength(7)
  })

  it('a full row round-trips the figures whole and the dials exactly', () => {
    const s = seed(4)
    const dials = initialDials(4)
    dials.dcf.exitMultiple = 3.5
    dials.listed.ebitdaHistory = [1, 2, 3, 4]
    const back = rebuildEbitdaDcf(flattenEbitdaDcf(s, dials), null, initialDials(5))
    expect(back.seed.years).toEqual(s.years)
    expect(back.seed.figures).toEqual(s.figures)
    expect(back.seed.companyName).toBeNull()
    expect(back.dials).toEqual(dials)
  })

  it('one bad cell refuses the whole figures block and keeps what the page held — never a mix', () => {
    const held = seed(2)
    const row = flattenEbitdaDcf(seed(5), initialDials(5))
    row['fig.otherIncome'][2] = 'lots'
    let back = rebuildEbitdaDcf(row, held, initialDials(2))
    expect(back.seed).toBe(held)
    expect(back.dials.listed.ebitdaHistory).toHaveLength(2) // sized to the years the page still holds

    const row2 = flattenEbitdaDcf(seed(5), initialDials(5))
    row2['src.sales'] = ['file', 'file', 'client', 'file', 'file'] // client is a comparison, never a stored source
    back = rebuildEbitdaDcf(row2, null, initialDials(5))
    expect(back.seed).toBeNull()

    const row3 = flattenEbitdaDcf(seed(5), initialDials(5))
    delete row3['fig.other5']
    expect(rebuildEbitdaDcf(row3, null, initialDials(5)).seed).toBeNull()

    const row4 = flattenEbitdaDcf(seed(5), initialDials(5))
    row4.years = [2021, 2022, 2023, 2024, 'x']
    expect(rebuildEbitdaDcf(row4, null, initialDials(5)).seed).toBeNull()
  })

  it('a dial is taken only in its own shape, and the history is one cell per year', () => {
    const current = initialDials(3)
    const back = rebuildEbitdaDcf({
      'dcf.growthPct': [1, 2, 3, 4, 5], //     taken
      'dcf.discountPct': [1, 2, 3], //         wrong length — kept
      'dcf.exitMultiple': NaN, //              kept
      'listed.sharePrice': 0.8, //             taken
      'listed.ebitdaHistory': [9, 9, 9, 9] //  four cells for three years — kept
    }, null, current)
    expect(back.dials.dcf.growthPct).toEqual([1, 2, 3, 4, 5])
    expect(back.dials.dcf.discountPct).toEqual(current.dcf.discountPct)
    expect(back.dials.dcf.exitMultiple).toBe(2)
    expect(back.dials.listed.sharePrice).toBe(0.8)
    expect(back.dials.listed.ebitdaHistory).toEqual(current.listed.ebitdaHistory)
    expect(rebuildEbitdaDcf('junk', null, current)).toEqual({ seed: null, dials: current })
  })
})

describe('EbitdaDcfReport — the saved-report seam', () => {
  let lastBody
  beforeEach(() => {
    lastBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/report/ebitda-dcf') {
        lastBody = JSON.parse(opts.body)
        return Promise.resolve({ json: () => Promise.resolve({ success: true, data: null }) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
  })
  afterEach(() => { delete global.fetch })

  async function settle (wrapper) {
    for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
  }

  it('restored dials drive the request, the sample notice stays down, and the page is told what the dials hold', async () => {
    const restore = initialDials(3)
    restore.dcf.exitMultiple = 4
    restore.listed.ebitdaHistory = [10, 20, 30]
    const wrapper = mountWithBuefy(EbitdaDcfReport, { propsData: { seed: seed(3), restore } })
    await wrapper.vm.recompute()
    await settle(wrapper)
    expect(lastBody.dcf.exitMultiple).toBe(4)
    expect(lastBody.listed.ebitdaHistory).toEqual([10, 20, 30])
    expect(lastBody.sales).toEqual([1000, 1001, 1002]) // the figures still come from the seed
    expect(wrapper.vm.dialsTouched).toBe(true)
    const emitted = wrapper.emitted('state-change')
    expect(emitted[0][0].dcf.exitMultiple).toBe(4)
    expect(emitted[0][0].dcf.growthPct).not.toBe(wrapper.vm.dcf.growthPct)
    wrapper.vm.listed.sharePrice = 1.25
    await settle(wrapper)
    expect(emitted[emitted.length - 1][0].listed.sharePrice).toBe(1.25)
  })

  it('a later restore replaces the dials whole', async () => {
    const wrapper = mountWithBuefy(EbitdaDcfReport, { propsData: { seed: seed(3) } })
    await settle(wrapper)
    expect(wrapper.vm.dialsTouched).toBe(false)
    const next = initialDials(3)
    next.dcf.growthPct = [1, 1, 1, 1, 1]
    await wrapper.setProps({ restore: next })
    await settle(wrapper)
    expect(wrapper.vm.dcf.growthPct).toEqual([1, 1, 1, 1, 1])
    expect(wrapper.vm.dcf.growthPct).not.toBe(next.dcf.growthPct)
    expect(wrapper.vm.dialsTouched).toBe(true)
  })
})

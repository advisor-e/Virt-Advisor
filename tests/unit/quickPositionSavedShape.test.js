/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const QuickPositionReport = require('~/components/QuickPositionReport.vue').default
const ProvenanceBadge = require('~/components/base/ProvenanceBadge.vue').default
const {
  SAMPLE_FIGURES, initialState, flattenQuickPosition, applySavedQuickPosition, seedFromState
} = require('~/utils/quickPositionSavedShape')
const saved = require('~/server/utils/savedReports')

/**
 * Quick Position adopts the saved-report seam (item 4.62, Brief §5). What UAT cannot see:
 * a saved row carries each figure's PROVENANCE beside its value, and a wrong tag is a lie
 * on a report — "from file" on a number a client typed, or a file figure silently
 * replaced by a sample. And the rule Mike gave on 2026-09-04: a file-sourced figure the
 * client changed shows `client` in place of `from file`, never beside it.
 */
function seed () {
  return {
    figures: {
      cash: { value: 120000, source: 'file' },
      debtors: { value: 45000, source: 'file' },
      stock: { value: 9000, source: 'file' },
      fixedAssets: { value: 30000, source: 'entered' },
      creditors: { value: 22000, source: 'file' },
      wagesDue: { value: 8000, source: 'file' }
    },
    serviceBusiness: false,
    expenseLines: [{ name: 'Rent', amount: 24000 }, { name: 'Power', amount: 3600 }],
    incomeTotal: 500000,
    companyName: 'Acme Ltd'
  }
}

describe('quickPositionSavedShape — state and row', () => {
  it('opens on the sample company with everything entered when there is no seed', () => {
    const s = initialState(null)
    expect(s.inputs.cash).toBe(SAMPLE_FIGURES.cash)
    expect(s.sources.cash).toBe('entered')
    expect(s.sources.monthlyFixedCosts).toBe('entered')
    expect(s.expenseLines).toBeNull()
  })

  it('a row is flat, carries every source and the expense lines, and the store admits it', () => {
    const row = flattenQuickPosition(initialState(seed()))
    expect(row.cash).toBe(120000)
    expect(row['source.cash']).toBe('file')
    expect(row['source.fixedAssets']).toBe('entered')
    expect(row.expenseNames).toEqual(['Rent', 'Power'])
    expect(row.expenseAmounts).toEqual([24000, 3600])
    expect(row.companyName).toBeUndefined() // a name from the file is never in a saved row
    expect(saved.validateInputs(row)).toEqual(row)
  })

  it('a saved row round-trips, and the confirm table follows it', () => {
    const state = initialState(seed())
    state.inputs.monthlyFixedCosts = 12345
    state.sources.monthlyFixedCosts = 'file'
    const back = applySavedQuickPosition(initialState(null), flattenQuickPosition(state))
    expect(back).toEqual(state)
    expect(back).not.toBe(state)
    const restored = seedFromState(back)
    expect(restored.figures.cash).toEqual({ value: 120000, source: 'file' })
    expect(restored.expenseLines).toEqual(seed().expenseLines)
    expect(restored.companyName).toBeNull()
  })

  it('takes each figure only in its own shape; a bad one keeps what the screen held', () => {
    const base = initialState(seed())
    const back = applySavedQuickPosition(base, {
      cash: 99000, //                       taken
      debtors: '45000', //                  wrong type — kept
      cashFactor: NaN, //                   kept
      'source.cash': 'client', //           not a stored source — kept (client is a comparison, never stored)
      'source.stock': 'entered', //         taken
      serviceBusiness: 'yes', //            kept
      expenseNames: ['Rent'], //            length differs from amounts — both kept
      expenseAmounts: [1, 2],
      bogus: 1
    })
    expect(back.inputs.cash).toBe(99000)
    expect(back.inputs.debtors).toBe(45000)
    expect(back.inputs.cashFactor).toBe(100)
    expect(back.sources.cash).toBe('file')
    expect(back.sources.stock).toBe('entered')
    expect(back.serviceBusiness).toBe(false)
    expect(back.expenseLines).toEqual(seed().expenseLines)
    expect(back.inputs.bogus).toBeUndefined()
    expect(applySavedQuickPosition(base, 'junk')).toEqual(base)
  })
})

describe('QuickPositionReport — the saved-report seam', () => {
  let lastBody
  beforeEach(() => {
    lastBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/report/quick-position') {
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

  it('a restored state drives the request instead of the seed, and the page is told what the screen holds', async () => {
    const restore = initialState(seed())
    restore.inputs.cash = 77000
    restore.inputs.monthlyFixedCosts = 5000
    const wrapper = mountWithBuefy(QuickPositionReport, { propsData: { seed: seed(), restore } })
    await wrapper.vm.recompute()
    await settle(wrapper)
    expect(lastBody.cash).toBe(77000)
    expect(lastBody.monthlyFixedCosts).toBe(5000)
    expect(lastBody.expenseLines).toEqual([{ amount: 24000, maintainedPct: 1 }, { amount: 3600, maintainedPct: 1 }])
    const emitted = wrapper.emitted('state-change')
    expect(emitted[0][0].inputs.cash).toBe(77000)
    expect(emitted[0][0].inputs).not.toBe(wrapper.vm.inputs)
    wrapper.vm.inputs.monthlyDrawings = 1500
    await settle(wrapper)
    expect(emitted[emitted.length - 1][0].inputs.monthlyDrawings).toBe(1500)
  })

  it('a later restore replaces the screen whole, sources included', async () => {
    const wrapper = mountWithBuefy(QuickPositionReport, { propsData: { seed: seed() } })
    await settle(wrapper)
    const next = initialState(null)
    next.inputs.monthlyFixedCosts = 31000
    next.sources.monthlyFixedCosts = 'file'
    await wrapper.setProps({ restore: next })
    await settle(wrapper)
    expect(wrapper.vm.inputs.cash).toBe(SAMPLE_FIGURES.cash)
    expect(wrapper.vm.sources.cash).toBe('entered')
    expect(wrapper.vm.sources.monthlyFixedCosts).toBe('file')
    expect(wrapper.vm.expenseLines).toBeNull()
  })

  it('a file-sourced figure the client changed shows client IN PLACE of from file (Mike, 2026-09-04)', async () => {
    const restore = initialState(seed())
    restore.sources.monthlyFixedCosts = 'file'
    const wrapper = mountWithBuefy(QuickPositionReport, {
      propsData: { seed: seed(), restore, clientChanges: ['monthlyFixedCosts', 'cashFactor'] }
    })
    await settle(wrapper)
    const badges = wrapper.findAllComponents(ProvenanceBadge)
    const sources = badges.wrappers.map(b => b.props('source'))
    expect(sources).toContain('client')
    expect(sources.filter(s => s === 'client')).toHaveLength(2) // fixed costs, and the cash factor's own badge
    // The cash VALUE keeps its file tag: the client changed the factor, not the figure.
    expect(sources.filter(s => s === 'file').length).toBeGreaterThan(0)
  })
})

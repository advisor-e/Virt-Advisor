/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const StockPurchasing = require('~/components/StockPurchasing.vue').default
const { computeStockPurchasing, DEFAULT_INPUTS } = require('~/server/report/stockPurchasingModel')

/**
 * Stock Purchasing — the screen (item 4.94).
 *
 * What these assert is deliberately narrow: the things that are WRONG rather than ugly, and none
 * of them is visible to a person in UAT. A headline reading $0 where a file simply never carried
 * sales, a criterion the data could not fill shown as a zero, and stock held scored as stock sold
 * all look perfectly fine on screen right up until an advisor acts on one.
 *
 * Wording, labels and CSS are NOT asserted here (Mike's ruling of 2026-08-24): a person sees those
 * in five seconds and judges them better than an assertion can.
 */

/** Mount with the backend answering, and let the first result land. */
async function mount (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(StockPurchasing, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

/** A stock-sheet import: two of the five criteria filled, three blank, and no sales anywhere. */
const IMPORTED_ONLY = computeStockPurchasing({
  lines: [
    { code: 'KB-100', avgUnitCost: 12.5, shareOfStock: 0.25, quantity: null, sales: null, cost: null },
    { code: 'PL-1', avgUnitCost: 200, shareOfStock: 0.75, quantity: null, sales: null, cost: null }
  ],
  shelf: { onHand: 400, inTransit: 50 }
})

afterEach(() => { delete global.fetch })

describe('Stock Purchasing screen', () => {
  describe('🔴 Report class — it never invents a client figure', () => {
    it('opens completely empty, and asks the backend for nothing', async () => {
      // The model returns the workbook sample only when asked for it. If this screen ever seeded
      // itself from that sample, a client's product list would open showing 969 of somebody
      // else's lines, formatted identically to their own. Guarded here as well as in the model.
      const wrapper = await mount(computeStockPurchasing())
      const body = wrapper.vm.recomputeRequest().body
      expect(body.lines).toEqual([])
      expect(body.shelf).toEqual({ onHand: null, inTransit: null })
      expect(body.exposure).toEqual({
        currentAssetsExStock: null, currentLiabilities: null, cashCommitted: null
      })
    })

    it('sends a blank box as null, never as 0 — an unentered figure is not a zero', async () => {
      const wrapper = await mount(computeStockPurchasing())
      wrapper.vm.addLine()
      wrapper.vm.setLine(0, 'code', 'Widget')
      wrapper.vm.setLine(0, 'quantity', '')
      wrapper.vm.setExposure('currentLiabilities', '')
      const body = wrapper.vm.recomputeRequest().body
      expect(body.lines[0].quantity).toBeNull()
      expect(body.lines[0].sales).toBeNull()
      expect(body.exposure.currentLiabilities).toBeNull()
    })

    it('sends typed numbers as numbers, not as the strings a text box hands back', async () => {
      // A quantity sent as "12" scores nothing: the model refuses strings on purpose, so a
      // screen that forwarded them would silently zero every criterion.
      const wrapper = await mount(computeStockPurchasing())
      wrapper.vm.addLine()
      wrapper.vm.setLine(0, 'quantity', '12')
      wrapper.vm.setLine(0, 'sales', '500')
      wrapper.vm.setExposure('cashCommitted', '60000')
      const body = wrapper.vm.recomputeRequest().body
      expect(body.lines[0].quantity).toBe(12)
      expect(body.lines[0].sales).toBe(500)
      expect(body.exposure.cashCommitted).toBe(60000)
    })
  })

  describe('🔴 an imported stock sheet, which carries two of the five criteria', () => {
    it('reads the three money headlines as "—" when nothing carries a sale price', async () => {
      // The fault this exists for: a stock export has no sales in it, so these three would
      // otherwise read $0, $0 and 0.0% — a business that sold nothing, rather than a file that
      // never mentioned selling. `linesReviewed` is real and still shows.
      const wrapper = await mount(IMPORTED_ONLY)
      expect(wrapper.vm.hasSales).toBe(false)
      expect(wrapper.vm.totals.linesReviewed).toBe(2)
      const text = wrapper.text()
      expect(text).not.toMatch(/0\.0%/)
    })

    it('shows a criterion the data could not fill as "—", never as a zero', async () => {
      // A zero in a points column is a real score — the worst one. A stock sheet cannot speak to
      // margin at all, and printing 0 would read as "this product makes no money".
      const wrapper = await mount(IMPORTED_ONLY)
      const line = wrapper.vm.ranked[0]
      expect(line.scores.margin.scored).toBe(false)
      expect(line.scores.unitCostRisk.scored).toBe(true)
      expect(wrapper.vm.notScored).toBe('—')
    })

    it('🔴 never sends stock held as quantity — units on a shelf are not units sold', async () => {
      // 300 plates in a warehouse would score "Often", the top rung, if held were read as sold,
      // and the model would recommend buying more of what nobody is buying.
      const wrapper = await mount(IMPORTED_ONLY)
      wrapper.vm.form.lines = [{ code: 'PL-1', unitsHeld: 300, avgUnitCost: 200, shareOfStock: 0.75, quantity: null }]
      const body = wrapper.vm.recomputeRequest().body
      expect(body.lines[0].quantity).toBeNull()
      expect(body.lines[0].avgUnitCost).toBe(200)
    })

    it('forwards a supplied unit cost rather than letting it be derived from nothing', async () => {
      const wrapper = await mount(IMPORTED_ONLY)
      wrapper.vm.form.lines = [{ code: 'A', avgUnitCost: 12.5, quantity: null, cost: null }]
      expect(wrapper.vm.recomputeRequest().body.lines[0].avgUnitCost).toBe(12.5)
    })
  })

  describe('the ladders come from the model, never from a second copy here', () => {
    it('reads the rating words and ranges off the response', async () => {
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      expect(wrapper.vm.criteria).toHaveLength(5)
      expect(wrapper.vm.maxScore).toBe(25)
      expect(wrapper.vm.laddersDescending.daysOnHand[0].id).toBe('Hot Cakes!')
    })

    it('🔴 captions each rung with the workbook\'s printed range, not the scoring edge', async () => {
      // The fault found by opening the screen, 2026-09-13: the caption used `upTo`, the exclusive
      // scoring boundary, so every rung read one unit too high and adjacent rungs overlapped.
      // Margin is shown as a percentage because the headline above this card is one too.
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      const days = wrapper.vm.laddersDescending.daysOnHand
      expect(wrapper.vm.rangeEdges('daysOnHand', days[0])).toEqual({ from: '1', to: '13' })
      expect(wrapper.vm.rangeEdges('daysOnHand', days[1])).toEqual({ from: '14', to: '27' })
      // A rung the workbook leaves open-ended has no ceiling to print.
      expect(wrapper.vm.rangeEdges('daysOnHand', days[4])).toEqual({ from: '75', to: null })
      const margin = wrapper.vm.laddersDescending.margin
      expect(wrapper.vm.rangeEdges('margin', margin[2])).toEqual({ from: '41%', to: '80%' })
      expect(wrapper.vm.rangeEdges('margin', margin[0])).toEqual({ from: '101%', to: null })
      const share = wrapper.vm.laddersDescending.shareOfStock
      expect(wrapper.vm.rangeEdges('shareOfStock', share[0])).toEqual({ from: '0.59', to: '1' })
    })

    it('shows each ladder best-rung-first without reordering the model\'s own array', async () => {
      const result = computeStockPurchasing(DEFAULT_INPUTS)
      const wrapper = await mount(result)
      expect(wrapper.vm.laddersDescending.margin.map(b => b.points)).toEqual([5, 4, 3, 2, 1])
      // The response's own array is untouched — a sort in place would have reordered the data
      // every other reader of it sees.
      expect(result.bands.margin.map(b => b.points)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('step 3 — whether the business can carry the order', () => {
    it('shows no ratio at all rather than a made-up one before the figures are in', async () => {
      const wrapper = await mount(computeStockPurchasing())
      expect(wrapper.vm.affordability.quickRatio).toBeNull()
      expect(wrapper.vm.ratio(null)).toBe(wrapper.vm.notEntered)
      expect(wrapper.vm.afterTone).toBe('')
    })

    it('colours the after-ratio by the verdict, not by whether it is large', async () => {
      const tight = computeStockPurchasing({
        lines: [],
        exposure: { currentAssetsExStock: 184000, currentLiabilities: 152000, cashCommitted: 60000 }
      })
      const wrapper = await mount(tight)
      expect(wrapper.vm.affordability.carries).toBe(false)
      expect(wrapper.vm.afterTone).toBe('crit')
    })
  })

  describe('the ranked list', () => {
    it('shows the first fourteen, and all of them on request', async () => {
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      expect(wrapper.vm.ranked).toHaveLength(969)
      expect(wrapper.vm.shownRanked).toHaveLength(14)
      wrapper.vm.showAll = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.shownRanked).toHaveLength(969)
    })
  })

  describe('the step chips', () => {
    it('has four, and refuses to walk outside them', async () => {
      const wrapper = await mount(computeStockPurchasing())
      expect(wrapper.vm.stepChips).toHaveLength(4)
      wrapper.vm.goTo(0)
      expect(wrapper.vm.step).toBe(1)
      wrapper.vm.goTo(5)
      expect(wrapper.vm.step).toBe(1)
      wrapper.vm.goTo(4)
      expect(wrapper.vm.step).toBe(4)
    })
  })

  describe('the stock-sheet upload', () => {
    it('replaces the lines and the shelf with what the file said, and recomputes', async () => {
      const wrapper = await mount(computeStockPurchasing())
      const imported = {
        package: 'Cin7 Core',
        lines: [{ code: 'KB-100', avgUnitCost: 12.5, shareOfStock: 0.25, quantity: null }],
        shelf: { onHand: 400, inTransit: 50 },
        carries: ['unitCostRisk', 'shareOfStock'],
        missing: ['margin', 'sold', 'daysOnHand'],
        unitsTotal: 400,
        valueTotal: 1250,
        hasOnOrder: true
      }
      global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ success: true, data: imported })
      }))
      await wrapper.vm.upload(new File(['x'], 'stock.csv'))
      expect(wrapper.vm.stockFile).toEqual(imported)
      expect(wrapper.vm.form.lines).toEqual(imported.lines)
      expect(wrapper.vm.form.shelf).toEqual({ onHand: 400, inTransit: 50 })
    })

    it('shows the backend\'s own refusal rather than a generic one', async () => {
      const wrapper = await mount(computeStockPurchasing())
      global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ success: false, error: { code: 'X', message: 'Not a stock export.' } })
      }))
      await wrapper.vm.upload(new File(['x'], 'stock.csv'))
      expect(wrapper.vm.uploadError).toBe('Not a stock export.')
      // And nothing was replaced on a refusal.
      expect(wrapper.vm.form.lines).toEqual([])
    })

    it('does not leave the button spinning when the network fails', async () => {
      const wrapper = await mount(computeStockPurchasing())
      global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
      await wrapper.vm.upload(new File(['x'], 'stock.csv'))
      expect(wrapper.vm.uploading).toBe(false)
      expect(wrapper.vm.uploadError).toBeTruthy()
    })

    it('refuses a file of the wrong type before it reaches the network', async () => {
      const wrapper = await mount(computeStockPurchasing())
      global.fetch = jest.fn()
      await wrapper.vm.receive(new File(['x'], 'notes.pdf'))
      expect(global.fetch).not.toHaveBeenCalled()
      expect(wrapper.vm.uploadError).toBeTruthy()
    })
  })
})

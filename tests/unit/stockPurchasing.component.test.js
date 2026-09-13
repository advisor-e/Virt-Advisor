/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const StockPurchasing = require('~/components/StockPurchasing.vue').default
const { computeStockPurchasing, DEFAULT_INPUTS, CRITERIA: CRITERIA_KEYS } = require('~/server/report/stockPurchasingModel')

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
      // 🔴 Major starts at 40.1%, a TENTH of a point above Moderate's 40% ceiling — the step Mike
      // asked for. A whole percentage still reads whole, so the decimal appears only where it
      // carries meaning.
      const margin = wrapper.vm.laddersDescending.margin
      expect(wrapper.vm.rangeEdges('margin', margin[2])).toEqual({ from: '40.1%', to: '80%' })
      expect(wrapper.vm.rangeEdges('margin', margin[3])).toEqual({ from: '25.1%', to: '40%' })
      expect(wrapper.vm.rangeEdges('margin', margin[4])).toEqual({ from: '0%', to: '25%' })
      expect(wrapper.vm.rangeEdges('margin', margin[0])).toEqual({ from: '100.1%', to: null })
      // Share of stock now reads as a percentage too, and to one decimal place where the step
      // shows: Flowing's floor is 12.6%, one tenth above Trickle's 12.5% ceiling.
      const share = wrapper.vm.laddersDescending.shareOfStock
      expect(wrapper.vm.rangeEdges('shareOfStock', share[0])).toEqual({ from: '58.1%', to: '100%' })
      expect(wrapper.vm.rangeEdges('shareOfStock', share[2])).toEqual({ from: '12.6%', to: '33%' })
    })

    it('🔴 lets the owner set the boundaries, and sends them back as ratios', async () => {
      // The point of the model (Mike, 2026-09-13). A percentage is typed as 25, never as 0.25 —
      // nobody thinks in ratios — so the two percentage ladders are scaled on the way in and out.
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      expect(wrapper.vm.laddersSeeded).toBe(true)
      expect(wrapper.vm.cutValue('margin', 0)).toBe(25)
      expect(wrapper.vm.cutValue('unitCostRisk', 0)).toBe(25)
      expect(wrapper.vm.cutValue('daysOnHand', 0)).toBe(13)

      wrapper.vm.setCut('margin', 0, '30')
      expect(wrapper.vm.ladders.margin[0]).toBeCloseTo(0.3, 6)
      expect(wrapper.vm.recomputeRequest().body.ladders.margin[0]).toBeCloseTo(0.3, 6)
    })

    it('steps each measure the way Mike ruled — a tenth of a point, a day, a cent', async () => {
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      expect(wrapper.vm.stepFor('margin')).toBe(0.1)
      expect(wrapper.vm.stepFor('shareOfStock')).toBe(0.1)
      expect(wrapper.vm.stepFor('daysOnHand')).toBe(1)
      expect(wrapper.vm.stepFor('sold')).toBe(1)
      expect(wrapper.vm.stepFor('unitCostRisk')).toBe(0.01)
      expect(wrapper.vm.unitFor('margin')).toBe('%')
      expect(wrapper.vm.unitFor('daysOnHand')).toBe('')
    })

    it('gives the top rung no box, because it is what is left above the last boundary', async () => {
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      CRITERIA_KEYS.forEach((c) => {
        const rungs = wrapper.vm.laddersDescending[c]
        const editable = rungs.filter(r => r.cutIndex !== null)
        expect(editable).toHaveLength(4)
        // And each box still knows which of the four it edits once the ladder is reversed.
        expect(editable.map(r => r.cutIndex).sort()).toEqual([0, 1, 2, 3])
      })
    })

    it('🔴 seeds the boxes ONCE, and never overwrites what the owner typed', async () => {
      // applyResult runs on every recompute. Re-seeding would wipe a boundary the moment the
      // backend answered — the owner would watch their own number vanish as they typed.
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      wrapper.vm.setCut('margin', 0, '30')
      wrapper.vm.applyResult(computeStockPurchasing(DEFAULT_INPUTS))
      expect(wrapper.vm.cutValue('margin', 0)).toBe(30)
    })

    it('puts every ladder back on request', async () => {
      const wrapper = await mount(computeStockPurchasing(DEFAULT_INPUTS))
      wrapper.vm.setCut('margin', 0, '30')
      wrapper.vm.resetLadders()
      expect(wrapper.vm.ladders).toEqual({})
      expect(wrapper.vm.laddersSeeded).toBe(false)
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

    it('🔴 a SALES import never touches the shelf — it says what left, not what is still there', async () => {
      // A sales report says what LEFT the business; the shelf is what is still on it, and comes
      // from the stock sheet or the two boxes at step 2. A sales import that zeroed the shelf
      // would make an already-stocked line look like one the client has none of.
      const wrapper = await mount(computeStockPurchasing())
      wrapper.vm.form.shelf = { onHand: 400, inTransit: 50 }
      global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          data: {
            linesRead: 1,
            lines: [{ code: 'KB-100', quantity: 40, sales: 4000, cost: 800, entryDate: '2026-01-01', saleDate: '2026-01-06', shareOfStock: null }],
            carries: ['margin', 'sold', 'unitCostRisk', 'daysOnHand'],
            missing: ['shareOfStock']
          }
        })
      }))
      await wrapper.vm.uploadSales(new File(['x'], 'sales.csv'))
      expect(wrapper.vm.form.lines).toHaveLength(1)
      expect(wrapper.vm.form.shelf).toEqual({ onHand: 400, inTransit: 50 })
      expect(wrapper.vm.salesFile.linesRead).toBe(1)
    })

    it('keeps the two uploads\' errors apart, so one failure does not accuse the other file', async () => {
      const wrapper = await mount(computeStockPurchasing())
      global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ success: false, error: { code: 'X', message: 'Not a sales report.' } })
      }))
      await wrapper.vm.uploadSales(new File(['x'], 'sales.csv'))
      expect(wrapper.vm.salesError).toBe('Not a sales report.')
      expect(wrapper.vm.uploadError).toBe('')
      expect(wrapper.vm.uploadingSales).toBe(false)
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

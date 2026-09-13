/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const MidLevelBudget = require('~/components/MidLevelBudget.vue').default
const { computeMidLevelBudget, DEFAULT_INPUTS } = require('~/server/report/midLevelBudgetModel')

/**
 * Mid Level Budget — the screen (item 4.93).
 *
 * What these assert is deliberately narrow: the things that are WRONG rather than ugly, and
 * none of them is visible to a person in UAT. A timing share sent as 20 instead of 0.20, a
 * money-out headline that quietly forgets what was paid to suppliers, and an invented opening
 * figure all look perfectly fine on screen right up until an advisor acts on one.
 *
 * Wording, labels and CSS are NOT asserted here (Mike's ruling of 2026-08-24): a person sees
 * those in five seconds and judges them better than an assertion can.
 */

/** Mount with the backend answering, and let the first result land. */
async function mount (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(MidLevelBudget, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

/** The workbook sample with the actuals side left untouched — a real, half-finished budget. */
const BUDGET_ONLY = {
  gstRate: DEFAULT_INPUTS.gstRate,
  months: DEFAULT_INPUTS.months,
  assumptions: DEFAULT_INPUTS.assumptions,
  budget: DEFAULT_INPUTS.budget
}

afterEach(() => { delete global.fetch })

describe('Mid Level Budget screen', () => {
  describe('🔴 Report class — it never invents a client figure', () => {
    it('opens completely empty, and asks the backend for nothing', async () => {
      // The model returns the workbook sample only when asked for it. If this screen ever
      // seeded itself from that sample, a client's budget would open showing somebody else's
      // figures, formatted identically to their own. Guarded here as well as in the model.
      const wrapper = await mount(computeMidLevelBudget())
      const body = wrapper.vm.recomputeRequest().body
      expect(body.budget.openingBalance).toBeNull()
      expect(body.actual.openingBalance).toBeNull()
      expect(body.budget.lines).toEqual({})
      expect(body.actual.lines).toEqual({})
    })

    it('🔴 invents no collection pattern either — an untouched profile is all zeroes', async () => {
      // A default of "100% in the month of sale" would be the most plausible guess available
      // and would silently turn this model back into the High Level Budget, with nothing on
      // screen to say so. The client answers this, or nobody does.
      const wrapper = await mount(computeMidLevelBudget())
      const body = wrapper.vm.recomputeRequest().body
      expect(body.assumptions.debtors).toEqual([0, 0, 0, 0, 0])
      expect(body.assumptions.creditors).toEqual([0, 0, 0, 0, 0])
    })

    it('sends the GST rate as a fraction, not the number typed on screen', async () => {
      // 15 on screen, 0.15 to the model. Sending 15 would compute GST at 1500%.
      const wrapper = await mount(computeMidLevelBudget())
      expect(wrapper.vm.recomputeRequest().body.gstRate).toBeCloseTo(0.15, 6)
    })

    it('🔴 sends each timing share as a fraction, not the percentage typed on screen', async () => {
      // The advisor types 20; the model takes 0.20. Sending 20 would collect twenty times the
      // month's sales and the screen would still look entirely ordinary.
      const wrapper = await mount(computeMidLevelBudget())
      wrapper.vm.setShare('debtors', 0, '20')
      wrapper.vm.setShare('debtors', 1, 45)
      wrapper.vm.setShare('creditors', 0, 30)
      await wrapper.vm.$nextTick()
      const body = wrapper.vm.recomputeRequest().body
      expect(body.assumptions.debtors[0]).toBeCloseTo(0.2, 6)
      expect(body.assumptions.debtors[1]).toBeCloseTo(0.45, 6)
      expect(body.assumptions.creditors[0]).toBeCloseTo(0.3, 6)
      // An untouched bucket is zero, never null — the model would coerce it, but a null here
      // means the screen lost the advisor's answer rather than that they gave none.
      expect(body.assumptions.debtors[4]).toBe(0)
    })

    it('derives twelve consecutive months from the chosen start, crossing the year end', async () => {
      const wrapper = await mount(computeMidLevelBudget())
      wrapper.vm.form.monthsStart = '2021-04'
      await wrapper.vm.$nextTick()
      const months = wrapper.vm.months
      expect(months).toHaveLength(12)
      expect(months[0]).toBe('2021-04-01')
      expect(months[9]).toBe('2022-01-01') // rolls into the next calendar year
      expect(months[11]).toBe('2022-03-01')
    })
  })

  describe('🔴 The headline figures are the model\'s, and they are complete', () => {
    it('counts what was paid to suppliers in money out', async () => {
      // Money out is payments to suppliers PLUS every expense line. Leaving the payments off
      // would understate the year by 165,950 on this sample and still balance visually against
      // a closing figure that already includes them — the exact shape of the fault found on
      // the High Level Budget's actuals subtotal.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.budgetMoneyOut).toBeCloseTo(375950, 6) // Q22 165,950 + Q64 210,000
      expect(wrapper.vm.actualMoneyOut).toBeCloseTo(393500, 6) // Q22 180,600 + Q64 212,900
      expect(wrapper.vm.moneyOutVariance).toBeCloseTo(17550, 6)
    })

    it('takes money in from the CASH COLLECTED, not the sales invoiced', async () => {
      // On this model those are different figures — 311,910 against 348,300 — and the whole
      // point of the model is the gap between them.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.budgetDeposits).toBeCloseTo(311910, 6) // Q16
      expect(wrapper.vm.stillOwed).toBeCloseTo(39390, 6)
    })

    it('carries the ruled closing balances through to the headline', async () => {
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.budgetClosing).toBeCloseTo(-54040, 6)
      expect(wrapper.vm.actualClosing).toBeCloseTo(-32200, 6)
    })

    it('reads zero as neither good nor bad before anything is typed', async () => {
      // A green "+$0" announces good news on an empty screen. Found on the sibling screen by
      // opening it, 2026-09-12, with the whole suite green.
      const wrapper = await mount(computeMidLevelBudget())
      expect(wrapper.vm.budgetNetChange).toBe(0)
      expect(wrapper.vm.toneForNetChange).toBe('default')
      expect(wrapper.vm.varianceFigure(0)).not.toMatch(/[+−-]/)
      expect(wrapper.vm.varianceFigure(null)).toBe('—')
    })
  })

  describe('🔴 The out-of-balance warning fires when the profile is short', () => {
    it('reads a complete profile as complete, despite floating-point addition', async () => {
      // 0.2 + 0.45 + 0.3 + 0.05 is not exactly 1 in binary. A strict equality here would show
      // an advisor who typed the workbook's own percentages a warning that they are 0.00000001%
      // short, and send them hunting a rounding error that does not exist.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      const debtors = wrapper.vm.profiles.find(p => p.key === 'debtors')
      expect(debtors.balanced).toBe(true)
    })

    it('names the missing share when a profile does not reach 100%', async () => {
      const short = computeMidLevelBudget({
        assumptions: { debtors: [0.2, 0.45, 0.3, 0, 0], creditors: [1, 0, 0, 0, 0] },
        budget: { lines: { sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }
      })
      const wrapper = await mount(short)
      const debtors = wrapper.vm.profiles.find(p => p.key === 'debtors')
      expect(debtors.balanced).toBe(false)
      // The figure has to be right; the sentence around it is Mike's and is not asserted.
      expect(debtors.balanceMessage).toContain('5%')
      // And the complete one beside it is still reported complete.
      expect(wrapper.vm.profiles.find(p => p.key === 'creditors').balanced).toBe(true)
    })

    it('rounds the missing share to something an advisor can act on', async () => {
      const wrapper = await mount(computeMidLevelBudget())
      expect(wrapper.vm.percentShort(0.05)).toBe('5%')
      expect(wrapper.vm.percentShort(0.125)).toBe('12.5%')
      // Never "4.999999999%" from binary addition.
      expect(wrapper.vm.percentShort(1 - (0.2 + 0.45 + 0.3))).toBe('5%')
    })
  })

  describe('🔴 With nothing entered, step 5 compares nothing', () => {
    // ALL OF THIS WAS FOUND BY OPENING THE SCREEN, with the whole suite green. On an empty
    // actuals side the headline reported, in GREEN, that the client had spent 375,950 less
    // than budget and closed 64,040 above plan — while every line in the table below it
    // correctly read "not entered". Four faults, one cause: the screen compared against an
    // actuals side that did not exist.

    it('knows whether a single actual has been entered anywhere', async () => {
      const empty = await mount(computeMidLevelBudget(BUDGET_ONLY))
      expect(empty.vm.hasActuals).toBe(false)
      const full = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      expect(full.vm.hasActuals).toBe(true)
      // One figure on one line is enough — it is not a count, it is "has anyone started".
      const one = await mount(computeMidLevelBudget(Object.assign({}, BUDGET_ONLY, {
        actual: { openingBalance: 10000, lines: { car: [450, null, null, null, null, null, null, null, null, null, null, null] } }
      })))
      expect(one.vm.hasActuals).toBe(true)
    })

    it('keeps the budget\'s own headline until there is something to compare', async () => {
      // The comparison headline is where the green "-$375,950" appeared.
      const wrapper = await mount(computeMidLevelBudget(BUDGET_ONLY))
      wrapper.vm.step = 5
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.showResultHero).toBe(false)
      // And it switches the moment an actual lands.
      const withActuals = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      withActuals.vm.step = 5
      await withActuals.vm.$nextTick()
      expect(withActuals.vm.showResultHero).toBe(true)
    })

    it('🔴 gives all three subtotals the same answer when nothing is entered', async () => {
      // The three rows read −311,910 (red), −165,950 (GREEN — a saving) and 0. Three rows,
      // three answers, because two took the model's variance and the third summed nulls.
      const wrapper = await mount(computeMidLevelBudget(BUDGET_ONLY))
      const blocks = wrapper.vm.resultBlocks
      expect(blocks).toHaveLength(3)
      blocks.forEach((b) => {
        expect(b.actual).toBe(0)
        // Every one of them now carries the model's own variance — the full budget, negative,
        // on all three — and the template renders "—" for all three rather than three
        // different-looking figures.
        expect(b.variance).toBeCloseTo(-b.budget, 6)
      })
      expect(wrapper.vm.hasActuals).toBe(false)
    })

    it('renders no figure and no colour in the actual and difference columns', async () => {
      const wrapper = await mount(computeMidLevelBudget(BUDGET_ONLY))
      wrapper.vm.step = 5
      await wrapper.vm.$nextTick()
      const subtotals = wrapper.findAll('.mlb-subtotal')
      expect(subtotals.length).toBe(3)
      for (let i = 0; i < subtotals.length; i++) {
        const cells = subtotals.at(i).findAll('td')
        // The BUDGET column keeps its figure — that half of the row is real.
        expect(cells.at(1).text()).toMatch(/\d/)
        // The actual and the difference carry no figure...
        expect(cells.at(2).text()).not.toMatch(/\d/)
        expect(cells.at(3).text()).toBe('—')
        // ...and no colour, which is what made "−$165,950" read as a saving.
        expect(cells.at(3).classes()).not.toContain('good')
        expect(cells.at(3).classes()).not.toContain('crit')
      }
    })

    it('draws neither chart series that has no figures behind it', async () => {
      const wrapper = await mount(computeMidLevelBudget(BUDGET_ONLY))
      wrapper.vm.step = 5
      await wrapper.vm.$nextTick()
      // Twelve zeroes drew a flat line pinned to the top of the bank chart.
      expect(wrapper.findAll('polyline.is-actual')).toHaveLength(0)
      expect(wrapper.findAll('polyline.is-budget').length).toBeGreaterThan(0)
      expect(wrapper.findAll('.mlb-bar2.is-actual')).toHaveLength(0)
      expect(wrapper.findAll('.mlb-bar2.is-budget')).toHaveLength(12)
    })

    it('draws both series once the actuals are real', async () => {
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      wrapper.vm.step = 5
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('polyline.is-actual')).toHaveLength(1)
      expect(wrapper.findAll('.mlb-bar2.is-actual')).toHaveLength(12)
    })
  })

  describe('The result table totals on cash, not on the lines above it', () => {
    it('subtotals money in and suppliers from the model\'s own cash figures', async () => {
      // The line rows show what was INVOICED; the subtotals must show what moved. Summing the
      // rows would produce 348,300 under a heading that means "collected", which is a figure
      // the advisor could put in front of a client.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      const blocks = wrapper.vm.resultBlocks
      const moneyIn = blocks.find(b => b.key === 'in')
      const stock = blocks.find(b => b.key === 'stock')
      expect(moneyIn.budget).toBeCloseTo(311910, 6)
      expect(moneyIn.actual).toBeCloseTo(351300, 6)
      expect(stock.budget).toBeCloseTo(165950, 6)
      expect(stock.actual).toBeCloseTo(180600, 6)
      // Money out is the ordinary case: it sums its own lines.
      expect(blocks.find(b => b.key === 'out').budget).toBeCloseTo(210000, 6)
    })

    it('leaves out the lines this budget never uses', async () => {
      // 39 lines exist; this budget uses ten. The other 29 would otherwise be rows of dashes.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      const rows = wrapper.vm.resultBlocks.reduce((n, b) => n + b.rows.length, 0)
      expect(rows).toBe(10)
    })

    it('colours a variance by whether it is good news, never by its sign', async () => {
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.toneFor(100, true)).toBe('good') //   earned more
      expect(wrapper.vm.toneFor(100, false)).toBe('crit') //  spent more
      expect(wrapper.vm.toneFor(-100, true)).toBe('crit') //  earned less
      expect(wrapper.vm.toneFor(-100, false)).toBe('good') // spent less
      expect(wrapper.vm.toneFor(0, true)).toBe('default')
    })
  })

  describe('Entry', () => {
    it('writes all twelve months from the single box', async () => {
      const wrapper = await mount(computeMidLevelBudget())
      wrapper.vm.step = 3
      await wrapper.vm.$nextTick()
      wrapper.vm.setFlat('car', '500')
      expect(wrapper.vm.form.budget.lines.car).toHaveLength(12)
      expect(wrapper.vm.form.budget.lines.car.every(v => v === 500)).toBe(true)
    })

    it('🔴 keeps a cleared box as null, never as a typed zero', async () => {
      // A blank actual means "not yet"; a typed zero is a real zero and produces a variance.
      // Collapsing the two would show an unreached month as the whole budget lost.
      const wrapper = await mount(computeMidLevelBudget())
      wrapper.vm.step = 4
      await wrapper.vm.$nextTick()
      wrapper.vm.setFlat('car', '')
      expect(wrapper.vm.form.actual.lines.car.every(v => v === null)).toBe(true)
      wrapper.vm.setFlat('car', '0')
      expect(wrapper.vm.form.actual.lines.car.every(v => v === 0)).toBe(true)
    })

    it('edits the budget on step 3 and the actuals on step 4', async () => {
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      wrapper.vm.step = 3
      expect(wrapper.vm.side).toBe('budget')
      wrapper.vm.step = 4
      expect(wrapper.vm.side).toBe('actual')
      // And the headline switches to the comparison once there is something to compare — on
      // the entry steps before it, the budget's own figures headline.
      expect(wrapper.vm.showResultHero).toBe(true)
      wrapper.vm.step = 2
      expect(wrapper.vm.showResultHero).toBe(false)
    })

    it('opens the same line independently on the two sides', async () => {
      const wrapper = await mount(computeMidLevelBudget())
      wrapper.vm.step = 3
      wrapper.vm.toggleOpen('sales')
      expect(wrapper.vm.isOpen('sales')).toBe(true)
      wrapper.vm.step = 4
      expect(wrapper.vm.isOpen('sales')).toBe(false)
    })

    it('marks paid-to-suppliers and gross profit as worked out, not typed', async () => {
      // Both are computed by the model. An entry box against either would invite an advisor to
      // overwrite a figure the timing profile is supposed to produce.
      const wrapper = await mount(computeMidLevelBudget(DEFAULT_INPUTS))
      wrapper.vm.step = 3
      await wrapper.vm.$nextTick()
      const stock = wrapper.vm.entryBlocks.find(b => b.key === 'stock')
      const computed = stock.rows.filter(r => r.computed).map(r => r.key)
      expect(computed).toEqual(['paymentsMade', 'grossProfit'])
      expect(stock.rows.find(r => r.key === 'paymentsMade').year).toBeCloseTo(165950, 6)
      expect(stock.rows.find(r => r.key === 'grossProfit').year).toBeCloseTo(145960, 6)
    })
  })

  describe('A failed recompute never sits behind live-looking figures', () => {
    it('raises the stale flag when the backend cannot be reached', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('network down')))
      const wrapper = mountWithBuefy(MidLevelBudget, { propsData: {} })
      await wrapper.vm.$nextTick()
      await Promise.resolve()
      await wrapper.vm.$nextTick()
      await Promise.resolve()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.error).toBeTruthy()
      // `error` is a FLAG, not a message. Rendering it put the literal word "true" in front of
      // advisors on Eight Levers for a day.
      expect(wrapper.text()).not.toMatch(/\btrue\b/)
    })
  })
})

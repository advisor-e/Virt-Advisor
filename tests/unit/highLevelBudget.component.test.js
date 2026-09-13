/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const HighLevelBudget = require('~/components/HighLevelBudget.vue').default
const { computeHighLevelBudget, DEFAULT_INPUTS } = require('~/server/report/highLevelBudgetModel')

/**
 * High Level Budget — the screen (item 4.88).
 *
 * What these assert is deliberately narrow: the three things Mike ruled on 2026-09-12, and the
 * Report-class safety rule. None of them is visible to a person in UAT — a wrong colour, an
 * invented opening figure and a zero standing in for "not entered" all look perfectly fine on
 * screen right up until an advisor acts on one. Wording, labels and CSS are NOT asserted here
 * (Mike's ruling of 2026-08-24): a person sees those in five seconds and judges them better.
 */

/** Mount with the backend answering, and let the first result land. */
async function mount (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(HighLevelBudget, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('High Level Budget screen', () => {
  describe('🔴 Report class — it never invents a client figure', () => {
    it('opens completely empty, and asks the backend for nothing', async () => {
      // The model returns the workbook sample only when asked for it. If this screen ever
      // seeded itself from that sample, a client's budget would open showing somebody else's
      // figures, formatted identically to their own. Guarded here as well as in the model.
      const wrapper = await mount(computeHighLevelBudget())
      const body = wrapper.vm.recomputeRequest().body
      expect(body.budget.openingBalance).toBeNull()
      expect(body.actual.openingBalance).toBeNull()
      expect(body.budget.lines).toEqual({})
      expect(body.actual.lines).toEqual({})
    })

    it('sends the GST rate as a fraction, not the number typed on screen', async () => {
      // 15 on screen, 0.15 to the model. Sending 15 would compute GST at 1500%.
      const wrapper = await mount(computeHighLevelBudget())
      expect(wrapper.vm.recomputeRequest().body.gstRate).toBeCloseTo(0.15, 6)
    })

    it('derives twelve consecutive months from the chosen start, crossing the year end', async () => {
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.form.monthsStart = '2021-04'
      await wrapper.vm.$nextTick()
      const months = wrapper.vm.months
      expect(months).toHaveLength(12)
      expect(months[0]).toBe('2021-04-01')
      expect(months[9]).toBe('2022-01-01') // rolls into the next calendar year
      expect(months[11]).toBe('2022-03-01')
    })
  })

  describe('Ruling 1 — one figure per line, applied to every month', () => {
    it('writes all twelve months from the single box', async () => {
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.setFlat('wages', 14000)
      expect(wrapper.vm.form.budget.lines.wages).toEqual(new Array(12).fill(14000))
    })

    it('keeps a line\'s twelve figures when it is closed again', async () => {
      // Closing a varying line must not flatten it back to one figure — the advisor would
      // lose eleven months of typing with nothing on screen to say so.
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.toggleOpen('sales')
      wrapper.vm.setMonth('sales', 0, 25000)
      wrapper.vm.setMonth('sales', 1, 35000)
      wrapper.vm.toggleOpen('sales')
      expect(wrapper.vm.isOpen('sales')).toBe(false)
      expect(wrapper.vm.form.budget.lines.sales[0]).toBe(25000)
      expect(wrapper.vm.form.budget.lines.sales[1]).toBe(35000)
    })

    it('opens the two sides independently — a line opened on the budget is not opened on the actuals', async () => {
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.toggleOpen('sales')
      expect(wrapper.vm.isOpen('sales')).toBe(true)
      wrapper.vm.step = 3 // the actuals
      expect(wrapper.vm.isOpen('sales')).toBe(false)
    })
  })

  describe('Ruling 2 — a blank actual means "not yet", never "nothing"', () => {
    it('sends null for an emptied box, not zero', async () => {
      // Zero would read as "we earned nothing in March" and show the whole month's budget as
      // a shortfall. Null is what the workbook's IF(actual<>"",...,"") produces.
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.step = 3
      wrapper.vm.setMonth('sales', 0, 15000)
      wrapper.vm.setMonth('sales', 1, '')
      const lines = wrapper.vm.recomputeRequest().body.actual.lines
      expect(lines.sales[0]).toBe(15000)
      expect(lines.sales[1]).toBeNull()
    })

    it('sends a typed zero as a real zero', async () => {
      const wrapper = await mount(computeHighLevelBudget())
      wrapper.vm.step = 3
      wrapper.vm.setMonth('printing', 0, 0)
      expect(wrapper.vm.recomputeRequest().body.actual.lines.printing[0]).toBe(0)
    })

    it('shows "not entered" rather than a figure where the model returned a null variance', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      // Non-GST sales is budgeted at 3,000 for the year with no actual entered anywhere.
      const row = wrapper.vm.resultRow('nonGstSales', true)
      expect(row.variance).toBeNull()
      expect(row.pill).toBeNull()
      expect(row.budget).toBeCloseTo(3000, 6)
    })
  })

  describe('🔴 Ruling 3 — the arithmetic never flips; the colour carries the meaning', () => {
    it('reads a positive variance on MONEY IN as good', () => {
      expect(HighLevelBudget.methods.toneFor(1200, true)).toBe('good')
      expect(HighLevelBudget.methods.toneFor(-1200, true)).toBe('crit')
    })

    it('reads the SAME positive variance on MONEY OUT as bad', () => {
      // This is the whole ruling in two lines. Spending 1,200 more than budget and earning
      // 1,200 more than budget are the same number and opposite news.
      expect(HighLevelBudget.methods.toneFor(1200, false)).toBe('crit')
      expect(HighLevelBudget.methods.toneFor(-1200, false)).toBe('good')
    })

    it('treats a nil variance as neither', () => {
      expect(HighLevelBudget.methods.toneFor(0, true)).toBe('default')
      expect(HighLevelBudget.methods.toneFor(0, false)).toBe('default')
    })

    it('keeps the workbook\'s own sign on every figure it displays', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      // Wages: 150,000 actual against 168,000 budget. The number stays NEGATIVE — it is
      // actual minus budget, exactly as the Cashflow Variances sheet computes it — and it is
      // the colour that says this is good news.
      const wages = wrapper.vm.resultRow('wages', false)
      expect(wages.variance).toBeCloseTo(-18000, 6)
      expect(wages.tone).toBe('good')
      // Entertainment: 3,000 against 1,800. Positive, and bad.
      const ent = wrapper.vm.resultRow('entertainment', false)
      expect(ent.variance).toBeCloseTo(1200, 6)
      expect(ent.tone).toBe('crit')
    })

    it('marks an unbudgeted spend as worse even though there is nothing to compare it with', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      // Printing: 2,100 spent, nothing budgeted.
      const printing = wrapper.vm.resultRow('printing', false)
      expect(printing.budget).toBe(0)
      expect(printing.variance).toBeCloseTo(2100, 6)
      expect(printing.tone).toBe('crit')
    })
  })

  describe('The result table', () => {
    it('leaves out the lines that are empty on both sides', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      // 24 of the 38 lines are untouched in the sample; a table of dashes helps nobody.
      expect(wrapper.vm.resultRow('bankFees', false)).toBeNull()
      expect(wrapper.vm.resultRow('legal', false)).toBeNull()
      const rows = wrapper.vm.resultBlocks.reduce((n, b) => n + b.rows.length, 0)
      expect(rows).toBe(10)
    })

    it('subtotals money out to the ruled figure, wages and interest included', async () => {
      // 13,800, not the workbook's 173,700 — the deviation Mike ruled, reaching the screen.
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      const out = wrapper.vm.resultBlocks.find(b => b.key === 'out')
      expect(out.budget).toBeCloseTo(210000, 6)
      expect(out.actual).toBeCloseTo(196200, 6)
      expect(out.variance).toBeCloseTo(-13800, 6)
      expect(out.tone).toBe('good')
    })

    it('takes its line list from the response, holding no second copy', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      const keys = wrapper.vm.entryBlocks
        .reduce((all, b) => all.concat(b.rows.filter(r => !r.heading).map(r => r.key)), [])
      expect(keys).toEqual(wrapper.vm.data.lineOrder.map(l => l.key))
    })
  })

  describe('A zero is never dressed up as a change', () => {
    // The sign is what carries the reading on this screen, so a sign on a zero says something
    // happened when nothing did. Both places were found by opening the screen, 2026-09-12.
    it('shows a plain zero for a line that landed exactly on budget', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.varianceFigure(0)).not.toMatch(/[+−-]/)
      expect(wrapper.vm.varianceFigure(1200)).toMatch(/^\+/)
      expect(wrapper.vm.varianceFigure(-1200)).toMatch(/[−-]/)
    })

    it('shows an em dash, not a zero, where no actual was entered', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.varianceFigure(null)).toBe('—')
      expect(wrapper.vm.varianceFigure(undefined)).toBe('—')
    })

    it('leaves the headline neutral before anything is typed', async () => {
      const wrapper = await mount(computeHighLevelBudget())
      expect(wrapper.vm.budgetNetChange).toBe(0)
      expect(wrapper.vm.toneForNetChange).toBe('default')
    })
  })

  describe('Charts', () => {
    it('scales both bank lines against ONE range, so the gap between them is the real gap', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      const budget = wrapper.vm.bankLine(wrapper.vm.data.budget.closingBankBalance)
      const actual = wrapper.vm.bankLine(wrapper.vm.data.actual.closingBankBalance)
      const lastY = s => Number(s.split(' ').pop().split(',')[1])
      // The budget closes at 192,426 and the actual at 143,565, so the actual line must end
      // LOWER on screen (a larger y, the axis being inverted). Two independent scales would
      // put them level and hide the whole finding.
      expect(lastY(actual)).toBeGreaterThan(lastY(budget))
      expect(budget.split(' ')).toHaveLength(12)
    })

    it('never returns a negative or NaN bar height', async () => {
      const wrapper = await mount(computeHighLevelBudget(DEFAULT_INPUTS))
      expect(wrapper.vm.barHeight(0, 100)).toBe('2px')
      expect(wrapper.vm.barHeight(-5, 100)).toBe('2px')
      expect(wrapper.vm.barHeight(50, 0)).toBe('2px')
      expect(wrapper.vm.barHeight(50, 100)).toBe('50%')
    })
  })
})

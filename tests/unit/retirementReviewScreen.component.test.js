/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const RetirementReview = require('~/components/RetirementReview.vue').default
const { computeRetirementReview, DEFAULT_INPUTS } = require('~/server/report/retirementReviewModel')

/**
 * Screen test — Retirement Review (item 4.90).
 *
 * What this suite is FOR, and what it deliberately leaves alone. Per the testing rule of
 * 2026-08-24, a test here earns its place by catching what a person in UAT cannot. A wrong
 * label or a missing card is obvious on screen in five seconds; a rate sent to the backend as
 * 4 instead of 0.04 is not, and neither is a verdict that says the plan holds when the cash
 * has run out. So this suite pins the SEAM (what the screen sends) and the JUDGEMENT (what it
 * concludes), and asserts no wording, no CSS class and no card count.
 *
 * The maths itself is golden-tested in retirementReviewModel.test.js, and the HTTP envelope in
 * retirementReviewRoute.test.js. Nothing here re-tests either.
 */

/** Mount with the backend answering successfully, and let the first result land. */
async function mountWithResult (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(RetirementReview, { propsData: {} })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('RetirementReview screen', () => {
  describe('the payload — every rate converted, or every figure is wrong', () => {
    it('sends rates as decimals, not as the percentages it displays', async () => {
      const wrapper = await mountWithResult(computeRetirementReview())
      const body = wrapper.vm.recomputeRequest().body

      // The screen shows 1.7 / 4 / 12 / 3 / 14 / 5.35; the model takes 0.017 / 0.04 / …
      expect(body.quickCalculator.returnRateInRetirement).toBeCloseTo(0.017, 10)
      expect(body.quickCalculator.returnRateWhileSaving).toBeCloseTo(0.04, 10)
      expect(body.position.inflation).toHaveLength(4)
      expect(body.position.inflation[0]).toBeCloseTo(0.12, 10)
      expect(body.position.inflation[3]).toBeCloseTo(0.03, 10)
      expect(body.position.pension.cpiAdjustment).toBeCloseTo(0.03, 10)
      expect(body.position.pension.taxRate).toBeCloseTo(0.14, 10)
      expect(body.position.cash.rate).toBeCloseTo(0.045, 10)
      expect(body.position.properties[1].rate).toBeCloseTo(0.0535, 10)
      expect(body.position.properties[0].growthRate).toBeCloseTo(0.0495, 10)
      expect(body.position.properties[0].rentGrowthRate).toBeCloseTo(0.055, 10)
    })

    it('🔴 the payload reproduces the workbook sample EXACTLY — the screen seeds no figure of its own', async () => {
      // The screen opens on the workbook's own sample. If its seed and the model's defaults
      // ever diverge, an adviser opening the screen sees figures that are in no spreadsheet
      // anywhere, and nothing on screen says so.
      const wrapper = await mountWithResult(computeRetirementReview())
      const sent = computeRetirementReview(wrapper.vm.recomputeRequest().body)
      const defaults = computeRetirementReview()

      expect(sent.verdict).toEqual(defaults.verdict)
      expect(sent.position.netWorth).toBeCloseTo(defaults.position.netWorth, 6)
      expect(sent.tax.averageRate).toBeCloseTo(defaults.tax.averageRate, 12)
      expect(sent.projection.cashClosing).toEqual(defaults.projection.cashClosing)
    })

    it('carries the four free-text answers, which feed no calculation but belong to the client', async () => {
      const wrapper = await mountWithResult(computeRetirementReview())
      const q = wrapper.vm.recomputeRequest().body.quickCalculator

      expect(q.retirementMeaning).toBe(DEFAULT_INPUTS.quickCalculator.retirementMeaning)
      expect(q.wouldHateToMiss).toBe(DEFAULT_INPUTS.quickCalculator.wouldHateToMiss)
      expect(q.lookingForwardTo).toBe(DEFAULT_INPUTS.quickCalculator.lookingForwardTo)
      expect(q.provisionsRemoveNeed).toBe(DEFAULT_INPUTS.quickCalculator.provisionsRemoveNeed)
    })

    it('sends a sale year as a year, and an unsold property as null rather than 0', async () => {
      // 0 is a year in an off-by-one, and would sell the property immediately.
      const wrapper = await mountWithResult(computeRetirementReview())
      const props = wrapper.vm.recomputeRequest().body.position.properties

      expect(props[0].sellInYear).toBeNull()
      expect(props[1].sellInYear).toBe(4)
      expect(props[5].sellInYear).toBe(17)
    })
  })

  describe('the verdict — the one judgement the workbook does not make', () => {
    it('never says the plan holds when the cash has run out', async () => {
      const broke = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, { currentWeeklyIncomeRequired: 12000 })
      })
      expect(broke.verdict.cashEverExhausted).toBe(true)

      const wrapper = await mountWithResult(broke)
      expect(wrapper.vm.verdictTitle).toMatch(/runsOut/i)
      expect(wrapper.vm.runsOutValue).not.toMatch(/never/i)
    })

    it('names the property sales the plan leans on, rather than claiming it simply holds', async () => {
      // Mike's ruling 2026-09-13. The sample sells three, and the headline must say so:
      // "the plan holds" alone would be true and misleading in the same breath.
      const wrapper = await mountWithResult(computeRetirementReview())
      expect(wrapper.vm.saleYears).toEqual([4, 15, 17])
      expect(wrapper.vm.verdictTitle).toMatch(/verdictHoldsTitle/)
    })

    it('drops the sales clause when nothing is sold — the sentence must not claim a lean that is not there', async () => {
      // A household that needs far less each week holds WITHOUT selling anything. The income
      // had to be lowered to build this case at all: on the workbook's own sample, taking the
      // three sales away makes the cash run out in year 4 — which is the drawing's claim that
      // the plan leans on them, proved rather than asserted.
      const noSales = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, {
          currentWeeklyIncomeRequired: 300,
          properties: DEFAULT_INPUTS.position.properties.map(p => Object.assign({}, p, { sellInYear: null }))
        })
      })
      expect(noSales.verdict.cashEverExhausted).toBe(false)

      const wrapper = await mountWithResult(noSales)
      // The screen reads the sale years off the FORM, so match the two before asserting.
      wrapper.vm.form.position.properties.forEach((p) => { p.sellInYear = null })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.saleYears).toEqual([])
      expect(wrapper.vm.verdictTitle).toMatch(/verdictHoldsNoSaleTitle/)
    })

    it('🔴 the sample plan DOES lean on its sales — take them away and the cash runs out', () => {
      // This is the claim the approved verdict sentence makes. If it ever stops being true,
      // the sentence on screen becomes a statement nobody checked.
      const noSales = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, {
          properties: DEFAULT_INPUTS.position.properties.map(p => Object.assign({}, p, { sellInYear: null }))
        })
      })

      expect(computeRetirementReview().verdict.cashEverExhausted).toBe(false)
      expect(noSales.verdict.cashEverExhausted).toBe(true)
    })

    it('finds the lowest point of the cash account, and the year it happens', async () => {
      const model = computeRetirementReview()
      const wrapper = await mountWithResult(model)
      const expected = Math.min.apply(null, model.projection.cashClosing)

      expect(wrapper.vm.lowestCash.amount).toBeCloseTo(expected, 6)
      expect(wrapper.vm.lowestCash.year)
        .toBe(model.projection.cashClosing.indexOf(expected) + 1)
    })
  })

  describe('figures on screen', () => {
    it('never renders a positive figure with a + sign', async () => {
      // A "+" reads as a change rather than a level. On the High Level Budget a green "+$0"
      // announced good news on an empty screen, twice, and no assertion saw either.
      const wrapper = await mountWithResult(computeRetirementReview())

      expect(wrapper.vm.signedIfNegative(1500)).not.toMatch(/\+/)
      expect(wrapper.vm.signedIfNegative(0)).not.toMatch(/[+−-]/)
      expect(wrapper.vm.signedIfNegative(-733)).toMatch(/^−/)
    })

    it('totals the property columns to the same figures the model reports', async () => {
      // The screen adds two columns the model does not total for it. If its arithmetic and
      // the model's ever disagree, the table's own total row contradicts the banner above it.
      const model = computeRetirementReview()
      const wrapper = await mountWithResult(model)

      const rentLessMortgage = wrapper.vm.totalMonthlyRent - wrapper.vm.totalMonthlyMortgage
      expect(rentLessMortgage).toBeCloseTo(model.position.monthlyRentalSurplus, 6)
    })

    it('carries every projected year into the table, not just the ones that fit', async () => {
      const model = computeRetirementReview()
      const wrapper = await mountWithResult(model)

      expect(wrapper.vm.projectionRows).toHaveLength(model.years.length)
      expect(wrapper.vm.projectionRows[0].year).toBe(1)
      expect(wrapper.vm.projectionRows[19].cashEnd).toBeCloseTo(model.verdict.closingCash, 6)
    })

    it('scales the chart against the largest year in EITHER direction', async () => {
      // Scaling on the deficits alone would push every surplus bar off the top of the card.
      const model = computeRetirementReview()
      const wrapper = await mountWithResult(model)
      const bars = wrapper.vm.chartBars

      expect(bars).toHaveLength(model.years.length)
      expect(Math.max.apply(null, bars.map(b => b.height))).toBe(100)
      bars.forEach((b) => {
        expect(b.height).toBeGreaterThanOrEqual(0)
        expect(b.height).toBeLessThanOrEqual(100)
      })
      expect(bars.filter(b => !b.up)).toHaveLength(model.verdict.yearsInDeficit)
    })

    it('🔴 renders every workbook correction the model returns — none may be dropped on the way to the screen', async () => {
      // The adviser may have the spreadsheet open beside this page. A correction that reaches
      // the model and not the screen is a difference nobody can account for.
      const model = computeRetirementReview()
      const wrapper = await mountWithResult(model)

      expect(model.workbookCorrections.length).toBeGreaterThan(0)

      wrapper.vm.goTo(4)
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.rr-corrections li')).toHaveLength(model.workbookCorrections.length)
    })
  })

  describe('the four steps', () => {
    it('moves between steps and keeps the headline band on every one', async () => {
      const wrapper = await mountWithResult(computeRetirementReview())

      for (let step = 1; step <= 4; step++) {
        wrapper.vm.goTo(step)
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.step).toBe(step)
        expect(wrapper.findComponent({ name: 'HeroStrip' }).exists()).toBe(true)
        expect(wrapper.findAllComponents({ name: 'HeroFigure' }).length).toBeGreaterThanOrEqual(3)
      }
    })

    it('reads the year count off the response rather than assuming twenty', async () => {
      const wrapper = await mountWithResult(computeRetirementReview())
      expect(wrapper.vm.yearCount).toBe(20)

      wrapper.vm.data = Object.assign({}, wrapper.vm.data, { years: [1, 2, 3] })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.yearCount).toBe(3)
    })
  })
})

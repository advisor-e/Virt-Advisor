/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const MultiplePropertyAssessment = require('~/components/MultiplePropertyAssessment.vue').default
const { computeMultiplePropertyAssessment } = require('~/server/report/multiplePropertyModel')

/**
 * Component test — the Multiple Property Assessment screen (Phase 1).
 *
 * The maths is golden-tested (`multiplePropertyModel.test.js`, 55 tests) and the
 * headline/badge/frame shape is held by the four consistency guards. This suite covers
 * what only the SCREEN can get wrong:
 *
 *   1. the display→decimal conversion in the payload — a missed ÷100 sends 750% as the
 *      management fee and silently wrecks every figure below it;
 *   2. the seeded screen matching the model's own sample exactly, so nothing defaults
 *      silently on the backend (the R8 ruling);
 *   3. 🔴 the EFFECTIVE management fee actually reaching the screen. The invisibility of
 *      the 1.15 inside the workbook's formula is the whole reason the GST became a
 *      setting (§6 rule 10) — a screen that makes the rate editable without showing what
 *      it costs puts the model back where it started;
 *   4. the Capital Introduced line showing under the repay ending and NOT under convert
 *      (§5b) — an empty row would invite a reader to look for money that never moved;
 *   5. the carry-forward row naming the loss rule actually in force (§8 Q5f).
 */

// mounted() fires a recompute, so every mount needs a fetch to exist.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: null }) }))
})
afterEach(() => { delete global.fetch })

/** Mount with the backend answering, and let the first result land. */
async function mountWithResult (data) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data }) }))
  const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Multiple Property Assessment screen', () => {
  it('converts every display percentage to a decimal in the backend payload', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const spec = wrapper.vm.recomputeRequest()

    expect(spec.url).toBe('/api/report/multiple-property')
    expect(spec.body.taxRate).toBeCloseTo(0.28, 6) //                   28 → 0.28
    expect(spec.body.managementFeePct).toBeCloseTo(0.075, 6) //         7.5 → 0.075
    expect(spec.body.rentalGrowth).toBeCloseTo(0.035, 6)
    expect(spec.body.capitalGrowth).toBeCloseTo(0.03, 6)
    expect(spec.body.expenseInflation).toBeCloseTo(0.05, 6)
    expect(spec.body.interestRateInflation).toBeCloseTo(0.001, 6) //    0.1 → 0.001
    expect(spec.body.managementFeeGstRate).toBeCloseTo(0.15, 6)
    expect(spec.body.depreciationRateChattels).toBeCloseTo(0.28, 6)
    expect(spec.body.interestOnlyRate).toBeCloseTo(0.04, 6)
    expect(spec.body.piRate).toBeCloseTo(0.04, 6)
    // The phasing table is a LIST of percentages and each entry needs the same ÷100.
    expect(spec.body.phasingTable).toEqual([1, 0.75, 0.5, 0.25, 0])
    // Settings and money figures pass through untouched.
    expect(spec.body.yearOneAddBack).toBe('setup')
    expect(spec.body.lossTreatment).toBe('ringFenced')
    expect(spec.body.endOfInterestOnly).toBe('convert')
    expect(spec.body.purchasePrice).toBe(649000)
    expect(spec.body.interestOnlyTotalTermYears).toBe(30)
  })

  it('sends a payload the model accepts whole — nothing falls back to a sample figure', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const result = computeMultiplePropertyAssessment(wrapper.vm.recomputeRequest().body)

    // The R8 ruling: any input that fell back is NAMED. An empty list proves the screen
    // seeds every field the model reads, rather than leaning on the backend's defaults.
    expect(result.defaultedInputs).toEqual([])
    // And it reproduces the workbook's own sample — the golden test's year-1 weekly
    // (`MODEL` C33, the figure an advisor says out loud).
    expect(result.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 6)
  })

  it('shows what the management fee ACTUALLY costs, not only the rate that is typed', async () => {
    // 7.5% with 15% GST is charged at 8.625%. The 1.15 used to live inside the formula,
    // so the advisor read 7.5% and the model charged 8.625% with nothing saying so.
    const wrapper = await mountWithResult(computeMultiplePropertyAssessment({}))
    const text = wrapper.text()

    expect(text).toContain('report.multipleProperty.costs.effectiveFee')
    expect(text).toContain('8.625%')
  })

  it('states the scope on the screen itself — one property of five', async () => {
    const wrapper = await mountWithResult(computeMultiplePropertyAssessment({}))
    expect(wrapper.text()).toContain('report.multipleProperty.scope')
  })

  it('shows the Capital Introduced line only where capital is actually introduced', async () => {
    const convert = await mountWithResult(computeMultiplePropertyAssessment({ endOfInterestOnly: 'convert' }))
    expect(convert.text()).not.toContain('report.multipleProperty.summary.capitalIntroduced')

    const repay = await mountWithResult(computeMultiplePropertyAssessment({ endOfInterestOnly: 'repay' }))
    expect(repay.text()).toContain('report.multipleProperty.summary.capitalIntroduced')
  })

  it('names the loss rule in force on the carry-forward row, rather than always saying ring-fenced', async () => {
    const ringFenced = await mountWithResult(computeMultiplePropertyAssessment({}))
    expect(ringFenced.text()).toContain('report.multipleProperty.taxTable.lossToCarryForwardRingFenced')

    const offset = await mountWithResult(computeMultiplePropertyAssessment({ lossTreatment: 'offset' }))
    expect(offset.text()).toContain('report.multipleProperty.taxTable.lossToCarryForwardOffset')
    expect(offset.text()).not.toContain('report.multipleProperty.taxTable.lossToCarryForwardRingFenced')
  })

  it('reads the ten-year tables off the model — no figure is computed in the component', async () => {
    const wrapper = await mountWithResult(computeMultiplePropertyAssessment({}))
    const tables = wrapper.vm.tables

    expect(tables.map(t => t.key)).toEqual(['summary', 'pl', 'tax', 'loans'])
    tables.forEach((table) => {
      table.rows.forEach((row) => {
        expect(row.values).toHaveLength(10) // one column per year, every row
      })
    })
  })

  it('blanks a cell the workbook leaves empty instead of printing a charge of zero', async () => {
    const wrapper = await mountWithResult(computeMultiplePropertyAssessment({}))
    // Purchase Costs are year-1 only: years 2–10 are nothing happening, not $0 spent.
    expect(wrapper.vm.cellText({ blankZeros: true }, 0)).toBe('—')
    expect(wrapper.vm.cellText({}, 0)).toBe('0')
    expect(wrapper.vm.cellText({}, null)).toBe('—')
  })
})

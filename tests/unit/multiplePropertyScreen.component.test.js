/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')
const MultiplePropertyAssessment = require('~/components/MultiplePropertyAssessment.vue').default
const {
  computeMultiplePropertyPortfolio,
  defaultProperties,
  MAX_PROPERTIES
} = require('~/server/report/multiplePropertyModel')

/**
 * Component test — the Multiple Property Assessment screen (the portfolio).
 *
 * The maths is golden-tested (`multiplePropertyModel.test.js`, 80 tests), the route by
 * `multiplePropertyRoute.test.js`, and the headline/badge/frame shape by the four
 * consistency guards. This suite covers what only the SCREEN can get wrong.
 *
 * Carried from Phase 1, because they still can:
 *   1. the display→decimal conversion in the payload — a missed ÷100 sends 750% as the
 *      management fee and silently wrecks every figure below it;
 *   2. the seeded screen matching the model's own sample exactly, so nothing defaults
 *      silently on the backend (the R8 ruling);
 *   3. 🔴 the EFFECTIVE management fee actually reaching the screen (§6 rule 10);
 *   4. Capital Introduced showing only where capital actually moves (§5b);
 *   5. the carry-forward row naming the loss rule in force (§8 Q5f).
 *
 * New in Phase 2, and every one of them is a way to ship a plausible wrong number:
 *   6. 🔴 EVERY warning code the model can emit has a sentence. The model changes
 *      figures to make the sums balance; a screen that drops the notice puts it back to
 *      producing a wrong figure in silence, which is the fault §8 Q8 was raised to fix.
 *   7. a BLANK deposit is absent from the payload, not zero — blank means "take what is
 *      left of the pool" and zero is a deliberate choice to put nothing in;
 *   8. 🔴 a blank lending ceiling is never sent as 0. A maximum loan-to-value of zero
 *      refuses every loan ever written — the same defect the Property Tax Rules tab was
 *      tested against on 2026-08-20;
 *   9. `fundingRequired` and `cashDeposit` never appear on the portfolio shape — the
 *      apportionment table decides both and the route ignores them;
 *  10. the five seeded properties still match the model's own five;
 *  11. 🔴 opening a different property changes NOTHING in the portfolio (§11 Q11).
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

/** A portfolio computed the way the screen asks for it. */
function portfolio (overrides) {
  return computeMultiplePropertyPortfolio(overrides || {})
}

describe('Multiple Property Assessment screen — the payload', () => {
  it('converts every display percentage to a decimal', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const spec = wrapper.vm.recomputeRequest()
    const p = spec.body.properties[0]

    expect(spec.url).toBe('/api/report/multiple-property')
    expect(spec.body.household.residenceTaxApportionmentPct).toBeCloseTo(0.6, 6) // 60 → 0.6
    expect(p.taxRate).toBeCloseTo(0.28, 6) //                   28 → 0.28
    expect(p.managementFeePct).toBeCloseTo(0.075, 6) //         7.5 → 0.075
    expect(p.rentalGrowth).toBeCloseTo(0.035, 6)
    expect(p.capitalGrowth).toBeCloseTo(0.03, 6)
    expect(p.expenseInflation).toBeCloseTo(0.05, 6)
    expect(p.interestRateInflation).toBeCloseTo(0.001, 6) //    0.1 → 0.001
    expect(p.managementFeeGstRate).toBeCloseTo(0.15, 6)
    expect(p.depreciationRateChattels).toBeCloseTo(0.28, 6)
    expect(p.interestOnlyRate).toBeCloseTo(0.04, 6)
    expect(p.piRate).toBeCloseTo(0.04, 6)
    // The phasing table is a LIST of percentages and each entry needs the same ÷100.
    expect(p.phasingTable).toEqual([1, 0.75, 0.5, 0.25, 0])
    // Settings and money figures pass through untouched.
    expect(p.yearOneAddBack).toBe('setup')
    expect(p.lossTreatment).toBe('ringFenced')
    expect(p.endOfInterestOnly).toBe('convert')
    expect(p.purchasePrice).toBe(649000)
    expect(p.interestOnlyTotalTermYears).toBe(30)
  })

  it('asks for the PORTFOLIO — a household and a list, not one property', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const body = wrapper.vm.recomputeRequest().body

    expect(body.household).toEqual(expect.any(Object))
    expect(Array.isArray(body.properties)).toBe(true)
    expect(body.properties).toHaveLength(5)
    expect(body.household.residenceValue).toBe(1400000)
    expect(body.household.homeMortgage).toBe(225000)
    expect(body.household.totalSavings).toBe(315000)
  })

  it('NEVER sends fundingRequired or cashDeposit — the table decides both', () => {
    // A caller who sends them is describing a funding structure the apportionment table
    // is about to overrule, so the route ignores them. Sending them anyway would make
    // the screen look like it was asking for something it was not going to get.
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const body = wrapper.vm.recomputeRequest().body

    body.properties.forEach((p) => {
      expect(p.fundingRequired).toBeUndefined()
      expect(p.cashDeposit).toBeUndefined()
    })
  })

  it('leaves a BLANK deposit out of the payload, but sends a typed zero', () => {
    // Blank means "take what is left of the pool, in order" — the table's behaviour
    // before the family had a choice. Zero means "put nothing into this one", which is
    // a choice and is honoured as one. Sending 0 for both would silently delete the
    // first meaning.
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    expect(wrapper.vm.recomputeRequest().body.properties[0].depositApplied).toBeUndefined()

    wrapper.vm.properties[0].depositApplied = 0
    expect(wrapper.vm.recomputeRequest().body.properties[0].depositApplied).toBe(0)

    wrapper.vm.properties[0].depositApplied = 90000
    expect(wrapper.vm.recomputeRequest().body.properties[0].depositApplied).toBe(90000)
  })

  it('🔴 never sends a blank lending ceiling as ZERO', () => {
    // A maximum loan-to-value of 0% refuses every loan ever written — silently, on a
    // screen where every other blank number legitimately means zero. The ceiling ships
    // unset on purpose (§8 Q10) and must stay absent until a real figure exists.
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    expect(wrapper.vm.household.maxLvrPct).toBe('')
    expect(wrapper.vm.recomputeRequest().body.household.maxLvr).toBeUndefined()

    wrapper.vm.household.maxLvrPct = 80
    expect(wrapper.vm.recomputeRequest().body.household.maxLvr).toBeCloseTo(0.8, 6)
  })

  it('sends a payload the model accepts whole — only the ceiling falls back', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const result = computeMultiplePropertyPortfolio(wrapper.vm.recomputeRequest().body)

    // The R8 ruling: any input that fell back is NAMED. The ONLY one here is the
    // ceiling, which is deliberately unset — everything else the screen supplies.
    expect(result.defaultedInputs).toEqual(['household.maxLvr'])
    result.properties.forEach((p) => {
      expect(p.defaultedInputs).toEqual([])
    })
  })

  it('seeds the same five properties the model does', () => {
    // The screen carries its own copy of the workbook's five so it can paint before the
    // backend answers. This is the guard against those two lists drifting apart — a
    // screen showing 515,000 while the model computed on 649,000 would agree with
    // nothing and be very hard to see.
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    const theirs = defaultProperties()

    expect(wrapper.vm.properties).toHaveLength(theirs.length)
    wrapper.vm.properties.forEach((mine, i) => {
      expect(mine.address).toBe(theirs[i].address)
      expect(mine.purchasePrice).toBe(theirs[i].purchasePrice)
      expect(mine.land).toBe(theirs[i].land)
      expect(mine.building).toBe(theirs[i].building)
      expect(mine.chattels).toBe(theirs[i].chattels)
      expect(mine.rentPerWeek).toBe(theirs[i].rentPerWeek)
      expect(mine.insurance).toBe(theirs[i].insurance)
      expect(mine.rates).toBe(theirs[i].rates)
      expect(mine.bodyCorp).toBe(theirs[i].bodyCorp)
      expect(mine.interestOnlyTermYears).toBe(theirs[i].interestOnlyTermYears)
      expect(mine.piTermYears).toBe(theirs[i].piTermYears)
      expect(mine.managementFeePct / 100).toBeCloseTo(theirs[i].managementFeePct, 6)
      expect(mine.interestOnlyRatePct / 100).toBeCloseTo(theirs[i].interestOnlyRate, 6)
    })
  })
})

describe('Multiple Property Assessment screen — the findings', () => {
  /** Every warning code the maths module can actually emit, read from its source. */
  function modelWarningCodes () {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'server', 'report', 'multiplePropertyModel.js'), 'utf8'
    )
    const codes = (src.match(/code:\s*'([A-Z_]+)'/g) || [])
      .map(m => m.replace(/^code:\s*'/, '').replace(/'$/, ''))
    return Array.from(new Set(codes)).sort()
  }

  it('🔴 has a sentence for EVERY warning code the model can emit', async () => {
    // This is what makes `findingText`'s `default: return null` unreachable rather than
    // a silent hole. Add a code to the model without a sentence here and the build
    // fails — because the alternative is an advisor being shown "LVR_EXCEEDED".
    const wrapper = await mountWithResult(portfolio())
    const codes = modelWarningCodes()

    expect(codes.length).toBeGreaterThanOrEqual(7)
    codes.forEach((code) => {
      const text = wrapper.vm.findingText({
        code, property: 1, typed: 350000, applied: 334000, wanted: 1, lvr: 0.9, maxLvr: 0.8
      })
      expect(typeof text).toBe('string')
      expect(text).not.toBe('')
      // The sentence must not be the code itself leaking through a missing locale key.
      expect(text).not.toContain(code)
    })
  })

  it('renders the model\'s findings rather than swallowing them', async () => {
    // On its own defaults the model caps property 1's interest-only loan from 350,000 to
    // 334,000, because the deposit reduced what it needs to borrow. That is a sentence
    // the advisor has to read before trusting the loan split.
    const result = portfolio()
    expect(result.warnings.map(w => w.code)).toContain('INTEREST_ONLY_CAPPED')

    const wrapper = await mountWithResult(result)
    expect(wrapper.vm.findings.length).toBe(result.warnings.length)
    expect(wrapper.text()).toContain('report.multipleProperty.findings.title')
  })

  it('marks a breached lending ratio more loudly than a capped figure', async () => {
    const props = defaultProperties().map(p => Object.assign({}, p, { depositApplied: 60000 }))
    const result = computeMultiplePropertyPortfolio({ household: { maxLvr: 0.8 }, properties: props })
    const wrapper = await mountWithResult(result)

    expect(result.warnings.some(w => w.code === 'LVR_EXCEEDED')).toBe(true)
    expect(wrapper.vm.findings.some(f => f.crit)).toBe(true)
  })

  it('hides the findings card entirely when the model changed nothing', async () => {
    const clean = portfolio()
    clean.warnings = []
    const wrapper = await mountWithResult(clean)

    expect(wrapper.vm.findings).toEqual([])
    expect(wrapper.text()).not.toContain('report.multipleProperty.findings.title')
  })
})

describe('Multiple Property Assessment screen — lending, shown and not judged', () => {
  it('shows both ratios and judges NEITHER while no ceiling is set', async () => {
    const wrapper = await mountWithResult(portfolio())

    expect(wrapper.vm.hasCeiling).toBe(false)
    expect(wrapper.vm.maxLvrLabel).toBe('report.multipleProperty.household.maxLvrUnset')
    const boxes = wrapper.vm.lendingBoxes
    expect(boxes).toHaveLength(2)
    boxes.forEach((b) => {
      expect(b.verdict).toBe('report.multipleProperty.lending.notJudged')
      expect(b.breach).toBe(false)
    })
    // 69.4% everything in, 90.9% for the rentals on their own — the two questions a
    // lender asks, both computed and both left unjudged.
    expect(boxes[0].value).toBe('69.4%')
    expect(boxes[1].value).toBe('90.9%')
  })

  it('starts judging both ratios once a ceiling exists', async () => {
    const result = computeMultiplePropertyPortfolio({ household: { maxLvr: 0.8 } })
    const wrapper = await mountWithResult(result)

    expect(wrapper.vm.hasCeiling).toBe(true)
    expect(wrapper.vm.maxLvrLabel).toBe('80.0%')
    const boxes = wrapper.vm.lendingBoxes
    // Everything the family owns is 69.4% — within. The rentals alone are 90.9% — over.
    expect(boxes[0].breach).toBe(false)
    expect(boxes[0].verdict).toContain('report.multipleProperty.lending.within')
    expect(boxes[1].breach).toBe(true)
    expect(boxes[1].verdict).toContain('report.multipleProperty.lending.over')
  })
})

describe('Multiple Property Assessment screen — the deposit table', () => {
  it('lists the family home first, then every property, and marks the auto split', async () => {
    const wrapper = await mountWithResult(portfolio())
    const rows = wrapper.vm.depositRows

    expect(rows).toHaveLength(6) //                     the residence plus five rentals
    expect(rows[0].index).toBe(-1) //                   the home has no deposit box
    expect(rows[0].label).toBe('report.multipleProperty.deposit.residence')
    expect(rows[1].label).toContain('56 Big Deal Avenue')
    // Nobody typed a deposit, so the table spent the pool in order: property 1 takes the
    // whole 315,000 and the rest borrow the entire purchase price.
    expect(wrapper.vm.noDepositChosen).toBe(true)
    expect(rows[1].funding).toBe(334000)
    expect(rows[2].funding).toBe(515000)
    expect(rows[2].lvr).toBeCloseTo(1, 6)
  })

  it('🔴 shows what the table PUT IN, even where nobody typed it', async () => {
    // Found by rendering the screen, not by a test: the deposit box binds to what the
    // family TYPED, so on the state the screen opens in it was blank — beside a funding
    // figure of 334,000 that plainly had 315,000 deducted from it. The screen was
    // disagreeing with its own table. The applied figure is the box's PLACEHOLDER, so
    // blank still means "take what is left" and the reader still sees the money.
    const wrapper = await mountWithResult(portfolio())
    const rows = wrapper.vm.depositRows

    expect(rows[1].deposit).toBe(315000) //  property 1 took the whole pool
    expect(rows[2].deposit).toBe(0) //       and there was none left for property 2
    // The FORM is still blank — the placeholder must not become a typed choice, or the
    // hold-back would be set by the screen rather than by the family.
    expect(wrapper.vm.properties[0].depositApplied).toBe('')
    expect(wrapper.vm.recomputeRequest().body.properties[0].depositApplied).toBeUndefined()
  })

  it('says the deposit is fully spent, or how much the family kept', async () => {
    const spent = await mountWithResult(portfolio())
    expect(spent.vm.heldBackText).toContain('report.multipleProperty.deposit.heldBackNone')

    const props = defaultProperties().map(p => Object.assign({}, p, { depositApplied: 10000 }))
    const kept = await mountWithResult(computeMultiplePropertyPortfolio({ properties: props }))
    expect(kept.vm.heldBackText).toContain('report.multipleProperty.deposit.heldBackSome')
    expect(kept.vm.noDepositChosen).toBe(false)
  })
})

describe('Multiple Property Assessment screen — the open property', () => {
  it('🔴 opening a different property leaves the whole portfolio untouched', async () => {
    // §11 Q11: choosing which property to inspect is the reader navigating. Nothing in
    // the portfolio may move as a side effect — not the deposit table, not the lending
    // position, not the consolidated report, not the commentary.
    const wrapper = await mountWithResult(portfolio())
    const before = {
      deposit: JSON.stringify(wrapper.vm.depositRows),
      lending: JSON.stringify(wrapper.vm.lendingBoxes),
      consolidated: JSON.stringify(wrapper.vm.consolidatedRows),
      compare: JSON.stringify(wrapper.vm.compareRows),
      servicing: JSON.stringify(wrapper.vm.servicingRows),
      coach: JSON.stringify(wrapper.vm.portfolioCoachLines)
    }

    wrapper.vm.selected = 3
    await wrapper.vm.$nextTick()

    expect(JSON.stringify(wrapper.vm.depositRows)).toBe(before.deposit)
    expect(JSON.stringify(wrapper.vm.lendingBoxes)).toBe(before.lending)
    expect(JSON.stringify(wrapper.vm.consolidatedRows)).toBe(before.consolidated)
    expect(JSON.stringify(wrapper.vm.compareRows)).toBe(before.compare)
    expect(JSON.stringify(wrapper.vm.servicingRows)).toBe(before.servicing)
    expect(JSON.stringify(wrapper.vm.portfolioCoachLines)).toBe(before.coach)
    // And the property section DID follow the reader.
    expect(wrapper.vm.tables[0].sub).toContain('55 Small Deal Avenue')
  })

  it('shows what the management fee ACTUALLY costs, not only the rate that is typed', async () => {
    // 7.5% with 15% GST is charged at 8.625%. The 1.15 used to live inside the formula,
    // so the advisor read 7.5% and the model charged 8.625% with nothing saying so.
    const wrapper = await mountWithResult(portfolio())
    const text = wrapper.text()

    expect(text).toContain('report.multipleProperty.costs.effectiveFee')
    expect(text).toContain('8.625%')
  })

  it('no longer claims to be one property of five', async () => {
    // Build step P2-5: the scope line was written to be deleted the day the other four
    // properties arrived. The catalogue row lost it in the same change.
    const wrapper = await mountWithResult(portfolio())
    expect(wrapper.text()).not.toContain('report.multipleProperty.scope')
  })

  it('shows the Capital Introduced line only where capital is actually introduced', async () => {
    const convert = await mountWithResult(portfolio())
    expect(convert.text()).not.toContain('report.multipleProperty.summary.capitalIntroduced')

    const repayProps = defaultProperties().map(p => Object.assign({}, p, { endOfInterestOnly: 'repay' }))
    const repay = await mountWithResult(computeMultiplePropertyPortfolio({ properties: repayProps }))
    expect(repay.text()).toContain('report.multipleProperty.summary.capitalIntroduced')
    expect(repay.text()).toContain('report.multipleProperty.consolidated.capitalIntroduced')
  })

  it('names the loss rule in force on the carry-forward row, rather than always saying ring-fenced', async () => {
    const ringFenced = await mountWithResult(portfolio())
    expect(ringFenced.text()).toContain('report.multipleProperty.taxTable.lossToCarryForwardRingFenced')

    const offsetProps = defaultProperties().map(p => Object.assign({}, p, { lossTreatment: 'offset' }))
    const offset = await mountWithResult(computeMultiplePropertyPortfolio({ properties: offsetProps }))
    expect(offset.text()).toContain('report.multipleProperty.taxTable.lossToCarryForwardOffset')
    expect(offset.text()).not.toContain('report.multipleProperty.taxTable.lossToCarryForwardRingFenced')
  })

  it('reads every table off the model — no figure is computed in the component', async () => {
    const wrapper = await mountWithResult(portfolio())

    expect(wrapper.vm.tables.map(t => t.key)).toEqual(['summary', 'pl', 'tax', 'loans'])
    const everyRow = wrapper.vm.tables
      .reduce((all, t) => all.concat(t.rows), [])
      .concat(wrapper.vm.consolidatedRows, wrapper.vm.servicingRows)
    everyRow.forEach((row) => {
      expect(row.values).toHaveLength(10) // one column per year, every row
    })
  })

  it('🔴 shows the cash deposit in year 1, not a row of dashes', async () => {
    // Found by rendering the screen, not by a test. `investmentSummary.cashDeposit` is a
    // SCALAR, not a ten-year series; indexing it gave `undefined` and the row rendered as
    // ten dashes — the deposit vanishing from the one table that exists to show what the
    // client put in. Every other row in that table IS a series, which is what made it an
    // easy mistake and a hard one to see.
    const wrapper = await mountWithResult(portfolio())
    const row = wrapper.vm.summaryRows.find(r => r.label === 'report.multipleProperty.summary.cashDeposit')

    expect(row.values[0]).toBe(315000)
    expect(row.values.slice(1).every(v => v === null)).toBe(true) // never again
    expect(wrapper.vm.cellText(row, row.values[0])).toBe('315,000')
  })

  it('blanks a cell the workbook leaves empty instead of printing a charge of zero', async () => {
    const wrapper = await mountWithResult(portfolio())
    // Purchase Costs are year-1 only: years 2–10 are nothing happening, not $0 spent.
    expect(wrapper.vm.cellText({ blankZeros: true }, 0)).toBe('—')
    expect(wrapper.vm.cellText({}, 0)).toBe('0')
    expect(wrapper.vm.cellText({}, null)).toBe('—')
  })
})

describe('Multiple Property Assessment screen — adding and removing properties', () => {
  it('stops at the model\'s own maximum', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })
    expect(wrapper.vm.maxProperties).toBe(MAX_PROPERTIES)

    wrapper.vm.addProperty() //  already at five — must be a no-op, not a sixth
    expect(wrapper.vm.properties).toHaveLength(MAX_PROPERTIES)

    wrapper.vm.removeProperty(0)
    wrapper.vm.addProperty()
    expect(wrapper.vm.properties).toHaveLength(MAX_PROPERTIES)
    // A new property is seeded from the same sample the BACKEND falls back to, so the
    // screen never shows zeros while the model computes on 649,000.
    expect(wrapper.vm.properties[MAX_PROPERTIES - 1].purchasePrice).toBe(649000)
    expect(wrapper.vm.properties[MAX_PROPERTIES - 1].address).toBe('')
  })

  it('never removes the last property, and keeps the reader\'s place', () => {
    const wrapper = mountWithBuefy(MultiplePropertyAssessment, { propsData: {} })

    wrapper.vm.selected = 4
    wrapper.vm.removeProperty(4)
    // Clamped, not reset: removing the open property leaves the reader beside it rather
    // than throwing them back to property 1.
    expect(wrapper.vm.selected).toBe(3)
    expect(wrapper.vm.properties).toHaveLength(4)

    while (wrapper.vm.properties.length > 1) { wrapper.vm.removeProperty(0) }
    wrapper.vm.removeProperty(0)
    expect(wrapper.vm.properties).toHaveLength(1) // a portfolio of nothing has no meaning
    expect(wrapper.vm.selected).toBe(0)
  })
})

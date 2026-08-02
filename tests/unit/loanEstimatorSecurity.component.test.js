/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LoanEstimatorSecurity = require('~/components/LoanEstimatorSecurity.vue').default
const loanCriteria = require('~/data/loan-criteria.json')
const { DEFAULT_INPUTS, computeLoanEstimator } = require('~/server/report/loanEstimatorModel')

/**
 * Step 1 of the Loan Estimator — the `Capital Input` entry grid.
 *
 * The load-bearing test here is the SAMPLE-PARITY one: the screen seeds itself
 * with its own copy of the workbook sample (display percents), and the backend
 * holds the canonical copy (DEFAULT_INPUTS). If either copy is edited alone,
 * the untouched screen would silently submit figures that differ from what the
 * anonymous route computes when a block is omitted. Deep-equality of the
 * emitted payload against DEFAULT_INPUTS pins the two together.
 */
describe('LoanEstimatorSecurity', () => {
  function mountScreen (props) {
    return mountWithBuefy(LoanEstimatorSecurity, { propsData: props || {} })
  }

  it('renders every security class from loan-criteria.json, personal then commercial', () => {
    const wrapper = mountScreen()
    const text = wrapper.text()
    loanCriteria.securityClasses.forEach((cls) => {
      expect(text).toContain(cls.label)
    })
    // Two group cards + two side cards; rows split 5 personal / 10 commercial.
    const rows = wrapper.findAll('.les-row:not(.les-head)')
    expect(rows.length).toBe(15)
  })

  it('shows the sample notice on first entry, not when restoring confirmed figures', () => {
    const first = mountScreen()
    expect(first.find('.sample-notice').exists()).toBe(true)

    first.vm.confirm()
    const payload = first.emitted().confirmed[0][0]
    const restored = mountScreen({ restore: payload })
    expect(restored.find('.sample-notice').exists()).toBe(false)
  })

  it('SAMPLE PARITY — the untouched screen emits exactly the backend DEFAULT_INPUTS', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]

    // The screen's percent→decimal conversion (5.05/100) lands one floating-point
    // bit away from the backend's literal 0.0505, so the derived figures agree to
    // ~1e-10 of a dollar rather than bit-for-bit. Everything typed is exact.
    expect(payload.securities.length).toBe(DEFAULT_INPUTS.securities.length)
    payload.securities.forEach((s, i) => {
      const e = DEFAULT_INPUTS.securities[i]
      expect(s.key).toBe(e.key)
      expect(s.prospects).toBe(e.prospects)
      expect(s.currentDebt).toBe(e.currentDebt)
      expect(s.currentMonthlyPayments).toBe(e.currentMonthlyPayments)
      expect(s.adjustmentPct).toBeCloseTo(e.adjustmentPct, 12)
      expect(s.value).toBeCloseTo(e.value, 5)
    })
    const sub = payload.subCalculations
    const eSub = DEFAULT_INPUTS.subCalculations
    expect(sub.commercialPropertyRentalIncome).toBe(eSub.commercialPropertyRentalIncome)
    expect(sub.propertyCapRate).toBeCloseTo(eSub.propertyCapRate, 12)
    expect(sub.fonterraShares).toBe(eSub.fonterraShares)
    expect(sub.fonterraTradingValue).toBe(eSub.fonterraTradingValue)
    expect(payload.overdraft).toEqual({ fundsDrawn: 25000, secured: true })

    // And the backend accepts it as a full block — nothing falls back to defaults.
    const out = computeLoanEstimator(payload)
    expect(out.defaultedInputs).toEqual([])
  })

  it('typed figures land in the payload', async () => {
    const wrapper = mountScreen()
    const firstValueInput = wrapper.find('.les-row:not(.les-head) input')
    await firstValueInput.setValue('500000')
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.securities[0]).toMatchObject({ key: 'residentialHome', value: 500000 })
  })

  it('derived rows follow the side calculations (G21 = D26)', () => {
    const wrapper = mountScreen()
    wrapper.vm.sub.rentalIncome = 100000
    wrapper.vm.sub.capRatePct = 5
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    const commercial = payload.securities.find(s => s.key === 'commercialProperty')
    expect(commercial.value).toBe(2000000)
    const fonterra = payload.securities.find(s => s.key === 'fonterraShares')
    expect(fonterra.value).toBe(45000 * 3.85)
  })

  it('restore round-trips: a confirmed payload re-emits unchanged', () => {
    const first = mountScreen()
    first.vm.confirm()
    const payload = first.emitted().confirmed[0][0]

    const restored = mountScreen({ restore: payload })
    restored.vm.confirm()
    expect(restored.emitted().confirmed[0][0]).toEqual(payload)
  })
})

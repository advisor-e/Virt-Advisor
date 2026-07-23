/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LoanEstimatorServiceability = require('~/components/LoanEstimatorServiceability.vue').default
const { DEFAULT_SERVICEABILITY_INPUTS, computeServiceability } = require('~/server/report/loanEstimatorModel')
const en = require('~/locales/en.json')

/**
 * Step 2 of the Loan Estimator — the `Serviceability Input` entry screen.
 *
 * As with step 1, the load-bearing test is SAMPLE PARITY: the screen seeds
 * itself with its own copy of the Ripper-household sample (display percents),
 * the backend holds the canonical copy (DEFAULT_SERVICEABILITY_INPUTS), and
 * deep-checking the emitted payload against it pins the two together so
 * neither can drift alone.
 */
describe('LoanEstimatorServiceability', () => {
  function mountScreen (props) {
    return mountWithBuefy(LoanEstimatorServiceability, { propsData: props || {} })
  }

  it('renders all four sections wired to the approved workbook wording', () => {
    // The mount helper's $t stub renders the key path, so the wiring check
    // (key appears in the template) and the wording check (approved label
    // lives at that key in en.json) are asserted separately.
    const wrapper = mountScreen()
    const text = wrapper.text()
    const strings = en.report.loanEstimator.serviceability
    const expected = {
      jointApplication: 'Is this a Joint Application?',
      dependantsUnder18: 'Number of Dependants under 18 yrs',
      otherMonthly: "Combined 'Other' Mthly (Tax Paid) Income",
      boardersTitle: 'Boarder/Homestay Income',
      studentLoan1: 'Customer 1 Student Loan',
      overdraftLimits: 'Overdraft/s Limits',
      rentPaid: 'Rent Paid (Weekly)',
      generalLiving: 'General Living Expenses (weekly)'
    }
    Object.keys(expected).forEach((key) => {
      expect(text).toContain('report.loanEstimator.serviceability.' + key)
      expect(strings[key]).toBe(expected[key])
    })
    expect(strings.loanRow.revolvingCredit).toBe('Current Revolving Credit Limits')
    expect(strings.loanCol.actualRate).toBe('Actual Rate if higher than 6.65%')
    // 4 loan rows under the grid head.
    expect(wrapper.findAll('.lesv-row:not(.lesv-head)').length).toBe(4)
  })

  it('shows the sample notice on first entry, not when restoring confirmed figures', () => {
    const first = mountScreen()
    expect(first.find('.sample-notice').exists()).toBe(true)

    first.vm.confirm()
    const payload = first.emitted().confirmed[0][0]
    const restored = mountScreen({ restore: payload })
    expect(restored.find('.sample-notice').exists()).toBe(false)
  })

  it('SAMPLE PARITY — the untouched screen emits exactly the backend DEFAULT_SERVICEABILITY_INPUTS', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]

    // Rates go through percent→decimal conversion (13.95/100), which can land a
    // floating-point bit away from the backend's literal 0.1395 — compare close.
    // Everything typed is exact.
    const { loans: expectedLoans, ...expectedFlat } = DEFAULT_SERVICEABILITY_INPUTS
    const { loans: actualLoans, ...actualFlat } = payload
    expect(actualFlat).toEqual(expectedFlat)
    Object.keys(expectedLoans).forEach((key) => {
      expect(actualLoans[key].balance).toBe(expectedLoans[key].balance)
      expect(actualLoans[key].assessmentTermYears).toBe(expectedLoans[key].assessmentTermYears)
      expect(actualLoans[key].actualTermYears).toBe(expectedLoans[key].actualTermYears)
      expect(actualLoans[key].actualRate).toBeCloseTo(expectedLoans[key].actualRate, 12)
    })

    // And the backend accepts it as a full block — nothing falls back to defaults.
    const out = computeServiceability(payload)
    expect(out.defaultedInputs).toEqual([])
  })

  it('reproduces the corrected sample verdict: surplus −154.83…, FAILS the test', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const out = computeServiceability(wrapper.emitted().confirmed[0][0])
    expect(out.surplus).toBeCloseTo(-154.833776247, 6)
    expect(out.verdictPass).toBe(false)
  })

  it('a "No" student loan submits 0 regardless of the remembered monthly figure', () => {
    const wrapper = mountScreen()
    wrapper.vm.studentLoan1 = 'No'
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.studentLoan1Monthly).toBe(0)
    expect(payload.studentLoan2Monthly).toBe(652)
  })

  it('typed figures land in the payload, rates as decimals', () => {
    const wrapper = mountScreen()
    wrapper.vm.income.customer1Gross = 120000
    wrapper.vm.loans.personalTermLoans.ratePct = 9.5
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.customer1GrossIncome).toBe(120000)
    expect(payload.loans.personalTermLoans.actualRate).toBeCloseTo(0.095, 12)
  })

  it('country is fixed to NZ (ruled 2026-07-23 — no selector)', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    expect(wrapper.emitted().confirmed[0][0].country).toBe('NZ')
    expect(wrapper.find('select[name="country"]').exists()).toBe(false)
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

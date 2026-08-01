/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LoanEstimatorBusiness = require('~/components/LoanEstimatorBusiness.vue').default
const {
  DEFAULT_INPUTS,
  DEFAULT_BUSINESS_INPUTS,
  computeBusinessBlock
} = require('~/server/report/loanEstimatorModel')
const en = require('~/locales/en.json')

/**
 * Step 2 of the Loan Estimator — the business-block entry screen (Part E).
 *
 * As with the other steps, the load-bearing test is SAMPLE PARITY: the screen
 * seeds its own copy of the Ripper-business sample, the backend holds the
 * canonical copy (DEFAULT_BUSINESS_INPUTS), and deep-checking the emitted
 * payload against it pins the two together so neither can drift alone.
 *
 * The nine securities are NOT owned by this screen — they are carried through
 * from step 1's confirmed security payload, so parity is checked in two parts:
 * the five scalar fields on their own, and the whole payload once a step-1
 * securities list is supplied via the `security` prop.
 */
describe('LoanEstimatorBusiness', () => {
  /** A step-1 payload carrying just the securities the business block reuses. */
  function securityProp () {
    return { securities: JSON.parse(JSON.stringify(DEFAULT_INPUTS.securities)) }
  }

  function mountScreen (props) {
    return mountWithBuefy(LoanEstimatorBusiness, { propsData: props || {} })
  }

  it('renders the business fields wired to the approved workbook wording', () => {
    const wrapper = mountScreen()
    const text = wrapper.text()
    const strings = en.report.loanEstimator.business
    const expected = {
      ebit: 'EBIT',
      businessType: 'Business Type',
      fullTimeStaff: 'Number of Full Time Staff',
      partTimeStaff: 'Number of Part Time Staff',
      currentTaxDue: 'Current Tax Due (incl Penalties)'
    }
    Object.keys(expected).forEach((key) => {
      expect(text).toContain('report.loanEstimator.business.' + key)
      expect(strings[key]).toBe(expected[key])
    })
    // The two business-type branches Loan Criteria Z45 distinguishes.
    expect(strings.commercialBusiness).toBe('Commercial Business')
    expect(strings.farm).toBe('Farm')
  })

  it('shows the sample notice on first entry, not when restoring confirmed figures', () => {
    const first = mountScreen()
    expect(first.find('.sample-notice').exists()).toBe(true)

    first.vm.confirm()
    const payload = first.emitted().confirmed[0][0]
    const restored = mountScreen({ restore: payload })
    expect(restored.find('.sample-notice').exists()).toBe(false)
  })

  it('does NOT capture the business entity name (PII rule, ruled 2026-07-24)', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.businessName).toBeUndefined()
    expect(wrapper.text().toLowerCase()).not.toContain('name of business')
  })

  it('SAMPLE PARITY — the five scalar fields match the backend DEFAULT_BUSINESS_INPUTS', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.ebit).toBe(DEFAULT_BUSINESS_INPUTS.ebit)
    expect(payload.businessType).toBe(DEFAULT_BUSINESS_INPUTS.businessType)
    expect(payload.fullTimeStaff).toBe(DEFAULT_BUSINESS_INPUTS.fullTimeStaff)
    expect(payload.partTimeStaff).toBe(DEFAULT_BUSINESS_INPUTS.partTimeStaff)
    expect(payload.currentTaxDue).toBe(DEFAULT_BUSINESS_INPUTS.currentTaxDue)
  })

  it('with step 1 securities supplied, the whole payload matches the sample and nothing defaults', () => {
    const wrapper = mountScreen({ security: securityProp() })
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload).toEqual(DEFAULT_BUSINESS_INPUTS)

    // The backend accepts it as a full block — no field falls back to the sample.
    const out = computeBusinessBlock(payload)
    expect(out.defaultedInputs).toEqual([])
  })

  it('reproduces the corrected sample anchors through the backend (H98, G102)', () => {
    const wrapper = mountScreen({ security: securityProp() })
    wrapper.vm.confirm()
    const out = computeBusinessBlock(wrapper.emitted().confirmed[0][0])
    expect(out.bankAdjustedMaxSecurity).toBeCloseTo(1947001.5, 4)
    expect(out.maxBankAdjustedLoan).toBeCloseTo(-977191.0856, 3)
  })

  it('omits securities when no step 1 payload is present, so the backend uses the sample', () => {
    const wrapper = mountScreen()
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.securities).toBeUndefined()
    // The backend flags the securities fall-back rather than failing silently.
    expect(computeBusinessBlock(payload).defaultedInputs).toContain('securities')
  })

  it('a Farm business type reaches the payload (Loan Criteria Z45 divisor 1.5)', () => {
    const wrapper = mountScreen({ security: securityProp() })
    wrapper.vm.businessType = 'Farm'
    wrapper.vm.confirm()
    const out = computeBusinessBlock(wrapper.emitted().confirmed[0][0])
    expect(out.coverageDivisor).toBe(1.5)
  })

  it('typed figures land in the payload', () => {
    const wrapper = mountScreen()
    wrapper.vm.ebit = 500000
    wrapper.vm.fullTimeStaff = 20
    wrapper.vm.confirm()
    const payload = wrapper.emitted().confirmed[0][0]
    expect(payload.ebit).toBe(500000)
    expect(payload.fullTimeStaff).toBe(20)
  })

  it('restore round-trips: a confirmed payload re-emits unchanged', () => {
    const first = mountScreen({ security: securityProp() })
    first.vm.confirm()
    const payload = first.emitted().confirmed[0][0]

    const restored = mountScreen({ security: securityProp(), restore: payload })
    restored.vm.confirm()
    expect(restored.emitted().confirmed[0][0]).toEqual(payload)
  })
})

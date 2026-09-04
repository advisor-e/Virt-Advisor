'use strict'

const {
  flattenLoanEstimator, rebuildLoanEstimator, rowChanged, ROW_SIZE
} = require('~/utils/loanEstimatorSavedShape')
const {
  DEFAULT_INPUTS, DEFAULT_SERVICEABILITY_INPUTS, DEFAULT_BUSINESS_INPUTS
} = require('~/server/report/loanEstimatorModel')

/**
 * The Loan Estimator's saved row (item 4.62, Brief §5). What UAT cannot see: a saved
 * row is written by a client and read back onto an advisor's screen. A confirmed step
 * must round-trip figure for figure; a step with one missing or malformed figure must
 * come back as "not confirmed", never as a sample figure quietly standing in; and the
 * page must land on the step that needs re-entering, not on a report built from a hole.
 */
const REPAYMENT = { purchasePrice: 1350000, deposit: 270000, ratePct: 5.5, term: 36, termUnit: 'Years', basis: 'Table' }

function clone (o) { return JSON.parse(JSON.stringify(o)) }

function fullState () {
  const security = clone(DEFAULT_INPUTS)
  const business = clone(DEFAULT_BUSINESS_INPUTS)
  const serviceability = clone(DEFAULT_SERVICEABILITY_INPUTS)
  return { security, business, serviceability, repayment: clone(REPAYMENT) }
}

describe('loanEstimatorSavedShape — flatten', () => {
  it('a full row is flat, named by step, and within the store cap of 200', () => {
    const row = flattenLoanEstimator(fullState())
    const keys = Object.keys(row)
    expect(keys).toHaveLength(ROW_SIZE)
    expect(ROW_SIZE).toBeLessThanOrEqual(200)
    keys.forEach((k) => {
      expect(k).toMatch(/^[A-Za-z0-9_.-]{1,64}$/) // the store's KEY_SHAPE
      const v = row[k]
      expect(['number', 'string', 'boolean']).toContain(typeof v)
    })
    expect(row['security.residentialHome.value']).toBe(1350000)
    expect(row['security.residentialHome.adjustmentPct']).toBe(0.02)
    expect(row['security.overdraft.secured']).toBe(true)
    expect(row['business.businessType']).toBe('Commercial Business')
    expect(row['serviceability.loans.newPropertyLoans.actualRate']).toBe(0.0595)
    expect(row['repayment.basis']).toBe('Table')
  })

  it('an unconfirmed step is absent, and the securities the business step carries are never saved twice', () => {
    const state = fullState()
    state.business = null
    const row = flattenLoanEstimator(state)
    expect(Object.keys(row).some(k => k.indexOf('business.') === 0)).toBe(false)
    const withBusiness = flattenLoanEstimator(fullState())
    expect(Object.keys(withBusiness).some(k => k.indexOf('business.securities') === 0)).toBe(false)
    expect(withBusiness['serviceability.country']).toBeUndefined()
  })
})

describe('loanEstimatorSavedShape — rebuild', () => {
  it('a full row round-trips every confirmed step figure for figure and lands on the report', () => {
    const state = fullState()
    const back = rebuildLoanEstimator(flattenLoanEstimator(state))
    expect(back.security).toEqual(state.security)
    expect(back.business).toEqual(state.business) // securities re-attached from step 1
    expect(back.serviceability).toEqual(state.serviceability) // country fixed to NZ
    expect(back.repayment).toEqual(REPAYMENT)
    expect(back.step).toBe(4)
  })

  it('a personal-only enquiry (no business step) still lands on the report', () => {
    const state = fullState()
    state.business = null
    const back = rebuildLoanEstimator(flattenLoanEstimator(state))
    expect(back.business).toBeNull()
    expect(back.step).toBe(4)
  })

  it('one malformed figure drops the whole step and lands the page on it — nothing is filled from the sample', () => {
    const row = flattenLoanEstimator(fullState())
    row['security.boat.prospects'] = 'Rocketing'
    let back = rebuildLoanEstimator(row)
    expect(back.security).toBeNull()
    expect(back.step).toBe(1)
    expect(back.serviceability).not.toBeNull() // the other steps are kept for when step 1 is re-confirmed

    const row2 = flattenLoanEstimator(fullState())
    delete row2['serviceability.loans.personalTermLoans.balance']
    back = rebuildLoanEstimator(row2)
    expect(back.serviceability).toBeNull()
    expect(back.step).toBe(3)

    const row3 = flattenLoanEstimator(fullState())
    row3['business.ebit'] = '342000'
    back = rebuildLoanEstimator(row3)
    expect(back.business).toBeNull()
    expect(back.step).toBe(2) // a broken business block is re-entered, never silently dropped
  })

  it('a bad calculator figure leaves the calculator alone; a broken row leaves everything unconfirmed', () => {
    const row = flattenLoanEstimator(fullState())
    row['repayment.basis'] = 'Balloon'
    expect(rebuildLoanEstimator(row).repayment).toBeNull()
    row['repayment.basis'] = 'Table'
    row['repayment.term'] = Infinity
    expect(rebuildLoanEstimator(row).repayment).toBeNull()
    const nothing = rebuildLoanEstimator('not a row')
    expect(nothing).toEqual({ security: null, business: null, serviceability: null, repayment: null, step: 1 })
    expect(rebuildLoanEstimator({ bogus: 1 }).step).toBe(1)
  })

  it('a rebuilt step carries no key a hostile row smuggled in', () => {
    const row = flattenLoanEstimator(fullState())
    row['security.residentialHome.__proto__'] = 1
    row['business.securities'] = 'mine'
    const back = rebuildLoanEstimator(row)
    expect(Object.keys(back.security)).toEqual(['securities', 'subCalculations', 'overdraft'])
    expect(Object.keys(back.security.securities[0]).sort()).toEqual(
      ['adjustmentPct', 'currentDebt', 'currentMonthlyPayments', 'key', 'prospects', 'value']
    )
    expect(back.business.securities).toBe(back.security.securities)
  })
})

describe('loanEstimatorSavedShape — rowChanged', () => {
  it('matches a grid row by prefix only', () => {
    const changes = ['security.boat.value', 'serviceability.loans.newPropertyLoans.balance']
    expect(rowChanged(changes, 'security.boat')).toBe(true)
    expect(rowChanged(changes, 'security.boa')).toBe(false)
    expect(rowChanged(changes, 'serviceability.loans.newPropertyLoans')).toBe(true)
    expect(rowChanged(changes, 'serviceability.loans.revolvingCredit')).toBe(false)
    expect(rowChanged(null, 'security.boat')).toBe(false)
  })
})

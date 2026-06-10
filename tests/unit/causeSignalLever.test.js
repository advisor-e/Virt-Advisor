'use strict'

// Phase 1 — the cause-first check-in answer now feeds the problem-signal lever.
// problemSignals (the dominant ~77% scoring input) is extracted from the advisor's
// "what contributed?" answer PLUS their answer to the cause-first confirmation, so a
// signal-bearing correction at the check-in actually steers the selection. A plain
// "yes" is behaviour-preserving. (caseState.js imports no AI SDK, so no mock needed.)

const { buildCaseState, causeText } = require('../../server/utils/caseState')
const { extractProblemSignals } = require('../../server/utils/problemSignals')

describe('causeText — cause answer + cause-first check-in answer', () => {
  test('joins situationDiagnostic and domainConfirmed', () => {
    expect(causeText({ situationDiagnostic: 'foot traffic is low', domainConfirmed: "it's sales" }))
      .toBe("foot traffic is low it's sales")
  })
  test('excludes the pending sentinel', () => {
    expect(causeText({ situationDiagnostic: 'foot traffic is low', domainConfirmed: 'pending' }))
      .toBe('foot traffic is low')
  })
  test('excludes the skipped sentinel (prep-mode)', () => {
    expect(causeText({ situationDiagnostic: 'skipped', domainConfirmed: 'they are losing customers' }))
      .toBe('they are losing customers')
  })
  test('empty when neither is a real answer', () => {
    expect(causeText({})).toBe('')
    expect(causeText({ situationDiagnostic: 'pending', domainConfirmed: 'skipped' })).toBe('')
  })
})

describe('buildCaseState.problemSignals — the check-in answer steers the lever', () => {
  test('a signal-bearing correction at the check-in adds the signal', () => {
    const cs = buildCaseState([], {
      situationDiagnostic: 'the owner is not sure what is wrong',
      domainConfirmed: "no, they're losing customers"
    })
    expect(Object.keys(cs.problemSignals)).toContain('sales_volume')
  })

  test('the same correction is what flips it — without it, no such signal', () => {
    const without = buildCaseState([], { situationDiagnostic: 'the owner is not sure what is wrong', domainConfirmed: 'pending' })
    expect(Object.keys(without.problemSignals)).not.toContain('sales_volume')
  })

  test('a plain "yes" confirmation is behaviour-preserving (no extra signal)', () => {
    const withYes = buildCaseState([], { situationDiagnostic: 'foot traffic is low', domainConfirmed: "yes, that's right" })
    const baseline = extractProblemSignals('foot traffic is low')
    expect(withYes.problemSignals).toEqual(baseline)
  })
})

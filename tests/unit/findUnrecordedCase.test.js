'use strict'

// findUnrecordedCase — picks the case the session-start catch-up card asks
// about (Stage 5c, Option 1 — product owner 2026-07-14). Locks the scoping
// rules: OWN cases only (outcome writes are owner-scoped), this client only,
// templates present, outcomes absent, newest first.

import { findUnrecordedCase } from '../../utils/cases'

function makeCase (over = {}) {
  return {
    id: 'c1',
    advisorId: 'me',
    clientId: 'vanoss',
    templates: ['Quick Fire Diagnosis'],
    templateOutcomes: null,
    ...over
  }
}

describe('findUnrecordedCase', () => {
  test('finds the newest own unrecorded case for the client (list arrives newest-first)', () => {
    const cases = [
      makeCase({ id: 'newest' }),
      makeCase({ id: 'older' })
    ]
    expect(findUnrecordedCase(cases, 'me', 'vanoss').id).toBe('newest')
  })

  test("a colleague's case is never offered — outcome writes are owner-scoped", () => {
    const cases = [makeCase({ advisorId: 'colleague' })]
    expect(findUnrecordedCase(cases, 'me', 'vanoss')).toBeNull()
  })

  test("another client's cases are ignored", () => {
    const cases = [makeCase({ clientId: 'kirkby' })]
    expect(findUnrecordedCase(cases, 'me', 'vanoss')).toBeNull()
  })

  test('a case with outcomes already recorded is not asked about again', () => {
    const cases = [makeCase({ templateOutcomes: [{ title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' }] })]
    expect(findUnrecordedCase(cases, 'me', 'vanoss')).toBeNull()
  })

  test('a case with no templates has nothing to record', () => {
    expect(findUnrecordedCase([makeCase({ templates: [] })], 'me', 'vanoss')).toBeNull()
    expect(findUnrecordedCase([makeCase({ templates: null })], 'me', 'vanoss')).toBeNull()
  })

  test('recorded newer case does not hide an unrecorded older one', () => {
    const cases = [
      makeCase({ id: 'recorded', templateOutcomes: [{ title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' }] }),
      makeCase({ id: 'unrecorded-older' })
    ]
    expect(findUnrecordedCase(cases, 'me', 'vanoss').id).toBe('unrecorded-older')
  })

  test('empty/missing inputs → null, never a throw', () => {
    expect(findUnrecordedCase([], 'me', 'vanoss')).toBeNull()
    expect(findUnrecordedCase(null, 'me', 'vanoss')).toBeNull()
    expect(findUnrecordedCase([makeCase()], null, 'vanoss')).toBeNull()
    expect(findUnrecordedCase([makeCase()], 'me', null)).toBeNull()
    expect(findUnrecordedCase([null, makeCase()], 'me', 'vanoss')).not.toBeNull()
  })
})

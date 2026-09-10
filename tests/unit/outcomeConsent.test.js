'use strict'

/**
 * outcomeConsent — the consent record's shape and the anonymising tokens (4.87 T009/T010).
 *
 * The two things UAT cannot see: a malformed record silently reading as consent, and a token
 * that could be reversed or that changed under a firm between two reviews.
 */

const {
  CONFIG_KEY,
  CONSENT_WORDING,
  readConsent,
  contributionOpen,
  firmToken,
  caseHash
} = require('../../server/utils/outcomeConsent')

const valid = () => ({
  on: true,
  setBy: 'manager@firm.example',
  setAt: '2026-09-10T02:14:00Z',
  wording: CONSENT_WORDING,
  withdrawals: [{ requestedBy: 'manager@firm.example', requestedAt: '2026-09-11T01:00:00Z', removed: 12 }],
  events: [{ on: true, by: 'manager@firm.example', at: '2026-09-10T02:14:00Z' }]
})

describe('readConsent', () => {
  test('accepts the exact shape and returns it cleaned', () => {
    expect(readConsent(valid())).toEqual(valid())
  })

  test('the config key is the one the data model names', () => {
    expect(CONFIG_KEY).toBe('outcome-consent')
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'on'],
    ['an array', [valid()]],
    ['on as a string', { ...valid(), on: 'true' }],
    ['on as a number', { ...valid(), on: 1 }],
    ['on missing', (() => { const v = valid(); delete v.on; return v })()],
    ['setBy missing', { ...valid(), setBy: undefined }],
    ['setBy blank', { ...valid(), setBy: '   ' }],
    ['setBy not a string', { ...valid(), setBy: 42 }],
    ['setAt missing', { ...valid(), setAt: undefined }],
    ['setAt not a date', { ...valid(), setAt: 'yesterday' }],
    ['setAt not a string', { ...valid(), setAt: 1757470000000 }]
  ])('returns null on malformed input: %s', (_label, input) => {
    expect(readConsent(input)).toBeNull()
  })

  test('tolerates a missing wording, a missing withdrawals list and a missing events list', () => {
    const v = valid()
    delete v.wording
    delete v.withdrawals
    delete v.events
    expect(readConsent(v)).toEqual({ ...valid(), wording: '', withdrawals: [], events: [] })
  })

  // A record written before the History card existed has no events; one written since
  // must never let a malformed entry through, because the card names who did what.
  test('drops malformed switch events and keeps the well-formed ones', () => {
    const v = valid()
    v.events = [
      'not an object',
      null,
      { on: 'true', by: 'a@b', at: '2026-09-11T01:00:00Z' },
      { on: true, by: '', at: '2026-09-11T01:00:00Z' },
      { on: true, by: 'a@b', at: 'never' },
      { on: false, by: 'a@b', at: '2026-09-11T01:00:00Z' }
    ]
    expect(readConsent(v).events).toEqual([{ on: false, by: 'a@b', at: '2026-09-11T01:00:00Z' }])
  })

  test('drops malformed withdrawal entries and keeps the well-formed ones', () => {
    const v = valid()
    v.withdrawals = [
      'not an object',
      null,
      ['an array, not a record'],
      { requestedBy: 5, requestedAt: '2026-09-11T01:00:00Z', removed: 1 },
      { requestedBy: 'a@b', requestedAt: 1757550000000, removed: 1 },
      { requestedBy: '', requestedAt: '2026-09-11T01:00:00Z', removed: 1 },
      { requestedBy: 'a@b', requestedAt: 'never', removed: 1 },
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: -3 },
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: '7' },
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: 7 }
    ]
    expect(readConsent(v).withdrawals).toEqual([
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: 0 },
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: 0 },
      { requestedBy: 'a@b', requestedAt: '2026-09-11T01:00:00Z', removed: 7 }
    ])
  })

  test('caps setBy and wording lengths', () => {
    const v = { ...valid(), setBy: 'x'.repeat(500), wording: 'w'.repeat(2000) }
    const out = readConsent(v)
    expect(out.setBy).toHaveLength(120)
    expect(out.wording).toHaveLength(600)
  })
})

describe('contributionOpen', () => {
  test('true only for a valid record with on === true', () => {
    expect(contributionOpen(valid())).toBe(true)
  })

  test.each([
    ['on false', { ...valid(), on: false }],
    ['on as the string "true"', { ...valid(), on: 'true' }],
    ['malformed record', { on: true }],
    ['null', null],
    ['undefined', undefined]
  ])('false for %s', (_label, input) => {
    expect(contributionOpen(input)).toBe(false)
  })

  test('a withdrawal does not flip the switch', () => {
    expect(contributionOpen(valid())).toBe(true)
    expect(contributionOpen({ ...valid(), withdrawals: [] })).toBe(true)
  })
})

describe('the pinned consent sentence', () => {
  // Load-bearing: Mike's own words, ruled 2026-09-10 on the consent drawing. It is stored
  // with every consent record, so a drift here rewrites what a manager agreed to.
  test('is Mike\'s wording verbatim', () => {
    expect(CONSENT_WORDING).toBe(
      'I act for and on behalf of my firm when I choose to share our anonymised template ' +
      'outcomes with Advisor-e to improve recommendations for every participating firm. ' +
      'I understand what leaves our firm and what never does, as set out above, and that ' +
      'I can stop sharing at any time.'
    )
  })
})

describe('firmToken and caseHash', () => {
  const original = process.env.OUTCOME_POOL_SECRET

  afterEach(() => {
    if (original === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = original }
  })

  test('are stable for the same id under the same secret', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    expect(firmToken('firm-42')).toBe(firmToken('firm-42'))
    expect(caseHash('case-9')).toBe(caseHash('case-9'))
  })

  test('are 24 and 16 lowercase hex characters', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    expect(firmToken('firm-42')).toMatch(/^[0-9a-f]{24}$/)
    expect(caseHash('case-9')).toMatch(/^[0-9a-f]{16}$/)
  })

  test('differ per secret, so a token cannot be reproduced without it', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    const a = firmToken('firm-42')
    const c = caseHash('case-9')
    process.env.OUTCOME_POOL_SECRET = 'secret-two'
    expect(firmToken('firm-42')).not.toBe(a)
    expect(caseHash('case-9')).not.toBe(c)
  })

  test('differ per id', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    expect(firmToken('firm-42')).not.toBe(firmToken('firm-43'))
    expect(caseHash('case-9')).not.toBe(caseHash('case-10'))
  })

  test('are not a plain hash of the id', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    const plain = require('crypto').createHash('sha256').update('firm-42').digest('hex')
    expect(plain.startsWith(firmToken('firm-42'))).toBe(false)
  })

  test.each([['unset', undefined], ['empty', '']])('throw OUTCOME_POOL_SECRET_MISSING when the secret is %s', (_label, value) => {
    if (value === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = value }
    expect(() => firmToken('firm-42')).toThrow(expect.objectContaining({ code: 'OUTCOME_POOL_SECRET_MISSING' }))
    expect(() => caseHash('case-9')).toThrow(expect.objectContaining({ code: 'OUTCOME_POOL_SECRET_MISSING' }))
  })

  test('refuse an empty id', () => {
    process.env.OUTCOME_POOL_SECRET = 'secret-one'
    expect(() => firmToken('')).toThrow(/empty id/)
    expect(() => caseHash(undefined)).toThrow(/empty id/)
  })
})

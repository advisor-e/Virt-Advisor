'use strict'

/**
 * The saved-report store (design/features/business-entity-reports.md §5, item 4.62,
 * approved by Mike 2026-09-03). What UAT cannot see and this pins: a client cannot save
 * into a model that is not open to it; the advisor's version survives every client save
 * untouched; the `client` badge list is a comparison, not a stamp; Restore is a fresh
 * advisor save of that version; and hostile figures are refused, never trimmed.
 */
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/clientReportAccess', () => ({
  ROUTE_SHAPE: /^\/[a-z0-9-]+$/,
  isOpen: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const access = require('../../server/utils/clientReportAccess')
const saved = require('../../server/utils/savedReports')

const ADV = { name: 'Pat Advisor', email: 'pat@firm' }
const CLIENT = { name: 'Big Bird Bakery', email: 'dev-client@local' }

beforeEach(() => {
  overlay.loadFirmConfig.mockReset()
  overlay.saveFirmConfig.mockReset().mockResolvedValue(1)
  access.isOpen.mockReset()
})

describe('savedReports — the storage key', () => {
  it('is one firmOverlay key per client per model, under the 128-char column', () => {
    expect(saved.configKey('client-a', '/volatility')).toBe('client-report:client-a:/volatility')
  })

  it.each([['', '/volatility', 'BAD_CLIENT'], ['a:b', '/volatility', 'BAD_CLIENT'], ['c', 'volatility', 'BAD_ROUTE'], ['c', '/x/../y', 'BAD_ROUTE']])(
    'refuses client %j with route %j as %s', (client, route, code) => {
      expect(() => saved.configKey(client, route)).toThrow(expect.objectContaining({ code }))
    })
})

describe('savedReports — validateInputs (hostile by default)', () => {
  it('admits numbers, booleans, short strings and number arrays, as a fresh copy', () => {
    // A blank (null) is a figure's honest empty state — an optional input not yet typed,
    // or an empty month in a series — and must round-trip as a blank, never become 0.
    // A list of short names is the expense lines a file supplied (Quick Position), kept
    // beside their amounts so a reloaded report still names them.
    const src = { sales: 100, flag: true, note: 'x', months: [1, null, 2], hurdle: null, names: ['Rent', 'Power'] }
    const out = saved.validateInputs(src)
    expect(out).toEqual(src)
    expect(out).not.toBe(src)
    expect(out.months).not.toBe(src.months)
    expect(out.names).not.toBe(src.names)
  })

  it.each([
    ['not an object', 'x'], ['an array', [1]], ['empty', {}],
    ['a nested object', { a: { b: 1 } }], ['NaN', { a: NaN }], ['Infinity', { a: Infinity }],
    ['a bad key', { 'a b': 1 }], ['a long string', { a: 'x'.repeat(201) }],
    ['a mixed list', { a: ['x', 1] }], ['a long name in a list', { a: ['x'.repeat(201)] }],
    ['a list of blanks and names', { a: [null, 'x'] }], ['a long list', { a: new Array(121).fill(1) }],
    ['undefined', { a: undefined }], ['an object in a list', { a: [{}] }]
  ])('refuses %s as BAD_INPUTS', (_, inputs) => {
    expect(() => saved.validateInputs(inputs)).toThrow(expect.objectContaining({ code: 'BAD_INPUTS' }))
  })
})

describe('savedReports — the advisor saves', () => {
  it('writes the row and makes this save the advisor version', async () => {
    const row = await saved.saveAsAdvisor('firm-1', 'client-a', '/debtor-drag', { sales: 5 }, ADV)
    expect(row.savedBy).toEqual({ tier: 'advisor', name: 'Pat Advisor' })
    expect(row.advisorVersion.inputs).toEqual({ sales: 5 })
    expect(row.advisorVersion.savedAt).toBe(row.savedAt)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-1', 'client-report:client-a:/debtor-drag', row, 'pat@firm')
    expect(saved.changedKeys(row)).toEqual([])
  })
})

describe('savedReports — the client saves', () => {
  it('is refused when the advisor has not opened the model, and writes nothing (D1/D5)', async () => {
    access.isOpen.mockResolvedValue(false)
    await expect(saved.saveAsClient('firm-1', 'client-a', '/debtor-drag', { sales: 9 }, CLIENT))
      .rejects.toEqual(expect.objectContaining({ code: 'NOT_OPEN' }))
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('carries the advisor version forward untouched and marks only the figures that differ (D4)', async () => {
    access.isOpen.mockResolvedValue(true)
    const advisorVersion = { inputs: { sales: 5, markup: 47, months: [1, 2] }, savedBy: { tier: 'advisor', name: 'Pat' }, savedAt: '2026-09-03T10:00:00.000Z' }
    overlay.loadFirmConfig.mockResolvedValue({ inputs: advisorVersion.inputs, savedBy: advisorVersion.savedBy, savedAt: advisorVersion.savedAt, advisorVersion })
    const row = await saved.saveAsClient('firm-1', 'client-a', '/debtor-drag', { sales: 6, markup: 47, months: [1, 3] }, CLIENT)
    expect(row.savedBy).toEqual({ tier: 'business_entity', name: 'Big Bird Bakery' })
    expect(row.advisorVersion).toBe(advisorVersion)
    expect(saved.changedKeys(row)).toEqual(['sales', 'months'])
  })

  it('with no advisor version yet, every figure is the client\'s', async () => {
    access.isOpen.mockResolvedValue(true)
    overlay.loadFirmConfig.mockResolvedValue(null)
    const row = await saved.saveAsClient('firm-1', 'client-a', '/debtor-drag', { sales: 6, np: 13 }, CLIENT)
    expect(row.advisorVersion).toBeNull()
    expect(saved.changedKeys(row)).toEqual(['sales', 'np'])
  })

  it('validates before it checks access, so a hostile payload never reaches the table', async () => {
    await expect(saved.saveAsClient('firm-1', 'client-a', '/debtor-drag', { a: { b: 1 } }, CLIENT))
      .rejects.toEqual(expect.objectContaining({ code: 'BAD_INPUTS' }))
    expect(access.isOpen).not.toHaveBeenCalled()
  })
})

describe('savedReports — restore', () => {
  it('writes the advisor version back as a fresh advisor save', async () => {
    const advisorVersion = { inputs: { sales: 5 }, savedBy: { tier: 'advisor', name: 'Pat' }, savedAt: 't0' }
    overlay.loadFirmConfig.mockResolvedValue({ inputs: { sales: 9 }, savedBy: { tier: 'business_entity', name: 'BB' }, savedAt: 't1', advisorVersion })
    const row = await saved.restoreAdvisorVersion('firm-1', 'client-a', '/debtor-drag', ADV)
    expect(row.inputs).toEqual({ sales: 5 })
    expect(row.savedBy.tier).toBe('advisor')
    expect(saved.changedKeys(row)).toEqual([])
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
  })

  it('refuses when the advisor never saved a version', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ inputs: { sales: 9 }, savedBy: { tier: 'business_entity', name: 'BB' }, savedAt: 't1', advisorVersion: null })
    await expect(saved.restoreAdvisorVersion('firm-1', 'client-a', '/debtor-drag', ADV))
      .rejects.toEqual(expect.objectContaining({ code: 'NO_ADVISOR_VERSION' }))
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('savedReports — reading', () => {
  it('returns null for nothing saved or a malformed row, never throws', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    expect(await saved.load('firm-1', 'client-a', '/debtor-drag')).toBeNull()
    overlay.loadFirmConfig.mockResolvedValue({ nope: 1 })
    expect(await saved.load('firm-1', 'client-a', '/debtor-drag')).toBeNull()
  })

  it('changedKeys is empty for an advisor-saved row, whatever the history', () => {
    expect(saved.changedKeys({ inputs: { a: 1 }, savedBy: { tier: 'advisor' }, advisorVersion: { inputs: { a: 2 } } })).toEqual([])
    expect(saved.changedKeys(null)).toEqual([])
  })
})

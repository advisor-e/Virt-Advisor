'use strict'

/**
 * The staff-register gate — Decision 6 of design/mockups/wages-model.html, ruled by Mike
 * 2026-09-14.
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester opening the wages screen sees whichever
 * state their own client happens to be in; they cannot see that a stored switch stops
 * opening the gate the moment the case leaves the due-diligence domain, that a closed gate
 * reports no record of who once opened it, or that "no case" and "not switched on" are
 * different answers rather than one greyed screen. Every one of those decides whether a
 * named employee's pay and key-person-risk rating is shown, which is why the decision is a
 * pure function and why every branch of it is here.
 */
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const gate = require('../../server/utils/wagesRegisterGate')

const DD_CASE = { id: 'case-1', title: 'Acquisition of Kinetic Planning (2007) Limited' }
const STORED = { openedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' }, openedAt: '2026-09-14T02:00:00.000Z' }

beforeEach(() => {
  overlay.loadFirmConfig.mockReset()
  overlay.saveFirmConfig.mockReset()
})

describe('findDueDiligenceCase', () => {
  it('finds the case whose domain is exactly the due-diligence id', () => {
    const found = gate.findDueDiligenceCase([
      { id: 'c-a', title: 'Margin review', domain: 'profitability-and-feasibility' },
      { id: 'c-b', title: 'Buying out the Hamilton branch', domain: 'due-diligence' }
    ])
    expect(found).toEqual({ id: 'c-b', title: 'Buying out the Hamilton branch' })
  })

  it('takes the FIRST match, which is the caller\'s newest-first order', () => {
    // A client can be in a second transaction years later; the current one is the one the
    // register is being prepared for.
    const found = gate.findDueDiligenceCase([
      { id: 'this-year', title: 'Sale to Meridian', domain: 'due-diligence' },
      { id: 'years-ago', title: 'Old merger', domain: 'due-diligence' }
    ])
    expect(found.id).toBe('this-year')
  })

  it('a case in any other domain does not open the gate', () => {
    expect(gate.findDueDiligenceCase([{ id: 'c-a', domain: 'profitability-and-feasibility' }])).toBeNull()
  })

  it('a near-miss domain string is not the due-diligence domain', () => {
    // The stored column holds the domain ID. A label, a plural or a space is a different
    // value and must not be read as the transaction the whole gate turns on.
    expect(gate.findDueDiligenceCase([{ id: 'c-a', domain: 'due diligence' }])).toBeNull()
    expect(gate.findDueDiligenceCase([{ id: 'c-b', domain: 'Due-Diligence' }])).toBeNull()
  })

  it('a case with no domain at all is not a due-diligence case', () => {
    expect(gate.findDueDiligenceCase([{ id: 'c-a', domain: null }, { id: 'c-b' }])).toBeNull()
  })

  it('an empty list, a non-list and a list of holes are all simply "no case"', () => {
    expect(gate.findDueDiligenceCase([])).toBeNull()
    expect(gate.findDueDiligenceCase(null)).toBeNull()
    expect(gate.findDueDiligenceCase(undefined)).toBeNull()
    expect(gate.findDueDiligenceCase('not a list')).toBeNull()
    expect(gate.findDueDiligenceCase([null, undefined])).toBeNull()
  })

  it('a due-diligence case with no title still opens the gate', () => {
    // The title is what the provenance line reads; its absence is not a reason to withhold
    // a register the ruling says is available.
    expect(gate.findDueDiligenceCase([{ id: 'c-a', domain: 'due-diligence' }])).toEqual({ id: 'c-a', title: '' })
  })
})

describe('resolveGate — the decision, in all three states', () => {
  it('no due-diligence case: CLOSED, and no switch is offered', () => {
    const g = gate.resolveGate(null, null)
    expect(g.state).toBe(gate.STATE_CLOSED)
    expect(g.reason).toBe(gate.REASON_NO_DUE_DILIGENCE_CASE)
    expect(g.case).toBeNull()
  })

  it('a due-diligence case, not switched on: AVAILABLE, naming the case', () => {
    const g = gate.resolveGate(DD_CASE, null)
    expect(g.state).toBe(gate.STATE_AVAILABLE)
    expect(g.reason).toBe(gate.REASON_NOT_SWITCHED_ON)
    expect(g.case).toEqual(DD_CASE)
    expect(g.openedAt).toBeNull()
  })

  it('both conditions met: OPEN, carrying who opened it and when', () => {
    const g = gate.resolveGate(DD_CASE, STORED)
    expect(g.state).toBe(gate.STATE_OPEN)
    expect(g.reason).toBe(gate.REASON_SWITCHED_ON)
    expect(g.openedBy).toEqual(STORED.openedBy)
    expect(g.openedAt).toBe(STORED.openedAt)
  })

  it('🔴 A STORED SWITCH NEVER OPENS THE GATE ON ITS OWN', () => {
    // Decision 6: "when the case leaves the due-diligence domain the register closes again
    // and what was entered is not shown. It is not a permanent property of the client."
    // Trusting the stored flag would leave the register standing open for the life of the
    // client record — the standing opinion the ruling refuses.
    const g = gate.resolveGate(null, STORED)
    expect(g.state).toBe(gate.STATE_CLOSED)
    expect(g.openedBy).toBeNull()
    expect(g.openedAt).toBeNull()
  })

  it('a closed gate reports NO record that the register was ever opened', () => {
    // Returning the old record would tell the reader this client was once in a transaction
    // — a fact the closed state exists to stop disclosing.
    const g = gate.resolveGate(null, STORED)
    expect(JSON.stringify(g)).not.toContain('Bartlett')
    expect(JSON.stringify(g)).not.toContain(STORED.openedAt)
  })

  it('a stored row with no openedAt is not a switch-on', () => {
    // A half-written or hand-edited row must fall to AVAILABLE, never to OPEN.
    expect(gate.resolveGate(DD_CASE, {}).state).toBe(gate.STATE_AVAILABLE)
    expect(gate.resolveGate(DD_CASE, { openedBy: { name: 'X' } }).state).toBe(gate.STATE_AVAILABLE)
  })

  it('an open gate with a lost openedBy still reports when, rather than refusing', () => {
    const g = gate.resolveGate(DD_CASE, { openedAt: STORED.openedAt })
    expect(g.state).toBe(gate.STATE_OPEN)
    expect(g.openedBy).toBeNull()
    expect(g.openedAt).toBe(STORED.openedAt)
  })
})

describe('noClientGate', () => {
  it('is closed, with no case and no record', () => {
    const g = gate.noClientGate()
    expect(g.state).toBe(gate.STATE_CLOSED)
    expect(g.reason).toBe(gate.REASON_NO_CLIENT)
    expect(g.case).toBeNull()
    expect(g.openedBy).toBeNull()
  })
})

describe('configKey', () => {
  it('is one row per client, under the register prefix', () => {
    expect(gate.configKey('c-1')).toBe('wages-register:c-1')
  })

  it('refuses an id that would break out of its own key', () => {
    // A colon is the key's own separator, so an id carrying one could address another
    // client's row.
    expect(() => gate.configKey('c-1:evil')).toThrow(/storage key/)
    try { gate.configKey('c-1:evil') } catch (e) { expect(e.code).toBe('BAD_CLIENT') }
  })

  it('refuses a missing id and one too long for the column', () => {
    expect(() => gate.configKey('')).toThrow(/storage key/)
    expect(() => gate.configKey(null)).toThrow(/storage key/)
    expect(() => gate.configKey('x'.repeat(65))).toThrow(/storage key/)
    expect(gate.configKey('x'.repeat(64))).toBe('wages-register:' + 'x'.repeat(64))
  })
})

describe('readSwitch', () => {
  it('reads the client\'s own row from the firm\'s overlay', async () => {
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    await expect(gate.readSwitch('firm-1', 'c-1')).resolves.toEqual(STORED)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith('firm-1', 'wages-register:c-1')
  })

  it('never opened is null, and so is a row with no openedAt', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    await expect(gate.readSwitch('firm-1', 'c-1')).resolves.toBeNull()
    overlay.loadFirmConfig.mockResolvedValue({ openedBy: { name: 'X' } })
    await expect(gate.readSwitch('firm-1', 'c-1')).resolves.toBeNull()
    overlay.loadFirmConfig.mockResolvedValue('a string')
    await expect(gate.readSwitch('firm-1', 'c-1')).resolves.toBeNull()
  })
})

describe('openRegister — the record of who and when', () => {
  it('writes who opened it and when, under the client\'s key', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    overlay.saveFirmConfig.mockResolvedValue(undefined)
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(row.openedBy).toEqual({ name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(typeof row.openedAt).toBe('string')
    expect(Number.isNaN(Date.parse(row.openedAt))).toBe(false)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-1', 'wages-register:c-1', row, 'mike@advisor-e.com')
  })

  it('🔴 re-opening does NOT overwrite the first record', async () => {
    // The first decision is the one that was made. Rewriting it would move the date on a
    // document that exists to say when the judgement was taken.
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'Someone Else', email: 'other@firm' })
    expect(row).toEqual(STORED)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('caps the stored name and email rather than storing whatever arrives', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'n'.repeat(400), email: 'e'.repeat(400) })
    expect(row.openedBy.name).toHaveLength(128)
    expect(row.openedBy.email).toHaveLength(190)
  })

  it('an advisor with no name on the token still produces a dated record', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const row = await gate.openRegister('firm-1', 'c-1', null)
    expect(row.openedBy).toEqual({ name: '', email: '' })
    expect(typeof row.openedAt).toBe('string')
  })
})

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
  it('🔴 NO DUE-DILIGENCE CASE IS NOT A REFUSAL — the register is simply not open yet', () => {
    // Mike, 2026-09-15: *"i dont need any bullshit gates telling my advisors what they can
    // and cant do. if they're engaged to run a due diligence project they will fucking tell
    // you."* This used to return CLOSED and offer nothing. It was unmeetable in any case —
    // the only thing that could ever satisfy the condition was the Virtual Advisor inferring
    // the domain from an advisor's words, and no screen let a human say so.
    const g = gate.resolveGate(null, null)
    expect(g.state).toBe(gate.STATE_AVAILABLE)
    expect(g.case).toBeNull()
  })

  it('🔴 AN OPENING WITH NO CASE AT ALL STANDS — the advisor said so, and that is enough', () => {
    const own = {
      openedBy: STORED.openedBy,
      openedAt: STORED.openedAt,
      declaredBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' },
      declaredAt: '2026-09-15T04:00:00.000Z',
      closedBy: null,
      closedAt: null
    }
    const g = gate.resolveGate(null, own)
    expect(g.state).toBe(gate.STATE_OPEN)
    expect(g.case).toBeNull()
    // The RECORD is what survived the gate: who opened it, when, and that it was on their
    // own say-so rather than against a case already in the domain.
    expect(g.declaredBy).toEqual(own.declaredBy)
    expect(g.declaredAt).toBe(own.declaredAt)
  })

  it('a CLOSED register is closed however it was opened', () => {
    // Closing is a decision too, and it still holds — what went is the barrier to OPENING,
    // never the advisor's ability to shut one they opened on the wrong client.
    const closed = {
      openedBy: STORED.openedBy,
      openedAt: STORED.openedAt,
      declaredBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' },
      declaredAt: '2026-09-15T04:00:00.000Z',
      closedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' },
      closedAt: '2026-09-15T05:00:00.000Z'
    }
    const g = gate.resolveGate(null, closed)
    expect(g.state).toBe(gate.STATE_AVAILABLE)
    expect(g.declaredAt).toBeNull()
  })

  it('a case in the domain claims NO say-so nobody gave', () => {
    // The two routes in stay distinguishable in the record: opening against an existing case
    // is not the advisor asserting anything, so it must not be written down as though it were.
    const g = gate.resolveGate(DD_CASE, STORED)
    expect(g.state).toBe(gate.STATE_OPEN)
    expect(g.declaredBy).toBeNull()
    expect(g.declaredAt).toBeNull()
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

  it('a CLOSED register returns to available, not to a fourth state', () => {
    // Once closed, the truth is exactly what `available` already says: a project stands and
    // the register is not open. The record of both decisions stays in the store.
    const closed = { ...STORED, closedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' }, closedAt: '2026-09-15T03:00:00.000Z' }
    const g = gate.resolveGate(DD_CASE, closed)
    expect(g.state).toBe(gate.STATE_AVAILABLE)
    expect(g.reason).toBe(gate.REASON_NOT_SWITCHED_ON)
    expect(g.case).toEqual(DD_CASE)
    expect(g.openedAt).toBeNull()
  })

  it('🔴 A STORED OPENING STANDS ON ITS OWN, WITH NO CASE ANYWHERE', () => {
    // This test used to assert the exact opposite, and the reversal is Mike's ruling of
    // 2026-09-15. Decision 6 had the register close itself when a case left the
    // due-diligence domain — which, with the gate gone, would mean an opening the advisor
    // made deliberately being revoked by a domain classifier they never asked to consult.
    // An advisor who is finished closes it; nothing else does it behind them.
    const g = gate.resolveGate(null, STORED)
    expect(g.state).toBe(gate.STATE_OPEN)
    expect(g.openedBy).toEqual(STORED.openedBy)
    expect(g.openedAt).toBe(STORED.openedAt)
  })

  it('a register that is NOT open discloses nobody — no name, no date', () => {
    // The one disclosure rule that survives the gate, and it still matters: `available` is
    // rendered to anyone who opens the screen, so it must not carry the record of an earlier
    // opening and tell a reader this client was once in a transaction.
    const closed = { ...STORED, closedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' }, closedAt: '2026-09-15T05:00:00.000Z' }
    const g = gate.resolveGate(null, closed)
    expect(g.state).toBe(gate.STATE_AVAILABLE)
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

  it('🔴 opening an ALREADY-OPEN register does NOT overwrite the first record', async () => {
    // The first decision is the one that was made. Rewriting it would move the date on a
    // document that exists to say when the judgement was taken.
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'Someone Else', email: 'other@firm' })
    expect(row).toEqual(STORED)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('opening a CLOSED register IS a new decision, and is recorded as one', async () => {
    // Unlike the case above: the previous decision was reversed, so re-opening is a fresh
    // act and the screen must name the advisor who took it, not the one who took the last.
    overlay.loadFirmConfig.mockResolvedValue({ ...STORED, closedBy: { name: 'Old', email: 'old@firm' }, closedAt: '2026-09-15T03:00:00.000Z' })
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'Someone Else', email: 'other@firm' })
    expect(row.openedBy).toEqual({ name: 'Someone Else', email: 'other@firm' })
    expect(row.openedAt).not.toBe(STORED.openedAt)
    expect(row.closedAt).toBeNull()
    expect(row.closedBy).toBeNull()
    expect(overlay.saveFirmConfig).toHaveBeenCalled()
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

describe('closeRegister — the switch turns both ways', () => {
  it('🔴 records who closed it and KEEPS the opening it closed', async () => {
    // A close that erased the opening would leave no record that anyone ever decided to
    // show this material — the exact thing the gate exists to make attributable.
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    const row = await gate.closeRegister('firm-1', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(row.openedBy).toEqual(STORED.openedBy)
    expect(row.openedAt).toBe(STORED.openedAt)
    expect(row.closedBy).toEqual({ name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(typeof row.closedAt).toBe('string')
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-1', 'wages-register:c-1', row, 'mike@advisor-e.com')
  })

  it('closing an already-closed register writes nothing', async () => {
    // A second closedAt would move the date on a decision already taken.
    const closed = { ...STORED, closedBy: { name: 'First', email: 'first@firm' }, closedAt: '2026-09-15T03:00:00.000Z' }
    overlay.loadFirmConfig.mockResolvedValue(closed)
    const row = await gate.closeRegister('firm-1', 'c-1', { name: 'Second', email: 'second@firm' })
    expect(row).toEqual(closed)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('closing a register that was never opened writes nothing', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const row = await gate.closeRegister('firm-1', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(row).toBeNull()
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('an advisor with no email on the token still closes it, and is still dated', async () => {
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    const row = await gate.closeRegister('firm-1', 'c-1', null)
    expect(row.closedBy).toEqual({ name: '', email: '' })
    expect(typeof row.closedAt).toBe('string')
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-1', 'wages-register:c-1', row, null)
  })

  it('a closed row no longer opens the gate', async () => {
    // The round trip, rather than the two halves separately: close, then resolve.
    overlay.loadFirmConfig.mockResolvedValue(STORED)
    const row = await gate.closeRegister('firm-1', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(gate.resolveGate(DD_CASE, row).state).toBe(gate.STATE_AVAILABLE)
  })
})

describe('the no-database fallback — dev only, and never on a refusal', () => {
  const fs = require('fs')
  const path = require('path')
  const DEV_PATH = path.resolve(process.cwd(), gate.DEV_FILE)

  /** A connection-level failure: mysql2 gives a `code` and NO `sqlState`. */
  function noServer () {
    const e = new Error('connect ECONNREFUSED 127.0.0.1:3306')
    e.code = 'ECONNREFUSED'
    return e
  }

  /** A live server that REFUSED the statement: always carries a `sqlState`. */
  function refused () {
    const e = new Error('Cannot add or update a child row')
    e.code = 'ER_NO_REFERENCED_ROW_2'
    e.errno = 1452
    e.sqlState = '23000'
    return e
  }

  afterEach(() => { try { fs.unlinkSync(DEV_PATH) } catch (_e) { /* not written */ } })

  it('opening with no database writes the dev file, and reads back from it', async () => {
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    overlay.saveFirmConfig.mockRejectedValue(noServer())
    const row = await gate.openRegister('firm-1', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
    expect(row.openedAt).toBeTruthy()
    // And the next read finds it, which is the half that was broken on screen.
    await expect(gate.readSwitch('firm-1', 'c-1')).resolves.toEqual(row)
  })

  it('one firm\'s dev row is not another firm\'s', async () => {
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    overlay.saveFirmConfig.mockRejectedValue(noServer())
    await gate.openRegister('firm-1', 'c-1', { name: 'A', email: 'a@firm' })
    await expect(gate.readSwitch('firm-2', 'c-1')).resolves.toBeNull()
  })

  it('closing with no database is kept too', async () => {
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    overlay.saveFirmConfig.mockRejectedValue(noServer())
    await gate.openRegister('firm-1', 'c-1', { name: 'A', email: 'a@firm' })
    const closed = await gate.closeRegister('firm-1', 'c-1', { name: 'A', email: 'a@firm' })
    expect(closed.closedAt).toBeTruthy()
    expect(gate.resolveGate(DD_CASE, await gate.readSwitch('firm-1', 'c-1')).state).toBe(gate.STATE_AVAILABLE)
  })

  it('🔴 A SERVER THAT REFUSED THE WRITE NEVER FALLS BACK — it throws', async () => {
    // The whole point of dbFailure: a refused write must not land in a scratch file and be
    // reported as a register that was opened. A false "opened" is a record claiming someone
    // decided to show a client's named staff when no such decision was ever stored.
    overlay.loadFirmConfig.mockResolvedValue(null)
    overlay.saveFirmConfig.mockRejectedValue(refused())
    await expect(gate.openRegister('firm-1', 'c-1', { name: 'A', email: 'a@firm' })).rejects.toThrow(/child row/)
    expect(fs.existsSync(DEV_PATH)).toBe(false)
  })

  it('🔴 A SERVER THAT REFUSED THE READ NEVER FALLS BACK EITHER', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refused())
    await expect(gate.readSwitch('firm-1', 'c-1')).rejects.toThrow(/child row/)
  })

  it('🔴 an unusable client id THROWS rather than being written to the dev file', async () => {
    // BAD_CLIENT carries no sqlState, so inside the try the fallback would read it as
    // "nothing answered" and write the row under the very id it just refused. The key is
    // built before the try precisely to stop that.
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    overlay.saveFirmConfig.mockRejectedValue(noServer())
    await expect(gate.openRegister('firm-1', 'c-1:evil', { name: 'A', email: 'a@firm' })).rejects.toThrow(/storage key/)
    await expect(gate.readSwitch('firm-1', 'c-1:evil')).rejects.toThrow(/storage key/)
    expect(fs.existsSync(DEV_PATH)).toBe(false)
  })
})

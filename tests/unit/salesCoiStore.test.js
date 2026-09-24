'use strict'

/**
 * The COI store — item 17 stage 3.
 *
 * The rules are the pipeline store's, and the reasoning is written there rather
 * than repeated. What is proved here is that THIS store actually carries them:
 * a second resource is exactly where an access rule gets dropped, because the
 * pattern looks already-solved.
 *
 *   READ  — the caller's own rows at any visibility, plus their firm's rows
 *           marked 'firm'.
 *   WRITE — `AND advisor_id = ? AND firm_id = ?` on every mutation, so a shared
 *           row is readable by a colleague and editable only by its owner.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))

const db = require('../../server/utils/db')
const { devFallbackAllowed } = require('../../server/utils/dbFailure')
const store = require('../../server/utils/salesCoiStore')
const { removeFile } = require('../helpers/removeFile')

const ADVISOR = 'advisor-aaa'
const OTHER = 'advisor-bbb'
const FIRM = 'firm-111'

/** One statement's SQL, whitespace collapsed so a line break cannot hide a clause. */
function sqlOf (call) {
  return String(call[0]).replace(/\s+/g, ' ').trim()
}

beforeEach(() => {
  jest.clearAllMocks()
  devFallbackAllowed.mockReturnValue(false)
})

describe('reads are scoped to the caller, in SQL', () => {
  test('the list filters on the firm AND (own OR shared)', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listForAdvisor(ADVISOR, FIRM)
    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/WHERE firm_id = \?/)
    expect(sql).toMatch(/advisor_id = \? OR visibility = 'firm'/)
    expect(sql).toMatch(/LIMIT 500/)
    expect(db.execute.mock.calls[0][1]).toEqual([FIRM, ADVISOR])
  })

  test('🔴 the list can never omit the firm filter — the source app\'s own fault', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listForAdvisor(ADVISOR, FIRM)
    expect(sqlOf(db.execute.mock.calls[0])).toContain('firm_id = ?')
  })

  test('getById carries the firm too, so a guessed id from another tenant misses', async () => {
    db.execute.mockResolvedValue([[]])
    await store.getById('c1', ADVISOR, FIRM)
    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/WHERE id = \? AND firm_id = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual(['c1', FIRM, ADVISOR])
  })
})

describe('writes are limited to the OWNER, in SQL', () => {
  test('update and delete both carry advisor_id AND firm_id', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.update('c1', ADVISOR, FIRM, { other: 'x' })
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)

    jest.clearAllMocks()
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.remove('c1', ADVISOR, FIRM)
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual(['c1', ADVISOR, FIRM])
  })

  test('🔴 update NEVER filters on visibility — a shared row is readable, not writable', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.update('c1', ADVISOR, FIRM, { other: 'x' })
    expect(sqlOf(db.execute.mock.calls[0])).not.toMatch(/visibility = 'firm'/)
  })

  test('update returns null and delete false when no row was the caller\'s', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    await expect(store.update('not-mine', OTHER, FIRM, { other: 'x' })).resolves.toBeNull()
    await expect(store.remove('not-mine', OTHER, FIRM)).resolves.toBe(false)
  })

  test('an update with nothing to set issues no UPDATE at all', async () => {
    db.execute.mockResolvedValue([[]])
    await store.update('c1', ADVISOR, FIRM, {})
    expect(db.execute).toHaveBeenCalledTimes(1)
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/^SELECT/)
  })
})

describe('create takes its identity from the caller, not the payload', () => {
  test('advisor_id and firm_id come from the arguments, and the id is generated', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, id: 'chosen', coiName: 'Harbour' })
    const params = db.execute.mock.calls[0][1]
    expect(params[0]).not.toBe('chosen')
    expect(params[1]).toBe(ADVISOR)
    expect(params[2]).toBe(FIRM)
  })

  test('a create with no identity throws rather than writing an unscoped row', async () => {
    await expect(store.create({ coiName: 'X' })).rejects.toThrow(/advisorId and firmId are required/)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('🔴 a row that inserts but cannot be read back is NOT reported as saved', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[]])
    await expect(store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'X' }))
      .rejects.toThrow(/could not be read back/)
  })

  test('every business column is written, so no field is silently dropped', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'X' })
    const sql = sqlOf(db.execute.mock.calls[0])
    store.COLUMNS.forEach(([, col]) => expect(sql).toContain('`' + col + '`'))
    expect(db.execute.mock.calls[0][1]).toHaveLength(4 + store.COLUMNS.length)
  })
})

describe('visibility fails safe', () => {
  test.each([
    ['undefined', undefined], ['null', null], ['an unknown word', 'public'],
    ['a number', 1], ['an object', {}], ['empty', '']
  ])('%s becomes private', (_label, v) => {
    expect(store.normaliseVisibility(v)).toBe('private')
  })

  test.each(['private', 'firm'])('%s is kept', (v) => {
    expect(store.normaliseVisibility(v)).toBe(v)
  })
})

describe('the values survive the round trip', () => {
  test('a fee is written as a fixed-2 string, never a float', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'X', feeValue: 5000.5 })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('feeValue')
    expect(db.execute.mock.calls[0][1][idx]).toBe('5000.50')
  })

  test('a non-finite score becomes 0, not NaN — NaN fails the whole insert', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'X', couldWe: NaN })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('couldWe')
    expect(db.execute.mock.calls[0][1][idx]).toBe(0)
  })

  test('a fractional score is rounded to an integer for the INT column', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'X', totalReferrals: 3.7 })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('totalReferrals')
    expect(db.execute.mock.calls[0][1][idx]).toBe(4)
  })

  test('MySQL\'s DECIMAL string and INTs come back as Numbers', () => {
    const e = store.rowToEntry({
      id: 'x',
advisor_id: ADVISOR,
firm_id: FIRM,
visibility: 'private',
      fee_value: '5000.50',
total_referrals: 4,
could_we: null
    })
    expect(e.feeValue).toBe(5000.5)
    expect(e.totalReferrals).toBe(4)
    expect(e.couldWe).toBe(0)
  })

  test('an over-long name is trimmed to 255 and an empty string becomes NULL', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'x'.repeat(400), industry: '' })
    const names = store.COLUMNS.map(([js]) => js)
    expect(db.execute.mock.calls[0][1][4 + names.indexOf('coiName')]).toHaveLength(255)
    expect(db.execute.mock.calls[0][1][4 + names.indexOf('industry')]).toBeNull()
  })
})

describe('a real database refusal is never absorbed', () => {
  test('every method asks dbFailure before falling back', async () => {
    db.execute.mockRejectedValue(new Error('down'))
    devFallbackAllowed.mockReturnValue(false)
    await expect(store.listForAdvisor(ADVISOR, FIRM)).rejects.toThrow()
    await expect(store.getById('x', ADVISOR, FIRM)).rejects.toThrow()
    await expect(store.update('x', ADVISOR, FIRM, { other: 'c' })).rejects.toThrow()
    await expect(store.remove('x', ADVISOR, FIRM)).rejects.toThrow()
    expect(devFallbackAllowed).toHaveBeenCalledTimes(4)
  })
})

describe('the dev JSON fallback enforces the SAME rules as the SQL', () => {
  const os = require('os')
  const path = require('path')
  let file
  let isolated

  beforeEach(() => {
    file = path.join(os.tmpdir(), 'dev-sales-coi-' + Date.now() + Math.random() + '.json')
    process.env.SALES_COI_DEV_FILE = file
    jest.resetModules()
    jest.doMock('../../server/utils/db', () => ({
      execute: jest.fn(() => Promise.reject(new Error('no db'))), getConnection: jest.fn()
    }))
    jest.doMock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => true) }))
    isolated = require('../../server/utils/salesCoiStore')
  })

  afterEach(() => {
    delete process.env.SALES_COI_DEV_FILE
    try { removeFile(file) } catch (e) { /* never existed */ }
  })

  test('a created partner is private and belongs to its creator', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'Harbour' })
    expect(e.visibility).toBe('private')
    expect(e.advisorId).toBe(ADVISOR)
  })

  test('🔴 another advisor at the same firm cannot see a private partner', async () => {
    await isolated.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'Secret' })
    await expect(isolated.listForAdvisor(OTHER, FIRM)).resolves.toEqual([])
  })

  test('🔴 another FIRM sees nothing, shared or not', async () => {
    await isolated.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'firm', coiName: 'Shared' })
    await expect(isolated.listForAdvisor(ADVISOR, 'other-firm')).resolves.toEqual([])
  })

  test('🔴 a colleague can READ a shared partner but NOT edit or delete it', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'firm', coiName: 'Shared' })
    await expect(isolated.getById(e.id, OTHER, FIRM)).resolves.toBeTruthy()
    await expect(isolated.update(e.id, OTHER, FIRM, { other: 'meddling' })).resolves.toBeNull()
    await expect(isolated.remove(e.id, OTHER, FIRM)).resolves.toBe(false)
    await expect(isolated.update(e.id, ADVISOR, FIRM, { other: 'mine' })).resolves.toBeTruthy()
    await expect(isolated.remove(e.id, ADVISOR, FIRM)).resolves.toBe(true)
  })

  test('the owner can edit every business field', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, coiName: 'A' })
    const u = await isolated.update(e.id, ADVISOR, FIRM, {
      industry: 'Legal', feeValue: 1234.56, totalReferrals: 7, willWe: 3
    })
    expect(u.industry).toBe('Legal')
    expect(u.feeValue).toBe(1234.56)
    expect(u.totalReferrals).toBe(7)
    expect(u.willWe).toBe(3)
  })

  test('a missing fallback file reads as empty rather than throwing', async () => {
    await expect(isolated.listForAdvisor(ADVISOR, FIRM)).resolves.toEqual([])
  })
})

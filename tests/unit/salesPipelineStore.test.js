'use strict'

/**
 * The Sales Tracker pipeline STORE — item 17 stage 2.
 *
 * The routes' tests prove the contract; these prove the SQL, which is where the
 * access boundary actually is. Two rules, and both are invisible on screen:
 *
 *   READ  — the caller's own deals at any visibility, plus their firm's deals
 *           marked 'firm'. Never another advisor's private deal, never another
 *           firm's anything.
 *   WRITE — `AND advisor_id = ? AND firm_id = ?` on every mutation. A deal shared
 *           to the firm is READABLE by a colleague and still EDITABLE only by its
 *           owner. That asymmetry is the point and it is easy to lose.
 *
 * The db module is mocked: these assert the STATEMENT and its parameters, because
 * a missing clause is the whole fault. The statements themselves were run against
 * the real local MySQL when the migration was built (see salesTrackerSchema.test.js).
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
// dbFailure decides whether the dev JSON fallback may stand in. Mocked to OFF by
// default so a test never writes into the working tree, and turned on explicitly
// in the fallback block below.
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))

const db = require('../../server/utils/db')
const { devFallbackAllowed } = require('../../server/utils/dbFailure')
const store = require('../../server/utils/salesPipelineStore')
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
    // Both ids bound, in order, and nothing interpolated.
    expect(db.execute.mock.calls[0][1]).toEqual([FIRM, ADVISOR])
  })

  test('🔴 the list can never omit the firm filter — the source app\'s own fault', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listForAdvisor(ADVISOR, FIRM)
    expect(sqlOf(db.execute.mock.calls[0])).toContain('firm_id = ?')
  })

  test('the list is capped, so one firm cannot pull an unbounded result', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listForAdvisor(ADVISOR, FIRM)
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/LIMIT 500/)
  })

  test('getById carries the firm too, so a guessed id from another tenant misses', async () => {
    db.execute.mockResolvedValue([[]])
    await store.getById('deal-1', ADVISOR, FIRM)
    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/WHERE id = \? AND firm_id = \?/)
    expect(sql).toMatch(/advisor_id = \? OR visibility = 'firm'/)
    expect(db.execute.mock.calls[0][1]).toEqual(['deal-1', FIRM, ADVISOR])
  })

  test('getById returns null rather than undefined when nothing matches', async () => {
    db.execute.mockResolvedValue([[]])
    await expect(store.getById('nope', ADVISOR, FIRM)).resolves.toBeNull()
  })
})

describe('writes are limited to the OWNER, in SQL', () => {
  test('update carries advisor_id AND firm_id', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    await store.update('deal-1', ADVISOR, FIRM, { comments: 'x' })
    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    const params = db.execute.mock.calls[0][1]
    expect(params.slice(-3)).toEqual(['deal-1', ADVISOR, FIRM])
  })

  test('delete carries advisor_id AND firm_id', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.remove('deal-1', ADVISOR, FIRM)
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual(['deal-1', ADVISOR, FIRM])
  })

  test('🔴 update NEVER filters on visibility — a shared deal is readable, not writable', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.update('deal-1', ADVISOR, FIRM, { comments: 'x' })
    const sql = sqlOf(db.execute.mock.calls[0])
    // If this ever contained `OR visibility = 'firm'`, any colleague could edit a
    // shared deal. That is the asymmetry this store exists to hold.
    expect(sql).not.toMatch(/visibility = 'firm'/)
  })

  test('update returns null when no row was the caller\'s', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    await expect(store.update('not-mine', OTHER, FIRM, { comments: 'x' })).resolves.toBeNull()
  })

  test('delete returns false when no row was the caller\'s', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    await expect(store.remove('not-mine', OTHER, FIRM)).resolves.toBe(false)
  })

  test('an update with nothing to set does not issue an UPDATE at all', async () => {
    db.execute.mockResolvedValue([[]])
    await store.update('deal-1', ADVISOR, FIRM, {})
    // One statement only, and it is the read-back.
    expect(db.execute).toHaveBeenCalledTimes(1)
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/^SELECT/)
  })
})

describe('create takes its identity from the caller, not the payload', () => {
  test('advisor_id and firm_id come from the arguments', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'Acme', prospectStatus: 'New' })
    const params = db.execute.mock.calls[0][1]
    expect(params[1]).toBe(ADVISOR)
    expect(params[2]).toBe(FIRM)
  })

  test('a create with no identity throws rather than writing an unscoped row', async () => {
    await expect(store.create({ prospectName: 'A' })).rejects.toThrow(/advisorId and firmId are required/)
    await expect(store.create({ advisorId: ADVISOR, prospectName: 'A' })).rejects.toThrow()
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('the id is generated here, never taken from the input', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'whatever', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, id: 'chosen', prospectName: 'A', prospectStatus: 'New' })
    expect(db.execute.mock.calls[0][1][0]).not.toBe('chosen')
  })

  test('🔴 a row that inserts but cannot be read back is NOT reported as saved', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[]]) // read-back finds nothing
    await expect(store.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New' }))
      .rejects.toThrow(/could not be read back/)
  })

  test('every business column is written, so no field is silently dropped on create', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New' })
    const sql = sqlOf(db.execute.mock.calls[0])
    store.COLUMNS.forEach(([, col]) => expect(sql).toContain('`' + col + '`'))
    // id, advisor_id, firm_id, visibility + every business column.
    expect(db.execute.mock.calls[0][1]).toHaveLength(4 + store.COLUMNS.length)
  })
})

describe('visibility fails safe', () => {
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['an unknown word', 'public'],
    ['a number', 1],
    ['an object', {}],
    ['empty', '']
  ])('%s becomes private', (_label, v) => {
    expect(store.normaliseVisibility(v)).toBe('private')
  })

  test.each(['private', 'firm'])('%s is kept', (v) => {
    expect(store.normaliseVisibility(v)).toBe(v)
  })

  test('a create asking for something impossible is stored private', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'everyone', prospectName: 'A', prospectStatus: 'New' })
    expect(db.execute.mock.calls[0][1][3]).toBe('private')
  })
})

describe('money survives the round trip exactly', () => {
  test('a fee is written as a fixed-2 string, never a float', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({
      advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New', proposalValue: 46170.5
    })
    const cols = store.COLUMNS.map(([js]) => js)
    const idx = 4 + cols.indexOf('proposalValue')
    expect(db.execute.mock.calls[0][1][idx]).toBe('46170.50')
  })

  test('a non-finite fee becomes 0.00, not NaN — NaN fails the whole insert', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({
      advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New', proposalValue: NaN
    })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('proposalValue')
    expect(db.execute.mock.calls[0][1][idx]).toBe('0.00')
  })

  test('MySQL\'s DECIMAL string comes back as a Number', () => {
    const entry = store.rowToEntry({
      id: 'x',
advisor_id: ADVISOR,
firm_id: FIRM,
visibility: 'private',
      proposal_value: '46170.50',
job_secured_value: '0.00',
additional_work_secured: null
    })
    expect(entry.proposalValue).toBe(46170.5)
    expect(entry.jobSecuredValue).toBe(0)
    expect(entry.additionalWorkSecured).toBe(0)
  })

  test('MySQL\'s 0/1 comes back as a real boolean', () => {
    const entry = store.rowToEntry({
      id: 'x',
advisor_id: ADVISOR,
firm_id: FIRM,
visibility: 'private',
      job_secured: 1,
proposal_sent: 0
    })
    expect(entry.jobSecured).toBe(true)
    expect(entry.proposalSent).toBe(false)
  })
})

describe('text is capped to the column, so MySQL never refuses the insert', () => {
  test('an over-long name is trimmed to 255 rather than rejected', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({
      advisorId: ADVISOR, firmId: FIRM, prospectStatus: 'New', prospectName: 'x'.repeat(400)
    })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('prospectName')
    expect(db.execute.mock.calls[0][1][idx]).toHaveLength(255)
  })

  test('an empty string becomes NULL, so a blank box is not a blank value', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({
      advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New', industry: ''
    })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('industry')
    expect(db.execute.mock.calls[0][1][idx]).toBeNull()
  })

  test('comments are NOT capped — the column is LONGTEXT', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    const long = 'y'.repeat(5000)
    await store.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New', comments: long })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('comments')
    expect(db.execute.mock.calls[0][1][idx]).toHaveLength(5000)
  })

  test('an unreadable date becomes NULL rather than an Invalid Date', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    db.execute.mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM, visibility: 'private' }]])
    await store.create({
      advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New', meetingDate: 'not a date'
    })
    const idx = 4 + store.COLUMNS.map(([js]) => js).indexOf('meetingDate')
    expect(db.execute.mock.calls[0][1][idx]).toBeNull()
  })
})

describe('a real database refusal is never absorbed', () => {
  test('a DB error propagates when the fallback is not allowed', async () => {
    db.execute.mockRejectedValue(Object.assign(new Error('refused'), { sqlState: '23000' }))
    devFallbackAllowed.mockReturnValue(false)
    await expect(store.listForAdvisor(ADVISOR, FIRM)).rejects.toThrow('refused')
  })

  test('🔴 the fallback decision is dbFailure\'s, never a bare NODE_ENV check', async () => {
    db.execute.mockRejectedValue(new Error('nothing answered'))
    devFallbackAllowed.mockReturnValue(false)
    await expect(store.getById('x', ADVISOR, FIRM)).rejects.toThrow()
    expect(devFallbackAllowed).toHaveBeenCalled()
  })

  test('every method asks dbFailure before falling back', async () => {
    db.execute.mockRejectedValue(new Error('down'))
    devFallbackAllowed.mockReturnValue(false)
    await expect(store.listForAdvisor(ADVISOR, FIRM)).rejects.toThrow()
    await expect(store.getById('x', ADVISOR, FIRM)).rejects.toThrow()
    await expect(store.update('x', ADVISOR, FIRM, { comments: 'c' })).rejects.toThrow()
    await expect(store.remove('x', ADVISOR, FIRM)).rejects.toThrow()
    expect(devFallbackAllowed).toHaveBeenCalledTimes(4)
  })
})

describe('the dev JSON fallback enforces the SAME rules as the SQL', () => {
  // The fallback is where an access rule is most likely to be forgotten, because
  // it is written twice. These use a temp file so nothing touches the working tree.
  const os = require('os')
  const path = require('path')
  let file
  let isolated

  beforeEach(() => {
    file = path.join(os.tmpdir(), 'dev-sales-pipeline-' + Date.now() + Math.random() + '.json')
    process.env.SALES_PIPELINE_DEV_FILE = file
    jest.resetModules()
    jest.doMock('../../server/utils/db', () => ({ execute: jest.fn(() => Promise.reject(new Error('no db'))), getConnection: jest.fn() }))
    jest.doMock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => true) }))
    isolated = require('../../server/utils/salesPipelineStore')
  })

  afterEach(() => {
    delete process.env.SALES_PIPELINE_DEV_FILE
    try { removeFile(file) } catch (e) { /* never existed */ }
  })

  test('a created deal is private and belongs to its creator', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'Acme', prospectStatus: 'New' })
    expect(e.visibility).toBe('private')
    expect(e.advisorId).toBe(ADVISOR)
    expect(e.firmId).toBe(FIRM)
  })

  test('🔴 another advisor at the same firm CANNOT see a private deal', async () => {
    await isolated.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'Secret', prospectStatus: 'New' })
    await expect(isolated.listForAdvisor(OTHER, FIRM)).resolves.toEqual([])
  })

  test('a deal shared to the firm IS visible to a colleague', async () => {
    await isolated.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'firm', prospectName: 'Shared', prospectStatus: 'New' })
    const seen = await isolated.listForAdvisor(OTHER, FIRM)
    expect(seen).toHaveLength(1)
    expect(seen[0].prospectName).toBe('Shared')
  })

  test('🔴 another FIRM sees nothing, shared or not', async () => {
    await isolated.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'firm', prospectName: 'Shared', prospectStatus: 'New' })
    await expect(isolated.listForAdvisor(ADVISOR, 'other-firm')).resolves.toEqual([])
    await expect(isolated.listForAdvisor(OTHER, 'other-firm')).resolves.toEqual([])
  })

  test('🔴 a colleague can READ a shared deal but NOT edit or delete it', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, visibility: 'firm', prospectName: 'Shared', prospectStatus: 'New' })
    await expect(isolated.getById(e.id, OTHER, FIRM)).resolves.toBeTruthy()
    await expect(isolated.update(e.id, OTHER, FIRM, { comments: 'meddling' })).resolves.toBeNull()
    await expect(isolated.remove(e.id, OTHER, FIRM)).resolves.toBe(false)
    // And the owner still can.
    await expect(isolated.update(e.id, ADVISOR, FIRM, { comments: 'mine' })).resolves.toBeTruthy()
    await expect(isolated.remove(e.id, ADVISOR, FIRM)).resolves.toBe(true)
  })

  test('the owner can edit every business field', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New' })
    const updated = await isolated.update(e.id, ADVISOR, FIRM, {
      industry: 'Legal', proposalValue: 1234.56, jobSecured: true, meetingDate: '2026-04-01'
    })
    expect(updated.industry).toBe('Legal')
    expect(updated.proposalValue).toBe(1234.56)
    expect(updated.jobSecured).toBe(true)
    expect(updated.meetingDate).toBeTruthy()
  })

  test('an update bumps updatedAt, so the list order is meaningful', async () => {
    const e = await isolated.create({ advisorId: ADVISOR, firmId: FIRM, prospectName: 'A', prospectStatus: 'New' })
    const before = e.updatedAt
    const updated = await isolated.update(e.id, ADVISOR, FIRM, { comments: 'later' })
    expect(String(updated.updatedAt) >= String(before)).toBe(true)
  })

  test('a missing fallback file reads as empty rather than throwing', async () => {
    await expect(isolated.listForAdvisor(ADVISOR, FIRM)).resolves.toEqual([])
  })
})

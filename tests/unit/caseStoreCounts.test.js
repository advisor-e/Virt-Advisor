'use strict'

/**
 * caseStore.countReviewStatus — the loop's reach, as two integers (item 4.97 US5, T037).
 *
 * The pool learns from a case ONLY once an advisor goes back and records how it went, and
 * until now nothing could say how often that happens. This is that number at one firm.
 *
 * Two things are pinned here that a screen could not show you:
 *
 *  - 🔴 ONE grouped COUNT, scoped to firm_id. Research R5 rejected reading rows and counting
 *    them in JavaScript: the list reads cap at 500 rows, so a firm past that would report a
 *    reach quietly lower than the truth, and rows would leave the store to produce an integer.
 *  - 🔴 A DB ERROR SURFACES in production rather than reading as zero. A silent zero here is
 *    worse than an error: "0 of 0 reviewed" looks like a firm nobody has reviewed at, which
 *    is a real state, so the failure would be invisible on the mentor's page.
 */

const { removeFile } = require('../helpers/removeFile')

const SQL_OK = () => [[{ reviewed: 0, cnt: 0 }], []]

describe('countReviewStatus — against the database', () => {
  let db, caseStore

  beforeEach(() => {
    jest.resetModules()
    process.env.NODE_ENV = 'production' // no dev fallback: the DB path is the path
    jest.doMock('../../server/utils/db', () => ({ execute: jest.fn(() => Promise.resolve(SQL_OK())) }))
    db = require('../../server/utils/db')
    caseStore = require('../../server/utils/caseStore')
  })

  test('issues ONE statement, grouped on reviewed_at IS NULL and scoped to the firm', async () => {
    await caseStore.countReviewStatus('firm-1')

    expect(db.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = db.execute.mock.calls[0]
    const flat = sql.replace(/\s+/g, ' ').toLowerCase()

    expect(flat).toContain('count(*)')
    expect(flat).toContain('from va_case_studies')
    expect(flat).toContain('where firm_id = ?')
    expect(flat).toContain('reviewed_at is null')
    expect(flat).toContain('group by')
    expect(params).toEqual(['firm-1'])

    // The count is done IN the database. A LIMIT here would be the 500-row cap R5 rejected
    // reappearing as a silently short count.
    expect(flat).not.toContain('limit')
    // Every visibility counts: a count discloses no case, and a private case still teaches
    // the pool when it is reviewed.
    expect(flat).not.toContain('visibility')
  })

  test('sums the two groups into delivered and reviewed', async () => {
    // How mysql2 returns a GROUP BY: one row per group, in no guaranteed order.
    db.execute.mockResolvedValue([[{ reviewed: 0, cnt: 7 }, { reviewed: 1, cnt: 3 }], []])
    expect(await caseStore.countReviewStatus('firm-1')).toEqual({ delivered: 10, reviewed: 3 })
  })

  test('the order of the two groups does not change the answer', async () => {
    db.execute.mockResolvedValue([[{ reviewed: 1, cnt: 3 }, { reviewed: 0, cnt: 7 }], []])
    expect(await caseStore.countReviewStatus('firm-1')).toEqual({ delivered: 10, reviewed: 3 })
  })

  test('a firm with no cases at all reads as zero of zero, not as an error', async () => {
    db.execute.mockResolvedValue([[], []])
    expect(await caseStore.countReviewStatus('firm-1')).toEqual({ delivered: 0, reviewed: 0 })
  })

  test('every case reviewed, and none reviewed, both read correctly', async () => {
    db.execute.mockResolvedValue([[{ reviewed: 1, cnt: 4 }], []])
    expect(await caseStore.countReviewStatus('f')).toEqual({ delivered: 4, reviewed: 4 })

    db.execute.mockResolvedValue([[{ reviewed: 0, cnt: 4 }], []])
    expect(await caseStore.countReviewStatus('f')).toEqual({ delivered: 4, reviewed: 0 })
  })

  test('🔴 a DB failure SURFACES in production — it never reads as zero', async () => {
    db.execute.mockRejectedValue(new Error('connection lost'))
    await expect(caseStore.countReviewStatus('firm-1')).rejects.toThrow('connection lost')
  })

  test('no firm id counts nothing, and never asks the database', async () => {
    expect(await caseStore.countReviewStatus(null)).toEqual({ delivered: 0, reviewed: 0 })
    expect(await caseStore.countReviewStatus('')).toEqual({ delivered: 0, reviewed: 0 })
    expect(db.execute).not.toHaveBeenCalled()
  })
})

describe('countReviewStatus — the dev fallback', () => {
  const fs = require('fs')
  const path = require('path')
  const os = require('os')
  const DEV_FILE = path.join(os.tmpdir(), `va-test-counts-${process.pid}.json`)

  let caseStore

  const write = rows => fs.writeFileSync(DEV_FILE, JSON.stringify(rows, null, 2))
  const clean = () => { try { removeFile(DEV_FILE) } catch (e) { /* not there — fine */ } }

  beforeEach(() => {
    jest.resetModules()
    clean()
    process.env.NODE_ENV = 'development'
    process.env.CASE_DEV_FILE = DEV_FILE
    jest.doMock('../../server/utils/db', () => ({ execute: jest.fn(() => Promise.reject(new Error('no db here'))) }))
    caseStore = require('../../server/utils/caseStore')
  })

  afterAll(() => { clean(); delete process.env.CASE_DEV_FILE })

  test('counts the JSON file the same way the SQL counts the table', async () => {
    write([
      { id: '1', firmId: 'f1', review: { reviewedAt: '2026-09-01T00:00:00Z' } },
      { id: '2', firmId: 'f1', review: { wentWell: 'typed but never submitted' } }, // no reviewedAt
      { id: '3', firmId: 'f1' },
      { id: '4', firmId: 'f2', review: { reviewedAt: '2026-09-01T00:00:00Z' } } // another firm
    ])
    expect(await caseStore.countReviewStatus('f1')).toEqual({ delivered: 3, reviewed: 1 })
  })

  test('counts a private case too — visibility is not the boundary, the firm is', async () => {
    write([
      { id: '1', firmId: 'f1', visibility: 'private', review: { reviewedAt: '2026-09-01T00:00:00Z' } },
      { id: '2', firmId: 'f1', visibility: 'shared' }
    ])
    expect(await caseStore.countReviewStatus('f1')).toEqual({ delivered: 2, reviewed: 1 })
  })

  test('a missing dev file is zero of zero, not a crash', async () => {
    clean()
    expect(await caseStore.countReviewStatus('f1')).toEqual({ delivered: 0, reviewed: 0 })
  })
})

'use strict'

/**
 * @file Item 4.17 — a screen served from a dev fallback has to SAY so.
 *
 * 🔴 THE DEFECT. Mike opened the Mentor Hub's Advisory Distinctions tab and saw **one**
 * distinction where the shipped set is **67**. Nothing was broken. A local, gitignored
 * `data/dev-platform-distinctions.json` holding a single stale test row is deliberately
 * preferred over the committed seed when there is no database — and it SHADOWED all 67,
 * with nothing on screen saying so. It cost most of a session to diagnose, because a
 * screen served from a dev fallback looks exactly like a screen served from the real set.
 *
 * WHAT IS AND IS NOT BEING CHANGED. Which rows win is UNCHANGED and these tests pin that
 * — the dev fallback is a good affordance and removing it would break local development.
 * What is new is that the loader now reports WHERE the rows came from, so the screen can
 * tell a reader what they are looking at.
 *
 * ⚠ These assert the `source` contract, not the wording of any notice. The sentence on
 * screen is a label a person reads in five seconds; the contract underneath it is what no
 * one can see, and is what the next change could silently break.
 */

// A surgical fs mock: the module under test reads exactly one file, and a developer's
// real local dev file must never decide whether this suite passes (the lesson from
// platformDistinctions.test.js, fixed 2026-06-29).
let mockDevFileContents = null
jest.mock('fs', () => {
  const real = jest.requireActual('fs')
  return {
    ...real,
    readFileSync: (file, enc) => {
      if (String(file) === require('path').resolve(process.cwd(), 'data/dev-platform-distinctions.json')) {
        if (mockDevFileContents === null) { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) }
        return mockDevFileContents
      }
      return real.readFileSync(file, enc)
    }
  }
})

const {
  loadPlatformDistinctionsWithSource,
  loadPlatformDistinctions,
  SEED_PLATFORM_ROWS
} = require('../../server/utils/platformDistinctions')

/** A connection-level failure: no sqlState, so the dev fallback is allowed to run. */
const noDatabase = () => Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' })

/** A live server REFUSING the statement: carries sqlState, so the fallback must not run. */
const refused = () => Object.assign(new Error('FK constraint'), {
  code: 'ER_NO_REFERENCED_ROW_2', errno: 1452, sqlState: '23000'
})

beforeEach(() => { mockDevFileContents = null })

describe('the loader says where the rows came from', () => {
  test('the mentor\'s stored set reports "store" and shadows nothing', async () => {
    const stored = [{ id: 'pd-1', domain: 'profit' }]
    const res = await loadPlatformDistinctionsWithSource(() => Promise.resolve(stored))

    expect(res.source).toBe('store')
    expect(res.rows).toBe(stored)
    expect(res.shadowed).toBe(0)
  })

  test('nothing stored yet reports "seed" — the committed rows, which are correct', async () => {
    const res = await loadPlatformDistinctionsWithSource(() => Promise.resolve(null))

    expect(res.source).toBe('seed')
    expect(res.rows).toBe(SEED_PLATFORM_ROWS)
    expect(res.shadowed).toBe(0)
  })

  test('a mentor who genuinely cleared the set gets "store", not a fallback', async () => {
    // A stored EMPTY array is a real answer, not a miss. If this fell through to the
    // seed, clearing the set would be impossible and 67 rows would reappear by magic.
    const res = await loadPlatformDistinctionsWithSource(() => Promise.resolve([]))

    expect(res.source).toBe('store')
    expect(res.rows).toEqual([])
  })

  test('🔴 the dev file reports "dev-file" AND how many rows it is hiding', async () => {
    // The exact shape of Mike's session: one stale row where 67 are shipped.
    mockDevFileContents = JSON.stringify([{ id: 'pd-999', domain: 'profit', description: 'stale test row' }])

    const res = await loadPlatformDistinctionsWithSource(() => Promise.reject(noDatabase()))

    expect(res.source).toBe('dev-file')
    expect(res.rows).toHaveLength(1)
    // `shadowed` is the number that makes the warning useful. "Showing dev data" alone
    // does not tell a reader that 67 real rows are sitting behind it.
    expect(res.shadowed).toBe(SEED_PLATFORM_ROWS.length)
    expect(res.shadowed).toBeGreaterThan(1)
  })

  test('no database and no dev file falls to the seed, and says so', async () => {
    const res = await loadPlatformDistinctionsWithSource(() => Promise.reject(noDatabase()))

    expect(res.source).toBe('seed')
    expect(res.rows).toBe(SEED_PLATFORM_ROWS)
    expect(res.shadowed).toBe(0)
  })

  test('a live database REFUSING the read still throws — unchanged', async () => {
    // The serious guarantee this file must not weaken: a stray dev file on a production
    // box must never be served as the mentor's live set, and every mentor edit is a
    // read-modify-write, so answering a failed read with rows would let one edit
    // overwrite the whole authored set.
    mockDevFileContents = JSON.stringify([{ id: 'pd-999' }])

    await expect(loadPlatformDistinctionsWithSource(() => Promise.reject(refused())))
      .rejects.toThrow('FK constraint')
  })
})

describe('the rows that win are exactly what they were before', () => {
  // The wrapper the five existing callers use must be a pure pass-through. If these two
  // ever disagree, the screen's warning describes a different load than the engine ran.
  test.each([
    ['stored rows', () => Promise.resolve([{ id: 'pd-1' }])],
    ['nothing stored', () => Promise.resolve(null)],
    ['an empty stored set', () => Promise.resolve([])],
    ['no database', () => Promise.reject(noDatabase())]
  ])('%s — wrapper and source-reporting loader return identical rows', async (_label, loader) => {
    const withSource = await loadPlatformDistinctionsWithSource(loader)
    const plain = await loadPlatformDistinctions(loader)

    expect(plain).toEqual(withSource.rows)
  })

  test('the dev file still WINS over the seed — the affordance is not being removed', async () => {
    mockDevFileContents = JSON.stringify([{ id: 'pd-999' }])
    const rows = await loadPlatformDistinctions(() => Promise.reject(noDatabase()))

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('pd-999')
  })
})

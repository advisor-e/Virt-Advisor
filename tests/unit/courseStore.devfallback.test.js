'use strict'

// Exercises courseStore's DEV/TEST-ONLY JSON fallback (CB-16/17 Stage A —
// reached when the DB is unavailable and not in production). Locks: round-trip,
// the duplicate-id rejection that mirrors the DB primary key, owner-only
// scoping (the one exception: the CB-07 firm-shared read, outline-only),
// whole-document updates, delete, and the input sanitisers.
//
// Uses an ISOLATED temp dev file (via COURSE_DEV_FILE) rather than the shared
// data/dev-courses.json — hermetic `npm test`, same convention as
// caseStore.devfallback.test.js.

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring courseStore — DEV_COURSES_FILE is resolved at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-dev-courses-${process.pid}.json`)
process.env.COURSE_DEV_FILE = DEV_FILE

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const courseStore = require('../../server/utils/courseStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }

const OUTLINE = {
  title: 'Selling Valuation Services',
  topic: 'Positioning and selling',
  intensity: 'consistent',
  totalSessions: 2,
  sessions: [
    { id: 1, title: 'S1', focus: 'Basics', resources: [], objectives: [], estimatedMinutes: 30 },
    { id: 2, title: 'S2', focus: 'Practice', resources: [], objectives: [], estimatedMinutes: 30 }
  ]
}

const base = { advisorId: 'a1', firmId: 'f1', outline: OUTLINE }

beforeEach(clean)
afterAll(clean)

describe('courseStore dev fallback (CB-16/17 Stage A)', () => {
  test('create then list round-trips, preserving a supplied id (migration keeps ids)', async () => {
    const saved = await courseStore.create({ ...base, id: 'course-123-abc' })
    expect(saved.id).toBe('course-123-abc')
    expect(saved.status).toBe('active')
    expect(saved.visibility).toBe('private')
    expect(saved.outline.title).toBe('Selling Valuation Services')

    const mine = await courseStore.listForAdvisor('a1')
    expect(mine).toHaveLength(1)
    expect(mine[0].outline.sessions).toHaveLength(2)
  })

  test('rejects a duplicate id (mirrors the DB primary key — migration re-runs never duplicate)', async () => {
    await courseStore.create({ ...base, id: 'dup' })
    await expect(courseStore.create({ ...base, id: 'dup' })).rejects.toThrow(/duplicate/)
    expect(await courseStore.listForAdvisor('a1')).toHaveLength(1)
  })

  test('courses are owner-only: a colleague (even same firm) sees nothing', async () => {
    await courseStore.create({ ...base, id: 'c1', visibility: 'firm' })
    expect(await courseStore.listForAdvisor('a2')).toHaveLength(0)
    expect(await courseStore.getOwn('c1', 'a2')).toBeNull()
    expect(await courseStore.getOwn('c1', 'a1')).not.toBeNull()
  })

  test("CB-07 shared read: same-firm teammates see a 'firm' course as an outline-only summary; private, own, and cross-firm courses never appear", async () => {
    await courseStore.create({ ...base, id: 'shared-1', visibility: 'firm', progress: [{ status: 'complete', quizScore: 88 }], designHistory: [{ role: 'user', content: 'my private answers' }] })
    await courseStore.create({ ...base, id: 'private-1', visibility: 'private' })
    await courseStore.create({ advisorId: 'other-firm-adv', firmId: 'f2', outline: OUTLINE, id: 'foreign-1', visibility: 'firm' })

    // A same-firm teammate sees only the shared one, stripped to the summary.
    const shared = await courseStore.listSharedForFirm('f1', 'a2')
    expect(shared).toHaveLength(1)
    expect(shared[0].id).toBe('shared-1')
    expect(shared[0].authorAdvisorId).toBe('a1')
    expect(shared[0].outline.title).toBe('Selling Valuation Services')
    expect(shared[0].progress).toBeUndefined()
    expect(shared[0].designHistory).toBeUndefined()

    // The author does not see their own course in the shared list.
    expect(await courseStore.listSharedForFirm('f1', 'a1')).toHaveLength(0)
    // Another firm sees nothing of f1's sharing.
    expect((await courseStore.listSharedForFirm('f2', 'a2')).map(c => c.id)).toEqual(['foreign-1'])
  })

  test('CB-07 getShared is firm-bounded and visibility-gated', async () => {
    await courseStore.create({ ...base, id: 'shared-1', visibility: 'firm' })
    await courseStore.create({ ...base, id: 'private-1', visibility: 'private' })

    expect(await courseStore.getShared('shared-1', 'f1')).not.toBeNull()
    expect(await courseStore.getShared('shared-1', 'f2')).toBeNull() // cross-firm
    expect(await courseStore.getShared('private-1', 'f1')).toBeNull() // not shared
  })

  test('create without an outline is refused', async () => {
    await expect(courseStore.create({ advisorId: 'a1', firmId: 'f1' })).rejects.toThrow(/outline/)
  })

  test('a whole-document update replaces progress and status, owner-scoped', async () => {
    await courseStore.create({ ...base, id: 'u1' })
    const progress = [
      { status: 'complete', quizScore: 80, completedAt: '2026-07-15T00:00:00Z', quizResults: [], notes: 'good session' },
      { status: 'pending', quizScore: null, completedAt: null }
    ]
    expect(await courseStore.updateOwn('u1', 'a1', { status: 'paused', progress })).toBe(true)
    const saved = await courseStore.getOwn('u1', 'a1')
    expect(saved.status).toBe('paused')
    expect(saved.progress[0].notes).toBe('good session')

    // Not the owner → no update.
    expect(await courseStore.updateOwn('u1', 'a2', { status: 'complete' })).toBe(false)
    // Empty patch → no update.
    expect(await courseStore.updateOwn('u1', 'a1', {})).toBe(false)
  })

  test('delete is owner-scoped', async () => {
    await courseStore.create({ ...base, id: 'd1' })
    expect(await courseStore.remove('d1', 'a2')).toBe(false)
    expect(await courseStore.remove('d1', 'a1')).toBe(true)
    expect(await courseStore.listForAdvisor('a1')).toHaveLength(0)
  })
})

describe('courseStore sanitisers', () => {
  test('status and visibility fail safe on junk', () => {
    expect(courseStore.safeStatus('exploded')).toBe('active')
    expect(courseStore.safeStatus('paused')).toBe('paused')
    expect(courseStore.safeVisibility('everyone-on-earth')).toBe('private')
    expect(courseStore.safeVisibility('firm')).toBe('firm')
  })

  test('sanitiseProgress keeps objects only, caps notes length', () => {
    const out = courseStore.sanitiseProgress([
      { status: 'complete', notes: 'x'.repeat(30000) },
      'garbage', null, ['array'],
      { status: 'pending' }
    ])
    expect(out).toHaveLength(2)
    expect(out[0].notes.length).toBe(20000)
    expect(courseStore.sanitiseProgress('not an array')).toEqual([])
  })

  test('sanitiseDesignHistory keeps role/content pairs, caps content, null when empty', () => {
    const out = courseStore.sanitiseDesignHistory([
      { role: 'assistant', content: 'q'.repeat(9000) },
      { role: 'user', content: 'my answer' },
      { role: 'system', content: 'role coerced to user' },
      { content: 42 }, null
    ])
    expect(out).toHaveLength(3)
    expect(out[0].content.length).toBe(8000)
    expect(out[2].role).toBe('user')
    expect(courseStore.sanitiseDesignHistory([])).toBeNull()
    expect(courseStore.sanitiseDesignHistory('nope')).toBeNull()
  })

  test('generateId is a well-formed v4 uuid (Node 14.15-safe)', () => {
    expect(courseStore.generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

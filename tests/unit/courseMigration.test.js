'use strict'

// CB-16/17 Stage D: the one-time localStorage → server course migration
// (hardened cases pattern, 2026-07-10). Locks: per-advisor completion flag set
// ONLY when everything migrated; partial failure resumes without re-sending;
// the server's 409 duplicate answer counts as migrated; the legacy browser
// copy is never deleted; other advisors' legacy courses are never sent.

// Minimal localStorage shim (jest testEnvironment is node).
const _store = new Map()
global.localStorage = {
  getItem: k => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: k => _store.delete(k)
}

global.fetch = jest.fn()

const { migrateLegacyCourses } = require('../../utils/courses')

const OUTLINE = { title: 'T', sessions: [{ id: 1, title: 'S1', focus: 'F' }] }

function legacyCourse (id, advisorId = 'a1') {
  return { id, advisorId, status: 'active', visibility: 'private', outline: OUTLINE, progress: [] }
}

function seedLegacy (courses) {
  _store.set('va_courses', JSON.stringify({ courses }))
}

function okResponse (course) {
  return { ok: true, json: () => Promise.resolve({ success: true, course }) }
}

function errorResponse (status) {
  return { ok: false, status, json: () => Promise.resolve({ success: false }) }
}

beforeEach(() => {
  _store.clear()
  fetch.mockReset()
})

describe('migrateLegacyCourses (CB-16/17 Stage D)', () => {
  test('migrates the advisor\'s legacy courses, preserving ids, and sets the completion flag', async () => {
    seedLegacy([legacyCourse('c1'), legacyCourse('c2')])
    fetch.mockResolvedValue(okResponse({ id: 'x' }))

    const result = await migrateLegacyCourses('token', 'a1')

    expect(result).toMatchObject({ migrated: 2, total: 2, failed: 0, complete: true })
    expect(fetch).toHaveBeenCalledTimes(2)
    const sentIds = fetch.mock.calls.map(c => JSON.parse(c[1].body).id).sort()
    expect(sentIds).toEqual(['c1', 'c2'])
    expect(_store.get('va_courses_migrated_at::a1')).toBeTruthy()
    // The legacy copy is NEVER deleted.
    expect(JSON.parse(_store.get('va_courses')).courses).toHaveLength(2)
  })

  test('a completed migration never runs again', async () => {
    seedLegacy([legacyCourse('c1')])
    _store.set('va_courses_migrated_at::a1', '2026-07-15T00:00:00Z')

    const result = await migrateLegacyCourses('token', 'a1')
    expect(result.skipped).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  test("another advisor's legacy courses are never sent, and don't block completion", async () => {
    seedLegacy([legacyCourse('mine', 'a1'), legacyCourse('theirs', 'a2')])
    fetch.mockResolvedValue(okResponse({ id: 'x' }))

    const result = await migrateLegacyCourses('token', 'a1')

    expect(result).toMatchObject({ migrated: 1, total: 1, complete: true })
    expect(JSON.parse(fetch.mock.calls[0][1].body).id).toBe('mine')
    // a2's flag untouched — their courses ride their own login.
    expect(_store.get('va_courses_migrated_at::a2')).toBeUndefined()
  })

  test('a partial failure leaves the flag unset and a retry resumes without re-sending', async () => {
    seedLegacy([legacyCourse('ok1'), legacyCourse('fails')])
    fetch
      .mockResolvedValueOnce(okResponse({ id: 'ok1' }))
      .mockResolvedValueOnce(errorResponse(502))

    const first = await migrateLegacyCourses('token', 'a1')
    expect(first).toMatchObject({ migrated: 1, failed: 1, complete: false })
    expect(_store.get('va_courses_migrated_at::a1')).toBeUndefined()

    // Retry: only the failed course is re-sent.
    fetch.mockReset()
    fetch.mockResolvedValue(okResponse({ id: 'fails' }))
    const second = await migrateLegacyCourses('token', 'a1')

    expect(second).toMatchObject({ migrated: 1, complete: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetch.mock.calls[0][1].body).id).toBe('fails')
    expect(_store.get('va_courses_migrated_at::a1')).toBeTruthy()
  })

  test('the server saying "duplicate" (409) counts as migrated', async () => {
    seedLegacy([legacyCourse('already-there')])
    fetch.mockResolvedValue(errorResponse(409))

    const result = await migrateLegacyCourses('token', 'a1')
    expect(result).toMatchObject({ migrated: 0, failed: 0, complete: true })
    expect(_store.get('va_courses_migrated_at::a1')).toBeTruthy()
  })

  test('no legacy data at all completes immediately without network calls', async () => {
    const result = await migrateLegacyCourses('token', 'a1')
    expect(result).toMatchObject({ migrated: 0, total: 0, complete: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('courses without an outline (corrupt legacy rows) are ignored, not sent', async () => {
    seedLegacy([{ id: 'broken', advisorId: 'a1', status: 'active' }, legacyCourse('good')])
    fetch.mockResolvedValue(okResponse({ id: 'good' }))

    const result = await migrateLegacyCourses('token', 'a1')
    expect(result).toMatchObject({ migrated: 1, total: 1, complete: true })
  })

  test('missing advisor id skips safely', async () => {
    seedLegacy([legacyCourse('c1')])
    const result = await migrateLegacyCourses('token', null)
    expect(result.skipped).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})

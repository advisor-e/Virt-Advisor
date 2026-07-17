'use strict'

// Regression tests for the legacy-case migration (#13). The old version set the
// one-time completion flag UNCONDITIONALLY, so if the very first run failed (the
// common production case: migration runs before the real auth token resolves),
// every un-migrated case was permanently abandoned. The migration must now:
//  - only mark COMPLETE when every case has actually migrated,
//  - track migrated ids and skip them on retry (never duplicate),
//  - leave failures retryable on the next load.

const { migrateLegacyCases } = require('../../utils/cases')

const FLAG = 'va_case_studies_migrated_at'
const IDS = 'va_case_studies_migrated_ids'
const LEGACY = 'va_case_studies'

function makeLocalStorage (initial) {
  const store = new Map(Object.entries(initial || {}))
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) }
  }
}

const CASES = [{ id: 'c1', title: 'Case one' }, { id: 'c2', title: 'Case two' }]

describe('migrateLegacyCases (#13)', () => {
  let ls
  beforeEach(() => {
    ls = makeLocalStorage({ [LEGACY]: JSON.stringify(CASES) })
    global.localStorage = ls
  })
  afterEach(() => { delete global.localStorage; delete global.fetch })

  test('all-fail first run does NOT set the completion flag (stays retryable)', async () => {
    global.fetch = () => ({ ok: false, status: 500, json: () => ({}) })
    const r = await migrateLegacyCases('tok')
    expect(r.migrated).toBe(0)
    expect(r.failed).toBe(2)
    expect(r.complete).toBe(false)
    expect(ls.getItem(FLAG)).toBeNull() // NOT flagged done — will retry next load
  })

  test('retry after a partial failure resumes without re-sending migrated cases', async () => {
    // First run: c1 succeeds, c2 fails.
    global.fetch = (url, opts) => {
      const body = JSON.parse(opts.body)
      const ok = body.id === 'c1'
      return { ok, status: ok ? 200 : 500, json: () => ({ case: body }) }
    }
    let r = await migrateLegacyCases('tok')
    expect(r.migrated).toBe(1)
    expect(r.failed).toBe(1)
    expect(r.complete).toBe(false)
    expect(ls.getItem(FLAG)).toBeNull()
    expect(JSON.parse(ls.getItem(IDS))).toEqual(['c1']) // progress persisted

    // Second run: all succeed. c1 must be SKIPPED (not re-POSTed), only c2 retried.
    const posted = []
    global.fetch = (url, opts) => {
      const body = JSON.parse(opts.body)
      posted.push(body.id)
      return { ok: true, status: 200, json: () => ({ case: body }) }
    }
    r = await migrateLegacyCases('tok')
    expect(posted).toEqual(['c2']) // c1 not re-sent
    expect(r.complete).toBe(true)
    expect(ls.getItem(FLAG)).not.toBeNull() // now flagged done
    expect(ls.getItem(IDS)).toBeNull() // tidied up on completion
  })

  test('once complete, a later call no-ops (does not touch the backend)', async () => {
    global.fetch = (url, opts) => ({ ok: true, status: 200, json: () => ({ case: JSON.parse(opts.body) }) })
    await migrateLegacyCases('tok') // completes and sets the flag

    let called = false
    global.fetch = () => { called = true; return { ok: true, status: 200, json: () => ({ case: {} }) } }
    const r = await migrateLegacyCases('tok')
    expect(r.skipped).toBe(true)
    expect(called).toBe(false)
  })

  test('no legacy cases marks complete immediately', async () => {
    ls = makeLocalStorage({}) // no legacy store
    global.localStorage = ls
    global.fetch = () => ({ ok: true, status: 200, json: () => ({}) })
    const r = await migrateLegacyCases('tok')
    expect(r.total).toBe(0)
    expect(r.complete).toBe(true)
    expect(ls.getItem(FLAG)).not.toBeNull()
  })
})

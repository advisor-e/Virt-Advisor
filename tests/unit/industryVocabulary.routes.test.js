'use strict'

/**
 * GET /api/advisor/industry-vocabulary — the words the intake offers as the advisor
 * types (item 4.87 T022a). Two things are pinned: the route never breaks a session
 * (always 200, an empty list on any failure — the staircase read's rule), and the
 * wiring exists in BOTH files, because on 2026-09-02 and again on 2026-09-11 a route
 * that answered 200 directly was a 404 in the browser for want of one proxy line.
 */

jest.mock('../../server/utils/outcomeContribute', () => {
  const real = jest.requireActual('../../server/utils/outcomeContribute')
  return { industryVocabulary: real.industryVocabulary, platformTemplates: jest.fn() }
})

const fs = require('fs')
const path = require('path')
const { platformTemplates } = require('../../server/utils/outcomeContribute')
const { get } = require('../../server/routes/industryVocabulary')

function makeRes () {
  return { _status: null, _body: null, send (status, body) { this._status = status; this._body = body } }
}
const req = () => ({ firmId: 'firm-test-123', userEmail: 'adviser@testfirm.com' })

describe('GET /api/advisor/industry-vocabulary', () => {
  beforeEach(() => { platformTemplates.mockReset(); jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { console.error.mockRestore() })

  test('answers the platform library\'s vocabulary, sorted and unique, lowercase', async () => {
    platformTemplates.mockResolvedValue([
      { title: 'Plumber', tags: ['trades', 'Plumbing'] },
      { title: 'Cafe', tags: ['hospitality'] },
      { title: 'Cafe' } // a duplicate title adds nothing
    ])
    const res = makeRes()
    await get(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.words).toEqual(['cafe', 'hospitality', 'plumber', 'plumbing', 'trades'])
  })

  test('it is the same list the pool accepts — the stop words the pool drops are not offered', async () => {
    platformTeplatesWith([{ title: 'The Business Shop Limited', tags: [] }])
    const res = makeRes()
    await get(req(), res)
    // "business", "shop", "limited" are stop-worded for the industry matcher; "the" is under four letters.
    expect(res._body.words).toEqual([])
  })

  test('an empty library answers 200 with an empty list', async () => {
    platformTemplates.mockResolvedValue([])
    const res = makeRes()
    await get(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ words: [] })
  })

  test('a store failure answers 200 with an empty list and logs — the chat carries on', async () => {
    platformTemplates.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = makeRes()
    await get(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ words: [] })
    expect(console.error).toHaveBeenCalled()
    // Never a stack trace or the raw store error in the body.
    expect(JSON.stringify(res._body)).not.toContain('ECONNREFUSED')
  })

  function platformTeplatesWith (templates) { platformTemplates.mockResolvedValue(templates) }
})

describe('the wiring — a route the browser is never allowed to ask for is not a route', () => {
  const root = path.join(__dirname, '../../')
  const read = f => fs.readFileSync(path.join(root, f), 'utf8')

  test('mounted on the backend behind firmAuth, as the staircase read is', () => {
    expect(read('server/restify-server.js'))
      .toMatch(/server\.get\('\/api\/advisor\/industry-vocabulary', firmAuth, industryVocabularyRoute\.get\)/)
  })

  test('registered on the Nuxt proxy through the shared thin proxy, ABOVE the SSE entry', () => {
    const lines = read('nuxt.config.js').split('\n')
    const ours = lines.findIndex(l => l.includes("path: '/api/advisor/industry-vocabulary'"))
    const sse = lines.findIndex(l => l.includes("path: '/api/advisor', handler"))
    expect(ours).toBeGreaterThan(-1)
    expect(lines[ours]).toContain('apiProxy.js')
    // The SSE proxy forwards only POST /query and calls next() for anything else, so a
    // GET mounted below it falls through to a Nuxt 404 — the /api/advisor/staircase rule.
    expect(sse).toBeGreaterThan(ours)
  })

  test('the screen asks for the proxy path with the session token, and reads `words`', () => {
    const src = read('components/VirtualAdvisor.vue')
    expect(src).toMatch(/fetch\('\/api\/advisor\/industry-vocabulary'/)
    expect(src).toMatch(/Array\.isArray\(data\.words\)/)
  })
})

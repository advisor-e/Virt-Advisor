'use strict'

/**
 * Imported concepts inside the Strategy Planner — item 15.20, piece 3.
 *
 * WHAT UAT CANNOT SEE: that a firm reaches a concept another firm imported, by guessing its id;
 * that an entry is saved into a box the imported concept does not have; that a menu fails to
 * load at all because the firm's own concepts could not be read; or that the summary of a
 * recorded section is written under something other than the manager's box labels (Mike's
 * ruling of 2026-09-29). The overlay is an in-memory stand-in holding real records.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  deleteFirmConfigsByPrefix: jest.fn()
}))
jest.mock('../../server/utils/strategySessionStore', () => ({
  getSession: jest.fn(),
  setScope: jest.fn(),
  saveEntry: jest.fn(),
  openField: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const store = require('../../server/utils/strategySessionStore')
const routes = require('../../server/routes/strategyPlanner')
const ic = require('../../server/utils/importedConcepts')
const conceptSummary = require('../../server/utils/conceptSummary')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const PAGE = { svg: '<svg/>', width: 960, height: 540, title: 'Our Client Charter' }
const RECORD = ic.buildRecord('im-m1',
  { name: 'Our Client Charter', planningDomain: 'strategic-orientation', helpsClientTo: 'Keep promises' },
  [PAGE, PAGE], PAGE,
  [{ label: 'Our core values', x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, { label: 'In practice', x: 0.5, y: 0.1, w: 0.3, h: 0.3 }],
  'mentor@x', new Date('2026-09-29T00:00:00Z'))
const OTHER_FIRMS = Object.assign({}, RECORD, { id: 'im-f1', name: 'Firm B only' })

let held

function makeRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}
const req = over => Object.assign({ firmId: 'firm-a', advisorId: 'adv-1', query: {}, params: {}, body: {} }, over)
const codeOf = res => res._body && res._body.error && res._body.error.code
async function call (handler, over) {
  const res = makeRes()
  await handler(req(over), res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  held = {
    [PLATFORM_SCOPE]: { 'im-m1:record': RECORD },
    'firm-b': { 'im-f1:record': OTHER_FIRMS }
  }
  overlay.loadFirmConfigsByPrefix.mockImplementation(scope => Promise.resolve(Object.assign({}, held[scope])))
  store.getSession.mockResolvedValue({ id: 7, firmId: 'firm-a' })
  store.setScope.mockResolvedValue(true)
  store.saveEntry.mockResolvedValue(true)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })

describe('the scope menu', () => {
  test('a concept the mentor imported joins the LAST panel of its section, marked as imported', async () => {
    const res = await call(routes.getConcepts)
    const so2 = res._body.decks.find(d => d.id === 'strategic-orientation-2')
    const row = so2.concepts[so2.concepts.length - 1]
    expect(row).toMatchObject({ id: 'im-m1', name: 'Our Client Charter', source: 'imported', page: null, deck: 'strategic-orientation-2' })
    expect(res._body.conceptCount).toBe(49)
    expect(res._body.decks.find(d => d.id === 'strategic-orientation-1').concepts.some(c => c.id === 'im-m1')).toBe(false)
  })

  test('🔴 another firm’s imported concept never appears on this firm’s menu', async () => {
    const res = await call(routes.getConcepts)
    const ids = [].concat(...res._body.decks.map(d => d.concepts.map(c => c.id)))
    expect(ids).not.toContain('im-f1')
  })

  test('🔴 if the firm’s concepts cannot be read, Mike’s own still load — the advisor is never blocked', async () => {
    const e = new Error('ER_NO_SUCH_TABLE')
    e.sqlState = '42S02'
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(e)
    const res = await call(routes.getConcepts)
    expect(res._status).toBe(200)
    expect(res._body.conceptCount).toBe(48)
  })
})

describe('the capture card', () => {
  test('carries the teaching pages and the labelled boxes, in the order they were drawn', async () => {
    const res = await call(routes.getConceptCapture, { params: { id: 'im-m1' } })
    expect(res._status).toBe(200)
    expect(res._body.capture.form).toBe(ic.IMPORTED_FORM)
    expect(res._body.capture.teachingPages).toHaveLength(2)
    expect(res._body.capture.fields.map(f => [f.key, f.columnLabel])).toEqual([['t0r0c0', 'Our core values'], ['t0r1c0', 'In practice']])
    expect(res._body.helpsClientTo).toBe('Keep promises')
  })

  test('🔴 another firm’s concept is 404 — the same as one that does not exist', async () => {
    const res = await call(routes.getConceptCapture, { params: { id: 'im-f1' } })
    expect(res._status).toBe(404)
    expect(codeOf(res)).toBe('NO_CONCEPT')
  })
})

describe('saving', () => {
  test('a scope naming an imported concept this firm can see is saved', async () => {
    const res = await call(routes.putScope, { params: { id: '7' }, body: { domains: [], frameworks: ['im-m1', 'boston-model'] } })
    expect(res._status).toBe(200)
    expect(store.setScope.mock.calls[0][2].frameworks).toEqual(['im-m1', 'boston-model'])
  })

  test('🔴 a scope naming another firm’s concept is refused and nothing is saved', async () => {
    const res = await call(routes.putScope, { params: { id: '7' }, body: { frameworks: ['im-f1'] } })
    expect(codeOf(res)).toBe('UNKNOWN_FRAMEWORK')
    expect(store.setScope).not.toHaveBeenCalled()
  })

  test('an entry into one of the concept’s own boxes is saved', async () => {
    const res = await call(routes.putEntries, { params: { id: '7' }, body: { entries: [{ frameworkId: 'im-m1', fieldKey: 't0r1c0', value: 'Honesty' }] } })
    expect(res._status).toBe(200)
    expect(store.saveEntry).toHaveBeenCalledTimes(1)
  })

  test('🔴 an entry into a box the concept does not have, or into another firm’s concept, is refused', async () => {
    for (const entry of [{ frameworkId: 'im-m1', fieldKey: 't0r2c0' }, { frameworkId: 'im-m1', fieldKey: 't1r0c0' }, { frameworkId: 'im-f1', fieldKey: 't0r0c0' }]) {
      const res = await call(routes.putEntries, { params: { id: '7' }, body: { entries: [Object.assign({ value: 'x' }, entry)] } })
      expect(codeOf(res)).toBe('UNKNOWN_FIELD')
    }
    expect(store.saveEntry).not.toHaveBeenCalled()
  })

  test('🔴 the timeline takes the same boxes the save does, and refuses the same ones', async () => {
    // Found in a browser on 2026-09-29: the save accepted an imported box and the timeline — which
    // Decision 11 uses to place spoken words — refused it, silently. One check now serves both.
    store.openField.mockResolvedValue(true)
    const ok = await call(routes.postTimeline, { params: { id: '7' }, body: { frameworkId: 'im-m1', fieldKey: 't0r0c0' } })
    expect(ok._status).toBe(200)
    const bad = await call(routes.postTimeline, { params: { id: '7' }, body: { frameworkId: 'im-f1', fieldKey: 't0r0c0' } })
    expect(codeOf(bad)).toBe('UNKNOWN_FIELD')
    expect(store.openField).toHaveBeenCalledTimes(1)
  })
})

test('🔴 a recorded section’s summary headings are the manager’s box labels — Mike, 2026-09-29', () => {
  expect(conceptSummary.headingsFor({ name: RECORD.name }, ic.captureOf(RECORD), 'fallback'))
    .toEqual(['Our core values', 'In practice'])
})

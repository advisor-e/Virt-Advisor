/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmTriggerWorkbench = require('~/components/firm/FirmTriggerWorkbench.vue').default

/**
 * The screen half of the trigger workbench (ACTIONS #trigger-vocabulary-sweep,
 * Step 2). The backend landed on 2026-08-01 with NO surface at all, so nothing
 * about it had ever been seen.
 *
 * What is worth testing here is not "does it render" but the three things that
 * would quietly mislead a firm manager if they broke:
 *
 *   1. The tool must never show a raw table id. The preview route names the
 *      table a conversation was TAKEN FROM by its internal id
 *      (`staff_performance`); showing that is showing a database key.
 *   2. A stale preview must not survive the parent opening a different table —
 *      that attributes one table's consequences to another, which is the exact
 *      confusion this tool exists to remove.
 *   3. The server's honest limits must reach the screen. `notMeasured` and
 *      `corpusLimit` are worded on the server precisely so every surface says
 *      the same thing; a screen that dropped them would read as "nothing else
 *      affects this", which is false.
 *
 * `$t()` returns the KEY (see tests/helpers/mountComponent), so assertions pin
 * WHICH message shows, not its English — the wording is Mike's to change.
 */

const PROBE_REPLY = {
  text: 'nobody knows who reports to whom',
  truncated: false,
  domains: [{ id: 'staff', label: 'Staff & People', count: 2 }],
  tables: [
    { id: 'staff_performance', name: 'Staff Performance', shape: 'nodes', score: 2, matched: ['reports to whom', 'org chart'] },
    { id: 'org_leadership', name: 'Leadership', shape: 'nodes', score: 1, matched: ['leadership'] }
  ],
  topTable: 'staff_performance',
  signals: [],
  notMeasured: [{ layer: 'advisory-distinctions', reason: 'Distinction trigger phrases are examples read by the AI.' }]
}

const PREVIEW_REPLY = {
  treeId: 'staff_performance',
  triggersBefore: 59,
  triggersAfter: 60,
  phrasesIgnored: 0,
  caps: { maxPhrases: 200, maxPhraseLength: 80, maxTextLength: 2000 },
  corpus: { size: 470, composition: { 'branch-condition': 419, 'scenario-lab': 51 } },
  corpusLimit: 'These sentences are branch conditions and Scenario Lab cases — not real advisor speech.',
  gained: [
    { id: 'lab:staff·high turnover', source: 'scenario-lab', text: 'high turnover and rehiring constantly', takenFrom: null, matched: ['rehiring'] },
    { id: 'valuation#3', source: 'branch-condition', text: 'the owner wants out', takenFrom: 'succession_planning', matched: ['owner'] }
  ],
  lost: [],
  otherMoves: [],
  unchanged: 468,
  notMeasured: [{ layer: 'advisory-distinctions', reason: 'Distinction trigger phrases are examples read by the AI.' }]
}

const TABLE = { id: 'staff_performance', label: 'Staff Performance', origin: 'platform' }
const NAMES = { staff_performance: 'Staff Performance', succession_planning: 'Succession Planning' }

function mountWorkbench (props) {
  return mountWithBuefy(FirmTriggerWorkbench, {
    propsData: Object.assign({ apiToken: 'test-token', table: null, tableNames: NAMES }, props)
  })
}

const okJson = payload => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })

afterEach(() => { delete global.fetch })

describe('Try a sentence', () => {
  it('calls the read-only probe route with the firm token, and sends nothing else', async () => {
    global.fetch = jest.fn(() => okJson(PROBE_REPLY))
    const w = mountWorkbench()

    await w.setData({ probeText: 'nobody knows who reports to whom' })
    await w.vm.runProbe()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/logic-trees/probe')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(opts.body)).toEqual({ text: 'nobody knows who reports to whom' })
  })

  it('shows every table that opened, with the exact phrases that opened it', async () => {
    global.fetch = jest.fn(() => okJson(PROBE_REPLY))
    const w = mountWorkbench()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    const text = w.text()
    // Both scoring tables, not only the winner — production walks every tree
    // that scores, so showing one would misrepresent what happens.
    expect(text).toContain('Staff Performance')
    expect(text).toContain('Leadership')
    expect(text).toContain('reports to whom')
    expect(text).toContain('org chart')
  })

  it('says so when nothing matches, rather than showing an empty space', async () => {
    global.fetch = jest.fn(() => okJson(
      Object.assign({}, PROBE_REPLY, { domains: [], tables: [], signals: [] })
    ))
    const w = mountWorkbench()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('firmTriggerWorkbench.noDomain')
    expect(w.text()).toContain('firmTriggerWorkbench.noTables')
    expect(w.text()).toContain('firmTriggerWorkbench.none')
  })

  it('prints the layer it cannot measure, in the SERVER\'s words', async () => {
    global.fetch = jest.fn(() => okJson(PROBE_REPLY))
    const w = mountWorkbench()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    // Asserted as literal server text, not a key: the whole point is that the
    // API owns this wording so no surface can state a different limit.
    expect(w.text()).toContain('Distinction trigger phrases are examples read by the AI.')
  })

  it('works with no table open — it asks about the engine, not about one table', async () => {
    global.fetch = jest.fn(() => okJson(PROBE_REPLY))
    const w = mountWorkbench({ table: null })
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('Staff Performance')
    expect(w.text()).toContain('firmTriggerWorkbench.previewNeedsTable')
  })

  it('surfaces a failure instead of leaving the last answer on screen', async () => {
    global.fetch = jest.fn(() => okJson(PROBE_REPLY))
    const w = mountWorkbench()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()

    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.vm.probeResult).toBeNull()
    expect(w.text()).toContain('firmTriggerWorkbench.checkFailed')
  })
})

describe('Try a wording change', () => {
  it('posts add/remove to the preview route for the OPEN table', async () => {
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })

    await w.setData({ addText: 'rehiring\nturnover', removeText: '  ' })
    await w.vm.runPreview()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/logic-trees/staff_performance/preview-triggers')
    expect(JSON.parse(opts.body)).toEqual({ add: ['rehiring', 'turnover'], remove: [] })
  })

  it('will not call the route with nothing proposed — the server rejects that', async () => {
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })

    expect(w.vm.hasPhrases).toBe(false)
    await w.vm.runPreview()
    expect(global.fetch).not.toHaveBeenCalled()

    await w.setData({ addText: 'rehiring' })
    expect(w.vm.hasPhrases).toBe(true)
  })

  it('names the table a conversation was TAKEN FROM — never its internal id', async () => {
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })
    await w.setData({ addText: 'rehiring' })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    const text = w.text()
    expect(text).toContain('Succession Planning')
    // The raw key must not leak onto the screen. This is the assertion that
    // would fail if nameFor() were dropped for a plain interpolation.
    expect(text).not.toContain('succession_planning')
  })

  it('distinguishes "taken from another table" from "was reaching nothing"', async () => {
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })
    await w.setData({ addText: 'rehiring' })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    // takenFrom: null must read as "no table", never as a blank — a blank would
    // look like a gain with no cost, which is the opposite of a silent theft.
    expect(w.text()).toContain('firmTriggerWorkbench.takenFromNothing')
    // ...and the one that WAS taken carries the warning, because that is the
    // expensive mistake this tool exists to catch.
    expect(w.text()).toContain('firmTriggerWorkbench.takenWarning')
    expect(w.findAll('.tw-moves li.is-taken').length).toBe(1)
  })

  it('reports phrases the server ignored rather than dropping them silently', async () => {
    global.fetch = jest.fn(() => okJson(Object.assign({}, PREVIEW_REPLY, { phrasesIgnored: 3 })))
    const w = mountWorkbench({ table: TABLE })
    await w.setData({ addText: 'rehiring' })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    const text = w.text()
    expect(text).toContain('firmTriggerWorkbench.phrasesIgnored')
    expect(text).toContain('"count":3')
    expect(text).toContain('"max":200')
  })

  it('prints the corpus limit in the SERVER\'s words', async () => {
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })
    await w.setData({ addText: 'rehiring' })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    expect(w.text()).toContain('not real advisor speech')
  })

  it('discards a preview when the parent opens a different table', async () => {
    // Without this, the consequences of editing one table stay on screen while
    // another is open — the precise misattribution this workbench exists to end.
    global.fetch = jest.fn(() => okJson(PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })
    await w.setData({ addText: 'rehiring' })
    await w.vm.runPreview()
    expect(w.vm.preview).not.toBeNull()

    await w.setProps({ table: { id: 'governance', label: 'Governance', origin: 'platform' } })
    await w.vm.$nextTick()

    expect(w.vm.preview).toBeNull()
    expect(w.vm.addText).toBe('')
    expect(w.vm.removeText).toBe('')
  })
})

describe('it cannot write anything', () => {
  it('only ever issues the two read-only routes', async () => {
    global.fetch = jest.fn(url =>
      okJson(url.includes('/probe') ? PROBE_REPLY : PREVIEW_REPLY))
    const w = mountWorkbench({ table: TABLE })

    await w.setData({ probeText: 'x', addText: 'rehiring' })
    await w.vm.runProbe()
    await w.vm.runPreview()

    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls).toEqual([
      '/api/firm-manager/logic-trees/probe',
      '/api/firm-manager/logic-trees/staff_performance/preview-triggers'
    ])
    // No save, no reset, no section move. If a future edit adds a write path to
    // this component it must be a deliberate decision, not a quiet one.
    for (const [, opts] of global.fetch.mock.calls) {
      expect(['GET', 'POST']).toContain(opts.method)
    }
    expect(urls.some(u => /save|reset|section/.test(u))).toBe(false)
  })
})

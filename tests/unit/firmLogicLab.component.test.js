/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmLogicLab = require('~/components/firm/FirmLogicLab.vue').default

/**
 * Logic-Lab (named by Mike, 2026-08-02; formerly the "trigger workbench").
 *
 * It is a Firm Manager tab in its own right, so it owns its table picker rather
 * than inheriting whichever table another screen happened to have open — which
 * is why mounting now fetches the table list.
 *
 * What is worth testing here is not "does it render" but the things that would
 * quietly mislead a firm manager if they broke:
 *
 *   1. The tool must never show a raw table id. The preview route names the
 *      table a conversation was TAKEN FROM by its internal id
 *      (`staff_performance`); showing that is showing a database key.
 *   2. A stale preview must not survive a different table being picked — that
 *      attributes one table's consequences to another, which is the exact
 *      confusion this tool exists to remove.
 *   3. The server's honest limits must reach the screen. `notMeasured` and
 *      `corpusLimit` are worded on the server precisely so every surface says
 *      the same thing; a screen that dropped them would read as "nothing else
 *      affects this", which is false.
 *
 * `$t()` returns the KEY (see tests/helpers/mountComponent), so assertions pin
 * WHICH message shows, not its English — the wording is Mike's to change.
 */

const LIST_REPLY = {
  doTheJob: [{ id: 'staff_performance', label: 'Staff Performance', count: 59, origin: 'platform' }],
  getTheJob: [{ id: 'succession_planning', label: 'Succession Planning', count: 12, origin: 'platform' }],
  getOrganised: [{ id: 'governance', label: 'Governance', count: 8, origin: 'platform' }]
}

const DETAIL_REPLY = {
  id: 'staff_performance',
  label: 'Staff Performance',
  origin: 'platform',
  entryTriggers: ['turnover', 'org chart', 'reports to whom'],
  branches: []
}

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

const okJson = payload => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })

/** Let the mount-time table fetch settle before a test asserts anything. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** A fetch mock that answers each of the three read-only routes the lab calls. */
function routedFetch (o) {
  const opts = o || {}
  return jest.fn((url) => {
    if (url === '/api/firm-manager/logic-trees') { return okJson(opts.list || LIST_REPLY) }
    if (url.includes('/probe')) { return okJson(opts.probe || PROBE_REPLY) }
    // The picked table's detail — read for the phrases it already opens on.
    if (/\/logic-trees\/[^/]+$/.test(url)) { return okJson(opts.detail || DETAIL_REPLY) }
    return okJson(opts.preview || PREVIEW_REPLY)
  })
}

/**
 * Mount, let the table list load, optionally pick a table, then clear the mock
 * so each test reads its own calls from index 0.
 * @param {{select?:string, preview?:Object, probe?:Object, keepCalls?:boolean}} [o]
 */
async function mountLab (o) {
  const opts = o || {}
  global.fetch = routedFetch(opts)
  const w = mountWithBuefy(FirmLogicLab, { propsData: { apiToken: 'test-token' } })
  await flush()
  if (opts.select) {
    await w.setData({ selectedId: opts.select })
    // Picking a table reads its existing phrases; let that settle too.
    await flush()
  }
  if (!opts.keepCalls) { global.fetch.mockClear() }
  return w
}

afterEach(() => { delete global.fetch })

describe('the table picker', () => {
  it('loads every table once, from the read-only list route', async () => {
    const w = await mountLab({ keepCalls: true })

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/logic-trees')
    expect(opts.method).toBe('GET')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    // All three master sections, flattened — a picker missing a section would
    // silently put a third of the tables out of reach.
    expect(w.vm.tables.map(t => t.id).sort()).toEqual(['governance', 'staff_performance', 'succession_planning'])
  })

  it('says so when the list cannot be loaded, rather than showing an empty dropdown', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const w = mountWithBuefy(FirmLogicLab, { propsData: { apiToken: 'test-token' } })
    await flush()
    await w.vm.$nextTick()

    // An empty picker with no message reads as "this firm has no logic tables".
    expect(w.text()).toContain('firmLogicLab.listFailed')
  })
})

describe('the two boxes — prepopulated, and a click moves a phrase across', () => {
  it('starts with the table\'s real phrases in the left box', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.vm.$nextTick()

    // Asking a firm to remove a phrase while showing them none of the existing
    // ones made every removal guesswork. This is the assertion that stops it
    // regressing.
    const chips = w.findAll('.tw-chip.is-keep')
    expect(chips.length).toBe(3)
    expect(w.text()).toContain('org chart')
    expect(w.text()).toContain('reports to whom')
  })

  it('moves a phrase to the removal box on click, and back on click', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.vm.$nextTick()

    expect(w.findAll('.tw-chip.is-keep').length).toBe(3)
    await w.findAll('.tw-chip.is-keep').at(0).trigger('click')
    expect(w.vm.removedPhrases).toEqual(['org chart'])
    expect(w.findAll('.tw-chip.is-keep').length).toBe(2)
    expect(w.findAll('.tw-chip.is-drop').length).toBe(1)

    // Back again. A removal with no way out was the defect Mike hit within
    // minutes of first using it.
    await w.findAll('.tw-chip.is-drop').at(0).trigger('click')
    expect(w.vm.removedPhrases).toEqual([])
    expect(w.findAll('.tw-chip.is-keep').length).toBe(3)
  })

  it('adds a typed phrase into the SAME left list, marked as the firm\'s own', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.vm.$nextTick()

    await w.setData({ newPhrase: 'nobody owns the call' })
    w.vm.addNewPhrase()
    await w.vm.$nextTick()

    expect(w.vm.addedPhrases).toEqual(['nobody owns the call'])
    expect(w.vm.newPhrase).toBe('')
    const own = w.findAll('.tw-chip.is-new').wrappers
    expect(own.length).toBe(1)
    expect(own[0].text()).toContain('nobody owns the call')
  })

  it('refuses to add a phrase the table already carries', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.vm.$nextTick()

    // The server would count the duplicate as "ignored", which reads to a firm
    // like a fault rather than a no-op.
    await w.setData({ newPhrase: 'org chart' })
    expect(w.vm.canAddNew).toBe(false)
    w.vm.addNewPhrase()
    expect(w.vm.addedPhrases).toEqual([])
  })

  it('discards a phrase the firm typed rather than calling it a removal', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.setData({ newPhrase: 'nobody owns the call' })
    w.vm.addNewPhrase()
    await w.vm.$nextTick()

    // It was never one of the table's phrases, so listing it as "removed"
    // would misdescribe what the change does.
    w.vm.markForRemoval('nobody owns the call')
    expect(w.vm.addedPhrases).toEqual([])
    expect(w.vm.removedPhrases).toEqual([])
  })

  it('says so when a table has no trigger phrases at all', async () => {
    const w = await mountLab({
      select: 'staff_performance',
      detail: Object.assign({}, DETAIL_REPLY, { entryTriggers: [] })
    })
    await w.vm.$nextTick()

    // A table nothing opens is a real and important state; a blank would hide it.
    expect(w.text()).toContain('firmLogicLab.currentNone')
  })
})

describe('Try a sentence', () => {
  it('calls the read-only probe route with the firm token, and sends nothing else', async () => {
    const w = await mountLab()

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
    const w = await mountLab()
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
    const w = await mountLab({
      probe: Object.assign({}, PROBE_REPLY, { domains: [], tables: [], signals: [] })
    })
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('firmLogicLab.noDomain')
    expect(w.text()).toContain('firmLogicLab.noTables')
    expect(w.text()).toContain('firmLogicLab.none')
  })

  // ── The 2026-08-03 P1 ──────────────────────────────────────────────────────
  // With a broken certificate every classifier call died in ~100ms and this box
  // printed "None matched. The AI read all 5 in this area." — a sentence stating
  // the model had done something it never did. Both cases below carry an empty
  // `matched`; only the flag separates a fault from a finding.
  it('a FAILED classifier is a fault here, never "none matched"', async () => {
    const w = await mountLab({
      probe: Object.assign({}, PROBE_REPLY, {
        distinctions: { measured: true, domain: 'staff', considered: 5, matched: [], aiFailed: true }
      })
    })
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('firmLogicLab.distAiFailed')
    expect(w.text()).not.toContain('firmLogicLab.distNone')
    // The false half of the old pair: it named a count and asserted the AI read them.
    expect(w.text()).not.toContain('firmLogicLab.distConsidered')
  })

  it('a genuine no-match still reads as a result', async () => {
    const w = await mountLab({
      probe: Object.assign({}, PROBE_REPLY, {
        distinctions: { measured: true, domain: 'staff', considered: 5, matched: [], aiFailed: false }
      })
    })
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('firmLogicLab.distNone')
    expect(w.text()).not.toContain('firmLogicLab.distAiFailed')
  })

  it('prints the layer it cannot measure, in the SERVER\'s words', async () => {
    const w = await mountLab()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    // Asserted as literal server text, not a key: the whole point is that the
    // API owns this wording so no surface can state a different limit.
    expect(w.text()).toContain('Distinction trigger phrases are examples read by the AI.')
  })

  it('works with no table picked — it asks about the engine, not about one table', async () => {
    const w = await mountLab()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.text()).toContain('Staff Performance')
    expect(w.text()).toContain('firmLogicLab.previewNeedsTable')
  })

  it('surfaces a failure instead of leaving the last answer on screen', async () => {
    const w = await mountLab()
    await w.setData({ probeText: 'x' })
    await w.vm.runProbe()

    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    await w.vm.runProbe()
    await w.vm.$nextTick()

    expect(w.vm.probeResult).toBeNull()
    expect(w.text()).toContain('firmLogicLab.checkFailed')
  })
})

describe('Try a wording change', () => {
  it('posts add/remove to the preview route for the PICKED table', async () => {
    const w = await mountLab({ select: 'staff_performance' })

    await w.setData({ addedPhrases: ['rehiring', 'turnover'], removedPhrases: [] })
    await w.vm.runPreview()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/logic-trees/staff_performance/preview-triggers')
    expect(JSON.parse(opts.body)).toEqual({ add: ['rehiring', 'turnover'], remove: [] })
  })

  it('will not call the route with nothing proposed — the server rejects that', async () => {
    const w = await mountLab({ select: 'staff_performance' })

    expect(w.vm.hasPhrases).toBe(false)
    await w.vm.runPreview()
    expect(global.fetch).not.toHaveBeenCalled()

    await w.setData({ addedPhrases: ['rehiring'] })
    expect(w.vm.hasPhrases).toBe(true)
  })

  it('names the table a conversation was TAKEN FROM — never its internal id', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.setData({ addedPhrases: ['rehiring'] })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    const text = w.text()
    expect(text).toContain('Succession Planning')
    // The raw key must not leak onto the screen. This is the assertion that
    // would fail if nameFor() were dropped for a plain interpolation.
    expect(text).not.toContain('succession_planning')
  })

  it('distinguishes "taken from another table" from "was reaching nothing"', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.setData({ addedPhrases: ['rehiring'] })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    // takenFrom: null must read as "no table", never as a blank — a blank would
    // look like a gain with no cost, which is the opposite of a silent theft.
    expect(w.text()).toContain('firmLogicLab.takenFromNothing')
    // ...and the one that WAS taken carries the warning, because that is the
    // expensive mistake this tool exists to catch.
    expect(w.text()).toContain('firmLogicLab.takenWarning')
    expect(w.findAll('.tw-moves li.is-taken').length).toBe(1)
  })

  it('reports phrases the server ignored rather than dropping them silently', async () => {
    const w = await mountLab({
      select: 'staff_performance',
      preview: Object.assign({}, PREVIEW_REPLY, { phrasesIgnored: 3 })
    })
    await w.setData({ addedPhrases: ['rehiring'] })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    const text = w.text()
    expect(text).toContain('firmLogicLab.phrasesIgnored')
    expect(text).toContain('"count":3')
    expect(text).toContain('"max":200')
  })

  it('prints the corpus limit in the SERVER\'s words', async () => {
    const w = await mountLab({ select: 'staff_performance' })
    await w.setData({ addedPhrases: ['rehiring'] })
    await w.vm.runPreview()
    await w.vm.$nextTick()

    expect(w.text()).toContain('not real advisor speech')
  })

  it('discards a preview when a different table is picked', async () => {
    // Without this, the consequences of editing one table stay on screen while
    // another is picked — the precise misattribution this lab exists to end.
    const w = await mountLab({ select: 'staff_performance' })
    await w.setData({ addedPhrases: ['rehiring'] })
    await w.vm.runPreview()
    expect(w.vm.preview).not.toBeNull()

    await w.setData({ selectedId: 'governance' })
    await w.vm.$nextTick()

    expect(w.vm.preview).toBeNull()
    expect(w.vm.addedPhrases).toEqual([])
    expect(w.vm.removedPhrases).toEqual([])
  })
})

describe('it cannot write anything', () => {
  it('only ever issues the four read-only routes', async () => {
    const w = await mountLab({ select: 'staff_performance', keepCalls: true })

    await w.setData({ probeText: 'x', addedPhrases: ['rehiring'] })
    await w.vm.runProbe()
    await w.vm.runPreview()

    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls).toEqual([
      '/api/firm-manager/logic-trees',
      // The picked table's detail, read for its existing trigger phrases.
      '/api/firm-manager/logic-trees/staff_performance',
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

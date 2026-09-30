/**
 * @jest-environment jsdom
 */
'use strict'

// Screen 4 on the planner page — the recorded words under their boxes (item 8.4).
//
// WHAT UAT CANNOT SEE, AND WHY EACH TEST BELOW EXISTS:
//   1. Unsaved typing is saved BEFORE a Keep. Otherwise the advisor's half-typed box is written
//      after the kept sentence and puts their words back over it — on screen it looks saved.
//   2. The org chart's boxes are a title and a name, so no sentence is ever offered into one.
//   3. "Nothing was said while this box was open" is claimed only once the concept's words are
//      placed, and never for a box that did receive words.
//   4. Each newly placed section is fetched once, not on every four-second poll.
//   5. An edited Keep sends the advisor's words, and a Keep with nothing to keep cannot be sent.

import { mountWithBuefy } from '../helpers/mountComponent'
import Page from '../../pages/strategy-planner.vue'
import StrategyHeardPassages from '../../components/strategy/StrategyHeardPassages.vue'

const m = Page.methods
const PORTER = 'porters-5-forces'
const ORG = 'org-chart'

function passage (id, fieldKey, state) {
  return { id, box: fieldKey ? { frameworkId: PORTER, fieldKey } : null, heard: [{ role: 'client', text: 'x' }], suggestion: 'S', state: state || 'waiting', startAt: '2026-10-01T01:00:00Z', endAt: '2026-10-01T01:01:00Z' }
}

/** Just enough of the page for its screen-4 methods, bound as the component would bind them. */
function page (over) {
  const ctx = Object.assign({
    heardSegments: [{ n: 2, conceptId: PORTER, passages: [passage('p1', null), passage('p2', 'a'), passage('p3', 'b', 'kept')] }],
    wordsWaiting: 0,
    heardLoadedFor: '',
    openBox: null,
    entries: {},
    recState: { meetingId: 'm1', segments: [], live: null },
    conceptVisits: [
      { conceptId: ORG, capture: { form: 'parent-child-list', fields: [] } },
      { conceptId: 'swot', capture: { form: 'banded-grid', fields: [{ key: 'k1', rowLabel: 'Strengths' }] } }
    ],
    chosenFrameworks: [{ id: 'porters-five-forces', conceptId: PORTER, fields: [{ key: 'a', label: 'Customers' }, { key: 'b', label: 'Suppliers' }] }],
    order: [],
    $set (obj, k, v) { obj[k] = v },
    headers: () => ({})
  }, over || {})
  Object.keys(m).forEach((k) => { if (!(k in ctx)) { ctx[k] = m[k].bind(ctx) } })
  ctx.flushPending = jest.fn(() => { ctx.order.push('flush'); return Promise.resolve() })
  ctx.markSaved = jest.fn()
  return ctx
}

function replyWith (body, ok) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: ok !== false, status: ok === false ? 500 : 200, json: () => Promise.resolve(body) }))
}

afterEach(() => { delete global.fetch })

describe('Keep, from the page', () => {
  it('🔴 saves any unsaved typing BEFORE the keep, then takes the server\'s box value as saved', async () => {
    const p = page()
    global.fetch = jest.fn(() => {
      p.order.push('keep')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ passage: Object.assign(passage('p2', 'a'), { state: 'kept' }), waiting: 1, box: { frameworkId: PORTER, fieldKey: 'a', value: 'typed\nS' } }) })
    })
    await p.decidePassage(Object.assign({ n: 2 }, passage('p2', 'a')), 'keep', {})
    expect(p.order).toEqual(['flush', 'keep'])
    expect(p.entries[PORTER + '::a']).toBe('typed\nS')
    expect(p.markSaved).toHaveBeenCalled()
    expect(p.heardSegments[0].passages[1].state).toBe('kept')
    expect(p.wordsWaiting).toBe(1)
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ action: 'keep' })
  })

  it('does not flush typing for a reject, and rejects the promise when the server refused', async () => {
    const p = page()
    replyWith({}, false)
    await expect(p.decidePassage(Object.assign({ n: 2 }, passage('p2', 'a')), 'reject', {})).rejects.toThrow('HTTP 500')
    expect(p.flushPending).not.toHaveBeenCalled()
    expect(p.heardSegments[0].passages[1].state).toBe('waiting')
  })
})

describe('where the words are offered', () => {
  it('puts waiting passages under their own box and tray passages in the tray, never a decided one', () => {
    const p = page()
    expect(p.heardPassagesFor(PORTER, 'a').map(x => x.id)).toEqual(['p2'])
    expect(p.heardPassagesFor(PORTER, 'b')).toEqual([])
    expect(p.heardTrayFor(PORTER).map(x => [x.id, x.n])).toEqual([['p1', 2]])
  })

  it('🔴 never offers a sentence into an org chart\'s title or name box — all of it waits in the tray', () => {
    const p = page({ heardSegments: [{ n: 3, conceptId: ORG, passages: [passage('p1', null), Object.assign(passage('p2', 'orgrole-1-name'), { box: { frameworkId: ORG, fieldKey: 'orgrole-1-name' } })] }] })
    expect(p.heardPassagesFor(ORG, 'orgrole-1-name')).toEqual([])
    expect(p.heardTrayFor(ORG).map(x => x.id)).toEqual(['p1', 'p2'])
    expect(p.heardBoxOptions(ORG)).toEqual([])
    expect(p.heardQuietBox(ORG, 'orgrole-1-name')).toBe(false)
  })

  it('offers a card\'s own boxes by their own headings to move to', () => {
    const p = page()
    expect(p.heardBoxOptions(PORTER)).toEqual([{ key: 'a', label: 'Customers' }, { key: 'b', label: 'Suppliers' }])
    expect(p.heardBoxOptions('swot')).toEqual([{ key: 'k1', label: 'Strengths' }])
  })

  it('🔴 says "nothing was said" only once the words are placed, and only for a box that got none', () => {
    const p = page()
    expect(p.heardQuietBox(PORTER, 'c')).toBe(true)
    expect(p.heardQuietBox(PORTER, 'b')).toBe(false) // its passage was kept: something WAS said
    expect(p.heardQuietBox('swot', 'k1')).toBe(false) // no words placed for this concept yet
  })

  it('marks the open box of the card being recorded, and no other', () => {
    const p = page({ recState: { meetingId: 'm1', segments: [], live: { conceptId: PORTER } }, openBox: { frameworkId: PORTER, fieldKey: 'a' } })
    expect(p.heardIsLiveBox(PORTER, 'a')).toBe(true)
    expect(p.heardIsLiveBox(PORTER, 'b')).toBe(false)
    p.recState.live = { conceptId: 'swot' }
    expect(p.heardIsLiveBox(PORTER, 'a')).toBe(false)
  })
})

describe('fetching the words', () => {
  it('🔴 fetches once per newly placed section, not on every poll', () => {
    const p = page()
    p.loadHeard = jest.fn()
    const state = segs => ({ meetingId: 'm1', segments: segs, live: null })
    p.onRecorderState(state([{ n: 1, wordsState: 'placing' }]))
    p.onRecorderState(state([{ n: 1, wordsState: 'ready' }]))
    p.onRecorderState(state([{ n: 1, wordsState: 'ready' }]))
    p.onRecorderState(state([{ n: 1, wordsState: 'ready' }, { n: 2, wordsState: 'ready' }]))
    expect(p.loadHeard).toHaveBeenCalledTimes(2)
  })

  it('asks again on the next report when a fetch failed', async () => {
    const p = page({ heardLoadedFor: '1' })
    replyWith({}, false)
    await p.loadHeard()
    expect(p.heardLoadedFor).toBe('')
  })
})

describe('the panel under a box', () => {
  function mountPanel (decide, suggestion) {
    const heard = {
      passagesFor: () => [Object.assign({ n: 2 }, passage('p2', 'a'), { suggestion })],
      isLiveBox: () => false,
      quietBox: () => false,
      boxOptions: () => [{ key: 'a', label: 'Customers' }, { key: 'b', label: 'Suppliers' }],
      decide
    }
    return mountWithBuefy(StrategyHeardPassages, { propsData: { conceptId: PORTER, fieldKey: 'a' }, provide: { heard } })
  }

  it('keeps the advisor\'s edit rather than the suggestion', async () => {
    const decide = jest.fn(() => Promise.resolve())
    const w = mountPanel(decide, 'S')
    const p = w.vm.passages[0]
    w.vm.toggleEdit(p)
    w.vm.draft = 'My words'
    await w.vm.keep(p)
    expect(decide).toHaveBeenCalledWith(p, 'keep', { text: 'My words' })
  })

  it('🔴 cannot keep a passage the AI gave no wording for, until the advisor writes some', () => {
    const w = mountPanel(jest.fn(), null)
    const p = w.vm.passages[0]
    expect(w.vm.canKeep(p)).toBe(false)
    w.vm.toggleEdit(p)
    w.vm.draft = 'Written by the advisor'
    expect(w.vm.canKeep(p)).toBe(true)
  })

  it('offers only the card\'s OTHER boxes to move to', () => {
    expect(mountPanel(jest.fn(), 'S').vm.otherBoxes).toEqual([{ key: 'b', label: 'Suppliers' }])
  })

  it('says a decision did not save rather than dropping it silently', async () => {
    const w = mountPanel(jest.fn(() => Promise.reject(new Error('HTTP 500'))), 'S')
    await w.vm.act(w.vm.passages[0], 'reject')
    expect(w.vm.error).toBe('2:p2')
  })
})

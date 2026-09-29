/**
 * The Strategy Concepts library's rows and the Add Concept box maths — item 15.20.
 *
 * WHAT UAT CANNOT SEE: that Remove is offered on a concept inherited from above (the backend
 * refuses it, but the screen would still offer a button that always fails); that a form type the
 * concept data uses has no approved name and prints its internal id; that a box dragged off the
 * page edge is sent as lying outside it; or that a slip of the mouse is saved as a box.
 */

import { libraryRows, cascadeCounts, KNOWN_FORMS } from '~/utils/strategyConceptRows'
import { pointOnPage, boxBetween, boxesForSave, boxesReady, MIN_BOX } from '~/utils/conceptBoxes'

const data = require('../../data/strategy-frameworks.json')
const en = require('../../locales/en.json')
const { MIN_BOX: SERVER_MIN_BOX } = require('../../server/utils/importedConcepts')

const LIST = {
  viewerTier: 'firm_manager',
  sections: [{ id: 'organisational-review', name: 'Organisational Review' }],
  shipped: [
    { id: 'collaborative-thinking', name: 'Collaborative Thinking', planningDomain: 'organisational-review', captureForm: null, model: false },
    { id: 'boston-model', name: 'Boston Model', planningDomain: 'organisational-review', captureForm: 'banded-grid', model: false },
    { id: 'not-drawn', name: 'Not Drawn', planningDomain: 'organisational-review', captureForm: 'a-form-nobody-named', model: false },
    { id: 'owner', name: 'Owner', planningDomain: 'organisational-review', captureForm: null, model: true }
  ],
  concepts: [
    { id: 'im-m1', name: 'From above', planningDomain: 'organisational-review', teachingPageCount: 1, here: false, addedAt: '2026-09-29T00:00:00Z' },
    { id: 'im-f1', name: 'Ours', planningDomain: 'organisational-review', teachingPageCount: 3, here: true, addedAt: '2026-09-29T00:00:00Z' }
  ]
}

const rows = libraryRows(LIST, iso => 'D:' + iso.slice(0, 10))
const row = id => rows.find(r => r.id === id)

describe('the library rows', () => {
  test('🔴 Remove is offered only on a concept this level added — never on a shipped or inherited one', () => {
    expect(rows.filter(r => r.removable).map(r => r.id)).toEqual(['im-f1'])
  })

  test('where a concept comes from follows the viewer: shipped ones are the mentor’s own only at the mentor', () => {
    expect(row('boston-model').from.key).toBe('strategyConcepts.from.inherited')
    expect(libraryRows(Object.assign({}, LIST, { viewerTier: 'mentor' }), String)[0].from.key).toBe('strategyConcepts.from.mentor')
    expect(row('im-f1').from).toEqual({ key: 'strategyConcepts.from.addedHere', params: { date: 'D:2026-09-29' } })
  })

  test('a form nobody has named, or none, reads as not yet chosen, never as an internal id', () => {
    expect(row('not-drawn').response.key).toBe('strategyConcepts.forms.notChosen')
    expect(row('boston-model').response.key).toBe('strategyConcepts.forms.banded-grid')
    expect(row('owner').response.key).toBe('strategyConcepts.forms.model')
  })

  test('teaching sheets are counted from the drawings, and a concept with none has no label', () => {
    expect(row('collaborative-thinking').teaching).toEqual({ key: 'strategyConcepts.teaching.drawnPages', params: { n: 2 } })
    expect(row('not-drawn').teaching).toBeNull()
    expect(row('im-f1').teaching).toEqual({ key: 'strategyConcepts.teaching.importedPages', params: { n: 3 } })
  })

  test('🔴 every form type the concept data uses has an approved name in the locale', () => {
    const used = [...new Set(data.concepts.map(c => c.captureForm).filter(Boolean))]
    expect(used.filter(f => !KNOWN_FORMS.includes(f))).toEqual([])
    expect(KNOWN_FORMS.filter(f => !en.strategyConcepts.forms[f])).toEqual([])
  })

  test('the cascade note counts what arrives from above apart from what was added here', () => {
    expect(cascadeCounts(LIST)).toEqual({ n: 5, m: 1 })
    expect(cascadeCounts(Object.assign({}, LIST, { viewerTier: 'mentor', concepts: [] }))).toEqual({ n: 0, m: 4 })
  })
})

describe('the boxes a manager drags', () => {
  const RECT = { left: 100, top: 50, width: 400, height: 200 }

  test('🔴 a drag past the page edge is clamped to it, so no box can lie outside the page', () => {
    expect(pointOnPage(900, -40, RECT)).toEqual({ x: 1, y: 0 })
    const box = boxBetween(pointOnPage(300, 150, RECT), pointOnPage(9999, 9999, RECT))
    expect(box.x + box.w).toBeLessThanOrEqual(1)
    expect(box.y + box.h).toBeLessThanOrEqual(1)
  })

  test('a box dragged up and to the left is the same box as one dragged down and to the right', () => {
    expect(boxBetween({ x: 0.6, y: 0.7 }, { x: 0.2, y: 0.3 })).toEqual(boxBetween({ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }))
  })

  test('a click, or a sliver thinner than the backend accepts, is not a box', () => {
    expect(boxBetween({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBeNull()
    expect(boxBetween({ x: 0.5, y: 0.5 }, { x: 0.5 + MIN_BOX / 2, y: 0.9 })).toBeNull()
    // The screen's floor is the backend's, so a box the screen keeps is never refused on save.
    expect(MIN_BOX).toBe(SERVER_MIN_BOX)
  })

  test('the save waits for a label on every box, and sends nothing but the five fields', () => {
    expect(boxesReady([])).toBe(false)
    expect(boxesReady([{ label: '  ', x: 0, y: 0, w: 0.1, h: 0.1 }])).toBe(false)
    expect(boxesForSave([{ label: ' Values ', x: 0, y: 0, w: 0.1, h: 0.1, extra: 1 }])).toEqual([{ label: 'Values', x: 0, y: 0, w: 0.1, h: 0.1 }])
  })
})

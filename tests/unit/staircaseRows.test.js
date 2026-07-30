'use strict'

// What the Advisory Staircase tab draws, given what the backend sends.
//
// The rules locked here are the ones a firm manager would notice breaking: a step
// they switched off is still visible (with a way back), the badge tells them who a
// step belongs to, and no step is ever drawn twice.

const { buildStaircaseRows, buildStepEdit } = require('../../utils/staircaseRows')

const BASE = [
  { id: 'as-compliance', step: 1, name: 'Compliance', selectorDescription: 'Historic reporting', complexityCeiling: 'simple' },
  { id: 'as-interpretation', step: 2, name: 'Interpretation', selectorDescription: 'The numbers explained', complexityCeiling: 'moderate' },
  { id: 'as-advisory', step: 3, name: 'Advisory', selectorDescription: 'Forward-looking work', complexityCeiling: 'complex' }
]

describe('buildStaircaseRows', () => {
  test('a firm that has decided nothing sees every platform step, badged platform', () => {
    // loadBlendedStaircase returns the platform object untouched in this case, so the
    // rows carry no `source` at all — they must not fall through to a blank badge.
    const { live, switchedOff } = buildStaircaseRows(BASE, BASE, [])
    expect(live.map(r => r.kind)).toEqual(['platform', 'platform', 'platform'])
    expect(switchedOff).toEqual([])
  })

  test('the resolver source tags become the four badge kinds', () => {
    const resolved = [
      { id: 'as-compliance', step: 1, name: 'Compliance', source: 'platform' },
      { id: 'as-interpretation', step: 2, name: 'Our review', source: 'firm-override' },
      { id: 'fs-1', step: 3, name: 'Board advisory', source: 'firm-own' }
    ]
    const { live } = buildStaircaseRows(resolved, BASE, [])
    expect(live.map(r => r.kind)).toEqual(['platform', 'customised', 'firm-own'])
  })

  test('a switched-off step is still shown, with Advisor-e\'s wording, so it can come back', () => {
    // The resolver drops it — that is correct for an advisor and wrong for a manager,
    // who would otherwise watch a step vanish with no way to undo it.
    const resolved = [
      { id: 'as-compliance', step: 1, name: 'Compliance', source: 'platform' },
      { id: 'as-advisory', step: 2, name: 'Advisory', source: 'platform' }
    ]
    const { live, switchedOff } = buildStaircaseRows(resolved, BASE, ['as-interpretation'])
    expect(live.map(r => r.id)).toEqual(['as-compliance', 'as-advisory'])
    expect(switchedOff).toHaveLength(1)
    expect(switchedOff[0]).toMatchObject({
      id: 'as-interpretation',
      name: 'Interpretation',
      selectorDescription: 'The numbers explained',
      kind: 'declined'
    })
  })

  test('a switched-off step carries no step number', () => {
    // The live list is renumbered 1..n; a switched-off row printing "Step 2" beside it
    // would claim a position that belongs to another step.
    const { switchedOff } = buildStaircaseRows([], BASE, ['as-interpretation'])
    expect(switchedOff[0].step).toBeNull()
  })

  test('a declined id that is not a platform step is ignored', () => {
    // Same rule the resolver holds: stored state can never invent a row.
    const { switchedOff } = buildStaircaseRows(BASE, BASE, ['as-gone', 'fs-9'])
    expect(switchedOff).toEqual([])
  })

  test('a step cannot appear in both lists, even from inconsistent storage', () => {
    // Defensive: if a resolved list ever arrived still carrying a declined row,
    // drawing it twice would make "Switch off" look like it had done nothing.
    const resolved = [{ id: 'as-interpretation', step: 1, name: 'Interpretation', source: 'platform' }]
    const { live, switchedOff } = buildStaircaseRows(resolved, BASE, ['as-interpretation'])
    expect(live).toEqual([])
    expect(switchedOff.map(r => r.id)).toEqual(['as-interpretation'])
  })

  test('rows without an id are skipped rather than guessed at', () => {
    const resolved = [{ step: 1, name: 'No id' }, { id: 'as-compliance', step: 2, name: 'Compliance' }]
    const { live } = buildStaircaseRows(resolved, BASE, [])
    expect(live.map(r => r.id)).toEqual(['as-compliance'])
  })

  test('an edited step the platform has since changed carries the update flag', () => {
    const resolved = [{ id: 'as-interpretation', step: 1, name: 'Our review', source: 'firm-override' }]
    const { live } = buildStaircaseRows(resolved, BASE, [], ['as-interpretation'])
    expect(live[0].hasUpdate).toBe(true)
    // The compare panel reads the platform's wording off the row itself, so it can
    // never pair one step's version with another's.
    expect(live[0].platformVersion).toMatchObject({ id: 'as-interpretation', name: 'Interpretation' })
  })

  test('an UNEDITED step is never flagged, even if its id is in the drift list', () => {
    // A step the firm has not touched already takes the platform's new wording, so
    // there is nothing to choose between — a prompt here would offer a decision that
    // has already been made.
    const resolved = [{ id: 'as-interpretation', step: 1, name: 'Interpretation', source: 'platform' }]
    const { live } = buildStaircaseRows(resolved, BASE, [], ['as-interpretation'])
    expect(live[0].hasUpdate).toBe(false)
    expect(live[0].platformVersion).toBeNull()
  })

  test('a firm-own step is never flagged — it inherits from nothing', () => {
    const resolved = [{ id: 'fs-1', step: 1, name: 'Board advisory', source: 'firm-own' }]
    const { live } = buildStaircaseRows(resolved, BASE, [], ['fs-1'])
    expect(live[0].hasUpdate).toBe(false)
  })

  test('no drift list means no flags, not a crash', () => {
    const resolved = [{ id: 'as-interpretation', step: 1, name: 'Our review', source: 'firm-override' }]
    expect(buildStaircaseRows(resolved, BASE, []).live[0].hasUpdate).toBe(false)
  })

  test('missing or malformed input yields two empty lists, never a crash', () => {
    expect(buildStaircaseRows(null, null, null)).toEqual({ live: [], switchedOff: [] })
    expect(buildStaircaseRows(undefined, BASE, 'nope').switchedOff).toEqual([])
  })

  test('the inputs are never mutated', () => {
    const resolved = [{ id: 'as-compliance', step: 1, name: 'Compliance', source: 'firm-override' }]
    const snapshot = JSON.parse(JSON.stringify({ resolved, BASE }))
    buildStaircaseRows(resolved, BASE, ['as-advisory'])
    expect({ resolved, BASE }).toEqual(snapshot)
  })
})

describe('buildStepEdit', () => {
  const platform = BASE[1] // as-interpretation

  test('only the changed field is sent — the untouched ones keep tracking Advisor-e', () => {
    // THE RULE THIS TAB EXISTS FOR. The save route records exactly what it receives, so
    // sending the whole form would freeze the description and ceiling at today's text.
    const { action, body } = buildStepEdit({
      name: 'Our review meeting',
      selectorDescription: 'The numbers explained',
      complexityCeiling: 'moderate'
    }, platform, false)
    expect(action).toBe('save')
    expect(body).toEqual({ name: 'Our review meeting' })
  })

  test('several changes are all sent', () => {
    const { body } = buildStepEdit({
      name: 'Our review meeting',
      selectorDescription: 'What we talk through each quarter',
      complexityCeiling: 'moderate'
    }, platform, true)
    expect(body).toEqual({
      name: 'Our review meeting',
      selectorDescription: 'What we talk through each quarter'
    })
  })

  test('surrounding spaces are not a change', () => {
    const { action } = buildStepEdit({ name: '  Interpretation  ' }, platform, false)
    expect(action).toBe('none')
  })

  test('editing a customised step back to Advisor-e\'s wording resets it', () => {
    // A save of identical text would leave the row frozen at wording that merely
    // matches today; only dropping the override restores the tracking they asked for.
    const { action, body } = buildStepEdit({
      name: 'Interpretation',
      selectorDescription: 'The numbers explained',
      complexityCeiling: 'moderate'
    }, platform, true)
    expect(action).toBe('reset')
    expect(body).toEqual({})
  })

  test('opening Edit on an untouched step and changing nothing does nothing', () => {
    const { action } = buildStepEdit({
      name: 'Interpretation',
      selectorDescription: 'The numbers explained',
      complexityCeiling: 'moderate'
    }, platform, false)
    expect(action).toBe('none')
  })

  test('a step the firm owns sends every field — there is nothing to track', () => {
    const { action, body } = buildStepEdit({
      name: 'Board advisory',
      selectorDescription: 'Quarterly board work',
      complexityCeiling: 'complex'
    }, null, false)
    expect(action).toBe('save')
    expect(body).toEqual({
      name: 'Board advisory',
      selectorDescription: 'Quarterly board work',
      complexityCeiling: 'complex'
    })
  })

  test('id and step are never sent, however they arrive in the form', () => {
    // Identity and position are the backend's; it rejects them anyway, but the tab
    // should not be the thing that tries.
    const { body } = buildStepEdit(
      { id: 'as-compliance', step: 9, name: 'Renamed' }, platform, false
    )
    expect(body).toEqual({ name: 'Renamed' })
  })

  test('a missing form is nothing to do, not a crash', () => {
    expect(buildStepEdit(null, platform, false)).toEqual({ action: 'none', body: {} })
  })
})

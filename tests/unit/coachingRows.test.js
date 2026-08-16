'use strict'

/**
 * utils/coachingRows.js — the two lists the Coaching Reference tab draws, and what a
 * save actually sends.
 *
 * The interesting half is buildCoachingEdit. The mechanism's whole point is that a
 * field a firm has NOT edited keeps tracking Advisor-e's wording, and the browser is
 * where that guarantee is easiest to lose: post the whole form and every field freezes
 * at today's text. These tests are what stop that regressing.
 */

const {
  buildCoachingRows, buildCoachingEdit, buildOwnCoachingBody, sameScenarios
} = require('../../utils/coachingRows')

const PLATFORM = [
  {
    id: 'cr-a',
    template: 'Growth Fundamentals Framework',
    howItHelps: 'Creates self-relevance.',
    whatToLookFor: 'Any client that can fog a mirror.',
    whereMayLead: 'Advisory services.',
    scenarios: ['Client is unsure where to start', 'First advisory conversation']
  },
  {
    id: 'cr-b',
    template: 'EOY Meeting',
    howItHelps: 'Two bites at the cherry.',
    whatToLookFor: 'Compliance-only clients.',
    whereMayLead: 'Advisory services.',
    scenarios: ['Annual accounts meeting']
  }
]

describe('buildCoachingRows', () => {
  test('an untouched firm gets every entry, all badged platform', () => {
    const { live, switchedOff } = buildCoachingRows(PLATFORM, PLATFORM, [], [])

    expect(live.map(r => r.kind)).toEqual(['platform', 'platform'])
    expect(switchedOff).toEqual([])
  })

  test('carries the resolver source tag through to the badge kind', () => {
    const resolved = [
      { ...PLATFORM[0], source: 'firm-override' },
      { id: 'fc-1', template: 'Ours', source: 'firm-own' }
    ]

    const { live } = buildCoachingRows(resolved, PLATFORM, [], ['cr-a'])

    expect(live[0].kind).toBe('customised')
    expect(live[1].kind).toBe('firm-own')
  })

  test('a switched-off entry leaves the live list and appears below, from ADVISOR-E wording', () => {
    // The firm's edit survives switching off — it just is not what is shown, because
    // wording under a switched-off entry would suggest it was doing something.
    const resolved = [PLATFORM[1]]

    const { live, switchedOff } = buildCoachingRows(resolved, PLATFORM, ['cr-a'], ['cr-a'])

    expect(live.map(r => r.id)).toEqual(['cr-b'])
    expect(switchedOff).toHaveLength(1)
    expect(switchedOff[0].id).toBe('cr-a')
    expect(switchedOff[0].howItHelps).toBe('Creates self-relevance.')
    // …and the flag that tells the reader their version is still held.
    expect(switchedOff[0].hasFirmEdit).toBe(true)
  })

  test('a switched-off entry the firm never edited says so', () => {
    const { switchedOff } = buildCoachingRows([], PLATFORM, ['cr-a'], [])
    expect(switchedOff[0].hasFirmEdit).toBe(false)
  })

  test('an id in BOTH the resolved list and the declines is drawn once, switched off', () => {
    // Inconsistent storage should not put one entry in both lists, where switching it
    // "off" from the top list would look like it did nothing.
    const { live, switchedOff } = buildCoachingRows(PLATFORM, PLATFORM, ['cr-a'], [])

    expect(live.map(r => r.id)).toEqual(['cr-b'])
    expect(switchedOff.map(r => r.id)).toEqual(['cr-a'])
  })

  test('survives being handed nothing at all', () => {
    expect(buildCoachingRows(null, null, null, null)).toEqual({ live: [], switchedOff: [] })
  })
})

describe('buildCoachingEdit — only what changed is sent', () => {
  test('one edited field is sent and the other four are not', () => {
    // THE GUARANTEE. Sending all five would freeze the four the firm never touched at
    // today's wording, and they would stop receiving Advisor-e's improvements for good.
    const form = {
      howItHelps: 'Our own take.',
      whatToLookFor: PLATFORM[0].whatToLookFor,
      whereMayLead: PLATFORM[0].whereMayLead,
      deliveryNotes: '',
      scenarios: [...PLATFORM[0].scenarios]
    }

    const { action, body } = buildCoachingEdit(form, PLATFORM[0], false)

    expect(action).toBe('save')
    expect(body).toEqual({ howItHelps: 'Our own take.' })
  })

  test('an untouched form on an entry the firm HAS edited is a reset, not a save', () => {
    const form = {
      howItHelps: PLATFORM[0].howItHelps,
      whatToLookFor: PLATFORM[0].whatToLookFor,
      whereMayLead: PLATFORM[0].whereMayLead,
      deliveryNotes: '',
      scenarios: [...PLATFORM[0].scenarios]
    }

    expect(buildCoachingEdit(form, PLATFORM[0], true).action).toBe('reset')
  })

  test('an untouched form on an entry the firm has NOT edited sends nothing', () => {
    // Without this, opening Edit and closing it would tell a manager their version had
    // been discarded when they never had one.
    const form = {
      howItHelps: PLATFORM[0].howItHelps,
      whatToLookFor: PLATFORM[0].whatToLookFor,
      whereMayLead: PLATFORM[0].whereMayLead,
      deliveryNotes: '',
      scenarios: [...PLATFORM[0].scenarios]
    }

    expect(buildCoachingEdit(form, PLATFORM[0], false).action).toBe('none')
  })

  test('a platform entry with NO deliveryNotes compares against empty, not undefined', () => {
    // Fourteen of the fifteen real entries omit the field entirely. Comparing an empty
    // box against `undefined` would make every save record a deliveryNotes override the
    // firm never asked for — and freeze that entry against future platform wording.
    const noNotes = { ...PLATFORM[0] }
    delete noNotes.deliveryNotes
    const form = {
      howItHelps: noNotes.howItHelps,
      whatToLookFor: noNotes.whatToLookFor,
      whereMayLead: noNotes.whereMayLead,
      deliveryNotes: '',
      scenarios: [...noNotes.scenarios]
    }

    expect(buildCoachingEdit(form, noNotes, false).action).toBe('none')
  })

  test('trims before comparing, so trailing whitespace is not an edit', () => {
    const form = { howItHelps: `  ${PLATFORM[0].howItHelps}  ` }
    expect(buildCoachingEdit(form, PLATFORM[0], false).action).toBe('none')
  })

  test('the trailing empty situation box is not a change', () => {
    // The form always carries one blank box for the next situation. Without dropping
    // it, every single save would differ from the platform by one empty string.
    const form = { scenarios: [...PLATFORM[0].scenarios, ''] }
    expect(buildCoachingEdit(form, PLATFORM[0], false).action).toBe('none')
  })

  test('a genuinely changed situation list IS sent, blanks removed', () => {
    const form = { scenarios: ['A new situation', '  ', 'And another'] }

    const { action, body } = buildCoachingEdit(form, PLATFORM[0], false)

    expect(action).toBe('save')
    expect(body.scenarios).toEqual(['A new situation', 'And another'])
  })

  test('reordering the situations is a change — order reaches the prompt', () => {
    const form = { scenarios: [...PLATFORM[0].scenarios].reverse() }
    expect(buildCoachingEdit(form, PLATFORM[0], false).action).toBe('save')
  })

  test('emptying the situations is a real decision and is sent', () => {
    const { action, body } = buildCoachingEdit({ scenarios: [] }, PLATFORM[0], false)

    expect(action).toBe('save')
    expect(body.scenarios).toEqual([])
  })

  test('never sends template, even when the form carries one', () => {
    // The route refuses it and the read strips it. This is the browser-side lock.
    const form = { template: 'Something Else', howItHelps: 'changed' }

    const { body } = buildCoachingEdit(form, PLATFORM[0], false)

    expect(body).not.toHaveProperty('template')
    expect(body).toEqual({ howItHelps: 'changed' })
  })

  test('with no platform row behind it, everything present is sent', () => {
    const { action, body } = buildCoachingEdit({ howItHelps: 'x' }, null, false)

    expect(action).toBe('save')
    expect(body).toEqual({ howItHelps: 'x' })
  })
})

describe('buildOwnCoachingBody', () => {
  test('sends every field whole — an own entry has nothing to keep tracking', () => {
    const body = buildOwnCoachingBody({
      template: '  Succession Readiness Review  ',
      howItHelps: 'For owners near exit.',
      scenarios: ['Owner is within five years of exit', '']
    })

    expect(body).toEqual({
      template: 'Succession Readiness Review',
      howItHelps: 'For owners near exit.',
      whatToLookFor: '',
      whereMayLead: '',
      deliveryNotes: '',
      scenarios: ['Owner is within five years of exit']
    })
  })

  test('an own entry DOES carry its template, unlike an inherited one', () => {
    expect(buildOwnCoachingBody({ template: 'Ours' }).template).toBe('Ours')
  })
})

describe('sameScenarios', () => {
  test('order matters', () => {
    expect(sameScenarios(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameScenarios(['a', 'b'], ['a', 'b'])).toBe(true)
  })

  test('a missing list reads as empty rather than throwing', () => {
    expect(sameScenarios(undefined, [])).toBe(true)
    expect(sameScenarios(undefined, ['a'])).toBe(false)
  })
})

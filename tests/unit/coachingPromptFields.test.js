'use strict'

/**
 * Which of a coaching entry's fields actually reach the model.
 *
 * 🔴 WHY THIS FILE EXISTS. `howItHelps` and `deliveryNotes` were authored in
 * data/coaching-reference.json, made firm-editable when the block joined the
 * inheritance mechanism (`869909c`), stored correctly by the cascade routes — and
 * rendered into no prompt anywhere. A firm could have rewritten the longest and most
 * prominent field on its Coaching Reference tab and changed nothing at all about the
 * advice its advisers received.
 *
 * Every test was green throughout, because every test asked whether the field was
 * SAVED. Nothing asked whether it was USED. That is the same shape as the 55 logic-tree
 * branches whose instruction sat under a key `formatNodeForPrompt` never reads: the
 * store is honest, the screen is honest, and the model never sees it.
 *
 * So these tests assert against the RENDERED PROMPT, which is the only artefact that
 * decides what the model is coached by. Mike ruled on 2026-08-15 that both fields must
 * reach it.
 */

const { formatCoachingForPrompt, formatFirmCoachingForPrompt } = require('../../server/utils/coaching')
const BASE = require('../../data/coaching-reference.json')

const FULL = {
  template: 'Test Template',
  howItHelps: 'It creates the moment the client sees it for themselves.',
  whatToLookFor: 'A client who cannot explain their own cash.',
  whereMayLead: 'Monthly reporting.',
  deliveryNotes: 'Free-draw is best. Rehearse it first.',
  scenarios: ['Client is profitable but has no cash']
}

describe('every authored field reaches the model', () => {
  test('all five are in the rendered entry', () => {
    const text = formatCoachingForPrompt([FULL])

    expect(text).toContain('It creates the moment the client sees it for themselves.')
    expect(text).toContain('A client who cannot explain their own cash.')
    expect(text).toContain('Monthly reporting.')
    expect(text).toContain('Free-draw is best. Rehearse it first.')
    expect(text).toContain('Client is profitable but has no cash')
  })

  test('How it helps opens the entry, matching the order the tab edits them in', () => {
    // A manager editing top to bottom is editing the prompt top to bottom.
    const text = formatCoachingForPrompt([FULL])

    expect(text.indexOf('How it helps')).toBeGreaterThan(text.indexOf('**Test Template**'))
    expect(text.indexOf('How it helps')).toBeLessThan(text.indexOf('What to look for'))
    expect(text.indexOf('Delivery notes')).toBeGreaterThan(text.indexOf('Where it leads'))
  })

  test('the real platform file carries its How it helps text into the prompt', () => {
    // Not a fixture — the actual shipped content, which is what a firm inherits.
    const text = formatCoachingForPrompt()
    const withHelp = BASE.filter(r => r.howItHelps)

    expect(withHelp.length).toBe(BASE.length)
    withHelp.forEach((row) => {
      expect(text).toContain(row.howItHelps)
    })
  })

  test('the one entry with delivery notes carries them too', () => {
    const withNotes = BASE.filter(r => r.deliveryNotes)
    expect(withNotes).toHaveLength(1)
    expect(formatCoachingForPrompt()).toContain(withNotes[0].deliveryNotes)
  })
})

describe('a field the entry does not carry produces no line at all', () => {
  test('no empty "Delivery notes:" label on the fourteen entries without them', () => {
    // An empty labelled line reads to a model as a field the author left blank, rather
    // than one that does not apply — and fourteen of fifteen would have carried one.
    const bare = { template: 'T', whatToLookFor: 'x', whereMayLead: 'y', scenarios: [] }
    const text = formatCoachingForPrompt([bare])

    expect(text).not.toContain('Delivery notes')
    expect(text).not.toContain('How it helps')
  })

  test('an empty string counts as absent, not as content', () => {
    const blank = { ...FULL, howItHelps: '', deliveryNotes: '' }
    const text = formatCoachingForPrompt([blank])

    expect(text).not.toContain('How it helps')
    expect(text).not.toContain('Delivery notes')
    // …and the rest of the entry is untouched.
    expect(text).toContain('A client who cannot explain their own cash.')
  })
})

describe('the promoted case observations are unaffected', () => {
  // THE SHARED-RENDERER RISK. formatEntry serves BOTH the platform rows (unfenced,
  // trusted guidance) and a firm's promoted case observations (fenced, an adviser's own
  // free text about a real client). Adding fields to it touches both paths, so the
  // present-only guard is what keeps the fenced one byte-identical.
  const promoted = [{
    id: 1,
    template: 'Working Capital Cycle',
    domain: null,
    whatToLookFor: 'The client kept blaming the bank.',
    scenarios: ['a client said something hostile'],
    whereMayLead: 'nowhere good'
  }]

  test('a promoted entry carries neither field, so it renders exactly as before', () => {
    const text = formatFirmCoachingForPrompt(promoted, null)

    expect(text).not.toContain('How it helps')
    expect(text).not.toContain('Delivery notes')
  })

  test('and it is still fenced', () => {
    // The fence is the whole reason these two kinds of row are kept apart. If a change
    // to the shared renderer ever cost it, this fails rather than the hole opening
    // silently.
    const fenced = formatFirmCoachingForPrompt(promoted, null)
    const bare = formatCoachingForPrompt(promoted)

    expect(fenced).not.toBe(bare)
    expect(fenced.length).toBeGreaterThan(bare.length)
  })
})

describe('a firm edit to either field changes what the model reads', () => {
  test('the edited text is what reaches the prompt, not the platform text', () => {
    // The end-to-end point of the whole item: a firm's decision has to survive all the
    // way to the model, and before 2026-08-15 an edit to these two did not.
    const platform = BASE[0]
    const edited = { ...platform, howItHelps: 'Our firm has its own take on this one.' }

    const text = formatCoachingForPrompt([edited])

    expect(text).toContain('Our firm has its own take on this one.')
    expect(text).not.toContain(platform.howItHelps)
  })
})

'use strict'

// The AI pre-tick — item 15.1 stage 6, Decision C on design/mockups/strategy-session-menu.html.
//
// 🔴 WHY THIS FILE IS THOROUGH WHERE OTHERS ARE NOT. `validateSuggestion` processes model
// output, and the engineering standards put those at 100% — valid, malformed, missing
// fields, wrong types. Everything it lets through is pre-ticked on a screen an advisor
// shows a client, so a reply naming a concept that does not exist must never reach one.
// None of this is visible to a person testing the screen: a malformed reply and a good one
// both look like "the button did something".
//
// ⚠ WHAT IS DELIBERATELY NOT TESTED HERE: the exact words of SYSTEM_PROMPT. Prompt wording
// is content, it is tuned against a bench, and pinning it would mean a failing test every
// time it is improved. What IS pinned is the shape a reply must satisfy to be shown.

const pretick = require('../../server/utils/strategyPretick')

const KNOWN = ['blue-ocean-strategy', 'porters-5-forces', 'product-life-cycle']

describe('validateSuggestion — what is allowed out of the model', () => {
  it('keeps a well-formed tick and its reason', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'blue-ocean-strategy', reason: 'They need to stand apart.' }] }, KNOWN)

    expect(out.concepts).toEqual([
      { id: 'blue-ocean-strategy', reason: 'They need to stand apart.' }
    ])
    expect(out.dropped).toEqual([])
  })

  it('parses a JSON string, which is what the API actually returns', () => {
    const out = pretick.validateSuggestion(
      JSON.stringify({ ticks: [{ id: 'porters-5-forces', reason: 'Market pressure.' }] }), KNOWN)

    expect(out.concepts).toHaveLength(1)
    expect(out.concepts[0].id).toBe('porters-5-forces')
  })

  // 🔴 DECISION C(c). A concept that does not exist cannot be pre-ticked, because the
  // screen would render a row that is not on the menu — or silently tick nothing while
  // telling the advisor it had.
  it('DROPS a tick naming a concept that does not exist, and says why', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'the-eight-levers-of-doom', reason: 'Invented.' }] }, KNOWN)

    expect(out.concepts).toEqual([])
    expect(out.dropped).toEqual([{ id: 'the-eight-levers-of-doom', why: 'unknown-concept' }])
  })

  // Decision C is "pre-ticks AND writes one line of reason against each row". A tick with
  // nothing beside it is the one thing that ruling does not allow on the screen.
  it('DROPS a tick with no reason rather than showing a bare pre-tick', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'porters-5-forces', reason: '   ' }] }, KNOWN)

    expect(out.concepts).toEqual([])
    expect(out.dropped).toEqual([{ id: 'porters-5-forces', why: 'no-reason' }])
  })

  it('drops a tick whose reason is the wrong type entirely', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'porters-5-forces', reason: { text: 'nope' } }] }, KNOWN)

    expect(out.concepts).toEqual([])
    expect(out.dropped[0].why).toBe('no-reason')
  })

  it('truncates a long reason rather than dropping it — a long reason is still a true one', () => {
    const long = 'x'.repeat(pretick.MAX_REASON_CHARS + 50)
    const out = pretick.validateSuggestion({ ticks: [{ id: 'porters-5-forces', reason: long }] }, KNOWN)

    expect(out.concepts).toHaveLength(1)
    expect(out.concepts[0].reason).toHaveLength(pretick.MAX_REASON_CHARS)
  })

  it('keeps the first of a repeated concept and does not tick it twice', () => {
    const out = pretick.validateSuggestion({
      ticks: [
        { id: 'porters-5-forces', reason: 'First.' },
        { id: 'porters-5-forces', reason: 'Again.' }
      ]
    }, KNOWN)

    expect(out.concepts).toEqual([{ id: 'porters-5-forces', reason: 'First.' }])
  })

  it('stops at the ceiling rather than pre-ticking a whole menu', () => {
    const many = []
    for (let i = 0; i < pretick.MAX_SUGGESTIONS + 10; i++) {
      many.push({ id: 'c-' + i, reason: 'because' })
    }
    const known = many.map(t => t.id)
    const out = pretick.validateSuggestion({ ticks: many }, known)

    expect(out.concepts).toHaveLength(pretick.MAX_SUGGESTIONS)
  })

  it('accepts a Set of known ids as well as an array', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'product-life-cycle', reason: 'Late in the cycle.' }] }, new Set(KNOWN))

    expect(out.concepts).toHaveLength(1)
  })

  // Every shape a broken or hostile reply can take. Each returns the same empty rather
  // than throwing, because a thrown error at this point loses a suggestion the advisor is
  // standing in front of a client waiting for.
  describe('a reply that is not a reply', () => {
    const rubbish = [
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['unparseable text', 'sorry, I cannot help with that'],
      ['valid JSON that is an array', '[1,2,3]'],
      ['an object with no ticks key', { suggestions: [] }],
      ['ticks that is not an array', { ticks: 'blue-ocean-strategy' }],
      ['ticks holding nulls', { ticks: [null, undefined] }],
      ['ticks holding arrays', { ticks: [['blue-ocean-strategy']] }],
      ['a tick with no id at all', { ticks: [{ reason: 'orphan' }] }],
      ['a tick whose id is a number', { ticks: [{ id: 7, reason: 'numeric' }] }],
      ['a tick whose id is blank', { ticks: [{ id: '   ', reason: 'blank' }] }]
    ]

    it.each(rubbish)('returns nothing for %s, and does not throw', (_label, raw) => {
      const out = pretick.validateSuggestion(raw, KNOWN)
      expect(out.concepts).toEqual([])
    })
  })

  it('treats a missing known-id list as "nothing is known", never as "everything is"', () => {
    const out = pretick.validateSuggestion(
      { ticks: [{ id: 'porters-5-forces', reason: 'Market pressure.' }] }, undefined)

    expect(out.concepts).toEqual([])
    expect(out.dropped[0].why).toBe('unknown-concept')
  })
})

describe('situationFromCases — what the model is told about the client', () => {
  it('joins the summaries of the most recent conversations', () => {
    const out = pretick.situationFromCases([
      { summary: 'Margins falling.' },
      { summary: 'Considering a new market.' }
    ])

    expect(out).toContain('Margins falling.')
    expect(out).toContain('Considering a new market.')
  })

  it('reads no more than the drawing says — the last two conversations', () => {
    const out = pretick.situationFromCases([
      { summary: 'One.' }, { summary: 'Two.' }, { summary: 'Three.' }
    ])

    expect(out).not.toContain('Three.')
  })

  // 🔴 THE PRIVACY LINE, AS A TEST. A transcript is personal data end to end and Meeting
  // Review is the only feature cleared to send one. Nothing here may put one in a prompt,
  // and an id of any kind would breach the strip rule in CLAUDE.md.
  it('sends the summary ONLY — never the transcript, never any id', () => {
    const out = pretick.situationFromCases([{
      id: 'case-99',
      clientId: 'client-42',
      advisorId: 'adv-7',
      firmId: 'firm-a',
      summary: 'Margins falling.',
      transcript: [{ role: 'user', content: 'My co-director Jane is drinking again.' }]
    }])

    expect(out).toBe('Margins falling.')
    expect(out).not.toContain('Jane')
    expect(out).not.toContain('case-99')
    expect(out).not.toContain('client-42')
    expect(out).not.toContain('adv-7')
    expect(out).not.toContain('firm-a')
  })

  it('a client with no conversations, or only blank ones, has no situation at all', () => {
    expect(pretick.situationFromCases([])).toBe('')
    expect(pretick.situationFromCases(null)).toBe('')
    expect(pretick.situationFromCases([{ summary: '' }, { summary: '   ' }])).toBe('')
  })
})

describe('buildMessages — what is actually sent', () => {
  const CONCEPTS = [
    {
      id: 'blue-ocean-strategy',
      name: 'Blue Ocean Strategy',
      planningDomain: 'strategic-orientation',
      conceptSummary: 'Attract customers who would not normally buy.',
      helpsClientTo: 'Stand out from competitors.'
    },
    { id: 'bare-concept', name: 'Bare Concept', planningDomain: 'business-targets' }
  ]

  it('fences the client situation rather than concatenating it', () => {
    const [, user] = pretick.buildMessages({ situation: 'Margins falling.', concepts: CONCEPTS })
    const { OPEN, CLOSE } = require('../../server/utils/promptSafety')

    expect(user.content).toContain(OPEN)
    expect(user.content).toContain(CLOSE)
    expect(user.content).toContain('Margins falling.')
  })

  // The measured prompt sent every concept, including the ten carrying no text. Nine of
  // those were never chosen across five situations and one was chosen on its name —
  // dropping them would be this module deciding which of Mike's concepts may be offered.
  it('lists every concept, including one with neither summary nor helps-line', () => {
    const [, user] = pretick.buildMessages({ situation: 'Anything.', concepts: CONCEPTS })

    expect(user.content).toContain('blue-ocean-strategy')
    expect(user.content).toContain('bare-concept')
  })

  it('survives a concept record with nothing on it at all', () => {
    expect(() => pretick.buildMessages({ situation: 'x', concepts: [{}, null] })).not.toThrow()
  })

  it('builds a system and a user message, in that order', () => {
    const messages = pretick.buildMessages({ situation: 'x', concepts: CONCEPTS })

    expect(messages.map(m => m.role)).toEqual(['system', 'user'])
  })

  it('does not throw when handed nothing', () => {
    expect(() => pretick.buildMessages()).not.toThrow()
  })
})

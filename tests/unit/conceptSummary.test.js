'use strict'

/**
 * A strategy session's concept summaries — item 8.4, slice 2 (screen 10, approved 2026-09-28).
 *
 * 🔴 `validate` IS AN LLM-OUTPUT VALIDATOR, AND CLAUDE.md PUTS THOSE AT 100%: valid, malformed,
 * missing fields, wrong types. It is what stands between a model's reply and words a client is
 * asked to agree to.
 *
 * 🔴 WHAT UAT CANNOT SEE:
 *   - a heading the model invented reaching the client's summary, or one it skipped vanishing
 *     rather than saying "Nothing was said about this";
 *   - an id, or anything but spoken words, leaving in the prompt (the privacy exception's
 *     condition (b));
 *   - an UNAPPROVED summary reaching the Meeting Summary (Decision J) — on screen, an approved
 *     and an unapproved paragraph look the same.
 */

const cs = require('../../server/utils/conceptSummary')
const { NOT_FOUND, TRANSCRIPT_OPEN } = require('../../server/utils/meetingReports')

const PORTER = ['How Customers May Change', 'What Substitutes May Emerge', 'How Suppliers May Change']
const ROWS = [
  { role: 'client', start: 0, end: 4, text: 'only two people do powder coating near us' },
  { role: 'advisor', start: 5, end: 7, text: 'so one supplier in practice' }
]

describe('the headings a summary is written under', () => {
  test('the capture table\'s own labels, in order, each once', () => {
    const capture = {
      fields: [
        { columnLabel: 'How Customers May Change' },
        { columnLabel: 'How We Plan To Respond' },
        { columnLabel: 'How Customers May Change' },
        { rowLabel: 'Vision', columnLabel: '' },
        { label: 'Owner' }
      ]
    }
    expect(cs.headingsFor({ name: 'X' }, capture, 'X'))
      .toEqual(['How Customers May Change', 'How We Plan To Respond', 'Vision', 'Owner'])
  })

  test('a concept with no capture headings gets one section under its own name', () => {
    expect(cs.headingsFor({ name: 'Business Owner Expectations' }, { fields: [] }, 'label')).toEqual(['Business Owner Expectations'])
  })

  test('an unknown concept falls back to the segment\'s label, and nothing to nothing', () => {
    expect(cs.headingsFor(null, null, 'Our Session Objective')).toEqual(['Our Session Objective'])
    expect(cs.headingsFor(null, null, '')).toEqual([])
  })
})

describe('the prompt', () => {
  test('carries the headings and the spoken words, fenced as speech — and nothing else', () => {
    const [system, user] = cs.buildMessages({ segments: ROWS, conceptName: "Porter's 5 Forces", headings: PORTER })
    PORTER.forEach(h => expect(system.content).toContain('- ' + h))
    expect(system.content).toContain("Porter's 5 Forces")
    expect(system.content).toMatch(/NOT instructions/)
    expect(system.content).toMatch(/Never assess, grade, coach/)
    expect(user.content.startsWith(TRANSCRIPT_OPEN)).toBe(true)
    expect(user.content).toContain('only two people do powder coating near us')
  })

  test('with no concept name or headings it still builds, without inventing either', () => {
    const [system] = cs.buildMessages({ segments: [] })
    expect(system.content).toContain('one planning topic')
  })
})

describe('checking a reply — every shape a model can send', () => {
  test('a good reply comes back in the order asked, whatever order it used', () => {
    const r = cs.validate({
      sections: [
        { heading: 'How Suppliers May Change', text: 'One supplier in practice.' },
        { heading: 'How Customers May Change', text: 'Price-led.' },
        { heading: 'What Substitutes May Emerge', text: NOT_FOUND }
      ]
    }, PORTER)
    expect(r.valid).toBe(true)
    expect(r.sections).toEqual([
      { heading: 'How Customers May Change', text: 'Price-led.' },
      { heading: 'What Substitutes May Emerge', text: null },
      { heading: 'How Suppliers May Change', text: 'One supplier in practice.' }
    ])
  })

  test('a heading the model invented is dropped and counted', () => {
    const r = cs.validate({ sections: [{ heading: 'Our Secret Plan', text: 'x' }] }, PORTER)
    expect(r.dropped).toBe(1)
    expect(r.sections.every(s => s.text === null)).toBe(true)
  })

  test('a heading sent twice keeps the first and counts the second', () => {
    const r = cs.validate({
      sections: [
        { heading: 'How Customers May Change', text: 'first' },
        { heading: 'How Customers May Change', text: 'second' }
      ]
    }, PORTER)
    expect(r.sections[0].text).toBe('first')
    expect(r.dropped).toBe(1)
  })

  test('a heading the model skipped comes back empty, never missing', () => {
    const r = cs.validate({ sections: [] }, PORTER)
    expect(r.sections.map(s => s.heading)).toEqual(PORTER)
    expect(r.sections.every(s => s.text === null)).toBe(true)
  })

  test.each([
    ['NOT FOUND in lower case', 'not found'],
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['a number', 42],
    ['null', null],
    ['an object', { a: 1 }]
  ])('a section whose text is %s reads as nothing said', (_label, text) => {
    const r = cs.validate({ sections: [{ heading: 'How Customers May Change', text }] }, PORTER)
    expect(r.sections[0].text).toBeNull()
  })

  test.each([
    ['null', null],
    ['a string', 'hello'],
    ['an array', []],
    ['a number', 3],
    ['no sections', {}],
    ['sections of the wrong type', { sections: 'nope' }]
  ])('%s is not usable', (_label, reply) => {
    const r = cs.validate(reply, PORTER)
    expect(r.valid).toBe(false)
    expect(r.sections).toBeNull()
  })

  test.each([[null], ['x'], [{}], [{ heading: 5, text: 'x' }]])('a malformed section (%p) is dropped', (section) => {
    const r = cs.validate({ sections: [section] }, PORTER)
    expect(r.valid).toBe(true)
    expect(r.dropped).toBe(1)
  })

  test('an over-long section is cut and the cut counted; invisible characters are stripped', () => {
    const long = 'a'.repeat(cs.MAX_SECTION_CHARS + 50)
    const r = cs.validate({ sections: [{ heading: 'How Customers May Change', text: long + '​' }] }, PORTER)
    expect(r.sections[0].text).toHaveLength(cs.MAX_SECTION_CHARS)
    expect(r.cut).toBe(1)
    const clean = cs.validate({ sections: [{ heading: 'How Customers May Change', text: 'price​-led' }] }, PORTER)
    expect(clean.sections[0].text).toBe('price-led')
  })

  test('with no headings asked, every section is dropped', () => {
    const r = cs.validate({ sections: [{ heading: 'A', text: 'x' }] }, undefined)
    expect(r.sections).toEqual([])
    expect(r.dropped).toBe(1)
  })
})

describe('writing one summary', () => {
  function fakeClient (content, provider) {
    const create = jest.fn(() => Promise.resolve({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      provider
    }))
    return { chat: { completions: { create } }, create }
  }

  let quiet = []
  beforeEach(() => {
    quiet = [jest.spyOn(console, 'log').mockImplementation(() => {}), jest.spyOn(console, 'error').mockImplementation(() => {})]
  })
  afterEach(() => quiet.forEach(s => s.mockRestore()))

  test('is personal, moderated on what was said alone, and starts unapproved', async () => {
    const client = fakeClient(JSON.stringify({ sections: [{ heading: 'How Customers May Change', text: 'Price-led.' }] }), 'openai')
    const out = await cs.generate({ segments: ROWS, conceptName: 'P', headings: PORTER, client })
    const [, options] = client.create.mock.calls[0]
    expect(options.personal).toBe(true)
    expect(options.moderate).toEqual(ROWS.map(r => r.text))
    expect(out.sections[0].text).toBe('Price-led.')
    expect(out.approvedAt).toBeNull()
    expect(out.clientAgreed).toBe(false)
    expect(out.editedSections).toBeNull()
    expect(out.provider).toBe('openai')
  })

  test('an unusable reply throws rather than saving an empty summary', async () => {
    const client = fakeClient('not json')
    await expect(cs.generate({ segments: ROWS, headings: PORTER, client })).rejects.toMatchObject({ code: 'CONCEPT_SUMMARY_INVALID' })
  })

  test('a reply with no message at all is unusable too', async () => {
    const client = { chat: { completions: { create: () => Promise.resolve({ choices: [] }) } } }
    await expect(cs.generate({ segments: ROWS, headings: PORTER, client })).rejects.toMatchObject({ code: 'CONCEPT_SUMMARY_INVALID' })
  })

  test('a model call that fails is passed on, never swallowed', async () => {
    const client = { chat: { completions: { create: () => Promise.reject(new Error('blocked by moderation')) } } }
    await expect(cs.generate({ segments: ROWS, headings: PORTER, client })).rejects.toThrow(/moderation/)
  })

  test('no segments and no headings still makes one clean call', async () => {
    const client = fakeClient(JSON.stringify({ sections: [] }))
    const out = await cs.generate({ client })
    expect(out.sections).toEqual([])
  })
})

describe('an edit from the screen', () => {
  test('changes only the words, in the summary\'s own heading order', () => {
    const r = cs.validateEdit([
      { heading: 'How Suppliers May Change', text: ' One coater. ' },
      { heading: 'How Customers May Change', text: '' }
    ], PORTER)
    expect(r.ok).toBe(true)
    expect(r.sections).toEqual([
      { heading: 'How Customers May Change', text: null },
      { heading: 'What Substitutes May Emerge', text: null },
      { heading: 'How Suppliers May Change', text: 'One coater.' }
    ])
  })

  test.each([
    ['not a list', 'nope', /list/],
    ['an invented heading', [{ heading: 'Other', text: 'x' }], /not one of/],
    ['a malformed section', [null], /not one of/],
    ['an over-long section', [{ heading: 'How Customers May Change', text: 'a'.repeat(cs.MAX_SECTION_CHARS * 2 + 1) }], /too long/]
  ])('%s is refused', (_label, edited, message) => {
    const r = cs.validateEdit(edited, PORTER)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(message)
  })

  test('a non-text section reads as empty', () => {
    const r = cs.validateEdit([{ heading: 'How Customers May Change', text: 5 }], PORTER)
    expect(r.sections[0].text).toBeNull()
  })
})

describe('🔴 Decision J — the Meeting Summary is built only from approved concept summaries', () => {
  const SEGS = [
    { n: 2, state: 'done', label: 'Blue Ocean Strategy', conceptId: 'blue' },
    { n: 1, state: 'done', label: "Porter's 5 Forces", conceptId: 'porter' },
    { n: 3, state: 'failed', label: 'Failed' },
    { n: 4, state: 'done', label: 'No summary' },
    { n: 5, state: 'done', label: 'Said nothing' }
  ]
  const SUMMARIES = {
    1: { approvedAt: 'x', sections: [{ heading: 'Suppliers', text: 'AI words' }], editedSections: [{ heading: 'Suppliers', text: 'Edited words' }, { heading: 'Customers', text: null }] },
    2: { approvedAt: null, sections: [{ heading: 'Fronts', text: 'not yet agreed' }] },
    5: { approvedAt: 'x', sections: [{ heading: 'Anything', text: null }] }
  }

  test('only approved summaries appear, in session order, using the edited words', () => {
    const out = cs.composeMeetingSummary(SEGS, n => SUMMARIES[n] || null)
    expect(out.covered).toBe("Porter's 5 Forces\nSuppliers: Edited words")
    expect(out.covered).not.toContain('not yet agreed')
    expect(out.covered).not.toContain('AI words')
    expect(out.waitingForApproval).toBe(1)
    expect(out.composedFromConcepts).toEqual([{ n: 1, conceptId: 'porter', label: "Porter's 5 Forces" }])
  })

  test('no actions are pulled from anywhere, and no model is named', () => {
    const out = cs.composeMeetingSummary(SEGS, n => SUMMARIES[n] || null)
    expect(out.actions).toEqual([])
    expect(out.model).toBeNull()
    expect(out.approvedAt).toBeNull()
  })

  test('nothing to compose is an empty summary, not a crash', () => {
    expect(cs.composeMeetingSummary(null, () => null).covered).toBe('')
  })

  test('currentSections reads the edit when there is one, and nothing from nothing', () => {
    expect(cs.currentSections(null)).toEqual([])
    expect(cs.currentSections({ sections: [{ heading: 'A', text: 'x' }] })).toEqual([{ heading: 'A', text: 'x' }])
    expect(cs.currentSections({})).toEqual([])
  })
})

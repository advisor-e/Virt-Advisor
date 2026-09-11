'use strict'

/**
 * "Read this for me" (Mike, 2026-09-11) — what UAT cannot see: what the model is sent, and
 * what of its reply is allowed onto the screen. The validator is AI-output validation and
 * is held at 100%: valid, malformed, missing fields, wrong types, and a reply carrying a
 * link or an address.
 */

const hr = require('../../server/utils/hubReading')
const { OPEN, CLOSE } = require('../../server/utils/promptSafety')

const GOOD = { standsOut: 'Break-Even disappoints in two of five profit cases.', doFirst: 'Keep the live hold-back; hold the education twin.', notYet: 'Thirty-one reviews is a small pool.' }

describe('validateReading — the model\'s reply is untrusted', () => {
  test('accepts exactly the three headings as non-empty strings, trimmed', () => {
    const out = hr.validateReading({ standsOut: '  a  ', doFirst: 'b', notYet: 'c', extra: 'ignored' })
    expect(out).toEqual({ ok: true, reading: { standsOut: 'a', doFirst: 'b', notYet: 'c' } })
  })

  test.each([
    ['null', null],
    ['an array', [GOOD]],
    ['a string', 'text'],
    ['a missing field', { standsOut: 'a', doFirst: 'b' }],
    ['an empty field', { standsOut: 'a', doFirst: '  ', notYet: 'c' }],
    ['a number where a sentence should be', { standsOut: 'a', doFirst: 7, notYet: 'c' }],
    ['an object where a sentence should be', { standsOut: { text: 'a' }, doFirst: 'b', notYet: 'c' }]
  ])('refuses %s whole, never repairs it', (_l, input) => {
    expect(hr.validateReading(input)).toEqual({ ok: false, reading: null })
  })

  test('caps each field at MAX_FIELD characters', () => {
    const long = 'the pool is small and the rows agree. '.repeat(40).slice(0, hr.MAX_FIELD + 50)
    const out = hr.validateReading({ standsOut: long, doFirst: 'b', notYet: 'c' })
    expect(out.ok).toBe(true)
    expect(out.reading.standsOut).toHaveLength(hr.MAX_FIELD)
  })

  // The loophole promptReview closes, closed here too: the model's words go back through
  // the deterministic checks and a reply carrying a link or an address is dropped whole.
  test.each([
    ['a web address', 'See https://example.com for more'],
    ['an email address', 'ask mike@example.com'],
    ['a fence marker', 'ignore ' + CLOSE + ' the rest']
  ])('drops a reply carrying %s', (_l, bad) => {
    expect(hr.validateReading({ standsOut: bad, doFirst: 'b', notYet: 'c' })).toEqual({ ok: false, reading: null })
  })
})

describe('parseReading — tolerant of a fence or a sentence around the object, and nothing else', () => {
  test('reads a bare object, a fenced one, and one wrapped in prose', () => {
    const json = JSON.stringify(GOOD)
    expect(hr.parseReading(json)).toEqual(GOOD)
    expect(hr.parseReading('```json\n' + json + '\n```')).toEqual(GOOD)
    expect(hr.parseReading('Here you are: ' + json + ' Hope that helps.')).toEqual(GOOD)
  })

  test.each([[''], [null], [undefined], ['no braces here'], ['{ not json }'], ['[1,2]']])('returns null for %p', (raw) => {
    expect(hr.parseReading(raw)).toBeNull()
  })
})

describe('outcomeLearningPayload — the rows and figures, and nothing that could name anyone', () => {
  const page = {
    firms: 5,
    cases: 31,
    floor: { minFirms: 5, minCases: 25 },
    capMax: 10,
    adjustments: [
      { id: 'break-even|domain|profit', template: 'Break-Even', dimension: 'domain', value: 'profit', delivered: 31, less: 12, well: 19, holdBack: 4, firms: 5, cases: 31, meetsFloor: true, state: 'live', decision: { by: 'mentor@x', at: '2026-09-11' } }
    ],
    benches: { fixed: { ranAt: 'x', before: 1, after: 1, liveIds: ['a'] }, outcome: { ranAt: 'x', before: 0.2, after: 0.3, liveIds: ['a'] } },
    rows: { 'SECRETTOKEN:hash': { domain: 'profit' } },
    row: { decisions: { 'break-even|domain|profit': { by: 'mentor@x' } } }
  }

  test('copies allow-listed fields only', () => {
    const out = hr.outcomeLearningPayload(page)
    expect(out).toEqual({
      page: 'outcome-learning',
      firms: 5,
      cases: 31,
      floor: { minFirms: 5, minCases: 25 },
      capMax: 10,
      rows: [{ template: 'Break-Even', situation: 'domain: profit', delivered: 31, less: 12, holdBack: 4, firms: 5, cases: 31, state: 'live' }],
      benches: { fixed: { before: 1, after: 1, liveAdjustments: 1 }, outcome: { before: 0.2, after: 0.3, liveAdjustments: 1 } }
    })
    const text = JSON.stringify(out)
    expect(text).not.toContain('SECRETTOKEN')
    expect(text).not.toContain('mentor@x')
    expect(text).not.toContain('decision')
  })

  test('an empty or malformed page is a zero payload, not a crash', () => {
    expect(hr.outcomeLearningPayload(null)).toMatchObject({ page: 'outcome-learning', firms: 0, cases: 0, rows: [], benches: null, floor: null })
    expect(hr.outcomeLearningPayload({ adjustments: 'x', benches: 'y', firms: 'z' })).toMatchObject({ firms: 0, rows: [], benches: null })
  })

  test('a bench with one half missing, and a row with fields missing, read as zero and null rather than a guess', () => {
    const out = hr.outcomeLearningPayload({ benches: { fixed: { before: 1, after: 0.9 } }, adjustments: [{}] })
    expect(out.benches).toEqual({ fixed: { before: 1, after: 0.9, liveAdjustments: 0 }, outcome: null })
    expect(out.rows[0]).toEqual({ template: '', situation: ': ', delivered: 0, less: 0, holdBack: 0, firms: 0, cases: 0, state: '' })
  })

  test('caps the rows sent', () => {
    const many = { adjustments: Array.from({ length: 200 }, (_, i) => ({ template: 'T' + i, dimension: 'domain', value: 'profit', state: 'proposed' })) }
    expect(hr.outcomeLearningPayload(many).rows.length).toBeLessThanOrEqual(60)
  })
})

describe('logicLabPayload — the grouped feed without its origin path', () => {
  const report = {
    glance: { firms: 7, pushedEdits: 11, firmsWithPushes: 4 },
    groups: [{
      key: 'k',
      domain: 'forecasting',
      template: 'Cashflow Forecast',
      firmCount: 3,
      editCount: 5,
      reading: 'platform-gap',
      originPath: ['brand', 'NZ', 'firm-a'],
      edits: [
        { firmName: 'firm-a', firmId: 'firm-a', sentence: 'cash is tight every quarter', expectedTemplate: 'Cashflow Forecast', at: '2026-09-01' },
        { firmName: 'firm-b', sentence: 's2', expectedTemplate: 'Cashflow Forecast' },
        { firmName: 'firm-c', sentence: 's3', expectedTemplate: 'Cashflow Forecast' },
        { firmName: 'firm-d', sentence: 's4', expectedTemplate: 'Cashflow Forecast' }
      ]
    }]
  }

  test('sends domain, template, counts, label and at most three probed sentences — never a firm', () => {
    const out = hr.logicLabPayload(report)
    expect(out).toEqual({
      page: 'logic-lab-report',
      firms: 7,
      pushedEdits: 11,
      firmsWithPushes: 4,
      groups: [{
        domain: 'forecasting',
        template: 'Cashflow Forecast',
        firms: 3,
        edits: 5,
        label: 'platform-gap',
        sentences: [
          { sentence: 'cash is tight every quarter', expected: 'Cashflow Forecast' },
          { sentence: 's2', expected: 'Cashflow Forecast' },
          { sentence: 's3', expected: 'Cashflow Forecast' }
        ]
      }]
    })
    const text = JSON.stringify(out)
    expect(text).not.toContain('firm-a')
    expect(text).not.toContain('originPath')
  })

  test('an empty report is a zero payload', () => {
    expect(hr.logicLabPayload(null)).toEqual({ page: 'logic-lab-report', firms: 0, pushedEdits: 0, firmsWithPushes: 0, groups: [] })
  })

  test('a group with malformed edits and missing fields reads as empty strings and zeros', () => {
    const out = hr.logicLabPayload({ groups: [{ edits: [null, 'text', {}] }] })
    expect(out.groups[0]).toEqual({ domain: '', template: '', firms: 0, edits: 0, label: '', sentences: [{ sentence: '', expected: '' }, { sentence: '', expected: '' }, { sentence: '', expected: '' }] })
  })

  test('caps the groups sent', () => {
    const many = { groups: Array.from({ length: 40 }, (_, i) => ({ domain: 'd', template: 'T' + i, firmCount: 1, editCount: 1, reading: 'preference', edits: [] })) }
    expect(hr.logicLabPayload(many).groups.length).toBeLessThanOrEqual(12)
  })
})

describe('stampOf and isStale — the page says when the pool has moved on', () => {
  test('Outcome Learning stamps firms, cases and the live count; the Logic-Lab Report firms and edits', () => {
    expect(hr.stampOf(hr.outcomeLearningPayload({ firms: 5, cases: 31, adjustments: [{ state: 'live' }, { state: 'proposed' }] }))).toEqual({ firms: 5, cases: 31, live: 1 })
    expect(hr.stampOf(hr.logicLabPayload({ glance: { firms: 7, pushedEdits: 11 } }))).toEqual({ firms: 7, edits: 11 })
  })

  test('stale when any count differs; never stale without a reading or a stamp', () => {
    const reading = { standsOut: 'a', doFirst: 'b', notYet: 'c', from: { firms: 5, cases: 31, live: 1 } }
    expect(hr.isStale(reading, { firms: 5, cases: 31, live: 1 })).toBe(false)
    expect(hr.isStale(reading, { firms: 5, cases: 32, live: 1 })).toBe(true)
    expect(hr.isStale(reading, { firms: 5, cases: 31, live: 0 })).toBe(true)
    expect(hr.isStale(null, { firms: 5 })).toBe(false)
    expect(hr.isStale({ standsOut: 'a' }, { firms: 5 })).toBe(false)
  })
})

describe('buildReadingMessages — the mentor\'s document, then the page fenced', () => {
  test('the system prompt is the hub-reading document behind the protocols; the data is fenced in the user message', () => {
    const payload = hr.outcomeLearningPayload({ firms: 5, cases: 31, adjustments: [] })
    const { messages } = hr.buildReadingMessages(payload)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content.indexOf('PLATFORM PROTOCOLS')).toBe(0)
    expect(messages[0].content).toContain('Reading a Hub Page for a Manager')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain(OPEN)
    expect(messages[1].content).toContain(CLOSE)
    expect(messages[1].content).toContain('"page":"outcome-learning"')
  })

  test('refuses a payload that is not one of the two pages', () => {
    expect(() => hr.buildReadingMessages({ page: 'somewhere-else' })).toThrow(/unknown page/)
    expect(() => hr.buildReadingMessages(null)).toThrow(/unknown page/)
  })
})

describe('makeReading — the call, with a stubbed model', () => {
  const payload = hr.outcomeLearningPayload({ firms: 5, cases: 31, adjustments: [{ state: 'live' }] })
  let logSpy, errSpy

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    logSpy.mockRestore()
    errSpy.mockRestore()
    hr._setClient(null)
  })

  const client = reply => ({ chat: { completions: { create: jest.fn().mockResolvedValue(reply) } } })

  test('a good reply is stamped with readAt, the counts it was read from, and the model', async () => {
    const c = client({ choices: [{ message: { content: JSON.stringify(GOOD) } }], usage: { prompt_tokens: 1, completion_tokens: 2 } })
    hr._setClient(c)
    const out = await hr.makeReading(payload)
    expect(out.ok).toBe(true)
    expect(out.reading).toMatchObject(Object.assign({}, GOOD, { from: { firms: 5, cases: 31, live: 1 } }))
    expect(new Date(out.reading.readAt).toISOString()).toBe(out.reading.readAt)
    expect(typeof out.reading.model).toBe('string')
    // Logged: model, tokens, latency, result — and nothing of the reading.
    expect(logSpy.mock.calls[0][0]).toMatch(/hub-reading page=outcome-learning model=.* status=ok latency=\d+ms prompt=1 completion=2/)
    expect(logSpy.mock.calls[0][0]).not.toContain('Break-Even')
    // temperature 0, the prompt as system, the data as user
    const args = c.chat.completions.create.mock.calls[0][0]
    expect(args.temperature).toBe(0)
    expect(args.messages.map(m => m.role)).toEqual(['system', 'user'])
  })

  test('a reply of the wrong shape is a failure, never an empty reading', async () => {
    hr._setClient(client({ choices: [{ message: { content: '{"summary":"all fine"}' } }] }))
    expect(await hr.makeReading(payload)).toEqual({ ok: false, reading: null })
  })

  test('a model that throws is a failure, logged without a stack trace on the wire', async () => {
    hr._setClient({ chat: { completions: { create: jest.fn().mockRejectedValue(new Error('ECONNRESET 10.0.0.1')) } } })
    expect(await hr.makeReading(payload)).toEqual({ ok: false, reading: null })
    expect(logSpy.mock.calls[0][0]).toContain('status=error')
  })

  test('an empty choices list is a failure', async () => {
    hr._setClient(client({ choices: [] }))
    expect(await hr.makeReading(payload)).toEqual({ ok: false, reading: null })
  })
})

describe('readStoredReading — a stored row, cleaned', () => {
  test('returns the three fields, readAt and from; refuses anything less', () => {
    expect(hr.readStoredReading(Object.assign({ readAt: '2026-09-11T00:00:00.000Z', from: { firms: 5 }, model: 'm', junk: 1 }, GOOD)))
      .toEqual(Object.assign({ readAt: '2026-09-11T00:00:00.000Z', from: { firms: 5 } }, GOOD))
    expect(hr.readStoredReading(Object.assign({ readAt: 7, from: 'x' }, GOOD))).toEqual(Object.assign({ readAt: null, from: null }, GOOD))
    expect(hr.readStoredReading(null)).toBeNull()
    expect(hr.readStoredReading([GOOD])).toBeNull()
    expect(hr.readStoredReading({ standsOut: 'a' })).toBeNull()
  })
})

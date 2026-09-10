'use strict'

/**
 * Item 4.92, slice 2 — reading a country's whole schedule in passes.
 *
 * WHAT THESE TESTS ARE FOR. This module is the fix for two live defects, and both of them
 * looked like a success at the time:
 *
 *   4.91 — IR265 was read, named, dated, and proposed NOTHING. Nothing on our side rejected
 *          anything; the model sent empty lists. So `readSchedule` must refuse to hand back a
 *          proposal with no classes in it, rather than storing a pending document with nothing
 *          on it to approve.
 *   4.90 — the class cap was 250 against a document publishing about 2,800, and the classes
 *          past the cap were dropped silently. So hitting a cap must produce a NAMED gap.
 *
 * And Mike's second ruling of 2026-09-11 is the third thing under test: a pass that will not
 * read is retried once, then recorded as an unread page range — it never discards the passes
 * that worked.
 */

const rd = require('../../server/utils/countryScheduleRead')
const { MAX_SCHEDULE_CLASSES } = require('../../server/utils/countrySchedules')

/** No tier holds a prompt override, so the shipped prompt is what gets sent. */
function noConfig () { return Promise.resolve(null) }

/** A survey answer that passes. */
function survey (over) {
  return Object.assign({
    readable: true,
    document: { name: 'IR265 — General depreciation rates', published: '2023-10', country: 'NZ' },
    totalPages: 20,
    tableRanges: [{ from: 1, to: 16 }],
    firstYearRuleFound: false,
    whyUnreadable: null
  }, over || {})
}

/** One class as the model prints it, on a given page. */
function modelClass (label, page, over) {
  return Object.assign({
    class: label,
    method: 'dv',
    dvRate: 0.13,
    slRate: 0.085,
    lifeYears: 15.5,
    page: String(page)
  }, over || {})
}

/** A pass answer that passes. */
function pass (classes, over) {
  return Object.assign({
    readable: true,
    classes: classes || [],
    unresolved: [],
    whyUnreadable: null
  }, over || {})
}

/**
 * A model client that answers each request in turn from a list of replies.
 *
 * A reply may be an object (sent as JSON), a string (sent as-is), or the literal 'THROW',
 * which makes the request fail the way a socket fault does.
 */
function clientReplying (replies) {
  const sent = []
  const factory = () => ({
    responses: {
      create: (params) => {
        const i = sent.length
        sent.push(params.input[0].content[0].text)
        const reply = i < replies.length ? replies[i] : replies[replies.length - 1]
        if (reply === 'THROW') { throw new Error('socket hang up') }
        const text = typeof reply === 'string' ? reply : JSON.stringify(reply)
        return (async function * () {
          yield { type: 'response.completed', response: { output_text: text } }
        })()
      }
    }
  })
  factory.sent = sent
  return factory
}

/** The standard call, so each test changes only what it is about. */
function read (over) {
  return rd.readSchedule(Object.assign({
    scopeId: '__global__:Advisor-e',
    country: 'NZ',
    filename: 'ir265.pdf',
    buffer: Buffer.from('%PDF-1.4'),
    loadFirmConfig: noConfig
  }, over || {}))
}

afterEach(() => rd._setClientFactory(null))

describe('pageNumber', () => {
  it('takes a whole page inside a believable document', () => {
    expect(rd.pageNumber(9)).toBe(9)
    expect(rd.pageNumber('61')).toBe(61)
  })

  it('refuses a fraction, a word, or a page outside any real document', () => {
    expect(rd.pageNumber(9.5)).toBeNull()
    expect(rd.pageNumber('page nine')).toBeNull()
    expect(rd.pageNumber(0)).toBeNull()
    expect(rd.pageNumber(999999)).toBeNull()
    expect(rd.pageNumber(null)).toBeNull()
  })
})

describe('validateSurvey', () => {
  it('accepts a survey and keeps the document, edition and extent', () => {
    const out = rd.validateSurvey(survey(), { country: 'NZ' })
    expect(out.ok).toBe(true)
    expect(out.survey.document).toContain('IR265')
    expect(out.survey.published).toBe('2023-10')
    expect(out.survey.totalPages).toBe(20)
  })

  it('refuses when the model says it could not read the document, and keeps its reason for the log', () => {
    const out = rd.validateSurvey(survey({ readable: false, whyUnreadable: 'scanned without text' }), { country: 'NZ' })
    expect(out.ok).toBe(false)
    expect(out.code).toBe('UNREADABLE')
    expect(out.detail).toBe('scanned without text')
  })

  it('treats a missing readable flag as malformed, never as a quiet yes', () => {
    const raw = survey()
    delete raw.readable
    expect(rd.validateSurvey(raw, { country: 'NZ' }).code).toBe('MALFORMED')
  })

  it('refuses a schedule published for another country', () => {
    const out = rd.validateSurvey(survey({
      document: { name: 'TR 2025/1', published: '2025-07', country: 'AU' }
    }), { country: 'NZ' })
    expect(out.ok).toBe(false)
    expect(out.code).toBe('COUNTRY_MISMATCH')
  })

  it('refuses an answer that names no document, no edition, or no page count', () => {
    expect(rd.validateSurvey(survey({ document: { published: '2023-10' } }), { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey({ document: { name: 'IR265', published: 'October 2023' } }), { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey({ totalPages: null }), { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey({ totalPages: 'about fifty' }), { country: 'NZ' }).code).toBe('MALFORMED')
  })

  it('refuses anything that is not an object, and a country that is not a code', () => {
    expect(rd.validateSurvey(null, { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey([survey()], { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey(), { country: 'New Zealand' }).code).toBe('MALFORMED')
  })

  it('refuses an answer whose document is not an object at all', () => {
    expect(rd.validateSurvey(survey({ document: null }), { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey({ document: 'IR265' }), { country: 'NZ' }).code).toBe('MALFORMED')
    expect(rd.validateSurvey(survey({ document: ['IR265'] }), { country: 'NZ' }).code).toBe('MALFORMED')
  })

  it('falls back to the whole document when no usable table range is offered', () => {
    // Reading too much is wasteful; reading too little loses classes silently, and only one of
    // those is recoverable.
    const out = rd.validateSurvey(survey({ tableRanges: [{ from: 9, to: 2 }, 'pages 4-7', null] }), { country: 'NZ' })
    expect(out.survey.tableRanges).toEqual([{ from: 1, to: 20 }])
  })

  it('trims a range that runs past the document rather than believing it', () => {
    const out = rd.validateSurvey(survey({ tableRanges: [{ from: 4, to: 900 }] }), { country: 'NZ' })
    expect(out.survey.tableRanges).toEqual([{ from: 4, to: 20 }])
  })

  it('drops a range that starts past the end of the document', () => {
    const out = rd.validateSurvey(survey({ tableRanges: [{ from: 40, to: 60 }] }), { country: 'NZ' })
    expect(out.survey.tableRanges).toEqual([{ from: 1, to: 20 }])
  })
})

describe('planPasses', () => {
  it('splits a range into passes of the drawn size', () => {
    const { passes, unplanned } = rd.planPasses([{ from: 1, to: 20 }])
    expect(passes).toEqual([{ from: 1, to: 8 }, { from: 9, to: 16 }, { from: 17, to: 20 }])
    expect(unplanned).toEqual([])
  })

  it('reads IR265\'s 52 table pages in seven passes, as the drawing says', () => {
    const { passes } = rd.planPasses([{ from: 1, to: 52 }])
    expect(passes).toHaveLength(7)
  })

  it('never merges two ranges across a gap, so prose between tables is not paid for', () => {
    const { passes } = rd.planPasses([{ from: 1, to: 4 }, { from: 30, to: 33 }])
    expect(passes).toEqual([{ from: 1, to: 4 }, { from: 30, to: 33 }])
  })

  it('names the pages it will not read rather than losing them, once the pass ceiling is hit', () => {
    const { passes, unplanned } = rd.planPasses([{ from: 1, to: 4000 }])
    expect(passes).toHaveLength(rd.MAX_PASSES)
    expect(unplanned.length).toBeGreaterThan(0)
    expect(unplanned[0].to).toBe(4000)
  })

  it('names later ranges as unread too when the ceiling is hit part-way', () => {
    const { unplanned } = rd.planPasses([{ from: 1, to: 4000 }, { from: 5000, to: 5010 }])
    expect(unplanned.some(r => r.from === 5000 && r.to === 5010)).toBe(true)
  })

  it('skips a malformed range instead of throwing', () => {
    const { passes } = rd.planPasses([null, { from: 5, to: 1 }, { from: 1, to: 2 }])
    expect(passes).toEqual([{ from: 1, to: 2 }])
  })

  it('answers safely for no ranges at all', () => {
    expect(rd.planPasses(undefined)).toEqual({ passes: [], unplanned: [] })
  })
})

describe('validatePass', () => {
  const source = { document: 'IR265', published: '2023-10' }
  const opts = { from: 9, to: 16, source }

  it('keeps a well-formed class and stamps it with the document and the page', () => {
    const out = rd.validatePass(pass([modelClass('Tractors (wheeled)', 9)]), opts)
    expect(out.ok).toBe(true)
    expect(out.classes).toHaveLength(1)
    expect(out.classes[0].source).toEqual({ document: 'IR265', page: '9', published: '2023-10' })
  })

  it('drops a class printed outside this pass\'s pages, and counts it separately', () => {
    // Another pass covers those pages and reports them with the right page number. Keeping this
    // copy would put a class in the table under a page it was not printed on.
    const out = rd.validatePass(pass([
      modelClass('Tractors (wheeled)', 9),
      modelClass('Computers', 60)
    ]), opts)
    expect(out.classes).toHaveLength(1)
    expect(out.outOfRange).toBe(1)
    expect(out.refusedRows).toBe(0)
  })

  it('refuses a rate typed as a percentage and counts it as refused, not as out of range', () => {
    const out = rd.validatePass(pass([modelClass('Tractors (wheeled)', 9, { dvRate: 13 })]), opts)
    expect(out.classes).toHaveLength(0)
    expect(out.refusedRows).toBe(1)
    expect(out.outOfRange).toBe(0)
  })

  it('refuses a class with no wording, no page, or an unknown method', () => {
    expect(rd.validatePass(pass([modelClass('', 9)]), opts).refusedRows).toBe(1)
    expect(rd.validatePass(pass([modelClass('Tractors', null)]), opts).refusedRows).toBe(1)
    expect(rd.validatePass(pass([modelClass('Tractors', 9, { method: 'reducing' })]), opts).refusedRows).toBe(1)
  })

  it('keeps the entries the pages could not settle, and takes no rate from them', () => {
    const out = rd.validatePass(pass([modelClass('Tractors (wheeled)', 9)], {
      unresolved: [{ class: 'Southern Cross Cable capacity', pages: '39, 40', differs: 'two rates' }]
    }), opts)
    expect(out.unresolved).toHaveLength(1)
    expect(out.unresolved[0].dvRate).toBeUndefined()
  })

  it('refuses the pass when the model says it could not read the pages', () => {
    const out = rd.validatePass(pass([], { readable: false, whyUnreadable: 'page 41 is missing' }), opts)
    expect(out.ok).toBe(false)
    expect(out.code).toBe('UNREADABLE')
    expect(out.detail).toBe('page 41 is missing')
  })

  it('refuses a malformed answer', () => {
    expect(rd.validatePass(null, opts).ok).toBe(false)
    expect(rd.validatePass([pass([])], opts).ok).toBe(false)
    expect(rd.validatePass({ classes: [] }, opts).code).toBe('MALFORMED')
  })

  it('accepts a pass that honestly found nothing — a contents page publishes no classes', () => {
    const out = rd.validatePass(pass([]), opts)
    expect(out.ok).toBe(true)
    expect(out.classes).toEqual([])
  })
})

describe('readSchedule', () => {
  it('surveys, then reads each planned page range, and adds the passes up', async () => {
    const factory = clientReplying([
      survey({ totalPages: 20, tableRanges: [{ from: 1, to: 20 }] }),
      pass([modelClass('Tractors (wheeled)', 1)]),
      pass([modelClass('Computers', 9)]),
      pass([modelClass('Office furniture', 17)])
    ])
    rd._setClientFactory(factory)

    const out = await read()
    expect(out.ok).toBe(true)
    expect(out.reading.classes).toHaveLength(3)
    expect(out.reading.pagesRead).toEqual([{ from: 1, to: 8 }, { from: 9, to: 16 }, { from: 17, to: 20 }])
    expect(out.reading.pagesUnread).toEqual([])
    // One survey and three passes.
    expect(factory.sent).toHaveLength(4)
  })

  it('sends the page range in the prompt, with no placeholder left in it', async () => {
    const factory = clientReplying([
      survey({ totalPages: 10, tableRanges: [{ from: 1, to: 10 }] }),
      pass([modelClass('Tractors (wheeled)', 1)]),
      pass([modelClass('Computers', 9)])
    ])
    rd._setClientFactory(factory)
    await read()

    expect(factory.sent[1]).toContain('1')
    expect(factory.sent[1]).not.toContain('{{fromPage}}')
    expect(factory.sent[1]).not.toContain('{{toPage}}')
    expect(factory.sent[1]).not.toContain('{{country}}')
    expect(factory.sent[2]).toContain('9')
  })

  it('hands back a PROPOSAL — it names no approver, so nothing can store it as approved', async () => {
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 4, tableRanges: [{ from: 1, to: 4 }] }),
      pass([modelClass('Tractors (wheeled)', 1)])
    ]))
    const out = await read()
    expect(out.reading.approvedBy).toBeUndefined()
    expect(out.reading.approvedAt).toBeUndefined()
  })

  it('retries a failed pass once, and keeps the pages when the retry works', async () => {
    const factory = clientReplying([
      survey({ totalPages: 8, tableRanges: [{ from: 1, to: 8 }] }),
      'not json at all',
      pass([modelClass('Tractors (wheeled)', 1)])
    ])
    rd._setClientFactory(factory)

    const out = await read()
    expect(out.ok).toBe(true)
    expect(out.reading.pagesUnread).toEqual([])
    expect(factory.sent).toHaveLength(3)
  })

  it('records a page range that will not read, and KEEPS the passes that worked', async () => {
    // Mike's second ruling, 2026-09-11. Under the rule this replaces, one bad pair of rows
    // discarded all 52 pages of IR265.
    const factory = clientReplying([
      survey({ totalPages: 16, tableRanges: [{ from: 1, to: 16 }] }),
      pass([modelClass('Tractors (wheeled)', 1)]),
      pass([], { readable: false, whyUnreadable: 'these pages are scanned' }),
      pass([], { readable: false, whyUnreadable: 'these pages are scanned' })
    ])
    rd._setClientFactory(factory)

    const out = await read()
    expect(out.ok).toBe(true)
    expect(out.reading.classes).toHaveLength(1)
    expect(out.reading.pagesRead).toEqual([{ from: 1, to: 8 }])
    expect(out.reading.pagesUnread).toEqual([{ from: 9, to: 16 }])
  })

  it('carries the pages the plan could not cover through as unread', async () => {
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 4000, tableRanges: [{ from: 1, to: 4000 }] }),
      pass([modelClass('Tractors (wheeled)', 1)])
    ]))
    const out = await read()
    expect(out.reading.pagesUnread.length).toBeGreaterThan(0)
  })

  it('keeps one copy of a class the document prints twice, the first one', async () => {
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 16, tableRanges: [{ from: 1, to: 16 }] }),
      pass([modelClass('Tractors (wheeled)', 1, { dvRate: 0.13 })]),
      pass([modelClass('tractors (WHEELED)', 9, { dvRate: 0.5 })])
    ]))
    const out = await read()
    expect(out.reading.classes).toHaveLength(1)
    expect(out.reading.classes[0].dvRate).toBe(0.13)
  })

  it('stops at the class cap and NAMES the pages it did not read', async () => {
    // Item 4.90: the old cap dropped what would not fit, and nothing on screen said so.
    const many = []
    for (let i = 0; i < MAX_SCHEDULE_CLASSES; i++) { many.push(modelClass('Class ' + i, 1)) }
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 24, tableRanges: [{ from: 1, to: 24 }] }),
      pass(many),
      pass([modelClass('Something on page nine', 9)])
    ]))

    const out = await read()
    expect(out.ok).toBe(true)
    expect(out.reading.classes).toHaveLength(MAX_SCHEDULE_CLASSES)
    expect(out.reading.pagesUnread).toEqual([{ from: 9, to: 16 }, { from: 17, to: 24 }])
  })

  it('refuses a read that produced no classes rather than offering an empty proposal', async () => {
    // Item 4.91 exactly: a document opened, named and dated, proposing nothing at all.
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 8, tableRanges: [{ from: 1, to: 8 }] }),
      pass([]),
      pass([])
    ]))
    const out = await read()
    expect(out.ok).toBe(false)
    expect(out.code).toBe('NOTHING_READ')
    expect(out.reading).toBeNull()
  })

  it('stops at the survey when the document cannot be read, and spends no pass', async () => {
    const factory = clientReplying([survey({ readable: false, whyUnreadable: 'scanned' })])
    rd._setClientFactory(factory)
    const out = await read()
    expect(out.ok).toBe(false)
    expect(out.code).toBe('UNREADABLE')
    expect(factory.sent).toHaveLength(1)
  })

  it('stops at the survey when the schedule is another country\'s', async () => {
    const factory = clientReplying([survey({ document: { name: 'TR 2025/1', published: '2025-07', country: 'AU' } })])
    rd._setClientFactory(factory)
    const out = await read()
    expect(out.code).toBe('COUNTRY_MISMATCH')
    expect(factory.sent).toHaveLength(1)
  })

  it('never reaches the model for a country that is not a code, an empty file, or an oversized one', async () => {
    let called = false
    rd._setClientFactory(() => ({ responses: { create: () => { called = true } } }))

    expect((await read({ country: 'New Zealand' })).code).toBe('INVALID_COUNTRY')
    expect((await read({ buffer: Buffer.alloc(0) })).code).toBe('NO_FILE')
    expect((await read({ buffer: null })).code).toBe('NO_FILE')
    expect((await read({ buffer: Buffer.alloc(rd.MAX_PDF_BYTES + 1) })).code).toBe('TOO_LARGE')
    expect(called).toBe(false)
  })

  it('answers rather than throwing when the network fails', async () => {
    rd._setClientFactory(clientReplying(['THROW']))
    const out = await read()
    expect(out.ok).toBe(false)
    expect(out.code).toBe('READ_FAILED')
  })

  it('answers rather than throwing when a response never completes', async () => {
    rd._setClientFactory(() => ({
      responses: {
        create: () => (async function * () { yield { type: 'response.in_progress' } })()
      }
    }))
    const out = await read()
    expect(out.code).toBe('READ_INCOMPLETE')
  })

  it('reports progress after each pass, and a fault in the reporting loses nothing', async () => {
    const seen = []
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 16, tableRanges: [{ from: 1, to: 16 }] }),
      pass([modelClass('Tractors (wheeled)', 1)]),
      pass([modelClass('Computers', 9)])
    ]))

    const out = await read({
      onProgress: (p) => {
        seen.push(p.state)
        if (seen.length === 2) { throw new Error('the screen went away') }
      }
    })
    expect(out.ok).toBe(true)
    expect(out.reading.classes).toHaveLength(2)
    expect(seen).toEqual(['surveyed', 'pass-done', 'pass-done'])
  })

  it('caps the unsettled entries it accumulates across passes', async () => {
    const lots = []
    for (let i = 0; i < 150; i++) { lots.push({ class: 'Entry ' + i, pages: '1', differs: 'two rates' }) }
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 16, tableRanges: [{ from: 1, to: 16 }] }),
      pass([modelClass('Tractors (wheeled)', 1)], { unresolved: lots }),
      pass([modelClass('Computers', 9)], { unresolved: lots.map((u, i) => ({ class: 'Later ' + i, pages: '9', differs: 'two rates' })) })
    ]))
    const out = await read()
    expect(out.reading.unresolved.length).toBeLessThanOrEqual(200)
    expect(out.reading.classes).toHaveLength(2)
  })

  it('says so, and spends nothing, when the reading instructions cannot be assembled', async () => {
    const aiPrompts = require('../../server/utils/aiPrompts')
    const spy = jest.spyOn(aiPrompts, 'assemblePrompt').mockImplementation(() => { throw new Error('prompt store down') })
    let called = false
    rd._setClientFactory(() => ({ responses: { create: () => { called = true } } }))

    const out = await read()
    expect(out.code).toBe('PROMPT_UNAVAILABLE')
    expect(called).toBe(false)
    spy.mockRestore()
  })

  it('says so when a setting the prompt needs has not been filled in', async () => {
    const aiPrompts = require('../../server/utils/aiPrompts')
    const spy = jest.spyOn(aiPrompts, 'assemblePrompt').mockReturnValue({ blocked: true, text: '' })
    rd._setClientFactory(clientReplying([survey()]))

    const out = await read()
    expect(out.code).toBe('PROMPT_BLOCKED')
    spy.mockRestore()
  })

  it('counts what it refused and what came from the wrong pages, so a screen can say so', async () => {
    rd._setClientFactory(clientReplying([
      survey({ totalPages: 8, tableRanges: [{ from: 1, to: 8 }] }),
      pass([
        modelClass('Tractors (wheeled)', 1),
        modelClass('Bad rate', 2, { dvRate: 13 }),
        modelClass('Wrong pages', 60)
      ])
    ]))
    const out = await read()
    expect(out.reading.refusedRows).toBe(1)
    expect(out.reading.outOfRange).toBe(1)
    expect(out.reading.classes).toHaveLength(1)
  })
})

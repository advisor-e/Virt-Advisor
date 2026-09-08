'use strict'

/**
 * The next-steps draft's two validators (item 4.70, stage 6) — what may be sent, and what
 * may come back. Both process or validate LLM traffic, so both are held to the full set:
 * valid, malformed, missing fields, wrong types, a figure smuggled in, over length.
 *
 * 🔴 The privacy ruling of 2026-09-09 is proved here, not described: the text that leaves
 * the app is rendered from the validated list, and it carries no digit and nothing but the
 * eight names and six words.
 */

const {
  MEASURE_KEYS, MEASURE_NAMES, BANDS, POSITIONS, MAX_LIMITS,
  validateSendList, renderSendList, validateDraft
} = require('../../server/report/nextStepsDraft')
const { MAX_TEXT } = require('../../utils/dashboardReportsSavedShape')
const en = require('../../locales/en.json')

const ALL_GREEN = MEASURE_KEYS.map(key => ({ key, band: 'green' }))

function goodDraft () {
  return JSON.stringify({
    steps: [
      { title: 'Free up cash from stock', body: 'Stock days are red. Run down the slow lines and trim the reorder points.' },
      { title: 'Bring debtor days back', body: 'Debtor days are amber. Shorten the terms on the key accounts and automate reminders.' },
      { title: 'Protect the margin', body: 'Margin is green. Review supplier agreements before the next price round.' }
    ]
  })
}

describe('the eight measures', () => {
  test('are the trend model\'s six drivers plus the two score ratios, in that order', () => {
    expect(MEASURE_KEYS).toEqual(['salesGrowth', 'grossMargin', 'overheadRatio', 'debtorDays', 'creditorDays', 'stockDays', 'currentRatio', 'debtToEquity'])
  })

  // 🔒 Load-bearing pin: the blue box says "This is exactly what will be sent", so the
  // screen's names and the names in the prompt must be the same eight strings.
  test('🔒 the names sent are the names the screen shows', () => {
    expect(en.report.dashboardReports.draft.measure).toEqual(MEASURE_NAMES)
    MEASURE_KEYS.forEach(k => expect(typeof MEASURE_NAMES[k]).toBe('string'))
  })
})

describe('validateSendList — what may be sent', () => {
  test('accepts the eight measures with their colours and the positions', () => {
    const out = validateSendList({ measures: ALL_GREEN, positions: [{ key: 'stockDays', position: 'below' }] })
    expect(out.ok).toBe(true)
    expect(out.data.measures).toEqual(ALL_GREEN)
    expect(out.data.positions).toEqual([{ key: 'stockDays', position: 'below' }])
  })

  test('accepts fewer than eight — a measure without a threshold is not banded — and no positions', () => {
    const out = validateSendList({ measures: [{ key: 'stockDays', band: 'red' }] })
    expect(out.ok).toBe(true)
    expect(out.data.positions).toEqual([])
  })

  test('refuses an empty list as NO_SCORE — nothing to draft from', () => {
    expect(validateSendList({ measures: [] }).error.code).toBe('NO_SCORE')
    expect(validateSendList({}).error.code).toBe('NO_SCORE')
    expect(validateSendList(null).error.code).toBe('NO_SCORE')
  })

  test('🔴 refuses anything but a known measure and a colour word', () => {
    const bad = [
      [{ key: 'revenue', band: 'green' }],
      [{ key: 'stockDays', band: 'purple' }],
      [{ key: 'stockDays', band: 45 }],
      [{ key: 'stockDays' }],
      [{ band: 'green' }],
      ['stockDays'],
      [{ key: 'stockDays', band: 'red' }, { key: 'stockDays', band: 'green' }]
    ]
    bad.forEach((measures) => {
      expect(validateSendList({ measures }).error.code).toBe('SEND_LIST_REFUSED')
    })
  })

  test('🔴 refuses anything but a known measure and a position word', () => {
    const bad = [
      [{ key: 'stockDays', position: 'far below' }],
      [{ key: 'clientName', position: 'below' }],
      [{ key: 'stockDays', position: 2 }],
      [{ key: 'stockDays', position: 'below' }, { key: 'stockDays', position: 'above' }]
    ]
    bad.forEach((positions) => {
      expect(validateSendList({ measures: ALL_GREEN, positions }).error.code).toBe('SEND_LIST_REFUSED')
    })
  })

  test('drops everything else in the body — only the two lists come through', () => {
    const out = validateSendList({ measures: ALL_GREEN, clientName: 'Harbourside', revenue: 2840000 })
    expect(out.ok).toBe(true)
    expect(Object.keys(out.data)).toEqual(['measures', 'positions'])
  })
})

describe('renderSendList — the text that leaves the app', () => {
  test('is the names and the words, one per line', () => {
    const text = renderSendList({ measures: [{ key: 'stockDays', band: 'red' }, { key: 'grossMargin', band: 'green' }], positions: [{ key: 'stockDays', position: 'below' }] })
    expect(text).toBe('- Stock days: red\n- Gross margin: green\n\nAgainst the industry\'s middle half:\n- Stock days: below')
  })

  test('says when no comparison was made rather than leaving a gap', () => {
    const text = renderSendList({ measures: [{ key: 'stockDays', band: 'red' }], positions: [] })
    expect(text).toContain('No industry comparison was made.')
  })

  test('🔴 carries no digit and no currency sign, for every colour and position', () => {
    const measures = MEASURE_KEYS.map((key, i) => ({ key, band: BANDS[i % 3] }))
    const positions = MEASURE_KEYS.map((key, i) => ({ key, position: POSITIONS[i % 3] }))
    const text = renderSendList(validateSendList({ measures, positions }).data)
    expect(text).not.toMatch(/[0-9£$€]/)
    const words = text.replace(/[-:'\n]/g, ' ').split(/\s+/).filter(Boolean)
    const allowed = new Set(Object.values(MEASURE_NAMES).join(' ').split(' ').concat(BANDS, POSITIONS, ['Against', 'the', 'industry', 's', 'middle', 'half']))
    words.forEach(w => expect(allowed.has(w)).toBe(true))
  })
})

describe('validateDraft — what may come back', () => {
  test('accepts three titled steps as a string, trimmed', () => {
    const out = validateDraft(goodDraft())
    expect(out.ok).toBe(true)
    expect(out.data.steps).toHaveLength(3)
    expect(out.data.steps[0].title).toBe('Free up cash from stock')
  })

  test('accepts the Responses API shape, reading the text the economic analysis reads', () => {
    const response = { output: [{ type: 'message', content: [{ type: 'output_text', text: goodDraft(), annotations: [] }] }] }
    expect(validateDraft(response).ok).toBe(true)
  })

  test('malformed: not JSON, not an object, an array, no text at all', () => {
    ;['not json', '', '[]', '"steps"', 'null', undefined, null, {}, { output: [] }].forEach((v) => {
      expect(validateDraft(v).error.code).toBe('DRAFT_MALFORMED')
    })
  })

  test('malformed: an extra top-level key, or a missing one', () => {
    expect(validateDraft(JSON.stringify({ steps: JSON.parse(goodDraft()).steps, note: 'x' })).error.code).toBe('DRAFT_MALFORMED')
    expect(validateDraft(JSON.stringify({ items: [] })).error.code).toBe('DRAFT_MALFORMED')
    expect(validateDraft(JSON.stringify({ steps: JSON.parse(goodDraft()).steps, limits: ['not a string'] })).error.code).toBe('DRAFT_MALFORMED')
  })

  test('🔴 the model statement of its limits is kept beside the draft, never in a step', () => {
    // Platform protocol 4 requires the model to say what it could not verify. On the first
    // live run it said so inside step three, on the owner's page. `limits` is where it goes.
    const steps = JSON.parse(goodDraft()).steps
    const out = validateDraft(JSON.stringify({ steps, limits: 'No figures were supplied; causes are not verified. 8 measures only.' }))
    expect(out.ok).toBe(true)
    expect(out.data.limits).toBe('No figures were supplied; causes are not verified. 8 measures only.')
    expect(validateDraft(goodDraft()).data.limits).toBe('')
    const long = validateDraft(JSON.stringify({ steps, limits: 'x'.repeat(2000) }))
    expect(long.data.limits.length).toBe(MAX_LIMITS)
  })

  test('malformed: not exactly three steps', () => {
    const three = JSON.parse(goodDraft()).steps
    expect(validateDraft(JSON.stringify({ steps: three.slice(0, 2) })).error.code).toBe('DRAFT_MALFORMED')
    expect(validateDraft(JSON.stringify({ steps: three.concat(three[0]) })).error.code).toBe('DRAFT_MALFORMED')
    expect(validateDraft(JSON.stringify({ steps: 'three' })).error.code).toBe('DRAFT_MALFORMED')
  })

  test('malformed: a step missing a field, carrying an extra one, or of the wrong type', () => {
    const three = JSON.parse(goodDraft()).steps
    const variants = [
      Object.assign({}, three[0], { body: undefined }),
      Object.assign({}, three[0], { why: 'extra' }),
      Object.assign({}, three[0], { title: 7 }),
      Object.assign({}, three[0], { body: ['a'] }),
      null,
      'a step'
    ]
    variants.forEach((bad) => {
      expect(validateDraft(JSON.stringify({ steps: [bad, three[1], three[2]] })).error.code).toBe('DRAFT_MALFORMED')
    })
  })

  test('empty: a blank title or body', () => {
    const three = JSON.parse(goodDraft()).steps
    expect(validateDraft(JSON.stringify({ steps: [Object.assign({}, three[0], { title: '   ' }), three[1], three[2]] })).error.code).toBe('DRAFT_EMPTY')
  })

  test('too long: a line past the saved report\'s limit', () => {
    const three = JSON.parse(goodDraft()).steps
    const long = Object.assign({}, three[0], { body: 'x'.repeat(MAX_TEXT + 1) })
    expect(validateDraft(JSON.stringify({ steps: [three[1], long, three[2]] })).error.code).toBe('DRAFT_TOO_LONG')
    const exact = Object.assign({}, three[0], { body: 'x'.repeat(MAX_TEXT) })
    expect(validateDraft(JSON.stringify({ steps: [three[1], exact, three[2]] })).ok).toBe(true)
  })

  test('🔴 a figure of any kind is refused — the model was given none, so it is invented', () => {
    const three = JSON.parse(goodDraft()).steps
    ;['Target 60 days on hand', 'Release about $45K', 'Cut overheads by 3%', 'Review by Q4 2026', 'Two of the 8 measures', 'Raise prices £'].forEach((text) => {
      const out = validateDraft(JSON.stringify({ steps: [three[0], Object.assign({}, three[1], { body: text }), three[2]] }))
      expect(out.error.code).toBe('DRAFT_HAS_FIGURE')
    })
    const inTitle = validateDraft(JSON.stringify({ steps: [Object.assign({}, three[0], { title: 'Plan for 2027' }), three[1], three[2]] }))
    expect(inTitle.error.code).toBe('DRAFT_HAS_FIGURE')
  })

  test('a refusal carries a message an advisor can act on, and never the model\'s text', () => {
    const out = validateDraft(JSON.stringify({ steps: [{ title: 'Secret client name', body: '$1m' }, {}, {}] }))
    expect(out.ok).toBe(false)
    expect(typeof out.error.message).toBe('string')
    expect(out.error.message).not.toContain('Secret')
  })
})

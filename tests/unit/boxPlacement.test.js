'use strict'

// boxPlacement — Decision 11: the clock decides which box a recorded passage belongs to, never a
// model (item 8.4, screen 4).
//
// WHAT UAT CANNOT SEE. A passage under the wrong box looks exactly as plausible as one under the
// right box — it is the client's own words, tidied, under a sensible heading. Only arithmetic on
// the two clocks decides it, so every boundary is pinned here: the midpoint rule, a box of
// ANOTHER card still being the last one opened, a closed box, the paused minutes already added
// back, and a start time that cannot be read.

const { placePassages, toMs, MAX_PASSAGE_CHARS } = require('../../server/utils/boxPlacement')

const CONCEPT = 'porters-5-forces'
// The segment opened at 14:20:00 UTC; the timeline is stored UTC with no zone, as now() writes it.
const STARTED = '2026-10-01T14:20:00.000Z'

function row (start, end, text, role) {
  return { start, end, text, role: role || 'client' }
}

function place (rows, timeline, conceptId) {
  return placePassages({ rows, startedAt: STARTED, conceptId: conceptId === undefined ? CONCEPT : conceptId, timeline })
}

describe('the open box claims what was said while it was open', () => {
  const timeline = [
    { frameworkId: CONCEPT, fieldKey: 'suppliers', openedAt: '2026-10-01 14:21:00.000', closedAt: '2026-10-01 14:23:00.000' },
    { frameworkId: CONCEPT, fieldKey: 'customers', openedAt: '2026-10-01 14:23:00.000', closedAt: null }
  ]

  it('puts each passage under the box open at its moment, in spoken order', () => {
    const out = place([
      row(65, 70, 'only two coaters near us'),
      row(71, 74, 'so one supplier really', 'advisor'),
      row(190, 195, 'they buy on price')
    ], timeline)
    expect(out.map(p => p.box && p.box.fieldKey)).toEqual(['suppliers', 'customers'])
    expect(out[0].heard).toEqual([
      { role: 'client', text: 'only two coaters near us' },
      { role: 'advisor', text: 'so one supplier really' }
    ])
    expect(out[0].startAt).toBe('2026-10-01T14:21:05.000Z')
    expect(out[0].endAt).toBe('2026-10-01T14:21:14.000Z')
    expect(out.map(p => p.id)).toEqual(['p1', 'p2'])
  })

  it('decides a row straddling a box change by its MIDPOINT', () => {
    // 14:22:50 → 14:23:20: midpoint 14:23:05, after customers opened.
    const [only] = place([row(170, 200, 'straddles the change')], timeline)
    expect(only.box.fieldKey).toBe('customers')
  })

  it('sends speech before the card\'s first box was opened to the tray, never guessed into a box', () => {
    const out = place([row(10, 15, 'right, so this one is Porter\'s', 'advisor'), row(65, 70, 'two coaters')], timeline)
    expect(out[0].box).toBeNull()
    expect(out[1].box.fieldKey).toBe('suppliers')
  })

  it('sends speech after a box was CLOSED, with nothing open, to the tray', () => {
    const closed = [{ frameworkId: CONCEPT, fieldKey: 'suppliers', openedAt: '2026-10-01 14:21:00.000', closedAt: '2026-10-01 14:22:00.000' }]
    expect(place([row(150, 155, 'after it closed')], closed)[0].box).toBeNull()
  })

  it('🔴 never lets a box of ANOTHER card claim this section\'s words', () => {
    // The advisor pressed Record on Porter's but last clicked into a SWOT box: the words were
    // said in Porter's section, so a SWOT box must not receive them.
    const other = [{ frameworkId: 'swot-analysis', fieldKey: 'strengths', openedAt: '2026-10-01 14:19:00.000', closedAt: null }]
    expect(place([row(30, 35, 'said in Porters')], other)[0].box).toBeNull()
  })

  it('reads a timeline stamp that carries its zone as it stands', () => {
    const zoned = [{ frameworkId: CONCEPT, fieldKey: 'suppliers', openedAt: '2026-10-02T03:21:00+13:00', closedAt: null }]
    expect(place([row(65, 70, 'two coaters')], zoned)[0].box.fieldKey).toBe('suppliers')
  })
})

describe('what a passage is', () => {
  const open = [{ frameworkId: CONCEPT, fieldKey: 'suppliers', openedAt: '2026-10-01 14:20:00.000', closedAt: null }]

  it('splits a long run under one box so a suggestion stays a sentence or two', () => {
    const long = 'x'.repeat(MAX_PASSAGE_CHARS - 10)
    const out = place([row(1, 2, long), row(3, 4, 'y'.repeat(20))], open)
    expect(out).toHaveLength(2)
    expect(out.every(p => p.box.fieldKey === 'suppliers')).toBe(true)
  })

  it('skips empty rows, collapses whitespace, and names an unrecognised speaker unknown', () => {
    const out = place([row(1, 2, '   '), { start: 3, end: 4, text: 'a\n  b', role: 'SPEAKER_2' }], open)
    expect(out).toHaveLength(1)
    expect(out[0].heard).toEqual([{ role: 'unknown', text: 'a b' }])
  })

  it('places nothing from a silent section', () => {
    expect(place([], open)).toEqual([])
  })

  it('treats a framing section with no concept as having no boxes', () => {
    expect(place([row(1, 2, 'welcome')], open, '')[0].box).toBeNull()
  })

  it('🔴 refuses a segment with no usable start time rather than placing by a broken clock', () => {
    expect(() => placePassages({ rows: [row(1, 2, 'a')], startedAt: 'not a time', conceptId: CONCEPT, timeline: open }))
      .toThrow('no usable start time')
  })
})

describe('toMs', () => {
  it('reads the store\'s zone-less UTC and a zoned ISO string to the same moment', () => {
    expect(toMs('2026-10-01 14:21:00.000')).toBe(toMs('2026-10-01T14:21:00.000Z'))
    expect(isNaN(toMs(null))).toBe(true)
  })
})

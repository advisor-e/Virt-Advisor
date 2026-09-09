'use strict'

/**
 * The BUSINESS-ENTITY LEVEL — the store. Second half of slice 4 of
 * design/MEETING-TYPES-CASCADE.md §7, drawn as design/mockups/meeting-preset-client-level.html
 * and ruled by Mike 2026-09-10, five questions.
 *
 * What UAT cannot see, and these pin:
 *
 *   - 🔴 QUESTION 2 IS STRUCTURAL. The client layer can only remove or add on top of the
 *     advisor's layer; a point the advisor set aside for themselves is not in the input and
 *     so cannot come back. On screen a layer that could resurrect it would look like a
 *     perfectly ordinary list.
 *   - 🔴 QUESTION 4: every client-level entry carries who set it, and a stored entry with no
 *     name still says so rather than printing an id or nothing.
 *   - a removed point's id is never reissued (the same collision the advisor level closed on
 *     2026-09-08 — a coaching report about the old point would read as one about the new).
 *   - malformed storage degrades to the advisor's list, never to nothing and never to a throw.
 *   - the key prefixes collide with no tier's, because the prefix is how a badge is decided.
 */

const entity = require('../../server/utils/meetingObservationsEntity')
const advisor = require('../../server/utils/meetingObservationsAdvisor')
const { PLATFORM_POINT_PREFIX, POINT_PREFIX_BY_TIER } = require('../../server/utils/meetingObservations')

const EOY = 'eoy_meeting'

/** A firm list as `applyAdvisorLayer` hands it on: source badges and tiers already stamped. */
function advisorPoints () {
  return advisor.applyAdvisorLayer([
    { id: 'mo-eoy-1', text: 'The meeting was framed.', source: 'inherited', hintWords: [] },
    { id: 'mo-eoy-2', text: 'A metaphor was used.', source: 'inherited', hintWords: [] },
    { id: 'fm-1', text: 'Our firm asks about the family.', source: 'added-here', hintWords: [] }
  ], {
    // The advisor has set mo-eoy-2 aside for ALL their meetings.
    declines: ['mo-eoy-2'],
    own: [{ id: 'ao-1', text: 'My own reminder.', hintWords: [] }]
  })
}

describe('meetingObservationsEntity — keys', () => {
  test('a key names the client, and a missing client yields no key', () => {
    expect(entity.entityConfigKey('entityOwn', 'client-42')).toBe('meeting-observation-entity-own:client-42')
    expect(entity.entityConfigKey('entityDeclines', '  ')).toBeNull()
    expect(entity.entityConfigKey('nope', 'client-42')).toBeNull()
    expect(entity.entityIdFromKey('meeting-observation-entity-declines:client-42')).toBe('client-42')
    expect(entity.entityIdFromKey('meeting-observation-advisor-own:adv-1')).toBeNull()
  })

  test('the client-level point prefix collides with no other tier prefix', () => {
    const others = [PLATFORM_POINT_PREFIX, advisor.ADVISOR_POINT_PREFIX].concat(Object.values(POINT_PREFIX_BY_TIER))
    others.forEach((p) => {
      expect(p).not.toBe(entity.ENTITY_POINT_PREFIX)
      expect(entity.ENTITY_POINT_PREFIX.indexOf(p)).toBe(-1)
      expect(p.indexOf(entity.ENTITY_POINT_PREFIX)).toBe(-1)
    })
  })

  test('the client id is capped so the config key fits its column', () => {
    const long = 'c'.repeat(200)
    const key = entity.entityConfigKey('entityOwn', long)
    expect(key.length).toBeLessThanOrEqual(128)
  })
})

describe('meetingObservationsEntity — applyEntityLayer', () => {
  test('🔴 question 2: the client layer cannot put back a point the advisor set aside for themselves', () => {
    const mine = advisorPoints()
    expect(mine.map(p => p.id)).toEqual(['mo-eoy-1', 'fm-1', 'ao-1'])
    // Even a client-level state that names mo-eoy-2 as "own" under an inherited id, or holds
    // no decline for it, cannot bring it back: it is not in the input.
    const out = entity.applyEntityLayer(mine, { declines: [], own: [] })
    expect(out.map(p => p.id)).toEqual(['mo-eoy-1', 'fm-1', 'ao-1'])
  })

  test('a client decline removes a firm point for this client only, and keeps the advisor badges on the rest', () => {
    const out = entity.applyEntityLayer(advisorPoints(), {
      declines: [{ id: 'mo-eoy-1', byId: 'adv-r', byName: 'Ruth Kelleher', at: '2026-09-10T00:00:00.000Z' }],
      own: []
    })
    expect(out.map(p => p.id)).toEqual(['fm-1', 'ao-1'])
    expect(out[0].sourceTier).toBe('firm')
    expect(out[1].sourceTier).toBe('advisor')
  })

  test('🔴 question 4: a client-level point names who added it, and a nameless one says so', () => {
    const out = entity.applyEntityLayer(advisorPoints(), {
      declines: [],
      own: [
        { id: 'eo-1', text: 'Raise succession gently.', hintWords: ['succession'], cannotHear: false, byId: 'adv-t', byName: 'Tom Boyd', at: '2026-09-10T00:00:00.000Z' },
        { id: 'eo-2', text: 'Ask about the new site.', hintWords: [], byId: null, byName: null, at: null }
      ]
    })
    const named = out.find(p => p.id === 'eo-1')
    const nameless = out.find(p => p.id === 'eo-2')
    expect(named.source).toBe(entity.ENTITY_SOURCE)
    expect(named.sourceTier).toBe('client')
    expect(named.sourceLabel).toContain('Tom Boyd')
    expect(named.setBy).toEqual({ byId: 'adv-t', byName: 'Tom Boyd', at: '2026-09-10T00:00:00.000Z' })
    expect(nameless.sourceLabel).not.toMatch(/adv-|undefined|null/)
    expect(nameless.setBy.byName).toBeNull()
  })

  test('a bare-string decline (hand-edited dev file) is still honoured', () => {
    const out = entity.applyEntityLayer(advisorPoints(), { declines: ['fm-1'], own: [] })
    expect(out.map(p => p.id)).toEqual(['mo-eoy-1', 'ao-1'])
  })

  test('unusable client state leaves the advisor list standing, never empty, never a throw', () => {
    const mine = advisorPoints()
    expect(entity.applyEntityLayer(mine, null).map(p => p.id)).toEqual(mine.map(p => p.id))
    expect(entity.applyEntityLayer(mine, { declines: 'x', own: 42 }).map(p => p.id)).toEqual(mine.map(p => p.id))
    expect(entity.applyEntityLayer(mine, { own: [{ id: 'eo-9' }, null, { text: 'no id' }] }).map(p => p.id)).toEqual(mine.map(p => p.id))
    expect(entity.applyEntityLayer(undefined, undefined)).toEqual([])
  })
})

describe('meetingObservationsEntity — entitySetAsidePoints', () => {
  test('offers back only points still in the advisor list, each naming who set it aside', () => {
    const mine = advisorPoints()
    const declines = [
      { id: 'mo-eoy-1', byId: 'adv-r', byName: 'Ruth Kelleher', at: null },
      // Set aside for the client AND by the advisor for themselves: not in the input, not offered.
      { id: 'mo-eoy-2', byId: 'adv-r', byName: 'Ruth Kelleher', at: null },
      // The firm removed this point since: not offered, the stored decline survives.
      { id: 'fm-gone', byId: 'adv-r', byName: 'Ruth Kelleher', at: null }
    ]
    const out = entity.entitySetAsidePoints(mine, declines)
    expect(out.map(p => p.id)).toEqual(['mo-eoy-1'])
    expect(out[0].setAsideLabel).toContain('Ruth Kelleher')
    expect(out[0].sourceTier).toBe('platform')
    expect(entity.entitySetAsidePoints(mine, [])).toEqual([])
  })
})

describe('meetingObservationsEntity — readers', () => {
  test('readEntityDeclines keeps well-formed rows, de-duplicates, and reads a bare id as nameless', () => {
    const out = entity.readEntityDeclines({
      scenarios: {
        [EOY]: [
          { id: 'mo-eoy-1', byId: 'adv-r', byName: '  Ruth Kelleher ', at: '2026-09-10T00:00:00.000Z' },
          { id: 'mo-eoy-1', byId: 'adv-x', byName: 'Duplicate' },
          'fm-1',
          { byName: 'no id' },
          7
        ],
        other: 'not a list'
      }
    })
    expect(out.scenarios[EOY]).toEqual([
      { id: 'mo-eoy-1', byId: 'adv-r', byName: 'Ruth Kelleher', at: '2026-09-10T00:00:00.000Z' },
      { id: 'fm-1', byId: null, byName: null, at: null }
    ])
    expect(out.scenarios.other).toBeUndefined()
    expect(entity.readEntityDeclines(null)).toEqual({ scenarios: {} })
    expect(entity.readEntityDeclines([])).toEqual({ scenarios: {} })
  })

  test('readEntityOwn validates each point through the advisor validator and keeps the high-water mark', () => {
    const out = entity.readEntityOwn({
      scenarios: {
        [EOY]: [
          { id: 'eo-1', text: 'Fine.', hintWords: ['a', ' ', 'b'], cannotHear: true, byId: 'adv-t', byName: 'Tom Boyd', at: 'x' },
          { id: 'eo-2', text: '' },
          { text: 'no id' },
          { id: 'eo-3', text: 'x'.repeat(10000) }
        ]
      },
      nextSeq: { [EOY]: 3, bad: -1, worse: 'q' }
    })
    expect(out.scenarios[EOY]).toEqual([
      { id: 'eo-1', text: 'Fine.', hintWords: ['a', 'b'], cannotHear: true, byId: 'adv-t', byName: 'Tom Boyd', at: 'x' }
    ])
    expect(out.nextSeq).toEqual({ [EOY]: 3 })
    expect(entity.readEntityOwn('nonsense')).toEqual({ scenarios: {}, nextSeq: {} })
  })

  test('readEntityOwn caps a scenario at the shared maximum', () => {
    const rows = []
    for (let i = 1; i <= entity.MAX_OWN_POINTS_PER_SCENARIO + 5; i++) { rows.push({ id: 'eo-' + i, text: 'p' + i }) }
    const out = entity.readEntityOwn({ scenarios: { [EOY]: rows } })
    expect(out.scenarios[EOY].length).toBe(entity.MAX_OWN_POINTS_PER_SCENARIO)
  })
})

describe('meetingObservationsEntity — nextEntityPointId', () => {
  test('never reissues a removed id: the high-water mark wins over the live rows', () => {
    expect(entity.nextEntityPointId([], undefined)).toEqual({ id: 'eo-1', seq: 1 })
    expect(entity.nextEntityPointId([{ id: 'eo-1' }, { id: 'eo-3' }], undefined)).toEqual({ id: 'eo-4', seq: 4 })
    // The highest row was removed; the mark remembers it.
    expect(entity.nextEntityPointId([{ id: 'eo-1' }], 3)).toEqual({ id: 'eo-4', seq: 4 })
    // A corrupt mark degrades to the rows rather than minting nonsense.
    expect(entity.nextEntityPointId([{ id: 'eo-2' }], -9)).toEqual({ id: 'eo-3', seq: 3 })
    expect(entity.nextEntityPointId([{ id: 'ao-7' }], undefined)).toEqual({ id: 'eo-1', seq: 1 })
  })
})

describe('meetingObservationsEntity — labels', () => {
  test('the tier label table adds the client level to the advisor level\'s three', () => {
    expect(entity.SOURCE_TIER_LABELS).toEqual({ ...advisor.SOURCE_TIER_LABELS, client: 'For this client' })
  })
})

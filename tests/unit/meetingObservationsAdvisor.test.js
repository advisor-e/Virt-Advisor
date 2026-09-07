'use strict'

/**
 * The ADVISOR'S OWN LEVEL of the observation-point cascade — the resolution itself.
 *
 * Design: design/mockups/meeting-preset-advisor-level.html, all six questions ruled by Mike
 * 2026-09-08 and the drawing approved to build from.
 *
 * Per the testing ruling (2026-08-24) nothing here asserts wording for its own sake. The
 * three source labels ARE pinned, once, because they are the answer to question 3 and a
 * silent change to them would misattribute a firm's words to Advisor-e — see that test's own
 * comment. What UAT cannot see, and these pin:
 *
 * - 🔴 the SOURCE TIER, which needs two signals and is wrong with either one alone. A firm
 *   that edits a platform point keeps the platform ID — identity is never editable — so the
 *   prefix alone says "From Advisor-e" about words the firm wrote. A middle tier's own point
 *   reaches the firm marked `inherited`, so the firm's badge alone says "From Advisor-e"
 *   about words a country group wrote. Both look completely normal on screen;
 * - that an advisor's layer NEVER changes the firm's list, which is P14 and the whole
 *   permission model;
 * - that a removed point's id is not handed to the next one added, which would silently
 *   re-attach an old decline — and, worse, match a stale id in a stored coaching report.
 */

const {
  ADVISOR_SOURCE_LABELS,
  SOURCE_TIER_LABELS,
  MAX_OWN_POINTS_PER_SCENARIO,
  validateAdvisorPoint,
  readAdvisorDeclines,
  readAdvisorOwn,
  stateForAdvisor,
  sourceTierOf,
  applyAdvisorLayer,
  setAsidePoints,
  setAsideSummary,
  nextAdvisorPointId
} = require('../../server/utils/meetingObservationsAdvisor')

const { OBSERVATION_SOURCE_LABELS } = require('../../server/utils/meetingObservations')

/** The firm's resolved list, as loadResolvedObservations stamps it at the firm scope. */
const FIRM_POINTS = [
  { id: 'mo-eoy-1', text: 'The meeting was framed.', source: OBSERVATION_SOURCE_LABELS.inherited },
  { id: 'mo-eoy-2', text: 'A metaphor was used.', source: OBSERVATION_SOURCE_LABELS.override },
  { id: 'fm-3', text: 'Our own question was asked.', source: OBSERVATION_SOURCE_LABELS.own },
  { id: 'gm-9', text: "The country group's question.", source: OBSERVATION_SOURCE_LABELS.inherited }
]

describe('which tier an advisor is told a point came from', () => {
  it('reads the platform prefix on a point nobody has touched', () => {
    expect(sourceTierOf({ id: 'mo-eoy-1', firmSource: OBSERVATION_SOURCE_LABELS.inherited })).toBe('platform')
  })

  it("treats the mentor's own additions as the platform's", () => {
    // `mm-` is the mentor's own-row prefix. To an advisor the mentor IS Advisor-e; the
    // distinction between the shipped file and the mentor's later additions is ours.
    expect(sourceTierOf({ id: 'mm-4', firmSource: OBSERVATION_SOURCE_LABELS.inherited })).toBe('platform')
  })

  it('🔴 says FIRM for a platform point the firm has edited, though the id is still the platform id', () => {
    // The failure this prevents: an id is identity and is never editable, so a firm's
    // rewording of a platform point keeps `mo-`. Reading the prefix alone would tell an
    // advisor Advisor-e wrote words their own firm wrote — and send them to the wrong person
    // when they ask why it is on their list.
    expect(sourceTierOf({ id: 'mo-eoy-2', firmSource: OBSERVATION_SOURCE_LABELS.override })).toBe('firm')
  })

  it('🔴 says FIRM for a middle tier\'s own point, which reaches the firm marked inherited', () => {
    // The mirror-image failure: a country group's own point arrives at the firm as
    // `inherited`, so the firm's badge alone would say "From Advisor-e". The prefix catches
    // it. Neither signal covers both cases, which is why the function reads both.
    expect(sourceTierOf({ id: 'gm-9', firmSource: OBSERVATION_SOURCE_LABELS.inherited })).toBe('firm')
    expect(sourceTierOf({ id: 'xm-2', firmSource: OBSERVATION_SOURCE_LABELS.inherited })).toBe('firm')
  })

  it('says ADVISOR for a point this advisor added', () => {
    expect(sourceTierOf({ id: 'ao-1', source: ADVISOR_SOURCE_LABELS.own })).toBe('advisor')
  })

  it('falls back to FIRM for an id whose prefix nobody recognises', () => {
    // Deliberately not `platform`: being wrong towards "your firm" sends an advisor to
    // somebody who can actually answer.
    expect(sourceTierOf({ id: 'wat-7', firmSource: OBSERVATION_SOURCE_LABELS.inherited })).toBe('firm')
    expect(sourceTierOf(null)).toBe('firm')
  })

  it('pins the three approved labels, because a silent change misattributes authorship', () => {
    // 🔴 LOAD-BEARING WORDING, and the one place it is pinned. These are Mike's ruling of
    // 2026-09-08 (question 3): five tiers collapse to THREE labels, the middle two folding
    // into the firm. If "From your firm" ever drifted onto a platform point, or the middle
    // tiers gained a fourth label, an advisor would be told the wrong organisation is
    // accountable for what they are assessed against. That is not a wording preference.
    expect(SOURCE_TIER_LABELS).toEqual({
      platform: 'From Advisor-e',
      firm: 'From your firm',
      advisor: 'Added by you'
    })
  })
})

describe('applying the advisor layer', () => {
  it('stamps every point with a tier and its label', () => {
    const out = applyAdvisorLayer(FIRM_POINTS, { declines: [], own: [] })
    expect(out.map(p => p.sourceTier)).toEqual(['platform', 'firm', 'firm', 'firm'])
    expect(out.every(p => typeof p.sourceLabel === 'string' && p.sourceLabel)).toBe(true)
  })

  it('removes a point the advisor set aside, and only for them', () => {
    const out = applyAdvisorLayer(FIRM_POINTS, { declines: ['mo-eoy-1'], own: [] })
    expect(out.map(p => p.id)).toEqual(['mo-eoy-2', 'fm-3', 'gm-9'])
    // 🔴 P14: the advisor's layer must never mutate what it was given. The firm's list is
    // shared by every advisor in the firm and is resolved once per request.
    expect(FIRM_POINTS.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'fm-3', 'gm-9'])
    expect(FIRM_POINTS[0].source).toBe(OBSERVATION_SOURCE_LABELS.inherited)
  })

  it("adds the advisor's own points after the firm's, carrying their hint words", () => {
    const own = [{ id: 'ao-1', text: 'I asked what had changed at home.', hintWords: ['at home'] }]
    const out = applyAdvisorLayer(FIRM_POINTS, { declines: [], own })
    expect(out).toHaveLength(5)
    expect(out[4].id).toBe('ao-1')
    expect(out[4].sourceTier).toBe('advisor')
    // Mike's ruling of 2026-09-08 REVERSED the recommendation to withhold these. A point an
    // advisor wrote is the one the model is least likely to recognise without them.
    expect(out[4].hintWords).toEqual(['at home'])
  })

  it('survives unusable stored state by showing the firm\'s list rather than nothing', () => {
    // An advisor with no list cannot walk into the meeting holding one (Brief §3).
    expect(applyAdvisorLayer(FIRM_POINTS, null).map(p => p.id))
      .toEqual(['mo-eoy-1', 'mo-eoy-2', 'fm-3', 'gm-9'])
    expect(applyAdvisorLayer(null, { declines: [], own: [] })).toEqual([])
  })
})

describe('the points an advisor has set aside', () => {
  it('returns them so the screen can offer them back', () => {
    const out = setAsidePoints(FIRM_POINTS, ['mo-eoy-1', 'fm-3'])
    expect(out.map(p => p.id)).toEqual(['mo-eoy-1', 'fm-3'])
    expect(out.map(p => p.sourceTier)).toEqual(['platform', 'firm'])
  })

  it('drops a decline whose point the firm has since removed, without losing the decline', () => {
    // The stored decline is not this function's to clean up: the firm may put the point
    // back, and the advisor's decision about it should survive that. What must not happen is
    // a bare id rendering on screen as a point.
    expect(setAsidePoints(FIRM_POINTS, ['mo-gone-99'])).toEqual([])
  })

  it('returns nothing when nothing is set aside', () => {
    expect(setAsidePoints(FIRM_POINTS, [])).toEqual([])
    expect(setAsidePoints(FIRM_POINTS, null)).toEqual([])
  })
})

describe('minting an own-point id', () => {
  it('counts past the highest id held', () => {
    const held = [{ id: 'ao-1' }, { id: 'ao-4' }]
    expect(nextAdvisorPointId(held, 0).id).toBe('ao-5')
  })

  it('🔴 counts past the STORED MARK when the highest id has been removed', () => {
    // The fault this exists for, and it is the one the live rows cannot see. Remove `ao-2`
    // and the rows say the highest held is `ao-1`, so the next point takes `ao-2` straight
    // back. A reused id matches the removed point in any coaching report already stored
    // against it — a report about a point the advisor no longer has, reading as a report
    // about the one they have just written. Nothing on any screen would look wrong.
    //
    // ⚠ Found by a ROUTE test on 2026-09-08, not by review and not by the case above, which
    // happened to delete a middle id and passed against the broken version.
    expect(nextAdvisorPointId([{ id: 'ao-1' }], 2).id).toBe('ao-3')
  })

  it('degrades to the live rows when the mark is missing, rather than colliding', () => {
    // Data written before the mark existed, or a hand-edited dev file, must still not hand
    // out an id that is sitting right there in the list.
    expect(nextAdvisorPointId([{ id: 'ao-1' }, { id: 'ao-4' }], undefined).id).toBe('ao-5')
    expect(nextAdvisorPointId([{ id: 'ao-3' }], 1).id).toBe('ao-4')
  })

  it('starts at 1 and ignores ids of other shapes', () => {
    expect(nextAdvisorPointId([], 0)).toEqual({ id: 'ao-1', seq: 1 })
    expect(nextAdvisorPointId(null, null).id).toBe('ao-1')
    expect(nextAdvisorPointId([{ id: 'fm-9' }, { id: 'ao-2' }], 0).id).toBe('ao-3')
  })
})

describe('validating a point an advisor wrote', () => {
  it('requires text when creating', () => {
    expect(validateAdvisorPoint({ hintWords: ['x'] }, { requireText: true }).ok).toBe(false)
    expect(validateAdvisorPoint({ text: '   ' }, { requireText: true }).ok).toBe(false)
  })

  it('accepts hint words, which is Mike\'s ruling and not the recommendation', () => {
    const r = validateAdvisorPoint({ text: 'I asked about home.', hintWords: [' at home ', ''] }, { requireText: true })
    expect(r.ok).toBe(true)
    expect(r.value.hintWords).toEqual(['at home'])
  })

  it('refuses a field it does not know, rather than dropping it quietly', () => {
    // Fails closed for the same reason the manager's validator does: a field the store
    // accepts and no screen renders is an advisor believing they changed something.
    expect(validateAdvisorPoint({ text: 'x', cannotHear: true }, {}).ok).toBe(false)
    // 🔴 `advisorText` in particular: an advisor has no second voice to write in, and
    // accepting it would let one person store wording the firm never sees.
    expect(validateAdvisorPoint({ text: 'x', advisorText: 'y' }, {}).ok).toBe(false)
  })

  it('refuses text past the shared length cap', () => {
    expect(validateAdvisorPoint({ text: 'x'.repeat(301) }, { requireText: true }).ok).toBe(false)
  })

  it('🔴 refuses an over-long hint phrase rather than dropping it and answering 200', () => {
    // Found by review 2026-09-08. It was filtered out in silence, so the advisor was told
    // their hint was saved when it was not — the one thing a person in UAT cannot see,
    // because the screen shows exactly what they typed either way.
    const r = validateAdvisorPoint(
      { text: 'I asked about home.', hintWords: ['x'.repeat(121)] }, { requireText: true })
    expect(r.ok).toBe(false)
    // and it stores none of them rather than a silently shortened list
    expect(r.value.hintWords).toBeUndefined()
  })

  it('refuses a hint phrase that is not text', () => {
    const r = validateAdvisorPoint(
      { text: 'I asked about home.', hintWords: [42] }, { requireText: true })
    expect(r.ok).toBe(false)
  })

  it('still accepts a phrase at exactly the cap, so the refusal is the length and not the field', () => {
    const r = validateAdvisorPoint(
      { text: 'I asked about home.', hintWords: ['x'.repeat(120)] }, { requireText: true })
    expect(r.ok).toBe(true)
    expect(r.value.hintWords).toHaveLength(1)
  })
})

describe('reading stored advisor maps', () => {
  it('keeps a well-formed entry with its captured name', () => {
    const map = readAdvisorDeclines({
      'adv-1': { name: 'Ruth Kelleher', scenarios: { eoy_meeting: ['mo-eoy-1'] } }
    })
    expect(map['adv-1'].name).toBe('Ruth Kelleher')
    expect(map['adv-1'].scenarios.eoy_meeting).toEqual(['mo-eoy-1'])
  })

  it('drops an advisor whose decisions are all gone, so the manager screen has no ghosts', () => {
    expect(readAdvisorDeclines({ 'adv-1': { name: 'Ruth', scenarios: {} } })).toEqual({})
    expect(readAdvisorDeclines({ 'adv-1': { name: 'Ruth', scenarios: { eoy_meeting: [] } } })).toEqual({})
  })

  it('never throws on malformed storage, and keeps what is usable', () => {
    // One bad row must not stop an advisor opening the screen.
    expect(readAdvisorDeclines(null)).toEqual({})
    expect(readAdvisorDeclines('nonsense')).toEqual({})
    expect(readAdvisorDeclines([])).toEqual({})
    const mixed = readAdvisorDeclines({
      'adv-1': 'broken',
      'adv-2': { name: 42, scenarios: { eoy_meeting: ['mo-eoy-1', 7, null] } }
    })
    expect(Object.keys(mixed)).toEqual(['adv-2'])
    expect(mixed['adv-2'].name).toBeNull()
    expect(mixed['adv-2'].scenarios.eoy_meeting).toEqual(['mo-eoy-1'])
  })

  it('caps how many own points one advisor can hold in one meeting type', () => {
    const rows = []
    for (let i = 1; i <= MAX_OWN_POINTS_PER_SCENARIO + 5; i += 1) {
      rows.push({ id: 'ao-' + i, text: 'point ' + i })
    }
    const map = readAdvisorOwn({ 'adv-1': { name: 'Ruth', scenarios: { eoy_meeting: rows } } })
    expect(map['adv-1'].scenarios.eoy_meeting).toHaveLength(MAX_OWN_POINTS_PER_SCENARIO)
  })

  it('drops an own point with no text, which would render as a blank row', () => {
    const map = readAdvisorOwn({
      'adv-1': { name: 'Ruth', scenarios: { eoy_meeting: [{ id: 'ao-1' }, { id: 'ao-2', text: 'kept' }] } }
    })
    expect(map['adv-1'].scenarios.eoy_meeting.map(p => p.id)).toEqual(['ao-2'])
  })
})

describe('one advisor\'s slice of the maps', () => {
  const declines = { 'adv-1': { name: 'Ruth', scenarios: { eoy_meeting: ['mo-eoy-1'] } } }
  const own = { 'adv-2': { name: 'Tom', scenarios: { eoy_meeting: [{ id: 'ao-1', text: 'mine' }] } } }

  it('returns only that advisor, never a colleague\'s', () => {
    expect(stateForAdvisor(declines, own, 'adv-1').declines.eoy_meeting).toEqual(['mo-eoy-1'])
    expect(stateForAdvisor(declines, own, 'adv-1').own).toEqual({})
    expect(stateForAdvisor(declines, own, 'adv-2').declines).toEqual({})
  })

  it('returns nothing for an advisor with no decisions, and for no advisor at all', () => {
    expect(stateForAdvisor(declines, own, 'adv-9')).toEqual({ declines: {}, own: {} })
    expect(stateForAdvisor(declines, own, null)).toEqual({ declines: {}, own: {} })
  })
})

describe("what the manager sees of their advisors' decisions", () => {
  // Ordered by Mike 2026-09-08 in the same breath as permitting the decisions themselves:
  // "yes but fix the issue - build it so the manager can see".
  const DECLINES = {
    'adv-1': { name: 'Ruth Kelleher', scenarios: { eoy_meeting: ['mo-eoy-1', 'fm-3'] } },
    'adv-2': { name: 'Tom Boyd', scenarios: { eoy_meeting: ['mo-eoy-1'] } },
    'adv-3': { name: null, scenarios: { eoy_meeting: ['mo-eoy-1'] } },
    'adv-4': { name: 'Aisling Ward', scenarios: { client_sales: ['mo-eoy-1'] } }
  }

  it('counts and names who set each point aside, in this meeting type only', () => {
    const rows = setAsideSummary(FIRM_POINTS, DECLINES, 'eoy_meeting')
    const first = rows.filter(r => r.id === 'mo-eoy-1')[0]
    // adv-4 declined the same id in a DIFFERENT meeting type and must not be counted here.
    expect(first.count).toBe(3)
    expect(first.setAsideBy.map(w => w.name)).toEqual(['Ruth Kelleher', 'Tom Boyd', null])
  })

  it('🔴 lists every point, including the ones nobody has set aside', () => {
    const rows = setAsideSummary(FIRM_POINTS, DECLINES, 'eoy_meeting')
    // A screen listing only the exceptions cannot be read as reassurance, because an empty
    // screen and a broken screen look identical. The drawing makes this argument itself.
    expect(rows).toHaveLength(FIRM_POINTS.length)
    expect(rows.filter(r => r.id === 'gm-9')[0]).toEqual({
      id: 'gm-9', text: "The country group's question.", count: 0, setAsideBy: []
    })
  })

  it('sorts by name with nameless entries last, so the list does not reshuffle', () => {
    // Two identical loads returning different orders would read as the list having changed
    // when nothing had. Nameless entries sort last: they are the ones a manager can act on
    // least, and a name is only ever absent for a decision stored before tokens carried one.
    const rows = setAsideSummary(FIRM_POINTS, DECLINES, 'eoy_meeting')
    const who = rows.filter(r => r.id === 'mo-eoy-1')[0].setAsideBy
    expect(who[who.length - 1].name).toBeNull()
    expect(who[who.length - 1].advisorId).toBe('adv-3')
  })

  it("carries no denominator, because this app cannot know a firm's headcount", () => {
    // 🔴 NOT AN OMISSION. The drawing said "4 of 12" and its wording table insisted the
    // denominator always be shown. config/db-schema.sql states four times that this app holds
    // no advisors table — advisors belong to Advisor-e. The nearest figure counts advisors
    // with ACTIVITY records, a different number: a firm of twelve where eight have used the
    // app would print "4 of 8" and call it the firm. Put to Mike with the evidence on
    // 2026-09-08 and ruled: show only what the app can know.
    const rows = setAsideSummary(FIRM_POINTS, DECLINES, 'eoy_meeting')
    rows.forEach((r) => {
      expect(Object.keys(r).sort()).toEqual(['count', 'id', 'setAsideBy', 'text'])
    })
  })

  it('omits a decline whose point the firm has since removed', () => {
    const stale = { 'adv-1': { name: 'Ruth', scenarios: { eoy_meeting: ['mo-gone-99'] } } }
    const rows = setAsideSummary(FIRM_POINTS, stale, 'eoy_meeting')
    // Nothing for a manager to act on: the point is not offered any more. The stored decline
    // survives, because the firm may put the point back.
    expect(rows.every(r => r.count === 0)).toBe(true)
  })

  it('never throws on malformed storage', () => {
    expect(setAsideSummary(FIRM_POINTS, null, 'eoy_meeting').every(r => r.count === 0)).toBe(true)
    expect(setAsideSummary(FIRM_POINTS, { 'adv-1': 'broken' }, 'eoy_meeting').every(r => r.count === 0)).toBe(true)
    expect(setAsideSummary(null, DECLINES, 'eoy_meeting')).toEqual([])
  })
})

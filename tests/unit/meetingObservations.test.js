'use strict'

/**
 * Guards `server/utils/meetingObservations.js` — Meeting Review slice 1, the observation
 * points. Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` Stage A and B1, approved by Mike 2026-09-01.
 *
 * 🔴 THE TWO THAT MATTER, and neither is visible to a person testing in UAT.
 *
 * The first is ID COLLISION ACROSS TIERS. Own-row ids are minted per scope, so without
 * distinct prefixes the mentor's first added point and a firm's first added point are both
 * `1`. On screen that looks like two ordinary rows; underneath, the firm switching off "its"
 * point drops the mentor's instead, because every decline is keyed to an id. This is the
 * defect `firmStaircase.js` records as its Phase 5 fault, and it fails silently.
 *
 * The second is THE SCENARIO JOIN. Brief P12 rules that meeting types come from the
 * scenarios that already exist rather than a second list beside them. A registered id whose
 * logic tree has been renamed or removed produces a scenario with no name, which this module
 * drops — correct behaviour, and invisible. The test below is what makes the drop loud.
 *
 * Everything else here is ordinary correctness: the cascade, and storage that is malformed
 * rather than merely empty.
 */

const mo = require('../../server/utils/meetingObservations')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-test-1'
const EOY = 'eoy_meeting'

/**
 * An injected overlay reader over a plain `{ scopeId: { configKey: value } }` map.
 * Nothing here touches MySQL, and nothing reads the dev-JSON stand-ins.
 */
function readerFor (store) {
  return (scopeId, key) => {
    const scope = store[scopeId]
    if (!scope || !Object.prototype.hasOwnProperty.call(scope, key)) { return Promise.resolve(null) }
    return Promise.resolve(scope[key])
  }
}

/** No scope has decided anything. */
const NOTHING = readerFor({})

describe('a meeting type carries its own name', () => {
  // 🔴 REWRITTEN IN SLICE 1 (2026-09-02, MEETING-TYPES-CASCADE.md, approved by Mike). These
  // two tests used to enforce the DELETED P12 — that every type must be an id in
  // data/logic_trees.json, and that its name must be the tree's. Mike had never asked for
  // that rule, and it made the coaching trees the gatekeeper of what meetings can exist.
  test('every registered type reaches the screen — the trees no longer gate the list', () => {
    const registered = mo.registeredScenarioIds()
    const resolved = mo.meetingScenarios().map(s => s.id)
    expect(registered.length).toBeGreaterThan(0)
    expect(resolved).toEqual(registered)
  })

  test('every type has a name of its own, stored beside it', () => {
    mo.meetingScenarios().forEach((s) => {
      expect(typeof s.name).toBe('string')
      expect(s.name.length).toBeGreaterThan(0)
    })
  })

  test('🔴 slice 1 changed nothing an advisor reads — the names still match the trees', () => {
    // The one thing that proves a change of foundation was safe: the eleven names were
    // copied character for character, so the day the source moved, nothing on screen did.
    // ⚠ This pins the MIGRATION, not a rule. When Mike renames a type in mentor mode the
    // names diverge by design, and this test is then wrong and goes — it is not a licence
    // to keep them in step.
    const trees = require('../../data/logic_trees.json').trees
    mo.meetingScenarios().forEach((s) => {
      const tree = trees.filter(t => t.id === s.treeId)[0]
      expect(tree).toBeDefined()
      expect(s.name).toBe(tree.name)
    })
  })

  test('🔴 a type that names NO logic tree still reaches the screen', () => {
    // The single behaviour slice 1 exists to deliver, and the deleted rule made it
    // impossible. Exercised against a stand-in data file rather than asserted about a
    // literal, because the claim is about what the module does.
    jest.isolateModules(() => {
      jest.doMock('../../data/meeting-observations.json', () => ({
        scenarios: [
          { id: 'bad_news', name: 'Bad news conversation', points: [] },
          { id: 'eoy_meeting', name: 'End of year', treeId: 'eoy_meeting', points: [] }
        ]
      }), { virtual: false })
      const fresh = require('../../server/utils/meetingObservations')
      const types = fresh.meetingScenarios()
      expect(types.map(t => t.id)).toEqual(['bad_news', 'eoy_meeting'])
      expect(types[0].name).toBe('Bad news conversation')
      expect(types[0].treeId).toBeNull()
    })
    jest.dontMock('../../data/meeting-observations.json')
  })

  test('a type with no name at all is dropped — a nameless row helps nobody', () => {
    jest.isolateModules(() => {
      jest.doMock('../../data/meeting-observations.json', () => ({
        scenarios: [
          { id: 'nameless_xyz', points: [] },
          { id: 'blank_name_xyz', name: '   ', points: [] },
          { id: 'eoy_meeting', name: 'End of year', points: [] }
        ]
      }), { virtual: false })
      const fresh = require('../../server/utils/meetingObservations')
      expect(fresh.meetingScenarios().map(t => t.id)).toEqual(['eoy_meeting'])
    })
    jest.dontMock('../../data/meeting-observations.json')
  })

  test('the end-of-year meeting is one of them', () => {
    expect(mo.meetingScenarios().map(s => s.id)).toContain(EOY)
  })
})

describe('the shipped points', () => {
  // 🔴 THE ONE DELIBERATE WORDING PIN IN THIS FILE, and CLAUDE.md's testing rule is why
  // it is allowed: "Where wording genuinely must not drift — wording Mike has explicitly
  // approved — pin it in ONE test next to the data it protects."
  //
  // These four sentences are approved content, not interface copy. They are the questions
  // the model is later asked to find and quote, so a silent edit does not change a label —
  // it changes what an advisor is held to and what their coaching notes can say. Copied
  // character for character from design/mockups/meeting-review.html Stage A and B1.
  test('the four approved end-of-year points are exactly as Mike approved them', () => {
    expect(mo.basePointsFor(EOY)).toEqual([
      {
        id: 'mo-eoy-1',
        text: 'The meeting was framed — what we would cover and why, in the first two minutes.',
        advisorText: 'I framed the meeting — said what we would cover and why, in the first two minutes.'
      },
      {
        id: 'mo-eoy-2',
        text: 'A metaphor or analogy was used to explain a financial idea.',
        advisorText: 'I used a metaphor or an analogy to explain a financial idea.'
      },
      {
        id: 'mo-eoy-3',
        text: 'Understanding was checked before moving on from the figures.',
        advisorText: 'I checked understanding before moving on from the figures.'
      },
      {
        id: 'mo-eoy-4',
        text: 'Named actions were agreed, with an owner and a date, before the time ran out.',
        advisorText: 'We agreed named actions, with an owner and a date, before the time ran out.'
      }
    ])
  })

  test('every shipped point carries a platform id — a tier prefix here would be a bug', () => {
    mo.registeredScenarioIds().forEach((id) => {
      mo.basePointsFor(id).forEach((p) => {
        expect(p.id.indexOf(mo.PLATFORM_POINT_PREFIX)).toBe(0)
      })
    })
  })

  test('basePointsFor hands back a copy, so a caller cannot edit the shipped file', () => {
    const first = mo.basePointsFor(EOY)
    first[0].text = 'mutated'
    expect(mo.basePointsFor(EOY)[0].text).not.toBe('mutated')
  })

  test('the other meeting scenarios ship registered and empty, awaiting the mentor', () => {
    // Deliberate: writing points for them would be inventing advisory content nobody
    // asked for. The mentor authors them on screen. If one ever gains points here, that
    // was a decision and this test is where it gets noticed.
    mo.registeredScenarioIds()
      .filter(id => id !== EOY)
      .forEach(id => expect(mo.basePointsFor(id)).toEqual([]))
  })
})

describe('tier prefixes cannot collide', () => {
  test('every tier mints under a different prefix', () => {
    const prefixes = Object.keys(mo.POINT_PREFIX_BY_TIER).map(t => mo.POINT_PREFIX_BY_TIER[t])
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  test('no tier prefix collides with the platform prefix', () => {
    Object.keys(mo.POINT_PREFIX_BY_TIER).forEach((tier) => {
      expect(mo.POINT_PREFIX_BY_TIER[tier]).not.toBe(mo.PLATFORM_POINT_PREFIX)
    })
  })

  test('the mentor and a firm mint different ids for their first added point', () => {
    // The Phase 5 defect, stated as a test: same position, same count, different identity.
    expect(mo.nextOwnPointId(PLATFORM_SCOPE, [])).not.toBe(mo.nextOwnPointId(FIRM, []))
  })

  test('a deleted point never hands its id to the next one added', () => {
    // Counting from length would reissue `fm-2` after deleting it, and the new point would
    // inherit the deleted one's declines and overrides.
    const held = [{ id: 'fm-1', text: 'a' }, { id: 'fm-3', text: 'c' }]
    expect(mo.nextOwnPointId(FIRM, held)).toBe('fm-4')
  })
})

describe('resolving through the tier chain', () => {
  test('a scope that has decided nothing sees exactly what the layer above sees', async () => {
    const mentor = await mo.loadResolvedObservations(PLATFORM_SCOPE, NOTHING)
    const firm = await mo.loadResolvedObservations(FIRM, NOTHING)
    expect(firm).toEqual(mentor)
  })

  test('with nothing stored anywhere, a firm sees the shipped points', async () => {
    const firm = await mo.loadResolvedObservations(FIRM, NOTHING)
    expect(firm[EOY].points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3', 'mo-eoy-4'])
  })

  test('a firm declining a point removes it, and only for that firm', async () => {
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.declines]: { [EOY]: ['mo-eoy-2'] } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const mentor = await mo.loadResolvedObservations(PLATFORM_SCOPE, read)
    expect(firm[EOY].points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-3', 'mo-eoy-4'])
    expect(mentor[EOY].points.map(p => p.id)).toContain('mo-eoy-2')
  })

  test('a firm editing a point keeps its id and is badged as edited here', async () => {
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-1': { text: 'Our own framing check.' } } } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const edited = firm[EOY].points.filter(p => p.id === 'mo-eoy-1')[0]
    expect(edited.text).toBe('Our own framing check.')
    expect(edited.source).toBe(mo.OBSERVATION_SOURCE_LABELS.override)
    // The untouched half of the point still comes from above.
    expect(edited.advisorText).toBe('I framed the meeting — said what we would cover and why, in the first two minutes.')
  })

  test('the mentor\'s later edit still reaches a firm that has not touched that point', async () => {
    // The whole reason this uses resolveInheritedRows rather than replacing the array.
    const read = readerFor({
      [PLATFORM_SCOPE]: { [mo.CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-3': { text: 'Mentor reworded this.' } } } },
      [FIRM]: { [mo.CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-1': { text: 'Firm reworded this.' } } } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const byId = firm[EOY].points.reduce((o, p) => { o[p.id] = p; return o }, {})
    expect(byId['mo-eoy-3'].text).toBe('Mentor reworded this.')
    expect(byId['mo-eoy-1'].text).toBe('Firm reworded this.')
  })

  test('a point the firm added is appended and badged as added here', async () => {
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'We asked about succession.' }] } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const points = firm[EOY].points
    expect(points[points.length - 1].id).toBe('fm-1')
    expect(points[points.length - 1].source).toBe(mo.OBSERVATION_SOURCE_LABELS.own)
  })

  test('a point the MENTOR added is badged inherited at a firm that has decided nothing', async () => {
    // Item 4.59. `source` is stamped by whichever level applied decisions, so without the
    // restamp the mentor's own point reaches a firm still marked `added-here` — telling a
    // manager they wrote it, and sending their edit to the own-row route, which 404s.
    const read = readerFor({
      [PLATFORM_SCOPE]: { [mo.CONFIG_KEYS.own]: { [EOY]: [{ id: 'mm-1', text: 'The mentor wrote this.' }] } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const mentorPoint = firm[EOY].points.filter(p => p.id === 'mm-1')[0]
    expect(mentorPoint.source).toBe(mo.OBSERVATION_SOURCE_LABELS.inherited)
  })

  test('that badge does not change when the firm decides something unrelated', async () => {
    // The two paths — the passthrough above and resolveInheritedRows below — must agree, or
    // the badge on the mentor's point flips because of an edit somewhere else entirely.
    const mentorAdded = { [PLATFORM_SCOPE]: { [mo.CONFIG_KEYS.own]: { [EOY]: [{ id: 'mm-1', text: 'The mentor wrote this.' }] } } }
    const quiet = await mo.loadResolvedObservations(FIRM, readerFor(mentorAdded))
    const busy = await mo.loadResolvedObservations(FIRM, readerFor({
      ...mentorAdded,
      [FIRM]: { [mo.CONFIG_KEYS.declines]: { [EOY]: ['mo-eoy-2'] } }
    }))
    const sourceOf = resolved => resolved[EOY].points.filter(p => p.id === 'mm-1')[0].source
    expect(sourceOf(busy)).toBe(sourceOf(quiet))
  })

  test('a decline beats a stale override of the same point', async () => {
    const read = readerFor({
      [FIRM]: {
        [mo.CONFIG_KEYS.declines]: { [EOY]: ['mo-eoy-2'] },
        [mo.CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-2': { text: 'left behind' } } }
      }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    expect(firm[EOY].points.map(p => p.id)).not.toContain('mo-eoy-2')
  })

  test('a scenario is never renamed by a stored decision', async () => {
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'x' }] } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const trees = require('../../data/logic_trees.json').trees
    expect(firm[EOY].name).toBe(trees.filter(t => t.id === EOY)[0].name)
  })
})

describe('storage that is malformed rather than empty', () => {
  test('an override keyed to a point that does not exist injects nothing', async () => {
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.overrides]: { [EOY]: { 'mo-does-not-exist': { text: 'phantom' } } } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    expect(firm[EOY].points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3', 'mo-eoy-4'])
  })

  test('junk shapes are ignored rather than thrown on', async () => {
    const read = readerFor({
      [FIRM]: {
        [mo.CONFIG_KEYS.declines]: { [EOY]: 'not-an-array' },
        [mo.CONFIG_KEYS.overrides]: [1, 2, 3],
        [mo.CONFIG_KEYS.own]: { [EOY]: [{ noId: true }, { id: 'fm-9' }] }
      }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    // An own row with no text is not a check anyone can meet, so it is dropped.
    expect(firm[EOY].points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3', 'mo-eoy-4'])
  })

  test('a store fault falls back to the layer above and never rejects', async () => {
    // An advisor must not be left with no list to walk in holding — Brief §3, the list
    // pays before a word is recorded. A live-server refusal (sqlState set) is what this
    // simulates, which the dev fallback correctly declines to answer.
    const boom = (scopeId) => {
      if (scopeId === FIRM) {
        const err = new Error('refused')
        err.sqlState = '23000'
        return Promise.reject(err)
      }
      return Promise.resolve(null)
    }
    const firm = await mo.loadResolvedObservations(FIRM, boom)
    expect(firm[EOY].points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3', 'mo-eoy-4'])
  })
})

describe('validating what a manager submits', () => {
  test('an unknown field is rejected rather than quietly kept', () => {
    const { ok, errors } = mo.validatePointFields({ text: 'fine', weight: 5 })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('weight')
  })

  test('text is trimmed, and whitespace alone is not a point', () => {
    expect(mo.validatePointFields({ text: '  spaced  ' }).value.text).toBe('spaced')
    expect(mo.validatePointFields({ text: '   ' }).value.text).toBeUndefined()
  })

  test('a new point must actually have words', () => {
    expect(mo.validatePointFields({ text: '  ' }, { requireText: true }).ok).toBe(false)
    expect(mo.validatePointFields({ text: 'Ask about succession.' }, { requireText: true }).ok).toBe(true)
  })

  test('an over-long point is refused, not truncated', () => {
    const long = 'x'.repeat(mo.MAX_POINT_LENGTH + 1)
    const { ok, value } = mo.validatePointFields({ text: long })
    expect(ok).toBe(false)
    expect(value.text).toBeUndefined()
  })

  test('a non-string is refused', () => {
    expect(mo.validatePointFields({ text: 42 }).ok).toBe(false)
  })

  // ── Slice 3: marking a point that a recording cannot hear ──────────────────────────

  test('a point can be marked un-hearable, with optional words that hint at it', () => {
    const { ok, value } = mo.validatePointFields({
      text: 'I drew the numbers out.',
      cannotHear: true,
      hintWords: ['let me sketch this out', '  draw this for you  ']
    })
    expect(ok).toBe(true)
    expect(value.cannotHear).toBe(true)
    expect(value.hintWords).toEqual(['let me sketch this out', 'draw this for you'])
  })

  test('🔴 an explicit false is STORED, not dropped as empty', () => {
    // An override exists so a tier can switch off what it inherited. A false treated as
    // "nothing submitted" leaves the inherited true standing while the box shows unticked —
    // and the advisor is then asked to confirm something the model could have found.
    const { ok, value } = mo.validatePointFields({ cannotHear: false })
    expect(ok).toBe(true)
    expect(value.cannotHear).toBe(false)
  })

  test('cannotHear must be a boolean, not a string a form happened to send', () => {
    expect(mo.validatePointFields({ cannotHear: 'true' }).ok).toBe(false)
    expect(mo.validatePointFields({ cannotHear: 1 }).ok).toBe(false)
  })

  test('hint words must be a list of text, within sane limits', () => {
    expect(mo.validatePointFields({ hintWords: 'let me sketch this out' }).ok).toBe(false)
    expect(mo.validatePointFields({ hintWords: [42] }).ok).toBe(false)
    expect(mo.validatePointFields({ hintWords: ['x'.repeat(mo.MAX_HINT_LENGTH + 1)] }).ok).toBe(false)
    const tooMany = new Array(mo.MAX_HINT_WORDS + 1).fill('a phrase')
    expect(mo.validatePointFields({ hintWords: tooMany }).ok).toBe(false)
  })

  test('blank hint phrases are dropped rather than stored as empty needles', () => {
    // An empty phrase would match every segment and raise a hint on every meeting.
    const { value } = mo.validatePointFields({ hintWords: ['   ', 'let me sketch this out'] })
    expect(value.hintWords).toEqual(['let me sketch this out'])
  })
})

describe('the advisor reads the points in their own voice', () => {
  test('the first-person form is used where the author wrote one', async () => {
    const firm = await mo.loadResolvedObservations(FIRM, NOTHING)
    const preset = mo.asAdvisorPreset(firm[EOY])
    expect(preset[0].text).toBe('I framed the meeting — said what we would cover and why, in the first two minutes.')
  })

  test('a point added by a manager is shown verbatim, never rewritten into "I …"', async () => {
    // Rewriting by rule would be the app putting words in a manager's mouth.
    const read = readerFor({
      [FIRM]: { [mo.CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'Succession was raised.' }] } }
    })
    const firm = await mo.loadResolvedObservations(FIRM, read)
    const preset = mo.asAdvisorPreset(firm[EOY])
    expect(preset[preset.length - 1].text).toBe('Succession was raised.')
  })

  test('an empty scenario presets to an empty list rather than throwing', () => {
    expect(mo.asAdvisorPreset(undefined)).toEqual([])
    expect(mo.asAdvisorPreset({ points: null })).toEqual([])
  })
})

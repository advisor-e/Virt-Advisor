'use strict'

// Exercises strategySessionStore — the store behind the Strategy Planner (item 15.1),
// whose absence is the reason the impact test measured 0 capturable frameworks and 0
// answers surviving to the next session.
//
// WHAT THESE TESTS ARE FOR, and it is not coverage for its own sake. Three things here
// look perfectly fine to a person in UAT right up until a client is harmed by them:
//
//   1. FIRM SCOPING. A session read across a firm boundary returns data about another
//      firm's client. A tester with one login never sees it.
//   2. THE UPSERT. A capture box is a live worksheet; if a save appends instead of
//      replacing, an advisor's correction sits under the thing they corrected and the
//      plan quotes the wrong figure. On screen it looks like it saved.
//   3. THE AUDIT TRAIL. A 'transcript' entry without its original passage silently
//      destroys Original | AI Suggestion | Final Approved Value — Decision 11's whole
//      protection — and nothing on screen says so.
//
// And the timeline, which is Decision 11's mechanism: two fields open at once means a
// passage of speech belongs to two boxes, and the apportioning becomes a guess.
//
// Uses an ISOLATED temp dev file (via STRATEGY_SESSION_DEV_FILE) rather than the shared
// data/dev-strategy-sessions.json — hermetic `npm test`, same convention as the
// activityStore and caseStore fallback suites.
//
// ⚠ WHAT IS AND IS NOT PROVED HERE, stated precisely because the difference matters.
// "what we do with what MySQL hands back" overrides the mock per call, so OUR handling of
// a driver response IS tested — the assigned id, a JSON column arriving parsed or as a
// string, an unparseable scope, affectedRows, and the refusal-never-falls-back rule.
// WHAT IS NOT TESTED IS THE SQL ITSELF: no statement in this module has ever run against
// a real server, because this laptop has no MySQL. A wrong column name or a broken JOIN
// would pass every test here. That check is desktop or UAT work and is recorded as
// outstanding in the handover rather than left to look finished.

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring the store — DEV_FILE resolves at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-strategy-sessions-${process.pid}.json`)
process.env.STRATEGY_SESSION_DEV_FILE = DEV_FILE

// DB always rejects with no sqlState → a connection-level failure → fallback permitted.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const store = require('../../server/utils/strategySessionStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }

const FIRM = 'firm-kestrel'
const OTHER_FIRM = 'firm-somebody-else'

function openSession (over) {
  return store.createSession(Object.assign({
    clientId: 'client-1',
    advisorId: 'adv-1',
    advisorName: 'D. Okafor',
    firmId: FIRM
  }, over || {}))
}

beforeEach(clean)
afterAll(clean)

describe('a session survives the round trip the decks depend on', () => {
  it('opens, reads back, and carries the advisor and client', async () => {
    const id = await openSession()
    const session = await store.getSession(id, FIRM)

    expect(session.id).toBe(id)
    expect(session.clientId).toBe('client-1')
    expect(session.advisorId).toBe('adv-1')
    expect(session.advisorName).toBe('D. Okafor')
    expect(session.status).toBe('open')
  })

  it('records no meeting by default, because the Planner never records anything', async () => {
    // Decision 10: audio is Meeting Review's job. meetingId stays null until that
    // feature's three non-coding gates clear, so null is the ordinary state and a
    // build that defaults it to something is claiming a recording exists.
    const session = await store.getSession(await openSession(), FIRM)
    expect(session.meetingId).toBeNull()
  })

  it('lists a client\'s sessions newest first, which is how the next session finds the last', async () => {
    const first = await openSession()
    const second = await openSession()
    const list = await store.listSessionsForClient('client-1', FIRM)

    expect(list.map(s => s.id)).toEqual([second, first])
  })

  it('keeps one client\'s sessions out of another client\'s list', async () => {
    await openSession({ clientId: 'client-1' })
    const other = await openSession({ clientId: 'client-2' })

    const list = await store.listSessionsForClient('client-2', FIRM)
    expect(list.map(s => s.id)).toEqual([other])
  })
})

describe('the firm boundary — what UAT with one login cannot see', () => {
  it('reads another firm\'s session as absent, not forbidden', async () => {
    // Absent rather than forbidden on purpose: a 403 confirms the id exists, so an id
    // could be probed for existence one number at a time.
    const id = await openSession()
    expect(await store.getSession(id, OTHER_FIRM)).toBeNull()
  })

  it('refuses to write an entry against another firm\'s session', async () => {
    const id = await openSession()

    const wrote = await store.saveEntry({
      sessionId: id,
      firmId: OTHER_FIRM,
      frameworkId: 'strategy-swot-pest',
      fieldKey: 'strengths',
      value: 'should never land'
    })

    expect(wrote).toBe(false)
    expect(await store.loadEntries(id, FIRM)).toEqual([])
  })

  it('returns no entries and no timeline to another firm', async () => {
    const id = await openSession()
    await store.saveEntry({
      sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'k', value: 'v'
    })
    await store.openField({
      sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'k'
    })

    expect(await store.loadEntries(id, OTHER_FIRM)).toEqual([])
    expect(await store.loadTimeline(id, OTHER_FIRM)).toEqual([])
  })

  it('will not re-scope another firm\'s session', async () => {
    const id = await openSession()
    const done = await store.setScope(id, OTHER_FIRM, { frameworks: ['x'] })

    expect(done).toBe(false)
    expect((await store.getSession(id, FIRM)).scope.frameworks).toEqual([])
  })
})

describe('a capture box is a live worksheet, so a save replaces', () => {
  it('overwrites the same box rather than appending beside it', async () => {
    const id = await openSession()
    const box = { sessionId: id, firmId: FIRM, frameworkId: 'strategy-swot-pest', fieldKey: 'strengths' }

    await store.saveEntry(Object.assign({ value: 'Own kiln' }, box))
    await store.saveEntry(Object.assign({ value: 'Own kiln — no drying lead time' }, box))

    const entries = await store.loadEntries(id, FIRM)
    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe('Own kiln — no drying lead time')
  })

  it('keeps different boxes in the same framework apart', async () => {
    const id = await openSession()
    const base = { sessionId: id, firmId: FIRM, frameworkId: 'strategy-swot-pest' }

    await store.saveEntry(Object.assign({ fieldKey: 'strengths', value: 'A' }, base))
    await store.saveEntry(Object.assign({ fieldKey: 'weaknesses', value: 'B' }, base))

    const entries = await store.loadEntries(id, FIRM)
    expect(entries.map(e => [e.fieldKey, e.value]))
      .toEqual([['strengths', 'A'], ['weaknesses', 'B']])
  })

  it('keeps the same field key apart across two frameworks', async () => {
    // Porter's and SWOT can both have a 'notes' box. Keying on field alone would
    // have one framework overwrite the other, and the plan would quote the wrong one.
    const id = await openSession()
    const base = { sessionId: id, firmId: FIRM, fieldKey: 'notes' }

    await store.saveEntry(Object.assign({ frameworkId: 'strategy-swot-pest', value: 'swot note' }, base))
    await store.saveEntry(Object.assign({ frameworkId: 'strategy-porters-pine', value: 'porter note' }, base))

    const entries = await store.loadEntries(id, FIRM)
    expect(entries).toHaveLength(2)
  })
})

describe('the audit trail Decision 11 depends on', () => {
  it('refuses a transcript entry with no original passage', async () => {
    const id = await openSession()

    await expect(store.saveEntry({
      sessionId: id,
      firmId: FIRM,
      frameworkId: 'strategy-swot-pest',
      fieldKey: 'strengths',
      value: 'Tidied by the model',
      source: 'transcript'
    })).rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  it('keeps the spoken words beside the tidied sentence', async () => {
    const id = await openSession()
    await store.saveEntry({
      sessionId: id,
      firmId: FIRM,
      frameworkId: 'strategy-swot-pest',
      fieldKey: 'strengths',
      value: 'Two joiners with over twenty years on heritage work.',
      source: 'transcript',
      originalText: 'well weve got er two lads been doing the heritage stuff twenty odd years'
    })

    const entry = (await store.loadEntries(id, FIRM))[0]
    expect(entry.source).toBe('transcript')
    expect(entry.originalText).toContain('twenty odd years')
  })

  it('defaults a typed entry to typed, with no original passage', async () => {
    const id = await openSession()
    await store.saveEntry({
      sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'k', value: 'typed by hand'
    })

    const entry = (await store.loadEntries(id, FIRM))[0]
    expect(entry.source).toBe('typed')
    expect(entry.originalText).toBeNull()
  })

  it('rejects a source nobody defined', async () => {
    const id = await openSession()
    await expect(store.saveEntry({
      sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'k', value: 'v', source: 'guessed'
    })).rejects.toMatchObject({ code: 'BAD_INPUT' })
  })
})

describe('the navigation timeline — Decision 11\'s mechanism', () => {
  it('never leaves two fields open at once', async () => {
    // A passage of speech belongs to exactly one box. Two open fields makes the
    // apportioning a guess, which is the thing the ruling forbids.
    const id = await openSession()
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'one', at: '2026-09-16 14:02:00.000' })
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'two', at: '2026-09-16 14:09:00.000' })

    const timeline = await store.loadTimeline(id, FIRM)
    const open = timeline.filter(t => t.closedAt === null)

    expect(open).toHaveLength(1)
    expect(open[0].fieldKey).toBe('two')
  })

  it('closes the previous field at the moment the next one opens, leaving no gap', async () => {
    // A gap is speech belonging to no box. An overlap is speech belonging to two.
    const id = await openSession()
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'one', at: '2026-09-16 14:02:00.000' })
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'two', at: '2026-09-16 14:09:00.000' })

    const timeline = await store.loadTimeline(id, FIRM)
    expect(timeline[0].closedAt).toBe('2026-09-16 14:09:00.000')
    expect(timeline[1].openedAt).toBe('2026-09-16 14:09:00.000')
  })

  it('closes the last field when the advisor leaves', async () => {
    const id = await openSession()
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'one', at: '2026-09-16 14:02:00.000' })
    await store.closeOpenField(id, FIRM, '2026-09-16 14:30:00.000')

    const timeline = await store.loadTimeline(id, FIRM)
    expect(timeline.every(t => t.closedAt !== null)).toBe(true)
  })

  it('keeps millisecond precision, because whole seconds make a boundary a coin-flip', async () => {
    const id = await openSession()
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'one', at: '2026-09-16 14:02:07.482' })

    const timeline = await store.loadTimeline(id, FIRM)
    expect(timeline[0].openedAt).toBe('2026-09-16 14:02:07.482')
  })

  it('orders the timeline oldest first, which is the order a recording runs in', async () => {
    const id = await openSession()
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'a', at: '2026-09-16 14:02:00.000' })
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'b', at: '2026-09-16 14:20:00.000' })
    await store.openField({ sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'c', at: '2026-09-16 14:41:00.000' })

    const keys = (await store.loadTimeline(id, FIRM)).map(t => t.fieldKey)
    expect(keys).toEqual(['a', 'b', 'c'])
  })
})

describe('the scope screen 1 records', () => {
  it('starts empty, because Decision 1 pre-ticks nothing', async () => {
    // An empty scope is a REAL state — a session opened and not yet scoped — so it
    // must read back as empty arrays rather than as a missing value. `steps: []` is
    // the same thing for the step builder, and is NOT the same as "one step": a
    // session saved before that screen existed has no steps, and the page decides
    // what to show rather than this module inventing one nobody named.
    const session = await store.getSession(await openSession(), FIRM)
    // `suggestion: null` is the fourth empty, added with stage 6: a session nobody has
    // pressed "Suggest for this client" on has no suggestion, which is distinct from a
    // suggestion that came back with nothing in it.
    expect(session.scope).toEqual({ domains: [], frameworks: [], steps: [], suggestion: null })
  })

  it('records what the advisor ticked', async () => {
    const id = await openSession()
    await store.setScope(id, FIRM, {
      domains: ['business-targets', 'strategic-orientation'],
      frameworks: ['strategy-swot-pest', 'strategy-porters-pine']
    })

    const session = await store.getSession(id, FIRM)
    expect(session.scope.domains).toHaveLength(2)
    expect(session.scope.frameworks).toContain('strategy-swot-pest')
  })

  it('refuses a scope larger than any real session', async () => {
    const id = await openSession()
    const tooMany = new Array(201).fill('f')

    await expect(store.setScope(id, FIRM, { frameworks: tooMany }))
      .rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  // 🔴 DECISION C(b) — THE SUGGESTION AND THE TICKS ARE BOTH KEPT. Item 15.1 stage 6.
  // Both live in one `scope_json` that is replaced whole on every save, written by two
  // different screens at two different moments. Neither may erase the other, and on
  // screen nothing would show if one did: the advisor would see their ticks, exactly as
  // expected, with the record of what the AI proposed silently gone.
  describe("the AI's suggestion, kept beside the ticks", () => {
    const SUGGESTION = {
      at: '2026-09-22T09:00:00.000Z',
      concepts: [{ id: 'blue-ocean-strategy', reason: 'They need to stand apart.' }]
    }

    it('stores what the AI proposed without touching what the advisor ticked', async () => {
      const id = await openSession()
      await store.setScope(id, FIRM, { frameworks: ['strategy-swot-pest'] })
      await store.saveSuggestion(id, FIRM, SUGGESTION)

      const session = await store.getSession(id, FIRM)
      expect(session.scope.frameworks).toEqual(['strategy-swot-pest'])
      expect(session.scope.suggestion.concepts[0].id).toBe('blue-ocean-strategy')
    })

    it('SURVIVES the next tick — a scope save does not erase it', async () => {
      const id = await openSession()
      await store.saveSuggestion(id, FIRM, SUGGESTION)
      await store.setScope(id, FIRM, { frameworks: ['strategy-porters-pine'] })

      const session = await store.getSession(id, FIRM)
      expect(session.scope.suggestion.concepts[0].id).toBe('blue-ocean-strategy')
      expect(session.scope.frameworks).toEqual(['strategy-porters-pine'])
    })

    it('is replaced, not appended to, when the advisor asks a second time', async () => {
      const id = await openSession()
      await store.saveSuggestion(id, FIRM, SUGGESTION)
      await store.saveSuggestion(id, FIRM, {
        at: '2026-09-22T10:00:00.000Z',
        concepts: [{ id: 'porters-5-forces', reason: 'Second thoughts.' }]
      })

      const session = await store.getSession(id, FIRM)
      expect(session.scope.suggestion.concepts).toHaveLength(1)
      expect(session.scope.suggestion.concepts[0].id).toBe('porters-5-forces')
    })

    it('refuses a session belonging to another firm', async () => {
      const id = await openSession()
      expect(await store.saveSuggestion(id, 'firm-elsewhere', SUGGESTION)).toBe(false)
    })

    it('stores a suggestion that proposed nothing, which is not the same as none', async () => {
      const id = await openSession()
      await store.saveSuggestion(id, FIRM, { at: '2026-09-22T09:00:00.000Z', concepts: [] })

      const session = await store.getSession(id, FIRM)
      expect(session.scope.suggestion).not.toBeNull()
      expect(session.scope.suggestion.concepts).toEqual([])
    })
  })

  it('🔴 keeps a step that holds nothing, because that is a real step', async () => {
    // Mike's ruling, 2026-09-20. Pivot's step 5 "Do It & Review It" has no slides
    // behind it and still appears on the agenda a client reads. A round trip that
    // dropped it would delete the step every time the advisor moved on, and the
    // screen would look like it had simply forgotten what he typed.
    const id = await openSession()
    await store.setScope(id, FIRM, {
      frameworks: ['strategy-swot-pest'],
      steps: [
        { name: 'Identify the Resistance', items: ['fw-strategy-swot-pest'] },
        { name: 'Do It & Review It', items: [] }
      ]
    })

    const { steps } = (await store.getSession(id, FIRM)).scope
    expect(steps).toHaveLength(2)
    expect(steps[1]).toEqual({ name: 'Do It & Review It', items: [] })
  })

  it('a session saved before the step builder existed reads back with no steps', async () => {
    // Not "one step" — none. The page decides what to show an advisor opening an
    // older session; this module never invents a step nobody named.
    const id = await openSession()
    await store.setScope(id, FIRM, { frameworks: ['strategy-swot-pest'] })

    expect((await store.getSession(id, FIRM)).scope.steps).toEqual([])
  })

  it('refuses more steps than a session a human can hold', async () => {
    const id = await openSession()
    const tooMany = new Array(41).fill({ name: 's', items: [] })

    await expect(store.setScope(id, FIRM, { frameworks: [], steps: tooMany }))
      .rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  it('bounds a step name and its items rather than refusing the save', async () => {
    // A long name is the advisor typing, not an attack. It is cut to the column width
    // and stored; refusing would lose the rest of the session with it.
    const id = await openSession()
    await store.setScope(id, FIRM, {
      frameworks: [],
      steps: [{ name: 'x'.repeat(400), items: ['y'.repeat(400)] }]
    })

    const { steps } = (await store.getSession(id, FIRM)).scope
    expect(steps[0].name).toHaveLength(128)
    expect(steps[0].items[0]).toHaveLength(128)
  })

  it('survives a step that is not an object at all', async () => {
    const id = await openSession()
    await store.setScope(id, FIRM, { frameworks: [], steps: [null, 'nope', 7] })

    expect((await store.getSession(id, FIRM)).scope.steps)
      .toEqual([{ name: '', items: [] }, { name: '', items: [] }, { name: '', items: [] }])
  })
})

describe('bad input fails loudly rather than storing something wrong', () => {
  it('refuses a session with no firm', async () => {
    await expect(openSession({ firmId: '' })).rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  it('refuses an identifier longer than its column', async () => {
    await expect(openSession({ clientId: 'c'.repeat(65) }))
      .rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  it('refuses a session id that is not a positive whole number', async () => {
    await expect(store.getSession(0, FIRM)).rejects.toMatchObject({ code: 'BAD_INPUT' })
    await expect(store.getSession('not-a-number', FIRM)).rejects.toMatchObject({ code: 'BAD_INPUT' })
  })

  it('bounds a single capture value rather than letting it fill the column', async () => {
    const id = await openSession()
    await store.saveEntry({
      sessionId: id, firmId: FIRM, frameworkId: 'f', fieldKey: 'k', value: 'x'.repeat(30000)
    })

    const entry = (await store.loadEntries(id, FIRM))[0]
    expect(entry.value).toHaveLength(20000)
  })
})

describe('what we do with what MySQL hands back', () => {
  // The mock rejects by default, which is how every test above reaches the fallback.
  // These override it per call so the SQL-path branches are exercised too. They test
  // OUR handling of a driver response — not MySQL, which is still unproved from this
  // machine and is named as outstanding at the top of this file.
  const db = require('../../server/utils/db')

  it('returns the id MySQL assigned, not one we invented', async () => {
    db.execute.mockResolvedValueOnce([{ insertId: 4242 }])
    expect(await openSession()).toBe(4242)
  })

  it('reads a JSON column whether the driver parses it or hands back a string', async () => {
    // mysql2 does one or the other depending on version. A store that assumed either
    // would break on a driver upgrade with nothing failing until production.
    const row = {
      id: 7,
      client_id: 'client-1',
      advisor_id: 'adv-1',
      advisor_name: null,
      firm_id: FIRM,
      scope_json: '{"domains":["business-targets"],"frameworks":["strategy-swot-pest"]}',
      meeting_id: null,
      status: 'open',
      started_at: '2026-09-16 14:00:00',
      last_opened_at: '2026-09-16 14:00:00'
    }

    db.execute.mockResolvedValueOnce([[row]])
    const asString = await store.getSession(7, FIRM)

    db.execute.mockResolvedValueOnce([[Object.assign({}, row, {
      scope_json: { domains: ['business-targets'], frameworks: ['strategy-swot-pest'] }
    })]])
    const asObject = await store.getSession(7, FIRM)

    expect(asString.scope).toEqual(asObject.scope)
    expect(asString.scope.frameworks).toEqual(['strategy-swot-pest'])
  })

  it('treats an unparseable scope as empty rather than throwing at the advisor', async () => {
    db.execute.mockResolvedValueOnce([[{
      id: 7,
client_id: 'c',
advisor_id: 'a',
advisor_name: null,
firm_id: FIRM,
      scope_json: 'not json',
meeting_id: null,
status: 'open',
      started_at: 'x',
last_opened_at: 'x'
    }]])

    expect((await store.getSession(7, FIRM)).scope)
      .toEqual({ domains: [], frameworks: [], steps: [], suggestion: null })
  })

  it('reports a re-scope of a session this firm does not own as not done', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 0 }])
    expect(await store.setScope(7, FIRM, { frameworks: [] })).toBe(false)
  })

  it('🔴 NEVER falls back when a live server REFUSED the write', async () => {
    // The whole reason server/utils/dbFailure.js exists. A rejection carrying a
    // sqlState means MySQL was reached and said no — a foreign-key failure on a
    // missing firm row, say. Falling back would write to a scratch file and report
    // success, and the mentor's own saves ran silently broken for weeks exactly that
    // way. A false pass is worse than a failure, because a failure gets fixed.
    const refused = new Error('Cannot add or update a child row')
    refused.code = 'ER_NO_REFERENCED_ROW_2'
    refused.errno = 1452
    refused.sqlState = '23000'

    db.execute.mockRejectedValueOnce(refused)

    await expect(openSession()).rejects.toThrow('Cannot add or update a child row')
    // and nothing reached the stand-in file
    expect(await store.listSessionsForClient('client-1', FIRM)).toEqual([])
  })
})

describe('the fallback file is a stand-in, and behaves like one', () => {
  it('reads an absent file as a clean slate rather than throwing', async () => {
    clean()
    expect(await store.listSessionsForClient('client-1', FIRM)).toEqual([])
  })

  it('survives a corrupt file rather than taking the app down with it', async () => {
    // The honest-failure rule cuts both ways here: this is a DEV stand-in, so a
    // mangled scratch file must not stop a developer working. In production there is
    // no fallback at all and a DB failure propagates untouched.
    fs.writeFileSync(DEV_FILE, '{ not json at all', 'utf8')
    expect(await store.listSessionsForClient('client-1', FIRM)).toEqual([])
  })
})

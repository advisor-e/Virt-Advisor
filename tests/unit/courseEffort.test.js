'use strict'

// courseEffort decides how long a course session actually is, and that figure is
// shown to an advisor as a commitment they are about to make. It is held to the
// 100% standard CLAUDE.md sets for consequential derived data: the defect this
// module exists to fix was the app printing "30 minutes" over 99 minutes of
// prescribed work, so every rule that produces a minute count is pinned here.
//
// The template library is mocked throughout, for the same reason cpdCatalogue's
// tests mock it: the real export is replaced wholesale on every master release,
// and a suite pinned to today's content would break on someone else's edit.

jest.mock('../../server/utils/templates', () => ({
  getOrgTemplates: jest.fn(() => [])
}))

const { getOrgTemplates } = require('../../server/utils/templates')
const cpd = require('../../server/utils/cpdCatalogue')
const effort = require('../../server/utils/courseEffort')

/** A template record in the shape the master export actually produces. */
const record = over => Object.assign({
  page: 'id-1',
  title: 'E.O.Y Meeting',
  section: 'Do the Job',
  subSection: 'Meetings',
  cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 }
}, over)

/** An industry revenue model as the export ships them: hidden, and untimed. */
const model = over => record(Object.assign({
  title: 'Cafe',
  subSection: 'Revenue & Feasibility Models',
  cpd: { isHidden: true, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
}, over))

/** Point both the catalogue and this module at one library. */
function library (records) {
  getOrgTemplates.mockReturnValue(records)
  cpd.resetCache()
  return records
}

let warn
beforeEach(() => {
  jest.clearAllMocks()
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => warn.mockRestore())

// ── The rule Mike set ────────────────────────────────────────────────────────

describe('templateEffort — video + reading + rehearsal, added up', () => {
  test("Mike's worked example: 17 video + 30 reading + 30 rehearsal = 77 minutes", () => {
    const lib = library([record({
      title: 'Growth Curve',
      cpd: { isHidden: false, watchedVideo: 17, reviewTemplate: 30, reheasedTemplate: 30 }
    })])

    const e = effort.templateEffort('Growth Curve', lib)
    expect(e.minutes).toBe(77) // 1 hour 17 — his stated figure
    expect(e.source).toBe(effort.SOURCE_AUTHORED)
    expect({ video: e.video, reading: e.reading, rehearsal: e.rehearsal })
      .toEqual({ video: 17, reading: 30, rehearsal: 30 })
  })

  test('a template carrying only some of the three counts only what it carries', () => {
    const lib = library([record({
      cpd: { isHidden: false, watchedVideo: 5, reviewTemplate: 0, reheasedTemplate: 0 }
    })])
    const e = effort.templateEffort('E.O.Y Meeting', lib)
    expect(e.minutes).toBe(5)
    expect(e.reading).toBe(0)
    expect(e.rehearsal).toBe(0)
  })

  test('the name is matched case- and whitespace-insensitively, as elsewhere', () => {
    const lib = library([record()])
    expect(effort.templateEffort('  e.o.y   MEETING ', lib).minutes).toBe(99)
  })
})

// ── The revenue-model allowance ──────────────────────────────────────────────

describe('revenue models — the 30-minute allowance', () => {
  test('a hidden, untimed industry model counts 30 minutes, NOT zero', () => {
    const lib = library([model()])
    const e = effort.templateEffort('Cafe', lib)
    expect(e.minutes).toBe(30)
    expect(e.source).toBe(effort.SOURCE_MODEL)
  })

  test('the allowance applies to every untimed model, so a session of six is 180 not 0', () => {
    const titles = ['Cafe', 'Cake Shop', 'Car Importer', 'Break-Even', 'Labour Only', 'Back Costing']
    const lib = library(titles.map(title => model({ title, page: title })))
    const e = effort.sessionEffort({ resources: titles }, lib)
    expect(e.minutes).toBe(180)
    expect(e.modelMinutes).toBe(180)
    expect(e.unknown).toEqual([])
  })

  test('an AUTHORED time on a model wins over the flat allowance — never discard the better figure', () => {
    const lib = library([model({
      title: 'Assumptions',
      cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 20, reheasedTemplate: 30 }
    })])
    const e = effort.templateEffort('Assumptions', lib)
    expect(e.minutes).toBe(59)
    expect(e.source).toBe(effort.SOURCE_AUTHORED)
  })

  test('the subsection is matched exactly — a lookalike is not given the MODEL allowance', () => {
    const lib = library([model({ title: 'Scenario Thing', subSection: 'Scenario models' })])
    const e = effort.templateEffort('Scenario Thing', lib)
    expect(e.source).toBe(effort.SOURCE_DEFAULT) // the standard allowance, not the model's flat 30
    expect(e.minutes).toBe(75)
  })

  test('isRevenueModel ignores case and surrounding whitespace, and survives a missing field', () => {
    expect(effort.isRevenueModel({ subSection: '  Revenue & Feasibility MODELS ' })).toBe(true)
    expect(effort.isRevenueModel({ subSection: 'Meetings' })).toBe(false)
    expect(effort.isRevenueModel({})).toBe(false)
    expect(effort.isRevenueModel(null)).toBe(false)
  })
})

// ── Unknown is never zero ────────────────────────────────────────────────────
//
// ⚠ CHANGED 2026-08-03 by Mike's ruling: 15 minutes of video, 30 of reading and
// 30 of rehearsal for a template the export never timed. Untimed material used
// to be reported and left out of the timetable, which on his live "Simple
// Dashboard Discussions" course dropped four of five resources and left a
// one-template course. It is now costed and taught — as an ESTIMATE, labelled
// as one, and never counted into a CPD claim.
//
// 'unknown' now means one thing only: a name that matches no template at all.

describe('templates with no published time', () => {
  test('an untimed, non-model template gets the standard allowance — 15 + 30 + 30', () => {
    const lib = library([record({
      title: 'Dashboard Report',
      cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
    })])
    const e = effort.templateEffort('Dashboard Report', lib)
    expect(e.source).toBe(effort.SOURCE_DEFAULT)
    expect(e.minutes).toBe(75)
    expect({ video: e.video, reading: e.reading, rehearsal: e.rehearsal })
      .toEqual({ video: 15, reading: 30, rehearsal: 30 })
  })

  test('an authored time still wins — an allowance never displaces a real figure', () => {
    const lib = library([record()]) // 9 + 60 + 30
    expect(effort.templateEffort('E.O.Y Meeting', lib).source).toBe(effort.SOURCE_AUTHORED)
    expect(effort.templateEffort('E.O.Y Meeting', lib).minutes).toBe(99)
  })

  test('the estimate is counted, and countable AS an estimate', () => {
    const lib = library([
      record({ title: 'Timed One' }),
      record({
        title: 'Untimed One',
        page: 'id-2',
        cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
      })
    ])
    const e = effort.sessionEffort({ resources: ['Timed One', 'Untimed One'] }, lib)
    expect(e.minutes).toBe(174) // 99 published + 75 allowed
    expect(e.allowanceMinutes).toBe(75) // ...of which this much is an estimate
    expect(e.unknown).toEqual([]) // it is a real template, so it is not "unknown"
  })

  test('a resource name absent from the library is unknown, not an error', () => {
    const lib = library([record()])
    const e = effort.sessionEffort({ resources: ['Nothing Like This'] }, lib)
    expect(e.minutes).toBe(0)
    expect(e.unknown).toEqual(['Nothing Like This'])
  })

  test('a session with no resources at all is zero minutes and nothing unknown', () => {
    const lib = library([record()])
    expect(effort.sessionEffort({ resources: [] }, lib)).toMatchObject({ minutes: 0, unknown: [] })
    expect(effort.sessionEffort({}, lib)).toMatchObject({ minutes: 0, unknown: [] })
    expect(effort.sessionEffort(null, lib)).toMatchObject({ minutes: 0, unknown: [] })
  })
})

// ── The catalogue's rules are inherited, not re-implemented ──────────────────

describe('inherited cpdCatalogue rules', () => {
  test('a hidden non-model template carries no authored time (the catalogue skips it)', () => {
    const lib = library([record({ cpd: { isHidden: true, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 } })])
    // Not authored as far as this app is concerned, so it falls to the
    // allowance — the hidden times are never read.
    const e = effort.templateEffort('E.O.Y Meeting', lib)
    expect(e.source).toBe(effort.SOURCE_DEFAULT)
    expect(e.minutes).toBe(75)
  })

  test('fractional allowances are rounded the same way the CPD record rounds them', () => {
    const lib = library([record({ cpd: { isHidden: false, watchedVideo: 15.2, reviewTemplate: 24.23, reheasedTemplate: 0 } })])
    expect(effort.templateEffort('E.O.Y Meeting', lib).minutes).toBe(39) // 15 + 24
  })

  test('where the export gives one title two times, the LOWER wins — as it does for a CPD claim', () => {
    const lib = library([
      record({ page: 'a', title: 'Advisor Prep', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 120, reheasedTemplate: 0 } }),
      record({ page: 'b', title: 'Advisor Prep', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 84, reheasedTemplate: 0 } })
    ])
    expect(effort.templateEffort('Advisor Prep', lib).minutes).toBe(84)
  })
})

// ── Overwriting what the AI claimed ──────────────────────────────────────────

describe('applyOutlineEffort — the AI figure is replaced, never trusted', () => {
  const lib = () => library([
    record({ title: 'Long One' }), // 99 minutes
    record({ page: 'id-2', title: 'Short One', cpd: { isHidden: false, watchedVideo: 5, reviewTemplate: 0, reheasedTemplate: 0 } }),
    record({
      page: 'id-3',
      title: 'Untimed One',
      cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
    })
  ])

  test("the AI's echoed 30 minutes is replaced by the real 99", () => {
    const out = effort.applyOutlineEffort({
      sessions: [{ id: 1, title: 'S1', resources: ['Long One'], estimatedMinutes: 30 }]
    }, lib())
    expect(out.outline.sessions[0].estimatedMinutes).toBe(99)
    expect(out.totalMinutes).toBe(99)
  })

  test('an untimed template is costed by the allowance, and marked as an estimate', () => {
    const out = effort.applyOutlineEffort({
      sessions: [{ id: 1, title: 'S1', resources: ['Untimed One'], estimatedMinutes: 30 }]
    }, lib())
    expect(out.outline.sessions[0].estimatedMinutes).toBe(75)
    expect(out.outline.sessions[0].sessionEffort.allowanceMinutes).toBe(75)
    expect(out.unknownCount).toBe(0)
  })

  test('the course total is the sum of its sessions, and the breakdown survives', () => {
    const out = effort.applyOutlineEffort({
      sessions: [
        { id: 1, title: 'S1', resources: ['Long One'] },
        { id: 2, title: 'S2', resources: ['Short One'] }
      ]
    }, lib())
    expect(out.totalMinutes).toBe(104)
    expect(out.outline.sessions[0].sessionEffort)
      .toMatchObject({ minutes: 99, video: 9, reading: 60, rehearsal: 30 })
  })

  test('every other field of the outline and its sessions is left untouched', () => {
    const out = effort.applyOutlineEffort({
      title: 'A course',
intensity: 'progressive',
totalSessions: 1,
      sessions: [{ id: 1, title: 'S1', focus: 'f', objectives: ['o'], resources: ['Long One'], resourceLinks: { 'Long One': 'https://x' } }]
    }, lib())
    expect(out.outline).toMatchObject({ title: 'A course', intensity: 'progressive', totalSessions: 1 })
    expect(out.outline.sessions[0]).toMatchObject({
      id: 1, title: 'S1', focus: 'f', objectives: ['o'], resourceLinks: { 'Long One': 'https://x' }
    })
  })

  test('an outline with no sessions is handled without throwing', () => {
    expect(effort.applyOutlineEffort({}, lib())).toMatchObject({ totalMinutes: 0, unknownCount: 0 })
  })
})

// ── The mismatch notice ──────────────────────────────────────────────────────

describe('lengthNotice — code notices, the AI is not asked to confess', () => {
  const outline = mins => ({
    sessions: mins.map((m, i) => ({ id: i + 1, title: `S${i + 1}`, sessionEffort: { minutes: m, unknown: [] } }))
  })

  /** A single figure reaches this function as the degenerate range n–n. */
  const exactly = n => ({ min: n, max: n })

  test('the 99-minutes-billed-as-30 case that started this work is flagged', () => {
    const n = effort.lengthNotice(outline([99]), exactly(30))
    expect(n).toEqual({ requested: { min: 30, max: 30 }, sessions: [{ id: 1, title: 'S1', minutes: 99 }] })
  })

  test('an exact match raises nothing', () => {
    expect(effort.lengthNotice(outline([30, 30]), exactly(30))).toBeNull()
  })

  test('±20% is tolerated — 24 and 36 against a 30-minute request pass', () => {
    expect(effort.lengthNotice(outline([24, 36]), exactly(30))).toBeNull()
  })

  test('just outside the tolerance is flagged — 23 and 37 do not pass', () => {
    const n = effort.lengthNotice(outline([23, 37]), exactly(30))
    expect(n.sessions.map(s => s.minutes)).toEqual([23, 37])
  })

  test('only the offending sessions are named, not the whole course', () => {
    const n = effort.lengthNotice(outline([30, 99, 30]), exactly(30))
    expect(n.sessions).toEqual([{ id: 2, title: 'S2', minutes: 99 }])
  })

  test('a session with no published time is never flagged as short', () => {
    expect(effort.lengthNotice(outline([0]), exactly(30))).toBeNull()
  })

  test('no requested length means no check — an unparsed answer never raises a false alarm', () => {
    expect(effort.lengthNotice(outline([99]), null)).toBeNull()
    expect(effort.lengthNotice(outline([99]), { min: 0, max: 0 })).toBeNull()
    expect(effort.lengthNotice(outline([99]), { min: NaN, max: NaN })).toBeNull()
    expect(effort.lengthNotice(outline([99]), { min: 40, max: 20 })).toBeNull() // incoherent
  })

  test('an empty outline raises nothing', () => {
    expect(effort.lengthNotice({ sessions: [] }, exactly(30))).toBeNull()
    expect(effort.lengthNotice({}, exactly(30))).toBeNull()
  })

  // ── A range is a budget with two ends ──────────────────────────────────────
  // 🔴 Mike's live test, 2026-08-03: he asked for 15–20 minutes and drew sessions
  // of 70, 63 and 30. Nothing was said, because a range disabled the check
  // outright. The tolerance now runs OUTWARD from each end.

  test("MIKE'S LIVE COURSE — 15–20 minutes requested, 70/63/30 delivered, all three flagged", () => {
    const n = effort.lengthNotice(outline([70, 63, 30]), { min: 15, max: 20 })
    expect(n.requested).toEqual({ min: 15, max: 20 })
    expect(n.sessions.map(s => s.minutes)).toEqual([70, 63, 30])
  })

  test('a session inside the band raises nothing', () => {
    expect(effort.lengthNotice(outline([15, 17, 20]), { min: 15, max: 20 })).toBeNull()
  })

  test('the tolerance runs outward from each end — 12 and 24 pass a 15–20 request', () => {
    expect(effort.lengthNotice(outline([12, 24]), { min: 15, max: 20 })).toBeNull()
  })

  test('just outside the widened band is flagged — 11 and 25 do not pass', () => {
    const n = effort.lengthNotice(outline([11, 25]), { min: 15, max: 20 })
    expect(n.sessions.map(s => s.minutes)).toEqual([11, 25])
  })
})

// ── Slicing a course into sessions (design/COURSE-SESSION-PLANNING.md) ───────
//
// Mike's model, 2026-08-03: a session is a time-boxed slice of ONE activity, and
// an activity may span several sessions. The worked example below is his live EOY
// course, and the numbers are the ones he was shown and approved.

describe('splitEvenly — no stub sessions', () => {
  test('a 60-minute reading at 20 is three equal parts', () => {
    expect(effort.splitEvenly(60, 20)).toEqual([20, 20, 20])
  })

  test('a 30-minute rehearsal at 20 is 15+15, never 20+10', () => {
    expect(effort.splitEvenly(30, 20)).toEqual([15, 15])
  })

  test('an activity already inside the budget is one part, not padded', () => {
    expect(effort.splitEvenly(9, 20)).toEqual([9])
    expect(effort.splitEvenly(20, 20)).toEqual([20])
  })

  test('the parts always sum back to the original minutes', () => {
    for (const mins of [7, 13, 24, 37, 59, 61, 99, 165, 360]) {
      for (const max of [10, 15, 20, 30, 45, 60]) {
        const parts = effort.splitEvenly(mins, max)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(mins)
        expect(Math.max(...parts)).toBeLessThanOrEqual(Math.max(max, mins))
      }
    }
  })

  test('nothing to split, and a missing budget, are handled', () => {
    expect(effort.splitEvenly(0, 20)).toEqual([])
    expect(effort.splitEvenly(30, 0)).toEqual([30])
  })
})

describe('orderedResources — the AI chose the curriculum, not the timetable', () => {
  test('its session grouping is discarded and duplicates collapse to one', () => {
    const outline = {
      sessions: [
        { resources: ['Alpha', 'Beta'] },
        { resources: ['beta', 'Gamma'] } // same material, different casing
      ]
    }
    expect(effort.orderedResources(outline)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  test('an outline with no resources yields none', () => {
    expect(effort.orderedResources({ sessions: [{}] })).toEqual([])
    expect(effort.orderedResources({})).toEqual([])
  })
})

describe('planSessions — Mike\'s live EOY material', () => {
  /** The two timed templates from his 2026-08-03 course. */
  const eoyLibrary = () => library([
    record({ page: 'p1', title: 'E.O.Y Meeting', cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 } }),
    record({ page: 'p2', title: 'Working Capital Cycle', cpd: { isHidden: false, watchedVideo: 24, reviewTemplate: 20, reheasedTemplate: 30 } })
  ])
  const outline = { sessions: [{ resources: ['E.O.Y Meeting'] }, { resources: ['Working Capital Cycle'] }] }

  test('11 sessions at 15-20 minutes — the plan Mike approved', () => {
    const plan = effort.planSessions(outline, { min: 15, max: 20 }, eoyLibrary())
    expect(plan.sessions.length).toBe(11)
    expect(plan.totalMinutes).toBe(173) // 2h 53m
    expect(plan.sessions.map(s => s.minutes)).toEqual([9, 20, 20, 20, 15, 15, 12, 12, 20, 15, 15])
    expect(plan.sessions.map(s => s.activity)).toEqual(
      ['video', 'reading', 'reading', 'reading', 'rehearsal', 'rehearsal',
        'video', 'video', 'reading', 'rehearsal', 'rehearsal']
    )
  })

  test('the same material re-slices at other lengths — the work never changes', () => {
    for (const [max, count] of [[20, 11], [30, 7], [60, 6]]) {
      const plan = effort.planSessions(outline, { min: max - 5, max }, eoyLibrary())
      expect(plan.sessions.length).toBe(count)
      expect(plan.totalMinutes).toBe(173)
    }
  })

  test('parts are numbered so the screen can say "part 2 of 3"', () => {
    const plan = effort.planSessions(outline, { min: 15, max: 20 }, eoyLibrary())
    const reading = plan.sessions.filter(s => s.resource === 'E.O.Y Meeting' && s.activity === 'reading')
    expect(reading.map(s => `${s.part} of ${s.parts}`)).toEqual(['1 of 3', '2 of 3', '3 of 3'])
  })

  test('a natural boundary runs short rather than being padded or merged', () => {
    const plan = effort.planSessions(outline, { min: 15, max: 20 }, eoyLibrary())
    expect(plan.sessions[0]).toMatchObject({ activity: 'video', minutes: 9, parts: 1 })
    // ...and the 20-minute reading that follows is a session of its own.
    expect(plan.sessions[1]).toMatchObject({ activity: 'reading', minutes: 20 })
  })

  test('an activity carrying no time never becomes a session', () => {
    const lib = library([record({ cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 40, reheasedTemplate: 0 } })])
    const plan = effort.planSessions({ sessions: [{ resources: ['E.O.Y Meeting'] }] }, { min: 15, max: 20 }, lib)
    expect(plan.sessions.every(s => s.activity === 'reading')).toBe(true)
    expect(plan.sessions.length).toBe(2)
  })

  test('an untimed template is timetabled on the allowance, not dropped from the course', () => {
    const lib = library([record({ title: 'Dashboard Report', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 } })])
    const plan = effort.planSessions({ sessions: [{ resources: ['Dashboard Report'] }] }, { min: 15, max: 20 }, lib)
    // 15 video + 30 reading + 30 rehearsal, cut to a 20-minute session.
    expect(plan.sessions.map(s => `${s.activity} ${s.minutes}`))
      .toEqual(['video 15', 'reading 15', 'reading 15', 'rehearsal 15', 'rehearsal 15'])
    expect(plan.totalMinutes).toBe(75)
    expect(plan.unknown).toEqual([])
  })

  test('a name matching no template at all is still named, never invented into work', () => {
    const lib = library([record()])
    const plan = effort.planSessions({ sessions: [{ resources: ['Nothing Like This'] }] }, { min: 15, max: 20 }, lib)
    expect(plan.sessions).toEqual([])
    expect(plan.unknown).toEqual(['Nothing Like This'])
  })

  test('a revenue model is one indivisible block, not three activities', () => {
    const lib = library([model()])
    const plan = effort.planSessions({ sessions: [{ resources: ['Cafe'] }] }, { min: 15, max: 20 }, lib)
    expect(plan.sessions.length).toBe(2) // 30 min at a 20-min budget -> 15 + 15
    expect(plan.sessions.every(s => s.activity === 'model')).toBe(true)
    expect(plan.totalMinutes).toBe(30)
  })
})

describe('planForCount — the plan is FOUND by slicing, never by dividing', () => {
  const eoyLibrary = () => library([
    record({ page: 'p1', title: 'E.O.Y Meeting', cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 } }),
    record({ page: 'p2', title: 'Working Capital Cycle', cpd: { isHidden: false, watchedVideo: 24, reviewTemplate: 20, reheasedTemplate: 30 } })
  ])
  const outline = { sessions: [{ resources: ['E.O.Y Meeting'] }, { resources: ['Working Capital Cycle'] }] }

  test('an exactly reachable count is found, with the length that builds it', () => {
    const found = effort.planForCount(outline, 7, eoyLibrary())
    expect(found.sessions.length).toBe(7)
    expect(found.max).toBe(30)
    expect(found.longestMinutes).toBe(30)
    expect(found.totalMinutes).toBe(173) // the work never changes
  })

  test('below the floor it returns the fewest the material allows, not a fiction', () => {
    // THE DEFECT THIS FUNCTION EXISTS FOR. The old fitOptions divided 173 by 4
    // and offered "4 sessions of about 45 minutes". Six activities cannot be
    // cut into four sessions at any length, because activities are never mixed.
    const found = effort.planForCount(outline, 4, eoyLibrary())
    expect(found.sessions.length).toBe(6)
    expect(found.longestMinutes).toBe(60)
    // And the plan it names is one that can actually be built.
    const built = effort.planSessions(outline, { min: found.max, max: found.max }, eoyLibrary())
    expect(built.sessions.length).toBe(found.sessions.length)
  })

  test('slicing at the figure the OLD code offered gives 7 sessions, not 4', () => {
    const plan = effort.planSessions(outline, { min: 45, max: 45 }, eoyLibrary())
    expect(plan.sessions.length).toBe(7)
    expect(plan.sessions.map(s => s.minutes)).toEqual([9, 30, 30, 30, 24, 20, 30])
  })

  test('material that resolves to no template at all can be planned to nothing', () => {
    const lib = library([record()])
    const found = effort.planForCount({ sessions: [{ resources: ['Nothing Like This'] }] }, 4, lib)
    expect(found.sessions).toEqual([])
    expect(found.max).toBe(0)
  })

  test('an untimed template is planned on its allowance like anything else', () => {
    const lib = library([record({ title: 'Dashboard Report', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 } })])
    const found = effort.planForCount({ sessions: [{ resources: ['Dashboard Report'] }] }, 3, lib)
    expect(found.sessions.length).toBe(3) // one session per activity
    expect(found.totalMinutes).toBe(75)
  })
})

describe('fitOptions — the two choices the advisor is offered', () => {
  const eoyLibrary = () => library([
    record({ page: 'p1', title: 'E.O.Y Meeting', cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 } }),
    record({ page: 'p2', title: 'Working Capital Cycle', cpd: { isHidden: false, watchedVideo: 24, reviewTemplate: 20, reheasedTemplate: 30 } })
  ])
  const outline = { sessions: [{ resources: ['E.O.Y Meeting'] }, { resources: ['Working Capital Cycle'] }] }

  /** The count is a range now; a plain number is the range n–n. */
  const asked = (min, max) => ({ min, max: max === undefined ? min : max })

  test("Mike's case: 4 asked, 11 at his length, and 6 is the fewest possible", () => {
    const opts = effort.fitOptions(outline, { min: 15, max: 20 }, asked(4), eoyLibrary())
    expect(opts.totalMinutes).toBe(173)
    expect(opts.keepLength).toEqual({ sessions: 11, max: 20, longestMinutes: 20 })
    expect(opts.keepCount).toEqual({ sessions: 6, max: 60, longestMinutes: 60, reachable: false })
    expect(opts.direction).toBe('fewer')
  })

  test('the count they asked for is never offered when it cannot be built', () => {
    const opts = effort.fitOptions(outline, { min: 15, max: 20 }, asked(4), eoyLibrary())
    // 4 appears only as the record of what they asked — never as a plan.
    expect(opts.requestedCount).toEqual({ min: 4, max: 4 })
    expect(opts.keepLength.sessions).not.toBe(4)
    expect(opts.keepCount.sessions).not.toBe(4)
    expect(opts.keepCount.reachable).toBe(false)
  })

  test('a reachable count is offered as their own number', () => {
    const opts = effort.fitOptions(outline, { min: 15, max: 20 }, asked(7), eoyLibrary())
    expect(opts.keepCount).toEqual({ sessions: 7, max: 30, longestMinutes: 30, reachable: true })
  })

  test('every figure offered comes out of a plan that was actually built', () => {
    const opts = effort.fitOptions(outline, { min: 15, max: 20 }, asked(4), eoyLibrary())
    for (const option of [opts.keepLength, opts.keepCount]) {
      const built = effort.planSessions(outline, { min: option.max, max: option.max }, eoyLibrary())
      expect(built.sessions.length).toBe(option.sessions)
      expect(built.sessions.reduce((n, s) => Math.max(n, s.minutes), 0)).toBe(option.longestMinutes)
    }
  })

  test('no question is asked when the plan already matches the request', () => {
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, asked(11), eoyLibrary())).toBeNull()
  })

  // 🔴 MIKE'S SECOND LIVE CASE, 2026-08-03. He asked for "between four and six
  // sessions" and the plan came out at four — inside his own range — and he was
  // asked to choose anyway. A range is a budget: a plan inside it is a fit.
  test('a plan INSIDE the requested range asks nothing at all', () => {
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, asked(6, 12), eoyLibrary())).toBeNull()
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, asked(11, 11), eoyLibrary())).toBeNull()
  })

  test('a plan outside the range is measured against the end it missed', () => {
    // Too many sessions → aim at the top of the range.
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, asked(4, 6), eoyLibrary()).target).toBe(6)
    // Too few → aim at the bottom.
    const lib = library([record({ title: 'Solo', cpd: { isHidden: false, watchedVideo: 10, reviewTemplate: 20, reheasedTemplate: 0 } })])
    const single = { sessions: [{ resources: ['Solo'] }] }
    const opts = effort.fitOptions(single, { min: 15, max: 20 }, asked(6, 8), lib)
    expect(opts.direction).toBe('more')
    expect(opts.target).toBe(6)
  })

  test('no question is asked when the alternative is the same course', () => {
    // One 40-minute reading: every length either gives the same plan or a
    // longer one, so there is no second course to offer.
    const lib = library([record({ title: 'Solo', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 40, reheasedTemplate: 0 } })])
    const single = { sessions: [{ resources: ['Solo'] }] }
    expect(effort.fitOptions(single, { min: 40, max: 40 }, asked(1), lib)).toBeNull()
  })

  test('a missing figure asks nothing rather than inventing one', () => {
    expect(effort.fitOptions(null, { min: 15, max: 20 }, asked(4), eoyLibrary())).toBeNull()
    expect(effort.fitOptions(outline, null, asked(4), eoyLibrary())).toBeNull()
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, null, eoyLibrary())).toBeNull()
    expect(effort.fitOptions(outline, { min: 15, max: 20 }, asked(0), eoyLibrary())).toBeNull()
  })
})

describe('the authored objective travels with the template', () => {
  test("the export's own line is read, never generated", () => {
    const lib = library([record({ cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30, objective: 'How to frame the EOY meeting.' } })])
    expect(effort.templateEffort('E.O.Y Meeting', lib).objective).toBe('How to frame the EOY meeting.')
  })

  test('a template with no authored objective reports none — nothing is invented', () => {
    const lib = library([record()])
    expect(effort.templateEffort('E.O.Y Meeting', lib).objective).toBe('')
  })
})

// ── CPD follows the library in force — item 4.56, Mike's ruling 2026-09-01 ────

describe('minutes come from the library the course was built from', () => {
  test('a firm library\'s authored times price the course, not the platform seed\'s', () => {
    // The platform seed says 99 minutes for this template…
    library([record()])
    cpd.lookupTemplate('E.O.Y Meeting') // …and the seed index is built and cached.

    // …but the course was built from the firm's library, where it carries 24.
    const firmLibrary = [record({
      page: 'firm-1',
      cpd: { isHidden: false, watchedVideo: 4, reviewTemplate: 20, reheasedTemplate: 0 }
    })]

    const e = effort.templateEffort('E.O.Y Meeting', firmLibrary)
    expect(e.minutes).toBe(24)
    expect(e.source).toBe(effort.SOURCE_AUTHORED)
    expect({ video: e.video, reading: e.reading, rehearsal: e.rehearsal })
      .toEqual({ video: 4, reading: 20, rehearsal: 0 })
  })

  test('the firm catalogue rides on the index, so a prebuilt index prices the same', () => {
    library([record()])
    const firmLibrary = [record({
      page: 'firm-1',
      cpd: { isHidden: false, watchedVideo: 4, reviewTemplate: 20, reheasedTemplate: 0 }
    })]

    const index = effort.indexByTitle(firmLibrary)

    expect(effort.templateEffort('E.O.Y Meeting', index).minutes).toBe(24)
  })

  test('a bare Map handed in from outside falls back to the platform catalogue', () => {
    // Nothing in the app builds one, but the signature allows it — the fallback is
    // the pre-4.56 behaviour, never a crash.
    const lib = library([record()])
    const bare = new Map()
    for (const t of lib) { bare.set(cpd.normaliseTitle(t.title), t) }

    expect(effort.templateEffort('E.O.Y Meeting', bare).minutes).toBe(99)
  })
})

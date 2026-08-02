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

  test('the subsection is matched exactly — a lookalike is not given the allowance', () => {
    const lib = library([model({ title: 'Scenario Thing', subSection: 'Scenario models' })])
    expect(effort.templateEffort('Scenario Thing', lib).source).toBe(effort.SOURCE_UNKNOWN)
  })

  test('isRevenueModel ignores case and surrounding whitespace, and survives a missing field', () => {
    expect(effort.isRevenueModel({ subSection: '  Revenue & Feasibility MODELS ' })).toBe(true)
    expect(effort.isRevenueModel({ subSection: 'Meetings' })).toBe(false)
    expect(effort.isRevenueModel({})).toBe(false)
    expect(effort.isRevenueModel(null)).toBe(false)
  })
})

// ── Unknown is never zero ────────────────────────────────────────────────────

describe('templates with no published time', () => {
  test('an untimed, non-model template is UNKNOWN — it is never counted as no work', () => {
    const lib = library([record({
      title: 'Dashboard Report',
      cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
    })])
    const e = effort.templateEffort('Dashboard Report', lib)
    expect(e.source).toBe(effort.SOURCE_UNKNOWN)
    expect(e.minutes).toBe(0)
  })

  test('an unknown resource is NAMED, so the screen can say so rather than imply zero', () => {
    const lib = library([
      record({ title: 'Timed One' }),
      record({
        title: 'Untimed One',
        page: 'id-2',
        cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
      })
    ])
    const e = effort.sessionEffort({ resources: ['Timed One', 'Untimed One'] }, lib)
    expect(e.minutes).toBe(99) // the timed one only
    expect(e.unknown).toEqual(['Untimed One'])
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
    expect(effort.templateEffort('E.O.Y Meeting', lib).source).toBe(effort.SOURCE_UNKNOWN)
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

  test('a session with nothing published carries NO estimate rather than a false one', () => {
    const out = effort.applyOutlineEffort({
      sessions: [{ id: 1, title: 'S1', resources: ['Untimed One'], estimatedMinutes: 30 }]
    }, lib())
    expect('estimatedMinutes' in out.outline.sessions[0]).toBe(false)
    expect(out.unknownCount).toBe(1)
    expect(out.outline.sessions[0].sessionEffort.unknown).toEqual(['Untimed One'])
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

  test('an untimed resource cannot be timetabled — it is named, not dropped silently', () => {
    const lib = library([record({ title: 'Dashboard Report', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 } })])
    const plan = effort.planSessions({ sessions: [{ resources: ['Dashboard Report'] }] }, { min: 15, max: 20 }, lib)
    expect(plan.sessions).toEqual([])
    expect(plan.unknown).toEqual(['Dashboard Report'])
  })

  test('a revenue model is one indivisible block, not three activities', () => {
    const lib = library([model()])
    const plan = effort.planSessions({ sessions: [{ resources: ['Cafe'] }] }, { min: 15, max: 20 }, lib)
    expect(plan.sessions.length).toBe(2) // 30 min at a 20-min budget -> 15 + 15
    expect(plan.sessions.every(s => s.activity === 'model')).toBe(true)
    expect(plan.totalMinutes).toBe(30)
  })
})

describe('fitOptions — the two choices the advisor is offered', () => {
  test("Mike's case: 4 sessions asked, 11 needed, ~45 minutes if he keeps 4", () => {
    const opts = effort.fitOptions(173, { min: 15, max: 20 }, 4, 11)
    expect(opts).toEqual({
      totalMinutes: 173,
      keepLength: { sessions: 11 },
      keepCount: { sessions: 4, minutes: 45 }
    })
  })

  test('the per-session figure is rounded to the nearest 5 — it is offered as "about"', () => {
    expect(effort.fitOptions(100, { min: 15, max: 20 }, 3, 6).keepCount.minutes).toBe(35) // 33.3
    expect(effort.fitOptions(120, { min: 15, max: 20 }, 5, 8).keepCount.minutes).toBe(25) // 24
  })

  test('no question is asked when the plan already matches the request', () => {
    expect(effort.fitOptions(80, { min: 15, max: 20 }, 4, 4)).toBeNull()
  })

  test('a missing figure asks nothing rather than inventing one', () => {
    expect(effort.fitOptions(0, { min: 15, max: 20 }, 4, 11)).toBeNull()
    expect(effort.fitOptions(173, null, 4, 11)).toBeNull()
    expect(effort.fitOptions(173, { min: 15, max: 20 }, 0, 11)).toBeNull()
  })
})

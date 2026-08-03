'use strict'

// The words a sliced course is described with (design/COURSE-SLICED-SESSION-
// WORDING.md, design/mockups/sliced-course-outline.html).
//
// These are pinned as tests for the same reason the mockup is committed: the
// approved wording is the thing a later session drifts from without noticing.
// A change here that is not also a change in those two files is a defect, not
// an improvement.
//
// The library is mocked throughout, as cpdCatalogue's own tests are: the real
// export is replaced wholesale on every master release, and a suite pinned to
// today's content would break on someone else's edit.

jest.mock('../../server/utils/templates', () => ({
  getOrgTemplates: jest.fn(() => [])
}))

const { getOrgTemplates } = require('../../server/utils/templates')
const cpd = require('../../server/utils/cpdCatalogue')
const effort = require('../../server/utils/courseEffort')
const copy = require('../../server/utils/courseSliceCopy')

const record = over => Object.assign({
  page: 'id-1',
  title: 'E.O.Y Meeting',
  section: 'Do the Job',
  subSection: 'Meetings',
  cpd: {
    isHidden: false,
    objective: 'How to frame the EOY meeting as a springboard into advisory services.',
    watchedVideo: 9,
    reviewTemplate: 60,
    reheasedTemplate: 30
  }
}, over)

function library (records) {
  getOrgTemplates.mockReturnValue(records)
  cpd.resetCache()
  return records
}

const eoyLibrary = () => library([
  record({ page: 'p1' }),
  record({
    page: 'p2',
    title: 'Working Capital Cycle',
    cpd: {
      isHidden: false,
      objective: "Money in movement — the effect of time on your client's profits.",
      watchedVideo: 24,
      reviewTemplate: 20,
      reheasedTemplate: 30
    }
  })
])

const OUTLINE = {
  title: 'Running a better End of Year meeting',
  topic: 'eoy',
  intensity: 'consistent',
  totalSessions: 2,
  sessions: [
    { id: 1, title: 'AI session one', focus: 'AI focus', resources: ['E.O.Y Meeting'], objectives: ['AI objective'], resourceLinks: { 'E.O.Y Meeting': 'https://advisor-e.com/t/p1' } },
    { id: 2, title: 'AI session two', focus: 'AI focus', resources: ['Working Capital Cycle'], objectives: [] }
  ]
}

let warn
beforeEach(() => {
  jest.clearAllMocks()
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => warn.mockRestore())

// ── The session titles (D1, D2, D3) ─────────────────────────────────────────

describe('a sliced session is named for the activity, then the template', () => {
  test('the three activity words are the ones Mike approved', () => {
    expect(copy.sliceTitle({ resource: 'E.O.Y Meeting', activity: 'video', part: 1, parts: 1 }))
      .toBe('Watch: E.O.Y Meeting')
    expect(copy.sliceTitle({ resource: 'E.O.Y Meeting', activity: 'reading', part: 1, parts: 1 }))
      .toBe('Read: E.O.Y Meeting')
    expect(copy.sliceTitle({ resource: 'E.O.Y Meeting', activity: 'rehearsal', part: 1, parts: 1 }))
      .toBe('Rehearse: E.O.Y Meeting')
  })

  test('a revenue model gets its own word — it has no watch/read/rehearse split', () => {
    expect(copy.sliceTitle({ resource: 'Cafe', activity: 'model', part: 1, parts: 1 }))
      .toBe('Work through: Cafe')
  })

  test('a split says which part it is, and of how many', () => {
    expect(copy.sliceTitle({ resource: 'E.O.Y Meeting', activity: 'reading', part: 2, parts: 3 }))
      .toBe('Read: E.O.Y Meeting (part 2 of 3)')
  })

  test('material that fits whole is never labelled "part 1 of 1"', () => {
    expect(copy.sliceTitle({ resource: 'E.O.Y Meeting', activity: 'video', part: 1, parts: 1 }))
      .not.toContain('part')
  })
})

describe('the line underneath says what to do (D4)', () => {
  test('a whole activity, and the first part, read the same', () => {
    expect(copy.sliceFocus({ activity: 'reading', part: 1, parts: 1 })).toBe('Read through the template.')
    expect(copy.sliceFocus({ activity: 'reading', part: 1, parts: 3 })).toBe('Read through the template.')
  })

  test('a later part says the advisor picks up where they left off', () => {
    expect(copy.sliceFocus({ activity: 'reading', part: 2, parts: 3 }))
      .toBe('Read through the template — part 2 of 3, picking up where you left off.')
  })

  test("nothing claims to know the document's own structure", () => {
    const text = copy.sliceFocus({ activity: 'reading', part: 2, parts: 3 })
    expect(text).not.toMatch(/section|chapter|page/i)
  })
})

// ── The outline the app then runs on ────────────────────────────────────────

describe('buildSlicedOutline — the course the screen, the store and the tutor share', () => {
  const build = (budget) => {
    const templates = eoyLibrary()
    const plan = effort.planSessions(OUTLINE, budget, templates)
    return copy.buildSlicedOutline(OUTLINE, plan, templates, budget)
  }

  test("Mike's approved plan, session for session", () => {
    const outline = build({ min: 15, max: 20 })
    expect(outline.totalSessions).toBe(11)
    expect(outline.sessions.map(s => s.title)).toEqual([
      'Watch: E.O.Y Meeting',
      'Read: E.O.Y Meeting (part 1 of 3)',
      'Read: E.O.Y Meeting (part 2 of 3)',
      'Read: E.O.Y Meeting (part 3 of 3)',
      'Rehearse: E.O.Y Meeting (part 1 of 2)',
      'Rehearse: E.O.Y Meeting (part 2 of 2)',
      'Watch: Working Capital Cycle (part 1 of 2)',
      'Watch: Working Capital Cycle (part 2 of 2)',
      'Read: Working Capital Cycle',
      'Rehearse: Working Capital Cycle (part 1 of 2)',
      'Rehearse: Working Capital Cycle (part 2 of 2)'
    ])
    expect(outline.sessions.map(s => s.estimatedMinutes))
      .toEqual([9, 20, 20, 20, 15, 15, 12, 12, 20, 15, 15])
  })

  test('the course keeps its title, and the AI keeps none of the timetable', () => {
    const outline = build({ min: 15, max: 20 })
    expect(outline.title).toBe('Running a better End of Year meeting')
    expect(outline.sessions.some(s => s.title === 'AI session one')).toBe(false)
    expect(outline.sessions.some(s => s.focus === 'AI focus')).toBe(false)
    expect(outline.sessions.some(s => (s.objectives || []).includes('AI objective'))).toBe(false)
  })

  test("each session states what it is for in the master export's own words", () => {
    const outline = build({ min: 15, max: 20 })
    expect(outline.sessions[0].objectives)
      .toEqual(['How to frame the EOY meeting as a springboard into advisory services.'])
    // Carried on EVERY session of that template — the screen shows it once, the
    // tutor is told it each time.
    expect(outline.sessions[3].objectives).toEqual(outline.sessions[0].objectives)
  })

  test('a session carries its one activity, its part, and its minutes', () => {
    const outline = build({ min: 15, max: 20 })
    expect(outline.sessions[2].slice)
      .toEqual({ resource: 'E.O.Y Meeting', activity: 'reading', part: 2, parts: 3 })
    expect(outline.sessions[2].resources).toEqual(['E.O.Y Meeting'])
    expect(outline.sessions[2].sessionEffort)
      .toEqual({ minutes: 20, video: 0, reading: 20, rehearsal: 0, modelMinutes: 0, unknown: [] })
  })

  test('the resource link follows the material onto every one of its sessions (CB-25)', () => {
    const outline = build({ min: 15, max: 20 })
    for (const s of outline.sessions.filter(x => x.slice.resource === 'E.O.Y Meeting')) {
      expect(s.resourceLinks).toEqual({ 'E.O.Y Meeting': 'https://advisor-e.com/t/p1' })
    }
    // The template that had no link gets none invented for it.
    expect(outline.sessions.find(s => s.slice.resource === 'Working Capital Cycle').resourceLinks)
      .toBeUndefined()
  })

  test('the same material re-cuts at another length — the work never changes', () => {
    const short = build({ min: 15, max: 20 })
    const long = build({ min: 50, max: 60 })
    const total = o => o.sessions.reduce((n, s) => n + s.estimatedMinutes, 0)
    expect(total(short)).toBe(173)
    expect(total(long)).toBe(173)
    expect(long.totalSessions).toBe(6)
    expect(long.sessionBudget).toEqual({ min: 50, max: 60 })
  })

  test('material with no published time is named on the outline, not dropped', () => {
    const templates = library([
      record({ page: 'p1' }),
      record({ page: 'p3', title: 'Dashboard Report', cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 } })
    ])
    const outline = {
      ...OUTLINE,
      sessions: [{ id: 1, title: 't', focus: 'f', resources: ['E.O.Y Meeting', 'Dashboard Report'], objectives: [] }]
    }
    const plan = effort.planSessions(outline, { min: 15, max: 20 }, templates)
    const built = copy.buildSlicedOutline(outline, plan, templates, { min: 15, max: 20 })
    expect(built.unknownResources).toEqual(['Dashboard Report'])
    expect(built.sessions.every(s => s.slice.resource === 'E.O.Y Meeting')).toBe(true)
  })

  test('an id is written for every session, in order — the screen numbers from it', () => {
    const outline = build({ min: 15, max: 20 })
    expect(outline.sessions.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})

// ── The question, and the two options (D6) ──────────────────────────────────

describe('the session-length question', () => {
  const optionsFor = (min, max) =>
    effort.fitOptions(OUTLINE, { min: 15, max: 20 }, { min, max: max === undefined ? min : max }, eoyLibrary())

  test("Mike's approved first bullet is unchanged", () => {
    const [keepLength] = copy.fitChoiceOptions(optionsFor(4))
    expect(keepLength.label)
      .toBe('Keep your session length — 15–20 minutes each, and the course becomes 11 sessions')
  })

  test('the second option names the fewest the material allows when their count cannot be built', () => {
    const [, alternative] = copy.fitChoiceOptions(optionsFor(4))
    expect(alternative.label)
      .toBe('Keep the course as short as possible — 6 sessions, the longest 1 hour')
    expect(alternative.budget).toEqual({ min: 60, max: 60 })
  })

  test('a count that CAN be built is offered as their own number', () => {
    const [, alternative] = copy.fitChoiceOptions(optionsFor(7))
    expect(alternative.label).toBe('Keep your 7 sessions — each one up to 30 minutes')
  })

  test('both options are always offered — one option is not a question', () => {
    expect(copy.fitChoiceOptions(optionsFor(4))).toHaveLength(2)
    expect(copy.fitChoiceOptions(optionsFor(7))).toHaveLength(2)
  })

  test('"cover less material" is never offered — proposed and rejected 2026-08-03', () => {
    const text = copy.fitQuestionText(optionsFor(4)) +
      copy.fitChoiceOptions(optionsFor(4)).map(o => o.label).join(' ')
    expect(text).not.toMatch(/less material|fewer templates|drop (a|some) (template|topic)/i)
  })

  test('the question states the real total and why the count cannot hold', () => {
    const text = copy.fitQuestionText(optionsFor(4))
    expect(text).toContain('2 hours 53 minutes of work in total')
    expect(text).toContain('the fewest this material can be is 6 sessions')
    expect(text.trim().endsWith('Which would you rather?')).toBe(true)
  })

  test('when their count IS reachable the question says only that it does not fit', () => {
    const text = copy.fitQuestionText(optionsFor(7))
    expect(text).toContain("That doesn't fit 7 sessions of 15–20 minutes")
    expect(text).not.toContain('the fewest this material can be')
  })

  test('a range is quoted back with both ends', () => {
    expect(copy.fitQuestionText(optionsFor(4, 6)))
      .toContain("That doesn't fit 4–6 sessions of 15–20 minutes")
  })

  // 🔴 Mike's Dashboard course, 2026-08-03: the plan had FEWER sessions than he
  // asked for, and the wording called the alternative "as short as possible"
  // while offering MORE sessions than the other option — beside a course of
  // four it announced that "the fewest this material can be is 7 sessions".
  describe('when the plan has too FEW sessions, not too many', () => {
    const shortLibrary = () => library([
      record({ title: 'Dashboard Discussions', cpd: { isHidden: false, objective: 'o', watchedVideo: 14, reviewTemplate: 20, reheasedTemplate: 30 } })
    ])
    const shortOutline = { ...OUTLINE, sessions: [{ id: 1, title: 't', focus: 'f', resources: ['Dashboard Discussions'], objectives: [] }] }
    const optionsForShort = (min, max) => effort.fitOptions(
      shortOutline, { min: 15, max: 20 }, { min, max: max === undefined ? min : max }, shortLibrary()
    )

    test('their own number is offered when the material divides that far', () => {
      // 14 + 20 + 30 makes exactly six sessions at a 14-minute length — a figure
      // the old five-minute sweep stepped straight over.
      const [, alternative] = copy.fitChoiceOptions(optionsForShort(6))
      expect(alternative.label).toBe('Keep your 6 sessions — each one up to 14 minutes')
    })

    test('nothing is ever called "as short as possible" while adding sessions', () => {
      const [, alternative] = copy.fitChoiceOptions(optionsForShort(20))
      expect(alternative.label).not.toContain('as short as possible')
      expect(alternative.label).toBe('Split it as far as it will go — 13 sessions of up to 5 minutes')
    })

    test('the question says how far the material actually divides', () => {
      const text = copy.fitQuestionText(optionsForShort(20))
      expect(text).toContain('the most it can be split into is 13 sessions')
      expect(text).not.toContain('the fewest this material can be')
    })
  })
})

describe('reading a typed reply — it must not be guessed at', () => {
  test('the two clear answers are recognised', () => {
    expect(copy.readFitReply('keep the session length')).toBe('keep-length')
    expect(copy.readFitReply('shorter sessions please')).toBe('keep-length')
    expect(copy.readFitReply('keep my 4 sessions')).toBe('keep-count')
    expect(copy.readFitReply('fewer sessions')).toBe('keep-count')
    expect(copy.readFitReply('the second one')).toBe('keep-count')
  })

  test('anything unclear returns nothing rather than a guess', () => {
    expect(copy.readFitReply('whatever you think')).toBeNull()
    expect(copy.readFitReply('not fussed really')).toBeNull()
    expect(copy.readFitReply('')).toBeNull()
    expect(copy.readFitReply('keep the length but fewer sessions')).toBeNull()
  })
})

describe('minutes are spelled the way an advisor says them', () => {
  test.each([
    [9, '9 minutes'],
    [60, '1 hour'],
    [70, '1 hour 10 minutes'],
    [173, '2 hours 53 minutes']
  ])('%i minutes reads as "%s"', (mins, expected) => {
    expect(copy.spellMinutes(mins)).toBe(expected)
  })

  test('a length that is not published says nothing at all', () => {
    expect(copy.spellMinutes(0)).toBe('')
    expect(copy.spellMinutes(null)).toBe('')
  })

  test('a budget with one end reads as one figure', () => {
    expect(copy.spellBudget({ min: 30, max: 30 })).toBe('30 minutes')
    expect(copy.spellBudget({ min: 15, max: 20 })).toBe('15–20 minutes')
  })
})

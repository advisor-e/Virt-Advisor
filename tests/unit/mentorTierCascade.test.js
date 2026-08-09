'use strict'

// Phase 5 of design/MENTOR-SAVE-SCOPE-PLAN.md — the Advisory Staircase and the quiz
// banks inherit what the MENTOR authored, not just what Advisor-e shipped in the repo.
//
// THE DEFECT THIS CLOSES. Phase 3 made a mentor's save land at mentor level, under the
// reserved platform scope. Phase 4 made map-shaped content (domain support, logic
// tables) cascade down to firms. These two blocks were left behind: they resolve
// through resolveInheritedRows against a base, and that base was the SHIPPED FILE. So
// a mentor could add a staircase step or a quiz question at /mentor, see it saved, see
// it on their own screen with version history beside it — and no firm would ever get
// it. The screen said it worked. Same failure family as the domain-support storage-key
// defect (2026-07-30) and the quiz-engine read path (2026-07-31): saved, shown, unused.
//
// The fix is the same function calling itself one level up, so there is ONE rule for
// two tiers rather than a second mechanism for the new one.

const { loadBlendedStaircase, BASE_STAIRCASE } = require('../../server/utils/staircaseConfig')
const { loadBlendedQuizBanks, isBrowserAuthored, baseBanks } = require('../../server/utils/quizConfig')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { ownStepPrefix } = require('../../server/utils/firmStaircase')
const { ownQuestionPrefix } = require('../../server/utils/firmQuizzes')

const FIRM = 'firm-phase5'

/**
 * A loader stub keyed by scope AND config key — the shape the real overlay reader has.
 * Phase 5 is the first thing to read TWO scopes in one call, so a loader that ignored
 * the scope id would pass these tests while the cascade was broken.
 *
 * @param {Object.<string, Object>} byScope - { scopeId: { configKey: value } }
 * @returns {function(string, string): Promise<*>}
 */
const loaderFor = byScope => jest.fn((scopeId, key) => Promise.resolve((byScope[scopeId] || {})[key]))

const BANK_KEY = Object.keys(baseBanks())[0]

describe('the Advisory Staircase inherits from the mentor', () => {
  it('a step the MENTOR added reaches a firm that has decided nothing', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-own': [{ id: 'as-mentor-new', name: 'Stewardship', description: 'Mentor-authored step.' }] }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const names = resolved.steps.map(s => s.name)

    expect(names).toContain('Stewardship')
    // Position is assigned by the firm's own renumber, so the added step is last and
    // the printed list stays contiguous — no gap for the advisor to read as a bug.
    expect(resolved.steps[resolved.steps.length - 1].step).toBe(resolved.steps.length)
  })

  it('a step the MENTOR renamed reaches a firm that has not touched it', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-overrides': { 'as-interpretation': { name: 'Insight' } } }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const step = resolved.steps.find(s => s.id === 'as-interpretation')

    expect(step.name).toBe('Insight')
  })

  it("the FIRM'S own wording still beats the mentor's for the same step", async () => {
    // The delta rule Mike ruled on 2026-08-09: nearest level wins, and only for the
    // fields it actually changed.
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-overrides': { 'as-interpretation': { name: 'Insight', description: 'Mentor wording.' } } },
      [FIRM]: { 'staircase-overrides': { 'as-interpretation': { name: 'Client Insight' } } }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const step = resolved.steps.find(s => s.id === 'as-interpretation')

    expect(step.name).toBe('Client Insight')
    // ...and the mentor's edit to a field the firm did NOT touch still gets through.
    // A clone would have frozen the firm's copy here; this is what proves it is a delta.
    expect(step.description).toBe('Mentor wording.')
  })

  it('a step the MENTOR switched off disappears for firms too', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-declines': ['as-observation'] }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)

    expect(resolved.steps.some(s => s.id === 'as-observation')).toBe(false)
  })

  it('a firm can still switch off a step the MENTOR added', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-own': [{ id: 'as-mentor-new', name: 'Stewardship' }] },
      [FIRM]: { 'staircase-declines': ['as-mentor-new'] }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)

    expect(resolved.steps.some(s => s.id === 'as-mentor-new')).toBe(false)
  })

  it("the MENTOR'S own level resolves against the shipped file, and stops there", async () => {
    // What ends the recursion. If the platform scope ever inherited from itself this
    // would hang rather than fail, which is why it is asserted rather than assumed.
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-own': [{ id: 'as-mentor-new', name: 'Stewardship' }] }
    })

    const resolved = await loadBlendedStaircase(PLATFORM_SCOPE, loader)

    expect(resolved.steps.map(s => s.id)).toEqual(
      BASE_STAIRCASE.steps.map(s => s.id).concat('as-mentor-new')
    )
    // The mentor's scope is read; no other scope is.
    for (const call of loader.mock.calls) { expect(call[0]).toBe(PLATFORM_SCOPE) }
  })

  it('NO REGRESSION — with nothing stored anywhere, a firm gets the shipped base itself', async () => {
    // The tuned behaviour every firm has today rides on this being byte-identical.
    const resolved = await loadBlendedStaircase(FIRM, loaderFor({}))

    expect(resolved).toBe(BASE_STAIRCASE)
  })
})

describe('the quiz banks inherit from the mentor', () => {
  it('a question the MENTOR added reaches a firm that has decided nothing', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: {
        'quiz-own': [{ id: 'qz-mentor-1', bank: BANK_KEY, question: 'Mentor Q', answer: 'Mentor A', keyPoint: 'Mentor K' }]
      }
    })

    const banks = await loadBlendedQuizBanks(FIRM, loader)

    expect(banks[BANK_KEY].entries.some(e => e.qid === 'qz-mentor-1')).toBe(true)
  })

  it('SECURITY — a mentor-authored question stays FENCED once a firm inherits it', async () => {
    // THE TRAP THIS TEST EXISTS FOR. `source` describes a row's relationship to the
    // level below it, so the mentor's own question is re-tagged `platform` the moment
    // a firm inherits it — and reading `source` alone would hand browser-typed text to
    // the AI unfenced. Mentor text is worse than a firm's here, not better: a firm's
    // reaches one firm, a mentor's reaches every firm at once.
    const loader = loaderFor({
      [PLATFORM_SCOPE]: {
        'quiz-own': [{ id: 'qz-mentor-1', bank: BANK_KEY, question: 'Mentor Q', answer: 'Mentor A', keyPoint: 'Mentor K' }]
      }
    })

    const banks = await loadBlendedQuizBanks(FIRM, loader)
    const mentorEntry = banks[BANK_KEY].entries.find(e => e.qid === 'qz-mentor-1')
    const shippedEntry = banks[BANK_KEY].entries.find(e => e.qid === 'qz-1')

    expect(isBrowserAuthored(mentorEntry)).toBe(true)
    // ...and Advisor-e's own shipped questions are still NOT fenced, so the tuned
    // prompt is unchanged for them. Over-fencing everything would pass the line above.
    expect(isBrowserAuthored(shippedEntry)).toBe(false)
  })

  it("a firm's own edit of a mentor question wins", async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: {
        'quiz-own': [{ id: 'qz-mentor-1', bank: BANK_KEY, question: 'Mentor Q', answer: 'Mentor A', keyPoint: 'Mentor K' }]
      },
      [FIRM]: { 'quiz-overrides': { 'qz-mentor-1': { question: 'Firm Q' } } }
    })

    const banks = await loadBlendedQuizBanks(FIRM, loader)
    const entry = banks[BANK_KEY].entries.find(e => e.qid === 'qz-mentor-1')

    expect(entry.question).toBe('Firm Q')
    // The mentor's untouched fields still flow through — delta, not clone.
    expect(entry.keyPoint).toBe('Mentor K')
    // ...and it is still fenced, having been browser-typed at both levels.
    expect(isBrowserAuthored(entry)).toBe(true)
  })

  it('a question the MENTOR switched off disappears for firms too', async () => {
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'quiz-declines': ['qz-1'] }
    })

    const banks = await loadBlendedQuizBanks(FIRM, loader)

    expect(banks[BANK_KEY].entries.some(e => e.qid === 'qz-1')).toBe(false)
  })

  it('NO REGRESSION — with nothing stored anywhere, a firm gets the shipped banks themselves', async () => {
    const banks = await loadBlendedQuizBanks(FIRM, loaderFor({}))

    expect(banks).toBe(baseBanks())
  })
})

// ── The id collision Phase 5 would otherwise have created ─────────────────────
//
// FOUND WHILE BUILDING PHASE 5, not afterwards, and it is the reason the two tiers
// mint under different prefixes. Own-row numbers are counted from the rows a SCOPE
// already holds, so the mentor's first added step and a firm's first added step were
// both `fs-1`. Nothing was wrong with that while the tiers never met. Phase 5 makes
// them meet in one resolved list, and every decision in the mechanism is keyed to an
// id — so a firm switching off "its own" step would have dropped the mentor's.
//
// A stub loader that could not tell the scopes apart reproduced this exactly, which is
// how it surfaced. It is asserted here rather than left to that accident.

describe('the two tiers cannot mint the same id', () => {
  it('a mentor numbers under a different prefix from a firm', () => {
    expect(ownStepPrefix(PLATFORM_SCOPE)).not.toBe(ownStepPrefix(FIRM))
    expect(ownQuestionPrefix(PLATFORM_SCOPE)).not.toBe(ownQuestionPrefix(FIRM))
  })

  it("a firm's first added step and the mentor's first added step are two steps, not one", async () => {
    const mentorId = `${ownStepPrefix(PLATFORM_SCOPE)}1`
    const firmId = `${ownStepPrefix(FIRM)}1`
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-own': [{ id: mentorId, name: 'Mentor step' }] },
      [FIRM]: { 'staircase-own': [{ id: firmId, name: 'Firm step' }] }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const names = resolved.steps.map(s => s.name)

    expect(names).toContain('Mentor step')
    expect(names).toContain('Firm step')
    // The failure this guards: one id, two steps, and a decline that hits the wrong one.
    expect(new Set(resolved.steps.map(s => s.id)).size).toBe(resolved.steps.length)
  })

  it("a firm switching off ITS OWN added step leaves the mentor's standing", async () => {
    const mentorId = `${ownStepPrefix(PLATFORM_SCOPE)}1`
    const firmId = `${ownStepPrefix(FIRM)}1`
    const loader = loaderFor({
      [PLATFORM_SCOPE]: { 'staircase-own': [{ id: mentorId, name: 'Mentor step' }] },
      [FIRM]: {
        'staircase-own': [{ id: firmId, name: 'Firm step' }],
        'staircase-declines': [firmId]
      }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const names = resolved.steps.map(s => s.name)

    expect(names).toContain('Mentor step')
    // A decline applies to what this level INHERITED, so the firm's own row is not
    // removed by it — but the point stands: the mentor's step is untouched, which is
    // what a shared prefix would have broken.
    expect(names.filter(n => n === 'Mentor step')).toHaveLength(1)
  })
})

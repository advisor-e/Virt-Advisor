/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * caseMixin — the advisor's saved case studies: loading them, reviewing them, sharing
 * them with the firm, and promoting one into the firm's coaching reference.
 *
 * 216 lines at 0% coverage until 2026-07-30 (design/COVERAGE-DEBT.md) — the largest
 * untested file outside the AI engine. Three of its behaviours exist because of a
 * specific past defect or rule, and those are the ones asserted hardest here:
 *
 *   1. "MINE" IS KEYED ON THE SERVER-RETURNED IDENTITY, never a client-held id. Firm-
 *      shared cases from other advisors stay in `visibleCases` (the AI may reference
 *      them) but must never be listed as the advisor's own.
 *   2. THE TOKEN RACE. The Bearer token resolves in the parent page's mounted(), which
 *      runs AFTER this child mounts, so the first load could 401 and the advisor's cases
 *      looked WIPED on refresh. The `apiToken` watcher re-runs load and migration once
 *      the real token settles.
 *   3. PROMOTION SENDS ONLY AN ID. The backend builds the coaching entry from the stored
 *      case and stamps who/when from the verified token, so promoted text and its audit
 *      trail cannot be forged from the browser. A test that let a payload grow would let
 *      that guarantee go quietly.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')

jest.mock('~/utils/cases', () => ({
  listCases: jest.fn(),
  updateCaseReview: jest.fn(),
  deleteCase: jest.fn(),
  setCaseVisibility: jest.fn(),
  migrateLegacyCases: jest.fn()
}))

const cases = require('~/utils/cases')
const caseMixin = require('~/mixins/caseMixin').default

const MINE = {
  id: 'case-mine',
  advisorId: 'advisor-1',
  mode: 'client',
  visibility: 'private',
  templates: ['8 Profit Levers', 'Growth Curve'],
  review: null
}
const THEIRS = { id: 'case-theirs', advisorId: 'advisor-2', mode: 'client', visibility: 'shared', templates: [] }

const Host = {
  name: 'CaseHost',
  mixins: [caseMixin],
  props: {
    mode: { type: String, default: 'client' },
    apiToken: { type: String, default: 'token-1' }
  },
  data () {
    // Owned by speechMixin in the real screens; declared here so closeCasesPanel's
    // recogniser teardown is reachable.
    return { reviewRecordingField: null, recognition: null }
  },
  render (h) { return h('div') }
}

/**
 * Drain the pending microtasks. `mounted()` awaits the legacy migration and only THEN
 * calls the load, which awaits again, so a single `$nextTick()` settles neither — the
 * assertions run against empty state and every test fails for the same wrong reason.
 * A microtask loop rather than `setImmediate`, because the promotion tests run under
 * jest's fake timers, which fake `setImmediate` too.
 */
async function flush (wrapper) {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve()
    if (wrapper) { await wrapper.vm.$nextTick() }
  }
}

/** Mount and let mounted()'s migration + load settle. */
async function mountHost (props) {
  const wrapper = mountWithBuefy(Host, { propsData: props })
  await flush(wrapper)
  return wrapper
}

beforeEach(() => {
  jest.clearAllMocks()
  cases.listCases.mockResolvedValue({ cases: [MINE, THEIRS], advisorId: 'advisor-1' })
  cases.migrateLegacyCases.mockResolvedValue(undefined)
  cases.updateCaseReview.mockResolvedValue(undefined)
  cases.deleteCase.mockResolvedValue(undefined)
  cases.setCaseVisibility.mockResolvedValue(undefined)
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }))
})

afterEach(() => { delete global.fetch })

describe('caseMixin — loading on mount', () => {
  test('lifts any pre-database cases once, then loads from the backend', async () => {
    await mountHost()

    expect(cases.migrateLegacyCases).toHaveBeenCalledWith('token-1')
    expect(cases.listCases).toHaveBeenCalledWith('token-1')
  })

  test('a failed migration never blocks the load', async () => {
    cases.migrateLegacyCases.mockRejectedValueOnce(new Error('legacy blob unreadable'))

    const wrapper = await mountHost()

    expect(cases.listCases).toHaveBeenCalled()
    expect(wrapper.vm.visibleCases).toHaveLength(2)
    expect(wrapper.vm.casesError).toBe(false)
  })
})

describe('caseMixin — whose cases are "mine"', () => {
  test('splits own from firm-shared using the SERVER-returned advisor id', async () => {
    const wrapper = await mountHost()

    // Everything the advisor may see — the AI may reference a colleague's shared case.
    expect(wrapper.vm.visibleCases.map(c => c.id)).toEqual(['case-mine', 'case-theirs'])
    // But only their own is listed as theirs.
    expect(wrapper.vm.myCases.map(c => c.id)).toEqual(['case-mine'])
    expect(wrapper.vm.serverAdvisorId).toBe('advisor-1')
  })

  test('ignores the advisorId prop entirely — a client-held id cannot claim a case', async () => {
    cases.listCases.mockResolvedValue({ cases: [MINE, THEIRS], advisorId: 'advisor-2' })

    const wrapper = await mountHost()

    expect(wrapper.vm.myCases.map(c => c.id)).toEqual(['case-theirs'])
  })

  test('when the server returns no identity, nothing is filtered out', async () => {
    cases.listCases.mockResolvedValue({ cases: [MINE, THEIRS], advisorId: null })

    const wrapper = await mountHost()

    expect(wrapper.vm.serverAdvisorId).toBeNull()
    expect(wrapper.vm.myCases).toHaveLength(2)
  })

  test('a load failure flags the error and keeps whatever was already on screen', async () => {
    const wrapper = await mountHost()
    expect(wrapper.vm.visibleCases).toHaveLength(2)

    cases.listCases.mockRejectedValueOnce(new Error('offline'))
    await wrapper.vm.refreshMyCases()

    expect(wrapper.vm.casesError).toBe(true)
    expect(wrapper.vm.visibleCases).toHaveLength(2)
  })
})

// The defect this watcher exists for: cases appeared WIPED after a refresh, because the
// first load ran before the parent had resolved the token.
describe('caseMixin — the token race', () => {
  test('a token arriving after mount re-runs the migration and the load', async () => {
    const wrapper = await mountHost({ mode: 'client', apiToken: '' })
    jest.clearAllMocks()

    wrapper.setProps({ apiToken: 'real-jwt' })
    await flush(wrapper)

    expect(cases.migrateLegacyCases).toHaveBeenCalledWith('real-jwt')
    expect(cases.listCases).toHaveBeenCalledWith('real-jwt')
  })

  test('a token that goes away does NOT trigger a reload', async () => {
    const wrapper = await mountHost()
    jest.clearAllMocks()

    wrapper.setProps({ apiToken: '' })
    await flush(wrapper)

    expect(cases.listCases).not.toHaveBeenCalled()
  })

  test('a failed re-migration still lets the reload happen', async () => {
    const wrapper = await mountHost({ mode: 'client', apiToken: '' })
    cases.migrateLegacyCases.mockRejectedValueOnce(new Error('nope'))
    jest.clearAllMocks()
    cases.migrateLegacyCases.mockRejectedValueOnce(new Error('nope'))

    wrapper.setProps({ apiToken: 'real-jwt' })
    await flush(wrapper)

    expect(cases.listCases).toHaveBeenCalledWith('real-jwt')
  })
})

describe('caseMixin — relevantCases', () => {
  test('is empty with no mode, rather than showing everything', async () => {
    const wrapper = await mountHost({ mode: '', apiToken: 'token-1' })

    expect(wrapper.vm.relevantCases).toEqual([])
  })

  test('shows only this mode, capped at four, newest order preserved', async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, advisorId: 'advisor-1', mode: 'client', templates: [] }))
    cases.listCases.mockResolvedValue({ cases: [...many, { id: 'other', advisorId: 'advisor-1', mode: 'plan' }], advisorId: 'advisor-1' })

    const wrapper = await mountHost()

    expect(wrapper.vm.relevantCases).toHaveLength(4)
    expect(wrapper.vm.relevantCases.map(c => c.id)).toEqual(['c0', 'c1', 'c2', 'c3'])
  })
})

describe('caseMixin — expanding a case for review', () => {
  test('seeds an outcome entry for EVERY template up front', async () => {
    const wrapper = await mountHost()

    wrapper.vm.toggleCase('case-mine')

    // Vue 2 cannot observe keys added later, so every template must be present now
    // or its chip would never react to a click.
    expect(Object.keys(wrapper.vm.reviewDraft.templateOutcomes)).toEqual(['8 Profit Levers', 'Growth Curve'])
    expect(wrapper.vm.reviewDraft.templateOutcomes['Growth Curve']).toEqual({ used: null, outcome: null })
  })

  test('seeds from outcomes already saved on the case', async () => {
    cases.listCases.mockResolvedValue({
      cases: [{ ...MINE, templateOutcomes: [{ title: '8 Profit Levers', used: 'full', outcome: 'well' }] }],
      advisorId: 'advisor-1'
    })
    const wrapper = await mountHost()

    wrapper.vm.toggleCase('case-mine')

    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers']).toEqual({ used: 'full', outcome: 'well' })
  })

  test('seeds the written review when the case already has one', async () => {
    cases.listCases.mockResolvedValue({
      cases: [{ ...MINE, review: { wentWell: 'Landed well', wentLess: '', changesRecommended: '' } }],
      advisorId: 'advisor-1'
    })
    const wrapper = await mountHost()

    wrapper.vm.toggleCase('case-mine')

    expect(wrapper.vm.reviewDraft.wentWell).toBe('Landed well')
    expect(wrapper.vm.reviewDraft.wentLess).toBe('')
  })

  test('clicking the open case collapses it', async () => {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')

    wrapper.vm.toggleCase('case-mine')

    expect(wrapper.vm.expandedCaseId).toBeNull()
  })

  test('expanding clears a pending delete confirmation and any saved flag', async () => {
    const wrapper = await mountHost()
    wrapper.vm.confirmDeleteId = 'case-mine'
    wrapper.vm.reviewSavedId = 'case-mine'

    wrapper.vm.toggleCase('case-mine')

    expect(wrapper.vm.confirmDeleteId).toBeNull()
    expect(wrapper.vm.reviewSavedId).toBeNull()
  })

  test('expanding an unknown id yields an empty draft rather than throwing', async () => {
    const wrapper = await mountHost()

    wrapper.vm.toggleCase('no-such-case')

    expect(wrapper.vm.reviewDraft.templateOutcomes).toEqual({})
    expect(wrapper.vm.reviewDraft.wentWell).toBe('')
  })
})

describe('caseMixin — the outcome chips', () => {
  async function expanded () {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')
    return wrapper
  }

  test('clicking a chip sets it; clicking the same chip again clears it', async () => {
    const wrapper = await expanded()

    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'full')
    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].used).toBe('full')

    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'full')
    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].used).toBeNull()
  })

  test('marking a template unused clears any landed verdict — it cannot have landed', async () => {
    const wrapper = await expanded()
    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'full')
    wrapper.vm.setOutcomeResult('8 Profit Levers', 'well')

    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'none')

    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].outcome).toBeNull()
  })

  test('a landed verdict cannot be set on a template that was not used', async () => {
    const wrapper = await expanded()
    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'none')

    wrapper.vm.setOutcomeResult('8 Profit Levers', 'well')

    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].outcome).toBeNull()
  })

  test('a verdict clicked twice clears', async () => {
    const wrapper = await expanded()
    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'partial')

    wrapper.vm.setOutcomeResult('8 Profit Levers', 'less')
    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].outcome).toBe('less')

    wrapper.vm.setOutcomeResult('8 Profit Levers', 'less')
    expect(wrapper.vm.reviewDraft.templateOutcomes['8 Profit Levers'].outcome).toBeNull()
  })

  test('an unknown template is a no-op on both handlers, never a crash', async () => {
    const wrapper = await expanded()

    expect(() => wrapper.vm.setOutcomeUsed('Not A Template', 'full')).not.toThrow()
    expect(() => wrapper.vm.setOutcomeResult('Not A Template', 'well')).not.toThrow()
  })
})

describe('caseMixin — saving a review', () => {
  test('sends only the templates the advisor actually marked', async () => {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')
    wrapper.vm.reviewDraft.wentWell = 'Good session'
    wrapper.vm.setOutcomeUsed('8 Profit Levers', 'full')
    wrapper.vm.setOutcomeResult('8 Profit Levers', 'well')

    await wrapper.vm.saveReview('case-mine')

    const [id, payload, token] = cases.updateCaseReview.mock.calls[0]
    expect(id).toBe('case-mine')
    expect(token).toBe('token-1')
    expect(payload.wentWell).toBe('Good session')
    // 'Growth Curve' was left untouched, so it stays unrecorded rather than being
    // reported as an unused template.
    expect(payload.templateOutcomes).toEqual([{ title: '8 Profit Levers', used: 'full', outcome: 'well' }])
  })

  test('sends null when nothing was marked, not an empty array', async () => {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')

    await wrapper.vm.saveReview('case-mine')

    expect(cases.updateCaseReview.mock.calls[0][1].templateOutcomes).toBeNull()
  })

  test('stamps an ISO review time', async () => {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')

    await wrapper.vm.saveReview('case-mine')

    expect(cases.updateCaseReview.mock.calls[0][1].reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('reloads and closes the panel on success', async () => {
    const wrapper = await mountHost()
    wrapper.vm.showCasesPanel = true
    wrapper.vm.toggleCase('case-mine')

    await wrapper.vm.saveReview('case-mine')

    expect(cases.listCases).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.showCasesPanel).toBe(false)
    expect(wrapper.vm.expandedCaseId).toBeNull()
  })

  test('a failed save keeps the panel open with the draft intact, so the advisor can retry', async () => {
    cases.updateCaseReview.mockRejectedValueOnce(new Error('500'))
    const wrapper = await mountHost()
    wrapper.vm.showCasesPanel = true
    wrapper.vm.toggleCase('case-mine')
    wrapper.vm.reviewDraft.wentWell = 'Typed a lot of detail'

    await wrapper.vm.saveReview('case-mine')

    expect(wrapper.vm.casesError).toBe(true)
    expect(wrapper.vm.showCasesPanel).toBe(true)
    expect(wrapper.vm.reviewDraft.wentWell).toBe('Typed a lot of detail')
  })
})

describe('caseMixin — promoting a case into the firm reference', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('sends ONLY the case id — the text and audit stamp come from the server', async () => {
    const wrapper = await mountHost()

    await wrapper.vm.promoteCase(MINE)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/cases/promote')
    expect(opts.headers.Authorization).toBe('Bearer token-1')
    expect(JSON.parse(opts.body)).toEqual({ caseId: 'case-mine' })
  })

  test('falls back to the dev bypass token when none is held', async () => {
    const wrapper = await mountHost({ mode: 'client', apiToken: '' })

    await wrapper.vm.promoteCase(MINE)

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer dev-local-bypass')
  })

  test('confirms against that case, and clears itself after three seconds', async () => {
    const wrapper = await mountHost()

    await wrapper.vm.promoteCase(MINE)
    expect(wrapper.vm.promoteSuccessId).toBe('case-mine')

    jest.advanceTimersByTime(3000)
    expect(wrapper.vm.promoteSuccessId).toBeNull()
  })

  test('a rejected request shows the error against that case, and also self-clears', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 403 }))
    const wrapper = await mountHost()

    await wrapper.vm.promoteCase(MINE)
    expect(wrapper.vm.promoteErrorId).toBe('case-mine')
    expect(wrapper.vm.promoteSuccessId).toBeNull()

    jest.advanceTimersByTime(3000)
    expect(wrapper.vm.promoteErrorId).toBeNull()
  })

  test('a network failure is handled the same way as a refusal', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')))
    const wrapper = await mountHost()

    await wrapper.vm.promoteCase(MINE)

    expect(wrapper.vm.promoteErrorId).toBe('case-mine')
  })
})

describe('caseMixin — sharing and deleting', () => {
  test('flips a private case to shared and reloads', async () => {
    const wrapper = await mountHost()

    await wrapper.vm.toggleVisibility('case-mine')

    expect(cases.setCaseVisibility).toHaveBeenCalledWith('case-mine', 'shared', 'token-1')
    expect(cases.listCases).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.visibilityBusyId).toBeNull()
  })

  test('flips a shared case back to private', async () => {
    cases.listCases.mockResolvedValue({ cases: [{ ...MINE, visibility: 'shared' }], advisorId: 'advisor-1' })
    const wrapper = await mountHost()

    await wrapper.vm.toggleVisibility('case-mine')

    expect(cases.setCaseVisibility).toHaveBeenCalledWith('case-mine', 'private', 'token-1')
  })

  test('a case the advisor does not own is not flipped at all', async () => {
    const wrapper = await mountHost()

    await wrapper.vm.toggleVisibility('case-theirs')

    expect(cases.setCaseVisibility).not.toHaveBeenCalled()
  })

  test('a failed flip flags the error and always clears the busy state', async () => {
    cases.setCaseVisibility.mockRejectedValueOnce(new Error('500'))
    const wrapper = await mountHost()

    await wrapper.vm.toggleVisibility('case-mine')

    expect(wrapper.vm.casesError).toBe(true)
    expect(wrapper.vm.visibilityBusyId).toBeNull()
  })

  test('deleting reloads and clears the expanded and confirming state', async () => {
    const wrapper = await mountHost()
    wrapper.vm.toggleCase('case-mine')
    wrapper.vm.confirmDeleteId = 'case-mine'

    await wrapper.vm.deleteCaseAndRefresh('case-mine')

    expect(cases.deleteCase).toHaveBeenCalledWith('case-mine', 'token-1')
    expect(wrapper.vm.expandedCaseId).toBeNull()
    expect(wrapper.vm.confirmDeleteId).toBeNull()
  })

  test('a failed delete leaves the confirmation up rather than pretending it worked', async () => {
    cases.deleteCase.mockRejectedValueOnce(new Error('500'))
    const wrapper = await mountHost()
    wrapper.vm.confirmDeleteId = 'case-mine'

    await wrapper.vm.deleteCaseAndRefresh('case-mine')

    expect(wrapper.vm.casesError).toBe(true)
    expect(wrapper.vm.confirmDeleteId).toBe('case-mine')
  })
})

describe('caseMixin — closing the panel', () => {
  test('resets every piece of panel state', async () => {
    const wrapper = await mountHost()
    wrapper.vm.showCasesPanel = true
    wrapper.vm.toggleCase('case-mine')
    wrapper.vm.reviewDraft.wentWell = 'draft'
    wrapper.vm.reviewSavedId = 'x'
    wrapper.vm.confirmDeleteId = 'x'
    wrapper.vm.promoteSuccessId = 'x'
    wrapper.vm.promoteErrorId = 'x'

    wrapper.vm.closeCasesPanel()

    expect(wrapper.vm.showCasesPanel).toBe(false)
    expect(wrapper.vm.expandedCaseId).toBeNull()
    expect(wrapper.vm.reviewDraft).toEqual({ wentWell: '', wentLess: '', changesRecommended: '', templateOutcomes: {} })
    expect(wrapper.vm.reviewSavedId).toBeNull()
    expect(wrapper.vm.confirmDeleteId).toBeNull()
    expect(wrapper.vm.promoteSuccessId).toBeNull()
    expect(wrapper.vm.promoteErrorId).toBeNull()
  })

  // Same class as the microphone defect in speechMixin.component.test.js: a recogniser
  // left running after the advisor closes the panel keeps the browser recording.
  test('stops the microphone if a review field was being dictated', async () => {
    const wrapper = await mountHost()
    const stop = jest.fn()
    wrapper.vm.reviewRecordingField = 'wentWell'
    wrapper.vm.recognition = { stop }

    wrapper.vm.closeCasesPanel()

    expect(stop).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.reviewRecordingField).toBeNull()
  })

  test('does not reach for a recogniser that was never started', async () => {
    const wrapper = await mountHost()
    wrapper.vm.reviewRecordingField = 'wentWell'
    wrapper.vm.recognition = null

    expect(() => wrapper.vm.closeCasesPanel()).not.toThrow()
    expect(wrapper.vm.reviewRecordingField).toBeNull()
  })
})

describe('caseMixin — display helpers', () => {
  test.each([
    ['client', 'Client situation'],
    ['discover', 'Discovery'],
    ['plan', 'Planning'],
    ['learn', 'Learning']
  ])('names the %s mode', async (mode, expected) => {
    const wrapper = await mountHost()

    expect(wrapper.vm.modeName(mode)).toBe(expected)
  })

  test('an unknown mode falls back to the raw value rather than blank', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.modeName('experimental')).toBe('experimental')
  })

  test('formats a date the way a UK advisor reads it', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.formatDate('2026-07-30T09:00:00.000Z')).toBe('30 Jul 2026')
  })

  test('a missing date is blank, not "Invalid Date"', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.formatDate(null)).toBe('')
    expect(wrapper.vm.formatDate('')).toBe('')
  })
})

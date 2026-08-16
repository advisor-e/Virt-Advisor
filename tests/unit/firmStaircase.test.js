'use strict'

/**
 * The Advisory Staircase on the one firm-editable mechanism (Phase 2, 2026-07-31).
 *
 * WHAT THIS IS PROVING, and why it is not just "the merge works". Before this, a
 * firm's saved staircase was a whole copy of Advisor-e's five steps. That copy was
 * frozen: a sixth step Advisor-e added, or a wording fix it made, could never reach a
 * firm that had customised anything, and there was no way to switch a step off or add
 * one of your own. The mechanism keys every decision to a step's id, so a step the
 * firm has not touched stays current automatically while the ones it edited are
 * protected.
 *
 * The file also locks the migration promise: a firm that saved under the OLD
 * whole-config shape keeps its wording, read as edits of the steps it recognises.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const {
  loadFirmStaircaseState,
  adaptLegacyWholeConfig,
  CONFIG_KEYS,
  FIRM_STEP_PREFIX
} = require('../../server/utils/firmStaircase')
const { loadBlendedStaircase } = require('../../server/utils/staircaseConfig')
const BASE = require('../../data/advisory-staircase.json')

const FIRM = 'firm-test-123'

/**
 * Answer each config key separately, FOR THIS FIRM ONLY — the real store holds four
 * independent keys, and a mock that returns one value for all of them cannot tell a
 * decline from an override.
 *
 * SCOPE MATTERS TOO, since Phase 5 (2026-08-09). A firm's staircase now resolves
 * against the MENTOR'S, so this loader is asked for two scopes in one call. A stub
 * that ignored the scope would hand the firm's own rows to the mentor level as well,
 * and the same step would arrive twice — once inherited, once as the firm's own. That
 * is not a mock artefact to paper over: it is exactly the id collision that
 * MENTOR_STEP_PREFIX now prevents, and the stub reproduced it faithfully.
 *
 * @param {Object} byKey - { 'staircase-declines': [...], ... }
 */
function mockKeys (byKey) {
  overlay.loadFirmConfig.mockImplementation((firmId, key) =>
    Promise.resolve(firmId === FIRM && Object.prototype.hasOwnProperty.call(byKey, key) ? byKey[key] : null))
}

beforeEach(() => { jest.clearAllMocks() })

// ── The state loader ──────────────────────────────────────────────────────────

describe('loadFirmStaircaseState', () => {
  test('a firm with no id is never looked up at all', async () => {
    const state = await loadFirmStaircaseState(null, overlay.loadFirmConfig, BASE.steps)

    expect(state).toEqual({
      declinedIds: [], overrides: {}, ownRows: [], defaultCeiling: null, selectorPrompt: null, fromLegacy: false
    })
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('reads the three decision keys and the settings key', async () => {
    mockKeys({
      [CONFIG_KEYS.declines]: ['as-assimilation'],
      [CONFIG_KEYS.overrides]: { 'as-interpretation': { name: 'Making sense of it' } },
      [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Our own step' }],
      [CONFIG_KEYS.settings]: { defaultCeiling: 'analytical' }
    })

    const state = await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    expect(state.declinedIds).toEqual(['as-assimilation'])
    expect(state.overrides['as-interpretation'].name).toBe('Making sense of it')
    expect(state.ownRows[0].id).toBe('fs-1')
    expect(state.defaultCeiling).toBe('analytical')
    expect(state.fromLegacy).toBe(false)
  })

  test('the read is scoped to the firm id it was given, on every key', async () => {
    // The IDOR guard: firmId comes from the verified JWT, never a request body.
    mockKeys({})

    await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    const firmsAskedFor = overlay.loadFirmConfig.mock.calls.map(c => c[0])
    expect(new Set(firmsAskedFor)).toEqual(new Set([FIRM]))
  })

  test('malformed stored values are coerced, never trusted into the resolver', async () => {
    mockKeys({
      [CONFIG_KEYS.declines]: 'not-an-array',
      [CONFIG_KEYS.overrides]: ['not-an-object'],
      [CONFIG_KEYS.own]: { not: 'an array' },
      [CONFIG_KEYS.settings]: { defaultCeiling: 42 }
    })

    const state = await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    expect(state.declinedIds).toEqual([])
    expect(state.overrides).toEqual({})
    expect(state.ownRows).toEqual([])
    expect(state.defaultCeiling).toBeNull()
  })

  test('an override key matching no platform step does not suppress the legacy read', async () => {
    // Junk under the overrides key is not a decision. Counting it as one would throw
    // away a firm's saved wording on the strength of leftover storage.
    mockKeys({
      [CONFIG_KEYS.overrides]: { 'as-does-not-exist': { name: 'x' } },
      [CONFIG_KEYS.settings]: { steps: [{ step: 1, name: 'Getting the books right' }] }
    })

    const state = await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    expect(state.fromLegacy).toBe(true)
    expect(state.overrides[BASE.steps[0].id]).toEqual({ name: 'Getting the books right' })
  })
})

// ── The migration promise ─────────────────────────────────────────────────────

describe('adaptLegacyWholeConfig — a firm never loses wording it saved', () => {
  test('matches by id when the saved copy carries one', () => {
    const { overrides, ownRows } = adaptLegacyWholeConfig(BASE.steps, {
      steps: [{ id: 'as-interpretation', step: 3, name: 'Making sense of it' }]
    })

    expect(overrides).toEqual({ 'as-interpretation': { name: 'Making sense of it' } })
    expect(ownRows).toEqual([])
  })

  test('matches by POSITION when it does not — the old shape was positional', () => {
    // The whole-config override replaced the array wholesale, so the firm's first row
    // WAS the platform's first row. Reading it any other way re-files their wording
    // under the wrong steps.
    const { overrides } = adaptLegacyWholeConfig(BASE.steps, {
      steps: [{ step: 2, name: 'Making it readable' }]
    })

    expect(overrides).toEqual({ [BASE.steps[1].id]: { name: 'Making it readable' } })
  })

  test('a row identical to the platform is not recorded as an edit', () => {
    // It would otherwise stop tracking Advisor-e's later wording fixes for no reason.
    const { overrides, ownRows } = adaptLegacyWholeConfig(BASE.steps, {
      steps: BASE.steps.map(s => ({ ...s }))
    })

    expect(overrides).toEqual({})
    expect(ownRows).toEqual([])
  })

  test('a step beyond the platform list becomes a step the firm added', () => {
    const { ownRows } = adaptLegacyWholeConfig(BASE.steps, {
      steps: [{ step: 6, name: 'Our sixth', selectorDescription: 'ours', complexityCeiling: 'strategic' }]
    })

    expect(ownRows).toHaveLength(1)
    expect(ownRows[0].id.startsWith(FIRM_STEP_PREFIX)).toBe(true)
    expect(ownRows[0].name).toBe('Our sixth')
  })

  test('junk is skipped rather than promoted into a step an advisor could pick', () => {
    const { overrides, ownRows } = adaptLegacyWholeConfig(BASE.steps, {
      steps: [{ step: 'six', name: 'No number' }, { name: 'No position' }, null, 'nonsense']
    })

    expect(overrides).toEqual({})
    expect(ownRows).toEqual([])
  })

  test('nothing stored, or a shape that is not a config, carries nothing across', () => {
    expect(adaptLegacyWholeConfig(BASE.steps, null)).toEqual({ overrides: {}, ownRows: [] })
    expect(adaptLegacyWholeConfig(BASE.steps, { steps: [] })).toEqual({ overrides: {}, ownRows: [] })
    expect(adaptLegacyWholeConfig(BASE.steps, ['array'])).toEqual({ overrides: {}, ownRows: [] })
  })
})

// ── The blend ─────────────────────────────────────────────────────────────────

describe('loadBlendedStaircase — the firm decisions the mechanism now allows', () => {
  test('a firm that has decided nothing gets the platform base itself', async () => {
    mockKeys({})

    expect(await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)).toBe(BASE)
  })

  test('DECLINE: the step drops out and the rest renumber, so the advisor sees 1..4', async () => {
    mockKeys({ [CONFIG_KEYS.declines]: [BASE.steps[1].id] })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps.map(s => s.name)).toEqual(
      BASE.steps.filter((_, i) => i !== 1).map(s => s.name))
    // Contiguous, or the selector prints "Step 1, Step 3, Step 4" and reads as a bug.
    expect(blended.steps.map(s => s.step)).toEqual([1, 2, 3, 4])
  })

  test('OVERRIDE: the edited step is replaced in place, exactly once', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [BASE.steps[2].id]: { name: 'Making sense of it' } } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    const matches = blended.steps.filter(s => s.id === BASE.steps[2].id)
    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('Making sense of it')
    expect(matches[0].step).toBe(3)
  })

  test('ADD: the firm own step arrives after the platform steps, numbered next', async () => {
    mockKeys({
      [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Our sixth', selectorDescription: 'ours', complexityCeiling: 'strategic' }]
    })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps).toHaveLength(BASE.steps.length + 1)
    expect(blended.steps[5]).toMatchObject({ id: 'fs-1', name: 'Our sixth', step: 6 })
  })

  // THE HEADLINE FIX. Under the old whole-copy override, editing one step froze all
  // five: the other four were the firm's private copy of Advisor-e's wording at the
  // moment they saved, and any later platform change was invisible to them for good.
  test("a step the firm did not touch is still Advisor-e's, live", async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [BASE.steps[0].id]: { name: 'Getting the books right' } } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps[0].name).toBe('Getting the books right')
    expect(blended.steps.slice(1)).toMatchObject(
      BASE.steps.slice(1).map(s => ({ name: s.name, selectorDescription: s.selectorDescription })))
  })

  test('a resolved step is badged with where it came from', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [BASE.steps[0].id]: { name: 'Ours' } },
      [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Our sixth' }]
    })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps[0].source).toBe('firm-override')
    expect(blended.steps[1].source).toBe('platform')
    expect(blended.steps[5].source).toBe('firm-own')
  })

  test('declining every step falls back to the platform list, never an empty selector', async () => {
    // A staircase with no steps is a dead end mid-session, not a customisation.
    mockKeys({ [CONFIG_KEYS.declines]: BASE.steps.map(s => s.id) })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('the firm defaultCeiling is honoured without touching the platform base', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { defaultCeiling: 'strategic' } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.defaultCeiling).toBe('strategic')
    expect(BASE.defaultCeiling).toBe('foundational')
  })

  test('one firm decisions are never served to another', async () => {
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      Promise.resolve(firmId === 'another-firm' && key === CONFIG_KEYS.declines ? [BASE.steps[0].id] : null))

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended).toBe(BASE)
  })

  // ── The advisor's question (item 4.16 E, 2026-08-16) ────────────────────────
  // `selectorPrompt` was authored in the data file from the start and read by
  // NOTHING — the engine asked a hardcoded copy — so every tier's edit to it
  // reached no advisor. These lock the read path end to end.

  test('a firm question is honoured, and the platform file is untouched', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { selectorPrompt: 'How deep is this relationship right now?' } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.selectorPrompt).toBe('How deep is this relationship right now?')
    expect(BASE.selectorPrompt).toBe('Where would you say your current engagement with this client sits on the Advisory Staircase?')
  })

  test('a firm question alone is enough to resolve — it is not lost for want of a step decision', async () => {
    // The early return exists so an untouched firm gets the base object itself. It
    // guarded on decisions and defaultCeiling only, so before this the one thing a
    // firm had actually written would have been dropped on the way out.
    mockKeys({ [CONFIG_KEYS.settings]: { selectorPrompt: 'Where are we with this client?' } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended).not.toBe(BASE)
    expect(blended.selectorPrompt).toBe('Where are we with this client?')
    expect(blended.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('a firm that has written no question of its own inherits the one above it', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { defaultCeiling: 'strategic' } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.selectorPrompt).toBe(BASE.selectorPrompt)
  })

  test('a blank question is not a customisation — the advisor is never asked nothing', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { selectorPrompt: '   ' } })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.selectorPrompt).toBe(BASE.selectorPrompt)
  })

  test('surrounding whitespace is trimmed rather than asked', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { selectorPrompt: '  Where are we?  ' } })

    const state = await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    expect(state.selectorPrompt).toBe('Where are we?')
  })

  test('a non-string question is ignored, not asked', async () => {
    mockKeys({ [CONFIG_KEYS.settings]: { selectorPrompt: 42 } })

    const state = await loadFirmStaircaseState(FIRM, overlay.loadFirmConfig, BASE.steps)

    expect(state.selectorPrompt).toBeNull()
  })
})

// ── Degradation ───────────────────────────────────────────────────────────────

describe('loadBlendedStaircase — a storage problem never stops a session', () => {
  afterEach(() => { jest.restoreAllMocks() })

  test('development falls back to the JSON stand-ins, so the tab is testable at all', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
      if (String(file).includes('dev-firm-staircase-declines')) {
        return JSON.stringify({ [FIRM]: [BASE.steps[1].id] })
      }
      throw new Error('ENOENT')
    })

    const blended = await loadBlendedStaircase(FIRM, overlay.loadFirmConfig)

    expect(blended.steps).toHaveLength(BASE.steps.length - 1)
  })

  test('production logs the fault and serves the base — it never reads a stand-in file', async () => {
    // A stray dev file on a production box must not be able to rewrite a firm's
    // staircase, and an outage must not be dressed up as "this firm has no override".
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const prodConfig = require('../../server/utils/staircaseConfig')
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ [FIRM]: ['as-assimilation'] }))
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const blended = await prodConfig.loadBlendedStaircase(FIRM, () => Promise.reject(new Error('no db')))

      expect(blended.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
      expect(readSpy).not.toHaveBeenCalled()
      expect(errSpy).toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })
})

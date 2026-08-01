'use strict'

// Proves the Advisory Staircase firm override actually reaches the decision
// output. The request handler blends a firm override over the platform base with
// firmOverlay.deepMerge and hands the result to buildCaseState; these tests
// reproduce that blend with the real deepMerge so the path under test is the
// real one — not a stand-in.

const { buildCaseState, staircaseToCeiling } = require('../../server/utils/caseState')
const { deepMerge } = require('../../server/utils/firmOverlay')
const { resolveStaircaseStep } = require('../../server/utils/staircaseConfig')
const { SIGNAL_TYPES } = require('../../server/utils/signals')
const BASE_STAIRCASE = require('../../data/advisory-staircase.json')

/** The answer text the selector actually submits: label, then the description. */
function answerFor (step) {
  return `Step ${step.step}: ${step.name} — ${step.selectorDescription || 'some description'}`
}

// A signals array carrying just the staircase level the resolver reads.
function signalsAtStep (step) {
  return [{ type: SIGNAL_TYPES.RELATIONSHIP_MATURITY, value: step }]
}

describe('staircaseToCeiling — base behaviour (no override)', () => {
  test('maps a known step to its base complexity ceiling', () => {
    // Base data: step 5 (Observation) is the only strategic step.
    expect(staircaseToCeiling(5)).toBe('strategic')
    expect(staircaseToCeiling(1)).toBe('foundational')
    expect(staircaseToCeiling(3)).toBe('analytical')
  })

  test('falls back to the base defaultCeiling for an unknown or missing step', () => {
    expect(staircaseToCeiling(99)).toBe(BASE_STAIRCASE.defaultCeiling)
    expect(staircaseToCeiling(null)).toBe(BASE_STAIRCASE.defaultCeiling)
  })
})

describe('staircaseToCeiling — with a blended firm override', () => {
  test('a partial override (defaultCeiling only) changes the fallback while keeping base steps', () => {
    const blended = deepMerge(BASE_STAIRCASE, { defaultCeiling: 'analytical' })
    // Unknown step now falls back to the firm's defaultCeiling, not the base one.
    expect(staircaseToCeiling(99, blended)).toBe('analytical')
    // A known base step is untouched.
    expect(staircaseToCeiling(5, blended)).toBe('strategic')
  })

  test('an override that rewrites the steps array changes a known step ceiling', () => {
    // deepMerge replaces arrays wholesale, so the firm supplies the full steps
    // array (exactly what the save route validates).
    const override = {
      defaultCeiling: 'foundational',
      steps: [
        { step: 1, name: 'Compilation', complexityCeiling: 'foundational' },
        { step: 5, name: 'Observation', complexityCeiling: 'foundational' } // firm lowered step 5
      ]
    }
    const blended = deepMerge(BASE_STAIRCASE, override)
    expect(staircaseToCeiling(5, blended)).toBe('foundational') // was 'strategic' in base
  })
})

/**
 * Resolving the advisor's answer to a step.
 *
 * The defect: the engine read the position number out of the answer text and
 * trusted it, so the position WAS the identity. Insert or reorder a step and every
 * stored "Step 3" quietly meant a different step — a different complexity ceiling,
 * different templates, and nothing to notice it had happened.
 */
describe('resolveStaircaseStep — the answer text, not the position alone', () => {
  test('resolves every platform step from the text the selector really submits', () => {
    BASE_STAIRCASE.steps.forEach((step) => {
      expect(resolveStaircaseStep(answerFor(step))).toBe(step)
    })
  })

  test('THE FIX: a step that MOVED but kept its name still resolves correctly', () => {
    // The platform inserts a new step at 3, pushing Interpretation down to 4. The
    // advisor's stored answer still reads "Step 3: Interpretation". Under the old
    // rule that resolved to the NEW step 3 — a different step, silently, with a
    // strategic ceiling instead of an analytical one.
    const reordered = {
      defaultCeiling: 'foundational',
      steps: [
        { step: 1, name: 'Compilation & Verification', complexityCeiling: 'foundational' },
        { step: 2, name: 'Assimilation', complexityCeiling: 'foundational' },
        { step: 3, name: 'Validation', complexityCeiling: 'strategic' }, // newly inserted
        { step: 4, name: 'Interpretation', complexityCeiling: 'analytical' } // was step 3
      ]
    }
    const stored = 'Step 3: Interpretation — The conversation has broadened beyond the figures.'

    const resolved = resolveStaircaseStep(stored, reordered)

    expect(resolved.name).toBe('Interpretation')
    expect(resolved.step).toBe(4)
    expect(staircaseToCeiling(resolved.step, reordered)).toBe('analytical')
    // And the proof it was ever broken: the position alone points somewhere else.
    expect(staircaseToCeiling(3, reordered)).toBe('strategic')
  })

  test('falls back to the position when a firm has RENAMED the step', () => {
    // The common event — renaming is the whole point of the Firm Manager tab. The
    // stored name matches nothing, so the number is used, exactly as before. This
    // is why the rule is name-first rather than name-only: refusing here would
    // degrade every returning client of every firm that edited a single word.
    const renamed = deepMerge(BASE_STAIRCASE, {
      steps: [{ step: 3, name: 'Making sense of it', complexityCeiling: 'analytical' }]
    })

    const resolved = resolveStaircaseStep('Step 3: Interpretation — older wording', renamed)

    expect(resolved.name).toBe('Making sense of it')
    expect(resolved.step).toBe(3)
  })

  test('reads a sixth step — the old /Step ([1-5])/ could not', () => {
    // A staircase grown by one silently lost its top rung to the default ceiling.
    const grown = {
      defaultCeiling: 'foundational',
      steps: [{ step: 6, name: 'Stewardship', complexityCeiling: 'strategic' }]
    }

    const resolved = resolveStaircaseStep('Step 6: Stewardship — the new top rung', grown)

    expect(resolved.step).toBe(6)
    expect(staircaseToCeiling(resolved.step, grown)).toBe('strategic')
  })

  test('an ambiguous name is not trusted — two steps sharing one proves nothing', () => {
    const duplicated = {
      defaultCeiling: 'foundational',
      steps: [
        { step: 1, name: 'Review', complexityCeiling: 'foundational' },
        { step: 2, name: 'Review', complexityCeiling: 'strategic' }
      ]
    }

    expect(resolveStaircaseStep('Step 2: Review — which one?', duplicated).step).toBe(2)
  })

  test('a description containing a dash does not swallow the name', () => {
    const resolved = resolveStaircaseStep(
      'Step 5: Observation — reviewing hard-fact and soft-fact data — and asking why'
    )

    expect(resolved.name).toBe('Observation')
  })

  test('free text the advisor typed instead of using the selector resolves to nothing', () => {
    // Unchanged behaviour: the caller falls back to the config's defaultCeiling.
    expect(resolveStaircaseStep('we are somewhere near the middle I think')).toBeNull()
    expect(resolveStaircaseStep('')).toBeNull()
    expect(resolveStaircaseStep(null)).toBeNull()
    expect(resolveStaircaseStep('pending')).toBeNull()
  })

  test('a position that exists in no staircase resolves to nothing, never a guess', () => {
    expect(resolveStaircaseStep('Step 9: Something else — nope')).toBeNull()
  })

  test('a staircase with no steps is survived rather than thrown on', () => {
    expect(resolveStaircaseStep('Step 1: Anything', { steps: [] })).toBeNull()
    expect(resolveStaircaseStep('Step 1: Anything', {})).toBeNull()
  })
})

describe('buildCaseState — staircase override flows into complexityCeiling', () => {
  test('no override → ceiling matches the base (behaviour-preserving)', () => {
    const cs = buildCaseState(signalsAtStep(5), {})
    expect(cs.complexityCeiling).toBe('strategic')
  })

  test('blended override → ceiling reflects the firm edit', () => {
    const override = {
      defaultCeiling: 'foundational',
      steps: [
        { step: 1, name: 'Compilation', complexityCeiling: 'foundational' },
        { step: 5, name: 'Observation', complexityCeiling: 'foundational' }
      ]
    }
    const blended = deepMerge(BASE_STAIRCASE, override)
    const cs = buildCaseState(signalsAtStep(5), {}, blended)
    expect(cs.complexityCeiling).toBe('foundational')
  })
})

'use strict'

// Proves the Advisory Staircase firm override actually reaches the decision
// output. The request handler blends a firm override over the platform base with
// firmOverlay.deepMerge and hands the result to buildCaseState; these tests
// reproduce that blend with the real deepMerge so the path under test is the
// real one — not a stand-in.

const { buildCaseState, staircaseToCeiling } = require('../../server/utils/caseState')
const { deepMerge } = require('../../server/utils/firmOverlay')
const { SIGNAL_TYPES } = require('../../server/utils/signals')
const BASE_STAIRCASE = require('../../data/advisory-staircase.json')

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

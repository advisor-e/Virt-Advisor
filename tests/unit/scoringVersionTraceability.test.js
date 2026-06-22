'use strict'

// Dead-code cleanup + SCORING_VERSION traceability (2026-06-23).
//
// SCORING_VERSION was dead — its documented purpose ("so scoring logs are
// traceable") was never wired up. It is now stamped into the [va-session] log and
// the persisted decision trace, so every saved case is traceable to the engine
// version that produced it (auditability goal, ACTIONS.md). Both consumers
// reference the constant DIRECTLY (`scoringVersion: SCORING_VERSION`), so the
// meaningful guard is the constant's integrity — if it is blanked or removed, the
// fields silently break. (The inline trace builder in the SSE handler has no test
// seam; an end-to-end assertion was judged not worth refactoring that sensitive
// area for one metadata field.)
//
// The two genuinely-dead registry helpers (getSummaryByPage, getTemplateByPage)
// were removed; these tests also lock that in.

const { SCORING_VERSION } = require('../../server/utils/templateResolver')
const templateRegistry = require('../../server/utils/templateRegistry')

describe('SCORING_VERSION — exported and well-formed', () => {
  test('is a non-empty dotted version string', () => {
    expect(typeof SCORING_VERSION).toBe('string')
    expect(SCORING_VERSION.length).toBeGreaterThan(0)
    expect(SCORING_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('templateRegistry — dead helpers removed, live API intact', () => {
  test('getSummaryByPage and getTemplateByPage are no longer exported', () => {
    expect(templateRegistry.getSummaryByPage).toBeUndefined()
    expect(templateRegistry.getTemplateByPage).toBeUndefined()
  })

  test('the surviving registry API is still exported', () => {
    expect(typeof templateRegistry.getRegistry).toBe('function')
    expect(typeof templateRegistry.getEntry).toBe('function')
    expect(typeof templateRegistry.getDoTheJobTemplatesWithSummaries).toBe('function')
  })
})

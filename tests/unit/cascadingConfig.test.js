'use strict'

/**
 * Phase 4 of design/MENTOR-SAVE-SCOPE-PLAN.md — a firm inherits what the mentor
 * authored.
 *
 * Mike's ruling, 2026-08-09: a firm holds ONLY the fields it changed, laid over the
 * mentor's, merged at read time. The mentor's later edits keep reaching a firm for
 * everything that firm has not touched; a firm's own change wins and sticks. The
 * rejected alternative was a full copy, which goes stale silently — the staircase
 * already showed what that costs (a firm override replaced the whole steps array,
 * so that firm would never have seen a step the platform later added).
 *
 * The test that matters most is "a firm that has stored nothing inherits". Before
 * Phase 4 that returned null, and null is indistinguishable from "the mentor has
 * authored nothing" — the failure mode this whole plan exists to remove.
 */

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))

const db = require('../../server/utils/db')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { CONFIG_KEYS } = require('../../server/utils/firmContent')
const { loadFirmConfig, CASCADING_CONFIG_KEYS } = require('../../server/utils/firmOverlay')

const CASCADING = 'domain-support'
const NOT_CASCADING = 'advisory-distinctions'

/** One stored row, as MySQL hands it back. */
const row = value => [[{ config_json: JSON.stringify(value) }]]
const noRow = () => [[]]

beforeEach(() => { db.execute.mockReset() })

// ── The fold ──────────────────────────────────────────────────────────────────

describe('a cascading key folds mentor then firm', () => {
  test('a firm that has stored NOTHING inherits the mentor content', async () => {
    // The heart of it. Before Phase 4 this answered null, which reads as "the
    // mentor has authored nothing" — indistinguishable from the truth.
    db.execute
      .mockResolvedValueOnce(noRow()) // the firm
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor' } })) // the mentor

    await expect(loadFirmConfig('acme-ltd', CASCADING))
      .resolves.toEqual({ tax: { summary: 'mentor' } })
  })

  test('a field the firm never touched still comes from the mentor', async () => {
    db.execute
      .mockResolvedValueOnce(row({ tax: { summary: 'theirs' } }))
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor' }, payroll: { summary: 'mentor' } }))

    await expect(loadFirmConfig('acme-ltd', CASCADING)).resolves.toEqual({
      tax: { summary: 'theirs' }, // firm wins where it spoke
      payroll: { summary: 'mentor' } // and inherits where it did not
    })
  })

  test('the firm wins on a direct conflict, and its change sticks', async () => {
    db.execute
      .mockResolvedValueOnce(row({ tax: { summary: 'theirs', tone: 'formal' } }))
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor', tone: 'plain' } }))

    await expect(loadFirmConfig('acme-ltd', CASCADING))
      .resolves.toEqual({ tax: { summary: 'theirs', tone: 'formal' } })
  })

  test('nothing anywhere is still null, not an empty object', async () => {
    db.execute.mockResolvedValueOnce(noRow()).mockResolvedValueOnce(noRow())
    await expect(loadFirmConfig('acme-ltd', CASCADING)).resolves.toBeNull()
  })

  test('the mentor holding nothing leaves the firm exactly as it was', async () => {
    db.execute
      .mockResolvedValueOnce(row({ tax: { summary: 'theirs' } }))
      .mockResolvedValueOnce(noRow())

    await expect(loadFirmConfig('acme-ltd', CASCADING))
      .resolves.toEqual({ tax: { summary: 'theirs' } })
  })
})

// ── What must NOT fold ────────────────────────────────────────────────────────

describe('the fold is limited, deliberately', () => {
  test('a non-cascading key reads one scope only — one query, no merge', async () => {
    db.execute.mockResolvedValueOnce(row([{ id: 'fd-1' }]))

    await expect(loadFirmConfig('acme-ltd', NOT_CASCADING))
      .resolves.toEqual([{ id: 'fd-1' }])
    expect(db.execute).toHaveBeenCalledTimes(1)
  })

  test('reading AT the platform scope never folds onto itself', async () => {
    db.execute.mockResolvedValueOnce(row({ tax: { summary: 'mentor' } }))

    await expect(loadFirmConfig(PLATFORM_SCOPE, CASCADING))
      .resolves.toEqual({ tax: { summary: 'mentor' } })
    expect(db.execute).toHaveBeenCalledTimes(1)
  })

  test('the mentor layer is read from the reserved scope, not from any firm', async () => {
    db.execute.mockResolvedValueOnce(noRow()).mockResolvedValueOnce(noRow())
    await loadFirmConfig('acme-ltd', CASCADING)

    expect(db.execute.mock.calls[0][1]).toEqual(['acme-ltd', CASCADING])
    expect(db.execute.mock.calls[1][1]).toEqual([PLATFORM_SCOPE, CASCADING])
  })
})

// ── The list itself ───────────────────────────────────────────────────────────

describe('the cascading list stays honest', () => {
  test('every key in it is one the app actually stores', () => {
    // A typo here would silently switch a content type's inheritance off.
    expect(CASCADING_CONFIG_KEYS.has(CONFIG_KEYS.domainSupport)).toBe(true)
    expect(CASCADING_CONFIG_KEYS.has(CONFIG_KEYS.logicTrees)).toBe(true)
    expect(CASCADING_CONFIG_KEYS.has('domain-support-sections')).toBe(true)
    expect(CASCADING_CONFIG_KEYS.has('logic-tree-sections')).toBe(true)
  })

  test('array-shaped keys are EXCLUDED — deepMerge cannot express a delta over an array', () => {
    // Arrays replace wholesale (the documented overlay rule). A firm holding a
    // one-item array would blank the mentor's whole set for themselves. These
    // inherit by a different mechanism, or not yet at all.
    for (const key of ['templates', 'coaching-reference', 'advisory-distinctions', 'logic-lab-accepted']) {
      expect(CASCADING_CONFIG_KEYS.has(key)).toBe(false)
    }
  })

  test('the row-model keys are EXCLUDED — they already resolve inheritance themselves', () => {
    // Staircase, Quizzes and Distinctions carry declines/overrides/own-rows and
    // resolve them against a base. A fold underneath would inherit twice.
    for (const key of [
      'staircase-declines', 'staircase-overrides', 'staircase-own', 'advisory-staircase',
      'quiz-declines', 'quiz-overrides', 'quiz-own', 'quiz-banks',
      'distinction-declines', 'distinction-overrides'
    ]) {
      expect(CASCADING_CONFIG_KEYS.has(key)).toBe(false)
    }
  })
})

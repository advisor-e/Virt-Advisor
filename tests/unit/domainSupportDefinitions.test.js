'use strict'

// The five drivers of human output used to be written down TWICE — transcribed from
// the master app's own template in data/productive-habits.json (the Learning
// Psychology page), and paraphrased again inside the staff diagnosis row. Both
// reached the AI, so correcting one and not the other would have given the model two
// different definitions of the same five things, silently. Mike ruled 2026-08-25 that
// Learning Psychology is the source; item 4.37.
//
// ⚠ These tests DO pin wording, deliberately. CLAUDE.md's testing rule allows exactly
// that where the master app's own transcribed content must not drift — pinned in one
// place, next to the data it protects. Nothing here asserts a label or a screen.

const { formatDefinitionsFrom, formatDomainSupportForPrompt } = require('../../server/utils/domainSupport')

const SOURCE = require('../../data/productive-habits.json').five_drivers_of_human_output.drivers
const STAFF = require('../../data/staff-domain-support.json')

describe('a definitions block held once, and read from there', () => {
  test('resolves the five drivers out of the guide the material names', () => {
    const lines = formatDefinitionsFrom('productive_habits.five_drivers_of_human_output')
    // One heading line plus one line per driver.
    expect(lines).toHaveLength(SOURCE.length + 1)
    SOURCE.forEach((d, i) => {
      expect(lines[i + 1]).toBe(`- **${d.name}** — ${d.definition}`)
    })
  })

  test('a material that names no source gets no block, and nothing throws', () => {
    expect(formatDefinitionsFrom(undefined)).toEqual([])
    expect(formatDefinitionsFrom('')).toEqual([])
    expect(formatDefinitionsFrom('no-dot-here')).toEqual([])
    expect(formatDefinitionsFrom('unknown_guide.some_key')).toEqual([])
    expect(formatDefinitionsFrom('productive_habits.no_such_key')).toEqual([])
  })
})

describe('the staff diagnosis row now carries the source, not a second copy', () => {
  const prompt = formatDomainSupportForPrompt('staff', null)

  // 🔴 THE POINT OF THE WHOLE CHANGE. Every definition the AI is given must be the
  // one on the Learning Psychology page, character for character. If either file is
  // edited on its own, this fails — which is the drift that used to go unnoticed.
  test('every definition the AI receives is the source definition, verbatim', () => {
    SOURCE.forEach((d) => {
      expect(prompt).toContain(`- **${d.name}** — ${d.definition}`)
    })
  })

  test('the row declares where its definitions come from', () => {
    expect(STAFF.materials[0].definitions_from).toBe('productive_habits.five_drivers_of_human_output')
  })

  // The paraphrase is the thing that could disagree with the source. Its return would
  // recreate the exact fault this item closed, so it is guarded rather than trusted.
  test('the old paraphrased definitions are gone and have not come back', () => {
    const steps = STAFF.materials[0].steps.join(' ')
    expect(steps).not.toContain('the information and past experience needed to comprehend')
    expect(steps).not.toContain('practical application built through practised action')
    expect(steps).not.toContain('the tools and prioritisation to execute')
  })
})

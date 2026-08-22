'use strict'

/**
 * @file Which promoted coaching entries reach the prompt — coaching-reference
 * review, Phase 2 (2026-08-03).
 *
 * WHAT WAS WRONG. Every entry a firm ever promoted went into every eligible
 * prompt, for ever. Measured before the fix: 5 promoted cases ≈ 1,900 tokens,
 * 20 ≈ 7,400, 50 ≈ 18,400 — on EVERY question. One promotion a week reaches 50
 * within a year, and the newest lesson competes with forty-nine older ones.
 *
 * THE FIX (cap of 8 ruled by Mike, 2026-08-03). This session's topic only —
 * untagged entries always pass — newest first, eight at most, and the cap is
 * logged when it bites.
 *
 * ⚠ THE PLATFORM BASE THIS FILE ONCE ALSO GUARDED IS GONE (item 4.24, 2026-08-20).
 * It was exempt from the cap below on the grounds that it was not the growth problem
 * and was the menu the AI picked a template FROM. Both were true; what could not be
 * shown was that it changed the advice at all. The cap tested here always governed the
 * promoted entries only, and is unaffected by its removal.
 */

const {
  selectFirmCoaching,
  formatFirmCoachingForPrompt,
  MAX_FIRM_COACHING_ENTRIES
} = require('../../server/utils/coaching')
const { OPEN, CLOSE } = require('../../server/utils/promptSafety')

/** Entries as loadFirmCoaching returns them: append order, oldest first. */
function entries (specs) {
  return specs.map((s, i) => ({
    id: i + 1,
    template: s.template || `Entry ${i + 1}`,
    domain: 'domain' in s ? s.domain : null,
    whatToLookFor: 'what to look for',
    scenarios: ['a scenario'],
    whereMayLead: 'where it may lead'
  }))
}

let warn
beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => { warn.mockRestore() })

describe('selectFirmCoaching — the topic filter', () => {
  test('keeps entries for this topic and drops the ones for another', () => {
    const out = selectFirmCoaching(entries([
      { template: 'Profit one', domain: 'profit' },
      { template: 'Staff one', domain: 'staff' }
    ]), 'profit')

    expect(out.selected.map(e => e.template)).toEqual(['Profit one'])
  })

  test('an entry with no topic recorded ALWAYS passes', () => {
    // A missing tag is not evidence of irrelevance — entries promoted from a case
    // that never recorded a domain have none, and would otherwise vanish for good.
    const out = selectFirmCoaching(entries([
      { template: 'Untagged', domain: null },
      { template: 'Staff one', domain: 'staff' }
    ]), 'profit')

    expect(out.selected.map(e => e.template)).toEqual(['Untagged'])
  })

  test('when no topic is known, nothing is filtered out', () => {
    // discover/plan/learn never detect a domain. Filtering on a guess there would
    // silently drop every tagged entry.
    const out = selectFirmCoaching(entries([
      { template: 'Profit one', domain: 'profit' },
      { template: 'Staff one', domain: 'staff' },
      { template: 'Untagged', domain: null }
    ]), null)

    expect(out.selected).toHaveLength(3)
  })
})

describe('selectFirmCoaching — order and cap', () => {
  test('newest first — the most recent promotion leads', () => {
    const out = selectFirmCoaching(entries([
      { template: 'oldest' }, { template: 'middle' }, { template: 'newest' }
    ]), null)

    expect(out.selected.map(e => e.template)).toEqual(['newest', 'middle', 'oldest'])
  })

  test('never more than eight, and it is the eight newest that survive', () => {
    const twelve = entries(Array.from({ length: 12 }, (_, i) => ({ template: `e${i + 1}` })))

    const out = selectFirmCoaching(twelve, null)

    expect(MAX_FIRM_COACHING_ENTRIES).toBe(8)
    expect(out.selected).toHaveLength(8)
    expect(out.selected.map(e => e.template)).toEqual(['e12', 'e11', 'e10', 'e9', 'e8', 'e7', 'e6', 'e5'])
  })

  test('the cap counts only what the topic filter left, not the whole pile', () => {
    const out = selectFirmCoaching(entries([
      ...Array.from({ length: 10 }, () => ({ domain: 'staff' })),
      ...Array.from({ length: 3 }, () => ({ domain: 'profit' }))
    ]), 'profit')

    expect(out.considered).toBe(13)
    expect(out.onTopic).toBe(3)
    expect(out.selected).toHaveLength(3)
    expect(out.droppedByCap).toBe(0)
  })
})

describe('formatFirmCoachingForPrompt — the block that reaches the AI', () => {
  test('a trim is never silent: the count of what was left out is logged', () => {
    formatFirmCoachingForPrompt(entries(Array.from({ length: 12 }, () => ({ domain: 'profit' }))), 'profit')

    expect(warn).toHaveBeenCalledTimes(1)
    const line = warn.mock.calls[0].join(' ')
    expect(line).toContain('used 8 of 12')
    expect(line).toContain('4 left out')
    expect(line).toContain('profit')
  })

  test('nothing is logged when everything fits', () => {
    formatFirmCoachingForPrompt(entries([{ domain: 'profit' }, { domain: 'profit' }]), 'profit')

    expect(warn).not.toHaveBeenCalled()
  })

  test('a firm with entries, none of them for this topic, contributes no block', () => {
    expect(formatFirmCoachingForPrompt(entries([{ domain: 'staff' }]), 'profit')).toBeNull()
  })

  test('what survives is still fenced', () => {
    const text = formatFirmCoachingForPrompt(entries([{ template: 'Kept', domain: 'profit' }]), 'profit')

    expect(text).toContain(OPEN)
    expect(text).toContain(CLOSE)
    expect(text).toContain('Kept')
  })

  test('the old one-argument call still means "no topic known"', () => {
    // Both former call sites passed entries only; the second argument is optional
    // so an un-migrated caller filters nothing rather than dropping everything.
    const text = formatFirmCoachingForPrompt(entries([{ template: 'Tagged', domain: 'staff' }]))

    expect(text).toContain('Tagged')
  })
})

// 🔴 A "the platform base is deliberately left whole" block stood here until
// 2026-08-20. It pinned the fifteen curated rows at under 14,000 characters so that
// GROWING the block would be a decision rather than a drift. The block itself is now
// gone (item 4.24, Mike's Option D): it was measured against the logic trees that had
// superseded it, and its effect on which templates get recommended could not be
// distinguished from the engine's own run-to-run noise. The ~12,846 characters it cost
// every eligible prompt are no longer spent. Everything above is unchanged — the cap
// always governed the promoted entries alone.

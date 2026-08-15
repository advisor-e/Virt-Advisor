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
 * The platform base is deliberately untouched: it is not the growth problem, and
 * it is the menu the AI picks a template FROM. The last test pins its size so a
 * future addition is a decision rather than a drift.
 */

const {
  selectFirmCoaching,
  formatFirmCoachingForPrompt,
  formatCoachingForPrompt,
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

describe('the platform base is deliberately left whole', () => {
  test('it is neither filtered nor capped — every entry still reaches the prompt', () => {
    const base = require('../../data/coaching-reference.json')
    const text = formatCoachingForPrompt()

    base.forEach((entry) => { expect(text).toContain(entry.template) })
  })

  test('and its size is pinned, so growing it is a decision and not a drift', () => {
    // 12,846 characters across 15 entries, measured 2026-08-15 — up from 8,483 on
    // 2026-08-03. THE JUMP WAS A DECISION, which is what this guard exists to force:
    // `howItHelps` and `deliveryNotes` were authored, stored, made firm-editable, and
    // rendered into no prompt at all, so a firm editing them changed nothing. Mike
    // ruled on 2026-08-15 that they must reach the AI. The block is now half as long
    // again, and that cost was accepted knowingly.
    //
    // The platform base is exempt from the per-firm cap because only a developer adds
    // to it and it is the menu the AI picks a template FROM. The ceiling below leaves
    // room for roughly one more entry (~850 characters), so ADDING one trips this on
    // purpose. If it fails because entries were added, that exemption is what needs
    // re-arguing — not this number.
    const base = require('../../data/coaching-reference.json')
    expect(base.length).toBeLessThanOrEqual(20)
    expect(formatCoachingForPrompt().length).toBeLessThan(14000)
  })
})

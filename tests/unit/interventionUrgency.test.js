'use strict'

// Intervention Urgency (2026-06-23) — when the strategy step flags HIGH urgency,
// the Phase 3 recommendation leads with the critical move and flags the
// time-pressure (AI phrases it). Template COUNT is unchanged. Urgency is a
// passed-through, NON-overridable Stage 3 output.

const { resolveStrategy } = require('../../server/utils/strategyResolver')
const { urgencyDirective } = require('../../server/advisorEngine')

// Minimal caseState the strategy resolver needs (only urgency varies here).
function caseStateWith (urgency) {
  return {
    domain: 'profit',
    client: { requestedHelp: true, urgency },
    advisor: { confidence: 'medium', stretchWillingness: false },
    complexityCeiling: 'analytical',
    constraints: { templateBudget: 2 }
  }
}

describe('urgencyDirective — fires only on high urgency', () => {
  test('high urgency returns a non-empty, time-critical directive', () => {
    const out = urgencyDirective('high')
    expect(out).toContain('TIME-CRITICAL')
    expect(out).toMatch(/LEAD/)
  })

  test('high urgency keeps the template count the same (no count change)', () => {
    expect(urgencyDirective('high')).toMatch(/SAME number of templates/i)
  })

  test('high urgency carries the anti-fabrication guardrail', () => {
    expect(urgencyDirective('high')).toMatch(/do NOT invent|manufacture/i)
  })

  // Case-sensitive: only the exact 'high' fires; everything else is inert.
  test.each(['medium', 'low', null, undefined, '', 'HIGH', 'urgent'])(
    'non-high urgency (%s) returns an empty string', (u) => {
      expect(urgencyDirective(u)).toBe('')
    })
})

describe('resolveStrategy — urgency is a passed-through, non-overridable output', () => {
  test.each(['high', 'medium', 'low'])('passes client urgency "%s" straight through', (u) => {
    expect(resolveStrategy(caseStateWith(u)).urgency).toBe(u)
  })

  test('defaults to "low" when client urgency is absent', () => {
    const cs = caseStateWith(undefined)
    delete cs.client.urgency
    expect(resolveStrategy(cs).urgency).toBe('low')
  })

  test('firm overrides CANNOT lower a genuine crisis (urgency not overridable)', () => {
    const decision = resolveStrategy(caseStateWith('high'), { urgency: 'low' })
    expect(decision.urgency).toBe('high')
  })
})

// ── Crisis/distress TONE directive (2026-06-25) ──────────────────────────────
// When the advisor describes a business that may FAIL, the Phase 3 copy must
// adopt a sober register (no growth/aspirational language). This is WORDING only
// — it never changes which templates appear or their order. Added after a live
// café-liquidation session where the copy used growth language.
const { detectCrisis, CRISIS_PHRASES } = require('../../server/advisorEngine')

describe('detectCrisis — recognises business-failure language', () => {
  test.each(CRISIS_PHRASES)('detects crisis phrase "%s"', (phrase) => {
    expect(detectCrisis('the client is ' + phrase + ' next month')).toBe(true)
  })

  test('catches the phrase wherever it appears (case-insensitive)', () => {
    expect(detectCrisis('They might be FACING LIQUIDATION soon')).toBe(true)
  })

  test('ordinary profitability talk is not a crisis', () => {
    expect(detectCrisis('margins are tight and we want to grow sales')).toBe(false)
  })

  test('empty / non-string input is safe', () => {
    expect(detectCrisis('')).toBe(false)
    expect(detectCrisis(null)).toBe(false)
    expect(detectCrisis(undefined)).toBe(false)
  })
})

describe('urgencyDirective — crisis tone clause', () => {
  test('crisis adds a distress-tone block that bans growth language', () => {
    const out = urgencyDirective('low', true)
    expect(out).toContain('DISTRESS')
    expect(out).toMatch(/do NOT use growth/i)
    expect(out).toMatch(/WORDING only/i) // never changes selection/order
  })

  test('crisis tone does NOT fire the time-critical block on its own', () => {
    expect(urgencyDirective('low', true)).not.toContain('TIME-CRITICAL')
  })

  test('high urgency AND crisis emits BOTH blocks', () => {
    const out = urgencyDirective('high', true)
    expect(out).toContain('TIME-CRITICAL')
    expect(out).toContain('DISTRESS')
  })

  test('no urgency, no crisis → empty (ordinary session unchanged)', () => {
    expect(urgencyDirective('low', false)).toBe('')
    expect(urgencyDirective('high', false)).toContain('TIME-CRITICAL')
    expect(urgencyDirective('high', false)).not.toContain('DISTRESS')
  })
})

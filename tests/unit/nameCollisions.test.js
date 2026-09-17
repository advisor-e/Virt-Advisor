'use strict'

/**
 * THE MODEL/TEMPLATE NAME COLLISIONS — computed from the shipped data, never typed.
 *
 * 🔴 WHY THIS FILE EXISTS (Mike's ruling, 2026-09-17). A session spent a morning
 * theorising about why the AI "could not find" calculators, when the answer was sitting
 * in two data files it had not opened: model names and template titles collide, and three
 * of them collide by a single character.
 *
 *     Lease vs Buy       /lease-vs-buy        ← template "Lease vs. Buy"      (full stop)
 *     High-Level Budget  /high-level-budget   ← template "High Level Budget"  (hyphen)
 *     Dashboard Reports  /dashboard-reports   ← template "Dashboard Report"   (plural)
 *
 * `isKnownTemplate` compares exactly, so all three read as "not a template" and
 * `checkTemplateHeadings` flagged a GENUINE template recommendation as a calculator —
 * telling the AI the advisor "would find nothing in Advisor-e" when the document is right
 * there. Item 7.7's fault, caused in reverse by item 7.7's own guard.
 *
 * WHAT THESE TESTS EARN THEIR PLACE FOR (the 2026-08-24 rule). UAT cannot see any of it:
 * every answer reads perfectly, and the damage is a retry the tester never sees and a
 * document they are not told about. This is a fact about two data files, not about
 * wording — and the moment a new model or a re-exported library adds a seventh collision,
 * this fails rather than letting it be discovered in conversation months later.
 *
 * ⚠ NOTHING HERE IS HARDCODED except the names of the collisions we have already reasoned
 * about. A new one is not a test failure to be silenced by adding it to the list — it is a
 * decision about whether the app can still tell the two apart.
 */

const { loadReportModels } = require('../../server/utils/reportModels')
const { isKnownTemplate, nearestTemplateTitle } = require('../../server/utils/tierLookup')
const { checkTemplateHeadings } = require('../../server/utils/templateHeadingCheck')
const templates = require('../../data/templates.json')

const MODELS = (loadReportModels().models || []).filter(m => m && m.name && m.route)
const TITLES = Object.values(templates).map(t => t && t.title).filter(Boolean)

/** The same shape rule `tierLookup` indexes on: punctuation and a trailing plural ignored. */
const shape = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/s$/, '')

/** Every model name that is, or nearly is, a real template title. */
function collisions () {
  const byShape = new Map()
  TITLES.forEach((t) => { if (!byShape.has(shape(t))) { byShape.set(shape(t), t) } })
  return MODELS
    .map(m => ({ model: m.name, route: m.route, template: byShape.get(shape(m.name)) || null }))
    .filter(c => c.template)
}

/** The answer shape `discover.txt` asks for. */
const answer = name => ['**Best match**', '**' + name + '** — a reason for it', '',
  '**Is that what you had in mind, or would you like me to look for something else?**'].join('\n')

describe('model and template names that collide', () => {
  // Locked because each was reasoned about individually and the count in
  // templateHeadingCheck's header was wrong for weeks while everyone quoted it.
  const KNOWN = [
    'Working Capital Cycle', 'Quick Position', 'Sales Dashboard',
    'Lease vs Buy', 'High-Level Budget', 'Dashboard Reports'
  ]

  it('is exactly the six we know about — a seventh is a decision, not a test to update', () => {
    expect(collisions().map(c => c.model).sort()).toEqual([...KNOWN].sort())
  })

  it('resolves every near-miss to the real library title', () => {
    collisions().forEach((c) => {
      expect(nearestTemplateTitle(c.model)).toBe(c.template)
    })
  })

  it('never flags a colliding name as a calculator — the fault found 2026-09-17', () => {
    // The whole point. Each of these is a real document in the library; recommending one
    // must not trigger a correction telling the AI it does not exist.
    collisions().forEach((c) => {
      expect({ name: c.model, ok: checkTemplateHeadings(answer(c.model)).ok })
        .toEqual({ name: c.model, ok: true })
    })
  })

  it('still flags a model that is NOT any template — 7.7 must keep working', () => {
    const pure = MODELS.filter(m => !nearestTemplateTitle(m.name))
    expect(pure.length).toBeGreaterThan(0)
    pure.forEach((m) => {
      expect({ name: m.name, ok: checkTemplateHeadings(answer(m.name)).ok })
        .toEqual({ name: m.name, ok: false })
    })
  })

  it('does not rescue an invented name — only a real template is protected', () => {
    // The guard rail on the guard rail: widening this to fuzzy matching would let the AI
    // invent a name close to a real one and have it wave through.
    ;['Inventory Management Review', 'Lease vs Buy Decision', 'Nonexistent Thing'].forEach((n) => {
      expect({ name: n, nearest: nearestTemplateTitle(n) }).toEqual({ name: n, nearest: null })
      expect(isKnownTemplate(n)).toBe(false)
    })
  })
})

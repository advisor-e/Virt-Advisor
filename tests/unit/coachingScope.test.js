'use strict'

// Item 4.18 — the AI invents advice when it is routed to the wrong method.
// Approved artefact: design/LEARN-SCOPE-HONESTY.md.
//
// A Dashboard Discussions question was routed to the Ratio Analysis guide and the
// model wrote its own `tactical options` and `discussion questions` rather than
// saying it held none. The scope block is the honest exit it never had.
//
// 🔴 WHAT THESE TESTS CAN AND CANNOT PROVE. They prove the block REACHES the model,
// names the guide that is loaded, and names the ones that are not. NOTHING here can
// prove the model OBEYS it — every automated test in this area passes on an answer
// the model made up, which is the item's own warning. That half is verified by
// driving the running app; see design/LEARN-SCOPE-HONESTY.md §9.

const {
  formatCoachingScopeForPrompt,
  buildLearnReferenceText,
  loadLogicTrees
} = require('../../server/utils/logicTrees')

const treeById = id => loadLogicTrees().find(t => t.id === id)

describe('coaching reference scope block', () => {
  test('names the loaded guide, and the neighbouring guide it does NOT hold', () => {
    const block = formatCoachingScopeForPrompt(['ratio_analysis'])

    // The exact pairing from the live incident: Ratio Analysis in hand,
    // Dashboard Discussions explicitly not.
    expect(block).toContain('  • Ratio Analysis')
    expect(block).toMatch(/NOT been given[\s\S]*Dashboard Discussions/)
  })

  test('every reachable coaching guide is accounted for — loaded or explicitly not', () => {
    // The failure this guards is silent omission: a guide added to methodGuides.GUIDES
    // that the block never mentions is a guide the model may invent freely, with
    // nothing on screen to show it happened. That is 4.16's mechanism, and it is why
    // the list is generated rather than hand-written.
    const { GUIDES } = require('../../server/utils/methodGuides')
    const learnIds = new Set(loadLogicTrees().filter(t => t.mode === 'learn').map(t => t.id))
    const reachable = GUIDES.filter(g => learnIds.has(g.id))

    expect(reachable.length).toBeGreaterThan(1)

    const block = formatCoachingScopeForPrompt(['ratio_analysis'])
    for (const guide of reachable) {
      expect(block).toContain(guide.label)
    }
  })

  test('does not claim the standing guides are missing — they may be in the prompt', () => {
    // Learning Psychology rides along with Facilitation 101 (buildLearnReferenceText),
    // and The 3 Engagement Types is injected by the client path. Listing either as
    // "not given" would be false on exactly the calls where it is present, which
    // would teach the model to distrust context it can see.
    const block = formatCoachingScopeForPrompt(['ratio_analysis'])
    expect(block).not.toContain('Learning Psychology')
    expect(block).not.toContain('The 3 Engagement Types')
  })

  test('returns null when no recognised coaching guide was loaded', () => {
    // A tree with no companion guide emits no block. Claiming a scope for a prompt
    // that holds no guide would be the same lie pointing the other way.
    expect(formatCoachingScopeForPrompt([])).toBeNull()
    expect(formatCoachingScopeForPrompt(['not_a_guide'])).toBeNull()
    expect(formatCoachingScopeForPrompt(null)).toBeNull()
  })

  test('pins the refusal wording Mike approved on 2026-08-25', () => {
    // 🔴 THIS STRING IS LOAD-BEARING AND IS PINNED DELIBERATELY, under the one
    // deliberate-pin exception in CLAUDE.md's testing rules. It is
    // design/LEARN-SCOPE-HONESTY.md §4 verbatim — the sentence an advisor reads when
    // the product genuinely has nothing. It was approved as a specific form of words:
    // it owns the gap rather than blaming the advisor, it names the guide that DOES
    // hold the answer (a refusal without a route is a dead end), and it OFFERS to
    // switch rather than switching. Changing any of that is Mike's call, not a tidy-up.
    const block = formatCoachingScopeForPrompt(['ratio_analysis'])
    expect(block).toContain(
      '"I don\'t have the Advisor-e coaching content for that in this guide — that sits'
    )
    expect(block).toContain('in the <NAME> guide. Would you like me to switch to it?"')
  })

  test('the instruction that closes the invention path is present', () => {
    // The named fields are the ones actually fabricated in the live incident, so they
    // are the ones the model is told by name never to author.
    const block = formatCoachingScopeForPrompt(['dashboard_discussions'])
    expect(block).toContain('tactical options')
    expect(block).toContain('discussion questions')
    expect(block).toMatch(/Having no answer is a correct answer/)
  })
})

describe('the scope block reaches the prompt', () => {
  test('buildLearnReferenceText leads with the scope block when a guide is loaded', () => {
    const text = buildLearnReferenceText(treeById('ratio_analysis'))
    expect(text.startsWith('## Coaching Reference Scope')).toBe(true)
    // and the guide itself still follows, unchanged
    expect(text).toContain('## Ratio Analysis — Detailed Coaching Reference')
  })

  test('a learn tree with no companion guide gets no scope block', () => {
    // sales_process is a learn tree with no entry in methodGuides.GUIDES, so there is
    // no coaching guide to scope and the tree text must be served exactly as before.
    const text = buildLearnReferenceText(treeById('sales_process'))
    expect(text).not.toContain('## Coaching Reference Scope')
  })

  test('Facilitation 101 lists itself as held — Learning Psychology rides with it', () => {
    const text = buildLearnReferenceText(treeById('facilitation_101'))
    expect(text).toContain('  • Facilitation 101')
    // Both blocks are genuinely present, so neither may be described as absent.
    // Asserted against the SCOPE BLOCK alone, not the whole reference text: the
    // guide's own heading appears further down, and a pattern spanning the document
    // would match that instead and pass for the wrong reason.
    expect(text).toContain('## Learning Psychology — Detailed Coaching Reference')
    expect(formatCoachingScopeForPrompt(['facilitation_101'])).not.toContain('Learning Psychology')
  })
})

'use strict'

/**
 * The delivery-method decision block — server/utils/logicTrees.js
 *
 * WHY THIS EXISTS. The `pf_awareness` branch asks the engine to choose between
 * the Cautious Reveal and Trial Fit delivery methods, and gave it a question and
 * two labels to choose from. The reasoning behind that choice — what map shock
 * actually is, and the signs that tell one client from the other — was authored
 * all along in the two method reference files, and never loaded at that branch:
 * `buildLearnReferenceText` returns null for the Profitability tree, and a
 * profitability conversation routes to `profitability_feasibility`, so neither
 * guide attaches. Mike's own warning on the branch reached the AI nowhere at all,
 * because `formatNodeForPrompt` did not read `advisor_note`.
 *
 * Approved as design/PF-AWARENESS-DECISION-BLOCK.md, which lists every line
 * against the file and key it is read from.
 *
 * ⚠ THIS TEST RENDERS THE PROMPT AND READS IT. It does not ask whether a field
 * was saved. That is the method item 4.16 prescribes, and it is the only method
 * that has ever caught this defect — twice now, `recommendation` and the two
 * coaching fields, both found by rendering and neither by inspecting the store.
 *
 * ⚠ EVERY EXPECTED STRING IS READ FROM THE SOURCE FILE, never typed in here. A
 * test carrying its own copy of the sentence passes happily while the file it is
 * supposed to be guarding drifts away from the prompt — which is the very defect
 * being fixed, reproduced inside its own test.
 */

const {
  formatNodeForPrompt,
  formatDeliveryMethodChoiceForPrompt,
  loadLogicTrees
} = require('../../server/utils/logicTrees')

const trialFit = require('../../data/trial-fit-reference.json')
const cautiousReveal = require('../../data/cautious-reveal-reference.json')

const logicTrees = loadLogicTrees()

/** The tree and node the block belongs to, found the way the engine finds them. */
const profitability = logicTrees.find(t => t.id === 'profitability_feasibility')
const awarenessNode = (profitability.nodes || []).find(n => n.id === 'pf_awareness')

/** The node block exactly as the model receives it. */
const rendered = formatNodeForPrompt(awarenessNode, profitability.nodes)

describe('the awareness branch gets the reason, not just the choice', () => {
  it('is still the branch this was built for', () => {
    // If the tree is restructured this fails first and names why, rather than
    // every assertion below failing for an unexplained reason.
    expect(profitability).toBeTruthy()
    expect(awarenessNode).toBeTruthy()
    expect(awarenessNode.branches.map(b => b.next_node).sort())
      .toEqual(['pf_cr_outreach', 'pf_tf_qualify'])
  })

  it('explains what map shock is, in the words of the file that defines it', () => {
    expect(rendered).toContain(cautiousReveal.key_concepts.map_shock)
  })

  it('carries every sign of an AWARE client, and loses none of them', () => {
    // Each indicator individually — a count would pass while a line went missing.
    expect(trialFit.when_to_use.indicators.length).toBeGreaterThan(0)
    for (const indicator of trialFit.when_to_use.indicators) {
      expect(rendered).toContain(indicator)
    }
    expect(rendered).toContain(trialFit.when_to_use.caution)
  })

  it('carries every sign of an UNAWARE client, and loses none of them', () => {
    expect(rendered).toContain(cautiousReveal.when_to_use.client_profile)
    expect(cautiousReveal.when_to_use.typical_scenarios.length).toBeGreaterThan(0)
    for (const scenario of cautiousReveal.when_to_use.typical_scenarios) {
      expect(rendered).toContain(scenario)
    }
  })

  it('draws the contrast between the two methods', () => {
    expect(rendered).toContain(cautiousReveal.when_to_use.contrast_with_trial_fit)
  })

  it('ends with the branch author\'s ruling', () => {
    expect(rendered).toContain(`Advisor note: ${awarenessNode.advisor_note}`)
  })

  it('says both names, so the model can tell which sign points where', () => {
    expect(rendered).toContain('points to Trial Fit')
    expect(rendered).toContain('points to Cautious Reveal')
  })
})

describe('the block is the SHORT form, and stays on its own branch', () => {
  it('does not drag in the full guides', () => {
    // The stages and steps are what the advisor needs once the method is CHOSEN,
    // and they already arrive then. ~19,000 characters each; pulling them in
    // here would bloat every profitability conversation for no gain.
    for (const stage of (trialFit.stages || [])) {
      expect(rendered).not.toContain(stage.key_principle)
    }
    for (const step of (cautiousReveal.steps || [])) {
      expect(rendered).not.toContain(step.key_principle)
    }
  })

  it('stays under 2,200 characters', () => {
    // A ceiling with a real measurement behind it. The approved block is 2,044
    // characters including the ruling (design/PF-AWARENESS-DECISION-BLOCK.md,
    // 2026-08-16); this function builds the context WITHOUT it, which measures
    // 1,835 today. Adding a sign or two is fine; adding a section trips this and
    // gets re-argued rather than absorbed silently.
    expect(formatDeliveryMethodChoiceForPrompt().length).toBeLessThan(2200)
  })

  it('appears on NO other node in the entire corpus', () => {
    // The promise made when this was approved: no other prompt grows.
    const heading = 'Choosing the delivery method'
    const offenders = []
    for (const tree of logicTrees) {
      for (const node of (tree.nodes || [])) {
        if (node.id === 'pf_awareness') { continue }
        if (formatNodeForPrompt(node, tree.nodes).includes(heading)) {
          offenders.push(`${tree.id}/${node.id}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('GUARD — the one ungated field cannot quietly become two', () => {
  it('pf_awareness is still the only node carrying an advisor_note', () => {
    // `advisor_note` is emitted WITHOUT the availability gate, and it is the only
    // field that is. That is safe for this note because "Trial Fit" and "Cautious
    // Reveal" are delivery approaches, not documents an advisor could fail to
    // open — running it through the gate leaves "This determines the delivery
    // method." and deletes both instructions.
    //
    // It is NOT safe as a general licence. A second advisor_note, written later
    // by someone naming a real template that the catalogue cannot serve, would go
    // to the AI ungated and send an advisor after a page that does not open —
    // exactly the harm the gate exists to prevent. So a second one stops the
    // build and gets a decision, rather than inheriting this one's exemption.
    const carriers = []
    for (const tree of logicTrees) {
      for (const node of (tree.nodes || [])) {
        if (node.advisor_note) { carriers.push(`${tree.id}/${node.id}`) }
      }
    }
    expect(carriers).toEqual(['profitability_feasibility/pf_awareness'])
  })

  it('fences the note when the tree is firm-authored, like every other node field', () => {
    // The note is the one field emitted past the availability gate; it must not
    // also become the one field that escapes the untrusted-content fence. A firm
    // that can edit a tree can write anything into it.
    const node = { id: 'x', branch_name: 'B', type: 'assessment', condition: 'c', advisor_note: 'FIRM_TEXT' }
    const fenced = formatNodeForPrompt(node, [], true)
    expect(fenced).toContain('FIRM_TEXT')
    expect(fenced).not.toContain('Advisor note: FIRM_TEXT')
  })

  it('emits the note on an ordinary node without dragging the block along', () => {
    // The note travels with any branch that carries one; the reference block does
    // not. They are wired separately on purpose.
    const node = { id: 'x', branch_name: 'B', type: 'assessment', condition: 'c', advisor_note: 'PLAIN_NOTE' }
    const out = formatNodeForPrompt(node, [])
    expect(out).toContain('Advisor note: PLAIN_NOTE')
    expect(out).not.toContain('Choosing the delivery method')
  })
})

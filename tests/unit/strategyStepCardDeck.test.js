'use strict'

/**
 * Every card an advisor places must know which deck it came from. Item 15.1.
 *
 * 🔴 WHY THIS EXISTS, AND WHY IT IS NOT A WORDING TEST. The approved drawing
 * (`design/mockups/strategy-step-builder.html`) puts the deck under every card in
 * the step builder's left column, because with forty-odd concepts waiting it is the
 * only thing telling them apart. Both branches of `placeableCards` read a `deckName`
 * field that exists NOWHERE — not in `data/strategy-frameworks.json`, not on a
 * concept visit — so `card.deck` was always the empty string and the `v-if` guarding
 * the label never fired.
 *
 * The column rendered as identical white boxes and looked perfectly plausible. No
 * test failed, because nothing asserted the wiring; it was found by Mike opening the
 * screen. That is the failure this file guards: not how the label reads, but that
 * the card carries the value at all. An empty string and a correct string look the
 * same to every other test in the suite.
 *
 * ⚠ THE TWO CLOSING CARDS CARRY NO DECK, DELIBERATELY. "Strategic Objective and
 * Strategy" and "Operational Objectives and Tactics" are ours, not concepts off one
 * of Mike's decks, so a deck label on them would be a lie. Asserted here so a later
 * "every card needs a deck" tidy-up cannot invent one.
 */

const Page = require('../../pages/strategy-planner.vue').default

const DECKS = [
  {
    id: 'strategic-orientation-2',
    name: 'Strategic Orientation 2',
    concepts: [{ id: 'porters-5-forces' }, { id: 'blue-ocean-strategy' }]
  },
  {
    id: 'sales-marketing',
    name: 'Sales & Marketing Review',
    concepts: [{ id: 'product-fit' }]
  }
]

/**
 * A stand-in for the page instance, holding only what the two computeds read.
 *
 * The computeds are plain functions, so they are called against this rather than
 * mounting the page — which would need the three API calls stubbed to prove a
 * property that has nothing to do with them.
 *
 * @returns {object}
 */
function pageStub () {
  const stub = {
    decks: DECKS,
    entries: {},
    chosenFrameworks: [
      { id: 'pf', conceptId: 'porters-5-forces', name: "Porter's 5 Forces", fields: [] }
    ],
    conceptVisits: [
      {
        key: 'blue-ocean-strategy#1',
        conceptId: 'blue-ocean-strategy',
        name: 'Blue Ocean Strategy',
        part: 1,
        conceptSummary: '',
        capture: { supplied: true, fields: [] }
      },
      {
        key: 'product-fit#1',
        conceptId: 'product-fit',
        name: 'Product Fit',
        part: 1,
        conceptSummary: '',
        capture: { supplied: true, fields: [] }
      }
    ],
    closingFrameworks: [
      { id: 'objectives', name: 'Strategic Objective and Strategy', fields: [] }
    ],
    $t: () => '',
    visitInstruction: () => ''
  }
  stub.deckNameByConcept = Page.computed.deckNameByConcept.call(stub)
  return stub
}

/** @returns {object[]} the cards the step builder would offer */
function cards () {
  const stub = pageStub()
  return Page.computed.placeableCards.call(stub)
}

describe('a step-builder card knows its deck', () => {
  test('every concept card carries its deck NAME, not an id and not an empty string', () => {
    const concepts = cards().filter(c => c.conceptId)

    expect(concepts.length).toBe(3)
    concepts.forEach((card) => {
      expect(card.deck).toBeTruthy()
      // The id would satisfy a truthiness check and read as gibberish on screen.
      expect(card.deck).not.toMatch(/^[a-z0-9-]+$/)
    })
  })

  test('the deck is the one the concept actually sits in', () => {
    const byName = {}
    cards().forEach((c) => { byName[c.name] = c.deck })

    expect(byName["Porter's 5 Forces"]).toBe('Strategic Orientation 2')
    expect(byName['Blue Ocean Strategy']).toBe('Strategic Orientation 2')
    expect(byName['Product Fit']).toBe('Sales & Marketing Review')
  })

  // 🔴 DECISION D, RULED BY MIKE 2026-09-21: the two closing blocks leave Build session
  // entirely. This test used to assert the opposite — that a closing card WAS offered,
  // carrying an empty deck — which was correct under Decision 4 of 2026-09-20 and is the
  // behaviour the later ruling reversed.
  test('no closing card is offered on the step builder at all', () => {
    expect(cards().filter(c => !c.conceptId)).toEqual([])
  })

  // 🔴 AND THE RULING MUST NOT COST THE CLIENT THE TWO THINGS THE SESSION PRODUCES. They
  // moved off ONE SCREEN; they are still printed in the plan, from `closingCards`. Without
  // this the Strategic Objective and the Action Plan could vanish from a client's document
  // and every other assertion here would still pass.
  test('the closing blocks still reach the assembled plan, with no deck', () => {
    const stub = pageStub()
    const closing = Page.computed.closingCards.call(stub)

    expect(closing.length).toBe(1)
    expect(closing[0].name).toBe('Strategic Objective and Strategy')
    expect(closing[0].deck).toBe('')
    expect(closing[0].conceptId).toBe('')
    // It is printed as a capture page, so the document must not skip it as "nothing to
    // work" the way a drawing-only concept is skipped.
    expect(closing[0].hasTable).toBe(true)
  })
})

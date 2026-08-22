'use strict'

/**
 * Which of a promoted case observation's fields actually reach the model.
 *
 * 🔴 WHAT THIS FILE USED TO BE, AND WHY WHAT IS LEFT STILL EARNS ITS PLACE.
 * Until 2026-08-20 this file guarded the fifteen PLATFORM coaching rows. It existed
 * because `howItHelps` and `deliveryNotes` had been authored in
 * data/coaching-reference.json, made firm-editable, stored correctly by the cascade
 * routes — and rendered into no prompt anywhere. A firm could have rewritten the
 * longest field on its Coaching Reference tab and changed nothing about the advice its
 * advisers received. Every test was green throughout, because every test asked whether
 * the field was SAVED and nothing asked whether it was USED.
 *
 * That block, its cascade and its tab were removed by item 4.24 (Mike's Option D,
 * 2026-08-20) — see design/COACHING-REFERENCE-EVIDENCE.md.
 *
 * 🔴 THE GUARD BELOW SURVIVES BECAUSE THE RISK IT NAMES SURVIVES. `formatEntry` in
 * server/utils/coaching.js still renders a firm's PROMOTED CASE OBSERVATIONS — an
 * adviser's own free text about a real client — and it still carries `if (howItHelps)`
 * and `if (deliveryNotes)` guards that never fire for them. Two properties must hold
 * for those entries, and nothing else in the suite asserts both against the RENDERED
 * PROMPT, which is the only artefact that decides what the model is coached by:
 *
 *   1. Present-only: a field the entry does not carry produces no line at all, rather
 *      than a labelled line with nothing after it (which reads to a model as a field
 *      the author left blank rather than one that does not apply).
 *   2. FENCED: the block reaches the model as data to weigh, never instructions to
 *      follow. That fence is the whole reason platform guidance and adviser free text
 *      were ever kept apart, and it is now the only kind of row left.
 */

const { formatFirmCoachingForPrompt } = require('../../server/utils/coaching')
const { OPEN, CLOSE } = require('../../server/utils/promptSafety')

const PROMOTED = [{
  id: 1,
  template: 'Working Capital Cycle',
  domain: null,
  whatToLookFor: 'The client kept blaming the bank.',
  scenarios: ['a client said something hostile'],
  whereMayLead: 'nowhere good'
}]

describe('a promoted case observation renders present-only', () => {
  test('it carries neither howItHelps nor deliveryNotes, so neither label appears', () => {
    const text = formatFirmCoachingForPrompt(PROMOTED, null)

    expect(text).not.toContain('How it helps')
    expect(text).not.toContain('Delivery notes')
  })

  test('the fields it DOES carry all reach the prompt', () => {
    // The other half of the same rule: present-only must not become sometimes-only.
    const text = formatFirmCoachingForPrompt(PROMOTED, null)

    expect(text).toContain('Working Capital Cycle')
    expect(text).toContain('The client kept blaming the bank.')
    expect(text).toContain('a client said something hostile')
    expect(text).toContain('nowhere good')
  })
})

describe('a promoted case observation is fenced', () => {
  test('the block reaches the model wrapped, as untrusted data', () => {
    // Asserted against the fence markers themselves rather than by comparing with an
    // unfenced renderer — there is no longer an unfenced one, and that is the point.
    const text = formatFirmCoachingForPrompt(PROMOTED, null)

    expect(text).toContain(OPEN)
    expect(text).toContain(CLOSE)
  })

  test('the adviser text sits INSIDE the fence, not beside it', () => {
    // A fence that opens and closes around nothing would satisfy the test above while
    // leaving the free text loose in the prompt.
    const text = formatFirmCoachingForPrompt(PROMOTED, null)
    const inside = text.slice(text.indexOf(OPEN), text.lastIndexOf(CLOSE))

    expect(inside).toContain('The client kept blaming the bank.')
  })
})

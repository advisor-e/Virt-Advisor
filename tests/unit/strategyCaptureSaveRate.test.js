/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * HOW OFTEN A CAPTURE BOX SAVES — item 15.1, stage 7.
 *
 * 🔴 THIS IS THE DEFINITION OF A TEST THAT EARNS ITS PLACE (CLAUDE.md, Mike's ruling of
 * 2026-08-24): a person in UAT types a sentence into a box and sees EXACTLY the same
 * screen whether it saved once or two hundred times. Nothing is visible, nothing is
 * slower to the eye, and no assertion anywhere else in 13,000 of them was watching.
 *
 * WHAT WAS WRONG, FOUND 2026-09-22. Buefy's `Input` emits its `input` event from the
 * NATIVE input event unless `lazy` is set — `if (!this.lazy) { updateValue(value) }` in
 * node_modules/buefy/src/components/input/Input.vue. Neither capture box passed `lazy`,
 * and every emission reaches `onFieldChanged` in pages/strategy-planner.vue as its own
 * `PUT /api/strategy/sessions/:id/entries`. So a 200-character answer was ~200 HTTP
 * requests and ~200 database writes.
 *
 * AND IT COULD LOSE THE END OF A SENTENCE, which is the part that makes it a defect
 * rather than waste. Those saves are fired without awaiting one another, so on a slow
 * connection an early short value can land AFTER a later longer one, and what is stored
 * is the half-typed version. In a client's office on poor wifi that is a plausible
 * Tuesday, and the advisor would have no way of knowing.
 *
 * The JSDoc on `onFieldChanged` had read "Saved on blur, never per keystroke" since it
 * was written. The code did the opposite. These tests hold the two apart from now on.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyConceptCapture = require('~/components/strategy/StrategyConceptCapture.vue').default
const StrategyCaptureBox = require('~/components/strategy/StrategyCaptureBox.vue').default

const CAPTURE = {
  supplied: true,
  template: "Porter's 5 Forces",
  form: 'banded-grid',
  fields: [
    {
      key: 'customer-trends',
      row: 1,
      column: 1,
      columnLabel: 'Customer Trends',
      rowLabel: 'What is changing?',
      example: '',
      prefilled: ''
    }
  ]
}

/** A sentence of the length an advisor actually types into one of these boxes. */
const SENTENCE = 'Two of the three largest merchants now quote online, same day.'

describe('a capture box saves when the advisor leaves it, not as they type', () => {
  const mountCapture = () => mountWithBuefy(StrategyConceptCapture, {
    propsData: { name: "Porter's 5 Forces", capture: CAPTURE, entries: {} }
  })

  it('🔴 emits NOTHING while a whole sentence is typed', async () => {
    const w = mountCapture()
    const input = w.find('textarea')

    for (let i = 1; i <= SENTENCE.length; i++) {
      input.element.value = SENTENCE.slice(0, i)
      await input.trigger('input')
    }

    // Before `lazy`, this was one emission per character.
    expect(w.emitted('field-changed')).toBeFalsy()
  })

  it('🔴 emits ONCE, with the whole answer, when the box is left', async () => {
    const w = mountCapture()
    const input = w.find('textarea')

    for (let i = 1; i <= SENTENCE.length; i++) {
      input.element.value = SENTENCE.slice(0, i)
      await input.trigger('input')
    }
    input.element.value = SENTENCE
    await input.trigger('change')

    const emitted = w.emitted('field-changed') || []
    expect(emitted).toHaveLength(1)
    expect(emitted[0][0]).toEqual({ fieldKey: 'customer-trends', value: SENTENCE })
  })

  it('a save carries the WHOLE box, so one write cannot store half a sentence', async () => {
    const w = mountCapture()
    const input = w.find('textarea')

    input.element.value = SENTENCE
    await input.trigger('change')

    const emitted = w.emitted('field-changed') || []
    expect(emitted[0][0].value).toBe(SENTENCE)
    expect(emitted[0][0].value.endsWith('same day.')).toBe(true)
  })

  it('🔴 dictation is NOT affected — it never goes through the input at all', () => {
    const w = mountCapture()

    // emitVoice emits field-changed directly, so a dictated answer saves on the same
    // event as it always did. `lazy` must never be "fixed" by routing voice through
    // the box, which would make a dictated answer wait for a blur that never comes.
    w.vm.emitVoice('customer-trends', 'Spoken answer')

    const emitted = w.emitted('field-changed') || []
    expect(emitted).toHaveLength(1)
    expect(emitted[0][0]).toEqual({ fieldKey: 'customer-trends', value: 'Spoken answer' })
  })

  it('the advisor still sees their own words while typing, before any save', async () => {
    const w = mountCapture()
    const input = w.find('textarea')

    input.element.value = 'Half a sen'
    await input.trigger('input')

    // Nothing saved, and nothing wiped: Buefy holds the text locally until the blur.
    expect(w.emitted('field-changed')).toBeFalsy()
    expect(input.element.value).toBe('Half a sen')
  })
})

describe('the shared capture box behaves the same way', () => {
  const FIELD = { key: 'q1', label: 'What is changing?', example: '' }

  const mountBox = () => mountWithBuefy(StrategyCaptureBox, {
    propsData: { field: FIELD, value: '', rows: 3 }
  })

  it('🔴 emits NOTHING while a whole sentence is typed', async () => {
    const w = mountBox()
    const input = w.find('textarea')

    for (let i = 1; i <= SENTENCE.length; i++) {
      input.element.value = SENTENCE.slice(0, i)
      await input.trigger('input')
    }

    expect(w.emitted('input-field')).toBeFalsy()
  })

  it('🔴 emits ONCE, with the whole answer, when the box is left', async () => {
    const w = mountBox()
    const input = w.find('textarea')

    input.element.value = SENTENCE
    await input.trigger('change')

    const emitted = w.emitted('input-field') || []
    expect(emitted).toHaveLength(1)
    expect(emitted[0][1]).toBe(SENTENCE)
  })
})

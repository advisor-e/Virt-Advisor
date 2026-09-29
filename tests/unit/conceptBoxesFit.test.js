/**
 * Where a client's answer goes on an imported Response Form — item 15.20, question 7 (Mike,
 * 2026-09-24): inside its box, shrinking to fit, continuing below the page under the box's label
 * only when too long — never cut off.
 *
 * WHAT UAT CANNOT SEE: a word lost at the break. A long answer split between a box and the text
 * beneath the page reads naturally with a word missing, and nobody checks a client's paragraph
 * against what the advisor typed. Layout itself is measured in a browser; here `fits` stands in
 * for it with a character budget per size.
 */

import { fitAnswer, ANSWER_SIZES } from '~/utils/conceptBoxes'

const FLOOR = ANSWER_SIZES[ANSWER_SIZES.length - 1]
const budget = byteBySize => (text, size) => text.length <= byteBySize(size)
const rejoined = r => r.inBox.replace(/…$/, '') + (r.rest ? ' ' : '') + r.rest

test('an answer that fits at the largest size is left whole at that size', () => {
  const r = fitAnswer('Honesty first', budget(() => 100))
  expect(r).toEqual({ size: ANSWER_SIZES[0], inBox: 'Honesty first', rest: '' })
})

test('an answer that fits only smaller shrinks to the first size that holds it, whole', () => {
  const r = fitAnswer('x'.repeat(30), budget(size => (size < 1.6 ? 40 : 20)))
  expect(r.size).toBeLessThan(1.6)
  expect(r.size).toBeGreaterThan(FLOOR)
  expect(r.rest).toBe('')
})

test('🔴 past the floor, the box ends in an ellipsis and every word carries on below, in order', () => {
  const answer = 'We keep every promise we make to a client,\neven when it costs us the job.'
  const r = fitAnswer(answer, budget(() => 25))

  expect(r.size).toBe(FLOOR)
  expect(r.inBox.endsWith('…')).toBe(true)
  expect(r.inBox.length).toBeLessThanOrEqual(25)
  expect(r.rest.length).toBeGreaterThan(0)
  expect(rejoined(r).split(/\s+/)).toEqual(answer.split(/\s+/))
  expect(rejoined(r)).toContain('\n') // the line break survives the split
})

test('the box takes as many words as fit, not fewer', () => {
  const r = fitAnswer('one two three four five six', budget(() => 14))
  expect(r.inBox).toBe('one two three…')
  expect(r.rest).toBe('four five six')
})

test('a box too small for even one word leaves the whole answer below, not a stray ellipsis', () => {
  const r = fitAnswer('Extraordinarily long single word', budget(() => 3))
  expect(r).toEqual({ size: FLOOR, inBox: '', rest: 'Extraordinarily long single word' })
})

test('an empty answer is an empty box', () => {
  expect(fitAnswer('', budget(() => 10))).toEqual({ size: ANSWER_SIZES[0], inBox: '', rest: '' })
})

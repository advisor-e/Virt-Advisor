'use strict'

/**
 * The engine tells the screen which intake question is live (item 4.87 T022a).
 *
 * Before this, every streamed question closed with `{ type: 'done' }` and nothing
 * else, so the chat could not know it was being asked the industry question — and
 * Mike's ruling ("start typing - it makes suggestions") had nowhere to hang. The
 * closing event now carries the question's `field`. Everything that is not an intake
 * question closes exactly as before, which is what the first block pins.
 */

const fs = require('fs')
const path = require('path')
const { questionDoneEvent } = require('../../server/advisorEngine')

describe('questionDoneEvent', () => {
  test('an intake question closes with its field', () => {
    expect(questionDoneEvent('industry')).toEqual({ type: 'done', field: 'industry' })
    expect(questionDoneEvent('ownership')).toEqual({ type: 'done', field: 'ownership' })
    expect(questionDoneEvent('  industry ')).toEqual({ type: 'done', field: 'industry' })
  })

  test('anything without a field closes exactly as every stream always has', () => {
    const plain = { type: 'done' }
    expect(questionDoneEvent()).toEqual(plain)
    expect(questionDoneEvent(null)).toEqual(plain)
    expect(questionDoneEvent('')).toEqual(plain)
    expect(questionDoneEvent('   ')).toEqual(plain)
    expect(questionDoneEvent(42)).toEqual(plain)
    expect(questionDoneEvent({ field: 'industry' })).toEqual(plain)
  })
})

describe('the engine passes the field where a question from the sequence is asked', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../server/advisorEngine.js'), 'utf8')

  test('the sender writes the closing event through questionDoneEvent', () => {
    expect(src).toMatch(/const sendQuestion = \(text, _state, field\) =>/)
    expect(src).toMatch(/res\.write\('data: ' \+ JSON\.stringify\(questionDoneEvent\(field\)\)/)
  })

  test('the three places a sequenced question is asked hand over q.field', () => {
    // The first ask, the forced re-ask after "change" with no replacement, and the
    // phase-3 fallback walk. A fourth call site added without q.field would ask the
    // industry question with no field, and the chips would silently never appear.
    const calls = src.match(/sendQuestion\([^\n]*, state, q\.field\)/g) || []
    expect(calls.length).toBe(3)
  })

  test('the screen reads the field off the closing event and clears it on every send', () => {
    const vue = fs.readFileSync(path.join(__dirname, '../../components/VirtualAdvisor.vue'), 'utf8')
    expect(vue).toMatch(/this\.liveField = typeof data\.field === 'string' \? data\.field : null/)
    // Cleared at the top of sendMessage, so chips never outlive the question they belong to.
    // The engine is fetched from two methods; take the fetch that follows sendMessage itself.
    const start = vue.indexOf('async sendMessage (')
    const send = vue.slice(start, vue.indexOf('await fetch(\'/api/advisor/query\'', start))
    expect(start).toBeGreaterThan(-1)
    expect(send).toContain('this.liveField = null')
  })
})

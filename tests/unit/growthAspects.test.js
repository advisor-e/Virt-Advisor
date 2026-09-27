'use strict'

/**
 * The Growth Aspects as a tier works to them — item 15.2, the Mentor Hub tab's store.
 *
 * WHAT UAT CANNOT SEE. A mentor edits a question and sees it saved. They cannot see that the
 * edit reaches no advisor, that a firm's own wording was silently lost under the mentor's,
 * that repeating the shipped wording froze it at their tier, or that an aspect was left with
 * no questions for the AI to point at. Those are the assertions here. The wording itself is
 * pinned once, in growthAspectQuestions.test.js.
 */

const {
  CONFIG_KEY,
  BASE_ASPECTS,
  ASPECT_NAMES,
  MAX_QUESTIONS,
  validateAspects,
  applyOwn,
  diffAgainst,
  loadResolvedAspects
} = require('../../server/utils/growthAspects')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/** A loader over a `{scopeId: storedValue}` map, standing in for the overlay store. */
function loaderFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

const gov = list => list.find(a => a.name === 'Governance')

describe('the shipped nine', () => {
  test('are the data file’s nine, in its order, and pass their own validator', () => {
    expect(ASPECT_NAMES).toHaveLength(9)
    const all = {}
    BASE_ASPECTS.forEach((a) => { all[a.name] = { description: a.description, questions: a.questions } })
    expect(validateAspects(all)).toEqual({ ok: true, errors: [], value: all })
  })
})

describe('validating a tier’s own changes', () => {
  test('accepts a partial change and trims it', () => {
    const r = validateAspects({ Governance: { questions: ['  One?  '] } })
    expect(r).toEqual({ ok: true, errors: [], value: { Governance: { questions: ['One?'] } } })
  })

  test.each([
    ['a non-object', [], 'non-array JSON object'],
    ['null', null, 'non-array JSON object'],
    ['an aspect that is not one of the nine', { 'Exit Strategy': { description: 'x' } }, 'not one of the nine'],
    ['an aspect that is not an object', { Governance: 'x' }, 'must be a non-array JSON object'],
    ['a renamed aspect', { Governance: { name: 'Board' } }, 'name cannot be changed here'],
    ['a blank description', { Governance: { description: '   ' } }, 'description cannot be blank'],
    ['a description that is not text', { Governance: { description: 7 } }, 'description cannot be blank'],
    ['an overlong description', { Governance: { description: 'x'.repeat(401) } }, 'longer than 400'],
    ['questions that are not a list', { Governance: { questions: 'Q?' } }, 'must be a list'],
    ['an aspect left with no questions', { Governance: { questions: [] } }, 'keep at least one question'],
    ['too many questions', { Governance: { questions: Array(MAX_QUESTIONS + 1).fill('Q?') } }, 'no more than'],
    ['a blank question', { Governance: { questions: ['Q?', ' '] } }, 'question 2 is blank'],
    ['a question that is not text', { Governance: { questions: [{}] } }, 'question 1 is blank'],
    ['an overlong question', { Governance: { questions: ['x'.repeat(1001)] } }, 'question 1 is longer than 1000']
  ])('refuses %s', (_label, value, message) => {
    const r = validateAspects(value)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toContain(message)
  })
})

describe('storing only what differs from the level above', () => {
  test('drops a description and a question list that repeat the inherited wording', () => {
    const g = gov(BASE_ASPECTS)
    const own = { Governance: { description: g.description, questions: g.questions.slice() } }
    expect(diffAgainst(own, BASE_ASPECTS)).toEqual({})
  })

  test('keeps exactly the field that changed', () => {
    const g = gov(BASE_ASPECTS)
    const own = { Governance: { description: g.description, questions: ['New?'] } }
    expect(diffAgainst(own, BASE_ASPECTS)).toEqual({ Governance: { questions: ['New?'] } })
  })

  test('applying a change never alters the shipped wording other callers read', () => {
    const before = gov(BASE_ASPECTS).questions.slice()
    const out = applyOwn(BASE_ASPECTS, { Governance: { questions: ['New?'] } })
    expect(gov(out).questions).toEqual(['New?'])
    expect(gov(BASE_ASPECTS).questions).toEqual(before)
  })
})

describe('resolving what a scope works to', () => {
  test('no scope, and a scope with nothing stored, get the shipped nine by reference', async () => {
    expect(await loadResolvedAspects(null, loaderFor({}))).toBe(BASE_ASPECTS)
    expect(await loadResolvedAspects('firm-a', loaderFor({}))).toBe(BASE_ASPECTS)
  })

  test('🔴 the mentor’s edit reaches a firm beneath it', async () => {
    const out = await loadResolvedAspects('firm-a', loaderFor({ [PLATFORM_SCOPE]: { Governance: { description: 'Edited.' } } }))
    expect(gov(out).description).toBe('Edited.')
    expect(gov(out).questions).toEqual(gov(BASE_ASPECTS).questions)
  })

  test('a firm’s own wording wins over the mentor’s, field by field', async () => {
    const out = await loadResolvedAspects('firm-a', loaderFor({
      [PLATFORM_SCOPE]: { Governance: { description: 'Mentor.', questions: ['M?'] } },
      'firm-a': { Governance: { questions: ['F?'] } }
    }))
    expect(gov(out)).toEqual({ name: 'Governance', description: 'Mentor.', questions: ['F?'] })
  })

  test('a stored value that no longer validates is ignored, not half-applied', async () => {
    const out = await loadResolvedAspects('firm-a', loaderFor({ 'firm-a': { Governance: { questions: [] } } }))
    expect(out).toBe(BASE_ASPECTS)
  })

  test('never rejects: a store that cannot be read gives the layer above', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const out = await loadResolvedAspects('firm-a', () => Promise.reject(new Error('down')))
    expect(out).toBe(BASE_ASPECTS)
    console.error.mockRestore()
  })
})

'use strict'

// pickLearnTreeAI chooses the Learn-mode coaching guide semantically (robust to
// dictation garbles + red-herring keyword ties). It must NEVER trust raw model
// text: the result is validated against the real mode:learn tree ids, and any
// failure / "none" / unknown id returns null so the caller falls back to the
// deterministic matcher. The OpenAI client is mocked to control the model reply.

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const { pickLearnTreeAI } = require('../../server/advisorEngine')

const reply = content => jest.fn().mockResolvedValue({ choices: [{ message: { content } }] })

beforeEach(() => { mockCreate = reply('none') })

describe('pickLearnTreeAI', () => {
  test('returns the eoy_meeting tree when the model picks it (real tree id)', async () => {
    mockCreate = reply('eoy_meeting')
    const tree = await pickLearnTreeAI('I want to run an end of year meeting and upsell into advisory')
    expect(tree).toBeTruthy()
    expect(tree.id).toBe('eoy_meeting')
    expect(tree.mode).toBe('learn')
  })

  test('tolerates surrounding punctuation/quotes around the id', async () => {
    mockCreate = reply('"eoy_meeting".')
    const tree = await pickLearnTreeAI('end of year meeting help')
    expect(tree && tree.id).toBe('eoy_meeting')
  })

  test('returns null when the model says none', async () => {
    mockCreate = reply('none')
    expect(await pickLearnTreeAI('something unrelated')).toBeNull()
  })

  test('returns null for an unknown / hallucinated id (never trust raw output)', async () => {
    mockCreate = reply('totally_made_up_tree')
    expect(await pickLearnTreeAI('end of year meeting')).toBeNull()
  })

  test('returns null (graceful fallback) when the AI call throws', async () => {
    mockCreate = jest.fn().mockRejectedValue(new Error('upstream down'))
    expect(await pickLearnTreeAI('end of year meeting')).toBeNull()
  })

  test('returns null on empty input without calling the model', async () => {
    mockCreate = reply('eoy_meeting')
    expect(await pickLearnTreeAI('   ')).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

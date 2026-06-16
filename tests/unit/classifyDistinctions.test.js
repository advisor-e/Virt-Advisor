'use strict'

// Engine-boundary test for the distinction cascade: classifyDistinctions now
// receives the firm's already-resolved EFFECTIVE list (built by the resolver) and
// turns AI matches into template boosts. The critical guarantee proved here is that
// a firm override REPLACES the platform original — the matched template's boost is
// the firm's value, never the platform value and never the two summed (no
// double-boost) — and that a declined platform row cannot contribute a boost.
//
// The OpenAI REST client is mocked so the "which patterns match" decision is fully
// controlled; we drive it to match specific rows and assert the resulting boostMap.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const { classifyDistinctions } = require('../../server/advisorEngine')
const { resolveEffectiveDistinctions } = require('../../server/utils/resolveDistinctions')

const PLATFORM = [
  { id: 'pd-1', domain: 'conflict', triggers: ['fight'], description: 'Active conflict', templates: ['Force Field Analysis'], boost: 5 },
  { id: 'pd-2', domain: 'conflict', triggers: ['dispute'], description: 'Owner dispute', templates: ['Partner Accountability'], boost: 5 },
  { id: 'pd-3', domain: 'profit', triggers: ['margins'], description: 'Thin margins', templates: ['Lite Feasibility'], boost: 5 }
]

// Helper: make the mocked model "match" the given 1-based pattern indices.
const matchReply = indices => jest.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ matches: indices }) } }],
  usage: { prompt_tokens: 1, completion_tokens: 1 }
})

beforeEach(() => { mockCreate = matchReply([]) })

describe('classifyDistinctions over the resolved effective list', () => {
  it('baseline: no firm changes — platform row boosts apply as before', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = matchReply([1, 2]) // both conflict rows match
    const boosts = await classifyDistinctions('conflict', 'they keep fighting and disputing', effective)
    expect(boosts).toEqual({ 'Force Field Analysis': 5, 'Partner Accountability': 5 })
  })

  it('override REPLACES the platform row — boost is the firm value, not summed', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {
      overrides: { 'pd-1': { boost: 12, templates: ['Force Field Analysis'] } }
    })
    mockCreate = matchReply([1]) // the (now firm-overridden) first conflict row
    const boosts = await classifyDistinctions('conflict', 'they keep fighting', effective)
    // 12 (firm) — not 5 (platform) and not 17 (both): the platform original is gone.
    expect(boosts).toEqual({ 'Force Field Analysis': 12 })
  })

  it('declined platform row contributes no boost even if the model points at it', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, { declinedIds: ['pd-1'] })
    // After declining pd-1, only pd-2 remains in the conflict domain (index 1).
    // A stale match index 2 (out of range) must be ignored, not throw.
    mockCreate = matchReply([1, 2])
    const boosts = await classifyDistinctions('conflict', 'owner dispute brewing', effective)
    expect(boosts).toEqual({ 'Partner Accountability': 5 })
    expect(boosts['Force Field Analysis']).toBeUndefined()
  })

  it('firm-own row is classified and boosts its templates', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {
      ownRows: [{ id: 1, domain: 'conflict', triggers: ['alignment'], description: 'Owners not aligned', templates: ['Lite Strategy'], boost: 8 }]
    })
    mockCreate = matchReply([3]) // pd-1, pd-2, then the firm-own row at index 3
    const boosts = await classifyDistinctions('conflict', 'owners are not aligned', effective)
    expect(boosts).toEqual({ 'Lite Strategy': 8 })
  })

  it('only the detected domain is classified', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = matchReply([1]) // within the profit-filtered list, pd-3 is index 1
    const boosts = await classifyDistinctions('profit', 'margins are thin', effective)
    expect(boosts).toEqual({ 'Lite Feasibility': 5 })
  })

  it('returns {} for missing domain/text or an empty effective list', async () => {
    expect(await classifyDistinctions('', 'text', PLATFORM)).toEqual({})
    expect(await classifyDistinctions('conflict', '', PLATFORM)).toEqual({})
    expect(await classifyDistinctions('conflict', 'text', [])).toEqual({})
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns {} (no boosts) when the model call fails — fail safe', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = jest.fn().mockRejectedValue(new Error('network'))
    const boosts = await classifyDistinctions('conflict', 'they keep fighting', effective)
    expect(boosts).toEqual({})
  })
})

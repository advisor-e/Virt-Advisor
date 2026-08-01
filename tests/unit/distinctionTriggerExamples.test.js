'use strict'

// Every trigger phrase an Advisory Distinction carries must reach the classifier.
//
// WHY THIS FILE EXISTS. `_classifyMatchingRows` built its prompt from
// `row.triggers.slice(0, 5)` while FirmManagerHub.vue rendered the whole list and
// invited more. On the committed platform set that silently withheld 67 phrases across
// 56 of 67 rows, and which five survived was array order — not a choice anyone made.
// Ruled 2026-08-01 (Mike): send them all. Same failure family as the routing defects of
// 2026-07-30/31 — firm-authored content that renders, saves, passes tests, and never
// reaches the AI. The defect was the SILENCE, not the loss: these phrases are examples
// a semantic classifier reads, not literal gates.
//
// The assertions below read the PROMPT ACTUALLY SENT to the mocked model, never the
// row objects. A test that re-listed the trigger arrays would pass whatever the
// formatter did with them — which is exactly how the original defect survived.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const {
  classifyDistinctions,
  findNearMissDistinctions,
  DISTINCTION_TRIGGER_EXAMPLE_CAP
} = require('../../server/advisorEngine')

const COMMITTED = require('../../data/advisory-distinctions.json')

const matchReply = (indices = []) => jest.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ matches: indices }) } }],
  usage: { prompt_tokens: 1, completion_tokens: 1 }
})

// The prompt string the model was actually handed.
const sentPrompt = () => mockCreate.mock.calls[0][0].messages[0].content

const phrases = n => Array.from({ length: n }, (_, i) => `phrase-${i + 1}`)

beforeEach(() => { mockCreate = matchReply([]) })

describe('every trigger phrase reaches the classifier', () => {
  it('pins the fixed defect: a row with 8 phrases sends all 8, not the first 5', async () => {
    const rows = [{ id: 'x', domain: 'profit', description: 'Thin margins', triggers: phrases(8), templates: ['T'], boost: 5 }]
    await classifyDistinctions('profit', 'margins are thin', rows)

    const prompt = sentPrompt()
    // 6, 7 and 8 are the ones the old slice(0, 5) dropped.
    expect(prompt).toContain('phrase-6')
    expect(prompt).toContain('phrase-7')
    expect(prompt).toContain('phrase-8')
    for (const p of phrases(8)) { expect(prompt).toContain(p) }
  })

  it('sends a 6th phrase — the smallest case the old cap silently withheld', async () => {
    const rows = [{ id: 'x', domain: 'profit', description: 'Thin margins', triggers: phrases(6), templates: ['T'], boost: 5 }]
    await classifyDistinctions('profit', 'margins are thin', rows)
    expect(sentPrompt()).toContain('phrase-6')
  })

  it('applies per ROW, not per prompt — every row in a multi-row domain sends all of its phrases', async () => {
    // A per-prompt budget would starve later rows while the first looked correct.
    const rows = [
      { id: 'a', domain: 'profit', description: 'A', triggers: ['a-one', 'a-two', 'a-three', 'a-four', 'a-five', 'a-six'], templates: ['T'], boost: 5 },
      { id: 'b', domain: 'profit', description: 'B', triggers: ['b-one', 'b-two', 'b-three', 'b-four', 'b-five', 'b-six'], templates: ['T'], boost: 5 }
    ]
    await classifyDistinctions('profit', 'text', rows)
    expect(sentPrompt()).toContain('a-six')
    expect(sentPrompt()).toContain('b-six')
  })

  it('the cross-domain near-miss bridge gets the same treatment (shared formatter)', async () => {
    // Both engine paths go through _classifyMatchingRows. If one is ever given its own
    // formatter, this fails — the divergence the routing defects were made of.
    const effective = [
      { id: 1, domain: 'systems', description: 'No financial controls', triggers: phrases(8), templates: ['T'], boost: 10, source: 'firm-own' }
    ]
    await findNearMissDistinctions('profit', 'they have no approvals', effective)
    expect(sentPrompt()).toContain('phrase-8')
  })

  it('a row with no triggers contributes no empty example fragment', async () => {
    const rows = [{ id: 'x', domain: 'profit', description: 'Thin margins', triggers: [], templates: ['T'], boost: 5 }]
    await classifyDistinctions('profit', 'margins are thin', rows)
    expect(sentPrompt()).not.toContain('example phrases')
  })

  it('a missing or malformed triggers field does not throw', async () => {
    const rows = [
      { id: 'x', domain: 'profit', description: 'No field', templates: ['T'], boost: 5 },
      { id: 'y', domain: 'profit', description: 'Not an array', triggers: 'oops', templates: ['T'], boost: 5 }
    ]
    await expect(classifyDistinctions('profit', 'text', rows)).resolves.toBeDefined()
    expect(sentPrompt()).not.toContain('example phrases')
  })
})

describe('the runaway-edit guard announces itself (no-silent-caps rule)', () => {
  // The save routes reject an empty triggers array but set NO upper bound, so a paste
  // could otherwise push a thousand phrases into a live model call. The ceiling exists
  // for that, and must never trim in silence the way the old five did.
  it('sends exactly the cap and warns with the number withheld', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const over = DISTINCTION_TRIGGER_EXAMPLE_CAP + 7
    const rows = [{ id: 'x', domain: 'profit', description: 'Runaway', triggers: phrases(over), templates: ['T'], boost: 5 }]
    await classifyDistinctions('profit', 'text', rows)

    const prompt = sentPrompt()
    expect(prompt).toContain(`phrase-${DISTINCTION_TRIGGER_EXAMPLE_CAP}`)
    expect(prompt).not.toContain(`phrase-${DISTINCTION_TRIGGER_EXAMPLE_CAP + 1}`)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('7')
    warn.mockRestore()
  })

  it('counts across rows and stays silent when nothing is withheld', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const under = [{ id: 'x', domain: 'profit', description: 'Fine', triggers: phrases(8), templates: ['T'], boost: 5 }]
    await classifyDistinctions('profit', 'text', under)
    expect(warn).not.toHaveBeenCalled()

    mockCreate = matchReply([])
    const two = [
      { id: 'a', domain: 'profit', description: 'A', triggers: phrases(DISTINCTION_TRIGGER_EXAMPLE_CAP + 2), templates: ['T'], boost: 5 },
      { id: 'b', domain: 'profit', description: 'B', triggers: phrases(DISTINCTION_TRIGGER_EXAMPLE_CAP + 3), templates: ['T'], boost: 5 }
    ]
    await classifyDistinctions('profit', 'text', two)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('5') // 2 + 3 withheld, reported as one total
    warn.mockRestore()
  })
})

describe('the ceiling must never start biting real content', () => {
  // This is the assertion that earns the file its keep. The old cap of five was fine on
  // the day it was written and became a silent content defect as the firm added phrases.
  // A ceiling nobody re-checks does the same thing again; this fails on the commit that
  // grows a row past it, instead of the AI quietly seeing less.
  const rows = COMMITTED.platform

  it('the committed set is non-trivial, so this guard cannot pass vacuously', () => {
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBeGreaterThanOrEqual(60)
    // At least one row must exceed the OLD cap of five — proof that real content
    // actually exercises the fix, rather than the guard passing because nothing does.
    expect(rows.filter(r => (r.triggers || []).length > 5).length).toBeGreaterThan(0)
  })

  it('no committed distinction carries more phrases than the ceiling', () => {
    const over = rows
      .filter(r => (r.triggers || []).length > DISTINCTION_TRIGGER_EXAMPLE_CAP)
      .map(r => `${r.id} (${r.triggers.length})`)
    expect(over).toEqual([])
  })

  it('keeps real headroom below the ceiling — raise it deliberately, do not discover it', () => {
    const most = Math.max(...rows.map(r => (r.triggers || []).length))
    expect(most).toBeLessThanOrEqual(Math.floor(DISTINCTION_TRIGGER_EXAMPLE_CAP / 2))
  })
})

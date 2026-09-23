'use strict'

// The template-heading repair (commit 828ed2b2, 2026-09-16): when the advisor's answer lists a
// calculator under a TEMPLATE heading, the AI is asked once to correct it.
//
// 🔴 WHY THIS FILE EXISTS. Until 2026-09-24 the repair passed no options to the provider seam,
// which has refused any call that does not say whether it carries personal data since
// 2026-09-14. So the correction never ran once — the advisor always got the first answer and
// a warning note — and nothing tested it, which is how eight days passed unseen. Found while
// wiring item 8.2's moderation. These tests drive the real seam, not a stand-in for it.

const mockCreate = jest.fn()
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({ chat: { completions: { create: (...a) => mockCreate(...a) } } })
}))

const { correctTemplateHeadings } = require('../../server/advisorEngine')
const { resolveModelToken } = require('../../server/utils/modelChoiceScan')
const { isKnownTemplate, nearestTemplateTitle } = require('../../server/utils/tierLookup')

// A real calculator that is not also a template title, taken from the shipped data rather
// than typed here, so the test cannot drift from the catalogue.
const CALCULATOR = (require('../../data/report-model-summaries.json').models || [])
  .map(m => m.name)
  .find(n => resolveModelToken(n) && !isKnownTemplate(n) && !nearestTemplateTitle(n))

const WRONG = '**Best match**\n- ' + CALCULATOR + ' — it measures exactly this.\n'
const SOURCE = [
  { role: 'system', content: 'fixed instructions' },
  { role: 'user', content: 'My client is slow to collect debts.' },
  { role: 'assistant', content: 'An earlier reply.' }
]

beforeEach(() => mockCreate.mockReset())

test('the shipped data still has a calculator to test with', () => {
  expect(typeof CALCULATOR).toBe('string')
})

test('🔴 the repair reaches the AI — marked personal, naming only the advisor\'s typed turns', async () => {
  mockCreate.mockResolvedValue({ choices: [{ message: { content: 'A corrected answer.' } }], usage: {} })

  const out = await correctTemplateHeadings(WRONG, SOURCE, 'gpt-4o-mini')

  expect(mockCreate).toHaveBeenCalledTimes(1)
  const options = mockCreate.mock.calls[0][1]
  expect(options.moderate).toEqual(['My client is slow to collect debts.'])
  expect(out.answer).toBe('A corrected answer.')
})

test('a failed repair still keeps the first answer and names what was wrong', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  mockCreate.mockRejectedValue(new Error('down'))
  const out = await correctTemplateHeadings(WRONG, SOURCE, 'gpt-4o-mini')
  expect(out.answer).toBe(WRONG)
  expect(out.unresolved.map(o => o.name)).toEqual([CALCULATOR])
})

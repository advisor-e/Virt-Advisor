'use strict'

/**
 * The primary-issue proposal, as the advisor actually meets it (item 4.97 US1, task T018).
 *
 * `primaryIssueProposer.test.js` proves the ranking and the reply parsing in isolation. This
 * suite proves the ENGINE's half: that a proposal is built from the advisor's own cause words,
 * that a confirm / reframe / miss each leave the right three fields on the state — `primaryIssue`,
 * `primaryIssueHow` and `primaryIssueReason`, which are exactly what the decision trace reports
 * and what the Outcome Learning pool stores — and that the step stays silent where it should.
 *
 * WHY THESE ASSERTIONS AND NOT OTHERS. Every one of these is invisible in UAT: a tester sees a
 * sensible question and a sensible reply either way. What they cannot see is which label was
 * STORED, whether `how` says the advisor confirmed it or corrected it, or whether a label was
 * pinned that the advisor's words never supported — and those three are what the resolver scores
 * against and what the pool learns from. Nothing here asserts wording; the wording is Mike's, it
 * lives in `primaryIssueProposer` from the drawing he approved, and a test copy of it would only
 * have to be rewritten the next time he changes a word.
 *
 * The AI is mocked throughout: the model is reached only to break a tie between two of Mike's own
 * labels, and no test here should need a key or a network.
 */

let mockCreate
jest.mock('../../server/utils/aiProvider', () => ({
  getClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  }),
  modelFor: () => 'test-model'
}))

const {
  buildIssueProposal,
  applyIssueReply,
  applyIssueDriverReply,
  causeTextOf
} = require('../../server/advisorEngine')
const { tooWeakToName, isDomainWord } = require('../../server/utils/primaryIssueProposer')

// Real authored labels from data/primary-issues.json — the file is Mike's, so the fixtures
// quote it rather than invent a label the engine would never propose.
const COST_OF_SALES = 'Cost of sales has increased'
const DISCOUNTING = 'Excessive discounting eroding margin'

/** A state shaped as the sequencer builds it, at the moment the proposal is due. */
function stateWith (causeWords, domain) {
  return {
    detectedDomain: domain || 'profit',
    _openingSituation: causeWords,
    situationDiagnostic: null,
    primaryIssue: null,
    primaryIssueHow: 'none',
    primaryIssueReason: null,
    _issueProposed: null,
    _issueProposalReason: null,
    _issueProposalLine: null,
    _issueReproposed: false,
    _issueNeedsDriver: false
  }
}

beforeEach(() => {
  mockCreate = jest.fn()
  jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })

describe('causeTextOf — the words the proposal is ranked against', () => {
  test('joins the opening situation and the cause answer', () => {
    const s = stateWith('margins are down')
    s.situationDiagnostic = 'suppliers put their prices up'
    expect(causeTextOf(s)).toBe('margins are down\nsuppliers put their prices up')
  })

  test('the pending and skipped sentinels never reach the ranker', () => {
    // A sentinel ranked as text would score the word "pending" against Mike's labels.
    const s = stateWith('margins are down')
    s.situationDiagnostic = 'pending'
    expect(causeTextOf(s)).toBe('margins are down')
    s.situationDiagnostic = 'skipped'
    expect(causeTextOf(s)).toBe('margins are down')
  })

  test('nothing said yet → empty, and the caller proposes nothing', async () => {
    expect(causeTextOf({ _openingSituation: null, situationDiagnostic: null })).toBe('')
    expect(await buildIssueProposal(stateWith(''))).toBeNull()
  })
})

describe('buildIssueProposal — what is put to the advisor', () => {
  test('the advisor\'s own words choose the label, and it is remembered for the reply', async () => {
    const s = stateWith('the cost of sales has gone up, suppliers put prices up')
    const line = await buildIssueProposal(s)
    expect(s._issueProposed).toBe(COST_OF_SALES)
    expect(line).toContain(COST_OF_SALES)
    expect(mockCreate).not.toHaveBeenCalled() // a clear winner never reaches the model
  })

  test('a context domain proposes nothing — it names no structural problem by design', async () => {
    expect(await buildIssueProposal(stateWith('the shareholders are in dispute', 'conflict'))).toBeNull()
  })

  test('a domain with no authored labels proposes nothing', async () => {
    expect(await buildIssueProposal(stateWith('we need a better system', 'no-such-domain'))).toBeNull()
  })

  test('words matching no label propose nothing, so the driver question follows', async () => {
    expect(await buildIssueProposal(stateWith('zzzz qqqq'))).toBeNull()
  })

  test('a tie asks the model, and its choice is what gets proposed', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '2' } }] })
    // Both labels share "sales"/"margin" vocabulary with these words.
    const s = stateWith('sales margin discounting cost')
    const line = await buildIssueProposal(s)
    expect(mockCreate).toHaveBeenCalled()
    expect(line).toContain(s._issueProposed)
  })

  test('the model failing costs the tie-break, never the question', async () => {
    mockCreate.mockRejectedValue(new Error('provider down'))
    const s = stateWith('sales margin discounting cost')
    const line = await buildIssueProposal(s)
    expect(typeof line).toBe('string')
    expect(s._issueProposed).toBeTruthy()
  })

  test('the model answering with something not on the list is discarded', async () => {
    // The boxed validator's whole job: a label the advisor never said must not be stored.
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Profits are bad' } }] })
    const s = stateWith('sales margin discounting cost')
    await buildIssueProposal(s)
    expect([COST_OF_SALES, DISCOUNTING]).toContain(s._issueProposed)
  })
})

describe('evidence too thin to name a label (the 2026-09-14 live failure)', () => {
  // An advisor said "margins are down, the cost of sales has gone up because suppliers put
  // their prices up". The case had been routed to sales-marketing upstream, and the engine
  // proposed *Sales Execution — no visible sales process or poor sales training* on the single
  // word "sales", taken from "cost of sales". UAT would see a fluent, plausible sentence; only
  // an assertion catches that the label rests on one incidental category word.
  const SUPPLIER_COSTS = 'Margins are down. The cost of sales has gone up because suppliers put their prices up.'

  test('a lone match on the DOMAIN NAME proposes nothing, and says why', async () => {
    const s = stateWith(SUPPLIER_COSTS, 'sales-marketing')
    expect(await buildIssueProposal(s)).toBeNull()
    expect(tooWeakToName('sales-marketing', ['sales'])).toBe(true)
  })

  test('the same words in the right domain still propose — the ranker was never wrong', async () => {
    const s = stateWith(SUPPLIER_COSTS, 'profit')
    const line = await buildIssueProposal(s)
    expect(s._issueProposed).toBe(COST_OF_SALES)
    expect(line).toContain(COST_OF_SALES)
  })

  test('two matched words are enough — only a LONE category word is withheld', () => {
    expect(tooWeakToName('sales-marketing', ['sales', 'training'])).toBe(false)
  })

  test('a domain with ONE label still proposes on its category word', async () => {
    // Nothing to choose between, so the category word is the best evidence there is and
    // withholding it would cost the advisor a question for no gain.
    expect(tooWeakToName('risk', ['risk'])).toBe(false)
    const s = stateWith('we have no risk process at all', 'risk')
    expect(await buildIssueProposal(s)).toContain('Risk Framework')
  })

  test('a specific word is never withheld, even alone', () => {
    // "roles" names one staff label and is not the domain's category word.
    expect(tooWeakToName('staff', ['roles'])).toBe(false)
    expect(tooWeakToName('governance', ['decision'])).toBe(false)
  })

  test('isDomainWord reads Mike\'s domain file, not a list kept here', () => {
    expect(isDomainWord('sales-marketing', 'sales')).toBe(true)
    expect(isDomainWord('sales-marketing', 'marketing')).toBe(true)
    expect(isDomainWord('data-systems', 'data')).toBe(true)
    expect(isDomainWord('staff', 'roles')).toBe(false)
    expect(isDomainWord('no-such-domain', 'sales')).toBe(false)
  })

  test('a withheld proposal still reaches the driver question, then an honest null', async () => {
    // The whole point: withholding must not silently drop the step. The advisor gets the
    // open question, and if that names nothing the trace says so rather than pinning a label.
    const s = stateWith(SUPPLIER_COSTS, 'sales-marketing')
    expect(await buildIssueProposal(s)).toBeNull()
    s._issueNeedsDriver = true
    applyIssueDriverReply('suppliers raised their prices and we never repriced', s)
    expect(s.primaryIssueHow).toBe('none')
    expect(s.primaryIssue).toBeNull()
  })
})

describe('applyIssueReply — confirm, reframe, miss', () => {
  test('a confirm stores the proposed label as confirmed', async () => {
    const s = stateWith('the cost of sales has gone up')
    await buildIssueProposal(s)
    applyIssueReply('yes, that\'s right', s)
    expect(s.primaryIssue).toBe(COST_OF_SALES)
    expect(s.primaryIssueHow).toBe('confirmed')
    expect(s.primaryIssueReason).toBeTruthy()
  })

  test('a reframe is proposed back once rather than stored on the spot', async () => {
    const s = stateWith('the cost of sales has gone up')
    await buildIssueProposal(s)
    applyIssueReply('no, it\'s really the discounting eroding our margin', s)
    // Nothing is stored yet — the advisor's correction is put back to them for a yes.
    expect(s.primaryIssue).toBeNull()
    expect(s._issueProposed).toBe(DISCOUNTING)
    expect(s._issueReproposed).toBe(true)
    expect(s._forceAskField).toBe('issueProposed')
    expect(s._forceAskPrompt).toContain(DISCOUNTING)
  })

  test('confirming the re-proposal stores it as REFRAMED, not confirmed', async () => {
    // The distinction matters downstream: `how` tells the mentor whether the engine read the
    // advisor correctly first time or had to be corrected.
    const s = stateWith('the cost of sales has gone up')
    await buildIssueProposal(s)
    applyIssueReply('no, it\'s really the discounting eroding our margin', s)
    applyIssueReply('yes', s)
    expect(s.primaryIssue).toBe(DISCOUNTING)
    expect(s.primaryIssueHow).toBe('reframed')
  })

  test('a second miss after a reframe keeps the advisor\'s own correction', async () => {
    const s = stateWith('the cost of sales has gone up')
    await buildIssueProposal(s)
    applyIssueReply('no, it\'s really the discounting eroding our margin', s)
    applyIssueReply('hmm, not sure', s)
    expect(s.primaryIssue).toBe(DISCOUNTING)
    expect(s.primaryIssueHow).toBe('reframed')
  })

  test('a rejection with nothing named arms the one driver question', async () => {
    const s = stateWith('the cost of sales has gone up')
    await buildIssueProposal(s)
    applyIssueReply('no, none of those', s)
    expect(s.primaryIssue).toBeNull()
    expect(s._issueNeedsDriver).toBe(true)
  })
})

describe('applyIssueDriverReply — the last chance, and the honest miss', () => {
  test('a driver answer that names a label stores it as reframed', () => {
    const s = stateWith('things are tight')
    s._issueNeedsDriver = true
    applyIssueDriverReply('our cost of sales keeps increasing', s)
    expect(s.primaryIssue).toBe(COST_OF_SALES)
    expect(s.primaryIssueHow).toBe('reframed')
  })

  test('still nothing → NO label is pinned, and the trace says why', () => {
    // Mike's Option B. A label the advisor's words do not support is worse than none: the
    // resolver scores against it and the pool learns from it.
    const s = stateWith('things are tight')
    s._issueNeedsDriver = true
    applyIssueDriverReply('zzzz qqqq', s)
    expect(s.primaryIssue).toBeNull()
    expect(s.primaryIssueHow).toBe('none')
    expect(s.primaryIssueReason).toBeNull()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[signal-miss]'))
  })
})

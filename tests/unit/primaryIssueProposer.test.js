'use strict'

/**
 * The primary-issue proposer (item 4.97 US1, task T015).
 *
 * Held at 100%: this decides what the engine SAYS the client's problem is, then scores
 * templates against it and teaches the pool from it. UAT sees the sentence and can judge it,
 * but cannot see the two things that matter — that a label is never invented, and that the
 * advisor's own words outrank a stock "yes".
 *
 * Every expectation below uses Mike's REAL authored labels from data/primary-issues.json.
 * A test written against invented labels would prove the ranker works on content that does
 * not exist.
 */

const PRIMARY_ISSUES = require('../../data/primary-issues.json')
const {
  CONTEXT_DOMAINS, DRIVER_QUESTION, MOVING_ON_LINE,
  keywords, labelsFor, proposesIssue, rankLabels, reasonFrom,
  proposalLine, reproposalLine, parseReply, tiebreakWithModel
} = require('../../server/utils/primaryIssueProposer')

// Mike's own labels, quoted so a change to his content fails a test rather than passing quietly.
const COST_OF_SALES = 'Cost of sales has increased'
const DISCOUNTING = 'Excessive discounting eroding margin'
const OVERHEADS = 'Fixed overhead costs grown beyond what revenue can support'
const ROLES = 'Roles and responsibilities poorly defined'

// ── which domains propose at all ──────────────────────────────────────────────

describe('which domains propose an issue', () => {
  test('the eleven domains Mike authored labels for do', () => {
    Object.keys(PRIMARY_ISSUES).forEach(d => expect(proposesIssue(d)).toBe(true))
    expect(Object.keys(PRIMARY_ISSUES)).toHaveLength(11)
  })

  test('the three context domains never do, by design', () => {
    expect(CONTEXT_DOMAINS).toEqual(['conflict', 'eoy', 'due-diligence'])
    CONTEXT_DOMAINS.forEach(d => expect(proposesIssue(d)).toBe(false))
  })

  test('a domain with no authored labels does not', () => {
    // The eight newer domains (stock-purchasing, raising-capital, the org-* set) have none.
    expect(proposesIssue('stock-purchasing')).toBe(false)
    expect(proposesIssue('org-leadership')).toBe(false)
    expect(proposesIssue('nonsense-domain')).toBe(false)
    expect(proposesIssue(null)).toBe(false)
    expect(proposesIssue('')).toBe(false)
  })

  test('labelsFor returns the authored list, or nothing', () => {
    expect(labelsFor('profit')).toContain(COST_OF_SALES)
    expect(labelsFor('profit')).toHaveLength(5)
    expect(labelsFor('valuation')).toHaveLength(1)
    expect(labelsFor('conflict')).toEqual([])
    expect(labelsFor(null)).toEqual([])
  })
})

// ── the ranking ───────────────────────────────────────────────────────────────

describe('ranking a label against what the advisor said', () => {
  test('the advisor\'s own words pick the right label', () => {
    const r = rankLabels('profit', 'cost of sales has gone up, suppliers put prices up and our margin is squeezed', {})
    expect(r.top).toBe(COST_OF_SALES)
    expect(r.matched).toEqual(expect.arrayContaining(['cost', 'sales']))
    expect(r.needsTiebreak).toBe(false)
  })

  test('a different description picks a different label in the same domain', () => {
    expect(rankLabels('profit', 'we keep discounting to win work and it erodes the margin', {}).top).toBe(DISCOUNTING)
    expect(rankLabels('profit', 'our overheads have grown way beyond what the revenue supports', {}).top).toBe(OVERHEADS)
    expect(rankLabels('staff', 'nobody knows their responsibilities', {}).top).toBe(ROLES)
  })

  test('🔴 the industry stop-list is NOT applied — the fault found on 2026-09-14', () => {
    // "sales", "service" and "trading" are stop words for an INDUSTRY answer and are the
    // substance of Mike's labels. Filtering them proposed the discounting label for an
    // advisor describing rising costs, because "margin" was all that survived.
    const r = rankLabels('profit', 'cost of sales has gone up', {})
    expect(r.top).toBe(COST_OF_SALES)
    expect(r.top).not.toBe(DISCOUNTING)
  })

  test('a fired signal supports a label the advisor only half-named', () => {
    const withSignal = rankLabels('profit', 'we are always discounting', { pricing_issue: 2 })
    const without = rankLabels('profit', 'we are always discounting', {})
    expect(withSignal.top).toBe(DISCOUNTING)
    expect(withSignal.score).toBeGreaterThan(without.score)
  })

  test('the advisor\'s own words outweigh a signal', () => {
    // A word they said scores 2; a signal's vocabulary scores 1. What they said wins.
    const r = rankLabels('profit', 'the overheads have grown beyond what revenue supports', { pricing_issue: 5 })
    expect(r.top).toBe(OVERHEADS)
  })

  test('nothing matching means nothing proposed — never a guess', () => {
    expect(rankLabels('profit', 'things feel a bit flat lately', {}).top).toBeNull()
    expect(rankLabels('profit', '', {}).top).toBeNull()
    expect(rankLabels('profit', null, {}).top).toBeNull()
    expect(rankLabels('profit', 'hello', {}).score).toBe(0)
  })

  test('a context domain ranks nothing whatever the advisor said', () => {
    expect(rankLabels('conflict', 'two directors are arguing about cost of sales', {}).top).toBeNull()
    expect(rankLabels('eoy', 'the margin is being eroded by discounting', {}).top).toBeNull()
  })

  test('a genuine tie is reported rather than picked at random', () => {
    // Four data-systems labels share the word "data"; one word cannot separate them.
    const r = rankLabels('data-systems', 'our data is wrong', { data_quality: 1 })
    expect(r.needsTiebreak).toBe(true)
    expect(r.candidates.length).toBeGreaterThan(1)
    r.candidates.forEach(c => expect(labelsFor('data-systems')).toContain(c))
  })

  test('a malformed signal map is survived', () => {
    expect(rankLabels('profit', 'cost of sales', null).top).toBe(COST_OF_SALES)
    expect(rankLabels('profit', 'cost of sales', { pricing_issue: 0 }).top).toBe(COST_OF_SALES)
    expect(rankLabels('profit', 'cost of sales', { unknown_signal: 9 }).top).toBe(COST_OF_SALES)
  })

  test('every ranked label is one Mike authored for that domain', () => {
    // The guard on the whole feature: the ranker may only ever return his content.
    const texts = ['cost of sales up', 'discounting too much', 'no training structure', 'owner wants out', 'data is wrong']
    Object.keys(PRIMARY_ISSUES).forEach((domain) => {
      texts.forEach((t) => {
        const r = rankLabels(domain, t, { staff_problem: 1, data_quality: 1 })
        if (r.top) { expect(PRIMARY_ISSUES[domain]).toContain(r.top) }
      })
    })
  })
})

// ── keywords ──────────────────────────────────────────────────────────────────

describe('keywords', () => {
  test('keeps the words a problem is named with', () => {
    expect(keywords('Cost of sales has increased')).toEqual(expect.arrayContaining(['cost', 'sales', 'increased']))
  })

  test('drops grammar and anything too short', () => {
    const k = keywords('the cost of it is up a bit')
    expect(k).not.toContain('the')
    expect(k).not.toContain('of')
    expect(k).not.toContain('up')
  })

  test('splits on the punctuation Mike\'s labels use, including the em-dash', () => {
    const k = keywords('Sales Revenue — low volume, revenue is the constraint')
    expect(k).toEqual(expect.arrayContaining(['sales', 'revenue', 'volume', 'constraint']))
    expect(k.some(w => w.includes('—'))).toBe(false)
  })

  test('deduplicates and lowercases', () => {
    expect(keywords('Revenue revenue REVENUE').filter(w => w === 'revenue')).toHaveLength(1)
  })

  test('a non-string is no words', () => {
    expect(keywords(null)).toEqual([])
    expect(keywords(42)).toEqual([])
    expect(keywords(undefined)).toEqual([])
  })
})

// ── the sentences ─────────────────────────────────────────────────────────────

describe('the wording Mike ruled on 2026-09-14', () => {
  test('the proposal names the issue and one reason, and invites a correction', () => {
    const line = proposalLine(COST_OF_SALES, 'you mentioned cost and sales')
    expect(line).toBe('From what you\'ve said, the main issue looks like **Cost of sales has increased** — you mentioned cost and sales. Have I got that right, or is it really something else?')
  })

  test('the re-proposal after a reframe is shorter', () => {
    expect(reproposalLine(DISCOUNTING)).toBe('Then it sounds like **Excessive discounting eroding margin** — have I got that right?')
  })

  test('the driver question and the moving-on line are one sentence each', () => {
    expect(DRIVER_QUESTION).toBe('What\'s the single biggest thing driving it, in a sentence?')
    expect(MOVING_ON_LINE).toContain('your own words')
  })

  test('the reason reads as a sentence however many words matched', () => {
    expect(reasonFrom(['cost'])).toBe('you mentioned cost')
    expect(reasonFrom(['cost', 'sales'])).toBe('you mentioned cost and sales')
    expect(reasonFrom(['cost', 'sales', 'margin'])).toBe('you mentioned cost, sales and margin')
    expect(reasonFrom([])).toBe('it fits what you described')
    expect(reasonFrom(null)).toBe('it fits what you described')
    expect(reasonFrom([null, 7])).toBe('it fits what you described')
  })
})

// ── reading the advisor's reply ───────────────────────────────────────────────

describe('reading the reply', () => {
  const S = { pricing_issue: 1 }

  test('plain agreement confirms the proposal', () => {
    ;['yes', 'Yes', 'yep', 'that\'s right', 'correct', 'exactly', 'spot on', 'pretty much']
      .forEach(r => expect(parseReply(r, COST_OF_SALES, 'profit', {}).outcome).toBe('confirmed'))
  })

  test('🔴 their own words outrank a stock yes', () => {
    // "yes, but it's really the discounting" is a CORRECTION. Reading the "yes" and moving on
    // would store an issue the advisor had just talked them out of.
    const out = parseReply('yes, but it\'s really that we keep discounting', COST_OF_SALES, 'profit', S)
    expect(out.outcome).toBe('reframed')
    expect(out.label).toBe(DISCOUNTING)
  })

  test('restating the same issue differently is agreement, not a reframe', () => {
    const out = parseReply('the cost of sales, yes', COST_OF_SALES, 'profit', {})
    expect(out.outcome).toBe('confirmed')
    expect(out.label).toBe(COST_OF_SALES)
  })

  test('restating it with NO agreeing word at all is still agreement', () => {
    // The advisor answers in their own words only — "that's the cost of sales going up" —
    // with nothing the confirm vocabulary would catch. Their words name the proposed label,
    // so it stands, and the words they used are reported as what matched.
    const out = parseReply('the cost of sales going up', COST_OF_SALES, 'profit', {})
    expect(out.outcome).toBe('confirmed')
    expect(out.label).toBe(COST_OF_SALES)
    expect(out.matched).toEqual(expect.arrayContaining(['cost', 'sales']))
  })

  test('a reframe to another authored label is reported with that label', () => {
    const out = parseReply('no, the overheads have grown beyond what revenue supports', COST_OF_SALES, 'profit', {})
    expect(out.outcome).toBe('reframed')
    expect(out.label).toBe(OVERHEADS)
  })

  test('a flat no with nothing offered is a rejection', () => {
    ;['no', 'nope', 'not really', 'that\'s not it', 'wrong', 'no idea']
      .forEach(r => expect(parseReply(r, COST_OF_SALES, 'profit', {}).outcome).toBe('rejected'))
  })

  test('something unreadable is neither agreement nor a label', () => {
    expect(parseReply('hmm', COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply('the weather is poor', COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply('', COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply('   ', COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply(null, COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply(42, COST_OF_SALES, 'profit', {}).outcome).toBe('unmatched')
  })

  test('🔴 with no proposal there is nothing to agree to', () => {
    // Found by this test on 2026-09-14. In a context domain the ranker returns nothing, and
    // "it is really the cost of sales" matched the confirm vocabulary on the word "really" —
    // so the outcome was `confirmed` with a null label: agreement to a question nobody asked.
    expect(parseReply('it is really the cost of sales', null, 'conflict', {}).outcome).toBe('unmatched')
    expect(parseReply('yes', null, 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply('yes', '', 'profit', {}).outcome).toBe('unmatched')
    expect(parseReply('yes', '   ', 'profit', {}).outcome).toBe('unmatched')
    // But a reframe still works with no proposal on the table — that is the driver-question path.
    const out = parseReply('the overheads have grown beyond what revenue supports', null, 'profit', {})
    expect(out.outcome).toBe('reframed')
    expect(out.label).toBe(OVERHEADS)
  })
})

// ── the model tie-break ───────────────────────────────────────────────────────

describe('the model tie-break — boxed, and only on a real tie', () => {
  const CANDIDATES = ['Cost of sales has increased', 'Excessive discounting eroding margin']
  const client = answer => ({
    chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: answer } }] }) } }
  })

  test('it returns the candidate the model numbered', async () => {
    expect(await tiebreakWithModel(client('1'), CANDIDATES, 'costs are up')).toBe(CANDIDATES[0])
    expect(await tiebreakWithModel(client('2'), CANDIDATES, 'costs are up')).toBe(CANDIDATES[1])
    expect(await tiebreakWithModel(client(' 2 '), CANDIDATES, 'costs are up')).toBe(CANDIDATES[1])
  })

  test('🔴 it can only ever return a listed label', async () => {
    // The model writing its own problem is the failure this box exists to prevent.
    expect(await tiebreakWithModel(client('Cost of sales has increased'), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client('The real issue is cash flow'), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client('3'), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client('0'), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client('-1'), CANDIDATES, 'x')).toBeNull()
  })

  test('"none" and every malformed answer resolve to nothing', async () => {
    expect(await tiebreakWithModel(client('none'), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client(''), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(client(null), CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel({ chat: { completions: { create: jest.fn().mockResolvedValue({}) } } }, CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel({ chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [] }) } } }, CANDIDATES, 'x')).toBeNull()
  })

  test('it is not called without a real tie, a client, or the advisor\'s words', async () => {
    const c = client('1')
    expect(await tiebreakWithModel(null, CANDIDATES, 'x')).toBeNull()
    expect(await tiebreakWithModel(c, ['only one'], 'x')).toBeNull()
    expect(await tiebreakWithModel(c, [], 'x')).toBeNull()
    expect(await tiebreakWithModel(c, null, 'x')).toBeNull()
    expect(await tiebreakWithModel(c, CANDIDATES, '')).toBeNull()
    expect(await tiebreakWithModel(c, CANDIDATES, null)).toBeNull()
    expect(c.chat.completions.create).not.toHaveBeenCalled()
  })

  test('the call is boxed: temperature 0, the advisor\'s words fenced, personal false', async () => {
    const c = client('1')
    await tiebreakWithModel(c, CANDIDATES, 'costs are up')
    const [params, options] = c.chat.completions.create.mock.calls[0]
    expect(params.temperature).toBe(0)
    expect(params.max_tokens).toBeLessThanOrEqual(5)
    expect(params.messages[1].content).toContain('<<<')
    expect(params.messages[1].content).toContain('>>>')
    expect(params.messages[0].content).toMatch(/never write a problem of your own/i)
    // The advisor's description of a client is not personal data (Mike's ruling 2026-09-14).
    expect(options).toEqual({ personal: false })
  })

  test('a candidate list carrying rubbish is cleaned before the model sees it', async () => {
    const c = client('1')
    expect(await tiebreakWithModel(c, [null, '', 42], 'x')).toBeNull()
    expect(c.chat.completions.create).not.toHaveBeenCalled()
  })
})

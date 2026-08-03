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

const { classifyDistinctions, findNearMissDistinctions } = require('../../server/advisorEngine')
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
    const { ok, boosts } = await classifyDistinctions('conflict', 'they keep fighting and disputing', effective)
    expect(boosts).toEqual({ 'Force Field Analysis': 5, 'Partner Accountability': 5 })
    expect(ok).toBe(true)
  })

  it('override REPLACES the platform row — boost is the firm value, not summed', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {
      overrides: { 'pd-1': { boost: 12, templates: ['Force Field Analysis'] } }
    })
    mockCreate = matchReply([1]) // the (now firm-overridden) first conflict row
    const { boosts } = await classifyDistinctions('conflict', 'they keep fighting', effective)
    // 12 (firm) — not 5 (platform) and not 17 (both): the platform original is gone.
    expect(boosts).toEqual({ 'Force Field Analysis': 12 })
  })

  it('declined platform row contributes no boost even if the model points at it', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, { declinedIds: ['pd-1'] })
    // After declining pd-1, only pd-2 remains in the conflict domain (index 1).
    // A stale match index 2 (out of range) must be ignored, not throw.
    mockCreate = matchReply([1, 2])
    const { boosts } = await classifyDistinctions('conflict', 'owner dispute brewing', effective)
    expect(boosts).toEqual({ 'Partner Accountability': 5 })
    expect(boosts['Force Field Analysis']).toBeUndefined()
  })

  it('firm-own row is classified and boosts its templates', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {
      ownRows: [{ id: 1, domain: 'conflict', triggers: ['alignment'], description: 'Owners not aligned', templates: ['Lite Strategy'], boost: 8 }]
    })
    mockCreate = matchReply([3]) // pd-1, pd-2, then the firm-own row at index 3
    const { boosts } = await classifyDistinctions('conflict', 'owners are not aligned', effective)
    expect(boosts).toEqual({ 'Lite Strategy': 8 })
  })

  it('only the detected domain is classified', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = matchReply([1]) // within the profit-filtered list, pd-3 is index 1
    const { boosts } = await classifyDistinctions('profit', 'margins are thin', effective)
    expect(boosts).toEqual({ 'Lite Feasibility': 5 })
  })

  it('no boosts for missing domain/text or an empty effective list — and that is NOT a failure', async () => {
    // ok:true throughout: there was no call to fail. A guard clause reporting ok:false
    // would cry fault on the ordinary case of a firm with nothing filed in this domain.
    expect(await classifyDistinctions('', 'text', PLATFORM)).toEqual({ ok: true, boosts: {} })
    expect(await classifyDistinctions('conflict', '', PLATFORM)).toEqual({ ok: true, boosts: {} })
    expect(await classifyDistinctions('conflict', 'text', [])).toEqual({ ok: true, boosts: {} })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // ── The 2026-08-03 P1: a failed call was reported as "nothing matched" ──────────
  // Both of the tests below produce an EMPTY BOOST MAP. The whole point is that the
  // caller can now tell which of the two it is looking at. If these two ever agree on
  // `ok` again, every screen goes back to telling a firm the AI read its distinctions
  // when the call never completed.
  it('a FAILED model call returns ok:false — the empty map is a fault, not a finding', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = jest.fn().mockRejectedValue(new Error('network'))
    const { ok, boosts } = await classifyDistinctions('conflict', 'they keep fighting', effective)
    expect(ok).toBe(false)
    // Still fail-safe: a live session degrades rather than dying.
    expect(boosts).toEqual({})
  })

  it('a SUCCESSFUL call that matched nothing returns ok:true with the same empty map', async () => {
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = matchReply([])
    const { ok, boosts } = await classifyDistinctions('conflict', 'they keep fighting', effective)
    expect(ok).toBe(true)
    expect(boosts).toEqual({})
  })

  it('malformed model output is a FAILURE, not a no-match — unparseable JSON', async () => {
    // A reply the parser cannot read means the AI's answer never arrived either. It
    // lands in the same catch as a network fault and must report the same way.
    const effective = resolveEffectiveDistinctions(PLATFORM, {})
    mockCreate = jest.fn().mockResolvedValue({ choices: [], usage: null })
    const { ok } = await classifyDistinctions('conflict', 'they keep fighting', effective)
    expect(ok).toBe(false)
  })
})

describe('findNearMissDistinctions (cross-domain bridge)', () => {
  // Effective list with the firm's own rows in OTHER domains than the one detected.
  const effective = [
    { id: 'pd-1', domain: 'conflict', description: 'Active conflict', triggers: ['fight'], templates: ['T'], boost: 5, source: 'platform' },
    { id: 1, domain: 'systems', description: 'Lack of financial controls', triggers: ['no approval'], templates: ['Financial Systems Review'], boost: 10, source: 'firm-own' },
    { id: 'pd-2', domain: 'profit', description: 'Thin margins (firm-edited)', triggers: ['margins'], templates: ['X'], boost: 9, source: 'firm-override' }
  ]

  it('returns a firm distinction from another domain that matches the session', async () => {
    mockCreate = matchReply([1]) // first candidate (the systems firm-own row) matches
    const { ok, rows } = await findNearMissDistinctions('data-systems', 'they have no financial controls', effective)
    expect(rows).toEqual([{ id: 1, description: 'Lack of financial controls', domain: 'systems', source: 'firm-own' }])
    expect(ok).toBe(true)
  })

  it('includes firm-edited (override) rows from other domains, excludes platform rows', async () => {
    // Candidate set = the two firm rows (systems firm-own + profit firm-override); the
    // platform conflict row is never a candidate. Match the 2nd candidate.
    mockCreate = matchReply([2])
    const { rows } = await findNearMissDistinctions('data-systems', 'margins are thin', effective)
    expect(rows).toEqual([{ id: 'pd-2', description: 'Thin margins (firm-edited)', domain: 'profit', source: 'firm-override' }])
  })

  it('no rows when the firm has no distinctions outside the detected domain (no AI call, no fault)', async () => {
    const onlyHere = [
      { id: 'pd-1', domain: 'conflict', description: 'platform row', source: 'platform' },
      { id: 1, domain: 'data-systems', description: 'firm thing', templates: ['T'], boost: 5, source: 'firm-own' }
    ]
    expect(await findNearMissDistinctions('data-systems', 'anything', onlyHere)).toEqual({ ok: true, rows: [] })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('no rows for missing domain or text', async () => {
    expect(await findNearMissDistinctions('', 'text', effective)).toEqual({ ok: true, rows: [] })
    expect(await findNearMissDistinctions('data-systems', '', effective)).toEqual({ ok: true, rows: [] })
  })

  // The bridge fails the quietest of the three callers — on failure its whole section
  // simply does not render, so there is not even a wrong sentence to notice.
  it('a FAILED call returns ok:false, distinct from "no distinction is filed elsewhere"', async () => {
    mockCreate = jest.fn().mockRejectedValue(new Error('network'))
    const failed = await findNearMissDistinctions('data-systems', 'they have no financial controls', effective)
    expect(failed).toEqual({ ok: false, rows: [] })

    mockCreate = matchReply([])
    const matchedNone = await findNearMissDistinctions('data-systems', 'they have no financial controls', effective)
    expect(matchedNone).toEqual({ ok: true, rows: [] })
  })
})

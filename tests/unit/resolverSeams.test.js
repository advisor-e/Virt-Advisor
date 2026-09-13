'use strict'

/**
 * The three resolver seams item 4.97 adds, and the stop-word fix that came with them
 * (tasks T013/T014). Each is tested for what UAT cannot see: a wrong word entering the
 * anonymous pool, a boost firing on a word nobody meant, and a pooled adjustment moving a
 * template the advisor's own words had already reached.
 *
 * - resolveIndustryWord  — the ONE matcher the scorer and the pool both use
 * - advisorEvidenceKind  — which of the advisor's own evidence reached a template
 * - options.profileMap   — the mentor's authored profiles, scored instead of the file's
 */

const {
  resolveTemplates,
  resolveTemplatesWithOutlier,
  resolveIndustryWord,
  advisorEvidenceKind,
  ADVISOR_EVIDENCE
} = require('../../server/utils/templateResolver')

// ── resolveIndustryWord ───────────────────────────────────────────────────────

describe('resolveIndustryWord — the pool may hold only a word the engine recognises', () => {
  const VOCAB = ['cafe', 'plumber', 'scaffolding', 'hospitality', 'dairy']

  test('resolves a plural to the vocabulary word the scorer matches', () => {
    expect(resolveIndustryWord('cafes', VOCAB)).toBe('cafe')
    expect(resolveIndustryWord('Cafe', VOCAB)).toBe('cafe')
    expect(resolveIndustryWord('plumbers', VOCAB)).toBe('plumber')
  })

  test('returns the VOCABULARY word, never the advisor typed form', () => {
    // The row must carry a word the guard's vocabulary check will accept later.
    expect(resolveIndustryWord('CAFES', VOCAB)).toBe('cafe')
  })

  test('reads past commercial noise to the real industry word', () => {
    expect(resolveIndustryWord('Vanoss scaffolding business', VOCAB)).toBe('scaffolding')
    expect(resolveIndustryWord('a small cafe, family owned', VOCAB)).toBe('cafe')
  })

  test('a stop word or a generic trading word resolves to nothing', () => {
    // The 2026-07-14 defect in the other direction: "business" must never be an industry.
    expect(resolveIndustryWord('business', VOCAB)).toBeNull()
    expect(resolveIndustryWord('trading company limited', VOCAB)).toBeNull()
    expect(resolveIndustryWord('the group', VOCAB)).toBeNull()
  })

  test('nothing in the vocabulary, nothing typed, or a short word resolves to nothing', () => {
    expect(resolveIndustryWord('zzzz', VOCAB)).toBeNull()
    expect(resolveIndustryWord('cafe', [])).toBeNull()
    expect(resolveIndustryWord('', VOCAB)).toBeNull()
    expect(resolveIndustryWord('   ', VOCAB)).toBeNull()
    expect(resolveIndustryWord(null, VOCAB)).toBeNull()
    expect(resolveIndustryWord(undefined, VOCAB)).toBeNull()
    expect(resolveIndustryWord(42, VOCAB)).toBeNull()
    expect(resolveIndustryWord('cafe', null)).toBeNull()
    // Three letters is below the matcher's floor, so it cannot reach a vocabulary word.
    expect(resolveIndustryWord('bar', ['bar'])).toBeNull()
  })

  test('a stem shorter than four characters does not match by prefix', () => {
    // The scorer's own rule: a prefix match needs four characters on BOTH sides.
    expect(resolveIndustryWord('dairyfarm', ['dairy'])).toBe('dairy')
    expect(resolveIndustryWord('cafeteria', ['cafe'])).toBe('cafe')
  })
})

// ── advisorEvidenceKind ───────────────────────────────────────────────────────

describe('advisorEvidenceKind — what "the advisor\'s own words" means, kind by kind', () => {
  test('names each kind the advisor\'s words can produce', () => {
    expect(advisorEvidenceKind(['distinction:+5'])).toBe('distinction')
    expect(advisorEvidenceKind(['distinction:@rf-industry+3'])).toBe('distinction')
    expect(advisorEvidenceKind(['primary_issue:strong_match'])).toBe('primary_issue')
    expect(advisorEvidenceKind(['primary_issue:partial_match'])).toBe('primary_issue')
    expect(advisorEvidenceKind(['industry:title_match'])).toBe('industry')
    expect(advisorEvidenceKind(['industry:tag_match'])).toBe('industry')
    expect(advisorEvidenceKind(['semantic:40.0'])).toBe('signal')
    expect(advisorEvidenceKind(['purpose_fallback:3.0'])).toBe('signal')
  })

  test('the engine\'s own priors are NOT the advisor\'s words', () => {
    // These reach a template whatever the advisor said, so pooled evidence may move them.
    expect(advisorEvidenceKind(['domain:primary_subsection'])).toBeNull()
    expect(advisorEvidenceKind(['domain:secondary_subsection'])).toBeNull()
    expect(advisorEvidenceKind(['engagement:primary'])).toBeNull()
    expect(advisorEvidenceKind(['tree_hint:+3'])).toBeNull()
    expect(advisorEvidenceKind(['growth:exact'])).toBeNull()
    expect(advisorEvidenceKind(['advisor:confidence_match'])).toBeNull()
    expect(advisorEvidenceKind(['tag:profit'])).toBeNull()
    expect(advisorEvidenceKind(['purpose:profit'])).toBeNull()
  })

  test('an industry PENALTY is not evidence that the advisor reached the template', () => {
    // industry:wrong_domain_model and industry:mismatch_specific_model are −15 penalties.
    // They share the "industry:" stem, so a naive prefix test would read them as a match.
    expect(advisorEvidenceKind(['industry:wrong_domain_model'])).toBeNull()
    expect(advisorEvidenceKind(['industry:mismatch_specific_model'])).toBeNull()
  })

  test('reports the first kind in the declared order when several matched', () => {
    expect(advisorEvidenceKind(['semantic:12.0', 'distinction:+5'])).toBe('distinction')
    expect(advisorEvidenceKind(['industry:tag_match', 'primary_issue:strong_match'])).toBe('primary_issue')
  })

  test('handles an empty, missing or malformed reason list', () => {
    expect(advisorEvidenceKind([])).toBeNull()
    expect(advisorEvidenceKind(null)).toBeNull()
    expect(advisorEvidenceKind(undefined)).toBeNull()
    expect(advisorEvidenceKind('distinction:+5')).toBeNull()
    expect(advisorEvidenceKind([null, 7, {}])).toBeNull()
  })

  test('every declared kind is reachable and the list has no duplicate prefix', () => {
    const prefixes = ADVISOR_EVIDENCE.map(e => e.prefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    ADVISOR_EVIDENCE.forEach((e) => {
      expect(advisorEvidenceKind([e.prefix + 'x'])).toBe(e.kind)
    })
  })
})

// ── options.profileMap ────────────────────────────────────────────────────────

describe('options.profileMap — the mentor\'s authored profiles reach the scorer', () => {
  const TEMPLATES = [
    { title: 'Break-Even', page: 'p-be', menuSection: 'do-the-job', subSection: 'General Tools', tags: [], purpose: '' },
    { title: 'Stock Policies', page: 'p-sp', menuSection: 'do-the-job', subSection: 'General Tools', tags: [], purpose: '' }
  ]
  const CASE = {
    domain: 'profit',
    primaryIssue: null,
    industry: null,
    complexityCeiling: null,
    problemSignals: { cash_flow_gap: 2 },
    client: {},
    advisor: {},
    constraints: {},
    diagnosticSignals: {},
    solutionCategories: []
  }
  const STRATEGY = { engagementType: 'advice', templateBudget: 3 }
  const scoreOf = (res, title) => {
    const row = res.scoringLog.find(r => r.title === title)
    return row ? row.score : null
  }

  test('an authored profile is scored instead of the compiled file', () => {
    const authored = new Map([['p-be', { cash_flow_gap: 10 }]])
    const withAuthored = resolveTemplates(CASE, STRATEGY, TEMPLATES, { profileMap: authored })
    const beRow = withAuthored.scoringLog.find(r => r.title === 'Break-Even')
    expect(beRow.matchReasons.some(r => r.indexOf('semantic:') === 0)).toBe(true)
    // The other template is absent from the authored map, so it scores no semantic points.
    const spRow = withAuthored.scoringLog.find(r => r.title === 'Stock Policies')
    expect(spRow && spRow.matchReasons.some(r => r.indexOf('semantic:') === 0)).toBeFalsy()
    expect(scoreOf(withAuthored, 'Break-Even')).toBeGreaterThan(scoreOf(withAuthored, 'Stock Policies') || 0)
  })

  test('a heavier authored weight scores higher than a lighter one', () => {
    const light = resolveTemplates(CASE, STRATEGY, TEMPLATES, { profileMap: new Map([['p-be', { cash_flow_gap: 1 }]]) })
    const heavy = resolveTemplates(CASE, STRATEGY, TEMPLATES, { profileMap: new Map([['p-be', { cash_flow_gap: 10 }]]) })
    expect(scoreOf(heavy, 'Break-Even')).toBeGreaterThan(scoreOf(light, 'Break-Even'))
  })

  test('an authored EMPTY profile retires a template from signal matching', () => {
    // How a mentor says "this tool answers none of these problems" (the screen's own words).
    const res = resolveTemplates(CASE, STRATEGY, TEMPLATES, { profileMap: new Map([['p-be', {}]]) })
    const beRow = res.scoringLog.find(r => r.title === 'Break-Even')
    expect(beRow.matchReasons.some(r => r.indexOf('semantic:') === 0)).toBe(false)
  })

  test('no profileMap, or a malformed one, falls back to the compiled file', () => {
    // The benches, the labs and any caller not yet updated must behave exactly as before.
    const none = resolveTemplates(CASE, STRATEGY, TEMPLATES, {})
    const bad = resolveTemplates(CASE, STRATEGY, TEMPLATES, { profileMap: { 'p-be': { cash_flow_gap: 10 } } })
    expect(bad.scoringLog.map(r => r.score)).toEqual(none.scoringLog.map(r => r.score))
  })

  test('both passes of the two-pass resolver score against the same profiles', () => {
    // A stretch option scored on different profiles from the in-range list would recommend
    // a tool for a reason the trace cannot explain.
    const authored = new Map([['p-be', { cash_flow_gap: 10 }]])
    const out = resolveTemplatesWithOutlier(CASE, STRATEGY, TEMPLATES, { profileMap: authored })
    const inPrimary = out.primary.scoringLog.find(r => r.title === 'Break-Even')
    const inRange = out.withinRange.scoringLog.find(r => r.title === 'Break-Even')
    expect(inPrimary.score).toBe(inRange.score)
    expect(inPrimary.matchReasons.some(r => r.indexOf('semantic:') === 0)).toBe(true)
  })
})

// ── the primary-issue keyword fix ─────────────────────────────────────────────

describe('primary-issue keywords — the stop-word filter and the title match', () => {
  const CASE = primaryIssue => ({
    domain: 'profit',
    primaryIssue,
    industry: null,
    complexityCeiling: null,
    problemSignals: {},
    client: {},
    advisor: {},
    constraints: {},
    diagnosticSignals: {},
    solutionCategories: []
  })
  const STRATEGY = { engagementType: 'advice', templateBudget: 3 }
  const reasonsFor = (res, title) => {
    const row = res.scoringLog.find(r => r.title === title)
    return row ? row.matchReasons : []
  }

  test('a generic word in an authored label does not boost every template carrying it', () => {
    // "Sales Revenue — low volume, revenue is the constraint" is Mike's own label. Without
    // the filter, "revenue" boosts every template with it in the tags, which is most of a
    // profit shelf. The engine's own INDUSTRY_STOPWORDS holds "sales".
    const templates = [
      { title: 'Unrelated Tool', page: 'p-u', menuSection: 'do-the-job', subSection: 'General Tools', tags: ['sales'], purpose: 'sales' }
    ]
    const res = resolveTemplates(CASE('Sales Revenue — low volume, revenue is the constraint'), STRATEGY, templates, {})
    expect(reasonsFor(res, 'Unrelated Tool').some(r => r.indexOf('primary_issue:') === 0)).toBe(false)
  })

  test('the TITLE is searched, so a label naming a tool reaches it', () => {
    const templates = [
      { title: 'Asset Utilisation Model', page: 'p-a', menuSection: 'do-the-job', subSection: 'General Tools', tags: [], purpose: '' }
    ]
    const res = resolveTemplates(CASE('Asset utilisation below viability threshold'), STRATEGY, templates, {})
    expect(reasonsFor(res, 'Asset Utilisation Model').some(r => r.indexOf('primary_issue:') === 0)).toBe(true)
  })

  test('no primary issue means no primary-issue reason anywhere', () => {
    const templates = [
      { title: 'Asset Utilisation Model', page: 'p-a', menuSection: 'do-the-job', subSection: 'General Tools', tags: [], purpose: '' }
    ]
    const res = resolveTemplates(CASE(null), STRATEGY, templates, {})
    expect(reasonsFor(res, 'Asset Utilisation Model').some(r => r.indexOf('primary_issue:') === 0)).toBe(false)
  })
})

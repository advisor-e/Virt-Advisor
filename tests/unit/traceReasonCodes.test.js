'use strict'

const fs = require('fs')
const { matchReason, REASON_RULES } = require('../../utils/traceReasonCodes')
const EN = require('../../locales/en.json')

/**
 * THE "WHY" COLUMN'S PLAIN ENGLISH — every code the engine can write.
 *
 * Until 2026-08-04 the adviser's panel translated 7 of the engine's 26 reason
 * codes and the firm manager's saved case translated none, so both screens showed
 * engine internals: `primary_issue:strong_match, semantic:4.2`.
 *
 * The defect underneath was not the missing phrases. It was that the mapping lived
 * inside a component, so a second screen showing the same table had to grow its own
 * — and grew an empty one. These tests hold the table to being complete AND to being
 * the only copy.
 *
 * ⚠ THE ENGINE IS THE SOURCE OF THE LIST. `templateResolver.js` is read here for
 * real: a code added to the engine with no phrase here fails this file rather than
 * appearing raw on an adviser's screen weeks later. That is the check that would
 * have caught the original nineteen.
 *
 * Wording ruled by Mike 2026-08-04 — design/WORDING-TRACE-REASONS.md.
 */

/** Every code shape the engine emits, with a realistic example of each. */
const ENGINE_CODES = [
  ['domain:primary_subsection', 'reasonPrimary'],
  ['domain:secondary_subsection', 'reasonSecondary'],
  ['primary_issue:strong_match', 'reasonIssueStrong'],
  ['primary_issue:partial_match', 'reasonIssuePartial'],
  ['industry:title_match', 'reasonIndustryTitle'],
  ['industry:tag_match', 'reasonIndustryTag'],
  ['industry:wrong_domain_model', 'reasonIndustryWrongDomain'],
  ['industry:mismatch_specific_model', 'reasonIndustryMismatch'],
  ['distinction:+5', 'reasonDistinction'],
  ['distinction:@rf-industry+5', 'reasonDistinctionIndustry'],
  ['distinction:@rf-general+5', 'reasonDistinctionGeneral'],
  ['tree_hint:+3', 'reasonTreeHint'],
  ['tag:Cash Flow', 'reasonTag'],
  ['purpose:Cash Flow', 'reasonPurpose'],
  ['semantic:4.2', 'reasonSemantic'],
  ['purpose_fallback:3.0', 'reasonPurposeFallback'],
  ['penalty:modeling_declined', 'reasonPenaltyModeling'],
  ['penalty:reports_already_in_use', 'reasonPenaltyReports'],
  ['engagement:primary', 'reasonEngagementPrimary'],
  ['engagement:secondary', 'reasonEngagementSecondary'],
  ['advisor:confidence_match', 'reasonConfidenceMatch'],
  ['advisor:confidence_mismatch', 'reasonConfidenceMismatch'],
  ['advisor:confidence_boost', 'reasonConfidenceBoost'],
  ['growth:exact', 'reasonGrowth'],
  ['history:already_delivered', 'reasonDelivered'],
  ['history:went_less_well', 'reasonWentLess']
]

describe('every reason code the engine writes has English', () => {
  test.each(ENGINE_CODES)('%s', (code, expectedKey) => {
    const hit = matchReason(code)
    expect(hit).not.toBeNull()
    expect(hit.key).toBe('decisionTrace.' + expectedKey)
    expect(typeof EN.decisionTrace[expectedKey]).toBe('string')
  })

  test('all 26 of them — the count is the point, not the sample', () => {
    expect(ENGINE_CODES).toHaveLength(26)
    expect(ENGINE_CODES.every(([code]) => matchReason(code) !== null)).toBe(true)
  })
})

describe('the engine cannot add a code without English for it', () => {
  test('every reasons.push in templateResolver.js is covered here', () => {
    // The check that would have caught the original nineteen. Codes are built by
    // concatenation ('distinction:' + boost), so the prefix is what can be read out
    // of the source; each one must be matched by at least one rule.
    const src = fs.readFileSync('server/utils/templateResolver.js', 'utf8')
    const pattern = /reasons\.push\(\s*'([^']+)'/g
    const prefixes = new Set()
    let m
    while ((m = pattern.exec(src))) { prefixes.add(m[1]) }

    // Every literal or literal-prefix found in the engine must be recognised. A
    // partial prefix gets a realistic tail — the engine writes `'distinction:+' +
    // boost`, so the string in its source is `distinction:+`, and `'distinction:' +
    // group + '+' + boost` for the group form.
    const SAMPLES = {
      'distinction:+': 'distinction:+5',
      'distinction:': 'distinction:@rf-industry+5',
      'tree_hint:+': 'tree_hint:+3',
      'tag:': 'tag:Cash Flow',
      'purpose:': 'purpose:Cash Flow',
      'semantic:': 'semantic:4.2',
      'purpose_fallback:': 'purpose_fallback:3.0'
    }
    const unknown = []
    prefixes.forEach((prefix) => {
      const complete = /[:+]$/.test(prefix)
      // A new partial prefix with no sample is itself a failure: nobody can say the
      // table covers a code shape this test cannot construct.
      const code = complete ? SAMPLES[prefix] : prefix
      if (!code || !matchReason(code)) { unknown.push(prefix) }
    })

    expect(unknown).toEqual([])
  })

  test('the engine emits at least the 24 push sites this was written against', () => {
    // A guard on the guard: if the regex above ever stops finding pushes, the test
    // passes vacuously. It found 24 when this was written.
    const src = fs.readFileSync('server/utils/templateResolver.js', 'utf8')
    expect((src.match(/reasons\.push\(/g) || []).length).toBeGreaterThanOrEqual(24)
  })
})

describe('the codes that carry a value', () => {
  test('a distinction hands its points to the phrase', () => {
    expect(matchReason('distinction:+5').params).toEqual({ points: '5' })
    expect(matchReason('distinction:+7.5').params).toEqual({ points: '7.5' })
  })

  test('a group distinction is NOT read as a plain one', () => {
    // Ordering: the plain rule would never match this, but a looser one written
    // later might. The industry/general split is a real difference to a firm.
    expect(matchReason('distinction:@rf-industry+5').key).toBe('decisionTrace.reasonDistinctionIndustry')
    expect(matchReason('distinction:@rf-general+4').params).toEqual({ points: '4' })
  })

  test('the logic tree hands over its points', () => {
    expect(matchReason('tree_hint:+3').params).toEqual({ points: '3' })
  })

  test('a tag and a purpose hand over the category, which is the whole change', () => {
    // Ruling 4: 'matches the area' said one word for two things — the panel already
    // uses "area" for the advisory domain.
    expect(matchReason('tag:Cash Flow').params).toEqual({ category: 'Cash Flow' })
    expect(matchReason('purpose:Pricing').params).toEqual({ category: 'Pricing' })
  })

  test('semantic and purpose_fallback drop their score — ruling 2', () => {
    // Numbers stay on the firm's own levers only. The code carries 4.2; the phrase
    // must not.
    expect(matchReason('semantic:4.2').params).toEqual({})
    expect(matchReason('purpose_fallback:3.0').params).toEqual({})
    expect(EN.decisionTrace.reasonSemantic).not.toMatch(/\{/)
  })

  test('the two engagement codes no longer share one sentence — ruling 4', () => {
    expect(matchReason('engagement:primary').key).not.toBe(matchReason('engagement:secondary').key)
    expect(EN.decisionTrace.reasonEngagementPrimary).not.toBe(EN.decisionTrace.reasonEngagementSecondary)
  })
})

describe('an unknown code survives', () => {
  test('a code with no rule returns null, so the caller can show it raw', () => {
    // Deliberate: the engine grows, and a reason that silently vanished would take
    // part of the explanation with it.
    expect(matchReason('something:brand_new')).toBeNull()
  })

  test('a non-string is not treated as a code', () => {
    expect(matchReason(null)).toBeNull()
    expect(matchReason(42)).toBeNull()
    expect(matchReason(undefined)).toBeNull()
  })
})

describe('the approved wording, as ruled', () => {
  test('"held back" is the word on all seven penalties — ruling 5', () => {
    const HELD_BACK = [
      'reasonDelivered', 'reasonWentLess', 'reasonIndustryMismatch',
      'reasonIndustryWrongDomain', 'reasonPenaltyModeling', 'reasonPenaltyReports',
      'reasonConfidenceMismatch'
    ]
    HELD_BACK.forEach((key) => {
      expect(EN.decisionTrace[key]).toContain('held back')
    })
    expect(HELD_BACK).toHaveLength(7)
  })

  test('the second person survives where Mike ruled it — ruling 3', () => {
    expect(EN.decisionTrace.reasonPenaltyModeling).toBe('you ruled out revenue modelling — held back')
    expect(EN.decisionTrace.reasonConfidenceBoost).toBe('you reported strong confidence here')
    expect(EN.decisionTrace.reasonTreeHint).toMatch(/^your logic tree/)
  })

  test('the two reworded live phrases are the approved wording — ruling 4', () => {
    expect(EN.decisionTrace.reasonTag).toBe('matches “{category}”')
    expect(EN.decisionTrace.reasonEngagementPrimary).toBe('fits this engagement type')
    expect(EN.decisionTrace.reasonEngagementSecondary).toBe('a secondary fit for this engagement type')
  })

  test('the four phrases that were NOT to change are untouched', () => {
    expect(EN.decisionTrace.reasonPrimary).toBe('core to this area')
    expect(EN.decisionTrace.reasonDistinction).toBe('firm distinction +{points}')
    expect(EN.decisionTrace.reasonDelivered).toBe('already delivered to this client — held back')
    expect(EN.decisionTrace.reasonWentLess).toBe('delivered before and went less well — held back')
  })

  test('the retired key is gone, not left behind to be re-used by accident', () => {
    // reasonEngagement covered both codes with one sentence until ruling 4.
    expect(EN.decisionTrace.reasonEngagement).toBeUndefined()
  })

  test('every rule points at a key that exists', () => {
    const missing = REASON_RULES.filter(r => typeof EN.decisionTrace[r.key] !== 'string')
    expect(missing.map(r => r.key)).toEqual([])
  })
})

describe('one mapping, not two', () => {
  test('neither component carries its own copy any more', () => {
    // The actual defect: FirmManagerHub had grown its own (empty) version of this.
    const hub = fs.readFileSync('components/FirmManagerHub.vue', 'utf8')
    const va = fs.readFileSync('components/VirtualAdvisor.vue', 'utf8')

    // The Hub's own method is gone and its template calls the shared name.
    expect(hub).not.toMatch(/humanizeTraceReasons\s*\(reasons\)/)
    expect(hub).toContain('humanizeReasons(t.matchReasons)')

    // Neither file maps a code to a phrase itself.
    expect(va).not.toContain("r === 'history:already_delivered'")
    expect(va).not.toContain("r.startsWith('tag:')")

    // Both reach the mixin.
    expect(va).toContain('traceReasonMixin')
    expect(hub).toContain('traceReasonMixin')
  })
})

'use strict'

/**
 * THE BUTTON THAT DELIVERS — the arithmetic and the refusals.
 *
 * Mike, 2026-08-03: "All I want is that if my adviser uses that phrase, I want
 * them to get their template."
 *
 * WHY IT CREATES A DISTINCTION RATHER THAN EDITING THE ONE THAT MATCHED, measured
 * against the live engine rather than reasoned: a boost is added to EVERY template
 * a distinction names. The distinction that matched Mike's phrase already named
 * the winning template, so strengthening it lifted both together — at the maximum
 * strength of 20 the winner reached 25 and the wanted template 21, still third.
 * A distinction naming ONLY the wanted template lifts only that one, which is what
 * makes the required strength computable and the promise keepable.
 *
 * What this file cannot prove is that the AI will MATCH the new distinction to
 * those words. That is a judgement, so the route re-runs the phrase and checks —
 * see logicLabAccept.routes.test.js.
 */

const { planDeliver, requiredBoost, buildLogEntry, TIER_DELIVER, MAX_BOOST } =
  require('../../server/utils/logicLabAccept')

const LIBRARY = ['Governance Introduction', 'Board Member Conduct', '1 pg Bizz Case']
const PHRASE = 'two business owners who struggle to make effective decisions and have no clear goals'

describe('requiredBoost — how strong it has to be', () => {
  it('clears the winner rather than drawing level with it', () => {
    // Mike's real case: the wanted template scored 1, the winner 10.
    expect(requiredBoost(10, 1)).toBe(10)
  })

  it('a draw is not a win — ties are settled by scoring the firm cannot see', () => {
    expect(requiredBoost(10, 5)).toBe(6)
  })

  it('still asks for the minimum when the template is already ahead', () => {
    expect(requiredBoost(4, 9)).toBe(1)
  })

  it('never exceeds what the engine accepts', () => {
    expect(requiredBoost(500, 0)).toBe(MAX_BOOST)
  })

  it('rounds a fractional gap UP, so it can never land one tenth short', () => {
    expect(requiredBoost(10.4, 5)).toBe(7)
  })
})

describe('planDeliver — the distinction that delivers', () => {
  it('files the firm manager’s own words, pointing at their template only', () => {
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 10
    })

    expect(out.ok).toBe(true)
    expect(out.plan.tier).toBe(TIER_DELIVER)
    expect(out.plan.mode).toBe('create')
    expect(out.plan.domain).toBe('strategy')
    // Nothing is authored: the description and the trigger ARE what was typed.
    expect(out.plan.description).toBe(PHRASE)
    expect(out.plan.triggers).toEqual([PHRASE])
    expect(out.plan.boost).toBe(10)
  })

  it('files the description the manager APPROVED, keeping their sentence as the trigger', () => {
    // 2026-08-03, second defect: the raw typed sentence went in as the row's
    // description and read as chat beside hand-authored rows. The dialog now
    // lets the manager reword it; the reworded text is the row, the original
    // sentence stays the trigger because it is how advisors actually speak.
    const out = planDeliver({
      text: PHRASE,
      description: 'Owners cannot make decisions together and have no defined goals',
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 10
    })
    expect(out.ok).toBe(true)
    expect(out.plan.description).toBe('Owners cannot make decisions together and have no defined goals')
    expect(out.plan.triggers).toEqual([PHRASE])
  })

  it('falls back to the typed sentence when no description arrives', () => {
    const out = planDeliver({
      text: PHRASE,
      description: '   ',
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 10
    })
    expect(out.plan.description).toBe(PHRASE)
  })

  it('dedupes against the APPROVED wording, so a reworded second press updates its own row', () => {
    const existing = [{ id: 9, domain: 'strategy', description: 'Owners cannot agree', templates: [], boost: 5 }]
    const out = planDeliver({
      text: PHRASE,
      description: 'Owners cannot agree',
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: existing,
      boost: 8
    })
    expect(out.plan.mode).toBe('update')
    expect(out.plan.id).toBe(9)
  })

  it('names ONE template — a second would spread the boost and re-create the bug', () => {
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 10
    })
    expect(out.plan.templates).toEqual(['Governance Introduction'])
  })

  it('UPDATES its own earlier row rather than littering a second copy', () => {
    // Pressing the button twice for the same phrase must not leave two rows.
    const existing = [{ id: 4, domain: 'strategy', description: PHRASE, templates: ['Board Member Conduct'], boost: 5 }]
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: existing,
      boost: 12
    })
    expect(out.plan.mode).toBe('update')
    expect(out.plan.id).toBe(4)
    expect(out.plan.templatesBefore).toEqual(['Board Member Conduct'])
    expect(out.plan.templatesAfter).toEqual(['Governance Introduction'])
  })

  it('matches its earlier row regardless of case or stray spacing', () => {
    const existing = [{ id: 4, domain: 'strategy', description: '  ' + PHRASE.toUpperCase() + ' ', templates: [], boost: 5 }]
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: existing,
      boost: 8
    })
    expect(out.plan.mode).toBe('update')
  })

  it('treats the same wording in a DIFFERENT area as a different row', () => {
    const existing = [{ id: 4, domain: 'conflict', description: PHRASE, templates: [], boost: 5 }]
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: existing,
      boost: 8
    })
    expect(out.plan.mode).toBe('create')
  })

  it('REFUSES a template the firm’s library does not have', () => {
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Ghost Template',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 5
    })
    expect(out.code).toBe('TEMPLATE_NOT_IN_LIBRARY')
  })

  it('REFUSES when no area was recognised — there is nowhere the engine would read it', () => {
    const out = planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: '',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: 5
    })
    expect(out.code).toBe('NO_DOMAIN')
  })

  it('REFUSES an empty phrase or a missing template', () => {
    expect(planDeliver({ text: '   ', templateTitle: 'Governance Introduction', domain: 'strategy', libraryTitles: LIBRARY, boost: 5 }).code)
      .toBe('INVALID_BODY')
    expect(planDeliver({ text: PHRASE, templateTitle: '', domain: 'strategy', libraryTitles: LIBRARY, boost: 5 }).code)
      .toBe('INVALID_TEMPLATE')
  })

  it('refuses an entirely empty call rather than throwing', () => {
    expect(planDeliver().ok).toBe(false)
    expect(planDeliver({}).code).toBe('INVALID_BODY')
  })

  it('clamps a boost handed to it out of range', () => {
    const mk = b => planDeliver({
      text: PHRASE,
      templateTitle: 'Governance Introduction',
      domain: 'strategy',
      libraryTitles: LIBRARY,
      existingRows: [],
      boost: b
    }).plan.boost
    expect(mk(0)).toBe(1)
    expect(mk(999)).toBe(MAX_BOOST)
  })
})

describe('buildLogEntry — the record of an accepted idea', () => {
  const plan = planDeliver({
    text: PHRASE,
    templateTitle: 'Governance Introduction',
    domain: 'strategy',
    libraryTitles: LIBRARY,
    existingRows: [],
    boost: 10
  }).plan

  it('records what was tried, what the engine did, and what changed', () => {
    const entry = buildLogEntry({
      plan,
      by: 'mgr@testfirm.com',
      at: '2026-08-03T10:00:00.000Z',
      context: {
        sentence: PHRASE,
        problem: 'template',
        domain: 'strategy',
        gap: 9,
        tablesOpened: ['Systems Thinking'],
        distinctionsMatched: ['No defined objectives — no communicated direction']
      }
    })

    expect(entry.tier).toBe(TIER_DELIVER)
    expect(entry.sentence).toBe(PHRASE)
    expect(entry.expectedTemplate).toBe('Governance Introduction')
    expect(entry.gap).toBe(9)
    expect(entry.templatesAfter).toEqual(['Governance Introduction'])
    expect(entry.by).toBe('mgr@testfirm.com')
  })

  it('bounds the free text it is handed, because the browser supplies it', () => {
    const entry = buildLogEntry({
      plan,
      by: 'a@b.c',
      at: 'now',
      context: { sentence: 'x'.repeat(9000), tablesOpened: new Array(200).fill('t'), distinctionsMatched: 'nope' }
    })
    expect(entry.sentence.length).toBe(2000)
    expect(entry.tablesOpened.length).toBe(25)
    expect(entry.distinctionsMatched).toEqual([])
  })

  it('builds an entry from nothing at all', () => {
    const entry = buildLogEntry()
    expect(entry.tier).toBe(TIER_DELIVER)
    expect(entry.gap).toBeNull()
    expect(entry.sentence).toBe('')
  })

  it('keeps a gap of zero, and does not turn it into null', () => {
    expect(buildLogEntry({ plan, context: { gap: 0 } }).gap).toBe(0)
    expect(buildLogEntry({ plan, context: { gap: 'seven' } }).gap).toBeNull()
  })
})

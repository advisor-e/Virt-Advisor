'use strict'

/**
 * Item 7.7 — a calculation model offered as if it were a template.
 *
 * WHAT THESE TESTS EARN THEIR PLACE FOR (Mike's ruling, 2026-08-24). UAT cannot see this
 * one at all. A tester reads "Best match — Wages/Salary Review", which is a real thing
 * with a real description, and nothing on the screen says it is a calculator rather than
 * a document. They find out by going to Advisor-e and not finding it — which is exactly
 * what would happen in front of a client. Every case below is the difference between a
 * name that exists in the library and one that does not, which is a fact about data, not
 * a matter of wording.
 *
 * 🔴 THE PAIR THAT MATTERS MOST: a REAL template under a template heading must pass, and
 * a model under the same heading must fail. If those ever read alike the guard either
 * rewrites good answers or lets the fault through, and both are worse than no guard.
 *
 * The names below are read from the shipped catalogues, never typed — a typed name is how
 * a test goes on passing after the thing it names has been renamed.
 */

const check = require('../../server/utils/templateHeadingCheck')
const { loadReportModels } = require('../../server/utils/reportModels')
const templates = require('../../data/templates.json')

const MODELS = loadReportModels().models
const TEMPLATE_TITLES = Object.values(templates).map(t => t && t.title).filter(Boolean)
const TITLE_SET = new Set(TEMPLATE_TITLES.map(t => t.toLowerCase().trim()))
const MODEL_NAMES = new Set(MODELS.map(m => String(m.name).toLowerCase().trim()))

// A model whose name is NOT also a template title — the case this guard exists for.
// Two models ARE template titles (Working Capital Cycle, Quick Position) and a name can
// never say which of those was meant; they belong to item 4.33's route-proximity test in
// videoInjector, not here, so picking one as the fixture would be testing the wrong thing.
const MODEL = MODELS.find(m => m.name && m.route && !TITLE_SET.has(m.name.toLowerCase().trim()))

// A template title that is NOT also a model name — the ordinary, correct case.
const TEMPLATE = TEMPLATE_TITLES.find(t => !MODEL_NAMES.has(t.toLowerCase().trim()))

/** The answer shape discover.txt asks for. */
function answer (bestMatch, alsoLines) {
  return [
    '**Best match**',
    `${bestMatch} — this is why it fits.`,
    '',
    '**How it works**',
    'Two or three sentences about the thing.',
    '',
    '**Also worth considering**',
    ...(alsoLines || []).map(n => `- ${n} — a one-line reason.`),
    '',
    '**Is that what you had in mind, or would you like me to look for something else?**'
  ].join('\n')
}

describe('templateHeadingCheck — the fault it was built for', () => {
  it('fails a calculation model offered as the best match, and names its real page', () => {
    const out = check.checkTemplateHeadings(answer(`**${MODEL.name}**`))
    expect(out.ok).toBe(false)
    expect(out.offenders).toHaveLength(1)
    expect(out.offenders[0].name).toBe(MODEL.name)
    expect(out.offenders[0].route).toBe(MODEL.route)
    expect(out.offenders[0].heading).toBe('best match')
  })

  it('fails a model offered under "Also worth considering"', () => {
    const out = check.checkTemplateHeadings(answer(`**${TEMPLATE}**`, [`**${MODEL.name}**`]))
    expect(out.ok).toBe(false)
    expect(out.offenders[0].heading).toBe('also worth considering')
  })

  it('passes a real template under a template heading', () => {
    const out = check.checkTemplateHeadings(answer(`**${TEMPLATE}**`, [`**${TEMPLATE}**`]))
    expect(out.ok).toBe(true)
    expect(out.offenders).toEqual([])
  })

  it('passes the same model named in the model block, where it belongs', () => {
    const text = [
      '**Best match**',
      `**${TEMPLATE}** — this is why it fits.`,
      '',
      '**A model that fits**',
      `**${MODEL.name}** — what it would show the client — open it at ${MODEL.route}`,
      '',
      '**Is that what you had in mind, or would you like me to look for something else?**'
    ].join('\n')
    expect(check.checkTemplateHeadings(text).ok).toBe(true)
  })

  it('reports a model only once however often it is named', () => {
    const out = check.checkTemplateHeadings(answer(`**${MODEL.name}**`, [`**${MODEL.name}**`]))
    expect(out.offenders).toHaveLength(1)
  })
})

describe('templateHeadingCheck — what it deliberately leaves alone', () => {
  it('leaves an unrecognised name alone when it is not one of our models', () => {
    // The check reads AI prose. A name that is neither a template nor a model may be a
    // heading this parse misread, and rewriting a good answer is worse than the fault.
    const out = check.checkTemplateHeadings(answer('**Something Nobody Has Ever Built**'))
    expect(out.ok).toBe(true)
  })

  it('does not cut a hyphenated name in half at its own hyphen', () => {
    const hyphenated = TEMPLATE_TITLES.find(t => /\S-\S/.test(t))
    if (!hyphenated) { return }
    const found = check.namesUnderTemplateHeadings(answer(`**${hyphenated}**`))
    expect(found[0].name).toBe(hyphenated)
  })

  it('ignores prose under a heading that is not a template heading', () => {
    const text = [
      '**How it works**',
      `${MODEL.name} — mentioned while explaining something.`,
      ''
    ].join('\n')
    expect(check.checkTemplateHeadings(text).ok).toBe(true)
  })

  it('survives an answer with no headings at all', () => {
    expect(check.checkTemplateHeadings('Just a sentence.').ok).toBe(true)
    expect(check.checkTemplateHeadings('').ok).toBe(true)
    expect(check.checkTemplateHeadings(null).ok).toBe(true)
  })
})

describe('templateHeadingCheck — what the AI is told to fix', () => {
  it('names the offending item, its real page path and the heading it sat under', () => {
    const out = check.checkTemplateHeadings(answer(`**${MODEL.name}**`))
    const instruction = check.buildRetryInstruction(out.offenders)
    expect(instruction).toContain(MODEL.name)
    expect(instruction).toContain(MODEL.route)
    expect(instruction).toContain('Best match')
    // It must say what the thing IS, not merely repeat the rule the AI already ignored
    // four times across discover.txt and the model-list instruction.
    expect(instruction).toContain('CALCULATION MODEL')
  })

  // 🔴 ITEM 7.8. These two sentences are the fence around the no-match escape, and they
  // are load-bearing: without them a live retry produced an answer carrying BOTH a best
  // match and "I can't find an exact match", because discover.txt specifies the
  // alternatives block as "1-2 alternative TEMPLATES" and never says it may be empty, so
  // emptying it left the AI no permitted exit. Deleting either sentence restores that
  // trap, and no other test can see it — nothing here can assert what the AI writes back.
  it('lets the AI keep its best match and drop the alternatives, rather than deny both', () => {
    const out = check.checkTemplateHeadings(answer(`**${MODEL.name}**`))
    const instruction = check.buildRetryInstruction(out.offenders)
    expect(instruction).toContain('Keep your "Best match" if one still fits')
    expect(instruction).toContain('leave that block out entirely')
    // The escape survives, but only for the whole-answer case it was written for.
    expect(instruction).toContain('Only when NO template in the list fits at all')
  })
})

describe('templateHeadingCheck — the note the advisor reads when the retry fails', () => {
  // 🔴 THE WORDING IS PINNED ON PURPOSE, and this is the exception Mike's 2026-08-24
  // ruling names: wording he has explicitly approved, load-bearing because this sentence
  // is the only thing between the advisor and a fruitless search in Advisor-e. Approved
  // 2026-09-16. A rewrite should fail here and go back to him.
  it('says what the thing is, where to open it, and that no template of that name exists', () => {
    const note = check.buildAdvisorNote([{ name: 'Wages/Salary Review', route: '/wages-review' }])
    expect(note).toBe(
      '⚠️ **Wages/Salary Review** is a calculator in this app, not a template — ' +
      'open it at `/wages-review`. There is no template of that name in the Advisor-e library.'
    )
  })

  it('says nothing when there is nothing wrong', () => {
    expect(check.buildAdvisorNote([])).toBeNull()
    expect(check.buildAdvisorNote(null)).toBeNull()
  })

  it('covers every offender, not just the first', () => {
    const note = check.buildAdvisorNote([
      { name: 'A', route: '/a' },
      { name: 'B', route: '/b' }
    ])
    expect(note).toContain('**A**')
    expect(note).toContain('**B**')
  })
})

describe('templateHeadingCheck — the live case that produced item 7.7', () => {
  // Pinned because these two names are one word apart in the shipped data, and a rename
  // of either is Mike's call: if one moves, this test says so rather than the fault
  // quietly reappearing under a new spelling.
  it('tells the Wages model and the Wages template apart', () => {
    const model = MODELS.find(m => m.route === '/wages-review')
    expect(model).toBeTruthy()
    expect(TEMPLATE_TITLES).toContain('Wages Review')
    expect(TEMPLATE_TITLES).not.toContain(model.name)

    expect(check.checkTemplateHeadings(answer(`**${model.name}**`)).ok).toBe(false)
    expect(check.checkTemplateHeadings(answer('**Wages Review**')).ok).toBe(true)
  })
})

// 🔴 ITEM 7.12 — THE ORDER THAT KEEPS THE SHORT-FORM WIDENING SAFE.
//
// `resolveModelToken` now also resolves a model's name without its trailing parenthetical,
// so "Stock Purchasing" reaches `/stock-purchasing`. That makes "Cost of Capital" — the
// short form of "Cost of Capital (WACC)" — one more name living in both catalogues.
// The full set is SIX and is recomputed in `nameCollisions.test.js`, never counted here.
//
// `checkTemplateHeadings` tests `isKnownTemplate` FIRST and skips on a match, so a real
// template of that name is still left alone. That ordering is the whole reason the
// widening is safe, and nothing else states it — without this test it is an accident that
// a later reordering could silently undo, turning good answers into forced retries.
describe('templateHeadingCheck — a template keeps its name even when a model shortens to it', () => {
  const shortOf = name => String(name).replace(/\s*\([^)]*\)\s*$/, '').trim()

  it('leaves a real template alone when a model abbreviates to the same name', () => {
    const shared = MODELS
      .map(m => shortOf(m.name))
      .filter(short => TITLE_SET.has(short.toLowerCase()))

    // Vacuous-pass guard: if the catalogues are reworded so no such name exists, this
    // test must say so rather than quietly proving nothing.
    expect(shared.length).toBeGreaterThan(0)

    shared.forEach((name) => {
      expect(check.checkTemplateHeadings(answer(`**${name}**`)).ok).toBe(true)
    })
  })
})

'use strict'

const {
  BASE_GATE,
  CONFIG_KEY,
  GATE_SIGNAL,
  GATE_PATTERNS,
  detectLiteracyGap,
  buildAcknowledgement,
  readAnswer,
  validateEducationGate,
  loadResolvedEducationGate
} = require('../../server/utils/educationGate')
const { SIGNAL_REGISTRY, SIGNAL_DESCRIPTIONS, extractProblemSignals } = require('../../server/utils/problemSignals')
const { setFirmMembership, globalScopeId, groupScopeId } = require('../../server/utils/tierChain')
const DICTIONARY = require('../../data/signal-dictionary.json')

/**
 * The education gate — item 2.9.
 *
 * Behaviour ruled by Mike 2026-07-16, reach ruled 2026-08-16, wording ruled 2026-08-24.
 * Design: design/EDUCATION-GATE.md. Artefact: design/mockups/education-gate.html.
 *
 * 🔴 THE ONE THAT MATTERS is the "cannot reach template selection" block. Everything else
 * here is ordinary correctness. That block is the whole reason the phrases live in their own
 * map instead of alongside the scoring signals, and it is the claim a future maintainer is
 * most likely to break while tidying up.
 */

const BRAND = 'Acme Advisory'
const COUNTRY = 'New Zealand'
const FIRM = 'firm-nz-1'

/** An overlay reader over a plain object of scopeId → stored partial. */
function readerFor (store) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(store[scopeId] || null)
  }
}

afterEach(() => { setFirmMembership({}) })

// ── The wording is Mike's, and it is pinned ─────────────────────────────────

describe("the approved wording, so nobody 'improves' it in the data file", () => {
  it('asks the question Mike approved on 2026-08-24, verbatim', () => {
    // Chosen from three drafts. He picked this one because it makes clear the advisor
    // keeps the teaching either way. Reword it on the mentor screen, not here.
    expect(BASE_GATE.question).toBe(
      "From what you've described, this client may not yet be comfortable reading their own numbers.\n\n" +
      "Do you want me to put education first, or show what's technically needed and leave the teaching to you?"
    )
  })

  it('offers exactly two answers, with the values the strategy resolver knows', () => {
    expect(BASE_GATE.options.map(o => o.value)).toEqual(['education_first', 'technical'])
    expect(BASE_GATE.options.map(o => o.label)).toEqual(['Education first', "What's technically needed"])
  })

  it('strips the data file\'s own documentation, so no note reaches an API or a model', () => {
    const serialised = JSON.stringify(BASE_GATE)
    expect(serialised).not.toContain('_readme')
    expect(serialised).not.toContain('_wordingNote')
    expect(serialised).not.toContain('_effect')
    expect(Object.keys(BASE_GATE).some(k => k.charAt(0) === '_')).toBe(false)
  })

  it('seeds its phrases from pd-35, rather than inventing a fourth vocabulary', () => {
    // pd-35 in advisory-distinctions.json is Mike's own authored content, and was
    // previously reachable only inside the forecasting domain. If someone re-words it
    // there, this fails and the two get re-reconciled deliberately.
    const distinctions = require('../../data/advisory-distinctions.json')
    const pd35 = distinctions.platform.find(r => r.id === 'pd-35')
    expect(pd35).toBeDefined()
    for (const trigger of pd35.triggers) {
      expect(BASE_GATE.phrases).toContain(trigger)
    }
  })
})

// ── 🔴 The structural guarantee ─────────────────────────────────────────────

describe('🔴 the gate CANNOT change which templates are recommended', () => {
  // design/EDUCATION-GATE.md §5c. Two reasons, both binding: advisory-staircase.json's
  // ruleGuard keeps the education decision in the acumen lens, and pd-35 ALREADY boosts
  // templates for this idea inside forecasting — a second lever would double-count it.
  //
  // The guarantee is meant to be structural, not a weight of zero someone can "fix".

  it('keeps the gate phrases OUT of the scoring signal map entirely', () => {
    expect(DICTIONARY.gateSignals[GATE_SIGNAL]).toBeDefined()
    expect(DICTIONARY.signals[GATE_SIGNAL]).toBeUndefined()
  })

  it('never lets the gate signal into SIGNAL_REGISTRY, which is what scopes scoring', () => {
    expect(SIGNAL_REGISTRY[GATE_SIGNAL]).toBeUndefined()
  })

  it('never lets the gate signal into SIGNAL_DESCRIPTIONS, which feeds the cause-first read', () => {
    expect(SIGNAL_DESCRIPTIONS[GATE_SIGNAL]).toBeUndefined()
  })

  it('does not return the gate signal from extractProblemSignals, whatever the text says', () => {
    // The sentence below trips the gate. It must still produce no scoring signal named
    // for it — otherwise the phrases would reach decisionScore by the ordinary path.
    const signals = extractProblemSignals('the owner is obsessed with revenue and chasing turnover')
    expect(Object.keys(signals)).not.toContain(GATE_SIGNAL)
  })

  it('builds SIGNAL_REGISTRY from the scoring map ALONE, so the gate map cannot leak in', () => {
    // templateResolver derives its per-domain signal scope from SIGNAL_REGISTRY and
    // nothing else. Pinning the registry to exactly the `signals` keys is what makes
    // "the gate cannot reach scoring" true by construction: there is no wire to cut,
    // and adding one fails here.
    expect(Object.keys(SIGNAL_REGISTRY).sort()).toEqual(Object.keys(DICTIONARY.signals).sort())
  })
})

// ── Detection ───────────────────────────────────────────────────────────────

describe('detectLiteracyGap', () => {
  const phrases = BASE_GATE.phrases

  it('fires on the mentor phrase and hands back the words the advisor used', () => {
    const out = detectLiteracyGap('Client keeps chasing turnover and will not look at margin', phrases)
    expect(out.detected).toBe(true)
    expect(out.phrase).toBe('chasing turnover')
  })

  it('fires on a regex the mentor list does not cover', () => {
    // "do not understand" is not one of pd-35's six phrases; the developer regex catches
    // the many ways the same thing gets said.
    const out = detectLiteracyGap('They do not understand their numbers at all', [])
    expect(out.detected).toBe(true)
    expect(out.phrase).toBe('do not understand their numbers')
  })

  it.each([
    ["don't understand their numbers", "They don't understand their numbers"],
    ['cannot read their financials', 'The owner cannot read their financials'],
    ['focuses on sales not profit', 'He focuses on sales not profit'],
    ['thinks turnover is profit', 'She thinks turnover is profit'],
    ['never looks at the bottom line', 'The owner never looks at the bottom line']
  ])('catches %s', (_label, text) => {
    expect(detectLiteracyGap(text, phrases).detected).toBe(true)
  })

  it('🔴 does NOT fire on staff turnover, which is a different problem entirely', () => {
    // The nearest false positive in the vocabulary. An advisor asking about staff
    // retention must never be asked how to pitch a financial-literacy conversation.
    expect(detectLiteracyGap('we have high staff turnover and morale issues', phrases).detected).toBe(false)
    expect(detectLiteracyGap('staff turnover is our biggest problem', phrases).detected).toBe(false)
  })

  it('does not fire on an unrelated case', () => {
    expect(detectLiteracyGap('The client wants a valuation ahead of a sale', phrases).detected).toBe(false)
  })

  it('prefers the mentor phrase over the regex, because a human typed it', () => {
    // Both match here. The advisor should be shown the vocabulary a person chose.
    const out = detectLiteracyGap('they are obsessed with revenue', phrases)
    expect(out.phrase).toBe('obsessed with revenue')
  })

  it('treats a phrase as literal text, so punctuation cannot break the match', () => {
    // A mentor types what an advisor would say. A stray bracket must not throw, and must
    // not silently match nothing either.
    const out = detectLiteracyGap('the client ignores profit (gross) entirely', ['profit (gross)'])
    expect(out.detected).toBe(true)
    expect(out.phrase).toBe('profit (gross)')
  })

  it('says no on empty, missing or non-string text rather than throwing', () => {
    expect(detectLiteracyGap('', phrases).detected).toBe(false)
    expect(detectLiteracyGap(null, phrases).detected).toBe(false)
    expect(detectLiteracyGap(undefined, phrases).detected).toBe(false)
    expect(detectLiteracyGap(42, phrases).detected).toBe(false)
  })

  it('survives a phrase list holding rubbish', () => {
    expect(() => detectLiteracyGap('chasing turnover', [null, 7, '', 'chasing turnover'])).not.toThrow()
    expect(detectLiteracyGap('chasing turnover', [null, 7, '']).detected).toBe(true) // regex still catches it
  })

  it('compiled every pattern the dictionary declares', () => {
    expect(GATE_PATTERNS.length).toBe(DICTIONARY.gateSignals[GATE_SIGNAL].patterns.length)
    expect(GATE_PATTERNS.length).toBeGreaterThan(0)
  })
})

// ── The reasoning, shown either way ─────────────────────────────────────────

describe('buildAcknowledgement — the 2026-07-16 ruling', () => {
  it('names the reason after EDUCATION FIRST', () => {
    const out = buildAcknowledgement(BASE_GATE, 'education_first', 'chasing turnover')
    expect(out).toContain('Education first.')
    expect(out).toContain('This came up because you mentioned "chasing turnover".')
  })

  it('names the reason after WHAT IS TECHNICALLY NEEDED too — that is the "either way"', () => {
    const out = buildAcknowledgement(BASE_GATE, 'technical', 'chasing turnover')
    expect(out).toContain("Straight to what's technically needed.")
    expect(out).toContain('This came up because you mentioned "chasing turnover".')
  })

  it('🔴 DROPS the reason sentence when no phrase can be named, rather than softening it', () => {
    // A gate that cannot say what triggered it should say nothing, not something woolly.
    const out = buildAcknowledgement(BASE_GATE, 'education_first', null)
    expect(out).toBe("Education first. I'll lead with the material that builds the client's understanding, then the technical work.")
    expect(out).not.toContain('because')
  })

  it('gives nothing at all for an option that does not exist', () => {
    expect(buildAcknowledgement(BASE_GATE, 'something_else', 'x')).toBe('')
  })
})

// ── Reading the advisor's answer ────────────────────────────────────────────

describe('readAnswer', () => {
  it.each([
    ['Education first', 'education_first'],
    ['education_first', 'education_first'],
    ["What's technically needed", 'technical'],
    ['technical', 'technical'],
    ['  EDUCATION FIRST  ', 'education_first']
  ])('reads the clicked answer %s', (typed, expected) => {
    expect(readAnswer(BASE_GATE, typed)).toBe(expected)
  })

  it.each([
    ['yes please', 'education_first'],
    ['teach them the basics first', 'education_first'],
    ['start with the foundations', 'education_first'],
    ['no, skip the education', 'technical'],
    ['just show me what is technically needed', 'technical'],
    ['straight to it', 'technical']
  ])('reads the typed answer "%s"', (typed, expected) => {
    expect(readAnswer(BASE_GATE, typed)).toBe(expected)
  })

  it('🔴 reads "no education" as TECHNICAL, never as education', () => {
    // The word "education" appears in both. Reading a refusal as consent would pitch a
    // client the opposite way to the advisor's instruction.
    expect(readAnswer(BASE_GATE, 'no education')).toBe('technical')
    expect(readAnswer(BASE_GATE, 'not education')).toBe('technical')
  })

  it('returns null on an answer it cannot read, so the caller asks again', () => {
    expect(readAnswer(BASE_GATE, 'purple monkey dishwasher')).toBeNull()
    expect(readAnswer(BASE_GATE, '')).toBeNull()
    expect(readAnswer(BASE_GATE, '   ')).toBeNull()
    expect(readAnswer(BASE_GATE, null)).toBeNull()
    expect(readAnswer(BASE_GATE, 42)).toBeNull()
  })
})

// ── Validation ──────────────────────────────────────────────────────────────

describe('validateEducationGate', () => {
  it('accepts nothing stored at all', () => {
    expect(validateEducationGate(null)).toEqual({ ok: true, value: {}, error: null })
    expect(validateEducationGate(undefined)).toEqual({ ok: true, value: {}, error: null })
  })

  it('accepts a PARTIAL override — a tier holds only its changes', () => {
    const out = validateEducationGate({ question: 'Ask it this way instead?' })
    expect(out.ok).toBe(true)
    expect(out.value).toEqual({ question: 'Ask it this way instead?' })
  })

  it.each([
    ['an array', []],
    ['a string', 'nope'],
    ['a number', 7]
  ])('refuses %s', (_label, value) => {
    expect(validateEducationGate(value).ok).toBe(false)
  })

  it('refuses an empty question — the gate cannot fire with nothing to ask', () => {
    expect(validateEducationGate({ question: '   ' }).ok).toBe(false)
    expect(validateEducationGate({ question: 5 }).ok).toBe(false)
  })

  it('refuses a question longer than 600 characters', () => {
    expect(validateEducationGate({ question: 'x'.repeat(601) }).ok).toBe(false)
  })

  it('refuses a reason line longer than 300 characters', () => {
    expect(validateEducationGate({ reason: 'x'.repeat(301) }).ok).toBe(false)
  })

  it('🔴 refuses a THIRD answer — the values are the contract with strategyResolver', () => {
    const out = validateEducationGate({
      options: [
        { value: 'education_first' }, { value: 'technical' }, { value: 'maybe' }
      ]
    })
    expect(out.ok).toBe(false)
    expect(out.error).toContain('maybe')
  })

  it('refuses a MISSING answer — both must be present or the gate is half a question', () => {
    expect(validateEducationGate({ options: [{ value: 'technical' }] }).ok).toBe(false)
  })

  it('refuses the same answer listed twice', () => {
    const out = validateEducationGate({
      options: [{ value: 'technical' }, { value: 'technical' }]
    })
    expect(out.ok).toBe(false)
    expect(out.error).toContain('twice')
  })

  it('accepts relabelled answers, which is the whole point of the screen', () => {
    const out = validateEducationGate({
      options: [
        { value: 'education_first', label: 'Teach the basics first' },
        { value: 'technical', label: 'Just the technical work' }
      ]
    })
    expect(out.ok).toBe(true)
    expect(out.value.options[0].label).toBe('Teach the basics first')
  })

  it.each([
    ['an empty label', ''],
    ['a label over 80 characters', 'x'.repeat(81)],
    ['a non-string label', 5]
  ])('refuses %s', (_label, label) => {
    const out = validateEducationGate({
      options: [{ value: 'education_first', label }, { value: 'technical' }]
    })
    expect(out.ok).toBe(false)
  })

  it('refuses options that are not a list, or not objects', () => {
    expect(validateEducationGate({ options: 'both' }).ok).toBe(false)
    expect(validateEducationGate({ options: ['education_first', 'technical'] }).ok).toBe(false)
  })

  it('refuses an acknowledgement over 400 characters', () => {
    const out = validateEducationGate({
      options: [
        { value: 'education_first', acknowledgement: 'x'.repeat(401) },
        { value: 'technical' }
      ]
    })
    expect(out.ok).toBe(false)
  })

  it('accepts and de-duplicates a phrase list, dropping blanks', () => {
    const out = validateEducationGate({ phrases: ['chasing turnover', '  ', 'chasing turnover', 'wrong numbers'] })
    expect(out.ok).toBe(true)
    expect(out.value.phrases).toEqual(['chasing turnover', 'wrong numbers'])
  })

  it('🔴 refuses a phrase under 3 characters, which would fire the gate on everyone', () => {
    // Worse than never firing: an advisor asked on every case learns to dismiss it.
    const out = validateEducationGate({ phrases: ['is'] })
    expect(out.ok).toBe(false)
    expect(out.error).toContain('3 characters')
  })

  it('refuses a phrase over 120 characters, a non-string phrase, and a list of 201', () => {
    expect(validateEducationGate({ phrases: ['x'.repeat(121)] }).ok).toBe(false)
    expect(validateEducationGate({ phrases: [7] }).ok).toBe(false)
    expect(validateEducationGate({ phrases: 'chasing turnover' }).ok).toBe(false)
    expect(validateEducationGate({ phrases: new Array(201).fill('chasing turnover') }).ok).toBe(false)
  })
})

// ── The tier cascade ────────────────────────────────────────────────────────

describe('loadResolvedEducationGate', () => {
  it('gives the shipped gate when there is no scope at all', async () => {
    expect(await loadResolvedEducationGate(null, readerFor({}))).toBe(BASE_GATE)
  })

  it('gives the layer above BY REFERENCE when a scope has changed nothing', async () => {
    // Identity, not equality: "this level changed nothing" is then provable.
    expect(await loadResolvedEducationGate(FIRM, readerFor({}))).toBe(BASE_GATE)
  })

  it("takes the MENTOR's wording down to a firm that has set none of its own", async () => {
    const mentorWording = { question: 'Does this client read their own numbers?' }
    const store = {}
    store[require('../../server/utils/platformScope').PLATFORM_SCOPE] = mentorWording
    const gate = await loadResolvedEducationGate(FIRM, readerFor(store))
    expect(gate.question).toBe('Does this client read their own numbers?')
    // Everything the mentor did not touch still comes from the shipped default.
    expect(gate.options.map(o => o.label)).toEqual(BASE_GATE.options.map(o => o.label))
  })

  it("lets a FIRM override the mentor's wording without losing the phrases", async () => {
    const store = {}
    store[require('../../server/utils/platformScope').PLATFORM_SCOPE] = { question: 'Mentor asks this?' }
    store[FIRM] = { question: 'But our firm asks this?' }
    const gate = await loadResolvedEducationGate(FIRM, readerFor(store))
    expect(gate.question).toBe('But our firm asks this?')
    expect(gate.phrases).toEqual(BASE_GATE.phrases)
  })

  it('⚠ REPLACES the phrase list rather than concatenating it', async () => {
    // deepMerge replaces arrays, and that is the behaviour wanted: a firm that removes a
    // phrase must actually see it removed. A list that only grows cannot be corrected.
    const store = {}
    store[FIRM] = { phrases: ['their own words only'] }
    const gate = await loadResolvedEducationGate(FIRM, readerFor(store))
    expect(gate.phrases).toEqual(['their own words only'])
  })

  it('ignores a stored value that fails validation, rather than applying half of it', async () => {
    const store = {}
    store[FIRM] = { options: [{ value: 'nonsense' }] }
    const gate = await loadResolvedEducationGate(FIRM, readerFor(store))
    expect(gate).toBe(BASE_GATE)
  })

  it('falls back to the layer above on a storage fault, so a gate never switches off silently', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const reader = () => Promise.reject(new Error('mysql gone'))
    const gate = await loadResolvedEducationGate(FIRM, reader)
    expect(gate).toBe(BASE_GATE)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('resolves through the middle tiers when a membership map supplies them', async () => {
    // 🔴 A WEAKER CLAIM THAN A LIVE SCREEN, and stated as such: no real login produces a
    // group manager today (config/integration.js ships those role names empty), so the
    // middle tiers can only be exercised against a seeded map. Advisor-e's data to supply.
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const store = {}
    store[globalScopeId(BRAND)] = { question: 'Global asks this?' }
    store[groupScopeId(BRAND, COUNTRY)] = { reason: 'Because of "{phrase}".' }
    const gate = await loadResolvedEducationGate(FIRM, readerFor(store))
    expect(gate.question).toBe('Global asks this?')
    expect(gate.reason).toBe('Because of "{phrase}".')
  })
})

'use strict'

/**
 * The Advisory Staircase question the advisor is actually asked (item 4.16 E).
 *
 * WHAT THIS IS PROVING, and why it is not just "it reads a field". `selectorPrompt`
 * has been authored in data/advisory-staircase.json since the framework shipped and
 * was read by NOTHING — the engine asked a hardcoded copy of the sentence in two
 * places. A mentor or a firm could edit the question, watch it save, see it in version
 * history, and every advisor would still be asked Advisor-e's wording. It is the same
 * fault fixed for the step NAMES on 2026-07-31; the question above the steps was
 * missed.
 *
 * The first two tests are the ones that matter most: they pin the EXACT strings that
 * were hardcoded, so this change cannot quietly alter what an advisor is asked today.
 * design/STAIRCASE-SELECTOR-PROMPT-FIELD.md.
 */

const {
  staircaseSelectorQuestion,
  staircaseReaskQuestion,
  buildSavedFactConfirmPrompt
} = require('../../server/advisorEngine')

const BASE = require('../../data/advisory-staircase.json')

// Verbatim, from server/advisorEngine.js before 2026-08-16. Written out in full
// rather than composed from BASE, so a change to the data file cannot silently
// re-point these at whatever the new value happens to be.
const WAS_HARDCODED_ASK =
  'Where would you say your current engagement with this client sits on the Advisory Staircase?\n[STAIRCASE_SELECTOR]'
const WAS_HARDCODED_REASK =
  'No problem — where would you say your current engagement with this client sits on the Advisory Staircase?\n[STAIRCASE_SELECTOR]'

describe('the staircase question — today\'s advisor sees no change', () => {
  test('with the platform staircase, the question is byte-for-byte what was hardcoded', () => {
    expect(staircaseSelectorQuestion(BASE)).toBe(WAS_HARDCODED_ASK)
  })

  test('with the platform staircase, the re-ask is byte-for-byte what was hardcoded', () => {
    expect(staircaseReaskQuestion(BASE)).toBe(WAS_HARDCODED_REASK)
  })

  test('with no staircase at all, it still asks the shipped question', () => {
    // The engine loads the staircase before this point, but a caller that does not
    // must never leave the advisor with a blank question they cannot answer.
    expect(staircaseSelectorQuestion(undefined)).toBe(WAS_HARDCODED_ASK)
    expect(staircaseSelectorQuestion(null)).toBe(WAS_HARDCODED_ASK)
    expect(staircaseSelectorQuestion({})).toBe(WAS_HARDCODED_ASK)
  })
})

describe('the staircase question — a tier edit now reaches the advisor', () => {
  const EDITED = { ...BASE, selectorPrompt: 'How deep is your relationship with this client today?' }

  test('the edited sentence is asked, with the selector token kept', () => {
    expect(staircaseSelectorQuestion(EDITED))
      .toBe('How deep is your relationship with this client today?\n[STAIRCASE_SELECTOR]')
  })

  test('the selector token is never dropped — without it the advisor gets no step list', () => {
    expect(staircaseSelectorQuestion(EDITED)).toContain('\n[STAIRCASE_SELECTOR]')
  })

  test('an edited sentence is used VERBATIM after the re-ask lead-in, never re-cased', () => {
    // Lowering the first letter is right for the platform's own sentence, which runs
    // into "No problem — ". Doing it to a sentence somebody else wrote would silently
    // edit their words — and would mangle one that opens on a proper noun.
    expect(staircaseReaskQuestion(EDITED))
      .toBe('No problem — How deep is your relationship with this client today?\n[STAIRCASE_SELECTOR]')
  })

  test('the re-ask lead-in is not editable content — it survives any edited question', () => {
    expect(staircaseReaskQuestion(EDITED).startsWith('No problem — ')).toBe(true)
  })

  test('a blank or whitespace question falls back rather than asking nothing', () => {
    expect(staircaseSelectorQuestion({ ...BASE, selectorPrompt: '   ' })).toBe(WAS_HARDCODED_ASK)
    expect(staircaseSelectorQuestion({ ...BASE, selectorPrompt: '' })).toBe(WAS_HARDCODED_ASK)
  })

  test('a non-string question falls back rather than printing an object at the advisor', () => {
    expect(staircaseSelectorQuestion({ ...BASE, selectorPrompt: 42 })).toBe(WAS_HARDCODED_ASK)
    expect(staircaseSelectorQuestion({ ...BASE, selectorPrompt: { text: 'no' } })).toBe(WAS_HARDCODED_ASK)
  })

  test('surrounding whitespace is trimmed off the asked sentence', () => {
    expect(staircaseSelectorQuestion({ ...BASE, selectorPrompt: '  Where are we?  ' }))
      .toBe('Where are we?\n[STAIRCASE_SELECTOR]')
  })
})

describe('buildSavedFactConfirmPrompt carries the firm staircase through', () => {
  const EDITED = { ...BASE, selectorPrompt: 'Where are we with this client?' }

  test('a first-time client is asked the firm question', () => {
    expect(buildSavedFactConfirmPrompt('advisoryStaircase', null, null, EDITED))
      .toBe('Where are we with this client?\n[STAIRCASE_SELECTOR]')
  })

  test('called without a staircase — as every existing caller does — nothing changes', () => {
    expect(buildSavedFactConfirmPrompt('advisoryStaircase', null, null)).toBe(WAS_HARDCODED_ASK)
  })

  test('the returning-client confirmation is NOT the staircase question', () => {
    // "Is the advisory stage still X?" is a different sentence with a different job,
    // and it is not what selectorPrompt authors. Wiring the firm's question in here
    // would put a step-selection question where a yes/no belongs.
    expect(buildSavedFactConfirmPrompt('advisoryStaircase', 'Step 2: Assimilation', null, EDITED))
      .toBe('Is the advisory stage still Step 2: Assimilation?')
  })

  test('the other saved facts are untouched by the staircase argument', () => {
    expect(buildSavedFactConfirmPrompt('industry', null, null, EDITED))
      .toBe('What industry is the client in?')
    expect(buildSavedFactConfirmPrompt('ownership', null, null, EDITED))
      .toBe('Is the business privately owned, a not-for-profit, or publicly listed?')
  })
})

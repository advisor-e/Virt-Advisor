'use strict'

const { loadPrompt } = require('../../server/utils/promptLoader')
const { NEVER_INVENT_GUARDRAIL } = require('../../server/utils/promptGuardrail')

// Tier 1 — the never-invent-firm-IP guardrail must be single-sourced and present
// on EVERY system prompt, so no mode or code path can ship a prompt without it.
describe('Tier 1 — never-invent guardrail single-sourced onto every prompt', () => {
  test('the canonical guardrail states the core rule', () => {
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/never invent the firm's content/i)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/verbatim in the reference material/i)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/named source document/i)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/do NOT improvise/)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/template names and named methods/i)
  })

  test('the verbatim-honesty rule (2026-07-18) is present: say plainly when text is not held, never pass paraphrase off as quotation', () => {
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/say so plainly/i)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/never present your own paraphrase or reconstruction as a quotation/i)
    expect(NEVER_INVENT_GUARDRAIL).toMatch(/never imply wording is verbatim when it is not/i)
  })

  // Every prompt loadPrompt can return is a system prompt and must carry the guardrail.
  test.each(['client', 'discover', 'plan', 'learn', 'course-design', 'course-session'])(
    'loadPrompt(%s) is prefixed with the guardrail and still carries its own content',
    (name) => {
      const prompt = loadPrompt(name)
      expect(prompt.startsWith(NEVER_INVENT_GUARDRAIL)).toBe(true)
      // the mode's own body still follows the guardrail
      expect(prompt.length).toBeGreaterThan(NEVER_INVENT_GUARDRAIL.length + 100)
    }
  )

  test('the guardrail is not duplicated inside the learn prompt body', () => {
    const learn = loadPrompt('learn')
    // The phrase should appear once (the prepended guardrail), not twice
    // (i.e. the old inline copy in learn.txt has been removed).
    const occurrences = learn.split("never invent the firm's content").length - 1
    expect(occurrences).toBe(1)
  })
})

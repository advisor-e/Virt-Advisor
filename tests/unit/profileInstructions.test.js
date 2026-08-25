'use strict'

/**
 * @file Item 4.47 — the advisor profile has to mean something in Learn mode.
 *
 * 🔴 WHY THESE ASSERT PROMPT WORDING, WHEN THE HOUSE RULE SAYS NOT TO.
 * CLAUDE.md forbids new tests that pin the exact wording of USER-FACING text, because
 * a person in UAT sees a wrong label in five seconds. Nobody in UAT can see a system
 * prompt. This defect shipped on 2026-07-16, was caught only because Mike happened to
 * push back at the AI mid-conversation, and then sat unfixed for six weeks — precisely
 * because no screen shows it and no test read it. That is the case for pinning it.
 *
 * What is pinned is the INSTRUCTION each mode is given, not its phrasing: the client
 * wording must not reach Learn, and the Learn wording must not silence the one question
 * the profile genuinely cannot answer.
 */

const { profileInstructionsFor } = require('../../server/advisorEngine')

describe('the profile instruction is written for the mode it lands in', () => {
  test('Learn is never told about Phases or the client-mode section', () => {
    const { system, context } = profileInstructionsFor('learn', true)

    // The original defect: both strings named a Phase order and a "Why this suits you
    // as the advisor" section that exist only in the client prompt, so in Learn they
    // instructed nothing and the profile sat unused.
    expect(context).not.toMatch(/Phase/i)
    expect(system).not.toMatch(/Phase/i)
    expect(context).not.toMatch(/Why this suits you/i)
    expect(system).not.toMatch(/Why this suits you/i)
  })

  test('Learn is told not to re-ask what the profile already states', () => {
    const { context } = profileInstructionsFor('learn', true)

    // formatAdvisorProfile emits experience, comfort with tools and development areas.
    // learn.txt asks for skill/confidence level. The instruction has to close that.
    expect(context).toMatch(/do not ask/i)
    expect(context).toMatch(/experience/i)
    expect(context).toMatch(/confidence/i)
    expect(context).toMatch(/tools/i)
  })

  test('Learn is NOT told to stop asking what the profile cannot answer', () => {
    const { context } = profileInstructionsFor('learn', true)

    // ⚠ The guard against over-correcting. The profile is general; "have you had
    // training on THIS topic" is specific and stays fair game. An instruction that
    // banned the whole "where they're starting from" block would produce an AI that
    // assumes it knows — a worse defect than the one being fixed, and a silent one.
    expect(context).toMatch(/you may still ask/i)
    expect(context).toMatch(/this particular topic/i)
  })

  test('client and discover keep the wording they already had', () => {
    for (const mode of ['client', 'discover']) {
      const { system, context } = profileInstructionsFor(mode, true)
      expect(context).toMatch(/Do not ask the Phase 2 questions/)
      expect(context).toMatch(/skip directly from Phase 1 to Phase 3/)
      expect(system).toMatch(/Why this suits you as the advisor/)
    }
  })

  test('every mode refuses to let the model infer beyond what is written', () => {
    // The anti-inference sentence predates this change and protects a real advisor
    // from having seniority or years of experience invented for them. It must survive
    // in BOTH branches — losing it on one path would be invisible.
    for (const mode of ['learn', 'client', 'discover', 'plan']) {
      const { context } = profileInstructionsFor(mode, true)
      expect(context).toMatch(/do not infer, extrapolate, or assume/i)
    }
  })

  test('no profile means no system instruction, in any mode', () => {
    for (const mode of ['learn', 'client', 'discover', 'plan']) {
      expect(profileInstructionsFor(mode, false).system).toBe('')
    }
  })
})

describe('the Learn prompt itself carries the carve-out', () => {
  const { readFileSync } = require('fs')
  const { resolve } = require('path')
  const learn = readFileSync(
    resolve(__dirname, '..', '..', 'data', 'prompts', 'learn.txt'), 'utf8'
  )

  // 🔴 BOTH HALVES OR NEITHER. The engine instruction above is inert while learn.txt
  // still positively orders the question — that was the second of the two causes, and
  // fixing only one leaves the defect exactly as Mike saw it.
  test('learn.txt tells the model to skip the skill-level question when a profile exists', () => {
    expect(learn).toMatch(/If an Advisor Profile is present in the context/i)
  })

  test('learn.txt still allows the topic-specific question', () => {
    expect(learn).toMatch(/second question is still fair to ask/i)
  })
})

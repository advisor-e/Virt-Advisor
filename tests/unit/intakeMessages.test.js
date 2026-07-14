'use strict'

// buildIntakeMessages — locks the fix for the 2026-07-14 fabrication: the
// observation-intake opening call carried ONLY a system instruction (no user
// turn), and with nobody to respond to the model sometimes collapsed roles and
// ANSWERED its own two questions in the advisor's first-person voice, naming
// the session's real templates. These tests make a system-only intake call a
// permanent test failure.

const { buildIntakeMessages } = require('../../server/advisorEngine')

describe('buildIntakeMessages — open (ask the two questions)', () => {
  const msgs = buildIntakeMessages('open', {
    templateList: 'Quick Fire Diagnosis, Debtor Protocols',
    domainLabel: 'raising-capital'
  })

  test('THE regression lock: the call is never system-only — a user turn anchors the exchange', () => {
    expect(msgs.some(m => m.role === 'user')).toBe(true)
    // And it is the same words the UI shows as the advisor's message.
    expect(msgs.find(m => m.role === 'user').content).toBe("Yes, let's record it now.")
  })

  test('the instruction carries the ask-never-answer role guard', () => {
    const system = msgs.find(m => m.role === 'system').content
    expect(system).toMatch(/never write, suggest, or draft the advisor's answers/)
    expect(system).toMatch(/ASKING/)
  })

  test('session context is interpolated (templates + domain)', () => {
    const system = msgs.find(m => m.role === 'system').content
    expect(system).toContain('Quick Fire Diagnosis, Debtor Protocols')
    expect(system).toContain('raising-capital')
  })
})

describe('buildIntakeMessages — close (acknowledge the observation)', () => {
  test('carries the conversation tail so the acknowledgement references real points', () => {
    const history = [
      { role: 'assistant', content: 'q1' },
      { role: 'user', content: 'a1' },
      { role: 'assistant', content: 'q2' },
      { role: 'user', content: 'the debtor session ran long' },
      { role: 'assistant', content: 'q3' },
      { role: 'user', content: 'would split it next time' }
    ]
    const msgs = buildIntakeMessages('close', {}, history)
    expect(msgs).toHaveLength(5) // system + last 4 turns
    expect(msgs[msgs.length - 1].content).toBe('would split it next time')
    expect(msgs[0].content).toContain('[INTAKE_COMPLETE]')
  })

  test('missing history degrades to the system message alone, never a throw', () => {
    expect(buildIntakeMessages('close', {})).toHaveLength(1)
  })
})

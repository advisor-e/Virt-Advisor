'use strict'

// detectFrustration (2026-06-25) — the advisor is venting at the TOOL (anger /
// profanity / "I already told you"). On a hit the intake acknowledges it and
// re-asks the current question rather than ploughing on (the original "profanity
// sailed past" failure, café test 2026-06-09). Scoped so describing a stressful
// CLIENT situation does not trip it.

const { detectFrustration } = require('../../server/advisorEngine')

describe('detectFrustration — catches tool-directed frustration', () => {
  test.each([
    'this is fucking ridiculous',
    'I already told you that',
    'wtf are you even asking',
    'this is bullshit',
    'for the third time, no',
    'are you not listening to me',
    'this is a complete waste of my time',
    'just get on with it',
    'just answer me',
    'this is a joke',
    'as I said already',
    'stop asking me the same thing',
    'we are going round in circles here',
    "for f's sake"
  ])('detects: "%s"', (t) => {
    expect(detectFrustration(t)).toBe(true)
  })
})

describe('detectFrustration — does NOT trip on ordinary / client-describing text', () => {
  test.each([
    'the client is in deep trouble and could go under',
    'the business is in deep shit financially', // describing the situation, not venting
    'I think the client has been a bit stupid with their money',
    'they could be facing liquidation',
    'I am not sure what is driving it',
    'the owner said fuck it and walked away once', // narrating the client's words
    'she told them to fuck off, it got heated', // attributed profanity
    'low sales volume and poor pricing',
    'yes that is right'
  ])('ignores: "%s"', (t) => {
    expect(detectFrustration(t)).toBe(false)
  })
})

describe('detectFrustration — safe on bad input', () => {
  test('empty / non-string → false', () => {
    expect(detectFrustration('')).toBe(false)
    expect(detectFrustration(null)).toBe(false)
    expect(detectFrustration(undefined)).toBe(false)
    expect(detectFrustration(42)).toBe(false)
  })
})

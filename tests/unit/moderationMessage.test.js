'use strict'

// Item 8.2, second half — the screen side. `$t` is wired to the REAL English file, as
// decisionTraceAiFailure.render.test.js does, because what is under test is the sentence a
// person reads.

const fs = require('fs')
const path = require('path')
const EN = require('../../locales/en.json')
const mixin = require('../../mixins/moderationMessage').default

function realT (key, params) {
  const text = key.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN)
  if (typeof text !== 'string') { throw new TypeError('missing locale key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, n) => (n in params ? String(params[n]) : m)) : text
}

const vm = Object.assign({ $t: realT }, mixin.methods)
Object.keys(mixin.methods).forEach((k) => { vm[k] = mixin.methods[k].bind(vm) })

describe('moderationMessage — each of the five, as a person reads it', () => {
  test('1 · typed: the sentence and what the check read it as', () => {
    expect(vm.moderationMessage({ kind: 'typed', category: 'illicit/violent', sentence: 'How do I build a bomb?' }))
      .toBe("This sentence couldn't be sent to the AI: 'How do I build a bomb?'. The safety check read it as instructions for a violent crime. If that isn't what you meant, reword that sentence and try again.")
  })

  // Mike, 2026-09-24: the approved wording closes the quote with a full stop, so the sentence's
  // own one is dropped — "myself.'." read as a mistake. A ? or ! is part of what was said.
  test('a quoted sentence loses its own final full stop, never its question mark', () => {
    expect(vm.moderationMessage({ kind: 'typed', category: 'self-harm/instructions', sentence: 'Tell me how to kill myself.' }))
      .toMatch(/'Tell me how to kill myself'\. The safety check/)
    expect(vm.moderationMessage({ kind: 'meeting', category: 'self-harm/instructions', sentence: 'I might end it.', speaker: 'client', time: '1:00' }))
      .toMatch(/: 'I might end it'\. The recording/)
  })

  test('2 · typedWhole names the category, no sentence', () => {
    expect(vm.moderationMessage({ kind: 'typedWhole', category: 'sexual/minors' })).toMatch(/sexual content involving a minor/)
  })

  test('3 · app never blames the person', () => {
    expect(vm.moderationMessage({ kind: 'app', category: 'self-harm/instructions' })).toMatch(/not anything you typed/)
  })

  test('4 · meeting: who, when, what', () => {
    const m = vm.moderationMessage({ kind: 'meeting', category: 'self-harm/instructions', sentence: 'I might end it.', speaker: 'client', time: '14:32' })
    expect(m).toMatch(/said by the client at 14:32, as instructions for self-harm: 'I might end it'\./)
  })

  test('5 · meetingWhole', () => {
    expect(vm.moderationMessage({ kind: 'meetingWhole', category: 'illicit/violent' })).toMatch(/read the conversation as instructions for a violent crime/)
  })

  // 🔴 A report the build cannot describe must not become a sentence with a hole in it.
  test.each([
    [null],
    [{ kind: 'typed', category: 'violence', sentence: 'x' }],
    [{ kind: 'typed', category: 'illicit/violent' }],
    [{ kind: 'meeting', category: 'illicit/violent', sentence: 'x', speaker: 'nobody', time: '1:00' }],
    [{ kind: 'something new', category: 'illicit/violent' }]
  ])('returns null for %j, so the screen keeps its usual error', (r) => {
    expect(vm.moderationMessage(r)).toBeNull()
  })
})

describe('moderationReportFrom — every shape a report arrives in', () => {
  const r = { kind: 'app', category: 'illicit/violent' }
  test.each([
    ['a JSON error envelope', { success: false, error: { code: 'AI_MODERATION_BLOCKED', moderation: r } }],
    ['a stream event', { type: 'error', code: 'AI_MODERATION_BLOCKED', moderation: r }],
    ['a background run error', { code: 'AI_MODERATION_BLOCKED', message: 'x', moderation: r }]
  ])('%s', (_, payload) => {
    expect(vm.moderationReportFrom(payload)).toEqual(r)
    expect(vm.moderationMessageFrom(payload)).toMatch(/app's own material/)
  })

  test('anything else is not a report', () => {
    expect(vm.moderationReportFrom({ error: { code: 'X', message: 'y' } })).toBeNull()
    expect(vm.moderationReportFrom('text')).toBeNull()
    expect(vm.moderationReportFrom(null)).toBeNull()
  })
})

// 🔴 THE ONE DELIBERATE WORDING PIN. Mike approved these five messages and three category
// phrases on 2026-09-24; design/MODERATION-WORDING.md is the record. What ships in en.json must
// be exactly that — a change starts in the design file, with his word, never on a screen alone.
describe('en.json says exactly what Mike approved', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', '..', 'design', 'MODERATION-WORDING.md'), 'utf8')
  const row = n => (md.match(new RegExp('^\\| ' + n + ' \\|[^|]+\\| (.+?) \\|$', 'm')) || [])[1]

  test.each([[1, 'typed'], [2, 'typedWhole'], [3, 'app'], [4, 'meeting'], [5, 'meetingWhole']])(
    'message %i', (n, key) => {
      expect(row(n)).toBeTruthy()
      expect(EN.moderation[key]).toBe(row(n))
    })

  test.each([
    ['sexual/minors', 'sexualMinors'],
    ['self-harm/instructions', 'selfHarmInstructions'],
    ['illicit/violent', 'illicitViolent']
  ])('category %s', (openai, key) => {
    const phrase = (md.match(new RegExp('^\\| `' + openai.replace('/', '\\/') + '` \\| (.+?) \\|$', 'm')) || [])[1]
    expect(EN.moderation.category[key]).toBe(phrase)
  })

  // Approved by Mike 2026-09-24, after he was shown them.
  test.each(['advisor', 'client', 'unknown'])('speaker %s', (role) => {
    const phrase = (md.match(new RegExp('^\\| ' + role + ' \\| (.+?) \\|$', 'm')) || [])[1]
    expect(phrase).toBeTruthy()
    expect(EN.moderation.speaker[role]).toBe(phrase)
  })
})

'use strict'

/**
 * Wordsmith's content as each tier works to it — item 15.14, the hub tab of
 * design/mockups/wordsmith-screens.html.
 *
 * WHAT UAT CANNOT SEE. A manager changes a definition, a rule or a style instruction and sees it
 * saved on their own screen. They cannot see whether it reached the firms below, leaked up or
 * across, overwrote their own edit when the tier above changed the same row, or reached the
 * model at all — nor whether a firm whose record cannot be read is quietly handed the mentor's
 * content it switched off. Those are the assertions here.
 */

const wc = require('../../server/utils/wordsmithContent')
const ws = require('../../server/utils/wordsmith')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const MENTOR = PLATFORM_SCOPE
const GLOBAL = '__global__:brandA'
const GROUP = '__group__:brandA:NZ'
const OTHER_GROUP = '__group__:brandA:AU'

function readerFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(wc.CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

const vision = out => out.statements.find(s => s.name === 'Vision')
const VISION = wc.BASE_STATEMENTS.find(s => s.name === 'Vision')
const optionOf = (out, id) => out.style.flatMap(r => r.options).find(o => o.id === id)

describe('the shipped content', () => {
  test('every editable piece carries its own identity, and the four tiers mint apart', () => {
    const ids = wc.BASE_STATEMENTS.flatMap(s => s.definition.concat(s.elements).map(r => r.id).concat([s.domain.id]))
      .concat(wc.BASE_STYLE.flatMap(r => r.options.map(o => o.id)))
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(Object.values(wc.ID_PREFIX_BY_TIER)).size).toBe(4)
  })
})

describe('resolving — the standard cascade', () => {
  test('a tier that has decided nothing sees the shipped content, every row inherited', async () => {
    const out = await wc.resolveDetailed('firm-a', readerFor({}))
    expect(vision(out).definition.map(r => r.id)).toEqual(VISION.definition.map(r => r.id))
    expect(vision(out).definition.every(r => r.source === 'inherited')).toBe(true)
    expect(vision(out).domain).toMatchObject({ rule: VISION.domain.rule, source: 'inherited' })
    expect(vision(out).maxWords).toMatchObject({ value: 45, source: 'inherited' })
  })

  test('🔴 the mentor’s edit, switch-off and addition reach a group two levels down — as inherited rows there', async () => {
    const store = {
      [MENTOR]: {
        statements: {
          Vision: {
            definition: {
              declined: ['ws-vision-d3'],
              overrides: { 'ws-vision-d2': { text: 'Reachable, with a date.' } },
              own: [{ id: 'mw-d1', basis: 'best-practice', text: 'Short enough to remember.', cites: [{ author: 'A', title: 'T' }] }]
            },
            rule: 'Present tense.'
          }
        },
        style: { overrides: { 'ws-style-voice-we': { instruction: 'Speak as "we", the whole team.' } } }
      }
    }
    const out = await wc.resolveDetailed(GROUP, readerFor(store))
    const rows = vision(out).definition
    expect(rows.map(r => r.id)).toEqual(['ws-vision-d1', 'ws-vision-d2', 'mw-d1'])
    expect(rows.every(r => r.source === 'inherited')).toBe(true)
    expect(rows[1].text).toBe('Reachable, with a date.')
    expect(rows[2]).toMatchObject({ basis: 'best-practice', cites: [{ author: 'A', title: 'T' }] })
    expect(vision(out).domain).toMatchObject({ rule: 'Present tense.', source: 'inherited' })
    expect(optionOf(out, 'ws-style-voice-we')).toMatchObject({ instruction: 'Speak as "we", the whole team.', source: 'inherited' })
  })

  test('a group’s changes reach nobody above it and no sibling group', async () => {
    const store = { [GROUP]: { statements: { Vision: { rule: 'NZ only.', maxWords: 30, maxWordsBaseline: 45 } } } }
    for (const scope of [MENTOR, GLOBAL, OTHER_GROUP, 'firm-a']) {
      const out = await wc.resolveDetailed(scope, readerFor(store))
      expect(vision(out).domain.rule).toBe(VISION.domain.rule)
      expect(vision(out).maxWords.value).toBe(45)
    }
  })

  test('🔴 an edited row is protected, and the change above it is offered — never applied', async () => {
    const store = {
      [GLOBAL]: {
        statements: { Vision: { definition: { overrides: { 'ws-vision-d1': { text: 'The brand’s wording.' } }, baselines: { 'ws-vision-d1': VISION.definition[0].text } } } },
        style: { overrides: { 'ws-style-voice-we': { instruction: 'Theirs.' } }, baselines: { 'ws-style-voice-we': 'Speak as "we".' } }
      },
      [GROUP]: {
        statements: {
          Vision: {
            definition: { overrides: { 'ws-vision-d1': { text: 'Mine.' } }, baselines: { 'ws-vision-d1': VISION.definition[0].text } },
            rule: 'My rule.',
            ruleBaseline: 'An older rule.'
          }
        },
        style: { overrides: { 'ws-style-voice-we': { instruction: 'Mine too.' } }, baselines: { 'ws-style-voice-we': 'Speak as "we".' } }
      }
    }
    const out = await wc.resolveDetailed(GROUP, readerFor(store))
    expect(vision(out).definition[0]).toMatchObject({ text: 'Mine.', source: 'edited-here', changedAbove: true, above: 'The brand’s wording.' })
    expect(vision(out).domain).toMatchObject({ rule: 'My rule.', changedAbove: true, above: VISION.domain.rule })
    expect(optionOf(out, 'ws-style-voice-we')).toMatchObject({ instruction: 'Mine too.', source: 'edited-here', changedAbove: true, above: 'Theirs.' })
  })

  test('a row switched off here is listed as switched off, and its basis and sources survive the cascade', async () => {
    const store = { 'firm-a': { statements: { Vision: { definition: { declined: ['ws-vision-d2'] } } } } }
    const out = await wc.resolveDetailed('firm-a', readerFor(store))
    expect(vision(out).definitionDeclined.map(r => r.id)).toEqual(['ws-vision-d2'])
    expect(vision(out).definition.find(r => r.id === 'ws-vision-d3')).toMatchObject({ basis: 'best-practice', source: 'inherited' })
    expect(vision(out).definition.find(r => r.id === 'ws-vision-d3').cites.length).toBeGreaterThan(0)
  })

  test('malformed storage for one statement never stops the rest', async () => {
    const store = { 'firm-a': { statements: { Vision: 'junk', Purpose: { rule: 42, maxWords: 999, definition: { own: [{ id: 'x' }] } } } } }
    const out = await wc.resolveDetailed('firm-a', readerFor(store))
    expect(out.statements).toHaveLength(5)
    expect(out.statements.find(s => s.name === 'Purpose').maxWords.value).toBe(40)
  })
})

describe('the content Wordsmith writes with', () => {
  test('a firm’s changes reach the model: its rule, its word limit, its own question and its style wording', async () => {
    const store = {
      'firm-a': {
        statements: {
          Vision: { rule: 'Our rule.', maxWords: 30, questions: { own: [{ id: 'fw-q1', question: 'Who will notice first?' }] } }
        },
        style: { overrides: { 'ws-style-voice-we': { instruction: 'Speak as "we", the whole team together.' } } }
      }
    }
    const content = await wc.loadResolvedContent('firm-a', readerFor(store))
    const v = content.statements.find(s => s.name === 'Vision')
    const [system] = ws.buildDraftMessages({ statement: v, quotes: [], purpose: 'p', style: 's', settings: { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'we', tone: [], audience: '' }, styleSettings: content.styleSettings, modelElements: v.elements.filter(e => e.detect === 'model') })
    expect(system.content).toContain('Our rule.')
    expect(system.content).toContain('At most 30 words')
    expect(system.content).toContain('fw-q1')
    expect(system.content).toContain('the whole team together')
    expect(system.content).not.toContain('source')
  })

  test('🔴 it rejects rather than handing a firm the mentor’s content it could not read', async () => {
    const reader = () => Promise.reject(new Error('ER_ACCESS_DENIED'))
    await expect(wc.loadResolvedContent('firm-a', reader)).rejects.toThrow('ER_ACCESS_DENIED')
  })

  test('it rejects content that fails the engine’s checks — a statement left with no definition', async () => {
    const all = VISION.definition.map(r => r.id)
    const store = { 'firm-a': { statements: { Vision: { definition: { declined: all } } } } }
    await expect(wc.loadResolvedContent('firm-a', readerFor(store))).rejects.toThrow(/Vision needs at least one definition row/)
  })
})

describe('what arrives from a request', () => {
  test.each([
    [undefined, true],
    [[{ author: 'Lencioni', title: 'Make Your Values Mean Something', url: 'https://hbr.org/x' }], true],
    [[{ author: 'A', title: 'T', url: 'javascript:alert(1)' }], false],
    [[{ author: '', title: 'T' }], false],
    [new Array(6).fill({ author: 'A', title: 'T' }), false],
    ['a string', false]
  ])('sources %#', (raw, ok) => {
    expect(wc.checkCites(raw).ok).toBe(ok)
  })

  test.each([[9, false], [10, true], [120, true], [121, false], ['45', true], [45.5, false]])('a word limit of %p', (n, ok) => {
    expect(wc.checkMaxWords(n).ok).toBe(ok)
  })

  test('an own id is never handed back after removal, and each part numbers apart', () => {
    expect(wc.nextOwnId('firm-a', 'definition', [], 3)).toEqual({ id: 'fw-d4', seq: 4 })
    expect(wc.nextOwnId(MENTOR, 'questions', [{ id: 'mw-q2' }])).toEqual({ id: 'mw-q3', seq: 3 })
  })

  test('the stored shape keeps only decisions, and reads back the same', () => {
    const state = wc.readState({ statements: { Mission: { maxWords: 50, maxWordsBaseline: 45 } } })
    const stored = wc.toStored(state)
    expect(Object.keys(stored.statements)).toEqual(['Mission'])
    expect(wc.readState(stored)).toEqual(state)
  })
})

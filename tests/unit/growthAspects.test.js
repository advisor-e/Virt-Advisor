'use strict'

/**
 * The Growth Aspects as each tier works to them — item 15.2, screens 3 and 3b.
 *
 * WHAT UAT CANNOT SEE. A manager changes a question and sees it saved on their own screen.
 * They cannot see whether it reached the firms below them, whether it leaked UP to the tier
 * above or across to a sibling, whether their own edit was silently overwritten when the
 * tier above changed the same question, or whether a question the tier above improved
 * stopped reaching them because they once touched a different one. Those are the
 * assertions here — the standard cascade rules (`tier-cascade.md` P3, P11) proved on this
 * block. The shipped wording is pinned once, in growthAspectQuestions.test.js.
 */

const ga = require('../../server/utils/growthAspects')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const MENTOR = PLATFORM_SCOPE
const GLOBAL = '__global__:brandA'
const GROUP = '__group__:brandA:NZ'
const OTHER_GROUP = '__group__:brandA:AU'

/** A reader over `{ scopeId: storedState }`, standing in for the overlay store. */
function readerFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(ga.CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

/** A stored state holding decisions for one aspect. */
const stored = (aspect, decisions) => ({ aspects: { [aspect]: decisions } })

const gov = list => list.find(a => a.name === 'Governance')
const GOV = ga.BASE_ASPECTS.find(a => a.name === 'Governance')

describe('the shipped nine', () => {
  test('every shipped question has its own identity, numbered within its aspect', () => {
    const ids = ga.BASE_ASPECTS.flatMap(a => a.questions.map(q => q.id))
    expect(ids).toHaveLength(98)
    expect(new Set(ids).size).toBe(98)
    expect(GOV.questions[0].id).toBe('ga-governance-1')
    expect(ga.BASE_ASPECTS.find(a => a.name === 'Sales (Process)').questions[7].id).toBe('ga-sales-process-8')
  })

  test('the four tiers mint under four prefixes, none of them the shipped one', () => {
    const prefixes = Object.values(ga.ID_PREFIX_BY_TIER).concat([ga.SHIPPED_PREFIX])
    expect(new Set(prefixes).size).toBe(5)
  })
})

describe('resolving — the standard cascade', () => {
  test('a tier that has decided nothing sees the shipped nine, every row inherited', async () => {
    const out = await ga.resolveDetailed('firm-a', readerFor({}))
    expect(gov(out).questions).toHaveLength(14)
    expect(gov(out).questions.every(q => q.source === 'inherited')).toBe(true)
    expect(gov(out).descriptionSource).toBe('inherited')
  })

  test('🔴 the mentor’s edit, switch-off and addition all reach a firm — as inherited rows there', async () => {
    const out = await ga.resolveDetailed('firm-a', readerFor({
      [MENTOR]: stored('Governance', {
        overrides: { 'ga-governance-2': { text: 'Mentor edit?' } },
        baselines: { 'ga-governance-2': GOV.questions[1].text },
        declined: ['ga-governance-3'],
        own: [{ id: 'mq-1', text: 'Mentor added?' }]
      })
    }))
    const qs = gov(out).questions
    expect(qs).toHaveLength(14)
    expect(qs[1]).toMatchObject({ id: 'ga-governance-2', text: 'Mentor edit?', source: 'inherited' })
    expect(qs.some(q => q.id === 'ga-governance-3')).toBe(false)
    expect(qs[13]).toMatchObject({ id: 'mq-1', text: 'Mentor added?', source: 'inherited' })
  })

  test('🔴 what a tier does reaches the tiers below it, never the tier above or a sibling', async () => {
    const reader = readerFor({ [GROUP]: stored('Governance', { own: [{ id: 'gq-1', text: 'Group added?' }], declined: ['ga-governance-1'] }) })
    const texts = async scope => gov(await ga.resolveDetailed(scope, reader)).questions.map(q => q.text)

    expect(await texts(GROUP)).toContain('Group added?')
    expect(await texts(GLOBAL)).not.toContain('Group added?')
    expect(await texts(MENTOR)).not.toContain('Group added?')
    expect(await texts(OTHER_GROUP)).not.toContain('Group added?')
    expect(await texts(OTHER_GROUP)).toContain(GOV.questions[0].text)
  })

  test('an untouched inherited question keeps receiving the tier above’s improvements', async () => {
    const out = await ga.resolveDetailed(GROUP, readerFor({
      [MENTOR]: stored('Governance', { overrides: { 'ga-governance-1': { text: 'Improved?' } }, baselines: { 'ga-governance-1': GOV.questions[0].text } }),
      [GROUP]: stored('Governance', { declined: ['ga-governance-5'] })
    }))
    expect(gov(out).questions[0]).toMatchObject({ text: 'Improved?', source: 'inherited', changedAbove: false })
  })

  test('🔴 an edited question stays as edited when the tier above rewrites it — the change is offered', async () => {
    const out = await ga.resolveDetailed(GROUP, readerFor({
      [MENTOR]: stored('Governance', { overrides: { 'ga-governance-3': { text: 'Mentor rewrote it?' } }, baselines: { 'ga-governance-3': GOV.questions[2].text } }),
      [GROUP]: stored('Governance', { overrides: { 'ga-governance-3': { text: 'Our version?' } }, baselines: { 'ga-governance-3': GOV.questions[2].text } })
    }))
    expect(gov(out).questions[2]).toEqual({
      id: 'ga-governance-3', text: 'Our version?', source: 'edited-here', changedAbove: true, above: 'Mentor rewrote it?'
    })
  })

  test('an edit made against the current wording above is not offered anything', async () => {
    const out = await ga.resolveDetailed(GROUP, readerFor({
      [GROUP]: stored('Governance', { overrides: { 'ga-governance-3': { text: 'Ours?' } }, baselines: { 'ga-governance-3': GOV.questions[2].text } })
    }))
    expect(gov(out).questions[2]).toMatchObject({ source: 'edited-here', changedAbove: false })
    expect(gov(out).questions[2].above).toBeUndefined()
  })

  test('the description cascades the same way, with the same offer', async () => {
    const out = await ga.resolveDetailed(GROUP, readerFor({
      [GLOBAL]: stored('Governance', { description: 'Global words.', descriptionBaseline: GOV.description }),
      [GROUP]: stored('Governance', { description: 'Group words.', descriptionBaseline: GOV.description })
    }))
    expect(gov(out)).toMatchObject({
      description: 'Group words.', descriptionSource: 'edited-here', descriptionChangedAbove: true, descriptionAbove: 'Global words.'
    })
  })

  test('a switched-off question is listed with its words, so it can be switched back on', async () => {
    const out = await ga.resolveDetailed('firm-a', readerFor({ 'firm-a': stored('Governance', { declined: ['ga-governance-4', 'nope'] }) }))
    expect(gov(out).declined).toEqual([{ id: 'ga-governance-4', text: GOV.questions[3].text }])
  })

  test('the advisor’s view is plain wording, and never rejects: a store fault gives the shipped nine', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const out = await ga.loadResolvedAspects('firm-a', () => Promise.reject(new Error('down')))
    expect(gov(out)).toEqual({ name: 'Governance', description: GOV.description, questions: GOV.questions.map(q => q.text) })
    console.error.mockRestore()
  })
})

describe('reading stored decisions', () => {
  test('keeps what is well-formed and drops the rest, never throwing', () => {
    const s = ga.readState({
      aspects: {
        Governance: { declined: ['ga-governance-1', 7, ''], overrides: { a: { text: 'ok' }, b: { text: '' }, c: 'x' }, own: [{ id: 'fq-1', text: 'Q?' }, { id: 'fq-2' }, null], baselines: { a: 'was', b: 3 } },
        'Not an aspect': { declined: ['x'] }
      }
    })
    expect(s.Governance).toEqual({
      declined: ['ga-governance-1'],
      overrides: { a: { text: 'ok' } },
      baselines: { a: 'was' },
      own: [{ id: 'fq-1', text: 'Q?' }],
      description: undefined,
      descriptionBaseline: undefined
    })
    expect(Object.keys(s)).toEqual(ga.ASPECT_NAMES)
    expect(ga.readState('garbage').Governance.declined).toEqual([])
  })

  test('only aspects holding a decision are written back', () => {
    const s = ga.readState(null)
    s.Governance.declined = ['ga-governance-1']
    expect(ga.toStored(s)).toEqual({ aspects: { Governance: { declined: ['ga-governance-1'] } } })
  })
})

describe('minting ids', () => {
  test('each tier mints under its own prefix', () => {
    expect(ga.nextOwnId(MENTOR, [], undefined).id).toBe('mq-1')
    expect(ga.nextOwnId(GLOBAL, [], undefined).id).toBe('xq-1')
    expect(ga.nextOwnId(GROUP, [], undefined).id).toBe('gq-1')
    expect(ga.nextOwnId('firm-a', [], undefined).id).toBe('fq-1')
  })

  test('🔴 removing the highest question never hands its id to the next one added', () => {
    expect(ga.nextOwnId('firm-a', [{ id: 'fq-1' }], 2).id).toBe('fq-3')
    expect(ga.nextOwnId('firm-a', [{ id: 'fq-4' }], 2).id).toBe('fq-5')
  })
})

describe('checking what a manager types', () => {
  test.each([
    ['', 'cannot be blank'],
    ['   ', 'cannot be blank'],
    [7, 'cannot be blank'],
    ['x'.repeat(1001), '1000 characters at most']
  ])('refuses the question %p', (raw, message) => {
    expect(ga.checkQuestionText(raw).error).toContain(message)
  })

  test('trims an accepted question, and refuses an overlong description', () => {
    expect(ga.checkQuestionText('  Q?  ')).toEqual({ ok: true, value: 'Q?', error: null })
    expect(ga.checkDescriptionText('x'.repeat(401)).error).toContain('400 characters at most')
    expect(ga.checkDescriptionText('').error).toContain('cannot be blank')
  })
})

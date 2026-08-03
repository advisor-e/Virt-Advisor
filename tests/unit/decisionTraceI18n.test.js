/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')

/**
 * THE "WHY THIS RECOMMENDATION" PANEL, IN EVERY LANGUAGE THE APP SHIPS.
 *
 * The app ships 8 locales and translates by sending the whole English message
 * set to /api/translate/locale at runtime (mixins/localeMixin.js) — so a string
 * reaches every language the moment it reaches en.json, and reaches NONE of them
 * while it sits in a template. Until 2026-08-04 this panel sat in templates: a
 * Spanish-speaking adviser read the entire decision trace in English.
 *
 * Two kinds of test here, because neither alone is enough:
 *   1. RENDER — mount both components with a `$t` that returns the KEY, then
 *      assert no English survives on screen. This is what proves the words come
 *      from the locale file rather than the template.
 *   2. SOURCE — scan the two components for the old literals. A render test only
 *      covers the branches it happens to switch on; the near-miss intro, the
 *      failure sections and the "Moved ✓" state each need their own state.
 *
 * ⚠ Deliberately the OPPOSITE convention to decisionTraceAiFailure.render.test.js,
 * which asserts English words on purpose (Mike ruled on those two sentences
 * specifically, so a key-based assertion would let a rewording through). Here the
 * wording is unchanged by this work and its LOCATION is the subject, so a
 * key-returning `$t` is the right stand-in. Both files guard the same panel.
 */

/** `$t` stand-in returning the key, so any English on screen came from a template. */
const keyT = key => key
/** `$tc` stand-in — same idea, for the pluralised template count. */
const keyTc = key => key

const TRACE = {
  domain: { id: 'governance', label: 'Governance & Leadership' },
  lenses: { engagementType: 'advice', complexityCeiling: 'moderate', problemSignals: {}, templateBudget: 3, signalTypes: [] },
  distinctions: {
    evaluatedDomain: 'governance',
    note: '',
    aiFailed: false,
    nearMissAiFailed: false,
    boostsApplied: {},
    nearMisses: [{ id: 'nm1', description: 'A distinction of yours', domain: 'profit' }]
  },
  templateScores: [{ rank: 1, title: 'A template', score: 42, matchReasons: ['tag:profit'] }],
  budget: {}
}

/**
 * Every English phrase this panel used to hold in its markup or its methods.
 * A phrase reappearing in either component is the defect coming back.
 */
const OLD_LITERALS = [
  'Why this recommendation',
  'Area I focused on',
  'Area focused on:',
  'What shaped the advice',
  'Boosted here:',
  'No distinction changed the scoring in this area.',
  'Filed elsewhere — may belong here',
  'These distinctions of yours live in another area',
  'These distinctions live in another area',
  '— currently in',
  'How the templates scored',
  'No decision trace was recorded for this case.',
  'Move it here',
  'Moved ✓',
  // The six that hid in JavaScript rather than in a template — the ones a reader
  // scanning the Pug for English would never have found.
  'matches the area',
  'core to this area',
  'fits the engagement type',
  'already delivered to this client',
  'delivered before and went less well',
  'firm distinction +'
]

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

describe('the locale file carries the whole panel', () => {
  const REQUIRED = [
    'whyThis', 'areaFocused', 'whatShaped', 'distinctions', 'boostedHere',
    'noDistinction', 'filedElsewhere', 'nearMissIntro', 'currentlyIn',
    'templatesScored', 'colTemplate', 'colScore', 'colWhy',
    'lensEngagement', 'lensCeiling', 'lensBudget', 'lensTemplates',
    'reasonDistinction', 'reasonTag', 'reasonPrimary', 'reasonEngagement',
    'reasonDelivered', 'reasonWentLess',
    'caseAreaFocused', 'caseWhatShaped', 'caseNearMissIntro', 'caseMoved',
    'caseMoveHere', 'caseNoTrace'
  ]

  test.each(REQUIRED)('decisionTrace.%s is a non-empty string', (key) => {
    expect(typeof EN.decisionTrace[key]).toBe('string')
    expect(EN.decisionTrace[key].length).toBeGreaterThan(0)
  })

  test('the interpolated keys keep their placeholders', () => {
    // A translation that drops {area} silently loses the domain name mid-sentence.
    expect(EN.decisionTrace.nearMissIntro).toContain('{area}')
    expect(EN.decisionTrace.currentlyIn).toContain('{area}')
    expect(EN.decisionTrace.reasonDistinction).toContain('{points}')
    expect(EN.decisionTrace.lensTemplates).toContain('|') // singular | plural
  })

  test('the wording is unchanged from what shipped in English', () => {
    // This work MOVED text; it did not reword it. These are the exact strings
    // that were on screen before, so a paraphrase slipped in during the move
    // fails here rather than reaching an adviser.
    expect(EN.decisionTrace.whyThis).toBe('Why this recommendation')
    expect(EN.decisionTrace.areaFocused).toBe('Area I focused on')
    expect(EN.decisionTrace.noDistinction).toBe('No distinction changed the scoring in this area.')
    expect(EN.decisionTrace.filedElsewhere).toBe('Filed elsewhere — may belong here')
    expect(EN.decisionTrace.reasonDelivered).toBe('already delivered to this client — held back')
  })
})

describe('the source of both components holds no English for this panel', () => {
  test.each([
    ['components/VirtualAdvisor.vue', 394, 445],
    ['components/FirmManagerHub.vue', 460, 530]
  ])('%s trace panel', (file, from, to) => {
    // Only the panel's own lines: both files are thousands of lines long and the
    // rest of them is not this task.
    const region = fs.readFileSync(file, 'utf8').split('\n').slice(from - 1, to)
      // Comments explain the history and legitimately quote the old wording.
      .filter(line => !/^\s*\/\//.test(line))
      .join('\n')

    const found = OLD_LITERALS.filter(phrase => region.includes(phrase))
    expect(found).toEqual([])
  })
})

describe('a non-English adviser sees no English in the live panel', () => {
  const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

  async function panel () {
    const wrapper = mountWithBuefy(VirtualAdvisor, { mocks: { $t: keyT, $tc: keyTc } })
    await wrapper.setData({
      mode: 'client',
      lastTrace: TRACE,
      recommendationDelivered: true,
      showTracePanel: true
    })
    return wrapper
  }

  it('renders keys, not English, throughout the panel', async () => {
    const text = (await panel()).text()
    OLD_LITERALS.forEach((phrase) => {
      expect(text).not.toContain(phrase)
    })
  })

  it('still shows the panel — a blank trace would pass the test above', async () => {
    // The failure this guards against: wiring every label to a key that resolves
    // to nothing, which reads as "no English" and as an empty screen.
    const text = (await panel()).text()
    expect(text).toContain('decisionTrace.whyThis')
    expect(text).toContain('decisionTrace.templatesScored')
    expect(text).toContain('A template') // the data still lands beside the labels
  })

  it('the score reasons come from the locale file, not from the method', async () => {
    // 'tag:profit' used to become the literal 'matches the area' inside
    // humanizeReasons() — display text a mile from any template.
    expect((await panel()).text()).toContain('decisionTrace.reasonTag')
  })

  it('an unrecognised reason still passes through untranslated, as before', () => {
    const wrapper = mountWithBuefy(VirtualAdvisor, { mocks: { $t: keyT, $tc: keyTc } })
    expect(wrapper.vm.humanizeReasons(['something:new'])).toBe('something:new')
  })
})

describe('a non-English firm manager sees no English on a saved case', () => {
  const FirmManagerHub = require('~/components/FirmManagerHub.vue').default

  async function savedCase () {
    const wrapper = mountWithBuefy(FirmManagerHub, {
      propsData: { apiToken: 't' },
      mocks: { $t: keyT, $tc: keyTc },
      stubs: {
        'firm-adviser-network': true,
        'firm-team-progress': true,
        'firm-logic-lab': true,
        'firm-decision-logic': true,
        'firm-quiz-builder': true,
        'firm-domain-support': true
      }
    })
    await wrapper.setData({
      loadingFirmCases: false,
      firmCases: [{ id: 9, title: 'A shared case', domain: 'governance', createdAt: '2026-08-03', decisionTrace: TRACE }],
      expandedReviewCaseId: 9
    })
    return wrapper
  }

  it('renders keys, not English, throughout the saved trace', async () => {
    const text = (await savedCase()).text()
    OLD_LITERALS.forEach((phrase) => {
      expect(text).not.toContain(phrase)
    })
  })

  it('still shows the saved trace', async () => {
    const text = (await savedCase()).text()
    expect(text).toContain('decisionTrace.caseAreaFocused')
    expect(text).toContain('decisionTrace.templatesScored')
  })

  it('shares its keys with the live panel where the wording is identical', async () => {
    // Two copies of a label drift apart; the AI-failure sentences already proved
    // that on this very panel. Same key, both screens.
    const text = (await savedCase()).text()
    expect(text).toContain('decisionTrace.distinctions')
    expect(text).toContain('decisionTrace.filedElsewhere')
    expect(text).toContain('decisionTrace.colTemplate')
  })
})

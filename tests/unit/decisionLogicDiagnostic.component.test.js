/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const DecisionLogicDiagnostic = require('~/components/firm/DecisionLogicDiagnostic.vue').default

/**
 * Sections 4 and 5 of the Decision Logic page.
 * Spec: design/mockups/decision-logic-map-mockup.html (approved 2026-08-02).
 *
 * The things that would mislead a firm manager if they broke:
 *
 *   1. "Other engine factors" must always appear, on every row, so the
 *      arithmetic never has a gap. A score that does not add up loses the
 *      reader, and the withheld part is the platform's protected scoring.
 *   2. THREE honest limits, never collapsible — including the one added
 *      2026-08-03 saying this ran from a sentence alone.
 *   3. The ideas must be built from the firm's OWN material. The suggested
 *      distinction is the advisor's sentence quoted back; this app must never
 *      draft a firm's IP for it.
 *   4. A failed run must not leave the previous answer on screen looking like
 *      the new one.
 */

const MEASURED = {
  basis: 'scenario-lab',
  caseCount: 51,
  turnedOnTablesAlone: 3,
  turnedOnDistinctionsAlone: 29,
  averageTopTwoMargin: 3.0
}

const RESULT = {
  scored: true,
  reason: null,
  domain: 'governance',
  distinctionsAvailable: true,
  probe: {
    domains: [{ id: 'governance', label: 'Governance & Leadership', count: 3 }],
    tables: [{ id: 'board_conduct', name: 'Board Conduct', matched: ['decision making'] }],
    signals: [],
    distinctions: {
      measured: true,
      domain: 'governance',
      considered: 6,
      matched: [
        { id: 3, description: 'Poor decision quality', boost: 5, templates: ['Governance Introduction'], source: 'firm-own' }
      ]
    }
  },
  sheet: [
    {
      rank: 1,
      title: 'Governance Introduction',
      score: 19,
      reasons: [
        { kind: 'distinction', points: 5, code: 'distinction:+5' },
        { kind: 'tree_hint', points: 3, code: 'tree_hint:+3' }
      ],
      otherFactors: 11,
      hasFirmLever: true
    },
    {
      rank: 4,
      title: 'Board Member Conduct',
      score: 12,
      reasons: [{ kind: 'tree_hint', points: 3, code: 'tree_hint:+3' }],
      otherFactors: 9,
      hasFirmLever: true
    }
  ],
  expected: {
    rank: 4,
    title: 'Board Member Conduct',
    score: 12,
    reasons: [{ kind: 'tree_hint', points: 3, code: 'tree_hint:+3' }],
    otherFactors: 9,
    hasFirmLever: true
  },
  gap: 7,
  assumptions: { fromSentenceOnly: true, templatesConsidered: 280 }
}

function mountDx (opts = {}) {
  const wrapper = mountWithBuefy(DecisionLogicDiagnostic, {
    propsData: {
      apiToken: 'test-token',
      domainLabels: { governance: 'Governance & Leadership' },
      measured: MEASURED,
      distinctionBoost: 5,
      treeBoost: 3,
      ...(opts.propsData || {})
    }
  })
  wrapper.setMethods({ api: jest.fn().mockResolvedValue({ titles: ['Board Member Conduct'] }) })
  return wrapper
}

async function runWith (wrapper, result) {
  wrapper.setMethods({ api: jest.fn().mockResolvedValue(result) })
  wrapper.setData({ text: 'poor decision making and no clear direction' })
  await wrapper.vm.run()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('DecisionLogicDiagnostic — the score sheet', () => {
  it('shows the withheld total on EVERY row, so the numbers always add up', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    const text = wrapper.text()

    expect(text).toContain('firmDecisionLogic.dxChipOther {"points":"+11"}')
    expect(text).toContain('firmDecisionLogic.dxChipOther {"points":"+9"}')
  })

  it('names the distinction behind the points when exactly one matched', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    expect(wrapper.text()).toContain(
      'firmDecisionLogic.dxChipDistinctionNamed {"name":"Poor decision quality","points":5}'
    )
  })

  it('falls back to the unnamed chip when two distinctions point at one template', async () => {
    const twoMatched = JSON.parse(JSON.stringify(RESULT))
    twoMatched.probe.distinctions.matched.push({
      id: 4, description: 'Board drift', boost: 5, templates: ['Governance Introduction'], source: 'firm-own'
    })
    const wrapper = await runWith(mountDx(), twoMatched)

    // Naming the wrong one is worse than naming none.
    expect(wrapper.text()).toContain('firmDecisionLogic.dxChipDistinction {"points":5}')
    expect(wrapper.text()).not.toContain('dxChipDistinctionNamed')
  })

  it('flags the expected template as having had no distinction of yours', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    expect(wrapper.text()).toContain('firmDecisionLogic.dxChipNoDistinction')
  })

  it('prints a negative remainder with a minus, never a plus', async () => {
    const penalised = JSON.parse(JSON.stringify(RESULT))
    penalised.sheet[1].otherFactors = -1
    penalised.sheet[1].score = 2
    const wrapper = await runWith(mountDx(), penalised)
    expect(wrapper.text()).toContain('firmDecisionLogic.dxChipOther {"points":"−1"}')
  })

  it('states the gap and what to do about it', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    const text = wrapper.text()
    expect(text).toContain('firmDecisionLogic.dxGapHead {"points":7}')
    expect(wrapper.vm.gapCase).toBe('noDistinction')
    expect(text).toContain('firmDecisionLogic.dxGapDoD {"distinction":5}')
    expect(text).toContain('firmDecisionLogic.dxGapDoF {"tree":3}')
  })

  // ── The arithmetic defect, found by Mike on the running app 2026-08-03 ──────
  // The artefact's closing sentence ("Either alone leaves you short; both close
  // it") is true only for its own 7-point example. At a gap of 3 the page said a
  // distinction would not be enough while its own table showed 6 + 5 = 11 beating
  // the top score of 9. The verdict is now derived from those numbers.
  describe('the closing verdict follows the real numbers', () => {
    /** @param {number} expectedScore @param {number} topScore */
    function withScores (expectedScore, topScore) {
      const r = JSON.parse(JSON.stringify(RESULT))
      r.sheet[0].score = topScore
      r.expected.score = expectedScore
      r.sheet[1].score = expectedScore
      r.gap = topScore - expectedScore
      return runWith(mountDx(), r)
    }

    it('a 3-point gap: the distinction alone is enough (6 + 5 = 11 beats 9)', async () => {
      const wrapper = await withScores(6, 9)
      expect(wrapper.vm.scoreWithDistinction).toBe(11)
      expect(wrapper.vm.gapVerdictKey).toBe('dxVerdictDistinction')
      expect(wrapper.text()).toContain('firmDecisionLogic.dxVerdictDistinction')
      // The sentence that was wrong must not be reachable any more.
      expect(wrapper.text()).not.toContain('dxVerdictBoth')
    })

    it('a 1-point gap: either lever alone is enough', async () => {
      const wrapper = await withScores(8, 9)
      expect(wrapper.vm.gapVerdictKey).toBe('dxVerdictEither')
    })

    it('a 7-point gap: neither alone, both together — the artefact’s own case', async () => {
      const wrapper = await withScores(12, 19)
      expect(wrapper.vm.gapVerdictKey).toBe('dxVerdictBoth')
    })

    it('a 20-point gap: says plainly that even both fall short', async () => {
      const wrapper = await withScores(2, 22)
      expect(wrapper.vm.gapVerdictKey).toBe('dxVerdictNeither')
    })

    it('treats drawing LEVEL as not enough — a tie is settled out of sight', async () => {
      // 4 + 5 = 9 exactly equals the top. Promising a win on a draw would be a
      // guess dressed up as arithmetic.
      const wrapper = await withScores(4, 9)
      expect(wrapper.vm.scoreWithDistinction).toBe(9)
      expect(wrapper.vm.gapVerdictKey).not.toBe('dxVerdictDistinction')
      expect(wrapper.vm.gapVerdictKey).toBe('dxVerdictBoth')
    })

    it('shows both resulting scores, so the verdict can be checked against them', async () => {
      const wrapper = await withScores(6, 9)
      const text = wrapper.text()
      expect(text).toContain('firmDecisionLogic.dxGapMathB {"withDistinction":11}')
      expect(text).toContain('firmDecisionLogic.dxGapMathC {"withTree":9,"top":9}')
    })
  })

  describe('write a new distinction, or attach to the one that matched', () => {
    it('says ATTACH when a distinction already matched the conversation', async () => {
      // RESULT has "Poor decision quality" matching, pointing at a different
      // template. Telling the manager to write a new one contradicted the Ideas
      // section on the same screen.
      const wrapper = await runWith(mountDx(), RESULT)
      expect(wrapper.vm.gapAction).toBe('attach')
      expect(wrapper.text()).toContain('firmDecisionLogic.dxGapAttachB')
      expect(wrapper.text()).toContain('Poor decision quality')
      expect(wrapper.text()).not.toContain('firmDecisionLogic.dxGapDoA')
    })

    it('says WRITE when nothing of theirs matched at all', async () => {
      const none = JSON.parse(JSON.stringify(RESULT))
      none.probe.distinctions.matched = []
      const wrapper = await runWith(mountDx(), none)

      expect(wrapper.vm.gapAction).toBe('write')
      expect(wrapper.text()).toContain('firmDecisionLogic.dxGapDoA')
      expect(wrapper.text()).not.toContain('firmDecisionLogic.dxGapAttachB')
    })

    it('gives no instruction when a distinction already reached the template', async () => {
      const already = JSON.parse(JSON.stringify(RESULT))
      already.expected.reasons.push({ kind: 'distinction', points: 5, code: 'distinction:+5' })
      const wrapper = await runWith(mountDx(), already)

      expect(wrapper.vm.gapAction).toBe('none')
      expect(wrapper.find('.gap-do').exists()).toBe(false)
    })
  })

  it('changes the sentence when a distinction DID reach the expected template', async () => {
    const matched = JSON.parse(JSON.stringify(RESULT))
    matched.expected.reasons.push({ kind: 'distinction', points: 5, code: 'distinction:+5' })
    matched.sheet[1].reasons.push({ kind: 'distinction', points: 5, code: 'distinction:+5' })
    const wrapper = await runWith(mountDx(), matched)

    expect(wrapper.vm.gapCase).toBe('matched')
    expect(wrapper.text()).toContain('firmDecisionLogic.dxGapMatchedA')
    expect(wrapper.text()).not.toContain('firmDecisionLogic.dxGapNoneA')
  })

  it('says so when no lever of the firm’s reached the expected template at all', async () => {
    const bare = JSON.parse(JSON.stringify(RESULT))
    bare.expected.reasons = []
    bare.sheet[1].reasons = []
    const wrapper = await runWith(mountDx(), bare)

    expect(wrapper.vm.gapCase).toBe('noLever')
    expect(wrapper.text()).toContain('firmDecisionLogic.dxGapNoLeverA')
  })

  // ── The 2026-08-03 defect, found by Mike on the running app ────────────────
  // The page said "the engine did not rank this template at all" for a template
  // that had scored 1 — it had merely placed below the top 20 the ranking log
  // keeps. Three different facts now get three different sentences, and the gap
  // survives in all of them.
  it('says it placed below the sheet — NOT that the engine ignored it', async () => {
    const outside = JSON.parse(JSON.stringify(RESULT))
    outside.expected = {
      rank: null,
      title: 'Governance Introduction',
      score: 1,
      reasons: [],
      otherFactors: 1,
      hasFirmLever: false,
      outsideSheet: true
    }
    outside.gap = 18
    const wrapper = await runWith(mountDx(), outside)

    expect(wrapper.text()).toContain('firmDecisionLogic.dxOutsideSheet {"score":1,"shown":2}')
    // The gap is the whole point of the section, and it must not disappear for
    // the case where the shortfall is largest.
    expect(wrapper.find('.gap').exists()).toBe(true)
    expect(wrapper.text()).toContain('firmDecisionLogic.dxGapHead {"points":18}')
  })

  it('says it scored nothing when it genuinely scored nothing', async () => {
    const zero = JSON.parse(JSON.stringify(RESULT))
    zero.expected = {
      rank: null,
      title: 'Annual Board Plan',
      score: 0,
      reasons: [],
      otherFactors: 0,
      hasFirmLever: false,
      unscored: true,
      inLibrary: true
    }
    zero.gap = 19
    const wrapper = await runWith(mountDx(), zero)

    expect(wrapper.text()).toContain('firmDecisionLogic.dxUnscored')
    expect(wrapper.text()).not.toContain('firmDecisionLogic.dxOutsideSheet')
    expect(wrapper.find('.gap').exists()).toBe(true)
  })

  it('says the template is not in the library when it is not', async () => {
    const absent = JSON.parse(JSON.stringify(RESULT))
    absent.expected = {
      rank: null,
      title: 'A Template That Never Existed',
      score: 0,
      reasons: [],
      otherFactors: 0,
      hasFirmLever: false,
      unscored: true,
      inLibrary: false
    }
    absent.gap = 19
    const wrapper = await runWith(mountDx(), absent)

    expect(wrapper.text()).toContain('firmDecisionLogic.dxNotInLibrary')
    expect(wrapper.text()).not.toContain('firmDecisionLogic.dxUnscored')
  })

  it('explains why there is no ranking when no area was recognised', async () => {
    const wrapper = await runWith(mountDx(), {
      scored: false,
      reason: 'noDomain',
      distinctionsAvailable: true,
      probe: { domains: [], tables: [], signals: [], distinctions: {} },
      sheet: [],
      expected: null,
      gap: null
    })

    expect(wrapper.text()).toContain('firmDecisionLogic.dxNoScoring')
    expect(wrapper.find('table.score').exists()).toBe(false)
  })
})

describe('DecisionLogicDiagnostic — the honest limits', () => {
  it('shows all three, and they cannot be collapsed away', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    const caution = wrapper.find('.caution')

    expect(caution.exists()).toBe(true)
    expect(caution.text()).toContain('firmDecisionLogic.dxLimit1')
    expect(caution.text()).toContain('firmDecisionLogic.dxLimit2')
    // Added 2026-08-03 (approved): this ran from a sentence alone.
    expect(caution.text()).toContain('firmDecisionLogic.dxLimit3')
  })

  it('reports a distinction read failure as a fault, not as "none matched"', async () => {
    const broken = JSON.parse(JSON.stringify(RESULT))
    broken.distinctionsAvailable = false
    const wrapper = await runWith(mountDx(), broken)

    expect(wrapper.text()).toContain('firmDecisionLogic.dxDistUnavailable')
  })
})

describe('DecisionLogicDiagnostic — the ideas', () => {
  it('quotes the advisor’s own sentence back and never drafts wording', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    wrapper.setData({ showIdeas: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quote').text()).toContain('poor decision making and no clear direction')
  })

  it('places the quote INSIDE the sentence, where the artefact puts it', async () => {
    // Rendering it after the paragraph ran "worded cleverly:" straight into
    // "File it under …" and orphaned the advisor's words below (found by Mike,
    // 2026-08-03). The quote belongs between those two clauses.
    const wrapper = await runWith(mountDx(), RESULT)
    wrapper.setData({ showIdeas: true })
    await wrapper.vm.$nextTick()

    const how = wrapper.find('.i-how')
    expect(how.find('.quote').exists()).toBe(true)

    const parts = wrapper.vm.ideas.items[0].how
    const quoteAt = parts.findIndex(p => p.quote)
    const fileAt = parts.findIndex(p => p.text === 'firmDecisionLogic.ideaDistHowB')
    expect(quoteAt).toBeGreaterThan(-1)
    expect(quoteAt).toBeLessThan(fileAt)
  })

  it('leads with the distinction when none of the firm’s matched', async () => {
    const noDist = JSON.parse(JSON.stringify(RESULT))
    noDist.probe.distinctions.matched = []
    const wrapper = await runWith(mountDx(), noDist)
    wrapper.setData({ showIdeas: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.ideas.lede).toBe('firmDecisionLogic.ideasLedeNoDist')
    expect(wrapper.vm.ideas.items[0].lever).toBe('firmDecisionLogic.ideaDistinction')
  })

  it('drops selection advice entirely when the complaint was the wording', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    wrapper.setData({ problem: 'explain', showIdeas: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.ideas.items).toHaveLength(1)
    expect(wrapper.vm.ideas.items[0].lever).toBe('firmDecisionLogic.ideaDomainSupport')
    expect(wrapper.vm.ideas.lede).toBe('firmDecisionLogic.ideasLedeExplain')
  })

  it('pluralises the opened-table count', async () => {
    const two = JSON.parse(JSON.stringify(RESULT))
    two.probe.tables.push({ id: 'strategy_logic', name: 'Strategy Logic', matched: ['direction'] })
    const wrapper = await runWith(mountDx(), two)
    wrapper.setData({ showIdeas: true })
    await wrapper.vm.$nextTick()

    // $tc, so two tables never read "Only 2 table opened".
    expect(wrapper.vm.ideas.items[1].body[0].text).toBe('firmDecisionLogic.ideaTriggersBodySomeA 2')
  })

  it('lists domain support last, explicitly so it can be ruled out', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    const items = wrapper.vm.ideas.items
    expect(items).toHaveLength(3)
    expect(items[2].worth).toBe('firmDecisionLogic.worthNoneHere')
  })

  it('retires stale ideas when a fresh diagnosis is run', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    wrapper.setData({ showIdeas: true })
    await runWith(wrapper, RESULT)
    expect(wrapper.vm.showIdeas).toBe(false)
  })
})

describe('DecisionLogicDiagnostic — failures', () => {
  it('clears the previous answer so a failed run cannot look like a new one', async () => {
    const wrapper = await runWith(mountDx(), RESULT)
    expect(wrapper.vm.result).not.toBeNull()

    wrapper.setMethods({ api: jest.fn().mockRejectedValue(new Error('offline')) })
    await wrapper.vm.run()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.result).toBeNull()
    expect(wrapper.text()).toContain('firmDecisionLogic.dxFailed')
  })

  it('only sends the expected template for the wrong-template case', async () => {
    const wrapper = mountDx()
    const api = jest.fn().mockResolvedValue(RESULT)
    wrapper.setMethods({ api })
    wrapper.setData({ text: 'a sentence', problem: 'understand', expectedTitle: 'Board Member Conduct' })
    await wrapper.vm.run()

    expect(api).toHaveBeenLastCalledWith(
      'POST',
      '/api/firm-manager/logic-lab/diagnose',
      { text: 'a sentence', expectedTitle: null }
    )
  })
})

describe('DecisionLogicDiagnostic — finding the expected template', () => {
  // A plain dropdown over hundreds of templates is a haystack, not a picker
  // (Mike, 2026-08-03). It now filters as you type.
  const TITLES = ['Board Member Conduct', 'Governance Introduction', 'Annual Board Plan', 'Lite Strategy']

  it('matches anywhere in the name, not just the first word', async () => {
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES, expectedSearch: 'board' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredTitles).toEqual(['Board Member Conduct', 'Annual Board Plan'])

    wrapper.setData({ expectedSearch: 'conduct' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredTitles).toEqual(['Board Member Conduct'])
  })

  it('ignores case and surrounding spaces', async () => {
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES, expectedSearch: '  GOVERNANCE  ' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredTitles).toEqual(['Governance Introduction'])
  })

  it('offers the whole list before anything is typed', async () => {
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredTitles).toEqual(TITLES)
  })

  it('honours a full name typed without clicking the suggestion', () => {
    // Otherwise pressing the button after typing it out silently drops the
    // expectation, which is the whole point of the run.
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES, expectedSearch: 'governance introduction' })
    expect(wrapper.vm.resolvedExpectedTitle()).toBe('Governance Introduction')
  })

  it('does not guess from a partial search', () => {
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES, expectedSearch: 'govern' })
    expect(wrapper.vm.resolvedExpectedTitle()).toBeNull()
  })

  it('a selection wins over whatever is in the box', () => {
    const wrapper = mountDx()
    wrapper.setData({ titles: TITLES, expectedSearch: 'lite' })
    wrapper.vm.onExpectedSelect('Lite Strategy')
    expect(wrapper.vm.resolvedExpectedTitle()).toBe('Lite Strategy')
  })

  it('keeps the space before the matched phrase', async () => {
    // vue-i18n TRIMS each side of a "a | b" plural string, so a trailing space
    // in the locale file is eaten and it renders "opened on“decision making”".
    const wrapper = await runWith(mountDx(), RESULT)
    wrapper.setData({ showIdeas: true })
    await wrapper.vm.$nextTick()

    const parts = wrapper.vm.ideas.items[1].body
    expect(parts[1].text).toBe(' ')
    expect(parts[2].bold).toBe(true)
  })
})

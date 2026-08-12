/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const TemplateCheckEvidence = require('~/components/mentor/TemplateCheckEvidence.vue').default

/**
 * The Template Check row, opened out.
 *
 * Built to design/mockups/template-check-table-context.html, approved by Mike on
 * 2026-08-12 — including the seven labels ("good as they are") and how much of
 * the table a row shows ("just neighbouring branches - 1 above and below when
 * possible").
 *
 * What these tests pin is what the panel must never do: mark the wrong words,
 * present a weak match as a suggestion, or draw a row for a neighbour that does
 * not exist. Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js),
 * so the approved wording can be checked in one place — locales/en.json — rather
 * than being re-typed here where a drifted copy would still pass.
 */

/** One finding in the shape the route returns. */
function finding (over) {
  return Object.assign({
    key: 't::n::name',
    name: 'Decision Workpaper',
    table: 'Firm Board Pack',
    branchName: 'Combating Bias',
    where: 'prose',
    verdict: 'none',
    sentence: 'Use Quality Decisions frameworks. Use Decision Workpaper to structure future decisions.',
    listedIn: null,
    candidates: [],
    neighbours: [],
    tableBranches: 8
  }, over)
}

/** One neighbouring branch. */
function neighbour (over) {
  return Object.assign({
    ruleId: 'r1',
    branchName: 'Strategic Proposals',
    condition: 'wants to make a major capital purchase',
    then: 'Use Board White Paper framework…',
    state: 'settled',
    verdict: '',
    title: ''
  }, over)
}

describe('what the logic table says', () => {
  it('marks the name inside the sentence, and only the name', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, { propsData: { finding: finding() } })
    const marks = w.findAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks.at(0).text()).toBe('Decision Workpaper')
    // The sentence around it is still there in full — the mark is emphasis, not a filter.
    expect(w.find('.tc-sentence').text()).toContain('Use Quality Decisions frameworks')
  })

  it('says a formal reference has no sentence, and names the branches asking for it', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          where: 'list',
          sentence: '',
          listedIn: { field: 'templates', branches: ['Approach Methodology', 'Pipeline Stagnation'] }
        })
      }
    })
    expect(w.find('.tc-sentence').text()).toContain('templateCheck.evidence.namedInList')
    expect(w.find('.tc-branchlist').text()).toBe('Approach Methodology · Pipeline Stagnation')
  })
})

describe('where it sits in the table', () => {
  it('draws the branch between its neighbours and marks which row is this one', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          neighbours: [
            neighbour({ ruleId: 'a', branchName: 'Above', title: 'FM Board White Paper' }),
            neighbour({ ruleId: 'b', branchName: 'Combating Bias', state: 'here' }),
            neighbour({ ruleId: 'c', branchName: 'Below' })
          ]
        })
      }
    })
    const rows = w.findAll('.tc-mini tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows.at(1).classes()).toContain('tc-here')
    expect(rows.at(1).text()).toContain('templateCheck.evidence.thisRow')
    // The case the whole design exists for: the answer sitting one row up.
    expect(rows.at(0).text()).toContain('FM Board White Paper')
    expect(rows.at(2).text()).toContain('templateCheck.evidence.settled')
  })

  it('🔴 draws no blank row where a table has no branch above', () => {
    // "When possible" — ruled by Mike 2026-08-12. A padded row would say
    // something is hidden above the first branch of a table. Nothing is.
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          neighbours: [
            neighbour({ ruleId: 'b', branchName: 'First', state: 'here' }),
            neighbour({ ruleId: 'c', branchName: 'Second' })
          ]
        })
      }
    })
    expect(w.findAll('.tc-mini tbody tr')).toHaveLength(2)
  })

  it('shows an unanswered neighbour in the verdict wording already approved', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          neighbours: [neighbour({ state: 'open', verdict: 'none', title: 'Some Other Name' })]
        })
      }
    })
    expect(w.find('.tc-open').text()).toBe('templateCheck.verdict.none')
    expect(w.find('.tc-open-name').text()).toBe('Some Other Name')
  })

  it('does not call the whole table a sample of it', () => {
    const whole = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          tableBranches: 2,
          neighbours: [neighbour({ ruleId: 'a', state: 'here' }), neighbour({ ruleId: 'b' })]
        })
      }
    })
    expect(whole.find('.tc-note').text()).toContain('templateCheck.evidence.wholeTable')

    const part = mountWithBuefy(TemplateCheckEvidence, {
      propsData: {
        finding: finding({
          tableBranches: 8,
          neighbours: [neighbour({ ruleId: 'a', state: 'here' }), neighbour({ ruleId: 'b' })]
        })
      }
    })
    expect(part.find('.tc-note').text()).toContain('templateCheck.evidence.neighbourNote')
    expect(part.find('.tc-note').text()).toContain('"shown":2')
    expect(part.find('.tc-note').text()).toContain('"total":8')
  })
})

describe('what the app can open', () => {
  const STRONG = { title: 'Mgt Annual Plan', path: 'Firm Manager › Meetings', why: 'the name is nearly exact', summary: 'Structure for management meetings.', weak: false }
  const WEAK = { title: 'Lite Data', path: 'Do the Job › Lite Fundamentals', why: '2 of 3 words', summary: 'Interpreting data.', weak: true }

  it('heads the block "what the app can open" when something scored', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: { finding: finding({ candidates: [STRONG, WEAK] }) }
    })
    const labels = w.findAll('.tc-plab').wrappers.map(x => x.text())
    expect(labels).toContain('templateCheck.evidence.whatAppCanOpen')
    expect(labels).not.toContain('templateCheck.evidence.weakerMatches')
    // The best is the only one drawn as the suggestion; the rest are comparison.
    expect(w.findAll('.tc-cand--best')).toHaveLength(1)
    expect(w.findAll('.tc-cand--weak')).toHaveLength(1)
    expect(w.find('.tc-cand').text()).toContain('Firm Manager › Meetings')
  })

  it('🔴 heads it "weaker matches" and says so when nothing scored', () => {
    // The dead-end row. These are shown so it can be JUDGED — presenting them
    // under "what the app can open" would read as a suggestion, which is the
    // 2026-08-04 failure repeated.
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: { finding: finding({ candidates: [WEAK] }) }
    })
    const labels = w.findAll('.tc-plab').wrappers.map(x => x.text())
    expect(labels).toContain('templateCheck.evidence.weakerMatches')
    expect(labels).not.toContain('templateCheck.evidence.whatAppCanOpen')
    expect(w.text()).toContain('templateCheck.evidence.weakerNote')
    expect(w.findAll('.tc-cand--best')).toHaveLength(0)
  })

  it('shows what each document says about itself', () => {
    const w = mountWithBuefy(TemplateCheckEvidence, {
      propsData: { finding: finding({ candidates: [STRONG] }) }
    })
    // The blank-explanation bug of 2026-08-12: the element was in the approved
    // mockup and empty on every row from the day it shipped.
    expect(w.find('.tc-cpurpose').text()).toBe('Structure for management meetings.')
  })
})

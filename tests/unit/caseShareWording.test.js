/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')

/**
 * THE WORDING OF AN UPWARD CASE SHARE — ruled by Mike on 2026-08-11, "Set B".
 *
 * The artefact is design/WORDING-CASE-SHARE-CASCADE.md. This file is what makes the
 * ruling checkable afterwards, because the thing being protected is a sentence and
 * nothing about a sentence fails a build.
 *
 * WHY THE WORDING HAD TO MOVE. A case shared upward goes to EVERY managing level
 * above that firm at once, along its own branch. Nine strings said it went to one
 * place — "the mentor" — and one of the nine is read immediately before the manager
 * clicks approve. The material was anonymised either way, so no client was ever
 * exposed; the manager was simply told a smaller audience than the real one, on a
 * consent screen. That is the one place wording is not cosmetic.
 *
 * TWO KINDS OF ASSERTION, because neither alone holds:
 *   1. WORDING — the exact approved sentence. A key-returning `$t` proves a string
 *      came from the locale file but says nothing about what it says, and here what
 *      it says is the whole point.
 *   2. SOURCE + RENDER — the old mentor-only English is gone from both components
 *      and the screens ask for the keys. Wording alone would pass while the template
 *      still held a hardcoded copy nobody noticed.
 */

/**
 * Every mentor-only phrase these two screens used to hold. A phrase reappearing in
 * either file is the old single-destination wording coming back.
 */
const OLD_LITERALS = [
  'Mentor review',
  'Shared with the mentor',
  'Share an anonymised copy with the mentor',
  'Withdraw from mentor',
  'Share with mentor',
  'This is what the mentor will see',
  'Mentor — Case Reviews',
  'firm managers have shared with you'
]

describe('the locale file carries all nine sentences', () => {
  const REQUIRED = [
    'heading', 'sharedStatus', 'explain', 'withdraw', 'share',
    'previewTitle', 'consent', 'reviewTitle', 'reviewLede'
  ]

  test.each(REQUIRED)('caseShare.%s is a non-empty string', (key) => {
    expect(typeof EN.caseShare[key]).toBe('string')
    expect(EN.caseShare[key].length).toBeGreaterThan(0)
  })

  it('holds no key beyond the nine that were approved', () => {
    // A tenth string appearing here is wording that reached a screen without
    // passing through the artefact — the failure the artefact rule exists for.
    expect(Object.keys(EN.caseShare).sort()).toEqual(REQUIRED.slice().sort())
  })
})

describe('the approved Set B wording, word for word', () => {
  it('the firm manager sees the share flow as approved', () => {
    expect(EN.caseShare.heading).toBe('Share upward')
    expect(EN.caseShare.sharedStatus).toBe('Shared upward (anonymised)')
    expect(EN.caseShare.explain).toBe('Share an anonymised copy with your group manager, your global group manager and Advisor-e, to help improve the app. Client details are removed and you approve the copy first.')
    expect(EN.caseShare.withdraw).toBe('Stop sharing')
    expect(EN.caseShare.share).toBe('Share upward')
    expect(EN.caseShare.previewTitle).toBe('Share upward — check the anonymised copy')
  })

  it('🔴 the consent sentence names every level that receives the case', () => {
    // THE ONE THAT MATTERS. This is read immediately before clicking approve, so a
    // reworded or narrowed version is a consent screen understating its audience —
    // exactly the defect this whole change was raised to fix. Asserted by content
    // and not only by key, so a well-meaning tidy cannot drop a level.
    expect(EN.caseShare.consent).toContain('your group manager')
    expect(EN.caseShare.consent).toContain('your global group manager')
    expect(EN.caseShare.consent).toContain('Advisor-e')
    expect(EN.caseShare.consent).toBe('This is what your group manager, your global group manager and Advisor-e will see. Client names, the business and identifying details have been removed; the wording and tone are kept. Approve only if you\'re happy it\'s anonymous.')
  })

  it('the receiving screen is titled for whoever opens it', () => {
    // Was "Mentor — Case Reviews". Three tiers mount this component, so a group
    // manager was being greeted by another tier's name.
    expect(EN.caseShare.reviewTitle).toBe('Case Reviews')
    expect(EN.caseShare.reviewTitle).not.toMatch(/Mentor/i)
  })

  it('the receiving lede is Set B as ruled — "the firms in your group"', () => {
    // ⚠ RAISED AND OVERRULED, ON THE RECORD. This component is opened by the
    // mentor, the global group manager AND the group manager (TAB_TIERS.caseReviews
    // in FirmManagerHub.vue). "In your group" is exact for a group manager and loose
    // for the mentor, who sees every firm in every brand. Mike was shown that and
    // ruled Set B regardless on 2026-08-11.
    //
    // Pinned so the next reader finds a decision rather than an oversight: an
    // apparent inconsistency with no record looks identical to a mistake, and gets
    // "fixed" by someone who was not in the conversation.
    expect(EN.caseShare.reviewLede).toBe('Anonymised case studies shared by the firms in your group. Client names and identifying details are removed; the wording and tone are kept so you can see how the app performed and where it can improve.')
  })
})

describe('neither component still holds the mentor-only English', () => {
  test.each([
    ['components/FirmManagerHub.vue'],
    ['components/MentorReview.vue']
  ])('%s', (file) => {
    const source = fs.readFileSync(file, 'utf8').split('\n')
      // Comments explain the history and legitimately quote the old wording.
      .filter(line => !/^\s*\/\//.test(line))
      .join('\n')

    const found = OLD_LITERALS.filter(phrase => source.includes(phrase))
    expect(found).toEqual([])
  })
})

describe('the screens ask for the keys', () => {
  const FirmManagerHub = require('~/components/FirmManagerHub.vue').default
  const MentorReview = require('~/components/MentorReview.vue').default

  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
  })

  /** The firm manager's saved-case panel, expanded, with the share row on screen. */
  async function sharePanel (mentorShared) {
    const wrapper = mountWithBuefy(FirmManagerHub, {
      propsData: { apiToken: 't' },
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
      firmCases: [{ id: 9, title: 'A shared case', domain: 'governance', mentorShared }],
      expandedReviewCaseId: 9
    })
    return wrapper
  }

  it('offers the share when the case has not been shared', async () => {
    const text = (await sharePanel(false)).text()
    expect(text).toContain('caseShare.heading')
    expect(text).toContain('caseShare.explain')
    expect(text).toContain('caseShare.share')
  })

  it('offers withdrawal once it has', async () => {
    const text = (await sharePanel(true)).text()
    expect(text).toContain('caseShare.sharedStatus')
    expect(text).toContain('caseShare.withdraw')
  })

  it('the consent step asks for the consent key', async () => {
    const wrapper = await sharePanel(false)
    await wrapper.setData({
      showMentorPreview: true,
      mentorPreviewLoading: false,
      mentorPreview: { summary: 'An anonymised summary' }
    })
    const text = wrapper.text()
    expect(text).toContain('caseShare.previewTitle')
    expect(text).toContain('caseShare.consent')
  })

  it('the receiving screen asks for its own two keys', async () => {
    const wrapper = mountWithBuefy(MentorReview, { propsData: { apiToken: 't' } })
    await wrapper.setData({ loading: false, cases: [], awaitingFirms: false })
    const text = wrapper.text()
    expect(text).toContain('caseShare.reviewTitle')
    expect(text).toContain('caseShare.reviewLede')
    // A key resolving to nothing reads as "no English" and as an empty screen.
    OLD_LITERALS.forEach(phrase => expect(text).not.toContain(phrase))
  })
})

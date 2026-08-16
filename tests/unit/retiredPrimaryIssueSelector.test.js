'use strict'

/**
 * The primary-issue selector was retired from intake on 2026-06-10 — the engine infers
 * the primary issue rather than asking for it (`server/advisorEngine.js`: "primaryIssue
 * is NO LONGER a mandatory intake field"). The screen that used to ask it, and the
 * duplicate of the Workshop 1 list that fed it, were removed on 2026-08-14.
 *
 * Two things need holding, and neither is covered by any other test.
 *
 * 1. THE MARKER MUST STILL BE STRIPPED. Deleting the selector was safe; deleting the
 *    strip would NOT have been. Nothing emits `[PRIMARY_ISSUE_SELECTOR:profit]` today,
 *    but a model is not a compiler — if one ever produces it and the strip is gone, an
 *    advisor reads the raw marker in the middle of a reply. The strip is cheap and its
 *    absence is only visible to a user, so it is pinned here rather than trusted.
 *
 * 2. THE DUPLICATE MUST NOT COME BACK. The list is authored content and lives in
 *    `data/primary-issues.json`. It was copied into the component once already; the
 *    copies happened to be identical, which is luck, not a mechanism.
 *
 * Read against the SOURCE rather than by mounting, for the reason given in
 * `virtualAdvisorInput.component.test.js` — this is a property of the file.
 */

const fs = require('fs')
const path = require('path')

const SRC = fs.readFileSync(path.join(__dirname, '../../components/VirtualAdvisor.vue'), 'utf8')
const EN = require('../../locales/en.json')

describe('the retired primary-issue selector', () => {
  it('still strips the marker on BOTH reply paths, so it can never reach an advisor', () => {
    // Streaming and non-streaming are separate branches; the bug would be fixing one.
    const strips = SRC.match(/content\s*=\s*content\.replace\(\/\\\[PRIMARY_ISSUE_SELECTOR:\[\^\\\]\]\+\\\]\/g, ''\)/g) || []
    expect(strips.length).toBe(2)
  })

  it('no longer carries the selector, its state or its styles', () => {
    expect(SRC).not.toContain('showPrimaryIssueSelector')
    expect(SRC).not.toContain('selectedPrimaryIssue')
    expect(SRC).not.toContain('primaryIssueOptions')
    expect(SRC).not.toContain('.primary-issue-card')
    expect(SRC).not.toContain('submitPrimaryIssue')
  })

  it('does not hold a second copy of the Workshop 1 list', () => {
    // The const is the shape that drifted; a sample phrase catches a re-paste under
    // any name at all.
    expect(SRC).not.toContain('const PRIMARY_ISSUES')
    expect(SRC).not.toContain('Excessive discounting eroding margin')
  })

  it('leaves the canonical data file intact, and it is still readable', () => {
    // Deleting authored content is not the same act as deleting dead code. Nothing
    // reads this today; that is recorded in to-do.md 4.5a, not fixed by losing it.
    const data = require('../../data/primary-issues.json')
    expect(Object.keys(data).length).toBe(11)
    expect(data.profit).toContain('Excessive discounting eroding margin')
  })

  it('drops the selector-only wording keys without touching the shared ones', () => {
    expect(EN.advisor.primaryIssue).toBeUndefined()
    // `confirm` was shared with the domain selector, which is still live.
    expect(typeof EN.advisor.confirm).toBe('string')
    expect(typeof EN.advisor.domainSelector.title).toBe('string')
  })
})

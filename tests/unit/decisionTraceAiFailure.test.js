'use strict'

const fs = require('fs')
const path = require('path')

/**
 * THE SENTENCE THAT MUST NEVER BE SAID ABOUT A CALL THAT NEVER HAPPENED.
 *
 * Until 2026-08-03 a failed distinction-classifier call and a successful one that
 * matched nothing were the same value — an empty list — so both decision-trace
 * panels told the reader "No distinction changed the scoring in this area." while
 * the firm's biggest scoring lever had silently gone missing from the advice. The
 * engine now separates them (`distinctions.aiFailed`); these tests hold the two
 * screens to using it.
 *
 * ⚠ READ AGAINST THE SOURCE, NOT BY MOUNTING — the same reasoning the input test
 * in `virtualAdvisorInput.component.test.js` sets out. VirtualAdvisor is ~2,900
 * lines with speech, streaming and markdown wired into `mounted()`, and
 * FirmManagerHub is larger; mounting either to assert one branch would test a
 * great deal that has nothing to do with the rule and break for the wrong reasons.
 * What matters is a property of the source: the failure branch exists, and it
 * comes FIRST. Both screens still need a live look — a source test cannot see how
 * a sentence reads on the page.
 *
 * Wording approved by Mike 2026-08-03 (S1 and S2):
 * design/WORDING-DISTINCTION-AI-FAILURE.md
 */

const read = p => fs.readFileSync(path.join(__dirname, '../../', p), 'utf8')

const SCREENS = [
  { name: 'VirtualAdvisor (a live adviser session)', file: 'components/VirtualAdvisor.vue' },
  { name: 'FirmManagerHub (a saved case)', file: 'components/FirmManagerHub.vue' }
]

// The claim that must never be made about an unread layer. Both files carry it
// verbatim; if it is ever reworded, this test fails and points here rather than
// silently going quiet — the failure mode of a grep-based guard.
const NO_DISTINCTION_LINE = 'No distinction changed the scoring in this area.'

describe.each(SCREENS)('$name — a failed classifier is never reported as a result', ({ file }) => {
  const src = read(file)

  it('still carries the sentence this rule is about', () => {
    // If this fails, the wording moved (very likely into a locale file, which the
    // i18n rule wants). Re-point the guard at its new home — do not delete it.
    expect(src).toContain(NO_DISTINCTION_LINE)
  })

  it('branches on aiFailed BEFORE claiming no distinction changed the scoring', () => {
    // Either spelling counts: VirtualAdvisor reads the flag inline, the Hub reads it
    // through a helper because the trace is per-case. Earliest occurrence wins — the
    // helper's own definition lives far below the template that calls it.
    const candidates = ['distinctions.aiFailed', 'traceAiFailed(']
      .map(needle => src.indexOf(needle))
      .filter(at => at > -1)
    const failureAt = Math.min.apply(null, candidates)
    const claimAt = src.indexOf(NO_DISTINCTION_LINE)

    expect(failureAt).toBeGreaterThan(-1)
    // Order is the whole rule: a v-else-if placed after the claim would render the
    // false sentence and never reach the fault.
    expect(failureAt).toBeLessThan(claimAt)
  })

  it('shows the approved failure sentence, from the locale file', () => {
    expect(src).toContain('decisionTrace.distAiFailed')
  })

  it('says something when the cross-domain bridge fails — the section used to just vanish', () => {
    expect(src).toContain('nearMissAiFailed')
    expect(src).toContain('decisionTrace.nearMissAiFailed')
  })
})

describe('the approved wording exists exactly once, and is shared', () => {
  const en = JSON.parse(read('locales/en.json'))

  it('both sentences are in the locale file', () => {
    expect(typeof en.decisionTrace.distAiFailed).toBe('string')
    expect(typeof en.decisionTrace.nearMissAiFailed).toBe('string')
  })

  it('names the cause, not just the symptom', () => {
    // "could not be checked" alone invites the reading "there weren't any", which is
    // the confusion the whole defect was made of. Mike approved option B for that
    // reason; this pins the half of it that carries the meaning.
    expect(en.decisionTrace.distAiFailed).toMatch(/did not answer/i)
    expect(en.decisionTrace.distAiFailed).toMatch(/built without them/i)
  })

  it('is ONE key used by both screens, so the two can never drift apart', () => {
    for (const { file } of SCREENS) {
      expect(read(file)).toContain('decisionTrace.distAiFailed')
    }
  })
})

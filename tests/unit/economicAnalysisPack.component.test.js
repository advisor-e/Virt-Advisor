/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EconomicAnalysisPack = require('~/components/EconomicAnalysisPack.vue').default

/**
 * Economic Analysis — the printed funding pack (item 4.66, slice 3).
 *
 * 🔴 WHY THIS FILE EXISTS, AND WHY EVERY ASSERTION IN IT IS ABOUT THE GATE. This component
 * is the only thing in the app that puts AI-written text in front of a bank, and it is
 * PRINT-ONLY — a tester in UAT sees a screen, and this is not on the screen. What they
 * would have to do to catch a fault here is press Ctrl+P on the right run in the right
 * state and read a preview. So the conditions under which it prints at all are asserted
 * here instead:
 *
 *   · research nobody approved must never print;
 *   · an approval belonging to a run that was re-run must never carry the next one;
 *   · a withdrawn tick must stop it printing.
 *
 * The second block guards the same class of thing one level down: this renders text a
 * model wrote, and the standards require an LLM-output parser tested against valid,
 * malformed and missing input.
 *
 * `$t()` returns the KEY, so nothing here pins Mike's wording — his 2026-08-24 ruling on
 * what a test may assert. Nothing here asserts a CSS class or a heading's words either;
 * the print layout is exactly the kind of thing a person judges better than an assertion.
 */

/** A validated research payload, in the shape `researchResult.js` returns it. */
function research (over) {
  return Object.assign({
    text: 'x',
    wordCount: 2013,
    citationCount: 29,
    sources: [
      { url: 'https://www.rbnz.govt.nz/monetary-policy/ocr', host: 'rbnz.govt.nz', title: 'Official Cash Rate' },
      { url: 'https://www.stats.govt.nz/cpi', host: 'stats.govt.nz', title: 'Consumers price index' }
    ],
    sections: [1, 2, 3, 4, 5].map(n => ({
      n,
      body: '## ' + n + '. Section ' + n + '\n\nA figure of **3.0%** was reported. ([rbnz.govt.nz](https://www.rbnz.govt.nz/x))',
      wordCount: 9,
      citations: []
    }))
  }, over || {})
}

/** The approval record `POST …/include` returns — the real shape, from `approveRun`. */
function approval (over) {
  return Object.assign({
    isApproved: true,
    runId: 'ea_7',
    runNumber: 2,
    totalRuns: 3,
    approvedBy: { name: 'Ann Advisor', email: 'ann@firm.example' },
    approvedAt: '2026-09-06T09:00:00.000Z',
    sourceCount: 2,
    wordCount: 2013
  }, over || {})
}

/** Mounted with a full set of props, minus whatever the caller overrides. */
function mountPack (over) {
  return mountWithBuefy(EconomicAnalysisPack, {
    propsData: Object.assign({
      research: research(),
      approval: approval(),
      included: true,
      researchedAt: new Date('2026-09-06T09:00:00.000Z')
    }, over || {})
  })
}

/** Does anything at all print? */
function prints (w) {
  return w.find('.eap').exists()
}

describe('🔴 the approval gate — what can reach a lender', () => {
  test('an approved, included run prints', () => {
    expect(prints(mountPack())).toBe(true)
  })

  test('research with NO approval does not print, however complete it is', () => {
    expect(prints(mountPack({ approval: null }))).toBe(false)
  })

  test('an approval record that does not say isApproved does not print', () => {
    // The field the standards name is read, not inferred from the record's presence.
    expect(prints(mountPack({ approval: approval({ isApproved: false }) }))).toBe(false)
  })

  test('a withdrawn tick stops it printing even while the approval record stands', () => {
    // What the advisor does by unticking either tick on step 5. The audit record may
    // legitimately outlive the decision; the pack must not.
    expect(prints(mountPack({ included: false }))).toBe(false)
  })

  test('an approval with no research behind it prints nothing', () => {
    // The state after "Research again": the page clears the run, and a stale approval
    // must not carry the previous one into the pack.
    expect(prints(mountPack({ research: null }))).toBe(false)
  })

  test('research that came back with no sections prints nothing', () => {
    expect(prints(mountPack({ research: research({ sections: [] }) }))).toBe(false)
  })
})

describe('what the lender actually receives', () => {
  test('all five sections print, INCLUDING what could not be sourced', () => {
    // §5 is the one a pack would be tempted to drop, and the approved drawing is explicit
    // that it prints: a funding pack that hides its own gaps is worse than one that names
    // them.
    const w = mountPack()
    expect(w.findAll('.eap-section').length).toBe(5)
    expect(w.find('.eap-section.is-gaps').exists()).toBe(true)
  })

  test('every source is printed in full, address and all', () => {
    // On paper a citation cannot be clicked, so an address a reader cannot copy is not a
    // source at all.
    const text = mountPack().text()
    expect(text).toContain('https://www.rbnz.govt.nz/monetary-policy/ocr')
    expect(text).toContain('https://www.stats.govt.nz/cpi')
  })

  test('the run and the approval both name which run of how many was included', () => {
    // Re-running until the answer flatters the client is made visible rather than
    // impossible (Mike, 2026-09-06), and this is where it becomes visible to the lender.
    const w = mountPack()
    const text = w.text()
    expect(text).toContain('"run":2')
    expect(text).toContain('"of":3')
    expect(text).toContain('Ann Advisor')
  })
})

describe('🔴 text a model wrote is never markup', () => {
  test('a javascript: link in model output produces no anchor and no href', () => {
    const w = mountPack({
      research: research({
        sections: [{
          n: 1,
          body: 'Read [the report](javascript:alert(1)) for more.',
          wordCount: 6,
          citations: []
        }]
      })
    })
    expect(w.findAll('a').length).toBe(0)
    expect(w.html()).not.toContain('href')
    // It survives as the literal characters the model wrote, which is the safe direction
    // to fail: a shape the parser does not recognise is text, never markup.
    expect(w.text()).toContain('[the report](javascript:alert(1))')
  })

  test('no anchor is produced for a legitimate citation either — paper has no clicks', () => {
    const w = mountPack()
    expect(w.findAll('a').length).toBe(0)
    // The source's NAME still stands beside the figure, which is what a reader needs.
    expect(w.text()).toContain('rbnz.govt.nz')
  })

  test('raw HTML in model output is rendered as text, not as elements', () => {
    const w = mountPack({
      research: research({
        sections: [{
          n: 1,
          body: 'Growth <img src=x onerror=alert(1)> continued.',
          wordCount: 5,
          citations: []
        }]
      })
    })
    expect(w.findAll('img').length).toBe(0)
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
  })

  test('a section with a missing or malformed body renders rather than throwing', () => {
    const w = mountPack({
      research: research({
        sections: [
          { n: 1, body: null, wordCount: 0, citations: [] },
          { n: 2, body: '', wordCount: 0, citations: [] },
          { n: 3, body: '**unclosed and [broken](', wordCount: 3, citations: [] }
        ]
      })
    })
    expect(prints(w)).toBe(true)
    expect(w.text()).toContain('**unclosed and [broken](')
  })
})

describe('missing pieces do not break the page', () => {
  test('an approval whose approvedBy is absent still prints the research', () => {
    // The record is written by the backend, but a pack that refused to print because a
    // name was missing would withhold research the advisor approved.
    const w = mountPack({ approval: approval({ approvedBy: undefined }) })
    expect(prints(w)).toBe(true)
  })

  test('sources absent — the research still prints, with no source list', () => {
    const w = mountPack({ research: research({ sources: [] }) })
    expect(prints(w)).toBe(true)
    expect(w.find('.eap-sources').exists()).toBe(false)
  })

  test('no research date — it prints without inventing one', () => {
    const w = mountPack({ researchedAt: null })
    expect(prints(w)).toBe(true)
  })
})

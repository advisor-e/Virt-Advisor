/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * `printPlan()` — how the client's Strategy Planner plan leaves the app. Mike's request,
 * 2026-09-21: "the ability to export the final client version strategic planner as a pdf".
 *
 * 🔴 WHAT THESE TESTS GUARD, AND WHY EACH IS NOT SOMETHING UAT WOULD CATCH.
 * The visible half of this feature — a button that opens a print dialog — a tester sees
 * in five seconds, and Mike's testing ruling of 2026-08-24 says not to assert it. What is
 * tested here is the `body.sp-printing` gate, which is invisible in both directions:
 *
 *   1. IT MUST BE ON WHILE THE DIALOG READS THE DOM. That class is the only thing
 *      separating the client's document from the advisor's screen around it — the page
 *      heading, the five-stage rail and the coverage wheel. Lose it and the client is
 *      handed a PDF of our application furniture. Nothing on screen changes.
 *   2. IT MUST COME OFF AFTERWARDS, INCLUDING WHEN print() THROWS. A page left in
 *      printing mode renders BLANK to the advisor still sitting in front of it, in the
 *      middle of a client meeting, with no error anywhere. A `catch` would not do: the
 *      failure has to stay visible to the advisor while the screen is put back.
 *   3. IT MUST DO NOTHING DURING SERVER RENDER. `document` does not exist there, so an
 *      unguarded call takes the whole page down rather than the button.
 *
 * The companion structural guard is `scopedStylesCannotReachOutside.test.js`, which
 * fails the build if those print rules are ever moved back into a `scoped` block — where
 * they compile to a selector that matches nothing and silently print the entire screen.
 */

const PAGE = require('~/pages/strategy-planner.vue').default
const { printPlan } = PAGE.methods

let prevClient

beforeEach(() => {
  // Nuxt sets process.client in the browser; jest does not, so without this the
  // method takes its SSR path and every assertion below would pass for the wrong reason.
  prevClient = process.client
  process.client = true
  document.body.classList.remove('sp-printing')
})

afterEach(() => {
  process.client = prevClient
  document.body.classList.remove('sp-printing')
  delete window.print
})

describe('printPlan', () => {
  test('the gate is ON at the moment the print dialog reads the page', () => {
    const seen = []
    window.print = () => { seen.push(document.body.classList.contains('sp-printing')) }

    printPlan.call({})

    // One press, one dialog, and the gate up for it.
    expect(seen).toEqual([true])
  })

  test('the gate is OFF once printing is done, so the screen comes back', () => {
    window.print = () => {}

    printPlan.call({})

    expect(document.body.classList.contains('sp-printing')).toBe(false)
  })

  test('the gate is OFF even when print() throws — the advisor is not left with a blank screen', () => {
    window.print = () => { throw new Error('no printer') }

    // The failure still surfaces: it is the advisor's to see, not ours to swallow.
    expect(() => printPlan.call({})).toThrow('no printer')
    expect(document.body.classList.contains('sp-printing')).toBe(false)
  })

  test('does nothing at all during server render — SSR safety', () => {
    process.client = false
    let called = false
    window.print = () => { called = true }

    printPlan.call({})

    expect(called).toBe(false)
    expect(document.body.classList.contains('sp-printing')).toBe(false)
  })

  test('does nothing when the browser has no print(), rather than throwing at the advisor', () => {
    delete window.print

    expect(() => printPlan.call({})).not.toThrow()
    expect(document.body.classList.contains('sp-printing')).toBe(false)
  })
})

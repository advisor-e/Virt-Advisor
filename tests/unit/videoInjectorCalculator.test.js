'use strict'

/**
 * @file Item 4.33 — a template's tutorial video must not be attached to a calculator
 *   that happens to share its name.
 *
 * 🔴 THE DEFECT, seen live 2026-08-22. The advisor was pointed at a CALCULATOR —
 * "**Working Capital Cycle** — ... open it at /business-performance-report" — and the
 * injector appended "A 24-minute tutorial video is available in Advisor-e to help you
 * prepare." The video is real; it belongs to the TEMPLATE of that name, not to the page
 * the advisor had just been sent to. Nothing was fabricated, which is what made it easy
 * to miss: an advisor goes looking for a tutorial about a calculator screen and finds a
 * video about a different thing.
 *
 * ⚠ WHY THIS CANNOT BE FIXED IN THE PROMPT, recorded because it was tried and made
 * things worse: telling the AI not to bold a model name stripped the bold off the
 * TEMPLATE name too, which is the very thing the injector reads. Reverted. The injector
 * runs after the answer is written, so here is the only place the two can be told apart.
 *
 * ⚠ SCOPE, MEASURED NOT ASSUMED. Exactly two model names are also template titles —
 * Working Capital Cycle and Quick Position — and only the first has a video, so there is
 * one live case. The guard is built from `report-model-summaries.json` rather than from
 * that pair, so cataloguing another colliding model cannot widen the defect silently.
 */

const { injectVideoInfo } = require('../../server/utils/videoInjector')
const SUMMARIES = require('../../data/report-model-summaries.json')
const TEMPLATES = require('../../data/templates.json')

const VIDEO = /tutorial video is available/

describe('the premise this guard rests on', () => {
  // If these ever stop being true the guard is protecting nothing, and the next
  // maintainer should find that out here rather than by reading the injector.
  const norm = s => String(s).toLowerCase().trim().replace(/['’‘`]/g, '')
  const titles = new Map(
    (Array.isArray(TEMPLATES) ? TEMPLATES : TEMPLATES.templates || []).map(t => [norm(t.title), t])
  )
  const models = SUMMARIES.models || []

  test('the summaries file still carries a name and a route per model', () => {
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(typeof m.name).toBe('string')
      expect(typeof m.route).toBe('string')
    }
  })

  test('Working Capital Cycle is both a model and a template WITH a video', () => {
    expect(models.some(m => norm(m.name) === norm('Working Capital Cycle'))).toBe(true)
    const tpl = titles.get(norm('Working Capital Cycle'))
    expect(tpl).toBeTruthy()
    expect(tpl.cpd.watchedVideo).toBeGreaterThan(0)
  })
})

describe('a calculator reference gets no tutorial-video sentence', () => {
  test('🔴 the live defect: the model name with the report page path', () => {
    const answer = '**Working Capital Cycle** — run the numbers, open it at ' +
      '/business-performance-report\n\nSomething else follows.'

    expect(injectVideoInfo(answer, null)).not.toMatch(VIDEO)
  })

  test('a model\'s own route counts too, not just the report page', () => {
    const answer = '**Working Capital Cycle** — open the calculator at /quick-position ' +
      'for the figures\n\nSomething else follows.'

    expect(injectVideoInfo(answer, null)).not.toMatch(VIDEO)
  })
})

describe('what the guard deliberately does NOT suppress', () => {
  // Both conditions must hold — a model NAME and a calculator ROUTE. Either alone leaves
  // the sentence alone, which is what keeps a real recommendation intact.
  test('a genuine template recommendation keeps its video', () => {
    const answer = '**Working Capital Cycle** — a template that helps you prepare the ' +
      'discussion with the client.\n\nSomething else follows.'

    expect(injectVideoInfo(answer, null)).toMatch(VIDEO)
  })

  test('a template whose name is NOT a model keeps its video even beside a route', () => {
    // Picked from the data so this cannot go stale against a renamed template.
    const norm = s => String(s).toLowerCase().trim().replace(/['’‘`]/g, '')
    const modelNames = new Set((SUMMARIES.models || []).map(m => norm(m.name)))
    const all = Array.isArray(TEMPLATES) ? TEMPLATES : TEMPLATES.templates || []
    const victim = all.find(t =>
      t.cpd && t.cpd.watchedVideo >= 1 && t.cpd.isHidden !== true && !modelNames.has(norm(t.title)) &&
      !/\*/.test(t.title))

    expect(victim).toBeTruthy()
    const answer = `**${victim.title}** — mentioned alongside /business-performance-report ` +
      'in passing.\n\nSomething else follows.'

    expect(injectVideoInfo(answer, null)).toMatch(VIDEO)
  })
})

'use strict'

/**
 * GUARD — a `recommendation` must not name a template the advisor cannot open.
 *
 * WHY THIS FILE EXISTS. `recommendation` is gated sentence by sentence against
 * the template catalogue: any sentence naming a template that does not exist is
 * withheld from the prompt, so the advisor never sees it. That gate is correct
 * and stays. What it cannot do is tell anybody the content is wrong — it simply
 * goes quiet, and the tree still looks fine to read.
 *
 * Seven Get-the-Job branches said "Use Get Seminar template". No page in the
 * 291-record library has ever been called that. One branch was withheld
 * entirely, six lost their opening sentence, and it stayed that way from the day
 * the gate shipped (`fdb15ca`) until 2026-08-15 — carried on the list as a
 * wording tidy-up rather than as a table of coaching nobody was receiving.
 *
 * Mike named the real page: **Design & Deliver** (Get the Job → Seminar Delivery
 * → Public Speaking). All seven now pass the gate intact, ampersand and all.
 *
 * ⚠ SCOPE, STATED SO IT IS NOT MISTAKEN FOR COVERAGE. Measured 2026-08-15:
 * **28 of the 55 recommendations across all trees lose text to this gate.** The
 * seven fixed here were seven of those 28. The remaining 21 — across
 * `fmc_`, `cas_`, `fbp_` and `ol_` branches — are a real and unexamined content
 * gap that NOBODY HAS RULED ON YET. They are deliberately not asserted here: a
 * test that fails on 21 known-open items is a test somebody disables. This
 * comment is the record, so the number cannot be quietly forgotten.
 *
 * It anchors to data/templates.json, which is COMMITTED — mirrored from the
 * master export. The export itself is gitignored, so a test reading it would
 * pass vacuously on a fresh clone and in CI, which is the exact failure mode of
 * a guard that guards nothing. Same reasoning as logicTreeTemplateNames.test.js.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

const DATA = resolve(__dirname, '..', '..', 'data')

const trees = JSON.parse(readFileSync(resolve(DATA, 'logic_trees.json'), 'utf8'))
const library = JSON.parse(readFileSync(resolve(DATA, 'templates.json'), 'utf8'))

const titles = new Set(
  (Array.isArray(library) ? library : library.templates || []).map(t => t.title))

/** Every node carrying a `recommendation`, wherever it sits in the file. */
function recommendations () {
  const out = []
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (!node || typeof node !== 'object') { return }
    if (typeof node.recommendation === 'string' && node.recommendation.trim()) {
      out.push({ id: node.id || '(no id)', text: node.recommendation })
    }
    Object.keys(node).forEach(key => walk(node[key]))
  }
  walk(trees)
  return out
}

const all = recommendations()
const seminar = all.filter(r => /^gs_/.test(r.id))

describe('the Seminar branches name a page that exists', () => {
  test('the library still holds Design & Deliver', () => {
    // If Advisor-e retitles this page upstream, this is the line that says so —
    // while the old name is still on screen and the mapping is recoverable.
    expect(titles.has('Design & Deliver')).toBe(true)
  })

  test('all seven branches are still here', () => {
    expect(seminar).toHaveLength(7)
  })

  test.each(seminar.map(r => r.id))('%s names Design & Deliver, not the retired name', (id) => {
    const text = all.find(r => r.id === id).text
    expect(text).toContain('Design & Deliver template')
    expect(text).not.toContain('Get Seminar')
  })

  test('no tree anywhere still says "Get Seminar"', () => {
    // The name was never a page. It must not come back through a copy-paste
    // from an older branch, or from a document still quoting the old wording.
    const survivors = all.filter(r => /Get Seminar/i.test(r.text)).map(r => r.id)
    expect(survivors).toEqual([])
  })

  // THE ONE THAT MATTERS. The four tests above check the string; this one checks
  // the OUTCOME — that the advisor actually receives the whole line. It runs the
  // production gate itself rather than a test-local imitation of it, which is
  // the point: a hand-rolled name-matcher here would drift from the real one and
  // then agree with itself forever. The first draft of this test did exactly
  // that and reported two false failures.
  test('the gate lets all seven through whole', () => {
    const { withholdUnavailableNames } = require('../../server/utils/logicTrees')

    // The catalogue is loaded from the master export, which is gitignored. On a
    // fresh clone or in CI it is absent and the gate withholds everything by
    // design — so check with a title known to be live before trusting a result.
    const canary = withholdUnavailableNames('Use Quick Position template.')
    if (!canary) {
      console.warn('[test] template catalogue unavailable — gate outcome not asserted')
      return
    }

    const losing = seminar
      .map(r => ({ id: r.id, after: withholdUnavailableNames(r.text) }))
      .filter(r => r.after.trim() !== seminar.find(s => s.id === r.id).text.trim())
      .map(r => r.id)

    expect(losing).toEqual([])
  })
})

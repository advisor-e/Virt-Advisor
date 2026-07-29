'use strict'

/**
 * GUARD — every template a client-delivery logic tree recommends must exist in
 * the library.
 *
 * Why this file exists. On 2026-07-30 the backend had been warning at every boot
 * that six template names in data/logic_trees.json matched nothing in the search
 * content. Five of them turned out to be LIVE pages that had simply been
 * retitled upstream in Advisor-e — proved by each page's own slug, which still
 * spells the old name (planning-session → "Lite Planning", data-session →
 * "Lite Data", sales-session → "Lite Sales", people-session → "Lite People",
 * process-session → "Lite Process"). Twenty-eight references were dead as a
 * result: those rules fired and recommended nothing.
 *
 * A console warning at boot is not a control. It had been logged and carried on
 * a backlog rather than acted on, and scripts/migrate-ghost-references.js — the
 * tool that existed for it — DELETES what it cannot resolve, so running it would
 * have stripped 28 correct recommendations and left the trees validating clean.
 * This test is the control the warning was not: it fails the build the next time
 * a page is retitled, while the old name is still visible and the mapping is
 * still recoverable from the slug.
 *
 * It anchors to data/templates.json, which is COMMITTED (mirrored from the
 * master export). The export itself is gitignored, so a test reading it would
 * silently pass on a fresh clone and in CI — the exact failure mode of a guard
 * that guards nothing.
 *
 * Scope deliberately matches validateLogicTreeReferences (server/utils/
 * logicTrees.js): only `nodes[].templates` on client-delivery trees. The
 * flat_if_then Get-the-Job trees are NOT scanned — they are Learn-mode-only and
 * reference advisor-kit material that legitimately does not live in the client
 * library, so checking them false-positives every valid kit reference.
 */

const logicTreeData = require('../../data/logic_trees.json')
const templates = require('../../data/templates.json')

/**
 * Names allowed to be absent from the library, each with the reason it is not
 * simply a defect. Keep this list SHORT and evidenced — an entry added to quiet
 * a failure, rather than to record a decision, defeats the whole test.
 */
const ALLOWED_ABSENT = {
  // Not a page: "Growth Framework" is a subSection of the library holding six
  // pages (The 9 Growth Stages, Growth Curve, Lite Fundamentals Components,
  // Growth Fundamentals Framework Philosophy, Growth Curve Checklist, Revealing
  // the Growth Curve Freehand). Which one this rule means is the firm's call,
  // not the engine's, and not the AI's to guess — so it stays honestly dead and
  // visible here until Mike rules on it. Logged in design/ACTIONS.md.
  'Growth Framework': 'a subSection, not a page — awaiting the owner\'s ruling on which page it means'
}

// The same shape filter validateLogicTreeReferences applies: a reference is a
// real template name only if it is not a `[placeholder]`, not a prose fragment
// starting "a ", and short enough to be a title rather than a sentence.
const isTemplateName = name =>
  name && typeof name === 'string' && name.length < 80 &&
  !name.startsWith('[') && !name.startsWith('a ')

const libraryTitles = new Set(templates.map(t => t.title))

function collectReferences () {
  const refs = []
  for (const tree of (logicTreeData.trees || [])) {
    for (const node of (tree.nodes || [])) {
      for (const name of (node.templates || [])) {
        if (isTemplateName(name)) { refs.push({ tree: tree.id, node: node.id, name }) }
      }
    }
  }
  return refs
}

describe('logic-tree template references resolve to real library pages', () => {
  test('the fixture is substantial enough for this guard to mean anything', () => {
    // A guard that passes because it found nothing to check is worse than no
    // guard. If either side collapses, fail here rather than report all-clear.
    expect(libraryTitles.size).toBeGreaterThan(200)
    expect(collectReferences().length).toBeGreaterThan(100)
  })

  test('no client-delivery tree recommends a template the library does not have', () => {
    const dead = collectReferences()
      .filter(r => !libraryTitles.has(r.name))
      .filter(r => !Object.prototype.hasOwnProperty.call(ALLOWED_ABSENT, r.name))

    // The message has to be actionable by whoever hits it months from now: the
    // fix is almost never deletion. Check the page's slug in the master export
    // first — a retitled page keeps its slug, which names the page it became.
    let message = ''
    if (dead.length > 0) {
      const detail = dead.map(r => `  [${r.tree}] node=${r.node} → "${r.name}"`).join('\n')
      message = `\n${dead.length} logic-tree reference(s) name a page the library does not have:\n${detail}\n\n` +
        'Before removing any of these: look the name up as a SLUG in the master export.\n' +
        'A page that was merely retitled still carries its old name there, and the\n' +
        'correct fix is to rename the reference, not delete it (2026-07-30: five names,\n' +
        '28 references, all live pages). Delete only once you have evidence the page\n' +
        'is genuinely gone.'
    }
    expect(message).toBe('')
  })

  test('every allowlist entry is still needed, and still absent', () => {
    // Stops the allowlist outliving its reason: once a name resolves (Mike rules
    // on it, or the page is published), this fails until the entry is removed.
    for (const name of Object.keys(ALLOWED_ABSENT)) {
      expect(libraryTitles.has(name)).toBe(false)
    }
  })

  test('the five 2026-07-30 corrections stay corrected', () => {
    // Named explicitly so a bad merge or a re-run of the deletion script shows up
    // as this failure rather than as a quiet drop in recommendation quality.
    const refs = collectReferences().map(r => r.name)
    for (const stale of ['Planning Session', 'Data Session', 'Sales Session', 'People Session', 'Process Session']) {
      expect(refs).not.toContain(stale)
    }
    for (const live of ['Lite Planning', 'Lite Data', 'Lite Sales', 'Lite People', 'Lite Process']) {
      expect(libraryTitles.has(live)).toBe(true)
    }
  })
})

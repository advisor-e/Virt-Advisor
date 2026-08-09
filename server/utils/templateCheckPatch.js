'use strict'

/**
 * @file Turn the mentor's Template Check rulings into an exact, reviewable set of
 *   edits to the logic tables.
 * @module server/utils/templateCheckPatch
 *
 * THE ARTEFACT IS design/mockups/logic-table-template-check.html (approved by Mike
 * 2026-08-05). Its rows carry an "Apply it" button and the line "Ruled 5 August.
 * Not yet applied to the table." This module is what that button leads to.
 *
 * ⚠ IT PRODUCES A PATCH. IT NEVER WRITES ONE. Ruled by Mike 2026-08-09, and the
 * reasons are worth keeping because a live button was the obvious alternative:
 *
 *  1. THE ESTABLISHED PRACTICE IS ALREADY A REVIEWED COMMIT. This exact fix has
 *     been made twice before by hand — `bd7dc63 fix(logic-trees): reconnect five
 *     retitled pages` and `3064a71 ... swap the five retitled page names in tree
 *     prose too`. templateCheckRulings.js says the same in its own header: a
 *     ruling is recorded "so it can be applied later, in one reviewed pass".
 *  2. A STORED OVERRIDE WOULD FENCE THE TABLE. logicTrees.js sets `__firmAuthored`
 *     on any tree carrying an override, which makes the prompt formatter wrap its
 *     text as untrusted. Applying rulings that way would quietly re-tune the
 *     prompt for every firm, one table at a time — the same mechanism kept
 *     deliberately for quiz content, doing the wrong thing here.
 *  3. A STORED OVERRIDE WOULD GO STALE. The overlay replaces arrays wholesale, so
 *     an override of a tree's `nodes` is a frozen copy: a later improvement to the
 *     committed table could never reach anyone whose rulings had been applied.
 *
 * WHAT ONLY A HUMAN CAN DO IS LEFT TO A HUMAN. Every edit is classified, and only
 * the unambiguous ones are marked ready. A name appearing twice, or in two of the
 * three prose fields, is REPORTED rather than guessed at — the two failed attempts
 * this whole screen exists because of (2026-08-04 and 2026-08-05) both came from
 * acting confidently on this exact kind of ambiguity.
 */

const TEMPLATES = require('../../data/templates.json')
const { runTemplateCheck, buildCatalogue } = require('./templateCheck')

/** The three prose fields a name can be written into, in the order they are joined. */
const PROSE_FIELDS = ['action', 'notes', 'recommendation']

/**
 * What can be said about one proposed edit.
 *
 * `ready` is the only one a developer can apply mechanically. The others are not
 * failures — they are the cases where the file has moved on, or where the answer
 * genuinely needs eyes.
 */
const EDIT = {
  READY: 'ready',
  AMBIGUOUS: 'ambiguous',
  STALE: 'stale',
  UNKNOWN_TEMPLATE: 'unknown-template'
}

/**
 * Every occurrence of a name in one rule, field by field.
 *
 * Whole-word-ish matching on the raw text: a substring match would rewrite
 * "BoardPack Agenda Notes" while trying to fix "BoardPack Agenda", and a
 * normalised match would lose the exact characters the edit has to replace.
 *
 * @param {object} rawRule - the rule as it sits in the file.
 * @param {string} name - the name as the tree writes it.
 * @returns {Array<{field: string, count: number}>}
 */
function proseOccurrences (rawRule, name) {
  const out = []
  for (const field of PROSE_FIELDS) {
    const text = typeof rawRule[field] === 'string' ? rawRule[field] : ''
    if (!text) { continue }
    let count = 0
    let from = 0
    for (;;) {
      const at = text.indexOf(name, from)
      if (at === -1) { break }
      count++
      from = at + name.length
    }
    if (count > 0) { out.push({ field, count }) }
  }
  return out
}

/**
 * Locate the raw rule a finding came from.
 *
 * @param {Array<object>} trees
 * @param {string} treeId
 * @param {string} ruleId
 * @returns {{tree: object, rule: object}|null} null when the file has moved on.
 */
function locateRule (trees, treeId, ruleId) {
  const tree = trees.find(t => String(t.id || '') === treeId)
  if (!tree) { return null }
  const rules = Array.isArray(tree.nodes) ? tree.nodes : (Array.isArray(tree.branches) ? tree.branches : [])
  const rule = rules.find(r => String((r && r.id) || '') === ruleId)
  return rule ? { tree, rule } : null
}

/**
 * Work out the single edit one ruled finding implies.
 *
 * @param {object} finding - a Template Check finding with verdict 'ruled'.
 * @param {Array<object>} trees
 * @param {object} catalogue - from buildCatalogue.
 * @returns {object} an edit, always classified, never thrown away.
 */
function editFor (finding, trees, catalogue) {
  const base = {
    key: finding.key,
    treeId: finding.treeId,
    table: finding.table,
    branchName: finding.branchName,
    where: finding.where,
    from: finding.name,
    to: (finding.ruling && finding.ruling.title) || null,
    field: null,
    occurrences: 0
  }

  // The ruled title must be a template the catalogue actually answers to. A
  // ruling made before a retitle would otherwise swap one dead name for another.
  if (!base.to || !catalogue.titles.has(base.to)) {
    return { ...base, status: EDIT.UNKNOWN_TEMPLATE, reason: 'The ruled template is not in the catalogue under that title.' }
  }

  const ruleId = String(finding.key).split('::')[1] || ''
  const found = locateRule(trees, finding.treeId, ruleId)
  if (!found) {
    return { ...base, status: EDIT.STALE, reason: 'That branch is no longer in the table.' }
  }

  if (finding.where === 'list') {
    const field = finding.field
    const list = Array.isArray(found.rule[field]) ? found.rule[field] : []
    const count = list.filter(v => v === finding.name).length
    if (count === 0) {
      return { ...base, field, status: EDIT.STALE, reason: 'That name is no longer in this template list.' }
    }
    if (count > 1) {
      return { ...base, field, occurrences: count, status: EDIT.AMBIGUOUS, reason: 'The name is listed more than once in this field.' }
    }
    return { ...base, field, occurrences: 1, status: EDIT.READY }
  }

  const hits = proseOccurrences(found.rule, finding.name)
  const total = hits.reduce((n, h) => n + h.count, 0)
  if (total === 0) {
    return { ...base, status: EDIT.STALE, reason: 'That name is no longer written in this branch.' }
  }
  if (hits.length > 1 || total > 1) {
    return {
      ...base,
      field: hits.map(h => h.field).join(', '),
      occurrences: total,
      status: EDIT.AMBIGUOUS,
      reason: hits.length > 1
        ? `The name appears in more than one field (${hits.map(h => h.field).join(', ')}).`
        : 'The name appears more than once in the same field.'
    }
  }
  return { ...base, field: hits[0].field, occurrences: 1, status: EDIT.READY }
}

/**
 * Build the whole patch.
 *
 * ONLY A 'ruled' ROW PRODUCES AN EDIT, and that is not an omission:
 *  - "Not a tool" says the phrase was never a document, so there is nothing in the
 *    table to change — the dismissal is the whole outcome.
 *  - "Missing — flag it" says the document is real but unpublished. Only the
 *    master-app team can close it; changing our table would hide it.
 * Both are counted below so the screen can say so rather than appear to have lost
 * them.
 *
 * @param {object} [options]
 * @param {object} [options.trees] - logic_trees.json shape; defaults to the file.
 * @param {Array<object>} [options.templates] - defaults to the committed catalogue.
 * @param {object} [options.rulings] - keyed by findingKey.
 * @returns {{counts: object, edits: Array<object>}} edits carry every ruling the
 *   mentor asked to apply, each classified — never a silently shortened list.
 */
function buildTemplateCheckPatch (options) {
  const opts = options || {}
  const treeFile = opts.trees
  const report = runTemplateCheck({ trees: treeFile, templates: opts.templates, rulings: opts.rulings })
  const resolved = treeFile || require('../../data/logic_trees.json')
  const trees = Array.isArray(resolved) ? resolved : (resolved.trees || [])
  const catalogue = buildCatalogue(opts.templates || TEMPLATES)

  // ONE EDIT PER DECISION, not one per occurrence. The scan raises a finding for
  // every place a name appears, so a name listed twice in the same field produces
  // two findings — and they share a key, because a finding key is
  // treeId::ruleId::name. They are therefore one ruling and one change. Without
  // this the patch would tell a developer to make the same edit twice, which on a
  // duplicated entry is how one of the two silently survives.
  const requested = []
  const seen = new Set()
  for (const f of report.findings) {
    if (f.verdict !== 'ruled' || !f.ruling || f.ruling.applyRequested !== true) { continue }
    if (seen.has(f.key)) { continue }
    seen.add(f.key)
    requested.push(f)
  }

  const edits = requested.map(f => editFor(f, trees, catalogue))

  return {
    counts: {
      requested: edits.length,
      ready: edits.filter(e => e.status === EDIT.READY).length,
      needsEyes: edits.filter(e => e.status !== EDIT.READY).length,
      // Ruled but not yet sent for applying — the mentor has decided and not
      // pressed the button. Shown so a short patch is never mistaken for a
      // finished job.
      ruledNotRequested: report.findings.filter(f =>
        f.verdict === 'ruled' && !(f.ruling && f.ruling.applyRequested)).length,
      // Decisions that correctly produce no edit at all. See the note above.
      dismissed: report.findings.filter(f => f.verdict === 'dismissed').length,
      flagged: report.findings.filter(f => f.verdict === 'flagged').length
    },
    edits
  }
}

module.exports = {
  buildTemplateCheckPatch,
  editFor,
  proseOccurrences,
  locateRule,
  PROSE_FIELDS,
  EDIT
}

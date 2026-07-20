'use strict'

/**
 * Template-name resolver (CB-34).
 *
 * Turns a human-typed heading (e.g. a quiz-bank section title) into the ONE
 * template's permanent page ID (`page`, e.g. "id-4466260146"). The ID is the
 * durable key everything downstream uses; the typed name is consumed once, here.
 * A future rename of a template title — or a typo in the heading — therefore
 * cannot break a link that has already been resolved to an ID.
 *
 * Safety contract (the whole point): the resolver ONLY binds when it is certain.
 * It absorbs formatting noise (case, punctuation, spacing) and a cleanly
 * missing/extra word, but on genuine ambiguity or a real wording mismatch it
 * REFUSES and returns ranked suggestions — it never guesses, because a wrong
 * auto-bind silently attaches the wrong quiz to a template, which is worse than
 * a loud stop.
 *
 * Binding tiers (a bind requires a UNIQUE winner):
 *   1. exact      — same title once punctuation/case/spacing are normalised
 *                   ("People vs. Process:" == "People vs. Process")
 *   2. subset     — the heading's words are a subset of exactly one title's
 *                   words, or vice versa, and the smaller set has >= 2 words
 *                   ("6 Hats Thinking" -> "6 Hats"; "HOPE Model" -> "HOPE
 *                   Recession Model"). The >=2 floor stops a single common word
 *                   ("Model") from matching everything.
 * Anything else -> { ok:false } with the closest titles ranked by word overlap,
 * so the author is told exactly what to fix (e.g. "4 Part Business Plan" ->
 * closest "4 Part Bizz Plan").
 */

const fs = require('fs')
const path = require('path')

let _cache = null

/** Load templates.json once (id + title are all the resolver needs). */
function loadTemplates () {
  if (!_cache) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'data/templates.json'), 'utf8')
    _cache = JSON.parse(raw)
  }
  return _cache
}

/** Lowercase, drop every non-alphanumeric run to a single space, trim. */
function normalise (s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Distinct word tokens of a string, after normalisation. */
function tokenSet (s) {
  const n = normalise(s)
  return new Set(n ? n.split(' ') : [])
}

/** True when every element of `sub` is in `sup`. Callers guarantee non-empty sets. */
function isSubset (sub, sup) {
  for (const w of sub) { if (!sup.has(w)) { return false } }
  return true
}

/** Word-overlap similarity (Jaccard) — used only to rank rejection suggestions. */
function overlap (a, b) {
  if (a.size === 0 || b.size === 0) { return 0 }
  let inter = 0
  for (const w of a) { if (b.has(w)) { inter++ } }
  return inter / (a.size + b.size - inter)
}

/**
 * Resolve a heading to a single template's permanent page ID.
 *
 * @param {string} heading - the human-typed name (quiz-bank section title, etc.)
 * @param {Array<{page: string, title: string}>} [templates] - template list;
 *        defaults to data/templates.json. Injectable for tests.
 * @returns {{ok: true, id: string, title: string, matchType: 'exact'|'subset'}
 *          | {ok: false, reason: 'empty'|'none'|'ambiguous',
 *             candidates: Array<{id: string, title: string, score: number}>}}
 */
function resolveTemplateName (heading, templates) {
  const list = Array.isArray(templates) ? templates : loadTemplates()
  const hNorm = normalise(heading)
  if (!hNorm) { return { ok: false, reason: 'empty', candidates: [] } }

  const rank = matches => matches
    .map(t => ({ id: t.page, title: t.title, score: 1 }))

  // Tier 1 — exact once normalised.
  const exact = list.filter(t => normalise(t.title) === hNorm)
  if (exact.length === 1) {
    return { ok: true, id: exact[0].page, title: exact[0].title, matchType: 'exact' }
  }
  if (exact.length > 1) {
    return { ok: false, reason: 'ambiguous', candidates: rank(exact) }
  }

  // Tier 2 — unique word-subset (either direction), smaller set >= 2 words.
  const hSet = tokenSet(heading)
  const subset = list.filter((t) => {
    const tSet = tokenSet(t.title)
    const smaller = Math.min(hSet.size, tSet.size)
    if (smaller < 2) { return false }
    return isSubset(tSet, hSet) || isSubset(hSet, tSet)
  })
  if (subset.length === 1) {
    return { ok: true, id: subset[0].page, title: subset[0].title, matchType: 'subset' }
  }
  if (subset.length > 1) {
    return { ok: false, reason: 'ambiguous', candidates: rank(subset) }
  }

  // No confident bind — return the closest titles so the author knows what to fix.
  const candidates = list
    .map(t => ({ id: t.page, title: t.title, score: overlap(hSet, tokenSet(t.title)) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return { ok: false, reason: 'none', candidates }
}

module.exports = { resolveTemplateName, normalise, tokenSet }

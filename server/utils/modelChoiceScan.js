'use strict'

/**
 * @file Which calculation model the AI named, and when it named none.
 * @module server/utils/modelChoiceScan
 *
 * To-do item 7.5. Filed by Mike 2026-09-15 — *"make sure the other issue is entered into
 * the to do list"* — after the first effectiveness test the model summaries have ever had.
 * Approved artefact: `design/mockups/model-choices.html`, all three decisions ruled
 * 2026-09-16.
 *
 * 🔴 THE FAULT THIS CLOSES. Nineteen models are described to the AI on every client
 * conversation (`server/utils/reportModels.js`). It names one when it judges one fits, and
 * NOTHING ANYWHERE RECORDED WHICH. On 2026-09-15 three live conversations found two faults
 * — it never declined when no model fitted, and it invented limits — one of them a
 * governance dispute offered a cash forecast. Both were fixed the same day (e34ea81b), and
 * both were invisible to 11,082 passing tests, because every one of those checks that the
 * words REACH the prompt, never what the model does with them. The check existed only
 * because a session ran it by hand.
 *
 * 🔴 TWO SOURCES, AND WHICH ONE FIRED IS RECORDED — Mike's ruling of 2026-09-16, *"yes to
 * both"*. This is item 4.53's mechanism applied to models, for 4.53's own reason: the AI
 * obeys a declaration instruction ONLY SOMETIMES, and both paths return a plausible answer,
 * so a fallback is otherwise invisible to everyone including a tester in UAT.
 *
 *   - `declared` — the AI ended its reply with `[[MODEL: /debtor-drag]]`, stripped before
 *     the advisor sees it. THE ONLY PATH THAT CAN SEE A DECLINE: "the app has no model for
 *     this" is ordinary prose with no fixed wording, and phrase-matching it is the kind of
 *     guesswork that puts wrong rows on a screen people then trust.
 *   - `prose` — no marker, but the reply carried a page path. Exact rather than heuristic:
 *     the nineteen routes are unique strings read from the same JSON the AI was given.
 *
 * ⚠ A DECLARED MODEL IS NOT EVIDENCE THE MODEL EXISTS. Every name is validated against the
 * catalogue, the same rule `tierLookup.extractDeclaredTemplates` already applies to
 * templates. A marker carrying only unverifiable names yields NO models and is NOT a
 * decline — see `unverified` below, which exists so those two can never read alike.
 *
 * Node 14, CommonJS.
 */

const { loadReportModels } = require('./reportModels')

/**
 * The marker the AI appends. Deliberately unlike `[[TEMPLATES:` so neither strip can
 * consume the other, and both can appear in one reply in either order.
 */
const MODEL_MARK_OPEN = '[[MODEL:'
const MODEL_MARK_CLOSE = ']]'

/**
 * Every marker anywhere in the text, not just the last one.
 *
 * `stripTemplateMarker` cuts from its marker to the end, so a model marker written AFTER
 * it is already gone while one written BEFORE it survives. Removing every occurrence
 * means the order the AI happens to write them in cannot put a marker on screen.
 */
const MODEL_MARK_ANY = /\[\[MODEL:[^\]]*\]\]/g

/**
 * What the AI writes when it named nothing. Several spellings because a model drifts on
 * exactly this kind of token, and a missed decline is recorded as silence — which is the
 * one reading that loses the fact worth keeping.
 */
const DECLINE_TOKENS = new Set(['none', 'no model', 'no-model', 'nomodel', 'nothing', 'n/a', 'na', 'null'])

let _index = null

/**
 * A catalogue name with its trailing parenthetical removed — "Stock Purchasing (Growth
 * Pro)" → "Stock Purchasing". Only a trailing one, so a name that merely contains
 * brackets mid-string is untouched.
 */
const SHORT_FORM = /\s*\([^)]*\)\s*$/

/** The short form of a name, or null when stripping changes nothing. */
function _shortForm (name) {
  const short = String(name || '').replace(SHORT_FORM, '').trim()
  return (short && short !== String(name || '').trim()) ? short : null
}

/**
 * The catalogue, by route and by name, built once from the file the AI itself was given.
 *
 * Read from `loadReportModels` rather than from a list written out here, so a model added
 * to the JSON is recognised the same day without a second place to remember.
 *
 * @returns {{byRoute: Map<string,string>, byName: Map<string,string>, routes: string[]}}
 */
function catalogue () {
  if (_index) { return _index }
  const models = loadReportModels().models || []
  const byRoute = new Map()
  const byName = new Map()
  models.forEach((m) => {
    if (!m || typeof m.route !== 'string' || !m.route) { return }
    byRoute.set(m.route.toLowerCase(), m.route)
    if (typeof m.name === 'string' && m.name) { byName.set(m.name.toLowerCase().trim(), m.route) }
  })

  // 🔴 ITEM 7.12 — THE SHORT FORM THE AI ACTUALLY WRITES. Measured 2026-09-17: asked the
  // question `/stock-purchasing` answers, the AI named "Stock Purchasing" while the
  // catalogue holds "Stock Purchasing (Growth Pro)". Matching on the full name alone
  // returned null, and EVERY net went quiet at once — `templateHeadingCheck` skipped it
  // (no model resolved, so nothing to report) and a `[[MODEL:]]` carrying the short form
  // counted as `unverified` rather than as a real mention, hiding the miss from the
  // model-choices screen too. One mismatch, two silent failures.
  //
  // ⚠ ADDED SECOND AND NEVER OVER A FULL NAME. A short form is registered only where no
  // model's real name already claims it, so widening this can never re-point an exact
  // match. Two models gain one today (Cost of Capital, Stock Purchasing); a third added
  // later needs no edit here.
  //
  // ⚠ A SHORT FORM CLAIMED BY TWO MODELS IS DROPPED, NOT GUESSED. None collide today.
  // Relying on that rather than enforcing it is how a twentieth model added later
  // silently mis-attributes — the same reasoning as the route sort below.
  const shortSeen = new Map()
  models.forEach((m) => {
    if (!m || typeof m.name !== 'string' || typeof m.route !== 'string' || !m.route) { return }
    const short = _shortForm(m.name)
    if (!short) { return }
    const key = short.toLowerCase()
    if (byName.has(key)) { return }
    shortSeen.set(key, shortSeen.has(key) ? null : m.route)
  })
  shortSeen.forEach((route, key) => { if (route) { byName.set(key, route) } })
  // Longest first: a shorter route that is a prefix of a longer one must never win the
  // alternation. None collide today; relying on that rather than enforcing it is how a
  // nineteenth model added later silently mis-attributes.
  const routes = Array.from(byRoute.values()).sort((a, b) => b.length - a.length)
  _index = { byRoute, byName, routes }
  return _index
}

/** Test seam: forget the cached catalogue so a test can vary the underlying data. */
function _resetCatalogue () { _index = null }

/** Escape a route for use inside a RegExp. */
function _escape (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
}

/**
 * One declared token to a real route, or null.
 *
 * Accepts the page path (what the instruction asks for), the model's name (what the AI
 * sometimes writes instead) and that name's unambiguous short form (item 7.12), because
 * rejecting any of the three would record a real mention as silence. Trailing slashes,
 * markdown emphasis and surrounding quotes are stripped first.
 *
 * ⚠ THIS DOES NOT DECIDE TEMPLATE-OR-MODEL, and must not be made to. SIX model names are
 * also real template titles (three of them one character apart — see
 * `tests/unit/nameCollisions.test.js`, which recomputes the set rather than trusting this
 * comment). `checkTemplateHeadings` tests `isKnownTemplate` and `nearestTemplateTitle`
 * BEFORE calling this, so a template of that name is left alone; that order is what keeps
 * the widening safe.
 *
 * @param {string} token
 * @returns {string|null} the catalogue's own route, or null when nothing matches
 */
function resolveModelToken (token) {
  if (typeof token !== 'string') { return null }
  let t = token.trim()
    .replace(/^[*_`"'“”‘’\s]+|[*_`"'“”‘’\s]+$/g, '')
    .trim()
  if (!t) { return null }
  // A path the AI has written as a link or with a trailing slash is the same path.
  t = t.replace(/[.,;:]+$/, '').replace(/\/+$/, '')
  const lower = t.toLowerCase()
  const { byRoute, byName } = catalogue()
  if (byRoute.has(lower)) { return byRoute.get(lower) }
  if (byName.has(lower)) { return byName.get(lower) }
  return null
}

/**
 * Read the AI's declaration out of the marker.
 *
 * 🔴 `declined` AND `unverified` ARE SEPARATE AND MUST STAY SEPARATE. A marker reading
 * `[[MODEL: none]]` is the AI saying no model fits — the answer the instruction of
 * 2026-09-15 made compulsory, and the most valuable line on the screen. A marker naming a
 * model that is not in the catalogue is the AI inventing one. Both yield an empty
 * `models`, and collapsing them would record a fabrication as good behaviour.
 *
 * @param {string} text - the model's raw output, marker included
 * @returns {{models: string[], declined: boolean, unverified: number}|null} null when no
 *   marker was present, so the caller can tell "declared nothing" from "declared none".
 */
function extractDeclaredModelChoice (text) {
  if (typeof text !== 'string') { return null }
  const open = text.lastIndexOf(MODEL_MARK_OPEN)
  if (open === -1) { return null }
  const close = text.indexOf(MODEL_MARK_CLOSE, open)
  if (close === -1) { return null }

  const body = text.slice(open + MODEL_MARK_OPEN.length, close)
  const seen = new Set()
  const models = []
  let declined = false
  let unverified = 0

  // Split on the declared separator and on commas too — models drift on punctuation, and
  // a missed separator silently drops a real mention.
  body.split(/[|,;]/).forEach((raw) => {
    const token = raw.trim()
    if (!token) { return }
    const bare = token.toLowerCase().replace(/^[*_`"'“”‘’\s]+|[*_`"'“”‘’\s.]+$/g, '').trim()
    if (DECLINE_TOKENS.has(bare)) { declined = true; return }
    const route = resolveModelToken(token)
    if (!route) { unverified++; return }
    if (seen.has(route)) { return }
    seen.add(route)
    models.push(route)
  })

  // A reply that names a model AND says none is a contradiction. The named model is what
  // the advisor actually read, so it wins and the decline is dropped — recording both
  // would put one conversation on the screen twice, saying opposite things.
  if (models.length) { declined = false }

  return { models, declined, unverified }
}

/**
 * Remove every model marker from text destined for the advisor.
 *
 * Unlike `stripTemplateMarker` this removes the markers alone rather than everything from
 * the marker onward: the two markers can arrive in either order, and cutting to the end
 * here would throw away a template marker the other strip still has to read.
 *
 * @param {string} text
 * @returns {string}
 */
function stripModelMarker (text) {
  if (typeof text !== 'string') { return text }
  if (!text.includes(MODEL_MARK_OPEN)) { return text }
  return text.replace(MODEL_MARK_ANY, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')
}

/**
 * Fallback: find page paths written in the reply itself.
 *
 * Exact, not heuristic — every route is a literal string from the same JSON the AI was
 * handed, bounded so `/volatility` cannot match inside `/volatility-report-notes`.
 *
 * @param {string} text
 * @returns {string[]} routes, in catalogue order of appearance, de-duplicated
 */
function extractModelsFromText (text) {
  if (typeof text !== 'string' || !text) { return [] }
  const { routes, byRoute } = catalogue()
  if (!routes.length) { return [] }
  const re = new RegExp('(?<![\\w-])(' + routes.map(_escape).join('|') + ')(?![\\w-])', 'gi')
  const seen = new Set()
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const route = byRoute.get(m[1].toLowerCase())
    if (!route || seen.has(route)) { continue }
    seen.add(route)
    out.push(route)
  }
  return out
}

/**
 * What this reply did about models, and how we know.
 *
 * @param {string} text - the model's raw output, marker included
 * @returns {{models: string[], declined: boolean, source: string, unverified: number}}
 *   `source` is 'declared' (the AI's own marker), 'prose' (the page-path scan) or 'none'
 *   (the reply said nothing about any model — which is normal and is counted, not an error).
 */
function resolveModelChoiceWithSource (text) {
  const declared = extractDeclaredModelChoice(text)
  const unverified = declared ? declared.unverified : 0

  if (declared && (declared.models.length || declared.declined)) {
    return { models: declared.models, declined: declared.declined, source: 'declared', unverified }
  }

  // Either no marker, or a marker we could not verify a single name in. Both fall through
  // to the prose scan rather than being recorded as silence — a real mention in the text
  // is still a real mention, and `unverified` carries the fact that a marker was wrong.
  const prose = extractModelsFromText(text)
  if (prose.length) {
    return { models: prose, declined: false, source: 'prose', unverified }
  }

  return { models: [], declined: false, source: 'none', unverified }
}

module.exports = {
  MODEL_MARK_OPEN,
  MODEL_MARK_CLOSE,
  resolveModelChoiceWithSource,
  extractDeclaredModelChoice,
  extractModelsFromText,
  resolveModelToken,
  stripModelMarker,
  _resetCatalogue
}

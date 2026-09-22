'use strict'

/**
 * @file The app puts a model's page address into the answer. The AI never has to.
 * @module server/utils/modelLinkInjector
 *
 * Asked for by Mike, 2026-09-23, on seeing why the AI was handling a web address at all:
 * *"every model or template is linked via an ID in the cascade search"*. It is, and this
 * is the models finally joining that scheme.
 *
 * 🔴 THE FAULT THIS CLOSES, MEASURED. Six live runs per question (item 7.12, and the
 * tables in `design/features/advisory-engine.md` P2): the AI names **Sales Dashboard**
 * correctly 6 times out of 6 and gives the advisor a link to it 3 times in 6. Across the
 * four questions benched, links landed 9 times out of 24. The advisor is told about a
 * model and left to go hunting for it — and because every individual answer reads
 * perfectly well, nobody in UAT can see it. It is only visible by asking the same
 * question six times and counting.
 *
 * 🔴 WHY IT COULD NOT BE FIXED BY ASKING THE AI BETTER, AND WHY THIS IS THE FIX.
 * `discover.txt` already says, in capitals, *"Use the model's EXACT page path from that
 * list"*. That list is 51,450 characters long and the address is one line inside it. Four
 * separate sessions tuned that prose; each moved some models forward and others back,
 * because the same input does not give the same output twice. **An address is a fact the
 * app holds. Asking anything to copy it is a coin toss; looking it up is not.**
 *
 * ⚠ THE ID IS THE JOIN, NOT DECORATION. A name resolves to an id, and the id yields the
 * page address — the same shape as `outlineResources.templatePageUrl`, which builds a
 * template's address from its master-library `link` id. A model carrying no id is not
 * linkable here, deliberately: `tests/unit/reportModelIds.test.js` is what guarantees
 * none exists, and this is what that guarantee is FOR.
 *
 * ⚠ IT WORKS INSIDE THE MODEL BLOCK AND NOWHERE ELSE, and that is the whole safety
 * argument. SIX model names are also real template titles, three of them a single
 * character apart — so a name met anywhere else can never say which was meant. The set
 * is recomputed by `tests/unit/nameCollisions.test.js` and by this module's own test;
 * do not trust the number in this sentence over either of them, which is the lesson
 * `templateHeadingCheck` records after its count read "two" for weeks. Those six need
 * the AI's own `[[MODEL:]]` marker behind them as well — see `planModelLinks`, which
 * carries the reasoning where the code that enforces it lives.
 * Under `**A model that fits**` the other thirteen names CAN say which was meant:
 * `discover.txt` reserves that block for models and forbids a template in it, the
 * mirror of `templateHeadingCheck`, which reserves "Best match" for templates and
 * forbids a model. Neither guesses; each reads a heading the prompt defines.
 *
 * ⚠ AND IT ONLY EVER FILLS A GAP. A line that already carries a real page address is
 * left exactly as written, even when the address is another model's. Arbitrating between
 * a name and a contradicting address is a judgement about what the AI meant, and this
 * code does not make judgements — it supplies a fact when none is there.
 *
 * Node 14, CommonJS.
 */

const { loadReportModels } = require('./reportModels')
const { resolveModelToken, extractModelsFromText, extractDeclaredModelChoice } = require('./modelChoiceScan')
const { isKnownTemplate, nearestTemplateTitle } = require('./tierLookup')

/** The heading `discover.txt` reserves for calculation models. */
const MODEL_HEADING = 'a model that fits'

/**
 * A heading line: bold on its own, or an ATX heading. Both, because the reply reaches
 * this point still bold, while `normaliseHeadings` upgrades some labels to `####` and a
 * future one could take this heading with it.
 */
const HEADING_LINE = /^\s*(?:\*\*\s*([^*\n]+?)\s*\*\*|#{1,6}\s+(.+?))\s*:?\s*$/

/**
 * A name followed by its one-line reason. The separator carries a space either side, so
 * a hyphenated name ("Margin · Mark-up · Break-even") is not cut at its own hyphen.
 * Lifted deliberately from `templateHeadingCheck.NAME_LINE`: the two parse the same AI,
 * writing to the same format, and drifting apart would be a fault in itself.
 */
const NAME_LINE = /^\s*(?:[-*+]\s+|\d+\.\s+)?(.+?)\s+(?:—|–|-|:)\s+/

/** The closing clause `discover.txt` asks for, when the AI wrote one but got it wrong. */
const OPEN_AT_TAIL = /(\s+(?:—|–|-)\s*open it at\s+)(\S+)\s*$/i

/** Longer than this is a sentence, not a name. */
const MAX_NAME = 80

let _index = null

/**
 * The models keyed by their permanent id, and their routes mapped back to it.
 *
 * Built from `loadReportModels` — the same file the AI itself was given — so a model
 * added to the JSON is linkable the same day with no second place to remember.
 *
 * @returns {{byId: Map<string,object>, idByRoute: Map<string,string>}}
 */
function _catalogue () {
  if (_index) { return _index }
  const byId = new Map()
  const idByRoute = new Map()
  ;(loadReportModels().models || []).forEach((m) => {
    if (!m || typeof m.id !== 'string' || !m.id) { return }
    if (typeof m.route !== 'string' || !m.route) { return }
    byId.set(m.id, m)
    idByRoute.set(m.route.toLowerCase(), m.id)
  })
  _index = { byId, idByRoute }
  return _index
}

/** Test seam: forget the cached index so a test can vary the underlying data. */
function _resetIndex () { _index = null }

/**
 * The permanent id of the model a name refers to, or null.
 *
 * Name resolution is `modelChoiceScan.resolveModelToken` — one implementation, already
 * handling the short forms the AI actually writes ("Stock Purchasing" for "Stock
 * Purchasing (Growth Pro)", item 7.12). This adds only the step that matters here:
 * carrying that through to the record's own identifier.
 *
 * @param {string} name
 * @returns {string|null}
 */
function modelIdFor (name) {
  const route = resolveModelToken(name)
  if (!route) { return null }
  return _catalogue().idByRoute.get(route.toLowerCase()) || null
}

/**
 * The page address the app holds for an id, or null.
 *
 * @param {string} id
 * @returns {string|null}
 */
function pageAddressFor (id) {
  const model = _catalogue().byId.get(id)
  return (model && model.route) || null
}

/** Strip bullets, emphasis and surrounding quotes from a candidate name. */
function _bare (s) {
  return String(s || '')
    .replace(/^[\s*_`"'“”‘’]+|[\s*_`"'“”‘’.,;:]+$/g, '')
    .trim()
}

/**
 * Is this name one a template also answers to?
 *
 * `isKnownTemplate` THEN `nearestTemplateTitle`, in that order, exactly as
 * `templateHeadingCheck` does it — an exact-match test alone reads three of the six as
 * "not a template" and misfired on 28 of 38 bench calls on 2026-09-17. Both the name the
 * AI wrote and the catalogue's own name are tested, so a short form cannot slip a
 * colliding model past the extra evidence the next function demands of it.
 *
 * @param {string} written - the name as it appears in the answer
 * @param {string} catalogued - the model's own name
 * @returns {boolean}
 */
function _alsoATemplateTitle (written, catalogued) {
  return [written, catalogued].some(n =>
    Boolean(n) && (isKnownTemplate(n) || Boolean(nearestTemplateTitle(n)))
  )
}

/**
 * Put the page address on every model line that is missing it.
 *
 * 🔴 THE SIX COLLIDING NAMES NEED THE AI'S OWN DECLARATION, NOT THE HEADING ALONE.
 * `discover.txt` reserves this block for models, but that rule is enforced in ONE
 * direction only: `templateHeadingCheck` catches a model filed under a template heading —
 * and does so on real calls — while NOTHING catches a template filed under the model
 * heading. So for a name a template also answers to, the heading is not evidence enough:
 * attaching our page to a line that meant the document would be a wrong link wearing a
 * right one's clothes, which is the very harm this module exists to end.
 *
 * The marker settles it. The AI appends `[[MODEL: /sales-dashboard]]`, stripped before
 * the advisor reads anything — its own record of which MODELS it used. Declared, the
 * ambiguity is gone and the line is safe to fill. Not declared, those names are left
 * alone. **The other thirteen are unaffected and fill from the heading as before**: this
 * asks for more proof exactly where the proof is needed, rather than giving up on the six
 * — one of which is Sales Dashboard, the model this was built for.
 *
 * @param {string} text - the answer as the advisor would read it, markers already stripped
 * @param {string} [rawBuffer] - the same reply with its markers still on it. Omitted, the
 *   six behave as if the AI declared nothing, which is the safe direction to fail.
 * @returns {{text: string, filled: Array<{name: string, id: string, route: string}>}}
 *   `filled` names each line this supplied an address for — empty when the AI wrote them
 *   all itself, which is the good case and is most of them.
 */
function planModelLinks (text, rawBuffer) {
  if (typeof text !== 'string' || !text) { return { text, filled: [] } }
  if (!text.toLowerCase().includes(MODEL_HEADING)) { return { text, filled: [] } }

  // Strictly the marker, never the page-path fallback beside it: a path written loose in
  // the prose says a path was written, not that the AI meant the model rather than the
  // template of that name — and a line that already carries a path is skipped below anyway.
  const marker = extractDeclaredModelChoice(typeof rawBuffer === 'string' ? rawBuffer : '')
  const declared = new Set(marker ? marker.models : [])

  const lines = text.split('\n')
  const filled = []
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const asHeading = line.match(HEADING_LINE)
    if (asHeading) {
      const label = _bare(asHeading[1] || asHeading[2]).toLowerCase()
      // Any other heading ends the block — a model line never sits under one.
      inBlock = label === MODEL_HEADING
      continue
    }
    if (!inBlock || !line.trim()) { continue }

    const named = line.match(NAME_LINE)
    if (!named) { continue }
    const name = _bare(named[1])
    if (!name || name.length > MAX_NAME) { continue }

    const id = modelIdFor(name)
    if (!id) { continue } // Not a model we hold. Never guess at a page for it.
    const route = pageAddressFor(id)
    if (!route) { continue }

    // The AI wrote a real page address on this line. Leave it, even if it is another
    // model's — see the note at the top of this file.
    if (extractModelsFromText(line).length) { continue }

    // A name a template also answers to needs the AI's own marker behind it. See the
    // header of this function for why the heading alone cannot carry those six.
    const model = _catalogue().byId.get(id)
    if (!declared.has(route) && _alsoATemplateTitle(name, model && model.name)) { continue }

    const tail = line.match(OPEN_AT_TAIL)
    lines[i] = tail
      // It wrote the clause and invented the address. Correct the address, keep its line.
      ? line.slice(0, line.length - tail[0].length) + tail[1] + route
      // It wrote no clause at all — the measured case, 3 times in 6. Add the one
      // `discover.txt` asks it for, in that instruction's own words.
      : line.replace(/\s+$/, '') + ' — open it at ' + route

    filled.push({ name, id, route })
  }

  return { text: lines.join('\n'), filled }
}

/**
 * The same, as the answer pipeline wants it: text in, text out.
 *
 * Logged when it fires, for the reason `scrubAdvisorHallucinations` logs when it fires —
 * how often the AI drops an address is a fact worth being able to read in production,
 * and it becomes invisible the moment this starts silently covering for it.
 *
 * @param {string} text - the answer as the advisor would read it, markers stripped
 * @param {string} [rawBuffer] - the same reply with its markers still on it
 * @returns {string}
 */
function injectModelLinks (text, rawBuffer) {
  const result = planModelLinks(text, rawBuffer)
  if (result.filled.length) {
    console.error('[model-links] supplied ' + result.filled.length + ' page address(es) the reply omitted: ' +
      result.filled.map(f => f.name + ' → ' + f.route).join(', '))
  }
  return result.text
}

module.exports = {
  injectModelLinks,
  planModelLinks,
  modelIdFor,
  pageAddressFor,
  MODEL_HEADING,
  _resetIndex
}

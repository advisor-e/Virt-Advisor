'use strict'

/**
 * @file Is the thing the AI put under a template heading actually a template?
 * @module server/utils/templateHeadingCheck
 *
 * To-do item 7.7. Filed by Mike 2026-09-16 after two live discover-mode conversations
 * both answered a wages question with:
 *
 *     **Best match**
 *     **Wages/Salary Review** — [the model's own summary wording]
 *
 * `Wages/Salary Review` is a CALCULATOR in this app (`/wages-review`). The template
 * library holds `Wages Review` — one word apart, and a different thing. The advisor is
 * sent to Advisor-e for a document that is not there, and finds out in front of their
 * client. Same family as item 7.1, where coaching names templates the library does not
 * hold.
 *
 * 🔴 THE RULE ALREADY EXISTED FOUR TIMES AND WAS IGNORED. `data/prompts/discover.txt`
 * forbids this at lines 33, 38 and 92, and the model-list instruction in
 * `data/report-model-summaries.json` forbids it a fourth time ("Templates are not
 * models"). A fifth sentence is not a fix: item 7.6 proved the same week that changing
 * this prompt's wording does not move the behaviour it is aimed at.
 *
 * ⚠ THE CHECK IS DELIBERATELY NARROW, and it is 4.33's discipline (see
 * `videoInjector.looksLikeCalculatorReference`). A name is reported ONLY when it is
 * absent from the template catalogue AND present in the calculation-model catalogue —
 * both facts read from the shipped data, neither inferred. An unrecognised name that is
 * not one of our models is left alone: this parse reads AI prose, and a wider net would
 * fire on a heading it misread rather than on a real fault.
 *
 * ⚠ WHAT THIS CANNOT SEE. SIX model names are genuine template titles — Working Capital
 * Cycle, Quick Position, Sales Dashboard, and (once punctuation and plural are ignored)
 * Lease vs Buy, High-Level Budget and Dashboard Reports — so for those six a name can
 * never say which was meant. That case is handled where the live defect put it, beside
 * the page path (`videoInjector`, item 4.33).
 *
 * 🔴 THE COUNT WAS WRONG HERE FOR WEEKS, AND THAT IS THE LESSON. This comment said "two",
 * every later note repeated it, and nobody re-derived it from the data — so three
 * templates whose titles differ by one character went on being flagged as calculators.
 * `nearestTemplateTitle` now answers the question from the catalogue on every call, and
 * `tests/unit/nameCollisions.test.js` recomputes the set rather than trusting this prose. If the master export ever carries the doc/slide/sheet
 * type per record it would make that exact rather than inferred; it does not today —
 * all 24 fields of `search_content_20260820053246.json` were checked, and `status` is
 * `"--"` on all 291 rows.
 *
 * Node 14, CommonJS.
 */

const { isKnownTemplate, nearestTemplateTitle } = require('./tierLookup')
const { resolveModelToken } = require('./modelChoiceScan')

/**
 * The headings under which a name MUST be a template, exactly as `discover.txt`
 * formats them. The model block ("A model that fits") is deliberately absent:
 * a model named there is the model being used correctly.
 */
const TEMPLATE_HEADINGS = ['best match', 'also worth considering']

/** Any bolded line on its own — the boundary between one block and the next. */
const HEADING_LINE = /^\s*\*\*\s*([^*\n]+?)\s*\*\*\s*:?\s*$/

/**
 * A name followed by its one-line reason. The separator must carry a space either side,
 * so a hyphenated title ("Break-even Analysis") is not cut in half at its own hyphen.
 */
const NAME_LINE = /^\s*(?:[-*+]\s+|\d+\.\s+)?(.+?)\s+(?:—|–|-|:)\s+/

/** Longer than this is a sentence, not a name. */
const MAX_NAME = 80

/** Strip bullets, emphasis and surrounding quotes from a candidate name. */
function _bare (s) {
  return String(s || '')
    .replace(/^[\s*_`"'“”‘’]+|[\s*_`"'“”‘’.,;:]+$/g, '')
    .trim()
}

/**
 * The names the answer offers as TEMPLATES, with the heading each sat under.
 *
 * @param {string} text - the answer as the advisor would read it (markers stripped)
 * @returns {Array<{heading: string, name: string}>}
 */
function namesUnderTemplateHeadings (text) {
  if (typeof text !== 'string' || !text) { return [] }
  const lines = text.split(/\r?\n/)
  const out = []
  let heading = null

  for (const line of lines) {
    const asHeading = line.match(HEADING_LINE)
    if (asHeading) {
      const label = _bare(asHeading[1]).toLowerCase()
      heading = TEMPLATE_HEADINGS.includes(label) ? label : null
      continue
    }
    if (!heading || !line.trim()) { continue }

    const m = line.match(NAME_LINE)
    if (!m) { continue }
    const name = _bare(m[1])
    if (!name || name.length > MAX_NAME) { continue }
    out.push({ heading, name })
  }
  return out
}

/**
 * Did the answer offer a calculation model as if it were a template?
 *
 * @param {string} text - the answer as the advisor would read it (markers stripped)
 * @returns {{ok: boolean, offenders: Array<{heading: string, name: string, route: string}>}}
 *   `ok` false means the answer must not be sent as written. Each offender names the
 *   heading it sat under and the real page path of the model it actually is, so the
 *   caller can tell the AI precisely what it got wrong.
 */
function checkTemplateHeadings (text) {
  const offenders = []
  const seen = new Set()

  for (const found of namesUnderTemplateHeadings(text)) {
    if (isKnownTemplate(found.name)) { continue }
    // 🔴 THE NEAR MISS, 2026-09-17. SIX model names collide with real template titles,
    // and three differ from the library's own spelling by a single character:
    // "Lease vs Buy" / "Lease vs. Buy", "High-Level Budget" / "High Level Budget",
    // "Dashboard Reports" / "Dashboard Report". An exact-match test read all three as
    // "not a template", so this guard flagged a GENUINE recommendation as a calculator
    // and told the AI the advisor would find nothing in Advisor-e — when the document is
    // in the library. That is this guard causing item 7.7's fault in reverse, and it was
    // firing on 28 of 38 bench calls.
    if (nearestTemplateTitle(found.name)) { continue }
    const route = resolveModelToken(found.name)
    if (!route) { continue }
    const key = found.name.toLowerCase()
    if (seen.has(key)) { continue }
    seen.add(key)
    offenders.push({ heading: found.heading, name: found.name, route })
  }

  return { ok: offenders.length === 0, offenders }
}

/**
 * What to tell the AI so its second attempt is right.
 *
 * Names the exact fault rather than repeating the rule it has already ignored four
 * times: this one is not a general instruction, it is a correction of a specific line
 * it just wrote, with the true nature of the thing it named.
 *
 * @param {Array<{heading: string, name: string, route: string}>} offenders
 * @returns {string}
 */
function buildRetryInstruction (offenders) {
  const faults = offenders.map(o =>
    `"${o.name}" is a CALCULATION MODEL in this app, not a template. Its page is ${o.route}. ` +
    `You put it under "${o.heading === 'best match' ? 'Best match' : 'Also worth considering'}", which is for templates only, ` +
    'so the advisor would go looking in Advisor-e for a document of that name and find nothing.'
  ).join('\n')

  return '\n\n[CORRECTION — YOUR PREVIOUS ANSWER WAS NOT SENT]\n' + faults +
    '\n\nWrite the answer again. Under the template headings name ONLY templates that appear in the ' +
    'template list you were given. If one of the models above genuinely helps, it belongs in the ' +
    '"A model that fits" block with its page path — or leave it out entirely. Keep the same ' +
    'format and the same closing line.' +
    // 🔴 SEEN ON THE FIRST LIVE RUN OF THIS CORRECTION, 2026-09-16. Told it could not use
    // the model it had chosen, the AI reached for a weak template rather than saying
    // nothing fitted — turning our fix into a worse answer. STEP 1 of discover.txt already
    // permits the honest no-match; this says so here, because a model being corrected
    // reads THIS instruction, not the one it has already moved past.
    //
    // 🔴 ITEM 7.8 — AND WHY THE ESCAPE IS FENCED RATHER THAN OPEN. The paragraph above,
    // unfenced, produced an answer carrying BOTH a best match and "I can't find an exact
    // match". The AI was boxed in, not careless: discover.txt specifies the alternatives
    // block as "[1-2 alternative TEMPLATES…]" and never says it may be empty, so a
    // correction that empties it leaves no permitted way out except this sentence. The
    // fence gives it the exit it lacked — an answer with one good template is complete —
    // and confines the no-match line to the whole-answer case it was written for.
    '\n\nKeep your "Best match" if one still fits — this correction does not affect it. If nothing ' +
    'is left for "Also worth considering", leave that block out entirely; an answer with one good ' +
    'template is complete. Only when NO template in the list fits at all, best match included, say ' +
    'so in the words STEP 1 gives you for that — and then it replaces the whole answer rather than ' +
    'sitting inside one. Never write both a best match and "I can\'t find an exact match".'
}

/**
 * The note the advisor reads when the AI has ignored the correction twice.
 *
 * 🔴 WORDING APPROVED BY MIKE, 2026-09-16. It is load-bearing: it is the only thing
 * standing between the advisor and a search in Advisor-e for a document that is not
 * there. Do not reword it without asking him.
 *
 * ⚠ THIS IS THE FLOOR, NOT THE NORMAL PATH. Six live conversations on the day it was
 * built tripped the check four times and the retry corrected every one, so nothing
 * reached this. It exists so that the one time the retry fails, the advisor is told
 * plainly rather than sent looking.
 *
 * @param {Array<{name: string, route: string}>} offenders - from the SECOND check
 * @returns {string|null} the note, or null when there is nothing to say
 */
function buildAdvisorNote (offenders) {
  if (!Array.isArray(offenders) || offenders.length === 0) { return null }
  return offenders.map(o =>
    `⚠️ **${o.name}** is a calculator in this app, not a template — open it at \`${o.route}\`. ` +
    'There is no template of that name in the Advisor-e library.'
  ).join('\n\n')
}

module.exports = {
  checkTemplateHeadings,
  namesUnderTemplateHeadings,
  buildRetryInstruction,
  buildAdvisorNote,
  TEMPLATE_HEADINGS
}

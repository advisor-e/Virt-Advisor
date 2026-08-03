'use strict'

/**
 * @file The one determined change the Logic-Lab page is allowed to make, and the
 *   record it leaves behind.
 * @module server/utils/logicLabAccept
 *
 * THE SPEC IS THE ARTEFACT: design/LOGIC-LAB-ACCEPT-AND-PUSH.md, which carries
 * Mike's request verbatim (2026-08-03) and the reasoning under it. Read that
 * before changing anything here.
 *
 * WHAT THE BUTTON PROMISES, in Mike's words (2026-08-03): *"All I want is that if
 * my adviser uses that phrase, I want them to get their template."* He types the
 * phrase, he names the template, he presses it — and advisors get that template.
 * Which area it is filed under, and how strong the distinction has to be, are the
 * system's problems, not his. He was explicit that they are not choices to offer.
 *
 * WHY IT CREATES A DISTINCTION RATHER THAN EDITING ONE — measured, not reasoned.
 * The first build attached the wanted template to whichever distinction had
 * matched. Run against the live engine on Mike's own case that CANNOT work: the
 * distinction that matched already named the winning template, and a boost lifts
 * EVERY template a distinction names, so both rose together at every strength up
 * to the maximum (winner 25, wanted 21). A distinction naming only the wanted
 * template lifts only it — which is what makes the required strength computable,
 * and what makes the promise keepable.
 *
 * NOTHING IS AUTHORED. The description and trigger are the manager's own typed
 * sentence and the template is the one they named; this app never writes a word of
 * a firm's material (CLAUDE.md). It only files what they typed where the engine
 * will read it.
 *
 * PURE — no I/O, no database, no engine coupling. The caller supplies the scores
 * and the firm's rows and gets back a plan or a refusal, which is what lets the
 * arithmetic and every refusal be tested without a server. The caller is also
 * responsible for the part that cannot be reasoned about: RE-RUNNING the phrase
 * afterwards to prove the template really did come first.
 */

// Bounds for the free-text context the browser sends purely for the record. It is
// never trusted for anything that decides the write — those facts are re-resolved
// server-side — but it is still stored, so it is still bounded.
const MAX_SENTENCE = 2000
const MAX_LABEL = 200
const MAX_LIST = 25

/**
 * Trim a value to a bounded string.
 * @param {*} value
 * @param {number} max
 * @returns {string}
 */
function _str (value, max) {
  return String(value === null || value === undefined ? '' : value).trim().slice(0, max)
}

/**
 * Bound an array of strings both in length and in element size.
 * @param {*} value
 * @param {number} maxItems
 * @param {number} maxLen
 * @returns {string[]}
 */
function _strList (value, maxItems, maxLen) {
  if (!Array.isArray(value)) { return [] }
  return value.slice(0, maxItems).map(v => _str(v, maxLen)).filter(Boolean)
}

/**
 * The record of an accepted idea.
 *
 * NOT AN OPTIMISATION TO ADD LATER — required from the first commit, because it
 * captures INTENT, which no count of configuration can. A firm's stored config
 * says what they have; this says what they were trying to achieve and what they
 * had to do to get there. Retrofitting it means the first months of the most
 * valuable material simply never existed.
 *
 * It is the feed for the planned mentor rollup (design/LOGIC-LAB-ACCEPT-AND-PUSH.md
 * §1), where "nine firms had to write their own distinction to get Governance
 * Introduction for this language" is a platform gap rather than nine firm gaps.
 *
 * ⚠ PRIVACY, STATED RATHER THAN ASSUMED. `sentence` is typed by the FIRM MANAGER
 * into the diagnostic box — it is not harvested from an advisor's session — but a
 * manager may paste a client's words into it. Inside one firm that is their own
 * material. The decision that actually matters is the mentor rollup, which reads
 * ACROSS firms: whether it sends sentences or only counts is a separate ruling and
 * is deliberately still open. Everything else here is configuration and counts,
 * which is the property logicLabSummary.js holds and what makes reading across
 * firms a content question rather than a privacy one.
 *
 * @param {Object} input
 * @param {Object} input.plan - the accepted plan from planDeliver
 * @param {Object} [input.context] - what the diagnosis showed, from the browser.
 *   Descriptive only: nothing here decides what is written.
 * @param {string} input.by - the authenticated manager's email
 * @param {string} input.at - ISO timestamp
 * @returns {Object} the entry to append to the firm's accepted-idea log
 */
function buildLogEntry (input) {
  const opts = input || {}
  const plan = opts.plan || {}
  const ctx = opts.context || {}

  return {
    at: _str(opts.at, 40),
    by: _str(opts.by, MAX_LABEL),
    tier: _str(plan.tier, 40) || TIER_DELIVER,

    // What the manager was trying to do.
    sentence: _str(ctx.sentence, MAX_SENTENCE),
    problem: _str(ctx.problem, 40),
    domain: _str(ctx.domain, MAX_LABEL) || _str(plan.domain, MAX_LABEL),
    expectedTemplate: _str(plan.templateTitle, MAX_LABEL),

    // What the engine had done with it, so the record explains itself later
    // without needing the run to be repeatable — it is not, since the distinction
    // classifier is a live AI call.
    tablesOpened: _strList(ctx.tablesOpened, MAX_LIST, MAX_LABEL),
    phrasesMatched: _strList(ctx.phrasesMatched, MAX_LIST, MAX_LABEL),
    distinctionsMatched: _strList(ctx.distinctionsMatched, MAX_LIST, MAX_LABEL),
    gap: typeof ctx.gap === 'number' && isFinite(ctx.gap) ? ctx.gap : null,

    // What was actually changed.
    distinctionId: plan.id === null || plan.id === undefined ? null : plan.id,
    distinctionSource: _str(plan.source, 40),
    distinctionDescription: _str(plan.description, MAX_LABEL),
    templatesBefore: _strList(plan.templatesBefore, MAX_LIST, MAX_LABEL),
    templatesAfter: _strList(plan.templatesAfter, MAX_LIST, MAX_LABEL)
  }
}

/** The tier that DELIVERS: a distinction of the firm's own that wins. */
const TIER_DELIVER = 'deliver-template'

/** The engine's own ceiling on a distinction's strength (see createDistinction). */
const MAX_BOOST = 20
const MIN_BOOST = 1

/**
 * How strong the new distinction has to be for the firm's template to come FIRST.
 *
 * THE ARITHMETIC THAT MATTERS, proved against the live engine on 2026-08-03:
 * a distinction's boost is added to EVERY template it names. So a distinction
 * naming only the wanted template lifts only that template, and the winner stays
 * where it is — which is why this is computable at all. (Attaching the same
 * template to a distinction that ALSO names the current winner lifts both by the
 * same amount and can never close the gap, no matter how high the boost goes.
 * Measured: at boost 20 the winner went to 25 and the wanted template to 21.)
 *
 * `+1` because a draw is not a win: ties are settled by scoring the firm cannot
 * see, so matching the top score would be a guess dressed as arithmetic.
 *
 * @param {number} topScore - the current winner's score
 * @param {number} templateScore - what the wanted template scores today
 * @returns {number} the boost to use, clamped to what the engine accepts
 */
function requiredBoost (topScore, templateScore) {
  const gap = (Number(topScore) || 0) - (Number(templateScore) || 0)
  return Math.min(MAX_BOOST, Math.max(MIN_BOOST, Math.ceil(gap) + 1))
}

/**
 * Plan the distinction that DELIVERS the template the firm asked for.
 *
 * MIKE'S INSTRUCTION, 2026-08-03, verbatim: *"All I want is that if my adviser
 * uses that phrase, I want them to get their template."* Which area it is filed
 * under is the system's problem, not his — so the detected domain is used without
 * asking, and the strength is worked out rather than offered as a choice.
 *
 * NOTHING IS AUTHORED. The description and the trigger are the manager's OWN
 * typed sentence, and the template is the one they named. The app never writes a
 * word of the firm's material (CLAUDE.md) — it only files what they typed where
 * the engine will read it.
 *
 * ONE TEMPLATE, DELIBERATELY. Naming a second would spread the boost onto it and
 * re-create the very failure this replaces.
 *
 * If the firm already has a row with the same wording in the same area, this
 * plans an UPDATE of that row rather than a second copy of it — pressing the
 * button twice must not litter their configuration.
 *
 * @param {Object} input
 * @param {string} input.text - the advisor's phrase, as the manager typed it
 * @param {string} input.templateTitle - the template they want delivered
 * @param {string} input.domain - the area the phrase was read as
 * @param {string[]} input.libraryTitles - every title in the firm's library
 * @param {Array<Object>} input.existingRows - the firm's OWN rows
 * @param {number} input.boost - from requiredBoost()
 * @returns {{ok: false, code: string, message: string}|{ok: true, plan: Object}}
 */
function planDeliver (input) {
  const opts = input || {}
  const text = _str(opts.text, MAX_SENTENCE)
  const title = _str(opts.templateTitle, MAX_LABEL)
  const domain = _str(opts.domain, MAX_LABEL)

  if (!text) {
    return { ok: false, code: 'INVALID_BODY', message: 'the advisor’s phrase is required' }
  }
  if (!title) {
    return { ok: false, code: 'INVALID_TEMPLATE', message: 'templateTitle is required' }
  }
  const titles = Array.isArray(opts.libraryTitles) ? opts.libraryTitles : []
  if (!titles.some(t => String(t) === title)) {
    return { ok: false, code: 'TEMPLATE_NOT_IN_LIBRARY', message: 'No template in this library has that title' }
  }
  if (!domain) {
    // Distinctions are only ever read inside an area. With none recognised there
    // is nowhere to file it that the engine would look.
    return { ok: false, code: 'NO_DOMAIN', message: 'These words were not recognised as any advisory area' }
  }

  const boost = Math.min(MAX_BOOST, Math.max(MIN_BOOST, Math.ceil(Number(opts.boost) || MIN_BOOST)))
  const existing = (Array.isArray(opts.existingRows) ? opts.existingRows : [])
    .find(r => r && _str(r.domain, MAX_LABEL) === domain &&
      _str(r.description, MAX_SENTENCE).toLowerCase() === text.toLowerCase())

  return {
    ok: true,
    plan: {
      tier: TIER_DELIVER,
      mode: existing ? 'update' : 'create',
      id: existing ? existing.id : null,
      domain,
      description: text,
      // The manager's own sentence is the trigger too. The AI judges by meaning,
      // so it does not need to be split into clever phrases.
      triggers: [text],
      templates: [title],
      templateTitle: title,
      boost,
      templatesBefore: existing && Array.isArray(existing.templates) ? existing.templates : [],
      templatesAfter: [title]
    }
  }
}

module.exports = { planDeliver, requiredBoost, buildLogEntry, TIER_DELIVER, MAX_BOOST }

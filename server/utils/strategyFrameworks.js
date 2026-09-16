'use strict'

/**
 * strategyFrameworks — the Strategy Planner's frameworks, read as data and joined to the
 * concept text that already exists elsewhere.
 *
 * @module server/utils/strategyFrameworks
 *
 * Design: `design/mockups/strategy-planner.html`, Decision 3, ruled by Mike 2026-09-16 —
 * **a framework is DATA naming its capture shape, and is never its own screen.** Five
 * shapes cover all 45 frameworks the four Planning Domains hold, and a mentor adds the
 * 46th by typing rather than by asking for a developer. To-do item 15.1.
 *
 * 🔴 IF A FRAMEWORK WILL NOT FIT A SHAPE, ADD A SHAPE — NEVER A COMPONENT FOR THAT ONE
 * FRAMEWORK. One more shape serves all 45; one more component serves one, and forty-five
 * components is the build that never ends. That is the whole of Decision 3.
 *
 * 🔴 IT READS ACROSS THREE DOMAIN FILES, NOT ONE, AND THAT IS NOT AN OPTIMISATION. Mike
 * ruled the four Planning Domains ARE the session, and two of them are authored outside
 * the strategy file: Sales & Marketing Review in `sales-marketing-domain-support.json`,
 * Organisational Review in `staff-domain-support.json`. A loader that read only the
 * strategy file would deliver half the session while looking complete — the exact claim
 * that had to be corrected on item 15.1 before any of this was drawn.
 *
 * 🔴 THE CONCEPT TEXT IS JOINED, NEVER COPIED. `data/strategy-frameworks.json` holds a
 * `material` pointer; the summary and the steps stay in the domain support file where they
 * are authored, reach the AI and are edited. A second copy would drift from the first and
 * nothing would fail — the failure mode this codebase already has a name for.
 *
 * WHAT VALIDATION IS FOR HERE. These records are authored, and will be authored by a
 * mentor on a screen once the Mentor Hub tab is built. A malformed one must fail loudly at
 * load rather than render an empty grid an advisor fills in and loses: a capture box with
 * a duplicate key silently overwrites its twin in `strategy_session_entries`, whose UNIQUE
 * key is (session, framework, field). That is a wrong plan, not a cosmetic fault, and it
 * is invisible on screen.
 *
 * Node 14, CommonJS.
 */

const FRAMEWORK_DATA = require('../../data/strategy-frameworks.json')

/**
 * The domain support files a framework may point its `material` at, by the key used in
 * `strategy-frameworks.json`. Adding a domain here is how a framework in a new advisory
 * domain joins the Planner.
 */
const DOMAIN_SUPPORT = {
  strategy: require('../../data/strategy-domain-support.json'),
  'sales-marketing': require('../../data/sales-marketing-domain-support.json'),
  staff: require('../../data/staff-domain-support.json')
}

/**
 * The four Planning Domains, in the order ADV.0 Planning Outcomes presents them, with the
 * deck's own descriptions. This is the session's own structure and it is NOT the app's
 * advisory domains — a Planning Domain draws its frameworks from whichever advisory domain
 * authored them, which is why this module reads three domain support files.
 */
const PLANNING_DOMAIN_RECORDS = FRAMEWORK_DATA.planningDomains || []

/** Their ids, in the same order. What a framework's `planningDomains` is checked against. */
const PLANNING_DOMAINS = PLANNING_DOMAIN_RECORDS.map(d => d.id)

/**
 * Capture shapes, and how many boxes each may hold.
 *
 * `placement` (a 2×2 an owner is placed on — the Heald Matrix, Business Dating) and
 * `actions` (a Task / Whom / When table) are the two expected next, and are deliberately
 * absent until something needs them. Adding one is a change here and in the renderer, and
 * to nothing else.
 */
const STRATEGY_SHAPES = {
  // Sort ideas under named headings — the 8 Profit Levers.
  buckets: { min: 2, max: 12 },
  // Exactly four. A "quadrant" grid with three or five boxes is a different thing
  // wearing the name, and the renderer's 2×2 would misplace it.
  quadrants: { min: 4, max: 4 },
  // Five forces, or six when the deck asks for a response as well as an observation.
  forces: { min: 5, max: 6 },
  // A short list of statements side by side — the Strategic Objective and the Strategy.
  statements: { min: 2, max: 4 },
  // A table: `rows` × `columns`, expanded into ordinary fields by expandRows below.
  actions: { min: 1, max: 80 }
}

/** Where a column may draw its options from, when it offers a fixed list. */
const OPTION_SOURCES = {
  growthAspects: (require('../../data/growth-fundamentals.json').growthAspects || [])
    .map(a => a.name)
}

function fail (code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

/**
 * The material a framework's concept text comes from.
 * @param {{domain: string, id: string}} ref
 * @returns {object} the material record from its domain support file
 * @throws {Error} err.code 'BAD_FRAMEWORK'
 */
function resolveMaterial (ref) {
  if (!ref || !ref.domain || !ref.id) {
    throw fail('BAD_FRAMEWORK', 'A framework must name the material its concept comes from.')
  }
  const support = DOMAIN_SUPPORT[ref.domain]
  if (!support) {
    throw fail('BAD_FRAMEWORK',
      'No domain support file is registered for "' + ref.domain + '".')
  }
  const material = (support.materials || []).find(m => m.id === ref.id)
  if (!material) {
    throw fail('BAD_FRAMEWORK',
      'No material "' + ref.id + '" in the ' + ref.domain + ' domain support.')
  }
  return material
}

/**
 * A table framework authors `rows` and `columns`; the store, the navigation timeline and
 * the audit trail all work in ordinary fields, so it is expanded here rather than special-
 * cased in four places downstream. `row-3-whom` is just a field key.
 *
 * @param {object} raw
 * @returns {object[]|null} the expanded fields, or null when this is not a table
 */
function expandRows (raw) {
  if (raw.shape !== 'actions') { return null }
  const columns = Array.isArray(raw.columns) ? raw.columns : []
  const rows = Number(raw.rows) || 0
  if (!columns.length || rows < 1) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + raw.id + '" is a table and needs both rows and columns.')
  }
  const out = []
  for (let r = 1; r <= rows; r++) {
    columns.forEach((c) => {
      out.push({
        key: 'row-' + r + '-' + c.key,
        label: c.label,
        prompt: r === 1 ? (c.prompt || '') : '',
        row: r,
        column: c.key,
        options: c.optionsFrom ? (OPTION_SOURCES[c.optionsFrom] || []) : null
      })
    })
  }
  return out
}

/**
 * Check one authored framework and return it joined to its material.
 *
 * Validation is deliberately strict about field keys: two boxes sharing a key would share
 * a row in `strategy_session_entries`, so one would silently overwrite the other and the
 * plan would quote whichever was typed last. Nothing on screen would say so.
 *
 * @param {object} raw a record from data/strategy-frameworks.json
 * @returns {object} the framework, with conceptSummary, whoWhen and steps joined in
 * @throws {Error} err.code 'BAD_FRAMEWORK'
 */
function buildFramework (raw) {
  const id = String((raw && raw.id) || '').trim()
  if (!id) {
    throw fail('BAD_FRAMEWORK', 'A framework must have an id.')
  }

  const shape = String(raw.shape || '')
  const rules = STRATEGY_SHAPES[shape]
  if (!rules) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + id + '" names an unknown capture shape "' + shape + '".')
  }

  const fields = expandRows(raw) || (Array.isArray(raw.fields) ? raw.fields : [])
  if (fields.length < rules.min || fields.length > rules.max) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + id + '" is a ' + shape + ' with ' + fields.length +
      ' boxes; that shape takes ' + rules.min + ' to ' + rules.max + '.')
  }

  const keys = fields.map(f => String((f && f.key) || ''))
  if (keys.some(k => !k)) {
    throw fail('BAD_FRAMEWORK', 'Every box in framework "' + id + '" needs a key.')
  }
  if (new Set(keys).size !== keys.length) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + id + '" has two boxes with the same key; one would overwrite the other.')
  }

  const domains = Array.isArray(raw.planningDomains) ? raw.planningDomains : []
  if (!domains.length) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + id + '" belongs to no Planning Domain, so no session can reach it.')
  }
  const unknown = domains.filter(d => !PLANNING_DOMAINS.includes(d))
  if (unknown.length) {
    throw fail('BAD_FRAMEWORK',
      'Framework "' + id + '" names a Planning Domain that does not exist: ' + unknown.join(', ') + '.')
  }

  const material = resolveMaterial(raw.material)

  return {
    id,
    name: raw.name || material.name,
    planningDomains: domains.slice(),
    helpsClientTo: raw.helpsClientTo || '',
    // 🔴 THE SESSION SCOPE LINE, AND IT IS NOT THE COACHING SUMMARY. Mike ruled
    // 2026-09-16, comparing the build against the approved drawing: screen 1 shows ONE
    // SHORT LINE per framework, because a domain holding fifteen is unreadable otherwise.
    // `conceptSummary` below is the long coaching text and belongs on the CARD, where the
    // advisor reads it while running the session. Two sentences, two readers, and neither
    // may be deleted in favour of the other. Falls back so a framework without one still
    // renders something rather than an empty column.
    explores: raw.explores || '',
    captureInstruction: raw.captureInstruction || '',
    shape,
    // Decision 3's other half: a framework that closes the session rather than being one
    // of the ones chosen on screen 1. Every session gets these; they are not ticked.
    closesTheSession: raw.closesTheSession === true,
    fields: fields.map(f => ({
      key: String(f.key),
      label: String(f.label || ''),
      prompt: String(f.prompt || ''),
      centre: f.centre === true,
      row: f.row || null,
      column: f.column || null,
      options: Array.isArray(f.options) ? f.options.slice() : null
    })),
    // Decision 5: a framework with an existing model runs it INSIDE the card, on the same
    // backend route as the standalone page. Absent for a framework that has no model.
    model: raw.model ? { route: raw.model.route } : null,
    // Joined, never copied — see the module header.
    conceptSummary: material.summary || '',
    whoWhen: material.who_when || '',
    steps: Array.isArray(material.steps) ? material.steps.slice() : [],
    materialRef: { domain: raw.material.domain, id: raw.material.id }
  }
}

/**
 * Every authored framework, validated and joined.
 *
 * Built once at require time rather than per call: these are static authored records, and
 * a malformed one should take the process down at boot rather than surface as an empty
 * grid halfway through a client meeting.
 *
 * @type {object[]}
 */
const FRAMEWORKS = (FRAMEWORK_DATA.frameworks || []).map(buildFramework)

const BY_ID = FRAMEWORKS.reduce(function (acc, f) {
  if (acc[f.id]) {
    throw fail('BAD_FRAMEWORK', 'Two frameworks share the id "' + f.id + '".')
  }
  acc[f.id] = f
  return acc
}, {})

/**
 * Every framework the Planner knows.
 * @returns {object[]} copies, so a caller cannot mutate the loaded set
 */
function listFrameworks () {
  return FRAMEWORKS.map(cloneFramework)
}

/**
 * The four Planning Domains with their names and the deck's descriptions, each carrying
 * how many frameworks it currently offers.
 *
 * ⚠ A COUNT OF ZERO IS HONEST AND MUST STAY VISIBLE. Organisational Review's eight and
 * Sales & Marketing's fifteen are authored in the other two domain support files and have
 * not reached the Planner yet. Hiding an empty domain would make the session look complete
 * when half of it is missing — the same failure the item's own note had to be corrected for.
 *
 * @returns {object[]} `{ id, name, description, frameworkCount }`
 */
function listPlanningDomains () {
  return PLANNING_DOMAIN_RECORDS.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    frameworkCount: FRAMEWORKS.filter(
      f => !f.closesTheSession && f.planningDomains.includes(d.id)).length
  }))
}

/**
 * The frameworks that CLOSE a session rather than being chosen for it — the Strategic
 * Statements and the Action Plan. Every session gets them, so they never appear on screen
 * 1's Session Scope table and are never ticked.
 * @returns {object[]}
 */
function closingFrameworks () {
  return FRAMEWORKS.filter(f => f.closesTheSession).map(cloneFramework)
}

/**
 * The frameworks one Planning Domain offers, for screen 1's Session Scope table.
 * @param {string} planningDomain one of PLANNING_DOMAINS
 * @returns {object[]}
 */
function frameworksForPlanningDomain (planningDomain) {
  const domain = String(planningDomain || '')
  return FRAMEWORKS
    // A closing framework is never on a Session Scope table — every session gets it.
    .filter(f => !f.closesTheSession && f.planningDomains.includes(domain))
    .map(cloneFramework)
}

/**
 * One framework, or null.
 * @param {string} id
 * @returns {object|null}
 */
function getFramework (id) {
  const found = BY_ID[String(id || '')]
  return found ? cloneFramework(found) : null
}

/**
 * Whether a field key belongs to a framework. The capture route uses this so a box nobody
 * authored cannot be written into a session — the same reason the store bounds what it
 * accepts, one layer up.
 * @param {string} frameworkId
 * @param {string} fieldKey
 * @returns {boolean}
 */
function hasField (frameworkId, fieldKey) {
  const f = BY_ID[String(frameworkId || '')]
  if (!f) { return false }
  return f.fields.some(x => x.key === String(fieldKey || ''))
}

/** @param {object} f @returns {object} */
function cloneFramework (f) {
  return Object.assign({}, f, {
    planningDomains: f.planningDomains.slice(),
    fields: f.fields.map(x => Object.assign({}, x, {
      options: x.options ? x.options.slice() : null
    })),
    steps: f.steps.slice(),
    model: f.model ? Object.assign({}, f.model) : null,
    materialRef: Object.assign({}, f.materialRef)
  })
}

module.exports = {
  listFrameworks,
  listPlanningDomains,
  closingFrameworks,
  frameworksForPlanningDomain,
  getFramework,
  hasField,
  PLANNING_DOMAINS,
  STRATEGY_SHAPES,
  // exported so a test can check an authored record without reaching into the file
  buildFramework
}

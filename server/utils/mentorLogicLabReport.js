'use strict'

/**
 * @file The Logic Lab Report rollup — what every firm pushed back, read together.
 * @module server/utils/mentorLogicLabReport
 *
 * THE ARTEFACT IS design/mockups/mentor-logic-lab-report-mockup.html, approved by
 * Mike on 2026-08-04 ("i love it, it looks great"), and design/MENTOR-AI-HUB-STUB.md
 * states its shape: the Mentor Hub is the Firm Manager Hub re-scoped, plus this one
 * addition.
 *
 * WHY THE PUSHED-EDIT FEED IS THE PAGE, and the counts are supporting material —
 * the artefact's own words: "Counting configuration tells you WHAT FIRMS HAVE. A
 * pushed edit tells you WHAT A FIRM WAS TRYING TO ACHIEVE and what they had to do
 * to get there." One firm pushing a fix is that firm's preference. Several firms
 * pushing the same fix is a default of Mike's that needed fixing.
 *
 * THE PRIVACY LINE, and it is not incidental. This is the second read in the app
 * that crosses the firm boundary (the first is the anonymised case feed, which is
 * double opt-in). It is defensible only because it carries CONFIGURATION AND
 * COUNTS: the sentence a manager typed into their own Logic-Lab, the engine's
 * reading of it, the template they expected, the change they made. No client name,
 * no advisor name, no session narrative — none of which is in the accepted-idea
 * log to begin with (see logicLabAccept.buildLogEntry). `assertNoPersonalFields`
 * below enforces that at the boundary rather than trusting the upstream shape.
 */

/** Fields of an accepted-idea entry this report is allowed to surface. */
const PUBLISHABLE = [
  'at', 'by', 'tier', 'sentence', 'problem', 'domain', 'expectedTemplate',
  'tablesOpened', 'phrasesMatched', 'distinctionsMatched', 'gap',
  'distinctionId', 'distinctionSource', 'distinctionDescription',
  'templatesBefore', 'templatesAfter'
]

/**
 * How many firms must push the same change before it reads as a platform gap
 * rather than one firm's preference. The artefact draws the line at "several":
 * two is "watch, don't act", five or more is "the baseline is pointing at the
 * wrong one".
 */
const PLATFORM_GAP_FIRMS = 5
const WATCH_FIRMS = 2

/**
 * Strip an accepted-idea entry to the fields this page may show.
 *
 * A whitelist, not a blacklist: a field added upstream tomorrow does not silently
 * cross the firm boundary because nobody remembered to exclude it. `by` is the
 * firm manager's own attribution and is dropped here — the report is about
 * patterns across firms, and naming the individual who made an edit serves no
 * purpose the firm name does not.
 *
 * @param {object} entry
 * @returns {object}
 */
function publishableFields (entry) {
  const out = {}
  for (const k of PUBLISHABLE) {
    if (k === 'by') { continue }
    if (entry && Object.prototype.hasOwnProperty.call(entry, k)) { out[k] = entry[k] }
  }
  return out
}

/**
 * The read Mike gets on a group, in the artefact's own terms.
 *
 * @param {number} firmCount
 * @returns {string} one of 'platform-gap' | 'watch' | 'preference'
 */
function readingFor (firmCount) {
  if (firmCount >= PLATFORM_GAP_FIRMS) { return 'platform-gap' }
  if (firmCount >= WATCH_FIRMS) { return 'watch' }
  return 'preference'
}

/**
 * Group accepted ideas by the change they made, which is what makes a pattern
 * visible at all.
 *
 * Grouped on the template the firm was steering TOWARD, within a domain — the
 * artefact's first and largest group is exactly that shape ("Steered
 * decision-quality situations to Governance Introduction"). Grouping on the
 * sentence instead would produce one group per edit and show nothing.
 *
 * @param {Array<{firmId: string, firmName: string, entries: Array<object>}>} perFirm
 * @returns {Array<object>} groups, largest first.
 */
function groupPushedEdits (perFirm) {
  const groups = new Map()

  for (const firm of perFirm) {
    for (const entry of firm.entries) {
      const template = String(entry.expectedTemplate || '').trim()
      const domain = String(entry.domain || '').trim()
      // An edit that names no template cannot be grouped by one, and inventing a
      // bucket for it would put unrelated changes side by side.
      if (!template) { continue }
      const key = `${domain}::${template}`
      if (!groups.has(key)) {
        groups.set(key, { key, domain, template, firms: new Set(), edits: [] })
      }
      const g = groups.get(key)
      g.firms.add(firm.firmId)
      g.edits.push(Object.assign({ firmName: firm.firmName }, publishableFields(entry)))
    }
  }

  return [...groups.values()]
    .map(g => ({
      key: g.key,
      domain: g.domain,
      template: g.template,
      firmCount: g.firms.size,
      editCount: g.edits.length,
      reading: readingFor(g.firms.size),
      // Newest first: the artefact opens the first group and shows a sample, so
      // what is shown should be what happened most recently.
      edits: g.edits.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    }))
    .sort((a, b) => b.firmCount - a.firmCount || b.editCount - a.editCount)
}

/**
 * Which templates firms deliberately steered the engine toward, most first.
 *
 * Counted in FIRMS, not edits: one firm pushing the same template nine times is
 * one firm's preference, and counting edits would dress it up as nine.
 *
 * @param {Array<object>} perFirm
 * @returns {Array<{title: string, firms: number}>}
 */
function preferredTemplates (perFirm) {
  const byTemplate = new Map()
  for (const firm of perFirm) {
    const seen = new Set()
    for (const entry of firm.entries) {
      const t = String(entry.expectedTemplate || '').trim()
      if (!t || seen.has(t)) { continue }
      seen.add(t)
      byTemplate.set(t, (byTemplate.get(t) || 0) + 1)
    }
  }
  return [...byTemplate.entries()]
    .map(([title, firms]) => ({ title, firms }))
    .sort((a, b) => b.firms - a.firms || a.title.localeCompare(b.title))
}

/**
 * Which editable functions firms actually touch.
 *
 * The artefact's point about this table is the NEGATIVE reading: "a lever nobody
 * touches is either perfect or not understood — worth knowing which." So a lever
 * with zero firms is kept in the list rather than dropped for being empty.
 *
 * @param {Array<{levers: object}>} perFirm - each firm's buildLeverSummary output.
 * @returns {Array<{lever: string, firms: number}>}
 */
function leverUsage (perFirm) {
  const counters = {
    distinctions: 0,
    logicTableTriggers: 0,
    logicLab: 0,
    quizBanks: 0,
    domainSupport: 0
  }
  for (const firm of perFirm) {
    const l = firm.levers || {}
    if ((l.distinctions && l.distinctions.firmOwn) > 0) { counters.distinctions++ }
    if ((l.logicTables && l.logicTables.edited) > 0) { counters.logicTableTriggers++ }
    if (firm.entries.length > 0) { counters.logicLab++ }
    if ((l.quizBanks && l.quizBanks.edited) > 0) { counters.quizBanks++ }
    if ((l.domainSupport && l.domainSupport.edited) > 0) { counters.domainSupport++ }
  }
  return Object.keys(counters).map(lever => ({ lever, firms: counters[lever] }))
}

/**
 * Throw if anything that could identify a person reached the payload.
 *
 * A belt-and-braces check at the boundary. The accepted-idea log has never held a
 * client or advisor name, but this page is the one place that would publish it
 * across firms if it ever did, and a privacy failure discovered afterwards cannot
 * be undone. Fails loudly rather than filtering silently: a silent filter would
 * hide the day the upstream shape changed.
 *
 * @param {object} report
 * @throws {Error} when a forbidden field is present.
 */
function assertNoPersonalFields (report) {
  const FORBIDDEN = ['clientName', 'advisorName', 'transcript', 'summary', 'caseId', 'userEmail', 'by']
  const seen = JSON.stringify(report)
  for (const field of FORBIDDEN) {
    if (new RegExp(`"${field}"\\s*:`).test(seen)) {
      throw new Error(`mentorLogicLabReport: forbidden field "${field}" reached the cross-firm payload`)
    }
  }
}

/**
 * Build the whole report.
 *
 * @param {object} input
 * @param {Array<object>} input.firms - one per firm on the platform:
 *   { firmId, firmName, entries: Array<acceptedIdea>, levers: leverSummary, lastActivity }
 * @param {string} [input.rolledUpAt] - ISO stamp, supplied by the caller.
 * @returns {object} the four sections of the artefact, plus its honest limits.
 */
function buildMentorLogicLabReport (input) {
  const firms = (input && Array.isArray(input.firms)) ? input.firms : []
  const perFirm = firms.map(f => ({
    firmId: String(f.firmId || ''),
    firmName: String(f.firmName || f.firmId || ''),
    entries: Array.isArray(f.entries) ? f.entries : [],
    levers: f.levers || {},
    lastActivity: f.lastActivity || null
  }))

  const groups = groupPushedEdits(perFirm)
  const firmsWithPushes = perFirm.filter(f => f.entries.length > 0)
  const totalEdits = perFirm.reduce((n, f) => n + f.entries.length, 0)

  const report = {
    rolledUpAt: (input && input.rolledUpAt) || null,

    // ── 1 · What firms pushed ────────────────────────────────────────
    groups,

    // ── 2 · The platform at a glance ─────────────────────────────────
    glance: {
      pushedEdits: totalEdits,
      firmsWithPushes: firmsWithPushes.length,
      firms: perFirm.length,
      firmsThatEditedSomething: perFirm.filter(f => hasAnyEdit(f)).length,
      firmOwnDistinctions: perFirm.reduce((n, f) => n + leverNum(f, 'distinctions', 'firmOwn'), 0),
      logicTableEdits: perFirm.reduce((n, f) => n + leverNum(f, 'logicTables', 'edited'), 0)
    },

    // ── 3 · What gets used ───────────────────────────────────────────
    usage: {
      templates: preferredTemplates(perFirm),
      levers: leverUsage(perFirm)
    },

    // ── 4 · Firm by firm ─────────────────────────────────────────────
    firms: perFirm.map(f => ({
      firmName: f.firmName,
      pushedEdits: f.entries.length,
      distinctions: leverNum(f, 'distinctions', 'firmOwn'),
      tableEdits: leverNum(f, 'logicTables', 'edited'),
      lastActivity: f.lastActivity,
      // The artefact flags these explicitly: a firm that has never edited
      // anything runs entirely on Mike's baseline.
      defaultsOnly: !hasAnyEdit(f)
    })).sort((a, b) => b.pushedEdits - a.pushedEdits || a.firmName.localeCompare(b.firmName))
  }

  assertNoPersonalFields(report)
  return report
}

/** @param {object} firm @param {string} group @param {string} field @returns {number} */
function leverNum (firm, group, field) {
  const v = firm.levers && firm.levers[group] && firm.levers[group][field]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

/** @param {object} firm @returns {boolean} has this firm changed anything at all? */
function hasAnyEdit (firm) {
  return firm.entries.length > 0 ||
    leverNum(firm, 'distinctions', 'firmOwn') > 0 ||
    leverNum(firm, 'logicTables', 'edited') > 0 ||
    leverNum(firm, 'quizBanks', 'edited') > 0 ||
    leverNum(firm, 'domainSupport', 'edited') > 0
}

module.exports = {
  buildMentorLogicLabReport,
  groupPushedEdits,
  preferredTemplates,
  leverUsage,
  publishableFields,
  assertNoPersonalFields,
  readingFor,
  PLATFORM_GAP_FIRMS,
  WATCH_FIRMS
}

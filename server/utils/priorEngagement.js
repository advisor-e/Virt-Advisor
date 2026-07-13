'use strict'

/**
 * priorEngagement — distils a client's saved case history into the compact,
 * PII-safe summary the engine reads back at recommendation time (client
 * knowledge base, design 2026-07-14).
 *
 * Honesty rule: reviews are recorded at CASE level (wentWell / wentLess are
 * about the whole engagement), so this module never fabricates per-template
 * outcomes — each engagement carries its templates and its review side by
 * side, and downstream consumers must not attribute a review line to a single
 * template unless the advisor's own words do.
 *
 * PII rule: the summary carries NO internal identifiers — no case ids, no
 * client ids, no advisor ids. Titles, template names, dates and the advisor's
 * own review words only. The formatted text is prompt INPUT and must always be
 * wrapped in fenceUntrusted() by the caller before it reaches the AI.
 */

// The most recent engagements included in the prompt text — enough to show a
// trajectory without flooding the context; older sessions still count in
// `sessions` so the advisor's tenure with the client stays visible.
const MAX_ENGAGEMENTS = 5
// Per-field cap, matching sanitiseInput's review caps.
const MAX_REVIEW_FIELD = 500

/** Trim a review text field to the cap, or return '' for anything non-string. */
function cap (text) {
  return typeof text === 'string' ? text.slice(0, MAX_REVIEW_FIELD) : ''
}

/**
 * Reduce a client's case list (newest first, as caseStore.listForClient
 * returns it) to the summary shape the engine consumes.
 * @param {object[]} cases - rowToCase-shaped cases for ONE client
 * @returns {object|null} the summary, or null when there is no history
 */
function buildPriorEngagementSummary (cases) {
  if (!Array.isArray(cases) || cases.length === 0) { return null }

  const latest = cases[0]

  // Every template ever delivered to this client, deduped, order preserved
  // (newest engagement first). Stage 5's suppression reads this list.
  const seen = new Set()
  const templatesDelivered = []
  for (const c of cases) {
    for (const t of (Array.isArray(c.templates) ? c.templates : [])) {
      const name = typeof t === 'string' ? t : (t && t.title) || ''
      if (name && !seen.has(name)) {
        seen.add(name)
        templatesDelivered.push(name)
      }
    }
  }

  const engagements = cases.slice(0, MAX_ENGAGEMENTS).map((c) => {
    const hasReview = !!(c.review && (c.review.wentWell || c.review.wentLess || c.review.changesRecommended))
    return {
      title: typeof c.title === 'string' ? c.title.slice(0, 200) : '',
      when: c.createdAt || null,
      domain: c.domain || null,
      templates: (Array.isArray(c.templates) ? c.templates : [])
        .map(t => (typeof t === 'string' ? t : (t && t.title) || ''))
        .filter(Boolean),
      review: hasReview
        ? {
            wentWell: cap(c.review.wentWell),
            wentLess: cap(c.review.wentLess),
            changesRecommended: cap(c.review.changesRecommended)
          }
        : null
    }
  })

  return {
    sessions: cases.length,
    lastSessionAt: latest.createdAt || null,
    lastDomain: latest.domain || null,
    lastStaircaseStep: latest.staircaseStep || null,
    lastGrowthStage: latest.growthStage || null,
    templatesDelivered,
    engagements
  }
}

/** Humanise an ISO date for the prompt ("18 Jun 2026"); '' when absent/invalid. */
function fmtDate (iso) {
  if (!iso) { return '' }
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Render the summary as prompt text. The caller MUST wrap the result in
 * fenceUntrusted() — review text is the advisor's own free-text words about a
 * real client and is treated as hostile prompt input like all user content.
 * @param {object} summary - from buildPriorEngagementSummary (non-null)
 * @param {string} clientName - the register display name
 * @returns {string}
 */
function formatPriorEngagementText (summary, clientName) {
  const lines = []
  const last = fmtDate(summary.lastSessionAt)
  lines.push(`Client: ${clientName} — ${summary.sessions} prior session${summary.sessions !== 1 ? 's' : ''}${last ? `, most recent ${last}` : ''}.`)
  if (summary.templatesDelivered.length) {
    lines.push(`Templates already delivered: ${summary.templatesDelivered.join(', ')}.`)
  }
  for (const e of summary.engagements) {
    lines.push('')
    const when = fmtDate(e.when)
    lines.push(`— "${e.title}"${when ? ` (${when})` : ''}${e.domain ? ` · area: ${e.domain}` : ''}`)
    if (e.templates.length) { lines.push(`  Delivered: ${e.templates.join(', ')}`) }
    if (e.review) {
      if (e.review.wentWell) { lines.push(`  Went well: ${e.review.wentWell}`) }
      if (e.review.wentLess) { lines.push(`  Went less well: ${e.review.wentLess}`) }
      if (e.review.changesRecommended) { lines.push(`  Advisor would change: ${e.review.changesRecommended}`) }
    } else {
      lines.push('  (No post-delivery review recorded for this session.)')
    }
  }
  return lines.join('\n')
}

// History hold-back — the scoring penalty for a template this client has
// already received (Option A, product owner 2026-07-14: DISCOURAGED, never
// banned — a clearly-still-right tool can outscore the penalty). Same magnitude
// as the resolver's other hold-backs (wrong-industry model, out-of-domain model).
const HISTORY_HOLDBACK_PENALTY = 15

/**
 * Derive the resolver's scoring inputs from a client's history summary.
 * Reviews are CASE-level, so `wentLess` marks every template from that session —
 * no per-template attribution is invented (that precision arrives with the
 * per-template outcome capture, Stage 5b). `reviewPainText` is the advisor's
 * went-less/would-change words, for problem-signal extraction (rule 3).
 * @param {object|null} summary - from buildPriorEngagementSummary
 * @returns {{delivered: string[], wentLessTitles: string[], reviewPainText: string}|null}
 */
function deriveHistoryScoringInputs (summary) {
  if (!summary) { return null }
  const wentLess = new Set()
  const painParts = []
  for (const e of (summary.engagements || [])) {
    if (e.review && (e.review.wentLess || e.review.changesRecommended)) {
      for (const t of (e.templates || [])) { wentLess.add(t) }
      if (e.review.wentLess) { painParts.push(e.review.wentLess) }
      if (e.review.changesRecommended) { painParts.push(e.review.changesRecommended) }
    }
  }
  return {
    delivered: summary.templatesDelivered || [],
    wentLessTitles: Array.from(wentLess),
    reviewPainText: painParts.join(' ')
  }
}

module.exports = {
  buildPriorEngagementSummary,
  formatPriorEngagementText,
  deriveHistoryScoringInputs,
  MAX_ENGAGEMENTS,
  HISTORY_HOLDBACK_PENALTY
}

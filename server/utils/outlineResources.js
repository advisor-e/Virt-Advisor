'use strict'

/**
 * Resource grounding for AI-generated course outlines (CB-02,
 * design/COURSE-BUILDER-PLAN.md Phase 2).
 *
 * Business rule: the engine must never present invented firm IP. The course
 * design prompt forbids invented resource names, but only code can enforce
 * it — every resource in a generated outline is checked against the firm's
 * real template library. Matched names are snapped to the library's exact
 * spelling (they also drive session-time template matching); unmatched names
 * are dropped and reported so the caller can log them (no silent parking).
 * Strip-and-log, not reject: the advisor keeps a working outline, and a
 * session with no surviving resources still works (session matching falls
 * back to its title and focus).
 *
 * CB-25 (Mike's ruling 2026-07-16): each grounded resource also gets its real
 * Advisor-e page address (session.resourceLinks — name → URL), built from the
 * template's `link` + `section` fields via the TEMPLATE_PAGE seam in
 * config/integration.js. Server-owned: the URL pattern never lives in browser
 * code. A record with no `link` simply gets no URL — never a broken one.
 */

const { TEMPLATE_PAGE } = require('../../config/integration')

function normalise (name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Build the Advisor-e page address for one template record, or null when the
 * record carries no page-link id.
 * @param {{link?: string, section?: string}} template - a search_content record
 * @returns {string|null}
 */
function templatePageUrl (template) {
  const link = template && typeof template.link === 'string' && template.link.trim()
  if (!link) { return null }
  const type = encodeURIComponent(String(template.section || '').toLowerCase())
  return `${TEMPLATE_PAGE.dashboardBase}#${link.trim()}${type ? `?type=${type}` : ''}`
}

/**
 * Ground an outline's session resources in the real template library.
 *
 * @param {object} outline - a shape-validated course outline ({ sessions: [...] })
 * @param {Array<{title: string}>} templates - the firm's template set (getOrgTemplates)
 * @returns {{outline: object, dropped: Array<string>}} grounded copy + dropped names
 */
function groundOutlineResources (outline, templates) {
  const entryByKey = new Map()
  for (const t of (templates || [])) {
    if (t && typeof t.title === 'string' && t.title.trim()) {
      entryByKey.set(normalise(t.title), t)
    }
  }

  const dropped = []
  const sessions = (outline.sessions || []).map((s) => {
    if (!s || !Array.isArray(s.resources)) { return s }
    const resources = []
    const resourceLinks = {}
    for (const r of s.resources) {
      const entry = entryByKey.get(normalise(r))
      if (entry) {
        resources.push(entry.title)
        const url = templatePageUrl(entry)
        if (url) { resourceLinks[entry.title] = url }
      } else {
        dropped.push(String(r))
      }
    }
    const grounded = { ...s, resources }
    if (Object.keys(resourceLinks).length) { grounded.resourceLinks = resourceLinks }
    return grounded
  })

  return { outline: { ...outline, sessions }, dropped }
}

module.exports = { groundOutlineResources, templatePageUrl }

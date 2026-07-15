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
 */

function normalise (name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Ground an outline's session resources in the real template library.
 *
 * @param {object} outline - a shape-validated course outline ({ sessions: [...] })
 * @param {Array<{title: string}>} templates - the firm's template set (getOrgTemplates)
 * @returns {{outline: object, dropped: Array<string>}} grounded copy + dropped names
 */
function groundOutlineResources (outline, templates) {
  const titleByKey = new Map()
  for (const t of (templates || [])) {
    if (t && typeof t.title === 'string' && t.title.trim()) {
      titleByKey.set(normalise(t.title), t.title)
    }
  }

  const dropped = []
  const sessions = (outline.sessions || []).map((s) => {
    if (!s || !Array.isArray(s.resources)) { return s }
    const resources = []
    for (const r of s.resources) {
      const canonical = titleByKey.get(normalise(r))
      if (canonical) {
        resources.push(canonical)
      } else {
        dropped.push(String(r))
      }
    }
    return { ...s, resources }
  })

  return { outline: { ...outline, sessions }, dropped }
}

module.exports = { groundOutlineResources }

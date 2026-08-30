'use strict'

const { sendError } = require('../utils/sendError')
const caseStore = require('../utils/caseStore')
const overlay = require('../utils/firmOverlay')
const {
  loadPlatformDistinctions,
  loadPlatformDistinctionsWithSource,
  savePlatformDistinctions
} = require('../utils/platformDistinctions')
// Stage D delete-promotion lives in firmManager (it owns the firm-distinction stores
// + dev fallbacks); reused here so a mentor delete preserves customising firms' rows.
// One-way dependency (firmManager never requires mentor) — no cycle.
const { runTemplateCheck } = require('../utils/templateCheck')
const { buildTemplateCheckPatch } = require('../utils/templateCheckPatch')
const { buildMentorLogicLabReport } = require('../utils/mentorLogicLabReport')
const activityStore = require('../utils/activityStore')
const { listFirms } = require('../utils/firmsDirectory')
const { buildAdoptionView, mergeActivityRows } = require('../utils/mentorAdoption')
const { loadRulings, saveRulings, normaliseRuling } = require('../utils/templateCheckRulings')
const { isWithinScope, isAwaitingFirms } = require('../utils/tierChain')
const { withOrigin } = require('../utils/caseRollup')
const DOMAINS = require('../../data/domains.json')
const firmManager = require('./firmManager')

/**
 * Mentor routes — the cross-firm review surface. These deliberately cross the
 * firm boundary (every other case read is firm-scoped), so they are gated to the
 * mentor role at the mount (requireMentorRole) and only ever return cases a firm
 * manager explicitly approved for the mentor, in their anonymised form.
 */

// ── Advisory Distinctions — mentor authoring (the cascade ORIGIN) ──────────────
// The mentor authors the platform set the firm tier receives as its default and
// may then decline / override / extend (DISTINCTIONS-CASCADE-PLAN.md §6). Stored
// in the reserved global overlay scope via server/utils/platformDistinctions.js,
// so every reader (the advisor engine, the Firm Manager screen) sees the same set.
// At this tier there is no layer above, so rows are plain CRUD (no decline/override);
// changing a row's domain is just an edit. All gated firmAuth + requireMentorRole;
// the mentor set is global, so these handlers never read req.firmId.

// Built from data/domains.json (single source) so a new domain is automatically a
// valid distinction domain — no code change when a domain is added.
const DISTINCTION_DOMAINS = new Set(DOMAINS.map(d => d.id))

/**
 * Next stable platform id. Ids are `pd-N`; the next is max(N)+1 so an id is never
 * reused after a delete (a firm override may still reference a retired id — never
 * resurrect it onto a different row).
 * @param {Array} rows - the current platform set
 * @returns {string} e.g. 'pd-42'
 */
function _nextPlatformId (rows) {
  let max = 0
  for (const r of rows) {
    const m = /^pd-(\d+)$/.exec(String(r && r.id))
    if (m) { max = Math.max(max, parseInt(m[1], 10)) }
  }
  return `pd-${max + 1}`
}

/**
 * GET /api/mentor/distinctions — the mentor's full platform set.
 *
 * Returns `source` and `shadowed` alongside the rows (item 4.17). Mike opened this tab
 * and saw ONE distinction where the shipped set is 67: a stale local dev file was
 * shadowing the committed seed, and the screen said nothing. The rows themselves are
 * unchanged — the screen can now tell a reader what it is looking at.
 *
 * @route GET /api/mentor/distinctions
 * @returns {200} { success: true, distinctions: object[], source: string, shadowed: number }
 *   `source` is 'store' | 'seed' | 'dev-file'; `shadowed` is how many committed rows a
 *   dev file is hiding, and is 0 in every other case.
 */
async function listMentorDistinctions (req, res) {
  try {
    const { rows, source, shadowed } = await loadPlatformDistinctionsWithSource(overlay.loadFirmConfig)
    res.send(200, { success: true, distinctions: rows, source, shadowed })
  } catch (err) {
    console.error('[mentor] listMentorDistinctions failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load distinctions')
  }
}

/**
 * POST /api/mentor/distinctions — author a new platform distinction.
 * @route POST /api/mentor/distinctions
 * @param {object} req.body - { domain, description, triggers[], templates[], boost }
 * @returns {201} { success: true, id: string }
 */
async function createMentorDistinction (req, res) {
  const { domain, description, triggers, templates, boost } = req.body || {}

  if (!domain || !DISTINCTION_DOMAINS.has(domain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'domain must be a recognised advisory domain')
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return sendError(res, 400, 'INVALID_DESCRIPTION', 'description is required')
  }
  if (!Array.isArray(triggers) || triggers.length === 0) {
    return sendError(res, 400, 'INVALID_TRIGGERS', 'triggers must be a non-empty array of strings')
  }
  if (!Array.isArray(templates) || templates.length === 0) {
    return sendError(res, 400, 'INVALID_TEMPLATES', 'templates must be a non-empty array of strings')
  }

  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const id = _nextPlatformId(existing)
    const newRow = {
      id,
      domain,
      triggers: triggers.map(t => String(t).trim()).filter(Boolean),
      description: description.trim(),
      templates: templates.map(t => String(t).trim()).filter(Boolean),
      boost: Math.min(20, Math.max(1, Number(boost) || 5)),
      created_by: req.userEmail,
      created_at: new Date().toISOString()
    }
    await savePlatformDistinctions([...existing, newRow], overlay.saveFirmConfig, req.userEmail)
    res.send(201, { success: true, id })
  } catch (err) {
    console.error('[mentor] createMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save distinction')
  }
}

/**
 * PUT /api/mentor/distinctions/:id — edit a platform distinction. The id is pinned
 * (firms' overrides reference it); changing the domain is allowed (a mentor-tier
 * move). Partial edits are accepted — only provided fields change.
 * @route PUT /api/mentor/distinctions/:id
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {200} { success: true }
 */
async function updateMentorDistinction (req, res) {
  const id = String(req.params.id || '')
  const { domain, description, triggers, templates, boost } = req.body || {}

  if (domain !== undefined && !DISTINCTION_DOMAINS.has(domain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'domain must be a recognised advisory domain')
  }
  if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
    return sendError(res, 400, 'INVALID_DESCRIPTION', 'description must be a non-empty string')
  }
  if (triggers !== undefined && (!Array.isArray(triggers) || triggers.length === 0)) {
    return sendError(res, 400, 'INVALID_TRIGGERS', 'triggers must be a non-empty array of strings')
  }
  if (templates !== undefined && (!Array.isArray(templates) || templates.length === 0)) {
    return sendError(res, 400, 'INVALID_TEMPLATES', 'templates must be a non-empty array of strings')
  }

  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const idx = existing.findIndex(r => r.id === id)
    if (idx === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No distinction with that id')
    }
    const updated = { ...existing[idx], id } // id stays pinned, never taken from body
    if (domain !== undefined) { updated.domain = domain }
    if (description !== undefined) { updated.description = description.trim() }
    if (triggers !== undefined) { updated.triggers = triggers.map(t => String(t).trim()).filter(Boolean) }
    if (templates !== undefined) { updated.templates = templates.map(t => String(t).trim()).filter(Boolean) }
    if (boost !== undefined) { updated.boost = Math.min(20, Math.max(1, Number(boost) || 5)) }
    updated.updated_by = req.userEmail
    updated.updated_at = new Date().toISOString()

    const newList = [...existing]
    newList[idx] = updated
    await savePlatformDistinctions(newList, overlay.saveFirmConfig, req.userEmail)
    res.send(200, { success: true })
  } catch (err) {
    console.error('[mentor] updateMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save distinction')
  }
}

/**
 * DELETE /api/mentor/distinctions/:id — remove a platform distinction.
 * Stage D ("keep theirs", DISTINCTIONS-CASCADE-PLAN.md §6): before removing the
 * master row, any firm that CUSTOMISED it keeps its version as a standalone firm-own
 * row (promoteOverridesForDeletedRow), so a firm never loses its work because the
 * mentor deleted the original. Promotion runs FIRST — if it throws, the master row is
 * NOT removed (fail-safe; the firm edits are never stranded). Firms that only declined
 * the row need no action (the decline becomes inert); untouched firms lose the default.
 * @route DELETE /api/mentor/distinctions/:id
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {200} { success: true, kept: string[] }  kept = firm ids whose version was preserved
 * @returns {500} DB_ERROR (nothing was done) · {500} PARTIAL_DELETE (some firms were
 *   already promoted before the failure — named in the message and the server log, and
 *   the master row is still present, so a repeat is safe)
 */
async function deleteMentorDistinction (req, res) {
  const id = String(req.params.id || '')
  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const row = existing.find(r => r.id === id)
    if (!row) {
      return sendError(res, 404, 'NOT_FOUND', 'No distinction with that id')
    }
    // Keep-theirs promotion BEFORE the master is removed (it still holds the full row).
    const { promoted } = await firmManager.promoteOverridesForDeletedRow(row, req.userEmail)
    await savePlatformDistinctions(existing.filter(r => r.id !== id), overlay.saveFirmConfig, req.userEmail)
    res.send(200, { success: true, kept: promoted })
  } catch (err) {
    // A failure part-way through is NOT "nothing happened". By the time promotion
    // throws, some firms may already hold their kept copy and have had their override
    // dropped — and the old blanket message said the opposite, which is a statement
    // about the system that is not true. The master row is still there (it is removed
    // last, deliberately), so repeating the delete is safe and converges.
    const done = Array.isArray(err.promoted) ? err.promoted : []
    if (done.length > 0) {
      console.error(
        '[mentor] deleteMentorDistinction failed PART-WAY — the original was NOT removed; firms already holding their own copy:',
        done.join(', '), '—', err.message
      )
      sendError(res, 500, 'PARTIAL_DELETE',
        `The delete stopped part-way. ${done.length} firm(s) have already kept their own copy, and the original was NOT removed. Try again — repeating this is safe.`)
      return
    }
    console.error('[mentor] deleteMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete distinction')
  }
}

// firmNameMap and the origin-path mapping MOVED to server/utils/caseRollup.js on
// 2026-08-12, when Team Case Studies became the second report to show a case above
// the firm (ADVISOR-E-DESIGN-LOGIC.md §4.1, "every report rolls up"). §4.3 names this
// shape as the one a later cross-firm report should reuse rather than reinvent — so
// it is imported, not copied. A conflict here is resolved by keeping the import.

/**
 * GET /api/mentor/cases — the cases shared upward, anonymised and advisor-stripped,
 * most-recently-shared first. The mentor reads every firm's; a global or country
 * manager reads only their own channel's.
 *
 * The scope comes from req.firmId, which firmAuth has already resolved from the
 * verified token — never from a query parameter. A caller cannot ask for another
 * group's feed, because they cannot say which feed they want.
 *
 * 🔴 EVERY CASE CARRIES ITS ORIGIN (ruled 2026-08-11). Until then the feed named no
 * source at all: it carried `firmId` in the payload and no screen displayed it, so a
 * manager read a stack of anonymous cards and could act on none of them. That is the
 * opposite of what this app is for — ADVISOR-E-DESIGN-LOGIC.md §2, "who is failing
 * so we can offer help". `origin` is the path from the level immediately below the
 * caller down to the firm, so the screen can group by rule 7's level and still show
 * the address inside it. The client stays anonymised and the ADVISER STAYS STRIPPED;
 * naming a firm to the manager above it is not a disclosure — they are their firms.
 *
 * @route GET /api/mentor/cases
 * @returns {200} { success: true, cases: object[], awaitingFirms: boolean } — each
 *   case gains `origin: [{ scopeId, tier, label }]`, nearest level below the caller
 *   first. awaitingFirms distinguishes "no firm is mapped to this tier yet" from "no
 *   case has been shared yet". The two produce an identical empty list and mean
 *   opposite things, so the screen is told which it is rather than left to guess.
 * @returns {500} DB_ERROR
 */
async function listMentorCases (req, res) {
  try {
    const cases = await caseStore.listSharedWithMentor(req.firmId)
    const decorated = await withOrigin(cases, req.firmId)

    res.send(200, { success: true, cases: decorated, awaitingFirms: isAwaitingFirms(req.firmId) })
  } catch (err) {
    console.error('[mentor] listMentorCases failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load shared case studies')
  }
}

// ── Template Check — every tool a logic table names, checked against the catalogue ──
// Design: design/mockups/logic-table-template-check.html (approved by Mike 2026-08-05).
// The scan is pure and stateless; the mentor's rulings live in the same reserved
// global overlay scope as the platform distinctions, so they gain version history
// and cannot collide with a firm's rows.

/**
 * The Template Check report: the three counts and every unresolved name.
 *
 * @route GET /api/mentor/template-check
 * @returns {object} { success, counts, findings } — findings carry the mentor's
 *   own rulings already applied, so the screen never has to merge two sources.
 */
async function getTemplateCheck (req, res) {
  try {
    const rulings = await loadRulings(overlay.loadFirmConfig)
    const report = runTemplateCheck({ rulings })
    res.send(200, { success: true, counts: report.counts, findings: report.findings })
  } catch (err) {
    console.error('[mentor] getTemplateCheck failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not run the template check')
  }
}

/**
 * Record one ruling — "this name means that template", "not a tool", or "missing,
 * flag it". Read-modify-write against the stored map.
 *
 * @route PUT /api/mentor/template-check/rulings/:key
 * @param {object} req.body - { verdict: 'ruled'|'dismissed'|'flagged', title, note }
 * @returns {object} { success, ruling }
 */
async function saveTemplateCheckRuling (req, res) {
  const key = req.params && req.params.key
  if (!key) { return sendError(res, 400, 'BAD_REQUEST', 'A finding key is required') }

  const parsed = normaliseRuling(req.body, req.userEmail || '', new Date().toISOString())
  if (!parsed.ok) { return sendError(res, 400, 'BAD_REQUEST', parsed.message) }

  try {
    const map = await loadRulings(overlay.loadFirmConfig)
    map[key] = parsed.value
    await saveRulings(map, overlay.saveFirmConfig, req.userEmail || '')
    res.send(200, { success: true, ruling: parsed.value })
  } catch (err) {
    console.error('[mentor] saveTemplateCheckRuling failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the ruling')
  }
}

/**
 * The patch the mentor's applied rulings add up to — what "Apply it" leads to.
 *
 * ⚠ IT RETURNS THE EDITS. IT DOES NOT MAKE THEM. Ruled by Mike 2026-08-09; the
 * three reasons are in server/utils/templateCheckPatch.js, and the shortest of
 * them is that this exact fix has been made by hand twice before as a reviewed
 * commit, which is the practice this fits into rather than replaces.
 *
 * Every requested edit comes back CLASSIFIED — ready, ambiguous, stale, or
 * pointing at a template the catalogue no longer carries. Nothing is dropped for
 * being awkward: a patch that silently omitted the hard rows would read as a
 * finished job.
 *
 * @route GET /api/mentor/template-check/patch
 * @returns {200} { success: true, patch } — { counts, edits }
 * @returns {500} DB_ERROR (standard error envelope)
 */
async function getTemplateCheckPatch (req, res) {
  try {
    const rulings = await loadRulings(overlay.loadFirmConfig)
    const patch = buildTemplateCheckPatch({ rulings })
    res.send(200, { success: true, patch })
  } catch (err) {
    console.error('[mentor] getTemplateCheckPatch failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not work out the changes')
  }
}

/**
 * Undo a ruling — the mockup's "Change my mind" and "Put it back". Removing a key
 * that is not there succeeds: the end state the caller asked for is the end state
 * they get, and a 404 here would only ever be a race with themselves.
 *
 * @route DELETE /api/mentor/template-check/rulings/:key
 * @returns {object} { success }
 */
async function deleteTemplateCheckRuling (req, res) {
  const key = req.params && req.params.key
  if (!key) { return sendError(res, 400, 'BAD_REQUEST', 'A finding key is required') }

  try {
    const map = await loadRulings(overlay.loadFirmConfig)
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      delete map[key]
      await saveRulings(map, overlay.saveFirmConfig, req.userEmail || '')
    }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[mentor] deleteTemplateCheckRuling failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not undo the ruling')
  }
}

// ── Logic Lab Report — what every firm pushed back, read together ─────────────
// Artefact: design/mockups/mentor-logic-lab-report-mockup.html (approved by Mike
// 2026-08-04). Shape: design/MENTOR-AI-HUB-STUB.md.

/**
 * The config keys behind each editable function, so "which levers do firms
 * actually touch" is answered by asking the store rather than by a hardcoded
 * guess. A lever with no firms stays in the answer — the artefact's point about
 * this table is the negative reading.
 */
const LEVER_KEYS = {
  distinctions: 'advisory-distinctions',
  logicTableTriggers: 'logic-tree-sections',
  logicLab: 'logic-lab-accepted',
  quizBanks: 'quiz-banks',
  domainSupport: 'domain-support-sections'
}

/**
 * The Logic Lab Report — the one page that reads across every firm.
 *
 * CROSS-FIRM BY DESIGN, and defensible only because it carries configuration and
 * counts: the sentence a manager typed into their own Logic-Lab, the engine's
 * reading, the template expected, the change made. The rollup re-checks that at
 * the boundary and throws rather than publishing anything personal.
 *
 * @route GET /api/mentor/logic-lab-report
 * @returns {object} { success, report } — the four sections of the artefact.
 */
async function getLogicLabReport (req, res) {
  try {
    // Which firms hold anything at all, per lever.
    const firmsByLever = {}
    for (const lever of Object.keys(LEVER_KEYS)) {
      firmsByLever[lever] = await safeFirmIds(LEVER_KEYS[lever])
    }

    // Beneath THIS caller only. The mentor's scope matches every firm, so its
    // report is unchanged; a middle tier sees its own channel and nothing else
    // (owner's ruling 2026-08-11). The filter is applied to the firm list rather
    // than to each lever, so a firm cannot survive in one lever's count while
    // being absent from the rows.
    const allFirmIds = [...new Set(Object.values(firmsByLever).flat())]
      .filter(firmId => isWithinScope(firmId, req.firmId))
      .sort()

    const firms = []
    for (const firmId of allFirmIds) {
      const entries = await safeConfig(firmId, LEVER_KEYS.logicLab, [])
      const distinctions = await safeConfig(firmId, LEVER_KEYS.distinctions, [])
      const tables = await safeConfig(firmId, LEVER_KEYS.logicTableTriggers, {})
      firms.push({
        firmId,
        // The id IS the name the mentor sees on this page. Named rather than faked
        // — the artefact's rows show firm names, and inventing display names would
        // be the one thing on this page that is not real.
        //
        // ⚠ CORRECTED 2026-08-09: this used to say "no firm-name table is reachable
        // from here yet", and that is no longer true — server/utils/firmsDirectory.js
        // now reads it for the adoption page. This page has NOT been moved onto it,
        // which is a deliberate limit of that change rather than an oversight, and
        // is recorded as such so the comment does not quietly become a lie.
        firmName: firmId,
        entries: Array.isArray(entries) ? entries : [],
        levers: {
          distinctions: { firmOwn: Array.isArray(distinctions) ? distinctions.length : 0 },
          logicTables: { edited: tables && typeof tables === 'object' ? Object.keys(tables).length : 0 },
          quizBanks: { edited: firmsByLever.quizBanks.includes(firmId) ? 1 : 0 },
          domainSupport: { edited: firmsByLever.domainSupport.includes(firmId) ? 1 : 0 }
        },
        lastActivity: latestStamp(entries)
      })
    }

    const report = buildMentorLogicLabReport({ firms, rolledUpAt: new Date().toISOString() })
    // Set after the builder rather than passed into it: the builder asserts that no
    // personal field reaches the payload and knows nothing about tiers. Keeping the
    // flag outside its shape leaves that assertion reading exactly what it did.
    report.awaitingFirms = isAwaitingFirms(req.firmId)
    res.send(200, { success: true, report })
  } catch (err) {
    console.error('[mentor] getLogicLabReport failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not build the Logic Lab Report')
  }
}

/**
 * Firm ids holding a config key, or an empty list when there is no database.
 *
 * An empty answer is the truthful one in an environment with no MySQL: no firm
 * has pushed anything HERE. The screen says so in words rather than showing an
 * encouraging zero — see templateCheck's error handling for the same principle.
 *
 * @param {string} configKey
 * @returns {Promise<Array<string>>}
 */
async function safeFirmIds (configKey) {
  try {
    const ids = await overlay.listFirmIdsWithConfigKey(configKey)
    return Array.isArray(ids) ? ids : []
  } catch (_e) {
    return []
  }
}

/**
 * @param {string} firmId
 * @param {string} configKey
 * @param {*} fallback
 * @returns {Promise<*>}
 */
async function safeConfig (firmId, configKey, fallback) {
  try {
    const value = await overlay.loadFirmConfig(firmId, configKey)
    return value === null || value === undefined ? fallback : value
  } catch (_e) {
    return fallback
  }
}

/**
 * @param {Array<object>} entries - accepted ideas.
 * @returns {string|null} the newest `at` stamp, or null when there are none.
 */
function latestStamp (entries) {
  if (!Array.isArray(entries) || entries.length === 0) { return null }
  return entries.map(e => String(e.at || '')).sort().pop() || null
}

/**
 * How firms are using the app — the mentor's adoption view.
 *
 * CROSS-FIRM BY DESIGN, and defensible only because it carries COUNTS: how many
 * advisers, how many sessions, how recently. It replaces Team Progress at mentor
 * level rather than widening it — that tab lists a firm's advisers BY NAME, and
 * widening it would have put every firm's people in front of Advisor-e.
 * buildAdoptionView re-checks that at the boundary and throws rather than
 * publishing anything personal.
 *
 * TWO READS, AND THEY FAIL DIFFERENTLY ON PURPOSE. The activity is the page; the
 * firms directory only adds the firms that have never started. So a directory
 * that cannot be read degrades the page to "who is using it" rather than failing
 * it — the information the mentor had before this page existed. Activity that
 * cannot be read is the page failing, and says so.
 *
 * @route GET /api/mentor/adoption
 * @returns {200} { success: true, report } — totals plus one row per firm.
 * @returns {500} DB_ERROR (standard error envelope)
 */
/**
 * Keep only the activity belonging to firms beneath one managing tier.
 *
 * Applied to all THREE row-sets, and the count of them is the reason this is a
 * function rather than three filters inline: the adviser counts, the session rows
 * and the course rows are merged downstream into one row per firm, so a filter
 * missed on any one of them would leak that firm back in through the merge with
 * only part of its numbers — a wrong row rather than an absent one, which is the
 * harder kind to notice.
 *
 * The mentor's scope matches every firm (see tierChain.isWithinScope), so this is
 * an identity transform for the mentor and its page is unchanged.
 *
 * @param {{vaRows: object[], courseRows: object[], adviserRows: object[]}} rows
 * @param {string} scopeId - the caller's resolved scope
 * @returns {{vaRows: object[], courseRows: object[], adviserRows: object[]}}
 */
function scopeAdoptionRows (rows, scopeId) {
  const src = rows && typeof rows === 'object' ? rows : {}
  const mine = list => (Array.isArray(list) ? list : []).filter(r => r && isWithinScope(r.firm_id, scopeId))
  return {
    vaRows: mine(src.vaRows),
    courseRows: mine(src.courseRows),
    adviserRows: mine(src.adviserRows)
  }
}

async function getAdoption (req, res) {
  try {
    const rows = scopeAdoptionRows(await activityStore.readAdoptionByFirm(), req.firmId)

    let firms = []
    try {
      firms = (await listFirms()).filter(f => isWithinScope(f.id, req.firmId))
    } catch (err) {
      // Deliberately swallowed, and deliberately loud in the log. See above: the
      // firms list is an enrichment, not the page. Silence here would be wrong —
      // the mentor would see a shorter list with nothing to say it was short.
      console.error('[mentor] adoption: firms directory unreadable, showing active firms only:', err.message)
    }

    const report = buildAdoptionView({
      firms,
      activity: mergeActivityRows(rows),
      now: new Date().toISOString()
    })

    // Honest limit, carried in the payload rather than left to the screen to
    // remember: without the directory the page cannot show a firm that never
    // started, and the difference is invisible on screen otherwise.
    report.directoryRead = firms.length > 0

    // The SECOND honest limit this page carries, and it is a different one. Above:
    // "the firms directory could not be read, so never-started firms are missing".
    // Here: "no firm has been mapped to this tier at all, so there is nothing to
    // read yet". Both produce a shorter page; only one of them is our own
    // unfinished wiring, and the screen says which.
    report.awaitingFirms = isAwaitingFirms(req.firmId)

    res.send(200, { success: true, report })
  } catch (err) {
    console.error('[mentor] getAdoption failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load firm adoption')
  }
}

module.exports = {
  listMentorCases,
  getAdoption,
  listMentorDistinctions,
  createMentorDistinction,
  updateMentorDistinction,
  deleteMentorDistinction,
  getTemplateCheck,
  getTemplateCheckPatch,
  saveTemplateCheckRuling,
  deleteTemplateCheckRuling,
  getLogicLabReport
}

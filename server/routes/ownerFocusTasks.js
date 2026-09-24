'use strict'

/**
 * @file Routes for the Owner Focus Tasks starting list (item 5.3).
 * @module server/routes/ownerFocusTasks
 *
 * The READ is open to any signed-in user — every advisor opening Business Owner Expectations
 * starts a new owner on it, and a client of the firm opening the same screen needs it too.
 * The WRITES are the four managing tiers only: the advisor edits an owner's own copy on the
 * model, and that never travels back up. The tier a write lands on is `req.firmId`, from the
 * verified token — so one hub tab serves the mentor, both middle tiers and a firm manager.
 */

const ownerFocusTasks = require('../utils/ownerFocusTasks')
const { tierOfScope } = require('../utils/tierChain')
const { loadFirmConfig, saveFirmConfig, getVersionHistory, restoreVersion } = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')

/** The resolved list, whose it is, and whether the caller's own level holds it. */
async function describe (scope) {
  const resolved = await ownerFocusTasks.resolveTasks(scope, loadFirmConfig)
  return {
    tasks: resolved.tasks,
    source: resolved.source,
    // Which tier the CALLER is, which `source` cannot say while the shipped default is in
    // force — the Session Processes lesson of 2026-09-21.
    tier: scope ? tierOfScope(scope) : null,
    inherited: resolved.inherited,
    ownedHere: !resolved.inherited && !resolved.source.shipped
  }
}

/**
 * GET /api/owner-focus-tasks
 *
 * @route GET /api/owner-focus-tasks
 * @param {object} req - firmOrEntityAuth-verified; takes no parameters
 * @returns {200} { success, tasks, source, tier, inherited, ownedHere, timestamp }
 */
async function get (req, res) {
  try {
    const body = await describe(req.firmId || null)
    res.send(200, Object.assign({ success: true }, body, { timestamp: new Date().toISOString() }))
  } catch (err) {
    // A starting-list read must never stop an advisor filling in an owner.
    console.error('[owner-focus-tasks] read failed:', err.message)
    res.send(200, {
      success: true,
      tasks: ownerFocusTasks.baseTasks(),
      source: { scopeId: null, tier: 'mentor', shipped: true },
      tier: null,
      inherited: true,
      ownedHere: false,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * PUT /api/owner-focus-tasks — write THIS tier's own starting list. Manager role only.
 *
 * @route PUT /api/owner-focus-tasks
 * @param {object} req - body `{ tasks: string[] }`, validated before anything is stored
 * @returns {200} { success, tasks, source, tier, inherited, ownedHere, timestamp }
 */
async function put (req, res) {
  try {
    const scope = req.firmId || null
    if (!scope) { sendError(res, 400, 'BAD_INPUT', 'No scope on this token'); return }
    const checked = ownerFocusTasks.validateTasks(req.body)
    if (!checked.ok) { sendError(res, 400, 'BAD_INPUT', checked.error); return }
    await ownerFocusTasks.saveOwnTasks(scope, checked.tasks, req.advisorId || 'unknown', saveFirmConfig)
    const body = await describe(scope)
    res.send(200, Object.assign({ success: true }, body, { timestamp: new Date().toISOString() }))
  } catch (err) {
    console.error('[owner-focus-tasks] save failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the task list')
  }
}

/**
 * DELETE /api/owner-focus-tasks — stop holding one of your own and inherit the level above.
 * Without it, writing a list once is a one-way door. Nothing is destroyed: the versions stay.
 *
 * @route DELETE /api/owner-focus-tasks
 * @returns {200} { success, tasks, source, tier, inherited, ownedHere, timestamp }
 */
async function del (req, res) {
  try {
    const scope = req.firmId || null
    if (!scope) { sendError(res, 400, 'BAD_INPUT', 'No scope on this token'); return }
    await ownerFocusTasks.clearOwnTasks(scope, saveFirmConfig, req.advisorId)
    const body = await describe(scope)
    res.send(200, Object.assign({ success: true }, body, { timestamp: new Date().toISOString() }))
  } catch (err) {
    console.error('[owner-focus-tasks] clear failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not return to the inherited list')
  }
}

/**
 * GET /api/owner-focus-tasks/versions — this scope's saved versions, newest first.
 *
 * @route GET /api/owner-focus-tasks/versions
 * @returns {200} { success, versions, timestamp }
 */
async function versions (req, res) {
  try {
    const scope = req.firmId || null
    if (!scope) { sendError(res, 400, 'BAD_INPUT', 'No scope on this token'); return }
    const list = await getVersionHistory(scope, ownerFocusTasks.CONFIG_KEY)
    res.send(200, { success: true, versions: list, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[owner-focus-tasks] history failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the task list history')
  }
}

/**
 * POST /api/owner-focus-tasks/versions/:id/restore
 *
 * 🔴 THE SCOPE IS THE TOKEN'S, NOT THE URL'S: `restoreVersion` requires the row to belong to
 * this scope AND this config key, so a guessed id restores nothing across a boundary.
 *
 * @route POST /api/owner-focus-tasks/versions/:id/restore
 * @returns {200} { success, tasks, source, tier, inherited, ownedHere, timestamp }
 */
async function restore (req, res) {
  try {
    const scope = req.firmId || null
    if (!scope) { sendError(res, 400, 'BAD_INPUT', 'No scope on this token'); return }
    await restoreVersion(scope, ownerFocusTasks.CONFIG_KEY, req.params && req.params.id)
    const body = await describe(scope)
    res.send(200, Object.assign({ success: true }, body, { timestamp: new Date().toISOString() }))
  } catch (err) {
    console.error('[owner-focus-tasks] restore failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { get, put, del, versions, restore }

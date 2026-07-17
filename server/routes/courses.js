'use strict'

const { sendError } = require('../utils/sendError')
const courseStore = require('../utils/courseStore')
const { validateCourseOutline } = require('../utils/validateAIResponse')

/**
 * /api/courses — the Course Builder course document (CB-16/17 Stage B,
 * design/COURSE-BUILDER-PLAN.md). All routes derive identity from the verified
 * JWT (firmAuth attaches req.advisorId / req.firmId); ids in the body/params
 * are NEVER trusted for ownership — the same rule that closed the cases IDOR.
 *
 * Every course-document route is OWNER-scoped: an advisor reads and writes
 * only their own courses. The ONE deliberate exception is the CB-07 sharing
 * pair (listShared / copyShared — Mike's personal-copy ruling 2026-07-16):
 * both are bounded by the caller's verified firm AND visibility='firm', the
 * shared list is outline-only (never the author's progress or design
 * conversation), and "using" a shared course creates a fresh course OWNED by
 * the caller — the author's document is never written by a teammate.
 *
 * The outline is re-validated at the door with validateCourseOutline (the
 * 100%-covered shape gate): the engine validates + grounds outlines before
 * they ever reach the screen, but a stored document must never depend on the
 * client having behaved.
 */

/**
 * GET /api/courses — the caller's own courses, most recently touched first.
 * @route GET /api/courses
 * @returns {200} { success: true, courses: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listCourses (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const courses = await courseStore.listForAdvisor(advisorId)
    res.send(200, { success: true, courses })
  } catch (err) {
    console.error('[courses] listCourses failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your courses')
  }
}

/**
 * GET /api/courses/shared — courses OTHER advisors in the caller's firm have
 * shared firm-wide (CB-07), outline-only summaries, most recent first.
 * @route GET /api/courses/shared
 * @returns {200} { success: true, courses: object[] } - toSharedSummary shapes
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listShared (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const courses = await courseStore.listSharedForFirm(firmId, advisorId)
    res.send(200, { success: true, courses })
  } catch (err) {
    console.error('[courses] listShared failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your team\'s shared courses')
  }
}

/**
 * POST /api/courses/shared/:id/copy — make the caller's own copy of a
 * firm-shared course (CB-07 personal-copy model): same outline, fresh
 * progress, private, owned by the caller, `copiedFrom` audit stamp from the
 * STORED source. The author's document is untouched; their design
 * conversation is never copied.
 * @route POST /api/courses/shared/:id/copy
 * @returns {200} { success: true, course }
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function copyShared (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const source = await courseStore.getShared(req.params.id, firmId)
    if (!source) { return sendError(res, 404, 'NOT_FOUND', 'Shared course not found') }
    const sessions = (source.outline && Array.isArray(source.outline.sessions)) ? source.outline.sessions : []
    const course = await courseStore.create({
      advisorId,
      firmId,
      status: 'active',
      visibility: 'private',
      outline: source.outline,
      progress: sessions.map(() => ({ status: 'pending', quizScore: null, completedAt: null, notes: null })),
      designHistory: null,
      copiedFrom: source.id
    })
    res.send(200, { success: true, course })
  } catch (err) {
    console.error('[courses] copyShared failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not copy the shared course')
  }
}

/**
 * POST /api/courses — save a new course. The id may be supplied (the
 * localStorage migration preserves existing ids); a duplicate id is refused so
 * a migration re-run can never create copies.
 * @route POST /api/courses
 * @param {object} req.body - { id?, status?, visibility?, outline, progress?, designHistory? }
 * @returns {200} { success: true, course }
 * @returns {400} INVALID_OUTLINE · {403} NO_ADVISOR_IDENTITY
 * @returns {409} DUPLICATE_ID · {500} DB_ERROR
 */
async function createCourse (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const body = req.body || {}
  const outlineCheck = validateCourseOutline(body.outline)
  if (!outlineCheck.valid) {
    return sendError(res, 400, 'INVALID_OUTLINE', 'The course outline is missing required content')
  }
  try {
    const course = await courseStore.create({
      id: typeof body.id === 'string' ? body.id : undefined,
      advisorId,
      firmId,
      status: body.status,
      visibility: body.visibility,
      outline: outlineCheck.data,
      progress: body.progress,
      designHistory: body.designHistory
    })
    res.send(200, { success: true, course })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || /duplicate/i.test(err.message || '')) {
      return sendError(res, 409, 'DUPLICATE_ID', 'A course with this id already exists')
    }
    console.error('[courses] createCourse failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the course')
  }
}

/**
 * PUT /api/courses/:id — update a course the caller owns. Whole-document per
 * field: any of status / visibility / outline / progress present in the body
 * replaces the stored value. A course id belonging to another advisor 404s
 * exactly as if it did not exist.
 * @route PUT /api/courses/:id
 * @param {object} req.body - { status?, visibility?, outline?, progress? }
 * @returns {200} { success: true, course }
 * @returns {400} NO_FIELDS | INVALID_OUTLINE · {403} NO_ADVISOR_IDENTITY
 * @returns {404} NOT_FOUND · {500} DB_ERROR
 */
async function updateCourse (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const body = req.body || {}
  const patch = {}
  if ('status' in body) { patch.status = body.status }
  if ('visibility' in body) { patch.visibility = body.visibility }
  if ('progress' in body) { patch.progress = body.progress }
  if ('outline' in body) {
    const outlineCheck = validateCourseOutline(body.outline)
    if (!outlineCheck.valid) {
      return sendError(res, 400, 'INVALID_OUTLINE', 'The course outline is missing required content')
    }
    patch.outline = outlineCheck.data
  }
  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, 'NO_FIELDS', 'Nothing to update')
  }
  try {
    const ok = await courseStore.updateOwn(req.params.id, advisorId, patch)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Course not found') }
    const course = await courseStore.getOwn(req.params.id, advisorId)
    res.send(200, { success: true, course })
  } catch (err) {
    console.error('[courses] updateCourse failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not update the course')
  }
}

/**
 * DELETE /api/courses/:id — delete a course the caller owns.
 * @route DELETE /api/courses/:id
 * @returns {200} { success: true }
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function deleteCourse (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const ok = await courseStore.remove(req.params.id, advisorId)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Course not found') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[courses] deleteCourse failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the course')
  }
}

module.exports = { listCourses, listShared, copyShared, createCourse, updateCourse, deleteCourse }

'use strict'

const { sendError } = require('../utils/sendError')
const store = require('../utils/salesBlogStore')
const engine = require('../utils/salesBlogEngine')
const { moderationReport } = require('../utils/moderationReport')

/**
 * /api/sales/blog — the advisor's blog tool (item 17 stage 5).
 *
 * Thirteen routes in three groups: the saved briefs (`inputs`), the generated
 * posts (`posts`), the advisor's source material (`references`), plus the two
 * generate calls.
 *
 * All routes derive identity from the verified JWT (firmAuth attaches
 * req.advisorId / req.firmId); ids in the body are NEVER trusted for ownership.
 * The reasoning is `salesPipeline.js`'s and is not repeated here.
 *
 * 🔴 NO MANAGER ROLE. These are the advisor's OWN posts, and the firm manager
 * has no more business reading a half-written draft than the advisor has reading
 * theirs. That is the opposite of stage 4's Team roll-up, where a manager
 * deliberately sees every advisor's deals — the difference is that a deal is
 * firm revenue and a draft is somebody's unfinished writing.
 */

/** A generated post needs these before it can be stored. */
const POST_REQUIRED = ['title', 'topic', 'audience', 'objective', 'tone', 'length', 'cta', 'outlineText']

/** Generating a draft needs the brief; generating a final needs an outline too. */
const DRAFT_REQUIRED = ['topic', 'audience', 'objective', 'tone', 'length', 'cta']
const FINAL_REQUIRED = ['outlineText', 'topic', 'audience', 'objective', 'tone', 'cta', 'polishLevel']

/** Fields a caller may set on a post update. Anything else is ignored. */
const POST_PATCHABLE = ['isPinned', 'title', 'outlineText', 'finalText']

/** Both ids come from the verified token. No route reads either from the request. */
function identityOf (req) {
  return { advisorId: req.advisorId, firmId: req.firmId }
}

/**
 * Guard every handler shares: no identity, no work.
 * @param {object} req
 * @param {object} res
 * @returns {{advisorId: string, firmId: string}|null} null when already answered
 */
function requireIdentity (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return null
  }
  return { advisorId, firmId }
}

/**
 * Every named field is present and is text.
 * @param {object} src
 * @param {string[]} fields
 * @returns {{code: string, message: string}|null}
 */
function missingFrom (src, fields) {
  for (const f of fields) {
    const v = src[f]
    if (typeof v !== 'string' || !v.trim()) {
      return { code: 'MISSING_FIELD', message: 'Some required details are missing' }
    }
  }
  return null
}

/**
 * The principles array, checked for shape.
 *
 * ⚠ THIS REACHES A PROMPT, so its shape is checked rather than assumed: a
 * `details` that is a string instead of an array would otherwise be spread into
 * characters and send one prompt line per letter.
 *
 * @param {*} value
 * @returns {{value?: object[], error?: {code: string, message: string}}}
 */
function validatePrinciples (value) {
  if (value === undefined || value === null) { return { value: [] } }
  if (!Array.isArray(value)) {
    return { error: { code: 'INVALID_PRINCIPLES', message: 'Principles must be a list' } }
  }
  if (value.length > 20) {
    return { error: { code: 'INVALID_PRINCIPLES', message: 'That is too many principles' } }
  }
  const out = []
  for (const p of value) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      return { error: { code: 'INVALID_PRINCIPLES', message: 'Each principle must have a title and details' } }
    }
    if (p.title !== undefined && typeof p.title !== 'string') {
      return { error: { code: 'INVALID_PRINCIPLES', message: 'A principle title must be text' } }
    }
    if (p.details !== undefined && !Array.isArray(p.details)) {
      return { error: { code: 'INVALID_PRINCIPLES', message: 'Principle details must be a list' } }
    }
    const details = (p.details || []).slice(0, 20)
    if (details.some(d => typeof d !== 'string')) {
      return { error: { code: 'INVALID_PRINCIPLES', message: 'Each principle detail must be text' } }
    }
    out.push({ title: String(p.title || ''), details })
  }
  return { value: out }
}

/** Every value in `fields` that is present must be a string. */
function textFieldsValid (src, fields) {
  return fields.every(f => src[f] === undefined || src[f] === null || typeof src[f] === 'string')
}

// ── INPUTS ───────────────────────────────────────────────────────────────────

/**
 * GET /api/sales/blog/inputs — the briefs this advisor has saved.
 * @route GET /api/sales/blog/inputs
 * @returns {200} { success: true, items: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listInputs (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  try {
    const items = await store.listInputs(id.advisorId, id.firmId)
    res.send(200, { success: true, items })
  } catch (err) {
    console.error('[salesBlog] listInputs failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your saved briefs')
  }
}

/**
 * POST /api/sales/blog/inputs — save a brief, replacing the caller's previous
 * one with the same signature.
 * @route POST /api/sales/blog/inputs
 * @param {string} req.body.signature - the de-duplication key; required
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_FIELD · INVALID_PRINCIPLES · INVALID_TEXT
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function saveInput (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const src = req.body && typeof req.body === 'object' ? req.body : {}

  const missing = missingFrom(src, ['signature', 'topic', 'audience', 'objective', 'tone', 'length', 'cta'])
  if (missing) { return sendError(res, 400, missing.code, missing.message) }

  const optional = ['wordCount', 'selectedPerson', 'targetMode', 'styleStrength']
  if (!textFieldsValid(src, optional)) {
    return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
  }

  const principles = validatePrinciples(src.principles)
  if (principles.error) {
    return sendError(res, 400, principles.error.code, principles.error.message)
  }

  try {
    const item = await store.saveInput({
      advisorId: id.advisorId,
      firmId: id.firmId,
      signature: src.signature,
      topic: src.topic,
      audience: src.audience,
      objective: src.objective,
      tone: src.tone,
      length: src.length,
      cta: src.cta,
      principles: principles.value,
      selectedPerson: src.selectedPerson,
      targetMode: src.targetMode,
      styleStrength: src.styleStrength,
      styleTitles: Array.isArray(src.styleTitles) ? src.styleTitles.slice(0, 50) : null,
      lengthRanges: src.lengthRanges === undefined ? null : src.lengthRanges,
      styleThresholds: src.styleThresholds === undefined ? null : src.styleThresholds
    })
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesBlog] saveInput failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the brief')
  }
}

/**
 * DELETE /api/sales/blog/inputs/:id — delete a brief the caller owns.
 * @route DELETE /api/sales/blog/inputs/:id
 * @returns {200} { success: true } · {400} MISSING_ID
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function removeInput (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const target = String((req.params && req.params.id) || '').trim()
  if (!target) { return sendError(res, 400, 'MISSING_ID', 'No brief was named') }
  try {
    const done = await store.removeInput(target, id.advisorId, id.firmId)
    if (!done) { return sendError(res, 404, 'NOT_FOUND', 'That brief is not one of yours') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[salesBlog] removeInput failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the brief')
  }
}

// ── POSTS ────────────────────────────────────────────────────────────────────

/**
 * GET /api/sales/blog/posts — the caller's posts of one kind.
 * @route GET /api/sales/blog/posts
 * @param {string} [req.query.kind] - 'draft' (default) or 'final'
 * @param {string} [req.query.search] - matches title, topic or named person
 * @param {string} [req.query.pinnedOnly] - 'true' returns only pinned posts
 * @returns {200} { success: true, items: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listPosts (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const q = req.query || {}
  try {
    const items = await store.listPosts(id.advisorId, id.firmId, {
      kind: String(q.kind || 'draft').toLowerCase(),
      search: String(q.search || '').slice(0, 200),
      pinnedOnly: String(q.pinnedOnly || 'false').toLowerCase() === 'true'
    })
    res.send(200, { success: true, items })
  } catch (err) {
    console.error('[salesBlog] listPosts failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your posts')
  }
}

/**
 * POST /api/sales/blog/posts — store a generated post.
 * @route POST /api/sales/blog/posts
 * @param {string} req.body.kind - 'draft' or 'final'; anything else stores as draft
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_FIELD · INVALID_TEXT
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function createPost (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const src = req.body && typeof req.body === 'object' ? req.body : {}

  const missing = missingFrom(src, POST_REQUIRED)
  if (missing) { return sendError(res, 400, missing.code, missing.message) }
  if (!textFieldsValid(src, ['finalText', 'selectedPerson', 'targetMode'])) {
    return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
  }

  try {
    const item = await store.createPost({
      advisorId: id.advisorId,
      firmId: id.firmId,
      kind: src.kind,
      title: src.title,
      topic: src.topic,
      audience: src.audience,
      objective: src.objective,
      tone: src.tone,
      length: src.length,
      cta: src.cta,
      selectedPerson: src.selectedPerson,
      targetMode: src.targetMode,
      outlineText: src.outlineText,
      finalText: src.finalText,
      isPinned: src.isPinned === true,
      metadata: src.metadata === undefined ? null : src.metadata
    })
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesBlog] createPost failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the post')
  }
}

/**
 * PUT /api/sales/blog/posts/:id — pin, retitle or rewrite a post the caller
 * owns. A post that is not the caller's answers 404, the same as one that does
 * not exist.
 * @route PUT /api/sales/blog/posts/:id
 * @returns {200} { success: true, item } · {400} MISSING_ID · INVALID_TEXT
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function updatePost (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const target = String((req.params && req.params.id) || '').trim()
  if (!target) { return sendError(res, 400, 'MISSING_ID', 'No post was named') }

  const src = req.body && typeof req.body === 'object' ? req.body : {}
  const patch = {}
  for (const key of POST_PATCHABLE) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) { continue }
    const v = src[key]
    if (key === 'isPinned') {
      if (typeof v !== 'boolean') {
        return sendError(res, 400, 'INVALID_TEXT', 'Pinned must be true or false')
      }
      patch.isPinned = v
      continue
    }
    if (v === null) { patch[key] = null; continue }
    if (typeof v !== 'string') {
      return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
    }
    if (key === 'title' && !v.trim()) {
      return sendError(res, 400, 'MISSING_FIELD', 'A post needs a title')
    }
    patch[key] = v
  }

  try {
    const item = await store.updatePost(target, id.advisorId, id.firmId, patch)
    if (!item) { return sendError(res, 404, 'NOT_FOUND', 'That post is not one of yours') }
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesBlog] updatePost failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the change')
  }
}

/**
 * DELETE /api/sales/blog/posts/:id — delete a post the caller owns.
 * @route DELETE /api/sales/blog/posts/:id
 * @returns {200} { success: true } · {400} MISSING_ID
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function removePost (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const target = String((req.params && req.params.id) || '').trim()
  if (!target) { return sendError(res, 400, 'MISSING_ID', 'No post was named') }
  try {
    const done = await store.removePost(target, id.advisorId, id.firmId)
    if (!done) { return sendError(res, 404, 'NOT_FOUND', 'That post is not one of yours') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[salesBlog] removePost failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the post')
  }
}

// ── REFERENCES ───────────────────────────────────────────────────────────────

/**
 * GET /api/sales/blog/references — the caller's source material.
 * @route GET /api/sales/blog/references
 * @param {string} [req.query.topic] - exact topic match
 * @returns {200} { success: true, items: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listReferences (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const topic = String((req.query && req.query.topic) || '').slice(0, 255)
  try {
    const items = await store.listReferences(id.advisorId, id.firmId, topic)
    res.send(200, { success: true, items })
  } catch (err) {
    console.error('[salesBlog] listReferences failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your reference material')
  }
}

/**
 * POST /api/sales/blog/references — store source material to write from.
 * @route POST /api/sales/blog/references
 * @param {string} req.body.title - required
 * @param {string} req.body.type - 'document' or 'url'
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_FIELD · INVALID_TYPE · INVALID_TEXT
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function createReference (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const src = req.body && typeof req.body === 'object' ? req.body : {}

  const missing = missingFrom(src, ['title'])
  if (missing) { return sendError(res, 400, missing.code, missing.message) }
  if (!store.REFERENCE_TYPES.includes(src.type)) {
    return sendError(res, 400, 'INVALID_TYPE', 'A reference must be a document or a URL')
  }
  if (!textFieldsValid(src, ['content', 'url', 'topic'])) {
    return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
  }

  try {
    const item = await store.createReference({
      advisorId: id.advisorId,
      firmId: id.firmId,
      title: src.title,
      type: src.type,
      content: src.content,
      url: src.url,
      topic: src.topic
    })
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesBlog] createReference failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the reference')
  }
}

/**
 * DELETE /api/sales/blog/references/:id — delete a reference the caller owns.
 * @route DELETE /api/sales/blog/references/:id
 * @returns {200} { success: true } · {400} MISSING_ID
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function removeReference (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const target = String((req.params && req.params.id) || '').trim()
  if (!target) { return sendError(res, 400, 'MISSING_ID', 'No reference was named') }
  try {
    const done = await store.removeReference(target, id.advisorId, id.firmId)
    if (!done) { return sendError(res, 404, 'NOT_FOUND', 'That reference is not one of yours') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[salesBlog] removeReference failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the reference')
  }
}

// ── GENERATE ─────────────────────────────────────────────────────────────────

/**
 * The engine's result as the browser may see it.
 *
 * 🔴 THE REASON FOR A FALLBACK IS LOGGED, NEVER SENT. The engine reports why it fell back to
 * the template in `error`, and that text can be OpenAI's own reply — up to 500 characters of
 * it, account and billing details included. Until 2026-09-24 it went to the browser in full,
 * unseen on screen but readable by anyone; CLAUDE.md's error rule allows the browser only a
 * safe message. `source: 'template'` is what the screen reads, and it still arrives.
 *
 * A moderation block (item 8.2) still sends the outline, and adds the report that names which
 * sentence stopped the AI — built from what the advisor typed, never from the engine's error.
 *
 * @param {string} label - which route, for the log line
 * @param {{text: string, source: string, error?: string, blocked?: Error}} result - from the engine
 * @param {object} src - the request body, whose text fields are what the advisor typed
 * @returns {{success: true, text: string, source: string, moderation?: object}}
 */
function forBrowser (label, result, src) {
  const out = Object.assign({}, result)
  const blocked = out.blocked
  delete out.blocked
  if (out.error) {
    console.error('[salesBlog] ' + label + ' fell back to the template:', out.error)
    delete out.error
  }
  if (blocked) {
    out.moderation = moderationReport(blocked, { typed: stringsIn(src) })
  }
  return Object.assign({ success: true }, out)
}

/**
 * Every string in a request body, however nested — the brief's points arrive as a list of
 * `{ title, details[] }`, and each is something the advisor typed.
 * @param {*} v
 * @param {string[]} [out]
 * @returns {string[]}
 */
function stringsIn (v, out) {
  const acc = out || []
  if (typeof v === 'string') { acc.push(v) } else if (v && typeof v === 'object') {
    Object.keys(v).forEach(k => stringsIn(v[k], acc))
  }
  return acc
}

/**
 * POST /api/sales/blog/generate/draft — a brief becomes a markdown outline.
 *
 * ⚠ ALWAYS 200 ON A MODEL FAILURE. The engine falls back to a template built
 * from the advisor's own brief, and the reply says `source: 'template'`; the
 * reason is logged on the server (see `forBrowser`). A 500 here would throw away
 * a usable outline the advisor can still edit. A 400 is still a 400 — a brief
 * that is missing its topic cannot produce anything at all.
 *
 * @route POST /api/sales/blog/generate/draft
 * @returns {200} { success: true, text, source: 'ai'|'template' }
 * @returns {400} MISSING_FIELD · INVALID_PRINCIPLES
 * @returns {403} NO_ADVISOR_IDENTITY · {500} AI_ERROR
 */
async function generateDraft (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const src = req.body && typeof req.body === 'object' ? req.body : {}

  const missing = missingFrom(src, DRAFT_REQUIRED)
  if (missing) { return sendError(res, 400, missing.code, missing.message) }
  if (!textFieldsValid(src, ['wordCount', 'author', 'references'])) {
    return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
  }

  const principles = validatePrinciples(src.principles)
  if (principles.error) {
    return sendError(res, 400, principles.error.code, principles.error.message)
  }

  try {
    const result = await engine.generateDraft({
      topic: src.topic,
      audience: src.audience,
      objective: src.objective,
      tone: src.tone,
      length: src.length,
      wordCount: src.wordCount,
      cta: src.cta,
      author: src.author,
      principles: principles.value,
      references: src.references
    })
    res.send(200, forBrowser('generateDraft', result, src))
  } catch (err) {
    // The engine catches its own failures; reaching here means something else
    // broke, so it is reported rather than disguised as a template result.
    console.error('[salesBlog] generateDraft failed:', err.message)
    sendError(res, 500, 'AI_ERROR', 'Could not generate the outline')
  }
}

/**
 * POST /api/sales/blog/generate/final — an outline becomes a finished article.
 * Same fallback behaviour as the draft route above.
 *
 * @route POST /api/sales/blog/generate/final
 * @returns {200} { success: true, text, source: 'ai'|'template' }
 * @returns {400} MISSING_FIELD · INVALID_TEXT
 * @returns {403} NO_ADVISOR_IDENTITY · {500} AI_ERROR
 */
async function generateFinal (req, res) {
  const id = requireIdentity(req, res)
  if (!id) { return }
  const src = req.body && typeof req.body === 'object' ? req.body : {}

  const missing = missingFrom(src, FINAL_REQUIRED)
  if (missing) { return sendError(res, 400, missing.code, missing.message) }
  if (!textFieldsValid(src, ['wordCount', 'aiInstructions'])) {
    return sendError(res, 400, 'INVALID_TEXT', 'That field must be text')
  }

  try {
    const result = await engine.generateFinal({
      outlineText: src.outlineText,
      topic: src.topic,
      audience: src.audience,
      objective: src.objective,
      tone: src.tone,
      cta: src.cta,
      polishLevel: src.polishLevel,
      wordCount: src.wordCount,
      aiInstructions: src.aiInstructions
    })
    res.send(200, forBrowser('generateFinal', result, src))
  } catch (err) {
    console.error('[salesBlog] generateFinal failed:', err.message)
    sendError(res, 500, 'AI_ERROR', 'Could not generate the article')
  }
}

module.exports = {
  listInputs,
  saveInput,
  removeInput,
  listPosts,
  createPost,
  updatePost,
  removePost,
  listReferences,
  createReference,
  removeReference,
  generateDraft,
  generateFinal,
  validatePrinciples,
  POST_REQUIRED,
  DRAFT_REQUIRED,
  FINAL_REQUIRED
}

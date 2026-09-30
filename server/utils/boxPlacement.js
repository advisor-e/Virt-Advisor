'use strict'

/**
 * @file Which capture box each passage of a recorded concept segment belongs to — by the clock,
 *   never by a model. Item 8.4, screen 4.
 * @module server/utils/boxPlacement
 *
 * 🔴 DECISION 11 (Mike, 2026-09-16): *"the open field claims the words spoken while it is open,
 * from the session's navigation timeline. The AI tidies wording and NEVER decides placement."*
 * This module is that rule and nothing else. It is pure, so a test can prove every edge of it.
 *
 * Drawing `design/mockups/strategy-session-recording.html` screen 4, approved for build by Mike
 * 2026-09-28; its two decisions ruled 2026-10-01 (D: the words show during the session; F: a
 * kept passage goes below what is typed).
 *
 * HOW A ROW IS PLACED. Each transcript row's time is counted from its segment's start, with the
 * paused minutes already added back (Decision L). Its MIDPOINT, on the wall clock, is compared
 * with the timeline: the box last opened at or before that moment claims it, provided the box
 * belongs to THIS segment's concept and had not been closed. Anything else — before the first
 * box of the card was opened, or while a box of another card was still the last one opened —
 * goes to the tray, and is never guessed into a box (the drawing's caption under screen 4).
 *
 * ⚠ THE HONEST LIMITS. The words sort themselves only if the advisor moves through the boxes as
 * the conversation moves — the cost the drawing records against Decision 11. And `startedAt` is
 * stamped by the server when the segment opens, a moment before the browser's first audio
 * arrives, so every time here may run early by that gap; nothing has measured it.
 *
 * Node 14, CommonJS.
 */

/** A passage longer than this is split, so a suggestion stays a sentence or two for one box. */
const MAX_PASSAGE_CHARS = 1500

/**
 * A stored time as milliseconds. The timeline stores UTC with no zone
 * (`YYYY-MM-DD HH:MM:SS.mmm`, see `strategySessionStore.storedUtc`); an ISO string with its zone
 * is read as it stands.
 *
 * @param {string} value
 * @returns {number} NaN when unusable
 */
function toMs (value) {
  if (typeof value !== 'string' || !value.trim()) { return NaN }
  const text = value.trim()
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text)
  return Date.parse(zoned ? text : text.replace(' ', 'T') + 'Z')
}

/**
 * The box open at one moment, or null.
 *
 * @param {Array<{frameworkId: string, fieldKey: string, openedMs: number, closedMs: number}>} windows
 *   oldest first
 * @param {number} at
 * @returns {object|null}
 */
function openAt (windows, at) {
  let found = null
  for (let i = 0; i < windows.length; i += 1) {
    if (windows[i].openedMs > at) { break }
    found = windows[i]
  }
  if (!found || (isFinite(found.closedMs) && found.closedMs <= at)) { return null }
  return found
}

/** One line of speech, made safe to show and to fence: whitespace collapsed. */
function clean (text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

/**
 * Place one segment's transcript into its concept's boxes.
 *
 * @param {object} input
 * @param {Array<{start: number, end: number, text: string, role: string}>} input.rows - the
 *   segment's transcript rows, seconds from the segment's start, pauses restored
 * @param {string} input.startedAt - ISO time the segment opened
 * @param {string} input.conceptId - the segment's concept; only its boxes can claim words
 * @param {Array<{frameworkId: string, fieldKey: string, openedAt: string, closedAt: (string|null)}>}
 *   input.timeline - the session's navigation timeline, oldest first
 * @returns {Array<{id: string, box: ({frameworkId: string, fieldKey: string}|null),
 *   startAt: string, endAt: string, heard: Array<{role: string, text: string}>}>} in spoken order
 * @throws {Error} when the segment's start time is unusable — placing by a broken clock would
 *   put every passage in the wrong box and look entirely reasonable doing it
 */
function placePassages (input) {
  const startMs = toMs(input && input.startedAt)
  if (!isFinite(startMs)) { throw new TypeError('boxPlacement: the segment has no usable start time') }
  const conceptId = String((input && input.conceptId) || '')

  const windows = ((input && input.timeline) || [])
    .map(t => ({
      frameworkId: String(t.frameworkId || ''),
      fieldKey: String(t.fieldKey || ''),
      openedMs: toMs(t.openedAt),
      closedMs: t.closedAt ? toMs(t.closedAt) : Infinity
    }))
    .filter(w => isFinite(w.openedMs))
    // Stable from Node 11, so two boxes opened in the same millisecond keep the timeline's order.
    .sort((a, b) => a.openedMs - b.openedMs)

  const passages = []
  let current = null
  ;((input && input.rows) || []).forEach((row) => {
    const text = clean(row && row.text)
    const start = Number(row && row.start)
    const end = Number(row && row.end)
    if (!text || !isFinite(start)) { return }
    const startAt = startMs + start * 1000
    const endAt = startMs + (isFinite(end) && end >= start ? end : start) * 1000
    const open = openAt(windows, (startAt + endAt) / 2)
    const box = open && open.frameworkId === conceptId && conceptId
      ? { frameworkId: open.frameworkId, fieldKey: open.fieldKey }
      : null
    const key = box ? box.fieldKey : null
    const role = ['advisor', 'client'].includes(row.role) ? row.role : 'unknown'

    const sameBox = current && current.key === key
    const size = current ? current.heard.reduce((n, h) => n + h.text.length, 0) : 0
    if (!sameBox || size + text.length > MAX_PASSAGE_CHARS) {
      current = { key, box, startMs: startAt, endMs: endAt, heard: [] }
      passages.push(current)
    }
    current.endMs = Math.max(current.endMs, endAt)
    current.heard.push({ role, text: text.slice(0, MAX_PASSAGE_CHARS) })
  })

  return passages.map((p, i) => ({
    id: 'p' + (i + 1),
    box: p.box,
    startAt: new Date(p.startMs).toISOString(),
    endAt: new Date(p.endMs).toISOString(),
    heard: p.heard
  }))
}

module.exports = { placePassages, toMs, MAX_PASSAGE_CHARS }

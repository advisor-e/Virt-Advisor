'use strict'

/**
 * @file The "✓ written with Wordsmith" stamp on an Alignment Statements box (item 15.14,
 *   screen 4 of design/mockups/wordsmith-screens.html). Shared by the route that writes it and
 *   the planner that shows it.
 * @module utils/wordsmithMarker
 *
 * The stamp is a session entry beside the box — `wordsmith:<box key>` — holding when the client
 * agreed and the words they agreed to. Only the Wordsmith route writes it: the planner's box save
 * refuses the key, because it belongs to no capture table (see `hasCaptureField`).
 *
 * 🔴 IT SHOWS ONLY WHILE THE BOX HOLDS THOSE WORDS (Mike, build detail 2, 2026-09-29). An edit
 * removes the stamp, as an edit clears a concept summary's approval: changed words must never
 * still read as agreed.
 */

const MARKER_PREFIX = 'wordsmith:'

/** @param {string} fieldKey @returns {string} */
function markerKeyFor (fieldKey) {
  return MARKER_PREFIX + fieldKey
}

/**
 * @param {{approvedAt: string, text: string}} m
 * @returns {string} what the entry stores
 */
function buildMarker (m) {
  return JSON.stringify({ approvedAt: m.approvedAt, text: m.text })
}

/**
 * @param {*} value - a stored entry's value
 * @returns {{approvedAt: string, text: string}|null} null on anything malformed
 */
function parseMarker (value) {
  if (typeof value !== 'string') { return null }
  try {
    const m = JSON.parse(value)
    if (!m || typeof m.approvedAt !== 'string' || typeof m.text !== 'string' || !isFinite(Date.parse(m.approvedAt))) { return null }
    return { approvedAt: m.approvedAt, text: m.text }
  } catch (_e) {
    return null
  }
}

/**
 * @param {{text: string}|null} marker
 * @param {*} boxValue - what the box holds now
 * @returns {boolean} whether the stamp still holds
 */
function stampHolds (marker, boxValue) {
  return Boolean(marker) && typeof boxValue === 'string' && boxValue.trim() === marker.text.trim()
}

module.exports = {
  MARKER_PREFIX,
  markerKeyFor,
  buildMarker,
  parseMarker,
  stampHolds
}

'use strict'

/**
 * @file Row-building for the Firm Manager's Quizzes tab.
 * @module utils/quizRows
 *
 * The sibling of utils/staircaseRows.js, for quiz questions. Kept out of the
 * component for the same reason: these are the rules that decide what a firm is
 * shown and what a save actually sends, and rules belong somewhere they can be
 * tested directly rather than through a mounted screen.
 *
 * THE FIELD NAMES ARE THE CONTRACT. A question carries `qid` (its permanent
 * identity), `id` (a POSITION the backend reassigns every time the list changes)
 * and `source` — 'platform', 'firm-override' or 'firm-own', written by the
 * resolver. Nothing here may key on `id`: two different questions hold `id: 3` in
 * the same bank across two loads if one above them is switched off.
 */

/** The three editable fields, in the order the form shows them. */
const QUESTION_FIELDS = ['question', 'answer', 'keyPoint']

/** Resolver source tag → the word the screen uses for it. */
const KIND_BY_SOURCE = {
  platform: 'platform',
  'firm-override': 'customised',
  'firm-own': 'firm-own'
}

/**
 * The two lists the panel draws for one page: the questions an advisor is asked,
 * and the ones this firm switched off.
 *
 * A switched-off question is drawn from the PLATFORM bank, because it is absent
 * from the resolved list by definition — that is what being switched off means.
 * Its wording is shown as Advisor-e's, even where the firm had edited it: the edit
 * is still stored and comes back with the question, but showing a firm's private
 * wording under a question it has switched off would suggest the edit was doing
 * something. It is not.
 *
 * @param {Array<Object>} resolvedEntries - the bank as the course engine reads it
 * @param {Array<Object>} platformEntries - Advisor-e's own questions for this page
 * @param {string[]} declinedIds - qids this firm switched off
 * @param {string[]} [overriddenQids] - qids this firm holds an edit for. Only used for
 *   the switched-off list: a live row already declares an edit through its `customised`
 *   kind, but a switched-off row is built from the platform bank and would otherwise give
 *   a firm no way to tell that its version is still being held — nor any way back to
 *   Advisor-e's without switching the question on first.
 * @returns {{live: Array<Object>, switchedOff: Array<Object>}} each row carrying
 *   `kind` — 'platform' | 'customised' | 'firm-own'; switched-off rows additionally
 *   carry `hasFirmEdit`
 */
function buildQuizRows (resolvedEntries, platformEntries, declinedIds, overriddenQids) {
  const declined = new Set(Array.isArray(declinedIds) ? declinedIds : [])
  const overridden = new Set(Array.isArray(overriddenQids) ? overriddenQids : [])

  const live = (Array.isArray(resolvedEntries) ? resolvedEntries : [])
    .filter(Boolean)
    .map(e => ({ ...e, kind: KIND_BY_SOURCE[e.source] || 'platform' }))

  const switchedOff = (Array.isArray(platformEntries) ? platformEntries : [])
    .filter(e => e && e.qid && declined.has(e.qid))
    .map(e => ({ ...e, kind: 'platform', hasFirmEdit: overridden.has(e.qid) }))

  return { live, switchedOff }
}

/**
 * Work out what a form submission should actually send.
 *
 * THE WHOLE POINT IS WHAT IS *NOT* SENT. An edit to one of Advisor-e's questions
 * carries only the fields the firm genuinely changed, so the untouched ones keep
 * tracking Advisor-e's wording instead of being frozen at today's text. Sending
 * all three every time would recreate the exact defect the mechanism exists to
 * close — silently, because the screen would look identical.
 *
 * @param {Object} form - { question, answer, keyPoint } as typed
 * @param {Object|null} platformEntry - Advisor-e's version, or null for a question
 *   the firm owns (and for a brand-new one)
 * @param {boolean} isCustomised - true when the firm already holds an edit of this
 *   question, which is what makes "changed nothing back" mean "reset"
 * @returns {{action: string, body: Object}} action is 'save', 'reset' or 'none'
 */
function buildQuestionEdit (form, platformEntry, isCustomised) {
  const typed = {}
  for (const field of QUESTION_FIELDS) {
    typed[field] = String((form && form[field]) || '').trim()
  }

  // A question the firm owns: there is nothing to track, so every field is sent.
  if (!platformEntry) { return { action: 'save', body: typed } }

  const body = {}
  for (const field of QUESTION_FIELDS) {
    if (typed[field] !== String(platformEntry[field] || '').trim()) {
      body[field] = typed[field]
    }
  }

  if (Object.keys(body).length > 0) { return { action: 'save', body } }

  // Every field now matches Advisor-e's again. Dropping the override is the only
  // thing that restores the tracking the firm is asking for — leaving a stored
  // copy that happens to be identical would shield the question from Advisor-e's
  // next improvement to it.
  return { action: isCustomised ? 'reset' : 'none', body: {} }
}

/**
 * True when switching this question off would leave the page with no questions of
 * its own — which does NOT mean the page loses its quiz. The engine drops an empty
 * bank and falls through to AI-generated questions, so the firm is choosing
 * AI-written questions rather than none, and must be told that before it clicks.
 *
 * @param {Array<Object>} liveRows - the questions currently asked on this page
 * @param {string} qid - the question about to be switched off
 * @returns {boolean}
 */
function isLastLiveQuestion (liveRows, qid) {
  const rows = (Array.isArray(liveRows) ? liveRows : []).filter(Boolean)
  return rows.length === 1 && rows[0].qid === qid
}

module.exports = { QUESTION_FIELDS, buildQuizRows, buildQuestionEdit, isLastLiveQuestion }

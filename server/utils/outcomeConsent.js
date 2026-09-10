'use strict'

/**
 * outcomeConsent — a firm's consent to share anonymised template outcomes, and the two
 * one-way tokens that keep the pool anonymous.
 *
 * Outcome Learning, item 4.87 (specs/002-outcome-learning, data-model §1). Consent is the
 * firm's own undertaking, stored on the firm's own row under CONFIG_KEY through the overlay
 * store, so version history and restore come for free. Nothing here touches the database:
 * the routes read and write; this module says what a valid record is and derives the tokens.
 *
 * 🔴 THE TOKENS ARE HMACs UNDER A SECRET HELD OUTSIDE THE DATABASE. A pool row is keyed
 * `outcome-pool:<firmToken>:<caseHash>`. Anyone who can read the pool must not be able to
 * turn a token back into a firm id, and a plain hash would let anyone who can list firm ids
 * do exactly that. The secret is `OUTCOME_POOL_SECRET`, backend-only, approved by Mike
 * 2026-09-10 on plan.md. Without it nothing is pooled: the caller catches the throw, logs
 * it, and the case review itself still saves (quickstart).
 */

const crypto = require('crypto')

const CONFIG_KEY = 'outcome-consent'

/** The longest a stored email or wording may be; the same cap compliance.js uses. */
const MAX_TEXT = 120
const MAX_WORDING = 600
const MAX_WITHDRAWALS = 50

/**
 * 🔴 MIKE'S OWN WORDS, RULED 2026-09-10 ON design/mockups/outcome-learning-consent.html,
 * VERBATIM AND PINNED. No session rewords this. It is stored with every consent record as
 * the words that manager saw, so a later change to the sentence never rewrites what was agreed.
 */
const CONSENT_WORDING = 'I act for and on behalf of my firm when I choose to share our ' +
  'anonymised template outcomes with Advisor-e to improve recommendations for every ' +
  'participating firm. I understand what leaves our firm and what never does, as set out ' +
  'above, and that I can stop sharing at any time.'

/**
 * A stored consent record, cleaned, or null when the value is not one.
 *
 * Follows the `readX(value) → cleaned | null` pattern of compliance.js: a malformed record
 * is treated as no record. `on` must be a real boolean, `setBy` a non-empty string and
 * `setAt` a parseable date; anything else is null rather than a guess.
 *
 * @param {*} value - whatever the store returned
 * @returns {{on:boolean,setBy:string,setAt:string,wording:string,withdrawals:Array}|null}
 */
function readConsent (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { return null }
  if (typeof value.on !== 'boolean') { return null }

  const setBy = typeof value.setBy === 'string' ? value.setBy.trim() : ''
  if (!setBy) { return null }

  const setAt = typeof value.setAt === 'string' ? value.setAt.trim() : ''
  if (!setAt || Number.isNaN(Date.parse(setAt))) { return null }

  const wording = typeof value.wording === 'string' ? value.wording.slice(0, MAX_WORDING) : ''

  const withdrawals = Array.isArray(value.withdrawals)
    ? value.withdrawals
      .filter(w => w && typeof w === 'object' && !Array.isArray(w))
      .map(w => ({
        requestedBy: typeof w.requestedBy === 'string' ? w.requestedBy.trim().slice(0, MAX_TEXT) : '',
        requestedAt: typeof w.requestedAt === 'string' ? w.requestedAt.trim() : '',
        removed: Number.isInteger(w.removed) && w.removed >= 0 ? w.removed : 0
      }))
      .filter(w => w.requestedBy && w.requestedAt && !Number.isNaN(Date.parse(w.requestedAt)))
      .slice(-MAX_WITHDRAWALS)
    : []

  return {
    on: value.on,
    setBy: setBy.slice(0, MAX_TEXT),
    setAt,
    wording,
    withdrawals
  }
}

/**
 * Whether a firm's reviews enter the pool right now. ONE condition, by design: a valid
 * record with `on === true`. A withdrawal does not flip this; it deletes rows and leaves
 * the switch where the manager put it (data-model §1 transitions).
 *
 * @param {*} stored - the raw stored value, or null
 * @returns {boolean}
 */
function contributionOpen (stored) {
  const consent = readConsent(stored)
  return consent !== null && consent.on === true
}

/**
 * @returns {string} the secret, or throws OUTCOME_POOL_SECRET_MISSING so the caller logs and
 * pools nothing rather than keying rows under an empty secret.
 */
function _secret () {
  const secret = process.env.OUTCOME_POOL_SECRET
  if (typeof secret !== 'string' || secret.length === 0) {
    const err = new Error('OUTCOME_POOL_SECRET is not set; nothing can be pooled')
    err.code = 'OUTCOME_POOL_SECRET_MISSING'
    throw err
  }
  return secret
}

function _hmac (value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('outcomeConsent: cannot derive a token from an empty id')
  }
  return crypto.createHmac('sha256', _secret()).update(value).digest('hex')
}

/**
 * The firm's token in the pool: 24 hex characters, stable for a firm under one secret.
 * @param {string} firmId
 * @returns {string}
 */
function firmToken (firmId) {
  return _hmac(firmId).slice(0, 24)
}

/**
 * A case's hash in the pool: 16 hex characters, so a re-review rewrites the same key.
 * @param {string} caseId
 * @returns {string}
 */
function caseHash (caseId) {
  return _hmac(caseId).slice(0, 16)
}

module.exports = {
  CONFIG_KEY,
  CONSENT_WORDING,
  readConsent,
  contributionOpen,
  firmToken,
  caseHash
}

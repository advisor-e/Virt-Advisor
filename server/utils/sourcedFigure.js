'use strict'

/**
 * @file What every figure read out of a tax authority's document has in common.
 * @module server/utils/sourcedFigure
 *
 * Item 4.81, slice 1. Two sibling features now read published documents and store
 * manager-approved figures out of them — Depreciation Rates (item 4.78) and Tax Rates
 * (item 4.81). They are deliberately separate on screen, because a tab called *Tax Rules*
 * that delivered a depreciation schedule is the confusion Mike renamed 4.78 to remove
 * (2026-09-09). Underneath they answer the same four questions in exactly the same way:
 * which country, is it a rate or a share, which document said so, and can it be ranked
 * against a later document.
 *
 * ⚠ THESE FUNCTIONS ARE EXTRACTED FROM `depreciationRates.js`, WHICH IS THE ORIGINAL and is
 * deliberately NOT changed in the same commit that adds this file. That module is shipped,
 * approved and covered by a large test suite; folding it onto these copies is a
 * behaviour-preserving change its own tests can prove, and it is worth its own commit where
 * that proof is the only thing being claimed. Until then this file is used by
 * `taxRates.js` alone, and the duplication is temporary and named rather than silent.
 *
 * 🔴 RATES ARE DECIMALS, 0..1 — 30% is 0.3, never 30. That is the forecast engine's own
 * convention: `threeWayForecastModel` multiplies by these numbers directly. A `30` accepted
 * here would tax a company at 3000% and the forecast would still balance, which is the exact
 * failure both items were filed against. It is REFUSED, never clamped — `30` is not a bad
 * 30%, it is a number typed in the wrong unit, and reading it charitably is how a wrong
 * figure reaches a lender.
 */

/** Longest a label, a document name or an approver may be, in characters. */
const MAX_LABEL = 120

/** The oldest publication year worth believing, and the newest. */
const MIN_YEAR = 1980
const MAX_YEAR = 2100

/**
 * A country code, normalised — two letters, upper case (`NZ`, `AU`), or null.
 *
 * ISO 3166-1 alpha-2, which is what the rest of the app already speaks: advisor records
 * carry `country: 'DE'` (`server/collaborate/data/repository.js`) and a group manager's scope
 * id is composed from the same value (`tierChain.groupScopeId`). A full country NAME is
 * refused rather than guessed at — "New Zealand", "NZL" and "nz" are three spellings of one
 * country, and a store holding all three has three tables where a firm approved one.
 *
 * @param {*} value
 * @returns {string|null} the code, or null when it is not one
 */
function normaliseCountry (value) {
  if (typeof value !== 'string') { return null }
  const code = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

/**
 * A finite number, or null for anything that is not one — including `''` from a blank input.
 *
 * @param {*} v
 * @returns {number|null}
 */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * A publication date as a sortable integer, for "the newer document wins".
 *
 * Accepts `YYYY-MM` and `YYYY-MM-DD`, which is how a tax authority dates a guide — IR265 is
 * *October 2023* and has no day. A missing day sorts as the 1st, so `2024-04` and
 * `2024-04-01` compare equal rather than one silently beating the other.
 *
 * @param {*} published
 * @returns {number|null} `YYYYMMDD` as a number, or null when it is not a date we can rank
 */
function publishedKey (published) {
  if (typeof published !== 'string') { return null }
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(published.trim())
  if (!m) { return null }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = m[3] === undefined ? 1 : Number(m[3])
  if (year < MIN_YEAR || year > MAX_YEAR) { return null }
  if (month < 1 || month > 12) { return null }
  if (day < 1 || day > 31) { return null }
  return (year * 10000) + (month * 100) + day
}

/**
 * Validate one figure's source document.
 *
 * 🔴 A SOURCE IS MANDATORY ON A STORED FIGURE AND THERE IS NO WAY TO STORE ONE WITHOUT IT.
 * Every approved drawing shows each figure with its document and date beneath it, and the
 * reason is not presentation: an unsourced number in an approved table is indistinguishable
 * from a sourced one on the page a lender reads. A figure with no document is an app default,
 * and app defaults live in `data/*.json`, not in a firm's approved table.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {object|null} the cleaned source, or null when it was refused
 */
function cleanSource (value, where, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where}.source is required — an approved figure must name the document it came from`)
    return null
  }
  const document = typeof value.document === 'string' ? value.document.trim() : ''
  if (!document || document.length > MAX_LABEL) {
    errors.push(`${where}.source.document must be a document name of 1 to ${MAX_LABEL} characters`)
    return null
  }
  const key = publishedKey(value.published)
  if (key === null) {
    errors.push(`${where}.source.published must be a date like 2023-10 or 2023-10-31`)
    return null
  }
  const page = value.page === null || value.page === undefined ? null : String(value.page).trim().slice(0, 20)
  return { document, page: page || null, published: value.published.trim() }
}

/**
 * A rate expressed as a decimal share, refused outside 0..1.
 *
 * Zero is legitimate and deliberately allowed: a country with no GST at all has a GST rate of
 * zero, and refusing it would force a firm to leave the figure unsourced instead.
 *
 * @param {*} value
 * @param {string} where - for the error message, including the field name
 * @param {string[]} errors - collected in place
 * @returns {number|null} the rate, or null when it was refused
 */
function cleanRate (value, where, errors) {
  const n = num(value)
  if (n === null) {
    errors.push(`${where} is required and must be a number`)
    return null
  }
  if (n < 0 || n > 1) {
    errors.push(`${where} must be a rate between 0 and 1 (30% is 0.3, not 30)`)
    return null
  }
  return n
}

/**
 * Trimmed text, capped, or null when there is none.
 *
 * @param {*} value
 * @param {number} cap
 * @returns {string|null}
 */
function cleanText (value, cap) {
  if (typeof value !== 'string') { return null }
  const t = value.trim()
  return t ? t.slice(0, cap) : null
}

module.exports = {
  MAX_LABEL,
  MIN_YEAR,
  MAX_YEAR,
  normaliseCountry,
  num,
  publishedKey,
  cleanSource,
  cleanRate,
  cleanText
}

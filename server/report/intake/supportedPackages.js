'use strict'

/**
 * Which accounting packages the report intake can read — the single source of truth.
 *
 * WHY THIS EXISTS. On 2026-09-02 Mike ruled "Xero" out of every user-facing string in
 * favour of "your accounting software". That was right — the app should not read as
 * Xero-only — but it left the wording promising a breadth the code had not been shown
 * to have. He then asked for the reader to be tested against QuickBooks and MYOB, for
 * the packages tested to be listed, and for the app to say which it supports. This file
 * is that list, and every user-facing sentence about it is built from here, so the
 * screens, the refusal messages and the documentation can never disagree.
 *
 * 🔴 `confidence` IS THE HONEST PART AND MUST NOT BE INFLATED.
 *
 *   'verified' — the reader has been run against REAL exports from this package,
 *                supplied by the firm. Xero alone holds this today: real exports were
 *                supplied 2026-07-13 and 2026-07-15, and reading them overturned three
 *                assumptions (see REPORT-DATA-MODEL.md §3.9).
 *
 *   'expected' — the reader handles the package's published report layout, checked
 *                against a RECONSTRUCTION of it, and the checks are in
 *                `tests/unit/accountingPackages.test.js`. NO REAL EXPORT HAS BEEN READ.
 *                A reconstruction proves the reader copes with the shape as documented;
 *                it cannot prove the shape is right, because a real chart of accounts
 *                is the thing that surprises you.
 *
 * Moving a package from 'expected' to 'verified' takes one thing and nothing else: a
 * real Balance Sheet and Profit and Loss export from it. Do not promote on the strength
 * of more reconstructions.
 */

/**
 * @type {ReadonlyArray<{name: string, confidence: 'verified'|'expected', since: string, evidence: string}>}
 */
const PACKAGES = Object.freeze([
  Object.freeze({
    name: 'Xero',
    confidence: 'verified',
    since: '2026-07-13',
    evidence: 'Real Balance Sheet, Profit and Loss, by-month P&L and Aged Receivables exports, supplied by the firm and read directly. Three assumptions were refuted in the process.'
  }),
  Object.freeze({
    name: 'QuickBooks Online',
    confidence: 'expected',
    since: '2026-09-02',
    evidence: 'Checked against a reconstruction of the published layout: "As of" date line, company name above the title, ASSETS / LIABILITIES AND EQUITY headings, "Accounts Receivable (A/R)", "Cost of Goods Sold", "Common Stock". Four fixes were needed and are in place. No real export has been read.'
  }),
  Object.freeze({
    name: 'MYOB',
    confidence: 'expected',
    since: '2026-09-02',
    evidence: 'Checked against a reconstruction of the published layout: "Trade Debtors" / "Trade Creditors", bank accounts listed with no "Bank" heading, "Profit & Loss Statement" title, a date-range period line. No real export has been read.'
  })
])

/** Packages read directly from real exports. @returns {string[]} */
function verifiedNames () {
  return PACKAGES.filter(p => p.confidence === 'verified').map(p => p.name)
}

/** Packages handled from their published layout only. @returns {string[]} */
function expectedNames () {
  return PACKAGES.filter(p => p.confidence === 'expected').map(p => p.name)
}

/**
 * Join names the way a person writes a list.
 * @param {string[]} names @returns {string}
 */
function listNames (names) {
  if (names.length === 0) { return '' }
  if (names.length === 1) { return names[0] }
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

/**
 * The short line for a refusal message — what we can read, in one clause.
 * @returns {string} e.g. "Xero, QuickBooks Online and MYOB"
 */
function supportedList () {
  return listNames(PACKAGES.map(p => p.name))
}

/**
 * The line shown where an advisor chooses files. It names what is read AND, separately,
 * what has not yet been confirmed against a real file — because an advisor putting a
 * client's figures on a page is entitled to know which of those they are looking at.
 * @returns {string}
 */
function supportedSentence () {
  const verified = verifiedNames()
  const expected = expectedNames()
  let s = 'Reports exported from ' + supportedList() + ' can be read.'
  if (verified.length && expected.length) {
    s += ' ' + listNames(verified) + ' ' + (verified.length === 1 ? 'is' : 'are') +
      ' confirmed against real exports; ' + listNames(expected) + ' ' +
      (expected.length === 1 ? 'is' : 'are') + ' supported from ' +
      (expected.length === 1 ? 'its' : 'their') + ' published layout, so check the figures on the next step.'
  } else if (expected.length) {
    s += ' None has yet been confirmed against a real export, so check the figures on the next step.'
  }
  return s
}

module.exports = { PACKAGES, supportedList, supportedSentence, verifiedNames, expectedNames, listNames }

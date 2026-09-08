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
 *                supplied by the firm. Xero: exports supplied 2026-07-13 and 2026-07-15,
 *                which overturned three assumptions (REPORT-DATA-MODEL.md §3.9).
 *                QuickBooks Online and MYOB: exports supplied by Mike 2026-09-07.
 *
 *   'expected' — the reader handles the package's published report layout, checked
 *                against a RECONSTRUCTION of it. NO REAL EXPORT HAS BEEN READ. A
 *                reconstruction proves the reader copes with the shape as documented;
 *                it cannot prove the shape is right, because a real chart of accounts
 *                is the thing that surprises you. **No package holds this today.**
 *
 * Moving a package from 'expected' to 'verified' takes one thing and nothing else: a
 * real Balance Sheet and Profit and Loss export from it. Do not promote on the strength
 * of more reconstructions.
 *
 * ⚠ THE 2026-09-07 FILES WERE MISREAD AS RECONSTRUCTIONS FOR A DAY, and the record said
 * so in four places until Mike corrected it on 2026-09-08. The reasoning was that both
 * workbooks describe the same fictional company with the same figures — which is what
 * testing two packages honestly looks like, the same business entered in both, and says
 * nothing about whether the software produced the file. **The layout is what a parser
 * reads, and figures cannot tell you anything about it.** The proof was already in hand
 * and was being reported as a doubt: the MYOB file broke this reader four separate ways
 * (see its evidence line). A reconstruction reflects what its author expected and
 * therefore never surprises you.
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
    confidence: 'verified',
    since: '2026-09-07',
    evidence: 'Real export supplied by Mike on 2026-09-07 and read directly: QuickBooks_Online_Financial_Exports.xlsx, three reports — Profit and Loss, Balance Sheet, Fixed Asset Listing — for Apex Auto & Engineering Ltd. The reader needed no change to read it. Its layout carries QuickBooks\' own signatures: leading-space indentation as hierarchy, a bare TOTAL column header, account numbers inside the label ("1000 Operating Account"), and "As of December 31, 2025".'
  }),
  Object.freeze({
    name: 'MYOB',
    confidence: 'verified',
    since: '2026-09-07',
    evidence: 'Real export supplied by Mike on 2026-09-07 and read directly: MYOB_Financial_Exports.xlsx, three reports — Profit & Loss (With Year to Date), Balance Sheet Summary, Asset Register — for Apex Auto & Engineering Ltd. 🔴 IT BROKE THE READER FOUR TIMES, which is what a reconstruction never does and why this file settles the question. (1) Its "Account No." column made every label arrive as an account code, so the balance sheet parsed to NO figures at all with no error saying so (fixed: rowShape). (2) Cash counted the cheque account but not the "Online Saver" one, reading 64,500 of a real 89,500 — a wrong figure, not a missing one. (3) The "January 2025 through December 2025" period line gave the P&L no date and no year. (4) MYOB heads its fixed assets "Property, Plant & Equipment" — the accounting standard\'s own wording, saying neither "fixed" nor "non-current" — so no asset row passed the section test: the categories came back empty and the net 145,300 was swept into other current assets. The balance sheet still tied, which is why nothing complained, but the forecast then opened every asset at zero and charged no depreciation for the year. All four are fixed and pinned in tests/unit/accountingPackages.test.js.'
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
  return sentenceFor(PACKAGES)
}

/**
 * The same sentence, for any package list.
 *
 * ⚠ IT TAKES THE LIST SO THE UNCONFIRMED CASE CAN STILL BE TESTED. Since 2026-09-07 every
 * package is `verified`, which makes the caveat branch unreachable from the live list — and an
 * unreachable branch nobody can exercise is one a later session deletes as dead code. The next
 * package added would then ship with no "check the figures" line at all, which is the whole
 * safety margin for a package read only from its published layout.
 *
 * @param {ReadonlyArray<{name: string, confidence: string}>} packages
 * @returns {string}
 */
function sentenceFor (packages) {
  const verified = packages.filter(p => p.confidence === 'verified').map(p => p.name)
  const expected = packages.filter(p => p.confidence === 'expected').map(p => p.name)
  let s = 'Reports exported from ' + listNames(packages.map(p => p.name)) + ' can be read.'
  if (verified.length && expected.length) {
    s += ' ' + listNames(verified) + ' ' + (verified.length === 1 ? 'is' : 'are') +
      ' confirmed against real exports; ' + listNames(expected) + ' ' +
      (expected.length === 1 ? 'is' : 'are') + ' supported from ' +
      (expected.length === 1 ? 'its' : 'their') + ' published layout, so check the figures on the next step.'
  } else if (expected.length) {
    s += ' None has yet been confirmed against a real export, so check the figures on the next step.'
  } else if (verified.length > 1) {
    // Every package confirmed — true since 2026-09-07. The caveat is dropped rather than
    // softened: there is nothing left to warn about, and a warning that survives the thing
    // it warned about teaches an advisor to stop reading it.
    s += ' All ' + (verified.length === 2 ? 'two' : 'three') + ' are confirmed against real exports.'
  }
  return s
}

module.exports = {
  PACKAGES, supportedList, supportedSentence, sentenceFor, verifiedNames, expectedNames, listNames
}

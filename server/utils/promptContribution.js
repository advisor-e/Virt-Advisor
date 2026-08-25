'use strict'

/**
 * @file The deterministic checks a pasted prompt must pass — Layer 2 of
 * `design/PROMPT-CONTRIBUTION-SAFETY.md`, item 4.31.
 * @module server/utils/promptContribution
 *
 * 🔴 THIS IS NOT WHAT MAKES A HOSTILE PROMPT HARMLESS. Layer 1 is —
 * `fenceUntrusted()` in `./promptSafety`, which delivers the text to the model as a
 * quotation it has been told to read and never obey. Everything here only reduces how
 * often something nasty is quoted. The design says it plainly: *"We do not try to detect
 * a malicious prompt. We make a malicious prompt unable to do anything."* If a check
 * below is ever got past, nothing is breached — which is the whole reason the checks are
 * allowed to be simple, readable and imperfect.
 *
 * 🔴 ONE REFUSAL AT A TIME, IN SEVERITY ORDER. The screen shows a single message with a
 * single fix, so a scan stops at the first thing it finds. The order below is the order
 * of how much the finding matters, not the order it is cheapest to look for:
 *
 *   1. length      — checked first so a five-megabyte paste is never scanned at all
 *   2. fence       — the only one that usually means somebody meant it
 *   3. invisible   — carries meaning to a machine and nothing to a reader
 *   4. secret      — a live key must be replaced, not moved
 *   5. link        — the route data leaves by
 *   6. personal    — fires most often, and almost never on anybody doing wrong
 *
 * ⚠ WHAT THIS CANNOT DO, said here rather than discovered later. **A bare personal name
 * is not detectable** — "Margaret Whitfield" and "Working Capital Cycle" are the same
 * shape to a regular expression, and no amount of pattern work changes that. What is
 * detectable is a name's company: a street address, a tax number, a title. So the
 * personal check finds those, and the wording asks the accountant to replace the real
 * details rather than claiming we found all of them. A name typed with nothing around it
 * reaches the model inside the Layer 1 fence.
 *
 * ⚠ NOTHING IN THIS FILE LOGS THE TEXT IT IS GIVEN. It routinely contains real client
 * data — that is the whole point of the personal check — so it is never written to a log
 * line, an error message or a thrown Error. Callers must hold to the same rule.
 *
 * Node 14, CommonJS.
 */

const { OPEN, CLOSE, INVISIBLE, stripInvisible } = require('./promptSafety')

/**
 * The most a prompt may run to before we decline to check it.
 *
 * 6,000 characters, about two pages. **Ruled by Mike, 2026-08-25** — the design named no
 * number ("a prompt is a page, a book is something else") and we proposed 8,000.
 * @type {number}
 */
const MAX_CHARACTERS = 6000

/** How much of a line we are willing to echo back on the refusal screen. */
const QUOTE_LIMIT = 140

/** How much of a suspected key we echo back. We never repeat one in full. */
const SECRET_PREFIX = 8

/**
 * Patterns that mean "this looks like a credential".
 *
 * The last entry is deliberately shape-based rather than vendor-specific: a run of forty
 * opaque characters is not prose in any language, and a check that only knows today's
 * vendors goes stale the week a new one appears.
 */
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}/, //                              OpenAI-style
  /\b(?:pk|sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}/, //        Stripe-style
  /\bAKIA[0-9A-Z]{16}\b/, //                                 AWS access key id
  /\bgh[pousr]_[A-Za-z0-9]{20,}/, //                         GitHub
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/, //                       Slack
  /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, // JWT
  /\b(?:api[\s_-]?key|secret|password|passwd|token|bearer)\b[^\S\n]*[:=][^\S\n]*\S{6,}/i,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/ //                          long opaque blob
]

/** An email address. Checked before the bare-domain pattern, which would also match it. */
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/

/**
 * A web address, in the three shapes people actually write.
 *
 * ⚠ THE BARE-DOMAIN PATTERN IS LIMITED TO KNOWN ENDINGS ON PURPOSE. Matching any
 * `word.word` would flag "Fig.4", "vs.2" and every abbreviation an accountant writes.
 * The cost of the shorter list is that an unusual ending slips through as plain prose —
 * where Layer 1 still holds it, and where it is not a working link to a reader either.
 */
const LINK_PATTERNS = [
  /\bhttps?:\/\/\S+/i,
  /\bwww\.[A-Za-z0-9-]+\.[A-Za-z]{2,}\S*/i,
  /\b[A-Za-z0-9-]+\.(?:com|net|org|io|co|nz|au|uk|us|ai|app|dev|info|biz|me|cloud|xyz|edu|gov)(?:\.[a-z]{2})?\b\S*/i
]

/** A street address — a number, some capitalised words, and a thoroughfare. */
const ADDRESS_RE = /\b\d{1,5}[A-Za-z]?[\s,]+(?:[A-Z][A-Za-z'’-]+[\s,]+){1,4}(?:Street|St|Road|Rd|Avenue|Ave|Terrace|Tce|Drive|Dr|Lane|Ln|Place|Pl|Crescent|Cres|Court|Ct|Close|Way|Parade|Highway|Hwy|Boulevard|Blvd|Quay|Esplanade|Grove|Rise|View)\b\.?/

/** A tax or registration number, either labelled or in a recognisable shape. */
const TAX_PATTERNS = [
  /\b(?:IRD|TFN|ABN|ACN|UTR|NINO|VAT|GST|SSN|EIN)\b[^\S\n]*(?:number|no\.?|#)?[^\S\n]*[:#]?[^\S\n]*\d[\d\s-]{6,}/i,
  /\b(?:tax|national insurance)[\s-]?(?:file[\s-]?)?number\b[^\S\n]*[:#]?[^\S\n]*\d[\d\s-]{6,}/i,
  /\b[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]\b/, //  UK National Insurance number
  /\b\d{2,3}-\d{3}-\d{3}\b/ //              IRD / UTR formatting
]

/** A person named with a title — the one name shape that is safe to match. */
const TITLE_NAME_RE = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Dame)\.?\s+[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+)?/

/**
 * Splits text into lines, keeping the reader's numbering (1-based).
 * @param {string} text
 * @returns {string[]}
 */
function linesOf (text) {
  return String(text).split(/\r\n|\r|\n/)
}

/**
 * Shortens a fragment for display, without cutting a line in a way that hides the finding.
 * @param {string} fragment
 * @returns {string}
 */
function clip (fragment) {
  const trimmed = String(fragment).trim()
  return trimmed.length > QUOTE_LIMIT ? trimmed.slice(0, QUOTE_LIMIT) + '…' : trimmed
}

/**
 * Finds the first line matching any of a list of patterns.
 *
 * @param {string[]} lines
 * @param {RegExp[]} patterns
 * @returns {{line: number, match: string, text: string}|null} 1-based line, the matched
 *   fragment, and the whole line
 */
function firstMatch (lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    for (let p = 0; p < patterns.length; p++) {
      const found = lines[i].match(patterns[p])
      if (found) {
        return { line: i + 1, match: found[0], text: lines[i] }
      }
    }
  }
  return null
}

/**
 * The length check, run before anything else so an enormous paste is never scanned.
 * @param {string} text
 * @returns {object|null} a refusal, or null
 */
function checkLength (text) {
  if (text.length <= MAX_CHARACTERS) { return null }
  return { kind: 'length', characters: text.length, limit: MAX_CHARACTERS }
}

/**
 * The fence check. `fenceUntrusted()` already strips these markers, so finding one here
 * changes nothing about safety — but its PRESENCE is the signal, and the design refuses
 * rather than silently strips for exactly that reason.
 *
 * @param {string} text
 * @returns {object|null}
 */
function checkFence (text) {
  const lines = linesOf(text)
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].includes(OPEN)
      ? OPEN
      : (lines[i].includes(CLOSE) ? CLOSE : null)
    if (marker) {
      return { kind: 'fence', line: i + 1, quote: marker }
    }
  }
  return null
}

/**
 * The invisible-character check.
 *
 * 🔴 THIS IS THE ONE CHECK THAT CAN BE PERFECT, and under the paste-only ruling it is
 * the only thing standing between a hidden instruction and the fence — pasting defeats
 * text hidden by LAYOUT and does nothing to text hidden by ENCODING
 * (`PROMPT-CONTRIBUTION-SAFETY.md` §1a). Invisible characters have no legitimate use in
 * advisory prose at all, so there is no honest text this can wrongly refuse.
 *
 * @param {string} text
 * @returns {object|null} `{ kind, line, count }` — there is nothing to quote, because
 *   there is nothing to see
 */
function checkInvisible (text) {
  const scan = new RegExp(INVISIBLE.source, 'g')
  const count = (text.match(scan) || []).length
  if (count === 0) { return null }

  const lines = linesOf(text)
  let line = 1
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(INVISIBLE.source).test(lines[i])) { line = i + 1; break }
  }
  return { kind: 'invisible', line, count }
}

/**
 * The credential check. The finding is echoed back SHORTENED — we do not repeat a secret
 * in full, even to the person who owns it.
 *
 * @param {string} text
 * @returns {object|null}
 */
function checkSecret (text) {
  const hit = firstMatch(linesOf(text), SECRET_PATTERNS)
  if (!hit) { return null }
  return {
    kind: 'secret',
    line: hit.line,
    quote: hit.match.slice(0, SECRET_PREFIX) + '…'
  }
}

/**
 * The address check — web and email together, because it is the same risk and the design
 * gives them the same message with one noun swapped.
 *
 * @param {string} text
 * @returns {object|null} `variant` is `'email'` or `'web'`
 */
function checkLink (text) {
  const lines = linesOf(text)

  const email = firstMatch(lines, [EMAIL_RE])
  const web = firstMatch(lines, LINK_PATTERNS)

  // An email address contains a domain, so whichever appears FIRST in the document is
  // the honest thing to report. On the same line, the email is the more specific finding.
  if (email && (!web || email.line < web.line || email.line === web.line)) {
    return { kind: 'link', variant: 'email', line: email.line, quote: clip(email.match) }
  }
  if (web) {
    return { kind: 'link', variant: 'web', line: web.line, quote: clip(web.match) }
  }
  return null
}

/**
 * The client-data check — the one that fires most often and almost never on anybody
 * doing anything wrong.
 *
 * ⚠ SEE THE FILE HEADER FOR WHAT THIS CANNOT FIND. It looks for the things that keep a
 * name company — an address, a tax number, a title — because a bare name has no shape.
 * A phone number is deliberately NOT matched: this is an application full of figures,
 * and the pattern that catches a phone number catches a column of them too.
 *
 * The whole line is quoted rather than the fragment, because the surrounding words are
 * usually the name itself and the accountant needs to see what we mean.
 *
 * @param {string} text
 * @returns {object|null} `variant` is `'address'`, `'taxNumber'` or `'name'`
 */
function checkPersonal (text) {
  const lines = linesOf(text)

  const address = firstMatch(lines, [ADDRESS_RE])
  if (address) {
    return { kind: 'personal', variant: 'address', line: address.line, quote: clip(address.text) }
  }
  const tax = firstMatch(lines, TAX_PATTERNS)
  if (tax) {
    return { kind: 'personal', variant: 'taxNumber', line: tax.line, quote: clip(tax.match) }
  }
  const named = firstMatch(lines, [TITLE_NAME_RE])
  if (named) {
    return { kind: 'personal', variant: 'name', line: named.line, quote: clip(named.match) }
  }
  return null
}

/**
 * Runs every deterministic check, in severity order, and stops at the first finding.
 *
 * @param {*} input - The pasted text (coerced to string; null/undefined → '')
 * @param {object} [options]
 * @param {boolean} [options.removeInvisible=false] - Set when the accountant has pressed
 *   *"Take them out and check it again"*. Invisible characters are stripped BEFORE the
 *   scan, so the check that would have refused cannot fire. Nothing else is ever altered:
 *   the design requires a refusal to be shown, never silently applied, and this is the one
 *   removal a person has explicitly asked for.
 * @returns {{ok: boolean, text: string, refusal: (object|null)}} `text` is what may be
 *   sent onward — identical to the input unless invisible characters were removed by
 *   request.
 */
function checkContribution (input, options) {
  const opts = options || {}
  const original = String(input === null || input === undefined ? '' : input)
  const text = opts.removeInvisible === true ? stripInvisible(original) : original

  const refusal =
    checkLength(text) ||
    checkFence(text) ||
    checkInvisible(text) ||
    checkSecret(text) ||
    checkLink(text) ||
    checkPersonal(text)

  return refusal
    ? { ok: false, text: '', refusal }
    : { ok: true, text, refusal: null }
}

module.exports = {
  checkContribution,
  MAX_CHARACTERS,
  // exported for the tests, which assert each check in isolation as well as in order
  checkLength,
  checkFence,
  checkInvisible,
  checkSecret,
  checkLink,
  checkPersonal
}

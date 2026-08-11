'use strict'

/**
 * @file Finding tool names written into instruction prose.
 * @module server/utils/toolNameScan
 *
 * WHY THIS IS ITS OWN MODULE. Two callers need the identical answer to "what
 * tools does this sentence name":
 *
 *  - the **Template Check screen** (server/utils/templateCheck.js), which reports
 *    the names Mike has to rule on, and
 *  - the **runtime recommendation gate** (server/utils/logicTrees.js), which
 *    decides whether a sentence is safe to put in front of the AI.
 *
 * If those two ever disagreed, the screen would show a clean table while the
 * engine withheld its sentences, or worse the reverse — and nothing would say so.
 * Sharing one function is the same discipline `isTemplateName` already applies to
 * the template lists. It lives here rather than in either caller because
 * templateCheck already requires logicTrees, and the reverse edge would close a
 * require cycle.
 *
 * IT IS A HEURISTIC AND IS DESCRIBED AS ONE ON THE SCREEN. It raises phrases that
 * were never documents, and it misses a tool written in lower case. Both limits
 * are stated rather than hidden, because a scan that silently under-reports is the
 * failure the Template Check exercise exists to end.
 */

/**
 * Words allowed to sit lowercase inside a capitalised phrase. Without these,
 * "Chart of Accounts" is read as two separate phrases and the real name is lost.
 */
const CONNECTORS = new Set(['of', 'the', 'and', 'for', 'to', 'in', 'on', 'with', 'a', 'an', '&'])

/**
 * The verbs that introduce a tool in these tables.
 *
 * DERIVED FROM THE DATA, NOT GUESSED. Read against the real prose, the tables are
 * strikingly consistent — a tool is named as the object of an instruction:
 *   "**Deploy the** Offshoring Review and use the 6 Hats Framework"
 *   "**Deploy the** Annual Board Plan and BoardPack Agenda"
 *   "**Issue a** Yellow Card citing the Agreed Response Time Guidelines"
 *   "**Introduce the** Quality Decisions frameworks"
 * whereas a capitalised phrase that is merely being discussed carries no verb:
 *   "The 5 Common Psyche Errors: Confirmation Bias…"
 *   "Chart of Accounts design is the critical first step"
 * Both of those are phrases Mike ruled "Not a tool" on 2026-08-05, and requiring
 * the verb declines to raise them without anyone having to dismiss them.
 *
 * A first attempt took every capitalised phrase and produced 745 rows against the
 * 27 found by hand — menu names ("Do the Job"), sentence fragments ("Revenue
 * Model. Select"), and every proper noun in the corpus. A list nobody can finish
 * is the same as no list.
 */
const TOOL_VERBS = [
  'use', 'uses', 'using', 'used',
  'deploy', 'deploys', 'deploying',
  'apply', 'applies', 'applying',
  'introduce', 'introduces', 'introducing',
  'issue', 'issues', 'issuing',
  'initiate', 'initiates', 'initiating',
  'complete', 'completes', 'completing',
  'run', 'runs', 'running',
  'reference', 'references', 'referencing',
  'cite', 'cites', 'citing',
  'present', 'presents', 'presenting',
  'work through', 'walk through', 'start with', 'follow'
]

/** A phrase must have at least this many words to be treated as a possible tool name. */
const MIN_PHRASE_WORDS = 2

/**
 * Normalise for comparison only — never for display or storage. Lowercased,
 * punctuation stripped, runs of whitespace collapsed, so "Get. Paper Tower Model"
 * and "Get Paper Tower Model" are recognised as the same attempt at a name.
 *
 * @param {string} s
 * @returns {string}
 */
function normalise (s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tidy one captured phrase, or reject it.
 *
 * Keeps the name WHOLE. An earlier version stripped a trailing tool noun on the
 * theory that "Financial Systems Review template" should reduce to its title —
 * and turned "Annual Board Plan" into "Annual Board", inventing a name that
 * appears nowhere. The noun is part of the title as often as it is a suffix, and
 * guessing which costs more than it saves: the candidate matcher already reads
 * through a longer name to the title inside it.
 *
 * @param {string} raw
 * @returns {string|null} the name as written, or null when it is not one.
 */
function trimToToolName (raw) {
  const parts = String(raw || '').trim().split(/\s+/).filter(Boolean)
  // A dangling connector is the tail of the sentence, not part of the name.
  while (parts.length && CONNECTORS.has(parts[parts.length - 1].toLowerCase())) { parts.pop() }
  if (parts.length < MIN_PHRASE_WORDS) { return null }
  return parts.join(' ')
}

/**
 * Pull capitalised phrases that might be tool names out of instruction prose.
 *
 * ⚠ A WORD OF THE NAME MAY BE A NUMBER, and this is not a detail. The catalogue
 * genuinely publishes "Business Purchase Assessment 1", "Purchase Assessment
 * Model 2", "Purchase Assessment Report 3" and "Business Sale Assessment 1", and
 * the trees name all four correctly. An earlier pattern required every word after
 * the first to begin with a capital LETTER, so it cut each name short at the digit
 * and reported a name — "Business Purchase Assessment" — that exists nowhere.
 * That produced 9 rows on the Template Check screen that needed no ruling, and it
 * would have made the runtime gate withhold 8 perfectly correct sentences. The
 * number is part of the title, so it is part of the match.
 *
 * The `and` split takes the same class for the same reason: "Use Quality Decisions
 * and 6 Hats" names two real templates, and splitting only before a capital letter
 * ran them together into one phrase that matched neither.
 *
 * @param {string} text
 * @returns {Array<string>} distinct phrases, in the order they appear.
 */
function extractProseNames (text) {
  const s = String(text || '')
  if (!s) { return [] }
  const out = []
  const seen = new Set()

  // The whole pattern must stay case-SENSITIVE — the capitalised phrase is the
  // signal, and an /i flag would match every lowercase word after the verb. So
  // each verb allows both cases on its first letter only: an instruction opens a
  // sentence as often as it sits inside one ("Deploy the …" / "…and deploy the …").
  const verbs = TOOL_VERBS
    .map(v => `[${v[0].toUpperCase()}${v[0]}]${v.slice(1).replace(/\s/g, '\\s+')}`)
    .join('|')
  // <verb> [the|a|an|your|their] <Capitalised Phrase> [and <Capitalised Phrase>]
  // The sentence is cut at any full stop, colon or dash before matching, so a
  // phrase can never run across a boundary and glue two names together.
  const re = new RegExp(
    `\\b(?:${verbs})\\s+(?:the|a|an|your|their|our)?\\s*` +
    '([A-Z][A-Za-z0-9\'’&-]*(?:\\s+(?:of|the|and|for|to|in|on|with|&)?\\s*[A-Z0-9][A-Za-z0-9\'’&-]*)*)',
    'g'
  )

  for (const sentence of s.split(/[.:;!?]|\s[—–-]\s/)) {
    let m
    while ((m = re.exec(sentence)) !== null) {
      // "Deploy the Annual Board Plan and BoardPack Agenda" names TWO tools, and
      // the second is exactly the kind that was missed by hand.
      for (const part of m[1].split(/\s+and\s+(?=[A-Z0-9])/)) {
        const phrase = trimToToolName(part)
        if (!phrase) { continue }
        const key = normalise(phrase)
        if (seen.has(key)) { continue }
        seen.add(key)
        out.push(phrase)
      }
    }
    re.lastIndex = 0
  }
  return out
}

module.exports = {
  CONNECTORS,
  TOOL_VERBS,
  MIN_PHRASE_WORDS,
  normalise,
  trimToToolName,
  extractProseNames
}

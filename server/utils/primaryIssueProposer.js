'use strict'

/**
 * primaryIssueProposer — the engine's middle, built at last (item 4.97 US1).
 *
 * After the cause-first domain check-in the engine PROPOSES the single most likely primary
 * issue, in one sentence with one reason, and the advisor confirms it or reframes it in their
 * own words. The confirmed label is one of Mike's authored Workshop-1 labels
 * (`data/primary-issues.json`), it is stored on the decision trace, the resolver scores
 * against it, and it travels into the Outcome Learning pool as that pairing's situation.
 *
 * 🔴 NEVER A LIST. The cold `[PRIMARY_ISSUE_SELECTOR]` card was removed from the intake in
 * June 2026 because Mike disliked picking from a menu, and `retiredPrimaryIssueSelector.test.js`
 * pins its absence. This is the other half of that redesign — the propose-and-confirm step the
 * registry recorded as design debt — and it is a SENTENCE with the text box left open.
 *
 * 🔴 NOTHING HERE INVENTS A LABEL. Ranking chooses among the authored labels for the confirmed
 * domain and nothing else; the model, when it is asked at all, may answer only with a label
 * from that list or the word "none". A label the advisor's words do not support is worse than
 * no label, because the resolver scores against it and the pool learns from it.
 *
 * Mike's ruling of 2026-09-14 (Option B) on the no-match path: ask ONE open question for the
 * biggest driver, try the mapping once more, and if it still matches nothing, continue without
 * an issue and say so on the trace.
 */

const PRIMARY_ISSUES = require('../../data/primary-issues.json')
const DOMAINS_FILE = require('../../data/domains.json')
const { STOP_WORDS } = require('./stop-words')

const DOMAIN_RECORDS = Array.isArray(DOMAINS_FILE) ? DOMAINS_FILE : (DOMAINS_FILE.domains || [])

/**
 * Domains that produce no primary issue BY DESIGN — the advisory-engine brief's "context
 * domains": they override the strategy layer rather than naming a structural problem. They
 * are also absent from the authored file, so the labels check alone would skip them; naming
 * them here says it is a decision rather than missing content.
 */
const CONTEXT_DOMAINS = ['conflict', 'eoy', 'due-diligence']

/** The advisor agreeing. The same vocabulary the course-correction check already trusts. */
const CONFIRM_PATTERN = /\b(yes|yeah|yep|yup|correct|that.?s right|right|that.?s it|exactly|spot on|agreed|sounds right|pretty much|more or less|carry on|go ahead|continue)\b/i

/** The advisor disagreeing outright, with nothing else offered. */
const REJECT_PATTERN = /\b(no|nope|not really|not quite|wrong|that.?s not it|neither|none of (those|them|these)|not sure|no idea|don.?t know)\b/i

/**
 * A word that carries meaning when matching a label to the advisor's words.
 *
 * 🔴 THE RESOLVER'S INDUSTRY STOP-LIST MUST NOT BE USED HERE, and this comment exists because
 * the first cut of this file used it. `INDUSTRY_STOPWORDS` holds "sales", "service", "trading"
 * and the like, to stop a free-text INDUSTRY answer reading "sales business" as an industry
 * called "sales". Those are precisely the words Mike's problem labels are built from — "Cost of
 * sales has increased", "Sales Revenue — low volume". Filtering them made the engine propose
 * *Excessive discounting eroding margin* for an advisor who said "cost of sales has gone up,
 * suppliers put prices up", because "margin" was the only word left standing on either side.
 * Proved by running the ranker against the authored labels before any test was written.
 *
 * The floor is four characters rather than five, so "cost", "team", "data" and "risk" count.
 */
function _meaningful (word) {
  return word.length >= 4 && !STOP_WORDS.has(word)
}

/**
 * The meaningful words of a piece of text, deduplicated.
 * The same splitter the resolver's own matchers use, so "cost of sales" reads the same way
 * in both places.
 * @param {string} text
 * @returns {string[]}
 */
function keywords (text) {
  if (typeof text !== 'string') { return [] }
  return Array.from(new Set(
    text.toLowerCase().split(/[\s—–\-,/&().;:'"]+/).filter(_meaningful)
  ))
}

/**
 * The authored labels for a domain, or an empty list.
 * @param {string} domainId
 * @returns {string[]}
 */
function labelsFor (domainId) {
  const list = PRIMARY_ISSUES[domainId]
  return Array.isArray(list) ? list : []
}

/**
 * Whether this domain gets a proposal at all.
 * @param {string} domainId
 * @returns {boolean}
 */
function proposesIssue (domainId) {
  if (!domainId || CONTEXT_DOMAINS.includes(domainId)) { return false }
  return labelsFor(domainId).length > 0
}

/**
 * Signals that point at a label. Each authored label is matched to the signal types whose
 * own vocabulary it shares — never a hand-written map, because a map would rot the moment
 * Mike edits a label. A signal that fired in the advisor's description therefore supports any
 * label built from the same words.
 */
const SIGNAL_WORDS = {
  sales_volume: ['sales', 'revenue', 'volume', 'customers', 'clients'],
  pricing_issue: ['discount', 'discounting', 'price', 'pricing', 'margin'],
  cash_flow_gap: ['cash', 'debtors', 'working', 'capital', 'overdraft'],
  staff_problem: ['staff', 'people', 'team', 'training', 'hiring', 'management', 'roles'],
  strategy_needed: ['strategy', 'direction', 'plan', 'planning', 'vision'],
  data_quality: ['data', 'reporting', 'reports', 'records', 'information'],
  governance_gap: ['governance', 'board', 'ownership', 'shareholder', 'structure'],
  succession_issue: ['succession', 'retirement', 'exit', 'purpose'],
  systems_gap: ['systems', 'process', 'processes', 'technology', 'software'],
  marketing_gap: ['marketing', 'brand', 'leads', 'enquiries'],
  stock_management: ['stock', 'inventory', 'purchasing'],
  capital_raising: ['capital', 'funding', 'finance', 'lending'],
  revenue_modelling: ['modelling', 'model', 'feasibility'],
  governance_too_early: [],
  modeling_rejected: []
}

/**
 * Whether a word is simply the NAME OF THE DOMAIN — "sales" in sales-marketing, "data" in
 * data-systems, "risk" in risk. Read from the domain's own id, label and keyword pattern, so
 * it follows Mike's domain file rather than a hand-kept list here.
 *
 * @param {string} domainId
 * @param {string} word - already lowercased and stop-word filtered
 * @returns {boolean}
 */
function isDomainWord (domainId, word) {
  const d = DOMAIN_RECORDS.find(x => x.id === domainId)
  if (!d || typeof word !== 'string' || !word) { return false }
  if (String(domainId).split(/[-_]/).includes(word)) { return true }
  if (keywords(d.label || '').includes(word)) { return true }
  if (typeof d.keywords === 'string' && d.keywords) {
    try { return new RegExp(d.keywords, 'i').test(word) } catch (_e) { return false }
  }
  return false
}

/**
 * Whether the evidence is too thin to NAME one label with confidence.
 *
 * 🔴 THE FAULT THIS EXISTS TO STOP, found by running the built step on 2026-09-14. An advisor
 * said "margins are down, the cost of sales has gone up because suppliers put their prices
 * up". The case had been routed to `sales-marketing` upstream, and the only label there
 * matching any of their words was *Sales Execution — no visible sales process or poor sales
 * training*, on the single word "sales" — taken from "cost of **sales**". The engine told an
 * advisor describing a supplier-cost problem that their sales training was poor.
 *
 * The ranker was not wrong: under `profit` the same words score 4 on *Cost of sales has
 * increased*. What was wrong is CONFIDENCE. One word, and that word merely the name of the
 * domain, says the advisor's words picked the AREA — never which problem inside it.
 *
 * Two qualifiers, both measured against the 51 Scenario Lab cases before this shipped:
 * - Only a LONE match is ever withheld. Two matched words are a real overlap.
 * - Only where the domain holds MORE THAN ONE label. Where there is nothing to choose
 *   between (`risk` has one), the category word is the best evidence available and
 *   withholding it would cost the advisor a question for no gain.
 *
 * Effect on the corpus: 16 cases still propose, 6 ask the open driver question instead.
 *
 * @param {string} domainId
 * @param {string[]} matched - the label words the advisor actually used
 * @returns {boolean} true when the step should ask rather than assert
 */
function tooWeakToName (domainId, matched) {
  const words = Array.isArray(matched) ? matched : []
  if (words.length !== 1) { return false }
  if (labelsFor(domainId).length < 2) { return false }
  return isDomainWord(domainId, words[0])
}

/**
 * Rank the domain's authored labels against what the advisor actually said.
 *
 * Two pieces of evidence, and both are the advisor's own: the words of their cause answer,
 * and the problem signals the engine extracted from it. A label scores 2 for each of its
 * meaningful words the advisor used, and 1 for each fired signal whose vocabulary it shares.
 *
 * @param {string} domainId - the CONFIRMED domain
 * @param {string} causeText - the advisor's cause answer plus their check-in reply
 * @param {Object.<string, number>} problemSignals - signal type → count, as the engine extracted
 * @returns {{top: string|null, score: number, matched: string[], needsTiebreak: boolean, candidates: string[], weakEvidence: boolean}}
 *   `needsTiebreak` when two or more labels tie at the top with a real score — the one case
 *   where the model is asked, because the advisor's words genuinely point two ways.
 *   `weakEvidence` when a label DID rank but on evidence too thin to name it (see
 *   `tooWeakToName`): `top` is null, and the caller asks the open driver question rather
 *   than proposing.
 */
function rankLabels (domainId, causeText, problemSignals) {
  const labels = labelsFor(domainId)
  const empty = { top: null, score: 0, matched: [], needsTiebreak: false, candidates: [], weakEvidence: false }
  if (!proposesIssue(domainId) || labels.length === 0) { return empty }

  const said = new Set(keywords(causeText))
  const fired = Object.keys(problemSignals || {}).filter(s => (problemSignals[s] || 0) > 0)
  const firedWords = new Set()
  fired.forEach(s => (SIGNAL_WORDS[s] || []).forEach(w => firedWords.add(w)))

  const scored = labels.map((label) => {
    const words = keywords(label)
    const matched = words.filter(w => said.has(w))
    const signalHits = words.filter(w => firedWords.has(w) && !said.has(w))
    return { label, score: (matched.length * 2) + signalHits.length, matched }
  }).filter(s => s.score > 0)

  if (scored.length === 0) { return empty }
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0].score
  const tied = scored.filter(s => s.score === best)

  // The advisor's words named the AREA, not the problem inside it. Return nothing to
  // propose, and say why, so the caller asks the open driver question instead of asserting
  // a label on one category word. See `tooWeakToName`.
  if (tooWeakToName(domainId, tied[0].matched)) {
    return Object.assign({}, empty, { weakEvidence: true, matched: tied[0].matched })
  }

  return {
    top: tied[0].label,
    score: best,
    matched: tied[0].matched,
    needsTiebreak: tied.length > 1,
    candidates: tied.map(s => s.label),
    weakEvidence: false
  }
}

/**
 * The one line of reason shown with the proposal, from the advisor's own words.
 * @param {string[]} matched - the label words the advisor used
 * @returns {string}
 */
function reasonFrom (matched) {
  const words = Array.isArray(matched) ? matched.filter(w => typeof w === 'string') : []
  if (words.length === 0) { return 'it fits what you described' }
  const list = words.length === 1
    ? words[0]
    : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]
  return 'you mentioned ' + list
}

/**
 * The proposal sentence. Mike's wording, ruled on `design/mockups/primary-issue-proposal.html`
 * 2026-09-14 — no session rewords it without a fresh ruling.
 * @param {string} label
 * @param {string} reason
 * @returns {string}
 */
function proposalLine (label, reason) {
  return 'From what you\'ve said, the main issue looks like **' + label + '** — ' + reason +
    '. Have I got that right, or is it really something else?'
}

/** The second proposal, after the advisor reframed. Ruled on the same drawing. */
function reproposalLine (label) {
  return 'Then it sounds like **' + label + '** — have I got that right?'
}

/** The one open question when nothing matched. Mike's Option B, ruled 2026-09-14. */
const DRIVER_QUESTION = 'What\'s the single biggest thing driving it, in a sentence?'

/** What the engine says when it gives up on naming the issue, and moves on. */
const MOVING_ON_LINE = 'Noted — I\'ll work from your own words on that rather than pin it to a named issue.'

/**
 * Read the advisor's reply to a proposal.
 *
 * @param {string} reply - what they typed
 * @param {string} proposed - the label that was put to them
 * @param {string} domainId - the confirmed domain, for re-ranking a reframe
 * @returns {{outcome: 'confirmed'|'reframed'|'rejected'|'unmatched', label: string|null, matched: string[]}}
 *   - confirmed: they agreed; the proposed label stands
 *   - reframed:  their words point at a DIFFERENT authored label, which is proposed once more
 *   - rejected:  they said no and named nothing — the driver question follows
 *   - unmatched: they said something that is neither agreement nor a label — same path
 */
function parseReply (reply, proposed, domainId) {
  const text = typeof reply === 'string' ? reply.trim() : ''
  if (!text) { return { outcome: 'unmatched', label: null, matched: [] } }
  // 🔴 THERE IS NOTHING TO AGREE TO WITHOUT A PROPOSAL. Found by its own test, 2026-09-14: in
  // a context domain the ranker correctly returns nothing, the reply "it is really the cost of
  // sales" matched the confirm vocabulary on the word "really", and the outcome came back
  // `confirmed` with a null label — agreement to a question nobody asked, and a null stored as
  // though the advisor had chosen it.
  const hasProposal = typeof proposed === 'string' && proposed.trim() !== ''

  // A reply that names a different authored label is a reframe even if it opens with "yes",
  // because the advisor's own words outrank a stock phrase: "yes, but it's really the
  // discounting" is a correction, not agreement.
  //
  // 🔴 RANKED ON THE REPLY'S OWN WORDS ONLY — no signals. Found by walking the built step on
  // a running server, 2026-09-14: the signals passed here are extracted from the ORIGINAL
  // cause text, so they fire whatever the advisor now types. A plain "Yes that is right"
  // scored 2 on *Excessive discounting eroding margin* on the earlier `pricing_issue` signal
  // alone — matching NO word of the reply — beat the confirm check below, and the engine
  // recorded the advisor's agreement as a correction. `how` then read "reframed by you" on
  // the trace about an advisor who had simply said yes.
  //
  // A reframe is the advisor NAMING something else. That claim can only rest on words they
  // actually just typed, which is what the empty signal map enforces. The cause signals keep
  // their proper job — ranking the FIRST proposal, where the cause text is the evidence.
  const ranked = rankLabels(domainId, text, {})
  if (ranked.top && ranked.top !== proposed) {
    return { outcome: 'reframed', label: ranked.top, matched: ranked.matched }
  }

  if (hasProposal && CONFIRM_PATTERN.test(text)) {
    return { outcome: 'confirmed', label: proposed, matched: [] }
  }
  if (hasProposal && ranked.top === proposed) {
    // They restated the same issue in their own words. That is agreement.
    return { outcome: 'confirmed', label: proposed, matched: ranked.matched }
  }
  if (REJECT_PATTERN.test(text)) {
    return { outcome: 'rejected', label: null, matched: [] }
  }
  return { outcome: 'unmatched', label: null, matched: [] }
}

/**
 * The model's tie-break, used ONLY when two authored labels tie on the advisor's own words.
 *
 * Boxed exactly as the domain backstop is: the model chooses from a fixed list or says
 * "none", at temperature 0, and anything else is discarded. It never writes a label, never
 * sees a client identifier, and never decides whether an issue exists — only which of the
 * advisor's own candidates fits better.
 *
 * @param {Object} client - an aiProvider client for the 'classify' role
 * @param {string[]} candidates - the tied authored labels
 * @param {string} causeText - the advisor's own words, fenced by the caller
 * @returns {Promise<string|null>} one of `candidates`, or null
 */
async function tiebreakWithModel (client, candidates, causeText) {
  const list = Array.isArray(candidates) ? candidates.filter(c => typeof c === 'string' && c) : []
  if (!client || list.length < 2 || typeof causeText !== 'string' || !causeText.trim()) { return null }

  const numbered = list.map((c, i) => (i + 1) + '. ' + c).join('\n')
  const reply = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You choose which ONE of the listed business problems best matches what an ' +
          'advisor described. Answer with the number alone, or the word none if neither fits. ' +
          'Never write a problem of your own.'
      },
      { role: 'user', content: 'Problems:\n' + numbered + '\n\nWhat the advisor said:\n<<<\n' + causeText + '\n>>>' }
    ],
    temperature: 0,
    max_tokens: 5
  }, { personal: false })

  const answer = reply && reply.choices && reply.choices[0] && reply.choices[0].message
    ? String(reply.choices[0].message.content || '').trim().toLowerCase()
    : ''
  const n = parseInt(answer, 10)
  if (Number.isInteger(n) && n >= 1 && n <= list.length) { return list[n - 1] }
  return null
}

module.exports = {
  CONTEXT_DOMAINS,
  CONFIRM_PATTERN,
  DRIVER_QUESTION,
  MOVING_ON_LINE,
  keywords,
  labelsFor,
  proposesIssue,
  isDomainWord,
  tooWeakToName,
  rankLabels,
  reasonFrom,
  proposalLine,
  reproposalLine,
  parseReply,
  tiebreakWithModel
}

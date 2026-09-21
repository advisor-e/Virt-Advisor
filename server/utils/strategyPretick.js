'use strict'

/**
 * @file The AI pre-tick — what the "Suggest for this client" button asks the model,
 *   and what is allowed back out of it.
 * @module server/utils/strategyPretick
 *
 * Item 15.1, stage 6. Approved artefact: `design/mockups/strategy-session-menu.html`,
 * **Decision C, ruled by Mike 2026-09-17**. Its three binding consequences live here and
 * in the route:
 *
 *   (a) the count and the saved scope follow the TICKS, never the suggestion — this
 *       module returns a suggestion and never a scope;
 *   (b) the suggestion AND the advisor's final tick-list are both stored, which is the
 *       Original / AI Suggestion / Final Approved Value trail the engineering standards
 *       require — the route writes it;
 *   (c) the reason line is model output and is validated before it is shown. A reply
 *       naming a row that does not exist is dropped, never rendered.
 *
 * 🔴 WHAT REACHES THE MODEL, AND WHAT NEVER DOES. The advisor's own summaries of this
 * client's last conversations reach it. **No internal id of any kind does** — not the
 * case id, the client id, the advisor id or the firm id — and **no transcript does**.
 * A transcript is the spoken record and is personal data end to end; Meeting Review is
 * the ONE feature cleared to send that (CLAUDE.md, Mike's ruling 2026-09-01) and this is
 * not it. The summary is the advisor's own written account, which is what the drawing
 * means by "this client's last two conversations".
 *
 * 🔴 MEASURED BEFORE IT WAS BUILT, 2026-09-22, against Mike's own Pivot client and the
 * four strategy cases in `scripts/scenario-lab-cases.json`. Five situations produced five
 * different lists — pairwise overlap 0.14 to 0.50, one concept of 52 common to all five —
 * and no reply ever named a concept that does not exist. On Mike's Pivot client it found
 * 4 of the 9 concepts he placed, 3 of them without the words appearing in his text.
 * ⚠ THE PROMPT SHAPE HERE IS THE ONE THAT WAS MEASURED. Changing the fields sent, or the
 * role, invalidates that number — re-measure rather than assume it carries.
 *
 * ⚠ A NAMED LIMIT OF THE MEASUREMENT, recorded so it is not rediscovered as a defect: the
 * model reached the right SUBJECT and a different INSTRUMENT. Asked for a client who
 * needed to test their marketing message, it chose *10 Marketing Messages* where Pivot
 * uses *6 Marketing Questions*. The concept prose cannot separate those two for this
 * purpose. That prose is authored content and Mike's — it is never edited to chase a
 * bench result (CLAUDE.md).
 *
 * Node 14, CommonJS.
 */

const { fenceUntrusted, stripInvisible } = require('./promptSafety')

/**
 * How many conversation summaries are read. The drawing says "this client's last two
 * conversations" and that is the number: enough for a picture, few enough that a long
 * history does not bury the recent one.
 */
const MAX_CASES_READ = 2

/** One summary's contribution, so a single long case cannot crowd out the other. */
const MAX_SUMMARY_CHARS = 2000

/**
 * A ceiling on what one reply may tick. Measured at 5 to 10 across five situations, so 20
 * is loose enough never to clip a real answer and tight enough that a runaway reply
 * cannot pre-tick the whole menu.
 */
const MAX_SUGGESTIONS = 20

/** One line means one line. Longer is truncated rather than dropped. */
const MAX_REASON_CHARS = 160

/**
 * The model's instructions. Deliberately not a persona: it is told the shape of the
 * catalogue, the shape of the answer, and that it may not invent an id.
 */
const SYSTEM_PROMPT = [
  'You help a business advisor scope a strategy planning session for one client.',
  '',
  'You are given a catalogue of concepts the advisor can run in the session, one per line, as:',
  'id | name | planning domain | what the concept is | what it helps the client to do',
  '',
  'Given the client situation, choose the concepts worth putting in front of this client.',
  'Choose only from the catalogue. Never invent an id. Choose what genuinely fits the',
  'situation described - do not pad the list, and do not return everything in a domain.',
  '',
  'Reply with JSON only, in this exact shape:',
  '{"ticks":[{"id":"<catalogue id>","reason":"<one short line, plain English>"}]}'
].join('\n')

/**
 * One catalogue line per concept.
 *
 * A concept carrying neither summary nor helps-line is still listed, marked as having
 * neither. Measured: nine of the ten such concepts were never chosen in any of five
 * situations, and the one that was (*Choose Your Objectives*) was chosen on its name.
 * Hiding them would be this module deciding which of Mike's concepts an advisor may be
 * offered, which is not its decision to make.
 *
 * @param {Array<object>} concepts - records from `data/strategy-frameworks.json`
 * @returns {string} one line per concept, newline separated
 */
function catalogueLines (concepts) {
  return (concepts || []).map((c) => {
    const summary = String((c && c.conceptSummary) || '').trim()
    const helps = String((c && c.helpsClientTo) || '').trim()
    return [
      String((c && c.id) || ''),
      String((c && c.name) || ''),
      String((c && c.planningDomain) || ''),
      summary || '(no summary)',
      helps || '(no helps-client-to)'
    ].join(' | ')
  }).join('\n')
}

/**
 * The client's situation, built from the advisor's own summaries of recent conversations.
 *
 * 🔴 SUMMARIES ONLY, AND NO IDS. See the file header. A case whose summary is empty
 * contributes nothing rather than an empty heading, so a client with two untitled cases
 * reads as no history at all — which is the truth.
 *
 * @param {Array<object>} cases - case records, newest first
 * @returns {string} '' when there is nothing to describe
 */
function situationFromCases (cases) {
  if (!Array.isArray(cases)) { return '' }
  return cases
    .slice(0, MAX_CASES_READ)
    .map(c => String((c && c.summary) || '').trim().slice(0, MAX_SUMMARY_CHARS))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * The two messages sent to the model.
 *
 * The situation is advisor-supplied text and is fenced with the shared guard
 * (`promptSafety.fenceUntrusted`) rather than concatenated, so content inside it cannot
 * close the block and issue instructions of its own.
 *
 * @param {object} params
 * @param {string} params.situation - from `situationFromCases`
 * @param {Array<object>} params.concepts - the whole catalogue
 * @returns {Array<{role: string, content: string}>}
 */
function buildMessages (params) {
  const p = params || {}
  const user = [
    '<CLIENT_SITUATION>',
    fenceUntrusted(p.situation),
    '</CLIENT_SITUATION>',
    '',
    '<CONCEPT_CATALOGUE>',
    catalogueLines(p.concepts),
    '</CONCEPT_CATALOGUE>'
  ].join('\n')

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user }
  ]
}

/**
 * Everything that comes back from the model passes through here before anything is shown.
 *
 * 🔴 DECISION C(c) IS THIS FUNCTION. A tick naming a concept that does not exist is
 * dropped. So is a tick with no usable reason, because the ruling is "pre-ticks AND
 * writes one line of reason against each row" — a tick with nothing beside it is the one
 * thing the ruling does not allow on the screen. Both are counted in `dropped` rather
 * than discarded silently, so the route can log what the model got wrong.
 *
 * Reasons are truncated, never dropped, since a long reason is still a true one.
 *
 * @param {*} raw - the model's message content: an object, a JSON string, or anything else
 * @param {Array<string>|Set<string>} knownIds - every id the catalogue really holds
 * @returns {{concepts: Array<{id: string, reason: string}>, dropped: Array<{id: string, why: string}>}}
 */
function validateSuggestion (raw, knownIds) {
  const known = (knownIds instanceof Set) ? knownIds : new Set(Array.isArray(knownIds) ? knownIds : [])
  const out = { concepts: [], dropped: [] }

  let parsed = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch (err) { return out }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return out }
  if (!Array.isArray(parsed.ticks)) { return out }

  const seen = new Set()
  for (let i = 0; i < parsed.ticks.length; i++) {
    if (out.concepts.length >= MAX_SUGGESTIONS) { break }

    const tick = parsed.ticks[i]
    if (!tick || typeof tick !== 'object' || Array.isArray(tick)) { continue }

    const id = (typeof tick.id === 'string') ? tick.id.trim() : ''
    if (!id) { continue }
    if (!known.has(id)) {
      out.dropped.push({ id, why: 'unknown-concept' })
      continue
    }
    if (seen.has(id)) { continue }

    const reason = stripInvisible(
      (typeof tick.reason === 'string') ? tick.reason.trim() : ''
    ).trim()
    if (!reason) {
      out.dropped.push({ id, why: 'no-reason' })
      continue
    }

    seen.add(id)
    out.concepts.push({ id, reason: reason.slice(0, MAX_REASON_CHARS) })
  }

  return out
}

module.exports = {
  MAX_CASES_READ,
  MAX_SUGGESTIONS,
  MAX_REASON_CHARS,
  SYSTEM_PROMPT,
  catalogueLines,
  situationFromCases,
  buildMessages,
  validateSuggestion
}

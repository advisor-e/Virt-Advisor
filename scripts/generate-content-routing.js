'use strict'

/**
 * Generates design/CONTENT-ROUTING.md — which content reaches a CLIENT
 * RECOMMENDATION, and which is only ever read by an advisor.
 *
 * Why this exists. Content filed into the wrong lane is invisible: it renders on
 * screen, it saves, it passes tests, and it silently never reaches the decision
 * it was authored for. That happened three times in one week — the domain-support
 * storage-key defect, the Course Builder session-briefing defect, and the
 * 2026-07-31 near-miss where three client-facing logic tables were about to be
 * filed as `flat_if_then`, a shape the engine never walks. All three were found
 * by a person reading code. Nothing in the app showed the routing, so there was
 * no way to notice the next one.
 *
 * It is GENERATED, never hand-maintained. A hand-written copy of this table is
 * wrong the day an asset moves, and then quietly misleads everyone who trusts it.
 *
 * The classification rules live in server/utils/contentRouting.js, NOT here. That
 * module is also what the build guard reads, so the guard and this report can
 * never disagree — a report generated from its own private copy of the rules is a
 * report that drifts.
 *
 * Run: npm run routing
 *
 * HONEST LIMITS, stated here and in the generated file rather than hidden:
 *  - It classifies five families. Every other data file is listed by name in the
 *    "not covered" section — DERIVED by subtracting what the classifier reads
 *    from what is actually on disk, so a new data file appears there by itself
 *    rather than waiting for someone to remember.
 *  - It reads the PLATFORM layer. A firm's overrides are resolved at runtime and
 *    are not on disk to be classified.
 *  - A lane is not a quality mark. ai-briefing content is doing its job by NOT
 *    selecting templates.
 */

const fs = require('fs')
const path = require('path')

const {
  LANES,
  LANE_DESCRIPTIONS,
  classifyAllContent,
  summariseRouting
} = require('../server/utils/contentRouting')

const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const OUTPUT_PATH = path.join(ROOT, 'design', 'CONTENT-ROUTING.md')

/** The data files the classifier actually reads. Anything else is a blind spot. */
const COVERED_FILES = [
  'logic_trees.json',
  'templates.json',
  'course-quizzes.json',
  'advisory-distinctions.json'
]

/** Display order and headings for the families. */
const FAMILIES = [
  { key: 'logic-tree', title: 'Logic tables', note: 'A `nodes` table is walked and its templates become client recommendations. A `flat_if_then` table is Learn-mode reference and is never walked — and the two look identical on screen.' },
  { key: 'distinction', title: 'Advisory distinctions', note: 'A distinction adds its `boost` straight to a template score, so it moves recommendations by design.' },
  { key: 'domain-support', title: 'Domain support documents', note: 'These BRIEF the AI on the client path. They do not pick templates (§0.6 ruling) — selection is the resolver, the logic tables and the distinctions, none of which read these files.' },
  { key: 'template', title: 'Library templates', note: 'Split by `includedInClient`, the flag the master export carries to say whether a page may be put in front of a client.' },
  { key: 'quiz-bank', title: 'Quiz banks', note: 'Required only by courseEngine.js. No require chain reaches them from the advisor engine or the template resolver, so a bank cannot move a recommendation.' }
]

/**
 * Data files present on disk that the classifier does not read.
 *
 * Derived rather than listed by hand, so a new data file shows up as an
 * acknowledged gap the moment it lands, instead of being silently absent.
 *
 * @returns {{uncovered: string[], devStores: number}}
 */
function findUncoveredFiles () {
  const all = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort()
  const devStores = all.filter(f => f.startsWith('dev-')).length

  const uncovered = all.filter(f =>
    !f.startsWith('dev-') &&
    !f.endsWith('-domain-support.json') &&
    !COVERED_FILES.includes(f)
  )

  return { uncovered, devStores }
}

const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|')

/**
 * Builds the full report.
 *
 * @returns {string} the markdown content of design/CONTENT-ROUTING.md
 */
function render () {
  const rows = classifyAllContent()
  const summary = summariseRouting(rows)
  const { uncovered, devStores } = findUncoveredFiles()

  const out = []

  out.push('# Content routing — what reaches a client recommendation')
  out.push('')
  out.push('> **GENERATED FILE — do not edit by hand.** Run `npm run routing` to rebuild it.')
  out.push('> The rules live in [`server/utils/contentRouting.js`](../server/utils/contentRouting.js),')
  out.push('> which the build guard also reads, so this report and the tests can never disagree.')
  out.push('')
  out.push('Content filed into the wrong lane is invisible: it renders, it saves, it passes tests,')
  out.push('and it silently never reaches the decision it was written for. That happened three times')
  out.push('in the week of 2026-07-30, and every one was found by a person reading code. This table')
  out.push('is how the next one gets noticed instead.')
  out.push('')

  const lane = k => summary.byLane[k] || 0
  out.push(`**${summary.total} content assets classified** — ` + [
    `${lane(LANES.CLIENT_RECOMMENDATION)} client-recommendation`,
    `${lane(LANES.AI_BRIEFING)} AI-briefing`,
    `${lane(LANES.ADVISOR_READ_ONLY)} advisor-read-only`,
    `**${lane(LANES.UNKNOWN)} unknown**`
  ].join(' · ') + '.')
  out.push('')

  if (summary.unknown.length > 0) {
    out.push('## ⚠ UNCLASSIFIED — treat as a defect')
    out.push('')
    out.push('An asset that cannot be placed is listed here rather than dropped from the count or')
    out.push('defaulted into a lane. Either the asset is malformed, or the classifier has not caught')
    out.push('up with a new shape.')
    out.push('')
    out.push('| Family | Asset | Why it could not be placed |')
    out.push('|---|---|---|')
    summary.unknown.forEach(r => out.push(`| ${esc(r.family)} | ${esc(r.name)} | ${esc(r.decidedBy)} |`))
    out.push('')
  }

  out.push('## What the lanes mean')
  out.push('')
  out.push('| Lane | Meaning |')
  out.push('|---|---|')
  ;[LANES.CLIENT_RECOMMENDATION, LANES.AI_BRIEFING, LANES.ADVISOR_READ_ONLY].forEach(l =>
    out.push(`| \`${l}\` | ${esc(LANE_DESCRIPTIONS[l])} |`))
  out.push('')
  out.push('A lane is **not** a quality mark. AI-briefing content is doing exactly its job by not')
  out.push('selecting templates.')
  out.push('')

  out.push('## By family')
  out.push('')
  out.push('| Family | Client recommendation | AI briefing | Advisor read-only | Unknown | Total |')
  out.push('|---|---|---|---|---|---|')
  FAMILIES.forEach(f => {
    const counts = summary.byFamily[f.key] || {}
    const n = k => counts[k] || 0
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    out.push(`| ${f.title} | ${n(LANES.CLIENT_RECOMMENDATION)} | ${n(LANES.AI_BRIEFING)} | ${n(LANES.ADVISOR_READ_ONLY)} | ${n(LANES.UNKNOWN)} | ${total} |`)
  })
  out.push('')

  FAMILIES.forEach(f => {
    const familyRows = rows.filter(r => r.family === f.key)
    if (familyRows.length === 0) { return }

    out.push(`## ${f.title}`)
    out.push('')
    out.push(f.note)
    out.push('')
    out.push('<details>')
    out.push(`<summary><strong>${familyRows.length} assets</strong> — click to expand</summary>`)
    out.push('')
    out.push('| Asset | Lane | Decided by | Evidence |')
    out.push('|---|---|---|---|')
    familyRows.forEach(r =>
      out.push(`| ${esc(r.name)} | \`${r.lane}\` | ${esc(r.decidedBy)} | ${esc(r.evidence)} |`))
    out.push('')
    out.push('</details>')
    out.push('')
  })

  out.push('## What this map does not cover')
  out.push('')
  out.push('Stated rather than left to be inferred — an audit that hides its own edges is worse than')
  out.push('no audit, because it reads as complete.')
  out.push('')
  out.push(`- **${uncovered.length} data files are not classified.** They are listed below by name.`)
  out.push('  This list is DERIVED from what is on disk, not typed out, so a new data file appears')
  out.push('  here by itself rather than waiting for someone to remember it.')
  out.push('')
  uncovered.forEach(f => out.push(`  - \`data/${f}\``))
  out.push('')
  out.push('- **Only the PLATFORM layer is classified.** A firm\'s overrides and its own added rows')
  out.push('  are resolved at runtime and are not on disk to be read here, so a firm-authored asset')
  out.push('  does not appear. The lane its platform equivalent sits in still applies.')
  out.push(`  (${devStores} \`dev-*.json\` files are the dev-mode override stores and are excluded for`)
  out.push('  the same reason.)')
  out.push('')
  out.push('- **A lane says where an asset can reach, not whether it is any good.** This report')
  out.push('  cannot tell you a logic table is well written, only that the engine walks it.')
  out.push('')

  return out.join('\n')
}

if (require.main === module) {
  const content = render()
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8')
  const s = summariseRouting()
  process.stdout.write(
    `Wrote design/CONTENT-ROUTING.md — ${s.total} assets, ${s.unknown.length} unclassified.\n`
  )
}

module.exports = { render, findUncoveredFiles, COVERED_FILES, FAMILIES }

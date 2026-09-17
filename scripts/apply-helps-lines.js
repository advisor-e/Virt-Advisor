'use strict'

/**
 * Item 15.3 — applies the "Helps Your Client To…" lines Mike has approved.
 *
 *   npm run helps-lines            report what is approved and what is waiting
 *   npm run helps-lines -- --apply write the approved lines into the data
 *
 * 🔴 WHY A COMMAND AND NOT A PAIR OF HANDS. Eighteen sentences retyped is eighteen chances
 * to introduce a difference nobody notices, and a concept whose wording has quietly drifted
 * from what Mike approved is the exact failure the Strategy Planner exists to end — ADV.0
 * drifted four concepts and a page offset out of step with the decks it indexes by being
 * precisely that kind of copy. This moves the text character for character.
 *
 * 🔴 WHY THE DRAFTS LIVE IN design/AGENDA-HELPS-LINES.md AND NOWHERE ELSE. Decision B, as
 * Mike amended it on 2026-09-17, lets AI draft these lines for him to edit and approve. The
 * principle the original ruling protects is untouched: once an AI-written sentence sits in
 * the `helpsClientTo` field it is indistinguishable from the 34 he wrote. So an unapproved
 * line is never in the data file at all — not behind a flag, not in a second field. It is
 * structurally impossible for one to reach a screen, rather than merely unlikely.
 *
 * WHAT IT REFUSES TO DO:
 *   - write a row whose Approve cell is not "yes";
 *   - write a row naming a concept that does not exist;
 *   - overwrite a concept that ALREADY has a line, which would be silently replacing
 *     Mike's own words with a draft;
 *   - write an empty draft.
 * Any one of those stops the whole run. A partial apply is worse than none: some lines in,
 * some lost, and nothing saying which.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PAGE_FILE = path.join(ROOT, 'design', 'AGENDA-HELPS-LINES.md')
const DATA_FILE = path.join(ROOT, 'data', 'strategy-frameworks.json')

/** The heading the applied-lines record sits under. */
const RECORD_HEADING = '## What has been applied'

/**
 * Every data row of every table on the page.
 *
 * The page is hand-edited by Mike, so the parse is deliberately forgiving about spacing and
 * strict about shape: a row that does not have the five cells is not a row.
 *
 * @param {string} markdown the whole page
 * @returns {Array<{approve: string, id: string, draft: string, line: number}>}
 */
function parseRows (markdown) {
  const out = []
  markdown.split(/\r?\n/).forEach(function (text, index) {
    if (text.trim().indexOf('|') !== 0) { return }
    // Leading and trailing pipes produce empty first and last cells; drop them.
    const cells = text.split('|').slice(1, -1).map(c => c.trim())
    if (cells.length !== 4) { return }
    // The header and its underline are not rows.
    if (/^-+$/.test(cells[1]) || cells[1] === 'Concept') { return }

    const idMatch = cells[1].match(/`([a-z0-9-]+)`/)
    if (!idMatch) { return }
    out.push({
      approve: cells[0].toLowerCase(),
      id: idMatch[1],
      draft: cells[2],
      line: index + 1
    })
  })
  return out
}

/**
 * @param {object[]} rows every parsed row
 * @param {object[]} concepts the authored concepts
 * @returns {{approved: object[], waiting: object[], problems: string[]}}
 */
function sort (rows, concepts) {
  const byId = {}
  concepts.forEach(function (c) { byId[c.id] = c })

  const approved = []
  const waiting = []
  const problems = []

  rows.forEach(function (row) {
    const concept = byId[row.id]
    if (!concept) {
      problems.push('line ' + row.line + ': "' + row.id + '" is not a concept in ' +
        'data/strategy-frameworks.json. Check the id against the menu.')
      return
    }
    if (row.approve !== 'yes') {
      waiting.push(row)
      return
    }
    if (!row.draft) {
      problems.push('line ' + row.line + ': "' + row.id + '" is approved but its draft ' +
        'is empty. Write the line, or clear the Approve cell.')
      return
    }
    // 🔴 The guard that matters. A concept with a line already has MIKE'S line — every one
    // of the 34 was read off his decks. Replacing it from this page would be a draft
    // overwriting his own words, silently.
    if (concept.helpsClientTo) {
      problems.push('line ' + row.line + ': "' + row.id + '" already carries a line — "' +
        String(concept.helpsClientTo).slice(0, 60) + '…". This page never overwrites one. ' +
        'Remove the row, or edit the data file deliberately.')
      return
    }
    approved.push({ row, concept })
  })

  return { approved, waiting, problems }
}

/**
 * Writes the approved lines into the data file, preserving its formatting everywhere else.
 * @param {object[]} approved
 * @returns {number} how many were written
 */
function applyToData (approved) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const byId = {}
  ;(data.concepts || []).forEach(function (c) { byId[c.id] = c })

  approved.forEach(function (item) {
    byId[item.row.id].helpsClientTo = item.row.draft
  })

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
  return approved.length
}

/**
 * Removes the applied rows from the page and records them under the closing heading, so the
 * page is both the workspace and the record of what was approved when.
 * @param {string} markdown
 * @param {object[]} approved
 * @returns {string}
 */
function rewritePage (markdown, approved) {
  const ids = approved.map(a => a.row.id)
  const kept = markdown.split(/\r?\n/).filter(function (text) {
    if (text.trim().indexOf('|') !== 0) { return true }
    const found = text.match(/`([a-z0-9-]+)`/)
    return !(found && ids.indexOf(found[1]) !== -1)
  })

  const today = new Date().toISOString().slice(0, 10)
  const record = approved.map(function (item) {
    return '- **' + today + '** · `' + item.row.id + '` — "' + item.row.draft + '"'
  })

  const at = kept.findIndex(t => t.trim() === RECORD_HEADING)
  if (at === -1) {
    return kept.concat(['', RECORD_HEADING, ''], record, ['']).join('\n')
  }
  // Drop the "Nothing yet" placeholder the first time something is applied.
  const rest = kept.slice(at + 1).filter(t => t.indexOf('*Nothing yet.*') === -1)
  return kept.slice(0, at + 1).concat([''], record, rest).join('\n')
}

function main () {
  if (!fs.existsSync(PAGE_FILE)) {
    console.error('design/AGENDA-HELPS-LINES.md does not exist. Nothing to apply.')
    process.exit(1)
  }

  const markdown = fs.readFileSync(PAGE_FILE, 'utf8')
  const concepts = (JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).concepts || [])
  const rows = parseRows(markdown)
  const { approved, waiting, problems } = sort(rows, concepts)

  if (problems.length) {
    console.error('\nNothing was written. Fix these first:\n')
    problems.forEach(p => console.error('  ✗ ' + p))
    console.error('')
    process.exit(1)
  }

  console.log('')
  console.log('  ' + rows.length + ' drafted line(s) on the page.')
  console.log('  ' + approved.length + ' approved, ' + waiting.length + ' waiting on Mike.')

  if (!approved.length) {
    console.log('')
    console.log('  Nothing to apply. Put "yes" in the Approve column on the rows you want.')
    console.log('')
    return
  }

  if (process.argv.indexOf('--apply') === -1) {
    console.log('')
    approved.forEach(function (item) {
      console.log('  → ' + item.row.id)
      console.log('      "' + item.row.draft + '"')
    })
    console.log('')
    console.log('  Nothing written yet. Run `npm run helps-lines -- --apply` to write these.')
    console.log('')
    return
  }

  applyToData(approved)
  fs.writeFileSync(PAGE_FILE, rewritePage(markdown, approved), 'utf8')
  console.log('')
  console.log('  ✔ ' + approved.length + ' line(s) written to data/strategy-frameworks.json')
  console.log('    and recorded on design/AGENDA-HELPS-LINES.md.')
  console.log('')
}

if (require.main === module) { main() }

module.exports = { parseRows, sort, rewritePage }

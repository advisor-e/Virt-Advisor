'use strict'

/**
 * Generates design/STATUS.md — the front door to the backlog.
 *
 * Why this exists. design/ACTIONS.md is the canonical record and is genuinely
 * valuable: it holds the reasoning, the evidence, and the rulings behind every
 * task. It is also 1,100+ lines of prose, two thirds of it already completed
 * work, with single entries over 6,000 characters. Everything is in there and
 * nothing can be SEEN. On 2026-07-31 Mike asked for a clear table of every
 * outstanding task, and for completed work to stay visible — collapsed at the
 * bottom and marked as done — so that a task is never repeated, and so that a
 * new task resembling an old one can be traced back to the code that solved it.
 *
 * It is GENERATED, never hand-maintained. A hand-typed status table is wrong the
 * first time anyone edits ACTIONS.md and then quietly misleads everyone who
 * trusts it. ACTIONS.md stays the single source of truth; this is a view of it.
 *
 * Run: npm run status
 *
 * HONEST LIMITS, stated here and in the generated file rather than hidden:
 *  - It reads the FIRST line of each item. Detail that lives further down an
 *    entry is not summarised — the link is there to take you to it.
 *  - An item with no status marker cannot be placed and is counted in the
 *    "unparsed" figure rather than dropped. Silent omission is the one thing a
 *    status table must never do.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const ACTIONS_PATH = path.join(ROOT, 'design', 'ACTIONS.md')
const OUTPUT_PATH = path.join(ROOT, 'design', 'STATUS.md')

/** Status markers used in ACTIONS.md, mapped to what they mean in the table. */
const STATUS = {
  '☐': { key: 'open', label: 'Open', done: false, order: 1 },
  '◐': { key: 'in-progress', label: 'In progress', done: false, order: 0 },
  '🔒': { key: 'blocked', label: 'Blocked', done: false, order: 2 },
  '⛔': { key: 'blocked', label: 'Blocked', done: false, order: 2 },
  '✅': { key: 'done', label: 'Done', done: true, order: 3 },
  '☑': { key: 'done', label: 'Done', done: true, order: 3 }
}

const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2, '—': 3 }

/**
 * Turns one raw ACTIONS.md line into a table row, or null if it carries no
 * status marker.
 *
 * @param {string} raw - the line as written
 * @param {number} lineNo - 1-indexed line number, used for the deep link
 * @param {string} section - the `##` heading this line sits under
 * @param {string} [continuation] - the entry's wrapped remainder, so a title is
 *   not cut off mid-sentence purely because of where the line happened to wrap
 * @returns {Object|null}
 */
function parseItem (raw, lineNo, section, continuation) {
  const listMatch = raw.match(/^(\s*)-\s+(.*)$/)
  if (!listMatch) { return null }

  const depth = Math.floor(listMatch[1].length / 2)
  let text = listMatch[2]

  // Pull the HTML anchor out first so it does not end up in the title.
  const anchorMatch = text.match(/^<a id="([^"]+)"><\/a>\s*/)
  const anchor = anchorMatch ? anchorMatch[1] : null
  if (anchorMatch) { text = text.slice(anchorMatch[0].length) }

  // Most entries read `☐ **P1 · …`, but a handful open the bold first —
  // `**✅ Done 2026-06-29 …`. Both are the same thing; missing the second shape
  // silently under-counts completed work, which is exactly what this table is
  // meant to make impossible.
  const boldFirst = text.indexOf('**') === 0
  if (boldFirst) { text = text.slice(2) }

  const marker = Object.keys(STATUS).find(m => text.indexOf(m) === 0)
  if (!marker) { return null }
  text = text.slice(marker.length).trim()

  // Priority and type ride in the bold prefix, e.g. "**P1 · SEC/FIX — ...".
  const cleaned = (text + (continuation ? ' ' + continuation : ''))
    .replace(/\*\*/g, '').replace(/`/g, '').trim()
  const priorityMatch = cleaned.match(/\bP([123])\b/)
  const typeMatch = cleaned.match(/\bP[123]\s*·\s*([A-Z][A-Z/+-]*(?:\s*·\s*[A-Z][A-Z/+-]*)*)/)

  return {
    depth,
    anchor,
    lineNo,
    section,
    status: STATUS[marker],
    priority: priorityMatch ? `P${priorityMatch[1]}` : '—',
    type: typeMatch ? typeMatch[1].trim() : '—',
    title: summarise(cleaned)
  }
}

/**
 * Reduces an entry's opening line to something readable in a table cell.
 * Entries run to thousands of characters; the link carries the detail.
 *
 * @param {string} cleaned - the line with markdown emphasis already stripped
 * @returns {string}
 */
function summarise (cleaned) {
  let title = cleaned
    .replace(/\bP[123]\s*·\s*[A-Z][A-Z/+-]*(?:\s*·\s*[A-Z][A-Z/+-]*)*\s*[—–-]\s*/, '')
    .replace(/^\s*[—–-]\s*/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links → their text
    .replace(/\|/g, '\\|') // a pipe would break the table row
    .replace(/\s+/g, ' ')
    .trim()

  // Cut at a sentence end only. Colons and semicolons were tried first and read
  // badly — "(ruled: INJECT)" and "routing map: which material…" both lost their
  // point at the punctuation mark.
  const stop = title.search(/\.(\s|$)/)
  if (stop > 20 && stop < 150) { title = title.slice(0, stop) }
  if (title.length > 150) { title = title.slice(0, 147).trim() + '…' }

  return title || '(untitled)'
}

/**
 * Reads ACTIONS.md and returns every status-bearing item plus the count of list
 * lines that carried no marker.
 *
 * @returns {{items: Array<Object>, unparsed: number, totalLines: number}}
 */
function collectItems () {
  // Split on either ending: ACTIONS.md is CRLF on disk, and a trailing \r is a
  // line terminator to a JS regex, so `(.*)$` would never match a single line.
  const lines = fs.readFileSync(ACTIONS_PATH, 'utf8').split(/\r?\n/)
  const items = []
  let section = '(top of file)'
  let unparsed = 0

  lines.forEach((raw, index) => {
    const heading = raw.match(/^##\s+(.*)$/)
    if (heading) {
      section = heading[1].replace(/[*`]/g, '').trim()
      return
    }
    // Gather the entry's wrapped remainder — the lines after it that are neither
    // a new list item, a heading, nor a blank. Without this the title is cut
    // wherever the author's line happened to wrap, which reads as a truncation
    // bug even though nothing is missing.
    let continuation = ''
    for (let j = index + 1; j < lines.length && continuation.length < 400; j += 1) {
      const next = lines[j]
      if (!next.trim() || /^\s*-\s/.test(next) || /^#/.test(next)) { break }
      continuation += (continuation ? ' ' : '') + next.trim()
    }

    const item = parseItem(raw, index + 1, section, continuation)
    if (item) { items.push(item) } else if (/^\s*-\s+\S/.test(raw)) { unparsed += 1 }
  })

  return { items, unparsed, totalLines: lines.length }
}

/**
 * Sorts outstanding work the way it should be worked: in progress first, then
 * open, then blocked; within each, by priority.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function sortOutstanding (items) {
  return items.slice().sort((a, b) => {
    if (a.status.order !== b.status.order) { return a.status.order - b.status.order }
    const pa = PRIORITY_ORDER[a.priority]
    const pb = PRIORITY_ORDER[b.priority]
    if (pa !== pb) { return pa - pb }
    return a.lineNo - b.lineNo
  })
}

/**
 * Renders one markdown table row.
 *
 * @param {Object} item
 * @param {boolean} showStatus - completed rows do not need a status column
 * @returns {string}
 */
function row (item, showStatus) {
  const link = `[open](ACTIONS.md#L${item.lineNo})`
  const nested = item.depth > 0 ? '↳ ' : ''
  const cells = [item.priority, item.type]
  if (showStatus) { cells.push(item.status.label) }
  cells.push(nested + item.title, item.section, link)
  return `| ${cells.join(' | ')} |`
}

/**
 * Builds the whole STATUS.md document.
 *
 * @returns {string}
 */
function render () {
  const { items, unparsed, totalLines } = collectItems()
  const outstanding = sortOutstanding(items.filter(i => !i.status.done))
  const done = items.filter(i => i.status.done)

  const counts = outstanding.reduce((acc, i) => {
    acc[i.status.key] = (acc[i.status.key] || 0) + 1
    return acc
  }, {})

  const out = []

  out.push('# Status — every task in the app, at a glance')
  out.push('')
  out.push('> **GENERATED FILE — do not edit by hand.** Run `npm run status` to rebuild it.')
  out.push('> The source of truth is [`ACTIONS.md`](ACTIONS.md); this is a view of it. Every')
  out.push('> row links back to the full entry, where the reasoning and evidence live.')
  out.push('')
  out.push(`**${outstanding.length} outstanding** — ` +
    `${counts['in-progress'] || 0} in progress · ${counts.open || 0} open · ${counts.blocked || 0} blocked. ` +
    `**${done.length} completed** (listed at the bottom).`)
  out.push('')
  out.push('Completed work is kept here on purpose: so a task is never done twice, and so a new')
  out.push('task that resembles an old one can be traced back to the code that solved it.')
  out.push('')

  out.push('## Outstanding')
  out.push('')
  out.push('| Priority | Type | Status | Task | Section | |')
  out.push('|---|---|---|---|---|---|')
  outstanding.forEach(i => out.push(row(i, true)))
  out.push('')

  out.push('## Completed')
  out.push('')
  out.push('<details>')
  out.push(`<summary><strong>${done.length} completed tasks</strong> — click to expand</summary>`)
  out.push('')
  out.push('| Priority | Type | Task | Section | |')
  out.push('|---|---|---|---|---|')
  done.forEach(i => out.push(row(i, false)))
  out.push('')
  out.push('</details>')
  out.push('')

  out.push('## What this table does not tell you')
  out.push('')
  out.push(`- It reads the **first line** of each entry. \`ACTIONS.md\` is ${totalLines} lines and single`)
  out.push('  entries run past 6,000 characters — the detail, the evidence and the rulings are in')
  out.push('  there, not here. Follow the link.')
  out.push(`- **${unparsed} list lines carry no status marker** and are therefore not rows above. They are`)
  out.push('  sub-points inside entries, not tasks — but they are counted here rather than dropped,')
  out.push('  so the difference between "no tasks" and "not parsed" is always visible.')
  out.push('- A row marked Done reflects what the entry says. It is not independent proof the work')
  out.push('  shipped; the linked entry names the commit and the tests.')
  out.push('')

  return out.join('\n')
}

if (require.main === module) {
  const content = render()
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8')
  const { items } = collectItems()
  const outstanding = items.filter(i => !i.status.done).length
  process.stdout.write(
    `Wrote design/STATUS.md — ${outstanding} outstanding, ${items.length - outstanding} completed.\n`
  )
}

module.exports = { collectItems, parseItem, summarise, render }

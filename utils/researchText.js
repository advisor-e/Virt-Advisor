'use strict'

/**
 * @file Turns the Economic Analysis research a model wrote into plain tokens a template
 *   can render — text, bold and link, and nothing else.
 * @module utils/researchText
 *
 * Item **4.66**. Extracted in slice 3, when the same text became due in two places: the
 * advisor's screen (`components/EconomicAnalysisStep.vue`) and the client's printed
 * funding pack (`components/EconomicAnalysisPack.vue`).
 *
 * 🔴 IT EXISTS SO THE TWO CANNOT DRIFT. The screen an advisor approves and the section a
 * lender reads must be the same text parsed the same way. Two copies of this parser would
 * mean a fix to one — a new emphasis shape, a citation the model wrote differently —
 * silently leaving the other rendering something else, and the one nobody looks at is the
 * printed one.
 *
 * ⚠ DELIBERATELY NOT A MARKDOWN RENDERER. It understands `**bold**` and `[text](url)`,
 * treats a `#`-prefixed line as a heading, groups bullet, numbered and `|` table lines into
 * lists and tables, and passes everything else through as text.
 * Anything it does not recognise appears literally, which is the safe direction to fail
 * for text a model wrote. Nothing here emits HTML, so neither caller needs `v-html` and
 * there is nothing to sanitise — a `[label](javascript:…)` in model output is a label and
 * a string, never a link (`CLAUDE.md` → Security & data integrity).
 *
 * Node 14, CommonJS.
 */

/**
 * Links first, then emphasis, in one pass.
 *
 * Matching them together rather than in two passes keeps a URL's own punctuation out of
 * the emphasis pass — a link whose address contains `**` would otherwise be split apart.
 */
const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g

/** A markdown heading line: one to six hashes and a space. */
const HEADING = /^#{1,6}\s/

/**
 * One paragraph into text / bold / link tokens.
 *
 * @param {string} text - one paragraph of the model's prose
 * @returns {Array<{t: string, s: string, url: string}>} `t` is 'text', 'bold' or 'link'
 */
function tokensOf (text) {
  const source = String(text || '')
  const tokens = []
  let cursor = 0
  let m

  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(source)) !== null) {
    if (m.index > cursor) {
      tokens.push({ t: 'text', s: source.slice(cursor, m.index), url: '' })
    }
    if (m[2]) {
      tokens.push({ t: 'link', s: m[1], url: m[2] })
    } else {
      tokens.push({ t: 'bold', s: m[3], url: '' })
    }
    cursor = m.index + m[0].length
  }
  if (cursor < source.length) {
    tokens.push({ t: 'text', s: source.slice(cursor), url: '' })
  }
  return tokens
}

/** A bullet line (`- ` or `* `), and a numbered one (`1. `). */
const BULLET = /^[-*]\s+/
const NUMBERED = /^\d+[.)]\s+/
/** A table row: starts with a pipe. Its divider row is pipes, dashes, colons and spaces only. */
const TABLE_ROW = /^\|/
const TABLE_DIVIDER = /^\|[\s:|-]+\|?$/

/** What one line of a block is, so a block that mixes them is split where they change. */
function kindOf (line) {
  if (HEADING.test(line)) { return 'heading' }
  if (TABLE_ROW.test(line)) { return 'table' }
  if (BULLET.test(line)) { return 'bullet' }
  if (NUMBERED.test(line)) { return 'numbered' }
  return 'text'
}

/** One table row's cells, each as tokens. @param {string} line @returns {Array<Array<object>>} */
function cellsOf (line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => tokensOf(c.trim()))
}

/**
 * A run of table lines into a head row and body rows. The divider row is dropped; a table
 * the model wrote without one has its first row as the head all the same.
 * @param {Array<string>} lines @returns {{head: Array, rows: Array}}
 */
function tableOf (lines) {
  const rows = lines.filter(l => !TABLE_DIVIDER.test(l.trim())).map(cellsOf)
  return { head: rows[0] || [], rows: rows.slice(1) }
}

/**
 * Splits one section's body into blocks of plain tokens: a paragraph or heading
 * (`{ heading, tokens }`), a list (`list` — one token run per item, `ordered` for a
 * numbered one), or a table (`table` — `{ head, rows }`, each cell a token run). A
 * paragraph keeps exactly the shape it always had; lists and tables were printed as one
 * run-on paragraph of pipes and dashes before 2026-09-30.
 *
 * @param {string} body - one section of the validated research
 * @returns {Array<{heading: boolean, tokens: Array<{t: string, s: string, url: string}>, list?: Array, ordered?: boolean, table?: object}>}
 */
function paragraphsOf (body) {
  const blocks = String(body || '').split(/\n{2,}/)
  const out = []
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    let i = 0
    while (i < lines.length) {
      const kind = kindOf(lines[i])
      if (kind === 'heading') {
        out.push({ heading: true, tokens: tokensOf(lines[i].replace(/^#{1,6}\s*/, '')) })
        i++
        continue
      }
      // Consecutive lines of the same kind form one block. A list item's own wrapped
      // continuation line (plain text) stays with its item.
      const run = [lines[i]]
      i++
      while (i < lines.length) {
        const next = kindOf(lines[i])
        if (next === kind) { run.push(lines[i]) } else if (next === 'text' && (kind === 'bullet' || kind === 'numbered')) {
          run[run.length - 1] += ' ' + lines[i]
        } else { break }
        i++
      }
      if (kind === 'table') {
        out.push({ heading: false, tokens: [], table: tableOf(run) })
      } else if (kind === 'bullet' || kind === 'numbered') {
        const marker = kind === 'bullet' ? BULLET : NUMBERED
        out.push({ heading: false, tokens: [], ordered: kind === 'numbered', list: run.map(l => tokensOf(l.replace(marker, ''))) })
      } else {
        out.push({ heading: false, tokens: tokensOf(run.join(' ')) })
      }
    }
  }
  return out
}

/**
 * The host of a source URL, for the pills on screen.
 *
 * @param {string} url
 * @returns {string} the host without `www.`, or the whole string if it is not a URL
 */
function hostOf (url) {
  const match = /^https?:\/\/([^/?#]+)/i.exec(String(url || ''))
  return match ? match[1].replace(/^www\./i, '') : String(url || '')
}

module.exports = { tokensOf, paragraphsOf, hostOf }

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
 * treats a `#`-prefixed line as a heading, and passes everything else through as text.
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

/**
 * Splits one section's body into paragraphs of plain tokens.
 *
 * @param {string} body - one section of the validated research
 * @returns {Array<{heading: boolean, tokens: Array<{t: string, s: string, url: string}>}>}
 */
function paragraphsOf (body) {
  const blocks = String(body || '').split(/\n{2,}/)
  const out = []
  for (const block of blocks) {
    const raw = block.trim()
    if (!raw) { continue }
    const heading = HEADING.test(raw)
    const text = heading ? raw.replace(/^#{1,6}\s*/, '') : raw
    out.push({ heading, tokens: tokensOf(text.split('\n').join(' ')) })
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

'use strict'

/**
 * @file Validates the Economic Analysis research a model returns, before any of it
 *   reaches a screen or a funding pack.
 * @module server/report/economicAnalysis/researchResult
 *
 * Item 4.66. Prompt artefact: `design/ECONOMIC-ANALYSIS-PROMPT.md`, approved with the
 * screens at `design/mockups/three-way-forecast-economic-analysis.html`. Evidence:
 * `design/ECONOMIC-ANALYSIS-TEST-RUNS.md`, four live runs.
 *
 * 🔴 THIS FILE IS THE RE-CHECK THE PROMPT FILE DEMANDS, MADE PERMANENT.
 *
 * Runs 1 to 3 each put a correct figure beside the WRONG source, every time inside a
 * restatement: §§1–3 introduce a figure and cite it properly, then §4 recalls two or
 * three figures under one citation and the wrong one sticks. Three attempts to instruct
 * the model out of it failed. Run 4 fixed it structurally — §4 may no longer restate a
 * figure at all — and came back with zero figures and zero citations in §4 while §§1–3
 * improved.
 *
 * That fix rests on a SINGLE RUN, and the prompt file says in terms that it "must be
 * re-checked when the feature is built". Checking it once by eye would answer for one
 * run and nothing after it. So the rule is enforced here instead: every run, for as long
 * as the feature exists.
 *
 * ⚠ WHAT THIS CANNOT DO, stated plainly because the prompt file states it. A
 * `url_citation` records where the model PUT a citation, so a citation attached to the
 * wrong source arrives inside the annotation and no downstream check can see it. This
 * file cannot verify that a citation is CORRECT. What it can do is refuse the shape in
 * which every observed misattribution occurred — a figure in §4 that already appeared in
 * §§1–3 — and that is a different and weaker claim, deliberately.
 *
 * 🔴 IT DOES NOT FORBID FIGURES IN §4 OUTRIGHT, because the approved prompt does not.
 * §6 permits a genuinely new figure there "with its own source and date like any other".
 * A check that rejected every §4 figure would be stricter than the artefact it enforces,
 * which is its own kind of drift. New figures are allowed and must carry a citation;
 * repeated ones are refused.
 *
 * Node 14, CommonJS. No LLM output is trusted as structured data: everything below is
 * parsed and shape-checked before it is returned (CLAUDE.md → Security & data integrity).
 */

/** The five sections the prompt's §6 requires, in order. */
const SECTION_COUNT = 5

/** Sections that must each carry at least one citation — the evidence sections. */
const EVIDENCE_SECTIONS = [1, 2, 3]

/** The synthesis section, whose restatements were the fault runs 1–3 exposed. */
const SYNTHESIS_SECTION = 4

/** Below this many distinct sources, §3 of the prompt ("a single source is a data point,
 *  not an outlook") has not been met well enough to put in front of a lender. The four
 *  test runs returned 12, 22, 20 and 30. */
const MIN_UNIQUE_SOURCES = 5

/**
 * A section heading: optional markdown hashes or bold markers, the section number, a
 * separator, then text. Matches the shapes all four test runs produced
 * (`#### 1. Global economic outlook`, `## 1 · …`, `**1. …**`).
 */
const HEADING = /^[ \t]{0,3}(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*([1-5])[ \t]*[.)·:–-][ \t]+\S/

/**
 * Date expressions, removed before figures are extracted.
 *
 * ⚠ THIS IS NOT TIDYING — IT IS WHAT STOPS A FALSE ACCUSATION. Run 4's §4 opens on an
 * assessment period, and §1 gives the same date. Counting `2026` or the `6` of
 * "6 September" as a figure would report a restatement that is not one, and a check that
 * cries wolf gets switched off.
 */
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const DATE_PATTERNS = [
  new RegExp('\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:' + MONTHS + ')\\s+\\d{4}\\b', 'gi'),
  new RegExp('\\b(?:' + MONTHS + ')\\s+\\d{4}\\b', 'gi'),
  new RegExp('\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:' + MONTHS + ')\\b', 'gi'),
  /\bQ[1-4]\s*\d{4}\b/gi
]

/**
 * A markdown link, and a bare web address. Removed before figures are extracted.
 *
 * 🔴 THIS IS WHAT STOPS A RE-CITED SOURCE BEING READ AS A RESTATED FIGURE, and it was
 * found the only way it could be — by watching live runs, on 2026-09-07.
 *
 * Official statistics pages carry ids in their addresses (`/dmsdocument/10808-…`,
 * `/Uploads/3000820/…`). The model's text carries those addresses inline, because
 * `utils/researchText.js` parses `[label](url)` to render a citation. So a model that
 * returns in §4 to a source it used in §§1–3 — which §3 of the prompt asks it to do —
 * repeats those digits, and the restatement check refused the whole document. Two live
 * runs were refused naming `3000820`, `10808` and `2026`: two document ids and a year,
 * and not one economic figure among them.
 *
 * ⚠ THE LABEL IS KEPT, THE ADDRESS IS NOT. A figure a lender reads can appear in the
 * label (`[1.9% rise](…)`); one inside an address never is.
 */
const MARKDOWN_LINK = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g
const BARE_URL = /https?:\/\/\S+/g

/**
 * Removes web addresses, keeping any link's visible label.
 *
 * @param {string} text
 * @returns {string}
 */
function stripUrls (text) {
  return String(text).replace(MARKDOWN_LINK, ' $1 ').replace(BARE_URL, ' ')
}

/**
 * A bare four-digit year, with the span around it so its context can be read.
 * Applied after DATE_PATTERNS — see `stripBareYears`.
 *
 * ⚠ NO `\b` AT EITHER END, DELIBERATELY. A word boundary needs a non-word character, so
 * `FY2026` and `2026Q2` — both of which a model writes — slipped through it and were
 * counted as the figure `2026`. A live run on 2026-09-07 was refused naming exactly that.
 * The two edges are checked in `stripBareYears` instead, against digits rather than
 * letters, which is what "part of a longer number" actually means.
 */
const BARE_YEAR = /([£$€¥₹]?\s*)((?:19|20)\d{2})(\s*%?)/g

/**
 * Removes bare years, but never a figure that merely looks like one.
 *
 * ⚠ THE ORDER OF THESE TWO RULES IS LOAD-BEARING, and it was wrong first time. A blanket
 * "1900–2100 is a year" wipes `€1,902` — the average premium run 4 actually reported — and
 * with it the restatement check on any amount in that range. So a currency mark or a
 * percent sign beside the number wins: it is a figure, not a date.
 *
 * @param {string} text
 * @returns {string}
 */
function stripBareYears (text) {
  return String(text).replace(BARE_YEAR, (match, pre, year, post, offset, whole) => {
    if (/[£$€¥₹%]/.test(match)) { return match }
    // Digits either side mean this is part of a longer number (`12026`, `1.2026`), not a
    // year. Letters either side do not — that is `FY2026`, which is.
    const before = whole.charAt(offset + pre.length - 1)
    const after = whole.charAt(offset + pre.length + year.length)
    if (/[\d.,]/.test(before) || /\d/.test(after)) { return match }
    return ' '
  })
}

/** A number as it appears in prose, with its thousands separators and decimals. */
const FIGURE = /\d[\d,]*(?:\.\d+)?/g

/** A figure is "substantive" — the kind a lender reads — at or above this, when it is a
 *  bare integer carrying no percent sign, currency mark, decimal point or separator. */
const LARGE_INTEGER = 100

/**
 * Pulls the assistant's text and its citations out of a /v1/responses response.
 *
 * @param {object} response - a parsed Responses API response
 * @returns {{text: string, citations: Array.<{url: string, title: string, start: number, end: number}>}}
 */
function extractText (response) {
  const out = { text: '', citations: [] }
  const items = (response && response.output) || []
  if (!Array.isArray(items)) { return out }

  const pieces = []
  let offset = 0

  for (const item of items) {
    if (!item || item.type !== 'message') { continue }
    const content = Array.isArray(item.content) ? item.content : []
    for (const part of content) {
      if (!part || part.type !== 'output_text' || typeof part.text !== 'string') { continue }

      // Annotation indices are relative to their own part, so they are shifted by
      // everything already concatenated. Getting this wrong would file every citation
      // into the wrong section, which is precisely the fault being guarded against.
      const annotations = Array.isArray(part.annotations) ? part.annotations : []
      for (const a of annotations) {
        if (!a || a.type !== 'url_citation' || typeof a.url !== 'string' || !a.url) { continue }
        const start = typeof a.start_index === 'number' ? a.start_index : 0
        const end = typeof a.end_index === 'number' ? a.end_index : start
        out.citations.push({
          url: a.url,
          title: typeof a.title === 'string' ? a.title : '',
          start: offset + start,
          end: offset + end
        })
      }

      pieces.push(part.text)
      offset += part.text.length
    }
  }

  out.text = pieces.join('')
  return out
}

/**
 * Locates the five sections in the text.
 *
 * Headings are taken in ascending order only: a "4." appearing inside §2's prose cannot
 * open §4, because §3 has not been seen yet. That is what makes this robust to a model
 * that numbers a list mid-paragraph.
 *
 * @param {string} text
 * @returns {Array.<{n: number, start: number, end: number, body: string}>} found sections, in order
 */
function findSections (text) {
  const found = []
  let expected = 1
  let index = 0

  const lines = String(text || '').split('\n')
  for (const line of lines) {
    const match = expected <= SECTION_COUNT ? HEADING.exec(line) : null
    if (match && Number(match[1]) === expected) {
      found.push({ n: expected, start: index })
      expected += 1
    }
    index += line.length + 1
  }

  return found.map((s, i) => {
    const end = i + 1 < found.length ? found[i + 1].start : text.length
    return { n: s.n, start: s.start, end, body: text.slice(s.start, end) }
  })
}

/**
 * The figures in a piece of text that a lender would read as figures.
 *
 * Dates are removed first (see DATE_PATTERNS). What remains counts only if it carries a
 * percent sign, a currency mark, a decimal point or a thousands separator, or is an
 * integer of 100 or more — so "9 staff" and "two sites" are not figures, while "5.6%",
 * "€1,902" and "2,276" are.
 *
 * @param {string} text
 * @returns {string[]} normalised figure values, deduplicated
 */
function figuresIn (text) {
  let cleaned = stripUrls(text || '')
  for (const pattern of DATE_PATTERNS) { cleaned = cleaned.replace(pattern, ' ') }
  cleaned = stripBareYears(cleaned)

  const seen = Object.create(null)
  const values = []
  let match

  FIGURE.lastIndex = 0
  while ((match = FIGURE.exec(cleaned)) !== null) {
    const raw = match[0]
    const before = cleaned.slice(Math.max(0, match.index - 3), match.index)
    const after = cleaned.slice(match.index + raw.length, match.index + raw.length + 9)

    const hasPercent = /^\s*(?:%|per cent|percent)/i.test(after)
    const hasCurrency = /[£$€¥₹]\s*$/.test(before)
    const hasDecimal = raw.includes('.')
    const hasSeparator = raw.includes(',')
    const asNumber = Number(raw.split(',').join(''))
    const isLarge = isFinite(asNumber) && asNumber >= LARGE_INTEGER

    if (!hasPercent && !hasCurrency && !hasDecimal && !hasSeparator && !isLarge) { continue }

    const normalised = raw.split(',').join('')
    if (seen[normalised]) { continue }
    seen[normalised] = true
    values.push(normalised)
  }

  return values
}

/** Word count of a string, for the length steer the screen shows. */
function countWords (text) {
  const trimmed = String(text || '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** The host of a URL, for the source pills — falls back to the whole string. */
function hostOf (url) {
  const match = /^https?:\/\/([^/?#]+)/i.exec(String(url || ''))
  if (!match) { return String(url || '') }
  return match[1].replace(/^www\./i, '')
}

/** A refusal, in the shape every caller here expects. */
function reject (code, message, detail) {
  return { ok: false, error: { code, message, detail: detail || null }, data: null }
}

/**
 * Validates one research run and returns it in the shape a screen and a pack can use.
 *
 * @param {object} response - a parsed /v1/responses response
 * @returns {{ok: boolean, error: (object|null), data: (object|null)}} On success `data` is
 *   `{ text, wordCount, sections: [{n, body, wordCount, citations}], sources: [{url, host, title}],
 *     citationCount }`.
 */
function validateResearch (response) {
  const { text, citations } = extractText(response)

  if (!text.trim()) {
    return reject('RESEARCH_EMPTY',
      'The research came back empty. Nothing has been saved — run it again.')
  }

  const sections = findSections(text)
  if (sections.length !== SECTION_COUNT) {
    const missing = []
    for (let n = 1; n <= SECTION_COUNT; n++) {
      if (!sections.some(s => s.n === n)) { missing.push(n) }
    }
    return reject('SECTIONS_MISSING',
      'The research did not come back in the five sections it was asked for, so it cannot be shown or included.',
      { missing })
  }

  const byNumber = sections.reduce((out, s) => { out[s.n] = s; return out }, {})
  const citationsFor = s => citations.filter(c => c.start >= s.start && c.start < s.end)

  // §§1–3 are the evidence. A section of them with no citation at all has not sourced
  // anything, whatever it says — the prompt's §4 in one check.
  const unsourced = EVIDENCE_SECTIONS.filter(n => citationsFor(byNumber[n]).length === 0)
  if (unsourced.length) {
    return reject('SECTION_UNSOURCED',
      'Part of the research came back with no sources behind it, so it cannot be put in front of a lender.',
      { sections: unsourced })
  }

  // 🔴 THE RE-CHECK. Every figure must live exactly once, beside its own source.
  const synthesis = byNumber[SYNTHESIS_SECTION]
  const evidenceFigures = EVIDENCE_SECTIONS
    .reduce((all, n) => all.concat(figuresIn(byNumber[n].body)), [])
  const synthesisFigures = figuresIn(synthesis.body)

  const restated = synthesisFigures.filter(f => evidenceFigures.includes(f))
  if (restated.length) {
    return reject('SECTION_4_RESTATED',
      'The research repeated figures in its closing section instead of referring back to them. ' +
      'That is the one fault that puts a right number beside a wrong source, so it has been ' +
      'refused rather than shown. Run it again.',
      { figures: restated })
  }

  // A figure that IS new to §4 is allowed by the prompt, and must carry its own source.
  if (synthesisFigures.length && citationsFor(synthesis).length === 0) {
    return reject('SECTION_4_UNSOURCED',
      'The closing section introduced a figure with no source beside it.',
      { figures: synthesisFigures })
  }

  const sources = []
  const seenHost = Object.create(null)
  for (const c of citations) {
    if (seenHost[c.url]) { continue }
    seenHost[c.url] = true
    sources.push({ url: c.url, host: hostOf(c.url), title: c.title })
  }

  const uniqueHosts = sources.reduce((out, s) => {
    if (!out.includes(s.host)) { out.push(s.host) }
    return out
  }, [])

  if (uniqueHosts.length < MIN_UNIQUE_SOURCES) {
    return reject('TOO_FEW_SOURCES',
      'The research rested on too few sources to stand as an outlook.',
      { found: uniqueHosts.length, needed: MIN_UNIQUE_SOURCES })
  }

  return {
    ok: true,
    error: null,
    data: {
      text,
      wordCount: countWords(text),
      sections: sections.map(s => ({
        n: s.n,
        body: s.body,
        wordCount: countWords(s.body),
        citations: citationsFor(s).map(c => ({ url: c.url, host: hostOf(c.url), title: c.title }))
      })),
      sources,
      citationCount: citations.length
    }
  }
}

module.exports = {
  validateResearch,
  extractText,
  findSections,
  figuresIn,
  countWords,
  hostOf,
  SECTION_COUNT,
  EVIDENCE_SECTIONS,
  SYNTHESIS_SECTION,
  MIN_UNIQUE_SOURCES
}

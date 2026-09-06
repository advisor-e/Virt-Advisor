'use strict'

/**
 * @file The two Economic Analysis test runs, read from the committed evidence page and
 *   rebuilt into the shape the Responses API returns them in.
 * @module tests/fixtures/economicAnalysisRuns
 *
 * 🔴 THE TEXT IS NOT COPIED HERE, IT IS READ FROM `design/ECONOMIC-ANALYSIS-TEST-RUNS.md`.
 *
 * That page keeps run 1 and run 4 in full, and says why in its own words: the citation fix
 * "rests on this single run… that check needs something to check against", and re-running
 * the prompt would not reproduce it, because the web has moved on. Copying the text into a
 * fixture would make a second original that drifts from the first — one fact, one home.
 *
 * It also means the guard runs in both directions. If a later session "improves" run 4's
 * section 4 by putting the figures back — the one thing the page, the prompt file and the
 * mockup each warn against in red — the test that proves the fix works starts failing,
 * which is exactly what should happen.
 *
 * WHAT IS DROPPED, and why it is not cheating: blockquote lines and our own italic
 * annotations. Those are the page's editorial voice, not the model's — run 4's section 4
 * carries a `> ⚠ No figures. No citations.` note from us, and run 1's carries a line
 * explaining where its misfiled citation was. Leaving them in would test our commentary.
 * The page states which parts are the model's: "Bold figures, inline links and section
 * numbering are the model's."
 *
 * WHAT IS RECONSTRUCTED: the model's inline markdown links become `url_citation`
 * annotations at the position they occupy, which is what the API returns them as. The
 * indices land inside the same section either way, and section is all the validator asks.
 */

const fs = require('fs')
const path = require('path')

const SOURCE = path.join(__dirname, '..', '..', 'design', 'ECONOMIC-ANALYSIS-TEST-RUNS.md')

/** Our editorial lines, which are not the model's output. */
const EDITORIAL = /^\s*(?:>|⚠\s*\*|#{1,3}\s)/

/**
 * Pulls one "Run N in full" block out of the evidence page.
 *
 * @param {string} page
 * @param {number} n
 * @returns {string} the model's own text, editorial lines removed
 */
function extractRun (page, n) {
  const lines = page.split('\n')
  const startAt = lines.findIndex(l => new RegExp('^## Run ' + n + ' in full').test(l))
  if (startAt === -1) {
    throw new Error('design/ECONOMIC-ANALYSIS-TEST-RUNS.md no longer keeps run ' + n + ' in full')
  }

  const body = []
  for (let i = startAt + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^## /.test(line)) { break }
    if (EDITORIAL.test(line)) { continue }
    body.push(line)
  }

  return body.join('\n').trim()
}

/**
 * Turns the model's inline markdown links into text plus `url_citation` annotations.
 *
 * @param {string} markdown
 * @returns {{text: string, annotations: object[]}}
 */
function citationsFromLinks (markdown) {
  const annotations = []
  let text = ''
  let cursor = 0

  const link = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match

  while ((match = link.exec(markdown)) !== null) {
    text += markdown.slice(cursor, match.index)
    const start = text.length
    text += match[1]
    annotations.push({
      type: 'url_citation',
      url: match[2],
      title: match[1],
      start_index: start,
      end_index: text.length
    })
    cursor = match.index + match[0].length
  }

  text += markdown.slice(cursor)
  return { text, annotations }
}

/**
 * One run, in the shape `validateResearch` consumes.
 *
 * @param {number} n - 1 or 4
 * @returns {object} a /v1/responses-shaped response
 */
function loadRun (n) {
  const page = fs.readFileSync(SOURCE, 'utf8')
  const { text, annotations } = citationsFromLinks(extractRun(page, n))
  return {
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text, annotations }]
    }],
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
  }
}

/**
 * A response built from arbitrary text, for the shape cases the two real runs cannot
 * exercise. Citations are placed by searching for a marker in the text.
 *
 * @param {string} text
 * @param {Array.<{url: string, at: string}>} [cites] - `at` is a substring to anchor on
 * @returns {object}
 */
function responseFrom (text, cites) {
  const annotations = (cites || []).map((c) => {
    const start = text.indexOf(c.at)
    return {
      type: 'url_citation',
      url: c.url,
      title: c.title || c.url,
      start_index: start === -1 ? 0 : start,
      end_index: start === -1 ? 0 : start + c.at.length
    }
  })
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text, annotations }] }]
  }
}

module.exports = { loadRun, responseFrom, extractRun, citationsFromLinks, SOURCE }

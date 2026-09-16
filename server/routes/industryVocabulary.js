'use strict'

/**
 * The engine's industry vocabulary — the words the intake offers as the advisor types
 * (item 4.87 T022a, design/mockups/outcome-learning-intake-industry.html, approved by
 * Mike 2026-09-11). Ruled: the suggestions come from the WHOLE vocabulary, filtered on
 * the screen by what is typed, because it is exactly the list the outcome pool accepts
 * — a chip can never offer a word the pool would then drop, and there is no second list
 * to maintain.
 *
 * READ open to any signed-in firm user (`firmAuth`): the industry question is asked of
 * every advisor in a client session. Like /api/advisor/staircase, it never breaks the
 * session — on any failure it answers 200 with an empty list and the chat carries on
 * without chips, which is exactly what the screen shows when nothing matches.
 *
 * The list is the PLATFORM library's (the mentor's upload, else the seed), not a firm's,
 * for the same reason pool titles are: an adjustment is platform-wide. It is cached by
 * the library loader for a minute; recomputing 1,050 words from 291 titles is trivial.
 */

const { platformTemplates, industryVocabulary } = require('../utils/outcomeContribute')

/**
 * GET /api/advisor/industry-vocabulary  (firmAuth)
 *
 * @route GET /api/advisor/industry-vocabulary
 * @returns {{ words: string[] }} lowercase words, sorted, unique. Always 200.
 */
async function get (req, res) {
  try {
    const words = Array.from(industryVocabulary(await platformTemplates())).sort()
    res.send(200, { words })
  } catch (err) {
    console.error('[industry-vocabulary] read failed:', err.message)
    res.send(200, { words: [] })
  }
}

module.exports = { get }

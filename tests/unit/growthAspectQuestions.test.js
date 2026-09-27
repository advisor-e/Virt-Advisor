'use strict'

/**
 * MIKE'S 98 GROWTH ASPECT QUESTIONS, AS STORED — item 15.2.
 *
 * 🔴 WHY THIS EARNS ITS PLACE: UAT CANNOT SEE IT. A question dropped, moved to the wrong
 * aspect or reworded looks perfectly normal on screen — nobody in UAT holds the deck open
 * beside ninety-eight lines. The source, his "9 Growth Aspect Questions hyperlinked.pdf",
 * sits OUTSIDE the repository, so no test can re-read it. This pins what was read from it.
 *
 * 🔴 THE WORDING IS LOAD-BEARING, which is why it is pinned here and only here. The
 * questions are Mike's own and are shown word for word — Decision B of
 * `design/mockups/growth-aspect-questions.html` (ruled 2026-09-27): the AI never chooses or
 * writes a question. They were extracted twice by two different readers (pdftotext and
 * pdfjs) and agreed on all 98. A change to any of them should be a deliberate edit, and
 * this test failing is how it announces itself.
 *
 * The two descriptions pinned below are his rulings of the same day (Decision D): Process
 * Improvement gains "Systems Theory", Governance gains "Revenue Model" and not "Exit
 * Strategy". They reach the Virtual Advisor's prompt through server/utils/growth.js.
 */

const crypto = require('crypto')
const { growthAspects } = require('../../data/growth-fundamentals.json')

/** Per aspect, in the deck's order. */
const COUNTS = {
  'Process Improvement': 9,
  'Customer Focus': 9,
  'Sales (Process)': 8,
  Authenticity: 12,
  'Inventory & Equipment': 11,
  'Team Focus': 11,
  Innovation: 13,
  Governance: 14,
  'Harmony / Balance': 11
}

/** sha256 of every aspect's name and questions, in order, as extracted 2026-09-27. */
const FINGERPRINT = '8358c07b1c73f1f800320417ee3866b12369126720fd7ca38f7a9ce8a73bed64'

describe('the 98 Growth Aspect questions', () => {
  test('every aspect holds its own number of questions, 98 in all', () => {
    const counts = {}
    growthAspects.forEach((a) => { counts[a.name] = (a.questions || []).length })
    expect(counts).toEqual(COUNTS)
  })

  test('🔴 not one question has changed since they were read from the deck', () => {
    const now = crypto.createHash('sha256')
      .update(JSON.stringify(growthAspects.map(a => [a.name, a.questions])))
      .digest('hex')
    expect(now).toBe(FINGERPRINT)
  })

  test('no question is blank or repeated', () => {
    const all = growthAspects.flatMap(a => a.questions)
    all.forEach(q => expect(q.trim().length).toBeGreaterThan(10))
    expect(new Set(all).size).toBe(all.length)
  })

  test('the two descriptions carry Mike\'s rulings of 2026-09-27', () => {
    const d = name => growthAspects.find(a => a.name === name).description
    expect(d('Process Improvement')).toMatch(/Systems Theory\.$/)
    expect(d('Governance')).toMatch(/Risk Management, Revenue Model\.$/)
    expect(d('Governance')).not.toMatch(/Exit Strategy/)
  })
})

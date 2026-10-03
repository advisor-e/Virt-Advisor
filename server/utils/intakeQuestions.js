'use strict'

/**
 * @file The wording of the Virtual Advisor's intake questions that another screen also asks.
 * @module server/utils/intakeQuestions
 *
 * 🔴 ONE HOME, TWO READERS. `server/advisorEngine.js` asks these in its conversation and the
 * Strategy Planner asks them when a client has no saved conversation (item 15.31, Mike's
 * ruling of 2026-09-30: "the Virtual Advisor's own intake questions … read, never copied").
 * Change a sentence here and both screens change together, which is the point.
 *
 * Only the questions a second screen asks live here. The rest of the intake stays in the
 * engine's QUESTIONS array, where it always was.
 *
 * Node 14, CommonJS.
 */

const QUESTION_TEXT = Object.freeze({
  // The opening sentence of the Virtual Advisor's "I have a client situation" card
  // (`mode.client.desc`). That line goes on to promise template recommendations, which the
  // planner does not give, so the planner asks this sentence alone (Mike, 2026-10-03).
  clientChallenge: 'Tell me about a challenge your client is facing.',
  clientRaisedIssue: 'Has the client specifically requested help with this issue, or is it something you\'ve noticed?',
  growthStage: 'Where would you place them on the Growth Curve?',
  clientPersonality: 'Are they light-hearted and open to being challenged, or more discerning and careful about how they receive advice?',
  advisorExperience: 'How long have you been delivering advisory work, and are you comfortable using tools and frameworks with clients?',
  advisorConfidence: 'How confident do you feel about delivering services in this type of situation — is this familiar territory, or more of a stretch for you personally?',
  advisorSessionLength: 'How long can you allow per meeting?'
})

module.exports = { QUESTION_TEXT }

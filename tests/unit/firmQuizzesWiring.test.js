'use strict'

// CB-31 Phase 2 — wiring tripwires.
//
// Two facts about this feature cannot be asserted from its own unit tests, but
// both would be silent and serious if they regressed: the quiz routes must sit
// behind the Firm Manager guard (or one firm could read and overwrite
// another's material), and firm-authored quiz text must be fenced before it
// reaches the AI (or a "question" typed into the browser could act as an
// instruction to the model). Pinning them at the source is cheap insurance.

const fs = require('fs')
const path = require('path')

const read = p => fs.readFileSync(path.resolve(__dirname, '../../', p), 'utf8')

describe('quiz routes are guarded', () => {
  const server = read('server/restify-server.js')

  test.each([
    ['get', 'getQuizzes'],
    ['post', 'saveQuizzes']
  ])('%s /api/firm-manager/quizzes is registered behind fmGuard', (verb, handler) => {
    const line = server.split('\n').find(l => l.includes("'/api/firm-manager/quizzes'") && l.includes(`server.${verb}(`))
    expect(line).toBeDefined()
    expect(line).toContain('...fmGuard')
    expect(line).toContain(`fm.${handler}`)
  })
})

describe('firm-authored quiz text is fenced before it reaches the AI', () => {
  const engine = read('server/courseEngine.js')

  // 2026-07-31: fencing became PER QUESTION when quizzes joined the one mechanism.
  // A bank can now hold Advisor-e's questions and the firm's side by side, so
  // "is this bank the firm's?" is no longer a question with an answer — only
  // "who wrote THIS question?" is. The tripwire moves with it; the property it
  // guards is unchanged.
  test('the quiz-generate prompt fences each firm-authored question', () => {
    expect(engine).toContain('isFirmAuthored(e) ? fenceUntrusted(line) : line')
  })

  test('the grader fences a firm-authored marking guide', () => {
    expect(engine).toContain('isFirmAuthored(bankEntry) ? fenceUntrusted(guideBody) : guideBody')
  })

  test('the banks reaching the AI come from the mechanism, not straight off disk', () => {
    // The defect this closes: the engine used to read data/course-quizzes.json
    // directly, so a firm's saved quiz material never reached the AI while the
    // Firm Manager screen showed it merged. Both quiz paths must resolve through
    // loadBlendedQuizBanks, and neither may go back to the raw file.
    const calls = engine.match(/loadBlendedQuizBanks\(req\.firmId, loadFirmConfig\)/g) || []
    expect(calls.length).toBe(2)
    expect(engine).not.toContain('findQuizBank(getQuizOverrides().banks')
    expect(engine).not.toContain('findQuizBank(overrides.banks')
  })

  test('the fencing helper is actually imported', () => {
    expect(engine).toMatch(/require\(['"][^'"]*promptSafety['"]\)/)
  })
})

describe('the overlay never writes to the platform base', () => {
  const routes = read('server/routes/firmManager.js')

  test('saveQuizzes stores only the validated overlay', () => {
    expect(routes).toContain('_saveQuizOverride(req.firmId, check.value, req.userEmail)')
  })

  test('nothing in the quiz path writes data/course-quizzes.json', () => {
    const quizSection = routes.slice(routes.indexOf('── Quizzes (CB-31'))
    expect(quizSection).not.toMatch(/writeFileSync\([^)]*course-quizzes/)
  })
})

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

describe('the quiz cascade routes are guarded too', () => {
  // Added with Phase 3. These are the routes that WRITE a firm's decisions, so an
  // unguarded one is worse than an unguarded read: one firm could switch off or
  // rewrite another firm's quiz questions. Pinned at the registration line because
  // no unit test of the handler can see which middleware it was mounted behind.
  const server = read('server/restify-server.js')

  test.each([
    ['put', "'/api/firm-manager/quizzes/platform/:qid'", 'setQuizOverride'],
    ['del', "'/api/firm-manager/quizzes/platform/:qid'", 'resetQuizOverride'],
    ['put', "'/api/firm-manager/quizzes/platform/:qid/decline'", 'setQuizDecline'],
    ['post', "'/api/firm-manager/quizzes/own'", 'addOwnQuizQuestion'],
    ['put', "'/api/firm-manager/quizzes/own/:id'", 'updateOwnQuizQuestion'],
    ['del', "'/api/firm-manager/quizzes/own/:id'", 'deleteOwnQuizQuestion']
  ])('%s %s is registered behind fmGuard', (verb, route, handler) => {
    const line = server.split('\n').find(l => l.includes(route) && l.includes(`server.${verb}(`))
    expect(line).toBeDefined()
    expect(line).toContain('...fmGuard')
    expect(line).toContain(`fm.${handler}`)
  })

  test('no quiz route takes the firm id from the request body', () => {
    // Every handler reads req.firmId, which firmAuth sets from the verified JWT. A
    // body-supplied firm id is the standard IDOR route on exactly this surface.
    const routes = read('server/routes/firmManager.js')
    const quizSection = routes.slice(routes.indexOf('── Quiz cascade (CB-31 Phase 3'))
    expect(quizSection).not.toMatch(/req\.body\.firmId|body\.firm_id/)
  })
})

describe('browser-authored quiz text is fenced before it reaches the AI', () => {
  const engine = read('server/courseEngine.js')

  // 2026-07-31: fencing became PER QUESTION when quizzes joined the one mechanism.
  // A bank can now hold Advisor-e's questions and the firm's side by side, so
  // "is this bank the firm's?" is no longer a question with an answer — only
  // "who wrote THIS question?" is. The tripwire moves with it; the property it
  // guards is unchanged.
  //
  // 2026-08-09 (Phase 5): renamed from isFirmAuthored. Once the mentor tier could
  // author questions, "the firm's" stopped describing the set being fenced — a
  // mentor's question is browser-typed too, and reaches EVERY firm rather than one.
  test('the quiz-generate prompt fences each browser-authored question', () => {
    expect(engine).toContain('isBrowserAuthored(e) ? fenceUntrusted(line) : line')
  })

  test('the grader fences a browser-authored marking guide', () => {
    expect(engine).toContain('isBrowserAuthored(bankEntry) ? fenceUntrusted(guideBody) : guideBody')
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

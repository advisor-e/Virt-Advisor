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

  test('the quiz-generate prompt fences a firm-origin bank', () => {
    expect(engine).toContain("bank.origin === 'firm' ? fenceUntrusted(bankEntries) : bankEntries")
  })

  test('the grader fences a firm-origin marking guide', () => {
    expect(engine).toContain("bank.origin === 'firm' ? fenceUntrusted(guideBody) : guideBody")
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

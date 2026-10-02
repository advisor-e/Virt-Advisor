'use strict'

/**
 * The Wordsmith hub tab's routes — item 15.14, screens 6 and 7.
 *
 * WHAT UAT CANNOT SEE: that a scope named in a request body is obeyed, that a refused change
 * reached the store anyway, that a style choice could be switched off or added (the code checks
 * the model picks from a fixed list), that a statement can lose its last Alignment document row,
 * that "Keep mine" quietly took the other wording, or that a database fault leaks its text. The
 * store is an in-memory stand-in, so each test follows a manager's clicks to what is saved.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/wordsmithContent')
const wc = require('../../server/utils/wordsmithContent')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-a'
let db

function makeRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

async function call (handler, body, scope) {
  const res = makeRes()
  await handler({ firmId: scope || FIRM, userEmail: 'm@firm.example', body, query: {} }, res)
  return res
}

const visionOf = res => res._body.statements.find(s => s.name === 'Vision')
const stored = scope => wc.readState(db[scope + '::' + wc.CONFIG_KEY])
const codeOf = res => res._body && res._body.error && res._body.error.code

function sqlError () {
  const e = new Error('ER_NO_SUCH_TABLE: firm_framework_versions at /srv/app')
  e.sqlState = '42S02'
  return e
}

beforeEach(() => {
  jest.clearAllMocks()
  db = {}
  overlay.loadFirmConfig.mockImplementation((scope, key) => Promise.resolve(db[scope + '::' + key] || null))
  overlay.saveFirmConfig.mockImplementation((scope, key, value) => { db[scope + '::' + key] = value; return Promise.resolve() })
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })

describe('reading the tab', () => {
  test('returns the five and the style wording as this tier sees them, with the limits', async () => {
    const res = await call(routes.getForManager)
    expect(res._status).toBe(200)
    expect(res._body.statements.map(s => s.name)).toEqual(['Vision', 'Purpose', 'Values', 'Mission', 'Strategy'])
    expect(res._body.style.map(r => r.key)).toEqual(['sentenceLength', 'formality', 'jargon', 'voice'])
    expect(res._body.limits).toMatchObject({ minWords: 10, maxWords: 120 })
  })

  test('a live database fault is a 500 in the standard shape that names nothing inside', async () => {
    overlay.loadFirmConfig.mockRejectedValue(sqlError())
    const res = await call(routes.getForManager)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|firm_framework_versions|\/srv/)
  })
})

describe('every change is this tier’s own', () => {
  test('🔴 a row added is saved under the TOKEN’s scope, never one named in the body', async () => {
    const res = await call(routes.addRow, { statement: 'Vision', part: 'definition', basis: 'best-practice', text: 'Ours.', firmId: 'firm-b', scope: PLATFORM_SCOPE })
    expect(res._status).toBe(200)
    expect(visionOf(res).definition.slice(-1)[0]).toMatchObject({ id: 'fw-d1', text: 'Ours.', source: 'added-here', basis: 'best-practice' })
    expect(overlay.saveFirmConfig.mock.calls.every(c => c[0] === FIRM)).toBe(true)
  })

  test('an unknown statement or part is refused and nothing is saved', async () => {
    expect(codeOf(await call(routes.addRow, { statement: 'Motto', part: 'definition', basis: 'alignment', text: 'x' }))).toBe('UNKNOWN_STATEMENT')
    expect(codeOf(await call(routes.addRow, { statement: 'Vision', part: 'elements', text: 'x' }))).toBe('UNKNOWN_PART')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test.each([
    ['a blank row', { part: 'definition', basis: 'alignment', text: '  ' }, 'INVALID_TEXT'],
    ['an oversized question', { part: 'questions', question: 'x'.repeat(301) }, 'INVALID_TEXT'],
    ['a row with no basis', { part: 'definition', text: 'Fine.' }, 'INVALID_BASIS'],
    ['a source with a script link', { part: 'definition', basis: 'alignment', text: 'Fine.', cites: [{ author: 'A', title: 'T', url: 'javascript:x' }] }, 'INVALID_CITES']
  ])('%s is refused and nothing is saved', async (_w, body, code) => {
    const res = await call(routes.addRow, Object.assign({ statement: 'Vision' }, body))
    expect(res._status).toBe(400)
    expect(codeOf(res)).toBe(code)
    expect(db[FIRM + '::' + wc.CONFIG_KEY]).toBeUndefined()
  })
})

describe('the standing rules', () => {
  test('🔴 a statement cannot lose its last Alignment document row, whether switched off or never added', async () => {
    const off1 = await call(routes.setRowOff, { statement: 'Mission', part: 'definition', id: 'ws-mission-d1', off: true })
    expect(off1._status).toBe(200)
    const off2 = await call(routes.setRowOff, { statement: 'Mission', part: 'definition', id: 'ws-mission-d2', off: true })
    expect(codeOf(off2)).toBe('LAST_ALIGNMENT_ROW')
    expect(stored(FIRM).statements.Mission.definition.declined).toEqual(['ws-mission-d1'])
  })

  test('🔴 a style row is only ever reworded — its instruction cannot be blanked, and an unknown choice is not found', async () => {
    expect(codeOf(await call(routes.editStyle, { id: 'ws-style-voice-we', instruction: ' ' }))).toBe('INVALID_TEXT')
    expect(codeOf(await call(routes.editStyle, { id: 'ws-style-voice-pirate', instruction: 'Arr.' }))).toBe('NOT_FOUND')
    expect(routes.setStyleOff).toBeUndefined()
    expect(routes.addStyle).toBeUndefined()
    const ok = await call(routes.editStyle, { id: 'ws-style-voice-we', instruction: 'Speak as "we", the whole team.' })
    const voice = ok._body.style.find(r => r.key === 'voice').options.find(o => o.id === 'ws-style-voice-we')
    expect(voice).toMatchObject({ instruction: 'Speak as "we", the whole team.', source: 'edited-here' })
  })

  test.each([[9, 400], [121, 400], ['forty', 400], [30, 200]])('a word limit of %p answers %p', async (value, status) => {
    const res = await call(routes.editValue, { statement: 'Vision', field: 'maxWords', value })
    expect(res._status).toBe(status)
    if (status === 200) { expect(visionOf(res).maxWords).toMatchObject({ value: 30, source: 'edited-here' }) }
  })

  test('an inherited row keeps its basis when edited; a body naming another basis changes nothing', async () => {
    const res = await call(routes.editRow, { statement: 'Vision', part: 'definition', id: 'ws-vision-d1', text: 'Our wording.', basis: 'best-practice' })
    expect(visionOf(res).definition[0]).toMatchObject({ basis: 'alignment', text: 'Our wording.', source: 'edited-here' })
  })

  test('editing back to the inherited wording drops the edit', async () => {
    const up = wc.BASE_STATEMENTS[0].definition[1].text
    await call(routes.editRow, { statement: 'Vision', part: 'definition', id: 'ws-vision-d2', text: 'Mine.' })
    await call(routes.editRow, { statement: 'Vision', part: 'definition', id: 'ws-vision-d2', text: up })
    expect(stored(FIRM).statements.Vision.definition.overrides).toEqual({})
  })
})

describe('Use theirs and Keep mine', () => {
  const MENTOR_RULE = 'The mentor’s newer rule.'

  beforeEach(async () => {
    await call(routes.editValue, { statement: 'Vision', field: 'rule', value: 'My rule.' })
    db[PLATFORM_SCOPE + '::' + wc.CONFIG_KEY] = { statements: { Vision: { rule: MENTOR_RULE, ruleBaseline: wc.BASE_STATEMENTS[0].domain.rule } } }
  })

  test('the change above is offered, not applied', async () => {
    const res = await call(routes.getForManager)
    expect(visionOf(res).domain).toMatchObject({ rule: 'My rule.', changedAbove: true, above: MENTOR_RULE })
  })

  test('🔴 Keep mine keeps this tier’s rule and moves only the baseline', async () => {
    const res = await call(routes.keepMineValue, { statement: 'Vision', field: 'rule' })
    expect(visionOf(res).domain).toMatchObject({ rule: 'My rule.', changedAbove: false })
    expect(stored(FIRM).statements.Vision).toMatchObject({ rule: 'My rule.', ruleBaseline: MENTOR_RULE })
  })

  test('Use theirs takes the rule above', async () => {
    const res = await call(routes.useInheritedValue, { statement: 'Vision', field: 'rule' })
    expect(visionOf(res).domain).toMatchObject({ rule: MENTOR_RULE, source: 'inherited' })
  })
})

describe('English spelling — each firm\'s choice, New Zealand from the mentor (item 13.7)', () => {
  const setMentor = (value) => {
    db[PLATFORM_SCOPE + '::' + wc.CONFIG_KEY] = { statements: {}, style: {}, spelling: value, spellingBaseline: 'nz' }
  }

  test('starts as New Zealand, and a value off the two is refused with nothing saved', async () => {
    expect((await call(routes.getForManager))._body.spelling).toMatchObject({ value: 'nz', source: 'inherited', changedAbove: false })
    expect(codeOf(await call(routes.editSpelling, { value: 'uk' }))).toBe('INVALID_VALUE')
    expect(db[FIRM + '::' + wc.CONFIG_KEY]).toBeUndefined()
  })

  test('🔴 a level\'s choice passes down: the firm follows the mentor\'s US until it chooses', async () => {
    setMentor('us')
    expect((await call(routes.getForManager))._body.spelling).toMatchObject({ value: 'us', source: 'inherited' })
    expect((await wc.loadResolvedContent(FIRM, wc.readScopeConfig)).spelling).toBe('us')
  })

  test('🔴 a firm that chose New Zealand keeps it when the level above moves to US — offered, never applied', async () => {
    // The approved drawing's case. With two values, a choice dropped for matching the level above
    // would leave this firm silently following its group to US.
    await call(routes.editSpelling, { value: 'nz' })
    expect(stored(FIRM)).toMatchObject({ spelling: 'nz', spellingBaseline: 'nz' })
    setMentor('us')
    expect((await call(routes.getForManager))._body.spelling).toMatchObject({ value: 'nz', source: 'edited-here', changedAbove: true, above: 'us' })
    expect((await wc.loadResolvedContent(FIRM, wc.readScopeConfig)).spelling).toBe('nz')

    const kept = await call(routes.keepMineSpelling)
    expect(kept._body.spelling).toMatchObject({ value: 'nz', changedAbove: false })
    expect(stored(FIRM)).toMatchObject({ spelling: 'nz', spellingBaseline: 'us' })

    const theirs = await call(routes.useInheritedSpelling)
    expect(theirs._body.spelling).toMatchObject({ value: 'us', source: 'inherited' })
  })

  test('a level above that moves to match the firm\'s choice offers nothing', async () => {
    await call(routes.editSpelling, { value: 'us' })
    setMentor('us')
    expect((await call(routes.getForManager))._body.spelling).toMatchObject({ value: 'us', source: 'edited-here', changedAbove: false })
  })

  test('Use theirs and Keep mine with no choice made are not found', async () => {
    expect(codeOf(await call(routes.useInheritedSpelling))).toBe('NOT_FOUND')
    expect(codeOf(await call(routes.keepMineSpelling))).toBe('NOT_FOUND')
  })
})

describe('ids and history', () => {
  test('a removed row’s id is never handed out again, even after a restore', async () => {
    await call(routes.addRow, { statement: 'Values', part: 'questions', question: 'Which one would you keep if it cost you?' })
    await call(routes.setRowOff, { statement: 'Values', part: 'questions', id: 'fw-q1', off: true })
    const res = await call(routes.addRow, { statement: 'Values', part: 'questions', question: 'Another?' })
    expect(res._body.statements.find(s => s.name === 'Values').questions.slice(-1)[0].id).toBe('fw-q2')
  })

  test('restore is scoped to the token’s scope and refuses a missing version', async () => {
    expect(codeOf(await call(routes.restore, {}))).toBe('MISSING_VERSION')
    await call(routes.restore, { versionId: 7, firmId: 'firm-b' })
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, wc.CONFIG_KEY, 7)
  })
})

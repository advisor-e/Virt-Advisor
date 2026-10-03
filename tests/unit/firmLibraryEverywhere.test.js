'use strict'

/**
 * Item 7.31 — every module the survey found reading the committed template file now reads the
 * library in force: a firm's own for what a firm's advisors and managers meet, the platform's
 * (the mentor's or the master app's upload) for the mentor's screens.
 *
 * A firm can upload its own export (POST /api/firm-manager/templates) and the master app can
 * push the platform's (integrationTemplates.js). Until 2026-10-03 these modules ignored both:
 * the AI was stopped from naming a template a firm had added and allowed to name one it had
 * removed; a firm's own page was refused by the quiz editor as "not in your library"; the
 * mentor's Template Check and Template Profiles judged against a file the platform had moved
 * past. Nothing in UAT shows this until an export differs, which is why it is a test.
 *
 * One library is used throughout: the seed with one template RENAMED, one ADDED and one
 * REMOVED. Each module must follow it, and the seed must still answer for a firm with none.
 */

const FIRM = 'firm-with-own-library'

const mockUploads = {}
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn((scopeId, key) => Promise.resolve(key === 'templates' ? (mockUploads[scopeId] || null) : null)),
  saveFirmConfig: jest.fn(() => Promise.resolve(1)),
  getVersionHistory: jest.fn(() => Promise.resolve([])),
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))

const SEED = require('../../data/templates.json')
const TREES = require('../../data/logic_trees.json')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { loadEffectiveTemplates, clearTemplateCache } = require('../../server/utils/templateLibrary')
const { splitByAvailability, formatNodeForPrompt, buildLearnReferenceText } = require('../../server/utils/logicTrees')
const { resolveTemplateName, listTemplatePages } = require('../../server/utils/resolveTemplateName')
const { validateQuizOverride } = require('../../server/utils/firmQuizzes')
const { findQuizBank } = require('../../server/utils/quizOverrides')
const { libraryPages } = require('../../server/utils/semanticProfiles')
const { getTemplateCheck } = require('../../server/routes/mentor')
const semanticRoutes = require('../../server/routes/semanticProfiles')

/** A do-the-job title held by exactly one row, on a page no other row shares. */
const solo = t => t.menuSection === 'do-the-job' && t.title && t.title.split(' ').length >= 2 &&
  SEED.filter(x => x.title === t.title).length === 1 && SEED.filter(x => x.page === t.page).length === 1

// RENAMED is one a logic table names, so Template Check has something to find.
const named = new Set((TREES.trees || TREES).flatMap(tree => (tree.nodes || []).flatMap(n => n.templates || [])))
const RENAMED = SEED.find(t => solo(t) && named.has(t.title))
const REMOVED = SEED.find(t => solo(t) && t !== RENAMED)
const NEW_TITLE = RENAMED.title + ' (Firm Edition)'
const ADDED = { page: 'zz-firm-only-1', title: 'Firm Only Cashflow Clinic', section: 'Do the Job', subSection: 'General Tools', menuSection: 'do-the-job' }
const LIBRARY = SEED
  .filter(t => t !== REMOVED)
  .map(t => (t === RENAMED ? { ...t, title: NEW_TITLE } : t))
  .concat(ADDED)

const node = { branch_name: 'b', type: 'recommendation', condition: 'c', templates: [NEW_TITLE, ADDED.title, RENAMED.title, REMOVED.title] }

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

beforeEach(() => {
  clearTemplateCache()
  Object.keys(mockUploads).forEach((k) => { delete mockUploads[k] })
})

test('the test library differs from the seed in all three ways', () => {
  expect(RENAMED && REMOVED).toBeTruthy()
  expect(LIBRARY.some(t => t.title === RENAMED.title)).toBe(false)
  expect(LIBRARY.some(t => t.title === REMOVED.title)).toBe(false)
  expect(LIBRARY.some(t => t.title === ADDED.title)).toBe(true)
})

describe('🔴 the logic-tree availability gate follows the firm\'s library', () => {
  test('it lets through what the firm holds and withholds what it does not', async () => {
    mockUploads[FIRM] = LIBRARY
    const library = await loadEffectiveTemplates(FIRM)
    const split = splitByAvailability(node.templates, library)
    expect(split.available).toEqual([NEW_TITLE, ADDED.title])
    expect(split.withheld).toEqual([RENAMED.title, REMOVED.title])
  })

  test('a firm with no upload is still gated by the seed', async () => {
    const split = splitByAvailability(node.templates, await loadEffectiveTemplates('a-firm-on-the-seed'))
    expect(split.available).toEqual([RENAMED.title, REMOVED.title])
  })

  test('the firm\'s library reaches the gate through the prompt builders', () => {
    const line = formatNodeForPrompt(node, [], false, LIBRARY).split('\n').find(l => l.startsWith('Templates:'))
    expect(line).toBe('Templates: ' + [NEW_TITLE, ADDED.title].join(', '))
    const text = buildLearnReferenceText({ id: 'zz-test', mode: 'learn', name: 'T', description: 'd', nodes: [node] }, null, LIBRARY)
    expect(text).toContain(ADDED.title)
    expect(text).not.toContain(REMOVED.title)
  })
})

describe('🔴 the quiz editor and quiz matching follow the firm\'s library', () => {
  test('a firm-only page is listed and binds; a removed one is neither', () => {
    expect(listTemplatePages(LIBRARY).map(p => p.page)).toContain(ADDED.page)
    expect(listTemplatePages(LIBRARY).map(p => p.page)).not.toContain(REMOVED.page)
    expect(resolveTemplateName(ADDED.title, LIBRARY)).toMatchObject({ ok: true, title: ADDED.title })
    expect(resolveTemplateName(NEW_TITLE, LIBRARY)).toMatchObject({ ok: true, title: NEW_TITLE })
    expect(resolveTemplateName(ADDED.title).ok).toBe(false)
  })

  test('a quiz for a firm-only page is accepted against the firm\'s library, refused against the seed', () => {
    const quiz = { [ADDED.title]: { entries: [{ id: 1, question: 'What is it for?', answer: 'Cash.', keyPoint: 'Cash first.' }] } }
    expect(validateQuizOverride(quiz, LIBRARY).ok).toBe(true)
    expect(validateQuizOverride(quiz).error).toMatch(/does not match a page/)
  })

  test('the quiz editor\'s own route accepts a question for the firm\'s own page — and the seed would refuse it', async () => {
    // Through the route, because the modules always took a library: what 7.31 changed is
    // that the route now hands them the firm's.
    const { addOwnQuizQuestion } = require('../../server/routes/firmManager')
    const req = { firmId: FIRM, userEmail: 'manager@firm.example', body: { bank: ADDED.title, question: 'What is it for?', answer: 'Cash.', keyPoint: 'Cash first.' } }

    const refused = makeMockRes()
    await addOwnQuizQuestion(req, refused)
    expect(refused._status).toBe(404)

    mockUploads[FIRM] = LIBRARY
    clearTemplateCache()
    const accepted = makeMockRes()
    await addOwnQuizQuestion(req, accepted)
    expect(accepted._status).toBe(201)
    expect(accepted._body.bank).toBe(ADDED.title)
  })

  test('a firm\'s question bank, keyed a word-order away, still meets its session', () => {
    const banks = { 'Cashflow Clinic Firm Only': { source: 'firm', entries: [{ question: 'Q', answer: 'A', keyPoint: 'K' }] } }
    const session = { title: 'Session 1', resources: [ADDED.title] }
    expect(findQuizBank(banks, session, LIBRARY)).toBe(banks['Cashflow Clinic Firm Only'])
    expect(findQuizBank(banks, session)).toBeNull()
  })
})

describe('🔴 the mentor\'s screens follow the platform\'s library', () => {
  test('Template Profiles offers the platform\'s pages, not the seed\'s', async () => {
    expect(libraryPages(LIBRARY).has(ADDED.page)).toBe(true)
    expect(libraryPages(LIBRARY).has(REMOVED.page)).toBe(false)

    const refused = makeMockRes()
    await semanticRoutes.history({ params: { page: ADDED.page } }, refused)
    expect(refused._status).toBe(400)

    mockUploads[PLATFORM_SCOPE] = LIBRARY
    clearTemplateCache()
    const served = makeMockRes()
    await semanticRoutes.history({ params: { page: ADDED.page } }, served)
    expect(served._status).toBe(200)
  })

  test('Template Check reports a table name the platform renamed away', async () => {
    const before = makeMockRes()
    await getTemplateCheck({ userEmail: 'mentor@advisor-e.com' }, before)
    const namesBefore = before._body.findings.map(f => f.name)
    expect(namesBefore).not.toContain(RENAMED.title)

    mockUploads[PLATFORM_SCOPE] = LIBRARY
    clearTemplateCache()
    const after = makeMockRes()
    await getTemplateCheck({ userEmail: 'mentor@advisor-e.com' }, after)
    expect(after._body.findings.map(f => f.name)).toContain(RENAMED.title)
  })
})

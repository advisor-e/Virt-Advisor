'use strict'

/**
 * Item 7.29 — the AI's template descriptions and its template-name check read the library
 * in force for the firm, not the committed seed.
 *
 * A firm, or a tier above it, may upload its own export (templateLibrary). The day one
 * renames a template, the AI must be shown the new title and the name check must refuse
 * the old one — otherwise the AI names a template that firm does not hold, the fault 7.18
 * fixed, back by a side door. On 2026-10-02 the seed and the latest export were identical,
 * so nobody in UAT could see this until it happened; that is why it is a test.
 *
 * The library is resolved through the real templateLibrary walk; only the store is stood in.
 */

const RENAMED_FIRM = 'firm-with-renamed-library'
const OTHER_FIRM = 'firm-on-the-seed'

const mockUploads = {}
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn((scopeId, key) => Promise.resolve(key === 'templates' ? (mockUploads[scopeId] || null) : null))
}))

const { loadEffectiveTemplates, clearTemplateCache } = require('../../server/utils/templateLibrary')
const { isKnownTemplate, nearestTemplateTitle, extractDeclaredTemplates } = require('../../server/utils/tierLookup')
const { getAllSummaries, formatSummariesForPrompt, getSummariesForTemplateNames } = require('../../server/utils/summaries')
const SEED = require('../../data/templates.json')

/**
 * A seed template that reaches the AI under its own title, so renaming it is visible:
 * a Do the Job template with a purpose, whose title some summary carries today.
 */
const OLD = (() => {
  const titled = new Set(getAllSummaries().flatMap(s => s.titles))
  const row = SEED.find(t => t.section === 'Do the Job' && t.purpose && t.purpose.trim() && titled.has(t.title))
  return row && row.title
})()
const NEW = OLD + ' (Firm Edition)'

beforeAll(() => {
  mockUploads[RENAMED_FIRM] = SEED.map(t => (t.title === OLD ? { ...t, title: NEW } : t))
})

beforeEach(() => clearTemplateCache())

describe('🔴 a firm whose uploaded library renames a template', () => {
  test('the test has a template to rename, and the seed holds it under the old title', () => {
    expect(OLD).toBeTruthy()
    expect(isKnownTemplate(OLD)).toBe(true)
    expect(isKnownTemplate(NEW)).toBe(false)
  })

  test('the name check accepts the new title and refuses the old one for that firm', async () => {
    const library = await loadEffectiveTemplates(RENAMED_FIRM)
    expect(library).not.toBeNull()
    expect(isKnownTemplate(NEW, library)).toBe(true)
    expect(isKnownTemplate(OLD, library)).toBe(false)
    expect(nearestTemplateTitle(NEW.toLowerCase(), library)).toBe(NEW)
  })

  test('a recommendation the AI declares under the old title is not recorded for that firm', async () => {
    const library = await loadEffectiveTemplates(RENAMED_FIRM)
    expect(extractDeclaredTemplates(`[[TEMPLATES: ${OLD} | ${NEW}]]`, library)).toEqual([NEW.toLowerCase()])
  })

  test('the AI is shown the template under its new title, never the old one', async () => {
    const library = await loadEffectiveTemplates(RENAMED_FIRM)
    const titles = getAllSummaries(library).flatMap(s => s.titles)
    expect(titles).toContain(NEW)
    expect(titles).not.toContain(OLD)
    expect(formatSummariesForPrompt(getAllSummaries(library))).toContain('**' + NEW + '**')
  })

  test('a summary asked for by the new title is headed with it', async () => {
    const library = await loadEffectiveTemplates(RENAMED_FIRM)
    const found = getSummariesForTemplateNames([NEW], library)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].titles).toContain(NEW)
  })
})

describe('🔴 another firm, with no upload of its own, is unaffected', () => {
  test('it reads the seed: the old title stands and the new one is unknown', async () => {
    const library = await loadEffectiveTemplates(OTHER_FIRM)
    expect(library).toBeNull()
    expect(isKnownTemplate(OLD, library)).toBe(true)
    expect(isKnownTemplate(NEW, library)).toBe(false)
    const titles = getAllSummaries(library).flatMap(s => s.titles)
    expect(titles).toContain(OLD)
    expect(titles).not.toContain(NEW)
  })

  test('the build for one library never leaks into another', async () => {
    // Read the renamed firm first, then the seed: a shared cache would hand back the first.
    await loadEffectiveTemplates(RENAMED_FIRM).then(lib => getAllSummaries(lib))
    expect(getAllSummaries(null).flatMap(s => s.titles)).toContain(OLD)
  })
})

'use strict'

/**
 * @file The template descriptions reach the AI under master-library titles only (item 7.18).
 *
 * content-summaries.json came from a Google Doc and 67 of its headings name no template. The
 * AI repeats the heading it is shown, so on the 2026-10-02 bench it offered a non-existent
 * template in 14-16 of 51 Discover answers once the descriptions were sent. These tests run
 * every description through the formatter and hold each name it emits against
 * data/templates.json, the master export — so a new description, or a renamed template,
 * fails here rather than in front of an advisor.
 */

const { isKnownTemplate } = require('../../server/utils/tierLookup')
const {
  getAllSummaries,
  filterSummariesByQuery,
  getSummariesForTemplateNames,
  formatSummariesForPrompt
} = require('../../server/utils/summaries')

const headings = text => [...text.matchAll(/^\*\*(.+?)\*\* \[/gm)].map(m => m[1])
const alsoNames = text => [...text.matchAll(/^Also describes the templates: (.+?)(?: \(and \d+ more\))?$/gm)]
  .flatMap(m => m[1].split('; '))

describe('every description the AI is shown carries library titles', () => {
  const text = formatSummariesForPrompt(getAllSummaries())

  test('every heading is exactly one master-library title', () => {
    expect(headings(text).filter(n => !isKnownTemplate(n))).toEqual([])
  })

  test('the other templates a shared description covers are library titles too', () => {
    expect(alsoNames(text).length).toBeGreaterThan(0)
    expect(alsoNames(text).filter(n => !isKnownTemplate(n))).toEqual([])
  })

  test('a Google Doc heading that names no template never reaches the prompt', () => {
    expect(text).not.toContain('**4 Part Business Plan**')
    expect(text).not.toContain('Advance.6. Organisational Review & Org Chart')
  })

  test('a description reached through its page link shows the title it links to', () => {
    expect(headings(text)).toContain('Organisational Review')
  })

  test('the keyword filter returns only descriptions that name a template', () => {
    filterSummariesByQuery('business plan organisational review team survey', 50)
      .forEach(s => expect(s.titles.length).toBeGreaterThan(0))
  })
})

describe('getSummariesForTemplateNames', () => {
  test('a shared description is headed by the templates asked for, not every one it covers', () => {
    const text = formatSummariesForPrompt(getSummariesForTemplateNames(['Cafe', 'Plumber']))
    expect(headings(text)).toEqual(['Cafe'])
    expect(alsoNames(text)).toEqual(['Plumber'])
  })
})

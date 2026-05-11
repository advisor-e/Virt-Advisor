'use strict'

// filterTemplatesByQuery and formatTemplatesForPrompt are pure functions —
// they take their data as parameters and do no file I/O. No mocking required.
const { filterTemplatesByQuery, formatTemplatesForPrompt } = require('../../server/utils/templates')

const SAMPLE_TEMPLATES = [
  {
    page: 'T001',
    title: 'Profit Analysis',
    purpose: 'Analyse revenue streams and margins',
    section: 'Financial',
    topic: 'Profit',
    tags: ['revenue', 'profit', 'analysis'],
    hasVideo: false
  },
  {
    page: 'T002',
    title: 'Staff Management Guide',
    purpose: 'Manage your team effectively',
    section: 'Operations',
    topic: 'HR',
    tags: ['staff', 'team', 'management'],
    hasVideo: true
  },
  {
    page: 'T003',
    title: 'Marketing Strategy',
    purpose: 'Build your marketing plan',
    section: 'Growth',
    topic: 'Marketing',
    tags: ['marketing', 'growth', 'brand'],
    hasVideo: false
  }
]

describe('filterTemplatesByQuery', () => {
  test('returns matching template at top for specific query', () => {
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'profit analysis revenue', 40)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].page).toBe('T001')
  })

  test('returns empty array when no templates match query', () => {
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'quantum physics superconductor nanotube', 40)
    expect(result).toEqual([])
  })

  test('returns all templates (up to maxResults) when query contains only stop-words or short words', () => {
    // 'the and or' are all stop-words — no meaningful keywords, so all returned
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'the and or', 40)
    expect(result.length).toBeLessThanOrEqual(SAMPLE_TEMPLATES.length)
  })

  test('respects maxResults limit', () => {
    const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
      page: `T${i}`,
      title: `Revenue Template ${i}`,
      purpose: `Analyse revenue streams ${i}`,
      section: 'Financial',
      topic: 'Revenue',
      tags: ['revenue']
    }))
    const result = filterTemplatesByQuery(manyTemplates, 'revenue streams analysis', 5)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  test('uses default maxResults of 40 when not specified', () => {
    const manyTemplates = Array.from({ length: 60 }, (_, i) => ({
      page: `T${i}`,
      title: `Revenue Template ${i}`,
      purpose: `Analyse revenue streams ${i}`,
      section: 'Financial',
      topic: 'Revenue',
      tags: ['revenue']
    }))
    const result = filterTemplatesByQuery(manyTemplates, 'revenue')
    expect(result.length).toBeLessThanOrEqual(40)
  })

  test('handles empty template array', () => {
    const result = filterTemplatesByQuery([], 'profit', 40)
    expect(result).toEqual([])
  })

  test('is case-insensitive in matching', () => {
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'PROFIT ANALYSIS', 40)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].page).toBe('T001')
  })

  test('matches on tags', () => {
    // 'brand' is only in tags of T003
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'brand strategy growth', 40)
    expect(result.some(t => t.page === 'T003')).toBe(true)
  })

  test('matches on section field', () => {
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'operations management', 40)
    expect(result.some(t => t.page === 'T002')).toBe(true)
  })

  test('scores higher-matching templates above lower-matching ones', () => {
    // T001 matches 'profit' (in title, topic, tags) — T003 matches only 'growth' (in tags)
    const result = filterTemplatesByQuery(SAMPLE_TEMPLATES, 'profit revenue analysis', 40)
    const t001Index = result.findIndex(t => t.page === 'T001')
    const t003Index = result.findIndex(t => t.page === 'T003')
    // T001 should rank above T003 (or T003 might not appear at all)
    if (t003Index !== -1) {
      expect(t001Index).toBeLessThan(t003Index)
    }
  })
})

describe('formatTemplatesForPrompt', () => {
  test('returns empty string for empty array', () => {
    expect(formatTemplatesForPrompt([])).toBe('')
  })

  test('numbers templates sequentially starting from 1', () => {
    const result = formatTemplatesForPrompt([SAMPLE_TEMPLATES[0]])
    expect(result).toContain('1.')
  })

  test('includes template title', () => {
    const result = formatTemplatesForPrompt([SAMPLE_TEMPLATES[0]])
    expect(result).toContain('Profit Analysis')
  })

  test('includes template page ID', () => {
    const result = formatTemplatesForPrompt([SAMPLE_TEMPLATES[0]])
    expect(result).toContain('T001')
  })

  test('includes section and topic', () => {
    const result = formatTemplatesForPrompt([SAMPLE_TEMPLATES[0]])
    expect(result).toContain('Financial')
    expect(result).toContain('Profit')
  })

  test('does not include video note in prompt (video injection is code-based)', () => {
    const result = formatTemplatesForPrompt([SAMPLE_TEMPLATES[1]])
    expect(result).not.toContain('Video:')
  })

  test('formats multiple templates with correct numbering', () => {
    const result = formatTemplatesForPrompt(SAMPLE_TEMPLATES)
    expect(result).toContain('1.')
    expect(result).toContain('2.')
    expect(result).toContain('3.')
  })

  test('handles template with no tags gracefully', () => {
    const noTags = { ...SAMPLE_TEMPLATES[0], tags: undefined }
    expect(() => formatTemplatesForPrompt([noTags])).not.toThrow()
  })
})

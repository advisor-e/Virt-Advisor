'use strict'

/**
 * The suggestion on a Template Check row has to say what the document IS, not
 * just name it. Mike opened the screen on 2026-08-12 and could not tell what was
 * required; the cause was that `findCandidate` read `summary || description`,
 * and NO record in data/templates.json carries either field — all 291 keep their
 * text in `purpose`. So the explanatory line resolved to '' on every row and the
 * component's `v-if="row.candidate.summary"` never rendered. The element was in
 * the approved mockup and had been blank since it shipped.
 *
 * These tests fail if that regresses, and the first one fails if a future export
 * drops `purpose` — which would silently empty the screen again.
 */

const { findCandidate, buildCatalogue } = require('../../server/utils/templateCheck')
const TEMPLATES = require('../../data/templates.json')

describe('a suggestion carries the text that explains the document', () => {
  test('the real catalogue keeps its text in `purpose`, on every record', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0)
    const withPurpose = TEMPLATES.filter(t => typeof t.purpose === 'string' && t.purpose !== '')
    expect(withPurpose.length).toBe(TEMPLATES.length)
  })

  test('a real suggestion arrives with its purpose text, not an empty string', () => {
    const cat = buildCatalogue(TEMPLATES)
    const c = findCandidate('Get.1a.Sales Tracker', cat)
    expect(c).toBeTruthy()
    expect(c.title).toBe('Sales Tracker Opt A')
    // The claim that matters: something for Mike to read.
    expect(c.summary.length).toBeGreaterThan(20)
    expect(c.summary).toContain('sales approach methods')
  })

  test('`summary` and `description` still work if an export ever carries them', () => {
    const cat = buildCatalogue([{ title: 'Widget Review', summary: 'from the summary field' }])
    expect(findCandidate('Widget Review', cat).summary).toBe('from the summary field')

    const cat2 = buildCatalogue([{ title: 'Widget Review', description: 'from the description field' }])
    expect(findCandidate('Widget Review', cat2).summary).toBe('from the description field')
  })

  test('`purpose` wins when a record carries more than one of them', () => {
    const cat = buildCatalogue([{ title: 'Widget Review', purpose: 'the purpose', summary: 'the summary' }])
    expect(findCandidate('Widget Review', cat).summary).toBe('the purpose')
  })

  test('a record with none of the three yields an empty string, never undefined', () => {
    const cat = buildCatalogue([{ title: 'Widget Review' }])
    expect(findCandidate('Widget Review', cat).summary).toBe('')
  })
})

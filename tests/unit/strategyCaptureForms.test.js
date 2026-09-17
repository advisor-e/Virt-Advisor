/**
 * The capture tables, and the visit that makes Porter's work twice.
 *
 * 🔴 THESE TESTS RECOMPUTE, THEY DO NOT PIN A NUMBER SOMEBODY TYPED. The lesson is
 * item 7.9's: a code header said "two collisions", every later note copied it, and
 * nobody re-derived it until it had cost a morning. So the alias list is checked by
 * resolving every concept's template, and the extracted data is checked against the
 * templates themselves — a workbook Mike edits fails the build rather than being
 * found in a session six weeks later.
 *
 * What is deliberately NOT asserted, per the testing rule: how a table looks, what
 * any label says, or that a file exists. A person in UAT sees all three instantly.
 * What UAT cannot see is a concept silently losing its table because a file was
 * renamed, or Porter's collapsing to one visit and overwriting the observations.
 */

'use strict'

const forms = require('../../server/utils/strategyCaptureForms')
const { concepts } = require('../../data/strategy-frameworks.json')
const captureTables = require('../../data/strategy-capture-tables.json')

/** Concepts that name a fill-in template, whatever it resolves to. */
const withTemplate = concepts.filter(c => c.captureTemplate)

describe('the capture tables are Mike\'s own, and every concept that names one finds it', () => {
  test('every concept naming a template resolves it, or is a known gap', () => {
    const unresolved = withTemplate
      .map(c => ({ id: c.id, template: c.captureTemplate, hit: !!forms.resolveTemplate(c.captureTemplate) }))
      .filter(r => !r.hit)
      .map(r => r.id + ' -> ' + r.template)

    // The four with no workbook are the only permitted misses, and they are named
    // rather than counted so a fifth cannot hide inside a number.
    const permitted = forms.TEMPLATES_NOT_SUPPLIED
    const unexpected = unresolved.filter((line) => {
      return !permitted.some(name => line.includes('-> ' + name))
    })

    expect(unexpected).toEqual([])
  })

  test('no alias points at a template that is not there', () => {
    Object.keys(forms.TEMPLATE_ALIASES).forEach((from) => {
      const to = forms.TEMPLATE_ALIASES[from]
      expect(captureTables.templates[to]).toBeDefined()
    })
  })

  test('no alias is dead weight — each one is used by a concept', () => {
    const named = withTemplate.map(c => c.captureTemplate)
    Object.keys(forms.TEMPLATE_ALIASES).forEach((from) => {
      expect(named).toContain(from)
    })
  })
})

describe('a concept with no measured template is told so, never given a borrowed table', () => {
  test('the 32 unmeasured concepts return supplied:false with a reason', () => {
    const unmeasured = concepts.filter(c => !c.captureTemplate)
    unmeasured.forEach((c) => {
      const result = forms.captureForConcept(c)
      expect(result.supplied).toBe(false)
      expect(result.reason).toBe('no-capture-template-measured')
      expect(result.fields).toBeUndefined()
    })
  })

  test('a concept whose workbook was never supplied says which one', () => {
    const missing = withTemplate.filter(c => forms.TEMPLATES_NOT_SUPPLIED.includes(c.captureTemplate))
    expect(missing.length).toBeGreaterThan(0)
    missing.forEach((c) => {
      const result = forms.captureForConcept(c)
      expect(result.supplied).toBe(false)
      expect(result.reason).toBe('template-not-supplied')
      expect(result.template).toBe(c.captureTemplate)
    })
  })
})

describe('every supplied table produces fields an advisor can actually type into', () => {
  const supplied = withTemplate
    .map(c => ({ concept: c, capture: forms.captureForConcept(c) }))
    .filter(r => r.capture.supplied)

  test('there is at least one, and each has fields', () => {
    expect(supplied.length).toBeGreaterThan(0)
    supplied.forEach((r) => {
      expect(r.capture.fields.length).toBeGreaterThan(0)
    })
  })

  test('field keys are unique within a concept, or a save overwrites its neighbour', () => {
    supplied.forEach((r) => {
      const keys = r.capture.fields.map(f => f.key)
      expect(new Set(keys).size).toBe(keys.length)
    })
  })

  test('no table is so large it is a spreadsheet rather than a form', () => {
    // The Org Chart workbook's second sheet is its first transposed into a chart
    // layout. Read as a form it produced 1,126 fields nobody types into, and this
    // is what catches the next one rather than a person noticing on screen.
    const oversized = supplied
      .filter(r => r.capture.fields.length > 400)
      .map(r => r.concept.id + ': ' + r.capture.fields.length)
    expect(oversized).toEqual([])
  })

  test('every field key belongs to exactly one part', () => {
    supplied.forEach((r) => {
      const inParts = []
      r.capture.parts.forEach(p => p.fieldKeys.forEach(k => inParts.push(k)))
      expect(inParts.slice().sort()).toEqual(r.capture.fields.map(f => f.key).sort())
    })
  })
})

describe('Porter\'s is captured TWICE, which is the whole reason parts exist', () => {
  const porters = concepts.find(c => c.id === 'porters-5-forces')
  const capture = forms.captureForConcept(porters)

  test('it splits into two parts', () => {
    // Pivot puts Porter's on page 11 for "record your observations ONLY. (For Now)"
    // and on page 21 for the responses. One part means the second visit has nowhere
    // of its own to write and the first visit is overwritten.
    expect(capture.parts.length).toBe(2)
  })

  test('the two parts are different fields, not the same ones twice', () => {
    const [first, second] = capture.parts
    const overlap = first.fieldKeys.filter(k => second.fieldKeys.includes(k))
    expect(overlap).toEqual([])
    expect(first.fieldKeys.length).toBeGreaterThan(0)
    expect(second.fieldKeys.length).toBeGreaterThan(0)
  })

  test('the second part is the response columns', () => {
    // This one string is pinned deliberately: it is the column heading on Mike's own
    // Porter's table, and it is what tells the two visits apart. If it changes, the
    // split it drives has changed too and somebody must look.
    expect(capture.parts[1].label).toBe('How We Plan To Respond')
  })

  test('every response field sits under that heading and no observation field does', () => {
    const byKey = {}
    capture.fields.forEach((f) => { byKey[f.key] = f })
    capture.parts[1].fieldKeys.forEach((k) => {
      expect(byKey[k].columnLabel).toBe('How We Plan To Respond')
    })
    capture.parts[0].fieldKeys.forEach((k) => {
      expect(byKey[k].columnLabel).not.toBe('How We Plan To Respond')
    })
  })
})

describe('the extracted file is what the templates say', () => {
  test('re-reading the templates reproduces the committed data exactly', () => {
    // Not a file-exists check: it re-parses every .docx, .xlsx and .pptx and compares
    // the result. A template Mike edits, or an extractor change that quietly alters a
    // label, fails here. UAT cannot catch this — the screen looks fine either way.
    const { build } = require('../../scripts/read-capture-tables')
    expect(build()).toEqual(
      JSON.parse(JSON.stringify(captureTables))
    )
  })
})

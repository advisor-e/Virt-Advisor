'use strict'

// CB-02 (design/COURSE-BUILDER-PLAN.md): every resource name in an
// AI-generated outline must exist in the firm's real template library —
// invented names are dropped (and reported for logging), near-miss spellings
// are snapped to the library's exact title. The outline itself survives.

const { groundOutlineResources } = require('../../server/utils/outlineResources')

const TEMPLATES = [
  { title: 'Cafe' },
  { title: 'Quick & Worst' },
  { title: '5 Layers Questionnaire' }
]

function outlineWith (resources) {
  return {
    title: 'Course',
    sessions: [{ id: 1, title: 'S1', resources }]
  }
}

describe('groundOutlineResources (CB-02)', () => {
  test('keeps an exact library name', () => {
    const { outline, dropped } = groundOutlineResources(outlineWith(['Cafe']), TEMPLATES)
    expect(outline.sessions[0].resources).toEqual(['Cafe'])
    expect(dropped).toEqual([])
  })

  test('snaps case and whitespace near-misses to the library spelling', () => {
    const { outline, dropped } = groundOutlineResources(
      outlineWith(['  quick &   worst ', 'CAFE']), TEMPLATES
    )
    expect(outline.sessions[0].resources).toEqual(['Quick & Worst', 'Cafe'])
    expect(dropped).toEqual([])
  })

  test('drops invented names and reports them', () => {
    const { outline, dropped } = groundOutlineResources(
      outlineWith(['Cafe', 'Business Assessment Report']), TEMPLATES
    )
    expect(outline.sessions[0].resources).toEqual(['Cafe'])
    expect(dropped).toEqual(['Business Assessment Report'])
  })

  test('a session can lose every resource and the outline still survives', () => {
    const { outline, dropped } = groundOutlineResources(
      outlineWith(['Made Up One', 'Made Up Two']), TEMPLATES
    )
    expect(outline.sessions[0].resources).toEqual([])
    expect(dropped).toEqual(['Made Up One', 'Made Up Two'])
    expect(outline.title).toBe('Course')
  })

  test('a session without a resources array is left untouched', () => {
    const input = { title: 'Course', sessions: [{ id: 1, title: 'S1' }] }
    const { outline, dropped } = groundOutlineResources(input, TEMPLATES)
    expect(outline.sessions[0]).toEqual({ id: 1, title: 'S1' })
    expect(dropped).toEqual([])
  })

  test('does not mutate the input outline', () => {
    const input = outlineWith(['Cafe', 'Invented'])
    groundOutlineResources(input, TEMPLATES)
    expect(input.sessions[0].resources).toEqual(['Cafe', 'Invented'])
  })

  test('handles an empty or missing template set (everything drops)', () => {
    expect(groundOutlineResources(outlineWith(['Cafe']), []).dropped).toEqual(['Cafe'])
    expect(groundOutlineResources(outlineWith(['Cafe']), undefined).dropped).toEqual(['Cafe'])
  })

  test('handles an outline with no sessions array', () => {
    const { outline, dropped } = groundOutlineResources({ title: 'Course' }, TEMPLATES)
    expect(outline.sessions).toEqual([])
    expect(dropped).toEqual([])
  })

  test('non-string resource entries are dropped, not crashed on', () => {
    const { outline, dropped } = groundOutlineResources(outlineWith([null, 42, 'Cafe']), TEMPLATES)
    expect(outline.sessions[0].resources).toEqual(['Cafe'])
    expect(dropped).toEqual(['null', '42'])
  })
})

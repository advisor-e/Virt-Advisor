'use strict'

// CB-02 (design/COURSE-BUILDER-PLAN.md): every resource name in an
// AI-generated outline must exist in the firm's real template library —
// invented names are dropped (and reported for logging), near-miss spellings
// are snapped to the library's exact title. The outline itself survives.

const { groundOutlineResources, templatePageUrl } = require('../../server/utils/outlineResources')

const TEMPLATES = [
  { title: 'Cafe', link: 'id-1111', section: 'Do the Job' },
  { title: 'Quick & Worst' }, // no page-link id → grounded but unlinked
  { title: '5 Layers Questionnaire', link: 'id-2222', section: 'Get the Job' }
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

// ── CB-25: real Advisor-e page links on grounded resources ────────────────────

describe('templatePageUrl (CB-25)', () => {
  test('builds the confirmed pattern: base#link?type=section (lowercased + encoded)', () => {
    expect(templatePageUrl({ link: 'id-7154906006', section: 'Do the Job' }))
      .toBe('https://www.advisor-e.com/secure/dashboard#id-7154906006?type=do%20the%20job')
  })

  test('a record with no page-link id gets null — never a broken address', () => {
    expect(templatePageUrl({ title: 'X' })).toBeNull()
    expect(templatePageUrl({ link: '   ' })).toBeNull()
    expect(templatePageUrl(null)).toBeNull()
  })

  test('a missing section omits the type suffix rather than sending type=', () => {
    expect(templatePageUrl({ link: 'id-9' })).toBe('https://www.advisor-e.com/secure/dashboard#id-9')
  })
})

describe('groundOutlineResources resourceLinks (CB-25)', () => {
  test('linked templates get their page address; unlinked ones are grounded without one', () => {
    const { outline } = groundOutlineResources(outlineWith(['Cafe', 'Quick & Worst']), TEMPLATES)
    const s = outline.sessions[0]
    expect(s.resources).toEqual(['Cafe', 'Quick & Worst'])
    expect(s.resourceLinks).toEqual({
      Cafe: 'https://www.advisor-e.com/secure/dashboard#id-1111?type=do%20the%20job'
    })
  })

  test('a session with no linkable resources carries no resourceLinks key at all', () => {
    const { outline } = groundOutlineResources(outlineWith(['Quick & Worst']), TEMPLATES)
    expect(outline.sessions[0].resourceLinks).toBeUndefined()
  })

  test('links key on the CANONICAL library spelling, matching the snapped resource name', () => {
    const { outline } = groundOutlineResources(outlineWith(['  cafe ']), TEMPLATES)
    const s = outline.sessions[0]
    expect(s.resources).toEqual(['Cafe'])
    expect(Object.keys(s.resourceLinks)).toEqual(['Cafe'])
  })
})

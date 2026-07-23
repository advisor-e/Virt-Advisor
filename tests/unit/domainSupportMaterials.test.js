'use strict'

// Job 1 of the firm-editable tables build (FIRM-EDITABLE-TABLES-PLAN.md §0.5):
// EOY domain-support content re-authored to the four-column shape
// (name / summary / who & when / steps), stored under `materials`. These tests
// lock the engine reader: the four-column shape renders in all three formatters,
// EOY carries its four materials, and domains still on the legacy `support_tools`
// shape are rendered by the untouched fallback branch.

const {
  formatDomainSupportForPrompt,
  formatDomainContextForSession,
  formatDomainSummaryForDesign
} = require('../../server/utils/domainSupport')

describe('domain-support four-column materials shape — EOY (§0.5)', () => {
  test('the EOY briefing renders all four materials with who & when and numbered steps', () => {
    const block = formatDomainSupportForPrompt('eoy')
    expect(block).toContain('## Domain Support Reference')
    for (const name of ['EOY Meeting Agenda', 'Basic Targets', 'EOY Rural Meeting', 'EOY Advisor Scripts Only']) {
      expect(block).toContain(`### ${name}`)
    }
    expect(block).toContain('**Who & when it suits:**')
    expect(block).toContain('**How to use it:**')
    expect(block).toMatch(/1\. Set the agenda/)
  })

  test('EOY no longer injects the legacy rich buckets (advisor_guidance section)', () => {
    const block = formatDomainSupportForPrompt('eoy')
    expect(block).not.toContain('### Advisor Guidance')
  })

  test('the course session context renders a material matched by resource name', () => {
    const ctx = formatDomainContextForSession('eoy', ['Basic Targets'])
    expect(ctx).toContain('### Basic Targets')
    expect(ctx).toContain('**How to use it:**')
  })

  test('with no matching resource name, the session context falls back to the first material', () => {
    const ctx = formatDomainContextForSession('eoy', ['nothing-matches-here'])
    expect(ctx).toContain('### EOY Meeting Agenda')
  })

  test('the design summary lists the four materials as teaching frameworks and keeps the not-a-resource guard', () => {
    const summary = formatDomainSummaryForDesign('eoy')
    expect(summary).toContain('- **EOY Meeting Agenda**')
    expect(summary).toContain('these are NOT resource names')
    expect(summary).toContain('must come only from the "Available templates and resources" list')
  })
})

describe('domain-support legacy support_tools shape — regression guard', () => {
  test('a domain still on the legacy shape renders through the original rich renderer, not the four-column one', () => {
    const block = formatDomainSupportForPrompt('profit')
    expect(block).toBeTruthy()
    expect(block).toContain('## Domain Support Reference')
    // The four-column renderer is the only place this label appears.
    expect(block).not.toContain('**How to use it:**')
  })
})

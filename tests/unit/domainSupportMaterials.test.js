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

  // Both of these replace earlier tests that pinned the removed name-matching
  // filter ("renders a material matched by resource name" / "falls back to the
  // first material"). That filter was the P1 defect, not a feature: material
  // names are teaching concepts, not template names, so the match could not work
  // and its slice(0, 1) fallback silently hid the failure.
  test('the course session context renders EVERY material for the domain, not a matched subset', () => {
    const ctx = formatDomainContextForSession('eoy')
    const eoy = require('../../data/eoy-domain-support.json')
    expect(eoy.materials.length).toBeGreaterThan(1)
    eoy.materials.forEach(m => expect(ctx).toContain(`### ${m.name}`))
    expect(ctx).toContain('**How to use it:**')
  })

  test('the session context no longer depends on session resource names', () => {
    // The old signature took resourceNames second; passing anything there must
    // not change the output, which is the direct proof the coupling is gone.
    expect(formatDomainContextForSession('eoy')).toBe(formatDomainContextForSession('eoy', undefined))
    expect(formatDomainContextForSession('eoy')).toContain('### Basic Targets')
  })

  test('the design summary lists the four materials as teaching frameworks and keeps the not-a-resource guard', () => {
    const summary = formatDomainSummaryForDesign('eoy')
    expect(summary).toContain('- **EOY Meeting Agenda**')
    expect(summary).toContain('these are NOT resource names')
    expect(summary).toContain('must come only from the "Available templates and resources" list')
  })
})

describe('domain-support legacy support_tools shape — regression guard', () => {
  // Every repo file is now on the four-column shape (content migration completed
  // 2026-07-29), so this guard can no longer point at a real domain — it drives
  // the fallback through a firm override instead. `materials: []` is what selects
  // the legacy branch: arrays merge wholesale, so an override emptying `materials`
  // and supplying `support_tools` reproduces the pre-migration shape exactly.
  // The branch still has to work: a firm override can carry it at any time.
  const legacyShape = {
    materials: [],
    support_tools: [{
      name: 'Legacy Tool',
      purpose: 'A tool still described in the pre-§0.5 rich shape.',
      core_principle: 'The original renderer must keep working.',
      when_to_use: 'Whenever an entry carries no four-column materials.'
    }]
  }

  test('an entry still on the legacy shape renders through the original rich renderer, not the four-column one', () => {
    const block = formatDomainSupportForPrompt('profit', { profit: legacyShape })
    expect(block).toBeTruthy()
    expect(block).toContain('## Domain Support Reference')
    expect(block).toContain('### Legacy Tool')
    expect(block).toContain('**Purpose:**')
    // The four-column renderer is the only place this label appears.
    expect(block).not.toContain('**How to use it:**')
  })
})

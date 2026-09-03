'use strict'

const { machineFor, handoverDate, assess, reportLines } = require('../../scripts/active-items')

/**
 * The active-items check (Mike, 2026-09-03: "the to do list should show which task is
 * currently active by which computer", after 4.54 was built on both machines in a week).
 *
 * The field is written by sessions, so the thing that can go wrong is that it goes stale.
 * The verdict that matters is `stale`: a session on this machine shut down, wrote a
 * handover dated after the item was picked up, and never mentioned it. The properties
 * pinned here are the negative ones — never call the other machine's item mine, never
 * call a fresh claim stale, and say nothing at all when nothing is active.
 */
const item = (ref, activeOn, over) => Object.assign({ ref, name: 'Item ' + ref, touches: 'a.js', activeOn }, over)

describe('active-items — which computer a branch is', () => {
  it('knows the two machines by their branches, and nothing else', () => {
    expect(machineFor('feat/firm-quiz-builder-ui')).toBe('desktop')
    expect(machineFor('feat/advisor-progress')).toBe('laptop')
    expect(machineFor('master')).toBeNull()
    expect(machineFor('chore/anything')).toBeNull()
  })
})

describe('active-items — the handover date', () => {
  it('reads the first dated heading, which is the latest session', () => {
    expect(handoverDate('# Handover\n\n## 2026-09-03 · Laptop · branch x\n\ntext')).toBe('2026-09-03')
  })
  it('is null when the file has no dated heading', () => {
    expect(handoverDate('# Handover\n\nnothing yet')).toBeNull()
    expect(handoverDate('')).toBeNull()
  })
})

describe('active-items — the verdicts', () => {
  it('says nothing about items nobody is on', () => {
    expect(assess([item('1.1', null), item('1.2', undefined)], 'desktop', '2026-09-03', '')).toEqual([])
  })

  it('calls the other machine\'s item "other", whatever the handover says', () => {
    const v = assess([item('4.61', { machine: 'laptop', since: '2026-09-03' })], 'desktop', '2026-09-09', '4.61 done')
    expect(v).toHaveLength(1)
    expect(v[0].verdict).toBe('other')
    expect(v[0].touches).toBe('a.js')
  })

  it('calls my item "mine" while my handover is not newer than the pick-up', () => {
    const on = { machine: 'desktop', since: '2026-09-03' }
    expect(assess([item('4.59', on)], 'desktop', '2026-09-03', '')[0].verdict).toBe('mine')
    expect(assess([item('4.59', on)], 'desktop', '2026-09-02', '')[0].verdict).toBe('mine')
    expect(assess([item('4.59', on)], 'desktop', null, '')[0].verdict).toBe('mine')
  })

  it('calls my item "stale" when my handover is dated later and never mentions it', () => {
    const on = { machine: 'desktop', since: '2026-09-03' }
    expect(assess([item('4.59', on)], 'desktop', '2026-09-04', 'Suite green. Nothing open.')[0].verdict).toBe('stale')
  })

  it('does NOT call it stale when the later handover still names it', () => {
    const on = { machine: 'desktop', since: '2026-09-03' }
    expect(assess([item('4.59', on)], 'desktop', '2026-09-04', '4.59 is half done, resume tomorrow')[0].verdict).toBe('mine')
  })

  it('treats an unknown branch as no machine at all — everything is "other"', () => {
    const v = assess([item('4.59', { machine: 'desktop', since: '2026-09-03' })], null, '2026-09-09', '')
    expect(v[0].verdict).toBe('other')
  })
})

describe('active-items — the report', () => {
  it('prints nothing when nothing is active, so the caller prints no box', () => {
    expect(reportLines([], 'desktop')).toBeNull()
    expect(reportLines(null, 'desktop')).toBeNull()
  })

  it('names the other machine, the date, and the files that are off limits', () => {
    const lines = reportLines(assess([item('4.61', { machine: 'laptop', since: '2026-09-03' }, { touches: 'server/routes/report.js' })], 'desktop', null, ''), 'desktop').join('\n')
    expect(lines).toContain('4.61')
    expect(lines).toContain('ACTIVE ON THE LAPTOP since 2026-09-03')
    expect(lines).toContain('server/routes/report.js')
  })

  it('says a stale claim is stale, and what to do', () => {
    const lines = reportLines(assess([item('4.59', { machine: 'desktop', since: '2026-09-01' })], 'desktop', '2026-09-03', ''), 'desktop').join('\n')
    expect(lines).toContain('does not mention it')
    expect(lines).toContain('clear `activeOn`')
  })
})

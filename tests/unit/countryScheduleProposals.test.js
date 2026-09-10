'use strict'

/**
 * Item 4.92, slice 3 — the pending-read record.
 *
 * WHAT THESE TESTS ARE FOR. A person in UAT loading one schedule sees a progress bar and then a
 * table, and none of the following is visible to them:
 *
 *   - that a proposal can never be searched or reach a forecast until it is approved;
 *   - that approval is the ONE gate, and puts the proposal through the approved store's own
 *     checker rather than trusting it;
 *   - that a read whose process died looks exactly like a read still working, unless something
 *     names the difference.
 *
 * Each is a wrong table or a stuck screen that would look perfectly fine right up until a
 * client acted on it.
 */

const p = require('../../server/utils/countryScheduleProposals')

const NOW = new Date('2026-09-11T12:00:00.000Z')

/** One class the reading produced. */
function aClass (over) {
  return Object.assign({
    label: 'Tractors (wheeled)',
    method: 'dv',
    dvRate: 0.13,
    slRate: 0.085,
    lifeYears: 15.5,
    source: { document: 'IR265', page: '9', published: '2023-10' }
  }, over || {})
}

/** A finished reading, as `countryScheduleRead` hands one back. */
function aReading (over) {
  return Object.assign({
    country: 'NZ',
    document: 'IR265 — General depreciation rates',
    published: '2023-10',
    totalPages: 52,
    firstYearRuleFound: false,
    pagesRead: [{ from: 1, to: 8 }],
    pagesUnread: [],
    classes: [aClass()],
    unresolved: [],
    refusedRows: 0,
    outOfRange: 0,
    passesPlanned: 7
  }, over || {})
}

/** A record that has just been started. */
function started () {
  return p.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: 'm@advisor-e.com', now: NOW })
}

describe('configKeyFor', () => {
  it('gives one key per country, so two countries never race', () => {
    expect(p.configKeyFor('nz')).toBe(p.CONFIG_KEY_PREFIX + 'NZ')
    expect(p.configKeyFor('New Zealand')).toBeNull()
  })
})

describe('startedRecord', () => {
  it('starts in reading, proposing nothing and deciding nothing', () => {
    const r = started()
    expect(r.status).toBe('reading')
    expect(r.reading).toBeNull()
    expect(r.decidedAt).toBeNull()
    expect(r.country).toBe('NZ')
    expect(r.loadedBy).toBe('m@advisor-e.com')
  })

  it('gives each read its own id', () => {
    expect(started().id).not.toBe(started().id)
  })
})

describe('withProgress', () => {
  it('takes the document, edition, extent and pass count from the survey', () => {
    const r = p.withProgress(started(), {
      state: 'surveyed', document: 'IR265', published: '2023-10', totalPages: 52, passes: 7
    }, NOW)
    expect(r.documentName).toBe('IR265')
    expect(r.published).toBe('2023-10')
    expect(r.totalPages).toBe(52)
    expect(r.passesPlanned).toBe(7)
    expect(r.status).toBe('reading')
  })

  it('counts passes done and classes so far', () => {
    const r = p.withProgress(started(), { state: 'pass-done', pass: 3, of: 7, classes: 812 }, NOW)
    expect(r.passesDone).toBe(3)
    expect(r.classesSoFar).toBe(812)
  })

  it('counts a failed pass separately, so a screen can say a range was missed', () => {
    let r = p.withProgress(started(), { state: 'pass-failed', pass: 2, classes: 300 }, NOW)
    r = p.withProgress(r, { state: 'pass-failed', pass: 5, classes: 700 }, NOW)
    expect(r.passesFailed).toBe(2)
  })

  it('NEVER moves a record out of reading, however odd the report', () => {
    // Finishing is a separate act. A malformed report must not mark a half-read schedule as
    // ready for a manager to approve.
    ;[{ state: 'pending' }, { status: 'pending' }, null, 'done', { state: 'pass-done', pass: 99 }]
      .forEach((report) => {
        expect(p.withProgress(started(), report, NOW).status).toBe('reading')
      })
  })

  it('moves updatedAt on, which is what tells a live read from a dead one', () => {
    const later = new Date(NOW.getTime() + 60000)
    expect(p.withProgress(started(), { state: 'pass-done', pass: 1 }, later).updatedAt)
      .toBe(later.toISOString())
  })

  it('does not mutate the record it was given', () => {
    const before = started()
    p.withProgress(before, { state: 'pass-done', pass: 4, classes: 9 }, NOW)
    expect(before.passesDone).toBe(0)
  })
})

describe('withResult', () => {
  it('moves a finished read to pending and keeps what was read', () => {
    const r = p.withResult(started(), aReading(), null, NOW)
    expect(r.status).toBe('pending')
    expect(r.reading.classes).toHaveLength(1)
    expect(r.published).toBe('2023-10')
    expect(r.error).toBeNull()
  })

  it('moves a read that produced nothing to failed, and records why', () => {
    const r = p.withResult(started(), null, { code: 'NOTHING_READ', message: 'no classes' }, NOW)
    expect(r.status).toBe('failed')
    expect(r.reading).toBeNull()
    expect(r.error.code).toBe('NOTHING_READ')
  })

  it('does not mutate the record it was given', () => {
    const before = started()
    p.withResult(before, aReading(), null, NOW)
    expect(before.status).toBe('reading')
  })
})

describe('isStale', () => {
  it('is false for a read that is still making progress', () => {
    const r = p.withProgress(started(), { state: 'pass-done', pass: 1 }, NOW)
    expect(p.isStale(r, new Date(NOW.getTime() + 60000))).toBe(false)
  })

  it('is true for a read that has said nothing for longer than any pass takes', () => {
    // A restart loses the passes and the allowance was already spent. Without this the manager
    // watches a bar that will never move.
    expect(p.isStale(started(), new Date(NOW.getTime() + p.STALE_AFTER_MS))).toBe(true)
  })

  it('is false for anything that is not a running read', () => {
    expect(p.isStale(p.withResult(started(), aReading(), null, NOW), new Date(NOW.getTime() + 864e5))).toBe(false)
    expect(p.isStale(null)).toBe(false)
  })

  it('treats an unreadable timestamp as stale rather than as fresh', () => {
    expect(p.isStale(Object.assign(started(), { updatedAt: 'whenever' }), NOW)).toBe(true)
  })
})

describe('validateProposal', () => {
  it('accepts a record it wrote itself', () => {
    const { ok, value } = p.validateProposal(p.withResult(started(), aReading(), null, NOW))
    expect(ok).toBe(true)
    expect(value.status).toBe('pending')
  })

  it('refuses a record with no id, filename, country, status or load date', () => {
    const good = started()
    expect(p.validateProposal(Object.assign({}, good, { id: '' })).ok).toBe(false)
    expect(p.validateProposal(Object.assign({}, good, { filename: '' })).ok).toBe(false)
    expect(p.validateProposal(Object.assign({}, good, { country: 'New Zealand' })).ok).toBe(false)
    expect(p.validateProposal(Object.assign({}, good, { status: 'nearly' })).ok).toBe(false)
    expect(p.validateProposal(Object.assign({}, good, { loadedAt: 'today' })).ok).toBe(false)
  })

  it('refuses a record filed under a different country from the one it names', () => {
    const { ok } = p.validateProposal(started(), { expectCountry: 'AU' })
    expect(ok).toBe(false)
  })

  it('refuses an edition date it cannot rank', () => {
    expect(p.validateProposal(Object.assign(started(), { published: 'Oct 2023' })).ok).toBe(false)
  })

  it('refuses anything that is not an object', () => {
    expect(p.validateProposal(null).ok).toBe(false)
    expect(p.validateProposal([started()]).ok).toBe(false)
  })
})

describe('toApproved — the one gate into the approved store', () => {
  it('adds the approver and the date, and passes the approved store\'s own checker', () => {
    const pending = p.withResult(started(), aReading(), null, NOW)
    const { ok, value } = p.toApproved(pending, 'm@advisor-e.com', NOW)
    expect(ok).toBe(true)
    expect(value.approvedBy).toBe('m@advisor-e.com')
    expect(value.approvedAt).toBe(NOW.toISOString())
    expect(value.classes).toHaveLength(1)
  })

  it('carries the unread page ranges through, so the gap survives approval', () => {
    // Mike's second ruling: the gap shows wherever the table is used. It would be lost here if
    // approval rebuilt the schedule from the classes alone.
    const pending = p.withResult(started(), aReading({ pagesUnread: [{ from: 41, to: 48 }] }), null, NOW)
    const { value } = p.toApproved(pending, 'm@advisor-e.com', NOW)
    expect(value.pagesUnread).toEqual([{ from: 41, to: 48 }])
  })

  it('refuses a proposal whose classes no longer pass the approved store\'s checks', () => {
    // A rate in the wrong unit is refused at the gate rather than silently serving a broken
    // table to every firm in the group afterwards.
    const pending = p.withResult(started(), aReading({ classes: [aClass({ dvRate: 13 })] }), null, NOW)
    expect(p.toApproved(pending, 'm@advisor-e.com', NOW).ok).toBe(false)
  })

  it('refuses a read that is still running, one that failed, and one already decided', () => {
    expect(p.toApproved(started(), 'm@advisor-e.com', NOW).ok).toBe(false)
    expect(p.toApproved(p.withResult(started(), null, { code: 'NOTHING_READ' }, NOW), 'm@advisor-e.com', NOW).ok).toBe(false)
    const decided = p.withDecision(p.withResult(started(), aReading(), null, NOW), 'approved', 'm@advisor-e.com', NOW)
    expect(p.toApproved(decided, 'm@advisor-e.com', NOW).ok).toBe(false)
  })

  it('refuses when the approver cannot be identified', () => {
    const pending = p.withResult(started(), aReading(), null, NOW)
    expect(p.toApproved(pending, '', NOW).ok).toBe(false)
    expect(p.toApproved(pending, null, NOW).ok).toBe(false)
  })

  it('refuses a nonexistent proposal', () => {
    expect(p.toApproved(null, 'm@advisor-e.com', NOW).ok).toBe(false)
  })
})

describe('withDecision', () => {
  it('records who decided and when', () => {
    const r = p.withDecision(p.withResult(started(), aReading(), null, NOW), 'rejected', 'm@advisor-e.com', NOW)
    expect(r.status).toBe('rejected')
    expect(r.decidedBy).toBe('m@advisor-e.com')
    expect(r.decidedAt).toBe(NOW.toISOString())
  })

  it('drops the 2,800 rows once decided — the approved copy lives in the approved store', () => {
    const r = p.withDecision(p.withResult(started(), aReading(), null, NOW), 'approved', 'm@advisor-e.com', NOW)
    expect(r.reading).toBeNull()
  })

  it('does not mutate the record it was given', () => {
    const before = p.withResult(started(), aReading(), null, NOW)
    p.withDecision(before, 'approved', 'm@advisor-e.com', NOW)
    expect(before.status).toBe('pending')
  })
})

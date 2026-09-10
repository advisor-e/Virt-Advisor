'use strict'

/**
 * outcomeLearning — the guard at 100%, and arithmetic checked by hand (4.87 T011/T012).
 *
 * What UAT cannot see: a row that carries a name into the pool, a floor that is off by
 * one firm, a hold-back that rounds the wrong way, and a withdrawn firm still counted.
 */

const {
  MIN_FIRMS,
  MIN_CASES,
  POOLED_HOLDBACK_MAX,
  POOL_PREFIX,
  DECISIONS_KEY,
  buildContribution,
  guardContribution,
  adjustmentId,
  computeAdjustments,
  liveAdjustments
} = require('../../server/utils/outcomeLearning')

const LIB = ['Break-even Analysis', 'Cashflow Forecast', 'Pricing Review']
const SIGNALS = ['sales_volume', 'client_awareness', 'staff_issue_scope']
const VOCAB = { libraryTitles: LIB, signalTypes: SIGNALS }
// A label from data/primary-issues.json under 'profit', as authored.
const PROFIT_ISSUE = 'Cost of sales has increased'

const row = (over = {}) => ({
  v: 1,
  month: '2026-09',
  domain: 'profit',
  primaryIssue: PROFIT_ISSUE,
  industry: 'cafe',
  signals: ['sales_volume'],
  engagementType: 'advice',
  staircaseStep: 'as-interpretation',
  templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'well' }],
  ...over
})

const refuses = (input, code, vocab = VOCAB) => {
  let thrown = null
  let returned
  try { returned = guardContribution(input, vocab) } catch (e) { thrown = e }
  expect(returned).toBeUndefined()
  expect(thrown).not.toBeNull()
  expect(thrown.code).toBe('OUTCOME_GUARD_' + code)
}

describe('constants', () => {
  test('are the ruled values', () => {
    expect(MIN_FIRMS).toBe(5)
    expect(MIN_CASES).toBe(25)
    expect(POOLED_HOLDBACK_MAX).toBe(10)
    expect(POOL_PREFIX).toBe('outcome-pool:')
    expect(DECISIONS_KEY).toBe('outcome-adjustments')
  })
})

describe('guardContribution', () => {
  test('returns the exact object on a valid row, with every optional field null too', () => {
    const r = row()
    expect(guardContribution(r, VOCAB)).toBe(r)
    const bare = row({ primaryIssue: null, industry: null, staircaseStep: null, signals: [], templates: [{ title: 'break-even analysis', used: 'none', outcome: null }] })
    expect(guardContribution(bare, VOCAB)).toBe(bare)
  })

  test('tolerates a missing vocabulary object by refusing every title and signal', () => {
    refuses(row({ signals: [] }), 'TEMPLATE_TITLE', null)
    refuses(row(), 'SIGNALS', {})
  })

  test.each([
    ['null', null, 'NOT_OBJECT'],
    ['a string', 'row', 'NOT_OBJECT'],
    ['an array', [row()], 'NOT_OBJECT'],
    ['an unknown key', row({ clientName: 'Bob' }), 'UNKNOWN_KEY'],
    ['a missing key', (() => { const r = row(); delete r.industry; return r })(), 'MISSING_KEY'],
    ['the wrong shape version', row({ v: 2 }), 'VERSION'],
    ['a timestamp instead of a month', row({ month: '2026-09-10T00:00:00Z' }), 'MONTH'],
    ['month 13', row({ month: '2026-13' }), 'MONTH'],
    ['month not a string', row({ month: 202609 }), 'MONTH'],
    ['domain not a string', row({ domain: 7 }), 'DOMAIN'],
    ['domain unknown', row({ domain: 'astrology' }), 'DOMAIN'],
    ['primary issue not a string', row({ primaryIssue: 5 }), 'PRIMARY_ISSUE'],
    ['primary issue not an authored label', row({ primaryIssue: 'my client Bob is unhappy' }), 'PRIMARY_ISSUE'],
    ['primary issue from another domain', row({ domain: 'staff', primaryIssue: PROFIT_ISSUE }), 'PRIMARY_ISSUE'],
    ['industry not a string', row({ industry: 9 }), 'INDUSTRY'],
    ['industry over 40', row({ industry: 'x'.repeat(41) }), 'STRING_LENGTH'],
    ['signals not an array', row({ signals: 'sales_volume' }), 'SIGNALS'],
    ['a signal not a string', row({ signals: [4] }), 'SIGNALS'],
    ['a signal unknown', row({ signals: ['made_up'] }), 'SIGNALS'],
    ['engagement type not a string', row({ engagementType: null }), 'ENGAGEMENT_TYPE'],
    ['engagement type unknown', row({ engagementType: 'get' }), 'ENGAGEMENT_TYPE'],
    ['staircase step not a string', row({ staircaseStep: 3 }), 'STAIRCASE_STEP'],
    ['staircase step unknown', row({ staircaseStep: 'step-3' }), 'STAIRCASE_STEP'],
    ['templates not an array', row({ templates: {} }), 'TEMPLATES'],
    ['templates empty', row({ templates: [] }), 'TEMPLATES'],
    ['a template not an object', row({ templates: ['Break-even Analysis'] }), 'TEMPLATE'],
    ['a template that is an array', row({ templates: [['Break-even Analysis']] }), 'TEMPLATE'],
    ['a template with an extra key', row({ templates: [{ title: 'Break-even Analysis', used: 'full', outcome: null, note: 'x' }] }), 'TEMPLATE_KEY'],
    ['a template missing a key', row({ templates: [{ title: 'Break-even Analysis', used: 'full' }] }), 'TEMPLATE_KEY'],
    ['a title not a string', row({ templates: [{ title: 1, used: 'full', outcome: null }] }), 'TEMPLATE_TITLE'],
    ['a title over 255', row({ templates: [{ title: 'x'.repeat(256), used: 'full', outcome: null }] }), 'STRING_LENGTH'],
    ['a title not in the library', row({ templates: [{ title: 'Secret Plan', used: 'full', outcome: null }] }), 'TEMPLATE_TITLE'],
    ['used outside its list', row({ templates: [{ title: 'Break-even Analysis', used: 'mostly', outcome: null }] }), 'TEMPLATE_USED'],
    ['outcome outside its list', row({ templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'ok' }] }), 'TEMPLATE_OUTCOME']
  ])('refuses %s and returns nothing', (_label, input, code) => {
    refuses(input, code)
  })

  test.each([
    ['an email', 'bob@firm.example'],
    ['a URL', 'https://firm.example/case/1'],
    ['six digits', 'acct 123456'],
    ['a UUID', '3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
    ['an empty string', '']
  ])('refuses %s in any string field', (_label, bad) => {
    const code = bad === '' ? 'STRING_LENGTH' : 'STRING_CONTENT'
    refuses(row({ industry: bad }), code)
    refuses(row({ domain: bad }), code)
    refuses(row({ signals: [bad] }), code)
    refuses(row({ engagementType: bad }), code)
    refuses(row({ staircaseStep: bad }), code)
    refuses(row({ primaryIssue: bad }), code)
    refuses(row({ templates: [{ title: bad, used: 'full', outcome: null }] }), code)
  })

  test('refuses an over-long string in the 64 class', () => {
    refuses(row({ domain: 'x'.repeat(65) }), 'STRING_LENGTH')
    refuses(row({ primaryIssue: 'x'.repeat(121) }), 'STRING_LENGTH')
  })
})

describe('buildContribution', () => {
  const caseRow = (over = {}) => ({
    domain: 'profit',
    staircaseStep: 'as-interpretation',
    updatedAt: '2026-08-02T10:00:00Z',
    review: { reviewedAt: '2026-09-04T03:00:00Z' },
    templateOutcomes: [
      { title: 'break-even analysis', used: 'full', outcome: 'well' },
      { title: 'Cashflow Forecast', used: 'partial', outcome: 'less' }
    ],
    decisionTrace: {
      situation: { primaryIssue: PROFIT_ISSUE, industry: 'Cafe', clientName: 'Bob' },
      lenses: { engagementType: 'advice', signalTypes: ['sales_volume', 'sales_volume', 'unknown_signal'] }
    },
    ...over
  })

  test('copies only allow-listed fields, canonical titles, month only, and passes its own guard', () => {
    const out = buildContribution(caseRow(), LIB, SIGNALS, ['cafe', 'plumber'])
    expect(out).toEqual({
      v: 1,
      month: '2026-09',
      domain: 'profit',
      primaryIssue: PROFIT_ISSUE,
      industry: 'cafe',
      signals: ['sales_volume'],
      engagementType: 'advice',
      staircaseStep: 'as-interpretation',
      templates: [
        { title: 'Break-even Analysis', used: 'full', outcome: 'well' },
        { title: 'Cashflow Forecast', used: 'partial', outcome: 'less' }
      ]
    })
    expect(guardContribution(out, VOCAB)).toBe(out)
  })

  test('pools industry only on a vocabulary match, primary issue only on an authored label', () => {
    const out = buildContribution(caseRow(), LIB, SIGNALS, ['plumber'])
    expect(out.industry).toBeNull()
    const typed = buildContribution(caseRow({ decisionTrace: { situation: { primaryIssue: 'Bob is unhappy' }, lenses: {} } }), LIB, SIGNALS, [])
    expect(typed.primaryIssue).toBeNull()
    expect(typed.engagementType).toBeNull()
    expect(typed.signals).toEqual([])
  })

  test('returns null when there is nothing to pool', () => {
    expect(buildContribution(null, LIB, SIGNALS, [])).toBeNull()
    expect(buildContribution(caseRow({ templateOutcomes: null }), LIB, SIGNALS, [])).toBeNull()
    expect(buildContribution(caseRow({ templateOutcomes: [] }), LIB, SIGNALS, [])).toBeNull()
    expect(buildContribution(caseRow({ templateOutcomes: [{ title: 'Secret Plan', used: 'full', outcome: null }] }), LIB, SIGNALS, [])).toBeNull()
    expect(buildContribution(caseRow({ templateOutcomes: [null, 'x', { used: 'full' }, { title: 'Break-even Analysis', used: 'mostly' }] }), LIB, SIGNALS, [])).toBeNull()
  })

  test('drops a duplicate title, an unknown used value, and an unknown outcome', () => {
    const out = buildContribution(caseRow({
      templateOutcomes: [
        { title: 'Break-even Analysis', used: 'full', outcome: 'ok' },
        { title: 'BREAK-EVEN ANALYSIS', used: 'full', outcome: 'well' },
        { title: 'Pricing Review', used: 'sort of', outcome: 'well' }
      ]
    }), LIB, SIGNALS, [])
    expect(out.templates).toEqual([{ title: 'Break-even Analysis', used: 'full', outcome: null }])
  })

  test('takes the domain from the trace when the row has none, and the step from a number', () => {
    const out = buildContribution(caseRow({ domain: null, staircaseStep: 3, decisionTrace: { domain: { id: 'staff' }, lenses: {} } }), LIB, SIGNALS, [])
    expect(out.domain).toBe('staff')
    expect(out.staircaseStep).toBe('as-interpretation')
    const none = buildContribution(caseRow({ domain: null, staircaseStep: 'nine', decisionTrace: null }), LIB, SIGNALS, [])
    expect(none.domain).toBeNull()
    expect(none.staircaseStep).toBeNull()
  })

  test('falls back for the month: updatedAt, then now, never a full timestamp', () => {
    expect(buildContribution(caseRow({ review: null }), LIB, SIGNALS, []).month).toBe('2026-08')
    const now = buildContribution(caseRow({ review: null, updatedAt: 'garbage' }), LIB, SIGNALS, []).month
    expect(now).toMatch(/^\d{4}-\d{2}$/)
    const noneAtAll = buildContribution(caseRow({ review: null, updatedAt: null }), LIB, SIGNALS, []).month
    expect(noneAtAll).toMatch(/^\d{4}-\d{2}$/)
  })

  test('tolerates absent vocabularies', () => {
    const out = buildContribution(caseRow(), LIB, undefined, undefined)
    expect(out.signals).toEqual([])
    expect(out.industry).toBeNull()
    expect(buildContribution(caseRow(), undefined, SIGNALS, [])).toBeNull()
  })
})

describe('adjustmentId', () => {
  test('slugs the title and value around a fixed dimension', () => {
    expect(adjustmentId('Break-even Analysis', 'domain', 'profit')).toBe('break-even-analysis|domain|profit')
    expect(adjustmentId('  Cashflow  Forecast! ', 'signal', 'Sales Volume')).toBe('cashflow-forecast|signal|sales-volume')
  })
})

describe('computeAdjustments', () => {
  // Build a pool: `firms` distinct tokens, `cases` rows spread across them, `less` of the
  // delivered outcomes marked less, the rest well.
  const pool = ({ firms, cases, less, used = 'full', title = 'Break-even Analysis', extra = {} }) => {
    const rows = {}
    for (let i = 0; i < cases; i++) {
      const token = 'firm' + (i % firms)
      rows[token + ':case' + i] = {
        v: 1,
        month: '2026-09',
        domain: 'profit',
        primaryIssue: null,
        industry: null,
        signals: [],
        engagementType: 'advice',
        staircaseStep: null,
        templates: [{ title, used, outcome: i < less ? 'less' : 'well' }],
        ...extra
      }
    }
    return rows
  }
  const byId = (list, id) => list.find(a => a.id === id)

  test('hand-checked: 31 delivered, 12 less, 6 firms -> hold-back 4, proposed', () => {
    const out = computeAdjustments(pool({ firms: 6, cases: 31, less: 12 }), null, LIB)
    const a = byId(out, 'break-even-analysis|domain|profit')
    expect(a).toMatchObject({ template: 'Break-even Analysis', dimension: 'domain', value: 'profit', delivered: 31, less: 12, well: 19, firms: 6, cases: 31, holdBack: 4, meetsFloor: true, state: 'proposed', decision: null })
    expect(byId(out, 'break-even-analysis|engagementType|advice')).toMatchObject({ delivered: 31, holdBack: 4 })
  })

  test('the floor on both edges', () => {
    expect(byId(computeAdjustments(pool({ firms: 4, cases: 25, less: 5 }), null, LIB), 'break-even-analysis|domain|profit')).toMatchObject({ firms: 4, cases: 25, meetsFloor: false, state: 'below_floor' })
    expect(byId(computeAdjustments(pool({ firms: 5, cases: 24, less: 5 }), null, LIB), 'break-even-analysis|domain|profit')).toMatchObject({ firms: 5, cases: 24, meetsFloor: false, state: 'below_floor' })
    expect(byId(computeAdjustments(pool({ firms: 5, cases: 25, less: 5 }), null, LIB), 'break-even-analysis|domain|profit')).toMatchObject({ firms: 5, cases: 25, meetsFloor: true, state: 'proposed' })
  })

  test('one prolific firm cannot meet the firm floor', () => {
    const a = byId(computeAdjustments(pool({ firms: 1, cases: 200, less: 100 }), null, LIB), 'break-even-analysis|domain|profit')
    expect(a).toMatchObject({ firms: 1, cases: 200, holdBack: 5, meetsFloor: false, state: 'below_floor' })
  })

  test('hold-back 0 is listed and applies nothing', () => {
    const out = computeAdjustments(pool({ firms: 6, cases: 30, less: 0 }), { 'break-even-analysis|domain|profit': { state: 'live' } }, LIB)
    expect(byId(out, 'break-even-analysis|domain|profit')).toMatchObject({ holdBack: 0, state: 'live' })
    expect(liveAdjustments(out)).toEqual([])
  })

  test('below_floor overrides a live decision; live comes only from an explicit decision', () => {
    const decisions = { 'break-even-analysis|domain|profit': { state: 'live', by: 'mentor', at: 'x', reason: '' } }
    expect(byId(computeAdjustments(pool({ firms: 4, cases: 30, less: 10 }), decisions, LIB), 'break-even-analysis|domain|profit').state).toBe('below_floor')
    const live = computeAdjustments(pool({ firms: 6, cases: 30, less: 10 }), decisions, LIB)
    expect(byId(live, 'break-even-analysis|domain|profit')).toMatchObject({ state: 'live', holdBack: 3 })
    expect(liveAdjustments(live)).toEqual([{ id: 'break-even-analysis|domain|profit', template: 'Break-even Analysis', dimension: 'domain', value: 'profit', holdBack: 3, firms: 6, cases: 30 }])
    expect(byId(computeAdjustments(pool({ firms: 6, cases: 30, less: 10 }), { 'break-even-analysis|domain|profit': { state: 'maybe' } }, LIB), 'break-even-analysis|domain|profit').state).toBe('proposed')
    expect(byId(computeAdjustments(pool({ firms: 6, cases: 30, less: 10 }), { 'break-even-analysis|domain|profit': { state: 'held' } }, LIB), 'break-even-analysis|domain|profit').state).toBe('held')
  })

  test('orphaned when the title is gone from the library, even with a live decision', () => {
    const decisions = { 'old-thing|domain|profit': { state: 'live' } }
    const out = computeAdjustments(pool({ firms: 6, cases: 30, less: 10, title: 'Old Thing' }), decisions, LIB)
    expect(byId(out, 'old-thing|domain|profit')).toMatchObject({ template: 'Old Thing', state: 'orphaned' })
    expect(liveAdjustments(out)).toEqual([])
  })

  test('a decision with no evidence behind it is shown, never dropped', () => {
    const decisions = {
      'break-even-analysis|domain|profit': { state: 'live', template: 'Break-even Analysis', value: 'profit' },
      'gone-template|signal|sales-volume': { state: 'held' },
      'not-an-id': { state: 'live' },
      'x|nope|y': { state: 'live' },
      'null-decision|domain|profit': null
    }
    const out = computeAdjustments({}, decisions, LIB)
    expect(byId(out, 'break-even-analysis|domain|profit')).toMatchObject({ template: 'Break-even Analysis', dimension: 'domain', value: 'profit', delivered: 0, firms: 0, state: 'below_floor' })
    expect(byId(out, 'gone-template|signal|sales-volume')).toMatchObject({ template: null, dimension: 'signal', value: 'sales-volume', state: 'orphaned' })
    expect(byId(out, 'not-an-id')).toBeUndefined()
    expect(byId(out, 'x|nope|y')).toBeUndefined()
    expect(byId(out, 'null-decision|domain|profit')).toMatchObject({ template: null, state: 'orphaned' })
  })

  test('counts only delivered templates, every dimension, and firms as distinct tokens', () => {
    const rows = {
      'firmA:c1': { domain: 'profit', industry: 'cafe', engagementType: 'advice', signals: ['sales_volume', 7], templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'less' }, { title: 'Pricing Review', used: 'none', outcome: 'well' }] },
      'firmA:c2': { domain: 'profit', templates: [{ title: 'Break-even Analysis', used: 'partial', outcome: null }] },
      'firmB:c3': { domain: 'profit', templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'well' }, null, { used: 'full' }] },
      ':c4': { domain: 'profit', templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'well' }] },
      'firmC:c5': null,
      'firmD:c6': { templates: 'nope' },
      'firmE:c7': { templates: [{ title: 'Pricing Review', used: 'full', outcome: 'well' }] }
    }
    const out = computeAdjustments(rows, undefined, LIB)
    expect(byId(out, 'break-even-analysis|domain|profit')).toMatchObject({ delivered: 3, less: 1, well: 1, firms: 2, holdBack: 3 })
    expect(byId(out, 'break-even-analysis|industry|cafe')).toMatchObject({ delivered: 1, firms: 1 })
    expect(byId(out, 'break-even-analysis|signal|sales-volume')).toMatchObject({ delivered: 1, value: 'sales_volume' })
    expect(byId(out, 'break-even-analysis|engagementType|advice')).toMatchObject({ delivered: 1 })
    expect(byId(out, 'pricing-review|domain|profit')).toBeUndefined()
  })

  test('is stable: sorted by hold-back then id, and tolerates garbage input', () => {
    const rows = {
      'f1:a': { domain: 'profit', templates: [{ title: 'Cashflow Forecast', used: 'full', outcome: 'less' }, { title: 'Break-even Analysis', used: 'full', outcome: 'well' }] },
      'f1:b': { domain: 'profit', templates: [{ title: 'Pricing Review', used: 'full', outcome: 'less' }] }
    }
    expect(computeAdjustments(rows, null, LIB).map(a => a.id)).toEqual([
      'cashflow-forecast|domain|profit', 'pricing-review|domain|profit', 'break-even-analysis|domain|profit'
    ])
    expect(computeAdjustments(null, 'x', null)).toEqual([])
    expect(liveAdjustments(null)).toEqual([])
    expect(liveAdjustments([null])).toEqual([])
  })
})

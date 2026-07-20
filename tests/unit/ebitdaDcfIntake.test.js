'use strict'

const { parseUpload, extractProfitLoss } = require('../../server/report/intake/xeroReportParser')
const { assembleAnnualReports } = require('../../server/report/intake/annualAssembler')
const { makeXlsx } = require('./xlsxFixture')

/**
 * EBITDA & DCF intake (Stage B, 2026-07-17): the P&L figure buckets the model needs,
 * the report-year read, and the 1..5-file annual assembly rules. The Quick Position
 * P&L contract (expenseLines, incomeTotal) is asserted unchanged.
 */

/** A realistic full-shape Xero P&L for one year. */
function plGrid (year, opts) {
  const o = opts || {}
  return [
    ['Profit and Loss'],
    [o.company || 'Kinetic Test Ltd'],
    ['For the year ended 31 March ' + year],
    [],
    ['Trading Income'],
    ['Sales', o.sales !== undefined ? o.sales : 500000],
    ['Total Trading Income', o.sales !== undefined ? o.sales : 500000],
    ['Less Cost of Sales'],
    ['Purchases', 300000],
    ['Freight Inwards', 20000],
    ['Total Cost of Sales', 320000],
    ['Other Income'],
    ['Interest Income', 1000],
    ['Dividends Received', 250],
    ['Bad Debts Recovered', 400],
    ['Sundry Income', 2000],
    ['Total Other Income', 3650],
    ['Less Operating Expenses'],
    ['Rent', 24000],
    ['Advertising', 32000],
    ['Interest Expense', 7500],
    ['Total Operating Expenses', 63500]
  ]
}

describe('P&L extraction — the EBITDA & DCF figure buckets', () => {
  const r = extractProfitLoss(plGrid(2025))

  test('still recognised, and the report year is read from its own date line', () => {
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('profitLoss')
    expect(r.year).toBe(2025)
  })

  test('sales = trading income only — interest/dividends/bad-debts never double-count', () => {
    expect(r.plFigures.sales.value).toBe(500000)
    expect(r.plFigures.sales.candidates).toEqual([{ label: 'Sales', value: 500000 }])
  })

  test('cost of sales sums its line items, never the Total row', () => {
    expect(r.plFigures.costOfSales.value).toBe(320000)
    expect(r.plFigures.costOfSales.candidates.length).toBe(2)
  })

  test('operating expenses INCLUDE interest paid (the model adds it back separately)', () => {
    expect(r.plFigures.operatingExpenses.value).toBe(63500)
    expect(r.plFigures.loanInterestPaid.value).toBe(7500)
  })

  test('other income excludes the specially-bucketed rows', () => {
    expect(r.plFigures.otherIncome.value).toBe(2000) // Sundry Income only
    expect(r.plFigures.interestReceived.value).toBe(1000)
    expect(r.plFigures.dividendsReceived.value).toBe(250)
    expect(r.plFigures.badDebtsRecovered.value).toBe(400)
  })

  test('the Quick Position contract is unchanged: expenseLines + incomeTotal', () => {
    expect(r.expenseLines).toEqual([
      { name: 'Rent', amount: 24000 },
      { name: 'Advertising', amount: 32000 },
      { name: 'Interest Expense', amount: 7500 }
    ])
    expect(r.incomeTotal).toBe(500000) // trading income, as before
  })

  test('a figure the file cannot supply is simply absent — never a guessed 0', () => {
    const bare = extractProfitLoss([
      ['Profit and Loss'],
      ['Kinetic Test Ltd'],
      ['For the year ended 31 March 2024'],
      ['Income'],
      ['Sales', 100000],
      ['Total Income', 100000]
    ])
    expect(bare.plFigures.sales.value).toBe(100000)
    expect(bare.plFigures.costOfSales).toBeUndefined()
    expect(bare.plFigures.loanInterestPaid).toBeUndefined()
  })

  test('no year in the date line -> year null (assigned on screen)', () => {
    const undated = extractProfitLoss([
      ['Profit and Loss'],
      ['Kinetic Test Ltd'],
      ['Income'],
      ['Sales', 100000]
    ])
    expect(undated.year).toBeNull()
  })
})

describe('parseUpload end-to-end — a real .xlsx P&L reaches the buckets', () => {
  test('xlsx bytes -> plFigures', () => {
    const r = parseUpload(makeXlsx(plGrid(2023)))
    expect(r.kind).toBe('profitLoss')
    expect(r.year).toBe(2023)
    expect(r.plFigures.costOfSales.value).toBe(320000)
  })
})

describe('assembleAnnualReports — the multi-file rules', () => {
  const parse = year => extractProfitLoss(plGrid(year))

  test('three known years assemble oldest-first, aligned to the engine shape', () => {
    const { files, assembled, warnings } = assembleAnnualReports([parse(2025), parse(2023), parse(2024)])
    expect(files.length).toBe(3)
    expect(assembled.years).toEqual([2023, 2024, 2025])
    expect(assembled.sales).toEqual([500000, 500000, 500000])
    expect(assembled.costOfSales).toEqual([320000, 320000, 320000])
    expect(assembled.operatingExpenses).toEqual([63500, 63500, 63500])
    expect(assembled.loanInterestPaid).toEqual([7500, 7500, 7500])
    expect(assembled.sundry.interestReceived).toEqual([1000, 1000, 1000])
    expect(warnings).toEqual([]) // consecutive years, same company: clean
  })

  test('a missing figure holds its slot as null — never a fabricated 0', () => {
    const bare = extractProfitLoss([
      ['Profit and Loss'], ['Kinetic Test Ltd'], ['For the year ended 31 March 2024'],
      ['Income'], ['Sales', 100000]
    ])
    const { assembled } = assembleAnnualReports([bare, parse(2025)])
    expect(assembled.years).toEqual([2024, 2025])
    expect(assembled.costOfSales).toEqual([null, 320000])
  })

  test('more than five files fails loudly', () => {
    const six = [2020, 2021, 2022, 2023, 2024, 2025].map(parse)
    expect(() => assembleAnnualReports(six)).toThrow(expect.objectContaining({ code: 'TOO_MANY_FILES' }))
  })

  test('a Balance Sheet in the mix fails the WHOLE request, naming the position', () => {
    let err
    try {
      assembleAnnualReports([parse(2024), { kind: 'balanceSheet' }, parse(2025)])
    } catch (e) { err = e }
    expect(err.code).toBe('WRONG_REPORT_KIND')
    expect(err.message).toMatch(/File 2/)
    expect(err.message).toMatch(/Balance Sheet is not needed/)
  })

  test('an unknown year blocks assembly and warns — the screen resolves it', () => {
    const undated = extractProfitLoss([
      ['Profit and Loss'], ['Kinetic Test Ltd'], ['Income'], ['Sales', 100000]
    ])
    const { assembled, warnings } = assembleAnnualReports([parse(2024), undated])
    expect(assembled).toBeNull()
    expect(warnings.some(w => /File 2:.*year/.test(w))).toBe(true)
  })

  test('duplicate years block assembly and warn', () => {
    const { assembled, warnings } = assembleAnnualReports([parse(2024), parse(2024)])
    expect(assembled).toBeNull()
    expect(warnings.some(w => /Two files carry the year 2024/.test(w))).toBe(true)
  })

  test('different company names warn (cross-client mix-up guard)', () => {
    const other = extractProfitLoss(plGrid(2023, { company: 'Someone Else Ltd' }))
    const { warnings } = assembleAnnualReports([parse(2024), other])
    expect(warnings.some(w => /different companies/.test(w))).toBe(true)
  })

  test('R20: files ending their years on different dates warn — year numbers alone are not alignment', () => {
    const june = extractProfitLoss([
      ['Profit and Loss'], ['Kinetic Test Ltd'], ['For the year ended 30 June 2025'],
      ['Income'], ['Sales', 100000]
    ])
    const { warnings } = assembleAnnualReports([parse(2024), june])
    expect(warnings.some(w => /end their years on different dates/.test(w) && /31 March/.test(w) && /30 June/.test(w))).toBe(true)
  })

  test('R20: a same-period-end set raises no date warning', () => {
    const { warnings } = assembleAnnualReports([parse(2024), parse(2025)])
    expect(warnings.some(w => /different dates/.test(w))).toBe(false)
  })

  test('non-consecutive years still assemble but warn about the gap', () => {
    const { assembled, warnings } = assembleAnnualReports([parse(2021), parse(2025)])
    expect(assembled.years).toEqual([2021, 2025])
    expect(warnings.some(w => /not consecutive/.test(w))).toBe(true)
  })

  test('per-file parser warnings surface with their file position', () => {
    const poisoned = extractProfitLoss([
      ['Profit and Loss'], ['Kinetic Test Ltd'], ['For the year ended 31 March 2024'],
      ['Income'], ['Sales', 100000], ['Total Income', 999999] // lying cached total
    ])
    const { warnings } = assembleAnnualReports([poisoned])
    expect(warnings.some(w => /^File 1: The file's own "Total Income"/.test(w))).toBe(true)
  })

  test('empty input assembles to nothing, quietly valid for the route to reject as NO_FILE', () => {
    const { files, assembled } = assembleAnnualReports([])
    expect(files).toEqual([])
    expect(assembled).toBeNull()
  })
})

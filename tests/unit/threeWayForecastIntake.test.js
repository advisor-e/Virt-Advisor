'use strict'

const {
  extractForecastBalanceSheet,
  extractBalanceSheet,
  extractProfitLoss,
  parseForecastUpload
} = require('../../server/report/intake/xeroReportParser')
const { assembleForecastIntake, MAX_FILES } = require('../../server/report/intake/threeWayForecastAssembler')
const { computeThreeWayForecast } = require('../../server/report/threeWayForecastModel')
const { makeXlsx } = require('./xlsxFixture')

/**
 * Three-Way Forecast intake.
 *
 * What these tests guard is what a person in UAT cannot see: a figure summed from the
 * wrong rows, an expense line silently dropped, a shareholder's name reaching a payload
 * it has no business being in, and a "forecast" that is quietly last year's actuals.
 */

/** A Balance Sheet with everything the forecast opens from. */
const BS_GRID = [
  ['Balance Sheet'],
  ['Kinetic Test Ltd'],
  ['As at 31 March 2026'],
  [],
  ['Assets'],
  ['Current Assets'],
  ['Bank'],
  ['Cheque Account', 71000],
  ['Savings Account', 9000],
  ['Total Bank', 80000],
  ['Accounts Receivable', 52000],
  ['Inventory', 40000],
  ['Raw Materials Stock', 25000],
  ['Prepayments', 3000],
  ['GST Receivable', 4000],
  ['Total Current Assets', 204000],
  ['Non-Current Assets'],
  ['Motor Vehicles', 80000],
  ['Leasehold Improvements', 1000000],
  ['Plant and Machinery', 50000],
  ['Office Furniture', 60000],
  ['Computer Hardware', 70000],
  ['Artwork', 80000],
  ['Total Non-Current Assets', 1340000],
  ['Total Assets', 1544000],
  ['Liabilities'],
  ['Current Liabilities'],
  ['Accounts Payable', 58000],
  ['Accrued Expenses', 5000],
  ['GST Payable', 5500],
  ['Income Tax Payable', 13500],
  ['Bank Overdraft', 249000],
  ['Shareholder Current Account - R Patel', 25000],
  ['Shareholder Current Account - S Okafor', 18000],
  ['Total Current Liabilities', 374000],
  ['Non-Current Liabilities'],
  ['ABC Bank Loan', 80000],
  ['XYZ Bank Loan', 1000000],
  ['DEF Hire Purchase', 50000],
  ['Total Non-Current Liabilities', 1130000],
  ['Total Liabilities', 1504000],
  ['Equity'],
  ['Share Capital', 200000],
  ['Retained Earnings', 7000],
  ['Total Equity', 207000]
]

/** A P&L whose expense lines cover most of the model's overhead set. */
const PL_GRID = [
  ['Profit and Loss'],
  ['Kinetic Test Ltd'],
  ['For the year ended 31 March 2026'],
  [],
  ['Income'],
  ['Sales', 890000],
  ['Total Income', 890000],
  ['Less Operating Expenses'],
  ['ACC Levies', 15000],
  ['Accountancy Fees', 8500],
  ['Advertising', 11000],
  ['Bank Fees', 650],
  ['Computer Expenses', 2500],
  ['Insurance', 4500],
  ['Power', 1500],
  ['Printing & Stationery', 500],
  ['Rent', 8500],
  ['Subscriptions', 500],
  ['Telephone and Internet', 3500],
  ['Motor Vehicle Expenses', 9700],
  ['Wages and Salaries', 85000],
  ['General Expenses', 2000],
  ['Entertainment', 1200],
  ['Donations', 800],
  ['Total Operating Expenses', 155350]
]

describe('Forecast Balance Sheet — the whole opening position', () => {
  const r = extractForecastBalanceSheet(BS_GRID)

  test('recognises the report and reads its own date', () => {
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('forecastBalanceSheet')
    expect(r.reportDate).toBe('31 March 2026')
  })

  test('every figure is the SUM of its line items, never a Total row', () => {
    expect(r.figures.cashAtBank.value).toBe(80000) // 71000 + 9000
    expect(r.figures.inventory.value).toBe(65000) // 40000 + 25000, split across two rows
    expect(r.figures.accountsReceivable.value).toBe(52000)
    expect(r.figures.accountsPayable.value).toBe(58000)
    expect(r.figures.accruedExpenses.value).toBe(5000)
    expect(r.figures.gstPayable.value).toBe(5500)
    expect(r.figures.gstRefund.value).toBe(4000)
    expect(r.figures.incomeTaxPayable.value).toBe(13500)
    expect(r.figures.prepayments.value).toBe(3000)
    expect(r.figures.bankOverdraft.value).toBe(249000)
    expect(r.figures.authorisedCapital.value).toBe(200000)
    expect(r.figures.retainedEarnings.value).toBe(7000)
  })

  test('a split concept keeps its candidate rows so the advisor can untick one', () => {
    // The Electric Bikes finding: stock is routinely spread over several named rows.
    expect(r.figures.inventory.candidates).toHaveLength(2)
    expect(r.figures.inventory.candidates.map(c => c.value)).toEqual([40000, 25000])
  })

  test('the six fixed-asset categories are recognised, and the rest lands in "other"', () => {
    expect(r.assets.vehicles.value).toBe(80000)
    expect(r.assets.leaseholdImprovements.value).toBe(1000000)
    expect(r.assets.plantEquipment.value).toBe(50000)
    expect(r.assets.officeEquipment.value).toBe(60000)
    expect(r.assets.computerHardware.value).toBe(70000)
    // "Artwork" matches no category. It must never be dropped: a lost asset is a
    // balance sheet that will not tie and an advisor with no idea why.
    expect(r.assets.other.value).toBe(80000)
    const total = Object.keys(r.assets).reduce((a, k) => a + r.assets[k].value, 0)
    expect(total).toBe(1340000)
  })

  test('an asset is claimed by exactly one category', () => {
    // "Motor Vehicles" matches the vehicle test; nothing else may also claim it.
    const seen = []
    Object.keys(r.assets).forEach((k) => {
      r.assets[k].candidates.forEach(c => seen.push(c.label))
    })
    expect(seen).toHaveLength(new Set(seen).size)
  })

  test('🔒 shareholder balances are positional and carry NO NAMES', () => {
    // §3A of the forecast prompt specification: names of natural persons must never
    // propagate. The parser does not read them at all, rather than reading then
    // stripping — there is nothing to leak.
    expect(r.shareholderBalances).toEqual([25000, 18000])
    const serialised = JSON.stringify(r.shareholderBalances)
    expect(serialised).not.toMatch(/Patel|Okafor|Shareholder/i)
  })

  test('🔒 the whole extract carries no shareholder name anywhere', () => {
    const serialised = JSON.stringify(r)
    expect(serialised).not.toMatch(/Patel/)
    expect(serialised).not.toMatch(/Okafor/)
  })

  test('term loans are positional too', () => {
    expect(r.loanBalances).toEqual([80000, 1000000, 50000])
  })

  test('an overdrawn bank account read as a negative asset still opens as an overdraft', () => {
    const grid = BS_GRID.map(row => row.slice())
    // Replace the liability-side overdraft with a negative bank row, the other shape
    // Xero produces.
    const negBank = grid.filter(row => row[0] !== 'Bank Overdraft')
    negBank.splice(8, 0, ['Trading Account', -12000])
    const alt = extractForecastBalanceSheet(negBank)
    expect(alt.figures.bankOverdraft.value).toBe(12000)
    expect(alt.figures.cashAtBank.value).toBe(80000)
  })

  test('a file that is not a Balance Sheet is refused, not half-read', () => {
    expect(extractForecastBalanceSheet(PL_GRID).recognised).toBe(false)
  })

  test('🔴 an export with NO "Total Assets" row still splits assets from liabilities', () => {
    // Found live on 2026-09-02, and it is the reason the three sides are split by
    // exclusion rather than by nesting. Without a Total row the Assets section never
    // closes, so Liabilities nests inside it — and every liability then satisfies
    // `inSection(/asset/i)`. The overdraft was read as CASH (320,000 rather than
    // 71,000) and a bank loan as a FIXED ASSET. Both other grids carry the Total row,
    // so neither caught it.
    const noTotals = BS_GRID.filter(row => !/^Total (Assets|Liabilities)$/.test(String(row[0])))
    const r = extractForecastBalanceSheet(noTotals)
    expect(r.recognised).toBe(true)
    expect(r.figures.cashAtBank.value).toBe(80000) // NOT 80000 + the overdraft
    expect(r.figures.bankOverdraft.value).toBe(249000)
    // "Non-Current Liabilities" also matches /non-current/, so the loans would land in
    // the fixed-asset pool too.
    expect(r.assets.other.value).toBe(80000) // Artwork alone, not Artwork + the loans
    const assetTotal = Object.keys(r.assets).reduce((a, k) => a + r.assets[k].value, 0)
    expect(assetTotal).toBe(1340000)
    expect(r.loanBalances).toEqual([80000, 1000000, 50000])
  })

  test('equity is never counted as a liability, however the sections nest', () => {
    const noTotals = BS_GRID.filter(row => !/^Total (Assets|Liabilities)$/.test(String(row[0])))
    const r = extractForecastBalanceSheet(noTotals)
    expect(r.figures.authorisedCapital.value).toBe(200000)
    expect(r.figures.retainedEarnings.value).toBe(7000)
    expect(r.figures.accountsPayable.value).toBe(58000)
  })

  test('Quick Position\'s own contract is untouched', () => {
    // Its five proposals, from the same grid, must be exactly what they always were.
    const qp = extractBalanceSheet(BS_GRID)
    expect(qp.kind).toBe('balanceSheet')
    expect(Object.keys(qp.proposals).sort()).toEqual(['cash', 'creditors', 'debtors', 'stock'])
    expect(qp.proposals.cash.value).toBe(80000)
  })
})

describe('Forecast intake assembly', () => {
  const bs = extractForecastBalanceSheet(BS_GRID)
  const pl = extractProfitLoss(PL_GRID)

  test('a Balance Sheet and a P&L assemble into a usable proposal', () => {
    const r = assembleForecastIntake([bs, pl])
    expect(r.blocked).toBeNull()
    expect(r.files).toHaveLength(2)
    expect(r.proposal.openingBalanceSheet.cashAtBank).toBe(80000)
    expect(r.proposal.assets.map(a => a.opening)).toEqual([80000, 1000000, 50000, 60000, 70000, 80000])
    expect(r.proposal.loans.map(l => l.opening)).toEqual([80000, 1000000, 50000])
    expect(r.proposal.shareholders.map(s => s.opening)).toEqual([25000, 18000, 0, 0])
  })

  test('the overhead cost base is seeded, each line landing in exactly one overhead', () => {
    const r = assembleForecastIntake([bs, pl])
    const o = r.proposal.overheads
    expect(o.accLevies).toBe(15000)
    expect(o.accountancy).toBe(8500)
    expect(o.advertising).toBe(11000)
    expect(o.bankCharges).toBe(650)
    expect(o.wages).toBe(85000)
    expect(o.vehicle).toBe(9700)
    expect(o.rent).toBe(8500)
    // Nothing may be counted twice: the total must equal the file's own expense total.
    const seeded = Object.keys(o).reduce((a, k) => a + o[k], 0)
    expect(seeded).toBe(155350)
  })

  test('an unrecognised expense is moved to "Other 5" and NAMED, never dropped', () => {
    const r = assembleForecastIntake([bs, pl])
    // Entertainment (1200) and Donations (800) match no overhead test.
    expect(r.proposal.overheads.otherFive).toBe(2000)
    const warned = r.warnings.join(' ')
    expect(warned).toMatch(/Entertainment/)
    expect(warned).toMatch(/Donations/)
  })

  test('every figure declares whether it came from a file or the advisor', () => {
    const r = assembleForecastIntake([bs, pl])
    expect(r.provenance['openingBalanceSheet.cashAtBank']).toBe('file')
    expect(r.provenance['assets.0.opening']).toBe('file')
    expect(r.provenance['loans.0.opening']).toBe('file')
    // A depreciation rate, a loan's interest rate and a collection profile are never in
    // any export — they are judgements, and must say so.
    expect(r.provenance['assets.0.depreciationRate']).toBe('entered')
    expect(r.provenance['loans.0.interestRate']).toBe('entered')
    expect(r.provenance.debtorCollection).toBe('entered')
    expect(r.provenance.markup).toBe('entered')
    expect(r.provenance.purchases).toBe('entered')
  })

  test('with no by-month P&L, the forecast sales are the advisor\'s alone', () => {
    const r = assembleForecastIntake([bs, pl])
    expect(r.proposal.sales).toBeUndefined()
    expect(r.provenance.sales).toBe('entered')
  })

  test('last year\'s monthly sales are marked "seeded", NOT "file"', () => {
    // The distinction is the point: `file` is a fact about the client's position;
    // `seeded` is last year's actuals offered as a starting point for a judgement
    // about next year. A screen that showed them identically would be lying.
    const lastYear = { sales: [80, 70, 75, 80, 60, 65, 70, 70, 80, 95, 70, 70].map(n => n * 1000) }
    const r = assembleForecastIntake([bs, pl], lastYear)
    expect(r.proposal.sales).toHaveLength(12)
    expect(r.provenance.sales).toBe('seeded')
    expect(r.provenance.sales).not.toBe('file')
    expect(r.warnings.join(' ')).toMatch(/starting point/i)
  })

  test('a malformed monthly series is ignored rather than half-used', () => {
    expect(assembleForecastIntake([bs, pl], { sales: [1, 2, 3] }).proposal.sales).toBeUndefined()
    expect(assembleForecastIntake([bs, pl], { sales: new Array(12).fill(NaN) }).proposal.sales).toBeUndefined()
    expect(assembleForecastIntake([bs, pl], null).proposal.sales).toBeUndefined()
  })

  // 🔴 Rows appear AS THEY ARE NEEDED, capped at eight — Mike's ruling, 2026-09-05. Until
  // then the file's loans were folded down to three before the engine saw them, and the
  // real client that prompted the change has six. Five loans are now five rows.
  test('the file’s own loan count comes through, up to the cap of eight', () => {
    const many = Object.assign({}, bs, {
      loanBalances: [10, 20, 30, 40, 50],
      shareholderBalances: [1, 2, 3, 4, 5, 6]
    })
    const r = assembleForecastIntake([many, pl])
    expect(r.proposal.loans.map(l => l.opening)).toEqual([10, 20, 30, 40, 50])
    // Nothing was folded, so nothing is warned about — a warning that named a folding
    // which did not happen would send the advisor looking for a combined figure.
    expect(r.warnings.join(' ')).not.toMatch(/combined into the last[\s\S]*loans/i)
    expect(r.proposal.shareholders.map(s => s.opening)).toEqual([1, 2, 3, 15]) // 4+5+6
    expect(r.warnings.join(' ')).toMatch(/shareholder current accounts/i)
  })

  test('past eight, the surplus still folds into the last and says so', () => {
    const tooMany = Object.assign({}, bs, {
      loanBalances: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    })
    const r = assembleForecastIntake([tooMany, pl])
    expect(r.proposal.loans).toHaveLength(8)
    expect(r.proposal.loans.map(l => l.opening)).toEqual([1, 2, 3, 4, 5, 6, 7, 27]) // 8+9+10
    expect(r.warnings.join(' ')).toMatch(/combined into the last/i)
  })

  test('a file with no loans at all still offers one row to fill in', () => {
    const none = Object.assign({}, bs, { loanBalances: [] })
    const r = assembleForecastIntake([none, pl])
    expect(r.proposal.loans).toHaveLength(1)
    expect(r.proposal.loans[0].opening).toBe(0)
  })

  // A balance sheet never says whether finance revolves, so nothing read from a file may
  // arrive as a facility — that is the advisor's to set, and an amortisation schedule
  // guessed from an account name would move a client's cash flow on a word.
  test('every row read from a file is a term loan, never a facility', () => {
    const many = Object.assign({}, bs, { loanBalances: [10, 20] })
    const r = assembleForecastIntake([many, pl])
    r.proposal.loans.forEach((l) => { expect(l.type).toBe('term') })
    expect(r.provenance['loans.0.type']).toBe('entered')
  })
})

describe('Forecast intake — it blocks rather than proposing half a forecast', () => {
  const bs = extractForecastBalanceSheet(BS_GRID)
  const pl = extractProfitLoss(PL_GRID)

  test('no Balance Sheet blocks the whole assembly', () => {
    const r = assembleForecastIntake([pl])
    expect(r.blocked).toBeTruthy()
    expect(r.proposal.openingBalanceSheet).toBeUndefined()
  })

  test('two Balance Sheets block rather than picking one', () => {
    expect(assembleForecastIntake([bs, bs]).blocked).toBeTruthy()
  })

  test('two Profit and Loss reports block rather than merging them', () => {
    expect(assembleForecastIntake([bs, pl, pl]).blocked).toBeTruthy()
  })

  test('too many files, or none, block', () => {
    expect(assembleForecastIntake([bs, pl, pl, pl, pl]).blocked).toBeTruthy()
    expect(assembleForecastIntake([]).blocked).toBeTruthy()
    expect(assembleForecastIntake(null).blocked).toBeTruthy()
    // Six: a Balance Sheet, a Profit and Loss, up to two by-month exports, and last year's
    // Balance Sheet and Profit and Loss. The route reads this as the whole drop's limit, so
    // raising it here raises it there. Was four until 2026-09-03 (item 4.61b).
    expect(MAX_FILES).toBe(6)
  })

  test('a Balance Sheet with no P&L assembles, and says the cost base is not seeded', () => {
    const r = assembleForecastIntake([bs])
    expect(r.blocked).toBeNull()
    expect(r.proposal.overheads).toBeUndefined()
    expect(r.warnings.join(' ')).toMatch(/No Profit and Loss/i)
  })

  test('two different organisations in one drop is warned about, not merged silently', () => {
    const otherCo = Object.assign({}, pl, { companyName: 'Somebody Else Ltd' })
    const r = assembleForecastIntake([bs, otherCo])
    expect(r.warnings.join(' ')).toMatch(/different organisations/i)
  })
})

describe('Forecast intake — last year, for the two-year trend read (item 4.61b)', () => {
  /** Last year's Balance Sheet — same client, a year earlier, different figures. */
  const PRIOR_BS_GRID = [
    ['Balance Sheet'],
    ['Kinetic Test Ltd'],
    ['As at 31 March 2025'],
    [],
    ['Assets'],
    ['Current Assets'],
    ['Bank'],
    ['Cheque Account', 40000],
    ['Total Bank', 40000],
    ['Accounts Receivable', 44000],
    ['Inventory', 30000],
    ['Total Current Assets', 114000],
    ['Total Assets', 114000],
    ['Liabilities'],
    ['Current Liabilities'],
    ['Accounts Payable', 41000],
    ['Total Current Liabilities', 41000],
    ['Total Liabilities', 41000],
    ['Equity'],
    ['Share Capital', 50000],
    ['Total Equity', 50000]
  ]
  const PRIOR_PL_GRID = [
    ['Profit and Loss'],
    ['Kinetic Test Ltd'],
    ['For the year ended 31 March 2025'],
    [],
    ['Income'],
    ['Sales', 824000],
    ['Total Income', 824000],
    ['Less Operating Expenses'],
    ['Wages and Salaries', 120000],
    ['Rent', 20000],
    ['Total Operating Expenses', 140000]
  ]

  const bs = extractForecastBalanceSheet(BS_GRID)
  const pl = extractProfitLoss(PL_GRID)
  const priorBs = extractForecastBalanceSheet(PRIOR_BS_GRID)
  const priorPl = extractProfitLoss(PRIOR_PL_GRID)

  test('all four annual reports assemble, with each year’s figures on its own side', () => {
    const r = assembleForecastIntake([bs, pl, priorBs, priorPl])
    expect(r.blocked).toBeNull()
    expect(r.trendInputs.current.sales).toBe(890000)
    expect(r.trendInputs.prior.sales).toBe(824000)
    expect(r.trendInputs.current.accountsReceivable).toBe(52000)
    expect(r.trendInputs.prior.accountsReceivable).toBe(44000)
    expect(r.trendInputs.prior.accountsPayable).toBe(41000)
  })

  // 🔴 THE ONE THAT MATTERS MOST. Getting the two years the wrong way round would open the
  // forecast from LAST year's position: every figure plausible, every figure a year stale,
  // and nothing on screen to notice it by. The files are dropped OLDEST FIRST here on
  // purpose — a file picker returns whatever order the operating system gives it, so
  // upload order must not be what decides this.
  test('the forecast still opens from THIS year when last year’s files are dropped first', () => {
    const r = assembleForecastIntake([priorBs, priorPl, bs, pl])
    expect(r.blocked).toBeNull()
    expect(r.proposal.openingBalanceSheet.accountsReceivable).toBe(52000)
    expect(r.proposal.openingBalanceSheet.inventory).toBe(65000)
    expect(r.trendInputs.current.sales).toBe(890000)
    expect(r.trendInputs.prior.sales).toBe(824000)
  })

  test('this year’s overheads are still the ones seeded, not last year’s', () => {
    const r = assembleForecastIntake([priorBs, priorPl, bs, pl])
    expect(r.proposal.overheads.wages).toBe(85000)
    expect(r.proposal.overheads.rent).toBe(8500)
  })

  // Nothing last year carried may reach a figure the advisor forecasts with.
  test('last year feeds the read and nothing else — no provenance names it', () => {
    const r = assembleForecastIntake([bs, pl, priorBs, priorPl])
    const withPrior = assembleForecastIntake([bs, pl])
    expect(r.proposal).toEqual(withPrior.proposal)
    expect(r.provenance).toEqual(withPrior.provenance)
  })

  test('two reports that cannot be told apart by date are refused, never ordered by upload', () => {
    expect(assembleForecastIntake([bs, bs]).blocked).toBeTruthy()
    expect(assembleForecastIntake([bs, pl, pl]).blocked).toBeTruthy()
  })

  test('last year’s Balance Sheet without its Profit and Loss says so and reads nothing', () => {
    const r = assembleForecastIntake([bs, pl, priorBs])
    expect(r.blocked).toBeNull()
    expect(r.trendInputs).toBeNull()
    expect(r.warnings.join(' ')).toMatch(/without last year's Profit and Loss/i)
  })

  test('last year’s Profit and Loss alone still reads — the day-counts simply cannot', () => {
    const r = assembleForecastIntake([bs, pl, priorPl])
    expect(r.trendInputs.prior.sales).toBe(824000)
    expect(r.trendInputs.prior.accountsReceivable).toBeUndefined()
    expect(r.trendInputs.current.accountsReceivable).toBe(52000)
  })

  test('a different organisation in last year’s files is warned about, not compared silently', () => {
    const otherCo = Object.assign({}, priorPl, { companyName: 'Somebody Else Ltd' })
    const r = assembleForecastIntake([bs, pl, otherCo])
    expect(r.warnings.join(' ')).toMatch(/different organisation/i)
  })

  test('no last-year files at all leaves the read off entirely', () => {
    expect(assembleForecastIntake([bs, pl]).trendInputs).toBeNull()
  })
})

describe('Forecast intake — the proposal actually drives the model', () => {
  test('a proposed input set produces a complete, finite forecast', () => {
    const bs = extractForecastBalanceSheet(BS_GRID)
    const pl = extractProfitLoss(PL_GRID)
    const r = assembleForecastIntake([bs, pl], { sales: new Array(12).fill(74166.67) })
    const f = computeThreeWayForecast(r.proposal)

    f.cashFlow.closingBalance.forEach(v => expect(isFinite(v)).toBe(true))
    f.balanceSheet.months.balanceCheck.forEach(v => expect(isFinite(v)).toBe(true))
    expect(f.balanceSheet.opening.cashAtBank).toBe(80000)
    expect(f.balanceSheet.opening.totalNonCurrentAssets).toBe(1340000)
  })

  test('🔴 an opening position that ties on the file ties in the forecast, all year', () => {
    // This grid's own figures balance: assets 1,544,000 = liabilities 1,504,000 +
    // equity 207,000, less the 167,000 of shareholder accounts and overdraft the
    // forecast reclassifies. If the intake maps a figure to the wrong side of the
    // balance sheet, this is what catches it — and nothing on screen would.
    const bs = extractForecastBalanceSheet(BS_GRID)
    const pl = extractProfitLoss(PL_GRID)
    const r = assembleForecastIntake([bs, pl])
    const f = computeThreeWayForecast(r.proposal)
    const opening = f.balanceSheet.opening.balanceCheck
    f.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(opening))
  })
})

/**
 * 🔴 NOTHING ON A BALANCE SHEET IS DROPPED.
 *
 * Found 2026-09-05 by putting a real Xero export through the app. The file tied to the
 * cent in Xero — net assets and total equity both -635,494.05 — and the app opened from
 * it 1,559,449.79 out of balance, because 18 rows it could not name reached no slot at
 * all: 1,039,910.17 of current assets, 3,090,713.29 of current liabilities, 8,546.67 of
 * non-current liabilities and 499,900.00 of equity, in silence. Only non-current assets
 * had a catch-all; the other three sections discarded what they did not recognise, and
 * equity had no catch-all slot to sweep into even if it had swept.
 *
 * THE TEST ABOVE DID NOT CATCH IT, AND THAT IS THE INSTRUCTIVE PART. It asserts the
 * monthly check equals the OPENING check — that the gap does not grow. A gap of
 * 1.5 million that stays exactly 1.5 million passes it. What was never asserted is that
 * a balance sheet which balances in the accounting package balances here, which is the
 * assertion below.
 *
 * The fixture is invented, deliberately: it reproduces the SHAPE and every failure mode
 * of the real file — unnamed rows in all four sections, a plural "Loans" that is not a
 * term loan, gross cost against accumulated depreciation, goodwill — without putting a
 * real client's balance sheet in the repository.
 */
describe('🔴 a balance sheet that ties in the accounting package ties here', () => {
  // Assets 585,000 = liabilities 267,500 + equity 317,500. Four of its rows match no
  // named test in the parser, one per section.
  const UNNAMED_BS = [
    ['Balance Sheet'],
    ['Sweep Test Ltd'],
    ['As at 31 March 2026'],
    [],
    ['Assets'],
    ['Bank'],
    ['Cheque Account', 120000],
    ['Total Bank', 120000],
    ['Current Assets'],
    ['Accounts Receivable', 80000],
    ['Inventory', 30000],
    ['Deposits paid to Suppliers', 200000], // unnamed — the real file's largest asset loss
    ['Clearing Account - Foreign Exchange', 25000], // unnamed
    ['Total Current Assets', 335000],
    ['Fixed Assets'],
    ['Vehicles', 40000],
    ['Accumulated Depreciation on Vehicles', -10000],
    ['Total Fixed Assets', 30000],
    ['Non-current Assets'],
    ['Goodwill', 100000],
    ['Total Non-current Assets', 100000],
    ['Total Assets', 585000],
    ['Liabilities'],
    ['Current Liabilities'],
    ['Accounts Payable', 40000],
    ['PAYE Payable', 8000], // unnamed
    ['Trade Finance Loans', 150000], // unnamed: plural "Loans" is not a term loan
    ['Short-term Loan', 60000], // a real term loan, and it must not be counted twice
    ['Suspense', 500], // unnamed
    ['Total Current Liabilities', 258500],
    ['Non-current Liabilities'],
    ['Licence Fees prepaid', 9000], // unnamed, and "prepaid" must not make it an asset
    ['Total Non-current Liabilities', 9000],
    ['Total Liabilities', 267500],
    ['Net Assets', 317500],
    ['Equity'],
    ['Share Capital', 100],
    ['Dividends Paid', -50000], // unnamed — equity had no catch-all at all before this
    ['Retained Earnings', 367400],
    ['Total Equity', 317500]
  ]

  const bs = extractForecastBalanceSheet(UNNAMED_BS)
  const assembled = assembleForecastIntake([bs])

  /**
   * What the SCREEN sends, which is not what the assembler alone produces. A money line
   * the file did not supply is genuinely absent, so the screen starts it at 0 and sends
   * it — "MONEY DEFAULTS TO ZERO", the component's own rule. The engine's own DEFAULTS
   * are a sample company (a 249,000 overdraft, 200,000 of share capital) and would apply
   * only to a caller that omits the key, which the screen never does.
   *
   * @returns {object} the proposal with every opening line present.
   */
  const asTheScreenSends = () => {
    const keys = ['cashAtBank', 'bankOverdraft', 'accountsReceivable', 'inventory', 'prepayments',
      'gstRefund', 'incomeTaxRefundDue', 'otherCurrentAsset', 'accountsPayable', 'accruedExpenses',
      'gstPayable', 'incomeTaxPayable', 'otherCurrentLiability', 'otherNonCurrentLiability',
      'authorisedCapital', 'retainedEarnings', 'capitalGain', 'otherEquity',
      'stockInTransitDeposits']
    const ob = Object.assign({}, assembled.proposal.openingBalanceSheet)
    for (let i = 0; i < keys.length; i++) { if (ob[keys[i]] === undefined) { ob[keys[i]] = 0 } }
    return Object.assign({}, assembled.proposal, { openingBalanceSheet: ob })
  }

  test('the opening balance check is NIL, not merely constant', () => {
    const f = computeThreeWayForecast(asTheScreenSends())
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
    expect(f.balanceSheet.opening.totalEquity).toBe(317500)
    expect(f.balanceSheet.opening.netAssets).toBe(317500)
  })

  test('and it stays nil across all twelve months', () => {
    const f = computeThreeWayForecast(asTheScreenSends())
    f.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(0))
  })

  test('each unnamed row lands in its own section’s catch-all, and only there', () => {
    const o = assembled.proposal.openingBalanceSheet
    // 🔴 25,000, not the 225,000 this asserted until 2026-09-05. "Deposits paid to
    // Suppliers" is no longer unnamed: Fix 2 gave it its own opening line so it can be
    // released into stock when the container lands, instead of sitting frozen in a
    // catch-all for the whole forecast. The foreign-exchange clearing account is still
    // genuinely unnamed and still sweeps here.
    expect(o.otherCurrentAsset).toBe(25000)
    expect(o.stockInTransitDeposits).toBe(200000)
    expect(o.otherCurrentLiability).toBe(158500) // 8,000 + 150,000 + 500 — NOT the loan
    expect(o.otherNonCurrentLiability).toBe(9000)
    expect(o.otherEquity).toBe(-50000)
  })

  // Both are current assets, so moving the deposit out of the catch-all and into its own
  // line must not move the opening by a cent. This is the assertion that would catch it
  // being counted in both places, which is the way this kind of change goes wrong.
  test('naming the deposit moves it, and moves no total', () => {
    const o = assembled.proposal.openingBalanceSheet
    expect(o.otherCurrentAsset + o.stockInTransitDeposits).toBe(225000)
    const f = computeThreeWayForecast(asTheScreenSends())
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
    expect(f.balanceSheet.opening.totalCurrentAssets).toBe(455000) // 120+80+30+225 thousand
  })

  test('a row a named test claimed is never swept up a second time', () => {
    const o = assembled.proposal.openingBalanceSheet
    // The 60,000 term loan has its own slot. Double-counting it would move net assets by
    // 60,000 and the opening would no longer tie — which the first test also proves, but
    // this says which row it is.
    expect(assembled.proposal.loans[0].opening).toBe(60000)
    expect(o.accountsPayable).toBe(40000)
    expect(o.prepayments).toBeUndefined() // "Licence Fees prepaid" is a liability, not one
  })

  test('an overdrawn bank account still opens as an overdraft, not as a swept asset', () => {
    const overdrawn = UNNAMED_BS.map(r => (r[0] === 'Cheque Account' ? ['Cheque Account', -15000] : r))
    const r = extractForecastBalanceSheet(overdrawn)
    expect(r.figures.bankOverdraft.value).toBe(15000)
    expect(r.figures.cashAtBank).toBeUndefined()
    // The row was consumed by the overdraft, so the sweep must not see it again. 25,000
    // rather than 225,000 since the supplier deposit got its own line — see the catch-all
    // test above; what this one proves is that the bank row is not swept, and it is not.
    expect(r.figures.otherCurrentAsset.value).toBe(25000)
  })

  test('a fully-recognised balance sheet fills no catch-all at all', () => {
    const clean = extractForecastBalanceSheet(BS_GRID)
    expect(clean.figures.otherCurrentAsset).toBeUndefined()
    expect(clean.figures.otherEquity).toBeUndefined()
  })
})

describe('Forecast intake — hostile and malformed uploads', () => {
  test('a real .xlsx Balance Sheet round-trips through the reader', () => {
    const buf = makeXlsx(BS_GRID, 'Balance Sheet')
    const parsed = parseForecastUpload(buf)
    expect(parsed.kind).toBe('forecastBalanceSheet')
    expect(parsed.figures.cashAtBank.value).toBe(80000)
  })

  test('binary junk is refused with a stable code, never half-parsed', () => {
    const junk = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
    expect(() => parseForecastUpload(junk)).toThrow()
    try {
      parseForecastUpload(junk)
    } catch (err) {
      expect(typeof err.code).toBe('string')
      expect(err.code.length).toBeGreaterThan(0)
    }
  })

  test('a spreadsheet that is not a Xero report is refused by name', () => {
    const buf = makeXlsx([['Shopping list'], ['Milk', 3]], 'Sheet1')
    try {
      parseForecastUpload(buf)
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.code).toBe('UNRECOGNISED_REPORT')
    }
  })

  test('a grid carrying a __proto__ row cannot pollute the proposal', () => {
    const nasty = BS_GRID.map(row => row.slice())
    nasty.splice(7, 0, ['__proto__', 999])
    nasty.splice(8, 0, ['constructor', 999])
    const r = extractForecastBalanceSheet(nasty)
    expect(r.recognised).toBe(true)
    expect({}.polluted).toBeUndefined()
    expect(Object.prototype.polluted).toBeUndefined()
    const a = assembleForecastIntake([r])
    expect(Object.getPrototypeOf(a.provenance)).toBeNull()
  })

  test('a Balance Sheet with no recognisable lines proposes nothing rather than guessing', () => {
    const bare = [
      ['Balance Sheet'],
      ['Bare Ltd'],
      ['As at 31 March 2026'],
      [],
      ['Assets'],
      ['Something Unusual', 100],
      ['Total Assets', 100]
    ]
    const r = extractForecastBalanceSheet(bare)
    expect(r.recognised).toBe(true)
    expect(r.figures.cashAtBank).toBeUndefined()
    expect(r.figures.accountsReceivable).toBeUndefined()
    // Absent, not zero — the screen shows the model default tagged *entered*.
    const a = assembleForecastIntake([r])
    expect(a.blocked).toBeNull()
    expect(a.proposal.openingBalanceSheet.cashAtBank).toBeUndefined()
  })
})

/**
 * 🔴 A CLIENT'S OWN ACCOUNT NAMES ARE REDACTED BEFORE THEY LEAVE THE BACKEND.
 *
 * Mike, 2026-09-05, on opening a real Xero export: "the names tied to bank, stock, assets
 * and liabilities snuk through". That one file carried a person's name three times and
 * three partial card numbers — `BNZ Mr y business card -4702`, `Equity Mr x`, `Trade
 * Finance Loans - NMK Investments`.
 *
 * The labels reach the browser and nowhere else — never a log, never storage, never a
 * model — but that was TRUE BY ACCIDENT, and item 4.66 will be the first report model to
 * call the AI. These tests are the rule that replaces the accident.
 *
 * They pin BEHAVIOUR, not wording: what survives is an account an advisor can still
 * recognise, and what goes is the part that identifies a person, a card or a counterparty.
 */
describe('🔴 account names are redacted at the source', () => {
  const { redactLabel } = require('../../server/report/intake/xeroReportParser')

  test('card and account numbers go, with the dash that introduced them', () => {
    expect(redactLabel('BNZ Mr y business card -4702')).toBe('BNZ business card')
    expect(redactLabel('BNZ Business First Transact - 000')).toBe('BNZ Business First Transact')
    expect(redactLabel('BNZ Vic Park Shop credit card -9084')).toBe('BNZ Vic Park Shop credit card')
  })

  test('a personal name goes; the account it describes stays', () => {
    expect(redactLabel('Mr y Funds Introduced')).toBe('Funds Introduced')
    expect(redactLabel('Equity Mr x')).toBe('Equity')
    expect(redactLabel('Loan - Mrs J Patel')).toBe('Loan')
    expect(redactLabel('Current Account - Dr Smith')).toBe('Current Account')
    expect(redactLabel('Mrs Patel Loan Account')).toBe('Loan Account')
    expect(redactLabel('Deposit held - R Patel')).toBe('Deposit held')
  })

  test('an abbreviation that only LOOKS like a title survives', () => {
    // Both were live false positives while this was being written, and both are ordinary
    // account names. `MS` in capitals is Microsoft; `Dr` beside `Cr` is debit and credit.
    expect(redactLabel('MS Office Subscription')).toBe('MS Office Subscription')
    expect(redactLabel('Dr and Cr Clearing')).toBe('Dr and Cr Clearing')
    expect(redactLabel('Missions Fund')).toBe('Missions Fund')
    expect(redactLabel('Drawings')).toBe('Drawings')
  })

  test('a counterparty after a dash goes ONLY when it names a company', () => {
    expect(redactLabel('Trade Finance Loans - NMK Investments')).toBe('Trade Finance Loans')
    expect(redactLabel('Trade Finance Loans -FGT')).toBe('Trade Finance Loans')
    // …and an ordinary account description after a dash is left alone, which is the
    // whole reason this rule needs a company marker rather than "anything after a dash".
    expect(redactLabel('Holding / Clearing Account - Foreign Exchange'))
      .toBe('Holding / Clearing Account - Foreign Exchange')
    expect(redactLabel('Wages Payable - Payroll')).toBe('Wages Payable - Payroll')
  })

  test('the ordinary chart of accounts is untouched', () => {
    ['Accounts Receivable', 'GST', 'PAYE Payable', 'RWT on Interest', 'Retained Earnings',
      'Inventory (Unleashed)', 'Deposits paid to Suppliers', 'Suspense', 'Rounding']
      .forEach(n => expect(redactLabel(n)).toBe(n))
  })

  test('⚠ the two shapes Mike accepted would survive, still survive', () => {
    // A bare initialism at the START cannot be told from GST/PAYE/OEM, and a place name
    // is how an advisor tells four stock locations apart. Ruled 2026-09-05. If a later
    // rule starts eating these, that is a regression in usefulness and this catches it.
    expect(redactLabel('XYZ Funds Introduced')).toBe('XYZ Funds Introduced')
    expect(redactLabel('Hamilton P&A Stock')).toBe('Hamilton P&A Stock')
  })

  test('a label redacted to nothing still names a row the advisor must place', () => {
    expect(redactLabel('Mr x')).toBe('Account')
    expect(redactLabel('')).toBe('Account')
    expect(redactLabel(null)).toBe('Account')
  })

  test('redaction reaches BOTH paths a name travels by, from one definition', () => {
    const bs = extractForecastBalanceSheet([
      ['Balance Sheet'], ['Acme Ltd'], ['As at 31 March 2026'], [],
      ['Assets'], ['Bank'],
      ['Cheque Account -4702', 60000],
      ['Mr y Savings Account', 40000],
      ['Total Bank', 100000]
    ])
    expect(bs.figures.cashAtBank.candidates.map(c => c.label))
      .toEqual(['Cheque Account', 'Savings Account'])

    // The unrecognised-expenses warning names accounts too, and it is the path that would
    // have been missed by redacting the candidate rows alone.
    const pl = extractProfitLoss([
      ['Profit and Loss'], ['Acme Ltd'], ['For the year ended 31 March 2026'],
      ['Less Operating Expenses'],
      ['Consulting - Mr y', 5000],
      ['Total Operating Expenses', 5000]
    ])
    const warned = assembleForecastIntake([bs, pl]).warnings.find(w => /not recognised/.test(w))
    expect(warned).toContain('Consulting')
    expect(warned).not.toContain('Mr y')
  })

  test('🔴 no label ever leaves the browser — the boundary 4.66 must not break', () => {
    // What the screen sends back is amounts. A regression here would put a client's
    // account names into a request body, and from there into an AI prompt.
    const bs = extractForecastBalanceSheet(BS_GRID)
    const sent = JSON.stringify(assembleForecastIntake([bs]).proposal)
    expect(sent).not.toMatch(/label/i)
    expect(sent).not.toMatch(/Cheque Account|Savings Account|Inventory \(Unleashed\)/)
  })
})

/**
 * "Funds introduced" is a shareholder current account (Mike's ruling, 2026-09-05).
 *
 * A real export named the owner's money `Mr y Funds Introduced` and `XYZ Funds
 * Introduced`. The parser looked for shareholder/director/beneficiary/current account, so
 * 627,850.60 of it landed in the Other-current-liability catch-all: the balance sheet tied
 * either way, which is exactly why nothing complained. What was lost is that a catch-all
 * is a frozen lump for twelve months, where a shareholder row carries advances and
 * drawings — and holds no name at all, being positional.
 */
describe('funds introduced are read as a shareholder current account', () => {
  const GRID = [
    ['Balance Sheet'], ['Sweep Test Ltd'], ['As at 31 March 2026'], [],
    ['Assets'], ['Bank'], ['Cheque Account', 120000], ['Total Bank', 120000],
    ['Liabilities'], ['Current Liabilities'],
    ['Mr y Funds Introduced', 70000],
    ['ABC Capital Introduced', 30000],
    ['Suspense', 500],
    ['Total Current Liabilities', 100500],
    ['Equity'], ['Share Capital', 100], ['Retained Earnings', 19400], ['Total Equity', 19500]
  ]
  const r = extractForecastBalanceSheet(GRID)

  test('both wordings reach the shareholder rows, in the order the file lists them', () => {
    expect(r.shareholderBalances).toEqual([70000, 30000])
  })

  test('🔒 and they arrive with NO NAME — the rows are positional', () => {
    expect(JSON.stringify(r.shareholderBalances)).not.toMatch(/Mr|y|ABC|Funds/)
  })

  test('the money is not counted twice: the catch-all keeps only what is left', () => {
    // A row claimed by a named slot must never also be swept. 500, not 100,500.
    expect(r.figures.otherCurrentLiability.value).toBe(500)
  })

  test('the opening position still ties once they have moved', () => {
    const assembled = assembleForecastIntake([r])
    const ob = Object.assign({}, assembled.proposal.openingBalanceSheet)
    const keys = ['cashAtBank', 'bankOverdraft', 'accountsReceivable', 'inventory', 'prepayments',
      'gstRefund', 'incomeTaxRefundDue', 'otherCurrentAsset', 'accountsPayable', 'accruedExpenses',
      'gstPayable', 'incomeTaxPayable', 'otherCurrentLiability', 'otherNonCurrentLiability',
      'authorisedCapital', 'retainedEarnings', 'capitalGain', 'otherEquity',
      'stockInTransitDeposits']
    for (let i = 0; i < keys.length; i++) { if (ob[keys[i]] === undefined) { ob[keys[i]] = 0 } }
    const f = computeThreeWayForecast(Object.assign({}, assembled.proposal, { openingBalanceSheet: ob }))
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
  })

  test('an ordinary account is not dragged in by the new wording', () => {
    const plain = extractForecastBalanceSheet(GRID.map(
      row => (row[0] === 'ABC Capital Introduced' ? ['Marketing Fund', 30000] : row)))
    expect(plain.shareholderBalances).toEqual([70000])
    expect(plain.figures.otherCurrentLiability.value).toBe(30500)
  })
})

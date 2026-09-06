'use strict'

/**
 * @file The Three-Way Forecast's saved-report shape (item 4.62, Brief §5) — the last of
 *   the twelve models to be opened at business-entity level.
 * @module utils/threeWayForecastSavedShape
 *
 * MIKE'S RULING, 2026-09-05: *"anything an advisor can edit, the client can edit."* So a
 * saved forecast carries the WHOLE confirmed intake — the opening balance sheet, the
 * assets, the funding lines, the shareholder accounts, the overheads, every rate and
 * series, the overseas panel and the capital rows — plus the four levers on the report
 * screen. The one thing that is not carried is the file upload (step 1), because dropping
 * an export is not editing a figure and that route refuses a client token by name.
 *
 * 🔴 WHY THIS IS LISTS AND NOT ONE NAME PER FIGURE. The store admits at most 200 named
 * values (`MAX_KEYS` in server/utils/savedReports.js). One name per figure would be over
 * 300 before the overseas panel was reached. Each block therefore travels as parallel
 * lists — and, where the block is keyed rather than positional, WITH ITS OWN NAMES beside
 * it (`opening.keys`, `overheads.keys`, `assets.keys`). That is what stops the failure the
 * funding lines already met once: a row saved before a column existed must not be read as
 * a different row. A name the form no longer holds is ignored; a figure the row does not
 * carry keeps what the screen has. The shape is 86 keys, and the longest array is the
 * 24-month history.
 *
 * 🔴 THE BADGES ARE STILL PER FIGURE, and that is why `changedFigures` is here. The
 * backend's `clientChanges` names the KEYS that differ, so with lists it would light the
 * whole opening table for one changed figure. The saved row carries the advisor's own
 * version beside the client's (`report.advisorVersion`), so the screen compares them here,
 * element by element, and gets `opening.cashAtBank` rather than `opening`. Nothing extra is
 * stored to make that true.
 *
 * A SAVED ROW IS HOSTILE — a client wrote it and it comes back onto an advisor's screen.
 * Each block is taken WHOLE OR NOT AT ALL: every parallel list must be present, of the
 * right kind, and of the same length, or the block is refused and the screen keeps what it
 * held. A partial block would put a client's loans beside an advisor's opening with
 * nothing on screen to say so. Words are taken only from their own known set.
 */

const SELL_DOWN = require('~/data/forecast-sell-down.json')

/** Provenance words a figure may carry. Anything else is read as `entered`. */
const SOURCES = ['file', 'entered']
/** A funding line is one of two things; anything else is a term loan, as it always was. */
const LOAN_TYPES = ['term', 'facility']
const GST_PERIODS = ['One Monthly', 'Two Monthly', 'Six Monthly']
const GST_BASES = ['Invoice', 'Cash']
const SALES_SOURCES = ['entered', 'seeded']
const SHIPMENT_SPEEDS = ['Sea', 'Air', 'Express']
const CAPITAL_DIRECTIONS = ['buy', 'sell']
/** How much of each statement the report draws (Mike's ruling, 2026-09-05). */
const DETAIL_MODES = ['summary', 'every']

const MONTHS = 12
/** The two collection profiles are five bands each. */
const PROFILE_BANDS = 5
/** The engine's own cap on funding lines, mirrored so a hostile row cannot exceed it. */
const MAX_LOAN_ROWS = 8
/** Rows a hostile row list may carry. The store's own array cap is 120. */
const MAX_ROWS = 60
/** The measured history the intake keeps — up to 24 months. */
const MAX_HISTORY = 24
const MAX_NAME = 200

const isNum = v => typeof v === 'number' && Number.isFinite(v)
/** A figure, or a blank: an optional figure not yet typed, or an empty month. */
const isNumOrBlank = v => v === null || isNum(v)
const isShortString = v => typeof v === 'string' && v.length <= MAX_NAME
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

/** A list of finite numbers of exactly `len`, or null. @returns {Array<number>|null} */
function numList (v, len) {
  if (!Array.isArray(v) || v.length > MAX_ROWS + MAX_HISTORY) { return null }
  if (typeof len === 'number' && v.length !== len) { return null }
  return v.every(isNum) ? v.slice() : null
}

/** The same, admitting blanks (an untyped month). @returns {Array<number|null>|null} */
function numOrBlankList (v, len) {
  if (!Array.isArray(v)) { return null }
  if (typeof len === 'number' && v.length !== len) { return null }
  return v.every(isNumOrBlank) ? v.slice() : null
}

/** A list of short strings of exactly `len`, or null. @returns {Array<string>|null} */
function strList (v, len) {
  if (!Array.isArray(v)) { return null }
  if (typeof len === 'number' && v.length !== len) { return null }
  return v.every(isShortString) ? v.slice() : null
}

/** One of a known set, or the fallback. @returns {string} */
function oneOf (v, set, fallback) {
  return typeof v === 'string' && set.includes(v) ? v : fallback
}

/** Every list the same length, and that length within the cap. @returns {boolean} */
function sameLength (lists, cap) {
  if (lists.includes(null)) { return false }
  const n = lists[0].length
  if (n > cap) { return false }
  return lists.every(l => l.length === n)
}

/** The demand patterns the mentor holds — a saved pattern must still be one of them. */
function patternNames () {
  return (SELL_DOWN.patterns || []).map(p => p.name)
}

// ── Flatten ────────────────────────────────────────────────────────────────────────────

/**
 * A keyed block of tagged figures as three lists: its names, its values, its sources.
 * @param {object} block - e.g. `form.opening`, `{ [name]: { value, source } }`
 * @returns {{keys: Array<string>, values: Array<number>, sources: Array<string>}}
 */
function flattenTagged (block) {
  const keys = Object.keys(block || {})
  return {
    keys,
    values: keys.map(k => Number(block[k] && block[k].value) || 0),
    sources: keys.map(k => oneOf(block[k] && block[k].source, SOURCES, 'entered'))
  }
}

/**
 * The whole forecast as one flat row the store admits.
 *
 * @param {object} form - the intake's confirmed state (`confirmed.state`)
 * @param {object} levers - the report's four levers `{ salesShift, markup, debtorMonthAfter, overheadShift }`
 * @param {string} detail - 'summary' or 'every'
 * @returns {object} the flat row — 86 named values, no nesting
 */
function flattenForecast (form, levers, detail) {
  const f = form || {}
  const o = f.overseas || {}
  const sd = o.sellDown || {}
  const t = o.shipmentTerms || {}
  const ships = Array.isArray(o.shipments) ? o.shipments : []
  const cap = Array.isArray(f.capital) ? f.capital : []
  const loans = Array.isArray(f.loans) ? f.loans : []
  const holders = Array.isArray(f.shareholders) ? f.shareholders : []
  const assets = Array.isArray(f.assets) ? f.assets : []
  const lv = levers || {}

  const opening = flattenTagged(f.opening)
  const overheads = flattenTagged(f.overheads)
  const num = v => Number(v) || 0

  const row = {
    // The client's own name is NOT here, and neither is the trend read: one is a thing
    // only the dropped file knows (the Quick Position rule), the other is derived and
    // read-only, and a derived value stored beside its inputs is one that can disagree.
    reportDate: typeof f.reportDate === 'string' ? f.reportDate : '',
    startDate: typeof f.startDate === 'string' ? f.startDate : '',

    'opening.keys': opening.keys,
    opening: opening.values,
    'opening.src': opening.sources,

    'assets.keys': assets.map(a => String(a.key || '')),
    'assets.opening': assets.map(a => num(a.opening && a.opening.value)),
    'assets.src': assets.map(a => oneOf(a.opening && a.opening.source, SOURCES, 'entered')),
    'assets.rate': assets.map(a => num(a.rate)),

    'loans.name': loans.map(l => String(l.name || '').slice(0, MAX_NAME)),
    'loans.type': loans.map(l => oneOf(l.type, LOAN_TYPES, 'term')),
    'loans.opening': loans.map(l => num(l.opening && l.opening.value)),
    'loans.src': loans.map(l => oneOf(l.opening && l.opening.source, SOURCES, 'entered')),
    'loans.repayment': loans.map(l => num(l.repayment)),
    'loans.rate': loans.map(l => num(l.rate)),

    'shareholders.opening': holders.map(s => num(s.opening && s.opening.value)),
    'shareholders.src': holders.map(s => oneOf(s.opening && s.opening.source, SOURCES, 'entered')),

    'overheads.keys': overheads.keys,
    overheads: overheads.values,
    'overheads.src': overheads.sources,

    markup: num(f.markup),
    taxRate: num(f.taxRate),
    gstRate: num(f.gstRate),
    gstPeriod: oneOf(f.gstPeriod, GST_PERIODS, 'Two Monthly'),
    gstBasis: oneOf(f.gstBasis, GST_BASES, 'Invoice'),
    overdraftRate: num(f.overdraftRate),
    inFundsRate: num(f.inFundsRate),
    shareholderRate: num(f.shareholderRate),
    debtor: (f.debtor || []).map(num),
    creditor: (f.creditor || []).map(num),
    'direct.freight': num(f.direct && f.direct.freight),
    'direct.otherDirectExempt': num(f.direct && f.direct.otherDirectExempt),
    'direct.otherTwo': num(f.direct && f.direct.otherTwo),
    'direct.commissions': num(f.direct && f.direct.commissions),

    sales: (f.sales || []).map(num),
    salesSource: oneOf(f.salesSource, SALES_SOURCES, 'entered'),
    purchases: (f.purchases || []).map(num),

    'transit.balanceOwing': num(f.stockInTransit && f.stockInTransit.balanceOwing),
    'transit.landing': ((f.stockInTransit && f.stockInTransit.landing) || []).map(num),

    'os.enabled': o.enabled === true,
    'os.importedPurchases': (o.importedPurchases || []).map(num),
    'os.depositPct': num(o.depositPct),
    'os.depositLeadMonths': num(o.depositLeadMonths),
    'os.balancePayment': (o.balancePayment || []).map(num),
    'os.freightPct': num(o.freightPct),
    'os.dutyPct': num(o.dutyPct),
    'os.fxAllowancePct': num(o.fxAllowancePct),
    'os.readyAfterMonths': num(o.readyAfterMonths),
    // Blanks are meaningful here: an empty month means the ladder governs it.
    'os.revenueOverride': (o.importedRevenueOverride || []).map(v => (isNum(v) ? v : null)),
    'os.sellDown.newMarkup': num(sd.newMarkup),
    'os.sellDown.standardMarkup': num(sd.standardMarkup),
    'os.sellDown.runoutMarkup': num(sd.runoutMarkup),
    'os.sellDown.newUpToDays': num(sd.newUpToDays),
    'os.sellDown.standardUpToDays': num(sd.standardUpToDays),
    'os.sellDown.runoutUpToDays': num(sd.runoutUpToDays),
    'os.sellDown.pattern': String(sd.pattern || '').slice(0, MAX_NAME),
    'os.overseasSales': (o.overseasSales || []).map(num),
    'os.deliveryLagMonths': num(o.deliveryLagMonths),
    'os.overseasCollection': (o.overseasCollection || []).map(num),
    'os.zeroRated': o.zeroRated !== false,
    'os.salesFxAllowancePct': num(o.salesFxAllowancePct),
    // Null follows the local mark-up, which is the ruled default — a real value, not a gap.
    'os.overseasMarkup': isNum(o.overseasMarkup) ? o.overseasMarkup : null,
    'os.terms.manufactureDays': num(t.manufactureDays),
    'os.terms.balanceDueDays': num(t.balanceDueDays),
    'os.terms.prepDays': num(t.prepDays),
    'os.terms.interestCoverPct': num(t.interestCoverPct),
    'os.terms.seaDays': num(t.seaDays),
    'os.terms.airDays': num(t.airDays),
    'os.terms.expressDays': num(t.expressDays),
    'os.ships.description': ships.map(s => String(s.description || '').slice(0, MAX_NAME)),
    'os.ships.cost': ships.map(s => num(s.cost)),
    'os.ships.orderDate': ships.map(s => String(s.orderDate || '')),
    'os.ships.depositPct': ships.map(s => num(s.depositPct)),
    'os.ships.speed': ships.map(s => oneOf(s.speed, SHIPMENT_SPEEDS, 'Sea')),

    'cap.what': cap.map(r => String(r.what || '').slice(0, MAX_NAME)),
    'cap.category': cap.map(r => num(r.category)),
    'cap.month': cap.map(r => num(r.month)),
    'cap.direction': cap.map(r => oneOf(r.direction, CAPITAL_DIRECTIONS, 'buy')),
    'cap.price': cap.map(r => num(r.price)),
    'cap.bookValue': cap.map(r => num(r.bookValue)),

    history: (f.history || []).slice(0, MAX_HISTORY).map(num),

    detail: oneOf(detail, DETAIL_MODES, 'summary')
  }

  // 🔴 THE LEVERS ARE OMITTED WHEN THE REPORT HAS NOT REPORTED THEM, and that is not
  // tidiness. Two of the four are DERIVED from the confirmed intake — the mark-up and the
  // month-after collection — so writing zeroes for a forecast saved before step 4 was ever
  // opened would reload as a 0% mark-up: a forecast that recomputes cleanly, looks
  // completely normal, and is wrong. Absent means "the report works them out", which is
  // what it does on every forecast that has never been saved.
  if (levers) {
    row['lever.salesShift'] = num(lv.salesShift)
    row['lever.markup'] = num(lv.markup)
    row['lever.debtorMonthAfter'] = num(lv.debtorMonthAfter)
    row['lever.overheadShift'] = num(lv.overheadShift)
  }
  return row
}

// ── Apply ──────────────────────────────────────────────────────────────────────────────

/**
 * Write a keyed block back BY NAME. A name the form does not hold is ignored; a figure the
 * row does not carry keeps what the form has. Refused whole unless the three lists agree.
 *
 * @param {object} block - the live block, mutated in place
 * @param {Array<string>} keys @param {Array<number>} values @param {Array<string>} sources
 * @returns {boolean} true when the block was applied
 */
function applyTagged (block, keys, values, sources) {
  if (!block || !sameLength([keys, values, sources], MAX_ROWS)) { return false }
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (!has(block, k)) { continue }
    block[k].value = values[i]
    block[k].source = oneOf(sources[i], SOURCES, 'entered')
    // A figure that was split across several export lines offered a choice; a saved figure
    // is settled, so the choice is spent and must not come back beside it.
    block[k].candidates = []
  }
  return true
}

/**
 * Load a saved row back over the intake's state and the report's levers.
 *
 * Every block is independent and every one is all-or-nothing, so a row that is half
 * readable loads the half that is whole and leaves the rest exactly as the screen had it.
 *
 * @param {object} form - the live intake state; a deep copy is returned, this is not mutated
 * @param {object} levers - the live levers
 * @param {object} inputs - the saved row
 * @returns {{form: object, levers: object, detail: string, applied: Array<string>}}
 *   `applied` names the blocks that were taken, for the test and for a developer reading a
 *   refusal — a silent partial load is the failure this whole file exists to prevent.
 */
function applySavedForecast (form, levers, inputs) {
  const f = JSON.parse(JSON.stringify(form || {}))
  const lv = Object.assign({}, levers)
  const row = inputs && typeof inputs === 'object' ? inputs : {}
  const applied = []
  const take = (name, ok) => { if (ok) { applied.push(name) } }

  const str = k => (typeof row[k] === 'string' ? row[k] : null)

  if (str('reportDate') !== null) { f.reportDate = row.reportDate || null; take('reportDate', true) }
  if (str('startDate')) { f.startDate = row.startDate; take('startDate', true) }

  take('opening', applyTagged(f.opening, strList(row['opening.keys']), numList(row.opening), strList(row['opening.src'])))
  take('overheads', applyTagged(f.overheads, strList(row['overheads.keys']), numList(row.overheads), strList(row['overheads.src'])))

  // ── Fixed assets — by name, like the two blocks above, because the six categories are
  // a fixed set the engine knows and a saved row must not move one onto another.
  const aKeys = strList(row['assets.keys'])
  const aOpen = numList(row['assets.opening'])
  const aSrc = strList(row['assets.src'])
  const aRate = numList(row['assets.rate'])
  if (Array.isArray(f.assets) && sameLength([aKeys, aOpen, aSrc, aRate], MAX_ROWS)) {
    for (let i = 0; i < aKeys.length; i++) {
      const row2 = f.assets.find(a => a.key === aKeys[i])
      if (!row2) { continue }
      row2.opening.value = aOpen[i]
      row2.opening.source = oneOf(aSrc[i], SOURCES, 'entered')
      row2.opening.candidates = []
      row2.rate = aRate[i]
    }
    take('assets', true)
  }

  // ── Funding lines — POSITIONAL, because they are a row list the advisor adds to, and
  // the row count is itself part of what was saved.
  const lName = strList(row['loans.name'])
  const lType = strList(row['loans.type'])
  const lOpen = numList(row['loans.opening'])
  const lSrc = strList(row['loans.src'])
  const lRep = numList(row['loans.repayment'])
  const lRate = numList(row['loans.rate'])
  if (sameLength([lName, lType, lOpen, lSrc, lRep, lRate], MAX_LOAN_ROWS)) {
    f.loans = lName.map((name, i) => ({
      name,
      type: oneOf(lType[i], LOAN_TYPES, 'term'),
      opening: { value: lOpen[i], source: oneOf(lSrc[i], SOURCES, 'entered'), candidates: [] },
      repayment: lRep[i],
      rate: lRate[i]
    }))
    take('loans', true)
  }

  const hOpen = numList(row['shareholders.opening'])
  const hSrc = strList(row['shareholders.src'])
  if (sameLength([hOpen, hSrc], MAX_ROWS)) {
    f.shareholders = hOpen.map((v, i) => ({
      opening: { value: v, source: oneOf(hSrc[i], SOURCES, 'entered'), candidates: [] }
    }))
    take('shareholders', true)
  }

  // ── The rates and settings, each in its own shape and each on its own: one bad rate
  // must not cost the other seven, and none of them can be partially right.
  const scalars = ['markup', 'taxRate', 'gstRate', 'overdraftRate', 'inFundsRate', 'shareholderRate']
  scalars.forEach((k) => { if (isNum(row[k])) { f[k] = row[k]; take(k, true) } })
  if (str('gstPeriod') && GST_PERIODS.includes(row.gstPeriod)) { f.gstPeriod = row.gstPeriod; take('gstPeriod', true) }
  if (str('gstBasis') && GST_BASES.includes(row.gstBasis)) { f.gstBasis = row.gstBasis; take('gstBasis', true) }

  const debtor = numList(row.debtor, PROFILE_BANDS)
  if (debtor) { f.debtor = debtor; take('debtor', true) }
  const creditor = numList(row.creditor, PROFILE_BANDS)
  if (creditor) { f.creditor = creditor; take('creditor', true) }

  if (!f.direct) { f.direct = {} }
  const directKeys = ['freight', 'otherDirectExempt', 'otherTwo', 'commissions']
  directKeys.forEach((k) => { if (isNum(row['direct.' + k])) { f.direct[k] = row['direct.' + k]; take('direct.' + k, true) } })

  const sales = numList(row.sales, MONTHS)
  if (sales) { f.sales = sales; take('sales', true) }
  if (str('salesSource') && SALES_SOURCES.includes(row.salesSource)) { f.salesSource = row.salesSource; take('salesSource', true) }
  const purchases = numList(row.purchases, MONTHS)
  if (purchases) { f.purchases = purchases; take('purchases', true) }

  // ── Stock in transit — the owed figure and the twelve landing months together, because
  // a balance with no landing months is the very state the block warns about.
  const landing = numList(row['transit.landing'], MONTHS)
  if (landing && isNum(row['transit.balanceOwing'])) {
    f.stockInTransit = { balanceOwing: row['transit.balanceOwing'], landing }
    take('stockInTransit', true)
  }

  applyOverseas(f, row, take)
  applyCapital(f, row, take)

  const history = numList(row.history)
  if (history && history.length <= MAX_HISTORY) { f.history = history; take('history', true) }

  const leverKeys = ['salesShift', 'markup', 'debtorMonthAfter', 'overheadShift']
  leverKeys.forEach((k) => { if (isNum(row['lever.' + k])) { lv[k] = row['lever.' + k]; take('lever.' + k, true) } })

  const detail = oneOf(row.detail, DETAIL_MODES, null)
  if (detail) { take('detail', true) }

  return { form: f, levers: lv, detail: detail || 'summary', applied }
}

/**
 * The overseas panel. Split out because it is a screen of its own and its own length made
 * `applySavedForecast` unreadable — the same rules apply to every figure in it.
 * @param {object} f @param {object} row @param {Function} take
 */
function applyOverseas (f, row, take) {
  if (!f.overseas) { f.overseas = {} }
  const o = f.overseas
  if (typeof row['os.enabled'] === 'boolean') { o.enabled = row['os.enabled']; take('os.enabled', true) }
  if (typeof row['os.zeroRated'] === 'boolean') { o.zeroRated = row['os.zeroRated']; take('os.zeroRated', true) }

  const series = { importedPurchases: 'os.importedPurchases', overseasSales: 'os.overseasSales' }
  Object.keys(series).forEach((k) => {
    const v = numList(row[series[k]], MONTHS)
    if (v) { o[k] = v; take(series[k], true) }
  })
  const override = numOrBlankList(row['os.revenueOverride'], MONTHS)
  if (override) { o.importedRevenueOverride = override; take('os.revenueOverride', true) }
  const balance = numList(row['os.balancePayment'], PROFILE_BANDS)
  if (balance) { o.balancePayment = balance; take('os.balancePayment', true) }
  const collection = numList(row['os.overseasCollection'], PROFILE_BANDS)
  if (collection) { o.overseasCollection = collection; take('os.overseasCollection', true) }

  const nums = ['depositPct', 'depositLeadMonths', 'freightPct', 'dutyPct', 'fxAllowancePct',
    'readyAfterMonths', 'deliveryLagMonths', 'salesFxAllowancePct']
  nums.forEach((k) => { if (isNum(row['os.' + k])) { o[k] = row['os.' + k]; take('os.' + k, true) } })
  // A blank mark-up is a real answer here — it means "follow the local one" — so null is
  // taken as readily as a number, and only an unusable value is refused.
  if (isNumOrBlank(row['os.overseasMarkup'])) { o.overseasMarkup = row['os.overseasMarkup']; take('os.overseasMarkup', true) }

  if (!o.sellDown) { o.sellDown = {} }
  const ladder = ['newMarkup', 'standardMarkup', 'runoutMarkup', 'newUpToDays', 'standardUpToDays', 'runoutUpToDays']
  ladder.forEach((k) => { if (isNum(row['os.sellDown.' + k])) { o.sellDown[k] = row['os.sellDown.' + k]; take('os.sellDown.' + k, true) } })
  // The pattern must still be one the mentor holds. An unknown name is refused rather than
  // set, because the chooser would show a value it cannot explain.
  const pattern = oneOf(row['os.sellDown.pattern'], patternNames(), null)
  if (pattern) { o.sellDown.pattern = pattern; take('os.sellDown.pattern', true) }

  if (!o.shipmentTerms) { o.shipmentTerms = {} }
  const terms = ['manufactureDays', 'balanceDueDays', 'prepDays', 'interestCoverPct', 'seaDays', 'airDays', 'expressDays']
  terms.forEach((k) => { if (isNum(row['os.terms.' + k])) { o.shipmentTerms[k] = row['os.terms.' + k]; take('os.terms.' + k, true) } })

  const sDesc = strList(row['os.ships.description'])
  const sCost = numList(row['os.ships.cost'])
  const sDate = strList(row['os.ships.orderDate'])
  const sDep = numList(row['os.ships.depositPct'])
  const sSpeed = strList(row['os.ships.speed'])
  if (sameLength([sDesc, sCost, sDate, sDep, sSpeed], MAX_ROWS)) {
    o.shipments = sDesc.map((description, i) => ({
      description,
      cost: sCost[i],
      orderDate: sDate[i],
      depositPct: sDep[i],
      speed: oneOf(sSpeed[i], SHIPMENT_SPEEDS, 'Sea')
    }))
    take('os.shipments', true)
  }
}

/**
 * The capital rows — buying and selling assets.
 * @param {object} f @param {object} row @param {Function} take
 */
function applyCapital (f, row, take) {
  const what = strList(row['cap.what'])
  const category = numList(row['cap.category'])
  const month = numList(row['cap.month'])
  const direction = strList(row['cap.direction'])
  const price = numList(row['cap.price'])
  const bookValue = numList(row['cap.bookValue'])
  if (!sameLength([what, category, month, direction, price, bookValue], MAX_ROWS)) { return }
  f.capital = what.map((w, i) => ({
    what: w,
    category: category[i],
    month: month[i],
    direction: oneOf(direction[i], CAPITAL_DIRECTIONS, 'buy'),
    price: price[i],
    bookValue: bookValue[i]
  }))
  take('capital', true)
}

// ── Which figures the client changed ───────────────────────────────────────────────────

/**
 * Compare a saved row against the advisor's own version, FIGURE BY FIGURE, so the `client`
 * badge lands on the one box that changed rather than on the block holding it.
 *
 * The store cannot do this: it compares the row's named values, and every block here is a
 * list. The advisor's version travels with the row (`report.advisorVersion`), so the
 * comparison belongs on the screen — see this file's header note.
 *
 * Names come back in the shape the screen asks with: `opening.cashAtBank`,
 * `overheads.rent`, `assets.vehicles.rate`, `loans.2.repayment`, `sales.4`, `lever.markup`.
 *
 * @param {object} inputs - the saved row now on screen
 * @param {object} advisor - the advisor's last version, or null when there is none
 * @returns {Array<string>} every figure that differs; empty when there is nothing to compare
 */
function changedFigures (inputs, advisor) {
  if (!inputs || !advisor) { return [] }
  const out = []
  const differs = (a, b) => JSON.stringify(a === undefined ? null : a) !== JSON.stringify(b === undefined ? null : b)

  // A keyed block: names travel with the values, so a figure is compared to the figure of
  // the SAME NAME even if the two rows list them in a different order.
  const keyed = (keysKey, valuesKey, prefix) => {
    const nowKeys = strList(inputs[keysKey])
    const wasKeys = strList(advisor[keysKey])
    const now = numList(inputs[valuesKey])
    const was = numList(advisor[valuesKey])
    if (!nowKeys || !wasKeys || !now || !was) { return }
    for (let i = 0; i < nowKeys.length && i < now.length; i++) {
      const j = wasKeys.indexOf(nowKeys[i])
      if (j === -1 || j >= was.length) { continue }
      if (differs(now[i], was[j])) { out.push(prefix + '.' + nowKeys[i]) }
    }
  }
  keyed('opening.keys', 'opening', 'opening')
  keyed('overheads.keys', 'overheads', 'overheads')

  // The six asset categories carry two figures each, so they are named individually.
  const aKeysNow = strList(inputs['assets.keys'])
  const aKeysWas = strList(advisor['assets.keys']);
  ['opening', 'rate'].forEach((field) => {
    const now = numList(inputs['assets.' + field])
    const was = numList(advisor['assets.' + field])
    if (!aKeysNow || !aKeysWas || !now || !was) { return }
    for (let i = 0; i < aKeysNow.length && i < now.length; i++) {
      const j = aKeysWas.indexOf(aKeysNow[i])
      if (j === -1 || j >= was.length) { continue }
      if (differs(now[i], was[j])) { out.push('assets.' + aKeysNow[i] + '.' + field) }
    }
  })

  // Positional row lists: a row that exists on both sides is compared field by field. A row
  // the client ADDED has nothing to compare against, so the row itself is named — the screen
  // marks the whole row, which is the honest answer.
  const rows = (prefix, fields, countKey) => {
    const nowLen = Array.isArray(inputs[countKey]) ? inputs[countKey].length : 0
    const wasLen = Array.isArray(advisor[countKey]) ? advisor[countKey].length : 0
    for (let i = 0; i < nowLen; i++) {
      if (i >= wasLen) { out.push(prefix + '.' + i); continue }
      fields.forEach((field) => {
        const now = inputs[prefix + '.' + field]
        const was = advisor[prefix + '.' + field]
        if (!Array.isArray(now) || !Array.isArray(was) || i >= was.length) { return }
        if (differs(now[i], was[i])) { out.push(prefix + '.' + i + '.' + field) }
      })
    }
  }
  rows('loans', ['name', 'type', 'opening', 'repayment', 'rate'], 'loans.name')
  rows('shareholders', ['opening'], 'shareholders.opening')
  rows('cap', ['what', 'category', 'month', 'direction', 'price', 'bookValue'], 'cap.what')
  rows('os.ships', ['description', 'cost', 'orderDate', 'depositPct', 'speed'], 'os.ships.description')

  // Series: the month that moved, not the whole strip.
  const seriesKeys = ['sales', 'purchases', 'debtor', 'creditor', 'transit.landing',
    'os.importedPurchases', 'os.overseasSales', 'os.revenueOverride', 'os.balancePayment',
    'os.overseasCollection', 'history']
  seriesKeys.forEach((k) => {
    const now = inputs[k]
    const was = advisor[k]
    if (!Array.isArray(now) || !Array.isArray(was)) { return }
    for (let i = 0; i < now.length; i++) {
      if (i >= was.length) { out.push(k + '.' + i); continue }
      if (differs(now[i], was[i])) { out.push(k + '.' + i) }
    }
  })

  // Everything else is one named value already, so it compares as itself. The three lists
  // and the row lists above are excluded — they have been named more precisely.
  const listed = /^(opening|overheads|assets\.|loans\.|shareholders\.|cap\.|os\.ships\.|sales|purchases|debtor|creditor|transit\.landing|os\.importedPurchases|os\.overseasSales|os\.revenueOverride|os\.balancePayment|os\.overseasCollection|history)/
  Object.keys(inputs).forEach((k) => {
    if (listed.test(k)) { return }
    if (differs(inputs[k], advisor[k])) { out.push(k) }
  })

  return out
}

module.exports = {
  flattenForecast,
  applySavedForecast,
  changedFigures,
  SOURCES,
  LOAN_TYPES,
  GST_PERIODS,
  GST_BASES,
  DETAIL_MODES,
  MAX_LOAN_ROWS
}

'use strict'

/**
 * @file The Loan Estimator's saved-report shape (item 4.62, Brief §5).
 * @module utils/loanEstimatorSavedShape
 *
 * The Loan Estimator is four screens in a row, and the page holds each step's
 * CONFIRMED figures in the model's own shape (`securities[]`, `loans{}`, decimals).
 * A saved report is one flat row of named figures, so this file is the two-way
 * translation between them — kept out of the page for the same reason as
 * utils/quizRows.js: these are the rules that decide what a save sends and what a
 * saved row is allowed to put on screen, and they are tested directly, not through
 * a mounted page.
 *
 * FLATTEN: `security.residentialHome.value`, `business.ebit`,
 * `serviceability.loans.newPropertyLoans.balance`, `repayment.purchasePrice`. A step
 * that was never confirmed is simply absent from the row; the repayment calculator
 * is always present.
 *
 * REBUILD: a saved row is hostile — a client wrote it, and it comes back onto an
 * advisor's screen. A step is rebuilt WHOLE or not at all: every figure the step
 * needs must be present and the right shape, or the step is left unconfirmed and the
 * page lands on it. Nothing is ever filled in from the sample, because a plausible
 * sample figure standing in for a missing one is exactly what a person cannot see
 * (the defaults-merge leak the forecast found, report-models.md).
 */

const loanCriteria = require('../data/loan-criteria.json')

const SECURITY_KEYS = loanCriteria.securityClasses.map(c => c.key)
const PROSPECTS = ['Static', 'Growth', 'Decline']
const SUB_FIELDS = ['commercialPropertyRentalIncome', 'propertyCapRate', 'fonterraShares', 'fonterraTradingValue']
const BUSINESS_TYPES = ['Commercial Business', 'Farm']
const LOAN_KEYS = ['revolvingCredit', 'currentPropertyLoans', 'newPropertyLoans', 'personalTermLoans']
const LOAN_FIELDS = ['balance', 'actualRate', 'assessmentTermYears', 'actualTermYears']
const SERVICEABILITY_NUMBERS = [
  'stressMargin', 'dependantsUnder18', 'dependantsOver18', 'numberOfVehicles',
  'customer1GrossIncome', 'customer2GrossIncome', 'otherMonthlyTaxPaidIncome',
  'currentRentalWeekly', 'newRentalWeekly', 'studentLoan1Monthly', 'studentLoan2Monthly',
  'overdraftLimits', 'creditCardLimits', 'rentPaidWeekly', 'generalLivingWeekly', 'additionalLivingWeekly'
]
const BOARDER_FIELDS = ['number', 'weeklyCharge', 'termWeeks']
const TERM_UNITS = ['Years', 'Months']
const BASES = ['Table', 'Reducing', 'Interest Only']

const isNumber = v => typeof v === 'number' && Number.isFinite(v)
const isBoolean = v => typeof v === 'boolean'
const oneOf = list => v => list.includes(v)

/**
 * A step's schema: every flat name it saves, where it sits in the model-shaped
 * payload, and the shape it must have coming back. Order is the payload's own.
 * @returns {Array<{name: string, path: Array<string|number>, check: function}>}
 */
function securitySchema () {
  const s = []
  SECURITY_KEYS.forEach((key, i) => {
    const row = 'security.' + key + '.'
    s.push({ name: row + 'value', path: ['securities', i, 'value'], check: isNumber })
    s.push({ name: row + 'adjustmentPct', path: ['securities', i, 'adjustmentPct'], check: isNumber })
    s.push({ name: row + 'prospects', path: ['securities', i, 'prospects'], check: oneOf(PROSPECTS) })
    s.push({ name: row + 'currentDebt', path: ['securities', i, 'currentDebt'], check: isNumber })
    s.push({ name: row + 'currentMonthlyPayments', path: ['securities', i, 'currentMonthlyPayments'], check: isNumber })
  })
  SUB_FIELDS.forEach((f) => { s.push({ name: 'security.subCalculations.' + f, path: ['subCalculations', f], check: isNumber }) })
  s.push({ name: 'security.overdraft.fundsDrawn', path: ['overdraft', 'fundsDrawn'], check: isNumber })
  s.push({ name: 'security.overdraft.secured', path: ['overdraft', 'secured'], check: isBoolean })
  return s
}

function businessSchema () {
  return [
    { name: 'business.ebit', path: ['ebit'], check: isNumber },
    { name: 'business.businessType', path: ['businessType'], check: oneOf(BUSINESS_TYPES) },
    { name: 'business.fullTimeStaff', path: ['fullTimeStaff'], check: isNumber },
    { name: 'business.partTimeStaff', path: ['partTimeStaff'], check: isNumber },
    { name: 'business.currentTaxDue', path: ['currentTaxDue'], check: isNumber }
  ]
}

function serviceabilitySchema () {
  const s = [{ name: 'serviceability.jointApplication', path: ['jointApplication'], check: isBoolean }]
  SERVICEABILITY_NUMBERS.forEach((f) => { s.push({ name: 'serviceability.' + f, path: [f], check: isNumber }) })
  BOARDER_FIELDS.forEach((f) => { s.push({ name: 'serviceability.boarders.' + f, path: ['boarders', f], check: isNumber }) })
  LOAN_KEYS.forEach((key) => {
    LOAN_FIELDS.forEach((f) => {
      s.push({ name: 'serviceability.loans.' + key + '.' + f, path: ['loans', key, f], check: isNumber })
    })
  })
  return s
}

/** The report screen's own six controls, in display form (a rate as 5.5, not 0.055). */
function repaymentSchema () {
  return [
    { name: 'repayment.purchasePrice', path: ['purchasePrice'], check: isNumber },
    { name: 'repayment.deposit', path: ['deposit'], check: isNumber },
    { name: 'repayment.ratePct', path: ['ratePct'], check: isNumber },
    { name: 'repayment.term', path: ['term'], check: isNumber },
    { name: 'repayment.termUnit', path: ['termUnit'], check: oneOf(TERM_UNITS) },
    { name: 'repayment.basis', path: ['basis'], check: oneOf(BASES) }
  ]
}

const SCHEMAS = {
  security: securitySchema(),
  business: businessSchema(),
  serviceability: serviceabilitySchema(),
  repayment: repaymentSchema()
}

/** The number of figures a full row holds — pinned by the test against the store's cap. */
const ROW_SIZE = Object.keys(SCHEMAS).reduce((n, k) => n + SCHEMAS[k].length, 0)

function getPath (obj, path) {
  let cur = obj
  for (let i = 0; i < path.length; i++) {
    if (cur === null || cur === undefined) { return undefined }
    cur = cur[path[i]]
  }
  return cur
}

function setPath (obj, path, value) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]
    if (cur[k] === undefined) { cur[k] = typeof path[i + 1] === 'number' ? [] : {} }
    cur = cur[k]
  }
  cur[path[path.length - 1]] = value
}

/**
 * The flat saved row for the page's current state. A step that is null is absent;
 * a figure a step should carry but does not is also absent, never invented.
 * @param {{security: object|null, business: object|null, serviceability: object|null, repayment: object}} state
 * @returns {object}
 */
function flattenLoanEstimator (state) {
  const out = {}
  Object.keys(SCHEMAS).forEach((step) => {
    const src = state && state[step]
    if (!src || typeof src !== 'object') { return }
    SCHEMAS[step].forEach((f) => {
      const v = getPath(src, f.path)
      if (v !== undefined) { out[f.name] = v }
    })
  })
  return out
}

/**
 * One step from a saved row: the model-shaped payload if every figure is present and
 * well-shaped, else null. `present` says whether the row carried any of the step's
 * figures at all, so the page can tell "never confirmed" from "came back broken".
 * @returns {{payload: object|null, present: boolean}}
 */
function takeStep (inputs, step) {
  const schema = SCHEMAS[step]
  const present = schema.some(f => inputs[f.name] !== undefined)
  if (!present) { return { payload: null, present: false } }
  const out = {}
  for (let i = 0; i < schema.length; i++) {
    const f = schema[i]
    const v = inputs[f.name]
    if (!f.check(v)) { return { payload: null, present: true } }
    setPath(out, f.path, v)
  }
  if (step === 'security') {
    out.securities.forEach((sec, i) => { sec.key = SECURITY_KEYS[i] })
  }
  if (step === 'serviceability') {
    out.country = 'NZ' // fixed by the step itself (ruled 2026-07-23), never saved
  }
  return { payload: out, present: true }
}

/**
 * Rebuild the page's state from a saved row. Each step is whole or null; `step` is
 * where the page should land: the first step that is missing or came back broken,
 * or the report when the row is complete. The business step is optional (a
 * personal-only enquiry), so its absence is not a stop — but a broken business
 * step is, so a block the advisor entered is never silently dropped.
 * @param {object} inputs - a saved row, hostile
 * @returns {{security: object|null, business: object|null, serviceability: object|null, repayment: object|null, step: number}}
 */
function rebuildLoanEstimator (inputs) {
  const src = inputs && typeof inputs === 'object' && !Array.isArray(inputs) ? inputs : {}
  const security = takeStep(src, 'security')
  const business = takeStep(src, 'business')
  const serviceability = takeStep(src, 'serviceability')
  const repayment = takeStep(src, 'repayment')
  if (business.payload && security.payload) {
    // The business step carries step 1's securities through, exactly as its confirm() does.
    business.payload.securities = security.payload.securities
  }
  let step = 4
  if (!security.payload) { step = 1 } else if (business.present && !business.payload) { step = 2 } else if (!serviceability.payload) { step = 3 }
  return {
    security: security.payload,
    business: business.payload,
    serviceability: serviceability.payload,
    repayment: repayment.payload,
    step
  }
}

/**
 * Whether any figure under one prefix was changed by the client — for the two grids,
 * whose cells have no label of their own, so the badge sits on the row.
 * @param {string[]} changes - the saved-report mixin's clientChanges
 * @param {string} prefix - e.g. 'security.residentialHome'
 * @returns {boolean}
 */
function rowChanged (changes, prefix) {
  if (!Array.isArray(changes)) { return false }
  const p = prefix + '.'
  return changes.some(k => typeof k === 'string' && k.indexOf(p) === 0)
}

module.exports = { flattenLoanEstimator, rebuildLoanEstimator, rowChanged, ROW_SIZE }

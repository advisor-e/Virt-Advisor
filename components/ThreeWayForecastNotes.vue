<template lang="pug">
.twn
  h2.twn-title {{ $t(N + 'title') }}
  p.twn-sub {{ $t(N + 'sub', { date: startDate }) }}

  h3.twn-note {{ $t(N + 'note1') }}
  p {{ $t(N + 'basis.intro') }}
  template(v-if="purpose")
    h4 {{ $t(W + 'purposeHeading') }}
    p {{ $t(W + 'purpose', { purpose }) }}
  h4 {{ $t(W + 'assumptionsHeading') }}
  p {{ $t(W + 'assumptions') }}
  h4 {{ $t(W + 'policiesHeading') }}
  p {{ $t(W + 'policies') }}
  p {{ $t(W + 'measurement') }}
  p {{ $t(W + 'noPolicyChange') }}
  h4 {{ $t(N + 'basis.forecastHeading') }}
  p {{ $t(N + 'basis.forecastBody') }}
  h4 {{ $t(N + 'basis.standardsHeading') }}
  p {{ $t(N + 'basis.standards') }}
  p {{ $t(N + 'basis.numbering') }}
  p {{ $t(N + 'basis.noAdvice') }}

  h3.twn-note {{ $t(N + 'note2') }}
  p {{ $t(N + 'assumptions.intro') }}
  p(v-if="salesBasis") {{ $t(W + 'salesBasis', { basis: salesBasis }) }}
  table.twn-table
    tbody
      template(v-for="g in assumptionGroups")
        tr.twn-group(:key="'g-' + g.key")
          td(colspan="2") {{ $t(g.heading) }}
        tr(v-for="(r, i) in g.rows" :key="g.key + '-' + i")
          td {{ r.rawLabel || $t(r.label) }}
          td {{ r.value }}

  h3.twn-note {{ $t(N + 'note3') }}
  p(v-for="g in generalAssumptions" :key="'ga-' + g.key")
    b {{ $t(G + g.key + 'Heading') }}
    | {{ ' ' + g.text }}

  h3.twn-note {{ $t(N + 'note4') }}
  template(v-for="(s, n) in methodSections")
    h4(:key="'h-' + s.key") {{ (n + 1) + '. ' + $t(M + s.key) }}
    ul(:key="'l-' + s.key")
      li(v-for="(line, i) in s.lines" :key="s.key + '-' + i") {{ line }}

  h3.twn-note {{ $t(N + 'note5') }}
  p {{ $t(N + (differences.length === 4 ? 'differs.leadFour' : 'differs.leadThree')) }}
  ol
    li(v-for="(d, i) in differences" :key="'d-' + i") {{ d }}
  p {{ $t(N + 'differs.reviewed') }}

  //- Issued in the firm's name, so it appears only once the advisor has named the firm.
  template(v-if="preparedBy")
    h3.twn-note {{ $t(C + 'heading') }}
    p(v-for="k in compilationKeys" :key="'c-' + k") {{ $t(C + k, { client: client, firm: preparedBy }) }}
    i18n(:path="C + 'signature'" tag="p")
      template(#firm)
        b {{ preparedBy }}
      template(#date) {{ printedDate }}
</template>

<script>
import { accountingMoney } from '~/utils/currencyFormat'
import { intlLocaleFor } from '~/utils/dateLocale'

const N = 'report.threeWayForecast.notes.'
const M = N + 'method.'
const W = N + 'workbook.'
const G = N + 'general.'
const C = N + 'compilation.'
/** The compilation report's paragraphs, in the workbook's order. */
const COMPILATION = ['information', 'request', 'diligence', 'assurance', 'update', 'consent']
const A = 'report.threeWayForecast.assume.'
const MONTH_LABELS = ['sameMonth', 'monthAfter', 'twoMonths', 'threeMonths', 'fourMonths']

/**
 * ThreeWayForecastNotes — "Notes to the forecast", each forecast's OWN support notes (item
 * 44.1; drawing approved by Mike 2026-09-30: design/mockups/three-way-forecast-notes.html).
 *
 * Five notes, as in a set of accounts: basis of preparation, this forecast's assumptions,
 * general assumptions, how the figures are worked out, and where it differs from full NZ
 * IFRS — then a compilation report in the firm's name. The workbook's own notes (purpose,
 * policies, general assumptions, compilation report) came in with the revised drawing
 * approved 2026-09-30 (1814a520); "Later years" and the inflation sentence read each year's
 * change from the model, so they stay true whatever quick-fire did. A sentence that
 * does not apply is left out; a sentence that depends on what was entered reads it — so the
 * notes can never contradict the forecast they sit in. WHICH sentences apply is decided on
 * the backend (`server/report/threeWayForecastNotes.js`, the `facts`); this renders them.
 *
 * The wording is Mike's approved text (design/CALCULATION-ASSUMPTIONS-FOR-FIRMS.md,
 * 0a913e11) with the rule table's variants, held in locales/en.json and pinned against the
 * approved file by tests/unit/threeWayForecastNotes.test.js.
 */
export default {
  name: 'ThreeWayForecastNotes',

  props: {
    /** The model's `notes` block for year 1: `{ facts, assumptions }`. */
    notes: { type: Object, required: true },
    /** How many years the forecast runs. */
    yearCount: { type: Number, default: 1 },
    /** The firm's (or client's) currency code, for Note 2's amounts. */
    currency: { type: String, default: 'NZD' },
    /** The client's name, for Note 3 and the compilation report. Empty reads "the business". */
    clientName: { type: String, default: '' },
    /** The advisor's three fields: `{ purpose, salesBasis, preparedBy }`, each a string. */
    fields: { type: Object, default: () => ({}) }
  },

  data () {
    return { N, M, W, G, C, compilationKeys: COMPILATION }
  },

  computed: {
    facts () { return this.notes.facts || {} },
    a () { return this.notes.assumptions || {} },
    intlLocale () { return intlLocaleFor(this.$i18n.locale) },
    client () { return this.clientName.trim() || this.$t(G + 'theBusiness') },
    purpose () { return String(this.fields.purpose || '').trim() },
    salesBasis () { return String(this.fields.salesBasis || '').trim() },
    preparedBy () { return String(this.fields.preparedBy || '').trim() },
    laterYears () { return Array.isArray(this.notes.laterYears) ? this.notes.laterYears : [] },

    /** The compilation report's date: the day it is read or printed. */
    printedDate () {
      return new Date().toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    },

    /**
     * Note 3. The inflation sentence reads the forecast: within a year the model applies
     * none, but quick-fire and the sliders can move a later year — so a second sentence says
     * whether any did.
     * @returns {Array<{key: string, text: string}>}
     */
    generalAssumptions () {
      const t = k => this.$t(G + k, { client: this.client })
      let inflation = t('inflation')
      if (this.laterYears.length) {
        inflation += ' ' + t(this.laterYears.every(y => y.same) ? 'inflationRepeats' : 'inflationChanges')
      }
      return ['economic', 'legislative', 'tax', 'competitive', 'industry']
        .map(key => ({ key, text: t(key) }))
        .concat([{ key: 'inflation', text: inflation }])
    },

    /** The forecast's first day, written out in the reader's language. */
    startDate () {
      const iso = this.a.startIso
      if (!iso) { return '' }
      const d = new Date(iso + 'T00:00:00Z')
      return d.toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    },

    /**
     * Note 4, section by section — only the sentences that apply to this forecast. The
     * sections number themselves, so "Foreign currency" leaving renumbers the rest.
     * @returns {Array<{key: string, lines: Array<string>}>}
     */
    methodSections () {
      const f = this.facts
      const t = k => this.$t(M + k)
      const gap = f.overseasGap ? this.pct(f.overseasGap) : null
      const sections = [
        {
          key: 'revenue',
          lines: [
            t('localSales'),
            f.imports && t('importedSales'),
            f.exports && t('overseasSales'),
            t('collection') + ' ' + (gap ? this.$t(M + 'collectedOverseasGap', { gap }) : t('collectedAll')),
            f.sameMonthDebtors ? t('openingDebtorsFirstMonth') : t('openingDebtors'),
            t('otherIncome')
          ]
        },
        {
          key: 'stock',
          lines: [
            t('localCost'),
            f.imports && t('importedCost'),
            f.imports && t('borderGst'),
            f.imports && (f.belowCost ? t('belowCost') : t('aboveCost')),
            t('directCosts')
          ]
        },
        f.fx && {
          key: 'currency',
          lines: [
            this.$t(M + 'currencies', { home: this.currency }),
            f.imports && t('supplierPayments'),
            f.exports && t('overseasConvert'),
            f.inTransit && t('atSea'),
            f.imports && t('supplierInterest'),
            t('whatIf')
          ]
        },
        { key: 'assets', lines: [t('categories'), t('fullMonth'), t('rates'), t('sold'), t('notRevalued')] },
        {
          key: 'borrowing',
          lines: [
            f.termLoans && t('termLoans'),
            f.termLoans && t('termCurrent'),
            f.facilities && t('facilities'),
            t('bankInterest'),
            t('financing'),
            t('expensed')
          ]
        },
        { key: 'tax', lines: [t('taxRate'), t('taxable'), t('deferred'), t('taxPayments')] },
        { key: 'shareholders', lines: [t('shareholderInterest'), t('shareholderGross')] },
        {
          key: 'overheads',
          lines: [
            t('overheadsSpread'),
            f.sameMonthCreditors ? t('suppliersPaidFirstMonth') : t('suppliersPaid'),
            t('accruals'),
            t('holidayPay'),
            t('provisions')
          ]
        },
        { key: 'gst', lines: [t('gstNeverRevenue') + (f.imports ? ' ' + t('gstImports') : '')] },
        { key: 'statements', lines: [t('profitLoss'), t('balanceSheet'), t('cashFlow')] }
      ]
      return sections.filter(Boolean).map(s => ({ key: s.key, lines: s.lines.filter(Boolean) }))
    },

    /** Note 5 — difference 4 is about overseas sales, so a forecast with none has three. */
    differences () {
      const f = this.facts
      const d = k => this.$t(N + 'differs.' + k)
      return [
        f.overseasGap ? this.$t(N + 'differs.badDebtsOverseasGap', { gap: this.pct(f.overseasGap) }) : d('badDebts'),
        d('deferredTax'),
        d('leases'),
        f.exports && d('overseasTiming')
      ].filter(Boolean)
    },

    /**
     * Note 2 — the figures as entered, under the intake screen's own headings and labels.
     * Overseas trade and currencies appear only when this forecast has them.
     * @returns {Array<{key: string, heading: string, rows: Array<object>}>}
     */
    assumptionGroups () {
      const a = this.a
      const f = this.facts
      const row = (label, value) => ({ label, value })
      const profile = list => MONTH_LABELS.map((k, i) => row(A + k, this.pct(list[i] || 0)))
      const r = a.directCostRates || {}
      const groups = [
        {
          key: 'trade',
          heading: A + 'tradeHeading',
          rows: [
            row(A + 'startsOn', this.$tc(N + 'assumptions.length', this.yearCount, { date: this.startDate, n: this.yearCount })),
            row(A + 'markup', this.pct(a.markup)),
            row(A + 'salesHeading', this.$t(N + 'assumptions.forTheYear', { amount: this.cash(a.salesTotal) })),
            row(A + 'purchasesHeading', this.$t(N + 'assumptions.forTheYear', { amount: this.cash(a.purchasesTotal) }))
          ]
        },
        { key: 'debtors', heading: A + 'debtorsHeading', rows: profile(a.debtorCollection || []) },
        { key: 'creditors', heading: A + 'creditorsHeading', rows: profile(a.creditorPayment || []) },
        {
          key: 'direct',
          heading: A + 'directCostsHeading',
          rows: [
            row(A + 'freight', this.ofSales(r.freight)),
            row(A + 'commissions', this.ofSales(r.commissions)),
            row(A + 'otherDirect', this.ofSales(r.otherTwo)),
            row(A + 'otherDirectExempt', this.ofSales(r.otherDirectExempt))
          ]
        },
        {
          key: 'overheads',
          heading: A + 'overheadsHeading',
          rows: [row('report.threeWayForecast.report.overheadsRow', this.$t(N + 'assumptions.overheadsYear', { amount: this.cash(a.overheadsTotal) }))]
        },
        {
          key: 'tax',
          heading: A + 'taxHeading',
          rows: [
            row(A + 'gstRate', this.pct(a.gstRate)),
            row(A + 'gstPeriod', this.returnsFiled(a.gstFilingMonths)),
            row(A + 'gstBasis', this.$t(A + (a.gstBasis === 'Cash' ? 'gstPayments' : 'gstInvoice'))),
            row(A + 'taxRate', this.pct(a.taxRate))
          ]
        },
        {
          key: 'interest',
          heading: A + 'interestHeading',
          rows: [
            row(A + 'overdraftRate', this.pct(a.overdraftInterestRate)),
            row(A + 'inFundsRate', this.pct(a.inFundsInterestRate)),
            row(A + 'shareholderRate', this.pct(a.shareholderInterestRate))
          ]
        },
        {
          key: 'assets',
          heading: 'report.threeWayForecast.confirm.assetsHeading',
          rows: (a.assets || []).map(x => row('report.threeWayForecast.confirm.assets.' + x.key,
            this.$t(N + 'assumptions.asset', { amount: this.cash(x.opening), pct: this.pct(x.depreciationRate) })))
        },
        {
          key: 'funding',
          heading: 'report.threeWayForecast.confirm.fundingHeading',
          rows: (a.loans || []).map(l => ({
            rawLabel: l.name,
            value: l.type === 'facility'
              ? this.$t(N + 'assumptions.facility', { amount: this.cash(l.opening), pct: this.pct(l.interestRate) })
              : this.$t(N + 'assumptions.termLoan', { amount: this.cash(l.opening), pct: this.pct(l.interestRate), repayment: this.cash(l.monthlyRepayment) })
          }))
        }
      ]
      if (f.fx) {
        groups.push({
          key: 'currencies',
          heading: A + 'currencies.heading',
          rows: (a.currencies || []).map(c => ({
            rawLabel: c.code,
            value: this.$t(N + 'assumptions.currencyRate', { home: this.currency, rate: c.rate, code: c.code })
          }))
        })
      }
      const o = a.overseas
      const O = A + 'overseas.'
      if (o && f.imports) {
        groups.push({
          key: 'imports',
          heading: O + 'importHeading',
          rows: [
            row(O + 'deposit', this.pct(o.depositPct)),
            row(O + 'freight', this.pct(o.freightPct)),
            row(O + 'duty', this.pct(o.dutyPct)),
            row(O + 'newPrice', this.pct(o.newMarkup)),
            row(O + 'standardPrice', this.pct(o.standardMarkup)),
            row(O + 'runoutPrice', this.pct(o.runoutMarkup))
          ]
        })
      }
      if (o && f.exports) {
        const pays = ['onDelivery', 'afterDeliveryOne', 'afterDeliveryTwo', 'afterDeliveryThree', 'afterDeliveryFour']
        groups.push({
          key: 'exports',
          heading: O + 'exportHeading',
          rows: pays.map((k, i) => row(O + k, this.pct(o.overseasCollection[i] || 0)))
        })
      }
      const L = N + 'laterYears.'
      groups.push({
        key: 'later',
        heading: L + 'heading',
        rows: this.laterYears.map(y => ({
          rawLabel: this.$t(L + 'year', { n: y.year }),
          value: y.same
            ? this.$t(L + 'same', { prev: y.year - 1, markup: this.pct(y.markup) })
            : this.$t(L + 'changed', {
              sales: this.change(y.salesChange),
              overheads: this.change(y.overheadsChange),
              prev: y.year - 1,
              markup: this.pct(y.markup)
            })
        }))
      })
      return groups.filter(g => g.rows.length)
    }
  },

  methods: {
    /** A fraction as a percentage in the reader's language, to one decimal at most. */
    pct (v) {
      const n = typeof v === 'number' && isFinite(v) ? v : 0
      return new Intl.NumberFormat(this.intlLocale, { style: 'percent', maximumFractionDigits: 1 }).format(n)
    },
    /**
     * A year-on-year change, signed: "+5%", "-3%", "0%". Null means the year before had
     * nothing to grow from, so there is no percentage to give.
     * @param {number|null} v @returns {string}
     */
    change (v) {
      if (typeof v !== 'number' || !isFinite(v)) { return '—' }
      return new Intl.NumberFormat(this.intlLocale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v)
    },
    /** @param {number} v @returns {string} whole-currency amount, a negative in brackets (44.4). */
    cash (v) { return accountingMoney(v, this.currency, this.$i18n.locale) },
    /** @param {number} v @returns {string} */
    ofSales (v) { return this.$t(N + 'assumptions.ofSales', { pct: this.pct(v) }) },
    /**
     * The GST filing cycle, in the intake screen's own words where it has them.
     * @param {number} months @returns {string}
     */
    returnsFiled (months) {
      const named = { 1: 'gstMonthly', 2: 'gstTwoMonthly', 6: 'gstSixMonthly' }
      return named[months]
        ? this.$t(A + named[months])
        : this.$tc(N + 'assumptions.returnsEvery', months, { n: months })
    }
  }
}
</script>

<style scoped>
.twn { font-size: 13px; line-height: 1.55; }
.twn-title { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
.twn-sub { margin: 0 0 14px; color: var(--rs-muted); font-size: 12.5px; }
.twn-note {
  margin: 22px 0 8px;
  padding-top: 12px;
  border-top: 2px solid var(--rs-line);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.twn h4 { margin: 14px 0 4px; font-size: 12.5px; font-weight: 600; }
.twn p { margin: 0 0 8px; }
.twn ul, .twn ol { margin: 0 0 8px; padding-left: 20px; }
/* Bulma strips list markers; the approved drawing has them. */
.twn ul { list-style: disc; }
.twn ol { list-style: decimal; }
.twn li { margin-bottom: 4px; }
/* On paper the notes set in two columns, as a board paper's notes are (item 44.4). */
@media print {
  .twn { columns: 2; column-gap: 12mm; font-size: 11.5px; }
  .twn-title, .twn-sub { column-span: all; }
  .twn-note, .twn h4 { break-after: avoid; }
  .twn-table tr, .twn li { break-inside: avoid; }
}
.twn-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.twn-table td { padding: 6px 7px; border-bottom: 1px solid var(--rs-line); vertical-align: top; }
.twn-table td:first-child { width: 38%; color: var(--rs-muted); }
.twn-group td {
  background: var(--rs-panel-2);
  border-top: 2px solid var(--rs-line);
  color: var(--rs-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>

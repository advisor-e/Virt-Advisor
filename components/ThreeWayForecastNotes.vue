<template lang="pug">
.twn
  h2.twn-title {{ $t(N + 'title') }}
  p.twn-sub {{ $t(N + 'sub', { date: startDate }) }}

  h3.twn-note {{ $t(N + 'note1') }}
  p {{ $t(N + 'basis.intro') }}
  h4 {{ $t(N + 'basis.forecastHeading') }}
  p {{ $t(N + 'basis.forecastBody') }}
  h4 {{ $t(N + 'basis.standardsHeading') }}
  p {{ $t(N + 'basis.standards') }}
  p {{ $t(N + 'basis.numbering') }}
  p {{ $t(N + 'basis.noAdvice') }}

  h3.twn-note {{ $t(N + 'note2') }}
  p {{ $t(N + 'assumptions.intro') }}
  table.twn-table
    tbody
      template(v-for="g in assumptionGroups")
        tr.twn-group(:key="'g-' + g.key")
          td(colspan="2") {{ $t(g.heading) }}
        tr(v-for="(r, i) in g.rows" :key="g.key + '-' + i")
          td {{ r.rawLabel || $t(r.label) }}
          td {{ r.value }}

  h3.twn-note {{ $t(N + 'note3') }}
  template(v-for="(s, n) in methodSections")
    h4(:key="'h-' + s.key") {{ (n + 1) + '. ' + $t(M + s.key) }}
    ul(:key="'l-' + s.key")
      li(v-for="(line, i) in s.lines" :key="s.key + '-' + i") {{ line }}

  h3.twn-note {{ $t(N + 'note4') }}
  p {{ $t(N + (differences.length === 4 ? 'differs.leadFour' : 'differs.leadThree')) }}
  ol
    li(v-for="(d, i) in differences" :key="'d-' + i") {{ d }}
  p {{ $t(N + 'differs.reviewed') }}
</template>

<script>
import { money } from '~/utils/currencyFormat'
import { intlLocaleFor } from '~/utils/dateLocale'

const N = 'report.threeWayForecast.notes.'
const M = N + 'method.'
const A = 'report.threeWayForecast.assume.'
const MONTH_LABELS = ['sameMonth', 'monthAfter', 'twoMonths', 'threeMonths', 'fourMonths']

/**
 * ThreeWayForecastNotes — "Notes to the forecast", each forecast's OWN support notes (item
 * 44.1; drawing approved by Mike 2026-09-30: design/mockups/three-way-forecast-notes.html).
 *
 * Four notes, as in a set of accounts: basis of preparation, this forecast's assumptions,
 * how the figures are worked out, and where it differs from full NZ IFRS. A sentence that
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
    currency: { type: String, default: 'NZD' }
  },

  data () {
    return { N, M }
  },

  computed: {
    facts () { return this.notes.facts || {} },
    a () { return this.notes.assumptions || {} },
    intlLocale () { return intlLocaleFor(this.$i18n.locale) },

    /** The forecast's first day, written out in the reader's language. */
    startDate () {
      const iso = this.a.startIso
      if (!iso) { return '' }
      const d = new Date(iso + 'T00:00:00Z')
      return d.toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    },

    /**
     * Note 3, section by section — only the sentences that apply to this forecast. The
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

    /** Note 4 — difference 4 is about overseas sales, so a forecast with none has three. */
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
      return groups.filter(g => g.rows.length)
    }
  },

  methods: {
    /** A fraction as a percentage in the reader's language, to one decimal at most. */
    pct (v) {
      const n = typeof v === 'number' && isFinite(v) ? v : 0
      return new Intl.NumberFormat(this.intlLocale, { style: 'percent', maximumFractionDigits: 1 }).format(n)
    },
    /** @param {number} v @returns {string} whole-currency amount in the forecast's currency. */
    cash (v) { return money(v, this.currency, this.$i18n.locale) },
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

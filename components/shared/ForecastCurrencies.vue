<template lang="pug">
//- "Currencies you trade in" — item 13.5, built to
//- design/mockups/three-way-forecast-foreign-currency.html (approved by Mike 2026-09-26).
//- Three rows, always: his ruling is "up to three", and three fixed rows need no add or
//- remove control whose wording nobody approved.
.fxc
  .fxc-row.fxc-head
    span {{ $t('report.threeWayForecast.assume.currencies.currency') }}
    span {{ $t('report.threeWayForecast.assume.currencies.rate') }}
  .fxc-row(v-for="(row, i) in rows" :key="'fx' + i")
    b-select(:value="row.code" size="is-small" expanded @input="setCode(i, $event)")
      option(value="") —
      option(v-for="c in optionsFor(i)" :key="c.code" :value="c.code") {{ c.label }}
    .fxc-rate
      span.fxc-buys {{ $t('report.threeWayForecast.assume.currencies.buys', { home }) }}
      b-input(
        :value="row.rate"
        :disabled="!row.code"
        type="number" step="any" min="0" size="is-small"
        @input="setRate(i, $event)")
  p.fxc-note {{ $t('report.threeWayForecast.assume.currencies.note', { home }) }}
</template>

<script>
import TRADE from '~/data/trade-currencies.json'

/** The most currencies one forecast holds — Mike's ruling of 2026-09-26. */
const ROWS = 3

export default {
  name: 'ForecastCurrencies',

  props: {
    /** `[{ code, rate }]` — the forecast's table. Fewer than three rows is padded. */
    value: { type: Array, default: () => [] },
    /** The firm's own currency code. It is never offered: it is not converted. */
    home: { type: String, required: true }
  },

  computed: {
    /** Always three rows, so the screen matches the drawing whatever was saved. */
    rows () {
      const out = []
      for (let i = 0; i < ROWS; i++) {
        const r = this.value[i] || {}
        out.push({ code: typeof r.code === 'string' ? r.code : '', rate: r.rate === undefined ? null : r.rate })
      }
      return out
    },

    /**
     * Every trade currency except the firm's own, named in the reader's language. The name
     * comes from the browser so no English is held here; a runtime without currency names
     * shows the code alone, which is still unambiguous.
     */
    choices () {
      let names = null
      try { names = new Intl.DisplayNames([this.$i18n.locale], { type: 'currency' }) } catch (e) { names = null }
      return TRADE.codes
        .filter(code => code !== this.home)
        .map(code => ({ code, label: names ? code + ' — ' + names.of(code) : code }))
    }
  },

  methods: {
    /** A row's choices: none a different row has already taken. @param {number} i */
    optionsFor (i) {
      const taken = this.rows.filter((r, n) => n !== i && r.code).map(r => r.code)
      return this.choices.filter(c => !taken.includes(c.code))
    },

    /** @param {number} i @param {string} code */
    setCode (i, code) {
      const next = this.rows.slice()
      // Clearing a currency clears its rate: a rate with no currency converts nothing and
      // would reappear against whichever currency is chosen next.
      next[i] = { code, rate: code ? next[i].rate : null }
      this.emit(next)
    },

    /** @param {number} i @param {string|number} v */
    setRate (i, v) {
      const next = this.rows.slice()
      next[i] = { code: next[i].code, rate: v === '' || v === null ? null : Number(v) }
      this.emit(next)
    },

    /** @param {Array<object>} rows */
    emit (rows) {
      // Payload: the whole table, three `{ code, rate }` rows — v-model on the parent.
      this.$emit('input', rows)
    }
  }
}
</script>

<style scoped>
.fxc-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: center; margin-bottom: 6px; }
.fxc-head span { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; color: var(--rs-muted); }
.fxc-rate { display: flex; align-items: center; gap: 8px; }
.fxc-buys { font-size: 12px; white-space: nowrap; }
.fxc-rate ::v-deep .control { flex: 1; min-width: 0; }
.fxc-note { font-size: 12px; color: var(--rs-muted); margin-top: 4px; }
</style>

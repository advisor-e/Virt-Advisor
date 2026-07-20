/**
 * currencyMixin — gives a report screen the firm's preferred currency and the
 * money/number formatters bound to it.
 *
 * The pure formatting lives in `utils/currencyFormat.js` (unit-tested); this mixin
 * only wires it to (a) the firm's chosen currency, loaded once from the backend,
 * and (b) the reader's language (`$i18n.locale`). The load mirrors the app's
 * existing localStorage-first pattern (see `mixins/localeMixin.js` and the report
 * pages' token resolution): paint instantly from a cached value, then refresh from
 * `GET /api/report/currency`.
 *
 * The read is firmAuth-guarded but must NEVER break a report — any failure (401,
 * offline, backend down) silently keeps the cached or default currency.
 *
 * A component that mixes this in gets `money`/`money2`/`signedMoney`/`kMoney`/`num`
 * for free; it should delete its own copies so these take effect.
 */
import currenciesData from '~/data/currencies.json'
import { money, money2, signedMoney, kMoney, num } from '~/utils/currencyFormat'

const TOKEN_KEY = 'advisor_e_token'
const CACHE_KEY = 'advisor_e_currency'

/** @param {*} code @returns {boolean} true only for a supported currency code. */
function isSupported (code) {
  return typeof code === 'string' && currenciesData.currencies.some(c => c.code === code)
}

export default {
  data () {
    return { firmCurrency: currenciesData.default }
  },

  mounted () {
    if (!process.client) { return }
    const cached = window.localStorage.getItem(CACHE_KEY)
    if (isSupported(cached)) { this.firmCurrency = cached }
    this.loadFirmCurrency()
  },

  methods: {
    /**
     * Fetch the firm's currency, then cache + apply it. Silent on any failure — a
     * report must render regardless of the account setting being reachable.
     * @returns {Promise<void>}
     */
    async loadFirmCurrency () {
      try {
        const token = window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
        const res = await fetch('/api/report/currency', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!res.ok) { return }
        const data = await res.json()
        if (data && isSupported(data.currency)) {
          this.firmCurrency = data.currency
          window.localStorage.setItem(CACHE_KEY, data.currency)
        }
      } catch (e) { /* keep cached / default — never surface to the report */ }
    },

    /** @param {number|null} v @returns {string} whole-currency amount, e.g. "$1,234". */
    money (v) { return money(v, this.firmCurrency, this.$i18n.locale) },
    /** @param {number|null} v @returns {string} 2-dp currency, e.g. "$0.93". */
    money2 (v) { return money2(v, this.firmCurrency, this.$i18n.locale) },
    /** @param {number|null} v @returns {string} signed whole-currency, e.g. "+$1,234". */
    signedMoney (v) { return signedMoney(v, this.firmCurrency, this.$i18n.locale) },
    /** @param {number|null} v @returns {string} abbreviated thousands, e.g. "$572k". */
    kMoney (v) { return kMoney(v, this.firmCurrency, this.$i18n.locale) },
    /** @param {number|null} v @param {number} [d=0] @returns {string} plain grouped number. */
    num (v, d) { return num(v, this.$i18n.locale, d) }
  }
}

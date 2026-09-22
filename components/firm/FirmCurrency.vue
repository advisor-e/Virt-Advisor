<template lang="pug">
section.firm-currency
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmCurrency.lede') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('firmCurrency.loading') }}

  //- The setting could not be READ. Said out loud rather than drawn as the platform
  //- default, because those two look identical on screen and only one of them means
  //- the firm's own choice is safe.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('firmCurrency.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('firmCurrency.retry') }}

  template(v-else)
    b-field(:label="$t('firmCurrency.label')")
      b-select(
        :value="firmCurrency"
        :loading="saving"
        :aria-label="$t('firmCurrency.label')"
        @input="change"
      )
        option(v-for="c in currencies" :key="c.code" :value="c.code")
          | {{ c.symbol }} {{ c.label }} ({{ c.code }})

    //- 🔴 THE RELABEL NOTE IS NOT DECORATION — item 13.1. Switching currency changes
    //- the SYMBOL only; without this line "Reports now show Euro" reads as a
    //- conversion that never happened. It shows whether or not a save is in progress.
    p.has-text-grey.is-size-7.mt-2 {{ $t('firmCurrency.relabelNote') }}

    //- Says whether the firm has actually chosen, or is simply sitting on the
    //- platform default. Those are different facts and the screen must not blur them.
    p.has-text-grey.is-size-7.mt-3(v-if="isDefault") {{ $t('firmCurrency.usingDefault') }}

    p.has-text-grey.is-size-7.mt-3 {{ $t('firmCurrency.whereElse') }}
</template>

<script>
import { fetchWithTimeout } from '~/utils/fetchWithTimeout'
import { currencies } from '~/data/currencies.json'

/** Where this browser caches the firm's code, shared with every report screen. */
const CURRENCY_CACHE_KEY = 'advisor_e_currency'

export default {
  name: 'FirmCurrency',

  props: {
    /**
     * Bearer token for the hub API. The write route is manager-gated on the backend
     * (`firmAuth` + `requireManagerRole`), so this prop cannot grant anything the
     * caller's own token does not already carry.
     */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the setting could not be READ — never merely "unset". */
      error: false,
      saving: false,
      /** The supported list, from the same JSON the backend validates against. */
      currencies,
      firmCurrency: '',
      /** True when no firm choice exists and the platform default is showing. */
      isDefault: true
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read the firm's currency.
     *
     * The scope is the caller's own, resolved by firmAuth from the verified token —
     * nothing about which firm is sent from here.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      try {
        const res = await fetchWithTimeout('/api/report/currency', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error(res.statusText) }
        const data = await res.json()
        if (!data || !data.currency) { throw new Error('UNSUCCESSFUL') }
        this.firmCurrency = data.currency
        this.isDefault = data.isDefault === true
      } catch (err) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Save the firm's currency, applying it optimistically and reverting on failure.
     *
     * The cache is written so every report screen picks the new code up on open —
     * the same key `currencyMixin` reads. ⚠ It is the FIRM's key and holds only the
     * firm's code; a client's own currency is never cached here (item 13.4), or the
     * next client would paint with the previous one's symbol.
     *
     * @param {string} code - a supported currency code.
     * @returns {Promise<void>}
     */
    async change (code) {
      if (this.saving || code === this.firmCurrency) { return }
      this.saving = true
      const previous = this.firmCurrency
      const wasDefault = this.isDefault
      try {
        const res = await fetchWithTimeout('/api/report/currency', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`
          },
          body: JSON.stringify({ currency: code })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.firmCurrency = code
        this.isDefault = false
        // Unguarded, as `currencyMixin` writes it: this runs only from a click on a
        // rendered picker, which is client-side by definition. A `process.client`
        // guard here does nothing in the browser and silently skips the write under
        // test, which is how a cache that never updated would reach production.
        window.localStorage.setItem(CURRENCY_CACHE_KEY, code)
        const c = this.currencies.find(x => x.code === code)
        this.$buefy.toast.open({
          message: this.$t('firmCurrency.saved', {
            name: c ? c.label : code,
            symbol: c ? c.symbol : ''
          }),
          type: 'is-success'
        })
      } catch (e) {
        // Reverted rather than left showing the code we failed to save — a picker
        // displaying a currency the account does not have is worse than an error.
        this.firmCurrency = previous
        this.isDefault = wasDefault
        this.$buefy.toast.open({
          message: this.$t('firmCurrency.saveError'),
          type: 'is-danger'
        })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

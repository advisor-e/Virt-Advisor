<template lang="pug">
.cas(v-if="ready")
  span.cas-label {{ $t('clientReports.switch.label') }}
  b-select.cas-client(
    :value="clientId"
    size="is-small"
    :placeholder="$t('clientReports.switch.chooseClient')"
    :aria-label="$t('clientReports.switch.chooseClient')"
    @input="pickClient"
  )
    option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
  .cas-seg(role="group" :aria-label="$t('clientReports.switch.label')")
    button.cas-btn(
      type="button"
      :class="{ 'is-on': state === 'hidden' }"
      :aria-pressed="String(state === 'hidden')"
      :disabled="!clientId || saving"
      @click="setState('hidden')"
    ) {{ $t('clientReports.switch.hidden') }}
    button.cas-btn(
      type="button"
      :class="{ 'is-on': state === 'open' }"
      :aria-pressed="String(state === 'open')"
      :disabled="!clientId || saving"
      @click="setState('open')"
    ) {{ $t('clientReports.switch.open') }}
  span.cas-hint(v-if="!error") {{ hint }}
  span.cas-hint.is-error(v-else) {{ error }}

  //- THIS CLIENT'S CURRENCY (item 13.4, drawing approved by Mike 2026-09-22 —
  //- design/mockups/client-currency-picker.html). The firm manager sets the firm's on the
  //- Model Library; the advisor may override it here, for one client. It stays on screen
  //- while no client is chosen, disabled — a control that comes and goes is harder to find
  //- than one that waits.
  .cas-cur
    span.cas-label {{ $t('clientReports.currency.label') }}
    b-select.cas-curselect(
      :value="currency"
      size="is-small"
      :disabled="!clientId || savingCurrency"
      :aria-label="$t('clientReports.currency.label')"
      @input="pickCurrency"
    )
      option(v-for="c in currencies" :key="c.code" :value="c.code") {{ c.symbol }} {{ c.label }} ({{ c.code }})
    span.cas-own(v-if="currencySource === 'client'") {{ $t('clientReports.currency.ownChoice') }}
    span.cas-inherit(v-else) {{ $t('clientReports.currency.inherited') }}
    button.cas-clear(
      v-if="currencySource === 'client' && clientId"
      type="button"
      :disabled="savingCurrency"
      @click="pickCurrency('')"
    ) {{ $t('clientReports.currency.useFirms') }}
    //- Item 13.1's sentence, repeated deliberately: a CLIENT-level currency reads as a
    //- conversion far more readily than a firm-wide one.
    span.cas-hint(v-if="!currencyError") {{ $t('modelLibrary.currency.relabelNote') }}
    span.cas-hint.is-error(v-else) {{ currencyError }}
</template>

<script>
/**
 * ClientAccessSwitch — the advisor's per-client "Client access: Hidden / Open" control
 * on a report's header (design/features/business-entity-reports.md, D3, approved by Mike
 * 2026-09-03). Hidden is the default for every client (D1); only the advisor flips it (D5).
 *
 * Renders NOTHING unless, on the client side, there is a signed-in advisor (a token that
 * is not a business entity's) and this route is a catalogue model. So the header of every
 * report gains it without any report page changing — including the Three-Way Forecast,
 * which is the laptop's under item 4.61 and is not touched.
 *
 * The chosen client is remembered in localStorage so it follows the advisor from one
 * report to the next in the same sitting. It is a convenience, never an identity: the
 * backend checks the client belongs to the token's firm on every call.
 */
import { MODELS } from '~/utils/reportModelCatalogue'
import { listClients } from '~/utils/clients'
import {
  getClientAccess,
  setClientAccess,
  getClientCurrency,
  setClientCurrency
} from '~/utils/clientReports'
import { isDevHost } from '~/utils/devHost'
import currenciesData from '~/data/currencies.json'

const TOKEN_KEY = 'advisor_e_token'
const ROLE_KEY = 'advisor_e_role'
const CLIENT_KEY = 'advisor_e_report_client'
const ENTITY_ROLE = 'business_entity'

export default {
  name: 'ClientAccessSwitch',

  props: {
    /** The report's catalogue route, e.g. '/volatility'. Not a model → renders nothing. */
    modelRoute: { type: String, required: true }
  },

  data () {
    return {
      ready: false,
      token: '',
      clients: [],
      clientId: '',
      state: 'hidden',
      saving: false,
      error: '',

      /** Supported currencies — the same single source the firm-wide picker reads. */
      currencies: currenciesData.currencies,
      /** The code showing for this client: its own, or the firm's inherited one. */
      currency: currenciesData.default,
      /** Which level that code came from — 'client', 'firm' or 'default'. */
      currencySource: 'default',
      savingCurrency: false,
      currencyError: ''
    }
  },

  computed: {
    hint () {
      if (!this.clientId) { return this.$t('clientReports.switch.hintNoClient') }
      return this.$t(this.state === 'open' ? 'clientReports.switch.hintOpen' : 'clientReports.switch.hintHidden')
    }
  },

  async mounted () {
    if (typeof window === 'undefined' || typeof fetch !== 'function') { return }
    let token = ''
    let role = ''
    let remembered = ''
    try {
      token = window.localStorage.getItem(TOKEN_KEY) || ''
      role = window.localStorage.getItem(ROLE_KEY) || ''
      remembered = window.localStorage.getItem(CLIENT_KEY) || ''
    } catch (e) { return }
    // 🔴 ON A DEVELOPER'S OWN MACHINE, STAND IN FOR THE SIGN-IN (2026-09-15). In production
    // Advisor-e writes this token before our page loads; nothing on a laptop does, so the
    // picker rendered NOTHING on every report page and every client-aware screen behind it
    // was unreachable — the staff register among them, which looked like a missing feature.
    // Same two gates as every other dev sign-in in this app (`pages/advisor.vue` and eleven
    // others): a loopback hostname, and a backend that refuses the bypass token unless
    // ALLOW_DEV_AUTH is set. Production is served from a domain and sets neither.
    if (!token && isDevHost()) { token = 'dev-local-bypass' }
    if (!token || role === ENTITY_ROLE) { return }
    if (!MODELS.some(m => m.route === this.modelRoute)) { return }
    this.token = token
    try {
      this.clients = await listClients(token)
    } catch (e) {
      this.error = this.$t('clientReports.switch.clientsFailed')
      this.ready = true
      return
    }
    this.ready = true
    if (remembered && this.clients.some(c => c.id === remembered)) {
      await this.pickClient(remembered)
    }
  },

  methods: {
    /**
     * Choose the client this report is for, remember it, and read their switch.
     * @param {string} id - a register id from the list
     */
    async pickClient (id) {
      this.clientId = id
      this.error = ''
      try { window.localStorage.setItem(CLIENT_KEY, id) } catch (e) { /* convenience only */ }
      const chosen = this.clients.find(c => c.id === id)
      // payload: { clientId, clientName } — the report this header sits on is now for this client
      this.$emit('client-change', { clientId: id, clientName: chosen ? chosen.name : '' })
      this.loadCurrency(id)
      try {
        const data = await getClientAccess(id, this.token)
        this.state = data.open && data.open[this.modelRoute] ? 'open' : 'hidden'
      } catch (e) {
        this.error = this.$t('clientReports.switch.saveFailed')
      }
    },

    /**
     * Read which currency applies to this client — its own, or the firm's.
     *
     * Deliberately silent on failure, like the report screens' own currency read: a
     * display setting must never break a report, and the last known code keeps showing.
     * @param {string} id - the client whose currency to resolve
     * @returns {Promise<void>}
     */
    async loadCurrency (id) {
      if (!id) { return }
      this.currencyError = ''
      try {
        const data = await getClientCurrency(id, this.token)
        if (data && data.currency) {
          this.currency = data.currency
          this.currencySource = data.source || 'firm'
        }
      } catch (e) { /* keep what is showing — never surface to the report */ }
    },

    /**
     * Set this client's currency, or CLEAR it back to the firm's.
     *
     * Unlike the firm-wide picker this is open to any advisor — Mike's ruling of
     * 2026-09-22: the manager sets the firm's, the advisor sets the client's.
     *
     * @param {string} code - a supported code, or '' to inherit the firm's again
     * @returns {Promise<void>}
     */
    async pickCurrency (code) {
      if (!this.clientId || this.savingCurrency) { return }
      this.savingCurrency = true
      this.currencyError = ''
      try {
        const data = await setClientCurrency(this.clientId, code, this.token)
        this.currency = data.currency
        this.currencySource = data.source || 'firm'
        // payload: { clientId, currency, source } — the report re-formats its money in it
        this.$emit('currency-change', {
          clientId: this.clientId, currency: data.currency, source: data.source
        })
      } catch (e) {
        this.currencyError = this.$t('clientReports.currency.saveError')
      } finally {
        this.savingCurrency = false
      }
    },

    /**
     * Flip the switch for the chosen client and this model.
     * @param {'open'|'hidden'} state
     */
    async setState (state) {
      if (!this.clientId || state === this.state) { return }
      this.saving = true
      this.error = ''
      try {
        await setClientAccess(this.clientId, this.modelRoute, state, this.token)
        this.state = state
        // payload: { clientId, route, state } — the header's parent may want to know
        this.$emit('change', { clientId: this.clientId, route: this.modelRoute, state })
      } catch (e) {
        this.error = this.$t('clientReports.switch.saveFailed')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.cas {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  /* Capped so the header's right block fits BESIDE the title. Unbounded, the one-line hint
     sized this box to ~710px and pushed badge, switch and Save under the title on every
     report (item 4.69, ruled by Mike 2026-09-07). The hint wraps inside the cap instead. */
  max-width: 470px;
  padding: 8px 12px; border-radius: 10px;
  background: #ffffff14; border: 1px solid #ffffff33;
  font-size: 12.5px; color: #fff;
}
.cas-label { font-weight: 600; }
.cas-client { min-width: 180px; }
.cas-seg { display: inline-flex; border: 1px solid #ffffff55; border-radius: 8px; overflow: hidden; }
.cas-btn {
  padding: 4px 12px; font: inherit; font-weight: 600; cursor: pointer;
  background: transparent; border: 0; color: #cfe6f5;
}
.cas-btn.is-on { background: #00b1e0; color: #002b64; }
.cas-btn:disabled { cursor: default; opacity: .5; }
.cas-hint { flex-basis: 100%; font-size: 11.5px; opacity: .85; }
.cas-hint.is-error { color: #ffb3b3; opacity: 1; }

/* This client's currency — the approved drawing puts it under the access row, inside the
   same capped box, so the header's right block still fits beside the title (item 4.69). */
.cas-cur {
  flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  border-top: 1px solid #ffffff2b; padding-top: 8px; margin-top: 2px;
}
.cas-curselect { min-width: 180px; }
.cas-inherit { font-style: italic; opacity: .85; }
.cas-own {
  font-weight: 600; background: #ffffff24; border-radius: 999px; padding: 2px 9px;
}
.cas-clear {
  font: inherit; font-size: 11.5px; cursor: pointer; background: transparent;
  border: 0; color: #cfe6f5; text-decoration: underline; padding: 2px 4px;
}
.cas-clear:disabled { cursor: default; opacity: .5; }
@media print { .cas { display: none !important; } }
</style>

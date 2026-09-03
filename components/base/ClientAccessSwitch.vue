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
import { getClientAccess, setClientAccess } from '~/utils/clientReports'

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
      error: ''
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
      try {
        const data = await getClientAccess(id, this.token)
        this.state = data.open && data.open[this.modelRoute] ? 'open' : 'hidden'
      } catch (e) {
        this.error = this.$t('clientReports.switch.saveFailed')
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
@media print { .cas { display: none !important; } }
</style>

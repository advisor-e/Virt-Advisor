<template lang="pug">
//- Renders when there is EITHER an answer or a failure to report. Gating the whole strip
//- on `gate` alone would swallow the error, because a failed check deliberately leaves
//- `gate` null — a failure the advisor could not see is worse than the closed state.
.wrg-root(v-if="gate || error")
  .wrg-strip(v-if="gate" :class="'is-' + gate.state")
    span.wrg-tag {{ tagText }}
    .wrg-txt
      p.wrg-h {{ titleText }}
      p.wrg-s {{ noteText }}
    b-button.wrg-btn.wrg-open(
      v-if="gate.state === 'available'"
      type="is-primary"
      size="is-small"
      :loading="busy"
      :disabled="busy"
      @click="openRegister"
    ) {{ busy ? $t('report.wagesReview.register.opening') : $t('report.wagesReview.register.open') }}
    //- Closing is available wherever the register is open — an advisor who opened it on the
    //- wrong client must always be able to shut it (Mike, 2026-09-15).
    b-button.wrg-btn.wrg-close(
      v-else-if="gate.state === 'open'"
      size="is-small"
      :loading="busy"
      :disabled="busy"
      @click="closeRegister"
    ) {{ busy ? $t('report.wagesReview.register.closing') : $t('report.wagesReview.register.close') }}
  p.wrg-err(v-if="error" role="alert") {{ error }}
</template>

<script>
/**
 * WagesRegisterGate — the strip that decides whether the Wages/Salary Review's staff
 * register may be shown at all (item 5.1).
 *
 * Design: `design/mockups/wages-register-gate.html`, approved by Mike 2026-09-15, which
 * draws all three states and settles this screen's wording. The gate's two conditions and
 * their reasoning are Decision 6 of `design/mockups/wages-model.html`, ruled 2026-09-14.
 *
 * 🔴 THE THREE STATES ARE NOT COSMETIC.
 *   · `closed`    — no due-diligence case. NO CONTROL IS RENDERED. Nothing on this screen
 *                   can put a client into due diligence, which is the point of condition 1.
 *   · `available` — a case stands, the advisor has not switched the register on. The only
 *                   state carrying a button.
 *   · `open`      — both conditions met; the provenance line names the transaction, the
 *                   advisor and the date.
 *
 * ⚠ THIS COMPONENT IS NOT THE GATE. It renders what the backend decided. The switch-on
 * re-checks the due-diligence case server-side, so nothing here — a prop, a stale answer, a
 * devtools poke at `gate.state` — can open a register. The screen is the display of a
 * permission, never its holder.
 *
 * SSR: the token lives in localStorage and every call is a fetch, so nothing happens until
 * `mounted`. Rendering nothing while `gate` is null is deliberate — an advisor with no
 * client chosen has no register to be told about, and a failed check must never leave a
 * switch on screen.
 */
import { intlLocaleFor } from '~/utils/dateLocale'
import { getRegisterGate, openRegisterGate, closeRegisterGate } from '~/utils/wagesRegister'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'WagesRegisterGate',

  props: {
    /** The client this report is for, from the header's picker. Empty renders nothing. */
    clientId: { type: String, default: '' }
  },

  data () {
    return {
      token: '',
      /** The backend's answer: { state, reason, case, openedBy, openedAt }. Null renders nothing. */
      gate: null,
      busy: false,
      error: ''
    }
  },

  computed: {
    /** The case this register is being prepared for; '' when there is none to name. */
    projectName () {
      return (this.gate && this.gate.case && this.gate.case.title) || ''
    },

    tagText () {
      const k = { open: 'openTag', available: 'availableTag', closed: 'closedTag' }[this.gate.state]
      return this.$t('report.wagesReview.register.' + k)
    },

    titleText () {
      const k = { open: 'openTitle', available: 'availableTitle', closed: 'closedTitle' }[this.gate.state]
      return this.$t('report.wagesReview.register.' + k)
    },

    /**
     * The sentence under the heading. `available` names the transaction where the case has
     * a title and falls back to a sentence that does not, rather than rendering an empty
     * gap where a deal name should be.
     */
    noteText () {
      const t = 'report.wagesReview.register.'
      if (this.gate.state === 'open') {
        return this.$t(t + 'preparedFor', {
          project: this.projectName,
          advisor: (this.gate.openedBy && this.gate.openedBy.name) || '',
          date: this.openedDate
        })
      }
      if (this.gate.state === 'available') {
        return this.projectName
          ? this.$t(t + 'availableNote', { project: this.projectName })
          : this.$t(t + 'availableNoteUnnamed')
      }
      return this.$t(t + 'closedNote')
    },

    /** When the register was opened, in the reader's own order. '' when unparseable. */
    openedDate () {
      const iso = this.gate && this.gate.openedAt
      if (!iso) { return '' }
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
    }
  },

  watch: {
    /** A different client is a different register; never carry the last one's answer over. */
    clientId () {
      this.gate = null
      this.error = ''
      this.load()
    }
  },

  mounted () {
    try {
      this.token = window.localStorage.getItem(TOKEN_KEY) || ''
    } catch (e) { this.token = '' }
    this.load()
  },

  methods: {
    /**
     * Ask the backend what this client's gate says. Any failure leaves `gate` null, so the
     * strip and its switch are absent — the check failing is never a reason to offer one.
     */
    async load () {
      // No guard on `fetch` here: this runs only from `mounted` and the client watcher,
      // neither of which the server executes, and the call itself belongs to
      // `utils/wagesRegister`.
      if (!this.token || !this.clientId) { return }
      this.busy = true
      try {
        const data = await getRegisterGate(this.clientId, this.token)
        this.gate = data.gate
        this.error = ''
        // The gate as the server resolved it: { state, reason, case, openedBy, openedAt }.
        // Emitted on every answer, not only on a switch, so the page can reveal or hide the
        // register itself without keeping a second copy of the decision.
        this.$emit('gate', data.gate)
      } catch (e) {
        this.gate = null
        this.error = this.$t('report.wagesReview.register.error')
        // A failed check hides the register. The check failing is never a reason to show one.
        this.$emit('gate', null)
      } finally {
        this.busy = false
      }
    },

    /**
     * The advisor switches the register on. The answer replaces the whole gate rather than
     * flipping a local flag, so what is on screen is always what the server decided.
     * Emits `opened` with the gate so the page can reveal the register in the next stage.
     */
    async openRegister () {
      if (!this.token || !this.clientId || this.busy) { return }
      this.busy = true
      try {
        const data = await openRegisterGate(this.clientId, this.token)
        this.gate = data.gate
        this.error = ''
        // The register is now open for this client; payload is the gate the server returned.
        this.$emit('opened', data.gate)
        this.$emit('gate', data.gate)
      } catch (e) {
        this.error = this.$t('report.wagesReview.register.error')
      } finally {
        this.busy = false
      }
    },

    /**
     * The advisor switches the register off again. As with opening, the answer replaces the
     * whole gate rather than flipping a local flag.
     * Emits `closed` with the gate so the page can withdraw the register in the next stage.
     */
    async closeRegister () {
      if (!this.token || !this.clientId || this.busy) { return }
      this.busy = true
      try {
        const data = await closeRegisterGate(this.clientId, this.token)
        this.gate = data.gate
        this.error = ''
        // The register is closed again; payload is the gate the server returned.
        this.$emit('closed', data.gate)
        this.$emit('gate', data.gate)
      } catch (e) {
        this.error = this.$t('report.wagesReview.register.error')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.wrg-root { margin: 0 0 16px; }
.wrg-strip {
  display: flex; gap: 13px; align-items: flex-start;
  border: 1px solid var(--rs-line); border-radius: 10px; padding: 13px 15px;
  background: var(--rs-panel-2);
}
.wrg-txt { flex: 1 1 260px; min-width: 0; }
.wrg-h { font-size: 14px; font-weight: 700; color: var(--rs-ink); margin: 0 0 3px; }
.wrg-s { font-size: 12.5px; color: var(--rs-muted); margin: 0; max-width: 72ch; }
.wrg-tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  border-radius: 999px; padding: 3px 10px; white-space: nowrap; flex: 0 0 auto; margin-top: 2px;
  color: var(--rs-muted); background: var(--rs-panel); border: 1px solid var(--rs-line);
}
.wrg-btn { flex: 0 0 auto; }
/* Available is the one state asking the advisor for a decision, so it is the one state that
   does not look like settled information. Open is settled, and closed is simply a fact. */
.wrg-strip.is-available { background: var(--rs-warn-soft); border-color: #f3c893; }
.wrg-strip.is-available .wrg-tag { color: #a06000; background: var(--rs-panel); border-color: #f3c893; }
.wrg-strip.is-open { background: var(--rs-good-soft); border-color: #a8dcb4; }
.wrg-strip.is-open .wrg-tag { color: var(--rs-good); background: var(--rs-panel); border-color: #a8dcb4; }
.wrg-err { font-size: 12px; color: var(--rs-crit); margin: 8px 0 0; }
@media print { .wrg-btn { display: none !important; } }
</style>

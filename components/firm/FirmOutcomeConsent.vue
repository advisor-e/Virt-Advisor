<template lang="pug">
.foc
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    //- ── Your firm's choice ───────────────────────────────────────────────────
    //- 🔴 THE SWITCH IS THE WHOLE GATE (spec FR-002, FR-012). Nothing from a firm
    //- reaches the pool unless the switch is on when an advisor saves a review, and a
    //- firm whose switch is off never receives an adjustment. There is no second
    //- condition and no default-on — the backend decides, this screen only asks.
    .box
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-3
        h4.title.is-6.mb-0 {{ $t('outcomeConsent.cardHeading') }}
        b-tag(:type="sharing ? 'is-success' : 'is-light'")
          | {{ sharing ? $t('outcomeConsent.pillOn', { date: dateWords(consent.setAt) }) : $t('outcomeConsent.pillOff') }}

      p.foc-lede.mb-4
        b {{ $t('outcomeConsent.opening') }}
        |  {{ $t('outcomeConsent.openingRest') }}

      .columns.is-variable.is-3
        .column
          .foc-col.foc-col-leaves
            h5.foc-col-h {{ $t('outcomeConsent.leavesHeading') }}
            ul.foc-list
              li {{ $t('outcomeConsent.leaves1') }}
              li {{ $t('outcomeConsent.leaves2') }}
              li {{ $t('outcomeConsent.leaves3') }}
              li {{ $t('outcomeConsent.leaves4') }}
              li {{ $t('outcomeConsent.leaves5') }}
        .column
          .foc-col.foc-col-never
            h5.foc-col-h {{ $t('outcomeConsent.neverHeading') }}
            ul.foc-list
              li {{ $t('outcomeConsent.never1') }}
              li
                b {{ $t('outcomeConsent.never2') }}
                |  {{ $t('outcomeConsent.never2Rest') }}
              li {{ $t('outcomeConsent.never3') }}
              li {{ $t('outcomeConsent.never4') }}

      b-message(type="is-info" size="is-small")
        b {{ $t('outcomeConsent.backHeading') }}
        p.mt-1 {{ $t('outcomeConsent.backBody') }}

      //- 🔴 THE SENTENCE IN THE BOX IS MIKE'S OWN (ruled 2026-09-10), VERBATIM AND
      //- PINNED, AND IT COMES FROM THE BACKEND so no screen holds a second copy. It is
      //- stored with every consent record as the words that manager saw.
      .foc-ack.mt-4
        .foc-ack-line
          b-checkbox(v-if="sharing" :value="true" disabled)
            b {{ wording }}
          b-checkbox(v-else v-model="ticked" :disabled="saving")
            b {{ wording }}

        template(v-if="!sharing")
          p.is-size-7.has-text-grey.mt-2.mb-3 {{ $t('outcomeConsent.underSentence') }}
          b-message(v-if="switchError" type="is-danger" size="is-small") {{ switchError }}
          .buttons
            b-button(type="is-primary" :disabled="!ticked" :loading="saving" @click="setSharing(true)")
              | {{ $t('outcomeConsent.start') }}
            //- A firm that stopped sharing may still have rows in the pool. Withdrawal
            //- works whether the switch is on or off (the drawing, Screen B's note), so
            //- the button is offered wherever there is something to withdraw.
            b-button(v-if="canWithdraw" type="is-danger" outlined :disabled="withdrawing" @click="openWithdraw")
              | {{ $t('outcomeConsent.withdraw') }}

        template(v-else)
          p.is-size-7.has-text-grey.foc-sig
            b {{ $t('outcomeConsent.switchedOnBy') }}
            |  {{ consent.setBy }} · {{ dateTimeWords(consent.setAt) }}
            template(v-if="poolConfigured")
              |  ·
              b  {{ $t('outcomeConsent.sharedSoFar') }}
              |  {{ $tc('outcomeConsent.reviews', pooledCount) }}
          b-message(v-if="!poolConfigured" type="is-warning" size="is-small") {{ $t('outcomeConsent.poolNotConfigured') }}
          b-message(v-if="switchError" type="is-danger" size="is-small") {{ switchError }}
          .buttons
            b-button(type="is-primary" outlined :loading="saving" @click="setSharing(false)")
              | {{ $t('outcomeConsent.stop') }}
            b-button(type="is-danger" outlined :disabled="!canWithdraw || withdrawing" @click="openWithdraw")
              | {{ $t('outcomeConsent.withdraw') }}

      //- Ruled YES 2026-09-10: a sharing firm sees the COUNT of adjustments applying to
      //- it, never the list, which is the mentor's to publish.
      b-message.mt-4(v-if="sharing && adjustmentsApplying !== null" type="is-success" size="is-small")
        b {{ $t('outcomeConsent.changedHeading') }}
        p.mt-1
          | {{ $tc('outcomeConsent.changedBody', adjustmentsApplying) }}
          |  {{ $t('outcomeConsent.changedRest') }}

    //- ── The withdraw confirmation (Screen B2) ───────────────────────────────
    //- 🔴 TWO BUTTONS, TWO DIFFERENT THINGS, KEPT APART (Mike's task text: opting out
    //- "stops future contributions without deleting what was already pooled unless the
    //- manager asks for that too"). Stop flips the switch and nothing else; Withdraw
    //- removes every row this firm ever contributed and touches the switch not at all.
    //- "Cannot be undone" is true — the rows are deleted, not marked — which is why the
    //- tick is there and the route refuses without `confirm: true`.
    .box(v-if="withdrawing")
      h4.title.is-6.mb-2 {{ $t('outcomeConsent.withdrawHeading') }}
      p.mb-2
        b {{ $tc('outcomeConsent.withdrawBody', pooledCount) }}
        |  {{ $t('outcomeConsent.withdrawBody2') }}
      p.is-size-7.has-text-grey.mb-3 {{ $t('outcomeConsent.withdrawSwitch') }}
      .foc-ack
        .foc-ack-line
          b-checkbox(v-model="withdrawTicked" :disabled="withdrawSaving") {{ $t('outcomeConsent.withdrawTick') }}
        b-message(v-if="withdrawError" type="is-danger" size="is-small") {{ withdrawError }}
        .buttons.mt-3
          b-button(type="is-danger" :disabled="!withdrawTicked" :loading="withdrawSaving" @click="withdraw")
            | {{ $tc('outcomeConsent.withdrawN', pooledCount) }}
          b-button(outlined @click="closeWithdraw") {{ $t('outcomeConsent.keep') }}

    //- ── History ──────────────────────────────────────────────────────────────
    .box(v-if="history.length")
      h4.title.is-6.mb-3 {{ $t('outcomeConsent.historyHeading') }}
      .foc-hist(v-for="(h, i) in history" :key="i")
        span.foc-hist-when {{ dateWords(h.at) }}
        span.foc-hist-who
          | {{ h.kind === 'withdrew' ? $tc('outcomeConsent.historyWithdrew', h.removed) : (h.on ? $t('outcomeConsent.historyStarted') : $t('outcomeConsent.historyStopped')) }}
          |  — {{ h.by }}
        b-tag(:type="h.kind === 'withdrew' ? 'is-danger' : (h.on ? 'is-success' : 'is-light')" size="is-small")
          | {{ h.kind === 'withdrew' ? $t('outcomeConsent.pillRemoved') : (h.on ? $t('outcomeConsent.pillHistoryOn') : $t('outcomeConsent.pillHistoryOff')) }}
</template>

<script>
/**
 * Outcome Sharing — the firm manager's consent switch for Outcome Learning, item 4.87.
 *
 * Design: `design/mockups/outcome-learning-consent.html`, drawn 2026-09-10 and approved by
 * Mike the same day; its ten proposed wording rows ruled 2026-09-11. Asked for in his own
 * words: *"A firm manager opts the firm in, and can opt out at any time, on a hub page at the
 * firm tier. Nothing leaves a firm that has not opted in, and opting out stops future
 * contributions without deleting what was already pooled unless the manager asks for that
 * too."*
 *
 * 🔴 THE FIRM TIER ALONE. Consent is a firm's own undertaking, given by a person who can bind
 * the firm, in the same way its Compliance declaration is. The mentor and the two middle
 * tiers contribute no reviews and receive no adjustment, so they have nothing to switch
 * (spec FR-014, stated on the drawing).
 *
 * ⚠ NOTHING HERE DECIDES ANYTHING. The switch, the withdrawal and the pinned wording are all
 * the backend's (`server/routes/outcomeConsent.js`); the signer's name comes from the token,
 * never from this screen. What this screen guarantees is only that a manager cannot start
 * sharing without ticking the sentence, and cannot withdraw without ticking that it cannot be
 * undone — and that each button sends exactly one field.
 */

export default {
  name: 'FirmOutcomeConsent',

  props: {
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** The cleaned consent record, or null when the firm has never switched. */
      consent: null,
      /**
       * 🔴 MIKE'S OWN WORDS, PINNED, AND SENT FROM THE BACKEND. Empty here on purpose: a
       * fallback string in this file would be a second copy of a sentence a firm manager is
       * held to, and the two could drift without anything failing.
       */
      wording: '',
      /** Rows this firm holds in the pool; null when the server has no pool secret. */
      pooledCount: null,
      /** Mentor-accepted adjustments live at this firm; null when not sharing or unreadable. */
      adjustmentsApplying: null,
      ticked: false,
      saving: false,
      switchError: '',
      withdrawing: false,
      withdrawTicked: false,
      withdrawSaving: false,
      withdrawError: ''
    }
  },

  computed: {
    /** @returns {boolean} the one condition the backend applies: a record with `on` true */
    sharing () {
      return !!(this.consent && this.consent.on)
    },

    /** @returns {boolean} false when the server has no OUTCOME_POOL_SECRET */
    poolConfigured () {
      return this.pooledCount !== null
    },

    /** @returns {boolean} there is something in the pool to take out */
    canWithdraw () {
      return this.poolConfigured && this.pooledCount > 0
    },

    /**
     * The History card, newest first: every switch and every withdrawal on the record.
     *
     * A record written before switches were kept has an empty `events` list; its current
     * state is then the only switch known, so it is shown from `setBy` / `setAt`.
     *
     * @returns {Array<{kind: 'switch'|'withdrew', at: string, by: string, on?: boolean, removed?: number}>}
     */
    history () {
      if (!this.consent) { return [] }
      const switches = this.consent.events.length
        ? this.consent.events.map(e => ({ kind: 'switch', at: e.at, by: e.by, on: e.on }))
        : [{ kind: 'switch', at: this.consent.setAt, by: this.consent.setBy, on: this.consent.on }]
      const withdrawals = this.consent.withdrawals.map(w => ({ kind: 'withdrew', at: w.requestedAt, by: w.requestedBy, removed: w.removed }))
      return switches.concat(withdrawals).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    }
  },

  async mounted () {
    await this.refresh()
  },

  methods: {
    /**
     * Load the switch, the pinned wording, the pooled count and the live-adjustment count.
     * @route GET /api/firm-manager/outcome-consent
     * @returns {Promise<void>}
     */
    async refresh () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/outcome-consent')
        this.applyRead(data)
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * Take a read response into state. Shared by the load and by every write, which
     * re-reads rather than trusting its own idea of what changed.
     * @param {object} data
     */
    applyRead (data) {
      this.consent = data.consent || null
      this.wording = data.wording || ''
      this.pooledCount = Number.isInteger(data.pooledCount) ? data.pooledCount : null
      this.adjustmentsApplying = Number.isInteger(data.adjustmentsApplying) ? data.adjustmentsApplying : null
    },

    /**
     * Switch sharing on or off. Sends `on` and nothing else — the signer is the token's.
     *
     * Starting requires the tick; the button is disabled without it and this refuses too,
     * so a consent nobody agreed to cannot be sent by any path through this screen.
     *
     * @route POST /api/firm-manager/outcome-consent
     * @param {boolean} on
     * @returns {Promise<void>}
     */
    async setSharing (on) {
      if (on && !this.ticked) { return }
      this.switchError = ''
      this.saving = true
      try {
        await this.api('POST', '/api/firm-manager/outcome-consent', { on })
        this.ticked = false
        // Re-read rather than patch: the adjustment count and the pooled count both
        // depend on the switch, and the backend is the only party that knows them.
        this.applyRead(await this.api('GET', '/api/firm-manager/outcome-consent'))
      } catch (e) {
        this.switchError = e.message
      }
      this.saving = false
    },

    /** Open the confirmation. Nothing is sent from here. */
    openWithdraw () {
      this.withdrawTicked = false
      this.withdrawError = ''
      this.withdrawing = true
    },

    /** Close the confirmation, keeping the rows. */
    closeWithdraw () {
      this.withdrawing = false
      this.withdrawTicked = false
      this.withdrawError = ''
    },

    /**
     * Remove every row this firm has contributed. Sends `confirm: true` and nothing else,
     * and only after the "cannot be undone" tick. The switch is not touched.
     *
     * @route POST /api/firm-manager/outcome-consent/withdraw
     * @returns {Promise<void>}
     */
    async withdraw () {
      if (!this.withdrawTicked) { return }
      this.withdrawError = ''
      this.withdrawSaving = true
      try {
        await this.api('POST', '/api/firm-manager/outcome-consent/withdraw', { confirm: true })
        this.applyRead(await this.api('GET', '/api/firm-manager/outcome-consent'))
        this.closeWithdraw()
      } catch (e) {
        this.withdrawError = e.message
      }
      this.withdrawSaving = false
    },

    /**
     * A date in the words the rest of this hub uses.
     * @param {string} iso
     * @returns {string}
     */
    dateWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /**
     * The same, with the time of day, for the signature line.
     * @param {string} iso
     * @returns {string}
     */
    dateTimeWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return this.dateWords(iso) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a manager can act on, per the house error rule.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async api (method, path, body) {
      let res
      try {
        res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error(this.$t('outcomeConsent.unreachable'))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || this.$t('outcomeConsent.failed'))
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.foc-lede {
  font-size: 0.95rem;
  line-height: 1.5;
}
.foc-col {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  height: 100%;
}
.foc-col-h {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
/* Green for what leaves, red for what never does — the drawing's two columns. The
   heading carries the words as well, so the colour is never the only signal. */
.foc-col-leaves .foc-col-h { color: #2f7d32; }
.foc-col-never .foc-col-h { color: #b01212; }
.foc-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  list-style: disc;
}
.foc-list li { margin: 0.25rem 0; }
.foc-ack {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 1rem 1.1rem;
}
.foc-ack-line {
  font-size: 0.85rem;
  line-height: 1.5;
}
.foc-sig {
  border-top: 1px solid #d5e1ee;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}
.foc-hist {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #eef3f8;
  font-size: 0.85rem;
}
.foc-hist:last-child { border-bottom: 0; }
.foc-hist-when {
  color: #5b6f8a;
  font-size: 0.75rem;
  flex: 0 0 9rem;
}
.foc-hist-who { flex: 1; }
</style>

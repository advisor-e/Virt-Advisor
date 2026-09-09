<template lang="pug">
.ccr
  //- ── The requests a firm is holding ────────────────────────────────────────
  .box.mb-4(v-if="!openRequest")
    .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
      h4.title.is-6.mb-0 Client Copy Request
      span.is-size-7.has-text-grey(v-if="!loading && !loadError") Answer within {{ phrase }}

    p.is-size-7.has-text-grey.mb-4
      | When a client asks for a copy of what was recorded about them, log it here. Only the
      |  advisor who recorded a meeting can release it, so a request with several advisors on
      |  it is answered by each of them in turn.

    .has-text-centered.py-5(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

    template(v-else)
      p.is-size-7.has-text-grey.py-4(v-if="!openRequests.length")
        | No requests are open. Anything a client asks for — a copy of what was recorded, a
        |  correction, or an early deletion — is logged here so the clock on it is visible.

      .ccr-row(v-for="r in openRequests" :key="r.id")
        .ccr-main
          .ccr-name {{ r.clientName || 'Client no longer on the register' }}
          .ccr-sub
            | {{ kindWords[r.kind] }} · logged by {{ r.loggedBy || 'someone at your firm' }}
            |  · {{ channelWords[r.channel] }}
        .ccr-clock(:class="clockClass(r)") {{ r.clock ? r.clock.phrase : '' }}
        b-button.ccr-open(size="is-small" type="is-primary" outlined @click="open(r)") Open

      //- Closed requests are kept deliberately: being able to show that a request WAS
      //- answered, and how quickly, is the evidence half of the all-care basis.
      .ccr-closed(v-if="closedRequests.length")
        h5.is-size-7.has-text-weight-semibold.has-text-grey.mt-5.mb-2 ANSWERED
        .ccr-row(v-for="r in closedRequests" :key="r.id")
          .ccr-main
            .ccr-name {{ r.clientName || 'Client no longer on the register' }}
            .ccr-sub
              | {{ kindWords[r.kind] }} · closed by {{ r.closedBy || 'someone at your firm' }}
              |  · {{ r.outcome || 'no note left' }}
          b-button.ccr-open(size="is-small" outlined @click="open(r)") Open

      .mt-5
        b-button(type="is-primary" @click="logging = true" v-if="!logging") Log a request

      //- ── Logging one ──────────────────────────────────────────────────────
      .ccr-form.mt-4(v-if="logging")
        b-field(label="Which client?" label-position="on-border")
          b-select(v-model="form.clientId" placeholder="Choose from your register" expanded)
            option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}

        b-field(label="What did they ask for?" label-position="on-border")
          b-select(v-model="form.kind" expanded)
            option(value="copy") A copy of what was recorded
            option(value="correction") A correction to something recorded
            option(value="deletion") Deletion before the retention date

        b-field(label="How did they ask?" label-position="on-border")
          b-select(v-model="form.channel" expanded)
            option(v-for="c in channels" :key="c" :value="c") {{ channelWords[c] }}

        //- 🔴 THE DATE THE CLIENT ASKED, not the date this was typed in. A request logged a
        //- week late is already a week into its allowance, and a clock that started today
        //- would hide exactly the lateness this screen exists to show.
        b-field(label="When did they ask?" label-position="on-border")
          b-datepicker(v-model="form.receivedAt" :max-date="today" placeholder="Pick the date")
        p.is-size-7.has-text-grey.mb-4
          | The clock runs from when your client asked, not from today.

        b-field(label="Anything worth noting?" label-position="on-border")
          b-input(v-model="form.note" type="textarea" rows="2" maxlength="500")

        b-message(v-if="formError" type="is-danger" size="is-small") {{ formError }}

        .buttons
          b-button(type="is-primary" :loading="saving" @click="submit") Log it
          b-button(@click="cancel") Cancel

  //- ── One request ───────────────────────────────────────────────────────────
  client-copy-request-detail(
    v-else
    :api-token="apiToken"
    :request-id="openRequest.id"
    @back="back"
    @changed="refresh")

  //- ── How long the firm answers within ──────────────────────────────────────
  //- 🔴 THE UNIT IS PART OF THE SETTING. New Zealand allows 20 WORKING days; the UK and EU
  //- work to one CALENDAR month, which is never shorter. A firm reading a figure in the
  //- wrong unit is reading a legal deadline wrongly.
  .box(v-if="!openRequest && !loading && !loadError")
    h5.is-size-7.has-text-weight-semibold.has-text-grey.mb-3 HOW LONG YOUR FIRM ANSWERS WITHIN
    .ccr-dial
      b-input.ccr-count(
        v-model.number="dial.count"
        type="number"
        min="1"
        size="is-small")
      b-select.ccr-unit(v-model="dial.unit" size="is-small")
        option(v-for="u in units" :key="u" :value="u") {{ unitWords[u] ? unitWords[u].many : u }}
      b-button(size="is-small" type="is-primary" :loading="savingDial" @click="saveDial") Save
      b-button(size="is-small" v-if="ownDial" @click="resetDial") Use the level above

    p.is-size-7.has-text-grey.mt-2(v-if="!ownDial")
      | Currently {{ phrase }}, {{ dialSourceWords }}.
    p.is-size-7.has-text-grey.mt-2(v-else)
      | Currently {{ phrase }}, set by your firm.

    //- Said out loud rather than left for somebody to discover: the clock counts weekends
    //- out and cannot count public holidays out, so it runs slightly fast.
    p.is-size-7.has-text-grey.mt-2
      | Working days here mean weekdays. Public holidays are not counted out — this app holds
      |  no holiday calendar — so the date shown is a little earlier than a strict reading, and
      |  it is a working aid rather than a legal calculation.
</template>

<script>
/**
 * A client asks for a copy of what was recorded about them — the firm's list of requests.
 *
 * Design: `design/mockups/client-record-request.html`, drawn 2026-09-10, all eight of its
 * questions ruled by Mike the same day and built on his word *"go build it"*. It closes
 * finding **B** of `design/MEETING-REVIEW-DPIA.md` §10 — **IPP6** access, **IPP7** correction.
 *
 * 🔴 THE TAB NAME IS MIKE'S OWN WORD, RULING 9 — *"name it 'Client Copy Request'"*. It replaced
 * ours ("Client Requests"). **Pinned, and no session rewords it**, including to make it plural.
 * ⚠ One mismatch recorded rather than quietly corrected: the tab is named for copies and also
 * carries corrections and deletions, which are not copies. It is his word and it stays his word.
 *
 * 🔴 THIS IS NOT A CLIENT PORTAL. There is no client sign-in anywhere in this application, so a
 * request arrives by email, by phone or in the room, and somebody at the firm records it here.
 *
 * 🔴 FIRM TIER ALONE, gated in `TAB_TIERS` — P13 keeps everything derived from a recorded
 * meeting inside the firm it came from, and a named client heard that promised aloud.
 *
 * ⚠ NOT EYEBALLABLE ON THE LAPTOP. It stands on the firm's client register, which is MySQL.
 */
import ClientCopyRequestDetail from '../shared/ClientCopyRequestDetail.vue'

export default {
  name: 'FirmClientCopyRequests',

  components: { ClientCopyRequestDetail },

  props: {
    /** The signed-in manager's token, passed down by the hub. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      saving: false,
      savingDial: false,
      formError: '',
      logging: false,
      requests: [],
      clients: [],
      openRequest: null,
      phrase: '',
      units: [],
      unitWords: {},
      dial: { count: 20, unit: 'working-days' },
      ownDial: null,
      dialSource: '',
      channels: ['email', 'phone', 'in-person', 'letter', 'other'],
      channelWords: {
        email: 'by email',
        phone: 'by phone',
        'in-person': 'in person',
        letter: 'by letter',
        other: 'another way'
      },
      kindWords: {
        copy: 'A copy of what was recorded',
        correction: 'A correction',
        deletion: 'Deletion before the retention date'
      },
      form: { clientId: null, kind: 'copy', channel: 'email', receivedAt: null, note: '' }
    }
  },

  computed: {
    /** @returns {Array<object>} requests still to be answered */
    openRequests () {
      return this.requests.filter(r => r.state === 'open')
    },

    /** @returns {Array<object>} requests already answered, kept as proof */
    closedRequests () {
      return this.requests.filter(r => r.state === 'closed')
    },

    /** @returns {Date} today, so a request cannot be logged as arriving in the future */
    today () {
      return new Date()
    },

    /** @returns {string} where the resolved figure came from, in words */
    dialSourceWords () {
      return this.dialSource === 'inherited'
        ? 'set by the level above your firm'
        : 'the platform default'
    }
  },

  async mounted () {
    await this.refresh()
  },

  methods: {
    /**
     * Load the requests, the clock setting and the client register.
     * @returns {Promise<void>}
     */
    async refresh () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/client-copy-requests')
        this.requests = data.requests || []
        this.phrase = data.phrase || ''

        const dial = await this.api('GET', '/api/firm-manager/client-copy-deadline')
        this.units = dial.units || []
        this.unitWords = dial.unitWords || {}
        this.ownDial = dial.own || null
        this.dialSource = dial.resolved ? dial.resolved.source : ''
        this.dial = {
          count: dial.resolved ? dial.resolved.count : 20,
          unit: dial.resolved ? dial.resolved.unit : 'working-days'
        }

        const reg = await this.api('GET', '/api/clients')
        this.clients = reg.clients || []
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * Open one request's detail view.
     * @param {object} request
     */
    open (request) {
      this.openRequest = request
    },

    /** Back to the list, reloading so a release made in the detail view shows here. */
    async back () {
      this.openRequest = null
      await this.refresh()
    },

    /**
     * The clock's colour. Amber inside a quarter of the allowance, red once overdue —
     * a colour, never a figure.
     * @param {object} request
     * @returns {string}
     */
    clockClass (request) {
      if (!request.clock) { return '' }
      if (request.clock.overdue) { return 'is-overdue' }
      return request.clock.remaining <= Math.ceil(this.dial.count / 4) ? 'is-soon' : ''
    },

    /** Abandon the logging form without keeping half of it. */
    cancel () {
      this.logging = false
      this.formError = ''
      this.form = { clientId: null, kind: 'copy', channel: 'email', receivedAt: null, note: '' }
    },

    /**
     * Log a request.
     * @returns {Promise<void>}
     */
    async submit () {
      this.formError = ''
      if (!this.form.clientId) {
        this.formError = 'Choose which client asked.'
        return
      }
      if (!this.form.receivedAt) {
        this.formError = 'Say when your client asked. The clock runs from that date.'
        return
      }

      this.saving = true
      try {
        await this.api('POST', '/api/client-copy-requests', {
          clientId: this.form.clientId,
          kind: this.form.kind,
          channel: this.form.channel,
          receivedAt: new Date(this.form.receivedAt).toISOString(),
          note: this.form.note
        })
        this.cancel()
        await this.refresh()
      } catch (e) {
        this.formError = e.message
      }
      this.saving = false
    },

    /**
     * Save this firm's own response time.
     * @returns {Promise<void>}
     */
    async saveDial () {
      this.savingDial = true
      this.loadError = ''
      try {
        await this.api('PUT', '/api/firm-manager/client-copy-deadline', {
          count: Number(this.dial.count),
          unit: this.dial.unit
        })
        await this.refresh()
      } catch (e) {
        this.loadError = e.message
      }
      this.savingDial = false
    },

    /**
     * Drop this firm's own figure so it tracks the level above again.
     * @returns {Promise<void>}
     */
    async resetDial () {
      this.savingDial = true
      try {
        await this.api('POST', '/api/firm-manager/client-copy-deadline/reset')
        await this.refresh()
      } catch (e) {
        this.loadError = e.message
      }
      this.savingDial = false
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
        throw new Error('The server could not be reached. Check your connection and try again.')
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || 'That could not be done.')
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.ccr-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #ededed;
}
.ccr-row:first-child {
  border-top: 0;
}
.ccr-name {
  font-size: 0.875rem;
  font-weight: 600;
}
.ccr-sub {
  font-size: 0.75rem;
  color: #7a7a7a;
  margin-top: 2px;
}
.ccr-clock {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #7a7a7a;
}
.ccr-clock.is-soon {
  color: #946c00;
  font-weight: 600;
}
.ccr-clock.is-overdue {
  color: #b60000;
  font-weight: 600;
}
.ccr-form {
  border-top: 1px solid #ededed;
  padding-top: 18px;
}
.ccr-dial {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.ccr-count {
  width: 96px;
}
.ccr-unit {
  min-width: 160px;
}
@media screen and (max-width: 768px) {
  .ccr-row {
    grid-template-columns: 1fr auto;
  }
  .ccr-open {
    grid-column: 1 / -1;
  }
}
</style>

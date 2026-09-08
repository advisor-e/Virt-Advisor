<template lang="pug">
.drn-root
  .drn-group
    .drn-glabel
      span.drn-dot
      h2.drn-h2 {{ $t('report.dashboardReports.draft.title') }}
    template(v-if="!hasDraft")
      .drn-sendbox
        .drn-sendhead {{ $t('report.dashboardReports.draft.sendHead') }}
        .drn-sent(v-if="sendList.measures.length")
          .drn-sent-row(v-for="m in sendList.measures" :key="m.key")
            span {{ $t('report.dashboardReports.draft.measure.' + m.key) }}
            span.drn-band(:class="'is-' + m.band") {{ $t('report.dashboardReports.draft.band.' + m.band) }}
        .drn-sendbody(v-else) {{ $t('report.dashboardReports.draft.noScore') }}
        .drn-sendbody(v-if="sendList.measures.length")
          template(v-if="sendList.positions.length")
            | {{ $t('report.dashboardReports.draft.against') }}
            |
            span(v-for="(p, i) in sendList.positions" :key="p.key")
              | {{ $t('report.dashboardReports.draft.measure.' + p.key) }}
              |
              b {{ $t('report.dashboardReports.draft.position.' + p.position) }}
              | {{ i < sendList.positions.length - 1 ? '; ' : '.' }}
          template(v-else) {{ $t('report.dashboardReports.draft.againstNone') }}
        .drn-sendfoot {{ $t('report.dashboardReports.draft.sendFoot') }}
      .drn-actions
        b-button(type="is-primary" :disabled="!canDraft" :loading="busy" @click="startDraft") {{ $t('report.dashboardReports.draft.button') }}
        span.drn-note {{ busy ? $t('report.dashboardReports.draft.drafting') : $t('report.dashboardReports.draft.buttonNote') }}
    template(v-else)
      .drn-record
        | {{ $t('report.dashboardReports.draft.count', { n: draft.number, total: draft.number, date: draftDate }) }}
        b-button(size="is-small" type="is-light" :disabled="!canDraft" :loading="busy" @click="startDraft") {{ $t('report.dashboardReports.draft.again') }}
    p.drn-error(v-if="error") {{ error }}
  .drn-group
    .drn-tick(:class="{ 'is-off': !canTick }")
      b-checkbox(:value="approved" :disabled="!canTick || tickBusy" @input="onTick")
        b {{ $t('report.dashboardReports.draft.tick') }}
      .drn-ticknote(v-if="approved && approval") {{ tickedLine }}
      .drn-ticknote(v-else) {{ tickHint }}
    p.drn-error(v-if="tickError") {{ tickError }}
</template>

<script>
/**
 * DashboardReportsNextStepsDraft — the draft block on step 4 of the Business Performance
 * Report (item 4.70, stage 6): the blue "exactly what will be sent" box, the button, the
 * draft count, and the tick that is the approval gate. The drawing is
 * `design/mockups/business-performance-report-next-steps-draft.html`, approved 2026-09-09.
 *
 * 🔴 THE BLUE BOX IS THE PRIVACY RULING, DRAWN. It renders `sendList` — the eight measures
 * and their colours, and the positions against industry — and the route sends the same
 * list back; `utils/nextStepsSendList.js` builds it once for both. Nothing else about the
 * client is on this screen to send.
 *
 * 🔴 THE TICK IS ON THE WORDS. It records the three lines as they stand, drafted or typed,
 * and page 8 prints only when the saved lines equal that record. The parent clears
 * `approval` when a word changes; this component only ever asks the server.
 *
 * Events: `draft` — `{ number, runId, steps }`, a validated draft to put into the three
 * fields; `ready` — `{ approval, recorded }`, the server's record after a tick.
 */
import { intlLocaleFor } from '~/utils/dateLocale'

export default {
  name: 'DashboardReportsNextStepsDraft',

  props: {
    /** Verified login pass; all three routes are firmAuth-guarded. */
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** Whose report this is — the saved-report client id. The tick needs one. */
    clientRef: { type: String, default: '' },
    /** `{ measures: [{key, band}], positions: [{key, position}] }` from `sendListFrom`. */
    sendList: { type: Object, required: true },
    /** The three lines as they stand on the step. */
    steps: { type: Array, required: true },
    /** The draft the lines started from — `{ number, runId, steps }` — or null. */
    draft: { type: Object, default: null },
    /** The server's record for these words — per `nextStepsDraftRuns.summarise` — or null. */
    approval: { type: Object, default: null }
  },

  data () {
    return {
      busy: false,
      runId: '',
      error: '',
      tickBusy: false,
      tickError: '',
      /** Poll handle. Cleared in beforeDestroy so a torn-down screen stops polling. */
      timer: null
    }
  },

  computed: {
    hasDraft () { return Boolean(this.draft && Array.isArray(this.draft.steps)) },
    canDraft () { return this.sendList.measures.length > 0 && !this.busy },
    approved () { return Boolean(this.approval && this.approval.approved) },
    stepsComplete () {
      return this.steps.length === 3 && this.steps.every(s => s && String(s.title || '').trim() && String(s.body || '').trim())
    },
    canTick () { return Boolean(this.clientRef) && (this.stepsComplete || this.approved) },
    tickHint () {
      if (!this.clientRef) { return this.$t('report.dashboardReports.draft.tickNeedsClient') }
      if (!this.stepsComplete) { return this.$t('report.dashboardReports.draft.tickNeedsWords') }
      return this.$t('report.dashboardReports.draft.tickNote')
    },
    draftDate () {
      return this.draft && this.draft.madeAt ? this.dateInWords(this.draft.madeAt) : ''
    },
    tickedLine () {
      const a = this.approval
      const parts = [this.$t('report.dashboardReports.draft.tickedBy', { name: (a.approvedBy && a.approvedBy.name) || '', date: this.dateInWords(a.approvedAt) })]
      parts.push(a.draftNumber ? this.$t('report.dashboardReports.draft.tickedFrom', { n: a.draftNumber, total: a.totalDrafts }) : this.$t('report.dashboardReports.draft.tickedTyped'))
      const edited = (a.edited || []).filter(Boolean).length
      const line = parts.join(', ') + '.'
      return edited ? line + ' ' + this.$t('report.dashboardReports.draft.tickedEdited', { n: edited }) : line
    }
  },

  beforeDestroy () {
    this.stopPolling()
  },

  methods: {
    /** @param {string|Date} value @returns {string} the date in the reader's own order */
    dateInWords (value) {
      const d = value instanceof Date ? value : new Date(value)
      if (isNaN(d.getTime())) { return '' }
      return this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
    },
    /** @param {boolean} json */
    authHeaders (json) {
      const headers = { Authorization: 'Bearer ' + this.apiToken }
      if (json) { headers['Content-Type'] = 'application/json' }
      return headers
    },

    /** Starts a draft and begins polling — the route returns a run, not the draft. */
    async startDraft () {
      if (!this.canDraft) { return }
      this.busy = true
      this.error = ''
      try {
        const res = await fetch('/api/report/dashboard-reports/next-steps', {
          method: 'POST',
          headers: this.authHeaders(true),
          body: JSON.stringify({ measures: this.sendList.measures, positions: this.sendList.positions, clientRef: this.clientRef })
        })
        const json = await res.json()
        if (!res.ok || !json.started) {
          this.error = (json.error && json.error.message) || this.$t('report.dashboardReports.draft.failedGeneric')
          this.busy = false
          return
        }
        this.runId = json.runId
        this.schedulePoll()
      } catch (e) {
        // Network failure, not an HTTP error — both must say something an advisor can act on.
        this.error = this.$t('report.dashboardReports.draft.failedNetwork')
        this.busy = false
      }
    },

    /** One poll every two seconds while a draft is in flight. */
    schedulePoll () {
      this.stopPolling()
      this.timer = setInterval(this.poll, 2000)
    },

    stopPolling () {
      if (this.timer) { clearInterval(this.timer); this.timer = null }
    },

    /** Reads where the draft has got to, and stops polling once it settles. */
    async poll () {
      if (!this.runId) { return }
      try {
        const res = await fetch('/api/report/dashboard-reports/next-steps/' + encodeURIComponent(this.runId), { headers: this.authHeaders(false) })
        const json = await res.json()
        if (!res.ok) {
          this.stopPolling()
          this.busy = false
          this.error = (json.error && json.error.message) || this.$t('report.dashboardReports.draft.failedGeneric')
          return
        }
        if (json.state === 'done' && json.draft) {
          this.stopPolling()
          this.busy = false
          // draft: a validated draft — { number, runId, steps, madeAt } — for the three fields
          this.$emit('draft', { number: json.runNumber, runId: json.runId, steps: json.draft.steps, madeAt: new Date().toISOString() })
        } else if (json.state === 'failed') {
          this.stopPolling()
          this.busy = false
          this.error = (json.error && json.error.message) || this.$t('report.dashboardReports.draft.failedGeneric')
        }
      } catch (e) {
        // A single failed poll is not a failed draft — the run continues on the server.
      }
    },

    /**
     * The tick. Asks the server to record the words as they stand; the parent takes the
     * record from the `ready` event and the page prints on the server's copy of it.
     * @param {boolean} on
     */
    async onTick (on) {
      if (!this.canTick || this.tickBusy) { return }
      this.tickBusy = true
      this.tickError = ''
      try {
        const res = await fetch('/api/report/dashboard-reports/next-steps/ready', {
          method: 'POST',
          headers: this.authHeaders(true),
          body: JSON.stringify({
            clientRef: this.clientRef,
            ready: Boolean(on),
            runId: this.draft && this.draft.runId ? this.draft.runId : undefined,
            steps: this.steps.map(s => ({ title: String(s.title || ''), body: String(s.body || '') }))
          })
        })
        const json = await res.json()
        if (!res.ok) {
          this.tickError = (json.error && json.error.message) || this.$t('report.dashboardReports.draft.failedGeneric')
          return
        }
        if (json.ready && !json.recorded) { this.tickError = this.$t('report.dashboardReports.draft.notRecorded') }
        // ready: the server's record for the words as they stand — { approval, recorded }
        this.$emit('ready', { approval: json.approval, recorded: json.recorded })
      } catch (e) {
        this.tickError = this.$t('report.dashboardReports.draft.failedNetwork')
      } finally {
        this.tickBusy = false
      }
    }
  }
}
</script>

<style scoped>
.drn-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.drn-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.drn-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.drn-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
/* The blue box — copied from the economic analysis step, the same privacy shape. */
.drn-sendbox { border: 1px solid #0070c04d; background: #0070c00a; border-radius: 10px; padding: 13px 14px; }
.drn-sendhead { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; color: var(--rs-accent); margin-bottom: 9px; }
.drn-sent { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; font-size: 13px; }
.drn-sent-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px dashed #0070c022; }
.drn-band { font-weight: 600; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
.drn-band.is-green { color: #2f6b19; }
.drn-band.is-amber { color: #b45f00; }
.drn-band.is-red { color: var(--rs-crit); }
.drn-sendbody { font-size: 13px; line-height: 1.6; margin-top: 9px; }
.drn-sendfoot { font-size: 12px; color: var(--rs-muted); margin-top: 10px; padding-top: 9px; border-top: 1px solid #0070c026; }
.drn-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.drn-note { font-size: 12.5px; color: var(--rs-muted); }
.drn-record { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12.5px; color: var(--rs-muted); }
.drn-error { margin: 8px 0 0; font-size: 12.5px; color: var(--rs-crit); }
/* The tick — copied from the economic analysis's ticker. */
.drn-tick { padding: 13px 14px; border: 1px solid var(--rs-line); border-radius: 10px; background: var(--rs-panel-2); }
.drn-tick.is-off { opacity: .6; }
.drn-ticknote { font-size: 12.5px; color: var(--rs-muted); margin: 3px 0 0 28px; line-height: 1.5; }
</style>

<template lang="pug">
//- Renders only when the gate said `open`. The parent decides that — this component is never
//- mounted otherwise — but it also renders nothing while it has no answer of its own, so a
//- failed read shows the failure rather than an empty sheet that looks like an empty team.
.wrs-root
  p.wrs-err(v-if="error" role="alert") {{ error }}

  template(v-if="loaded")
    //- Question 1, ruled 2026-09-15: the register's own field, starting empty. Above the
    //- table because a setting that changes every figure below belongs on the face of it.
    .wrs-hours
      label.wrs-hours-l(for="wrs-hours") {{ $t('report.wagesReview.register.sheet.hours') }}
      b-input#wrs-hours.wrs-hours-i(
        v-model.number="hoursInLeaveDay"
        type="number"
        step="any"
        size="is-small"
        :placeholder="$t('report.wagesReview.register.sheet.hoursPlaceholder')"
      )
      p.wrs-hours-s {{ $t('report.wagesReview.register.sheet.hoursNote') }}

    .wrs-tablewrap
      table.wrs-table
        thead
          tr
            th {{ $t('report.wagesReview.register.sheet.col.name') }}
            th {{ $t('report.wagesReview.register.sheet.col.division') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.payRate') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.accrued') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.liability') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.years') }}
            th {{ $t('report.wagesReview.register.sheet.col.band') }}
        tbody
          //- Keyed by name, which is what the register matches entries on. Two people with
          //- the same name share a row's identity here exactly as they would in storage —
          //- a limitation stated in wagesRegisterStore rather than papered over.
          tr(v-for="row in rows" :key="row.name")
            td.wrs-name {{ row.name }}
            td {{ row.division }}
            td.num.wrs-derived {{ money(row.payRate) }}
            td.num
              b-input(v-model.number="row.accruedLeaveDays" type="number" step="any" size="is-small")
            td.num(:class="{ 'wrs-unpriced': row.liability === null }")
              | {{ row.liability === null ? $t('report.wagesReview.register.sheet.notPriced') : money(row.liability) }}
            td.num
              b-input(v-model.number="row.yearsEmployed" type="number" step="any" size="is-small")
            td
              b-select(v-model="row.band" size="is-small")
                option(:value="null") {{ $t('report.wagesReview.register.sheet.bandNone') }}
                option(v-for="b in bands" :key="b" :value="b") {{ $t('report.wagesReview.register.sheet.band.' + b) }}
          tr.wrs-tot(v-if="summary")
            td {{ $tc('report.wagesReview.register.sheet.peopleCount', summary.total.people, { n: summary.total.people }) }}
            td
            td
            td
            td.num
              | {{ money(summary.total.liability) }}
              span.wrs-derived  · {{ $t('report.wagesReview.register.sheet.pricedOf', { priced: summary.total.priced, people: summary.total.people }) }}
            td
            td

    .wrs-actions
      b-button.wrs-save(type="is-primary" size="is-small" :loading="saving" :disabled="saving" @click="save")
        | {{ saving ? $t('report.wagesReview.register.sheet.saving') : $t('report.wagesReview.register.sheet.save') }}
      span.wrs-saved(v-if="savedAt") {{ $t('report.wagesReview.register.sheet.savedAt', { when: savedDate }) }}

    //- Decision 8: the date, never the setting. Changing it is a Firm Manager decision.
    p.wrs-retention(v-if="keptUntilDate") {{ $t('report.wagesReview.register.sheet.keptUntil', { date: keptUntilDate }) }}

    .wrs-summary(v-if="summary")
      h4.wrs-summary-h {{ $t('report.wagesReview.register.sheet.summary') }}
      p.wrs-summary-s {{ $t('report.wagesReview.register.sheet.summaryNote') }}
      table.wrs-table
        thead
          tr
            th {{ $t('report.wagesReview.register.sheet.col.band') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.people') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.priced') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.liability') }}
            th.num {{ $t('report.wagesReview.register.sheet.col.avgYears') }}
        tbody
          tr(v-for="b in summary.bands" :key="b.band")
            td {{ $t('report.wagesReview.register.sheet.band.' + b.band) }}
            td.num {{ b.people }}
            td.num {{ b.priced }}
            td.num {{ money(b.liability) }}
            td.num {{ b.avgYears === null ? '—' : b.avgYears }}
          tr.wrs-tot
            td {{ $t('report.wagesReview.register.sheet.total') }}
            td.num {{ summary.total.people }}
            td.num {{ summary.total.priced }}
            td.num {{ money(summary.total.liability) }}
            td
</template>

<script>
/**
 * WagesRegister — the staff register itself, behind the gate.
 *
 * Design: `design/mockups/wages-register.html`, approved by Mike 2026-09-15 with all four of
 * its questions ruled the same day. Item 4.104.
 *
 * 🔴 THIS COMPONENT COMPUTES NOTHING. Every liability, every band total and the retention date
 * come from `POST /api/wages-register/:clientId/view`. A leave liability is business logic and
 * belongs on the Restify backend — and this screen in particular must never be the place a
 * figure about somebody's employment is worked out, because the one that can be checked by a
 * test is the one on the backend.
 *
 * 🔴 THE PEOPLE COME FROM STEP 1 AND ARE NOT TYPED AGAIN. `team` is step 1's confirmed
 * people; the register adds the three fields Mike ruled it holds — accrued annual leave, years
 * employed, key person risk — and nothing else. Sick leave is not among them (his ruling,
 * 2026-09-15: *"take it off"*), so it is not on this screen, not in the request, and not in
 * storage.
 *
 * WHY IT RE-READS ON EVERY TEAM CHANGE: the register is a view of step 1's team with entries
 * laid over it. If someone is added in step 1 they must appear here with empty fields, not be
 * missing until a reload.
 */
import { viewRegister, saveRegister } from '~/utils/wagesRegister'
import { intlLocaleFor } from '~/utils/dateLocale'

/** The master app's token, the same key every other feature reads. */
const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'WagesRegister',

  props: {
    /** The client this register belongs to. A register belongs to a client, never a screen. */
    clientId: {
      type: String,
      required: true
    },
    /**
     * Step 1's confirmed people: `{ name, division, payRate }`. Empty until step 1 is
     * confirmed, which renders an empty sheet — correct, because there is nobody to rate.
     */
    team: {
      type: Array,
      default: () => []
    }
  },

  data () {
    return {
      token: '',
      /** True once the backend has answered at least once. Nothing renders before it. */
      loaded: false,
      saving: false,
      error: '',
      /** Question 1's field. Null until the firm sets it; nothing is priced until then. */
      hoursInLeaveDay: null,
      /** One row per person on the TEAM, with the stored entry laid over it. */
      rows: [],
      /** The three bands and the total, as the backend computed them. */
      summary: null,
      /** { months, source, keptUntil } — the date is shown, the setting is not. */
      retention: null,
      savedAt: null
    }
  },

  computed: {
    /** The three bands, in the order the backend reports them. */
    bands () {
      return (this.summary ? this.summary.bands.map(b => b.band) : [])
    },

    /** The retention date in the reader's own locale. Empty when there is nothing to say. */
    keptUntilDate () {
      return this.asDate(this.retention && this.retention.keptUntil)
    },

    /** When this register was last saved, in the reader's own locale. */
    savedDate () {
      return this.asDate(this.savedAt)
    }
  },

  watch: {
    /** A different client is a different register; never carry the last one's rows over. */
    clientId () {
      this.rows = []
      this.summary = null
      this.loaded = false
      this.load()
    },

    /** Somebody added, removed or renamed a person in step 1. */
    team () {
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
     * An ISO date as the reader's locale writes it.
     * @param {string|null} iso
     * @returns {string} '' when there is no usable date
     */
    asDate (iso) {
      if (!iso) { return '' }
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return this.$d(d, 'long', intlLocaleFor(this.$i18n.locale))
    },

    /**
     * A figure as money, or an em dash when there is none.
     * @param {number|null} n
     * @returns {string}
     */
    money (n) {
      if (n === null || n === undefined || n === '') { return '—' }
      return Number(n).toLocaleString(intlLocaleFor(this.$i18n.locale), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },

    /**
     * Read the register for this client, priced against step 1's team.
     *
     * A failure leaves the sheet unrendered and says so. An empty register is NOT a failure —
     * it comes back as rows with empty fields, which is a sheet nobody has filled in yet.
     */
    async load () {
      if (!this.token || !this.clientId) { return }
      try {
        const data = await viewRegister(this.clientId, this.team, this.token)
        this.rows = data.rows
        this.summary = data.summary
        this.retention = data.retention
        this.hoursInLeaveDay = data.register.hoursInLeaveDay
        this.savedAt = data.register.savedAt
        this.error = ''
        this.loaded = true
      } catch (e) {
        this.error = this.$t('report.wagesReview.register.sheet.error')
        this.loaded = false
      }
    },

    /**
     * Save what has been typed, then re-read so every figure on screen is the backend's.
     *
     * Re-reading rather than trusting the local rows is deliberate: the liabilities and the
     * band totals must always be what the server computed from what the server stored, never
     * what this screen believed it sent.
     */
    async save () {
      if (!this.token || !this.clientId || this.saving) { return }
      this.saving = true
      try {
        await saveRegister(this.clientId, {
          hoursInLeaveDay: this.hoursInLeaveDay === '' ? null : this.hoursInLeaveDay,
          people: this.rows.map(r => ({
            name: r.name,
            accruedLeaveDays: r.accruedLeaveDays === '' ? null : r.accruedLeaveDays,
            yearsEmployed: r.yearsEmployed === '' ? null : r.yearsEmployed,
            band: r.band
          }))
        }, this.token)
        this.error = ''
        await this.load()
        // The register was saved; payload is the client it belongs to.
        this.$emit('saved', this.clientId)
      } catch (e) {
        this.error = this.$t('report.wagesReview.register.sheet.saveError')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.wrs-root { margin-top: 1rem; }
.wrs-err { color: #e00000; font-size: 0.85rem; margin-bottom: 0.5rem; }

.wrs-hours { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.9rem; }
.wrs-hours-l { font-weight: 600; font-size: 0.85rem; }
.wrs-hours-i { max-width: 7rem; }
.wrs-hours-s { font-size: 0.78rem; color: #5b6f8a; flex: 1 1 18rem; }

/* Tables are the one thing allowed to be wider than the page, in their own scroller. */
.wrs-tablewrap { overflow-x: auto; }
.wrs-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.wrs-table th {
  text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: #5b6f8a; padding: 0 0.6rem 0.4rem 0; vertical-align: bottom;
}
.wrs-table td { padding: 0.3rem 0.6rem 0.3rem 0; border-bottom: 1px solid #d5e1ee; }
.wrs-table .num, .wrs-table th.num { text-align: right; }
.wrs-name { font-weight: 600; }
.wrs-derived { color: #5b6f8a; }
/* Ruled by Mike 2026-09-15: an unpriced person says so, and is never a confident zero. */
.wrs-unpriced { color: #ff9900; font-weight: 600; }
.wrs-tot td { font-weight: 700; border-top: 2px solid #002b64; border-bottom: 0; padding-top: 0.5rem; }

.wrs-actions { display: flex; align-items: center; gap: 0.7rem; margin-top: 0.9rem; flex-wrap: wrap; }
.wrs-saved { font-size: 0.78rem; color: #5b6f8a; }
.wrs-retention { font-size: 0.8rem; color: #5b6f8a; margin-top: 0.6rem; }

.wrs-summary { margin-top: 1.2rem; border: 1px solid #d5e1ee; border-radius: 10px; padding: 0.8rem 0.9rem; background: #f1f6fb; }
.wrs-summary-h { font-weight: 700; font-size: 0.9rem; margin: 0 0 0.2rem; }
.wrs-summary-s { font-size: 0.78rem; color: #5b6f8a; margin: 0 0 0.5rem; }
</style>

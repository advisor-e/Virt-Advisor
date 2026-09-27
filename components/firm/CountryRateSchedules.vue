<template lang="pug">
.crs
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | {{ $t('countryRateSchedules.intro.lead') }} #[b {{ $t('countryRateSchedules.intro.leadBold') }}]{{ $t('countryRateSchedules.intro.body') }}
      | #[b {{ $t('countryRateSchedules.intro.noChangeBold') }}] {{ $t('countryRateSchedules.intro.noChange') }}

  .notification.is-warning.is-light.mb-4(v-if="!mayLoad")
    p.is-size-7
      | {{ $t('countryRateSchedules.notLoader.lead') }} #[b {{ $t('countryRateSchedules.notLoader.bold') }}]{{ $t('countryRateSchedules.notLoader.tail') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    b-message(v-if="error" type="is-danger" size="is-small" :closable="false") {{ error }}

    //- ── The library ────────────────────────────────────────────────────
    .box.mb-4
      h3.is-size-6.has-text-weight-semibold.mb-3 {{ $t('countryRateSchedules.library.heading') }}
      p.is-size-7.has-text-grey(v-if="!schedules.length")
        | {{ $t('countryRateSchedules.library.empty') }}
      table.table.is-fullwidth.is-narrow.is-size-7(v-else)
        thead
          tr
            th {{ $t('countryRateSchedules.country') }}
            th {{ $t('countryRateSchedules.table.inForce') }}
            th {{ $t('countryRateSchedules.table.edition') }}
            th.has-text-right {{ $t('countryRateSchedules.table.classes') }}
            th {{ $t('countryRateSchedules.table.approved') }}
        tbody
          tr(v-for="s in schedules" :key="s.country")
            td.has-text-weight-semibold {{ s.country }}
            td
              | {{ s.document }}
              p.has-text-grey.mt-1(v-if="s.unreadNote") {{ s.unreadNote }}
              p.has-text-grey.mt-1(v-else-if="s.unresolved")
                | {{ $tc('countryRateSchedules.library.unresolved', s.unresolved, { count: s.unresolved }) }}
            td {{ s.published }}
            td.has-text-right {{ s.classes }}
            td
              | {{ s.approvedBy }}
              br
              span.has-text-grey {{ shortDate(s.approvedAt) }}

    //- ── Reads in flight, and reads waiting for a decision ──────────────
    .box.mb-4(v-for="r in reads" :key="r.country")
      .is-flex.is-justify-content-space-between.is-align-items-flex-start.mb-2
        div
          h3.is-size-6.has-text-weight-semibold {{ r.documentName }} — {{ r.country }}
          p.is-size-7.has-text-grey {{ $t('countryRateSchedules.reads.loadedBy', { filename: r.filename, who: r.loadedBy }) }}
        b-tag(:type="stateType(r)") {{ stateLabel(r) }}

      //- Reading, and still alive
      template(v-if="r.status === 'reading' && !r.stale")
        b-progress(
          :value="r.passesDone"
          :max="r.passesPlanned || 1"
          type="is-info"
          size="is-small"
          show-value
        )
        p.is-size-7.has-text-grey
          template(v-if="r.passesPlanned")
            | {{ $t('countryRateSchedules.reads.passProgress', { done: r.passesDone, planned: r.passesPlanned, classes: r.classesSoFar }) }}
          template(v-else) {{ $t('countryRateSchedules.reads.surveying') }}
          |  {{ $t('countryRateSchedules.reads.canLeave') }}

      //- Reading, and gone quiet
      .notification.is-warning.is-light.py-2(v-else-if="r.status === 'reading' && r.stale")
        p.is-size-7
          | {{ $t('countryRateSchedules.reads.stale') }}

      //- Read, and it produced nothing
      .notification.is-danger.is-light.py-2(v-else-if="r.status === 'failed'")
        p.is-size-7 {{ moderationMessageFrom(r.error) || (r.error && r.error.message) || $t('countryRateSchedules.reads.failed') }}

      //- Read, and waiting for a decision
      template(v-else-if="r.status === 'pending'")
        p.is-size-7.mb-2
          | {{ $t('countryRateSchedules.reads.pendingLead') }} #[b {{ $t('countryRateSchedules.reads.pendingClasses', { count: r.classesSoFar }) }}] {{ $t('countryRateSchedules.reads.pendingTail', { document: r.documentName, published: r.published, pages: r.totalPages }) }}
        p.is-size-7.has-text-danger.mb-2(v-if="detail(r).unreadNote") {{ detail(r).unreadNote }}
        details.mb-2(v-if="detail(r).unresolved && detail(r).unresolved.length")
          summary.is-size-7
            | {{ $tc('countryRateSchedules.reads.unresolvedSummary', detail(r).unresolved.length, { count: detail(r).unresolved.length }) }}
          ul.is-size-7.has-text-grey.mt-2
            li(v-for="(u, i) in detail(r).unresolved" :key="i")
              b {{ u.label }}
              template(v-if="u.pages")  {{ $t('countryRateSchedules.reads.unresolvedPages', { pages: u.pages }) }}
              template(v-if="u.differs") : {{ u.differs }}

      .buttons.mt-3(v-if="mayLoad")
        b-button(
          v-if="r.status === 'pending'"
          type="is-primary"
          size="is-small"
          :loading="deciding === r.country"
          @click="approve(r.country)"
        ) {{ $t('countryRateSchedules.reads.approve') }}
        b-button(
          size="is-small"
          :loading="deciding === r.country"
          @click="reject(r.country)"
        ) {{ r.status === 'pending' ? $t('countryRateSchedules.reads.reject') : $t('countryRateSchedules.reads.clear') }}

    //- ── Loading one ────────────────────────────────────────────────────
    .box(v-if="mayLoad")
      h3.is-size-6.has-text-weight-semibold.mb-3 {{ $t('countryRateSchedules.load.heading') }}
      p.is-size-7.has-text-grey.mb-3
        | {{ $t('countryRateSchedules.load.hint') }}
      .field.is-grouped.is-align-items-center
        .control
          b-field(:label="$t('countryRateSchedules.country')" label-position="on-border")
            b-input(v-model="countryInput" placeholder="NZ" maxlength="2" size="is-small" style="width: 7rem")
        .control
          b-upload(v-model="file" accept="application/pdf" size="is-small")
            a.button.is-small
              span {{ file ? file.name : $t('countryRateSchedules.load.choosePdf') }}
        .control
          b-button(
            type="is-primary"
            size="is-small"
            :disabled="!canLoad"
            :loading="uploading"
            @click="load"
          ) {{ $t('countryRateSchedules.load.readIt') }}
      b-message.mt-3(v-if="uploadMessage" :type="uploadType" size="is-small" :closable="false") {{ uploadMessage }}
</template>

<script>
/**
 * CountryRateSchedules — the tab a global group manager loads a country's whole published
 * depreciation schedule on, and watches it being read. Item 4.92, slice 4.
 *
 * Asked for by Mike on 2026-09-11: *"if a single source of truth doc is available for a country
 * - with ALL depreciation rates in it - we need the capability to store it, save it, translate
 * it into a serachable table so it can be used in our models"*. The approved artefact is
 * `design/mockups/depreciation-rates-country-schedules.html`, approved by him the same day with
 * all three of its decisions ruled.
 *
 * 🔴 IT LOADS AT THE GLOBAL GROUP MANAGER TIER, AND THAT IS HIS RULING. One person loads the
 * schedules for every country their brand operates in; group managers and firms inherit the one
 * matching their client and load none. It OVERRIDES the default-is-mentor-alone rule of
 * 2026-08-24 for this feature. The tab is gated in `TAB_TIERS.countrySchedules`, and the ROUTES
 * check the tier again from the caller's own verified scope — this screen is the third lock on
 * that door, never the first.
 *
 * 🔴 A READ IS A JOB, WHICH IS WHY THIS POLLS. One schedule is a survey plus a request per eight
 * pages, each of which may take minutes of model time. The drawing says *"you can leave this
 * page"* in as many words, so the load answers immediately and this watches the record.
 *
 * ⚠ THE 2,800 ROWS NEVER COME HERE. The list carries counts, not classes, and a firm's class
 * picker searches the table on the BACKEND — sending it to a browser to filter there would put
 * 400 KB on the wire for every keystroke.
 *
 * ⚠ A READ THAT HAS GONE QUIET IS SAID TO HAVE GONE QUIET. A restart loses the passes and the
 * allowance was already spent; shown as an ordinary progress bar it is a manager watching
 * something that will never move. `stale` comes from the backend and this screen names it.
 */
import moderationMessage from '~/mixins/moderationMessage'

export default {
  name: 'CountryRateSchedules',

  mixins: [moderationMessage],

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      error: '',
      /** Countries this level has an APPROVED schedule for. Counts only, never classes. */
      schedules: [],
      /** Reads in flight, and reads waiting for a decision. */
      reads: [],
      /** One country's read in full, keyed by country — fetched only when it is decidable. */
      details: {},
      /** Whether this tier may load and decide. From the backend, never inferred here. */
      mayLoad: false,
      /** Two-letter code typed in the box. */
      countryInput: '',
      /** The file chosen in the upload control, held only until it has been sent. */
      file: null,
      uploading: false,
      uploadMessage: '',
      uploadType: 'is-info',
      /** The country whose approve or reject is in flight, or '' for none. */
      deciding: '',
      /** The polling handle, so it can be stopped when the tab goes away. */
      timer: null
    }
  },

  computed: {
    canLoad () {
      return Boolean(this.file) && /^[A-Za-z]{2}$/.test(String(this.countryInput || '').trim())
    },

    /** Is anything still being read? While something is, the screen keeps looking. */
    anyReading () {
      return this.reads.some(r => r.status === 'reading' && !r.stale)
    }
  },

  mounted () {
    // ⚠ AFTER MOUNT, NEVER IN created(). `fetch` and the polling timer are browser-only, and
    // this component is rendered by a Nuxt 2 page — the SSR rule in CLAUDE.md.
    this.refresh()
  },

  beforeDestroy () {
    this.stopPolling()
  },

  methods: {
    /**
     * Read the library and every read in flight, and start or stop polling to match.
     * @returns {Promise<void>}
     */
    async refresh () {
      try {
        const body = await this.api('GET', '/api/firm-manager/country-schedules')
        this.schedules = body.schedules || []
        this.reads = body.reads || []
        this.mayLoad = Boolean(body.mayLoad)
        this.error = ''
        await this.loadDetails()
      } catch (err) {
        // Reported, never shown as an empty library: a manager told they hold no schedules
        // when the truth is that we could not look would go and load ones they already have.
        this.error = err.message || this.$t('countryRateSchedules.errors.libraryFailed')
      } finally {
        this.loading = false
        this.syncPolling()
      }
    },

    /**
     * Fetch the full record for any read a manager can act on, so its coverage and its
     * unsettled entries can be shown. A read still running has nothing to show yet.
     * @returns {Promise<void>}
     */
    async loadDetails () {
      const wanted = this.reads.filter(r => r.status === 'pending')
      const next = {}
      for (let i = 0; i < wanted.length; i++) {
        const country = wanted[i].country
        try {
          const body = await this.api(
            'GET', `/api/firm-manager/country-schedules/read?country=${encodeURIComponent(country)}`
          )
          next[country] = (body.read && body.read.reading) || {}
        } catch (err) {
          // One record that will not load must not take the whole screen down; the row still
          // shows its counts and its buttons.
          next[country] = {}
        }
      }
      this.details = next
    },

    /**
     * What one read found, for the panel under it.
     * @param {object} r - a read row
     * @returns {object} the reading, or an empty object before it has been fetched
     */
    detail (r) {
      const d = this.details[r.country] || {}
      return {
        unresolved: d.unresolved || [],
        // Built here from the page ranges so it translates. The depreciation picker shows the
        // backend's own English sentence (`scheduleUnreadNote`), so the two are worded separately.
        unreadNote: d.pagesUnread && d.pagesUnread.length
          ? this.$t('countryRateSchedules.reads.unreadNote', {
            pages: d.pagesUnread.map(p => (p.from === p.to ? p.from : p.from + '–' + p.to)).join(', ')
          })
          : ''
      }
    },

    /** Keep the poll running exactly while something is being read. */
    syncPolling () {
      if (this.anyReading) { this.startPolling() } else { this.stopPolling() }
    },

    startPolling () {
      if (this.timer) { return }
      // Ten seconds: a pass takes minutes, so anything faster is a request that learns nothing.
      this.timer = setInterval(() => { this.refresh() }, 10000)
    },

    stopPolling () {
      if (!this.timer) { return }
      clearInterval(this.timer)
      this.timer = null
    },

    /**
     * Send one schedule to be read. Answers as soon as the read has started.
     * @returns {Promise<void>}
     */
    async load () {
      if (!this.canLoad) { return }
      this.uploading = true
      this.uploadMessage = ''
      try {
        const form = new FormData()
        form.append('country', String(this.countryInput).trim().toUpperCase())
        form.append('file', this.file)
        const res = await fetch('/api/firm-manager/country-schedules', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body: form
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((body.error && body.error.message) || res.statusText)
        }
        this.uploadType = 'is-info'
        this.uploadMessage = this.$t('countryRateSchedules.load.started')
        this.file = null
        await this.refresh()
      } catch (err) {
        this.uploadType = 'is-danger'
        this.uploadMessage = err.message || this.$t('countryRateSchedules.load.sendFailed')
      } finally {
        this.uploading = false
      }
    },

    /**
     * Approve one country's read into the table every firm beneath searches.
     * @param {string} country
     * @returns {Promise<void>}
     */
    async approve (country) {
      this.deciding = country
      try {
        await this.api('POST', '/api/firm-manager/country-schedules/approve', { country })
        this.error = ''
        await this.refresh()
      } catch (err) {
        this.error = err.message || this.$t('countryRateSchedules.errors.approveFailed')
      } finally {
        this.deciding = ''
      }
    },

    /**
     * Throw a read away. Whatever is already approved for that country stays.
     * @param {string} country
     * @returns {Promise<void>}
     */
    async reject (country) {
      this.deciding = country
      try {
        await this.api('POST', '/api/firm-manager/country-schedules/reject', { country })
        this.error = ''
        await this.refresh()
      } catch (err) {
        this.error = err.message || this.$t('countryRateSchedules.errors.rejectFailed')
      } finally {
        this.deciding = ''
      }
    },

    /**
     * The tag beside a read.
     * @param {object} r
     * @returns {string}
     */
    stateLabel (r) {
      if (r.status === 'reading') {
        return r.stale ? this.$t('countryRateSchedules.state.stopped') : this.$t('countryRateSchedules.state.reading')
      }
      if (r.status === 'pending') { return this.$t('countryRateSchedules.state.pending') }
      if (r.status === 'failed') { return this.$t('countryRateSchedules.state.failed') }
      if (r.status === 'approved') { return this.$t('countryRateSchedules.state.approved') }
      return this.$t('countryRateSchedules.state.rejected')
    },

    /**
     * @param {object} r
     * @returns {string} a Buefy tag type
     */
    stateType (r) {
      if (r.status === 'reading') { return r.stale ? 'is-warning' : 'is-info' }
      if (r.status === 'pending') { return 'is-warning' }
      if (r.status === 'failed') { return 'is-danger' }
      if (r.status === 'approved') { return 'is-success' }
      return 'is-light'
    },

    /**
     * A stored timestamp as a short date, or '' when it cannot be read.
     * @param {string} value
     * @returns {string}
     */
    shortDate (value) {
      if (!value) { return '' }
      const at = new Date(value)
      return isNaN(at.getTime()) ? '' : at.toISOString().slice(0, 10)
    },

    /**
     * One authenticated call to the backend.
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(path, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.crs details summary {
  cursor: pointer;
}
</style>

<template lang="pug">
section.mentor-adoption
  //- Design: design/mockups/mentor-adoption-view.html, ruled by Mike 2026-08-09.
  //- The wording below is the approved set from that artefact's §3 — every string
  //- through $t(), so the file and the locale can be compared word for word.
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('mentorAdoption.lede') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('mentorAdoption.loading') }}

  //- The record could not be reached. Said out loud rather than shown as a
  //- platform where nobody is using anything — the two must never look alike.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('mentorAdoption.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('mentorAdoption.retry') }}

  template(v-else)
    //- ── The headline ────────────────────────────────────────────────
    .columns.is-multiline.mb-2
      .column.is-3(v-for="tile in tiles" :key="tile.key")
        .box.tile-box(:class="'tile-' + tile.key")
          .tile-num {{ tile.value }}
          .tile-label.has-text-grey.is-size-7 {{ $t(tile.labelKey) }}
          .tile-note.is-size-7 {{ $t(tile.noteKey, { days: quietAfterDays }) }}

    //- ── The honest limit, shown only when it applies ────────────────
    //- Without the firms directory this page cannot show a firm that never
    //- started, and a shorter list looks identical to a healthier platform.
    b-message.is-size-7(
      v-if="!directoryRead"
      type="is-warning"
      has-icon
      :closable="false"
    )
      | {{ $t('mentorAdoption.noDirectory') }}

    p.has-text-grey.has-text-centered.py-6(v-if="!firms.length")
      | {{ $t('mentorAdoption.empty') }}

    b-table(v-else :data="firms" :hoverable="true")
      b-table-column(
        v-slot="{ row }"
        field="firmName"
        :label="$t('mentorAdoption.colFirm')"
        sortable
      )
        span.has-text-weight-semibold {{ row.firmName }}
        //- The id stays visible under a real name so a row can still be matched to
        //- the platform record. Where the directory had no name, firmName IS the
        //- id — printing it twice would suggest we know more than we do.
        .firm-id.has-text-grey.is-size-7(v-if="row.named") {{ row.firmId }}
        //- Relative volume, as the artefact draws it. Against the BUSIEST FIRM, not
        //- against a fixed scale: the question this page answers is comparative —
        //- who is using it more than whom — and a full bar simply means "most".
        .bar(v-if="busiest > 0")
          i(:style="{ width: barWidth(row) }")

      b-table-column(
        v-slot="{ row }"
        field="advisers"
        :label="$t('mentorAdoption.colAdvisers')"
        width="110"
        numeric
        sortable
      )
        | {{ row.advisers }}

      b-table-column(
        v-slot="{ row }"
        field="sessions"
        :label="$t('mentorAdoption.colSessions')"
        width="110"
        numeric
        sortable
      )
        | {{ row.sessions }}

      b-table-column(
        v-slot="{ row }"
        field="courses"
        :label="$t('mentorAdoption.colCourses')"
        width="110"
        numeric
        sortable
      )
        | {{ row.courses }}

      b-table-column(
        v-slot="{ row }"
        field="avgQuiz"
        :label="$t('mentorAdoption.colAvgQuiz')"
        width="110"
        numeric
        sortable
      )
        span(v-if="row.avgQuiz !== null") {{ row.avgQuiz }}%
        span.has-text-grey(v-else) —

      b-table-column(
        v-slot="{ row }"
        field="lastSeen"
        :label="$t('mentorAdoption.colLastSeen')"
        width="140"
        sortable
      )
        span(v-if="row.lastSeen") {{ formatDate(row.lastSeen) }}
        span.has-text-grey(v-else) {{ $t('mentorAdoption.never') }}

      b-table-column(
        v-slot="{ row }"
        field="status"
        :label="$t('mentorAdoption.colStatus')"
        width="150"
        sortable
      )
        b-tag(:type="statusType(row.status)") {{ $t('mentorAdoption.status.' + row.status) }}

    p.has-text-grey.is-size-7.mt-3 {{ $t('mentorAdoption.footnote', { days: quietAfterDays }) }}
</template>

<script>
import { fetchWithTimeout } from '~/utils/fetchWithTimeout'

/**
 * Buefy tag colour per status. Kept as a lookup rather than a chain of v-ifs so
 * a fourth status added on the backend fails visibly (no colour) instead of
 * silently rendering as the last branch of an if.
 */
const STATUS_TYPES = {
  active: 'is-success is-light',
  slowed: 'is-warning is-light',
  never: 'is-danger is-light'
}

export default {
  name: 'MentorAdoption',

  props: {
    /** Bearer token for the mentor API (the server re-checks the role every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the record could not be READ — never merely "no firms yet". */
      error: false,
      /** One row per firm, busiest first, as /api/mentor/adoption returns them. */
      firms: [],
      totals: {},
      /** The ruled line between Active and Slowed down. Sent by the backend so the
       *  screen can never state a different number from the one it applied. */
      quietAfterDays: null,
      /** False when the firms directory could not be read — see noDirectory above. */
      directoryRead: true
    }
  },

  computed: {
    /**
     * The four headline tiles, in the artefact's order.
     *
     * @returns {Array<{key: string, value: number, labelKey: string, noteKey: string}>}
     */
    tiles () {
      const t = this.totals || {}
      return [
        { key: 'active', value: t.activeFirms || 0, labelKey: 'mentorAdoption.tileActive', noteKey: 'mentorAdoption.tileActiveNote' },
        { key: 'slowed', value: t.slowedFirms || 0, labelKey: 'mentorAdoption.tileSlowed', noteKey: 'mentorAdoption.tileSlowedNote' },
        { key: 'advisers', value: t.advisers || 0, labelKey: 'mentorAdoption.tileAdvisers', noteKey: 'mentorAdoption.tileAdvisersNote' },
        { key: 'total', value: t.sessionsAndCourses || 0, labelKey: 'mentorAdoption.tileTotal', noteKey: 'mentorAdoption.tileTotalNote' }
      ]
    },

    /**
     * The busiest firm's combined workload, which every bar is drawn against.
     *
     * @returns {number} 0 when nobody has done anything — the bars then do not render
     *   at all, rather than every firm showing a full bar for zero work.
     */
    busiest () {
      return this.firms.reduce((n, f) => Math.max(n, (f.sessions || 0) + (f.courses || 0)), 0)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * GET the cross-firm adoption view.
     *
     * The mentor role is checked server-side on every call; nothing about scope is
     * sent from here. Any failure (HTTP error, malformed body, or no network) sets
     * `error` rather than leaving an empty list — an unreachable record and a
     * platform nobody is using must not render the same screen.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      try {
        const res = await fetchWithTimeout('/api/mentor/adoption', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error(res.statusText) }
        const data = await res.json()
        if (!data || !data.success || !data.report) { throw new Error('UNSUCCESSFUL') }
        this.firms = data.report.firms || []
        this.totals = data.report.totals || {}
        this.quietAfterDays = data.report.quietAfterDays || null
        this.directoryRead = data.report.directoryRead !== false
      } catch (err) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * How wide one firm's activity bar is, relative to the busiest firm.
     *
     * @param {Object} row - one firm row.
     * @returns {string} a CSS width, e.g. "63%".
     */
    barWidth (row) {
      if (!this.busiest) { return '0%' }
      return `${Math.round(((row.sessions || 0) + (row.courses || 0)) / this.busiest * 100)}%`
    },

    /**
     * Buefy tag type for a firm's status.
     *
     * @param {string} status - 'active' | 'slowed' | 'never'
     * @returns {string} a Buefy type, or '' for a status this screen does not know.
     */
    statusType (status) {
      return STATUS_TYPES[status] || ''
    },

    /**
     * Day-month-year, matching the team and advisor progress screens. Deliberately
     * not the browser's short numeric default: 7/8 is a different day in two
     * countries.
     *
     * @param {string|Date} dt - an activity timestamp.
     * @returns {string} e.g. "29 Jul 2026".
     */
    formatDate (dt) {
      return new Date(dt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
}
</script>

<style scoped>
/* Tile colours carry the same meaning as the status tags below them, so a count
   and the rows it counts read as one thing. */
.tile-box { border-top: 4px solid #b8c6d8; height: 100%; }
.tile-box.tile-active { border-top-color: #63c48d; }
.tile-box.tile-slowed { border-top-color: #ffb870; }
.tile-num { font-size: 1.7rem; font-weight: 700; color: #002b64; line-height: 1.2; }
.tile-label { margin-top: 0.35rem; }
.tile-note { margin-top: 0.7rem; padding-top: 0.7rem; border-top: 1px solid #f0f2f5; color: #363636; }
.firm-id { line-height: 1.2; }
/* Relative activity, matching the artefact's bar. */
.bar { height: 6px; border-radius: 3px; background: #f3f6fa; margin-top: 0.3rem; overflow: hidden; }
.bar > i { display: block; height: 100%; background: #b8c6d8; }
</style>

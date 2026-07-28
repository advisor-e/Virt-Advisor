<template lang="pug">
section.firm-team-progress
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmTeamProgress.lede') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('firmTeamProgress.loading') }}

  //- The record could not be reached. Said out loud rather than shown as an
  //- empty team — the two are different things and must never look alike.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('firmTeamProgress.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('firmTeamProgress.retry') }}

  template(v-else)
    p.has-text-grey.has-text-centered.py-6(v-if="!advisors.length")
      | {{ $t('firmTeamProgress.empty') }}

    div(v-else)
      p.has-text-grey.is-size-7.mb-2 {{ $t('firmTeamProgress.cellLegend') }}

      b-table(:data="advisors" :hoverable="true")
        b-table-column(
          v-slot="{ row }"
          field="advisorId"
          :label="$t('firmTeamProgress.colAdvisor')"
        )
          span.has-text-weight-semibold {{ row.advisorId }}

        b-table-column(
          v-for="tier in tierDefs"
          :key="tier.key"
          v-slot="{ row }"
          :label="$t(tier.labelKey)"
          width="130"
        )
          .tier-cell
            span.tier-count(:class="'tier-' + tier.key") {{ tierSessions(row, tier.key) }}
            span.tier-score.has-text-grey.is-size-7(v-if="tierScore(row, tier.key) !== null")
              | {{ tierScore(row, tier.key) }}%

        b-table-column(
          v-slot="{ row }"
          field="totalSessions"
          :label="$t('firmTeamProgress.colTotal')"
          width="80"
          numeric
        )
          | {{ row.totalSessions }}

        b-table-column(
          v-slot="{ row }"
          field="lastActive"
          :label="$t('firmTeamProgress.colLastActive')"
          width="130"
        )
          | {{ row.lastActive ? formatDate(row.lastActive) : '—' }}
</template>

<script>

/** The three capability levels, in the order a manager reads them. */
const TIER_DEFS = [
  { key: 'entry-level', labelKey: 'firmTeamProgress.tierEntry' },
  { key: 'intermediate', labelKey: 'firmTeamProgress.tierIntermediate' },
  { key: 'advanced', labelKey: 'firmTeamProgress.tierAdvanced' }
]

/** Stand-in for a tier the backend did not send, so one gap cannot blank the row. */
const EMPTY_TIER = { vaSessions: 0, courseSessions: 0, avgQuizScore: null }

export default {
  name: 'FirmTeamProgress',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the record could not be READ — never merely "no rows yet". */
      error: false,
      /** One row per advisor, newest-active first, as /api/activity/team returns them. */
      advisors: [],
      tierDefs: TIER_DEFS
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * GET the firm's team overview.
     *
     * The firm is derived server-side from the bearer token, never sent from here —
     * a manager cannot ask for another firm's team by changing a parameter. Any
     * failure (HTTP error, malformed body, or no network at all) sets `error` rather
     * than leaving an empty list, because an unreachable record and a firm whose
     * advisors have done nothing must not render the same screen.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      try {
        const res = await fetch('/api/activity/team', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error(res.statusText) }
        const data = await res.json()
        if (!data || !data.success) { throw new Error('UNSUCCESSFUL') }
        this.advisors = data.advisors || []
      } catch (err) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Sessions an advisor completed at one capability level — client cases and
     * course sessions together, which is what the single number in the cell means.
     *
     * @param {Object} row - one advisor from the team payload.
     * @param {string} key - tier key ('entry-level' | 'intermediate' | 'advanced').
     * @returns {number} combined session count.
     */
    tierSessions (row, key) {
      const tier = (row.tiers && row.tiers[key]) || EMPTY_TIER
      return (tier.vaSessions || 0) + (tier.courseSessions || 0)
    },

    /**
     * Average quiz score at one capability level.
     *
     * @param {Object} row - one advisor from the team payload.
     * @param {string} key - tier key.
     * @returns {number|null} the average, or null when no quiz has been scored there.
     */
    tierScore (row, key) {
      const tier = (row.tiers && row.tiers[key]) || EMPTY_TIER
      return tier.avgQuizScore === undefined ? null : tier.avgQuizScore
    },

    /**
     * Day-month-year, matching the advisor's own progress screen. Deliberately not
     * the browser's short numeric default: 7/8 is a different day in two countries.
     *
     * @param {string|Date} dt - a completion timestamp.
     * @returns {string} e.g. "29 Jul 2026".
     */
    formatDate (dt) {
      return new Date(dt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
}
</script>

<style scoped>
/* Tier colours match the advisor's own progress screen, so a level reads the
   same to a manager as it does to the advisor it describes. */
.tier-cell { display: flex; flex-direction: column; line-height: 1.2; }
.tier-count { font-size: 1.1rem; font-weight: 700; }
.tier-count.tier-entry-level  { color: #0284c7; }
.tier-count.tier-intermediate { color: #7c3aed; }
.tier-count.tier-advanced     { color: #d97706; }
.tier-score { margin-top: 1px; }
</style>

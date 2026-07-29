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
      p.has-text-grey.is-size-7.mb-2
        | {{ $t('firmTeamProgress.cellLegend') }}
        template(v-if="anyUnclassified")  {{ $t('firmTeamProgress.totalLegend') }}

      b-table(
        ref="table"
        :data="advisors"
        :hoverable="true"
        detailed
        detail-key="advisorId"
        :show-detail-icon="false"
      )
        b-table-column(
          v-slot="{ row }"
          field="advisorId"
          :label="$t('firmTeamProgress.colAdvisor')"
        )
          span.has-text-weight-semibold {{ row.advisorName || row.advisorId }}
          //- The ID stays visible under a name so a manager can still match a row to
          //- the platform record. Hidden entirely when there is no name to sit above.
          .advisor-id.has-text-grey.is-size-7(v-if="row.advisorName") {{ row.advisorId }}

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
          width="110"
          numeric
        )
          .total-cell
            span {{ row.totalSessions }}
            span.unlevelled.has-text-grey.is-size-7(v-if="row.unclassifiedSessions")
              | {{ $t('firmTeamProgress.notLevelled', { n: row.unclassifiedSessions }) }}

        b-table-column(
          v-slot="{ row }"
          field="lastActive"
          :label="$t('firmTeamProgress.colLastActive')"
          width="130"
        )
          | {{ row.lastActive ? formatDate(row.lastActive) : '—' }}

        //- The way into one advisor's question-level record. A worded button rather
        //- than a bare chevron: what opens is a different kind of thing from the
        //- counts beside it, and a manager should know that before clicking.
        b-table-column(
          v-slot="{ row }"
          :label="$t('firmTeamProgress.detail.expand')"
          width="120"
        )
          b-button(size="is-small" outlined @click="toggleDetail(row)")
            | {{ $t('firmTeamProgress.detail.expand') }}

        //- Mounted only when a row is open, so no advisor's detail is fetched — or
        //- shown — until a manager deliberately asks for that person.
        template(#detail="props")
          firm-advisor-questions(
            :api-token="apiToken"
            :advisor-id="props.row.advisorId"
          )
</template>

<script>
import FirmAdvisorQuestions from '~/components/firm/FirmAdvisorQuestions.vue'

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

  components: { FirmAdvisorQuestions },

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

  computed: {
    /**
     * True when at least one advisor has sessions no capability level could hold.
     * The Total column then exceeds the three level columns added together, so the
     * legend explaining that only appears when it is actually needed.
     *
     * @returns {boolean}
     */
    anyUnclassified () {
      return this.advisors.some(a => a.unclassifiedSessions > 0)
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
     * Open or close one advisor's quiz detail.
     *
     * Delegated to the table rather than tracked here, so the open row and the button
     * that opened it can never disagree about which advisor is showing.
     *
     * @param {Object} row - the advisor row that was clicked.
     * @returns {void}
     */
    toggleDetail (row) {
      if (this.$refs.table) { this.$refs.table.toggleDetails(row) }
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
.total-cell { display: flex; flex-direction: column; line-height: 1.2; }
.unlevelled { margin-top: 1px; white-space: nowrap; }
.advisor-id { line-height: 1.2; }
</style>

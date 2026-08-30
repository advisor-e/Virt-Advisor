<template lang="pug">
.mentor-review
  .container(style="max-width: 960px; padding: 2rem 1rem;")
    //- Opened by THREE tiers, not one — mentor, global group manager and group
    //- manager all mount this component (TAB_TIERS.caseReviews in FirmManagerHub).
    //- So neither string may name a single level. Wording ruled by Mike 2026-08-11:
    //- design/WORDING-CASE-SHARE-CASCADE.md.
    h1.title.is-4 {{ $t('caseShare.reviewTitle') }}
    b-notification.mb-4(type="is-info is-light" :closable="false")
      | {{ $t('caseShare.reviewLede') }}

    .has-text-centered.py-6(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    template(v-else)
      //- FIRST in the chain: a tier with no firms mapped beneath it has had nothing
      //- shared because there is nobody to share, which is not the same statement as
      //- "no manager has chosen to share one yet".
      tier-not-connected(v-if="awaitingFirms")

      p.has-text-grey.has-text-centered.py-6(v-else-if="cases.length === 0")
        | {{ $t('mentorReview.empty') }}

      div(v-else)
        //- Grouped by the level IMMEDIATELY BELOW whoever is looking — a firm for a
        //- group manager, a country for a global group manager (rule 7, §4.1). The
        //- grouping key comes from the backend's `origin`; this screen never works
        //- out its own tier, for the same reason it does not infer awaitingFirms.
        .mb-5(v-for="g in groups" :key="g.key")
          .level.is-mobile.mb-2(v-if="g.label" style="cursor:pointer" @click="toggleGroup(g.key)")
            .level-left
              div.is-flex.is-align-items-center
                p.has-text-weight-semibold.mr-2 {{ g.label }}
                b-tag(rounded) {{ g.cases.length }}
            .level-right
              b-icon(:icon="isGroupOpen(g.key) ? 'chevron-up' : 'chevron-down'")

          template(v-if="isGroupOpen(g.key)")
            .box.mb-3(v-for="c in g.cases" :key="c.id")
              .level.is-mobile.mb-0(style="cursor:pointer" @click="toggle(c.id)")
                .level-left
                  div
                    p.has-text-weight-semibold {{ c.title }}
                    p.is-size-7.has-text-grey {{ originPrefix(c) }}{{ domainLabel(c) }} &middot; {{ $t('mentorReview.sharedDate', { date: formatDate(c.mentorSharedAt) }) }}
                .level-right
                  b-icon(:icon="expandedId === c.id ? 'chevron-up' : 'chevron-down'")

              div(v-if="expandedId === c.id")
                hr.my-3

                //- Anonymised summary
                .mb-4(v-if="c.summary")
                  p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.summary') }}
                  p.is-size-7 {{ c.summary }}

                //- Engine behaviour — how the recommendation was reached
                template(v-if="c.decisionTrace")
                  p.is-size-7
                    strong {{ $t('mentorReview.areaFocused') }}
                    |  {{ traceDomainLabel(c.decisionTrace) }}
                  .mt-3(v-if="topTemplates(c).length")
                    p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.templateScores') }}
                    table.table.is-narrow.is-fullwidth.is-size-7
                      thead
                        tr
                          th #
                          th {{ $t('mentorReview.colTemplate') }}
                          th {{ $t('mentorReview.colScore') }}
                      tbody
                        tr(v-for="t in topTemplates(c)" :key="t.rank")
                          td {{ t.rank }}
                          td {{ t.title }}
                          td {{ t.score }}
                p.is-size-7.has-text-grey(v-else) {{ $t('mentorReview.noTrace') }}

                //- Advisor's own review
                .mt-4(v-if="c.review")
                  p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.reviewHeading') }}
                  p.is-size-7(v-if="c.review.wentWell") ✓ {{ $t('mentorReview.wentWell') }} — {{ c.review.wentWell }}
                  p.is-size-7(v-if="c.review.wentLess") ⚠ {{ $t('mentorReview.wentLess') }} — {{ c.review.wentLess }}
                  p.is-size-7(v-if="c.review.changesRecommended") {{ $t('mentorReview.changesRecommended') }} — {{ c.review.changesRecommended }}

                //- Anonymised conversation
                .mt-4(v-if="c.transcript && c.transcript.length")
                  p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.conversation') }}
                  .mentor-msg(
                    v-for="(m, i) in c.transcript"
                    :key="i"
                    :class="m.role === 'assistant' ? 'mentor-msg-va' : 'mentor-msg-adviser'"
                  )
                    span.mentor-msg-role {{ m.role === 'assistant' ? $t('mentorReview.roleTool') : $t('mentorReview.roleAdviser') }}
                    p.mentor-msg-text {{ m.content }}
</template>

<script>
import TierNotConnected from '~/components/base/TierNotConnected.vue'

const DOMAIN_LABELS = {
  conflict: 'Conflict & Dispute',
  profit: 'Profitability & Feasibility',
  staff: 'Staff & Team',
  'data-systems': 'Data & Financial Systems',
  'sales-marketing': 'Sales & Marketing',
  forecasting: 'Financial Management',
  governance: 'Governance & Leadership',
  strategy: 'Strategy & Planning',
  systems: 'Business Systems',
  valuation: 'Business Valuation',
  risk: 'Risk Management',
  succession: 'Succession & Exit Planning',
  eoy: 'End of Year',
  'due-diligence': 'Due Diligence & Acquisitions'
}

export default {
  name: 'MentorReview',

  components: { TierNotConnected },

  props: {
    apiToken: { type: String, default: null }
  },

  data () {
    return {
      cases: [],
      loading: false,
      /**
       * True when this tier has no firms mapped beneath it yet. From the response,
       * never inferred from which hub is rendering this component — the backend is
       * the only place that knows the mapping. Always false for the mentor.
       */
      awaitingFirms: false,
      expandedId: null,
      /**
       * Group keys the reader has closed. Groups are OPEN by default: this screen is
       * live in UAT as a flat list, and defaulting to closed would hide every case
       * behind a click for someone who did not ask for grouping.
       */
      closedGroups: []
    }
  },

  computed: {
    /**
     * The cases, gathered under the level immediately below the viewer.
     *
     * The key is `origin[0].scopeId` — a firm for a group manager, a country for a
     * global group manager — which the BACKEND decided. A case with no origin (a
     * viewer outside its chain, which the scope filter should already have removed)
     * falls into one unlabelled group and still renders, because losing a case
     * silently is worse than showing one without an address.
     *
     * Order follows the feed, which is most-recently-shared first, so the group a
     * manager most likely came to read sits at the top.
     *
     * @returns {Array<{key: string, label: (string|null), cases: object[]}>}
     */
    groups () {
      const out = []
      const byKey = {}

      this.cases.forEach((c) => {
        const head = (c.origin && c.origin.length) ? c.origin[0] : null
        const key = head ? head.scopeId : ''
        if (!byKey[key]) {
          byKey[key] = { key, label: head ? head.label : null, cases: [] }
          out.push(byKey[key])
        }
        byKey[key].cases.push(c)
      })

      return out
    }
  },

  mounted () {
    this.loadCases()
  },

  methods: {
    /** Shared fetch helper — mirrors FirmManagerHub.api (Bearer token + JSON). */
    async api (method, path) {
      const res = await fetch(`${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || res.statusText)
      }
      return res.json()
    },

    async loadCases () {
      this.loading = true
      try {
        const data = await this.api('GET', '/api/mentor/cases')
        this.cases = data.cases || []
        this.awaitingFirms = data.awaitingFirms === true
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loading = false
      }
    },

    toggle (id) {
      this.expandedId = this.expandedId === id ? null : id
    },

    /**
     * Is a group expanded? Open unless the reader closed it — see `closedGroups`.
     * @param {string} key - the group's scope id
     * @returns {boolean}
     */
    isGroupOpen (key) {
      return !this.closedGroups.includes(key)
    },

    /**
     * Open or close one group. Rebuilt as a new array rather than spliced in place,
     * so Vue 2 sees the change without a `$set`.
     * @param {string} key - the group's scope id
     * @returns {void}
     */
    toggleGroup (key) {
      this.closedGroups = this.isGroupOpen(key)
        ? this.closedGroups.concat([key])
        : this.closedGroups.filter(k => k !== key)
    },

    /**
     * The address INSIDE the group heading — everything below the level the list is
     * grouped by, nearest first, ending in a separator so it reads as one line with
     * the area and date that follow.
     *
     * Empty for a group manager, whose group heading already names the firm and for
     * whom there is nothing further down to name. That is why it is a prefix rather
     * than a column: a column would sit empty on the tier that uses this screen most.
     *
     * @param {object} c - a case from the feed
     * @returns {string} e.g. 'Germany · Müller & Partner · ', or ''
     */
    originPrefix (c) {
      const rest = (c.origin || []).slice(1).map(s => s.label).filter(Boolean)
      return rest.length ? rest.join(' · ') + ' · ' : ''
    },

    domainLabel (c) {
      return DOMAIN_LABELS[c.domain] || c.domain || this.$t('mentorReview.noArea')
    },

    traceDomainLabel (trace) {
      const d = (trace && trace.domain) || {}
      return d.label || DOMAIN_LABELS[d.id] || d.id || '—'
    },

    /** Top scored templates from the stored trace (defensive against shape drift). */
    topTemplates (c) {
      const scores = c.decisionTrace && c.decisionTrace.templateScores
      return Array.isArray(scores) ? scores.slice(0, 6) : []
    },

    formatDate (value) {
      if (!value) { return this.$t('mentorReview.recently') }
      const d = new Date(value)
      return isNaN(d.getTime()) ? this.$t('mentorReview.recently') : d.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.mentor-review {
  min-height: 100vh;
}
.mentor-msg {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.mentor-msg:last-child {
  border-bottom: none;
}
.mentor-msg-va {
  background: #f8faff;
}
.mentor-msg-adviser {
  background: #ffffff;
}
.mentor-msg-role {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #888;
  margin-bottom: 2px;
}
.mentor-msg-text {
  font-size: 0.85rem;
  white-space: pre-wrap;
  margin: 0;
}
</style>

<template lang="pug">
.mentor-review
  .container(style="max-width: 960px; padding: 2rem 1rem;")
    h1.title.is-4 {{ $t('mentorReview.heading') }}
    b-notification.mb-4(type="is-info is-light" :closable="false")
      | {{ $t('mentorReview.introNotification') }}

    .has-text-centered.py-6(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    template(v-else)
      p.has-text-grey.has-text-centered.py-6(v-if="cases.length === 0")
        | {{ $t('mentorReview.emptyState') }}

      div(v-else)
        .box.mb-3(v-for="c in cases" :key="c.id")
          .level.is-mobile.mb-0(style="cursor:pointer" @click="toggle(c.id)")
            .level-left
              div
                p.has-text-weight-semibold {{ c.title }}
                p.is-size-7.has-text-grey {{ $t('mentorReview.domainSharedLine', { domain: domainLabel(c), date: formatDate(c.mentorSharedAt) }) }}
            .level-right
              b-icon(:icon="expandedId === c.id ? 'chevron-up' : 'chevron-down'")

          div(v-if="expandedId === c.id")
            hr.my-3

            //- Anonymised summary
            .mb-4(v-if="c.summary")
              p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.summaryLabel') }}
              p.is-size-7 {{ c.summary }}

            //- Engine behaviour — how the recommendation was reached
            template(v-if="c.decisionTrace")
              p.is-size-7
                strong {{ $t('mentorReview.areaFocusedOnLabel') }}
                |  {{ traceDomainLabel(c.decisionTrace) }}
              .mt-3(v-if="topTemplates(c).length")
                p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.howTemplatesScored') }}
                table.table.is-narrow.is-fullwidth.is-size-7
                  thead
                    tr
                      th {{ $t('mentorReview.colRank') }}
                      th {{ $t('mentorReview.colTemplate') }}
                      th {{ $t('mentorReview.colScore') }}
                  tbody
                    tr(v-for="t in topTemplates(c)" :key="t.rank")
                      td {{ t.rank }}
                      td {{ t.title }}
                      td {{ t.score }}
            p.is-size-7.has-text-grey(v-else) {{ $t('mentorReview.noDecisionTrace') }}

            //- Advisor's own review
            .mt-4(v-if="c.review")
              p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.postDeliveryReview') }}
              p.is-size-7(v-if="c.review.wentWell") {{ $t('mentorReview.wentWell', { value: c.review.wentWell }) }}
              p.is-size-7(v-if="c.review.wentLess") {{ $t('mentorReview.wentLess', { value: c.review.wentLess }) }}
              p.is-size-7(v-if="c.review.changesRecommended") {{ $t('mentorReview.changesRecommended', { value: c.review.changesRecommended }) }}

            //- Anonymised conversation
            .mt-4(v-if="c.transcript && c.transcript.length")
              p.is-size-7.has-text-weight-semibold {{ $t('mentorReview.conversationAnonymised') }}
              .mentor-msg(
                v-for="(m, i) in c.transcript"
                :key="i"
                :class="m.role === 'assistant' ? 'mentor-msg-va' : 'mentor-msg-adviser'"
              )
                span.mentor-msg-role {{ m.role === 'assistant' ? $t('mentorReview.roleAdviserTool') : $t('mentorReview.roleAdviser') }}
                p.mentor-msg-text {{ m.content }}
</template>

<script>
const BACKEND = 'http://localhost:4000'

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

  props: {
    apiToken: { type: String, default: null }
  },

  data () {
    return {
      cases: [],
      loading: false,
      expandedId: null
    }
  },

  mounted () {
    this.loadCases()
  },

  methods: {
    /** Shared fetch helper — mirrors FirmManagerHub.api (Bearer token + JSON). */
    async api (method, path) {
      const res = await fetch(`${BACKEND}${path}`, {
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
      } catch (e) {
        this.$buefy.toast.open({ message: e.message || this.$t('mentorReview.loadError'), type: 'is-danger' })
      } finally {
        this.loading = false
      }
    },

    toggle (id) {
      this.expandedId = this.expandedId === id ? null : id
    },

    domainLabel (c) {
      return DOMAIN_LABELS[c.domain] || c.domain || this.$t('mentorReview.noAreaRecorded')
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
      if (!value) { return this.$t('mentorReview.dateRecently') }
      const d = new Date(value)
      return isNaN(d.getTime()) ? this.$t('mentorReview.dateRecently') : d.toLocaleDateString()
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

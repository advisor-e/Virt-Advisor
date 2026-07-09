<template lang="pug">
.advisor-progression

  .prog-nav-bar
    button.btn-prog-back(@click="$emit('exit')") ← Back to Menu

  .prog-loading(v-if="loading")
    .prog-loading-inner
      .prog-spinner
      p Loading progress data...

  .prog-error(v-else-if="error")
    p.prog-error-msg {{ error }}
    button.btn-prog-retry(@click="fetchData") Try again

  //- ── Advisor self-view ────────────────────────────────────────────────
  template(v-else-if="!isFirmManager")
    .prog-header
      h2.prog-title My Progress
      p.prog-sub Your advisory capability across all VA cases, courses, and sessions

    .prog-tiers
      .prog-tier-card(
        v-for="tier in tierDefs"
        :key="tier.key"
        :class="'tier-card-' + tier.key"
      )
        .prog-tier-top
          span.prog-tier-label {{ tier.label }}
          span.prog-tier-desc {{ tier.desc }}
        .prog-tier-stats
          .prog-stat
            .prog-stat-num {{ tiers[tier.key].vaSessions }}
            .prog-stat-label VA Cases
          .prog-stat
            .prog-stat-num {{ tiers[tier.key].courseSessions }}
            .prog-stat-label Course Sessions
          .prog-stat
            .prog-stat-num(v-if="tiers[tier.key].avgQuizScore !== null") {{ tiers[tier.key].avgQuizScore }}%
            .prog-stat-num(v-else) —
            .prog-stat-label Avg Quiz
        .prog-tier-footer
          span.prog-last-active(v-if="tiers[tier.key].lastActive") Last active {{ formatDate(tiers[tier.key].lastActive) }}
          span.prog-no-activity(v-else) No activity yet

    .prog-empty-notice(v-if="!hasAnyActivity")
      p Complete a VA case or course session to start building your progress record here.

    .prog-recent(v-if="recentActivity.length")
      h3.prog-recent-heading Recent Activity
      .prog-activity-list
        .prog-activity-row(v-for="(item, i) in recentActivity" :key="i")
          .prog-activity-type-icon(:class="item.type === 'va' ? 'type-va' : 'type-course'")
            svg(v-if="item.type === 'va'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" width="16" height="16")
              path(stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")
              circle(cx="9" cy="7" r="4")
            svg(v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" width="16" height="16")
              path(stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z")
              path(stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0 1 21 18.5a12.083 12.083 0 0 1-9 0 12.083 12.083 0 0 1-9 0A12.083 12.083 0 0 1 3 18.5l9-4.5z")
          .prog-activity-body
            .prog-activity-title {{ item.type === 'va' ? (item.domain ? domainLabel(item.domain) : 'Advisory Session') : item.courseTitle }}
            .prog-activity-sub {{ item.type === 'va' ? 'VA Case' : item.sessionTitle }}
          .prog-activity-meta
            span.prog-tier-pill(:class="'pill-' + item.tier") {{ tierLabel(item.tier) }}
            span.prog-activity-date {{ formatDate(item.completedAt) }}

  //- ── Firm manager team view ───────────────────────────────────────────
  template(v-else)
    .prog-header
      h2.prog-title Team Progress
      p.prog-sub Advisory capability overview across your firm

    .prog-team-empty(v-if="!advisors.length")
      p No advisor activity recorded yet. This view will populate once your team starts completing VA cases and course sessions.

    .prog-team-table(v-else)
      .prog-team-header-row
        .prog-th Advisor
        .prog-th(v-for="tier in tierDefs" :key="tier.key" :class="'th-' + tier.key") {{ tier.shortLabel }}
        .prog-th Total
        .prog-th Last Active
      .prog-team-row(v-for="a in advisors" :key="a.advisorId")
        .prog-td.prog-td-advisor {{ a.advisorId }}
        .prog-td(v-for="tier in tierDefs" :key="tier.key")
          .prog-team-tier-block(:class="'block-' + tier.key")
            span.prog-team-count {{ a.tiers[tier.key].vaSessions + a.tiers[tier.key].courseSessions }}
            span.prog-team-score(v-if="a.tiers[tier.key].avgQuizScore !== null") {{ a.tiers[tier.key].avgQuizScore }}%
        .prog-td {{ a.totalSessions }}
        .prog-td {{ a.lastActive ? formatDate(a.lastActive) : '—' }}
</template>

<script>

const DOMAIN_LABELS = {
  profit: 'Profitability',
  staff: 'Staff & Team',
  'data-systems': 'Data & Systems',
  'sales-marketing': 'Sales & Marketing',
  forecasting: 'Financial Management',
  strategy: 'Strategy & Planning',
  governance: 'Governance & Leadership',
  succession: 'Succession Planning',
  valuation: 'Valuation',
  risk: 'Risk Management',
  conflict: 'Conflict Meetings',
  'end-of-year': 'End of Year',
  'due-diligence': 'Due Diligence',
  systems: 'Systems'
}

export default {
  name: 'AdvisorProgression',

  props: {
    advisorId: { type: String, default: 'local-advisor' },
    firmId: { type: String, default: 'local-firm' },
    isFirmManager: { type: Boolean, default: false },
    // Verified login pass (JWT). Defaults to the safe local-dev bypass token.
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      loading: true,
      error: null,
      tiers: {
        'entry-level': { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null },
        intermediate: { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null },
        advanced: { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null }
      },
      recentActivity: [],
      advisors: [],
      tierDefs: [
        { key: 'entry-level', label: 'Entry Level', shortLabel: 'Entry', desc: 'Foundational advisory tools and techniques' },
        { key: 'intermediate', label: 'Intermediate', shortLabel: 'Inter.', desc: 'Building advisory depth and selling skills' },
        { key: 'advanced', label: 'Advanced', shortLabel: 'Advanced', desc: 'Strategic, governance and specialist delivery' }
      ]
    }
  },

  computed: {
    hasAnyActivity () {
      return Object.values(this.tiers).some(t => t.vaSessions > 0 || t.courseSessions > 0)
    }
  },

  mounted () {
    this.fetchData()
  },

  methods: {
    async fetchData () {
      this.loading = true
      this.error = null
      try {
        // Identity (advisor + firm) is derived server-side from this pass — not sent in the request.
        const authHeaders = { Authorization: `Bearer ${this.apiToken}` }
        if (this.isFirmManager) {
          const res = await fetch('/api/activity/team', { headers: authHeaders })
          if (!res.ok) {
            this.error = 'Could not load team progress. Please try again.'
            return
          }
          const data = await res.json()
          if (data.success) {
            this.advisors = data.advisors || []
          } else {
            this.error = 'Could not load team progress. Please try again.'
          }
        } else {
          const res = await fetch('/api/activity/progression', { headers: authHeaders })
          if (!res.ok) {
            this.error = 'Could not load your progress. Please try again.'
            return
          }
          const data = await res.json()
          if (data.success) {
            this.tiers = data.tiers || this.tiers
            this.recentActivity = data.recentActivity || []
          } else {
            this.error = 'Could not load your progress. Please try again.'
          }
        }
      } catch (e) {
        this.error = 'Could not connect to the activity service. Please try again.'
      } finally {
        this.loading = false
      }
    },

    formatDate (dt) {
      if (!dt) { return '' }
      return new Date(dt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    },

    tierLabel (key) {
      const found = this.tierDefs.find(t => t.key === key)
      return found ? found.label : key
    },

    domainLabel (domain) {
      return DOMAIN_LABELS[domain] || domain
    }
  }
}
</script>

<style scoped>
.advisor-progression {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  background: #f8fafc;
  min-height: 0;
}

/* ── Nav bar ── */
.prog-nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.btn-prog-back {
  background: none;
  border: none;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 0;
}
.btn-prog-back:hover { color: #111827; }

/* ── Loading / error ── */
.prog-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}
.prog-loading-inner { text-align: center; color: #6b7280; font-size: 14px; }
.prog-spinner {
  width: 28px; height: 28px;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.prog-error { padding: 40px 24px; text-align: center; }
.prog-error-msg { color: #ef4444; font-size: 14px; margin-bottom: 12px; }
.btn-prog-retry {
  background: #f3f4f6; border: 1px solid #d1d5db;
  border-radius: 6px; padding: 6px 14px;
  font-size: 13px; cursor: pointer; color: #374151;
}
.btn-prog-retry:hover { background: #e5e7eb; }

/* ── Header ── */
.prog-header { padding: 24px 24px 8px; }
.prog-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.prog-sub { font-size: 13px; color: #6b7280; margin: 0; }

/* ── Tier cards ── */
.prog-tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding: 16px 24px;
}
@media (max-width: 680px) {
  .prog-tiers { grid-template-columns: 1fr; }
}
.prog-tier-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tier-card-entry-level  { border-top: 4px solid #0ea5e9; }
.tier-card-intermediate { border-top: 4px solid #8b5cf6; }
.tier-card-advanced     { border-top: 4px solid #f59e0b; }

.prog-tier-top { padding: 14px 16px 10px; border-bottom: 1px solid #f3f4f6; }
.prog-tier-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 2px;
}
.tier-card-entry-level  .prog-tier-label { color: #0284c7; }
.tier-card-intermediate .prog-tier-label { color: #7c3aed; }
.tier-card-advanced     .prog-tier-label { color: #d97706; }

.prog-tier-desc { font-size: 11px; color: #9ca3af; line-height: 1.4; }

.prog-tier-stats {
  display: flex;
  gap: 0;
  padding: 14px 16px;
  flex: 1;
}
.prog-stat {
  flex: 1;
  text-align: center;
  border-right: 1px solid #f3f4f6;
}
.prog-stat:last-child { border-right: none; }
.prog-stat-num { font-size: 22px; font-weight: 700; color: #111827; line-height: 1; }
.prog-stat-label { font-size: 10px; color: #9ca3af; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em; }

.prog-tier-footer { padding: 8px 16px 12px; }
.prog-last-active { font-size: 11px; color: #9ca3af; }
.prog-no-activity { font-size: 11px; color: #d1d5db; font-style: italic; }

/* ── Empty notice ── */
.prog-empty-notice {
  margin: 0 24px 16px;
  padding: 14px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  font-size: 13px;
  color: #0369a1;
}
.prog-empty-notice p { margin: 0; }

/* ── Recent activity ── */
.prog-recent { padding: 0 24px 24px; }
.prog-recent-heading { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 10px; }
.prog-activity-list { display: flex; flex-direction: column; gap: 6px; }
.prog-activity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  padding: 10px 14px;
}
.prog-activity-type-icon {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.type-va     { background: #eff6ff; color: #3b82f6; }
.type-course { background: #f0fdf4; color: #16a34a; }
.prog-activity-body { flex: 1; min-width: 0; }
.prog-activity-title { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prog-activity-sub   { font-size: 11px; color: #9ca3af; }
.prog-activity-meta  { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.prog-tier-pill {
  font-size: 10px; font-weight: 600;
  padding: 2px 7px; border-radius: 10px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.pill-entry-level  { background: #e0f2fe; color: #0284c7; }
.pill-intermediate { background: #f3e8ff; color: #7c3aed; }
.pill-advanced     { background: #fef3c7; color: #d97706; }
.prog-activity-date { font-size: 11px; color: #9ca3af; }

/* ── Firm manager team view ── */
.prog-team-empty {
  margin: 24px;
  padding: 20px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}
.prog-team-empty p { margin: 0; }

.prog-team-table { padding: 16px 24px 24px; overflow-x: auto; }
.prog-team-header-row,
.prog-team-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 80px 110px;
  gap: 0;
  align-items: center;
}
.prog-team-header-row {
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 4px;
}
.prog-th {
  font-size: 11px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 8px;
}
.th-entry-level  { color: #0284c7; }
.th-intermediate { color: #7c3aed; }
.th-advanced     { color: #d97706; }

.prog-team-row {
  border-bottom: 1px solid #f3f4f6;
  padding: 8px 0;
}
.prog-team-row:last-child { border-bottom: none; }
.prog-td { padding: 4px 8px; font-size: 13px; color: #374151; }
.prog-td-advisor { font-weight: 600; color: #111827; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.prog-team-tier-block { display: flex; flex-direction: column; gap: 1px; }
.prog-team-count { font-size: 14px; font-weight: 700; color: #111827; }
.block-entry-level  .prog-team-count { color: #0284c7; }
.block-intermediate .prog-team-count { color: #7c3aed; }
.block-advanced     .prog-team-count { color: #d97706; }
.prog-team-score { font-size: 10px; color: #9ca3af; }
</style>

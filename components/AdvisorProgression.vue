<template lang="pug">
.advisor-progression

  .prog-nav-bar
    button.btn-prog-back(@click="$emit('exit')") {{ $t('advisorProgress.backToMenu') }}

  .prog-loading(v-if="loading")
    .prog-loading-inner
      .prog-spinner
      p {{ $t('advisorProgress.loading') }}

  //- `error` holds an i18n KEY, not a sentence — see fetchData.
  .prog-error(v-else-if="error")
    p.prog-error-msg {{ $t(error) }}
    button.btn-prog-retry(@click="fetchData") {{ $t('advisorProgress.retry') }}

  //- ── Advisor self-view ────────────────────────────────────────────────
  //- This screen is one advisor's own record and nothing else. The firm-wide
  //- team table that used to share this component now lives in its own Firm
  //- Manager Hub tab (components/firm/FirmTeamProgress.vue) — it was only ever
  //- reachable behind an isFirmManager prop the app never set.
  template(v-else)
    .prog-header
      h2.prog-title {{ $t('advisorProgress.title') }}
      p.prog-sub {{ $t('advisorProgress.subtitle') }}

    .prog-tiers
      .prog-tier-card(
        v-for="tier in tierDefs"
        :key="tier.key"
        :class="'tier-card-' + tier.key"
      )
        .prog-tier-top
          span.prog-tier-label {{ $t(tier.labelKey) }}
          span.prog-tier-desc {{ $t(tier.descKey) }}
        .prog-tier-stats
          .prog-stat
            .prog-stat-num {{ tiers[tier.key].vaSessions }}
            .prog-stat-label {{ $t('advisorProgress.statVaCases') }}
          .prog-stat
            .prog-stat-num {{ tiers[tier.key].courseSessions }}
            .prog-stat-label {{ $t('advisorProgress.statCourseSessions') }}
          .prog-stat
            .prog-stat-num(v-if="tiers[tier.key].avgQuizScore !== null") {{ tiers[tier.key].avgQuizScore }}%
            .prog-stat-num(v-else) —
            .prog-stat-label {{ $t('advisorProgress.statAvgQuiz') }}
        .prog-tier-footer
          span.prog-last-active(v-if="tiers[tier.key].lastActive")
            | {{ $t('advisorProgress.lastActive', { date: formatDate(tiers[tier.key].lastActive) }) }}
          span.prog-no-activity(v-else) {{ $t('advisorProgress.noActivityYet') }}

    //- Work the tier lookup could not place. Said out loud so the three cards above
    //- are not read as the whole record.
    .prog-unlevelled(v-if="unclassifiedSessions")
      p {{ $t('advisorProgress.notLevelled', { n: unclassifiedSessions }) }}

    .prog-empty-notice(v-if="!hasAnyActivity")
      p {{ $t('advisorProgress.emptyNotice') }}

    .prog-recent(v-if="recentActivity.length")
      h3.prog-recent-heading {{ $t('advisorProgress.recentHeading') }}
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
            .prog-activity-title {{ activityTitle(item) }}
            .prog-activity-sub {{ item.type === 'va' ? $t('advisorProgress.vaCase') : item.sessionTitle }}
          .prog-activity-meta
            span.prog-tier-pill(:class="item.tier ? 'pill-' + item.tier : 'pill-none'") {{ tierLabel(item.tier) }}
            span.prog-activity-date {{ formatDate(item.completedAt) }}
</template>

<script>

/**
 * Advisory areas this screen can name, as i18n keys under `advisorProgress.domain.*`.
 * A LIST, not a map of English: the wording lives in the locale files. An area absent
 * from this list falls back to its own code rather than rendering blank — a new domain
 * added to the engine must never silently produce an unlabelled row here.
 */
const KNOWN_DOMAINS = [
  'profit', 'staff', 'data-systems', 'sales-marketing', 'forecasting', 'strategy',
  'governance', 'succession', 'valuation', 'risk', 'conflict', 'end-of-year',
  'due-diligence', 'systems'
]

export default {
  name: 'AdvisorProgression',

  props: {
    advisorId: { type: String, default: 'local-advisor' },
    firmId: { type: String, default: 'local-firm' },
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
      /** Completed sessions no capability tier could hold — counted, never dropped. */
      unclassifiedSessions: 0,
      tierDefs: [
        { key: 'entry-level', labelKey: 'advisorProgress.tierEntry', descKey: 'advisorProgress.tierEntryDesc' },
        { key: 'intermediate', labelKey: 'advisorProgress.tierIntermediate', descKey: 'advisorProgress.tierIntermediateDesc' },
        { key: 'advanced', labelKey: 'advisorProgress.tierAdvanced', descKey: 'advisorProgress.tierAdvancedDesc' }
      ]
    }
  },

  computed: {
    /**
     * Whether this advisor has done anything at all. Unclassified sessions count:
     * without them, someone with three completed sessions that no tier could hold
     * would be told to "start building your progress record" — the same denial of
     * real work the team table used to make about them.
     *
     * @returns {boolean}
     */
    hasAnyActivity () {
      return this.unclassifiedSessions > 0 ||
        Object.values(this.tiers).some(t => t.vaSessions > 0 || t.courseSessions > 0)
    }
  },

  mounted () {
    this.fetchData()
  },

  methods: {
    /**
     * Load this advisor's own progression record.
     *
     * Identity (advisor + firm) is derived server-side from the bearer pass and is
     * never sent in the request, so an advisor can only ever read their own record.
     * A failed read sets `error` rather than leaving the zeros on screen: an
     * unreachable record and an advisor who has genuinely done nothing must not
     * look the same (the fault that hid this feature's only real defect).
     *
     * `error` holds an i18n KEY, not a sentence — the template translates it. Storing
     * the English here would put user-facing wording back in the component.
     *
     * @returns {Promise<void>}
     */
    async fetchData () {
      this.loading = true
      this.error = null
      try {
        const res = await fetch('/api/activity/progression', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) {
          this.error = 'advisorProgress.loadFailed'
          return
        }
        const data = await res.json()
        if (data.success) {
          this.tiers = data.tiers || this.tiers
          this.recentActivity = data.recentActivity || []
          this.unclassifiedSessions = data.unclassifiedSessions || 0
        } else {
          this.error = 'advisorProgress.loadFailed'
        }
      } catch (e) {
        this.error = 'advisorProgress.connectFailed'
      } finally {
        this.loading = false
      }
    },

    /**
     * Day-month-year. Deliberately not the browser's short numeric default: 7/8 is a
     * different day in two countries. Matches the team table's format.
     *
     * @param {string|Date} dt @returns {string}
     */
    formatDate (dt) {
      if (!dt) { return '' }
      return new Date(dt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /**
     * The heading on an activity row: the advisory area for a client case, the course
     * title for a course session.
     *
     * @param {object} item - one recentActivity entry.
     * @returns {string}
     */
    activityTitle (item) {
      if (item.type !== 'va') { return item.courseTitle }
      return item.domain ? this.domainLabel(item.domain) : this.$t('advisorProgress.advisorySession')
    },

    /**
     * The badge on an activity row. A session the tier lookup could not place has no
     * key at all, and rendered as an empty pill — it now says so instead.
     *
     * @param {string|null} key - tier key, or null/unknown for an unplaced session.
     * @returns {string} the label to show.
     */
    tierLabel (key) {
      if (!key) { return this.$t('advisorProgress.noLevelYet') }
      const found = this.tierDefs.find(t => t.key === key)
      return found ? this.$t(found.labelKey) : key
    },

    /**
     * An advisory area's name for display. An area this screen does not know falls back
     * to its own code rather than rendering blank, so a domain added to the engine is
     * visibly unlabelled rather than invisible.
     *
     * @param {string} domain - the engine's domain code, e.g. 'profit'.
     * @returns {string}
     */
    domainLabel (domain) {
      return KNOWN_DOMAINS.includes(domain) ? this.$t(`advisorProgress.domain.${domain}`) : domain
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

/* ── Sessions with no capability level ── */
.prog-unlevelled {
  margin: 0 24px 12px;
  font-size: 12px;
  color: #6b7280;
}
.prog-unlevelled p { margin: 0; }
.pill-none { background: #f3f4f6; color: #6b7280; }

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
</style>

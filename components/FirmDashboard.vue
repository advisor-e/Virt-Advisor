<template lang="pug">
.firm-dashboard

  //- ── Loading ────────────────────────────────────────────────────────────
  .dashboard-loading(v-if="isLoading")
    .loading-spinner
    p.loading-text Loading team data...

  template(v-else)

    //- ── Header ─────────────────────────────────────────────────────────────
    .dashboard-header
      .dashboard-header-left
        h1.dashboard-title Team Learning Dashboard
        p.dashboard-firm {{ firmName }}
      .dashboard-header-right
        span.dashboard-date As of {{ todayFormatted }}
        button.btn-refresh(@click="loadData" :disabled="isRefreshing")
          | {{ isRefreshing ? 'Refreshing...' : '↻ Refresh' }}

    //- ── Summary cards ──────────────────────────────────────────────────────
    .summary-cards
      .summary-card
        span.card-number {{ summaryStats.activeLearners }}
        span.card-label Active Learners
      .summary-card
        span.card-number {{ summaryStats.coursesRunning }}
        span.card-label Courses Running
      .summary-card(:class="summaryStats.completionRate >= 70 ? 'card-good' : 'card-mid'")
        span.card-number {{ summaryStats.completionRate }}%
        span.card-label Completion Rate
      .summary-card(:class="summaryStats.avgQuizScore >= 70 ? 'card-good' : 'card-mid'")
        span.card-number {{ summaryStats.avgQuizScore !== null ? summaryStats.avgQuizScore + '%' : '—' }}
        span.card-label Avg. Quiz Score

    //- ── Team Insights (AI) ─────────────────────────────────────────────────
    .insights-panel
      .insights-header
        span.insights-title Team Insights
        button.btn-generate(
          @click="generateInsights"
          :disabled="isGeneratingInsights"
        )
          span(v-if="isGeneratingInsights")
            span.insights-spinner
            | Generating...
          span(v-else) ✦ Generate insights
      .insights-body(v-if="teamInsights")
        p.insights-text {{ teamInsights }}
        p.insights-meta Generated {{ insightsGeneratedAt }}
      .insights-empty(v-else)
        p Click "Generate insights" for an AI summary of your team's learning progress.

    //- ── Filters ────────────────────────────────────────────────────────────
    .filter-bar
      input.filter-search(
        v-model="searchQuery"
        placeholder="Search advisors..."
        type="text"
      )
      select.filter-select(v-model="filterCourse")
        option(value="") All courses
        option(v-for="c in uniqueCourses" :key="c" :value="c") {{ c }}
      select.filter-select(v-model="filterStatus")
        option(value="") All statuses
        option(value="active") Active
        option(value="complete") Complete
        option(value="paused") Paused
      span.filter-count {{ filteredRows.length }} {{ filteredRows.length === 1 ? 'result' : 'results' }}

    //- ── Table ──────────────────────────────────────────────────────────────
    .advisor-table(v-if="filteredRows.length")
      .table-head
        .th Advisor
        .th Course
        .th Progress
        .th Avg. Score
        .th Last Active
        .th Status

      template(v-for="row in filteredRows")
        .table-row(
          :key="row.key"
          @click="toggleExpand(row.key)"
          :class="{ 'row-expanded': expandedRows.has(row.key) }"
        )
          .td.td-advisor
            .advisor-avatar {{ row.initials }}
            .advisor-info
              span.advisor-name {{ row.advisorName }}
              span.advisor-email {{ row.email }}
          .td.td-course {{ row.courseTitle }}
          .td.td-progress
            .progress-track-mini
              .progress-fill-mini(:style="{ width: row.progressPct + '%' }")
            span.progress-label {{ row.sessionsComplete }}/{{ row.sessionsTotal }} sessions
          .td.td-score
            span(:class="scoreClass(row.avgScore)") {{ row.avgScore !== null ? row.avgScore + '%' : '—' }}
          .td.td-last {{ row.lastActiveFormatted }}
          .td.td-status
            span.status-badge(:class="'status-' + row.status") {{ statusLabel(row.status) }}
          .td.td-expand
            span.expand-chevron(:class="{ 'chevron-open': expandedRows.has(row.key) }") ›

        //- Session breakdown (expanded)
        .session-breakdown(:key="row.key + '-bd'" v-if="expandedRows.has(row.key)")
          .breakdown-inner
            .breakdown-heading Sessions
            .breakdown-row(v-for="s in row.sessions" :key="s.id")
              span.br-num {{ s.id }}
              span.br-title {{ s.title }}
              .br-progress-track
                .br-progress-fill(
                  :style="{ width: (s.status === 'complete' ? 100 : s.status === 'active' ? 50 : 0) + '%' }"
                  :class="'br-fill-' + s.status"
                )
              span.br-status(:class="'br-' + s.status") {{ s.status }}
              span.br-score(:class="s.score !== null ? scoreClass(s.score) : ''")
                | {{ s.score !== null ? s.score + '%' : '—' }}

    .table-empty(v-else)
      p No advisors match your current filters.

</template>

<script>
export default {
  name: 'FirmDashboard',

  props: {
    firmId: { type: String, default: 'local-firm' },
    firmName: { type: String, default: 'My Firm' }
  },

  data () {
    return {
      isLoading: true,
      isRefreshing: false,
      advisors: [],

      // Filters
      searchQuery: '',
      filterCourse: '',
      filterStatus: '',

      // Expanded rows
      expandedRows: new Set(),

      // AI insights
      teamInsights: '',
      insightsGeneratedAt: '',
      isGeneratingInsights: false
    }
  },

  computed: {
    todayFormatted () {
      return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    },

    // Flatten advisors × courses into table rows
    allRows () {
      const rows = []
      for (const advisor of this.advisors) {
        for (const course of (advisor.courses || [])) {
          const scores = (course.sessions || [])
            .filter(s => s.score !== null)
            .map(s => s.score)
          const avgScore = scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null
          const sessionsComplete = (course.sessions || []).filter(s => s.status === 'complete').length
          const sessionsTotal = (course.sessions || []).length
          rows.push({
            key: `${advisor.id}-${course.id}`,
            advisorId: advisor.id,
            advisorName: advisor.name,
            email: advisor.email,
            initials: this._initials(advisor.name),
            courseId: course.id,
            courseTitle: course.title,
            status: course.status,
            sessionsComplete,
            sessionsTotal,
            progressPct: sessionsTotal ? Math.round((sessionsComplete / sessionsTotal) * 100) : 0,
            avgScore,
            lastActive: course.lastActive,
            lastActiveFormatted: this._formatDate(course.lastActive),
            sessions: course.sessions || []
          })
        }
      }
      return rows
    },

    filteredRows () {
      return this.allRows.filter((row) => {
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase()
          if (!row.advisorName.toLowerCase().includes(q) && !row.email.toLowerCase().includes(q)) {
            return false
          }
        }
        if (this.filterCourse && row.courseTitle !== this.filterCourse) { return false }
        if (this.filterStatus && row.status !== this.filterStatus) { return false }
        return true
      })
    },

    uniqueCourses () {
      return [...new Set(this.allRows.map(r => r.courseTitle))].sort()
    },

    summaryStats () {
      const rows = this.allRows
      const activeLearners = new Set(
        rows.filter(r => r.status === 'active').map(r => r.advisorId)
      ).size
      const coursesRunning = rows.filter(r => r.status === 'active').length
      const completed = rows.filter(r => r.status === 'complete').length
      const completionRate = rows.length
        ? Math.round((completed / rows.length) * 100)
        : 0
      const scores = rows.filter(r => r.avgScore !== null).map(r => r.avgScore)
      const avgQuizScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null
      return { activeLearners, coursesRunning, completionRate, avgQuizScore }
    }
  },

  mounted () {
    this.loadData()
  },

  methods: {
    async loadData () {
      if (!this.isLoading) { this.isRefreshing = true }

      // TODO: replace with real API call:
      // const res = await fetch(`/api/firm/advisors?firmId=${this.firmId}`)
      // this.advisors = await res.json()

      // Mock data — mirrors the shape the DB will return
      await new Promise(resolve => setTimeout(resolve, 600))
      this.advisors = this._mockAdvisors()

      this.isLoading = false
      this.isRefreshing = false
    },

    async generateInsights () {
      this.isGeneratingInsights = true

      // TODO: replace with real API call:
      // const res = await fetch('/api/firm/insights', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ firmId: this.firmId, summary: this.summaryStats, advisors: this.advisors })
      // })
      // const data = await res.json()
      // this.teamInsights = data.insight

      // Mock AI insight
      await new Promise(resolve => setTimeout(resolve, 1200))
      this.teamInsights = `Your team has ${this.summaryStats.activeLearners} active learners across ${this.summaryStats.coursesRunning} running courses, with an overall completion rate of ${this.summaryStats.completionRate}%. ` +
        `Quiz performance ${this.summaryStats.avgQuizScore === null ? 'has no graded activity yet' : `is ${this.summaryStats.avgQuizScore >= 70 ? 'strong' : 'developing'} at an average of ${this.summaryStats.avgQuizScore}%`}. ` +
        'Consider following up with advisors who have been inactive for more than 7 days to keep momentum going.'
      this.insightsGeneratedAt = new Date().toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
      })
      this.isGeneratingInsights = false
    },

    toggleExpand (key) {
      const next = new Set(this.expandedRows)
      next.has(key) ? next.delete(key) : next.add(key)
      this.expandedRows = next
    },

    scoreClass (score) {
      if (score === null || score === undefined) { return '' }
      if (score >= 80) { return 'score-high' }
      if (score >= 70) { return 'score-mid' }
      return 'score-low'
    },

    statusLabel (status) {
      return { active: 'Active', complete: 'Complete', paused: 'Paused' }[status] || status
    },

    _initials (name) {
      return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    },

    _formatDate (iso) {
      if (!iso) { return '—' }
      const d = new Date(iso)
      const diff = Math.floor((Date.now() - d) / 86400000)
      if (diff === 0) { return 'Today' }
      if (diff === 1) { return 'Yesterday' }
      if (diff < 7) { return `${diff} days ago` }
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    },

    // ── Mock data ────────────────────────────────────────────────────────
    // Replace loadData() API stub with real DB query to remove this entirely.

    _mockAdvisors () {
      return [
        {
          id: 'adv-1',
          name: 'Sarah Chen',
          email: 'sarah@firm.com',
          courses: [{
            id: 'c1',
            title: 'Financial Management Fundamentals',
            status: 'active',
            lastActive: new Date(Date.now() - 86400000).toISOString(),
            sessions: [
              { id: 1, title: 'The Heald Matrix', status: 'complete', score: 88 },
              { id: 2, title: 'Working Capital Cycle', status: 'complete', score: 82 },
              { id: 3, title: 'Demings Volatility', status: 'complete', score: 79 },
              { id: 4, title: 'Revenue Model', status: 'active', score: null },
              { id: 5, title: 'Forecasting', status: 'pending', score: null },
              { id: 6, title: 'Dashboard Discussions', status: 'pending', score: null }
            ]
          }]
        },
        {
          id: 'adv-2',
          name: 'James Park',
          email: 'james@firm.com',
          courses: [{
            id: 'c1',
            title: 'Financial Management Fundamentals',
            status: 'complete',
            lastActive: new Date(Date.now() - 3 * 86400000).toISOString(),
            sessions: [
              { id: 1, title: 'The Heald Matrix', status: 'complete', score: 95 },
              { id: 2, title: 'Working Capital Cycle', status: 'complete', score: 91 },
              { id: 3, title: 'Demings Volatility', status: 'complete', score: 88 },
              { id: 4, title: 'Revenue Model', status: 'complete', score: 94 },
              { id: 5, title: 'Forecasting', status: 'complete', score: 90 },
              { id: 6, title: 'Dashboard Discussions', status: 'complete', score: 87 }
            ]
          }]
        },
        {
          id: 'adv-3',
          name: 'Emma Walsh',
          email: 'emma@firm.com',
          courses: [
            {
              id: 'c2',
              title: 'Business Development Essentials',
              status: 'active',
              lastActive: new Date(Date.now() - 2 * 86400000).toISOString(),
              sessions: [
                { id: 1, title: 'Client Discovery', status: 'complete', score: 74 },
                { id: 2, title: 'Value Proposition', status: 'complete', score: 70 },
                { id: 3, title: 'Advisory Conversations', status: 'active', score: null },
                { id: 4, title: 'Pricing Strategy', status: 'pending', score: null },
                { id: 5, title: 'Client Retention', status: 'pending', score: null }
              ]
            },
            {
              id: 'c1',
              title: 'Financial Management Fundamentals',
              status: 'paused',
              lastActive: new Date(Date.now() - 12 * 86400000).toISOString(),
              sessions: [
                { id: 1, title: 'The Heald Matrix', status: 'complete', score: 68 },
                { id: 2, title: 'Working Capital Cycle', status: 'pending', score: null },
                { id: 3, title: 'Demings Volatility', status: 'pending', score: null },
                { id: 4, title: 'Revenue Model', status: 'pending', score: null },
                { id: 5, title: 'Forecasting', status: 'pending', score: null },
                { id: 6, title: 'Dashboard Discussions', status: 'pending', score: null }
              ]
            }
          ]
        },
        {
          id: 'adv-4',
          name: 'Tom Richards',
          email: 'tom@firm.com',
          courses: [{
            id: 'c1',
            title: 'Financial Management Fundamentals',
            status: 'active',
            lastActive: new Date(Date.now() - 8 * 86400000).toISOString(),
            sessions: [
              { id: 1, title: 'The Heald Matrix', status: 'complete', score: 65 },
              { id: 2, title: 'Working Capital Cycle', status: 'active', score: null },
              { id: 3, title: 'Demings Volatility', status: 'pending', score: null },
              { id: 4, title: 'Revenue Model', status: 'pending', score: null },
              { id: 5, title: 'Forecasting', status: 'pending', score: null },
              { id: 6, title: 'Dashboard Discussions', status: 'pending', score: null }
            ]
          }]
        },
        {
          id: 'adv-5',
          name: 'Lisa Nguyen',
          email: 'lisa@firm.com',
          courses: [{
            id: 'c2',
            title: 'Business Development Essentials',
            status: 'complete',
            lastActive: new Date(Date.now() - 86400000).toISOString(),
            sessions: [
              { id: 1, title: 'Client Discovery', status: 'complete', score: 92 },
              { id: 2, title: 'Value Proposition', status: 'complete', score: 88 },
              { id: 3, title: 'Advisory Conversations', status: 'complete', score: 85 },
              { id: 4, title: 'Pricing Strategy', status: 'complete', score: 90 },
              { id: 5, title: 'Client Retention', status: 'complete', score: 84 }
            ]
          }]
        }
      ]
    }
  }
}
</script>

<style scoped>
.firm-dashboard {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  gap: 24px;
  background: #f8fafc;
}

/* ── Loading ──────────────────────────────────────────── */
.dashboard-loading {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
}
.loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #00b1e0;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 14px; color: #6b7280; }

/* ── Header ───────────────────────────────────────────── */
.dashboard-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  flex-shrink: 0;
}
.dashboard-title { font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 4px; }
.dashboard-firm { font-size: 13px; color: #6b7280; margin: 0; }
.dashboard-header-right { display: flex; align-items: center; gap: 14px; }
.dashboard-date { font-size: 12px; color: #9ca3af; }
.btn-refresh {
  background: none; color: #6b7280;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  padding: 7px 14px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-refresh:hover:not(:disabled) { color: #00b1e0; border-color: #00b1e0; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Summary cards ────────────────────────────────────── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex-shrink: 0;
}
.summary-card {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 6px;
  transition: border-color 0.15s;
}
.summary-card.card-good { border-color: #99f6e4; background: #f0fdf4; }
.summary-card.card-mid { border-color: #fde68a; background: #fffbeb; }
.card-number { font-size: 32px; font-weight: 800; color: #111827; line-height: 1; }
.card-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }

/* ── Team Insights ────────────────────────────────────── */
.insights-panel {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px 24px;
  flex-shrink: 0;
}
.insights-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.insights-title { font-size: 14px; font-weight: 700; color: #111827; }
.btn-generate {
  background: #1e40af; color: #fff;
  border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  display: flex; align-items: center; gap: 6px;
}
.btn-generate:hover:not(:disabled) { background: #1d3a98; }
.btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }
.insights-spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
.insights-text { font-size: 14px; color: #374151; line-height: 1.7; margin: 0 0 8px; }
.insights-meta { font-size: 11px; color: #9ca3af; margin: 0; }
.insights-empty { font-size: 13px; color: #9ca3af; margin: 0; }

/* ── Filter bar ───────────────────────────────────────── */
.filter-bar {
  display: flex; gap: 10px; align-items: center;
  flex-shrink: 0;
}
.filter-search {
  flex: 1; max-width: 280px;
  border: 1.5px solid #d1d5db; border-radius: 8px;
  padding: 9px 14px; font-size: 13px; font-family: inherit;
  outline: none; transition: border-color 0.15s;
}
.filter-search:focus { border-color: #00b1e0; }
.filter-select {
  border: 1.5px solid #d1d5db; border-radius: 8px;
  padding: 9px 12px; font-size: 13px; font-family: inherit;
  background: #fff; color: #374151; outline: none; cursor: pointer;
  transition: border-color 0.15s;
}
.filter-select:focus { border-color: #00b1e0; }
.filter-count { font-size: 12px; color: #9ca3af; margin-left: 4px; }

/* ── Table ────────────────────────────────────────────── */
.advisor-table {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.table-head {
  display: grid;
  grid-template-columns: 220px 1fr 160px 100px 110px 110px 32px;
  background: #f8fafc;
  border-bottom: 1.5px solid #e5e7eb;
  padding: 0 20px;
}
.th {
  padding: 11px 12px;
  font-size: 11px; font-weight: 700;
  color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 220px 1fr 160px 100px 110px 110px 32px;
  padding: 0 20px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer; transition: background 0.1s;
  align-items: center;
}
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: #f8fafc; }
.table-row.row-expanded { background: #f0f9ff; border-bottom-color: #bae6fd; }

.td { padding: 14px 12px; font-size: 13px; color: #374151; }

.td-advisor { display: flex; align-items: center; gap: 10px; }
.advisor-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.advisor-info { display: flex; flex-direction: column; gap: 2px; }
.advisor-name { font-size: 13px; font-weight: 600; color: #111827; }
.advisor-email { font-size: 11px; color: #9ca3af; }

.td-course { font-size: 13px; color: #374151; }

.progress-track-mini {
  height: 5px; background: #e5e7eb; border-radius: 3px;
  overflow: hidden; margin-bottom: 5px;
}
.progress-fill-mini {
  height: 5px; background: linear-gradient(90deg, #00b1e0, #0098c1);
  border-radius: 3px; transition: width 0.4s ease;
}
.progress-label { font-size: 11px; color: #6b7280; }

.score-high { color: #0d9488; font-weight: 700; }
.score-mid  { color: #d97706; font-weight: 700; }
.score-low  { color: #dc2626; font-weight: 700; }

.td-last { font-size: 12px; color: #6b7280; }

.status-badge {
  font-size: 11px; font-weight: 600;
  border-radius: 20px; padding: 4px 12px; white-space: nowrap;
}
.status-active   { background: #e6f8fd; color: #00b1e0; }
.status-complete { background: #dcfce7; color: #16a34a; }
.status-paused   { background: #f3f4f6; color: #9ca3af; }

.td-expand { display: flex; align-items: center; justify-content: center; }
.expand-chevron {
  font-size: 18px; color: #9ca3af; display: inline-block;
  transition: transform 0.2s; line-height: 1;
}
.chevron-open { transform: rotate(90deg); }

/* ── Session breakdown ────────────────────────────────── */
.session-breakdown {
  background: #f0f9ff;
  border-bottom: 1.5px solid #bae6fd;
  padding: 0 20px 16px;
}
.breakdown-inner { padding-left: 46px; }
.breakdown-heading {
  font-size: 11px; font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 12px 0 8px;
}
.breakdown-row {
  display: grid;
  grid-template-columns: 24px 1fr 120px 80px 60px;
  gap: 12px; align-items: center;
  padding: 6px 0;
  border-top: 1px solid #e0f2fe;
}
.br-num { font-size: 11px; font-weight: 700; color: #6b7280; }
.br-title { font-size: 13px; color: #374151; }
.br-progress-track {
  height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;
}
.br-progress-fill { height: 4px; border-radius: 2px; transition: width 0.3s; }
.br-fill-complete { background: #0d9488; }
.br-fill-active   { background: #00b1e0; }
.br-fill-pending  { background: #e5e7eb; }
.br-status { font-size: 11px; font-weight: 600; }
.br-complete { color: #0d9488; }
.br-active   { color: #00b1e0; }
.br-pending  { color: #9ca3af; }
.br-score { font-size: 12px; font-weight: 700; text-align: right; }

/* ── Empty state ──────────────────────────────────────── */
.table-empty {
  background: #fff; border: 1.5px solid #e5e7eb;
  border-radius: 12px; padding: 40px;
  text-align: center; color: #9ca3af; font-size: 14px;
}
</style>

<template lang="pug">
.course-builder

  //- ── AI processing bar — visible whenever any AI call is in-flight ────────
  .ai-loading-bar(v-if="isDesignStreaming || isSessionStreaming || isGeneratingQuiz")

  //- ── PHASE: Design ───────────────────────────────────────────────────────
  template(v-if="phase === 'design'")
    .course-messages(ref="designMessages")
      .course-msg(
        v-for="(msg, i) in designMessages"
        :key="i"
        :class="msg.role === 'user' ? 'msg-user' : 'msg-va'"
      )
        .msg-avatar(v-if="msg.role === 'assistant'") VA
        .msg-bubble
          div(v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" class="prose")
          p(v-else) {{ msg.content }}

      //- Streaming indicator
      .course-msg.msg-va(v-if="isDesignStreaming")
        .msg-avatar VA
        .msg-bubble
          .typing-indicator
            span
            span
            span
            span.thinking-label VA is thinking...

      //- Course outline confirmation card
      .outline-card(v-if="pendingOutline && !isDesignStreaming")
        .outline-card-header
          h3.outline-title {{ pendingOutline.title }}
          .outline-meta
            span.outline-tag {{ pendingOutline.totalSessions }} sessions
            span.outline-tag {{ pendingOutline.intensity === 'progressive' ? 'Progressive difficulty' : 'Consistent depth' }}
        .outline-sessions
          .outline-session(v-for="s in pendingOutline.sessions" :key="s.id")
            .session-num {{ s.id }}
            .session-info
              strong.session-title {{ s.title }}
              p.session-focus {{ s.focus }}
              .session-resources(v-if="s.resources && s.resources.length")
                span.resource-tag(v-for="r in s.resources" :key="r") {{ r }}
        .outline-visibility
          p.visibility-label Who can access this course?
          .visibility-opts
            button.vis-opt(:class="{ 'vis-active': courseVisibility === 'private' }" @click="courseVisibility = 'private'")
              span.vis-icon 🔒
              span Private — just me
            button.vis-opt(:class="{ 'vis-active': courseVisibility === 'firm' }" @click="courseVisibility = 'firm'")
              span.vis-icon 🏢
              span Firm-wide — all advisors
        .outline-actions
          button.btn-start-course(@click="confirmOutline") Start this course →
          button.btn-request-changes(@click="requestOutlineChanges") Request changes

    .input-area
      .voice-bar(v-if="speechSupported")
        .voice-state.voice-idle(v-if="!isListening && !designInput.trim()")
          button.voice-btn.voice-btn-idle(@click="toggleListening" :disabled="isDesignStreaming")
            svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
              path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
            | Tap to Speak
        .voice-state.voice-recording(v-else-if="isListening")
          span.recording-dot
          span.recording-label Recording — speak now
          button.voice-btn.voice-btn-stop(@click="toggleListening")
            svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
              rect(x="6" y="6" width="12" height="12" rx="2")
            | Stop Recording
        .voice-state.voice-ready(v-else-if="designInput.trim()")
          svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
            path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
          span.ready-label Captured — review then Save
          button.voice-btn.voice-btn-redo(@click="toggleListening")
            svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
              path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
            | Record again
      .input-inner
        textarea.message-input(
          v-model="designInput"
          @keydown.enter.exact.prevent="sendDesignMessage"
          :placeholder="isListening ? '🎤 Listening...' : (pendingOutline ? 'Request any changes, or click Start above...' : 'Type your answer...')"
          rows="3"
          :disabled="isDesignStreaming"
          :class="{ 'input-listening': isListening, 'input-ready': !isListening && designInput.trim() }"
        )
        button.send-btn(
          @click="sendDesignMessage"
          :disabled="!designInput.trim() || isDesignStreaming"
        )
          span(v-if="isDesignStreaming") Thinking...
          span(v-else) Save & Continue
      p.input-hint(v-if="!speechSupported") Press Enter to send · Shift+Enter for new line
      p.design-reset-row
        button.btn-start-fresh(@click="confirmDeleteCourse") ✕ Start fresh

  //- ── PHASE: Session ──────────────────────────────────────────────────────
  template(v-else-if="phase === 'session'")
    .session-top-bar
      .session-progress-track
        .session-progress-fill(:style="{ width: progressPercent + '%' }")
      .session-progress-label
        span {{ completedSessionCount }} of {{ activeCourse.outline.sessions.length }} sessions complete
        button.btn-delete-course(@click="confirmDeleteCourse") ✕ Delete course

    .session-header
      .session-header-info
        span.session-badge Session {{ activeSessionIndex + 1 }}
        h3.session-title-heading {{ currentSession.title }}
        p.session-focus-text {{ currentSession.focus }}
      .session-quiz-actions
        button.btn-view-overview(@click="viewCourseOverview") ≡ Overview
        button.btn-end-session(
          @click="endSessionAndQuiz"
          :disabled="isSessionStreaming || sessionMessages.length < 2 || isGeneratingQuiz"
          :title="sessionMessages.length < 2 ? 'Have the session conversation first' : 'End session and take the quiz'"
        )
          span(v-if="isGeneratingQuiz") Generating quiz...
          span(v-else) ✓ End session & take quiz
        button.btn-skip-quiz(v-if="quizError" @click="skipQuizAndContinue") Skip quiz & continue →
      p.quiz-gen-error(v-if="quizError") {{ quizError }}

    .course-messages(ref="sessionMessages")
      .course-msg(
        v-for="(msg, i) in sessionMessages"
        :key="i"
        :class="msg.role === 'user' ? 'msg-user' : 'msg-va'"
      )
        .msg-avatar(v-if="msg.role === 'assistant'") VA
        .msg-bubble
          div(v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" class="prose")
          p(v-else) {{ msg.content }}

      .course-msg.msg-va(v-if="isSessionStreaming")
        .msg-avatar VA
        .msg-bubble
          div(v-if="sessionStreamingText" v-html="renderMarkdown(sessionStreamingText)" class="prose")
          .typing-indicator(v-else)
            span
            span
            span
            span.thinking-label VA is thinking...

    .input-area
      .voice-bar(v-if="speechSupported")
        .voice-state.voice-idle(v-if="!isListening && !sessionInput.trim()")
          button.voice-btn.voice-btn-idle(@click="toggleListening" :disabled="isSessionStreaming || isGeneratingQuiz")
            svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
              path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
            | Tap to Speak
        .voice-state.voice-recording(v-else-if="isListening")
          span.recording-dot
          span.recording-label Recording — speak now
          button.voice-btn.voice-btn-stop(@click="toggleListening")
            svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
              rect(x="6" y="6" width="12" height="12" rx="2")
            | Stop Recording
        .voice-state.voice-ready(v-else-if="sessionInput.trim()")
          svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
            path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
          span.ready-label Captured — review then Save
          button.voice-btn.voice-btn-redo(@click="toggleListening")
            svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
              path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
            | Record again
      .input-inner
        textarea.message-input(
          v-model="sessionInput"
          @keydown.enter.exact.prevent="sendSessionMessage"
          :placeholder="isListening ? '🎤 Listening...' : 'Ask questions, share your thoughts...'"
          rows="3"
          :disabled="isSessionStreaming || isGeneratingQuiz"
          :class="{ 'input-listening': isListening, 'input-ready': !isListening && sessionInput.trim() }"
        )
        button.send-btn(
          @click="sendSessionMessage"
          :disabled="!sessionInput.trim() || isSessionStreaming || isGeneratingQuiz"
        )
          span(v-if="isSessionStreaming") ...
          span(v-else) Save & Continue
      p.input-hint(v-if="!speechSupported") Press Enter to send · Shift+Enter for new line

  //- ── PHASE: Overview ─────────────────────────────────────────────────────
  template(v-else-if="phase === 'overview'")
    .course-overview
      .overview-header
        button.btn-back-to-session(@click="resumeSession") ← Back to session
        h2.overview-course-title {{ activeCourse.outline.title }}
        p.overview-course-topic {{ activeCourse.outline.topic }}
        .overview-progress-row
          .overview-progress-track
            .overview-progress-fill(:style="{ width: progressPercent + '%' }")
          span.overview-progress-text {{ completedSessionCount }} of {{ activeCourse.outline.sessions.length }} sessions complete
      .overview-sessions
        .overview-session-row(
          v-for="(s, i) in activeCourse.outline.sessions"
          :key="i"
          :class="{ 'ov-active': i === activeSessionIndex && activeCourse.progress[i].status !== 'complete', 'ov-done': activeCourse.progress[i].status === 'complete' }"
        )
          .ov-session-num {{ i + 1 }}
          .ov-session-info
            strong.ov-session-title {{ s.title }}
            p.ov-session-focus {{ s.focus }}
          .ov-session-status
            span.ov-badge.ov-badge-done(v-if="activeCourse.progress[i].status === 'complete'")
              | ✓{{ activeCourse.progress[i].quizScore !== null ? ' ' + activeCourse.progress[i].quizScore + '%' : '' }}
            span.ov-badge.ov-badge-active(v-else-if="i === activeSessionIndex") Active
            span.ov-badge.ov-badge-pending(v-else) Upcoming
      .overview-footer
        button.btn-resume-session(@click="resumeSession") → Resume Session {{ activeSessionIndex + 1 }}
        button.btn-delete-course(@click="confirmDeleteCourse") ✕ Delete course

  //- ── PHASE: Quiz ─────────────────────────────────────────────────────────
  template(v-else-if="phase === 'quiz'")
    .quiz-container
      .quiz-header
        h3.quiz-heading Session {{ activeSessionIndex + 1 }} Quiz
        p.quiz-sub Test your understanding before moving on
        .quiz-progress-row
          span Question {{ Math.min(quizCurrentIndex + 1, quizQuestions.length) }} of {{ quizQuestions.length }}
          .quiz-dots
            span.quiz-dot(
              v-for="(q, i) in quizQuestions"
              :key="i"
              :class="{ 'dot-done': i < quizResults.length, 'dot-active': i === quizCurrentIndex && i >= quizResults.length }"
            )

      //- Active question
      .quiz-body(v-if="!quizComplete && currentQuestion")
        .quiz-question-card
          p.quiz-q-text {{ currentQuestion.question }}

        .quiz-answer-area(v-if="!currentResult")
          textarea.quiz-textarea(
            v-model="quizAnswer"
            placeholder="Type your answer here..."
            rows="5"
            :disabled="isGrading"
          )
          button.btn-submit-answer(
            @click="submitAnswer"
            :disabled="!quizAnswer.trim() || isGrading"
          )
            span(v-if="isGrading") Evaluating...
            span(v-else) Submit answer

        .quiz-result-card(v-if="currentResult")
          .result-badge(:class="currentResult.passed ? 'badge-pass' : 'badge-fail'")
            | {{ currentResult.passed ? '✓ Good understanding' : '✗ Review this one' }}
          p.result-score Score: {{ currentResult.score }}%
          p.result-feedback {{ currentResult.feedback }}
          button.btn-next-q(@click="nextQuestion")
            | {{ quizCurrentIndex < quizQuestions.length - 1 ? 'Next question →' : 'See results' }}

      //- Quiz complete — results summary
      .quiz-results(v-if="quizComplete")
        .results-score-circle(:class="quizPassed ? 'score-pass' : 'score-needs-work'")
          span.score-number {{ overallScore }}%
          span.score-label {{ quizPassed ? 'Passed' : 'Keep going' }}
        p.results-verdict(v-if="quizPassed") Great work — you've completed this session.
        p.results-verdict(v-else) No problem — you can revisit the session material any time.
        .results-breakdown
          .result-row(v-for="(r, i) in quizResults" :key="i")
            span.q-num Q{{ i + 1 }}
            span.q-result-score(:class="r.passed ? 'score-pass-text' : 'score-fail-text'") {{ r.score }}%
            p.q-feedback-brief {{ r.feedback.slice(0, 80) }}{{ r.feedback.length > 80 ? '...' : '' }}
        button.btn-continue-course(@click="completeSession")
          | {{ hasMoreSessions ? 'Continue to session ' + (activeSessionIndex + 2) + ' →' : 'Complete course' }}

  //- ── PHASE: Complete ─────────────────────────────────────────────────────
  template(v-else-if="phase === 'complete'")
    .completion-screen
      .completion-check ✓
      h2.completion-heading Course complete!
      p.completion-course-name {{ activeCourse.outline.title }}
      .completion-stats
        .comp-stat
          span.stat-number {{ completedSessionCount }}
          span.stat-label Sessions completed
        .comp-stat
          span.stat-number {{ averageScore }}%
          span.stat-label Average quiz score
      .completion-sessions
        .comp-session-row(v-for="(s, i) in activeCourse.outline.sessions" :key="i")
          .comp-session-num {{ i + 1 }}
          .comp-session-info
            span.comp-session-title {{ s.title }}
          .comp-session-score(v-if="activeCourse.progress && activeCourse.progress[i] && activeCourse.progress[i].quizScore")
            span(:class="activeCourse.progress[i].quizScore >= 70 ? 'score-pass-text' : 'score-fail-text'")
              | {{ activeCourse.progress[i].quizScore }}%
      button.btn-return-menu(@click="$emit('exit')") ← Return to main menu
</template>

<script>
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'

const _md = new MarkdownIt({ html: false, linkify: true, typographer: true })

export default {
  name: 'CourseBuilder',

  props: {
    advisorId: { type: String, default: 'local-advisor' },
    advisorProfile: { type: Object, default: null },
    orgTemplateIds: { type: Array, default: null }
  },

  data () {
    return {
      phase: 'design',

      // Voice input
      isListening: false,
      speechSupported: false,
      recognition: null,

      // Design phase
      designMessages: [],
      designInput: '',
      isDesignStreaming: false,
      designStreamingText: '',
      courseState: {},
      pendingOutline: null,
      courseVisibility: 'private',
      activeCourse: null,

      // Session phase
      activeSessionIndex: 0,
      sessionMessages: [],
      sessionInput: '',
      isSessionStreaming: false,
      sessionStreamingText: '',
      isGeneratingQuiz: false,
      quizError: '',

      // Quiz phase
      quizQuestions: [],
      quizCurrentIndex: 0,
      quizAnswer: '',
      quizResults: [],
      currentResult: null,
      isGrading: false
    }
  },

  computed: {
    currentSession () {
      if (!this.activeCourse) { return null }
      return this.activeCourse.outline.sessions[this.activeSessionIndex] || null
    },

    currentQuestion () {
      return this.quizQuestions[this.quizCurrentIndex] || null
    },

    quizComplete () {
      return this.quizQuestions.length > 0 && this.quizResults.length === this.quizQuestions.length
    },

    quizPassed () {
      return this.overallScore >= 70
    },

    overallScore () {
      if (!this.quizResults.length) { return 0 }
      return Math.round(this.quizResults.reduce((sum, r) => sum + (r.score || 0), 0) / this.quizResults.length)
    },

    progressPercent () {
      if (!this.activeCourse) { return 0 }
      const total = this.activeCourse.outline.sessions.length
      if (!total) { return 0 }
      const done = (this.activeCourse.progress || []).filter(p => p.status === 'complete').length
      return Math.round((done / total) * 100)
    },

    completedSessionCount () {
      if (!this.activeCourse) { return 0 }
      return (this.activeCourse.progress || []).filter(p => p.status === 'complete').length
    },

    hasMoreSessions () {
      if (!this.activeCourse) { return false }
      return this.activeSessionIndex < this.activeCourse.outline.sessions.length - 1
    },

    averageScore () {
      if (!this.activeCourse) { return 0 }
      const scores = (this.activeCourse.progress || [])
        .filter(p => p.quizScore !== null && p.quizScore !== undefined)
        .map(p => p.quizScore)
      if (!scores.length) { return 0 }
      return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
    }
  },

  mounted () {
    this._loadOrStartCourse()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      this.speechSupported = true
      this.recognition = new SpeechRecognition()
      this._recognitionRunning = false
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'
      this.recognition.onresult = (e) => {
        let transcript = ''
        for (let i = 0; i < e.results.length; i++) { transcript += e.results[i][0].transcript }
        if (this.phase === 'session') { this.sessionInput = transcript } else { this.designInput = transcript }
      }
      this.recognition.onend = () => {
        this._recognitionRunning = false
        if (this.isListening) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) {}
        }
      }
      this.recognition.onerror = (e) => {
        if (e.error !== 'no-speech') { this.isListening = false }
      }
    }
  },

  methods: {
    toggleListening () {
      if (!this.recognition) { return }
      if (this.isListening) {
        this.recognition.stop()
        this.isListening = false
      } else {
        if (this.phase === 'session') { this.sessionInput = '' } else { this.designInput = '' }
        this.isListening = true
        if (!this._recognitionRunning) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) { this._recognitionRunning = false }
        }
      }
    },

    renderMarkdown (text) {
      const raw = _md.render(String(text || ''))
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    },

    // ── Persistence ──────────────────────────────────────────────────────

    _loadOrStartCourse () {
      const stored = localStorage.getItem('va_courses')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          const active = (data.courses || []).find(
            c => c.advisorId === this.advisorId && c.status === 'active'
          )
          if (active) {
            this.activeCourse = active
            this.activeSessionIndex = this._findActiveSessionIndex(active)
            this.phase = 'session'
            this._startSession(false)
            return
          }
        } catch (e) {
          console.warn('[course] Failed to load saved course:', e.message)
        }
      }
      // No active course — start design conversation
      this.designMessages = [{
        role: 'assistant',
        content: this.$t ? this.$t('opening.course') : "Great — let's design your learning program together.\n\nWhat are the skills or advisory concepts you'd like to develop?"
      }]
    },

    _findActiveSessionIndex (course) {
      const progress = course.progress || []
      const next = progress.findIndex(p => p.status !== 'complete')
      return next >= 0 ? next : progress.length
    },

    _saveCourse (course) {
      let data = { courses: [] }
      try {
        const stored = localStorage.getItem('va_courses')
        if (stored) { data = JSON.parse(stored) }
      } catch (e) { /* start fresh */ }
      const idx = (data.courses || []).findIndex(c => c.id === course.id)
      if (idx >= 0) {
        data.courses[idx] = course
      } else {
        data.courses = [...(data.courses || []), course]
      }
      localStorage.setItem('va_courses', JSON.stringify(data))
    },

    _generateId () {
      return 'course-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    },

    // ── Design phase ─────────────────────────────────────────────────────

    async sendDesignMessage () {
      const query = this.designInput.trim()
      if (!query || this.isDesignStreaming) { return }
      if (this.isListening) { this.recognition.stop(); this.isListening = false }

      this.designMessages.push({ role: 'user', content: query })
      this.designInput = ''
      this.isDesignStreaming = true
      this.designStreamingText = ''
      this.pendingOutline = null

      await this.$nextTick()
      this._scrollDesign()

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'design',
            query,
            conversationHistory: this.designMessages.slice(0, -1).map(m => ({
              role: m.role,
              content: m.content
            })),
            advisorProfile: this.advisorProfile,
            orgTemplateIds: this.orgTemplateIds,
            courseState: this.courseState
          })
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { break }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue }
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'state') {
                this.courseState = data.state || {}
                if (data.state && data.state.pendingOutline) {
                  this.pendingOutline = data.state.pendingOutline
                }
              } else if (data.type === 'delta') {
                this.designStreamingText += data.text
                await this.$nextTick()
                this._scrollDesign()
              } else if (data.type === 'done') {
                let content = this.designStreamingText
                content = content.replace(/\[COURSE_OUTLINE\][\s\S]*?\[\/COURSE_OUTLINE\]/g, '').trim()
                this.designMessages.push({ role: 'assistant', content })
                this.designStreamingText = ''
                this.isDesignStreaming = false
              }
            } catch (e) { /* ignore malformed SSE line */ }
          }
        }

        if (this.isDesignStreaming) {
          let content = this.designStreamingText
          content = content.replace(/\[COURSE_OUTLINE\][\s\S]*?\[\/COURSE_OUTLINE\]/g, '').trim()
          this.designMessages.push({ role: 'assistant', content })
          this.designStreamingText = ''
          this.isDesignStreaming = false
        }
      } catch (e) {
        console.error('[course:design]', e.message)
        this.designMessages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
        this.isDesignStreaming = false
        this.designStreamingText = ''
      }

      await this.$nextTick()
      this._scrollDesign()
    },

    confirmOutline () {
      if (!this.pendingOutline) { return }
      const course = {
        id: this._generateId(),
        advisorId: this.advisorId,
        createdAt: new Date().toISOString(),
        status: 'active',
        visibility: this.courseVisibility,
        outline: this.pendingOutline,
        progress: this.pendingOutline.sessions.map(() => ({
          status: 'pending',
          quizScore: null,
          completedAt: null
        })),
        designHistory: this.designMessages.map(m => ({ role: m.role, content: m.content }))
      }
      this.activeCourse = course
      this._saveCourse(course)
      this.activeSessionIndex = 0
      this.phase = 'session'
      this._startSession(true)
    },

    requestOutlineChanges () {
      this.pendingOutline = null
      this.$nextTick(() => {
        const ta = this.$el.querySelector('.message-input')
        if (ta) { ta.focus() }
      })
    },

    // ── Session phase ────────────────────────────────────────────────────

    _startSession (isNew = false) {
      const session = this.currentSession
      if (!session) { return }
      this.sessionMessages = []
      this.sessionInput = ''
      this.sessionStreamingText = ''
      this.isSessionStreaming = false
      this.quizQuestions = []
      this.quizCurrentIndex = 0
      this.quizResults = []
      this.currentResult = null
      this.quizAnswer = ''
      if (isNew) {
        this._autoOpenSession()
      } else {
        const resources = (session.resources || []).join(' and ') || 'the session material'
        this.sessionMessages = [{
          role: 'assistant',
          content: `**Session ${session.id}: ${session.title}**\n\n${session.focus}\n\nYour resource for this session is **${resources}** in your Advisor-e library. Work through it and come back when you're ready — we'll discuss what you found.`
        }]
      }
    },

    async _autoOpenSession () {
      const session = this.currentSession
      if (!session) { return }
      this.isSessionStreaming = true
      this.sessionStreamingText = ''

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session',
            query: 'Begin session.',
            sessionHistory: [],
            sessionContext: session,
            advisorProfile: this.advisorProfile,
            orgTemplateIds: this.orgTemplateIds
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { break }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue }
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'delta') {
                this.sessionStreamingText += data.text
                await this.$nextTick()
                this._scrollSession()
              } else if (data.type === 'done') {
                this.sessionMessages.push({ role: 'assistant', content: this.sessionStreamingText })
                this.sessionStreamingText = ''
                this.isSessionStreaming = false
              }
            } catch (e) { /* ignore */ }
          }
        }

        if (this.isSessionStreaming) {
          this.sessionMessages.push({ role: 'assistant', content: this.sessionStreamingText })
          this.sessionStreamingText = ''
          this.isSessionStreaming = false
        }
      } catch (e) {
        console.error('[course:session:open]', e.message)
        const resources = (session.resources || []).join(' and ') || 'the session material'
        this.sessionMessages = [{
          role: 'assistant',
          content: `**Session ${session.id}: ${session.title}**\n\n${session.focus}\n\nHead to **${resources}** in your Advisor-e library. Work through it and come back when you're ready — we'll pick it apart together.`
        }]
        this.isSessionStreaming = false
        this.sessionStreamingText = ''
      }

      await this.$nextTick()
      this._scrollSession()
    },

    async sendSessionMessage () {
      const query = this.sessionInput.trim()
      if (!query || this.isSessionStreaming || this.isGeneratingQuiz) { return }
      if (this.isListening) { this.recognition.stop(); this.isListening = false }

      this.sessionMessages.push({ role: 'user', content: query })
      this.sessionInput = ''
      this.isSessionStreaming = true
      this.sessionStreamingText = ''

      await this.$nextTick()
      this._scrollSession()

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session',
            query,
            sessionHistory: this.sessionMessages.slice(0, -1).map(m => ({
              role: m.role,
              content: m.content
            })),
            sessionContext: this.currentSession,
            advisorProfile: this.advisorProfile,
            orgTemplateIds: this.orgTemplateIds
          })
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { break }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue }
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'delta') {
                this.sessionStreamingText += data.text
                await this.$nextTick()
                this._scrollSession()
              } else if (data.type === 'error') {
                this.sessionStreamingText = data.message || 'The response timed out. Please try again.'
              } else if (data.type === 'done') {
                const content = this.sessionStreamingText || 'The response timed out. Please try again.'
                this.sessionMessages.push({ role: 'assistant', content })
                this.sessionStreamingText = ''
                this.isSessionStreaming = false
              }
            } catch (e) { /* ignore */ }
          }
        }

        if (this.isSessionStreaming) {
          const content = this.sessionStreamingText || 'The response timed out. Please try again.'
          this.sessionMessages.push({ role: 'assistant', content })
          this.sessionStreamingText = ''
          this.isSessionStreaming = false
        }
      } catch (e) {
        console.error('[course:session]', e.message)
        this.sessionMessages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
        this.isSessionStreaming = false
        this.sessionStreamingText = ''
      }

      await this.$nextTick()
      this._scrollSession()
    },

    async endSessionAndQuiz () {
      if (this.isGeneratingQuiz || this.isSessionStreaming) { return }
      this.isGeneratingQuiz = true
      this.quizError = ''

      // Reset quiz state
      this.quizQuestions = []
      this.quizCurrentIndex = 0
      this.quizResults = []
      this.currentResult = null
      this.quizAnswer = ''

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'quiz-generate',
            sessionContext: this.currentSession,
            sessionHistory: this.sessionMessages.map(m => ({ role: m.role, content: m.content }))
          })
        })
        const data = await response.json()
        if (data.success && data.questions && data.questions.length > 0) {
          this.quizQuestions = data.questions
          this.phase = 'quiz'
        } else {
          console.warn('[course] Quiz generation returned no questions:', data)
          this.quizError = 'Couldn\'t generate quiz questions — please try again, or skip to continue.'
        }
      } catch (e) {
        console.error('[course] Quiz generation error:', e.message)
        this.quizError = 'Something went wrong generating the quiz — please try again, or skip to continue.'
      }

      this.isGeneratingQuiz = false
    },

    viewCourseOverview () {
      this.phase = 'overview'
    },

    resumeSession () {
      this.phase = 'session'
    },

    skipQuizAndContinue () {
      this.quizError = ''
      this._markSessionComplete(null)
    },

    confirmDeleteCourse () {
      if (!confirm('Delete this course and start again? Your progress will be lost.')) { return }
      this._deleteCourse()
    },

    _deleteCourse () {
      if (this.activeCourse) {
        try {
          const stored = localStorage.getItem('va_courses')
          if (stored) {
            const data = JSON.parse(stored)
            data.courses = (data.courses || []).filter(c => c.id !== this.activeCourse.id)
            localStorage.setItem('va_courses', JSON.stringify(data))
          }
        } catch (e) { /* ignore */ }
      }
      this.activeCourse = null
      this.activeSessionIndex = 0
      this.phase = 'design'
      this.courseVisibility = 'private'
      this.pendingOutline = null
      this.sessionMessages = []
      this.quizQuestions = []
      this.quizResults = []
      this.quizError = ''
      this.designMessages = [{
        role: 'assistant',
        content: this.$t ? this.$t('opening.course') : "Great — let's design your learning program together.\n\nWhat are the skills or advisory concepts you'd like to develop?"
      }]
    },

    // ── Quiz phase ───────────────────────────────────────────────────────

    async submitAnswer () {
      const answer = this.quizAnswer.trim()
      if (!answer || this.isGrading || !this.currentQuestion) { return }
      this.isGrading = true

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'quiz-grade',
            question: this.currentQuestion,
            answer,
            sessionContext: this.currentSession
          })
        })
        const data = await response.json()
        if (data.success) {
          this.currentResult = { passed: data.passed, score: data.score, feedback: data.feedback }
        } else {
          this.currentResult = { passed: true, score: 75, feedback: 'Could not evaluate — moving on.' }
        }
      } catch (e) {
        this.currentResult = { passed: true, score: 75, feedback: 'Could not evaluate — moving on.' }
      }

      this.isGrading = false
    },

    nextQuestion () {
      if (!this.currentResult) { return }
      this.quizResults.push({ ...this.currentResult })
      this.currentResult = null
      this.quizAnswer = ''
      if (this.quizCurrentIndex < this.quizQuestions.length - 1) {
        this.quizCurrentIndex++
      }
      // quizComplete computed will fire when quizResults.length === quizQuestions.length
    },

    completeSession () {
      this._markSessionComplete(this.overallScore)
    },

    _markSessionComplete (score) {
      if (!this.activeCourse) {
        console.error('[course] _markSessionComplete called but activeCourse is null — cannot advance')
        this.quizError = 'Session state was lost. Please refresh and try again.'
        return
      }
      const progress = (this.activeCourse.progress || []).map((p, i) => {
        if (i === this.activeSessionIndex) {
          return { status: 'complete', quizScore: score, completedAt: new Date().toISOString() }
        }
        return p
      })
      this.activeCourse = { ...this.activeCourse, progress }

      // Notify platform integration stub
      this._recordProgress(score)

      if (this.hasMoreSessions) {
        this._saveCourse(this.activeCourse)
        this.activeSessionIndex++
        this.phase = 'session'
        this._startSession(true)
        // Reset quiz state for next session
        this.quizQuestions = []
        this.quizResults = []
        this.quizCurrentIndex = 0
        this.currentResult = null
        this.quizAnswer = ''
      } else {
        this.activeCourse = { ...this.activeCourse, status: 'complete' }
        this._saveCourse(this.activeCourse)
        this.phase = 'complete'
      }
    },

    async _recordProgress (score) {
      // Calls the progress endpoint which triggers CourseReminderService.markComplete
      try {
        await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'progress',
            advisorId: this.advisorId,
            courseId: this.activeCourse.id,
            sessionId: this.activeSessionIndex + 1,
            score
          })
        })
      } catch (e) {
        console.warn('[course] Progress record failed (non-critical):', e.message)
      }
    },

    // ── Scroll helpers ───────────────────────────────────────────────────

    _scrollDesign () {
      const el = this.$refs.designMessages
      if (el) { el.scrollTop = el.scrollHeight }
    },

    _scrollSession () {
      const el = this.$refs.sessionMessages
      if (el) { el.scrollTop = el.scrollHeight }
    }
  }
}
</script>

<style scoped>
.course-builder {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.section-banner {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 36px;
  border-left: 4px solid #00b1e0;
  background: #f8fafc;
  flex-shrink: 0;
}
.section-banner-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

/* ── Messages ─────────────────────────────────────────── */
.course-messages { flex: 1; overflow-y: auto; padding: 24px; }
.course-messages > * + * { margin-top: 20px; }

.course-msg { display: flex; gap: 12px; align-items: flex-start; }
.msg-va { flex-direction: row; }
.msg-user { flex-direction: row-reverse; }

.msg-avatar {
  background: #1e40af;
  color: white;
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11px;
  flex-shrink: 0;
}

.msg-bubble { max-width: 75%; padding: 14px 18px; border-radius: 12px; font-size: 14px; line-height: 1.6; }
.msg-va .msg-bubble { background: #f9fafb; border: 1px solid #e5e7eb; color: #111827; border-radius: 4px 12px 12px 12px; }
.msg-user .msg-bubble { background: #1e40af; color: white; border-radius: 12px 4px 12px 12px; }

/* ── Typing indicator ─────────────────────────────────── */
.typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.typing-indicator span { width: 7px; height: 7px; background: #9ca3af; border-radius: 50%; animation: bounce 1.2s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

/* ── AI loading bar ──────────────────────────────────── */
.ai-loading-bar {
  position: relative;
  height: 3px;
  background: #e0f6fd;
  flex-shrink: 0;
  overflow: hidden;
}
.ai-loading-bar::after {
  content: '';
  position: absolute;
  top: 0; left: -45%;
  width: 40%; height: 100%;
  background: linear-gradient(90deg, transparent, #00b1e0, #0098c1, transparent);
  animation: ai-sweep 1.4s ease-in-out infinite;
}
@keyframes ai-sweep {
  0%   { left: -45%; }
  100% { left: 110%; }
}

.thinking-label {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
  margin-left: 4px;
  animation: fade-pulse 1.6s ease-in-out infinite;
}
@keyframes fade-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

/* ── Input area ───────────────────────────────────────── */
.input-area { border-top: 1px solid #e5e7eb; padding: 16px 24px; background: #ffffff; flex-shrink: 0; }
.input-inner { display: flex; gap: 10px; align-items: flex-end; }

.message-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  color: #111827;
  line-height: 1.5;
}
.message-input:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.1); }
.message-input:disabled { background: #f9fafb; color: #9ca3af; }
.input-listening { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,0.1) !important; }
.input-ready { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.08) !important; }

.send-btn {
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.send-btn:hover:not(:disabled) { background: #1d3a98; }
.send-btn:disabled { background: #9ca3af; cursor: not-allowed; }

.input-hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }

/* ── Voice bar ─────────────────────────────────────────── */
.voice-bar { margin-bottom: 10px; min-height: 36px; display: flex; align-items: center; }
.voice-state { display: flex; align-items: center; gap: 10px; width: 100%; }
.voice-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; border-radius: 20px; padding: 7px 14px;
  font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.voice-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.voice-btn-idle { background: #eff6ff; color: #1e40af; }
.voice-btn-idle:hover:not(:disabled) { background: #dbeafe; }
.recording-dot {
  width: 10px; height: 10px; border-radius: 50%; background: #dc2626;
  animation: pulse-dot 1s infinite;
}
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.recording-label { font-size: 13px; font-weight: 600; color: #dc2626; flex: 1; }
.voice-btn-stop { background: #dc2626; color: white; }
.voice-btn-stop:hover { background: #b91c1c; }
.ready-label { font-size: 13px; color: #16a34a; font-weight: 500; flex: 1; }
.voice-btn-redo { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.voice-btn-redo:hover { background: #f9fafb; }

/* ── Course outline card ──────────────────────────────── */
.outline-card {
  background: #ffffff;
  border: 2px solid #00b1e0;
  border-radius: 16px;
  overflow: hidden;
  margin: 4px 0;
  box-shadow: 0 4px 16px rgba(0,177,224,0.12);
}

.outline-card-header {
  background: linear-gradient(135deg, #00b1e0, #0098c1);
  padding: 20px 24px 16px;
}
.outline-title { font-size: 17px; font-weight: 700; color: #fff; margin: 0 0 10px; }
.outline-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.outline-tag {
  font-size: 11px; font-weight: 600;
  background: rgba(255,255,255,0.2);
  color: #fff;
  border-radius: 20px;
  padding: 3px 10px;
}

.outline-sessions { padding: 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.outline-session { display: flex; gap: 14px; align-items: flex-start; }

.session-num {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #e6f8fd;
  border: 2px solid #00b1e0;
  color: #00b1e0;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.session-info { flex: 1; }
.session-info strong.session-title { font-size: 14px; color: #111827; display: block; margin-bottom: 2px; }
.session-info p.session-focus { font-size: 12px; color: #6b7280; margin: 0 0 6px; line-height: 1.4; }
.session-resources { display: flex; flex-wrap: wrap; gap: 4px; }
.resource-tag {
  font-size: 11px;
  background: #e6f8fd;
  color: #00b1e0;
  border: 1px solid #99dff5;
  border-radius: 4px;
  padding: 2px 8px;
}

/* Visibility toggle */
.outline-visibility {
  padding: 14px 24px 0;
}
.visibility-label { font-size: 12px; font-weight: 600; color: #6b7280; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.visibility-opts { display: flex; gap: 8px; }
.vis-opt {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: 1.5px solid #e5e7eb; background: #fff;
  font-size: 13px; font-weight: 500; color: #6b7280;
  cursor: pointer; transition: all 0.15s;
}
.vis-opt:hover { border-color: #00b1e0; color: #00b1e0; }
.vis-opt.vis-active { border-color: #00b1e0; background: #e6f8fd; color: #00b1e0; font-weight: 600; }
.vis-icon { font-size: 14px; }

.outline-actions {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}
.btn-start-course {
  background: #00b1e0; color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-start-course:hover { background: #0090b8; }
.btn-request-changes {
  background: none; color: #6b7280;
  border: 1.5px solid #d1d5db; border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-request-changes:hover { border-color: #9ca3af; color: #374151; }

/* ── Session phase ────────────────────────────────────── */
.session-top-bar { padding: 0 0 0; flex-shrink: 0; }
.session-progress-track { height: 4px; background: #e5e7eb; }
.session-progress-fill { height: 4px; background: linear-gradient(90deg, #00b1e0, #0098c1); transition: width 0.5s ease; }
.session-progress-label { font-size: 11px; color: #6b7280; padding: 6px 24px; display: flex; justify-content: space-between; align-items: center; }
.btn-delete-course {
  background: none; border: none; color: #9ca3af;
  font-size: 11px; cursor: pointer; padding: 0;
  transition: color 0.15s;
}
.btn-delete-course:hover { color: #dc2626; }

.design-reset-row { text-align: center; margin: 4px 0 0; }
.btn-start-fresh {
  background: none; border: none; color: #9ca3af;
  font-size: 11px; cursor: pointer; padding: 0;
  transition: color 0.15s;
}
.btn-start-fresh:hover { color: #dc2626; }

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.session-header-info { flex: 1; }
.session-badge {
  display: inline-block;
  font-size: 11px; font-weight: 700;
  color: #00b1e0;
  background: #e6f8fd;
  border-radius: 20px;
  padding: 2px 10px;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.session-title-heading { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.session-focus-text { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.4; }

.btn-end-session {
  background: #e6f8fd;
  color: #00b1e0;
  border: 1.5px solid #00b1e0;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}
.btn-end-session:hover:not(:disabled) { background: #00b1e0; color: #fff; }
.btn-end-session:disabled { opacity: 0.4; cursor: not-allowed; }

.session-quiz-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.btn-skip-quiz {
  background: none; color: #6b7280;
  border: 1.5px solid #d1d5db; border-radius: 8px;
  padding: 8px 14px; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.btn-skip-quiz:hover { color: #374151; border-color: #9ca3af; }
.quiz-gen-error {
  font-size: 12px; color: #dc2626;
  margin: 4px 0 0; padding: 0 2px;
}

/* ── Quiz ─────────────────────────────────────────────── */
.quiz-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.quiz-header { flex-shrink: 0; }
.quiz-heading { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.quiz-sub { font-size: 14px; color: #6b7280; margin: 0 0 12px; }
.quiz-progress-row { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280; }
.quiz-dots { display: flex; gap: 6px; }
.quiz-dot { width: 10px; height: 10px; border-radius: 50%; background: #e5e7eb; transition: background 0.2s; }
.dot-done { background: #0d9488; }
.dot-active { background: #0891b2; }

.quiz-question-card {
  background: #f0fdfa;
  border: 1.5px solid #99f6e4;
  border-radius: 12px;
  padding: 20px;
}
.quiz-q-text { font-size: 15px; font-weight: 600; color: #111827; margin: 0; line-height: 1.5; }

.quiz-answer-area { display: flex; flex-direction: column; gap: 12px; }
.quiz-textarea {
  width: 100%;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  line-height: 1.5;
  box-sizing: border-box;
}
.quiz-textarea:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }

.btn-submit-answer {
  background: #0d9488; color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  align-self: flex-start;
}
.btn-submit-answer:hover:not(:disabled) { background: #0f766e; }
.btn-submit-answer:disabled { opacity: 0.45; cursor: not-allowed; }

.quiz-result-card {
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex; flex-direction: column; gap: 10px;
}
.result-badge {
  display: inline-block;
  font-size: 13px; font-weight: 700;
  border-radius: 20px;
  padding: 4px 14px;
  width: fit-content;
}
.badge-pass { background: #dcfce7; color: #166534; }
.badge-fail { background: #fef2f2; color: #991b1b; }
.result-score { font-size: 13px; color: #6b7280; margin: 0; font-weight: 500; }
.result-feedback { font-size: 14px; color: #374151; margin: 0; line-height: 1.6; }

.btn-next-q {
  background: #0d9488; color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 20px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  align-self: flex-start;
}
.btn-next-q:hover { background: #0f766e; }

/* ── Quiz results ─────────────────────────────────────── */
.quiz-results { display: flex; flex-direction: column; gap: 16px; align-items: center; }
.results-score-circle {
  width: 100px; height: 100px;
  border-radius: 50%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border: 4px solid;
}
.score-pass { border-color: #0d9488; background: #f0fdfa; }
.score-needs-work { border-color: #d97706; background: #fffbeb; }
.score-number { font-size: 26px; font-weight: 800; color: #111827; line-height: 1; }
.score-label { font-size: 11px; color: #6b7280; font-weight: 600; }

.results-verdict { font-size: 15px; color: #374151; text-align: center; margin: 0; font-weight: 500; }

.results-breakdown {
  width: 100%;
  display: flex; flex-direction: column; gap: 8px;
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
}
.result-row { display: flex; align-items: flex-start; gap: 10px; }
.q-num { font-size: 12px; font-weight: 700; color: #6b7280; width: 24px; flex-shrink: 0; padding-top: 2px; }
.q-result-score { font-size: 12px; font-weight: 700; width: 36px; flex-shrink: 0; padding-top: 2px; }
.score-pass-text { color: #0d9488; }
.score-fail-text { color: #dc2626; }
.q-feedback-brief { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.4; flex: 1; }

.btn-continue-course {
  background: #0d9488; color: #fff;
  border: none; border-radius: 10px;
  padding: 12px 28px;
  font-size: 15px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
}
.btn-continue-course:hover { background: #0f766e; }

/* ── Completion screen ────────────────────────────────── */
.completion-screen {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  gap: 16px;
  overflow-y: auto;
}
.completion-check {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00b1e0, #0098c1);
  color: #fff;
  font-size: 32px;
  display: flex; align-items: center; justify-content: center;
}
.completion-heading { font-size: 24px; font-weight: 800; color: #111827; margin: 0; }
.completion-course-name { font-size: 14px; color: #6b7280; margin: 0; text-align: center; }

.completion-stats { display: flex; gap: 32px; }
.comp-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-number { font-size: 32px; font-weight: 800; color: #0d9488; line-height: 1; }
.stat-label { font-size: 12px; color: #6b7280; font-weight: 500; }

.completion-sessions {
  width: 100%;
  max-width: 480px;
  display: flex; flex-direction: column; gap: 8px;
}
.comp-session-row {
  display: flex; align-items: center; gap: 12px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px 14px;
}
.comp-session-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: #0d9488; color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.comp-session-info { flex: 1; }
.comp-session-title { font-size: 13px; color: #374151; font-weight: 500; }
.comp-session-score { font-size: 13px; font-weight: 700; flex-shrink: 0; }

.btn-return-menu {
  background: none;
  color: #6b7280;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-return-menu:hover { border-color: #9ca3af; color: #374151; }

/* ── Overview button in session header ────────────────── */
.btn-view-overview {
  background: #f3f4f6; color: #6b7280;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  padding: 8px 14px; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.btn-view-overview:hover { background: #e6f8fd; color: #00b1e0; border-color: #00b1e0; }

/* ── Course overview screen ───────────────────────────── */
.course-overview { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.overview-header {
  padding: 16px 24px 18px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.btn-back-to-session {
  background: none; border: none;
  color: #6b7280; font-size: 13px;
  cursor: pointer; padding: 0 0 10px;
  transition: color 0.15s; display: block;
}
.btn-back-to-session:hover { color: #00b1e0; }

.overview-course-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.overview-course-topic { font-size: 13px; color: #6b7280; margin: 0 0 14px; }

.overview-progress-row { display: flex; align-items: center; gap: 12px; }
.overview-progress-track { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.overview-progress-fill { height: 6px; background: linear-gradient(90deg, #00b1e0, #0098c1); transition: width 0.5s ease; }
.overview-progress-text { font-size: 12px; color: #6b7280; white-space: nowrap; }

.overview-sessions {
  flex: 1; overflow-y: auto;
  padding: 16px 24px;
  display: flex; flex-direction: column; gap: 10px;
}

.overview-session-row {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 14px 16px; border-radius: 10px;
  border: 1.5px solid #e5e7eb; background: #fafafa;
  transition: border-color 0.15s;
}
.ov-active { border-color: #00b1e0; background: #f0fbff; }
.ov-done { border-color: #d1fae5; background: #f0fdf4; }

.ov-session-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: #e5e7eb; color: #9ca3af;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ov-active .ov-session-num { background: #e6f8fd; border: 2px solid #00b1e0; color: #00b1e0; }
.ov-done .ov-session-num { background: #dcfce7; color: #16a34a; }

.ov-session-info { flex: 1; }
.ov-session-title { font-size: 14px; color: #111827; display: block; margin-bottom: 2px; }
.ov-session-focus { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.4; }

.ov-session-status { flex-shrink: 0; display: flex; align-items: center; }

.ov-badge {
  font-size: 11px; font-weight: 600;
  border-radius: 20px; padding: 3px 10px; white-space: nowrap;
}
.ov-badge-done { background: #dcfce7; color: #166534; }
.ov-badge-active { background: #e6f8fd; color: #00b1e0; }
.ov-badge-pending { background: #f3f4f6; color: #9ca3af; }

.overview-footer {
  padding: 14px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;
}

.btn-resume-session {
  background: #00b1e0; color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 20px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-resume-session:hover { background: #0090b8; }
</style>

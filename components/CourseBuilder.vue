<template lang="pug">
.course-builder

  //- ── Course builder nav bar ──────────────────────────────────────────────
  .cb-nav-bar
    button.btn-my-courses(@click="goToCourses") ← My Courses
    button.btn-team-dashboard(v-if="isFirmManager" @click="$emit('openFirmDashboard')") Team Dashboard

  //- ── AI processing bar — visible whenever any AI call is in-flight ────────
  .ai-loading-bar(v-if="isDesignStreaming || isSessionStreaming || isGeneratingQuiz")

  //- Server-storage error (CB-16/17) — a failed load/save is never silent.
  .course-error-banner(v-if="courseError")
    span {{ courseError }}
    button.btn-error-retry(v-if="courseLoadFailed" @click="retryCourseLoad") Try again

  //- ── PHASE: Courses (picker) ────────────────────────────────────────────
  template(v-if="phase === 'courses'")
    .courses-picker
      .courses-picker-header
        h2.picker-heading Your saved courses
        p.picker-sub Pick up where you left off, or start something new.
      .courses-list
        .course-row(v-for="c in savedCourses" :key="c.id")
          .course-row-info
            strong.course-row-title {{ c.outline.title }}
            p.course-row-meta {{ c.outline.sessions.length }} sessions · {{ (c.progress || []).filter(p => p.status === 'complete').length }} complete
          .course-row-status
            span.course-status-badge(:class="c.status === 'active' ? 'badge-status-active' : 'badge-status-paused'") {{ c.status === 'active' ? 'Active' : 'Paused' }}
            span.course-shared-badge(v-if="c.visibility === 'firm'") Shared
          button.btn-share-toggle(@click="toggleShareCourse(c)") {{ c.visibility === 'firm' ? 'Make private' : 'Share with firm' }}
          button.btn-resume-picker-course(@click="resumeCourse(c)") Resume →
          button.btn-remove-picker-course(@click="removeSavedCourse(c)") ✕ Remove

      //- ── Shared by your team (CB-07) — outline-only summaries; "Use this
      //-    course" makes the advisor's own fresh copy (personal-copy model).
      .shared-courses-section(v-if="sharedCourses.length")
        h3.shared-heading Shared by your team
        .courses-list
          .course-row(v-for="c in sharedCourses" :key="'shared-' + c.id")
            .course-row-info
              strong.course-row-title {{ c.outline.title }}
              p.course-row-meta {{ c.outline.sessions.length }} sessions · shared by {{ c.authorAdvisorId }}
            button.btn-use-shared-course(@click="useSharedCourse(c)" :disabled="isCopyingSharedId === c.id") {{ isCopyingSharedId === c.id ? 'Copying...' : 'Use this course' }}
      .courses-picker-footer
        button.btn-new-course-main(@click="startFreshCourse") + Build a new course

  //- ── PHASE: Design ───────────────────────────────────────────────────────
  template(v-else-if="phase === 'design'")
    .course-messages(ref="designMessages")
      course-message(
        v-for="(msg, i) in designMessages"
        :key="i"
        :role="msg.role"
        :content="msg.content"
        :rendered-html="msg.role === 'assistant' ? renderMarkdown(msg.content) : ''"
      )

      //- Pre-built starters — shown only at the opening screen
      .starters-section(v-if="designMessages.length === 1 && !isDesignStreaming")
        p.starters-heading Build from a template
        .starters-grid
          .starter-card(
            v-for="s in courseStarters"
            :key="s.id"
            @click="selectStarter(s)"
            :style="{ '--starter-colour': s.colour }"
          )
            .starter-card-top
            .starter-card-body
              h3.starter-title {{ s.title }}
              p.starter-blurb {{ s.blurb }}
              span.starter-btn Start building →

      //- Streaming indicator
      course-message(v-if="isDesignStreaming" streaming)

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
                //- CB-25: a grounded resource with a real Advisor-e page link is
                //- clickable — new tab always, so the live course chat survives.
                template(v-for="r in s.resources")
                  a.resource-tag.resource-tag-link(v-if="s.resourceLinks && s.resourceLinks[r]" :key="r" :href="s.resourceLinks[r]" target="_blank" rel="noopener noreferrer") {{ r }} ↗
                  span.resource-tag(v-else :key="r") {{ r }}
              //- CB-27: an empty slot says so plainly — never a silent blank.
              p.session-resources-empty(v-else) No library resource matched this session — it runs from the session focus instead.
        //- CB-26: code-detected session-count mismatch — the engine flags it;
        //- the AI is never trusted to confess a deviation itself.
        .outline-count-notice(v-if="courseState.sessionCountNotice")
          | You asked for {{ courseState.sessionCountNotice.requested }} sessions — this outline has {{ courseState.sessionCountNotice.delivered }}. Use 'Request changes' if you want {{ courseState.sessionCountNotice.requested }}.
        .outline-visibility
          p.visibility-label Who can access this course?
          .visibility-opts
            button.vis-opt(:class="{ 'vis-active': courseVisibility === 'private' }" @click="courseVisibility = 'private'")
              span.vis-icon 🔒
              span Private — just me
            //- CB-07 sharing is LIVE (Mike's personal-copy ruling 2026-07-16):
            //- a firm-wide course appears in teammates' "Shared by your team"
            //- list as an outline-only template they copy.
            button.vis-opt(:class="{ 'vis-active': courseVisibility === 'firm' }" @click="courseVisibility = 'firm'")
              span.vis-icon 🏢
              span Firm-wide — all advisors
        .outline-actions
          button.btn-start-course(@click="confirmOutline" :disabled="isSavingCourse")
            span(v-if="isSavingCourse") Saving...
            span(v-else) Start this course →
          button.btn-request-changes(@click="requestOutlineChanges" :disabled="isSavingCourse") Request changes

    .input-area
      voice-input-bar(
        v-if="speechSupported"
        :text="designInput"
        :listening="isListening"
        :disabled="isDesignStreaming"
        @toggle="toggleListening"
      )
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
        .session-top-actions
          button.btn-new-course(@click="buildNewCourse") + Build a new course
          button.btn-delete-course(@click="confirmDeleteCourse") ✕ Delete course

    .session-header
      .session-header-info
        span.session-badge Session {{ activeSessionIndex + 1 }}
        h3.session-title-heading {{ currentSession.title }}
        p.session-focus-text {{ currentSession.focus }}
        //- CB-25: the session's resource, always visible and clickable here —
        //- independent of which path (AI or resume) opened the session.
        .session-header-resources(v-if="currentSession.resources && currentSession.resources.length")
          template(v-for="r in currentSession.resources")
            a.resource-tag.resource-tag-link(v-if="currentSession.resourceLinks && currentSession.resourceLinks[r]" :key="r" :href="currentSession.resourceLinks[r]" target="_blank" rel="noopener noreferrer") {{ r }} ↗
            span.resource-tag(v-else :key="r") {{ r }}
        //- CB-27: an empty slot says so plainly — never a silent blank.
        p.session-resources-empty(v-else) No library resource matched this session — it runs from the session focus instead.
      .session-quiz-actions
        button.btn-view-overview(@click="viewCourseOverview") ≡ Overview
        button.btn-my-notes(@click="showNotes = !showNotes" :class="{ 'notes-active': showNotes }") ✎ My Session Notes
        button.btn-end-session(
          @click="endSessionAndQuiz"
          :disabled="isSessionStreaming || sessionMessages.length < 2 || isGeneratingQuiz"
          :title="sessionMessages.length < 2 ? 'Have the session conversation first' : 'End session and take the quiz'"
        )
          span(v-if="isGeneratingQuiz") Generating quiz...
          span(v-else) ✓ End session & take quiz
        button.btn-skip-quiz(v-if="quizError" @click="skipQuizAndContinue") Skip quiz & continue →
      p.quiz-gen-error(v-if="quizError") {{ quizError }}

    .notes-panel(v-show="showNotes")
      .notes-panel-header
        span.notes-panel-title My session notes
        button.notes-close(@click="showNotes = false") ✕
      textarea.notes-textarea(
        :value="currentNotes"
        @input="saveNote($event.target.value)"
        placeholder="Jot down key takeaways, questions, or ideas..."
        rows="5"
      )

    .course-messages(ref="sessionMessages")
      course-message(
        v-for="(msg, i) in sessionMessages"
        :key="i"
        :role="msg.role"
        :content="msg.content"
        :rendered-html="msg.role === 'assistant' ? renderMarkdown(msg.content) : ''"
      )

      course-message(
        v-if="isSessionStreaming"
        streaming
        :streaming-html="sessionStreamingText ? renderMarkdown(sessionStreamingText) : ''"
      )

    .input-area
      voice-input-bar(
        v-if="speechSupported"
        :text="sessionInput"
        :listening="isListening"
        :disabled="isSessionStreaming || isGeneratingQuiz"
        @toggle="toggleListening"
      )
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
        //- CB-32 (Mike 2026-07-16): any session opens from here, and ▲▼
        //- re-orders them — each session's progress record travels with it.
        //- Progressive courses confirm before a complexity-skipping jump/move.
        .overview-session-row(
          v-for="(s, i) in activeCourse.outline.sessions"
          :key="i"
          :class="{ 'ov-active': i === activeSessionIndex && activeCourse.progress[i].status !== 'complete', 'ov-done': activeCourse.progress[i].status === 'complete' }"
        )
          .ov-reorder
            button.btn-move-session(@click="moveSession(i, -1)" :disabled="i === 0" title="Move earlier") ▲
            button.btn-move-session(@click="moveSession(i, 1)" :disabled="i === activeCourse.outline.sessions.length - 1" title="Move later") ▼
          .ov-session-num {{ i + 1 }}
          .ov-session-info
            strong.ov-session-title {{ s.title }}
            p.ov-session-focus {{ s.focus }}
          .ov-session-status
            template(v-if="activeCourse.progress[i].status === 'complete'")
              span.ov-badge.ov-badge-done
                | ✓{{ activeCourse.progress[i].quizScore !== null ? ' ' + activeCourse.progress[i].quizScore + '%' : '' }}
              button.btn-review-quiz(
                v-if="activeCourse.progress[i].quizResults && activeCourse.progress[i].quizResults.length"
                @click="viewQuizReview(i)"
              ) Review
            span.ov-badge.ov-badge-active(v-else-if="i === activeSessionIndex") Active
            span.ov-badge.ov-badge-pending(v-else) Upcoming
            button.btn-open-session(@click="openSession(i)") Open →
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
          voice-input-bar(
            v-if="speechSupported"
            :text="quizAnswer"
            :listening="isListening"
            :disabled="isGrading"
            ready-label="Captured — review then Submit"
            @toggle="toggleListening"
          )
          textarea.quiz-textarea(
            v-model="quizAnswer"
            :placeholder="isListening ? '🎤 Listening...' : 'Type your answer here...'"
            rows="5"
            :disabled="isGrading"
            :class="{ 'input-listening': isListening, 'input-ready': !isListening && quizAnswer.trim() }"
          )
          button.btn-submit-answer(
            @click="submitAnswer"
            :disabled="!quizAnswer.trim() || isGrading"
          )
            span(v-if="isGrading") Evaluating...
            span(v-else) Submit answer

        .quiz-result-card(v-if="currentResult")
          .result-badge(:class="currentResult.ungraded ? 'badge-ungraded' : (currentResult.passed ? 'badge-pass' : 'badge-fail')")
            | {{ currentResult.ungraded ? '— Not graded' : (currentResult.passed ? '✓ Good understanding' : '✗ Review this one') }}
          p.result-score(v-if="!currentResult.ungraded") Score: {{ currentResult.score }}%
          p.result-feedback {{ currentResult.feedback }}
          //- The firm's authored answer, revealed only after grading. Only
          //- bank-backed questions carry one — AI-generated questions have no
          //- authored answer and never fabricate one.
          .model-answer-block(v-if="currentResult.modelAnswer")
            p.model-answer-label Model answer
            p.model-answer-text {{ currentResult.modelAnswer }}
            p.model-answer-keypoint(v-if="currentResult.modelKeyPoint") Key point: {{ currentResult.modelKeyPoint }}
          button.btn-next-q(@click="nextQuestion")
            | {{ quizCurrentIndex < quizQuestions.length - 1 ? 'Next question →' : 'See results' }}

      //- Quiz complete — results summary
      .quiz-results(v-if="quizComplete")
        .results-score-circle(:class="quizPassed ? 'score-pass' : 'score-needs-work'")
          span.score-number {{ overallScore === null ? '—' : overallScore + '%' }}
          span.score-label {{ quizUngraded ? 'Not graded' : (quizPassed ? 'Passed' : 'Keep going') }}
        p.results-verdict(v-if="quizUngraded") This quiz couldn't be marked this time — your session is still complete, and you can revisit the material any time.
        p.results-verdict(v-else-if="quizPassed") Great work — you've completed this session.
        p.results-verdict(v-else) No problem — you can revisit the session material any time.
        .results-breakdown
          .result-row(v-for="(r, i) in quizResults" :key="i")
            span.q-num Q{{ i + 1 }}
            span.q-result-score(:class="r.ungraded ? 'score-na-text' : (r.passed ? 'score-pass-text' : 'score-fail-text')") {{ r.ungraded ? '—' : r.score + '%' }}
            p.q-feedback-brief {{ r.feedback.slice(0, 80) }}{{ r.feedback.length > 80 ? '...' : '' }}
        button.btn-continue-course(@click="completeSession")
          | {{ hasMoreSessions ? 'Continue to session ' + (activeSessionIndex + 2) + ' →' : 'Complete course' }}

  //- ── PHASE: Quiz Review ──────────────────────────────────────────────────
  template(v-else-if="phase === 'quiz-review'")
    .quiz-review-container
      .quiz-review-header
        button.btn-back-to-overview(@click="backFromQuizReview") ← Back to overview
        h3.review-heading Quiz review — Session {{ reviewSessionIndex + 1 }}
      .review-questions
        .review-q-row(v-for="(r, i) in reviewResults" :key="i")
          .review-q-meta
            span.review-q-num Q{{ i + 1 }}
            span.review-q-score(:class="r.ungraded ? 'score-na-text' : (r.passed ? 'score-pass-text' : 'score-fail-text')") {{ r.ungraded ? '—' : r.score + '%' }}
            span.review-badge(:class="r.ungraded ? 'badge-ungraded' : (r.passed ? 'badge-pass' : 'badge-fail')") {{ r.ungraded ? '— Not graded' : (r.passed ? '✓ Good understanding' : '✗ Review this one') }}
          p.review-q-text {{ r.question }}
          .review-answer-block
            p.review-answer-label Your answer
            p.review-answer-text {{ r.answer }}
          .model-answer-block(v-if="r.modelAnswer")
            p.model-answer-label Model answer
            p.model-answer-text {{ r.modelAnswer }}
            p.model-answer-keypoint(v-if="r.modelKeyPoint") Key point: {{ r.modelKeyPoint }}
          p.review-feedback {{ r.feedback }}

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
          .comp-session-score(v-if="activeCourse.progress && activeCourse.progress[i] && activeCourse.progress[i].quizScore !== null")
            span(:class="activeCourse.progress[i].quizScore >= 70 ? 'score-pass-text' : 'score-fail-text'")
              | {{ activeCourse.progress[i].quizScore }}%
      .completion-actions
        button.btn-download-cert(@click="showCertificate = true") ↓ Download certificate
        button.btn-return-menu(@click="$emit('exit')") ← Return to main menu

    //- Certificate modal
    .certificate-modal(v-if="showCertificate")
      .cert-backdrop(@click="showCertificate = false")
      .certificate-card
        .cert-logo Advisor-e
        h1.cert-title Course Completion Certificate
        p.cert-subtitle This certifies that
        p.cert-advisor-name {{ advisorProfile && advisorProfile.name ? advisorProfile.name : 'the advisor' }}
        p.cert-body has successfully completed
        p.cert-course-name {{ activeCourse.outline.title }}
        p.cert-date {{ certCompletedDate }}
        .cert-stats
          .cert-stat-item
            span.cert-stat-num {{ completedSessionCount }}
            span.cert-stat-label Sessions
          .cert-stat-item
            span.cert-stat-num {{ averageScore }}%
            span.cert-stat-label Average score
        .cert-actions
          button.btn-cert-print(@click="printCertificate") Print / Save as PDF
          button.btn-cert-close(@click="showCertificate = false") Close
</template>

<script>
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'
import courseStarters from '~/data/course-starters.json'
import VoiceInputBar from '~/components/base/VoiceInputBar.vue'
import CourseMessage from '~/components/course/CourseMessage.vue'
import { ungradedResult, overallQuizScore, quizPassed as quizPassedRule, quizFullyUngraded } from '~/utils/quizScoring'
import { listCourses, listSharedCourses, copySharedCourse, createCourse, updateCourse, deleteCourse, migrateLegacyCourses } from '~/utils/courses'

const _md = new MarkdownIt({ html: false, linkify: true, typographer: true })
// Same security call as the locked VirtualAdvisor pipeline (CB-05): AI output
// must not inject images (outbound-request/exfiltration channel) or raw HTML.
_md.disable(['image', 'html_inline', 'html_block'])
// CB-25: every rendered link opens in a NEW tab — navigating this tab away
// would destroy the advisor's live course conversation. (This is the Course
// Builder's own renderer, NOT the locked VirtualAdvisor pipeline.)
const _defaultLinkOpen = _md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
_md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return _defaultLinkOpen(tokens, idx, options, env, self)
}

export default {
  name: 'CourseBuilder',

  components: { VoiceInputBar, CourseMessage },

  props: {
    advisorId: { type: String, default: 'local-advisor' },
    firmId: { type: String, default: 'local-firm' },
    advisorProfile: { type: Object, default: null },
    orgTemplateIds: { type: Array, default: null },
    isFirmManager: { type: Boolean, default: false },
    // Verified login pass (JWT). Defaults to the safe local-dev bypass token.
    apiToken: { type: String, default: 'dev-local-bypass' }
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
      // Courses shown in the "Your saved courses" picker — fetched from the
      // server (CB-16/17); refreshed via _refreshSavedCourses() after every
      // save/delete so the picker never goes stale.
      savedCourses: [],
      // Courses OTHER advisors in the firm shared firm-wide (CB-07) — outline-only
      // summaries; "Use this course" copies one into savedCourses.
      sharedCourses: [],
      isCopyingSharedId: null,
      // Server-storage state (CB-16/17): a failed load/save is never silent.
      courseError: '',
      courseLoadFailed: false,
      isSavingCourse: false,

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
      isGrading: false,

      // Pre-built starters
      courseStarters,

      // Notes
      showNotes: false,

      // Quiz review
      reviewSessionIndex: 0,

      // Certificate
      showCertificate: false
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
      return quizPassedRule(this.quizResults)
    },

    // Fully-ungraded quiz — the results screen explains the marking failure
    // instead of showing a pass/fail verdict (CB-03).
    quizUngraded () {
      return quizFullyUngraded(this.quizResults)
    },

    // Average of GRADED answers only; null when nothing was graded (an
    // ungraded answer must never inflate the recorded score — CB-03).
    overallScore () {
      return overallQuizScore(this.quizResults)
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
    },

    currentNotes () {
      if (!this.activeCourse || !this.activeCourse.progress) { return '' }
      return (this.activeCourse.progress[this.activeSessionIndex] || {}).notes || ''
    },

    reviewResults () {
      if (!this.activeCourse || !this.activeCourse.progress) { return [] }
      return (this.activeCourse.progress[this.reviewSessionIndex] || {}).quizResults || []
    },

    certCompletedDate () {
      if (!this.activeCourse || !this.activeCourse.progress) { return '' }
      const last = [...this.activeCourse.progress]
        .reverse()
        .find(p => p.completedAt)
      if (!last) { return '' }
      return new Date(last.completedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    }
  },

  watch: {
    // The picker is per-advisor; if the advisorId prop resolves after mount, rebuild it.
    advisorId () { this._refreshSavedCourses(); this._refreshSharedCourses() },
    // The real pass can settle after mount (the caseMixin pattern) — re-run the
    // legacy migration + load once it does.
    apiToken () { this._initCourses() }
  },

  mounted () {
    this._initCourses()
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
        if (this.phase === 'quiz') { this.quizAnswer = transcript } else if (this.phase === 'session') { this.sessionInput = transcript } else { this.designInput = transcript }
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

  beforeDestroy () {
    // Stop speech recognition so it doesn't keep auto-restarting (onend) after
    // the component is torn down, e.g. when the user exits course mode.
    if (this.recognition) {
      this.isListening = false
      this._recognitionRunning = false
      try { this.recognition.stop() } catch (e) {}
    }
    this._abortAllStreams()
    // Flush a pending debounced note save so nothing typed is lost on exit.
    if (this._noteSaveTimer) {
      clearTimeout(this._noteSaveTimer)
      this._saveCourse(this.activeCourse)
    }
  },

  methods: {
    toggleListening () {
      if (!this.recognition) { return }
      if (this.isListening) {
        this.recognition.stop()
        this.isListening = false
      } else {
        if (this.phase === 'quiz') { this.quizAnswer = '' } else if (this.phase === 'session') { this.sessionInput = '' } else { this.designInput = '' }
        this.isListening = true
        if (!this._recognitionRunning) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) { this._recognitionRunning = false }
        }
      }
    },

    renderMarkdown (text) {
      const raw = _md.render(String(text || ''))
      // ADD_ATTR (CB-25): the html profile strips target="_blank" (verified
      // live), which would make resource links navigate the course chat away.
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] })
    },

    // Cancel any in-flight AI streams and clear their indicators — called on
    // every context switch (start fresh, delete, new course, resume, teardown)
    // so a superseded reply can never land in a fresh conversation (CB-18).
    _abortAllStreams () {
      for (const key of ['_designCtrl', '_sessionCtrl']) {
        if (this[key]) {
          try { this[key].abort() } catch (e) { /* already settled */ }
          this[key] = null
        }
      }
      this.isDesignStreaming = false
      this.designStreamingText = ''
      this.isSessionStreaming = false
      this.sessionStreamingText = ''
    },

    // ── Persistence (server storage, CB-16/17 Stage D) ───────────────────

    // Migrate any legacy browser-stored courses, load the server list, then
    // route to the right phase. Called on mount and when the pass settles.
    async _initCourses () {
      if (!this.apiToken) { return }
      try {
        const result = await migrateLegacyCourses(this.apiToken, this.advisorId)
        if (result && result.migrated) {
          console.warn(`[course] Migrated ${result.migrated}/${result.total} legacy courses to the server`)
        }
      } catch (e) {
        console.warn('[course] Legacy course migration failed (will retry next load):', e.message)
      }
      await this._refreshSavedCourses()
      this._refreshSharedCourses() // independent list — never blocks the picker
      this._loadOrStartCourse()
    },

    retryCourseLoad () {
      this.courseError = ''
      this.courseLoadFailed = false
      this._initCourses()
    },

    _loadOrStartCourse () {
      // Never clobber an in-progress course (e.g. a retry after a save error).
      if (this.activeCourse) { return }
      // Any saved course → land on the picker, so the advisor's library is
      // always visible (CB-28: auto-resuming the first active course hid
      // every other saved course behind the "← My Courses" button).
      if (this.savedCourses.length > 0) {
        this.phase = 'courses'
        return
      }
      // No saved courses — start design conversation
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

    // Persist a course to the server: update when the server already knows it,
    // create otherwise. Fire-and-forget callers keep their local state either
    // way; a failure surfaces on the banner and retries with the next action.
    async _saveCourse (course) {
      if (!course || !this.apiToken) { return }
      try {
        if (this._serverCourseIds && this._serverCourseIds.has(course.id)) {
          await updateCourse(course.id, {
            status: course.status,
            visibility: course.visibility,
            // Outline included since CB-32: re-ordering changes session order,
            // which lives in the outline. Re-validated server-side every save.
            outline: course.outline,
            progress: course.progress
          }, this.apiToken)
        } else {
          const saved = await createCourse(course, this.apiToken)
          if (!this._serverCourseIds) { this._serverCourseIds = new Set() }
          this._serverCourseIds.add(saved.id)
        }
        this.courseError = ''
        this._refreshSavedCourses()
      } catch (e) {
        console.warn('[course] Save failed:', e.message)
        this.courseError = "Couldn't save your progress just now — it will retry with your next action."
      }
    },

    // Rebuild the picker list from the server. Called on init, when advisorId
    // changes, and after every _saveCourse / _deleteCourse.
    async _refreshSavedCourses () {
      if (!this.apiToken) { this.savedCourses = []; return }
      try {
        const courses = await listCourses(this.apiToken)
        this._serverCourseIds = new Set(courses.map(c => c.id))
        this.savedCourses = courses.filter(c => c.status === 'active' || c.status === 'paused')
        this.courseError = ''
        this.courseLoadFailed = false
      } catch (e) {
        console.warn('[course] Failed to load saved courses:', e.message)
        this.savedCourses = []
        this.courseError = "We couldn't load your saved courses. Check your connection and try again."
        this.courseLoadFailed = true
      }
    },

    // CB-25: session-opening text — each resource name becomes a markdown link
    // when the outline carries its real Advisor-e page address (server-built,
    // https-validated at the door). Names without a link stay plain text.
    _linkedResourceNames (session) {
      const links = (session && session.resourceLinks) || {}
      return ((session && session.resources) || [])
        .map(r => links[r] ? `[${r}](${links[r]})` : r)
        .join(' and ') || 'the session material'
    },

    // Rebuild the "Shared by your team" list (CB-07). Failures degrade to an
    // empty section rather than blocking the advisor's own courses.
    async _refreshSharedCourses () {
      if (!this.apiToken) { this.sharedCourses = []; return }
      try {
        this.sharedCourses = await listSharedCourses(this.apiToken)
      } catch (e) {
        console.warn('[course] Failed to load shared courses:', e.message)
        this.sharedCourses = []
      }
    },

    // Two-way share control (CB-07): 'private' <-> 'firm' on a course the
    // advisor owns. Retracting never claws back copies teammates already made
    // (the mentor-share no-cascade principle).
    async toggleShareCourse (course) {
      const next = course.visibility === 'firm' ? 'private' : 'firm'
      try {
        await updateCourse(course.id, { visibility: next }, this.apiToken)
        course.visibility = next
        this.courseError = ''
      } catch (e) {
        console.warn('[course] Share toggle failed:', e.message)
        this.courseError = "Couldn't change sharing just now — please try again."
      }
    },

    // Remove a saved course from the picker (confirm-gated). Same server
    // delete the in-course "✕ Delete course" uses.
    async removeSavedCourse (course) {
      if (!confirm(`Delete '${course.outline.title}'? Its progress will be lost.`)) { return }
      try {
        await deleteCourse(course.id, this.apiToken)
        if (this._serverCourseIds) { this._serverCourseIds.delete(course.id) }
        this.courseError = ''
        await this._refreshSavedCourses()
      } catch (e) {
        console.warn('[course] Remove failed:', e.message)
        this.courseError = "Couldn't delete the course — please try again."
      }
    },

    // "Use this course" (CB-07 personal-copy model): the server creates the
    // caller's own fresh copy; it appears at the top of their saved list.
    // copiedFrom lets us catch an accidental second copy before it happens.
    async useSharedCourse (shared) {
      if (this.isCopyingSharedId) { return }
      const alreadyCopied = this.savedCourses.some(c => c.copiedFrom === shared.id)
      if (alreadyCopied && !confirm('You already have a copy of this course. Make another copy?')) { return }
      this.isCopyingSharedId = shared.id
      try {
        await copySharedCourse(shared.id, this.apiToken)
        await this._refreshSavedCourses()
        this.courseError = ''
      } catch (e) {
        console.warn('[course] Copy shared course failed:', e.message)
        this.courseError = "Couldn't copy that course just now — please try again."
      } finally {
        this.isCopyingSharedId = null
      }
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

      if (this._designCtrl) { try { this._designCtrl.abort() } catch (e) { /* already settled */ } }
      const ctrl = new AbortController()
      this._designCtrl = ctrl

      await this.$nextTick()
      this._scrollDesign()

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          signal: ctrl.signal,
          body: JSON.stringify({
            type: 'design',
            query,
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
              } else if (data.type === 'error') {
                this.designStreamingText = data.message || 'The response timed out. Please try again.'
              } else if (data.type === 'done') {
                let content = this.designStreamingText
                content = content.replace(/\[COURSE_OUTLINE\][\s\S]*?\[\/COURSE_OUTLINE\]/g, '').trim()
                // No empty bubbles: an outline-only reply has nothing to say in chat.
                if (content) { this.designMessages.push({ role: 'assistant', content }) }
                this.designStreamingText = ''
                this.isDesignStreaming = false
              }
            } catch (e) { /* ignore malformed SSE line */ }
          }
        }

        if (this.isDesignStreaming) {
          let content = this.designStreamingText
          content = content.replace(/\[COURSE_OUTLINE\][\s\S]*?\[\/COURSE_OUTLINE\]/g, '').trim()
          if (content) { this.designMessages.push({ role: 'assistant', content }) }
          this.designStreamingText = ''
          this.isDesignStreaming = false
        }
      } catch (e) {
        if (e && e.name === 'AbortError') { return } // superseded by a context switch
        console.error('[course:design]', e.message)
        this.designMessages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
        this.isDesignStreaming = false
        this.designStreamingText = ''
      }
      if (this._designCtrl === ctrl) { this._designCtrl = null }

      await this.$nextTick()
      this._scrollDesign()
    },

    async confirmOutline () {
      if (!this.pendingOutline || this.isSavingCourse) { return }
      this.isSavingCourse = true
      const course = {
        id: this._generateId(),
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
      try {
        const saved = await createCourse(course, this.apiToken)
        if (!this._serverCourseIds) { this._serverCourseIds = new Set() }
        this._serverCourseIds.add(saved.id)
        this.courseError = ''
        this.activeCourse = saved
        this.activeSessionIndex = 0
        this.phase = 'session'
        this._startSession(true)
      } catch (e) {
        // The outline card stays on screen — the advisor's course is never lost.
        console.warn('[course] Could not save the new course:', e.message)
        this.courseError = "Couldn't save your progress just now — it will retry with your next action."
      }
      this.isSavingCourse = false
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
        const resources = this._linkedResourceNames(session)
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

      if (this._sessionCtrl) { try { this._sessionCtrl.abort() } catch (e) { /* already settled */ } }
      const ctrl = new AbortController()
      this._sessionCtrl = ctrl

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          signal: ctrl.signal,
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
        if (e && e.name === 'AbortError') { return } // superseded by a context switch
        console.error('[course:session:open]', e.message)
        const resources = this._linkedResourceNames(session)
        this.sessionMessages = [{
          role: 'assistant',
          content: `**Session ${session.id}: ${session.title}**\n\n${session.focus}\n\nHead to **${resources}** in your Advisor-e library. Work through it and come back when you're ready — we'll pick it apart together.`
        }]
        this.isSessionStreaming = false
        this.sessionStreamingText = ''
      }
      if (this._sessionCtrl === ctrl) { this._sessionCtrl = null }

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

      if (this._sessionCtrl) { try { this._sessionCtrl.abort() } catch (e) { /* already settled */ } }
      const ctrl = new AbortController()
      this._sessionCtrl = ctrl

      await this.$nextTick()
      this._scrollSession()

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          signal: ctrl.signal,
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
        if (e && e.name === 'AbortError') { return } // superseded by a context switch
        console.error('[course:session]', e.message)
        this.sessionMessages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
        this.isSessionStreaming = false
        this.sessionStreamingText = ''
      }
      if (this._sessionCtrl === ctrl) { this._sessionCtrl = null }

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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
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

    // CB-32: open ANY session from the overview — free navigation (Mike's
    // ruling). On a PROGRESSIVE course, entering an unstarted session while
    // earlier ones are still open gets the approved skip-complexity confirm.
    openSession (index) {
      const course = this.activeCourse
      if (!course || !course.outline.sessions[index]) { return }
      const skipsComplexity = course.outline.intensity === 'progressive' &&
        course.progress[index].status !== 'complete' &&
        course.progress.slice(0, index).some(p => p.status !== 'complete')
      if (skipsComplexity &&
        !confirm(`This course builds up session by session — Session ${index + 1} assumes you've covered the earlier ones. Open it anyway?`)) { return }
      this.activeSessionIndex = index
      this.phase = 'session'
      this._startSession(false)
    },

    // CB-32: move a session one place up or down. Its progress record travels
    // with it (progress is positional — separating them would attach quiz
    // scores to the wrong session). Moving EARLIER on a progressive course
    // gets the approved confirm. Splice keeps Vue 2 reactivity; ids renumber
    // to stay positional; the change persists immediately.
    async moveSession (index, direction) {
      const course = this.activeCourse
      const to = index + direction
      if (!course) { return }
      const sessions = course.outline.sessions
      if (to < 0 || to >= sessions.length) { return }
      if (direction < 0 && course.outline.intensity === 'progressive' &&
        !confirm(`This course builds up session by session — moving '${sessions[index].title}' earlier may put advanced material before its foundations. Move it anyway?`)) { return }
      const activeSession = sessions[this.activeSessionIndex]
      const swap = (arr) => {
        const moved = arr[index]
        arr.splice(index, 1, arr[to])
        arr.splice(to, 1, moved)
      }
      swap(sessions)
      swap(course.progress)
      sessions.forEach((s, i) => { s.id = i + 1 })
      const followed = sessions.indexOf(activeSession)
      if (followed >= 0) { this.activeSessionIndex = followed }
      await this._saveCourse(course)
    },

    viewQuizReview (index) {
      this.reviewSessionIndex = index
      this.phase = 'quiz-review'
    },

    backFromQuizReview () {
      this.phase = 'overview'
    },

    saveNote (text) {
      if (!this.activeCourse) { return }
      const progress = this.activeCourse.progress.map((p, i) => {
        if (i === this.activeSessionIndex) { return { ...p, notes: text } }
        return p
      })
      this.activeCourse = { ...this.activeCourse, progress }
      // Debounced: notes fire per keystroke, but the server save waits for a
      // pause in typing (flushed on teardown).
      clearTimeout(this._noteSaveTimer)
      this._noteSaveTimer = setTimeout(() => { this._saveCourse(this.activeCourse) }, 800)
    },

    printCertificate () {
      window.print()
    },

    goToCourses () {
      this._abortAllStreams()
      if (this.activeCourse && this.phase === 'session') {
        this._saveCourse(this.activeCourse)
      }
      this.phase = 'courses'
    },

    buildNewCourse () {
      this._abortAllStreams()
      if (this.activeCourse) {
        this.activeCourse = { ...this.activeCourse, status: 'paused' }
        this._saveCourse(this.activeCourse)
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

    resumeCourse (course) {
      this._abortAllStreams()
      this.activeCourse = course.status === 'paused' ? { ...course, status: 'active' } : course
      if (course.status === 'paused') { this._saveCourse(this.activeCourse) }
      this.activeSessionIndex = this._findActiveSessionIndex(this.activeCourse)
      this.sessionMessages = []
      this.quizQuestions = []
      this.quizResults = []
      this.quizError = ''
      this.phase = 'session'
      this._startSession(false)
    },

    selectStarter (starter) {
      this.designInput = `I'd like to build a course called "${starter.title}". ${starter.blurb} Please design a ${starter.sessions}-session course using the available Advisor-e templates and resources.`
      this.sendDesignMessage()
    },

    startFreshCourse () {
      this._abortAllStreams()
      this.activeCourse = null
      this.activeSessionIndex = 0
      this.courseVisibility = 'private'
      this.pendingOutline = null
      this.sessionMessages = []
      this.quizQuestions = []
      this.quizResults = []
      this.quizError = ''
      this.phase = 'design'
      this.designMessages = [{
        role: 'assistant',
        content: this.$t ? this.$t('opening.course') : "Great — let's design your learning program together.\n\nWhat are the skills or advisory concepts you'd like to develop?"
      }]
    },

    skipQuizAndContinue () {
      this.quizError = ''
      this._markSessionComplete(null)
    },

    confirmDeleteCourse () {
      if (!confirm('Delete this course and start again? Your progress will be lost.')) { return }
      this._deleteCourse()
    },

    async _deleteCourse () {
      this._abortAllStreams()
      if (this.activeCourse && this._serverCourseIds && this._serverCourseIds.has(this.activeCourse.id)) {
        try {
          await deleteCourse(this.activeCourse.id, this.apiToken)
          this._serverCourseIds.delete(this.activeCourse.id)
        } catch (e) {
          // The course still exists on the server — keep it on screen too.
          console.warn('[course] Delete failed:', e.message)
          this.courseError = "Couldn't delete the course — please try again."
          return
        }
      }
      this._refreshSavedCourses()
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
      // Stop dictation on submit so it can't keep transcribing into the next
      // question's answer (same pattern as the other phase transitions).
      if (this.isListening) { this.recognition.stop(); this.isListening = false }
      this.isGrading = true

      try {
        const response = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          body: JSON.stringify({
            type: 'quiz-grade',
            question: this.currentQuestion,
            answer,
            sessionContext: this.currentSession,
            // What was taught — the backend caps and injects it so the marker
            // grades against the session content, not general knowledge (CB-04).
            sessionHistory: this.sessionMessages.map(m => ({ role: m.role, content: m.content }))
          })
        })
        const data = await response.json()
        if (data.success) {
          this.currentResult = { passed: data.passed, score: data.score, feedback: data.feedback, question: this.currentQuestion.question, answer, modelAnswer: data.modelAnswer || null, modelKeyPoint: data.modelKeyPoint || null }
        } else {
          this.currentResult = ungradedResult(this.currentQuestion.question, answer)
        }
      } catch (e) {
        this.currentResult = ungradedResult(this.currentQuestion.question, answer)
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
      this._markSessionComplete(this.overallScore, [...this.quizResults])
    },

    _markSessionComplete (score, results = null) {
      if (!this.activeCourse) {
        console.error('[course] _markSessionComplete called but activeCourse is null — cannot advance')
        this.quizError = 'Session state was lost. Please refresh and try again.'
        return
      }
      const progress = (this.activeCourse.progress || []).map((p, i) => {
        if (i === this.activeSessionIndex) {
          return { status: 'complete', quizScore: score, completedAt: new Date().toISOString(), quizResults: results, notes: p.notes || null }
        }
        return p
      })
      this.activeCourse = { ...this.activeCourse, progress }

      // Notify platform integration stub
      this._recordProgress(score)
      this._logActivity(score)

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
      // Calls the progress endpoint which triggers CourseReminderService.markComplete.
      // Advisor identity is derived server-side from the verified pass — not sent.
      try {
        await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          body: JSON.stringify({
            type: 'progress',
            courseId: this.activeCourse.id,
            sessionId: this.activeSessionIndex + 1,
            score
          })
        })
      } catch (e) {
        console.warn('[course] Progress record failed (non-critical):', e.message)
      }
    },

    async _logActivity (score) {
      if (!this.advisorId || !this.firmId || !this.activeCourse) { return }
      const session = this.activeCourse.outline.sessions[this.activeSessionIndex]
      if (!session) { return }
      try {
        await fetch('/api/activity/log-course', {
          method: 'POST',
          // Advisor + firm are derived server-side from this pass — not sent in the body.
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          body: JSON.stringify({
            courseId: this.activeCourse.id,
            courseTitle: this.activeCourse.outline.title,
            courseTopic: this.activeCourse.outline.topic || null,
            sessionIndex: this.activeSessionIndex,
            sessionTitle: session.title,
            sessionResources: session.resources || [],
            quizScore: (score !== null && score !== undefined) ? score : null
          })
        })
      } catch (e) {
        console.warn('[course] Activity log failed (non-critical):', e.message)
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

/* ── Course builder nav bar ──────────────────────────── */
.cb-nav-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  flex-shrink: 0;
}
.btn-my-courses {
  background: none; border: none; color: #6b7280;
  font-size: 13px; font-weight: 500; cursor: pointer;
  padding: 4px 0; transition: color 0.15s;
}
.btn-my-courses:hover { color: #1e40af; }
.btn-team-dashboard {
  background: #0f766e; color: #fff;
  border: none; border-radius: 6px;
  padding: 5px 14px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-team-dashboard:hover { background: #0d6560; }

/* ── Server-storage error banner (CB-16/17) ─────────────── */
.course-error-banner {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 8px 24px;
  background: #fef2f2; color: #991b1b;
  font-size: 13px; font-weight: 500;
  border-bottom: 1px solid #fecaca;
  flex-shrink: 0;
}
.btn-error-retry {
  background: #991b1b; color: #fff;
  border: none; border-radius: 6px;
  padding: 4px 12px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-error-retry:hover { background: #7f1d1d; }

/* ── Messages ─────────────────────────────────────────── */
.course-messages { flex: 1; overflow-y: auto; padding: 24px; }
.course-messages > * + * { margin-top: 20px; }

/* ── Chat message + typing-indicator styles → components/course/CourseMessage.vue (CB-23) */

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

/* ── Voice bar ── moved to components/base/VoiceInputBar.vue (CB-23) */

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
.resource-tag-link {
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.session-header-resources {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.session-resources-empty {
  font-size: 11px;
  font-style: italic;
  color: #9ca3af;
  margin: 4px 0 0;
}
.resource-tag-link:hover {
  background: #00b1e0;
  color: #fff;
  text-decoration: none;
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
.vis-opt.vis-disabled { opacity: 0.6; cursor: not-allowed; }
.vis-opt.vis-disabled:hover { border-color: #e5e7eb; color: #6b7280; }
.vis-soon-tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  background: #f3f4f6; color: #6b7280; border-radius: 999px; padding: 2px 8px;
}
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
.badge-ungraded { background: #f3f4f6; color: #4b5563; }
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
.score-na-text { color: #6b7280; }
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

.ov-reorder { display: flex; flex-direction: column; gap: 2px; }
.btn-move-session {
  background: none; color: #9ca3af;
  border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 1px 7px; font-size: 10px; line-height: 1.4;
  cursor: pointer; transition: all 0.15s;
}
.btn-move-session:hover:not(:disabled) { color: #1e40af; border-color: #bfdbfe; background: #eff6ff; }
.btn-move-session:disabled { opacity: 0.35; cursor: default; }
.btn-open-session {
  margin-left: 8px;
  background: #00b1e0; color: #fff;
  border: none; border-radius: 6px;
  padding: 4px 12px; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.btn-open-session:hover { background: #0090b8; }

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

/* ── Session top-bar new-course button ───────────────── */
.session-top-actions { display: flex; gap: 8px; align-items: center; }
.btn-new-course {
  background: #00b1e0; color: #fff;
  border: none; border-radius: 6px;
  padding: 4px 12px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-new-course:hover { background: #0090b8; }
.btn-delete-course {
  background: none; color: #9ca3af;
  border: 1.5px solid #e5e7eb; border-radius: 6px;
  padding: 4px 10px; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-delete-course:hover { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }

/* ── Courses picker screen ───────────────────────────── */
.courses-picker {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 32px 24px;
  gap: 24px;
}

.courses-picker-header { flex-shrink: 0; }
.picker-heading { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 6px; }
.picker-sub { font-size: 14px; color: #6b7280; margin: 0; }

.courses-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.course-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #fafafa;
  transition: border-color 0.15s;
}
.course-row:hover { border-color: #00b1e0; background: #f0fbff; }

.course-row-info { flex: 1; }
.course-row-title { font-size: 14px; color: #111827; display: block; margin-bottom: 3px; }
.course-row-meta { font-size: 12px; color: #6b7280; margin: 0; }

.course-row-status { flex-shrink: 0; }
.course-status-badge {
  font-size: 11px; font-weight: 600;
  border-radius: 20px; padding: 3px 10px;
}
.badge-status-active { background: #e6f8fd; color: #00b1e0; }
.badge-status-paused { background: #f3f4f6; color: #9ca3af; }

.btn-resume-picker-course {
  background: #00b1e0; color: #fff;
  border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s; flex-shrink: 0;
}
.btn-resume-picker-course:hover { background: #0090b8; }

.course-shared-badge {
  background: #eff6ff; color: #1e40af;
  border-radius: 6px; padding: 2px 8px;
  font-size: 11px; font-weight: 600;
  margin-left: 6px;
}

.btn-share-toggle {
  background: none; color: #1e40af;
  border: 1px solid #bfdbfe; border-radius: 8px;
  padding: 8px 12px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: all 0.15s; flex-shrink: 0;
  margin-right: 8px;
}
.btn-share-toggle:hover { background: #eff6ff; }

.outline-count-notice {
  background: #fffbeb; color: #92400e;
  border: 1px solid #fde68a; border-radius: 8px;
  padding: 10px 14px; margin: 12px 0 0;
  font-size: 13px; font-weight: 600;
}

.btn-remove-picker-course {
  background: none; color: #9ca3af;
  border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 8px 12px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: all 0.15s; flex-shrink: 0;
  margin-left: 8px;
}
.btn-remove-picker-course:hover { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

.shared-courses-section {
  margin-top: 24px;
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}
.shared-heading {
  font-size: 15px; font-weight: 700; color: #374151;
  margin: 0 0 12px;
}
.btn-use-shared-course {
  background: #1e40af; color: #fff;
  border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s; flex-shrink: 0;
}
.btn-use-shared-course:hover { background: #1c3a9e; }
.btn-use-shared-course:disabled { opacity: 0.6; cursor: wait; }

.courses-picker-footer {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}
.btn-new-course-main {
  background: none;
  color: #1e40af;
  border: 1.5px solid #1e40af;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.btn-new-course-main:hover { background: #eff6ff; }

/* ── Pre-built starters ──────────────────────────────── */
.starters-section {
  margin-top: 20px;
  padding: 0 4px;
}
.starters-heading {
  font-size: 12px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin: 0 0 14px;
}
.starters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.starter-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fff;
}
.starter-card:hover {
  border-color: var(--starter-colour);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.starter-card-top {
  height: 5px;
  background: var(--starter-colour);
}
.starter-card-body {
  padding: 14px 16px 16px;
  display: flex; flex-direction: column; gap: 6px;
}
.starter-title {
  font-size: 13px; font-weight: 700; color: #111827; margin: 0;
}
.starter-blurb {
  font-size: 12px; color: #6b7280; margin: 0; line-height: 1.5;
}
.starter-btn {
  font-size: 12px; font-weight: 600;
  color: var(--starter-colour);
  margin-top: 4px;
  display: inline-block;
  transition: opacity 0.15s;
}
.starter-card:hover .starter-btn { opacity: 0.8; }

/* ── My Session Notes ────────────────────────────────── */
.btn-my-notes {
  background: #f3f4f6; color: #374151;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  padding: 8px 14px; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.btn-my-notes:hover { background: #fef9c3; border-color: #fde68a; color: #92400e; }
.btn-my-notes.notes-active { background: #fef9c3; border-color: #fbbf24; color: #92400e; }

.notes-panel {
  border-bottom: 1px solid #fde68a;
  background: #fefce8;
  padding: 14px 24px;
  flex-shrink: 0;
}
.notes-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.notes-panel-title { font-size: 13px; font-weight: 600; color: #92400e; }
.notes-close {
  background: none; border: none; color: #92400e;
  font-size: 16px; cursor: pointer; line-height: 1; padding: 0;
  opacity: 0.6; transition: opacity 0.15s;
}
.notes-close:hover { opacity: 1; }
.notes-textarea {
  width: 100%; box-sizing: border-box;
  border: 1.5px solid #fde68a; border-radius: 8px;
  background: #fffdf0; color: #1c1917;
  padding: 10px 14px; font-size: 13px;
  font-family: inherit; resize: none; outline: none;
  line-height: 1.6; transition: border-color 0.15s;
}
.notes-textarea:focus { border-color: #f59e0b; }

/* ── Quiz review button in overview ──────────────────── */
.btn-review-quiz {
  margin-left: 8px;
  background: none; color: #6b7280;
  border: 1.5px solid #e5e7eb; border-radius: 6px;
  padding: 3px 10px; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-review-quiz:hover { color: #1e40af; border-color: #1e40af; background: #eff6ff; }

/* ── Quiz review phase ───────────────────────────────── */
.quiz-review-container {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column;
}
.quiz-review-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.btn-back-to-overview {
  background: none; border: none; color: #6b7280;
  font-size: 13px; cursor: pointer; padding: 0 0 10px;
  display: block; transition: color 0.15s;
}
.btn-back-to-overview:hover { color: #1e40af; }
.review-heading { font-size: 18px; font-weight: 700; color: #111827; margin: 0; }

.review-questions {
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.review-q-row {
  background: #f9fafb; border: 1.5px solid #e5e7eb;
  border-radius: 12px; padding: 18px 20px;
  display: flex; flex-direction: column; gap: 10px;
}
.review-q-meta { display: flex; align-items: center; gap: 10px; }
.review-q-num { font-size: 12px; font-weight: 700; color: #6b7280; }
.review-q-score { font-size: 13px; font-weight: 700; }
.review-badge {
  font-size: 11px; font-weight: 600;
  border-radius: 20px; padding: 3px 10px;
}
.review-q-text { font-size: 14px; font-weight: 600; color: #111827; margin: 0; line-height: 1.5; }
.review-answer-block {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 10px 14px;
}
.review-answer-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px; }
.review-answer-text { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
.review-feedback { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; font-style: italic; }
.model-answer-block {
  background: #f0f9ff; border: 1px solid #bae6fd;
  border-radius: 8px; padding: 10px 14px; text-align: left; margin-top: 10px;
}
.model-answer-label { font-size: 11px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px; }
.model-answer-text { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
.model-answer-keypoint { font-size: 12px; color: #6b7280; margin: 6px 0 0; line-height: 1.5; font-style: italic; }

/* ── Completion actions ───────────────────────────────── */
.completion-actions { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.btn-download-cert {
  background: #1e40af; color: #fff;
  border: none; border-radius: 10px;
  padding: 12px 28px; font-size: 15px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
}
.btn-download-cert:hover { background: #1d3a98; }

/* ── Certificate modal ───────────────────────────────── */
.certificate-modal {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.cert-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
}
.certificate-card {
  position: relative; z-index: 1;
  background: #fff;
  border: 3px solid #00b1e0;
  border-radius: 16px;
  padding: 48px 56px;
  max-width: 560px; width: 90%;
  text-align: center;
  display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.cert-logo { font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #00b1e0; }
.cert-title { font-size: 22px; font-weight: 800; color: #111827; margin: 0; }
.cert-subtitle { font-size: 13px; color: #6b7280; margin: 0; }
.cert-advisor-name { font-size: 26px; font-weight: 700; color: #1e40af; margin: 4px 0; }
.cert-body { font-size: 13px; color: #6b7280; margin: 0; }
.cert-course-name { font-size: 18px; font-weight: 700; color: #111827; margin: 4px 0; line-height: 1.3; }
.cert-date { font-size: 13px; color: #9ca3af; margin: 0; }
.cert-stats { display: flex; gap: 32px; justify-content: center; margin: 8px 0; }
.cert-stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cert-stat-num { font-size: 28px; font-weight: 800; color: #0d9488; line-height: 1; }
.cert-stat-label { font-size: 11px; color: #6b7280; font-weight: 500; }
.cert-actions { display: flex; gap: 10px; justify-content: center; margin-top: 8px; }
.btn-cert-print {
  background: #1e40af; color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 22px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-cert-print:hover { background: #1d3a98; }
.btn-cert-close {
  background: none; color: #6b7280;
  border: 1.5px solid #d1d5db; border-radius: 8px;
  padding: 10px 18px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-cert-close:hover { color: #374151; border-color: #9ca3af; }

/* ── Print: show certificate only ────────────────────── */
@media print {
  body > * { display: none !important; }
  .certificate-modal { display: flex !important; position: static !important; }
  .cert-backdrop { display: none !important; }
  .cert-actions { display: none !important; }
  .certificate-card { box-shadow: none !important; border-color: #ccc !important; }
}
</style>

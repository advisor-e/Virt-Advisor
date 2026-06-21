<template lang="pug">
.advisor-container(:class="{ 'container-chat': mode }")
  //- Header
  .advisor-header
    .advisor-header-inner
      .advisor-logo
        .advisor-logo-icon
          svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 48" width="36" height="40")
            line(x1="22" y1="3" x2="5" y2="44" stroke="#90CEE8" stroke-width="11" stroke-linecap="round")
            line(x1="22" y1="3" x2="39" y2="42" stroke="#00AEEF" stroke-width="11" stroke-linecap="round")
            circle(cx="39" cy="42" r="7.5" fill="#1B2D6E")
        div
          h1.advisor-title {{ $t('header.title') }}
          p.advisor-subtitle {{ $t('header.subtitle') }}
      .header-actions
        .lang-picker(ref="langPicker")
          button.lang-btn(@click="toggleLangPicker")
            span {{ currentLanguageName }}
            svg(xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="currentColor" style="opacity:0.7;flex-shrink:0")
              path(d="M0 0l5 6 5-6z")
          .lang-panel(v-show="langPickerOpen")
            input.lang-search(
              ref="langSearch"
              v-model="langSearch"
              placeholder="Search language..."
              @keydown.esc="closeLangPicker"
            )
            .lang-list
              button.lang-opt(
                v-for="lang in filteredLanguages"
                :key="lang.code"
                @click="changeLocale(lang)"
                :class="{ 'lang-opt-active': $i18n.locale === lang.code, 'lang-opt-loading': loadingLang === lang.code }"
                :disabled="loadingLang !== null"
              )
                span.lang-opt-name {{ lang.name }}
                span.lang-opt-badge(v-if="loadingLang === lang.code") ⟳
                span.lang-opt-badge(v-else-if="$i18n.locale === lang.code") ✓
              p.lang-error(v-if="langError") {{ langError }}
        button.btn-cases(v-if="myCases.length > 0" @click="showCasesPanel = true")
          svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" width="15" height="15")
            path(stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z")
          span.btn-cases-label Case Studies
          span.cases-badge {{ myCases.length }}
        a.btn-firm-manager(href="/firm-manager" target="_blank") Firm Manager
        button.btn-clear(v-if="mode" @click="reset") {{ $t('header.backToMenu') }}
        button.btn-close(@click="closeSession" :title="$t('header.close')") ✕

  //- Mode selection
  .mode-screen(v-if="!mode && !profileOpen")
    .mode-hero
      p.mode-hero-eyebrow {{ $t('hero.eyebrow') }}
      h1.mode-hero-title {{ $t('hero.title') }}
      p.mode-hero-sub {{ $t('hero.sub') }}

    .mode-cards
      button.mode-card.card-client(@click="selectMode('client')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-client
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              path(stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")
              circle(cx="9" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round")
              path(stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.client.title') }}
            p.mode-card-desc {{ $t('mode.client.desc') }}
            span.mode-card-tag {{ $t('mode.client.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-discover(@click="selectMode('discover')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-discover
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              circle(cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round")
              path(stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.discover.title') }}
            p.mode-card-desc {{ $t('mode.discover.desc') }}
            span.mode-card-tag {{ $t('mode.discover.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-plan(@click="selectMode('plan')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-plan
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              rect(x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round")
              path(stroke-linecap="round" stroke-linejoin="round" d="M16 2v4M8 2v4M3 10h18")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.plan.title') }}
            p.mode-card-desc {{ $t('mode.plan.desc') }}
            span.mode-card-tag {{ $t('mode.plan.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-learn(@click="selectMode('learn')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-learn
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              path(stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z")
              path(stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.learn.title') }}
            p.mode-card-desc {{ $t('mode.learn.desc') }}
            span.mode-card-tag {{ $t('mode.learn.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-course(@click="selectMode('course')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-course
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              path(stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z")
              path(stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0 1 21 18.5a12.083 12.083 0 0 1-9 0 12.083 12.083 0 0 1-9-0.5v-4.5l3.84 1.922z")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.course.title') }}
            p.mode-card-desc {{ $t('mode.course.desc') }}
            span.mode-card-tag {{ $t('mode.course.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-progress(@click="selectMode('progression')")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-progress
            svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="26" height="26")
              path(stroke-linecap="round" stroke-linejoin="round" d="M3 17l4-8 4 4 4-6 4 3")
              path(stroke-linecap="round" stroke-linejoin="round" d="M3 20h18")
          .mode-card-body
            h2.mode-card-title {{ $t('mode.progress.title') }}
            p.mode-card-desc {{ $t('mode.progress.desc') }}
            span.mode-card-tag {{ $t('mode.progress.tag') }}
          span.mode-card-arrow →

      button.mode-card.card-profile(@click="openProfile")
        .card-top-bar
        .mode-card-inner
          .mode-card-icon-wrap.icon-profile 🎯
          .mode-card-body
            h2.mode-card-title {{ $t('profile.title') }}
            p.mode-card-desc(v-if="!profileSaved") {{ $t('profile.descEmpty') }}
            p.mode-card-desc(v-else) {{ $t('profile.descSaved') }}
            span.mode-card-tag(:class="{ 'tag-empty': !profileSaved }") {{ profileSaved ? $t('profile.tagActive') : $t('profile.tagEmpty') }}
          span.mode-card-arrow →

  //- Section banner — shown whenever a mode is active
  .section-banner(v-if="mode" :class="'banner-' + mode")
    span.section-banner-label {{ sectionBannerLabel }}

  //- Course builder
  CourseBuilder(
    v-if="mode === 'course'"
    :advisorId="advisorId"
    :firmId="firmId"
    :apiToken="apiToken"
    :advisorProfile="advisorProfile"
    :orgTemplateIds="orgTemplateIds"
    :isFirmManager="isFirmManager"
    @exit="reset"
    @openFirmDashboard="selectMode('firm')"
  )

  //- Firm dashboard
  FirmDashboard(
    v-else-if="mode === 'firm'"
    :firmId="advisorId"
    :firmName="advisorProfile && advisorProfile.firmName ? advisorProfile.firmName : 'My Firm'"
  )

  //- Capability progression
  AdvisorProgression(
    v-else-if="mode === 'progression'"
    :advisorId="advisorId"
    :firmId="firmId"
    :apiToken="apiToken"
    :isFirmManager="isFirmManager"
    @exit="reset"
  )

  //- Conversation
  .messages-area(v-else-if="mode && mode !== 'course' && mode !== 'firm' && mode !== 'progression'" ref="messagesArea")
    .messages-list
      div(
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', msg.role === 'user' ? 'message-user' : 'message-advisor']"
      )
        .message-avatar(v-if="msg.role === 'assistant'") VA
        div(:class="['message-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-advisor']")
          div(v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" class="prose")
          p(v-else) {{ msg.content }}

      //- Streaming
      .message.message-advisor(v-if="isStreaming")
        .message-avatar VA
        .message-bubble.bubble-advisor
          div(v-if="streamingText" v-html="renderMarkdown(streamingText)" class="prose")
          .typing-indicator(v-else)
            span
            span
            span

      //- Retry button — shown after a failed request
      .retry-row(v-if="showRetry && !isStreaming")
        button.retry-btn(@click="retryLastMessage") Try again

      //- Growth Curve selector — shown when AI signals privately owned branch
      .growth-curve-card(v-if="showGrowthCurveSelector")
        p.growth-curve-title Where would you place them on the Growth Curve?
        .growth-stage-list
          label.growth-stage-opt(
            v-for="stage in growthStages"
            :key="stage.name"
            :class="{ 'growth-stage-selected': selectedGrowthStage === stage.name }"
          )
            input(type="radio" :value="stage.name" v-model="selectedGrowthStage")
            .growth-stage-body
              span.growth-stage-name {{ stage.name }}
              span.growth-stage-desc {{ stage.description }}
        button.growth-curve-submit(
          @click="submitGrowthStage"
          :disabled="!selectedGrowthStage"
        ) Confirm selection

      //- Advisory Staircase selector — shown when engagement depth question fires
      .growth-curve-card(v-if="showStaircaseSelector")
        p.growth-curve-title Where would you say your current engagement with this client sits on the Advisory Staircase?
        .growth-stage-list
          label.growth-stage-opt(
            v-for="step in staircaseSteps"
            :key="step.name"
            :class="{ 'growth-stage-selected': selectedStaircaseStep === step.name }"
          )
            input(type="radio" :value="step.name" v-model="selectedStaircaseStep")
            .growth-stage-body
              span.growth-stage-name {{ step.name }}
              span.growth-stage-desc {{ step.description }}
        button.growth-curve-submit(
          @click="submitStaircaseStep"
          :disabled="!selectedStaircaseStep"
        ) Confirm selection

      //- Fin Mgt Theme selector — shown when Forecasting/Management Reporting scenario detected
      .fin-mgt-card(v-if="showFinMgtThemeSelector")
        p.fin-mgt-title Where is your client starting from? Select the theme that best reflects their current relationship with financial management.
        .fin-mgt-theme-list
          label.fin-mgt-theme-opt(
            v-for="theme in finMgtThemes"
            :key="theme.name"
            :class="{ 'fin-mgt-theme-selected': selectedFinMgtTheme === theme.name }"
          )
            input(type="radio" :value="theme.name" v-model="selectedFinMgtTheme")
            .fin-mgt-theme-body
              span.fin-mgt-theme-name {{ theme.name }}
              span.fin-mgt-theme-desc {{ theme.problem }}
        button.fin-mgt-submit(
          @click="submitFinMgtTheme"
          :disabled="!selectedFinMgtTheme"
        ) Confirm selection

      //- Session length selector — shown when session length question fires
      .session-length-card(v-if="showSessionLengthSelector")
        p.session-length-title How long can you allow per meeting?
        .session-length-list
          button.session-length-opt(
            v-for="opt in sessionLengthOptions"
            :key="opt"
            :class="{ 'session-length-selected': selectedSessionLength === opt }"
            @click="selectedSessionLength = opt"
          ) {{ opt }}
        button.session-length-submit(
          @click="submitSessionLength"
          :disabled="!selectedSessionLength"
        ) Confirm selection

      //- Domain selector — advisor confirms the detected advisory area before domain questions begin
      .domain-selector-card(v-if="showDomainSelector")
        p.domain-selector-title Which area best describes the primary focus for this client?
        .domain-selector-list
          label.domain-selector-opt(
            v-for="opt in domainSelectorOptions"
            :key="opt.id"
            :class="{ 'domain-selector-selected': selectedDomainId === opt.id, 'domain-selector-suggested': opt.id === suggestedDomainId && selectedDomainId !== opt.id }"
          )
            input(type="radio" :value="opt.id" v-model="selectedDomainId")
            span {{ opt.label }}
        button.domain-selector-submit(
          @click="submitDomainSelection"
          :disabled="!selectedDomainId"
        ) Confirm

      //- Primary issue selector — shown after domain is confirmed
      .primary-issue-card(v-if="showPrimaryIssueSelector")
        p.primary-issue-title Which of these best captures the core problem for this client?
        .primary-issue-list
          label.primary-issue-opt(
            v-for="opt in primaryIssueOptions"
            :key="opt"
            :class="{ 'primary-issue-selected': selectedPrimaryIssue === opt }"
          )
            input(type="radio" :value="opt" v-model="selectedPrimaryIssue")
            span {{ opt }}
        button.primary-issue-submit(
          @click="submitPrimaryIssue"
          :disabled="!selectedPrimaryIssue"
        ) Confirm
        button.primary-issue-none(@click="noneOfTheseApply") None of these fit — let me describe it differently

      //- Win-work switch offer — when the advisor has no client problem and wants to win advisory work
      .sell-switch-card(v-if="showSellSwitch")
        button.sell-switch-yes(@click="acceptSellSwitch") Yes, help me sell
        button.sell-switch-no(@click="declineSellSwitch") No, stay on this

      //- Why this recommendation — decision trace (shown after a recommendation)
      .trace-panel(v-if="lastTrace && recommendationDelivered")
        button.trace-toggle(@click="showTracePanel = !showTracePanel")
          | {{ showTracePanel ? '▾' : '▸' }} Why this recommendation
        .trace-body(v-if="showTracePanel")
          .trace-row
            span.trace-label Area I focused on
            span.trace-value {{ lastTrace.domain.label || lastTrace.domain.id || '—' }}
          .trace-row
            span.trace-label What shaped the advice
            span.trace-value {{ traceLensSummary }}
          .trace-section
            .trace-section-title Distinctions
            p.trace-note {{ lastTrace.distinctions.note }}
            p.trace-value(v-if="traceBoostList.length")
              span Boosted here:
              span.trace-boost(v-for="b in traceBoostList" :key="b.title")  {{ b.title }} (+{{ b.boost }})
            p.trace-note(v-else) No distinction changed the scoring in this area.
          .trace-section(v-if="lastTrace.distinctions.nearMisses && lastTrace.distinctions.nearMisses.length")
            .trace-section-title Filed elsewhere — may belong here
            p.trace-note These distinctions of yours live in another area but matched this situation. Moving one into “{{ lastTrace.domain.label || lastTrace.domain.id }}” (Firm Manager → Advisory Distinctions) would let it apply to sessions like this:
            p.trace-nearmiss(v-for="nm in lastTrace.distinctions.nearMisses" :key="nm.id")
              span.trace-value {{ nm.description }}
              span.trace-note  — currently in {{ nm.domain }}
          .trace-section
            .trace-section-title How the templates scored
            table.trace-scores
              tr
                th Template
                th Score
                th Why
              tr(v-for="t in lastTrace.templateScores.slice(0, 6)" :key="t.rank")
                td {{ t.title }}
                td {{ t.score }}
                td.trace-reasons {{ humanizeReasons(t.matchReasons) }}

      //- Intake prompt — shown after Phase 3, before advisor dismisses
      .intake-prompt-card(v-if="showIntakePrompt")
        .save-prompt-text
          strong Record a quick observation?
          span  Do you want to do this now while it's fresh in your memory?
        .save-prompt-actions
          button.save-prompt-yes(@click="startIntake") Yes, let's do it
          button.save-prompt-no(@click="dismissIntake") Not now

      //- Save prompt — only shown after Phase 3 recommendation, never alongside a VA question
      .save-prompt-card(v-if="showSavePrompt")
        .save-prompt-text
          strong Save this session?
          span  Keep a record of this conversation as a case study for future reference.
        .save-prompt-actions
          button.save-prompt-yes(@click="showSavePanel = true; savePromptDismissed = true") Save case study
          button.save-prompt-no(@click="savePromptDismissed = true") Not now

  //- Input (only shown once mode is selected)
  .input-area(v-if="mode && mode !== 'course' && mode !== 'progression'")

    //- Voice status bar
    .voice-bar(v-if="speechSupported")

      //- State 1: Idle
      .voice-state.voice-idle(v-if="!isListening && !inputText.trim()")
        button.voice-btn.voice-btn-idle(@click="toggleListening" :disabled="isStreaming")
          svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
            path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
          | {{ $t('voice.tapToSpeak') }}

      //- State 2: Recording
      .voice-state.voice-recording(v-else-if="isListening")
        span.recording-dot
        span.recording-label {{ $t('voice.recording') }}
        button.voice-btn.voice-btn-stop(@click="toggleListening")
          svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
            rect(x="6" y="6" width="12" height="12" rx="2")
          | {{ $t('voice.stopRecording') }}

      //- State 3: Ready to send
      .voice-state.voice-ready(v-else-if="inputText.trim()")
        svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
          path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
        span.ready-label {{ $t('voice.capturedReview') }}
        button.voice-btn.voice-btn-redo(@click="toggleListening")
          svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
            path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
          | {{ $t('voice.recordAgain') }}

    //- Text input + send
    .input-inner
      textarea.message-input(
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage()"
        :placeholder="isListening ? $t('input.listening') : inputPlaceholder"
        rows="3"
        :disabled="isStreaming"
        :class="{ 'input-listening': isListening, 'input-ready': !isListening && inputText.trim() }"
      )
      button.send-btn(
        @click="sendMessage()"
        :disabled="!inputText.trim() || isStreaming || isListening"
      )
        span(v-if="isStreaming") {{ $t('input.sending') }}
        span(v-else) {{ $t('input.send') }}

    p.input-hint(v-if="!speechSupported") {{ $t('input.hint') }}

    //- Save case study button — always visible once conversation has started
    .input-save-row(v-if="canSave && !saveSuccess")
      button.btn-save-inline(@click="showSavePanel = true; savePromptDismissed = true" :disabled="isStreaming")
        svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" width="13" height="13")
          path(stroke-linecap="round" stroke-linejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h2m3-3h6l3 3v10a2 2 0 01-2 2h-1M9 3h6l3 3")
        | Save as case study
      span.save-inline-saved(v-if="saveSuccess") ✓ Saved

  //- Save case study panel
  .save-overlay(v-if="showSavePanel" @click.self="showSavePanel = false")
    .save-modal
      h2.save-title Save as case study
      p.save-desc Give this session a title and choose who can see it.

      label.save-label Session title
      input.save-input(
        v-model="saveTitle"
        placeholder="e.g. Cash flow challenge — retail client"
        maxlength="100"
        ref="saveTitleInput"
      )

      label.save-label Visibility
      .save-visibility
        label.vis-opt(:class="{ 'vis-active': saveVisibility === 'shared' }")
          input(type="radio" v-model="saveVisibility" value="shared")
          .vis-body
            span.vis-icon 🏢
            div
              strong Share with my firm
              p Advisors in your firm can see this and the AI will reference it in their sessions
        label.vis-opt(:class="{ 'vis-active': saveVisibility === 'private' }")
          input(type="radio" v-model="saveVisibility" value="private")
          .vis-body
            span.vis-icon 🔒
            div
              strong My eyes only
              p Only you can see this — the AI will reference it only in your sessions

      p.save-success(v-if="saveSuccess") ✓ Saved successfully
      p.save-error(v-if="saveError") {{ saveError }}

      .save-actions
        button.save-btn-confirm(@click="saveSession" :disabled="!saveTitle.trim()") Save case study
        button.save-btn-cancel(@click="showSavePanel = false") Cancel

  //- Advisor Profile screen (inline, same as chat view)
  .profile-screen(v-if="profileOpen && !mode")
    .profile-modal-header
      div
        h2.profile-modal-title {{ $t('profile.title') }}
        p.profile-modal-sub Tell me about yourself — I'll use this to tailor every recommendation.
      button.profile-modal-close(@click="profileOpen = false") ✕

    .profile-modal-body
        .profile-q(
          v-for="(q, index) in profileQuestions"
          :key="q.field"
          v-if="index <= profileStep"
        )
          p.profile-q-label {{ q.question }}

          //- Completed question — voice bar + editable textarea
          .profile-q-completed(v-if="index < profileStep")
            .voice-bar(v-if="speechSupported")
              .voice-state.voice-idle(v-if="profileRecordingField !== q.field")
                button.voice-btn.voice-btn-idle(@click="toggleProfileListening(q.field)")
                  svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                    path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                  | {{ $t('voice.tapToSpeak') }}
              .voice-state.voice-recording(v-else-if="profileRecordingField === q.field")
                span.recording-dot
                span.recording-label {{ $t('voice.recording') }}
                button.voice-btn.voice-btn-stop(@click="toggleProfileListening(q.field)")
                  svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                    rect(x="6" y="6" width="12" height="12" rx="2")
                  | {{ $t('voice.stopRecording') }}
            textarea.profile-q-textarea.profile-q-textarea-done(
              v-model="advisorProfile[q.field]"
              :class="{ 'pq-recording': profileRecordingField === q.field }"
              @change="saveField"
              @input="autoResizeTextarea($event.target)"
            )

          //- Current question — interactive
          template(v-if="index === profileStep")
            .voice-bar(v-if="speechSupported")
              .voice-state.voice-idle(v-if="profileRecordingField !== q.field && !advisorProfile[q.field]")
                button.voice-btn.voice-btn-idle(@click="toggleProfileListening(q.field)")
                  svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                    path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                  | {{ $t('voice.tapToSpeak') }}
              .voice-state.voice-recording(v-else-if="profileRecordingField === q.field")
                span.recording-dot
                span.recording-label {{ $t('voice.recording') }}
                button.voice-btn.voice-btn-stop(@click="toggleProfileListening(q.field)")
                  svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                    rect(x="6" y="6" width="12" height="12" rx="2")
                  | {{ $t('voice.stopRecording') }}
              .voice-state.voice-ready(v-else)
                svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                  path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                span.ready-label {{ $t('voice.capturedReview') }}
                button.voice-btn.voice-btn-redo(@click="toggleProfileListening(q.field)")
                  svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                    path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                  | {{ $t('voice.recordAgain') }}

            textarea.profile-q-textarea(
              v-if="advisorProfile[q.field] || profileRecordingField === q.field"
              v-model="advisorProfile[q.field]"
              :class="{ 'pq-recording': profileRecordingField === q.field }"
              @input="autoResizeTextarea($event.target)"
            )

            .profile-q-advance(v-if="advisorProfile[q.field] && advisorProfile[q.field].trim()")
              button.profile-advance-btn(@click="saveFieldAndAdvance")
                | {{ index < profileQuestions.length - 1 ? 'Save & continue →' : 'Save profile' }}

        .profile-q-actions
          button.profile-clear-btn(v-if="profileSaved" @click="clearProfile") Clear
          button.profile-clear-btn(@click="profileOpen = false") Main menu

  //- My Cases panel
  .cases-overlay(v-if="showCasesPanel" @click.self="closeCasesPanel")
    .cases-modal
      .cases-modal-header
        div
          h2.cases-modal-title My Saved Cases
          p.cases-modal-sub {{ myCases.length }} session{{ myCases.length === 1 ? '' : 's' }} saved
        button.cases-close(@click="closeCasesPanel") ✕

      .cases-empty(v-if="myCases.length === 0")
        p No saved cases yet. Save a session using the 💾 button during a conversation.

      .cases-list(v-else)
        .case-item(v-for="c in myCases" :key="c.id")
          .case-header(@click="toggleCase(c.id)")
            .case-meta
              span.case-title {{ c.title }}
              .case-tags
                span.case-mode-tag {{ modeName(c.mode) }}
                span.case-vis-tag {{ c.visibility === 'shared' ? '🏢 Shared' : '🔒 Private' }}
                span.case-feedback-tag(v-if="c.feedbackPending") Feedback welcome
            .case-header-right
              span.case-date {{ formatDate(c.createdAt) }}
              span.case-chevron {{ expandedCaseId === c.id ? '▲' : '▼' }}

          .case-body(v-if="expandedCaseId === c.id")
            .case-visibility-row
              button.visibility-toggle-btn(
                :class="c.visibility === 'shared' ? 'vis-btn-make-private' : 'vis-btn-share'"
                :disabled="visibilityBusyId === c.id"
                @click="toggleVisibility(c.id)"
              ) {{ c.visibility === 'shared' ? 'Make private' : 'Share with the firm' }}

            .case-summary
              p.case-summary-label AI Recommendation Summary
              p.case-summary-text {{ c.summary }}

            .case-transcript-toggle(v-if="c.transcript && c.transcript.length")
              button.transcript-btn(@click="transcriptOpenId = transcriptOpenId === c.id ? null : c.id")
                | {{ transcriptOpenId === c.id ? '▲ Hide conversation' : '▼ Read Case Study Conversation' }}

            .case-transcript(v-if="transcriptOpenId === c.id && c.transcript && c.transcript.length")
              .transcript-msg(
                v-for="(msg, i) in c.transcript"
                :key="i"
                :class="msg.role === 'user' ? 'transcript-msg-user' : 'transcript-msg-va'"
              )
                span.transcript-role {{ msg.role === 'user' ? 'You' : 'VA' }}
                div(v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" class="prose transcript-prose")
                p.transcript-text(v-else) {{ msg.content }}

            .case-review-section
              h3.review-heading Post-Delivery Review
              p.review-sub After delivering this session to your client, record what actually happened. The AI will use this to improve future recommendations.

              .review-field
                label.review-label ⚠ What went less well?
                .review-voice-bar(v-if="speechSupported")
                  .voice-state.voice-idle(v-if="reviewRecordingField !== 'wentLess' && !reviewDraft.wentLess")
                    button.voice-btn.voice-btn-idle(@click="toggleReviewListening('wentLess')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | {{ $t('voice.tapToSpeak') }}
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'wentLess'")
                    span.recording-dot
                    span.recording-label {{ $t('voice.recording') }}
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('wentLess')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | {{ $t('voice.stopRecording') }}
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label {{ $t('voice.capturedReview') }}
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('wentLess')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.wentLess || reviewRecordingField === 'wentLess'"
                  v-model="reviewDraft.wentLess"
                  placeholder="What was harder than expected? What didn't land well?"
                  :class="{ 'pq-recording': reviewRecordingField === 'wentLess' }"
                  @input="autoResizeTextarea($event.target)"
                )

              .review-field
                label.review-label ✓ What went well?
                .review-voice-bar(v-if="speechSupported")
                  .voice-state.voice-idle(v-if="reviewRecordingField !== 'wentWell' && !reviewDraft.wentWell")
                    button.voice-btn.voice-btn-idle(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | {{ $t('voice.tapToSpeak') }}
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'wentWell'")
                    span.recording-dot
                    span.recording-label {{ $t('voice.recording') }}
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | {{ $t('voice.stopRecording') }}
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label {{ $t('voice.capturedReview') }}
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.wentWell || reviewRecordingField === 'wentWell'"
                  v-model="reviewDraft.wentWell"
                  placeholder="What worked? What did the client respond well to?"
                  :class="{ 'pq-recording': reviewRecordingField === 'wentWell' }"
                  @input="autoResizeTextarea($event.target)"
                )

              .review-field
                label.review-label → Suggested changes for similar cases
                .review-voice-bar(v-if="speechSupported")
                  .voice-state.voice-idle(v-if="reviewRecordingField !== 'changesRecommended' && !reviewDraft.changesRecommended")
                    button.voice-btn.voice-btn-idle(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | {{ $t('voice.tapToSpeak') }}
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'changesRecommended'")
                    span.recording-dot
                    span.recording-label {{ $t('voice.recording') }}
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | {{ $t('voice.stopRecording') }}
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label {{ $t('voice.capturedReview') }}
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.changesRecommended || reviewRecordingField === 'changesRecommended'"
                  v-model="reviewDraft.changesRecommended"
                  placeholder="What would you do differently next time?"
                  :class="{ 'pq-recording': reviewRecordingField === 'changesRecommended' }"
                  @input="autoResizeTextarea($event.target)"
                )

              .review-actions
                button.review-save-btn(@click="saveReview(c.id)") {{ reviewSavedId === c.id ? '✓ Saved' : 'Save review' }}
                button.review-promote-btn(
                  v-if="isFirmManager"
                  @click="promoteCase(c)"
                  :disabled="promoteSuccessId === c.id"
                )
                  | {{ promoteSuccessId === c.id ? '✓ Added to coaching reference' : 'Promote to coaching reference' }}
                span.promote-error(v-if="promoteErrorId === c.id") Failed — check server connection
                button.review-delete-btn(
                  @click="confirmDeleteId === c.id ? deleteCaseAndRefresh(c.id) : confirmDeleteId = c.id"
                )
                  | {{ confirmDeleteId === c.id ? 'Confirm delete' : 'Delete case' }}
                button.review-cancel-btn(v-if="confirmDeleteId === c.id" @click="confirmDeleteId = null") Cancel

      .cases-footer
        button.cases-footer-close(@click="closeCasesPanel")
          svg(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="15" height="15")
            path(stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18")
          | Return to menu
</template>

<script>
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'
import { createCase } from '~/utils/cases'
import { preprocessAIResponse } from '~/utils/markdownPreprocessor'
import speechMixin, { BCP47_MAP } from '~/mixins/speechMixin'
import localeMixin from '~/mixins/localeMixin'
import caseMixin from '~/mixins/caseMixin'
import growthFundamentals from '~/data/growth-fundamentals.json'
import advisoryStaircase from '~/data/advisory-staircase.json'
import finMgtTable from '~/data/fin-mgt-table.json'

const _md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: true })
_md.disable(['image', 'html_inline', 'html_block'])

// Primary issues per domain — Workshop 1 output, authored by Mike Barnes 2026-06-02
const PRIMARY_ISSUES = {
  profit: ['Cost of sales has increased', 'Excessive discounting eroding margin', 'Sales Revenue — low volume, revenue is the constraint', 'Fixed overhead costs grown beyond what revenue can support', 'Asset utilisation below viability threshold'],
  staff: ['Too few qualified staff', 'Inexperienced or insufficiently trained staff', 'No internal training structures', 'Poor management practices — weak communication, feedback and formal discipline', 'Roles and responsibilities poorly defined', 'Weak hiring practices'],
  'data-systems': ['No enforceable data capture methods', 'Poor data integrity', 'Too much lag indicator data, not enough lead indicators', 'Narrow data spread'],
  'sales-marketing': ['Sales Execution — no visible sales process or poor sales training', 'Marketing Foundation — poor outbound messaging, no target market, no marketing statements', 'Product Market Fit — poor product fit or market acceptance', 'Poor positioning or brand perception'],
  forecasting: ['Poor financial literacy', 'Over-trading', 'Cost structure imbalance'],
  governance: ['Poor boardroom dynamics or partner/owner disputes', 'Lack of financial controls', 'Poor decision quality', 'Weak communication of expectations with no documentation', 'Culture left to chance', 'Personality and skill diversity not actively pursued'],
  strategy: ['Lack of clarity or belief that the current business model will remain competitive', 'Poor business metrics or undefined operational objectives', 'No defined objectives means no communicated direction'],
  systems: ['Processes are either undefined or over-engineered', 'No regular structured review of practices', 'Siloed operations', 'Supply line disruptions or poor quality controls'],
  valuation: ['Transaction Readiness'],
  risk: ['Risk Framework — no systematic process to identify and mitigate risks'],
  succession: ['Owner Purpose and Status — no defined life after work', 'Sibling or family inequality', 'No clear succession pathway']
}

export default {
  name: 'VirtualAdvisor',
  mixins: [speechMixin, localeMixin, caseMixin],

  props: {
    orgTemplateIds: {
      type: Array,
      default: null
    },
    advisorId: {
      type: String,
      default: 'local-advisor'
    },
    firmId: {
      type: String,
      default: 'local-firm'
    },
    isFirmManager: {
      type: Boolean,
      default: false
    },
    apiToken: {
      type: String,
      default: 'dev-local-bypass'
    }
  },

  data () {
    return {
      mode: null,
      messages: [],
      inputText: '',
      isStreaming: false,
      streamingText: '',
      profileOpen: false,
      profileSaved: false,
      profileStep: 0,
      advisorProfile: { advisorRole: '', experience: '', clientDemographic: '', enjoyment: '', technicalStrengths: '', toolsComfort: '', notes: '' },
      showSavePanel: false,
      saveTitle: '',
      saveVisibility: 'shared',
      saveSuccess: false,
      saveError: null,
      savePromptDismissed: false,
      sessionId: null,
      showRetry: false,
      lastQuery: null,
      recommendationDelivered: false,
      sessionDomain: null,
      sessionTemplates: [],
      // Decision trace for the "Why this recommendation" panel (set on the SSE
      // 'trace' event at recommendation time); null until a recommendation lands.
      lastTrace: null,
      showTracePanel: false,
      intakeDismissed: false,
      intakeActive: false,
      intakeComplete: false,
      showGrowthCurveSelector: false,
      selectedGrowthStage: null,
      showStaircaseSelector: false,
      showSellSwitch: false,
      selectedStaircaseStep: null,
      showFinMgtThemeSelector: false,
      selectedFinMgtTheme: null,
      showSessionLengthSelector: false,
      selectedSessionLength: null,
      sessionLengthOptions: ['30 mins', '60 mins', '90 mins', '120 mins', 'Other'],
      showDomainSelector: false,
      selectedDomainId: null,
      suggestedDomainId: null,
      showPrimaryIssueSelector: false,
      selectedPrimaryIssue: null,
      primaryIssueDomain: null,
      // Single source of truth — themes read from data/fin-mgt-table.json (the
      // selector uses name + problem; the file's extra solution/template fields
      // ride along, unused here). Mirrors growthStages / staircaseSteps below.
      finMgtThemes: finMgtTable.themes,
      // Single source of truth — steps read from data/advisory-staircase.json.
      // Label keeps the "Step N:" prefix (the server derives the step number from it);
      // description uses the data file's selectorDescription wording.
      staircaseSteps: advisoryStaircase.steps.map(s => ({
        ...s,
        name: `Step ${s.step}: ${s.name}`,
        description: s.selectorDescription
      })),
      // Single source of truth — the on-screen selector reads name + description
      // from data/growth-fundamentals.json (the full framework rides along, unused here).
      growthStages: growthFundamentals.stages
    }
  },

  computed: {
    // Decision-trace helpers (the "Why this recommendation" panel).
    traceLensSummary () {
      if (!this.lastTrace) { return '' }
      const l = this.lastTrace.lenses || {}
      const parts = []
      if (l.engagementType) { parts.push(`${l.engagementType} engagement`) }
      if (l.complexityCeiling) { parts.push(`${l.complexityCeiling} ceiling`) }
      if (l.templateBudget !== null && l.templateBudget !== undefined) { parts.push(`budget ${l.templateBudget}`) }
      return parts.join(' · ')
    },
    traceBoostList () {
      const boosts = (this.lastTrace && this.lastTrace.distinctions && this.lastTrace.distinctions.boostsApplied) || {}
      return Object.keys(boosts).map(title => ({ title, boost: boosts[title] }))
    },
    primaryIssueOptions () {
      return (this.primaryIssueDomain && PRIMARY_ISSUES[this.primaryIssueDomain]) || []
    },
    domainSelectorOptions () {
      return [
        { id: 'profit', label: 'Profitability & Feasibility' },
        { id: 'staff', label: 'Staff & Team' },
        { id: 'data-systems', label: 'Data & Financial Systems' },
        { id: 'sales-marketing', label: 'Sales & Marketing' },
        { id: 'forecasting', label: 'Financial Management & Forecasting' },
        { id: 'governance', label: 'Governance & Leadership' },
        { id: 'strategy', label: 'Strategy & Planning' },
        { id: 'systems', label: 'Business Systems' },
        { id: 'valuation', label: 'Business Valuation' },
        { id: 'risk', label: 'Risk Management' },
        { id: 'succession', label: 'Succession & Exit Planning' },
        { id: 'conflict', label: 'Conflict & Dispute' },
        { id: 'eoy', label: 'End of Year' },
        { id: 'due-diligence', label: 'Due Diligence & Acquisitions' }
      ]
    },
    sectionBannerLabel () {
      const labels = {
        client: 'I have a client situation',
        discover: 'I want to find something specific',
        plan: 'I want to plan ahead',
        learn: 'I\'m interested in learning more',
        course: 'I want to build a course',
        firm: 'Team Dashboard',
        progression: 'My Progress'
      }
      return labels[this.mode] || ''
    },

    profileQuestions () {
      const experiencedPattern = /\b(yes|yeah|yep|years?|months?|weeks?|since|20\d\d|19\d\d|have been|i've been|been doing|been delivering|been working|been advising)\b/i
      const beginnerPattern = /\b(haven't|have not|no experience|never done|never have|not done|not yet|just starting|new to advisory|just beginning|don't have|do not have|mostly compliance|compliance only|only learning|still learning|just learning|very little|no advisory|haven't done|just told you)\b/i

      const roleText = this.advisorProfile.advisorRole || ''
      const expText = this.advisorProfile.experience || ''

      const hasExperience = experiencedPattern.test(expText)
      const beginnerFromRole = beginnerPattern.test(roleText)
      const beginnerFromExp = beginnerPattern.test(expText) || (expText.trim() && !hasExperience)
      const isBeginner = beginnerFromRole || beginnerFromExp

      const questions = [
        { field: 'advisorRole', question: this.$t('profile.questions.advisorRole') }
      ]

      // Only ask experience duration if role answer doesn't already make it clear they're a beginner
      if (!beginnerFromRole) {
        questions.push({ field: 'experience', question: this.$t('profile.questions.experience') })
      }

      // Client demographic — experienced get advisory client description, beginners get firm client base
      if (hasExperience && !isBeginner) {
        questions.push({ field: 'clientDemographic', question: this.$t('profile.questions.clientDemographic') })
      } else if (isBeginner) {
        questions.push({ field: 'clientDemographic', question: this.$t('profile.questions.clientDemographicBeginner') })
      }

      questions.push(
        {
          field: 'enjoyment',
          question: isBeginner
            ? this.$t('profile.questions.enjoymentBeginner')
            : this.$t('profile.questions.enjoyment')
        },
        {
          field: 'technicalStrengths',
          question: isBeginner
            ? this.$t('profile.questions.technicalStrengthsBeginner')
            : this.$t('profile.questions.technicalStrengths')
        },
        { field: 'toolsComfort', question: this.$t('profile.questions.toolsComfort') },
        { field: 'notes', question: this.$t('profile.questions.notes') }
      )
      return questions
    },
    inputPlaceholder () {
      return this.mode === 'discover'
        ? this.$t('input.placeholderDiscover')
        : this.$t('input.placeholderDefault')
    },
    conversationHistory () {
      return this.messages.map(m => ({ role: m.role, content: m.content }))
    },
    hasAdvisorProfile () {
      return !!(
        this.advisorProfile.advisorRole ||
        this.advisorProfile.experience ||
        this.advisorProfile.technicalStrengths ||
        this.advisorProfile.enjoyment ||
        this.advisorProfile.toolsComfort ||
        this.advisorProfile.notes
      )
    },
    profileSummary () {
      const text = this.advisorProfile.experience || this.advisorProfile.enjoyment || ''
      return text.length > 70 ? text.slice(0, 70) + '…' : text
    },
    canSave () {
      return !!this.mode && this.messages.filter(m => m.role === 'user').length >= 1
    },
    showIntakePrompt () {
      return this.recommendationDelivered && !this.isStreaming && !this.intakeDismissed && !this.intakeActive && !this.intakeComplete
    },
    showSavePrompt () {
      if (this.isStreaming || this.savePromptDismissed || this.saveSuccess) { return false }
      if (!this.mode) { return false }
      // Client mode: use the state machine flag — works in any language
      if (this.mode === 'client') {
        return this.recommendationDelivered
      }
      // Other modes (discover/plan/learn): show after the user has sent 3+ messages,
      // which reliably indicates a full recommendation exchange has occurred
      return this.messages.filter(m => m.role === 'user').length >= 3
    }
  },

  watch: {
    advisorProfile: {
      deep: true,
      handler () {
        this.$nextTick(() => { this.$nextTick(() => this.resizeAllTextareas()) })
      }
    },
    reviewDraft: {
      deep: true,
      handler () {
        this.$nextTick(() => { this.$nextTick(() => this.resizeAllTextareas()) })
      }
    },
    '$i18n.locale' (newLocale) {
      if (this.recognition) {
        this.recognition.lang = BCP47_MAP[newLocale] || 'en-US'
      }
      if (this.mode) {
        const currentMode = this.mode
        this.reset()
        this.$nextTick(() => this.selectMode(currentMode))
      }
    }
  },

  beforeDestroy () {
    if (this._saveTimer) { clearTimeout(this._saveTimer) }
    if (this._abortController) { this._abortController.abort() }
  },

  mounted () {
    this._loadProfile()
  },

  methods: {
    // Translate the engine's terse score reasons into plain language for the
    // "Why this recommendation" panel. Unknown reasons pass through as-is.
    humanizeReasons (reasons) {
      return (reasons || []).map((r) => {
        const m = /^distinction:\+(\d+)$/.exec(r)
        if (m) { return `firm distinction +${m[1]}` }
        if (r.startsWith('tag:')) { return 'matches the area' }
        if (r === 'domain:primary_subsection') { return 'core to this area' }
        if (r.startsWith('engagement:')) { return 'fits the engagement type' }
        return r
      }).join(', ')
    },

    autoResizeTextarea (el) {
      if (!el) { return }
      el.style.height = '0'
      el.style.height = el.scrollHeight + 'px'
    },

    resizeAllTextareas () {
      document.querySelectorAll('.profile-q-textarea, .review-textarea').forEach(el => this.autoResizeTextarea(el))
    },

    _loadProfile () {
      const saved = localStorage.getItem('va_advisor_profile')
      if (saved) {
        try {
          this.advisorProfile = { ...this.advisorProfile, ...JSON.parse(saved) }
          this.profileSaved = true
        } catch (e) {
          console.warn('[va:profile] Failed to parse saved profile:', e.message)
        }
      }
    },

    startIntake () {
      this.intakeDismissed = true
      this.intakeActive = true
      this.inputText = 'Yes, let\'s record it now.'
      this.sendMessage('__intake__')
    },

    dismissIntake () {
      this.intakeDismissed = true
    },

    async saveSession () {
      this.saveError = null
      if (!this.saveTitle.trim()) { return }
      try {
        const lastAI = [...this.messages].reverse().find(m => m.role === 'assistant')
        const summary = lastAI ? lastAI.content.slice(0, 600) + (lastAI.content.length > 600 ? '…' : '') : ''
        // advisorId/firmId are NOT sent — the backend derives them from the token.
        await createCase({
          title: this.saveTitle.trim(),
          mode: this.mode,
          transcript: this.messages,
          summary,
          visibility: this.saveVisibility,
          domain: this.sessionDomain,
          templates: this.sessionTemplates,
          staircaseStep: this.selectedStaircaseStep,
          growthStage: this.selectedGrowthStage,
          finMgtTheme: this.selectedFinMgtTheme,
          feedbackPending: !this.intakeComplete
        }, this.apiToken)
        await this.refreshMyCases()
        this.saveSuccess = true
        this.saveTitle = ''
        if (this._saveTimer) { clearTimeout(this._saveTimer) }
        this._saveTimer = setTimeout(() => {
          this.saveSuccess = false
          this.showSavePanel = false
          this._saveTimer = null
        }, 1500)
      } catch (e) {
        this.saveError = 'Could not save. Please try again.'
      }
    },

    selectMode (selected) {
      if (this._abortController) { this._abortController.abort() }
      if (this.recognition) { this.recognition.stop() }
      this.isListening = false
      this.isStreaming = false
      this.streamingText = ''
      this.mode = selected
      const noConversation = ['course', 'firm']
      if (!noConversation.includes(selected)) {
        if (selected === 'client') {
          this.messages = []
          this.initClientSession()
        } else {
          this.messages = [{ role: 'assistant', content: this.$t(`opening.${selected}`) }]
        }
      }
      this.sessionId = null
      this.recommendationDelivered = false
      this.lastTrace = null
      this.showTracePanel = false
      this.sessionDomain = null
      this.sessionTemplates = []
      this.intakeDismissed = false
      this.intakeActive = false
      this.intakeComplete = false
      this.showGrowthCurveSelector = false
      this.selectedGrowthStage = null
      this.showStaircaseSelector = false
      this.selectedStaircaseStep = null
      this.showFinMgtThemeSelector = false
      this.selectedFinMgtTheme = null
      this.showSessionLengthSelector = false
      this.selectedSessionLength = null
      this.showDomainSelector = false
      this.selectedDomainId = null
      this.suggestedDomainId = null
      this.showPrimaryIssueSelector = false
      this.selectedPrimaryIssue = null
      this.primaryIssueDomain = null
      this.$nextTick(() => this.scrollToBottom())
    },

    async initClientSession () {
      this.isStreaming = true
      this.streamingText = ''
      try {
        if (this._abortController) { this._abortController.abort() }
        this._abortController = new AbortController()
        const response = await fetch('/api/advisor/query', {
          method: 'POST',
          // firmId/advisorId are derived server-side from this Bearer token (firmAuth),
          // never sent in the body — see the IDOR fix in advisorEngine.handleQuery.
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          signal: this._abortController.signal,
          body: JSON.stringify({
            query: '__init__',
            mode: 'client',
            language: this.$i18n.locale,
            languageName: this.currentLanguageName,
            orgTemplateIds: this.orgTemplateIds,
            conversationHistory: [],
            advisorProfile: this.hasAdvisorProfile ? this.advisorProfile : null
          })
        })
        if (!response.ok) { throw new Error('Request failed') }
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
              if (data.type === 'session') {
                this.sessionId = data.sessionId
              } else if (data.type === 'delta') {
                this.streamingText += data.text
              } else if (data.type === 'done') {
                this.messages = [{ role: 'assistant', content: this.streamingText }]
                this.streamingText = ''
                this.isStreaming = false
              }
            } catch (e) {}
          }
        }
        if (this.isStreaming && this.streamingText) {
          this.messages = [{ role: 'assistant', content: this.streamingText }]
          this.streamingText = ''
          this.isStreaming = false
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.isStreaming = false
          this.streamingText = ''
          return
        }
        this.messages = [{ role: 'assistant', content: this.$t('opening.client') }]
        this.isStreaming = false
        this.streamingText = ''
      }
    },

    reset () {
      if (this._abortController) { this._abortController.abort() }
      if (this.recognition) { this.recognition.stop() }
      this.isListening = false
      this.mode = null
      this.messages = []
      this.inputText = ''
      this.streamingText = ''
      this.sessionId = null
      this.recommendationDelivered = false
      this.lastTrace = null
      this.showTracePanel = false
      this.sessionDomain = null
      this.sessionTemplates = []
      this.intakeDismissed = false
      this.intakeActive = false
      this.intakeComplete = false
      this.showSavePanel = false
      this.saveTitle = ''
      this.saveSuccess = false
      this.saveError = null
      this.savePromptDismissed = false
      this.showGrowthCurveSelector = false
      this.selectedGrowthStage = null
      this.showStaircaseSelector = false
      this.selectedStaircaseStep = null
      this.showFinMgtThemeSelector = false
      this.selectedFinMgtTheme = null
      this.showSessionLengthSelector = false
      this.selectedSessionLength = null
      this.showDomainSelector = false
      this.selectedDomainId = null
      this.suggestedDomainId = null
      this.showPrimaryIssueSelector = false
      this.selectedPrimaryIssue = null
      this.primaryIssueDomain = null
      this.showRetry = false
      this.lastQuery = null
    },

    retryLastMessage () {
      if (!this.lastQuery || this.isStreaming) { return }
      this.messages.pop() // remove the error message
      this.showRetry = false
      this.inputText = this.lastQuery
      this.sendMessage()
    },

    submitFinMgtTheme () {
      if (!this.selectedFinMgtTheme) { return }
      const theme = this.finMgtThemes.find(t => t.name === this.selectedFinMgtTheme)
      this.inputText = `${theme.name} — ${theme.problem}`
      this.showFinMgtThemeSelector = false
      this.selectedFinMgtTheme = null
      this.sendMessage()
    },

    submitSessionLength () {
      if (!this.selectedSessionLength) { return }
      this.inputText = this.selectedSessionLength
      this.showSessionLengthSelector = false
      this.selectedSessionLength = null
      this.sendMessage()
    },

    submitPrimaryIssue () {
      if (!this.selectedPrimaryIssue) { return }
      this.inputText = this.selectedPrimaryIssue
      this.showDomainSelector = false
      this.selectedDomainId = null
      this.suggestedDomainId = null
      this.showPrimaryIssueSelector = false
      this.selectedPrimaryIssue = null
      this.primaryIssueDomain = null
      this.sendMessage()
    },

    submitDomainSelection () {
      if (!this.selectedDomainId) { return }
      const domain = this.domainSelectorOptions.find(d => d.id === this.selectedDomainId)
      const domainId = this.selectedDomainId
      this.inputText = domain ? domain.label : domainId
      this.showDomainSelector = false
      this.selectedDomainId = null
      this.suggestedDomainId = null
      this.sendMessage(domainId)
    },

    noneOfTheseApply () {
      this.showDomainSelector = false
      this.selectedDomainId = null
      this.suggestedDomainId = null
      this.showPrimaryIssueSelector = false
      this.selectedPrimaryIssue = null
      this.primaryIssueDomain = null
      this.inputText = 'None of these fit my situation'
      this.sendMessage('__none_of_these__')
    },

    // Hand off to Learn mode carrying the advisor's ACTUAL opening (their stated
    // goal) as the query the engine acts on — so Learn responds to what they really
    // want (e.g. "run an end-of-year meeting AND upsell") and matches the right
    // templates, instead of a generic "sell". The visible bubble stays friendly;
    // the goal text is what's sent. Falls back to the friendly line if no opening
    // is found. (The AI reads dictation garbles like "ND year" as "end of year"
    // fine — it's the brittle keyword tree-picker that doesn't; that's a separate fix.)
    _handoffToLearn (displayText) {
      this.showSellSwitch = false
      this.mode = 'learn'
      const opening = this.messages.find(m => m.role === 'user')
      const goal = opening && opening.content && opening.content.trim() ? opening.content.trim() : null
      this.inputText = displayText
      this.sendMessage(goal)
    },

    // Win-work switch — advisor accepts the offer to move to Learn (how-to-sell).
    acceptSellSwitch () {
      this._handoffToLearn('Yes, help me sell')
    },

    // Advisor declines — stay in the client flow; the backend continues the questions.
    declineSellSwitch () {
      this.showSellSwitch = false
      this.inputText = 'No, stay on this'
      this.sendMessage('no')
    },

    // Free-text "yes" path: the backend returned [SWITCH_TO_LEARN]. Flip to Learn
    // mode the same way, carrying the advisor's stated goal.
    switchToLearn () {
      this._handoffToLearn('Help me win more advisory work from this client')
    },

    submitGrowthStage () {
      if (!this.selectedGrowthStage) { return }
      const stage = this.growthStages.find(s => s.name === this.selectedGrowthStage)
      this.inputText = `${stage.name} — ${stage.description}`
      this.showGrowthCurveSelector = false
      this.selectedGrowthStage = null
      this.sendMessage()
    },

    submitStaircaseStep () {
      if (!this.selectedStaircaseStep) { return }
      const step = this.staircaseSteps.find(s => s.name === this.selectedStaircaseStep)
      this.inputText = `${step.name} — ${step.description}`
      this.showStaircaseSelector = false
      this.selectedStaircaseStep = null
      this.sendMessage()
    },

    closeSession () {
      // window.close() only works on script-opened windows; reset as fallback for normal tabs
      const openedByScript = window.opener !== null
      window.close()
      if (!openedByScript) { this.reset() }
    },

    openProfile () {
      // NEVER reset to 0 — restore to the number of already-answered questions
      // so completed answers stay visible and editable when reopening the panel.
      // Resetting to 0 was causing all answers to collapse on every open.
      this.profileStep = this.profileQuestions.filter(q => this.advisorProfile[q.field]).length
      this.profileOpen = true
      this.$nextTick(() => { this.$nextTick(() => this.resizeAllTextareas()) })
    },

    saveField () {
      localStorage.setItem('va_advisor_profile', JSON.stringify(this.advisorProfile))
      this.profileSaved = true
    },

    saveFieldAndAdvance () {
      this.saveField()
      if (this.profileStep < this.profileQuestions.length - 1) {
        this.profileStep++
      } else {
        this.profileOpen = false
      }
    },

    saveProfile () {
      localStorage.setItem('va_advisor_profile', JSON.stringify(this.advisorProfile))
      this.profileSaved = true
      this.profileOpen = false
    },

    clearProfile () {
      this.advisorProfile = { advisorRole: '', experience: '', clientDemographic: '', enjoyment: '', technicalStrengths: '', toolsComfort: '', notes: '' }
      localStorage.removeItem('va_advisor_profile')
      this.profileSaved = false
      this.profileStep = 0
    },

    async sendMessage (serverQueryOverride = null) {
      const query = this.inputText.trim()
      if (!query || this.isStreaming || this.showDomainSelector || this.showGrowthCurveSelector || this.showStaircaseSelector || this.showFinMgtThemeSelector || this.showSessionLengthSelector || this.showPrimaryIssueSelector) { return }

      this.messages.push({ role: 'user', content: query })
      this.inputText = ''
      this.isStreaming = true
      this.streamingText = ''
      this.showRetry = false
      this.showSellSwitch = false
      this.lastQuery = query

      await this.$nextTick()
      this.scrollToBottom()

      try {
        if (this._abortController) { this._abortController.abort() }
        this._abortController = new AbortController()
        const response = await fetch('/api/advisor/query', {
          method: 'POST',
          // firmId/advisorId are derived server-side from this Bearer token (firmAuth),
          // never sent in the body — see the IDOR fix in advisorEngine.handleQuery.
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` },
          signal: this._abortController.signal,
          body: JSON.stringify({
            query: serverQueryOverride || query,
            mode: this.mode,
            language: this.$i18n.locale,
            languageName: this.currentLanguageName,
            orgTemplateIds: this.orgTemplateIds,
            conversationHistory: this.conversationHistory.slice(0, -1),
            sessionId: this.sessionId,
            advisorProfile: this.hasAdvisorProfile ? this.advisorProfile : null,
            caseSummaries: this.relevantCases.map(c => ({
              title: c.title,
              mode: c.mode,
              visibility: c.visibility,
              summary: c.summary,
              date: c.createdAt,
              review: c.review || null
            }))
          })
        })

        if (!response.ok) { throw new Error('Request failed') }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { break }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() // retain any incomplete trailing line
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue }
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'error') {
                this.messages.push({ role: 'assistant', content: this.$t('error') })
                this.streamingText = ''
                this.isStreaming = false
                this.showRetry = true
              } else if (data.type === 'session_meta') {
                this.sessionDomain = data.domain || null
                this.sessionTemplates = data.templates || []
              } else if (data.type === 'trace') {
                // Decision trace — powers the "Why this recommendation" panel.
                this.lastTrace = data.trace || null
              } else if (data.type === 'recommendation_delivered') {
                this.recommendationDelivered = true
              } else if (data.type === 'delta') {
                this.streamingText += data.text
                await this.$nextTick()
                this.scrollToBottom()
              } else if (data.type === 'replace') {
                this.streamingText = data.text
                await this.$nextTick()
                this.scrollToBottom()
              } else if (data.type === 'done') {
                if (this.streamingText.includes('[INTAKE_COMPLETE]')) {
                  this.streamingText = this.streamingText.replace('[INTAKE_COMPLETE]', '').trim()
                  this.intakeComplete = true
                  this.intakeActive = false
                }
                let content = this.streamingText
                if (content.includes('[GROWTH_CURVE_SELECTOR]')) {
                  content = content.replace('[GROWTH_CURVE_SELECTOR]', '').trim()
                  this.showGrowthCurveSelector = true
                }
                if (content.includes('[STAIRCASE_SELECTOR]')) {
                  content = content.replace('[STAIRCASE_SELECTOR]', '').trim()
                  this.showStaircaseSelector = true
                }
                if (content.includes('[FIN_MGT_THEME_SELECTOR]')) {
                  content = content.replace('[FIN_MGT_THEME_SELECTOR]', '').trim()
                  this.showFinMgtThemeSelector = true
                }
                if (content.includes('[SESSION_LENGTH_SELECTOR]')) {
                  content = content.replace('[SESSION_LENGTH_SELECTOR]', '').trim()
                  this.showSessionLengthSelector = true
                }
                const _dsMatch = content.match(/\[DOMAIN_SELECTOR:([^\]]*)\]/)
                if (_dsMatch) {
                  this.suggestedDomainId = _dsMatch[1] || null
                  this.selectedDomainId = this.suggestedDomainId
                  content = content.replace(_dsMatch[0], '').trim()
                  this.showDomainSelector = true
                }
                const _piMatch = content.match(/\[PRIMARY_ISSUE_SELECTOR:([^\]]+)\]/)
                if (_piMatch) {
                  this.primaryIssueDomain = _piMatch[1]
                  content = content.replace(_piMatch[0], '').trim()
                  this.showPrimaryIssueSelector = true
                }
                // Win-work switch: show the Yes/No buttons under the offer.
                if (content.includes('[SELL_SWITCH_OFFER]')) {
                  content = content.replace('[SELL_SWITCH_OFFER]', '').trim()
                  this.showSellSwitch = true
                }
                // Backend handed the session to Learn mode (free-text "yes" path) —
                // don't render the bare signal; flip to Learn carrying the context.
                let _handOffToLearn = false
                if (content.includes('[SWITCH_TO_LEARN]')) {
                  content = content.replace('[SWITCH_TO_LEARN]', '').trim()
                  _handOffToLearn = true
                }
                if (content) { this.messages.push({ role: 'assistant', content }) }
                this.streamingText = ''
                this.isStreaming = false
                if (_handOffToLearn) { this.switchToLearn() }
              }
            } catch (parseErr) {
              console.warn('[va:sse] Malformed SSE line skipped:', parseErr.message)
            }
          }
        }

        // Fallback: if stream ended without a done event (e.g. max_tokens truncation)
        if (this.isStreaming) {
          if (this.streamingText) {
            if (this.streamingText.includes('[INTAKE_COMPLETE]')) {
              this.streamingText = this.streamingText.replace('[INTAKE_COMPLETE]', '').trim()
              this.intakeComplete = true
              this.intakeActive = false
            }
            let content = this.streamingText
            if (content.includes('[GROWTH_CURVE_SELECTOR]')) {
              content = content.replace('[GROWTH_CURVE_SELECTOR]', '').trim()
              this.showGrowthCurveSelector = true
            }
            if (content.includes('[STAIRCASE_SELECTOR]')) {
              content = content.replace('[STAIRCASE_SELECTOR]', '').trim()
              this.showStaircaseSelector = true
            }
            if (content.includes('[FIN_MGT_THEME_SELECTOR]')) {
              content = content.replace('[FIN_MGT_THEME_SELECTOR]', '').trim()
              this.showFinMgtThemeSelector = true
            }
            if (content.includes('[SESSION_LENGTH_SELECTOR]')) {
              content = content.replace('[SESSION_LENGTH_SELECTOR]', '').trim()
              this.showSessionLengthSelector = true
            }
            const _piMatchFb = content.match(/\[PRIMARY_ISSUE_SELECTOR:([^\]]+)\]/)
            if (_piMatchFb) {
              this.primaryIssueDomain = _piMatchFb[1]
              content = content.replace(_piMatchFb[0], '').trim()
              this.showPrimaryIssueSelector = true
            }
            this.messages.push({ role: 'assistant', content })
            this.streamingText = ''
          }
          this.isStreaming = false
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.isStreaming = false
          this.streamingText = ''
          return
        }
        this.messages.push({ role: 'assistant', content: this.$t('error') })
        this.isStreaming = false
        this.streamingText = ''
        this.showRetry = true
      }

      await this.$nextTick()
      this.scrollToBottom()
    },

    scrollToBottom () {
      if (this.$refs.messagesArea) {
        this.$refs.messagesArea.scrollTop = this.$refs.messagesArea.scrollHeight
      }
    },

    renderMarkdown (text) {
      if (!text) { return '' }
      const preprocessed = preprocessAIResponse(String(text))
      const raw = _md.render(preprocessed)
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    }
  }
}
</script>

<style scoped>
.advisor-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 860px;
  margin: 0 auto;
  background: #ffffff;
  font-family: 'Open Sans', system-ui, -apple-system, sans-serif;
}
.container-chat {
  height: 100vh;
  overflow: hidden;
}

/* Header */
.advisor-header {
  padding: 14px 24px;
  background: linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #2e1065 100%);
  flex-shrink: 0;
  position: relative;
}
.advisor-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);
}
.advisor-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.advisor-header-inner { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.advisor-logo { display: flex; align-items: center; gap: 12px; }
.advisor-logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.advisor-title { font-size: 17px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.01em; }
.advisor-subtitle { font-size: 11px; color: rgba(191,219,254,0.8); margin: 0; font-weight: 400; letter-spacing: 0.02em; }
.header-actions { display: flex; align-items: center; gap: 8px; }

.lang-picker { position: relative; }
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.lang-btn:hover { background: rgba(255,255,255,0.2); }
.lang-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 200;
  width: 220px;
  background: #1e3a8a;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  overflow: hidden;
}
.lang-search {
  width: 100%;
  background: rgba(255,255,255,0.1);
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.15);
  color: #ffffff;
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
  box-sizing: border-box;
}
.lang-search::placeholder { color: rgba(255,255,255,0.45); }
.lang-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 0;
}
.lang-list::-webkit-scrollbar { width: 4px; }
.lang-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
.lang-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  color: #bfdbfe;
  font-size: 13px;
  padding: 9px 14px;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.lang-opt:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #ffffff; }
.lang-opt:disabled { opacity: 0.5; cursor: not-allowed; }
.lang-opt-active { color: #ffffff; font-weight: 600; }
.lang-opt-loading { color: #ffffff; }
.lang-opt-badge { font-size: 12px; color: rgba(255,255,255,0.6); }
.lang-opt-loading .lang-opt-badge { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.lang-error { font-size: 11px; color: #fca5a5; padding: 8px 14px; margin: 0; }

.btn-firm-manager {
  font-size: 12px;
  color: #bfdbfe;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 5px 11px;
  cursor: pointer;
  text-decoration: none;
}
.btn-firm-manager:hover { background: rgba(255,255,255,0.18); color: #ffffff; }
.btn-clear {
  font-size: 13px;
  color: #bfdbfe;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.btn-clear:hover { background: rgba(255,255,255,0.2); color: #ffffff; }
.btn-close {
  font-size: 14px;
  color: #bfdbfe;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}
.btn-close:hover { background: rgba(220, 38, 38, 0.3); border-color: rgba(220, 38, 38, 0.5); color: #ffffff; }

/* Mode selection */
.mode-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 40px 24px 48px;
  background: linear-gradient(145deg, #f0f4ff 0%, #e8f0fe 40%, #f5f3ff 70%, #fdf4ff 100%);
}

/* Hero */
.mode-hero {
  text-align: center;
  margin-bottom: 36px;
  max-width: 560px;
}
.mode-hero-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6d28d9;
  background: #f5f3ff;
  border-radius: 20px;
  padding: 4px 14px;
  margin-bottom: 14px;
}
.mode-hero-title {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  line-height: 1.25;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}
.mode-hero-sub {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

/* Cards grid */
.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 800px;
}
.mode-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
.mode-card:hover {
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  transform: translateY(-4px) scale(1.01);
  border-color: transparent;
}
.card-top-bar { height: 5px; width: 100%; flex-shrink: 0; }
.card-client .card-top-bar  { background: linear-gradient(90deg, #1e40af, #3b82f6); }
.card-discover .card-top-bar { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.card-plan .card-top-bar    { background: linear-gradient(90deg, #059669, #34d399); }
.card-learn .card-top-bar   { background: linear-gradient(90deg, #d97706, #fbbf24); }
.card-course .card-top-bar  { background: linear-gradient(90deg, #00b1e0, #0098c1); }
.card-firm .card-top-bar    { background: linear-gradient(90deg, #0f766e, #0d9488); }
.card-profile .card-top-bar  { background: linear-gradient(90deg, #6366f1, #a5b4fc); }
.card-progress .card-top-bar { background: linear-gradient(90deg, #be185d, #f472b6); }

.mode-card-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 20px 18px;
  flex: 1;
}
.mode-card-icon-wrap {
  font-size: 28px;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-client   { background: #eff6ff; color: #1e40af; }
.icon-discover { background: #f5f3ff; color: #7c3aed; }
.icon-plan     { background: #ecfdf5; color: #059669; }
.icon-learn    { background: #fffbeb; color: #d97706; }
.icon-course   { background: #e6f8fd; color: #00b1e0; }
.icon-firm     { background: #f0fdf4; color: #0f766e; }
.icon-profile  { background: #eef2ff; color: #6366f1; font-size: 26px; display: flex; align-items: center; justify-content: center; }

.mode-card-body { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.mode-card-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0; }
.mode-card-desc { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0; }
.mode-card-tag {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  padding: 3px 10px;
  width: fit-content;
}
.card-client .mode-card-tag  { color: #1e40af; background: #eff6ff; }
.card-discover .mode-card-tag { color: #7c3aed; background: #f5f3ff; }
.card-plan .mode-card-tag    { color: #059669; background: #ecfdf5; }
.card-learn .mode-card-tag   { color: #d97706; background: #fffbeb; }
.card-course .mode-card-tag  { color: #00b1e0; background: #e6f8fd; }
.card-firm .mode-card-tag    { color: #0f766e; background: #f0fdf4; }
.card-profile .mode-card-tag  { color: #6366f1; background: #eef2ff; }
.card-profile .mode-card-tag.tag-empty { color: #6b7280; background: #f3f4f6; }
.card-progress .mode-card-tag { color: #be185d; background: #fdf2f8; }

.mode-card-arrow {
  font-size: 18px;
  color: #d1d5db;
  align-self: flex-end;
  transition: transform 0.2s, color 0.2s;
}
.card-client:hover  .mode-card-arrow { color: #3b82f6; transform: translateX(4px); }
.card-discover:hover .mode-card-arrow { color: #a78bfa; transform: translateX(4px); }
.card-plan:hover    .mode-card-arrow { color: #34d399; transform: translateX(4px); }
.card-learn:hover   .mode-card-arrow { color: #fbbf24; transform: translateX(4px); }
.card-course:hover  .mode-card-arrow { color: #00b1e0; transform: translateX(4px); }
.card-firm:hover    .mode-card-arrow { color: #0d9488; transform: translateX(4px); }
.card-profile:hover  .mode-card-arrow { color: #6366f1; transform: translateX(4px); }
.card-progress:hover .mode-card-arrow { color: #f472b6; transform: translateX(4px); }
.card-client:hover  { border-color: #bfdbfe; }
.card-discover:hover { border-color: #ddd6fe; }
.card-plan:hover    { border-color: #a7f3d0; }
.card-learn:hover   { border-color: #fde68a; }
.card-course:hover  { border-color: #99dff5; }
.card-firm:hover    { border-color: #99f6e4; }
.card-profile:hover  { border-color: #c7d2fe; }
.card-progress:hover { border-color: #fbcfe8; }

/* Section banner */
.section-banner {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 36px;
  border-left: 4px solid #ccc;
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
.banner-client  { border-left-color: #3b82f6; }
.banner-discover { border-left-color: #a78bfa; }
.banner-plan    { border-left-color: #34d399; }
.banner-learn   { border-left-color: #fbbf24; }
.banner-course  { border-left-color: #00b1e0; }

/* Advisor Profile screen */
.profile-screen {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.profile-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.profile-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.profile-modal-sub { font-size: 13px; color: #6b7280; margin: 0; }
.profile-modal-close {
  background: none; border: none; font-size: 16px; color: #9ca3af;
  cursor: pointer; padding: 4px; line-height: 1;
}
.profile-modal-close:hover { color: #374151; }
.profile-modal-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }

/* Advisor Profile card */
.profile-card {
  width: 100%;
  max-width: 680px;
  background: #ffffff;
  border: 2px solid #dbeafe;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(30, 64, 175, 0.06);
  margin-top: 6px;
  overflow: hidden;
}
.profile-card-header {
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 22px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.profile-card-header:hover { background: #f9fafb; }
.profile-card-icon { font-size: 30px; flex-shrink: 0; margin-top: 2px; }
.profile-card-body { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.profile-card-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
.profile-card-desc { font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0; }
.profile-card-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  border-radius: 20px;
  padding: 3px 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.tag-empty { color: #6b7280; background: #f3f4f6; }
.profile-chevron { font-size: 10px; color: #9ca3af; flex-shrink: 0; }

.profile-questions {
  border-top: 1px solid #dbeafe;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafbff;
}
.profile-progress { margin-bottom: 16px; }
.profile-step-label { font-size: 12px; color: #6b7280; font-weight: 500; display: block; margin-bottom: 6px; }
.profile-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; }
.profile-progress-fill { height: 4px; background: #1e40af; border-radius: 2px; transition: width 0.3s ease; }
.profile-q { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.profile-q-done { background: #f0f4ff; border-radius: 6px; padding: 8px 10px; }
.profile-q-answer { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
.profile-q-label { font-size: 13px; font-weight: 600; color: #1e40af; margin: 0; }
.profile-q-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  line-height: 1.5;
  resize: none;
  outline: none;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  min-height: 44px;
  overflow-y: hidden;
}
.profile-q-textarea:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.08); }
.profile-q-completed { display: flex; flex-direction: column; gap: 6px; }
.profile-q-textarea-done { background: #f8faff; border-color: #c7d7f5; }
.profile-q-textarea-done:focus { border-color: #1e40af; background: #ffffff; box-shadow: 0 0 0 3px rgba(30,64,175,0.08); }
.pq-recording { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,0.1) !important; }

.profile-q-advance { display: flex; justify-content: flex-end; margin-top: 8px; }
.profile-advance-btn {
  background: #1e40af;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.profile-advance-btn:hover { background: #1d3a98; }

.profile-q-actions { display: flex; gap: 8px; padding-top: 4px; }
.profile-save-btn {
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.profile-save-btn:hover { background: #1d3a98; }
.profile-clear-btn {
  background: none;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 13px;
  cursor: pointer;
}
.profile-clear-btn:hover { color: #dc2626; border-color: #fecaca; }

/* Messages */
.messages-area { flex: 1; overflow-y: auto; padding: 24px; }
.messages-list { display: flex; flex-direction: column; gap: 20px; }
.message { display: flex; gap: 12px; align-items: flex-start; }
.message-user { flex-direction: row-reverse; }
.message-avatar {
  background: #1e40af;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}
.message-bubble { max-width: 75%; padding: 14px 18px; border-radius: 12px; font-size: 15px; line-height: 1.6; }
.bubble-user { background: #1e40af; color: white; border-radius: 12px 4px 12px 12px; }
.bubble-advisor { max-width: 88%; background: #f9fafb; border: 1px solid #e5e7eb; color: #111827; border-radius: 4px 12px 12px 12px; }

.prose ::v-deep strong { font-weight: 700; }
.prose ::v-deep h2 { font-size: 18px; font-weight: 700; margin: 16px 0 8px; color: #1e40af; }
.prose ::v-deep h3 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; color: #1e40af; padding-top: 14px; border-top: 1px solid #e5e7eb; }
.prose ::v-deep h3:first-child { margin-top: 8px; padding-top: 0; border-top: none; }
.prose ::v-deep h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin: 20px 0 4px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
.prose ::v-deep h4:first-child { margin-top: 4px; padding-top: 0; border-top: none; }
.prose ::v-deep ul { margin: 6px 0; padding-left: 20px; }
.prose ::v-deep li { margin: 3px 0; }
.prose ::v-deep p { margin: 6px 0; line-height: 1.6; }

.typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.typing-indicator span { width: 7px; height: 7px; background: #9ca3af; border-radius: 50%; animation: bounce 1.2s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

/* Input */
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
.message-input:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1); }
.message-input:disabled { background: #f9fafb; color: #9ca3af; }
.input-listening { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important; }
.input-ready { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.08) !important; }

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

.retry-row { display: flex; justify-content: center; padding: 8px 0 4px; }
.retry-btn { background: none; border: 1px solid #d1d5db; color: #6b7280; font-size: 13px; padding: 6px 16px; border-radius: 6px; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.retry-btn:hover { background: #f3f4f6; color: #374151; border-color: #9ca3af; }

/* Voice bar */
.voice-bar {
  margin-bottom: 10px;
  min-height: 36px;
  display: flex;
  align-items: center;
}
.voice-state {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.voice-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.voice-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.voice-btn-idle {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.voice-btn-idle:hover:not(:disabled) { background: #dbeafe; }

.voice-recording {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 8px 14px;
}
.recording-dot {
  width: 10px;
  height: 10px;
  background: #dc2626;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse-dot 1.2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
.recording-label { font-size: 13px; font-weight: 600; color: #dc2626; flex: 1; }
.voice-btn-stop {
  background: #dc2626;
  color: white;
  border: none;
  margin-left: auto;
}
.voice-btn-stop:hover { background: #b91c1c; }

.voice-ready {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 8px 14px;
}
.ready-label { font-size: 13px; font-weight: 600; color: #16a34a; flex: 1; }
.voice-btn-redo {
  background: #ffffff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  margin-left: auto;
  font-size: 12px;
}
.voice-btn-redo:hover { background: #f9fafb; }
.voice-btn-save {
  background: #1e40af;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
}
.voice-btn-save:hover { background: #1d3a98; }

/* Save prompt card */
.growth-curve-card {
  margin: 8px 16px 4px;
  padding: 16px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 10px;
}
.growth-curve-title {
  font-size: 14px;
  font-weight: 600;
  color: #14532d;
  margin: 0 0 12px;
}
.growth-stage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.growth-stage-opt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #d1fae5;
  border-radius: 8px;
  cursor: pointer;
  background: #fff;
  transition: background 0.15s, border-color 0.15s;
}
.growth-stage-opt input[type="radio"] { margin-top: 3px; flex-shrink: 0; accent-color: #16a34a; }
.growth-stage-opt:hover { background: #f0fdf4; border-color: #86efac; }
.growth-stage-selected { background: #dcfce7 !important; border-color: #16a34a !important; }
.growth-stage-body { display: flex; flex-direction: column; gap: 2px; }
.growth-stage-name { font-size: 13px; font-weight: 600; color: #15803d; }
.growth-stage-desc { font-size: 12px; color: #4b5563; line-height: 1.4; }
.growth-curve-submit {
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.growth-curve-submit:hover:not(:disabled) { background: #15803d; }
.growth-curve-submit:disabled { background: #9ca3af; cursor: not-allowed; }

/* Fin Mgt Theme selector */
.fin-mgt-card {
  margin: 8px 16px 4px;
  padding: 16px;
  background: #faf5ff;
  border: 1px solid #c4b5fd;
  border-radius: 10px;
}
.fin-mgt-title {
  font-size: 14px;
  font-weight: 600;
  color: #3b0764;
  margin: 0 0 12px;
}
.fin-mgt-theme-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.fin-mgt-theme-opt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #ddd6fe;
  border-radius: 7px;
  cursor: pointer;
  background: #fff;
  transition: background 0.15s, border-color 0.15s;
}
.fin-mgt-theme-opt input[type="radio"] { margin-top: 3px; flex-shrink: 0; }
.fin-mgt-theme-opt:hover { background: #faf5ff; border-color: #a78bfa; }
.fin-mgt-theme-selected { background: #ede9fe !important; border-color: #7c3aed !important; }
.fin-mgt-theme-body { display: flex; flex-direction: column; gap: 2px; }
.fin-mgt-theme-name { font-size: 13px; font-weight: 600; color: #5b21b6; }
.fin-mgt-theme-desc { font-size: 12px; color: #4b5563; line-height: 1.4; }
.fin-mgt-submit {
  background: #7c3aed;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.fin-mgt-submit:hover:not(:disabled) { background: #6d28d9; }
.fin-mgt-submit:disabled { background: #9ca3af; cursor: not-allowed; }

/* Session length selector */
.session-length-card {
  margin: 8px 16px 4px;
  padding: 16px;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 10px;
}
.session-length-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e3a5f;
  margin: 0 0 12px;
}
.session-length-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.session-length-opt {
  padding: 8px 18px;
  border: 1px solid #93c5fd;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #1e40af;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.session-length-opt:hover { background: #dbeafe; border-color: #3b82f6; }
.session-length-selected { background: #1e40af !important; color: #fff !important; border-color: #1e40af !important; }
.session-length-submit {
  background: #1e40af;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.session-length-submit:hover:not(:disabled) { background: #1d4ed8; }
.session-length-submit:disabled { background: #9ca3af; cursor: not-allowed; }

/* Primary issue selector */
.domain-selector-card { margin: 8px 16px 4px; padding: 16px; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 10px; }
.domain-selector-title { font-size: 14px; font-weight: 600; color: #1e3a8a; margin: 0 0 12px; }
.domain-selector-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; }
.domain-selector-opt { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; cursor: pointer; font-size: 12px; color: #111827; transition: background 0.15s; }
.domain-selector-opt:hover { background: #dbeafe; border-color: #60a5fa; }
.domain-selector-opt input[type="radio"] { accent-color: #1d4ed8; flex-shrink: 0; }
.domain-selector-selected { background: #1d4ed8 !important; color: #fff !important; border-color: #1d4ed8 !important; }
.domain-selector-selected span { color: #fff; }
.domain-selector-suggested { border-color: #60a5fa !important; background: #dbeafe !important; }
.domain-selector-submit { padding: 9px 22px; background: #1d4ed8; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.domain-selector-submit:hover:not(:disabled) { background: #1e40af; }
.domain-selector-submit:disabled { background: #9ca3af; cursor: not-allowed; }
.primary-issue-card { margin: 8px 16px 4px; padding: 16px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; }
.primary-issue-title { font-size: 14px; font-weight: 600; color: #14532d; margin: 0 0 12px; }
.primary-issue-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.primary-issue-opt { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border: 1px solid #86efac; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; color: #111827; transition: background 0.15s; }
.primary-issue-opt:hover { background: #dcfce7; border-color: #4ade80; }
.primary-issue-opt input[type="radio"] { margin-top: 2px; accent-color: #16a34a; flex-shrink: 0; }
.primary-issue-selected { background: #16a34a !important; color: #fff !important; border-color: #16a34a !important; }
.primary-issue-selected span { color: #fff; }
.primary-issue-submit { padding: 9px 22px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.primary-issue-submit:hover:not(:disabled) { background: #15803d; }
.primary-issue-submit:disabled { background: #9ca3af; cursor: not-allowed; }
.primary-issue-none { display: block; width: 100%; margin-top: 10px; padding: 8px; background: none; border: none; color: #6b7280; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.primary-issue-none:hover { color: #374151; }

/* Win-work switch offer buttons */
.sell-switch-card { display: flex; gap: 10px; margin: 8px 16px 4px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; }
.sell-switch-yes { padding: 9px 18px; background: #2563eb; color: #fff; border: 1px solid #2563eb; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease; }
.sell-switch-yes:hover { background: #1d4ed8; }
.sell-switch-no { padding: 9px 18px; background: #fff; color: #6b7280; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease; }
.sell-switch-no:hover { background: #f9fafb; }

.trace-panel {
  margin: 8px 16px 4px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
}
.trace-toggle {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}
.trace-toggle:hover { background: #f3f4f6; }
.trace-body {
  padding: 4px 16px 14px;
  font-size: 13px;
  color: #374151;
}
.trace-row { display: flex; gap: 10px; padding: 3px 0; }
.trace-label { flex: 0 0 150px; color: #6b7280; }
.trace-value { color: #111827; }
.trace-section { margin-top: 10px; }
.trace-section-title { font-weight: 600; color: #374151; margin-bottom: 4px; }
.trace-note { color: #6b7280; font-size: 12px; line-height: 1.4; margin: 2px 0; }
.trace-boost { color: #047857; font-weight: 600; }
.trace-nearmiss { margin: 3px 0; padding: 4px 8px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 3px; }
.trace-scores { width: 100%; border-collapse: collapse; margin-top: 4px; }
.trace-scores th, .trace-scores td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  vertical-align: top;
}
.trace-scores th { color: #6b7280; font-weight: 600; }
.trace-reasons { color: #6b7280; }

.intake-prompt-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 16px 4px;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  flex-wrap: wrap;
}
.save-prompt-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 16px 4px;
  padding: 12px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  flex-wrap: wrap;
}
.save-prompt-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}
.save-prompt-text strong { color: #1e40af; }
.save-prompt-actions { display: flex; gap: 8px; flex-shrink: 0; }
.save-prompt-yes {
  background: #1e40af;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}
.save-prompt-yes:hover { background: #1d3a98; }
.save-prompt-no {
  background: none;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.save-prompt-no:hover { background: #f9fafb; color: #374151; }

.input-save-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 0;
}
.btn-save-inline {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.btn-save-inline:hover:not(:disabled) { background: #f0fdf4; color: #16a34a; border-color: #86efac; }
.btn-save-inline:disabled { opacity: 0.4; cursor: not-allowed; }
.save-inline-saved { font-size: 12px; color: #16a34a; font-weight: 500; }

/* Save panel overlay */
.save-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 24px;
}
.save-modal {
  background: #ffffff;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.save-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 6px;
}
.save-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 20px;
}
.save-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.save-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 20px;
}
.save-input:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.1); }

.save-visibility { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.vis-opt {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.vis-opt input { display: none; }
.vis-opt:hover { border-color: #93c5fd; }
.vis-active { border-color: #1e40af; background: #eff6ff; }
.vis-body { display: flex; align-items: flex-start; gap: 12px; }
.vis-icon { font-size: 22px; flex-shrink: 0; }
.vis-body div { display: flex; flex-direction: column; gap: 2px; }
.vis-body strong { font-size: 14px; font-weight: 600; color: #111827; }
.vis-body p { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.4; }

.save-success { font-size: 13px; color: #16a34a; font-weight: 600; margin: 0 0 12px; }
.save-error { font-size: 13px; color: #dc2626; margin: 0 0 12px; }

.save-actions { display: flex; gap: 10px; }
.save-btn-confirm {
  flex: 1;
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.save-btn-confirm:hover:not(:disabled) { background: #1d3a98; }
.save-btn-confirm:disabled { background: #9ca3af; cursor: not-allowed; }
.save-btn-cancel {
  background: none;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 11px 16px;
  font-size: 14px;
  cursor: pointer;
}
.save-btn-cancel:hover { color: #111827; border-color: #d1d5db; }

/* Cases button */
.btn-cases {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  height: 32px;
  padding: 0 10px;
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-cases:hover { background: rgba(255,255,255,0.22); color: #ffffff; }
.btn-cases-label { font-size: 12px; }
.cases-badge {
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

/* Cases panel */
.cases-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 300;
  padding: 0;
  overflow: hidden;
}
.cases-modal {
  background: #ffffff;
  width: 100%;
  max-width: 100%;
  height: 100%;
  box-shadow: none;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}
.cases-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 32px 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
}
.cases-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 2px; }
.cases-modal-sub { font-size: 13px; color: #6b7280; margin: 0; }
.cases-close {
  background: #f3f4f6;
  border: none;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.cases-close:hover { color: #374151; }
.cases-empty { padding: 48px 32px; text-align: center; color: #6b7280; font-size: 14px; }
.cases-list { padding: 16px 32px; display: flex; flex-direction: column; gap: 12px; max-width: 900px; width: 100%; margin: 0 auto; }
.cases-footer {
  padding: 20px 32px 32px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f3f4f6;
  margin-top: 8px;
}
.cases-footer-close {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}
.cases-footer-close:hover { background: #e5e7eb; color: #111827; }

.case-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}
.case-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  background: #f9fafb;
  gap: 12px;
}
.case-header:hover { background: #f3f4f6; }
.case-meta { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.case-title { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.case-tags { display: flex; gap: 6px; }
.case-mode-tag {
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  border-radius: 20px;
  padding: 2px 8px;
}
.case-vis-tag {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 20px;
  padding: 2px 8px;
}
.case-feedback-tag {
  font-size: 11px;
  color: #15803d;
  background: #dcfce7;
  border-radius: 20px;
  padding: 2px 8px;
}
.case-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.case-date { font-size: 12px; color: #9ca3af; }
.case-chevron { font-size: 10px; color: #9ca3af; }

.case-body { padding: 16px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 16px; }
.case-summary-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
.case-summary-text { font-size: 13px; color: #374151; line-height: 1.5; margin: 0; max-height: 80px; overflow-y: auto; }

.case-visibility-row { display: flex; justify-content: flex-end; }
.visibility-toggle-btn {
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease;
}
.visibility-toggle-btn:disabled { opacity: 0.6; cursor: default; }
/* "Share with the firm" is the call to action — clear primary. */
.vis-btn-share { background: #2563eb; color: #fff; border-color: #2563eb; }
.vis-btn-share:hover:not(:disabled) { background: #1d4ed8; }
/* "Make private" is a quiet reversal — neutral secondary. */
.vis-btn-make-private { background: #fff; color: #6b7280; border-color: #d1d5db; }
.vis-btn-make-private:hover:not(:disabled) { background: #f9fafb; }

.case-review-section { background: #fafbff; border: 1px solid #dbeafe; border-radius: 10px; padding: 16px; }
.review-heading { font-size: 14px; font-weight: 700; color: #1e40af; margin: 0 0 4px; }
.review-sub { font-size: 12px; color: #6b7280; margin: 0 0 14px; line-height: 1.4; }
.review-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.review-label { font-size: 12px; font-weight: 600; color: #374151; }
.review-textarea {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  resize: none;
  outline: none;
  line-height: 1.5;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  overflow-y: hidden;
}
.review-textarea:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.08); }
.review-voice-bar { margin-bottom: 4px; }
.review-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.review-save-btn {
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 7px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.review-save-btn:hover { background: #1d3a98; }
.review-promote-btn {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 7px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.review-promote-btn:hover:not(:disabled) { background: #dcfce7; border-color: #86efac; }
.review-promote-btn:disabled { opacity: 0.7; cursor: default; }
.promote-error { font-size: 12px; color: #dc2626; align-self: center; }
.case-transcript-toggle { margin: 12px 0 4px; }
.transcript-btn {
  background: none;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  color: #1e40af;
  cursor: pointer;
  font-weight: 500;
}
.transcript-btn:hover { background: #eff6ff; }
.case-transcript {
  margin: 8px 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}
.transcript-msg {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  align-items: flex-start;
}
.transcript-msg:last-child { border-bottom: none; }
.transcript-msg-va { background: #f8faff; }
.transcript-msg-user { background: #ffffff; }
.transcript-role {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  min-width: 28px;
  padding-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.transcript-msg-va .transcript-role { color: #1e40af; }
.transcript-text { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
.transcript-prose { font-size: 13px; color: #374151; line-height: 1.5; }
.transcript-prose p { margin: 0 0 6px; }
.transcript-prose p:last-child { margin: 0; }
.transcript-prose strong { font-weight: 600; }
.transcript-prose ul { margin: 4px 0 4px 16px; padding: 0; }

.review-delete-btn {
  background: none;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}
.review-delete-btn:hover { background: #fef2f2; }
.review-cancel-btn {
  background: none;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}
</style>

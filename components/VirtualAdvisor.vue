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

    //- Advisor Profile card (click opens overlay)
    .profile-card
      button.profile-card-header(@click="profileOpen = true")
        .profile-card-icon 🎯
        .profile-card-body
          h2.profile-card-title {{ $t('profile.title') }}
          p.profile-card-desc(v-if="!profileSaved") {{ $t('profile.descEmpty') }}
          p.profile-card-desc(v-else) {{ $t('profile.descSaved') }}
        span.profile-card-tag(v-if="profileSaved") {{ $t('profile.tagActive') }}
        span.profile-card-tag.tag-empty(v-else) {{ $t('profile.tagEmpty') }}
        span.profile-chevron →

  //- Conversation
  .messages-area(v-else ref="messagesArea")
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

      //- Save prompt — shown once after first full exchange, dismissed on save or skip
      .save-prompt-card(v-if="showSavePrompt")
        .save-prompt-text
          strong Save this session?
          span  Keep a record of this conversation as a case study for future reference.
        .save-prompt-actions
          button.save-prompt-yes(@click="showSavePanel = true; savePromptDismissed = true") Save case study
          button.save-prompt-no(@click="savePromptDismissed = true") Not now

  //- Input (only shown once mode is selected)
  .input-area(v-if="mode")

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
        @keydown.enter.exact.prevent="sendMessage"
        :placeholder="isListening ? $t('input.listening') : inputPlaceholder"
        rows="3"
        :disabled="isStreaming"
        :class="{ 'input-listening': isListening, 'input-ready': !isListening && inputText.trim() }"
      )
      button.send-btn(
        @click="sendMessage"
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
        .profile-q(v-for="q in profileQuestions" :key="q.field")
          p.profile-q-label {{ q.question }}

          .profile-voice-bar(v-if="speechSupported")
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
              span.ready-label {{ $t('voice.capturedEdit') }}
              button.voice-btn.voice-btn-redo(@click="toggleProfileListening(q.field)")
                svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                  path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                | {{ $t('voice.recordAgain') }}

          textarea.profile-q-textarea(
            v-if="advisorProfile[q.field] || profileRecordingField === q.field"
            v-model="advisorProfile[q.field]"
            rows="2"
            :class="{ 'pq-recording': profileRecordingField === q.field }"
          )

        .profile-q-actions
          button.profile-save-btn(@click="saveProfile") {{ $t('profile.save') }}
          button.profile-clear-btn(v-if="profileSaved" @click="clearProfile") {{ $t('profile.clear') }}
          button.profile-clear-btn(@click="profileOpen = false") {{ $t('profile.back') }}

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
            .case-header-right
              span.case-date {{ formatDate(c.createdAt) }}
              span.case-chevron {{ expandedCaseId === c.id ? '▲' : '▼' }}

          .case-body(v-if="expandedCaseId === c.id")
            .case-summary
              p.case-summary-label AI Recommendation Summary
              p.case-summary-text {{ c.summary }}

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
                      | Tap to speak
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'wentLess'")
                    span.recording-dot
                    span.recording-label Recording...
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('wentLess')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | Stop
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label Captured — edit below or
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('wentLess')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.wentLess || reviewRecordingField === 'wentLess'"
                  v-model="reviewDraft.wentLess"
                  rows="6"
                  placeholder="What was harder than expected? What didn't land well?"
                  :class="{ 'pq-recording': reviewRecordingField === 'wentLess' }"
                )

              .review-field
                label.review-label ✓ What went well?
                .review-voice-bar(v-if="speechSupported")
                  .voice-state.voice-idle(v-if="reviewRecordingField !== 'wentWell' && !reviewDraft.wentWell")
                    button.voice-btn.voice-btn-idle(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Tap to speak
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'wentWell'")
                    span.recording-dot
                    span.recording-label Recording...
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | Stop
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label Captured — edit below or
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('wentWell')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.wentWell || reviewRecordingField === 'wentWell'"
                  v-model="reviewDraft.wentWell"
                  rows="6"
                  placeholder="What worked? What did the client respond well to?"
                  :class="{ 'pq-recording': reviewRecordingField === 'wentWell' }"
                )

              .review-field
                label.review-label → Suggested changes for similar cases
                .review-voice-bar(v-if="speechSupported")
                  .voice-state.voice-idle(v-if="reviewRecordingField !== 'changesRecommended' && !reviewDraft.changesRecommended")
                    button.voice-btn.voice-btn-idle(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Tap to speak
                  .voice-state.voice-recording(v-else-if="reviewRecordingField === 'changesRecommended'")
                    span.recording-dot
                    span.recording-label Recording...
                    button.voice-btn.voice-btn-stop(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                        rect(x="6" y="6" width="12" height="12" rx="2")
                      | Stop
                  .voice-state.voice-ready(v-else)
                    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
                    span.ready-label Captured — edit below or
                    button.voice-btn.voice-btn-redo(@click="toggleReviewListening('changesRecommended')")
                      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                      | Record again
                textarea.review-textarea(
                  v-if="reviewDraft.changesRecommended || reviewRecordingField === 'changesRecommended'"
                  v-model="reviewDraft.changesRecommended"
                  rows="6"
                  placeholder="What would you do differently next time?"
                  :class="{ 'pq-recording': reviewRecordingField === 'changesRecommended' }"
                )

              .review-actions
                button.review-save-btn(@click="saveReview(c.id)") {{ reviewSavedId === c.id ? '✓ Saved' : 'Save review' }}
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
import { LANGUAGES } from '~/data/languages'
import { saveCase, getRelevantCases, updateCaseReview, deleteCase, getCases } from '~/utils/cases'

function flattenObj (obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(acc, flattenObj(obj[k], key))
    } else {
      acc[key] = obj[k]
    }
    return acc
  }, {})
}

function unflattenObj (flat) {
  const result = {}
  for (const key of Object.keys(flat)) {
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = flat[key]
  }
  return result
}

export default {
  name: 'VirtualAdvisor',

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
    }
  },

  data () {
    return {
      mode: null,
      messages: [],
      inputText: '',
      isStreaming: false,
      streamingText: '',
      isListening: false,
      speechSupported: false,
      recognition: null,
      profileOpen: false,
      profileSaved: false,
      profileRecordingField: null,
      advisorProfile: { experience: '', enjoyment: '', technicalStrengths: '', toolsComfort: '', notes: '' },
      langPickerOpen: false,
      langSearch: '',
      loadingLang: null,
      langError: null,
      showSavePanel: false,
      saveTitle: '',
      saveVisibility: 'shared',
      saveSuccess: false,
      saveError: null,
      myCases: [],
      showCasesPanel: false,
      savePromptDismissed: false,
      showGrowthCurveSelector: false,
      selectedGrowthStage: null,
      growthStages: [
        { name: 'Design', description: 'Developing the business concept, getting ready to leave their job.' },
        { name: 'Launch', description: 'Opening the doors and sharing their dream with the world.' },
        { name: 'Break-even', description: 'The business makes enough money to cover costs.' },
        { name: 'Lifestyle', description: 'The business makes enough profit to allow the owner/s to draw sufficient funds to meet their lifestyle and save money each month.' },
        { name: 'Leverage', description: 'The business can sustain the lifestyle of the owner/s without them being directly hands-on on a daily basis.' },
        { name: 'Reach', description: 'The business is now enjoying multiple locations as the brand is beginning to spread. New products are also part of the picture.' },
        { name: 'Leapfrog', description: 'The business enjoys the ability to purchase or merge with like-minded competitors. Market share is now substantial.' },
        { name: 'Maturity', description: 'The business commands a sizeable market-share and creates a barrier to entry for any business looking to compete against it.' },
        { name: 'Exit / Decline', description: 'The owners realise their capital gain via sale, MBO, or succession to family. (If successful.) Or the business dwindles as the owner/s seek retirement. (If they missed the mark.)' }
      ],
      expandedCaseId: null,
      reviewRecordingField: null,
      reviewDraft: { wentWell: '', wentLess: '', changesRecommended: '' },
      reviewSavedId: null,
      confirmDeleteId: null
    }
  },

  watch: {
    '$i18n.locale' (newLocale, oldLocale) {
      if (this.mode) {
        const currentMode = this.mode
        this.reset()
        this.$nextTick(() => this.selectMode(currentMode))
      }
    }
  },

  computed: {
    currentLanguageName () {
      const lang = LANGUAGES.find(l => l.code === this.$i18n.locale)
      return lang ? lang.name : this.$i18n.locale
    },
    filteredLanguages () {
      if (!this.langSearch) return LANGUAGES
      const q = this.langSearch.toLowerCase()
      return LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q))
    },
    profileQuestions () {
      return [
        { field: 'experience', question: this.$t('profile.questions.experience') },
        { field: 'enjoyment', question: this.$t('profile.questions.enjoyment') },
        { field: 'technicalStrengths', question: this.$t('profile.questions.technicalStrengths') },
        { field: 'toolsComfort', question: this.$t('profile.questions.toolsComfort') },
        { field: 'notes', question: this.$t('profile.questions.notes') }
      ]
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
      return this.profileSaved && (
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
    showSavePrompt () {
      // Show once after the first full exchange (opening + user msg + AI response = 3 messages)
      // Hide while streaming, after dismissed, or after saving
      return this.messages.length >= 3 &&
        !this.isStreaming &&
        !this.savePromptDismissed &&
        !this.saveSuccess
    },
    relevantCases () {
      if (!this.mode) return []
      return getRelevantCases(this.advisorId, this.firmId, this.mode)
    }
  },

  beforeDestroy () {
    document.removeEventListener('click', this._onDocClick)
  },

  mounted () {
    this._onDocClick = (e) => {
      if (this.$refs.langPicker && !this.$refs.langPicker.contains(e.target)) {
        this.closeLangPicker()
      }
    }
    document.addEventListener('click', this._onDocClick)

    this.refreshMyCases()

    const saved = localStorage.getItem('va_advisor_profile')
    if (saved) {
      try {
        this.advisorProfile = JSON.parse(saved)
        this.profileSaved = true
      } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      this.speechSupported = true
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'
      this.recognition.onresult = (e) => {
        let transcript = ''
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript
        }
        if (this.profileRecordingField) {
          this.$set(this.advisorProfile, this.profileRecordingField, transcript)
        } else if (this.reviewRecordingField) {
          this.$set(this.reviewDraft, this.reviewRecordingField, transcript)
        } else {
          this.inputText = transcript
        }
      }
      this.recognition.onend = () => {
        if (this.isListening) {
          this.recognition.start()
        } else if (this.profileRecordingField) {
          this.recognition.start()
        } else if (this.reviewRecordingField) {
          this.recognition.start()
        }
      }
      this.recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          this.isListening = false
        }
      }
    }
  },

  methods: {
    toggleLangPicker () {
      this.langPickerOpen = !this.langPickerOpen
      if (this.langPickerOpen) {
        this.$nextTick(() => this.$refs.langSearch && this.$refs.langSearch.focus())
      } else {
        this.langSearch = ''
        this.langError = null
      }
    },

    closeLangPicker () {
      this.langPickerOpen = false
      this.langSearch = ''
      this.langError = null
    },

    async changeLocale (lang) {
      if (this.loadingLang) return
      if (this.$i18n.locale === lang.code) { this.closeLangPicker(); return }
      if (!this.$i18n.messages[lang.code]) {
        this.loadingLang = lang.code
        this.langError = null
        try {
          await this.loadDynamicLocale(lang)
        } catch (e) {
          this.langError = 'Translation failed — please try again.'
          this.loadingLang = null
          return
        }
        this.loadingLang = null
      }
      this.$i18n.locale = lang.code
      this.closeLangPicker()
    },

    async loadDynamicLocale (lang) {
      const cacheKey = `va_locale_${lang.code}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        this.$i18n.setLocaleMessage(lang.code, JSON.parse(cached))
        return
      }
      const flat = flattenObj(this.$i18n.messages.en)
      const res = await fetch('/api/translate/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: flat, langCode: lang.code })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const translated = await res.json()
      if (translated.error) throw new Error(translated.error)
      const nested = unflattenObj(translated)
      this.$i18n.setLocaleMessage(lang.code, nested)
      localStorage.setItem(cacheKey, JSON.stringify(nested))
    },

    refreshMyCases () {
      this.myCases = getCases().filter(c => c.advisorId === this.advisorId)
    },

    saveSession () {
      this.saveError = null
      if (!this.saveTitle.trim()) return
      try {
        const lastAI = [...this.messages].reverse().find(m => m.role === 'assistant')
        const summary = lastAI ? lastAI.content.slice(0, 600) + (lastAI.content.length > 600 ? '…' : '') : ''
        saveCase({
          advisorId: this.advisorId,
          firmId: this.firmId,
          title: this.saveTitle.trim(),
          mode: this.mode,
          transcript: this.messages,
          summary,
          visibility: this.saveVisibility
        })
        this.refreshMyCases()
        this.saveSuccess = true
        this.saveTitle = ''
        setTimeout(() => {
          this.saveSuccess = false
          this.showSavePanel = false
        }, 1500)
      } catch (e) {
        this.saveError = 'Could not save. Please try again.'
      }
    },

    closeCasesPanel () {
      this.showCasesPanel = false
      this.expandedCaseId = null
      if (this.reviewRecordingField) { this.recognition && this.recognition.stop(); this.reviewRecordingField = null }
      this.reviewDraft = { wentWell: '', wentLess: '', changesRecommended: '' }
      this.reviewSavedId = null
      this.confirmDeleteId = null
    },

    toggleCase (id) {
      if (this.expandedCaseId === id) {
        this.expandedCaseId = null
        return
      }
      this.expandedCaseId = id
      this.confirmDeleteId = null
      this.reviewSavedId = null
      const c = this.myCases.find(c => c.id === id)
      this.reviewDraft = c && c.review
        ? { wentWell: c.review.wentWell || '', wentLess: c.review.wentLess || '', changesRecommended: c.review.changesRecommended || '' }
        : { wentWell: '', wentLess: '', changesRecommended: '' }
    },

    saveReview (caseId) {
      updateCaseReview(caseId, { ...this.reviewDraft, reviewedAt: new Date().toISOString() })
      this.refreshMyCases()
      this.closeCasesPanel()
    },

    deleteCaseAndRefresh (id) {
      deleteCase(id)
      this.refreshMyCases()
      this.expandedCaseId = null
      this.confirmDeleteId = null
    },

    modeName (mode) {
      return { client: 'Client situation', discover: 'Discovery', plan: 'Planning', learn: 'Learning' }[mode] || mode
    },

    formatDate (iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    },

    selectMode (selected) {
      this.mode = selected
      this.messages = [{ role: 'assistant', content: this.$t(`opening.${selected}`) }]
      this.$nextTick(() => this.scrollToBottom())
    },

    reset () {
      this.mode = null
      this.messages = []
      this.inputText = ''
      this.streamingText = ''
      this.showSavePanel = false
      this.saveTitle = ''
      this.saveSuccess = false
      this.saveError = null
      this.savePromptDismissed = false
      this.showGrowthCurveSelector = false
      this.selectedGrowthStage = null
    },

    submitGrowthStage () {
      if (!this.selectedGrowthStage) return
      const stage = this.growthStages.find(s => s.name === this.selectedGrowthStage)
      this.inputText = `${stage.name} — ${stage.description}`
      this.showGrowthCurveSelector = false
      this.selectedGrowthStage = null
      this.sendMessage()
    },

    closeSession () {
      window.close()
    },

    saveProfile () {
      localStorage.setItem('va_advisor_profile', JSON.stringify(this.advisorProfile))
      this.profileSaved = true
      this.profileOpen = false
    },

    clearProfile () {
      this.advisorProfile = { experience: '', toolsComfort: '', strengths: '', notes: '' }
      localStorage.removeItem('va_advisor_profile')
      this.profileSaved = false
    },

    toggleListening () {
      if (!this.recognition) return
      if (this.isListening) {
        this.recognition.stop()
        this.isListening = false
      } else {
        if (this.profileRecordingField) {
          this.recognition.stop()
          this.profileRecordingField = null
        }
        this.inputText = ''
        this.recognition.start()
        this.isListening = true
      }
    },

    toggleProfileListening (field) {
      if (!this.recognition) return
      if (this.profileRecordingField === field) {
        this.recognition.stop()
        this.profileRecordingField = null
      } else {
        if (this.isListening) {
          this.isListening = false
        }
        this.profileRecordingField = field
        this.recognition.start()
      }
    },

    toggleReviewListening (field) {
      if (!this.recognition) return
      if (this.reviewRecordingField === field) {
        this.recognition.stop()
        this.reviewRecordingField = null
      } else {
        this.isListening = false
        this.profileRecordingField = null
        this.reviewRecordingField = field
        this.recognition.start()
      }
    },

    async sendMessage () {
      const query = this.inputText.trim()
      if (!query || this.isStreaming) return

      this.messages.push({ role: 'user', content: query })
      this.inputText = ''
      this.isStreaming = true
      this.streamingText = ''

      await this.$nextTick()
      this.scrollToBottom()

      try {
        const response = await fetch('/api/advisor/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            mode: this.mode,
            language: this.$i18n.locale,
            languageName: this.currentLanguageName,
            orgTemplateIds: this.orgTemplateIds,
            conversationHistory: this.conversationHistory.slice(0, -1),
            advisorProfile: this.hasAdvisorProfile ? this.advisorProfile : null,
            caseSummaries: this.relevantCases.map(c => ({
              title: c.title,
              mode: c.mode,
              visibility: c.visibility,
              summary: c.summary,
              date: c.createdAt
            }))
          })
        })

        if (!response.ok) throw new Error('Request failed')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() // retain any incomplete trailing line
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'delta') {
                this.streamingText += data.text
                await this.$nextTick()
                this.scrollToBottom()
              } else if (data.type === 'done') {
                let content = this.streamingText
                if (content.includes('[GROWTH_CURVE_SELECTOR]')) {
                  content = content.replace('[GROWTH_CURVE_SELECTOR]', '').trim()
                  this.showGrowthCurveSelector = true
                }
                this.messages.push({ role: 'assistant', content })
                this.streamingText = ''
                this.isStreaming = false
              }
            } catch (parseErr) {
              // malformed SSE line — skip silently
            }
          }
        }

        // Fallback: if stream ended without a done event (e.g. finish_reason !== 'stop')
        if (this.isStreaming) {
          if (this.streamingText) {
            let content = this.streamingText
            if (content.includes('[GROWTH_CURVE_SELECTOR]')) {
              content = content.replace('[GROWTH_CURVE_SELECTOR]', '').trim()
              this.showGrowthCurveSelector = true
            }
            this.messages.push({ role: 'assistant', content })
            this.streamingText = ''
          }
          this.isStreaming = false
        }
      } catch (e) {
        this.messages.push({ role: 'assistant', content: this.$t('error') })
        this.isStreaming = false
        this.streamingText = ''
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
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
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
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 680px;
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
.card-client:hover  { border-color: #bfdbfe; }
.card-discover:hover { border-color: #ddd6fe; }
.card-plan:hover    { border-color: #a7f3d0; }
.card-learn:hover   { border-color: #fde68a; }

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
.profile-q { display: flex; flex-direction: column; gap: 6px; }
.profile-q-label { font-size: 13px; font-weight: 600; color: #1e40af; margin: 0; }
.profile-voice-bar { display: flex; align-items: center; }
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
}
.profile-q-textarea:focus { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,0.08); }
.pq-recording { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,0.1) !important; }

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
.message-bubble { max-width: 75%; padding: 14px 18px; border-radius: 12px; font-size: 14px; line-height: 1.6; }
.bubble-user { background: #1e40af; color: white; border-radius: 12px 4px 12px 12px; }
.bubble-advisor { background: #f9fafb; border: 1px solid #e5e7eb; color: #111827; border-radius: 4px 12px 12px 12px; }

.prose ::v-deep strong { font-weight: 600; }
.prose ::v-deep h2 { font-size: 15px; font-weight: 700; margin: 12px 0 6px; color: #1e40af; }
.prose ::v-deep h3 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
.prose ::v-deep ul { margin: 6px 0; padding-left: 20px; }
.prose ::v-deep li { margin: 3px 0; }
.prose ::v-deep p { margin: 6px 0; }

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
.case-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.case-date { font-size: 12px; color: #9ca3af; }
.case-chevron { font-size: 10px; color: #9ca3af; }

.case-body { padding: 16px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 16px; }
.case-summary-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
.case-summary-text { font-size: 13px; color: #374151; line-height: 1.5; margin: 0; max-height: 80px; overflow-y: auto; }

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

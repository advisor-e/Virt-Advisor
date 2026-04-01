<template lang="pug">
.advisor-container
  //- Header
  .advisor-header
    .advisor-header-inner
      .advisor-logo
        span.advisor-logo-icon VA
        div
          h1.advisor-title Virtual Advisor
          p.advisor-subtitle Powered by Advisor-e
      .header-actions
        button.btn-clear(v-if="mode" @click="reset") ← Main menu
        button.btn-close(@click="closeSession" title="Close") ✕

  //- Mode selection
  .mode-screen(v-if="!mode")
    p.mode-intro How would you like to start?
    p.mode-sub Choose an option below and I'll guide you from there
    .mode-cards
      button.mode-card(@click="selectMode('client')")
        .mode-card-icon 🧑‍💼
        .mode-card-body
          h2.mode-card-title I have a client situation
          p.mode-card-desc
            | Tell me about a challenge your client is facing. I'll ask a few questions
            | to understand the context — then recommend the right template(s) in the right order.
          span.mode-card-tag Guided · Facilitative

      button.mode-card(@click="selectMode('discover')")
        .mode-card-icon 🔍
        .mode-card-body
          h2.mode-card-title I want to find something specific
          p.mode-card-desc
            | Looking for a template similar to something you know, or one that
            | combines two capabilities? Describe what you have in mind.
          span.mode-card-tag Quick · Discovery

    //- Advisor Profile
    .profile-card
      button.profile-card-header(@click="profileOpen = !profileOpen")
        .profile-card-icon 🎯
        .profile-card-body
          h2.profile-card-title Your advisor profile
          p.profile-card-desc(v-if="!profileSaved") Answer a few questions once — I'll use your background in every recommendation, without asking again.
          p.profile-card-desc(v-else) Saved · tap to review or update
        span.profile-card-tag(v-if="profileSaved") Profile active
        span.profile-card-tag.tag-empty(v-else) Not set up
        span.profile-chevron {{ profileOpen ? '▲' : '▼' }}

      .profile-questions(v-if="profileOpen")
        .profile-q(v-for="q in profileQuestions" :key="q.field")
          p.profile-q-label {{ q.question }}

          //- Voice bar (mirrors main chat pattern)
          .profile-voice-bar(v-if="speechSupported")

            //- State 1: Idle
            .voice-state.voice-idle(v-if="profileRecordingField !== q.field && !advisorProfile[q.field]")
              button.voice-btn.voice-btn-idle(@click="toggleProfileListening(q.field)")
                svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
                  path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                | Tap to speak

            //- State 2: Recording
            .voice-state.voice-recording(v-else-if="profileRecordingField === q.field")
              span.recording-dot
              span.recording-label Recording — speak now
              button.voice-btn.voice-btn-stop(@click="toggleProfileListening(q.field)")
                svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
                  rect(x="6" y="6" width="12" height="12" rx="2")
                | Stop recording

            //- State 3: Captured
            .voice-state.voice-ready(v-else)
              svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
                path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
              span.ready-label Captured — edit below or record again
              button.voice-btn.voice-btn-redo(@click="toggleProfileListening(q.field)")
                svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                  path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
                | Record again

          textarea.profile-q-textarea(
            v-if="advisorProfile[q.field] || profileRecordingField === q.field"
            v-model="advisorProfile[q.field]"
            rows="2"
            :class="{ 'pq-recording': profileRecordingField === q.field }"
          )

        .profile-q-actions
          button.profile-save-btn(@click="saveProfile") Save profile
          button.profile-clear-btn(v-if="profileSaved" @click="clearProfile") Clear
          button.profile-clear-btn(@click="profileOpen = false") ← Main menu

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

  //- Input (only shown once mode is selected)
  .input-area(v-if="mode")

    //- Voice status bar
    .voice-bar(v-if="speechSupported")

      //- State 1: Idle
      .voice-state.voice-idle(v-if="!isListening && !inputText.trim()")
        button.voice-btn.voice-btn-idle(@click="toggleListening" :disabled="isStreaming")
          svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
            path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
          | Tap to speak

      //- State 2: Recording
      .voice-state.voice-recording(v-else-if="isListening")
        span.recording-dot
        span.recording-label Recording — speak now
        button.voice-btn.voice-btn-stop(@click="toggleListening")
          svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
            rect(x="6" y="6" width="12" height="12" rx="2")
          | Stop recording

      //- State 3: Ready to send
      .voice-state.voice-ready(v-else-if="inputText.trim()")
        svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
          path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
        span.ready-label Captured — review then Send
        button.voice-btn.voice-btn-redo(@click="toggleListening")
          svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
            path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
          | Record again

    //- Text input + send
    .input-inner
      textarea.message-input(
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        :placeholder="isListening ? '🎤 Listening...' : inputPlaceholder"
        rows="3"
        :disabled="isStreaming"
        :class="{ 'input-listening': isListening, 'input-ready': !isListening && inputText.trim() }"
      )
      button.send-btn(
        @click="sendMessage"
        :disabled="!inputText.trim() || isStreaming || isListening"
      )
        span(v-if="isStreaming") ...
        span(v-else) Send

    p.input-hint(v-if="!speechSupported") Press Enter to send · Shift+Enter for new line
</template>

<script>
const OPENING = {
  client: 'Great — let\'s work through this together.\n\nTell me about your client and the situation you want to address — I\'ll use that, along with what I already know about you, to find the right template.\n\n**What\'s the core situation or challenge you\'re looking to address with this client?**',
  discover: 'Sure — let\'s find you the right template.\n\n**Tell me what you have in mind. You can describe it by what it does ("something that helps clients understand their cash flow"), by a combination of topics ("strategic planning plus team engagement"), or by a name you half-remember ("something like the Working Capital one"). The more detail you give, the better I can match it.**'
}

export default {
  name: 'VirtualAdvisor',

  props: {
    orgTemplateIds: {
      type: Array,
      default: null
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
      profileQuestions: [
        {
          field: 'experience',
          question: 'How long have you been delivering advisory work?'
        },
        {
          field: 'enjoyment',
          question: 'What kind of advisory conversations do you enjoy most or feel you do best?'
        },
        {
          field: 'technicalStrengths',
          question: 'What are the areas you feel technically strong in?'
        },
        {
          field: 'toolsComfort',
          question: 'How comfortable are you using structured tools and frameworks?'
        },
        {
          field: 'notes',
          question: 'Is there anything else about how you work that would help me tailor my recommendations to you?'
        }
      ]
    }
  },

  computed: {
    inputPlaceholder () {
      return this.mode === 'discover'
        ? "Describe what you're looking for..."
        : 'Type your answer...'
    },
    conversationHistory () {
      return this.messages.map(m => ({ role: m.role, content: m.content }))
    },
    hasAdvisorProfile () {
      return this.profileSaved && (this.advisorProfile.experience || this.advisorProfile.strengths)
    },
    profileSummary () {
      const text = this.advisorProfile.experience || this.advisorProfile.enjoyment || ''
      return text.length > 70 ? text.slice(0, 70) + '…' : text
    }
  },

  mounted () {
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
        } else {
          this.inputText = transcript
        }
      }
      this.recognition.onend = () => {
        if (this.isListening) {
          this.recognition.start()
        } else if (this.profileRecordingField) {
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
    selectMode (selected) {
      this.mode = selected
      this.messages = [{ role: 'assistant', content: OPENING[selected] }]
      this.$nextTick(() => this.scrollToBottom())
    },

    reset () {
      this.mode = null
      this.messages = []
      this.inputText = ''
      this.streamingText = ''
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
            orgTemplateIds: this.orgTemplateIds,
            conversationHistory: this.conversationHistory.slice(0, -1),
            advisorProfile: this.hasAdvisorProfile ? this.advisorProfile : null
          })
        })

        if (!response.ok) throw new Error('Request failed')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
          for (const line of lines) {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta') {
              this.streamingText += data.text
              await this.$nextTick()
              this.scrollToBottom()
            } else if (data.type === 'done') {
              this.messages.push({ role: 'assistant', content: this.streamingText })
              this.streamingText = ''
              this.isStreaming = false
            }
          }
        }
      } catch (e) {
        this.messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
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
  height: 100vh;
  max-width: 860px;
  margin: 0 auto;
  background: #ffffff;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Header */
.advisor-header {
  border-bottom: 1px solid #dbeafe;
  padding: 16px 24px;
  background: #1e40af;
  flex-shrink: 0;
}
.advisor-header-inner { display: flex; align-items: center; justify-content: space-between; }
.advisor-logo { display: flex; align-items: center; gap: 12px; }
.advisor-logo-icon {
  background: rgba(255,255,255,0.2);
  color: #ffffff;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}
.advisor-title { font-size: 18px; font-weight: 700; color: #ffffff; margin: 0; }
.advisor-subtitle { font-size: 12px; color: #bfdbfe; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }
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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 32px 24px 24px;
  background: linear-gradient(160deg, #eff6ff 0%, #ffffff 55%);
}
.mode-intro {
  font-size: 22px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 6px;
  text-align: center;
}
.mode-sub {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  text-align: center;
}
.mode-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 580px;
}
.mode-card {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  background: #ffffff;
  border: 2px solid #dbeafe;
  border-radius: 14px;
  padding: 22px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  box-shadow: 0 1px 4px rgba(30, 64, 175, 0.06);
}
.mode-card:hover {
  border-color: #1e40af;
  box-shadow: 0 6px 20px rgba(30, 64, 175, 0.12);
  transform: translateY(-2px);
}
.mode-card-icon { font-size: 30px; flex-shrink: 0; margin-top: 2px; }
.mode-card-body { display: flex; flex-direction: column; gap: 5px; }
.mode-card-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
.mode-card-desc { font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0; }
.mode-card-tag {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  border-radius: 20px;
  padding: 3px 10px;
  width: fit-content;
}

/* Advisor Profile */
.profile-card {
  width: 100%;
  max-width: 580px;
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
</style>

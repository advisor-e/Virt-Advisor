<template lang="pug">
.course-msg(:class="isVa ? 'msg-va' : 'msg-user'")
  .msg-avatar(v-if="isVa") VA
  .msg-bubble
    template(v-if="streaming")
      div(v-if="streamingHtml" v-html="streamingHtml" class="prose")
      .typing-indicator(v-else)
        span
        span
        span
        span.thinking-label VA is thinking...
    template(v-else)
      div(v-if="role === 'assistant'" v-html="renderedHtml" class="prose")
      p(v-else) {{ content }}
</template>

<script>
/**
 * CourseMessage — presentational chat bubble for the course-builder design and
 * session screens. Renders one of: a user message (plain text), an assistant
 * message (pre-rendered HTML), or the live "VA is thinking…" streaming bubble
 * (typing dots, or partial HTML as tokens arrive). Extracted from
 * CourseBuilder.vue (CB-23 step 2) to de-duplicate the four near-identical
 * bubble blocks across the two screens.
 *
 * SECURITY: this component v-html's `renderedHtml` / `streamingHtml` verbatim.
 * The parent MUST sanitise (its `renderMarkdown` runs MarkdownIt with images/raw
 * HTML disabled + DOMPurify — CB-05) before passing them in. Never hand this
 * component unsanitised markup.
 */
export default {
  name: 'CourseMessage',
  props: {
    /** 'user' | 'assistant' — ignored while `streaming` (always renders as VA). */
    role: { type: String, default: 'assistant' },
    /** Plain text of a user message. */
    content: { type: String, default: '' },
    /** Sanitised HTML of an assistant message (from the parent's renderMarkdown). */
    renderedHtml: { type: String, default: '' },
    /** Render the live streaming bubble instead of a settled message. */
    streaming: { type: Boolean, default: false },
    /** Sanitised partial HTML shown while streaming; empty falls back to typing dots. */
    streamingHtml: { type: String, default: '' }
  },
  computed: {
    /** VA (assistant) styling applies to assistant messages and every streaming bubble. */
    isVa () {
      return this.streaming || this.role === 'assistant'
    }
  }
}
</script>

<style scoped>
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

/* ── Markdown inside a bubble ─────────────────────────────
   The assistant's reply arrives as HTML through v-html, so its elements carry
   no scoped-style attribute and ::v-deep is required to reach them. Without
   these rules Bulma's minireset (which zeroes the margin on p, ul and li) wins,
   and a reply with three paragraphs renders as one unbroken wall of text — what
   Mike saw on the course-design screen on 2026-08-03. The values match the
   advisor chat (VirtualAdvisor.vue) so the two screens read the same. */
.prose ::v-deep p { margin: 6px 0; line-height: 1.6; }
.prose ::v-deep p:first-child { margin-top: 0; }
.prose ::v-deep p:last-child { margin-bottom: 0; }
.prose ::v-deep strong { font-weight: 700; }
.prose ::v-deep ul, .prose ::v-deep ol { margin: 6px 0; padding-left: 20px; }
.prose ::v-deep li { margin: 3px 0; }
.prose ::v-deep h2 { font-size: 16px; font-weight: 700; margin: 14px 0 6px; color: #1e40af; }
.prose ::v-deep h3 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; color: #1e40af; }
.prose ::v-deep h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin: 14px 0 4px; }
.prose ::v-deep h2:first-child, .prose ::v-deep h3:first-child, .prose ::v-deep h4:first-child { margin-top: 0; }

/* ── Typing indicator ─────────────────────────────────── */
.typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.typing-indicator span { width: 7px; height: 7px; background: #9ca3af; border-radius: 50%; animation: bounce 1.2s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

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
</style>

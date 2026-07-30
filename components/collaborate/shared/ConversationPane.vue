<template lang="pug">
  .conversation(v-if="current")
    .conv-head
      div
        span.has-text-weight-bold {{ current.withName }}
        b-tag.ml-2(v-if="current.kind === 'group'" type="is-warning") {{ $t('messages.groupTag') }}
      b-switch(v-model="autoTranslate" size="is-small") 🌐 {{ $t('messages.autoTranslate') }}
    //- Shared workspace — Advisor-e pages/tools these two are working on together.
    //- Links open Advisor-e (which enforces access); this app stores only the id.
    //- On a 1:1 conversation either party can attach/detach a tool (collaboration
    //- only). Group tools are managed on the group page — read-only here.
    .conv-shared(v-if="canShareTools || (current.sharedPages || []).length")
      span.conv-shared__label {{ $t('group.sharedWorkspace') }}
      .conv-shared__item(v-for="p in (current.sharedPages || [])" :key="p.pageId")
        a.conv-shared__link(:href="p.openUrl" target="_blank" rel="noopener") 📄 {{ p.title }} ↗
        a.conv-shared__remove(v-if="canShareTools" @click="removeTool(p)") {{ $t('group.removeTool') }}
      b-button.is-small.is-light(v-if="canShareTools" @click="openToolPicker") ＋ {{ $t('group.addTool') }}
    .conv-body
      p.has-text-grey.has-text-centered(v-if="!current.messages.length") {{ $t('messages.noMessages') }}
      .msg(v-for="(m, i) in current.messages" :key="i" :class="{ 'msg--me': m.from === 'Me' }")
        .msg-bubble
          span {{ m.text }}
          p.msg-trans(v-if="translations[msgKey(i)]") ⤷ {{ translations[msgKey(i)] }}
        a.msg-translate(v-if="isForeign(m) && !translations[msgKey(i)]" @click="translateMsg(m, i)")
          | {{ translating[msgKey(i)] ? '…' : ('🌐 ' + $t('messages.translate')) }}
        span.msg-from {{ m.from }}
    .conv-reply(v-if="isInvitation")
      template(v-if="current.status === 'request'")
        b-button(type="is-primary" @click="respondInvite(true)") {{ $t('invite.accept') }}
        b-button(@click="respondInvite(false)") {{ $t('invite.decline') }}
      span.has-text-grey.is-size-7(v-else) {{ $t('invite.handled') }}
    .conv-reply(v-else)
      input.input(v-model="reply" :placeholder="$t('messages.type')" @keyup.enter="send")
      button.button.is-light.mic(
        v-if="speechSupported"
        @click="toggleVoiceInput('reply')"
        :class="{ 'is-danger': voiceField === 'reply' }"
        title="Voice input"
      ) 🎤
      b-button(type="is-primary" @click="send") {{ $t('messages.sendBtn') }}
    //- Add-a-tool picker for a 1:1 Shared workspace (mirrors the group page).
    b-modal(v-model="toolModalOpen" has-modal-card)
      .modal-card
        header.modal-card-head
          p.modal-card-title {{ $t('group.addTool') }}
        section.modal-card-body
          b-field(:label="$t('market.fTool')" :message="$t('messages.addToolHint')")
            tool-picker(ref="toolPicker" @select="onToolSelect" @clear="onToolClear")
          b-field(v-if="selectedTool" :label="$t('market.fToolId')")
            .tags.has-addons.mb-0
              span.tag.is-dark {{ selectedTool.pageId }}
        footer.modal-card-foot
          b-button(type="is-primary" :disabled="!selectedTool" @click="addTool") {{ $t('group.addTool') }}
          b-button(@click="toolModalOpen = false") {{ $t('common.cancel') }}
  b-message(v-else type="is-info") {{ $t('messages.empty') }}
</template>

<script>
/**
 * ConversationPane — the shared right-hand conversation view.
 *
 * Extracted from pages/messages.vue (Phase 3 of FEAT-CONNECTING) so BOTH the
 * Messages page and the unified Connecting screen render one tested piece rather
 * than two drifting copies. Self-loads the thread named by the `threadId` prop
 * (GET /api/people/messages/:id) and handles replies, per-message translation,
 * and group-invitation accept/decline. Auto-registered by @nuxt/components as
 * <conversation-pane> (lives in components/shared/).
 */
import speechMixin from '~/mixins/collaborate/speechMixin'
import ToolPicker from '~/components/collaborate/shared/ToolPicker.vue'

export default {
  name: 'ConversationPane',
  components: { ToolPicker },
  mixins: [speechMixin],
  props: {
    // The thread to display; null/empty shows the "pick a conversation" state.
    threadId: { type: String, default: null }
  },
  data () {
    return {
      current: null,
      reply: '',
      autoTranslate: false,
      translations: {},
      translating: {},
      // Add-a-tool picker (1:1 Shared workspace) — uses the shared ToolPicker.
      toolModalOpen: false,
      selectedTool: null
    }
  },
  computed: {
    readerLocale () { return this.$i18n.locale },
    isInvitation () { return !!(this.current && this.current.kind === 'invitation' && this.current.direction === 'incoming') },
    // Only a 1:1 conversation (kind 'outreach') can attach/detach tools here;
    // group tools live on the group page.
    canShareTools () { return !!(this.current && this.current.kind === 'outreach') }
  },
  watch: {
    // Load whenever the selected thread changes (immediate = initial load too).
    threadId: { immediate: true, handler () { this.load() } },
    autoTranslate (on) { if (on) { this.translateAllForeign() } }
  },
  methods: {
    async load () {
      if (!this.threadId) { this.current = null; return }
      try {
        const res = await fetch('/api/people/messages/' + this.threadId)
        if (res.ok) {
          this.current = await res.json()
          // Reset translation state for the newly-loaded thread.
          this.translations = {}
          this.translating = {}
          if (this.autoTranslate) { this.translateAllForeign() }
        }
      } catch (e) {
        this.current = null
      }
    },
    isForeign (m) { return !!m.lang && m.lang !== this.readerLocale },
    msgKey (i) { return (this.current ? this.current.id : '') + ':' + i },
    translateAllForeign () {
      if (!this.current) { return }
      this.current.messages.forEach((m, i) => { if (this.isForeign(m)) { this.translateMsg(m, i) } })
    },
    async translateMsg (m, i) {
      const key = this.msgKey(i)
      if (this.translations[key] || this.translating[key]) { return }
      this.$set(this.translating, key, true)
      try {
        const res = await fetch('/api/translate/locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: { t: m.text }, langCode: this.readerLocale, from: m.lang })
        })
        const data = await res.json()
        if (data && data.t && data.t !== m.text) { this.$set(this.translations, key, data.t) }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.translationFailed'), type: 'is-danger' })
      } finally {
        this.$set(this.translating, key, false)
      }
    },
    async respondInvite (accept) {
      const id = this.current.id
      const verb = accept ? 'accept' : 'decline'
      try {
        const res = await fetch('/api/people/invitations/' + id + '/' + verb, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          this.$buefy.toast.open({
            message: accept ? this.$t('invite.joined') : this.$t('invite.declined'),
            type: accept ? 'is-success' : 'is-info'
          })
          await this.load()
          // Membership/thread changed — tell the parent list to refresh. No payload.
          this.$emit('changed')
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.actionFailed'), type: 'is-danger' })
      }
    },
    async send () {
      const text = (this.reply || '').trim()
      if (!text || !this.current) { return }
      try {
        const res = await fetch('/api/people/messages/' + this.current.id + '/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
        })
        if (res.ok) {
          this.current = await res.json()
          this.reply = ''
          // Last message changed — tell the parent list to refresh. No payload.
          this.$emit('changed')
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.sendFailed'), type: 'is-danger' })
      }
    },
    // Open the picker (the shared ToolPicker loads the catalogue itself).
    openToolPicker () {
      this.toolModalOpen = true
      this.selectedTool = null
      if (this.$refs.toolPicker) { this.$refs.toolPicker.reset() }
    },
    onToolSelect (option) { this.selectedTool = option },
    onToolClear () { this.selectedTool = null },
    // Attach the picked tool to this 1:1 conversation's Shared workspace.
    async addTool () {
      if (!this.selectedTool || !this.current) { return }
      try {
        const res = await fetch('/api/people/messages/' + this.current.id + '/shared-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: this.selectedTool.pageId, title: this.selectedTool.title })
        })
        const data = await res.json()
        if (data.success) {
          this.$set(this.current, 'sharedPages', data.sharedPages)
          this.$buefy.toast.open({ message: this.$t('group.toolAdded'), type: 'is-success' })
          this.toolModalOpen = false
          this.selectedTool = null
        } else {
          const msg = data.error && data.error.message ? data.error.message : this.$t('toast.failed')
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    },
    // Confirm, then detach a tool — removes only the stored reference (nothing in
    // Advisor-e is deleted; the dialog says so).
    removeTool (p) {
      this.$buefy.dialog.confirm({
        message: this.$t('messages.removeToolConfirm', { title: p.title }),
        confirmText: this.$t('group.removeTool'),
        cancelText: this.$t('common.cancel'),
        type: 'is-danger',
        onConfirm: () => this.doRemoveTool(p)
      })
    },
    async doRemoveTool (p) {
      if (!this.current) { return }
      try {
        const res = await fetch('/api/people/messages/' + this.current.id + '/shared-pages/' + encodeURIComponent(p.pageId), {
          method: 'DELETE'
        })
        const data = await res.json()
        if (data.success) {
          this.$set(this.current, 'sharedPages', data.sharedPages)
          this.$buefy.toast.open({ message: this.$t('group.toolRemoved'), type: 'is-success' })
        } else {
          const msg = data.error && data.error.message ? data.error.message : this.$t('toast.failed')
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    }
  }
}
</script>

<style scoped>
.conversation { background: #fff; border-radius: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; min-height: 26rem; }
.conv-head { padding: 1rem 1.25rem; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.conv-shared { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding: .6rem 1.25rem; background: #f7f6ff; border-bottom: 1px solid #eee; }
.conv-shared__label { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.conv-shared__item { display: inline-flex; align-items: center; gap: .3rem; }
.conv-shared__link { font-size: .82rem; color: var(--brand); background: #fff; border: 1px solid #e7e4fb; border-radius: 999px; padding: .2rem .7rem; }
.conv-shared__link:hover { background: #efeafe; }
.conv-shared__remove { font-size: .72rem; color: var(--muted); cursor: pointer; }
.conv-shared__remove:hover { color: #d63031; text-decoration: underline; }
.conv-body { flex: 1; padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
.msg { display: flex; flex-direction: column; align-items: flex-start; }
.msg--me { align-items: flex-end; }
.msg-bubble { background: #f1f0fb; padding: .55rem .9rem; border-radius: 14px; max-width: 80%; white-space: pre-wrap; }
.msg--me .msg-bubble { background: linear-gradient(120deg, var(--brand), var(--brand-2)); color: #fff; }
.msg-trans { font-size: .85em; opacity: .85; margin-top: .35rem; padding-top: .3rem; border-top: 1px solid rgba(0,0,0,.1); }
.msg-translate { font-size: .72rem; color: var(--brand); margin-top: .15rem; cursor: pointer; }
.msg-from { font-size: .7rem; color: #aaa; margin-top: .2rem; }
.conv-reply { display: flex; gap: .5rem; padding: 1rem 1.25rem; border-top: 1px solid #eee; }
.conv-reply .input { flex: 1; }
</style>

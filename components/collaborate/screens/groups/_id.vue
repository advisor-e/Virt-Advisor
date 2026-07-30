<template lang="pug">
  section.section
    .container
      a.back-link(@click="$router.back()") ‹ {{ $t('common.back') }}
      b-message(v-if="loading" type="is-info") Loading…
      b-message(v-else-if="!group" type="is-danger") {{ $t('group.notFound') }}
      template(v-else)
        .section-banner.section-banner--groups
          span.ico {{ group.icon }}
          h1 {{ group.name }}
          page-help(help-key="groupDetail")
        .box
          p.has-text-grey.mb-4 {{ $t('group.createdBy') }} {{ group.createdBy }} · {{ group.firms }} {{ $t('discover.firms') }} · {{ group.memberCount }} {{ $t('discover.members') }}
          p.label {{ $t('group.about') }}
          p.mb-4 {{ group.summary }}
          .tags
            span.tag(v-for="t in (group.tags || [])" :key="t") {{ t }}
          p.label.mt-5 {{ $t('group.members') }}
          .members
            .member(v-for="m in (group.members || [])" :key="m.id")
              .avatar(:style="avatarStyle(m)") {{ initials(m) }}
              span {{ m.name }}

          //- Shared workspace — deep-links to the Advisor-e pages/tools the group
          //- co-creates. This app stores only the page ID; the link opens Advisor-e,
          //- which enforces access. Members can attach a tool (collaboration only —
          //- separate from on-selling it). Seam: Q-PAGE-URL.
          .is-flex.is-align-items-center.is-justify-content-space-between.mt-5.mb-2
            p.label.mb-0 {{ $t('group.sharedWorkspace') }}
            b-button.is-small.is-light(v-if="group.joinStatus === 'member'" @click="openToolPicker") ＋ {{ $t('group.addTool') }}
          p.has-text-grey.is-size-7(v-if="!(group.sharedPages || []).length") {{ $t('group.noSharedPages') }}
          .is-flex.is-align-items-center.is-justify-content-space-between.mb-2(v-for="p in (group.sharedPages || [])" :key="p.pageId")
            span 📄 {{ p.title }}
            .buttons.mb-0
              a.button.is-small.is-light(:href="p.openUrl" target="_blank" rel="noopener") {{ $t('group.openInAdvisorE') }} ↗
              b-button.is-small.is-light(v-if="group.joinStatus === 'member'" @click="removeTool(p)") {{ $t('group.removeTool') }}

          .buttons.mt-5
            span.tag.is-success.is-light.is-medium(v-if="group.joinStatus === 'member'") ✓ {{ $t('group.member') }}
            span.tag.is-warning.is-light.is-medium(v-else-if="group.joinStatus === 'requested'") ⏳ {{ $t('group.requestPending') }}
            b-button(v-else type="is-warning" :loading="joining" @click="join") {{ $t('common.requestToJoin') }}
            b-button(@click="openGroupChat") {{ $t('group.openGroupChat') }}

        //- Manager-only: approve/decline requests to join this group. "Manage" is
        //- approximated as membership (RBAC seam) — see server/data/repository.js.
        .box(v-if="group.joinStatus === 'member'")
          p.label {{ $t('group.joinRequests') }}
          p.has-text-grey.is-size-7(v-if="!joinRequests.length") {{ $t('group.noRequests') }}
          .level.is-mobile(v-for="r in joinRequests" :key="r.id")
            .level-left
              .avatar(:style="avatarStyle(r.advisor)") {{ initials(r.advisor) }}
              div.ml-3
                p.has-text-weight-semibold {{ r.advisor.name }}
                p.has-text-grey.is-size-7(v-if="r.advisor.firm") {{ r.advisor.firm }}
            .level-right
              .buttons.mb-0
                b-button(type="is-success" size="is-small" @click="respondRequest(r, true)") {{ $t('group.approve') }}
                b-button(size="is-small" @click="respondRequest(r, false)") {{ $t('group.decline') }}

        //- Add-a-tool picker: search the Advisor-e catalogue and attach a tool to
        //- the group's Shared workspace (collaboration only — not an on-sell).
        b-modal(v-model="toolModalOpen" has-modal-card)
          .modal-card
            header.modal-card-head
              p.modal-card-title {{ $t('group.addTool') }} · {{ group.name }}
            section.modal-card-body
              b-field(:label="$t('market.fTool')" :message="$t('group.addToolHint')")
                tool-picker(ref="toolPicker" @select="onToolSelect" @clear="onToolClear")
              b-field(v-if="selectedTool" :label="$t('market.fToolId')")
                .tags.has-addons.mb-0
                  span.tag.is-dark {{ selectedTool.pageId }}
            footer.modal-card-foot
              b-button(type="is-primary" :disabled="!selectedTool" @click="addTool") {{ $t('group.addTool') }}
              b-button(@click="toolModalOpen = false") {{ $t('common.cancel') }}
</template>

<script>
import ToolPicker from '~/components/collaborate/shared/ToolPicker.vue'

export default {
  name: 'GroupDetailPage',
  components: { ToolPicker },
  data () {
    return {
      group: null,
      loading: true,
      joining: false,
      joinRequests: [],
      // Add-a-tool picker (reuses the shared Advisor-e catalogue picker).
      toolModalOpen: false,
      selectedTool: null
    }
  },
  async mounted () {
    try {
      const res = await fetch('/api/people/groups/' + this.$route.params.id)
      if (res.ok) {
        this.group = await res.json()
        // Managers (members, in the current approximation) see pending join requests.
        if (this.group && this.group.joinStatus === 'member') { await this.loadRequests() }
      }
    } catch (e) {
      // leave null -> not-found state
    } finally {
      this.loading = false
    }
  },
  methods: {
    initials (m) {
      return (m.name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    },
    avatarStyle (m) {
      const colors = ['#6C5CE7', '#00C2A8', '#FF6B9D', '#14B8D8', '#FFB020', '#FF7A59']
      let h = 0
      const id = m.id || ''
      for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0 }
      const c = colors[h % colors.length]
      return { background: 'linear-gradient(135deg, ' + c + ', ' + c + 'cc)' }
    },
    async join () {
      this.joining = true
      try {
        const res = await fetch('/api/people/groups/' + this.group.id + '/join', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          // Reflect the pending state on the page immediately.
          this.$set(this.group, 'joinStatus', data.status === 'member' ? 'member' : 'requested')
          this.$buefy.toast.open({ message: this.$t('group.requested'), type: 'is-success' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.requestFailed'), type: 'is-danger' })
      } finally {
        this.joining = false
      }
    },
    // One-click: open (lazily create) the group's shared chat room, then jump to
    // it in Connecting — where the reply box lives. Replaces the old compose-first
    // modal. Group room = members only under Model A (server enforces at the
    // SEC-THREAD-ACL seam once real auth lands).
    async openGroupChat () {
      try {
        const res = await fetch('/api/people/groups/' + this.group.id + '/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          this.$router.push('/connecting?thread=' + data.threadId)
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    },
    async loadRequests () {
      try {
        const res = await fetch('/api/people/groups/' + this.group.id + '/requests')
        if (res.ok) { this.joinRequests = (await res.json()).requests || [] }
      } catch (e) {
        // Non-blocking: a failed load just leaves the requests list empty.
      }
    },
    // Open the add-a-tool picker (the shared ToolPicker loads the catalogue itself).
    openToolPicker () {
      this.toolModalOpen = true
      this.selectedTool = null
      if (this.$refs.toolPicker) { this.$refs.toolPicker.reset() }
    },
    onToolSelect (option) { this.selectedTool = option },
    onToolClear () { this.selectedTool = null },
    // Attach the picked tool to the group's Shared workspace (collaboration only).
    async addTool () {
      if (!this.selectedTool) { return }
      try {
        const res = await fetch('/api/people/groups/' + this.group.id + '/shared-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: this.selectedTool.pageId, title: this.selectedTool.title })
        })
        const data = await res.json()
        if (data.success) {
          this.$set(this.group, 'sharedPages', data.sharedPages)
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
    // Confirm, then detach a tool from the Shared workspace. Removes only the
    // stored reference — nothing in Advisor-e is deleted (message says so).
    removeTool (p) {
      this.$buefy.dialog.confirm({
        message: this.$t('group.removeToolConfirm', { title: p.title }),
        confirmText: this.$t('group.removeTool'),
        cancelText: this.$t('common.cancel'),
        type: 'is-danger',
        onConfirm: () => this.doRemoveTool(p)
      })
    },
    async doRemoveTool (p) {
      try {
        const res = await fetch('/api/people/groups/' + this.group.id + '/shared-pages/' + encodeURIComponent(p.pageId), {
          method: 'DELETE'
        })
        const data = await res.json()
        if (data.success) {
          this.$set(this.group, 'sharedPages', data.sharedPages)
          this.$buefy.toast.open({ message: this.$t('group.toolRemoved'), type: 'is-success' })
        } else {
          const msg = data.error && data.error.message ? data.error.message : this.$t('toast.failed')
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    },
    // Approve/decline one pending join request, then refresh the group + list.
    async respondRequest (r, accept) {
      const verb = accept ? 'accept' : 'decline'
      try {
        const res = await fetch('/api/people/group-requests/' + r.id + '/' + verb, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        if (res.ok) {
          this.$buefy.toast.open({
            message: accept ? this.$t('group.approvedToast') : this.$t('group.declinedToast'),
            type: accept ? 'is-success' : 'is-light'
          })
          // Reload the group (member list/count may have changed) and the requests.
          const gRes = await fetch('/api/people/groups/' + this.group.id)
          if (gRes.ok) { this.group = await gRes.json() }
          await this.loadRequests()
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.actionFailed'), type: 'is-danger' })
      }
    }
  }
}
</script>

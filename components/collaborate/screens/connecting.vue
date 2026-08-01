<template lang="pug">
  section.section
    .container
      .section-banner.section-banner--connecting
        span.ico 🔗
        h1 {{ $t('connecting.title') }}
        page-help(help-key="connecting")
      b-message(v-if="loading" type="is-info") {{ $t('connecting.loading') }}
      template(v-else)
        .cx-controls
          b-input.cx-search(v-model="search" :placeholder="$t('connecting.searchPlaceholder')" rounded)
          .cx-sort
            span.cx-sort__label.has-text-grey.is-size-7 {{ $t('connecting.sortBy') }}
            .buttons.has-addons.mb-0
              button.button.is-small(:class="{ 'is-primary': sort === 'recent' }" @click="sort = 'recent'") {{ $t('connecting.sortRecent') }}
              button.button.is-small(:class="{ 'is-primary': sort === 'name' }" @click="sort = 'name'") {{ $t('connecting.sortName') }}

        .cx-tabs
          button.cx-tab(
            v-for="t in tabs"
            :key="t.key"
            :class="{ 'is-active': tab === t.key }"
            @click="tab = t.key"
          )
            | {{ $t('connecting.tab.' + t.key) }}
            span.cx-tab__count {{ t.count }}

        .columns
          .column.is-two-fifths
            p.has-text-grey.mt-4(v-if="!visibleRows.length") {{ $t('connecting.empty') }}
            .cx-row(
              v-for="r in visibleRows"
              :key="r.rowKey"
              :class="{ 'is-selected': r.threadId && r.threadId === selectedThreadId }"
              @click="openRow(r)"
            )
              .avatar.cx-avatar(:style="avatarStyle(r)") {{ rowIcon(r) }}
              .cx-row__text
                p.cx-row__name
                  span.has-text-weight-semibold {{ r.name }}
                  span.tag.is-light.ml-2 {{ $t('connecting.type.' + r.type) }}
                p.cx-row__sub.has-text-grey.is-size-7.truncate {{ rowSubtitle(r) }}
              //- Inline accept/decline for an incoming connection request.
              .cx-actions(v-if="r.type === 'request-incoming'")
                b-button(type="is-success" size="is-small" @click.stop="respondRequest(r, true)") {{ $t('connections.accept') }}
                b-button(size="is-small" @click.stop="respondRequest(r, false)") {{ $t('connections.decline') }}

          .column
            //- Shared conversation view; reloads the list when a reply is sent or
            //- a group invitation is handled inside the pane.
            conversation-pane(:thread-id="selectedThreadId" @changed="load")
</template>

<script>
/**
 * Connecting — the unified inbox (Q-CONN-MSG-IA → Option B).
 *
 * ONE screen blending conversations (1:1 + group) and connections, driven by the
 * merged backend feed GET /api/people/connecting (see server/data/repository.js
 * listConnecting). Phase 3: the conversation shows side-by-side on the right via
 * the shared <conversation-pane>, and incoming connection requests are
 * accepted/declined inline on their row. A threadless group still opens its group
 * page (its "Message the group" seam). Phase 4 retires the standalone Connections
 * page and wires the nav. See design/ACTIONS.md.
 */
export default {
  name: 'ConnectingPage',
  data () {
    return { rows: [], loading: true, search: '', tab: 'all', sort: 'recent', selectedThreadId: null }
  },
  computed: {
    // Tab a row belongs to: connection requests AND group invitations both fall
    // under "Requests" (anything awaiting a decision) — the owner-chosen grouping.
    tabs () {
      const keys = ['all', 'chats', 'groups', 'connections', 'requests']
      return keys.map(key => ({
        key,
        count: key === 'all' ? this.rows.length : this.rows.filter(r => this.tabOf(r.type) === key).length
      }))
    },
    // Rows for the active tab, then narrowed by the search box.
    filteredRows () {
      const byTab = this.tab === 'all' ? this.rows : this.rows.filter(r => this.tabOf(r.type) === this.tab)
      const q = (this.search || '').trim().toLowerCase()
      if (!q) { return byTab }
      return byTab.filter((r) => {
        const hay = (r.name + ' ' + (r.firm || '') + ' ' + (r.subtitle || '')).toLowerCase()
        return hay.includes(q)
      })
    },
    // Sorted for display. 'recent' keeps the backend order (conversations first);
    // 'name' is alphabetical. Real activity-time sort is a MySQL seam.
    visibleRows () {
      if (this.sort !== 'name') { return this.filteredRows }
      return this.filteredRows.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
  },
  async mounted () {
    await this.load()
    // Open a conversation from a deep-link (e.g. a notification or a "Message"
    // button, incl. links redirected from the retired /messages route).
    const q = this.$route.query.thread
    if (q) { this.selectedThreadId = q }
  },
  methods: {
    tabOf (type) {
      if (type === 'chat') { return 'chats' }
      if (type === 'group') { return 'groups' }
      if (type === 'connection') { return 'connections' }
      return 'requests' // invitation, request-incoming, request-outgoing
    },
    async load () {
      this.loading = true
      try {
        const res = await fetch('/api/people/connecting')
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const data = await res.json()
        this.rows = data.rows || []
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.loadConnections'), type: 'is-danger' })
      } finally {
        this.loading = false
      }
    },
    initials (name) {
      return (name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    },
    avatarStyle (r) {
      const colors = ['#6C5CE7', '#00C2A8', '#FF6B9D', '#14B8D8', '#FFB020', '#FF7A59']
      let h = 0
      const id = r.advisorId || r.groupId || r.rowKey || ''
      for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0 }
      const c = colors[h % colors.length]
      return { background: 'linear-gradient(135deg, ' + c + ', ' + c + 'cc)' }
    },
    rowIcon (r) {
      if (r.type === 'group' || r.type === 'group-request') { return r.icon || '👥' }
      if (r.type === 'invitation') { return '✉️' }
      return this.initials(r.name)
    },
    rowSubtitle (r) {
      if (r.type === 'group-request') { return this.$t('connecting.requestPending') }
      return r.subtitle || r.firm || ''
    },
    // Open a row. Conversations (incl. group invitations) show in the pane on the
    // right; a connection with no thread yet creates one first; a threadless group
    // opens its group page. Incoming requests use their inline buttons, not this.
    async openRow (r) {
      if (r.type === 'request-incoming') { return }
      // Groups (and pending group requests) ALWAYS open the group's full page —
      // members, Shared workspace, Add-a-tool, and "Message the group" for the chat.
      // (A group with an existing chat used to open the chat and hide its page.)
      if ((r.type === 'group' || r.type === 'group-request') && r.groupId) { this.$router.push('/groups/' + r.groupId); return }
      if (r.threadId) { this.selectedThreadId = r.threadId; return }
      if (r.type === 'connection' && r.advisorId) {
        try {
          const res = await fetch('/api/people/advisors/' + r.advisorId + '/thread', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
          })
          const data = await res.json()
          if (data.success) { this.selectedThreadId = data.threadId; await this.load(); return }
          this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-warning' })
        } catch (e) {
          this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
        }
      }
    },
    // Accept/decline an incoming connection request in place, then refresh the list.
    async respondRequest (r, accept) {
      const verb = accept ? 'accept' : 'decline'
      try {
        const res = await fetch('/api/people/connections/' + r.connectionId + '/' + verb, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        if (res.ok) {
          this.$buefy.toast.open({
            message: accept ? this.$t('connections.acceptedToast') : this.$t('connections.declinedToast'),
            type: accept ? 'is-success' : 'is-light'
          })
          await this.load()
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    }
  }
}
</script>

<style scoped>
.cx-controls { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.cx-search { flex: 1; min-width: 14rem; }
.cx-sort { display: flex; flex-direction: column; gap: .25rem; }
.cx-sort__label { margin-left: .1rem; }

.cx-tabs { display: flex; flex-wrap: wrap; gap: .5rem; border-bottom: 1px solid #eee; padding-bottom: .75rem; }
.cx-tab {
  border: 1px solid transparent; background: #f4f3ff; color: var(--brand);
  border-radius: 999px; padding: .35rem .9rem; font-size: .85rem; cursor: pointer; font-weight: 300;
}
.cx-tab:hover { background: #efeafe; }
.cx-tab.is-active { background: var(--brand); color: #fff; }
.cx-tab__count { margin-left: .4rem; opacity: .75; font-size: .78rem; }

.cx-row { display: flex; align-items: center; gap: .7rem; padding: .6rem .5rem; border-radius: 12px; color: inherit; cursor: pointer; }
.cx-row:hover { background: #f4f3ff; }
.cx-row.is-selected { background: #efeafe; }
.cx-row__text { min-width: 0; flex: 1; }
.cx-row__name { margin-bottom: .1rem; }
.cx-avatar { width: 42px; height: 42px; border-radius: 12px; margin: 0; font-size: .82rem; }
.cx-actions { display: flex; gap: .35rem; flex: none; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 16rem; }
</style>

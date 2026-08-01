<template lang="pug">
  section.section
    .container
      .section-banner.section-banner--discover
        span.ico 🔎
        h1 {{ $t('discover.title') }}
        page-help(help-key="discover")

      b-tabs(v-model="tab")
        b-tab-item(:label="$t('discover.people')" value="people")
        b-tab-item(:label="$t('discover.groups')" value="groups")

      .field.has-addons
        .control.is-expanded
          input.input(v-model="inputText" :placeholder="$t('discover.placeholder')" @keyup.enter="search")
        .control(v-if="speechSupported")
          button.button(@click="toggleListening" :class="{ 'is-danger': isListening }" title="Voice input") 🎤
        .control
          button.button.is-primary(@click="search") {{ $t('common.search') }}

      b-field(v-if="tab === 'people'")
        b-checkbox(v-model="availableOnly" @input="search") {{ $t('discover.availableOnly') }}

      b-message(v-if="loading" type="is-info") Loading…

      template(v-else-if="tab === 'people'")
        p.has-text-grey(v-if="!people.length") {{ $t('discover.noResults') }}
        .box(v-for="p in people" :key="p.id")
          .level.is-mobile
            .level-left
              .avatar(:style="avatarStyle(p)") {{ initials(p.name) }}
              div
                p.is-size-5.has-text-weight-semibold
                  | {{ p.name }}
                  b-tag.ml-2(v-if="p.available" type="is-success") {{ $t('common.available') }}
                p.has-text-grey.is-size-7 {{ p.title }} · {{ p.firm }} · {{ p.city }}, {{ p.country }}
                p.has-text-grey.is-size-7 {{ (p.strengths || []).join(', ') }}
            .level-right
              .buttons
                button.button.is-small(v-if="!p.connectionStatus || p.connectionStatus === 'none'" @click="connect(p)") ＋ {{ $t('common.connect') }}
                span.button.is-small.is-static(v-else-if="p.connectionStatus === 'pending_out'") ⏳ {{ $t('common.requested') }}
                nuxt-link.button.is-small.is-light(v-else-if="p.connectionStatus === 'pending_in'" to="/connecting") {{ $t('common.respond') }}
                span.button.is-small.is-success.is-light(v-else-if="p.connectionStatus === 'connected'") ✓ {{ $t('common.connected') }}
                button.button.is-primary.is-small(@click="openOutreach(p)") {{ $t('common.reachOut') }}
                button.button.is-link.is-small.is-light(@click="openInvite(p)") {{ $t('common.inviteToGroup') }}

      template(v-else)
        .buttons.is-right.mb-2
          nuxt-link.button.is-warning(to="/groups/new") ＋ {{ $t('group.create') }}
        p.has-text-grey(v-if="!groups.length") {{ $t('discover.noResults') }}
        .box(v-for="g in groups" :key="g.id")
          nuxt-link.group-head.is-flex.is-align-items-center.mb-2(:to="'/groups/' + g.id")
            span.group-badge {{ g.icon }}
            div
              p.is-size-5.has-text-weight-semibold.has-text-dark {{ g.name }}
              p.has-text-grey.is-size-7 {{ g.firms }} {{ $t('discover.firms') }} · {{ g.memberCount }} {{ $t('discover.members') }}
          p {{ g.summary }}
          .tags.mt-2
            span.tag(v-for="t in (g.tags || [])" :key="t") {{ t }}
          .buttons.mt-2
            nuxt-link.button.is-small.is-light(:to="'/groups/' + g.id") {{ $t('common.view') }}
            span.button.is-small.is-static(v-if="g.joinStatus === 'member'") ✓ {{ $t('group.member') }}
            span.button.is-small.is-static(v-else-if="g.joinStatus === 'requested'") ⏳ {{ $t('group.requestPending') }}
            button.button.is-warning.is-small(v-else @click="requestJoin(g)") {{ $t('common.requestToJoin') }}

      b-modal(v-model="outreachOpen" has-modal-card)
        .modal-card
          header.modal-card-head
            p.modal-card-title
              | {{ $t('outreach.title') }}
              span(v-if="outreachTarget")  · {{ outreachTarget.name }}
          section.modal-card-body
            b-message(type="is-info" size="is-small") {{ $t('outreach.hint') }}
            b-field(:label="$t('outreach.context')")
              b-input(type="textarea" v-model="outreach.context")
            button.button.is-light.is-small.mb-4(
              v-if="speechSupported"
              @click="toggleVoiceInput('outreach.context')"
              :class="{ 'is-danger': voiceField === 'outreach.context' }"
              title="Voice input"
            ) 🎤
            b-field(:label="$t('outreach.ask')")
              b-input(v-model="outreach.ask")
            button.button.is-light.is-small(
              v-if="speechSupported"
              @click="toggleVoiceInput('outreach.ask')"
              :class="{ 'is-danger': voiceField === 'outreach.ask' }"
              title="Voice input"
            ) 🎤
          footer.modal-card-foot
            b-button(type="is-primary" @click="sendOutreach") {{ $t('outreach.send') }}
            b-button(@click="outreachOpen = false") {{ $t('common.cancel') }}
            span.has-text-grey.is-size-7.ml-2 {{ $t('outreach.onePerPerson') }}

      b-modal(v-model="inviteOpen" has-modal-card)
        .modal-card
          header.modal-card-head
            p.modal-card-title
              | {{ $t('invite.title') }}
              span(v-if="inviteTarget")  · {{ inviteTarget.name }}
          section.modal-card-body
            b-message(v-if="!myGroups.length" type="is-warning" size="is-small") {{ $t('invite.noGroups') }}
            template(v-else)
              b-field(:label="$t('invite.whichGroup')")
                b-select(v-model="invite.groupId" expanded)
                  option(v-for="g in myGroups" :key="g.id" :value="g.id") {{ g.icon }} {{ g.name }}
              b-field(:label="$t('invite.note')")
                b-input(type="textarea" v-model="invite.note")
          footer.modal-card-foot
            b-button(type="is-primary" :disabled="!invite.groupId" @click="sendInvite") {{ $t('invite.send') }}
            b-button(@click="inviteOpen = false") {{ $t('common.cancel') }}
</template>

<script>
import speechMixin from '~/mixins/collaborate/speechMixin'

export default {
  name: 'DiscoverPage',
  mixins: [speechMixin],
  data () {
    return {
      tab: this.$route.query.tab === 'groups' ? 'groups' : 'people',
      inputText: '',
      availableOnly: false,
      people: [],
      groups: [],
      loading: false,
      outreachOpen: false,
      outreachTarget: null,
      outreach: { context: '', ask: '' },
      inviteOpen: false,
      inviteTarget: null,
      myGroups: [],
      invite: { groupId: '', note: '' }
    }
  },
  watch: {
    tab (val) {
      // Keep the active tab in the URL so "back" from a group returns here
      // on the same tab, instead of resetting to People.
      if (this.$route.query.tab !== val) {
        this.$router.replace({ query: { ...this.$route.query, tab: val } }).catch(() => {})
      }
      this.search()
    }
  },
  mounted () {
    this.search()
  },
  methods: {
    initials (name) {
      return (name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    },
    avatarStyle (p) {
      const colors = ['#6C5CE7', '#00C2A8', '#FF6B9D', '#14B8D8', '#FFB020', '#FF7A59']
      let h = 0
      const id = p.id || ''
      for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0 }
      const c = colors[h % colors.length]
      return { background: 'linear-gradient(135deg, ' + c + ', ' + c + 'cc)' }
    },
    async requestJoin (g) {
      try {
        const res = await fetch('/api/people/groups/' + g.id + '/join', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          // Reflect the pending state on the card immediately (like people's ⏳ Requested).
          this.$set(g, 'joinStatus', data.status === 'member' ? 'member' : 'requested')
          this.$buefy.toast.open({ message: this.$t('group.requested'), type: 'is-success' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.requestFailed'), type: 'is-danger' })
      }
    },
    async connect (p) {
      try {
        const res = await fetch('/api/people/advisors/' + p.id + '/connect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          p.connectionStatus = 'pending_out'
          this.$buefy.toast.open({ message: this.$t('common.requested'), type: 'is-success' })
        } else {
          // Surface a handled rejection (e.g. the cross-firm wall) instead of failing silently.
          const msg = data.error && data.error.message ? data.error.message : 'Request failed'
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.requestFailed'), type: 'is-danger' })
      }
    },
    async search () {
      this.loading = true
      try {
        if (this.tab === 'people') {
          const params = new URLSearchParams({ q: this.inputText, available: this.availableOnly ? 'true' : 'false' })
          const res = await fetch('/api/people/advisors?' + params.toString())
          if (!res.ok) { throw new Error('HTTP ' + res.status) }
          this.people = await res.json()
        } else {
          const params = new URLSearchParams({ q: this.inputText })
          const res = await fetch('/api/people/groups?' + params.toString())
          if (!res.ok) { throw new Error('HTTP ' + res.status) }
          this.groups = await res.json()
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.searchFailed'), type: 'is-danger' })
      } finally {
        this.loading = false
      }
    },
    openOutreach (p) {
      this.outreachTarget = p
      this.outreach = { context: '', ask: '' }
      this.outreachOpen = true
    },
    async openInvite (p) {
      this.inviteTarget = p
      this.invite = { groupId: '', note: '' }
      try {
        const res = await fetch('/api/people/my-groups')
        this.myGroups = await res.json()
        if (this.myGroups.length) { this.invite.groupId = this.myGroups[0].id }
      } catch (e) {
        this.myGroups = []
      }
      this.inviteOpen = true
    },
    async sendInvite () {
      if (!this.invite.groupId) { return }
      try {
        const res = await fetch('/api/people/groups/' + this.invite.groupId + '/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ advisorId: this.inviteTarget.id, note: this.invite.note })
        })
        const data = await res.json()
        if (data.success) {
          this.inviteOpen = false
          this.$buefy.toast.open({ message: this.$t('invite.sent'), type: 'is-success' })
        } else {
          const msg = data.error && data.error.message ? data.error.message : 'Invite failed'
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.inviteFailed'), type: 'is-danger' })
      }
    },
    async sendOutreach () {
      if (!this.outreach.context) {
        this.$buefy.toast.open({ message: this.$t('outreach.needReason'), type: 'is-warning' })
        return
      }
      try {
        const res = await fetch('/api/people/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toId: this.outreachTarget.id, context: this.outreach.context, ask: this.outreach.ask })
        })
        const data = await res.json()
        if (data.success) {
          this.outreachOpen = false
          this.$buefy.toast.open({ message: this.$t('outreach.sent'), type: 'is-success' })
          this.$router.push('/connecting?thread=' + data.threadId)
        } else {
          // Surface a handled rejection (e.g. the cross-firm wall) instead of failing silently.
          const msg = data.error && data.error.message ? data.error.message : 'Send failed'
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.sendFailed'), type: 'is-danger' })
      }
    }
  }
}
</script>

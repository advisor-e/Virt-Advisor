<template lang="pug">
  header.navbar.is-light(role="navigation" aria-label="main navigation")
    .navbar-brand
      //- "/collaborate", not "/": in the merged app "/" is the Virtual Advisor
      //- home — Collaborate's own home lives behind the front-door page.
      nuxt-link.navbar-item.has-text-weight-bold(to="/collaborate") {{ $t('app.name') }}
    .navbar-menu.is-active
      .navbar-start
        nuxt-link.navbar-item.nav-link.nav--discover(to="/discover") {{ $t('nav.discover') }}
        nuxt-link.navbar-item.nav-link.nav--connecting(to="/connecting") {{ $t('nav.connecting') }}
        nuxt-link.navbar-item.nav-link.nav--market(to="/marketplace") {{ $t('nav.marketplace') }}
        nuxt-link.navbar-item.nav-link.nav--profile(to="/profile") {{ $t('nav.profile') }}
        nuxt-link.navbar-item.nav-link.nav--firm(v-if="firmManager" to="/firm") {{ $t('nav.firm') }}
      .navbar-end
        .navbar-item
          .notif-bell(ref="notifBell")
            button.button.is-small.notif-toggle(@click="toggleNotif" :aria-label="$t('notif.title')" :title="$t('notif.title')")
              span.bell-ico 🔔
              span.notif-badge(v-if="unreadCount") {{ unreadCount }}
            .notif-dropdown(v-if="notifOpen")
              .notif-head
                span.has-text-weight-semibold {{ $t('notif.title') }}
                button.button.is-small.is-white(v-if="unreadCount" @click="markAllRead") {{ $t('notif.markAllRead') }}
              p.notif-empty(v-if="!notifications.length") {{ $t('notif.empty') }}
              ul.notif-list(v-else)
                li(v-for="n in notifications" :key="n.id")
                  a.notif-item(:class="{ 'is-unread': !n.read }" @click="openNotif(n)")
                    span.notif-dot(v-if="!n.read")
                    span.notif-text {{ notifText(n) }}
        .navbar-item
          .lang-picker(ref="langPicker")
            button.button.is-small(@click="toggleLangPicker") 🌐 {{ currentLanguageName }}
            .lang-dropdown(v-if="langPickerOpen")
              input.input.is-small(ref="langSearch" v-model="langSearch" :placeholder="$t('common.search')")
              p.help.is-danger(v-if="langError") {{ langError }}
              ul.lang-list
                li(v-for="lang in filteredLanguages" :key="lang.code")
                  button.button.is-small.is-white.is-fullwidth.lang-item(
                    @click="changeLocale(lang)"
                    :class="{ 'is-loading': loadingLang === lang.code }"
                  ) {{ lang.name }}
</template>

<script>
import localeMixin from '~/mixins/collaborate/localeMixin'

export default {
  name: 'AppHeader',
  mixins: [localeMixin],
  data () {
    return { notifOpen: false, notifications: [], unreadCount: 0, firmManager: false }
  },
  mounted () {
    this.loadNotifications()
    this.loadMe()
    // Independent outside-click handler for the bell (localeMixin has its own for
    // the language picker; Vue runs both merged mounted hooks).
    this._onDocClickNotif = (e) => {
      if (this.$refs.notifBell && !this.$refs.notifBell.contains(e.target)) {
        this.notifOpen = false
      }
    }
    document.addEventListener('click', this._onDocClickNotif)
  },
  beforeDestroy () {
    document.removeEventListener('click', this._onDocClickNotif)
  },
  methods: {
    // Render a notification's visible text from its type + params via i18n, so no
    // English string is stored server-side (CLAUDE.md §Internationalisation).
    notifText (n) {
      return this.$t('notif.' + n.type, n.params || {})
    },
    // Show the manager-only "Firm" nav link when the signed-in user is a firm
    // manager. RBAC SEAM: this flag comes from the mock today; a real role once
    // FEAT-RBAC lands. Degrade quietly (no link) if the call fails.
    async loadMe () {
      try {
        const res = await fetch('/api/people/me')
        if (!res.ok) { return }
        const me = await res.json()
        this.firmManager = !!me.firmManager
      } catch (e) {
        this.firmManager = false
      }
    },
    async loadNotifications () {
      // Passive background load in the global header — degrade quietly if the
      // backend is unreachable (an empty bell), rather than firing a toast on
      // every page. User-initiated actions below still surface errors.
      try {
        const res = await fetch('/api/people/notifications')
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const data = await res.json()
        this.notifications = Array.isArray(data.items) ? data.items : []
        this.unreadCount = data.unread || 0
      } catch (e) {
        this.notifications = []
        this.unreadCount = 0
      }
    },
    toggleNotif () {
      this.notifOpen = !this.notifOpen
    },
    async markAllRead () {
      try {
        const res = await fetch('/api/people/notifications/read', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.notifications = this.notifications.map(n => Object.assign({}, n, { read: true }))
        this.unreadCount = 0
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.updateNotifications'), type: 'is-danger' })
      }
    },
    openNotif (n) {
      this.notifOpen = false
      this.markAllRead()
      if (n.link && this.$route.path !== n.link) { this.$router.push(n.link) }
    }
  }
}
</script>

<style scoped>
.lang-picker { position: relative; }
.lang-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 30;
  width: 16rem;
  max-height: 20rem;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.lang-list { margin-top: 0.5rem; list-style: none; }
.lang-item { justify-content: flex-start; }

.notif-bell { position: relative; }
.notif-toggle { position: relative; }
.bell-ico { font-size: 1rem; line-height: 1; }
.notif-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #FF6B9D;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1.1rem;
  text-align: center;
}
.notif-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 30;
  width: 20rem;
  max-height: 24rem;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.notif-empty { color: #7a7a7a; padding: 0.75rem 0.25rem; }
.notif-list { list-style: none; }
.notif-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  color: #363636;
}
.notif-item:hover { background: #f5f5f5; }
.notif-item.is-unread { background: #f0eefc; }
.notif-item.is-unread:hover { background: #e8e4fb; }
.notif-dot {
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #6C5CE7;
}
.notif-text { font-size: 0.85rem; }
</style>

<template lang="pug">
  .viewas-bar(v-if="viewingAs")
    span.viewas-txt 👁 {{ $t('firm.viewingAs', { name: viewingAs.asName }) }}
    button.button.is-small.viewas-exit(:class="{ 'is-loading': exiting }" @click="exit") {{ $t('firm.exitView') }}
</template>

<script>
/**
 * ViewAsBanner — the persistent bar shown while a firm manager is viewing the app
 * "as" one of their advisers (Stage 3 of the firm-manager feature). It reads the
 * view-as state from GET /api/people/me (server-validated) and offers the one-click
 * way back. Lives in the default layout so it sits above every page. Starting and
 * exiting view-as both do a full reload, so the banner is always in sync on load.
 */
export default {
  name: 'ViewAsBanner',
  data () {
    return { viewingAs: null, exiting: false }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      try {
        const res = await fetch('/api/people/me')
        if (!res.ok) { return }
        const me = await res.json()
        this.viewingAs = me.viewingAs || null
      } catch (e) {
        this.viewingAs = null
      }
    },
    // Isolated so tests can stub the reload without a jsdom navigation error.
    reloadTo (url) { window.location.href = url },
    async exit () {
      this.exiting = true
      try {
        await fetch('/api/people/firm/view-as', { method: 'DELETE' })
      } catch (e) {
        // Even on a network hiccup, send them back to the console to recover.
      }
      this.reloadTo('/firm')
    }
  }
}
</script>

<style scoped>
.viewas-bar {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  background: #ffb020; color: #4a3200;
  padding: .5rem 1rem; font-size: .9rem; font-weight: 400;
  position: sticky; top: 0; z-index: 40;
}
.viewas-txt { letter-spacing: .01em; }
.viewas-exit { background: #4a3200; color: #fff; border: 0; font-weight: 500; }
.viewas-exit:hover { background: #5f4200; color: #fff; }
</style>

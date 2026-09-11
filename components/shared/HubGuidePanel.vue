<template lang="pug">
.hgp(:class="{ 'is-closed': !open }")
  .is-flex.is-justify-content-space-between.is-align-items-center
    h4.hgp-title(role="button" tabindex="0" @click="toggle" @keydown.enter.prevent="toggle" @keydown.space.prevent="toggle") {{ $t('hubGuide.title') }}
    b-button(v-if="open" size="is-small" outlined type="is-primary" @click="close") {{ $t('hubGuide.gotIt') }}
  template(v-if="open")
    p.hgp-intro {{ intro }}
    ol.hgp-points
      li(v-for="(p, i) in points" :key="i") {{ p }}
</template>

<script>
/**
 * HubGuidePanel — "How to use this page", the plain-words panel at the top of a hub page.
 *
 * Asked for by Mike 2026-09-11: *"I have no idea how I, as a mentor, am supposed to use this
 * function and what I'm learning from it."* Drawing: `design/mockups/hub-page-guidance.html`,
 * question 2 ruled the same day: open on the first visit, closed after Got it, remembered on
 * that browser; the title stays so one click reopens it.
 *
 * The remembered state is a per-browser convenience and nothing more, so it is browser
 * storage, read in `mounted` and never at render time (SSR rule). A browser that refuses
 * storage simply shows the panel open each visit.
 */
export default {
  name: 'HubGuidePanel',

  props: {
    /** Distinct per page, so closing one page's panel leaves the others open. */
    storageKey: { type: String, required: true },
    intro: { type: String, required: true },
    /** The numbered points, already translated. */
    points: { type: Array, required: true }
  },

  data () {
    return { open: true }
  },

  computed: {
    /** @returns {string} */
    key () {
      return 'hub-guide:' + this.storageKey
    }
  },

  mounted () {
    try {
      if (window.localStorage.getItem(this.key) === 'closed') { this.open = false }
    } catch (_e) { /* storage refused: the panel stays open */ }
  },

  methods: {
    close () {
      this.open = false
      this.remember('closed')
    },

    toggle () {
      this.open = !this.open
      this.remember(this.open ? 'open' : 'closed')
    },

    /** @param {string} state */
    remember (state) {
      try { window.localStorage.setItem(this.key, state) } catch (_e) { /* ignored */ }
    }
  }
}
</script>

<style scoped>
.hgp {
  background: rgba(0, 112, 192, 0.09);
  border: 1px solid rgba(0, 112, 192, 0.33);
  border-left: 3px solid #0070c0;
  border-radius: 0 12px 12px 0;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
.hgp.is-closed { padding: 0.55rem 1.1rem; }
.hgp-title { font-weight: 600; font-size: 0.95rem; margin: 0; cursor: pointer; color: #002b64; }
.hgp-title:focus-visible { outline: 2px solid #00b1e0; outline-offset: 2px; border-radius: 3px; }
.hgp-intro { margin: 0.4rem 0 0; }
.hgp-points { margin: 0.4rem 0 0 1.25rem; }
.hgp-points li { margin: 0.3rem 0; }
</style>

<template lang="pug">
  .page-help
    button.button.is-small.page-help__btn(type="button" @click="open = true") {{ $t('help.button') }}
    //- Plain Bulma modal (not Buefy's b-modal). Toggled by the `open` flag via
    //- the `is-active` class; renders the component's own computed help copy.
    .modal.page-help__modal(:class="{ 'is-active': open }")
      .modal-background(@click="close")
      .modal-card.page-help__card
        header.modal-card-head
          p.modal-card-title {{ $t('help.modalTitle') }}
          button.delete(type="button" aria-label="close" @click="close")
        section.modal-card-body
          p.has-text-weight-semibold.mb-3(v-if="intro") {{ intro }}
          ul.page-help__list
            li(v-for="(line, i) in body" :key="i") {{ line }}
        footer.modal-card-foot
          button.button.is-primary(type="button" @click="close") {{ $t('help.close') }}
</template>

<script>
/**
 * PageHelp — a "How to use this page" button that opens a help pop-up.
 *
 * Auto-registered by @nuxt/components (it lives in components/base/), so it is
 * used as <page-help> with no import. Drop it in a page banner:
 *   page-help(help-key="discover")
 *
 * Display only — no business logic, no API calls. All copy lives in
 * locales/en.json under `help.<helpKey>` ({ title?, body: [string] }) so it
 * stays translatable. Built on a plain Bulma modal (not Buefy's b-modal, whose
 * slot content rendered blank in this project) so the pop-up shows the
 * component's own computed copy directly.
 */
export default {
  name: 'PageHelp',
  props: {
    // i18n key under `help.` holding this page's { title, body } help copy.
    helpKey: { type: String, required: true }
  },
  data () {
    return { open: false }
  },
  computed: {
    // The help.<helpKey> object for the active locale, falling back to the
    // bundled English. getLocaleMessage() returns the raw message tree (arrays
    // intact, unlike the $i18n.messages getter) and respects whichever locale
    // is active — dynamically generated locales include the help.* strings too.
    entry () {
      const pick = (locale) => {
        const messages = this.$i18n.getLocaleMessage(locale) || {}
        return (messages.help && messages.help[this.helpKey]) || null
      }
      return pick(this.$i18n.locale) || pick('en') || {}
    },
    intro () {
      return this.entry.title || ''
    },
    body () {
      return Array.isArray(this.entry.body) ? this.entry.body : []
    }
  },
  mounted () {
    // Close on Escape. Listener added in mounted() so it stays client-only (SSR-safe).
    this._onKeydown = (e) => { if (e.key === 'Escape') { this.close() } }
    document.addEventListener('keydown', this._onKeydown)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this._onKeydown)
  },
  methods: {
    close () {
      this.open = false
    }
  }
}
</script>

<style scoped>
.page-help { margin-left: auto; }
.page-help__btn {
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.55);
  color: #fff;
  font-weight: 300;
}
.page-help__btn:hover,
.page-help__btn:focus { background: rgba(255, 255, 255, 0.32); color: #fff; }
.page-help__list { list-style: disc; padding-left: 1.25rem; }
.page-help__list li { margin-bottom: 0.5rem; }
/* The button sits inside a banner whose CSS sets white text; reset a normal
   dark colour on the pop-up so its copy isn't white-on-white (invisible). */
.page-help__card { color: #363636; }
.page-help__modal .modal-card-title { color: #363636; }
.page-help__modal .modal-card-body { color: #363636; text-align: left; }
</style>

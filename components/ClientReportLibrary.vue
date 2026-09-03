<template lang="pug">
.crl-root
  .crl-wrap
    .crl-eyebrow {{ $t('clientReports.library.eyebrow') }}
    h1.crl-h1 {{ $t('clientReports.library.title') }}
    p.crl-lede {{ $t('clientReports.library.lede') }}

    p.crl-note(v-if="notice") {{ notice }}

    .crl-grid(v-else-if="loaded")
      component.crl-card(
        v-for="model in models"
        :key="model.route || model.name"
        :is="isOpen(model) ? 'nuxt-link' : 'div'"
        v-bind="isOpen(model) ? { to: model.route } : {}"
        :class="{ 'is-locked': !isOpen(model) }"
        :data-state="isOpen(model) ? 'open' : 'locked'"
      )
        .crl-ctag {{ model.category }}
        h3.crl-cname {{ model.name }}
        p.crl-csum {{ model.summary }}
        span.crl-status(v-if="isOpen(model)") {{ $t('clientReports.library.openLabel') }}
        span.crl-status.is-locked(v-else) {{ $t('clientReports.library.lockedLabel') }}

    p.crl-sample(v-if="loaded && !notice") {{ $t('clientReports.library.sampleNote') }}
</template>

<script>
/**
 * ClientReportLibrary — the BUSINESS ENTITY's own view of the Model Library, at
 * /my-reports (design/features/business-entity-reports.md, approved by Mike 2026-09-03).
 *
 * Every catalogued model is a card. A model the advisor has OPENED to this client links
 * to the report; every other one is greyed and cannot open, with one line: "Your advisor
 * will open this with you." (D1 hidden by default, D2 greyed card.)
 *
 * The open set comes from the backend for the client in the verified token — the page
 * never decides for itself, and a 403 (an advisor's token, say) shows a message rather
 * than a list. Until saved reports exist (part 2) an open card shows the calculator with
 * sample figures, and the note at the foot says so.
 */
import { MODELS, isOpenable } from '~/utils/reportModelCatalogue'
import { getMyReports } from '~/utils/clientReports'

const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'ClientReportLibrary',

  data () {
    return {
      loaded: false,
      notice: '',
      open: {}
    }
  },

  computed: {
    /** Only models with a route can ever be open; the rest are greyed like a hidden one. */
    models () {
      return MODELS.filter(m => m.route)
    }
  },

  async mounted () {
    if (typeof window === 'undefined' || typeof fetch !== 'function') { return }
    let token = ''
    try { token = window.localStorage.getItem(TOKEN_KEY) || '' } catch (e) { token = '' }
    if (!token) {
      this.notice = this.$t('clientReports.library.signIn')
      return
    }
    try {
      const data = await getMyReports(token)
      this.open = data.open || {}
      this.loaded = true
    } catch (err) {
      this.notice = this.$t(err && err.status === 403
        ? 'clientReports.library.notEntity'
        : 'clientReports.library.loadFailed')
    }
  },

  methods: {
    /**
     * Open to this client AND actually built — a "soon" model can be switched on by an
     * advisor ahead of time but never opens a dead page.
     * @param {object} model - a catalogue row
     * @returns {boolean}
     */
    isOpen (model) {
      return isOpenable(model) && Object.prototype.hasOwnProperty.call(this.open, model.route)
    }
  }
}
</script>

<style scoped>
.crl-root { background: #eef3f8; min-height: 100vh; padding: 28px 20px 60px; }
.crl-wrap { max-width: 1120px; margin: 0 auto; }
.crl-eyebrow { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #0070c0; font-weight: 600; }
.crl-h1 { margin: 4px 0 6px; font-size: 26px; color: #002b64; }
.crl-lede { color: #5b6f8a; margin: 0 0 22px; }
.crl-note { background: #fff; border: 1px solid #d5e1ee; border-radius: 10px; padding: 14px; color: #002b64; }
.crl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.crl-card {
  display: block; text-decoration: none; color: #002b64;
  background: #fff; border: 1px solid #d5e1ee; border-radius: 12px; padding: 14px;
}
.crl-card.is-locked { background: #f1f6fb; opacity: .75; cursor: default; }
.crl-card.is-locked .crl-cname::before { content: "🔒 "; font-size: 13px; }
.crl-ctag { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #5b6f8a; font-weight: 600; }
.crl-cname { margin: 2px 0 4px; font-size: 15px; }
.crl-csum { margin: 0 0 10px; font-size: 13px; color: #5b6f8a; }
.crl-status { font-size: 12.5px; font-weight: 600; color: #4ca52d; }
.crl-status.is-locked { color: #5b6f8a; }
.crl-sample { margin-top: 18px; font-size: 12.5px; color: #5b6f8a; }
</style>

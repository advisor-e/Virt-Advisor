<template lang="pug">
.fsc
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

    p.title.is-5.mb-1 {{ $t('strategyConcepts.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('strategyConcepts.count', { n: rows.length }) }}

    //- §1 — where concepts come from. The four manager levels author; the client receives.
    .fsc-cascade
      template(v-for="(t, i) in TIERS")
        span.fsc-tier(:key="t.tier" :class="{ 'is-you': t.tier === list.viewerTier }") {{ $t(t.label) }}
        span.fsc-arrow(:key="t.tier + '-arrow'") {{ i < TIERS.length - 1 ? '→' : '⇢' }}
      span.fsc-tier.is-client {{ $t('strategyConcepts.cascadeClient') }}
    p.is-size-7.has-text-grey.mb-4 {{ $t('strategyConcepts.cascadeNote', counts) }}

    firm-add-concept(
      v-if="adding"
      :api-token="apiToken"
      :sections="list.sections"
      :limits="list.limits"
      :brand="firmBrand"
      @cancel="adding = false"
      @saved="saved")

    //- §2 — the library, with its one new control.
    .card(v-else)
      header.card-header
        p.card-header-title {{ $t('strategyConcepts.heading') }}
        .card-header-icon
          b-button(type="is-primary" size="is-small" @click="adding = true") {{ $t('strategyConcepts.addButton') }}
      .card-content.p-0
        table.table.is-fullwidth.is-narrow.mb-0
          thead
            tr
              th {{ $t('strategyConcepts.cols.concept') }}
              th {{ $t('strategyConcepts.cols.section') }}
              th {{ $t('strategyConcepts.cols.teaching') }}
              th {{ $t('strategyConcepts.cols.response') }}
              th {{ $t('strategyConcepts.cols.from') }}
              th
          tbody
            tr(v-for="r in rows" :key="r.id")
              td: b {{ r.name }}
              td {{ r.section }}
              td {{ r.teaching ? $t(r.teaching.key, r.teaching.params) : '—' }}
              td {{ $t(r.response.key, r.response.params) }}
              td: span.tag(:class="r.removable ? 'is-warning is-light' : 'is-info is-light'") {{ $t(r.from.key, r.from.params) }}
              td.has-text-right
                b-button(v-if="r.removable" size="is-small" type="is-light" :loading="busy === r.id" @click="confirmRemove(r)") {{ $t('strategyConcepts.remove') }}
</template>

<script>
import DOMPurify from 'isomorphic-dompurify'
import FirmAddConcept from '~/components/firm/FirmAddConcept.vue'
import firmBrand from '~/mixins/firmBrand'
import { libraryRows, cascadeCounts } from '~/utils/strategyConceptRows'
import { intlLocaleFor } from '~/utils/dateLocale'

const BASE = '/api/firm-manager/strategy-concepts'

/** The four manager levels, top first — the level names Session Processes already shows. */
const TIERS = [
  { tier: 'mentor', label: 'sessionProcess.tierMentor' },
  { tier: 'global_group_manager', label: 'sessionProcess.tierGlobalGroupManager' },
  { tier: 'group_manager', label: 'sessionProcess.tierGroupManager' },
  { tier: 'firm_manager', label: 'sessionProcess.tierFirmManager' }
]

/**
 * FirmStrategyConcepts — the Strategy Concepts hub tab (item 15.20), from
 * `design/mockups/add-concept.html` §1–§2 and its approved wording (§8, §8c).
 *
 * The same screen at all four manager levels. A concept one level adds reaches every level
 * beneath at once (question 5); a level removes only what it added itself, and the backend is
 * what enforces that — this screen merely offers Remove where the backend would allow it.
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, deliberate: a concept that ships without a drawing yet — its
 * advisor sees Mike's words instead — shows a dash under Teaching sheet, as the scope menu shows a
 * dash for a page it cannot name, rather than a word nobody approved; the Remove button on a
 * concept added here is §8c's, not drawn on the library.
 */
export default {
  name: 'FirmStrategyConcepts',

  components: { FirmAddConcept },

  mixins: [firmBrand],

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      TIERS,
      loading: true,
      error: '',
      adding: false,
      /** The id of the concept being removed, or ''. */
      busy: '',
      list: { concepts: [], shipped: [], sections: [], viewerTier: '', limits: {} }
    }
  },

  computed: {
    rows () {
      return libraryRows(this.list, iso => this.dateOf(iso))
    },

    counts () {
      return cascadeCounts(this.list)
    }
  },

  mounted () {
    this.loadFirmBrand({ Authorization: `Bearer ${this.apiToken}` })
    this.load()
  },

  methods: {
    async load () {
      this.loading = true
      this.error = ''
      try {
        this.list = await this.api('GET', BASE)
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    saved ({ list, name }) {
      this.list = list
      this.adding = false
      this.$buefy.toast.open({ message: this.$t('strategyConcepts.saved', { name }), type: 'is-success' })
    },

    confirmRemove (row) {
      this.$buefy.dialog.confirm({
        // Buefy renders the message as HTML, and the name is a manager's own typing.
        message: DOMPurify.sanitize(this.$t('strategyConcepts.removeConfirm', { name: row.importedName }), { ALLOWED_TAGS: [] }),
        confirmText: this.$t('strategyConcepts.removeYes'),
        cancelText: this.$t('strategyConcepts.removeNo'),
        type: 'is-danger',
        onConfirm: () => this.remove(row.id)
      })
    },

    async remove (id) {
      this.busy = id
      this.error = ''
      try {
        this.list = await this.api('POST', BASE + '/remove', { id })
      } catch (err) {
        this.error = err.message
      } finally {
        this.busy = ''
      }
    },

    /** @param {string} iso @returns {string} */
    dateOf (iso) {
      return iso ? this.$d(new Date(iso), 'long', intlLocaleFor(this.$i18n.locale)) : ''
    },

    /**
     * Thin authenticated fetch, as the sibling hub tabs have. A failure of any kind ends in
     * Mike's approved sentence rather than the server's own words.
     * @param {string} method
     * @param {string} path
     * @param {Object} [body]
     * @returns {Promise<Object>}
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      let res
      try { res = await fetch(path, opts) } catch (e) { throw new Error(this.$t('strategyConcepts.errors.failed')) }
      if (!res.ok) { throw new Error(this.$t('strategyConcepts.errors.failed')) }
      return res.json()
    }
  }
}
</script>

<style scoped>
.fsc-cascade { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
.fsc-tier { border: 1px solid #dfe6ee; border-radius: 999px; padding: 3px 10px; font-size: 12.5px; background: #fff; }
.fsc-tier.is-you { border-color: #0070c0; box-shadow: 0 0 0 1px #0070c0; font-weight: 600; }
.fsc-tier.is-client { border-style: dashed; color: #6b7c93; }
.fsc-arrow { color: #9aa9ba; }
</style>

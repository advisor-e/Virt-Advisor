<template lang="pug">
section.firm-documents
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmDocuments.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          :placeholder="$t('firmDocuments.searchPlaceholder')"
          :aria-label="$t('firmDocuments.searchPlaceholder')"
        )

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: categories → platform / firm documents (shared FirmRail) ──
    .column.is-4
      firm-rail(
        :sections="sections"
        :query="query.trim()"
        :aria-label="$t('firmDocuments.railLabel')"
        :empty-text="query ? $t('firmDocuments.noMatchHere') : $t('firmDocuments.emptyLibrary')"
        selectable-sections
        @section-click="selectCategory"
      )
        template(v-slot:sub-badge="{ sub }")
          b-tag(:type="sub.total ? 'is-info is-light' : 'is-light'" size="is-small")
            | {{ sub.total ? $tc('firmDocuments.fileCount', sub.total) : $t('firmDocuments.none') }}

        template(v-slot:default="{ sub }")
          button.rail-page(
            v-for="doc in sub.rows"
            :key="doc.id"
            type="button"
            :class="{ 'is-current': current && current.id === doc.id }"
            @click="select(doc, sub)"
          )
            span.rail-pagename {{ doc.name }}

          .rail-empty(v-if="!sub.rows.length")
            span.has-text-grey.is-size-7
              | {{ query ? $t('firmDocuments.noMatchHere') : (sub.source === 'base' ? $t('firmDocuments.noPlatformDocs') : $t('firmDocuments.noFirmDocs')) }}

    //- ── Panel: the selected document, the selected category, or a prompt ──
    .column.is-8
      //- A document: its identity plus the actions it allows. Remove exists
      //- only for the firm's own uploads — platform documents are read-only.
      .box(v-if="current")
        p.is-size-7.has-text-grey {{ currentCategoryLabel }} › {{ currentSubLabel }}
        p.title.is-5.mb-2 {{ current.name }}
        .tags.mb-4
          b-tag(:type="current.source === 'firm' ? 'is-warning is-light' : 'is-light'")
            | {{ current.source === 'firm' ? $t('firmDocuments.originFirm') : $t('firmDocuments.originPlatform') }}
        .buttons
          b-button(type="is-primary" @click="downloadDoc(current)") {{ $t('firmDocuments.download') }}
          b-button(
            v-if="current.source === 'firm'"
            type="is-danger is-light"
            @click="confirmRemove(current)"
          ) {{ $t('firmDocuments.remove') }}

      //- A category: where the firm adds its own material.
      .box(v-else-if="selectedCategory")
        p.title.is-5.mb-4 {{ selectedCategoryLabel }}
        p.has-text-weight-semibold.mb-3 {{ $t('firmDocuments.uploadHeading') }}
        b-field(grouped)
          b-field(expanded :label="$t('firmDocuments.fileLabel')")
            b-upload(v-model="uploadFile" accept=".pdf" expanded)
              a.button.is-light.is-fullwidth
                span {{ uploadFile ? uploadFile.name : $t('firmDocuments.choosePdf') }}
          b-field(:label="'\u00a0'")
            b-button(
              type="is-primary"
              :loading="uploading"
              :disabled="!uploadFile"
              @click="submitUpload"
            ) {{ $t('firmDocuments.upload') }}

      //- Nothing picked yet: say what the two choices do.
      .box.panel-empty(v-else)
        p.has-text-weight-semibold {{ $t('firmDocuments.pickPrompt') }}
        p.has-text-grey.is-size-7 {{ $t('firmDocuments.pickHint') }}
</template>

<script>
/**
 * Firm Document Library (FIRM-EDITABLE-TABLES-PLAN.md Phase 1) — the source
 * PDF documents behind the advisory tables, re-skinned from the Hub's old
 * b-menu + two-table layout onto the shared FirmRail pattern the Quizzes
 * screen established.
 *
 * Lives in its own file rather than inside FirmManagerHub.vue (which is over
 * the decompose rule, CB-23) — the Hub renders it as one tab, exactly like
 * FirmQuizzes.
 *
 * The rail lists every category and both sources INCLUDING empty ones,
 * because seeing the gap is the point. The panel acts: a category takes an
 * upload, a document offers download (and remove, for the firm's own).
 * Storage totals live in the Hub's header, so any change that affects them
 * is emitted rather than handled here.
 *
 * Buttons are text-only by Mike's ruling (2026-07-23): the app loads no icon
 * font, so b-icon props render as blank space — none are used here.
 */
import DOMPurify from 'isomorphic-dompurify'
import FirmRail from '~/components/firm/FirmRail.vue'

/**
 * The upload categories this page manages — the same three the old tab
 * offered (config/integration.js holds the Drive folder names; videos and
 * json-config have their own surfaces). Labels resolve through i18n.
 */
const DOCUMENT_CATEGORIES = [
  { key: 'logic-tables', labelKey: 'firmDocuments.catLogicTables' },
  { key: 'domain-support', labelKey: 'firmDocuments.catDomainSupport' },
  { key: 'templates', labelKey: 'firmDocuments.catTemplates' }
]

export default {
  name: 'FirmDocuments',

  components: { FirmRail },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      categories: DOCUMENT_CATEGORIES,
      /** Loaded lists per category key: { base: [], firm: [] }. */
      docs: {},
      query: '',
      /** The document on screen ({...row, category, source}), or null. */
      current: null,
      /** The category key whose upload panel is open, or null. */
      selectedCategory: null,
      uploadFile: null,
      uploading: false
    }
  },

  computed: {
    /**
     * The rail: one tone-banded section per category, each holding the two
     * sources as drop-tabs. Search filters file names; while searching, only
     * sub-sections with a hit stay listed (the rail-level empty text covers a
     * search that misses everywhere).
     */
    sections () {
      const q = this.query.trim().toLowerCase()
      const sections = this.categories.map((cat, i) => {
        const lists = this.docs[cat.key] || { base: [], firm: [] }
        return {
          name: this.$t(cat.labelKey),
          key: cat.key,
          tone: i,
          subs: [
            this.buildSub(cat, 'base', this.$t('firmDocuments.platformDocs'), lists.base, q),
            this.buildSub(cat, 'firm', this.$t('firmDocuments.firmDocs'), lists.firm, q)
          ].filter(sub => !q || sub.hasHits)
        }
      })
      return sections.filter(section => section.subs.length)
    },

    /** i18n label of the selected category (panel heading). */
    selectedCategoryLabel () {
      const cat = this.categories.find(c => c.key === this.selectedCategory)
      return cat ? this.$t(cat.labelKey) : ''
    },

    /** i18n label of the current document's category (breadcrumb). */
    currentCategoryLabel () {
      if (!this.current) { return '' }
      const cat = this.categories.find(c => c.key === this.current.category)
      return cat ? this.$t(cat.labelKey) : ''
    },

    /** i18n label of the current document's source list (breadcrumb). */
    currentSubLabel () {
      if (!this.current) { return '' }
      return this.current.source === 'firm'
        ? this.$t('firmDocuments.firmDocs')
        : this.$t('firmDocuments.platformDocs')
    }
  },

  mounted () {
    this.loadAll()
  },

  methods: {
    /**
     * One rail drop-tab: a category's documents from one source.
     * @param {{key: string}} cat - category descriptor
     * @param {'base'|'firm'} source - platform-provided or firm-uploaded
     * @param {string} name - the drop-tab's display name
     * @param {Array<Object>} rows - the documents in this list
     * @param {string} q - lower-cased search text ('' when not searching)
     * @returns {Object} FirmRail sub entry
     */
    buildSub (cat, source, name, rows, q) {
      const visible = rows.filter(r => !q || String(r.name || '').toLowerCase().includes(q))
      return {
        key: `${cat.key}::${source}`,
        name,
        source,
        categoryKey: cat.key,
        rows: visible,
        total: rows.length,
        hasHits: !!q && visible.length > 0,
        holdsCurrent: !!(this.current &&
          this.current.category === cat.key &&
          this.current.source === source)
      }
    },

    /** GET every category's lists in parallel — three small lists. */
    async loadAll () {
      this.loading = true
      this.error = ''
      try {
        const results = await Promise.all(this.categories.map(cat =>
          this.api('GET', `/api/firm-manager/documents?category=${cat.key}`)
        ))
        const docs = {}
        this.categories.forEach((cat, i) => {
          docs[cat.key] = { base: results[i].base || [], firm: results[i].firm || [] }
        })
        this.docs = docs
      } catch (err) {
        this.error = this.$t('firmDocuments.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /** Reload one category after an upload or remove. @param {string} key */
    async reloadCategory (key) {
      try {
        const data = await this.api('GET', `/api/firm-manager/documents?category=${key}`)
        this.$set(this.docs, key, { base: data.base || [], firm: data.firm || [] })
      } catch (err) {
        // The write already succeeded and said so; a failed refresh must not
        // report the write as failed. The lists catch up on the next load.
      }
    },

    /** Open a category's upload panel. @param {{key: string}} section rail section */
    selectCategory (section) {
      this.selectedCategory = section.key
      this.current = null
    },

    /** Open a document in the panel. @param {Object} doc @param {Object} sub */
    select (doc, sub) {
      this.current = Object.assign({}, doc, {
        category: sub.categoryKey,
        source: sub.source
      })
      this.selectedCategory = null
    },

    async submitUpload () {
      if (!this.uploadFile || !this.selectedCategory) { return }
      this.uploading = true
      try {
        const form = new FormData()
        form.append('file', this.uploadFile)
        form.append('category', this.selectedCategory)
        await this.api('POST', '/api/firm-manager/documents', form, true)
        this.$buefy.toast.open({ message: this.$t('firmDocuments.uploaded'), type: 'is-success' })
        this.uploadFile = null
        this.reloadCategory(this.selectedCategory)
        // Storage totals live in the Hub's header — payload: none.
        this.$emit('storage-changed')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.uploading = false
      }
    },

    /**
     * Fetch with the Bearer token (an <a>-tab navigation can't send it), then
     * save the returned blob client-side. `source` + `category` let the
     * backend authorise the file (firm-owned vs platform) before streaming.
     * @param {Object} doc - the current document (carries category + source)
     */
    async downloadDoc (doc) {
      try {
        const params = new URLSearchParams({
          fileId: doc.id,
          fileName: doc.name,
          source: doc.source || 'firm',
          category: doc.category
        })
        const res = await fetch(`/api/firm-manager/documents/download?${params.toString()}`, {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(err.message || res.statusText)
        }
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.setAttribute('download', doc.name)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      }
    },

    /** Confirm before a remove — file names are user data, so sanitise. */
    confirmRemove (doc) {
      this.$buefy.dialog.confirm({
        message: DOMPurify.sanitize(
          this.$t('firmDocuments.removeConfirm', { name: doc.name }),
          { USE_PROFILES: { html: true } }
        ),
        type: 'is-danger',
        confirmText: this.$t('firmDocuments.remove'),
        onConfirm: () => this.deleteDoc(doc)
      })
    },

    async deleteDoc (doc) {
      try {
        await this.api('DELETE', `/api/firm-manager/documents/${doc.id}`)
        this.$buefy.toast.open({ message: this.$t('firmDocuments.removed'), type: 'is-success' })
        if (this.current && this.current.id === doc.id) { this.current = null }
        this.reloadCategory(doc.category)
        // Storage totals live in the Hub's header — payload: none.
        this.$emit('storage-changed')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmQuizzes' helper so this tab can
     * be mounted and tested on its own; the backend re-checks authorisation
     * on every call regardless of what the browser sends.
     *
     * @param {string} method HTTP verb
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object|FormData} [body] JSON body, or FormData when multipart
     * @param {boolean} [isMultipart] send body as FormData (no content type —
     *   the browser sets the boundary)
     * @returns {Promise<Object>} parsed JSON
     */
    async api (method, path, body, isMultipart) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body && isMultipart) {
        opts.body = body
      } else if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(path, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
/* The rail's structure is styled inside the shared FirmRail component; these
   rules cover only the rows this screen renders through its slots. */
.rail-page {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0.3rem 0.25rem;
  font: inherit;
  border-radius: 4px;
}
.rail-page:hover { background: #f5f5f5; }
.rail-page.is-current { background: #eef6fc; font-weight: 600; }
.rail-pagename { flex: 1; }
.rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }
</style>

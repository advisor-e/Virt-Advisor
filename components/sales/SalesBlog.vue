<template lang="pug">
.sb
  header.sb-head
    .sb-eyebrow {{ $t('salesBlog.eyebrow') }}
    h1.sb-title {{ $t('salesBlog.title') }}
    p.sb-lede {{ $t('salesBlog.lede') }}

  //- The three figures that say what the advisor has accumulated.
  .sb-stats
    .sb-stat(v-for="s in stats" :key="s.key")
      .sb-stat-v {{ s.value }}
      .sb-stat-k {{ s.label }}

  b-notification.sb-error(
    v-if="errorText"
    type="is-danger is-light"
    :closable="true"
    @close="errorText = ''"
  ) {{ errorText }}

  b-notification.sb-ok(
    v-if="statusText"
    type="is-success is-light"
    :closable="true"
    @close="statusText = ''"
  ) {{ statusText }}

  //- ── THE BRIEF ────────────────────────────────────────────────────────────
  section.sb-panel
    h2.sb-panel-h {{ $t('salesBlog.brief.heading') }}

    .sb-grid
      b-field.sb-f-wide(:label="$t('salesBlog.brief.topic')")
        b-input(
          v-model="form.topic"
          :placeholder="$t('salesBlog.brief.topicPlaceholder')"
          expanded
        )
      b-field.sb-f-wide(:label="$t('salesBlog.brief.audience')")
        b-input(v-model="form.audience" expanded)
      b-field.sb-f-wide(:label="$t('salesBlog.brief.objective')")
        b-input(v-model="form.objective" expanded)

      b-field(:label="$t('salesBlog.brief.tone')")
        b-select(v-model="form.tone" expanded)
          option(v-for="t in TONES" :key="t" :value="t") {{ t }}
      b-field(:label="$t('salesBlog.brief.length')")
        b-select(v-model="form.length" expanded)
          option(v-for="l in LENGTHS" :key="l" :value="l") {{ l }}
      b-field(:label="$t('salesBlog.brief.wordCount')")
        b-input(
          v-model="form.wordCount"
          :placeholder="$t('salesBlog.brief.wordCountPlaceholder')"
          expanded
        )
      b-field(:label="$t('salesBlog.brief.cta')")
        b-input(v-model="form.cta" expanded)
      b-field(:label="$t('salesBlog.brief.authorType')")
        b-select(v-model="form.authorType" expanded)
          option(v-for="a in AUTHOR_TYPES" :key="a" :value="a") {{ a }}
      b-field(:label="$t('salesBlog.brief.author')")
        b-select(v-model="form.author" expanded)
          option(value="") {{ $t('salesBlog.brief.selectAuthor') }}
          option(v-for="a in authorOptions" :key="a" :value="a") {{ a }}

    //- ── THE POINTS TO MAKE ─────────────────────────────────────────────────
    h3.sb-sub {{ $t('salesBlog.principles.heading') }}
    p.sb-hint {{ $t('salesBlog.principles.hint') }}
    .sb-principles
      .sb-principle(v-for="(p, i) in principles" :key="i")
        .sb-principle-n {{ $t('salesBlog.principles.number', { n: i + 1 }) }}
        b-input.sb-principle-t(
          v-model="p.title"
          :placeholder="$t('salesBlog.principles.titlePlaceholder')"
          expanded
        )
        b-field(
          v-for="(d, di) in p.details"
          :key="di"
          :label="$t('salesBlog.principles.detail', { n: di + 1 })"
        )
          b-input(v-model="p.details[di]" type="textarea" rows="2" expanded)

    //- ── SOURCE MATERIAL ────────────────────────────────────────────────────
    h3.sb-sub {{ $t('salesBlog.references.heading') }}
    p.sb-hint {{ $t('salesBlog.references.hint') }}

    .sb-refs
      .sb-ref(
        v-for="r in references"
        :key="r.id"
        :class="{ 'is-on': selectedReferenceIds.includes(r.id) }"
      )
        b-checkbox(
          :value="selectedReferenceIds.includes(r.id)"
          @input="toggleReference(r.id)"
        )
        span.sb-ref-t {{ r.title }}
        b-tag.sb-ref-tag(size="is-small") {{ r.type === 'url' ? 'URL' : $t('salesBlog.references.doc') }}
        b-button.sb-ref-x(
          size="is-small"
          type="is-danger is-light"
          :disabled="busy"
          @click="deleteReference(r.id)"
        ) {{ $t('salesBlog.references.delete') }}
      p.sb-empty(v-if="!references.length") {{ $t('salesBlog.references.none') }}

    b-button.sb-ref-add(size="is-small" @click="showRefForm = !showRefForm")
      | {{ showRefForm ? $t('salesBlog.references.cancel') : $t('salesBlog.references.add') }}

    .sb-ref-form(v-if="showRefForm")
      .sb-grid
        b-field.sb-f-wide(:label="$t('salesBlog.references.title')")
          b-input(
            v-model="newRef.title"
            :placeholder="$t('salesBlog.references.titlePlaceholder')"
            expanded
          )
        b-field(:label="$t('salesBlog.references.type')")
          b-select(v-model="newRef.type" expanded)
            option(value="document") {{ $t('salesBlog.references.document') }}
            option(value="url") {{ $t('salesBlog.references.urlLink') }}
        b-field(:label="$t('salesBlog.references.topic')")
          b-input(
            v-model="newRef.topic"
            :placeholder="$t('salesBlog.references.topicPlaceholder')"
            expanded
          )
        b-field.sb-f-full(
          v-if="newRef.type === 'url'"
          :label="$t('salesBlog.references.url')"
        )
          b-input(v-model="newRef.url" placeholder="https://…" expanded)
        b-field.sb-f-full(
          v-else
          :label="$t('salesBlog.references.content')"
        )
          b-input(
            v-model="newRef.content"
            type="textarea"
            rows="6"
            :placeholder="$t('salesBlog.references.contentPlaceholder')"
            expanded
          )
      b-button(
        type="is-primary"
        :disabled="busy || !newRef.title.trim()"
        @click="saveReference"
      ) {{ $t('salesBlog.references.save') }}

    //- ── WHAT THE ADVISOR CAN DO ────────────────────────────────────────────
    .sb-actions
      b-button(:disabled="busy" @click="saveBrief") {{ $t('salesBlog.actions.saveBrief') }}
      b-button(
        type="is-primary"
        :loading="generating === 'draft'"
        :disabled="busy || !form.topic.trim()"
        @click="generateDraft"
      ) {{ $t('salesBlog.actions.generateDraft') }}
      b-button(
        type="is-info"
        :loading="generating === 'final'"
        :disabled="busy || !draftText.trim()"
        @click="generateFinal"
      ) {{ $t('salesBlog.actions.generateFinal') }}
      b-button(
        :disabled="busy || !draftText.trim()"
        @click="savePost('draft')"
      ) {{ $t('salesBlog.actions.saveDraft') }}
      b-button(
        :disabled="busy || !finalText.trim()"
        @click="savePost('final')"
      ) {{ $t('salesBlog.actions.saveFinal') }}

    //- 🔴 The advisor is ALWAYS told which they are reading. A template result
    //-    looks like a thin article; unlabelled, it would be mistaken for one.
    .sb-source(v-if="aiSource" :class="aiSource === 'template' ? 'is-template' : 'is-ai'")
      | {{ aiSource === 'template' ? $t('salesBlog.source.template') : $t('salesBlog.source.ai') }}

  //- ── WHAT IS SAVED ────────────────────────────────────────────────────────
  .sb-saved
    section.sb-panel.sb-col
      h2.sb-panel-h {{ $t('salesBlog.saved.briefs') }}
      .sb-list
        .sb-item(v-for="b in inputs" :key="b.id")
          .sb-item-main
            p.sb-item-t {{ b.topic }}
            p.sb-item-d {{ whenText(b.updatedAt) }}
          .sb-item-acts
            b-button(size="is-small" :disabled="busy" @click="restoreBrief(b)") {{ $t('salesBlog.saved.restore') }}
            b-button(
              size="is-small"
              type="is-danger is-light"
              :disabled="busy"
              @click="deleteInput(b)"
            ) {{ $t('salesBlog.saved.delete') }}
        p.sb-empty(v-if="!inputs.length") {{ $t('salesBlog.saved.noBriefs') }}

    section.sb-panel.sb-col
      h2.sb-panel-h {{ $t('salesBlog.saved.drafts') }}
      .sb-filters
        b-input(
          v-model="draftSearch"
          type="search"
          size="is-small"
          :placeholder="$t('salesBlog.saved.searchDrafts')"
          :aria-label="$t('salesBlog.saved.searchDrafts')"
          expanded
        )
        b-checkbox(v-model="draftPinnedOnly" size="is-small") {{ $t('salesBlog.saved.pinnedOnly') }}
      .sb-list
        .sb-item(v-for="p in filteredDrafts" :key="p.id")
          .sb-item-main
            p.sb-item-t
              | {{ p.title }}
              b-tag.sb-pin(v-if="p.isPinned" size="is-small" type="is-warning is-light") {{ $t('salesBlog.saved.pinned') }}
            p.sb-item-d {{ whenText(p.updatedAt) }}
          .sb-item-acts
            b-button(size="is-small" :disabled="busy" @click="restorePost(p, 'draft')") {{ $t('salesBlog.saved.restore') }}
            b-button(size="is-small" :disabled="busy" @click="togglePin(p)")
              | {{ p.isPinned ? $t('salesBlog.saved.unpin') : $t('salesBlog.saved.pin') }}
            b-button(
              size="is-small"
              type="is-danger is-light"
              :disabled="busy"
              @click="deletePost(p)"
            ) {{ $t('salesBlog.saved.delete') }}
        p.sb-empty(v-if="!filteredDrafts.length")
          | {{ draftPosts.length ? $t('salesBlog.saved.noMatch') : $t('salesBlog.saved.noDrafts') }}

    section.sb-panel.sb-col
      h2.sb-panel-h {{ $t('salesBlog.saved.finals') }}
      .sb-filters
        b-input(
          v-model="finalSearch"
          type="search"
          size="is-small"
          :placeholder="$t('salesBlog.saved.searchFinals')"
          :aria-label="$t('salesBlog.saved.searchFinals')"
          expanded
        )
        b-checkbox(v-model="finalPinnedOnly" size="is-small") {{ $t('salesBlog.saved.pinnedOnly') }}
      .sb-list
        .sb-item(v-for="p in filteredFinals" :key="p.id")
          .sb-item-main
            p.sb-item-t
              | {{ p.title }}
              b-tag.sb-pin(v-if="p.isPinned" size="is-small" type="is-warning is-light") {{ $t('salesBlog.saved.pinned') }}
            p.sb-item-d {{ whenText(p.updatedAt) }}
          .sb-item-acts
            b-button(size="is-small" :disabled="busy" @click="restorePost(p, 'final')") {{ $t('salesBlog.saved.restore') }}
            b-button(size="is-small" :disabled="busy" @click="copyToDraft(p)") {{ $t('salesBlog.saved.duplicateToDraft') }}
            b-button(size="is-small" :disabled="busy" @click="togglePin(p)")
              | {{ p.isPinned ? $t('salesBlog.saved.unpin') : $t('salesBlog.saved.pin') }}
            b-button(
              size="is-small"
              type="is-danger is-light"
              :disabled="busy"
              @click="deletePost(p)"
            ) {{ $t('salesBlog.saved.delete') }}
        p.sb-empty(v-if="!filteredFinals.length")
          | {{ finalPosts.length ? $t('salesBlog.saved.noMatch') : $t('salesBlog.saved.noFinals') }}

  //- ── THE TWO EDITORS ──────────────────────────────────────────────────────
  section.sb-panel
    .sb-editor-head
      h2.sb-panel-h {{ $t('salesBlog.editor.draftHeading') }}
      b-tag(v-if="draftWordCount" size="is-small") {{ $tc('salesBlog.editor.words', draftWordCount, { count: draftWordCount }) }}
      .sb-spacer
      b-button(size="is-small" @click="showPreview = !showPreview")
        | {{ showPreview ? $t('salesBlog.editor.edit') : $t('salesBlog.editor.preview') }}

    b-input(
      v-if="!showPreview"
      v-model="draftText"
      type="textarea"
      rows="14"
      expanded
    )
    //- eslint-disable-next-line vue/no-v-html
    .sb-md(v-else-if="draftText.trim()" v-html="draftHtml")
    p.sb-empty(v-else) {{ $t('salesBlog.editor.draftEmpty') }}

    .sb-instructions(v-if="draftText.trim()")
      h3.sb-sub {{ $t('salesBlog.editor.aiInstructions') }}
      p.sb-hint {{ $t('salesBlog.editor.aiInstructionsHint') }}
      b-input(
        v-model="form.aiInstructions"
        type="textarea"
        rows="3"
        :placeholder="$t('salesBlog.editor.aiInstructionsPlaceholder')"
        expanded
      )

    .sb-editor-head.sb-editor-head-2
      h2.sb-panel-h {{ $t('salesBlog.editor.finalHeading') }}
      b-tag(
        v-if="finalWordCount"
        size="is-small"
        :type="isShort ? 'is-warning is-light' : ''"
      )
        | {{ $tc('salesBlog.editor.words', finalWordCount, { count: finalWordCount }) }}
      b-tag.sb-short(v-if="isShort" size="is-small" type="is-warning is-light")
        | {{ $t('salesBlog.editor.short') }} — {{ $t('salesBlog.editor.target', { target: form.wordCount }) }}
      .sb-spacer
      b-field.sb-polish(:label="$t('salesBlog.editor.polishLevel')" horizontal)
        b-select(v-model="form.polishLevel" size="is-small")
          option(v-for="l in POLISH_LEVELS" :key="l" :value="l") {{ l }}

    b-input(
      v-if="!showPreview"
      v-model="finalText"
      type="textarea"
      rows="16"
      expanded
    )
    //- eslint-disable-next-line vue/no-v-html
    .sb-md(v-else-if="finalText.trim()" v-html="finalHtml")
    p.sb-empty(v-else) {{ $t('salesBlog.editor.finalEmpty') }}
</template>

<script>
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'

/**
 * SalesBlog — the advisor's blog-writing screen (item 17 stage 5).
 *
 * A repaint of `pages/index.vue` from `sales-tracker-nuxt-clean`, which is the
 * blog tool in that app — 843 lines, and the plan had it catalogued as the
 * landing page (§3). Its STRUCTURE is kept, because that is the specification
 * (stage 3's lesson): brief → points → source material → generate → two
 * editors, with the saved briefs, outlines and articles in three columns.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, AND WHY
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. 🔴 `marked` → `markdown-it` + DOMPurify. The source renders model output
 *     with `marked()` straight into `v-html` and sanitises NOTHING, so a model
 *     that emitted a `<script>` or an off-site `<img>` would have it executed or
 *     fetched. `marked` is also not a dependency here, and adding one is not a
 *     decision this screen gets to make. The config below is the house one
 *     (CourseBuilder, CB-05): images and raw HTML disabled, then DOMPurify.
 *  2. 93 colours → the brand tokens, and Open Sans 300 — `design/BRAND-TOKENS.md`
 *     (§4a). The source's magenta gradients are gone; this reads as a sibling of
 *     `SalesPipeline` and `SalesCoi`, not as a second product.
 *  3. Every string goes through `$t()`. The source hardcodes English in a dozen
 *     places ("Reference saved!", "Startup warning:").
 *  4. The word-count-per-length preference is dropped. It rode `localStorage`
 *     under a bare key, was never read by anything else, and the advisor can
 *     simply type the number they want.
 *
 * ⚠ THE SOURCE'S `busy` FLAG DID NOT COVER ITS DELETES, so a double-click could
 * fire two deletes at once. Every button here is disabled while `busy`.
 */
const TOKEN_KEY = 'advisor_e_token'

/** The house markdown renderer. See note 1 above — this is not a free choice. */
const _md = new MarkdownIt({ html: false, linkify: true, typographer: true })
_md.disable(['image', 'html_inline', 'html_block'])

export default {
  name: 'SalesBlog',

  data () {
    return {
      TONES: ['Professional', 'Friendly', 'Confident', 'Educational'],
      LENGTHS: ['Short', 'Medium', 'Long'],
      POLISH_LEVELS: ['Standard', 'Strong', 'Premium'],
      AUTHOR_TYPES: ['Partner', 'Lead Staff'],

      form: {
        topic: '',
        audience: 'Business owners',
        objective: 'Help readers make practical financial decisions',
        tone: 'Professional',
        length: 'Medium',
        wordCount: '400-600',
        cta: 'book a short strategy call',
        authorType: 'Lead Staff',
        author: '',
        polishLevel: 'Strong',
        aiInstructions: ''
      },

      // The source's three starting sections, kept: an empty form gives the
      // model nothing to write to, and these say what a good brief looks like.
      principles: [
        { title: 'Market context', details: ['What changed and why it matters', 'Which indicators to watch'] },
        { title: 'Action plan', details: ['What to do this month', 'How to sequence decisions'] },
        { title: 'Review cadence', details: ['What to review regularly', 'How to measure progress'] }
      ],

      draftText: '',
      finalText: '',
      aiSource: '',
      showPreview: true,

      inputs: [],
      draftPosts: [],
      finalPosts: [],
      references: [],
      selectedReferenceIds: [],

      newRef: { title: '', type: 'document', content: '', url: '', topic: '' },
      showRefForm: false,

      draftSearch: '',
      finalSearch: '',
      draftPinnedOnly: false,
      finalPinnedOnly: false,

      lists: {},
      loading: true,
      busy: false,
      generating: '',
      errorText: '',
      statusText: ''
    }
  },

  computed: {
    /** The three figures across the top. */
    stats () {
      return [
        { key: 'briefs', value: this.inputs.length, label: this.$t('salesBlog.stats.briefs') },
        { key: 'drafts', value: this.draftPosts.length, label: this.$t('salesBlog.stats.drafts') },
        { key: 'finals', value: this.finalPosts.length, label: this.$t('salesBlog.stats.finals') }
      ]
    },

    /** The firm's own people, from the Sales Tracker lists stage 4 built. */
    authorOptions () {
      const key = this.form.authorType === 'Partner' ? 'partner' : 'leadStaff'
      return Array.isArray(this.lists[key]) ? this.lists[key] : []
    },

    draftHtml () { return this.renderMarkdown(this.draftText) },
    finalHtml () { return this.renderMarkdown(this.finalText) },
    draftWordCount () { return this.countWords(this.draftText) },
    finalWordCount () { return this.countWords(this.finalText) },

    /** True when the article is shorter than the number the advisor asked for. */
    isShort () {
      if (!this.form.wordCount || !this.finalWordCount) { return false }
      const match = String(this.form.wordCount).match(/(\d+)/)
      return match ? this.finalWordCount < parseInt(match[1], 10) : false
    },

    filteredDrafts () { return this.filterPosts(this.draftPosts, this.draftSearch, this.draftPinnedOnly) },
    filteredFinals () { return this.filterPosts(this.finalPosts, this.finalSearch, this.finalPinnedOnly) }
  },

  watch: {
    /** A partner's name is not a lead staff name; clear rather than carry it over. */
    'form.authorType' () { this.form.author = '' }
  },

  async mounted () {
    await this.load()
  },

  methods: {
    authHeaders () {
      const token = (process.client && window.localStorage.getItem(TOKEN_KEY)) || 'dev-local-bypass'
      return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    },

    /**
     * One place for every call, so both an HTTP error and a network failure
     * produce a message rather than a silently empty screen.
     * @param {string} url
     * @param {object} [options]
     * @param {string} [errorKey] - which message to show; defaults to the load one
     * @returns {Promise<object|null>} the payload, or null when it failed
     */
    async call (url, options, errorKey) {
      try {
        const res = await fetch(url, Object.assign({ headers: this.authHeaders() }, options || {}))
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          this.errorText = (body && body.error && body.error.message) ||
            this.$t(errorKey || 'salesBlog.errors.load')
          return null
        }
        return body
      } catch (e) {
        this.errorText = this.$t('salesBlog.errors.network')
        return null
      }
    },

    /**
     * Render markdown safely. Model output is untrusted on the way OUT as well
     * as in — see the file note. `v-html` in this component receives only what
     * this method returns.
     * @param {string} text
     * @returns {string} sanitised HTML
     */
    renderMarkdown (text) {
      const raw = _md.render(String(text || ''))
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    },

    /** @param {string} text @returns {number} */
    countWords (text) {
      return String(text || '').trim().split(/\s+/).filter(Boolean).length
    },

    /** A stored timestamp as the reader's own local date and time. */
    whenText (value) {
      if (!value) { return '' }
      const d = new Date(value)
      return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    },

    /**
     * The saved-list filters. The backend filters too; this keeps typing
     * instant rather than a round trip per keystroke.
     */
    filterPosts (list, search, pinnedOnly) {
      const q = String(search || '').trim().toLowerCase()
      return list.filter((p) => {
        if (pinnedOnly && !p.isPinned) { return false }
        if (!q) { return true }
        return [p.title, p.topic, p.selectedPerson]
          .map(v => String(v || '').toLowerCase())
          .some(v => v.includes(q))
      })
    },

    /**
     * The de-duplication key the backend replaces a brief by. Same parts as the
     * source app's, so re-saving the same brief updates it rather than piling
     * up near-identical rows.
     * @returns {string}
     */
    signature () {
      return [
        this.form.topic.trim().slice(0, 50),
        this.form.tone,
        this.form.length,
        this.form.author || 'none'
      ].join('|').slice(0, 191)
    },

    /** @param {string} kind @returns {string} */
    postTitle (kind) {
      const prefix = kind === 'draft'
        ? this.$t('salesBlog.saved.drafts')
        : this.$t('salesBlog.saved.finals')
      return `${prefix}: ${this.form.topic || '—'}`
    },

    /** The text of the ticked source material, for the model to write from. */
    selectedReferencesText () {
      return this.references
        .filter(r => this.selectedReferenceIds.includes(r.id))
        .map(r => (r.type === 'url'
          ? `Reference: ${r.title}\nURL: ${r.url || ''}`
          : `Reference: ${r.title}\n${r.content || ''}`))
        .join('\n\n')
    },

    /** Show a confirmation that clears itself. */
    flash (key) {
      this.statusText = this.$t(key)
      if (this._flashTimer) { clearTimeout(this._flashTimer) }
      this._flashTimer = setTimeout(() => { this.statusText = '' }, 4000)
    },

    async load () {
      this.loading = true
      this.errorText = ''
      const [inputs, drafts, finals, refs, lists] = await Promise.all([
        this.call('/api/sales/blog/inputs'),
        this.call('/api/sales/blog/posts?kind=draft'),
        this.call('/api/sales/blog/posts?kind=final'),
        this.call('/api/sales/blog/references'),
        this.call('/api/sales/lists')
      ])
      if (inputs) { this.inputs = inputs.items || [] }
      if (drafts) { this.draftPosts = drafts.items || [] }
      if (finals) { this.finalPosts = finals.items || [] }
      if (refs) { this.references = refs.items || [] }
      if (lists) { this.lists = lists.lists || lists.items || {} }
      this.loading = false
    },

    toggleReference (id) {
      const i = this.selectedReferenceIds.indexOf(id)
      if (i >= 0) {
        this.selectedReferenceIds.splice(i, 1)
      } else {
        this.selectedReferenceIds.push(id)
      }
    },

    async saveReference () {
      if (!this.newRef.title.trim()) { return }
      this.busy = true
      const body = await this.call('/api/sales/blog/references', {
        method: 'POST',
        body: JSON.stringify({
          title: this.newRef.title,
          type: this.newRef.type,
          content: this.newRef.type === 'document' ? this.newRef.content : '',
          url: this.newRef.type === 'url' ? this.newRef.url : '',
          topic: this.newRef.topic
        })
      }, 'salesBlog.errors.saveReference')
      if (body) {
        this.newRef = { title: '', type: this.newRef.type, content: '', url: '', topic: '' }
        this.showRefForm = false
        const refs = await this.call('/api/sales/blog/references')
        if (refs) { this.references = refs.items || [] }
        this.flash('salesBlog.status.referenceSaved')
      }
      this.busy = false
    },

    async deleteReference (id) {
      this.busy = true
      const body = await this.call(
        '/api/sales/blog/references/' + encodeURIComponent(id),
        { method: 'DELETE' }, 'salesBlog.errors.delete'
      )
      if (body) {
        this.selectedReferenceIds = this.selectedReferenceIds.filter(r => r !== id)
        this.references = this.references.filter(r => r.id !== id)
      }
      this.busy = false
    },

    async saveBrief (quiet) {
      this.busy = true
      const body = await this.call('/api/sales/blog/inputs', {
        method: 'POST',
        body: JSON.stringify({
          signature: this.signature(),
          topic: this.form.topic,
          audience: this.form.audience,
          objective: this.form.objective,
          tone: this.form.tone,
          length: this.form.length,
          cta: this.form.cta,
          wordCount: this.form.wordCount,
          author: this.form.author,
          principles: this.principles
        })
      }, 'salesBlog.errors.saveBrief')
      if (body) {
        const inputs = await this.call('/api/sales/blog/inputs')
        if (inputs) { this.inputs = inputs.items || [] }
        if (quiet !== true) { this.flash('salesBlog.status.briefSaved') }
      }
      this.busy = false
    },

    /**
     * Ask for the outline.
     *
     * ⚠ A `source: 'template'` reply is a SUCCESS, not an error — the backend
     * answers 200 with an outline built from this brief when the model is
     * unavailable. The banner under the buttons is what tells the advisor which
     * of the two they are reading.
     */
    async generateDraft () {
      if (!this.form.topic.trim()) {
        this.errorText = this.$t('salesBlog.errors.needTopic')
        return
      }
      this.busy = true
      this.generating = 'draft'
      this.errorText = ''
      const body = await this.call('/api/sales/blog/generate/draft', {
        method: 'POST',
        body: JSON.stringify({
          topic: this.form.topic,
          audience: this.form.audience,
          objective: this.form.objective,
          tone: this.form.tone,
          length: this.form.length,
          wordCount: this.form.wordCount,
          cta: this.form.cta,
          author: this.form.author,
          principles: this.principles,
          references: this.selectedReferencesText()
        })
      }, 'salesBlog.errors.generate')
      this.generating = ''
      this.busy = false
      if (body) {
        this.draftText = body.text || ''
        this.aiSource = body.source || ''
        // The source app saves the brief after every generation, so the advisor
        // never loses the inputs that produced the text in front of them.
        await this.saveBrief(true)
      }
    },

    /** Ask for the article. Same template-is-success rule as the draft. */
    async generateFinal () {
      if (!this.draftText.trim()) { return }
      this.busy = true
      this.generating = 'final'
      this.errorText = ''
      const body = await this.call('/api/sales/blog/generate/final', {
        method: 'POST',
        body: JSON.stringify({
          outlineText: this.draftText,
          topic: this.form.topic,
          audience: this.form.audience,
          objective: this.form.objective,
          tone: this.form.tone,
          cta: this.form.cta,
          polishLevel: this.form.polishLevel,
          wordCount: this.form.wordCount,
          aiInstructions: this.form.aiInstructions
        })
      }, 'salesBlog.errors.generate')
      this.generating = ''
      this.busy = false
      if (body) {
        this.finalText = body.text || ''
        this.aiSource = body.source || ''
      }
    },

    /** @param {'draft'|'final'} kind */
    async savePost (kind) {
      const text = kind === 'draft' ? this.draftText : this.finalText
      if (!text.trim()) { return }
      this.busy = true
      const body = await this.call('/api/sales/blog/posts', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          title: this.postTitle(kind),
          topic: this.form.topic || '—',
          audience: this.form.audience,
          objective: this.form.objective,
          tone: this.form.tone,
          length: this.form.length,
          cta: this.form.cta,
          selectedPerson: this.form.author,
          outlineText: this.draftText || text,
          finalText: kind === 'final' ? this.finalText : ''
        })
      }, 'salesBlog.errors.savePost')
      if (body) {
        await this.reloadPosts(kind)
        this.flash(kind === 'draft' ? 'salesBlog.status.draftSaved' : 'salesBlog.status.finalSaved')
      }
      this.busy = false
    },

    /** @param {'draft'|'final'} kind */
    async reloadPosts (kind) {
      const body = await this.call('/api/sales/blog/posts?kind=' + kind)
      if (!body) { return }
      if (kind === 'draft') {
        this.draftPosts = body.items || []
      } else {
        this.finalPosts = body.items || []
      }
    },

    restoreBrief (b) {
      this.form.topic = b.topic || ''
      this.form.audience = b.audience || ''
      this.form.objective = b.objective || ''
      this.form.tone = b.tone || this.form.tone
      this.form.length = b.length || this.form.length
      this.form.cta = b.cta || ''
      if (Array.isArray(b.principles) && b.principles.length) {
        // Cloned, or editing the form would silently rewrite the saved row in
        // the list beside it.
        this.principles = b.principles.map(p => ({
          title: String(p && p.title ? p.title : ''),
          details: Array.isArray(p && p.details) ? p.details.slice() : []
        }))
      }
    },

    /** @param {object} p @param {'draft'|'final'} kind */
    restorePost (p, kind) {
      if (kind === 'draft') {
        this.draftText = p.outlineText || ''
      } else {
        this.finalText = p.finalText || p.outlineText || ''
        this.draftText = p.outlineText || this.draftText
      }
      this.form.topic = p.topic || this.form.topic
    },

    /** An article becomes the outline to rewrite from. */
    copyToDraft (p) {
      this.draftText = p.finalText || p.outlineText || ''
      this.finalText = ''
      this.form.topic = p.topic || this.form.topic
    },

    async togglePin (p) {
      this.busy = true
      const body = await this.call(
        '/api/sales/blog/posts/' + encodeURIComponent(p.id),
        { method: 'PUT', body: JSON.stringify({ isPinned: !p.isPinned }) },
        'salesBlog.errors.savePost'
      )
      if (body) { await this.reloadPosts(p.kind) }
      this.busy = false
    },

    async deletePost (p) {
      this.busy = true
      const body = await this.call(
        '/api/sales/blog/posts/' + encodeURIComponent(p.id),
        { method: 'DELETE' }, 'salesBlog.errors.delete'
      )
      if (body) { await this.reloadPosts(p.kind) }
      this.busy = false
    },

    async deleteInput (b) {
      this.busy = true
      const body = await this.call(
        '/api/sales/blog/inputs/' + encodeURIComponent(b.id),
        { method: 'DELETE' }, 'salesBlog.errors.delete'
      )
      if (body) { this.inputs = this.inputs.filter(i => i.id !== b.id) }
      this.busy = false
    }
  }
}
</script>

<style scoped>
/* Brand tokens only — design/BRAND-TOKENS.md. Identical to SalesPipeline's and
   SalesCoi's, so the Sales Tracker's screens read as one tool. */
.sb {
  --sb-navy: #002b64;
  --sb-blue: #0070c0;
  --sb-ink: #002b64;
  --sb-muted: #5b6f8a;
  --sb-line: #d5e1ee;
  --sb-panel: #ffffff;
  --sb-soft: #f5f9fd;
  font-family: 'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 300;
  color: var(--sb-muted);
  -webkit-font-smoothing: antialiased;
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 22px 64px;
}

.sb-head { margin-bottom: 18px; }
.sb-eyebrow {
  font-size: 11.5px; font-weight: 600; letter-spacing: .14em;
  text-transform: uppercase; color: var(--sb-blue);
}
.sb-title {
  margin: 4px 0 0; font-size: 30px; font-weight: 600; line-height: 1.15;
  letter-spacing: -.015em; color: var(--sb-ink);
}
.sb-lede { margin: 6px 0 0; font-size: 15px; max-width: 70ch; }

.sb-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px; margin-bottom: 16px;
}
.sb-stat {
  background: var(--sb-panel); border: 1px solid var(--sb-line);
  border-radius: 14px; padding: 14px 16px;
}
.sb-stat-v {
  font-size: 22px; font-weight: 600; color: var(--sb-ink);
  font-variant-numeric: tabular-nums;
}
.sb-stat-k { font-size: 12px; margin-top: 2px; }

.sb-error, .sb-ok { margin-bottom: 16px; }

.sb-panel {
  background: var(--sb-panel); border: 1px solid var(--sb-line);
  border-radius: 14px; padding: 18px 20px; margin-bottom: 16px;
}
.sb-panel-h {
  margin: 0; font-size: 17px; font-weight: 600; color: var(--sb-ink);
}
.sb-sub {
  margin: 22px 0 2px; font-size: 14px; font-weight: 600; color: var(--sb-ink);
}
.sb-hint { font-size: 12.5px; margin: 0 0 10px; }

.sb-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px 16px; margin-top: 12px;
}
.sb-f-wide { grid-column: span 2; }
.sb-f-full { grid-column: 1 / -1; }

.sb-principles {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.sb-principle {
  background: var(--sb-soft); border: 1px solid var(--sb-line);
  border-radius: 12px; padding: 12px 14px;
}
.sb-principle-n {
  font-size: 11px; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--sb-blue); margin-bottom: 6px;
}
.sb-principle-t { margin-bottom: 8px; }

.sb-refs { display: flex; flex-direction: column; gap: 6px; }
.sb-ref {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--sb-line); border-radius: 10px;
  padding: 7px 10px; background: var(--sb-panel);
}
.sb-ref.is-on { border-color: var(--sb-blue); background: var(--sb-soft); }
.sb-ref-t { font-size: 13px; color: var(--sb-ink); flex: 1; }
.sb-ref-tag { flex: none; }
.sb-ref-x { flex: none; }
.sb-ref-add { margin-top: 10px; }
.sb-ref-form {
  margin-top: 12px; background: var(--sb-soft);
  border: 1px solid var(--sb-line); border-radius: 12px; padding: 14px 16px;
}

.sb-actions {
  display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px;
}
.sb-source {
  margin-top: 12px; font-size: 12.5px; padding: 8px 12px;
  border-radius: 10px; border: 1px solid var(--sb-line);
}
.sb-source.is-ai { background: var(--sb-soft); }
.sb-source.is-template { background: #fff8e6; border-color: #f0d9a0; }

.sb-saved {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}
.sb-col { margin-bottom: 0; }
.sb-filters {
  display: flex; align-items: center; gap: 10px; margin: 12px 0 10px;
}
.sb-list {
  display: flex; flex-direction: column; gap: 8px;
  max-height: 380px; overflow-y: auto;
}
.sb-item {
  border: 1px solid var(--sb-line); border-radius: 10px; padding: 9px 11px;
}
.sb-item-t {
  font-size: 13px; font-weight: 600; color: var(--sb-ink); margin: 0;
}
.sb-item-d { font-size: 11.5px; margin: 2px 0 0; }
.sb-item-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.sb-pin { margin-left: 6px; }
.sb-empty { font-size: 13px; font-style: italic; margin: 8px 0 0; }

.sb-editor-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.sb-editor-head-2 { margin-top: 26px; }
.sb-spacer { flex: 1; }
.sb-polish { margin-bottom: 0; }
.sb-short { flex: none; }
.sb-instructions { margin-top: 16px; }

.sb-md {
  border: 1px solid var(--sb-line); border-radius: 10px;
  padding: 16px 18px; background: var(--sb-soft);
  min-height: 200px; max-height: 520px; overflow-y: auto;
  line-height: 1.6; color: var(--sb-ink); font-size: 14px;
}
.sb-md >>> h1, .sb-md >>> h2, .sb-md >>> h3 {
  color: var(--sb-ink); font-weight: 600; margin: 1em 0 .4em;
}
.sb-md >>> h1 { font-size: 21px; }
.sb-md >>> h2 { font-size: 17px; }
.sb-md >>> h3 { font-size: 15px; }
.sb-md >>> p { margin: 0 0 .8em; }
.sb-md >>> ul, .sb-md >>> ol { margin: 0 0 .8em 1.2em; list-style: revert; }
.sb-md >>> a { color: var(--sb-blue); }

@media (max-width: 720px) {
  .sb { padding: 20px 14px 48px; }
  .sb-f-wide { grid-column: span 1; }
}
</style>

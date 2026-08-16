<template lang="pug">
//- One method guide, opened. Item 4.16 F — approved artefact
//- design/METHOD-GUIDES-SCREEN.md and design/mockups/method-guides.html.
section.mg-panel
  b-loading(:is-full-page="false" :active="loading")

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  template(v-if="guide && !error")
    .mg-head
      div
        //- Mike's wording, 2026-08-17 (§6b option A). Word for word.
        p.mg-title {{ $t('firmDomainSupport.guideHeading') }}
        p.mg-sub {{ guide.label }} · {{ $t('firmDomainSupport.guideSubtitle', { chars: charCount }) }}
      button.mg-close(type="button" @click="$emit('close')") {{ $t('firmDomainSupport.guideClose') }}

    //- Where one document is shown on more than one domain page, the screen says
    //- so WHERE THE EDIT HAPPENS rather than letting a firm discover afterwards
    //- that they changed a second page (Mike's wording, §6c option A).
    .mg-shared(v-if="sharedWith") {{ $t('firmDomainSupport.guideShared', { domains: sharedWith }) }}

    p.mg-desc(v-if="guide.description") {{ guide.description }}

    .mg-body
      method-guide-section(
        v-for="(section, i) in guide.sections"
        :key="i"
        :node="section"
        :content="content"
        :depth="1"
        @change="applyChange"
      )

    .mg-actions
      b-button(
        type="is-text"
        :disabled="guide.origin !== 'firm' || saving"
        @click="confirmReset"
      ) {{ $t('firmDomainSupport.reset') }}
      span.mg-spacer
      b-button(
        type="is-primary"
        :loading="saving"
        :disabled="!dirty || saving"
        @click="save"
      ) {{ $t('firmDomainSupport.save') }}

    //- Version history, read-only — the same shape the materials table shows.
    .mg-history(v-if="guide.origin === 'firm'")
      p.mg-history-head {{ $t('firmDomainSupport.guideHistoryHeading') }}
      b-table(v-if="history.length" :data="history" :mobile-cards="false")
        b-table-column(v-slot="{ row }" field="version" :label="$t('firmDomainSupport.historyVersion')" width="80")
          | v{{ row.version }}
        b-table-column(v-slot="{ row }" field="saved_by" :label="$t('firmDomainSupport.historySavedBy')")
          | {{ row.saved_by }}
        b-table-column(v-slot="{ row }" field="created_at" :label="$t('firmDomainSupport.historyDate')")
          | {{ formatDate(row.created_at) }}
      p.has-text-grey.is-size-7(v-else) {{ $t('firmDomainSupport.historyEmpty') }}
</template>

<script>
import MethodGuideSection from '~/components/firm/MethodGuideSection.vue'

/**
 * The opened method guide on the Domain Support tab (to-do item 4.16 F).
 *
 * 🔴 WHY THIS SCREEN EXISTS AT ALL. Thirteen deep method guides — 155,000
 * characters — go to the advisors' AI whenever it coaches, and until now NO screen
 * in the application rendered one of them, at any tier. The content was authored
 * into `data/*-reference.json`, read by the AI, and invisible in both directions:
 * nobody could see what the AI was taught, and nobody could correct it.
 *
 * 🔴 AND WHY IT IS NOT ONLY A SCREEN. 116 of the 954 authored lines across the
 * thirteen reached no prompt either, because each guide had a hand-written
 * formatter that named its fields one by one. A screen alone would have shown a
 * firm text the AI does not receive and implied that it does — worse than the
 * silence it replaced. The fields drawn here come from `methodGuides.walkGuide`,
 * the SAME walk that builds the prompt, so the two cannot disagree.
 *
 * WHO SEES IT — the same tiers as the materials table it opens from (Mike,
 * 2026-08-17): mentor, global group manager, group manager, firm manager. That is
 * inherited by construction — this component is mounted inside the Domain Support
 * tab, which renders at every one of those scopes and at no other — rather than
 * asserted again here in a second list that could drift from the first.
 *
 * STRUCTURE IS FIXED; WORDS ARE EDITABLE. There is no add or remove control
 * anywhere on this panel, and the backend refuses an override that changes the
 * shape. Editing the shape is authoring a method, and that is the mentor's work in
 * the data file.
 */
export default {
  name: 'MethodGuidePanel',

  components: { MethodGuideSection },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true },
    /** Which guide to open — a logic-tree id present in methodGuides.GUIDES. */
    guideId: { type: String, required: true },
    /** The domain page this was opened from, so "also used by" can exclude it. */
    fromDomain: { type: String, default: '' }
  },

  data () {
    return {
      loading: false,
      saving: false,
      error: '',
      /** The detail payload: id, label, description, sections, origin, rows. */
      guide: null,
      /** The editable copy every path is read from and written to. */
      content: null,
      /** Cleaned baseline, JSON — drives `dirty`. */
      original: null,
      history: []
    }
  },

  computed: {
    /** True once the wording on screen differs from what was loaded. */
    dirty () {
      return this.original !== null && JSON.stringify(this.content) !== this.original
    },

    /**
     * The other domain pages this same document is shown on, named for a person.
     * Empty when the guide belongs to one page, which is ten of the thirteen.
     */
    sharedWith () {
      if (!this.guide || !Array.isArray(this.guide.rows)) { return '' }
      const others = this.guide.rows
        .filter(r => r.domain !== this.fromDomain)
        .map(r => r.domainLabel)
      return others.length ? others.join(', ') : ''
    },

    /** How much of the guide reaches the AI, stated plainly rather than implied. */
    charCount () {
      return this.content ? JSON.stringify(this.content).length.toLocaleString() : '0'
    }
  },

  watch: {
    // Opening a second guide without closing the first must re-fetch, or the panel
    // would show one guide's heading over another's text.
    guideId: 'load'
  },

  mounted () {
    this.load()
  },

  methods: {
    /** Fetch the guide as this scope sees it: platform content through every tier above. */
    async load () {
      this.loading = true
      this.error = ''
      this.guide = null
      this.content = null
      this.original = null
      this.history = []
      try {
        const data = await this.api('GET', `/api/firm-manager/method-guides/${encodeURIComponent(this.guideId)}`)
        this.guide = data
        this.content = JSON.parse(JSON.stringify(data.content || {}))
        this.original = JSON.stringify(this.content)
        if (data.origin === 'firm') { await this.loadHistory() }
      } catch (err) {
        this.error = this.$t('firmDomainSupport.guideLoadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Write one edited line back into the editable copy.
     *
     * `$set` on the final hop rather than plain assignment: Vue 2 cannot observe
     * `arr[i] = x`, so a reworded bullet would change the data without redrawing —
     * and `dirty` would then disagree with the screen.
     * @param {{path: Array<string|number>, value: string}} payload
     */
    applyChange ({ path, value }) {
      let cursor = this.content
      for (let i = 0; i < path.length - 1; i++) {
        cursor = cursor[path[i]]
        if (cursor === null || typeof cursor !== 'object') { return }
      }
      this.$set(cursor, path[path.length - 1], value)
    },

    /**
     * Save this scope's wording. The whole edited guide is posted; the backend
     * reduces it to the smallest override that reproduces it, so a firm that
     * rewords one sentence keeps inheriting every other line — including later
     * platform corrections to them.
     */
    async save () {
      if (!this.dirty || this.saving) { return }
      this.saving = true
      try {
        await this.api('POST', `/api/firm-manager/method-guides/${encodeURIComponent(this.guideId)}`, { content: this.content })
        this.$buefy.toast.open({ message: this.$t('firmDomainSupport.guideSaved'), type: 'is-success' })
        await this.load()
        // The rail badge and the row control show whether this guide is edited here.
        this.$emit('saved', this.guideId)
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /** Confirm before discarding this scope's own wording for the guide. */
    confirmReset () {
      if (!this.guide || this.guide.origin !== 'firm') { return }
      this.$buefy.dialog.confirm({
        message: this.$t('firmDomainSupport.guideResetConfirm', { name: this.guide.label }),
        type: 'is-warning',
        confirmText: this.$t('firmDomainSupport.reset'),
        onConfirm: () => this.reset()
      })
    },

    /** Drop this scope's wording and go back to what it inherits. */
    async reset () {
      if (this.saving) { return }
      this.saving = true
      try {
        await this.api('DELETE', `/api/firm-manager/method-guides/${encodeURIComponent(this.guideId)}`)
        this.$buefy.toast.open({ message: this.$t('firmDomainSupport.guideWasReset'), type: 'is-success' })
        await this.load()
        this.$emit('saved', this.guideId)
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /** Saved versions of this scope's method-guide bundle (bundle-level, not per guide). */
    async loadHistory () {
      try {
        const data = await this.api('GET', `/api/firm-manager/method-guides/${encodeURIComponent(this.guideId)}/history`)
        this.history = Array.isArray(data.history) ? data.history : []
      } catch (err) {
        this.history = []
      }
    },

    formatDate (value) {
      if (!value) { return '' }
      const d = new Date(value)
      return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    },

    /**
     * Thin authenticated fetch — mirrors the helper on the tab that mounts this, so
     * the panel can be mounted and tested on its own. The backend re-checks
     * authorisation on every call regardless of what the browser sends.
     * @param {string} method HTTP verb
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object} [body] JSON body
     * @returns {Promise<Object>} parsed JSON
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
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
/* Palette taken from the approved mockup, which took it from this tab. */
.mg-panel {
  position: relative;
  border: 1px solid #1f9d76;
  background: #e9f6f1;
  border-radius: 8px;
  padding: 1rem;
  margin: 0.75rem 0 1.4rem;
}
.mg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.mg-title { font-size: 1.05rem; font-weight: 700; color: #1f2733; margin: 0 0 0.15rem; }
.mg-sub { font-size: 0.8rem; color: #8a94a3; margin: 0; }
.mg-close {
  background: none;
  border: 1px solid #dfe4ea;
  border-radius: 5px;
  color: #404b5a;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
}
.mg-close:hover { background: #fff; }
.mg-shared {
  font-size: 0.82rem;
  color: #8a6d1f;
  background: #fdf6e6;
  border: 1px solid #e0b24e;
  border-radius: 5px;
  padding: 0.4rem 0.65rem;
  margin: 0.6rem 0 0;
}
.mg-desc { font-size: 0.85rem; color: #404b5a; margin: 0.7rem 0 0; max-width: 78ch; }
.mg-body {
  background: #fff;
  border: 1px solid #dfe4ea;
  border-radius: 6px;
  padding: 0.9rem;
  margin-top: 0.9rem;
}
.mg-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.8rem;
}
.mg-spacer { flex: 1; }
.mg-history { margin-top: 1rem; border-top: 1px solid #dfe4ea; padding-top: 0.8rem; }
.mg-history-head { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.4rem; color: #1f2733; }
</style>

<template lang="pug">
.firm-template-library
  .has-text-centered.py-6(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-notification(v-else-if="loadError" type="is-danger is-light" :closable="false")
    | {{ loadError }}

  template(v-else)
    p.title.is-5 {{ $t('firmTemplateLibrary.heading') }}
    p.subtitle.is-6.has-text-grey.mb-5 {{ $t('firmTemplateLibrary.intro') }}

    //- Whose library is in force — the approved mockup's two cards. The green
    //- badge follows the firm's upload; the replaced card dims but stays, so
    //- the manager always sees what Remove would return their advisors to.
    .ftl-cascade(v-if="library.loaded")
      .ftl-lib-card(:class="library.source === 'firm' ? 'is-replaced' : 'is-in-force'")
        span.ftl-badge(:class="library.source === 'firm' ? 'is-grey' : 'is-green'")
          | {{ library.source === 'firm' ? $t('firmTemplateLibrary.cardReplaced') : $t('firmTemplateLibrary.cardInForce') }}
        .ftl-who {{ $t('firmTemplateLibrary.cardPlatform') }}
        .ftl-count {{ $t('firmTemplateLibrary.cardCount', { n: library.platformCount }) }}
        .ftl-meta {{ $t('firmTemplateLibrary.cardMaintained') }}
      .ftl-arrow →
      .ftl-lib-card(:class="library.source === 'firm' ? 'is-in-force' : ''")
        span.ftl-badge.is-green(v-if="library.source === 'firm'") {{ $t('firmTemplateLibrary.cardInForce') }}
        .ftl-who {{ $t('firmTemplateLibrary.cardYours') }}
        template(v-if="library.source === 'firm'")
          .ftl-count {{ $t('firmTemplateLibrary.cardCount', { n: state.templateCount }) }}
          .ftl-meta {{ stateLine }}
        template(v-else)
          .ftl-count.ftl-none {{ $t('firmTemplateLibrary.cardNone') }}
          .ftl-meta {{ $t('firmTemplateLibrary.cardNoneHint') }}

    .box
      p.mb-4(v-if="!state.hasUpload") {{ $t('firmTemplateLibrary.stateNone') }}
      p.mb-4(v-else)
        strong {{ stateLine }}

      //- A rejected file leaves the library untouched — say so beside the reason,
      //- so a failure never reads as damage done.
      b-notification(v-if="uploadError" type="is-danger is-light" :closable="true" @close="uploadError = ''")
        | {{ $t('templateLibrary.uploadFailed') }} {{ uploadError }}

      b-field.mb-0(grouped)
        b-upload(v-model="pickedFile" accept=".json")
          a.button
            b-icon(icon="paperclip" size="is-small")
            span {{ pickedFile ? pickedFile.name : $t('templateLibrary.chooseFile') }}
        p.control
          b-button(
            type="is-primary"
            :disabled="!pickedFile"
            :loading="uploading"
            @click="upload"
          ) {{ $t('templateLibrary.uploadButton') }}
        p.control(v-if="state.hasUpload")
          b-button(
            type="is-danger is-light"
            :loading="removing"
            @click="confirmRemove"
          ) {{ $t('firmTemplateLibrary.removeButton') }}
      p.is-size-7.has-text-grey.mt-3.mb-0 {{ $t('firmTemplateLibrary.uploadHint') }}

    template(v-if="state.history.length > 0")
      p.ftl-band-title.mt-5 {{ $t('templateLibrary.historyHeading') }}
      b-table(:data="state.history" :hoverable="true" :narrowed="true")
        b-table-column(v-slot="{ row }" field="version" :label="$t('templateLibrary.colVersion')" width="90")
          | v{{ row.version }}
          b-tag.ml-2(v-if="row.is_active" type="is-success is-light") {{ $t('templateLibrary.current') }}
        b-table-column(v-slot="{ row }" field="created_at" :label="$t('templateLibrary.colUploaded')")
          | {{ formatDate(row.created_at) }}
        b-table-column(v-slot="{ row }" field="saved_by" :label="$t('templateLibrary.colBy')")
          | {{ row.saved_by }}
        b-table-column(v-slot="{ row }" label="" width="110")
          b-button(
            v-if="!row.is_active"
            size="is-small"
            :loading="restoring === row.id"
            @click="restore(row)"
          ) {{ $t('templateLibrary.restore') }}

    //- Read-only contents of whichever library is in force (view-only by
    //- Mike's ruling 2026-09-01 — editing stays in Advisor-e).
    firm-template-contents(
      v-if="library.loaded"
      :templates="library.templates"
      :source="library.source"
    )
</template>

<script>
/**
 * Template Library — the Firm Manager Hub tab where a firm uploads its OWN
 * search-content export (SEARCH-CONTENT-CASCADE-PLAN.md Phase 3; wording and
 * the Remove button approved by Mike 2026-09-01, recorded in the plan's §7).
 *
 * The upload replaces the platform's library wholesale for this firm's advisors
 * (the Phase 2 cascade, ruled 2026-08-31); Remove returns them to the platform's
 * set — and also clears the firm's upload history, which the confirm dialog says
 * honestly. The screen receives and stores the export — it never edits what is
 * inside (IDs and content are Advisor-e's alone, CLAUDE.md).
 *
 * Backend contract (all firm-scoped server-side from the verified token):
 * GET/POST/DELETE /api/firm-manager/templates + POST .../templates/restore.
 * Unlike the mentor routes these return no `success` flag on success, so every
 * call judges `res.ok`; failures use the standard error envelope.
 */
import FirmTemplateContents from '~/components/firm/FirmTemplateContents.vue'

export default {
  name: 'FirmTemplateLibrary',

  components: { FirmTemplateContents },

  props: {
    // The manager's JWT. Every call is re-gated server-side by the firm guard.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** As GET /api/firm-manager/templates returns it (`hasImport` → hasUpload). */
      state: { hasUpload: false, templateCount: 0, history: [] },
      pickedFile: null,
      uploading: false,
      uploadError: '',
      removing: false,
      /** History-row id currently being restored ('' = none). */
      restoring: '',
      /** As GET /api/firm-manager/templates/library returns it; loaded gates render. */
      library: { loaded: false, source: 'platform', platformCount: 0, templates: [] }
    }
  },

  computed: {
    /** @returns {object|null} the newest history row — the version now live. */
    latestRow () {
      return this.state.history.find(r => r.is_active) || this.state.history[0] || null
    },

    /** @returns {string} upload date of the live version, for the state line. */
    latestDate () {
      return this.latestRow ? this.formatDate(this.latestRow.created_at) : ''
    },

    /** @returns {string} who uploaded the live version. */
    latestBy () {
      return this.latestRow ? this.latestRow.saved_by : ''
    },

    /**
     * The state line, degrading honestly as fields go missing: full line with a
     * name, date-only without one, count-only with no history row at all (the
     * dev fallback returns none) — never trailing off after "uploaded by".
     * @returns {string}
     */
    stateLine () {
      const params = { n: this.state.templateCount, date: this.latestDate, who: this.latestBy }
      if (!this.latestRow || !this.latestDate) { return this.$t('firmTemplateLibrary.stateUploadedBare', params) }
      if (!this.latestBy) { return this.$t('firmTemplateLibrary.stateUploadedNoName', params) }
      return this.$t('firmTemplateLibrary.stateUploaded', params)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** @returns {object} auth headers for every call. */
    headers () {
      return { Authorization: `Bearer ${this.apiToken}` }
    },

    /** @param {string} iso @returns {string} a short local date. */
    formatDate (iso) {
      const d = new Date(iso)
      return isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString(this.$i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const res = await fetch('/api/firm-manager/templates', { headers: this.headers() })
        const body = await res.json()
        if (!res.ok) { throw new Error('load failed') }
        this.state = {
          hasUpload: !!body.hasImport,
          templateCount: body.templateCount || 0,
          history: body.history || []
        }
        await this.loadLibrary()
      } catch (e) {
        // A failed load must never render as an empty, reassuring card.
        this.loadError = this.$t('templateLibrary.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * The library in force (cards + contents table). Re-fetched by load() after
     * every upload/restore/remove, so the cards and table always show what the
     * mutation just made true.
     */
    async loadLibrary () {
      const res = await fetch('/api/firm-manager/templates/library', { headers: this.headers() })
      const body = await res.json()
      if (!res.ok) { throw new Error('library load failed') }
      this.library = {
        loaded: true,
        source: body.source === 'firm' ? 'firm' : 'platform',
        platformCount: body.platformCount || 0,
        templates: Array.isArray(body.templates) ? body.templates : []
      }
    },

    async upload () {
      if (!this.pickedFile) { return }
      this.uploading = true
      this.uploadError = ''
      try {
        const form = new FormData()
        form.append('file', this.pickedFile)
        const res = await fetch('/api/firm-manager/templates', {
          method: 'POST', headers: this.headers(), body: form
        })
        const body = await res.json()
        if (!res.ok) {
          this.uploadError = this.reasonFor(body.error && body.error.code)
          return
        }
        this.pickedFile = null
        this.$buefy.toast.open({
          message: this.$t('templateLibrary.uploadSuccess', { n: body.templateCount }),
          type: 'is-success'
        })
        await this.load()
      } catch (e) {
        this.uploadError = this.reasonFor('')
      } finally {
        this.uploading = false
      }
    },

    /**
     * The plain-English reason behind a rejected upload. The backend's codes are
     * its contract (templateImport.js); anything unrecognised gets the generic line.
     * @param {string} code - error.code from the backend, if any.
     * @returns {string}
     */
    reasonFor (code) {
      const known = {
        INVALID_JSON: 'reasonNotJson',
        INVALID_FORMAT: 'reasonWrongShape',
        TOO_MANY_TEMPLATES: 'reasonTooLarge',
        PARSE_ERROR: 'reasonTooLarge'
      }
      return this.$t('templateLibrary.' + (known[code] || 'reasonGeneric'))
    },

    /** @param {object} row - a history row; restores that version. */
    async restore (row) {
      this.restoring = row.id
      try {
        const res = await fetch('/api/firm-manager/templates/restore', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
          body: JSON.stringify({ versionId: row.id })
        })
        if (!res.ok) { throw new Error('restore failed') }
        this.$buefy.toast.open({ message: this.$t('templateLibrary.restoreSuccess'), type: 'is-success' })
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('templateLibrary.restoreFailed'), type: 'is-danger' })
      } finally {
        this.restoring = ''
      }
    },

    /** The remove gate — nothing happens until the manager confirms the dialog. */
    confirmRemove () {
      this.$buefy.dialog.confirm({
        title: this.$t('firmTemplateLibrary.removeConfirmTitle'),
        message: this.$t('firmTemplateLibrary.removeConfirmMessage'),
        confirmText: this.$t('firmTemplateLibrary.removeButton'),
        type: 'is-danger',
        hasIcon: true,
        onConfirm: () => this.remove()
      })
    },

    /** Removes the firm's upload — advisors return to the platform's library. */
    async remove () {
      this.removing = true
      try {
        const res = await fetch('/api/firm-manager/templates', {
          method: 'DELETE', headers: this.headers()
        })
        if (!res.ok) { throw new Error('remove failed') }
        this.$buefy.toast.open({ message: this.$t('firmTemplateLibrary.removeSuccess'), type: 'is-success' })
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('firmTemplateLibrary.removeFailed'), type: 'is-danger' })
      } finally {
        this.removing = false
      }
    }
  }
}
</script>

<style scoped>
.ftl-band-title {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
}

/* Whose library is in force — the approved mockup's two cards. */
.ftl-cascade {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}
.ftl-lib-card {
  flex: 1 1 260px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  position: relative;
}
.ftl-lib-card.is-in-force {
  border-color: #257953;
  background: #f2faf6;
}
.ftl-lib-card.is-replaced {
  opacity: 0.62;
}
.ftl-who {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a7a7a;
  margin-bottom: 0.35rem;
}
.ftl-count {
  font-size: 1.6rem;
  font-weight: 700;
  color: #002b64;
}
.ftl-count.ftl-none {
  color: #9a9a9a;
}
.ftl-meta {
  font-size: 0.85rem;
  color: #7a7a7a;
  margin-top: 0.25rem;
}
.ftl-badge {
  position: absolute;
  top: -0.7rem;
  right: 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  letter-spacing: 0.04em;
}
.ftl-badge.is-green {
  background: #257953;
  color: #fff;
}
.ftl-badge.is-grey {
  background: #e5e5e5;
  color: #555;
}
.ftl-arrow {
  align-self: center;
  color: #b5b5b5;
  font-size: 1.4rem;
}
</style>

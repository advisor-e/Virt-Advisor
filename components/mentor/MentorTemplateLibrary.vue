<template lang="pug">
.mentor-template-library
  .has-text-centered.py-6(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-notification(v-else-if="loadError" type="is-danger is-light" :closable="false")
    | {{ loadError }}

  template(v-else)
    p.title.is-5 {{ $t('templateLibrary.heading') }}
    p.subtitle.is-6.has-text-grey.mb-5 {{ $t('templateLibrary.intro') }}

    .box
      p.mb-4(v-if="!state.hasUpload") {{ $t('templateLibrary.stateNone') }}
      p.mb-4(v-else)
        strong {{ $t('templateLibrary.stateUploaded', { n: state.templateCount, date: latestDate, who: latestBy }) }}

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

    template(v-if="state.history.length > 0")
      p.tl-band-title.mt-5 {{ $t('templateLibrary.historyHeading') }}
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
</template>

<script>
/**
 * Template Library — the Mentor Hub tab where the master template export is
 * uploaded (SEARCH-CONTENT-CASCADE-PLAN.md Phase 1; wording approved by Mike
 * 2026-08-31 in session, recorded in the plan's commit).
 *
 * The screen receives and stores the Advisor-e export — it never edits what is
 * inside (IDs and content are Advisor-e's alone, CLAUDE.md). Until Phase 2
 * rewires the loader, an upload is stored inert: nothing an advisor sees
 * changes from here yet.
 */
export default {
  name: 'MentorTemplateLibrary',

  props: {
    // The mentor's JWT. Every call is re-gated server-side by requireMentorRole.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** As GET /api/mentor/templates returns it. */
      state: { hasUpload: false, templateCount: 0, history: [] },
      pickedFile: null,
      uploading: false,
      uploadError: '',
      /** History-row id currently being restored ('' = none). */
      restoring: ''
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
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** @returns {object} auth headers for every mentor call. */
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
        const res = await fetch('/api/mentor/templates', { headers: this.headers() })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error('load failed') }
        this.state = {
          hasUpload: !!body.hasUpload,
          templateCount: body.templateCount || 0,
          history: body.history || []
        }
      } catch (e) {
        // A failed load must never render as an empty, reassuring card.
        this.loadError = this.$t('templateLibrary.loadFailed')
      } finally {
        this.loading = false
      }
    },

    async upload () {
      if (!this.pickedFile) { return }
      this.uploading = true
      this.uploadError = ''
      try {
        const form = new FormData()
        form.append('file', this.pickedFile)
        const res = await fetch('/api/mentor/templates/import', {
          method: 'POST', headers: this.headers(), body: form
        })
        const body = await res.json()
        if (!res.ok || !body.success) {
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
        const res = await fetch('/api/mentor/templates/restore', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
          body: JSON.stringify({ versionId: row.id })
        })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error('restore failed') }
        this.$buefy.toast.open({ message: this.$t('templateLibrary.restoreSuccess'), type: 'is-success' })
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('templateLibrary.restoreFailed'), type: 'is-danger' })
      } finally {
        this.restoring = ''
      }
    }
  }
}
</script>

<style scoped>
.tl-band-title {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
}
</style>

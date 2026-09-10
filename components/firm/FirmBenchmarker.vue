<template lang="pug">
.fbm
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | The release in force is what every #[b Business Performance Report] compares a client against.
      |  Every figure here and on the report's benchmark page is Stats NZ's own. Nothing on this
      |  screen is typed, and nothing is invented: a file with a column missing is refused by the
      |  column's name, and a ratio Stats NZ did not publish prints as unpublished, never as a zero.

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    .box
      p.has-text-weight-semibold.mb-1 In force now
      p.is-size-7.has-text-grey.mb-3
        | The shipped release, until a newer one is uploaded here. The report's benchmark page names
        |  the year and says "provisional" where Stats NZ does.
      .fbm-row.fbm-head
        span Release
        span Status
        span.has-text-right Industries
        span.has-text-right With benchmarks
        span.has-text-right Published ratios
      .fbm-row(v-if="summary")
        span
          b {{ summary.year }}
          |
          b-tag(:type="uploaded ? 'is-info is-light' : 'is-light'" size="is-small") {{ uploaded ? 'uploaded here' : 'shipped with the app' }}
        span.is-size-7.has-text-grey {{ summary.provisional ? 'provisional — Stats NZ: 2023 final, 2024 and 2025 provisional' : 'final' }}
        span.has-text-right {{ summary.counts.industries }}
        span.has-text-right {{ summary.counts.withBenchmarks }}
        span.has-text-right {{ summary.counts.ratioRows.toLocaleString() }}
      p.is-size-7.has-text-grey.mt-2 {{ summary ? summary.source : '' }}

    .box
      p.has-text-weight-semibold.mb-1 Replace the release
      p.is-size-7.has-text-grey.mb-3
        | Stats NZ publishes the benchmarker as two CSV files a year, from
        |  #[b stats.govt.nz › Business performance benchmarker]. Both are needed, and nothing is
        |  stored until both read cleanly. Each file is read by its column names, so a file from a
        |  different year works so long as Stats NZ has not renamed a column — and if they have,
        |  the refusal names the column.
      .fbm-row.fbm-head
        span File
        span What it carries
        span
        span
        span
      .fbm-row
        span
          b Benchmark ratios
          |
          b-tag(type="is-warning is-light" size="is-small") required
        span.is-size-7.has-text-grey benchmark_ratios_all_industries-&lt;year&gt;-anzsic-class.csv — the eight ratios by industry and size band: 25th percentile, median, 75th percentile, and each band's turnover range
        b-field.fbm-file(grouped)
          b-upload(v-model="ratiosFile" accept=".csv,text/csv")
            a.button.is-small.is-light
              span {{ ratiosFile ? ratiosFile.name : 'Choose file' }}
        span
        span
      .fbm-row
        span
          b Financial
          |
          b-tag(type="is-warning is-light" size="is-small") required
        span.is-size-7.has-text-grey financial_all_industries-&lt;year&gt;.csv — business and employee counts, income, expenditure, profit and assets, with Stats NZ's accuracy category and suppression marks
        b-field.fbm-file(grouped)
          b-upload(v-model="financialFile" accept=".csv,text/csv")
            a.button.is-small.is-light
              span {{ financialFile ? financialFile.name : 'Choose file' }}
        span
        span
      p.is-size-7.has-text-grey.mt-2
        | #[b What happens on Replace.] Both files are read; the screen shows what it found — the year,
        |  how many industries, how many with benchmarks, how many published ratios — and the release
        |  goes into force for every report from then on. The previous release stays in the version
        |  history below, and Restore brings it back in one click.
      b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}
      .buttons.mt-3
        b-button(type="is-primary" :loading="saving" :disabled="!ratiosFile || !financialFile" @click="upload") Replace the release
        span.is-size-7.has-text-grey Nothing is stored until both files read cleanly.

    .box
      p.has-text-weight-semibold.mb-2 Version history
      p.is-size-7.has-text-grey.mb-2 Every release ever uploaded here, newest first, with Restore — the same history every Model Inputs tab has.
      p.is-size-7.has-text-grey(v-if="!history.length") No release has been uploaded yet; the shipped release is in force.
      table.table.is-fullwidth.is-narrow(v-else)
        tbody
          tr(v-for="h in history" :key="h.id")
            td Version {{ h.version }}
            td.is-size-7.has-text-grey {{ h.created_by }}
            td.is-size-7.has-text-grey {{ h.created_at }}
            td.has-text-right
              b-button(size="is-small" type="is-light" @click="restore(h.id)") Restore
</template>

<script>
/**
 * FirmBenchmarker — the mentor's Industry Benchmarks tab (item 4.70 stage 3, Brief P9).
 * The approved drawing is `design/mockups/benchmarker-hub-tab.html` (Mike, 2026-09-08:
 * "yes", tab name and button as drawn).
 *
 * The Stats NZ Business Performance Benchmarker is one national table, replaced each
 * release: this tab shows what is in force, takes the two files Stats NZ publishes, and
 * keeps the version history. Nothing on it is typed — every figure is Stats NZ's, read by
 * the backend by column name and refused by name when a column is missing.
 *
 * MENTOR TIER ALONE, and here that is the design rather than the default: no firm has a
 * different Stats NZ, so the release is stored at the platform scope for every reader.
 */
export default {
  name: 'FirmBenchmarker',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      saving: false,
      saveError: '',
      /** `{ source, year, provisional, counts }` of the release in force. */
      summary: null,
      uploaded: false,
      history: [],
      ratiosFile: null,
      financialFile: null
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** The release in force and the upload history. */
    async load () {
      this.loading = true
      try {
        const data = await this.api('GET', '/api/firm-manager/benchmarker')
        this.summary = data.dataset || null
        this.uploaded = Boolean(data.uploaded)
        const hist = await this.api('GET', '/api/firm-manager/benchmarker/history')
        this.history = hist.history || []
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * The two files, as multipart fields `ratios` and `financial`. The button is disabled
     * until both are chosen, so the backend's "two files required" refusal is the guard
     * behind a guard rather than the one a mentor meets.
     */
    async upload () {
      if (!this.ratiosFile || !this.financialFile) { return }
      this.saving = true
      this.saveError = ''
      try {
        const form = new FormData()
        form.append('ratios', this.ratiosFile)
        form.append('financial', this.financialFile)
        const res = await fetch('/api/firm-manager/benchmarker', { method: 'POST', headers: { Authorization: `Bearer ${this.apiToken}` }, body: form })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) { throw new Error((body.error && body.error.message) || res.statusText) }
        this.ratiosFile = null
        this.financialFile = null
        this.$buefy.toast.open({ message: 'The ' + body.dataset.year + ' release is now in force', type: 'is-success' })
        await this.load()
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /** @param {number} versionId */
    async restore (versionId) {
      try {
        await this.api('POST', '/api/firm-manager/benchmarker/restore', { versionId })
        await this.load()
        this.$buefy.toast.open({ message: 'That release is back in force', type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Thin authenticated fetch — the same helper the thresholds and sell-down tabs carry, so
     * this tab can be mounted and tested on its own.
     * @param {string} method @param {string} path @param {Object} [body]
     * @returns {Promise<Object>}
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
.fbm-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 150px 130px 130px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.fbm-row:last-child { border-bottom: 0; }
.fbm-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.fbm-file { margin-bottom: 0; }
</style>

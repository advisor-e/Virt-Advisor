<template lang="pug">
.fac
  b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

  //- Step 1 — the section, then the teaching PDFs, taught in the order dropped.
  .card(v-if="step === 'teaching'")
    header.card-header: p.card-header-title {{ $t('strategyConcepts.step1.heading') }}
    .card-content
      b-field(:label="$t('strategyConcepts.step1.section')" horizontal)
        b-select(v-model="section" expanded)
          option(v-for="s in sections" :key="s.id" :value="s.id") {{ s.name }}
      pdf-drop-zone(
        :big="$t('strategyConcepts.step1.drop')"
        :small="$t('strategyConcepts.step1.dropSmall')"
        :multiple="true"
        :disabled="busy"
        @files="addTeaching")
      table.table.is-fullwidth.is-narrow.mt-2(v-if="teaching.length")
        tbody
          tr(v-for="(f, i) in teaching" :key="i")
            td {{ (i + 1) + ' · ' + f.name }}
            td.has-text-right
              b-button(size="is-small" type="is-light" :disabled="busy" @click="teaching.splice(i, 1)") {{ $t('strategyConcepts.mark.remove') }}
      p.is-size-7.has-text-grey.mt-3 {{ $t('strategyConcepts.step1.noAi') }}
      .fac-actions
        span.has-text-grey.is-size-7(v-if="busy") {{ $t('strategyConcepts.converting') }}
        b-button(type="is-light" @click="$emit('cancel')") {{ $t('strategyConcepts.cancel') }}
        b-button(type="is-primary" :loading="busy" :disabled="!teaching.length || !section" @click="convertTeaching") {{ $t('strategyConcepts.next') }}

  //- Step 2 — what came back, in the app's frame, and its name.
  .card(v-if="step === 'check'")
    header.card-header
      p.card-header-title {{ $t('strategyConcepts.step2.heading') }}
      p.card-header-icon.is-size-7.has-text-grey {{ $t('strategyConcepts.step2.converted', { s: seconds, kb: kilobytes }) }}
    .card-content
      .mb-4(v-for="(p, i) in pages" :key="i")
        p.is-size-7.has-text-grey.mb-1(v-if="pages.length > 1") {{ $t('strategyConcepts.step2.pageOf', { i: i + 1, n: pages.length }) }}
        imported-concept-page(v-bind="pageProps(p)")
      b-field(:label="$t('strategyConcepts.step2.name')" :message="nameMissing ? $t('strategyConcepts.step2.nameRequired') : $t('strategyConcepts.step2.nameHint')" :type="nameMissing ? 'is-danger' : ''" horizontal)
        b-input(v-model="name" :maxlength="limits.maxName")
      b-field(:label="$t('strategyConcepts.step2.section')" horizontal)
        b-input(:value="sectionName" readonly)
      b-field(:label="$t('strategyConcepts.step2.helps')" :message="$t('strategyConcepts.step2.helpsHint')" horizontal)
        b-input(v-model="helps" :maxlength="limits.maxHelps" :placeholder="$t('strategyConcepts.step2.helpsPlaceholder')")
      .fac-actions
        b-button(type="is-light" @click="$emit('cancel')") {{ $t('strategyConcepts.cancel') }}
        b-button(type="is-light" @click="step = 'teaching'") {{ $t('strategyConcepts.back') }}
        b-button(type="is-primary" @click="toResponse") {{ $t('strategyConcepts.next') }}

  //- Step 3 — the Response Form. Required, on Mike's ruling of 2026-09-23.
  .card(v-if="step === 'response'")
    header.card-header: p.card-header-title {{ $t('strategyConcepts.step3.heading') }}
    .card-content
      pdf-drop-zone(
        :big="$t('strategyConcepts.step3.drop')"
        :small="$t('strategyConcepts.step3.dropSmall')"
        :disabled="busy"
        @files="convertResponse")
      .fac-actions
        span.has-text-grey.is-size-7(v-if="busy") {{ $t('strategyConcepts.converting') }}
        b-button(type="is-light" @click="$emit('cancel')") {{ $t('strategyConcepts.cancel') }}
        b-button(type="is-light" :disabled="busy" @click="step = 'check'") {{ $t('strategyConcepts.back') }}

  //- Step 3 continued — marking the boxes the client writes in (§5b).
  .card(v-if="step === 'mark'")
    header.card-header
      p.card-header-title {{ $t('strategyConcepts.mark.heading') }}
      p.card-header-icon.is-size-7.has-text-grey {{ $tc('strategyConcepts.mark.count', boxes.length, { n: boxes.length }) }}
    .card-content
      p.is-size-7.mb-3 {{ $t('strategyConcepts.mark.instruction') }}
      concept-box-marker(
        :page="responsePage"
        :boxes="boxes"
        :max-label="limits.maxLabel"
        :max-boxes="limits.maxBoxes"
        v-bind="brandProps"
        @change="b => (boxes = b)")
      p.is-size-7.has-text-grey(v-if="!boxes.length") {{ $t('strategyConcepts.mark.noneYet') }}
      .fac-actions
        b-button(type="is-light" @click="$emit('cancel')") {{ $t('strategyConcepts.cancel') }}
        b-button(type="is-light" :disabled="busy" @click="step = 'response'") {{ $t('strategyConcepts.back') }}
        b-button(type="is-primary" :loading="busy" :disabled="!ready" @click="save") {{ $t('strategyConcepts.mark.save') }}
</template>

<script>
import PdfDropZone from '~/components/base/PdfDropZone.vue'
import ImportedConceptPage from '~/components/strategy/ImportedConceptPage.vue'
import ConceptBoxMarker from '~/components/strategy/ConceptBoxMarker.vue'
import { boxesForSave, boxesReady } from '~/utils/conceptBoxes'

const BASE = '/api/firm-manager/strategy-concepts'

/**
 * FirmAddConcept — the three steps of Add Concept (item 15.20), from
 * `design/mockups/add-concept.html` §3–§5b and its approved wording (§8, §8b, §8c).
 *
 * 🔴 NOTHING HERE DECIDES WHAT IS SAVED. Steps 1 and 3 convert through the preview route, which
 * stores nothing, so the manager sees exactly what a client will. Save sends the PDFs themselves
 * again and the backend converts them afresh — the pages shown here are never sent back.
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, deliberate: step 1 lists the dropped files with Remove, so a
 * wrong one can be taken out before converting; step 2 shows every teaching page, captioned
 * "Page i of n" when there is more than one; the drawing's notes to Mike under the section field
 * and on step 3 are notes, not screen text, and are not shown.
 */
export default {
  name: 'FirmAddConcept',

  components: { PdfDropZone, ImportedConceptPage, ConceptBoxMarker },

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true },
    /** The four planning sections: `[{ id, name }]`. */
    sections: { type: Array, required: true },
    /** The backend's caps — see `LIMITS` in server/routes/importedConcepts.js. */
    limits: { type: Object, required: true },
    /** The advisor firm's `{ name, logo, colour }` for the frame and mark; nulls fall back. */
    brand: { type: Object, default: () => ({}) }
  },

  data () {
    return {
      step: 'teaching',
      section: '',
      /** File[] in teaching order. */
      teaching: [],
      /** Every teaching page as converted, in order. */
      pages: [],
      seconds: '0',
      kilobytes: 0,
      name: '',
      nameMissing: false,
      helps: '',
      responseFile: null,
      responsePage: null,
      boxes: [],
      busy: false,
      error: ''
    }
  },

  computed: {
    sectionName () {
      const s = this.sections.find(x => x.id === this.section)
      return s ? s.name : ''
    },

    brandProps () {
      return {
        firmName: this.brand.name || '',
        firmColour: this.brand.colour || '#0070c0',
        firmLogo: this.brand.logo || ''
      }
    },

    ready () {
      return boxesReady(this.boxes)
    }
  },

  methods: {
    pageProps (p) {
      return Object.assign({ svg: p.svg, width: p.width, height: p.height }, this.brandProps)
    },

    addTeaching (files) {
      this.error = ''
      const all = this.teaching.concat(files)
      if (all.length > this.limits.maxTeachingFiles) {
        this.error = this.message('TOO_MANY_FILES')
        return
      }
      this.teaching = all
    },

    async convertTeaching () {
      this.busy = true
      this.error = ''
      const began = Date.now()
      try {
        let pages = []
        for (const file of this.teaching) { pages = pages.concat(await this.preview(file)) }
        if (pages.length > this.limits.maxTeachingPages) { throw this.failure('TOO_MANY_PAGES') }
        this.pages = pages
        this.seconds = ((Date.now() - began) / 1000).toFixed(1)
        this.kilobytes = Math.round(pages.reduce((n, p) => n + p.svg.length, 0) / 1024)
        if (!this.name) { this.name = String(pages[0].title || '').trim().slice(0, this.limits.maxName) }
        this.step = 'check'
      } catch (err) {
        this.error = err.message
      } finally {
        this.busy = false
      }
    },

    toResponse () {
      this.nameMissing = !this.name.trim()
      if (!this.nameMissing) { this.step = 'response' }
    },

    async convertResponse (files) {
      this.busy = true
      this.error = ''
      try {
        const pages = await this.preview(files[0])
        if (pages.length !== 1) { throw this.failure('RESPONSE_ONE_PAGE') }
        this.responseFile = files[0]
        this.responsePage = pages[0]
        this.boxes = []
        this.step = 'mark'
      } catch (err) {
        this.error = err.message
      } finally {
        this.busy = false
      }
    },

    async save () {
      this.busy = true
      this.error = ''
      try {
        const form = new FormData()
        this.teaching.forEach(f => form.append('teaching', f, f.name))
        form.append('response', this.responseFile, this.responseFile.name)
        form.append('name', this.name.trim())
        form.append('planningDomain', this.section)
        form.append('helpsClientTo', this.helps.trim())
        form.append('boxes', JSON.stringify(boxesForSave(this.boxes)))
        const data = await this.send(BASE, form)
        // Payload: the backend's refreshed list, and the name the confirmation uses.
        this.$emit('saved', { list: data, name: this.name.trim() })
      } catch (err) {
        this.error = err.message
      } finally {
        this.busy = false
      }
    },

    /** @param {File} file @returns {Promise<Array<object>>} the converted pages */
    async preview (file) {
      const form = new FormData()
      form.append('file', file, file.name)
      const data = await this.send(BASE + '/preview', form)
      return data.pages || []
    },

    failure (code) {
      return new Error(this.message(code))
    },

    /** An error code as Mike's approved sentence, or the general one. */
    message (code) {
      const key = 'strategyConcepts.errors.' + code
      return this.$te(key) ? this.$t(key) : this.$t('strategyConcepts.errors.failed')
    },

    /**
     * A multipart POST. The browser sets the multipart boundary itself, so no Content-Type is
     * given; a network failure and an HTTP error both end in a sentence the manager can act on.
     * @param {string} path
     * @param {FormData} form
     * @returns {Promise<object>}
     */
    async send (path, form) {
      let res
      try {
        res = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${this.apiToken}` }, body: form })
      } catch (e) {
        throw this.failure('failed')
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw this.failure(body.error && body.error.code)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.fac-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 16px; }
</style>

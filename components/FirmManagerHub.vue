<template>
  <section class="firm-manager-hub section">
    <div class="container is-fluid">
      <!-- Header -->
      <div class="level mb-5">
        <div class="level-left">
          <div>
            <p class="title is-4">
              Firm Manager Hub
            </p>
            <p class="subtitle is-6 has-text-grey">
              {{ firmProfile.name || firmId }}
            </p>
          </div>
        </div>
        <div class="level-right" style="gap:12px;display:flex;align-items:center;">
          <b-tag type="is-info is-light" size="is-medium">
            Storage: {{ storagePercent }}% used
          </b-tag>
          <a href="/advisor" class="button is-light is-small">
            ← Back to Advisor
          </a>
        </div>
      </div>

      <!-- Main tabs -->
      <b-tabs v-model="activeTab" type="is-boxed" animated>
        <!-- ── Tab 1: Document Library ───────────────────────────────────── -->
        <b-tab-item label="Document Library" icon="file-pdf-box">
          <div class="columns">
            <div class="column is-3">
              <b-menu>
                <b-menu-list label="Category">
                  <b-menu-item
                    v-for="cat in documentCategories"
                    :key="cat.key"
                    :label="cat.label"
                    :active="selectedCategory === cat.key"
                    @click="selectCategory(cat.key)"
                  />
                </b-menu-list>
              </b-menu>
            </div>
            <div class="column">
              <!-- Upload -->
              <div class="box mb-4">
                <p class="has-text-weight-semibold mb-3">
                  Upload a document
                </p>
                <b-field grouped>
                  <b-field expanded label="File (PDF only)">
                    <b-upload v-model="uploadFile" accept=".pdf" expanded>
                      <a class="button is-light is-fullwidth">
                        <b-icon icon="upload" />
                        <span>{{ uploadFile ? uploadFile.name : 'Choose PDF…' }}</span>
                      </a>
                    </b-upload>
                  </b-field>
                  <b-field label="&nbsp;">
                    <b-button
                      type="is-primary"
                      :loading="uploading"
                      :disabled="!uploadFile"
                      @click="submitUpload"
                    >
                      Upload
                    </b-button>
                  </b-field>
                </b-field>
              </div>

              <!-- Document list -->
              <div v-if="loadingDocs" class="has-text-centered py-5">
                <b-loading :is-full-page="false" :active="true" />
              </div>
              <div v-else>
                <p class="has-text-weight-semibold mb-2">
                  Platform documents
                </p>
                <b-table
                  :data="baseDocs"
                  :hoverable="true"
                  class="mb-5"
                  empty-string="No platform documents in this category"
                >
                  <b-table-column v-slot="{ row }" field="name" label="File name">
                    {{ row.name }}
                  </b-table-column>
                  <b-table-column v-slot="{ row }" label="Actions" width="120">
                    <b-button size="is-small" icon-left="download" @click="downloadDoc(row)">
                      Download
                    </b-button>
                  </b-table-column>
                </b-table>

                <p class="has-text-weight-semibold mb-2">
                  Your firm's documents
                </p>
                <b-table
                  :data="firmDocs"
                  :hoverable="true"
                  empty-string="No documents uploaded yet"
                >
                  <b-table-column v-slot="{ row }" field="name" label="File name">
                    {{ row.name }}
                  </b-table-column>
                  <b-table-column v-slot="{ row }" label="Actions" width="200">
                    <b-button
                      size="is-small"
                      icon-left="download"
                      class="mr-1"
                      @click="downloadDoc(row)"
                    >
                      Download
                    </b-button>
                    <b-button
                      size="is-small"
                      type="is-danger is-light"
                      icon-left="delete"
                      @click="confirmDeleteDoc(row)"
                    >
                      Remove
                    </b-button>
                  </b-table-column>
                </b-table>
              </div>
            </div>
          </div>
        </b-tab-item>

        <!-- ── Tab 2: Decision Framework ────────────────────────────────── -->
        <b-tab-item label="Decision Framework" icon="code-json">
          <div class="columns">
            <div class="column is-3">
              <b-menu>
                <b-menu-list label="Framework section">
                  <b-menu-item
                    v-for="fk in frameworkKeys"
                    :key="fk.key"
                    :label="fk.label"
                    :active="selectedFrameworkKey === fk.key"
                    @click="selectFrameworkKey(fk.key)"
                  />
                </b-menu-list>
              </b-menu>
            </div>
            <div class="column">
              <div v-if="loadingFramework" class="has-text-centered py-5">
                <b-loading :is-full-page="false" :active="true" />
              </div>
              <template v-else>
                <b-notification
                  v-if="!frameworkOverride"
                  type="is-info is-light"
                  :closable="false"
                  class="mb-4"
                >
                  No firm override saved for this section. The AI uses the platform default.
                  Add your overrides below and save to activate them.
                </b-notification>

                <b-field label="Your firm's override JSON">
                  <b-input
                    v-model="frameworkJson"
                    type="textarea"
                    rows="16"
                    custom-class="is-family-monospace"
                    placeholder="{ &quot;key&quot;: &quot;value&quot; }"
                  />
                </b-field>

                <b-field grouped>
                  <b-button
                    type="is-primary"
                    :loading="savingFramework"
                    @click="saveFramework"
                  >
                    Save override
                  </b-button>
                  <b-button
                    type="is-light"
                    :disabled="!frameworkOverride"
                    @click="clearFrameworkEditor"
                  >
                    Reset editor
                  </b-button>
                  <b-button
                    type="is-light"
                    :disabled="!frameworkHistory.length"
                    @click="showHistoryModal = true"
                  >
                    Version history ({{ frameworkHistory.length }})
                  </b-button>
                </b-field>

                <!-- Version history modal -->
                <b-modal v-model="showHistoryModal" has-modal-card>
                  <div class="modal-card">
                    <header class="modal-card-head">
                      <p class="modal-card-title">
                        Version history
                      </p>
                    </header>
                    <section class="modal-card-body">
                      <b-table :data="frameworkHistory" :hoverable="true">
                        <b-table-column v-slot="{ row }" field="version" label="Version" width="80">
                          v{{ row.version }}
                        </b-table-column>
                        <b-table-column v-slot="{ row }" field="saved_by" label="Saved by">
                          {{ row.saved_by }}
                        </b-table-column>
                        <b-table-column v-slot="{ row }" field="created_at" label="Date">
                          {{ formatDate(row.created_at) }}
                        </b-table-column>
                        <b-table-column v-slot="{ row }" label="" width="100">
                          <b-button
                            v-if="!row.is_active"
                            size="is-small"
                            @click="restoreVersion(row)"
                          >
                            Restore
                          </b-button>
                          <b-tag v-else type="is-success is-light">
                            Active
                          </b-tag>
                        </b-table-column>
                      </b-table>
                    </section>
                    <footer class="modal-card-foot">
                      <b-button @click="showHistoryModal = false">
                        Close
                      </b-button>
                    </footer>
                  </div>
                </b-modal>
              </template>
            </div>
          </div>
        </b-tab-item>

        <!-- ── Tab 3: Templates & Videos ────────────────────────────────── -->
        <b-tab-item label="Templates &amp; Videos" icon="play-box-multiple">
          <div class="columns">
            <!-- Template Library column -->
            <div class="column">
              <p class="has-text-weight-semibold mb-3">
                Template library
              </p>

              <!-- Current status -->
              <div class="box mb-4">
                <div v-if="loadingTemplateImport" class="has-text-centered py-3">
                  <b-loading :is-full-page="false" :active="true" />
                </div>
                <template v-else>
                  <div v-if="templateImport.hasImport" class="mb-3">
                    <b-tag type="is-success is-light" size="is-medium">
                      {{ templateImport.templateCount }} templates loaded
                    </b-tag>
                    <p class="is-size-7 has-text-grey mt-1">
                      Version {{ templateImport.history[0] && templateImport.history[0].version }}
                      &middot; saved {{ formatDate(templateImport.history[0] && templateImport.history[0].created_at) }}
                    </p>
                  </div>
                  <div v-else class="mb-3">
                    <b-tag type="is-warning is-light" size="is-medium">
                      Using platform default
                    </b-tag>
                    <p class="is-size-7 has-text-grey mt-1">
                      No firm-specific template library imported yet
                    </p>
                  </div>

                  <!-- Upload -->
                  <b-field grouped>
                    <b-field expanded label="Import JSON from master app">
                      <b-upload v-model="templateImportFile" accept=".json" expanded>
                        <a class="button is-light is-fullwidth">
                          <b-icon icon="upload" />
                          <span>{{ templateImportFile ? templateImportFile.name : 'Choose JSON file…' }}</span>
                        </a>
                      </b-upload>
                    </b-field>
                    <b-field label="&nbsp;">
                      <b-button
                        type="is-primary"
                        :loading="importingTemplates"
                        :disabled="!templateImportFile"
                        @click="submitTemplateImport"
                      >
                        Import
                      </b-button>
                    </b-field>
                  </b-field>

                  <b-button
                    v-if="templateImport.hasImport"
                    type="is-danger is-light"
                    size="is-small"
                    icon-left="restore"
                    @click="confirmResetTemplates"
                  >
                    Reset to platform default
                  </b-button>
                </template>
              </div>

              <!-- Version history -->
              <div v-if="templateImport.history && templateImport.history.length > 1">
                <p class="has-text-weight-semibold mb-2">
                  Import history
                </p>
                <b-table :data="templateImport.history" :hoverable="true" size="is-small">
                  <b-table-column v-slot="{ row }" field="version" label="Version" width="80">
                    v{{ row.version }}
                    <b-tag v-if="row.is_active" type="is-success is-light" size="is-small">current</b-tag>
                  </b-table-column>
                  <b-table-column v-slot="{ row }" field="created_at" label="Imported">
                    {{ formatDate(row.created_at) }}
                  </b-table-column>
                  <b-table-column v-slot="{ row }" label="" width="80">
                    <b-button
                      v-if="!row.is_active"
                      size="is-small"
                      type="is-info is-light"
                      @click="restoreTemplateVersion(row)"
                    >
                      Restore
                    </b-button>
                  </b-table-column>
                </b-table>
              </div>
            </div>

            <!-- Videos column -->
            <div class="column">
              <p class="has-text-weight-semibold mb-3">
                Video links
              </p>
              <div class="box mb-4">
                <b-field label="Domain">
                  <b-select v-model="newVideo.domain" placeholder="Select domain" expanded>
                    <option v-for="d in domains" :key="d" :value="d">
                      {{ d }}
                    </option>
                  </b-select>
                </b-field>
                <b-field label="Title">
                  <b-input v-model="newVideo.title" placeholder="e.g. Cash Flow Masterclass" />
                </b-field>
                <b-field label="URL (HTTPS)">
                  <b-input v-model="newVideo.url" type="url" placeholder="https://…" />
                </b-field>
                <b-button
                  type="is-primary"
                  :loading="addingVideo"
                  :disabled="!newVideo.domain || !newVideo.title || !newVideo.url"
                  @click="addVideo"
                >
                  Add video
                </b-button>
              </div>

              <b-table
                :data="videos"
                :hoverable="true"
                :loading="loadingVideos"
                empty-string="No videos added yet"
              >
                <b-table-column v-slot="{ row }" field="domain" label="Domain">
                  <b-tag>{{ row.domain }}</b-tag>
                </b-table-column>
                <b-table-column v-slot="{ row }" field="title" label="Title">
                  <a :href="row.url" target="_blank" rel="noopener noreferrer">{{ row.title }}</a>
                </b-table-column>
                <b-table-column v-slot="{ row }" label="" width="80">
                  <b-button
                    size="is-small"
                    type="is-danger is-light"
                    icon-left="delete"
                    @click="confirmDeleteVideo(row)"
                  />
                </b-table-column>
              </b-table>
            </div>
          </div>
        </b-tab-item>

        <!-- ── Tab 5: Advisory Distinctions ─────────────────────────────── -->
        <b-tab-item label="Advisory Distinctions" icon="brain">
          <div class="columns">
            <div class="column is-3">
              <b-menu>
                <b-menu-list label="Domain">
                  <b-menu-item
                    v-for="d in distinctionDomains"
                    :key="d.id"
                    :label="d.label"
                    :active="selectedDistinctionDomain === d.id"
                    @click="selectedDistinctionDomain = d.id"
                  />
                </b-menu-list>
              </b-menu>
            </div>
            <div class="column">
              <p class="has-text-weight-semibold mb-3">
                Platform distinctions — {{ currentDistinctionDomainLabel }}
              </p>
              <b-notification type="is-info is-light" :closable="false" class="mb-4">
                These distinctions teach the system what specific advisor phrases mean diagnostically,
                boosting the right templates for each domain. Platform rows apply to all firms.
              </b-notification>
              <b-table
                :data="activeDistinctions"
                :hoverable="true"
                empty-string="No distinctions for this domain"
              >
                <b-table-column v-slot="{ row }" field="description" label="Pattern">
                  {{ row.description }}
                </b-table-column>
                <b-table-column v-slot="{ row }" label="Trigger phrases">
                  <span class="is-size-7 has-text-grey">{{ row.triggers.join(', ') }}</span>
                </b-table-column>
                <b-table-column v-slot="{ row }" label="Templates boosted">
                  <b-tag v-for="t in row.templates" :key="t" class="mr-1" size="is-small">
                    {{ t }}
                  </b-tag>
                </b-table-column>
                <b-table-column v-slot="{ row }" label="Boost" width="70" numeric>
                  +{{ row.boost }}
                </b-table-column>
              </b-table>
            </div>
          </div>
        </b-tab-item>

        <!-- ── Tab 4: Firm Profile ───────────────────────────────────────── -->
        <b-tab-item label="Firm Profile" icon="domain">
          <div class="columns">
            <div class="column is-6">
              <div v-if="loadingProfile" class="has-text-centered py-5">
                <b-loading :is-full-page="false" :active="true" />
              </div>
              <template v-else>
                <b-field label="Firm name">
                  <b-input v-model="profileForm.name" />
                </b-field>
                <b-field label="Logo URL">
                  <b-input v-model="profileForm.logo_url" type="url" placeholder="https://…" />
                </b-field>
                <b-field label="Brand colour (hex)">
                  <b-input v-model="profileForm.primary_colour" placeholder="#000000" maxlength="7" />
                </b-field>
                <b-field
                  label="AI persona name"
                  message="The name your advisors see when using the AI advisor (leave blank to use the default)"
                >
                  <b-input v-model="profileForm.persona_name" placeholder="e.g. Max" />
                </b-field>
                <b-button
                  type="is-primary"
                  :loading="savingProfile"
                  @click="saveProfile"
                >
                  Save profile
                </b-button>
              </template>
            </div>
          </div>
        </b-tab-item>
      </b-tabs>
    </div>
  </section>
</template>

<script>
const BACKEND = 'http://localhost:4000'

const ADVISORY_DISTINCTIONS = require('~/data/advisory-distinctions.json')

const DISTINCTION_DOMAINS = [
  { id: 'conflict', label: 'Conflict & Dispute' },
  { id: 'profit', label: 'Profitability & Feasibility' },
  { id: 'staff', label: 'Staff & Team' },
  { id: 'data-systems', label: 'Data & Financial Systems' },
  { id: 'sales-marketing', label: 'Sales & Marketing' },
  { id: 'forecasting', label: 'Financial Management' },
  { id: 'governance', label: 'Governance & Leadership' },
  { id: 'strategy', label: 'Strategy & Planning' },
  { id: 'systems', label: 'Business Systems' },
  { id: 'valuation', label: 'Business Valuation' },
  { id: 'risk', label: 'Risk Management' },
  { id: 'succession', label: 'Succession & Exit Planning' },
  { id: 'eoy', label: 'End of Year' },
  { id: 'due-diligence', label: 'Due Diligence & Acquisitions' }
]

const DOCUMENT_CATEGORIES = [
  { key: 'logic-tables', label: 'Logic Tables' },
  { key: 'domain-support', label: 'Domain Support' },
  { key: 'templates', label: 'Templates' }
]

const FRAMEWORK_KEYS = [
  { key: 'recommendation-rules', label: 'Recommendation rules' },
  { key: 'domain-weights', label: 'Domain weights' },
  { key: 'capability-tiers', label: 'Capability tiers' },
  { key: 'custom-prompts', label: 'Custom prompts' }
]

export default {
  name: 'FirmManagerHub',

  props: {
    firmId: { type: String, required: true },
    userEmail: { type: String, default: '' },
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      activeTab: 0,

      // Document Library
      documentCategories: DOCUMENT_CATEGORIES,
      selectedCategory: DOCUMENT_CATEGORIES[0].key,
      baseDocs: [],
      firmDocs: [],
      loadingDocs: false,
      uploadFile: null,
      uploading: false,

      // Decision Framework
      frameworkKeys: FRAMEWORK_KEYS,
      selectedFrameworkKey: FRAMEWORK_KEYS[0].key,
      frameworkOverride: null,
      frameworkJson: '',
      frameworkHistory: [],
      loadingFramework: false,
      savingFramework: false,
      showHistoryModal: false,

      // Template import
      templateImport: { hasImport: false, templateCount: 0, history: [] },
      loadingTemplateImport: false,
      templateImportFile: null,
      importingTemplates: false,

      // Videos
      videos: [],
      loadingVideos: false,
      addingVideo: false,
      newVideo: { domain: '', title: '', url: '' },
      domains: [],

      // Firm Profile
      firmProfile: {},
      profileForm: { name: '', logo_url: '', primary_colour: '#000000', persona_name: '' },
      loadingProfile: false,
      savingProfile: false,

      // Storage
      storagePercent: 0,

      // Advisory Distinctions
      distinctionDomains: DISTINCTION_DOMAINS,
      selectedDistinctionDomain: DISTINCTION_DOMAINS[0].id
    }
  },

  computed: {
    activeDistinctions () {
      return (ADVISORY_DISTINCTIONS.platform || []).filter(r => r.domain === this.selectedDistinctionDomain)
    },
    currentDistinctionDomainLabel () {
      const d = DISTINCTION_DOMAINS.find(d => d.id === this.selectedDistinctionDomain)
      return d ? d.label : ''
    }
  },

  mounted () {
    this.loadDocuments()
    this.loadFramework()
    this.loadTemplateImport()
    this.loadVideos()
    this.loadProfile()
    this.loadStorage()
    this.loadDomains()
  },

  methods: {
    // ── Shared fetch helper ─────────────────────────────────────────────────
    async api (method, path, body, isMultipart) {
      const opts = {
        method,
        headers: { Authorization: `Bearer ${this.apiToken}` }
      }
      if (body && !isMultipart) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      if (body && isMultipart) {
        opts.body = body // FormData
      }
      const res = await fetch(`${BACKEND}${path}`, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || res.statusText)
      }
      return res.json()
    },

    // ── Document Library ────────────────────────────────────────────────────
    async loadDocuments () {
      this.loadingDocs = true
      try {
        const data = await this.api('GET',
          `/api/firm-manager/documents?category=${this.selectedCategory}`)
        this.baseDocs = data.base || []
        this.firmDocs = data.firm || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingDocs = false
      }
    },

    selectCategory (key) {
      this.selectedCategory = key
      this.loadDocuments()
    },

    async submitUpload () {
      if (!this.uploadFile) { return }
      this.uploading = true
      try {
        const form = new FormData()
        form.append('file', this.uploadFile)
        form.append('category', this.selectedCategory)
        await this.api('POST', '/api/firm-manager/documents', form, true)
        this.$buefy.toast.open({ message: 'Document uploaded.', type: 'is-success' })
        this.uploadFile = null
        this.loadDocuments()
        this.loadStorage()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.uploading = false
      }
    },

    downloadDoc (row) {
      const url = `${BACKEND}/api/firm-manager/documents/download?fileId=${row.id}&fileName=${encodeURIComponent(row.name)}`
      const a = document.createElement('a')
      a.href = url
      a.setAttribute('download', row.name)
      // The request needs the auth header — for simplicity, open in new tab.
      // TODO: for Advisor-e integration, use a signed URL or server-side redirect instead.
      a.setAttribute('target', '_blank')
      a.click()
    },

    confirmDeleteDoc (row) {
      this.$buefy.dialog.confirm({
        message: `Remove <strong>${row.name}</strong> from your firm's library?`,
        type: 'is-danger',
        confirmText: 'Remove',
        onConfirm: () => this.deleteDoc(row)
      })
    },

    async deleteDoc (row) {
      try {
        await this.api('DELETE', `/api/firm-manager/documents/${row.id}`)
        this.$buefy.toast.open({ message: 'Document removed.', type: 'is-success' })
        this.loadDocuments()
        this.loadStorage()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Decision Framework ──────────────────────────────────────────────────
    async loadFramework () {
      this.loadingFramework = true
      try {
        const data = await this.api('GET',
          `/api/firm-manager/framework?configKey=${this.selectedFrameworkKey}`)
        this.frameworkOverride = data.firmOverride
        this.frameworkJson = data.firmOverride
          ? JSON.stringify(data.firmOverride, null, 2)
          : ''
        const hist = await this.api('GET',
          `/api/firm-manager/framework/history?configKey=${this.selectedFrameworkKey}`)
        this.frameworkHistory = hist.history || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingFramework = false
      }
    },

    selectFrameworkKey (key) {
      this.selectedFrameworkKey = key
      this.loadFramework()
    },

    clearFrameworkEditor () {
      this.frameworkJson = this.frameworkOverride
        ? JSON.stringify(this.frameworkOverride, null, 2)
        : ''
    },

    async saveFramework () {
      let parsed
      try {
        parsed = JSON.parse(this.frameworkJson)
      } catch {
        this.$buefy.toast.open({ message: 'Invalid JSON — please check the syntax.', type: 'is-warning' })
        return
      }
      this.savingFramework = true
      try {
        const res = await this.api('POST', '/api/firm-manager/framework', {
          configKey: this.selectedFrameworkKey,
          configJson: parsed
        })
        this.$buefy.toast.open({ message: `Saved as version ${res.version}.`, type: 'is-success' })
        this.loadFramework()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.savingFramework = false
      }
    },

    async restoreVersion (row) {
      try {
        const res = await this.api('POST', '/api/firm-manager/framework/restore', {
          configKey: this.selectedFrameworkKey,
          versionId: row.id
        })
        this.$buefy.toast.open({ message: `Restored as version ${res.version}.`, type: 'is-success' })
        this.showHistoryModal = false
        this.loadFramework()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Template Library Import ─────────────────────────────────────────────
    async loadTemplateImport () {
      this.loadingTemplateImport = true
      try {
        const data = await this.api('GET', '/api/firm-manager/templates')
        this.templateImport = data
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingTemplateImport = false
      }
    },

    async submitTemplateImport () {
      if (!this.templateImportFile) { return }
      this.importingTemplates = true
      try {
        const form = new FormData()
        form.append('file', this.templateImportFile)
        const res = await this.api('POST', '/api/firm-manager/templates', form, true)
        this.$buefy.toast.open({
          message: `${res.templateCount} templates imported (version ${res.version}).`,
          type: 'is-success'
        })
        this.templateImportFile = null
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.importingTemplates = false
      }
    },

    confirmResetTemplates () {
      this.$buefy.dialog.confirm({
        message: 'Remove your firm\'s template library import and revert to the platform default?',
        type: 'is-danger',
        confirmText: 'Reset to default',
        onConfirm: () => this.resetTemplateImport()
      })
    },

    async resetTemplateImport () {
      try {
        await this.api('DELETE', '/api/firm-manager/templates')
        this.$buefy.toast.open({ message: 'Template library reset to platform default.', type: 'is-success' })
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    async restoreTemplateVersion (row) {
      try {
        const res = await this.api('POST', '/api/firm-manager/framework/restore', {
          configKey: 'templates',
          versionId: row.id
        })
        this.$buefy.toast.open({ message: `Restored as version ${res.version}.`, type: 'is-success' })
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Videos ─────────────────────────────────────────────────────────────
    async loadVideos () {
      this.loadingVideos = true
      try {
        const data = await this.api('GET', '/api/firm-manager/videos')
        this.videos = data.videos || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingVideos = false
      }
    },

    async addVideo () {
      this.addingVideo = true
      try {
        await this.api('POST', '/api/firm-manager/videos', this.newVideo)
        this.$buefy.toast.open({ message: 'Video added.', type: 'is-success' })
        this.newVideo = { domain: '', title: '', url: '' }
        this.loadVideos()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.addingVideo = false
      }
    },

    confirmDeleteVideo (row) {
      this.$buefy.dialog.confirm({
        message: `Remove <strong>${row.title}</strong>?`,
        type: 'is-danger',
        confirmText: 'Remove',
        onConfirm: () => this.deleteVideo(row)
      })
    },

    async deleteVideo (row) {
      try {
        await this.api('DELETE', `/api/firm-manager/videos/${row.id}`)
        this.$buefy.toast.open({ message: 'Video removed.', type: 'is-success' })
        this.loadVideos()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Firm Profile ────────────────────────────────────────────────────────
    async loadProfile () {
      this.loadingProfile = true
      try {
        const data = await this.api('GET', '/api/firm-manager/profile')
        this.firmProfile = data.firm || {}
        this.profileForm = {
          name: data.firm.name || '',
          logo_url: data.firm.logo_url || '',
          primary_colour: data.firm.primary_colour || '#000000',
          persona_name: data.firm.persona_name || ''
        }
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingProfile = false
      }
    },

    async saveProfile () {
      this.savingProfile = true
      try {
        await this.api('PUT', '/api/firm-manager/profile', this.profileForm)
        this.$buefy.toast.open({ message: 'Profile saved.', type: 'is-success' })
        this.loadProfile()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.savingProfile = false
      }
    },

    // ── Storage ─────────────────────────────────────────────────────────────
    async loadStorage () {
      try {
        const data = await this.api('GET', '/api/firm-manager/storage')
        this.storagePercent = data.percentUsed || 0
      } catch { /* non-critical */ }
    },

    // ── Domains (for video tagging) ─────────────────────────────────────────
    async loadDomains () {
      try {
        const res = await fetch('/data/domains.json')
        const data = await res.json()
        this.domains = Array.isArray(data)
          ? data.map(d => d.name || d.key || d)
          : Object.keys(data)
      } catch {
        this.domains = ['Profitability', 'Cash Flow', 'Sales', 'Staff', 'Strategy',
          'Forecasting', 'Systems', 'Risk', 'Governance', 'Succession']
      }
    },

    // ── Helpers ─────────────────────────────────────────────────────────────
    formatDate (iso) {
      return iso ? new Date(iso).toLocaleDateString() : ''
    }
  }
}
</script>

<style scoped>
.firm-manager-hub {
  background: #f5f5f5;
  min-height: 100vh;
}
.is-family-monospace {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}
</style>

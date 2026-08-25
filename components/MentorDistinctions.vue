<template lang="pug">
.mentor-distinctions
  .columns
    //- Domain sidebar
    .column.is-3
      b-menu
        b-menu-list(label="Domain")
          b-menu-item(
            v-for="d in distinctionDomains"
            :key="d.id"
            :label="d.label"
            :active="selectedDistinctionDomain === d.id"
            @click="selectedDistinctionDomain = d.id; closeDistinctionForm()"
          )

    .column
      //- Help button — how distinction matching works (prominent, top-right)
      .has-text-right.mb-4
        b-button(
          type="is-info"
          size="is-medium"
          @click="showDistinctionHelpModal = true"
        ) How this works

      b-modal(v-model="showDistinctionHelpModal" has-modal-card trap-focus)
        .modal-card(style="max-width:600px")
          header.modal-card-head
            p.modal-card-title How to write a distinction
          section.modal-card-body
            p.mb-3 A distinction teaches the system to recommend the templates #[em you] trust when a certain kind of client situation comes up. The system reads what the advisor typed and understands the #[strong meaning] — so you just describe the situation in plain English, and it handles the rest. You don't need to guess every word an advisor might use.
            p.mb-3 Here's what each box does:
            .content
              ul
                li #[strong Domain] — The advisory area this applies to (Conflict, Staff, Strategy, and so on). Pick where this situation belongs.
                li #[strong Description] — Describe the client situation in one plain sentence: what's #[em actually] going on. Aim at the #[strong cause], not just the surface symptom — "the owners aren't aligned on where the business is heading" works far better than "they're arguing." This is the sentence the system reads the advisor's words against, so write it the way you'd explain the situation to a colleague.
                li #[strong Trigger phrases] — A few different ways an advisor might describe this in their own words. These are just examples to point the system in the right direction — #[strong not] exact phrases it has to find. Three to six varied examples is plenty; don't try to list every wording.
                li #[strong Templates to boost] — The templates you want brought forward when this situation appears. Pick the ones you'd reach for yourself.
                li #[strong Boost] — How hard to push those templates up the list when this situation is recognised. Leave it at the default for a gentle nudge; raise it when you want this situation to strongly steer the recommendation.
          footer.modal-card-foot
            b-button(@click="showDistinctionHelpModal = false") Close

      .level.mb-3
        .level-left
          p.has-text-weight-semibold Advisory Distinctions — {{ currentDistinctionDomainLabel }}
        .level-right
          b-button(
            v-if="!showDistinctionForm"
            type="is-primary"
            size="is-small"
            icon-left="plus"
            @click="openDistinctionForm(null)"
          ) Add distinction
      b-notification.mb-3(type="is-info is-light" :closable="false" style="font-size:0.85rem")
        | These are the master Advisory Distinctions. Every firm receives them as defaults, and each firm can then adapt or switch off its own copy. Adding or editing one here changes the default for every firm.

      //- 🔴 ITEM 4.17. Mike opened this tab and saw ONE distinction where the shipped
      //- set is 67 — a stale local dev file was shadowing the committed seed, and
      //- nothing on screen said so. It cost most of a session to diagnose. The rows
      //- that win are unchanged; the screen now says what it is showing. Only ever
      //- visible when a dev file is actually in use, so it is silent in UAT and in
      //- production by construction.
      b-notification.mb-3(
        v-if="servedFromDevFile"
        type="is-warning"
        :closable="false"
        style="font-size:0.85rem"
      )
        strong Showing local development data, not the real platform set.
        |  {{ distinctions.length }} row{{ distinctions.length === 1 ? '' : 's' }} loaded from
        |  #[code data/dev-platform-distinctions.json], and the
        |  #[strong {{ shadowedCount }}] shipped rows are hidden while that file exists.
        |  Delete the file to see the real set.

      .has-text-centered.py-5(v-if="loadingDistinctions")
        b-loading(:is-full-page="false" :active="true")

      b-table.mb-4(
        v-else-if="domainDistinctions.length > 0"
        :data="domainDistinctions"
        :hoverable="true"
        size="is-small"
      )
        b-table-column(v-slot="{ row }" field="description" label="Description") {{ row.description }}
        b-table-column(v-slot="{ row }" label="Trigger phrases")
          span.is-size-7.has-text-grey {{ row.triggers.join(', ') }}
        b-table-column(v-slot="{ row }" label="Templates boosted")
          b-tag.mr-1.mb-1(
            v-for="t in row.templates"
            :key="t"
            size="is-small"
          ) {{ templateChipLabel(t) }}
        b-table-column(v-slot="{ row }" label="Boost" width="60" numeric)
          span +{{ row.boost }}
        b-table-column(v-slot="{ row }" label="" width="170")
          b-button.mr-1.mb-1(size="is-small" @click="openDistinctionForm(row)") Edit
          b-button.mb-1(size="is-small" type="is-danger is-light" @click="confirmDeleteDistinction(row)") Remove

      p.has-text-grey.is-size-7.mb-4(
        v-else-if="!showDistinctionForm"
      ) No distinctions for this domain yet. Add one to boost specific templates when advisors use particular phrases.

      //- Add / Edit form
      .box.distinction-form(v-if="showDistinctionForm")
        p.has-text-weight-semibold.mb-4 {{ editingDistinctionId ? 'Edit distinction' : 'New distinction' }}

        b-field(label="Domain")
          b-select(v-model="distinctionForm.domain" expanded)
            option(v-for="d in distinctionDomains" :key="d.id" :value="d.id") {{ d.label }}

        b-field(label="Description" message="Describe the client situation in a plain sentence — this is what the AI matches the advisor's words against. Capture the cause, not just the symptom.")
          b-input(
            v-model="distinctionForm.description"
            placeholder="e.g. The owners aren't aligned on where the business is heading"
            maxlength="255"
          )

        b-field(label="Trigger phrases" message="Type a phrase and press Enter or comma to add. These are example ways an advisor might describe this — they guide the AI, which matches on meaning, not exact words, so 3–6 varied examples is plenty.")
          b-taginput(
            v-model="distinctionForm.triggers"
            :confirm-key-codes="[13, 188]"
            placeholder="Add a phrase…"
            aria-close-label="Remove phrase"
          )

        b-field(label="Templates to boost")
          .template-picker
            .template-picker-filters
              b-select(v-model="templatePickerSubSection" size="is-small" style="flex:0 0 200px")
                option(value="") All areas
                option(v-for="ss in templateSubSections" :key="ss" :value="ss") {{ ss }}
              b-input(
                v-model="templatePickerSearch"
                size="is-small"
                placeholder="Search by title…"
                icon="magnify"
                style="flex:1"
              )
            .template-picker-list
              //- Revenue-model GROUP targets: boost a whole group rather than one
              //- named model; the engine auto-picks the right one by client industry.
              label.template-picker-opt.template-picker-group(
                v-for="g in templateGroupTargets"
                :key="g.token"
                :class="{ 'is-selected': distinctionForm.templates.includes(g.token) }"
              )
                input(
                  type="checkbox"
                  :value="g.token"
                  :checked="distinctionForm.templates.includes(g.token)"
                  @change="toggleTemplateSelection(g.token)"
                )
                span.template-picker-title {{ g.label }}
                span.template-picker-sub {{ g.hint }}
              label.template-picker-opt(
                v-for="t in filteredTemplateOptions"
                :key="t.title"
                :class="{ 'is-selected': distinctionForm.templates.includes(t.title) }"
              )
                input(
                  type="checkbox"
                  :value="t.title"
                  :checked="distinctionForm.templates.includes(t.title)"
                  @change="toggleTemplateSelection(t.title)"
                )
                span.template-picker-title {{ t.title }}
                span.template-picker-sub {{ t.subSection }}
              p.has-text-grey.is-size-7.p-2(v-if="filteredTemplateOptions.length === 0") No templates match — try clearing the filters.
            .template-picker-selected(v-if="distinctionForm.templates.length > 0")
              span.is-size-7.has-text-grey.mr-2 Selected:
              b-tag.mr-1.mb-1(
                v-for="t in distinctionForm.templates"
                :key="t"
                closable
                type="is-success is-light"
                @close="toggleTemplateSelection(t)"
              ) {{ templateChipLabel(t) }}

        b-field(label="Boost score" message="How many points to add to each matched template's score (1–20). Default 5.")
          b-input(
            v-model.number="distinctionForm.boost"
            type="number"
            min="1"
            max="20"
            style="width:90px"
          )

        .field.is-grouped.mt-4
          b-button(
            type="is-primary"
            :loading="savingDistinction"
            @click="saveDistinction"
          ) {{ editingDistinctionId ? 'Save changes' : 'Add distinction' }}
          b-button(@click="closeDistinctionForm") Cancel
</template>

<script>
import DOMPurify from 'isomorphic-dompurify'

/**
 * MentorDistinctions — the mentor authoring surface for Advisory Distinctions
 * (the cascade ORIGIN, design/DISTINCTIONS-CASCADE-PLAN.md §6). The mentor authors
 * the platform set every firm receives as its default and may then adapt. This is
 * the Firm Manager distinctions screen minus the cascade controls: every row is a
 * mentor row with plain CRUD (Add / Edit / Remove), and the domain is editable
 * (a domain change is just an edit). All writes go to /api/mentor/distinctions,
 * which is role-gated to the mentor on the backend.
 *
 * Self-contained by design (the firm screen is left untouched) — a later refactor
 * may extract the shared add/edit form (ACTIONS.md). The template picker and the
 * 14 domains mirror FirmManagerHub so the two screens stay visually identical.
 */

// The picker offers the Do-the-Job templates a distinction can meaningfully boost.
// Mirrors FirmManagerHub: derived straight from templates.json, excluding the
// revenue-model shelf (represented by the two group targets) and non-advisory
// plumbing/admin shelves.
const PICKER_EXCLUDED_SUBSECTIONS = new Set([
  'Revenue & Feasibility Models',
  'Help', 'Firm Manager Access', 'Risk Advisor Access', 'External Advisors', ''
])
const ALL_CLIENT_TEMPLATES = require('~/data/templates.json')
  .filter(t => t.menuSection === 'do-the-job' && !PICKER_EXCLUDED_SUBSECTIONS.has(t.subSection || ''))
  .map(t => ({ title: t.title, subSection: t.subSection }))
  .sort((a, b) => a.title.localeCompare(b.title))

const TEMPLATE_SUBSECTIONS = [...new Set(ALL_CLIENT_TEMPLATES.map(t => t.subSection))].sort()

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

export default {
  name: 'MentorDistinctions',

  props: {
    apiToken: { type: String, default: null }
  },

  data () {
    return {
      distinctionDomains: DISTINCTION_DOMAINS,
      selectedDistinctionDomain: DISTINCTION_DOMAINS[0].id,
      // The mentor's full platform set (every domain), loaded from the API.
      distinctions: [],
      // Where the rows above came from — 'store', 'seed' or 'dev-file' (item 4.17).
      distinctionSource: null,
      shadowedCount: 0,
      loadingDistinctions: false,
      showDistinctionForm: false,
      showDistinctionHelpModal: false,
      editingDistinctionId: null,
      distinctionForm: { domain: '', description: '', triggers: [], templates: [], boost: 5 },
      savingDistinction: false,
      templatePickerSearch: '',
      // Default the picker to a single area so it opens on a short, focused list.
      templatePickerSubSection: 'General Tools',
      // Revenue-model GROUP targets — boost a whole group; the engine auto-matches
      // the specific model to the client's industry. Mirrors FirmManagerHub.
      templateGroupTargets: [
        { token: '@rf-industry', label: 'Revenue & Feasibility Model — Industry (auto-matched)', hint: 'Engine picks the model matching the client\'s industry' },
        { token: '@rf-general', label: 'Revenue & Feasibility Model — General', hint: 'Generic feasibility/concept tools (Break-Even, EBITDA…)' }
      ],
      allClientTemplates: ALL_CLIENT_TEMPLATES,
      templateSubSections: TEMPLATE_SUBSECTIONS
    }
  },

  computed: {
    /**
     * Is this screen being served from the gitignored local dev file rather than the
     * store or the committed seed? Item 4.17 — the condition the warning above tests.
     * @returns {boolean}
     */
    servedFromDevFile () {
      return this.distinctionSource === 'dev-file'
    },

    currentDistinctionDomainLabel () {
      const d = DISTINCTION_DOMAINS.find(d => d.id === this.selectedDistinctionDomain)
      return d ? d.label : ''
    },
    // The mentor's rows for the selected domain (plain list — no cascade kinds).
    domainDistinctions () {
      const dom = this.selectedDistinctionDomain
      return this.distinctions.filter(r => r.domain === dom)
    },
    filteredTemplateOptions () {
      let list = this.allClientTemplates
      if (this.templatePickerSubSection) {
        list = list.filter(t => t.subSection === this.templatePickerSubSection)
      }
      if (this.templatePickerSearch) {
        const q = this.templatePickerSearch.toLowerCase()
        list = list.filter(t => t.title.toLowerCase().includes(q))
      }
      return list
    }
  },

  mounted () {
    this.loadDistinctions()
  },

  methods: {
    /** Shared fetch helper — Bearer token + JSON body (mirrors FirmManagerHub.api). */
    async api (method, path, body) {
      const opts = {
        method,
        headers: { Authorization: `Bearer ${this.apiToken}` }
      }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(`${path}`, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    },

    async loadDistinctions () {
      this.loadingDistinctions = true
      try {
        const data = await this.api('GET', '/api/mentor/distinctions')
        this.distinctions = data.distinctions || []
        this.distinctionSource = data.source || null
        this.shadowedCount = data.shadowed || 0
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingDistinctions = false
      }
    },

    openDistinctionForm (row) {
      if (row) {
        this.editingDistinctionId = row.id
        this.distinctionForm = {
          domain: row.domain,
          description: row.description,
          triggers: [...row.triggers],
          templates: [...row.templates],
          boost: row.boost
        }
      } else {
        this.editingDistinctionId = null
        this.distinctionForm = {
          domain: this.selectedDistinctionDomain,
          description: '',
          triggers: [],
          templates: [],
          boost: 5
        }
      }
      this.templatePickerSearch = ''
      this.templatePickerSubSection = 'General Tools'
      this.showDistinctionForm = true
    },

    closeDistinctionForm () {
      this.showDistinctionForm = false
      this.editingDistinctionId = null
      this.distinctionForm = { domain: '', description: '', triggers: [], templates: [], boost: 5 }
      this.templatePickerSearch = ''
      this.templatePickerSubSection = 'General Tools'
    },

    toggleTemplateSelection (title) {
      const idx = this.distinctionForm.templates.indexOf(title)
      if (idx === -1) {
        this.distinctionForm.templates.push(title)
      } else {
        this.distinctionForm.templates.splice(idx, 1)
      }
    },

    // Friendly label for a target chip — a group token shows its label, an ordinary
    // template shows its title.
    templateChipLabel (value) {
      const group = this.templateGroupTargets.find(g => g.token === value)
      return group ? group.label : value
    },

    async saveDistinction () {
      if (!this.distinctionForm.domain) {
        this.$buefy.toast.open({ message: 'Please select a domain.', type: 'is-warning' })
        return
      }
      if (!this.distinctionForm.description.trim()) {
        this.$buefy.toast.open({ message: 'Description is required.', type: 'is-warning' })
        return
      }
      if (this.distinctionForm.triggers.length === 0) {
        this.$buefy.toast.open({ message: 'Add at least one trigger phrase.', type: 'is-warning' })
        return
      }
      if (this.distinctionForm.templates.length === 0) {
        this.$buefy.toast.open({ message: 'Select at least one template to boost.', type: 'is-warning' })
        return
      }

      this.savingDistinction = true
      try {
        if (this.editingDistinctionId) {
          await this.api('PUT', `/api/mentor/distinctions/${this.editingDistinctionId}`, this.distinctionForm)
          this.$buefy.toast.open({ message: 'Distinction updated.', type: 'is-success' })
        } else {
          await this.api('POST', '/api/mentor/distinctions', this.distinctionForm)
          this.$buefy.toast.open({ message: 'Distinction added.', type: 'is-success' })
        }
        this.closeDistinctionForm()
        this.loadDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.savingDistinction = false
      }
    },

    confirmDeleteDistinction (row) {
      this.$buefy.dialog.confirm({
        title: 'Remove distinction',
        message: DOMPurify.sanitize(`Remove "<strong>${row.description}</strong>"? It will no longer be a default for any firm.`, { USE_PROFILES: { html: true } }),
        confirmText: 'Remove',
        type: 'is-danger',
        hasIcon: true,
        onConfirm: () => this.deleteDistinction(row.id)
      })
    },

    async deleteDistinction (id) {
      try {
        await this.api('DELETE', `/api/mentor/distinctions/${id}`)
        this.$buefy.toast.open({ message: 'Distinction removed.', type: 'is-success' })
        this.loadDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    }
  }
}
</script>

<style scoped>
.mentor-distinctions {
  min-height: 100vh;
}

/* Template picker — mirrors the Firm Manager screen so the two read identically. */
.template-picker {
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  overflow: hidden;
}
.template-picker-filters {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-bottom: 1px solid #ededed;
}
.template-picker-list {
  max-height: 280px;
  overflow-y: auto;
}
.template-picker-opt {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f4f4f4;
}
.template-picker-opt:hover {
  background: #f8faff;
}
.template-picker-opt.is-selected {
  background: #eefbf4;
}
.template-picker-group {
  background: #fcfaff;
}
.template-picker-title {
  font-size: 0.85rem;
  font-weight: 500;
}
.template-picker-sub {
  font-size: 0.7rem;
  color: #999;
  margin-left: auto;
  white-space: nowrap;
}
.template-picker-selected {
  padding: 8px 10px;
  border-top: 1px solid #ededed;
  background: #fafafa;
}
</style>

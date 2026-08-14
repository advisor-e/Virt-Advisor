<template lang="pug">
section.firm-domain-support
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmDomainSupport.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search, and the control that hides the domain list to give the
  //- table the full width. It sits here, beside the search, so it is reachable
  //- whether or not a domain is open — hiding the list can never strand the
  //- editor on a screen with no way back to it.
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmDomainSupport.searchPlaceholder')"
          :aria-label="$t('firmDomainSupport.searchPlaceholder')"
        )
    .level-right
      button.button.is-small.ds-railtoggle(
        type="button"
        :aria-expanded="String(!railHidden)"
        @click="toggleRail"
      ) {{ railHidden ? $t('firmDomainSupport.showList') : $t('firmDomainSupport.hideList') }}

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: the three master-section groups. Each row can be dragged into
    //- another group (mouse), or re-filed via its "Move to" menu (keyboard /
    //- touch). Re-filing is firm-only and display-only — the AI is unaffected.
    .column.is-4(v-if="!railHidden")
      nav.ds-rail(:aria-label="$t('firmDomainSupport.railLabel')")
        .ds-rail-empty(v-if="!groups.length")
          span.has-text-grey.is-size-7 {{ query ? $t('firmDomainSupport.noMatchHere') : $t('firmDomainSupport.emptyLibrary') }}

        .ds-rail-group(
          v-for="group in groups"
          :key="group.key"
          :class="{ 'is-drop-target': dragId && dropKey === group.key }"
          @dragover.prevent="dropKey = group.key"
          @drop.prevent="onDrop(group.key)"
        )
          h3.ds-rail-heading {{ group.heading }}
          .ds-rail-row(
            v-for="item in group.items"
            :key="item.id"
            :class="{ 'is-current': current && current.id === item.id, 'is-dragging': dragId === item.id }"
            draggable="true"
            @dragstart="onDragStart(item.id, $event)"
            @dragend="onDragEnd"
          )
            button.ds-rail-select(type="button" @click="select(item)")
              span.ds-rail-name(:class="{ 'is-empty': !item.count }") {{ item.label }}
              b-tag(v-if="item.count" :type="item.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small" rounded) {{ item.count }}
              span.ds-rail-notset(v-else) {{ $t('firmDomainSupport.notSetUp') }}
            b-dropdown.ds-rail-move(aria-role="menu" position="is-bottom-left" :mobile-modal="false")
              template(#trigger)
                button.ds-rail-movebtn(type="button" :aria-label="$t('firmDomainSupport.moveTo')") ⋯
              b-dropdown-item(custom aria-role="menuitem")
                span.ds-move-head {{ $t('firmDomainSupport.moveTo') }}
              b-dropdown-item(
                v-for="opt in sectionOptions"
                :key="opt.key"
                aria-role="menuitem"
                :disabled="opt.key === group.key"
                @click="moveTo(item.id, opt.key)"
              ) {{ opt.label }}

    //- ── Panel: the selected domain's four-column material table ─────────
    //- Takes the whole row once the list is hidden, which is the point of it.
    .column(:class="railHidden ? 'is-12' : 'is-8'")
      //- Nothing picked yet.
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmDomainSupport.pickPrompt') }}
        p.has-text-grey.is-size-7 {{ $t('firmDomainSupport.pickHint') }}

      div(v-else)
        .box
          //- Header — domain identity + the origin legend.
          .level.mb-3.is-align-items-flex-start
            .level-left
              div
                p.title.is-5.mb-1 {{ current.label }}
                b-tag(:type="current.origin === 'firm' ? 'is-warning is-light' : 'is-light'")
                  | {{ current.origin === 'firm' ? $t('firmDomainSupport.originFirm') : $t('firmDomainSupport.originPlatform') }}
            .level-right
              .ds-legend
                span.ds-legend-item
                  span.ds-dot.is-platform
                  | {{ $t('firmDomainSupport.legendPlatform') }}
                span.ds-legend-item
                  span.ds-dot.is-firm
                  | {{ $t('firmDomainSupport.legendFirm') }}

          //- A domain still on the old shape has no four-column material to show.
          b-message.mb-0(
            v-if="!hasMaterials"
            type="is-warning"
            has-icon
            :closable="false"
          ) {{ $t('firmDomainSupport.notMigrated') }}

          //- The four-column editable table.
          .table-scroll(v-else)
            table.ds-table
              colgroup
                col.c-name
                col.c-summary
                col.c-who
                col.c-steps
              thead
                tr
                  th(scope="col") {{ $t('firmDomainSupport.colName') }}
                  th(scope="col") {{ $t('firmDomainSupport.colSummary') }}
                  th(scope="col") {{ $t('firmDomainSupport.colWho') }}
                  th(scope="col") {{ $t('firmDomainSupport.colSteps') }}
              tbody
                tr(v-for="(material, mIndex) in form.materials" :key="mIndex")
                  td
                    b-input.name-input(
                      v-model="material.name"
                      v-autogrow
                      type="textarea"
                      rows="1"
                      :aria-label="$t('firmDomainSupport.colName')"
                    )
                    b-tag.mt-2(:type="material.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small")
                      | {{ material.origin === 'firm' ? $t('firmDomainSupport.tagFirm') : $t('firmDomainSupport.tagPlatform') }}
                  td
                    b-input(
                      v-model="material.summary"
                      v-resize-persist="'ds:' + current.id + ':summary:' + mIndex"
                      type="textarea"
                      rows="6"
                      :aria-label="$t('firmDomainSupport.colSummary')"
                    )
                  td
                    b-input(
                      v-model="material.who_when"
                      v-resize-persist="'ds:' + current.id + ':who:' + mIndex"
                      type="textarea"
                      rows="4"
                      :aria-label="$t('firmDomainSupport.colWho')"
                    )
                  td
                    ol.ds-steps
                      li(v-for="(step, sIndex) in material.steps" :key="sIndex")
                        b-input(
                          v-model="material.steps[sIndex]"
                          v-autogrow
                          type="textarea"
                          rows="1"
                          :aria-label="$t('firmDomainSupport.stepLabel', { n: sIndex + 1 })"
                        )
                        .ds-step-tools
                          button.ds-step-move(
                            type="button"
                            :disabled="sIndex === 0"
                            :aria-label="$t('firmDomainSupport.moveStepUp')"
                            @click="moveStep(material, sIndex, -1)"
                          ) ↑
                          button.ds-step-move(
                            type="button"
                            :disabled="sIndex === material.steps.length - 1"
                            :aria-label="$t('firmDomainSupport.moveStepDown')"
                            @click="moveStep(material, sIndex, 1)"
                          ) ↓
                          button.ds-step-remove(
                            type="button"
                            :aria-label="$t('firmDomainSupport.removeStep')"
                            @click="removeStep(material, sIndex)"
                          ) ×
                    button.ds-step-add(type="button" @click="addStep(material)")
                      | {{ $t('firmDomainSupport.addStep') }}

          //- Action bar. Save lights up once the table is edited; Reset removes
          //- the firm's saved override and returns to the platform default.
          .ds-actionbar(v-if="hasMaterials")
            b-button(type="is-light" @click="addMaterial") {{ $t('firmDomainSupport.addMaterial') }}
            b-button(
              type="is-text"
              :disabled="!canReset || saving"
              @click="confirmReset"
            ) {{ $t('firmDomainSupport.reset') }}
            span.ds-spacer
            b-button(
              type="is-primary"
              :loading="saving"
              :disabled="!dirty || saving"
              @click="save"
            ) {{ $t('firmDomainSupport.save') }}

        //- ── Version history (read-only, mirrors FirmQuizzes) ─────────────
        .box(v-if="hasMaterials")
          p.title.is-6 {{ $t('firmDomainSupport.historyHeading') }}
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
import { autogrow, resizePersist } from '~/utils/textareaDirectives'

/** Where this browser remembers whether the domain list is hidden. */
const RAIL_STATE_KEY = 'ds:railHidden'

/**
 * Firm Domain Support (FIRM-EDITABLE-TABLES-PLAN.md Phase 2) — the firm's
 * no-code view of the four-column domain-support material the advisors' AI
 * draws on (Template name · Summary · Who & when · Step-by-step, §0.5).
 *
 * Lives in its own file rather than inside FirmManagerHub.vue (over the
 * decompose rule, CB-23) — the Hub renders it as one tab, exactly like
 * FirmQuizzes and FirmDocuments.
 *
 * This pass is a LIVE PREVIEW read pass, mirroring how FirmQuizzes shipped:
 * browse the domains, open one, and edit its table ON SCREEN — but nothing is
 * persisted. Save and Reset are deliberately inert (see the previewNotice
 * banner). Persisting a firm's edits, and the prompt-fencing that firm-authored
 * text needs before it reaches the AI (plan §5), land together in the next
 * slice so that surface is never live before its safeguard.
 *
 * Only EOY is migrated to the four-column `materials` shape so far; a domain
 * still on the legacy `support_tools` shape shows an honest "not yet in the
 * four-column format" notice rather than an empty or mismatched grid.
 *
 * The rail is a simple two-group list (advisory domains / get-the-job
 * material) per the approved mockup — not the shared FirmRail accordion, which
 * models a two-source (platform/firm) split this screen does not have.
 */
export default {
  name: 'FirmDomainSupport',

  directives: { autogrow, resizePersist },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      /** List-route payload, split by master section — each row {id,label,count,origin}. */
      doTheJob: [],
      getTheJob: [],
      getOrganised: [],
      query: '',
      /** The domain on screen: {id, label, origin} plus its merged detail. */
      current: null,
      /** A deep, editable copy of the current domain's materials. */
      form: { materials: [] },
      /** Cleaned baseline of the loaded materials, JSON — drives `dirty`. */
      original: null,
      saving: false,
      history: [],
      /** Rail re-filing drag state (display-only): the id being dragged and the
       *  group currently hovered as a drop target. */
      dragId: null,
      dropKey: null,
      /** Domain list collapsed, giving the table the full width. A personal
       *  display preference like the drag-to-size box heights — remembered in
       *  this browser only, never in the firm's saved content. Restored in
       *  mounted(), never here: localStorage does not exist during SSR. */
      railHidden: false
    }
  },

  computed: {
    /**
     * The rail: the three master-section groups (Do the Job / Get the Job / Get
     * Organised), each a flat list filtered by the search box. An empty group is
     * dropped so the rail never shows a heading over nothing.
     */
    groups () {
      const q = this.query.trim().toLowerCase()
      const match = list => (list || [])
        .filter(d => !q || String(d.label || '').toLowerCase().includes(q))
        .map(d => ({ id: d.id, label: d.label, count: d.count, origin: d.origin }))

      return [
        { key: 'doTheJob', heading: this.$t('firmDomainSupport.groupDoTheJob'), list: this.doTheJob },
        { key: 'getTheJob', heading: this.$t('firmDomainSupport.groupGetTheJob'), list: this.getTheJob },
        { key: 'getOrganised', heading: this.$t('firmDomainSupport.groupGetOrganised'), list: this.getOrganised }
      ]
        .map(g => ({ key: g.key, heading: g.heading, items: match(g.list) }))
        .filter(g => g.items.length)
    },

    /** True when the open domain has four-column material to edit. */
    hasMaterials () {
      return Array.isArray(this.form.materials) && this.form.materials.length > 0
    },

    /** True once the on-screen table differs from what was loaded. */
    dirty () {
      if (this.original === null) { return false }
      return JSON.stringify(this.cleanMaterials(this.form.materials)) !== this.original
    },

    /** Reset is meaningful only when the firm actually has a saved override. */
    canReset () {
      return !!(this.current && this.current.origin === 'firm')
    },

    /** The three section drop targets, for the "Move to" menu. */
    sectionOptions () {
      return [
        { key: 'doTheJob', label: this.$t('firmDomainSupport.groupDoTheJob') },
        { key: 'getTheJob', label: this.$t('firmDomainSupport.groupGetTheJob') },
        { key: 'getOrganised', label: this.$t('firmDomainSupport.groupGetOrganised') }
      ]
    }
  },

  mounted () {
    this.restoreRailState()
    this.load()
  },

  methods: {
    /**
     * Restore the collapsed/expanded state of the domain list from this
     * browser. Client-only and failure-tolerant: private browsing or blocked
     * storage simply leaves the list showing, which is the safe default.
     */
    restoreRailState () {
      if (typeof window === 'undefined') { return }
      try {
        this.railHidden = window.localStorage.getItem(RAIL_STATE_KEY) === '1'
      } catch (e) { /* storage blocked — keep the list showing */ }
    },

    /** Hide or show the domain list, remembering the choice for next time. */
    toggleRail () {
      this.railHidden = !this.railHidden
      if (typeof window === 'undefined') { return }
      try {
        window.localStorage.setItem(RAIL_STATE_KEY, this.railHidden ? '1' : '0')
      } catch (e) { /* storage blocked — the toggle still works this session */ }
    },

    /**
     * GET the domain list. The count each row carries comes straight from the
     * list route; a domain on the new `materials` shape currently reports 0
     * there until the list route is taught to count it (the deferred count
     * fix) — a cosmetic rail number only, not the table below.
     */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/domain-support')
        this.doTheJob = (data.doTheJob || []).map(this.normaliseListRow)
        this.getTheJob = (data.getTheJob || []).map(this.normaliseListRow)
        this.getOrganised = (data.getOrganised || []).map(this.normaliseListRow)
      } catch (err) {
        this.error = this.$t('firmDomainSupport.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * The list route names its count `supportTools`; give the rail a stable
     * `count` field so a later rename on the backend does not ripple here.
     * @param {{id:string,label:string,supportTools:number,origin:string}} row
     * @returns {{id:string,label:string,count:number,origin:string}}
     */
    normaliseListRow (row) {
      return {
        id: row.id,
        label: row.label,
        count: typeof row.supportTools === 'number' ? row.supportTools : 0,
        origin: row.origin || 'platform'
      }
    },

    /**
     * Open a domain: fetch its merged detail and take an editable local copy of
     * its materials. Editing that copy changes nothing on the server in this
     * pass. @param {{id:string,label:string,origin:string}} item rail row
     */
    async select (item) {
      this.current = { id: item.id, label: item.label, origin: item.origin }
      this.form = { materials: [] }
      this.original = null
      this.history = []
      try {
        const detail = await this.api('GET', `/api/firm-manager/domain-support/${encodeURIComponent(item.id)}`)
        this.applyDetail(detail, item.origin)
        await this.loadHistory(item)
      } catch (err) {
        this.error = this.$t('firmDomainSupport.detailFailed')
      }
    },

    /**
     * Take an editable local copy of a fetched detail and record the dirty
     * baseline. Every material carries the domain's origin: arrays merge
     * wholesale, so a domain with a firm override has firm-authored materials
     * throughout, and one without is all platform.
     * @param {{materials?: Array}} detail - the merged domain-support detail
     * @param {string} origin - 'firm' or 'platform' for this domain
     */
    applyDetail (detail, origin) {
      const materials = Array.isArray(detail.materials) ? detail.materials : []
      const rowOrigin = origin === 'firm' ? 'firm' : 'platform'
      this.form = {
        materials: materials.map(m => ({
          name: m.name || '',
          summary: m.summary || '',
          who_when: m.who_when || '',
          steps: Array.isArray(m.steps) ? m.steps.slice() : [],
          origin: rowOrigin
        }))
      }
      this.original = JSON.stringify(this.cleanMaterials(this.form.materials))
    },

    /**
     * The materials as they will be saved: the on-screen-only `origin` field
     * dropped, text trimmed, and blank steps removed. Also the comparison shape
     * for `dirty`, so a pure-whitespace change never counts as an edit.
     * @param {Array<Object>} materials
     * @returns {Array<{name,summary,who_when,steps:string[]}>}
     */
    cleanMaterials (materials) {
      return (materials || []).map(m => ({
        name: (m.name || '').trim(),
        summary: (m.summary || '').trim(),
        who_when: (m.who_when || '').trim(),
        steps: (m.steps || []).map(s => (s || '').trim()).filter(Boolean)
      }))
    },

    /**
     * Save the firm's version of this domain's materials. Posts a sparse
     * override ({ materials }) — deepMerge on the backend replaces the array
     * wholesale and leaves the platform overview/keywords intact. On success
     * the domain becomes firm-authored, so the rail tag, panel tags and version
     * history all refresh.
     */
    async save () {
      if (!this.current || !this.dirty || this.saving) { return }
      this.saving = true
      try {
        const id = this.current.id
        await this.api('POST', `/api/firm-manager/domain-support/${encodeURIComponent(id)}`, {
          materials: this.cleanMaterials(this.form.materials)
        })
        this.$buefy.toast.open({ message: this.$t('firmDomainSupport.saved'), type: 'is-success' })
        this.current.origin = 'firm'
        // Re-fetch so the panel shows exactly what was stored (blank steps
        // dropped, etc.) and the baseline matches it.
        const detail = await this.api('GET', `/api/firm-manager/domain-support/${encodeURIComponent(id)}`)
        this.applyDetail(detail, 'firm')
        await this.loadHistory(this.current)
        this.markListOrigin(id, 'firm')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /** Confirm before discarding the firm's saved edits for this domain. */
    confirmReset () {
      if (!this.canReset) { return }
      this.$buefy.dialog.confirm({
        message: this.$t('firmDomainSupport.resetConfirm', { name: this.current.label }),
        type: 'is-warning',
        confirmText: this.$t('firmDomainSupport.reset'),
        onConfirm: () => this.reset()
      })
    },

    /** Remove the firm override and return the panel to the platform default. */
    async reset () {
      if (!this.current || this.saving) { return }
      this.saving = true
      try {
        const id = this.current.id
        await this.api('DELETE', `/api/firm-manager/domain-support/${encodeURIComponent(id)}`)
        this.$buefy.toast.open({ message: this.$t('firmDomainSupport.wasReset'), type: 'is-success' })
        this.current.origin = 'platform'
        const detail = await this.api('GET', `/api/firm-manager/domain-support/${encodeURIComponent(id)}`)
        this.applyDetail(detail, 'platform')
        this.history = []
        this.markListOrigin(id, 'platform')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /**
     * Keep the rail row's origin tag in step with a save/reset without a full
     * reload. @param {string} id domain id @param {string} origin new origin
     */
    markListOrigin (id, origin) {
      const row = this.doTheJob.find(d => d.id === id) ||
        this.getTheJob.find(d => d.id === id) ||
        this.getOrganised.find(d => d.id === id)
      if (row) { row.origin = origin }
    },

    /**
     * Saved versions of this domain's overlay. A domain a firm has never edited
     * has no history, which is the normal starting state, not an error.
     * @param {{id:string,origin:string}} item
     */
    async loadHistory (item) {
      if (item.origin !== 'firm') { this.history = []; return }
      try {
        const data = await this.api('GET', `/api/firm-manager/domain-support/${encodeURIComponent(item.id)}/history`)
        this.history = Array.isArray(data.history) ? data.history : []
      } catch (err) {
        this.history = []
      }
    },

    /** Add a blank step to a material (on-screen only this pass). */
    addStep (material) {
      material.steps.push('')
    },

    /** Remove a step from a material (on-screen only this pass). */
    removeStep (material, index) {
      material.steps.splice(index, 1)
    },

    /**
     * Move one step up or down within its own material (on-screen only this
     * pass — Save persists it like any other edit).
     *
     * Splice rather than index assignment: Vue 2 cannot observe
     * `arr[i] = x`, so a straight swap would reorder the data without
     * redrawing the list. Out-of-range moves are ignored so the first and
     * last steps are safe even if the disabled buttons are bypassed.
     *
     * @param {{steps: string[]}} material - the material being reordered
     * @param {number} index - the step's current position
     * @param {number} delta - -1 to move up, +1 to move down
     */
    moveStep (material, index, delta) {
      const target = index + delta
      if (target < 0 || target >= material.steps.length) { return }
      const [moved] = material.steps.splice(index, 1)
      material.steps.splice(target, 0, moved)
    },

    /** Add a blank material row (on-screen only this pass). */
    addMaterial () {
      this.form.materials.push({ name: '', summary: '', who_when: '', steps: [''], origin: 'firm' })
    },

    formatDate (value) {
      if (!value) { return '' }
      const d = new Date(value)
      return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    },

    /** Which section array currently holds an item id, or null. */
    sectionKeyOf (id) {
      for (const k of ['doTheJob', 'getTheJob', 'getOrganised']) {
        if (this[k].some(d => d.id === id)) { return k }
      }
      return null
    },

    onDragStart (id, ev) {
      this.dragId = id
      if (ev && ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move'
        ev.dataTransfer.setData('text/plain', id)
      }
    },

    onDragEnd () { this.dragId = null; this.dropKey = null },

    onDrop (toKey) {
      const id = this.dragId
      this.dragId = null
      this.dropKey = null
      if (id) { this.moveTo(id, toKey) }
    },

    /**
     * Re-file a domain into another master section for this firm — display-only,
     * the AI is unaffected (owner ruling 2026-07-27). Optimistically re-buckets
     * the rail, then persists; a failed save reverts. Moving to the section it
     * already sits in is a no-op. Both the drag and the "Move to" menu funnel
     * here. @param {string} id item id @param {string} toKey target section key
     */
    async moveTo (id, toKey) {
      const fromKey = this.sectionKeyOf(id)
      if (!fromKey || fromKey === toKey) { return }
      const from = this[fromKey]
      const idx = from.findIndex(d => d.id === id)
      if (idx < 0) { return }
      const [row] = from.splice(idx, 1)
      this[toKey].push(row)
      try {
        await this.api('POST', `/api/firm-manager/domain-support/${encodeURIComponent(id)}/section`, { section: toKey })
      } catch (err) {
        // Revert the optimistic move so the rail never lies about what was saved.
        const back = this[toKey].indexOf(row)
        if (back > -1) { this[toKey].splice(back, 1) }
        from.splice(idx, 0, row)
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmQuizzes' helper so this tab can be
     * mounted and tested on its own; the backend re-checks authorisation on
     * every call regardless of what the browser sends.
     *
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
/* Rail — a simple two-group list (the mockup shape), not the FirmRail
   accordion. Kept local because there is no second consumer to share it. */
.ds-rail {
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
  max-height: 70vh;
  overflow-y: auto;
}
.ds-rail-group { margin-bottom: 1rem; }
.ds-rail-heading {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-weight: 700;
  color: #8a94a3;
  margin: 0 0 0.35rem;
  padding: 0.3rem 0.4rem;
}
.ds-rail-row {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  border-left: 3px solid transparent;
  border-radius: 4px;
}
.ds-rail-row:hover { background: #f5f7fa; }
.ds-rail-row.is-current { background: #eaf1fb; border-left-color: #002b64; }
.ds-rail-row.is-current .ds-rail-name { font-weight: 600; }
.ds-rail-row.is-dragging { opacity: 0.5; }
.ds-rail-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  cursor: grab;
  text-align: left;
  padding: 0.45rem 0.5rem;
  font: inherit;
}
.ds-rail-name { flex: 1; min-width: 0; }
.ds-rail-name.is-empty { color: #9aa4b2; }
.ds-rail-notset {
  flex: 0 0 auto;
  font-size: 0.66rem;
  font-style: italic;
  color: #aeb6c2;
  white-space: nowrap;
}
.ds-rail-move { flex: 0 0 auto; }
.ds-rail-movebtn {
  background: none;
  border: 0;
  cursor: pointer;
  color: #8a94a3;
  font-size: 1.05rem;
  line-height: 1;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}
.ds-rail-movebtn:hover { background: #e8edf4; color: #002b64; }
.ds-rail-group.is-drop-target {
  background: #eef5ff;
  outline: 2px dashed #9fc0ec;
  outline-offset: -2px;
  border-radius: 6px;
}
.ds-move-head {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a94a3;
  font-weight: 700;
}
.ds-rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }

/* Origin legend in the panel header. */
.ds-legend { display: flex; gap: 0.9rem; font-size: 0.75rem; color: #8a94a3; }
.ds-legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
.ds-dot { display: inline-block; width: 0.62rem; height: 0.62rem; border-radius: 3px; }
.ds-dot.is-platform { background: #c7ceda; }
.ds-dot.is-firm { background: #e0b24e; }

/* The four-column table. Scrolls inside its own container so the page body
   never scrolls sideways. */
.table-scroll { overflow-x: auto; }
.ds-table { border-collapse: collapse; width: 100%; min-width: 60rem; }
.ds-table thead th {
  background: #f4f6f9;
  text-align: left;
  vertical-align: bottom;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #002b64;
  padding: 0.7rem 0.6rem;
  border-bottom: 1px solid #d5dbe4;
}
.ds-table tbody td {
  vertical-align: top;
  padding: 0.6rem;
  border-bottom: 1px solid #eef1f5;
}
.ds-table colgroup .c-name { width: 20%; }
.ds-table colgroup .c-summary { width: 30%; }
.ds-table colgroup .c-who { width: 18%; }
.ds-table colgroup .c-steps { width: 32%; }
.name-input >>> textarea { font-weight: 600; resize: none; }

/* Steps — a numbered list of editable lines. */
.ds-steps { list-style: none; margin: 0; padding: 0; counter-reset: s; }
.ds-steps li {
  counter-increment: s;
  display: grid;
  grid-template-columns: 1.4rem 1fr auto;
  /* Top-aligned, not centred: a step box now grows with its text, and a
     centred number would drift down the side of a long step. */
  align-items: start;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
}
.ds-steps li::before {
  content: counter(s);
  margin-top: 0.35rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #002b64;
  color: #fff;
  font-size: 0.66rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Per-step controls: reorder up, reorder down, remove. */
.ds-step-tools {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  padding-top: 0.25rem;
}
.ds-step-move {
  border: 0;
  background: none;
  color: #7a869a;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0 0.2rem;
}
.ds-step-move:hover:not(:disabled) { color: #002b64; }
.ds-step-move:disabled { color: #dde2e9; cursor: default; }
.ds-step-remove {
  border: 0;
  background: none;
  color: #b5b5b5;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0.3rem;
}
.ds-step-remove:hover { color: #cc0f35; }
/* Steps grow with their content; the drag handle would fight the autogrow. */
.ds-steps >>> textarea { resize: none; }
.ds-step-add {
  font-size: 0.8rem;
  color: #002b64;
  background: none;
  border: 1px dashed #d5dbe4;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  margin-top: 0.2rem;
  cursor: pointer;
}
.ds-step-add:hover { background: #f5f7fa; }

/* Action bar. */
.ds-actionbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.9rem;
  margin-top: 0.6rem;
  border-top: 1px solid #eef1f5;
}
.ds-spacer { flex: 1; }
</style>

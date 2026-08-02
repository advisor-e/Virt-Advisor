<template lang="pug">
section.firm-logic-tables
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmLogicTables.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search, and the control that hides the table list to give the
  //- branch grid the full width. It sits here, beside the search, so it is
  //- reachable whether or not a table is open — hiding the list can never
  //- strand the editor on a screen with no way back to it.
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmLogicTables.searchPlaceholder')"
          :aria-label="$t('firmLogicTables.searchPlaceholder')"
        )
    .level-right
      button.button.is-small.lt-railtoggle(
        type="button"
        :aria-expanded="String(!railHidden)"
        @click="toggleRail"
      ) {{ railHidden ? $t('firmLogicTables.showList') : $t('firmLogicTables.hideList') }}

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: the three master-section groups. Each row can be dragged into
    //- another group (mouse), or re-filed via its "Move to" menu (keyboard /
    //- touch). Re-filing is firm-only and display-only — the AI is unaffected.
    .column.is-4(v-if="!railHidden")
      nav.lt-rail(:aria-label="$t('firmLogicTables.railLabel')")
        .lt-rail-empty(v-if="!groups.length")
          span.has-text-grey.is-size-7 {{ query ? $t('firmLogicTables.noMatchHere') : $t('firmLogicTables.emptyLibrary') }}

        .lt-rail-group(
          v-for="group in groups"
          :key="group.key"
          :class="{ 'is-drop-target': dragId && dropKey === group.key }"
          @dragover.prevent="dropKey = group.key"
          @drop.prevent="onDrop(group.key)"
        )
          h3.lt-rail-heading {{ group.heading }}
          .lt-rail-row(
            v-for="item in group.items"
            :key="item.id"
            :class="{ 'is-current': current && current.id === item.id, 'is-dragging': dragId === item.id }"
            draggable="true"
            @dragstart="onDragStart(item.id, $event)"
            @dragend="onDragEnd"
          )
            button.lt-rail-select(type="button" @click="select(item)")
              span.lt-rail-name {{ item.label }}
              b-tag(:type="item.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small" rounded) {{ item.count }}
            b-dropdown.lt-rail-move(aria-role="menu" position="is-bottom-left" :mobile-modal="false")
              template(#trigger)
                button.lt-rail-movebtn(type="button" :aria-label="$t('firmLogicTables.moveTo')") ⋯
              b-dropdown-item(custom aria-role="menuitem")
                span.lt-move-head {{ $t('firmLogicTables.moveTo') }}
              b-dropdown-item(
                v-for="opt in sectionOptions"
                :key="opt.key"
                aria-role="menuitem"
                :disabled="opt.key === group.key"
                @click="moveTo(item.id, opt.key)"
              ) {{ opt.label }}

    //- ── Panel: the selected table's branches ───────────────────────────
    //- Takes the whole row once the list is hidden, which is the point of it.
    .column(:class="railHidden ? 'is-12' : 'is-8'")
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmLogicTables.pickPrompt') }}
        p.has-text-grey.is-size-7 {{ $t('firmLogicTables.pickHint') }}

      div(v-else)
        .box
          //- Header — table identity + origin legend.
          .level.mb-3.is-align-items-flex-start
            .level-left
              div
                p.title.is-5.mb-1 {{ current.label }}
                b-tag(:type="current.origin === 'firm' ? 'is-warning is-light' : 'is-light'")
                  | {{ current.origin === 'firm' ? $t('firmLogicTables.originFirm') : $t('firmLogicTables.originPlatform') }}
            .level-right
              .lt-legend
                span.lt-legend-item
                  span.lt-dot.is-platform
                  | {{ $t('firmLogicTables.legendPlatform') }}
                span.lt-legend-item
                  span.lt-dot.is-firm
                  | {{ $t('firmLogicTables.legendFirm') }}

          b-message.mb-0(
            v-if="!hasBranches"
            type="is-warning"
            has-icon
            :closable="false"
          ) {{ $t('firmLogicTables.noBranches') }}

          //- The four-column IF→THEN table.
          .table-scroll(v-else)
            //- Says out loud what reordering does and does not do, so a firm is
            //- never guessing whether moving a row changed the engine.
            p.lt-ordernote(v-if="current.reorderable") {{ $t('firmLogicTables.orderNote') }}
            table.lt-table
              colgroup
                col.c-branch
                col.c-if
                col.c-then
                col.c-notes
              thead
                tr
                  th(scope="col") {{ $t('firmLogicTables.colBranch') }}
                  th.th-if(scope="col") {{ $t('firmLogicTables.colIf') }}
                  th.th-then(scope="col") {{ $t('firmLogicTables.colThen') }}
                  th(scope="col") {{ $t('firmLogicTables.colNotes') }}
              tbody
                tr(v-for="(branch, bIndex) in form.branches" :key="bIndex")
                  td
                    .lt-branch-head
                      b-input.branch-input(
                        v-model="branch.branch_name"
                        v-autogrow
                        type="textarea"
                        rows="1"
                        :aria-label="$t('firmLogicTables.colBranch')"
                      )
                      //- Reorder is offered only where row order is presentation
                      //- alone. A nodes-shaped tree starts its walk at row 1, so
                      //- moving rows there would repoint the engine's entry.
                      template(v-if="current.reorderable")
                        button.lt-branch-move(
                          type="button"
                          :disabled="bIndex === 0"
                          :aria-label="$t('firmLogicTables.moveBranchUp')"
                          @click="moveBranch(bIndex, -1)"
                        ) ↑
                        button.lt-branch-move(
                          type="button"
                          :disabled="bIndex === form.branches.length - 1"
                          :aria-label="$t('firmLogicTables.moveBranchDown')"
                          @click="moveBranch(bIndex, 1)"
                        ) ↓
                      button.lt-branch-remove(
                        type="button"
                        :aria-label="$t('firmLogicTables.removeBranch')"
                        @click="removeBranch(bIndex)"
                      ) ×
                    b-tag.mt-2(:type="branch.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small")
                      | {{ branch.origin === 'firm' ? $t('firmLogicTables.tagFirm') : $t('firmLogicTables.tagPlatform') }}
                  td.td-if
                    b-input(
                      v-model="branch.condition"
                      v-resize-persist="'lt:' + current.id + ':if:' + bIndex"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colIf')"
                    )
                  td.td-then
                    b-input(
                      v-model="branch.action"
                      v-resize-persist="'lt:' + current.id + ':then:' + bIndex"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colThen')"
                    )
                  td
                    b-input(
                      v-model="branch.notes"
                      v-resize-persist="'lt:' + current.id + ':notes:' + bIndex"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colNotes')"
                    )

          //- Action bar. Save lights up once a branch is edited; Reset removes
          //- the firm's override and returns to the platform default. Firm-
          //- authored branch text is fenced before it reaches the AI
          //- (server/utils/logicTrees.formatLogicTreeForPrompt).
          .lt-actionbar(v-if="hasBranches")
            b-button(type="is-light" @click="addBranch") {{ $t('firmLogicTables.addBranch') }}
            b-button(
              type="is-text"
              :disabled="!canReset || saving"
              @click="confirmReset"
            ) {{ $t('firmLogicTables.reset') }}
            span.lt-spacer
            b-button(
              type="is-primary"
              :loading="saving"
              :disabled="!dirty || saving"
              @click="save"
            ) {{ $t('firmLogicTables.save') }}

        //- ── Version history (read-only; bundle-level, mirrors FirmDomainSupport) ──
        .box(v-if="hasBranches")
          p.title.is-6 {{ $t('firmLogicTables.historyHeading') }}
          p.has-text-grey.is-size-7.mb-3 {{ $t('firmLogicTables.historyNote') }}
          b-table(v-if="history.length" :data="history" :mobile-cards="false")
            b-table-column(v-slot="{ row }" field="version" :label="$t('firmLogicTables.historyVersion')" width="80")
              | v{{ row.version }}
            b-table-column(v-slot="{ row }" field="saved_by" :label="$t('firmLogicTables.historySavedBy')")
              | {{ row.saved_by }}
            b-table-column(v-slot="{ row }" field="created_at" :label="$t('firmLogicTables.historyDate')")
              | {{ formatDate(row.created_at) }}
          p.has-text-grey.is-size-7(v-else) {{ $t('firmLogicTables.historyEmpty') }}

      //- The sentence/wording checker used to render here, at the foot of this
      //- column. Detached 2026-08-02 (owner instruction) — it is moving to a page
      //- of its own. The component file is untouched and still tested; only this
      //- placement is gone, so this tab is back to one job: the branch tables.
</template>

<script>
import { autogrow, resizePersist } from '~/utils/textareaDirectives'

/** Where this browser remembers whether the table list is hidden. */
const RAIL_STATE_KEY = 'lt:railHidden'

/**
 * Firm Logic Tables (FIRM-EDITABLE-TABLES-PLAN.md Phase 3, §0.6) — the firm's
 * no-code view of the IF→THEN branch tables that steer how a meeting is run.
 * Each row is one branch: name, the If (condition), the Then (action), notes.
 *
 * Lives in its own file rather than inside FirmManagerHub.vue (over the
 * decompose rule, CB-23) — the Hub renders it as one tab, like FirmQuizzes,
 * FirmDocuments and FirmDomainSupport, whose read-preview pattern this mirrors.
 *
 * Slice B (live): browse the tables, open one, reword branches, add/remove
 * branches, Save (firm-only override), and Reset to the platform default —
 * mirroring FirmDomainSupport. Firm-authored branch text is fenced before it
 * reaches the AI (server/utils/logicTrees.formatLogicTreeForPrompt), so this
 * surface never went live before its safeguard. Scope: reword + add/remove,
 * flow kept intact (Mike 2026-07-24); reordering and per-version restore are
 * out of scope (version history is a read-only, bundle-level list).
 *
 * Reads the SINGLE `logic-trees` overlay bundle the advisor engine itself loads
 * (firmContent), so what a firm sees here is what the AI sees — not the split
 * per-key storage the domain-support routes use (that gap is a logged P1).
 *
 * The rail is a simple three-group list (Do the Job / Get the Job / Get
 * Organised — the master export's sections), matching FirmDomainSupport — not
 * the FirmRail accordion.
 */
export default {
  name: 'FirmLogicTables',

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
      /** The table on screen: {id, label, origin}, or null. */
      current: null,
      /** A deep, editable copy of the current table's branches. */
      form: { branches: [] },
      /** Cleaned baseline of the loaded branches, JSON — drives `dirty`. */
      original: null,
      saving: false,
      /** Bundle-level saved-versions list (all logic tables share one history). */
      history: [],
      /** Rail re-filing drag state (display-only): the id being dragged and the
       *  group currently hovered as a drop target. */
      dragId: null,
      dropKey: null,
      /** Table list collapsed, giving the branch grid the full width. A personal
       *  display preference like the drag-to-size box heights — remembered in
       *  this browser only, never in the firm's saved content. Restored in
       *  mounted(), never here: localStorage does not exist during SSR. */
      railHidden: false
    }
  },

  computed: {
    /**
     * id -> readable name for every logic table, for the workbench.
     *
     * The preview route names the table a conversation was taken FROM by its
     * internal id; the workbench needs this to show a firm manager a table name
     * instead of a database key. Built from the SEARCH-UNFILTERED lists, not
     * from `groups` — a name must resolve whether or not the search box happens
     * to be hiding that table.
     *
     * @returns {Object<string,string>}
     */
    tableNames () {
      const map = {}
      for (const row of [...this.doTheJob, ...this.getTheJob, ...this.getOrganised]) {
        if (row && row.id) { map[row.id] = row.label || row.id }
      }
      return map
    },

    /**
     * The rail: the three master-section groups (Do the Job / Get the Job / Get
     * Organised), each a flat list filtered by the search box. An empty group is
     * dropped so no heading sits over nothing.
     */
    groups () {
      const q = this.query.trim().toLowerCase()
      const match = list => (list || [])
        .filter(d => !q || String(d.label || '').toLowerCase().includes(q))
        .map(d => ({ id: d.id, label: d.label, count: d.count, origin: d.origin }))

      return [
        { key: 'doTheJob', heading: this.$t('firmLogicTables.groupDoTheJob'), list: this.doTheJob },
        { key: 'getTheJob', heading: this.$t('firmLogicTables.groupGetTheJob'), list: this.getTheJob },
        { key: 'getOrganised', heading: this.$t('firmLogicTables.groupGetOrganised'), list: this.getOrganised }
      ]
        .map(g => ({ key: g.key, heading: g.heading, items: match(g.list) }))
        .filter(g => g.items.length)
    },

    /** True when the open table has branches to show. */
    hasBranches () {
      return Array.isArray(this.form.branches) && this.form.branches.length > 0
    },

    /** True once the on-screen branches differ from what was loaded. */
    dirty () {
      if (this.original === null) { return false }
      return JSON.stringify(this.cleanBranches(this.form.branches)) !== this.original
    },

    /** Reset is meaningful only when the firm actually has a saved override. */
    canReset () {
      return !!(this.current && this.current.origin === 'firm')
    },

    /** The three section drop targets, for the "Move to" menu. */
    sectionOptions () {
      return [
        { key: 'doTheJob', label: this.$t('firmLogicTables.groupDoTheJob') },
        { key: 'getTheJob', label: this.$t('firmLogicTables.groupGetTheJob') },
        { key: 'getOrganised', label: this.$t('firmLogicTables.groupGetOrganised') }
      ]
    }
  },

  mounted () {
    this.restoreRailState()
    this.load()
  },

  methods: {
    /**
     * Restore the collapsed/expanded state of the table list from this browser.
     * Client-only and failure-tolerant: private browsing or blocked storage
     * simply leaves the list showing, which is the safe default.
     */
    restoreRailState () {
      if (typeof window === 'undefined') { return }
      try {
        this.railHidden = window.localStorage.getItem(RAIL_STATE_KEY) === '1'
      } catch (e) { /* storage blocked — keep the list showing */ }
    },

    /** Hide or show the table list, remembering the choice for next time. */
    toggleRail () {
      this.railHidden = !this.railHidden
      if (typeof window === 'undefined') { return }
      try {
        window.localStorage.setItem(RAIL_STATE_KEY, this.railHidden ? '1' : '0')
      } catch (e) { /* storage blocked — the toggle still works this session */ }
    },

    /** GET the logic-table list (advisory + get-the-job). */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/logic-trees')
        this.doTheJob = (data.doTheJob || []).map(this.normaliseListRow)
        this.getTheJob = (data.getTheJob || []).map(this.normaliseListRow)
        this.getOrganised = (data.getOrganised || []).map(this.normaliseListRow)
      } catch (err) {
        this.error = this.$t('firmLogicTables.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Give each rail row a stable shape.
     * @param {{id:string,label:string,count:number,origin:string}} row
     * @returns {{id:string,label:string,count:number,origin:string}}
     */
    normaliseListRow (row) {
      return {
        id: row.id,
        label: row.label,
        count: typeof row.count === 'number' ? row.count : 0,
        origin: row.origin || 'platform'
      }
    },

    /**
     * Open a table: fetch its branches and take an editable local copy. Editing
     * that copy changes nothing on the server in this pass.
     * @param {{id:string,label:string,origin:string}} item rail row
     */
    async select (item) {
      // `reorderable` is declared up front, not added later: Vue 2 cannot make a
      // property reactive once the object exists, so the arrows would never appear.
      this.current = { id: item.id, label: item.label, origin: item.origin, reorderable: false }
      this.form = { branches: [] }
      this.original = null
      this.history = []
      try {
        const detail = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(item.id)}`)
        this.applyDetail(detail, item.origin)
        await this.loadHistory(item)
      } catch (err) {
        this.error = this.$t('firmLogicTables.detailFailed')
      }
    },

    /**
     * Take an editable local copy of a fetched detail and record the dirty
     * baseline. Each branch keeps its node id so the save merges edits back by
     * id and preserves the branch's hidden flow wiring. Deep copy so on-screen
     * edits never mutate the fetched reference.
     * @param {{branches?: Array}} detail - the merged logic-table detail
     * @param {string} origin - 'firm' or 'platform' for this table
     */
    applyDetail (detail, origin) {
      const branches = Array.isArray(detail.branches) ? detail.branches : []
      const rowOrigin = origin === 'firm' ? 'firm' : 'platform'
      // Only the backend knows whether this table's row order is presentation
      // or flow; default to NOT reorderable if the field is missing.
      if (this.current) { this.current.reorderable = detail.reorderable === true }
      this.form = {
        branches: branches.map(b => ({
          id: b.id,
          branch_name: b.branch_name || '',
          condition: b.condition || '',
          action: b.action || '',
          notes: b.notes || '',
          origin: rowOrigin
        }))
      }
      this.original = JSON.stringify(this.cleanBranches(this.form.branches))
    },

    /**
     * The branches as they will be saved: the on-screen-only `origin` field
     * dropped and text trimmed, `id` kept so the backend merges by id. Also the
     * comparison shape for `dirty`, so a pure-whitespace change never counts.
     * @param {Array<Object>} branches
     * @returns {Array<{id,branch_name,condition,action,notes}>}
     */
    cleanBranches (branches) {
      return (branches || []).map(b => ({
        id: b.id,
        branch_name: (b.branch_name || '').trim(),
        condition: (b.condition || '').trim(),
        action: (b.action || '').trim(),
        notes: (b.notes || '').trim()
      }))
    },

    /**
     * Save the firm's version of this table's branches. Posts the full branch
     * list; the backend merges each edit onto the platform node by id (flow
     * wiring preserved) and stores it in the single `logic-trees` bundle the AI
     * reads. On success the table becomes firm-authored, so tags and history
     * refresh.
     */
    async save () {
      if (!this.current || !this.dirty || this.saving) { return }
      this.saving = true
      try {
        const id = this.current.id
        await this.api('POST', `/api/firm-manager/logic-trees/${encodeURIComponent(id)}`, {
          branches: this.cleanBranches(this.form.branches)
        })
        this.$buefy.toast.open({ message: this.$t('firmLogicTables.saved'), type: 'is-success' })
        this.current.origin = 'firm'
        // Re-fetch so the panel shows exactly what was stored and the baseline
        // matches it.
        const detail = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(id)}`)
        this.applyDetail(detail, 'firm')
        await this.loadHistory(this.current)
        this.markListOrigin(id, 'firm')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /** Confirm before discarding the firm's saved edits for this table. */
    confirmReset () {
      if (!this.canReset) { return }
      this.$buefy.dialog.confirm({
        message: this.$t('firmLogicTables.resetConfirm', { name: this.current.label }),
        type: 'is-warning',
        confirmText: this.$t('firmLogicTables.reset'),
        onConfirm: () => this.reset()
      })
    },

    /** Remove the firm override and return the panel to the platform default. */
    async reset () {
      if (!this.current || this.saving) { return }
      this.saving = true
      try {
        const id = this.current.id
        await this.api('DELETE', `/api/firm-manager/logic-trees/${encodeURIComponent(id)}`)
        this.$buefy.toast.open({ message: this.$t('firmLogicTables.wasReset'), type: 'is-success' })
        this.current.origin = 'platform'
        const detail = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(id)}`)
        this.applyDetail(detail, 'platform')
        await this.loadHistory(this.current)
        this.markListOrigin(id, 'platform')
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /**
     * Keep the rail row's origin tag in step with a save/reset without a full
     * reload. @param {string} id tree id @param {string} origin new origin
     */
    markListOrigin (id, origin) {
      const row = this.doTheJob.find(d => d.id === id) ||
        this.getTheJob.find(d => d.id === id) ||
        this.getOrganised.find(d => d.id === id)
      if (row) { row.origin = origin }
    },

    /**
     * The firm's saved logic-table versions (bundle-level — every table shares
     * one history). Only loaded once the firm has edits; an unedited firm has
     * none, which is the normal starting state, not an error.
     * @param {{origin:string}} item
     */
    async loadHistory (item) {
      if (!item || item.origin !== 'firm') { this.history = []; return }
      try {
        const data = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(item.id)}/history`)
        this.history = Array.isArray(data.history) ? data.history : []
      } catch (err) {
        this.history = []
      }
    },

    /** Add a blank firm-authored branch (appended; no flow wiring). */
    addBranch () {
      this.form.branches.push({ branch_name: '', condition: '', action: '', notes: '', origin: 'firm' })
    },

    /** Remove a branch from the on-screen table. */
    removeBranch (index) {
      this.form.branches.splice(index, 1)
    },

    /**
     * Move a branch one row up or down (on-screen only; Save persists it).
     *
     * GUARDED, and the guard is the point. Row order is presentation only for
     * `flat_if_then` tables. A `nodes`-shaped tree is a graph whose entry point
     * is positional — `walkLogicTree` starts at `tree.nodes[0].id` — so moving
     * rows there would repoint where the engine begins, which is a FLOW change
     * and outside what firms may edit (Mike, 2026-07-24). The backend decides
     * via `reorderable` on the detail response; this re-checks it rather than
     * trusting that the buttons were hidden.
     *
     * Splice rather than index assignment: Vue 2 cannot observe `arr[i] = x`.
     *
     * @param {number} index - the branch's current row
     * @param {number} delta - -1 to move up, +1 to move down
     */
    moveBranch (index, delta) {
      if (!this.current || !this.current.reorderable) { return }
      const target = index + delta
      if (target < 0 || target >= this.form.branches.length) { return }
      const [moved] = this.form.branches.splice(index, 1)
      this.form.branches.splice(target, 0, moved)
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
     * Re-file an item into another master section for this firm — display-only,
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
        await this.api('POST', `/api/firm-manager/logic-trees/${encodeURIComponent(id)}/section`, { section: toKey })
      } catch (err) {
        // Revert the optimistic move so the rail never lies about what was saved.
        const back = this[toKey].indexOf(row)
        if (back > -1) { this[toKey].splice(back, 1) }
        from.splice(idx, 0, row)
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      }
    },

    /**
     * Thin authenticated fetch — mirrors the sibling firm tabs so this one can
     * be mounted and tested on its own; the backend re-checks authorisation on
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
/* Rail — a simple two-group list (the mockup shape), matching FirmDomainSupport.
   Kept local; slot content compiles in this component's scope. */
.lt-rail {
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
  max-height: 70vh;
  overflow-y: auto;
}
.lt-rail-group { margin-bottom: 1rem; }
.lt-rail-heading {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-weight: 700;
  color: #8a94a3;
  margin: 0 0 0.35rem;
  padding: 0.3rem 0.4rem;
}
.lt-rail-row {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  border-left: 3px solid transparent;
  border-radius: 4px;
}
.lt-rail-row:hover { background: #f5f7fa; }
.lt-rail-row.is-current { background: #eaf1fb; border-left-color: #002b64; }
.lt-rail-row.is-current .lt-rail-name { font-weight: 600; }
.lt-rail-row.is-dragging { opacity: 0.5; }
.lt-rail-select {
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
.lt-rail-name { flex: 1; min-width: 0; }
.lt-rail-move { flex: 0 0 auto; }
.lt-rail-movebtn {
  background: none;
  border: 0;
  cursor: pointer;
  color: #8a94a3;
  font-size: 1.05rem;
  line-height: 1;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}
.lt-rail-movebtn:hover { background: #e8edf4; color: #002b64; }
.lt-rail-group.is-drop-target {
  background: #eef5ff;
  outline: 2px dashed #9fc0ec;
  outline-offset: -2px;
  border-radius: 6px;
}
.lt-move-head {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a94a3;
  font-weight: 700;
}
.lt-rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }

/* Origin legend in the panel header. */
.lt-legend { display: flex; gap: 0.9rem; font-size: 0.75rem; color: #8a94a3; }
.lt-legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
.lt-dot { display: inline-block; width: 0.62rem; height: 0.62rem; border-radius: 3px; }
.lt-dot.is-platform { background: #c7ceda; }
.lt-dot.is-firm { background: #e0b24e; }

/* The four-column table. Scrolls inside its own container so the page body
   never scrolls sideways. IF/THEN columns carry a faint blue/green wash so the
   condition and the action read apart at a glance. */
.table-scroll { overflow-x: auto; }
.lt-table { border-collapse: collapse; width: 100%; min-width: 62rem; }
.lt-table thead th {
  background: #f4f6f9;
  text-align: left;
  vertical-align: bottom;
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 700;
  color: #002b64;
  padding: 0.7rem 0.6rem;
  border-bottom: 1px solid #d5dbe4;
}
.lt-table thead th.th-if { background: #f4f8fc; }
.lt-table thead th.th-then { background: #f3faf5; }
.lt-table tbody td {
  vertical-align: top;
  padding: 0.6rem;
  border-bottom: 1px solid #eef1f5;
}
.lt-table tbody td.td-if { background: #f9fbfe; }
.lt-table tbody td.td-then { background: #f8fcf9; }
.lt-table colgroup .c-branch { width: 20%; }
.lt-table colgroup .c-if { width: 27%; }
.lt-table colgroup .c-then { width: 27%; }
.lt-table colgroup .c-notes { width: 26%; }
.branch-input >>> textarea { font-weight: 600; color: #002b64; resize: none; }
.branch-input { flex: 1; }

/* Branch name row with its remove control (mirrors the domain-support step ×). */
.lt-branch-head { display: flex; align-items: flex-start; gap: 0.3rem; }
.lt-branch-remove {
  border: 0;
  background: none;
  color: #b5b5b5;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1.6rem;
  padding: 0 0.25rem;
}
.lt-branch-remove:hover { color: #cc0f35; }
.lt-branch-move {
  border: 0;
  background: none;
  color: #7a869a;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1.6rem;
  padding: 0 0.18rem;
}
.lt-ordernote {
  font-size: 0.78rem;
  color: #7a869a;
  margin-bottom: 0.6rem;
}
.lt-branch-move:hover:not(:disabled) { color: #002b64; }
.lt-branch-move:disabled { color: #dde2e9; cursor: default; }

/* Action bar. */
.lt-actionbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.9rem;
  margin-top: 0.6rem;
  border-top: 1px solid #eef1f5;
}
.lt-spacer { flex: 1; }
</style>

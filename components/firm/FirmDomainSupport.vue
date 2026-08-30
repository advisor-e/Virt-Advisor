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
        //- ── The standing guide, above the domains (item 4.16 F) ───────────
        //- Facilitation 101 is "the universal 3-stage entry protocol for
        //- introducing ANY advisory concept to a client" — it belongs to no
        //- domain, and there is no material row for it in any of the 30 domain
        //- files. Ruled by Mike 2026-08-17 (§6d option A): its own entry above
        //- the domains rather than filed under an arbitrary one, where nobody
        //- would look for it.
        .ds-rail-group(v-if="standingGuides.length")
          h3.ds-rail-heading {{ $t('firmDomainSupport.guideStandingHeading') }}
          .ds-rail-row(
            v-for="g in standingGuides"
            :key="g.id"
            :class="{ 'is-current': openGuideId === g.id && !current }"
          )
            //- No tag on this row (Mike, 2026-08-22).
            button.ds-rail-select(type="button" @click="selectStandingGuide(g)")
              span.ds-rail-name {{ g.label }}

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
              //- The count is never replaced by anything (Mike, 2026-08-22). A guide
              //- mark stood here and, as a v-else-if, hid the number on ten domains.
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
      .box.panel-empty(v-if="!current && !openGuideId")
        p.has-text-weight-semibold {{ $t('firmDomainSupport.pickPrompt') }}
        p.has-text-grey.is-size-7 {{ $t('firmDomainSupport.pickHint') }}

      //- The standing guide, opened on its own: it belongs to no domain, so it has
      //- no materials table to sit under (item 4.16 F, §6d).
      .box(v-else-if="!current")
        method-guide-panel(
          :api-token="apiToken"
          :guide-id="openGuideId"
          @close="openGuideId = null"
          @saved="loadGuideList"
        )

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

          //- ── What to do, depending on the situation (item 4.16 A+B) ───────
          //- The 65 branches under `diagnostic_entry`, which reached no prompt
          //- and no screen, plus the 26 entry questions which reached the prompt
          //- and no screen. design/DOMAIN-DIAGNOSTIC-BRANCHES.md.
          //- Above the materials table because the question and its answers come
          //- before the "how to run it" material.
          .ds-diagnostic.mb-5(v-if="hasDiagnostic")
            p.title.is-6.mb-2 {{ $t('firmDomainSupport.diagnosticHeading') }}

            b-field(
              v-if="form.diagnostic.primaryQuestion !== null"
              :label="$t('firmDomainSupport.entryQuestion')"
            )
              b-input(
                v-model="form.diagnostic.primaryQuestion"
                type="textarea"
                rows="3"
                maxlength="800"
              )

            .table-scroll(v-if="form.diagnostic.situations.length")
              table.ds-table
                thead
                  tr
                    th(scope="col") {{ $t('firmDomainSupport.colSituation') }}
                    th(scope="col") {{ $t('firmDomainSupport.colDoThis') }}
                tbody
                  tr(v-for="(row, dIndex) in form.diagnostic.situations" :key="row.key")
                    td
                      //- READ-ONLY on a platform row, deliberately: the key is the
                      //- identity the stored guidance is filed under, so renaming
                      //- it would repoint the content. A firm's own row is named
                      //- by the firm, so that one is editable.
                      span.has-text-weight-semibold(v-if="row.origin !== 'firm'") {{ row.label }}
                      b-input(
                        v-else
                        v-model="row.label"
                        v-autogrow
                        type="textarea"
                        rows="1"
                        :aria-label="$t('firmDomainSupport.colSituation')"
                      )
                      b-tag.mt-2(:type="row.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small")
                        | {{ row.origin === 'firm' ? $t('firmDomainSupport.tagFirm') : $t('firmDomainSupport.tagPlatform') }}
                      //- Only a firm's own row can be removed. A platform row
                      //- dropped here would simply reappear on the next load,
                      //- because the stored override MERGES onto the platform
                      //- entry rather than replacing it — so offering the button
                      //- would be offering something that does not work.
                      button.ds-step-remove(
                        v-if="row.origin === 'firm'"
                        type="button"
                        :aria-label="$t('firmDomainSupport.removeSituation')"
                        @click="removeSituation(dIndex)"
                      ) ×
                    td
                      b-input(
                        v-model="row.text"
                        v-resize-persist="'ds:' + current.id + ':sit:' + dIndex"
                        type="textarea"
                        rows="5"
                        :aria-label="$t('firmDomainSupport.colDoThis')"
                      )

            b-button.mt-2(type="is-light" size="is-small" @click="addSituation")
              | {{ $t('firmDomainSupport.addSituation') }}

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
                    //- ── The method guide behind this framework (item 4.16 F) ──
                    //- Shown only where a guide is MAPPED to this row, by the
                    //- written mapping in server/utils/methodGuides.js. A guide
                    //- with no mapping renders nowhere rather than being placed by
                    //- guesswork — guessing is the failure this item closes.
                    //- Mike's wording, 2026-08-17 (§6a option C), word for word.
                    button.ds-guide-open(
                      v-if="guideForMaterial(material.name)"
                      type="button"
                      :aria-expanded="String(openGuideId === guideForMaterial(material.name).id)"
                      @click="toggleGuide(guideForMaterial(material.name).id)"
                    )
                      span.ds-guide-chev {{ openGuideId === guideForMaterial(material.name).id ? '▴' : '▾' }}
                      | {{ $t('firmDomainSupport.guideOpen') }}
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

          //- The guide, opened from one of the rows above. It sits under the table
          //- rather than inside a cell because it is the whole framework in full —
          //- ~15,000 characters — and a table cell cannot hold it legibly.
          method-guide-panel(
            v-if="openGuideId && guideIsOnThisDomain"
            :api-token="apiToken"
            :guide-id="openGuideId"
            :from-domain="current.id"
            @close="openGuideId = null"
            @saved="loadGuideList"
          )

          //- Action bar. Save lights up once the table is edited; Reset removes
          //- the firm's saved override and returns to the platform default.
          .ds-actionbar(v-if="hasMaterials || hasDiagnostic")
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
import MethodGuidePanel from '~/components/firm/MethodGuidePanel.vue'

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

  components: { MethodGuidePanel },

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
      /** A deep, editable copy of the current domain's materials, plus its
       *  diagnostic entry — the question that works out which situation the
       *  client is in, and the guidance for each (item 4.16 A+B). */
      form: { materials: [], diagnostic: { primaryQuestion: null, situations: [] } },
      /** Cleaned baseline of the loaded domain, JSON — drives `dirty`. */
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
      railHidden: false,
      /** The method guides that open from the CURRENT domain's material rows —
       *  from the detail route, so a row and its control can never disagree
       *  (item 4.16 F). Each { id, label, material, alsoUsedBy }. */
      domainGuides: [],
      /** Every guide, for the standing entry above the domains and its edited
       *  badge. Loaded once with the tab. */
      allGuides: [],
      /** Which guide is open, or null. One at a time — two 15,000-character
       *  guides open together is not a screen anybody can read. */
      openGuideId: null
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

    /**
     * True when this domain has a diagnostic entry to show — an entry question,
     * a situation, or both. Ten domains have neither and simply show the
     * materials table as they always did, with no empty block inviting a firm to
     * fill in a field the AI would never read for them.
     */
    hasDiagnostic () {
      const d = this.form.diagnostic || {}
      return d.primaryQuestion !== null || (Array.isArray(d.situations) && d.situations.length > 0)
    },

    /** True once the on-screen table differs from what was loaded. */
    dirty () {
      if (this.original === null) { return false }
      return this.cleanForm() !== this.original
    },

    /** Reset is meaningful only when the firm actually has a saved override. */
    canReset () {
      return !!(this.current && this.current.origin === 'firm')
    },

    /**
     * The guides that belong to no domain and are shown above the list instead.
     * Today that is Facilitation 101 alone — "the universal 3-stage entry protocol
     * for introducing ANY advisory concept to a client" — but the screen reads the
     * flag from the data rather than naming the guide, so a second standing guide
     * would need no change here.
     */
    standingGuides () {
      return this.allGuides.filter(g => g.standing)
    },

    /**
     * Is the open guide one of THIS domain's? Guards the panel under the materials
     * table: clicking the standing entry while a domain is open must not drop
     * Facilitation 101 underneath that domain's rows as though it belonged there.
     */
    guideIsOnThisDomain () {
      return this.domainGuides.some(g => g.id === this.openGuideId)
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
    this.loadGuideList()
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
      this.form = { materials: [], diagnostic: { primaryQuestion: null, situations: [] } }
      this.original = null
      this.history = []
      // A guide opened on the previous domain is not this domain's, so it closes
      // with the domain rather than following the reader to an unrelated page.
      this.domainGuides = []
      this.openGuideId = null
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
      // Which framework rows on this domain have a method guide behind them. From
      // the detail route rather than matched in the browser: the mapping is authored
      // once, on the server, and a second copy of it here is how the control comes
      // to sit on a row whose guide the AI is not actually reading.
      this.domainGuides = Array.isArray(detail.guides) ? detail.guides : []
      const materials = Array.isArray(detail.materials) ? detail.materials : []
      const rowOrigin = origin === 'firm' ? 'firm' : 'platform'
      const de = (detail && typeof detail.diagnostic_entry === 'object' && detail.diagnostic_entry) || {}
      // A key the PLATFORM authored is inherited; anything else is this firm's
      // own. The route tells us which, because a merged entry cannot.
      const platformKeys = new Set(Array.isArray(detail.platformSituationKeys) ? detail.platformSituationKeys : [])
      this.form = {
        materials: materials.map(m => ({
          name: m.name || '',
          summary: m.summary || '',
          who_when: m.who_when || '',
          steps: Array.isArray(m.steps) ? m.steps.slice() : [],
          origin: rowOrigin
        })),
        diagnostic: {
          // null means "this domain has no entry question", which is a different
          // thing from an empty one and is what hides the box.
          primaryQuestion: typeof de.primary_question === 'string' ? de.primary_question : null,
          situations: Object.keys(de)
            .filter(k => k !== 'primary_question' && typeof de[k] === 'string')
            .map(k => ({
              key: k,
              label: this.humanise(k),
              text: de[k],
              origin: platformKeys.has(k) ? 'platform' : 'firm'
            }))
        }
      }
      this.original = this.cleanForm()
    },

    /**
     * The thirteen guides and where each opens from. Loaded once with the tab,
     * separately from a domain, because the standing entry must show before any
     * domain has been picked. A failure here is silent on purpose: it costs the
     * standing entry and the edited badges, and must not stop the materials table
     * — which is the thing this tab has always been for.
     */
    async loadGuideList () {
      try {
        const data = await this.api('GET', '/api/firm-manager/method-guides')
        this.allGuides = Array.isArray(data.guides) ? data.guides : []
      } catch (err) {
        this.allGuides = []
      }
    },

    /**
     * The guide that opens from a given framework row, or null.
     * @param {string} name - the material's name as it stands on screen
     * @returns {Object|null}
     */
    guideForMaterial (name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) { return null }
      return this.domainGuides.find(g => g.material === trimmed) || null
    },

    /**
     * Open a guide, or close it if it is the one already open.
     *
     * ⚠ A ROW RENAMED BY THIS FIRM LOSES ITS CONTROL, and that is deliberate rather
     * than an oversight. The mapping is by material NAME, so a firm that rewords a
     * framework row no longer matches it. Showing the control anyway would need a
     * guess about which row was meant, and a guess is exactly what this item exists
     * to remove — the guide is still reachable, still going to the AI, and the
     * platform wording restores the control.
     * @param {string} guideId
     */
    toggleGuide (guideId) {
      this.openGuideId = this.openGuideId === guideId ? null : guideId
    },

    /** Open a standing guide, which belongs to no domain and so clears the panel. */
    selectStandingGuide (guide) {
      this.current = null
      this.domainGuides = []
      this.openGuideId = this.openGuideId === guide.id ? null : guide.id
    },

    /**
     * A stored situation key rendered as ordinary words. Mirrors
     * `humaniseSituation` in server/utils/domainSupport.js so the screen and the
     * prompt name a situation the same way.
     * @param {string} key
     * @returns {string}
     */
    humanise (key) {
      const words = String(key || '').replace(/_/g, ' ').trim()
      return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
    },

    /**
     * A firm-authored situation label turned back into a stored key. Platform
     * rows keep the key they arrived with — their label is read-only precisely
     * so this can never repoint inherited guidance.
     * @param {string} label
     * @returns {string}
     */
    keyFor (label) {
      return String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    },

    /**
     * The diagnostic entry as it will be saved: `{ primary_question, <key>: text }`,
     * matching the shape the prompt formatters read. Empty rows are dropped —
     * a situation with no guidance is not advice, and the formatter skips it
     * anyway.
     * @returns {Object}
     */
    diagnosticEntry () {
      const out = {}
      const q = this.form.diagnostic.primaryQuestion
      if (typeof q === 'string' && q.trim()) { out.primary_question = q.trim() }
      for (const row of this.form.diagnostic.situations) {
        const key = row.origin === 'firm' ? this.keyFor(row.label) : row.key
        const text = (row.text || '').trim()
        if (key && text) { out[key] = text }
      }
      return out
    },

    /**
     * The whole editable domain as one comparable string — materials AND the
     * diagnostic entry. `dirty` reads this, so editing only a situation still
     * lights up Save.
     * @returns {string}
     */
    cleanForm () {
      return JSON.stringify({
        materials: this.cleanMaterials(this.form.materials),
        diagnostic: this.diagnosticEntry()
      })
    },

    /** Add a blank firm-authored situation, named by the firm. */
    addSituation () {
      this.form.diagnostic.situations.push({ key: '', label: '', text: '', origin: 'firm' })
    },

    /**
     * Remove a situation from the on-screen list. Offered for a firm's own rows
     * only — see the template comment: a platform row would return on the next
     * load because the stored override merges onto the platform entry.
     * @param {number} index
     */
    removeSituation (index) {
      this.form.diagnostic.situations.splice(index, 1)
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
        const body = { materials: this.cleanMaterials(this.form.materials) }
        const diagnostic = this.diagnosticEntry()
        if (Object.keys(diagnostic).length > 0) { body.diagnostic_entry = diagnostic }
        await this.api('POST', `/api/firm-manager/domain-support/${encodeURIComponent(id)}`, body)
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

/* The control that opens a framework's method guide (item 4.16 F). Green rather
   than the tab's navy so it reads as "there is more behind this row" instead of a
   second edit control on a row that is already editable — the approved mockup's
   colour, design/mockups/method-guides.html. */
.ds-guide-open {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.45rem;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1f9d76;
  border: 1px solid #1f9d76;
  background: #e9f6f1;
  border-radius: 5px;
  padding: 0.18rem 0.55rem;
  cursor: pointer;
}
.ds-guide-open:hover { background: #d9efe6; }
.ds-guide-chev { font-size: 0.68rem; }

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

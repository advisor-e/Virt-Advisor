<template lang="pug">
section.firm-quizzes
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmQuizzes.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search + the "show me the gaps" switch
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmQuizzes.searchPlaceholder')"
          :aria-label="$t('firmQuizzes.searchPlaceholder')"
        )
    .level-right
      b-switch(v-model="showEmpty") {{ $t('firmQuizzes.showEmpty') }}

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: sections → sub-sections → pages (shared FirmRail) ────────
    .column.is-4
      firm-rail(
        :sections="tree"
        :query="query.trim()"
        :aria-label="$t('firmQuizzes.railLabel')"
        :empty-text="query ? $t('firmQuizzes.noMatchHere') : $t('firmQuizzes.emptyLibrary')"
      )
        template(v-slot:sub-badge="{ sub }")
          b-tag(:type="sub.quizPageCount ? 'is-info is-light' : 'is-light'" size="is-small")
            | {{ sub.quizPageCount ? $tc('firmQuizzes.quizCount', sub.quizPageCount) : $t('firmQuizzes.none') }}

        template(v-slot:default="{ sub }")
          button.rail-page(
            v-for="page in sub.visiblePages"
            :key="page.title"
            type="button"
            :class="{ 'is-current': currentTitle === page.title, 'is-blocked': !page.bindable }"
            @click="select(page)"
          )
            span.rail-pagename {{ page.title }}
            b-tag(v-if="!page.bindable" type="is-warning is-light" size="is-small")
              | {{ $t('firmQuizzes.duplicateNameTag') }}
            b-tag(size="is-small" rounded) {{ page.entryCount }}

          .rail-empty(v-if="!sub.visiblePages.length")
            span.has-text-grey.is-size-7
              | {{ query ? $t('firmQuizzes.noMatchHere') : $t('firmQuizzes.noQuizYet') }}

    //- ── Panel: the selected page's questions ───────────────────────────
    .column.is-8
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmQuizzes.pickAPage') }}
        p.has-text-grey.is-size-7 {{ $t('firmQuizzes.pickAPageHint') }}

      div(v-else)
        .box
          .level.mb-3
            .level-left
              div
                p.is-size-7.has-text-grey {{ current.section }} › {{ current.subSection }}
                p.title.is-5.mb-2 {{ current.title }}
                .tags.mb-0
                  b-tag(type="is-light") {{ $tc('firmQuizzes.questionCount', rows.live.length) }}
            .level-right
              //- Always offered while the page can take a quiz. It used to hide
              //- whenever a form was open, which made a button vanishing at the top
              //- the only visible response to clicking Edit — the one cue on screen,
              //- and it read as a fault.
              b-button(
                v-if="current.bindable"
                type="is-primary"
                size="is-small"
                icon-left="plus"
                @click="openForm(null)"
              ) {{ $t('firmQuizzes.addQuestion') }}

          //- Said before any work is done, not after a rejected save.
          b-message.mb-4(
            v-if="!current.bindable"
            type="is-warning"
            has-icon
            :closable="false"
          ) {{ $t('firmQuizzes.duplicateNameWarning') }}

          b-notification.mb-4(type="is-info is-light" :closable="false" style="font-size:0.85rem")
            | {{ $t('firmQuizzes.notice') }}

          //- One question per card. The number is the POSITION the AI is shown, not
          //- an identity — it closes up when a question above is switched off.
          article.q(v-for="row in rows.live" :key="row.qid" :class="{ 'is-editing': isEditing(row) }")
            .q-number {{ row.id }}

            //- Editing happens HERE, in the card, not in a form at the foot of the
            //- page. A ten-question bank is tall enough that a form down there
            //- opened out of sight and read as "the Edit button does nothing"
            //- (found by Mike, 2026-07-31).
            .q-body(v-if="isEditing(row)")
              p.q-editing-label.mb-3 {{ $t('firmQuizzes.editQuestion') }}
              firm-quiz-question-form(
                v-model="form"
                :saving="saving"
                :submit-label="$t('firmQuizzes.save')"
                :max-chars="maxChars"
                @save="saveQuestion"
                @cancel="closeForm"
              )

            .q-body(v-else)
              .tags.mb-1
                b-tag(:type="badge(row.kind).type" size="is-small") {{ badge(row.kind).label }}
              p.q-text {{ row.question }}
              .q-field
                p.q-label {{ $t('firmQuizzes.answer') }}
                p.q-value {{ row.answer }}
              .q-field
                p.q-label {{ $t('firmQuizzes.keyPoint') }}
                p.q-value {{ row.keyPoint }}
              .buttons.mt-2.mb-0
                b-button(size="is-small" :disabled="busyId === row.qid" @click="openForm(row)")
                  | {{ $t('firmQuizzes.edit') }}
                b-button(
                  v-if="row.kind === 'customised'"
                  size="is-small"
                  :disabled="busyId === row.qid"
                  @click="confirmReset(row)"
                ) {{ $t('firmQuizzes.resetToPlatform') }}
                b-button(
                  v-if="row.kind === 'firm-own'"
                  size="is-small"
                  type="is-danger is-light"
                  :disabled="busyId === row.qid"
                  @click="confirmRemove(row)"
                ) {{ $t('firmQuizzes.remove') }}
                b-button(
                  v-else
                  size="is-small"
                  :loading="busyId === row.qid"
                  @click="switchOff(row)"
                ) {{ $t('firmQuizzes.switchOff') }}

          //- Every question switched off. The page still gets a quiz — the AI writes
          //- it — and saying nothing here would leave a firm believing it removed the
          //- quiz altogether.
          .q-none(v-if="!rows.live.length")
            p.has-text-weight-semibold.mb-1 {{ $t('firmQuizzes.noneLiveHeading') }}
            p.is-size-7.has-text-grey {{ $t('firmQuizzes.noneLiveNote') }}

        //- ── Switched off ────────────────────────────────────────────────
        //- Below the live list and unnumbered, deliberately: these questions hold no
        //- position, and a question that simply vanished would read as data loss.
        .box(v-if="rows.switchedOff.length")
          p.has-text-weight-semibold.mb-1 {{ $t('firmQuizzes.switchedOffHeading') }}
          p.is-size-7.has-text-grey.mb-3 {{ $t('firmQuizzes.switchedOffNote') }}
          article.q.q-off(v-for="row in rows.switchedOff" :key="row.qid")
            .q-body
              p.q-text {{ row.question }}
              //- The SAME Customised tag the live list uses, and it earns its place
              //- here: this row shows Advisor-e's wording, so without it a firm has no
              //- way to tell that its own version is still being held behind it.
              b-tag.mt-1(v-if="row.hasFirmEdit" :type="badge('customised').type" size="is-small") {{ badge('customised').label }}
              .buttons.mt-2.mb-0
                b-button(
                  size="is-small"
                  type="is-primary is-light"
                  :loading="busyId === row.qid"
                  @click="switchOn(row)"
                ) {{ $t('firmQuizzes.switchOn') }}
                //- Reset without switching on first. The route only drops the override
                //- and never touches the declines key, so the question stays off — it
                //- just stops carrying the firm's version. Offered only where there IS
                //- one: on an untouched question this button would do nothing at all.
                b-button(
                  v-if="row.hasFirmEdit"
                  size="is-small"
                  :disabled="busyId === row.qid"
                  @click="confirmReset(row)"
                ) {{ $t('firmQuizzes.resetToPlatform') }}

        //- ── Add form ────────────────────────────────────────────────────
        //- Only for a NEW question, and at the end of the list on purpose: that is
        //- where the question itself will appear. An EDIT never renders here — it
        //- happens in the card being edited, above.
        .box.quiz-form(v-if="showForm && !editing")
          p.has-text-weight-semibold.mb-4 {{ $t('firmQuizzes.newQuestion') }}
          firm-quiz-question-form(
            v-model="form"
            :saving="saving"
            :submit-label="$t('firmQuizzes.addQuestion')"
            :max-chars="maxChars"
            @save="saveQuestion"
            @cancel="closeForm"
          )

        //- ── How to undo ─────────────────────────────────────────────────
        //- This replaced a version-history table (2026-07-31). The table read the
        //- old whole-quiz storage, which nothing writes to any more, so it would
        //- have been empty for every firm forever — and an empty history table
        //- reads as "nothing you saved was kept", which is the opposite of true.
        .box
          p.has-text-weight-semibold.mb-1 {{ $t('firmQuizzes.undoHeading') }}
          p.is-size-7.has-text-grey {{ $t('firmQuizzes.undoNote') }}
</template>

<script>
/**
 * Firm Quizzes (CB-31 Phase 3) — the firm's no-code view of its quiz material,
 * and now its editing screen.
 *
 * EVERY QUESTION ON THIS SCREEN IS A DECISION, not a text box. Until 2026-07-31 a
 * save stored a complete copy of a whole bank, which made a firm's quiz a frozen
 * private snapshot the moment it reworded one question: Advisor-e's later
 * improvements to the other nine could never reach them, permanently, with nothing
 * on screen to say so. Questions now go through the one firm-editable mechanism
 * (server/utils/resolveInheritedRows.js) — switch one off, edit one, add your own —
 * so an untouched question stays current automatically.
 *
 * IT DRAWS `resolved`, NOT `merged`. The backend returns both; `resolved` is the
 * bank the course engine actually reads. Drawing the older whole-bank view and
 * putting Save buttons on it would let a firm edit one thing while its advisors
 * were given another — the defect closed on this very feature in Phase 2.
 *
 * The rail deliberately lists EVERY sub-section, including those with no quiz,
 * because seeing the gap is the point — a firm cannot fill material it cannot see
 * is missing. The rail itself (tone bands, drop-tab accordion, open/closed state
 * and the three-state stuck-open fix) is the shared FirmRail component.
 *
 * Wording mirrors the Advisory Staircase tab (Mike's consistency ruling,
 * 2026-07-31) so the Hub reads as one screen rather than six dialects.
 */
import FirmRail from '~/components/firm/FirmRail.vue'
import FirmQuizQuestionForm from '~/components/firm/FirmQuizQuestionForm.vue'
const { buildQuizRows, buildQuestionEdit, isLastLiveQuestion } = require('~/utils/quizRows')

/** Matches LIMITS.textChars on the backend, which is the rule actually enforced. */
const MAX_CHARS = 2000

export default {
  name: 'FirmQuizzes',

  components: { FirmRail, FirmQuizQuestionForm },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      /** Page library from the resolver's own list — every selectable page. */
      pages: [],
      /**
       * Advisor-e's own banks. The only place a switched-off question's wording
       * lives, since by definition it is absent from the resolved list.
       */
      base: {},
      /** The firm's decisions: { declinedIds, overrides, ownRows }. */
      state: { declinedIds: [], overrides: {}, ownRows: [] },
      /** The resolved banks — what the course engine reads, keyed by page title. */
      banks: {},
      query: '',
      showEmpty: true,
      /**
       * The page on screen, held as a TITLE rather than a snapshot row. A snapshot
       * taken at click time goes stale the moment a question is edited, and the
       * screen would then show the firm its own pre-edit wording as if the save had
       * not happened.
       */
      currentTitle: null,
      showForm: false,
      /** The row being edited, or null when adding. */
      editing: null,
      form: { question: '', answer: '', keyPoint: '' },
      saving: false,
      /** The row with a request in flight, so one question never freezes the tab. */
      busyId: null,
      maxChars: MAX_CHARS
    }
  },

  computed: {
    /**
     * The rail: sections → sub-sections → pages, built from the page library with
     * quiz counts layered on. Search filters the pages, not the structure, so a
     * firm can still see which sub-section a hit belongs to.
     */
    tree () {
      const q = this.query.trim().toLowerCase()
      const sections = []
      const sectionIndex = {}

      for (const page of this.pages) {
        const sectionName = page.section || this.$t('firmQuizzes.ungrouped')
        const subName = page.subSection || this.$t('firmQuizzes.ungrouped')
        const key = `${sectionName}::${subName}`

        if (!sectionIndex[sectionName]) {
          sectionIndex[sectionName] = {
            name: sectionName,
            // Raw position — FirmRail cycles it through the brand tones.
            tone: sections.length,
            subs: [],
            subIndex: {}
          }
          sections.push(sectionIndex[sectionName])
        }
        const section = sectionIndex[sectionName]
        if (!section.subIndex[subName]) {
          section.subIndex[subName] = { key, name: subName, pages: [] }
          section.subs.push(section.subIndex[subName])
        }

        const bank = this.banks[page.title]
        section.subIndex[subName].pages.push({
          title: page.title,
          section: sectionName,
          subSection: subName,
          // False when the page's name is shared with another page, so a quiz
          // cannot be attached to it. Said up front rather than at save time.
          bindable: page.bindable !== false,
          entryCount: bank ? bank.entries.length : 0,
          entries: bank ? bank.entries : []
        })
      }

      for (const section of sections) {
        for (const sub of section.subs) {
          sub.quizPageCount = sub.pages.filter(p => p.entryCount > 0).length
          sub.visiblePages = sub.pages.filter(p => p.entryCount > 0 && this.pageMatches(p, q))
          // Open/closed state lives in FirmRail (three-state, explicit close
          // wins). These two flags feed its auto-expand: a search hit hidden
          // behind a closed sub-section reads as "no results", and the sub
          // holding the page on screen should present itself.
          sub.hasHits = sub.visiblePages.length > 0
          sub.holdsCurrent = sub.pages.some(p => p.title === this.currentTitle)
        }
        section.subs = section.subs.filter(sub => this.subVisible(sub, q))
      }
      return sections.filter(section => section.subs.length)
    },

    /**
     * The page on screen, rebuilt from the library on every render so it reflects
     * the latest load rather than what was true when it was clicked.
     * @returns {Object|null}
     */
    current () {
      if (!this.currentTitle) { return null }
      const page = this.pages.find(p => p.title === this.currentTitle)
      if (!page) { return null }
      return {
        title: page.title,
        section: page.section || this.$t('firmQuizzes.ungrouped'),
        subSection: page.subSection || this.$t('firmQuizzes.ungrouped'),
        bindable: page.bindable !== false
      }
    },

    /**
     * The two lists the panel draws for the page on screen.
     * @returns {{live: Array<Object>, switchedOff: Array<Object>}}
     */
    rows () {
      if (!this.currentTitle) { return { live: [], switchedOff: [] } }
      const resolved = this.banks[this.currentTitle]
      const platform = this.base[this.currentTitle]
      return buildQuizRows(
        resolved ? resolved.entries : [],
        platform ? platform.entries : [],
        this.state.declinedIds,
        Object.keys(this.state.overrides || {})
      )
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read the whole picture: Advisor-e's banks, this firm's decisions, and the
     * resolved banks the two produce.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/quizzes')
        this.pages = data.pages || []
        this.base = data.base || {}
        this.banks = data.resolved || {}
        this.state = {
          declinedIds: (data.state && data.state.declinedIds) || [],
          overrides: (data.state && data.state.overrides) || {},
          ownRows: (data.state && data.state.ownRows) || []
        }
      } catch (err) {
        this.error = this.$t('firmQuizzes.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * The tag shown against a question.
     * @param {string} kind - 'platform' | 'customised' | 'firm-own'
     * @returns {{type: string, label: string}}
     */
    badge (kind) {
      if (kind === 'firm-own') {
        return { type: 'is-link is-light', label: this.$t('firmQuizzes.tagFirm') }
      }
      if (kind === 'customised') {
        return { type: 'is-warning is-light', label: this.$t('firmQuizzes.tagCustomised') }
      }
      return { type: 'is-light', label: this.$t('firmQuizzes.tagPlatform') }
    },

    /**
     * True when this exact question is the one open for editing.
     *
     * Keyed on `qid`, never on `id`: `id` is a position the backend reassigns, so
     * two different questions can hold the same one across two loads and the form
     * would open on the wrong card.
     *
     * @param {Object} row - a live question row
     * @returns {boolean}
     */
    isEditing (row) {
      return !!(this.showForm && this.editing && row && this.editing.qid === row.qid)
    },

    /** Advisor-e's version of a question, or null for one the firm owns. */
    platformQuestion (qid) {
      const bank = this.base[this.currentTitle]
      if (!bank || !Array.isArray(bank.entries)) { return null }
      return bank.entries.find(e => e && e.qid === qid) || null
    },

    /**
     * Open the form to add a question, or to edit one.
     * @param {Object|null} row - the row to edit, or null to add
     */
    openForm (row) {
      this.editing = row || null
      this.form = {
        question: (row && row.question) || '',
        answer: (row && row.answer) || '',
        keyPoint: (row && row.keyPoint) || ''
      }
      this.showForm = true
    },

    closeForm () {
      this.showForm = false
      this.editing = null
    },

    /**
     * Save the form. Which of four things happens is not a detail — see
     * buildQuestionEdit: an edit to one of Advisor-e's questions sends ONLY the
     * fields that changed, so the rest keep tracking Advisor-e's wording.
     * @returns {Promise<void>}
     */
    async saveQuestion () {
      const filled = ['question', 'answer', 'keyPoint']
        .every(f => String(this.form[f] || '').trim())
      if (!filled) {
        this.$buefy.toast.open({ message: this.$t('firmQuizzes.allFieldsRequired'), type: 'is-warning' })
        return
      }

      const row = this.editing
      const isOwn = !row || row.kind === 'firm-own'
      const platform = (row && !isOwn) ? this.platformQuestion(row.qid) : null
      const { action, body } = buildQuestionEdit(this.form, platform, row && row.kind === 'customised')

      this.saving = true
      try {
        if (!row) {
          await this.api('POST', '/api/firm-manager/quizzes/own', { ...body, bank: this.currentTitle })
          this.toast('firmQuizzes.questionAdded')
        } else if (isOwn) {
          await this.api('PUT', `/api/firm-manager/quizzes/own/${encodeURIComponent(row.qid)}`, body)
          this.toast('firmQuizzes.questionSaved')
        } else if (action === 'save') {
          await this.api('PUT', `/api/firm-manager/quizzes/platform/${encodeURIComponent(row.qid)}`, body)
          this.toast('firmQuizzes.questionSaved')
        } else if (action === 'reset') {
          await this.api('DELETE', `/api/firm-manager/quizzes/platform/${encodeURIComponent(row.qid)}`)
          this.toast('firmQuizzes.wasReset')
        }
        this.closeForm()
        await this.load()
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /**
     * Switch one of Advisor-e's questions off — asking first when it is the last
     * one left, because that is the case a firm can get wrong. An empty bank is
     * DROPPED, so the page still runs a quiz and the AI writes the questions.
     * @param {Object} row
     * @returns {Promise<void>}
     */
    switchOff (row) {
      if (!isLastLiveQuestion(this.rows.live, row.qid)) {
        return this.decide(row, true, 'firmQuizzes.switchedOff')
      }
      this.$buefy.dialog.confirm({
        title: this.$t('firmQuizzes.lastQuestionTitle'),
        message: this.$t('firmQuizzes.lastQuestionWarning'),
        confirmText: this.$t('firmQuizzes.switchOff'),
        cancelText: this.$t('firmQuizzes.cancel'),
        type: 'is-warning',
        onConfirm: () => this.decide(row, true, 'firmQuizzes.switchedOff')
      })
    },

    /**
     * Switch a question back on.
     * @param {Object} row
     * @returns {Promise<void>}
     */
    switchOn (row) {
      return this.decide(row, false, 'firmQuizzes.switchedOn')
    },

    /**
     * Record a switch-off / switch-on against one of Advisor-e's questions.
     * @param {Object} row
     * @param {boolean} declined
     * @param {string} messageKey - the toast to show on success
     * @returns {Promise<void>}
     */
    async decide (row, declined, messageKey) {
      this.busyId = row.qid
      try {
        await this.api(
          'PUT',
          `/api/firm-manager/quizzes/platform/${encodeURIComponent(row.qid)}/decline`,
          { declined }
        )
        this.toast(messageKey)
        await this.load()
      } catch (err) {
        // The backend's message is shown as it is: a friendlier one invented here
        // could disagree with the rule actually being enforced.
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    /** Confirm, then drop this firm's version of one of Advisor-e's questions. */
    confirmReset (row) {
      this.$buefy.dialog.confirm({
        message: this.$t('firmQuizzes.resetConfirm'),
        confirmText: this.$t('firmQuizzes.resetConfirmButton'),
        cancelText: this.$t('firmQuizzes.cancel'),
        type: 'is-warning',
        onConfirm: () => this.send(row, 'DELETE', `/api/firm-manager/quizzes/platform/${encodeURIComponent(row.qid)}`, 'firmQuizzes.wasReset')
      })
    },

    /** Confirm, then remove a question this firm added. */
    confirmRemove (row) {
      this.$buefy.dialog.confirm({
        message: this.$t('firmQuizzes.removeConfirm'),
        confirmText: this.$t('firmQuizzes.remove'),
        cancelText: this.$t('firmQuizzes.cancel'),
        type: 'is-danger',
        onConfirm: () => this.send(row, 'DELETE', `/api/firm-manager/quizzes/own/${encodeURIComponent(row.qid)}`, 'firmQuizzes.removed')
      })
    },

    /**
     * One request against one row, with the row's spinner and a reload after.
     * @param {Object} row
     * @param {string} method
     * @param {string} path
     * @param {string} messageKey
     * @returns {Promise<void>}
     */
    async send (row, method, path, messageKey) {
      this.busyId = row.qid
      try {
        await this.api(method, path)
        this.toast(messageKey)
        await this.load()
      } catch (err) {
        this.$buefy.toast.open({ message: err.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    /** @param {string} key i18n key for a success toast */
    toast (key) {
      this.$buefy.toast.open({ message: this.$t(key), type: 'is-success' })
    },

    /** True when a page's title or any of its question text matches the query. */
    pageMatches (page, q) {
      if (!q) { return true }
      if (page.title.toLowerCase().includes(q)) { return true }
      return page.entries.some(e =>
        String(e.question || '').toLowerCase().includes(q) ||
        String(e.answer || '').toLowerCase().includes(q) ||
        String(e.keyPoint || '').toLowerCase().includes(q)
      )
    },

    /**
     * A sub-section stays in the rail when it has a visible hit, or — when the
     * firm has asked to see the gaps and is not searching — when it is empty.
     */
    subVisible (sub, q) {
      if (sub.visiblePages.length) { return true }
      if (q) { return false }
      return this.showEmpty && sub.quizPageCount === 0
    },

    /** Open a page's questions in the panel. @param {Object} page rail page row */
    select (page) {
      this.currentTitle = page.title
      this.closeForm()
    },

    /**
     * Thin authenticated fetch. Mirrors the Hub's own helper so this tab can be
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
/* The rail's structure (groups, bands, accordion, chevron) is styled inside
   the shared FirmRail component. Only the rows this screen renders through
   FirmRail's slots are styled here — slot content compiles in this
   component's scope, so these rules cannot live in FirmRail. */
.rail-page {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0.3rem 0.25rem;
  font: inherit;
  border-radius: 4px;
}
.rail-page:hover { background: #f5f5f5; }
.rail-page.is-current { background: #eef6fc; font-weight: 600; }
.rail-page.is-blocked .rail-pagename { color: #7a7a7a; }
.rail-pagename { flex: 1; }
.rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }
.q { display: flex; gap: 0.75rem; padding: 0.9rem 0; border-top: 1px solid #f0f0f0; }
.q-number { color: #b5b5b5; font-variant-numeric: tabular-nums; min-width: 1.5rem; }
.q-body { flex: 1; }
.q-text { font-weight: 600; margin-bottom: 0.4rem; }
.q-field { margin-top: 0.35rem; }
.q-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a7a7a;
}
.q-value { font-size: 0.9rem; }
/* The card being edited. The tint and rule are the only thing on screen saying
   "your change applies HERE" — without them a form that replaces a card reads as
   the list having jumped. */
.q.is-editing {
  background: #f5fbff;
  border-left: 3px solid #3298dc;
  padding-left: 0.6rem;
  margin-left: -0.6rem;
  border-radius: 4px;
}
.q-editing-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3298dc;
  font-weight: 600;
}
.q-off .q-text { font-weight: 400; color: #7a7a7a; }
.q-none { padding: 1.25rem 0 0.25rem; border-top: 1px solid #f0f0f0; }
</style>

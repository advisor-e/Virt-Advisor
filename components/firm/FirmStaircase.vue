<template lang="pug">
section.firm-staircase
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmStaircase.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else-if="base")
    .level.mb-3
      .level-left
        p.has-text-weight-semibold {{ $t('firmStaircase.heading') }}
      .level-right
        b-button(
          v-if="!showForm"
          type="is-primary"
          size="is-small"
          icon-left="plus"
          @click="openForm(null)"
        ) {{ $t('firmStaircase.addStep') }}

    b-notification.mb-4(type="is-info is-light" :closable="false" style="font-size:0.85rem")
      | {{ $t('firmStaircase.notice') }}

    //- ── The live steps, in the order an advisor sees them ──────────────────
    //- Same list the advisor's selector and the engine's complexity ceiling read,
    //- so this screen can never show a firm something its advisors do not get.
    .staircase-step(
      v-for="row in rows.live"
      :key="row.id"
      :style="{ borderLeftColor: stepColour(row.step).accent, backgroundColor: stepColour(row.step).tint }"
    )
      .staircase-step-head
        //- Badge text colour comes from the tone, not a fixed white: on the lighter
        //- brand accents white is unreadable (cyan measures 2.51:1).
        span.staircase-step-badge(:style="{ backgroundColor: stepColour(row.step).accent, color: stepColour(row.step).fg }") {{ row.step }}
        span.staircase-step-title {{ $t('firmStaircase.stepLabel', { n: row.step }) }}
        b-tag(:type="badge(row.kind).type" size="is-small") {{ badge(row.kind).label }}
      p.has-text-weight-semibold.mb-1 {{ row.name }}
      p.is-size-7.mb-2(v-if="row.selectorDescription") {{ row.selectorDescription }}
      p.is-size-7.has-text-grey.mb-3
        span.has-text-weight-semibold {{ $t('firmStaircase.fieldCeiling') }}:
        |  {{ capitalise(row.complexityCeiling) }}
      .buttons.mb-0
        b-button(size="is-small" :disabled="busyId === row.id" @click="openForm(row)") {{ $t('firmStaircase.edit') }}
        b-button(
          v-if="row.kind === 'customised'"
          size="is-small"
          :disabled="busyId === row.id"
          @click="confirmReset(row.id)"
        ) {{ $t('firmStaircase.resetToPlatform') }}
        b-button(
          v-if="row.kind === 'firm-own'"
          size="is-small"
          type="is-danger is-light"
          :disabled="busyId === row.id"
          @click="confirmRemove(row.id)"
        ) {{ $t('firmStaircase.remove') }}
        b-button(
          v-else
          size="is-small"
          :loading="busyId === row.id"
          @click="switchOff(row.id)"
        ) {{ $t('firmStaircase.switchOff') }}

    //- ── Switched off ──────────────────────────────────────────────────────
    //- Below the live list and unnumbered, deliberately: these steps hold no
    //- position, and a step that simply vanished would read as data loss.
    .mt-5(v-if="rows.switchedOff.length > 0")
      p.has-text-weight-semibold.mb-1 {{ $t('firmStaircase.switchedOffHeading') }}
      p.is-size-7.has-text-grey.mb-3 {{ $t('firmStaircase.switchedOffNote') }}
      .staircase-step.staircase-step-off(v-for="row in rows.switchedOff" :key="row.id")
        .staircase-step-head
          span.staircase-step-title {{ row.name }}
          b-tag(:type="badge(row.kind).type" size="is-small") {{ badge(row.kind).label }}
        p.is-size-7.has-text-grey.mb-3(v-if="row.selectorDescription") {{ row.selectorDescription }}
        .buttons.mb-0
          b-button(
            size="is-small"
            type="is-primary is-light"
            :loading="busyId === row.id"
            @click="switchOn(row.id)"
          ) {{ $t('firmStaircase.switchOn') }}

    //- ── Add / Edit form ───────────────────────────────────────────────────
    .box.staircase-form.mt-5(v-if="showForm")
      p.has-text-weight-semibold.mb-4 {{ editing ? $t('firmStaircase.editStep') : $t('firmStaircase.newStep') }}

      b-field(:label="$t('firmStaircase.fieldName')")
        b-input(v-model="form.name" maxlength="120")

      b-field(
        :label="$t('firmStaircase.fieldDescription')"
        :message="$t('firmStaircase.fieldDescriptionHint')"
      )
        b-input(v-model="form.selectorDescription" type="textarea" rows="3")

      b-field(:label="$t('firmStaircase.fieldCeiling')" :message="$t('firmStaircase.fieldCeilingHint')")
        b-select(v-model="form.complexityCeiling")
          option(v-for="c in ceilingOptions" :key="c" :value="c") {{ capitalise(c) }}

      .field.is-grouped.mt-4
        b-button(type="is-primary" :loading="saving" @click="saveStep") {{ editing ? $t('firmStaircase.save') : $t('firmStaircase.addStep') }}
        b-button(@click="closeForm") {{ $t('firmStaircase.cancel') }}

    //- ── The one setting that is not a list of rows ────────────────────────
    //- defaultCeiling stays in the whole-config key: the switch-off / edit / add
    //- mechanism is for a list inherited from above, and a single setting is not
    //- one. Same reason Currency stays out of it.
    hr

    b-field(
      :label="$t('firmStaircase.defaultCeiling')"
      :message="$t('firmStaircase.defaultCeilingHint')"
    )
      b-select(v-model="defaultCeiling")
        option(v-for="c in ceilingOptions" :key="c" :value="c") {{ capitalise(c) }}

    b-field(grouped)
      b-button(type="is-primary" :loading="savingCeiling" @click="saveCeiling") {{ $t('firmStaircase.saveCeiling') }}
      b-button(
        type="is-light"
        :disabled="!history.length"
        @click="showHistoryModal = true"
      ) {{ $t('firmStaircase.ceilingHistory', { n: history.length }) }}

    b-modal(v-model="showHistoryModal" has-modal-card)
      .modal-card
        header.modal-card-head
          p.modal-card-title {{ $t('firmStaircase.ceilingHistoryHeading') }}
        section.modal-card-body
          p.is-size-7.has-text-grey.mb-3 {{ $t('firmStaircase.ceilingHistoryNote') }}
          b-table(:data="history" :hoverable="true")
            b-table-column(v-slot="{ row }" field="version" :label="$t('firmStaircase.historyVersion')" width="80") v{{ row.version }}
            b-table-column(v-slot="{ row }" field="saved_by" :label="$t('firmStaircase.historySavedBy')") {{ row.saved_by }}
            b-table-column(v-slot="{ row }" field="created_at" :label="$t('firmStaircase.historyDate')") {{ formatDate(row.created_at) }}
            b-table-column(v-slot="{ row }" label="" width="100")
              b-button(v-if="!row.is_active" size="is-small" @click="restoreVersion(row)") {{ $t('firmStaircase.restore') }}
              b-tag(v-else type="is-success is-light") {{ $t('firmStaircase.active') }}
        footer.modal-card-foot
          b-button(@click="showHistoryModal = false") {{ $t('firmStaircase.close') }}
</template>

<script>
/**
 * @file The Firm Manager's Advisory Staircase tab.
 *
 * Every step on this screen is a DECISION, not a text box. Until 2026-07-31 the tab
 * saved a complete copy of all five steps at once, which made a firm's staircase a
 * frozen private snapshot the moment they edited one word: a step Advisor-e added
 * later, or a wording fix it made, could never reach them, and nothing on screen
 * suggested they had stopped receiving updates. The steps now go through the one
 * firm-editable mechanism (server/utils/resolveInheritedRows.js) — switch one off,
 * edit one, add your own — so an untouched step stays current automatically.
 *
 * The default complexity ceiling is the deliberate exception and still saves whole:
 * the mechanism is for a LIST OF ROWS inherited from above, where "switch this one
 * off" means something, and a single setting is not one.
 *
 * Wording mirrors the Advisory Distinctions tab verbatim (ruled by Mike 2026-07-31)
 * so the Hub reads as one screen rather than six dialects.
 */
const { buildStaircaseRows, buildStepEdit } = require('~/utils/staircaseRows')
const { blockTone } = require('~/utils/brandTokens')

const STAIRCASE_CONFIG_KEY = 'advisory-staircase'

export default {
  name: 'FirmStaircase',

  props: {
    // The signed-in manager's token. The backend re-derives the firm from it and
    // re-checks authorisation on every call — a firm id from the browser would let
    // one firm read and edit another's configuration.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      // Advisor-e's staircase — the only place a switched-off step's wording lives,
      // and the source of the allowed ceiling values.
      base: null,
      // What this firm has decided: { declinedIds, overrides, ownRows, defaultCeiling }.
      state: { declinedIds: [], overrides: {}, ownRows: [] },
      // The firm's effective steps, resolved and renumbered by the backend.
      resolvedSteps: [],
      defaultCeiling: '',
      savingCeiling: false,
      history: [],
      showHistoryModal: false,
      // The add/edit form. `editing` holds the row being edited, or null when adding.
      showForm: false,
      editing: null,
      form: { name: '', selectorDescription: '', complexityCeiling: '' },
      saving: false,
      // The row with a request in flight, so one step's spinner never freezes the tab.
      busyId: null
    }
  },

  computed: {
    /**
     * The two lists the tab draws: the live steps, and the ones switched off.
     * @returns {{live: Array<Object>, switchedOff: Array<Object>}}
     */
    rows () {
      return buildStaircaseRows(
        this.resolvedSteps,
        this.base ? this.base.steps : [],
        this.state.declinedIds
      )
    },

    /**
     * The allowed complexity ceilings, derived from the platform base the backend
     * sends — never a hardcoded list, so a ceiling added upstream appears here.
     * @returns {string[]}
     */
    ceilingOptions () {
      if (!this.base) { return [] }
      const set = new Set(this.base.steps.map(s => s.complexityCeiling))
      set.add(this.base.defaultCeiling)
      return [...set].filter(Boolean)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read the whole picture: Advisor-e's steps, this firm's decisions, and the
     * resolved list the two produce.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/staircase')
        this.base = data.base
        this.state = {
          declinedIds: (data.state && data.state.declinedIds) || [],
          overrides: (data.state && data.state.overrides) || {},
          ownRows: (data.state && data.state.ownRows) || []
        }
        this.resolvedSteps = data.resolved || []
        this.defaultCeiling = data.defaultCeiling || (data.base && data.base.defaultCeiling) || ''
        await this.loadHistory()
      } catch (e) {
        this.error = this.$t('firmStaircase.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Version history for the whole-config key — which now records the default
     * ceiling only, the steps having moved to their own keys.
     * @returns {Promise<void>}
     */
    async loadHistory () {
      try {
        const hist = await this.api(
          'GET', `/api/firm-manager/framework/history?configKey=${STAIRCASE_CONFIG_KEY}`
        )
        this.history = hist.history || []
      } catch (e) {
        // A missing history is not a reason to fail the screen — the steps and the
        // ceiling are still readable and editable without it.
        this.history = []
      }
    },

    /** Advisor-e's current version of a step, or null for a step the firm owns. */
    platformStep (id) {
      if (!this.base) { return null }
      return this.base.steps.find(s => s && s.id === id) || null
    },

    /**
     * Open the form to add a step, or to edit one.
     * @param {Object|null} row - the row to edit, or null to add
     */
    openForm (row) {
      this.editing = row || null
      this.form = row
        ? {
            name: row.name || '',
            selectorDescription: row.selectorDescription || '',
            complexityCeiling: row.complexityCeiling || (this.base && this.base.defaultCeiling) || ''
          }
        : {
            name: '',
            selectorDescription: '',
            complexityCeiling: (this.base && this.base.defaultCeiling) || ''
          }
      this.showForm = true
    },

    closeForm () {
      this.showForm = false
      this.editing = null
    },

    /**
     * Save the form. Three different things can happen, and which one is not a
     * detail — see buildStepEdit: an edit to one of Advisor-e's steps sends ONLY
     * the fields that changed, so the rest keep tracking Advisor-e's wording.
     * @returns {Promise<void>}
     */
    async saveStep () {
      const name = (this.form.name || '').trim()
      if (!name) {
        this.$buefy.toast.open({ message: this.$t('firmStaircase.nameRequired'), type: 'is-warning' })
        return
      }

      const row = this.editing
      const isOwn = !row || row.kind === 'firm-own'
      const platform = (row && !isOwn) ? this.platformStep(row.id) : null
      const { action, body } = buildStepEdit(this.form, platform, row && row.kind === 'customised')

      this.saving = true
      try {
        if (!row) {
          await this.api('POST', '/api/firm-manager/staircase/own', body)
          this.toast('firmStaircase.stepAdded')
        } else if (isOwn) {
          await this.api('PUT', `/api/firm-manager/staircase/own/${encodeURIComponent(row.id)}`, body)
          this.toast('firmStaircase.stepSaved')
        } else if (action === 'save') {
          await this.api('PUT', `/api/firm-manager/staircase/platform/${encodeURIComponent(row.id)}`, body)
          this.toast('firmStaircase.stepSaved')
        } else if (action === 'reset') {
          // Every field is back to Advisor-e's wording — dropping the override is the
          // only thing that restores the tracking they are asking for.
          await this.api('DELETE', `/api/firm-manager/staircase/platform/${encodeURIComponent(row.id)}`)
          this.toast('firmStaircase.wasReset')
        }
        this.closeForm()
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.saving = false
      }
    },

    /**
     * Switch one of Advisor-e's steps off for this firm. The step is not deleted —
     * switching it back on returns Advisor-e's current wording for it.
     * @param {string} id - a platform step id
     * @returns {Promise<void>}
     */
    async switchOff (id) {
      // The backend refuses to leave a firm with no steps at all and says why. Its
      // message is shown as it is: a friendlier one invented here could disagree with
      // the rule actually being enforced.
      await this.decide(id, true, 'firmStaircase.switchedOff')
    },

    /**
     * Switch a step back on.
     * @param {string} id - a platform step id
     * @returns {Promise<void>}
     */
    async switchOn (id) {
      await this.decide(id, false, 'firmStaircase.switchedOn')
    },

    async decide (id, declined, messageKey) {
      this.busyId = id
      try {
        await this.api(
          'PUT', `/api/firm-manager/staircase/platform/${encodeURIComponent(id)}/decline`, { declined }
        )
        this.toast(messageKey)
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    confirmReset (id) {
      this.$buefy.dialog.confirm({
        message: this.$t('firmStaircase.resetConfirm'),
        type: 'is-warning',
        confirmText: this.$t('firmStaircase.resetConfirmButton'),
        cancelText: this.$t('firmStaircase.cancel'),
        onConfirm: () => this.resetStep(id)
      })
    },

    /**
     * Drop this firm's version of a platform step so Advisor-e's applies again — and
     * keeps applying as Advisor-e changes it.
     * @param {string} id - a platform step id
     * @returns {Promise<void>}
     */
    async resetStep (id) {
      this.busyId = id
      try {
        await this.api('DELETE', `/api/firm-manager/staircase/platform/${encodeURIComponent(id)}`)
        this.toast('firmStaircase.wasReset')
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    confirmRemove (id) {
      this.$buefy.dialog.confirm({
        message: this.$t('firmStaircase.removeConfirm'),
        type: 'is-danger',
        confirmText: this.$t('firmStaircase.remove'),
        cancelText: this.$t('firmStaircase.cancel'),
        onConfirm: () => this.removeStep(id)
      })
    },

    /**
     * Remove a step this firm added. Only a firm's own step can be removed — one of
     * Advisor-e's is switched off, never deleted, so it can come back.
     * @param {string} id - a firm step id
     * @returns {Promise<void>}
     */
    async removeStep (id) {
      this.busyId = id
      try {
        await this.api('DELETE', `/api/firm-manager/staircase/own/${encodeURIComponent(id)}`)
        this.toast('firmStaircase.removed')
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    /**
     * Save the default complexity ceiling. The steps are NOT sent: posting them here
     * is what used to freeze a firm's staircase into a private copy.
     * @returns {Promise<void>}
     */
    async saveCeiling () {
      this.savingCeiling = true
      try {
        await this.api('POST', '/api/firm-manager/staircase', {
          staircase: { defaultCeiling: this.defaultCeiling }
        })
        this.toast('firmStaircase.ceilingSaved')
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.savingCeiling = false
      }
    },

    /**
     * Restore an earlier saved version of the ceiling setting.
     * @param {Object} row - a history row
     * @returns {Promise<void>}
     */
    async restoreVersion (row) {
      try {
        const res = await this.api('POST', '/api/firm-manager/framework/restore', {
          configKey: STAIRCASE_CONFIG_KEY,
          versionId: row.id
        })
        this.$buefy.toast.open({
          message: this.$t('firmStaircase.restored', { v: res.version }),
          type: 'is-success'
        })
        this.showHistoryModal = false
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    /** Badge label + Buefy tag type for a row's kind. Mirrors the Distinctions tab. */
    badge (kind) {
      switch (kind) {
        case 'customised': return { label: this.$t('firmStaircase.tagCustomised'), type: 'is-success' }
        case 'declined': return { label: this.$t('firmStaircase.tagSwitchedOff'), type: 'is-warning is-light' }
        case 'firm-own': return { label: this.$t('firmStaircase.tagFirm'), type: 'is-primary is-light' }
        default: return { label: this.$t('firmStaircase.tagPlatform'), type: 'is-light' }
      }
    },

    /** Per-step accent colour, cycling if a firm ever has more steps than tones. */
    stepColour (stepNum) {
      return blockTone((Number(stepNum) || 1) - 1)
    },

    toast (key) {
      this.$buefy.toast.open({ message: this.$t(key), type: 'is-success' })
    },

    formatDate (iso) {
      return iso ? new Date(iso).toLocaleDateString() : ''
    },

    capitalise (s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
    },

    /**
     * Thin authenticated fetch — mirrors FirmDomainSupport's helper so this tab can
     * be mounted and tested on its own; the backend re-checks authorisation on every
     * call regardless of what the browser sends.
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
/* Colour-coded, compact per-step blocks (avoid map-shock — steps blending into
   one). Tones come from the brand palette; see utils/brandTokens.js. */
.staircase-step {
  padding: 0.7rem 0.9rem;
  margin-bottom: 0.6rem;
  border-left: 4px solid #dbdbdb;
  border-radius: 5px;
}
.staircase-step-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.staircase-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  /* Colour is set inline per step from the tone. It is not fixed white: white
     fails AA on the lighter brand accents. */
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.staircase-step-title { font-weight: 600; color: #363636; }

/* Switched off — muted, and carrying no accent colour, so the live list reads as
   the staircase and these read as set aside. Matches .distinction-off. */
.staircase-step-off {
  background: #fafafa;
  opacity: 0.65;
}

.staircase-form { border: 1px solid #dbdbdb; }
</style>

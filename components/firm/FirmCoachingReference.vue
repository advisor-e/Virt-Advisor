<template lang="pug">
section.firm-coaching
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmCoaching.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else-if="base.length")
    .level.mb-3
      .level-left
        p.has-text-weight-semibold {{ $t('firmCoaching.heading') }}
      .level-right
        //- Always offered. It used to hide whenever a form was open on the sibling
        //- tabs, which made a button vanishing at the top the only visible response
        //- to clicking Edit — the one cue on screen, and it read as a fault.
        b-button(
          type="is-primary"
          size="is-small"
          icon-left="plus"
          @click="openForm(null)"
        ) {{ $t('firmCoaching.addEntry') }}

    b-notification.mb-4(type="is-info is-light" :closable="false" style="font-size:0.85rem")
      | {{ $t('firmCoaching.notice') }}

    //- ── The live entries, in the order the model is coached by them ────────
    //- Closed by default and opened where you click. Fifteen entries of five prose
    //- fields is a wall of text laid flat — a different content volume from the
    //- Advisory Staircase's short steps, and the layout follows the content rather
    //- than the sibling tab. Approved against design/mockups/firm-coaching-reference.html.
    .coach-row(
      v-for="row in rows.live"
      :key="row.id"
      :class="rowClass(row)"
    )
      button.coach-head(type="button" @click="toggle(row)")
        span.coach-chev(aria-hidden="true")
        span.coach-name {{ row.template }}
        span.coach-sum(v-if="!isOpen(row)") {{ summary(row) }}
        b-tag(:type="badge(row.kind).type" size="is-small") {{ badge(row.kind).label }}

      //- Editing happens HERE, in the entry, not in a form at the foot of the panel.
      //- Ruled by Mike 2026-08-01: every tab behaves the way Quizzes does, so a
      //- manager never has to work out what a given tab did with the button they
      //- pressed.
      .coach-body(v-if="isEditing(row)")
        p.coach-editing-label.mb-3 {{ $t('firmCoaching.editEntry') }}
        firm-coaching-entry-form(
          v-model="form"
          :saving="saving"
          :own="row.kind === 'firm-own'"
          :submit-label="$t('firmCoaching.save')"
          @save="saveEntry(row)"
          @cancel="closeForm"
        )

      .coach-body(v-else-if="isOpen(row)")
        .coach-field
          label {{ $t('firmCoaching.fieldHowItHelps') }}
          p(v-if="row.howItHelps") {{ row.howItHelps }}
          p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}
        .coach-field
          label {{ $t('firmCoaching.fieldWhatToLookFor') }}
          p(v-if="row.whatToLookFor") {{ row.whatToLookFor }}
          p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}
        .coach-field
          label {{ $t('firmCoaching.fieldWhereMayLead') }}
          p(v-if="row.whereMayLead") {{ row.whereMayLead }}
          p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}
        .coach-field
          label {{ $t('firmCoaching.fieldDeliveryNotes') }}
          p(v-if="row.deliveryNotes") {{ row.deliveryNotes }}
          p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}
        .coach-field
          label {{ $t('firmCoaching.fieldScenarios') }}
          ul(v-if="row.scenarios && row.scenarios.length")
            li(v-for="(s, i) in row.scenarios" :key="i") {{ s }}
          p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}

        .buttons.mb-0
          b-button(size="is-small" :disabled="busyId === row.id" @click="openForm(row)") {{ $t('firmCoaching.edit') }}
          b-button(
            v-if="row.kind === 'customised'"
            size="is-small"
            :disabled="busyId === row.id"
            @click="confirmReset(row.id)"
          ) {{ $t('firmCoaching.resetToPlatform') }}
          b-button(
            v-if="row.kind === 'firm-own'"
            size="is-small"
            type="is-danger is-light"
            :disabled="busyId === row.id"
            @click="confirmRemove(row.id)"
          ) {{ $t('firmCoaching.remove') }}
          b-button(
            v-else
            size="is-small"
            :loading="busyId === row.id"
            @click="switchOff(row.id)"
          ) {{ $t('firmCoaching.switchOff') }}

    //- ── Switched off ──────────────────────────────────────────────────────
    //- Below the live list, deliberately: an entry that simply vanished would read
    //- as data loss.
    .mt-5(v-if="rows.switchedOff.length > 0")
      p.has-text-weight-semibold.mb-1 {{ $t('firmCoaching.switchedOffHeading') }}
      p.is-size-7.has-text-grey.mb-3 {{ $t('firmCoaching.switchedOffNote') }}
      .coach-row.coach-row--off(v-for="row in rows.switchedOff" :key="row.id")
        button.coach-head(type="button" @click="toggle(row)")
          span.coach-chev(aria-hidden="true")
          span.coach-name {{ row.template }}
          span.coach-sum(v-if="!isOpen(row)") {{ summary(row) }}
          b-tag(:type="badge(row.kind).type" size="is-small") {{ badge(row.kind).label }}
          //- The SAME Customised tag the live list uses, and it earns its place here:
          //- this row shows Advisor-e's wording, so without it a firm has no way to
          //- tell that its own version is still being held behind the entry.
          b-tag(v-if="row.hasFirmEdit" :type="badge('customised').type" size="is-small") {{ badge('customised').label }}
        .coach-body(v-if="isOpen(row)")
          .coach-field
            label {{ $t('firmCoaching.fieldHowItHelps') }}
            p(v-if="row.howItHelps") {{ row.howItHelps }}
            p.coach-empty(v-else) {{ $t('firmCoaching.emptyField') }}
          .buttons.mb-0
            b-button(
              size="is-small"
              type="is-primary is-light"
              :loading="busyId === row.id"
              @click="switchOn(row.id)"
            ) {{ $t('firmCoaching.switchOn') }}
            //- Reset without switching on first. The route only drops the override and
            //- never touches the declines key, so the entry stays off — it just stops
            //- carrying the firm's version. Offered only where there IS one.
            b-button(
              v-if="row.hasFirmEdit"
              size="is-small"
              :disabled="busyId === row.id"
              @click="confirmReset(row.id)"
            ) {{ $t('firmCoaching.resetToPlatform') }}

    //- ── Add form ──────────────────────────────────────────────────────────
    //- Only for a NEW entry, and at the end of the list on purpose: that is where the
    //- entry itself will appear. An EDIT never renders here — it happens in the entry
    //- being edited, above.
    .box.coach-form.mt-5(v-if="showForm && !editing")
      p.has-text-weight-semibold.mb-4 {{ $t('firmCoaching.newEntry') }}
      firm-coaching-entry-form(
        v-model="form"
        :saving="saving"
        :own="true"
        :submit-label="$t('firmCoaching.addEntry')"
        @save="saveEntry(null)"
        @cancel="closeForm"
      )
</template>

<script>
/**
 * FirmCoachingReference — the Firm Manager tab for the coaching reference.
 *
 * ITEM 4.9's VISIBLE HALF. The engine half shipped 2026-08-15 (`869909c`): the fifteen
 * entries in `data/coaching-reference.json` resolve down every tier through the one
 * firm-editable mechanism. Nothing could make a decision for it to resolve, because
 * there was no screen. This is that screen, built from the owner-approved
 * `design/mockups/firm-coaching-reference.html`.
 *
 * WHAT THESE ENTRIES ARE. They are the guidance the model reads when it chooses which
 * template to put in front of a client — not something an adviser ever sees. That is
 * why the switched-off note says "the AI is not coached by these entries" rather than
 * the staircase's "your advisors are not offered these steps".
 *
 * 🔴 WHAT THIS TAB IS NOT. It does not touch the `coaching-reference` config key, which
 * holds a firm's PROMOTED CASE OBSERVATIONS — an adviser's own free text about a real
 * client, which reaches the model FENCED as untrusted. Those are not inherited, not
 * overridable, and not shown here. See the header of
 * `server/utils/firmCoachingReference.js` for why folding the two together would be a
 * prompt-injection hole rather than a tidy-up.
 *
 * THREE THINGS THE STAIRCASE HAS THAT THIS DELIBERATELY DOES NOT, each approved as
 * absent by Mike on 2026-08-15 against the mockup:
 *   - no "platform updated this entry" badge and no Adopt / Keep mine panel, because
 *     coachingConfig stores no drift baseline and a badge with no stamp behind it is a
 *     light that can never come on;
 *   - no version history, which on the staircase belongs to its one scalar setting;
 *   - no template picker on the firm's own entries — the template is free text for now,
 *     and whether it becomes a list to pick from is an open question, not an oversight.
 *
 * The rows are CLOSED BY DEFAULT and open where you click. That is the one place this
 * tab departs from its siblings' layout, and it follows the content: five prose fields
 * across fifteen entries is a different volume from the staircase's short steps, and a
 * layout borrowed from another tab has to be re-checked against THIS tab's content.
 */
import FirmCoachingEntryForm from '~/components/firm/FirmCoachingEntryForm.vue'
const {
  buildCoachingRows, buildCoachingEdit, buildOwnCoachingBody
} = require('~/utils/coachingRows')

/** How much of an entry's opening line a closed row shows. */
const SUMMARY_LENGTH = 90

export default {
  name: 'FirmCoachingReference',

  components: { FirmCoachingEntryForm },

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
      // Advisor-e's entries — the only place a switched-off entry's wording lives.
      base: [],
      // What this firm has decided: { declinedIds, overrides, ownRows }.
      state: { declinedIds: [], overrides: {}, ownRows: [] },
      // The firm's effective entries, resolved by the backend.
      resolved: [],
      // Which rows are open, keyed by id. Nothing is open on arrival.
      opened: {},
      // The add/edit form. `editing` holds the row being edited, or null when adding.
      showForm: false,
      editing: null,
      form: this.emptyForm(),
      saving: false,
      // The row with a request in flight, so one entry's spinner never freezes the tab.
      busyId: null
    }
  },

  computed: {
    /**
     * The two lists the tab draws: the live entries, and the ones switched off.
     * @returns {{live: Array<Object>, switchedOff: Array<Object>}}
     */
    rows () {
      return buildCoachingRows(
        this.resolved,
        this.base,
        this.state.declinedIds,
        Object.keys(this.state.overrides || {})
      )
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** A blank form. Declared as a method so data() and closeForm() share one shape. */
    emptyForm () {
      return {
        template: '',
        howItHelps: '',
        whatToLookFor: '',
        whereMayLead: '',
        deliveryNotes: '',
        scenarios: []
      }
    },

    /**
     * Read the whole picture: Advisor-e's entries, this firm's decisions, and the
     * resolved list the two produce.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/coaching')
        this.base = data.base || []
        this.state = {
          declinedIds: (data.state && data.state.declinedIds) || [],
          overrides: (data.state && data.state.overrides) || {},
          ownRows: (data.state && data.state.ownRows) || []
        }
        this.resolved = data.resolved || []
      } catch (e) {
        this.error = this.$t('firmCoaching.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /** Is this row open? Keyed on id, which is identity and never a position. */
    isOpen (row) {
      return !!(row && this.opened[row.id])
    },

    /** Open or close a row. An open row being edited stays open. */
    toggle (row) {
      if (!row) { return }
      if (this.isEditing(row)) { return }
      this.$set(this.opened, row.id, !this.opened[row.id])
    },

    /** True when this exact entry is the one open for editing. */
    isEditing (row) {
      return !!(this.showForm && this.editing && row && this.editing.id === row.id)
    },

    /** Advisor-e's current version of an entry, or null for one the firm owns. */
    platformRow (id) {
      return this.base.find(r => r && r.id === id) || null
    },

    /** The opening words of an entry, for a closed row. */
    summary (row) {
      const text = (row && row.howItHelps) || ''
      if (!text) { return '' }
      return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH).trim()}…` : text
    },

    rowClass (row) {
      return {
        'coach-row--open': this.isOpen(row) || this.isEditing(row),
        'coach-row--editing': this.isEditing(row),
        'coach-row--customised': row.kind === 'customised',
        'coach-row--own': row.kind === 'firm-own'
      }
    },

    /**
     * Open the form — on an existing entry, or empty for a new one.
     * @param {Object|null} row - the entry to edit, or null to add
     */
    openForm (row) {
      this.editing = row
      this.form = row
        ? {
            template: row.template || '',
            howItHelps: row.howItHelps || '',
            whatToLookFor: row.whatToLookFor || '',
            whereMayLead: row.whereMayLead || '',
            deliveryNotes: row.deliveryNotes || '',
            // Copied, never referenced: editing the form must not mutate the row the
            // list is drawing, or a cancelled edit would leave its changes on screen.
            scenarios: Array.isArray(row.scenarios) ? [...row.scenarios] : []
          }
        : this.emptyForm()
      if (row) { this.$set(this.opened, row.id, true) }
      this.showForm = true
    },

    closeForm () {
      this.showForm = false
      this.editing = null
      this.form = this.emptyForm()
    },

    /**
     * Save an add or an edit.
     *
     * An edit to one of Advisor-e's entries sends ONLY the fields that differ from
     * Advisor-e's current wording — a recorded field stops tracking it for good, so
     * posting the whole form would freeze the fields the firm never touched. An entry
     * the firm owns has nothing to track and is sent whole.
     *
     * @param {Object|null} row - the entry being edited, or null when adding
     * @returns {Promise<void>}
     */
    async saveEntry (row) {
      const isOwn = !row || row.kind === 'firm-own'

      if (isOwn && !String(this.form.template || '').trim()) {
        this.$buefy.toast.open({ message: this.$t('firmCoaching.templateRequired'), type: 'is-danger' })
        return
      }

      this.saving = true
      try {
        if (!row) {
          await this.api('POST', '/api/firm-manager/coaching/own', buildOwnCoachingBody(this.form))
          this.toast('firmCoaching.entryAdded')
        } else if (row.kind === 'firm-own') {
          await this.api(
            'PUT', `/api/firm-manager/coaching/own/${encodeURIComponent(row.id)}`,
            buildOwnCoachingBody(this.form)
          )
          this.toast('firmCoaching.entrySaved')
        } else {
          const { action, body } = buildCoachingEdit(
            this.form, this.platformRow(row.id), row.kind === 'customised'
          )
          if (action === 'save') {
            await this.api(
              'PUT', `/api/firm-manager/coaching/platform/${encodeURIComponent(row.id)}`, body
            )
            this.toast('firmCoaching.entrySaved')
          } else if (action === 'reset') {
            // Every field is back to Advisor-e's wording — dropping the override is the
            // only thing that restores the tracking they are asking for.
            await this.api(
              'DELETE', `/api/firm-manager/coaching/platform/${encodeURIComponent(row.id)}`
            )
            this.toast('firmCoaching.wasReset')
          }
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
     * Switch one of Advisor-e's entries off for this firm. Neither the entry NOR the
     * firm's edit of it is deleted: only the declines list is written, so switching
     * back on returns the firm's own wording if it had any.
     * @param {string} id - a platform entry id
     * @returns {Promise<void>}
     */
    async switchOff (id) {
      // The backend refuses to leave a firm with no entries at all and says why. Its
      // message is shown as it is: a friendlier one invented here could disagree with
      // the rule actually being enforced.
      await this.decide(id, true, 'firmCoaching.switchedOffToast')
    },

    /**
     * Switch an entry back on.
     * @param {string} id - a platform entry id
     * @returns {Promise<void>}
     */
    async switchOn (id) {
      await this.decide(id, false, 'firmCoaching.switchedOnToast')
    },

    async decide (id, declined, messageKey) {
      this.busyId = id
      try {
        await this.api(
          'PUT', `/api/firm-manager/coaching/platform/${encodeURIComponent(id)}/decline`, { declined }
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
        message: this.$t('firmCoaching.resetConfirm'),
        confirmText: this.$t('firmCoaching.resetConfirmButton'),
        cancelText: this.$t('firmCoaching.cancel'),
        onConfirm: () => this.resetEntry(id)
      })
    },

    async resetEntry (id) {
      this.busyId = id
      try {
        await this.api('DELETE', `/api/firm-manager/coaching/platform/${encodeURIComponent(id)}`)
        this.toast('firmCoaching.wasReset')
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    confirmRemove (id) {
      this.$buefy.dialog.confirm({
        message: this.$t('firmCoaching.removeConfirm'),
        confirmText: this.$t('firmCoaching.remove'),
        cancelText: this.$t('firmCoaching.cancel'),
        type: 'is-danger',
        onConfirm: () => this.removeEntry(id)
      })
    },

    async removeEntry (id) {
      this.busyId = id
      try {
        await this.api('DELETE', `/api/firm-manager/coaching/own/${encodeURIComponent(id)}`)
        this.toast('firmCoaching.removed')
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.busyId = null
      }
    },

    /** Badge label + Buefy tag type for a row's kind. Mirrors the sibling tabs. */
    badge (kind) {
      switch (kind) {
        case 'customised': return { label: this.$t('firmCoaching.tagCustomised'), type: 'is-success' }
        case 'declined': return { label: this.$t('firmCoaching.tagSwitchedOff'), type: 'is-warning is-light' }
        case 'firm-own': return { label: this.$t('firmCoaching.tagFirm'), type: 'is-primary is-light' }
        default: return { label: this.$t('firmCoaching.tagPlatform'), type: 'is-light' }
      }
    },

    toast (key) {
      this.$buefy.toast.open({ message: this.$t(key), type: 'is-success' })
    },

    /**
     * Thin authenticated fetch — mirrors FirmStaircase's helper so this tab can be
     * mounted and tested on its own; the backend re-checks authorisation on every call
     * regardless of what the browser sends.
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
/* An expand/collapse row, drawn as one object: the header joins the panel it opens.
   Same idiom as FirmRail's accordion, so the Hub reads as one screen. */
.coach-row {
  border: 1px solid #dbdbdb;
  border-left: 4px solid #002b64;
  border-radius: 5px;
  margin-bottom: 0.6rem;
  background: #fff;
}
.coach-row--customised { border-left-color: #0070c0; }
.coach-row--own { border-left-color: #4ca52d; }
.coach-row--editing { border-left-color: #00b1e0; background: #fbfeff; }
.coach-row--off { border-left-color: #dbdbdb; background: #fafafa; }

.coach-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.9rem;
  background: none;
  border: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.coach-head:hover { background: #fafcfe; }
.coach-head:focus-visible { outline: 2px solid #00b1e0; outline-offset: -2px; }

/* The disclosure arrow, drawn with borders so it renders under any font — this app
   loads no icon font, so a <b-icon> here would render as nothing. */
.coach-chev {
  flex-shrink: 0;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid #4a4a4a;
  transition: transform 0.15s ease;
  transform-origin: 3px 50%;
}
.coach-row--open .coach-chev { transform: rotate(90deg); }

.coach-name {
  font-weight: 600;
  color: #002b64;
  flex-shrink: 0;
}
/* The opening words of the entry, so a closed list is still readable. Truncated
   rather than wrapped: a closed row must stay one line high or fifteen of them stop
   being a list. */
.coach-sum {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  color: #7a7a7a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coach-body {
  padding: 0.15rem 0.9rem 0.9rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.coach-editing-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #0070c0;
}

.coach-field { display: flex; flex-direction: column; gap: 0.15rem; }
.coach-field label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a7a7a;
}
.coach-field p { font-size: 0.88rem; max-width: 78ch; }
.coach-field ul {
  font-size: 0.88rem;
  padding-left: 1.25rem;
  list-style: disc;
}
.coach-empty { color: #7a7a7a; font-style: italic; }

@media (max-width: 640px) {
  .coach-sum { display: none; }
}
</style>

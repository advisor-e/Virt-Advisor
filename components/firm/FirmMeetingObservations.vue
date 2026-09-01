<template lang="pug">
.mobs
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | What your advisors are checked on in each kind of meeting. Advisors see this list
      |  #[b before they walk in], and their own coaching notes are checked against it
      |  afterwards — every finding quoting what was said, or saying plainly that it did
      |  not happen.

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    .mobs-pick.mb-4
      b-field(label="Meeting type" label-position="on-border")
        b-select(v-model="scenarioId" expanded)
          option(v-for="s in scenarios" :key="s.id" :value="s.id") {{ s.name }}
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium") You have changed this list
      b-tag(v-else type="is-light" size="is-medium") Everything is inherited

    .box(v-if="current")
      h4.title.is-6.mb-1 What we check
      p.is-size-7.has-text-grey.mb-4
        | Each one is a question the software looks for in the transcript and answers with a
        |  quotation, or with #[b not found]. Write them so an answer would be something
        |  somebody said.

      p.is-size-7.has-text-grey.py-4(v-if="!current.points.length")
        | Nothing is checked in this kind of meeting yet. Add the first point below, and every
        |  advisor here will see it before their next meeting of this type.

      .mobs-row(v-for="p in current.points" :key="p.id")
        .mobs-text
          template(v-if="editingId === p.id")
            b-input(
              v-model="draft"
              type="textarea"
              rows="2"
              :maxlength="maxPointLength"
              size="is-small")
            .buttons.are-small.mt-2
              b-button(type="is-primary" :loading="saving" @click="saveEdit(p)") Save
              b-button(type="is-light" @click="cancelEdit") Cancel
          template(v-else)
            p {{ p.text }}
            p.is-size-7.has-text-grey(v-if="p.advisorText") Advisor sees: {{ p.advisorText }}
        .mobs-source
          b-tag(:type="sourceTag(p.source)" size="is-small") {{ sourceLabel(p.source) }}
        .mobs-acts(v-if="editingId !== p.id")
          b-button(size="is-small" type="is-text" @click="startEdit(p)") Edit
          //- Reset is offered only where there is something of ours to drop.
          b-button(
            v-if="p.source === 'edited-here'"
            size="is-small"
            type="is-text"
            :loading="saving"
            @click="resetPoint(p)") Use the inherited wording
          b-button(
            v-if="p.source === 'added-here'"
            size="is-small"
            type="is-text"
            :loading="saving"
            @click="confirmDelete(p)") Remove
          b-button(
            v-else
            size="is-small"
            type="is-text"
            :loading="saving"
            @click="decline(p, true)") Switch off

      //- Points switched off are shown rather than hidden: a manager who cannot see what
      //- they turned off cannot turn it back on, and would read the shorter list as the
      //- whole list.
      .mobs-off(v-if="declinedHere.length")
        p.is-size-7.has-text-weight-semibold.mb-2 Switched off here
        .mobs-row(v-for="p in declinedHere" :key="p.id")
          .mobs-text
            p.has-text-grey {{ p.text }}
          .mobs-source
            b-tag(type="is-light" size="is-small") off
          .mobs-acts
            b-button(size="is-small" type="is-text" :loading="saving" @click="decline(p, false)") Switch back on

      b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

      .mobs-add.mt-4(v-if="adding")
        b-field(label="A new point" label-position="on-border")
          b-input(
            v-model="draft"
            type="textarea"
            rows="2"
            :maxlength="maxPointLength"
            placeholder="Understanding was checked before moving on from the figures."
            size="is-small")
        .buttons.are-small
          b-button(type="is-primary" :loading="saving" @click="addPoint") Add this point
          b-button(type="is-light" @click="cancelAdd") Cancel

      .buttons.mt-4(v-else)
        b-button(type="is-light" @click="startAdd") Add a point
        b-button(type="is-text" @click="toggleHistory") {{ showHistory ? 'Hide change history' : 'Change history' }}

    //- ── The retention dial (slice 2) ──────────────────────────────────
    //- ⚠ THE FIGURE HERE IS SPOKEN ALOUD TO A CLIENT. The consent wording is fixed and a
    //- firm may not edit it, but it quotes this number back — so a change here alters a
    //- sentence an advisor says in a real meeting tomorrow. That is why the warning is on
    //- the screen and not only in the code.
    .box
      h4.title.is-6.mb-1 How long transcripts are kept
      p.is-size-7.has-text-grey.mb-4
        | The recording is always deleted as soon as it becomes a transcript. This sets how
        |  long the transcript itself is kept.
        |  #[b Your advisors say this figure out loud to the client]
        |  when they ask permission to record, so it changes what they promise.

      b-message(v-if="retentionError" type="is-danger" size="is-small") {{ retentionError }}

      b-field(grouped)
        b-field(label="Months" label-position="on-border")
          b-input(
            v-model.number="retentionDraft"
            type="number"
            :min="retentionMin"
            :max="retentionMax"
            size="is-small"
            style="max-width: 8rem")
        b-field
          b-tag(:type="retentionSetHere ? 'is-info is-light' : 'is-light'" size="is-medium")
            | {{ retentionSetHere ? 'Set here' : 'Inherited — ' + retentionPhrase }}

      .buttons.are-small.mt-2
        b-button(type="is-primary" :loading="savingRetention" @click="saveRetention") Save this period
        b-button(
          v-if="retentionSetHere"
          type="is-light"
          :loading="savingRetention"
          @click="resetRetention") Use the inherited period

    .box(v-if="showHistory")
      p.has-text-weight-semibold.mb-2 Change history
      p.is-size-7.has-text-grey(v-if="!historyRows.length") Nothing has been saved at this level yet.
      table.table.is-fullwidth.is-narrow(v-else)
        tbody
          tr(v-for="h in historyRows" :key="h.part + '-' + h.id")
            td.is-size-7 {{ partLabel(h.part) }}
            td Version {{ h.version }}
            td.is-size-7.has-text-grey {{ h.saved_by }}
            td.is-size-7.has-text-grey {{ h.created_at }}
            td.has-text-right
              b-button(size="is-small" type="is-light" @click="restore(h)") Restore
</template>

<script>
/**
 * FirmMeetingObservations — the tab a mentor or a firm manager sets the Meeting Review
 * observation points on.
 *
 * Asked for by Mike 2026-09-01. Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` **Stage A**, approved 2026-09-01.
 *
 * 🔴 WHY THESE WORDS MATTER MORE THAN A LABEL. Brief §1: asking a model "how did this
 * advisor perform?" produces fluent invention, while asking it "quote where they framed
 * the meeting, or answer NOT FOUND" is a search with a citation. The points on this screen
 * ARE that question, so everything the advisor's coaching notes can honestly say is a
 * consequence of what a manager types here. That is also why they get a screen at all
 * rather than living in a prompt builder — `CLAUDE.md`, the hub-page rule.
 *
 * 🔴 IT SHOWS WHERE EVERY POINT CAME FROM, not just what it says. A level holds only its
 * own changes (`tier-cascade.md` P3), so a point reading "inherited" keeps receiving the
 * level above's corrections and one reading "edited here" is protected from them. Without
 * the badge those two look identical and are not the same thing.
 *
 * ⚠ THREE DELIBERATE DIFFERENCES FROM THE APPROVED DRAWING, recorded here because
 * `CLAUDE.md` requires every deviation to be named rather than discovered later:
 *
 *   1. **The reference-material half of Stage A is not built.** The drawing pairs the
 *      points with a firm's uploaded scripts ("How we do it here"). The upload itself
 *      already exists — `uploadDocument` in `server/routes/firmManager.js` — but the JOIN
 *      between a document and a set of observation points does not, and the drawing's own
 *      note calls that join "the actual new work". It is deferred rather than faked: a
 *      section that looked live and stored nothing would be worse than its absence.
 *   2. **A meeting-type picker was added.** The drawing shows one scenario; there are
 *      eleven, taken from the logic trees (Brief P12), so something has to choose between
 *      them.
 *   3. **Edit / switch off / remove controls were added per point.** The drawing shows the
 *      points and an "Add a point" button only. The Brief has a firm editing the platform's
 *      list, which cannot be done with an add button alone.
 *
 * ⚠ ENGLISH IS HARDCODED HERE, matching every other tab in this hub — the hub's copy is a
 * single existing i18n item rather than a per-tab one (see the note on `HUB_TITLES` in
 * `FirmManagerHub.vue`). The consent wording, which is the text that actually must not
 * drift, is not on this screen and is not built yet.
 *
 * Vue 2 Options API, Pug, Buefy — no exceptions to the house rules.
 */
export default {
  name: 'FirmMeetingObservations',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      saving: false,
      loadError: '',
      saveError: '',
      showHistory: false,
      history: {},
      /** Every meeting scenario with the points in force at this level. */
      scenarios: [],
      /** What THIS level has decided: `{ declines, overrides, own }`. */
      own: { declines: {}, overrides: {}, own: {} },
      /** What this level would see if it had decided nothing — keyed by scenario id. */
      inherited: {},
      scenarioId: '',
      maxPointLength: 300,
      /** The point being edited, or '' when none is. */
      editingId: '',
      adding: false,
      draft: '',
      /**
       * The retention dial (slice 2). Held separately from the points because it is a
       * different storage key and a different kind of decision — a scalar this level either
       * sets or inherits, not a list of rows.
       */
      savingRetention: false,
      retentionError: '',
      retentionDraft: 18,
      retentionPhrase: '',
      retentionSetHere: false,
      retentionMin: 1,
      retentionMax: 120
    }
  },

  computed: {
    /** The scenario on screen. */
    current () {
      return this.scenarios.filter(s => s.id === this.scenarioId)[0] || null
    },

    /** Has this level decided anything, on any scenario? Drives the badge at the top. */
    hasOwn () {
      const o = this.own || {}
      return Object.keys(o.declines || {}).length > 0 ||
        Object.keys(o.overrides || {}).length > 0 ||
        Object.keys(o.own || {}).length > 0
    },

    /**
     * The inherited points this level has switched off, for the current scenario.
     *
     * Read from the INHERITED list rather than remembered from before the decline: a
     * declined point is absent from the resolved list by definition, so this is the only
     * place its wording still exists.
     * @returns {object[]}
     */
    declinedHere () {
      const ids = (this.own.declines || {})[this.scenarioId] || []
      if (!ids.length) { return [] }
      const above = this.inherited[this.scenarioId]
      const points = (above && above.points) || []
      return points.filter(p => ids.includes(p.id))
    },

    /** Version rows across the three storage keys, newest first. */
    historyRows () {
      const out = []
      Object.keys(this.history).forEach((part) => {
        (this.history[part] || []).forEach(row => out.push({ ...row, part }))
      })
      return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    }
  },

  mounted () {
    this.load()
    this.loadRetention()
  },

  methods: {
    /**
     * Read the retention period in force here, and what this level set itself.
     *
     * Loaded separately from the points so a fault in one does not blank the other: a
     * manager who cannot read the retention period can still edit their observation points,
     * and the reverse.
     */
    async loadRetention () {
      this.retentionError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/meeting-retention')
        this.retentionDraft = data.resolved.months
        this.retentionPhrase = data.phrase
        this.retentionSetHere = data.ownMonths !== null
        this.retentionMin = data.min
        this.retentionMax = data.max
      } catch (err) {
        this.retentionError = 'The retention period could not be read: ' + err.message
      }
    },

    /**
     * Save this level's retention period.
     *
     * ⚠ It changes what advisors say aloud to clients from the moment it is saved — see the
     * note on this control in the template.
     */
    async saveRetention () {
      this.savingRetention = true
      this.retentionError = ''
      try {
        await this.api('PUT', '/api/firm-manager/meeting-retention', {
          months: Number(this.retentionDraft)
        })
        await this.loadRetention()
      } catch (err) {
        this.retentionError = err.message
      } finally {
        this.savingRetention = false
      }
    },

    /** Drop this level's figure so the level above applies again, and keeps applying. */
    async resetRetention () {
      this.savingRetention = true
      this.retentionError = ''
      try {
        await this.api('DELETE', '/api/firm-manager/meeting-retention')
        await this.loadRetention()
      } catch (err) {
        this.retentionError = err.message
      } finally {
        this.savingRetention = false
      }
    },

    /** Read the scenarios, what this level inherits, and what it has changed. */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/meeting-observations')
        this.scenarios = data.scenarios || []
        this.own = data.own || { declines: {}, overrides: {}, own: {} }
        this.inherited = data.inherited || {}
        this.maxPointLength = data.maxPointLength || this.maxPointLength
        if (!this.scenarioId && this.scenarios.length) { this.scenarioId = this.scenarios[0].id }
      } catch (err) {
        this.loadError = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * The badge colour for a point's origin.
     * @param {string} source - `inherited` · `edited-here` · `added-here`
     * @returns {string} a Buefy tag type
     */
    sourceTag (source) {
      if (source === 'edited-here') { return 'is-info is-light' }
      if (source === 'added-here') { return 'is-success is-light' }
      return 'is-light'
    },

    /**
     * The badge wording for a point's origin.
     * @param {string} source
     * @returns {string}
     */
    sourceLabel (source) {
      if (source === 'edited-here') { return 'edited here' }
      if (source === 'added-here') { return 'added here' }
      return 'inherited'
    },

    /** Which storage key a history row came from, in words. */
    partLabel (part) {
      if (part === 'declines') { return 'Switched off' }
      if (part === 'overrides') { return 'Edited' }
      return 'Added'
    },

    startEdit (point) {
      this.editingId = point.id
      this.draft = point.text
      this.adding = false
      this.saveError = ''
    },

    cancelEdit () {
      this.editingId = ''
      this.draft = ''
    },

    startAdd () {
      this.adding = true
      this.editingId = ''
      this.draft = ''
      this.saveError = ''
    },

    cancelAdd () {
      this.adding = false
      this.draft = ''
    },

    /**
     * Save an edit. A point this level ADDED is edited on its own route; one inherited from
     * above is recorded as an override — the two are different storage and the source badge
     * is what tells them apart.
     * @param {object} point
     */
    async saveEdit (point) {
      const text = String(this.draft || '').trim()
      if (!text) { this.saveError = 'A point needs some words.'; return }
      const base = `/api/firm-manager/meeting-observations/${this.scenarioId}`
      const path = point.source === 'added-here'
        ? `${base}/own/${point.id}`
        : `${base}/point/${point.id}`
      await this.mutate('PUT', path, { text })
      this.cancelEdit()
    },

    async addPoint () {
      const text = String(this.draft || '').trim()
      if (!text) { this.saveError = 'A point needs some words.'; return }
      await this.mutate('POST', `/api/firm-manager/meeting-observations/${this.scenarioId}/own`, { text })
      this.cancelAdd()
    },

    /**
     * Switch an inherited point off for this level, or back on.
     * @param {object} point
     * @param {boolean} declined
     */
    async decline (point, declined) {
      await this.mutate(
        'PUT',
        `/api/firm-manager/meeting-observations/${this.scenarioId}/point/${point.id}/decline`,
        { declined }
      )
    },

    /** Drop this level's wording for an inherited point, so the level above's applies again. */
    async resetPoint (point) {
      await this.mutate(
        'DELETE',
        `/api/firm-manager/meeting-observations/${this.scenarioId}/point/${point.id}`
      )
    },

    /** Removing a point this level added is not undoable from the screen, so it asks first. */
    confirmDelete (point) {
      this.$buefy.dialog.confirm({
        title: 'Remove this point',
        message: 'Advisors here will stop being checked on it. Points you have inherited can be switched off instead, and switched back on later.',
        confirmText: 'Remove it',
        type: 'is-warning',
        onConfirm: () => this.mutate(
          'DELETE',
          `/api/firm-manager/meeting-observations/${this.scenarioId}/own/${point.id}`
        )
      })
    },

    /**
     * Every write goes through here, and every one RE-READS afterwards rather than patching
     * the list in the browser. The resolved list is the product of four levels of
     * inheritance; recomputing it client-side is a second implementation of the cascade,
     * and a second implementation is how two answers drift apart.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<void>}
     */
    async mutate (method, path, body) {
      this.saving = true
      this.saveError = ''
      try {
        await this.api(method, path, body)
        await this.load()
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    async toggleHistory () {
      this.showHistory = !this.showHistory
      if (this.showHistory) { await this.loadHistory() }
    },

    async loadHistory () {
      try {
        const data = await this.api('GET', '/api/firm-manager/meeting-observations/history')
        this.history = data.history || {}
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Restore one storage key to an earlier version.
     * @param {{part: string, id: number}} row
     */
    async restore (row) {
      await this.mutate('POST', '/api/firm-manager/meeting-observations/restore', {
        part: row.part,
        versionId: row.id
      })
    },

    /**
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
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
.mobs-pick {
  display: grid;
  grid-template-columns: minmax(0, 420px) auto;
  gap: 1rem;
  align-items: center;
}
.mobs-row {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.mobs-row:last-child { border-bottom: 0; }
.mobs-source { text-align: right; padding-top: 0.15rem; }
.mobs-acts { display: flex; gap: 0.25rem; flex-wrap: wrap; justify-content: flex-end; }
.mobs-off {
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e6ebf2;
}
</style>

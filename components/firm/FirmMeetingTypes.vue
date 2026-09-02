<template lang="pug">
.mtypes(v-if="visible")
  .box.mb-4
    h4.title.is-6.mb-1 The kinds of meeting
    p.is-size-7.has-text-grey.mb-4
      | The meetings your advisors have. Each one holds its own list of checks.

    b-message(v-if="loadError" type="is-danger" size="is-small") {{ loadError }}
    b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

    p.is-size-7.has-text-grey.py-4(v-if="!loading && !types.length")
      | No kinds of meeting yet. Add the first one below.

    table.table.is-fullwidth.is-narrow.mtypes-table(v-if="types.length")
      tbody
        tr(v-for="(t, i) in types" :key="t.id")
          td.mtypes-name
            template(v-if="editingId === t.id")
              b-field(label="What this meeting is called" label-position="on-border")
                b-input(v-model="editName" :maxlength="maxNameLength" placeholder="Bad news conversation")
              b-field(label="Coaching material for this meeting (optional)" label-position="on-border")
                b-input(v-model="editTree" placeholder="eoy_meeting")
              .buttons.mt-2
                b-button(type="is-primary" size="is-small" :loading="saving" @click="saveEdit(t)") Save
                b-button(type="is-light" size="is-small" @click="cancelEdit") Cancel
            template(v-else)
              span {{ t.name }}
              b-tag.ml-2(v-if="t.source === 'added-here'" type="is-success is-light" size="is-small") Added here
              b-tag.ml-2(v-else-if="t.source === 'edited-here'" type="is-info is-light" size="is-small") Edited here
          td.mtypes-actions.has-text-right(v-if="editingId !== t.id")
            b-button(size="is-small" type="is-text" :disabled="i === 0" @click="move(i, -1)") Move up
            b-button(size="is-small" type="is-text" :disabled="i === types.length - 1" @click="move(i, 1)") Move down
            b-button(size="is-small" type="is-text" @click="startEdit(t)") Rename
            b-button(
              v-if="t.source === 'added-here'"
              size="is-small" type="is-text" :loading="saving" @click="confirmRemove(t)"
            ) Remove
            b-button(
              v-else
              size="is-small" type="is-text" :loading="saving" @click="decline(t, true)"
            ) Not used here

    .mtypes-off.mt-4(v-if="declinedHere.length")
      p.is-size-7.has-text-grey.mb-2
        | Not used here. Your advisors will not see these.
      .mtypes-offrow(v-for="d in declinedHere" :key="d")
        span.is-size-7 {{ nameFor(d) }}
        b-button(size="is-small" type="is-text" :loading="saving" @click="declineById(d, false)") Use it again

    .mtypes-add.mt-5
      template(v-if="adding")
        b-field(label="What this meeting is called" label-position="on-border")
          b-input(v-model="newName" :maxlength="maxNameLength" placeholder="Bad news conversation")
        b-field(label="Coaching material for this meeting (optional)" label-position="on-border")
          b-input(v-model="newTree" placeholder="eoy_meeting")
        .buttons.mt-2
          b-button(type="is-primary" :loading="saving" @click="addType") Save
          b-button(type="is-light" @click="cancelAdd") Cancel
      b-button(v-else type="is-light" @click="startAdd") A new kind of meeting
</template>

<script>
/**
 * FirmMeetingTypes — the KINDS of meeting: create, rename, reorder, switch off.
 *
 * Design `design/MEETING-TYPES-CASCADE.md` §7 slice 2, approved by Mike 2026-09-02 with
 * all four of its decisions ruled. Every label here was put to him and approved before it
 * was written (`CLAUDE.md`: wording is asked for, never invented).
 *
 * 🔴 ITS OWN COMPONENT RATHER THAN A SECTION OF `FirmMeetingObservations.vue`, which is
 * already 642 lines. The house rule is one responsibility per component and decomposition
 * past 200; the types are a different list with different verbs from the points inside
 * them, so they get their own file rather than a sixth concern in that one.
 *
 * ⚠ MENTOR ONLY IN SLICE 2, AND THAT IS THE APPROVED SEQUENCE, NOT A PERMISSION RULE. The
 * resolver and every route already handle all four manager tiers; slice 3 opens the
 * controls to the other three, which is a change to `visible` below and nothing else.
 * Mike's P14 — "NOBODY can edit a level ABOVE their own" — is enforced on the backend,
 * where every route is scoped to the caller's own verified identity.
 *
 * ⚠ SWITCHING OFF IS NOT DELETING (D4, ruled 2026-09-02). "Not used here" removes a type
 * from the picker at this level and below; a meeting already recorded against it stays
 * readable, because the meeting stores the id and its report has to say what kind of
 * meeting it was. Only a type added HERE can be removed outright — nothing below has
 * inherited it, so nothing below loses anything.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
export default {
  name: 'FirmMeetingTypes',

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
      /** The caller's own tier, from the backend — never inferred from the token here. */
      tier: '',
      /** The types in force at this level, in this level's running order. */
      types: [],
      /** What THIS level has decided: `{ declines, overrides, own, order }`. */
      own: { declines: [], overrides: {}, own: [], order: [] },
      /** What this level would see if it decided nothing — used to name a switched-off type. */
      inherited: [],
      maxNameLength: 120,
      editingId: '',
      editName: '',
      editTree: '',
      adding: false,
      newName: '',
      newTree: ''
    }
  },

  computed: {
    /**
     * Slice 2 shows this at the mentor only. Everything below it is built and waiting.
     * @returns {boolean}
     */
    visible () {
      return this.tier === 'mentor'
    },

    /** Ids switched off here, so they can be listed and switched back on. */
    declinedHere () {
      return Array.isArray(this.own.declines) ? this.own.declines : []
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read the types in force, this level's own decisions, and what it inherits.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/meeting-types')
        this.tier = data.tier || ''
        this.types = data.types || []
        this.own = data.own || { declines: [], overrides: {}, own: [], order: [] }
        this.inherited = data.inherited || []
        this.maxNameLength = data.maxNameLength || 120
      } catch (e) {
        this.loadError = 'The kinds of meeting could not be loaded: ' + e.message
      }
      this.loading = false
    },

    /**
     * The name of a switched-off type, which is no longer in the resolved list.
     * @param {string} id
     * @returns {string}
     */
    nameFor (id) {
      const found = this.inherited.filter(t => t.id === id)[0]
      return found ? found.name : id
    },

    startEdit (type) {
      this.editingId = type.id
      this.editName = type.name
      this.editTree = type.treeId || ''
      this.saveError = ''
    },

    cancelEdit () {
      this.editingId = ''
      this.editName = ''
      this.editTree = ''
    },

    startAdd () {
      this.adding = true
      this.newName = ''
      this.newTree = ''
      this.saveError = ''
    },

    cancelAdd () {
      this.adding = false
      this.newName = ''
      this.newTree = ''
    },

    /**
     * Save a rename. A type added HERE is edited on its own route; an inherited one is
     * stored as an override, so the original survives and a reset restores it.
     * @param {object} type
     * @returns {Promise<void>}
     */
    async saveEdit (type) {
      const body = { name: this.editName, treeId: this.editTree ? this.editTree : null }
      const path = type.source === 'added-here'
        ? '/api/firm-manager/meeting-types/own/' + encodeURIComponent(type.id)
        : '/api/firm-manager/meeting-types/' + encodeURIComponent(type.id)
      if (await this.mutate('PUT', path, body)) { this.cancelEdit() }
    },

    /**
     * Add a kind of meeting. The id is minted by the backend, never sent from here.
     * @returns {Promise<void>}
     */
    async addType () {
      const body = { name: this.newName, treeId: this.newTree ? this.newTree : null }
      if (await this.mutate('POST', '/api/firm-manager/meeting-types', body)) { this.cancelAdd() }
    },

    /**
     * Switch an inherited type off, or back on.
     * @param {object} type
     * @param {boolean} declined
     * @returns {Promise<void>}
     */
    async decline (type, declined) {
      await this.declineById(type.id, declined)
    },

    /**
     * @param {string} id
     * @param {boolean} declined
     * @returns {Promise<void>}
     */
    async declineById (id, declined) {
      await this.mutate(
        'PUT',
        '/api/firm-manager/meeting-types/' + encodeURIComponent(id) + '/declined',
        { declined }
      )
    },

    /**
     * Remove a type added here. Asked for confirmation because nothing below inherits it
     * back — unlike switching one off, this cannot be undone from the screen.
     * @param {object} type
     */
    confirmRemove (type) {
      this.$buefy.dialog.confirm({
        title: 'Remove this kind of meeting',
        message: 'This removes it for everyone below you. Any meetings already recorded ' +
          'against it stay readable.',
        confirmText: 'Remove',
        type: 'is-danger',
        onConfirm: () => this.mutate(
          'DELETE',
          '/api/firm-manager/meeting-types/own/' + encodeURIComponent(type.id)
        )
      })
    },

    /**
     * Move a type up or down and save the whole running order.
     *
     * The order is sent in full rather than as a move, so two managers editing at once
     * cannot interleave into an order neither of them chose.
     *
     * @param {number} index
     * @param {number} direction - -1 up, 1 down
     * @returns {Promise<void>}
     */
    async move (index, direction) {
      const next = this.types.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) { return }
      const moved = next[index]
      next[index] = next[target]
      next[target] = moved
      await this.mutate(
        'PUT',
        '/api/firm-manager/meeting-types/order',
        { order: next.map(t => t.id) }
      )
    },

    /**
     * Every write goes through here: one place that reloads, and one place that reports a
     * failure. The list is re-read from the backend rather than patched locally, so what
     * is on screen is always what the cascade actually resolves to.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<boolean>} true when it saved
     */
    async mutate (method, path, body) {
      this.saving = true
      this.saveError = ''
      let ok = false
      try {
        await this.api(method, path, body)
        await this.load()
        // The points section keys off this list, so it reloads too.
        this.$emit('types-changed')
        ok = true
      } catch (e) {
        this.saveError = e.message
      }
      this.saving = false
      return ok
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a manager can act on, per the house error rule.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async api (method, path, body) {
      let res
      try {
        res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error('The server could not be reached. Check your connection and try again.')
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data.error && data.error.message) || 'That could not be saved.')
      }
      return data
    }
  }
}
</script>

<style scoped>
.mtypes-table td {
  vertical-align: middle;
}
.mtypes-name {
  width: 100%;
}
.mtypes-actions {
  white-space: nowrap;
}
.mtypes-offrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.15rem 0;
}
</style>

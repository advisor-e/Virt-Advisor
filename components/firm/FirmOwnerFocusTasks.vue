<template lang="pug">
section.fot
  b-loading(:is-full-page="false" :active="loading")

  b-notification(v-if="loadError" type="is-danger" :closable="false") {{ loadError }}
  b-notification(v-if="saveError" type="is-danger" :closable="true" @close="saveError = ''") {{ saveError }}

  template(v-if="!loading && !loadError")
    //- THE LADDER — who wrote the list in force and where this tier sits, so an inherited
    //- list is never mistaken for one this tier wrote. Read off the Session Processes tab.
    .fot-ladder
      .fot-rung(
        v-for="rung in ladder"
        :key="rung.tier"
        :class="{ 'is-owner': rung.isOwner }"
      )
        b.fot-rung-name {{ rung.label }}
        span.fot-rung-state {{ rung.state }}

    p.fot-lede {{ lede }}

    .fot-list
      .fot-row(v-for="(t, i) in tasks" :key="t.key")
        span.fot-n {{ i + 1 }}
        b-input.fot-input(v-model="t.name" size="is-small" @input="dirty = true")
        b-button(
          size="is-small"
          type="is-text"
          icon-left="close"
          :aria-label="$t('ownerFocusTasks.remove', { name: t.name })"
          :disabled="tasks.length <= 1"
          @click="removeTask(i)")
      b-button.fot-add(
        size="is-small"
        :disabled="tasks.length >= maxTasks"
        @click="addTask") {{ $t('ownerFocusTasks.add') }}

    .fot-actions
      b-button(
        type="is-primary"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      ) {{ $t('ownerFocusTasks.save') }}
      //- Only where this tier holds one of its own — otherwise writing once is a one-way door.
      b-button(
        v-if="ownedHere"
        type="is-danger"
        outlined
        :loading="saving"
        @click="confirmRevert"
      ) {{ $t('ownerFocusTasks.revert') }}
      b-button(type="is-text" @click="toggleHistory") {{ historyOpen ? $t('ownerFocusTasks.hideHistory') : $t('ownerFocusTasks.showHistory') }}

    section.fot-history(v-if="historyOpen")
      p.fot-none(v-if="!versions.length") {{ $t('ownerFocusTasks.noHistory') }}
      table.table.is-fullwidth(v-else)
        thead
          tr
            th {{ $t('ownerFocusTasks.versionCol') }}
            th {{ $t('ownerFocusTasks.savedCol') }}
            th
        tbody
          tr(v-for="v in versions" :key="v.id")
            td {{ v.version }}
            td {{ v.created_at || v.createdAt }}
            td.fot-right
              b-button(size="is-small" :loading="saving" @click="restore(v.id)") {{ $t('ownerFocusTasks.restore') }}
</template>

<script>
/**
 * FirmOwnerFocusTasks — the starting list of Focus Tasks/Duties this tier hands down to every
 * owner on the Business Owner Expectations model. Item 5.4.
 *
 * 🔴 ALL FOUR MANAGING TIERS — Mike's own words, 2026-09-24: the list "cascades down from mentor
 * thru the levels to firm manager". One screen serves all four; the tier comes from the token.
 *
 * 🔴 IT IS ONLY THE STARTING LIST. Each owner then renames, deletes and adds their own on the
 * model, saved against the client; nothing typed there comes back up to this tab.
 *
 * Inherit-or-own, the whole list — the Session Processes shape, and this screen copies that
 * tab's ladder, sentence, save, revert and history rather than inventing its own.
 *
 * Vue 2, Options API, Pug.
 */

/** The four managing tiers, top first — the settled vocabulary, shared with Session Processes. */
const TIERS = [
  { tier: 'mentor', labelKey: 'sessionProcess.tierMentor' },
  { tier: 'global_group_manager', labelKey: 'sessionProcess.tierGlobalGroupManager' },
  { tier: 'group_manager', labelKey: 'sessionProcess.tierGroupManager' },
  { tier: 'firm_manager', labelKey: 'sessionProcess.tierFirmManager' }
]

/** The backend's ceiling — `MAX_TASKS` in server/utils/ownerFocusTasks.js. */
const MAX_TASKS = 20

const PATH = '/api/owner-focus-tasks'

export default {
  name: 'FirmOwnerFocusTasks',

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
      /** `[{ key, name }]` — this tier's working copy; `key` is a render handle, never saved. */
      tasks: [],
      source: null,
      ownedHere: false,
      /** Which tier the VIEWER is — never read off `source`, which says mentor for everyone on the shipped list. */
      tier: null,
      dirty: false,
      historyOpen: false,
      versions: [],
      nextKey: 1,
      maxTasks: MAX_TASKS
    }
  },

  computed: {
    ownerLabel () {
      if (!this.source || this.source.shipped) { return '' }
      const found = TIERS.find(t => t.tier === this.source.tier)
      return found ? this.$t(found.labelKey) : ''
    },

    /** Three cases: yours, the shipped list (mentor or below), or inherited from a named tier. */
    lede () {
      if (this.ownedHere) { return this.$t('ownerFocusTasks.yoursLede') }
      if (this.source && this.source.shipped) {
        return this.tier === 'mentor'
          ? this.$t('ownerFocusTasks.shippedMentorLede')
          : this.$t('ownerFocusTasks.shippedLede')
      }
      return this.$t('ownerFocusTasks.inheritedLede', { whose: this.ownerLabel })
    },

    /** The four rungs; only the tier the resolve named can be marked the owner. */
    ladder () {
      const ownerTier = this.source ? this.source.tier : null
      return TIERS.map((t) => {
        const isOwner = t.tier === ownerTier
        return {
          tier: t.tier,
          label: this.$t(t.labelKey),
          isOwner,
          state: isOwner
            ? this.$t('ownerFocusTasks.rungOwns', { count: this.tasks.length })
            : this.$t('ownerFocusTasks.rungInherits')
        }
      })
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        this.applyTasks(await this.api('GET', PATH))
      } catch (e) {
        this.loadError = e.message
      } finally {
        this.loading = false
      }
    },

    /** Take a resolve response onto the screen. */
    applyTasks (body) {
      this.tasks = (body.tasks || []).map(name => ({ key: 't' + (this.nextKey++), name }))
      this.source = body.source || null
      this.tier = body.tier || null
      this.ownedHere = Boolean(body.ownedHere)
      this.dirty = false
    },

    addTask () {
      if (this.tasks.length >= MAX_TASKS) { return }
      this.tasks.push({ key: 't' + (this.nextKey++), name: '' })
      this.dirty = true
    },

    /** Deleting the last task is refused: an empty list would start every owner with nothing. */
    removeTask (i) {
      if (this.tasks.length <= 1) { return }
      this.tasks.splice(i, 1)
      this.dirty = true
    },

    /** Saved on a deliberate press, never per keystroke — each press is a version. */
    async save () {
      this.saving = true
      this.saveError = ''
      try {
        this.applyTasks(await this.api('PUT', PATH, { tasks: this.tasks.map(t => t.name) }))
        if (this.historyOpen) { await this.loadVersions() }
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    confirmRevert () {
      this.$buefy.dialog.confirm({
        message: this.$t('ownerFocusTasks.revertConfirm'),
        confirmText: this.$t('ownerFocusTasks.revertYes'),
        type: 'is-danger',
        onConfirm: () => this.revert()
      })
    },

    async revert () {
      this.saving = true
      this.saveError = ''
      try {
        this.applyTasks(await this.api('DELETE', PATH))
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    async toggleHistory () {
      this.historyOpen = !this.historyOpen
      if (this.historyOpen) { await this.loadVersions() }
    },

    async loadVersions () {
      try {
        const body = await this.api('GET', PATH + '/versions')
        this.versions = body.versions || []
      } catch (e) {
        this.saveError = e.message
      }
    },

    async restore (versionId) {
      this.saving = true
      this.saveError = ''
      try {
        this.applyTasks(await this.api('POST', PATH + '/versions/' + versionId + '/restore'))
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    /** Every call, with both failure modes turned into a message a manager can act on. */
    async api (method, path, body) {
      let res
      try {
        res = await fetch(path, {
          method,
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error(this.$t('ownerFocusTasks.unreachable'))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data.error && data.error.message) || this.$t('ownerFocusTasks.saveFailed'))
      }
      return data
    }
  }
}
</script>

<style scoped>
.fot-ladder { display: flex; flex-wrap: wrap; margin-bottom: 0.9rem; }
.fot-rung { flex: 1 1 10rem; border: 1px solid #d5e1ee; padding: 0.55rem 0.7rem; background: #fff; }
.fot-rung:first-child { border-radius: 8px 0 0 8px; }
.fot-rung:last-child { border-radius: 0 8px 8px 0; }
.fot-rung + .fot-rung { border-left: 0; }
.fot-rung.is-owner { background: #f3fbf5; border-color: #a8dcb4; }
.fot-rung-name { display: block; color: #002b64; font-size: 0.8rem; }
.fot-rung.is-owner .fot-rung-name { color: #1d6b2b; }
.fot-rung-state { font-size: 0.72rem; color: #5b6f8a; }

.fot-lede { color: #23405f; margin-bottom: 0.9rem; max-width: 80ch; }

.fot-list { max-width: 36rem; }
.fot-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
.fot-n { width: 1.4rem; text-align: right; font-size: 0.8rem; color: #5b6f8a; }
.fot-input { flex: 1; }
.fot-add { margin-top: 0.3rem; margin-left: 1.9rem; }

.fot-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.9rem; }
.fot-history { margin-top: 1.1rem; }
.fot-none { color: #5b6f8a; font-style: italic; }
.fot-right { text-align: right; }

@media (max-width: 860px) {
  .fot-rung { border-radius: 8px; border-left: 1px solid #d5e1ee; }
}
</style>

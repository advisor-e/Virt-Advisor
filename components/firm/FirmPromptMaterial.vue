<template lang="pug">
.pm
  h3.pm-h {{ $t('promptMaterial.heading') }}
  p.pm-intro {{ $t('promptMaterial.intro') }}

  .has-text-centered.py-4(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ $t('promptMaterial.loadFailed') }}

  template(v-else)
    //- ── What the level above has changed under an edit of ours ───────────
    //- Never applied silently: the level's own wording still stands until
    //- somebody here chooses.
    .pm-changed(v-if="changedAbove.length")
      p.pm-changed-h {{ $tc('promptMaterial.changedHeading', changedAbove.length, { n: changedAbove.length }) }}
      p.pm-changed-b {{ $t('promptMaterial.changedBody') }}

    //- ── In force ─────────────────────────────────────────────────────────
    p.pm-none(v-if="!resolved.length") {{ $t('promptMaterial.nothingYet') }}

    .pm-row(v-for="row in resolved" :key="row.id" :class="'is-' + row.source")
      .pm-rhead
        span.pm-rtitle {{ row.title }}
        b-tag(:type="badgeFor(row).type" size="is-small") {{ badgeFor(row).label }}
      p.pm-rbody {{ row.text }}

      .pm-changed-row(v-if="hasChanged(row.id)")
        span {{ $t('promptMaterial.changedRow') }}
        .pm-acts
          b-button(size="is-small" type="is-success" :loading="busy" @click="adopt(row.id)")
            | {{ $t('promptMaterial.adopt') }}
          b-button(size="is-small" :loading="busy" @click="keepMine(row.id)")
            | {{ $t('promptMaterial.keepMine') }}

      .pm-acts
        b-button(size="is-small" :disabled="busy" @click="startEdit(row)") {{ $t('promptMaterial.edit') }}
        b-button(size="is-small" type="is-danger" :disabled="busy" @click="switchOff(row)")
          | {{ row.source === 'added-here' ? $t('promptMaterial.remove') : $t('promptMaterial.switchOff') }}

    //- ── Switched off ─────────────────────────────────────────────────────
    //- Shown rather than hidden: material a level has turned off is a decision
    //- it made, and a decision it cannot see is one it cannot revisit.
    .pm-off(v-if="switchedOff.length")
      p.pm-off-h {{ $t('promptMaterial.offHeading') }}
      .pm-offrow(v-for="row in switchedOff" :key="row.id")
        span.pm-offtitle {{ row.title }}
        b-button(size="is-small" :loading="busy" @click="switchBackOn(row.id)")
          | {{ $t('promptMaterial.switchOn') }}

    //- ── Add or edit ──────────────────────────────────────────────────────
    .pm-form
      p.pm-form-h {{ editingId ? $t('promptMaterial.editHeading') : $t('promptMaterial.addHeading') }}

      b-input.pm-title(
        v-model="form.title"
        size="is-small"
        :disabled="busy"
        :maxlength="limits.maxTitle"
        :placeholder="$t('promptMaterial.namePlaceholder')"
        :aria-label="$t('promptMaterial.namePlaceholder')")

      b-input.pm-text(
        v-model="form.text"
        type="textarea"
        rows="6"
        :disabled="busy"
        :placeholder="$t('promptMaterial.textPlaceholder')"
        :aria-label="$t('promptMaterial.textPlaceholder')")

      p.pm-count(:class="{ 'is-over': isOver }")
        | {{ $t('promptCheck.charactersUsed', { used: form.text.length, limit: limits.maxText }) }}

      p.pm-warn {{ $t('promptMaterial.whatHappens') }}

      .pm-acts
        b-button(
          type="is-primary"
          size="is-small"
          :loading="busy"
          :disabled="!canSave"
          @click="save") {{ editingId ? $t('promptMaterial.saveEdit') : $t('promptMaterial.save') }}
        b-button(v-if="editingId" size="is-small" :disabled="busy" @click="cancelEdit")
          | {{ $t('promptMaterial.cancel') }}

    b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

    //- ── Refused, in the same words the paste box uses ────────────────────
    .pm-blocked(v-if="view" :class="view.tone")
      h4.pm-blocked-h {{ view.heading }}
      .pm-part
        span.pm-label {{ $t('promptCheck.labelFound') }}
        p {{ view.found }}
        .pm-quote(v-if="view.quote") {{ view.quote }}
        p.pm-aside(v-if="view.afterQuote") {{ view.afterQuote }}
      .pm-part
        span.pm-label {{ $t('promptCheck.labelWhy') }}
        p {{ view.why }}
      .pm-part
        span.pm-label {{ $t('promptCheck.labelDo') }}
        p {{ view.todo }}
</template>

<script>
import promptRefusal from '~/mixins/promptRefusal'

/**
 * The material a level has put in force for its own advisors.
 *
 * What is saved here reaches every conversation that level's advisors have, and is pushed
 * down to the levels below — where it may be edited, switched off, or held against a later
 * change from above.
 *
 * 🔴 THE SCREEN DECIDES NOTHING ABOUT SAFETY. Every check runs on the backend
 * (`server/utils/promptContributions.js`), which refuses in the same words the paste box
 * uses. A check re-implemented here to save a round trip would be a check an attacker can
 * delete from their own browser.
 */
export default {
  name: 'FirmPromptMaterial',

  mixins: [promptRefusal],

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      busy: false,
      loadError: false,
      saveError: '',
      refusal: null,
      /** What is in force here, from the backend's own resolution. */
      resolved: [],
      /** What this level inherited, before its own decisions — used for the off-list. */
      inherited: [],
      declinedIds: [],
      changedAbove: [],
      /** The row being edited, or '' when adding. */
      editingId: '',
      form: { title: '', text: '' },
      limits: { maxInForce: 3, maxTitle: 120, maxText: 6000 }
    }
  },

  computed: {
    isOver () { return this.form.text.length > this.limits.maxText },

    canSave () {
      return this.form.title.trim() !== '' && this.form.text.trim() !== '' && !this.busy
    },

    /** The refusal, in the paste box's words. */
    view () { return this.refusalView(this.refusal) },

    /**
     * Material this level has switched off. Derived from what it inherited rather than
     * stored twice, so the two can never disagree.
     */
    switchedOff () {
      return this.inherited.filter(row => this.declinedIds.includes(row.id))
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** Read everything the screen draws. */
    async load () {
      this.loading = true
      this.loadError = false
      try {
        this.apply(await this.api('GET', '/api/firm-manager/prompt-contributions'))
      } catch (err) {
        this.loadError = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Put a backend response into the screen's state. Every field is optional, because a
     * handler answers with only what its own action changed.
     * @param {object} data
     */
    apply (data) {
      if (Array.isArray(data.resolved)) { this.resolved = data.resolved }
      if (Array.isArray(data.inherited)) { this.inherited = data.inherited }
      if (Array.isArray(data.declinedIds)) { this.declinedIds = data.declinedIds }
      if (Array.isArray(data.changedAbove)) { this.changedAbove = data.changedAbove }
      if (data.limits) { this.limits = data.limits }
    },

    /**
     * The badge on a row: where it came from, and whether this level has touched it.
     * @param {object} row
     * @returns {{type: string, label: string}}
     */
    badgeFor (row) {
      if (row.source === 'added-here') {
        return { type: 'is-success', label: this.$t('promptMaterial.badgeOwn') }
      }
      if (row.source === 'edited-here') {
        return { type: 'is-warning', label: this.$t('promptMaterial.badgeEdited') }
      }
      return { type: 'is-light', label: this.$t('promptMaterial.badgeInherited') }
    },

    hasChanged (id) { return this.changedAbove.includes(id) },

    /** Load a row into the form to edit it. */
    startEdit (row) {
      this.editingId = row.id
      this.form = { title: row.title, text: row.text }
      this.refusal = null
      this.saveError = ''
    },

    cancelEdit () {
      this.editingId = ''
      this.form = { title: '', text: '' }
      this.refusal = null
    },

    /** Add new material, or save an edit to existing material. */
    async save () {
      if (!this.canSave) { return }
      this.busy = true
      this.refusal = null
      this.saveError = ''
      try {
        const data = this.editingId
          ? await this.api('PUT', '/api/firm-manager/prompt-contributions/' + encodeURIComponent(this.editingId), this.form)
          : await this.api('POST', '/api/firm-manager/prompt-contributions', this.form)

        if (data.refused) {
          this.refusal = data.refusal || null
          // A refusal shape this build cannot describe must not render as an empty panel.
          if (!this.view) { this.refusal = null; this.saveError = this.$t('promptMaterial.saveFailed') }
          return
        }
        this.apply(data)
        this.cancelEdit()
        await this.load()
      } catch (err) {
        this.saveError = this.$t('promptMaterial.saveFailed')
      } finally {
        this.busy = false
      }
    },

    /**
     * Switch a row off. A row this level added is removed; a row it inherited is declined
     * and stays available to switch back on.
     * @param {object} row
     */
    async switchOff (row) {
      await this.act('/api/firm-manager/prompt-contributions/' + encodeURIComponent(row.id) + '/off', { off: true })
    },

    async switchBackOn (id) {
      await this.act('/api/firm-manager/prompt-contributions/' + encodeURIComponent(id) + '/off', { off: false })
    },

    async adopt (id) {
      await this.act('/api/firm-manager/prompt-contributions/' + encodeURIComponent(id) + '/adopt', {})
    },

    async keepMine (id) {
      await this.act('/api/firm-manager/prompt-contributions/' + encodeURIComponent(id) + '/keep-mine', {})
    },

    /**
     * One shape for every action button: post, apply, reload.
     *
     * The reload is deliberate. A decline changes what is inherited BELOW as well as here,
     * and an adopt changes what is reported as changed — reading the whole state back is
     * cheaper than working out which parts moved.
     *
     * @param {string} path
     * @param {object} body
     */
    async act (path, body) {
      this.busy = true
      this.saveError = ''
      try {
        this.apply(await this.api('POST', path, body))
        await this.load()
      } catch (err) {
        this.saveError = this.$t('promptMaterial.saveFailed')
      } finally {
        this.busy = false
      }
    },

    /**
     * Thin authenticated fetch — the same helper the rest of this tab uses.
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
.pm { margin-top: 2.25rem; padding-top: 1.75rem; border-top: 1px solid #e2e6ec; }

.pm-h { font-size: 1.05rem; font-weight: 600; color: #002b64; margin-bottom: 0.35rem; }
.pm-intro { font-size: 0.86rem; color: #5a6b82; margin-bottom: 1rem; }
.pm-none { font-size: 0.85rem; color: #7a869a; margin-bottom: 1rem; }

.pm-changed {
  border: 1px solid #ffb870;
  border-left: 4px solid #b35309;
  background: #fffaf3;
  border-radius: 6px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 1rem;
}
.pm-changed-h { font-weight: 600; color: #b35309; font-size: 0.88rem; }
.pm-changed-b { font-size: 0.82rem; color: #5a6b82; }

/* A row's stripe says where it came from. */
.pm-row {
  border: 1px solid #e2e6ec;
  border-left: 3px solid #b8c6d8;
  border-radius: 0 6px 6px 0;
  background: #fff;
  padding: 0.8rem 0.95rem;
  margin-bottom: 0.65rem;
}
.pm-row.is-added-here { border-left-color: #63c48d; }
.pm-row.is-edited-here { border-left-color: #ffb870; }

.pm-rhead { display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
.pm-rtitle { font-weight: 600; color: #002b64; font-size: 0.9rem; flex: 1 1 auto; }
.pm-rbody { font-size: 0.83rem; color: #5a6b82; margin-top: 0.3rem; white-space: pre-wrap; }

.pm-changed-row {
  background: #fffaf3;
  border: 1px solid #ffb870;
  border-radius: 5px;
  padding: 0.55rem 0.7rem;
  margin-top: 0.6rem;
  font-size: 0.82rem;
  color: #b35309;
}

.pm-acts { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.6rem; }

.pm-off { margin-top: 1.2rem; }
.pm-off-h { font-size: 0.8rem; font-weight: 600; color: #7a869a; margin-bottom: 0.4rem; }
.pm-offrow {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px dashed #d8dce3;
  border-radius: 5px;
  padding: 0.45rem 0.7rem;
  margin-bottom: 0.4rem;
}
.pm-offtitle { flex: 1 1 auto; font-size: 0.84rem; color: #7a869a; }

.pm-form {
  border: 1px solid #dbe4ef;
  border-radius: 6px;
  background: #f4f7fb;
  padding: 0.9rem 1rem;
  margin-top: 1.4rem;
}
.pm-form-h { font-weight: 600; color: #002b64; font-size: 0.9rem; margin-bottom: 0.6rem; }
.pm-title { margin-bottom: 0.5rem; }
.pm-text { margin-bottom: 0.3rem; }
.pm-count { font-size: 0.74rem; color: #8a94a3; }
.pm-count.is-over { color: #b35309; font-weight: 600; }
.pm-warn { font-size: 0.8rem; color: #5a6b82; margin-top: 0.5rem; }

.pm-blocked { border-radius: 8px; padding: 1rem 1.1rem; margin-top: 1.1rem; }
.pm-blocked.is-stop { border: 2px solid #e2a0a0; background: #fdf3f3; }
.pm-blocked.is-limit { border: 2px solid #b8c6d8; background: #f3f6fa; }
.pm-blocked-h { font-size: 0.98rem; font-weight: 600; margin-bottom: 0.4rem; }
.pm-blocked.is-stop .pm-blocked-h { color: #a02b2b; }
.pm-blocked.is-limit .pm-blocked-h { color: #002b64; }

.pm-part { margin-bottom: 0.8rem; }
.pm-part p { font-size: 0.85rem; color: #363636; }
.pm-label {
  display: block;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.15rem;
}
.pm-blocked.is-stop .pm-label { color: #a02b2b; }
.pm-blocked.is-limit .pm-label { color: #5a6b82; }

.pm-quote {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  background: #f6f7f9;
  border: 1px solid #d8dce3;
  border-radius: 4px;
  padding: 0.45rem 0.6rem;
  margin-top: 0.4rem;
  color: #363636;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.pm-aside { font-size: 0.8rem; color: #5a6b82; margin-top: 0.4rem; }
</style>

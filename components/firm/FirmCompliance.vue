<template lang="pug">
.fcm
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    //- ── What this page is, and what it is not ────────────────────────────────
    //- 🔴 THE ALL-CARE BASIS, IN MIKE'S OWN WORDS (2026-09-10) AND APPROVED IN THE
    //- DRAWING. Nothing on this page is legal advice and nothing here says a firm is
    //- compliant. Advice is SUGGESTED and required nowhere — no screen and no route
    //- checks whether a firm took it, which is his ruling: "we can't dictate or make
    //- it a condition for firms to seek legal advice".
    .box.fcm-note(v-if="!isMentor")
      h5.is-size-7.has-text-weight-semibold.mb-2 WHAT THIS PAGE IS, AND WHAT IT IS NOT
      p.is-size-7
        | Advisor-e supplies this software on an all-care basis. We identify best practice
        |  and set out our assessment below.
        b  You remain responsible for meeting your own legal obligations and for what you do with the information here.
        |  Nothing on this page is legal advice, and it is not a statement that your firm is
        |  compliant.
        b  We strongly suggest taking your own legal advice on it
        |  — we do not require it, and nothing here checks whether you have.

    .box.fcm-note.fcm-note-mentor(v-else)
      h5.is-size-7.has-text-weight-semibold.mb-2 THIS IS WHERE YOU SHARE NEW INFORMATION DOWNWARDS
      p.is-size-7
        | Publish an item here and every tier beneath you receives it and is told it is new.
        |  A global group manager or group manager can add items of their own for their country
        |  or brand — those cascade down from that level, never sideways and never up.

    //- ── Where each item came from ────────────────────────────────────────────
    .fcm-cascade.mb-4(v-if="cascadeCounts.length")
      span.fcm-cascade-item(v-for="c in cascadeCounts" :key="c.tier")
        | {{ c.count }} {{ c.count === 1 ? 'item' : 'items' }} from {{ c.label }}

    //- ── Published to you ─────────────────────────────────────────────────────
    //- 🔴 READ-ONLY, AND THERE IS DELIBERATELY NO EDIT CONTROL AND NO HIDE CONTROL.
    //- Two rulings of Mike's, 2026-09-10 — "never edit ours", and hiding asked
    //- separately and refused. Every other cascading block on this hub offers accept /
    //- edit / switch off / add; this one must not, and the backend refuses it as well
    //- as this screen omitting it (server/routes/compliance.js).
    .box(v-if="inheritedItems.length")
      h4.title.is-6.mb-1 Published to you
      p.is-size-7.has-text-grey.mb-4
        | You can read anything published to you and add your own material beside it. You
        |  cannot change or remove what a tier above you published — it carries their name,
        |  not yours.

      .fcm-doc(v-for="item in inheritedItems" :key="item.ref")
        .fcm-doc-main
          .fcm-doc-title
            span.fcm-dot(v-if="isNew(item)" title="New since you last declared")
            span.is-sr-only(v-if="isNew(item)") New.
            | {{ item.title }}
          .fcm-doc-sub
            | Version {{ item.version }} · published {{ dateWords(item.publishedAt) }}
            |  by {{ item.originTierLabel }}
          p.is-size-7.has-text-grey.mt-1(v-if="item.summary") {{ item.summary }}
        b-tag(v-if="isNew(item)" type="is-warning") New
        b-button.fcm-read(size="is-small" outlined @click="toggle(item.ref)")
          | {{ open[item.ref] ? 'Close' : 'Read it' }}

        .fcm-body(v-if="open[item.ref]") {{ item.body }}

    p.is-size-7.has-text-grey.mb-4(v-else-if="!isMentor")
      | Nothing has been published to your firm yet.

    //- ── What you publish ─────────────────────────────────────────────────────
    .box
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 What you publish
        b-button(
          v-if="!publishing"
          size="is-small"
          type="is-primary"
          @click="startNew") Publish a new item

      p.is-size-7.has-text-grey.mb-4
        | Everything here is sent down to every tier beneath you. Publishing again as a new
        |  version tells them there is something to re-read.

      p.is-size-7.has-text-grey.py-3(v-if="!ownItems.length && !publishing")
        | You have published nothing yet.

      .fcm-doc(v-for="item in ownItems" :key="item.ref")
        .fcm-doc-main
          .fcm-doc-title {{ item.title }}
          .fcm-doc-sub
            | Version {{ item.version }} · published {{ dateWords(item.publishedAt) }}
            |  by {{ item.publishedBy || 'your firm' }}
          p.is-size-7.has-text-grey.mt-1(v-if="item.summary") {{ item.summary }}
        b-button.fcm-read(size="is-small" outlined @click="toggle(item.ref)")
          | {{ open[item.ref] ? 'Close' : 'Read it' }}
        b-button.fcm-read(size="is-small" outlined @click="startEdit(item)") Publish a new version

        .fcm-body(v-if="open[item.ref]") {{ item.body }}

      //- ── Publishing one ───────────────────────────────────────────────────
      .fcm-form.mt-4(v-if="publishing")
        p.is-size-7.has-text-grey.mb-3(v-if="form.id")
          | This replaces
          b  {{ form.title }}
          |  with a new version. Everyone beneath you is told it has changed.

        b-field(label="What is it called?" label-position="on-border")
          b-input(v-model="form.title" :maxlength="limits.title")

        b-field(label="What is it, in one line?" label-position="on-border")
          b-input(v-model="form.summary" :maxlength="limits.summary")

        b-field(label="The material itself" label-position="on-border")
          b-input(v-model="form.body" type="textarea" rows="12" :maxlength="limits.body")

        b-message(v-if="formError" type="is-danger" size="is-small") {{ formError }}

        .buttons
          b-button(type="is-primary" :loading="saving" @click="submit")
            | {{ form.id ? 'Publish this version' : 'Publish it' }}
          b-button(@click="cancel") Cancel
</template>

<script>
/**
 * Compliance — what a tier publishes about a firm's legal obligations, and what every tier
 * beneath it receives. Item 4.83, slice 1.
 *
 * Design: `design/mockups/compliance-pages.html`, drawn 2026-09-10 and approved by Mike the
 * same day with all nine of its questions ruled. Asked for in his own words, naming all four
 * manager tiers: *"i want these compliance pages to show in the mentor, global manager, group
 * manager and firm manager hubs - again, cascading"*.
 *
 * 🔴 SCREEN A AND SCREEN B ARE THE SAME SCREEN — the drawing says so in terms, and it is Mike's
 * standing ruling of 2026-07-30 that a tier above the firm is the same functionality re-scoped.
 * Only two things differ by tier here: the opening note (a firm is told what this page is not;
 * the mentor is told what publishing does), and whether anything was published to you at all.
 *
 * 🔴 THERE IS NO EDIT CONTROL AND NO HIDE CONTROL ON AN INHERITED ITEM, and their absence is the
 * feature rather than an oversight. Two separate rulings of Mike's, 2026-09-10: *"never edit
 * ours"*, and hiding put to him separately and refused because it would clear the item's dot and
 * let a firm switch off the one signal telling them to read something new. A build reaching for
 * this hub's usual accept / edit / switch-off / add shape will offer both by habit.
 *
 * ⚠ THE BODY IS RENDERED AS TEXT, NEVER AS MARKUP. No `v-html` anywhere on this screen, so
 * published material cannot inject anything into the DOM and needs no sanitiser to be safe.
 *
 * ⚠ NOT ON THIS SCREEN YET, each a later slice of 4.83 rather than an omission: the firm's own
 * evidence pack (slice 2), the declaration and the gate it puts on Meeting Review (slice 3), and
 * the completeness check with the mentor's roll-up of who has declared (slice 4).
 */

export default {
  name: 'FirmCompliance',

  props: {
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      saving: false,
      formError: '',
      publishing: false,
      /** Every item published to this scope, newest first, each naming the tier that sent it. */
      items: [],
      /** When this scope last declared, or null. Written by slice 3; read here for the dot. */
      declaredAt: null,
      tier: '',
      /** Which item bodies are open, by `ref`. */
      open: {},
      form: { id: '', title: '', summary: '', body: '' },
      /**
       * How long each field may be, as the STORE decides it — sent with the answer rather than
       * written down again here. A second copy of a limit in a Vue file is a copy that drifts,
       * so these start EMPTY rather than at a plausible number: the form is not rendered until
       * the load has finished, and an unset maxlength is a limit the server still enforces.
       */
      limits: { title: null, summary: null, body: null }
    }
  },

  computed: {
    /** @returns {boolean} true at the top of the tree, where nothing is published to you */
    isMentor () {
      return this.tier === 'mentor'
    },

    /** @returns {Array<object>} what arrived from a tier above — read-only, always */
    inheritedItems () {
      return this.items.filter(i => !i.isOwn)
    },

    /** @returns {Array<object>} what this scope published itself */
    ownItems () {
      return this.items.filter(i => i.isOwn)
    },

    /**
     * How many items came from each tier, in the order the chain gave them.
     *
     * The drawing's cascade strip. It answers the question a manager actually has on opening
     * the page — is any of this ours? — without them counting rows.
     *
     * @returns {Array<{tier: string, label: string, count: number}>}
     */
    cascadeCounts () {
      const seen = []
      const by = {}
      this.items.forEach((item) => {
        const key = item.originScopeId
        if (!by[key]) {
          by[key] = { tier: key, label: item.isOwn ? 'you' : item.originTierLabel, count: 0 }
          seen.push(by[key])
        }
        by[key].count += 1
      })
      return seen
    }
  },

  async mounted () {
    await this.refresh()
  },

  methods: {
    /**
     * Load everything published to this scope.
     *
     * Emits `new-count` so the hub's left-hand menu can carry the dot without a second call —
     * this panel is mounted at every tier that shows the tab, open or not.
     *
     * @returns {Promise<void>}
     */
    async refresh () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/compliance')
        this.items = data.items || []
        this.declaredAt = data.declaredAt || null
        this.tier = data.tier || ''
        if (data.limits) { this.limits = data.limits }
        // Payload: the number of items published to this scope since it last declared.
        this.$emit('new-count', Number(data.newCount) || 0)
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * Is this item new since the scope last declared?
     *
     * 🔴 NEW MEANS "SINCE YOU LAST DECLARED", NOT "SINCE YOU LAST LOOKED" — Mike's wording of
     * 2026-09-10. Opening the page does not clear it; recording a declaration does. Until slice
     * 3 writes one, everything published to you is new, which is the right answer for a firm
     * that has declared nothing.
     *
     * @param {object} item
     * @returns {boolean}
     */
    isNew (item) {
      if (item.isOwn) { return false }
      if (!this.declaredAt) { return true }
      return Date.parse(item.publishedAt) > Date.parse(this.declaredAt)
    },

    /**
     * Show or hide one item's material.
     * @param {string} ref
     */
    toggle (ref) {
      // Replaced rather than mutated: Vue 2 does not see a key added to an object in place.
      this.open = Object.assign({}, this.open, { [ref]: !this.open[ref] })
    },

    /** Open an empty form for a new item. */
    startNew () {
      this.form = { id: '', title: '', summary: '', body: '' }
      this.formError = ''
      this.publishing = true
    },

    /**
     * Open the form on an item this scope already owns, to publish a new version of it.
     * @param {object} item
     */
    startEdit (item) {
      this.form = {
        id: item.id,
        title: item.title,
        summary: item.summary || '',
        body: item.body
      }
      this.formError = ''
      this.publishing = true
    },

    /** Close the form, keeping nothing. */
    cancel () {
      this.publishing = false
      this.formError = ''
    },

    /**
     * Publish the form — a new item, or a new version of one this scope owns.
     * @returns {Promise<void>}
     */
    async submit () {
      this.formError = ''
      if (!this.form.title.trim()) {
        this.formError = 'Give it a name first.'
        return
      }
      if (!this.form.body.trim()) {
        this.formError = 'There is nothing to publish yet — add the material itself.'
        return
      }

      this.saving = true
      try {
        const data = await this.api('POST', '/api/firm-manager/compliance', {
          id: this.form.id || undefined,
          title: this.form.title,
          summary: this.form.summary,
          body: this.form.body
        })
        this.items = data.items || []
        this.$emit('new-count', Number(data.newCount) || 0)
        this.publishing = false
      } catch (e) {
        this.formError = e.message
      }
      this.saving = false
    },

    /**
     * A date in the words the rest of this hub uses.
     * @param {string} iso
     * @returns {string}
     */
    dateWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
        const err = new Error((data.error && data.error.message) || 'That could not be done.')
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.fcm-note {
  border-left: 3px solid #0070c0;
}
.fcm-note-mentor {
  border-left-color: #4ca52d;
}
.fcm-cascade {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.2rem;
  font-size: 0.75rem;
  color: #5b6f8a;
}
.fcm-doc {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.9rem 0;
  border-bottom: 1px solid #eef3f8;
}
.fcm-doc:last-child { border-bottom: 0; }
.fcm-doc-main {
  flex: 1;
  min-width: 14rem;
}
.fcm-doc-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.fcm-doc-sub {
  font-size: 0.75rem;
  color: #5b6f8a;
  margin-top: 0.15rem;
}
/* The notification dot, in the Handbook's own red. Never the only signal that an item is
   new — the tag beside it and the screen-reader line say the same thing in words. */
.fcm-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e00000;
  margin-right: 0.45rem;
  vertical-align: middle;
}
.fcm-read { flex: 0 0 auto; }
.fcm-body {
  flex-basis: 100%;
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  background: #f1f6fb;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.55;
  white-space: pre-wrap;
  max-height: 28rem;
  overflow-y: auto;
}
.fcm-form {
  border-top: 1px solid #eef3f8;
  padding-top: 1rem;
}
</style>

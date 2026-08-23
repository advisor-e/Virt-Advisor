<template lang="pug">
  div.feg
    p.feg-intro {{ $t('firmEducationGate.intro') }}

    b-notification(v-if="loadError" type="is-danger" :closable="false") {{ loadError }}
    b-loading(:is-full-page="false" :active="loading")

    template(v-if="gate && !loadError")
      //- ── The question ────────────────────────────────────────────────
      .feg-block
        .feg-block-head
          h3.feg-block-title {{ $t('firmEducationGate.questionTitle') }}
          span.tag(:class="ownTag('question')") {{ ownLabel('question') }}
        p.feg-block-hint {{ $t('firmEducationGate.questionHint') }}
        b-input(
          v-model="form.question"
          type="textarea"
          rows="4"
          maxlength="600"
          :has-counter="true"
        )

      //- ── The two answers ─────────────────────────────────────────────
      .feg-block
        .feg-block-head
          h3.feg-block-title {{ $t('firmEducationGate.answersTitle') }}
          span.tag(:class="ownTag('options')") {{ ownLabel('options') }}
        p.feg-block-hint {{ $t('firmEducationGate.answersHint') }}
        .columns
          .column(v-for="(option, index) in form.options" :key="option.value")
            b-field(:label="$t('firmEducationGate.option.' + option.value)")
              b-input(v-model="form.options[index].label" maxlength="80")
            b-field(:label="$t('firmEducationGate.acknowledgement')")
              b-input(
                v-model="form.options[index].acknowledgement"
                type="textarea"
                rows="3"
                maxlength="400"
              )

      //- ── The reason line ─────────────────────────────────────────────
      .feg-block
        .feg-block-head
          h3.feg-block-title {{ $t('firmEducationGate.reasonTitle') }}
          span.tag(:class="ownTag('reason')") {{ ownLabel('reason') }}
        p.feg-block-hint {{ $t('firmEducationGate.reasonHint') }}
        b-input(v-model="form.reason" maxlength="300")
        p.feg-warn(v-if="reasonMissingPlaceholder") {{ $t('firmEducationGate.reasonNoPlaceholder') }}

      //- ── What makes it appear ────────────────────────────────────────
      .feg-block
        .feg-block-head
          h3.feg-block-title {{ $t('firmEducationGate.phrasesTitle') }}
          span.tag(:class="ownTag('phrases')") {{ ownLabel('phrases') }}
        p.feg-block-hint {{ $t('firmEducationGate.phrasesHint') }}
        .feg-phrase(v-for="(phrase, index) in form.phrases" :key="'p' + index")
          b-input(
            v-model="form.phrases[index]"
            maxlength="120"
            :placeholder="$t('firmEducationGate.phrasePlaceholder')"
          )
          b-button(
            type="is-text"
            icon-left="close"
            :aria-label="$t('firmEducationGate.removePhrase')"
            @click="removePhrase(index)"
          ) {{ $t('firmEducationGate.removePhrase') }}
        b-button.feg-add(type="is-light" icon-left="plus" @click="addPhrase") {{ $t('firmEducationGate.addPhrase') }}

      //- ── Actions ─────────────────────────────────────────────────────
      b-notification(v-if="saveError" type="is-danger" :closable="false") {{ saveError }}
      .feg-bar
        b-button(type="is-primary" :loading="saving" @click="save") {{ $t('firmEducationGate.save') }}
        b-button(
          type="is-light"
          :disabled="!hasOwn || saving"
          @click="resetToInherited"
        ) {{ $t('firmEducationGate.reset') }}
        b-button(type="is-text" @click="toggleHistory") {{ showHistory ? $t('firmEducationGate.hideHistory') : $t('firmEducationGate.showHistory') }}

      //- ── Version history ─────────────────────────────────────────────
      .feg-history(v-if="showHistory")
        p.feg-block-hint(v-if="history.length === 0") {{ $t('firmEducationGate.noHistory') }}
        b-table(v-else :data="history" :striped="true" :narrowed="true")
          b-table-column(v-slot="props" field="saved_at" :label="$t('firmEducationGate.when')")
            | {{ props.row.saved_at }}
          b-table-column(v-slot="props" field="saved_by" :label="$t('firmEducationGate.who')")
            | {{ props.row.saved_by }}
          b-table-column(v-slot="props" :label="''")
            b-button(type="is-text" @click="restore(props.row.id)") {{ $t('firmEducationGate.restore') }}
</template>

<script>
/**
 * The Education Gate hub tab — item 2.9.
 *
 * The question an advisor is asked, before any recommendation, when the engine can see a
 * client is not comfortable reading their own numbers.
 *
 * Design: `design/EDUCATION-GATE.md` §8. Artefact: `design/mockups/education-gate.html`.
 *
 * 🔴 THIS SCREEN IS THE REASON THE FEATURE IS FINISHED RATHER THAN HALF-DONE. Mike's
 * binding ruling of 2026-08-16: content that shapes what the AI does surfaces on a hub
 * page, mentor first, cascading down. Wiring the gate into the engine and leaving its
 * wording in `data/education-gate.json` would have made it live and untouchable — the
 * exact state the 4.16 sweep found 102 times.
 *
 * ⚠ THE ANSWER *VALUES* ARE NOT EDITABLE, ONLY THEIR LABELS. `education_first` and
 * `technical` are the contract with `strategyResolver`; a renamed button still does what
 * it did, and there is no third option to add. The backend rejects anything else rather
 * than storing a value nothing downstream understands.
 */
export default {
  name: 'FirmEducationGate',

  props: {
    /** Bearer token for the authenticated proxy calls. */
    apiToken: {
      type: String,
      required: true
    }
  },

  data () {
    return {
      loading: true,
      saving: false,
      loadError: null,
      saveError: null,
      /** The gate in force at this tier — platform, with every level's changes applied. */
      gate: null,
      /** Only what THIS tier set itself. Drives the set-here / inherited badges. */
      own: {},
      /** What this tier would see if it set nothing — resolved from the parent. */
      inherited: null,
      hasOwn: false,
      showHistory: false,
      history: [],
      /** The editable copy. Never the same object as `gate`. */
      form: { question: '', reason: '', options: [], phrases: [] }
    }
  },

  computed: {
    /**
     * The reason line must keep its {phrase} placeholder or the advisor is told a gate
     * fired without being told what fired it — which is the 2026-07-16 ruling broken.
     * A warning rather than a block: an empty reason is a legitimate choice, and the
     * backend drops the sentence rather than printing a literal placeholder.
     *
     * @returns {boolean} true when a non-empty reason has lost its placeholder
     */
    reasonMissingPlaceholder () {
      return !!(this.form.reason && !this.form.reason.includes('{phrase}'))
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** Load the gate, this tier's own changes, and what it inherits. */
    async load () {
      this.loading = true
      this.loadError = null
      try {
        const data = await this.api('GET', '/api/firm-manager/education-gate')
        this.applyPayload(data)
      } catch (err) {
        this.loadError = this.$t('firmEducationGate.loadFailed') + ' ' + err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put a backend response into the screen's state, and rebuild the editable copy.
     *
     * @param {Object} data - the route's response
     */
    applyPayload (data) {
      this.gate = data.gate
      this.own = data.own || {}
      this.inherited = data.inherited || null
      this.hasOwn = !!data.hasOwn
      this.form = {
        question: data.gate.question,
        reason: data.gate.reason || '',
        // Copied, not referenced: editing the form must not mutate the resolved gate the
        // badges are computed against.
        options: (data.gate.options || []).map(o => ({
          value: o.value,
          label: o.label,
          acknowledgement: o.acknowledgement || ''
        })),
        phrases: (data.gate.phrases || []).slice()
      }
    },

    /**
     * Has this tier set this field itself, or is it inheriting it?
     *
     * @param {string} field - a top-level gate field
     * @returns {string} the Buefy tag class
     */
    ownTag (field) {
      return Object.prototype.hasOwnProperty.call(this.own, field) ? 'is-info' : 'is-light'
    },

    /**
     * @param {string} field - a top-level gate field
     * @returns {string} "Set here" or "Inherited"
     */
    ownLabel (field) {
      return Object.prototype.hasOwnProperty.call(this.own, field)
        ? this.$t('firmEducationGate.setHere')
        : this.$t('firmEducationGate.inherited')
    },

    /** Add an empty phrase row for the manager to type into. */
    addPhrase () {
      this.form.phrases.push('')
    },

    /**
     * @param {number} index - the row to drop
     */
    removePhrase (index) {
      this.form.phrases.splice(index, 1)
    },

    /**
     * This tier's own changes only — the fields whose value differs from what would be
     * inherited. Sending the whole resolved gate would freeze every field at today's
     * inherited value and silently stop the level above's corrections arriving.
     *
     * @returns {Object} the partial override to store
     */
    payload () {
      const from = this.inherited || {}
      const out = {}
      if (this.form.question !== from.question) { out.question = this.form.question }
      if ((this.form.reason || '') !== (from.reason || '')) { out.reason = this.form.reason }

      const inheritedOptions = from.options || []
      const changed = this.form.options.some((o, i) => {
        const was = inheritedOptions[i] || {}
        return o.label !== was.label || (o.acknowledgement || '') !== (was.acknowledgement || '')
      })
      if (changed) { out.options = this.form.options }

      const phrases = this.form.phrases.map(p => p.trim()).filter(Boolean)
      const inheritedPhrases = from.phrases || []
      if (phrases.length !== inheritedPhrases.length ||
          phrases.some((p, i) => p !== inheritedPhrases[i])) {
        out.phrases = phrases
      }
      return out
    },

    /** Save this tier's own changes. */
    async save () {
      this.saving = true
      this.saveError = null
      try {
        const data = await this.api('POST', '/api/firm-manager/education-gate', { gate: this.payload() })
        this.applyPayload(data)
        this.$buefy.toast.open({ message: this.$t('firmEducationGate.saved'), type: 'is-success' })
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /** Clear this tier's changes so it inherits from the level above again. */
    async resetToInherited () {
      this.saving = true
      this.saveError = null
      try {
        const data = await this.api('POST', '/api/firm-manager/education-gate', { gate: {} })
        this.applyPayload(data)
        this.$buefy.toast.open({ message: this.$t('firmEducationGate.reset_done'), type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /** Show or hide the saved versions of this tier's own changes. */
    async toggleHistory () {
      this.showHistory = !this.showHistory
      if (this.showHistory) { await this.loadHistory() }
    },

    /** Read every saved version of THIS tier's own changes. */
    async loadHistory () {
      try {
        const data = await this.api('GET', '/api/firm-manager/education-gate/history')
        this.history = data.history || []
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * @param {number} versionId - the version to put back
     */
    async restore (versionId) {
      this.saving = true
      this.saveError = null
      try {
        const data = await this.api('POST', '/api/firm-manager/education-gate/restore', { versionId })
        this.applyPayload(data)
        await this.loadHistory()
        this.$buefy.toast.open({ message: this.$t('firmEducationGate.restored'), type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Thin authenticated fetch — mirrors `FirmAiPrompts`'s helper so this tab can be
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
.feg-intro {
  background: #eef5fc;
  border: 1px solid #9cc4e8;
  border-left: 4px solid #0a5ea8;
  border-radius: 5px;
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.feg-block {
  border: 2px solid #63c48d;
  background: #eefaf2;
  border-radius: 7px;
  padding: 1.05rem 1.15rem 1.15rem;
  margin-bottom: 1.5rem;
}

.feg-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.feg-block-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f7a45;
}

.feg-block-hint {
  margin: 0.15rem 0 1rem;
  font-size: 0.82rem;
  color: #4a6a58;
}

.feg-warn {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #b35309;
}

.feg-phrase {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.feg-phrase >>> .control {
  flex: 1;
}

.feg-add {
  margin-top: 0.35rem;
}

.feg-bar {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  border-top: 1px solid #e2e6ec;
  padding-top: 1.05rem;
  margin-top: 1.3rem;
}

.feg-history {
  margin-top: 1.3rem;
}
</style>

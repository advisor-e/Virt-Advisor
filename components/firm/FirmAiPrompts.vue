<template lang="pug">
.aip
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    //- 🔴 THE PICKER IS THE MENTOR'S ALONE, and it is not gated on the tier — it is
    //- gated on how many documents this caller was actually given. Below the mentor
    //- that is one, and a picker offering a choice of one is furniture (Mike,
    //- 2026-08-22). Asking the data rather than the tier means the day a second
    //- manager-facing prompt is added, the picker returns by itself.
    .aip-picker(v-if="hasPicker" role="group" :aria-label="$t('firmAiPrompts.pickerLabel')")
      button.aip-card(
        v-for="p in prompts"
        :key="p.id"
        type="button"
        :class="{ 'is-on': p.id === activePromptId }"
        :aria-pressed="String(p.id === activePromptId)"
        @click="choose(p.id)"
      )
        span.aip-cname {{ p.name }}
        span.aip-csub {{ p.subtitle }}
        span.aip-cmeta {{ metaFor(p) }}

    template(v-if="activePrompt")
      .notification.is-info.is-light.aip-intro
        p.is-size-7 {{ $t('firmAiPrompts.intro') }}

      //- ── What you can set — first on the page, deliberately ──
      //- Document order would bury the three settings inside sections 4, 5 and 10
      //- of twelve. The artefact turns the page inside out and so does this.
      .aip-yours(v-if="editableVars.length")
        h3.aip-h {{ $t('firmAiPrompts.yoursHeading') }}
        p.aip-hint {{ $t('firmAiPrompts.yoursHint') }}

        .aip-var(v-for="v in editableVars" :key="v.id")
          .aip-vleft
            .aip-vnum {{ $t('firmAiPrompts.settingN', { n: v.n }) }}
            label.aip-vlabel(:for="'aip-' + v.id") {{ v.label }}
            p.aip-vwhat {{ v.what }}
            //- The ONE setting where leaving it blank stops the work instead of
            //- falling back to a default. That difference is real, so it is said.
            .aip-ask(v-if="showAskWarning(v)") {{ $t('firmAiPrompts.askWarning') }}
          .aip-vright
            b-select(
              v-if="v.type === 'choice'"
              :id="'aip-' + v.id"
              v-model="form[v.id]"
              size="is-small"
              expanded)
              option(v-for="o in v.choices" :key="o.value" :value="o.value") {{ o.label }}
            b-input(
              v-else-if="v.type === 'text'"
              :id="'aip-' + v.id"
              v-model="form[v.id]"
              size="is-small"
              :maxlength="v.maxLength || null"
              :placeholder="$t('firmAiPrompts.notSet')")
            b-input(
              v-else
              :id="'aip-' + v.id"
              v-model.number="form[v.id]"
              type="number"
              step="any"
              size="is-small"
              :min="v.min"
              :max="v.max")
            .aip-badges
              b-tag(:type="badgeFor(v).type" size="is-small") {{ badgeFor(v).label }}

      //- ── Nothing to set — the honest empty state, not an empty green box ──
      .aip-nothing(v-else)
        h3.aip-h {{ $t('firmAiPrompts.nothingHeading') }}
        p.is-size-7 {{ $t('firmAiPrompts.nothingBody') }}

      //- ── Share a prompt — the manager's own words, checked (item 4.31) ──
      //- Placed BELOW the settings and ABOVE the method on purpose. The settings
      //- were put first for a reason that still holds (a manager must not scroll
      //- six screens of locked text to reach them); the method below is reference
      //- reading, and a tool buried under it is a tool nobody finds.
      firm-prompt-check(:api-token="apiToken")

      //- ── The material this level has put in force (item 4.31, Lane B) ──
      //- Below the checker on purpose: a manager forms an opinion about a
      //- prompt before they put one into use.
      firm-prompt-material(:api-token="apiToken")

      //- ── How your clients' information is protected ──
      //- 🔴 THE ONE PARAPHRASE ON THE SCREEN. Its words come from the backend, beside
      //- the protocol they describe, so this template cannot drift from what is
      //- actually sent. See data/ai-prompts.json → _protectionPanelNote.
      .aip-prot(v-if="protectionPanel")
        h3.aip-h {{ protectionPanel.heading }}
        p.aip-hint {{ protectionPanel.lede }}
        ul.aip-protlist
          li(v-for="(line, i) in protectionPanel.lines" :key="i") {{ line.text }}

      //- ── The method — every locked section, read-only, in full ──
      .aip-method
        h3.aip-h {{ $t('firmAiPrompts.methodHeading') }}
        p.aip-hint {{ $t('firmAiPrompts.methodHint') }}

        .aip-sec(v-for="s in activePrompt.sections" :key="s.id")
          button.aip-sechead(
            type="button"
            :aria-expanded="String(openSectionId === s.id)"
            :aria-label="openSectionId === s.id ? $t('firmAiPrompts.closeSection') : $t('firmAiPrompts.openSection')"
            @click="toggleSection(s.id)"
          )
            span.aip-caret {{ openSectionId === s.id ? '▾' : '▸' }}
            span.aip-secn {{ s.n }}
            span.aip-sectitle {{ s.heading }}
            b-tag(:type="appliesTag(s).type" size="is-small") {{ appliesTag(s).label }}
          //- 🔴 A SECTION BODY IS TEXT, NEVER A CONTROL. There is no input here at any
          //- tier, which is what "the body is the method and belongs to the platform"
          //- means in the markup rather than only in the design document.
          .aip-secbody(v-if="openSectionId === s.id")
            p.aip-secpara(v-for="(para, i) in paragraphs(s.body)" :key="i") {{ para }}
            .aip-applies(v-if="s.appliesNote") {{ s.appliesNote }}

      b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

      .buttons.aip-btns
        b-button(
          v-if="editableVars.length"
          type="is-primary"
          :loading="saving"
          @click="save") {{ $t('firmAiPrompts.save') }}
        b-button(
          v-if="editableVars.length"
          type="is-light"
          :disabled="!hasOwn || saving"
          @click="confirmReset") {{ $t('firmAiPrompts.reset') }}
        b-button(type="is-text" @click="toggleHistory")
          | {{ showHistory ? $t('firmAiPrompts.historyClose') : $t('firmAiPrompts.historyOpen') }}

      .box(v-if="showHistory")
        p.has-text-weight-semibold.mb-2 {{ $t('firmAiPrompts.historyHeading') }}
        p.is-size-7.has-text-grey(v-if="!history.length") {{ $t('firmAiPrompts.historyEmpty') }}
        table.table.is-fullwidth.is-narrow(v-else)
          tbody
            tr(v-for="h in history" :key="h.id")
              td {{ $t('firmAiPrompts.historyVersion', { n: h.version }) }}
              td.is-size-7.has-text-grey {{ h.created_by }}
              td.is-size-7.has-text-grey {{ h.created_at }}
              td.has-text-right
                b-button(size="is-small" type="is-light" @click="restore(h.id)")
                  | {{ $t('firmAiPrompts.historyRestore') }}
</template>

<script>
import FirmPromptCheck from '~/components/firm/FirmPromptCheck.vue'
import FirmPromptMaterial from '~/components/firm/FirmPromptMaterial.vue'

/**
 * FirmAiPrompts — the tab a manager opens to read the instructions the AI is given, and
 * to set the handful of things that are theirs to decide.
 *
 * ASKED FOR BY MIKE, 2026-08-21: *"I want to create a 'AI Prompts' page in the hub pages
 * (Mentor, Global Group Manager, Group Manager and Firm Manager) so that users have the
 * ability to influence the approach to formulas in the performance report models"*, and
 * *"They should appear in the hub page in an editable form but NOT over ride key protocols
 * which we have already deemed as essential for security etc."*
 *
 * Design: `design/AI-PROMPTS-PAGE.md`. Artefact: `design/mockups/ai-prompts-tab.html`,
 * SECOND drawing — the first was written for an engineer and he rejected it on sight:
 * *"who is supposed to be working with this page? A computer coder or an accountant …?
 * If its the latter (and it is) then your version risks being too complicated for them."*
 *
 * 🔴 WHAT THAT RULING MEANS IN THIS FILE. Below the mentor a manager gets ONE document,
 * THREE settings and ONE paragraph about safety. The security prompt's seven engineering
 * headings are mentor-only — filtered on the BACKEND (`aiPrompts.promptsForTier`), never
 * hidden here, so a tier cannot be talked out of the filter by a request. This component
 * renders what it is given and asks the data how many documents it has, not the tier.
 *
 * 🔴 NOTHING ON THIS SCREEN CAN EDIT A PROTOCOL, AND THAT IS STRUCTURAL RATHER THAN
 * DISABLED. The locked sections render as text with no input bound to them at any tier,
 * and the platform protocols are not in this component's data at all — the backend
 * prepends them at send time (`server/utils/aiPrompts.js` → `PROTOCOL_BLOCK`). The
 * protection panel below describes them; it never carries them.
 *
 * ⚠ IT SHOWS WHERE EVERY VALUE CAME FROM, not just what it is — the same three badges,
 * for the same reason, as `FirmPropertyTaxRules`. A level holds only its own changes
 * (`tier-cascade.md` P3), so a setting reading "inherited" keeps receiving the level
 * above's corrections and one reading "set here" is protected from them. Two ways of
 * showing inheritance is how two ways drift apart.
 *
 * ⚠ THE TWO MIDDLE TIERS CANNOT BE OPENED BY A REAL LOGIN TODAY (`config/integration.js`
 * ships their role names empty, fail-closed). This component is correct for four tiers
 * and exercisable on two. Stated rather than implied.
 */
export default {
  name: 'FirmAiPrompts',

  components: { FirmPromptCheck, FirmPromptMaterial },

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
      history: [],
      /** The prompts this tier is shown, already filtered and resolved by the backend. */
      prompts: [],
      /** The four plain sentences, from `data/ai-prompts.json`. */
      protectionPanel: null,
      /** This tier's OWN settings: `{ promptId: { variableId: value } }`. */
      own: {},
      /** Which document is open. */
      activePromptId: '',
      /** Which locked section is expanded. One at a time — see `toggleSection`. */
      openSectionId: '',
      /** The active prompt's values in force, which the inputs edit. */
      form: {}
    }
  },

  computed: {
    /** The document currently open. */
    activePrompt () {
      return this.prompts.find(p => p.id === this.activePromptId) || null
    },

    /**
     * Only the mentor has two documents today, so only the mentor gets a picker — but
     * this asks the data, not the tier, so a second manager-facing prompt brings it back
     * without a second decision.
     * @returns {boolean}
     */
    hasPicker () {
      return this.prompts.length > 1
    },

    /** The settings on the open document. Empty for a document that is all protocol. */
    editableVars () {
      return (this.activePrompt && this.activePrompt.variables) || []
    },

    /** Has this level set anything of its own? Drives the reset button. */
    hasOwn () {
      return Object.keys(this.own).some(id => Object.keys(this.own[id] || {}).length > 0)
    },

    /** This level's own settings for the open document. */
    ownHere () {
      return (this.own && this.own[this.activePromptId]) || {}
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** Read the prompts, this level's own settings, and the protection panel. */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/ai-prompts')
        this.applyPayload(data)
      } catch (err) {
        this.loadError = this.$t('firmAiPrompts.loadFailed') + ' ' + err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put a backend response into the screen's state.
     *
     * ⚠ The open document is PRESERVED across a save, a reset and a restore. Nothing
     * moves under the manager's hand as a side effect of their own action (ruled
     * 2026-08-15) — a save that silently jumped back to the first document would be
     * exactly that.
     *
     * @param {object} data - `{ prompts, protectionPanel, own }`
     */
    applyPayload (data) {
      this.prompts = data.prompts || []
      if (data.protectionPanel) { this.protectionPanel = data.protectionPanel }
      this.own = data.own || {}

      const stillThere = this.prompts.some(p => p.id === this.activePromptId)
      if (!stillThere) {
        this.activePromptId = this.prompts.length ? this.prompts[0].id : ''
        this.openSectionId = ''
      }
      this.buildForm()
    },

    /**
     * Rebuild the inputs from the values in force on the open document.
     *
     * The whole object is replaced rather than patched key by key: Vue 2 does not track
     * properties added to an existing object, and a silently non-reactive input is a box
     * that holds a value nobody can change.
     */
    buildForm () {
      const built = {}
      this.editableVars.forEach((v) => {
        built[v.id] = v.value === null || v.value === undefined ? '' : v.value
      })
      this.form = built
    },

    /**
     * Open a different document.
     * @param {string} promptId
     */
    choose (promptId) {
      if (promptId === this.activePromptId) { return }
      this.activePromptId = promptId
      this.openSectionId = ''
      this.saveError = ''
      this.buildForm()
    },

    /**
     * Expand one locked section, or close the open one.
     *
     * One at a time is deliberate: opened together the cash flow prompt runs to roughly
     * six screens of text, and the reason the settings sit on top is so a manager never
     * has to scroll through it to reach them.
     *
     * @param {string} sectionId
     */
    toggleSection (sectionId) {
      this.openSectionId = this.openSectionId === sectionId ? '' : sectionId
    },

    /**
     * The section body, split for rendering. Kept as separate paragraphs rather than one
     * pre-wrapped block so the text reflows on a narrow screen.
     * @param {string} body
     * @returns {string[]}
     */
    paragraphs (body) {
      return String(body || '').split('\n').filter(line => line.trim() !== '')
    },

    /**
     * The one-line summary under a document's name in the picker.
     * @param {object} prompt
     * @returns {string}
     */
    metaFor (prompt) {
      const sections = (prompt.sections || []).length
      const settings = (prompt.variables || []).length
      return settings
        ? this.$t('firmAiPrompts.metaSettings', { sections, settings })
        : this.$t('firmAiPrompts.metaNoSettings', { sections })
    },

    /**
     * Where this value came from, as the manager needs to hear it.
     *
     * Three states, not two, because "I decided this", "the level above decided this" and
     * "nobody has decided this anywhere" are three different things and only the first is
     * protected from a change made above.
     *
     * @param {object} v - the variable, as the backend resolved it
     * @returns {{label: string, type: string}}
     */
    badgeFor (v) {
      if (Object.prototype.hasOwnProperty.call(this.ownHere, v.id)) {
        return { label: this.$t('firmAiPrompts.badgeHere'), type: 'is-info is-light' }
      }
      if (v.source === 'set') {
        return { label: this.$t('firmAiPrompts.badgeInherited'), type: 'is-light' }
      }
      return { label: this.$t('firmAiPrompts.badgeNowhere'), type: 'is-light' }
    },

    /**
     * Does this setting stop the work when it is left blank?
     *
     * True only for a variable whose `unsetRule` is `ask` and which has no value — the
     * currency, today. Every other blank falls back to a default that announces itself.
     *
     * @param {object} v
     * @returns {boolean}
     */
    showAskWarning (v) {
      return v.unsetRule === 'ask' &&
        (this.form[v.id] === '' || this.form[v.id] === null || this.form[v.id] === undefined)
    },

    /**
     * The badge on a locked section that records whether it applies to this app.
     *
     * A section with no `appliesHere` is simply part of the method and reads "fixed". The
     * four states below exist only on the security document, and saying "does not apply
     * here" out loud is the honest part — a control listed without that note reads as a
     * promise the app is not keeping.
     *
     * @param {object} section
     * @returns {{label: string, type: string}}
     */
    appliesTag (section) {
      switch (section.appliesHere) {
        case 'yes': return { label: this.$t('firmAiPrompts.appliesYes'), type: 'is-success is-light' }
        case 'no': return { label: this.$t('firmAiPrompts.appliesNo'), type: 'is-light' }
        case 'already': return { label: this.$t('firmAiPrompts.appliesAlready'), type: 'is-info is-light' }
        case 'partly': return { label: this.$t('firmAiPrompts.appliesPartly'), type: 'is-warning is-light' }
        default: return { label: this.$t('firmAiPrompts.sectionFixed'), type: 'is-light' }
      }
    },

    /**
     * The open document's settings, as the backend wants them.
     *
     * 🔴 A BLANK IS OMITTED, NEVER SENT AS A VALUE. `''` is "I have not set this", and
     * for the currency that is a real state with a declared consequence — the AI stops
     * and asks. Sending it as an empty string would store a setting that says nothing and
     * silence the question. Same exception, same reasoning, as `maxLvr` on the tax rules.
     *
     * Only the open document is sent, and the backend merges it over what is stored, so
     * setting the cash flow prompt never disturbs another document's settings.
     *
     * @returns {object} `{ '<promptId>': { '<variableId>': value } }`
     */
    payload () {
      const vars = {}
      this.editableVars.forEach((v) => {
        const value = this.form[v.id]
        if (value === '' || value === null || value === undefined) { return }
        vars[v.id] = value
      })
      const merged = { ...this.own }
      merged[this.activePromptId] = vars
      return merged
    },

    async save () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/ai-prompts', { overrides: this.payload() })
        this.applyPayload(data)
        this.$buefy.toast.open({ message: this.$t('firmAiPrompts.saved'), type: 'is-success' })
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Clearing this level's settings is not undoable from the screen and hands every
     * setting back to the level above — so it asks first.
     */
    confirmReset () {
      this.$buefy.dialog.confirm({
        title: this.$t('firmAiPrompts.resetTitle'),
        message: this.$t('firmAiPrompts.resetBody'),
        confirmText: this.$t('firmAiPrompts.reset'),
        type: 'is-warning',
        onConfirm: () => this.reset()
      })
    },

    async reset () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/ai-prompts', { overrides: {} })
        this.applyPayload(data)
        this.$buefy.toast.open({ message: this.$t('firmAiPrompts.nowInheriting'), type: 'is-success' })
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
        const data = await this.api('GET', '/api/firm-manager/ai-prompts/history')
        this.history = data.history || []
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Put an earlier version of this level's settings back in force.
     * @param {number} versionId
     */
    async restore (versionId) {
      try {
        const data = await this.api('POST', '/api/firm-manager/ai-prompts/restore', { versionId })
        this.applyPayload(data)
        this.$buefy.toast.open({ message: this.$t('firmAiPrompts.restored'), type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Thin authenticated fetch — mirrors `FirmPropertyTaxRules`'s helper so this tab can
     * be mounted and tested on its own; the backend re-checks authorisation on every call
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
/* The picker. Only the mentor ever sees it. */
.aip-picker { display: flex; gap: 0.7rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.aip-card {
  flex: 1 1 300px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: left;
  border: 1px solid #d7dde6;
  border-radius: 6px;
  background: #fff;
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  font: inherit;
}
.aip-card.is-on { border-color: #002b64; border-width: 2px; padding: 0.7rem 0.85rem; }
.aip-cname { font-weight: 700; color: #002b64; font-size: 0.92rem; }
.aip-csub { font-size: 0.76rem; color: #7a869a; }
.aip-cmeta { font-size: 0.72rem; color: #5a6b82; margin-top: 0.35rem; }

.aip-intro { margin-bottom: 1.5rem; }
.aip-h { font-size: 1rem; font-weight: 700; color: #002b64; margin-bottom: 0.15rem; }
.aip-hint { font-size: 0.81rem; color: #7a869a; margin-bottom: 1rem; }

/* What you can set — the point of the page, so it is the one block that is coloured. */
.aip-yours {
  border: 2px solid #63c48d;
  background: #eefaf2;
  border-radius: 7px;
  padding: 1.05rem 1.15rem 1.15rem;
  margin-bottom: 1.6rem;
}
.aip-yours .aip-h { color: #1f7a45; }
.aip-yours .aip-hint { color: #4a6a58; }

.aip-var {
  background: #fff;
  border: 1px solid #cfe6da;
  border-radius: 6px;
  padding: 0.8rem 0.95rem;
  margin-bottom: 0.7rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 1rem;
  align-items: start;
}
.aip-var:last-child { margin-bottom: 0; }
.aip-vnum {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: #7a869a;
}
.aip-vlabel { display: block; font-weight: 700; color: #002b64; font-size: 0.93rem; }
.aip-vwhat { font-size: 0.79rem; color: #5a6b82; margin-top: 0.15rem; }
.aip-ask {
  margin-top: 0.5rem; font-size: 0.76rem; border-radius: 4px; padding: 0.4rem 0.55rem;
  color: #b35309; background: #fffaf3; border: 1px solid #ffb870;
}
.aip-badges { margin-top: 0.45rem; }

/* Nothing to set — a stated result, never an empty green box. */
.aip-nothing {
  border: 1px solid #b8c6d8; background: #f3f6fa; border-radius: 7px;
  padding: 1rem 1.15rem; margin-bottom: 1.6rem;
}

.aip-prot {
  border: 1px solid #b8c6d8; background: #f3f6fa; border-radius: 6px;
  padding: 0.9rem 1rem; margin-bottom: 1.8rem;
}
.aip-prot .aip-hint { margin-bottom: 0.75rem; }
.aip-protlist { list-style: none; margin: 0; padding: 0; }
.aip-protlist li {
  position: relative; padding-left: 1.35rem; margin-bottom: 0.4rem;
  font-size: 0.845rem; color: #363636;
}
.aip-protlist li:last-child { margin-bottom: 0; }
.aip-protlist li::before {
  content: "\2713"; position: absolute; left: 0; top: 0; color: #1f7a45; font-weight: 700;
}

/* The method. Every row is text; nothing here is an input at any tier. */
.aip-sec { border: 1px solid #e2e6ec; border-radius: 5px; margin-bottom: 0.4rem; background: #fff; }
.aip-sechead {
  display: flex; align-items: center; gap: 0.65rem; width: 100%;
  padding: 0.55rem 0.8rem; background: none; border: 0; cursor: pointer;
  font: inherit; text-align: left;
}
.aip-caret { color: #7a869a; font-size: 0.8rem; width: 0.7rem; flex: 0 0 auto; }
.aip-secn {
  font-size: 0.72rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #7a869a; flex: 0 0 1.8rem;
}
.aip-sectitle { font-size: 0.87rem; color: #363636; flex: 1 1 auto; }
.aip-secbody {
  padding: 0.75rem 0.8rem 0.85rem 3.15rem; font-size: 0.82rem; color: #5a6b82;
  border-top: 1px solid #f0f2f5;
}
.aip-secpara { margin: 0 0 0.55rem; white-space: pre-wrap; }
.aip-secpara:last-child { margin-bottom: 0; }
.aip-applies {
  margin-top: 0.55rem; font-size: 0.78rem; color: #5a6b82;
  background: #f6f7f9; border: 1px solid #d8dce3; border-radius: 4px; padding: 0.4rem 0.55rem;
}

.aip-method { margin-bottom: 1.2rem; }
.aip-btns { margin-top: 1.2rem; }

@media (max-width: 768px) {
  .aip-var { grid-template-columns: 1fr; }
}
</style>

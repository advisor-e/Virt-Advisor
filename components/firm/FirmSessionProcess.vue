<template lang="pug">
section.fsp
  b-loading(:is-full-page="false" :active="loading")

  b-notification(v-if="loadError" type="is-danger" :closable="false") {{ loadError }}
  b-notification(v-if="saveError" type="is-danger" :closable="true" @close="saveError = ''") {{ saveError }}

  template(v-if="!loading && !loadError")
    //- 🔴 THE LADDER — Decision C, drawn on design/mockups/strategy-session-process.html.
    //- It says who wrote the session in force and where this tier sits, so an inherited
    //- process is never mistaken for one this tier authored.
    .fsp-ladder
      .fsp-rung(
        v-for="rung in ladder"
        :key="rung.tier"
        :class="{ 'is-owner': rung.isOwner, 'is-you': rung.isYou }"
      )
        b.fsp-rung-name {{ rung.label }}
        span.fsp-rung-state {{ rung.state }}

    p.fsp-lede {{ lede }}

    strategy-step-builder(
      :cards="placeableCards"
      :steps="steps"
      :show-purpose="true"
      @steps-changed="onStepsChanged"
    )

    .fsp-actions
      b-button(
        type="is-primary"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      ) {{ $t('sessionProcess.save') }}
      //- Only where this tier holds one of its own. Without this, authoring once is a
      //- one-way door and the tier silently stops receiving improvements from above.
      b-button(
        v-if="ownedHere"
        type="is-danger"
        outlined
        :loading="saving"
        @click="confirmRevert"
      ) {{ $t('sessionProcess.revert') }}
      b-button(type="is-text" @click="toggleHistory") {{ historyOpen ? $t('sessionProcess.hideHistory') : $t('sessionProcess.showHistory') }}

    section.fsp-history(v-if="historyOpen")
      p.fsp-none(v-if="!versions.length") {{ $t('sessionProcess.noHistory') }}
      table.table.is-fullwidth(v-else)
        thead
          tr
            th {{ $t('sessionProcess.versionCol') }}
            th {{ $t('sessionProcess.savedCol') }}
            th
        tbody
          tr(v-for="v in versions" :key="v.id")
            td {{ v.version }}
            td {{ v.created_at || v.createdAt }}
            td.fsp-right
              b-button(size="is-small" :loading="saving" @click="restore(v.id)") {{ $t('sessionProcess.restore') }}
</template>

<script>
/**
 * FirmSessionProcess — the standard planning session this tier hands down.
 *
 * 🔴 BUILT FROM THE APPROVED DRAWING, `design/mockups/strategy-session-process.html`
 * screen 2, approved by Mike 2026-09-21 with its four decisions ruled the same day.
 *
 * 🔴 ALL FOUR MANAGING TIERS AUTHOR — Decision C, a STATED JUDGEMENT AGAINST the
 * default-is-mentor-alone ruling of 2026-08-24. The reason is on the drawing: a firm's
 * planning method is exactly what one firm does differently from another. One screen
 * serves all four; the tier comes from the token, so nothing here chooses a scope.
 *
 * 🔴 IT REUSES THE ADVISOR'S STEP BUILDER RATHER THAN DRAWING A SECOND ONE. Arranging
 * steps and dropping concepts into them is the same interaction whoever is doing it, and
 * two builders would drift the first time one gained a fix the other did not. The only
 * difference is `show-purpose`: a manager writes what a step is for, an advisor reads it.
 *
 * ⚠ THE TRAY IS THE WHOLE LIBRARY, NOT ONE CLIENT'S SCOPE. A standard session is written
 * before any client exists, so every concept is offered — filtered only by whether it can
 * become a card at all, using the same `isPlaceableConcept` rule the advisor's screen
 * applies. A concept admitted here and not there would arrive as an empty step.
 *
 * Vue 2, Options API, Pug.
 */
import StrategyStepBuilder from '~/components/strategy/StrategyStepBuilder.vue'
import { isPlaceableConcept } from '~/utils/strategyCards'

/** The four managing tiers, top first — the settled vocabulary, never abbreviated. */
const TIERS = [
  { tier: 'mentor', labelKey: 'sessionProcess.tierMentor' },
  { tier: 'global_group_manager', labelKey: 'sessionProcess.tierGlobalGroupManager' },
  { tier: 'group_manager', labelKey: 'sessionProcess.tierGroupManager' },
  { tier: 'firm_manager', labelKey: 'sessionProcess.tierFirmManager' }
]

export default {
  name: 'FirmSessionProcess',

  components: { StrategyStepBuilder },

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
      /** `[{ key, name, purpose, items }]` — this tier's working copy. */
      steps: [],
      /** Every card the library can offer, from the backend. */
      cards: [],
      /** `{ scopeId, tier, shipped }` — whose session is in force. */
      source: null,
      /** True when THIS tier holds one of its own rather than inheriting. */
      ownedHere: false,
      /**
       * Which tier the VIEWER is, from the backend — not who wrote the session.
       *
       * 🔴 IT CANNOT BE READ OFF `source`. With the shipped default in force, `source`
       * says "mentor" for every viewer, so the mentor's own screen told the mentor it was
       * inheriting from somebody else.
       */
      tier: null,
      /** Set by any edit; cleared by a save. */
      dirty: false,
      historyOpen: false,
      versions: []
    }
  },

  computed: {
    /**
     * The library, filtered by the one rule that decides whether a concept can be a card.
     * @returns {Array<object>}
     */
    placeableCards () {
      return this.cards.filter(c => isPlaceableConcept(c.hasTable, c.conceptId))
    },

    /**
     * Whose session is in force, in words. Only ever used for a session somebody AUTHORED
     * — the shipped default has no author and takes its own sentence below.
     * @returns {string}
     */
    ownerLabel () {
      if (!this.source || this.source.shipped) { return '' }
      const found = TIERS.find(t => t.tier === this.source.tier)
      return found ? this.$t(found.labelKey) : ''
    },

    /**
     * The one sentence at the top: what you are looking at, and whether it is yours.
     *
     * 🔴 THREE CASES, NOT TWO, AND THE MISSING ONE READ AS NONSENSE. The shipped default
     * has no author, so the inherited sentence rendered "You are using the standard session
     * set by the standard session" — and at the MENTOR tier it was wrong as well as
     * clumsy, because the mentor inherits from nobody: the shipped file is the mentor's own
     * starting point. Found by opening the screen on 2026-09-21; the suite was green.
     *
     * @returns {string}
     */
    lede () {
      if (this.ownedHere) { return this.$t('sessionProcess.yoursLede') }
      if (this.source && this.source.shipped) {
        return this.tier === 'mentor'
          ? this.$t('sessionProcess.shippedMentorLede')
          : this.$t('sessionProcess.shippedLede')
      }
      return this.$t('sessionProcess.inheritedLede', { whose: this.ownerLabel })
    },

    /**
     * The four rungs, each saying whether it owns the session in force and whether it is
     * the tier the viewer is signed in as.
     *
     * ⚠ IT DOES NOT CLAIM TO KNOW WHAT THE OTHER THREE HOLD. This screen reads one scope
     * — its own — so the only rung that can be marked an owner is whichever tier the
     * RESOLVE named. Drawing "own version" against a tier we never asked about would be a
     * fabricated fact on a manager's screen.
     *
     * @returns {Array<{tier: string, label: string, state: string, isOwner: boolean, isYou: boolean}>}
     */
    ladder () {
      // 🔴 THE SHIPPED DEFAULT IS THE MENTOR'S RUNG. `source.tier` already says mentor for
      // it, so there is no special case here — but there WAS a bug: `shipped` was excluded
      // and every rung then rendered a bare dash, which says nothing and reads as broken.
      // Found by opening the screen on 2026-09-21.
      const ownerTier = this.source ? this.source.tier : null

      return TIERS.map((t) => {
        const isOwner = t.tier === ownerTier
        return {
          tier: t.tier,
          label: this.$t(t.labelKey),
          isOwner,
          // The tier the VIEWER is signed in as, which is not the same question as who
          // wrote the session — the mentor reading an unedited shipped default is both.
          isYou: t.tier === this.tier,
          state: isOwner
            ? this.$t('sessionProcess.rungOwns', { count: this.steps.length })
            : this.$t('sessionProcess.rungInherits')
        }
      })
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * The session in force for this tier, and the library to build one from.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const [process, cards] = await Promise.all([
          this.api('GET', '/api/strategy/session-process'),
          this.api('GET', '/api/strategy/session-process/cards')
        ])
        this.applyProcess(process)
        this.cards = cards.cards || []
      } catch (e) {
        this.loadError = e.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Take a resolve response onto the screen.
     *
     * ⚠ `key` IS ADDED HERE AND IS NEVER SAVED. The step builder needs a stable handle so
     * a name input keeps focus while it is typed; storage holds only name, purpose and
     * items.
     *
     * @param {{process: object, source: object, ownedHere: boolean}} body
     * @returns {void}
     */
    applyProcess (body) {
      const steps = (body.process && body.process.steps) || []
      this.steps = steps.map((s, i) => ({
        key: 's' + (i + 1),
        name: s.name || '',
        purpose: s.purpose || '',
        items: (s.items || []).slice()
      }))
      this.source = body.source || null
      this.tier = body.tier || null
      this.ownedHere = Boolean(body.ownedHere)
      this.dirty = false
    },

    /**
     * The builder emits the whole list; this screen holds it until Save.
     *
     * ⚠ NOT SAVED ON EVERY KEYSTROKE, unlike the advisor's session. This writes the
     * standard every firm beneath inherits, so it takes a deliberate press — and each
     * press is a version in the history.
     *
     * @param {Array<object>} next
     * @returns {void}
     */
    onStepsChanged (next) {
      this.steps = next
      this.dirty = true
    },

    /** @returns {Promise<void>} */
    async save () {
      this.saving = true
      this.saveError = ''
      try {
        await this.api('PUT', '/api/strategy/session-process', {
          steps: this.steps.map(s => ({ name: s.name, purpose: s.purpose, items: s.items }))
        })
        // Re-read rather than assume: the resolve is what decides whether this tier now
        // owns the session, and guessing it here is how a screen starts disagreeing with
        // what an advisor is actually handed.
        this.applyProcess(await this.api('GET', '/api/strategy/session-process'))
        if (this.historyOpen) { await this.loadVersions() }
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Going back to inheriting throws away this tier's own session, so it is confirmed.
     * @returns {void}
     */
    confirmRevert () {
      this.$buefy.dialog.confirm({
        message: this.$t('sessionProcess.revertConfirm'),
        confirmText: this.$t('sessionProcess.revertYes'),
        type: 'is-danger',
        onConfirm: () => this.revert()
      })
    },

    /** @returns {Promise<void>} */
    async revert () {
      this.saving = true
      this.saveError = ''
      try {
        this.applyProcess(await this.api('DELETE', '/api/strategy/session-process'))
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    /** @returns {Promise<void>} */
    async toggleHistory () {
      this.historyOpen = !this.historyOpen
      if (this.historyOpen) { await this.loadVersions() }
    },

    /** @returns {Promise<void>} */
    async loadVersions () {
      try {
        const body = await this.api('GET', '/api/strategy/session-process/versions')
        this.versions = body.versions || []
      } catch (e) {
        this.saveError = e.message
      }
    },

    /**
     * @param {string|number} versionId
     * @returns {Promise<void>}
     */
    async restore (versionId) {
      this.saving = true
      this.saveError = ''
      try {
        await this.api('POST', '/api/strategy/session-process/versions/' + versionId + '/restore')
        this.applyProcess(await this.api('GET', '/api/strategy/session-process'))
      } catch (e) {
        this.saveError = e.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Every call, with both failure modes turned into a message a manager can act on —
     * the house error rule, and the same shape the other hub panels use.
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
          credentials: 'same-origin',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error(this.$t('sessionProcess.unreachable'))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data.error && data.error.message) || this.$t('sessionProcess.saveFailed'))
      }
      return data
    }
  }
}
</script>

<style scoped>
.fsp-ladder {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}
.fsp-rung {
  flex: 1 1 10rem;
  border: 1px solid #d5e1ee;
  padding: 0.55rem 0.7rem;
  background: #fff;
}
.fsp-rung:first-child { border-radius: 8px 0 0 8px; }
.fsp-rung:last-child { border-radius: 0 8px 8px 0; }
.fsp-rung + .fsp-rung { border-left: 0; }
.fsp-rung.is-owner { background: #f3fbf5; border-color: #a8dcb4; }
.fsp-rung-name { display: block; color: #002b64; font-size: 0.8rem; }
.fsp-rung.is-owner .fsp-rung-name { color: #1d6b2b; }
.fsp-rung-state { font-size: 0.72rem; color: #5b6f8a; }

.fsp-lede { color: #23405f; margin-bottom: 0.9rem; max-width: 80ch; }

.fsp-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.9rem;
}

.fsp-history { margin-top: 1.1rem; }
.fsp-none { color: #5b6f8a; font-style: italic; }
.fsp-right { text-align: right; }

@media (max-width: 860px) {
  .fsp-rung { border-radius: 8px; border-left: 1px solid #d5e1ee; }
}
</style>

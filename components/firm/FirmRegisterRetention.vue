<template lang="pug">
section.register-retention
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('registerRetention.lede') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('registerRetention.loading') }}

  //- The period could not be READ. Said out loud rather than drawn as the platform
  //- default, because those two look identical on screen and only one of them means
  //- this tier's own choice is safe.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('registerRetention.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('registerRetention.retry') }}

  template(v-else)
    //- What is in force RIGHT NOW, said before anything editable. A manager arriving
    //- here needs the answer to "how long is it today" before the control to change it.
    .box.mb-4
      p.heading.mb-1 {{ $t('registerRetention.inForce') }}
      p.title.is-4.mb-2 {{ phrase }}
      //- 🔴 SET HERE / INHERITED / PLATFORM ARE THREE DIFFERENT FACTS AND THE SCREEN
      //- MUST NOT BLUR THEM. Without this a manager cannot tell a figure they chose
      //- from one they are living under, and "use the period from above" means nothing.
      p.has-text-grey.is-size-7(v-if="source === 'set-here'")
        | {{ $t('registerRetention.sourceOwn') }}
      p.has-text-grey.is-size-7(v-else-if="source === 'inherited'")
        | {{ $t('registerRetention.sourceInherited') }}
      p.has-text-grey.is-size-7(v-else) {{ $t('registerRetention.sourcePlatform') }}

    b-field(:label="$t('registerRetention.label')")
      b-select(
        v-model="chosen"
        :loading="saving"
        :aria-label="$t('registerRetention.label')"
      )
        option(v-for="m in choices" :key="m" :value="m") {{ monthsPhrase(m) }}

    //- The ceiling, stated where somebody would otherwise wonder why the list stops.
    p.has-text-grey.is-size-7.mt-2 {{ $t('registerRetention.ceilingNote', { max: max }) }}

    .buttons.mt-4
      b-button(
        type="is-primary"
        :loading="saving"
        :disabled="saving || chosen === ownMonths"
        @click="save"
      ) {{ $t('registerRetention.save') }}
      //- Only offered where there IS a level above to fall back to. At the mentor tier
      //- there is nothing to inherit, so the button would promise something untrue.
      b-button(
        v-if="ownMonths !== null"
        :loading="saving"
        :disabled="saving"
        @click="reset"
      ) {{ $t('registerRetention.useInherited') }}

    b-message.mt-3(v-if="saveError" type="is-danger" has-icon :closable="false")
      | {{ saveError }}

    //- ⚠ THE DIAL DELETES NOTHING, AND SAYING SO IS NOT REASSURANCE — it is the
    //- difference between what this control does and what a manager may assume it
    //- does. Decision 8 asked for a visible clock, never a purge.
    p.has-text-grey.is-size-7.mt-4 {{ $t('registerRetention.noDeletionNote') }}
</template>

<script>
import { fetchWithTimeout } from '~/utils/fetchWithTimeout'

/**
 * How long this tier keeps a client's staff register — item 5.1, Decision 8.
 *
 * 🔴 MIKE'S RULING, 2026-09-23: *"the data holding period to be no more than 18months -
 * this should flow down from mentor - through the cascade levels and then at firm manager
 * - be editable again. this way, at least a set period is loaded as a default."*
 *
 * ⚠ THIS IS NOT THE MEETING RETENTION DIAL AND MUST NEVER BE MERGED WITH IT. That period
 * is SPOKEN ALOUD to a client in approved consent wording; one control for both would let
 * a manager change a promise made out loud in a client's meeting while believing they were
 * shortening how long staff data is kept. `server/utils/registerRetention.js` states it at
 * length.
 *
 * ⚠ EVERY BOUND COMES FROM THE BACKEND, never from a constant here. The 18-month ceiling is
 * enforced in `validateRetentionMonths` — a screen that carried its own copy would drift
 * from the rule the moment either changed.
 */
export default {
  name: 'FirmRegisterRetention',

  props: {
    /**
     * Bearer token for the hub API. Every route is manager-gated on the backend
     * (`fmGuard`), so this prop cannot grant anything the caller's token does not
     * already carry.
     */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the period could not be READ — never merely "not set here". */
      error: false,
      saving: false,
      /** A failed SAVE, shown beside the button rather than replacing the screen. */
      saveError: null,
      /** The period in force, resolved through the cascade. */
      months: null,
      /** 'set-here' | 'inherited' | 'platform-default'. */
      source: '',
      /** What THIS tier has set itself — null when it is inheriting. */
      ownMonths: null,
      /** The period in words, as the backend renders it. */
      phrase: '',
      /** The bounds, from the backend. */
      min: 1,
      max: 18,
      /** The selection in the control, which may differ from what is saved. */
      chosen: null
    }
  },

  computed: {
    /**
     * The periods a manager may choose. Built from the backend's own bounds so the list
     * can never offer a value the validator would refuse.
     * @returns {number[]}
     */
    choices () {
      const out = []
      for (let m = this.min; m <= this.max; m++) { out.push(m) }
      return out
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * One period in words. Mirrors the backend's `retentionPhrase` for the options list,
     * which the backend cannot render because it never sees the list.
     * @param {number} m - whole months
     * @returns {string}
     */
    monthsPhrase (m) {
      if (m === 12) { return this.$t('registerRetention.oneYear') }
      return m === 1
        ? this.$t('registerRetention.oneMonth')
        : this.$t('registerRetention.nMonths', { n: m })
    },

    /**
     * Read the period in force at this tier, what this tier set itself, and the bounds.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      this.saveError = null
      try {
        const res = await fetchWithTimeout('/api/firm-manager/register-retention', {
          headers: { Authorization: 'Bearer ' + this.apiToken }
        })
        if (!res.ok) { throw new Error('read failed') }
        const data = await res.json()
        this.months = data.resolved.months
        this.source = data.resolved.source
        this.ownMonths = data.ownMonths
        this.phrase = data.phrase
        this.min = data.min
        this.max = data.max
        // The control opens on what is in force, so saving without touching it is a
        // no-op rather than a silent change to the platform default.
        this.chosen = data.resolved.months
      } catch (e) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Save this tier's own period. Re-reads afterwards rather than assuming, so the
     * badge and the phrase come from the backend that just stored it.
     * @returns {Promise<void>}
     */
    async save () {
      this.saving = true
      this.saveError = null
      try {
        const res = await fetchWithTimeout('/api/firm-manager/register-retention', {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer ' + this.apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ months: this.chosen })
        })
        if (!res.ok) { throw new Error('save failed') }
        await this.load()
      } catch (e) {
        this.saveError = this.$t('registerRetention.saveFailed')
      } finally {
        this.saving = false
      }
    },

    /**
     * Drop this tier's own period so the level above applies again — and keeps applying
     * as that level changes it.
     * @returns {Promise<void>}
     */
    async reset () {
      this.saving = true
      this.saveError = null
      try {
        const res = await fetchWithTimeout('/api/firm-manager/register-retention', {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this.apiToken }
        })
        if (!res.ok) { throw new Error('reset failed') }
        await this.load()
      } catch (e) {
        this.saveError = this.$t('registerRetention.resetFailed')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.register-retention .box {
  background: #fafafa;
}
</style>

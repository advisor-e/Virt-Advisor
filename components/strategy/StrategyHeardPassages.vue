<template lang="pug">
.shp(v-if="heard")
  //- While this card records, the open box says it will receive the words (screen 3).
  p.shp-claim(v-if="heard.isLiveBox(conceptId, fieldKey)") ● {{ $t('strategyPlanner.heard.goesHere') }}

  .shp-panel(v-for="p in passages" :key="p.n + ':' + p.id")
    p.shp-lbl {{ heardLabel(p) }}
    p.shp-raw
      template(v-for="(h, i) in p.heard")
        br(v-if="i" :key="'b' + i")
        i(:key="'w' + i") {{ $t('strategyPlanner.heard.speaker.' + h.role) }}
        span(:key="'t' + i")  "{{ h.text }}"
    p.shp-lbl {{ $t('strategyPlanner.heard.suggested') }}
    b-input.shp-edit(v-if="editing === key(p)" v-model="draft" type="textarea" size="is-small" :rows="2")
    p.shp-tidy(v-else) {{ p.suggestion || '' }}
    .buttons.are-small.shp-acts
      //- Nothing enters the box until Keep (Decision 11); a kept passage goes below what is
      //- typed (Decision F). With no suggestion there is nothing to keep until it is edited.
      b-button(type="is-primary" :loading="busy === key(p)" :disabled="!canKeep(p)" @click="keep(p)") {{ $t('strategyPlanner.heard.keep') }}
      b-button(outlined @click="toggleEdit(p)") {{ $t('strategyPlanner.heard.edit') }}
      b-button(outlined :loading="busy === key(p) && acting === 'reject'" @click="act(p, 'reject')") {{ $t('strategyPlanner.heard.reject') }}
      b-button(outlined @click="moving = moving === key(p) ? '' : key(p)") {{ $t('strategyPlanner.heard.move') }}
    //- The card's other boxes, by their own headings: choosing one moves the passage there.
    .buttons.are-small.shp-boxes(v-if="moving === key(p)")
      b-button(
        v-for="b in otherBoxes"
        :key="b.key"
        size="is-small"
        type="is-light"
        @click="act(p, 'move', { fieldKey: b.key })"
      ) {{ b.label }}
    p.shp-err(v-if="error === key(p)") {{ $t('strategyPlanner.errors.saveFailed') }}

  p.shp-quiet(v-if="heard.quietBox(conceptId, fieldKey)") {{ $t('strategyPlanner.heard.nothingSaid') }}
</template>

<script>
import { formatDate as fmtDate } from '~/utils/dateLocale'

/**
 * StrategyHeardPassages — what was said while one capture box was open, under that box.
 *
 * Item 8.4, screen 4 of `design/mockups/strategy-session-recording.html` (approved for build
 * 2026-09-28; Decisions D and F and its five wordings ruled 2026-10-01). Each passage shows
 * what was actually said, who said it, and the suggested wording; the advisor keeps, edits,
 * rejects or moves it. The server placed it here by the clock (Decision 11), never a model.
 *
 * IT READS THE PAGE THROUGH `inject`, NOT PROPS. The boxes sit three components deep —
 * card, concept capture, org chart or grid — and threading the recording's words and a
 * decision handler through every layer would put the same two props on five components.
 * Absent a provider (the Objectives card, a test) it renders nothing.
 *
 * Vue 2 Options API, Pug, Buefy. No DOM access.
 */
export default {
  name: 'StrategyHeardPassages',

  inject: {
    /** The planner page's recording words: see `heardApi` in pages/strategy-planner.vue. */
    heard: { default: null }
  },

  props: {
    /** The concept the box belongs to — the id the session keys every box on. */
    conceptId: { type: String, required: true },
    /** The box's own key within that concept. */
    fieldKey: { type: String, required: true }
  },

  data () {
    return {
      /** `<n>:<id>` of the passage being edited, moved, or saved; empty when none. */
      editing: '',
      moving: '',
      busy: '',
      acting: '',
      error: '',
      draft: ''
    }
  },

  computed: {
    /** @returns {Array<object>} the passages waiting under this box */
    passages () {
      return this.heard ? this.heard.passagesFor(this.conceptId, this.fieldKey) : []
    },

    /** @returns {Array<{key: string, label: string}>} this card's other boxes */
    otherBoxes () {
      return this.heard ? this.heard.boxOptions(this.conceptId).filter(b => b.key !== this.fieldKey) : []
    }
  },

  methods: {
    key (p) { return p.n + ':' + p.id },

    /** A wall-clock time as the concept summary prints one. */
    clock (iso) {
      return fmtDate(iso, this.$i18n.locale, { hour: '2-digit', minute: '2-digit', hour12: false })
    },

    /** "Heard, 2:21 pm–2:23 pm", or the time once when both fall in the same minute (Mike, 2026-10-01). */
    heardLabel (p) {
      const from = this.clock(p.startAt)
      const to = this.clock(p.endAt)
      return from === to
        ? this.$t('strategyPlanner.heard.heardAt', { time: from })
        : this.$t('strategyPlanner.heard.heard', { from, to })
    },

    canKeep (p) {
      return this.editing === this.key(p) ? Boolean(this.draft.trim()) : Boolean(p.suggestion)
    },

    toggleEdit (p) {
      if (this.editing === this.key(p)) { this.editing = ''; return }
      this.editing = this.key(p)
      this.draft = p.suggestion || ''
    },

    keep (p) {
      return this.act(p, 'keep', this.editing === this.key(p) ? { text: this.draft } : {})
    },

    /**
     * One decision, sent through the page, which owns the session and the box's value.
     * @param {object} p - the passage
     * @param {string} action - keep · reject · move
     * @param {object} [extra] - `{ text }` for an edited keep, `{ fieldKey }` for a move
     */
    async act (p, action, extra) {
      const k = this.key(p)
      this.busy = k
      this.acting = action
      this.error = ''
      try {
        await this.heard.decide(p, action, extra || {})
        this.editing = ''
        this.moving = ''
      } catch (e) {
        this.error = k
      } finally {
        this.busy = ''
        this.acting = ''
      }
    }
  }
}
</script>

<style scoped>
.shp-claim { margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #c0392b; }
.shp-panel { margin: 8px 0 0; padding: 10px 12px; border: 1px solid #d5e1ee; border-left: 3px solid #0070c0; border-radius: 6px; background: #f7fafd; }
.shp-lbl { margin: 0 0 3px; font-size: 11px; font-weight: 700; color: #5b6b7c; text-transform: uppercase; letter-spacing: 0.03em; }
.shp-raw { margin: 0 0 8px; font-size: 13px; color: #33475b; }
.shp-tidy { margin: 0 0 8px; font-size: 14px; }
.shp-edit { margin: 0 0 8px; }
.shp-acts, .shp-boxes { margin: 0; }
.shp-err { margin: 4px 0 0; font-size: 12px; color: #c0392b; }
.shp-quiet { margin: 6px 0 0; font-size: 12px; color: #7a8a9a; }
</style>

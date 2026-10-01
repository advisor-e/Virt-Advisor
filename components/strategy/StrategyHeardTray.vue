<template lang="pug">
.sht(v-if="heard && passages.length")
  h5.sht-h {{ $t('strategyPlanner.heard.trayHeading', { count: passages.length }) }}
  .sht-row(v-for="p in passages" :key="p.n + ':' + p.id")
    p.sht-said
      b {{ clock(p.startAt) }}
      //- One line per speaker, as under a box — run together they read as one garbled quote.
      template(v-for="(h, i) in p.heard")
        br(:key="'b' + i")
        i(:key="'w' + i") {{ $t('strategyPlanner.heard.speaker.' + h.role) }}
        span(:key="'t' + i")  "{{ h.text }}"
    .buttons.are-small
      b-button(v-if="boxes.length" outlined @click="moving = moving === key(p) ? '' : key(p)") {{ $t('strategyPlanner.heard.moveToBox') }}
      b-button(outlined :loading="busy === key(p)" @click="act(p, 'transcript-only')") {{ $t('strategyPlanner.heard.transcriptOnly') }}
    .buttons.are-small(v-if="moving === key(p)")
      b-button(
        v-for="b in boxes"
        :key="b.key"
        size="is-small"
        type="is-light"
        @click="act(p, 'move', { fieldKey: b.key })"
      ) {{ b.label }}
    p.sht-err(v-if="error === key(p)") {{ $t('strategyPlanner.errors.saveFailed') }}
</template>

<script>
/**
 * StrategyHeardTray — what was said while none of this card's boxes was open, at the card's foot.
 *
 * Item 8.4, screen 4. A passage spoken over the teaching slide, or as a side remark, is never
 * guessed into a box (the drawing's caption): it waits here, and nothing is lost if it stays.
 * "Move to a box" sends it under one of this card's boxes, where it can be kept like any other.
 *
 * Reads the page through `inject`, as `StrategyHeardPassages` does, and renders nothing without it.
 *
 * Vue 2 Options API, Pug, Buefy. No DOM access.
 */
export default {
  name: 'StrategyHeardTray',

  inject: {
    heard: { default: null }
  },

  props: {
    /** The concept this card records. */
    conceptId: { type: String, required: true }
  },

  data () {
    return { moving: '', busy: '', error: '' }
  },

  computed: {
    passages () {
      return this.heard ? this.heard.trayFor(this.conceptId) : []
    },

    boxes () {
      return this.heard ? this.heard.boxOptions(this.conceptId) : []
    }
  },

  methods: {
    key (p) { return p.n + ':' + p.id },

    clock (iso) {
      const at = new Date(iso)
      return isNaN(at.getTime()) ? '' : at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    },

    /**
     * @param {object} p - the passage
     * @param {string} action - move · transcript-only
     * @param {object} [extra] - `{ fieldKey }` for a move
     */
    async act (p, action, extra) {
      const k = this.key(p)
      this.busy = k
      this.error = ''
      try {
        await this.heard.decide(p, action, extra || {})
        this.moving = ''
      } catch (e) {
        this.error = k
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.sht { margin: 10px 0 0; padding: 10px 12px; border: 1px dashed #b8c7d6; border-radius: 6px; background: #fbfcfe; }
.sht-h { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #33475b; }
.sht-row { margin: 0 0 8px; }
.sht-said { margin: 0 0 4px; font-size: 13px; color: #33475b; }
.sht-err { margin: 4px 0 0; font-size: 12px; color: #c0392b; }
</style>

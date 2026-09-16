<template lang="pug">
.box.hrc
  .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-3
    h4.title.is-6.mb-0 {{ $t('hubReading.heading') }}
    b-button(size="is-small" outlined type="is-primary" :loading="loading" :disabled="loading" @click="$emit('read')")
      | {{ loading ? $t('hubReading.reading') : (reading ? $t('hubReading.readAgain') : $t('hubReading.read')) }}

  b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

  p.is-size-7.has-text-grey(v-if="loading && !reading") {{ $t('hubReading.wait') }}

  p.is-size-7.has-text-grey(v-else-if="!reading") {{ $t('hubReading.none') }}

  template(v-else)
    b-message(v-if="stale" type="is-warning" size="is-small")
      b {{ $t('hubReading.staleHead') }}
      |  {{ staleBody }}
    .hrc-reading(:class="{ 'is-stale': stale }")
      p
        b {{ $t('hubReading.standsOut') }}
        |  {{ reading.standsOut }}
      p
        b {{ $t('hubReading.doFirst') }}
        |  {{ reading.doFirst }}
      p
        b {{ $t('hubReading.notYet') }}
        |  {{ reading.notYet }}
      .hrc-when {{ whenLine }}
      .hrc-caveat {{ caveat }}
</template>

<script>
/**
 * HubReadingCard — "What this is telling you": the model's reading of the numbers on a
 * hub page, made on the button and kept with the counts it was read from.
 *
 * Asked for by Mike 2026-09-11: *"I'm not seeing any AI interpretation of what's in front
 * of me. Is that possible we could create that?"* Drawing: `design/mockups/hub-page-guidance.html`.
 * Question 1 ruled: on the button, never on page open; stale when the pool has changed.
 *
 * ⚠ THIS CARD DECIDES NOTHING. It renders what the backend stored and emits `read`; the
 * page owns the call. The three headings are fixed by the drawing and checked by the
 * backend before anything is stored.
 */
export default {
  name: 'HubReadingCard',

  props: {
    /** `{ standsOut, doFirst, notYet, readAt, from }` from the backend, or null. */
    reading: { type: Object, default: null },
    /** The page has moved on since the reading was made — the backend's judgement. */
    stale: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    /** "from 5 firms, 31 reviews, 1 live adjustment" — the page words its own counts. */
    fromNow: { type: String, required: true },
    /** The same, for the counts the reading was made from. */
    fromThen: { type: String, default: '' },
    /** The page's own caveat line: what the reading can never do here. */
    caveat: { type: String, required: true }
  },

  computed: {
    /** @returns {string} */
    whenLine () {
      const when = this.reading && this.reading.readAt ? this.dateTimeWords(this.reading.readAt) : ''
      return this.$t('hubReading.when', { when, from: this.fromThen || this.fromNow })
    },

    /** @returns {string} */
    staleBody () {
      const when = this.reading && this.reading.readAt ? this.dateWords(this.reading.readAt) : ''
      return this.$t('hubReading.staleBody', { when, then: this.fromThen, now: this.fromNow })
    }
  },

  methods: {
    /** @param {string} iso @returns {string} */
    dateWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /** @param {string} iso @returns {string} */
    dateTimeWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return this.dateWords(iso) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.hrc-reading {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-size: 0.9rem;
}
.hrc-reading.is-stale { opacity: 0.55; }
.hrc-reading p { margin: 0 0 0.6rem; }
.hrc-when { font-size: 0.75rem; color: #5b6f8a; margin-top: 0.5rem; }
.hrc-caveat {
  font-size: 0.75rem;
  color: #5b6f8a;
  border-top: 1px solid #d5e1ee;
  padding-top: 0.5rem;
  margin-top: 0.6rem;
}
</style>

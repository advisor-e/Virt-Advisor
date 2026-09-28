<template lang="pug">
.sra(v-if="rows.length")
  .sra-agenda
    h5 {{ $t('strategyPlanner.timing.agenda') }}
    .sra-row(v-for="r in rows" :key="r.key" :class="{ 'is-past': r.past, 'is-live': r.live, 'is-break': r.kind === 'break' }")
      span.sra-name {{ r.name }}
      span.sra-when {{ r.span }}
    //- Decision G: the planned times above never move; how far behind the session is, and
    //- when it will now finish, is said here instead.
    p.sra-behind(v-if="behindMinutes > 0 && dayFinish !== null")
      | {{ $t('strategyPlanner.timing.behind', { minutes: behindMinutes, time: formatClock(dayFinish + behindMinutes) }) }}

  //- The countdown, small, in the corner of the screen (Mike, 2026-09-28). It counts the live
  //- concept's own minutes, never stops a recording and never moves the advisor on.
  .sra-count(v-if="countdown" :class="{ 'is-over': countdown.over }")
    .sra-big {{ countdown.figure }}
    .sra-what {{ countdown.what }}
</template>

<script>
/**
 * StrategyRunAgenda — Run session's timed agenda and the countdown in the corner.
 *
 * Item 8.4, slice 4 — screens 8 and 9 of `design/mockups/strategy-session-recording.html`,
 * approved for build 2026-09-28, every label approved. The arithmetic is Build session's own
 * (`utils/sessionTiming.js`), so the two screens can never disagree about a time.
 *
 * 🔴 DECISION G: AN OVERRUN IS SHOWN, NEVER ABSORBED. At zero the countdown turns red and counts
 * the overrun; the agenda says how far behind the session is and when it will now finish; the
 * planned times stay exactly as the advisor set them.
 *
 * ⚠ "TODAY'S" MEANS THE DAY OF THE LIVE CONCEPT (Mike's yes, 2026-09-28): a two-day workshop
 * shows that day's items, each day under its own start.
 *
 * ⚠ SSR: the one-second clock starts in `mounted()`.
 *
 * Vue 2 Options API, Pug.
 */
import { computeTiming, formatClock, isBreakKey } from '~/utils/sessionTiming'

export default {
  name: 'StrategyRunAgenda',

  props: {
    /** The session's steps, as Build session saves them. */
    steps: { type: Array, required: true },
    /** The placeable cards, for their names. */
    cards: { type: Array, required: true },
    /** The run sheet; null or no start time shows no agenda. */
    timing: { type: Object, default: null },
    /** The concept being recorded now: `{ key, label, startedAt }`, or null. */
    live: { type: Object, default: null }
  },

  data () {
    return { now: 0 }
  },

  computed: {
    cardByKey () {
      const map = {}
      this.cards.forEach((c) => { map[c.key] = c })
      return map
    },

    sheet () {
      return computeTiming({ steps: this.steps, timing: this.timing, isCard: key => Boolean(this.cardByKey[key]) })
    },

    /** Every card and break in the session's order, with its planned times. */
    ordered () {
      const out = []
      this.steps.forEach((step) => {
        ;(step.items || []).forEach((key) => {
          const row = this.sheet.rows[key]
          if (!row || row.kind === 'day') { return }
          out.push({ key, row })
        })
      })
      return out
    },

    /** The day being run: the live concept's, else the first. */
    today () {
      const liveRow = this.live && this.sheet.rows[this.live.key]
      return liveRow ? liveRow.day : 1
    },

    rows () {
      if (!this.timing || this.sheet.rows === undefined) { return [] }
      const liveIndex = this.live ? this.ordered.findIndex(o => o.key === this.live.key) : -1
      return this.ordered
        .map((o, i) => ({ o, i }))
        .filter(x => x.o.row.day === this.today && x.o.row.start !== null)
        .map(({ o, i }) => ({
          key: o.key,
          kind: o.row.kind,
          name: isBreakKey(o.key) ? this.$t('strategyPlanner.timing.break') : this.cardByKey[o.key].name,
          span: formatClock(o.row.start) + '–' + formatClock(o.row.end),
          past: liveIndex > -1 && i < liveIndex,
          live: i === liveIndex
        }))
    },

    /** When today was planned to finish. */
    dayFinish () {
      const ends = this.ordered.filter(o => o.row.day === this.today && o.row.end !== null).map(o => o.row.end)
      return ends.length ? Math.max.apply(null, ends) : null
    },

    /** Seconds the live concept has left: negative once it has run over. */
    remaining () {
      if (!this.live || !this.now) { return null }
      const row = this.sheet.rows[this.live.key]
      if (!row || !row.minutes) { return null }
      return row.minutes * 60 - Math.floor((this.now - this.live.startedAt) / 1000)
    },

    countdown () {
      if (this.remaining === null) { return null }
      const over = this.remaining < 0
      const secs = Math.abs(this.remaining)
      const figure = (over ? '+' : '') + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')
      const name = this.live.label
      return {
        over,
        figure,
        what: over
          ? this.$t('strategyPlanner.timing.over', { name })
          : this.$t('strategyPlanner.timing.left', { name })
      }
    },

    /** Whole minutes the live concept has run over. */
    behindMinutes () {
      return this.remaining !== null && this.remaining < 0 ? Math.ceil(-this.remaining / 60) : 0
    }
  },

  mounted () {
    this.now = Date.now()
    this._tick = setInterval(() => { this.now = Date.now() }, 1000)
  },

  beforeDestroy () {
    if (this._tick) { clearInterval(this._tick) }
  },

  methods: {
    formatClock
  }
}
</script>

<style scoped>
.sra-agenda { border: 1px solid #d5e1ee; border-radius: 9px; overflow: hidden; background: #fff; }
.sra-agenda h5 { margin: 0; padding: 0.5rem 0.75rem; background: #f1f6fb; color: #002b64; font-size: 0.85rem; font-weight: 700; }
.sra-row { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.45rem 0.75rem; border-top: 1px solid #d5e1ee; font-size: 0.82rem; }
.sra-when { color: #6b7f99; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sra-row.is-past { color: #6b7f99; }
.sra-row.is-past .sra-when { text-decoration: line-through; }
.sra-row.is-live { box-shadow: inset 4px 0 0 #d32f2f; font-weight: 700; }
.sra-row.is-break { background: repeating-linear-gradient(135deg, #f1f6fb 0 8px, #fff 8px 16px); color: #6b7f99; }
.sra-behind { padding: 0.45rem 0.75rem; border-top: 1px solid #d5e1ee; background: #fdeeee; color: #c0392b; font-weight: 700; font-size: 0.8rem; }
/* The corner of the screen, as asked — small, and never over the cards' own buttons. */
.sra-count {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 30;
  background: #fff;
  border: 2px solid #0070c0;
  border-radius: 10px;
  padding: 0.35rem 0.75rem;
  text-align: center;
  box-shadow: 0 1px 2px #002b6412, 0 8px 24px -12px #002b6426;
}
.sra-big { font-size: 1.35rem; font-weight: 800; color: #0070c0; font-variant-numeric: tabular-nums; line-height: 1.1; }
.sra-what { font-size: 0.7rem; color: #6b7f99; }
.sra-count.is-over { border-color: #c0392b; }
.sra-count.is-over .sra-big { color: #c0392b; }
</style>

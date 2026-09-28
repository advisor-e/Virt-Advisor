<template lang="pug">
.ssb
  .ssb-chrome
    b.ssb-title {{ $t('strategyPlanner.steps.heading') }}
    span.ssb-who(v-if="sessionLabel") {{ sessionLabel }}
    span.ssb-count {{ $t('strategyPlanner.steps.placedOf', { placed: placedCount, total: cards.length }) }}

  .ssb-bar
    span.ssb-hint {{ $t('strategyPlanner.steps.hint') }}
    //- Item 8.4, slice 3: the one time the advisor types. Every other time is worked out.
    span.ssb-starts(v-if="timing")
      span.ssb-starts-label {{ $t('strategyPlanner.timing.sessionStarts') }}
      b-input(
        type="time"
        size="is-small"
        :value="timing.startsAt || ''"
        :aria-label="$t('strategyPlanner.timing.sessionStarts')"
        @input="setStart"
      )

  .ssb-body
    //- LEFT — what has not been placed yet. Decision 2: the screen opens with
    //- everything here, so naming and placing is the thing the advisor does.
    aside.ssb-tray
      p.ssb-panelhead {{ $t('strategyPlanner.steps.trayHeading') }}
      p.ssb-panelsub {{ $t('strategyPlanner.steps.trayCaption', { count: unplaced.length }) }}

      p.ssb-trayempty(v-if="!unplaced.length") {{ $t('strategyPlanner.steps.allPlaced') }}

      //- 🔴 GROUPED BY DECK, WITH A COUNT ON EACH — the approved drawing's own fix, and
      //- one of the four things it names: "the left column reads as structure instead of
      //- forty identical boxes". A flat list is what Mike rejected on sight.
      template(v-for="group in trayGroups")
        p.ssb-deckgroup(:key="'g' + group.key") {{ group.label }}

        .ssb-chip(
          v-for="card in group.cards"
          :key="card.key"
          :draggable="true"
          @dragstart="onDragStart(card.key, $event)"
          @dragend="onDragEnd"
        )
          //- ⚠ THE PICKER SITS BELOW THE NAME, NOT BESIDE IT. Side by side, a select wide
          //- enough to read a step name left the name a column a few characters wide, and
          //- Mike's own titles — "Assess current position by reviewing (pre-meeting) data
          //- (section 2) & Financial Performance Reports" — broke one word per line. Found
          //- by opening the screen on 2026-09-20; no assertion would have caught it.
          .ssb-chip-main
            span.ssb-chip-name {{ card.name }}
            span.ssb-chip-tag(v-if="card.tag") {{ card.tag }}
            span.ssb-chip-deck(v-if="card.deck") {{ card.deck }}
          b-select.ssb-move(
            :value="''"
            size="is-small"
            expanded
            :disabled="!steps.length"
            :aria-label="$t('strategyPlanner.steps.moveTo')"
            @input="place(card.key, $event)"
          )
            option(value="") {{ $t('strategyPlanner.steps.moveTo') }}
            option(v-for="(step, i) in steps" :key="step.key" :value="step.key") {{ stepLabel(step, i) }}

    //- RIGHT — the steps themselves. A step holding nothing is kept and says so:
    //- Mike's ruling of 2026-09-20, and Pivot's step 5 is exactly that.
    section.ssb-board
      p.ssb-panelhead {{ $t('strategyPlanner.steps.boardHeading') }}
      p.ssb-panelsub {{ $t('strategyPlanner.steps.boardCaption') }}

      .ssb-step(
        v-for="(step, i) in steps"
        :key="step.key"
        @dragover.prevent="onDragOver(step.key)"
        @dragleave="onDragLeave(step.key)"
        @drop.prevent="onDrop(step.key)"
        :class="{ 'is-over': overStep === step.key }"
      )
        .ssb-step-head
          span.ssb-step-n {{ i + 1 }}
          b-input.ssb-step-name(
            :value="step.name"
            size="is-small"
            :placeholder="$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 })"
            :aria-label="$t('strategyPlanner.steps.nameLabel', { n: i + 1 })"
            @input="rename(step.key, $event)"
          )
          //- 🔴 THE MENTOR'S NOTE, TO THE ADVISOR ONLY — item 15.27, from the approved
          //- drawing design/mockups/strategy-session-process.html: "Written by the mentor.
          //- The advisor sees it as a tooltip; the client never does." The same mark and
          //- tooltip as GlossaryTerm, so it reads as help rather than as something to do.
          //- Nothing is drawn for a step without one, which today is every step.
          b-tooltip.ssb-purpose(
            v-if="!showPurpose && step.purpose"
            :label="step.purpose"
            multilined
            position="is-bottom"
            type="is-dark"
            animated
          )
            button.ssb-purpose-mark(
              type="button"
              :aria-label="$t('strategyPlanner.steps.purposeLabel', { n: i + 1 }) + ': ' + step.purpose"
              @click.prevent
            ) ?
          //- The count the approved drawing puts on every step head, so a step's weight
          //- reads at a glance rather than by counting chips.
          span.ssb-step-count {{ $tc('strategyPlanner.steps.stepCount', cardsIn(step).length, { count: cardsIn(step).length }) }}
          //- The subtotal of this step's concepts; a break runs its span but not its minutes.
          span.ssb-step-time(v-if="timing") {{ stepTotal(i) }}
          .ssb-step-tools
            b-button(
              size="is-small"
              type="is-text"
              :disabled="i === 0"
              :aria-label="$t('strategyPlanner.steps.moveUp')"
              @click="moveStep(i, -1)"
            ) ↑
            b-button(
              size="is-small"
              type="is-text"
              :disabled="i === steps.length - 1"
              :aria-label="$t('strategyPlanner.steps.moveDown')"
              @click="moveStep(i, 1)"
            ) ↓
            b-button(
              size="is-small"
              type="is-text"
              :aria-label="$t('strategyPlanner.steps.removeStep')"
              @click="removeStep(step.key)"
            ) ✕

        .ssb-step-body
          //- The manager's note on what this step is for. Advisor-facing, never on the
          //- client's agenda — and only editable on the authoring screen.
          b-input.ssb-step-purpose(
            v-if="showPurpose"
            :value="step.purpose || ''"
            size="is-small"
            type="textarea"
            rows="2"
            :placeholder="$t('strategyPlanner.steps.purposePlaceholder')"
            :aria-label="$t('strategyPlanner.steps.purposeLabel', { n: i + 1 })"
            @input="setPurpose(step.key, $event)"
          )

          //- 🔴 THE EMPTY STATE IS A FEATURE, NOT A PLACEHOLDER. It tells the advisor
          //- the step still reaches the client's agenda, so leaving it empty reads as
          //- a choice rather than as unfinished work.
          p.ssb-step-empty(v-if="!cardsIn(step).length") {{ $t('strategyPlanner.steps.stepEmpty') }}

          template(v-for="row in rowsIn(step)")
            .ssb-chip.is-placed(
              v-if="row.kind === 'card'"
              :key="row.key"
              :draggable="true"
              @dragstart="onDragStart(row.key, $event)"
              @dragend="onDragEnd"
            )
              .ssb-chip-main
                span.ssb-chip-name {{ row.card.name }}
                span.ssb-chip-tag(v-if="row.card.tag") {{ row.card.tag }}
                span.ssb-chip-deck(v-if="row.card.deck") {{ row.card.deck }}
              template(v-if="timing")
                b-input.ssb-mins(
                  type="number"
                  size="is-small"
                  min="0"
                  max="600"
                  :value="minutesFor(row.key)"
                  :aria-label="row.card.name + ' — ' + $t('strategyPlanner.timing.min')"
                  @input="setMinutes(row.key, $event)"
                )
                span.ssb-unit {{ $t('strategyPlanner.timing.min') }}
                span.ssb-when {{ spanFor(row.key) }}
              b-button(
                size="is-small"
                type="is-text"
                :aria-label="$t('strategyPlanner.steps.takeOut')"
                @click="takeOut(row.key)"
              ) ✕

            //- A break: its minutes run the clock and join no step's subtotal (Mike, 2026-09-28).
            .ssb-chip.is-placed.is-break(v-else-if="row.kind === 'break'" :key="row.key")
              .ssb-chip-main
                span.ssb-chip-name {{ $t('strategyPlanner.timing.break') }}
              b-input.ssb-mins(
                type="number"
                size="is-small"
                min="0"
                max="600"
                :value="minutesFor(row.key)"
                :aria-label="$t('strategyPlanner.timing.break') + ' — ' + $t('strategyPlanner.timing.min')"
                @input="setMinutes(row.key, $event)"
              )
              span.ssb-unit {{ $t('strategyPlanner.timing.min') }}
              span.ssb-when {{ spanFor(row.key) }}
              b-button(
                size="is-small"
                type="is-text"
                :aria-label="$t('strategyPlanner.steps.takeOut')"
                @click="takeOut(row.key)"
              ) ✕

            //- "Day 2 starts": that day's own start time restarts the clock (Decision H).
            .ssb-chip.is-placed.is-day(v-else :key="row.key")
              .ssb-chip-main
                span.ssb-chip-name {{ $t('strategyPlanner.timing.dayStarts', { n: dayOf(row.key) }) }}
              b-input(
                type="time"
                size="is-small"
                :value="timing.days[row.key] || ''"
                :aria-label="$t('strategyPlanner.timing.dayStarts', { n: dayOf(row.key) })"
                @input="setDay(row.key, $event)"
              )
              b-button(
                size="is-small"
                type="is-text"
                :aria-label="$t('strategyPlanner.steps.takeOut')"
                @click="takeOut(row.key)"
              ) ✕

            //- 🔴 AFTER EVERY ROW, NOT ONLY AT THE STEP'S FOOT. Mike ruled a break may sit
            //- between ANY two concepts, even mid-step; the drawing shows the link once per
            //- step, and a break added only at the foot could never reach the middle.
            .ssb-addrow(v-if="timing" :key="row.key + '+'")
              a.ssb-addbreak(href="#" @click.prevent="addRow(step.key, row.index, 'break')") {{ $t('strategyPlanner.timing.addBreak') }}
              //- Mike's wording, 2026-09-28: a new day's start row, placed like a break.
              a.ssb-addbreak(href="#" @click.prevent="addRow(step.key, row.index, 'day')") {{ $t('strategyPlanner.timing.addDay') }}

      p.ssb-total(v-if="timing && sheet.finishesAt !== null")
        | {{ $t('strategyPlanner.timing.finishes', { time: finishesLabel, concepts: sheet.conceptMinutes, breaks: sheet.breakMinutes }) }}

      b-button.ssb-add(type="is-primary" outlined icon-left="plus" @click="addStep") {{ $t('strategyPlanner.steps.addStep') }}
</template>

<script>
/**
 * StrategyStepBuilder — stage 2 of the session: the advisor names the steps and puts
 * each scoped card into one.
 *
 * 🔴 BUILT FROM THE APPROVED DRAWING, `design/mockups/strategy-step-builder.html`, whose
 * five decisions Mike ruled on 2026-09-20 — every one as recommended:
 *   1  its own stage, between Scope and Run
 *   2  opens with everything unplaced and one empty step to rename
 *   3  a session MAY run with cards left unplaced; the count is shown, never a locked button
 *   4  the closing block is an ordinary renameable step like any other
 *   5  step names are FREE TEXT with nothing offered — no list, no deck wording, no AI
 *
 * 🔴 A STEP HOLDING NOTHING IS A REAL STEP. His ruling, and the reason this screen exists
 * at all: Pivot's step 5 "Do It & Review It" has no slides behind it and still appears on
 * the agenda a client reads. Nothing here may prune an empty step.
 *
 * ⚠ HE PLACES CARDS, NOT PAGES. A concept carrying two teaching slides moves as one card.
 * The single exception is already in the data: a two-part fill-in table arrives as TWO
 * cards (Porter's observations, Porter's responses), each placed on its own.
 *
 * ⚠ CONTROLLED COMPONENT — it holds no copy of the steps. Every change emits the whole
 * new list and the page owns it, so the screen can never disagree with what is saved.
 *
 * ⚠ SSR: the drag handlers only ever run from a real browser event, and nothing here
 * touches `window` or `document` at load, in data() or in a computed.
 *
 * 🔴 THE RUN SHEET (item 8.4, slice 3) APPEARS ONLY WHEN `timing` IS PASSED. The advisor's
 * session passes it; the manager's standard-session screen does not, and stays as it was —
 * a firm's standard is a set of steps, not a timetable for a meeting nobody has booked.
 * Screen 7 of `design/mockups/strategy-session-recording.html`, approved 2026-09-28.
 *
 * Vue 2, Options API, Pug.
 */
import {
  computeTiming,
  formatClock,
  newRowKey,
  isBreakKey,
  isDayKey,
  BREAK_PREFIX,
  DAY_PREFIX
} from '~/utils/sessionTiming'

export default {
  name: 'StrategyStepBuilder',

  props: {
    /**
     * Every card that can be placed, in the order the session would otherwise run them.
     * `key` is the card's own id — `fw-<id>`, `<conceptId>#<part>`, `close-<id>`.
     * @type {Array<{key: string, name: string, deck: string, tag: string}>}
     */
    cards: {
      type: Array,
      required: true,
      validator: list => list.every(c => c && typeof c.key === 'string' && c.key.length > 0)
    },

    /**
     * The steps as they stand. `key` is a client-side handle so an input keeps focus
     * while its name is typed; only `name` and `items` are ever saved.
     * @type {Array<{key: string, name: string, items: string[]}>}
     */
    steps: {
      type: Array,
      required: true,
      validator: list => list.every(s => s && typeof s.name === 'string' && Array.isArray(s.items))
    },

    /** The chrome line: which client this session belongs to. */
    sessionLabel: { type: String, default: '' },

    /**
     * Show the "what this step is for" box on every step.
     *
     * 🔴 THE AUTHORING SCREEN ONLY. A manager writing the firm's standard session says
     * what each step is for; the advisor running one reads it, as the "?" tooltip beside
     * the step's name, and does not edit it (item 15.27). Same
     * component either way (Decision C's ladder is the only thing that differs), because
     * two step builders would drift the moment one gained a fix the other did not.
     */
    showPurpose: { type: Boolean, default: false },

    /**
     * The session's run sheet, or null for no timing at all (the manager's screen).
     * @type {{startsAt: (string|null), minutes: Object<string, number>, days: Object<string, string>}|null}
     */
    timing: {
      type: Object,
      default: null,
      validator: t => t === null || (typeof t === 'object' && typeof t.minutes === 'object' && typeof t.days === 'object')
    }
  },

  data () {
    return {
      /** The card key currently being dragged, or ''. Browser-only, set from an event. */
      dragging: '',
      /** The step key the pointer is over during a drag, for the drop highlight. */
      overStep: ''
    }
  },

  computed: {
    /** @returns {Object<string, boolean>} card keys that already sit in some step */
    placed () {
      const seen = {}
      this.steps.forEach((step) => {
        step.items.forEach((key) => { seen[key] = true })
      })
      return seen
    },

    /** @returns {Object<string, object>} every placeable card, by key */
    cardByKey () {
      const map = {}
      this.cards.forEach((c) => { map[c.key] = c })
      return map
    },

    /**
     * The run sheet worked out — every row's times, each step's subtotal and the totals.
     * @returns {object|null} null when this screen is not timing anything
     */
    sheet () {
      if (!this.timing) { return null }
      return computeTiming({ steps: this.steps, timing: this.timing, isCard: key => Boolean(this.cardByKey[key]) })
    },

    /** @returns {string} the finishing time as the footer prints it, e.g. "10:45 am" */
    finishesLabel () {
      return this.sheet ? formatClock(this.sheet.finishesAt, true) : ''
    },

    /** @returns {number} how many of the scoped cards have been placed */
    placedCount () {
      return this.cards.filter(c => this.placed[c.key]).length
    },

    /**
     * What is still waiting, in the session's own order.
     * @returns {Array<object>}
     */
    unplaced () {
      return this.cards.filter(c => !this.placed[c.key])
    },

    /**
     * The waiting list grouped by the deck each concept came from, with a count on each.
     *
     * 🔴 THE APPROVED DRAWING'S OWN FIX, and one of the four things it names: "the tray is
     * grouped by deck with a count on each, so the left column reads as structure instead
     * of forty identical boxes." A flat column of identical chips is what Mike rejected on
     * sight — this is the half of that rejection a layout change answers.
     *
     * ⚠ FIRST-SEEN ORDER, NOT ALPHABETICAL. `cards` arrives in the order the session would
     * otherwise run, which is Mike's authored order; sorting the groups would replace his
     * order with one nobody chose.
     *
     * ⚠ A CARD WITH NO DECK STILL APPEARS. It is grouped under an empty heading rather
     * than dropped — losing a concept from the tray is worse than a heading with no words.
     *
     * @returns {Array<{key: string, label: string, cards: object[]}>}
     */
    trayGroups () {
      const order = []
      const byDeck = {}

      this.unplaced.forEach((card) => {
        const deck = card.deck || ''
        if (!byDeck[deck]) {
          byDeck[deck] = { key: 'd' + order.length, deck, cards: [] }
          order.push(byDeck[deck])
        }
        byDeck[deck].cards.push(card)
      })

      return order.map(g => ({
        key: g.key,
        label: g.deck
          ? this.$t('strategyPlanner.steps.deckGroup', { deck: g.deck, count: g.cards.length })
          : this.$t('strategyPlanner.steps.deckGroupNone', { count: g.cards.length }),
        cards: g.cards
      }))
    }
  },

  methods: {
    /**
     * The cards of one step, in the order the advisor put them there.
     *
     * ⚠ A KEY NAMING A CARD THAT IS NO LONGER SCOPED IS SKIPPED, NEVER RENDERED BLANK.
     * An advisor can go back to screen 1 and untick something already placed; the step
     * keeps the key until the next save, and a blank row would read as a bug.
     *
     * @param {{items: string[]}} step
     * @returns {Array<object>}
     */
    cardsIn (step) {
      return step.items
        .map(key => this.cards.find(c => c.key === key))
        .filter(Boolean)
    },

    /**
     * A step's rows in order: its cards and, when timing, its break and day rows.
     * `index` is the row's position in `step.items`, so a break can be put right after it.
     * @param {{items: string[]}} step
     * @returns {Array<{key: string, kind: string, index: number, card?: object}>}
     */
    rowsIn (step) {
      const rows = []
      step.items.forEach((key, index) => {
        if (this.cardByKey[key]) {
          rows.push({ key, kind: 'card', index, card: this.cardByKey[key] })
        } else if (this.timing && isBreakKey(key)) {
          rows.push({ key, kind: 'break', index })
        } else if (this.timing && isDayKey(key)) {
          rows.push({ key, kind: 'day', index })
        }
      })
      return rows
    },

    /** @param {string} key @returns {number|string} the row's minutes, or '' when none */
    minutesFor (key) {
      const n = this.timing && this.timing.minutes[key]
      return Number.isInteger(n) ? n : ''
    },

    /** @param {string} key @returns {string} the row's times, e.g. "9:20–9:50" */
    spanFor (key) {
      const row = this.sheet && this.sheet.rows[key]
      if (!row || row.start === null) { return '' }
      return formatClock(row.start) + '–' + formatClock(row.end)
    },

    /** @param {string} key @returns {number} which day a day row begins */
    dayOf (key) {
      const row = this.sheet && this.sheet.rows[key]
      return row ? row.day : 2
    },

    /**
     * A step's subtotal and span, e.g. "70 min · 9:20–10:45".
     * @param {number} i
     * @returns {string}
     */
    stepTotal (i) {
      const s = this.sheet && this.sheet.steps[i]
      if (!s) { return '' }
      const total = this.$t('strategyPlanner.timing.minutes', { minutes: s.minutes })
      return s.start === null ? total : total + ' · ' + formatClock(s.start) + '–' + formatClock(s.end)
    },

    /**
     * Emits the whole new run sheet. The page owns it and saves it with the scope.
     * @param {function(object): void} change - edits a copy
     * @returns {void}
     */
    commitTiming (change) {
      const next = {
        startsAt: this.timing.startsAt || null,
        minutes: Object.assign({}, this.timing.minutes),
        days: Object.assign({}, this.timing.days)
      }
      change(next)
      /** The complete run sheet `{startsAt, minutes, days}`, every time. */
      this.$emit('timing-changed', next)
    },

    /** @param {string} value - `HH:MM` from the time box, or '' when cleared @returns {void} */
    setStart (value) {
      this.commitTiming((t) => { t.startsAt = value || null })
    },

    /**
     * @param {string} key
     * @param {string|number} value - what the number box holds
     * @returns {void}
     */
    setMinutes (key, value) {
      const n = parseInt(value, 10)
      this.commitTiming((t) => {
        if (Number.isInteger(n) && n >= 0 && n <= 600) { t.minutes[key] = n } else { delete t.minutes[key] }
      })
    },

    /** @param {string} key @param {string} value `HH:MM` or '' @returns {void} */
    setDay (key, value) {
      this.commitTiming((t) => {
        if (value) { t.days[key] = value } else { delete t.days[key] }
      })
    },

    /**
     * Put a break, or a new day's start, right after one row of a step.
     * @param {string} stepKey
     * @param {number} afterIndex - position in the step's items
     * @param {'break'|'day'} kind
     * @returns {void}
     */
    addRow (stepKey, afterIndex, kind) {
      const next = this.clone()
      const target = next.find(s => s.key === stepKey)
      if (!target) { return }
      target.items.splice(afterIndex + 1, 0, newRowKey(kind === 'day' ? DAY_PREFIX : BREAK_PREFIX))
      this.commit(next)
    },

    /** @param {{name: string}} step @param {number} i @returns {string} */
    stepLabel (step, i) {
      return step.name || this.$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 })
    },

    /**
     * Emits the whole new list. The only way this component changes anything.
     * @param {Array<object>} next
     * @returns {void}
     */
    commit (next) {
      /** The complete step list, every time — the page owns it and saves it. */
      this.$emit('steps-changed', next)
    },

    /**
     * A deep-enough copy to mutate before committing.
     *
     * ⚠ `purpose` IS CARRIED THROUGH EVEN WHERE THIS SCREEN NEVER SHOWS IT. It is the
     * mentor's note on what a step is for, and the advisor's screen does not edit it — but
     * this component emits the WHOLE list on every change, so dropping the field here
     * would silently erase a manager's writing the first time an advisor moved a card.
     *
     * @returns {Array<object>}
     */
    clone () {
      return this.steps.map(s => ({
        key: s.key,
        name: s.name,
        purpose: s.purpose || '',
        items: s.items.slice()
      }))
    },

    /**
     * What this step is for — the manager's note. Only the authoring screen edits it
     * (`show-purpose`); the advisor reads it as a tooltip and the client never sees it.
     * @param {string} stepKey
     * @param {string} purpose
     * @returns {void}
     */
    setPurpose (stepKey, purpose) {
      const next = this.clone()
      const target = next.find(s => s.key === stepKey)
      if (!target) { return }
      target.purpose = purpose
      this.commit(next)
    },

    /**
     * Puts a card into a step, taking it out of whichever step held it before — a card
     * belongs to exactly one step, so a move is never a duplicate.
     * @param {string} cardKey
     * @param {string} stepKey
     * @returns {void}
     */
    place (cardKey, stepKey) {
      if (!stepKey) { return }
      const next = this.clone()
      next.forEach((s) => { s.items = s.items.filter(k => k !== cardKey) })
      const target = next.find(s => s.key === stepKey)
      if (!target) { return }
      target.items.push(cardKey)
      this.commit(next)
    },

    /**
     * Back to the waiting list. Nothing typed into the card's table is touched — answers
     * are stored against the concept, never against the step.
     * @param {string} cardKey
     * @returns {void}
     */
    takeOut (cardKey) {
      const next = this.clone()
      next.forEach((s) => { s.items = s.items.filter(k => k !== cardKey) })
      this.commit(next)
    },

    /** @param {string} stepKey @param {string} name @returns {void} */
    rename (stepKey, name) {
      const next = this.clone()
      const target = next.find(s => s.key === stepKey)
      if (!target) { return }
      target.name = name
      this.commit(next)
    },

    /** @returns {void} */
    addStep () {
      const next = this.clone()
      next.push({ key: this.nextKey(next), name: '', items: [] })
      this.commit(next)
    },

    /**
     * Deleting a step returns its cards to the waiting list rather than losing them.
     * @param {string} stepKey
     * @returns {void}
     */
    removeStep (stepKey) {
      this.commit(this.clone().filter(s => s.key !== stepKey))
    },

    /** @param {number} i @param {number} by -1 up, 1 down @returns {void} */
    moveStep (i, by) {
      const to = i + by
      if (to < 0 || to >= this.steps.length) { return }
      const next = this.clone()
      const moved = next.splice(i, 1)[0]
      next.splice(to, 0, moved)
      this.commit(next)
    },

    /**
     * A handle that is unique within this list and stable while the screen is open.
     * It is never saved — storage keeps only `name` and `items`.
     * @param {Array<object>} list
     * @returns {string}
     */
    nextKey (list) {
      let n = list.length + 1
      const taken = {}
      list.forEach((s) => { taken[s.key] = true })
      while (taken['s' + n]) { n += 1 }
      return 's' + n
    },

    /** @param {string} cardKey @param {DragEvent} ev @returns {void} */
    onDragStart (cardKey, ev) {
      this.dragging = cardKey
      // Firefox will not start a drag unless something is set on the transfer.
      if (ev && ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move'
        try { ev.dataTransfer.setData('text/plain', cardKey) } catch (err) { /* IE-era guard */ }
      }
    },

    /** @returns {void} */
    onDragEnd () {
      this.dragging = ''
      this.overStep = ''
    },

    /** @param {string} stepKey @returns {void} */
    onDragOver (stepKey) {
      if (this.dragging) { this.overStep = stepKey }
    },

    /** @param {string} stepKey @returns {void} */
    onDragLeave (stepKey) {
      if (this.overStep === stepKey) { this.overStep = '' }
    },

    /** @param {string} stepKey @returns {void} */
    onDrop (stepKey) {
      const cardKey = this.dragging
      this.onDragEnd()
      if (cardKey) { this.place(cardKey, stepKey) }
    }
  }
}
</script>

<style scoped>
.ssb-chrome {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 8px 8px 0 0;
}
.ssb-title { color: #002b64; font-size: 1.05rem; }
.ssb-who { color: #5b6f8a; font-size: 0.85rem; }
.ssb-count { margin-left: auto; color: #5b6f8a; font-size: 0.85rem; }

.ssb-bar {
  padding: 0.5rem 1rem;
  border: 1px solid #d5e1ee;
  border-top: 0;
  background: #fff;
}
.ssb-hint { color: #5b6f8a; font-size: 0.82rem; }
.ssb-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.ssb-starts { margin-left: auto; display: inline-flex; align-items: center; gap: 0.5rem; }
.ssb-starts-label { font-size: 0.85rem; color: #23405f; }
.ssb-step-time { color: #002b64; font-weight: 700; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.ssb-mins { width: 4.8rem; }
.ssb-unit { font-size: 0.78rem; color: #5b6f8a; }
.ssb-when { font-size: 0.78rem; color: #5b6f8a; font-variant-numeric: tabular-nums; min-width: 6.5rem; text-align: right; }
/* A break reads as time out of the session, not as a concept. */
.ssb-chip.is-break { background: repeating-linear-gradient(135deg, #f1f6fb 0 8px, #fff 8px 16px); }
.ssb-chip.is-day { border-style: dashed; }
.ssb-addrow { display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.1rem 0 0.35rem 0.25rem; }
.ssb-addbreak { font-size: 0.75rem; }
.ssb-total { font-weight: 700; color: #002b64; font-variant-numeric: tabular-nums; margin: 0.25rem 0 0.75rem; }

.ssb-body {
  display: grid;
  grid-template-columns: 19rem 1fr;
  border: 1px solid #d5e1ee;
  border-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
.ssb-tray {
  padding: 1rem;
  background: #fcfdff;
  border-right: 1px solid #d5e1ee;
}
.ssb-board { padding: 1rem; }

.ssb-panelhead {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #002b64;
}
.ssb-panelsub { font-size: 0.78rem; color: #5b6f8a; margin-bottom: 0.7rem; }

.ssb-trayempty {
  border: 1px dashed #d5e1ee;
  border-radius: 6px;
  padding: 0.85rem;
  text-align: center;
  color: #5b6f8a;
  font-size: 0.82rem;
  font-style: italic;
  background: #fff;
}

/* The waiting-list chip STACKS — a name then its picker — so a long title of Mike's
   gets the full column width. Laid out side by side it wrapped one word per line. */
.ssb-chip {
  border: 1px solid #d5e1ee;
  border-radius: 6px;
  background: #fff;
  padding: 0.4rem 0.5rem;
  margin-bottom: 0.45rem;
  cursor: grab;
}
/* A placed chip keeps its name and its ✕ on one row: there is no picker on it. */
.ssb-chip.is-placed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-left: 3px solid #0070c0;
}
.ssb-chip-main { flex: 1 1 auto; min-width: 0; }
.ssb-chip-name { color: #002b64; font-size: 0.86rem; }
.ssb-chip-tag {
  display: inline-block;
  margin-left: 0.4rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #fff;
  background: #0070c0;
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
}
.ssb-chip-deck { display: block; font-size: 0.7rem; color: #5b6f8a; }
.ssb-move { margin-top: 0.35rem; }

.ssb-step {
  border: 1px solid #d5e1ee;
  border-radius: 8px;
  margin-bottom: 0.7rem;
  background: #fff;
}
.ssb-step.is-over { border-color: #0070c0; box-shadow: 0 0 0 3px rgba(0, 112, 192, 0.15); }
.ssb-step-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid #d5e1ee;
  background: #f1f6fb;
  border-radius: 8px 8px 0 0;
}
.ssb-step-n {
  flex: 0 0 auto;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 50%;
  background: #0070c0;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ssb-step-name { flex: 1 1 auto; }
.ssb-step-count { flex: 0 0 auto; font-size: 0.72rem; color: #5b6f8a; white-space: nowrap; }

/* The mentor's note — GlossaryTerm's mark, so the advisor already knows it as help. */
.ssb-purpose { flex: 0 0 auto; }
.ssb-purpose-mark {
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  width: 15px;
  height: 15px;
  padding: 0;
  border-radius: 50%;
  cursor: help;
  color: #0070c0;
  background: #0070c018;
  border: 1px solid #0070c04d;
}
.ssb-purpose-mark:hover,
.ssb-purpose-mark:focus { color: #ffffff; background: #0070c0; }

/* The deck heading in the tray — the drawing's own treatment, so the left column reads
   as structure rather than as one long column of identical boxes. */
.ssb-deckgroup {
  font-size: 0.66rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 700;
  color: #0070c0;
  margin: 0.85rem 0 0.4rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid #d5e1ee;
}
.ssb-deckgroup:first-of-type { margin-top: 0; }
.ssb-step-tools { flex: 0 0 auto; display: flex; }
.ssb-step-body { padding: 0.55rem 0.6rem 0.6rem; }
.ssb-step-purpose { margin-bottom: 0.5rem; }

.ssb-step-empty {
  border: 1px dashed #d8c39a;
  background: #fffdf6;
  border-radius: 6px;
  padding: 0.55rem 0.6rem;
  font-size: 0.78rem;
  color: #8a6d2f;
}

.ssb-add { width: 100%; }

@media (max-width: 860px) {
  .ssb-body { grid-template-columns: 1fr; }
  .ssb-tray { border-right: 0; border-bottom: 1px solid #d5e1ee; }
}
</style>

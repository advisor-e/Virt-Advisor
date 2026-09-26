<template lang="pug">
.ssb
  .ssb-chrome
    b.ssb-title {{ $t('strategyPlanner.steps.heading') }}
    span.ssb-who(v-if="sessionLabel") {{ sessionLabel }}
    span.ssb-count {{ $t('strategyPlanner.steps.placedOf', { placed: placedCount, total: cards.length }) }}

  .ssb-bar
    span.ssb-hint {{ $t('strategyPlanner.steps.hint') }}

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
          //- The count the approved drawing puts on every step head, so a step's weight
          //- reads at a glance rather than by counting chips.
          span.ssb-step-count {{ $tc('strategyPlanner.steps.stepCount', cardsIn(step).length, { count: cardsIn(step).length }) }}
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

          .ssb-chip.is-placed(
            v-for="card in cardsIn(step)"
            :key="card.key"
            :draggable="true"
            @dragstart="onDragStart(card.key, $event)"
            @dragend="onDragEnd"
          )
            .ssb-chip-main
              span.ssb-chip-name {{ card.name }}
              span.ssb-chip-tag(v-if="card.tag") {{ card.tag }}
              span.ssb-chip-deck(v-if="card.deck") {{ card.deck }}
            b-button(
              size="is-small"
              type="is-text"
              :aria-label="$t('strategyPlanner.steps.takeOut')"
              @click="takeOut(card.key)"
            ) ✕

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
 * Vue 2, Options API, Pug.
 */
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
     * what each step is for; the advisor running one reads it and does not edit it. Same
     * component either way (Decision C's ladder is the only thing that differs), because
     * two step builders would drift the moment one gained a fix the other did not.
     */
    showPurpose: { type: Boolean, default: false }
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
     * (`show-purpose`). ⚠ The approved drawing shows it to the advisor as a tooltip, never
     * to the client; that tooltip is NOT BUILT and the session does not yet carry the
     * field — item 15.27.
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

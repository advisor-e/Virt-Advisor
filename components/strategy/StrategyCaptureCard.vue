<template lang="pug">
.scc
  .scc-head
    .scc-head-text
      p.scc-eyebrow {{ eyebrow }}
      h3.scc-title {{ framework.name }}
      p.scc-instruction(v-if="framework.captureInstruction") {{ framework.captureInstruction }}
      //- A way back to the concept that does not leave the step. The page's own
      //- Back button returns to the scope screen, which is not what an advisor
      //- mid-session wants when they only need the diagram again.
      p.scc-reteach(v-if="teachable && !showTeaching")
        a(href="#" @click.prevent="capturing = false") {{ $t('strategyPlanner.teaching.backToConcept') }}

  //- 🔴 THE CONCEPT GOES UP FIRST, AND THE BOXES WAIT BEHIND A BUTTON. Mike's
  //- instruction, 2026-09-17: *"i want the graphic up so the advisor can speak to
  //- it - then the responses are captured after the click of a button."* The reason
  //- is his — grasp the concept in theory before relating it to your own business.
  //- ⚠ THE DRAWING IS THE TEACHING SLIDE'S, resolved from the concept id. A
  //- concept without one shows his words alone (item 15.7).
  template(v-if="showTeaching")
    strategy-teaching-slide(
      :name="framework.name"
      :concept-id="framework.conceptId || framework.id"
      :shape="framework.shape"
      :subtitle="framework.captureInstruction"
      :concept-summary="framework.conceptSummary"
      :helps-client-to="framework.helpsClientTo"
      :fields="framework.fields"
    )
    .scc-advance
      b-button(type="is-primary" @click="capturing = true") {{ $t('strategyPlanner.teaching.captureNow') }}
      p.scc-advance-hint {{ $t('strategyPlanner.teaching.talkFirst') }}

  .scc-body(v-else :class="{ 'is-wide': !showsConcept }")
    //- The concept, so the advisor can teach the framework without leaving the screen.
    //- ⚠ NOT ON A TABLE. An Action Plan is filled in, not taught, and both closing
    //- frameworks point at the same material — so the panel appeared TWICE on screen 3,
    //- word for word. Found by looking at it; no test saw it.
    //- ⚠ NO HEADINGS. "What this does in the room" and "Who and when" were written
    //- by an AI session in the 2026-09-16 build and Mike had never seen either.
    //- Removed on his instruction, 2026-09-17. What is left is his own sentence.
    //- ⚠ HIS RESPONSE PAGE USED TO SIT BESIDE THE BOXES and no longer does. Several
    //- concepts are written up on a slide rather than in a workbook — the Vertical
    //- & Horizontal Integration Tasks table, (Our) Revenue Streams, (Our) Volatility
    //- Graph Observations — and those pages were shown as deck images until
    //- 2026-09-18. They carry the advisor-e.com logo, so they went with the rest.
    //- ⚠ AND THE 33 DRAWINGS DO NOT BRING IT BACK — every one of them is a
    //- TEACHING page. `responsePage` still records which page each table is
    //- (Strategic Orientation 2 pp. 24, 34, 37, 41); drawing them is item 15.11.
    aside.scc-concept(v-if="showsConcept && framework.conceptSummary")
      p.scc-concept-text(v-if="framework.conceptSummary") {{ framework.conceptSummary }}

    //- A TABLE SHAPE — the Action Plan. Same fields underneath, laid out in rows.
    .scc-capture.is-actions(v-if="framework.shape === 'actions'")
      .table-container
        table.table.is-fullwidth.scc-table
          thead
            tr
              th(v-for="col in columns" :key="col.key") {{ col.label }}
          tbody
            tr(v-for="row in rows" :key="row.index")
              td(v-for="field in row.fields" :key="field.key")
                //- A column with a fixed list is a select, never free text: the coverage
                //- check counts these, and a typo would silently lose an aspect.
                b-select(
                  v-if="field.options"
                  :value="valueOf(field.key)"
                  :placeholder="$t('strategyPlanner.card.choose')"
                  expanded
                  @focus.native="onFocus(field.key)"
                  @input="onSelect(field.key, $event)"
                )
                  option(v-for="opt in field.options" :key="opt" :value="opt") {{ opt }}
                //- 🔴 `@input.native` SAVES NOTHING. This card has always saved on blur —
                //- it was never part of the per-keystroke defect of 2026-09-22 — but the
                //- page still has to know there are words not yet written out, or the
                //- Saved stamp would show a green tick over a sentence being typed into
                //- it (Decision E). ⚠ Never turn this into a save.
                b-input(
                  v-else
                  :id="inputId(field.key)"
                  :value="valueOf(field.key)"
                  :placeholder="field.prompt || ''"
                  @focus="onFocus(field.key)"
                  @blur="onBlur(field.key, $event)"
                  @input.native="onTyping(field.key, $event.target.value)"
                )

    //- THE CAPTURE. One renderer, several shapes — Decision 3. The shape decides the
    //- LAYOUT and nothing else: every shape is the same list of boxes underneath, which
    //- is why another shape is a class name and a grid rule rather than a component.
    .scc-capture(v-else :class="'is-' + framework.shape")
      .scc-box(
        v-for="field in framework.fields"
        :key="field.key"
        :class="{ 'is-centre': field.centre, 'is-filled': !!valueOf(field.key) }"
      )
        label.scc-box-label(:for="inputId(field.key)") {{ field.label }}
        p.scc-box-prompt(v-if="field.prompt") {{ field.prompt }}
        b-input(
          :id="inputId(field.key)"
          type="textarea"
          :rows="rowsFor"
          :value="valueOf(field.key)"
          :placeholder="$t('strategyPlanner.card.placeholder')"
          @focus="onFocus(field.key)"
          @blur="onBlur(field.key, $event)"
          @input.native="onTyping(field.key, $event.target.value)"
        )
</template>

<script>
/**
 * StrategyCaptureCard — one framework, mid-session. The renderer Decision 3 turns on.
 *
 * Item 15.1. Design: `design/mockups/strategy-planner.html`, screen 2, drawn three times
 * on purpose. Mike ruled 2026-09-16 that **a framework is DATA naming its capture shape**,
 * so this one component draws all of them and there is no component per framework.
 *
 * 🔴 IF A FRAMEWORK WILL NOT FIT, ADD A SHAPE — NEVER A COMPONENT FOR THAT FRAMEWORK.
 * A shape is a class name here and a grid rule in the stylesheet below, plus an entry in
 * `STRATEGY_SHAPES` on the backend. That is the whole cost of the 46th framework, and it
 * is what stops this becoming forty-five screens.
 *
 * 🔴 `focus` AND `blur` ARE NOT UI POLISH — THEY ARE DECISION 11. The field open when
 * words are spoken claims them, so this component tells its parent which box the advisor
 * is in. Remove the focus handler and the only way left to apportion a recording is to ask
 * a model where each passage belongs, which that ruling forbids.
 *
 * Saving is on blur rather than on every keystroke: an advisor types into these boxes
 * while talking, and a request per character would put a client's half-formed sentence on
 * the wire dozens of times.
 */
import StrategyTeachingSlide from '~/components/strategy/StrategyTeachingSlide.vue'

export default {
  name: 'StrategyCaptureCard',

  components: { StrategyTeachingSlide },

  props: {
    /** A framework as `/api/strategy/frameworks` returns it, joined to its material. */
    framework: {
      type: Object,
      required: true,
      validator: f => !!f && typeof f.shape === 'string' && Array.isArray(f.fields)
    },
    /** What is captured so far, keyed by field key. */
    entries: { type: Object, default: () => ({}) },
    /** Position in the session, e.g. "Strategic Orientation · framework 1 of 4". */
    eyebrow: { type: String, default: '' },
    /** True when this framework is taught before it is captured. */
    teachable: { type: Boolean, default: false }
  },

  data () {
    return {
      /** Set once the advisor has taught the concept and pressed the button. */
      capturing: false
    }
  },

  computed: {
    /**
     * Whether the concept is on screen rather than the capture boxes.
     * @returns {boolean}
     */
    showTeaching () {
      return !this.capturing && this.teachable
    },

    /**
     * Taller boxes where a shape has few of them and the advisor writes at length.
     * @returns {number}
     */
    rowsFor () {
      return this.framework.shape === 'buckets' ? 2 : 4
    },

    /**
     * A table is filled in, not taught, so it carries no concept panel — and the table
     * takes the full width instead.
     * @returns {boolean}
     */
    showsConcept () {
      return this.framework.shape !== 'actions'
    },

    /**
     * A table shape's columns, taken from its first row's fields so the header and the
     * cells can never disagree about order.
     * @returns {object[]}
     */
    columns () {
      return this.framework.fields
        .filter(f => f.row === 1)
        .map(f => ({ key: f.column, label: f.label }))
    },

    /**
     * A table shape's fields, grouped into rows.
     * @returns {Array<{index: number, fields: object[]}>}
     */
    rows () {
      const byRow = []
      this.framework.fields.forEach((f) => {
        if (!f.row) { return }
        if (!byRow[f.row]) { byRow[f.row] = { index: f.row, fields: [] } }
        byRow[f.row].fields.push(f)
      })
      return byRow.filter(Boolean)
    }
  },

  methods: {
    /**
     * What a box currently holds.
     * @param {string} key
     * @returns {string}
     */
    valueOf (key) {
      const found = this.entries[key]
      return found === undefined || found === null ? '' : String(found)
    },

    /**
     * A stable id so the label points at its own textarea.
     * @param {string} key
     * @returns {string}
     */
    inputId (key) {
      return 'scc-' + this.framework.id + '-' + key
    },

    /**
     * The advisor moved into this box.
     * Payload: `{ frameworkId, fieldKey }` — the parent records it on the session's
     * navigation timeline, which is what a recording is apportioned against.
     * @param {string} key
     */
    onFocus (key) {
      this.$emit('field-opened', { frameworkId: this.framework.id, fieldKey: key })
    },

    /**
     * The advisor left this box. Emitted only when the text actually changed, so moving
     * through a card without typing does not write anything.
     * Payload: `{ frameworkId, fieldKey, value }`
     * @param {string} key
     * @param {Event} event
     */
    onBlur (key, event) {
      const value = event && event.target ? String(event.target.value) : ''
      if (value === this.valueOf(key)) { return }
      this.$emit('field-changed', {
        frameworkId: this.framework.id,
        fieldKey: key,
        value
      })
    },

    /**
     * The advisor is typing — a signal for the Saved stamp, never a write.
     *
     * 🔴 Decision E, Mike 2026-09-22: while there are words in the open box that have not
     * been written out, the screen says so rather than claiming everything is saved. The
     * page also starts its auto-save pause from this (Decision D).
     *
     * ⚠ NOTHING IS SENT HERE AND NOTHING MAY EVER BE. This card saves on blur, above.
     *
     * @param {string} key the box being typed into
     * @param {string} value its whole current text
     */
    onTyping (key, value) {
      // { frameworkId, fieldKey, value } — a signal, never a write.
      this.$emit('field-typing', {
        frameworkId: this.framework.id,
        fieldKey: key,
        value: value === null || value === undefined ? '' : String(value)
      })
    },

    /**
     * A select changes on choice rather than on blur — there is nothing to type, so
     * waiting for a blur would lose the choice if the advisor moved on with the keyboard.
     * @param {string} key
     * @param {string} value
     */
    onSelect (key, value) {
      const next = value === undefined || value === null ? '' : String(value)
      if (next === this.valueOf(key)) { return }
      this.$emit('field-changed', {
        frameworkId: this.framework.id,
        fieldKey: key,
        value: next
      })
    }
  }
}
</script>

<style scoped>
.scc-advance {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.scc-advance-hint {
  color: #5b6f8a;
  font-size: 13.5px;
}

.scc-reteach {
  margin-top: 4px;
  font-size: 13.5px;
}

.scc-reteach a {
  color: #0070c0;
}

.scc {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 43, 100, 0.07), 0 8px 24px -12px rgba(0, 43, 100, 0.15);
}
.scc-head {
  background: #f1f6fb;
  border-bottom: 1px solid #d5e1ee;
  padding: 0.9rem 1.1rem;
}
.scc-eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin: 0;
}
.scc-title { font-size: 1.2rem; font-weight: 700; margin: 0.1rem 0 0; color: #002b64; }
.scc-instruction { font-size: 0.8rem; color: #5b6f8a; margin: 0.2rem 0 0; max-width: 70ch; }

.scc-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.1rem;
  padding: 1.1rem;
  align-items: start;
}
.scc-body.is-wide { grid-template-columns: 1fr; }
.scc-concept {
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  background: #fff;
}
.scc-concept-head {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin: 0.7rem 0 0.3rem;
}
.scc-concept-head:first-child { margin-top: 0; }
.scc-concept-text { font-size: 0.8rem; margin: 0; color: #002b64; }

/* ── the three shapes ──────────────────────────────────────────────────────
   A shape is a grid rule. That is the whole of Decision 3 on this side. */
.scc-capture { display: grid; gap: 0.6rem; }
.scc-capture.is-buckets { grid-template-columns: 1fr; }
.scc-capture.is-quadrants { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.scc-capture.is-forces { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.scc-capture.is-statements { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.scc-capture.is-actions { display: block; }
.scc-table { font-size: 0.8rem; }
.scc-table th {
  font-size: 0.66rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #5b6f8a;
  white-space: nowrap;
}
.scc-table td { vertical-align: top; }

.scc-box {
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #f1f6fb;
}
.scc-box.is-centre { background: #eef7ff; border-color: #9fd0f5; }
.scc-box.is-filled { background: #eefaf0; border-color: #a8dcb4; }
.scc-box-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0070c0;
  margin-bottom: 0.25rem;
}
.scc-box-prompt {
  font-size: 0.73rem;
  color: #5b6f8a;
  font-style: italic;
  margin: 0 0 0.4rem;
}

@media (max-width: 860px) {
  .scc-body { grid-template-columns: 1fr; }
  .scc-capture.is-quadrants,
  .scc-capture.is-forces { grid-template-columns: 1fr; }
}
</style>

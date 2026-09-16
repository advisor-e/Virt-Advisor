<template lang="pug">
.scc
  .scc-head
    .scc-head-text
      p.scc-eyebrow {{ eyebrow }}
      h3.scc-title {{ framework.name }}
      p.scc-instruction(v-if="framework.captureInstruction") {{ framework.captureInstruction }}

  .scc-body(:class="{ 'is-wide': !showsConcept }")
    //- The concept, so the advisor can teach the framework without leaving the screen.
    //- ⚠ NOT ON A TABLE. An Action Plan is filled in, not taught, and both closing
    //- frameworks point at the same material — so the panel appeared TWICE on screen 3,
    //- word for word. Found by looking at it; no test saw it.
    aside.scc-concept(v-if="showsConcept")
      p.scc-concept-head {{ $t('strategyPlanner.card.whatThisDoes') }}
      p.scc-concept-text {{ framework.conceptSummary }}
      p.scc-concept-head(v-if="framework.whoWhen") {{ $t('strategyPlanner.card.whoAndWhen') }}
      p.scc-concept-text(v-if="framework.whoWhen") {{ framework.whoWhen }}

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
                b-input(
                  v-else
                  :id="inputId(field.key)"
                  :value="valueOf(field.key)"
                  :placeholder="field.prompt || ''"
                  @focus="onFocus(field.key)"
                  @blur="onBlur(field.key, $event)"
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
export default {
  name: 'StrategyCaptureCard',

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
    eyebrow: { type: String, default: '' }
  },

  computed: {
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

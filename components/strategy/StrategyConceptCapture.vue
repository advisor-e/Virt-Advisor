<template lang="pug">
section.scc2
  header.scc2-head
    p.scc2-eyebrow(v-if="eyebrow") {{ eyebrow }}
    h3.scc2-title {{ cardTitle }}
    //- The instruction is the advisor's, from the deck.
    p.scc2-instruction(v-if="instruction") {{ instruction }}

  //- 🔴 THE CONCEPT, SO IT CAN BE TAUGHT WITHOUT LEAVING THE SCREEN. Both lines are
  //- Mike's own, off the deck's Session Scope table. Always shown: a concept appears
  //- once, so there is no later visit for them to be held back from.
  section.scc2-concept(v-if="conceptSummary || helpsClientTo")
    //- ⚠ NO HEADINGS. Removed on Mike's instruction, 2026-09-17 — "What this does
    //- in the room" was written by an AI session and he had never seen it.
    //- 🔴 THE DRAWING GOES ABOVE HIS WORDS, so the advisor speaks to it first. It
    //- is ours, drawn from his page — never a photograph of it, which would lock
    //- in the advisor-e.com logo where the ADVISOR'S firm logo belongs.
    strategy-concept-graphic(
      :concept-id="conceptId"
      :firm-name="firmName"
      :firm-colour="firmColour"
    )
    p.scc2-concept-text(v-if="conceptSummary") {{ conceptSummary }}
    p.scc2-concept-text(v-if="helpsClientTo") {{ helpsClientTo }}
    //- Only where this concept has NO drawing yet is the advisor still sent to the
    //- deck. Once it has one the sentence would be false, which is the fault this
    //- whole item exists to close (item 15.7).
    //- ⚠ AND NOT ON THE ORG CHART, where it would be false. The approved drawing says it
    //- outright: that concept has no drawn teaching page and none is proposed, because
    //- "for this concept the builder is the whole screen" — the chart the advisor's list
    //- draws IS the diagram, so sending them to the deck for it is wrong.
    p.scc2-teaching(v-if="teachingForm && !hasGraphic && !isOrgChart") {{ $t('strategyPlanner.capture.teachingNotDrawn') }}

  //- 🔴 A CONCEPT WITH NO TABLE SAYS SO RATHER THAN SHOWING AN EMPTY ONE. Nothing
  //- is borrowed from another concept: a table an advisor puts in front of a client
  //- has to be the table Mike wrote.
  //- ⚠ IT USED TO BE SUPPRESSED WHERE HIS RESPONSE PAGE WAS ON SCREEN, because the
  //- two together contradicted each other: (Our) Revenue Streams was displayed with
  //- "there is no fill-in table for this concept yet" printed beneath it. With the
  //- deck images removed on 2026-09-18 there is no response page on screen to
  //- contradict, so the message is plainly true again and the guard has gone with
  //- the images. ⚠ IT DOES NOT COME BACK WITH THE TEACHING GRAPHIC, which is what
  //- this line used to say — all 33 drawings are teaching pages. The guard returns
  //- when the five response pages are drawn, which is item 15.11.
  b-notification.scc2-none(
    v-if="!capture.supplied"
    type="is-light"
    :closable="false"
  )
    | {{ noTableMessage }}

  //- 🔴 ONE OF MIKE'S NINE CAPTURE FORMS IS NOT A TABLE OF BOXES AT ALL — from
  //- design/mockups/strategy-capture-parent-child-list.html, five decisions ruled by him
  //- 2026-09-21. His Org Chart is the one template of the twenty that is a spreadsheet
  //- rather than a Word document, and his ruling was that it therefore needs to be built
  //- "like a 'mini-app' in order to function": rows are people the advisor adds and
  //- removes, one column is a picker constrained by another, and the chart his deck
  //- teaches is drawn from what is typed.
  strategy-org-chart-builder(
    v-else-if="isOrgChart"
    :entries="entries"
    :shape="capture.orgChart || {}"
    @field-opened="onBuilderFieldOpened"
    @fields-changed="onBuilderFieldsChanged"
  )

  //- 🔴 A TABLE WHOSE COLUMNS MEAN SOMETHING IS DRAWN AS ONE — from
  //- design/mockups/strategy-capture-two-dimensional-grid.html, approved by Mike
  //- 2026-09-21. His attribute names hold still down the left while the persona or
  //- stage columns scroll across, which is the pattern the report screens already use.
  //- Until this, every column name was dropped on the way to the screen: 181 boxes on
  //- Customer Types with no persona on any of them, 25 on Operational Objectives with
  //- no stage.
  .scc2-scroll(v-else-if="isGrid")
    table.scc2-tdg
      thead
        tr
          th.scc2-attr &nbsp;
          th(v-for="col in gridColumns" :key="'h' + col.column") {{ col.label }}
      tbody
        template(v-for="group in gridRows")
          tr(v-for="(line, i) in group.lines" :key="line.key")
            //- His attribute name spans its own lines rather than repeating on each.
            td.scc2-attr(v-if="i === 0" :rowspan="group.lines.length") {{ group.label }}
            td(v-for="field in line.cells" :key="field.key")
              strategy-capture-box(
                :field="field"
                :value="valueOf(field)"
                :rows="rowsFor(field)"
                :speech-supported="speechSupported"
                :recording="voiceField === field.key"
                @toggle-voice="toggleVoiceField"
                @focus-field="onFocus"
                @input-field="onInput"
              )

  template(v-else)
    .scc2-grid
      .scc2-block(v-for="block in blocks" :key="block.key")
        p.scc2-block-label(v-if="block.label") {{ block.label }}
        .scc2-field(v-for="field in block.fields" :key="field.key")
          label.scc2-field-label(
            v-if="field.rowLabel"
            :for="inputId(field)"
          ) {{ field.rowLabel }}

          //- 🔴 THE SAME VOICE BAR THE ADVISOR ALREADY USES — Mike, 2026-09-19:
          //- "check the 'i have a client with a problem...' section - i want app user
          //- consistency." Same three states, same icons and the same six strings from
          //- `voice.*` as VirtualAdvisor's profile questions. Nothing is worded here.
          //- Absent where the browser has no speech recognition, exactly as elsewhere.
          .scc2-voice(v-if="speechSupported")
            button.scc2-vb.is-idle(
              v-if="voiceField !== field.key"
              type="button"
              @click="toggleVoiceField(field.key)"
            )
              svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor")
                path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
              | {{ valueOf(field) ? $t('voice.recordAgain') : $t('voice.tapToSpeak') }}
            template(v-else)
              span.scc2-vdot
              span.scc2-vlab {{ $t('voice.recording') }}
              button.scc2-vb.is-stop(type="button" @click="toggleVoiceField(field.key)")
                svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
                  rect(x="6" y="6" width="12" height="12" rx="2")
                | {{ $t('voice.stopRecording') }}

          b-input(
            :id="inputId(field)"
            type="textarea"
            :rows="rowsFor(field)"
            :value="valueOf(field)"
            :placeholder="field.example"
            @focus="onFocus(field)"
            @input="onInput(field, $event)"
          )
</template>

<script>
/**
 * StrategyConceptCapture — one concept's real fill-in table, for one visit.
 *
 * WHAT MAKES THIS DIFFERENT FROM `StrategyCaptureCard`. That component draws the
 * five shapes hand-written in September, two of which are wrong against Mike's own
 * templates. This one draws whatever `GET /api/strategy/concepts/:id/capture`
 * returns, which is read out of his fill-in workbooks by
 * `scripts/read-capture-tables.js`. There is no shape list here and there is
 * nothing to add when a 21st template arrives.
 *
 * 🔴 EVERY LABEL ON SCREEN IS MIKE'S. Nothing in this component writes a heading,
 * a prompt or a placeholder. The `placeholder` is his own worked example from the
 * template — shown as guidance, never saved as the client's text.
 *
 * 🔴 A VISIT SHOWS ONE PART, AND THAT IS THE TEACHING METHOD, NOT A TECHNICALITY.
 * Mike, 2026-09-17: you teach the concept, let it land, then ask how it applies —
 * *"do you want to see the topic, try to learn it and before you comprehend it, get
 * hit with questions on how it relates to you?"* So Porter's first visit shows the
 * observation columns and the response columns are not on the screen at all.
 *
 * Vue 2, Options API, Pug. Node/browser safe: no window access outside mounted.
 */
import speechMixin from '~/mixins/speechMixin'
import StrategyConceptGraphic from '~/components/strategy/StrategyConceptGraphic.vue'
import StrategyCaptureBox from '~/components/strategy/StrategyCaptureBox.vue'
import StrategyOrgChartBuilder from '~/components/strategy/StrategyOrgChartBuilder.vue'
import { hasConceptGraphic } from '~/components/strategy/concepts'

/** The one capture form that is a small application rather than a page of boxes. */
const ORG_CHART_FORM = 'parent-child-list'

export default {
  name: 'StrategyConceptCapture',

  components: { StrategyConceptGraphic, StrategyCaptureBox, StrategyOrgChartBuilder },

  mixins: [speechMixin],

  props: {
    /** The concept's own name, for the card heading. */
    name: {
      type: String,
      required: true
    },

    /** The reply from `/api/strategy/concepts/:id/capture`. */
    capture: {
      type: Object,
      required: true,
      validator: c => !!c && typeof c.supplied === 'boolean'
    },

    /** The advisor's instruction for this concept, from the deck. */
    instruction: {
      type: String,
      default: ''
    },

    /** Position in the session, e.g. "Step 1 · concept 2 of 5". */
    eyebrow: {
      type: String,
      default: ''
    },

    /** Mike's own one-line explanation of the concept, from the deck's scope table. */
    conceptSummary: {
      type: String,
      default: ''
    },

    /** Mike's own "Helps Your Client To…" line for this concept. */
    helpsClientTo: {
      type: String,
      default: ''
    },

    /**
     * Which drawing the deck teaches this concept with — `radial-hub` for Porter's.
     * Where no approved drawing exists yet, the card sends the advisor to the deck.
     */
    teachingForm: {
      type: String,
      default: ''
    },

    /** Which concept, so its approved drawing can be found. */
    conceptId: {
      type: String,
      default: ''
    },

    /** The advisor firm's name, printed beside the mark on the drawing. */
    firmName: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /** What is already captured, keyed by field key. */
    entries: {
      type: Object,
      default: () => ({})
    }
  },

  computed: {
    /** @returns {boolean} true where this concept has an approved drawing */
    hasGraphic () {
      return hasConceptGraphic(this.conceptId)
    },

    /**
     * The card's heading — the concept's name, and nothing appended to it.
     *
     * 🔴 THERE IS NO "(Part 1)" / "(Part 2)" ANY MORE. Mike's ruling, 2026-09-21: a
     * concept is listed once, scoped once, sorted once, and appears ONCE in Run session
     * and ONCE in the plan. The part suffix existed only to tell two visits of the same
     * concept apart, and there are no longer two.
     *
     * @returns {string}
     */
    cardTitle () {
      return this.name
    },

    /**
     * Every field of the concept's table, in reading order.
     *
     * ⚠ THE WHOLE TABLE, NOT A SLICE OF IT. This used to open one part — Porter's
     * observation columns on the first visit, the response columns on a later one. With
     * one card per concept the advisor gets Mike's table as he wrote it, in one place.
     *
     * @returns {Array<object>}
     */
    visitFields () {
      if (!this.capture.supplied) { return [] }
      return this.capture.fields || []
    },

    /**
     * Is this his Org Chart — the one form that is a mini-app?
     *
     * ⚠ IT READS THE TEMPLATE'S FORM NAME, for the same reason `isGrid` does: it cannot be
     * derived from the fields, because this form deliberately has none.
     *
     * @returns {boolean}
     */
    isOrgChart () {
      return this.capture.supplied && this.capture.form === ORG_CHART_FORM
    },

    /**
     * Is this one of Mike's two-dimensional tables — attributes down, the things being
     * compared across?
     *
     * ⚠ IT READS THE TEMPLATE'S FORM NAME, WHICH NOTHING ON THIS SCREEN DID BEFORE.
     * Stated rather than slipped in, because the header above says there is no shape
     * list here. There is now exactly one alternative layout, and it cannot be derived
     * from the fields: Porter's also has four named columns and would become a grid,
     * changing a screen approved on 2026-09-19. `captureForm` is authored per concept
     * and already arrives in the payload, so it is what decides.
     *
     * @returns {boolean}
     */
    isGrid () {
      return this.capture.supplied &&
        ['attribute-rows-entity-columns', 'named-rows-staged-columns'].includes(this.capture.form) &&
        this.gridColumns.length > 1
    },

    /**
     * The columns of that grid, in his document's order.
     *
     * A column with no heading is his own — Operational Objectives leaves the first one
     * blank and the advisor names each objective in it. Nothing is written for it here.
     *
     * @returns {Array<{column: number, label: string}>}
     */
    gridColumns () {
      const seen = []
      this.visitFields.forEach((f) => {
        if (!seen.some(c => c.column === f.column)) {
          seen.push({ column: f.column, label: f.columnLabel || '' })
        }
      })
      return seen.sort((a, b) => a.column - b.column)
    },

    /**
     * The rows of that grid, each carrying one box per column, grouped under the
     * attribute they belong to so his name spans its lines rather than repeating.
     *
     * @returns {Array<{label: string, lines: Array<{key: string, cells: Array}>}>}
     */
    gridRows () {
      const lines = []
      const byRow = {}
      this.visitFields.forEach((f) => {
        const id = 't' + f.key.split('r')[0].slice(1) + 'r' + f.row
        if (!byRow[id]) {
          byRow[id] = { key: id, label: f.rowLabel || '', cells: [] }
          lines.push(byRow[id])
        }
        byRow[id].cells.push(f)
      })

      // His attribute name spans its own lines: a run of consecutive lines carrying the
      // same name is one group. An empty name groups alone, so nothing is merged that
      // he did not name.
      const groups = []
      lines.forEach((line) => {
        const last = groups[groups.length - 1]
        if (last && line.label && last.label === line.label) { last.lines.push(line) } else {
          groups.push({ label: line.label, lines: [line] })
        }
      })
      return groups
    },

    /**
     * The fields grouped under their column heading, which is how the template itself
     * bands them.
     * @returns {Array<{key: string, label: string, fields: object[]}>}
     */
    blocks () {
      const order = []
      const byLabel = {}
      this.visitFields.forEach((f) => {
        const label = f.columnLabel || f.rowLabel || ''
        if (!byLabel[label]) {
          byLabel[label] = { key: 'b' + order.length, label, fields: [] }
          order.push(byLabel[label])
        }
        byLabel[label].fields.push(f)
      })
      return order
    },

    /**
     * Said plainly, because an advisor reads it mid-session with a client beside
     * them.
     *
     * 🔴 THIS USED TO HAVE A SECOND BRANCH SAYING A TABLE "HAS NOT BEEN SUPPLIED
     * YET", NAMING IT. Four concepts reached it — Branding, Customer Loyalty,
     * Pricing, Packaging — and for all four the sentence was false: Mike's forms are
     * pages 34, 36, 38 and 40 of the Sales & Marketing deck and are now read from
     * there. Nothing produces that reason any more, so the branch and its wording are
     * gone rather than left to be shown to somebody one day.
     *
     * @returns {string}
     */
    noTableMessage () {
      return this.$t('strategyPlanner.capture.noTableMeasured')
    }
  },

  methods: {
    /**
     * A DOM id for the field's label to point at.
     * @param {object} field
     * @returns {string}
     */
    inputId (field) {
      return 'scc2-' + field.key
    },

    /**
     * What is captured in this box.
     * @param {object} field
     * @returns {string}
     */
    valueOf (field) {
      // 🔴 HIS WORKED ANSWER ARRIVES IN THE BOX — Mike, 2026-09-21. It is a starting
      // value to type over, not a placeholder: the advisor keeps it, edits it or clears
      // it, and what they leave is what is saved. Only where nothing has been captured
      // yet, so clearing a prefilled box stays cleared.
      //
      // 🔴 AND IT IS SCREEN-ONLY UNTIL SOMEBODY TYPES — MIKE'S RULING, 2026-09-21, asked
      // as its own question. Nothing writes the prefilled value into the session, so an
      // untouched column prints BLANK on the client's plan rather than printing his
      // example. That difference is deliberate: the alternative hands Farmer Joe and his
      // farm wagon to a real client as though they were that client's own customer.
      // DO NOT "fix" this by seeding entries on load. Pinned by
      // tests/unit/strategyCapture.component.test.js.
      const saved = this.entries[field.key]
      if (saved !== undefined && saved !== null) { return saved }
      return field.prefilled || ''
    },

    /**
     * A ruled line gets one row; a prompt that Mike answered in a paragraph gets
     * room for a paragraph. Taken from the length of his own example.
     * @param {object} field
     * @returns {number}
     */
    rowsFor (field) {
      const example = field.example || ''
      if (example.length > 220) { return 4 }
      if (example.length > 80) { return 3 }
      return 2
    },

    /**
     * The Org Chart Builder moved into a box. Passed straight through, so a role's name box
     * claims spoken words exactly as every other box does.
     * @param {{fieldKey: string}} payload
     */
    onBuilderFieldOpened (payload) {
      // { fieldKey } — which box is now open
      this.$emit('field-opened', payload)
    },

    /**
     * The Org Chart Builder saved one or more boxes.
     *
     * 🔴 IT IS A BATCH BECAUSE ADDING A ROLE IS TWO WRITES AND LOADING HIS EXAMPLE IS 49.
     * The roster and the box it makes real have to land together, or a reload would show a
     * name with no row to put it on.
     *
     * @param {{entries: Array<{fieldKey: string, value: string}>}} payload
     */
    onBuilderFieldsChanged (payload) {
      // { entries: [{ fieldKey, value }] } — saved together, in one request
      this.$emit('fields-changed', payload)
    },

    /**
     * The advisor moved into a box — the navigation timeline's whole mechanism.
     * @param {object} field
     */
    onFocus (field) {
      // { fieldKey } — which box is now open, so spoken words can reach it later.
      this.$emit('field-opened', { fieldKey: field.key })
    },

    /**
     * The advisor typed.
     * @param {object} field
     * @param {string} value
     */
    onInput (field, value) {
      // { fieldKey, value } — one box's whole current text, not a keystroke.
      this.$emit('field-changed', { fieldKey: field.key, value: value === null || value === undefined ? '' : String(value) })
    },

    /**
     * Spoken words, for the box that was tapped.
     *
     * 🔴 THE BOX IS CHOSEN BY THE ADVISOR, NEVER WORKED OUT AFTERWARDS. Nothing reads
     * a transcript and decides where a sentence belongs — the advisor tapped the box,
     * so the words go there and nowhere else (Brief §5).
     *
     * Saved on the same event as typing, so a dictated answer and a typed one are the
     * same thing to everything downstream — the store, the timeline, the plan.
     *
     * @param {string} fieldKey the box being dictated into
     * @param {string} transcript what has been heard so far in this take
     */
    emitVoice (fieldKey, transcript) {
      this.$emit('field-changed', { fieldKey, value: String(transcript || '') })
    }
  }
}
</script>

<style scoped>
/* The voice bar. Sized and coloured to match the one in VirtualAdvisor's profile
   questions, so an advisor meets the same control in both places. */
.scc2-voice {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.scc2-vb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 6px;
  padding: 4px 11px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.scc2-vb.is-idle {
  border: 1px solid #d5e1ee;
  background: #fff;
  color: #0070c0;
}

.scc2-vb.is-idle:hover {
  border-color: #0070c0;
}

.scc2-vb.is-stop {
  border: 0;
  background: #c0392b;
  color: #fff;
}

.scc2-vdot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c0392b;
}

.scc2-vlab {
  font-size: 12.5px;
  font-weight: 600;
  color: #c0392b;
}

.scc2 {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}

.scc2-eyebrow {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin-bottom: 2px;
}

.scc2-title {
  font-size: 19px;
  font-weight: 700;
  color: #002b64;
  margin: 0;
}

.scc2-instruction {
  margin-top: 6px;
  color: #0070c0;
  font-weight: 600;
}

.scc2-part {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
}

.scc2-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

/* 🔴 THE TWO-DIMENSIONAL TABLE — from design/mockups/strategy-capture-two-dimensional-grid.html,
   approved 2026-09-21. The attribute column is held still with `position: sticky` while the
   persona or stage columns scroll past it; twelve report screens here already scroll a wide
   table (MidLevelBudget.vue, SalesDashboard.vue) but none pins a column, so this is new.
   Columns are 430px because that is what one of Mike's answers and its voice bar need — at
   186px they all fitted inside the page and it did not visibly scroll at all. */
.scc2-scroll {
  overflow-x: auto;
  margin-top: 12px;
  border: 1px solid #d5e1ee;
  border-radius: 9px;
}

.scc2-tdg {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}

.scc2-tdg th,
.scc2-tdg td {
  width: 430px;
  border: 1px solid #d5e1ee;
  padding: 7px 10px;
  vertical-align: top;
  text-align: left;
}

.scc2-tdg th {
  background: #f1f6fb;
  color: #002b64;
  font-size: 13.5px;
  border-bottom: 2px solid #0070c0;
}

.scc2-tdg th.scc2-attr,
.scc2-tdg td.scc2-attr {
  width: 258px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #f1f6fb;
  color: #002b64;
  font-weight: 600;
  font-size: 13px;
  border-right: 2px solid #0070c0;
}

.scc2-block-label {
  font-weight: 700;
  color: #002b64;
  margin-bottom: 6px;
}

.scc2-field + .scc2-field {
  margin-top: 14px;
}

.scc2-said {
  font-size: 13.5px;
  color: #002b64;
  font-weight: 600;
  border-left: 3px solid #0070c0;
  padding-left: 9px;
  margin-bottom: 5px;
}

.scc2-reteach {
  margin-top: 4px;
  font-size: 13.5px;
}

.scc2-reteach a {
  color: #0070c0;
}

.scc2-waiting {
  margin-top: 10px;
  color: #5b6f8a;
  font-style: italic;
}

.scc2-field-label {
  display: block;
  font-size: 13.5px;
  color: #23405f;
  margin-bottom: 4px;
}

.scc2-none {
  margin-top: 12px;
}

.scc2-concept {
  margin-top: 12px;
  padding: 12px 14px;
  background: #f1f6fb;
  border-left: 3px solid #0070c0;
  border-radius: 0 9px 9px 0;
}

.scc2-concept-head {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
}

.scc2-concept-text {
  color: #23405f;
  margin-bottom: 8px;
}

.scc2-concept-text:last-child {
  margin-bottom: 0;
}

.scc2-teaching {
  margin-top: 6px;
  font-size: 13px;
  color: #b56200;
}

.scc2-advance {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.scc2-advance-hint {
  color: #5b6f8a;
  font-size: 13.5px;
}
</style>

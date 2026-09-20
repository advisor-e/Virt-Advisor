<template lang="pug">
section.scc2
  header.scc2-head
    p.scc2-eyebrow(v-if="eyebrow") {{ eyebrow }}
    h3.scc2-title {{ cardTitle }}
    //- The instruction is the advisor's, typed against this visit. Mike's own is
    //- "record your observations ONLY. (For Now)" — the sentence that makes visit
    //- one different from visit two.
    p.scc2-instruction(v-if="instruction") {{ instruction }}

  //- 🔴 THE CONCEPT, SO IT CAN BE TAUGHT WITHOUT LEAVING THE SCREEN. Both lines are
  //- Mike's own, off the deck's Session Scope table. Shown on the FIRST visit only:
  //- by the second the concept has been taught and repeating it pushes the boxes
  //- down the page.
  section.scc2-concept(v-if="part === 1 && (conceptSummary || helpsClientTo)")
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
    p.scc2-teaching(v-if="teachingForm && !hasGraphic") {{ $t('strategyPlanner.capture.teachingNotDrawn') }}

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

  template(v-else)
    //- Only when it adds something. On a second visit the instruction above IS
    //- the part's heading, and printing it twice reads as a mistake.
    p.scc2-part(v-if="partLabel && partLabel !== instruction") {{ partLabel }}

    //- 🔴 NOTHING TO RESPOND TO IS NOT AN EMPTY FORM, IT IS A SENTENCE. Before
    //- this, a second visit drew every box with "Nothing was recorded here
    //- earlier." above it — sixteen times — which is the same duplicated grid the
    //- part split exists to remove, wearing a different hat.
    p.scc2-waiting(v-if="!blocks.length") {{ $t('strategyPlanner.capture.nothingToAnswer') }}

    .scc2-grid
      .scc2-block(v-for="block in blocks" :key="block.key")
        p.scc2-block-label(v-if="block.label") {{ block.label }}
        .scc2-field(v-for="field in block.fields" :key="field.key")
          //- 🔴 A SECOND VISIT ANSWERS THE FIRST. Where this box responds to one
          //- filled in earlier, that line is shown above it — the client's own
          //- words, read-only. A response typed against a blank space is a second
          //- identical form, which is worth nothing to anybody.
          p.scc2-said(v-if="field.pairedFieldKey") {{ answeredText(field) }}
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
import { hasConceptGraphic } from '~/components/strategy/concepts'

export default {
  name: 'StrategyConceptCapture',

  components: { StrategyConceptGraphic },

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

    /**
     * Which part of the table this visit opens, 1-based. A table with one part
     * ignores it; Porter's part 2 shows only the response columns.
     */
    part: {
      type: Number,
      default: 1,
      validator: n => Number.isInteger(n) && n >= 1
    },

    /** The advisor's instruction for THIS visit, e.g. "observations ONLY. (For Now)". */
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

    /** @returns {number} how many visits this concept's table is split into */
    partCount () {
      const parts = (this.capture && this.capture.parts) || []
      return parts.length > 1 ? parts.length : 1
    },

    /**
     * The card's heading.
     *
     * 🔴 "(Part 1)" AND "(Part 2)" ARE NOT DECORATION. Both visits to Porter's
     * draw the same four force headings — one for what may change, one for how we
     * respond — so without the part in the title an advisor sees the identical
     * form twice, one under the other, and cannot tell which is which. Mike found
     * exactly that on 2026-09-17. The approved drawing
     * (`design/mockups/strategy-plan-output.html`, p11 and p21) titles them this
     * way for the same reason.
     *
     * @returns {string}
     */
    cardTitle () {
      if (this.partCount < 2) { return this.name }
      return this.name + ' ' + this.$t('strategyPlanner.capture.part', { n: this.part })
    },

    /**
     * The fields this visit opens, in reading order.
     * @returns {Array<object>}
     */
    visitFields () {
      if (!this.capture.supplied) { return [] }
      const parts = this.capture.parts || []
      const chosen = parts[this.part - 1] || parts[0]
      if (!chosen) { return this.capture.fields || [] }
      const wanted = {}
      chosen.fieldKeys.forEach((k) => { wanted[k] = true })
      const fields = (this.capture.fields || []).filter(f => wanted[f.key])

      // 🔴 A RESPONSE BOX ONLY EXISTS WHERE THERE IS SOMETHING TO RESPOND TO. The
      // second visit answers the first — an empty observation has no response, and
      // drawing a box for it puts the same blank grid on screen twice. Mike's
      // verdict, 2026-09-17: "how could anyone gain value from having this
      // repeated? if you see it again, it's a fuck up."
      return fields.filter(f => !f.pairedFieldKey || this.answeredText(f))
    },

    /**
     * The heading this visit sits under, where the part has one. Porter's second
     * visit is headed by Mike's own column label, "How We Plan To Respond".
     * @returns {string}
     */
    partLabel () {
      if (!this.capture.supplied) { return '' }
      const parts = this.capture.parts || []
      const chosen = parts[this.part - 1]
      return (chosen && chosen.label) || ''
    },

    /**
     * The visit's fields grouped under their column heading, which is how the
     * template itself bands them.
     * @returns {Array<{key: string, label: string, fields: object[]}>}
     */
    blocks () {
      const order = []
      const byLabel = {}
      this.visitFields.forEach((f) => {
        // On a second visit the part IS the column label, so repeating it on every
        // block would say nothing. What the advisor needs instead is the
        // observation each response answers — `pairedWith`, Mike's own force
        // heading from the column to its left.
        // The block still names the force. What tells the two visits apart is not
        // the heading — it is that every box on the second one sits under the
        // client's own words from the first.
        const label = this.partLabel
          ? (f.pairedWith || f.rowLabel || '')
          : (f.columnLabel || f.rowLabel || '')
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
     * them. The two reasons are different facts and must not read the same.
     * @returns {string}
     */
    noTableMessage () {
      return this.capture.reason === 'template-not-supplied'
        ? this.$t('strategyPlanner.capture.templateNotSupplied', { template: this.capture.template })
        : this.$t('strategyPlanner.capture.noTableMeasured')
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
      return this.entries[field.key] || ''
    },

    /**
     * What the client said in the earlier visit that this box answers.
     * @param {object} field
     * @returns {string}
     */
    answeredText (field) {
      return (this.entries[field.pairedFieldKey] || '').trim()
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

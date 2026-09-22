<template lang="pug">
section.sts
  //- ⚠ NO HEADING HERE. The card this sits inside already prints the framework's
  //- name and its capture instruction; printing them again put the same two lines
  //- on screen twice, one under the other.

  //- 🔴 THE GRAPHIC GOES UP FIRST, so the advisor speaks to it before a single
  //- box is filled in — Mike's instruction, 2026-09-17. It is a drawing OF ours
  //- from a page of HIS, never a photograph of his page: every page of his decks
  //- carries the advisor-e.com logo burned into the pixels, and a client is
  //- always shown the ADVISOR'S firm logo. His words on the images that briefly
  //- stood here: *"they look cheap and more importantly, they lock in the
  //- Advisor-e logo."*
  //-
  //- ⚠ A CONCEPT WITHOUT AN APPROVED DRAWING RENDERS NOTHING HERE and the panel
  //- is his words alone, exactly as all 52 were before item 15.7.
  strategy-concept-graphic(
    :concept-id="conceptId"
    :firm-name="firmName"
    :firm-colour="firmColour"
    :firm-logo="firmLogo"
  )

  //- What the concept does, in Mike's own words from the deck's Session Scope
  //- table — the same two lines the menu screen shows before it is ticked.
  //- ⚠ NO HEADINGS ABOVE THESE. "What this does in the room" was an AI invention;
  //- Mike had it removed on 2026-09-17. Both sentences are his own and say what
  //- they are without a label over them.
  .sts-concept(v-if="conceptSummary || helpsClientTo")
    p.sts-text(v-if="conceptSummary") {{ conceptSummary }}
    p.sts-text(v-if="helpsClientTo") {{ helpsClientTo }}

  //- The prompts an advisor speaks to. These are the framework's own fields, which
  //- is where his approved screen of 2026-09-16 put them.
  //- 🔴 NOT WHERE THE DRAWING ABOVE ALREADY ASKS THEM — item 15.12, ruled fixed by
  //- Mike 2026-09-23. Porter's 5 Forces and The 8 Profit Levers carry their questions
  //- inside the drawing, so these bullets put the same words on the screen twice in
  //- front of the client. The item described it as a PRINTING fault; it is on this
  //- screen too, where there is no sheet to overflow and nothing flagged it.
  ul.sts-prompts(v-if="prompts.length && !promptsRepeatDrawing")
    li.sts-prompt(v-for="p in prompts" :key="p.key")
      b {{ p.label }} —
      span {{ p.prompt }}
</template>

<script>
import StrategyConceptGraphic from '~/components/strategy/StrategyConceptGraphic.vue'
import { promptsEchoDrawing } from '~/components/strategy/concepts'

/**
 * StrategyTeachingSlide — the concept on screen, so an advisor can teach it.
 *
 * Mike's instruction, 2026-09-17: *"i want the graphic up so the advisor can speak
 * to it - then the responses are captured after the click of a button."*
 *
 * 🔴 EVERYTHING HERE COMES FROM WHAT HE GAVE US, AND NOTHING IS DERIVED. The
 * prompts are the framework's own fields from `data/strategy-frameworks.json`,
 * which is his approved screen of 2026-09-16; the two description lines are his
 * Session Scope table. Three times on 2026-09-17 a build read one of these out of a
 * source file instead and got it wrong — a diagram of its own invention, four
 * forces instead of five, and force names broken into fragments. His instruction:
 * *"can you please stick to what i gave you?"*
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyTeachingSlide',

  components: { StrategyConceptGraphic },

  props: {
    /** The concept's name. */
    name: {
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

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL. Empty means the firm
     * holds none and the drawing falls back to the initials disc - Mike's
     * ruling, 2026-09-22. Sourced by firmBrand() from Advisor-e's firm profile.
     */
    firmLogo: {
      type: String,
      default: ''
    },

    /** Mike's one-line explanation, from the deck's Session Scope table. */
    conceptSummary: {
      type: String,
      default: ''
    },

    /** Mike's "Helps Your Client To…" line for this concept. */
    helpsClientTo: {
      type: String,
      default: ''
    },

    /**
     * The framework's fields — each carries the label and the prompt Mike's
     * approved screen puts against it.
     */
    fields: {
      type: Array,
      default: () => []
    }
  },

  computed: {
    /**
     * The prompts to speak to. Only fields that actually carry one; a box with no
     * prompt has nothing to say before it is filled in.
     * @returns {Array<{key: string, label: string, prompt: string}>}
     */
    prompts () {
      return this.fields.filter(f => f && f.prompt && f.label)
    },

    /**
     * Would these bullets repeat the questions already inside the drawing above?
     *
     * Item 15.12. Generated by word overlap at build time, never listed by hand.
     *
     * @returns {boolean}
     */
    promptsRepeatDrawing () {
      return promptsEchoDrawing(this.conceptId)
    }
  }
}
</script>

<style scoped>
.sts {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 18px;
}

.sts-concept {
  margin-top: 14px;
  padding: 12px 14px;
  background: #f1f6fb;
  border-left: 3px solid #0070c0;
  border-radius: 0 9px 9px 0;
}

.sts-head-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
}

.sts-text {
  color: #23405f;
  margin-bottom: 8px;
}

.sts-text:last-child {
  margin-bottom: 0;
}

.sts-prompts {
  margin-top: 14px;
  padding-left: 18px;
}

.sts-prompt {
  list-style: disc;
  color: #23405f;
  margin-bottom: 8px;
}

.sts-prompt b {
  color: #002b64;
}
</style>

<template lang="pug">
section.sts
  //- ⚠ NO HEADING HERE. The card this sits inside already prints the framework's
  //- name and its capture instruction; printing them again put the same two lines
  //- on screen twice, one under the other.

  //- 🔴 THERE IS NO GRAPHIC HERE YET, AND THAT IS THE CURRENT STATE — Mike's
  //- ruling, 2026-09-18. Until then this rendered a JPEG of his own deck page.
  //- He had not asked for that, and it cannot be white-labelled: every page of
  //- his decks carries the advisor-e.com logo and border burned into the pixels,
  //- and Advisor-e always shows the ADVISOR'S firm logo to a client, never its
  //- own. His words: *"they look cheap and more importantly, they lock in the
  //- Advisor-e logo."* The images and their renderer are deleted.
  //-
  //- ⚠ THE REBUILD DRAWS EACH CONCEPT AS A COMPONENT, so the firm's logo can sit
  //- where his does. Two things govern it, and they pull against each other:
  //-
  //- 1. The concept must appear AS IT DOES IN HIS DECK. `deck` and `page` on the
  //-    concept say which page — open it and look.
  //- 2. A drawing done from memory gets it WRONG. The hand-drawn Porter's hub
  //-    that stood here before the images carried a comment claiming it was his
  //-    approved drawing COPIED, NOT REDRAWN. It was redrawn, and against his
  //-    actual slide — Strategic Orientation 2 p13 — THREE OF THE FOUR FORCES
  //-    WERE IN THE WRONG POSITION: his are Customers top, Suppliers right,
  //-    Substitutes bottom, New Entrants left. His ring and his four colours were
  //-    missing, the inward arrows invented, two bold statements absent. Every
  //-    gate passed throughout, because a gate compares code to a note and
  //-    nothing compared the build to the slide.
  //-
  //- 🔴 SO: BUILD IT WITH HIS PAGE OPEN BESIDE IT, NEVER FROM MEMORY, and get the
  //- drawing approved as a saved artefact before it ships.

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
  ul.sts-prompts(v-if="prompts.length")
    li.sts-prompt(v-for="p in prompts" :key="p.key")
      b {{ p.label }} —
      span {{ p.prompt }}
</template>

<script>
/**
 * StrategyTeachingSlide — the concept on screen, so an advisor can teach it.
 *
 * Mike's instruction, 2026-09-17: *"i want the graphic up so the advisor can speak
 * to it - then the responses are captured after the click of a button."*
 *
 * ⚠ THE GRAPHIC IS NOT HERE. It was a JPEG of his own deck page and was removed on
 * 2026-09-18 because it carries the advisor-e.com logo, which can never be the
 * advisor's firm logo. The template comment says what replaces it. Until then this
 * component is his words without his picture, and it says so on screen.
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

  props: {
    /** The concept's name. */
    name: {
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

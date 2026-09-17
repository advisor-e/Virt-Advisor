<template lang="pug">
section.sts
  //- ⚠ NO HEADING HERE. The card this sits inside already prints the framework's
  //- name and its capture instruction; printing them again put the same two lines
  //- on screen twice, one under the other.

  //- 🔴 THE GRAPHIC IS MIKE'S OWN SLIDE. Not a drawing of it — the slide itself,
  //- rendered from his deck by `scripts/render-deck-slides.py`. His ruling,
  //- 2026-09-18: *"continue the build - using the graphics and tables you now
  //- have."*
  //-
  //- ⚠ WHAT THIS REPLACED, AND WHY IT HAD TO. This was a hand-drawn Porter's hub
  //- carrying a comment that said it was his approved drawing COPIED, NOT REDRAWN.
  //- It was redrawn, and against his actual slide — Strategic Orientation 2 p13 —
  //- THREE OF THE FOUR FORCES WERE IN THE WRONG POSITION: his are Customers top,
  //- Suppliers right, Substitutes bottom, New Entrants left. His ring and his four
  //- colours were missing, the inward arrows were invented, and two of his bold
  //- statements were absent. Every gate passed the whole time, because a gate
  //- compares code to a note and nothing compared the build to the slide.
  //-
  //- 🔴 SO DO NOT REDRAW A CONCEPT, EVER. If a slide looks wrong, the answer is to
  //- open his deck and look, then fix the page number in the data.
  figure.sts-slide(v-if="slide")
    img.sts-img(:src="slide" :alt="name")

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
 * 🔴 EVERYTHING HERE COMES FROM WHAT HE GAVE US, AND NOTHING IS DERIVED. The
 * diagram is his approved drawing copied across; the prompts are the framework's
 * own fields from `data/strategy-frameworks.json`, which is his approved screen of
 * 2026-09-16; the two description lines are his Session Scope table. Three times on
 * 2026-09-17 a build read one of these out of a source file instead and got it
 * wrong — a diagram of its own invention, four forces instead of five, and force
 * names broken into fragments. His instruction: *"can you please stick to what i
 * gave you?"*
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyTeachingSlide',

  props: {
    /**
     * Mike's own slide for this concept, served from `static/planning-slides/`.
     * Empty where the concept has no page we trust — a concept listed only on a
     * deck's agenda has none, and showing it the agenda would be a picture of the
     * wrong thing.
     */
    slide: {
      type: String,
      default: ''
    },

    /** The concept's name, which is the image's alt text. */
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

.sts-slide {
  margin: 4px 0 6px;
}

/* His slides are 16:9. The frame keeps that ratio so the page does not jump
   while the image loads, and the border is the slide's own edge rather than a
   card around it. */
.sts-img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border: 1px solid #d5e1ee;
  border-radius: 8px;
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

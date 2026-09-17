<template lang="pug">
section.sts
  //- ⚠ NO HEADING HERE. The card this sits inside already prints the framework's
  //- name and its capture instruction; printing them again put the same two lines
  //- on screen twice, one under the other.

  //- 🔴 THE DIAGRAM IS MIKE'S APPROVED DRAWING, COPIED, NOT REDRAWN.
  //- `design/mockups/strategy-plan-output.html` p5, marked "drawn at fidelity" and
  //- approved 2026-09-17: Existing Rivalry in the centre, New Entrants above,
  //- Substitutes below, Suppliers left, Customers right.
  //-
  //- ⚠ AND IT IS NOT DERIVED FROM ANYTHING. An earlier build read the force names
  //- out of the deck's PDF, where they are drawn curved around the ring and so come
  //- back in fragments — "Existing", "Rivalry", "New", "Entrants" — and then tried
  //- to stitch them together again. Mike, 2026-09-17: *"who told you to split
  //- existing rivalry and new entrants?"* Nobody did. They were never split in what
  //- he gave us. Take the names from here and from `data/strategy-frameworks.json`,
  //- never from the file.
  .sts-hub(v-if="shape === 'forces'")
    svg.sts-svg(viewBox="0 0 520 380" role="img" aria-label="Porter's five forces pressing on a central rivalry hub")
      defs
        marker#stsArrow(markerWidth="9" markerHeight="9" refX="7.2" refY="3" orient="auto")
          path(d="M0 0 L7 3 L0 6 z" fill="#5b8fc7")

      //- The four pressures press INWARD on the centre. That is the model: the
      //- arrows are the meaning, not decoration.
      g(stroke="#5b8fc7" stroke-width="2.4" fill="none" marker-end="url(#stsArrow)")
        line(x1="260" y1="92" x2="260" y2="128")
        line(x1="260" y1="288" x2="260" y2="252")
        line(x1="150" y1="190" x2="186" y2="190")
        line(x1="370" y1="190" x2="334" y2="190")

      circle(cx="260" cy="190" r="62" fill="#002b64")
      text(x="260" y="184" fill="#ffffff" font-size="17" font-weight="700" text-anchor="middle") Existing
      text(x="260" y="206" fill="#ffffff" font-size="17" font-weight="700" text-anchor="middle") Rivalry

      g(v-for="f in ring" :key="f.label")
        circle(:cx="f.cx" :cy="f.cy" r="46" fill="#e6f2fb" stroke="#0070c0" stroke-width="2")
        text(
          v-for="(word, i) in f.words"
          :key="word"
          :x="f.cx"
          :y="f.cy + 5 + (i - (f.words.length - 1) / 2) * 16"
          fill="#002b64"
          font-size="14"
          font-weight="600"
          text-anchor="middle"
        ) {{ word }}

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
    /** The framework's shape — `forces` is the only one with a drawing so far. */
    shape: {
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
     * The four pressures around the hub, with their positions.
     *
     * 🔴 THE FIVE NAMES ARE MIKE'S AND ARE NOT DERIVED FROM ANYTHING. They are the
     * five forces as his own material names them — four around the ring, Existing
     * Rivalry at the centre. Never read them out of the deck PDF: it draws them
     * curved, so they come back in fragments.
     *
     * @returns {Array<{label: string, words: string[], cx: number, cy: number}>}
     */
    ring () {
      return [
        { label: 'New Entrants', words: ['New', 'Entrants'], cx: 260, cy: 46 },
        { label: 'Substitutes', words: ['Substitutes'], cx: 260, cy: 334 },
        { label: 'Suppliers', words: ['Suppliers'], cx: 104, cy: 190 },
        { label: 'Customers', words: ['Customers'], cx: 416, cy: 190 }
      ]
    },

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

.sts-hub {
  margin: 4px 0 6px;
}

.sts-svg {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  margin: 0 auto;
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

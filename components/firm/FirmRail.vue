<template lang="pug">
nav.rail(:aria-label="ariaLabel")
  //- A filter that matches nothing empties the rail entirely, and an empty box
  //- reads as a broken screen. The parent says which it is via emptyText.
  .rail-empty(v-if="!sections.length")
    span.has-text-grey.is-size-7 {{ emptyText }}

  //- Tone is positional, not keyed to section names, so a section added
  //- upstream is distinguished automatically instead of rendering plain.
  //- The accent bar carries the grouping on its own — colour reinforces it
  //- rather than being the only signal, which colour-blind readers lose.
  .rail-group(
    v-for="section in sections"
    :key="section.name"
    :style="{ borderLeftColor: tone(section).band }"
  )
    button.rail-section.rail-section--button(
      v-if="selectableSections"
      type="button"
      :style="{ backgroundColor: tone(section).band, color: bandText }"
      @click="$emit('section-click', section)"
    ) {{ section.name }}
    p.rail-section(
      v-else
      :style="{ backgroundColor: tone(section).band, color: bandText }"
    ) {{ section.name }}

    //- An expand/collapse control, drawn as one: a bordered header that joins
    //- the panel it opens.
    .rail-acc(
      v-for="sub in section.subs"
      :key="sub.key"
      :class="{ 'is-open': isOpen(sub) }"
    )
      button.rail-sub(
        type="button"
        :aria-expanded="isOpen(sub) ? 'true' : 'false'"
        :style="isOpen(sub) ? { backgroundColor: tone(section).tint, borderColor: tone(section).band } : null"
        @click="toggle(sub)"
      )
        //- Drawn in CSS, not b-icon: this app loads no icon font, so every
        //- <b-icon> renders as nothing. The arrow is the whole signal that
        //- this opens — it cannot depend on a missing font.
        span.rail-chev(aria-hidden="true")
        span.rail-subname {{ sub.name }}
        slot(name="sub-badge" :sub="sub" :section="section")

      //- The open panel carries the section's colour on its border, so the
      //- rows on show are visibly the ones just clicked.
      .rail-pages(v-if="isOpen(sub)" :style="{ borderColor: tone(section).band }")
        slot(:sub="sub" :section="section")
</template>

<script>
/**
 * FirmRail — the shared Firm Manager rail: tone-banded groups holding
 * drop-tab accordions (FIRM-EDITABLE-TABLES-PLAN.md Phase 1). Extracted from
 * FirmQuizzes so the Quizzes, Document Library and the coming Domain Support /
 * Logic Tables screens draw one rail, and a rail bug is fixed once.
 *
 * The parent owns the DATA (it builds `sections` and renders each open
 * panel's rows through the default slot); this component owns the LOOK and
 * the OPEN/CLOSED STATE.
 *
 * Open-state rule (the quiz-rail-stuck-open fix, design/ACTIONS.md): the
 * firm's own click is a THREE-STATE flag — unset / opened / closed. Auto-
 * expand (a search hit inside, or holding the row currently on screen) only
 * applies while the flag is UNSET; an explicit close always wins. The old
 * two-state flag let auto-expand force a panel open on the same tick the
 * firm closed it. A changed search text starts a fresh context: manual flags
 * reset so the new search's hits are never hidden behind an old close.
 */
const { blockTone, BAND_TEXT } = require('~/utils/brandTokens')

export default {
  name: 'FirmRail',

  props: {
    /**
     * The rail structure. Each section: { name, tone (zero-based position),
     * subs: [{ key (stable across re-renders), name, hasHits (a search hit
     * lives inside), holdsCurrent (holds the row on screen) }] }. Any other
     * fields ride along untouched for the parent's slots.
     */
    sections: { type: Array, required: true },
    /** The active search text — gates auto-expand and resets manual flags. */
    query: { type: String, default: '' },
    /** Accessible name for the nav landmark. */
    ariaLabel: { type: String, default: '' },
    /** Shown when sections is empty (parent words the no-data vs no-match case). */
    emptyText: { type: String, default: '' },
    /** Render section bands as buttons that emit section-click. */
    selectableSections: { type: Boolean, default: false }
  },

  data () {
    return {
      /** Heading bands all carry white text — see utils/brandTokens.js. */
      bandText: BAND_TEXT,
      /**
       * The firm's explicit open/closed choices, keyed by sub.key.
       * ABSENT = no choice yet (auto-expand may apply); true/false = the
       * firm's word, and it wins.
       */
      manual: {}
    }
  },

  watch: {
    // A new search is a new context: without this reset, a sub explicitly
    // closed during an old search would silently hide the new search's hits —
    // the original "search finds matches but shows nothing" defect returning
    // by another door.
    query () { this.manual = {} }
  },

  methods: {
    /**
     * Brand tone for a section's position — cycles past the palette end.
     * @param {{tone: number}} section
     * @returns {{accent: string, fg: string, tint: string, band: string}}
     */
    tone (section) {
      return blockTone(section.tone)
    },

    /**
     * Effective open state: the firm's explicit choice when one exists,
     * otherwise auto-expand (search hit inside, or holds the current row).
     * @param {Object} sub - a section sub entry
     * @returns {boolean}
     */
    isOpen (sub) {
      const manual = this.manual[sub.key]
      if (manual !== undefined) { return manual }
      return (!!this.query && !!sub.hasHits) || !!sub.holdsCurrent
    },

    /** Flip a sub against its EFFECTIVE state, recording an explicit choice. */
    toggle (sub) {
      this.$set(this.manual, sub.key, !this.isOpen(sub))
    }
  }
}
</script>

<style scoped>
.rail {
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
}
/* Section accent. Deliberately muted and away from Buefy's status hues, so an
   is-warning or is-info tag inside the rail still reads as a status and not as
   another section. The bar is the primary grouping cue; colour reinforces it. */
.rail-group {
  border-left: 3px solid #dbdbdb;
  margin-bottom: 1rem;
}
.rail-acc { margin-bottom: 0.4rem; }

/* The section heading is a solid band, not tinted text — at 26 sub-sections
   the eye needs a hard break, and a colour that has to be hunted for is not
   doing its job. Band colours are applied inline from utils/brandTokens.js so
   the brand palette lives in exactly one place. */
.rail-section {
  display: block;
  width: 100%;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #fff;
  background: #7a7a7a;
  margin: 0 0 0.35rem;
  padding: 0.4rem 0.6rem;
  border-radius: 3px;
}
/* The band as a control (Document Library selects a category by its band).
   Same look as the static band; only the affordances differ. */
.rail-section--button {
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

/* The header of an expand/collapse pair. Bordered and filled so it reads as a
   control, not a line of text — a chevron alone is not an affordance. */
.rail-sub {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  padding: 0.5rem 0.6rem;
  font: inherit;
  transition: background 0.12s;
}
.rail-sub:hover { background: #f5f5f5; }
/* Open: square off the join and drop the shared edge, so header and panel read
   as one object rather than two stacked boxes. */
.rail-acc.is-open .rail-sub {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
  font-weight: 600;
}
/* The disclosure arrow, drawn with borders so it renders under any font.
   Points right when closed, down when open. */
.rail-chev {
  flex-shrink: 0;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid #4a4a4a;
  transition: transform 0.15s ease;
  transform-origin: 3px 50%;
}
.rail-acc.is-open .rail-chev { transform: rotate(90deg); }
.rail-subname { flex: 1; }
/* The panel the header opens. Continues the header's border on three sides and
   finishes it, so the rows on show are unmistakably the ones just clicked.
   Rows indent inside the panel: parent above, children stepped in below. */
.rail-pages {
  border: 1px solid #b5b5b5;
  border-top: 0;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  padding: 0.3rem 0.5rem 0.45rem 1.6rem;
  background: #fff;
}
.rail-empty { padding: 0.3rem 0.25rem; }
</style>

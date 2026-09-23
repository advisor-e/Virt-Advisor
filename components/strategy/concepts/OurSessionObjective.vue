<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Our Session Objective. A welcome line, seven bullets of ground rules for the meeting with two of them emphasised, then a heading reading Agenda and four numbered section items.">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!-- ============================================================
                 FIXED ARTWORK — every span read from the PDF text layer of
                 Advance.2.Strategic Orientation.1.pdf p2. x, y, size, weight
                 and colour are his; each line is pinned to its own measured
                 width with textLength.
                 ============================================================ -->
            <g font-family="Open Sans, sans-serif">
              <text x="44.34" y="90.59" font-size="50" fill="#002B64"
                    textLength="509.55" lengthAdjust="spacing">Our Session Objective</text>

              <text x="75.69" y="184.09" font-size="25" fill="#434343"
                    textLength="619.33" lengthAdjust="spacing">Welcome, it&#8217;s all about you and your business today&#8230;</text>

              <!-- His ground rules. Two are BOLD #002B64 on his page and the rest
                   regular #434343 — the emphasis is his, and it is the whole point of
                   the page, so it is carried exactly. -->
              <text x="98.09" y="239.62" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="239.62" font-size="25" fill="#434343"
                    textLength="540.68" lengthAdjust="spacing">Everyone contributes to collaborative thinking.</text>

              <text x="98.09" y="273.99" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="273.99" font-size="25" fill="#434343"
                    textLength="378.35" lengthAdjust="spacing">Planned Breaks &amp; Housekeeping</text>

              <text x="98.09" y="308.37" font-size="25" font-weight="700" fill="#002B64">&#9679;</text>
              <text x="150.69" y="308.37" font-size="25" font-weight="700" fill="#002B64"
                    textLength="1008.3" lengthAdjust="spacing">My/Our Role in the Planning Session is to Challenge What You Believe To Be True!</text>

              <text x="98.09" y="342.74" font-size="25" font-weight="700" fill="#002B64">&#9679;</text>
              <text x="150.69" y="342.74" font-size="25" font-weight="700" fill="#002B64"
                    textLength="1098.17" lengthAdjust="spacing">Your Role is to be Ready To Explore Issues/ Ideas With an Open Heart and an Open Mind.</text>

              <text x="98.09" y="377.12" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="377.12" font-size="25" fill="#434343"
                    textLength="1104.6" lengthAdjust="spacing">The Objective (expectations) for Today&#8217;s meeting is that we &#8216;Discover What We&#8217;ve Been Missing&#8217;!</text>

              <text x="98.09" y="411.49" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="411.49" font-size="25" fill="#434343"
                    textLength="258.45" lengthAdjust="spacing">Record what we learn.</text>

              <text x="98.09" y="445.87" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="445.87" font-size="25" fill="#434343"
                    textLength="405.7" lengthAdjust="spacing">Build an action plan going forward.</text>

              <!-- The heading is his and is FIXED. Only the rows under it are the slot,
                   so the page still reads as his even when a session has its own steps. -->
              <text x="75.69" y="538.26" font-size="25" fill="#434343"
                    textLength="94.4" lengthAdjust="spacing">Agenda:</text>
            </g>

            <!-- ============================================================
                 THE AGENDA SLOT — Mike's ruling, 2026-09-23. In the app these
                 rows are the SESSION'S OWN STEPS, the list the advisor named in
                 Build session. His four lines are the shipped default and are
                 what this drawing is approved against.

                 🔴 The rows are his page span for span: the sentence in #434343
                 and the "(section n)" tag bold #002B64, set INLINE at its own
                 measured x, because on his page the tag interrupts the line
                 rather than following it. Row 2 runs sentence, tag, sentence.
                 ============================================================ -->
            <g class="agenda-slot" font-family="Open Sans, sans-serif" v-if="!agendaItems.length">
              <text x="98.09" y="584.41" font-size="25" fill="#434343">&#9679;</text>
              <!-- 🔴 xml:space="preserve" ON EVERY SPAN OF HIS THAT CARRIES A LEADING OR
                   TRAILING SPACE. His "(section n)" tags interrupt the line, so the space
                   before one lives at the END of the span before it and is part of that
                   span's MEASURED width. SVG collapses edge whitespace by default, so the
                   glyphs stretched to fill the pinned width instead and closed the gap:
                   the drawing read "same page'.(section 1)" and "data(section 2)&". Caught
                   by putting this beside his page, which is step 1 of the method and the
                   only thing that could have caught it. -->
              <text x="150.69" y="584.41" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="928.6" lengthAdjust="spacing">Review the Planning Process &amp; Language to ensure we&#8217;re all on the &#8216;same page&#8217;. </text>
              <text x="1080.44" y="584.41" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 1)</text>

              <text x="98.09" y="619.3" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="619.3" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="651.48" lengthAdjust="spacing">Assess current position by reviewing (pre-meeting) data </text>
              <text x="803.01" y="619.3" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 2)</text>
              <text x="931.18" y="619.3" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="388.22" lengthAdjust="spacing"> &amp; Financial Performance Reports</text>

              <text x="98.09" y="653.68" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="653.68" font-size="25" fill="#434343" xml:space="preserve"
                    textLength="803.73" lengthAdjust="spacing">Determine the business Strategic Objective &amp; document the Strategy </text>
              <text x="955.33" y="653.68" font-size="25" font-weight="700" fill="#002B64"
                    textLength="128.05" lengthAdjust="spacing">(section 3)</text>

              <text x="98.09" y="688.05" font-size="25" fill="#434343">&#9679;</text>
              <text x="150.69" y="688.05" font-size="25" fill="#434343"
                    textLength="1218" lengthAdjust="spacing">Brainstorm &amp; record Operational Objectives and Tactics (actions) in the Automated Action Plan Reminder</text>
            </g>
            <g class="agenda-slot is-live" v-else font-family="Open Sans, sans-serif">
              <template v-for="(item, i) in agendaItems">
                <text :key="'b' + i" x="98.09"
                      :y="584.41 + i * 34.5467"
                      font-size="25" fill="#434343">&#9679;</text>
                <text :key="'t' + i" x="150.69"
                      :y="584.41 + i * 34.5467"
                      font-size="25" fill="#434343">{{ item }}</text>
              </template>
            </g>

            <!-- The firm's mark, standing exactly where advisor-e.com was burned in. -->
            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>

            <!-- His deck frame, returned in the firm's colour rather than #00B1E0.
                 Five bars inset from the edge with the foot broken in the lower left,
                 and the firm's mark standing in that break. -->
            <rect class="firm-bar is-t" x="8.13" y="8.13" width="1483.74" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-l" x="8.13" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-r" x="1477.71" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-bl" x="8.13" y="821.07" width="95.01" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-brun" x="248.31" y="821.07" width="1243.56" height="14.8" :fill="firmColour"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-our-session-objective.html (drawing 1) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptOurSessionObjective',

  props: {
    /** The advisor firm's name, printed beside the mark. */
    firmName: {
      type: String,
      default: ''
    },

    /** One letter for the disc. */
    firmInitial: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL.
     *
     * Mike's ruling, 2026-09-22: this IS the mark. The initials disc and the
     * printed name are the fallback shown only when a firm holds no logo. The
     * box is a fixed height with preserveAspectRatio="xMinYMid meet", so a logo
     * of any proportion is scaled to fit and never stretched or cropped.
     *
     * Supplied by `firmBrand()` in server/utils/firmsDirectory.js, which reads
     * it from Advisor-e's own firm profile record and returns null for anything
     * that is not an http(s) URL — so an empty string here is the safe state,
     * not a missing value.
     */
    firmLogo: {
      type: String,
      default: ''
    },

    /**
     * The session's own running order, one string per step.
     *
     * Mike's ruling, 2026-09-23: the framing page's AGENDA **is** the step list
     * the advisor names in Build session, not a second list of its own — so the
     * page a client reads and the order the app follows can never disagree.
     *
     * EMPTY IS NOT A MISSING VALUE. It means no session has supplied steps, and
     * the page then shows Mike's own four lines exactly as drawn, which is the
     * state the artefact was approved in.
     */
    agendaItems: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.scg {
  width: 100%;
}

.scg >>> svg {
  display: block;
  width: 100%;
  height: auto;
}
</style>

<template lang="pug">
article.spd(:style="frameStyle")
  //- FRONT MATTER — the first three pages of Pivot: title, the session objective,
  //- then the agenda. The agenda lists every step the advisor named, including one
  //- with nothing in it: a step is a thing he names, not a container the ticks make.
  section.spd-page.is-title
    strategy-plan-mark(v-bind="markProps" big)
    p.spd-kind {{ $t('strategyPlanner.plan.sessionPlan') }}
    h2.spd-title {{ clientName }}
    p.spd-sub(v-if="decks") {{ decks }}

  section.spd-page.is-agenda
    strategy-plan-mark(v-bind="markProps")
    h3.spd-h {{ $t('strategyPlanner.plan.agenda') }}
    ol.spd-agenda
      li.spd-agenda-item(v-for="(step, i) in steps" :key="'a' + i")
        b {{ step.name }}
        span.spd-agenda-count(v-if="step.items.length") {{ $tc('strategyPlanner.plan.conceptCount', step.items.length, { count: step.items.length }) }}
        span.spd-agenda-none(v-else) {{ $t('strategyPlanner.plan.onAgendaOnly') }}

  //- EACH STEP: announced twice, once to teach and once to work — which is how
  //- Pivot runs steps 1 and 2. A step with nothing in it prints its divider and
  //- stops there.
  template(v-for="(step, i) in steps")
    section.spd-page.is-divider(:key="'d' + i")
      strategy-plan-mark(v-bind="markProps")
      p.spd-step {{ $t('strategyPlanner.plan.step', { n: i + 1 }) }}
      h3.spd-divider-h {{ step.name }}
      //- A step announces itself twice only where there IS something to teach
      //- first. Where every item is a table, one divider is the honest count.
      p.spd-divider-kind(v-if="step.items.length") {{ step.teaches ? $t('strategyPlanner.plan.discussionPoints') : $t('strategyPlanner.plan.actionPoints') }}

    //- 🔴 ONLY WHAT HAS SOMETHING TO TEACH GETS A TEACHING PAGE. The Action Plan is
    //- filled in, not taught, and printing a page with nothing but its title on it
    //- puts a blank slide in the middle of a document a client is shown.
    template(v-for="item in step.items")
      section.spd-page.is-teach(v-if="item.summary || item.prompts.length" :key="'t' + i + item.key")
        strategy-plan-mark(v-bind="markProps")
        p.spd-kind {{ $t('strategyPlanner.plan.teach') }}
        h3.spd-h {{ item.name }}
        //- 🔴 THE GRAPHIC, where the approved drawing puts it
        //- (`design/mockups/strategy-plan-output.html` p5). It carries the
        //- ADVISOR'S firm mark, which is why it is drawn by us rather than
        //- photographed from Mike's deck. A concept with no drawing yet prints
        //- the page without one rather than leaving a hole (item 15.7).
        strategy-concept-graphic(
          :concept-id="item.conceptId"
          :firm-name="firmName"
          :firm-colour="firmColour"
          :firm-logo="firmLogo"
        )
        //- 🔴 THE ADVISOR'S BLURB IS NOT THE CLIENT'S READING. `conceptSummary` is the
        //- CONCEPT SUMMARY column of the scope menu — what an advisor reads to decide
        //- whether to tick a concept ("This checklist guides you through a review
        //- of…"). It was printed under every teaching page, so a client's own plan
        //- carried the shopping-list description of the tool beneath Mike's page,
        //- which had already said it properly. Found by him reading the PDF,
        //- 2026-09-22. It is not in the approved drawing either
        //- (`design/mockups/strategy-plan-output.html` p5: Teach → title → HIS
        //- subtitle above the figure, nothing below it).
        //-
        //- ⚠ KEPT WHERE THERE IS NO DRAWING, and that is the whole of the condition.
        //- 32 concepts have one and do not need it; 11 do not, and for those this
        //- sentence is the only thing on the page — dropped there, the client loses
        //- the page entirely, because a title-only teaching page is refused above.
        //- It goes when their drawings land, not before.
        p.spd-lead(v-if="item.summary && !drawn(item)") {{ item.summary }}
        ul.spd-prompts(v-if="item.prompts.length")
          li(v-for="p in item.prompts" :key="p.key")
            b {{ p.label }}
            |  — {{ p.prompt }}

    section.spd-page.is-divider(v-if="step.teaches && step.works !== false" :key="'d2' + i")
      strategy-plan-mark(v-bind="markProps")
      p.spd-step {{ $t('strategyPlanner.plan.step', { n: i + 1 }) }}
      h3.spd-divider-h {{ step.name }}
      p.spd-divider-kind {{ $t('strategyPlanner.plan.actionPoints') }}

    //- 🔴 NO CAPTURE PAGE WHERE THERE IS NOTHING TO CAPTURE. A concept admitted on
    //- its drawing alone (Mike's ruling, 2026-09-20) has no fill-in table at all,
    //- and printing one would tell the client it was "not worked through yet" when
    //- there was never anything to work. Its teaching page stands alone.
    template(v-for="item in step.items")
      section.spd-page.is-capture(v-if="item.hasTable !== false" :key="'c' + i + item.key")
        strategy-plan-mark(v-bind="markProps")
        p.spd-kind {{ $t('strategyPlanner.plan.capture') }}
        h3.spd-h {{ item.name }}
        p.spd-instruct(v-if="item.instruction") {{ item.instruction }}
        //- ⚠ AND THE RESPONSE PAGE IS MISSING HERE TOO, for the same reason. Where
        //- the deck holds the fill-in table rather than a workbook — the Integration
        //- Tasks table, (Our) Revenue Streams, (Our) Volatility Graph Observations —
        //- the client used to see that page. ⚠ THE TEACHING GRAPHIC DOES NOT
        //- RESTORE IT — all 33 drawings are teaching pages, and this comment used
        //- to say otherwise. `responsePage` records which page each table is;
        //- drawing those five is item 15.11.
        //- 🔴 A TABLE NOBODY TOUCHED IS ONE SENTENCE, NOT TWO DOZEN EMPTY ROWS. The
        //- Action Plan alone is 24 boxes; printed blank they fill a page and say
        //- nothing. Mike's rule, 2026-09-17: "how could anyone gain value from
        //- having this repeated?" The page still prints — a step that was scoped and
        //- not worked is part of the record — it just says so in a line.
        p.spd-untouched(v-if="!hasAnswers(item)") {{ $t('strategyPlanner.plan.notWorked') }}

        //- 🔴 THE ORG CHART PRINTS AS A CHART, WITH THE LIST BENEATH IT — Decision E,
        //- ruled by Mike 2026-09-21. The chart is the thing his deck teaches and the
        //- thing a client recognises; the list beneath it is what makes the chart
        //- checkable and survives being read aloud or printed in black and white.
        //- ⚠ AND IT IS SCALED, NEVER CROPPED. His own example is 1628px wide at seven
        //- levels, which was the stated condition on that ruling.
        template(v-else-if="item.orgChart")
          strategy-org-chart(:roles="item.orgChart" fit)
          table.spd-org
            thead
              tr
                th.spd-org-n #
                //- "Role" and "Name" are the two ruled words of ours; the heading beside
                //- them is Mike's own, read off Org Chart.xlsx and carried here with the
                //- data rather than written on this page.
                th {{ $t('strategyPlanner.orgChart.role') }}
                th {{ $t('strategyPlanner.orgChart.person') }}
                th {{ item.orgChartHead }}
            tbody
              tr(v-for="(role, n) in item.orgChart" :key="role.id")
                td.spd-org-n {{ n + 1 }}
                td {{ role.name }}
                //- A role nobody is in yet is a real answer, not a gap — Decision B.
                td(:class="{ 'is-blank': !role.person }") {{ role.person || $t('strategyPlanner.plan.blank') }}
                td(:class="{ 'is-blank': !role.reportsTo }") {{ role.reportsTo || $t('strategyPlanner.orgChart.nobody') }}

        //- Where SOMETHING was captured, every box prints, filled or not: the blank
        //- ones are what the client has still to answer, and that is the plan
        //- expanding over time rather than a gap.
        dl.spd-lines(v-else)
          template(v-for="line in item.lines")
            dt(:key="line.key + 't'") {{ line.label }}
            dd(:key="line.key + 'd'" :class="{ 'is-blank': !line.value }") {{ line.value || $t('strategyPlanner.plan.blank') }}

  //- 🔴 THE CLOSING BLOCKS, PRINTED AFTER THE STEPS AND OUTSIDE THEM. Decision D,
  //- 2026-09-21, took Strategic Statements and the Action Plan off Build session, so
  //- they no longer sit inside a step the advisor named. They are still the two things
  //- the session produces, so the document prints them here as its own closing block —
  //- the ruling moved WHERE they are filed, never whether the client receives them.
  template(v-if="closing.length")
    section.spd-page.is-divider
      strategy-plan-mark(v-bind="markProps")
      p.spd-step {{ $t('strategyPlanner.rail.objectives') }}
      h3.spd-divider-h {{ $t('strategyPlanner.plan.closingHeading') }}

    template(v-for="item in closing")
      section.spd-page.is-capture(:key="'x' + item.key")
        strategy-plan-mark(v-bind="markProps")
        p.spd-kind {{ $t('strategyPlanner.plan.capture') }}
        h3.spd-h {{ item.name }}
        p.spd-instruct(v-if="item.instruction") {{ item.instruction }}
        p.spd-untouched(v-if="!hasAnswers(item)") {{ $t('strategyPlanner.plan.notWorked') }}
        dl.spd-lines(v-else)
          template(v-for="line in item.lines")
            dt(:key="line.key + 't'") {{ line.label }}
            dd(:key="line.key + 'd'" :class="{ 'is-blank': !line.value }") {{ line.value || $t('strategyPlanner.plan.blank') }}
</template>

<script>
/**
 * StrategyPlanDocument — the session, assembled into one document.
 *
 * 🔴 BUILT FROM THE APPROVED DRAWING, not from a shape of its own.
 * `design/mockups/strategy-plan-output.html` §3, approved by Mike 2026-09-17: one
 * continuous document of slide-shaped pages — front matter, then per step a
 * Discussion divider, its teaching pages, an Action divider, its capture pages. It
 * scrolls as one document on screen and is his deck page for page when printed.
 *
 * 🔴 ONE ARTEFACT, NEVER TWO FORMATS. His ruling on that page: a build that
 * produces a web report AND a separate exported deck has made two things that can
 * disagree. The page is a fixed frame from the start rather than a column squeezed
 * into one later, and the client's PDF is this document printed — never a second one
 * generated beside it.
 * ⚠ THAT SENTENCE WAS UNTRUE UNTIL 2026-09-21: no ratio was ever built, so the comment
 * described the approved drawing rather than the CSS beneath it.
 * 🔴 THE FRAME IS A4 LANDSCAPE, NOT 16:9 — Mike, 2026-09-21, superseding that half of
 * his 2026-09-17 ruling because the pages are printed on real paper. See `.spd-page`.
 *
 * ⚠ IT STORES NOTHING. Everything here is assembled from what the session already
 * holds, so the document can never disagree with the session behind it.
 *
 * Vue 2, Options API, Pug.
 */
import StrategyConceptGraphic from '~/components/strategy/StrategyConceptGraphic.vue'
import StrategyOrgChart from '~/components/strategy/StrategyOrgChart.vue'
import StrategyPlanMark from '~/components/strategy/StrategyPlanMark.vue'
import { hasConceptGraphic } from '~/components/strategy/concepts'

export default {
  name: 'StrategyPlanDocument',

  components: { StrategyConceptGraphic, StrategyOrgChart, StrategyPlanMark },

  props: {
    /** The client this plan belongs to. */
    clientName: {
      type: String,
      required: true
    },

    /** Which decks the session drew on, as one line. */
    decks: {
      type: String,
      default: ''
    },

    /** The advisor firm's name, printed beside the mark on every drawing. */
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

    /**
     * The steps the advisor named, each holding the concepts assigned to it.
     * A step with an empty `items` still prints — Pivot's step 5 has no slides
     * and is still on the agenda.
     *
     * @type {Array<{name: string, items: Array<object>}>}
     */
    steps: {
      type: Array,
      required: true,
      validator: s => Array.isArray(s) && s.every(x => x && typeof x.name === 'string' && Array.isArray(x.items))
    },

    /**
     * The two blocks that close every session — Strategic Statements and the Action Plan.
     *
     * 🔴 A SEPARATE PROP BECAUSE DECISION D (2026-09-21) TOOK THEM OUT OF THE STEPS. They
     * used to arrive inside whichever step the advisor filed them under; they are now
     * captured on Objectives & actions and printed here, after the steps, as the
     * document's own closing block. An empty list simply prints nothing.
     *
     * @type {Array<{key: string, name: string, instruction: string, lines: Array<object>}>}
     */
    closing: {
      type: Array,
      default: () => [],
      validator: c => Array.isArray(c) && c.every(x => x && typeof x.name === 'string' && Array.isArray(x.lines))
    }
  },

  computed: {
    /**
     * The firm's mark, bound once and spread onto every sheet — item 16.2.
     * @returns {{name: string, logo: string, colour: string}}
     */
    markProps () {
      return {
        name: this.firmName,
        logo: this.firmLogo,
        colour: this.firmColour,
        foot: this.runningFoot
      }
    },

    /**
     * The running foot beside the mark on every page but the title — the client and
     * what the document is, as the approved drawing carries it.
     * @returns {string} empty where there is no client, so a page never prints a
     *   lone separator.
     */
    runningFoot () {
      if (!this.clientName) { return '' }
      return this.clientName + ' · ' + this.$t('strategyPlanner.plan.sessionPlan')
    },

    /**
     * The page frame's colour, as a CSS custom property on the document root.
     * @returns {{'--spd-firm': string}} the firm's colour, which the border reads.
     *   Mike's ruling, 2026-09-22: the border returns in the advisor firm's colour.
     *   His own page uses Advisor-e's cyan there; on a client's document it is theirs.
     */
    frameStyle () {
      return { '--spd-firm': this.firmColour }
    }
  },

  methods: {
    /**
     * Does this concept have one of Mike's approved drawings on its teaching page?
     *
     * The one thing that decides whether the client also gets the advisor's summary
     * line beneath it — see the note beside `spd-lead` in the template.
     *
     * @param {{conceptId: string}} item
     * @returns {boolean}
     */
    drawn (item) {
      return hasConceptGraphic(item.conceptId)
    },

    /**
     * Did the session put anything into this concept's table?
     *
     * ⚠ THE ORG CHART ANSWERS THIS DIFFERENTLY, AND IT HAS TO. Its "lines" are role names
     * against who they report to, and the topmost role reports to nobody — so a chart of one
     * role has no line with a value in it and would have printed "not worked through yet"
     * with the client's own chart sitting above the sentence.
     *
     * @param {{lines: Array<{value: string}>, orgChart: ?Array}} item
     * @returns {boolean}
     */
    hasAnswers (item) {
      if (item.orgChart) { return item.orgChart.length > 0 }
      return (item.lines || []).some(l => l.value)
    }
  }
}
</script>

<style scoped>
.spd {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* A slide, not a column: 16:9 is the frame the deck is presented in. */
/* 🔴 AN A4 LANDSCAPE FRAME — RULED BY MIKE 2026-09-21: "the majority of pages to be
   printed will be A4 size."
   This SUPERSEDES the 16:9 half of his Decision 1 of 2026-09-17 on the approved drawing
   (design/mockups/strategy-plan-output.html), which is annotated with the change. What
   that decision actually settled is untouched and still governs: ONE artefact and never
   two formats, a fixed frame from the start rather than a reflowing column squeezed into
   one later. Only the ratio moved, and it moved because the paper is real.

   WHY IT IS NOT 16:9. A4 landscape is 297x210 (1.414); 16:9 is 1.778. A 16:9 page on an
   A4 sheet fills the width and leaves a fifth of the sheet blank along the bottom, on
   every page. Measured 2026-09-21: at 16:9, 15 of 25 pages sat at the frame; at A4, 24
   of 25 do, because a teaching page carrying one of the 33 drawings (each itself a full
   1500x844 slide) plus a heading and prompts naturally lands near 1.41, not near 1.78.

   ⚠ NO `overflow: hidden`, DELIBERATELY. The approved drawing's `.slide` carries it and
   can afford to: its example figures are short wide strips (300x108) drawn to leave room
   for text. The real drawings are whole deck pages, so clipping here would silently cut
   Mike's own teaching content off a client's document. A page whose content will not fit
   grows instead, and the one page in 25 that does is visible rather than truncated. */
/* 🔴 THE FRAME AND THE PAGE NUMBER ARE MIKE'S OWN DECK PAGE — item 16.2, drawn and
   approved at `design/mockups/strategy-plan-firm-mark.html`, measured off
   `Advance.6.Organisational Review.pdf` (720x405pt):
     border  inset 3.9pt (0.54% of width), bar 7.1pt (0.99%), SQUARE corners
     number  Calibri 9pt #888888 at x=660.7, y=382.8 — 91.76% / 94.52%
   His cyan #00B1E0 is replaced by the firm's colour, which is the whole of this item.
   The bottom border's two segments are made by the mark's own white plate sitting on
   the line — see `StrategyPlanMark.vue`.
   ⚠ ONE RECORDED DEVIATION FROM THE DRAWING: the drawing is his 16:9 page; these
   sheets stay `297/210` because A4 is his later ruling for THIS document
   (2026-09-21), measured — 24 of 25 pages sit at that frame. The border is expressed
   as a share of the page, so it holds at either ratio. */
/* ⚠ `border-width` DOES NOT ACCEPT PERCENTAGES — a percentage there is invalid and is
   dropped silently, leaving a 3px default. The bar is sized in container-query units
   instead, against `.spd`, which is the page's own width; the px value before it is the
   fallback for a browser without container queries. */
.spd { counter-reset: spdpage; container-type: inline-size; }

.spd-page {
  position: relative;
  counter-increment: spdpage;
  background: #fff;
  border: 8px solid var(--spd-firm, #0070c0);
  border-width: 0.986cqw;               /* 7.1 / 720 of his page */
  border-radius: 0;                     /* his corners are square */
  /* ⚠ THE FOOT MUST CLEAR THE MARK. The mark is absolutely positioned at the bottom of
     the sheet, and a page that outgrows its frame — which this component deliberately
     allows rather than clipping Mike's teaching content — put its last line underneath
     the firm's own logo. Seen by opening the app. */
  padding: 26px 30px;
  padding-bottom: 7cqw;
  aspect-ratio: 297 / 210;
  box-shadow: 0 8px 22px rgba(0, 43, 100, 0.06);
}

/* His page number, on every sheet, from the document's own counter. */
.spd-page::after {
  content: counter(spdpage);
  position: absolute;
  left: 91.764%;                        /* 660.7 / 720 */
  top: 94.519%;                         /* 382.8 / 405 */
  font-size: 12px;
  font-size: 1.25cqw;                   /* his 9pt */
  color: #888888;
}

/* The title page carries the mark at the top, so nothing interrupts its border and it
   needs no number — his own title page has none. */
.spd-page.is-title::after { content: none; }

/* 🔴 THE MARK'S WHITE PLATE IS A GAP IN THE BORDER, AND ONLY A WHITE SHEET HAS ONE.
   On the navy step dividers it rendered as a white rectangle floating over the dark
   page — found by opening the app, invisible to every assertion. There the border is
   the page's own edge, so the plate goes and the name knocks out to white.
   `.spm` is the child's ROOT element, so it carries this component's scope id and a
   plain descendant selector reaches it; its inner spans need `>>>`. */
.spd-page.is-divider .spm { background: none; padding: 0; }
.spd-page.is-divider >>> .spm-name { color: #fff; }

/* 🔴 DECISION A, RULED WITH THE DRAWING — A TEACHING PAGE CARRIES ONE FRAME AND ONE
   MARK, AND BOTH COME FROM THE DRAWING INSIDE IT. Each of the 33 concept drawings is a
   whole deck page and already carries this exact firm-coloured frame and the firm's
   mark. With the sheet drawing its own as well, a client saw TWO blue frames a few
   millimetres apart and the firm's mark TWICE on one page. Seen by opening the app;
   no assertion could see it.
   The border is kept at full width and made transparent rather than removed, so the
   content box does not shift between a teaching page and any other. */
.spd-page.is-teach { border-color: transparent; }
.spd-page.is-teach .spm { display: none; }
/* ⚠ AND IT RECLAIMS THE FOOT. The deep bottom padding exists to keep a growing page's
   last line out from under the mark — a teaching page has no mark, so the padding only
   pushed it over the sheet. Measured in a generated PDF: with it, one teaching page
   split across two sheets and a client's plan ran to 14 sheets instead of 13. */
.spd-page.is-teach { padding-bottom: 26px; }

/* 🔴 HIS TITLE PAGE, from Advance.6.Organisational Review.pdf: the mark centred at the
   top, then the title at y=200.4 of 405 (49.48%) and the subtitle at y=304.1 (75.09%),
   both centred, both Open Sans REGULAR — his title is not bold.
   Found by opening the app: with the text left-aligned at the top as it was, the mark
   landed underneath it in the middle of the sheet instead of leading the page. */
.spd-page.is-title { text-align: center; }
.spd-page.is-title .spd-kind { position: absolute; left: 0; right: 0; top: 43%; margin: 0; }
.spd-page.is-title .spd-title {
  position: absolute;
  left: 0;
  right: 0;
  top: 49.48%;
  font-size: 34px;
  font-size: 6.25cqw;            /* his 45pt of a 720-wide page */
  font-weight: 400;
}
.spd-page.is-title .spd-sub {
  position: absolute;
  left: 0;
  right: 0;
  top: 75.09%;
  margin: 0;
  font-size: 15px;
  font-size: 2.5cqw;             /* his 18pt */
}

.spd-kind {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin-bottom: 6px;
}

.spd-title {
  font-size: 30px;
  font-weight: 700;
  color: #002b64;
  margin: 0;
}

.spd-sub {
  color: #5b6f8a;
  margin-top: 6px;
}

/* 🔴 HIS PAGE HEADING — 24pt Open Sans REGULAR in #002B64 at x=25.4, y=21.3 of a
   720x405 page (Advance.6.Organisational Review.pdf). It was 21px bold, which is the
   app's own voice rather than his deck's, and it is the reason a printed plan still did
   not look like his pages once the border and the mark were on it. */
.spd-h {
  font-size: 18px;
  font-size: 3.333cqw;
  font-weight: 400;
  color: #002b64;
  margin: 0 0 10px;
}

.spd-lead {
  color: #23405f;
  margin-bottom: 10px;
}

.spd-agenda {
  padding-left: 0;
  list-style: none;
}

/* 🔴 HIS AGENDA IS TWO COLUMNS, NOT A NUMBERED LIST. On his own agenda page the item
   sits at x=42.7 and what it gets the client sits at x=352.7 of a 720-wide page — two
   aligned columns a client reads across, which is the whole point of the page. It was
   a decimal list with the count trailing the name inline; the approved drawing shows
   the two columns and this is what a side-by-side comparison found missing. */
.spd-agenda-item {
  list-style: none;
  color: #23405f;
  margin-bottom: 8px;
  display: grid;
  /* His bullet sits at x=30 and the item at x=42.7 of a 720-wide page. Measured against
     the built page the item was landing at 5.42%w against his 5.93%, so the bullet
     column is widened to put it on his mark. */
  grid-template-columns: 2.6% 46.0% 1fr;     /* his bullet, item and outcome columns */
  align-items: baseline;
}

.spd-agenda-item::before {
  content: '\2022';
  color: #23405f;
}

.spd-agenda-count,
.spd-agenda-none {
  color: #5b6f8a;
  font-size: 13.5px;
  margin-left: 0;
}

.spd-agenda-none {
  font-style: italic;
}

.is-divider {
  background: #002b64;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.spd-step {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9dc2e8;
}

.spd-divider-h {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 4px 0 0;
}

.spd-divider-kind {
  color: #9dc2e8;
  margin-top: 4px;
}

.spd-prompts {
  padding-left: 20px;
}

.spd-prompts li {
  list-style: disc;
  color: #23405f;
  margin-bottom: 8px;
}

.spd-prompts b {
  color: #002b64;
}

.spd-instruct {
  color: #0070c0;
  font-weight: 600;
  margin-bottom: 12px;
}

.spd-untouched {
  color: #8a97a8;
  font-style: italic;
}

.spd-lines dt {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
  margin-top: 12px;
}

.spd-lines dd {
  color: #23405f;
  margin: 2px 0 0;
}

.spd-lines dd.is-blank {
  color: #aab6c4;
  font-style: italic;
}

/* The list beneath the chart — Decision E. Plain and printable: it is what makes the
   drawn chart checkable when the page is read aloud or printed in black and white. */
.spd-org {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
}

.spd-org th {
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
  border-bottom: 1px solid #d5e1ee;
  padding: 0 8px 5px;
}

.spd-org td {
  color: #23405f;
  border-bottom: 1px solid #eef3f9;
  padding: 5px 8px;
}

.spd-org .spd-org-n {
  width: 44px;
  color: #8a97a8;
}

.spd-org td.is-blank {
  color: #aab6c4;
  font-style: italic;
}

/* ⚠ THE A4 SHEET SIZING IS NOT HERE. It has to be gated on `body.sp-printing`, and a
   scoped rule cannot name `body` — so it lives in the unscoped block at the foot of
   `pages/strategy-planner.vue`, beside the `@page` that decides the sheet. These three
   are safe to apply to any print because they only ever remove screen decoration. */
@media print {
  .spd-page {
    box-shadow: none;
    page-break-after: always;

    /* 🔴 `border: 0` USED TO LIVE HERE AND IT STRIPPED THE FIRM'S BRANDING OFF THE ONE
       OUTPUT THAT MATTERS. It was right when the border was a grey hairline that only
       separated pages on screen; since item 16.2 the border IS the advisor firm's mark
       on a document the client keeps, so removing it in print removed the whole point.
       Found 2026-09-22 — Mike: "the pdfs do not show the changes - why?" */

    /* And without this a browser drops every background colour when printing, which
       takes the initials disc, the navy step dividers and the white plate that makes
       the gap in his bottom border. `DashboardReportPage.vue` already does this for
       the Business Performance Report; the plan did not. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

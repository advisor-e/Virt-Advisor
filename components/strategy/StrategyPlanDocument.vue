<template lang="pug">
article.spd
  //- FRONT MATTER — the first three pages of Pivot: title, the session objective,
  //- then the agenda. The agenda lists every step the advisor named, including one
  //- with nothing in it: a step is a thing he names, not a container the ticks make.
  section.spd-page.is-title
    p.spd-kind {{ $t('strategyPlanner.plan.sessionPlan') }}
    h2.spd-title {{ clientName }}
    p.spd-sub(v-if="decks") {{ decks }}

  section.spd-page.is-agenda
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
      p.spd-step {{ $t('strategyPlanner.plan.step', { n: i + 1 }) }}
      h3.spd-divider-h {{ step.name }}
      p.spd-divider-kind {{ $t('strategyPlanner.plan.actionPoints') }}

    //- 🔴 NO CAPTURE PAGE WHERE THERE IS NOTHING TO CAPTURE. A concept admitted on
    //- its drawing alone (Mike's ruling, 2026-09-20) has no fill-in table at all,
    //- and printing one would tell the client it was "not worked through yet" when
    //- there was never anything to work. Its teaching page stands alone.
    template(v-for="item in step.items")
      section.spd-page.is-capture(v-if="item.hasTable !== false" :key="'c' + i + item.key")
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
      p.spd-step {{ $t('strategyPlanner.rail.objectives') }}
      h3.spd-divider-h {{ $t('strategyPlanner.plan.closingHeading') }}

    template(v-for="item in closing")
      section.spd-page.is-capture(:key="'x' + item.key")
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
import { hasConceptGraphic } from '~/components/strategy/concepts'

export default {
  name: 'StrategyPlanDocument',

  components: { StrategyConceptGraphic, StrategyOrgChart },

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

    /** The firm's colour, as a CSS colour. */
    firmColour: {
      type: String,
      default: '#0070c0'
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
.spd-page {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 26px 30px;
  aspect-ratio: 297 / 210;
  box-shadow: 0 8px 22px rgba(0, 43, 100, 0.06);
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

.spd-h {
  font-size: 21px;
  font-weight: 700;
  color: #002b64;
  margin: 0 0 10px;
}

.spd-lead {
  color: #23405f;
  margin-bottom: 10px;
}

.spd-agenda {
  padding-left: 20px;
}

.spd-agenda-item {
  list-style: decimal;
  color: #23405f;
  margin-bottom: 8px;
}

.spd-agenda-count,
.spd-agenda-none {
  color: #5b6f8a;
  font-size: 13.5px;
  margin-left: 8px;
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
    border: 0;
  }
}
</style>

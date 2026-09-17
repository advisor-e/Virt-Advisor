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
        p.spd-lead(v-if="item.summary") {{ item.summary }}
        ul.spd-prompts(v-if="item.prompts.length")
          li(v-for="p in item.prompts" :key="p.key")
            b {{ p.label }}
            |  — {{ p.prompt }}

    section.spd-page.is-divider(v-if="step.teaches" :key="'d2' + i")
      p.spd-step {{ $t('strategyPlanner.plan.step', { n: i + 1 }) }}
      h3.spd-divider-h {{ step.name }}
      p.spd-divider-kind {{ $t('strategyPlanner.plan.actionPoints') }}

    template(v-for="item in step.items")
      section.spd-page.is-capture(:key="'c' + i + item.key")
        p.spd-kind {{ $t('strategyPlanner.plan.capture') }}
        h3.spd-h {{ item.name }}
        p.spd-instruct(v-if="item.instruction") {{ item.instruction }}
        //- 🔴 A TABLE NOBODY TOUCHED IS ONE SENTENCE, NOT TWO DOZEN EMPTY ROWS. The
        //- Action Plan alone is 24 boxes; printed blank they fill a page and say
        //- nothing. Mike's rule, 2026-09-17: "how could anyone gain value from
        //- having this repeated?" The page still prints — a step that was scoped and
        //- not worked is part of the record — it just says so in a line.
        p.spd-untouched(v-if="!hasAnswers(item)") {{ $t('strategyPlanner.plan.notWorked') }}

        //- Where SOMETHING was captured, every box prints, filled or not: the blank
        //- ones are what the client has still to answer, and that is the plan
        //- expanding over time rather than a gap.
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
 * disagree. The page is a slide-shaped frame from the start rather than a column
 * squeezed into one later.
 *
 * ⚠ IT STORES NOTHING. Everything here is assembled from what the session already
 * holds, so the document can never disagree with the session behind it.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyPlanDocument',

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
    }
  },

  methods: {
    /**
     * Did the session put anything into this concept's table?
     *
     * @param {{lines: Array<{value: string}>}} item
     * @returns {boolean}
     */
    hasAnswers (item) {
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
.spd-page {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 26px 30px;
  min-height: 260px;
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

@media print {
  .spd-page {
    box-shadow: none;
    page-break-after: always;
    border: 0;
  }
}
</style>

<template lang="pug">
.soc(:class="{ 'is-fit': fit }")
  svg(
    v-if="chart.boxes.length"
    :width="fit ? '100%' : chart.width"
    :height="fit ? null : chart.height"
    :viewBox="chart.viewBox"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="$t('strategyPlanner.orgChart.chartLabel')"
  )
    //- Connectors first, so a box always sits on top of the line that reaches it.
    path(
      v-for="link in chart.links"
      :key="link.id"
      :d="link.d"
      fill="none"
      stroke="#9DB6CE"
      stroke-width="1.6"
      :stroke-dasharray="link.kind === 'outside' ? '5 4' : null"
    )

    //- A role somebody named as a Reporting Head that is not itself a role — his own
    //- Shareholders. Drawn above the chart, never treated as an error.
    g(v-for="box in outsideBoxes" :key="box.id")
      rect(
        :x="box.x" :y="box.y" :width="boxW" :height="boxH" rx="9"
        fill="#F4F8FC" stroke="#9DB6CE" stroke-width="1.2" stroke-dasharray="5 4"
      )
      text(
        :x="box.x + textMid" :y="box.y + 25" text-anchor="middle"
        font-family="Open Sans, sans-serif" font-size="12.5" font-weight="600" fill="#41607F"
      ) {{ box.name }}
      text(
        :x="box.x + textMid" :y="box.y + 40" text-anchor="middle"
        font-family="Open Sans, sans-serif" font-size="10.5" fill="#7A93AD"
      ) {{ $t('strategyPlanner.orgChart.outsideNote') }}

    //- 🔴 THE ROLE, AND THE PERSON IN IT — Decisions A and B, ruled 2026-09-21. A role with
    //- nobody in it centres its title and prints no invented word beneath it.
    g(v-for="box in roleBoxes" :key="box.id")
      rect(
        :x="box.x" :y="box.y" :width="boxW" :height="boxH" rx="9"
        :fill="band(box).fill"
      )
      text(
        :x="box.x + textMid"
        :y="box.y + (box.person ? textRole : textRoleAlone)"
        text-anchor="middle"
        font-family="Open Sans, sans-serif" font-size="12.5" font-weight="700"
        :fill="band(box).role"
      ) {{ box.name }}
      text(
        v-if="box.person"
        :x="box.x + textMid" :y="box.y + textPerson" text-anchor="middle"
        font-family="Open Sans, sans-serif" font-size="11"
        :fill="band(box).person"
      ) {{ box.person }}
</template>

<script>
/**
 * StrategyOrgChart — the chart the advisor's list draws.
 *
 * 🔴 ONE COMPONENT, TWO PLACES, SO THEY CANNOT DISAGREE. The advisor watches this chart
 * build as they type (`StrategyOrgChartBuilder`) and the client receives the same chart in
 * their plan (`StrategyPlanDocument`) — Decision E of 2026-09-21: *"the client's plan carries
 * the drawn chart, with the list of roles beneath it."* Drawing it twice is how a screen and
 * a document start telling a client two different things.
 *
 * 🔴 BUILT FROM `design/mockups/strategy-capture-org-chart-redrawn.html`, approved
 * 2026-09-21 with all five of its decisions ruled. **That drawing's chart IS this code's
 * output** — the generator calls `layout()` and renders what comes back, so there is no
 * copy to drift. `tests/unit/orgChart.test.js` lays the two against each other box by box.
 *
 * ⚠ IT REPLACED A CHART WHERE EVERY BOX WAS THE SAME PALE OUTLINE, which is what Mike meant
 * by *"it looks boring - lacks colour and is not engaging - looks very cheap"*. Depth is the
 * one thing an org chart exists to show and nothing on the old one showed it.
 *
 * `fit` IS DECISION E's WARNING MADE REAL. His own example is 1904px wide at 7 levels, so
 * the plan page scales the chart rather than cropping it: `width="100%"` against a fixed
 * viewBox. On the builder the chart keeps its true size and the panel scrolls sideways.
 *
 * Vue 2, Options API, Pug. No DOM access at all.
 */
import {
  layout, bandFor, BOX_W, BOX_H, TEXT_ROLE, TEXT_ROLE_ALONE, TEXT_PERSON, TEXT_MID
} from '~/utils/orgChart'

export default {
  name: 'StrategyOrgChart',

  props: {
    /**
     * The roles, in the advisor's own order.
     * @type {Array<{id: number, name: string, person: string, reportsTo: string}>}
     */
    roles: {
      type: Array,
      default: () => [],
      validator: r => Array.isArray(r)
    },

    /** Scale to the page width instead of keeping the chart's true size. */
    fit: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    /** @returns {number} */
    boxW () { return BOX_W },

    /** @returns {number} */
    boxH () { return BOX_H },

    /** @returns {number} */
    textRole () { return TEXT_ROLE },

    /** @returns {number} */
    textRoleAlone () { return TEXT_ROLE_ALONE },

    /** @returns {number} */
    textPerson () { return TEXT_PERSON },

    /** @returns {number} */
    textMid () { return TEXT_MID },

    /**
     * The boxes and connectors, recomputed whenever a role changes.
     * @returns {object}
     */
    chart () {
      return layout(this.roles)
    },

    /** @returns {Array<object>} the dashed parents above the chart */
    outsideBoxes () {
      return this.chart.boxes.filter(b => b.kind === 'outside')
    },

    /** @returns {Array<object>} everything the advisor typed */
    roleBoxes () {
      return this.chart.boxes.filter(b => b.kind !== 'outside')
    }
  },

  methods: {
    /**
     * The colour band for a box, by how far down the organisation it sits.
     * @param {{depth: number}} box
     * @returns {{fill: string, role: string, person: string}}
     */
    band (box) {
      return bandFor(box.depth)
    }
  }
}
</script>

<style scoped>
/* The panel from the drawing: a bordered card that scrolls sideways rather than
   shrinking the chart, because a 7-level chart is 1904px wide. */
.soc {
  overflow-x: auto;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 22px 20px;
  background: linear-gradient(180deg, #fbfdff, #fff);
  box-shadow: 0 6px 18px rgba(0, 43, 100, 0.06);
}

.soc svg {
  display: block;
}

/* In the client's plan there is nowhere to scroll — a printed page cannot — so the
   chart scales down to the page instead. Decision E's stated condition. */
.soc.is-fit {
  overflow-x: visible;
  box-shadow: none;
  border: 0;
  padding: 0;
}
</style>

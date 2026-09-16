<template lang="pug">
.sss
  section.sss-section
    h4.sss-h {{ $t('strategyPlanner.scope.domainsHeading') }}
    p.sss-cap {{ $t('strategyPlanner.scope.domainsCaption') }}

    .sss-domains
      button.sss-domain(
        v-for="domain in planningDomains"
        :key="domain.id"
        type="button"
        :class="{ 'is-open': openDomain === domain.id, 'is-empty': domain.frameworkCount === 0 }"
        :aria-expanded="openDomain === domain.id ? 'true' : 'false'"
        @click="toggleDomain(domain)"
      )
        span.sss-domain-name {{ domain.name }}
        span.sss-domain-desc {{ domain.description }}
        span.sss-domain-count {{ countLabel(domain) }}

  //- The Session Scope table — Mike's own, from ADV.0 Planning Outcomes. The app is not
  //- inventing a menu; it is putting his on a screen.
  section.sss-section(v-if="openDomainRecord")
    h4.sss-h {{ $t('strategyPlanner.scope.chooseHeading', { domain: openDomainRecord.name }) }}
    p.sss-cap {{ $t('strategyPlanner.scope.chooseCaption') }}

    p.sss-empty(v-if="!visibleFrameworks.length") {{ $t('strategyPlanner.scope.noneYet') }}

    .table-container(v-else)
      table.table.is-fullwidth.sss-table
        thead
          tr
            th {{ $t('strategyPlanner.scope.colFramework') }}
            th {{ $t('strategyPlanner.scope.colExplores') }}
            th {{ $t('strategyPlanner.scope.colHelps') }}
            th.sss-inc {{ $t('strategyPlanner.scope.colInclude') }}
        tbody
          tr(v-for="framework in visibleFrameworks" :key="framework.id")
            td.sss-name {{ framework.name }}
            //- The deck's own Session Scope line, NOT the long coaching summary — Mike's
            //- ruling of 2026-09-16 after laying the build beside the approved drawing.
            //- The coaching summary is on the framework card, where it is read in session.
            td {{ framework.explores || framework.conceptSummary }}
            td {{ framework.helpsClientTo }}
            td.sss-inc
              b-checkbox(
                :value="isIncluded(framework.id)"
                :native-value="framework.id"
                @input="toggleFramework(framework.id)"
              )
                span.is-sr-only {{ framework.name }}

  p.sss-chosen {{ $t('strategyPlanner.scope.chosenCount', { count: chosen.length }) }}
</template>

<script>
/**
 * StrategySessionScope — screen 1 of the Strategy Planner: what this session covers.
 *
 * Item 15.1. Design: `design/mockups/strategy-planner.html`, screen 1.
 *
 * 🔴 THIS RENDERS MIKE'S OWN SESSION SCOPE TABLE, from ADV.0 Planning Outcomes —
 * Framework · Concept Summary · Helps Your Client To… · Include (Yes/No). The app is not
 * inventing a menu; it is putting his on a screen. The first three columns are authored
 * content the backend joins from the domain support files.
 *
 * 🔴 NOTHING IS PRE-TICKED — DECISION 1, ruled by Mike 2026-09-16. The engine's diagnosis
 * is shown elsewhere on the page but ticks nothing on the advisor's behalf, because his
 * deck makes deciding the scope part of the session, and a suggestion the advisor has to
 * undo in front of a client costs more than a blank column costs to fill in.
 *
 * ⚠ A DOMAIN WITH NO FRAMEWORKS STAYS ON SCREEN, showing zero. Organisational Review and
 * Sales & Marketing Review are authored in the other two domain support files and have not
 * reached the Planner yet. Hiding them would make the session look complete when half of
 * it is missing.
 */
export default {
  name: 'StrategySessionScope',

  props: {
    /** `{ id, name, description, frameworkCount }` from the backend, in the deck's order. */
    planningDomains: { type: Array, required: true },
    /** Every framework the Planner holds, joined to its concept text. */
    frameworks: { type: Array, required: true },
    /** The framework ids ticked so far. */
    chosen: { type: Array, default: () => [] }
  },

  data () {
    return {
      /** Which domain's Session Scope table is open. Null until the advisor picks one. */
      openDomain: null
    }
  },

  computed: {
    /** @returns {object|null} */
    openDomainRecord () {
      return this.planningDomains.find(d => d.id === this.openDomain) || null
    },

    /** @returns {object[]} the open domain's frameworks, in authored order */
    visibleFrameworks () {
      if (!this.openDomain) { return [] }
      return this.frameworks.filter(
        // 🔴 A CLOSING FRAMEWORK IS NEVER TICKABLE — every session already gets it. The
        // route excludes them too; this is the second of two guards, because a closer
        // shown here reads as an ordinary choice and ticking it would do nothing.
        f => !f.closesTheSession &&
          Array.isArray(f.planningDomains) && f.planningDomains.includes(this.openDomain)
      )
    }
  },

  methods: {
    /**
     * @param {object} domain
     * @returns {string}
     */
    countLabel (domain) {
      // ⚠ `$tc`, NOT `$t` — the first build said "1 frameworks" on the Business Targets
      // card, which no test saw and which was obvious the moment the page was opened.
      return domain.frameworkCount === 0
        ? this.$t('strategyPlanner.scope.countNone')
        : this.$tc('strategyPlanner.scope.count', domain.frameworkCount, {
          count: domain.frameworkCount
        })
    },

    /** @param {object} domain */
    toggleDomain (domain) {
      this.openDomain = this.openDomain === domain.id ? null : domain.id
    },

    /**
     * @param {string} id
     * @returns {boolean}
     */
    isIncluded (id) {
      return this.chosen.includes(id)
    },

    /**
     * Tick or untick one framework.
     * Payload: the full array of chosen framework ids, so the parent holds one source of
     * truth and this component stays presentational.
     * @param {string} id
     */
    toggleFramework (id) {
      const next = this.isIncluded(id)
        ? this.chosen.filter(x => x !== id)
        : this.chosen.concat([id])
      this.$emit('scope-changed', next)
    }
  }
}
</script>

<style scoped>
.sss-section { margin-bottom: 1.4rem; }
.sss-h { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.2rem; color: #002b64; }
.sss-cap { font-size: 0.8rem; color: #5b6f8a; margin: 0 0 0.7rem; max-width: 80ch; }

.sss-domains {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}
.sss-domain {
  display: block;
  width: 100%;
  text-align: left;
  font-family: inherit;
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  background: #f1f6fb;
  cursor: pointer;
}
.sss-domain:focus-visible { outline: 2px solid #00b1e0; outline-offset: 2px; }
.sss-domain.is-open { background: #eefaf0; border-color: #a8dcb4; }
.sss-domain.is-empty { opacity: 0.75; }
.sss-domain-name { display: block; font-weight: 700; font-size: 0.85rem; color: #002b64; }
.sss-domain-desc {
  display: block;
  font-size: 0.78rem;
  color: #5b6f8a;
  margin: 0.15rem 0 0.4rem;
}
.sss-domain-count { display: block; font-size: 0.75rem; font-weight: 600; color: #0070c0; }
.sss-domain.is-open .sss-domain-count { color: #2f7d32; }

.sss-table { font-size: 0.8rem; }
.sss-table th {
  font-size: 0.66rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #5b6f8a;
}
.sss-name { font-weight: 600; color: #002b64; }
.sss-inc { text-align: center; white-space: nowrap; }
.sss-empty { font-size: 0.8rem; color: #5b6f8a; }
.sss-chosen { font-size: 0.8rem; font-weight: 600; color: #002b64; }

@media (max-width: 860px) {
  .sss-domains { grid-template-columns: 1fr; }
}
</style>

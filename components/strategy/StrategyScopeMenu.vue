<template lang="pug">
.ssm
  //- The chrome: what this session is, and how much of the menu is in it.
  .ssm-chrome
    b.ssm-title {{ $t('strategyPlanner.menu.heading') }}
    span.ssm-who(v-if="sessionLabel") {{ sessionLabel }}
    span.ssm-count {{ $t('strategyPlanner.menu.includedOf', { chosen: chosen.length, total: totalConcepts }) }}

  .ssm-bar
    span.ssm-hint {{ $t('strategyPlanner.menu.hint') }}

  p.ssm-empty(v-if="!decks.length") {{ $t('strategyPlanner.menu.noneLoaded') }}

  //- One panel per DOCUMENT, in Mike's order. Ticks cross freely between them: Pivot takes
  //- nine concepts from one deck and two from another.
  section.ssm-deck(v-for="deck in decks" :key="deck.id")
    .ssm-deckhead
      b.ssm-deckname {{ deck.name }}
      span.ssm-domain {{ $t('strategyPlanner.menu.domainBadge', { domain: deck.planningDomainName }) }}
      span.ssm-src {{ deck.sourceLabel }}
      span.ssm-deckcount {{ $t('strategyPlanner.menu.includedOf', { chosen: chosenInDeck(deck), total: deck.conceptCount }) }}

    //- Decision B, shown rather than silently rendered as blank columns.
    .ssm-nodesc(v-if="deck.rowSource === 'agenda'") {{ $t('strategyPlanner.menu.agendaOnly') }}

    .ssm-tablewrap
      table.table.is-fullwidth.ssm-table
        thead
          tr
            th.ssm-tick {{ $t('strategyPlanner.menu.colInclude') }}
            th.ssm-pg {{ $t('strategyPlanner.menu.colPage') }}
            th {{ $t('strategyPlanner.menu.colFramework') }}
            th {{ $t('strategyPlanner.menu.colSummary') }}
            th {{ $t('strategyPlanner.menu.colHelps') }}
        tbody
          tr(
            v-for="concept in deck.concepts"
            :key="concept.id"
            :class="{ 'is-included': isIncluded(concept.id) }"
          )
            td.ssm-tick
              b-checkbox(
                :value="isIncluded(concept.id)"
                :native-value="concept.id"
                @input="toggle(concept.id)"
              )
                span.is-sr-only {{ concept.name }}

            //- An agenda row has no page of its own — the number on the record is the
            //- agenda slide, which the panel heading already names.
            td.ssm-pg {{ deck.rowSource === 'agenda' ? '—' : concept.page }}

            //- An agenda row is name-only (Decision B), so the name takes the three columns
            //- rather than leaving two empty cells that read as missing data.
            template(v-if="deck.rowSource === 'agenda'")
              td.ssm-name(colspan="3")
                | {{ concept.name }}
                span.ssm-sub(v-if="concept.conceptSummary") {{ concept.conceptSummary }}

            template(v-else)
              td.ssm-name
                | {{ concept.name }}
                span.ssm-shared(v-if="sharedNote(concept)" :title="sharedNote(concept)") {{ $t('strategyPlanner.menu.sharedCell') }}
              td {{ concept.conceptSummary }}
              td {{ concept.helpsClientTo }}

  .ssm-foot
    //- ⚠ `$tc`, NOT `$t`. The first build of the screen this replaced said "1 frameworks",
    //- which no test saw and which was obvious the moment a browser was pointed at it.
    span.ssm-sum {{ $tc('strategyPlanner.menu.totalIncluded', chosen.length, { count: chosen.length }) }}
    span.ssm-rest {{ $t('strategyPlanner.menu.totalRest', { count: totalConcepts - chosen.length }) }}

  //- 🔴 THE SCREEN SAYS WHAT COMES NEXT, AND THAT ITS WORK IS KEPT.
  //- ⚠ IT USED TO SAY THE OPPOSITE — "nothing typed is kept yet" — written while stages 2
  //- to 5 were unbuilt and left standing after they shipped. An advisor was being told his
  //- work would be lost when it would not, which is worse than saying nothing: the honest
  //- reading is to stop using the screen. Corrected 2026-09-20 on Mike's ruling, found by
  //- walking the journey rather than by any test.
  .ssm-stage {{ $t('strategyPlanner.menu.stageNotice') }}
</template>

<script>
/**
 * StrategyScopeMenu — the INPUT screen of the Strategy Planner: which of the 52 concepts
 * this session covers.
 *
 * Item 15.1, Stage 1. Approved artefact:
 * `design/mockups/strategy-session-menu.html`, five decisions ruled by Mike 2026-09-17.
 *
 * 🔴 THIS SCREEN IS MIKE'S OWN SESSION SCOPE TABLE WITH THE INCLUDE COLUMN MADE REAL —
 * Decision A. Same column order, same words. Every row's text is his, read off his decks by
 * machine; this component renders it and never rewrites, summarises, truncates or fills a
 * blank one. A build that improves the wording has broken the ruling.
 *
 * ⚠ THE PAGE NUMBERS ARE HIS ONLY WHERE HE GIVES THEM (found 2026-09-18). Strategic
 * Orientation 2's scope table carries a page column — those numbers are his. Sales &
 * Marketing's table has three columns and NO page column, so its 16 numbers are OURS,
 * derived from the deck. They are accurate, and every drawing checked so far confirms it;
 * this note exists so nobody hunts for a column of his to reconcile them against.
 *
 * 🔴 FIVE PANELS, ONE LIST, TICKS CROSSING FREELY. The panels are documents, not Planning
 * Domains: Strategic Orientation is one domain in two decks. The acceptance test —
 * `Pivot.pdf` — takes nine concepts from Strategic Orientation 2 and two from Sales &
 * Marketing, so a menu that made an advisor open one panel at a time could not produce it.
 * That is precisely what the superseded `StrategySessionScope` did.
 *
 * ⚠ NOTHING IS PRE-TICKED HERE, and that is not Decision C being ignored. The AI
 * pre-tick is Stage 6 and is not built; the drawing's "Suggest for this client" button is
 * deliberately absent rather than present and dead. Recorded as a named deviation in the
 * Brief §0.
 *
 * ⚠ AN EMPTY DESCRIPTION IS NOT A GAP TO FILL. Decision B: three of the five documents are
 * agendas with no Concept Summary and no Helps Your Client To… line. Those rows render
 * name-only with the panel saying why. Nothing may write those columns but Mike.
 */
export default {
  name: 'StrategyScopeMenu',

  props: {
    /**
     * The five panels from `GET /api/strategy/concepts`, in Mike's order — never sorted
     * here. `{ id, name, planningDomainName, sourceLabel, rowSource, conceptCount,
     * concepts }`.
     */
    decks: { type: Array, required: true },

    /** The concept ids ticked so far. */
    chosen: { type: Array, default: () => [] },

    /** Optional "client · session type, date" line for the chrome. */
    sessionLabel: { type: String, default: '' }
  },

  computed: {
    /** @returns {number} every concept the menu offers, across all five panels */
    totalConcepts () {
      return this.decks.reduce((n, deck) => n + (deck.conceptCount || 0), 0)
    }
  },

  methods: {
    /**
     * @param {string} id a concept id
     * @returns {boolean}
     */
    isIncluded (id) {
      return this.chosen.includes(id)
    },

    /**
     * @param {object} deck
     * @returns {number} how many of this panel's rows are ticked
     */
    chosenInDeck (deck) {
      return (deck.concepts || []).filter(c => this.isIncluded(c.id)).length
    },

    /**
     * Why a row is marked as sharing a cell, or null when it holds its own text.
     *
     * Decision E: the decks merge three cells, and the second row points at the first
     * rather than copying it. Anyone about to edit one of these has to be told, or one
     * row's edit silently rewrites its neighbour.
     *
     * @param {object} concept
     * @returns {string|null}
     */
    sharedNote (concept) {
      const summaryWith = concept.conceptSummarySharedWith
      const helpsWith = concept.helpsClientToSharedWith
      const other = [summaryWith, helpsWith].find(id => id && id !== concept.id)
      if (other) {
        const name = this.nameOf(other)
        return this.$t('strategyPlanner.menu.sharedWithRow', { row: name })
      }
      // Drafting Tender Proposals: the deck puts one sentence in both of its own columns.
      if (summaryWith || helpsWith) {
        return this.$t('strategyPlanner.menu.sharedBothColumns')
      }
      return null
    },

    /**
     * @param {string} id
     * @returns {string} the concept's name, or its id if it is not on this menu
     */
    nameOf (id) {
      for (let i = 0; i < this.decks.length; i++) {
        const found = (this.decks[i].concepts || []).find(c => c.id === id)
        if (found) { return found.name }
      }
      return id
    },

    /**
     * Tick or untick one concept.
     * Payload: the full array of chosen concept ids, so the parent holds one source of
     * truth and this component stays presentational.
     * @param {string} id
     */
    toggle (id) {
      const next = this.isIncluded(id)
        ? this.chosen.filter(x => x !== id)
        : this.chosen.concat([id])
      this.$emit('scope-changed', next)
    }
  }
}
</script>

<style scoped>
.ssm {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  overflow: hidden;
}

.ssm-chrome {
  background: #002b64;
  color: #fff;
  padding: 0.8rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.1rem;
  align-items: baseline;
}
.ssm-title { font-size: 0.95rem; color: #fff; }
.ssm-who { font-size: 0.78rem; opacity: 0.82; }
.ssm-count {
  margin-left: auto;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
  font-variant-numeric: tabular-nums;
}

.ssm-bar {
  padding: 0.7rem 1.1rem;
  border-bottom: 1px solid #d5e1ee;
  background: #f1f6fb;
}
.ssm-hint { font-size: 0.76rem; color: #5b6f8a; }

.ssm-deck { border-bottom: 1px solid #d5e1ee; }
.ssm-deckhead {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  align-items: baseline;
  padding: 0.75rem 1.1rem;
  background: #f7fafd;
}
.ssm-deckname { font-size: 0.9rem; color: #002b64; }
.ssm-domain {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0070c0;
  background: #e6f2fb;
  border: 1px solid #bcdcf6;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
}
.ssm-src { font-size: 0.75rem; color: #5b6f8a; }
.ssm-deckcount {
  margin-left: auto;
  font-size: 0.75rem;
  color: #5b6f8a;
  font-variant-numeric: tabular-nums;
}

.ssm-nodesc {
  padding: 0.6rem 1.1rem;
  font-size: 0.76rem;
  color: #8a5a00;
  background: #fdf1e0;
  border-top: 1px solid #f0cf9a;
}

.ssm-tablewrap { overflow-x: auto; }
.ssm-table { font-size: 0.8rem; margin-bottom: 0; min-width: 760px; }
.ssm-table th {
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
  white-space: nowrap;
}
.ssm-table td { vertical-align: top; }
.ssm-table tr.is-included { background: #f2f9ee; }
.ssm-tick { width: 42px; }
.ssm-pg {
  width: 48px;
  color: #5b6f8a;
  font-variant-numeric: tabular-nums;
}
.ssm-name { font-weight: 600; color: #002b64; }
.ssm-sub {
  display: block;
  font-weight: 400;
  color: #5b6f8a;
  font-size: 0.76rem;
  margin-top: 0.1rem;
}
.ssm-shared {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a5a00;
  background: #fdf1e0;
  border: 1px solid #f0cf9a;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  vertical-align: 1px;
}

.ssm-foot {
  padding: 0.8rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  background: #f1f6fb;
}
.ssm-sum { font-size: 0.8rem; font-weight: 600; color: #002b64; }
.ssm-rest { font-size: 0.76rem; color: #5b6f8a; }

.ssm-stage {
  padding: 0.7rem 1.1rem;
  font-size: 0.76rem;
  color: #8a5a00;
  background: #fdf1e0;
  border-top: 1px solid #f0cf9a;
}

.ssm-empty { padding: 1.1rem; font-size: 0.8rem; color: #5b6f8a; }
</style>

<template lang="pug">
.ssm
  //- The chrome: what this session is, and how much of the menu is in it.
  .ssm-chrome
    b.ssm-title {{ $t('strategyPlanner.menu.heading') }}
    span.ssm-who(v-if="sessionLabel") {{ sessionLabel }}
    span.ssm-count {{ $t('strategyPlanner.menu.includedOf', { chosen: chosen.length, total: totalConcepts }) }}

  //- Decision C's button. It proposes; it never applies. `suggesting` disables it so a
  //- second press cannot race the first.
  //- 🔴 AND `clientChosen` DISABLES IT UNTIL THERE IS A CLIENT TO SUGGEST FOR. Found by
  //- opening the screen, 2026-09-22: the button was live with no client selected and
  //- pressing it did nothing at all — no message, no error — because the page's handler
  //- gives up silently without one. It now greys out exactly as "Build the session" does
  //- two inches away, which is the same condition for the same reason.
  .ssm-bar
    b-button.ssm-suggest(
      type="is-primary"
      size="is-small"
      :loading="suggesting"
      :disabled="suggesting || !decks.length || !clientChosen"
      @click="$emit('suggest-requested')"
    ) {{ $t('strategyPlanner.menu.suggestButton') }}
    span.ssm-hint(v-if="suggesting") {{ $t('strategyPlanner.menu.suggestRunning') }}
    span.ssm-hint(v-else) {{ $t('strategyPlanner.menu.hint') }}

  //- 🔴 THE BAR SAYS WHAT WAS PROPOSED, NEVER WHAT IS INCLUDED. Decision C(a): the count
  //- in the chrome above follows the ticks. This line follows the suggestion, and the two
  //- are allowed to disagree — that disagreement is the advisor's judgement, shown.
  .ssm-sugg(v-if="suggestState === 'ok'")
    | {{ $tc('strategyPlanner.menu.suggestBar', suggested.length, { count: suggested.length }) }}
    span.ssm-sugg-off(v-if="untickedCount")
      |  {{ $tc('strategyPlanner.menu.suggestUnticked', untickedCount, { count: untickedCount }) }}
  .ssm-sugg.is-quiet(v-else-if="suggestState === 'no-history'") {{ $t('strategyPlanner.menu.suggestNoHistory') }}
  .ssm-sugg.is-quiet(v-else-if="suggestState === 'nothing-matched'") {{ $t('strategyPlanner.menu.suggestNothing') }}
  .ssm-sugg.is-bad(v-else-if="suggestState === 'failed'") {{ $t('strategyPlanner.menu.suggestFailed') }}

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
            //- 🔴 THE ROW'S OWN SOURCE, NOT THE DECK'S. An agenda row carries page 2,
            //- its deck's contents page, so a number there would be a wrong reference on
            //- a table a client reads. A framing page sitting in the same deck has a REAL
            //- page and must show it — which the deck-level test could not tell apart.
            td.ssm-pg {{ concept.source === 'agenda' ? '—' : (concept.lastPage ? concept.page + '–' + concept.lastPage : concept.page) }}

            //- An agenda row is name-only (Decision B), so the name takes the three columns
            //- rather than leaving two empty cells that read as missing data.
            //- 🔴 THE ROW'S OWN SOURCE AGAIN, NOT THE DECK'S. A FRAMING PAGE sitting in an
            //- agenda deck is not a name-only row: it has a real page, a drawing and a title
            //- of its own, and rendered this way it would lose all three and read as one more
            //- line of the agenda. Strategic Orientation 1 holds both kinds since 2026-09-23.
            template(v-if="concept.source === 'agenda'")
              td.ssm-name(colspan="3")
                | {{ concept.name }}
                span.ssm-sub(v-if="concept.conceptSummary") {{ concept.conceptSummary }}
                span.ssm-why(v-if="reasonFor(concept.id)")
                  span.ssm-why-tag {{ $t('strategyPlanner.menu.suggestedBadge') }}
                  |  {{ reasonFor(concept.id) }}

            template(v-else)
              td.ssm-name
                | {{ concept.name }}
                span.ssm-shared(v-if="sharedNote(concept)" :title="sharedNote(concept)") {{ $t('strategyPlanner.menu.sharedCell') }}
                //- Tells the advisor this card runs a calculator (item 15.23, approved drawing).
                span.ssm-model(v-if="concept.model") {{ $t('strategyPlanner.menu.modelTag') }}
                //- 🔴 THE AI'S LINE SITS UNDER THE NAME, NEVER IN A COLUMN OF ITS OWN.
                //- Decision A binds the table to Mike's own five columns in his order, and
                //- a sixth would break it. It is styled apart from his text on purpose: a
                //- client reads this table in the room, and machine words must never be
                //- mistakable for his.
                span.ssm-why(v-if="reasonFor(concept.id)")
                  span.ssm-why-tag {{ $t('strategyPlanner.menu.suggestedBadge') }}
                  |  {{ reasonFor(concept.id) }}
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
 * 🔴 NOTHING IS PRE-TICKED WHEN THE SCREEN OPENS, AND THE AI NEVER UNTICKS — Decision C,
 * built as stage 6 on 2026-09-22. The "Suggest for this client" button asks the backend;
 * what comes back is a list of rows to tick and one line of reason against each. Three
 * consequences bind this component: the count in the chrome follows `chosen` and never
 * `suggested`; a suggested row the advisor unticks stays unticked and the bar says how
 * many; and the reason line renders under the concept NAME rather than in a column of its
 * own, because Decision A fixes the table to Mike's five columns in his order.
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
    sessionLabel: { type: String, default: '' },

    /**
     * What the AI proposed, as `[{ id, reason }]` — never what is included.
     * Empty until the advisor presses the button.
     */
    suggested: { type: Array, default: () => [] },

    /** True while the backend is being asked, so the button cannot be pressed twice. */
    suggesting: { type: Boolean, default: false },

    /**
     * Whether a client has been chosen. The suggestion is built from THIS client's recent
     * conversations, so without one there is nothing to suggest from and the button is
     * disabled rather than live-but-inert.
     */
    clientChosen: { type: Boolean, default: false },

    /**
     * Which of the four things the suggestion bar says, or '' for nothing yet.
     * `ok` — rows were proposed · `no-history` — the client has no conversations to read ·
     * `nothing-matched` — it read them and proposed none · `failed` — it could not run.
     */
    suggestState: {
      type: String,
      default: '',
      validator: v => ['', 'ok', 'no-history', 'nothing-matched', 'failed'].includes(v)
    }
  },

  computed: {
    /** @returns {number} every concept the menu offers, across all five panels */
    totalConcepts () {
      return this.decks.reduce((n, deck) => n + (deck.conceptCount || 0), 0)
    },

    /**
     * The reason line per concept id, built once rather than scanned per row — the menu
     * renders 52 rows and `suggested` is scanned for each one otherwise.
     * @returns {Object<string, string>}
     */
    reasonById () {
      const map = {}
      this.suggested.forEach((s) => {
        if (s && s.id) { map[s.id] = String(s.reason || '') }
      })
      return map
    },

    /**
     * How many suggested rows the advisor has taken back off.
     *
     * This is the number the drawing puts on the bar — "three were wrong and have been
     * unticked". It is the visible proof of Decision C(a): the suggestion and the scope
     * are different things, and the advisor's judgement is what separates them.
     *
     * @returns {number}
     */
    untickedCount () {
      return this.suggested.filter(s => s && s.id && !this.chosen.includes(s.id)).length
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
     * The AI's one line for a row, or '' when it did not propose that row.
     * @param {string} id a concept id
     * @returns {string}
     */
    reasonFor (id) {
      return this.reasonById[id] || ''
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 0.9rem;
  align-items: center;
}
.ssm-hint { font-size: 0.76rem; color: #5b6f8a; }

/* The suggestion bar. Blue, because it is information about what was proposed — it is
   not a warning, and the amber bands on this screen mean "Mike has not written this". */
.ssm-sugg {
  padding: 0.65rem 1.1rem;
  font-size: 0.76rem;
  color: #00457a;
  background: #eef7ff;
  border-bottom: 1px solid #9fd0f5;
}
.ssm-sugg.is-quiet { color: #5b6f8a; background: #f1f6fb; border-bottom-color: #d5e1ee; }
.ssm-sugg.is-bad { color: #8a1b1b; background: #fdeaea; border-bottom-color: #f0a9a9; }
.ssm-sugg-off { color: #00457a; }

/* Machine words under the concept name, held visibly apart from Mike's own text: a
   client reads this table in the room. */
.ssm-why {
  display: block;
  font-weight: 400;
  font-size: 0.72rem;
  color: #00457a;
  margin-top: 0.25rem;
  line-height: 1.45;
}
.ssm-why-tag {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0070c0;
  background: #e6f2fb;
  border: 1px solid #bcdcf6;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  margin-right: 0.15rem;
}

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
.ssm-model {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.62rem;
  font-weight: 700;
  color: #fff;
  background: #0070c0;
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
  vertical-align: 1px;
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

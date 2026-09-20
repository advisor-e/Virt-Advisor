<template lang="pug">
.sp
  header.sp-top
    .sp-top-text
      p.sp-eyebrow {{ $t('strategyPlanner.navTitle') }}
      h1.sp-title {{ $t('strategyPlanner.title') }}
      p.sp-sub {{ $t('strategyPlanner.subtitle') }}
    .sp-top-actions
      b-select(
        v-if="step === 'scope'"
        v-model="clientId"
        :placeholder="$t('strategyPlanner.chooseClient')"
      )
        option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
      b-button(v-if="step === 'scope'" type="is-primary" :disabled="!canStart" @click="startSession") {{ $t('strategyPlanner.startSession') }}
      b-button(v-if="step === 'steps'" outlined type="is-primary" @click="step = 'scope'") {{ $t('strategyPlanner.back') }}
      //- 🔴 NEVER DISABLED. Decision 3: an advisor may run a session with cards left
      //- unplaced — they simply are not in it, and stay recorded in the scope. The
      //- count is the guard, because a locked button strands him mid-meeting over a
      //- concept he has decided against.
      b-button(v-if="step === 'steps'" type="is-primary" @click="step = 'run'") {{ $t('strategyPlanner.steps.toRun', { placed: placedCardCount, total: placeableCards.length }) }}
      b-button(v-if="step === 'run'" outlined type="is-primary" @click="step = 'steps'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'run'" type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.toObjectives') }}
      b-button(v-if="step === 'objectives'" outlined type="is-primary" @click="step = 'run'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'objectives'" type="is-primary" @click="step = 'plan'") {{ $t('strategyPlanner.producePlan') }}
      b-button(v-if="step === 'plan'" outlined type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.back') }}

  nav.sp-rail(aria-label="Session progress")
    div(:class="railClass('scope')") {{ $t('strategyPlanner.rail.scope') }}
    div(:class="railClass('steps')") {{ $t('strategyPlanner.rail.steps') }}
    div(:class="railClass('run')") {{ $t('strategyPlanner.rail.run') }}
    div(:class="railClass('objectives')") {{ $t('strategyPlanner.rail.objectives') }}
    div(:class="railClass('plan')") {{ $t('strategyPlanner.rail.plan') }}

  b-notification(v-if="error" type="is-danger" :closable="true" @close="error = ''") {{ error }}

  b-loading(:is-full-page="false" :active="loading")

  template(v-if="!loading && step === 'scope'")
    strategy-scope-menu(
      :decks="decks"
      :chosen="chosen"
      :session-label="sessionLabel"
      @scope-changed="onScopeChanged"
    )

  template(v-if="!loading && step === 'steps'")
    //- 🔴 SAYS WHY THE LIST IS SHORTER THAN WHAT HE TICKED, AND IT BELONGS HERE NOW.
    //- An advisor ticks 52 concepts and this screen offers 18 cards, because only 16 of
    //- the 52 have a fill-in table built. The notice used to sit on the next screen,
    //- which was the first place the shortfall showed — since 2026-09-20 this screen is,
    //- so an unexplained gap of 34 would be the first thing he meets. Found by opening
    //- the screen rather than by any test.
    b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
      | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

    strategy-step-builder(
      :cards="placeableCards"
      :steps="planStepDefs"
      :session-label="sessionLabel"
      @steps-changed="onStepsChanged"
    )

  template(v-if="!loading && step === 'run'")
    //- 🔴 SAYS WHAT IT CANNOT RUN. The advisor scoped concepts that have no capture card
    //- built yet, and a step that silently showed only two of eleven would read as a bug
    //- in the room. Stage 1 of item 15.1 — the cards are stages 4 and 5.
    b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
      | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

    //- 🔴 THE MEETING RUNS IN THE ADVISOR'S OWN ORDER, UNDER HIS OWN HEADINGS. Before
    //- stage 2 existed these were two flat lists in whatever order the data produced,
    //- so Porter's observations and Porter's responses sat next to each other. Pivot
    //- runs them an hour apart, in different steps, and that gap is why the responses
    //- are worth more than the observations.
    p.sp-cap(v-if="!runSteps.length") {{ $t('strategyPlanner.steps.nothingToRun') }}

    section.sp-runstep(v-for="(runStep, i) in runSteps" :key="'rs' + i")
      h4.sp-h {{ runStep.name }}

      template(v-for="card in runStep.cards")
        //- 🔴 A CONCEPT WITH AN APPROVED CARD USES IT. Porter's was designed on
        //- 2026-09-16 (strategy-planner.html screen 2c) as five force boxes, each
        //- carrying the deck's own question, with Existing Rivalry as the centre — and
        //- it was built. Replacing it with a grid derived from the Word template lost
        //- all five prompts and the fifth force. Mike, 2026-09-17: "i saw much better
        //- graphics in a design 6 or 8 sessions ago - what happened??"
        strategy-capture-card(
          v-if="card.kind === 'framework'"
          :key="card.key"
          :framework="card.framework"
          :entries="entriesFor(card.framework.conceptId || card.framework.id)"
          :eyebrow="card.eyebrow"
          :teachable="isTeachable(card.framework)"
          class="sp-card"
          @field-opened="onFrameworkFieldOpened(card.framework, $event)"
          @field-changed="onFrameworkFieldChanged(card.framework, $event)"
        )

        //- Everything else: the concept's own fill-in table, read from Mike's
        //- workbooks. 47 of the 52 have no approved card of their own.
        strategy-concept-capture(
          v-else
          :key="card.key"
          :name="card.visit.name"
          :capture="card.visit.capture"
          :part="card.visit.part"
          :concept-summary="card.visit.conceptSummary"
          :helps-client-to="card.visit.helpsClientTo"
          :teaching-form="card.visit.teachingForm"
          :concept-id="card.visit.conceptId"
          :instruction="visitInstruction(card.visit)"
          :entries="entriesFor(card.visit.conceptId)"
          :eyebrow="card.eyebrow"
          @field-opened="onVisitFieldOpened(card.visit, $event)"
          @field-changed="onVisitFieldChanged(card.visit, $event)"
        )

  template(v-if="!loading && step === 'objectives'")
    strategy-capture-card(
      v-for="framework in closingFrameworks"
      :key="framework.id"
      :framework="framework"
      :entries="entriesFor(framework.id)"
      :eyebrow="$t('strategyPlanner.rail.objectives')"
      class="sp-card"
      @field-opened="onFieldOpened"
      @field-changed="onFieldChanged"
    )
    section.sp-section
      h4.sp-h {{ $t('strategyPlanner.wheel.heading') }}
      p.sp-cap {{ $t('strategyPlanner.wheel.caption') }}
      strategy-growth-wheel(:aspects="growthAspects" :counts="aspectCounts")

  //- Screen 4 — the plan. READ ONLY, and assembled from what was captured; it holds no
  //- state of its own, so it can never disagree with the session behind it.
  template(v-if="!loading && step === 'plan'")
    strategy-plan-document(
      :client-name="clientName"
      :decks="planDecks"
      :steps="planSteps"
    )
    section.sp-section
      h4.sp-h {{ $t('strategyPlanner.wheel.heading') }}
      strategy-growth-wheel(:aspects="growthAspects" :counts="aspectCounts")
</template>

<script>
/**
 * /strategy-planner — the session an advisor runs with a client.
 *
 * To-do item 15.1. Design: `design/mockups/strategy-planner.html`, eleven decisions ruled
 * by Mike 2026-09-16 and registered in `design/ARTEFACTS.md`.
 *
 * ALL FOUR STEPS ARE HERE: scope the session, run the chosen frameworks, close it with the
 * Strategic Objective, the Action Plan and the nine Growth Aspects coverage check, then the
 * plan itself. Built at this breadth first, on Mike's instruction of 2026-09-16 — *"lets
 * build it a global level and drop to detail after we see it in full context"* — so the
 * whole journey can be judged before any part of it is refined.
 *
 * 🔴 THE COVERAGE CHECK COUNTS WHAT THE ADVISOR CHOSE. Each Action Plan row carries a
 * Growth Aspect the advisor picks from a list; the wheel counts those. No model reads an
 * objective and guesses which aspect it belongs to — that would be LLM output trusted as
 * structured data, and it would be invisible when wrong.
 *
 * ⚠ THE PLAN IS DERIVED, NEVER STORED. Screen 4 assembles what was captured and holds no
 * state of its own, so it cannot drift from the session behind it.
 *
 * 🔴 `field-opened` IS NOT ANALYTICS. Decision 11: the box open when words are spoken
 * claims them, so every focus is posted to the session's navigation timeline. That is what
 * lets a recording be apportioned without a model deciding where anything belongs. A
 * refactor that drops it has left AI judgement as the only route, which that ruling forbids.
 *
 * 🔴 A FAILED SAVE SAYS SO AND KEEPS THE TEXT. An advisor is mid-meeting with a client in
 * front of them; silently losing a box is worse than an error they can act on, so the
 * message says the words are still on screen.
 *
 * ⚠ SSR: EVERYTHING LOADS IN `mounted`, NOT IN `fetch()` OR `asyncData()`. Both of those
 * also run on the server, where the browser's `fetch` does not exist on Node 14 and
 * `window.localStorage` — where the advisor's token lives — does not either. The page
 * would throw before rendering. See the note on `mounted` below.
 */
import StrategyScopeMenu from '~/components/strategy/StrategyScopeMenu.vue'
import StrategyCaptureCard from '~/components/strategy/StrategyCaptureCard.vue'
import StrategyConceptCapture from '~/components/strategy/StrategyConceptCapture.vue'
import StrategyGrowthWheel from '~/components/strategy/StrategyGrowthWheel.vue'
import StrategyPlanDocument from '~/components/strategy/StrategyPlanDocument.vue'
import StrategyStepBuilder from '~/components/strategy/StrategyStepBuilder.vue'
import { hasConceptGraphic } from '~/components/strategy/concepts'
import { isDevHost } from '~/utils/devHost'

/** Where the master app leaves the advisor's token before our pages load. */
const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'StrategyPlannerPage',

  components: { StrategyScopeMenu, StrategyStepBuilder, StrategyCaptureCard, StrategyConceptCapture, StrategyGrowthWheel, StrategyPlanDocument },

  data () {
    return {
      /**
       * Which SCREEN is showing: 'scope' | 'steps' | 'run' | 'objectives' | 'plan'.
       *
       * 🔴 THIS IS NOT THE SESSION'S STEPS AND THE TWO MUST NEVER BE CONFLATED. This is
       * the wizard's own position; the session's steps are `planStepDefs` below, named by
       * the advisor and printed on the client's agenda. The drawing says so in as many
       * words, because wiring one to the other is the obvious mistake to make here.
       */
      step: 'scope',
      loading: true,
      error: '',
      planningDomains: [],
      /** The five panels of the session scope menu, in Mike's order. */
      decks: [],
      frameworks: [],
      /** The two that close every session — never ticked, always present. */
      closingFrameworks: [],
      /** The nine, from data/growth-fundamentals.json via the backend. */
      growthAspects: [],
      clients: [],
      /**
       * 🔴 null, NOT ''. Buefy draws the "Choose a client…" placeholder option only
       * while the bound value is null; an empty string is a value, so the option is
       * skipped and the picker renders BLANK with no prompt in it. The advisor then
       * ticks concepts, finds Start the session greyed out, and nothing on screen
       * says a client is what is missing. Found by Mike on 2026-09-17, on the first
       * click — every test was green, because a test reads `canStart` rather than
       * looking at the box.
       */
      clientId: null,
      /**
       * CONCEPT ids ticked on the session scope menu — Mike's own 52, not framework ids.
       * Changed in Stage 1: the menu is now his Session Scope table (Decision A), and a
       * concept is the unit an advisor ticks.
       */
      chosen: [],
      /**
       * THE SESSION'S STEPS — what the advisor names on stage 2 and drags cards into.
       * `[{ key, name, items: [cardKey] }]`, in the order they will run.
       *
       * 🔴 A STEP HOLDING NOTHING IS A REAL STEP. Mike's ruling, 2026-09-20: he names
       * the steps, and one with nothing in it still prints on the agenda — Pivot's
       * step 5 "Do It & Review It" has no slides behind it at all. Nothing may prune
       * an empty entry from this list.
       *
       * `key` is a client-side handle so a name input keeps focus while it is typed;
       * only `name` and `items` are saved, with the scope.
       */
      planStepDefs: [],
      /** The open session's id, once one exists. */
      sessionId: null,
      /** Captured text, keyed `frameworkId::fieldKey`. */
      entries: {},
      /**
       * Each ticked concept's real fill-in table, keyed by concept id, as
       * `GET /api/strategy/concepts/:id/capture` returns it. Loaded when the
       * advisor starts the session rather than at scope time — 52 requests to
       * render a menu would be 52 requests nobody reads.
       */
      captures: {},
      /** Resolved in mounted — never at render time. */
      apiToken: ''
    }
  },

  computed: {
    /**
     * The ticked concepts that have a built capture card, in authored order.
     *
     * ⚠ FAR FEWER THAN THE ADVISOR TICKED, AND THAT IS THE TRUE STATE. The menu offers all
     * 52 of Mike's concepts; two of them — Porter's 5 Forces and the 8 Profit Levers — have
     * a framework behind them today. The rest are scoped and wait on the later stages of
     * item 15.1. `conceptsWithoutACard` counts them so the screen can say so rather than
     * quietly drop them.
     *
     * @returns {object[]}
     */
    chosenFrameworks () {
      return this.frameworks.filter(f => f.conceptId && this.chosen.includes(f.conceptId))
    },

    /**
     * Every ticked concept as a VISIT — the unit the session actually runs.
     *
     * 🔴 A CONCEPT CAN APPEAR MORE THAN ONCE, AND THAT IS MIKE'S OWN DECK. Pivot puts
     * Porter's on page 11 for *"record your observations ONLY. (For Now)"* and again on
     * page 21 for the responses. Its table carries both — the observation columns and
     * the response columns — so the two visits write to different boxes and the second
     * never overwrites the first.
     *
     * Each visit opens one part. Mike's reason, 2026-09-17: you teach the concept, let
     * it land, then ask how it applies — showing the response columns at visit one is
     * asking somebody to answer before they understand the question.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, part: number, capture: object}>}
     */
    conceptVisits () {
      // A concept with an approved framework card is drawn by that card above,
      // not twice.
      const hasApprovedCard = {}
      this.chosenFrameworks.forEach((f) => {
        if (f.conceptId) { hasApprovedCard[f.conceptId] = true }
      })

      const visits = []
      this.chosen.forEach((conceptId) => {
        if (hasApprovedCard[conceptId]) { return }
        const loaded = this.captures[conceptId]
        if (!loaded) { return }
        const parts = (loaded.capture && loaded.capture.parts) || []
        const count = parts.length > 1 ? parts.length : 1
        for (let part = 1; part <= count; part++) {
          visits.push({
            key: conceptId + '#' + part,
            conceptId,
            name: loaded.name,
            conceptSummary: loaded.conceptSummary || '',
            helpsClientTo: loaded.helpsClientTo || '',
            teachingForm: loaded.teachingForm || '',
            part,
            capture: loaded.capture
          })
        }
      })
      return visits
    },

    /**
     * Ticked concepts that genuinely cannot be run — no fill-in table AND no
     * approved drawing.
     *
     * ⚠ THE NOTICE THIS FEEDS SAYS "not shown below", SO IT MUST NOT COUNT A
     * CONCEPT THAT IS SHOWN. A concept admitted on its drawing alone (item 15.7)
     * appears in the session, so counting it here would tell an advisor their
     * concept had been dropped while it sat on the screen in front of them.
     *
     * @returns {number}
     */
    conceptsWithoutACard () {
      return this.chosen.filter((id) => {
        const loaded = this.captures[id]
        const hasTable = Boolean(loaded && loaded.capture && loaded.capture.supplied)
        return !hasTable && !hasConceptGraphic(id)
      }).length
    },

    /** @returns {string} the chrome line: which client, and when */
    sessionLabel () {
      return this.clientId ? this.clientName : ''
    },

    /**
     * A session needs a client AND something to run. Without a client the backend refuses
     * the save — correctly, because a plan belongs to somebody.
     * @returns {boolean}
     */
    canStart () {
      return !!this.clientId && this.chosen.length > 0
    },

    /** @returns {string} */
    clientName () {
      const found = this.clients.find(c => c.id === this.clientId)
      return found ? found.name : this.$t('strategyPlanner.plan.untitled')
    },

    /**
     * How many operational objectives name each Growth Aspect. This is the coverage check
     * Orientation 1 asks for, and it is COUNTED FROM WHAT THE ADVISOR CHOSE — no model
     * reads an objective and guesses which aspect it belongs to.
     * @returns {Object.<string,number>}
     */
    aspectCounts () {
      const counts = {}
      Object.keys(this.entries).forEach((k) => {
        if (k.indexOf('action-plan::') !== 0 || !k.includes('-aspect')) { return }
        const name = String(this.entries[k] || '').trim()
        if (!name) { return }
        // Only counts where the row actually has an objective — an aspect chosen beside
        // an empty row would colour the wheel for a plan that says nothing.
        const objectiveKey = k.replace('-aspect', '-objective')
        if (!String(this.entries[objectiveKey] || '').trim()) { return }
        counts[name] = (counts[name] || 0) + 1
      })
      return counts
    },

    /**
     * The plan, assembled from what was captured. Read-only and derived, so it can never
     * disagree with the session behind it.
     * @returns {Array<{id: string, name: string, lines: object[]}>}
     */
    /**
     * Which decks this session drew on, as one line for the title page.
     * @returns {string}
     */
    planDecks () {
      const names = {}
      this.decks.forEach((d) => {
        if (d.concepts && d.concepts.some(c => this.chosen.includes(c.id))) { names[d.name] = true }
      })
      return Object.keys(names).join(' · ')
    },

    /**
     * EVERY CARD THE ADVISOR CAN PLACE, in the order the session would otherwise run
     * them. This is the one list stage 2 offers and stage 3 and the document both read,
     * so a card cannot exist on one screen and not another.
     *
     * A card is not the same as a concept: a concept whose fill-in table has two halves
     * arrives here as TWO cards — Porter's observations and Porter's responses — because
     * Pivot runs them in different steps, an hour apart. That is Mike's ruling of
     * 2026-09-17 (a concept may be used twice), and it is why the key carries the visit.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, deck: string, tag: string, summary: string, instruction: string, prompts: object[], lines: object[]}>}
     */
    placeableCards () {
      const cards = []

      // The approved framework cards first, in their authored order.
      this.chosenFrameworks.forEach((f) => {
        const conceptId = f.conceptId || f.id
        cards.push({
          key: 'fw-' + f.id,
          conceptId,
          hasTable: true,
          name: f.name,
          deck: f.deckName || '',
          tag: '',
          summary: f.conceptSummary || '',
          instruction: f.captureInstruction || '',
          prompts: f.fields
            .filter(x => x.prompt)
            .map(x => ({ key: x.key, label: x.label, prompt: x.prompt })),
          lines: f.fields.map(x => ({
            key: conceptId + '::' + x.key,
            label: x.label,
            value: (this.entries[conceptId + '::' + x.key] || '').trim()
          }))
        })
      })

      // Then every concept captured through its own fill-in table.
      //
      // 🔴 A CONCEPT NEEDS A TABLE **OR** A DRAWING — Mike's ruling, 2026-09-20.
      // This line used to demand a supplied workbook, which was right while there
      // were no pictures: a concept with neither printed a title, an instruction
      // and nothing else, a near-empty page in a document a client is handed. With
      // the drawing wired in (item 15.7) such a concept now prints Mike's own
      // teaching page, so excluding it loses real content instead of sparing the
      // client a blank. Measured when the ruling was made: only 16 of the 52
      // concepts have a workbook, so the old line capped the 33 approved drawings
      // at 16 no matter how many were wired.
      this.conceptVisits.forEach((visit) => {
        const capture = visit.capture || {}
        const hasTable = Boolean(capture.supplied)
        if (!hasTable && !hasConceptGraphic(visit.conceptId)) { return }
        const wanted = {}
        const part = (capture.parts || [])[visit.part - 1]
        if (part) { part.fieldKeys.forEach((k) => { wanted[k] = true }) }
        const multi = capture.parts && capture.parts.length > 1
        cards.push({
          key: visit.key,
          conceptId: visit.conceptId,
          // A concept admitted on its drawing alone has nothing to fill in, and the
          // client's document must not print a capture page saying it was "not
          // worked through" when there was never anything to work.
          hasTable,
          name: visit.name + (multi ? ' (' + visit.part + ')' : ''),
          deck: visit.deckName || '',
          // The tag is what tells an advisor, on the step builder, that these two
          // chips are the SAME table visited twice rather than a duplicate to remove.
          tag: multi ? this.$t('strategyPlanner.capture.part', { n: visit.part }) : '',
          summary: visit.conceptSummary || '',
          instruction: this.visitInstruction(visit),
          prompts: [],
          lines: (capture.fields || [])
            .filter(f => !part || wanted[f.key])
            .map(f => ({
              key: visit.conceptId + '::' + f.key,
              label: [f.columnLabel, f.rowLabel].filter(Boolean).join(' · ') || f.key,
              value: (this.entries[visit.conceptId + '::' + f.key] || '').trim()
            }))
        })
      })

      // The two that close every session. Decision 4, 2026-09-20: these are ordinary
      // cards on an ordinary step the advisor names — they no longer bring a step of
      // their own that names itself, because that label reached the client's agenda.
      this.closingFrameworks.forEach((f) => {
        cards.push({
          key: 'close-' + f.id,
          // The two closing frameworks are ours, not a deck concept, so they have
          // no drawing and never will — the graphic resolves to nothing.
          conceptId: '',
          hasTable: true,
          name: f.name,
          deck: '',
          tag: '',
          summary: '',
          instruction: f.captureInstruction || '',
          prompts: [],
          lines: f.fields.map(x => ({
            key: f.id + '::' + x.key,
            label: x.label,
            value: (this.entries[f.id + '::' + x.key] || '').trim()
          }))
        })
      })

      return cards
    },

    /**
     * The meeting itself, grouped under the advisor's own step names and run in his
     * order.
     *
     * ⚠ AN EMPTY STEP IS DROPPED HERE AND KEPT IN `planSteps`, AND THAT IS NOT A
     * CONTRADICTION. There is nothing to work in the room for a step holding nothing —
     * but it still belongs on the agenda the client reads, which is the document's job.
     * Pivot's step 5 is exactly that case.
     *
     * ⚠ THE CLOSING CARDS ARE NOT RUN HERE. The Strategic Objective and Action Plan are
     * captured on stage 4, as they always were; placing them on a step decides where
     * they PRINT, not where they are filled in.
     *
     * @returns {Array<{name: string, cards: object[]}>}
     */
    runSteps () {
      const frameworksByKey = {}
      this.chosenFrameworks.forEach((f) => { frameworksByKey['fw-' + f.id] = f })
      const visitsByKey = {}
      this.conceptVisits.forEach((v) => { visitsByKey[v.key] = v })

      return this.planStepDefs.map((def, i) => {
        const cards = []
        def.items.forEach((key) => {
          if (frameworksByKey[key]) {
            cards.push({ key, kind: 'framework', framework: frameworksByKey[key] })
          } else if (visitsByKey[key]) {
            cards.push({ key, kind: 'visit', visit: visitsByKey[key] })
          }
        })
        return {
          name: def.name || this.$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 }),
          // The position an advisor reads mid-meeting is his position WITHIN THIS STEP —
          // "3 / 5" of the step he is working, not of the whole session.
          cards: cards.map((c, j) => Object.assign({}, c, { eyebrow: (j + 1) + ' / ' + cards.length }))
        }
      }).filter(s => s.cards.length)
    },

    /** @returns {number} how many placeable cards the advisor has put into a step */
    placedCardCount () {
      const placed = {}
      this.planStepDefs.forEach((s) => { s.items.forEach((k) => { placed[k] = true }) })
      return this.placeableCards.filter(c => placed[c.key]).length
    },

    /**
     * The session as the steps the assembled document prints — the advisor's own steps,
     * in his order, each holding the cards he put in it.
     *
     * 🔴 A STEP HOLDING NOTHING IS KEPT. Mike's ruling, 2026-09-20. Pivot's step 5
     * "Do It & Review It" has no slides behind it and still appears on the agenda a
     * client reads; the document already prints that as "on the agenda only". Filtering
     * empty steps out here would quietly delete the page this feature exists for.
     *
     * ⚠ A CARD LEFT UNPLACED IS NOT IN THE DOCUMENT. Decision 3: unplaced cards stay
     * recorded in the session's scope and simply do not run, which is why the button on
     * to stage 3 says "Run 11 of 14" rather than being greyed out.
     *
     * @returns {Array<{name: string, items: object[], teaches: boolean}>}
     */
    planSteps () {
      const byKey = {}
      this.placeableCards.forEach((c) => { byKey[c.key] = c })

      return this.planStepDefs.map((def, i) => {
        const items = def.items.map(k => byKey[k]).filter(Boolean)
        return {
          name: def.name || this.$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 }),
          items,
          // `teaches` says whether the step has anything to present before it is
          // worked. Without it a step of pure tables printed a Discussion divider and
          // then went straight to the tables, which reads as a missing page.
          teaches: items.some(x => x.summary || x.prompts.length),
          // And the mirror of it: a step made only of concepts admitted on their
          // drawing has nothing to work, so the Action divider would announce pages
          // that never come. Mike's ruling of 2026-09-20 made that state possible.
          works: items.some(x => x.hasTable !== false)
        }
      })
    }
  },

  /**
   * ⚠ LOADED IN `mounted`, NOT IN `fetch()` OR `asyncData()`, AND NOT BY PREFERENCE.
   * Both of those also run on the SERVER during SSR, where the browser's `fetch` does not
   * exist on Node 14 — the page would throw before it rendered. The token has the same
   * constraint: it comes from `window.localStorage`, which only exists in the browser.
   */
  async mounted () {
    this.apiToken = this.resolveApiToken()
    await Promise.all([this.loadFrameworks(), this.loadClients()])
  },

  methods: {
    /**
     * Same resolution as pages/dashboard-reports.vue: a loopback host always uses the dev
     * bypass; otherwise the token the master app stored. With no token the backend
     * returns 401, which is the safe direction to fail.
     * @returns {string}
     */
    resolveApiToken () {
      if (isDevHost()) { return 'dev-local-bypass' }
      try {
        return window.localStorage.getItem(TOKEN_KEY) || ''
      } catch (e) {
        return ''
      }
    },

    /**
     * Headers for every call. The token is what firmAuth reads the firm and the advisor
     * from — nothing in a body or a query string decides either.
     * @param {boolean} [withBody]
     * @returns {object}
     */
    headers (withBody) {
      const h = { Authorization: 'Bearer ' + this.apiToken }
      if (withBody) { h['Content-Type'] = 'application/json' }
      return h
    },

    /**
     * @param {string} step
     * @returns {object} class bindings for one rail segment
     */
    railClass (step) {
      const order = ['scope', 'run', 'objectives', 'plan']
      const here = order.indexOf(this.step)
      const mine = order.indexOf(step)
      return { 'sp-rail-step': true, 'is-on': mine === here, 'is-done': mine < here }
    },

    /**
     * Load each ticked concept's fill-in table.
     *
     * `Promise.allSettled` rather than `all` on purpose: one concept whose table
     * fails to load must not take the other ten down with it. A concept that does
     * not load simply has no card, which the count on screen already reports.
     *
     * @returns {Promise<void>}
     */
    async loadCaptures () {
      const wanted = this.chosen.filter(id => !this.captures[id])
      if (!wanted.length) { return }

      const results = await Promise.allSettled(wanted.map(async (id) => {
        const res = await fetch(
          '/api/strategy/concepts/' + encodeURIComponent(id) + '/capture',
          { credentials: 'same-origin', headers: this.headers() }
        )
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        return { id, body: await res.json() }
      }))

      results.forEach((r) => {
        if (r.status !== 'fulfilled') { return }
        const b = r.value.body
        this.$set(this.captures, r.value.id, {
          name: b.name,
          conceptSummary: b.conceptSummary,
          helpsClientTo: b.helpsClientTo,
          teachingForm: b.teachingForm,
          // ⚠ THIS OBJECT IS A HAND-COPIED SUBSET, so a field added to the route
          // reaches the screen only if it is named here too. The deck-image fields
          // were served, proxied and ignored for exactly that reason before anyone
          // noticed. Whatever the response-page drawings need (item 15.11) must be
          // named here as well.
          capture: b.capture
        })
      })
    },

    /**
     * The instruction for this visit.
     *
     * A concept visited once carries none. A second visit carries the heading of
     * the columns it opens — Mike's own "How We Plan To Respond" — which is what
     * tells an advisor why they are back at the same table.
     *
     * @param {{part: number, capture: object}} visit
     * @returns {string}
     */
    visitInstruction (visit) {
      const parts = (visit.capture && visit.capture.parts) || []
      if (parts.length < 2) { return '' }
      const chosen = parts[visit.part - 1]
      return (chosen && chosen.label) || ''
    },

    /**
     * Whether this framework is taught before it is captured.
     *
     * A concept card is; a closing table like the Action Plan is filled in, not
     * taught. The judgement is the shape's, and the shape is Mike's approved data.
     *
     * @param {{shape: string}} framework
     * @returns {boolean}
     */
    isTeachable (framework) {
      return framework.shape !== 'actions'
    },

    /**
     * A box opened on an approved framework card.
     *
     * Keyed on the CONCEPT, not the framework, so a concept captured through its
     * approved card and one captured through its own table land in the same place.
     *
     * @param {{id: string, conceptId: string}} framework
     * @param {{frameworkId: string, fieldKey: string}} payload
     */
    onFrameworkFieldOpened (framework, payload) {
      this.onFieldOpened({
        frameworkId: framework.conceptId || framework.id,
        fieldKey: payload.fieldKey
      })
    },

    /**
     * A box typed into on an approved framework card.
     * @param {{id: string, conceptId: string}} framework
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     */
    onFrameworkFieldChanged (framework, payload) {
      this.onFieldChanged({
        frameworkId: framework.conceptId || framework.id,
        fieldKey: payload.fieldKey,
        value: payload.value
      })
    },

    /**
     * The advisor moved into a box on a visit.
     * @param {{conceptId: string}} visit
     * @param {{fieldKey: string}} payload
     */
    onVisitFieldOpened (visit, payload) {
      this.onFieldOpened({ frameworkId: visit.conceptId, fieldKey: payload.fieldKey })
    },

    /**
     * The advisor typed into a box on a visit.
     * @param {{conceptId: string}} visit
     * @param {{fieldKey: string, value: string}} payload
     */
    onVisitFieldChanged (visit, payload) {
      this.onFieldChanged({ frameworkId: visit.conceptId, fieldKey: payload.fieldKey, value: payload.value })
    },

    /**
     * Everything captured for one framework, keyed by field.
     * @param {string} frameworkId
     * @returns {Object.<string,string>}
     */
    entriesFor (frameworkId) {
      const out = {}
      const prefix = frameworkId + '::'
      Object.keys(this.entries).forEach((k) => {
        if (k.indexOf(prefix) === 0) { out[k.slice(prefix.length)] = this.entries[k] }
      })
      return out
    },

    /**
     * Loads the frameworks, the Planning Domains, and the session scope menu itself.
     *
     * Two calls rather than one: the menu is Mike's 52 concepts grouped by deck, and the
     * frameworks are the handful of built capture cards. They are different sets with
     * different lifetimes, and folding them into one response would hide that.
     */
    async loadFrameworks () {
      this.loading = true
      try {
        const [frameworkRes, conceptRes] = await Promise.all([
          fetch('/api/strategy/frameworks', { credentials: 'same-origin', headers: this.headers() }),
          fetch('/api/strategy/concepts', { credentials: 'same-origin', headers: this.headers() })
        ])
        if (!frameworkRes.ok) { throw new Error('HTTP ' + frameworkRes.status) }
        if (!conceptRes.ok) { throw new Error('HTTP ' + conceptRes.status) }
        const body = await frameworkRes.json()
        const conceptBody = await conceptRes.json()
        this.planningDomains = body.planningDomains || []
        this.frameworks = body.frameworks || []
        this.closingFrameworks = body.closingFrameworks || []
        this.growthAspects = body.growthAspects || []
        this.decks = conceptBody.decks || []
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * The advisor's own clients. A planning session belongs to one of them, and the
     * backend refuses a session without one — so this is not a convenience.
     */
    async loadClients () {
      try {
        const res = await fetch('/api/clients', {
          credentials: 'same-origin',
          headers: this.headers()
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.clients = body.clients || []
        // An id in the address wins, so a link from a client's record still works.
        const fromUrl = this.$route.query.clientId
        if (fromUrl && this.clients.some(c => c.id === fromUrl)) { this.clientId = fromUrl }
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.clientsFailed')
      }
    },

    /** @param {string[]} next the full list of ticked framework ids */
    onScopeChanged (next) {
      this.chosen = next
    },

    /**
     * Decision 2, 2026-09-20: the step builder opens with EVERYTHING UNPLACED and one
     * empty step to rename. Seeding it with a step already holding the lot would invite
     * the advisor to press on past the screen — which is the behaviour this feature
     * exists to replace, wearing a new screen.
     *
     * Only ever seeds an empty list, so returning to stage 2 never discards work.
     * @returns {void}
     */
    seedSteps () {
      if (this.planStepDefs.length) { return }
      this.planStepDefs = [{ key: 's1', name: '', items: [] }]
    },

    /**
     * The step builder emits the whole list; the page owns it and saves it with the
     * scope, so what is on screen and what is stored cannot drift apart.
     *
     * ⚠ A FAILED SAVE DOES NOT ROLL THE SCREEN BACK. The advisor keeps what he arranged
     * and is told it did not save — the same rule the capture boxes follow, and for the
     * same reason: silently undoing his work is worse than an error he can act on.
     *
     * @param {Array<{key: string, name: string, items: string[]}>} next
     * @returns {Promise<void>}
     */
    async onStepsChanged (next) {
      this.planStepDefs = next
      if (!this.sessionId) { return }
      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/scope', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            domains: [],
            frameworks: this.chosen,
            steps: next.map(s => ({ name: s.name, items: s.items }))
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.error = ''
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.stepsSaveFailed')
      }
    },

    /** Opens the session and moves to the frameworks. */
    async startSession () {
      this.error = ''
      try {
        const res = await fetch('/api/strategy/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            clientId: this.clientId,
            scope: { domains: [], frameworks: this.chosen }
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.sessionId = body.sessionId
        await this.loadCaptures()
        // 🔴 THE CAPTURES MUST BE LOADED FIRST. `placeableCards` reads them to know
        // which concepts have a two-part table, and a step builder opened before they
        // arrive would offer one Porter's chip where the session has two.
        this.seedSteps()
        this.step = 'steps'
      } catch (e) {
        // ⚠ ITS OWN MESSAGE. The first build reused the capture-box message here, so a
        // failure to OPEN a session told the advisor a box had not saved — found by
        // pressing the button rather than by any test.
        this.error = this.$t('strategyPlanner.errors.startFailed')
      }
    },

    /**
     * The advisor moved into a box — Decision 11's timeline.
     * Failure here is deliberately silent: it degrades the apportioning of a future
     * recording, and an error banner mid-sentence would cost the advisor more than the
     * timeline gap does. The gap itself is visible on the session's timeline afterwards.
     * @param {{frameworkId: string, fieldKey: string}} payload
     */
    async onFieldOpened (payload) {
      if (!this.sessionId) { return }
      try {
        await fetch('/api/strategy/sessions/' + this.sessionId + '/timeline', {
          method: 'POST',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify(payload)
        })
      } catch (e) { /* see the note above */ }
    },

    /**
     * A box changed. Saved on blur, never per keystroke.
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     */
    async onFieldChanged (payload) {
      if (!this.sessionId) { return }
      this.error = ''
      const key = payload.frameworkId + '::' + payload.fieldKey
      // Optimistic: the advisor sees their own words stay put while the save runs.
      this.$set(this.entries, key, payload.value)

      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/entries', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({ entries: [payload] })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.saveFailed')
      }
    }
  }
}
</script>

<style scoped>
.sp { max-width: 1120px; margin: 0 auto; padding: 1.4rem 1.1rem 4rem; position: relative; }
.sp-top {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.sp-top-text { flex: 1 1 320px; min-width: 0; }
.sp-eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0070c0;
  margin: 0;
}
.sp-title { font-size: 1.6rem; font-weight: 700; margin: 0.1rem 0 0; color: #002b64; }
.sp-sub { font-size: 0.85rem; color: #5b6f8a; margin: 0.25rem 0 0; max-width: 70ch; }

.sp-rail {
  display: flex;
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f6fb;
  margin-bottom: 1.2rem;
}
.sp-rail-step {
  flex: 1 1 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.75rem;
  text-align: center;
  color: #5b6f8a;
  border-right: 1px solid #d5e1ee;
}
.sp-rail-step:last-child { border-right: 0; }
.sp-rail-step.is-on { background: #0070c0; color: #fff; font-weight: 600; }
.sp-rail-step.is-done { background: rgba(76, 165, 45, 0.1); color: #2f7d32; font-weight: 600; }

.sp-card { margin-bottom: 1.1rem; }
.sp-section { margin: 1.4rem 0; }
.sp-h { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.2rem; color: #002b64; }
.sp-cap { font-size: 0.8rem; color: #5b6f8a; margin: 0 0 0.8rem; max-width: 80ch; }

.sp-plan {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 1.4rem 1.6rem 1.8rem;
}
.sp-plan-title { font-size: 1.4rem; font-weight: 700; color: #002b64; margin: 0; }
.sp-plan-sub { font-size: 0.82rem; color: #5b6f8a; margin: 0.2rem 0 1.2rem; }
.sp-plan-sec { border-top: 1px solid #d5e1ee; padding-top: 0.9rem; margin-top: 0.9rem; }
.sp-plan-h { font-size: 0.95rem; font-weight: 700; color: #002b64; margin: 0 0 0.5rem; }
.sp-plan-empty { font-size: 0.8rem; color: #5b6f8a; font-style: italic; margin: 0; }
.sp-plan-dl { margin: 0; }
.sp-plan-dl dt {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #0070c0;
  margin-top: 0.55rem;
}
.sp-plan-dl dd { margin: 0.1rem 0 0; font-size: 0.85rem; color: #002b64; }

@media (max-width: 860px) {
  .sp-rail { flex-wrap: wrap; }
  .sp-rail-step { flex: 1 1 45%; }
}
</style>

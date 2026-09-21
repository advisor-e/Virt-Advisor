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
    //- Tick all 52 and this screen offers 40 cards — 2 approved framework cards and 38
    //- concepts — because 12 of the 52 have neither a fill-in table nor a drawing and are
    //- not offered at all. The notice used to sit on the next screen, which was the first
    //- place the shortfall showed — since 2026-09-20 this screen is, so an unexplained gap
    //- would be the first thing he meets. Found by opening the screen, not by a test.
    //- ⚠ COUNTED OFF THE RUNNING SCREEN ON 2026-09-21 — 2 + 38 + 12 = 52 — AFTER A DERIVED
    //- COUNT GOT IT WRONG. A script that scanned the drawings registry read 39 and 13,
    //- because one of the 33 entries (`pricing`) is an unquoted key and the pattern wanted
    //- quotes. The app said 40 and the script said 39; the app was right. Re-count by
    //- opening the screen, never by scanning that file.
    //- ⚠ 16 — the count of concepts with a SUPPLIED fill-in table — is unchanged and is
    //- not what this screen offers. `data/strategy-capture-tables.json` `templateCount`
    //- is 20 and counts TEMPLATES, several of which serve more than one concept while
    //- four concepts name a template that does not exist. Do not read one for the other.
    b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
      | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

    //- 🔴 THE PROCESS BANNER — Decision A and Decision C on one line, where the approved
    //- drawing puts them. It says the session arrived rather than being invented, and it
    //- says WHOSE it is, so an inherited process is never mistaken for the firm's own.
    //- `Start from blank instead` is one click away on purpose: a standard session is a
    //- starting point and never a cage.
    .sp-proc(v-if="processSource && !startedFromBlank")
      .sp-proc-main
        b.sp-proc-t {{ $t('strategyPlanner.process.handedDown', { count: sessionProcess ? sessionProcess.steps.length : 0 }) }}
        span.sp-proc-s {{ $t('strategyPlanner.process.editable') }}
      span.sp-proc-who {{ processOwnerLabel }}
      b-button(size="is-small" outlined type="is-primary" @click="startFromBlank") {{ $t('strategyPlanner.process.startBlank') }}

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
    //- stage 2 existed this was a flat list in whatever order the data produced, with no
    //- headings a client would recognise from the agenda they were handed.
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
        //- workbooks. Only 2 of the 52 have an approved framework card of their own
        //- (Porter's 5 Forces and the 8 Profit Levers) — counted 2026-09-21.
        strategy-concept-capture(
          v-else
          :key="card.key"
          :name="card.visit.name"
          :capture="card.visit.capture"
          :concept-summary="card.visit.conceptSummary"
          :helps-client-to="card.visit.helpsClientTo"
          :teaching-form="card.visit.teachingForm"
          :concept-id="card.visit.conceptId"
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
      :closing="closingCards"
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
import { isPlaceableConcept } from '~/utils/strategyCards'
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
      /**
       * THE STANDARD SESSION HANDED DOWN TO THIS FIRM — `{ name, steps }`, or null when
       * nothing above has written one and the fetch failed. Decision A, 2026-09-21: it is
       * what Build session opens on, rather than a blank step.
       *
       * ⚠ READ-ONLY HERE. The advisor edits `planStepDefs`, never this — his changes
       * belong to one session and never travel back up to the firm's standard (Decision C).
       */
      sessionProcess: null,
      /**
       * Whose the handed-down session is: `{ scopeId, tier, shipped }`. Decision C — a
       * tier that has written nothing shows what it inherits AND SAYS WHOSE IT IS, so an
       * inherited process is never mistaken for one the firm authored.
       */
      processSource: null,
      /** Set when the advisor presses "Start from blank instead", for this session only. */
      startedFromBlank: false,
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
     * Every ticked concept, ONCE — the unit the session runs.
     *
     * 🔴 A CONCEPT APPEARS EXACTLY ONCE, EVERYWHERE. Mike's ruling, 2026-09-21: *"each
     * concept … are only listed once. they appear as an option and get selected in scope,
     * sorted into the correct order in build session — of course — appear ONCE in the run
     * session and ONCE in the produce plan."*
     *
     * This used to split a concept into one visit per PART of its capture table, so
     * Porter's could be worked twice — observations first, responses an hour later. That
     * is deleted, along with the split that produced it. The card key is the concept id
     * itself, with no visit number, because there is only ever one.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, capture: object}>}
     */
    conceptVisits () {
      // A concept with an approved framework card is drawn by that card above, and must
      // not also appear here — that would be the same concept twice, which the ruling
      // above forbids outright.
      const hasApprovedCard = {}
      this.chosenFrameworks.forEach((f) => {
        if (f.conceptId) { hasApprovedCard[f.conceptId] = true }
      })

      const visits = []
      this.chosen.forEach((conceptId) => {
        if (hasApprovedCard[conceptId]) { return }
        const loaded = this.captures[conceptId]
        if (!loaded) { return }
        visits.push({
          key: conceptId,
          conceptId,
          name: loaded.name,
          conceptSummary: loaded.conceptSummary || '',
          helpsClientTo: loaded.helpsClientTo || '',
          teachingForm: loaded.teachingForm || '',
          capture: loaded.capture
        })
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
        return !isPlaceableConcept(hasTable, id)
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
     * Concept id → the display name of the deck it came from.
     *
     * 🔴 THE STEP BUILDER'S LEFT COLUMN IS UNREADABLE WITHOUT THIS. The approved
     * drawing (`design/mockups/strategy-step-builder.html`) puts the deck under
     * every card, because that is the only thing distinguishing forty-odd chips
     * from each other. Both branches of `placeableCards` used to read a
     * `deckName` field that exists nowhere — not in `data/strategy-frameworks.json`,
     * not on a concept visit — so `card.deck` was always '' and the `v-if` that
     * guards the label never fired. The column rendered as identical white boxes
     * and still looked plausible, which is why no test caught it and Mike did.
     *
     * `this.decks` is the only place the two are joined, so the map is built from
     * it rather than a second field being added to the payload.
     *
     * @returns {Object<string, string>}
     */
    deckNameByConcept () {
      const byConcept = {}
      this.decks.forEach((d) => {
        (d.concepts || []).forEach((c) => { byConcept[c.id] = d.name })
      })
      return byConcept
    },

    /**
     * EVERY CARD THE ADVISOR CAN PLACE, in the order the session would otherwise run
     * them. This is the one list stage 2 offers and stage 3 and the document both read,
     * so a card cannot exist on one screen and not another.
     *
     * 🔴 ONE CONCEPT, ONE CARD. Mike's ruling, 2026-09-21: a concept is listed once,
     * chosen once, sorted once, and appears once in Run session and once in the plan. A
     * concept with an approved framework card is that card; every other scoped concept is
     * one concept card. Nothing here may ever emit two cards for one concept.
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
          deck: this.deckNameByConcept[conceptId] || '',
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
        if (!isPlaceableConcept(hasTable, visit.conceptId)) { return }
        cards.push({
          key: visit.key,
          conceptId: visit.conceptId,
          // A concept admitted on its drawing alone has nothing to fill in, and the
          // client's document must not print a capture page saying it was "not
          // worked through" when there was never anything to work.
          hasTable,
          name: visit.name,
          deck: this.deckNameByConcept[visit.conceptId] || '',
          // ⚠ NO PART TAG. A concept appears once (Mike, 2026-09-21), so there is never a
          // second chip of the same table to tell apart from the first.
          tag: '',
          summary: visit.conceptSummary || '',
          // ⚠ NO INSTRUCTION ON A CONCEPT CARD, and that is the true state rather than an
          // omission: no concept in data/strategy-frameworks.json carries one. The only
          // instruction that ever appeared here was the second visit's column heading,
          // and there is no second visit.
          instruction: '',
          prompts: [],
          // The WHOLE table. It used to be filtered to one part's field keys, which is
          // what made a second visit show different boxes from the first.
          lines: (capture.fields || [])
            .map(f => ({
              key: visit.conceptId + '::' + f.key,
              label: [f.columnLabel, f.rowLabel].filter(Boolean).join(' · ') || f.key,
              value: (this.entries[visit.conceptId + '::' + f.key] || '').trim()
            }))
        })
      })

      // 🔴 THE TWO CLOSING BLOCKS ARE NOT HERE, AND THAT IS DECISION D (Mike, 2026-09-21).
      // Strategic Statements and the Action Plan leave Build session entirely and appear
      // only on Objectives & actions, where they are already captured. They are the app's
      // own closing blocks rather than concepts off any of Mike's decks — which is why
      // they were the only two cards in the tray with no deck beneath them, and why the
      // tray read as arbitrary with them in it.
      //
      // ⚠ THIS REVERSES PART OF DECISION 4 OF 2026-09-20, which made them ordinary cards
      // on an ordinary step so their names would stop reaching the client's agenda. That
      // reason stands and is served better this way: out of the step builder, they name
      // nothing on the agenda at all.
      //
      // ⚠ THEY ARE STILL IN THE CLIENT'S PLAN. `closingCards` below builds them for the
      // assembled document, which prints them as its own closing block. Removing them
      // from this list must never remove them from the plan.
      return cards
    },

    /**
     * The two closing blocks as the assembled document prints them — outside the advisor's
     * steps, because Decision D took them off the screen where steps are built.
     *
     * 🔴 THIS IS WHAT STOPS DECISION D LOSING CONTENT. Before it, these two rode into the
     * document inside whichever step the advisor filed them under. With them gone from
     * `placeableCards` they would reach no step and vanish from the client's plan — the
     * Strategic Objective and the Action Plan, which are the two things the session exists
     * to produce.
     *
     * @returns {Array<object>} the same card shape the document's step items use
     */
    closingCards () {
      return this.closingFrameworks.map(f => ({
        key: 'close-' + f.id,
        // Ours, not a deck concept, so there is no drawing and never will be — the
        // graphic resolves to nothing and the page prints without one.
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
      }))
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

    /**
     * Whose standard session this advisor received — the badge on the process banner.
     *
     * 🔴 DECISION C SAYS IT MUST SAY WHOSE IT IS, so there is no neutral fallback here
     * that reads as "somebody set this". A tier we cannot name answers with the shipped
     * platform wording, which is the truthful one: nobody in this firm's chain authored it.
     *
     * ⚠ THE FOUR TIER NAMES ARE THE SETTLED ONES and are never abbreviated or reinvented
     * — mentor, global group manager, group manager, firm manager.
     *
     * @returns {string}
     */
    processOwnerLabel () {
      const src = this.processSource
      if (!src) { return '' }
      // 🔴 `shipped` IS NOT A SEPARATE CASE HERE, AND TREATING IT AS ONE PUT THE WORDS
      // "THE STANDARD SESSION" ON THE BADGE where the approved drawing says "set by the
      // mentor". The shipped default IS the mentor's — `source.tier` already says so — so
      // the badge names a tier whatever the advisor is looking at. Found by opening the
      // screen on 2026-09-21; the suite was green.
      const byTier = {
        mentor: 'strategyPlanner.process.byMentor',
        global_group_manager: 'strategyPlanner.process.byGlobalGroupManager',
        group_manager: 'strategyPlanner.process.byGroupManager',
        firm_manager: 'strategyPlanner.process.byFirmManager'
      }
      return byTier[src.tier] ? this.$t(byTier[src.tier]) : ''
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
    await Promise.all([this.loadFrameworks(), this.loadClients(), this.loadSessionProcess()])
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
     * Build session opens on the standard process handed down to this firm, each step
     * already holding its concepts.
     *
     * 🔴 DECISION A, RULED BY MIKE 2026-09-21, AND IT REPLACES DECISION 2 OF 2026-09-20.
     * That earlier ruling opened the screen with everything unplaced and one empty step to
     * rename, so the advisor would not simply press past it. Measured afterwards, that
     * cost 5 of 5 step names typed and 42 of 42 cards placed by hand from a cold start —
     * and he rejected the screen it produced. A handed-down step now arrives WITH ITS
     * CONCEPTS ALREADY PLACED; he drags out whatever does not suit this client.
     *
     * 🔴 THE SCOPE HE TICKED IS NEVER CHANGED BY WHAT ARRIVES. Same ruling. A standard
     * step naming a concept this session did not scope contributes NOTHING — the key is
     * dropped here rather than added to `chosen`, so the handed-down process can widen a
     * session only if the advisor widens it himself on Scope session.
     *
     * ⚠ AN EMPTY STEP SURVIVES THE FILTER. Pivot's steps 4 and 5 carry no concepts at all
     * and still print on the client's agenda (Mike, 2026-09-20). Dropping a step because
     * nothing in it was scoped would delete the page this feature exists for.
     *
     * Only ever seeds an empty list, so returning to stage 2 never discards work.
     * @returns {void}
     */
    seedSteps () {
      if (this.planStepDefs.length) { return }

      const handedDown = this.sessionProcess
      if (!handedDown || !Array.isArray(handedDown.steps) || !handedDown.steps.length) {
        // Nothing to hand down — a tier may legitimately have written none, and the
        // honest fallback is the blank step the advisor names himself.
        this.planStepDefs = [{ key: 's1', name: '', items: [] }]
        return
      }

      const inScope = {}
      this.placeableCards.forEach((c) => { inScope[c.key] = true })

      this.planStepDefs = handedDown.steps.map((s, i) => ({
        key: 's' + (i + 1),
        name: s.name || '',
        items: (s.items || []).filter(k => inScope[k])
      }))
    },

    /**
     * Throw the handed-down process away for this session and start from one empty step.
     *
     * The drawing puts this one click from the process banner, and the reason is on it:
     * a standard session is a starting point and never a cage. It touches only this
     * session — the firm's own standard is untouched, which is why nothing is saved
     * anywhere but the session's own scope.
     *
     * @returns {void}
     */
    startFromBlank () {
      this.startedFromBlank = true
      this.onStepsChanged([{ key: 's1', name: '', items: [] }])
    },

    /**
     * The standard planning session this firm works to, and whose it is.
     *
     * ⚠ FAILURE IS NOT AN ERROR BANNER. A session can be run without a handed-down
     * process — that is exactly today's behaviour — so a fetch that fails leaves
     * `sessionProcess` null and `seedSteps` falls back to the blank step. Stopping the
     * advisor from opening a session because a convenience did not load would be worse
     * than the convenience being absent.
     *
     * @returns {Promise<void>}
     */
    async loadSessionProcess () {
      try {
        const res = await fetch('/api/strategy/session-process', {
          credentials: 'same-origin',
          headers: this.headers()
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.sessionProcess = body.process || null
        this.processSource = body.source || null
      } catch (e) {
        this.sessionProcess = null
        this.processSource = null
      }
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
        // 🔴 THE CAPTURES MUST BE LOADED FIRST. `placeableCards` reads them to know which
        // concepts have a fill-in table at all, and `seedSteps` filters the handed-down
        // process against that list — opened before they arrive, every step would come in
        // empty and the advisor would be handed a blank session.
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

/* The process banner, from the approved drawing: what arrived, whose it is, and the
   way out of it. It sits directly above the step builder and shares its top border. */
.sp-proc {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem 1rem;
  border: 1px solid #d5e1ee;
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, #f3f9ff, #fff);
}
.sp-proc-main { flex: 1 1 20rem; min-width: 0; }
.sp-proc-t { display: block; color: #002b64; font-size: 0.95rem; }
.sp-proc-s { display: block; color: #5b6f8a; font-size: 0.8rem; }

/* The provenance badge. Decision C: an inherited process must never be mistaken for
   one this firm authored, so it is stated rather than implied by its absence. */
.sp-proc-who {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1d6b2b;
  background: #f3fbf5;
  border: 1px solid #a8dcb4;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  white-space: nowrap;
}

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
